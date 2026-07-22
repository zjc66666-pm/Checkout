/* BestCheckout · Funnel page builder — a theme-builder-grade editor for ONE funnel page,
   modeled on BestShopio's online-store theme editor: a blocks tree (drag reorder · hide/show ·
   delete), a live device preview (desktop / mobile, click-to-select), and a schema-driven
   settings panel with the full control set (text / textarea / select / segmented / toggle /
   range / number / color / image). Each block type carries a schema + a storefront renderer.
   Operates in place on one funnel step's `blocks` (window.DATA_BC.FUNNEL.steps[].blocks).
   Loaded on demand by app.js; exposes window.BC_PB.render(rootEl, step). */
(function () {
  // ----------------------------------------------------------------- i18n
  const ZH = {
    'Back to funnel': '返回漏斗', 'Save': '保存', 'Saved': '已保存', 'Preview': '预览', 'Desktop': '桌面', 'Mobile': '手机', 'Locked': '锁定',
    'Blocks': '区块', 'Add block': '添加区块', 'No blocks yet.': '暂无区块。', 'Select a block to edit it.': '选择一个区块进行编辑。', 'Remove block': '删除该区块',
    'Block added': '已添加区块', 'Block removed': '已删除区块', 'Search blocks': '搜索区块', 'Esc to close': 'Esc 关闭', 'block types available': '种区块可用',
    'Content': '内容', 'Commerce': '商品 / 转化', 'Social proof & urgency': '信任与紧迫', 'Checkout fields': '结账字段',
    'Hero': '主视觉', 'Headline': '标题', 'Text': '文本', 'Image': '图片', 'Product': '产品', 'Button': '按钮', 'Yes / No buttons': '是 / 否按钮',
    'Order bump': '凑单', 'Countdown timer': '倒计时', 'Reviews': '评价', 'Feature list': '功能列表', 'Logo': 'Logo', 'Contact': '联系方式',
    'Shipping': '配送', 'Payment': '支付', 'Order summary': '订单摘要', 'Tracking': '物流追踪',
    'Subtitle': '副标题', 'Button label': '按钮文字', 'Alignment': '对齐', 'Background': '背景色', 'Text color': '文字颜色', 'Image URL': '图片地址',
    'Height': '高度', 'Size': '字号', 'Product name': '产品名称', 'Price': '价格', 'Compare-at price': '原价', 'Show compare-at': '显示原价',
    'Color': '颜色', 'Full width': '整行宽度', 'Yes label': '“是”文字', 'No / decline label': '“否” / 拒绝文字', 'Title': '标题', 'Description': '描述',
    'Add-on price': '加购价格', 'Minutes': '分钟', 'Rating (stars)': '评分（星）', 'Review count': '评价数', 'Feature 1': '功能 1', 'Feature 2': '功能 2', 'Feature 3': '功能 3',
    'Brand text': '品牌文字', 'Section title': '区块标题', 'Subtotal': '小计', 'Total': '合计',
    'Left': '左', 'Center': '居中', 'Right': '右', 'Small': '小', 'Medium': '中', 'Large': '大',
    'This block has no settings.': '该区块没有可调设置。', 'Heading': '标题',
  };
  const lang = () => (window.I18N && window.I18N.lang) || 'en';
  const t = (s) => (lang() === 'zh' && ZH[s]) ? ZH[s] : s;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = (p) => (p || 'b') + Math.random().toString(36).slice(2, 7);
  const money = (n) => '$' + Number(n || 0).toFixed(2);
  const svg = (p, w) => '<svg viewBox="0 0 24 24" width="' + (w || 16) + '" height="' + (w || 16) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const I = {
    back: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', 16), grip: svg('<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>', 14),
    eye: svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>', 14), eyeOff: svg('<path d="M9.9 4.24A9 9 0 0 1 12 4c6 0 10 7 10 7a13 13 0 0 1-1.67 2.18M6.6 6.6A13 13 0 0 0 2 11s4 7 10 7a9 9 0 0 0 4.5-1.2"/><path d="m2 2 20 20"/>', 14),
    trash: svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>', 14), plus: svg('<path d="M12 5v14M5 12h14"/>', 14),
    desktop: svg('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>', 15), mobile: svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', 15),
    type: svg('<path d="M4 7V5h16v2M9 19h6M12 5v14"/>', 14), img: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', 14),
    tag: svg('<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>', 14), cursor: svg('<path d="m3 3 7.07 17 2.51-7.39L20 10.07z"/>', 14),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 14), star: svg('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>', 14),
    list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', 14), form: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/>', 14),
    card: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', 14), truck: svg('<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="1.5"/><circle cx="18.5" cy="18.5" r="1.5"/>', 14),
    check: svg('<path d="M20 6 9 17l-5-5"/>', 14), search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 15), x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 13),
  };

  // ----------------------------------------------------------------- shared control option sets
  const ALIGN = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }];
  const SIZES = [{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }];
  const al = (p) => p.align || 'center';
  const HSZ = { small: 16, medium: 21, large: 27 };

  // ----------------------------------------------------------------- BLOCK DEFS (schema + render)
  const BLOCKS = {
    hero: {
      name: 'Hero', icon: 'img', schema: [
        { key: 'headline', label: 'Headline', control: 'text' }, { key: 'sub', label: 'Subtitle', control: 'text' },
        { key: 'cta', label: 'Button label', control: 'text' }, { key: 'align', label: 'Alignment', control: 'segmented', options: ALIGN, default: 'center' },
        { key: 'image', label: 'Image URL', control: 'image' }, { key: 'bg', label: 'Background', control: 'color', default: '#eef2fb' }, { key: 'tc', label: 'Text color', control: 'color', default: '#1a2233' },
      ],
      render: (p) => '<div class="pv-hero" style="text-align:' + al(p) + ';background:' + esc(p.bg || '#eef2fb') + ';color:' + esc(p.tc || '#1a2233') + (p.image ? ';background-image:linear-gradient(rgba(20,30,50,.32),rgba(20,30,50,.32)),url(' + esc(p.image) + ');background-size:cover;background-position:center;color:#fff' : '') + '">' +
        '<div class="pv-h1">' + esc(p.headline || '') + '</div><div class="pv-hsub">' + esc(p.sub || '') + '</div>' + (p.cta ? '<span class="pv-btn">' + esc(p.cta) + '</span>' : '') + '</div>',
    },
    headline: {
      name: 'Headline', icon: 'type', schema: [{ key: 'text', label: 'Heading', control: 'text' }, { key: 'size', label: 'Size', control: 'segmented', options: SIZES, default: 'medium' }, { key: 'align', label: 'Alignment', control: 'segmented', options: ALIGN, default: 'center' }],
      render: (p) => '<div class="pv-h2" style="text-align:' + al(p) + ';font-size:' + (HSZ[p.size] || 21) + 'px">' + esc(p.text || '') + '</div>',
    },
    text: {
      name: 'Text', icon: 'type', schema: [{ key: 'text', label: 'Text', control: 'textarea' }, { key: 'align', label: 'Alignment', control: 'segmented', options: ALIGN, default: 'left' }],
      render: (p) => '<div class="pv-tx" style="text-align:' + al(p) + '">' + esc(p.text || '') + '</div>',
    },
    image: {
      name: 'Image', icon: 'img', schema: [{ key: 'url', label: 'Image URL', control: 'image' }, { key: 'height', label: 'Height', control: 'range', min: 60, max: 320, step: 10, unit: 'px', default: 150 }],
      render: (p) => '<div class="pv-img" style="height:' + (p.height || 150) + 'px' + (p.url ? ';background-image:url(' + esc(p.url) + ');background-size:cover;background-position:center' : '') + '"></div>',
    },
    product: {
      name: 'Product', icon: 'tag', schema: [
        { key: 'name', label: 'Product name', control: 'text' }, { key: 'image', label: 'Image URL', control: 'image' },
        { key: 'price', label: 'Price', control: 'number', min: 0, step: 0.01 }, { key: 'compareAt', label: 'Compare-at price', control: 'number', min: 0, step: 0.01 }, { key: 'showCompare', label: 'Show compare-at', control: 'toggle', default: true },
      ],
      render: (p) => { const sale = p.showCompare && p.compareAt && Number(p.compareAt) > Number(p.price || 0); return '<div class="pv-prod"><div class="pv-pimg"' + (p.image ? ' style="background-image:url(' + esc(p.image) + ');background-size:cover;background-position:center"' : '') + '></div>' + '<div class="pv-pn">' + esc(p.name || '') + '</div><div class="pv-pp"><b>' + money(p.price) + '</b>' + (sale ? '<s>' + money(p.compareAt) + '</s>' : '') + '</div></div>'; },
    },
    button: {
      name: 'Button', icon: 'cursor', schema: [{ key: 'label', label: 'Button label', control: 'text' }, { key: 'color', label: 'Color', control: 'color', default: '#3b6fd4' }, { key: 'align', label: 'Alignment', control: 'segmented', options: ALIGN, default: 'center' }, { key: 'full', label: 'Full width', control: 'toggle', default: false }],
      render: (p) => '<div style="text-align:' + al(p) + ';padding:12px 14px"><span class="pv-btn' + (p.full ? ' full' : '') + '" style="background:' + esc(p.color || '#3b6fd4') + '">' + esc(p.label || 'Button') + '</span></div>',
    },
    yesno: {
      name: 'Yes / No buttons', icon: 'check', schema: [{ key: 'yes', label: 'Yes label', control: 'text' }, { key: 'no', label: 'No / decline label', control: 'text' }, { key: 'color', label: 'Color', control: 'color', default: '#3b6fd4' }],
      render: (p) => '<div class="pv-yn"><span class="pv-btn full" style="background:' + esc(p.color || '#3b6fd4') + '">' + esc(p.yes || 'Yes') + '</span><span class="pv-no">' + esc(p.no || 'No thanks') + '</span></div>',
    },
    orderBump: {
      name: 'Order bump', icon: 'tag', schema: [{ key: 'title', label: 'Title', control: 'text' }, { key: 'desc', label: 'Description', control: 'text' }, { key: 'price', label: 'Add-on price', control: 'number', min: 0, step: 0.01 }],
      render: (p) => '<div class="pv-bump"><span class="pv-cb"></span><div><div class="pv-bt">' + esc(p.title || '') + '</div>' + (p.desc ? '<div class="pv-bd">' + esc(p.desc) + '</div>' : '') + '<div class="pv-bp">+ ' + money(p.price) + '</div></div></div>',
    },
    timer: {
      name: 'Countdown timer', icon: 'clock', schema: [{ key: 'text', label: 'Text', control: 'text' }, { key: 'minutes', label: 'Minutes', control: 'number', min: 1, max: 60, step: 1, default: 10 }],
      render: (p) => '<div class="pv-timer">' + esc(p.text || '') + ' <b>' + ('0' + (Math.max(0, (p.minutes || 10) - 1))).slice(-2) + ':58</b></div>',
    },
    reviews: {
      name: 'Reviews', icon: 'star', schema: [{ key: 'rating', label: 'Rating (stars)', control: 'range', min: 1, max: 5, step: 0.1, default: 4.8 }, { key: 'count', label: 'Review count', control: 'text' }],
      render: (p) => { const r = Math.round(p.rating || 5); return '<div class="pv-rev"><span class="pv-stars">' + '★★★★★'.slice(0, r) + '<span class="pv-stars-o">' + '★★★★★'.slice(0, 5 - r) + '</span></span> <span>' + esc((p.rating || 4.8) + (p.count ? ' · ' + p.count : '')) + '</span></div>'; },
    },
    features: {
      name: 'Feature list', icon: 'list', schema: [{ key: 'title', label: 'Title', control: 'text' }, { key: 'f1', label: 'Feature 1', control: 'text' }, { key: 'f2', label: 'Feature 2', control: 'text' }, { key: 'f3', label: 'Feature 3', control: 'text' }],
      render: (p) => '<div class="pv-feat"><div class="pv-ft">' + esc(p.title || '') + '</div>' + [p.f1, p.f2, p.f3].filter(Boolean).map((x) => '<div class="pv-fi">' + I.check + '<span>' + esc(x) + '</span></div>').join('') + '</div>',
    },
    logo: { name: 'Logo', icon: 'type', schema: [{ key: 'text', label: 'Brand text', control: 'text' }], render: (p) => '<div class="pv-logo">' + esc(p.text || 'Brand') + '</div>' },
    contact: { name: 'Contact', icon: 'form', schema: [{ key: 'title', label: 'Section title', control: 'text' }], render: (p) => formPv(p.title || 'Contact', 2) },
    shipping: { name: 'Shipping', icon: 'form', schema: [{ key: 'title', label: 'Section title', control: 'text' }], render: (p) => formPv(p.title || 'Shipping address', 3) },
    payment: { name: 'Payment', icon: 'card', schema: [{ key: 'title', label: 'Section title', control: 'text' }], render: (p) => formPv(p.title || 'Payment', 2) },
    cartSummary: {
      name: 'Order summary', icon: 'card', schema: [{ key: 'title', label: 'Section title', control: 'text' }, { key: 'subtotal', label: 'Subtotal', control: 'number', min: 0, step: 0.01, default: 39.97 }, { key: 'total', label: 'Total', control: 'number', min: 0, step: 0.01, default: 42.96 }],
      render: (p) => '<div class="pv-cart"><div class="pv-fl2">' + esc(p.title || 'Order summary') + '</div><div class="pv-row"><span>' + t('Subtotal') + '</span><span>' + money(p.subtotal != null ? p.subtotal : 39.97) + '</span></div><div class="pv-row total"><span>' + t('Total') + '</span><span>' + money(p.total != null ? p.total : 42.96) + '</span></div></div>',
    },
    tracking: { name: 'Tracking', icon: 'truck', schema: [{ key: 'title', label: 'Section title', control: 'text' }], render: (p) => '<div class="pv-track"><div class="pv-fl2">' + esc(p.title || 'Tracking') + '</div><div class="pv-tbar"></div></div>' },
  };
  function formPv(title, n) { let r = ''; for (let i = 0; i < n; i++) r += '<div class="pv-input"></div>'; return '<div class="pv-form"><div class="pv-fl2">' + esc(title) + '</div>' + r + '</div>'; }
  const CATALOG = [
    { label: 'Content', kinds: ['hero', 'headline', 'text', 'image', 'logo'] },
    { label: 'Commerce', kinds: ['product', 'button', 'yesno', 'orderBump'] },
    { label: 'Social proof & urgency', kinds: ['timer', 'reviews', 'features'] },
    { label: 'Checkout fields', kinds: ['contact', 'shipping', 'payment', 'cartSummary', 'tracking'] },
  ];
  function defaults(kind) { const o = {}; (BLOCKS[kind].schema || []).forEach((f) => { if (f.key) o[f.key] = f.default != null ? f.default : (f.control === 'toggle' ? false : (f.control === 'number' || f.control === 'range' ? (f.min || 0) : '')); }); return Object.assign(o, SEED[kind] || {}); }
  const SEED = {
    hero: { headline: 'Sleep better in 7 nights', sub: 'Doctor-formulated magnesium blend', cta: 'Shop now' }, headline: { text: 'Special one-time offer' }, text: { text: 'Add your content here.' },
    product: { name: 'Product', price: 19, compareAt: 24, showCompare: true }, button: { label: 'Buy now' }, yesno: { yes: 'Yes, add to my order', no: 'No thanks' },
    orderBump: { title: 'Add shipping protection', price: 2.99 }, timer: { text: 'This offer expires in', minutes: 10 }, reviews: { rating: 4.8, count: '1,200 reviews' },
    features: { title: 'Why it works', f1: 'Clinically dosed', f2: 'Third-party tested', f3: 'Money-back guarantee' }, logo: { text: 'Lavender Labs' }, cartSummary: { title: 'Order summary', subtotal: 39.97, total: 42.96 },
  };
  function blockName(b) { return (BLOCKS[b.type] || {}).name || b.type; }
  function blockLabel(b) { const p = b.props || {}; const h = p.headline || p.text || p.name || p.title || p.label; return (h && String(h).trim()) ? t(blockName(b)) + ' · ' + String(h).trim().slice(0, 20) : t(blockName(b)); }

  // ----------------------------------------------------------------- state
  let root, step, sel = null, device = 'desktop';

  function render(rootEl, stepObj) {
    root = rootEl; step = stepObj; if (!step.blocks) step.blocks = [];
    if (!sel || !step.blocks.some((b) => b.id === sel)) sel = step.blocks[0] ? step.blocks[0].id : null;
    paint();
  }
  window.BC_PB = { render: render };

  function toast(msg) { const e = document.createElement('div'); e.textContent = msg; e.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#242833;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:90;box-shadow:0 8px 30px rgba(0,0,0,.2)'; document.body.appendChild(e); setTimeout(() => e.remove(), 1700); }

  // ----------------------------------------------------------------- paint
  function paint() {
    const cur = step.blocks.find((b) => b.id === sel);
    root.innerHTML = STYLE +
      '<div class="pb">' +
        '<div class="pb-top">' +
          '<a class="btn btn-default" href="#/bestcheckout/editor">' + I.back + t('Back to funnel') + '</a>' +
          '<div class="pb-name">' + esc(step.name) + (step.locked ? '<span class="pb-lk">' + t('Locked') + '</span>' : '') + '</div>' +
          '<div class="pb-dev"><button class="' + (device === 'desktop' ? 'on' : '') + '" data-dev="desktop" title="Desktop">' + I.desktop + '</button><button class="' + (device === 'mobile' ? 'on' : '') + '" data-dev="mobile" title="Mobile">' + I.mobile + '</button></div>' +
          '<button class="btn btn-default" data-pv>' + t('Preview') + '</button><button class="btn btn-primary" data-save>' + t('Save') + '</button>' +
        '</div>' +
        '<div class="pb-body">' +
          '<div class="pb-left"><div class="pb-lh">' + t('Blocks') + '</div><div class="pb-tree" id="pb-tree">' + treeHtml() + '</div>' +
            '<button class="pb-addbtn" id="pb-add">' + I.plus + ' ' + t('Add block') + '</button></div>' +
          '<div class="pb-center"><div class="pb-cbar">' + t('Preview') + ' · ' + (device === 'desktop' ? t('Desktop') : t('Mobile')) + '</div>' +
            '<div class="pb-cscroll"><div class="pb-frame ' + device + '" id="pb-canvas">' + canvasInner() + '</div></div></div>' +
          '<div class="pb-right" id="pb-right">' + (cur ? formHtml(cur) : emptyRight()) + '</div>' +
        '</div>' +
      '</div>';
    wireTop(); wireTree(); wireCanvas(); wireForm();
  }
  function emptyRight() { return '<div class="pb-rh"><div class="pb-rt">' + t('Settings') + '</div></div><div class="pb-empty">' + t('Select a block to edit it.') + '</div>'; }
  function treeHtml() {
    if (!step.blocks.length) return '<div class="pb-empty sm">' + t('No blocks yet.') + '</div>';
    return step.blocks.map((b) => '<div class="pb-row' + (b.id === sel ? ' sel' : '') + (b.hidden ? ' hid' : '') + '" data-bid="' + b.id + '" draggable="true">' +
      '<span class="pb-grip">' + I.grip + '</span><span class="pb-ico">' + (I[(BLOCKS[b.type] || {}).icon] || I.type) + '</span>' +
      '<span class="pb-rn">' + esc(blockLabel(b)) + '</span>' +
      '<span class="pb-acts"><button data-vis title="' + (b.hidden ? 'Show' : 'Hide') + '">' + (b.hidden ? I.eyeOff : I.eye) + '</button><button data-del title="Delete">' + I.trash + '</button></span></div>').join('');
  }
  function canvasInner() {
    const vis = step.blocks.filter((b) => !b.hidden);
    if (!vis.length) return '<div class="pb-canvas-empty">' + t('No blocks yet.') + '</div>';
    return vis.map((b) => { let html; try { html = BLOCKS[b.type] ? BLOCKS[b.type].render(b.props || {}) : '<div class="pv-tx">' + esc(b.type) + '</div>'; } catch (e) { html = '<div class="pv-tx" style="color:#c0392b">⚠ ' + esc(b.type) + '</div>'; } return '<div class="pv-block' + (b.id === sel ? ' sel' : '') + '" data-bid="' + b.id + '">' + html + '</div>'; }).join('');
  }

  // ----------------------------------------------------------------- schema form (control set)
  function formHtml(b) {
    const def = BLOCKS[b.type]; const sch = def ? def.schema : [];
    const body = sch.length ? sch.map((f) => fieldHtml(f, b.props || {})).join('') : '<div class="pb-info">' + t('This block has no settings.') + '</div>';
    return '<div class="pb-rh"><span class="pb-rico">' + (I[(def || {}).icon] || I.type) + '</span><div class="pb-rt">' + esc(t(blockName(b))) + '</div></div>' +
      '<div class="pb-form" id="pb-form">' + body +
      (step.locked ? '' : '<button class="pb-remove" data-remove>' + I.trash + ' ' + t('Remove block') + '</button>') + '</div>';
  }
  function fieldHtml(f, vals) {
    const val = vals[f.key];
    if (f.control === 'toggle') return '<div class="pb-fld row"><label class="pb-flab">' + t(f.label) + '</label>' + control(f, val) + '</div>';
    const vtag = f.control === 'range' ? '<span class="pb-fval">' + ((val == null ? f.default : val) + (f.unit || '')) + '</span>' : '';
    return '<div class="pb-fld"><label class="pb-flab">' + t(f.label) + vtag + '</label>' + control(f, val) + '</div>';
  }
  function control(f, val) {
    const dk = 'data-fkey="' + esc(f.key) + '" data-control="' + f.control + '"';
    switch (f.control) {
      case 'text': return '<input class="pb-in" ' + dk + ' type="text" value="' + esc(val) + '">';
      case 'textarea': return '<textarea class="pb-in pb-ta" ' + dk + ' rows="3">' + esc(val) + '</textarea>';
      case 'select': return '<select class="pb-in" ' + dk + '>' + (f.options || []).map((o) => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(val) ? ' selected' : '') + '>' + t(o.label) + '</option>').join('') + '</select>';
      case 'segmented': return '<div class="pb-seg" ' + dk + '>' + (f.options || []).map((o) => '<button data-v="' + esc(o.value) + '" class="' + (String(o.value) === String(val) ? 'on' : '') + '">' + t(o.label) + '</button>').join('') + '</div>';
      case 'toggle': return '<span class="pb-tg' + (val ? ' on' : '') + '" ' + dk + '><i></i></span>';
      case 'range': return '<input type="range" class="pb-range" ' + dk + ' min="' + f.min + '" max="' + f.max + '" step="' + (f.step || 1) + '" value="' + (val == null ? f.default : val) + '">';
      case 'number': return '<input type="number" class="pb-in" ' + dk + ' value="' + esc(val) + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + (f.step ? ' step="' + f.step + '"' : '') + '>';
      case 'color': { const hex = (typeof val === 'string' && /^#/.test(val)) ? val : '#000000'; return '<div class="pb-color" ' + dk + '><label class="pb-sw" style="background:' + esc(val || '#000') + '"><input type="color" value="' + esc(hex) + '"></label><input class="pb-hex" value="' + esc(val == null ? '' : val) + '"></div>'; }
      case 'image': return '<div class="pb-imgf" ' + dk + '>' + (val ? '<div class="pb-imgp" style="background-image:url(' + esc(val) + ')"></div>' : '') + '<input class="pb-in" data-img value="' + esc(val) + '" placeholder="https://…"></div>';
      default: return '<input class="pb-in" ' + dk + ' value="' + esc(val) + '">';
    }
  }

  // ----------------------------------------------------------------- wiring
  function curBlock() { return step.blocks.find((b) => b.id === sel); }
  function refreshCanvas() { const c = root.querySelector('#pb-canvas'); if (c) { c.innerHTML = canvasInner(); bindCanvasClicks(c); } }
  function refreshTreeLabel() { const b = curBlock(); if (!b) return; const row = root.querySelector('.pb-row[data-bid="' + b.id + '"] .pb-rn'); if (row) row.textContent = blockLabel(b); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }

  function wireTop() {
    root.querySelectorAll('[data-dev]').forEach((b) => b.onclick = () => { device = b.getAttribute('data-dev'); paint(); });
    const sv = root.querySelector('[data-save]'); if (sv) sv.onclick = () => toast(t('Saved'));
    const pv = root.querySelector('[data-pv]'); if (pv) pv.onclick = () => toast(t('Preview'));
  }
  function bindCanvasClicks(c) { c.querySelectorAll('.pv-block').forEach((el) => el.onclick = () => { sel = el.getAttribute('data-bid'); paint(); }); }
  function wireCanvas() { const c = root.querySelector('#pb-canvas'); if (c) bindCanvasClicks(c); }
  function wireTree() {
    const tree = root.querySelector('#pb-tree');
    tree.querySelectorAll('.pb-row').forEach((row) => {
      const id = row.getAttribute('data-bid');
      row.onclick = (e) => { if (e.target.closest('button')) return; if (!row.dataset.dragged) { sel = id; paint(); } };
      const vis = row.querySelector('[data-vis]'); if (vis) vis.onclick = (e) => { e.stopPropagation(); const b = step.blocks.find((x) => x.id === id); if (b) { b.hidden = !b.hidden; paint(); } };
      const del = row.querySelector('[data-del]'); if (del) del.onclick = (e) => { e.stopPropagation(); step.blocks = step.blocks.filter((x) => x.id !== id); if (sel === id) sel = step.blocks[0] ? step.blocks[0].id : null; paint(); toast(t('Block removed')); };
    });
    wireDrag(tree);
    const add = root.querySelector('#pb-add'); if (add) add.onclick = (e) => openAdd(e.currentTarget);
  }
  function wireForm() {
    const form = root.querySelector('#pb-form'); if (!form) return;
    const b = curBlock(); if (!b) return; const props = b.props || (b.props = {});
    const set = (k, v, repaintForm) => { props[k] = v; refreshCanvas(); refreshTreeLabel(); if (repaintForm) { const r = root.querySelector('#pb-right'); if (r) { r.innerHTML = formHtml(b); wireForm(); } } };
    form.querySelectorAll('[data-control]').forEach((el) => {
      const k = el.getAttribute('data-fkey'); const ctl = el.getAttribute('data-control');
      if (ctl === 'text') el.oninput = () => set(k, el.value, false);
      else if (ctl === 'textarea') el.oninput = () => set(k, el.value, false);
      else if (ctl === 'number') el.oninput = () => set(k, num(el.value), false);
      else if (ctl === 'select') el.onchange = () => set(k, el.value, false);
      else if (ctl === 'range') el.oninput = () => { const fv = el.parentElement.querySelector('.pb-fval'); const f = fieldOf(b, k); if (fv) fv.textContent = el.value + ((f && f.unit) || ''); set(k, num(el.value), false); };
      else if (ctl === 'toggle') el.onclick = () => { const nv = !el.classList.contains('on'); el.classList.toggle('on', nv); set(k, nv, false); };
      else if (ctl === 'segmented') el.querySelectorAll('button').forEach((bn) => bn.onclick = () => { el.querySelectorAll('button').forEach((x) => x.classList.remove('on')); bn.classList.add('on'); set(k, bn.getAttribute('data-v'), false); });
      else if (ctl === 'color') { const cp = el.querySelector('input[type=color]'); const hx = el.querySelector('.pb-hex'); const sw = el.querySelector('.pb-sw'); cp.oninput = () => { hx.value = cp.value; sw.style.background = cp.value; set(k, cp.value, false); }; hx.onchange = () => { sw.style.background = hx.value; set(k, hx.value, false); }; }
      else if (ctl === 'image') { const u = el.querySelector('[data-img]'); u.oninput = () => set(k, u.value, false); u.onchange = () => set(k, u.value, true); }
    });
    const rm = form.querySelector('[data-remove]'); if (rm) rm.onclick = () => { step.blocks = step.blocks.filter((x) => x.id !== b.id); sel = step.blocks[0] ? step.blocks[0].id : null; paint(); toast(t('Block removed')); };
  }
  function fieldOf(b, k) { const def = BLOCKS[b.type]; return def && (def.schema || []).find((f) => f.key === k); }

  // ----------------------------------------------------------------- drag reorder (tree)
  let dragId = null;
  function wireDrag(tree) {
    tree.querySelectorAll('.pb-row').forEach((row) => {
      row.addEventListener('dragstart', () => { dragId = row.getAttribute('data-bid'); row.classList.add('dragging'); row.dataset.dragged = '1'; });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); clearDrop(); setTimeout(() => { delete row.dataset.dragged; }, 0); dragId = null; });
      row.addEventListener('dragover', (e) => { if (!dragId) return; e.preventDefault(); const r = row.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2; clearDrop(); row.classList.add(after ? 'drop-after' : 'drop-before'); });
      row.addEventListener('drop', (e) => { if (!dragId) return; e.preventDefault(); const after = row.classList.contains('drop-after'); reorder(dragId, row.getAttribute('data-bid'), after); clearDrop(); });
    });
  }
  function clearDrop() { root.querySelectorAll('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after')); }
  function reorder(fromId, toId, after) {
    if (fromId === toId) return; const a = step.blocks; const fi = a.findIndex((x) => x.id === fromId); if (fi < 0) return;
    const m = a.splice(fi, 1)[0]; let ti = a.findIndex((x) => x.id === toId); if (ti < 0) { a.splice(fi, 0, m); return; } a.splice(ti + (after ? 1 : 0), 0, m); paint();
  }

  // ----------------------------------------------------------------- add-block catalog popover
  function openAdd(anchor) {
    closePop();
    const layer = document.createElement('div'); layer.className = 'pb-poplayer';
    const pop = document.createElement('div'); pop.className = 'pb-addpop';
    pop.innerHTML = '<div class="pb-addsearch">' + I.search + '<input id="pb-addq" placeholder="' + t('Search blocks') + '"></div><div class="pb-addlist" id="pb-addlist"></div><div class="pb-addfoot"><span id="pb-addcount"></span><span>' + t('Esc to close') + '</span></div>';
    layer.appendChild(pop); document.body.appendChild(layer);
    const r = anchor.getBoundingClientRect(); pop.style.left = Math.max(12, r.left) + 'px'; pop.style.top = (r.bottom + 6) + 'px';
    const draw = (q) => {
      q = (q || '').toLowerCase(); let html = '', total = 0;
      CATALOG.forEach((g) => {
        const ks = g.kinds.filter((k) => !q || (BLOCKS[k].name + ' ' + k).toLowerCase().indexOf(q) >= 0);
        if (!ks.length) return; html += '<div class="pb-addgrp">' + t(g.label) + '</div>';
        ks.forEach((k) => { total++; html += '<div class="pb-addrow" data-addk="' + k + '"><span class="pb-addico">' + (I[BLOCKS[k].icon] || I.type) + '</span><span>' + t(BLOCKS[k].name) + '</span></div>'; });
      });
      const list = pop.querySelector('#pb-addlist'); list.innerHTML = html || '<div class="pb-info" style="padding:10px">—</div>';
      pop.querySelector('#pb-addcount').textContent = Object.keys(BLOCKS).length + ' ' + t('block types available');
      list.querySelectorAll('[data-addk]').forEach((rw) => rw.onclick = () => { addBlock(rw.getAttribute('data-addk')); closePop(); });
    };
    draw('');
    const qi = pop.querySelector('#pb-addq'); qi.oninput = () => draw(qi.value); setTimeout(() => qi.focus(), 20);
    layer.addEventListener('mousedown', (e) => { if (e.target === layer) closePop(); });
    document.addEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closePop(); }
  function closePop() { document.querySelectorAll('.pb-poplayer').forEach((x) => x.remove()); document.removeEventListener('keydown', escClose); }
  function addBlock(kind) {
    const b = { id: uid('b'), type: kind, hidden: false, props: defaults(kind) };
    step.blocks.push(b); sel = b.id; paint(); toast(t('Block added'));
    const sc = root.querySelector('.pb-cscroll'); if (sc) sc.scrollTop = sc.scrollHeight;
  }

  // ----------------------------------------------------------------- styles
  const STYLE = '<style>' +
    '.pb{display:flex;flex-direction:column;height:calc(100vh - 132px);min-height:560px}' +
    '.pb-top{display:flex;align-items:center;gap:10px;padding:0 2px 12px}.pb-top .btn{height:32px}.pb-top .btn svg{width:15px;height:15px;margin-right:4px}' +
    '.pb-name{font-size:15px;font-weight:700;color:var(--ink);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pb-lk{font-size:11px;color:var(--ink-muted);font-weight:600;border:1px solid var(--hair);border-radius:5px;padding:2px 8px;margin-left:8px}' +
    '.pb-dev{display:inline-flex;border:1px solid var(--ctl);border-radius:8px;overflow:hidden}.pb-dev button{width:34px;height:30px;border:0;background:#fff;color:var(--ink-muted);cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.pb-dev button.on{background:var(--brand);color:#fff}' +
    '.pb-body{flex:1;min-height:0;display:grid;grid-template-columns:228px 1fr 286px;gap:14px;align-items:stretch}' +
    '.pb-left,.pb-right{border:1px solid var(--hair);border-radius:12px;background:#fff;display:flex;flex-direction:column;min-height:0}.pb-left{padding:12px}.pb-right{overflow:auto}' +
    '.pb-lh{font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px}' +
    '.pb-tree{flex:1;overflow:auto;display:flex;flex-direction:column;gap:5px}' +
    '.pb-row{display:flex;align-items:center;gap:7px;padding:8px 9px;border:1px solid var(--hair);border-radius:9px;background:#fff;cursor:pointer}.pb-row:hover{border-color:var(--brand)}.pb-row.sel{border-color:var(--brand);background:var(--panel)}.pb-row.hid{opacity:.5}' +
    '.pb-row.dragging{opacity:.4}.pb-row.drop-before{box-shadow:0 -2px 0 var(--brand)}.pb-row.drop-after{box-shadow:0 2px 0 var(--brand)}' +
    '.pb-grip{color:#c4cad2;cursor:grab;display:inline-flex;flex:none}.pb-ico{color:var(--brand);display:inline-flex;flex:none}.pb-rn{flex:1;min-width:0;font-size:12.5px;color:var(--ink);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.pb-acts{display:none;gap:1px}.pb-row:hover .pb-acts,.pb-row.sel .pb-acts{display:flex}.pb-acts button{border:0;background:none;color:var(--ink-muted);cursor:pointer;padding:3px;border-radius:6px;display:inline-flex}.pb-acts button:hover{background:#fff;color:var(--ink)}' +
    '.pb-addbtn{margin-top:10px;border:1px dashed var(--ctl);border-radius:9px;background:#fff;color:var(--brand);font-size:12.5px;font-weight:600;padding:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}.pb-addbtn:hover{border-color:var(--brand);background:var(--panel)}' +
    '.pb-center{display:flex;flex-direction:column;min-height:0;border:1px solid var(--hair);border-radius:12px;overflow:hidden;background:var(--panel)}' +
    '.pb-cbar{font-size:11.5px;color:var(--ink-muted);padding:8px 12px;border-bottom:1px solid var(--hair);background:#fff}' +
    '.pb-cscroll{flex:1;overflow:auto;display:flex;justify-content:center;padding:20px}' +
    '.pb-frame{background:#fff;border:1px solid var(--hair);border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(20,30,50,.08);align-self:flex-start;width:440px;max-width:100%}.pb-frame.mobile{width:330px}' +
    '.pb-canvas-empty{padding:60px 20px;text-align:center;color:var(--ink-muted);font-size:13px}' +
    '.pv-block{position:relative;cursor:pointer;border:2px solid transparent}.pv-block:hover{border-color:rgba(91,124,250,.3)}.pv-block.sel{border-color:var(--brand)}' +
    '.pb-rh{display:flex;align-items:center;gap:9px;padding:13px 14px;border-bottom:1px solid var(--hair);position:sticky;top:0;background:#fff;z-index:1}.pb-rico{color:var(--brand);display:inline-flex}.pb-rt{font-size:13.5px;font-weight:700;color:var(--ink)}' +
    '.pb-empty{padding:30px 16px;text-align:center;color:var(--ink-muted);font-size:12.5px}.pb-empty.sm{padding:16px}.pb-info{font-size:12px;color:var(--ink-muted);padding:4px 0}' +
    '.pb-form{padding:14px}.pb-fld{margin-bottom:13px}.pb-fld.row{display:flex;align-items:center;justify-content:space-between}.pb-flab{font-size:12px;color:var(--ink-muted);margin-bottom:5px;display:flex;justify-content:space-between;font-weight:600}.pb-fld.row .pb-flab{margin:0}.pb-fval{color:var(--ink);font-weight:500}' +
    '.pb-in{width:100%;height:34px;border:1px solid var(--ctl);border-radius:8px;padding:0 11px;font-size:13px;color:var(--ink);background:#fff}.pb-ta{height:auto;padding:9px 11px;resize:vertical;line-height:1.5}' +
    '.pb-seg{display:flex;border:1px solid var(--ctl);border-radius:8px;overflow:hidden}.pb-seg button{flex:1;border:0;background:#fff;color:var(--ink-muted);font-size:12px;padding:7px 4px;cursor:pointer;border-left:1px solid var(--ctl)}.pb-seg button:first-child{border-left:0}.pb-seg button.on{background:var(--brand);color:#fff}' +
    '.pb-tg{width:38px;height:21px;border-radius:999px;background:#d6dbe3;position:relative;cursor:pointer;flex:none}.pb-tg i{position:absolute;left:2px;top:2px;width:17px;height:17px;border-radius:50%;background:#fff;transition:left .15s}.pb-tg.on{background:var(--brand)}.pb-tg.on i{left:19px}' +
    '.pb-range{width:100%}.pb-color{display:flex;gap:8px;align-items:center}.pb-sw{width:34px;height:34px;border-radius:8px;border:1px solid var(--ctl);cursor:pointer;flex:none;overflow:hidden;position:relative}.pb-sw input{position:absolute;inset:-4px;width:130%;height:130%;border:0;cursor:pointer}.pb-hex{flex:1;height:34px;border:1px solid var(--ctl);border-radius:8px;padding:0 10px;font-size:12.5px;color:var(--ink);background:#fff}' +
    '.pb-imgf{display:flex;flex-direction:column;gap:7px}.pb-imgp{height:80px;border-radius:8px;background:#e9edf3 center/cover}' +
    '.pb-remove{margin-top:8px;width:100%;border:1px solid var(--hair);background:#fff;color:#c0392b;border-radius:8px;padding:9px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}.pb-remove:hover{background:#fdecec}' +
    '.pb-poplayer{position:fixed;inset:0;z-index:80}.pb-addpop{position:absolute;width:300px;max-height:420px;background:#fff;border:1px solid var(--hair);border-radius:12px;box-shadow:0 16px 50px rgba(20,30,50,.18);display:flex;flex-direction:column;overflow:hidden}' +
    '.pb-addsearch{display:flex;align-items:center;gap:7px;padding:10px 12px;border-bottom:1px solid var(--hair);color:var(--ink-muted)}.pb-addsearch input{flex:1;border:0;outline:0;font-size:13px;color:var(--ink);background:none}' +
    '.pb-addlist{flex:1;overflow:auto;padding:6px}.pb-addgrp{font-size:10.5px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.4px;padding:8px 8px 4px}' +
    '.pb-addrow{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--ink)}.pb-addrow:hover{background:var(--panel)}.pb-addico{color:var(--brand);display:inline-flex}' +
    '.pb-addfoot{display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-muted);padding:8px 12px;border-top:1px solid var(--hair)}' +
    // preview block visuals
    '.pv-hero{padding:30px 22px}.pv-h1{font-size:21px;font-weight:800;line-height:1.2}.pv-hsub{font-size:13px;opacity:.85;margin:7px 0 14px}' +
    '.pv-h2{padding:16px 18px;font-weight:700;color:#1a2233}.pv-tx{padding:12px 18px;font-size:13px;color:#5b6470;line-height:1.6}.pv-img{margin:0;background:#e9edf3}' +
    '.pv-prod{padding:16px 18px;text-align:center}.pv-pimg{height:130px;border-radius:10px;background:#e9edf3;margin-bottom:10px}.pv-pn{font-size:14px;font-weight:600;color:#1a2233}.pv-pp{font-size:15px;margin-top:4px;color:#1a2233}.pv-pp s{color:#9aa3ad;font-weight:400;margin-left:6px}' +
    '.pv-btn{display:inline-flex;align-items:center;justify-content:center;background:#3b6fd4;color:#fff;font-size:13.5px;font-weight:600;border-radius:9px;padding:11px 22px}.pv-btn.full{width:100%;padding:13px}' +
    '.pv-yn{padding:14px 18px;display:flex;flex-direction:column;align-items:center;gap:10px}.pv-no{font-size:12.5px;color:#9aa3ad;text-decoration:underline}' +
    '.pv-bump{margin:12px 18px;padding:12px;border:1.5px dashed #c7d2e8;border-radius:10px;display:flex;align-items:center;gap:11px;background:#f7faff}.pv-cb{width:18px;height:18px;border:2px solid #3b6fd4;border-radius:5px;flex:none}.pv-bt{font-size:13px;font-weight:600;color:#1a2233}.pv-bd{font-size:11.5px;color:#5b6470;margin:2px 0}.pv-bp{font-size:12px;color:#3b6fd4;font-weight:600}' +
    '.pv-timer{margin:10px 18px;padding:9px;text-align:center;background:#fff3e0;color:#b9770e;border-radius:8px;font-size:12.5px;font-weight:600}' +
    '.pv-rev{padding:11px 18px;text-align:center;font-size:13px;font-weight:600;color:#5b6470}.pv-stars{color:#f5b301;letter-spacing:1px}.pv-stars-o{color:#e3e7ee}' +
    '.pv-feat{padding:14px 18px}.pv-ft{font-size:14px;font-weight:700;color:#1a2233;margin-bottom:9px}.pv-fi{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#5b6470;padding:3px 0}.pv-fi svg{color:#1f8f4e;flex:none}' +
    '.pv-logo{padding:14px;text-align:center;font-size:16px;font-weight:800;color:#1a2233;border-bottom:1px solid #eef0f3}' +
    '.pv-form{padding:12px 18px}.pv-fl2{font-size:12.5px;font-weight:700;color:#1a2233;margin-bottom:8px}.pv-input{height:34px;border:1px solid #e3e7ee;border-radius:8px;margin-bottom:8px;background:#fafbfd}' +
    '.pv-cart{padding:12px 18px;background:#fafbfd}.pv-row{display:flex;justify-content:space-between;font-size:12.5px;color:#5b6470;padding:3px 0}.pv-row.total{font-weight:700;color:#1a2233;border-top:1px solid #e3e7ee;margin-top:6px;padding-top:8px}' +
    '.pv-track{padding:14px 18px}.pv-tbar{height:6px;border-radius:999px;background:linear-gradient(90deg,#3b6fd4 55%,#e3e7ee 55%)}' +
    '@media(max-width:1100px){.pb-body{grid-template-columns:1fr}}' +
  '</style>';
})();
