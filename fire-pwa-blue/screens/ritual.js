// ─────────────────────────────────────────────────────────────
// FIRE PWA — Screen: Ritual
// 7-question Oracle ritual. One card per question.
// Cards slide in from the right, exit to the left.
// Answers build the Soul Profile. Triggers on draw 3.
// ─────────────────────────────────────────────────────────────

import { registerScreen, goto } from '../core/router.js';
import { getState, updateState } from '../core/state.js';
import { buildSoulProfile } from '../engine/oracle.js';
import { haptic } from '../core/device.js';
import { CONFIG } from '../config.js';
import {
  evt_ritualStarted,
  evt_ritualQuestionAnswered,
  evt_ritualCompleted,
} from '../core/analytics.js';

// ── Question definitions ──────────────────────────────────────

const QUESTIONS = [
  {
    id: 'dob',
    oracle: 'When did you enter this world?',
    type: 'dob',
  },
  {
    id: 'name',
    oracle: 'What name carries your spirit?',
    type: 'text',
    placeholder: 'Your first name...',
    skippable: false,
  },
  {
    id: 'location',
    oracle: 'Where does your soul rest?',
    type: 'tiles',
    options: [
      { value: 'americas', icon: '🌎', label: 'Americas' },
      { value: 'europe',   icon: '🌍', label: 'Europe'   },
      { value: 'asia',     icon: '🌏', label: 'Asia & Pacific' },
      { value: 'other',    icon: '✦',  label: 'Everywhere' },
    ],
  },
  {
    id: 'element',
    oracle: 'Choose your element.',
    type: 'tiles',
    options: [
      { value: 'fire',  icon: '🔥', label: 'Fire'  },
      { value: 'water', icon: '💧', label: 'Water' },
      { value: 'earth', icon: '🌿', label: 'Earth' },
      { value: 'air',   icon: '💨', label: 'Air'   },
    ],
  },
  {
    id: 'colour',
    oracle: 'The colour that ignites you.',
    type: 'colours',
    options: [
      { value: 'red',    colour: '#C41E3A', label: 'Crimson' },
      { value: 'orange', colour: '#E05A1D', label: 'Ember'   },
      { value: 'yellow', colour: '#E8C84A', label: 'Dawn'    },
      { value: 'green',  colour: '#2E8B57', label: 'Forest'  },
      { value: 'blue',   colour: '#1E5F8C', label: 'Depths'  },
      { value: 'purple', colour: '#6A0DAD', label: 'Dusk'    },
      { value: 'pink',   colour: '#E75480', label: 'Flame'   },
      { value: 'gold',   colour: '#D4A843', label: 'Gold'    },
    ],
  },
  {
    id: 'soulNumber',
    oracle: 'Close your eyes.\nWhat number appears?',
    type: 'stepper',
    min: 1,
    max: CONFIG.DRAW_POOL_SIZE,
    default: 7,
  },
  {
    id: 'tribe',
    oracle: 'Your tribe?',
    type: 'text',
    placeholder: 'Your sports team...',
    hint: 'Sports team, nation, or crew',
    skippable: true,
  },
];

// ── Module state ─────────────────────────────────────────────

let _answers = {};
let _step = 0;
let _container = null;
let _dotsEl = null;
let _activeCard = null;
let _stepperVal = 7;
let _holdTimer = null;

// ── Init ─────────────────────────────────────────────────────

export function initRitual() {
  const el = document.getElementById('screen-ritual');

  // Top bar: close + progress dots
  const topBar = document.createElement('div');
  topBar.className = 'ritual__top-bar';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ritual__close-btn';
  closeBtn.innerHTML = '✕';
  closeBtn.setAttribute('aria-label', 'Close ritual');
  closeBtn.addEventListener('click', () => {
    haptic.light();
    goto('first-reveal');
  });

  _dotsEl = document.createElement('div');
  _dotsEl.className = 'ritual__progress-dots';

  topBar.appendChild(closeBtn);
  topBar.appendChild(_dotsEl);
  el.appendChild(topBar);

  // Card container
  _container = document.createElement('div');
  _container.className = 'ritual__card-container';
  el.appendChild(_container);

  registerScreen({
    id: 'ritual',
    el,
    onEnter() {
      // Clear any leftover cards from previous visit or mid-transition exit
      _container.innerHTML = '';
      _activeCard = null;
      _answers = {};
      _step = 0;
      _stepperVal = 7;
      _renderDots();
      _renderCard(_step, 'enter');
      evt_ritualStarted();
    },
    onExit() {
      // Clean up viewport listener on active card if present
      if (_activeCard && _activeCard._cleanupViewport) {
        _activeCard._cleanupViewport();
      }
      _container.innerHTML = '';
      _activeCard = null;
    },
  });
}

// ── Progress dots ─────────────────────────────────────────────

function _renderDots() {
  _dotsEl.innerHTML = '';
  QUESTIONS.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'ritual__progress-dot' +
      (i < _step ? ' ritual__progress-dot--done' : '') +
      (i === _step ? ' ritual__progress-dot--active' : '');
    _dotsEl.appendChild(dot);
  });
}

// ── Card renderer ─────────────────────────────────────────────

function _renderCard(step, direction = 'enter') {
  const q = QUESTIONS[step];
  const card = document.createElement('div');
  card.className = 'ritual-card ritual-card--' + (direction === 'enter' ? 'off-right' : 'off-left');

  // Oracle text
  const oracleText = document.createElement('div');
  oracleText.className = 'ritual__oracle-text';
  oracleText.innerHTML = q.oracle.replace('\n', '<br>');
  card.appendChild(oracleText);

  // Input area
  const inputArea = document.createElement('div');
  inputArea.className = 'ritual__input-area';
  card.appendChild(inputArea);

  // Build input by type
  switch (q.type) {
    case 'dob':     _buildDOB(inputArea, card);          break;
    case 'text':    _buildText(inputArea, card, q);       break;
    case 'tiles':   _buildTiles(inputArea, q);            break;
    case 'colours': _buildColours(inputArea, q);          break;
    case 'stepper': _buildStepper(inputArea, card, q);   break;
  }

  _container.appendChild(card);

  // Force layout then animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.classList.remove('ritual-card--off-right', 'ritual-card--off-left');
      card.classList.add('ritual-card--active');
    });
  });

  _activeCard = card;
}

// ── DOB question ──────────────────────────────────────────────

function _buildDOB(area, card) {
  const row = document.createElement('div');
  row.className = 'ritual__dob-row';

  // Day
  const daySelect = document.createElement('select');
  daySelect.className = 'ritual__select ritual__select--sm';
  daySelect.setAttribute('aria-label', 'Day');
  for (let d = 1; d <= 31; d++) {
    const o = document.createElement('option');
    o.value = d;
    o.textContent = String(d).padStart(2, '0');
    if (d === 1) o.selected = true;
    daySelect.appendChild(o);
  }

  // Month
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthSelect = document.createElement('select');
  monthSelect.className = 'ritual__select ritual__select--md';
  monthSelect.setAttribute('aria-label', 'Month');
  months.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = m;
    if (i === 0) o.selected = true;
    monthSelect.appendChild(o);
  });

  // Year
  const yearSelect = document.createElement('select');
  yearSelect.className = 'ritual__select ritual__select--md';
  yearSelect.setAttribute('aria-label', 'Year');
  const thisYear = new Date().getFullYear();
  for (let y = thisYear - 10; y >= 1940; y--) {
    const o = document.createElement('option');
    o.value = y;
    o.textContent = y;
    if (y === 1990) o.selected = true;
    yearSelect.appendChild(o);
  }

  row.appendChild(daySelect);
  row.appendChild(monthSelect);
  row.appendChild(yearSelect);
  area.appendChild(row);

  _appendContinueBtn(area, () => {
    const day   = parseInt(daySelect.value, 10);
    const month = parseInt(monthSelect.value, 10);
    const year  = parseInt(yearSelect.value, 10);
    _advance({ day, month, year });
  });
}

// ── Text question ─────────────────────────────────────────────

function _buildText(area, card, q) {
  card.classList.add('ritual-card--text');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ritual__text-input';
  input.placeholder = q.placeholder || '';
  input.maxLength = 40;
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('spellcheck', 'false');
  area.appendChild(input);

  if (q.hint) {
    const hint = document.createElement('div');
    hint.className = 'ritual__field-hint';
    hint.textContent = q.hint;
    area.appendChild(hint);
  }

  // Shift card up when keyboard appears
  const vv = window.visualViewport;
  let _onResize = null;
  if (vv) {
    _onResize = () => {
      const kb = window.innerHeight - vv.height - vv.offsetTop;
      card.style.transform = (kb > 80)
        ? `translateY(-${Math.round(kb * 0.45)}px)`
        : '';
    };
    vv.addEventListener('resize', _onResize);
    // Store cleanup on card for onExit
    card._cleanupViewport = () => vv.removeEventListener('resize', _onResize);
  }

  // Enter key submits
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); continueBtn.click(); }
  });

  const continueBtn = _appendContinueBtn(area, () => {
    const val = input.value.trim();
    if (q.id === 'name' && !val) {
      input.focus();
      input.style.borderColor = 'rgba(255,107,26,0.6)';
      setTimeout(() => { input.style.borderColor = ''; }, 1200);
      return;
    }
    if (card._cleanupViewport) card._cleanupViewport();
    _advance(val || null);
  });

  if (q.skippable) {
    const skipLink = document.createElement('div');
    skipLink.className = 'ritual__skip-link';
    skipLink.textContent = 'Skip →';
    skipLink.addEventListener('click', () => {
      haptic.light();
      if (card._cleanupViewport) card._cleanupViewport();
      _advance(null);
    });
    area.appendChild(skipLink);
  }

  // Auto-focus after card animation settles
  setTimeout(() => { try { input.focus(); } catch (_) {} }, 500);
}

// ── Tile question (location, element) ────────────────────────

function _buildTiles(area, q) {
  const grid = document.createElement('div');
  grid.className = 'ritual__tile-grid';

  q.options.forEach(opt => {
    const tile = document.createElement('button');
    tile.className = 'ritual__tile';
    tile.setAttribute('touch-action', 'manipulation');
    tile.innerHTML = `<span class="ritual__tile-icon">${opt.icon}</span><span>${opt.label}</span>`;
    tile.addEventListener('click', () => {
      haptic.medium();
      grid.querySelectorAll('.ritual__tile').forEach(t => t.classList.remove('ritual__tile--selected'));
      tile.classList.add('ritual__tile--selected');
      // Auto-advance after short visual feedback
      setTimeout(() => _advance(opt.value), 280);
    });
    grid.appendChild(tile);
  });

  area.appendChild(grid);
}

// ── Colour question ───────────────────────────────────────────

function _buildColours(area, q) {
  const grid = document.createElement('div');
  grid.className = 'ritual__colour-grid';

  q.options.forEach(opt => {
    const swatch = document.createElement('button');
    swatch.className = 'ritual__colour-swatch';
    swatch.style.background = opt.colour;
    swatch.setAttribute('aria-label', opt.label);
    swatch.setAttribute('touch-action', 'manipulation');
    swatch.addEventListener('click', () => {
      haptic.medium();
      grid.querySelectorAll('.ritual__colour-swatch').forEach(s => s.classList.remove('ritual__colour-swatch--selected'));
      swatch.classList.add('ritual__colour-swatch--selected');
      setTimeout(() => _advance(opt.value), 280);
    });
    grid.appendChild(swatch);
  });

  area.appendChild(grid);
}

// ── Stepper question (soul number) ────────────────────────────

function _buildStepper(area, card, q) {
  _stepperVal = q.default || 7;

  const hint = document.createElement('div');
  hint.className = 'ritual__stepper-hint';
  hint.textContent = `Trust your instinct · 1 – ${CONFIG.DRAW_POOL_SIZE}`;
  area.appendChild(hint);

  const stepperWrap = document.createElement('div');
  stepperWrap.className = 'ritual__stepper';

  const minusBtn = document.createElement('button');
  minusBtn.className = 'ritual__stepper-btn';
  minusBtn.textContent = '−';
  minusBtn.setAttribute('aria-label', 'Decrease');

  const valDisplay = document.createElement('div');
  valDisplay.className = 'ritual__stepper-val';
  valDisplay.textContent = _stepperVal;

  const plusBtn = document.createElement('button');
  plusBtn.className = 'ritual__stepper-btn';
  plusBtn.textContent = '+';
  plusBtn.setAttribute('aria-label', 'Increase');

  function updateVal(delta) {
    _stepperVal = Math.min(q.max, Math.max(q.min, _stepperVal + delta));
    valDisplay.textContent = _stepperVal;
    haptic.light();
  }

  function startHold(delta) {
    updateVal(delta);
    _holdTimer = setInterval(() => updateVal(delta), 120);
  }

  function endHold() {
    clearInterval(_holdTimer);
    _holdTimer = null;
  }

  minusBtn.addEventListener('pointerdown', () => startHold(-1));
  plusBtn.addEventListener('pointerdown',  () => startHold(+1));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => {
    minusBtn.addEventListener(ev, endHold);
    plusBtn.addEventListener(ev, endHold);
  });

  stepperWrap.appendChild(minusBtn);
  stepperWrap.appendChild(valDisplay);
  stepperWrap.appendChild(plusBtn);
  area.appendChild(stepperWrap);

  _appendContinueBtn(area, () => _advance(_stepperVal));
}

// ── Helpers ───────────────────────────────────────────────────

function _appendContinueBtn(area, onClick) {
  const btn = document.createElement('button');
  btn.className = 'ritual__continue-btn';
  btn.textContent = 'CONTINUE →';
  btn.addEventListener('click', () => {
    haptic.medium();
    onClick();
  });
  area.appendChild(btn);
  return btn;
}

// ── Advance to next question ──────────────────────────────────

function _advance(value) {
  const q = QUESTIONS[_step];
  _answers[q.id] = value;
  evt_ritualQuestionAnswered(_step + 1);

  if (_step >= QUESTIONS.length - 1) {
    _complete();
    return;
  }

  // Animate current card out left
  const outCard = _activeCard;
  if (outCard) {
    outCard.classList.remove('ritual-card--active');
    outCard.classList.add('ritual-card--off-left');
    outCard.addEventListener('transitionend', () => outCard.remove(), { once: true });
  }

  _step++;
  _renderDots();
  _renderCard(_step, 'enter');
}

// ── Complete ritual ───────────────────────────────────────────

function _complete() {
  // Ensure DOB has a fallback
  const dob = _answers.dob || { day: 1, month: 1, year: 1990 };
  const name = _answers.name || 'Seeker';
  const location = _answers.location || 'other';
  const element = _answers.element || 'fire';
  const colour = _answers.colour || 'gold';
  const soulNumber = _answers.soulNumber || 7;
  const tribe = _answers.tribe || '';

  const soulProfile = buildSoulProfile({ dob, name, location, element, colour, soulNumber, tribe });

  updateState({ soulProfile, ritualComplete: true });
  evt_ritualCompleted();

  goto('soul-profile');
}
