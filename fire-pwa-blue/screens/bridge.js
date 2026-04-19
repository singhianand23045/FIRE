// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: Bridge (between games)
// R1: Recap of last game — match count + final draw numbers
// R2: Oracle's mystical declaration of its next move
// Auto-advances to first-reveal after a short dwell.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto } from '../core/router.js';
import { getState, updateState } from '../core/state.js';
import { createOracleEye } from '../components/oracle-eye.js';
import { chooseDeclaration, executeDeclaration } from '../engine/declaration.js';
import { CONFIG } from '../config.js';

const DWELL_MS = 2800;

export function initBridge() {
  const el = document.getElementById('screen-bridge');

  // Build DOM
  const eyeWrap = document.createElement('div');
  eyeWrap.className = 'bridge__eyewrap';
  eyeWrap.appendChild(createOracleEye('md'));

  const recapLabel = document.createElement('div');
  recapLabel.className = 'bridge__recap-label';

  const recapRow = document.createElement('div');
  recapRow.className = 'bridge__recap-row';

  const declaration = document.createElement('div');
  declaration.className = 'bridge__declaration';

  el.appendChild(eyeWrap);
  el.appendChild(recapLabel);
  el.appendChild(recapRow);
  el.appendChild(declaration);

  let _advanceTimer = null;

  registerScreen({
    id: 'bridge',
    el,
    onEnter() {
      const state = getState();
      const snap = state.lastGameSnapshot;

      // Build R1 recap from the last draw of the last game
      recapRow.innerHTML = '';
      if (snap && snap.results && snap.results.length > 0) {
        const last = snap.results[snap.results.length - 1];
        const totalMatches = snap.results.reduce((s, r) => s + (r.matchCount || 0), 0);
        recapLabel.textContent = totalMatches === 0
          ? 'The veil held back.'
          : `${totalMatches} ${totalMatches === 1 ? 'match' : 'matches'} across 3 draws.`;

        const drawn = last.drawn || [];
        const matched = new Set(last.matched || []);
        drawn.forEach((n) => {
          const ball = document.createElement('div');
          const hit = matched.has(n);
          ball.className = `num-ball num-ball--sm ${hit ? 'num-ball--draw is-hit-d1 is-static' : 'num-ball--draw is-static'}`;
          ball.textContent = n;
          recapRow.appendChild(ball);
        });
      } else {
        recapLabel.textContent = '';
      }

      // Pick + commit declaration
      const { kind, line } = chooseDeclaration(state);
      const nextNumbers = executeDeclaration(kind, state);

      declaration.textContent = line;

      // Store executed numbers so first-reveal can consume them
      updateState({
        pendingDeclaration: { kind, executedAt: Date.now() },
        currentNumbers: nextNumbers,
      });

      if (CONFIG.DEBUG) {
        console.log(`[FIRE][Bridge] Declaration: ${kind} — "${line}" — numbers: ${nextNumbers.join(',')}`);
      }

      // Staggered entry
      setTimeout(() => recapLabel.classList.add('is-visible'), 150);
      setTimeout(() => recapRow.classList.add('is-visible'), 400);
      setTimeout(() => declaration.classList.add('is-visible'), 1100);

      // Auto-advance
      _advanceTimer = setTimeout(() => goto('first-reveal'), DWELL_MS);
    },
    onExit() {
      clearTimeout(_advanceTimer);
      _advanceTimer = null;
      recapLabel.classList.remove('is-visible');
      recapRow.classList.remove('is-visible');
      declaration.classList.remove('is-visible');
    },
  });
}
