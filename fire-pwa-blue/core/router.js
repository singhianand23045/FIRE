// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen Router
// Hash-based routing (#splash, #reveal, #result, etc.)
// Manages screen transitions with enter/exit animations.
// Screens register themselves; router calls lifecycle hooks.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';
import { fireScreen } from './analytics.js';

const _screens = {};       // registered screens
let _current = null;       // current screen id
let _transitioning = false;

// ── Register a screen ────────────────────────────────────────
// Screen object: { id, el, onEnter(params), onExit() }
export function registerScreen(screen) {
  _screens[screen.id] = screen;
}

// ── Navigate to a screen ────────────────────────────────────
export function goto(screenId, params = {}) {
  if (_transitioning) return;
  if (screenId === _current) return;

  const next = _screens[screenId];
  if (!next) {
    console.warn('[FIRE] Unknown screen:', screenId);
    return;
  }

  if (CONFIG.DEBUG) console.log('[FIRE][Router]', _current, '→', screenId, params);

  _transitioning = true;
  fireScreen(screenId);

  const prev = _current ? _screens[_current] : null;

  // Exit current screen
  if (prev && prev.el) {
    prev.el.classList.remove('screen--active');
    prev.el.classList.add('screen--exit');
    if (prev.onExit) prev.onExit();
  }

  // Enter next screen
  if (next.el) {
    next.el.classList.remove('screen--exit');
    next.el.classList.add('screen--active');
  }

  _current = screenId;

  // Call onEnter after a micro-tick so CSS transitions can fire
  requestAnimationFrame(() => {
    if (next.onEnter) next.onEnter(params);
    _transitioning = false;
  });
}

// ── Current screen id ────────────────────────────────────────
export function currentScreen() {
  return _current;
}

// ── Init: route to first screen ─────────────────────────────
export function initRouter(startScreenId) {
  goto(startScreenId);
}
