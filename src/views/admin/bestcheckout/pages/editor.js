import { icon } from '../components/common.js';
import { escapeHtml } from '../utils.js';

/*
 * BestCheckout's embedded Checkout editor.  The source checkout surface is kept
 * independent from the storefront: a required payment skeleton is locked while
 * merchandising and trust modules can be configured in safe insertion zones.
 */

const PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=160&q=80',
];

const SECTION_META = {
  'checkout-header': { name: 'Header', icon: 'pages', region: 'header', locked: true, configurable: true },
  'checkout-order-summary-bar': { name: 'Order summary (Mobile)', icon: 'orders', region: 'main', locked: true },
  'checkout-express': { name: 'Express checkout', icon: 'card', region: 'main', locked: true },
  'checkout-contact': { name: 'Contact', icon: 'user', region: 'main', locked: true },
  'checkout-product-upsell': { name: 'Customers Also Grabbed', icon: 'products', region: 'contact', addable: true },
  'checkout-shipping-info': { name: 'Delivery', icon: 'layers', region: 'main', locked: true },
  'checkout-shipping-method': { name: 'Shipping method', icon: 'layers', region: 'main', locked: true },
  'checkout-shipping-insurance': { name: 'Shipping Insurance', icon: 'shield', region: 'shipping', addable: true },
  'checkout-payment': { name: 'Payment', icon: 'lock', region: 'main', locked: true },
  'checkout-vip-club': { name: 'Welcome to the VIP club', icon: 'star', region: 'payment', addable: true },
  'checkout-cta': { name: 'CTA', icon: 'lock', region: 'main', locked: true },
  'checkout-order-summary': { name: 'Order summary', icon: 'orders', region: 'summary', locked: true, blocks: true },
  'checkout-policy-links': { name: 'Policy Links', icon: 'pages', region: 'footer', locked: true },
  'checkout-countdown': { name: 'Countdown', icon: 'alert', region: 'main', addable: true },
  'checkout-trust-badges': { name: 'Trust badges', icon: 'shield', region: 'main', addable: true },
  'checkout-trustpilot': { name: 'Trustpilot Review', icon: 'star', region: 'summary', addable: true },
  'checkout-review-card': { name: 'Review card', icon: 'user', region: 'summary', addable: true },
  'checkout-payment-icons': { name: 'Payment Icons', icon: 'card', region: 'summary', addable: true },
  'checkout-static-content': { name: 'Static content', icon: 'pages', region: 'main', addable: true },
  'checkout-fb-comments': { name: 'Facebook-style Comments', icon: 'comment', region: 'summary', addable: true },
  'checkout-testimonials': { name: 'Testimonials', icon: 'star', region: 'footer', addable: true },
  'checkout-footer': { name: 'Footer', icon: 'pages', region: 'footer', addable: true },
  'announcement-bar': { name: 'Announcement Bar', icon: 'alert', region: 'announce', addable: true },
};

const BLOCKS = ['Cart Lines', 'Coupon', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total'];
const CATALOG = [
  { title: 'Commerce boosters', types: ['checkout-product-upsell', 'checkout-shipping-insurance', 'checkout-vip-club'] },
  { title: 'Reviews & social proof', types: ['checkout-trustpilot', 'checkout-review-card', 'checkout-fb-comments', 'checkout-testimonials'] },
  { title: 'Trust & security', types: ['checkout-trust-badges', 'checkout-payment-icons'] },
  { title: 'Promotion & urgency', types: ['announcement-bar', 'checkout-countdown'] },
  { title: 'Content & structure', types: ['checkout-static-content', 'checkout-footer'] },
];
const SETTINGS_GROUPS = [
  { key: 'main', name: 'Main', description: 'Page, content & summary surfaces', fields: [['Page background', 'page_background', 'color'], ['Text color', 'text_color', 'color'], ['Muted text', 'muted_text_color', 'color'], ['Divider', 'divider_color', 'color']] },
  { key: 'header', name: 'Header', description: 'Brand bar at the top', fields: [['Header background', 'header_background', 'color'], ['Header text', 'header_text_color', 'color'], ['Header accent', 'header_accent_color', 'color'], ['Header height · PC', 'header_height_pc', 'range'], ['Header height · Mobile', 'header_height_mobile', 'range'], ['Bottom divider', 'header_divider', 'toggle']] },
  { key: 'order_summary', name: 'Order Summary', description: 'Right-hand summary surface', fields: [['Background', 'summary_background', 'color'], ['Text', 'summary_text', 'color'], ['Muted text', 'summary_muted_text', 'color']] },
  { key: 'accent', name: 'Accent and buttons', description: 'Primary action & accent color', fields: [['Accent color', 'accent_color', 'color'], ['Button background', 'button_background', 'color'], ['Button text color', 'button_text_color', 'color'], ['Button radius', 'button_border_radius', 'range'], ['Button height', 'button_height', 'range']] },
  { key: 'input', name: 'Input fields', description: 'Form inputs across checkout', fields: [['Background', 'input_background', 'color'], ['Placeholder', 'placeholder_color', 'color'], ['Border', 'input_border_color', 'color'], ['Corner radius', 'input_border_radius', 'range'], ['Input height', 'input_height', 'range']] },
  { key: 'typography', name: 'Typography', description: 'Fonts and sizes', fields: [['Base font size', 'base_font_size', 'range'], ['Heading font size', 'heading_font_size', 'range'], ['Small font size', 'small_font_size', 'range']] },
  { key: 'layout', name: 'Layout', description: 'Width, columns and spacing', fields: [['Max width · PC', 'page_max_width_pc', 'range'], ['Column gap', 'column_gap', 'range'], ['Section spacing', 'section_spacing', 'range'], ['Mobile page padding', 'mobile_page_padding', 'range']] },
];

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

function esc(value) { return escapeHtml(value == null ? '' : String(value)); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function id(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 8); }
function label(state, english, chinese) { return state.ui.locale === 'zh' ? chinese : english; }
function sectionMeta(section) { return SECTION_META[section.kind] || { name: section.kind, icon: 'pages', region: 'main' }; }
function sectionName(state, section) { const name = sectionMeta(section).name; return state.ui.locale === 'zh' ? ({ Header: '页头', Contact: '联系方式', Delivery: '配送信息', Payment: '支付方式', CTA: '支付按钮', 'Order summary': '订单摘要', 'Policy Links': '政策链接' }[name] || name) : name; }
function typeName(state, type) { return ({ checkout: label(state, 'Checkout', '结账页'), 'thank-you': label(state, 'Thank you', '感谢页'), upsell: label(state, 'Upsell', '加购页'), downsell: label(state, 'Downsell', '降级加购页') }[type] || type); }

function defaultTheme() {
  return {
    logo_text: 'AURA', logo_width_pc: 120, logo_width_mobile: 100, logo_alignment: 'left', show_trust: true, trust_text: 'Secure checkout', show_secure_badge: false, show_contact: false, show_cart: true,
    page_background: '#FFFFFF', text_color: '#1F1F1F', muted_text_color: '#777777', divider_color: '#E5E5E5', header_background: '#FFFFFF', header_text_color: '#1F1F1F', header_accent_color: '#121212', header_height_pc: 64, header_height_mobile: 56, header_divider: true,
    summary_background: '#F5F5F5', summary_text: '#1F1F1F', summary_muted_text: '#777777', accent_color: '#121212', button_background: '#121212', button_text_color: '#FFFFFF', button_border_radius: 6, button_height: 52,
    input_background: '#FFFFFF', placeholder_color: '#B5B5B5', input_border_color: '#D9D9D9', input_border_radius: 6, input_height: 48, base_font_size: 14, heading_font_size: 18, small_font_size: 12, page_max_width_pc: 980, column_gap: 40, section_spacing: 24, mobile_page_padding: 18,
  };
}

function required(kind, extra) { return Object.assign({ id: id('ck'), kind }, extra || {}); }
function initialDesign(page) {
  const orderSummary = required('checkout-order-summary', { expanded: true, blocks: BLOCKS.map((name) => ({ id: id('block'), name, locked: true })) });
  return {
    sourceVersion: 3, type: page.type, templateName: page.type === 'checkout' ? 'Standard' : typeName({ ui: { locale: 'en' } }, page.type), theme: defaultTheme(),
    sections: [
      required('checkout-header'), required('checkout-order-summary-bar'), required('checkout-express'), required('checkout-contact'),
      { id: id('upsell'), kind: 'checkout-product-upsell', zone: 'contact', settings: { title: 'Customers Also Grabbed', product: 'Editorial shell dress', price: '41.50', compare: '58.00' } },
      required('checkout-shipping-info'), required('checkout-shipping-method'), { id: id('insurance'), kind: 'checkout-shipping-insurance', zone: 'shipping', settings: { title: 'Shipping Insurance', note: 'Protect your delivery for $2.95' } },
      required('checkout-payment'), { id: id('vip'), kind: 'checkout-vip-club', zone: 'payment', settings: { title: 'Welcome to the VIP club', price: '3.95' } }, required('checkout-cta'), orderSummary, required('checkout-policy-links'),
    ],
  };
}

function stateFor(state, page) {
  if (!page.bestCheckoutDesign || page.bestCheckoutDesign.sourceVersion !== 3) {
    page.bestCheckoutDesign = initialDesign(page);
    page.bestCheckoutSavedDraft = clone(page.bestCheckoutDesign);
  }
  if (!page.bestCheckoutSavedDraft || page.bestCheckoutSavedDraft.sourceVersion !== 3) page.bestCheckoutSavedDraft = clone(page.bestCheckoutDesign);
  state.ui.checkoutEditor = state.ui.checkoutEditor || {};
  if (!state.ui.checkoutEditor[page.id]) state.ui.checkoutEditor[page.id] = { pageId: page.id, selected: page.bestCheckoutDesign.sections[0].id, mode: 'sections', device: 'desktop', addOpen: false, settingsOpen: { main: true, header: true }, treeOpen: { summary: true } };
  return page.bestCheckoutDesign;
}

function byId(design, sectionId) { return design.sections.find((item) => item.id === sectionId); }
function settingsField(title, key, value, type) {
  if (type === 'toggle') return '<button type="button" class="sce-switch' + (value ? ' is-on' : '') + '" data-sce-theme-toggle="' + esc(key) + '"><i></i><span>' + esc(title) + '</span></button>';
  const isRange = type === 'range';
  const max = key.indexOf('width') >= 0 || key === 'page_max_width_pc' ? 1280 : key.indexOf('height') >= 0 ? 120 : key.indexOf('spacing') >= 0 || key.indexOf('gap') >= 0 ? 80 : key.indexOf('size') >= 0 ? 28 : 40;
  const min = key === 'page_max_width_pc' ? 900 : key.indexOf('height') >= 0 ? 40 : key.indexOf('spacing') >= 0 || key.indexOf('gap') >= 0 ? 12 : key.indexOf('size') >= 0 ? 10 : 0;
  const control = isRange
    ? '<div class="sce-range"><input data-sce-theme-field="' + esc(key) + '" type="range" min="' + min + '" max="' + max + '" value="' + esc(value) + '"><output>' + esc(value) + (key.indexOf('size') >= 0 || key.indexOf('height') >= 0 || key.indexOf('width') >= 0 || key.indexOf('gap') >= 0 || key.indexOf('spacing') >= 0 ? 'px' : '') + '</output></div>'
    : '<div class="sce-color"><i style="background:' + esc(value) + '"></i><input data-sce-theme-field="' + esc(key) + '" type="text" value="' + esc(value) + '"></div>';
  return '<label class="sce-ref-field"><span>' + esc(title) + '</span>' + control + '</label>';
}

function settingsPanel(state, design, editor) {
  const theme = design.theme;
  const groups = SETTINGS_GROUPS.map((group) => {
    const open = !!editor.settingsOpen[group.key];
    return '<section class="sce-ref-setting-group' + (open ? ' is-open' : '') + '"><button type="button" class="sce-ref-setting-title" data-sce-settings-group="' + group.key + '"><i>' + icon('chevron', 14) + '</i><span><b>' + esc(group.name) + '</b><small>' + esc(group.description) + '</small></span><em>' + group.fields.length + ' fields</em></button><div class="sce-ref-setting-content">' + group.fields.map((field) => settingsField(field[0], field[1], theme[field[1]], field[2])).join('') + '</div></section>';
  }).join('');
  return '<header class="sce-inspector-head"><span>' + icon('settings', 17) + '</span><div><strong>' + label(state, 'Checkout settings', 'Checkout 设置') + '</strong><small>' + label(state, 'Checkout / Thank you global styles', 'Checkout / Thank you 全局样式') + '</small></div><button class="sce-expand-all" data-sce-expand-all>' + label(state, 'Expand all', '展开全部') + '</button></header><div class="sce-inspector-scroll sce-ref-inspector">' + groups + '</div>';
}

function headerPanel(state, design) {
  const t = design.theme;
  const select = '<select data-sce-theme-field="logo_alignment"><option value="left"' + (t.logo_alignment === 'left' ? ' selected' : '') + '>Left</option><option value="center"' + (t.logo_alignment === 'center' ? ' selected' : '') + '>Center</option><option value="right"' + (t.logo_alignment === 'right' ? ' selected' : '') + '>Right</option></select>';
  return '<header class="sce-inspector-head"><span>' + icon('pages', 17) + '</span><div><strong>Header</strong><small>Header</small></div><em class="sce-lock-icon">' + icon('lock', 13) + '</em></header><div class="sce-inspector-scroll sce-ref-inspector"><div class="sce-ref-kicker">LOGO</div><label class="sce-ref-field"><span>Logo image</span><button type="button" class="sce-ref-image-picker" data-sce-image>' + icon('products', 18) + '<b>Select image</b><small>drag & drop supported</small></button></label>' + settingsField('Logo width · PC', 'logo_width_pc', t.logo_width_pc, 'range') + settingsField('Logo width · Mobile', 'logo_width_mobile', t.logo_width_mobile, 'range') + '<label class="sce-ref-field"><span>Logo alignment</span>' + select + '<small>The structural axis of the header. Left / Right anchor the logo to a side; Center pins it to the middle.</small></label><div class="sce-ref-kicker">TRUST MESSAGE</div>' + settingsField('Show trust message', 'show_trust', t.show_trust, 'toggle') + '<label class="sce-ref-field"><span>Text</span><input data-sce-theme-field="trust_text" value="' + esc(t.trust_text) + '"></label><div class="sce-ref-kicker">SECURE BADGE</div>' + settingsField('Show secure badge', 'show_secure_badge', t.show_secure_badge, 'toggle') + '<div class="sce-ref-kicker">CONTACT</div>' + settingsField('Show contact', 'show_contact', t.show_contact, 'toggle') + '<div class="sce-ref-kicker">CART</div>' + settingsField('Show cart icon', 'show_cart', t.show_cart, 'toggle') + '</div>';
}

function addonPanel(state, section) {
  const s = section.settings || {};
  return '<header class="sce-inspector-head"><span>' + icon(sectionMeta(section).icon, 17) + '</span><div><strong>' + esc(sectionName(state, section)) + '</strong><small>Section settings</small></div></header><div class="sce-inspector-scroll sce-ref-inspector"><div class="sce-ref-kicker">CONTENT</div><label class="sce-ref-field"><span>Section title</span><input data-sce-section-field="title" value="' + esc(s.title || '') + '"></label><label class="sce-ref-field"><span>Preview product</span><input data-sce-section-field="product" value="' + esc(s.product || 'Recommended item') + '"></label><label class="sce-ref-field"><span>Price</span><input data-sce-section-field="price" value="' + esc(s.price || '') + '"></label><p class="sce-info">This is a safe preview value. At checkout, eligible products, prices and availability are resolved from this Funnel&rsquo;s rule.</p><button type="button" class="sce-delete" data-sce-delete="' + esc(section.id) + '">Remove section</button></div>';
}

function lockedPanel(state, section) {
  const meta = sectionMeta(section);
  return '<header class="sce-inspector-head"><span>' + icon(meta.icon, 17) + '</span><div><strong>' + esc(sectionName(state, section)) + '</strong><small>Required checkout component</small></div><em class="sce-lock-icon">' + icon('lock', 13) + '</em></header><div class="sce-inspector-scroll sce-ref-inspector"><p class="sce-info">This component is required for a complete and compliant checkout. Its position and order are locked.</p>' + (section.kind === 'checkout-order-summary' ? '<p class="sce-core-note">Cart lines, coupon, totals and policy links are derived from the checkout session and cannot be changed here.</p>' : '<p class="sce-core-note">Use Checkout settings for visual tokens. Add-ons can be placed in the safe zones shown in the section tree.</p>') + '</div>';
}

function inspector(state, design, editor) {
  if (editor.mode === 'settings') return settingsPanel(state, design, editor);
  const selected = byId(design, editor.selected);
  if (!selected) return settingsPanel(state, design, editor);
  if (selected.kind === 'checkout-header') return headerPanel(state, design);
  return sectionMeta(selected).addable ? addonPanel(state, selected) : lockedPanel(state, selected);
}

function treeRow(state, section, editor) {
  const meta = sectionMeta(section); const active = editor.selected === section.id; const open = section.kind !== 'checkout-order-summary' || editor.treeOpen.summary !== false;
  const blocks = meta.blocks && open ? (section.blocks || []).map((block) => '<button type="button" class="sce-ref-tree-row sce-ref-block" data-sce-select="' + esc(section.id) + '"><span>' + icon('layers', 14) + '</span><b>' + esc(block.name) + '</b><em>' + icon('lock', 12) + '</em></button>').join('') : '';
  const caret = meta.blocks ? '<i class="sce-tree-caret' + (open ? ' is-open' : '') + '" data-sce-tree-toggle="summary">' + icon('chevron', 14) + '</i>' : '<i></i>';
  const actions = meta.addable ? '<em class="sce-ref-row-actions"><button type="button" data-sce-hide="' + esc(section.id) + '" title="' + (section.hidden ? 'Show' : 'Hide') + '">' + (section.hidden ? '◉' : '◌') + '</button><span>⠿</span></em>' : '<em>' + icon('lock', 12) + '</em>';
  return '<div class="sce-ref-tree-wrap' + (section.hidden ? ' is-hidden' : '') + '"><button type="button" class="sce-ref-tree-row' + (active ? ' is-selected' : '') + (meta.locked ? ' is-locked' : '') + '" data-sce-select="' + esc(section.id) + '">' + caret + '<span>' + icon(meta.icon, 15) + '</span><b>' + esc(sectionName(state, section)) + '</b>' + actions + '</button>' + blocks + '</div>';
}

function sectionsTree(state, design, editor) {
  const page = state.pages.find((item) => item.id === editor.pageId); const usage = page && page.usedBy ? 'Used by ' + page.usedBy + ' nodes in Funnel' : 'Not used by a Funnel yet';
  const rows = design.sections.map((section) => treeRow(state, section, editor)).join('');
  const total = CATALOG.reduce((sum, group) => sum + group.types.length, 0);
  const add = editor.addOpen ? addMenu(state) : '<button type="button" class="sce-add-section" data-sce-add-open>' + icon('plus', 15) + ' Add section <span>(' + total + ')</span></button>';
  return '<aside class="sce-tree sce-ref-tree"><header><strong>Checkout</strong></header><div class="sce-tree-scroll"><section class="sce-ref-template"><b>' + esc(design.templateName) + '</b><small>' + esc(usage) + '</small><button type="button" data-sce-preview>Preview <i>' + icon('chevron', 13) + '</i></button></section><div class="sce-ref-tree-heading">CHECKOUT TEMPLATE</div>' + rows + add + '<p class="sce-nav-note">Required components keep the transaction flow intact. Content, trust, and commerce modules can be added only in safe zones.</p></div></aside>';
}

function settingsTree(editor) {
  return '<aside class="sce-tree sce-ref-tree"><header><strong>Checkout settings</strong></header><div class="sce-tree-scroll"><p class="sce-nav-note">Global Checkout / Upsell / Downsell / Thank you styles. Component overrides win, then these settings, then system defaults.</p>' + SETTINGS_GROUPS.map((group) => '<button type="button" class="sce-ref-settings-nav" data-sce-settings-jump="' + esc(group.key) + '">' + icon('settings', 15) + '<span>' + esc(group.name) + '</span></button>').join('') + '</div></aside>';
}

function addMenu(state) {
  return '<section class="sce-add-menu sce-ref-add-menu"><header><b>' + label(state, 'Add section', '添加区块') + '</b><button type="button" data-sce-add-close>' + icon('close', 15) + '</button></header>' + CATALOG.map((group) => '<div class="sce-ref-add-group"><b>' + esc(group.title) + '</b>' + group.types.map((type) => '<button type="button" data-sce-add="' + esc(type) + '"><span>' + icon(SECTION_META[type].icon, 14) + '</span><strong>' + esc(SECTION_META[type].name) + '</strong><small>' + esc(SECTION_META[type].region === 'summary' ? 'Order summary area' : 'Safe checkout insertion zone') + '</small></button>').join('') + '</div>').join('') + '</section>';
}

function photo(index) { return '<img src="' + PRODUCT_IMAGES[index % PRODUCT_IMAGES.length] + '" alt="">'; }
function sectionFrame(section, selected, inner, cls) { return '<section class="sce-ref-select ' + (selected === section.id ? 'is-selected' : '') + (section.hidden ? ' is-hidden' : '') + ' ' + (cls || '') + '" data-sce-select="' + esc(section.id) + '"><i class="sce-ref-select-label">' + esc(sectionMeta(section).name) + '</i>' + inner + '</section>'; }
function findKind(design, kind) { return design.sections.filter((section) => section.kind === kind && !section.hidden); }

function summaryLines() {
  const rows = [
    ['Linen-feel wide pants', 'Sand / M', '32.99', '45.00', 0], ['Soft rib tee', 'Forest / S', '37.98', '26.00', 1], ['Pleated midi skirt', 'Black / M', '38.00', '49.00', 2], ['04 Normal product - single variant', 'Delivery every 1 month', '10.39', '12.99', 3], ['05 Normal product - multiple variants', 'Delivery every 2 months', '15.19', '18.99', 4],
  ];
  return rows.map((row) => '<article class="sce-ref-line"><span class="sce-ref-thumb">' + photo(row[4]) + '<b>' + (row[0] === 'Soft rib tee' ? '2' : '1') + '</b></span><span><strong>' + esc(row[0]) + '</strong><small>' + esc(row[1]) + '</small><em>◇ ' + (row[0].indexOf('Normal') >= 0 ? 'Delivery saving' : row[0] === 'Soft rib tee' ? 'BUY 2 SAVE 30%' : 'EXTRA SALE') + '</em></span><span><s>$' + row[3] + '</s><b>$' + row[2] + '</b></span></article>').join('');
}

function commerceSections(design, selected, zone) {
  return design.sections.filter((section) => sectionMeta(section).addable && section.zone === zone && !section.hidden).map((section, index) => {
    const s = section.settings || {};
    if (section.kind === 'checkout-product-upsell') return sectionFrame(section, selected, '<div class="sce-ref-upsell"><div class="sce-ref-section-title"><h2>' + esc(s.title || 'Customers Also Grabbed') + '</h2><span>‹</span><b>›</b></div><div class="sce-ref-upsell-grid"><article><i>□</i>' + photo(2) + '<div><b>' + esc(s.product || 'Editorial shell dress') + '</b><select><option>Black / M</option></select><strong>$' + esc(s.price || '41.50') + ' <s>$' + esc(s.compare || '58.00') + '</s></strong><small>− &nbsp; 1 &nbsp; ＋</small></div></article><article><i>□</i>' + photo(3) + '<div><b>Street denim jacket</b><select><option>Indigo / M</option></select><strong>$54.00 <s>$77.00</s></strong><small>− &nbsp; 1 &nbsp; ＋</small></div></article></div></div>', 'sce-ref-card');
    if (section.kind === 'checkout-shipping-insurance') return sectionFrame(section, selected, '<label class="sce-ref-insurance"><i>□</i><span><b>' + esc(s.title || 'Shipping Insurance') + '</b><small>' + esc(s.note || 'Protect your delivery') + '</small></span><strong>$2.95</strong></label>');
    if (section.kind === 'checkout-vip-club') return sectionFrame(section, selected, '<label class="sce-ref-insurance"><i>□</i><span><b>' + esc(s.title || 'Welcome to the VIP club') + '</b><small>Members earn points on this order.</small></span><strong>$' + esc(s.price || '3.95') + '</strong></label>');
    if (section.kind === 'checkout-countdown') return sectionFrame(section, selected, '<div class="sce-ref-countdown">Your cart is reserved for <b>02:45</b></div>');
    if (section.kind === 'checkout-trust-badges') return sectionFrame(section, selected, '<div class="sce-ref-trust">✓ Secure payment &nbsp; · &nbsp; ✓ 30-day guarantee &nbsp; · &nbsp; ✓ Fast delivery</div>');
    if (section.kind === 'checkout-static-content') return sectionFrame(section, selected, '<div class="sce-ref-static">Need help? Our checkout support team is here for you.</div>');
    if (section.kind === 'checkout-trustpilot') return sectionFrame(section, selected, '<div class="sce-ref-review">★★★★★ &nbsp; 4.9/5 from verified shoppers</div>');
    return sectionFrame(section, selected, '<div class="sce-ref-static">' + esc(sectionMeta(section).name) + '</div>');
  }).join('');
}

function checkoutCanvas(state, design, editor) {
  const t = design.theme; const chosen = editor.selected; const header = byId(design, design.sections.find((section) => section.kind === 'checkout-header').id); const summary = design.sections.find((section) => section.kind === 'checkout-order-summary');
  const compact = editor.device === 'mobile'; const px = compact ? t.mobile_page_padding : 0;
  const summaryInner = '<div class="sce-ref-summary-inner">' + summaryLines() + '<div class="sce-ref-coupon"><span>Discount code</span><button>Apply</button></div>' + commerceSections(design, chosen, 'summary') + '<dl><div><dt>Subtotal</dt><dd>$174.58</dd></div><div><dt>Shipping</dt><dd>—</dd></div><div><dt>Tax</dt><dd>—</dd></div><div class="total"><dt>Total</dt><dd>USD $174.58</dd></div></dl></div>';
  const head = sectionFrame(header, chosen, '<div class="sce-ref-header" style="--header-height:' + (compact ? t.header_height_mobile : t.header_height_pc) + 'px;--header-bg:' + esc(t.header_background) + ';--header-text:' + esc(t.header_text_color) + '"><b style="font-size:' + Math.max(20, (compact ? t.logo_width_mobile : t.logo_width_pc) * .2) + 'px;text-align:' + esc(t.logo_alignment) + '">' + esc(t.logo_text) + '</b>' + (t.show_trust ? '<span>' + esc(t.trust_text) + '</span>' : '') + (t.show_cart ? '<i>⌑</i>' : '') + '</div>');
  const main = '<main class="sce-ref-main"><div class="sce-ref-express"><p>Express checkout</p><div><button>Shop Pay</button><button>PayPal</button><button>G Pay</button></div><span>OR</span></div>' + sectionFrame(findKind(design, 'checkout-contact')[0], chosen, '<div class="sce-ref-form-block"><div class="sce-ref-heading"><h2>Contact</h2><a>Sign in</a></div><input placeholder="Email"></div>') + commerceSections(design, chosen, 'contact') + sectionFrame(findKind(design, 'checkout-shipping-info')[0], chosen, '<div class="sce-ref-form-block"><h2>Delivery</h2><select><option>United States</option></select><div class="sce-ref-input-pair"><input placeholder="First name"><input placeholder="Last name"></div><input placeholder="Address"><input placeholder="Apt, suite, unit, etc. (optional)"><div class="sce-ref-input-pair"><input placeholder="City"><input placeholder="Postal code"></div></div>') + sectionFrame(findKind(design, 'checkout-shipping-method')[0], chosen, '<div class="sce-ref-form-block"><h2>Shipping method</h2><label class="sce-ref-shipping"><span>◉ Standard shipping <small>3–5 business days</small></span><b>$8.99</b></label><label class="sce-ref-shipping"><span>○ Express shipping <small>1–2 business days</small></span><b>$14.99</b></label></div>') + commerceSections(design, chosen, 'shipping') + sectionFrame(findKind(design, 'checkout-payment')[0], chosen, '<div class="sce-ref-form-block"><h2>Payment</h2><p>All transactions are secure and encrypted.</p><div class="sce-ref-card-input"><b>◉ Credit card</b><input placeholder="Card number"><div class="sce-ref-input-pair"><input placeholder="Expiration date (MM / YY)"><input placeholder="Security code"></div></div></div>') + commerceSections(design, chosen, 'payment') + sectionFrame(findKind(design, 'checkout-cta')[0], chosen, '<button class="sce-ref-pay" style="background:' + esc(t.button_background) + ';color:' + esc(t.button_text_color) + ';border-radius:' + t.button_border_radius + 'px;height:' + t.button_height + 'px">Pay now</button>') + commerceSections(design, chosen, 'cta') + '</main>';
  const footer = sectionFrame(findKind(design, 'checkout-policy-links')[0], chosen, '<footer class="sce-ref-footer">Refund policy &nbsp; Shipping policy &nbsp; Privacy &nbsp; Terms</footer>');
  const refStyle = '--page-bg:' + esc(t.page_background) + ';--summary-bg:' + esc(t.summary_background) + ';--text:' + esc(t.text_color) + ';--muted:' + esc(t.muted_text_color) + ';--line:' + esc(t.divider_color) + ';--input-bg:' + esc(t.input_background) + ';--input-line:' + esc(t.input_border_color) + ';--input-radius:' + t.input_border_radius + 'px;--font-size:' + t.base_font_size + 'px;--heading-size:' + t.heading_font_size + 'px;--page-pad:' + px + 'px;--gap:' + t.column_gap + 'px';
  return '<div class="sce-ref-frame' + (compact ? ' is-mobile' : '') + '" style="' + refStyle + '">' + commerceSections(design, chosen, 'announce') + head + '<div class="sce-ref-mobile-summary">Order summary <b>$174.58</b><span>⌄</span></div><div class="sce-ref-columns"><div class="sce-ref-form-side">' + main + '</div>' + sectionFrame(summary, chosen, '<aside class="sce-ref-summary-side">' + summaryInner + '</aside>') + '</div>' + commerceSections(design, chosen, 'footer') + footer + '</div>';
}

function editorMarkup(state, design, editor) {
  const dirty = !!state.ui.editorDirty; const pageLabel = typeName(state, design.type) + ' · ' + design.templateName;
  const left = editor.mode === 'settings' ? settingsTree(editor) : sectionsTree(state, design, editor);
  return '<div class="source-checkout-editor" data-i18n-skip><header class="sce-topbar sce-ref-topbar"><div class="sce-top-left"><button type="button" class="sce-icon-button" data-sce-back title="Back">' + icon('back', 18) + '</button><div class="sce-rail"><button type="button" class="sce-icon-button' + (editor.mode === 'sections' ? ' is-active' : '') + '" data-sce-mode="sections" title="Sections">' + icon('layers', 16) + '</button><button type="button" class="sce-icon-button' + (editor.mode === 'settings' ? ' is-active' : '') + '" data-sce-mode="settings" title="Checkout settings">' + icon('settings', 16) + '</button></div><div class="sce-title"><strong>' + esc(design.theme.logo_text) + ' · ' + label(state, 'Draft', '草稿') + '</strong><span class="sce-save-pill">● ' + (dirty ? label(state, 'Unsaved changes', '尚未保存') : label(state, 'Saved', '已保存')) + '</span></div></div><div class="sce-top-center"><button type="button" class="sce-page-picker" data-sce-page-picker>' + icon('orders', 15) + '<span>' + esc(pageLabel) + '</span>' + icon('chevron', 14) + '</button><div class="sce-device"><button type="button" class="' + (editor.device === 'desktop' ? ' is-active' : '') + '" data-sce-device="desktop">' + icon('desktop', 16) + '</button><button type="button" class="' + (editor.device === 'mobile' ? ' is-active' : '') + '" data-sce-device="mobile">' + icon('mobile', 16) + '</button></div></div><div class="sce-top-right"><button type="button" class="sce-button" data-sce-discard' + (dirty ? '' : ' disabled') + '>Discard</button><button type="button" class="sce-button" data-sce-save' + (dirty ? '' : ' disabled') + '>Save</button><button type="button" class="sce-button primary" data-sce-publish>Publish</button></div></header><div class="sce-workspace sce-ref-workspace">' + left + '<main class="sce-canvas sce-ref-canvas"><header>Preview · ' + esc(typeName(state, design.type)) + ' · ' + (editor.device === 'desktop' ? 'Desktop' : 'Mobile') + '</header><div class="sce-canvas-notice">' + icon('alert', 15) + '<span>This template is used by ' + ((state.pages.find((page) => page.id === editor.pageId) || {}).usedBy || 2) + ' nodes in Funnel. Changes apply to all of them.</span></div><div class="sce-canvas-scroll">' + checkoutCanvas(state, design, editor) + '</div></main><aside class="sce-inspector">' + inspector(state, design, editor) + '</aside></div></div>';
}

function addSection(design, type) {
  const meta = SECTION_META[type]; const settings = type === 'checkout-product-upsell' ? { title: 'Customers Also Grabbed', product: 'Editorial shell dress', price: '41.50', compare: '58.00' } : type === 'checkout-shipping-insurance' ? { title: 'Shipping Insurance', note: 'Protect your delivery for $2.95' } : type === 'checkout-vip-club' ? { title: 'Welcome to the VIP club', price: '3.95' } : {};
  const section = { id: id(type), kind: type, zone: meta.region === 'summary' ? 'summary' : meta.region === 'footer' ? 'footer' : meta.region === 'announce' ? 'announce' : 'cta', settings };
  const summaryIndex = design.sections.findIndex((item) => item.kind === 'checkout-order-summary');
  design.sections.splice(summaryIndex < 0 ? design.sections.length : summaryIndex, 0, section);
  return section;
}

function writeField(object, key, value) { object[key] = value; }

function mountEditor(root, state, route, actions) {
  const context = contextFor(state, route); const host = root.querySelector('#bc-design-editor'); if (!context || !host) return;
  const design = stateFor(state, context.page); const editor = state.ui.checkoutEditor[context.page.id]; editor.pageId = context.page.id;
  const paint = () => { host.innerHTML = editorMarkup(state, design, editor); };
  const dirty = () => { state.ui.editorDirty = true; };
  const refreshDirtyChrome = () => {
    host.querySelectorAll('[data-sce-save],[data-sce-discard]').forEach((control) => { control.disabled = !state.ui.editorDirty; });
    const pill = host.querySelector('.sce-save-pill');
    if (pill) pill.textContent = '● ' + (state.ui.editorDirty ? label(state, 'Unsaved changes', '尚未保存') : label(state, 'Saved', '已保存'));
  };
  const save = () => { context.page.revisionSequence = (context.page.revisionSequence || 0) + 1; context.page.draftRevision = (context.page.draftRevision || 0) + 1; context.page.draftRevisionId = 'rev_' + context.page.id + '_' + context.page.draftRevision; context.page.bestCheckoutSavedDraft = clone(design); context.page.updated = 'Just now'; state.ui.editorDirty = false; actions.showToast(label(state, 'Draft saved. Your published page is unchanged.', '草稿已保存，已发布页面不受影响。')); paint(); };
  paint();
  host.addEventListener('click', (event) => {
    const treeToggle = event.target.closest('[data-sce-tree-toggle]');
    if (treeToggle) { editor.treeOpen[treeToggle.dataset.sceTreeToggle] = !editor.treeOpen[treeToggle.dataset.sceTreeToggle]; paint(); return; }
    const button = event.target.closest('button,[data-sce-select]'); if (!button) return;
    if (button.dataset.sceBack !== undefined) { actions.setRoute(context.back); return; }
    if (button.dataset.sceMode) { editor.mode = button.dataset.sceMode; if (editor.mode === 'settings') editor.selected = 'theme'; paint(); return; }
    if (button.dataset.sceDevice) { editor.device = button.dataset.sceDevice; paint(); return; }
    if (button.dataset.sceSelect) { editor.mode = 'sections'; editor.selected = button.dataset.sceSelect; paint(); return; }
    if (button.dataset.sceSettingsGroup) { const key = button.dataset.sceSettingsGroup; editor.settingsOpen[key] = !editor.settingsOpen[key]; paint(); return; }
    if (button.dataset.sceSettingsJump) { const key = button.dataset.sceSettingsJump; editor.settingsOpen[key] = true; const group = host.querySelector('[data-sce-settings-group="' + key + '"]'); if (group) group.scrollIntoView({ block: 'nearest' }); return; }
    if (button.dataset.sceExpandAll !== undefined) { SETTINGS_GROUPS.forEach((group) => { editor.settingsOpen[group.key] = true; }); paint(); return; }
    if (button.dataset.sceAddOpen !== undefined) { editor.addOpen = true; paint(); return; }
    if (button.dataset.sceAddClose !== undefined) { editor.addOpen = false; paint(); return; }
    if (button.dataset.sceAdd) { const added = addSection(design, button.dataset.sceAdd); editor.selected = added.id; editor.addOpen = false; dirty(); paint(); return; }
    if (button.dataset.sceHide) { const section = byId(design, button.dataset.sceHide); if (section) { section.hidden = !section.hidden; dirty(); paint(); } return; }
    if (button.dataset.sceDelete) { design.sections = design.sections.filter((section) => section.id !== button.dataset.sceDelete); editor.selected = design.sections[0].id; dirty(); paint(); return; }
    if (button.dataset.sceThemeToggle) { design.theme[button.dataset.sceThemeToggle] = !design.theme[button.dataset.sceThemeToggle]; dirty(); paint(); return; }
    if (button.dataset.sceImage !== undefined) { actions.showToast(label(state, 'The production image picker opens the Shopify file library. This prototype keeps the fallback logo.', '生产环境会打开 Shopify 素材库；此原型保留品牌兜底。'), 'info'); return; }
    if (button.dataset.sceDiscard !== undefined) { context.page.bestCheckoutDesign = clone(context.page.bestCheckoutSavedDraft); state.ui.checkoutEditor[context.page.id] = { pageId: context.page.id, selected: context.page.bestCheckoutDesign.sections[0].id, mode: 'sections', device: editor.device, addOpen: false, settingsOpen: { main: true, header: true }, treeOpen: { summary: true } }; state.ui.editorDirty = false; actions.showToast(label(state, 'Draft changes discarded.', '已放弃草稿修改。')); actions.renderShell(); return; }
    if (button.dataset.sceSave !== undefined) { save(); return; }
    if (button.dataset.scePreview !== undefined) { actions.openPreview(context); return; }
    if (button.dataset.scePublish !== undefined) { if (state.ui.editorDirty) { actions.showToast(label(state, 'Save the draft before publishing.', '请先保存草稿再发布。'), 'info'); return; } context.page.version = Math.max(1, (context.page.version || 0) + 1); context.page.publishedVersionId = 'page_' + context.page.id + '_v' + context.page.version; context.page.publishedRevisionId = context.page.draftRevisionId; context.page.bestCheckoutPublishedDesign = clone(context.page.bestCheckoutSavedDraft); context.page.status = 'Published'; actions.showToast(label(state, 'Page published. Funnels keep their pinned version until republished.', '页面已发布；漏斗会继续使用当前固定版本，重新发布漏斗后才更新。')); paint(); return; }
    if (button.dataset.scePreview !== undefined || button.dataset.scePagePicker !== undefined) actions.showToast(label(state, 'Preview uses the selected Checkout template in a safe test session.', '预览会在安全测试会话中使用当前 Checkout 模板。'), 'info');
  });
  host.addEventListener('input', (event) => {
    const control = event.target.closest('[data-sce-theme-field],[data-sce-section-field]'); if (!control) return;
    const target = control.dataset.sceThemeField ? design.theme : (byId(design, editor.selected) || {}).settings; if (!target) return;
    const key = control.dataset.sceThemeField || control.dataset.sceSectionField; writeField(target, key, control.type === 'range' ? Number(control.value) : control.value); dirty();
    const canvas = host.querySelector('.sce-canvas-scroll'); if (canvas) canvas.innerHTML = checkoutCanvas(state, design, editor);
    refreshDirtyChrome();
  });
  host.addEventListener('change', (event) => {
    const control = event.target.closest('[data-sce-theme-field],[data-sce-section-field]'); if (!control || control.type === 'range') return;
    const target = control.dataset.sceThemeField ? design.theme : (byId(design, editor.selected) || {}).settings; if (!target) return;
    writeField(target, control.dataset.sceThemeField || control.dataset.sceSectionField, control.value); dirty(); paint();
  });
}

export function renderEditor(state, route) { return contextFor(state, route) ? '<div class="source-editor-shell" id="bc-design-editor" aria-label="BestCheckout page designer"></div>' : '<div class="not-found"><strong>Page not found</strong></div>'; }
export { mountEditor };
