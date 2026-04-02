// ─────────────────────────────────────────────────────────────
// FIRE PWA — Jackpot Banner Component
// Fixed top banner showing live jackpot amount.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';
import { onJackpotChange, updateJackpot, getLiveUserCount } from '../core/firebase.js';
import { getState, updateState } from '../core/state.js';

// ── Internal refs ─────────────────────────────────────────────
let _amountEl = null;
let _updateTimer = null;

// ── Formatting ────────────────────────────────────────────────
function formatJackpot(amount) {
  return '$' + Math.floor(amount).toLocaleString('en-US');
}

// ── Display update ────────────────────────────────────────────
function _updateDisplay(amount, isIncrease) {
  if (!_amountEl) return;

  // Digit roll animation
  _amountEl.classList.add('jackpot-amount--rolling');
  _amountEl.textContent = formatJackpot(amount);
  setTimeout(() => {
    _amountEl.classList.remove('jackpot-amount--rolling');
  }, 400);

  // Increase indicator
  if (isIncrease) {
    _amountEl.classList.add('jackpot-amount--up');
    setTimeout(() => {
      _amountEl.classList.remove('jackpot-amount--up');
    }, 1500);
  }
}

// ── Live update loop ──────────────────────────────────────────
async function _runUpdateCycle() {
  try {
    const liveCount = await getLiveUserCount();
    await updateJackpot(liveCount);
    if (CONFIG.DEBUG) console.log(`[FIRE][Jackpot] Update cycle complete. Live users: ${liveCount}`);
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Jackpot] Update cycle error:', err);
  }
}

// ── Build DOM ─────────────────────────────────────────────────
function _buildBanner() {
  const banner = document.createElement('div');
  banner.id = 'jackpot-banner';

  banner.innerHTML = `
    <div class="jackpot-banner__inner">
      <div class="jackpot-banner__live">
        <span class="jackpot-banner__dot"></span>
        <span class="jackpot-banner__live-text">LIVE</span>
      </div>
      <div class="jackpot-banner__center">
        <div class="jackpot-banner__label">JACKPOT</div>
        <div class="jackpot-banner__amount" id="jackpot-amount">$100,000</div>
      </div>
      <div class="jackpot-banner__right">
        <span class="jackpot-banner__sparkle">✦</span>
      </div>
    </div>
    <div class="jackpot-banner__glow-line"></div>
  `;

  return banner;
}

// ── Init ──────────────────────────────────────────────────────
export function initJackpotBanner() {
  const app = document.getElementById('app');
  if (!app) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Jackpot] #app not found, banner not injected');
    return;
  }

  // Build and inject as first child
  const banner = _buildBanner();
  app.insertBefore(banner, app.firstChild);

  _amountEl = document.getElementById('jackpot-amount');

  // Offline fallback: show cached state immediately
  const cached = getState().jackpot;
  if (_amountEl) {
    _amountEl.textContent = formatJackpot(cached);
  }
  if (CONFIG.DEBUG) console.log(`[FIRE][Jackpot] Banner initialized. Cached: ${formatJackpot(cached)}`);

  // Firebase listener
  onJackpotChange((amount) => {
    const prev = getState().jackpot;
    if (amount !== prev) {
      updateState({ jackpot: amount });
      _updateDisplay(amount, amount > prev);
      if (CONFIG.DEBUG) console.log(`[FIRE][Jackpot] Display updated: ${formatJackpot(prev)} → ${formatJackpot(amount)}`);
    }
  });

  // Start live update loop: run once immediately, then every 30s
  _runUpdateCycle();
  _updateTimer = setInterval(_runUpdateCycle, 30000);
}
