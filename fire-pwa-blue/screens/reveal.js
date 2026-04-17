// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: Reveal
// The theatrical 10-second draw. Balls drop one by one.
// Matches flash gold. Near-misses wobble. Whispers build.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto } from '../core/router.js';
import { getState, recordDraw } from '../core/state.js';
import { boostedDraw, normalDraw, adaptiveDraw, computeNearMisses, scoreDraw } from '../engine/draw.js';
import { getAdaptiveBoostOdds, classifyEngagement } from '../engine/adapt.js';
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
import { getOracleText, getOracleParams } from '../engine/oracle-llm.js';

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

// ── Draw pacing: mirrors pre-draw player behavior ────────────
// Rushed players get a fast, brisk draw. Invested players get
// longer dramatic pauses between each ball.
// Returns a multiplier: 0.7 (fast) → 1.0 (default) → 1.1 (slow).
function computeDrawPace(numberChanges, dwellMs) {
  const dwellSec = (dwellMs || 0) / 1000;
  // Investment score: 0 (rushed) → 1 (deeply invested)
  const changeScore = Math.min(numberChanges / 5, 1);   // 5 changes = max
  const dwellScore = Math.min(dwellSec / 10, 1);        // 10s dwell = max
  const investment = (changeScore + dwellScore) / 2;
  // Map to pace multiplier (capped at 1.1x ≈ 28s draw)
  return 0.7 + investment * 0.4;
}

export function initReveal() {
  const el = document.getElementById('screen-reveal');

  // ── Build static DOM ─────────────────────────────────────
  el.innerHTML = `
    <div class="reveal__header" id="reveal-header">The Oracle Speaks</div>

    <div class="reveal__your-numbers" id="reveal-player-nums"></div>

    <div class="reveal__divider"></div>

    <div class="reveal__draw-area" id="reveal-draw-area"></div>

    <div class="reveal__whisper" id="reveal-whisper"></div>

    <div class="reveal__progress" id="reveal-progress"></div>
  `;

  const headerEl = el.querySelector('#reveal-header');
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

      const engagement = classifyEngagement();

      // LLM-driven boost odds take priority, then heuristic adapt, then boosted draw
      const llmParams = getOracleParams();
      const boostOdds = llmParams?.boostOdds ?? getAdaptiveBoostOdds();

      const drawn = (forcedMatches !== null)
        ? _constructForcedDraw(numbers, forcedMatches)
        : isBoostDraw
          ? boostedDraw(numbers, drawNum - 1)
          : adaptiveDraw(numbers, boostOdds);

      if (CONFIG.DEBUG) console.log(`[FIRE][Adapt] Draw ${drawNum} — engagement: ${engagement}, boost: ${!isBoostDraw ? boostOdds.toFixed(2) : 'boosted'}, source: ${llmParams ? 'LLM' : 'heuristic'}`);

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
      const warmIndices = state.warmBallIndices || [];
      playerNumsEl.innerHTML = '';
      numbers.forEach((n, idx) => {
        const b = document.createElement('div');
        b.className = 'num-ball num-ball--lg num-ball--player';
        if (historicalClasses[n] && historicalClasses[n].length > 0) {
          b.classList.add(...historicalClasses[n]);
          b.classList.add('is-static');
        }
        // Persist warmth from first-reveal — player-chosen numbers stay amber
        if (warmIndices.includes(idx)) {
          b.classList.add('is-warm');
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
      /*
      progressEl.innerHTML = '';
      for (let i = 0; i < CONFIG.DRAW_PICK_COUNT; i++) {
        const d = document.createElement('div');
        d.className = 'reveal__progress-dot';
        d.id = `pdot-${i}`;
        progressEl.appendChild(d);
      }
      */

      // ── Set header (LLM or default) ────────────────────
      const llmHeader = getOracleText('revealHeader');
      if (llmHeader) headerEl.textContent = llmHeader;
      else headerEl.textContent = 'The Oracle Speaks';

      // ── Set initial whisper (LLM or static pool) ──────
      const llmWhisper = getOracleText('revealWhisper');
      whisperEl.textContent = llmWhisper || pickUnique(WHISPERS_OPENING, 'opening');

      // ── Start ambient drone ───────────────────────────
      startAmbient();

      // ── Compute draw pacing from pre-draw behavior ────
      const pace = computeDrawPace(state.pendingNumberChanges || 0, state.preDrawDwellMs || 0);
      if (CONFIG.DEBUG) console.log(`[FIRE][Adapt] Draw pace: ${pace.toFixed(2)}x (${state.pendingNumberChanges || 0} changes, ${Math.round((state.preDrawDwellMs || 0) / 1000)}s dwell)`);

      // ── Animate balls dropping ────────────────────────
      // Gaps between drops escalate for suspense but cap at 4s — 5s/6s tails
      // were losing attention in playtest observations.
      const BASE_DROP_TIMES = [1500, 4000, 7200, 11200, 15200, 19200];
      const dropTimes = BASE_DROP_TIMES.map(t => Math.round(t * pace));
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

      // ── Final dramatic pause then result (paced) ─────
      // 2000ms beat after last ball drops, then 1500ms before routing to result.
      const pauseTime = Math.round(21200 * pace);
      const resultTime = Math.round(22700 * pace);

      setTimeout(() => {
        whisperEl.textContent = pickUnique(WHISPERS_FINAL_PAUSE, 'final_pause');
        haptic.heavy();
        playTone('pause');
      }, pauseTime);

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
      }, resultTime);
    },

    onExit() {
      _animating = false;
    },
  });
}