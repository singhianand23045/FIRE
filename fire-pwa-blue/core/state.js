// ─────────────────────────────────────────────────────────────
// FIRE PWA — Game State (Single Source of Truth)
// All state mutations go through this module.
// State is persisted to localStorage on every change.
// ─────────────────────────────────────────────────────────────

import { store } from './device.js';
import { CONFIG } from '../config.js';

const STATE_KEY = 'state';

// ── Default State ────────────────────────────────────────────
function defaultState() {
  return {
    // Meta
    version: CONFIG.APP_VERSION,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),

    // Draw history
    drawCount: 0,          // total draws ever
    drawHistory: [],       // last 200 draws (ring buffer)

    // Current session numbers (Oracle's pick or user's)
    currentNumbers: [],    // 6 numbers currently loaded
    lastDrawNumbers: [],   // numbers from last draw
    lastDrawResult: null,  // { drawn: [], matched: [], matchCount, tier }

    // ── Economy (Phase 3) ──────────────────────────────────
    entries: 0,            // current playable balance
    money: 0,              // real money won (USD)
    entriesLedger: [],     // [{id, type:'earn'|'spend', amount, reason, at}]
    moneyLedger: [],       // [{id, amount, reason, matchCount, at}]

    // ── Game loop (Phase 3) ────────────────────────────────
    gameDrawIndex: 0,      // 0 = no active game, 1/2/3 = draw in progress
    gameResults: [],       // results for current game's draws
    gameActive: false,

    // ── Jackpot (Phase 3) ──────────────────────────────────
    jackpot: 100000,       // cached from Firebase, fallback to CONFIG.JACKPOT_BASE

    // ── Streak (Phase 3 — redesigned) ─────────────────────
    checkInStreak: 0,
    lastCheckInDate: null,       // 'YYYY-MM-DD'
    checkInLedger: [],           // [{id, streakDays, entriesAwarded, at}]
    consecutiveWinDraws: 0,
    hatTrickCount: 0,

    // ── Oracle Bond (future phases) ────────────────────────
    bondLevel: 1,
    bondXP: 0,
    bondXPToNext: 100,

    // ── Soul Profile (Phase 2) ─────────────────────────────
    ritualComplete: false,
    soulProfile: null,

    // ── Flags ──────────────────────────────────────────────
    firstOpen: true,             // flipped after welcome entries grant
    firstDrawDone: false,
    ritualTriggered: false,      // set true after draw 3

    // ── Session tracking ───────────────────────────────────
    sessionId: null,
    sessionStartAt: null,
    sessionDrawCount: 0,

    // ── Engagement signals (adaptive gameplay) ─────────────
    // One entry per completed draw: { drawId, numberChanges, resultDwellMs, at }
    // Kept to last 10. Written by result.js onExit.
    engagementSignals: [],
    // Scratch field — reset on first-reveal entry, incremented per drag change,
    // read by result.js onExit when building the signal for the just-completed draw.
    pendingNumberChanges: 0,
    // Dwell time on first-reveal before tapping Draw (ms).
    // Written by first-reveal.js tap handler, read by reveal.js for pacing.
    preDrawDwellMs: 0,
    // Indices of balls the player changed (warm amber).
    // Written by first-reveal.js, read by reveal.js to persist warmth.
    warmBallIndices: [],

    // ── Oracle LLM mood engine ────────────────────────────
    mood: 'casual',            // 'casual' | 'warming' | 'serious' | 'focused'
    moodHistory: [],           // last 20 mood values
    oracleCache: null,         // { mood, texts: {...}, params: {...}, fetchedAt, consumed }
  };
}

// ── In-memory state ──────────────────────────────────────────
let _state = null;

// ── Load ─────────────────────────────────────────────────────
export function loadState() {
  const saved = store.get(STATE_KEY);
  if (saved && saved.version === CONFIG.APP_VERSION) {
    _state = { ...defaultState(), ...saved };
  } else if (saved) {
    // Version mismatch — migrate (keep critical fields, reset others)
    _state = { ...defaultState(), ...migrateLegacy(saved) };
  } else {
    _state = defaultState();
  }
  _state.lastActiveAt = Date.now();
  _startSession();
  _persist();
  return _state;
}

// ── Get (read-only snapshot) ─────────────────────────────────
export function getState() {
  if (!_state) loadState();
  return _state;
}

// ── Update ───────────────────────────────────────────────────
export function updateState(partial) {
  if (!_state) loadState();
  Object.assign(_state, partial);
  _persist();
  document.dispatchEvent(new CustomEvent('fire:state:updated', { detail: partial }));
  return _state;
}

// ── Persist ──────────────────────────────────────────────────
function _persist() {
  // Keep drawHistory trimmed to last 200
  if (_state.drawHistory.length > 200) {
    _state.drawHistory = _state.drawHistory.slice(-200);
  }
  store.set(STATE_KEY, _state);
}

// ── Session ──────────────────────────────────────────────────
function _startSession() {
  _state.sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  _state.sessionStartAt = Date.now();
  _state.sessionDrawCount = 0;
  _state.entriesThisSession = 0;
}

// ── Record a completed draw ──────────────────────────────────
export function recordDraw(result) {
  if (!_state) loadState();

  const draw = {
    id: _state.drawCount + 1,
    at: Date.now(),
    numbers: [...result.playerNumbers],
    drawn: [...result.drawn],
    matched: [...result.matched],
    matchCount: result.matchCount,
    tier: result.tier,
  };

  _state.drawHistory.push(draw);
  _state.drawCount++;
  _state.sessionDrawCount++;
  _state.lastDrawNumbers = [...result.playerNumbers];
  _state.lastDrawResult = result;
  _state.lastActiveAt = Date.now();

  if (_state.drawCount === 1) _state.firstDrawDone = true;

  // Trigger ritual invitation after draw 3
  if (_state.drawCount >= 3 && !_state.ritualTriggered && !_state.ritualComplete) {
    _state.ritualTriggered = true;
  }

  // Advance game draw index
  if (_state.gameActive) {
    _state.gameResults = [...(_state.gameResults || []), result];
    _state.gameDrawIndex = (_state.gameDrawIndex || 0) + 1;
  }

  if (CONFIG.DEBUG) console.log(`[FIRE][Game] Draw recorded: ${result.matchCount}/6, game draw ${_state.gameDrawIndex}/3`);

  _persist();
}

// ── Migration (Phase 1 → Phase 3) ───────────────────────────
function migrateLegacy(old) {
  // Preserve soul profile and ritual state across version bumps
  return {
    ritualComplete: old.ritualComplete || false,
    soulProfile: old.soulProfile || null,
    ritualTriggered: old.ritualTriggered || false,
    drawCount: old.drawCount || 0,
    drawHistory: old.drawHistory || [],
    firstDrawDone: old.firstDrawDone || false,
    // Welcome grant will fire again since firstOpen defaults to true
  };
}

// ── Record engagement signal ─────────────────────────────────
// Called by result.js onExit after each draw.
// drawId        — state.drawCount at time of the draw
// numberChanges — how many times the player changed a number
// resultDwellMs — ms spent reading the result screen
export function recordEngagementSignal({ drawId, numberChanges, resultDwellMs }) {
  if (!_state) loadState();
  const signal = {
    drawId,
    numberChanges: numberChanges || 0,
    resultDwellMs: resultDwellMs || 0,
    at: Date.now(),
  };
  _state.engagementSignals = [...(_state.engagementSignals || []), signal].slice(-10);
  _state.pendingNumberChanges = 0; // reset scratch field
  _persist();
  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Adapt] Signal recorded — draw ${drawId}, changes: ${signal.numberChanges}, dwell: ${signal.resultDwellMs}ms`);
  }
}

// ── Reset (for testing / settings screen) ───────────────────
export function resetState() {
  _state = defaultState();
  _startSession();
  _persist();
  return _state;
}
