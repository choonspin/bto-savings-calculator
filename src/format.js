/** 'S$1,234' (whole dollars) */
export function formatSGD(amount) {
  const sign = amount < 0 ? '-' : '';
  return `${sign}S$${Math.round(Math.abs(amount)).toLocaleString('en-SG')}`;
}

/** 'S$680k' */
export function formatThousands(amount) {
  return `S$${Math.round(amount / 1000)}k`;
}

/** '3 trips', '1 month' */
export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** '57%' */
export function formatPercent(fraction) {
  return `${Math.round(fraction * 100)}%`;
}
