// ─────────────────────────────────────────────────────────────
// FIRE PWA — Adaptation Engine
//
// Reads per-draw behavioral signals stored in state and returns
// parameters that drive the next draw and result-screen UX.
//
// Two signals are tracked per draw:
//   numberChanges  — how many times the player dragged a number
//                    on the first-reveal screen before tapping Draw
//   resultDwellMs  — milliseconds spent reading the result screen
//
// Classification (last 2 draws):
//   active  → avgChanges ≥ 2  OR  avgDwell ≥ 5 000 ms
//   passive → avgChanges < 2  AND avgDwell < 3 000 ms
//   neutral → everything else
//
// Adaptive outputs:
//   draw    → boost odds (passive gets higher near-miss rate)
//   result  → auto-advance timing, countdown length, CTA label
// ─────────────────────────────────────────────────────────────

import { getState } from '../core/state.js';

// ── Engagement classifier ────────────────────────────────────

export function classifyEngagement() {
  const signals = getState().engagementSignals || [];
  if (signals.length === 0) return 'neutral';

  const recent = signals.slice(-2);
  const avgChanges = recent.reduce((s, r) => s + (r.numberChanges || 0), 0) / recent.length;
  const avgDwell   = recent.reduce((s, r) => s + (r.resultDwellMs || 0), 0) / recent.length;

  if (avgChanges >= 2 || avgDwell >= 5000) return 'active';
  if (avgChanges <  2 && avgDwell <  3000) return 'passive';
  return 'neutral';
}

// ── Draw parameters ──────────────────────────────────────────
// Returns boost odds (0–1) for adaptiveDraw() in draw.js.
// Higher odds = more likely to get a 3-match near-miss result,
// re-engaging a disengaged player.

export function getAdaptiveBoostOdds() {
  const engagement = classifyEngagement();
  if (engagement === 'passive') return 0.45;  // pull them back in
  if (engagement === 'active')  return 0.20;  // already hooked — ease off
  return 0.30;                                 // neutral baseline
}

// ── Result-screen UX parameters ─────────────────────────────

export function getAdaptiveResultParams() {
  const engagement = classifyEngagement();

  // Auto-advance delay for mid-game draws (draws 1 & 2)
  const autoAdvanceDelayMs = engagement === 'passive' ? 10000
                           : engagement === 'active'  ?  5000
                           :                             8000;

  // New-game countdown seconds (draw 3 → next game)
  const newGameCountdownSecs = engagement === 'passive' ? 7
                             : engagement === 'active'  ? 3
                             :                            5;

  // CTA button label on new-game screen
  const ctaLabel = engagement === 'passive' ? 'THE ORACLE CALLS →'
                 : engagement === 'active'  ? 'NEXT GAME →'
                 :                            'NEW GAME →';

  return { engagement, autoAdvanceDelayMs, newGameCountdownSecs, ctaLabel };
}
