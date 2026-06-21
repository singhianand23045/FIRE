// ─────────────────────────────────────────────────────────────
// FIRE PWA — Active Play: "Grab the Spin"
//
// During the draw, each drawn ball becomes a horizontally-spinning
// roulette ball. The player can:
//   • Tap / press → lock it and reveal (any touch that isn't a swipe)
//   • Swipe L→R   → stoke it faster (kinetic, decays); no ceiling
//   • Do nothing  → auto-settles after IDLE_SETTLE_MS of quiet
// (Long-press freeze was removed — on a phone the thumb covers the ball.)
//
// REGULATORY INVARIANT: the number under each ball is decided up front
// (drawn[i]). Every gesture is cosmetic — like a video-slot stop button.
// No gesture path ever passes the outcome into the landing computation;
// the authoritative reveal is onBallResolved(i) in reveal.js, driven by
// drawn[i], NOT by pixel position. The reel is eye candy.
//
// REVERSIBILITY: this whole file is gated behind CONFIG.ACTIVE_PLAY.ENABLED.
// Delete it + remove the branch in reveal.js + the ACTIVE_PLAY config to
// fully revert.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';
import { haptic } from '../core/device.js';
import { playTone } from '../engine/audio.js';

const BALL_W = 52; // .num-ball--lg width in px (keep in sync with components.css)

const now = () => performance.now();
// Quadratic ease-out = constant deceleration, how a real object slows under
// friction: the slowdown is spread EVENLY across the duration instead of being
// dumped in the first half (quintic covered 97% by the midpoint → felt like an
// abrupt halt). This reads as a gradual roll-to-a-stop.
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────────────────────
// runSpinDraw(opts) → stop()
//   opts.drawn          : number[]  predetermined drawn numbers
//   opts.numbers        : number[]  player's held numbers
//   opts.pace           : number    0.7–1.1 pacing multiplier (shared with classic)
//   opts.drawAreaEl     : Element   container that receives pointer events
//   opts.getBall(i)     : ()=>Element  the #dball-{i} element
//   opts.onBallResolved : (i)=>void  reveal.js's per-ball reveal (classes/haptics/tones)
//   opts.onAllResolved  : ()=>void   finale (pause beat + result)
//   opts.variant        : 'A'|'B'    landing variant (foreshadow | identical)
// Returns a stop() that tears everything down (timers, rAF, listeners, capture).
// ─────────────────────────────────────────────────────────────
export function runSpinDraw(opts) {
  const { drawn, numbers, pace, drawAreaEl, getBall, onBallResolved, onAllResolved, variant } = opts;
  const cfg = CONFIG.ACTIVE_PLAY;
  const cycleW = cfg.CYCLE_LEN * BALL_W || BALL_W; // guard: never 0 (a 0 CYCLE_LEN would NaN the spin math)
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const timers = new Set();
  let rafId = null;
  let stopped = false;
  let cur = null; // current ball's runtime record
  const prevTouchAction = drawAreaEl.style.touchAction; // captured before any early return (stop() restores it)

  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); if (!stopped) fn(); }, ms);
    timers.add(id);
    return id;
  }
  function clearTimer(id) { if (id != null) { clearTimeout(id); timers.delete(id); } }

  // ── Reduced motion: bypass the spin entirely, reveal in sequence ──
  if (reduceMotion) {
    let i = 0;
    const step = () => {
      if (stopped) return;
      if (i >= drawn.length) { onAllResolved(); return; }
      const idx = i++;
      onBallResolved(idx);
      later(step, 450);
    };
    step();
    return stop;
  }

  // ── Build a diverse spinning reel inside a ball ──
  function buildReel(i, ballEl) {
    const len = cfg.CYCLE_LEN;

    // Diverse strip: a shuffled run of DISTINCT pool numbers so EVERY number
    // appears. The drawn number and the near-miss whoosh are written into the
    // landing slots at decel time (see startDecel); the live spin is pure variety.
    const pool = [];
    for (let n = 1; n <= CONFIG.DRAW_POOL_SIZE; n++) pool.push(n);
    for (let k = pool.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      const t = pool[k]; pool[k] = pool[j]; pool[j] = t;
    }
    const seq = new Array(len);
    for (let k = 0; k < len; k++) seq[k] = pool[k % pool.length];

    ballEl.classList.add('dball-active', 'dball--spin');
    ballEl.textContent = '';
    const reel = document.createElement('div');
    reel.className = 'dball__reel';
    // Two copies → seamless wrap. cells[k] and cells[k+len] are the same slot.
    const cells = [];
    for (let copy = 0; copy < 2; copy++) {
      for (let k = 0; k < len; k++) {
        const cell = document.createElement('div');
        cell.className = 'dball__cell';
        cell.textContent = seq[k];
        reel.appendChild(cell);
        cells.push(cell);
      }
    }
    ballEl.appendChild(reel);
    return { reel, cells };
  }

  // Write a value into reel slot `idx` (both copies) so it shows under the ball.
  function setCell(rt, idx, value) {
    const a = rt.cells[idx];
    const b = rt.cells[idx + cfg.CYCLE_LEN];
    if (a) a.textContent = value;
    if (b) b.textContent = value;
  }

  function paint(reel, p, vel) {
    const pmod = ((p % cycleW) + cycleW) % cycleW;
    reel.style.transform = `translateX(${pmod - cycleW}px)`;
    const blur = Math.min(cfg.MAX_BLUR, Math.abs(vel) * cfg.BLUR_K);
    reel.style.filter = blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : 'none';
  }

  // ── Idle (do-nothing) auto-settle, resets on every interaction ──
  function armIdle(rt) {
    clearTimer(rt.idleTimer);
    rt.idleTimer = later(() => {
      if (cur === rt && rt.phase === 'live') startDecel(rt, cfg.SETTLE_MS * pace);
    }, cfg.IDLE_SETTLE_MS * pace);
  }

  // ── Decelerate: roll a SHORT FIXED distance and land the drawn number under
  //    the ball. Fixed (not "next position congruent to a preset landing", which
  //    could be a whole cycle away) so the reel never moves fast enough to alias
  //    or appear to reverse near the stop. ──
  function startDecel(rt, durMs) {
    if (rt.phase === 'decel' || rt.phase === 'locked') return;
    clearTimer(rt.idleTimer);
    rt.ballEl.classList.remove('is-stoked');
    rt.phase = 'decel';

    const len = cfg.CYCLE_LEN;
    // Land a few cells ahead, snapped to a whole cell so one sits centred.
    const targetP = Math.round((rt.p + cfg.DECEL_CELLS * BALL_W) / BALL_W) * BALL_W;
    const k = (((targetP / BALL_W) % len) + len) % len;
    const centerIdx = ((len - k) % len + len) % len; // slot centred at targetP
    const beforeIdx = (centerIdx + 1) % len;          // scrolls past just before landing

    // Write the drawn number onto the landing slot, and one of the player's own
    // numbers right before it (the near-miss whoosh). Both are several cells
    // ahead and off-screen, so the swap is invisible.
    setCell(rt, centerIdx, drawn[rt.i]);
    const held = numbers.filter((n) => n !== drawn[rt.i]);
    if (held.length) setCell(rt, beforeIdx, held[Math.floor(Math.random() * held.length)]);

    rt.landingPmod = ((targetP % cycleW) + cycleW) % cycleW;
    rt.decelFrom = rt.p;
    rt.decelTarget = targetP;
    rt.decelDur = Math.max(60, durMs);
    rt.decelStart = now();

    // Variant A "foreshadow": a winning ball builds a gold aura AS IT SLOWS —
    // while the reel is still blurred and the number is not yet readable — so the
    // tell LEADS the reveal instead of trailing it. (Variant B / misses: no aura.)
    if (variant === 'A' && rt.isHit) {
      rt.ballEl.style.setProperty('--decel-dur', rt.decelDur + 'ms');
      rt.ballEl.classList.add('dball--foreshadow');
    }
  }

  function lockBall(rt) {
    rt.phase = 'locked';
    paint(rt.reel, rt.landingPmod, 0);
    clearTimer(rt.idleTimer);

    // The "catch" — fires for tap, release, and auto-settle alike.
    haptic.medium();
    playTone('lock');

    // The foreshadow aura (variant A) already played during the slow-down; now the
    // number resolves and the win-colour flash takes over. Hand straight back —
    // no post-reveal delay (that used to make the flare trail the number).
    rt.ballEl.classList.remove('dball--spin', 'dball--foreshadow');
    rt.ballEl.textContent = drawn[rt.i]; // clears the reel, shows the real number
    onBallResolved(rt.i);                // reveal.js applies match/near-miss visuals + tones
    later(() => { cur = null; runBall(rt.i + 1); }, cfg.LOCK_HOLD_MS);
  }

  // ── Per-ball driver ──
  function runBall(i) {
    if (stopped) return;
    if (i >= drawn.length) { onAllResolved(); return; }
    const ballEl = getBall(i);
    if (!ballEl) { runBall(i + 1); return; }

    const { reel, cells } = buildReel(i, ballEl);
    cur = {
      i, ballEl, reel, cells,
      isHit: numbers.includes(drawn[i]),
      // Start at a gentle, constant cruise. No launch boost — that read as
      // "hyper speed" and pushed the reel into the aliasing zone (wagon-wheel
      // reversal). Diversity still shows from frame one: there's no ease-in ramp.
      phase: 'live',
      p: 0,
      vel: cfg.CRUISE_VELOCITY,
      kinetic: 0,
      last: now(),
      idleTimer: null,
      landingPmod: 0,
      decelFrom: 0, decelTarget: 0, decelDur: 0, decelStart: 0,
    };
    armIdle(cur); // start the do-nothing settle countdown immediately
  }

  // ── Single rAF loop drives whichever ball is `cur` ──
  function loop() {
    rafId = requestAnimationFrame(loop);
    if (stopped || !cur || cur.phase === 'locked') return;
    const t = now();
    const dt = Math.min(48, t - cur.last);
    cur.last = t;

    if (cur.phase === 'live') {
      cur.kinetic *= Math.pow(cfg.KINETIC_DECAY, dt / 16.67);
      cur.vel = cfg.CRUISE_VELOCITY + cur.kinetic;
      if (!cfg.REVERSE_SPIN && cur.vel < cfg.CRUISE_VELOCITY * 0.15) cur.vel = cfg.CRUISE_VELOCITY * 0.15;
      cur.p += cur.vel * dt;
    } else if (cur.phase === 'decel') {
      const prog = Math.min(1, (t - cur.decelStart) / cur.decelDur);
      cur.p = cur.decelFrom + (cur.decelTarget - cur.decelFrom) * easeOut(prog);
      cur.vel = (1 - prog) * cfg.CRUISE_VELOCITY; // taper the blur
      if (prog >= 1) { lockBall(cur); return; }
    }
    paint(cur.reel, cur.p, cur.vel);
  }

  // ── Gesture layer (attached once; acts on `cur`) ──
  // Two gestures: a horizontal swipe stokes the spin faster; any other press
  // locks the ball on release. (No long-press — the thumb covers the ball.)
  let pid = null, downX = 0, downY = 0, lastX = 0, didSwipe = false;

  const isGrabbable = () => cur && cur.phase === 'live';

  function onDown(e) {
    if (!isGrabbable() || pid !== null) return;
    pid = e.pointerId;
    downX = lastX = e.clientX; downY = e.clientY;
    didSwipe = false;
    try { drawAreaEl.setPointerCapture(pid); } catch (_) {}
  }

  function onMove(e) {
    if (e.pointerId !== pid || !cur) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    const totX = e.clientX - downX, totY = e.clientY - downY;
    if (Math.abs(totX) > cfg.SWIPE_DX_MIN && Math.abs(totX) > Math.abs(totY)) {
      didSwipe = true;
      let contrib = dx * cfg.SWIPE_GAIN;
      if (!cfg.REVERSE_SPIN && contrib < 0) contrib = 0; // only rightward stokes
      const lo = cfg.REVERSE_SPIN ? -cfg.MAX_KINETIC : 0;
      cur.kinetic = clamp(cur.kinetic + contrib, lo, cfg.MAX_KINETIC);
      if (cur.kinetic > 0.05) cur.ballEl.classList.add('is-stoked');
      armIdle(cur); // sustained swiping = unbounded spin
    }
  }

  function onUp(e) {
    if (e.pointerId !== pid) return;
    try { drawAreaEl.releasePointerCapture(pid); } catch (_) {}
    pid = null;
    if (!cur) return;
    // Any press that wasn't a swipe = "grab it" → lock on release.
    if (!didSwipe) startDecel(cur, cfg.HARD_LOCK_MS);
    // else: a swipe ended — let it ride; the idle timer settles it.
  }

  function onCancel(e) {
    if (e.pointerId !== pid) return;
    try { drawAreaEl.releasePointerCapture(pid); } catch (_) {}
    pid = null;
    // A cancel is not a deliberate tap, so we do NOT lock; the idle timer settles the ball.
  }

  drawAreaEl.style.touchAction = 'none';
  drawAreaEl.addEventListener('pointerdown', onDown);
  drawAreaEl.addEventListener('pointermove', onMove);
  drawAreaEl.addEventListener('pointerup', onUp);
  drawAreaEl.addEventListener('pointercancel', onCancel);

  // ── Teardown ──
  function stop() {
    if (stopped) return;
    stopped = true;
    if (rafId != null) cancelAnimationFrame(rafId);
    timers.forEach(clearTimeout);
    timers.clear();
    if (pid !== null) { try { drawAreaEl.releasePointerCapture(pid); } catch (_) {} pid = null; }
    drawAreaEl.removeEventListener('pointerdown', onDown);
    drawAreaEl.removeEventListener('pointermove', onMove);
    drawAreaEl.removeEventListener('pointerup', onUp);
    drawAreaEl.removeEventListener('pointercancel', onCancel);
    drawAreaEl.style.touchAction = prevTouchAction;
  }

  // ── Go ──
  rafId = requestAnimationFrame(loop);
  runBall(0);
  return stop;
}
