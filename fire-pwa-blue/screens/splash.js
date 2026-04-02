// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: Splash
// Black screen. Oracle eye opens. FIRE title. Tap to begin.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto } from '../core/router.js';
import { createOracleEye, animateEyeOpen } from '../components/oracle-eye.js';
import { unlockAudio, haptic } from '../core/device.js';
import { evt_splashTapped } from '../core/analytics.js';

export function initSplash() {
  const el = document.getElementById('screen-splash');

  // Build DOM
  const eyeWrap = document.createElement('div');
  eyeWrap.className = 'splash__eye-wrap';
  const eye = createOracleEye('xl');
  eyeWrap.appendChild(eye);

  const title = document.createElement('div');
  title.className = 'splash__title';
  title.textContent = 'FIRE';

  const sub = document.createElement('div');
  sub.className = 'splash__sub';
  sub.textContent = 'The Oracle awaits';

  el.appendChild(eyeWrap);
  el.appendChild(title);
  el.appendChild(sub);

  // Auto-advance after 4 seconds — no tap required
  let _autoTimer = null;

  // Hide orb before first render — avoids flash before animation
  const orb = eye.querySelector('.oracle-eye__orb');
  if (orb) { orb.style.transform = 'scale(0)'; orb.style.opacity = '0'; }

  registerScreen({
    id: 'splash',
    el,
    onEnter() {
      // Reset to hidden state in case of re-entry
      if (orb) { orb.style.transition = ''; orb.style.transform = 'scale(0)'; orb.style.opacity = '0'; }
      setTimeout(() => animateEyeOpen(eye), 400);
      _autoTimer = setTimeout(() => {
        evt_splashTapped();
        goto('first-reveal');
      }, 4000);
    },
    onExit() {
      clearTimeout(_autoTimer);
      // Reset orb so re-entry starts clean
      if (orb) { orb.style.transition = ''; orb.style.transform = 'scale(0)'; orb.style.opacity = '0'; }
    },
  });
}
