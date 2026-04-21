// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: Bridge (between games)
// R1 + R2 combined — replicates the reveal screen's final state:
//   - Gold "N BONDS" header (match-count anchor)
//   - Player numbers row with match halos per draw
//   - 3 draw rows stacked (newest first)
//   - Italic whisper caption (Oracle's declaration for next game)
// Auto-advances to first-reveal after a mood-adjusted dwell.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto } from '../core/router.js';
import { getState, updateState } from '../core/state.js';
import { chooseDeclaration, executeDeclaration } from '../engine/declaration.js';
import { classifyEngagement } from '../engine/adapt.js';
import { BRIDGE_LABELS } from '../data/quotes.js';
import { CONFIG } from '../config.js';

// Mood-based dwell: doubled from prior values so players can absorb.
// passive players linger longer, active players move faster.
function dwellMsForMood() {
  const engagement = classifyEngagement();
  if (engagement === 'passive') return 20000;
  if (engagement === 'active')  return 12000;
  return 16000;
}

// Non-repeating picker so the same label doesn't flash back-to-back.
const _usedLabels = [];
function pickLabel() {
  if (_usedLabels.length >= BRIDGE_LABELS.length) _usedLabels.length = 0;
  let idx;
  do { idx = Math.floor(Math.random() * BRIDGE_LABELS.length); }
  while (_usedLabels.includes(idx));
  _usedLabels.push(idx);
  return BRIDGE_LABELS[idx];
}

export function initBridge() {
  const el = document.getElementById('screen-bridge');

  // DOM mirrors reveal.js end-of-game state exactly (same classes).
  const headerEl = document.createElement('div');
  headerEl.className = 'reveal__header';

  const yourNumsEl = document.createElement('div');
  yourNumsEl.className = 'reveal__your-numbers';

  const dividerEl = document.createElement('div');
  dividerEl.className = 'reveal__divider';

  const drawAreaEl = document.createElement('div');
  drawAreaEl.className = 'reveal__draw-area';

  const whisperEl = document.createElement('div');
  whisperEl.className = 'reveal__whisper';

  el.appendChild(headerEl);
  el.appendChild(yourNumsEl);
  el.appendChild(dividerEl);
  el.appendChild(drawAreaEl);
  el.appendChild(whisperEl);

  let _advanceTimer = null;
  let _fadeTimers = [];

  registerScreen({
    id: 'bridge',
    el,
    onEnter() {
      const state = getState();
      const snap = state.lastGameSnapshot;

      yourNumsEl.innerHTML = '';
      drawAreaEl.innerHTML = '';
      headerEl.textContent = '';
      whisperEl.textContent = '';

      if (snap && Array.isArray(snap.results) && snap.results.length > 0 && Array.isArray(snap.lastPlayerNumbers)) {
        const playerNumbers = snap.lastPlayerNumbers;
        const warmIndices = snap.warmBallIndices || [];

        headerEl.textContent = pickLabel();

        // Player numbers — is-matched-dN per draw matched, is-warm for swiped balls.
        const historicalClasses = {};
        playerNumbers.forEach(n => {
          historicalClasses[n] = [];
          snap.results.forEach((res, i) => {
            const dIdx = i + 1;
            if ((res.matched || []).includes(n)) {
              historicalClasses[n].push(`is-matched-d${dIdx}`);
            }
          });
        });

        playerNumbers.forEach((n, idx) => {
          const b = document.createElement('div');
          b.className = 'num-ball num-ball--lg num-ball--player';
          if (historicalClasses[n] && historicalClasses[n].length > 0) {
            b.classList.add(...historicalClasses[n]);
            b.classList.add('is-static');
          }
          if (warmIndices.includes(idx)) {
            b.classList.add('is-warm');
          }
          b.textContent = n;
          yourNumsEl.appendChild(b);
        });

        // Draw rows — newest on top, matches reveal.js final layout.
        const reversed = [...snap.results].reverse();
        reversed.forEach((res, i) => {
          const dIdx = snap.results.length - i;
          const row = document.createElement('div');
          row.className = 'reveal__draw-row';
          const matched = new Set(res.matched || []);
          (res.drawn || []).forEach(n => {
            const b = document.createElement('div');
            b.className = 'num-ball num-ball--lg num-ball--draw is-static';
            if (matched.has(n)) {
              b.classList.add(`is-hit-d${dIdx}`);
            }
            b.textContent = n;
            row.appendChild(b);
          });
          drawAreaEl.appendChild(row);
        });
      }

      // Pick + commit Oracle's declaration for the NEXT game.
      const { kind, line } = chooseDeclaration(state);
      const nextNumbers = executeDeclaration(kind, state);
      whisperEl.textContent = line;

      updateState({
        pendingDeclaration: { kind, executedAt: Date.now() },
        currentNumbers: nextNumbers,
      });

      if (CONFIG.DEBUG) {
        console.log(`[FIRE][Bridge] Declaration: ${kind} — "${line}" — numbers: ${nextNumbers.join(',')}`);
      }

      const totalDwell = dwellMsForMood();
      _advanceTimer = setTimeout(() => goto('first-reveal'), totalDwell);

      if (CONFIG.DEBUG) console.log(`[FIRE][Bridge] Dwell ${totalDwell}ms (mood: ${classifyEngagement()})`);
    },
    onExit() {
      clearTimeout(_advanceTimer);
      _advanceTimer = null;
      _fadeTimers.forEach(clearTimeout);
      _fadeTimers = [];
    },
  });
}
