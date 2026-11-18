// Singapore rules the calculator relies on, as of 2026. When a rate or cap changes, update it here.

export const CPF = {
  employeeRate: 0.20, // employee contribution, age 35 and below
  ordinaryAccountRate: 0.23, // share of wages credited to the Ordinary Account, age 35 and below
  wageCeiling: 8000, // monthly ordinary wage ceiling
};

export const DOWNPAYMENT = {
  total: 0.25, // with an HDB loan at 75% loan-to-value
  atSigning: 0.025, // staggered downpayment: the rest is due at key collection
};

export const HDB_LOAN = {
  loanToValue: 0.75,
  yearlyRate: 0.026,
  years: 25,
  servicingRatioLimit: 0.30, // monthly instalment as a share of gross household income
};

export const INTEREST = {
  ordinaryAccount: 0.025, // yearly
  cash: 0.035, // yearly, a high-interest savings account
};

// Residential buyer's stamp duty: [width of band, rate]
const STAMP_DUTY_BANDS = [
  [180_000, 0.01],
  [180_000, 0.02],
  [640_000, 0.03],
  [500_000, 0.04],
  [1_500_000, 0.05],
  [Infinity, 0.06],
];

export function buyerStampDuty(price) {
  let remaining = price;
  let duty = 0;
  for (const [width, rate] of STAMP_DUTY_BANDS) {
    const taxed = Math.min(remaining, width);
    duty += taxed * rate;
    remaining -= taxed;
    if (remaining <= 0) break;
  }
  return Math.round(duty);
}

export function monthlyInstalment(loan, yearlyRate = HDB_LOAN.yearlyRate, years = HDB_LOAN.years) {
  const rate = yearlyRate / 12;
  const months = years * 12;
  if (rate === 0) return loan / months;
  return (loan * rate) / (1 - (1 + rate) ** -months);
}

/** Take-home pay and the CPF Ordinary Account contribution for one month's gross salary. */
export function paycheck(gross) {
  const cpfWage = Math.min(gross, CPF.wageCeiling);
  return {
    takeHome: gross - cpfWage * CPF.employeeRate,
    ordinaryAccount: cpfWage * CPF.ordinaryAccountRate,
  };
}
