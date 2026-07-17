import { badge, button, icon, pageHeader, progressBar, sectionHeader } from '../components/common.js';
import { escapeHtml } from '../utils.js';

function copy(state, english, chinese) {
  return state.ui.locale === 'zh' ? chinese : english;
}

function deploymentPinFor(funnel, nodeId) {
  const snapshot = funnel.deploymentSnapshot;
  return snapshot && snapshot.nodes
    ? snapshot.nodes.find(function (item) { return item.nodeId === nodeId; }) || null
    : null;
}

function deploymentIsStale(funnel, state) {
  const snapshot = funnel.deploymentSnapshot;
  if (!snapshot) return true;
  const allocation = snapshot.allocation || { hosted: snapshot.hostedTraffic, native: snapshot.nativeTraffic };
  if (snapshot.sourceFunnelRevision && snapshot.sourceFunnelRevision !== funnel.draftRevisionId) return true;
  if (allocation.hosted !== funnel.hostedTraffic || allocation.native !== funnel.nativeTraffic) return true;
  return funnel.nodes.filter(function (node) { return node.pageId; }).some(function (node) {
    const page = state.pages.find(function (item) { return item.id === node.pageId; });
    const pin = deploymentPinFor(funnel, node.id);
    return !page || !pin || pin.pageId !== node.pageId || pin.pinnedVersionId !== page.publishedVersionId;
  });
}

function nodesOf(funnel, kind) {
  return funnel.nodes.filter(function (node) { return node.kind === kind; });
}

function checkoutRouting(funnel) {
  const checkouts = nodesOf(funnel, 'checkout');
  const saved = funnel.checkoutAllocations || {};
  const stored = saved.checkouts || {};
  const native = Number.isFinite(Number(saved.native)) ? Number(saved.native) : funnel.nativeTraffic;
  const fallbackHosted = Math.max(0, 100 - native);
  const allocations = {};
  let hasStoredAllocation = false;
  checkouts.forEach(function (node) {
    if (Number.isFinite(Number(stored[node.id]))) hasStoredAllocation = true;
  });
  checkouts.forEach(function (node, index) {
    allocations[node.id] = Number.isFinite(Number(stored[node.id])) ? Number(stored[node.id]) : (!hasStoredAllocation && index === 0 ? fallbackHosted : 0);
  });
  return { native: native, checkouts: allocations };
}

function funnelCounts(funnel) {
  return {
    checkout: nodesOf(funnel, 'checkout').length,
    upsell: nodesOf(funnel, 'upsell').length,
    downsell: nodesOf(funnel, 'downsell').length,
    thankyou: nodesOf(funnel, 'thank-you').length,
  };
}

function renderGlobalFunnelRouter(state) {
  const routes = state.funnels.slice().sort(function (left, right) { return left.priority - right.priority; });
  const rows = routes.map(function (funnel) {
    const live = funnel.status === 'Live';
    const routeState = live
      ? copy(state, 'First matching route wins', '命中后优先进入此漏斗')
      : funnel.status === 'Paused'
        ? copy(state, 'Paused — not receiving traffic', '已暂停 — 暂不接收流量')
        : copy(state, 'Draft — not receiving traffic', '草稿 — 暂不接收流量');
    return '<button type="button" class="global-funnel-route" data-action="select-funnel" data-funnel-id="' + escapeHtml(funnel.id) + '"><span class="global-funnel-priority">#' + escapeHtml(funnel.priority) + '</span><span class="global-funnel-route-copy"><span><strong data-i18n-skip>' + escapeHtml(funnel.name) + '</strong>' + badge(funnel.status) + '</span><small>' + escapeHtml(routeState) + '</small><em data-i18n-skip>' + escapeHtml(funnel.audience) + '</em></span>' + icon('chevron', 16) + '</button>';
  }).join('');
  const fallback = '<article class="global-funnel-fallback"><span>' + icon('store', 17) + '</span><div><small>' + escapeHtml(copy(state, 'Default fallback', '默认兜底')) + '</small><strong>Shopify Checkout</strong><p>' + escapeHtml(copy(state, 'No live Funnel matches → Shopify native Checkout.', '未命中任何已发布漏斗 → Shopify 原生 Checkout。')) + '</p></div></article>';
  return '<section class="card global-funnel-router"><div class="card-pad"><div class="global-funnel-router-head"><div><span class="eyebrow">' + escapeHtml(copy(state, 'Global Funnel router', '全局漏斗路由')) + '</span><h2>' + escapeHtml(copy(state, 'Which journey does a cart enter?', '购物车最终进入哪一条漏斗？')) + '</h2><p>' + escapeHtml(copy(state, 'Routes are evaluated by priority. A cart enters only the first live Funnel it matches.', '按优先级依次判断；每个购物车只会进入第一个命中的已发布漏斗。')) + '</p></div><span class="global-funnel-router-note">' + icon('flow', 16) + escapeHtml(copy(state, 'Lower number = higher priority', '数值越小，优先级越高')) + '</span></div><div class="global-funnel-router-list">' + rows + fallback + '</div></div></section>';
}

function renderFunnelList(state) {
  const filter = state.ui.funnelStatusFilter;
  const visible = state.funnels.filter(function (funnel) {
    return filter === 'all' || funnel.status.toLowerCase() === filter;
  });
  if (!visible.length) {
    return '<div class="funnels-empty"><span>' + icon('flow', 22) + '</span><strong>' + escapeHtml(copy(state, 'No Funnels in this view', '当前筛选下没有漏斗')) + '</strong><p>' + escapeHtml(copy(state, 'Try another status, or create a new buyer journey.', '请切换筛选条件，或创建一个新的购买路径。')) + '</p></div>';
  }
  return '<div class="funnel-index-table" role="table"><div class="funnel-index-header" role="row"><span role="columnheader">' + escapeHtml(copy(state, 'Funnel', '漏斗')) + '</span><span role="columnheader">' + escapeHtml(copy(state, 'Status', '状态')) + '</span><span role="columnheader">' + escapeHtml(copy(state, 'Traffic', '流量')) + '</span><span role="columnheader">' + escapeHtml(copy(state, 'Conversion', '转化率')) + '</span><span role="columnheader">' + escapeHtml(copy(state, 'AOV', '客单价')) + '</span><span role="columnheader">' + escapeHtml(copy(state, 'Updated', '更新时间')) + '</span><span aria-hidden="true"></span></div>' + visible.map(function (funnel) {
    const count = funnelCounts(funnel);
    const pageSummary = state.ui.locale === 'zh'
      ? count.checkout + ' 个 Checkout · ' + (count.upsell + count.downsell) + ' 个优惠页 · ' + count.thankyou + ' 个 Thank you'
      : count.checkout + ' Checkout · ' + (count.upsell + count.downsell) + ' offer pages · ' + count.thankyou + ' Thank you';
    const openLabel = copy(state, 'Open', '打开');
    const routeSummary = copy(state, 'Priority ', '优先级 #') + funnel.priority + ' · ' + pageSummary;
    const updatedLabel = funnel.updated === 'Created during installation' ? copy(state, 'Created during installation', '安装时创建') : funnel.updated;
    return '<div class="funnel-index-row" role="row"><span class="funnel-index-primary" role="cell"><button type="button" data-action="select-funnel" data-funnel-id="' + escapeHtml(funnel.id) + '"><strong data-i18n-skip>' + escapeHtml(funnel.name) + '</strong><small data-i18n-skip>' + escapeHtml(funnel.audience) + '</small><em>' + escapeHtml(routeSummary) + '</em></button></span><span class="funnel-index-status" role="cell">' + badge(funnel.status) + '</span><span class="funnel-index-value" role="cell"><strong>' + escapeHtml(funnel.hostedTraffic + '%') + '</strong><small>BestCheckout</small></span><span class="funnel-index-value" role="cell"><strong>' + escapeHtml(funnel.conversion) + '</strong></span><span class="funnel-index-value" role="cell"><strong>' + escapeHtml(funnel.aov) + '</strong></span><span class="funnel-index-updated" role="cell">' + escapeHtml(updatedLabel) + '</span><span class="funnel-index-action" role="cell"><button type="button" data-action="select-funnel" data-funnel-id="' + escapeHtml(funnel.id) + '" aria-label="' + escapeHtml(openLabel + ' ' + funnel.name) + '"><span>' + escapeHtml(openLabel) + '</span>' + icon('chevron', 16) + '</button></span></div>';
  }).join('') + '</div>';
}

function pageMeta(kind) {
  return {
    entry: { icon: 'store', label: 'Shopify storefront', labelZh: 'Shopify 店铺', hint: 'Eligible carts enter here', hintZh: '符合条件的购物车从这里进入' },
    checkout: { icon: 'card', label: 'Checkout page', labelZh: 'Checkout 页面', hint: 'Payment and order review', hintZh: '支付与订单确认' },
    upsell: { icon: 'sparkles', label: 'Upsell page', labelZh: 'Upsell 页面', hint: 'Shown after payment', hintZh: '支付后展示' },
    downsell: { icon: 'sparkles', label: 'Downsell page', labelZh: 'Downsell 页面', hint: 'Shown when an offer is declined', hintZh: '优惠被拒绝时展示' },
    'thank-you': { icon: 'check', label: 'Thank you page', labelZh: 'Thank you 页面', hint: 'Order confirmation', hintZh: '订单确认' },
  }[kind] || { icon: 'pages', label: 'Journey page', labelZh: '路径页面', hint: '', hintZh: '' };
}

function renderOfferSummary(node, state) {
  if (!['upsell', 'downsell'].includes(node.kind)) return '';
  const offer = state.offerVersions.find(function (item) { return item.id === node.offerRuleRef; });
  const product = offer ? state.offerCatalogVariants.find(function (item) { return item.id === offer.targetVariantId; }) : null;
  if (!offer || !product) return '<span class="journey-page-card-pending">' + escapeHtml(copy(state, 'Set product and rule', '设置商品与规则')) + '</span>';
  return '<span class="journey-page-card-product" data-i18n-skip>' + escapeHtml(product.name + ' · $' + offer.pricing.amount) + '</span>';
}

function renderJourneyNode(node, state, allocation, canRemove) {
  const meta = pageMeta(node.kind);
  const page = node.pageId ? state.pages.find(function (item) { return item.id === node.pageId; }) : null;
  const routeAllocation = node.kind === 'checkout' && Number.isFinite(Number(allocation))
    ? '<span class="journey-page-card-allocation">' + escapeHtml(allocation + '% ' + copy(state, 'of eligible traffic', '符合条件流量')) + '</span>'
    : '';
  const detail = renderOfferSummary(node, state) || (page && page.name !== node.label
    ? '<span class="journey-page-card-page" data-i18n-skip>' + escapeHtml(page.name) + '</span>'
    : !page ? '<span class="journey-page-card-page">' + escapeHtml(copy(state, meta.hint, meta.hintZh)) + '</span>' : '');
  const body = detail || routeAllocation
    ? '<span class="journey-page-card-body">' + detail + routeAllocation + '</span>'
    : '';
  const selected = state.ui.activeNodeId === node.id ? ' is-selected' : '';
  const isOffer = node.kind === 'upsell' || node.kind === 'downsell';
  const settingsAction = node.kind === 'entry' ? 'edit-funnel-entry' : isOffer ? 'edit-offer' : 'select-node-page';
  const settingsLabel = node.kind === 'entry'
    ? copy(state, 'View Funnel entry', '查看漏斗入口')
    : isOffer
      ? copy(state, 'Edit product & rule', '配置商品与规则')
      : copy(state, page ? 'Change page' : 'Choose page', page ? '更换页面' : '选择页面');
  const settingsAttrs = 'data-funnel-id="' + escapeHtml(state.ui.activeFunnelId) + '" data-node-id="' + escapeHtml(node.id) + '"';
  const editAction = page && node.kind !== 'entry'
    ? '<button type="button" class="journey-page-card-edit" data-action="edit-node" ' + settingsAttrs + '>' + icon('edit', 14) + '<span>' + escapeHtml(copy(state, 'Edit page design', '编辑页面设计')) + '</span></button>'
    : '';
  const removal = node.kind === 'entry'
    ? ''
    : canRemove
      ? '<button type="button" class="journey-page-card-remove" data-action="remove-journey-page" ' + settingsAttrs + ' aria-label="' + escapeHtml(copy(state, 'Remove from Funnel', '从漏斗移除')) + '" title="' + escapeHtml(copy(state, 'Remove from Funnel', '从漏斗移除')) + '">×</button>'
      : '<span class="journey-page-card-required" title="' + escapeHtml(copy(state, 'Keep at least one page of this type in the Funnel.', '漏斗中至少保留一个此类型页面。')) + '">' + icon('lock', 13) + '<span>' + escapeHtml(copy(state, 'Required', '必须保留')) + '</span></span>';
  const actionGroup = '<div class="journey-page-card-actions">' + editAction + '<button type="button" class="journey-page-card-config" data-action="' + settingsAction + '" ' + settingsAttrs + '>' + escapeHtml(settingsLabel) + '</button>' + removal + '</div>';
  return '<article class="journey-page-card journey-page-card-' + escapeHtml(node.kind) + selected + '"><button type="button" class="journey-page-card-select" data-action="select-node" data-node-id="' + escapeHtml(node.id) + '" aria-pressed="' + (selected ? 'true' : 'false') + '"><span class="journey-page-card-head"><span class="journey-page-card-icon">' + icon(meta.icon, 16) + '</span><span><strong data-i18n-skip>' + escapeHtml(node.label) + '</strong></span></span>' + body + '</button>' + actionGroup + '</article>';
}

function renderAddPageButton(funnel, state, kind) {
  const helper = ['upsell', 'downsell'].includes(kind)
    ? copy(state, 'Page, product and rule', '页面、商品与规则')
    : copy(state, 'Choose or create a page', '选择或新建页面');
  const actionLabel = copy(state, 'Add page', '添加页面');
  return '<button type="button" class="journey-add-page" data-action="add-journey-page" data-funnel-id="' + escapeHtml(funnel.id) + '" data-page-kind="' + escapeHtml(kind) + '"><span>' + icon('plus', 16) + '</span><span><strong>' + escapeHtml(actionLabel) + '</strong><small>' + escapeHtml(helper) + '</small></span></button>';
}

function renderLane(funnel, state, options) {
  const nodes = options.nodes;
  const compactTitle = {
    checkout: copy(state, 'Checkout', 'Checkout'),
    upsell: copy(state, 'Upsells', '加购'),
    downsell: copy(state, 'Downsells', '降价加购'),
    'thank-you': copy(state, 'Thank you', '感谢页'),
  }[options.kind] || copy(state, options.title, options.titleZh);
  const empty = '<div class="journey-lane-empty"><span>' + icon(options.icon, 17) + '</span><p>' + escapeHtml(copy(state, options.empty, options.emptyZh)) + '</p></div>';
  const canRemove = ['upsell', 'downsell'].includes(options.kind) || nodes.length > 1;
  const cards = nodes.length ? nodes.map(function (node) { return renderJourneyNode(node, state, options.allocations && options.allocations[node.id], canRemove); }).join('') : empty;
  return '<section class="journey-lane journey-lane-' + escapeHtml(options.key) + '"><header><span class="journey-lane-icon">' + icon(options.icon, 16) + '</span><span><small>' + escapeHtml(copy(state, options.stage, options.stageZh)) + '</small><strong>' + escapeHtml(compactTitle) + '</strong></span><b>' + nodes.length + '</b></header><div class="journey-lane-stack">' + cards + renderAddPageButton(funnel, state, options.kind) + '</div></section>';
}

function renderOfferLane(funnel, state, upsells, downsells) {
  const offerLane = renderLane(funnel, state, {
    key: 'upsell', kind: 'upsell', nodes: upsells, icon: 'sparkles', stage: 'After payment', stageZh: '支付后', title: 'Upsell pages', titleZh: 'Upsell 页面', empty: 'Add the first one-click offer', emptyZh: '添加第一个一键加购优惠',
  });
  const downsellLane = renderLane(funnel, state, {
    key: 'downsell', kind: 'downsell', nodes: downsells, icon: 'products', stage: 'If declined', stageZh: '被拒绝后', title: 'Downsell pages', titleZh: 'Downsell 页面', empty: 'Optional recovery offer', emptyZh: '可选的挽回优惠',
  });
  return '<div class="journey-offer-lanes"><div class="journey-offer-main">' + offerLane + '</div><div class="journey-decline-connector"><span>' + icon('arrow', 15) + '</span><small>' + escapeHtml(copy(state, 'If declined', '被拒绝时')) + '</small></div><div class="journey-offer-fallback">' + downsellLane + '</div></div>';
}

function renderCheckoutRoutingStageLegacy(funnel, state, checkouts, routing) {
  const hostedTotal = checkouts.reduce(function (total, node) { return total + (routing.checkouts[node.id] || 0); }, 0);
  const checkoutRows = checkouts.map(function (node) {
    return '<div class="journey-routing-variant"><span class="journey-routing-variant-dot"></span><span data-i18n-skip>' + escapeHtml(node.label) + '</span><b>' + escapeHtml((routing.checkouts[node.id] || 0) + '%') + '</b></div>';
  }).join('') || '<div class="journey-routing-empty">' + escapeHtml(copy(state, 'Add a Checkout page to start', '先添加一个 Checkout 页面')) + '</div>';
  return '<section class="journey-routing-stage"><header><span class="journey-lane-icon">' + icon('flow', 16) + '</span><span><small>' + escapeHtml(copy(state, 'Layer 2: experiment', '第 2 层：Checkout 实验')) + '</small><strong>' + escapeHtml(copy(state, 'Checkout A/B allocation', 'Checkout A/B 分配')) + '</strong></span></header><p>' + escapeHtml(copy(state, 'Only buyers who entered this Funnel are split between the native control and your Checkout variants.', '仅对已经进入此漏斗的买家，在 Shopify 原生对照组与 Checkout 页面变体之间分配流量。')) + '</p><div class="journey-routing-path journey-routing-native"><span class="journey-routing-path-icon">' + icon('store', 15) + '</span><span><small>' + escapeHtml(copy(state, 'Control', '原生对照组')) + '</small><strong>' + escapeHtml(copy(state, 'Shopify Checkout', 'Shopify Checkout')) + '</strong></span><b>' + escapeHtml(routing.native + '%') + '</b></div><div class="journey-routing-path journey-routing-best"><span class="journey-routing-path-icon">' + icon('card', 15) + '</span><span><small>' + escapeHtml(copy(state, 'Variants', 'BestCheckout 变体')) + '</small><strong>BestCheckout</strong></span><b>' + escapeHtml(hostedTotal + '%') + '</b></div><div class="journey-routing-variants">' + checkoutRows + '</div><button type="button" class="journey-routing-config" data-action="edit-checkout-routing" data-funnel-id="' + escapeHtml(funnel.id) + '">' + icon('settings', 15) + '<span>' + escapeHtml(copy(state, 'Configure Checkout experiment', '配置 Checkout 实验')) + '</span></button></section>';
}

function renderCheckoutRouteSummary(funnel, state, checkouts, routing) {
  const hostedTotal = checkouts.reduce(function (total, node) { return total + (routing.checkouts[node.id] || 0); }, 0);
  const showVariantNames = checkouts.length > 1;
  const variantPills = showVariantNames
    ? checkouts.map(function (node) {
      const allocation = routing.checkouts[node.id] || 0;
      return allocation > 0 ? '<span data-i18n-skip>' + escapeHtml(node.label) + ' ' + escapeHtml(allocation + '%') + '</span>' : '';
    }).filter(Boolean).join('') || '<span>' + escapeHtml(copy(state, 'No Checkout page selected', '尚未选择 Checkout 页面')) + '</span>'
    : '';
  return '<section class="checkout-route-summary"><header><div><small>' + escapeHtml(copy(state, 'Traffic rules', '流量规则')) + '</small><strong>' + escapeHtml(copy(state, 'Checkout traffic', 'Checkout 流量')) + '</strong></div><button type="button" class="button button-plain" data-action="edit-checkout-routing" data-funnel-id="' + escapeHtml(funnel.id) + '">' + icon('settings', 15) + '<span>' + escapeHtml(copy(state, 'Set traffic rules', '设置流量规则')) + '</span></button></header><div class="checkout-route-pills"><span class="checkout-route-native">' + icon('store', 13) + ' Shopify ' + escapeHtml(routing.native + '%') + '</span><span class="checkout-route-hosted">' + icon('card', 13) + ' BestCheckout ' + escapeHtml(hostedTotal + '%') + '</span>' + variantPills + '</div><small class="checkout-route-helper">' + escapeHtml(copy(state, 'Different audience → separate Funnel. Same audience → split traffic here.', '不同受众 → 使用不同漏斗；相同受众 → 在这里分配流量。')) + '</small></section>';
}

function renderCheckoutLane(funnel, state, checkouts, routing) {
  const cards = checkouts.length ? checkouts.map(function (node) { return renderJourneyNode(node, state, routing.checkouts[node.id], checkouts.length > 1); }).join('') : '<div class="journey-lane-empty"><span>' + icon('card', 17) + '</span><p>' + escapeHtml(copy(state, 'Add a Checkout page', '添加一个 Checkout 页面')) + '</p></div>';
  return '<section class="journey-lane journey-lane-checkout"><header><span class="journey-lane-icon">' + icon('card', 16) + '</span><span><small>' + escapeHtml(copy(state, 'Step 1', '第 1 步')) + '</small><strong>' + escapeHtml(copy(state, 'Checkout', 'Checkout')) + '</strong></span><b>' + checkouts.length + '</b></header>' + renderCheckoutRouteSummary(funnel, state, checkouts, routing) + '<div class="journey-lane-stack">' + cards + renderAddPageButton(funnel, state, 'checkout') + '</div></section>';
}

function renderFunnelEntryOverviewLegacy(funnel, state) {
  const fieldLabels = state.ui.locale === 'zh'
    ? { customer_type: '新客与老客', logged_in: '登录状态', country: '国家或地区', region: '州或省', city: '城市', customer_language: '客户语言', customer_tag: '客户标签', device: '设备', traffic_source: '流量来源', cart_total: '购物车金额', cart_contains: '购物车包含商品', cart_collection: '购物车包含系列', cart_sku: '购物车包含 SKU', past_orders: '历史订单数', lifetime_value: '客户累计消费' }
    : { customer_type: 'Customer', logged_in: 'Account', country: 'Market', region: 'Region', city: 'City', customer_language: 'Language', customer_tag: 'Tag', device: 'Device', traffic_source: 'Source', cart_total: 'Cart', cart_contains: 'Cart', cart_collection: 'Collection', cart_sku: 'SKU', past_orders: 'Orders', lifetime_value: 'LTV' };
  const operatorLabels = state.ui.locale === 'zh'
    ? { is: '是', is_not: '不是', one_of: '属于任一项', not_one_of: '不属于任一项', equals: '等于', not_equal: '不等于', at_least: '至少为', at_most: '至多为', between: '介于', contains: '包含', does_not_contain: '不包含', within_last: '最近', more_than_ago: '早于' }
    : { is: 'is', is_not: 'is not', one_of: 'is one of', not_one_of: 'is not one of', equals: 'equals', not_equal: 'does not equal', at_least: 'at least', at_most: 'at most', between: 'between', contains: 'contains', does_not_contain: 'does not contain', within_last: 'within', more_than_ago: 'before' };
  const conditions = (funnel.audienceConditions || []).map(function (rule) {
    const field = rule.shortLabel || rule.fieldLabel || fieldLabels[rule.field] || rule.field || '';
    const operator = rule.operatorLabel || operatorLabels[rule.operator] || rule.operator || '';
    const text = field + ' ' + operator + ' ' + (rule.value || '');
    return '<span data-i18n-skip>' + escapeHtml(text) + '</span>';
  }).join('') || '<span data-i18n-skip>' + escapeHtml(funnel.audience) + '</span>';
  return '<section class="funnel-entry-overview"><header><div><span class="eyebrow">' + escapeHtml(copy(state, 'Layer 1: Funnel routing', '第 1 层：漏斗路由')) + '</span><h2>' + escapeHtml(copy(state, 'Who enters this Funnel?', '哪些用户进入此漏斗？')) + '</h2><p>' + escapeHtml(copy(state, 'Set the eligible audience once for the whole journey. Templates are chosen later by the Checkout experiment.', '整条购买路径只配置一次准入用户；进入后才由 Checkout 实验决定使用哪个模板。')) + '</p></div><button type="button" class="button button-secondary" data-action="edit-funnel-entry" data-funnel-id="' + escapeHtml(funnel.id) + '">' + icon('settings', 16) + '<span>' + escapeHtml(copy(state, 'Configure entry', '配置漏斗入口')) + '</span></button></header><div class="funnel-entry-overview-grid"><article><span class="funnel-entry-overview-icon">' + icon('user', 18) + '</span><div><small>' + escapeHtml(copy(state, 'Eligible buyers', '符合条件的买家')) + '</small><strong>' + escapeHtml(copy(state, 'All conditions must match', '须同时满足全部条件')) + '</strong><div class="funnel-entry-rule-chips">' + conditions + '</div></div></article><article><span class="funnel-entry-overview-icon funnel-entry-priority-icon">' + icon('flow', 18) + '</span><div><small>' + escapeHtml(copy(state, 'Funnel priority', '漏斗优先级')) + '</small><strong>' + escapeHtml(copy(state, 'Priority #', '优先级 #') + funnel.priority) + '</strong><p>' + escapeHtml(copy(state, 'If several Funnels match, this order decides which journey runs.', '若多个漏斗同时命中，优先级更高的路径先执行。')) + '</p></div></article><article><span class="funnel-entry-overview-icon funnel-entry-fallback-icon">' + icon('store', 18) + '</span><div><small>' + escapeHtml(copy(state, 'Safety fallback', '默认安全兜底')) + '</small><strong>Shopify Checkout</strong><p>' + escapeHtml(copy(state, 'No Funnel match → Shopify native Checkout.', '未命中任何漏斗 → Shopify 原生 Checkout。')) + '</p></div></article></div></section>';
}

function renderFunnelEntryOverview(funnel, state) {
  const fieldLabels = state.ui.locale === 'zh'
    ? { customer_type: '客户', logged_in: '账户', country: '国家/地区', region: '地区', city: '城市', customer_language: '语言', customer_tag: '客户标签', device: '设备', traffic_source: '来源', cart_total: '购物车', cart_contains: '购物车商品', cart_collection: '商品系列', cart_sku: 'SKU', past_orders: '历史订单', lifetime_value: '累计消费' }
    : { customer_type: 'Customer', logged_in: 'Account', country: 'Market', region: 'Region', city: 'City', customer_language: 'Language', customer_tag: 'Tag', device: 'Device', traffic_source: 'Source', cart_total: 'Cart', cart_contains: 'Cart', cart_collection: 'Collection', cart_sku: 'SKU', past_orders: 'Orders', lifetime_value: 'LTV' };
  const operatorLabels = state.ui.locale === 'zh'
    ? { is: '是', is_not: '不是', one_of: '属于任一项', not_one_of: '不属于任一项', equals: '等于', not_equal: '不等于', at_least: '至少', at_most: '至多', between: '介于', contains: '包含', does_not_contain: '不包含', within_last: '最近', more_than_ago: '早于' }
    : { is: 'is', is_not: 'is not', one_of: 'is one of', not_one_of: 'is not one of', equals: 'equals', not_equal: 'does not equal', at_least: 'at least', at_most: 'at most', between: 'between', contains: 'contains', does_not_contain: 'does not contain', within_last: 'within', more_than_ago: 'before' };
  const conditions = (funnel.audienceConditions || []).map(function (rule) {
    const field = rule.shortLabel || rule.fieldLabel || fieldLabels[rule.field] || rule.field || '';
    const operator = rule.operatorLabel || operatorLabels[rule.operator] || rule.operator || '';
    return '<span data-i18n-skip>' + escapeHtml(field + ' ' + operator + ' ' + (rule.value || '')) + '</span>';
  }).join('') || '<span data-i18n-skip>' + escapeHtml(funnel.audience) + '</span>';
  return '<section class="funnel-entry-summary"><span class="funnel-entry-summary-icon">' + icon('user', 17) + '</span><div class="funnel-entry-summary-audience"><small>' + escapeHtml(copy(state, 'Funnel entry', '漏斗入口')) + '</small><div class="funnel-entry-rule-chips">' + conditions + '</div></div><div class="funnel-entry-summary-meta"><small>' + escapeHtml(copy(state, 'Priority', '优先级')) + '</small><strong>#' + escapeHtml(funnel.priority) + '</strong></div><div class="funnel-entry-summary-fallback"><span>' + icon('store', 15) + '</span><small>' + escapeHtml(copy(state, 'Other buyers → Shopify Checkout', '其他买家 → Shopify Checkout')) + '</small></div><button type="button" class="button button-plain" data-action="edit-funnel-entry" data-funnel-id="' + escapeHtml(funnel.id) + '">' + icon('settings', 15) + '<span>' + escapeHtml(copy(state, 'Edit entry', '编辑入口')) + '</span></button></section>';
}

function renderCanvasLegacy(funnel, state) {
  const entry = nodesOf(funnel, 'entry')[0];
  const checkouts = nodesOf(funnel, 'checkout');
  const upsells = nodesOf(funnel, 'upsell');
  const downsells = nodesOf(funnel, 'downsell');
  const thankyous = nodesOf(funnel, 'thank-you');
  const routing = checkoutRouting(funnel);
  const canvasZoom = Math.max(0.65, Math.min(1.2, Number(state.ui.canvasZoom) || 1));
  const zoomLabel = Math.round(canvasZoom * 100) + '%';
  const toolbar = '<div class="funnel-canvas-toolbar"><div><span class="eyebrow">' + escapeHtml(copy(state, 'Buyer journey canvas', '购买路径画布')) + '</span><p>' + escapeHtml(copy(state, 'The canvas opens fitted to the available space. Drag an empty area to pan, then zoom in only when you need detail.', '画布默认适应当前空间；拖动画布空白处可平移，需要查看细节时再放大。')) + '</p></div><div class="funnel-canvas-toolbar-actions"><div class="funnel-canvas-legend"><span><i class="legend-dot legend-dot-bestcheckout"></i>' + escapeHtml(copy(state, 'BestCheckout path', 'BestCheckout 路径')) + '</span><span><i class="legend-dot legend-dot-shopify"></i>' + escapeHtml(copy(state, 'Shopify native control', 'Shopify 原生对照组')) + '</span></div><div class="canvas-zoom-controls" role="group" aria-label="' + escapeHtml(copy(state, 'Canvas zoom', '画布缩放')) + '"><button type="button" data-action="canvas-fit" title="' + escapeHtml(copy(state, 'Fit canvas', '适应画布')) + '">' + icon('expand', 15) + '<span>' + escapeHtml(copy(state, 'Fit', '适应')) + '</span></button><button type="button" data-action="canvas-zoom-out" aria-label="' + escapeHtml(copy(state, 'Zoom out', '缩小')) + '">−</button><output>' + zoomLabel + '</output><button type="button" data-action="canvas-zoom-in" aria-label="' + escapeHtml(copy(state, 'Zoom in', '放大')) + '">+</button></div><button type="button" class="canvas-fullscreen-launch" data-action="toggle-focus-mode" data-focus-scope="canvas">' + icon('expand', 15) + '<span>' + escapeHtml(copy(state, 'Full-screen canvas', '全屏画布')) + '</span></button></div></div>';
  const entryMarkup = entry ? renderJourneyNode(entry, state) : '';
  const checkoutLane = renderLane(funnel, state, {
    key: 'checkout', kind: 'checkout', nodes: checkouts, allocations: routing.checkouts, icon: 'card', stage: 'Step 1', stageZh: '第 1 步', title: 'Checkout pages', titleZh: 'Checkout 页面', empty: 'Add a Checkout page', emptyZh: '添加一个 Checkout 页面',
  });
  const thankyouLane = renderLane(funnel, state, {
    key: 'thankyou', kind: 'thank-you', nodes: thankyous, icon: 'check', stage: 'After offers', stageZh: '购后流程结束后', title: 'Thank you pages', titleZh: 'Thank you 页面', empty: 'Add a Thank you page', emptyZh: '添加一个 Thank you 页面',
  });
  return '<div class="funnel-canvas-shell">' + toolbar + '<div class="canvas-wrap" data-canvas-pan><div class="funnel-journey-scale" style="--journey-zoom:' + canvasZoom + '"><div class="funnel-journey-board" role="group" aria-label="Buyer journey canvas"><section class="journey-entry-stage"><header><span class="journey-lane-icon">' + icon('store', 16) + '</span><span><small>' + escapeHtml(copy(state, 'Start', '开始')) + '</small><strong>' + escapeHtml(copy(state, 'Storefront', '店铺前台')) + '</strong></span></header>' + entryMarkup + '</section><div class="journey-stage-arrow journey-stage-arrow-routing">' + icon('arrow', 18) + '</div>' + renderCheckoutRoutingStage(funnel, state, checkouts, routing) + '<div class="journey-stage-arrow journey-stage-arrow-checkout">' + icon('arrow', 18) + '</div>' + checkoutLane + '<div class="journey-stage-arrow journey-stage-arrow-offer"><small>' + escapeHtml(copy(state, 'Payment complete', '支付完成')) + '</small>' + icon('arrow', 18) + '</div>' + renderOfferLane(funnel, state, upsells, downsells) + '<div class="journey-stage-arrow journey-stage-arrow-thankyou"><small>' + escapeHtml(copy(state, 'Continue', '继续')) + '</small>' + icon('arrow', 18) + '</div>' + thankyouLane + '</div></div></div></div>';
}

function renderCanvas(funnel, state) {
  const entry = nodesOf(funnel, 'entry')[0];
  const checkouts = nodesOf(funnel, 'checkout');
  const upsells = nodesOf(funnel, 'upsell');
  const downsells = nodesOf(funnel, 'downsell');
  const thankyous = nodesOf(funnel, 'thank-you');
  const routing = checkoutRouting(funnel);
  const canvasZoom = Math.max(0.65, Math.min(1.2, Number(state.ui.canvasZoom) || 0.82));
  const zoomLabel = Math.round(canvasZoom * 100) + '%';
  const toolbar = '<div class="funnel-canvas-toolbar funnel-canvas-toolbar-compact"><div><strong>' + escapeHtml(copy(state, 'Buyer journey', '购买路径')) + '</strong><small>' + escapeHtml(copy(state, 'Storefront → Checkout → post-purchase', '店铺前台 → Checkout → 购后流程')) + '</small></div><div class="funnel-canvas-toolbar-actions"><div class="canvas-zoom-controls" role="group" aria-label="' + escapeHtml(copy(state, 'Canvas zoom', '画布缩放')) + '"><button type="button" data-action="canvas-fit" title="' + escapeHtml(copy(state, 'Fit canvas', '适应画布')) + '">' + icon('expand', 15) + '<span>' + escapeHtml(copy(state, 'Fit', '适应')) + '</span></button><button type="button" data-action="canvas-zoom-out" aria-label="' + escapeHtml(copy(state, 'Zoom out', '缩小')) + '">−</button><output>' + zoomLabel + '</output><button type="button" data-action="canvas-zoom-in" aria-label="' + escapeHtml(copy(state, 'Zoom in', '放大')) + '">+</button></div><button type="button" class="canvas-fullscreen-launch" data-action="toggle-focus-mode" data-focus-scope="canvas">' + icon('expand', 15) + '<span>' + escapeHtml(copy(state, 'Full-screen canvas', '全屏画布')) + '</span></button></div></div>';
  const entryMarkup = entry ? renderJourneyNode(entry, state) : '';
  const checkoutLane = renderCheckoutLane(funnel, state, checkouts, routing);
  const thankyouLane = renderLane(funnel, state, {
    key: 'thankyou', kind: 'thank-you', nodes: thankyous, icon: 'check', stage: 'After offers', stageZh: '购后流程结束后', title: 'Thank you pages', titleZh: 'Thank you 页面', empty: 'Add a Thank you page', emptyZh: '添加一个 Thank you 页面',
  });
  return '<div class="funnel-canvas-shell">' + toolbar + '<div class="canvas-wrap" data-canvas-pan><div class="funnel-journey-scale" style="--journey-zoom:' + canvasZoom + '"><div class="funnel-journey-board" role="group" aria-label="Buyer journey canvas"><section class="journey-entry-stage"><header><span class="journey-lane-icon">' + icon('store', 16) + '</span><span><small>' + escapeHtml(copy(state, 'Start', '开始')) + '</small><strong>' + escapeHtml(copy(state, 'Storefront', '店铺前台')) + '</strong></span></header>' + entryMarkup + '</section><div class="journey-stage-arrow journey-stage-arrow-to-checkout">' + icon('arrow', 18) + '</div>' + checkoutLane + '<div class="journey-stage-arrow journey-stage-arrow-offer">' + icon('arrow', 18) + '</div>' + renderOfferLane(funnel, state, upsells, downsells) + '<div class="journey-stage-arrow journey-stage-arrow-thankyou">' + icon('arrow', 18) + '</div>' + thankyouLane + '</div></div></div></div>';
}

function renderInspector(funnel, state) {
  const selected = funnel.nodes.find(function (node) { return node.id === state.ui.activeNodeId; }) || funnel.nodes[0];
  if (!selected) return '';
  const page = selected.pageId ? state.pages.find(function (item) { return item.id === selected.pageId; }) : null;
  const livePin = deploymentPinFor(funnel, selected.id);
  const isOffer = selected.kind === 'upsell' || selected.kind === 'downsell';
  const offer = isOffer ? state.offerVersions.find(function (item) { return item.id === selected.offerRuleRef; }) : null;
  const offerProduct = offer ? state.offerCatalogVariants.find(function (item) { return item.id === offer.targetVariantId; }) : null;
  const recommendation = isOffer ? state.recommendationRuleVersions.find(function (item) { return item.id === selected.recommendationRuleRef; }) : null;
  const sourceProduct = recommendation ? state.offerSourceProducts.find(function (item) { return recommendation.sourceProductIds.includes(item.id); }) : null;
  const actions = page ? '<div class="inline-actions">' + (isOffer ? button(copy(state, 'Edit product & rule', '编辑商品与规则'), 'edit-offer', { kind: 'secondary', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '" data-node-id="' + escapeHtml(selected.id) + '"' }) : button(copy(state, 'Change page', '更换页面'), 'select-node-page', { kind: 'secondary', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '" data-node-id="' + escapeHtml(selected.id) + '"' })) + button(copy(state, 'Edit page design', '编辑页面设计'), 'edit-node', { kind: 'primary', icon: 'edit', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '" data-node-id="' + escapeHtml(selected.id) + '"' }) + '</div>' : selected.kind === 'entry' ? '<div class="inline-actions">' + button(copy(state, 'Configure routing', '配置分流与受众'), 'edit-checkout-routing', { kind: 'secondary', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '"' }) + '</div>' : '';
  const purpose = selected.kind === 'entry'
    ? copy(state, 'Eligible carts begin here. Configure the Checkout routes and experiment allocation in the next step.', '符合条件的购物车从这里开始；请在下一步配置 Checkout 路由、受众与实验分流。')
    : selected.kind === 'upsell'
      ? copy(state, 'A one-click offer shown after payment. Configure its product and rule before publishing.', '支付后展示的一键加购优惠；发布前请配置商品与展示规则。')
      : selected.kind === 'downsell'
        ? copy(state, 'A lower-priced backup shown when an earlier offer is declined.', '前一个优惠被拒绝时展示的低价备用优惠。')
        : selected.kind === 'checkout'
          ? copy(state, 'One of the Checkout pages that buyers can be routed to.', '买家可被路由到的 Checkout 页面之一。')
          : copy(state, 'One of the order confirmation pages that can finish this journey.', '可作为此购买路径终点的订单确认页面之一。');
  const showWhen = selected.kind === 'downsell'
    ? copy(state, 'The previous offer is declined', '前一个优惠被拒绝')
    : sourceProduct
      ? (state.ui.locale === 'zh' ? '已购买 ' + sourceProduct.name : sourceProduct.name + ' is purchased')
      : copy(state, 'The order is paid', '订单已支付');
  const offerSettings = offer && offerProduct ? '<div class="offer-settings-summary"><div><span>' + escapeHtml(copy(state, 'Offer product', '优惠商品')) + '</span><strong data-i18n-skip>' + escapeHtml(offerProduct.name) + '</strong></div><div><span>' + escapeHtml(copy(state, 'Offer price', '优惠价格')) + '</span><strong data-i18n-skip>$' + escapeHtml(offer.pricing.amount) + ' ' + escapeHtml(offer.pricing.currency) + '</strong></div><div><span>' + escapeHtml(copy(state, 'Show when', '展示条件')) + '</span><strong data-i18n-skip>' + escapeHtml(showWhen) + '</strong></div></div>' : isOffer ? '<div class="offer-settings-summary offer-settings-empty"><span>' + escapeHtml(copy(state, 'Product rule still needs to be set.', '还需要设置商品规则。')) + '</span></div>' : '';
  const versionCopy = page && livePin ? copy(state, 'Live page version: ', '线上页面版本：') + 'v' + livePin.pinnedVersion : '';
  return '<div class="node-inspector"><div><span class="eyebrow">' + escapeHtml(copy(state, 'Selected step', '当前步骤')) + '</span><h3 data-i18n-skip>' + escapeHtml(selected.label) + '</h3><p>' + escapeHtml(purpose) + '</p>' + offerSettings + (versionCopy ? '<small class="node-inspector-version">' + escapeHtml(versionCopy) + '</small>' : '') + '</div>' + actions + '</div>';
}

function renderDetailHeader(funnel, state) {
  const staleDeployment = deploymentIsStale(funnel, state);
  let actions = button(copy(state, 'Preview journey', '预览路径'), 'preview-funnel', { icon: 'play' });
  if (funnel.status === 'Live') {
    actions += button(copy(state, 'Pause traffic', '暂停流量'), 'pause-funnel', { kind: 'secondary', icon: 'pause', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '"' });
    if (staleDeployment) actions += button(copy(state, 'Republish Funnel', '重新发布漏斗'), 'publish-funnel', { kind: 'primary', icon: 'play', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '"' });
  } else if (funnel.status === 'Paused') {
    actions += button(copy(state, 'Resume last deployment', '恢复上次发布'), 'resume-last-deployment', { kind: staleDeployment ? 'secondary' : 'primary', icon: 'play', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '"' });
  } else {
    actions += button(copy(state, 'Publish Funnel', '发布漏斗'), 'publish-funnel', { kind: 'primary', icon: 'play', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '"' });
  }
  return pageHeader(funnel.name, funnel.audience, actions, [{ label: copy(state, 'Funnels', '漏斗'), route: 'funnels' }, { label: funnel.name }]);
}

function renderMoreSettings(funnel, state) {
  const guardrails = Object.keys(funnel.guardrails).filter(function (key) { return key !== 'fallback'; }).map(function (key) {
    const label = key === 'writeback' ? copy(state, 'Order writeback', '订单回写') : key === 'embed' ? copy(state, 'App embed', 'App 嵌入') : key === 'shopifyAccess' ? copy(state, 'Shopify access', 'Shopify 授权') : key === 'graph' ? copy(state, 'Buyer journey', '购买路径') : key.charAt(0).toUpperCase() + key.slice(1);
    return '<div class="guardrail-row"><span>' + escapeHtml(label) + '</span>' + badge(funnel.guardrails[key]) + '</div>';
  }).join('');
  const routing = '<div class="card"><div class="card-pad">' + sectionHeader(copy(state, 'Who enters this Funnel', '哪些用户进入此漏斗'), copy(state, 'All listed conditions must match.', '须同时满足以下所有条件。'), button(copy(state, 'Edit rules', '编辑规则'), 'edit-rules', { kind: 'plain' })) + '<ol class="rule-list">' + funnel.rules.map(function (rule, index) { return '<li><span>' + (index + 1) + '</span><strong data-i18n-skip>' + escapeHtml(rule) + '</strong></li>'; }).join('') + '</ol></div></div>';
  const status = '<aside class="card"><div class="card-pad">' + sectionHeader(copy(state, 'Ready to publish', '发布准备情况'), copy(state, 'Checks run again whenever you publish.', '每次发布时都会重新检查。')) + '<div class="guardrail-list">' + guardrails + '</div><button type="button" class="button button-secondary button-block" data-route="settings?tab=diagnostics">' + escapeHtml(copy(state, 'Review store status', '查看店铺状态')) + '</button></div></aside>';
  return '<details class="funnel-advanced"><summary><span>' + icon('settings', 17) + '<strong>' + escapeHtml(copy(state, 'More settings', '更多设置')) + '</strong><small>' + escapeHtml(copy(state, 'Audience, traffic and publishing', '受众、流量与发布')) + '</small></span>' + icon('chevron', 16) + '</summary><section class="funnel-lower-grid">' + routing + status + '</section></details>';
}

function renderFunnelDetailLegacy(funnel, state) {
  return '<div class="page-stack funnel-detail-page">' + renderDetailHeader(funnel, state) + renderFunnelEntryOverview(funnel, state) + '<section class="card"><div class="card-pad funnel-detail-intro"><div><span class="eyebrow">' + escapeHtml(copy(state, 'Funnel canvas', '漏斗画布')) + '</span><p>' + escapeHtml(copy(state, 'Every lane can hold multiple pages. The Checkout experiment below applies only after this Funnel is matched.', '每一条路径均可包含多个页面；下方 Checkout 实验只对已进入此漏斗的用户生效。')) + '</p></div><div class="title-with-badge">' + badge(funnel.status) + '</div></div>' + renderCanvas(funnel, state) + renderInspector(funnel, state) + '</section>' + renderMoreSettings(funnel, state) + '</div>';
}

function renderFunnelDetail(funnel, state) {
  return '<div class="page-stack funnel-detail-page">' + renderDetailHeader(funnel, state) + renderFunnelEntryOverview(funnel, state) + '<section class="card funnel-canvas-card">' + renderCanvas(funnel, state) + renderInspector(funnel, state) + '</section>' + renderMoreSettings(funnel, state) + '</div>';
}

function renderFunnelsListPage(state) {
  const filters = ['all', 'live', 'draft', 'paused'].map(function (filter) {
    const label = filter === 'all' ? copy(state, 'All', '全部') : filter === 'live' ? copy(state, 'Live', '在线') : filter === 'draft' ? copy(state, 'Draft', '草稿') : copy(state, 'Paused', '已暂停');
    const selected = state.ui.funnelStatusFilter === filter;
    return '<button type="button" class="funnel-index-tab' + (selected ? ' is-active' : '') + '" data-action="filter-funnels" data-filter="' + filter + '" aria-pressed="' + selected + '">' + escapeHtml(label) + '</button>';
  }).join('');
  const header = pageHeader(copy(state, 'Funnels', '漏斗'), copy(state, 'Create buyer journeys, then open one to arrange its pages and offers.', '创建购买路径，然后进入画布编排页面与优惠。'), button(copy(state, 'Create Funnel', '创建漏斗'), 'open-create-funnel', { kind: 'primary', icon: 'plus' }));
  return '<div class="page-stack">' + header + renderGlobalFunnelRouter(state) + '<section class="card funnel-index-card"><div class="funnel-index-toolbar"><div class="funnel-index-tabs" role="tablist" aria-label="' + escapeHtml(copy(state, 'Filter Funnels', '筛选漏斗')) + '">' + filters + '</div><span class="funnel-index-count">' + escapeHtml(state.funnels.length + ' ' + copy(state, 'funnels', '个漏斗')) + '</span></div>' + renderFunnelList(state) + '</section></div>';
}

export function renderFunnels(state, route) {
  const requestedId = route && route.segments[1] ? route.segments[1] : null;
  const funnel = requestedId ? state.funnels.find(function (item) { return item.id === requestedId; }) : null;
  return funnel ? renderFunnelDetail(funnel, state) : renderFunnelsListPage(state);
}
