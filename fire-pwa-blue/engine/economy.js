// ─────────────────────────────────────────────────────────────
// FIRE PWA — Economy Engine
// Manages entries (play currency), real money won, prize
// calculation, and game lifecycle.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';
import { getState, updateState } from '../core/state.js';
import { getDeviceId } from '../core/device.js';

// ── Firebase sync (fire-and-forget) ──────────────────────────
function _syncToFirebase(deviceId, payload) {
  import('../core/firebase.js').then(({ syncUserToFirebase }) => {
    syncUserToFirebase(deviceId, payload);
  }).catch(() => {});
}

// ── Prize Table ───────────────────────────────────────────────
// 0/6 → 0 entries, $0
// 1/6 → 0 entries, $0
// 2/6 → +10 entries, $0
// 3/6 → +60 entries, $0
// 4/6 → 0 entries, +$10.00
// 5/6 → 0 entries, +$100.00
// 6/6 → 0 entries, +jackpot

const PRIZE_TABLE = [
  { entries: 0,  money: 0 },       // 0/6
  { entries: 0,  money: 0 },       // 1/6
  { entries: 10, money: 0 },       // 2/6
  { entries: 60, money: 0 },       // 3/6
  { entries: 0,  money: 10.00 },   // 4/6
  { entries: 0,  money: 100.00 },  // 5/6
  { entries: 0,  money: null },    // 6/6 — money = jackpot param
];

// ── calculatePrize ────────────────────────────────────────────
export function calculatePrize(matchCount, jackpot) {
  const idx = Math.max(0, Math.min(6, matchCount));
  const row = PRIZE_TABLE[idx];

  if (idx === 6) {
    const jackpotValue = jackpot ?? CONFIG.JACKPOT_BASE;
    return { entries: 0, money: jackpotValue, label: 'JACKPOT!' };
  }

  if (row.money > 0) {
    return {
      entries: 0,
      money: row.money,
      label: `+$${row.money.toFixed(2)}`,
    };
  }

  if (row.entries > 0) {
    return { entries: row.entries, money: 0, label: `+${row.entries} entries` };
  }

  return { entries: 0, money: 0, label: 'No prize' };
}

// ── canPlay ───────────────────────────────────────────────────
export function canPlay() {
  const state = getState();
  return state.entries >= CONFIG.ENTRIES_PER_GAME;
}

// ── startGame ─────────────────────────────────────────────────
export function startGame() {
  spendEntries(CONFIG.ENTRIES_PER_GAME, 'Game started');
  const state = getState();
  updateState({ gameActive: true, gameDrawIndex: 0, gameResults: [] });
  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Economy] Game started: -${CONFIG.ENTRIES_PER_GAME} entries. Balance: ${state.entries}`);
  }
}

// ── earnEntries ───────────────────────────────────────────────
export function earnEntries(amount, reason) {
  const state = getState();
  const newBalance = (state.entries ?? 0) + amount;
  const ledger = [...(state.entriesLedger ?? [])];
  ledger.push({ id: Date.now() + Math.random(), type: 'earn', amount, reason, at: Date.now() });
  const trimmed = ledger.slice(-100);
  updateState({ entries: newBalance, entriesLedger: trimmed });

  try {
    const deviceId = getDeviceId();
    const updated = getState();
    _syncToFirebase(deviceId, { economy: { entries: updated.entries, money: updated.money } });
  } catch (_) {}

  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Economy] +${amount} entries (${reason}). Balance: ${newBalance}`);
  }
}

// ── spendEntries ──────────────────────────────────────────────
export function spendEntries(amount, reason) {
  const state = getState();
  const newBalance = Math.max(0, (state.entries ?? 0) - amount);
  const ledger = [...(state.entriesLedger ?? [])];
  ledger.push({ id: Date.now() + Math.random(), type: 'spend', amount, reason, at: Date.now() });
  const trimmed = ledger.slice(-100);
  updateState({ entries: newBalance, entriesLedger: trimmed });

  try {
    const deviceId = getDeviceId();
    const updated = getState();
    _syncToFirebase(deviceId, { economy: { entries: updated.entries, money: updated.money } });
  } catch (_) {}

  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Economy] -${amount} entries (${reason}). Balance: ${newBalance}`);
  }
}

// ── earnMoney ─────────────────────────────────────────────────
export function earnMoney(amount, reason, matchCount) {
  const state = getState();
  const newTotal = Math.round(((state.money ?? 0) + amount) * 100) / 100;
  const ledger = [...(state.moneyLedger ?? [])];
  ledger.push({ id: Date.now() + Math.random(), amount, reason, matchCount, at: Date.now() });
  const trimmed = ledger.slice(-100);
  updateState({ money: newTotal, moneyLedger: trimmed });

  try {
    const deviceId = getDeviceId();
    const updated = getState();
    _syncToFirebase(deviceId, { economy: { entries: updated.entries, money: updated.money } });
  } catch (_) {}

  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Economy] +$${amount} money (${reason}). Total: $${newTotal}`);
  }
}

// ── applyDrawPrize ────────────────────────────────────────────
export function applyDrawPrize(matchCount, jackpot) {
  const prize = calculatePrize(matchCount, jackpot);
  const { entries, money, label } = prize;

  if (entries > 0) {
    earnEntries(entries, `${matchCount}/6 draw`);
  }

  if (money > 0) {
    earnMoney(money, `${matchCount}/6 draw`, matchCount);
  }

  if (matchCount === 6) {
    const deviceId = getDeviceId();
    import('../core/firebase.js').then(({ resetJackpot }) => {
      resetJackpot(deviceId, money);
    }).catch(() => {});
  }

  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Economy] Prize: draw result ${matchCount}/6 → ${label}`);
  }

  return prize;
}

// ── completeGame ──────────────────────────────────────────────
export function completeGame() {
  updateState({ gameActive: false });
  const state = getState();
  const results = state.gameResults ?? [];

  let totalEntries = 0;
  let totalMoney = 0;

  for (const result of results) {
    if (result.entries) totalEntries += result.entries;
    if (result.money) totalMoney = Math.round((totalMoney + result.money) * 100) / 100;
  }

  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Economy] Game complete. Total: +${totalEntries} entries, +$${totalMoney}`);
  }

  return { totalEntries, totalMoney };
}
