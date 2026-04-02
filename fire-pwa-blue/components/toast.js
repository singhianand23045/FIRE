// ─────────────────────────────────────────────────────────────
// FIRE PWA — Toast (Oracle Whisper) System
// Queued, non-overlapping whisper toasts at bottom of screen.
// ─────────────────────────────────────────────────────────────

let _container = null;
let _queue = [];
let _showing = false;

function ensureContainer() {
  if (_container) return;
  _container = document.createElement('div');
  _container.className = 'toast-container';
  document.body.appendChild(_container);
}

export function whisper(message, duration = 5000) {
  ensureContainer();
  _queue.push({ message, duration });
  if (!_showing) _showNext();
}

function _showNext() {
  if (_queue.length === 0) { _showing = false; return; }
  _showing = true;

  const { message, duration } = _queue.shift();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  _container.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast--exit');
    setTimeout(() => {
      el.remove();
      _showNext();
    }, 500);
  }, duration);
}

// Clear all toasts immediately
export function clearWhispers() {
  if (_container) _container.innerHTML = '';
  _queue = [];
  _showing = false;
}
