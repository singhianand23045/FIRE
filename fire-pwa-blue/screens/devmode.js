// ─────────────────────────────────────────────────────────────
// FIRE PWA — Dev Mode Simulator
// Trigger: tap the Oracle eye on the result screen 5 times fast.
// Shows a panel to force any of the 7 match outcomes (0–6).
// Only active when CONFIG.DEBUG is true OR when the secret
// tap sequence is performed (works in production for QA).
// ─────────────────────────────────────────────────────────────

import { getState, updateState } from '../core/state.js';
import { goto } from '../core/router.js';
import { CONFIG } from '../config.js';

let _panel = null;
let _tapCount = 0;
let _tapTimer = null;

// ── Secret trigger: 5 taps on any element with data-dev-trigger
// Call attachDevTrigger(element) from result.js on the Oracle eye
export function attachDevTrigger(el) {
  el.addEventListener('click', () => {
    _tapCount++;
    clearTimeout(_tapTimer);
    _tapTimer = setTimeout(() => { _tapCount = 0; }, 1500);
    if (_tapCount >= 5) {
      _tapCount = 0;
      toggleDevPanel();
    }
  });
}

// ── Build and show/hide panel ─────────────────────────────────
function toggleDevPanel() {
  if (_panel) {
    _panel.remove();
    _panel = null;
    return;
  }

  _panel = document.createElement('div');
  _panel.id = 'fire-dev-panel';
  _panel.innerHTML = `
    <div class="dev-panel__inner">
      <div class="dev-panel__header">
        <span class="dev-panel__title">⚡ DEV SIMULATOR</span>
        <button class="dev-panel__close" id="dev-close">✕</button>
      </div>

      <div class="dev-panel__section-label">FORCE MATCH COUNT</div>
      <div class="dev-panel__grid" id="dev-match-grid">
        ${[0, 1, 2, 3, 4, 5, 6].map(n => `
          <button class="dev-panel__match-btn" data-matches="${n}">
            <span class="dev-panel__match-num">${n}</span>
            <span class="dev-panel__match-label">${_matchLabel(n)}</span>
          </button>
        `).join('')}
      </div>

      <div class="dev-panel__section-label" style="margin-top:16px">CURRENT STATE</div>
      <div class="dev-panel__state" id="dev-state"></div>

      <div class="dev-panel__section-label" style="margin-top:12px">ACTIONS</div>
      <div class="dev-panel__actions">
        <button class="dev-panel__action-btn" id="dev-reset-streak">Reset Streak</button>
        <button class="dev-panel__action-btn" id="dev-set-streak-5">Set Streak 5</button>
        <button class="dev-panel__action-btn" id="dev-reset-draws">Reset Draw Count</button>
        <button class="dev-panel__action-btn" id="dev-add-shield">Give Shield</button>
      </div>

      <div class="dev-panel__note">Tap Oracle eye 5× fast to close</div>
    </div>
  `;

  _applyStyles();
  document.body.appendChild(_panel);
  _refreshState();

  // Close button
  document.getElementById('dev-close').addEventListener('click', () => {
    _panel.remove(); _panel = null;
  });

  // Match buttons — force exact match count
  document.getElementById('dev-match-grid').addEventListener('click', e => {
    const btn = e.target.closest('[data-matches]');
    if (!btn) return;
    const n = parseInt(btn.dataset.matches);
    _forceNextDraw(n);
    _panel.remove(); _panel = null;
  });

  // Action buttons
  document.getElementById('dev-reset-streak').addEventListener('click', () => {
    updateState({ streakCount: 0, streakShieldActive: false });
    _refreshState();
  });
  document.getElementById('dev-set-streak-5').addEventListener('click', () => {
    updateState({ streakCount: 5 });
    _refreshState();
  });
  document.getElementById('dev-reset-draws').addEventListener('click', () => {
    updateState({ drawCount: 0, firstDrawDone: false, ritualTriggered: false });
    _refreshState();
  });
  document.getElementById('dev-add-shield').addEventListener('click', () => {
    updateState({ streakShieldActive: true });
    _refreshState();
  });
}

// ── Force next draw to produce exactly N matches ──────────────
function _forceNextDraw(matchCount) {
  updateState({ _devForceMatches: matchCount });
  goto('first-reveal');
}

// ── Export: check if dev override is set ─────────────────────
export function getDevForceMatches() {
  const state = getState();
  if (state._devForceMatches !== undefined && state._devForceMatches !== null) {
    const n = state._devForceMatches;
    updateState({ _devForceMatches: null }); // consume once
    return n;
  }
  return null;
}

// ── State display ─────────────────────────────────────────────
function _refreshState() {
  const el = document.getElementById('dev-state');
  if (!el) return;
  const s = getState();
  el.innerHTML = `
    <div class="dev-state-row"><span>Draws</span><strong>${s.drawCount}</strong></div>
    <div class="dev-state-row"><span>Game Draw</span><strong>${s.gameDrawIndex}/3 ${s.gameActive ? '▶' : '—'}</strong></div>
    <div class="dev-state-row"><span>Check-in</span><strong>${s.checkInStreak}/7</strong></div>
    <div class="dev-state-row"><span>Entries</span><strong>${s.entries ?? 0}</strong></div>
    <div class="dev-state-row"><span>Money</span><strong>$${(s.money ?? 0).toFixed(2)}</strong></div>
    <div class="dev-state-row"><span>Ritual</span><strong>${s.ritualComplete ? '✅' : s.ritualTriggered ? '⏳' : '—'}</strong></div>
  `;
}

// ── Export: construct a draw with exactly N matches ───────────
// Used by reveal.js when dev override is active
export function _constructForcedDraw(playerNumbers, matchCount) {
  const clampedCount = Math.max(0, Math.min(matchCount, playerNumbers.length));
  const pool = Array.from({ length: CONFIG.DRAW_POOL_SIZE ?? 27 }, (_, i) => i + 1);
  const nonPlayer = pool.filter(n => !playerNumbers.includes(n));

  // Shuffle helpers
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const matched = shuffle(playerNumbers).slice(0, clampedCount);
  const fillers = shuffle(nonPlayer).slice(0, 6 - clampedCount);
  return [...matched, ...fillers].sort((a, b) => a - b);
}

// ── Match labels ──────────────────────────────────────────────
function _matchLabel(n) {
  return ['No match', '1 match', 'Building', 'Triple', 'Blazes', 'Blazes+', 'All 6!'][n] ?? '';
}

// ── Inline styles (self-contained, no CSS file needed) ───────
function _applyStyles() {
  if (document.getElementById('dev-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'dev-panel-styles';
  style.textContent = `
    #fire-dev-panel {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: flex-end;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .dev-panel__inner {
      width: 100%;
      background: #0e0e0e;
      border-top: 1px solid rgba(201,168,76,0.4);
      border-radius: 24px 24px 0 0;
      padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
      max-height: 90vh;
      overflow-y: auto;
    }
    .dev-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .dev-panel__title {
      font-family: -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 3px;
      color: #C9A84C;
      text-transform: uppercase;
    }
    .dev-panel__close {
      background: rgba(255,255,255,0.08);
      border: none;
      border-radius: 50%;
      width: 32px; height: 32px;
      color: #999;
      font-size: 14px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .dev-panel__section-label {
      font-family: -apple-system, sans-serif;
      font-size: 10px;
      letter-spacing: 3px;
      color: #555;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .dev-panel__grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 4px;
    }
    .dev-panel__match-btn {
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 12px 6px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      -webkit-tap-highlight-color: transparent;
      transition: all 0.15s ease;
    }
    .dev-panel__match-btn:active {
      background: rgba(201,168,76,0.15);
      border-color: rgba(201,168,76,0.5);
      transform: scale(0.96);
    }
    .dev-panel__match-btn[data-matches="0"] { grid-column: span 2; }
    .dev-panel__match-num {
      font-family: -apple-system, sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #C9A84C;
      line-height: 1;
    }
    .dev-panel__match-label {
      font-family: -apple-system, sans-serif;
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: center;
    }
    .dev-panel__state {
      background: #141414;
      border-radius: 12px;
      padding: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .dev-state-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .dev-state-row span {
      font-family: -apple-system, sans-serif;
      font-size: 10px;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .dev-state-row strong {
      font-family: -apple-system, sans-serif;
      font-size: 16px;
      color: #E8E8E8;
      font-weight: 500;
    }
    .dev-panel__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .dev-panel__action-btn {
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 10px;
      color: #E8E8E8;
      font-family: -apple-system, sans-serif;
      font-size: 12px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .dev-panel__action-btn:active {
      background: rgba(255,255,255,0.06);
      transform: scale(0.97);
    }
    .dev-panel__note {
      margin-top: 16px;
      text-align: center;
      font-family: -apple-system, sans-serif;
      font-size: 11px;
      color: #333;
    }
  `;
  document.head.appendChild(style);
}