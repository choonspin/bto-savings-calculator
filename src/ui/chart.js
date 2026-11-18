// The savings chart, drawn with Chart.js (loaded from a CDN in index.html).

import { formatSGD } from '../format.js';
import { addMonths, formatMonth } from '../months.js';
import { byId } from './dom.js';

let chart = null;

export function renderChart(series, neededAtKeys, today) {
  if (!window.Chart) return; // the CDN didn't load; everything else still works

  const labels = series.map((point) => formatMonth(addMonths(today, point.month)));
  const data = [
    series.map((point) => Math.round(point.oa + point.cash)),
    series.map((point) => Math.round(point.oa)),
    series.map((point) => Math.round(point.cash)),
    series.map(() => Math.round(neededAtKeys)),
  ];

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets.forEach((dataset, i) => { dataset.data = data[i]; });
    chart.update('none');
    return;
  }
  chart = createChart(labels, data);
}

/** Drops the chart so the next render redraws it in the current theme's colours. */
export function resetChart() {
  chart?.destroy();
  chart = null;
}

function createChart(labels, data) {
  const color = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const c = {
    mint: color('--mint-ink'),
    blue: color('--blue-ink'),
    butter: color('--butter-ink'),
    soft: color('--soft-ink'),
    ink: color('--ink'),
    line: color('--line'),
    paper: color('--paper'),
  };
  const font = { family: "'Figtree', system-ui, sans-serif", size: 11 };
  const endPoint = (radius) => (ctx) => (ctx.dataIndex === ctx.dataset.data.length - 1 ? radius : 0);

  return new window.Chart(byId('savings-chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Cash + CPF OA',
          data: data[0],
          borderColor: c.mint,
          backgroundColor: withAlpha(c.mint, 0.14),
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointRadius: endPoint(6),
          pointBackgroundColor: c.paper,
          pointBorderWidth: 3,
        },
        { label: 'CPF OA', data: data[1], borderColor: c.blue, borderWidth: 2, tension: 0.3, pointRadius: endPoint(4), pointBackgroundColor: c.blue },
        { label: 'Cash', data: data[2], borderColor: c.butter, borderWidth: 2, borderDash: [5, 4], tension: 0.3, pointRadius: endPoint(4), pointBackgroundColor: c.butter },
        { label: 'Needed at keys', data: data[3], borderColor: c.soft, borderWidth: 1.5, borderDash: [6, 5], pointRadius: 0 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.ink,
          titleColor: c.paper,
          bodyColor: c.paper,
          titleFont: { ...font, size: 12, weight: 'bold' },
          bodyFont: { ...font, size: 12 },
          padding: 12,
          cornerRadius: 12,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatSGD(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: c.line },
          ticks: { font, color: c.soft, maxRotation: 0, autoSkipPadding: 20 },
        },
        y: {
          grid: { color: c.line },
          border: { display: false },
          ticks: { font, color: c.soft, callback: (value) => `S$${value / 1000}k` },
        },
      },
    },
  });
}

function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
