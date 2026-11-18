// A small calendar for picking a month: one year at a time, twelve months in a grid.
//
// Markup: <div class="month-field" data-months="any|future">
//           <input type="hidden" ...>  holds the 'YYYY-MM' value and fires `input` on change
//           <button class="month-button">  shows the month and opens the calendar
//         </div>

import { addMonths, formatMonth, monthsBetween } from '../months.js';

const RANGES = {
  any: [-120, 120], // starting work or a trip can be in the past
  future: [1, 120], // key collection is always ahead
};
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let today = null;
let popover = null;
let open = null; // { field, year }

export function setUpMonthPickers(currentMonth) {
  today = currentMonth;
  popover = createPopover();

  for (const field of document.querySelectorAll('.month-field')) {
    const [from, to] = RANGES[field.dataset.months];
    field.dataset.min = addMonths(today, from);
    field.dataset.max = addMonths(today, to);
    buttonOf(field).addEventListener('click', () => (open?.field === field ? close() : show(field)));
  }

  document.addEventListener('pointerdown', (event) => {
    if (open && !popover.contains(event.target) && !open.field.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (open && event.key === 'Escape') close({ focusButton: true });
  });
  // Phones resize the window as the address bar slides away, so follow the button rather than close
  window.addEventListener('resize', () => { if (open) placePopover(); });
}

/** Updates every button's label from its input; call after setting inputs from code. */
export function refreshMonthPickers() {
  for (const field of document.querySelectorAll('.month-field')) {
    const { value } = inputOf(field);
    buttonOf(field).textContent = value ? formatMonth(value) : 'Choose a month';
  }
}

function show(field) {
  const value = inputOf(field).value || today;
  open = { field, year: Number(value.slice(0, 4)) };
  popover.hidden = false;
  drawPopover();
  placePopover();
  (popover.querySelector('.is-selected') ?? popover.querySelector('.month-cell:not(:disabled)'))?.focus();
}

function close({ focusButton = false } = {}) {
  if (!open) return;
  if (focusButton) buttonOf(open.field).focus();
  popover.hidden = true;
  open = null;
}

function choose(key) {
  const input = inputOf(open.field);
  input.value = key;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  refreshMonthPickers();
  close({ focusButton: true });
}

function createPopover() {
  const element = document.createElement('div');
  element.className = 'month-popover';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Choose a month');
  element.hidden = true;
  element.innerHTML = `
    <div class="month-popover-head">
      <button type="button" class="month-nav" data-step="-1" aria-label="Previous year">&lsaquo;</button>
      <span class="month-year"></span>
      <button type="button" class="month-nav" data-step="1" aria-label="Next year">&rsaquo;</button>
    </div>
    <div class="month-grid"></div>`;

  element.addEventListener('click', (event) => {
    const nav = event.target.closest('.month-nav');
    if (nav) {
      open.year += Number(nav.dataset.step);
      drawPopover();
      return;
    }
    const cell = event.target.closest('.month-cell');
    if (cell) choose(cell.dataset.month);
  });

  document.body.append(element);
  return element;
}

function drawPopover() {
  const { field, year } = open;
  const { min, max } = field.dataset;
  const selected = inputOf(field).value;

  popover.querySelector('.month-year').textContent = year;
  popover.querySelector('[data-step="-1"]').disabled = year <= Number(min.slice(0, 4));
  popover.querySelector('[data-step="1"]').disabled = year >= Number(max.slice(0, 4));
  popover.querySelector('.month-grid').innerHTML = MONTH_NAMES.map((name, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const classes = ['month-cell'];
    if (key === selected) classes.push('is-selected');
    if (key === today) classes.push('is-today');
    const outOfRange = monthsBetween(min, key) < 0 || monthsBetween(key, max) < 0;
    const current = key === selected ? ' aria-current="date"' : '';
    return `<button type="button" class="${classes.join(' ')}" data-month="${key}"${outOfRange ? ' disabled' : ''}${current}>${name}</button>`;
  }).join('');
}

// Below the button, kept inside the window
function placePopover() {
  const button = buttonOf(open.field).getBoundingClientRect();
  const width = popover.offsetWidth;
  const left = Math.min(Math.max(16, button.left), window.innerWidth - width - 16);
  popover.style.left = `${left + window.scrollX}px`;
  popover.style.top = `${button.bottom + window.scrollY + 8}px`;
}

function inputOf(field) {
  return field.querySelector('input');
}

function buttonOf(field) {
  return field.querySelector('.month-button');
}
