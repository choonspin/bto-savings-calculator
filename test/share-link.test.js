import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examplePlan, normalizePlan } from '../src/plan.js';
import { planFromHash, planLink } from '../src/share-link.js';

const TODAY = '2026-11';
const BASE = 'https://example.com/calculator/';

test('a plan survives the trip through a link', () => {
  const plan = normalizePlan({
    ...examplePlan(TODAY),
    people: [{ name: 'Jia Hui 佳慧', color: 'lilac' }, { name: 'Wei', color: 'peach' }],
    trips: [{ id: 'a', name: 'Kyōto', month: '2027-04', budget: 3200 }],
  }, TODAY);

  const link = planLink(BASE, plan);
  const opened = normalizePlan(planFromHash(new URL(link).hash), TODAY);

  assert.match(link, /^https:\/\/example\.com\/calculator\/#plan=1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(opened.people, plan.people);
  assert.deepEqual(opened.flat, plan.flat);
  assert.equal(opened.trips[0].name, 'Kyōto');
});

test('other links are ignored', () => {
  assert.equal(planFromHash(''), null);
  assert.equal(planFromHash('#trips'), null);
  assert.equal(planFromHash('#plan=2.abc'), null);
  assert.equal(planFromHash('#plan=1.not-json'), null);
});
