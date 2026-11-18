import { monthsBetween } from './months.js';
import { DOWNPAYMENT, HDB_LOAN, INTEREST, buyerStampDuty, monthlyInstalment, paycheck } from './rules.js';

const OA_MONTHLY_RATE = INTEREST.ordinaryAccount / 12;
const CASH_MONTHLY_RATE = INTEREST.cash / 12;

/** How many months ahead to look for the point where savings cover everything. */
export const HORIZON_MONTHS = 120;

/**
 * Projects a plan month by month from `today` ('YYYY-MM') to key collection.
 *
 * Offsets count months from today: offset 0 is now and `keysMonth` is key collection.
 * CPF OA pays as much of the downpayment and stamp duty as it can; cash covers the rest,
 * the renovation, and each trip in the month it happens.
 */
export function projectPlan(plan, today) {
  const savers = plan.people.slice(0, plan.couple ? 2 : 1).map((person, index) => {
    const pay = paycheck(person.gross);
    return {
      index,
      name: person.name,
      gross: person.gross,
      takeHome: pay.takeHome,
      ordinaryAccount: pay.ordinaryAccount,
      saving: person.saving,
      spendLeft: Math.max(0, pay.takeHome - person.saving),
      start: Math.max(0, monthsBetween(today, person.startsWork)),
    };
  });
  const keysMonth = Math.max(1, monthsBetween(today, plan.flat.keys));

  const trips = plan.trips.map((trip) => {
    const offset = monthsBetween(today, trip.month);
    const status = offset < 0 ? 'past' : offset >= keysMonth ? 'after-keys' : 'counted';
    return { ...trip, offset, status };
  });
  const countedTrips = trips.filter((trip) => trip.status === 'counted');
  const tripsByMonth = {};
  for (const trip of countedTrips) {
    tripsByMonth[trip.offset] = (tripsByMonth[trip.offset] ?? 0) + trip.budget;
  }

  const flat = costOfFlat(plan.flat, sum(savers, (s) => s.gross));
  const cashNeededFor = (oa) => Math.max(0, flat.upfront - oa) + plan.flat.reno;
  const model = { plan, savers, tripsByMonth };

  // Everyone keeps saving what they save now
  const series = [];
  const tripShortfalls = {};
  const atKeys = simulate(model, (saver) => saver.saving, keysMonth, (month, oa, cash) => {
    series.push({ month, oa, cash });
    if (tripsByMonth[month - 1] && cash < 0) tripShortfalls[month - 1] = -cash;
  });

  const cpfPays = Math.min(atKeys.oa, flat.upfront);
  const cashNeeded = cashNeededFor(atKeys.oa);
  const keysDay = {
    oa: atKeys.oa,
    cash: atKeys.cash,
    cpfPays,
    cashTopUp: flat.upfront - cpfPays,
    cashNeeded,
    surplus: atKeys.cash - cashNeeded,
  };

  // Solve backwards for the saving that is just enough
  const takeHome = sum(savers, (s) => s.takeHome);
  const currentSaving = sum(savers, (s) => s.saving);
  const monthly = requiredMonthlySaving(model, keysMonth, cashNeeded);
  const required = {
    monthly,
    shares: savers.map((s) => (Number.isFinite(monthly) && takeHome > 0 ? monthly * (s.takeHome / takeHome) : 0)),
    feasible: monthly <= takeHome,
    gap: monthly - currentSaving,
    pace: monthly > 0 && Number.isFinite(monthly) ? currentSaving / monthly : 1,
  };

  return {
    keysMonth,
    savers,
    takeHome,
    currentSaving,
    monthlyOA: sum(savers, (s) => s.ordinaryAccount),
    trips: trips.map((trip) => ({ ...trip, shortBy: tripShortfalls[trip.offset] ?? 0 })),
    tripsTotal: sum(countedTrips, (trip) => trip.budget),
    tripsCounted: countedTrips.length,
    flat,
    keysDay,
    required,
    readyMonth: findReadyMonth(model, cashNeededFor),
    fundedFraction: clamp((cpfPays + Math.max(0, atKeys.cash)) / flat.neededAtKeys, 0, 1),
    series,
    status: !required.feasible ? 'out-of-reach' : required.gap > 0 ? 'behind' : 'on-track',
  };
}

function costOfFlat({ price, reno }, householdGross) {
  const stampDuty = buyerStampDuty(price);
  const downpayment = price * DOWNPAYMENT.total;
  const atSigning = price * DOWNPAYMENT.atSigning;
  const loan = price * HDB_LOAN.loanToValue;
  const instalment = monthlyInstalment(loan);
  return {
    price,
    stampDuty,
    downpayment,
    atSigning,
    atKeys: downpayment - atSigning,
    upfront: downpayment + stampDuty,
    neededAtKeys: downpayment + stampDuty + reno,
    loan,
    instalment,
    servicingRatio: householdGross > 0 ? instalment / householdGross : Infinity,
  };
}

/**
 * Steps through `months` months, calling `onMonth(month, oa, cash)` with the balances at the start
 * (month 0) and after each month. Cash may go negative: that is a month you'd be short.
 */
function simulate({ plan, savers, tripsByMonth }, savingFor, months, onMonth) {
  let oa = plan.savedOA;
  let cash = plan.savedCash;
  onMonth?.(0, oa, cash);

  for (let month = 0; month < months; month++) {
    const working = savers.filter((saver) => month >= saver.start);
    oa = oa * (1 + OA_MONTHLY_RATE) + sum(working, (s) => s.ordinaryAccount);
    cash = cash * (1 + CASH_MONTHLY_RATE)
      + sum(working, savingFor)
      - plan.flat.rent
      - (tripsByMonth[month] ?? 0);
    onMonth?.(month + 1, oa, cash);
  }
  return { oa, cash };
}

/**
 * The smallest combined monthly saving, split by take-home pay, that leaves enough cash at
 * key collection and never runs short for a trip once someone is working. Infinity when no
 * amount would do it.
 */
function requiredMonthlySaving(model, keysMonth, cashNeeded) {
  const takeHome = sum(model.savers, (s) => s.takeHome);
  const firstPay = Math.min(...model.savers.map((s) => s.start));

  const covers = (total) => {
    let lowest = Infinity;
    const share = (saver) => (takeHome > 0 ? total * (saver.takeHome / takeHome) : 0);
    const end = simulate(model, share, keysMonth, (month, oa, cash) => {
      if (month > firstPay) lowest = Math.min(lowest, cash);
    });
    return end.cash >= cashNeeded && lowest >= 0;
  };

  if (covers(0)) return 0;
  if (takeHome <= 0) return Infinity;

  let low = 0;
  let high = 100_000;
  if (!covers(high)) return Infinity;
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    if (covers(middle)) high = middle;
    else low = middle;
  }
  return Math.ceil(high / 10) * 10;
}

/** The first month, at today's saving pace, when cash covers everything CPF OA can't. */
function findReadyMonth(model, cashNeededFor) {
  let ready = null;
  simulate(model, (saver) => saver.saving, HORIZON_MONTHS, (month, oa, cash) => {
    if (ready === null && cash >= cashNeededFor(oa)) ready = month;
  });
  return ready;
}

function sum(items, valueOf) {
  return items.reduce((total, item) => total + valueOf(item), 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
