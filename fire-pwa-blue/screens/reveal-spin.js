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
const easeIn = (t) => t * t;
// Quintic ease-out: fast early, long gentle tail so the ball glides to a stop
// (velocity → 0 smoothly) instead of halting abruptly.
const easeOut = (t) => 1 - Math.pow(1 - t, 5);
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
    const len = cfg.CYCLE_LEN;
    const landingIndex = Math.floor(len / 2);

    // Diverse strip: a shuffled run of DISTINCT pool numbers so EVERY number
    // appears — kills the "same few keep repeating" feel. With CYCLE_LEN === pool
    // size the strip is a full permutation of 1..POOL.
    const pool = [];
    for (let n = 1; n <= CONFIG.DRAW_POOL_SIZE; n++) pool.push(n);
    for (let k = pool.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      const t = pool[k]; pool[k] = pool[j]; pool[j] = t;
    }
    const seq = new Array(len);
    for (let k = 0; k < len; k++) seq[k] = pool[k % pool.length];

    // Centre the predetermined number on the landing (swap keeps the strip distinct).
    const di = seq.indexOf(drawnNum);
    if (di === -1) seq[landingIndex] = drawnNum;
    else if (di !== landingIndex) { const t = seq[di]; seq[di] = seq[landingIndex]; seq[landingIndex] = t; }

    // Whoosh one of the player's OWN numbers past right before the landing —
    // a manufactured near-miss every ball, and it makes "their" numbers show up.
    const seedIdx = (landingIndex + 1) % len;
    const held = numbers.filter((n) => n !== drawnNum);
    if (held.length && seedIdx !== landingIndex) {
      const p = held[Math.floor(Math.random() * held.length)];
      const pi = seq.indexOf(p);
      if (pi === -1) seq[seedIdx] = p;
      else if (pi !== landingIndex && pi !== seedIdx) { const t = seq[pi]; seq[pi] = seq[seedIdx]; seq[seedIdx] = t; }
    }

    ballEl.classList.add('dball-active', 'dball--spin');
    ballEl.textContent = '';
    const reel = document.createElement('div');
    reel.className = 'dball__reel';
    // Two copies → seamless wrap.
    for (let copy = 0; copy < 2; copy++) {
      for (let k = 0; k < len; k++) {
        const cell = document.createElement('div');
        cell.className = 'dball__cell';
        cell.textContent = seq[k];
        reel.appendChild(cell);
      }
    }
    ballEl.appendChild(reel);

    // p ≡ landingPmod (mod cycleW) centers seq[landingIndex] in the viewport.
    const landingPmod = ((len - landingIndex) % len) * BALL_W;
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
      if (cur === rt && rt.phase === 'live') startDecel(rt, cfg.SETTLE_MS * pace, BALL_W * 1.5);
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

    rt.ballEl.classList.remove('dball--spin');
    rt.ballEl.textContent = drawn[rt.i]; // clears the reel, shows the real number

    const resolveAndAdvance = () => {
      if (stopped) return;
      onBallResolved(rt.i);          // reveal.js applies match/near-miss visuals + tones
      later(() => { cur = null; runBall(rt.i + 1); }, cfg.LOCK_HOLD_MS);
    };

    // Variant A "foreshadow": a winning ball throbs gold for FLARE_LEAD_MS
    // BEFORE the win-colour reveals — a loud, distinct "tell" that pre-loads
    // the dopamine. (Variant B and all misses resolve immediately.)
    if (variant === 'A' && rt.isHit) {
      rt.ballEl.style.setProperty('--flare-dur', cfg.FLARE_LEAD_MS + 'ms');
      rt.ballEl.classList.add('is-flare');
      later(resolveAndAdvance, cfg.FLARE_LEAD_MS);
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

  const isGrabbable = () => cur && (cur.phase === 'spinup' || cur.phase === 'live');

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
    try { drawAreaEl.releasePointerCapture(pid); } catch (_) {}
    pid = null;
    if (!cur) return;
    // Any press that wasn't a swipe = "grab it" → lock on release.
    if (!didSwipe) startDecel(cur, cfg.HARD_LOCK_MS, BALL_W);
    // else: a swipe ended — let it ride; the idle timer settles it.
  }

  function onCancel(e) {
    if (e.pointerId !== pid) return;
    pid = null;
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
