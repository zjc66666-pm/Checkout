import { badge, banner, button, icon, pageHeader, sectionHeader } from '../components/common.js';
import { PAGE_TYPE_LABEL } from '../type.js';
import { escapeHtml } from '../utils.js';

function pageThumbnail(page) {
  if (page.type === 'checkout') {
    return '<div class="page-thumb page-thumb-checkout" style="--page-accent:' + escapeHtml(page.accent) + '"><div class="mini-logo"></div><div class="mini-checkout-left"><i></i><i></i><i></i><b></b></div><div class="mini-checkout-right"><span></span><span></span><span></span></div></div>';
  }
  if (page.type === 'thank-you') {
    return '<div class="page-thumb page-thumb-thankyou" style="--page-accent:' + escapeHtml(page.accent) + '"><span class="mini-check">✓</span><strong>Thank you</strong><i></i><i></i><div></div></div>';
  }
  return '<div class="page-thumb page-thumb-offer" style="--page-accent:' + escapeHtml(page.accent) + '"><div class="mini-product"></div><strong>' + (page.type === 'upsell' ? 'Special offer' : 'One last offer') + '</strong><i></i><button></button><span></span></div>';
}

export function renderPages(state) {
  const filters = ['all', 'checkout', 'upsell', 'downsell', 'thank-you'].map(function (filter) {
    const label = filter === 'all' ? 'All pages' : PAGE_TYPE_LABEL[filter];
    const selected = state.ui.pageTypeFilter === filter;
    return '<button type="button" class="filter-chip' + (selected ? ' is-active' : '') + '" data-action="filter-pages" data-filter="' + filter + '" aria-pressed="' + selected + '">' + escapeHtml(label) + '</button>';
  }).join('');
  const pages = state.pages.filter(function (page) {
    return state.ui.pageTypeFilter === 'all' || page.type === state.ui.pageTypeFilter;
  });
  const cards = pages.map(function (page) {
    const updatedLabel = page.updated === 'Created during installation' && state.ui.locale === 'zh' ? '安装时创建' : page.updated;
    const versionLabel = page.publishedVersionId ? 'Published v' + page.version : 'No published version';
    const draftLabel = page.draftRevision ? 'Draft r' + page.draftRevision : '';
    return '<article class="card page-card">' + pageThumbnail(page) + '<div class="page-card-body"><div class="page-card-title"><div><span class="eyebrow">' + escapeHtml(PAGE_TYPE_LABEL[page.type]) + '</span><h2 data-i18n-skip>' + escapeHtml(page.name) + '</h2></div>' + badge(page.status) + '</div><div class="page-card-meta"><span>' + escapeHtml(versionLabel) + '</span>' + (draftLabel ? '<span>' + escapeHtml(draftLabel) + '</span>' : '') + '<span>' + page.usedBy + ' funnel' + (page.usedBy === 1 ? '' : 's') + '</span><span>' + escapeHtml(updatedLabel) + '</span></div><div class="page-card-performance"><span><small>' + escapeHtml(page.metricLabel) + '</small><strong>' + escapeHtml(page.metric) + '</strong></span><em>' + escapeHtml(page.change) + '</em></div><div class="page-card-actions"><button type="button" class="button button-primary" data-action="edit-page" data-page-id="' + escapeHtml(page.id) + '">' + icon('edit', 16) + '<span>Edit</span></button><button type="button" class="button button-secondary" data-action="duplicate-page" data-page-id="' + escapeHtml(page.id) + '">' + icon('copy', 16) + '<span>Duplicate</span></button><button type="button" class="icon-button" data-action="page-more" aria-label="More actions">' + icon('more', 18) + '</button></div></div></article>';
  }).join('');
  const header = pageHeader('Pages', 'Manage reusable Checkout, Upsell, Downsell and Thank-you page assets.', button('Theme settings', 'open-shared-styles', { kind: 'secondary', icon: 'settings' }) + button('Create page', 'create-page', { kind: 'primary', icon: 'plus' }));
  const coreBanner = banner('info', 'Build once, use it in multiple funnels', 'Update a page as a draft first. Your live funnels keep their current version until you publish them again.');
  return '<div class="page-stack">' + header + coreBanner + '<div class="filter-bar"><div class="filter-group">' + filters + '</div><div class="filter-meta">' + pages.length + ' of ' + state.pages.length + ' pages</div></div><section class="page-card-grid">' + cards + '</section><section class="card"><div class="card-pad">' + sectionHeader('Theme settings', 'Set the logo, colors and layout shared by your Checkout, offers and Thank-you page.', button('Edit theme settings', 'open-shared-styles', { kind: 'plain' })) + '<div class="shared-style-grid"><div><span class="style-swatch style-swatch-logo">LL</span><strong>Logo</strong><small data-i18n-skip>Lavender Labs</small></div><div><span class="style-swatch style-swatch-color"></span><strong>Accent color</strong><small>#6D5DFC</small></div><div><span class="style-swatch style-swatch-radius"></span><strong>Corner radius</strong><small>8 px</small></div><div><span class="style-swatch style-swatch-width"></span><strong>Content width</strong><small>Compact</small></div></div></div></section></div>';
}
