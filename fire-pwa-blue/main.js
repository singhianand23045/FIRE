// ── Entry point for esbuild bundling ─────────────────────────
import { initAnalytics } from './core/analytics.js';
import { getDeviceId, isFirstLaunch, markFirstLaunch } from './core/device.js';
import { loadState } from './core/state.js';
import { initRouter } from './core/router.js';
import { initFirebase } from './core/firebase.js';

import { initSplash } from './screens/splash.js';
import { initFirstReveal } from './screens/first-reveal.js';
import { initReveal } from './screens/reveal.js';
import { initResult } from './screens/result.js';
import { initRitual } from './screens/ritual.js';
import { initSoulProfile } from './screens/soul-profile.js';

import { evt_firstOpen, evt_appOpen } from './core/analytics.js';
import { initJackpotBanner } from './components/jackpot-banner.js';
import { initUserAvatar } from './components/user-avatar.js';
import { processCheckIn } from './engine/streak.js';

async function boot() {
  getDeviceId();
  const state = loadState();

  initAnalytics();

  await Promise.race([
    initFirebase(),
    new Promise(r => setTimeout(r, 3000)),
  ]).catch(() => {});

  if (isFirstLaunch()) {
    markFirstLaunch();
    evt_firstOpen();
  } else {
    evt_appOpen(state.drawCount, state.checkInStreak);
  }

  processCheckIn();

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (e) {
      console.warn('[FIRE] SW registration failed:', e);
    }
  }

  initJackpotBanner();
  initUserAvatar();

  initSplash();
  initFirstReveal();
  initReveal();
  initResult();
  initRitual();
  initSoulProfile();

  initRouter('splash');

  const loading = document.getElementById('loading');
  loading.classList.add('is-hidden');
  setTimeout(() => loading.remove(), 500);
}

boot().catch(err => {
  console.error('[FIRE] Boot error:', err);
  const loading = document.getElementById('loading');
  if (loading) loading.remove();
});
