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

    // Deduct entries and start game if not already active
    if (!state.gameActive) {
      startGame();
    }

    goto('reveal');
  });

  // ── Register ─────────────────────────────────────────────
  registerScreen({
    id: 'first-reveal',
    el,
    onEnter() {
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

      // Rotate opening quote — non-repeating
      quote.innerHTML = pickQuote().replace('\n', '<br>');

      // Re-read state after potential earnEntries mutation
      const freshState = getState();
      const numbers = oraclePick(freshState.soulProfile);
      updateState({ currentNumbers: numbers });

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