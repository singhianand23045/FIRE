// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: Result
// 3-draw game loop with economy integration.
// Draw progress indicator, per-draw prize, game summary on draw 3.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto, currentScreen } from '../core/router.js';
import { getState, updateState, recordEngagementSignal } from '../core/state.js';
import { oraclePick } from '../engine/draw.js';
import { applyDrawPrize, calculatePrize, completeGame } from '../engine/economy.js';
import { processDrawStreak } from '../engine/streak.js';
import { createOracleEye, setOracleEyeWin } from '../components/oracle-eye.js';
import { haptic } from '../core/device.js';
import { playTone } from '../engine/audio.js';
import { whisper, clearWhispers } from '../components/toast.js';
import { evt_replayTapped } from '../core/analytics.js';
import { CONFIG } from '../config.js';
import { syncPayoutToFirebase } from '../core/firebase.js';
import { getDeviceId } from '../core/device.js';
import { attachDevTrigger } from './devmode.js';
import { getAdaptiveResultParams } from '../engine/adapt.js';
import { getOracleText, getOracleParams, callOracle, getCurrentMood } from '../engine/oracle-llm.js';
import { snapshotLastGame } from '../engine/declaration.js';
import {
  MSGS_BLAZES, MSGS_TRIPLE, MSGS_BUILDING, MSGS_GATHERING,
  WHISPERS_AGAIN, WHISPERS_AGAIN_PASSIVE, WHISPERS_AGAIN_ACTIVE,
} from '../data/quotes.js';

// ── Non-repeating picker ──────────────────────────────────────
const _used = {};
function pick(arr, key) {
  if (!_used[key]) _used[key] = [];
  if (_used[key].length >= arr.length) _used[key] = [];
  let idx;
  do { idx = Math.floor(Math.random() * arr.length); } while (_used[key].includes(idx));
  _used[key].push(idx);
  return arr[idx];
}

// Tier display labels
const TIER_LABELS = {
  blazes: '🌟 The Oracle Blazes',
  triple: '✨ Triple Match',
  building: '🔥 Building Momentum',
  gathering: 'The Oracle Gathers Strength',
};

export function initResult() {
  const el = document.getElementById('screen-result');

  // ── Build DOM structure (populated per-enter) ────────────
  el.innerHTML = `
    <div class="result__particles" id="result-particles"></div>

    <div class="result__eye-wrap" id="result-eye-wrap"></div>

    <div class="result__tier-label" id="result-tier-label"></div>

    <div class="result__score" id="result-score"></div>
    <div class="result__score-sub" id="result-score-sub"></div>

    <div class="result__oracle-msg" id="result-oracle-msg"></div>

    <div id="result-draw-area"></div>

    <div id="result-ritual-invite" class="result__ritual-invite" style="display:none"></div>

    <div class="result__actions" id="result-actions" style="display:none">
      <button class="again-btn" id="result-again-btn">NEW GAME →</button><!-- adaptive label set in onEnter -->
      <span class="result__pick-link" id="result-pick-link" style="display:none">Pick different numbers</span>
    </div>

    <div class="claim-modal claim-modal--hidden" id="claim-modal" role="dialog" aria-modal="true" aria-label="Claim your cash">
      <button class="claim-modal__close" id="claim-modal-close" aria-label="Close">×</button>
      <div class="claim-modal__inner" id="claim-modal-inner"></div>
    </div>
  `;

  const particlesEl = el.querySelector('#result-particles');
  const eyeWrapEl = el.querySelector('#result-eye-wrap');
  const tierLabelEl = el.querySelector('#result-tier-label');
  const scoreEl = el.querySelector('#result-score');
  const scoreSubEl = el.querySelector('#result-score-sub');
  const oracleMsgEl = el.querySelector('#result-oracle-msg');
  const drawAreaEl = el.querySelector('#result-draw-area');
  const ritualInviteEl = el.querySelector('#result-ritual-invite');
  const againBtn = el.querySelector('#result-again-btn');
  const pickLink = el.querySelector('#result-pick-link');
  const claimModal = el.querySelector('#claim-modal');
  // Move modal out of the transformed .screen container so position:fixed covers the viewport
  document.body.appendChild(claimModal);
  const claimInner = claimModal.querySelector('#claim-modal-inner');
  const claimClose = claimModal.querySelector('#claim-modal-close');

  function _fmtMoneyWhole(amount) {
    return '$' + Math.round(amount).toLocaleString('en-US');
  }

  function _openClaimModal(amount) {
    let method = 'PayPal';
    let handle = '';
    let submitted = false;

    function _renderForm() {
      claimInner.innerHTML = `
        <div class="claim-modal__amount">Claim your ${_fmtMoneyWhole(amount)} now</div>
        <div class="claim-modal__tabs" role="tablist">
          ${['PayPal', 'Venmo', 'Zelle'].map(m => `
            <button class="claim-modal__tab ${m === method ? 'claim-modal__tab--active' : ''}" data-method="${m}" role="tab">${m}</button>
          `).join('')}
        </div>
        <input class="claim-modal__input" id="claim-modal-input" type="text" inputmode="email" autocomplete="off" placeholder="Email or phone" value="${handle.replace(/"/g, '&quot;')}" />
        <button class="claim-modal__cta" id="claim-modal-cta">GET CASH NOW</button>
      `;

      claimInner.querySelectorAll('.claim-modal__tab').forEach(btn => {
        btn.addEventListener('click', () => {
          method = btn.dataset.method;
          claimInner.querySelectorAll('.claim-modal__tab').forEach(b => {
            b.classList.toggle('claim-modal__tab--active', b.dataset.method === method);
          });
          haptic.light();
        });
      });

      const input = claimInner.querySelector('#claim-modal-input');
      input.addEventListener('input', (e) => { handle = e.target.value; });

      claimInner.querySelector('#claim-modal-cta').addEventListener('click', async () => {
        const trimmed = handle.trim();
        if (!trimmed || submitted) return;
        submitted = true;
        haptic.medium();
        _renderSending(trimmed);
        await syncPayoutToFirebase(getDeviceId(), {
          amount,
          method,
          handle: trimmed,
        });
      });
    }

    function _renderSending(finalHandle) {
      claimInner.innerHTML = `
        <div class="claim-modal__sending-eyebrow">Sending…</div>
        <div class="claim-modal__sending-amount">${_fmtMoneyWhole(amount)}</div>
        <div class="claim-modal__sending-target">to <strong>${finalHandle}</strong></div>
        <div class="claim-modal__sending-method">via <strong>${method}</strong></div>
        <div class="claim-modal__sending-dots"><span></span><span></span><span></span></div>
      `;
    }

    claimModal.classList.remove('claim-modal--hidden');
    _renderForm();
    setTimeout(() => {
      const input = claimInner.querySelector('#claim-modal-input');
      if (input) input.focus();
    }, 250);
  }

  function _closeClaimModal() {
    claimModal.classList.add('claim-modal--hidden');
    claimInner.innerHTML = '';
  }

  claimClose.addEventListener('click', () => {
    haptic.medium();
    _closeClaimModal();
    clearTimeout(_autoTimer);
    _autoTimer = null;
    evt_replayTapped(getState().drawCount);
    goto(getState().lastGameSnapshot ? 'bridge' : 'first-reveal');
  });

  // Build Oracle eye once, reuse
  const eye = createOracleEye('md');
  eyeWrapEl.appendChild(eye);

  // Secret dev trigger: tap Oracle eye 5× fast to open simulator
  attachDevTrigger(eye);

  // ── Confetti system ──────────────────────────────────────
  function spawnConfetti(intensity = 40) {
    particlesEl.innerHTML = '';
    const colors = ['#C9A84C', '#E8D5A3', '#FF6B1A', '#FFD700', '#FFF', '#C9A84C'];
    for (let i = 0; i < intensity; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        top: -10px;
        width: ${Math.random() * 7 + 3}px;
        height: ${Math.random() * 7 + 3}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${Math.random() * 2 + 1.8}s;
        animation-delay: ${Math.random() * 1.2}s;
      `;
      particlesEl.appendChild(p);
    }
    // Clear after animation
    setTimeout(() => { particlesEl.innerHTML = ''; }, 4000);
  }

  // ── Draw progress dots HTML ───────────────────────────────
  function _buildDrawProgressHTML(drawIndex, nearMissData, drawn) {
    // drawIndex is 1-based (1, 2, 3) after recording
    const dots = [1, 2, 3].map(i => {
      let cls = 'draw-progress__dot';
      if (i < drawIndex) cls += ' draw-progress__dot--done';
      else if (i === drawIndex) cls += ' draw-progress__dot--active';
      else cls += ' draw-progress__dot--pending';
      return `<div class="${cls}"></div>`;
    }).join('');

    const nmText = _buildNearMissText(nearMissData, drawn);
    const nmHtml = nmText
      ? `<div class="draw-progress__near-miss">${nmText}</div>`
      : '';

    return `
      <div class="draw-progress">
        <div class="draw-progress__dots">${dots}</div>
        <div class="draw-progress__label">DRAW ${drawIndex} OF 3</div>
        ${nmHtml}
      </div>
    `;
  }

  // ── Game summary HTML ─────────────────────────────────────
  function _fmtMoney(amount) {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _buildGameEndHTML(gameResults, jackpot) {
    let totalEntries = 0;
    let totalMoney = 0;

    const rows = gameResults.map((result, i) => {
      const prize = calculatePrize(result.matchCount, jackpot);
      if (prize.entries > 0) totalEntries += prize.entries;
      if (prize.money > 0) totalMoney = Math.round((totalMoney + prize.money) * 100) / 100;

      const entriesHtml = prize.entries > 0
        ? `<span class="game-summary__col game-summary__col--earn">+${prize.entries}</span>`
        : `<span class="game-summary__col game-summary__col--blank">—</span>`;

      const moneyHtml = prize.money > 0
        ? `<span class="game-summary__col game-summary__col--money">+${_fmtMoney(prize.money)}</span>`
        : `<span class="game-summary__col game-summary__col--blank">—</span>`;

      return `
        <div class="game-summary__row">
          <span class="game-summary__col game-summary__col--draw">${i + 1}</span>
          <span class="game-summary__col game-summary__col--match">${result.matchCount}/6</span>
          ${entriesHtml}
          ${moneyHtml}
        </div>
      `;
    }).join('');

    const totalMoneyHtml = totalMoney > 0
      ? `<span class="game-summary__total-money">+${_fmtMoney(totalMoney)}</span>`
      : '';

    // Build celebration line — always computed from actual game results
    const parts = [];
    if (totalEntries > 0) parts.push(`+${totalEntries} entries`);
    if (totalMoney > 0) parts.push(`+${_fmtMoney(totalMoney)}`);
    const celebLine = parts.length > 0
      ? parts.join(' · ')
      : 'The Oracle watches. Your time comes.';

    return `
      <div class="game-end">
        <div class="game-end__celeb">${celebLine}</div>
        <div class="game-end__toggle" id="game-summary-toggle">VIEW GAME SUMMARY ↓</div>
        <div class="game-summary game-summary--hidden" id="game-summary-card">
          <div class="game-summary__row game-summary__row--header">
            <span class="game-summary__col game-summary__col--draw">#</span>
            <span class="game-summary__col game-summary__col--match">MATCH</span>
            <span class="game-summary__col game-summary__col--entries-head">ENTRIES</span>
            <span class="game-summary__col game-summary__col--prize-head">PRIZE</span>
          </div>
          <div class="game-summary__divider"></div>
          ${rows}
          <div class="game-summary__divider"></div>
          <div class="game-summary__row game-summary__row--total">
            <span class="game-summary__col game-summary__col--draw">∑</span>
            <span class="game-summary__col game-summary__col--match"></span>
            <span class="game-summary__col ${totalEntries > 0 ? 'game-summary__col--earn' : 'game-summary__col--blank'}">${totalEntries > 0 ? `+${totalEntries}` : '—'}</span>
            <span class="game-summary__col ${totalMoney > 0 ? 'game-summary__col--money' : 'game-summary__col--blank'}">${totalMoney > 0 ? `+${_fmtMoney(totalMoney)}` : '—'}</span>
          </div>
        </div>
      </div>
    `;
  }

  let _params = {};
  let _autoTimer = null;
  let _whisperTimers = [];
  let _enterAt = 0;

  registerScreen({
    id: 'result',
    el,
    async onEnter(params = {}) {
      _params = params;
      _enterAt = Date.now();
      const { score, nearMissData } = params;
      if (!score) return; // safety

      const { matchCount, tier, drawn, playerNumbers } = score;
      const isWin = score.isWin;

      // ── 1. Apply economy prize ──────────────────────────
      const state = getState();
      const jackpot = state.jackpot || CONFIG.JACKPOT_BASE;
      const prize = applyDrawPrize(matchCount, jackpot);

      if (CONFIG.DEBUG) {
        console.log(`[FIRE][Game] Draw ${state.gameDrawIndex} result: ${matchCount}/6, prize: ${prize.label}`);
      }

      // ── 2. Process draw streak ──────────────────────────
      const streakResult = await processDrawStreak(isWin);
      const showHatTrick = streakResult?.hatTrick === true;

      // ── Oracle eye state ────────────────────────────────
      setOracleEyeWin(eye, matchCount >= 4);

      // ── Tier label (always from current draw — LLM cache may be stale) ─
      tierLabelEl.textContent = TIER_LABELS[tier] || 'The Oracle Speaks';

      // ── Score number ────────────────────────────────────
      scoreEl.textContent = matchCount;

      // ── 3. Score sub-line (always from current draw — LLM cache is stale) ─
      if (prize.money > 0) {
        scoreSubEl.textContent = `${matchCount} ${matchCount === 1 ? 'Match' : 'Matches'} · +${_fmtMoney(prize.money)}`;
      } else if (prize.entries > 0) {
        scoreSubEl.textContent = `${matchCount} ${matchCount === 1 ? 'Match' : 'Matches'} · +${prize.entries} entries`;
      } else {
        scoreSubEl.textContent = `${matchCount} ${matchCount === 1 ? 'Match' : 'Matches'}`;
      }

      // ── Oracle message — static pool only (LLM cache is from previous draw) ─
      if (isWin) {
        const msgPool = {
          blazes: MSGS_BLAZES, triple: MSGS_TRIPLE,
          building: MSGS_BUILDING, gathering: MSGS_GATHERING,
        }[tier] ?? MSGS_GATHERING;
        oracleMsgEl.innerHTML = pick(msgPool, `oracle_${tier}`);
        oracleMsgEl.style.display = '';
      } else {
        oracleMsgEl.style.display = 'none';
      }

      // ── 4. Draw progress / game summary ─────────────────
      // Re-read state after economy + streak updates
      const freshState = getState();
      const gameDrawIndex = freshState.gameDrawIndex;

      drawAreaEl.innerHTML = '';
      const actionsEl = el.querySelector('#result-actions');

      // Merge LLM params over heuristic adapt params — LLM takes priority
      const heuristicParams = getAdaptiveResultParams();
      const llmParams = getOracleParams();
      const adaptParams = {
        ...heuristicParams,
        ...(llmParams || {}),
        // Keep heuristic engagement label for whisper pool selection
        engagement: heuristicParams.engagement,
        // LLM ctaLabel or heuristic
        ctaLabel: getOracleText('ctaLabel') || heuristicParams.ctaLabel,
      };
      const mood = getCurrentMood();
      if (CONFIG.DEBUG) console.log(`[FIRE][Adapt] Result params — mood: ${mood}, engagement: ${adaptParams.engagement}, autoAdvance: ${adaptParams.autoAdvanceDelayMs}ms, countdown: ${adaptParams.newGameCountdownSecs}s, cta: "${adaptParams.ctaLabel}", source: ${llmParams ? 'LLM' : 'heuristic'}`);

      if (gameDrawIndex >= 3) {
        // Final draw — show game summary + NEW GAME button
        // Snapshot last game BEFORE completeGame in case future changes clear results
        const snapshot = snapshotLastGame(freshState);
        updateState({ lastGameSnapshot: snapshot });
        completeGame();
        if (CONFIG.DEBUG) console.log('[FIRE][Game] Game complete after 3 draws — snapshot taken');

        drawAreaEl.innerHTML = _buildGameEndHTML(freshState.gameResults, jackpot);
        actionsEl.style.display = '';
        // pickLink hidden — users now discover number changing via swipe hint
        pickLink.style.display = 'none';

        // Compute total cash won for claim modal trigger
        const totalMoneyWon = (freshState.gameResults || []).reduce((sum, r) => {
          const p = calculatePrize(r.matchCount, jackpot);
          return p.money > 0 ? Math.round((sum + p.money) * 100) / 100 : sum;
        }, 0);

        // Wire summary toggle
        const toggle = el.querySelector('#game-summary-toggle');
        const card = el.querySelector('#game-summary-card');
        if (toggle && card) {
          toggle.addEventListener('click', () => {
            const hidden = card.classList.toggle('game-summary--hidden');
            toggle.textContent = hidden ? 'VIEW GAME SUMMARY ↓' : 'HIDE SUMMARY ↑';
          });
        }

        // Cash won → auto-open claim modal after summary settles
        if (totalMoneyWon > 0) {
          _whisperTimers.push(setTimeout(() => {
            if (currentScreen() === 'result') _openClaimModal(totalMoneyWon);
          }, 1500));
        }

        // Auto-start countdown regardless of ritual state — ritual invite CTA
        // remains visible above for users who want to fill their soul profile,
        // but we don't block binge-play on it.
        let countdownValue = adaptParams.newGameCountdownSecs;
        const countdownTpl = getOracleText('countdownLabel') || 'NEXT IN {n}...';
        const _fmtCountdown = (n) => countdownTpl.replace('{n}', n);
        againBtn.textContent = _fmtCountdown(countdownValue);

        const _tickCountdown = () => {
          const overlayOpen = document.querySelector('.wallet-panel--visible') ||
                              document.getElementById('fire-dev-panel');
          const isSummaryOpen = card && !card.classList.contains('game-summary--hidden');
          const isClaimOpen = !claimModal.classList.contains('claim-modal--hidden');

          if (!overlayOpen && !isSummaryOpen && !isClaimOpen) {
            countdownValue--;
            if (countdownValue > 0) {
              againBtn.textContent = _fmtCountdown(countdownValue);
            } else {
              againBtn.textContent = `STARTING...`;
              haptic.medium();
              evt_replayTapped(getState().drawCount);
              goto(getState().lastGameSnapshot ? 'bridge' : 'first-reveal');
              return; // Stop ticking
            }
          }
          _autoTimer = setTimeout(_tickCountdown, 1000);
        };
        _autoTimer = setTimeout(_tickCountdown, 1000);
      } else {
        // Draws 1 or 2 — show progress dots, auto-advance after adaptive delay
        drawAreaEl.innerHTML = _buildDrawProgressHTML(gameDrawIndex, nearMissData, drawn);
        actionsEl.style.display = 'none';

        const _tryAdvance = () => {
          const overlayOpen = document.querySelector('.wallet-panel--visible') ||
                              document.getElementById('fire-dev-panel');
          if (overlayOpen) {
            _autoTimer = setTimeout(_tryAdvance, 500);
          } else {
            _autoTimer = null;
            goto('reveal');
          }
        };
        _autoTimer = setTimeout(_tryAdvance, adaptParams.autoAdvanceDelayMs);
      }

      // ── 5. Hat-trick badge ──────────────────────────────
      if (showHatTrick) {
        _whisperTimers.push(setTimeout(() => {
          if (currentScreen() === 'result' && !document.querySelector('.wallet-panel--visible')) whisper(`🎩 Hat-Trick! +${CONFIG.HATRICK_BONUS_ENTRIES} entries`, 4000);
        }, 600));
      }

      // ── Haptics & sound ─────────────────────────────────
      if (isWin) {
        if (matchCount >= 4) {
          spawnConfetti(60);
          haptic.win();
          playTone('bigwin');
        } else if (matchCount >= 3) {
          spawnConfetti(25);
          haptic.success();
          playTone('win');
        } else {
          haptic.success();
          playTone('streak');
        }
      } else {
        haptic.light();
      }

      // ── Ritual invitation (only on final-draw summary) ───
      if (gameDrawIndex >= 3 && freshState.ritualTriggered && !freshState.ritualComplete) {
        ritualInviteEl.style.display = '';
        const llmRitualInvite = getOracleText('ritualInvite');
        ritualInviteEl.innerHTML = `
          <div class="result__ritual-oracle-text">
            ${llmRitualInvite || 'I need to know you.'}
          </div>
          <button class="result__ritual-btn" id="result-ritual-cta">THE ORACLE AWAITS →</button>
        `;
        el.querySelector('#result-ritual-cta').addEventListener('click', () => {
          haptic.medium();
          goto('ritual');
        });
      } else {
        ritualInviteEl.style.display = 'none';
      }

      // ── Delayed Oracle whisper toast (adaptive pool — LLM cache is stale) ─
      const whisperPool = adaptParams.engagement === 'passive' ? WHISPERS_AGAIN_PASSIVE
                        : adaptParams.engagement === 'active'  ? WHISPERS_AGAIN_ACTIVE
                        : WHISPERS_AGAIN;
      _whisperTimers.push(setTimeout(() => {
        if (currentScreen() === 'result' && !document.querySelector('.wallet-panel--visible')) {
          whisper(pick(whisperPool, 'again'), 5000);
        }
      }, 2200));
    },
    onExit() {
      // Record engagement signal — dwell time on this result screen + number changes from first-reveal
      const state = getState();
      const dwellMs = Date.now() - _enterAt;
      recordEngagementSignal({
        drawId: state.drawCount,
        numberChanges: state.pendingNumberChanges || 0,
        resultDwellMs: dwellMs,
      });

      // Fire async LLM call — pre-fetches text for the NEXT set of screens.
      // Non-blocking: game continues immediately, cache is populated in background.
      const nearMisses = (_params.nearMissData?.nearMisses || [])
        .filter(nm => nm.proximity === 'very_close' || nm.proximity === 'close')
        .map(nm => ({ player: nm.playerNumber, drawn: nm.drawnNumber, distance: nm.distance }));

      const triggerPoint = (state.gameDrawIndex >= 3) ? 'game_complete' : 'result_exit';
      callOracle(triggerPoint, {
        nearMissNumbers: nearMisses,
        gameResults: state.gameResults || [],
      });

      particlesEl.innerHTML = '';
      clearTimeout(_autoTimer);
      _autoTimer = null;
      _whisperTimers.forEach(clearTimeout);
      _whisperTimers = [];
      clearWhispers();
      _closeClaimModal();
    },
  });

  // ── New Game button (draw 3 only) ────────────────────────
  againBtn.addEventListener('click', () => {
    haptic.medium();
    evt_replayTapped(getState().drawCount);
    goto(getState().lastGameSnapshot ? 'bridge' : 'first-reveal');
  });

  // ── Pick different numbers (draw 3 only) ─────────────────
  pickLink.addEventListener('click', () => {
    haptic.light();
    const state = getState();
    const newNumbers = oraclePick(state.soulProfile);
    updateState({ currentNumbers: newNumbers });
    goto('first-reveal');
  });

  // ── Helper: build near-miss text ─────────────────────────
  function _buildNearMissText(nearMissData, drawn) {
    // LLM cache is from previous draw — skip it, use live near-miss data
    const { matchCount } = _params.score ?? { matchCount: 0 };

    if (!nearMissData || matchCount === 0) {
      return 'Your numbers circle closer.';
    }

    const veryClose = nearMissData.nearMisses.filter(nm => nm.proximity === 'very_close');
    if (veryClose.length > 0) {
      const nm = veryClose[0];
      return `<strong>${nm.playerNumber}</strong> brushed <strong>${nm.drawnNumber}</strong>. The veil felt it.`;
    }

    const close = nearMissData.nearMisses.filter(nm => nm.proximity === 'close');
    if (close.length >= 2) {
      return `Two numbers nearly crossed.`;
    }

    return `The pattern is forming.`;
  }
}
