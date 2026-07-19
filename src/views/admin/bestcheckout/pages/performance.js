import { badge, icon, metricCard, pageHeader, sectionHeader } from '../components/common.js';
import { PERFORMANCE_TABS } from '../type.js';
import { escapeHtml } from '../utils.js';

const DATE_RANGES = {
  '7d': { label: 'Jul 9 – Jul 15', ticks: ['Jul 9', 'Jul 11', 'Jul 13', 'Jul 15'] },
  '14d': { label: 'Jul 1 – Jul 15', ticks: ['Jul 1', 'Jul 5', 'Jul 10', 'Jul 15'] },
  '30d': { label: 'Jun 16 – Jul 15', ticks: ['Jun 16', 'Jun 26', 'Jul 5', 'Jul 15'] },
};

function valuesForRange(chart, rangeId) {
  if (rangeId === '7d') return chart.slice(-7);
  if (rangeId === '30d') return [21, 24, 22, 27, 26, 29, 31, 30, 34, 36, 35, 39, 37, 41, 40, 43].concat(chart);
  return chart;
}

function pointY(values, value) {
  const height = 190;
  const min = Math.min.apply(null, values) - 3;
  const max = Math.max.apply(null, values) + 3;
  return height - ((value - min) / (max - min)) * height;
}

function chartPath(values) {
  const width = 720;
  const height = 190;
  const min = Math.min.apply(null, values) - 3;
  const max = Math.max.apply(null, values) + 3;
  return values.map(function (value, index) {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / (max - min)) * height;
    return (index === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }).join(' ');
}

function renderRows(state) {
  return state.performanceRows[state.ui.performanceTab].map(function (row) {
    return '<tr><td><strong data-i18n-skip>' + escapeHtml(row.name) + '</strong></td><td class="num">' + escapeHtml(row.sessions) + '</td><td class="num">' + escapeHtml(row.conversion) + '</td><td class="num">' + escapeHtml(row.aov) + '</td><td class="num">' + escapeHtml(row.revenue) + '</td><td class="num">' + (row.lift === 'Review' ? badge('Action required', 'Review') : '<span class="table-lift">' + escapeHtml(row.lift) + '</span>') + '</td></tr>';
  }).join('');
}

export function renderPerformance(state) {
  const rangeId = state.ui.performanceDateRange || '14d';
  const range = DATE_RANGES[rangeId] || DATE_RANGES['14d'];
  const values = valuesForRange(state.chart, rangeId);
  const header = pageHeader('Performance', 'Compare funnel, page, payment provider and acquisition channel outcomes.', '<label class="date-control" for="performance-date-range"><span class="sr-only">Date range</span><select id="performance-date-range" class="date-control-select" data-change="performance-date-range" aria-label="Date range"><option value="7d"' + (rangeId === '7d' ? ' selected' : '') + '>Jul 9 – Jul 15</option><option value="14d"' + (rangeId === '14d' ? ' selected' : '') + '>Jul 1 – Jul 15</option><option value="30d"' + (rangeId === '30d' ? ' selected' : '') + '>Jun 16 – Jul 15</option></select></label>');
  const metrics = '<section class="metric-grid">' + metricCard('Attributed GMV', state.metrics.gmv, 'analytics') + metricCard('Checkout conversion', state.metrics.conversion, 'flow') + metricCard('Average order value', state.metrics.aov, 'orders') + metricCard('Post-purchase revenue', state.metrics.recovered, 'sparkles') + '</section>';
  const points = values.map(function (value, index) {
    const x = (index / (values.length - 1)) * 720;
    const y = pointY(values, value);
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5"></circle>';
  }).join('');
  const tabs = PERFORMANCE_TABS.map(function (tab) {
    const selected = state.ui.performanceTab === tab.id;
    return '<button type="button" role="tab" aria-selected="' + selected + '" class="tab' + (selected ? ' is-active' : '') + '" data-action="set-performance-tab" data-tab="' + tab.id + '">' + tab.label + '</button>';
  }).join('');
  return '<div class="page-stack">' + header + metrics + '<section class="card performance-chart-card"><div class="card-pad">' + sectionHeader('Checkout revenue trend', 'BestCheckout attributed GMV · daily', '<span class="comparison-chip">vs native control <strong>+18.4%</strong></span>') + '<div class="chart-wrap"><div class="chart-axis"><span>$8k</span><span>$6k</span><span>$4k</span><span>$2k</span><span>$0</span></div><svg class="performance-chart" viewBox="0 0 720 210" role="img" aria-label="Revenue increasing over the selected period"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#29845a" stop-opacity=".22"/><stop offset="1" stop-color="#29845a" stop-opacity="0"/></linearGradient></defs><path class="chart-area" d="' + chartPath(values) + ' L720 210 L0 210 Z"></path><path class="chart-line" d="' + chartPath(values) + '"></path><g class="chart-points">' + points + '</g></svg><div class="chart-dates"><span>' + range.ticks[0] + '</span><span>' + range.ticks[1] + '</span><span>' + range.ticks[2] + '</span><span>' + range.ticks[3] + '</span></div></div></div></section><section class="card"><div class="table-toolbar"><div class="tabs" role="tablist">' + tabs + '</div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th class="num">Sessions</th><th class="num">Conversion / rate</th><th class="num">AOV / metric</th><th class="num">Revenue</th><th class="num">Lift</th></tr></thead><tbody>' + renderRows(state) + '</tbody></table></div></section><section class="attribution-footnote"><span>' + icon('shield', 18) + '</span><div><strong>Performance uses Final Order Snapshot revenue</strong><p>Purchase attribution is finalized after base payment and all accepted post-purchase changes are resolved. Shopify writeback continues as an independent downstream projection.</p></div><button type="button" class="button button-plain" data-route="settings?tab=attribution">Review attribution</button></section></div>';
}
