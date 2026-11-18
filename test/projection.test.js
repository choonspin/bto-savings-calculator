import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examplePlan, normalizePlan } from '../src/plan.js';
import { projectPlan } from '../src/projection.js';

const TODAY = '2026-11';

function planWith(changes) {
  return normalizePlan({ ...examplePlan(TODAY), ...changes }, TODAY);
}

function withSaving(plan, total) {
  const takeHome = plan.people.map((p) => p.gross * 0.8);
  const sum = takeHome[0] + takeHome[1];
  return {
    ...plan,
    people: plan.people.map((p, i) => ({ ...p, saving: total * (takeHome[i] / sum) })),
  };
}

test('saving the required amount leaves enough at key collection, and a little less does not', () => {
  const plan = planWith({ flat: { price: 680_000, keys: '2030-01', reno: 100_000, rent: 0 } });
  const { required } = projectPlan(plan, TODAY);

  assert.ok(Number.isFinite(required.monthly));
  assert.ok(projectPlan(withSaving(plan, required.monthly), TODAY).keysDay.surplus >= 0);
  assert.ok(projectPlan(withSaving(plan, required.monthly - 50), TODAY).keysDay.surplus < 0);
});

test('the required saving is split by take-home pay', () => {
  const projection = projectPlan(planWith({}), TODAY);
  const [a, b] = projection.required.shares;

  assert.ok(Math.abs(a + b - projection.required.monthly) < 0.01);
  assert.ok(Math.abs(a / b - 3_600 / 4_000) < 1e-9);
});

test('saving more gets you funded sooner', () => {
  const slow = projectPlan(planWith({}), TODAY);
  const fast = projectPlan(withSaving(planWith({}), 6_000), TODAY);

  assert.ok(fast.readyMonth < slow.readyMonth);
});

test('trips before keys count; past trips and trips after keys do not', () => {
  const projection = projectPlan(planWith({
    trips: [
      { id: 'past', name: 'Perth', month: '2025-06', budget: 2_500 },
      { id: 'soon', name: 'Tokyo', month: '2027-03', budget: 4_000 },
      { id: 'later', name: 'Paris', month: '2031-01', budget: 9_000 },
    ],
  }), TODAY);

  const status = Object.fromEntries(projection.trips.map((t) => [t.id, t.status]));
  assert.deepEqual(status, { past: 'past', soon: 'counted', later: 'after-keys' });
  assert.equal(projection.tripsTotal, 4_000);
});

test('a trip you cannot afford yet shows how short you are', () => {
  const projection = projectPlan(planWith({
    savedCash: 0,
    trips: [{ id: 'now', name: 'Bali', month: TODAY, budget: 10_000 }],
  }), TODAY);

  assert.ok(projection.trips[0].shortBy > 0);
});

test('buying alone ignores the partner', () => {
  const projection = projectPlan(planWith({ couple: false }), TODAY);

  assert.equal(projection.savers.length, 1);
  assert.equal(projection.required.shares.length, 1);
});

test('a target beyond take-home pay is out of reach', () => {
  const projection = projectPlan(planWith({
    savedCash: 0,
    savedOA: 0,
    flat: { price: 1_000_000, keys: '2027-11', reno: 150_000, rent: 0 },
  }), TODAY);

  assert.equal(projection.status, 'out-of-reach');
});
