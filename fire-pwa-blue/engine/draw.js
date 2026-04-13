// ─────────────────────────────────────────────────────────────
// FIRE PWA — Draw Engine
// Generates lottery draws. First 3 draws use boosted RNG to
// guarantee 3+ matches at configured probability rates.
// All randomness uses crypto.getRandomValues for quality RNG.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';

// ── Crypto-quality RNG ───────────────────────────────────────
function secureRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / (0xFFFFFFFF + 1);
}

// Random integer in [min, max] inclusive
function randInt(min, max) {
  return Math.floor(secureRandom() * (max - min + 1)) + min;
}

// Fisher-Yates shuffle (crypto-quality)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Generate pool [1..DRAW_POOL_SIZE] ────────────────────────
function fullPool() {
  return Array.from({ length: CONFIG.DRAW_POOL_SIZE }, (_, i) => i + 1);
}

// ── Pure random draw (normal odds) ──────────────────────────
export function normalDraw() {
  return shuffle(fullPool()).slice(0, CONFIG.DRAW_PICK_COUNT).sort((a, b) => a - b);
}

// ── Boosted draw (guaranteed N+ matches) ────────────────────
// Strategy: decide outcome first (boosted or not), then
// construct the drawn numbers accordingly.
// playerNumbers = the 6 numbers the player is holding.

export function boostedDraw(playerNumbers, drawIndex) {
  const targetOdds = CONFIG.BOOST_ODDS[drawIndex] ?? 0; // 0.90, 0.70, 0.50
  const shouldBoost = secureRandom() < targetOdds;

  if (!shouldBoost) {
    return normalDraw();
  }

  // We need at least 3 matches. Pick how many: 3, 4, 5, or 6
  // Weight toward lower matches to keep it realistic
  const matchWeights = [0, 0, 0, 0.50, 0.30, 0.14, 0.06]; // index = match count
  const matchCount = _weightedChoice(matchWeights, 3);

  return _constructBoostedDraw(playerNumbers, matchCount);
}

// Build a drawn set that contains exactly `matchCount` of the player's numbers
function _constructBoostedDraw(playerNumbers, matchCount) {
  const pool = fullPool();
  const player = [...playerNumbers];
  const nonPlayer = pool.filter(n => !player.includes(n));

  // Pick `matchCount` from player's numbers
  const matched = shuffle(player).slice(0, matchCount);

  // Fill remaining slots from non-player numbers
  const fillerCount = CONFIG.DRAW_PICK_COUNT - matchCount;
  const fillers = shuffle(nonPlayer).slice(0, fillerCount);

  return [...matched, ...fillers].sort((a, b) => a - b);
}

// ── Near-miss engine ─────────────────────────────────────────
// Returns near-miss data for unmatched player numbers.
// For each unmatched number, finds the "closest" drawn number
// that didn't match, to animate the "almost" moment.

export function computeNearMisses(playerNumbers, drawnNumbers) {
  const matched = playerNumbers.filter(n => drawnNumbers.includes(n));
  const unmatched = playerNumbers.filter(n => !drawnNumbers.includes(n));
  const unusedDrawn = drawnNumbers.filter(n => !playerNumbers.includes(n));

  const nearMisses = unmatched.map(playerNum => {
    // Find closest unused drawn number
    let closest = unusedDrawn[0];
    let minDiff = Infinity;
    unusedDrawn.forEach(d => {
      const diff = Math.abs(d - playerNum);
      if (diff < minDiff) { minDiff = diff; closest = d; }
    });
    return {
      playerNumber: playerNum,
      drawnNumber: closest,
      distance: Math.abs(closest - playerNum),
      // How "close" to show in animation: distance 1-3 = very close, 4-8 = close, 9+ = miss
      proximity: Math.abs(closest - playerNum) <= 3 ? 'very_close'
               : Math.abs(closest - playerNum) <= 8 ? 'close'
               : 'miss',
    };
  });

  return { matched, unmatched, nearMisses };
}

// ── Score a draw ─────────────────────────────────────────────
// Returns matchCount, entries earned, and result tier.

export function scoreDraw(playerNumbers, drawnNumbers, streakCount, multiplier) {
  const matched = playerNumbers.filter(n => drawnNumbers.includes(n));
  const matchCount = matched.length;

  // Base entries per match count
  const baseEntries = [0, 1, 3, 10, 20, 50, 200][matchCount] ?? 0;
  const entries = Math.round(baseEntries * multiplier);

  return {
    playerNumbers: [...playerNumbers],
    drawn: [...drawnNumbers],
    matched,
    matchCount,
    baseEntries,
    entries,
    multiplier,
    isWin: matchCount >= CONFIG.STREAK_WIN_THRESHOLD,
    tier: _tier(matchCount),
  };
}

function _tier(matchCount) {
  if (matchCount >= 4) return 'blazes';   // 🌟 THE ORACLE BLAZES
  if (matchCount === 3) return 'triple';  // ✨ TRIPLE MATCH
  if (matchCount === 2) return 'building';// 🔥 BUILDING MOMENTUM
  return 'gathering';                     // gathering strength
}

// ── Adaptive draw (used for draws beyond BOOSTED_DRAWS) ──────
// Replaces normalDraw() with behavior-aware boost odds.
// boostOdds — probability (0–1) of triggering a 3-match near-miss,
//             sourced from adapt.js getAdaptiveBoostOdds().
// When boosted, always produces exactly 3 matches — enough to
// keep engagement without giving away real prizes.

export function adaptiveDraw(playerNumbers, boostOdds) {
  if (!boostOdds || boostOdds <= 0) return normalDraw();
  const shouldBoost = secureRandom() < boostOdds;
  if (!shouldBoost) return normalDraw();
  return _constructBoostedDraw(playerNumbers, 3);
}

// ── Oracle number pick ───────────────────────────────────────
// Generates 6 numbers "from the Oracle" — pure random for Phase 1.
// Phase 2 will weight by Soul Profile.

export function oraclePick(soulProfile = null) {
  if (soulProfile && soulProfile.weightedNumbers) {
    return _weightedPick(soulProfile.weightedNumbers);
  }
  return normalDraw();
}

function _weightedPick(weightedNumbers) {
  // weightedNumbers: [{ number, weight }, ...]
  const total = weightedNumbers.reduce((s, w) => s + w.weight, 0);
  const picked = [];
  const pool = [...weightedNumbers];

  while (picked.length < CONFIG.DRAW_PICK_COUNT && pool.length > 0) {
    let rand = secureRandom() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      rand -= pool[i].weight;
      if (rand <= 0) { idx = i; break; }
    }
    picked.push(pool[idx].number);
    pool.splice(idx, 1);
  }

  return picked.sort((a, b) => a - b);
}

// ── Weighted choice helper ────────────────────────────────────
function _weightedChoice(weights, minIndex = 0) {
  const validWeights = weights.slice(minIndex);
  const total = validWeights.reduce((s, w) => s + w, 0);
  let rand = secureRandom() * total;
  for (let i = 0; i < validWeights.length; i++) {
    rand -= validWeights[i];
    if (rand <= 0) return i + minIndex;
  }
  return minIndex;
}
