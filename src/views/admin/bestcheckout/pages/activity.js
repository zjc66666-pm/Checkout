import { badge, button, icon, pageHeader } from '../components/common.js';
import { ACTIVITY_FILTERS } from '../type.js';
import { escapeHtml } from '../utils.js';

export function renderActivity(state) {
  const events = state.activity.filter(function (event) {
    return state.ui.activityFilter === 'all' || event.category === state.ui.activityFilter;
  });
  const options = ACTIVITY_FILTERS.map(function (filter) {
    return '<option value="' + filter.id + '"' + (state.ui.activityFilter === filter.id ? ' selected' : '') + '>' + filter.label + '</option>';
  }).join('');
  const rows = events.map(function (event) {
    const iconName = event.category === 'post-purchase' ? 'sparkles' : event.category === 'payment' ? 'card' : event.category === 'tracking' ? 'pixel' : event.category === 'sync' ? 'sync' : 'orders';
    return '<article class="timeline-event"><div class="timeline-marker activity-' + escapeHtml(event.category) + '">' + icon(iconName, 17) + '</div><div class="timeline-card"><header><div><strong>' + escapeHtml(event.title) + '</strong><span>' + escapeHtml(event.time) + '</span></div>' + badge(event.status) + '</header><p>' + escapeHtml(event.detail) + '</p><footer><span>' + escapeHtml(event.actor) + '</span><code>' + escapeHtml(event.reference) + '</code><button type="button" class="button button-plain" data-action="view-activity-detail" data-event-id="' + escapeHtml(event.id) + '">View details</button></footer></div></article>';
  }).join('');
  const header = pageHeader('Activity', 'Trace every payment, post-purchase decision, synchronization and Shopify writeback.', button('Export log', 'export-activity', { icon: 'external' }));
  return '<div class="page-stack">' + header + '<section class="activity-summary-grid"><div class="card activity-summary"><span class="summary-icon summary-success">' + icon('check', 17) + '</span><div><strong>1,284</strong><small>Succeeded today</small></div></div><div class="card activity-summary"><span class="summary-icon summary-info">' + icon('shield', 17) + '</span><div><strong>18</strong><small>Safe skips</small></div></div><div class="card activity-summary"><span class="summary-icon summary-warning">' + icon('sync', 17) + '</span><div><strong>3</strong><small>Recovered retries</small></div></div><div class="card activity-summary"><span class="summary-icon summary-critical">' + icon('alert', 17) + '</span><div><strong>0</strong><small>Unresolved failures</small></div></div></section><div class="filter-bar activity-filter-bar"><div class="activity-filter-rail"><label class="activity-filter-select" for="activity-filter"><span>Event type</span><select id="activity-filter" data-change="activity-filter">' + options + '</select></label><i aria-hidden="true"></i><div class="activity-search-control">' + icon('search', 16) + '<input type="search" placeholder="Search order, payment or event ID" aria-label="Search activity" data-activity-search /></div></div><span class="filter-meta" data-activity-count>' + events.length + ' events shown</span></div><section class="timeline" aria-label="BestCheckout activity timeline">' + rows + '</section></div>';
}
