// ─────────────────────────────────────────────────────────────
// FIRE — Oracle LLM Client
// Async, non-blocking calls to /api/oracle.
// Caches responses in state for next-screen consumption.
// Falls back gracefully — game never blocks on LLM.
// ─────────────────────────────────────────────────────────────

import { getState, updateState } from '../core/state.js';
import { CONFIG } from '../config.js';

let _inflight = false;

/**
 * Fire an async LLM call with current session context.
 * Non-blocking — caches result in state.oracleCache for next screens to read.
 * @param {string} triggerPoint - 'result_exit' | 'game_complete' | 'session_start'
 * @param {object} extra - additional context (nearMissNumbers, gameResults, etc.)
 */
export function callOracle(triggerPoint, extra = {}) {
  if (_inflight) {
    if (CONFIG.DEBUG) console.log('[FIRE][Oracle] Skipping — call already in flight');
    return;
  }

  const state = getState();

  // Don't call on very first draw — no data yet
  if ((state.drawCount || 0) < 1 && triggerPoint !== 'session_start') {
    if (CONFIG.DEBUG) console.log('[FIRE][Oracle] Skipping — no draws yet');
    return;
  }

  const sessionDurationMs = Date.now() - (state.sessionStartAt || Date.now());

  // Build recent signals from engagementSignals + drawHistory
  const recentSignals = (state.engagementSignals || []).slice(-6).map((sig, i) => {
    const draw = (state.drawHistory || []).slice(-(state.engagementSignals || []).length)[i];
    return {
      matchCount: draw?.matchCount ?? 0,
      numberChanges: sig.numberChanges || 0,
      dwellMs: sig.resultDwellMs || 0,
    };
  });

  const payload = {
    sessionDurationMs,
    gameCount: Math.floor((state.drawCount || 0) / 3),
    totalDraws: state.drawCount || 0,
    currentMood: state.mood || 'casual',
    moodHistory: (state.moodHistory || []).slice(-10),
    ritualComplete: !!state.ritualComplete,
    playerNumbers: state.currentNumbers || [],
    lastDrawnNumbers: state.lastDrawResult?.drawn || [],
    lastMatchCount: state.lastDrawResult?.matchCount ?? 0,
    recentSignals,
    triggerPoint,
    ...extra,
  };

  _inflight = true;
  if (CONFIG.DEBUG) console.log('[FIRE][Oracle] Calling LLM...', { triggerPoint, mood: payload.currentMood });

  // On localhost, proxy to Vercel since local static server has no /api
  const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'https://fire-git-main-anand-singhis-projects.vercel.app'
    : '';
  const endpoint = baseUrl + (CONFIG.ORACLE_API_URL || '/api/oracle');

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(result => {
      _inflight = false;

      // Update mood
      const prevMood = state.mood || 'casual';
      const newMood = result.mood || prevMood;
      const moodHistory = [...(state.moodHistory || []), newMood].slice(-20);

      // Cache the full response
      updateState({
        mood: newMood,
        moodHistory,
        oracleCache: {
          ...result,
          fetchedAt: Date.now(),
          consumed: false,
        },
      });

      if (CONFIG.DEBUG) {
        console.log(`[FIRE][Oracle] Response — mood: ${prevMood} → ${newMood}`);
        console.log('[FIRE][Oracle] Texts:', result.texts);
        console.log('[FIRE][Oracle] Params:', result.params);
      }
    })
    .catch(err => {
      _inflight = false;
      if (CONFIG.DEBUG) console.warn('[FIRE][Oracle] LLM call failed:', err.message);
      // Graceful degradation — game continues with static text
    });
}

/**
 * Read a cached LLM-generated text field.
 * Returns the text if cache is fresh (< 5 min), otherwise null.
 * @param {string} field - key from oracleCache.texts (e.g. 'openingQuote', 'ctaLabel')
 * @returns {string|null}
 */
export function getOracleText(field) {
  const state = getState();
  const cache = state.oracleCache;

  if (!cache || !cache.texts) return null;

  // Stale after 5 minutes
  const age = Date.now() - (cache.fetchedAt || 0);
  if (age > 5 * 60 * 1000) return null;

  return cache.texts[field] || null;
}

/**
 * Read cached LLM-generated gameplay params.
 * Returns params object or null if no fresh cache.
 * @returns {object|null} { boostOdds, autoAdvanceDelayMs, newGameCountdownSecs }
 */
export function getOracleParams() {
  const state = getState();
  const cache = state.oracleCache;

  if (!cache || !cache.params) return null;

  const age = Date.now() - (cache.fetchedAt || 0);
  if (age > 5 * 60 * 1000) return null;

  return cache.params;
}

/**
 * Mark the oracle cache as consumed so the same text isn't reused.
 */
export function consumeOracleCache() {
  const state = getState();
  if (state.oracleCache) {
    updateState({
      oracleCache: { ...state.oracleCache, consumed: true },
    });
  }
}

/**
 * Get current mood. Falls back to heuristic if no LLM data.
 * @returns {string} 'casual' | 'warming' | 'serious' | 'focused'
 */
export function getCurrentMood() {
  const state = getState();

  // If LLM has set a mood, trust it
  if (state.mood) return state.mood;

  // Heuristic fallback
  return computeHeuristicMood(state);
}

/**
 * Heuristic mood — used before first LLM response and by mood dashboard
 * for accuracy comparison.
 */
export function computeHeuristicMood(state) {
  const draws = state.drawCount || 0;
  const sessionMs = Date.now() - (state.sessionStartAt || Date.now());
  const signals = state.engagementSignals || [];
  const recent = signals.slice(-3);

  const avgChanges = recent.length > 0
    ? recent.reduce((s, r) => s + (r.numberChanges || 0), 0) / recent.length
    : 0;
  const avgDwell = recent.length > 0
    ? recent.reduce((s, r) => s + (r.resultDwellMs || 0), 0) / recent.length
    : 0;

  // Focused: high interaction
  if (avgChanges >= 3 && avgDwell >= 5000) return 'focused';

  // Serious: past first game or long session
  if (draws >= 3 || sessionMs > 10 * 60 * 1000) return 'serious';

  // Warming: some engagement or saw matches
  if (draws >= 1 && (avgChanges >= 1 || avgDwell >= 3000)) return 'warming';

  return 'casual';
}
