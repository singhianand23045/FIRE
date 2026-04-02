// ─────────────────────────────────────────────────────────────
// FIRE PWA — Audio Engine (Web Audio API synthesized tones)
// No .mp3 files needed. All sounds generated in real-time.
// iOS requires audio unlock on first user gesture — call
// initAudio() inside the splash tap handler.
// ─────────────────────────────────────────────────────────────

let _ctx = null;

// ── Init / unlock (call once on first user tap) ───────────────
export function initAudio() {
  if (_ctx) return;
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    // iOS unlock: play a silent buffer
    const buf = _ctx.createBuffer(1, 1, 22050);
    const src = _ctx.createBufferSource();
    src.buffer = buf;
    src.connect(_ctx.destination);
    src.start(0);
  } catch (e) {
    _ctx = null; // audio not available — all calls will silently fail
  }
}

// ── Master volume (0–1) ──────────────────────────────────────
let _masterVol = 0.7;
export function setVolume(v) { _masterVol = Math.max(0, Math.min(1, v)); }

// ── Core synth primitive ─────────────────────────────────────
// type: 'sine' | 'triangle' | 'square' | 'sawtooth'
function synth({ freq = 440, type = 'sine', vol = 0.5, attack = 0.01,
                 decay = 0.1, sustain = 0, release = 0.2,
                 duration = 0.3, detune = 0, delay = 0 } = {}) {
  if (!_ctx) return;
  const t = _ctx.currentTime + delay;

  const osc  = _ctx.createOscillator();
  const gain = _ctx.createGain();

  osc.type    = type;
  osc.frequency.setValueAtTime(freq, t);
  if (detune) osc.detune.setValueAtTime(detune, t);

  const peak = vol * _masterVol;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.linearRampToValueAtTime(peak * sustain || peak * 0.3, t + attack + decay);
  gain.gain.setValueAtTime(peak * sustain || peak * 0.3, t + duration - release);
  gain.gain.linearRampToValueAtTime(0, t + duration);

  osc.connect(gain);
  gain.connect(_ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

// ── Add reverb-style tail ─────────────────────────────────────
function synthWithTail(opts, tailFreq, tailVol = 0.15) {
  synth(opts);
  synth({ ...opts, freq: tailFreq, vol: tailVol,
          attack: 0.05, delay: (opts.delay || 0) + opts.duration * 0.4,
          duration: opts.duration * 0.6 });
}

// ── Named tones ──────────────────────────────────────────────

// matchNumber: 1–6 — pitch rises with each successive match
export function playTone(name, matchNumber = 1) {
  if (!_ctx) return;

  switch (name) {

    // Ball drops into grid — soft low thud
    case 'drop': {
      synth({ freq: 80,  type: 'sine',     vol: 0.4, attack: 0.005, decay: 0.08, release: 0.15, duration: 0.25 });
      synth({ freq: 120, type: 'triangle', vol: 0.2, attack: 0.005, decay: 0.06, release: 0.1,  duration: 0.2  });
      break;
    }

    // Ball matches — bright chime, pitch escalates with match count
    case 'match': {
      // Base notes for matches 1–6: C5, E5, G5, A5, C6, E6
      const freqs = [523, 659, 784, 880, 1047, 1319];
      const f = freqs[Math.min(matchNumber - 1, 5)];
      synthWithTail(
        { freq: f, type: 'sine', vol: 0.55, attack: 0.008, decay: 0.12, release: 0.25, duration: 0.45 },
        f * 1.5, 0.12
      );
      // Shimmer overtone
      synth({ freq: f * 2, type: 'sine', vol: 0.15, attack: 0.02, decay: 0.08, release: 0.2, duration: 0.35 });
      break;
    }

    // Final dramatic pause — deep resonant drone
    case 'pause': {
      synth({ freq: 55, type: 'sine',     vol: 0.35, attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.8, duration: 1.4 });
      synth({ freq: 110, type: 'triangle', vol: 0.1, attack: 0.15, decay: 0.2, sustain: 0.3, release: 0.6, duration: 1.2 });
      break;
    }

    // Win — triumphant chord burst (C major arpeggio)
    case 'win': {
      const chord = [523, 659, 784, 1047]; // C5 E5 G5 C6
      chord.forEach((f, i) => {
        synth({ freq: f, type: 'sine', vol: 0.4, attack: 0.01, decay: 0.15,
                release: 0.4, duration: 0.8, delay: i * 0.07 });
      });
      // Bass hit
      synth({ freq: 130, type: 'triangle', vol: 0.5, attack: 0.005, decay: 0.2, release: 0.5, duration: 0.9 });
      break;
    }

    // Big win (4+ matches) — fuller orchestral hit
    case 'bigwin': {
      const chord = [261, 329, 392, 523, 659]; // C4 E4 G4 C5 E5
      chord.forEach((f, i) => {
        synth({ freq: f, type: 'sine', vol: 0.38, attack: 0.008, decay: 0.2,
                release: 0.6, duration: 1.2, delay: i * 0.05 });
        // Harmonic overtone
        synth({ freq: f * 2, type: 'triangle', vol: 0.1, attack: 0.02, decay: 0.15,
                release: 0.4, duration: 0.8, delay: i * 0.05 + 0.04 });
      });
      // Deep bass
      synth({ freq: 65, type: 'sine', vol: 0.55, attack: 0.01, decay: 0.3, release: 0.7, duration: 1.5 });
      break;
    }

    // Streak ignite — fire crackle feel
    case 'streak': {
      [220, 277, 330].forEach((f, i) => {
        synth({ freq: f, type: 'sawtooth', vol: 0.2, attack: 0.01, decay: 0.1,
                release: 0.2, duration: 0.35, delay: i * 0.06 });
      });
      synth({ freq: 440, type: 'sine', vol: 0.4, attack: 0.01, decay: 0.15, release: 0.3, duration: 0.5, delay: 0.15 });
      break;
    }

    // Near miss — tense descending tone
    case 'nearmiss': {
      synth({ freq: 330, type: 'triangle', vol: 0.3, attack: 0.01, decay: 0.15, release: 0.3, duration: 0.5 });
      synth({ freq: 277, type: 'sine',     vol: 0.2, attack: 0.02, decay: 0.2,  release: 0.4, duration: 0.6, delay: 0.1 });
      break;
    }

    // Button tap — clean click
    case 'tap': {
      synth({ freq: 800, type: 'sine', vol: 0.25, attack: 0.003, decay: 0.05, release: 0.08, duration: 0.12 });
      break;
    }

    // Reveal button — mystical shimmer
    case 'reveal': {
      synth({ freq: 220, type: 'sine',     vol: 0.3, attack: 0.02, decay: 0.1, release: 0.3, duration: 0.5 });
      synth({ freq: 440, type: 'triangle', vol: 0.2, attack: 0.03, decay: 0.1, release: 0.4, duration: 0.6, delay: 0.05 });
      synth({ freq: 880, type: 'sine',     vol: 0.1, attack: 0.04, decay: 0.1, release: 0.3, duration: 0.5, delay: 0.1  });
      break;
    }
  }
}

// ── Ambient drone (looping background during reveal) ─────────
let _ambientNodes = [];
let _ambientRunning = false;

export function startAmbient() {
  if (!_ctx || _ambientRunning) return;
  _ambientRunning = true;

  // Dark mystical drone: low fundamental + harmonic overtones
  const drones = [
    { freq: 55,  vol: 0.12, type: 'sine'     },
    { freq: 110, vol: 0.07, type: 'sine'     },
    { freq: 165, vol: 0.04, type: 'triangle' },
    { freq: 220, vol: 0.03, type: 'sine'     },
  ];

  drones.forEach(({ freq, vol, type }) => {
    if (!_ctx) return;
    const osc  = _ctx.createOscillator();
    const gain = _ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // Slight detuning for warmth
    osc.detune.value = (Math.random() - 0.5) * 8;
    gain.gain.setValueAtTime(0, _ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * _masterVol, _ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(_ctx.destination);
    osc.start();
    _ambientNodes.push({ osc, gain });
  });
}

export function stopAmbient(fadeTime = 1.5) {
  if (!_ctx || !_ambientRunning) return;
  _ambientRunning = false;
  const t = _ctx.currentTime;
  _ambientNodes.forEach(({ osc, gain }) => {
    gain.gain.linearRampToValueAtTime(0, t + fadeTime);
    osc.stop(t + fadeTime + 0.1);
  });
  _ambientNodes = [];
}
