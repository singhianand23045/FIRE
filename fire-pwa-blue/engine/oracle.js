// ─────────────────────────────────────────────────────────────
// FIRE PWA — Oracle Numerology Engine
// Transforms ritual answers into a Soul Profile + weighted
// number distribution used by oraclePick() in draw.js.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from '../config.js';

// ── Zodiac ───────────────────────────────────────────────────

const ZODIAC_DATA = {
  Aries:       { symbol: '♈', lucky: [1, 9, 19, 28, 36, 45].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Taurus:      { symbol: '♉', lucky: [2, 6, 11, 29, 38, 47].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Gemini:      { symbol: '♊', lucky: [3, 5, 12, 21, 33, 51].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Cancer:      { symbol: '♋', lucky: [4, 7, 13, 24, 40, 49].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Leo:         { symbol: '♌', lucky: [1, 10, 19, 28, 46, 50].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Virgo:       { symbol: '♍', lucky: [5, 14, 23, 32, 50, 55].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Libra:       { symbol: '♎', lucky: [6, 15, 24, 33, 42, 51].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Scorpio:     { symbol: '♏', lucky: [4, 7, 13, 28, 41, 49].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Sagittarius: { symbol: '♐', lucky: [3, 9, 21, 30, 42, 54].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Capricorn:   { symbol: '♑', lucky: [8, 17, 26, 35, 44, 53].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Aquarius:    { symbol: '♒', lucky: [2, 11, 20, 29, 47, 56].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
  Pisces:      { symbol: '♓', lucky: [7, 16, 25, 34, 43, 52].filter(n => n <= CONFIG.DRAW_POOL_SIZE) },
};

function _getZodiac(day, month) {
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return 'Aries';
  if (md >= 420 && md <= 520) return 'Taurus';
  if (md >= 521 && md <= 620) return 'Gemini';
  if (md >= 621 && md <= 722) return 'Cancer';
  if (md >= 723 && md <= 822) return 'Leo';
  if (md >= 823 && md <= 922) return 'Virgo';
  if (md >= 923 && md <= 1022) return 'Libra';
  if (md >= 1023 && md <= 1121) return 'Scorpio';
  if (md >= 1122 && md <= 1221) return 'Sagittarius';
  if (md >= 120 && md <= 218) return 'Aquarius';
  if (md >= 219 && md <= 320) return 'Pisces';
  return 'Capricorn'; // Dec 22-31 and Jan 1-19
}

export function getZodiacInfo(zodiac) {
  return ZODIAC_DATA[zodiac] || ZODIAC_DATA.Aries;
}

// ── Name Numerology (Pythagorean) ────────────────────────────

const NAME_MAP = {
  a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,
  j:1,k:2,l:3,m:4,n:5,o:6,p:7,q:8,r:9,
  s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8,
};

function _nameToKey(name) {
  const clean = (name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!clean.length) return 7; // default to 7 (universal lucky)
  let sum = 0;
  for (const c of clean) sum += NAME_MAP[c] || 0;
  while (sum > 9) {
    sum = String(sum).split('').reduce((a, c) => a + parseInt(c, 10), 0);
  }
  return sum || 1;
}

// ── Element ──────────────────────────────────────────────────

const ELEMENT_NUMBERS = {
  fire:  [33, 36, 38, 40, 42, 44, 46, 48, 50, 52, 55, 57, 59].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  water: [11, 14, 16, 18, 22, 25, 28, 31, 34, 37, 40, 43, 46].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  earth: [4, 7, 11, 14, 18, 22, 25, 29, 33, 35, 38, 41].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  air:   [2, 11, 13, 20, 29, 31, 38, 47, 49, 56].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
};

export const ELEMENT_PERSONALITY = {
  fire:  { name: 'The Blazing',  desc: 'Bold. Direct. Fearless. The Oracle sees fire in your numbers.' },
  water: { name: 'The Flowing',  desc: 'Intuitive. Adaptive. The Oracle feels your tides shifting.' },
  earth: { name: 'The Grounded', desc: 'Patient. Steady. True. Your foundation draws the Oracle near.' },
  air:   { name: 'The Cosmic',   desc: 'Free. Unpredictable. Vast. Your numbers defy gravity itself.' },
};

// ── Colour ───────────────────────────────────────────────────

const COLOUR_NUMBERS = {
  red:    [1, 3, 5, 11, 13, 14, 18, 23].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  orange: [9, 10, 16, 19, 22, 24, 27, 32].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  yellow: [19, 23, 27, 28, 32, 35, 39, 43].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  green:  [26, 29, 33, 36, 40, 43, 45, 48].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  blue:   [35, 39, 42, 46, 49, 51, 53, 57].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  purple: [44, 47, 50, 53, 56, 58, 59, 41].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  pink:   [6, 9, 13, 16, 20, 23, 27, 30].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  gold:   [7, 14, 21, 28, 35, 42, 49, 56].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
};

// ── Location ─────────────────────────────────────────────────

const LOCATION_NUMBERS = {
  americas: [7, 11, 13, 17, 21, 31, 42].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  europe:   [3, 7, 13, 17, 21, 33, 42].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  asia:     [6, 8, 9, 18, 28, 38, 48].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
  other:    [7, 11, 22, 33, 44, 55].filter(n => n <= CONFIG.DRAW_POOL_SIZE),
};

// ── Tribe ────────────────────────────────────────────────────

function _tribeToNumbers(tribe) {
  if (!tribe || !tribe.trim()) return [];
  // djb2 hash
  let h = 5381;
  for (const c of tribe.toLowerCase()) {
    h = ((h << 5) + h + c.charCodeAt(0)) & 0x7FFFFFFF;
  }
  const n1 = (h % CONFIG.DRAW_POOL_SIZE) + 1;
  const n2 = ((h >> 6) % CONFIG.DRAW_POOL_SIZE) + 1;
  const n3 = ((h >> 12) % CONFIG.DRAW_POOL_SIZE) + 1;
  return [...new Set([n1, n2, n3])].filter(n => n >= 1 && n <= CONFIG.DRAW_POOL_SIZE);
}

// ── Weight builder ───────────────────────────────────────────

function _buildWeightedNumbers(profile, zodiacLucky) {
  const w = {};
  for (let i = 1; i <= CONFIG.DRAW_POOL_SIZE; i++) w[i] = 1.0;

  // 1. Zodiac (+2.0) — strongest non-soul factor
  zodiacLucky.forEach(n => { if (w[n] !== undefined) w[n] += 2.0; });

  // 2. Name harmonics (+1.5) — spread across number line
  const key = profile.nameKey;
  for (let n = key; n <= CONFIG.DRAW_POOL_SIZE; n += 9) w[n] += 1.5;

  // 3. Element (+1.0)
  (ELEMENT_NUMBERS[profile.element] || []).forEach(n => {
    if (w[n] !== undefined) w[n] += 1.0;
  });

  // 4. Colour (+0.8)
  (COLOUR_NUMBERS[profile.colour] || []).forEach(n => {
    if (w[n] !== undefined) w[n] += 0.8;
  });

  // 5. Soul number (+3.0, proximity decay ±5 range)
  const sn = profile.soulNumber;
  if (sn >= 1 && sn <= CONFIG.DRAW_POOL_SIZE) {
    w[sn] += 3.0;
    const decays = [1.5, 1.05, 0.73, 0.51, 0.36];
    decays.forEach((boost, i) => {
      const d = i + 1;
      if (sn - d >= 1)  w[sn - d] += boost;
      if (sn + d <= CONFIG.DRAW_POOL_SIZE) w[sn + d] += boost;
    });
  }

  // 6. Location (+1.0)
  (LOCATION_NUMBERS[profile.location] || LOCATION_NUMBERS.other).forEach(n => {
    if (w[n] !== undefined) w[n] += 1.0;
  });

  // 7. Tribe (+0.5)
  _tribeToNumbers(profile.tribe).forEach(n => {
    if (w[n] !== undefined) w[n] += 0.5;
  });

  return Object.entries(w).map(([num, weight]) => ({
    number: parseInt(num, 10),
    weight,
  }));
}

// ── Main export ──────────────────────────────────────────────

export function buildSoulProfile(answers) {
  const {
    dob,           // { day: int, month: int, year: int }
    name,          // string
    location,      // 'americas'|'europe'|'asia'|'other'
    element,       // 'fire'|'water'|'earth'|'air'
    colour,        // 'red'|'orange'|'yellow'|'green'|'blue'|'purple'|'pink'|'gold'
    soulNumber,    // int 1-CONFIG.DRAW_POOL_SIZE
    tribe,         // string (optional)
  } = answers;

  const zodiac   = _getZodiac(dob.day, dob.month);
  const zodiacD  = ZODIAC_DATA[zodiac];
  const nameKey  = _nameToKey(name);
  const personality = ELEMENT_PERSONALITY[element] || ELEMENT_PERSONALITY.air;
  const sn = Math.min(CONFIG.DRAW_POOL_SIZE, Math.max(1, parseInt(soulNumber, 10) || 7));

  const profile = {
    name:               name || '',
    dob,
    zodiac,
    zodiacSymbol:       zodiacD.symbol,
    element,
    colour,
    soulNumber:         sn,
    location,
    tribe:              tribe || '',
    nameKey,
    oraclePersonality:  personality.name,
    oraclePersonalityDesc: personality.desc,
    ritualAt:           Date.now(),
  };

  profile.weightedNumbers = _buildWeightedNumbers(profile, zodiacD.lucky);

  return profile;
}
