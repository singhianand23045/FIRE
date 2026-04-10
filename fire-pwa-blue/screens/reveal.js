// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: Reveal
// The theatrical 10-second draw. Balls drop one by one.
// Matches flash gold. Near-misses wobble. Whispers build.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto } from '../core/router.js';
import { getState, recordDraw } from '../core/state.js';
import { boostedDraw, normalDraw, computeNearMisses, scoreDraw } from '../engine/draw.js';
import { haptic, playSound } from '../core/device.js';
import { playTone, startAmbient, stopAmbient } from '../engine/audio.js';
import {
  WHISPERS_OPENING, WHISPERS_BALL_DROP, WHISPERS_FINAL_PAUSE,
  WHISPERS_MATCH_1, WHISPERS_MATCH_2, WHISPERS_MATCH_3,
  WHISPERS_MATCH_4, WHISPERS_MATCH_5,
} from '../data/quotes.js';
import { whisper } from '../components/toast.js';
import { CONFIG } from '../config.js';
import { getDevForceMatches, _constructForcedDraw } from './devmode.js';
import { evt_drawResult } from '../core/analytics.js';

// ── Non-repeating random picker ──────────────────────────────
const _usedIndices = {};
function pickUnique(arr, key) {
  if (!_usedIndices[key]) _usedIndices[key] = [];
  if (_usedIndices[key].length >= arr.length) _usedIndices[key] = [];
  let idx;
  do { idx = Math.floor(Math.random() * arr.length); } while (_usedIndices[key].includes(idx));
  _usedIndices[key].push(idx);
  return arr[idx];
}

export function initReveal() {
  const el = document.getElementById('screen-reveal');

  // ── Build static DOM ─────────────────────────────────────
  el.innerHTML = `
    <div class="reveal__header">The Oracle Speaks</div>

    <div class="reveal__your-numbers" id="reveal-player-nums"></div>

    <div class="reveal__divider"></div>

    <div class="reveal__draw-area" id="reveal-draw-area"></div>

    <div class="reveal__whisper" id="reveal-whisper"></div>

    <div class="reveal__progress" id="reveal-progress"></div>
  `;

  const playerNumsEl = el.querySelector('#reveal-player-nums');
  const drawAreaEl = el.querySelector('#reveal-draw-area');
  const whisperEl = el.querySelector('#reveal-whisper');
  const progressEl = el.querySelector('#reveal-progress');

  let _animating = false;

  registerScreen({
    id: 'reveal',
    el,
    onEnter() {
      if (_animating) return;
      _animating = true;

      const state = getState();
      const drawNum = state.drawCount + 1;
      const gameDrawIdx = state.gameDrawIndex + 1; // 1, 2, or 3
      const numbers = state.currentNumbers;
      // Pick drawn numbers — dev override takes priority
      const forcedMatches = getDevForceMatches();
      const isBoostDraw = drawNum <= CONFIG.BOOSTED_DRAWS;

      const drawn = (forcedMatches !== null)
        ? _constructForcedDraw(numbers, forcedMatches)
        : isBoostDraw
          ? boostedDraw(numbers, drawNum - 1)
          : normalDraw();

      const score = scoreDraw(numbers, drawn, 0, 1);
      const nearMiss = computeNearMisses(numbers, drawn);

      // Pre-compute historical match classes for player numbers
      const historicalClasses = {};
      numbers.forEach(n => {
        historicalClasses[n] = [];
        (state.gameResults || []).forEach((res, i) => {
          const dIdx = i + 1;
          if (res.matched.includes(n)) {
            historicalClasses[n].push(`is-matched-d${dIdx}`);
          }
        });
      });

      // ── Render player numbers ──────────────────────────
      playerNumsEl.innerHTML = '';
      numbers.forEach(n => {
        const b = document.createElement('div');
        b.className = 'num-ball num-ball--lg num-ball--player';
        if (historicalClasses[n] && historicalClasses[n].length > 0) {
          b.classList.add(...historicalClasses[n]);
          b.classList.add('is-static');
        }
        b.id = `pnum-${n}`;
        b.textContent = n;
        playerNumsEl.appendChild(b);
      });

      // ── Render draw area (stack of rows) ───────────────
      drawAreaEl.innerHTML = '';
      
      const activeDrawRow = document.createElement('div');
      activeDrawRow.className = 'reveal__draw-row';
      drawAreaEl.appendChild(activeDrawRow);

      const reversedHistory = [...(state.gameResults || [])].reverse();
      reversedHistory.forEach((res, i) => {
        const dIdx = state.gameResults.length - i;
        const row = document.createElement('div');
        row.className = 'reveal__draw-row';
        res.drawn.forEach(n => {
          const b = document.createElement('div');
          b.className = 'num-ball num-ball--lg num-ball--draw is-static';
          if (res.matched.includes(n)) {
            b.classList.add(`is-hit-d${dIdx}`);
          }
          b.textContent = n;
          row.appendChild(b);
        });
        drawAreaEl.appendChild(row);
      });

      // ── Setup active draw balls ───────────────────────
      drawn.forEach((n, i) => {
        const b = document.createElement('div');
        b.className = 'num-ball num-ball--lg num-ball--draw';
        b.id = `dball-${i}`;
        b.textContent = n;
        activeDrawRow.appendChild(b);
      });

      // ── Render progress dots ──────────────────────────
      progressEl.innerHTML = '';
      for (let i = 0; i < CONFIG.DRAW_PICK_COUNT; i++) {
        const d = document.createElement('div');
        d.className = 'reveal__progress-dot';
        d.id = `pdot-${i}`;
        progressEl.appendChild(d);
      }

      // ── Set initial whisper ───────────────────────────
      whisperEl.textContent = pickUnique(WHISPERS_OPENING, 'opening');

      // ── Start ambient drone ───────────────────────────
      startAmbient();

      // ── Animate balls dropping ────────────────────────
      const dropTimes = [800, 1800, 2900, 3700, 5000, 6200];
      let matchCountSoFar = 0;

      const MATCH_WHISPER_POOLS = [
        null,
        WHISPERS_MATCH_1,
        WHISPERS_MATCH_2,
        WHISPERS_MATCH_3,
        WHISPERS_MATCH_4,
        WHISPERS_MATCH_5,
      ];

      drawn.forEach((drawnNum, i) => {
        setTimeout(() => {
          const ballEl = document.getElementById(`dball-${i}`);
          if (!ballEl) return;

          const isHit = numbers.includes(drawnNum);
          const nmData = nearMiss.nearMisses.find(nm => nm.drawnNumber === drawnNum && !isHit);

          ballEl.classList.remove('num-ball--draw');

          if (isHit) {
            ballEl.classList.add('num-ball--draw', 'is-dropped', `is-hit-d${gameDrawIdx}`);
            matchCountSoFar++;

            const pNum = document.getElementById(`pnum-${drawnNum}`);
            if (pNum) setTimeout(() => {
              pNum.classList.remove('is-static');
              pNum.classList.add(`is-matched-d${gameDrawIdx}`);
            }, 200);

            haptic.success();
            playTone('match', matchCountSoFar); // pitch rises with each match

            const dot = document.getElementById(`pdot-${i}`);
            if (dot) dot.classList.add('is-hit');

            const pool = MATCH_WHISPER_POOLS[matchCountSoFar];
            if (pool) {
              setTimeout(() => {
                whisperEl.textContent = pickUnique(pool, `match_${matchCountSoFar}`);
              }, 400);
            }

          } else {
            ballEl.classList.add('num-ball--draw', 'is-dropped');
            if (nmData && nmData.proximity !== 'miss') {
              ballEl.classList.add('is-near-miss');
            }
            haptic.light();
            playTone('drop');

            const dot = document.getElementById(`pdot-${i}`);
            if (dot) setTimeout(() => dot.classList.add('is-miss'), 300);

            if (matchCountSoFar === 0 && i < 5) {
              setTimeout(() => {
                whisperEl.textContent = pickUnique(WHISPERS_BALL_DROP, 'ball_drop');
              }, 300);
            }
          }
        }, dropTimes[i]);
      });

      // ── Final dramatic pause then result ─────────────
      setTimeout(() => {
        whisperEl.textContent = pickUnique(WHISPERS_FINAL_PAUSE, 'final_pause');
        haptic.heavy();
        playTone('pause');
      }, 7200);

      setTimeout(() => {
        // Record draw
        recordDraw({ ...score, playerNumbers: numbers });

        // Analytics
        evt_drawResult(score.matchCount, score.entries, 1, drawNum, score.isWin);

        stopAmbient(0.8);

        // Win tone
        if (score.matchCount >= 4) playTone('bigwin');
        else if (score.isWin) playTone('win');

        _animating = false;
        goto('result', {
          score,
          nearMissData: nearMiss,
        });
      }, 8200);
    },

    onExit() {
      _animating = false;
    },
  });
}