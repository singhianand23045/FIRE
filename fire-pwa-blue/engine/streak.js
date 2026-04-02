// ─────────────────────────────────────────────────────────────
// FIRE PWA — Streak Engine
// Daily check-in streaks and hat-trick (3 consecutive win draws).
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';
import { getState, updateState } from '../core/state.js';

// ── Daily check-in ───────────────────────────────────────────
// Call once per app open (from boot sequence).
export async function processCheckIn() {
  const state = getState();
  const today = new Date().toISOString().slice(0, 10);
  const prev = state.checkInStreak ?? 0;
  const last = state.lastCheckInDate ?? null;

  if (last === today) {
    return { alreadyCheckedIn: true };
  }

  let newStreak;
  if (!last) {
    newStreak = 1;
  } else {
    const daysDiff = (new Date(today) - new Date(last)) / 86400000;
    newStreak = daysDiff === 1 ? prev + 1 : 1;
  }

  let rewardGranted = false;
  let entriesAwarded = 0;

  if (newStreak >= 7) {
    const { earnEntries } = await import('./economy.js');
    await earnEntries(CONFIG.CHECKIN_STREAK_REWARD, '7-day check-in streak');
    entriesAwarded = CONFIG.CHECKIN_STREAK_REWARD;
    rewardGranted = true;

    const ledger = [...(state.checkInLedger ?? [])];
    ledger.push({
      id: `checkin-${Date.now()}`,
      streakDays: 7,
      entriesAwarded: CONFIG.CHECKIN_STREAK_REWARD,
      at: Date.now(),
    });

    if (CONFIG.DEBUG) {
      console.log(`[FIRE][Streak] 7-day streak! Awarding ${CONFIG.CHECKIN_STREAK_REWARD} entries. Streak reset.`);
    }

    updateState({ checkInStreak: 0, lastCheckInDate: today, checkInLedger: ledger });

    if (CONFIG.DEBUG) {
      console.log(`[FIRE][Streak] Check-in streak: 0 days (was ${prev})`);
    }

    return { checkInStreak: 0, rewardGranted, entriesAwarded };
  }

  updateState({ checkInStreak: newStreak, lastCheckInDate: today });

  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Streak] Check-in streak: ${newStreak} days (was ${prev})`);
  }

  return { checkInStreak: newStreak, rewardGranted, entriesAwarded };
}

// ── Draw result streak ───────────────────────────────────────
// Call after every draw result. isWin = matchCount >= CONFIG.STREAK_WIN_THRESHOLD
export async function processDrawStreak(isWin) {
  const state = getState();
  let consecutive = state.consecutiveWinDraws ?? 0;
  let hatTrickCount = state.hatTrickCount ?? 0;

  if (isWin) {
    consecutive += 1;

    if (CONFIG.DEBUG) {
      console.log(`[FIRE][Streak] Win draw streak: ${consecutive} consecutive`);
    }

    if (consecutive % 3 === 0) {
      hatTrickCount += 1;
      const { earnEntries } = await import('./economy.js');
      await earnEntries(CONFIG.HATRICK_BONUS_ENTRIES, 'Hat-trick bonus');

      if (CONFIG.DEBUG) {
        console.log(`[FIRE][Streak] HAT-TRICK! 3 consecutive wins. Bonus: +${CONFIG.HATRICK_BONUS_ENTRIES} entries. Total hat-tricks: ${hatTrickCount}`);
      }

      updateState({ consecutiveWinDraws: consecutive, hatTrickCount });
      return { hatTrick: true, hatTrickCount, consecutiveWinDraws: consecutive };
    }

    updateState({ consecutiveWinDraws: consecutive, hatTrickCount });
    return { hatTrick: false, consecutiveWinDraws: consecutive };
  }

  // Not a win — reset streak
  if (CONFIG.DEBUG) {
    console.log(`[FIRE][Streak] Win streak broken. Reset to 0.`);
  }

  updateState({ consecutiveWinDraws: 0, hatTrickCount });
  return { hatTrick: false, consecutiveWinDraws: 0 };
}

// ── Streak summary for UI ────────────────────────────────────
export function getStreakSummary() {
  const { checkInStreak = 0, hatTrickCount = 0, consecutiveWinDraws = 0 } = getState();
  return {
    checkInStreak,
    daysUntilReward: 7 - checkInStreak,
    hatTrickCount,
    consecutiveWinDraws,
  };
}

// ── Streak label for UI ──────────────────────────────────────
export function streakLabel(consecutiveWinDraws) {
  if (!consecutiveWinDraws || consecutiveWinDraws === 0) return null;
  if (consecutiveWinDraws <= 2) return `${consecutiveWinDraws} wins in a row`;
  if (consecutiveWinDraws <= 5) return `${consecutiveWinDraws} in a row 🔥`;
  return `${consecutiveWinDraws} in a row 🔥🔥`;
}
