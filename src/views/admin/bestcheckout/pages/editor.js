import { icon } from '../components/common.js';
import { escapeHtml } from '../utils.js';

/*
 * Source-aligned BestShopio Checkout editor.
 *
 * This is intentionally modelled from the existing Online Store editor source:
 * `online-store/js/data.js`, `online-store/js/app.js` and its
 * `sections/checkout-*.js` definitions.  It keeps the Custom App host only as
 * a shell; the editor itself uses the same checkout-specific structure:
 * Header -> Main -> Order summary -> Footer, a dedicated Checkout theme,
 * real checkout sections and the same page family (Checkout / Thank you /
 * Upsell / Downsell).  Do not replace this with a screenshot approximation.
 */

function contextFor(state, route) {
  if (route.segments[0] === 'pages' && route.segments[2] === 'edit') {
    const page = state.pages.find((item) => item.id === route.segments[1]);
    return page ? { page, back: 'pages', source: 'Pages' } : null;
  }
  if (route.segments[0] === 'funnels' && route.segments[2] === 'nodes' && route.segments[4] === 'edit') {
    const funnel = state.funnels.find((item) => item.id === route.segments[1]);
    const node = funnel && funnel.nodes.find((item) => item.id === route.segments[3]);
    const page = node && state.pages.find((item) => item.id === node.pageId);
    return page ? { page, funnel, node, back: 'funnels/' + funnel.id + '?node=' + node.id, source: funnel.name } : null;
  }
  return null;
}

function label(state, en, zh) { return state.ui.locale === 'zh' ? zh : en; }
function esc(value) { return escapeHtml(value == null ? '' : String(value)); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function id(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 8); }
function amount(value) { return '$' + Number(value || 0).toFixed(2); }

const TYPE_META = {
  urgency: { en: 'Countdown', zh: '倒计时', area: 'main' },
  payment: { en: 'Payment section', zh: '支付区块', area: 'main', core: true },
  addon: { en: 'Product upsell', zh: '支付前加购', area: 'main' },
  bundle: { en: 'Offer / Bundle picker', zh: '优惠 / 套餐选择', area: 'main' },
  summary: { en: 'Order summary', zh: '订单摘要', area: 'summary', core: true },
  endorsement: { en: 'Specialist endorsement', zh: '专家背书', area: 'summary' },
  rating: { en: 'Trustpilot review', zh: 'Trustpilot 评价', area: 'summary' },
  trust: { en: 'Trust & certifications', zh: '信任与认证', area: 'summary' },
  guarantee: { en: 'Guarantee badge', zh: '保障徽章', area: 'summary' },
  confirmation: { en: 'Order status', zh: '订单状态', area: 'main', core: true },
  details: { en: 'Order details', zh: '订单详情', area: 'main' },
  tracking: { en: 'Order processing', zh: '订单处理进度', area: 'main' },
  postpurchase: { en: 'Post-purchase offer', zh: '购后优惠', area: 'main', core: true },
};

function sectionName(state, section) {
  const meta = TYPE_META[section.type] || { en: section.type, zh: section.type };
  return label(state, meta.en, meta.zh);
}

function pageTypeName(state, type) {
  if (type === 'checkout') return label(state, 'Checkout', '结账页');
  if (type === 'thank-you') return label(state, 'Thank you', '感谢页');
  if (type === 'upsell') return label(state, 'Upsell', '加购页');
  if (type === 'downsell') return label(state, 'Downsell', '降级加购页');
  return type;
}

function presetName(state, preset) {
  const names = { Standard: ['Standard', '标准版'], 'Thank you': ['Thank you', '感谢页'], Upsell: ['Upsell', '加购'], Downsell: ['Downsell', '降级加购'] };
  const item = names[preset];
  return item ? label(state, item[0], item[1]) : preset;
}

function baseTheme() {
  return {
    logoImage: '', logoText: 'AURA', logoWidth: 150, logoAlign: 'center',
    accent: '#103635', formBackground: '#FFFFFF', summaryBackground: '#F9FAFB',
    contentWidth: 'compact', summaryPosition: 'right', padding: 40, sectionGap: 18,
  };
}

function checkoutSections() {
  return [
    { id: 'urgency', type: 'urgency', settings: { style: 'reserve', message: 'Due to high demand your order is reserved for:', time: '02:45' } },
    { id: 'payment', type: 'payment', settings: { showExpress: true, paypal: true, applePay: true, googlePay: false, showRating: false, newsletter: false, insurance: false, insuranceTitle: 'Shipping insurance', insurancePrice: '$3.95' } },
    { id: 'addon', type: 'addon', settings: { title: 'Recommended with your order', source: 'collection', name: 'Nighttime Gummies', price: '19.20', compare: '24.00' } },
    { id: 'summary', type: 'summary', settings: { source: 'cart', coupon: true } },
    { id: 'rating', type: 'rating', settings: { score: '4.8', count: '45,000+' } },
    { id: 'trust', type: 'trust', settings: { title: 'Trusted quality', badges: 'GMP · Made in USA · FDA registered' } },
  ];
}

function initialDesign(page) {
  const theme = baseTheme();
  if (page.type === 'checkout') return { type: page.type, theme, preset: 'Standard', sections: checkoutSections() };
  if (page.type === 'thank-you') return {
    type: page.type, theme, preset: 'Thank you', sections: [
      { id: 'confirmation', type: 'confirmation', settings: { title: 'Thank you, Amanda', subtitle: 'Your order is confirmed', number: '#BC-1042', writeback: 'Pending' } },
      { id: 'details', type: 'details', settings: { email: 'amanda@example.com', shipping: 'Basic Shipping', payment: 'Visa ending in 4242' } },
      { id: 'summary', type: 'summary', settings: { source: 'final', coupon: false } },
      { id: 'tracking', type: 'tracking', settings: { title: 'Order processing', progress: 35 } },
      { id: 'rating', type: 'rating', settings: { score: '4.9', count: '1,220' } },
    ],
  };
  const down = page.type === 'downsell';
  return {
    type: page.type, theme, preset: down ? 'Downsell' : 'Upsell', sections: [
      { id: 'postpurchase', type: 'postpurchase', settings: {
        tag: down ? 'Last chance' : 'One-time offer', heading: down ? 'A smaller offer selected for this session' : 'Recommended for your order',
        sub: 'Add it with one click. Eligible payment methods do not require payment details again.',
        source: down ? 'Declined-upsell fallback' : 'Dynamic recommendation', rule: down ? 'Lower-price fallback' : '30d co-purchase engine; no repeat in session',
        fallback: 'Manual product or collection fallback', price: down ? '16.00' : '19.20', compare: down ? '20.00' : '24.00',
        badge: down ? '20% OFF' : '20% OFF', cta: down ? 'Add this offer' : 'Yes, add to my order', decline: 'No thanks', timer: true, time: '04:59',
      } },
      { id: 'guarantee', type: 'guarantee', settings: { title: '30-day money-back guarantee', detail: 'Try it risk free.' } },
    ],
  };
}

function stateFor(state, page) {
  if (!page.bestCheckoutDesign || page.bestCheckoutDesign.sourceVersion !== 2) {
    page.bestCheckoutDesign = initialDesign(page);
    page.bestCheckoutDesign.sourceVersion = 2;
  }
  state.ui.editorSourceState = state.ui.editorSourceState || {};
  const key = page.id;
  if (!state.ui.editorSourceState[key]) state.ui.editorSourceState[key] = { selected: page.bestCheckoutDesign.sections[0]?.id || 'theme', device: 'desktop', mode: 'sections', addOpen: false };
  return page.bestCheckoutDesign;
}

function sectionById(design, sectionId) { return design.sections.find((item) => item.id === sectionId); }
function areaSections(design, area) { return design.sections.filter((item) => (TYPE_META[item.type] || {}).area === area); }
function chooseText(state, meta) { return label(state, meta.en, meta.zh); }

function inputRow(state, title, key, value, type, help) {
  const range = type === 'range'
    ? (key === 'theme.logoWidth' ? ' min="80" max="280" step="4"' : key === 'theme.padding' ? ' min="8" max="80" step="2"' : key === 'theme.sectionGap' ? ' min="8" max="48" step="2"' : key === 'progress' ? ' min="0" max="100" step="5"' : ' min="0" max="100" step="1"')
    : '';
  return '<label class="sce-field"><span>' + esc(title) + '</span><input data-sce-field="' + esc(key) + '" type="' + (type || 'text') + '" value="' + esc(value) + '"' + range + '>' + (help ? '<small>' + esc(help) + '</small>' : '') + '</label>';
}

function selectRow(title, key, value, options) {
  return '<label class="sce-field"><span>' + esc(title) + '</span><select data-sce-field="' + esc(key) + '">' + options.map((option) => '<option value="' + esc(option.value) + '"' + (option.value === value ? ' selected' : '') + '>' + esc(option.label) + '</option>').join('') + '</select></label>';
}

function toggleRow(state, title, key, on, help) {
  return '<button type="button" class="sce-toggle' + (on ? ' is-on' : '') + '" data-sce-toggle="' + esc(key) + '"><i></i><span><b>' + esc(title) + '</b>' + (help ? '<small>' + esc(help) + '</small>' : '') + '</span></button>';
}

function groupHeading(text) { return '<div class="sce-setting-subhead">' + esc(text) + '</div>'; }

function themeSettings(state, theme) {
  const en = state.ui.locale !== 'zh';
  const option = (value, english, chinese) => ({ value, label: en ? english : chinese });
  return '<header class="sce-inspector-head"><span>' + icon('settings', 17) + '</span><div><strong>' + label(state, 'Theme settings', '主题设置') + '</strong><small>' + label(state, 'Checkout-only settings', '仅作用于 Checkout 漏斗') + '</small></div></header><div class="sce-inspector-scroll">' +
    '<p class="sce-info">' + label(state, 'This dedicated theme is separate from the storefront theme. Its values are inherited by Checkout, Thank you, Upsell and Downsell pages.', '这是独立于店铺主题的 Checkout 主题，Checkout、Thank you、Upsell 和 Downsell 页面都会继承这些设置。') + '</p>' +
    groupHeading(label(state, 'Logo', 'Logo')) +
    '<button type="button" class="sce-image-picker" data-sce-image><span>' + icon('products', 17) + '</span><b>' + label(state, 'Select image', '选择图片') + '</b><small>JPG / PNG / WebP / SVG</small></button>' +
    inputRow(state, label(state, 'Logo text', 'Logo 文本'), 'theme.logoText', theme.logoText) +
    inputRow(state, label(state, 'Logo width', 'Logo 宽度'), 'theme.logoWidth', theme.logoWidth, 'range') +
    selectRow(label(state, 'Logo alignment', 'Logo 对齐'), 'theme.logoAlign', theme.logoAlign, [option('left', 'Left', '左对齐'), option('center', 'Center', '居中'), option('right', 'Right', '右对齐')]) +
    groupHeading(label(state, 'Colors', '颜色')) +
    inputRow(state, label(state, 'Accent', '强调色'), 'theme.accent', theme.accent, 'color', label(state, 'Buttons, links and selected states', '按钮、链接与选中状态')) +
    inputRow(state, label(state, 'Form side', '表单区域'), 'theme.formBackground', theme.formBackground, 'color') +
    inputRow(state, label(state, 'Summary side', '订单摘要区域'), 'theme.summaryBackground', theme.summaryBackground, 'color') +
    groupHeading(label(state, 'Layout', '布局')) +
    selectRow(label(state, 'Content width', '内容宽度'), 'theme.contentWidth', theme.contentWidth, [option('compact', 'Compact', '紧凑'), option('comfortable', 'Comfortable', '舒适')]) +
    selectRow(label(state, 'Order summary position', '订单摘要位置'), 'theme.summaryPosition', theme.summaryPosition, [option('right', 'Right', '右侧'), option('left', 'Left', '左侧')]) +
    inputRow(state, label(state, 'Horizontal padding', '水平内边距'), 'theme.padding', theme.padding, 'range') +
    inputRow(state, label(state, 'Vertical spacing', '纵向间距'), 'theme.sectionGap', theme.sectionGap, 'range') +
    '</div>';
}

function sectionSettings(state, section) {
  const s = section.settings;
  const title = sectionName(state, section);
  let fields = '';
  if (section.type === 'urgency') fields = inputRow(state, label(state, 'Message', '文案'), 'message', s.message) + inputRow(state, label(state, 'Time', '时间'), 'time', s.time);
  if (section.type === 'payment') fields =
    toggleRow(state, label(state, 'Show express checkout', '显示快捷支付'), 'showExpress', s.showExpress) +
    (s.showExpress ? toggleRow(state, 'PayPal', 'paypal', s.paypal) + toggleRow(state, 'Apple Pay', 'applePay', s.applePay) + toggleRow(state, 'Google Pay', 'googlePay', s.googlePay) : '') +
    toggleRow(state, label(state, 'Rating line', '评分文案'), 'showRating', s.showRating, label(state, 'Conversion variant', '转化版本可选')) +
    toggleRow(state, label(state, 'Newsletter opt-in', '订阅营销邮件'), 'newsletter', s.newsletter) +
    toggleRow(state, label(state, 'Shipping-insurance bump', '运费险加购'), 'insurance', s.insurance) +
    (s.insurance ? inputRow(state, label(state, 'Insurance title', '运费险标题'), 'insuranceTitle', s.insuranceTitle) + inputRow(state, label(state, 'Insurance price', '运费险价格'), 'insurancePrice', s.insurancePrice) : '');
  if (section.type === 'addon') fields = inputRow(state, label(state, 'Section title', '区块标题'), 'title', s.title) + selectRow(label(state, 'Product source', '商品来源'), 'source', s.source, [{ value: 'collection', label: label(state, 'Collection', '商品集合') }, { value: 'manual', label: label(state, 'Manual product', '手动商品') }, { value: 'recommendation', label: label(state, 'Recommendation', '智能推荐') }]) + inputRow(state, label(state, 'Preview product', '预览商品'), 'name', s.name) + inputRow(state, label(state, 'Price', '价格'), 'price', s.price) + inputRow(state, label(state, 'Compare-at price', '划线价'), 'compare', s.compare);
  if (section.type === 'bundle') fields = inputRow(state, label(state, 'Title', '标题'), 'title', s.title || 'Choose your bundle') + inputRow(state, label(state, 'Offer source', '优惠来源'), 'source', s.source || 'offer rule');
  if (section.type === 'summary') fields = selectRow(label(state, 'Data source', '数据来源'), 'source', s.source, [{ value: 'cart', label: label(state, 'Cart', '购物车') }, { value: 'final', label: label(state, 'Final order snapshot', '最终订单快照') }]) + toggleRow(state, label(state, 'Show coupon', '显示优惠码'), 'coupon', s.coupon, label(state, 'Cart source only', '仅购物车来源可用'));
  if (section.type === 'rating') fields = inputRow(state, label(state, 'Score', '评分'), 'score', s.score) + inputRow(state, label(state, 'Review count', '评价数量'), 'count', s.count);
  if (section.type === 'trust' || section.type === 'guarantee') fields = inputRow(state, label(state, 'Title', '标题'), 'title', s.title) + inputRow(state, label(state, 'Supporting text', '辅助文案'), section.type === 'trust' ? 'badges' : 'detail', section.type === 'trust' ? s.badges : s.detail);
  if (section.type === 'endorsement') fields = inputRow(state, label(state, 'Name', '名称'), 'name', s.name || 'Dr. Lauren Kim') + inputRow(state, label(state, 'Endorsement', '背书文案'), 'quote', s.quote || 'A formula I recommend to my patients.');
  if (section.type === 'confirmation') fields = inputRow(state, label(state, 'Title', '标题'), 'title', s.title) + inputRow(state, label(state, 'Subtitle', '副标题'), 'subtitle', s.subtitle) + inputRow(state, label(state, 'Confirmation number', '确认编号'), 'number', s.number) + selectRow(label(state, 'Shopify write-back', 'Shopify 回写状态'), 'writeback', s.writeback, [{ value: 'Pending', label: label(state, 'Pending', '待回写') }, { value: 'Synced', label: label(state, 'Synced', '已回写') }, { value: 'Failed', label: label(state, 'Failed', '失败') }]);
  if (section.type === 'details') fields = inputRow(state, label(state, 'Contact email', '联系邮箱'), 'email', s.email) + inputRow(state, label(state, 'Shipping method', '配送方式'), 'shipping', s.shipping) + inputRow(state, label(state, 'Payment method', '支付方式'), 'payment', s.payment);
  if (section.type === 'tracking') fields = inputRow(state, label(state, 'Title', '标题'), 'title', s.title) + inputRow(state, label(state, 'Progress', '进度'), 'progress', s.progress, 'range');
  if (section.type === 'postpurchase') fields =
    '<p class="sce-info">' + label(state, 'Product, variant, price and eligibility are resolved from this Funnel’s offer rule at buyer-session runtime. Preview values are a safe fallback only.', '商品、变体、价格和资格由此漏斗的商品规则在买家会话运行时决定；以下仅为安全预览值。') + '</p>' +
    inputRow(state, label(state, 'Tag', '标签'), 'tag', s.tag) + inputRow(state, label(state, 'Heading', '标题'), 'heading', s.heading) + inputRow(state, label(state, 'Subheading', '副标题'), 'sub', s.sub) +
    selectRow(label(state, 'Offer source', '优惠来源'), 'source', s.source, [{ value: 'Dynamic recommendation', label: label(state, 'Dynamic recommendation', '智能推荐') }, { value: 'Manual product', label: label(state, 'Manual product', '手动商品') }, { value: 'Declined-upsell fallback', label: label(state, 'Declined-upsell fallback', 'Upsell 拒绝后的兜底') }]) +
    inputRow(state, label(state, 'Recommendation rule', '推荐规则'), 'rule', s.rule) + inputRow(state, label(state, 'Fallback', '兜底'), 'fallback', s.fallback) +
    toggleRow(state, label(state, 'Countdown', '倒计时'), 'timer', s.timer) + (s.timer ? inputRow(state, label(state, 'Time', '时间'), 'time', s.time) : '') +
    inputRow(state, label(state, 'Preview price', '预览价格'), 'price', s.price) + inputRow(state, label(state, 'Compare-at price', '划线价'), 'compare', s.compare) + inputRow(state, label(state, 'Discount badge', '优惠标签'), 'badge', s.badge) + inputRow(state, label(state, 'Accept button', '接受按钮'), 'cta', s.cta) + inputRow(state, label(state, 'Decline link', '拒绝链接'), 'decline', s.decline);
  return '<header class="sce-inspector-head"><span>' + icon(section.type === 'payment' ? 'card' : 'pages', 17) + '</span><div><strong>' + esc(title) + '</strong><small>' + ((TYPE_META[section.type] || {}).core ? label(state, 'Core checkout step', '核心结账步骤') : label(state, 'Section settings', '区块设置')) + '</small></div></header><div class="sce-inspector-scroll">' + fields + ((TYPE_META[section.type] || {}).core ? '<p class="sce-core-note">' + icon('lock', 13) + label(state, 'The position is locked, but its settings are editable.', '位置已锁定，但仍可修改其设置。') + '</p>' : '<button type="button" class="sce-delete" data-sce-delete="' + esc(section.id) + '">' + label(state, 'Remove section', '删除区块') + '</button>') + '</div>';
}

function previewWrap(section, selected, content) {
  const meta = TYPE_META[section.type] || { en: section.type };
  return '<section class="sce-preview-section' + (selected ? ' is-selected' : '') + '" data-sce-select="' + esc(section.id) + '"><span class="sce-preview-tag">' + esc(meta.en) + '</span>' + content + '</section>';
}

function urgencyPreview(section, selected) {
  const s = section.settings;
  return previewWrap(section, selected, '<div class="sce-urgency"><span>' + esc(s.message) + '</span><b>' + esc(s.time) + '</b></div>');
}

function paymentPreview(section, selected, theme) {
  const s = section.settings;
  const express = s.showExpress ? '<div class="sce-express">' + (s.paypal ? '<b class="paypal">PayPal</b>' : '') + (s.applePay ? '<b class="apple">Apple Pay</b>' : '') + (s.googlePay ? '<b class="gpay">G Pay</b>' : '') + '</div><div class="sce-or">OR</div>' : '';
  const rating = s.showRating ? '<p class="sce-payment-rating">★★★★★ &nbsp; RATED 4.8 STARS BY 45,000+ SATISFIED CUSTOMERS</p>' : '';
  const insurance = s.insurance ? '<div class="sce-insurance"><i>✓</i><span><b>' + esc(s.insuranceTitle) + '</b><small>Receive your order faster · 88% choose this option</small></span><strong>' + esc(s.insurancePrice) + '</strong></div>' : '';
  return previewWrap(section, selected, '<div class="sce-payment">' + express + rating +
    '<div class="sce-checkout-heading"><h3>Contact</h3><a>Sign in</a></div><div class="sce-input">Email</div>' + (s.newsletter ? '<label class="sce-checkline">✓ Keep me up to date with news and exclusive offers</label>' : '') +
    '<h3>Delivery</h3><div class="sce-input">Country / Region &nbsp;&nbsp; United States⌄</div><div class="sce-input-pair"><div>First name</div><div>Last name</div></div><div class="sce-input">Address</div><div class="sce-input-pair"><div>City</div><div>ZIP code</div></div>' +
    '<h3>Shipping method</h3><div class="sce-ship"><span>◉ Basic shipping</span><b>$8.99</b></div><div class="sce-ship"><span>○ VIP shipping</span><b>$12.99</b></div>' + insurance +
    '<h3>Payment</h3><div class="sce-cardbox"><b>◉ &nbsp; Card</b><div>Card number <span>VISA &nbsp; MC</span></div><div class="sce-input-pair"><div>MM / YY</div><div>CVC</div></div></div><button style="background:' + esc(theme.accent) + '">PAY NOW</button><p class="sce-secure">⌑ Secure & encrypted checkout</p></div>');
}

function addonPreview(section, selected) {
  const s = section.settings;
  return previewWrap(section, selected, '<div class="sce-addon"><h3>' + esc(s.title) + '</h3><article><i>✓</i><span class="sce-product-shot"></span><span><b>' + esc(s.name) + '</b><small>Optional add-on · ' + esc(s.source) + '</small></span><strong>' + amount(s.price) + '<s>' + amount(s.compare) + '</s></strong></article></div>');
}

function bundlePreview(section, selected) {
  const s = section.settings;
  return previewWrap(section, selected, '<div class="sce-bundle"><h3>' + esc(s.title || 'Choose your bundle') + '</h3><article>◉ <span><b>Buy 2, get 2 FREE</b><small>4 products · Best seller</small></span><strong>$55.90</strong></article><article>○ <span><b>Buy 3, get 3 FREE</b><small>6 products · Best value</small></span><strong>$69.90</strong></article></div>');
}

function summaryPreview(section, selected) {
  const s = section.settings;
  return previewWrap(section, selected, '<div class="sce-summary"><h3>Order summary</h3><article><span class="sce-product-shot"></span><span><b>Sleep Reset Starter Kit</b><small>Vanilla · Qty 1</small></span><strong>$55.90</strong></article><article><span class="sce-product-shot second"></span><span><b>Nighttime Gummies</b><small>Monthly delivery</small></span><strong>$19.20</strong></article>' + (s.coupon ? '<div class="sce-coupon">Discount code <button>Apply</button></div>' : '') + '<dl><div><dt>Subtotal</dt><dd>$75.10</dd></div><div><dt>Shipping</dt><dd>$8.99</dd></div><div class="total"><dt>Total</dt><dd>USD $84.09</dd></div></dl></div>');
}

function trustPreview(section, selected) {
  const s = section.settings;
  if (section.type === 'rating') return previewWrap(section, selected, '<div class="sce-rating"><b>★★★★★</b><strong>' + esc(s.score) + ' / 5</strong><span>Based on ' + esc(s.count) + ' verified reviews</span></div>');
  if (section.type === 'endorsement') return previewWrap(section, selected, '<div class="sce-endorsement"><span>LK</span><div><b>' + esc(s.name || 'Dr. Lauren Kim') + '</b><p>“' + esc(s.quote || 'A formula I recommend to my patients.') + '”</p></div></div>');
  if (section.type === 'guarantee') return previewWrap(section, selected, '<div class="sce-guarantee"><b>✓</b><span><strong>' + esc(s.title) + '</strong><small>' + esc(s.detail) + '</small></span></div>');
  return previewWrap(section, selected, '<div class="sce-trust"><b>' + esc(s.title) + '</b><span>' + esc(s.badges) + '</span></div>');
}

function confirmationPreview(section, selected, theme) {
  const s = section.settings;
  return previewWrap(section, selected, '<div class="sce-confirm"><i style="color:' + esc(theme.accent) + '">✓</i><h1>' + esc(s.title) + '</h1><p>' + esc(s.subtitle) + '</p><b>' + esc(s.number) + '</b><small>' + label({ ui: { locale: 'en' } }, 'Shopify write-back: ', '') + esc(s.writeback) + '</small></div>');
}

function detailsPreview(section, selected) {
  const s = section.settings;
  return previewWrap(section, selected, '<div class="sce-details"><h3>Order details</h3><div><span>Contact</span><b>' + esc(s.email) + '</b></div><div><span>Shipping method</span><b>' + esc(s.shipping) + '</b></div><div><span>Payment method</span><b>' + esc(s.payment) + '</b></div></div>');
}

function trackingPreview(section, selected, theme) {
  const s = section.settings;
  return previewWrap(section, selected, '<div class="sce-tracking"><h3>' + esc(s.title) + '</h3><div><i style="width:' + Math.max(0, Math.min(100, Number(s.progress || 0))) + '%;background:' + esc(theme.accent) + '"></i></div><span>Order placed</span><span>Shipped</span><span>Out for delivery</span></div>');
}

function offerPreview(section, selected, theme) {
  const s = section.settings;
  return previewWrap(section, selected, '<div class="sce-offer"><em>' + esc(s.tag) + '</em><h1>' + esc(s.heading) + '</h1><p>' + esc(s.sub) + '</p>' + (s.timer ? '<b class="sce-timer">⌚ Offer expires in ' + esc(s.time) + '</b>' : '') + '<div class="sce-offer-runtime"><span><b>Offer source</b>' + esc(s.source) + '</span><span><b>Rule</b>' + esc(s.rule) + '</span><span><b>Fallback</b>' + esc(s.fallback) + '</span></div><article><span class="sce-product-shot large"></span><span><b>Runtime-selected product</b><small>Preview product only</small><strong>' + amount(s.price) + ' <s>' + amount(s.compare) + '</s> <em>' + esc(s.badge) + '</em></strong></span></article><button style="background:' + esc(theme.accent) + '">' + esc(s.cta) + '</button><a>' + esc(s.decline) + '</a></div>');
}

function previewSection(section, selected, theme) {
  if (section.type === 'urgency') return urgencyPreview(section, selected);
  if (section.type === 'payment') return paymentPreview(section, selected, theme);
  if (section.type === 'addon') return addonPreview(section, selected);
  if (section.type === 'bundle') return bundlePreview(section, selected);
  if (section.type === 'summary') return summaryPreview(section, selected);
  if (['rating', 'trust', 'guarantee', 'endorsement'].includes(section.type)) return trustPreview(section, selected);
  if (section.type === 'confirmation') return confirmationPreview(section, selected, theme);
  if (section.type === 'details') return detailsPreview(section, selected);
  if (section.type === 'tracking') return trackingPreview(section, selected, theme);
  if (section.type === 'postpurchase') return offerPreview(section, selected, theme);
  return '';
}

function checkoutPreview(state, design, editor) {
  const theme = design.theme;
  const desktop = editor.device === 'desktop';
  const mobile = !desktop;
  const main = areaSections(design, 'main').map((section) => previewSection(section, editor.selected === section.id, theme)).join('');
  const side = areaSections(design, 'summary').map((section) => previewSection(section, editor.selected === section.id, theme)).join('');
  let content;
  if (design.type === 'checkout') {
    const cols = '<div class="sce-checkout-columns' + (theme.summaryPosition === 'left' ? ' is-left' : '') + '"><main>' + main + '</main><aside>' + side + '</aside></div>';
    content = cols;
  } else if (design.type === 'thank-you') content = '<main class="sce-single-page">' + main + side + '</main>';
  else content = '<main class="sce-offer-page">' + main + side + '</main>';
  const padding = mobile ? Math.min(20, Number(theme.padding || 40)) : Number(theme.padding || 40);
  return '<div class="sce-preview-frame' + (mobile ? ' is-mobile' : '') + '" style="--sce-accent:' + esc(theme.accent) + ';--sce-form:' + esc(theme.formBackground) + ';--sce-summary:' + esc(theme.summaryBackground) + ';--sce-pad:' + padding + 'px;--sce-gap:' + Number(theme.sectionGap || 18) + 'px"><header class="sce-brandbar ' + esc(theme.logoAlign) + '"><b style="font-size:' + Math.max(20, Number(theme.logoWidth || 150) * .19) + 'px">' + esc(theme.logoText || 'AURA') + '</b><span>⌑ ' + label(state, 'Secure checkout', '安全结账') + '</span></header>' + content + '<footer class="sce-preview-footer">Refund policy &nbsp; Shipping policy &nbsp; Privacy &nbsp; Terms</footer></div>';
}

function treeRow(state, section, selected) {
  const meta = TYPE_META[section.type] || {};
  return '<button type="button" class="sce-tree-row' + (selected ? ' is-selected' : '') + '" data-sce-select="' + esc(section.id) + '"><span>' + icon(section.type === 'payment' ? 'card' : section.type === 'summary' ? 'orders' : 'pages', 15) + '</span><b>' + esc(sectionName(state, section)) + '</b>' + (meta.core ? '<em title="' + esc(label(state, 'Core checkout step', '核心结账步骤')) + '">' + icon('lock', 12) + '</em>' : '<i>' + icon('more', 14) + '</i>') + '</button>';
}

function treeGroup(state, design, editor, title, area) {
  const rows = areaSections(design, area).map((section) => treeRow(state, section, editor.selected === section.id)).join('');
  return '<section class="sce-tree-group"><h3>' + esc(title) + '</h3>' + rows + '</section>';
}

function addMenu(state, design, editor) {
  if (!editor.addOpen) return '<button type="button" class="sce-add-section" data-sce-add-open>' + icon('plus', 15) + label(state, 'Add section', '添加区块') + '</button>';
  const current = new Set(design.sections.map((section) => section.type));
  const allowed = Object.keys(TYPE_META).filter((type) => !TYPE_META[type].core && !current.has(type) && !['confirmation', 'details', 'tracking', 'postpurchase'].includes(type));
  return '<div class="sce-add-menu"><header><b>' + label(state, 'Add section', '添加区块') + '</b><button type="button" data-sce-add-close>' + icon('close', 15) + '</button></header>' + allowed.map((type) => '<button type="button" data-sce-add="' + type + '"><span>' + icon('plus', 13) + '</span><b>' + esc(chooseText(state, TYPE_META[type])) + '</b><small>' + (TYPE_META[type].area === 'summary' ? label(state, 'Order summary column', '订单摘要栏') : label(state, 'Main column', '主栏')) + '</small></button>').join('') + '</div>';
}

function treePanel(state, design, editor) {
  const template = pageTypeName(state, design.type) + ' · ' + presetName(state, design.preset);
  const usedBy = state.pages.find((page) => page.id === editor.pageId)?.usedBy || 0;
  const header = '<section class="sce-template-card"><b>' + esc(template) + '</b><small>' + (usedBy ? label(state, 'Used by ' + usedBy + ' Funnel nodes', '被 ' + usedBy + ' 个漏斗节点使用') : label(state, 'Not used by a Funnel yet', '尚未被漏斗使用')) + '</small><button type="button" data-sce-preview>' + icon('play', 14) + label(state, 'Preview', '预览') + '</button></section>';
  const groups = '<section class="sce-tree-group"><h3>' + label(state, 'Header', '页头') + '</h3><button type="button" class="sce-tree-row' + (editor.selected === 'theme' ? ' is-selected' : '') + '" data-sce-theme><span>' + icon('settings', 15) + '</span><b>' + label(state, 'Logo & checkout theme', 'Logo 与 Checkout 主题') + '</b><em>' + icon('lock', 12) + '</em></button></section>' +
    treeGroup(state, design, editor, label(state, 'Main', '主栏'), 'main') +
    (areaSections(design, 'summary').length ? treeGroup(state, design, editor, label(state, 'Order summary', '订单摘要'), 'summary') : '') +
    '<section class="sce-tree-group"><h3>' + label(state, 'Footer', '页脚') + '</h3><button type="button" class="sce-tree-row" data-sce-theme><span>' + icon('lock', 15) + '</span><b>' + label(state, 'Policy links', '政策链接') + '</b><em>' + icon('lock', 12) + '</em></button></section>';
  return '<aside class="sce-tree"><header><strong>' + label(state, 'Sections', '区块') + '</strong><small>' + label(state, 'Customize this Checkout page', '装修当前 Checkout 页面') + '</small></header><div class="sce-tree-scroll">' + header + groups + addMenu(state, design, editor) + '</div></aside>';
}

function settingsNav(state, editor) {
  const fields = [
    [label(state, 'Logo', 'Logo'), 'logo'], [label(state, 'Colors', '颜色'), 'colors'], [label(state, 'Layout', '布局'), 'layout'],
  ].map((item) => '<button type="button" data-sce-theme>' + icon('settings', 14) + '<span>' + esc(item[0]) + '</span></button>').join('');
  return '<aside class="sce-tree sce-settings-nav"><header><strong>' + label(state, 'Theme settings', '主题设置') + '</strong><small>' + label(state, 'Checkout funnel only', '仅 Checkout 漏斗') + '</small></header><div class="sce-tree-scroll"><p class="sce-nav-note">' + label(state, 'Edit global Checkout tokens on the right. They update all checkout-family pages live.', '在右侧编辑全局 Checkout Token，实时作用于所有 Checkout 系列页面。') + '</p>' + fields + '</div></aside>';
}

function editorMarkup(state, design, editor) {
  const selected = editor.selected === 'theme' ? null : sectionById(design, editor.selected);
  const status = state.ui.editorDirty ? label(state, 'Unsaved changes', '尚未保存的修改') : label(state, 'All changes saved', '所有修改已保存');
  const typeName = pageTypeName(state, design.type);
  const body = editor.mode === 'settings' ? settingsNav(state, editor) : treePanel(state, design, editor);
  return '<div class="source-checkout-editor" data-i18n-skip><header class="sce-topbar"><div class="sce-top-left"><button type="button" class="sce-icon-button" data-sce-back title="' + esc(label(state, 'Back', '返回')) + '">' + icon('back', 18) + '</button><div class="sce-rail"><button type="button" class="sce-icon-button' + (editor.mode === 'sections' ? ' is-active' : '') + '" data-sce-mode="sections" title="' + esc(label(state, 'Sections', '区块')) + '">' + icon('products', 16) + '</button><button type="button" class="sce-icon-button' + (editor.mode === 'settings' ? ' is-active' : '') + '" data-sce-mode="settings" title="' + esc(label(state, 'Theme settings', '主题设置')) + '">' + icon('settings', 16) + '</button></div><div class="sce-title"><strong>' + esc(design.theme.logoText || 'AURA') + ' · ' + label(state, 'Draft', '草稿') + '</strong><span>' + icon('check', 13) + esc(status) + '</span></div></div><div class="sce-top-center"><button type="button" class="sce-page-picker"><span>' + esc(typeName + ' · ' + design.preset) + '</span>' + icon('chevron', 14) + '</button><div class="sce-device"><button type="button" class="' + (editor.device === 'desktop' ? ' is-active' : '') + '" data-sce-device="desktop" title="' + esc(label(state, 'Desktop', '桌面端')) + '">' + icon('desktop', 16) + '</button><button type="button" class="' + (editor.device === 'mobile' ? ' is-active' : '') + '" data-sce-device="mobile" title="' + esc(label(state, 'Mobile', '移动端')) + '">' + icon('mobile', 16) + '</button></div></div><div class="sce-top-right"><button type="button" class="sce-button" data-sce-discard>' + label(state, 'Discard', '放弃修改') + '</button><button type="button" class="sce-button" data-sce-save>' + label(state, 'Save', '保存') + '</button><button type="button" class="sce-button primary" data-sce-publish>' + label(state, 'Publish', '发布') + '</button></div></header><div class="sce-workspace">' + body + '<main class="sce-canvas"><header><span>' + label(state, 'Live preview', '实时预览') + ' · ' + esc(typeName) + ' · ' + label(state, editor.device === 'desktop' ? 'Desktop' : 'Mobile', editor.device === 'desktop' ? '桌面端' : '移动端') + '</span></header><div class="sce-canvas-notice">' + icon('alert', 15) + '<span>' + (selected && (TYPE_META[selected.type] || {}).core ? label(state, 'Core checkout step. Its position is locked; its settings remain editable.', '核心结账步骤：位置锁定，设置仍可编辑。') : label(state, 'Select a section to edit it.', '选择一个区块进行编辑。')) + '</span></div><div class="sce-canvas-scroll">' + checkoutPreview(state, design, editor) + '</div></main><aside class="sce-inspector">' + (editor.selected === 'theme' ? themeSettings(state, design.theme) : selected ? sectionSettings(state, selected) : themeSettings(state, design.theme)) + '</aside></div></div>';
}

function readPath(target, path) {
  const parts = path.split('.');
  let cursor = target;
  if (parts[0] === 'theme') { cursor = target.theme; parts.shift(); }
  for (let index = 0; index < parts.length - 1; index += 1) cursor = cursor[parts[index]];
  return { object: cursor, key: parts[parts.length - 1] };
}

function addSection(design, type) {
  const defaults = {
    urgency: { style: 'reserve', message: 'Your order is reserved for:', time: '02:45' },
    addon: { title: 'Recommended with your order', source: 'collection', name: 'Recommended item', price: '19.20', compare: '24.00' },
    bundle: { title: 'Choose your bundle', source: 'offer rule' },
    endorsement: { name: 'Dr. Lauren Kim', quote: 'A formula I recommend to my patients.' },
    rating: { score: '4.8', count: '45,000+' },
    trust: { title: 'Trusted quality', badges: 'GMP · Made in USA · FDA registered' },
    guarantee: { title: '30-day money-back guarantee', detail: 'Try it risk free.' },
  };
  design.sections.push({ id: id(type), type, settings: clone(defaults[type] || {}) });
}

function mountEditor(root, state, route, actions) {
  const context = contextFor(state, route);
  const host = root.querySelector('#bc-design-editor');
  if (!context || !host) return;
  const design = stateFor(state, context.page);
  const editor = state.ui.editorSourceState[context.page.id];
  editor.pageId = context.page.id;
  const paint = () => { host.innerHTML = editorMarkup(state, design, editor); };
  const dirty = () => { state.ui.editorDirty = true; };
  const save = () => {
    context.page.revisionSequence = (context.page.revisionSequence || 0) + 1;
    context.page.draftRevision = (context.page.draftRevision || 0) + 1;
    context.page.draftRevisionId = 'rev_' + context.page.id + '_' + context.page.draftRevision;
    context.page.updated = 'Just now';
    state.ui.editorDirty = false;
    actions.showToast(label(state, 'Draft saved. Your published page is unchanged.', '草稿已保存，已发布页面不受影响。'));
    paint();
  };
  paint();
  host.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.sceBack !== undefined) { actions.setRoute(context.back); return; }
    if (button.dataset.sceMode) { editor.mode = button.dataset.sceMode; if (editor.mode === 'settings') editor.selected = 'theme'; paint(); return; }
    if (button.dataset.sceTheme !== undefined) { editor.mode = 'settings'; editor.selected = 'theme'; paint(); return; }
    if (button.dataset.sceDevice) { editor.device = button.dataset.sceDevice; paint(); return; }
    if (button.dataset.sceSelect) { editor.mode = 'sections'; editor.selected = button.dataset.sceSelect; paint(); return; }
    if (button.dataset.sceAddOpen !== undefined) { editor.addOpen = true; paint(); return; }
    if (button.dataset.sceAddClose !== undefined) { editor.addOpen = false; paint(); return; }
    if (button.dataset.sceAdd) { addSection(design, button.dataset.sceAdd); editor.selected = design.sections[design.sections.length - 1].id; editor.addOpen = false; dirty(); paint(); return; }
    if (button.dataset.sceDelete) { design.sections = design.sections.filter((section) => section.id !== button.dataset.sceDelete); editor.selected = design.sections[0]?.id || 'theme'; dirty(); paint(); return; }
    if (button.dataset.sceToggle) {
      const section = sectionById(design, editor.selected); if (!section) return;
      const found = readPath(section.settings, button.dataset.sceToggle); found.object[found.key] = !found.object[found.key]; dirty(); paint(); return;
    }
    if (button.dataset.sceImage !== undefined) { actions.showToast(label(state, 'The production image picker opens your asset library. This prototype keeps the original field and fallback behavior.', '生产环境会打开素材库；此原型保留原始字段和兜底逻辑。'), 'info'); return; }
    if (button.dataset.sceDiscard !== undefined) { context.page.bestCheckoutDesign = initialDesign(context.page); context.page.bestCheckoutDesign.sourceVersion = 2; state.ui.editorSourceState[context.page.id] = { selected: context.page.bestCheckoutDesign.sections[0]?.id || 'theme', device: editor.device, mode: 'sections', addOpen: false, pageId: context.page.id }; state.ui.editorDirty = false; actions.showToast(label(state, 'Draft changes discarded.', '已放弃草稿修改。')); actions.renderShell(); return; }
    if (button.dataset.sceSave !== undefined) { save(); return; }
    if (button.dataset.scePublish !== undefined) {
      if (state.ui.editorDirty) { actions.showToast(label(state, 'Save the draft before publishing.', '请先保存草稿再发布。'), 'info'); return; }
      context.page.version = Math.max(1, (context.page.version || 0) + 1);
      context.page.publishedVersionId = 'page_' + context.page.id + '_v' + context.page.version;
      context.page.status = 'Published';
      actions.showToast(label(state, 'Page published. Funnels keep their pinned version until republished.', '页面已发布；漏斗会继续使用当前固定版本，重新发布漏斗后才更新。'));
      paint();
      return;
    }
    if (button.dataset.scePreview !== undefined) actions.showToast(label(state, 'Preview uses the current draft in a safe test session.', '预览会在安全测试会话中使用当前草稿。'), 'info');
  });
  host.addEventListener('input', (event) => {
    const control = event.target.closest('[data-sce-field]');
    if (!control) return;
    const section = editor.selected === 'theme' ? { settings: design } : sectionById(design, editor.selected);
    if (!section) return;
    const target = editor.selected === 'theme' ? design : section.settings;
    const found = readPath(target, control.dataset.sceField);
    found.object[found.key] = control.type === 'range' || control.type === 'number' ? Number(control.value) : control.value;
    dirty();
    const canvas = host.querySelector('.sce-canvas-scroll');
    if (canvas) canvas.innerHTML = checkoutPreview(state, design, editor);
  });
  host.addEventListener('change', (event) => {
    const control = event.target.closest('[data-sce-field]');
    if (!control || control.tagName !== 'SELECT') return;
    const section = editor.selected === 'theme' ? { settings: design } : sectionById(design, editor.selected);
    if (!section) return;
    const target = editor.selected === 'theme' ? design : section.settings;
    const found = readPath(target, control.dataset.sceField); found.object[found.key] = control.value; dirty(); paint();
  });
}

export function renderEditor(state, route) {
  return contextFor(state, route) ? '<div class="source-editor-shell" id="bc-design-editor" aria-label="BestCheckout page designer"></div>' : '<div class="not-found"><strong>Page not found</strong></div>';
}

export { mountEditor };
