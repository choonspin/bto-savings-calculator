import { formatThousands } from './format.js';
import { addMonths, monthKey } from './months.js';
import { COLORS, examplePlan, newTripId, normalizePlan, setField } from './plan.js';
import { projectPlan } from './projection.js';
import { planFromHash, planLink } from './share-link.js';
import { browserStore, connectSharedStore } from './storage.js';
import { blockSVG, bunnySVG } from './ui/art.js';
import { renderChart, resetChart } from './ui/chart.js';
import { byId, copyText, escapeHTML, setText, showToast } from './ui/dom.js';
import { renderTimeline } from './ui/timeline.js';
import { renderPasses, updatePassTags } from './ui/trips.js';
import { refreshMonthPickers, setUpMonthPickers } from './ui/month-picker.js';
import { render, syncInputs } from './ui/view.js';

/** Settings a copy of the calculator can override in its #planner-config block. */
const DEFAULT_CONFIG = {
  title: 'BTO Savings Calculator',
  place: '', // shown before the keys date in the header, e.g. 'Tampines'
  pricePresetsLabel: 'Quick picks',
  pricePresets: [], // quick-pick prices: [{ label, price }]
  storage: 'browser', // 'browser', or 'shared' to sync through a claude.ai artifact
  storageKey: 'bto-savings-calculator',
  sharedDoc: 'plans/main',
  shareUrl: '', // the calculator links point to; defaults to this page
  allowReset: true,
};

const config = { ...DEFAULT_CONFIG, ...readConfig() };
const today = monthKey(new Date());
const browser = browserStore(config.storageKey);
let plan = normalizePlan(browser.load() ?? examplePlan(today), today);
let shared = null;

setUpPage();
replacePlan(plan);
bindEvents();
openPlanFromLink();

if (config.storage === 'shared') {
  connectSharedStore({
    path: config.sharedDoc,
    onRemotePlan: (data) => {
      const remote = normalizePlan(data, today);
      if (JSON.stringify(remote) === JSON.stringify(plan)) return;
      replacePlan(remote);
      browser.save(plan);
    },
    onStatus: (text) => setText('save-status', text),
  }).then((store) => { shared = store; });
}

/** The address of the public calculator, which both share buttons link to. */
function calculatorUrl() {
  if (config.shareUrl) return config.shareUrl;
  return /^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}` : '';
}

/**
 * Opens a plan sent as a link. If this browser already has a different plan saved,
 * asks first instead of replacing it.
 */
function openPlanFromLink() {
  const sent = planFromHash(location.hash);
  if (!sent) return;
  history.replaceState(null, '', location.pathname + location.search); // a reload keeps later edits

  const linked = normalizePlan(sent, today);
  const saved = browser.load();
  const withoutIds = (p) => JSON.stringify({ ...p, trips: p.trips.map(({ id, ...trip }) => trip) });
  if (saved && withoutIds(normalizePlan(saved, today)) !== withoutIds(linked)) {
    byId('linked-plan').hidden = false;
    byId('open-linked-plan').onclick = () => {
      byId('linked-plan').hidden = true;
      replacePlan(linked);
      browser.save(plan);
      shared?.save(plan);
      showToast('Opened their plan');
    };
    byId('keep-my-plan').onclick = () => { byId('linked-plan').hidden = true; };
    return;
  }
  replacePlan(linked);
  browser.save(plan);
  showToast('Opened the plan from your link');
}

function readConfig() {
  try {
    return JSON.parse(byId('planner-config')?.textContent || '{}');
  } catch {
    return {};
  }
}

function setUpPage() {
  document.title = config.title;
  setText('brand-name', config.title);
  setText('brand-place', config.place ? `${config.place} · ` : '');
  byId('reset').hidden = !config.allowReset;
  if (config.storage === 'shared') {
    setText('storage-note', 'This plan is shared with everyone you share this page with.');
  }

  const presets = byId('price-presets');
  if (config.pricePresets.length > 0) {
    presets.hidden = false;
    const chips = config.pricePresets.map(({ label, price }) =>
      `<button type="button" class="chip" data-price="${Number(price)}" title="${escapeHTML(label)}">${formatThousands(price)}</button>`);
    presets.innerHTML = `<span>${escapeHTML(config.pricePresetsLabel)}:</span>${chips.join('')}`;
  }

  for (const group of document.querySelectorAll('[data-swatches]')) {
    group.innerHTML = COLORS.map((color) => swatchHTML(group.dataset.swatches, color)).join('');
  }
  byId('block').innerHTML = blockSVG();
  for (const slot of document.querySelectorAll('[data-bunny]')) slot.outerHTML = bunnySVG();
  setUpMonthPickers(today);
  byId('trip-month').value = addMonths(today, 3);
  refreshMonthPickers();
}

/** Recalculates and redraws everything from the current plan. */
function update() {
  const projection = projectPlan(plan, today);
  render(plan, projection, today);
  renderTimeline(plan, projection, today);
  updatePassTags(projection.trips);
  renderChart(projection.series, projection.flat.neededAtKeys, today);
}

/** For edits made on this page: redraw, then save. */
function commit() {
  update();
  browser.save(plan);
  shared?.save(plan);
}

/** For a whole new plan (loaded, shared or reset): refresh the inputs too. */
function replacePlan(next) {
  plan = next;
  syncInputs(plan);
  renderPasses(plan.trips);
  update();
}

function bindEvents() {
  document.addEventListener('input', (event) => {
    const input = event.target.closest('[data-field]');
    if (!input) return;
    setField(plan, input.dataset.field, readInput(input));
    commit();
  });

  byId('price-presets').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-price]');
    if (!chip) return;
    plan.flat.price = Number(chip.dataset.price);
    syncInputs(plan);
    commit();
  });

  byId('trip-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = byId('trip-name').value.trim();
    const budget = Number(byId('trip-budget').value);
    if (!name || !(budget >= 0)) return;
    plan.trips.push({ id: newTripId(), name, month: byId('trip-month').value, budget });
    byId('trip-name').value = '';
    byId('trip-budget').value = '';
    renderPasses(plan.trips);
    commit();
    showToast(`Added ${name}`);
    byId('trip-name').focus();
  });

  byId('passes').addEventListener('input', (event) => {
    const trip = tripFor(event.target);
    if (!trip) return;
    trip.budget = Math.max(0, Number(event.target.value) || 0);
    commit();
  });

  byId('passes').addEventListener('click', (event) => {
    if (!event.target.closest('.pass-remove')) return;
    const trip = tripFor(event.target);
    plan.trips = plan.trips.filter((t) => t !== trip);
    renderPasses(plan.trips);
    commit();
  });

  byId('reset').addEventListener('click', () => {
    replacePlan(examplePlan(today));
    browser.save(plan);
    shared?.save(plan);
    showToast('Back to the example numbers');
  });

  byId('share').addEventListener('click', async () => {
    const url = calculatorUrl();
    if (!url) {
      showToast('Put the calculator on a website to get a link to share');
      return;
    }
    showToast(await copyText(url) ? 'Copied the link to the calculator' : "Couldn't copy. Try the button again.");
  });

  byId('send-plan').addEventListener('click', async () => {
    const url = calculatorUrl();
    if (!url) {
      showToast('Put the calculator on a website to get a link to share');
      return;
    }
    showToast(await copyText(planLink(url, plan))
      ? 'Copied a link to your plan. Anyone with it can see your numbers.'
      : "Couldn't copy. Try the button again.");
  });

  // Redraw the chart in the new colours when the theme changes
  const redraw = () => { resetChart(); update(); };
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

function swatchHTML(person, color) {
  const name = color[0].toUpperCase() + color.slice(1);
  return `<label class="swatch" data-color="${color}" title="${name}">
    <input type="radio" name="color-${person}" value="${color}" data-field="people.${person}.color">
    <span class="visually-hidden">${name}</span>
  </label>`;
}

function readInput(input) {
  if (input.type === 'checkbox') return input.checked;
  if (input.type === 'range' || input.type === 'number') return Math.max(0, Number(input.value) || 0);
  return input.value;
}

function tripFor(element) {
  const id = element.closest('.pass')?.dataset.tripId;
  return plan.trips.find((trip) => trip.id === id);
}
