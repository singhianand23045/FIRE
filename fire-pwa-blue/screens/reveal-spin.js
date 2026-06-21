// ─────────────────────────────────────────────────────────────
// FIRE PWA — Active Play: "Grab the Spin"
//
// During the draw, each drawn ball becomes a horizontally-spinning
// roulette ball. The player can:
//   • Tap         → hard lock (150ms, no floor), reveal now
//   • Swipe L→R   → stoke it faster (kinetic, decays); no ceiling
//   • Long-press  → freeze it; release reveals; no max-hold
//   • Do nothing  → auto-settles after IDLE_SETTLE_MS of quiet
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
const easeIn = (t) => t * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
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
  const cycleW = cfg.CYCLE_LEN * BALL_W;
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

  // ── Build a seeded reel inside a ball ──
  function buildReel(i, ballEl) {
    const drawnNum = drawn[i];
    const landingIndex = Math.floor(cfg.CYCLE_LEN / 2);
    const seq = new Array(cfg.CYCLE_LEN);
    for (let k = 0; k < cfg.CYCLE_LEN; k++) {
      seq[k] = 1 + Math.floor(Math.random() * CONFIG.DRAW_POOL_SIZE);
    }
    seq[landingIndex] = drawnNum;
    // Seed one of the player's OWN numbers in the cell that whooshes past
    // immediately before the landing (manufactured near-miss every ball).
    const seedIdx = (landingIndex + 1) % cfg.CYCLE_LEN;
    const held = numbers.filter((n) => n !== drawnNum);
    if (held.length) seq[seedIdx] = held[Math.floor(Math.random() * held.length)];

    ballEl.classList.add('dball-active', 'dball--spin');
    ballEl.textContent = '';
    const reel = document.createElement('div');
    reel.className = 'dball__reel';
    // Two copies → seamless wrap.
    for (let copy = 0; copy < 2; copy++) {
      for (let k = 0; k < cfg.CYCLE_LEN; k++) {
        const cell = document.createElement('div');
        cell.className = 'dball__cell';
        cell.textContent = seq[k];
        reel.appendChild(cell);
      }
    }
    ballEl.appendChild(reel);

    // p ≡ landingPmod (mod cycleW) centers seq[landingIndex] in the viewport.
    const landingPmod = ((cfg.CYCLE_LEN - landingIndex) % cfg.CYCLE_LEN) * BALL_W;
    return { reel, landingPmod };
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
      if (cur === rt && rt.phase === 'live' && !rt.frozen) startDecel(rt, cfg.SETTLE_MS * pace, BALL_W * 1.5);
    }, cfg.IDLE_SETTLE_MS * pace);
  }

  function enterLive(rt) {
    if (rt.phase !== 'spinup') return;
    rt.phase = 'live';
    armIdle(rt);
  }

  // ── Decelerate to land EXACTLY on the predetermined number ──
  function startDecel(rt, durMs, minSpin) {
    if (rt.phase === 'decel' || rt.phase === 'locked') return;
    clearTimer(rt.idleTimer);
    rt.ballEl.classList.remove('is-stoked');
    rt.phase = 'decel';
    // Smallest forward p ≥ current (+minSpin) that is congruent to landingPmod.
    let target = rt.p - (((rt.p - rt.landingPmod) % cycleW) + cycleW) % cycleW;
    const floor = rt.p + (minSpin || 0);
    while (target < floor) target += cycleW;
    rt.decelFrom = rt.p;
    rt.decelTarget = target;
    rt.decelDur = Math.max(60, durMs);
    rt.decelStart = now();
  }

  function lockBall(rt) {
    rt.phase = 'locked';
    paint(rt.reel, rt.landingPmod, 0);
    clearTimer(rt.idleTimer);

    // The "catch" — fires for tap, release, and auto-settle alike.
    haptic.medium();
    playTone('lock');

    rt.ballEl.classList.remove('dball--spin', 'dball--frozen');
    rt.ballEl.textContent = drawn[rt.i]; // clears the reel, shows the real number

    const resolveAndAdvance = () => {
      if (stopped) return;
      onBallResolved(rt.i);          // reveal.js applies match/near-miss visuals + tones
      later(() => { cur = null; runBall(rt.i + 1); }, cfg.LOCK_HOLD_MS);
    };

    // Variant A "foreshadow": a winning ball flares ~80ms before it reads.
    if (variant === 'A' && rt.isHit) {
      rt.ballEl.classList.add('is-flare');
      later(resolveAndAdvance, 80);
    } else {
      resolveAndAdvance();
    }
  }

  // ── Per-ball driver ──
  function runBall(i) {
    if (stopped) return;
    if (i >= drawn.length) { onAllResolved(); return; }
    const ballEl = getBall(i);
    if (!ballEl) { runBall(i + 1); return; }

    const { reel, landingPmod } = buildReel(i, ballEl);
    cur = {
      i, ballEl, reel, landingPmod,
      isHit: numbers.includes(drawn[i]),
      phase: 'spinup',
      p: 0, vel: 0, kinetic: 0,
      phaseStart: now(),
      last: now(),
      frozen: false,
      idleTimer: null,
      decelFrom: 0, decelTarget: 0, decelDur: 0, decelStart: 0,
    };
  }

  // ── Single rAF loop drives whichever ball is `cur` ──
  function loop() {
    rafId = requestAnimationFrame(loop);
    if (stopped || !cur || cur.phase === 'locked') return;
    const t = now();
    const dt = Math.min(48, t - cur.last);
    cur.last = t;

    if (cur.phase === 'spinup') {
      const prog = Math.min(1, (t - cur.phaseStart) / (cfg.SPIN_UP_MS * pace));
      cur.vel = cfg.CRUISE_VELOCITY * easeIn(prog);
      cur.p += cur.vel * dt;
      if (prog >= 1) enterLive(cur);
    } else if (cur.phase === 'live') {
      if (cur.frozen) {
        cur.vel = 0; // held stationary
      } else {
        cur.kinetic *= Math.pow(cfg.KINETIC_DECAY, dt / 16.67);
        cur.vel = cfg.CRUISE_VELOCITY + cur.kinetic;
        if (!cfg.REVERSE_SPIN && cur.vel < cfg.CRUISE_VELOCITY * 0.15) cur.vel = cfg.CRUISE_VELOCITY * 0.15;
        cur.p += cur.vel * dt;
      }
    } else if (cur.phase === 'decel') {
      const prog = Math.min(1, (t - cur.decelStart) / cur.decelDur);
      cur.p = cur.decelFrom + (cur.decelTarget - cur.decelFrom) * easeOut(prog);
      cur.vel = (1 - prog) * cfg.CRUISE_VELOCITY; // taper the blur
      if (prog >= 1) { lockBall(cur); return; }
    }
    paint(cur.reel, cur.p, cur.vel);
  }

  // ── Gesture layer (attached once; acts on `cur`) ──
  let pid = null, downX = 0, downY = 0, downT = 0, lastX = 0, moved = 0, didSwipe = false, lpTimer = null;

  const isGrabbable = () => cur && (cur.phase === 'spinup' || cur.phase === 'live');

  function cancelLP() { clearTimer(lpTimer); lpTimer = null; }

  function onDown(e) {
    if (!isGrabbable() || pid !== null) return;
    pid = e.pointerId;
    downX = lastX = e.clientX; downY = e.clientY; downT = now();
    moved = 0; didSwipe = false;
    try { drawAreaEl.setPointerCapture(pid); } catch (_) {}
    lpTimer = later(() => {
      // Long-press → freeze (no max-hold cap; held until release).
      if (cur && isGrabbable() && moved < cfg.MOVE_TOLERANCE) {
        enterLive(cur);
        cur.frozen = true;
        clearTimer(cur.idleTimer);
        cur.ballEl.classList.add('dball--frozen');
      }
    }, cfg.LONGPRESS_MS);
  }

  function onMove(e) {
    if (e.pointerId !== pid || !cur) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    const totX = e.clientX - downX, totY = e.clientY - downY;
    moved = Math.max(moved, Math.hypot(totX, totY));
    if (cur.frozen) return; // holding — ignore swipes
    if (Math.abs(totX) > cfg.SWIPE_DX_MIN && Math.abs(totX) > Math.abs(totY)) {
      cancelLP();
      didSwipe = true;
      enterLive(cur);
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
    cancelLP();
    try { drawAreaEl.releasePointerCapture(pid); } catch (_) {}
    const heldMs = now() - downT;
    pid = null;
    if (!cur) return;
    if (cur.frozen) {
      cur.frozen = false;
      cur.ballEl.classList.remove('dball--frozen');
      startDecel(cur, cfg.SETTLE_MS * pace, 0);
    } else if (!didSwipe && heldMs <= cfg.TAP_MAX_MS && moved <= cfg.TAP_MOVE_MAX) {
      startDecel(cur, cfg.HARD_LOCK_MS, 0); // hard lock, no floor
    }
    // else: a swipe ended — let it ride; the idle timer settles it.
  }

  function onCancel(e) {
    if (e.pointerId !== pid) return;
    cancelLP();
    pid = null;
    if (cur && cur.frozen) {
      cur.frozen = false;
      cur.ballEl.classList.remove('dball--frozen');
      startDecel(cur, cfg.SETTLE_MS * pace, 0);
    }
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
