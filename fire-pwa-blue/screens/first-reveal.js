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

  el.appendChild(eyeWrap);
  el.appendChild(quote);
  el.appendChild(numbersRow);
  el.appendChild(swipeHint);
  el.appendChild(ctaWrap);
  el.appendChild(profileLink);

  // Screen-level swipe handler — fat-finger friendly.
  // A pointerdown anywhere on the screen (except the CTA and profile link)
  // routes the swipe to the ball in the nearest X column.
  el.style.touchAction = 'none';

  let _activeBallIdx = -1;
  let _activePointerId = null;
  let _swipeStartY = 0;
  let _isSwiping = false;
  let _didSwipe = false;

  function findNearestBallByX(clientX) {
    let closestIdx = -1;
    let closestDist = Infinity;
    for (let j = 0; j < _ballRefs.length; j++) {
      const ref = _ballRefs[j];
      if (!ref || !ref.el) continue;
      const r = ref.el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const dist = Math.abs(clientX - center);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = j;
      }
    }
    return closestIdx;
  }

  el.addEventListener('pointerdown', (e) => {
    if (btn.contains(e.target)) return;
    if (profileLink.contains(e.target)) return;
    if (!_ballRefs.length) return;

    const idx = findNearestBallByX(e.clientX);
    if (idx < 0) return;

    _activeBallIdx = idx;
    _activePointerId = e.pointerId;
    _swipeStartY = e.clientY;
    _isSwiping = true;
    _didSwipe = false;
    showSwipeHint();

    try { el.setPointerCapture(e.pointerId); } catch (_) {}

    const ball = _ballRefs[idx].el;
    if (!ball.classList.contains('is-warm')) {
      ball.classList.add('is-warming');
    }
  });

  el.addEventListener('pointermove', (e) => {
    if (!_isSwiping || e.pointerId !== _activePointerId) return;
    const i = _activeBallIdx;
    const ref = _ballRefs[i];
    if (!ref) return;
    const ball = ref.el;
    const deltaY = e.clientY - _swipeStartY;
    if (Math.abs(deltaY) <= 30) return;

    _didSwipe = true;
    dismissSwipeHint();
    ball.classList.remove('is-warming');
    ball.classList.add('is-warm');

    let n = _numbers[i];
    if (deltaY < 0) n++;
    else n--;
    if (n > CONFIG.DRAW_POOL_SIZE) n = 1;
    if (n < 1) n = CONFIG.DRAW_POOL_SIZE;

    ref.setNumber(n);
    _swipeStartY = e.clientY;
    haptic.light();
    _pendingNumberChanges++;
    pulseBackground(ball);

    // ── Oracle reaction: shift one ball to the LEFT (once per draw)
    if (!_oracleReacted) {
      _oracleReacted = true;
      let targetIdx;
      if (i === 0) {
        targetIdx = _numbers.length - 1;
      } else {
        const leftSlots = [];
        for (let j = 0; j < i; j++) leftSlots.push(j);
        targetIdx = leftSlots[Math.floor(Math.random() * leftSlots.length)];
      }
      const usedNums = new Set(_numbers);
      const candidates = oraclePick(getState().soulProfile);
      let newNum = candidates.find(num => !usedNums.has(num));
      if (!newNum) {
        do { newNum = Math.floor(Math.random() * CONFIG.DRAW_POOL_SIZE) + 1; }
        while (usedNums.has(newNum));
      }
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
  });

  function stopSwipe(e) {
    if (e.pointerId !== _activePointerId) return;
    if (_isSwiping && _activeBallIdx >= 0 && !_didSwipe) {
      const ref = _ballRefs[_activeBallIdx];
      if (ref && ref.el) ref.el.classList.remove('is-warming');
    }
    _isSwiping = false;
    _activeBallIdx = -1;
    _activePointerId = null;
  }
  el.addEventListener('pointerup', stopSwipe);
  el.addEventListener('pointercancel', stopSwipe);

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

  // ── Oracle reaction: one ball shifts when the player changes a number.
  // Each ball registers a setNumber() so the Oracle (and the screen-level
  // swipe handler above) can update the ball and _numbers in lockstep.
  let _oracleReacted = false;
  const _ballRefs = [];
  let _numbers = [];

  function validateNumbers() {
    const isUnique = new Set(_numbers).size === _numbers.length;
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
      updateState({ currentNumbers: _numbers });
    }
  }

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
      if (freshState.pendingDeclaration && Array.isArray(freshState.currentNumbers) && freshState.currentNumbers.length === 6) {
        _numbers = [...freshState.currentNumbers];
        if (CONFIG.DEBUG) console.log(`[FIRE][First-Reveal] Honoring declaration: ${freshState.pendingDeclaration.kind}`);
        updateState({ pendingDeclaration: null });
      } else {
        _numbers = oraclePick(freshState.soulProfile);
        updateState({ currentNumbers: _numbers });
      }

      // Show profile link once ritual is complete
      if (freshState.ritualComplete && freshState.soulProfile) {
        const { zodiacSymbol, zodiac } = freshState.soulProfile;
        // profileLink.textContent = `◈  ${zodiacSymbol} ${zodiac}  ·  Your Soul`;
        profileLink.style.display = '';
      } else {
        profileLink.style.display = 'none';
      }

      // Render number balls. Pointer handling lives at the screen level
      // (see init above) so swipes anywhere outside the CTA still reach
      // the nearest ball by X.
      numbersRow.innerHTML = '';
      _numbers.forEach((n, i) => {
        const ball = document.createElement('div');
        ball.className = `num-ball num-ball--lg num-ball--player anim-float delay-${i + 1}`;
        ball.textContent = n;
        ball.style.cursor = 'ns-resize';

        _ballRefs[i] = {
          el: ball,
          setNumber(v) { _numbers[i] = v; ball.textContent = v; },
        };

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