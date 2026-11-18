import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buyerStampDuty, monthlyInstalment, paycheck } from '../src/rules.js';

test('stamp duty follows the residential bands', () => {
  assert.equal(buyerStampDuty(180_000), 1_800);
  assert.equal(buyerStampDuty(360_000), 5_400);
  assert.equal(buyerStampDuty(680_000), 15_000);
  assert.equal(buyerStampDuty(1_000_000), 24_600);
  assert.equal(buyerStampDuty(1_200_000), 32_600);
  assert.equal(buyerStampDuty(3_500_000), 24_600 + 20_000 + 75_000 + 30_000);
});

test('monthly instalment on an HDB loan', () => {
  assert.equal(Math.round(monthlyInstalment(510_000)), 2_314);
  assert.equal(monthlyInstalment(300_000, 0, 25), 1_000);
});

test('CPF is worked out on pay up to the wage ceiling', () => {
  assert.deepEqual(paycheck(4_500), { takeHome: 3_600, ordinaryAccount: 1_035 });
  assert.deepEqual(paycheck(10_000), { takeHome: 8_400, ordinaryAccount: 1_840 });
});
