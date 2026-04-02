// ─────────────────────────────────────────────────────────────
// FIRE PWA — Device & Storage Layer
// Generates permanent deviceId. Wraps localStorage with
// namespaced keys and JSON serialization. Handles iOS audio
// unlock (iOS requires user gesture before AudioContext).
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';

const NS = 'fire_'; // localStorage namespace prefix

// ── UUID v4 ──────────────────────────────────────────────────
function uuidv4() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older iOS
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Device ID ────────────────────────────────────────────────
let _deviceId = null;

export function getDeviceId() {
  if (_deviceId) return _deviceId;
  _deviceId = store.get('deviceId');
  if (!_deviceId) {
    _deviceId = uuidv4();
    store.set('deviceId', _deviceId);
    if (CONFIG.DEBUG) console.log('[FIRE] New device registered:', _deviceId);
  }
  return _deviceId;
}

// ── Storage wrapper ──────────────────────────────────────────
export const store = {
  get(key) {
    try {
      const raw = localStorage.getItem(NS + key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      if (CONFIG.DEBUG) console.warn('[FIRE] store.get error', key, e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
    } catch (e) {
      // Storage quota exceeded — rare but handle gracefully
      if (CONFIG.DEBUG) console.warn('[FIRE] store.set error', key, e);
    }
  },

  remove(key) {
    localStorage.removeItem(NS + key);
  },

  clear() {
    // Only clear FIRE keys, not other app keys
    Object.keys(localStorage)
      .filter(k => k.startsWith(NS))
      .forEach(k => localStorage.removeItem(k));
  },
};

// ── Audio Engine ─────────────────────────────────────────────
// iOS blocks audio until first user gesture. We create the
// AudioContext on the first tap anywhere, then keep it alive.

let _audioCtx = null;
let _audioUnlocked = false;
const _audioBuffers = {};

export function unlockAudio() {
  if (_audioUnlocked) return;
  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Play a silent buffer to unlock
    const buf = _audioCtx.createBuffer(1, 1, 22050);
    const src = _audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(_audioCtx.destination);
    src.start(0);
    _audioUnlocked = true;
    if (CONFIG.DEBUG) console.log('[FIRE] Audio unlocked');
  } catch (e) {
    if (CONFIG.DEBUG) console.warn('[FIRE] Audio unlock failed', e);
  }
}

export async function loadSound(name, url) {
  if (!_audioCtx) return;
  try {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    _audioBuffers[name] = await _audioCtx.decodeAudioData(buf);
  } catch (e) {
    if (CONFIG.DEBUG) console.warn('[FIRE] loadSound failed', name, e);
  }
}

export function playSound(name, volume = 1.0) {
  if (!_audioCtx || !_audioBuffers[name]) return;
  try {
    const src = _audioCtx.createBufferSource();
    const gain = _audioCtx.createGain();
    src.buffer = _audioBuffers[name];
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(_audioCtx.destination);
    src.start(0);
  } catch (e) {
    if (CONFIG.DEBUG) console.warn('[FIRE] playSound failed', name, e);
  }
}

// ── Haptics ──────────────────────────────────────────────────
// iOS Web supports navigator.vibrate only in some versions.
// Patterns are ms arrays [vibrate, pause, vibrate, ...]

export const haptic = {
  light()   { _vibrate([10]); },
  medium()  { _vibrate([20]); },
  heavy()   { _vibrate([40]); },
  success() { _vibrate([10, 50, 20]); },
  error()   { _vibrate([20, 30, 20, 30, 20]); },
  streak()  { _vibrate([30, 20, 15, 20, 50]); },
  win()     { _vibrate([20, 30, 20, 30, 60]); },
};

function _vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) { /* silently fail */ }
}

// ── First Launch Detection ───────────────────────────────────
export function isFirstLaunch() {
  return store.get('firstLaunchAt') === null;
}

export function markFirstLaunch() {
  store.set('firstLaunchAt', Date.now());
}
