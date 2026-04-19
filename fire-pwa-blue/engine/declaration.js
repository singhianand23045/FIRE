// ─────────────────────────────────────────────────────────────
// FIRE — Oracle Declaration Engine
// Between games, Oracle commits to a strategy ("Lucky", "Hot",
// "Cold", "Horoscope", "Repeat") and then actually executes it
// on the next game's starting numbers.
//
// VRR principle: trigger is unpredictable, execution is honored.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';
import { oraclePick } from './draw.js';
import {
  DECLARATIONS_LUCKY,
  DECLARATIONS_HOT,
  DECLARATIONS_COLD,
  DECLARATIONS_HOROSCOPE,
  DECLARATIONS_REPEAT,
  DECLARATIONS_FRESH,
} from '../data/quotes.js';

const DECLARATIONS = ['lucky', 'hot', 'cold', 'horoscope', 'repeat'];

const COPY_POOL = {
  lucky: DECLARATIONS_LUCKY,
  hot: DECLARATIONS_HOT,
  cold: DECLARATIONS_COLD,
  horoscope: DECLARATIONS_HOROSCOPE,
  repeat: DECLARATIONS_REPEAT,
  fresh: DECLARATIONS_FRESH,
};

function _secureRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / (0xFFFFFFFF + 1);
}

function _pickLine(kind) {
  const pool = COPY_POOL[kind] || DECLARATIONS_FRESH;
  return pool[Math.floor(_secureRandom() * pool.length)];
}

// ── Extract the last-completed game's data ──────────────────
// gameResults is cleared by completeGame(), so we snapshot it
// on game completion into a separate state field (lastGameSnapshot).
function _getLastGame(state) {
  return state.lastGameSnapshot || null;
}

// ── Eligibility checks per declaration ──────────────────────
function _isEligible(kind, state, lastGame) {
  switch (kind) {
    case 'lucky': {
      if (!lastGame) return false;
      const matched = _uniqueMatched(lastGame);
      return matched.length >= 1;
    }
    case 'hot':
    case 'cold':
      return (state.drawHistory || []).length >= 10;
    case 'horoscope':
      return !!state.ritualComplete && !!(state.soulProfile && state.soulProfile.weightedNumbers);
    case 'repeat':
      return !!(lastGame && Array.isArray(lastGame.warmBallIndices) && lastGame.warmBallIndices.length > 0
        && Array.isArray(lastGame.lastPlayerNumbers) && lastGame.lastPlayerNumbers.length > 0);
    default:
      return false;
  }
}

function _uniqueMatched(lastGame) {
  const set = new Set();
  (lastGame.results || []).forEach(r => (r.matched || []).forEach(n => set.add(n)));
  return [...set];
}

// ── Weight table ─────────────────────────────────────────────
// Base 20% each. Tier nudge: +15% to lucky+hot if hot game,
// +15% to cold if cold game. Ineligible ones are filtered,
// remaining redistribute proportionally.
function _weights(state, lastGame) {
  const base = { lucky: 20, hot: 20, cold: 20, horoscope: 20, repeat: 20 };

  if (lastGame) {
    const maxMatch = (lastGame.results || []).reduce((m, r) => Math.max(m, r.matchCount || 0), 0);
    const totalMatches = (lastGame.results || []).reduce((s, r) => s + (r.matchCount || 0), 0);

    if (maxMatch >= 4) {
      // Hot game nudge
      base.lucky += 7;
      base.hot += 8;
      base.cold -= 5;
      base.horoscope -= 5;
      base.repeat -= 5;
    } else if (totalMatches <= 1) {
      // Cold game nudge
      base.cold += 15;
      base.lucky -= 4;
      base.hot -= 4;
      base.horoscope -= 4;
      base.repeat -= 3;
    }
  }

  // Filter ineligible
  const eligible = {};
  DECLARATIONS.forEach(d => {
    if (_isEligible(d, state, lastGame)) eligible[d] = Math.max(1, base[d]);
  });
  return eligible;
}

// ── Public: decide which declaration to play ────────────────
export function chooseDeclaration(state) {
  const lastGame = _getLastGame(state);
  const weights = _weights(state, lastGame);

  const entries = Object.entries(weights);
  if (entries.length === 0) {
    // No eligible declaration — fall back to fresh
    return { kind: 'fresh', line: _pickLine('fresh') };
  }

  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = _secureRandom() * total;
  let chosen = entries[0][0];
  for (const [kind, w] of entries) {
    r -= w;
    if (r <= 0) { chosen = kind; break; }
  }

  if (CONFIG.DEBUG) {
    console.log('[FIRE][Declaration] Weights:', weights, '→ chose:', chosen);
  }

  return { kind: chosen, line: _pickLine(chosen) };
}

// ── Public: execute the declaration — build starting 6 ──────
// Given a chosen kind and current state, return 6 unique
// numbers the new game should START with on first-reveal.
export function executeDeclaration(kind, state) {
  const lastGame = _getLastGame(state);
  const pick = CONFIG.DRAW_PICK_COUNT;
  let seeds = [];

  switch (kind) {
    case 'lucky':
      if (lastGame) seeds = _uniqueMatched(lastGame);
      break;
    case 'hot': {
      const last10 = (state.drawHistory || []).slice(-10);
      seeds = _frequencyPick(last10, 'mostFrequent');
      break;
    }
    case 'cold': {
      const last10 = (state.drawHistory || []).slice(-10);
      seeds = _frequencyPick(last10, 'leastFrequent');
      break;
    }
    case 'horoscope':
      // oraclePick already uses soulProfile.weightedNumbers when present
      return oraclePick(state.soulProfile);
    case 'repeat':
      if (lastGame && Array.isArray(lastGame.lastPlayerNumbers) && Array.isArray(lastGame.warmBallIndices)) {
        seeds = lastGame.warmBallIndices
          .map(i => lastGame.lastPlayerNumbers[i])
          .filter(n => Number.isInteger(n));
      }
      break;
    case 'fresh':
    default:
      return oraclePick(state.soulProfile);
  }

  // Dedupe, cap at pick, fill remainder from oraclePick (no collisions)
  const seen = new Set();
  const capped = [];
  for (const n of seeds) {
    if (!seen.has(n) && capped.length < pick) {
      seen.add(n);
      capped.push(n);
    }
  }

  if (capped.length < pick) {
    const filler = oraclePick(state.soulProfile);
    for (const n of filler) {
      if (!seen.has(n) && capped.length < pick) {
        seen.add(n);
        capped.push(n);
      }
    }
  }

  // Last-resort fill with pure random to guarantee length
  while (capped.length < pick) {
    const n = Math.floor(_secureRandom() * CONFIG.DRAW_POOL_SIZE) + 1;
    if (!seen.has(n)) {
      seen.add(n);
      capped.push(n);
    }
  }

  return capped.sort((a, b) => a - b);
}

function _frequencyPick(draws, mode) {
  const counts = new Map();
  for (let n = 1; n <= CONFIG.DRAW_POOL_SIZE; n++) counts.set(n, 0);
  draws.forEach(d => (d.drawn || []).forEach(n => counts.set(n, (counts.get(n) || 0) + 1)));

  const arr = [...counts.entries()];
  arr.sort((a, b) => {
    // mostFrequent: higher count first; leastFrequent: lower count first.
    // Tiebreak randomly to avoid always picking the same numbers.
    if (a[1] !== b[1]) return mode === 'mostFrequent' ? b[1] - a[1] : a[1] - b[1];
    return _secureRandom() - 0.5;
  });

  return arr.slice(0, CONFIG.DRAW_PICK_COUNT).map(([n]) => n);
}

// ── Snapshot last game on completion ─────────────────────────
// Called from result.js when gameDrawIndex reaches 3 but BEFORE
// completeGame() clears gameResults.
export function snapshotLastGame(state) {
  const results = state.gameResults || [];
  const lastDraw = results[results.length - 1] || {};
  return {
    at: Date.now(),
    results: results.map(r => ({
      matchCount: r.matchCount,
      matched: [...(r.matched || [])],
      drawn: [...(r.drawn || [])],
    })),
    lastPlayerNumbers: [...(lastDraw.playerNumbers || state.currentNumbers || [])],
    warmBallIndices: [...(state.warmBallIndices || [])],
  };
}

// ── Copy line ────────────────────────────────────────────────
export function declarationLine(kind) {
  return _pickLine(kind);
}
