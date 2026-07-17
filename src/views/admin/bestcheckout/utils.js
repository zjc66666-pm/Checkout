export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function clone(value) {
  return structuredClone(value);
}

export function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('not supported') || value.includes('unsupported') || value.includes('blocked') || value.includes('failed') || value.includes('not authorized') || value.includes('not connected') || value.includes('not verified') || value.includes('not ready')) return 'critical';
  if (value.includes('not evaluated') || value.includes('not run') || value.includes('unconfirmed') || value.includes('candidate')) return 'neutral';
  if (value.includes('live') || value.includes('complete') || value.includes('connected') || value.includes('healthy') || value.includes('verified') || value.includes('published') || value.includes('succeeded') || value.includes('ready') || value.includes('supported')) return 'success';
  if (value.includes('action') || value.includes('review') || value.includes('conditional') || value.includes('recovered') || value.includes('draft changes')) return 'warning';
  if (value.includes('planned') || value.includes('draft') || value.includes('paused') || value.includes('skipped')) return 'info';
  return 'neutral';
}

export function parseRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home';
  const parts = raw.split('?');
  const path = parts[0].replace(/^\/+|\/+$/g, '');
  return {
    raw: raw,
    path: path || 'home',
    segments: (path || 'home').split('/').filter(Boolean),
    query: new URLSearchParams(parts[1] || ''),
  };
}

export function setRoute(path) {
  const next = String(path || 'home').replace(/^#?\/?/, '');
  if (window.location.hash === '#/' + next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = '#/' + next;
}

export function getRouteName(route) {
  const first = route.segments[0] || 'home';
  return ['home', 'funnels', 'pages', 'performance', 'activity', 'settings'].includes(first) ? first : 'home';
}

export function formatDateTime(date, locale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date || new Date());
}
