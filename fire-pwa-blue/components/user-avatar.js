// ─────────────────────────────────────────────────────────────
// FIRE PWA — User Avatar & Wallet Panel
// Fixed avatar button (top-right) that opens a wallet bottom-sheet.
// ─────────────────────────────────────────────────────────────

import { getState } from '../core/state.js';
import { canPlay } from '../engine/economy.js';
import { getStreakSummary } from '../engine/streak.js';
import { goto } from '../core/router.js';
import { haptic } from '../core/device.js';
import { CONFIG } from '../config.js';
import { clearWhispers } from '../components/toast.js';

// ── Internal refs ─────────────────────────────────────────────
let _btn = null;
let _panel = null;
let _overlay = null;

// ── Init ──────────────────────────────────────────────────────
export function initUserAvatar() {
  const app = document.getElementById('app');

  // ── Avatar button ─────────────────────────────────────────
  _btn = document.createElement('button');
  _btn.id = 'user-avatar-btn';
  _btn.className = 'user-avatar-btn';
  _btn.setAttribute('aria-label', 'Open wallet');
  app.appendChild(_btn);

  _updateAvatarBtn(); // Initial render

  // ── Overlay ───────────────────────────────────────────────
  _overlay = document.createElement('div');
  _overlay.id = 'wallet-overlay';
  _overlay.className = 'wallet-overlay';
  app.appendChild(_overlay);

  // ── Wallet panel ──────────────────────────────────────────
  _panel = document.createElement('div');
  _panel.id = 'wallet-panel';
  _panel.className = 'wallet-panel wallet-panel--hidden';
  _panel.innerHTML = `
    <div class="wallet-panel__handle"></div>

    <div class="wallet-panel__header">
      <span class="wallet-panel__avatar-icon">${_avatarSVG(32, 1.6)}</span>
      <span class="wallet-panel__name">Oracle Seeker</span>
    </div>

    <div class="wallet-panel__stats">
      <div class="wallet-stat">
        <div class="wallet-stat__label">ENTRIES</div>
        <div class="wallet-stat__value wallet-stat__value--entries" id="wp-entries">0</div>
      </div>
      <div class="wallet-stat">
        <div class="wallet-stat__label">MONEY WON</div>
        <div class="wallet-stat__value wallet-stat__value--money" id="wp-money">$0.00</div>
      </div>
    </div>

    <div class="wallet-panel__divider"></div>

    <div class="wallet-panel__soul-row" id="wp-soul-row">
      <span>◈  Soul Profile</span>
      <span>→</span>
    </div>

    <div class="wallet-panel__divider"></div>

    <div class="wallet-panel__section-header">STREAKS</div>

    <div class="wallet-panel__checkin">
      <div class="wallet-checkin__dots" id="wp-checkin-dots"></div>
      <div class="wallet-checkin__label" id="wp-checkin-label"></div>
    </div>

    <div class="wallet-panel__hattrick" id="wp-hattrick">
      🎩 Hat-Tricks: <strong id="wp-hattrick-count">0</strong> total
    </div>

    <div class="wallet-panel__divider"></div>

    <div class="wallet-panel__section-header">ENTRIES LEDGER</div>
    <div class="wallet-panel__ledger" id="wp-entries-ledger"></div>

    <div class="wallet-panel__divider"></div>

    <div class="wallet-panel__section-header">MONEY LEDGER</div>
    <div class="wallet-panel__ledger" id="wp-money-ledger"></div>

    <div class="wallet-panel__divider"></div>

    <button class="ritual__continue-btn wallet-panel__encash-btn" disabled>ENCASH</button>
  `;
  app.appendChild(_panel);

  // ── Event listeners ───────────────────────────────────────
  _btn.addEventListener('click', () => {
    haptic.light();
    _openPanel();
  });

  _overlay.addEventListener('click', () => {
    _closePanel();
  });

  // ── Swipe down to dismiss ─────────────────────────────────
  let _touchStartY = 0;
  _panel.addEventListener('touchstart', e => {
    _touchStartY = e.touches[0].clientY;
  }, { passive: true });
  _panel.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientY - _touchStartY;
    if (delta > 80) _closePanel();
  }, { passive: true });

  document.getElementById('wp-soul-row').addEventListener('click', () => {
    haptic.light();
    _closePanel();
    setTimeout(() => goto('soul-profile', { viewOnly: true }), 300);
  });

  document.addEventListener('fire:state:updated', (e) => {
    if (e.detail.entries !== undefined) {
      _updateAvatarBtn();
      // If panel is open, we should probably update the panel entries too
      if (_panel.classList.contains('wallet-panel--visible')) {
        document.getElementById('wp-entries').textContent = e.detail.entries;
      }
    }
  });

  if (CONFIG.DEBUG) console.log('[FIRE][Avatar] initUserAvatar complete');
}

// ── Open panel ────────────────────────────────────────────────
function _openPanel() {
  _updateAvatarBtn();
  _populatePanel();
  _panel.classList.remove('wallet-panel--hidden');
  _panel.classList.add('wallet-panel--visible');
  _overlay.classList.add('wallet-overlay--visible');
  clearWhispers();
  document.dispatchEvent(new CustomEvent('fire:overlay:open'));
  if (CONFIG.DEBUG) console.log('[FIRE][Avatar] Wallet panel opened');
}

// ── Close panel ───────────────────────────────────────────────
function _closePanel() {
  _panel.classList.add('wallet-panel--hidden');
  _panel.classList.remove('wallet-panel--visible');
  _overlay.classList.remove('wallet-overlay--visible');
  document.dispatchEvent(new CustomEvent('fire:overlay:close'));
  if (CONFIG.DEBUG) console.log('[FIRE][Avatar] Wallet panel closed');
}

// ── Update avatar button icon ─────────────────────────────────
// ── Avatar SVG helper ─────────────────────────────────────────
function _avatarSVG(size, stroke) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="9" r="4" stroke="#D4A843" stroke-width="${stroke}"/>
    <path d="M5 21c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#D4A843" stroke-width="${stroke}" stroke-linecap="round"/>
  </svg>`;
}

// ── Update avatar button icon ─────────────────────────────────
function _updateAvatarBtn() {
  const state = getState();
  const entries = state.entries ?? 0;
  _btn.innerHTML = `
    <div class="user-avatar-btn__label">ENTRIES</div>
    <div class="user-avatar-btn__value">${entries}</div>
  `;
}

// ── Populate panel content ────────────────────────────────────
function _populatePanel() {
  const state = getState();
  const streak = getStreakSummary();

  // Header — always SVG icon + name
  const name = state.soulProfile?.name || 'Oracle Seeker';
  _panel.querySelector('.wallet-panel__name').textContent = name;

  // Stats
  document.getElementById('wp-entries').textContent = state.entries ?? 0;
  document.getElementById('wp-money').textContent = '$' + (state.money ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Soul profile row — only show if ritual complete
  document.getElementById('wp-soul-row').style.display = state.ritualComplete ? '' : 'none';

  // Check-in dots (7 dots)
  const dotsEl = document.getElementById('wp-checkin-dots');
  dotsEl.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const dot = document.createElement('span');
    dot.className = 'wallet-checkin__dot' + (i < streak.checkInStreak ? ' wallet-checkin__dot--filled' : '');
    dotsEl.appendChild(dot);
  }
  const daysLeft = 7 - streak.checkInStreak;
  document.getElementById('wp-checkin-label').textContent =
    streak.checkInStreak === 0
      ? 'Check in daily for a free game'
      : `${streak.checkInStreak} of 7 · ${daysLeft} more day${daysLeft !== 1 ? 's' : ''} for a free game`;

  // Hat-tricks
  document.getElementById('wp-hattrick-count').textContent = streak.hatTrickCount;

  // Ledgers
  _renderLedger('wp-entries-ledger', [...(state.entriesLedger || [])].reverse().slice(0, 20), 'entries');
  _renderLedger('wp-money-ledger', [...(state.moneyLedger || [])].reverse().slice(0, 20), 'money');

  if (CONFIG.DEBUG) console.log('[FIRE][Avatar] Panel populated');
}

// ── Render a ledger list ──────────────────────────────────────
function _renderLedger(elId, items, type) {
  const el = document.getElementById(elId);
  el.innerHTML = '';

  if (!items || items.length === 0) {
    el.innerHTML = '<div class="wallet-ledger__empty">No transactions yet</div>';
    return;
  }

  // Header row
  const header = document.createElement('div');
  header.className = 'wallet-ledger__row wallet-ledger__row--header';
  const amountLabel = type === 'entries' ? 'ENTRIES' : 'AMOUNT';
  header.innerHTML = `
    <span class="wallet-ledger__col wallet-ledger__col--desc">DESC</span>
    <span class="wallet-ledger__col wallet-ledger__col--amount">${amountLabel}</span>
    <span class="wallet-ledger__col wallet-ledger__col--time">TIME</span>
  `;
  el.appendChild(header);

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'wallet-ledger__row';

    const isEarn = type === 'money' || item.type === 'earn';

    const amountHtml = type === 'entries'
      ? `<span class="${isEarn ? 'wallet-ledger__val--earn' : 'wallet-ledger__val--spend'}">${isEarn ? '+' : '−'}${item.amount}</span>`
      : `<span class="wallet-ledger__val--earn">+$${(item.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;

    row.innerHTML = `
      <span class="wallet-ledger__col wallet-ledger__col--desc">${_normalizeReason(item.reason)}</span>
      <span class="wallet-ledger__col wallet-ledger__col--amount">${amountHtml}</span>
      <span class="wallet-ledger__col wallet-ledger__col--time">${_formatTimestamp(item.at)}</span>
    `;

    el.appendChild(row);
  }
}

// ── Normalize legacy reason strings ──────────────────────────
function _normalizeReason(reason) {
  if (!reason) return '—';
  // Already clean format like "2/6 draw", "Game started", etc.
  if (reason.includes('/6')) return reason.includes('draw') ? reason : reason + ' draw';
  // Legacy entries reasons
  if (reason === '+10 entries') return '2/6 draw';
  if (reason === '+60 entries') return '3/6 draw';
  if (reason === 'JACKPOT!')    return '6/6 draw';
  // Legacy money reasons
  if (reason === '+$1.00')      return '4/6 draw';
  if (reason === '+$100.00')    return '5/6 draw';
  if (reason === '+$100,000.00' || reason.startsWith('+$1') && reason.includes('000')) return '6/6 draw';
  return reason;
}

// ── Format timestamp ─────────────────────────────────────────
function _formatTimestamp(at) {
  const d = new Date(at);
  const tz = 'America/New_York'; // GMT-4 (EDT) / GMT-5 (EST)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  return `${date} ${time}`;
}
