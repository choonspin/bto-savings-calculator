// Writes a projection into the page: the hero, each person's card, the bill and key collection day.

import { formatPercent, formatSGD, plural } from '../format.js';
import { addMonths, formatMonth } from '../months.js';
import { displayName, getField, possessive } from '../plan.js';
import { HORIZON_MONTHS } from '../projection.js';
import { HDB_LOAN } from '../rules.js';
import { BLOCK_WINDOWS } from './art.js';
import { byId, setText } from './dom.js';
import { refreshMonthPickers } from './month-picker.js';

const STATUS = {
  'on-track': { tone: 'good', label: 'On track!' },
  behind: { tone: 'warn', label: 'Not quite yet' },
  'out-of-reach': { tone: 'bad', label: 'Out of reach' },
};

/** Puts the plan's values into every input that edits it. */
export function syncInputs(plan) {
  for (const input of document.querySelectorAll('[data-field]')) {
    const value = getField(plan, input.dataset.field);
    if (input.type === 'checkbox') input.checked = value;
    else if (input.type === 'radio') input.checked = input.value === value;
    else input.value = value;
  }
  refreshMonthPickers();
}

export function render(plan, projection, today) {
  renderFieldValues(plan);
  renderPeople(plan, projection);
  renderHero(plan, projection);
  renderBlock(projection);
  renderRoadCaption(projection, today);
  renderBill(plan, projection);
  renderKeysDay(plan, projection);
  setText('trips-total', `${formatSGD(projection.tripsTotal)} across ${plural(projection.tripsCounted, 'trip')} before keys`);
  setText('brand-keys', formatMonth(plan.flat.keys));
}

function renderFieldValues(plan) {
  for (const output of document.querySelectorAll('output[data-for]')) {
    output.textContent = formatSGD(getField(plan, output.dataset.for)) + (output.dataset.suffix ?? '');
  }
  for (const range of document.querySelectorAll('input[type="range"]')) {
    const filled = ((range.value - range.min) / (range.max - range.min)) * 100;
    range.style.setProperty('--fill', `${filled}%`);
  }
}

function renderPeople(plan, projection) {
  for (const element of document.querySelectorAll('[data-color-of]')) {
    element.dataset.color = plan.people[element.dataset.colorOf].color;
  }
  byId('card-1').hidden = !plan.couple;
  byId('cards').classList.toggle('is-single', !plan.couple);
  for (const saver of projection.savers) {
    setText(`person-${saver.index}-take-home`, formatSGD(saver.takeHome));
    setText(`person-${saver.index}-oa`, `+${formatSGD(saver.ordinaryAccount)}`);
    setText(`person-${saver.index}-spend`, formatSGD(saver.spendLeft));
  }
}

function renderHero(plan, projection) {
  const { required, status, currentSaving, takeHome } = projection;
  const reachable = Number.isFinite(required.monthly);

  setText('hero-keys', formatMonth(plan.flat.keys));
  setText('required-total', reachable ? formatSGD(required.monthly) : 'More than you earn');
  setText('required-unit', !reachable ? '' : plan.couple ? 'a month, together' : 'a month');

  const pill = byId('status-pill');
  pill.className = `sticker sticker--${STATUS[status].tone}`;
  pill.textContent = STATUS[status].label;

  const rent = plan.flat.rent > 0 ? ` That includes ${formatSGD(plan.flat.rent)} rent.` : '';
  setText('status-text', {
    'on-track': `You save ${formatSGD(currentSaving)} a month now, ${formatSGD(-required.gap)} more than you need.${rent}`,
    behind: `You save ${formatSGD(currentSaving)} a month now, which is ${formatPercent(required.pace)} of what you need.${rent}`,
    'out-of-reach': `That's more than the ${formatSGD(takeHome)} take-home pay coming in. Pick a later key collection month, or trim the reno and trips.`,
  }[status]);

  byId('share-1').hidden = !plan.couple;
  byId('hero-shares').classList.toggle('is-single', !plan.couple);
  projection.savers.forEach((saver, i) => {
    const card = byId(`share-${saver.index}`);
    const share = required.shares[i];
    card.querySelector('.share-who').textContent = `${possessive(displayName(saver.name, saver.index))} share`;
    card.querySelector('.share-amount').textContent = formatSGD(share);
    card.querySelector('.share-sub').textContent = shareDetail(saver, share);
  });
}

function shareDetail(saver, share) {
  if (saver.takeHome <= 0) return 'Not earning yet';
  const change = Math.round(share - saver.saving);
  const versusNow = change === 0 ? 'same as now' : `${change > 0 ? '+' : '-'}${formatSGD(Math.abs(change))} vs now`;
  return `${formatPercent(share / saver.takeHome)} of take-home · ${versusNow}`;
}

function renderBlock({ fundedFraction }) {
  // Only light the last window when everything is covered
  const lit = fundedFraction >= 1 ? BLOCK_WINDOWS : Math.min(BLOCK_WINDOWS - 1, Math.round(fundedFraction * BLOCK_WINDOWS));
  byId('block').querySelectorAll('.win').forEach((win, i) => win.classList.toggle('on', i < lit));
  setText('block-caption', lit === BLOCK_WINDOWS
    ? `All ${BLOCK_WINDOWS} windows lit: by keys you'll have everything you need.`
    : `${lit} of ${BLOCK_WINDOWS} windows lit: by keys you'll have ${formatPercent(fundedFraction)} of what you need.`);
}

function renderRoadCaption({ readyMonth, keysMonth }, today) {
  const when = readyMonth === null ? null : formatMonth(addMonths(today, readyMonth));
  let caption;
  if (readyMonth === null) caption = `At today's pace you aren't fully funded before ${formatMonth(addMonths(today, HORIZON_MONTHS))}.`;
  else if (readyMonth > keysMonth) caption = `At today's pace you're fully funded in ${when}, ${plural(readyMonth - keysMonth, 'month')} after keys.`;
  else if (readyMonth < keysMonth) caption = `At today's pace you're fully funded in ${when}, ${plural(keysMonth - readyMonth, 'month')} before keys.`;
  else caption = `At today's pace you're fully funded right at key collection.`;
  setText('road-caption', caption);
}

function renderBill(plan, { flat, keysDay, tripsTotal, monthlyOA }) {
  setText('receipt-sub', `${formatSGD(flat.price)} after grants`);
  setText('bill-downpayment', formatSGD(flat.downpayment));
  setText('bill-at-signing', formatSGD(flat.atSigning));
  setText('bill-at-keys', formatSGD(flat.atKeys));
  setText('bill-stamp-duty', formatSGD(flat.stampDuty));
  setText('bill-cpf', formatSGD(keysDay.cpfPays));
  setText('bill-cash', formatSGD(keysDay.cashTopUp));
  setText('bill-reno', formatSGD(plan.flat.reno));
  setText('bill-cash-needed', formatSGD(keysDay.cashNeeded));
  setText('bill-trips', formatSGD(tripsTotal));
  setText('bill-loan', formatSGD(flat.loan));
  setText('bill-instalment', formatSGD(flat.instalment));

  const oaCoversLoan = monthlyOA >= flat.instalment;
  const withinLimit = flat.servicingRatio <= HDB_LOAN.servicingRatioLimit;
  setTone('bill-oa-monthly', formatSGD(monthlyOA), oaCoversLoan);
  setTone('bill-servicing-ratio', Number.isFinite(flat.servicingRatio) ? formatPercent(flat.servicingRatio) : 'No income yet', withinLimit);

  const notes = [oaCoversLoan
    ? 'CPF OA covers the monthly loan, so no cash needed.'
    : `CPF OA is ${formatSGD(flat.instalment - monthlyOA)} short of the loan each month, paid in cash.`];
  if (!withinLimit) notes.push("Above HDB's 30% limit, so the loan would be smaller.");
  setText('bill-note', notes.join(' '));
}

function renderKeysDay(plan, { flat, keysDay, required, tripsTotal }) {
  const headline = byId('verdict-headline');
  if (keysDay.surplus >= 0) {
    headline.className = 'verdict-headline verdict-headline--good';
    headline.textContent = `${formatSGD(keysDay.surplus)} to spare`;
    setText('verdict-detail', `${formatSGD(keysDay.cash)} in cash covers the ${formatSGD(keysDay.cashTopUp)} downpayment top-up and ${formatSGD(plan.flat.reno)} for reno, after ${formatSGD(tripsTotal)} of trips along the way.`);
  } else {
    headline.className = 'verdict-headline verdict-headline--warn';
    headline.textContent = `${formatSGD(-keysDay.surplus)} short`;
    const closeTheGap = Number.isFinite(required.monthly) && required.gap > 0
      ? ` Saving ${formatSGD(required.gap)} more a month closes the gap.`
      : '';
    setText('verdict-detail', `CPF OA covers ${formatSGD(keysDay.cpfPays)} of the ${formatSGD(flat.upfront)} downpayment and stamp duty. Cash has to cover the rest plus reno: ${formatSGD(keysDay.cashNeeded)} in all.${closeTheGap}`);
  }

  setText('stat-total', formatSGD(keysDay.oa + keysDay.cash));
  setText('stat-needed', formatSGD(flat.neededAtKeys));
  setText('stat-oa', formatSGD(keysDay.oa));
  setText('stat-oa-sub', `of ${formatSGD(flat.upfront)} upfront`);
  setText('stat-cash', formatSGD(keysDay.cash));
  setText('stat-cash-sub', `Needs ${formatSGD(keysDay.cashNeeded)}`);
}

function setTone(id, text, good) {
  const element = byId(id);
  element.textContent = text;
  element.className = good ? 'tone--good' : 'tone--bad';
}
