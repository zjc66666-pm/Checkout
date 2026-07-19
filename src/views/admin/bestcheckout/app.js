import {
  APP_NAV,
  FUNNEL_DEPLOYMENT_SCHEMA_VERSION,
  FUNNEL_STATUS,
  TRACKING_CONTRACT_VERSION,
} from './type.js';
import { createMockBestCheckoutState } from './mock.js?rev=20260719-activity-categories-v88';
import { buildRuntimePayload, deterministicPayloadHash, graphEdgesForNodes, validateGraphCoverage } from './runtime.js?rev=20260716-rich-audience-v19';
import { icon } from './components/common.js?rev=20260716-focus-mode-v27';
import {
  renderActivityDetailModal,
  renderAddOfferModal,
  renderAddJourneyPageModal,
  renderAppEmbedModal,
  renderConnectProviderModal,
  renderCreatePageModal,
  renderCreateFunnelModal,
  renderCheckoutExperimentModal,
  renderFunnelEntryModal,
  renderFunnelPreviewModal,
  renderInstallationModal,
  renderRemoveJourneyPageModal,
  renderInfoModal,
  renderPublishModal,
  renderArchivePageModal,
  renderPageVersionHistoryModal,
  renderRenamePageModal,
  renderSelectNodePageModal,
  renderTrackingReviewModal,
  renderTrafficModal,
  renderUnsavedChangesModal,
} from './components/modals.js?rev=20260719-payment-connect-wizard-v91';
import { renderHome } from './pages/home.js?rev=20260717-trend-refinement-v81';
import { renderFunnels } from './pages/funnels.js?rev=20260717-store-state-v77';
import { renderPages } from './pages/pages.js?rev=20260719-page-actions-menu-v84';
import { renderPerformance } from './pages/performance.js?rev=20260719-performance-date-range-v89';
import { renderActivity } from './pages/activity.js?rev=20260717-inline-activity-filter-v61';
import { renderSettings } from './pages/settings.js?rev=20260717-installation-flow-v82';
import { renderEditor, mountEditor } from './pages/editor.js?rev=20260719-preview-session-v92';
import { escapeHtml, formatDateTime, getRouteName, parseRoute, setRoute } from './utils.js';
import { applyLocale, renderLanguageSwitcher, translate } from './i18n.js?rev=20260717-language-panel-v74';

const appRoot = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');
let state = createMockBestCheckoutState();
try {
  const storedLocale = window.localStorage.getItem('bestcheckout-prototype-locale');
  if (storedLocale === 'zh' || storedLocale === 'en') state.ui.locale = storedLocale;
} catch (error) {
  state.ui.locale = 'en';
}
let modalReturnFocus = null;
let toastTimer = null;
let lastRenderedHash = window.location.hash;
let lastRenderedWasEditor = isEditorRoute(parseRoute());

function staticNavItem(iconName, label, meta) {
  return '<div class="shopify-static-item" aria-disabled="true" tabindex="-1">' + icon(iconName, 17) + '<span>' + escapeHtml(label) + '</span>' + (meta ? '<b>' + escapeHtml(meta) + '</b>' : '') + '</div>';
}

function renderStoreSwitcher() {
  const isZh = state.ui.locale === 'zh';
  const installed = state.ui.demoProfile !== 'live';
  const currentState = installed
    ? (isZh ? '安装完成 · 草稿' : 'Installed · drafts')
    : (isZh ? '已发布 · 有数据' : 'Published · with data');
  const menuLabel = isZh ? '店铺状态' : 'Store state';
  const installedTitle = isZh ? '安装完成（初始状态）' : 'Installed (initial state)';
  const installedCopy = isZh ? '已完成授权与同步；模板、页面和漏斗均为草稿。' : 'Authorization and sync are complete; templates, pages and Funnels are drafts.';
  const liveTitle = isZh ? '已发布（演示数据）' : 'Published (demo data)';
  const liveCopy = isZh ? '查看发布后页面、流量、支付、归因与分析数据。' : 'Inspect pages, traffic, payments, tracking and analytics after publishing.';
  const option = function (profile, title, copy, selected) {
    return '<button type="button" class="shopify-store-profile' + (selected ? ' is-selected' : '') + '" data-action="switch-demo-profile" data-profile="' + profile + '" role="menuitemradio" aria-checked="' + selected + '"><span class="shopify-account">LL</span><span><strong>' + escapeHtml(title) + '</strong><small>' + escapeHtml(copy) + '</small></span>' + (selected ? '<b>✓</b>' : '') + '</button>';
  };
  const menu = state.ui.storeMenuOpen
    ? '<div class="shopify-store-menu" role="menu" aria-label="' + escapeHtml(menuLabel) + '"><header><strong>' + escapeHtml(menuLabel) + '</strong><small>' + escapeHtml(isZh ? '用于原型验收，不会改变真实店铺。' : 'Prototype states only; no real store is changed.') + '</small></header>' + option('installed', installedTitle, installedCopy, installed) + option('live', liveTitle, liveCopy, !installed) + '</div>'
    : '';
  return '<div class="shopify-store-switcher"><button type="button" class="shopify-store-trigger" data-action="toggle-store-menu" aria-haspopup="menu" aria-expanded="' + state.ui.storeMenuOpen + '"><span class="shopify-account">LL</span><span><strong>Lavender Labs</strong><small>' + escapeHtml(currentState) + '</small></span><i>' + icon('chevron', 14) + '</i></button>' + menu + '</div>';
}

function renderAppNav(activeName) {
  return APP_NAV.map(function (item) {
    const active = item.id === activeName;
    return '<button type="button" class="app-nav-item' + (active ? ' is-active' : '') + '" data-route="' + item.id + '"' + (active ? ' aria-current="page"' : '') + '>' + icon(item.icon, 17) + '<span>' + escapeHtml(item.label) + '</span></button>';
  }).join('');
}

function isEditorRoute(route) {
  return (route.segments[0] === 'pages' && route.segments[2] === 'edit') ||
    (route.segments[0] === 'funnels' && route.segments[2] === 'nodes' && route.segments[4] === 'edit');
}

function focusScopeForRoute(route) {
  if (isEditorRoute(route)) return 'editor';
  if (route.segments[0] === 'funnels' && route.segments[1]) return 'canvas';
  return null;
}

function syncUiFromRoute(route) {
  if (route.segments[0] !== 'funnels') return;
  const funnelId = route.segments[1] || route.query.get('funnel');
  const nodeId = route.query.get('node');
  const funnel = funnelId ? state.funnels.find(function (item) { return item.id === funnelId; }) : null;
  if (funnel) state.ui.activeFunnelId = funnel.id;
  if (funnel && nodeId && funnel.nodes.some(function (item) { return item.id === nodeId; })) state.ui.activeNodeId = nodeId;
}

function renderShopifyChrome(pageMarkup, route) {
  const activeName = getRouteName(route);
  const editorMode = isEditorRoute(route);
  const focusScope = focusScopeForRoute(route);
  // App Window is opt-in per route. Never let a previous canvas/editor state cover a normal admin page.
  const focusActive = Boolean(focusScope && route.query.get('appWindow') === 'open');
  const appNav = renderAppNav(activeName);
  const languageSwitcher = renderLanguageSwitcher(state.ui.locale, state.ui.languageOpen);
  const storeSwitcher = renderStoreSwitcher();
  const shopifyPrimary = staticNavItem('home', 'Home') +
    staticNavItem('orders', 'Orders', '649') +
    staticNavItem('products', 'Products') +
    staticNavItem('user', 'Customers') +
    staticNavItem('analytics', 'Growth') +
    staticNavItem('products', 'Discounts') +
    staticNavItem('pages', 'Content') +
    staticNavItem('globe', 'Markets') +
    staticNavItem('card', 'Finance') +
    staticNavItem('analytics', 'Analytics');
  const appTitle = '<div class="shopify-app-title"><button type="button" class="shopify-app-home' + (activeName === 'home' ? ' is-home' : '') + '" data-route="home"' + (activeName === 'home' ? ' aria-current="page"' : '') + '><span class="bestcheckout-mark">B</span><strong>BestCheckout</strong></button><span class="shopify-more-static" aria-hidden="true">' + icon('more', 16) + '</span></div>';
  const fullscreenLabel = focusScope === 'canvas' ? 'Full-screen canvas' : 'Full-screen editor';
  const exitFullscreenLabel = focusScope === 'canvas' ? 'Exit full-screen canvas' : 'Exit full-screen editor';
  const focusToggle = focusScope === 'canvas' && !focusActive
    ? '<button type="button" class="focus-mode-toggle" data-action="toggle-focus-mode" data-focus-scope="' + focusScope + '" aria-pressed="false">' + icon('expand', 16) + '<span>' + escapeHtml(translate(fullscreenLabel, state.ui.locale)) + '</span></button>'
    : '';
  const exitAction = editorMode ? 'exit-editor-window' : 'toggle-focus-mode';
  const exitLabel = editorMode ? (state.ui.locale === 'zh' ? '返回页面库' : 'Back to Pages') : exitFullscreenLabel;
  const appWindowBar = focusActive
    ? '<header class="app-window-hostbar" data-i18n-skip><div class="app-window-hostbrand"><span class="shopify-glyph">S</span><strong>shopify</strong><span class="app-window-hostdivider"></span><strong>BestCheckout</strong><span class="app-window-hosttitle">' + escapeHtml(translate(editorMode ? 'Checkout editor' : 'Funnel canvas', state.ui.locale)) + '</span></div><button type="button" class="app-window-exit" data-action="' + exitAction + '" data-focus-scope="' + focusScope + '">' + icon('back', 16) + '<span>' + escapeHtml(translate(exitLabel, state.ui.locale)) + '</span></button></header>'
    : '';
  return '<button type="button" class="skip-link" data-action="skip-content">Skip to content</button>' +
    '<div class="shopify-admin' + (focusActive ? ' is-focus-mode is-focus-' + focusScope : '') + '">' + appWindowBar +
      '<header class="shopify-topbar" data-i18n-skip>' +
        '<div class="shopify-brand"><span class="shopify-glyph">S</span><strong>shopify</strong></div>' +
        '<div class="shopify-search" aria-disabled="true">' + icon('search', 16) + '<span>Search</span><kbd>Ctrl</kbd><kbd>K</kbd></div>' +
        '<div class="shopify-top-actions"><span class="shopify-top-static">?</span><span class="shopify-top-static shopify-notification-static">' + icon('alert', 16) + '<i></i></span>' + storeSwitcher + '</div>' +
      '</header>' +
      '<div class="shopify-body">' +
        '<aside class="shopify-sidebar" aria-label="Shopify Admin">' +
          '<nav class="shopify-primary-nav">' +
            '<div data-i18n-skip>' + shopifyPrimary + '</div>' +
            '<div class="shopify-nav-section" data-i18n-skip><span class="shopify-section-label">Sales channels</span>' + staticNavItem('store', 'Online Store') + '</div>' +
            '<div class="shopify-app-context"><span class="shopify-section-label" data-i18n-skip>Apps</span>' + appTitle + '<div class="app-nav">' + appNav + '</div></div>' +
          '</nav>' +
          '<div class="shopify-sidebar-footer" data-i18n-skip>' + staticNavItem('settings', 'Settings') + '</div>' +
        '</aside>' +
        '<section class="embedded-app' + (editorMode ? ' embedded-app-editor' : '') + (focusActive ? ' embedded-app-focus' : '') + '">' +
          '<header class="embedded-titlebar" data-i18n-skip><button type="button" class="embedded-app-home" data-route="home"><span class="bestcheckout-mark">B</span><strong>BestCheckout</strong></button><div class="embedded-title-actions">' + (focusActive ? '' : focusToggle) + '<div class="mobile-language-widget">' + languageSwitcher + '</div><span class="shopify-more-static">' + icon('more', 18) + '</span></div></header>' +
          '<nav class="mobile-app-nav" aria-label="BestCheckout navigation">' + appNav + '</nav>' +
          '<main id="page-root" class="page-root' + (editorMode ? ' page-root-editor' : '') + '" tabindex="-1">' + pageMarkup + '</main>' +
          '<div class="desktop-language-floating" data-i18n-skip>' + languageSwitcher + '</div>' +
        '</section>' +
      '</div>' +
    '</div>';
}

function pageForRoute(route) {
  const isEditor = isEditorRoute(route);
  if (isEditor) return renderEditor(state, route);
  const name = getRouteName(route);
  if (name === 'funnels') return renderFunnels(state, route);
  if (name === 'pages') return renderPages(state);
  if (name === 'performance') return renderPerformance(state);
  if (name === 'activity') return renderActivity(state);
  if (name === 'settings') return renderSettings(state, route);
  return renderHome(state);
}

function renderShell(options) {
  enforceWritebackCircuit();
  const route = parseRoute();
  if (isEditorRoute(route) && route.query.get('appWindow') !== 'open') {
    route.query.set('appWindow', 'open');
    setRoute(route.path + '?' + route.query.toString());
    return;
  }
  const focusScope = focusScopeForRoute(route);
  state.ui.focusMode = route.query.get('appWindow') === 'open' && focusScope ? focusScope : null;
  syncUiFromRoute(route);
  appRoot.innerHTML = renderShopifyChrome(pageForRoute(route), route);
  applyLocale(appRoot, state.ui.locale);
  if (isEditorRoute(route)) {
    mountEditor(appRoot, state, route, { setRoute: setRoute, showToast: showToast, renderShell: renderShell, openPreview: openEditorPreview });
  }
  const activeMobileNav = appRoot.querySelector('.mobile-app-nav .app-nav-item.is-active');
  if (window.matchMedia('(max-width: 980px)').matches && activeMobileNav && typeof activeMobileNav.scrollIntoView === 'function') activeMobileNav.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (options && options.focus) {
    const main = document.getElementById('page-root');
    if (main) main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  lastRenderedHash = window.location.hash;
  lastRenderedWasEditor = isEditorRoute(route);
}

function showToast(message, tone) {
  window.clearTimeout(toastTimer);
  const iconName = tone === 'critical' ? 'alert' : tone === 'info' ? 'shield' : 'check';
  toastRoot.innerHTML = '<div class="toast toast-' + (tone || 'success') + '" role="status">' + icon(iconName, 17) + '<span>' + escapeHtml(translate(message, state.ui.locale)) + '</span><button type="button" aria-label="Dismiss" data-action="dismiss-toast">×</button></div>';
  toastTimer = window.setTimeout(function () { toastRoot.innerHTML = ''; }, 4200);
}

function openModal(markup) {
  modalReturnFocus = document.activeElement;
  modalRoot.innerHTML = markup;
  appRoot.setAttribute('aria-hidden', 'true');
  appRoot.inert = true;
  document.body.classList.add('modal-open');
  applyLocale(modalRoot, state.ui.locale);
  const first = modalRoot.querySelector('input, select, button');
  if (first) first.focus();
}

function closeModal() {
  modalRoot.innerHTML = '';
  appRoot.removeAttribute('aria-hidden');
  appRoot.inert = false;
  document.body.classList.remove('modal-open');
  if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') modalReturnFocus.focus();
  modalReturnFocus = null;
}

function activeFunnel() {
  return state.funnels.find(function (item) { return item.id === state.ui.activeFunnelId; }) || state.funnels[0];
}

function openEditorPreview(context) {
  const funnel = context.funnel || state.funnels.find(function (item) {
    return item.nodes.some(function (node) { return node.pageId === context.page.id; });
  }) || activeFunnel();
  if (!funnel) {
    showToast('Create a Funnel before starting a buyer-session preview.', 'info');
    return;
  }
  state.ui.activeFunnelId = funnel.id;
  state.ui.previewFunnelStep = context.node && context.node.kind ? context.node.kind : 'checkout';
  openModal(renderFunnelPreviewModal(state, funnel, state.ui.previewFunnelStep));
}

function buildDeploymentSnapshot(funnel) {
  const payload = buildRuntimePayload(state, funnel);
  const payloadHash = deterministicPayloadHash(payload);
  const check = funnel.deploymentCheck;
  if (!check || check.expectedRevision !== funnel.draftRevisionId || check.checkedPayloadHash !== payloadHash) return null;
  const existing = (funnel.deploymentHistory || []).find(function (snapshot) {
    return snapshot.idempotencyKey === check.idempotencyKey && snapshot.nodes;
  });
  if (existing) return structuredClone(existing);
  return Object.assign({}, structuredClone(payload), {
    id: 'deploy_' + funnel.id.replace(/^funnel-/, '') + '_' + funnel.draftRevisionSequence + '_' + payloadHash.slice(-6),
    publishedAt: 'Just now',
    hostedTraffic: payload.allocation.hosted,
    nativeTraffic: payload.allocation.native,
    hashAlgorithm: 'prototype-fnv1a32',
    checkedPayloadHash: payloadHash,
    idempotencyKey: check.idempotencyKey,
  });
}

function markFunnelRevision(funnel, options) {
  funnel.draftRevisionSequence = (funnel.draftRevisionSequence || 0) + 1;
  funnel.draftRevisionId = 'fr_' + funnel.id + '_' + funnel.draftRevisionSequence;
  if (options && options.allocation) funnel.allocationVersion = (funnel.allocationVersion || 0) + 1;
  funnel.deploymentCheck = null;
  funnel.updated = 'Just now';
}

function checkoutRoutingForFunnel(funnel) {
  const checkouts = funnel.nodes.filter(function (node) { return node.kind === 'checkout'; });
  const saved = funnel.checkoutAllocations || {};
  const stored = saved.checkouts || {};
  const native = Number.isFinite(Number(saved.native)) ? Number(saved.native) : funnel.nativeTraffic;
  const fallbackHosted = Math.max(0, 100 - native);
  const hasStored = checkouts.some(function (node) { return Number.isFinite(Number(stored[node.id])); });
  const allocations = {};
  checkouts.forEach(function (node, index) {
    allocations[node.id] = Number.isFinite(Number(stored[node.id])) ? Number(stored[node.id]) : (!hasStored && index === 0 ? fallbackHosted : 0);
  });
  return { native: native, checkouts: allocations };
}

function addPageNodeToFunnel(funnel, page) {
  if (!funnel || !page || !['checkout', 'upsell', 'downsell', 'thank-you'].includes(page.type)) return null;
  const node = {
    id: page.type + '-' + Date.now(),
    kind: page.type,
    label: page.name,
    detail: page.publishedVersionId ? 'Ready for the next Funnel publish' : 'Publish this Page before the Funnel can go live',
    pageId: page.id,
    state: page.publishedVersionId ? 'Ready' : 'Draft',
  };
  let insertAt = funnel.nodes.length;
  if (page.type === 'checkout') {
    insertAt = funnel.nodes.reduce(function (last, item, index) { return item.kind === 'checkout' ? index + 1 : last; }, 1);
  } else if (page.type === 'upsell') {
    const lastUpsell = funnel.nodes.reduce(function (last, item, index) { return item.kind === 'upsell' ? index + 1 : last; }, -1);
    const lastCheckout = funnel.nodes.reduce(function (last, item, index) { return item.kind === 'checkout' ? index + 1 : last; }, 1);
    insertAt = lastUpsell >= 0 ? lastUpsell : lastCheckout;
  } else if (page.type === 'downsell') {
    const lastDownsell = funnel.nodes.reduce(function (last, item, index) { return item.kind === 'downsell' ? index + 1 : last; }, -1);
    const lastUpsell = funnel.nodes.reduce(function (last, item, index) { return item.kind === 'upsell' ? index + 1 : last; }, -1);
    insertAt = lastDownsell >= 0 ? lastDownsell : lastUpsell >= 0 ? lastUpsell : funnel.nodes.length;
  }
  funnel.nodes.splice(insertAt, 0, node);
  if (page.type === 'checkout') {
    const routing = checkoutRoutingForFunnel(funnel);
    routing.checkouts[node.id] = 0;
    funnel.checkoutAllocations = routing;
  }
  page.usedBy += 1;
  funnel.graphEdges = graphEdgesForNodes(funnel.nodes);
  markFunnelRevision(funnel);
  state.ui.activeFunnelId = funnel.id;
  state.ui.activeNodeId = node.id;
  return node;
}

function savePageDraft(page) {
  page.revisionSequence = Math.max(page.revisionSequence || 0, page.draftRevision || 0) + 1;
  page.draftRevision = page.revisionSequence;
  page.draftRevisionId = 'rev_' + page.id + '_' + page.revisionSequence;
  page.updated = 'Just now';
  page.status = page.publishedVersionId ? 'Draft changes' : 'Draft';
}

function currentEditorPage() {
  const route = parseRoute();
  let pageId = route.segments[0] === 'pages' ? route.segments[1] : null;
  if (!pageId && route.segments[0] === 'funnels') {
    const funnel = state.funnels.find(function (item) { return item.id === route.segments[1]; });
    const node = funnel ? funnel.nodes.find(function (item) { return item.id === route.segments[3]; }) : null;
    pageId = node ? node.pageId : null;
  }
  return state.pages.find(function (item) { return item.id === pageId; }) || null;
}

function visibleLanguageElement(selector) {
  return Array.from(appRoot.querySelectorAll(selector)).find(function (element) {
    return element.offsetParent !== null;
  }) || appRoot.querySelector(selector);
}

function focusVisibleLanguageElement(selector) {
  window.setTimeout(function () {
    const element = visibleLanguageElement(selector);
    if (element && typeof element.focus === 'function') element.focus();
  }, 0);
}

function collapseLanguageMenuMarkup() {
  appRoot.querySelectorAll('.language-menu').forEach(function (menu) { menu.remove(); });
  appRoot.querySelectorAll('.language-trigger').forEach(function (trigger) { trigger.setAttribute('aria-expanded', 'false'); });
}

function shopifyAccessIsReady() {
  return state.store.distributionStatus === 'Approved' &&
    state.store.checkoutSurfaceAuthorization === 'Approved' &&
    state.store.merchantAuthorization === 'Verified' &&
    state.store.planEligibility === 'Eligible' &&
    state.store.regionEligibility === 'Eligible';
}

function paymentBindingsAreReady(bindings, requiredMethods) {
  const healthyBindings = bindings.filter(function (binding) {
    const provider = state.providers.find(function (item) { return item.id === binding.providerId; });
    return provider && provider.status === 'Connected' &&
      binding.status === 'Verified' &&
      binding.authorizationState === 'Verified' &&
      binding.testPaymentState === 'Passed' &&
      binding.webhookState === 'Verified' &&
      binding.connectionRef &&
      binding.merchantAccountRef &&
      Array.isArray(binding.regions) &&
      Array.isArray(binding.currencies) &&
      Array.isArray(binding.methods);
  });
  if (!healthyBindings.length || !(requiredMethods || []).length) return false;
  return state.store.targetRegions.every(function (region) {
    return requiredMethods.every(function (method) {
      return healthyBindings.some(function (binding) {
        return binding.regions.includes(region) && binding.currencies.includes(state.store.checkoutCurrency) && binding.methods.includes(method);
      });
    });
  });
}

function cartAuthorityIsReady() {
  return state.store.cartHandoffValidation === 'Healthy' && state.store.authoritativePriceRefresh === 'Healthy';
}

function writebackIsReady() {
  return state.store.writebackCreateSuccessRate >= 99.9 &&
    state.store.writebackBacklog <= state.store.writebackMaxBacklog &&
    state.store.writebackOldestAgeMinutes <= state.store.writebackMaxAgeMinutes;
}

function enforceWritebackCircuit() {
  const open = !writebackIsReady();
  const previousState = state.store.writebackCircuitState;
  state.store.writebackCircuitState = open ? 'Open' : 'Closed';
  state.store.newHostedSessionsPolicy = open ? 'Shopify native before payment' : 'Allowed';
  if (open && !state.store.writebackCircuitOpenedAt) state.store.writebackCircuitOpenedAt = 'Just now';
  if (!open) state.store.writebackCircuitOpenedAt = null;
  if (open && previousState !== 'Open') {
    state.activity.unshift({
      id: 'evt-circuit-open-' + Date.now(),
      category: 'writeback',
      title: 'Writeback circuit opened',
      detail: 'New hosted sessions moved to Shopify native before payment. Existing paid orders continue finalization and reconciliation.',
      status: 'Action required',
      actor: 'Runtime circuit breaker',
      time: 'Just now',
      reference: state.store.writebackCircuitBreakerRef,
      phase: 'new_sessions_native_existing_orders_reconcile',
      attempt: 1,
      idempotency: 'Not applicable',
      integrity: 'No paid session was redirected or charged again',
    });
  }
  if (!open && previousState === 'Open') {
    state.activity.unshift({
      id: 'evt-circuit-closed-' + Date.now(),
      category: 'writeback',
      title: 'Writeback circuit closed',
      detail: 'Healthy thresholds recovered. New hosted sessions resumed the last healthy Deployment allocation.',
      status: 'Recovered',
      actor: 'Runtime circuit breaker',
      time: 'Just now',
      reference: state.store.writebackCircuitBreakerRef,
      phase: 'runtime_allocation_restored',
      attempt: 1,
      idempotency: 'Not applicable',
      integrity: 'Saved draft allocation and in-flight orders remained unchanged',
    });
  }
  state.funnels.forEach(function (funnel) {
    if (open && funnel.status === FUNNEL_STATUS.LIVE && funnel.deploymentSnapshot) {
      funnel.runtimeOverride = 'writeback_circuit_open';
      funnel.runtimeTraffic = { hosted: 0, native: 100 };
      return;
    }
    if (!open && funnel.runtimeOverride === 'writeback_circuit_open') {
      const allocation = funnel.deploymentSnapshot && (funnel.deploymentSnapshot.allocation || {
        hosted: funnel.deploymentSnapshot.hostedTraffic,
        native: funnel.deploymentSnapshot.nativeTraffic,
      });
      if (funnel.status === FUNNEL_STATUS.LIVE && allocation) funnel.runtimeTraffic = { hosted: allocation.hosted, native: allocation.native };
      funnel.runtimeOverride = null;
    }
  });
}

function appEmbedIsReady() {
  return state.store.appEmbed === 'Verified' &&
    Array.isArray(state.store.embedEntryChecks) &&
    state.store.embedEntryChecks.length > 0 &&
    state.store.embedEntryChecks.every(function (item) { return item.state === 'Verified'; });
}

function runtimeReferencesAreReady(nodes) {
  return nodes.filter(function (node) { return node.kind === 'upsell' || node.kind === 'downsell'; }).every(function (node) {
    const offer = state.offerVersions.find(function (item) { return item.id === node.offerRuleRef; });
    const recommendation = state.recommendationRuleVersions.find(function (item) { return item.id === node.recommendationRuleRef; });
    const variant = offer && state.offerCatalogVariants.find(function (item) { return item.id === offer.targetVariantId; });
    const sourcesReady = recommendation && recommendation.sourceProductIds.every(function (id) {
      return state.offerSourceProducts.some(function (item) { return item.id === id; });
    });
    return offer && offer.status === 'Published' && offer.schemaVersion === 'bestcheckout.offer.v1' && offer.kind === node.kind &&
      variant && variant.mapped && variant.inventoryState === 'Available' && offer.markets.every(function (market) { return variant.markets.includes(market) && state.store.targetRegions.includes(market); }) &&
      offer.pricing && ['fixed', 'discount'].includes(offer.pricing.type) && offer.pricing.currency === state.store.checkoutCurrency && Number(offer.pricing.amount) > 0 && offer.inventoryPolicyRef && offer.paymentEligibilityPolicyRef &&
      recommendation && recommendation.status === 'Published' && recommendation.schemaVersion === 'bestcheckout.recommendation.v1' &&
      recommendation.candidateOfferVersionIds.includes(offer.id) && offer.markets.every(function (market) { return recommendation.markets.includes(market); }) && sourcesReady;
  });
}

function publishConfiguredOfferVersions(node, config) {
  const nextOffer = {
    id: node.offerRuleRef,
    schemaVersion: 'bestcheckout.offer.v1',
    status: 'Published',
    kind: node.kind,
    trigger: { after: node.kind === 'upsell' ? 'base_payment_captured' : 'upsell_declined' },
    targetVariantId: config.targetVariantId,
    pricing: { type: 'fixed', currency: state.store.checkoutCurrency, amount: config.price },
    inventoryPolicyRef: 'inventory_authoritative_v1',
    markets: config.markets,
    paymentEligibilityPolicyRef: 'postpurchase_runtime_v2',
  };
  const existingOffer = state.offerVersions.find(function (item) { return item.id === node.offerRuleRef; });
  if (existingOffer) Object.assign(existingOffer, nextOffer);
  else state.offerVersions.push(nextOffer);
  const nextRecommendation = {
    id: node.recommendationRuleRef,
    schemaVersion: 'bestcheckout.recommendation.v1',
    status: 'Published',
    strategy: node.kind === 'upsell' ? 'manual_priority' : 'decline_recovery',
    sourceProductIds: [config.sourceProductId],
    candidateOfferVersionIds: [node.offerRuleRef],
    markets: config.markets,
  };
  const existingRecommendation = state.recommendationRuleVersions.find(function (item) { return item.id === node.recommendationRuleRef; });
  if (existingRecommendation) Object.assign(existingRecommendation, nextRecommendation);
  else state.recommendationRuleVersions.push(nextRecommendation);
}

function deploymentResumeBlockers(funnel) {
  const snapshot = funnel.deploymentSnapshot;
  if (!snapshot) return ['deployment'];
  const allocation = snapshot.allocation || { hosted: snapshot.hostedTraffic, native: snapshot.nativeTraffic };
  const surface = snapshot.surface || {};
  const currentRegions = (state.store.targetRegions || []).slice().sort();
  const snapshotRegions = (surface.targetRegions || []).slice().sort();
  const surfaceReady = surface.mode === state.store.checkoutSurfaceMode &&
    surface.version === state.store.checkoutSurfaceVersion &&
    surface.distributionMode === state.store.distributionMode &&
    surface.accessPolicyRef === state.store.shopifyAccessPolicyRef &&
    surface.merchantAuthorizationRef === state.store.merchantAuthorizationRef &&
    surface.planEligibilityRef === state.store.planEligibilityRef &&
    surface.appEmbedVerificationRef === state.store.appEmbedVerificationRef &&
    surface.checkoutOrigin === 'https://' + state.store.domain &&
    JSON.stringify(snapshotRegions) === JSON.stringify(currentRegions);
  const pagesReady = snapshot.nodes.filter(function (node) { return node.pageId; }).every(function (node) { return node.pinnedVersionId; });
  const graphReady = validateGraphCoverage(snapshot.nodes, snapshot.graphEdges).ready && runtimeReferencesAreReady(snapshot.nodes);
  const blockers = [];
  if (snapshot.schemaVersion !== FUNNEL_DEPLOYMENT_SCHEMA_VERSION) blockers.push('schema');
  if (!allocation || allocation.hosted <= 0 || allocation.native < 5) blockers.push('traffic');
  if (!pagesReady) blockers.push('pages');
  if (!graphReady) blockers.push('graph');
  if (!surfaceReady) blockers.push('surface');
  if (!shopifyAccessIsReady()) blockers.push('shopifyAccess');
  if (!snapshot.paymentRoute || snapshot.paymentRoute.checkoutCurrency !== state.store.checkoutCurrency || !paymentBindingsAreReady(snapshot.paymentRoute.bindings || [], snapshot.paymentRoute.requiredMethods || [])) blockers.push('payment');
  if (!cartAuthorityIsReady()) blockers.push('inventory');
  if (!writebackIsReady()) blockers.push('writeback');
  if (state.store.domainStatus !== 'Verified') blockers.push('domain');
  if (!appEmbedIsReady()) blockers.push('embed');
  return blockers;
}

function revalidateFunnel(funnel) {
  const paymentRouteReady = paymentBindingsAreReady(funnel.paymentRouteBindings || [], funnel.requiredPaymentMethods || []);
  const hasPublishedPages = funnel.nodes.filter(function (node) { return node.pageId; }).every(function (node) {
    const page = state.pages.find(function (item) { return item.id === node.pageId; });
    return page && page.publishedVersionId;
  });
  const graphReady = validateGraphCoverage(funnel.nodes, funnel.graphEdges || graphEdgesForNodes(funnel.nodes)).ready && runtimeReferencesAreReady(funnel.nodes);
  funnel.guardrails.traffic = funnel.hostedTraffic > 0 && funnel.nativeTraffic >= 5 ? 'Ready' : 'Blocked';
  funnel.guardrails.pages = hasPublishedPages ? 'Ready' : 'Blocked';
  funnel.guardrails.graph = graphReady ? 'Ready' : 'Blocked';
  funnel.guardrails.payment = paymentRouteReady ? 'Ready' : 'Blocked';
  funnel.guardrails.inventory = cartAuthorityIsReady() ? 'Ready' : 'Blocked';
  funnel.guardrails.writeback = writebackIsReady() ? 'Ready' : 'Blocked';
  funnel.guardrails.shopifyAccess = shopifyAccessIsReady() ? 'Ready' : 'Blocked';
  funnel.guardrails.domain = state.store.domainStatus === 'Verified' ? 'Ready' : 'Blocked';
  funnel.guardrails.embed = appEmbedIsReady() ? 'Ready' : 'Blocked';
  funnel.guardrails.tracking = state.tracking.every(function (item) { return item.state === 'Healthy'; }) ? 'Ready' : 'Review needed';
  const payload = buildRuntimePayload(state, funnel);
  const checkedPayloadHash = deterministicPayloadHash(payload);
  funnel.deploymentCheck = {
    expectedRevision: funnel.draftRevisionId,
    checkedPayloadHash: checkedPayloadHash,
    snapshotHash: checkedPayloadHash,
    idempotencyKey: 'publish:' + funnel.id + ':' + funnel.draftRevisionId + ':' + checkedPayloadHash,
    checkedAt: 'Just now',
  };
}

function blockingGuardrails(funnel) {
  return Object.keys(funnel.guardrails).filter(function (key) {
    return key !== 'fallback' && funnel.guardrailSeverity[key] === 'block' && !['Ready', 'Healthy'].includes(funnel.guardrails[key]);
  });
}

function actionElement(event) {
  return event.target.closest('[data-action]');
}

function initialAudienceForPreset(preset, locale) {
  const isZh = locale === 'zh';
  const rule = function (field, operator, value, fieldLabel, operatorLabel, shortLabel) {
    return { field: field, operator: operator, value: value, fieldLabel: fieldLabel, operatorLabel: operatorLabel, shortLabel: shortLabel };
  };
  const labels = isZh
    ? {
      cartItems: ['购物车商品数', '至少为', '商品数'], cartTotal: ['购物车金额', '至少为', '购物车'], country: ['国家或地区', '属于任一项', '市场'],
      utmSource: ['UTM 来源', '包含', 'UTM 来源'], signedIn: ['登录状态', '是', '账号'], pastOrders: ['历史订单数', '至少为', '订单'],
    }
    : {
      cartItems: ['Cart item count', 'is at least', 'Items'], cartTotal: ['Cart total', 'is at least', 'Cart'], country: ['Country or region', 'is one of', 'Market'],
      utmSource: ['UTM source', 'contains', 'UTM source'], signedIn: ['Signed-in status', 'is', 'Account'], pastOrders: ['Past orders', 'is at least', 'Orders'],
    };
  const from = function (key, field, operator, value) {
    return rule(field, operator, value, labels[key][0], labels[key][1], labels[key][2]);
  };
  const presets = {
    all_carts: [from('cartItems', 'cart_items', 'at_least', '1')],
    cart_value: [from('cartTotal', 'cart_total', 'at_least', '$60')],
    market_device: [from('country', 'country', 'one_of', isZh ? '美国, 加拿大' : 'United States, Canada')],
    campaign: [from('utmSource', 'utm_source', 'contains', 'facebook')],
    known_customer: [from('signedIn', 'logged_in', 'is', isZh ? '已登录' : 'Signed in'), from('pastOrders', 'past_orders', 'at_least', '1')],
    custom: [from('cartItems', 'cart_items', 'at_least', '1')],
  };
  const conditions = presets[preset] || presets.all_carts;
  return {
    conditions: conditions,
    audience: conditions.map(function (item) { return item.shortLabel + ' ' + item.operatorLabel + ' ' + item.value; }).join(' · '),
  };
}

function handleAction(action, element) {
  if (action === 'canvas-fit' || action === 'canvas-zoom-out' || action === 'canvas-zoom-in') {
    const current = Number(state.ui.canvasZoom) || 0.82;
    state.ui.canvasZoom = action === 'canvas-fit' ? 1 : Math.max(0.65, Math.min(1.2, Number((current + (action === 'canvas-zoom-in' ? 0.1 : -0.1)).toFixed(2))));
    renderShell({ focus: true });
    return;
  }
  if (action === 'exit-editor-window') {
    const route = parseRoute();
    const target = route.segments[0] === 'funnels'
      ? 'funnels/' + (route.segments[1] || state.ui.activeFunnelId) + (route.segments[3] ? '?node=' + route.segments[3] : '')
      : 'pages';
    if (state.ui.editorDirty) {
      openModal(renderUnsavedChangesModal(target));
      return;
    }
    setRoute(target);
    return;
  }
  if (action === 'toggle-focus-mode') {
    const route = parseRoute();
    const scope = element.dataset.focusScope;
    if (!scope || scope !== focusScopeForRoute(route)) return;
    const opening = state.ui.focusMode !== scope;
    state.ui.focusMode = opening ? scope : null;
    state.ui.languageOpen = false;
    if (opening) route.query.set('appWindow', 'open');
    else route.query.delete('appWindow');
    setRoute(route.path + (route.query.toString() ? '?' + route.query.toString() : ''));
    return;
  }
  if (action === 'skip-content') {
    const main = document.getElementById('page-root');
    if (main) main.focus();
    return;
  }
  if (action === 'toggle-store-menu') {
    state.ui.storeMenuOpen = !state.ui.storeMenuOpen;
    state.ui.languageOpen = false;
    renderShell();
    return;
  }
  if (action === 'switch-demo-profile') {
    const profile = element.dataset.profile === 'live' ? 'live' : 'installed';
    const locale = state.ui.locale;
    state = createMockBestCheckoutState(profile);
    state.ui.locale = locale;
    state.ui.storeMenuOpen = false;
    renderShell({ focus: true });
    showToast(profile === 'live'
      ? (locale === 'zh' ? '已切换到「已上线」示例店铺，展示运营数据。' : 'Switched to the live store example with operating data.')
      : (locale === 'zh' ? '已恢复安装完成后的初始状态：所有模板均为草稿。' : 'Restored the post-installation initial state. All templates are drafts.'));
    return;
  }
  if (action === 'toggle-language-menu') {
    state.ui.languageOpen = !state.ui.languageOpen;
    renderShell();
    focusVisibleLanguageElement(state.ui.languageOpen ? '.language-option[aria-checked="true"]' : '.language-trigger');
    return;
  }
  if (action === 'dismiss-toast') {
    toastRoot.innerHTML = '';
    return;
  }
  if (action === 'close-modal') {
    closeModal();
    return;
  }
  if (action === 'open-create-funnel') {
    state.ui.funnelWizard = { path: 'upsell' };
    openModal(renderCreateFunnelModal('goal', state.ui.funnelWizard, state.ui.locale));
    return;
  }
  if (action === 'back-create-funnel') {
    openModal(renderCreateFunnelModal('goal', state.ui.funnelWizard || { path: 'upsell' }, state.ui.locale));
    return;
  }
  if (action === 'filter-funnels') {
    state.ui.funnelStatusFilter = element.dataset.filter;
    renderShell();
    return;
  }
  if (action === 'select-funnel') {
    state.ui.activeFunnelId = element.dataset.funnelId;
    const funnel = activeFunnel();
    state.ui.activeNodeId = funnel.nodes[0] ? funnel.nodes[0].id : null;
    setRoute('funnels/' + funnel.id);
    return;
  }
  if (action === 'select-node') {
    state.ui.activeNodeId = element.dataset.nodeId;
    renderShell();
    return;
  }
  if (action === 'edit-node') {
    const funnelId = element.dataset.funnelId || state.ui.activeFunnelId;
    const nodeId = element.dataset.nodeId || state.ui.activeNodeId;
    // Page-design entries open in Shopify App Window rather than the embedded editor view.
    if (funnelId && nodeId) setRoute('funnels/' + funnelId + '/nodes/' + nodeId + '/edit?appWindow=open');
    return;
  }
  if (action === 'select-node-page') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    const node = funnel.nodes.find(function (item) { return item.id === element.dataset.nodeId; });
    if (node && node.pageId) openModal(renderSelectNodePageModal(state, funnel, node));
    return;
  }
  if (action === 'edit-page') {
    setRoute('pages/' + element.dataset.pageId + '/edit?appWindow=open');
    return;
  }
  if (action === 'filter-pages') {
    state.ui.pageTypeFilter = element.dataset.filter;
    renderShell();
    return;
  }
  if (action === 'duplicate-page') {
    const source = state.pages.find(function (item) { return item.id === element.dataset.pageId; });
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = 'page-' + Date.now();
    copy.name = source.name + ' copy';
    copy.status = 'Draft';
    copy.version = 0;
    copy.publishedVersionId = null;
    copy.revisionSequence = 1;
    copy.draftRevision = 1;
    copy.draftRevisionId = 'rev_' + copy.id + '_1';
    copy.updated = 'Just now';
    copy.usedBy = 0;
    copy.metric = '—';
    copy.change = 'Not live';
    state.pages.unshift(copy);
    state.ui.pageActionMenuId = null;
    renderShell();
    showToast('Page duplicated as a new draft.');
    return;
  }
  if (action === 'create-page') {
    openModal(renderCreatePageModal());
    return;
  }
  if (action === 'page-more') {
    state.ui.pageActionMenuId = state.ui.pageActionMenuId === element.dataset.pageId ? null : element.dataset.pageId;
    renderShell();
    return;
  }
  if (action === 'rename-page') {
    const page = state.pages.find(function (item) { return item.id === element.dataset.pageId; });
    if (page) openModal(renderRenamePageModal(page));
    return;
  }
  if (action === 'show-page-versions') {
    const page = state.pages.find(function (item) { return item.id === element.dataset.pageId; });
    if (page) openModal(renderPageVersionHistoryModal(page));
    return;
  }
  if (action === 'archive-page') {
    const page = state.pages.find(function (item) { return item.id === element.dataset.pageId; });
    if (page) openModal(renderArchivePageModal(page));
    return;
  }
  if (action === 'open-shared-styles') {
    state.ui.editorSection = 'brand';
    setRoute('pages/page-aura-checkout/edit?appWindow=open');
    return;
  }
  if (action === 'show-portability') {
    openModal(renderInfoModal('portability'));
    return;
  }
  if (action === 'show-editor-architecture') {
    openModal(renderInfoModal('architecture'));
    return;
  }
  if (action === 'show-capability-rules') {
    openModal(renderInfoModal('capability'));
    return;
  }
  if (action === 'show-installation') {
    openModal(renderInstallationModal(state.ui.locale));
    return;
  }
  if (action === 'edit-traffic') {
    openModal(renderCheckoutExperimentModal(state, activeFunnel()));
    return;
  }
  if (action === 'edit-checkout-routing') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    openModal(renderCheckoutExperimentModal(state, funnel));
    return;
  }
  if (action === 'edit-funnel-entry') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    openModal(renderFunnelEntryModal(state, funnel));
    return;
  }
  if (action === 'add-audience-rule') {
    const modal = element.closest('.modal');
    const list = modal && modal.querySelector('[data-audience-rule-list]');
    const template = modal && modal.querySelector('template[data-audience-rule-template]');
    if (!list || !template) return;
    list.insertAdjacentHTML('beforeend', template.innerHTML);
    const field = list.lastElementChild && list.lastElementChild.querySelector('[data-audience-field]');
    if (field) field.focus();
    return;
  }
  if (action === 'remove-audience-rule') {
    const row = element.closest('[data-audience-rule]');
    const list = row && row.parentElement;
    if (!row || !list) return;
    if (list.querySelectorAll('[data-audience-rule]').length === 1) {
      showToast(state.ui.locale === 'zh' ? '至少保留一个受众条件。' : 'Keep at least one audience condition.', 'critical');
      return;
    }
    row.remove();
    return;
  }
  if (action === 'add-journey-page') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    if (funnel) openModal(renderAddJourneyPageModal(state, funnel, element.dataset.pageKind));
    return;
  }
  if (action === 'remove-journey-page') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    const node = funnel && funnel.nodes.find(function (item) { return item.id === element.dataset.nodeId; });
    if (!funnel || !node) return;
    const sameKind = funnel.nodes.filter(function (item) { return item.kind === node.kind; });
    if (['checkout', 'thank-you'].includes(node.kind) && sameKind.length <= 1) {
      showToast(state.ui.locale === 'zh' ? '漏斗中至少保留一个此类型页面。' : 'Keep at least one page of this type in the Funnel.', 'critical');
      return;
    }
    openModal(renderRemoveJourneyPageModal(funnel, node, state.ui.locale));
    return;
  }
  if (action === 'confirm-remove-journey-page') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; });
    const node = funnel && funnel.nodes.find(function (item) { return item.id === element.dataset.nodeId; });
    if (!funnel || !node) return;
    const sameKind = funnel.nodes.filter(function (item) { return item.kind === node.kind; });
    if (['checkout', 'thank-you'].includes(node.kind) && sameKind.length <= 1) {
      closeModal();
      showToast(state.ui.locale === 'zh' ? '漏斗中至少保留一个此类型页面。' : 'Keep at least one page of this type in the Funnel.', 'critical');
      return;
    }
    const page = node.pageId ? state.pages.find(function (item) { return item.id === node.pageId; }) : null;
    const removedCheckoutAllocation = node.kind === 'checkout' && funnel.checkoutAllocations && funnel.checkoutAllocations.checkouts
      ? Number(funnel.checkoutAllocations.checkouts[node.id] || 0)
      : 0;
    funnel.nodes = funnel.nodes.filter(function (item) { return item.id !== node.id; });
    if (page) page.usedBy = Math.max(0, Number(page.usedBy || 0) - 1);
    if (node.kind === 'checkout') {
      const routing = checkoutRoutingForFunnel(funnel);
      delete routing.checkouts[node.id];
      const replacement = funnel.nodes.find(function (item) { return item.kind === 'checkout'; });
      if (replacement && removedCheckoutAllocation > 0) routing.checkouts[replacement.id] = Number(routing.checkouts[replacement.id] || 0) + removedCheckoutAllocation;
      funnel.checkoutAllocations = routing;
    }
    funnel.graphEdges = graphEdgesForNodes(funnel.nodes);
    markFunnelRevision(funnel);
    revalidateFunnel(funnel);
    const fallbackNode = funnel.nodes.find(function (item) { return item.kind === node.kind; }) || funnel.nodes.find(function (item) { return item.kind === 'checkout'; }) || funnel.nodes[0];
    state.ui.activeNodeId = fallbackNode ? fallbackNode.id : null;
    closeModal();
    setRoute('funnels/' + funnel.id);
    showToast(state.ui.locale === 'zh' ? '页面已从当前漏斗移除，页面库中的原页面仍保留。' : 'Page removed from this Funnel. The original page remains in Pages.');
    return;
  }
  if (action === 'attach-journey-page') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; });
    const page = state.pages.find(function (item) { return item.id === element.dataset.pageId; });
    const node = addPageNodeToFunnel(funnel, page);
    if (!node) return;
    closeModal();
    setRoute('funnels/' + funnel.id);
    showToast(['upsell', 'downsell'].includes(node.kind) ? 'Page added. Set its product and rule before publishing.' : 'Page added to this Funnel draft.');
    return;
  }
  if (action === 'create-journey-page') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    if (funnel) openModal(renderCreatePageModal({ funnelId: funnel.id, type: element.dataset.pageKind, locale: state.ui.locale }));
    return;
  }
  if (action === 'add-offer') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    openModal(renderAddOfferModal(state, funnel, {
      kind: element.dataset.offerKind,
      afterNodeId: element.dataset.afterNode,
    }));
    return;
  }
  if (action === 'edit-offer') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    const node = funnel.nodes.find(function (item) { return item.id === element.dataset.nodeId; });
    if (node) openModal(renderAddOfferModal(state, funnel, { editNodeId: node.id }));
    return;
  }
  if (action === 'pause-funnel') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    funnel.status = FUNNEL_STATUS.PAUSED;
    funnel.runtimeTraffic = { hosted: 0, native: 100 };
    funnel.runtimeOverride = null;
    funnel.updated = 'Just now';
    state.activity.unshift({
      id: 'evt-pause-' + Date.now(),
      category: 'sync',
      title: 'Hosted traffic paused for new sessions',
      detail: 'New buyers use Shopify native checkout before payment. In-flight and paid sessions continue on deployment ' + (funnel.currentDeploymentId || 'not_recorded') + '.',
      status: 'Paused',
      actor: 'Merchant admin',
      time: 'Just now',
      reference: funnel.currentDeploymentId || funnel.id,
      phase: 'new_hosted_sessions_paused',
      attempt: 1,
      idempotency: 'Not applicable',
      integrity: 'Saved allocation preserved; no in-flight session was redirected',
    });
    renderShell();
    showToast('New hosted sessions paused. Saved allocation is preserved; in-flight and paid sessions continue safely.');
    return;
  }
  if (action === 'resume-last-deployment') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    if (!funnel.deploymentSnapshot) {
      showToast('No previous deployment is available. Publish the current draft first.', 'critical');
      return;
    }
    const resumeBlockers = deploymentResumeBlockers(funnel);
    if (resumeBlockers.length) {
      showToast('The last deployment cannot resume until its runtime health gates are ready.', 'critical');
      return;
    }
    const allocation = funnel.deploymentSnapshot.allocation || {
      hosted: funnel.deploymentSnapshot.hostedTraffic,
      native: funnel.deploymentSnapshot.nativeTraffic,
    };
    funnel.status = FUNNEL_STATUS.LIVE;
    funnel.currentDeploymentId = funnel.deploymentSnapshot.id;
    funnel.runtimeTraffic = { hosted: allocation.hosted, native: allocation.native };
    funnel.runtimeOverride = null;
    funnel.updated = 'Just now';
    renderShell();
    showToast('Last deployment resumed. Current draft changes remain unpublished.', 'success');
    return;
  }
  if (action === 'publish-funnel') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; }) || activeFunnel();
    state.ui.publishIntent = element.dataset.publishIntent || 'publish';
    revalidateFunnel(funnel);
    openModal(renderPublishModal(funnel, state.ui.publishIntent, state));
    return;
  }
  if (action === 'confirm-publish') {
    const funnel = state.funnels.find(function (item) { return item.id === element.dataset.funnelId; });
    if (!funnel) return;
    revalidateFunnel(funnel);
    const blockers = blockingGuardrails(funnel);
    if (blockers.length) {
      closeModal();
      renderShell();
      showToast('Publishing remains blocked. Resolve every required deployment gate and try again.', 'critical');
      return;
    }
    const deploymentSnapshot = buildDeploymentSnapshot(funnel);
    if (!deploymentSnapshot) {
      closeModal();
      revalidateFunnel(funnel);
      showToast('The funnel changed after validation. Review the new deployment check before publishing.', 'critical');
      return;
    }
    funnel.deploymentHistory = funnel.deploymentHistory || [];
    if (funnel.deploymentSnapshot && !funnel.deploymentHistory.some(function (item) { return item.id === funnel.deploymentSnapshot.id; })) {
      funnel.deploymentHistory.push(structuredClone(funnel.deploymentSnapshot));
    }
    if (!funnel.deploymentHistory.some(function (item) { return item.idempotencyKey === deploymentSnapshot.idempotencyKey; })) {
      funnel.deploymentHistory.push(structuredClone(deploymentSnapshot));
    }
    funnel.status = FUNNEL_STATUS.LIVE;
    funnel.nodes.forEach(function (node) {
      if (!node.pageId) return;
      const page = state.pages.find(function (item) { return item.id === node.pageId; });
      if (!page || !page.publishedVersionId) return;
      node.state = 'Ready';
      node.detail = 'Draft matches live deployment';
    });
    funnel.deploymentSnapshot = deploymentSnapshot;
    funnel.currentDeploymentId = deploymentSnapshot.id;
    funnel.runtimeTraffic = { hosted: funnel.hostedTraffic, native: funnel.nativeTraffic };
    funnel.runtimeOverride = null;
    funnel.updated = 'Just now';
    const publishIntent = state.ui.publishIntent;
    state.ui.publishIntent = null;
    closeModal();
    renderShell();
    showToast(publishIntent === 'publish-and-resume'
      ? 'Current draft published and traffic resumed with a new immutable deployment snapshot.'
      : 'Funnel published with a verified runtime contract and pinned page versions.');
    return;
  }
  if (action === 'open-blocking-settings') {
    const funnel = activeFunnel();
    closeModal();
    if (funnel.guardrails.traffic === 'Blocked') {
    openModal(renderCheckoutExperimentModal(state, funnel));
      return;
    }
    if (funnel.guardrails.pages === 'Blocked') {
      setRoute('pages');
      return;
    }
    if (funnel.guardrails.graph === 'Blocked') {
      closeModal();
      renderShell();
      showToast('Complete every Offer branch and terminal path before publishing.', 'critical');
      return;
    }
    if (funnel.guardrails.payment === 'Blocked') {
      setRoute('settings?tab=payments');
      return;
    }
    if (funnel.guardrails.inventory === 'Blocked') {
      setRoute('settings?tab=sync');
      return;
    }
    if (funnel.guardrails.domain === 'Blocked') {
      setRoute('settings?tab=domain');
      return;
    }
    if (funnel.guardrails.embed === 'Blocked') {
      setRoute('settings?tab=embed');
      return;
    }
    if (funnel.guardrails.writeback === 'Blocked') {
      setRoute('settings?tab=diagnostics');
      return;
    }
    if (funnel.guardrails.shopifyAccess === 'Blocked') {
      setRoute('settings?tab=diagnostics');
      return;
    }
    setRoute('settings?tab=attribution');
    return;
  }
  if (action === 'discard-and-route') {
    const targetRoute = element.dataset.targetRoute || 'pages';
    state.ui.editorDirty = false;
    closeModal();
    setRoute(targetRoute);
    return;
  }
  if (action === 'save-and-route') {
    const targetRoute = element.dataset.targetRoute || 'pages';
    const page = currentEditorPage();
    if (page) savePageDraft(page);
    state.ui.editorDirty = false;
    closeModal();
    setRoute(targetRoute);
    showToast('Draft revision saved before leaving the editor.');
    return;
  }
  if (action === 'preview-funnel') {
    state.ui.previewFunnelStep = 'checkout';
    openModal(renderFunnelPreviewModal(state, activeFunnel(), state.ui.previewFunnelStep));
    return;
  }
  if (action === 'preview-funnel-step') {
    state.ui.previewFunnelStep = element.dataset.step || 'checkout';
    openModal(renderFunnelPreviewModal(state, activeFunnel(), state.ui.previewFunnelStep));
    return;
  }
  if (action === 'onboarding-open-step') {
    closeModal();
    setRoute(element.dataset.targetRoute || 'home');
    return;
  }
  if (action === 'edit-rules') {
    openModal(renderFunnelEntryModal(state, activeFunnel()));
    return;
  }
  if (action === 'set-performance-tab') {
    state.ui.performanceTab = element.dataset.tab;
    renderShell();
    return;
  }
  if (action === 'view-activity-detail') {
    const event = state.activity.find(function (item) { return item.id === element.dataset.eventId; });
    if (event) openModal(renderActivityDetailModal(event));
    return;
  }
  if (action === 'connect-provider' || action === 'manage-provider') {
    state.ui.providerConnectionDraft = null;
    openModal(renderConnectProviderModal(state, element.dataset.providerId, 'select'));
    return;
  }
  if (action === 'provider-connect-back') {
    if (element.dataset.providerStep === 'select') state.ui.providerConnectionDraft = null;
    openModal(renderConnectProviderModal(state, element.dataset.providerId, element.dataset.providerStep));
    return;
  }
  if (action === 'provider-oauth-return') {
    const draft = state.ui.providerConnectionDraft;
    if (!draft || draft.providerId !== element.dataset.providerId || draft.authorizationState !== 'authorizing') {
      showToast('The authorization session is no longer valid. Start again from the provider selection.', 'critical');
      return;
    }
    draft.authorizationState = 'verified';
    draft.connectionRef = 'provider_connection_' + draft.providerId + '_' + Date.now();
    draft.merchantAccountRef = 'merchant_' + draft.providerId + '_verified';
    openModal(renderConnectProviderModal(state, draft.providerId, 'validate'));
    return;
  }
  if (action === 'provider-oauth-denied') {
    state.ui.providerConnectionDraft = null;
    openModal(renderConnectProviderModal(state, element.dataset.providerId, 'authorize'));
    showToast('Provider authorization was not completed. No payment connection was created.', 'info');
    return;
  }
  if (action === 'run-provider-validation') {
    const draft = state.ui.providerConnectionDraft;
    if (!draft || draft.providerId !== element.dataset.providerId || draft.authorizationState !== 'verified') {
      showToast('A verified authorization is required before running connection checks.', 'critical');
      return;
    }
    draft.validationState = 'passed';
    draft.validatedAt = 'Just now';
    openModal(renderConnectProviderModal(state, draft.providerId, 'validate'));
    return;
  }
  if (action === 'waitlist-provider') {
    showToast('Provider roadmap interest recorded for ' + element.dataset.providerId + '.', 'info');
    return;
  }
  if (action === 'review-tags') {
    openModal(renderTrackingReviewModal(state));
    return;
  }
  if (action === 'verify-app-embed') {
    openModal(renderAppEmbedModal(state));
    return;
  }
  if (action === 'sync-store') {
    state.store.lastSync = 'Just now';
    state.store.syncStatus = 'Healthy';
    renderShell();
    showToast('Shopify delta sync completed: no mapping gaps found.');
    return;
  }
  if (action === 'run-diagnostics') {
    state.ui.diagnosticsRanAt = formatDateTime(new Date(), state.ui.locale);
    renderShell();
    showToast('Diagnostics completed. One attribution review still needs merchant action.', 'info');
    return;
  }
  if (action === 'run-circuit-drill') {
    state.store.writebackBacklog = state.store.writebackMaxBacklog + 5;
    state.store.writebackOldestAgeMinutes = state.store.writebackMaxAgeMinutes + 2;
    renderShell();
    showToast('Circuit drill opened: new hosted sessions now use Shopify native before payment.', 'info');
    return;
  }
  if (action === 'restore-writeback-health') {
    state.store.writebackCreateSuccessRate = 99.98;
    state.store.writebackBacklog = 0;
    state.store.writebackOldestAgeMinutes = 0;
    renderShell();
    showToast('Writeback health restored. The last healthy Deployment allocation resumed.');
    return;
  }
  if (action === 'run-event-test') {
    const managed = state.tracking.find(function (item) { return item.id === 'bestcheckout'; });
    if (managed) managed.testState = 'Passed just now';
    renderShell();
    showToast('BestCheckout-managed browser/server event test passed. Discovered third-party destinations remain unchanged.', 'success');
    return;
  }
  if (action === 'open-theme-editor') {
    showToast('Production opens Shopify Theme Editor through an App Bridge external destination.', 'info');
    return;
  }
  if (action === 'review-shopify-policy') {
    showToast('See the local Shopify Custom App research note. Custom distribution does not itself waive checkout or payment restrictions.', 'info');
    return;
  }
  if (action === 'verify-domain') {
    state.store.domainStatus = 'Verified';
    state.store.sslStatus = 'Active';
    renderShell();
    showToast('DNS and SSL verification passed for ' + state.store.domain + '.');
    return;
  }
  if (action === 'connect-dns-provider') {
    state.store.dnsProvider = 'Cloudflare';
    state.store.domainConnection = 'Connected';
    state.store.domainStatus = 'Checking DNS';
    state.store.sslStatus = 'Provisioning';
    renderShell();
    showToast('DNS provider connected. BestCheckout is adding the checkout record and monitoring SSL.', 'success');
    return;
  }
  if (action === 'show-manual-domain-setup') {
    state.ui.domainSetupMode = 'manual';
    renderShell();
    return;
  }
  if (action === 'show-automatic-domain-setup') {
    state.ui.domainSetupMode = 'automatic';
    renderShell();
    return;
  }
  if (action === 'copy-preview-domain') {
    const previewAddress = 'https://' + (state.store.previewDomain || 'lavender-labs.preview.bestcheckout.app');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(previewAddress).catch(function () {});
    showToast('Preview address copied. It is safe for page and Funnel testing.', 'info');
    return;
  }
  if (action === 'copy-dns-record') {
    const record = 'CNAME\nHost: ' + state.store.domain.split('.')[0] + '\nTarget: shops.bestcheckout.app\nTTL: Auto';
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(record).catch(function () {});
    showToast('DNS record copied. Add it in your domain provider, then verify here.');
    return;
  }
  if (action === 'change-domain') {
    showToast('Changing the domain requires DNS verification before traffic can move.', 'info');
    return;
  }
  if (action === 'download-mapping-report' || action === 'export-activity') {
    showToast('Prototype export prepared. Production generates a signed CSV from the backend.', 'info');
    return;
  }
  if (action === 'editor-section') {
    state.ui.editorSection = element.dataset.section;
    renderShell();
    return;
  }
  if (action === 'editor-device') {
    state.ui.editorDevice = element.dataset.device;
    renderShell();
    return;
  }
  if (action === 'save-editor') {
    const page = currentEditorPage();
    if (page) savePageDraft(page);
    state.ui.editorDirty = false;
    renderShell();
    showToast('Draft revision saved. Published page versions and live Funnel pins are unchanged.');
    return;
  }
  if (action === 'publish-page') {
    const route = parseRoute();
    let pageId = route.segments[0] === 'pages' ? route.segments[1] : null;
    if (!pageId && route.segments[0] === 'funnels') {
      const funnel = state.funnels.find(function (item) { return item.id === route.segments[1]; });
      const node = funnel ? funnel.nodes.find(function (item) { return item.id === route.segments[3]; }) : null;
      pageId = node ? node.pageId : null;
    }
    const page = state.pages.find(function (item) { return item.id === pageId; });
    if (!page || !page.draftRevisionId || state.ui.editorDirty) {
      showToast('Save the current draft before publishing a page version.', 'info');
      return;
    }
    page.version = (page.version || 0) + 1;
    page.publishedVersionId = 'pv_' + page.id + '_' + page.version;
    page.draftRevision = null;
    page.draftRevisionId = null;
    page.status = 'Published';
    page.updated = 'Just now';
    renderShell();
    showToast('Immutable page version v' + page.version + ' published. Live Funnels stay pinned until republished.');
    return;
  }
  if (action === 'duplicate-for-node') {
    const route = parseRoute();
    const funnel = state.funnels.find(function (item) { return item.id === route.segments[1]; });
    const node = funnel ? funnel.nodes.find(function (item) { return item.id === route.segments[3]; }) : null;
    const source = node ? state.pages.find(function (item) { return item.id === node.pageId; }) : null;
    if (!node || !source) return;
    const copy = structuredClone(source);
    copy.id = 'page-' + Date.now();
    copy.name = source.name + ' · ' + funnel.name;
    copy.status = 'Draft';
    copy.version = 0;
    copy.publishedVersionId = null;
    copy.revisionSequence = 1;
    copy.draftRevision = 1;
    copy.draftRevisionId = 'rev_' + copy.id + '_1';
    copy.usedBy = 1;
    state.pages.unshift(copy);
    node.pageId = copy.id;
    node.state = 'Draft';
    node.detail = 'Draft page selected; live deployment is unchanged';
    markFunnelRevision(funnel);
    state.ui.editorDirty = false;
    setRoute('funnels/' + funnel.id + '/nodes/' + node.id + '/edit?appWindow=open');
    showToast('Shared page duplicated for this Funnel node. Publish a version before republishing the Funnel.');
    return;
  }
  if (action === 'preview-page') {
    showToast('Preview uses a signed test checkout session and the current unsaved editor state.', 'info');
    return;
  }
  if (action === 'add-editor-section') {
    showToast('Only conversion-safe blocks compatible with this page type are shown.', 'info');
    return;
  }
  if (action === 'remove-editor-section') {
    showToast('Section removed from the draft. Save to create a new page version.', 'info');
    state.ui.editorDirty = true;
    renderShell();
    return;
  }
  showToast('This prototype action is represented in the production handoff.', 'info');
}

function handleClick(event) {
  if (state.ui.languageOpen && !event.target.closest('.language-widget')) {
    state.ui.languageOpen = false;
    collapseLanguageMenuMarkup();
  }
  if (state.ui.storeMenuOpen && !event.target.closest('.shopify-store-switcher')) {
    state.ui.storeMenuOpen = false;
    renderShell();
  }
  if (state.ui.pageActionMenuId && !event.target.closest('.page-action-popover')) {
    state.ui.pageActionMenuId = null;
    renderShell();
  }
  const localeElement = event.target.closest('[data-locale]');
  if (localeElement) {
    event.preventDefault();
    state.ui.locale = localeElement.dataset.locale === 'zh' ? 'zh' : 'en';
    state.ui.languageOpen = false;
    try { window.localStorage.setItem('bestcheckout-prototype-locale', state.ui.locale); } catch (error) { /* no-op */ }
    renderShell();
    showToast(state.ui.locale === 'zh' ? '已切换为简体中文。' : 'Switched to English.', 'info');
    return;
  }
  const routeElement = event.target.closest('[data-route]');
  if (routeElement) {
    event.preventDefault();
    if (state.ui.editorDirty && isEditorRoute(parseRoute())) {
      openModal(renderUnsavedChangesModal(routeElement.dataset.route));
      return;
    }
    state.ui.languageOpen = false;
    setRoute(routeElement.dataset.route);
    return;
  }
  const element = actionElement(event);
  if (!element) return;
  event.preventDefault();
  handleAction(element.dataset.action, element);
}

function bindFormSubmissions(event) {
  const form = event.target;
  if (form.id === 'rename-page-form') {
    event.preventDefault();
    const data = new FormData(form);
    const page = state.pages.find(function (item) { return item.id === data.get('pageId'); });
    const name = String(data.get('name') || '').trim();
    if (!page || !name) return;
    page.name = name;
    page.updated = 'Just now';
    state.ui.pageActionMenuId = null;
    closeModal();
    renderShell();
    showToast('Page renamed.');
    return;
  }
  if (form.id === 'archive-page-form') {
    event.preventDefault();
    const data = new FormData(form);
    const index = state.pages.findIndex(function (item) { return item.id === data.get('pageId'); });
    if (index < 0) return;
    const page = state.pages[index];
    if (page.usedBy > 0) {
      closeModal();
      showToast('Remove this page from its Funnels before archiving.', 'info');
      return;
    }
    state.pages.splice(index, 1);
    state.ui.pageActionMenuId = null;
    closeModal();
    renderShell();
    showToast('Page archived.');
    return;
  }
  if (form.id === 'create-page-form') {
    event.preventDefault();
    const data = new FormData(form);
    const pageType = data.get('type');
    const source = state.pages.find(function (item) { return item.type === pageType; }) || state.pages[0];
    if (!source) return;
    const page = structuredClone(source);
    page.id = 'page-' + Date.now();
    page.name = data.get('name');
    page.type = pageType;
    page.status = 'Draft';
    page.version = 0;
    page.publishedVersionId = null;
    page.revisionSequence = 1;
    page.draftRevision = 1;
    page.draftRevisionId = 'rev_' + page.id + '_1';
    page.updated = 'Just now';
    page.usedBy = 0;
    page.metric = '—';
    page.change = 'Not live';
    state.pages.unshift(page);
    const funnel = data.get('attachFunnelId') ? state.funnels.find(function (item) { return item.id === data.get('attachFunnelId'); }) : null;
    if (funnel && data.get('attachNodeKind') === page.type) {
      const node = addPageNodeToFunnel(funnel, page);
      closeModal();
      setRoute('funnels/' + funnel.id);
      showToast(['upsell', 'downsell'].includes(node.kind) ? 'New page added. Set its product and rule before publishing.' : 'New page added to this Funnel draft.');
      return;
    }
    state.ui.editorSection = 'brand';
    closeModal();
    setRoute('pages/' + page.id + '/edit?appWindow=open');
    showToast('New ' + pageType.replace('-', ' ') + ' page draft created.');
    return;
  }
  if (form.id === 'create-funnel-goal-form') {
    event.preventDefault();
    const data = new FormData(form);
    state.ui.funnelWizard = { path: data.get('path') || 'upsell' };
    openModal(renderCreateFunnelModal('details', state.ui.funnelWizard, state.ui.locale));
    return;
  }
  if (form.id === 'create-funnel-form') {
    event.preventDefault();
    const data = new FormData(form);
    const id = 'funnel-' + Date.now();
    const path = data.get('path');
    const audiencePreset = data.get('audiencePreset') || 'all_carts';
    const initialAudience = initialAudienceForPreset(audiencePreset, state.ui.locale);
    const nodes = [
      { id: 'shopify-cart', kind: 'entry', label: 'Shopify cart', detail: 'Eligible traffic', state: 'Ready' },
      { id: 'checkout-main', kind: 'checkout', label: 'Aura checkout', detail: 'Ready to pin on first publish', pageId: 'page-aura-checkout', state: 'Ready' },
    ];
    if (path === 'upsell' || path === 'upsell-downsell') nodes.push({ id: 'upsell-night', kind: 'upsell', label: 'Night routine offer', detail: 'Ready to pin on first publish', pageId: 'page-night-routine', state: 'Ready', offerRuleRef: 'offer_night_routine_v3', recommendationRuleRef: 'recommend_sleep_bundle_v2' });
    if (path === 'upsell-downsell') nodes.push({ id: 'downsell-travel', kind: 'downsell', label: 'Travel fallback', detail: 'Published page with draft changes', pageId: 'page-travel-fallback', state: 'Ready', offerRuleRef: 'offer_travel_fallback_v2', recommendationRuleRef: 'recommend_travel_size_v1' });
    nodes.push({ id: 'thankyou-main', kind: 'thank-you', label: 'Aura thank you', detail: 'Ready to pin on first publish', pageId: 'page-aura-thankyou', state: 'Ready' });
    state.funnels.unshift({
      id: id,
      name: data.get('name'),
      status: FUNNEL_STATUS.DRAFT,
      priority: (Math.max.apply(null, state.funnels.map(function (item) { return item.priority || 0; })) || 0) + 10,
      conflictPolicy: 'first_match_by_priority',
      audiencePreset: audiencePreset,
      audience: initialAudience.audience,
      audienceConditions: initialAudience.conditions,
      hostedTraffic: 0,
      nativeTraffic: 100,
      sessions: '—', conversion: '—', aov: '—', revenue: '—', updated: 'Just now',
      rules: initialAudience.conditions.map(function (rule) { return rule.fieldLabel + ' ' + rule.operatorLabel + ' ' + rule.value; }),
      draftRevisionSequence: 1,
      draftRevisionId: 'fr_' + id + '_1',
      allocationVersion: 1,
      bucketSeed: 'bucket_' + id + '_v1',
      paymentRoutePolicyRef: 'payroute_primary_2026_07',
      paymentRouteProviderIds: ['stripe', 'airwallex', 'paypal'],
      paymentRouteBindings: structuredClone(state.funnels[0].paymentRouteBindings || []),
      requiredPaymentMethods: ['card', 'paypal'],
      postPurchaseCapabilityPolicyRef: 'postpurchase_runtime_v2',
      fallbackPolicyRef: 'phase_aware_checkout_recovery_v2',
      trackingContractVersion: TRACKING_CONTRACT_VERSION,
      nodes: nodes,
      graphEdges: graphEdgesForNodes(nodes),
      guardrails: { traffic: 'Not evaluated', pages: 'Not evaluated', graph: 'Not evaluated', payment: 'Not evaluated', inventory: 'Not evaluated', tracking: 'Not evaluated', writeback: 'Not evaluated', shopifyAccess: 'Not evaluated', domain: 'Not evaluated', embed: 'Not evaluated', fallback: 'Shopify native before payment' },
      guardrailSeverity: { traffic: 'block', pages: 'block', graph: 'block', payment: 'block', inventory: 'block', tracking: 'warn', writeback: 'block', shopifyAccess: 'block', domain: 'block', embed: 'block' },
      deploymentCheck: null,
      runtimeTraffic: { hosted: 0, native: 100 },
      currentDeploymentId: null,
      deploymentHistory: [],
      deploymentSnapshot: null,
    });
    state.ui.activeFunnelId = id;
    state.ui.activeNodeId = 'shopify-cart';
    state.ui.funnelWizard = null;
    closeModal();
    setRoute('funnels');
    showToast('Draft funnel created with Shopify native checkout as the pre-payment safety route.');
    return;
  }
  if (form.id === 'select-node-page-form') {
    event.preventDefault();
    const data = new FormData(form);
    const funnel = state.funnels.find(function (item) { return item.id === data.get('funnelId'); });
    const node = funnel ? funnel.nodes.find(function (item) { return item.id === data.get('nodeId'); }) : null;
    const page = state.pages.find(function (item) { return item.id === data.get('pageId'); });
    if (!funnel || !node || !page || page.type !== node.kind) return;
    if (node.pageId !== page.id) {
      const previousPage = state.pages.find(function (item) { return item.id === node.pageId; });
      if (previousPage) previousPage.usedBy = Math.max(0, previousPage.usedBy - 1);
      page.usedBy += 1;
      node.pageId = page.id;
      node.label = page.name;
      node.state = page.publishedVersionId ? 'Ready' : 'Draft';
      node.detail = page.publishedVersionId ? 'Page changed in draft; live deployment is unchanged' : 'Draft page selected; publish a Page version first';
      markFunnelRevision(funnel);
    }
    closeModal();
    renderShell();
    showToast('Funnel draft now uses the selected page. Live traffic is unchanged.');
    return;
  }
  if (form.id === 'add-offer-form') {
    event.preventDefault();
    const data = new FormData(form);
    const funnel = state.funnels.find(function (item) { return item.id === data.get('funnelId'); });
    const page = state.pages.find(function (item) { return item.id === data.get('pageId'); });
    const sourceProduct = state.offerSourceProducts.find(function (item) { return item.id === data.get('sourceProductId'); });
    const targetVariant = state.offerCatalogVariants.find(function (item) { return item.id === data.get('targetVariantId'); });
    const price = Number(data.get('price'));
    const markets = String(data.get('markets') || '').split(',').filter(Boolean);
    const marketsReady = markets.length > 0 && markets.every(function (market) {
      return state.store.targetRegions.includes(market) && targetVariant && targetVariant.markets.includes(market);
    });
    if (!funnel || !page || !['upsell', 'downsell'].includes(page.type) || !sourceProduct || !targetVariant || !targetVariant.mapped || targetVariant.inventoryState !== 'Available' || !Number.isFinite(price) || price <= 0 || !marketsReady) {
      showToast('Choose an available product, a valid price and eligible markets.', 'critical');
      return;
    }
    const existingNode = data.get('nodeId') ? funnel.nodes.find(function (item) { return item.id === data.get('nodeId'); }) : null;
    const nodeId = existingNode ? existingNode.id : page.type + '-' + Date.now();
    const node = existingNode || {
      id: nodeId,
      kind: page.type,
      label: page.name,
      detail: page.publishedVersionId ? 'Ready for the next Funnel publish' : 'Publish the selected Page before this Funnel',
      pageId: page.id,
      state: page.publishedVersionId ? 'Ready' : 'Draft',
      offerRuleRef: 'offer_' + nodeId + '_v1',
      recommendationRuleRef: 'recommend_' + nodeId + '_v1',
    };
    if (existingNode && existingNode.pageId !== page.id) {
      const previousPage = state.pages.find(function (item) { return item.id === existingNode.pageId; });
      if (previousPage) previousPage.usedBy = Math.max(0, previousPage.usedBy - 1);
      page.usedBy += 1;
    }
    node.kind = page.type;
    node.label = page.name;
    node.pageId = page.id;
    node.state = page.publishedVersionId ? 'Ready' : 'Draft';
    node.detail = page.publishedVersionId ? 'Ready for the next Funnel publish' : 'Publish the selected Page before this Funnel';
    publishConfiguredOfferVersions(node, {
      sourceProductId: sourceProduct.id,
      targetVariantId: targetVariant.id,
      price: price.toFixed(2),
      markets: markets,
    });
    if (!existingNode) {
      const thankyouIndex = funnel.nodes.findIndex(function (item) { return item.kind === 'thank-you'; });
      if (thankyouIndex >= 0) funnel.nodes.splice(thankyouIndex, 0, node);
      else funnel.nodes.push(node);
      page.usedBy += 1;
    }
    funnel.graphEdges = graphEdgesForNodes(funnel.nodes);
    markFunnelRevision(funnel);
    state.ui.activeNodeId = node.id;
    closeModal();
    renderShell();
    showToast(existingNode ? 'Offer settings saved. Publish the Funnel when you are ready.' : 'Offer added to the draft. Live buyers are unchanged until you publish.');
    return;
  }
  if (form.id === 'checkout-experiment-form') {
    event.preventDefault();
    const data = new FormData(form);
    const funnel = state.funnels.find(function (item) { return item.id === data.get('funnelId'); });
    if (!funnel) return;
    const checkouts = funnel.nodes.filter(function (node) { return node.kind === 'checkout'; });
    const native = Number(data.get('nativeTraffic'));
    const allocations = {};
    let total = native;
    let valid = Number.isFinite(native) && native >= 0;
    checkouts.forEach(function (node) {
      const value = Number(data.get('checkout_' + node.id));
      allocations[node.id] = value;
      total += value;
      if (!Number.isFinite(value) || value < 0) valid = false;
    });
    if (!valid || Math.round(total * 100) / 100 !== 100) {
      showToast('Make the Checkout traffic allocation exactly 100%.', 'critical');
      return;
    }
    funnel.checkoutAllocations = { native: native, checkouts: allocations };
    funnel.nativeTraffic = native;
    funnel.hostedTraffic = 100 - native;
    markFunnelRevision(funnel, { allocation: true });
    closeModal();
    renderShell();
    showToast(state.ui.locale === 'zh' ? 'Checkout 流量规则已保存；漏斗入口规则不受影响。' : 'Checkout traffic rules saved. Funnel entry rules are unchanged.');
    return;
  }
  if (form.id === 'funnel-entry-form') {
    event.preventDefault();
    const data = new FormData(form);
    const funnel = state.funnels.find(function (item) { return item.id === data.get('funnelId'); });
    if (!funnel) return;
    const priority = Number(data.get('priority'));
    if (!Number.isInteger(priority) || priority < 1 || priority > 999) {
      showToast(state.ui.locale === 'zh' ? '请输入 1 到 999 之间的优先级。' : 'Enter a priority from 1 to 999.', 'critical');
      return;
    }
    const audienceRows = Array.from(form.querySelectorAll('[data-audience-rule]'));
    const audienceConditions = audienceRows.map(function (row) {
      const field = row.querySelector('[name="audienceField"]');
      const operator = row.querySelector('[name="audienceOperator"]');
      const value = row.querySelector('[name="audienceValue"]');
      const fieldOption = field && field.selectedOptions[0];
      const operatorOption = operator && operator.selectedOptions[0];
      return {
        field: field ? field.value : '',
        operator: operator ? operator.value : '',
        value: value ? value.value.trim() : '',
        fieldLabel: fieldOption ? fieldOption.textContent.trim() : '',
        operatorLabel: operatorOption ? operatorOption.textContent.trim() : '',
        shortLabel: fieldOption ? (fieldOption.dataset.short || fieldOption.textContent.trim()) : '',
      };
    }).filter(function (rule) { return rule.field && rule.operator && rule.value; });
    if (!audienceConditions.length || audienceConditions.length !== audienceRows.length) {
      showToast(state.ui.locale === 'zh' ? '请完整填写每个受众条件。' : 'Complete every audience condition.', 'critical');
      return;
    }
    funnel.priority = priority;
    funnel.audienceConditions = audienceConditions;
    funnel.rules = audienceConditions.map(function (rule) { return rule.fieldLabel + ' ' + rule.operatorLabel + ' ' + rule.value; });
    funnel.audience = audienceConditions.map(function (rule) { return rule.shortLabel + ' ' + rule.operatorLabel + ' ' + rule.value; }).join(' · ');
    markFunnelRevision(funnel);
    closeModal();
    renderShell();
    showToast(state.ui.locale === 'zh' ? '漏斗入口与优先级已保存。未命中流量仍会进入 Shopify Checkout。' : 'Funnel entry and priority saved. Unmatched traffic still goes to Shopify Checkout.');
    return;
  }
  if (form.id === 'traffic-form') {
    event.preventDefault();
    const data = new FormData(form);
    const funnel = state.funnels.find(function (item) { return item.id === data.get('funnelId'); });
    if (!funnel) return;
    const nextHostedTraffic = Number(data.get('hostedTraffic'));
    if (nextHostedTraffic !== funnel.hostedTraffic) {
      funnel.hostedTraffic = nextHostedTraffic;
      funnel.nativeTraffic = 100 - funnel.hostedTraffic;
      markFunnelRevision(funnel, { allocation: true });
    }
    closeModal();
    renderShell();
    showToast('Traffic allocation saved. Phase-aware runtime recovery remains enabled.');
    return;
  }
  if (form.id === 'provider-selection-form') {
    event.preventDefault();
    const data = new FormData(form);
    const provider = state.providers.find(function (item) { return item.id === data.get('providerId'); });
    if (!provider) return;
    state.ui.providerConnectionDraft = { providerId: provider.id, authorizationState: 'not_started', validationState: 'not_started' };
    openModal(renderConnectProviderModal(state, provider.id, 'authorize'));
    return;
  }
  if (form.id === 'provider-authorization-form') {
    event.preventDefault();
    const data = new FormData(form);
    const provider = state.providers.find(function (item) { return item.id === data.get('providerId'); });
    if (!provider) return;
    const oauth = provider.id === 'stripe' || provider.id === 'paypal';
    if (oauth) {
      state.ui.providerConnectionDraft = { providerId: provider.id, mode: 'oauth', authorizationState: 'authorizing', validationState: 'not_started' };
      openModal(renderConnectProviderModal(state, provider.id, 'authorizing'));
      return;
    }
    const merchantEntity = String(data.get('merchantEntity') || '').trim();
    const restrictedKey = String(data.get('restrictedKey') || '');
    if (!merchantEntity || !restrictedKey) {
      showToast('Enter the required merchant entity and restricted credential before continuing.', 'critical');
      return;
    }
    state.ui.providerConnectionDraft = {
      providerId: provider.id,
      mode: 'credential',
      authorizationState: 'verified',
      validationState: 'not_started',
      connectionRef: 'vault_connection_' + provider.id + '_' + Date.now(),
      merchantAccountRef: merchantEntity,
      credentialStored: true,
    };
    openModal(renderConnectProviderModal(state, provider.id, 'validate'));
    return;
  }
  if (form.id === 'provider-validation-form') {
    event.preventDefault();
    const data = new FormData(form);
    const provider = state.providers.find(function (item) { return item.id === data.get('providerId'); });
    if (!provider) return;
    const draft = state.ui.providerConnectionDraft;
    if (!draft || draft.providerId !== provider.id || draft.authorizationState !== 'verified' || draft.validationState !== 'passed' || !draft.connectionRef || !draft.merchantAccountRef) {
      showToast('Finish verified authorization and automated connection checks before completing this payment account.', 'critical');
      return;
    }
    provider.status = 'Connected';
    provider.account = draft.merchantAccountRef;
    provider.connectionCurrency = 'USD';
    provider.postPurchase = provider.postPurchase === 'Not supported' ? 'Not supported' : 'Not evaluated';
    provider.capabilityCoverage = 'Ready for runtime evaluation';
    provider.connection = { ref: draft.connectionRef, authorizationState: 'Verified', webhookState: 'Verified', testPaymentState: 'Passed', verifiedAt: draft.validatedAt || 'Just now' };
    provider.capabilityEvaluations = [{
      method: 'Connected methods',
      region: 'Merchant account',
      currency: 'USD',
      authorizationState: 'Secure authorization verified',
      outcome: 'Not evaluated',
      confirmationFlow: 'Runtime evaluation',
      reasonCode: 'secure_connection_verified',
      verifiedAt: 'Just now',
    }];
    provider.successRate = '—';
    const binding = {
      providerId: provider.id,
      connectionRef: draft.connectionRef,
      merchantAccountRef: draft.merchantAccountRef,
      regions: state.store.targetRegions.slice(),
      currencies: Array.from(new Set([state.store.checkoutCurrency, 'CAD'])),
      methods: provider.id === 'paypal' ? ['paypal'] : ['card', 'apple_pay', 'google_pay'],
      authorizationState: 'Verified',
      testPaymentState: 'Passed',
      webhookState: 'Verified',
      status: 'Verified',
    };
    state.funnels.forEach(function (funnel) {
      const bindings = funnel.paymentRouteBindings || [];
      const index = bindings.findIndex(function (item) { return item.providerId === provider.id; });
      if (index >= 0) bindings[index] = binding;
      else bindings.push(binding);
      funnel.paymentRouteBindings = bindings;
      funnel.paymentRouteProviderIds = Array.from(new Set((funnel.paymentRouteProviderIds || []).concat(provider.id)));
      revalidateFunnel(funnel);
    });
    state.activity.unshift({
      id: 'evt-provider-' + provider.id + '-' + Date.now(),
      category: 'payment',
      title: provider.name + ' payment account connected',
      detail: 'Secure authorization, signed webhook setup and the first payment capability validation completed.',
      status: 'Succeeded',
      actor: 'Payment connection service',
      time: 'Just now',
      reference: draft.connectionRef,
      phase: 'provider_connection_verified',
      attempt: 1,
      idempotency: 'Verified',
      integrity: 'Connection reference stored securely; provider credentials are not retained in application logs.',
    });
    state.ui.providerConnectionDraft = null;
    closeModal();
    renderShell();
    showToast(provider.name + ' connected. Webhook and safe capability checks passed.', 'success');
    return;
  }
  if (form.id === 'tracking-review-form') {
    event.preventDefault();
    const data = new FormData(form);
    const selected = data.getAll('destination');
    selected.forEach(function (id) {
      const item = state.tracking.find(function (tracking) { return tracking.id === id; });
      if (!item) return;
      item.ownershipState = 'Confirmed';
      item.consentState = 'Reviewed';
      item.state = item.serverAuthState === 'Connected' && item.testState === 'Passed' ? 'Healthy' : 'Action required';
    });
    const check = state.launchChecks.find(function (item) { return item.id === 'tracking'; });
    if (check && selected.length) check.detail = 'Ownership and consent reviewed. Server authorization and destination tests remain independent.';
    closeModal();
    renderShell();
    showToast(selected.length ? 'Ownership and consent were recorded. Server authorization and delivery tests are still required.' : 'No destinations selected; discovery remains unapproved.', 'info');
    return;
  }
  if (form.id === 'app-embed-form') {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get('enabled') !== 'on' || data.get('merchantConfirmed') !== 'on') {
      showToast('Enable and save BestCheckout in Theme Editor before verification.', 'critical');
      return;
    }
    state.store.appEmbed = 'Verified';
    state.store.embedVerifiedAt = 'Just now';
    state.store.appEmbedVerificationRef = 'embed_verify_' + Date.now();
    state.store.embedEntryChecks.forEach(function (item) { item.state = 'Verified'; });
    closeModal();
    renderShell();
    showToast('App embed verified against the current theme and asset version.');
  }
}

function handleInput(event) {
  if (event.target.matches('[data-activity-search]')) {
    const query = event.target.value.trim().toLowerCase();
    const events = appRoot.querySelectorAll('.timeline-event');
    let visible = 0;
    events.forEach(function (row) {
      const matches = !query || row.textContent.toLowerCase().includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    const count = appRoot.querySelector('[data-activity-count]');
    if (count) count.textContent = translate(visible + ' events shown', state.ui.locale);
    return;
  }
  if (event.target.matches('[data-editor-input]')) {
    state.ui.editorDirty = true;
    const saveState = appRoot.querySelector('.save-state');
    const saveButton = appRoot.querySelector('[data-action="save-editor"]');
    if (saveState) saveState.textContent = translate('Unsaved changes', state.ui.locale);
    if (saveButton) saveButton.disabled = false;
  }
  if (event.target.matches('[data-traffic-range]')) {
    const value = Number(event.target.value);
    const modal = event.target.closest('.modal');
    if (!modal) return;
    const valueLabel = modal.querySelector('[data-traffic-value]');
    const hosted = modal.querySelector('[data-hosted-preview]');
    const native = modal.querySelector('[data-native-preview]');
    if (valueLabel) valueLabel.textContent = value + '%';
    if (hosted) hosted.textContent = value + '%';
    if (native) native.textContent = 100 - value + '%';
  }
  if (event.target.matches('[data-routing-allocation]')) {
    const modal = event.target.closest('.modal');
    if (!modal) return;
    const inputs = Array.from(modal.querySelectorAll('[data-routing-allocation]'));
    const total = inputs.reduce(function (sum, input) { return sum + (Number(input.value) || 0); }, 0);
    const totalLabel = modal.querySelector('[data-routing-total]');
    if (totalLabel) {
      totalLabel.textContent = total + '%';
      totalLabel.classList.toggle('is-invalid', total !== 100);
    }
  }
}

function handleChange(event) {
  if (event.target.matches('[data-audience-field]')) {
    const row = event.target.closest('[data-audience-rule]');
    const value = row && row.querySelector('[name="audienceValue"]');
    const operator = row && row.querySelector('[name="audienceOperator"]');
    const option = event.target.selectedOptions[0];
    if (value && option) {
      const nextPlaceholder = option.dataset.placeholder || '';
      const previousPlaceholder = value.dataset.audiencePlaceholder || '';
      if (!value.value || value.value === previousPlaceholder) value.value = nextPlaceholder;
      value.placeholder = nextPlaceholder;
      value.dataset.audiencePlaceholder = nextPlaceholder;
    }
    if (operator && option) {
      const allowed = (option.dataset.operators || '').split(',').filter(Boolean);
      Array.from(operator.options).forEach(function (item) {
        const enabled = allowed.includes(item.value);
        item.hidden = !enabled;
        item.disabled = !enabled;
      });
      if (!allowed.includes(operator.value)) operator.value = allowed[0] || 'is';
    }
    return;
  }
  if (event.target.matches('[data-change="activity-filter"]')) {
    state.ui.activityFilter = event.target.value;
    renderShell();
    return;
  }
  if (event.target.matches('[data-change="performance-date-range"]')) {
    state.ui.performanceDateRange = event.target.value;
    renderShell();
  }
}

function trapModalFocus(event) {
  if (state.ui.storeMenuOpen && event.key === 'Escape') {
    event.preventDefault();
    state.ui.storeMenuOpen = false;
    renderShell();
    return;
  }
  if (state.ui.languageOpen) {
    const widget = event.target.closest && event.target.closest('.language-widget');
    if (event.key === 'Escape') {
      event.preventDefault();
      state.ui.languageOpen = false;
      renderShell();
      focusVisibleLanguageElement('.language-trigger');
      return;
    }
    if (widget && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const options = Array.from(widget.querySelectorAll('.language-option')).filter(function (option) { return !option.hidden; });
      if (!options.length) return;
      const currentIndex = options.indexOf(document.activeElement);
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = currentIndex < 0 ? (direction > 0 ? 0 : options.length - 1) : (currentIndex + direction + options.length) % options.length;
      const next = options[nextIndex];
      if (next) next.focus();
      return;
    }
  }
  const modal = modalRoot.querySelector('.modal');
  if (!modal) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

appRoot.addEventListener('click', handleClick);
appRoot.addEventListener('input', handleInput);
appRoot.addEventListener('change', handleChange);
let canvasPanState = null;
appRoot.addEventListener('pointerdown', function (event) {
  const canvas = event.target.closest('[data-canvas-pan]');
  if (!canvas || event.button !== 0 || event.target.closest('button, input, select, a, label')) return;
  canvasPanState = { canvas: canvas, x: event.clientX, y: event.clientY, left: canvas.scrollLeft, top: canvas.scrollTop };
  canvas.classList.add('is-panning');
  canvas.setPointerCapture(event.pointerId);
});
appRoot.addEventListener('pointermove', function (event) {
  if (!canvasPanState) return;
  const drag = canvasPanState;
  drag.canvas.scrollLeft = drag.left - (event.clientX - drag.x);
  drag.canvas.scrollTop = drag.top - (event.clientY - drag.y);
  event.preventDefault();
});
appRoot.addEventListener('pointerup', function (event) {
  if (!canvasPanState) return;
  canvasPanState.canvas.classList.remove('is-panning');
  if (canvasPanState.canvas.hasPointerCapture(event.pointerId)) canvasPanState.canvas.releasePointerCapture(event.pointerId);
  canvasPanState = null;
});
modalRoot.addEventListener('click', function (event) {
  if (event.target.classList.contains('modal-backdrop')) {
    closeModal();
    return;
  }
  handleClick(event);
});
modalRoot.addEventListener('submit', bindFormSubmissions);
modalRoot.addEventListener('input', handleInput);
modalRoot.addEventListener('change', handleChange);
document.addEventListener('keydown', trapModalFocus);
window.addEventListener('hashchange', function () {
  if (state.ui.editorDirty && lastRenderedWasEditor) {
    const targetRoute = window.location.hash.replace(/^#\/?/, '') || 'home';
    window.history.replaceState(null, '', lastRenderedHash || '#/home');
    openModal(renderUnsavedChangesModal(targetRoute));
    return;
  }
  renderShell({ focus: true });
});
window.addEventListener('beforeunload', function (event) {
  if (!state.ui.editorDirty) return;
  event.preventDefault();
  event.returnValue = '';
});

const initialRoute = parseRoute();
if (!window.location.hash || !['home', 'funnels', 'pages', 'performance', 'activity', 'settings'].includes(initialRoute.segments[0])) {
  setRoute('home');
} else {
  renderShell();
}
