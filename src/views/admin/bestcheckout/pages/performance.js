import { badge, button, icon, metricCard, pageHeader, sectionHeader } from '../components/common.js';
import { PERFORMANCE_TABS } from '../type.js';
import { escapeHtml } from '../utils.js';

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
  const header = pageHeader('Performance', 'Compare funnel, page, payment provider and acquisition channel outcomes.', '<div class="date-control"><span class="date-control-display">Jul 1 – Jul 15</span>' + button('Export', 'export-performance', { icon: 'external' }) + '</div>');
  const metrics = '<section class="metric-grid">' + metricCard('Attributed GMV', state.metrics.gmv, 'analytics') + metricCard('Checkout conversion', state.metrics.conversion, 'flow') + metricCard('Average order value', state.metrics.aov, 'orders') + metricCard('Post-purchase revenue', state.metrics.recovered, 'sparkles') + '</section>';
  const points = state.chart.map(function (value, index) {
    const x = (index / (state.chart.length - 1)) * 720;
    const y = 190 - ((value - 39) / 36) * 190;
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5"></circle>';
  }).join('');
  const tabs = PERFORMANCE_TABS.map(function (tab) {
    const selected = state.ui.performanceTab === tab.id;
    return '<button type="button" role="tab" aria-selected="' + selected + '" class="tab' + (selected ? ' is-active' : '') + '" data-action="set-performance-tab" data-tab="' + tab.id + '">' + tab.label + '</button>';
  }).join('');
  return '<div class="page-stack">' + header + metrics + '<section class="card performance-chart-card"><div class="card-pad">' + sectionHeader('Checkout revenue trend', 'BestCheckout attributed GMV · daily', '<span class="comparison-chip">vs native control <strong>+18.4%</strong></span>') + '<div class="chart-wrap"><div class="chart-axis"><span>$8k</span><span>$6k</span><span>$4k</span><span>$2k</span><span>$0</span></div><svg class="performance-chart" viewBox="0 0 720 210" role="img" aria-label="Revenue increasing over the selected period"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#29845a" stop-opacity=".22"/><stop offset="1" stop-color="#29845a" stop-opacity="0"/></linearGradient></defs><path class="chart-area" d="' + chartPath(state.chart) + ' L720 210 L0 210 Z"></path><path class="chart-line" d="' + chartPath(state.chart) + '"></path><g class="chart-points">' + points + '</g></svg><div class="chart-dates"><span>Jul 1</span><span>Jul 5</span><span>Jul 10</span><span>Jul 15</span></div></div></div></section><section class="card"><div class="table-toolbar"><div class="tabs" role="tablist">' + tabs + '</div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th class="num">Sessions</th><th class="num">Conversion / rate</th><th class="num">AOV / metric</th><th class="num">Revenue</th><th class="num">Lift</th></tr></thead><tbody>' + renderRows(state) + '</tbody></table></div></section><section class="attribution-footnote"><span>' + icon('shield', 18) + '</span><div><strong>Performance uses Final Order Snapshot revenue</strong><p>Purchase attribution is finalized after base payment and all accepted post-purchase changes are resolved. Shopify writeback continues as an independent downstream projection.</p></div><button type="button" class="button button-plain" data-route="settings?tab=attribution">Review attribution</button></section></div>';
}
