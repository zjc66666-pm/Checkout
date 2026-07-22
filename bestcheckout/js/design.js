/* BestCheckout — page-design editor (Checkout 装修 / Thank-you 装修).
   Mirrors the production one-page-checkout block model (reference/bestvoy-admin
   .../products/templateData/checkoutInitial.ts) + storefront look (shop-pc
   payment checkout component): a 3-pane editor — Page Structure tree (left), live
   preview that looks like the real one-page checkout (middle), Component
   Settings (right). Loaded on demand by app.js; exposes window.BC_DESIGN.
   Block model: groups → blocks {id,type,name,settings}. Two page types:
   'checkout' and 'thankyou' (thank-you has no production builder — net-new here). */
(function () {
  // Register the editor's UI strings into the global runtime-i18n overlay (zh default).
  if (window.I18N && window.I18N.extend) window.I18N.extend({
    'Checkout design': '结账页装修', 'Thank-you design': '致谢页装修',
    'Page Structure': '页面结构', 'Component Settings': '组件设置', 'Discard': '放弃', 'Save': '保存', 'Exit': '退出',
    'Header': '页头', 'Body · Main': '主体 · 主区', 'Body · Sidebar': '主体 · 侧栏', 'Reviews': '评价', 'Footer': '页脚', 'Body': '主体',
    'Announcement bar': '公告条', 'Image slider': '图片轮播', 'Bundle': '套餐选择', 'Upsell': '加购 (Upsell)',
    'Payment section': '支付区', 'Trust badges': '信任徽章', 'Confirmation': '下单确认', 'Order summary': '订单摘要',
    'Shipment tracking': '物流追踪', 'Post-purchase offer': '购后加购', 'You may also like': '猜你喜欢',
    'Select a block on the left to edit it.': '在左侧选择一个区块来编辑。',
    'Text': '文字', 'Background': '背景色', 'Text color': '文字颜色', 'Height (px)': '高度 (px)',
    'Slides': '轮播图', 'Add slide': '添加图片', 'Step title': '步骤标题', 'Currency': '货币符号',
    'Offers (bundle tiers)': '套餐档位', 'Add tier': '添加档位', 'Title': '标题', 'Subtitle': '副标题',
    'Price': '价格', 'Compare-at': '原价', 'Badge': '角标', 'Free shipping': '免邮', 'Default': '默认选中',
    'Variant options': '变体选项', 'Section title': '区块标题', 'Add-on items': '加购商品', 'Add item': '添加商品',
    'Express checkout': '快捷支付', 'Show express buttons (PayPal / Link / Amazon Pay)': '显示快捷支付按钮 (PayPal / Link / Amazon Pay)',
    'Badges': '徽章', 'Add badge': '添加徽章', 'Overall rating': '综合评分', 'Review count': '评价数',
    'Reviews list': '评价列表', 'Add review': '添加评价', 'Author': '作者', 'Stars': '星级', 'Logo': 'Logo',
    'Email': '邮箱', 'Copyright': '版权', 'Footer links': '页脚链接', 'Add link': '添加链接', 'Label': '文字', 'URL': '链接',
    'Headline': '大标题', 'Saved': '已保存', 'Changes discarded': '已放弃更改', 'Block removed': '已删除区块', 'Added': '已添加',
    'Order #1042 is confirmed': '订单 #1042 已确认', 'Thank you for your order!': '感谢你的下单！',
    'This page is new in BestCheckout — Shopify has no thank-you builder. Same block engine as Checkout.': '致谢页是 BestCheckout 新增的——Shopify 没有致谢页装修器。复用结账页同一套区块引擎。',
    'Live preview · external checkout': '实时预览 · 站外结账',
  });

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var toast = function (m) { var t = document.createElement('div'); t.textContent = m; t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#242833;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:90'; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1600); };
  var uid = function () { return 'b' + Math.floor(Math.random() * 1e6); };

  // ---------- default block trees ----------
  function defaultCheckout() {
    return { groups: [
      { key: 'header', label: 'Header', blocks: [
        { id: 'an', type: 'announcement', name: 'Announcement bar', settings: { text: 'Free Shipping for $49!', bg: '#000000', color: '#ffffff', height: 44 } },
        { id: 'bn', type: 'banner', name: 'Image slider', settings: { slides: [{ image: '' }, { image: '' }] } },
      ] },
      { key: 'main', label: 'Body · Main', blocks: [
        { id: 'bd', type: 'bundle', name: 'Bundle', settings: { stepTitle: 'Step 1: Choose Your Bundles', currency: '$', variants: 'Color', offers: [
          { qty: 1, title: 'Buy 1, Get 1 FREE', sub: '2 Collagen Face Wraps', price: '39.90', compareAt: '79.80', badge: '', free: false, def: false },
          { qty: 2, title: 'Buy 2, Get 2 FREE', sub: '4 Collagen Face Wraps', price: '55.90', compareAt: '159.60', badge: 'BEST SELLER', free: true, def: false },
          { qty: 3, title: 'Buy 3, Get 3 FREE', sub: '$11.6 each for 6 Collagen Wraps', price: '69.90', compareAt: '239.40', badge: 'BEST DEAL', free: true, def: true },
        ] } },
        { id: 'ad', type: 'addon', name: 'Upsell', settings: { title: 'Customers Also Grabbed', items: [
          { name: 'Tech Neck Rescue Cream', price: '19.9', compareAt: '49', checked: false },
          { name: 'Anti-Wrinkle Facial Patches', price: '15.9', compareAt: '', checked: false },
        ] } },
      ] },
      { key: 'sidebar', label: 'Body · Sidebar', blocks: [
        { id: 'pm', type: 'payment', name: 'Payment section', settings: { express: true } },
        { id: 'tb', type: 'trust', name: 'Trust badges', settings: { badges: [
          { title: '30-DAYS MONEY-BACK GUARANTEE' }, { title: 'FREE RETURNS, NO QUESTIONS ASKED' },
        ] } },
      ] },
      { key: 'reviews', label: 'Reviews', blocks: [
        { id: 'rv', type: 'reviews', name: 'Reviews', settings: { rating: '4.9', count: 22, items: [
          { name: 'Ava', stars: 5, text: 'I could feel the support as soon as I put it on. My face looked more held.' },
          { name: 'Grace', stars: 5, text: 'It gives my jaw area a more defined look when I wear it.' },
          { name: 'Eva', stars: 5, text: 'I like how it gently holds everything in place. Subtle but noticeable.' },
        ] } },
      ] },
      { key: 'footer', label: 'Footer', blocks: [
        { id: 'ft', type: 'footer', name: 'Footer', settings: { email: 'support@lavenderlabs.co', copyright: '© 2026 Lavender Labs. All rights reserved.', links: [
          { label: 'Terms of Service' }, { label: 'Privacy Policy' }, { label: 'Refund policy' }, { label: 'Contact Us' },
        ] } },
      ] },
    ] };
  }
  function defaultThankyou() {
    return { groups: [
      { key: 'header', label: 'Header', blocks: [
        { id: 'an', type: 'announcement', name: 'Announcement bar', settings: { text: 'Your order is confirmed — a receipt is on its way.', bg: '#1f8f4e', color: '#ffffff', height: 44 } },
      ] },
      { key: 'body', label: 'Body', blocks: [
        { id: 'cf', type: 'confirm', name: 'Confirmation', settings: { title: 'Thank you for your order!', sub: 'Order #1042 is confirmed' } },
        { id: 'os', type: 'summary', name: 'Order summary', settings: {} },
        { id: 'tk', type: 'tracking', name: 'Shipment tracking', settings: {} },
        { id: 'pp', type: 'postpurchase', name: 'Post-purchase offer', settings: { title: 'You may also like', name: 'Calm Tea — 30ct', price: '16.00', compareAt: '24.00' } },
        { id: 'rv', type: 'reviews', name: 'Reviews', settings: { rating: '4.9', count: 22, items: [
          { name: 'Ava', stars: 5, text: 'I could feel the support as soon as I put it on.' },
          { name: 'Grace', stars: 5, text: 'Gives my jaw a more defined look.' },
        ] } },
      ] },
      { key: 'footer', label: 'Footer', blocks: [
        { id: 'ft', type: 'footer', name: 'Footer', settings: { email: 'support@lavenderlabs.co', copyright: '© 2026 Lavender Labs. All rights reserved.', links: [{ label: 'Contact Us' }, { label: 'Track order' }] } },
      ] },
    ] };
  }

  var STATE = { checkout: null, thankyou: null };
  var sel = null, device = 'desktop', pageType = 'checkout', host = null;
  function design() { return STATE[pageType]; }
  function allBlocks() { var a = []; design().groups.forEach(function (g) { g.blocks.forEach(function (b) { a.push(b); }); }); return a; }
  function findBlock(id) { var r = null; allBlocks().forEach(function (b) { if (b.id === id) r = b; }); return r; }

  var STYLE = '<style>' +
    '.df-full{position:fixed;inset:0;z-index:60;background:#fff;display:flex;flex-direction:column}' +
    '.df-note{padding:8px 14px;border-bottom:1px solid var(--hair);background:var(--panel)}' +
    '.df-bar{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--hair);background:var(--panel)}' +
    '.df-bar .nm{font-size:13.5px;font-weight:700;color:var(--ink)}.df-bar .gap{flex:1}' +
    '.df-dev{display:inline-flex;border:1px solid var(--ctl);border-radius:8px;overflow:hidden}.df-dev button{border:0;background:#fff;cursor:pointer;padding:5px 10px;color:var(--ink-muted);font-size:13px}.df-dev button.on{background:var(--brand);color:#fff}' +
    '.df-body{display:grid;grid-template-columns:236px 1fr 290px;flex:1;min-height:0}' +
    '.df-tree{border-right:1px solid var(--hair);overflow:auto;padding:12px 10px;background:#fff}' +
    '.df-tree .tt{font-size:12px;font-weight:700;color:var(--ink);padding:6px 6px 4px}' +
    '.df-grp{font-size:10.5px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.4px;margin:10px 6px 3px}' +
    '.df-it{display:flex;align-items:center;gap:8px;padding:8px 9px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--ink)}.df-it:hover{background:var(--panel)}.df-it.on{background:#eef4ff;color:var(--brand);font-weight:600}' +
    '.df-it .dot{width:6px;height:6px;border-radius:50%;background:#c4cad2;flex:none}.df-it.on .dot{background:var(--brand)}' +
    '.df-canvas{overflow:auto;background:#eef1f5;display:flex;justify-content:center;padding:18px}' +
    '.df-frame{background:#fff;width:100%;min-width:740px;max-width:940px;border-radius:10px;overflow:hidden;box-shadow:0 6px 24px rgba(20,30,50,.10)}.df-frame.mob{min-width:0;max-width:390px}' +
    '.df-set{border-left:1px solid var(--hair);overflow:auto;padding:14px;background:#fff}' +
    '.df-set .st{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:3px}.df-set .sh{font-size:11.5px;color:var(--ink-muted);margin-bottom:12px;line-height:1.5}' +
    '.fld{margin-bottom:12px}.fld .fl{font-size:12px;color:var(--ink-muted);margin-bottom:5px;display:block}' +
    '.fi{width:100%;height:34px;border:1px solid var(--ctl);border-radius:8px;padding:0 10px;font-size:13px;color:var(--ink);background:#fff}' +
    '.fi[type=color]{padding:3px;height:34px}' +
    '.df-rep{border:1px solid var(--hair);border-radius:9px;padding:9px;margin-bottom:8px}.df-rep .rh{display:flex;align-items:center;gap:8px;margin-bottom:8px}.df-rep .rh .rt{flex:1;font-size:12px;font-weight:600;color:var(--ink)}' +
    '.df-rep button.x{border:0;background:none;color:var(--ink-muted);cursor:pointer;font-size:16px;line-height:1;padding:0 4px}.df-rep button.x:hover{color:#c0392b}' +
    '.df-add{border:1px dashed var(--ctl);border-radius:8px;background:#fff;color:var(--brand);font-size:12.5px;padding:7px;width:100%;cursor:pointer}.df-add:hover{background:var(--panel)}' +
    '.df-tog{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink);cursor:pointer;margin:6px 0}.df-tog .sw{width:34px;height:19px;border-radius:999px;background:#d6dbe3;position:relative;flex:none}.df-tog .sw::after{content:"";position:absolute;left:2px;top:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:left .15s}.df-tog.on .sw{background:var(--brand)}.df-tog.on .sw::after{left:17px}' +
    // ---- storefront-look preview ----
    '.co{font-family:Inter,system-ui,sans-serif;color:#1a2233}.co .ann{text-align:center;font-size:12.5px;font-weight:600;padding:11px}' +
    '.co .ban{height:150px;background:linear-gradient(120deg,#e7d6b8,#f2e6cf);display:flex;align-items:center;justify-content:center;color:#9a8a66;font-size:12px}' +
    '.co .wrap{display:grid;grid-template-columns:1fr 360px;gap:22px;padding:20px}.co .wrap>div{min-width:0}.co.mob .wrap{grid-template-columns:1fr}' +
    '.co .stp{font-size:15px;font-weight:700;margin:0 0 12px}' +
    '.co .off{border:1.5px solid #e3e7ee;border-radius:11px;padding:13px 14px;margin-bottom:10px;position:relative;cursor:pointer}.co .off.on{border-color:#111}.co .off .rd{width:16px;height:16px;border:2px solid #c4cad2;border-radius:50%;flex:none}.co .off.on .rd{border-color:#111;background:radial-gradient(#111 40%,#fff 45%)}' +
    '.co .off .ohead{display:flex;align-items:center;gap:9px}.co .off .ti{flex:1;min-width:0;font-size:13.5px;font-weight:700}.co .off .su{font-size:11.5px;color:#6d7175;margin-top:4px;margin-left:25px}.co .off .pr{flex:none;font-size:15px;font-weight:700;white-space:nowrap}.co .off .pr s{color:#9aa3ad;font-weight:400;font-size:12px;margin-left:5px}' +
    '.co .bdg{position:absolute;right:0;top:-9px;background:#111;color:#fff;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:4px}' +
    '.co .fs{display:inline-block;font-size:10px;font-weight:700;color:#1f8f4e;background:#e7f7ee;border-radius:4px;padding:1px 6px;margin-left:6px;vertical-align:middle}' +
    '.co .varrow{display:flex;align-items:center;gap:8px;margin:7px 0 0 25px}.co .varsel{flex:1;height:30px;border:1px solid #e3e7ee;border-radius:7px;font-size:12px;color:#6d7175;display:flex;align-items:center;padding:0 9px}.co .swatch{width:26px;height:26px;border-radius:6px;background:#e9e2d4;flex:none}' +
    '.co .addon{border:1px solid #e3e7ee;border-radius:11px;padding:13px;margin-top:14px}.co .addon .at{font-size:13px;font-weight:700;margin-bottom:9px}.co .addon .ai{display:flex;align-items:center;gap:10px;font-size:12.5px;padding:7px 0;border-top:1px solid #f0f0f3}.co .addon .ai:first-of-type{border-top:0}.co .cb{width:16px;height:16px;border:2px solid #c4cad2;border-radius:4px;flex:none}.co .aimg{width:34px;height:34px;border-radius:6px;background:#e9edf3;flex:none}.co .ai .anm{flex:1}.co .ap{font-weight:700}.co .ap s{color:#9aa3ad;font-weight:400;font-size:11px;margin-left:4px}' +
    '.co .exp{text-align:center;font-size:12px;color:#6d7175;margin-bottom:9px}.co .epp{height:38px;border-radius:8px;background:#ffc439;display:flex;align-items:center;justify-content:center;font-weight:800;color:#003087;font-size:14px;margin-bottom:8px}.co .erow{display:flex;gap:8px}.co .elink{flex:1;height:36px;border-radius:8px;background:#0e1b2a;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center}.co .eama{flex:1;height:36px;border-radius:8px;background:#ffd814;color:#111;font-size:12px;display:flex;align-items:center;justify-content:center;font-weight:700}' +
    '.co .or{display:flex;align-items:center;gap:10px;color:#9aa3ad;font-size:11px;margin:12px 0}.co .or::before,.co .or::after{content:"";flex:1;height:1px;background:#e3e7ee}' +
    '.co .lbl{font-size:12.5px;font-weight:700;margin:12px 0 7px}.co .inp{height:36px;border:1px solid #e3e7ee;border-radius:8px;background:#fff;margin-bottom:8px;display:flex;align-items:center;padding:0 11px;color:#9aa3ad;font-size:12.5px}.co .two{display:flex;gap:8px}.co .two .inp{flex:1}' +
    '.co .card{border:1px solid #e3e7ee;border-radius:9px;padding:11px;margin-bottom:10px}.co .card .ch{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;margin-bottom:8px}' +
    '.co .pay{height:44px;border-radius:9px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;letter-spacing:.5px}' +
    '.co .tb{display:flex;gap:9px;margin-top:12px}.co .tbi{flex:1;border:1px solid #e3e7ee;border-radius:8px;padding:9px;font-size:10.5px;color:#5b6470;display:flex;align-items:center;gap:7px}.co .tbi .ic{width:20px;height:20px;border-radius:5px;background:#eef2f7;flex:none}' +
    '.co .rev{border-top:1px solid #eee;padding:18px 20px;text-align:center}.co .rev .sc{font-size:22px;font-weight:800}.co .rev .st{color:#f5b301;letter-spacing:2px;font-size:15px}.co .rev .ct{font-size:11.5px;color:#6d7175;margin-bottom:12px}.co .rev .ri{text-align:left;border-top:1px solid #f0f0f3;padding:10px 0;font-size:12px}.co .rev .rn{font-weight:700}.co .rev .rs{color:#1f8f4e;font-size:12px}' +
    '.co .ft{background:#f6f6f6;padding:18px 20px;text-align:center}.co .ft .fl2{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-size:11.5px;color:#5b6470;margin:8px 0}.co .ft .cp{font-size:11px;color:#9aa3ad}' +
    // thank-you preview
    '.co .ty{padding:26px 22px;text-align:center}.co .ty .ck{width:54px;height:54px;border-radius:50%;background:#e7f7ee;color:#1f8f4e;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:26px}.co .ty h2{font-size:20px;font-weight:800;margin:0}.co .ty p{color:#6d7175;font-size:13px;margin-top:5px}' +
    '.co .sec{border:1px solid #e3e7ee;border-radius:11px;margin:14px 20px;padding:14px}.co .sec .sh2{font-size:13px;font-weight:700;margin-bottom:9px}.co .row{display:flex;justify-content:space-between;font-size:12.5px;color:#5b6470;padding:3px 0}.co .row.tot{font-weight:700;color:#1a2233;border-top:1px solid #e3e7ee;margin-top:6px;padding-top:8px}.co .bar{height:6px;border-radius:999px;background:linear-gradient(90deg,#1f8f4e 55%,#e3e7ee 55%)}' +
    '@media(max-width:1180px){.df-body{grid-template-columns:200px 1fr 250px}}' +
  '</style>';

  function deviceToggle() {
    return '<div class="df-dev"><button data-dev="desktop" class="' + (device === 'desktop' ? 'on' : '') + '">🖥</button><button data-dev="mobile" class="' + (device === 'mobile' ? 'on' : '') + '">📱</button></div>';
  }
  function tree() {
    var html = '<div class="tt">' + t('Page Structure') + '</div>';
    design().groups.forEach(function (g) {
      html += '<div class="df-grp">' + t(g.label) + '</div>';
      g.blocks.forEach(function (b) {
        html += '<div class="df-it' + (b.id === sel ? ' on' : '') + '" data-bid="' + b.id + '"><span class="dot"></span>' + t(b.name) + '</div>';
      });
    });
    return html;
  }

  // ---------- preview renderers ----------
  function pv(b) {
    var s = b.settings || {};
    switch (b.type) {
      case 'announcement': return '<div class="ann" style="background:' + esc(s.bg) + ';color:' + esc(s.color) + '">' + esc(s.text) + '</div>';
      case 'banner': return '<div class="ban">' + (s.slides && s.slides.length ? (s.slides.length + ' 张图片轮播') : 'banner') + '</div>';
      case 'bundle': return pvBundle(s);
      case 'addon': return pvAddon(s);
      case 'payment': return pvPayment(s);
      case 'trust': return pvTrust(s);
      case 'reviews': return pvReviews(s);
      case 'footer': return pvFooter(s);
      case 'confirm': return '<div class="ty"><div class="ck">✓</div><h2>' + esc(s.title) + '</h2><p>' + esc(s.sub) + '</p></div>';
      case 'summary': return '<div class="sec"><div class="sh2">' + t('Order summary') + '</div><div class="row"><span>2× Collagen Face Wrap</span><span>$55.90</span></div><div class="row"><span>Shipping</span><span>Free</span></div><div class="row tot"><span>Total</span><span>$55.90</span></div></div>';
      case 'tracking': return '<div class="sec"><div class="sh2">' + t('Shipment tracking') + '</div><div class="bar"></div><div class="row" style="margin-top:7px"><span>Order placed</span><span>Out for delivery</span></div></div>';
      case 'postpurchase': return '<div class="sec" style="border-color:#c7d2e8;background:#f7faff"><div class="sh2">' + esc(s.title) + '</div><div class="ai" style="display:flex;align-items:center;gap:10px"><span class="aimg"></span><div class="anm" style="flex:1"><b>' + esc(s.name) + '</b></div><span class="ap">$' + esc(s.price) + (s.compareAt ? ' <s>$' + esc(s.compareAt) + '</s>' : '') + '</span><span class="pay" style="height:30px;padding:0 12px;font-size:12px">+ Add</span></div></div>';
      default: return '';
    }
  }
  function pvBundle(s) {
    var cur = s.currency || '$';
    var offers = (s.offers || []).map(function (o) {
      var on = !!o.def;
      return '<div class="off' + (on ? ' on' : '') + '">' + (o.badge ? '<span class="bdg">' + esc(o.badge) + '</span>' : '') +
        '<div class="ohead"><span class="rd"></span><div class="ti">' + esc(o.title) + (o.free ? ' <span class="fs">Free Shipping</span>' : '') + '</div>' +
        '<div class="pr">' + cur + esc(o.price) + (o.compareAt ? '<s>' + cur + esc(o.compareAt) + '</s>' : '') + '</div></div>' +
        '<div class="su">' + esc(o.sub) + '</div>' +
        (on ? '<div class="varrow"><span class="swatch"></span><span class="varsel">' + esc(s.variants || 'Color') + ' — Pale-Apricot</span></div>' : '') +
        '</div>';
    }).join('');
    return '<div><div class="stp">' + esc(s.stepTitle) + '</div>' + offers + '</div>';
  }
  function pvAddon(s) {
    var items = (s.items || []).map(function (i) {
      return '<div class="ai"><span class="cb"></span><span class="aimg"></span><span class="anm">' + esc(i.name) + '</span><span class="ap">$' + esc(i.price) + (i.compareAt ? ' <s>$' + esc(i.compareAt) + '</s>' : '') + '</span></div>';
    }).join('');
    return '<div class="addon"><div class="at">' + esc(s.title) + '</div>' + items + '</div>';
  }
  function pvPayment(s) {
    var express = s.express ? '<div class="exp">Express Checkout</div><div class="epp">PayPal</div><div class="erow"><span class="elink">Pay with link</span><span class="eama">amazon pay</span></div><div class="or">OR</div>' : '';
    return express +
      '<div class="lbl">Contact</div><div class="inp">Email</div>' +
      '<div class="lbl">Delivery</div><div class="inp">Country / Region</div><div class="two"><div class="inp">First name</div><div class="inp">Last name</div></div><div class="inp">Address</div>' +
      '<div class="card"><div class="ch">● Card</div><div class="inp">1234 1234 1234 1234</div><div class="two"><div class="inp">MM / YY</div><div class="inp">CVC</div></div></div>' +
      '<div class="pay">PAY NOW</div>';
  }
  function pvTrust(s) {
    return '<div class="tb">' + (s.badges || []).map(function (b) { return '<div class="tbi"><span class="ic"></span>' + esc(b.title) + '</div>'; }).join('') + '</div>';
  }
  function pvReviews(s) {
    var items = (s.items || []).map(function (r) {
      return '<div class="ri"><span class="rn">' + esc(r.name) + '</span> · <span class="rs">' + '★★★★★'.slice(0, r.stars || 5) + '</span><div style="color:#5b6470;margin-top:3px">' + esc(r.text) + '</div></div>';
    }).join('');
    return '<div class="rev"><div class="sc">★ ' + esc(s.rating) + '</div><div class="ct">' + esc(s.count) + ' Reviews</div>' + items + '</div>';
  }
  function pvFooter(s) {
    return '<div class="ft"><div style="font-weight:800">LAVENDER LABS</div><div class="fl2">' + (s.links || []).map(function (l) { return esc(l.label); }).join('') ? '<div class="ft"><div style="font-weight:800">LAVENDER LABS</div><div class="fl2">' + (s.links || []).map(function (l) { return '<span>' + esc(l.label) + '</span>'; }).join('') + '</div><div class="cp">' + esc(s.copyright) + '</div></div>' : '';
  }

  function preview() {
    var d = design(), html = '<div class="co' + (device === 'mobile' ? ' mob' : '') + '">';
    var byKey = {}; d.groups.forEach(function (g) { byKey[g.key] = g; });
    // header
    (byKey.header ? byKey.header.blocks : []).forEach(function (b) { html += pv(b); });
    if (byKey.main || byKey.sidebar) {
      html += '<div class="wrap"><div class="col-main">' + (byKey.main ? byKey.main.blocks : []).map(pv).join('') + '</div>' +
        '<div class="col-side">' + (byKey.sidebar ? byKey.sidebar.blocks : []).map(pv).join('') + '</div></div>';
    }
    if (byKey.body) html += '<div style="padding:6px 0">' + byKey.body.blocks.map(pv).join('') + '</div>';
    (byKey.reviews ? byKey.reviews.blocks : []).forEach(function (b) { html += pv(b); });
    (byKey.footer ? byKey.footer.blocks : []).forEach(function (b) { html += pv(b); });
    return html + '</div>';
  }

  // ---------- settings forms ----------
  function fld(label, key, val, type) { return '<div class="fld"><label class="fl">' + t(label) + '</label><input class="fi" data-k="' + key + '"' + (type ? ' type="' + type + '"' : '') + ' value="' + esc(val == null ? '' : val) + '"></div>'; }
  function tog(label, key, on) { return '<div class="df-tog' + (on ? ' on' : '') + '" data-tog="' + key + '"><span class="sw"></span>' + t(label) + '</div>'; }
  function repItem(title, inner, path) { return '<div class="df-rep"><div class="rh"><span class="rt">' + esc(title) + '</span><button class="x" data-del="' + path + '">×</button></div>' + inner + '</div>'; }

  function settings(b) {
    if (!b) return '<div class="st">' + t('Component Settings') + '</div><div class="sh">' + t('Select a block on the left to edit it.') + '</div>';
    var s = b.settings || {}, h = '<div class="st">' + t(b.name) + '</div>';
    switch (b.type) {
      case 'announcement':
        h += fld('Text', 'text', s.text) + fld('Background', 'bg', s.bg, 'color') + fld('Text color', 'color', s.color, 'color') + fld('Height (px)', 'height', s.height, 'number'); break;
      case 'banner':
        h += '<div class="sh">' + t('Slides') + '</div>' + (s.slides || []).map(function (sl, i) { return repItem('#' + (i + 1), fld('URL', 'slides.' + i + '.image', sl.image), 'slides.' + i); }).join('') + '<button class="df-add" data-add="slides">+ ' + t('Add slide') + '</button>'; break;
      case 'bundle':
        h += fld('Step title', 'stepTitle', s.stepTitle) + fld('Currency', 'currency', s.currency) + fld('Variant options', 'variants', s.variants) +
          '<div class="fl" style="margin:10px 0 6px;font-weight:600;color:var(--ink)">' + t('Offers (bundle tiers)') + '</div>' +
          (s.offers || []).map(function (o, i) {
            return repItem(o.title || ('Tier ' + (i + 1)), fld('Title', 'offers.' + i + '.title', o.title) + fld('Subtitle', 'offers.' + i + '.sub', o.sub) + '<div class="two" style="display:flex;gap:8px">' + fld('Price', 'offers.' + i + '.price', o.price) + fld('Compare-at', 'offers.' + i + '.compareAt', o.compareAt) + '</div>' + fld('Badge', 'offers.' + i + '.badge', o.badge) + tog('Free shipping', 'offers.' + i + '.free', o.free) + tog('Default', 'offers.' + i + '.def', o.def), 'offers.' + i);
          }).join('') + '<button class="df-add" data-add="offers">+ ' + t('Add tier') + '</button>'; break;
      case 'addon':
        h += fld('Section title', 'title', s.title) + '<div class="fl" style="margin:10px 0 6px;font-weight:600;color:var(--ink)">' + t('Add-on items') + '</div>' +
          (s.items || []).map(function (it, i) { return repItem(it.name, fld('Title', 'items.' + i + '.name', it.name) + '<div class="two" style="display:flex;gap:8px">' + fld('Price', 'items.' + i + '.price', it.price) + fld('Compare-at', 'items.' + i + '.compareAt', it.compareAt) + '</div>', 'items.' + i); }).join('') + '<button class="df-add" data-add="items">+ ' + t('Add item') + '</button>'; break;
      case 'payment':
        h += '<div class="sh">' + t('Express checkout') + '</div>' + tog('Show express buttons (PayPal / Link / Amazon Pay)', 'express', s.express); break;
      case 'trust':
        h += '<div class="sh">' + t('Badges') + '</div>' + (s.badges || []).map(function (bd, i) { return repItem('#' + (i + 1), fld('Title', 'badges.' + i + '.title', bd.title), 'badges.' + i); }).join('') + '<button class="df-add" data-add="badges">+ ' + t('Add badge') + '</button>'; break;
      case 'reviews':
        h += '<div class="two" style="display:flex;gap:8px">' + fld('Overall rating', 'rating', s.rating) + fld('Review count', 'count', s.count, 'number') + '</div><div class="fl" style="margin:10px 0 6px;font-weight:600;color:var(--ink)">' + t('Reviews list') + '</div>' +
          (s.items || []).map(function (r, i) { return repItem(r.name, fld('Author', 'items.' + i + '.name', r.name) + fld('Stars', 'items.' + i + '.stars', r.stars, 'number') + fld('Text', 'items.' + i + '.text', r.text), 'items.' + i); }).join('') + '<button class="df-add" data-add="items">+ ' + t('Add review') + '</button>'; break;
      case 'footer':
        h += fld('Email', 'email', s.email) + fld('Copyright', 'copyright', s.copyright) + '<div class="fl" style="margin:10px 0 6px;font-weight:600;color:var(--ink)">' + t('Footer links') + '</div>' +
          (s.links || []).map(function (l, i) { return repItem(l.label, fld('Label', 'links.' + i + '.label', l.label), 'links.' + i); }).join('') + '<button class="df-add" data-add="links">+ ' + t('Add link') + '</button>'; break;
      case 'confirm': h += fld('Headline', 'title', s.title) + fld('Subtitle', 'sub', s.sub); break;
      case 'postpurchase': h += fld('Section title', 'title', s.title) + fld('Title', 'name', s.name) + '<div class="two" style="display:flex;gap:8px">' + fld('Price', 'price', s.price) + fld('Compare-at', 'compareAt', s.compareAt) + '</div>'; break;
      default: h += '<div class="sh">No editable settings.</div>';
    }
    return h;
  }

  // ---------- mutation helpers ----------
  function setPath(b, path, val) { var parts = path.split('.'), o = b.settings; for (var i = 0; i < parts.length - 1; i++) { var k = parts[i]; if (/^\d+$/.test(k)) k = +k; o = o[k]; } var last = parts[parts.length - 1]; o[/^\d+$/.test(last) ? +last : last] = val; }
  function getArr(b, name) { return b.settings[name]; }
  function delPath(b, path) { var parts = path.split('.'); if (parts.length === 2) { b.settings[parts[0]].splice(+parts[1], 1); } }
  function addTo(b, name) {
    var arr = b.settings[name] || (b.settings[name] = []);
    var tmpl = { slides: { image: '' }, offers: { qty: 1, title: 'New tier', sub: '', price: '0.00', compareAt: '', badge: '', free: false, def: false }, items: (b.type === 'reviews' ? { name: 'New', stars: 5, text: '' } : { name: 'New item', price: '0.00', compareAt: '' }), badges: { title: 'NEW BADGE' }, links: { label: 'New link' } };
    arr.push(JSON.parse(JSON.stringify(tmpl[name] || {})));
  }

  // ---------- render / wire ----------
  function paint() {
    host.querySelector('#df-tree').innerHTML = tree();
    host.querySelector('#df-frame').innerHTML = preview();
    host.querySelector('#df-set').innerHTML = settings(findBlock(sel));
    host.querySelector('#df-frame').className = 'df-frame' + (device === 'mobile' ? ' mob' : '');
    wire();
    if (window.I18N && window.I18N.apply) window.I18N.apply(host);
  }
  function wire() {
    host.querySelectorAll('[data-bid]').forEach(function (el) { el.onclick = function () { sel = el.getAttribute('data-bid'); paint(); }; });
    host.querySelectorAll('[data-dev]').forEach(function (el) { el.onclick = function () { device = el.getAttribute('data-dev'); paint(); }; });
    var b = findBlock(sel);
    host.querySelectorAll('#df-set [data-k]').forEach(function (inp) {
      inp.oninput = function () { if (!b) return; var v = inp.type === 'number' ? (inp.value === '' ? '' : +inp.value) : inp.value; setPath(b, inp.getAttribute('data-k'), v); host.querySelector('#df-frame').innerHTML = preview(); }; });
    host.querySelectorAll('#df-set [data-tog]').forEach(function (tg) { tg.onclick = function () { if (!b) return; var k = tg.getAttribute('data-tog'); setPath(b, k, !pathVal(b, k)); paint(); }; });
    host.querySelectorAll('#df-set [data-del]').forEach(function (x) { x.onclick = function () { if (!b) return; delPath(b, x.getAttribute('data-del')); paint(); toast(t('Block removed')); }; });
    host.querySelectorAll('#df-set [data-add]').forEach(function (a) { a.onclick = function () { if (!b) return; addTo(b, a.getAttribute('data-add')); paint(); toast(t('Added')); }; });
    var bk = host.querySelector('#df-back'); if (bk) bk.onclick = function () { location.hash = '#/bestcheckout'; };
    var sv = host.querySelector('#df-save'); if (sv) sv.onclick = function () { toast(t('Saved')); };
    var dc = host.querySelector('#df-discard'); if (dc) dc.onclick = function () { STATE[pageType] = pageType === 'thankyou' ? defaultThankyou() : defaultCheckout(); sel = null; paint(); toast(t('Changes discarded')); };
  }
  function pathVal(b, path) { var parts = path.split('.'), o = b.settings; for (var i = 0; i < parts.length; i++) { var k = parts[i]; o = o[/^\d+$/.test(k) ? +k : k]; } return o; }
  function t(s) { return (window.I18N && window.I18N.t) ? window.I18N.t(s) : s; }

  window.BC_DESIGN = {
    render: function (rootEl, pt) {
      host = rootEl; pageType = (pt === 'thankyou') ? 'thankyou' : 'checkout'; sel = null;
      if (!STATE[pageType]) STATE[pageType] = pageType === 'thankyou' ? defaultThankyou() : defaultCheckout();
      var title = pageType === 'thankyou' ? 'Thank-you design' : 'Checkout design';
      var noteTxt = pageType === 'thankyou' ? t('This page is new in BestCheckout — Shopify has no thank-you builder. Same block engine as Checkout.') : '';
      rootEl.innerHTML = STYLE +
        '<div class="df-full"><div class="df-bar"><button class="btn btn-default" id="df-back">← ' + t('Exit') + '</button><span class="nm">BestCheckout · ' + t(title) + '　·　' + t('Live preview · external checkout') + '</span><span class="gap"></span>' + deviceToggle() +
          '<button class="btn btn-default" id="df-discard">' + t('Discard') + '</button><button class="btn btn-primary" id="df-save">' + t('Save') + '</button></div>' +
          (noteTxt ? '<div class="df-note" style="font-size:12px;color:var(--ink-muted)">' + noteTxt + '</div>' : '') +
          '<div class="df-body"><div class="df-tree" id="df-tree"></div><div class="df-canvas"><div class="df-frame" id="df-frame"></div></div><div class="df-set" id="df-set"></div></div>' +
        '</div>';
      paint();
    },
  };
})();
