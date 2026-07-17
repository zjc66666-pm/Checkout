import { escapeHtml, statusTone } from '../utils.js';

export function icon(name, size) {
  const paths = {
    home: '<path d="M3.5 10.5 12 3l8.5 7.5v9a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/>',
    user: '<circle cx="12" cy="8" r="3"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
    orders: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    products: '<path d="M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8-8-8Z"/><path d="M8 8h.01"/>',
    store: '<path d="M4 10h16v10H4zM3 10l1.5-6h15l1.5 6"/><path d="M8 20v-6h8v6M4 10a3 3 0 0 0 5-2 3 3 0 0 0 6 0 3 3 0 0 0 5 2"/>',
    flow: '<rect x="3" y="4" width="7" height="5" rx="1"/><rect x="14" y="15" width="7" height="5" rx="1"/><path d="M10 6.5h3a4 4 0 0 1 4 4V15M7 9v5a3 3 0 0 0 3 3h4"/>',
    pages: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 12h7M9 16h7"/>',
    analytics: '<path d="M4 20V10m5 10V4m5 16v-7m5 7V7"/><path d="M3 20h18"/>',
    activity: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h13M13 7l5 5-5 5"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    check: '<path d="m5 12 4.2 4.2L19 6.5"/>',
    alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/>',
    external: '<path d="M14 4h6v6M11 13l9-9M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    shield: '<path d="M12 3 5 6v5c0 4.4 2.8 8.2 7 10 4.2-1.8 7-5.6 7-10V6z"/><path d="m8.8 12 2.1 2.1 4.3-4.3"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    sync: '<path d="M20 7h-5V2M4 17h5v5"/><path d="M18.5 9A7 7 0 0 0 6.2 5.2L4 7m16 10-2.2 1.8A7 7 0 0 1 5.5 15"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    pixel: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M17 14v6M14 17h6"/>',
    mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    desktop: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    expand: '<path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/>',
    collapse: '<path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    edit: '<path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m13.5 7.5 3 3"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    play: '<path d="m8 5 10 7-10 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    sparkles: '<path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4zM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/>',
  };
  return '<svg class="icon" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.home) + '</svg>';
}

export function badge(status, label) {
  const text = label || status;
  return '<span class="badge badge-' + statusTone(status) + '"><span class="badge-dot"></span>' + escapeHtml(text) + '</span>';
}

export function button(label, action, options) {
  const opts = options || {};
  const kind = opts.kind || 'secondary';
  const iconMarkup = opts.icon ? icon(opts.icon, 16) : '';
  const disabled = opts.disabled ? ' disabled' : '';
  const attrs = opts.attrs || '';
  return '<button type="button" class="button button-' + kind + '" data-action="' + escapeHtml(action) + '"' + disabled + ' ' + attrs + '>' + iconMarkup + '<span>' + escapeHtml(label) + '</span></button>';
}

export function routeButton(label, route, options) {
  const opts = options || {};
  const kind = opts.kind || 'secondary';
  const iconMarkup = opts.icon ? icon(opts.icon, 16) : '';
  return '<button type="button" class="button button-' + kind + '" data-route="' + escapeHtml(route) + '">' + iconMarkup + '<span>' + escapeHtml(label) + '</span></button>';
}

export function pageHeader(title, subtitle, actions, breadcrumbs) {
  const crumbs = (breadcrumbs || []).map(function (item, index) {
    const separator = index ? '<span class="breadcrumb-separator">/</span>' : '';
    const content = item.route
      ? '<button type="button" data-route="' + escapeHtml(item.route) + '">' + escapeHtml(item.label) + '</button>'
      : '<span>' + escapeHtml(item.label) + '</span>';
    return separator + content;
  }).join('');
  return '<header class="page-header">' + (crumbs ? '<nav class="breadcrumbs" aria-label="Breadcrumb">' + crumbs + '</nav>' : '') + '<div class="page-header-row"><div class="page-heading"><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(subtitle) + '</p></div><div class="page-actions">' + (actions || '') + '</div></div></header>';
}

export function metricCard(label, metric, iconName) {
  return '<section class="card metric-card"><div class="metric-card-top"><span>' + escapeHtml(label) + '</span><span class="metric-icon">' + icon(iconName || 'analytics', 17) + '</span></div><strong>' + escapeHtml(metric.value) + '</strong><div class="metric-meta"><span class="metric-positive">' + escapeHtml(metric.delta) + '</span><span>' + escapeHtml(metric.helper) + '</span></div></section>';
}

export function banner(tone, title, body, actionMarkup) {
  const iconName = tone === 'critical' || tone === 'warning' ? 'alert' : tone === 'success' ? 'check' : 'shield';
  return '<section class="banner banner-' + tone + '">' + icon(iconName, 20) + '<div class="banner-copy"><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(body) + '</p></div>' + (actionMarkup ? '<div class="banner-action">' + actionMarkup + '</div>' : '') + '</section>';
}

export function sectionHeader(title, description, actionMarkup) {
  return '<div class="section-header"><div><h2>' + escapeHtml(title) + '</h2>' + (description ? '<p>' + escapeHtml(description) + '</p>' : '') + '</div>' + (actionMarkup ? '<div>' + actionMarkup + '</div>' : '') + '</div>';
}

export function progressBar(value, tone) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return '<div class="progress-track" role="progressbar" aria-label="' + safe + '%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + safe + '"><span class="progress-fill progress-' + (tone || 'brand') + '" style="width:' + safe + '%"></span></div>';
}
