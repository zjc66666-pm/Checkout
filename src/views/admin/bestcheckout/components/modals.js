import { badge, button, icon } from './common.js';
import { getSetupReadiness } from '../readiness.js?rev=20260719-optional-growth-v105';
import { escapeHtml } from '../utils.js';

function modalShell(id, title, subtitle, body, footer, wide) {
  return '<div class="modal-backdrop"><section class="modal' + (wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(id) + '-title"><header class="modal-header"><div><h2 id="' + escapeHtml(id) + '-title">' + escapeHtml(title) + '</h2>' + (subtitle ? '<p>' + escapeHtml(subtitle) + '</p>' : '') + '</div><button type="button" class="icon-button" data-action="close-modal" aria-label="Close">×</button></header><div class="modal-body">' + body + '</div>' + (footer ? '<footer class="modal-footer">' + footer + '</footer>' : '') + '</section></div>';
}

function createFunnelAudiencePresets(isZh) {
  return [
    {
      id: 'all_carts', icon: 'store', recommended: true,
      title: isZh ? '所有可结账购物车' : 'All eligible carts',
      copy: isZh ? '不做额外细分；购物车中有商品的买家都会进入。' : 'No extra segmentation. Every cart with items can enter.',
      rule: isZh ? '购物车商品数 ≥ 1' : 'Cart items ≥ 1',
      availability: isZh ? '实时可用' : 'Available at handoff',
    },
    {
      id: 'cart_value', icon: 'products',
      title: isZh ? '按购物车或商品' : 'Cart or product',
      copy: isZh ? '为高客单价、指定商品或使用优惠码的购物车创建路径。' : 'Route high-value carts, selected products, or discount-code carts.',
      rule: isZh ? '购物车金额 ≥ $60' : 'Cart total ≥ $60',
      availability: isZh ? '实时可用' : 'Available at handoff',
    },
    {
      id: 'storefront_context', icon: 'globe',
      title: isZh ? '按当前市场与语言' : 'Storefront market and language',
      copy: isZh ? '按买家当前在店铺中选择的国家/市场或语言展示不同体验。' : 'Tailor the journey to the country, market, or language currently selected on the storefront.',
      rule: isZh ? '店铺当前国家/市场 是 美国' : 'Current storefront country is United States',
      availability: isZh ? '实时可用' : 'Available at handoff',
    },
    {
      id: 'specific_product', icon: 'products',
      title: isZh ? '按购物车商品' : 'Cart product',
      copy: isZh ? '让包含指定商品或 SKU 的购物车进入专属购买流程。' : 'Route carts containing a selected product or SKU into a dedicated purchase flow.',
      rule: isZh ? '购物车包含商品 Nighttime Gummies' : 'Cart contains Nighttime Gummies',
      availability: isZh ? '实时可用' : 'Available at handoff',
    },
    {
      id: 'known_customer', icon: 'user',
      title: isZh ? '按已识别客户' : 'Known customers',
      copy: isZh ? '面向已登录的 Shopify 客户，可按标签、历史订单或累计消费细分。' : 'For signed-in Shopify customers: tag, order history, or lifetime value.',
      rule: isZh ? '已登录 ∧ 历史订单数 ≥ 1' : 'Signed in ∧ past orders ≥ 1',
      availability: isZh ? '需要客户身份' : 'Requires customer identity',
      restricted: true,
    },
    {
      id: 'custom', icon: 'settings',
      title: isZh ? '自定义组合' : 'Custom combination',
      copy: isZh ? '先创建草稿，再组合客户身份、店铺上下文与购物车条件。' : 'Create a draft, then combine customer identity, storefront context, and cart rules.',
      rule: isZh ? '从“购物车商品数 ≥ 1”开始' : 'Start with cart items ≥ 1',
      availability: isZh ? '创建后配置' : 'Configure after creation',
    },
  ];
}

export function renderCreateFunnelModal(step, wizard, locale) {
  const currentStep = step === 'details' ? 'details' : 'goal';
  const selectedPath = wizard && wizard.path ? wizard.path : 'upsell';
  const isZh = locale === 'zh';
  const goals = [
    { value: 'upsell', title: 'Increase average order value', copy: 'Show one relevant offer after payment.', path: 'Checkout → Upsell → Thank you', recommended: true },
    { value: 'upsell-downsell', title: 'Recover declined offers', copy: 'Follow a declined offer with a lower-priced alternative.', path: 'Checkout → Upsell → Downsell → Thank you' },
    { value: 'checkout-only', title: 'Improve checkout completion', copy: 'Start with a focused checkout and add offers later.', path: 'Checkout → Thank you' },
  ];
  const progress = '<div class="wizard-progress"><span class="' + (currentStep === 'goal' ? 'is-current' : 'is-complete') + '"><b>1</b>Choose a goal</span><i></i><span class="' + (currentStep === 'details' ? 'is-current' : '') + '"><b>2</b>Name and audience</span></div>';
  if (currentStep === 'goal') {
    const cards = goals.map(function (goal) {
      return '<label class="goal-card"><input type="radio" name="path" value="' + escapeHtml(goal.value) + '"' + (selectedPath === goal.value ? ' checked' : '') + '/><span class="goal-card-copy"><span><strong>' + escapeHtml(goal.title) + '</strong>' + (goal.recommended ? '<em>Recommended</em>' : '') + '</span><small>' + escapeHtml(goal.copy) + '</small><code>' + escapeHtml(goal.path) + '</code></span></label>';
    }).join('');
    const body = progress + '<form id="create-funnel-goal-form"><fieldset class="goal-grid"><legend>What do you want this Funnel to improve?</legend>' + cards + '</fieldset><div class="modal-callout">' + icon('shield', 17) + '<span><strong>Nothing goes live when you create it</strong><small>BestCheckout creates a draft with Shopify native checkout as the safety route. You choose traffic only when publishing.</small></span></div></form>';
    const footer = button('Cancel', 'close-modal') + '<button type="submit" form="create-funnel-goal-form" class="button button-primary">Continue</button>';
    return modalShell('create-funnel', 'Create a Funnel', 'Choose the business result first. BestCheckout builds the starting journey for you.', body, footer, false);
  }
  const selectedGoal = goals.find(function (goal) { return goal.value === selectedPath; }) || goals[0];
  const defaultName = isZh
    ? (selectedPath === 'checkout-only' ? '结账转化提升' : selectedPath === 'upsell-downsell' ? '优惠挽回漏斗' : '客单价提升')
    : (selectedPath === 'checkout-only' ? 'Checkout conversion' : selectedPath === 'upsell-downsell' ? 'Revenue recovery' : 'AOV growth');
  const selectedAudiencePreset = wizard && wizard.audiencePreset ? wizard.audiencePreset : 'all_carts';
  const audienceCards = createFunnelAudiencePresets(isZh).map(function (preset) {
    const selected = preset.id === selectedAudiencePreset ? ' checked' : '';
    const selectedClass = preset.id === selectedAudiencePreset ? ' is-selected' : '';
    const badgeClass = preset.restricted ? ' is-restricted' : preset.recommended ? ' is-recommended' : '';
    return '<label class="audience-starter-card' + selectedClass + '"><input type="radio" name="audiencePreset" value="' + escapeHtml(preset.id) + '"' + selected + '/><span class="audience-starter-icon">' + icon(preset.icon, 18) + '</span><span class="audience-starter-copy"><span><strong>' + escapeHtml(preset.title) + '</strong>' + (preset.recommended ? '<em>' + escapeHtml(isZh ? '推荐' : 'Recommended') + '</em>' : '') + '</span><small>' + escapeHtml(preset.copy) + '</small><code>' + escapeHtml(preset.rule) + '</code><i class="audience-starter-availability' + badgeClass + '">' + escapeHtml(preset.availability) + '</i></span></label>';
  }).join('');
  const audienceChooser = '<fieldset class="audience-starter-fieldset"><legend>' + escapeHtml(isZh ? '哪些买家进入这个漏斗？' : 'Who enters this Funnel?') + '</legend><p>' + escapeHtml(isZh ? '先选择最接近的起始条件。创建后仍可在“配置漏斗入口”中叠加更多 AND 条件。' : 'Choose the closest starting rule. You can add more AND conditions under Configure Funnel entry after creation.') + '</p><div class="audience-starter-grid">' + audienceCards + '</div></fieldset><section class="audience-capability-note"><span>' + icon('shield', 17) + '</span><div><strong>' + escapeHtml(isZh ? '本次路由可用的数据' : 'Data available for this routing decision') + '</strong><p>' + escapeHtml(isZh ? '购物车金额、币种、商品数、商品与 SKU，以及店铺当前国家/市场和语言。' : 'Cart totals, currency, item count, products and SKUs, plus the current storefront country, market, and language.') + '</p><small>' + escapeHtml(isZh ? '客户标签、营销订阅、订单数、累计消费和最近订单仅在买家已登录 Shopify 客户账号时可用；其他访客不命中时将回退到 Shopify Checkout。' : 'Customer tags, marketing consent, order count, lifetime spend, and last order are available only for signed-in Shopify customers. Other visitors fall back to Shopify Checkout.') + '</small></div></section>';
  const body = progress + '<form id="create-funnel-form" class="form-stack"><input type="hidden" name="path" value="' + escapeHtml(selectedPath) + '"/><div class="journey-summary"><span class="journey-summary-icon">' + icon('flow', 19) + '</span><div><small>' + escapeHtml(isZh ? '起始路径' : 'Starting journey') + '</small><strong>' + escapeHtml(selectedGoal.title) + '</strong><code>' + escapeHtml(selectedGoal.path) + '</code></div></div><label>' + escapeHtml(isZh ? '漏斗名称' : 'Funnel name') + '<input type="text" name="name" value="' + escapeHtml(defaultName) + '" required /></label>' + audienceChooser + '<div class="auto-setup-list"><span>' + icon('check', 15) + '<b>' + escapeHtml(isZh ? '自动选择 Checkout 和 Thank you 页面' : 'Checkout and Thank-you pages selected automatically') + '</b></span><span>' + icon('check', 15) + '<b>' + escapeHtml(isZh ? 'Shopify 原生 Checkout 始终作为兜底' : 'Shopify native fallback stays on') + '</b></span><span>' + icon('check', 15) + '<b>' + escapeHtml(isZh ? '发布前初始流量保持为 0%' : 'Initial traffic stays at 0% until publish') + '</b></span></div></form>';
  const footer = button(isZh ? '返回' : 'Back', 'back-create-funnel') + '<button type="submit" form="create-funnel-form" class="button button-primary">' + escapeHtml(isZh ? '创建漏斗草稿' : 'Create draft Funnel') + '</button>';
  return modalShell('create-funnel', isZh ? '为漏斗命名' : 'Name the Funnel', isZh ? '选择谁会进入此路径。之后仍可进一步添加规则。' : 'Choose who enters this journey. You can refine the rules afterward.', body, footer, true);
}

export function renderCreatePageModal(options) {
  const context = options || {};
  const isZh = context.locale === 'zh';
  const lockedType = context.type || '';
  const typeLabel = { checkout: 'Checkout', upsell: 'Upsell', downsell: 'Downsell', 'thank-you': 'Thank you' }[lockedType] || '';
  const typeControl = lockedType
    ? '<input type="hidden" name="type" value="' + escapeHtml(lockedType) + '"/><label>' + (isZh ? '页面类型' : 'Page type') + '<input type="text" value="' + escapeHtml(typeLabel) + '" disabled /></label>'
    : '<label>' + (isZh ? '页面类型' : 'Page type') + '<select name="type"><option value="checkout">Checkout</option><option value="upsell">Upsell</option><option value="downsell">Downsell</option><option value="thank-you">Thank you</option></select></label>';
  const attachContext = context.funnelId && lockedType ? '<input type="hidden" name="attachFunnelId" value="' + escapeHtml(context.funnelId) + '"/><input type="hidden" name="attachNodeKind" value="' + escapeHtml(lockedType) + '"/>' : '';
  const body = '<form id="create-page-form" class="form-stack">' + attachContext + '<label>' + (isZh ? '页面名称' : 'Page name') + '<input type="text" name="name" placeholder="' + (isZh ? '例如：春季优惠' : 'e.g. Spring offer') + '" required /></label>' + typeControl + '<div class="modal-callout">' + icon('sparkles', 17) + '<span><strong>' + (isZh ? '从转化友好的默认结构开始' : 'Start from a conversion-safe default') + '</strong><small>' + (isZh ? '新页面会复用此页面类型的共享品牌设置与默认锁定结构。' : 'The new asset reuses the shared brand system and the default locked structure for its page type.') + '</small></span></div></form>';
  const footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + '<button type="submit" form="create-page-form" class="button button-primary">' + (isZh ? '创建草稿' : 'Create draft') + '</button>';
  return modalShell('create-page', lockedType ? (isZh ? '新建 ' + typeLabel + ' 页面' : 'Create ' + typeLabel + ' page') : (isZh ? '新建页面' : 'Create a page'), lockedType ? (isZh ? '创建后会自动添加到当前漏斗。' : 'This page will be added to the current Funnel after it is created.') : (isZh ? '先选择页面承担的转化任务，随后进入共享装修器。' : 'Choose the conversion task first; the shared editor opens next.'), body, footer, false);
}

export function renderAddJourneyPageModal(state, funnel, kind) {
  const isZh = state.ui.locale === 'zh';
  const labels = {
    checkout: { title: 'Checkout page', titleZh: 'Checkout 页面', copy: 'Checkout pages', copyZh: 'Checkout 页面', description: 'Choose a reusable Checkout page, or create a new one.', descriptionZh: '选择一个可复用的 Checkout 页面，或新建页面。' },
    upsell: { title: 'Upsell page', titleZh: 'Upsell 页面', copy: 'Upsell pages', copyZh: 'Upsell 页面', description: 'Choose a reusable Upsell page, or create a new one.', descriptionZh: '选择一个可复用的 Upsell 页面，或新建页面。' },
    downsell: { title: 'Downsell page', titleZh: 'Downsell 页面', copy: 'Downsell pages', copyZh: 'Downsell 页面', description: 'Choose a reusable Downsell page, or create a new one.', descriptionZh: '选择一个可复用的 Downsell 页面，或新建页面。' },
    'thank-you': { title: 'Thank you page', titleZh: 'Thank you 页面', copy: 'Thank you pages', copyZh: 'Thank you 页面', description: 'Choose a reusable Thank you page, or create a new one.', descriptionZh: '选择一个可复用的 Thank you 页面，或新建页面。' },
  }[kind];
  if (!labels) return '';
  const title = isZh ? labels.titleZh : labels.title;
  const pagePlural = isZh ? labels.copyZh : labels.copy;
  const description = isZh ? labels.descriptionZh : labels.description;
  const assets = state.pages.filter(function (page) { return page.type === kind; });
  const choices = assets.length ? assets.map(function (page) {
    const version = page.publishedVersionId ? (isZh ? '已发布 v' + page.version : 'Published v' + page.version) : (isZh ? '仅草稿' : 'Draft only');
    const usedBy = isZh ? '已被 ' + page.usedBy + ' 个漏斗使用' : 'Used by ' + page.usedBy + ' Funnel' + (page.usedBy === 1 ? '' : 's');
    return '<button type="button" class="journey-page-choice" data-action="attach-journey-page" data-funnel-id="' + escapeHtml(funnel.id) + '" data-page-id="' + escapeHtml(page.id) + '"><span>' + icon(kind === 'checkout' ? 'card' : kind === 'thank-you' ? 'check' : 'sparkles', 18) + '</span><span data-i18n-skip><strong>' + escapeHtml(page.name) + '</strong><small>' + escapeHtml(version + ' · ' + usedBy) + '</small></span>' + icon('chevron', 16) + '</button>';
  }).join('') : '<div class="journey-page-choice-empty"><span>' + icon('pages', 20) + '</span><strong>' + escapeHtml(isZh ? '还没有' + pagePlural : 'No ' + pagePlural + ' yet') + '</strong><p>' + escapeHtml(isZh ? '先创建第一个页面，它就会出现在此漏斗中。' : 'Create the first one, then it will appear in this Funnel.') + '</p></div>';
  const body = '<div class="journey-page-choice-list">' + choices + '</div>';
  const footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + button(isZh ? '新建页面' : 'Create new page', 'create-journey-page', { kind: 'primary', icon: 'plus', attrs: 'data-funnel-id="' + escapeHtml(funnel.id) + '" data-page-kind="' + escapeHtml(kind) + '"' });
  return modalShell('add-journey-page', isZh ? '添加 ' + title : 'Add ' + title, funnel.name + ' · ' + description, body, footer, false);
}

export function renderSelectNodePageModal(state, funnel, node) {
  const isZh = state.ui.locale === 'zh';
  const copy = function (english, chinese) { return isZh ? chinese : english; };
  const options = state.pages.filter(function (page) { return page.type === node.kind; }).map(function (page) {
    const selected = page.id === node.pageId ? ' selected' : '';
    const version = page.publishedVersionId ? 'v' + page.version : copy('Draft only', '仅草稿');
    return '<option value="' + escapeHtml(page.id) + '"' + selected + '>' + escapeHtml(page.name + ' · ' + version) + '</option>';
  }).join('');
  const body = '<form id="select-node-page-form" class="form-stack"><input type="hidden" name="funnelId" value="' + escapeHtml(funnel.id) + '"/><input type="hidden" name="nodeId" value="' + escapeHtml(node.id) + '"/><label>' + escapeHtml(copy('Reusable page asset', '可复用页面资产')) + '<select name="pageId">' + options + '</select></label><div class="modal-callout">' + icon('shield', 17) + '<span><strong>' + escapeHtml(copy('Changing the draft does not change live traffic', '更改草稿不会影响线上流量')) + '</strong><small>' + escapeHtml(copy('The current Deployment Snapshot stays pinned until this Funnel is published again.', '当前部署快照会保持固定，直到再次发布此漏斗。')) + '</small></span></div></form>';
  const footer = button(copy('Cancel', '取消'), 'close-modal') + '<button type="submit" form="select-node-page-form" class="button button-primary">' + escapeHtml(copy('Use selected page', '使用所选页面')) + '</button>';
  return modalShell('select-node-page', copy('Replace page', '更换页面'), funnel.name + ' · ' + node.label, body, footer, false);
}

export function renderAddOfferModal(state, funnel, context) {
  const isZh = state.ui.locale === 'zh';
  const copy = function (english, chinese) { return isZh ? chinese : english; };
  const existingNode = context && context.editNodeId ? funnel.nodes.find(function (node) { return node.id === context.editNodeId; }) : null;
  const requestedKind = existingNode ? existingNode.kind : context && context.kind === 'downsell' ? 'downsell' : 'upsell';
  const existingOffer = existingNode ? state.offerVersions.find(function (item) { return item.id === existingNode.offerRuleRef; }) : null;
  const existingRecommendation = existingNode ? state.recommendationRuleVersions.find(function (item) { return item.id === existingNode.recommendationRuleRef; }) : null;
  const afterNode = context && context.afterNodeId ? funnel.nodes.find(function (node) { return node.id === context.afterNodeId; }) : null;
  const options = state.pages.filter(function (page) { return page.type === requestedKind; }).map(function (page) {
    const version = page.publishedVersionId ? copy('Published v', '已发布 v') + page.version : copy('Draft only', '仅草稿');
    return '<option value="' + escapeHtml(page.id) + '"' + ((existingNode && existingNode.pageId === page.id) ? ' selected' : '') + '>' + escapeHtml(page.name + ' · ' + version) + '</option>';
  }).join('');
  const sourceOptions = state.offerSourceProducts.map(function (product) {
    const label = product.id === 'bs_product_cart_context' ? copy('Any paid cart', '任意已支付购物车') : product.name;
    return '<option value="' + escapeHtml(product.id) + '"' + ((existingRecommendation && existingRecommendation.sourceProductIds.includes(product.id)) ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
  }).join('');
  const availableVariants = state.offerCatalogVariants.filter(function (variant) { return variant.mapped && variant.inventoryState === 'Available'; });
  const preferredVariant = existingOffer ? availableVariants.find(function (variant) { return variant.id === existingOffer.targetVariantId; }) : requestedKind === 'downsell' ? availableVariants.find(function (variant) { return variant.id.includes('travel'); }) : availableVariants[0];
  const variantOptions = availableVariants.map(function (variant) {
    return '<label class="product-choice"><input type="radio" name="targetVariantId" value="' + escapeHtml(variant.id) + '"' + (preferredVariant && preferredVariant.id === variant.id ? ' checked' : '') + '/><span class="product-choice-art">' + icon(requestedKind === 'downsell' ? 'products' : 'sparkles', 19) + '</span><span data-i18n-skip><strong>' + escapeHtml(variant.name) + '</strong><small>' + escapeHtml(variant.markets.join(' · ') + ' · ' + copy('In stock', '有货')) + '</small></span></label>';
  }).join('');
  const placement = requestedKind === 'downsell' ? copy('Only after the preceding offer is declined', '仅在前一个优惠被拒绝后展示') : copy('After checkout is paid', '结账支付完成后');
  const behavior = requestedKind === 'downsell' ? copy('This lower-priced backup appears only after the previous offer is declined.', '仅在前一个优惠被拒绝后展示这个低价备用优惠。') : copy('The buyer can add this product with one click after payment.', '买家支付后可以一键将此商品加入订单。');
  const price = existingOffer ? existingOffer.pricing.amount : requestedKind === 'downsell' ? '9.00' : '19.00';
  const selectedMarkets = existingOffer ? existingOffer.markets.join(',') : 'US,CA';
  const body = '<form id="add-offer-form" class="form-stack"><input type="hidden" name="funnelId" value="' + escapeHtml(funnel.id) + '"/><input type="hidden" name="offerKind" value="' + requestedKind + '"/><input type="hidden" name="afterNodeId" value="' + escapeHtml(afterNode ? afterNode.id : '') + '"/><input type="hidden" name="nodeId" value="' + escapeHtml(existingNode ? existingNode.id : '') + '"/><div class="offer-placement"><span>' + icon(requestedKind === 'downsell' ? 'arrow' : 'sparkles', 18) + '</span><div><small>' + escapeHtml(copy('When this offer appears', '展示时机')) + '</small><strong data-i18n-skip>' + escapeHtml(placement) + '</strong><p>' + escapeHtml(behavior) + '</p></div></div><fieldset class="product-choice-list"><legend>' + escapeHtml(copy('Offer product', '优惠商品')) + '</legend>' + variantOptions + '</fieldset><label>' + escapeHtml(copy('Offer price · USD', '优惠价格 · USD')) + '<input type="number" name="price" min="0.50" step="0.01" value="' + escapeHtml(price) + '" required/><small>' + escapeHtml(copy('The final price and product availability are checked before the offer is shown.', '展示优惠前会检查最终价格和商品库存。')) + '</small></label><fieldset class="offer-rule-fields"><legend>' + escapeHtml(copy('Show this offer when', '展示条件')) + '</legend><label>' + escapeHtml(copy('Customer purchased', '客户已购买')) + '<select name="sourceProductId">' + sourceOptions + '</select></label><label>' + escapeHtml(copy('Available markets', '可用市场')) + '<select name="markets"><option value="US,CA"' + (selectedMarkets === 'US,CA' ? ' selected' : '') + '>' + escapeHtml(copy('United States and Canada', '美国和加拿大')) + '</option><option value="US"' + (selectedMarkets === 'US' ? ' selected' : '') + '>' + escapeHtml(copy('United States only', '仅美国')) + '</option><option value="CA"' + (selectedMarkets === 'CA' ? ' selected' : '') + '>' + escapeHtml(copy('Canada only', '仅加拿大')) + '</option></select></label></fieldset><label>' + escapeHtml(copy('Offer page', '优惠页面')) + '<select name="pageId">' + options + '</select><small>' + escapeHtml(copy('Use this page to control the copy and design of the offer.', '使用此页面控制优惠的文案与页面设计。')) + '</small></label><div class="offer-outcome-preview"><span><b>' + escapeHtml(copy('Accept', '接受')) + '</b> ' + escapeHtml(copy('Add to the paid order', '加入已支付订单')) + '</span><span><b>' + escapeHtml(copy('Decline', '拒绝')) + '</b> ' + escapeHtml(copy('Continue through the journey', '继续后续购买路径')) + '</span></div></form>';
  const submitLabel = existingNode ? copy('Save offer settings', '保存优惠设置') : copy('Add offer to Funnel', '添加优惠到漏斗');
  const footer = button(copy('Cancel', '取消'), 'close-modal') + '<button type="submit" form="add-offer-form" class="button button-primary">' + escapeHtml(submitLabel) + '</button>';
  return modalShell('add-offer', existingNode ? copy('Edit offer settings', '编辑优惠设置') : requestedKind === 'downsell' ? copy('Add a backup offer', '添加备用优惠') : copy('Add a post-purchase offer', '添加购后优惠'), funnel.name, body, footer, false);
}

export function renderTrafficModal(funnel) {
  const body = '<form id="traffic-form" class="form-stack"><input type="hidden" name="funnelId" value="' + escapeHtml(funnel.id) + '"/><div class="traffic-modal-value"><span>BestCheckout traffic</span><strong data-traffic-value>' + funnel.hostedTraffic + '%</strong></div><input class="range-input" type="range" min="0" max="95" step="5" name="hostedTraffic" value="' + funnel.hostedTraffic + '" data-traffic-range/><div class="traffic-allocation-preview"><span><i class="legend-bestcheckout"></i>BestCheckout <b data-hosted-preview>' + funnel.hostedTraffic + '%</b></span><span><i class="legend-native"></i>Shopify native control <b data-native-preview>' + funnel.nativeTraffic + '%</b></span></div><div class="modal-callout">' + icon('shield', 17) + '<span><strong>Keep at least 5% Shopify native control</strong><small>The control group measures lift. Phase-aware safety fallback remains independent and is only allowed before charge; unknown or captured payments are recovered, finalized or reconciled.</small></span></div></form>';
  const footer = button('Cancel', 'close-modal') + '<button type="submit" form="traffic-form" class="button button-primary">Save allocation</button>';
  return modalShell('traffic', 'Edit traffic allocation', funnel.name, body, footer, false);
}

function checkoutRoutingForModal(funnel) {
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

export function renderCheckoutRoutingModal(state, funnel) {
  const isZh = state.ui.locale === 'zh';
  const routing = checkoutRoutingForModal(funnel);
  const checkouts = funnel.nodes.filter(function (node) { return node.kind === 'checkout'; });
  const audiences = Array.from(new Set([
    funnel.audience,
    'All eligible customers',
    'Returning customers · cart over $60',
    'First-time customers · United States',
  ].filter(Boolean)));
  const audienceOptions = audiences.map(function (audience) {
    return '<option value="' + escapeHtml(audience) + '"' + (audience === funnel.audience ? ' selected' : '') + '>' + escapeHtml(audience) + '</option>';
  }).join('');
  const checkoutRows = checkouts.map(function (node) {
    return '<div class="routing-allocation-row"><span class="routing-allocation-icon">' + icon('card', 17) + '</span><div><strong data-i18n-skip>' + escapeHtml(node.label) + '</strong><small>' + (isZh ? 'BestCheckout 变体' : 'BestCheckout variant') + '</small></div><label><input type="number" name="checkout_' + escapeHtml(node.id) + '" min="0" max="100" step="1" value="' + escapeHtml(routing.checkouts[node.id]) + '" data-routing-allocation/><b>%</b></label></div>';
  }).join('') || '<div class="routing-allocation-empty">' + (isZh ? '请先在画布中添加一个 Checkout 页面。' : 'Add a Checkout page on the canvas first.') + '</div>';
  const total = routing.native + checkouts.reduce(function (sum, node) { return sum + routing.checkouts[node.id]; }, 0);
  const body = '<form id="checkout-routing-form" class="form-stack"><input type="hidden" name="funnelId" value="' + escapeHtml(funnel.id) + '"/><label>' + (isZh ? '谁进入这项测试？' : 'Who enters this test?') + '<select name="audience">' + audienceOptions + '</select><small>' + (isZh ? '只有满足该受众条件的买家会参与以下 Checkout 分流。' : 'Only buyers in this audience participate in the Checkout split below.') + '</small></label><div class="routing-allocation-section"><div class="routing-allocation-heading"><span>' + (isZh ? 'Checkout 路由' : 'Checkout routes') + '</span><strong data-routing-total>' + total + '%</strong></div><div class="routing-allocation-row routing-allocation-native"><span class="routing-allocation-icon">' + icon('store', 17) + '</span><div><strong>Shopify Checkout</strong><small>' + (isZh ? '原生对照组' : 'Native control') + '</small></div><label><input type="number" name="nativeTraffic" min="5" max="100" step="1" value="' + escapeHtml(routing.native) + '" data-routing-allocation/><b>%</b></label></div><div class="routing-allocation-group-label"><span>BestCheckout</span><small>' + (isZh ? '可添加多个 Checkout 页面进行 A/B 测试' : 'Add multiple Checkout pages for A/B tests') + '</small></div>' + checkoutRows + '<button type="button" class="routing-add-checkout" data-action="add-journey-page" data-funnel-id="' + escapeHtml(funnel.id) + '" data-page-kind="checkout">' + icon('plus', 16) + '<span>' + (isZh ? '添加 Checkout 页面' : 'Add Checkout page') + '</span></button></div><div class="modal-callout"><span>' + icon('flow', 17) + '</span><span><strong>' + (isZh ? '总分配必须等于 100%' : 'Allocation must total 100%') + '</strong><small>' + (isZh ? 'Shopify Checkout 作为对照组；每个 BestCheckout 页面可分配独立流量。' : 'Shopify Checkout is the control. Each BestCheckout page receives its own allocation.') + '</small></span></div></form>';
  const footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + '<button type="submit" form="checkout-routing-form" class="button button-primary">' + (isZh ? '保存路由' : 'Save routing') + '</button>';
  return modalShell('checkout-routing', isZh ? '配置 Checkout 分流与 A/B 测试' : 'Configure Checkout routing and A/B test', funnel.name, body, footer, true);
}

const AUDIENCE_FIELD_GROUPS = [
  {
    label: 'Customer identity', labelZh: '客户身份（登录后可用）', fields: [
      { id: 'logged_in', label: 'Account status', labelZh: '登录状态', placeholder: 'Signed in', placeholderZh: '已登录', short: 'Account', shortZh: '账号', operators: 'match' },
      { id: 'customer_type', label: 'First order or returning', labelZh: '首单或复购（需登录）', placeholder: 'New customer', placeholderZh: '新客户', short: 'Customer', shortZh: '客户', operators: 'match' },
      { id: 'customer_tag', label: 'Customer tags', labelZh: '客户标签', placeholder: 'VIP', placeholderZh: 'VIP', short: 'Tags', shortZh: '标签', operators: 'tags' },
      { id: 'marketing_consent', label: 'Email marketing consent', labelZh: '邮件营销订阅', placeholder: 'Subscribed', placeholderZh: '已订阅', short: 'Consent', shortZh: '订阅', operators: 'match' },
      { id: 'past_orders', label: 'Past orders', labelZh: '历史订单数', placeholder: '1', placeholderZh: '1', short: 'Orders', shortZh: '订单', operators: 'number', valueKind: 'integer', defaultOperator: 'at_least' },
      { id: 'lifetime_value', label: 'Customer lifetime spend', labelZh: '客户累计消费', placeholder: '$200', placeholderZh: '$200', short: 'LTV', shortZh: '累计消费', operators: 'number', valueKind: 'money', defaultOperator: 'at_least' },
      { id: 'last_order', label: 'Last order date', labelZh: '最近一次下单', placeholder: '30', placeholderZh: '30', short: 'Last order', shortZh: '最近一次下单', operators: 'date', valueKind: 'days', defaultOperator: 'within_last' },
    ],
  },
  {
    label: 'Storefront context', labelZh: '店铺当前上下文', fields: [
      { id: 'country', label: 'Current storefront country', labelZh: '店铺当前国家/市场', placeholder: 'United States', placeholderZh: '美国', short: 'Market', shortZh: '市场', operators: 'match' },
      { id: 'customer_language', label: 'Current storefront language', labelZh: '店铺当前语言', placeholder: 'English', placeholderZh: '英语', short: 'Language', shortZh: '语言', operators: 'match' },
    ],
  },
  {
    label: 'Cart', labelZh: '购物车', fields: [
      { id: 'cart_subtotal', label: 'Cart subtotal', labelZh: '商品小计', placeholder: '$60', placeholderZh: '$60', short: 'Subtotal', shortZh: '小计', operators: 'number', valueKind: 'money', defaultOperator: 'at_least' },
      { id: 'cart_total', label: 'Cart total', labelZh: '购物车金额', placeholder: '$60', placeholderZh: '$60', short: 'Cart', shortZh: '购物车', operators: 'number', valueKind: 'money', defaultOperator: 'at_least' },
      { id: 'cart_currency', label: 'Cart currency', labelZh: '购物车币种', placeholder: 'USD', placeholderZh: 'USD', short: 'Currency', shortZh: '币种', operators: 'match' },
      { id: 'cart_items', label: 'Cart item count', labelZh: '购物车商品数', placeholder: '2', placeholderZh: '2', short: 'Items', shortZh: '商品数', operators: 'number', valueKind: 'integer', defaultOperator: 'at_least' },
      { id: 'cart_contains', label: 'Cart products', labelZh: '购物车商品', placeholder: '', placeholderZh: '', short: 'Products', shortZh: '商品', operators: 'products', valueKind: 'products', defaultOperator: 'contains_any_product' },
      { id: 'cart_sku', label: 'Cart contains SKU', labelZh: '购物车包含 SKU', placeholder: 'SLEEP-STARTER', placeholderZh: 'SLEEP-STARTER', short: 'SKU', shortZh: 'SKU', operators: 'text' },
    ],
  },
];

const AUDIENCE_OPERATORS = [
  { id: 'is', label: 'is', labelZh: '是' },
  { id: 'is_not', label: 'is not', labelZh: '不是' },
  { id: 'one_of', label: 'is one of', labelZh: '属于任一项' },
  { id: 'not_one_of', label: 'is not one of', labelZh: '不属于任一项' },
  { id: 'equals', label: 'equals', labelZh: '等于' },
  { id: 'not_equal', label: 'does not equal', labelZh: '不等于' },
  { id: 'at_least', label: 'is at least', labelZh: '至少为' },
  { id: 'at_most', label: 'is at most', labelZh: '至多为' },
  { id: 'between', label: 'is between', labelZh: '介于' },
  { id: 'contains', label: 'contains', labelZh: '包含' },
  { id: 'does_not_contain', label: 'does not contain', labelZh: '不包含' },
  { id: 'contains_any_tag', label: 'has any of these tags', labelZh: '包含任一标签' },
  { id: 'contains_all_tags', label: 'has all of these tags', labelZh: '包含全部标签' },
  { id: 'contains_none_tags', label: 'has none of these tags', labelZh: '不包含这些标签' },
  { id: 'contains_any_product', label: 'includes any selected product', labelZh: '包含任一所选商品' },
  { id: 'contains_all_products', label: 'includes all selected products', labelZh: '同时包含全部所选商品' },
  { id: 'contains_none_products', label: 'does not include selected products', labelZh: '不包含所选商品' },
  { id: 'within_last', label: 'is in the last', labelZh: '在最近…内' },
  { id: 'more_than_ago', label: 'is more than … ago', labelZh: '早于…前' },
];

const AUDIENCE_OPERATOR_SETS = {
  match: ['is', 'is_not'],
  number: ['equals', 'not_equal', 'at_least', 'at_most', 'between'],
  text: ['contains', 'does_not_contain', 'is', 'is_not'],
  tags: ['contains_any_tag', 'contains_all_tags', 'contains_none_tags'],
  products: ['contains_any_product', 'contains_all_products', 'contains_none_products'],
  date: ['within_last', 'more_than_ago'],
};

const AUDIENCE_ENUM_VALUES = {
  customer_type: [
    { value: 'New customer', label: 'New customer', labelZh: '新客户' },
    { value: 'Returning customer', label: 'Returning customer', labelZh: '复购买家' },
  ],
  logged_in: [
    { value: 'Signed in', label: 'Signed in', labelZh: '已登录' },
    { value: 'Guest', label: 'Guest', labelZh: '游客' },
  ],
  country: [
    { value: 'United States', label: 'United States', labelZh: '美国' },
    { value: 'Canada', label: 'Canada', labelZh: '加拿大' },
    { value: 'United Kingdom', label: 'United Kingdom', labelZh: '英国' },
    { value: 'Australia', label: 'Australia', labelZh: '澳大利亚' },
    { value: 'Germany', label: 'Germany', labelZh: '德国' },
    { value: 'France', label: 'France', labelZh: '法国' },
  ],
  customer_language: [
    { value: 'English', label: 'English', labelZh: '英语' },
    { value: 'Simplified Chinese', label: 'Simplified Chinese', labelZh: '简体中文' },
    { value: 'Spanish', label: 'Spanish', labelZh: '西班牙语' },
    { value: 'French', label: 'French', labelZh: '法语' },
    { value: 'German', label: 'German', labelZh: '德语' },
  ],
  marketing_consent: [
    { value: 'Subscribed', label: 'Subscribed', labelZh: '已订阅' },
    { value: 'Not subscribed', label: 'Not subscribed', labelZh: '未订阅' },
  ],
  cart_currency: [
    { value: 'USD', label: 'USD', labelZh: 'USD' },
    { value: 'CAD', label: 'CAD', labelZh: 'CAD' },
    { value: 'GBP', label: 'GBP', labelZh: 'GBP' },
    { value: 'AUD', label: 'AUD', labelZh: 'AUD' },
    { value: 'EUR', label: 'EUR', labelZh: 'EUR' },
  ],
};

function audienceEnumValues(field, isZh) {
  return (AUDIENCE_ENUM_VALUES[field.id] || []).map(function (item) {
    return { value: item.value, label: isZh ? item.labelZh : item.label };
  });
}

function audienceFieldDefinition(fieldId) {
  for (let index = 0; index < AUDIENCE_FIELD_GROUPS.length; index += 1) {
    const match = AUDIENCE_FIELD_GROUPS[index].fields.find(function (field) { return field.id === fieldId; });
    if (match) return match;
  }
  return AUDIENCE_FIELD_GROUPS[0].fields[0];
}

function audienceFieldOptions(isZh, selectedField) {
  return AUDIENCE_FIELD_GROUPS.map(function (group) {
    const options = group.fields.map(function (field) {
      const values = JSON.stringify(audienceEnumValues(field, isZh));
      return '<option value="' + escapeHtml(field.id) + '" data-placeholder="' + escapeHtml(isZh ? field.placeholderZh : field.placeholder) + '" data-short="' + escapeHtml(isZh ? field.shortZh : field.short) + '" data-value-kind="' + (field.valueKind || (field.id === 'customer_tag' ? 'tags' : '')) + '" data-default-operator="' + escapeHtml(field.defaultOperator || '') + '" data-value-options="' + escapeHtml(values) + '" data-operators="' + escapeHtml((AUDIENCE_OPERATOR_SETS[field.operators] || AUDIENCE_OPERATOR_SETS.match).join(',')) + '"' + (field.id === selectedField ? ' selected' : '') + '>' + escapeHtml(isZh ? field.labelZh : field.label) + '</option>';
    }).join('');
    return '<optgroup label="' + escapeHtml(isZh ? group.labelZh : group.label) + '">' + options + '</optgroup>';
  }).join('');
}

function audienceOperatorOptions(isZh, field, selectedOperator) {
  const allowed = AUDIENCE_OPERATOR_SETS[field.operators] || AUDIENCE_OPERATOR_SETS.match;
  const selectedOperatorId = allowed.includes(selectedOperator) ? selectedOperator : allowed[0];
  return AUDIENCE_OPERATORS.map(function (item) {
    const enabled = allowed.includes(item.id);
    return '<option value="' + escapeHtml(item.id) + '" data-audience-operator' + (item.id === selectedOperatorId ? ' selected' : '') + (!enabled ? ' hidden disabled' : '') + '>' + escapeHtml(isZh ? item.labelZh : item.label) + '</option>';
  }).join('');
}

function audienceTagValueControl(value, isZh) {
  const tags = String(value || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
  const removeLabel = isZh ? '移除标签' : 'Remove tag';
  const chips = tags.map(function (tag) {
    return '<span class="audience-tag-chip" data-audience-tag-chip data-tag="' + escapeHtml(tag) + '"><span>' + escapeHtml(tag) + '</span><button type="button" data-action="remove-audience-tag" aria-label="' + escapeHtml(removeLabel + ' ' + tag) + '">×</button></span>';
  }).join('');
  return '<div class="audience-tag-editor" data-audience-tag-editor><div class="audience-tag-list">' + chips + '</div><input type="hidden" name="audienceValue" value="' + escapeHtml(tags.join(', ')) + '" data-audience-tag-value required/><input type="text" data-audience-tag-input placeholder="' + escapeHtml(isZh ? '输入标签后按 Enter' : 'Type a tag and press Enter') + '" aria-label="' + escapeHtml(isZh ? '添加客户标签' : 'Add customer tag') + '"/></div>';
}

function audienceProductValues(value, products) {
  const productList = Array.isArray(products) ? products : [];
  const normalise = function (items) {
    return Array.from(new Set(items.filter(function (item) { return typeof item === 'string' && item.trim(); }).map(function (item) { return item.trim(); })));
  };
  if (Array.isArray(value)) return normalise(value);
  const source = String(value || '').trim();
  if (!source) return [];
  try {
    const parsed = JSON.parse(source);
    if (Array.isArray(parsed)) return normalise(parsed);
  } catch (error) {
    // Read legacy name-based rules once, then save them as stable IDs.
  }
  return normalise(source.split(',').map(function (name) {
    const product = productList.find(function (item) { return item.name === name.trim(); });
    return product ? product.id : name.trim();
  }));
}

function audienceProductEntries(value, products) {
  const productList = Array.isArray(products) ? products : [];
  return audienceProductValues(value, productList).map(function (id) {
    return productList.find(function (product) { return product.id === id; }) || { id: id, name: id };
  });
}

function audienceProductChipsMarkup(entries, isZh) {
  const removeLabel = isZh ? '移除商品' : 'Remove product';
  if (!entries.length) return '<span class="audience-product-placeholder" data-audience-product-placeholder>' + (isZh ? '还未选择商品' : 'No products selected') + '</span>';
  return entries.map(function (product) {
    return '<span class="audience-product-chip" data-audience-product-chip data-product-id="' + escapeHtml(product.id) + '"><span>' + escapeHtml(product.name) + '</span><button type="button" data-action="remove-audience-product" aria-label="' + escapeHtml(removeLabel + ' ' + product.name) + '">×</button></span>';
  }).join('');
}

function audienceProductValueControl(value, isZh, products) {
  const productList = Array.isArray(products) ? products : [];
  const selected = audienceProductValues(value, productList);
  const selectedProducts = audienceProductEntries(selected, productList);
  const chooseLabel = isZh ? '选择商品' : 'Choose products';
  const searchLabel = isZh ? '搜索商品' : 'Search products';
  const optionRows = productList.map(function (product) {
    const isSelected = selected.includes(product.id);
    const detail = (product.markets || []).join(' · ') + ' · ' + (isZh ? (product.inventoryState === 'Available' ? '有货' : '缺货') : product.inventoryState);
    return '<label class="audience-product-option" data-audience-product-option-row><input type="checkbox" value="' + escapeHtml(product.id) + '" data-product-name="' + escapeHtml(product.name) + '" data-audience-product-option' + (isSelected ? ' checked' : '') + '/><span><strong>' + escapeHtml(product.name) + '</strong><small>' + escapeHtml(detail) + '</small></span></label>';
  }).join('') || '<p class="audience-product-empty">' + (isZh ? '暂无可选择的商品。' : 'No products are available.') + '</p>';
  return '<div class="audience-product-control" data-audience-product-control><input type="hidden" name="audienceValue" value="' + escapeHtml(JSON.stringify(selected)) + '" data-audience-product-value required/><div class="audience-product-summary" data-audience-product-summary>' + audienceProductChipsMarkup(selectedProducts, isZh) + '</div><button type="button" class="audience-product-trigger" data-action="toggle-audience-product-picker" aria-expanded="false"><span>' + escapeHtml(chooseLabel) + '</span>' + icon('chevron', 14) + '</button><div class="audience-product-menu" data-audience-product-menu><input type="search" data-audience-product-search aria-label="' + escapeHtml(searchLabel) + '" placeholder="' + escapeHtml(searchLabel) + '"/><div class="audience-product-option-list" data-audience-product-options>' + optionRows + '</div></div><small class="audience-product-error" data-audience-product-error hidden>' + (isZh ? '至少选择 1 个商品' : 'Select at least one product') + '</small></div>';
}

function audienceIntegerParts(value) {
  const parts = String(value || '').split(/\s*(?:–|\.\.)\s*/);
  return { min: /^\d+$/.test(parts[0] || '') ? parts[0] : '', max: /^\d+$/.test(parts[1] || '') ? parts[1] : '' };
}

function audienceIntegerValueControl(value, placeholder, isZh, operator) {
  const parts = audienceIntegerParts(value);
  const min = parts.min || placeholder;
  const label = isZh ? '条件值' : 'Condition value';
  if (operator !== 'between') return '<input type="number" min="0" step="1" inputmode="numeric" name="audienceValue" value="' + escapeHtml(min) + '" placeholder="' + escapeHtml(placeholder) + '" data-audience-value data-audience-placeholder="' + escapeHtml(placeholder) + '" aria-label="' + escapeHtml(label) + '" required/>';
  const minLabel = isZh ? '最小值' : 'Minimum value';
  const maxLabel = isZh ? '最大值' : 'Maximum value';
  return '<div class="audience-number-range" data-audience-number-range><input type="number" min="0" step="1" inputmode="numeric" name="audienceValue" value="' + escapeHtml(min) + '" placeholder="' + escapeHtml(minLabel) + '" data-audience-value data-audience-placeholder="' + escapeHtml(placeholder) + '" aria-label="' + escapeHtml(minLabel) + '" required/><span>' + (isZh ? '至' : 'to') + '</span><input type="number" min="0" step="1" inputmode="numeric" value="' + escapeHtml(parts.max) + '" placeholder="' + escapeHtml(maxLabel) + '" data-audience-range-max aria-label="' + escapeHtml(maxLabel) + '" required/></div>';
}

function audienceDaysValueControl(value, placeholder, isZh) {
  const parsed = String(value || '').trim();
  const days = /^[1-9]\d*$/.test(parsed) ? parsed : (String(placeholder || '30').trim() || '30');
  const label = isZh ? '距最近一次下单的天数' : 'Days since last order';
  const unit = isZh ? '天' : 'days';
  return '<span class="audience-days-field" data-audience-days-control><input type="number" min="1" step="1" inputmode="numeric" name="audienceValue" value="' + escapeHtml(days) + '" placeholder="' + escapeHtml(placeholder || '30') + '" data-audience-value data-audience-placeholder="' + escapeHtml(placeholder || '30') + '" aria-label="' + escapeHtml(label) + '" required/><em>' + escapeHtml(unit) + '</em></span>';
}

function audienceMoneyParts(value) {
  const parts = String(value || '').replace(/\$/g, '').split(/\s*(?:–|\.\.)\s*/);
  const normalized = function (part) { return /^\d+(?:\.\d{1,2})?$/.test(part || '') ? part : ''; };
  return { min: normalized(parts[0]), max: normalized(parts[1]) };
}

function audienceMoneyInput(value, placeholder, label, name, isRangeMax) {
  return '<span class="audience-money-field"><b>$</b><input type="number" min="0" step="0.01" inputmode="decimal"' + (name ? ' name="' + name + '"' : '') + ' value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(placeholder) + '"' + (name ? ' data-audience-value data-audience-placeholder="' + escapeHtml(placeholder) + '"' : '') + (isRangeMax ? ' data-audience-range-max' : '') + ' aria-label="' + escapeHtml(label) + '" required/></span>';
}

function audienceMoneyValueControl(value, placeholder, isZh, operator) {
  const parts = audienceMoneyParts(value);
  const defaultValue = String(placeholder || '').replace(/^\$/, '');
  const min = parts.min || defaultValue;
  const label = isZh ? '消费金额（USD）' : 'Spend amount (USD)';
  if (operator !== 'between') return '<span data-audience-money-control>' + audienceMoneyInput(min, defaultValue, label, 'audienceValue', false) + '</span>';
  const minLabel = isZh ? '最低消费金额（USD）' : 'Minimum spend (USD)';
  const maxLabel = isZh ? '最高消费金额（USD）' : 'Maximum spend (USD)';
  return '<div class="audience-number-range" data-audience-number-range data-audience-money-control>' + audienceMoneyInput(min, defaultValue, minLabel, 'audienceValue', false) + '<span>' + (isZh ? '至' : 'to') + '</span>' + audienceMoneyInput(parts.max, defaultValue, maxLabel, '', true) + '</div>';
}

function audienceValueControl(field, value, isZh, operator, products) {
  if (field.id === 'customer_tag') return audienceTagValueControl(value, isZh);
  if (field.valueKind === 'products') return audienceProductValueControl(value, isZh, products);
  const placeholder = isZh ? field.placeholderZh : field.placeholder;
  if (field.valueKind === 'integer') return audienceIntegerValueControl(value, placeholder, isZh, operator);
  if (field.valueKind === 'money') return audienceMoneyValueControl(value, placeholder, isZh, operator);
  if (field.valueKind === 'days') return audienceDaysValueControl(value, placeholder, isZh);
  const values = audienceEnumValues(field, isZh);
  const selectedValue = value || placeholder;
  if (!values.length) {
    return '<input type="text" name="audienceValue" value="' + escapeHtml(selectedValue) + '" placeholder="' + escapeHtml(placeholder) + '" data-audience-value data-audience-placeholder="' + escapeHtml(placeholder) + '" aria-label="' + escapeHtml(isZh ? '条件值' : 'Condition value') + '" required/>';
  }
  if (!values.some(function (item) { return item.value === selectedValue; })) values.unshift({ value: selectedValue, label: selectedValue });
  const options = values.map(function (item) {
    return '<option value="' + escapeHtml(item.value) + '"' + (item.value === selectedValue ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>';
  }).join('');
  return '<select name="audienceValue" data-audience-value data-audience-placeholder="' + escapeHtml(placeholder) + '" aria-label="' + escapeHtml(isZh ? '条件值' : 'Condition value') + '" required>' + options + '</select>';
}

function audienceRuleRow(rule, isZh, products) {
  const field = audienceFieldDefinition(rule && rule.field);
  const value = rule && rule.value ? rule.value : (field.id === 'customer_tag' ? '' : (isZh ? field.placeholderZh : field.placeholder));
  const operator = rule && rule.operator ? rule.operator : (field.operators === 'number' ? 'at_least' : field.operators === 'text' ? 'contains' : field.operators === 'tags' ? 'contains_any_tag' : field.operators === 'date' ? 'within_last' : 'is');
  const removeLabel = isZh ? '移除条件' : 'Remove condition';
  return '<div class="audience-rule-row" data-audience-rule><select name="audienceField" aria-label="' + escapeHtml(isZh ? '受众字段' : 'Audience attribute') + '" data-audience-field>' + audienceFieldOptions(isZh, field.id) + '</select><select name="audienceOperator" aria-label="' + escapeHtml(isZh ? '比较方式' : 'Comparison') + '">' + audienceOperatorOptions(isZh, field, operator) + '</select>' + audienceValueControl(field, value, isZh, operator, products) + '<button type="button" class="audience-rule-remove" data-action="remove-audience-rule" aria-label="' + escapeHtml(removeLabel) + '" title="' + escapeHtml(removeLabel) + '">×</button></div>';
}

function audienceConditionsForModal(funnel) {
  return Array.isArray(funnel.audienceConditions) && funnel.audienceConditions.length ? funnel.audienceConditions : [{ field: 'customer_type', operator: 'is', value: 'All eligible customers' }];
}

function renderAudienceBuilder(funnel, isZh, products) {
  const audienceRows = audienceConditionsForModal(funnel).map(function (rule) { return audienceRuleRow(rule, isZh, products); }).join('');
  const template = audienceRuleRow({ field: 'customer_type', operator: 'is', value: isZh ? '新客户' : 'New customer' }, isZh, products);
  return '<section class="audience-builder"><header><span><strong>' + (isZh ? '哪些用户进入此漏斗（AND）' : 'Who enters this Funnel (AND)') + '</strong><small>' + (isZh ? '所有条件命中后，买家才会进入“' + escapeHtml(funnel.name) + '”，再参加本漏斗内的 Checkout 实验。' : 'Buyers enter “' + escapeHtml(funnel.name) + '” only when every condition matches, then join this Funnel’s Checkout experiment.') + '</small></span><em>' + (isZh ? '未命中 → Shopify Checkout' : 'No match → Shopify Checkout') + '</em></header><div class="audience-rule-list" data-audience-rule-list>' + audienceRows + '</div><template data-audience-rule-template>' + template + '</template><button type="button" class="audience-add-rule" data-action="add-audience-rule">' + icon('plus', 16) + '<span>' + (isZh ? '添加条件' : 'Add condition') + '</span></button><p>' + (isZh ? '可组合客户身份、店铺当前上下文与购物车条件。客户订单与标签条件仅适用于已登录买家。' : 'Combine customer identity, storefront context, and cart conditions. Customer order and tag conditions apply only to signed-in buyers.') + '</p></section>';
}

export function renderFunnelEntryModal(state, funnel) {
  const isZh = state.ui.locale === 'zh';
  const priority = Number.isFinite(Number(funnel.priority)) ? funnel.priority : 100;
  const intro = '<section class="funnel-entry-modal-intro"><span>' + icon('flow', 18) + '</span><div><small>' + (isZh ? '第 1 层：漏斗路由' : 'Layer 1: Funnel routing') + '</small><strong>' + (isZh ? '先决定进入哪一个漏斗，再决定看到哪个 Checkout 模板。' : 'Choose the Funnel first, then choose the Checkout variant.') + '</strong><p>' + (isZh ? '未命中任何漏斗的购物车始终回退到 Shopify 原生 Checkout。' : 'Carts that do not match any Funnel always fall back to Shopify native Checkout.') + '</p></div></section>';
  const priorityFields = '<section class="funnel-priority-fields"><label>' + (isZh ? '漏斗优先级' : 'Funnel priority') + '<input type="number" name="priority" min="1" max="999" step="1" value="' + escapeHtml(priority) + '" required/><small>' + (isZh ? '数值越小优先级越高。多个漏斗同时命中时，只进入优先级最高的一个。' : 'Lower numbers win. If several Funnels match, buyers enter only the highest-priority one.') + '</small></label><label>' + (isZh ? '冲突处理' : 'Conflict handling') + '<input type="text" value="' + escapeHtml(isZh ? '首次命中（按优先级）' : 'First match by priority') + '" disabled/><small>' + (isZh ? '避免同一购物车同时进入多条路径。' : 'Prevents one cart from entering multiple journeys.') + '</small></label></section>';
  const body = '<form id="funnel-entry-form" class="form-stack"><input type="hidden" name="funnelId" value="' + escapeHtml(funnel.id) + '"/>' + intro + priorityFields + renderAudienceBuilder(funnel, isZh, state.offerCatalogVariants) + '</form>';
  const footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + '<button type="submit" form="funnel-entry-form" class="button button-primary">' + (isZh ? '保存漏斗入口' : 'Save Funnel entry') + '</button>';
  return modalShell('funnel-entry', isZh ? '配置漏斗入口' : 'Configure Funnel entry', funnel.name, body, footer, true);
}

function renderCheckoutExperimentModalLegacy(state, funnel) {
  const isZh = state.ui.locale === 'zh';
  const routing = checkoutRoutingForModal(funnel);
  const checkouts = funnel.nodes.filter(function (node) { return node.kind === 'checkout'; });
  const checkoutRows = checkouts.map(function (node) {
    return '<div class="routing-allocation-row"><span class="routing-allocation-icon">' + icon('card', 17) + '</span><div><strong data-i18n-skip>' + escapeHtml(node.label) + '</strong><small>' + (isZh ? 'BestCheckout 实验变体' : 'BestCheckout experiment variant') + '</small></div><label><input type="number" name="checkout_' + escapeHtml(node.id) + '" min="0" max="100" step="1" value="' + escapeHtml(routing.checkouts[node.id]) + '" data-routing-allocation/><b>%</b></label></div>';
  }).join('') || '<div class="routing-allocation-empty">' + (isZh ? '请先在画布中添加一个 Checkout 页面。' : 'Add a Checkout page on the canvas first.') + '</div>';
  const total = routing.native + checkouts.reduce(function (sum, node) { return sum + routing.checkouts[node.id]; }, 0);
  const entrySummary = '<section class="experiment-entry-summary"><span>' + icon('user', 18) + '</span><div><small>' + (isZh ? '实验对象' : 'Experiment audience') + '</small><strong>' + (isZh ? '已进入此漏斗的买家' : 'Buyers who entered this Funnel') + '</strong><p data-i18n-skip>' + escapeHtml(funnel.audience) + '</p></div><button type="button" class="button button-plain" data-action="edit-funnel-entry">' + escapeHtml(isZh ? '编辑入口' : 'Edit entry') + '</button></section>';
  const allocation = '<div class="routing-allocation-section"><div class="routing-allocation-heading"><span>' + (isZh ? 'Checkout 实验分配' : 'Checkout experiment allocation') + '</span><strong data-routing-total>' + total + '%</strong></div><div class="routing-allocation-row routing-allocation-native"><span class="routing-allocation-icon">' + icon('store', 17) + '</span><div><strong>Shopify Checkout</strong><small>' + (isZh ? '原生对照组' : 'Native control') + '</small></div><label><input type="number" name="nativeTraffic" min="5" max="100" step="1" value="' + escapeHtml(routing.native) + '" data-routing-allocation/><b>%</b></label></div><div class="routing-allocation-group-label"><span>BestCheckout</span><small>' + (isZh ? '可添加多个 Checkout 页面作为 A/B 变体' : 'Add multiple Checkout pages as A/B variants') + '</small></div>' + checkoutRows + '<button type="button" class="routing-add-checkout" data-action="add-journey-page" data-funnel-id="' + escapeHtml(funnel.id) + '" data-page-kind="checkout">' + icon('plus', 16) + '<span>' + (isZh ? '添加 Checkout 变体' : 'Add Checkout variant') + '</span></button></div>';
  const body = '<form id="checkout-experiment-form" class="form-stack"><input type="hidden" name="funnelId" value="' + escapeHtml(funnel.id) + '"/>' + entrySummary + allocation + '<div class="modal-callout"><span>' + icon('flow', 17) + '</span><span><strong>' + (isZh ? '总分配必须等于 100%' : 'Allocation must total 100%') + '</strong><small>' + (isZh ? '这里仅对已进入本漏斗的买家做实验；未进入漏斗的流量由全局漏斗路由处理。' : 'This experiment applies only after a buyer enters this Funnel. All other traffic is handled by the Funnel router.') + '</small></span></div></form>';
  const footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + '<button type="submit" form="checkout-experiment-form" class="button button-primary">' + (isZh ? '保存 Checkout 实验' : 'Save Checkout experiment') + '</button>';
  return modalShell('checkout-experiment', isZh ? '配置 Checkout 实验' : 'Configure Checkout experiment', funnel.name, body, footer, true);
}

export function renderCheckoutExperimentModal(state, funnel) {
  const isZh = state.ui.locale === 'zh';
  const routing = checkoutRoutingForModal(funnel);
  const checkouts = funnel.nodes.filter(function (node) { return node.kind === 'checkout'; });
  const checkoutRows = checkouts.map(function (node) {
    return '<div class="routing-allocation-row"><span class="routing-allocation-icon">' + icon('card', 17) + '</span><div><strong data-i18n-skip>' + escapeHtml(node.label) + '</strong><small>' + (isZh ? 'BestCheckout Checkout 页面' : 'BestCheckout Checkout page') + '</small></div><label><input type="number" name="checkout_' + escapeHtml(node.id) + '" min="0" max="100" step="1" value="' + escapeHtml(routing.checkouts[node.id]) + '" data-routing-allocation/><b>%</b></label></div>';
  }).join('') || '<div class="routing-allocation-empty">' + (isZh ? '请先在画布中添加一个 Checkout 页面。' : 'Add a Checkout page on the canvas first.') + '</div>';
  const total = routing.native + checkouts.reduce(function (sum, node) { return sum + routing.checkouts[node.id]; }, 0);
  const context = '<section class="experiment-entry-summary"><span>' + icon('user', 18) + '</span><div><small>' + (isZh ? '适用买家' : 'Applies to') + '</small><strong>' + (isZh ? '已进入此漏斗的买家' : 'Buyers who entered this Funnel') + '</strong><p data-i18n-skip>' + escapeHtml(funnel.audience) + '</p></div><button type="button" class="button button-plain" data-action="edit-funnel-entry">' + escapeHtml(isZh ? '编辑入口' : 'Edit entry') + '</button></section>';
  const allocation = '<div class="routing-allocation-section"><div class="routing-allocation-heading"><span>' + (isZh ? '同一受众的 Checkout 分流' : 'Checkout split for this audience') + '</span><strong data-routing-total>' + total + '%</strong></div><div class="routing-allocation-row routing-allocation-native"><span class="routing-allocation-icon">' + icon('store', 17) + '</span><div><strong>Shopify Checkout</strong><small>' + (isZh ? '原生路径 / 对照组' : 'Native path / control') + '</small></div><label><input type="number" name="nativeTraffic" min="0" max="100" step="1" value="' + escapeHtml(routing.native) + '" data-routing-allocation/><b>%</b></label></div><div class="routing-allocation-group-label"><span>BestCheckout</span><small>' + (isZh ? '可设置一个默认 Checkout，或将同一批买家分配到多个页面。' : 'Set one default Checkout or split the same buyers across multiple pages.') + '</small></div>' + checkoutRows + '<button type="button" class="routing-add-checkout" data-action="add-journey-page" data-funnel-id="' + escapeHtml(funnel.id) + '" data-page-kind="checkout">' + icon('plus', 16) + '<span>' + (isZh ? '添加 Checkout 页面' : 'Add Checkout page') + '</span></button></div>';
  const rule = '<div class="modal-callout"><span>' + icon('flow', 17) + '</span><span><strong>' + (isZh ? '不同受众，请创建不同漏斗' : 'Use a separate Funnel for a different audience') + '</strong><small>' + (isZh ? '例如“购物车 $60–120”进入漏斗 A 并 100% 使用页面 A；“$120–180”进入漏斗 B 并 100% 使用页面 B。这里的分流只用于同一批买家的默认路径或 A/B 对照。' : 'For example, carts $60–120 enter Funnel A and use page A at 100%; carts $120–180 enter Funnel B and use page B at 100%. This split is only for a default route or A/B control within the same audience.') + '</small></span></div>';
  const body = '<form id="checkout-experiment-form" class="form-stack"><input type="hidden" name="funnelId" value="' + escapeHtml(funnel.id) + '"/>' + context + allocation + rule + '</form>';
  const footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + '<button type="submit" form="checkout-experiment-form" class="button button-primary">' + (isZh ? '保存流量规则' : 'Save traffic rules') + '</button>';
  return modalShell('checkout-experiment', isZh ? '设置 Checkout 流量规则' : 'Set Checkout traffic rules', isZh ? '先确定哪些用户进入漏斗，再决定这些用户使用哪个 Checkout。' : 'First decide who enters the Funnel, then decide which Checkout those buyers use.', body, footer, true);
}

function renderConnectProviderModalLegacy(state, selectedId) {
  const selected = selectedId || 'nmi';
  const isZh = state.ui.locale === 'zh';
  const options = state.providers.map(function (provider) {
    return '<option value="' + escapeHtml(provider.id) + '"' + (provider.id === selected ? ' selected' : '') + '>' + escapeHtml(provider.name) + ' · ' + escapeHtml(provider.status) + '</option>';
  }).join('');
  const body = '<form id="connect-provider-form" class="form-stack"><label>' + (isZh ? '服务商' : 'Provider') + '<select name="providerId">' + options + '</select></label><label>' + (isZh ? '商户账户引用' : 'Merchant account reference') + '<input type="text" name="account" placeholder="' + (isZh ? '已连接账户或商户参考号' : 'Connected account or merchant reference') + '" required /></label><label>' + (isZh ? '主要结算币种' : 'Primary settlement currency') + '<select name="currency"><option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option><option>SGD</option></select></label><div class="modal-callout">' + icon('shield', 17) + '<span><strong>' + (isZh ? '凭证保留在支付机构' : 'Credentials stay with the provider') + '</strong><small>' + (isZh ? 'BestCheckout 只保存安全连接引用和已验证能力状态。' : 'BestCheckout saves only a secure connection reference and verified capability state.') + '</small></span></div><label class="checkbox-row"><input type="checkbox" name="authorized" required/><span><strong>' + (isZh ? '商户所有权已授权' : 'Merchant ownership authorized') + '</strong><small>' + (isZh ? '生产环境证明来自支付机构 OAuth 或安全开户流程。' : 'Production evidence comes from the provider OAuth or secure onboarding flow.') + '</small></span></label><label class="checkbox-row"><input type="checkbox" name="webhook" required/><span><strong>' + (isZh ? '签名 Webhook 已验证' : 'Signed webhook verified') + '</strong><small>' + (isZh ? '支付状态、退款和失败事件必须由服务端验证。' : 'Payment state, refund and failure events must be server-verified.') + '</small></span></label><label class="checkbox-row"><input type="checkbox" name="fallback" required/><span><strong>' + (isZh ? '回退演练已完成' : 'Fallback drill completed') + '</strong><small>' + (isZh ? '已完成拒付、超时与重复扣款保护测试。' : 'Decline, timeout and duplicate-charge protection have been tested.') + '</small></span></label></form>';
  const footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + '<button type="submit" form="connect-provider-form" class="button button-primary">' + (isZh ? '连接支付机构' : 'Connect provider') + '</button>';
  return modalShell('connect-provider', isZh ? '连接支付机构' : 'Connect a payment provider', isZh ? '将已授权的商户账户绑定到托管结账运行时。' : 'Bind an authorized merchant account to the hosted checkout runtime.', body, footer, true);
}

function providerConnectModel(providerId, isZh) {
  const oauth = providerId === 'stripe' || providerId === 'paypal';
  if (oauth) return {
    mode: 'oauth',
    authorizationTitle: isZh ? '安全授权' : 'Secure authorization',
    authorizationCopy: isZh ? '将在支付服务商的安全页面完成账户所有权授权。BestCheckout 不会读取或保存登录密码。' : 'Complete merchant-account ownership in the provider’s secure page. BestCheckout never reads or stores login passwords.',
    launchLabel: isZh ? '打开安全授权页面' : 'Open secure authorization',
  };
  return {
    mode: 'credential',
    authorizationTitle: isZh ? '最少凭证连接' : 'Minimum credential connection',
    authorizationCopy: isZh ? '该服务商需要商户实体标识和一枚受限 API 密钥。密钥仅写入连接保险库，不会在页面或日志中再次显示。' : 'This provider requires a merchant entity and one restricted API key. The key goes only to the connection vault and is never displayed in the app or logs.',
    launchLabel: isZh ? '保存并继续校验' : 'Save and continue to validation',
  };
}

function providerConnectStepper(step, isZh) {
  const currentStep = step === 'authorizing' ? 'authorize' : step;
  const steps = [
    ['select', isZh ? '选择服务商' : 'Choose provider'],
    ['authorize', isZh ? '账户授权' : 'Authorize account'],
    ['validate', isZh ? '自动校验' : 'Automatic validation'],
  ];
  return '<ol class="provider-connect-stepper">' + steps.map(function (item, index) {
    const state = item[0] === currentStep ? ' is-current' : steps.findIndex(function (entry) { return entry[0] === currentStep; }) > index ? ' is-complete' : '';
    return '<li class="' + state + '"><span>' + (state === ' is-complete' ? '✓' : index + 1) + '</span><b>' + item[1] + '</b></li>';
  }).join('') + '</ol>';
}

export function renderConnectProviderModal(state, selectedId, requestedStep) {
  const isZh = state.ui.locale === 'zh';
  const supported = ['stripe', 'airwallex', 'paypal'];
  const selected = supported.includes(selectedId) ? selectedId : 'stripe';
  const provider = state.providers.find(function (item) { return item.id === selected; }) || state.providers[0];
  const step = ['select', 'authorize', 'authorizing', 'validate'].includes(requestedStep) ? requestedStep : 'select';
  const model = providerConnectModel(selected, isZh);
  const connection = state.ui.providerConnectionDraft || {};
  const options = state.providers.filter(function (item) { return supported.includes(item.id); }).map(function (item) {
    return '<option value="' + escapeHtml(item.id) + '"' + (item.id === selected ? ' selected' : '') + '>' + escapeHtml(item.name) + '</option>';
  }).join('');
  let body = '';
  let footer = '';
  if (step === 'select') {
    body = '<form id="provider-selection-form" class="form-stack">' + providerConnectStepper(step, isZh) + '<label>' + (isZh ? '支付服务商' : 'Payment provider') + '<select name="providerId">' + options + '</select><small>' + (isZh ? '选择接收 Checkout 款项的商户账户。下一步会显示该服务商的实际连接方式。' : 'Choose the merchant account that receives Checkout payments. The next step shows its supported connection method.') + '</small></label><div class="secure-connect-summary"><span>' + icon('shield', 20) + '</span><div><strong>' + (isZh ? '优先使用安全授权' : 'Secure authorization when available') + '</strong><small>' + (isZh ? 'Stripe 和 PayPal 使用授权跳转；Airwallex 使用受限凭证。BestCheckout 只要求完成连接所必需的信息。' : 'Stripe and PayPal use an authorization redirect; Airwallex uses restricted credentials. BestCheckout asks only for what is required to establish the connection.') + '</small></div></div><details class="advanced-connection-note"><summary>' + (isZh ? '为什么没有 Webhook 配置？' : 'Why is there no webhook setup?') + '</summary><p>' + (isZh ? 'Webhook 端点、签名校验和事件订阅由 BestCheckout 自动完成。商户无需手工配置回调地址。' : 'BestCheckout handles the webhook endpoint, signature verification and event subscriptions automatically. Merchants never configure callback URLs by hand.') + '</p></details></form>';
    footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + '<button type="submit" form="provider-selection-form" class="button button-primary">' + (isZh ? '继续' : 'Continue') + '</button>';
  } else if (step === 'authorize') {
    const credentialFields = model.mode === 'credential'
      ? '<label>' + (isZh ? '商户实体 ID' : 'Merchant entity ID') + '<input name="merchantEntity" required placeholder="' + (isZh ? '例如：merchant_us_••••' : 'For example: merchant_us_••••') + '"/></label><label>' + (isZh ? '受限 API 密钥' : 'Restricted API key') + '<input name="restrictedKey" type="password" required autocomplete="off" placeholder="' + (isZh ? '仅用于支付与 Webhook 校验' : 'Used only for payment and webhook validation') + '"/></label>'
      : '<div class="provider-oauth-card"><span>' + icon('external', 19) + '</span><div><strong>' + escapeHtml(provider.name) + '</strong><small>' + (isZh ? '将在新窗口完成账户选择与授权；返回后继续自动配置。' : 'Choose and authorize the merchant account in a new window, then return for automatic setup.') + '</small></div></div>';
    body = '<form id="provider-authorization-form" class="form-stack"><input type="hidden" name="providerId" value="' + escapeHtml(selected) + '"/>' + providerConnectStepper(step, isZh) + '<div class="provider-connect-heading"><span class="provider-logo provider-' + escapeHtml(provider.id) + '">' + escapeHtml(provider.name.charAt(0)) + '</span><div><strong>' + escapeHtml(provider.name) + '</strong><small>' + escapeHtml(model.authorizationTitle) + '</small></div></div><div class="secure-connect-summary"><span>' + icon('shield', 20) + '</span><div><strong>' + escapeHtml(model.authorizationTitle) + '</strong><small>' + escapeHtml(model.authorizationCopy) + '</small></div></div>' + credentialFields + '<label class="checkbox-row"><input type="checkbox" name="ownership" required/><span><strong>' + (isZh ? '我确认拥有或已获授权连接此商户账户' : 'I confirm I own or am authorized to connect this merchant account') + '</strong><small>' + (isZh ? '连接后仍会按支付方式、地区和币种做运行时能力判断。' : 'Runtime capability is still evaluated by payment method, region and currency after connection.') + '</small></span></label></form>';
    const primary = '<button type="submit" form="provider-authorization-form" class="button button-primary">' + escapeHtml(model.launchLabel) + '</button>';
    footer = '<button type="button" class="button button-secondary" data-action="provider-connect-back" data-provider-id="' + escapeHtml(selected) + '" data-provider-step="select">' + (isZh ? '上一步' : 'Back') + '</button>' + primary;
  } else if (step === 'authorizing') {
    body = '<div class="form-stack">' + providerConnectStepper(step, isZh) + '<div class="provider-connect-heading"><span class="provider-logo provider-' + escapeHtml(provider.id) + '">' + escapeHtml(provider.name.charAt(0)) + '</span><div><strong>' + escapeHtml(provider.name) + '</strong><small>' + (isZh ? '正在等待安全授权回调' : 'Waiting for secure authorization callback') + '</small></div></div><div class="provider-pending-card"><span>' + icon('sync', 21) + '</span><div><strong>' + (isZh ? '请在支付服务商页面完成授权' : 'Complete authorization in the provider page') + '</strong><small>' + (isZh ? '生产环境只有在服务商回调携带已验证 state 后，才会进入连接校验。此原型提供成功和拒绝回调的演示路径。' : 'Production proceeds only after the provider callback returns a verified state. This prototype exposes success and denied callback paths for review.') + '</small></div></div></div>';
    footer = '<button type="button" class="button button-secondary" data-action="provider-oauth-denied" data-provider-id="' + escapeHtml(selected) + '">' + (isZh ? '模拟授权被拒绝' : 'Simulate authorization denied') + '</button><button type="button" class="button button-primary" data-action="provider-oauth-return" data-provider-id="' + escapeHtml(selected) + '">' + (isZh ? '模拟已验证回调' : 'Simulate verified callback') + '</button>';
  } else {
    const passed = connection.providerId === selected && connection.validationState === 'passed';
    const check = function (done, title, copy) {
      return '<li class="' + (done ? 'is-passed' : 'is-pending') + '"><span>' + (done ? '✓' : '…') + '</span><div><strong>' + title + '</strong><small>' + copy + '</small></div></li>';
    };
    const checks = check(connection.providerId === selected && connection.authorizationState === 'verified', isZh ? '账户所有权已确认' : 'Merchant account ownership confirmed', isZh ? '已获得安全连接引用。' : 'A secure connection reference was received.') + check(passed, isZh ? '签名 Webhook 已自动创建' : 'Signed webhook created automatically', isZh ? '支付、退款与失败事件将由服务端验证。' : 'Payment, refund and failure events will be verified on the server.') + check(passed, isZh ? '支付方式与安全测试已通过' : 'Payment methods and safe test passed', isZh ? '具体购后资格仍会在每笔交易时判断。' : 'Post-purchase eligibility will still be evaluated for each transaction.');
    body = (passed ? '<form id="provider-validation-form" class="form-stack"><input type="hidden" name="providerId" value="' + escapeHtml(selected) + '"/>' : '<div class="form-stack">') + providerConnectStepper(step, isZh) + '<div class="provider-connect-heading"><span class="provider-logo provider-' + escapeHtml(provider.id) + '">' + escapeHtml(provider.name.charAt(0)) + '</span><div><strong>' + escapeHtml(provider.name) + '</strong><small>' + (passed ? (isZh ? '服务端连接校验已通过' : 'Server-side connection checks passed') : (isZh ? '准备运行连接校验' : 'Ready to run connection checks')) + '</small></div></div><ul class="provider-validation-list">' + checks + '</ul><div class="modal-callout"><span>' + icon('shield', 17) + '</span><span><strong>' + (passed ? (isZh ? '连接即将完成' : 'Ready to finish connection') : (isZh ? '校验尚未完成' : 'Validation has not run yet')) + '</strong><small>' + (passed ? (isZh ? '完成后，服务商卡片会显示已连接；密钥不会在 BestCheckout 中显示。' : 'After finishing, the provider card will show Connected. Credentials are never displayed in BestCheckout.') : (isZh ? '生产环境会等待授权、Webhook、测试支付和失败事件处理均返回通过。' : 'Production waits for authorization, webhook, test payment and failure-event handling to pass.')) + '</small></span></div>' + (passed ? '</form>' : '</div>');
    footer = '<button type="button" class="button button-secondary" data-action="provider-connect-back" data-provider-id="' + escapeHtml(selected) + '" data-provider-step="authorize">' + (isZh ? '上一步' : 'Back') + '</button>' + (passed ? '<button type="submit" form="provider-validation-form" class="button button-primary">' + (isZh ? '完成连接' : 'Finish connection') + '</button>' : '<button type="button" class="button button-primary" data-action="run-provider-validation" data-provider-id="' + escapeHtml(selected) + '">' + (isZh ? '运行自动校验' : 'Run automatic validation') + '</button>');
  }
  return modalShell('connect-provider', isZh ? '连接支付账户' : 'Connect payment account', isZh ? '选择服务商、完成账户授权后，BestCheckout 会自动配置并校验支付连接。' : 'Choose a provider, authorize the merchant account, then let BestCheckout configure and validate the connection.', body, footer, true);
}

export function renderTrackingReviewModal(state) {
  const discovered = state.tracking.filter(function (item) { return item.id !== 'bestcheckout'; });
  const rows = discovered.map(function (item) {
    return '<label class="tracking-review-row"><input type="checkbox" name="destination" value="' + escapeHtml(item.id) + '"/><span class="tracking-review-icon">' + icon('pixel', 16) + '</span><span data-i18n-skip><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.discoveredId) + ' · found in ' + escapeHtml(item.discoveredFrom) + '</small></span>' + badge(item.state) + '</label>';
  }).join('');
  const body = '<form id="tracking-review-form"><p class="modal-intro">Select the destinations the merchant owns and wants BestCheckout to configure. Selection does not copy channel credentials.</p><div class="tracking-review-list">' + rows + '</div><fieldset class="form-stack"><legend>Required confirmations</legend><label class="checkbox-row"><input type="checkbox" name="ownership" required/><span><strong>I confirm ownership of the selected IDs</strong><small>Discovered identifiers can belong to old agencies, apps or themes.</small></span></label><label class="checkbox-row"><input type="checkbox" name="consent" required/><span><strong>Consent behavior has been reviewed</strong><small>Hosted checkout must enforce the same Customer Privacy state as the storefront.</small></span></label><label class="checkbox-row"><input type="checkbox" name="dedupe" required/><span><strong>Purchase event ownership is defined</strong><small>Browser and server delivery will share a single event_id.</small></span></label></fieldset></form>';
  const footer = button('Cancel', 'close-modal') + '<button type="submit" form="tracking-review-form" class="button button-primary">Confirm selected tags</button>';
  return modalShell('tracking-review', 'Review discovered tracking tags', 'Discovery accelerates setup but never replaces merchant authorization.', body, footer, true);
}

export function renderAppEmbedModal(state) {
  const store = state.store;
  const body = '<form id="app-embed-form" class="form-stack"><div class="theme-editor-preview"><header><span>Theme editor · App embeds</span><strong data-i18n-skip>' + escapeHtml(store.activeTheme) + '</strong></header><div class="theme-app-row"><span class="bestcheckout-mark">B</span><div><strong>BestCheckout</strong><small>Checkout-entry handoff layer</small></div><label class="switch"><input type="checkbox" name="enabled" checked/><span></span></label></div></div><dl class="detail-grid detail-grid-single"><div><dt>Active theme</dt><dd data-i18n-skip>' + escapeHtml(store.activeTheme) + '</dd></div><div><dt>Embed asset</dt><dd data-i18n-skip>' + escapeHtml(store.embedAsset) + '</dd></div></dl><label class="checkbox-row"><input type="checkbox" name="merchantConfirmed" required/><span><strong>I saved the active theme with BestCheckout enabled</strong><small>Production re-verifies the active theme ID, embed handle and asset version on the server.</small></span></label></form>';
  const footer = button('Cancel', 'close-modal') + '<button type="submit" form="app-embed-form" class="button button-primary">Verify current theme</button>';
  return modalShell('app-embed', 'Verify BestCheckout App embed', 'Shopify requires the merchant to enable this in Theme Editor.', body, footer, true);
}

export function renderPublishModal(funnel, intent, state) {
  const blockers = Object.keys(funnel.guardrails).filter(function (key) {
    return key !== 'fallback' && funnel.guardrailSeverity[key] === 'block' && !['Ready', 'Healthy'].includes(funnel.guardrails[key]);
  });
  const blocked = blockers.length > 0;
  const rows = Object.keys(funnel.guardrails).filter(function (key) { return key !== 'fallback'; }).map(function (key) {
    const label = key === 'writeback' ? 'Order writeback' : key === 'shopifyAccess' ? 'Shopify access' : key === 'embed' ? 'App embed' : key === 'graph' ? 'Offer graph' : key.charAt(0).toUpperCase() + key.slice(1);
    return '<div class="publish-check"><span>' + icon(['Ready', 'Healthy'].includes(funnel.guardrails[key]) ? 'check' : 'alert', 15) + '</span><strong>' + escapeHtml(label) + '</strong>' + badge(funnel.guardrails[key]) + '</div>';
  }).join('');
  const check = funnel.deploymentCheck || {};
  const publishLabel = intent === 'publish-and-resume' ? 'Publish current draft & resume' : funnel.deploymentSnapshot ? 'Republish funnel' : 'Publish funnel';
  const store = state.store;
  const contract = '<dl class="detail-grid detail-grid-single deployment-contract"><div><dt>Funnel revision</dt><dd><code data-i18n-skip>' + escapeHtml(check.expectedRevision || 'not_created') + '</code></dd></div><div><dt>Shopify surface</dt><dd><code data-i18n-skip>' + escapeHtml(store.checkoutSurfaceMode + ' · ' + store.checkoutSurfaceVersion) + '</code></dd></div><div><dt>Payment route</dt><dd><code data-i18n-skip>' + escapeHtml(funnel.paymentRoutePolicyRef) + '</code></dd></div><div><dt>Cart handoff</dt><dd><code data-i18n-skip>' + escapeHtml(store.cartHandoffSchemaVersion + ' · authoritative refresh') + '</code></dd></div><div><dt>Phase-aware fallback</dt><dd>Native before charge · recover unknown · reconcile after capture</dd></div><div><dt>Writeback circuit breaker</dt><dd><code data-i18n-skip>' + escapeHtml(store.writebackCircuitBreakerRef) + '</code></dd></div></dl>';
  const body = '<div class="deployment-check-meta"><span>Payload <code data-i18n-skip>' + escapeHtml(check.snapshotHash || 'not_created') + '</code></span><span>Checked ' + escapeHtml(check.checkedAt || 'Not evaluated') + '</span></div>' + contract + '<div class="publish-checks">' + rows + '</div>' + (blocked ? '<div class="modal-callout modal-callout-warning">' + icon('alert', 17) + '<span><strong>Publishing is blocked</strong><small>Resolve every blocking deployment gate before sending Shopify traffic to this funnel. Tracking warnings disable unapproved delivery but do not block safe payment.</small></span></div>' : '<div class="modal-callout">' + icon('shield', 17) + '<span><strong>Runtime reads only this immutable deployment</strong><small>The payload freezes Shopify access, audience, allocation, graph edges, page versions, payment route, cart handoff, phase-aware fallback, tracking and writeback policy. Provider secrets are never copied into it.</small></span></div>');
  const footer = button('Cancel', 'close-modal') + (blocked ? '<button type="button" class="button button-primary" data-action="open-blocking-settings">Resolve blockers</button>' : '<button type="button" class="button button-primary" data-action="confirm-publish" data-funnel-id="' + escapeHtml(funnel.id) + '">' + publishLabel + '</button>');
  return modalShell('publish-funnel', 'Publish ' + funnel.name, 'Deployment gates are checked against the current funnel snapshot.', body, footer, false);
}

export function renderActivityDetailModal(event) {
  const body = '<div class="activity-detail-head">' + badge(event.status) + '<code>' + escapeHtml(event.reference) + '</code></div><p class="activity-detail-copy">' + escapeHtml(event.detail) + '</p><dl class="detail-grid detail-grid-single"><div><dt>Event type</dt><dd>' + escapeHtml(event.category) + '</dd></div><div><dt>Phase</dt><dd><code>' + escapeHtml(event.phase || 'not_recorded') + '</code></dd></div><div><dt>Actor</dt><dd>' + escapeHtml(event.actor) + '</dd></div><div><dt>Observed</dt><dd>' + escapeHtml(event.time) + '</dd></div><div><dt>Attempt</dt><dd>' + escapeHtml(event.attempt == null ? 'Not recorded' : event.attempt) + '</dd></div><div><dt>Idempotency</dt><dd>' + escapeHtml(event.idempotency || 'Not recorded') + '</dd></div></dl><div class="modal-callout">' + icon('shield', 17) + '<span><strong>Order integrity at this phase</strong><small>' + escapeHtml(event.integrity || 'No integrity evidence recorded.') + '</small></span></div>';
  return modalShell('activity-detail', event.title, 'Runtime event details', body, button('Close', 'close-modal', { kind: 'primary' }), true);
}

export function renderFunnelPreviewModal(state, funnel, requestedStep) {
  const isZh = state.ui.locale === 'zh';
  const nodes = funnel.nodes || [];
  const checkout = nodes.find(function (node) { return node.kind === 'checkout'; });
  const upsell = nodes.find(function (node) { return node.kind === 'upsell'; });
  const downsell = nodes.find(function (node) { return node.kind === 'downsell'; });
  const thankyou = nodes.find(function (node) { return node.kind === 'thank-you'; });
  const allowedSteps = ['checkout', 'upsell', 'downsell', 'thank-you'];
  const step = allowedSteps.includes(requestedStep) ? requestedStep : 'checkout';
  const pageFor = function (node) { return node && node.pageId ? state.pages.find(function (page) { return page.id === node.pageId; }) : null; };
  const pageName = function (node, fallback) { const page = pageFor(node); return page ? page.name : fallback; };
  const labels = {
    checkout: isZh ? '结账页' : 'Checkout',
    upsell: 'Upsell',
    downsell: 'Downsell',
    'thank-you': isZh ? '感谢页' : 'Thank you',
  };
  const stepOrder = ['checkout', 'upsell', 'downsell', 'thank-you'];
  const nav = stepOrder.filter(function (key) { return key !== 'upsell' || upsell; }).filter(function (key) { return key !== 'downsell' || downsell; }).map(function (key) {
    return '<button type="button" class="funnel-preview-step' + (step === key ? ' is-active' : '') + '" data-action="preview-funnel-step" data-step="' + key + '" aria-current="' + (step === key ? 'step' : 'false') + '"><span>' + (stepOrder.indexOf(key) + 1) + '</span>' + escapeHtml(labels[key]) + '</button>';
  }).join('');
  const offers = state.offerVersions || [];
  const offerFor = function (node) { return node ? offers.find(function (offer) { return offer.id === node.offerRuleRef; }) : null; };
  const products = state.offerCatalogVariants || [];
  const productFor = function (node) { const offer = offerFor(node); return offer ? products.find(function (product) { return product.id === offer.targetVariantId; }) : null; };
  const offerNode = step === 'upsell' ? upsell : downsell;
  const offerProduct = productFor(offerNode);
  const offerPrice = offerFor(offerNode);
  const heading = step === 'checkout' ? pageName(checkout, 'Aura checkout') : step === 'upsell' ? pageName(upsell, 'Upsell offer') : step === 'downsell' ? pageName(downsell, 'Downsell offer') : pageName(thankyou, 'Aura thank you');
  const stageCopy = step === 'checkout'
    ? (isZh ? '测试买家已命中此漏斗，并分配到 BestCheckout Checkout 变体。' : 'A test buyer matched this Funnel and was allocated to the BestCheckout Checkout variant.')
    : step === 'upsell'
      ? (isZh ? '模拟支付成功后的一键加购步骤。' : 'A simulated one-click offer after payment.')
      : step === 'downsell'
        ? (isZh ? '仅在拒绝上一项优惠后展示。' : 'Shown only after the preceding offer is declined.')
        : (isZh ? '模拟完成状态；不会创建订单或触发任何像素。' : 'Simulated completion. No order or tracking event is created.');
  const action = step === 'checkout'
    ? '<button type="button" class="button button-primary" data-action="preview-funnel-step" data-step="' + (upsell ? 'upsell' : 'thank-you') + '">' + (isZh ? '继续到支付后' : 'Continue after payment') + '</button>'
    : step === 'upsell'
      ? '<button type="button" class="button button-primary" data-action="preview-funnel-step" data-step="thank-you">' + (isZh ? '接受优惠' : 'Accept offer') + '</button><button type="button" class="button button-secondary" data-action="preview-funnel-step" data-step="' + (downsell ? 'downsell' : 'thank-you') + '">' + (isZh ? '拒绝' : 'No thanks') + '</button>'
      : step === 'downsell'
        ? '<button type="button" class="button button-primary" data-action="preview-funnel-step" data-step="thank-you">' + (isZh ? '接受备用优惠' : 'Accept backup offer') + '</button><button type="button" class="button button-secondary" data-action="preview-funnel-step" data-step="thank-you">' + (isZh ? '继续' : 'Continue') + '</button>'
        : '<button type="button" class="button button-primary" data-action="close-modal">' + (isZh ? '结束预览' : 'End preview') + '</button>';
  const offerName = offerProduct ? offerProduct.name : heading;
  const offerAmount = offerPrice && offerPrice.pricing ? '$' + offerPrice.pricing.amount : '$19.20';
  const offerVisual = offerNode ? '<div class="funnel-preview-store funnel-preview-store-offer"><header class="funnel-preview-merchant"><strong>LAVENDER LABS</strong><span>' + escapeHtml(isZh ? '订单已确认' : 'Order confirmed') + '</span></header><div class="funnel-preview-postpurchase-note">' + icon('shield', 14) + escapeHtml(isZh ? '使用已保存的支付授权安全加购' : 'Add securely with your saved payment authorization') + '</div><main><span class="funnel-preview-offer-kicker">' + escapeHtml(isZh ? '限时专属优惠' : 'ONE-TIME OFFER') + '</span><div class="funnel-preview-product-image"></div><h4 data-i18n-skip>' + escapeHtml(offerName) + '</h4><p>' + escapeHtml(isZh ? '与当前订单一起配送，无需重新填写支付信息。' : 'Ships with your current order. No extra checkout details needed.') + '</p><div class="funnel-preview-price"><s>$24.00</s><strong data-i18n-skip>' + escapeHtml(offerAmount) + '</strong><em>' + escapeHtml(isZh ? '今日优惠' : 'SAVE TODAY') + '</em></div><ul><li>' + escapeHtml(isZh ? '随原订单一起发货' : 'Ships with your existing order') + '</li><li>' + escapeHtml(isZh ? '30 天退款保障' : '30-day money-back guarantee') + '</li></ul></main></div>' : '';
  const checkoutVisual = '<div class="funnel-preview-store funnel-preview-store-checkout"><header class="funnel-preview-merchant"><strong>LAVENDER LABS</strong><span>' + escapeHtml(isZh ? '安全结账' : 'Secure checkout') + '</span></header><div class="funnel-preview-order-row"><span class="funnel-preview-cart-thumb"></span><div><strong>Sleep Reset Bundle</strong><small>Monthly supply · 1 item</small></div><b>$78.60</b></div><main><div class="funnel-preview-express"><span>Shop Pay</span><span>PayPal</span><span>G Pay</span></div><div class="funnel-preview-or"><span>' + escapeHtml(isZh ? '或使用银行卡' : 'OR PAY BY CARD') + '</span></div><section class="funnel-preview-form-section"><div><strong>' + escapeHtml(isZh ? '联系信息' : 'Contact') + '</strong><a>' + escapeHtml(isZh ? '登录' : 'Log in') + '</a></div><label>' + escapeHtml(isZh ? '邮箱或手机号' : 'Email or mobile phone') + '</label><i></i></section><section class="funnel-preview-form-section"><strong>' + escapeHtml(isZh ? '配送地址' : 'Delivery') + '</strong><i></i><div class="funnel-preview-field-pair"><i></i><i></i></div></section><section class="funnel-preview-form-section"><strong>' + escapeHtml(isZh ? '支付方式' : 'Payment') + '</strong><div class="funnel-preview-card-field"><b>●</b><span>' + escapeHtml(isZh ? '信用卡' : 'Credit card') + '</span></div></section><div class="funnel-preview-total-row"><span>' + escapeHtml(isZh ? '总计' : 'Total') + '</span><strong>$78.60</strong></div></main></div>';
  const thankyouVisual = '<div class="funnel-preview-store funnel-preview-store-thankyou"><header class="funnel-preview-merchant"><strong>LAVENDER LABS</strong><span>' + escapeHtml(isZh ? '订单完成' : 'Order complete') + '</span></header><main><div class="funnel-preview-thankyou"><span>' + icon('check', 28) + '</span><small>' + escapeHtml(isZh ? '订单 #12841' : 'Order #12841') + '</small><strong>' + escapeHtml(isZh ? '感谢你的订单！' : 'Thank you for your order!') + '</strong><p>' + escapeHtml(isZh ? '确认邮件已发送给 jamie@example.com。' : 'A confirmation email was sent to jamie@example.com.') + '</p></div><section class="funnel-preview-delivery-card"><span>' + escapeHtml(isZh ? '预计送达' : 'Estimated delivery') + '</span><strong>' + escapeHtml(isZh ? '周五，7 月 18 日' : 'Friday, July 18') + '</strong><i><b></b></i><small>' + escapeHtml(isZh ? '订单已确认 · 准备发货 · 送达' : 'Confirmed · Preparing · Delivered') + '</small></section><section class="funnel-preview-receipt"><div><span>Sleep Reset Bundle</span><strong>$78.60</strong></div><div><span>' + escapeHtml(isZh ? '配送' : 'Shipping') + '</span><strong>' + escapeHtml(isZh ? '免费' : 'Free') + '</strong></div><div><b>' + escapeHtml(isZh ? '已支付总额' : 'Paid total') + '</b><b>$78.60</b></div></section></main></div>';
  const visual = step === 'checkout' ? checkoutVisual : step === 'thank-you' ? thankyouVisual : offerVisual;
  const body = '<div class="funnel-preview-session"><div class="funnel-preview-session-head"><span>' + icon('shield', 16) + '</span><div><strong>' + escapeHtml(isZh ? '安全测试会话' : 'Safe test session') + '</strong><small>' + escapeHtml(isZh ? '不会分配真实流量、创建订单或发送归因事件。' : 'No live traffic, orders, or attribution events are created.') + '</small></div><code>preview_' + escapeHtml(funnel.id) + '</code></div><nav class="funnel-preview-steps" aria-label="' + escapeHtml(isZh ? '预览步骤' : 'Preview steps') + '">' + nav + '</nav><section class="funnel-preview-stage"><header><span>' + escapeHtml(labels[step]) + '</span><h3 data-i18n-skip>' + escapeHtml(heading) + '</h3><p>' + escapeHtml(stageCopy) + '</p></header><div class="funnel-preview-device"><div class="funnel-preview-browser"><i></i><i></i><i></i><span>preview.bestcheckout.test</span></div><div class="funnel-preview-content">' + visual + '<div class="funnel-preview-actions">' + action + '</div></div></div></section></div>';
  return modalShell('funnel-preview', isZh ? '预览购物路径' : 'Preview journey', funnel.name + ' · ' + (isZh ? '只读测试会话' : 'read-only test session'), body, button(isZh ? '关闭预览' : 'Close preview', 'close-modal'), true);
}

export function renderRemoveJourneyPageModal(funnel, node, locale) {
  const isZh = locale === 'zh';
  const pageType = node.kind === 'thank-you' ? (isZh ? 'Thank you 页面' : 'Thank you page') : node.kind === 'checkout' ? 'Checkout page' : node.kind === 'upsell' ? 'Upsell page' : 'Downsell page';
  const body = '<div class="modal-callout modal-callout-warning">' + icon('alert', 17) + '<span><strong>' + escapeHtml(isZh ? '仅从当前漏斗中移除' : 'Remove only from this Funnel') + '</strong><small>' + escapeHtml(isZh ? '页面仍保留在「Pages」中，可在其他漏斗继续使用。删除后会重新校验当前漏斗的路由与发布条件。' : 'The page remains in Pages and can still be used by another Funnel. Routing and publish checks will be recalculated.') + '</small></span></div><div class="remove-journey-page-summary"><span>' + icon('pages', 18) + '</span><div><small>' + escapeHtml(pageType) + '</small><strong data-i18n-skip>' + escapeHtml(node.label) + '</strong></div></div>';
  const footer = button(isZh ? '取消' : 'Cancel', 'close-modal') + '<button type="button" class="button button-critical" data-action="confirm-remove-journey-page" data-funnel-id="' + escapeHtml(funnel.id) + '" data-node-id="' + escapeHtml(node.id) + '">' + (isZh ? '从漏斗移除' : 'Remove from Funnel') + '</button>';
  return modalShell('remove-journey-page', isZh ? '从漏斗移除页面？' : 'Remove page from Funnel?', isZh ? '不会删除页面库中的原页面。' : 'The original page in Pages will not be deleted.', body, footer, false);
}

export function renderQuickStartModalLegacy(state) {
  const onboarding = state.onboarding;
  const isZh = state.ui.locale === 'zh';
  const steps = onboarding.steps || [];
  const index = Math.min(Math.max(0, state.ui.onboardingStep || 0), Math.max(0, steps.length - 1));
  const step = steps[index] || {};
  const allSteps = steps.map(function (item, stepIndex) {
    const status = stepIndex < index ? ' is-complete' : stepIndex === index ? ' is-current' : '';
    const available = stepIndex <= index;
    return '<button type="button" class="onboarding-step-row' + status + '"' + (available ? ' data-action="onboarding-select-step" data-step-index="' + stepIndex + '"' : ' disabled aria-disabled="true"') + '><span>' + (stepIndex < index ? icon('check', 15) : stepIndex + 1) + '</span><div><strong>' + escapeHtml(isZh ? item.titleZh : item.title) + '</strong><small>' + escapeHtml((isZh ? item.minutes + ' 分钟' : item.minutes + ' min') + ' · ' + (isZh ? item.detailZh : item.detail)) + '</small></div>' + (stepIndex === index ? '<em>' + escapeHtml(isZh ? '现在做' : 'Do now') + '</em>' : '') + '</button>';
  }).join('');
  const isLast = index === steps.length - 1;
  const body = '<div class="onboarding-modal"><div class="onboarding-modal-intro"><span>' + icon('sparkles', 19) + '</span><div><strong>' + escapeHtml(isZh ? '10 分钟完成首个可发布漏斗' : 'Launch your first Funnel in about 10 minutes') + '</strong><p>' + escapeHtml(isZh ? '每一步都只处理一个结果。完成后，日常问题会转到上线健康度持续监控。' : 'Each step has one outcome. When setup is complete, daily issues move to ongoing Launch health monitoring.') + '</p></div><b>' + (index + 1) + '/' + steps.length + '</b></div><div class="onboarding-modal-grid"><nav class="onboarding-step-list">' + allSteps + '</nav><section class="onboarding-current-step"><span>' + escapeHtml(isZh ? '当前要做' : 'What to do now') + '</span><h3>' + escapeHtml(isZh ? step.titleZh : step.title) + '</h3><p>' + escapeHtml(isZh ? step.detailZh : step.detail) + '</p><div class="onboarding-time"><span>' + icon('activity', 16) + '</span><strong>' + escapeHtml(isZh ? step.minutes + ' 分钟' : step.minutes + ' min') + '</strong><small>' + escapeHtml(isZh ? '预计完成时间' : 'estimated time') + '</small></div><div class="modal-callout"><span>' + icon('shield', 17) + '</span><span><strong>' + escapeHtml(isZh ? '不会立即影响线上流量' : 'No live traffic changes yet') + '</strong><small>' + escapeHtml(isZh ? '在最后一步预览并确认前，Shopify 原生 Checkout 会持续作为安全路径。' : 'Shopify native Checkout remains the safety path until you preview and confirm the final launch step.') + '</small></span></div></section></div></div>';
  const footer = button(isZh ? '稍后继续' : 'Continue later', 'close-modal') + '<button type="button" class="button button-secondary" data-action="onboarding-open-task" data-target-route="' + escapeHtml(step.route || 'home') + '">' + (isZh ? '打开此步骤' : 'Open task') + '</button><button type="button" class="button button-primary" data-action="onboarding-next">' + (isLast ? (isZh ? '前往发布' : 'Go to publish') : (isZh ? '确认完成并继续' : 'Confirm complete and continue')) + '</button>';
  return modalShell('quick-start', isZh ? '快速启用' : 'Quick start', isZh ? '首次上线共需完成 ' + steps.length + ' 步。' : 'Complete ' + steps.length + ' focused steps for your first launch.', body, footer, true);
}

export function renderQuickStartModalDirectEntryLegacy(state) {
  const onboarding = state.onboarding;
  const isZh = state.ui.locale === 'zh';
  const steps = onboarding.steps || [];
  const index = Math.min(Math.max(0, state.ui.onboardingStep || 0), Math.max(0, steps.length - 1));
  const step = steps[index] || {};
  const allSteps = steps.map(function (item, stepIndex) {
    const status = stepIndex < index ? ' is-complete' : stepIndex === index ? ' is-current' : '';
    const action = stepIndex < index ? (isZh ? '查看配置' : 'Review') : item.id === 'launch' ? (isZh ? '查看检查' : 'View checks') : (isZh ? '去配置' : 'Configure');
    return '<button type="button" class="onboarding-step-row' + status + '" data-action="onboarding-open-step" data-step-index="' + stepIndex + '" data-target-route="' + escapeHtml(item.route || 'home') + '"><span>' + (stepIndex < index ? icon('check', 15) : stepIndex + 1) + '</span><div><strong>' + escapeHtml(isZh ? item.titleZh : item.title) + '</strong><small>' + escapeHtml(isZh ? item.minutes + ' 分钟' : item.minutes + ' min') + '</small></div><em>' + escapeHtml(action) + icon('chevron', 13) + '</em></button>';
  }).join('');
  const isLast = index === steps.length - 1;
  const body = '<div class="onboarding-modal"><div class="onboarding-modal-intro"><span>' + icon('sparkles', 19) + '</span><div><strong>' + escapeHtml(isZh ? '10 分钟完成首个可发布漏斗' : 'Launch your first Funnel in about 10 minutes') + '</strong><p>' + escapeHtml(isZh ? '每一步都可以直接进入配置；跳转不会自动标记完成。' : 'Every step has a direct configuration entry. Opening it never marks the step complete automatically.') + '</p></div><b>' + (index + 1) + '/' + steps.length + '</b></div><div class="onboarding-modal-grid"><nav class="onboarding-step-list">' + allSteps + '</nav><section class="onboarding-current-step"><span>' + escapeHtml(isZh ? '当前要做' : 'What to do now') + '</span><h3>' + escapeHtml(isZh ? step.titleZh : step.title) + '</h3><p>' + escapeHtml(isZh ? step.detailZh : step.detail) + '</p><div class="onboarding-time"><span>' + icon('activity', 16) + '</span><strong>' + escapeHtml(isZh ? step.minutes + ' 分钟' : step.minutes + ' min') + '</strong><small>' + escapeHtml(isZh ? '预计完成时间' : 'estimated time') + '</small></div><div class="modal-callout"><span>' + icon('shield', 17) + '</span><span><strong>' + escapeHtml(isZh ? '不会立即影响线上流量' : 'No live traffic changes yet') + '</strong><small>' + escapeHtml(isZh ? '最终发布前，Shopify 原生 Checkout 会持续作为安全路径。' : 'Shopify native Checkout remains the safety path until the final publish step.') + '</small></span></div></section></div></div>';
  const footer = button(isZh ? '稍后继续' : 'Continue later', 'close-modal') + '<button type="button" class="button button-secondary" data-action="onboarding-open-step" data-step-index="' + index + '" data-target-route="' + escapeHtml(step.route || 'home') + '">' + (isZh ? '去配置此步骤' : 'Configure this step') + '</button><button type="button" class="button button-primary" data-action="onboarding-next">' + (isLast ? (isZh ? '前往发布' : 'Go to publish') : (isZh ? '确认完成并继续' : 'Confirm complete and continue')) + '</button>';
  return modalShell('quick-start', isZh ? '快速启用' : 'Quick start', isZh ? '完成 ' + steps.length + ' 个上线步骤；你也可以直接跳到任一配置页。' : 'Complete ' + steps.length + ' focused steps, or jump straight to any configuration page.', body, footer, true);
}

export function renderQuickStartModal(state) {
  const isZh = state.ui.locale === 'zh';
  const readiness = getSetupReadiness(state);
  const items = readiness.checks;
  const next = items.find((item) => item.state !== 'complete') || readiness.launch;
  const actionLabel = function (item) {
    if (item.state === 'complete') return isZh ? '查看' : 'View';
    if (item.state === 'ready') return isZh ? '预览并发布' : 'Preview & publish';
    if (item.id === 'launch') return isZh ? '去发布' : 'Publish';
    return isZh ? '去设置' : 'Set up';
  };
  const stateLabel = function (item) {
    if (item.state === 'complete') return isZh ? '已完成' : 'Complete';
    if (item.state === 'ready') return isZh ? '可以发布' : 'Ready to publish';
    if (item.state === 'blocked') return isZh ? '请先完成设置' : 'Finish setup first';
    return isZh ? '待设置' : 'Set up needed';
  };
  const allSteps = items.map(function (item) {
    const stateIcon = item.state === 'complete' ? icon('check', 15) : item.state === 'ready' ? icon('play', 15) : icon('alert', 15);
    return '<button type="button" class="onboarding-step-row onboarding-system-row is-' + escapeHtml(item.state) + '" data-action="onboarding-open-step" data-target-route="' + escapeHtml(item.route) + '"><span>' + stateIcon + '</span><div><strong>' + escapeHtml(isZh ? item.titleZh : item.title) + '</strong></div><em>' + escapeHtml(stateLabel(item)) + ' ' + icon('chevron', 13) + '</em></button>';
  }).join('');
  const optionalGrowth = '<button type="button" class="onboarding-step-row onboarding-system-row onboarding-optional-growth" data-action="onboarding-open-step" data-target-route="funnels"><span>' + icon('sparkles', 15) + '</span><div><strong>' + escapeHtml(isZh ? '添加 Upsell / Downsell（可选）' : 'Add Upsell / Downsell (optional)') + '</strong></div><em>' + escapeHtml(isZh ? '可选' : 'Optional') + ' ' + icon('chevron', 13) + '</em></button>';
  const body = '<div class="onboarding-modal"><div class="onboarding-modal-intro"><span>' + icon('shield', 19) + '</span><div><strong>' + escapeHtml(isZh ? '准备上线' : 'Get ready to launch') + '</strong><p>' + escapeHtml(isZh ? '完成以下设置后，就可以预览并发布结账页。' : 'Complete these setup tasks, then preview and publish your checkout.') + '</p></div><b>' + readiness.completeCount + '/' + items.length + '</b></div><div class="onboarding-modal-grid"><nav class="onboarding-step-list">' + allSteps + optionalGrowth + '</nav><section class="onboarding-current-step"><span>' + escapeHtml(isZh ? '下一步' : 'Next step') + '</span><h3>' + escapeHtml(isZh ? next.titleZh : next.title) + '</h3><p>' + escapeHtml(isZh ? next.detailZh : next.detail) + '</p><div class="onboarding-time"><span>' + icon('activity', 16) + '</span><strong>' + escapeHtml(stateLabel(next)) + '</strong><small>' + escapeHtml(isZh ? '完成后可继续下一项，无需按固定顺序设置。' : 'Complete tasks in any order, then continue with the next one.') + '</small></div><div class="modal-callout"><span>' + icon('shield', 17) + '</span><span><strong>' + escapeHtml(isZh ? '不会影响现有结账' : 'Your current checkout stays unchanged') + '</strong><small>' + escapeHtml(isZh ? '发布前，买家会继续在 Shopify 原生结账完成付款。' : 'Before publishing, buyers continue through your Shopify checkout.') + '</small></span></div></section></div></div>';
  const footer = button(isZh ? '关闭' : 'Close', 'close-modal') + '<button type="button" class="button button-primary" data-action="onboarding-open-step" data-target-route="' + escapeHtml(next.route) + '">' + icon(next.state === 'ready' ? 'play' : 'arrow', 16) + '<span>' + escapeHtml(actionLabel(next)) + '</span></button>';
  return modalShell('quick-start', isZh ? '上线准备' : 'Launch setup', isZh ? '完成必要设置后即可发布。' : 'Complete the required setup, then publish.', body, footer, true);
}

export function renderInstallationModal(locale) {
  const isZh = locale === 'zh';
  const flow = [
    { icon: 'settings', title: isZh ? '创建商户组织' : 'Create merchant organization', copy: isZh ? '在 BestCheckout 控制台建立商户与目标店铺。' : 'Create the merchant and target stores in BestCheckout.' },
    { icon: 'shield', title: isZh ? '分配 App 实例' : 'Assign App instance', copy: isZh ? '为该组织分配 Custom distribution App 与安装入口。' : 'Assign a Custom-distribution App and installation entry.' },
    { icon: 'store', title: isZh ? '店铺管理员安装' : 'Store admin installs', copy: isZh ? '管理员在 Shopify 授权当前店铺；每店授权独立。' : 'An admin authorizes the current Shopify store; every store is separate.' },
    { icon: 'sync', title: isZh ? '自动开通工作区' : 'Provision workspace', copy: isZh ? '自动同步商品、创建工作区、注册 Webhook 与草稿模板。' : 'Sync commerce data, provision the workspace, webhooks and draft templates.' },
  ].map(function (item, index) {
    return '<article class="installation-flow-step"><span>' + icon(item.icon, 17) + '</span><div><b>' + (index + 1) + '</b><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.copy) + '</small></div></article>' + (index < 3 ? '<i class="installation-flow-arrow">' + icon('arrow', 15) + '</i>' : '');
  }).join('');
  const scopes = [
    { title: isZh ? '单店商户' : 'One store', copy: isZh ? '一个 App 实例 → 一个 Shopify 店铺 → 一个安装授权。' : 'One App instance → one Shopify store → one installation.' },
    { title: isZh ? '同一 Plus 组织多店' : 'One Plus organization, many stores', copy: isZh ? '一个 App 实例；组织内每个店铺仍须独立安装、独立授权。' : 'One App instance; every store still installs and authorizes separately.' },
    { title: isZh ? '不同 Shopify 组织' : 'Different Shopify organizations', copy: isZh ? '每个组织使用不同 App 实例与安装链接；共享同一套 BestCheckout 服务。' : 'Each organization uses a different App instance and install link, while sharing one BestCheckout service.' },
  ].map(function (item) {
    return '<article><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.copy) + '</small></article>';
  }).join('');
  const start = '<section class="installation-start"><div><span>' + icon('external', 18) + '</span><div><strong>' + escapeHtml(isZh ? '商户从 BestCheckout 安装链接开始' : 'Merchants start from a BestCheckout install link') + '</strong><p>' + escapeHtml(isZh ? '由 BestCheckout 为当前组织生成，打开时会跳转到目标 Shopify 店铺的授权页。' : 'BestCheckout generates it for the current organization and redirects to the target Shopify authorization page.') + '</p></div></div><code data-i18n-skip>https://app.bestcheckout.com/install/lavender-labs</code><small>' + escapeHtml(isZh ? '不是 Shopify App Store，也不是「设置 → Apps → Develop apps」。授权完成后，BestCheckout 才会显示在「设置 → Apps → 已安装」中。' : 'This is not the Shopify App Store or Settings → Apps → Develop apps. After authorization, BestCheckout appears in Settings → Apps → Installed.') + '</small></section>';
  const body = '<div class="installation-modal"><section class="installation-modal-lead"><span>' + icon('shield', 20) + '</span><div><strong>' + escapeHtml(isZh ? '一个 BestCheckout 产品，不等于一个跨组织的 Shopify App' : 'One BestCheckout product does not mean one Shopify App across organizations') + '</strong><p>' + escapeHtml(isZh ? '所有 App 实例共用同一套 BestCheckout 前后端；只有 Shopify 的 App 凭证、安装链接与店铺授权按组织或店铺隔离。' : 'All App instances share the same BestCheckout frontend and backend. Only Shopify credentials, install links and store authorizations are isolated by organization or store.') + '</p></div></section>' + start + '<section><div class="installation-section-head"><span>' + escapeHtml(isZh ? '安装如何发生' : 'How installation works') + '</span><small>' + escapeHtml(isZh ? '安装完成后，才进入当前 BestCheckout 后台。' : 'The BestCheckout admin shown in this prototype starts after installation.') + '</small></div><div class="installation-flow">' + flow + '</div></section><section><div class="installation-section-head"><span>' + escapeHtml(isZh ? 'App 实例与店铺范围' : 'App-instance scope') + '</span><small>' + escapeHtml(isZh ? '决定是否共用安装链接，而不是是否共用商品或支付数据。' : 'This determines install-link reuse, never data or payment sharing.') + '</small></div><div class="installation-scope-grid">' + scopes + '</div></section><div class="modal-callout"><span>' + icon('shield', 17) + '</span><span><strong>' + escapeHtml(isZh ? '每个店铺始终独立' : 'Every store remains isolated') + '</strong><small>' + escapeHtml(isZh ? '每个店分别保存 Shopify token、商品映射、Checkout 域名、支付路由、像素和漏斗；不共享买家或订单数据。' : 'Each store keeps its own Shopify token, mapping, checkout domain, payment routing, pixels and Funnels. Buyer and order data is never shared.') + '</small></span></div></div>';
  return modalShell('installation', isZh ? 'BestCheckout 如何安装到 Shopify' : 'How BestCheckout installs on Shopify', isZh ? '使用 Custom distribution 保持 Shopify 后台内嵌体验。' : 'Custom distribution preserves the embedded Shopify-admin experience.', body, button(isZh ? '知道了' : 'Got it', 'close-modal', { kind: 'primary' }), true);
}

export function renderInfoModal(kind) {
  const content = {
    portability: {
      title: 'BestShopio portability',
      subtitle: 'BestCheckout is the seed, not a dead-end integration.',
      body: '<div class="info-modal-grid"><div><span>' + icon('products', 19) + '</span><strong>Commerce mapping</strong><p>Shopify product, variant and order IDs stay linked to BestShopio entities.</p></div><div><span>' + icon('flow', 19) + '</span><strong>Growth configuration</strong><p>Pages, funnels, offers and experiments move without being recreated.</p></div><div><span>' + icon('card', 19) + '</span><strong>Payment references</strong><p>Authorized provider connections remain merchant-owned and portable where supported.</p></div><div><span>' + icon('analytics', 19) + '</span><strong>Historical truth</strong><p>Final Order Snapshots preserve revenue and attribution across migration.</p></div></div>',
    },
    architecture: {
      title: 'Shared editor architecture',
      subtitle: 'Target production architecture: one versioned editor core, two host adapters.',
      body: '<div class="architecture-diagram"><div><strong>CheckoutEditorCore</strong><small>Page schema · blocks · preview · draft/version contract</small></div><span class="architecture-split"></span><div class="architecture-hosts"><div><strong>BestShopioHostAdapter</strong><small>Existing BestShopio editor route</small></div><div><strong>ShopifyHostAdapter</strong><small>App session · BFF · relative navigation</small></div></div></div><p class="modal-intro">This static prototype simulates the Shopify host experience. Production must extract or mount the real existing editor as a shared package, Custom Element, or mount/unmount bundle—never copy this simulated preview as a second editor.</p><ul class="modal-bullets"><li>Use framework routes plus App Bridge-compatible relative paths such as <code>/app/pages/:pageId/edit</code>.</li><li>Mount directly in the Shopify embedded app document; Shopify keeps its outer iframe, but the editor adds no second iframe.</li><li>Keep URL state for page, funnel node, pinned version and return destination.</li><li>Use revision/ETag concurrency and the same page schema across both hosts.</li></ul>',
    },
    capability: {
      title: 'Post-purchase capability rules',
      subtitle: 'A provider logo alone is never enough to decide eligibility.',
      body: '<div class="capability-formula"><span>Provider</span><b>×</b><span>Payment method</span><b>×</b><span>Region</span><b>×</b><span>Currency</span><b>×</b><span>Authorization state</span></div><ol class="modal-bullets"><li>The backend returns <code>supported</code>, <code>conditional</code> or <code>unsupported</code> for the current order.</li><li>Only a supported result may show a true one-click offer; conditional may require provider confirmation.</li><li><code>eligibility_skipped</code>, decline, and failures before capture can continue safely to Thank you.</li><li>After <code>additional_charge_succeeded</code>, snapshot or writeback failures enter <code>reconciliation_pending</code>; they must be retried, refunded, or escalated—not skipped.</li></ol>',
    },
  }[kind];
  return modalShell('info', content.title, content.subtitle, content.body, button('Done', 'close-modal', { kind: 'primary' }), true);
}

export function renderUnsavedChangesModal(targetRoute) {
  const body = '<div class="modal-callout modal-callout-warning">' + icon('alert', 17) + '<span><strong>Unsaved draft changes will be lost</strong><small>Save the draft before leaving, or discard only the unsaved browser state.</small></span></div>';
  const footer = button('Stay', 'close-modal') + '<button type="button" class="button button-secondary" data-action="discard-and-route" data-target-route="' + escapeHtml(targetRoute) + '">Discard and leave</button><button type="button" class="button button-primary" data-action="save-and-route" data-target-route="' + escapeHtml(targetRoute) + '">Save and leave</button>';
  return modalShell('unsaved-changes', 'Leave page editor?', 'The published page and pinned Funnel versions are not affected.', body, footer, false);
}

export function renderRenamePageModal(page) {
  const body = '<form id="rename-page-form" class="form-stack"><input type="hidden" name="pageId" value="' + escapeHtml(page.id) + '"/><label>Page name<input type="text" name="name" value="' + escapeHtml(page.name) + '" maxlength="80" required autofocus/></label><div class="modal-callout"><span>' + icon('shield', 17) + '</span><span><strong>Renaming does not change the live page</strong><small>Published versions and Funnel deployments stay pinned until you publish again.</small></span></div></form>';
  const footer = button('Cancel', 'close-modal') + '<button type="submit" form="rename-page-form" class="button button-primary">Save name</button>';
  return modalShell('rename-page', 'Rename page', page.name, body, footer, false);
}

export function renderPageVersionHistoryModal(page) {
  const published = page.publishedVersionId
    ? '<article><span class="version-state is-published">Published</span><div><strong>Version ' + escapeHtml(page.version) + '</strong><small>Used by current live Funnel deployments until they are republished.</small></div></article>'
    : '<article><span class="version-state">Not published</span><div><strong>No live version yet</strong><small>Publish a saved draft before this page can receive live traffic.</small></div></article>';
  const draft = page.draftRevision
    ? '<article><span class="version-state is-draft">Draft</span><div><strong>Revision ' + escapeHtml(page.draftRevision) + '</strong><small>Latest editable draft. Saving creates a new revision; publishing creates an immutable version.</small></div></article>'
    : '<article><span class="version-state">No draft</span><div><strong>Published page is current</strong><small>Start editing to create the next draft revision.</small></div></article>';
  const body = '<div class="page-version-list">' + draft + published + '</div>';
  return modalShell('page-versions', 'Version history', page.name, body, button('Done', 'close-modal', { kind: 'primary' }), false);
}

export function renderArchivePageModal(page) {
  const inUse = page.usedBy > 0;
  const body = inUse
    ? '<div class="modal-callout modal-callout-warning">' + icon('alert', 17) + '<span><strong>This page is still used by ' + escapeHtml(page.usedBy) + ' Funnel' + (page.usedBy === 1 ? '' : 's') + '</strong><small>Remove or replace it in every Funnel before archiving. Existing published deployments remain unchanged.</small></span></div>'
    : '<form id="archive-page-form" class="form-stack"><input type="hidden" name="pageId" value="' + escapeHtml(page.id) + '"/><div class="modal-callout modal-callout-warning">' + icon('alert', 17) + '<span><strong>Archive this page?</strong><small>It will be removed from the active page library. Existing published deployments remain unchanged.</small></span></div></form>';
  const footer = inUse
    ? button('Done', 'close-modal', { kind: 'primary' })
    : button('Cancel', 'close-modal') + '<button type="submit" form="archive-page-form" class="button button-critical">Archive page</button>';
  return modalShell('archive-page', 'Archive page', page.name, body, footer, false);
}
