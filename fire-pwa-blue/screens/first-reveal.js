// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: First Reveal
// "I've been waiting for you..." + 6 glowing numbers + one button.
// Zero decisions. One tap to play.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto } from '../core/router.js';
import { createOracleEye } from '../components/oracle-eye.js';
import { haptic, unlockAudio } from '../core/device.js';
import { initAudio, playTone } from '../engine/audio.js';
import { getState, updateState } from '../core/state.js';
import { oraclePick } from '../engine/draw.js';
import { evt_revealTapped } from '../core/analytics.js';
import { QUOTES_OPENING } from '../data/quotes.js';
import { canPlay, startGame, earnEntries } from '../engine/economy.js';
import { CONFIG } from '../config.js';
import { getOracleText, consumeOracleCache } from '../engine/oracle-llm.js';

// Non-repeating picker
const _usedQuotes = [];
function pickQuote() {
  if (_usedQuotes.length >= QUOTES_OPENING.length) _usedQuotes.length = 0;
  let idx;
  do { idx = Math.floor(Math.random() * QUOTES_OPENING.length); }
  while (_usedQuotes.includes(idx));
  _usedQuotes.push(idx);
  return QUOTES_OPENING[idx];
}

export function initFirstReveal() {
  const el = document.getElementById('screen-first-reveal');

  // ── Build DOM ─────────────────────────────────────────────
  // Background pulse overlay — gravitational light shift on number change
  const bgPulse = document.createElement('div');
  bgPulse.className = 'first-reveal__bg-pulse';
  el.appendChild(bgPulse);

  function pulseBackground(ballEl) {
    const rect = ballEl.getBoundingClientRect();
    const screenRect = el.getBoundingClientRect();
    const xPct = ((rect.left + rect.width / 2 - screenRect.left) / screenRect.width) * 100;
    const yPct = ((rect.top + rect.height / 2 - screenRect.top) / screenRect.height) * 100;
    bgPulse.style.background = `radial-gradient(ellipse at ${xPct}% ${yPct}%, rgba(70, 120, 40, 0.45) 0%, transparent 45%)`;
    bgPulse.classList.remove('is-active');
    void bgPulse.offsetWidth; // force reflow to restart animation
    bgPulse.classList.add('is-active');
  }

  const eyeWrap = document.createElement('div');
  eyeWrap.className = 'first-reveal__eyewrap';
  eyeWrap.appendChild(createOracleEye('md'));

  const quote = document.createElement('div');
  quote.className = 'first-reveal__quote';

  const numbersRow = document.createElement('div');
  numbersRow.className = 'first-reveal__numbers';

  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'first-reveal__cta';

  const btn = document.createElement('button');
  btn.className = 'reveal-btn';
  btn.innerHTML = `<div class="reveal-btn__glow"></div>REVEAL MY FATE`;
  btn.setAttribute('aria-label', 'Reveal my fate');
  ctaWrap.appendChild(btn);

  // Shown when user can't afford a game
  const noEntriesMsg = document.createElement('div');
  noEntriesMsg.className = 'first-reveal__no-entries';
  noEntriesMsg.textContent = 'Win more entries to keep playing';
  noEntriesMsg.style.display = 'none';
  ctaWrap.appendChild(noEntriesMsg);

  // Swipe-to-change hint — shown on first tap each session, dismissed after first swipe
  const swipeHint = document.createElement('div');
  swipeHint.className = 'first-reveal__swipe-hint';
  swipeHint.textContent = 'swipe up to change number';

  let _hintDismissed = false; // resets every session (page load)
  let _hintVisible = false;
  let _hintTimeout = null;

  function showSwipeHint() {
    if (_hintDismissed || _hintVisible) return;
    _hintVisible = true;
    swipeHint.classList.add('is-visible');
    _hintTimeout = setTimeout(() => {
      swipeHint.classList.remove('is-visible');
      _hintVisible = false;
    }, 5000);
  }

  function dismissSwipeHint() {
    if (_hintDismissed) return;
    _hintDismissed = true;
    if (_hintVisible) {
      swipeHint.classList.remove('is-visible');
      _hintVisible = false;
      clearTimeout(_hintTimeout);
    }
  }

  const profileLink = document.createElement('div');
  profileLink.className = 'first-reveal__profile-link';
  profileLink.style.display = 'none';
  profileLink.addEventListener('click', () => {
    haptic.light();
    goto('soul-profile', { viewOnly: true });
  });

  el.addEventListener('pointerdown', (e) => {
    if (btn.contains(e.target)) return;
    showSwipeHint();
  });

  el.appendChild(eyeWrap);
  el.appendChild(quote);
  el.appendChild(numbersRow);
  el.appendChild(swipeHint);
  el.appendChild(ctaWrap);
  el.appendChild(profileLink);

  // ── Tap handler ──────────────────────────────────────────
  btn.addEventListener('click', () => {
    // Unlock audio on first user gesture (iOS requirement)
    unlockAudio();
    initAudio();

    haptic.medium();
    playTone('reveal');
    const state = getState();
    evt_revealTapped(state.drawCount + 1);
    btn.classList.add('reveal-btn--disabled');

    // Flush pre-draw signals to state before leaving this screen.
    // reveal.js reads these to pace the draw animation + persist ball warmth.
    // result.js onExit reads pendingNumberChanges for the engagement signal.
    const warmIndices = [];
    _ballRefs.forEach((ref, idx) => {
      if (ref && ref.el.classList.contains('is-warm')) warmIndices.push(idx);
    });
    updateState({
      pendingNumberChanges: _pendingNumberChanges,
      preDrawDwellMs: Date.now() - _screenEnterAt,
      warmBallIndices: warmIndices,
    });

    // Deduct entries and start game if not already active
    if (!state.gameActive) {
      startGame();
    }

    goto('reveal');
  });

  // ── Engagement: number-change counter + dwell tracking ───
  // Counts how many distinct number changes the player makes
  // before tapping Draw. Reset on every screen entry.
  let _pendingNumberChanges = 0;
  let _screenEnterAt = 0;

  // ── Oracle reaction: one ball shifts when the player changes a number
  // Each ball registers a setNumber() so the Oracle can reach into its closure.
  let _oracleReacted = false;
  const _ballRefs = [];

  // ── Register ─────────────────────────────────────────────
  registerScreen({
    id: 'first-reveal',
    el,
    onEnter() {
      _pendingNumberChanges = 0; // reset per draw
      _screenEnterAt = Date.now();
      _oracleReacted = false;
      _ballRefs.length = 0;
      const state = getState();

      // Top-up grant whenever user can't afford a game
      if ((state.entries ?? 0) < CONFIG.ENTRIES_PER_GAME) {
        earnEntries(CONFIG.STARTING_ENTRIES, 'Top-up grant');
        if (CONFIG.DEBUG) console.log(`[FIRE][Economy] Top-up grant: +${CONFIG.STARTING_ENTRIES} entries`);
      }

      // Check if player can afford a game
      const affordable = canPlay();
      btn.classList.remove('reveal-btn--disabled');
      if (!affordable) {
        btn.classList.add('reveal-btn--disabled');
        noEntriesMsg.style.display = '';
      } else {
        noEntriesMsg.style.display = 'none';
      }

      // Opening quote — LLM-generated if available, else static pool
      const llmQuote = getOracleText('openingQuote');
      if (llmQuote) {
        quote.innerHTML = llmQuote.replace('\n', '<br>');
        consumeOracleCache();
        if (CONFIG.DEBUG) console.log('[FIRE][Oracle] Using LLM opening quote');
      } else {
        quote.innerHTML = pickQuote().replace('\n', '<br>');
      }

      // Re-read state after potential earnEntries mutation
      const freshState = getState();
      // If Oracle announced a declaration on the bridge screen, honor it —
      // currentNumbers are already set there. Otherwise fall back to oraclePick.
      let numbers;
      if (freshState.pendingDeclaration && Array.isArray(freshState.currentNumbers) && freshState.currentNumbers.length === 6) {
        numbers = [...freshState.currentNumbers];
        if (CONFIG.DEBUG) console.log(`[FIRE][First-Reveal] Honoring declaration: ${freshState.pendingDeclaration.kind}`);
        updateState({ pendingDeclaration: null });
      } else {
        numbers = oraclePick(freshState.soulProfile);
        updateState({ currentNumbers: numbers });
      }

      function validateNumbers() {
        const isUnique = new Set(numbers).size === numbers.length;
        if (!isUnique) {
          btn.classList.add('reveal-btn--disabled');
          btn.innerHTML = 'NUMBERS MUST BE UNIQUE';
        } else {
          const affordable = canPlay();
          if (!affordable) {
            btn.classList.add('reveal-btn--disabled');
            noEntriesMsg.style.display = '';
          } else {
            btn.classList.remove('reveal-btn--disabled');
            noEntriesMsg.style.display = 'none';
          }
          const llmCta = getOracleText('ctaLabel');
          btn.innerHTML = `<div class="reveal-btn__glow"></div>${llmCta || 'REVEAL MY FATE'}`;
          updateState({ currentNumbers: numbers });
        }
      }

      // Show profile link once ritual is complete
      if (freshState.ritualComplete && freshState.soulProfile) {
        const { zodiacSymbol, zodiac } = freshState.soulProfile;
        // profileLink.textContent = `◈  ${zodiacSymbol} ${zodiac}  ·  Your Soul`;
        profileLink.style.display = '';
      } else {
        profileLink.style.display = 'none';
      }

      // Render number balls
      numbersRow.innerHTML = '';
      numbers.forEach((n, i) => {
        const ball = document.createElement('div');
        ball.className = `num-ball num-ball--lg num-ball--player anim-float delay-${i + 1}`;
        ball.textContent = n;
        ball.style.touchAction = 'none';
        ball.style.cursor = 'ns-resize';

        // Register so Oracle reaction can update this ball from another closure
        _ballRefs[i] = {
          el: ball,
          setNumber(v) { n = v; numbers[i] = v; ball.textContent = v; },
        };

        let startY = 0;
        let isDragging = false;
        let didSwipe = false;

        ball.addEventListener('pointerdown', (e) => {
          isDragging = true;
          didSwipe = false;
          startY = e.clientY;
          ball.setPointerCapture(e.pointerId);
          // Start warming — gradual amber shift while holding
          if (!ball.classList.contains('is-warm')) {
            ball.classList.add('is-warming');
          }
        });

        ball.addEventListener('pointermove', (e) => {
          if (!isDragging) return;
          const deltaY = e.clientY - startY;
          if (Math.abs(deltaY) > 30) {
            didSwipe = true;
            dismissSwipeHint();
            // Lock in warm — this is now the player's number
            ball.classList.remove('is-warming');
            ball.classList.add('is-warm');

            if (deltaY < 0) {
              n++;
            } else {
              n--;
            }
            // wrap bounds
            if (n > CONFIG.DRAW_POOL_SIZE) n = 1;
            if (n < 1) n = CONFIG.DRAW_POOL_SIZE;

            ball.textContent = n;
            numbers[i] = n;
            startY = e.clientY;
            haptic.light();
            _pendingNumberChanges++; // track engagement signal
            pulseBackground(ball); // gravitational light shift

            // ── Oracle reaction: shift one ball to the LEFT (once per draw)
            if (!_oracleReacted) {
              _oracleReacted = true;
              // Pick target: leftmost wraps to rightmost, else random from the left
              let targetIdx;
              if (i === 0) {
                targetIdx = numbers.length - 1;
              } else {
                const leftSlots = [];
                for (let j = 0; j < i; j++) leftSlots.push(j);
                targetIdx = leftSlots[Math.floor(Math.random() * leftSlots.length)];
              }
              // Soul-profile-aware number (falls back to random if no profile)
              const usedNums = new Set(numbers);
              const candidates = oraclePick(getState().soulProfile);
              let newNum = candidates.find(num => !usedNums.has(num));
              if (!newNum) {
                do { newNum = Math.floor(Math.random() * CONFIG.DRAW_POOL_SIZE) + 1; }
                while (usedNums.has(newNum));
              }

              // Delay so the player sees their own change first
              setTimeout(() => {
                if (_ballRefs[targetIdx]) {
                  _ballRefs[targetIdx].setNumber(newNum);
                  _ballRefs[targetIdx].el.classList.add('oracle-nudge');
                  setTimeout(() => _ballRefs[targetIdx].el.classList.remove('oracle-nudge'), 1200);
                  haptic.light();
                  validateNumbers();
                }
              }, 350);
            }

            validateNumbers();
          }
        });

        const stopDrag = () => {
          if (isDragging && !didSwipe) {
            // Cool back — player didn't change this number
            ball.classList.remove('is-warming');
          }
          isDragging = false;
        };
        ball.addEventListener('pointerup', stopDrag);
        ball.addEventListener('pointercancel', stopDrag);

        numbersRow.appendChild(ball);
      });

      // Staggered entrance animations
      setTimeout(() => quote.classList.add('is-visible'), 100);
      setTimeout(() => numbersRow.classList.add('is-visible'), 900);
      setTimeout(() => ctaWrap.classList.add('is-visible'), 1500);
    },
    onExit() {
      // Reset for potential re-entry
      quote.classList.remove('is-visible');
      numbersRow.classList.remove('is-visible');
      ctaWrap.classList.remove('is-visible');
    },
  });
}