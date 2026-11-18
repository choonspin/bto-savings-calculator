// "The road to your keys": a vertical list of stops on phones, a horizontal line on wider screens.

import { formatSGD } from '../format.js';
import { addMonths, formatMonth } from '../months.js';
import { displayName, possessive } from '../plan.js';
import { HORIZON_MONTHS } from '../projection.js';
import { bunnySVG } from './art.js';
import { byId, escapeHTML } from './dom.js';

const WIDE = window.matchMedia('(min-width: 760px)');
const ROW_HEIGHT = 40;
const LABEL_HEIGHT = 34;
const LABEL_GAP = 12;
const PIN_WIDTH = 24;

// Labels people look for first get the rows nearest the line
const LABEL_PRIORITY = ['today', 'keys', 'start'];

let lastDrawn = null;
let walkStarted = false;

export function renderTimeline(plan, projection, today) {
  lastDrawn = [plan, projection, today];
  const { keysMonth, readyMonth } = projection;
  const fundedLate = readyMonth === null || readyMonth > keysMonth;
  const fundedMonth = readyMonth ?? keysMonth + 12;

  // A fixed stretch past keys, so moving a slider only moves the "Fully funded" stop
  const end = keysMonth + Math.max(6, Math.round(keysMonth * 0.2));
  const position = (month) => Math.min(100, Math.max(0, (month / end) * 100));
  const bunnies = projection.savers.map((saver) => plan.people[saver.index].color);

  const stops = [
    { month: 0, kind: 'today', name: 'Today', date: formatMonth(today), below: true },
    ...projection.savers
      .filter((saver) => saver.start > 0)
      .map((saver) => ({
        month: saver.start,
        kind: 'start',
        name: `${possessive(displayName(saver.name, saver.index))} first pay`,
        date: formatMonth(addMonths(today, saver.start)),
      })),
    { month: keysMonth, kind: 'keys', name: 'Key collection', date: formatMonth(plan.flat.keys), below: true },
    {
      month: fundedMonth,
      kind: fundedLate ? 'late' : 'funded',
      name: 'Fully funded',
      date: readyMonth === null ? `after ${formatMonth(addMonths(today, HORIZON_MONTHS))}` : formatMonth(addMonths(today, readyMonth)),
    },
    ...projection.trips
      .filter((trip) => trip.status === 'counted')
      .map((trip) => ({
        month: trip.offset + 0.5,
        kind: 'trip',
        name: trip.name,
        date: `${formatMonth(trip.month)} · ${formatSGD(trip.budget)}`,
      })),
  ].sort((a, b) => a.month - b.month);

  byId('stops').innerHTML = stops.map((stop) => stopHTML(stop, position(stop.month), bunnies)).join('');
  byId('timeline-run').style.width = `${position(keysMonth)}%`;
  const late = byId('timeline-late');
  late.style.left = `${position(keysMonth)}%`;
  late.style.width = fundedLate ? `${position(fundedMonth) - position(keysMonth)}%` : '0%';

  walkTo(position(keysMonth), bunnies);
  layOutLabels(position(keysMonth));
}

function stopHTML(stop, position, bunnies) {
  const classes = ['stop', `stop--${stop.kind}`];
  if (stop.below) classes.push('stop--below');
  const isTrip = stop.kind === 'trip';
  const pin = isTrip ? '<svg aria-hidden="true"><use href="#plane"></use></svg>' : '';
  const waiting = stop.kind === 'keys'
    ? `<span class="stop-bunnies" aria-hidden="true">${bunnies.map((color) => bunnySVG(color)).join('')}</span>`
    : '';
  return `<li class="${classes.join(' ')}" style="--pos: ${position}%"${isTrip ? ' tabindex="0"' : ''}>
    <span class="stop-dot">${pin}</span>${waiting}
    <span class="stop-label"><span class="stop-name">${escapeHTML(stop.name)}</span><span class="stop-date">${stop.date}</span></span>
  </li>`;
}

// The first time the road is drawn, the bunnies walk from today to key collection
function walkTo(position, bunnies) {
  const walkers = byId('walkers');
  if (walkers.dataset.colors !== bunnies.join()) {
    walkers.dataset.colors = bunnies.join();
    walkers.innerHTML = bunnies.map((color) => bunnySVG(color)).join('');
  }
  if (walkStarted) {
    walkers.style.setProperty('--pos', `${position}%`);
    return;
  }
  walkStarted = true;
  const timeline = byId('timeline');
  timeline.classList.add('is-walking');
  walkers.classList.add('walk-in');
  walkers.getBoundingClientRect(); // lay out at the start of the road before moving
  walkers.style.setProperty('--pos', `${position}%`);
  setTimeout(() => {
    timeline.classList.remove('is-walking');
    walkers.classList.remove('walk-in');
  }, 3200);
}

/**
 * On wide screens, puts each label in the first row above or below the line where it clears
 * its neighbours and the bunnies. Trips get their own lane under the line; pins that would
 * touch merge into one, whose tooltip lists every trip.
 */
function layOutLabels(walkerPosition) {
  const timeline = byId('timeline');
  if (!WIDE.matches) {
    timeline.style.height = '';
    return;
  }

  const width = timeline.clientWidth;
  const xOf = (stop) => (parseFloat(stop.style.getPropertyValue('--pos')) / 100) * width;
  const rows = { above: [[], []], below: [[], []] };
  const fits = (row, from, to) => row.every(([start, end]) => to + LABEL_GAP <= start || from >= end + LABEL_GAP);

  const walkerX = (walkerPosition / 100) * width;
  rows.above[0].push([walkerX - 40, walkerX + 40]);

  const priority = (stop) => {
    const rank = LABEL_PRIORITY.findIndex((kind) => stop.classList.contains(`stop--${kind}`));
    return rank === -1 ? LABEL_PRIORITY.length : rank;
  };
  const labelled = [...byId('stops').querySelectorAll('.stop:not(.stop--trip)')].sort((a, b) => priority(a) - priority(b));

  const placed = labelled.map((stop) => {
    const label = stop.querySelector('.stop-label');
    const x = xOf(stop);
    const labelWidth = label.offsetWidth;
    const centred = x - labelWidth / 2;
    const left = Math.min(Math.max(0, centred), Math.max(0, width - labelWidth));
    const preferred = stop.classList.contains('stop--below') ? 'below' : 'above';
    const other = preferred === 'above' ? 'below' : 'above';
    const choices = [[preferred, 0], [other, 0], [preferred, 1], [other, 1]];
    const [side, row] = choices.find(([s, r]) => fits(rows[s][r], left, left + labelWidth)) ?? choices[0];
    rows[side][row].push([left, left + labelWidth]);
    const align = left > centred ? 'left' : left < centred ? 'right' : 'center';
    return { label, side, row, offset: left - x, align };
  });

  let lastPin = null;
  for (const stop of byId('stops').querySelectorAll('.stop--trip')) {
    const x = xOf(stop);
    if (lastPin && x - lastPin.x < PIN_WIDTH) {
      stop.hidden = true;
      lastPin.label.append(...stop.querySelector('.stop-label').cloneNode(true).childNodes);
      continue;
    }
    lastPin = { x, label: stop.querySelector('.stop-label') };
  }

  // Two rows above, the trip lane and one row below are always reserved, so the box keeps
  // its height while a slider moves labels between rows
  const belowRows = rows.below[1].length ? 2 : 1;
  const lineY = 14 + LABEL_HEIGHT + ROW_HEIGHT + 6;
  const belowTop = lineY + 44;
  const height = belowTop + (belowRows - 1) * ROW_HEIGHT + LABEL_HEIGHT + 4;
  timeline.style.height = `${height}px`;
  timeline.style.setProperty('--line-y', `${lineY}px`);

  for (const { label, side, row, offset, align } of placed) {
    label.style.left = `${offset}px`;
    label.style.textAlign = align;
    if (side === 'above') {
      label.style.top = 'auto';
      label.style.bottom = `${height - (lineY - 14 - row * ROW_HEIGHT)}px`;
    } else {
      label.style.bottom = 'auto';
      label.style.top = `${belowTop + row * ROW_HEIGHT}px`;
    }
  }
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (lastDrawn) renderTimeline(...lastDrawn);
  }, 150);
});
