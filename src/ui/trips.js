// Each trip is a boarding pass with an editable budget and a stub saying whether it's affordable.

import { formatSGD } from '../format.js';
import { formatMonth } from '../months.js';
import { byId, escapeHTML } from './dom.js';

/** Redraws the passes; call when trips are added, removed or replaced. */
export function renderPasses(trips) {
  const sorted = [...trips].sort((a, b) => a.month.localeCompare(b.month));
  byId('trips-empty').hidden = sorted.length > 0;
  byId('passes').innerHTML = sorted.map(passHTML).join('');

  // Line the ticket notches up with the perforation
  for (const pass of byId('passes').children) {
    pass.style.setProperty('--stub-w', `${pass.querySelector('.pass-stub').offsetWidth}px`);
  }
}

/** Updates each pass's tag from the projection without redrawing, so typing isn't interrupted. */
export function updatePassTags(projectedTrips) {
  for (const trip of projectedTrips) {
    const pass = byId('passes').querySelector(`[data-trip-id="${CSS.escape(trip.id)}"]`);
    if (!pass) continue;
    const tag = pass.querySelector('.tag');
    pass.classList.toggle('pass--off', trip.status !== 'counted');
    if (trip.status === 'past') {
      setTag(tag, 'off', 'Already paid for');
    } else if (trip.status === 'after-keys') {
      setTag(tag, 'off', 'After keys');
    } else if (trip.shortBy > 0) {
      setTag(tag, 'bad', `${formatSGD(trip.shortBy)} short`);
    } else {
      setTag(tag, 'good', 'Saved up');
    }
  }
}

function setTag(tag, tone, text) {
  tag.className = `tag tag--${tone}`;
  tag.textContent = text;
}

function passHTML(trip) {
  const name = escapeHTML(trip.name);
  return `<li class="pass" data-trip-id="${escapeHTML(trip.id)}">
    <div class="pass-main">
      <span class="pass-route">SIN <svg aria-hidden="true"><use href="#plane"></use></svg> ${escapeHTML(trip.name.slice(0, 3).toUpperCase())}</span>
      <span class="pass-name">${name}</span>
      <span class="pass-month">${formatMonth(trip.month)}</span>
      <label class="pass-budget"><span>S$</span><input type="number" min="0" step="100" inputmode="numeric" value="${trip.budget}" aria-label="Budget for ${name}"></label>
    </div>
    <div class="pass-stub">
      <button type="button" class="pass-remove" aria-label="Remove ${name}">&times;</button>
      <span class="tag"></span>
    </div>
  </li>`;
}
