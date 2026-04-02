// ─────────────────────────────────────────────────────────────
// FIRE PWA — Analytics
// Wraps GA4 gtag() and Microsoft Clarity.
// All events go through fire_event() so we can batch/queue
// if the scripts haven't loaded yet.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';
import { getDeviceId } from './device.js';

let _queue = [];
let _ready = false;

// ── Bootstrap GA4 + Clarity ──────────────────────────────────
export function initAnalytics() {
  const gaId = CONFIG.GA_MEASUREMENT_ID;
  const clarityId = CONFIG.CLARITY_PROJECT_ID;

  // Don't init if placeholders not replaced
  if (gaId.startsWith('__') || clarityId.startsWith('__')) {
    if (CONFIG.DEBUG) console.log('[FIRE] Analytics: placeholders not replaced, skipping.');
    _ready = true;
    _flush();
    return;
  }

  // ── GA4 ────────────────────────────────────────────────────
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(gaScript);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', gaId, {
    // Disable automatic page views (we fire them manually per screen)
    send_page_view: false,
    // Use deviceId as user_id for cross-session identity
    user_id: getDeviceId(),
  });

  // ── Microsoft Clarity ──────────────────────────────────────
  (function(c, l, a, r, i, t, y) {
    c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', clarityId);

  // Tag Clarity session with deviceId
  if (window.clarity) {
    window.clarity('set', 'deviceId', getDeviceId());
  }

  gaScript.onload = () => {
    _ready = true;
    _flush();
    if (CONFIG.DEBUG) console.log('[FIRE] Analytics ready');
  };
  gaScript.onerror = () => {
    _ready = true; // fail silently
    _flush();
  };
}

// ── Core event dispatcher ────────────────────────────────────
export function fireEvent(eventName, params = {}) {
  const enriched = {
    ...params,
    device_id: getDeviceId(),
    app_version: CONFIG.APP_VERSION,
    build_phase: CONFIG.BUILD_PHASE,
    timestamp_ms: Date.now(),
  };

  if (CONFIG.DEBUG) console.log('[FIRE][GA]', eventName, enriched);

  if (!_ready) {
    _queue.push({ eventName, params: enriched });
    return;
  }

  _send(eventName, enriched);
}

function _send(eventName, params) {
  try {
    if (window.gtag) window.gtag('event', eventName, params);
  } catch (e) { /* silently fail */ }
}

function _flush() {
  while (_queue.length > 0) {
    const { eventName, params } = _queue.shift();
    _send(eventName, params);
  }
}

// ── Screen view ──────────────────────────────────────────────
export function fireScreen(screenName) {
  if (CONFIG.DEBUG) console.log('[FIRE][Screen]', screenName);
  try {
    if (window.gtag) {
      window.gtag('event', 'screen_view', {
        firebase_screen: screenName,
        firebase_screen_class: screenName,
      });
    }
    if (window.clarity) {
      window.clarity('set', 'screen', screenName);
    }
  } catch (e) { /* silently fail */ }
}

// ── Named events (Phase 1) ───────────────────────────────────

export function evt_firstOpen() {
  fireEvent('first_open', { method: 'pwa' });
}

export function evt_appOpen(drawCount, streakCount) {
  fireEvent('app_open', { draw_count: drawCount, streak_count: streakCount });
}

export function evt_splashTapped() {
  fireEvent('splash_tapped');
}

export function evt_revealTapped(drawNumber) {
  fireEvent('reveal_tapped', { draw_number: drawNumber });
}

export function evt_drawResult(matchCount, entries, multiplier, drawNumber, isWin) {
  fireEvent('draw_result', {
    match_count: matchCount,
    entries_earned: entries,
    multiplier,
    draw_number: drawNumber,
    is_win: isWin,
    result_tier: _resultTier(matchCount),
  });
}

export function evt_streakStart() {
  fireEvent('streak_start');
}

export function evt_streakExtend(streakCount, multiplier) {
  fireEvent('streak_extend', { streak_count: streakCount, multiplier });
}

export function evt_streakBroken(streakCount) {
  fireEvent('streak_broken', { final_streak: streakCount });
}

export function evt_streakShieldUsed(streakCount) {
  fireEvent('streak_shield_used', { streak_count: streakCount });
}

export function evt_replayTapped(drawNumber) {
  fireEvent('replay_tapped', { draw_number: drawNumber });
}

export function evt_pickNumbersTapped() {
  fireEvent('pick_numbers_tapped');
}

export function evt_sessionEnd(sessionDrawCount, sessionEntries, sessionDurationMs) {
  fireEvent('session_end', {
    session_draw_count: sessionDrawCount,
    session_entries: sessionEntries,
    session_duration_ms: sessionDurationMs,
  });
}

// ── Named events (Phase 2) ────────────────────────────────────

export function evt_ritualStarted() {
  fireEvent('ritual_started');
}

export function evt_ritualQuestionAnswered(questionNumber) {
  fireEvent('ritual_question_answered', { question_number: questionNumber });
}

export function evt_ritualCompleted() {
  fireEvent('ritual_completed');
}

export function evt_soulProfileViewed() {
  fireEvent('soul_profile_viewed');
}

// ── Named events (Phase 3) ────────────────────────────────────

export function evt_gameStarted() {
  fireEvent('game_started');
}

export function evt_gameCompleted(totalEntries, totalMoney) {
  fireEvent('game_completed', { total_entries: totalEntries, total_money: totalMoney });
}

export function evt_jackpotWon(amount, deviceId) {
  fireEvent('jackpot_won', { amount, device_id: deviceId });
}

export function evt_checkInStreak(streakDays) {
  fireEvent('checkin_streak', { streak_days: streakDays });
}

export function evt_hatTrick(totalHatTricks) {
  fireEvent('hat_trick', { total_hat_tricks: totalHatTricks });
}

export function evt_entriesLow() {
  fireEvent('entries_low');
}

// ── Helpers ──────────────────────────────────────────────────
function _resultTier(matchCount) {
  if (matchCount >= 4) return 'blazes';
  if (matchCount === 3) return 'triple';
  if (matchCount === 2) return 'building';
  return 'gathering';
}
