// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: Soul Profile
// Dramatic reveal after ritual completion.
// Shows zodiac, element, soul number, top weighted numbers.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto } from '../core/router.js';
import { getState } from '../core/state.js';
import { createOracleEye, setOracleEyeWin } from '../components/oracle-eye.js';
import { haptic } from '../core/device.js';
import { ELEMENT_PERSONALITY } from '../engine/oracle.js';
import { evt_soulProfileViewed } from '../core/analytics.js';

export function initSoulProfile() {
  const el = document.getElementById('screen-soul-profile');

  el.innerHTML = `
    <div class="soul-profile__header" id="sp-header">YOUR SOUL HAS BEEN READ</div>
    <div class="soul-profile__orb-wrap" id="sp-orb"></div>
    <div class="soul-profile__zodiac" id="sp-zodiac"></div>
    <div class="soul-profile__stats" id="sp-stats"></div>
    <div class="soul-profile__personality" id="sp-personality"></div>
    <div class="soul-profile__numbers-label" id="sp-numbers-label">YOUR NUMBER UNIVERSE</div>
    <div class="soul-profile__numbers-row" id="sp-numbers-row"></div>
    <button class="soul-profile__begin-btn" id="sp-begin-btn">BEGIN YOUR JOURNEY →</button>
  `;

  const orbWrap    = el.querySelector('#sp-orb');
  const zodiacEl   = el.querySelector('#sp-zodiac');
  const statsEl    = el.querySelector('#sp-stats');
  const personalEl = el.querySelector('#sp-personality');
  const numbersRow = el.querySelector('#sp-numbers-row');
  const beginBtn   = el.querySelector('#sp-begin-btn');

  // Build the oracle orb (reused across enters)
  const orb = createOracleEye('xl');
  setOracleEyeWin(orb, true);
  orbWrap.appendChild(orb);

  beginBtn.addEventListener('click', () => {
    haptic.medium();
    goto('first-reveal');
  });

  const headerEl = el.querySelector('#sp-header');

  registerScreen({
    id: 'soul-profile',
    el,
    onEnter(params = {}) {
      const { soulProfile } = getState();
      if (!soulProfile) { goto('first-reveal'); return; }

      const isViewOnly = !!params.viewOnly;

      evt_soulProfileViewed();

      // Header + button text depend on context
      headerEl.textContent = isViewOnly ? 'YOUR SOUL PROFILE' : 'YOUR SOUL HAS BEEN READ';
      beginBtn.textContent = isViewOnly ? 'CONTINUE →' : 'BEGIN YOUR JOURNEY →';

      // Zodiac
      zodiacEl.textContent = soulProfile.zodiac;

      // Stats row
      statsEl.innerHTML = '';
      [
        { label: 'Element',     value: _cap(soulProfile.element) },
        { label: 'Soul Number', value: soulProfile.soulNumber     },
        { label: 'Birth Sign',  value: soulProfile.zodiac         },
      ].forEach(s => {
        const stat = document.createElement('div');
        stat.className = 'soul-profile__stat';
        stat.innerHTML = `
          <div class="soul-profile__stat-label">${s.label}</div>
          <div class="soul-profile__stat-value">${s.value}</div>
        `;
        statsEl.appendChild(stat);
      });

      // Personality
      const p = ELEMENT_PERSONALITY[soulProfile.element] || ELEMENT_PERSONALITY.air;
      personalEl.innerHTML = `<em>${p.name}</em> · ${p.desc}`;

      // Top 12 weighted numbers
      const top12 = [...soulProfile.weightedNumbers]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 12)
        .map(w => w.number)
        .sort((a, b) => a - b);

      numbersRow.innerHTML = '';
      top12.forEach((n, i) => {
        const ball = document.createElement('div');
        ball.className = `num-ball num-ball--sm num-ball--player delay-${(i % 6) + 1}`;
        ball.textContent = n;
        numbersRow.appendChild(ball);
      });

      // Replay animations on first reveal; skip dramatic restart on view-only
      if (!isViewOnly) _resetAnims(el);
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────

function _cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function _resetAnims(el) {
  // Briefly remove animated children so CSS animations restart on re-enter
  const animated = el.querySelectorAll('[class*="soul-profile__"]');
  animated.forEach(node => {
    node.style.animation = 'none';
    node.offsetHeight; // reflow
    node.style.animation = '';
  });
}
