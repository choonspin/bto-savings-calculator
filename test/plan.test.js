import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addMonths, formatMonth, monthsBetween } from '../src/months.js';
import { examplePlan, normalizePlan, possessive } from '../src/plan.js';

const TODAY = '2026-11';

test('month keys count across years', () => {
  assert.equal(addMonths('2026-11', 3), '2027-02');
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.equal(monthsBetween('2026-11', '2029-11'), 36);
  assert.equal(monthsBetween('2026-11', '2026-07'), -4);
  assert.equal(formatMonth('2027-02'), 'Feb 2027');
});

test('names read naturally as owners', () => {
  assert.equal(possessive('Me'), 'My');
  assert.equal(possessive('her'), 'Her');
  assert.equal(possessive('Wei'), "Wei's");
});

test('an empty or broken plan falls back to the example', () => {
  assert.deepEqual(normalizePlan(null, TODAY), examplePlan(TODAY));
  assert.deepEqual(normalizePlan('not a plan', TODAY), examplePlan(TODAY));
});

test('bad values are replaced and good ones kept', () => {
  const plan = normalizePlan({
    couple: false,
    people: [{ name: 'Wei', gross: -5, saving: '2000', startsWork: '2027-13' }],
    flat: { price: 480_000, keys: '2030-01' },
  }, TODAY);

  assert.equal(plan.couple, false);
  assert.equal(plan.people[0].name, 'Wei');
  assert.equal(plan.people[0].gross, 4_500);
  assert.equal(plan.people[0].saving, 2_000);
  assert.equal(plan.people[0].startsWork, TODAY);
  assert.equal(plan.people[0].color, 'pink');
  assert.equal(plan.people[1].name, 'Partner');
  assert.equal(plan.people[1].color, 'blue');
  assert.equal(plan.flat.price, 480_000);
  assert.equal(plan.flat.keys, '2030-01');
});

test('a person keeps a colour from the list and falls back otherwise', () => {
  const plan = normalizePlan({ people: [{ color: 'lilac' }, { color: 'neon' }] }, TODAY);
  assert.equal(plan.people[0].color, 'lilac');
  assert.equal(plan.people[1].color, 'blue');
});

test('only well-formed trips are kept', () => {
  const plan = normalizePlan({
    trips: [
      { id: 'a', name: 'Taipei', month: '2027-03', budget: 1800 },
      { name: '', month: '2027-04', budget: 100 },
      { name: 'Nowhere', month: 'soon', budget: 100 },
      { name: 'Seoul', month: '2028-04' },
    ],
  }, TODAY);

  assert.equal(plan.trips.length, 2);
  assert.deepEqual(plan.trips[0], { id: 'a', name: 'Taipei', month: '2027-03', budget: 1800 });
  assert.equal(plan.trips[1].budget, 0);
  assert.match(plan.trips[1].id, /^trip-/);
});
