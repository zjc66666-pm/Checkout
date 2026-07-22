/* BestCheckout module — the Checkout-Champ-style layer on BestShopio, built as an
   "增强式" Shopify-connect App: external high-converting checkout + multi-MID payment
   routing (ATRI) + native subscriptions + post-purchase upsell, syncing back to Shopify.
   Chrome (sidebar + header) is injected by ../assets/shell.js; this file renders the
   module body into #root and registers window.VIEWS.bestcheckout. Mirrors the page
   pattern of the other modules (page-title / panel / tbl / filter-select / pagination). */
(function () {
  const D = window.DATA_BC;
  let root, chart = null;
  let performanceRange = '30d';
  let dnsVerifyAttempts = 0;
  let flowListState = { filter: 'all', page: 1, size: 20 };
  // Shopify-connected state. The merchant always sees the FULL BestShopio platform (no install-scope
  // narrowing) — this flag is only whether THIS store has linked a Shopify store; it drives the
  // first-run welcome vs the live dashboard and the "migrate" prompt. Default = connected (demo lands
  // on the live app; set localStorage bsio_bc_connected='0' to replay the first-run welcome).
  function bcConnected() { try { return localStorage.getItem('bsio_bc_connected') !== '0'; } catch (e) { return true; } }
  function setBcConnected(v) { try { localStorage.setItem('bsio_bc_connected', v ? '1' : '0'); } catch (e) {} }
  // Activation-checklist state. Demo seeds the auto-handled steps (sync done, shipping inherited,
  // standard template OK) so the merchant only sees the actual manual work they have to do.
  function bcSetup() {
    var def = { sync_done: true, payment_accounts: [], payment_done: false, embed_enabled: false,
                shipping_configured: true, domain_set: false, smtp_configured: false,
                template_chosen: true, first_order: false, collapsed: false };
    try { var saved = JSON.parse(localStorage.getItem('bsio_bc_setup') || '{}'); for (var k in saved) def[k] = saved[k]; return def; }
    catch (e) { return def; }
  }
  function bcSetupSave(s) { try { localStorage.setItem('bsio_bc_setup', JSON.stringify(s)); } catch (e) {} }
  // Each step declares: required (blocker for launch), how to read its done-state, and the CTA.
  // `custom:'payment'` triggers the inline "which accounts do you have?" branch question.
  var SETUP_STEPS = [
    { id: 'connect',  label: 'Shopify connected',       required: true,  hint: '',                                                                    cta: 'Reconnect',         hash: '#/bestcheckout/connect', check: function (s) { return bcConnected(); } },
    { id: 'sync',     label: 'Shopify data auto-synced',             required: true,  hint: 'Products, inventory, discounts and customers sync automatically from Shopify',                  cta: 'View sync status',  hash: '#/bestcheckout/connect', check: function (s) { return s.sync_done; } },
    { id: 'payment',  label: 'Configure payments',      required: true,  hint: 'Card processor (Airwallex / Stripe / PayPal Advanced) + PayPal wallet', custom: 'payment',                                       check: function (s) { return s.payment_done; } },
    { id: 'embed',    label: 'Checkout intercept installed', required: true, hint: 'App Embed is installed automatically; restore it here if it is removed',         cta: 'View App Embed', hash: '#/bestcheckout/connect', check: function (s) { return s.embed_enabled; } },
    { id: 'shipping', label: 'Shipping rules',          required: true,  hint: 'Inherits Shopify shipping by default — confirm or customize',         cta: 'Review',            hash: '#/settings/shipping',    check: function (s) { return s.shipping_configured; } },
    { id: 'domain',   label: 'Custom checkout domain',  required: false, hint: 'checkout.yourbrand.com — branded, auto-SSL',                          cta: 'Set CNAME',         hash: '#/bestcheckout/connect', check: function (s) { return s.domain_set; } },
    { id: 'smtp',     label: 'Sender email / SMTP',     required: false, hint: 'Order confirmations from your own domain (lifts deliverability)',     cta: 'Configure',         hash: '#/notifications', check: function (s) { return s.smtp_configured; } },
    { id: 'template', label: 'Pick / customize template', required: false, hint: 'Choose a checkout page, then customize it or create another one', cta: 'Open funnel',       hash: '#/bestcheckout/funnel',  check: function (s) { return s.template_chosen; } },
    { id: 'live',     label: 'First order',             required: false, hint: 'Auto-checked when the first BestCheckout order writes back to Shopify', cta: 'Mark as live (demo)', mark: 'first_order',                                    check: function (s) { return s.first_order; } },
  ];
  function bcSetupProgress() {
    var s = bcSetup();
    var done = SETUP_STEPS.filter(function (st) { return st.check(s); }).length;
    var requiredLeft = SETUP_STEPS.filter(function (st) { return st.required && !st.check(s); }).length;
    return { done: done, total: SETUP_STEPS.length, requiredLeft: requiredLeft, setup: s };
  }

  // Funnel page builder (theme-builder-grade) lives in a sibling file, loaded on demand.
  const PB_BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/app\.js.*$/, '') : 'bestcheckout/js/'; })();
  let _pbP = null;
  function ensurePageBuilder() { if (window.BC_PB) return Promise.resolve(); if (_pbP) return _pbP; _pbP = new Promise(function (res) { var sc = document.createElement('script'); sc.src = PB_BASE + 'pagebuilder.js?v=' + Date.now(); sc.onload = res; sc.onerror = res; document.body.appendChild(sc); }); return _pbP; }

  // "Checkout design" = a one-click TEMPLATE GALLERY (this is what the 二级菜单 lands on).
  // Each card applies a preset (CHECKOUT_TEMPLATES in online-store/data.js) into the SHARED theme
  // builder via ?tpl=<id>; exiting the builder returns here, so this gallery is the home for
  // checkout work. Card metadata is local (presentational) — only the tpl id links to the seeds.
  // ===== Template model — 1.0 exposes BestCheckout page types; the model is generic (page type →
  // many templates: SYSTEM starters + SAVED merchant versions), so Online Store reuses it later. =====
  var PAGE_TYPES = [
    { key: 'checkout', label: 'Checkout',  page: 'checkout',  desc: 'Cart source · order summary' },
    { key: 'thankyou', label: 'Thank-you', page: 'thank-you', desc: 'Confirmation · tracking · reviews' },
    { key: 'upsell',   label: 'Upsell',    page: 'upsell',    desc: 'Post-purchase one-click add' },
    { key: 'downsell', label: 'Downsell',  page: 'downsell',  desc: 'Lower-price save' },
  ];
  var SYS_TPL = {
    checkout: [
      { id: 'standard', name: 'Aura Checkout', tag: 'Cart checkout — clean & trusted', accent: '#1a1a1a', layout: '2col', rec: true },
      { id: 'express-funnel', name: 'Conversion', tag: 'Cart + full funnel extras', accent: '#c0392b', layout: '2col', urgency: true },
      { id: 'offer-funnel', name: 'Single-page funnel', tag: 'Offer picker for paid-media traffic', accent: '#2b62d6', layout: 'offer', soon: true },
    ],
    thankyou: [ { id: 'default', name: 'Aura Thank you', tag: 'Confirmation + tracking + reviews', accent: '#1a8a5a', layout: '2col' } ],
    upsell:   [ { id: 'default', name: 'One-click upsell', tag: 'Post-purchase add in one click', accent: '#2b62d6', layout: 'solo' } ],
    downsell: [ { id: 'default', name: 'Downsell', tag: 'Lower-price save offer', accent: '#7b4bd0', layout: 'solo' } ],
  };
  function bcSavedTpls() { try { return JSON.parse(localStorage.getItem('bsio_bc_templates') || '{}'); } catch (e) { return {}; } }
  function bcSavedTplsSave(s) { try { localStorage.setItem('bsio_bc_templates', JSON.stringify(s)); } catch (e) {} }
  function bcTplList(k) { return (SYS_TPL[k] || []).map(function (x) { return Object.assign({ system: true }, x); }).concat((bcSavedTpls()[k] || []).map(function (x) { return Object.assign({ saved: true }, x); })); }
  function bcPage(k) { var p = PAGE_TYPES.filter(function (x) { return x.key === k; })[0]; return p ? p.page : k; }
  function bcEditHash(k, tplId) {
    var b = '#/online-store/edit/aura/' + bcPage(k) + '?from=bestcheckout';
    if ((bcSavedTpls()[k] || []).filter(function (x) { return x.id === tplId; })[0]) return b + '&saved=' + encodeURIComponent(tplId);
    return (k === 'checkout' && tplId && tplId !== 'default') ? b + '&tpl=' + encodeURIComponent(tplId) : b;
  }
  function bcDeleteTpl(k, id) { var s = bcSavedTpls(); s[k] = (s[k] || []).filter(function (x) { return x.id !== id; }); bcSavedTplsSave(s); }
  function bcTplThumb(tp, kind) {
    if (kind) {
      var preview = kind === 'checkout'
        ? '<div class="pl-preview pl-preview-checkout"><div class="pl-preview-nav"><b>' + t('Checkout') + '</b><i></i></div><div class="pl-preview-checkout-body"><div class="pl-preview-fields"><small>' + t('Contact') + '</small><span></span><span></span><small>' + t('Shipping') + '</small><span></span></div><aside><small>' + t('Order summary') + '</small><p><i></i><b></b></p><p><i></i><b></b></p><em></em></aside></div></div>'
        : kind === 'thankyou'
          ? '<div class="pl-preview pl-preview-thankyou"><b class="pl-preview-check">✓</b><strong>' + t('Thank you') + '</strong><small>' + t('Tracking') + '</small><span></span><i></i></div>'
          : kind === 'upsell'
            ? '<div class="pl-preview pl-preview-offer"><div class="pl-preview-product">+</div><div class="pl-preview-offer-copy"><small>' + t('Upsell') + '</small><strong>' + t('Add one more item') + '</strong><span>$18.00</span><b>' + t('Add') + '</b></div></div>'
            : '<div class="pl-preview pl-preview-offer pl-preview-downsell"><div class="pl-preview-product">%</div><div class="pl-preview-offer-copy"><small>' + t('Downsell') + '</small><strong>' + t('Save 20%') + '</strong><span>' + t('Special price') + '</span><b>' + t('Add') + '</b></div></div>';
      return '<div class="cg-thumb" style="--acc:' + tp.accent + '">' + preview + '</div>';
    }
    var body = tp.layout === 'offer' ? '<div class="cg-t-offer"><span></span><span class="sel"></span><span></span></div>'
      : tp.layout === 'solo' ? '<div class="cg-t-solo"><i></i><i></i><b></b></div>'
      : '<div class="cg-t-cols"><div class="cg-t-main"><span></span><span></span><span class="w"></span></div><div class="cg-t-side"><i></i><i></i><b></b></div></div>';
    return '<div class="cg-thumb" style="--acc:' + tp.accent + '">' + (tp.urgency ? '<div class="cg-t-bar"></div>' : '<div class="cg-t-gap"></div>') + body + '<div class="cg-t-foot"></div></div>';
  }
  function bcTplName(k, id) { var l = bcTplList(k).filter(function (x) { return x.id === id; })[0]; return l ? l.name : id; }

  // ---- Pages library (reusable checkout + post-purchase assets) ----
  // A page stays a reusable asset until a purchase flow chooses it. This keeps
  // design work separate from journey editing while making its reuse visible.
  var pageLibraryFilter = 'all';
  function bcTplUsageCount(k, id) {
    var count = 0;
    (bcFlowList ? bcFlowList() : []).forEach(function (flow) {
      try {
        var state = JSON.parse(localStorage.getItem(bcFunnelKeyFor(flow.id)) || 'null');
        if (state && state.nodes) count += state.nodes.filter(function (node) { return node.type === k && node.tpl === id; }).length;
      } catch (e) {}
    });
    return count;
  }
  function bcDuplicateTpl(k, id, name) {
    var source = bcTplList(k).filter(function (item) { return item.id === id; })[0];
    if (!source || source.soon) return null;
    var saved = bcSavedTpls(); saved[k] = saved[k] || [];
    var copy = { id: 'page-' + Date.now(), name: name || (source.name + ' copy'), tag: source.tag || '', accent: source.accent || '#2b62d6', layout: source.layout || '2col', urgency: !!source.urgency };
    saved[k].push(copy); bcSavedTplsSave(saved);
    return copy;
  }
  function pageMetricLabel(k) {
    return k === 'upsell' ? 'Take rate' : k === 'downsell' ? 'Recovery rate' : k === 'thankyou' ? 'Next-step click rate' : 'Completion rate';
  }
  function openPageCreator() {
    var types = PAGE_TYPES.filter(function (pt) { return bcTplList(pt.key).some(function (item) { return !item.soon; }); });
    var modal = bcModal(t('Create page'),
      '<div class="xp-f"><label>' + t('Page type') + '</label><select class="filter-select" id="pl-create-type" style="width:100%">' + types.map(function (pt) { return '<option value="' + pt.key + '">' + t(pt.label) + '</option>'; }).join('') + '</select></div>' +
      '<div class="xp-f"><label>' + t('Page name') + '</label><input id="pl-create-name" placeholder="' + t('Untitled page') + '"></div>' +
      '<div class="pl-create-note">' + t('A draft page is created first. It will not affect any purchase flow until you choose it in the flow canvas and publish the flow.') + '</div>',
      t('Create and edit'), function () {
        var type = modal.querySelector('#pl-create-type').value;
        var name = modal.querySelector('#pl-create-name').value.trim();
        var starter = bcTplList(type).filter(function (item) { return !item.soon; })[0];
        var created = bcDuplicateTpl(type, starter.id, name || t('Untitled page'));
        if (!created) return;
        toast(t('Draft page created'));
        location.hash = bcEditHash(type, created.id);
      });
    if (window.UI && window.UI.scan) window.UI.scan(modal);
  }
  function renderTemplates(filter) {
    pageLibraryFilter = filter || pageLibraryFilter || 'all';
    var allPages = [];
    PAGE_TYPES.forEach(function (pt) { bcTplList(pt.key).forEach(function (tp) { if (!tp.soon) allPages.push({ type: pt, page: tp }); }); });
    var pages = pageLibraryFilter === 'all' ? allPages : allPages.filter(function (item) { return item.type.key === pageLibraryFilter; });
    var filterTabs = [{ key: 'all', label: 'All pages' }].concat(PAGE_TYPES.map(function (pt) { return { key: pt.key, label: pt.label }; })).map(function (tab) {
      return '<button type="button" class="pl-filter' + (pageLibraryFilter === tab.key ? ' active' : '') + '" data-page-filter="' + tab.key + '">' + t(tab.label) + '</button>';
    }).join('');
    var cards = pages.map(function (item) {
      var pt = item.type, tp = item.page, usage = bcTplUsageCount(pt.key, tp.id);
      var state = tp.soon ? t('Coming soon') : t('Draft');
      var source = tp.saved ? t('Saved page') : t('System starter');
      var usageText = usage === 1 ? '1 ' + t('purchase flow') : usage + ' ' + t('purchase flows');
      var cardActions = tp.soon
        ? '<button class="btn btn-default" disabled>' + t('Coming soon') + '</button>'
        : '<button type="button" class="btn btn-default" data-page-preview="' + pt.key + ':' + tp.id + '">' + t('Preview') + '</button><a class="btn btn-primary" href="' + bcEditHash(pt.key, tp.id) + '">' + t('Edit') + '</a><button type="button" class="btn btn-default" data-page-duplicate="' + pt.key + ':' + tp.id + '">' + t('Duplicate') + '</button>';
      return '<article class="pl-card' + (tp.soon ? ' is-soon' : '') + '">' + bcTplThumb(tp, pt.key) +
        '<div class="pl-card-body"><div class="pl-card-top"><span class="pl-type">' + t(pt.label) + '</span><span class="pl-status"><i></i>' + state + '</span></div>' +
        '<h2>' + esc(t(tp.name)) + '</h2><p class="pl-description">' + esc(t(tp.tag || pt.desc || source)) + '</p>' +
        '<div class="pl-facts"><span><small>' + t('Published version') + '</small><b>' + (tp.saved ? 'r1' : t('No published version')) + '</b></span><span><small>' + t('Draft version') + '</small><b>r' + (tp.saved ? '2' : '1') + '</b></span><span><small>' + t('Used in') + '</small><b>' + usageText + '</b></span><span><small>' + t('Source') + '</small><b>' + source + '</b></span></div>' +
        '<div class="pl-metric"><span>' + t(pageMetricLabel(pt.key)) + '</span><strong>—</strong><em>' + t('Not live') + '</em></div>' +
        '<div class="pl-actions">' + cardActions + '</div></div></article>';
    }).join('');
    root.innerHTML = wrap(GSTYLE + FSTYLE + '<style>' +
      '.pl-page{width:100%;max-width:none;margin:0;padding-bottom:40px}.pl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.pl-head h1{margin:0;font-size:20px;font-weight:600;color:var(--ink)}.pl-head p{margin:6px 0 0;font-size:13px;line-height:1.55;color:var(--ink-muted)}.pl-actions-top{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.pl-actions-top .btn{text-decoration:none}.pl-info{display:flex;gap:11px;border:1px solid #bcd5ff;background:#eff6ff;border-radius:11px;padding:14px 16px;margin-bottom:14px;color:#295894}.pl-info-mark{width:20px;height:20px;display:grid;place-items:center;border:1px solid #80a9e8;border-radius:50%;font-size:12px;font-weight:750;flex:none}.pl-info strong{display:block;font-size:13px;color:#204b84}.pl-info p{margin:3px 0 0;font-size:12.5px;line-height:1.5;color:#426b9d}.pl-filterbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.pl-filters{display:flex;align-items:center;gap:4px;overflow:auto;padding-bottom:8px}.pl-filter{height:31px;border:0;border-radius:8px;background:transparent;padding:0 11px;color:var(--ink-body);font-size:13px;white-space:nowrap;cursor:pointer}.pl-filter:hover{background:var(--panel)}.pl-filter.active{background:#fff;border:1px solid var(--ctl);box-shadow:0 1px 2px rgb(16 24 40 / 5%);color:var(--ink);font-weight:600}.pl-count{font-size:12.5px;color:var(--ink-muted);white-space:nowrap;padding-bottom:8px}.pl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.pl-card{border:1px solid var(--hair);border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgb(16 24 40 / 4%);display:flex;flex-direction:column}.pl-card:hover{border-color:#d3d9e3;box-shadow:var(--float-shadow)}.pl-card .cg-thumb{height:156px;padding:10px}.pl-card.is-soon{opacity:.72}.pl-preview{flex:1;min-height:0;overflow:hidden;border:1px solid #dde2e8;border-radius:7px;background:#fff;color:#536174;font-size:8px;line-height:1.25}.pl-preview-checkout{display:flex;flex-direction:column}.pl-preview-nav{height:23px;padding:0 9px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #edf0f3}.pl-preview-nav b{font-size:8px;color:#1f2937}.pl-preview-nav i{width:22px;height:4px;border-radius:3px;background:var(--acc);opacity:.85}.pl-preview-checkout-body{flex:1;display:grid;grid-template-columns:1.08fr .92fr;gap:7px;padding:8px}.pl-preview-fields{display:flex;flex-direction:column;gap:4px}.pl-preview-fields small,.pl-preview-checkout aside small{font-size:7px;color:#7d8999}.pl-preview-fields span{height:10px;border:1px solid #e4e8ed;border-radius:3px;background:#fff}.pl-preview-checkout aside{border-radius:4px;background:#f6f7f9;padding:5px;display:flex;flex-direction:column;gap:4px}.pl-preview-checkout aside p{margin:0;display:flex;gap:4px;align-items:center}.pl-preview-checkout aside p i{width:13px;height:13px;border-radius:3px;background:#dfe4e9}.pl-preview-checkout aside p b{height:4px;flex:1;border-radius:2px;background:#d7dce2}.pl-preview-checkout aside em{height:8px;border-radius:3px;background:var(--acc);margin-top:auto}.pl-preview-thankyou{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px}.pl-preview-check{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#e5f5ed;color:#16864f;font-size:13px}.pl-preview-thankyou strong{color:#253244;font-size:10px}.pl-preview-thankyou small{font-size:7px;color:#738094}.pl-preview-thankyou span{width:60%;height:4px;border-radius:3px;background:#dfe4e9}.pl-preview-thankyou i{width:54%;height:10px;border-radius:3px;background:var(--acc)}.pl-preview-offer{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 17%;background:linear-gradient(135deg,#fff 0%,#f9fafb 100%)}.pl-preview-product{width:51px;height:51px;display:grid;place-items:center;flex:none;border-radius:7px;background:color-mix(in srgb,var(--acc) 16%,#fff);border:2px solid color-mix(in srgb,var(--acc) 35%,#fff);color:var(--acc);font-size:21px;font-weight:700}.pl-preview-offer-copy{min-width:0;display:flex;flex-direction:column;gap:3px}.pl-preview-offer-copy small{font-size:7px;color:#728096}.pl-preview-offer-copy strong{font-size:10px;white-space:nowrap;color:#273448}.pl-preview-offer-copy span{font-size:8px;color:#78869a}.pl-preview-offer-copy b{display:block;margin-top:2px;border-radius:3px;background:var(--acc);color:#fff;padding:4px 9px;text-align:center;font-size:7px}.pl-preview-downsell{background:linear-gradient(135deg,#fff 0%,#fbfaff 100%)}.pl-card-body{padding:14px;display:flex;flex-direction:column;gap:8px;flex:1}.pl-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.pl-type{font-size:11px;font-weight:600;letter-spacing:.45px;text-transform:uppercase;color:var(--ink-muted)}.pl-status{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#edf4ff;color:#3d73b6;padding:3px 7px;font-size:11px;font-weight:600}.pl-status i{width:5px;height:5px;border-radius:50%;background:#5d95d9}.pl-card h2{margin:0;font-size:14px;font-weight:600;line-height:1.3;color:var(--ink)}.pl-description{margin:0;color:var(--ink-muted);font-size:12.5px;line-height:1.45;min-height:34px}.pl-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;padding-top:3px}.pl-facts span{min-width:0}.pl-facts small{display:block;color:var(--ink-muted);font-size:11px;line-height:1.35}.pl-facts b{display:block;margin-top:2px;color:var(--ink-body);font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pl-metric{margin-top:2px;border-radius:8px;background:var(--panel);padding:10px;display:grid;grid-template-columns:1fr auto;gap:1px 8px}.pl-metric span{font-size:11px;color:var(--ink-muted)}.pl-metric strong{grid-row:2;font-size:18px;line-height:1;color:var(--ink)}.pl-metric em{align-self:end;font-size:11px;font-style:normal;font-weight:600;color:var(--ok)}.pl-actions{display:flex;gap:8px;margin-top:auto;padding-top:4px}.pl-actions .btn{flex:1;justify-content:center;text-decoration:none}.pl-create-note{padding:10px 11px;border:1px solid #cfe1ff;border-radius:8px;background:#eff6ff;color:#426b9d;font-size:12px;line-height:1.5}.pl-empty{grid-column:1/-1;min-height:220px;border:1px dashed var(--ctl);border-radius:12px;display:grid;place-items:center;color:var(--ink-muted);font-size:13px}@media(max-width:1020px){.pl-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.pl-head{flex-direction:column}.pl-actions-top{justify-content:flex-start}.pl-filterbar{align-items:flex-start;flex-direction:column}.pl-count{padding:0}.pl-grid{grid-template-columns:1fr}.pl-info{padding:12px}.pl-card .cg-thumb{height:140px}.pl-preview-offer{padding:10px 14%}}' +
      '</style><main class="pl-page"><header class="pl-head"><div><h1>' + t('Pages') + '</h1><p>' + t('Manage reusable Checkout, Upsell, Downsell and Thank you page assets.') + '</p></div><div class="pl-actions-top"><a class="btn btn-default" href="#/online-store">' + t('Theme settings') + '</a><button type="button" class="btn btn-primary" data-page-create>+ ' + t('Create page') + '</button></div></header>' +
      '<section class="pl-info"><span class="pl-info-mark">✓</span><div><strong>' + t('Build once, use it in multiple purchase flows') + '</strong><p>' + t('Editing a page does not affect live purchase flows. After you confirm the changes, publish the purchase flow for shoppers to see the new version.') + '</p></div></section>' +
      '<div class="pl-filterbar"><div class="pl-filters" role="tablist">' + filterTabs + '</div><span class="pl-count">' + (pages.length === allPages.length ? t('Total') + ' ' + allPages.length + ' ' + t('pages') : t('Showing') + ' ' + pages.length + ' / ' + allPages.length + ' ' + t('pages')) + '</span></div><section class="pl-grid">' + (cards || '<div class="pl-empty">' + t('No pages in this view.') + '</div>') + '</section></main>');
    root.querySelectorAll('[data-page-filter]').forEach(function (button) { button.onclick = function () { renderTemplates(button.getAttribute('data-page-filter')); }; });
    root.querySelectorAll('[data-page-preview]').forEach(function (button) { button.onclick = function () { var parts = button.getAttribute('data-page-preview').split(':'); var page = bcTplList(parts[0]).filter(function (item) { return item.id === parts[1]; })[0]; if (page) openPagePreview(parts[0], page); }; });
    root.querySelectorAll('[data-page-duplicate]').forEach(function (button) { button.onclick = function () { var parts = button.getAttribute('data-page-duplicate').split(':'); var copy = bcDuplicateTpl(parts[0], parts[1]); if (copy) { toast(t('Page duplicated')); renderTemplates(pageLibraryFilter); } }; });
    var create = root.querySelector('[data-page-create]'); if (create) create.onclick = openPageCreator;
    bcI18n(root);
  }
  function openPagePreview(type, page) {
    var modal = bcModal(t('Preview') + ' · ' + t(page.name),
      '<style>.pl-page-preview-caption{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--ink-muted);font-size:12.5px}.pl-page-preview-caption strong{color:var(--ink);font-size:13px}.pl-page-preview-surface{border:1px solid var(--hair);border-radius:10px;background:#f7f8fb;padding:14px}.pl-page-preview-surface .cg-thumb{height:360px;padding:0}.pl-page-preview-surface .pl-preview{border-radius:8px;box-shadow:0 1px 2px rgb(16 24 40 / 5%)}.pl-page-preview-surface .pl-preview-offer{padding:12px 19%}.pl-page-preview-surface .pl-preview-product{width:76px;height:76px;font-size:30px}.pl-page-preview-surface .pl-preview-offer-copy{gap:5px}.pl-page-preview-surface .pl-preview-offer-copy small{font-size:10px}.pl-page-preview-surface .pl-preview-offer-copy strong{font-size:15px}.pl-page-preview-surface .pl-preview-offer-copy span{font-size:12px}.pl-page-preview-surface .pl-preview-offer-copy b{font-size:11px;padding:7px 14px}.pl-page-preview-surface .pl-preview-nav{height:36px;padding:0 14px}.pl-page-preview-surface .pl-preview-nav b{font-size:11px}.pl-page-preview-surface .pl-preview-nav i{width:34px;height:6px}.pl-page-preview-surface .pl-preview-checkout-body{gap:12px;padding:14px}.pl-page-preview-surface .pl-preview-fields{gap:7px}.pl-page-preview-surface .pl-preview-fields small,.pl-page-preview-surface .pl-preview-checkout aside small{font-size:10px}.pl-page-preview-surface .pl-preview-fields span{height:16px}.pl-page-preview-surface .pl-preview-checkout aside{padding:9px;gap:7px}.pl-page-preview-surface .pl-preview-checkout aside p i{width:22px;height:22px}.pl-page-preview-surface .pl-preview-checkout aside p b{height:7px}.pl-page-preview-surface .pl-preview-checkout aside em{height:13px}.pl-page-preview-surface .pl-preview-thankyou{gap:9px}.pl-page-preview-surface .pl-preview-check{width:42px;height:42px;font-size:23px}.pl-page-preview-surface .pl-preview-thankyou strong{font-size:16px}.pl-page-preview-surface .pl-preview-thankyou small{font-size:11px}.pl-page-preview-surface .pl-preview-thankyou span{height:7px}.pl-page-preview-surface .pl-preview-thankyou i{height:17px}@media(max-width:560px){.pl-page-preview-surface{padding:9px}.pl-page-preview-surface .cg-thumb{height:300px}.pl-page-preview-surface .pl-preview-offer{padding:10px 10%}}</style><div class="pl-page-preview-caption"><strong>' + t(PAGE_TYPES.filter(function (item) { return item.key === type; })[0].label) + '</strong><span>' + esc(t(page.name)) + '</span></div><div class="pl-page-preview-surface">' + bcTplThumb(page, type) + '</div>', t('Close'));
    var dialog = modal.querySelector('.xp-mc'); if (dialog) dialog.style.width = 'min(760px, calc(100vw - 32px))';
    var cancel = modal.querySelector('#bm-cancel'); if (cancel) cancel.style.display = 'none';
  }

  // ---- Funnel state (per-node template + optional A/B), persisted in localStorage ----
  // Page types. The real entry is the Shopify store (a SOURCE node — buyers come from there); every
  // other type is a customizable, A/B-testable PAGE. `type` doubles as the template-library key.
  // `buttons` declares which page-button outcomes a node can route on. Only Upsell/Downsell pages have
  // explicit Accept/Decline buttons; Shopify/Checkout don't, so their out-edges can only use random or
  // predicate rules. New page types just need to declare their buttons here — the menu auto-adapts.
  var FN_TYPES = {
    shopify:  { label: 'Shopify store', source: true },
    checkout: { label: 'Checkout' },
    upsell:   { label: 'Upsell',   buttons: [{ value: 'YES', label: 'Accepted', kind: 'accept' }, { value: 'NO', label: 'Declined', kind: 'decline' }] },
    downsell: { label: 'Downsell', buttons: [{ value: 'YES', label: 'Added',    kind: 'accept' }, { value: 'NO', label: 'Declined', kind: 'decline' }] },
    thankyou: { label: 'Thank-you' },
    control:  { label: 'Shopify checkout', control: true },
  };
  // 1.0 ships one predicate dimension (new vs returning customer). Add more keys here and the rule
  // editor's predicate tab will pick them up automatically — that's the whole point of unifying.
  // Routing condition fields — Azoya-style segment builder. Each field declares its data kind, which
  // drives both the operator list and the value input. Adding a routing dimension = adding one row
  // here; the editor + edge labels pick it up automatically. Tag options are seeded from a "Shopify
  // sync" demo list and would in production come from `/customers?fields=tags` aggregation.
  var SHOPIFY_TAGS_DEMO = ['VIP', '高净值', 'Wholesale', 'Early adopter', 'Newsletter', '黑名单'];
  var FIELD_CATALOG = {
    'customer.type':      { group: 'basic',     label: 'New vs returning', kind: 'enum',     options: [
      { value: 'new',       label: 'New customer',       short: 'New' },
      { value: 'returning', label: 'Returning customer', short: 'Returning' },
    ] },
    'customer.tag':       { group: 'tag',       label: 'Customer tag',     kind: 'multitag', source: 'shopify', options: SHOPIFY_TAGS_DEMO.map(function (t) { return { value: t, label: t }; }) },
    'customer.country':   { group: 'basic',     label: 'Country',          kind: 'enum',     options: [
      { value: 'US', label: 'United States', short: 'US' }, { value: 'CA', label: 'Canada', short: 'CA' },
      { value: 'GB', label: 'United Kingdom', short: 'UK' }, { value: 'AU', label: 'Australia', short: 'AU' },
      { value: 'CN', label: 'China', short: 'CN' }, { value: 'JP', label: 'Japan', short: 'JP' },
    ] },
    'orders.count':       { group: 'behavior',  label: 'Past orders',      kind: 'number_op', unit: '' },
    'cart.total':         { group: 'value',     label: 'Cart total',       kind: 'number_op', unit: '$' },
    'device.type':        { group: 'basic',     label: 'Device',           kind: 'enum',     options: [
      { value: 'mobile',  label: 'Mobile',  short: 'Mobile' },
      { value: 'desktop', label: 'Desktop', short: 'Desktop' },
    ] },
    'action.upsell':      { group: 'action',    label: 'Upsell decision',  kind: 'enum',     options: [
      { value: 'accept',  label: 'Accepted (YES)', short: 'Accepted' },
      { value: 'decline', label: 'Declined (NO)',  short: 'Declined' },
    ], hint: 'Only applicable to edges leaving an Upsell node' },
    'action.downsell':    { group: 'action',    label: 'Downsell decision', kind: 'enum',    options: [
      { value: 'accept',  label: 'Added (YES)',    short: 'Added' },
      { value: 'decline', label: 'Declined (NO)',  short: 'Declined' },
    ], hint: 'Only applicable to edges leaving a Downsell node' },
    'random':             { group: 'random',    label: 'Traffic %',        kind: 'percent' },
  };
  // Each kind declares the operators available + the value control shape.
  var OP_KINDS = {
    enum:      { ops: [{ value: 'eq', label: 'is' }, { value: 'ne', label: 'is not' }],
                 value: 'select' },
    multitag:  { ops: [{ value: 'any', label: 'is any of' }, { value: 'all', label: 'is all of' }, { value: 'none', label: 'is none of' }],
                 value: 'multi' },
    number_op: { ops: [{ value: 'eq', label: '=' }, { value: 'gt', label: '>' }, { value: 'lt', label: '<' }, { value: 'between', label: 'between' }],
                 value: 'number' },
    bool:      { ops: [{ value: 'is_true', label: 'is true' }, { value: 'is_false', label: 'is false' }],
                 value: 'none' },
    percent:   { ops: [{ value: 'pct', label: '%' }],
                 value: 'number' },
    date:      { ops: [{ value: 'before', label: 'before' }, { value: 'after', label: 'after' }, { value: 'between', label: 'between' }],
                 value: 'date' },
  };
  // Display groups (left side of the field dropdown).
  var FIELD_GROUPS = [
    { key: 'basic',    label: 'Basic attributes' },
    { key: 'behavior', label: 'Behavior' },
    { key: 'value',    label: 'Value' },
    { key: 'tag',      label: 'Customer tags' },
    { key: 'action',   label: 'Upstream actions' },
    { key: 'random',   label: 'Traffic split' },
  ];
  function fnFieldsByGroup() {
    var by = {}; FIELD_GROUPS.forEach(function (g) { by[g.key] = []; });
    Object.keys(FIELD_CATALOG).forEach(function (k) { var f = FIELD_CATALOG[k]; (by[f.group] = by[f.group] || []).push(Object.assign({ key: k }, f)); });
    return by;
  }
  var FC_W = 1460, FC_H = 580, fcZoom = null, fjCanvasZoom = 1, fcEdges = [], fcSel = null;
  function fnLabel(type) { return (FN_TYPES[type] || {}).label || type; }
  function fnIsSource(type) { return !!(FN_TYPES[type] || {}).source; }
  function fnIsControl(type) { return !!(FN_TYPES[type] || {}).control; }
  function fnButtons(type) { return (FN_TYPES[type] || {}).buttons || []; }
  // Simple hierarchical auto-layout: nodes are placed in vertical columns by graph depth (longest path
  // from a source), each column is vertically centered, and source / multi-parent nodes are recentered
  // on their neighbours' Y so arrows fan out cleanly. Good enough for arbitrary funnels merchants build.
  function fnAutoLayout(s) {
    s.nodes = s.nodes || []; s.edges = s.edges || [];
    if (!s.nodes.length) return;
    var X0 = 50, COL = 310, VGAP = 220, ROW0 = 50, ROW_BUDGET = 700;
    var byId = {}, inc = {};
    s.nodes.forEach(function (n) { byId[n.id] = n; inc[n.id] = []; });
    s.edges.forEach(function (e) { if (inc[e.to]) inc[e.to].push(e.from); });
    var depth = {};
    var compute = function (id, seen) {
      if (depth[id] != null) return depth[id];
      if (seen[id]) return 0;
      seen[id] = true;
      var p = inc[id] || [];
      if (!p.length) return depth[id] = 0;
      var d = 0;
      p.forEach(function (pid) { d = Math.max(d, compute(pid, seen) + 1); });
      return depth[id] = d;
    };
    s.nodes.forEach(function (n) { compute(n.id, {}); });
    var maxD = 0; Object.keys(depth).forEach(function (k) { if (depth[k] > maxD) maxD = depth[k]; });
    var cols = []; for (var i = 0; i <= maxD; i++) cols.push([]);
    s.nodes.forEach(function (n) { cols[depth[n.id]].push(n); });
    cols.forEach(function (col) { col.sort(function (a, b) { return a.id < b.id ? -1 : 1; }); });
    cols.forEach(function (col, d) {
      var n = col.length;
      var span = n > 1 ? VGAP * (n - 1) : 0;
      var y0 = ROW0 + Math.max(0, (ROW_BUDGET - span) / 2);
      col.forEach(function (node, i) { node.pos = { x: X0 + d * COL, y: Math.round(y0 + i * VGAP) }; });
    });
    // Sources sit slightly above their children's centroid so arrows always have visible angle (no
    // perfectly horizontal line into a "middle" child). Multi-parent nodes recenter on parents.
    for (var pass = 0; pass < 3; pass++) {
      s.nodes.forEach(function (n) {
        var d = depth[n.id];
        if (d === 0) {
          var kids = (s.edges || []).filter(function (e) { return e.from === n.id; }).map(function (e) { return byId[e.to]; }).filter(Boolean);
          if (kids.length) {
            var ys = kids.map(function (c) { return c.pos.y; });
            var mid = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
            n.pos.y = Math.max(20, Math.round(mid - 30));
          }
        } else {
          var parents = (inc[n.id] || []).map(function (pid) { return byId[pid]; }).filter(Boolean);
          if (parents.length >= 2) {
            var pys = parents.map(function (p) { return p.pos.y; });
            n.pos.y = Math.max(20, Math.round((Math.min.apply(null, pys) + Math.max.apply(null, pys)) / 2));
          }
        }
      });
    }
  }
  // Default funnel: Buyer entry determines the eligible audience. The Shopify source then splits that
  // already-eligible traffic across BestCheckout Checkout pages only. Shopify native checkout stays
  // outside that experiment as the system fallback for buyers who never enter this flow.
  // Both checkouts converge into Upsell; Upsell YES→Thank-you / NO→Downsell→Thank-you.
  // Default funnel = a richer "starter pack" that showcases every routing dimension at once, so the
  // merchant doesn't start from zero and learns from a working example:
  //   • Entry audience → this flow only accepts the buyer group set in Buyer entry
  //   • Source traffic allocation → the eligible buyers are split between Checkout variants only
  //   • 上游按钮路由 → Upsell 接受→致谢 / 拒绝→降级
  //   • Multi-parent convergence → 两个 checkout 都收敛到 Upsell;Downsell 也回致谢
  // 商户可改可删可加,整理布局一键复位。
  // Purchase flows are the merchant's entry points. The list is deliberately
  // concise; each detail view reuses the mature funnel canvas below.
  var FLOW_LIST_KEY = 'bsio_bc_purchase_flows';
  var FLOW_MOCK_VERSION_KEY = 'bsio_bc_purchase_flow_mock_version';
  var PAUSED_FLOW_MOCK_VERSION = 'paused-flow-v1';
  var activeFlowId = 'first-order-boost';
  // The canvas is the primary purchase-flow editor. It keeps the whole route,
  // its branches and the Shopify fallback visible together, which makes the
  // flow easier to understand than a series of isolated configuration cards.
  var flowDetailView = 'canvas';
  var FLOW_OFFER_PRODUCTS = [
    { id: 'starter-kit', name: 'Travel wellness kit', price: '29.00', compareAt: '39.00' },
    { id: 'sleep-support', name: 'Sleep support capsules', price: '24.00', compareAt: '32.00' },
    { id: 'daily-essentials', name: 'Daily essentials bundle', price: '36.00', compareAt: '48.00' },
    { id: 'shipping-protection', name: 'Shipping protection', price: '4.95', compareAt: '6.95' },
    { id: 'hydration', name: 'Electrolyte hydration pack', price: '18.00', compareAt: '24.00' }
  ];
  var FLOW_LIST_SEED = [
    { id: 'first-order-boost', name: 'First-order boost', description: 'Give new customers a relevant one-click Upsell after checkout.', audience: 'First-time customers', entry: 'New customers', priority: 10, status: 'Live', traffic: '45%', conversion: '5.2%', aov: '$62.40', updated: 'Today, 10:42', summary: '1 checkout · 1 upsell · 1 Thank you page' },
    { id: 'returning-customer-offer', name: 'Returning customer offer', description: 'Show returning customers a Downsell after they decline the Upsell.', audience: 'Returning customers', entry: 'Returning customers', priority: 20, status: 'Draft', traffic: '0%', conversion: '—', aov: '—', updated: 'Saved today', summary: '1 checkout · 1 upsell · 1 downsell · 1 Thank you page' },
    { id: 'smooth-checkout', name: 'Smooth checkout', description: 'A focused checkout for all other customers, followed by the Thank you page.', audience: 'All remaining customers', entry: 'All other customers', priority: 30, status: 'Live', traffic: '55%', conversion: '4.1%', aov: '$54.80', updated: 'Yesterday', summary: '1 checkout · No Upsell or Downsell · 1 Thank you page', isDefault: true },
    { id: 'seasonal-returning-offer', name: 'Seasonal returning-customer offer', description: 'A limited-time Upsell kept ready for a future returning-customer campaign.', audience: 'Returning customers', entry: 'Returning customers', priority: 15, status: 'Paused', traffic: '0%', conversion: '—', aov: '—', updated: 'Paused today', summary: '1 checkout · 1 upsell · 1 Thank you page', mock: true }
  ];
  function bcEnsurePausedMock(flows) {
    try {
      if (localStorage.getItem(FLOW_MOCK_VERSION_KEY) === PAUSED_FLOW_MOCK_VERSION) return flows;
      var pausedMock = FLOW_LIST_SEED.filter(function (flow) { return flow.id === 'seasonal-returning-offer'; })[0];
      if (pausedMock && !flows.some(function (flow) { return flow.id === pausedMock.id; })) {
        flows.push(JSON.parse(JSON.stringify(pausedMock)));
        bcFlowListSave(flows);
      }
      localStorage.setItem(FLOW_MOCK_VERSION_KEY, PAUSED_FLOW_MOCK_VERSION);
    } catch (e) {}
    return flows;
  }
  function bcFlowList() {
    try {
      var stored = JSON.parse(localStorage.getItem(FLOW_LIST_KEY) || 'null');
      if (Array.isArray(stored) && stored.length) return bcEnsurePausedMock(stored);
    } catch (e) {}
    try { localStorage.setItem(FLOW_MOCK_VERSION_KEY, PAUSED_FLOW_MOCK_VERSION); } catch (e) {}
    return JSON.parse(JSON.stringify(FLOW_LIST_SEED));
  }
  function bcFlowListSave(flows) { try { localStorage.setItem(FLOW_LIST_KEY, JSON.stringify(flows)); } catch (e) {} }
  function bcFlowById(id) { return bcFlowList().filter(function (flow) { return flow.id === id; })[0] || null; }
  function bcFlowUpdate(id, patch) {
    var flows = bcFlowList();
    flows.forEach(function (flow) { if (flow.id === id) Object.keys(patch || {}).forEach(function (key) { flow[key] = patch[key]; }); });
    bcFlowListSave(flows);
  }
  function flowIsLive(flow) { return !!flow && flow.status === 'Live'; }
  function flowPrimaryAction(flow) {
    if (flowIsLive(flow)) return { id: 'pause', nextStatus: 'Paused', label: 'Pause purchase flow', notice: 'Purchase flow paused. Customers will continue matching the next live purchase flow or Shopify Checkout.' };
    if (flow && flow.status === 'Paused') return { id: 'resume', nextStatus: 'Live', label: 'Resume purchase flow', notice: 'Purchase flow resumed' };
    return { id: 'publish', nextStatus: 'Live', label: 'Publish purchase flow', notice: 'Purchase flow published' };
  }
  function flowPrimaryButton(flow, className) {
    var action = flowPrimaryAction(flow);
    return '<button type="button" class="' + (className || 'btn btn-primary') + '" data-flow-primary="' + esc(flow.id) + '">' + t(action.label) + '</button>';
  }
  function applyFlowStatus(flow) {
    var action = flowPrimaryAction(flow);
    activeFlowId = flow.id;
    // Publishing snapshots the current page configuration. Pausing and resuming
    // only control whether the already-published flow can receive new buyers.
    if (action.id === 'publish') fnPublish(bcFunnel());
    bcFlowUpdate(flow.id, { status: action.nextStatus, updated: t('Just now') });
    toast(t(action.notice));
  }
  function publishFlowChanges(flow) {
    activeFlowId = flow.id;
    fnPublish(bcFunnel());
    var patch = { updated: t('Just now') };
    // Publishing a draft also activates it. Publishing edits to a paused flow
    // deliberately keeps it paused until the merchant explicitly resumes it.
    if (flow.status === 'Draft') patch.status = 'Live';
    bcFlowUpdate(flow.id, patch);
    toast(t(flow.status === 'Draft' ? 'Purchase flow published' : 'Purchase flow changes published'));
  }
  function deleteFlow(flow, onDeleted) {
    if (!flow || flowIsLive(flow)) return;
    var remove = function () {
      var flows = bcFlowList().filter(function (candidate) { return candidate.id !== flow.id; });
      bcFlowListSave(flows);
      try { localStorage.removeItem(bcFunnelKeyFor(flow.id)); } catch (e) {}
      if (activeFlowId === flow.id) activeFlowId = (flows[0] || {}).id || 'first-order-boost';
      toast(t('Purchase flow deleted'));
      if (onDeleted) onDeleted();
    };
    var options = {
      title: t('Delete purchase flow?'),
      content: t('This permanently deletes the flow and its page configuration. This cannot be undone.'),
      okText: t('Delete'),
      cancelText: t('Cancel'),
      danger: true,
      onOk: remove
    };
    if (window.UI && window.UI.confirm) window.UI.confirm(options);
    else if (window.confirm(t('Delete purchase flow?'))) remove();
  }
  function confirmPauseFlow(flow, onPaused) {
    var pause = function () {
      applyFlowStatus(flow);
      if (onPaused) onPaused();
    };
    var options = {
      title: t('Pause purchase flow?'),
        content: t('New customers will no longer enter this purchase flow. They will continue through the next matching live purchase flow, or Shopify Checkout.'),
      okText: t('Pause flow'),
      cancelText: t('Cancel'),
      onOk: pause
    };
    if (window.UI && window.UI.confirm) window.UI.confirm(options);
    else bcModal(options.title, '<p style="margin:0;font-size:13px;line-height:1.6;color:var(--ink-body)">' + esc(options.content) + '</p>', options.okText, pause);
  }
  function bindFlowStatusActions(flow, onChange, onDelete) {
    root.querySelectorAll('[data-flow-primary]').forEach(function (button) { button.onclick = function () {
      var current = bcFlowById(button.getAttribute('data-flow-primary')) || flow;
      if (flowPrimaryAction(current).id === 'pause') { confirmPauseFlow(current, onChange); return; }
      applyFlowStatus(current);
      if (onChange) onChange();
    }; });
    root.querySelectorAll('[data-flow-delete]').forEach(function (button) { button.onclick = function () {
      var current = bcFlowById(button.getAttribute('data-flow-delete')) || flow;
      deleteFlow(current, function () { if (onDelete) onDelete(); });
    }; });
  }
  function bcFunnelKeyFor(flowId) { return flowId === 'first-order-boost' ? 'bsio_bc_funnel' : 'bsio_bc_funnel_' + flowId; }
  function bcFunnelKey() { return bcFunnelKeyFor(activeFlowId); }
  function bcFunnelSaveFor(flowId, state) { try { localStorage.setItem(bcFunnelKeyFor(flowId), JSON.stringify(state)); } catch (e) {} }
  function flowSummaryText(summary) {
    // Older mock flows used an ambiguous generic "offers" count. The list now
    // names the concrete journey steps so merchants can understand the path.
    var text = String(summary || '')
      .replace(/2 offers/gi, '1 upsell · 1 downsell')
      .replace(/1 offers?/gi, '1 upsell')
      .replace(/No offers/gi, '__NO_OFFER_STEPS__');
    return text
      .replace(/checkout/gi, t('checkout'))
      .replace(/upsell/gi, t('Upsell page'))
      .replace(/downsell/gi, t('Downsell page'))
      .replace(/Thank you page/gi, t('Thank you page'))
      .replace(/__NO_OFFER_STEPS__/g, t('No Upsell or Downsell'));
  }
  // The list and the canvas header must describe the actual configured pages,
  // rather than a generic count such as "1 offer" or "post-purchase".
  function flowStateForPath(flowId) {
    try {
      var raw = localStorage.getItem(bcFunnelKeyFor(flowId)) || (flowId === 'first-order-boost' ? localStorage.getItem('bsio_bc_funnel') : null);
      var saved = JSON.parse(raw || 'null');
      if (saved && Array.isArray(saved.nodes)) return saved;
    } catch (e) {}
    return fnDefault(flowId);
  }
  function flowPagePath(state) {
    var orderedTypes = ['checkout', 'upsell', 'downsell', 'thankyou'];
    var labels = { checkout: 'Checkout', upsell: 'Upsell', downsell: 'Downsell', thankyou: 'Thank you' };
    var nodes = (state && state.nodes) || [];
    return orderedTypes.filter(function (type) {
      return nodes.some(function (node) { return node.type === type; });
    }).map(function (type) { return t(labels[type]); }).join(' → ');
  }
  function flowListPagePath(flow) { return flowPagePath(flowStateForPath(flow.id)); }
  var FLOW_PURPOSES = {
    'first-order-boost': 'Give new customers a relevant one-click Upsell after checkout.',
    'returning-customer-offer': 'Show returning customers a Downsell after they decline the Upsell.',
      'smooth-checkout': 'A focused checkout for all other customers, followed by the Thank you page.'
  };
  function flowPurpose(flow) {
    return flow.description || FLOW_PURPOSES[flow.id] || 'Arrange the pages customers see in this purchase flow.';
  }
  // Buyer entry lives inside the funnel. A flow can combine several customer
  // attributes; every listed condition must match before the buyer enters it.
  var FLOW_ENTRY_SELECT_OPERATORS = [{ value: 'equals', label: 'is' }, { value: 'not_equals', label: 'is not' }];
  var FLOW_ENTRY_TAG_OPERATORS = [{ value: 'includes_any', label: 'has any of these tags' }, { value: 'includes_all', label: 'has all of these tags' }, { value: 'excludes_all', label: 'has none of these tags' }];
  var FLOW_ENTRY_NUMBER_OPERATORS = [{ value: 'at_least', label: 'is at least' }, { value: 'at_most', label: 'is at most' }, { value: 'equals', label: 'equals' }, { value: 'not_equals', label: 'does not equal' }, { value: 'between', label: 'is between' }];
  var FLOW_ENTRY_FIELDS = {
    account_status: { group: 'Customer identity', label: 'Account status', kind: 'select', operators: FLOW_ENTRY_SELECT_OPERATORS, options: [{ value: 'signed_in', label: 'Signed in' }, { value: 'guest', label: 'Guest' }] },
    customer_type: { group: 'Customer identity', label: 'First order or returning', kind: 'select', operators: FLOW_ENTRY_SELECT_OPERATORS, options: [{ value: 'new', label: 'New customer' }, { value: 'returning', label: 'Returning customer' }] },
    customer_tag: { group: 'Customer identity', label: 'Customer tags', kind: 'tags', operators: FLOW_ENTRY_TAG_OPERATORS },
    marketing_consent: { group: 'Customer identity', label: 'Email marketing consent', kind: 'select', operators: FLOW_ENTRY_SELECT_OPERATORS, options: [{ value: 'subscribed', label: 'Subscribed' }, { value: 'not_subscribed', label: 'Not subscribed' }] },
    past_orders: { group: 'Customer identity', label: 'Past orders', kind: 'number', unit: 'orders', operators: FLOW_ENTRY_NUMBER_OPERATORS },
    lifetime_value: { group: 'Customer identity', label: 'Customer lifetime spend', kind: 'number', unit: '$', operators: FLOW_ENTRY_NUMBER_OPERATORS },
    last_order: { group: 'Customer identity', label: 'Last order date', kind: 'number', unit: 'days', operators: [{ value: 'within_last', label: 'is in the last' }, { value: 'more_than', label: 'is more than' }] },
    storefront_market: { group: 'Storefront context', label: 'Storefront country', kind: 'select', operators: FLOW_ENTRY_SELECT_OPERATORS, options: [{ value: 'US', label: 'United States' }, { value: 'CA', label: 'Canada' }, { value: 'GB', label: 'United Kingdom' }] },
    storefront_language: { group: 'Storefront context', label: 'Storefront language', kind: 'select', operators: FLOW_ENTRY_SELECT_OPERATORS, options: [{ value: 'en', label: 'English' }, { value: 'zh-CN', label: 'Chinese' }] },
    cart_subtotal: { group: 'Cart', label: 'Cart subtotal', kind: 'number', unit: '$', operators: FLOW_ENTRY_NUMBER_OPERATORS },
    cart_total: { group: 'Cart', label: 'Cart total', kind: 'number', unit: '$', operators: FLOW_ENTRY_NUMBER_OPERATORS },
    cart_currency: { group: 'Cart', label: 'Cart currency', kind: 'select', operators: FLOW_ENTRY_SELECT_OPERATORS, options: [{ value: 'USD', label: 'USD' }, { value: 'CAD', label: 'CAD' }, { value: 'GBP', label: 'GBP' }] },
    cart_items: { group: 'Cart', label: 'Cart item count', kind: 'number', unit: 'items', operators: FLOW_ENTRY_NUMBER_OPERATORS },
    cart_product: { group: 'Cart', label: 'Cart products', kind: 'tags', operators: FLOW_ENTRY_TAG_OPERATORS },
    cart_sku: { group: 'Cart', label: 'Cart contains SKU', kind: 'tags', operators: FLOW_ENTRY_TAG_OPERATORS }
  };
  function flowLegacyEntryConditions(flow) {
    if (Array.isArray(flow.entryConditions)) return JSON.parse(JSON.stringify(flow.entryConditions));
    if (flow.entry === 'New customers') return [{ field: 'customer_type', op: 'equals', value: 'new' }];
    if (flow.entry === 'Returning customers') return [{ field: 'customer_type', op: 'equals', value: 'returning' }];
    return [];
  }
  function flowEntryConditionText(condition) {
    var field = FLOW_ENTRY_FIELDS[condition.field] || {}, value = condition.value;
    var operator = (field.operators || []).filter(function (item) { return item.value === condition.op; })[0] || {};
    if (field.kind === 'select') {
      var opt = (field.options || []).filter(function (item) { return item.value === value; })[0];
      return t(field.label || '') + ' ' + t(operator.label || 'is') + ' ' + t((opt || {}).label || String(value || ''));
    }
    if (field.kind === 'tags') return t(field.label || '') + ' ' + t(operator.label || 'has any of these tags') + ' ' + (Array.isArray(value) ? value.join(', ') : String(value || ''));
    var suffix = field.unit === '$' ? '$' : field.unit === 'orders' ? ' ' + t('orders') : field.unit === 'days' ? ' ' + t('days') : field.unit === 'items' ? ' ' + t('items') : '';
    if (condition.op === 'between' && value && typeof value === 'object') return t(field.label || '') + ' ' + t(operator.label || 'is between') + ' ' + (field.unit === '$' ? '$' : '') + String(value.min == null ? '' : value.min) + ' – ' + (field.unit === '$' ? '$' : '') + String(value.max == null ? '' : value.max) + suffix;
    return t(field.label || '') + ' ' + t(operator.label || '') + ' ' + (field.unit === '$' ? '$' : '') + String(value == null ? '' : value) + (field.unit === '$' ? '' : suffix);
  }
  function flowEntrySummary(flow) {
    var conditions = flowLegacyEntryConditions(flow);
    if (conditions.length) return conditions.map(flowEntryConditionText).join(' · ');
    var defaultEntries = ['All eligible shoppers', 'All remaining shoppers', 'All other shoppers', 'All shoppers', 'All eligible customers', 'All remaining customers', 'All other customers', 'All customers', ''];
    if (defaultEntries.indexOf(flow.entry || '') !== -1) {
      var hasHigherPriorityFlow = bcFlowList().some(function (candidate) {
        return candidate.id !== flow.id && flowIsLive(candidate) && Number(candidate.priority) > Number(flow.priority);
      });
      return hasHigherPriorityFlow ? t('Customers not matched by higher-priority purchase flows') : t('All customers');
    }
    return t(flow.entry);
  }
  function flowPill(status) {
    var cls = status === 'Live' ? 'green' : status === 'Paused' ? 'orange' : 'gray';
    return '<span class="pill pill-' + cls + '"><span class="dot"></span>' + t(status) + '</span>';
  }
  function flowListPager(page, pages) {
    var item = function (label, target, options) {
      options = options || {};
      var cls = 'pg-item' + (options.active ? ' active' : '') + (options.disabled ? ' disabled' : '');
      return '<span class="' + cls + '"' + (options.disabled ? '' : ' data-flow-list-page="' + target + '"') + '>' + label + '</span>';
    };
    var numbers = '';
    for (var current = 1; current <= pages; current += 1) numbers += item(String(current), current, { active: current === page });
    return '<div class="pg">' +
      item('‹', page - 1, { disabled: page <= 1 }) + numbers + item('›', page + 1, { disabled: page >= pages }) +
      '<select class="pg-size" data-flow-list-size>' +
        [20, 50, 100].map(function (size) { return '<option value="' + size + '"' + (size === flowListState.size ? ' selected' : '') + '>' + size + ' ' + t('per page') + '</option>'; }).join('') +
      '</select></div>';
  }
  function renderFlowList(filter) {
    // Each flow opens directly in the same visual canvas editor.
    flowDetailView = 'canvas';
    var activeFilter = filter || flowListState.filter || 'all';
    if (activeFilter !== flowListState.filter) flowListState.page = 1;
    flowListState.filter = activeFilter;
    var flows = bcFlowList().slice().sort(function (a, b) { return b.priority - a.priority; });
    var shown = activeFilter === 'all' ? flows : flows.filter(function (flow) { return flow.status.toLowerCase() === activeFilter; });
    var totalRecords = shown.length;
    var pages = Math.max(1, Math.ceil(totalRecords / flowListState.size));
    if (flowListState.page > pages) flowListState.page = pages;
    var pageStart = (flowListState.page - 1) * flowListState.size;
    var pageFlows = shown.slice(pageStart, pageStart + flowListState.size);
    var counts = { all: flows.length, live: 0, draft: 0, paused: 0 };
    flows.forEach(function (flow) { counts[flow.status.toLowerCase()] = (counts[flow.status.toLowerCase()] || 0) + 1; });
    var tabs = [['all', 'All'], ['live', 'Live'], ['draft', 'Draft'], ['paused', 'Paused']].map(function (item) {
      return '<button class="fl-tab' + (activeFilter === item[0] ? ' active' : '') + '" data-flow-filter="' + item[0] + '">' + t(item[1]) + '<span>' + (counts[item[0]] || 0) + '</span></button>';
    }).join('');
    var priorityCards = flows.filter(flowIsLive).map(function (flow) {
      return '<a class="fl-priority-card" href="#/flows/' + esc(flow.id) + '"><span class="fl-priority-no">#' + esc(flow.priority) + '</span><span class="fl-priority-copy"><strong>' + esc(t(flow.name)) + '</strong><small>' + esc(flowEntrySummary(flow)) + '</small></span>' + flowPill(flow.status) + '<span class="fl-caret">›</span></a>';
    }).join('');
    var tableRows = pageFlows.map(function (flow) {
      return '<tr><td><a class="fl-name" href="#/flows/' + esc(flow.id) + '">' + esc(t(flow.name)) + '</a><div class="fl-sub">' + esc(flowEntrySummary(flow)) + '</div><div class="fl-meta">' + t('Priority') + ' ' + esc(flow.priority) + ' · <span class="fl-path">' + esc(flowListPagePath(flow)) + '</span></div></td><td>' + flowPill(flow.status) + '</td><td><b>' + esc(flow.traffic) + '</b><small>' + t('of checkout traffic') + '</small></td><td><b>' + esc(flow.conversion) + '</b><small>' + t('conversion') + '</small></td><td><b>' + esc(flow.aov) + '</b><small>' + t('average order value') + '</small></td><td><div class="fl-row-actions">' + flowPrimaryButton(flow, 'btn btn-default fl-row-action') + '<a class="fl-open" href="#/flows/' + esc(flow.id) + '">' + t('Open') + ' ›</a></div></td></tr>';
    }).join('');
    root.innerHTML = wrap(GSTYLE + FSTYLE + '<style>' +
      '.fl-page{width:100%;max-width:none;margin:0;padding-bottom:40px}.fl-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:20px}.fl-head h1{margin:0;font-size:20px;font-weight:600;color:var(--ink)}.fl-head p{margin:6px 0 0;font-size:13px;color:var(--ink-muted);line-height:1.55}.fl-priority{border:1px solid var(--hair);border-radius:12px;background:#fff;padding:18px;margin-bottom:16px}.fl-priority-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.fl-priority h2{font-size:14px;font-weight:600;color:var(--ink);margin:0 0 4px}.fl-priority p{font-size:12.5px;color:var(--ink-muted);margin:0 0 14px;line-height:1.5}.fl-priority-head .btn{flex:none}.fl-priority-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.fl-priority-card{display:flex;align-items:center;gap:10px;border:1px solid var(--hair);border-radius:9px;padding:12px;text-decoration:none;color:var(--ink);min-width:0}.fl-priority-card:hover{border-color:#abc9f7;background:#fbfdff}.fl-priority-no{width:34px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;background:#e9f1ff;color:var(--brand);font-size:12px;font-weight:700;flex:none}.fl-priority-copy{display:flex;flex-direction:column;min-width:0;flex:1}.fl-priority-copy strong{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fl-priority-copy small{font-size:12px;color:var(--ink-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fl-priority-card .pill{margin:0}.fl-caret{font-size:22px;color:var(--ink-muted);line-height:1}.fl-fallback{display:flex;align-items:center;gap:10px;border:1px dashed var(--ctl);border-radius:9px;background:var(--panel);padding:11px 12px;margin-top:10px;font-size:12.5px;color:var(--ink-muted)}.fl-fallback b{color:var(--ink);display:block;font-size:14px;font-weight:600}.fl-fallback-ico{width:28px;height:28px;border-radius:7px;background:#e8ebef;display:inline-flex;align-items:center;justify-content:center;color:#5d6978;font-weight:700}.fl-list{border:1px solid var(--hair);border-radius:12px;background:#fff;overflow:hidden}.fl-list-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;border-bottom:1px solid var(--hair)}.fl-tabs{display:flex;gap:2px;min-width:0}.fl-tab{height:48px;border:0;border-bottom:2px solid transparent;background:none;color:var(--ink-muted);font-size:14px;padding:0 10px;cursor:pointer}.fl-tab span{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:9px;background:var(--panel);font-size:11px;margin-left:4px}.fl-tab.active{color:var(--ink);font-weight:600;border-bottom-color:var(--brand)}.fl-tab.active span{color:var(--brand);background:var(--brand-50)}.fl-count{font-size:12.5px;color:var(--ink-muted);white-space:nowrap}.fl-table{width:100%;border-collapse:collapse;min-width:820px}.fl-table-wrap{overflow:auto}.fl-table th{text-align:left;background:var(--panel);padding:10px 16px;border-bottom:1px solid var(--hair);font-size:13px;font-weight:600;color:var(--ink)}.fl-table td{padding:14px 16px;border-bottom:1px solid var(--hair);vertical-align:middle;font-size:13.5px}.fl-table tr:last-child td{border-bottom:0}.fl-name{color:var(--brand);font-weight:600;text-decoration:none}.fl-sub{font-size:12.5px;color:var(--ink-body);margin-top:3px}.fl-meta,.fl-table td small{display:block;font-size:12px;color:var(--ink-muted);margin-top:4px}.fl-table td b{font-size:13.5px;color:var(--ink)}.fl-table td .pill{margin:0}.fl-row-actions{display:flex;align-items:center;gap:10px;white-space:nowrap}.fl-row-action{height:30px;padding:0 10px;font-size:12px}.fl-open{color:var(--brand);font-weight:600;text-decoration:none;white-space:nowrap}.fl-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid var(--hair)}.fl-pagination-summary{font-size:13px;color:var(--ink-muted);white-space:nowrap}@media(max-width:860px){.fl-head{display:block}.fl-head .btn{margin-top:12px}.fl-priority-grid{grid-template-columns:1fr}.fl-priority-head{display:block}.fl-priority-head .btn{margin-top:8px}.fl-list-top{align-items:flex-start;flex-direction:column;padding:8px 12px}.fl-tab{height:36px;padding:0 8px}.fl-count{padding-bottom:8px}.fl-pagination{align-items:flex-start;flex-direction:column}.fl-pagination .pg{flex-wrap:wrap}}' +
      '</style><div class="fl-page"><div class="fl-head"><div><h1>' + t('Purchase flows') + '</h1><p>' + t('Create purchase flows, then open one to arrange Checkout pages, Upsells, Downsells, and Thank you pages.') + '</p></div><button class="btn btn-primary" data-create-flow>+ ' + t('Create purchase flow') + '</button></div>' +
      '<section class="fl-priority"><div class="fl-priority-head"><div><h2>' + t('Which purchase flow does a cart enter?') + '</h2><p>' + t('Only live purchase flows participate in matching. When several live purchase flows match, the flow with the higher priority value is used. Carts that do not match continue to Shopify Checkout.') + '</p></div><button type="button" class="btn btn-default" data-flow-priorities>' + t('Manage priorities') + '</button></div><div class="fl-priority-grid">' + priorityCards + '</div><div class="fl-fallback"><span class="fl-fallback-ico">S</span><div><small>' + t('Default fallback') + '</small><b>Shopify Checkout</b><span>' + t('Used when no purchase flow matches.') + '</span></div></div></section>' +
      '<section class="fl-list"><div class="fl-list-top"><div class="fl-tabs">' + tabs + '</div></div><div class="fl-table-wrap"><table class="fl-table"><thead><tr><th>' + t('Purchase flow') + '</th><th>' + t('Status') + '</th><th>' + t('Traffic') + '</th><th>' + t('Conversion') + '</th><th>' + t('AOV') + '</th><th></th></tr></thead><tbody>' + (tableRows || '<tr><td colspan="6"><div class="placeholder" style="min-height:180px">' + t('No purchase flows in this view.') + '</div></td></tr>') + '</tbody></table></div><div class="fl-pagination"><span class="fl-pagination-summary">' + t('Total') + ' ' + totalRecords + ' ' + t('purchase flows') + '</span>' + flowListPager(flowListState.page, pages) + '</div></section></div>');
    root.querySelectorAll('[data-flow-filter]').forEach(function (button) { button.onclick = function () { flowListState.page = 1; renderFlowList(button.getAttribute('data-flow-filter')); }; });
    var pageSize = root.querySelector('[data-flow-list-size]');
    if (pageSize) pageSize.onchange = function () { flowListState.size = Number(pageSize.value); flowListState.page = 1; renderFlowList(activeFilter); };
    root.querySelectorAll('[data-flow-list-page]').forEach(function (button) { button.onclick = function () { flowListState.page = Number(button.getAttribute('data-flow-list-page')); renderFlowList(activeFilter); }; });
    bindFlowStatusActions(null, function () { renderFlowList(activeFilter); });
    var create = root.querySelector('[data-create-flow]'); if (create) create.onclick = openCreateFlowWizard;
    var managePriorities = root.querySelector('[data-flow-priorities]'); if (managePriorities) managePriorities.onclick = function () { openFlowPriorityManager(function () { renderFlowList(activeFilter); }); };
    bcI18n(root);
  }
  function openCreateFlow() {
    var goals = [
      { id: 'aov', label: 'Increase average order value', desc: 'Show a relevant Upsell after payment.', flowDescription: 'Give new customers a relevant one-click Upsell after checkout.', path: 'Checkout → Upsell → Thank you', name: 'Order value booster', summary: '1 checkout · 1 upsell · 1 Thank you page', recommended: true },
      { id: 'recover', label: 'Recover a declined Upsell', desc: 'Show a Downsell when an Upsell is declined.', flowDescription: 'Show returning customers a Downsell after they decline the Upsell.', path: 'Checkout → Upsell → Downsell → Thank you', name: 'Second-chance offer', summary: '1 checkout · 1 upsell · 1 downsell · 1 Thank you page' },
      { id: 'completion', label: 'Improve checkout completion', desc: 'Start with a focused Checkout and add Upsells or Downsells later.', flowDescription: 'A focused checkout for all other customers, followed by the Thank you page.', path: 'Checkout → Thank you', name: 'Smooth checkout', summary: '1 checkout · No Upsell or Downsell · 1 Thank you page' }
    ];
    var selected = goals[0], modal = document.createElement('div'); modal.className = 'xp-modal';
    var close = function () { if (modal._createFlowStyle) modal._createFlowStyle.remove(); modal.remove(); };
    var render = function () {
      var nextPriority = (function () { var flows = bcFlowList(); return flows.length ? Math.max.apply(null, flows.map(function (flow) { return Number(flow.priority) || 0; })) + 10 : 10; }());
      var stepper = '<div class="fc-create-steps"><div class="fc-create-step active"><span>1</span><b>' + t('Choose a goal') + '</b></div></div>';
      var body = '<div class="fc-create-lead">' + t('What would you like this purchase flow to improve?') + '</div><div class="fc-create-goals">' + goals.map(function (goal) {
          var active = selected.id === goal.id;
          return '<button type="button" class="fc-create-goal' + (active ? ' active' : '') + '" data-flow-goal="' + goal.id + '" aria-pressed="' + active + '"><span class="fc-create-radio"></span><span class="fc-create-goal-copy"><strong>' + t(goal.label) + (goal.recommended ? '<em>' + t('Recommended') + '</em>' : '') + '</strong><small>' + t(goal.desc) + '</small><code>' + t(goal.path) + '</code></span></button>';
        }).join('') + '</div><div class="fc-create-priority"><label>' + t('Priority') + '<input id="flow-new-priority" class="input" type="number" min="1" step="10" value="' + esc(nextPriority) + '"></label><p>' + t('Higher numbers are checked first. You can change this later.') + '</p></div><div class="fc-create-safe"><span class="fc-create-safe-icon" aria-hidden="true">i</span><div><b>' + t('Nothing goes live when you create it') + '</b><p>' + t('A draft is created with Shopify Checkout as the safety route. Set the customer entry from the flow after creating it.') + '</p></div></div>';
      modal.innerHTML = XSTYLE + FSTYLE + '<style>' +
        '.fc-create{width:min(560px,calc(100vw - 32px);background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 18px 42px rgba(24,36,56,.2)}.fc-create-h{padding:19px 20px 14px;border-bottom:1px solid var(--hair);display:flex!important;align-items:flex-start;justify-content:space-between;gap:14px}.fc-create-h>div{min-width:0}.fc-create-h h2{margin:0;font-size:18px;line-height:1.3;color:var(--ink)}.fc-create-h p{margin:4px 0 0;font-size:12.5px;color:var(--ink-muted);line-height:1.5}.fc-create-x{margin-left:auto;flex:none;border:0;background:none;color:var(--ink-muted);font-size:22px;line-height:20px;cursor:pointer;padding:0 2px}.fc-create-b{padding:17px 20px 18px}.fc-create-steps{display:flex;align-items:center;gap:10px;margin:0 0 18px}.fc-create-step{display:flex;align-items:center;gap:7px;min-width:0;color:var(--ink-muted);font-size:12px}.fc-create-step span{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#263442;color:#fff;font-size:11px;font-weight:700}.fc-create-step b{font-weight:600;white-space:nowrap;color:var(--ink)}.fc-create-lead{font-size:14px;font-weight:650;color:var(--ink);margin-bottom:11px}.fc-create-goals{display:flex;flex-direction:column;gap:8px}.fc-create-goal{display:flex;align-items:flex-start;gap:12px;text-align:left;border:1px solid var(--hair);border-radius:9px;background:#fff;padding:13px;cursor:pointer;color:var(--ink)}.fc-create-goal:hover{border-color:#9fc4f9;background:#fbfdff}.fc-create-goal.active{border-color:var(--brand);box-shadow:inset 0 0 0 1px rgba(0,102,230,.1);background:#f8fbff}.fc-create-radio{width:12px;height:12px;border:1.5px solid #9aa4b3;border-radius:50%;margin-top:6px;flex:none}.fc-create-goal.active .fc-create-radio{border-color:var(--brand);box-shadow:inset 0 0 0 3px #fff;background:var(--brand)}.fc-create-goal-copy{min-width:0;display:block;flex:1}.fc-create-goal strong{display:flex;align-items:center;gap:7px;font-size:13.5px;line-height:1.4}.fc-create-goal em{font-size:10px;font-style:normal;color:#16734b;background:#e5f5ec;border-radius:999px;padding:2px 6px}.fc-create-goal small{display:block;color:var(--ink-body);font-size:12px;line-height:1.45;margin-top:3px}.fc-create-goal code{display:block;color:var(--ink-muted);font-size:11px;margin-top:6px;font-family:inherit}.fc-create-priority{display:flex;align-items:flex-end;gap:12px;margin-top:14px;border:1px solid var(--hair);border-radius:8px;background:var(--panel);padding:11px 12px}.fc-create-priority label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:650;color:var(--ink);width:120px}.fc-create-priority .input{height:34px}.fc-create-priority p{margin:0;flex:1;color:var(--ink-muted);font-size:11.5px;line-height:1.45}.fc-create-safe{display:flex;gap:10px;border-radius:8px;background:#e9f7ef;color:#256342;padding:11px 12px;margin-top:14px}.fc-create-safe-icon{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:1px solid currentColor;border-radius:50%;font-size:11px!important;font-family:Georgia,serif;font-style:italic;font-weight:700;line-height:1!important;flex:none}.fc-create-safe b{font-size:13px}.fc-create-safe p{margin:3px 0 0;font-size:11.5px;line-height:1.5}.fc-create-f{padding:13px 20px;border-top:1px solid var(--hair);display:flex;justify-content:flex-end;gap:8px}@media(max-width:560px){.fc-create{width:calc(100vw - 20px)}.fc-create-h,.fc-create-b,.fc-create-f{padding-left:16px;padding-right:16px}.fc-create-goal{padding:11px}.fc-create-priority{align-items:flex-start;flex-direction:column}.fc-create-priority label{width:100%}}' +
        '</style><div class="fc-create"><div class="fc-create-h"><div><h2>' + t('Create a purchase flow') + '</h2><p>' + t('Choose the business result first. We will prepare a starter flow for you.') + '</p></div><button type="button" class="fc-create-x" data-flow-close aria-label="' + t('Close') + '">×</button></div><div class="fc-create-b">' + stepper + body + '</div><div class="fc-create-f"><button type="button" class="btn btn-default" data-flow-close>' + t('Cancel') + '</button><button type="button" class="btn btn-primary" data-flow-next>' + t('Create flow') + '</button></div></div>';
      // XSTYLE and FSTYLE are shared overlay styles. Mount the final style tag,
      // which belongs specifically to this dialog, so it survives each wizard
      // step re-render instead of leaving the dialog body unstyled.
      var createStyle = modal.querySelector('style:last-of-type');
      if (modal._createFlowStyle) modal._createFlowStyle.remove();
      if (createStyle) { document.head.appendChild(createStyle); modal._createFlowStyle = createStyle; }
      modal.querySelectorAll('[data-flow-close]').forEach(function (button) { button.onclick = close; });
      modal.querySelectorAll('[data-flow-goal]').forEach(function (button) { button.onclick = function () { selected = goals.filter(function (goal) { return goal.id === button.getAttribute('data-flow-goal'); })[0] || selected; render(); }; });
      modal.querySelector('[data-flow-next]').onclick = function () {
        var priority = Math.round(Number(modal.querySelector('#flow-new-priority').value));
        var flows = bcFlowList(), id = 'flow-' + Date.now();
        if (!priority || priority < 1 || flows.some(function (flow) { return Number(flow.priority) === priority; })) { toast(t('Choose an unused priority greater than 0.')); return; }
        flows.push({ id: id, name: selected.name, description: selected.flowDescription, audience: 'All remaining customers', entry: 'All remaining customers', priority: priority, status: 'Draft', traffic: '0%', conversion: '—', aov: '—', updated: 'Just now', summary: selected.summary });
        bcFlowListSave(flows); bcFunnelSaveFor(id, fnStarter(selected.id)); activeFlowId = id; close(); location.hash = '#/flows/' + id;
      };
    };
    document.body.appendChild(modal); modal.addEventListener('click', function (event) { if (event.target === modal) close(); }); render();
  }
  // Mirrors the Custom App's creation flow: merchants choose an outcome first,
  // then name the draft and choose the closest buyer-entry starting point.
  // Details can still be refined on the canvas after creation.
  function openCreateFlowWizard() {
    var goals = [
      { id: 'aov', label: 'Increase average order value', desc: 'Show a relevant Upsell after payment.', path: 'Checkout → Upsell → Thank you', name: 'Order value booster', nameZh: '客单价提升', summary: '1 checkout · 1 upsell · 1 Thank you page', recommended: true },
      { id: 'recover', label: 'Recover a declined Upsell', desc: 'Show a Downsell when an Upsell is declined.', path: 'Checkout → Upsell → Downsell → Thank you', name: 'Second-chance offer', nameZh: '优惠挽回', summary: '1 checkout · 1 upsell · 1 downsell · 1 Thank you page' },
      { id: 'completion', label: 'Improve checkout completion', desc: 'Start with a focused Checkout and add Upsells or Downsells later.', path: 'Checkout → Thank you', name: 'Smooth checkout', nameZh: '顺畅结账', summary: '1 checkout · No Upsell or Downsell · 1 Thank you page' }
    ];
    var defaultName = function (goal) { return window.I18N && window.I18N.lang === 'zh' ? goal.nameZh : goal.name; };
    var step = 'goal', selectedGoal = goals[0], flowName = defaultName(goals[0]), entryConditions = [];
    var modal = document.createElement('div'); modal.className = 'xp-modal';
    var close = function () { if (modal._createWizardStyle) modal._createWizardStyle.remove(); modal.remove(); };
    var nextPriority = function () { var flows = bcFlowList(); return flows.length ? Math.max.apply(null, flows.map(function (flow) { return Number(flow.priority) || 0; })) + 10 : 10; };
    var mountStyle = function () {
      var style = modal.querySelector('style:last-of-type');
      if (modal._createWizardStyle) modal._createWizardStyle.remove();
      if (style) { document.head.appendChild(style); modal._createWizardStyle = style; }
    };
    var newCondition = function (fieldKey) {
      var field = FLOW_ENTRY_FIELDS[fieldKey] || FLOW_ENTRY_FIELDS.customer_type;
      return { field: fieldKey || 'customer_type', op: field.operators[0].value, value: field.kind === 'tags' ? [] : field.kind === 'select' ? field.options[0].value : '' };
    };
    var fieldOptions = function (selected) {
      var groups = {};
      Object.keys(FLOW_ENTRY_FIELDS).forEach(function (key) {
        var field = FLOW_ENTRY_FIELDS[key];
        (groups[field.group] = groups[field.group] || []).push({ key: key, field: field });
      });
      return Object.keys(groups).map(function (group) {
        return '<optgroup label="' + esc(t(group)) + '">' + groups[group].map(function (item) {
          return '<option value="' + esc(item.key) + '"' + (item.key === selected ? ' selected' : '') + '>' + esc(t(item.field.label)) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
    };
    var operatorOptions = function (field, selected) {
      return (field.operators || []).map(function (operator) { return '<option value="' + esc(operator.value) + '"' + (operator.value === selected ? ' selected' : '') + '>' + t(operator.label) + '</option>'; }).join('');
    };
    var valueControl = function (index, condition) {
      var field = FLOW_ENTRY_FIELDS[condition.field] || FLOW_ENTRY_FIELDS.customer_type;
      if (field.kind === 'select') return '<select class="input fcw-condition-value" data-fcw-condition-value="' + index + '">' + field.options.map(function (option) { return '<option value="' + esc(option.value) + '"' + (option.value === condition.value ? ' selected' : '') + '>' + t(option.label) + '</option>'; }).join('') + '</select>';
      if (field.kind === 'tags') {
        var tags = Array.isArray(condition.value) ? condition.value : [];
        return '<div class="fcw-tags"><div class="fcw-tag-list">' + tags.map(function (tag) { return '<span>' + esc(tag) + '<button type="button" data-fcw-remove-tag="' + index + '" data-tag="' + esc(tag) + '">×</button></span>'; }).join('') + '</div><input class="input" data-fcw-tag-input="' + index + '" placeholder="' + t('Type a tag and press Enter') + '"></div>';
      }
      var prefix = field.unit === '$' ? '<span>$</span>' : '';
      var suffix = field.unit === 'orders' ? '<span>' + t('orders') + '</span>' : field.unit === 'days' ? '<span>' + t(condition.op === 'more_than' ? 'days ago' : 'days') + '</span>' : field.unit === 'items' ? '<span>' + t('items') + '</span>' : '';
      if (condition.op === 'between') {
        var range = condition.value && typeof condition.value === 'object' ? condition.value : {};
        return '<div class="fcw-number fcw-between">' + prefix + '<input class="input" type="number" min="0" step="1" data-fcw-condition-min="' + index + '" value="' + esc(range.min == null ? '' : range.min) + '"><span>' + t('and') + '</span>' + prefix + '<input class="input" type="number" min="0" step="1" data-fcw-condition-max="' + index + '" value="' + esc(range.max == null ? '' : range.max) + '">' + suffix + '</div>';
      }
      return '<div class="fcw-number">' + prefix + '<input class="input" type="number" min="0" step="1" data-fcw-condition-value="' + index + '" value="' + esc(condition.value == null ? '' : condition.value) + '">' + suffix + '</div>';
    };
    var conditionRow = function (index, condition) {
      var field = FLOW_ENTRY_FIELDS[condition.field] || FLOW_ENTRY_FIELDS.customer_type;
      return '<div class="fcw-condition-row"><select class="input" data-fcw-condition-field="' + index + '">' + fieldOptions(condition.field) + '</select><select class="input" data-fcw-condition-op="' + index + '">' + operatorOptions(field, condition.op) + '</select><div class="fcw-condition-value">' + valueControl(index, condition) + '</div><button type="button" class="fcw-condition-remove" data-fcw-condition-remove="' + index + '" aria-label="' + t('Remove condition') + '">×</button></div>';
    };
    var invalidCondition = function (condition) {
      var field = FLOW_ENTRY_FIELDS[condition.field] || {};
      if (field.kind === 'tags') return !Array.isArray(condition.value) || !condition.value.length;
      if (condition.op === 'between') return !condition.value || condition.value.min === '' || condition.value.min == null || condition.value.max === '' || condition.value.max == null;
      return condition.value === '' || condition.value == null;
    };
    var render = function () {
      var steps = '<div class="fcw-steps"><span class="' + (step === 'goal' ? 'is-current' : 'is-done') + '"><b>1</b>' + t('Choose a goal') + '</span><i></i><span class="' + (step === 'details' ? 'is-current' : '') + '"><b>2</b>' + t('Name and conditions') + '</span></div>';
      var body = '';
      if (step === 'goal') {
        body = '<p class="fcw-lead">' + t('What do you want this purchase flow to improve?') + '</p><div class="fcw-goals">' + goals.map(function (goal) {
          var selected = goal.id === selectedGoal.id;
          return '<button type="button" class="fcw-goal' + (selected ? ' is-selected' : '') + '" data-fcw-goal="' + goal.id + '" aria-pressed="' + selected + '"><span class="fcw-radio"></span><span><strong>' + t(goal.label) + (goal.recommended ? '<em>' + t('Recommended') + '</em>' : '') + '</strong><small>' + t(goal.desc) + '</small><span class="fcw-path">' + t(goal.path) + '</span></span></button>';
        }).join('') + '</div><div class="fcw-safe"><b>' + t('Nothing goes live when you create it') + '</b><span>' + t('BestCheckout creates a draft. Shopify Checkout remains the safety fallback until you publish.') + '</span></div>';
      } else {
        var conditions = entryConditions.length ? entryConditions.map(function (condition, index) { return conditionRow(index, condition); }).join('') : '<div class="fcw-condition-empty">' + t('No conditions added. All eligible customers can enter this purchase flow.') + '</div>';
        body = '<label class="fcw-field">' + t('Purchase flow name') + '<input class="input" id="fcw-name" value="' + esc(flowName) + '" maxlength="80" autofocus></label><div class="fcw-journey"><small>' + t('Starting journey') + '</small><strong>' + t(selectedGoal.label) + '</strong><span class="fcw-path">' + t(selectedGoal.path) + '</span></div><section class="fcw-conditions"><header><div><strong>' + t('Who enters this purchase flow? (AND)') + '</strong><p>' + t('Add customer attributes, storefront, or cart conditions directly. Every condition must match.') + '</p></div><span>' + t('No match → Shopify Checkout') + '</span></header><div class="fcw-condition-list">' + conditions + '</div><button type="button" class="fcw-condition-add" data-fcw-condition-add>+ ' + t('Add condition') + '</button><p class="fcw-condition-help">' + t('Customer order history and tags apply only to recognized Shopify customers.') + '</p></section><p class="fcw-msg" data-fcw-msg></p>';
      }
      modal.innerHTML = XSTYLE + FSTYLE + '<style>' +
        '.fcw{width:min(760px,calc(100vw - 32px));background:#fff;border-radius:12px;overflow:hidden;box-shadow:var(--float-shadow);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}.fcw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px 14px;border-bottom:1px solid var(--hair)}.fcw-head h2{font-size:18px;line-height:1.35;margin:0;color:var(--ink)}.fcw-head p{margin:4px 0 0;font-size:12.5px;line-height:1.5;color:var(--ink-muted)}.fcw-close{border:0;background:transparent;color:var(--ink-muted);font-size:22px;line-height:1;padding:0 2px;cursor:pointer}.fcw-body{padding:18px 20px;max-height:min(70vh,690px);overflow:auto}.fcw-steps{display:flex;align-items:center;gap:9px;margin-bottom:18px}.fcw-steps span{display:flex;align-items:center;gap:6px;color:var(--ink-muted);font-size:12px;font-weight:600}.fcw-steps span b{display:grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#edf0f5;color:var(--ink-muted);font-size:11px}.fcw-steps span.is-current{color:var(--ink)}.fcw-steps span.is-current b{background:var(--brand);color:#fff}.fcw-steps span.is-done b{background:#e0f2ec;color:var(--ok)}.fcw-steps i{height:1px;width:38px;background:var(--hair)}.fcw-lead{margin:0 0 11px;color:var(--ink);font-size:14px;font-weight:600}.fcw-goals{display:grid;gap:8px}.fcw-goal,.fcw-audience{display:flex;align-items:flex-start;gap:11px;border:1px solid var(--hair);border-radius:8px;background:#fff;color:var(--ink);padding:12px;text-align:left;cursor:pointer}.fcw-goal:hover,.fcw-audience:hover{border-color:#9ec4fa;background:#fbfdff}.fcw-goal.is-selected,.fcw-audience.is-selected{border-color:var(--brand);box-shadow:inset 0 0 0 1px #dceaff;background:#f8fbff}.fcw-radio{width:13px;height:13px;border:1.5px solid #9aa4b3;border-radius:50%;margin-top:5px;flex:none}.fcw-goal.is-selected .fcw-radio{border-color:var(--brand);box-shadow:inset 0 0 0 3px #fff;background:var(--brand)}.fcw-goal>span:last-child,.fcw-audience>span{min-width:0;display:block}.fcw-goal strong,.fcw-audience strong{display:flex;align-items:center;gap:6px;font-size:13.5px;line-height:1.35}.fcw-goal small,.fcw-audience small{display:block;margin-top:3px;color:var(--ink-body);font-size:12px;line-height:1.45}.fcw-path,.fcw-rule{display:block;margin-top:5px;color:var(--ink-muted);font-family:inherit;font-size:11px;font-weight:400;line-height:1.4;letter-spacing:normal}.fcw-goal em,.fcw-audience em{border-radius:999px;background:#e0f2ec;color:var(--ok);font-size:10px;font-style:normal;padding:2px 6px}.fcw-safe,.fcw-data-note{display:flex;flex-direction:column;gap:3px;margin-top:14px;border:1px solid #cce6dd;border-radius:8px;background:#f2fbf6;padding:10px 12px;color:#256342}.fcw-safe b,.fcw-data-note b{font-size:12.5px}.fcw-safe span,.fcw-data-note span{font-size:12px;line-height:1.45}.fcw-field{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink)}.fcw-field .input{height:36px;background:#fff}.fcw-journey{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:center;margin:14px 0;padding:10px 12px;border:1px solid #dbe8fb;border-radius:8px;background:#f7faff}.fcw-journey small{grid-row:span 2;color:var(--ink-muted);font-size:11px}.fcw-journey strong{font-size:13px}.fcw-journey .fcw-path{margin:0}.fcw-audience-head{display:flex;flex-direction:column;gap:3px;margin:0 0 8px}.fcw-audience-head strong{font-size:14px}.fcw-audience-head span{font-size:12px;color:var(--ink-muted)}.fcw-audiences{display:grid;grid-template-columns:1fr 1fr;gap:8px}.fcw-audience{padding:10px}.fcw-audience>i{display:grid;place-items:center;width:25px;height:25px;flex:none;border-radius:7px;background:#edf3fd;color:var(--brand);font-style:normal;font-size:13px}.fcw-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:13px 20px;border-top:1px solid var(--hair)}.fcw-foot-right{display:flex;gap:8px}@media(max-width:620px){.fcw{width:calc(100vw - 20px)}.fcw-head,.fcw-body,.fcw-foot{padding-left:16px;padding-right:16px}.fcw-audiences{grid-template-columns:1fr}.fcw-steps i{width:18px}}' +
        '.fcw-conditions{margin-top:14px;border:1px solid var(--hair);border-radius:9px;background:#fff;padding:11px}.fcw-conditions>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.fcw-conditions>header strong{display:block;color:var(--ink);font-size:13px}.fcw-conditions>header p{margin:3px 0 0;color:var(--ink-muted);font-size:11.5px;line-height:1.45}.fcw-conditions>header span{border-radius:999px;background:#f1f3f5;color:#6b7280;padding:3px 7px;font-size:10px;white-space:nowrap}.fcw-condition-list{display:flex;flex-direction:column;gap:7px}.fcw-condition-row{display:grid;grid-template-columns:minmax(172px,1.2fr) minmax(126px,.85fr) minmax(164px,1fr) 26px;gap:6px;align-items:center;border:1px solid var(--ctl);border-radius:7px;background:#fff;padding:6px}.fcw-condition-row .input{height:33px;min-width:0;background:#fff}.fcw-condition-value{min-width:0}.fcw-number{display:flex;align-items:center;gap:5px;min-width:0}.fcw-number>span{color:var(--ink-muted);font-size:11px;white-space:nowrap}.fcw-number .input{flex:1;width:100%;min-width:0}.fcw-between{gap:4px}.fcw-between .input{min-width:45px}.fcw-tags{display:flex;align-items:center;gap:5px;min-width:0}.fcw-tag-list{display:flex;align-items:center;flex-wrap:wrap;gap:4px}.fcw-tag-list span{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:5px;background:#e6f0ff;color:#225ec0;font-size:11px;white-space:nowrap}.fcw-tag-list button{border:0;background:transparent;color:inherit;padding:0;line-height:1;cursor:pointer;font-size:14px}.fcw-tags .input{flex:1;width:100%;min-width:82px}.fcw-condition-remove{width:26px;height:26px;border:0;border-radius:6px;background:transparent;color:#9aa4b3;font-size:17px;cursor:pointer}.fcw-condition-remove:hover{background:#fdeaea;color:var(--err)}.fcw-condition-add{width:100%;height:31px;margin-top:8px;border:1px dashed #9cbbe9;border-radius:7px;background:#fbfdff;color:var(--brand);font-size:12px;font-weight:600;cursor:pointer}.fcw-condition-add:hover{border-color:var(--brand);background:#f3f8ff}.fcw-condition-help{margin:9px 1px 0;color:var(--ink-muted);font-size:10.5px;line-height:1.45}.fcw-condition-empty{border:1px dashed var(--ctl);border-radius:7px;padding:13px;color:var(--ink-muted);font-size:12px}.fcw-msg{min-height:18px;margin:9px 0 0;color:var(--err);font-size:12px}.fcw-msg:empty{display:none}@media(max-width:650px){.fcw-conditions>header{flex-direction:column}.fcw-condition-row{grid-template-columns:1fr 1fr 26px}.fcw-condition-value{grid-column:1 / 3}.fcw-tags{flex-wrap:wrap}.fcw-tags .input{min-width:100%}}' +
        '</style><section class="fcw"><header class="fcw-head"><div><h2>' + t('Create a purchase flow') + '</h2><p>' + (step === 'goal' ? t('Choose the business result first. We will prepare a starter flow for you.') : t('Name the draft and set customer conditions directly.')) + '</p></div><button type="button" class="fcw-close" data-fcw-close aria-label="' + t('Close') + '">×</button></header><div class="fcw-body">' + steps + body + '</div><footer class="fcw-foot"><button type="button" class="btn btn-default" data-fcw-' + (step === 'goal' ? 'close' : 'back') + '">' + t(step === 'goal' ? 'Cancel' : 'Back') + '</button><div class="fcw-foot-right"><button type="button" class="btn btn-primary" data-fcw-next>' + t(step === 'goal' ? 'Continue' : 'Create draft purchase flow') + '</button></div></footer></section>';
      mountStyle(); bcI18n(modal);
      modal.querySelectorAll('[data-fcw-close]').forEach(function (button) { button.onclick = close; });
      var back = modal.querySelector('[data-fcw-back]'); if (back) back.onclick = function () { step = 'goal'; render(); };
      modal.querySelectorAll('[data-fcw-goal]').forEach(function (button) { button.onclick = function () { selectedGoal = goals.filter(function (goal) { return goal.id === button.getAttribute('data-fcw-goal'); })[0] || selectedGoal; flowName = defaultName(selectedGoal); render(); }; });
      var wizardName = modal.querySelector('#fcw-name'); if (wizardName) wizardName.oninput = function () { flowName = wizardName.value; };
      var addCondition = modal.querySelector('[data-fcw-condition-add]'); if (addCondition) addCondition.onclick = function () { entryConditions.push(newCondition('customer_type')); render(); };
      modal.querySelectorAll('[data-fcw-condition-remove]').forEach(function (button) { button.onclick = function () { entryConditions.splice(Number(button.getAttribute('data-fcw-condition-remove')), 1); render(); }; });
      modal.querySelectorAll('[data-fcw-condition-field]').forEach(function (select) { select.onchange = function () { entryConditions[Number(select.getAttribute('data-fcw-condition-field'))] = newCondition(select.value); render(); }; });
      modal.querySelectorAll('[data-fcw-condition-op]').forEach(function (select) { select.onchange = function () { var condition = entryConditions[Number(select.getAttribute('data-fcw-condition-op'))]; condition.op = select.value; condition.value = select.value === 'between' ? { min: '', max: '' } : (condition.value && typeof condition.value === 'object' && !Array.isArray(condition.value) ? '' : condition.value); render(); }; });
      modal.querySelectorAll('[data-fcw-condition-value]').forEach(function (input) { var update = function () { var index = Number(input.getAttribute('data-fcw-condition-value')); entryConditions[index].value = input.type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value; }; input.oninput = update; input.onchange = update; });
      modal.querySelectorAll('[data-fcw-condition-min]').forEach(function (input) { input.oninput = function () { var condition = entryConditions[Number(input.getAttribute('data-fcw-condition-min'))]; if (!condition.value || typeof condition.value !== 'object') condition.value = { min: '', max: '' }; condition.value.min = input.value === '' ? '' : Number(input.value); }; });
      modal.querySelectorAll('[data-fcw-condition-max]').forEach(function (input) { input.oninput = function () { var condition = entryConditions[Number(input.getAttribute('data-fcw-condition-max'))]; if (!condition.value || typeof condition.value !== 'object') condition.value = { min: '', max: '' }; condition.value.max = input.value === '' ? '' : Number(input.value); }; });
      modal.querySelectorAll('[data-fcw-remove-tag]').forEach(function (button) { button.onclick = function () { var index = Number(button.getAttribute('data-fcw-remove-tag')), tag = button.getAttribute('data-tag'); entryConditions[index].value = (entryConditions[index].value || []).filter(function (item) { return item !== tag; }); render(); }; });
      modal.querySelectorAll('[data-fcw-tag-input]').forEach(function (input) { input.onkeydown = function (event) { if (event.key !== 'Enter') return; event.preventDefault(); var index = Number(input.getAttribute('data-fcw-tag-input')), tag = input.value.trim(); if (tag && (entryConditions[index].value || []).indexOf(tag) < 0) entryConditions[index].value = (entryConditions[index].value || []).concat([tag]); render(); }; });
      modal.querySelector('[data-fcw-next]').onclick = function () {
        if (step === 'goal') { step = 'details'; render(); return; }
        var input = modal.querySelector('#fcw-name'); flowName = input ? input.value.trim() : '';
        if (!flowName) { if (input) input.focus(); toast(t('Enter a purchase flow name.'), 'error'); return; }
        if (entryConditions.some(invalidCondition)) { var message = modal.querySelector('[data-fcw-msg]'); if (message) message.textContent = t('Complete or remove every condition before applying.'); return; }
        var flows = bcFlowList(), id = 'flow-' + Date.now(), priority = nextPriority();
        var audience = entryConditions.length ? 'Custom audience' : 'All eligible customers';
        flows.push({ id: id, name: flowName, description: selectedGoal.desc, audience: audience, entry: audience, entryConditions: JSON.parse(JSON.stringify(entryConditions)), priority: priority, status: 'Draft', traffic: '0%', conversion: '—', aov: '—', updated: t('Just now'), summary: selectedGoal.summary });
        bcFlowListSave(flows); bcFunnelSaveFor(id, fnStarter(selectedGoal.id)); activeFlowId = id; close(); location.hash = '#/flows/' + id;
      };
    };
    document.body.appendChild(modal); modal.addEventListener('click', function (event) { if (event.target === modal) close(); }); render();
  }
  function openFlowPriorityManager(onSave) {
    var flows = bcFlowList().slice().sort(function (a, b) { return Number(b.priority) - Number(a.priority); });
    var modal = document.createElement('div'); modal.className = 'xp-modal';
    var close = function () { modal.remove(); };
    var rows = flows.map(function (flow) {
      return '<div class="fp-row"><div><strong>' + esc(t(flow.name)) + '</strong><span>' + esc(flowEntrySummary(flow)) + '</span></div><label><small>' + t('Priority') + '</small><input class="input" type="number" min="1" step="10" value="' + esc(flow.priority) + '" data-priority-for="' + esc(flow.id) + '"></label></div>';
    }).join('');
    modal.innerHTML = XSTYLE + FSTYLE + '<style>' +
      '.fp-modal{width:min(560px,calc(100vw - 32px))}.fp-intro{margin:0 0 14px;color:var(--ink-muted);font-size:13px;line-height:1.55}.fp-list{border:1px solid var(--hair);border-radius:9px;overflow:hidden}.fp-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-top:1px solid var(--hair)}.fp-row:first-child{border-top:0}.fp-row strong{display:block;color:var(--ink);font-size:13.5px}.fp-row span{display:block;color:var(--ink-muted);font-size:12px;margin-top:3px}.fp-row label{display:flex;align-items:center;gap:8px;flex:none}.fp-row label small{font-size:12px;color:var(--ink-muted)}.fp-row .input{width:82px;height:34px;text-align:center}.fp-msg{min-height:18px;margin:10px 0 0;color:var(--err);font-size:12px}.fp-msg:empty{display:none}@media(max-width:560px){.fp-row{align-items:flex-start;flex-direction:column}.fp-row label{width:100%;justify-content:space-between}.fp-row .input{width:100%}}' +
      '</style><div class="xp-mc fp-modal"><div class="xp-mh">' + t('Manage priorities') + '</div><div class="xp-mb"><p class="fp-intro">' + t('Higher numbers are checked first. Each purchase flow needs a unique priority.') + '</p><div class="fp-list">' + rows + '</div><p class="fp-msg" data-priority-msg></p></div><div class="xp-mf"><button type="button" class="btn btn-default" data-priority-cancel>' + t('Cancel') + '</button><button type="button" class="btn btn-primary" data-priority-save>' + t('Save priorities') + '</button></div></div>';
    document.body.appendChild(modal); bcI18n(modal);
    modal.addEventListener('click', function (event) { if (event.target === modal) close(); });
    modal.querySelector('[data-priority-cancel]').onclick = close;
    modal.querySelector('[data-priority-save]').onclick = function () {
      var values = {}, used = {}, message = '';
      modal.querySelectorAll('[data-priority-for]').forEach(function (input) {
        var priority = Math.round(Number(input.value));
        if (!priority || priority < 1) message = t('Priority must be a positive whole number.');
        if (used[priority]) message = t('Each purchase flow needs a unique priority.');
        used[priority] = true; values[input.getAttribute('data-priority-for')] = priority;
      });
      if (message) { modal.querySelector('[data-priority-msg]').textContent = message; return; }
      var latest = bcFlowList();
      latest.forEach(function (flow) { if (values[flow.id] != null) { flow.priority = values[flow.id]; flow.updated = t('Just now'); } });
      bcFlowListSave(latest); close(); toast(t('Priorities saved')); if (onSave) onSave();
    };
  }
  function fnDefault(flowId) {
    // Each default flow must start from the journey promised in its list entry.
    // Merchants can still add an A/B checkout branch or further pages from the canvas.
    if (flowId === 'smooth-checkout') return fnStarter('completion');
    if (flowId === 'first-order-boost') return fnStarter('aov');
    if (flowId === 'seasonal-returning-offer') return fnStarter('aov');
    return fnStarter('recover');
  }
  function fnIsLegacySharedDefault(state) {
    var expected = { src: 'shopify', co: 'checkout', co2: 'checkout', ctrl: 'control', up: 'upsell', down: 'downsell', ty: 'thankyou' };
    var byId = {};
    (state.nodes || []).forEach(function (node) { byId[node.id] = node.type; });
    return (state.nodes || []).length === 7 && (state.edges || []).length === 8 && Object.keys(expected).every(function (id) { return byId[id] === expected[id]; });
  }
  // New flows start from a short, goal-specific journey. The Shopify native checkout
  // remains a system fallback for shoppers who do not enter this flow; it is not a
  // destination in the Checkout-page split.
  function fnStarter(goal) {
    var s = {
      nodes: [{ id: 'src', type: 'shopify' }, { id: 'co', type: 'checkout', tpl: 'standard' }, { id: 'ctrl', type: 'control' }, { id: 'ty', type: 'thankyou', tpl: 'default' }],
      edges: [
        { from: 'src', to: 'co', rule: { type: 'expression', conditions: [] } },
        { from: 'src', to: 'ctrl', rule: { type: 'expression', conditions: [], fallback: true } }
      ]
    };
    if (goal === 'aov' || goal === 'recover') {
      s.nodes.push({ id: 'up', type: 'upsell', tpl: 'default' });
      s.edges.push({ from: 'co', to: 'up' });
      if (goal === 'recover') {
        s.nodes.push({ id: 'down', type: 'downsell', tpl: 'default' });
        s.edges.push({ from: 'up', to: 'ty', fromY: 0.34, rule: { type: 'expression', conditions: [{ field: 'action.upsell', op: 'eq', value: 'accept' }] } });
        s.edges.push({ from: 'up', to: 'down', fromY: 0.72, rule: { type: 'expression', conditions: [{ field: 'action.upsell', op: 'eq', value: 'decline' }], fallback: true } });
        s.edges.push({ from: 'down', to: 'ty' });
      } else s.edges.push({ from: 'up', to: 'ty' });
    } else s.edges.push({ from: 'co', to: 'ty' });
    fnAutoLayout(s); s._pub = fnSnap(s);
    return s;
  }
  // Snapshot the graph portion of state for publish-tracking — `_pub` is JSON of
  // {nodes, edges}. fnHasChanges() compares the current graph against it.
  function fnSnap(s) { return JSON.stringify({ nodes: s.nodes, edges: s.edges }); }
  function fnHasChanges(s) { return fnSnap(s) !== (s._pub || ''); }
  function fnPubEdgeKeys(s) {
    try {
      var pub = JSON.parse(s._pub || '{"edges":[]}');
      var ks = new Set();
      (pub.edges || []).forEach(function (e) { ks.add(e.from + '→' + e.to + ':' + JSON.stringify(e.rule || null)); });
      return ks;
    } catch (e) { return new Set(); }
  }
  function fnPublish(s) { s._pub = fnSnap(s); bcFunnelSave(s); }
  function fnDiscardChanges(s) {
    try {
      var pub = JSON.parse(s._pub || '');
      s.nodes = pub.nodes || [];
      s.edges = pub.edges || [];
      fnMigrateRules(s);
      fnEnsureSystemFallback(s);
      s._pub = fnSnap(s);
      bcFunnelSave(s);
      return true;
    } catch (e) { return false; }
  }

  // Shopify Checkout is a system safety route, not a merchant-created page.
  // Keep one non-removable fallback node on every flow, including old local
  // prototype state that may have been edited before this invariant existed.
  function fnEnsureSystemFallback(s) {
    if (!s || !s.nodes) return false;
    var changed = false;
    var source = (s.nodes || []).filter(function (node) { return fnIsSource(node.type); })[0];
    if (!source) return false;
    var control = (s.nodes || []).filter(function (node) { return fnIsControl(node.type); })[0];
    if (!control) {
      var usedIds = {};
      (s.nodes || []).forEach(function (node) { usedIds[node.id] = true; });
      var controlId = 'ctrl', suffix = 2;
      while (usedIds[controlId]) controlId = 'ctrl-' + suffix++;
      var sourcePos = source.pos || { x: 50, y: 50 };
      control = { id: controlId, type: 'control', system: true, pos: { x: sourcePos.x + 280, y: sourcePos.y + 170 } };
      s.nodes.push(control);
      changed = true;
    }
    if (!control.system) { control.system = true; changed = true; }
    s.edges = s.edges || [];
    var fallbackEdge = (s.edges || []).filter(function (edge) { return edge.from === source.id && edge.to === control.id; })[0];
    if (!fallbackEdge) {
      fallbackEdge = { from: source.id, to: control.id, rule: { type: 'expression', conditions: [], fallback: true } };
      s.edges.push(fallbackEdge);
      changed = true;
    }
    fallbackEdge.rule = fallbackEdge.rule || { type: 'expression', conditions: [], fallback: true };
    if ((fallbackEdge.rule.conditions || []).length) { fallbackEdge.rule.conditions = []; changed = true; }
    if (!fallbackEdge.rule.fallback) { fallbackEdge.rule.fallback = true; changed = true; }
    // The native checkout is a terminal system fallback. Any merchant-created
    // inbound/outbound connection would make it look editable and can create a loop.
    var protectedEdges = s.edges.filter(function (edge) {
      return edge.from === control.id || (edge.to === control.id && edge.from !== source.id);
    });
    if (protectedEdges.length) {
      s.edges = s.edges.filter(function (edge) {
        return edge.from !== control.id && !(edge.to === control.id && edge.from !== source.id);
      });
      changed = true;
    }
    (s.edges || []).forEach(function (edge) {
      if (edge.from === source.id && edge.to !== control.id && edge.rule && edge.rule.fallback) {
        edge.rule.fallback = false;
        changed = true;
      }
    });
    return changed;
  }
  function fnIsSystemFallbackEdge(s, from, to) {
    var source = (s && s.nodes || []).filter(function (node) { return fnIsSource(node.type); })[0];
    var control = (s && s.nodes || []).filter(function (node) { return fnIsControl(node.type); })[0];
    return !!(source && control && source.id === from && control.id === to);
  }

  function bcFunnel() {
    try {
      var key = bcFunnelKey();
      var legacy = activeFlowId === 'first-order-boost' ? localStorage.getItem('bsio_bc_funnel') : null;
      var s = JSON.parse(localStorage.getItem(key) || legacy || 'null');
      if (s && s.nodes) {
        // Before flow-specific starters existed, every new flow loaded the same
        // checkout + Upsell + Downsell graph. Migrate only that untouched seed.
        if (fnIsLegacySharedDefault(s)) {
          var scoped = fnDefault(activeFlowId); scoped._pub = fnSnap(scoped); bcFunnelSave(scoped);
          return scoped;
        }
        var migrated = fnMigrateRules(s);
        var fallbackRepaired = fnEnsureSystemFallback(s);
        // Backfill _pub for legacy state — treat existing graphs as already published.
        if (!s._pub || migrated || fallbackRepaired) { s._pub = fnSnap(s); bcFunnelSave(s); }
        return s;
      }
    } catch (e) {}
    var def = fnDefault(activeFlowId); fnMigrateRules(def); fnEnsureSystemFallback(def);
    // First-ever load — treat the default funnel as already published so red edges
    // only appear when the merchant makes a real change.
    def._pub = fnSnap(def);
    return def;
  }
  function bcFunnelSave(s) { try { fnEnsureSystemFallback(s); localStorage.setItem(bcFunnelKey(), JSON.stringify(s)); } catch (e) {} }
  // Unified edge rule model. Legacy {label,kind,split} → {rule:{type,value}}. Idempotent.
  //   button:    { type:'button',    value:'YES'|'NO' }     — only valid when source has buttons
  //   random:    { type:'random',    value:N|null }         — N% (null = even-split with siblings)
  //   predicate: { type:'predicate', key:'customer.type', value:'new'|'returning'|... }
  // Edge rule = an Azoya-style expression: a list of AND'd conditions, each `{field,op,value}`.
  // `fallback:true` means "match anything not caught by sibling edges". Migration covers every prior
  // shape (button/random/predicate union) so old funnels keep working — idempotent.
  function fnMigrateRules(s) {
    var changed = false;
    var typeOf = {}; (s.nodes || []).forEach(function (n) { typeOf[n.id] = n.type; });
    var actionFieldFor = function (fromId) { var t = typeOf[fromId]; return t === 'downsell' ? 'action.downsell' : 'action.upsell'; };
    (s.edges || []).forEach(function (e) {
      // Legacy {label,kind,split} → expression
      if (!e.rule) {
        changed = true;
        if (e.kind === 'accept' || e.label === 'YES') e.rule = { type: 'expression', conditions: [{ field: actionFieldFor(e.from), op: 'eq', value: 'accept' }] };
        else if (e.kind === 'decline' || e.label === 'NO') e.rule = { type: 'expression', conditions: [{ field: actionFieldFor(e.from), op: 'eq', value: 'decline' }] };
        else if (e.split != null) e.rule = { type: 'expression', conditions: [{ field: 'random', op: 'pct', value: e.split }] };
        else e.rule = { type: 'expression', conditions: [] };
      }
      // Previous round's rule model (button/random/predicate union) → expression
      if (e.rule.type === 'button') {
        changed = true;
        e.rule = { type: 'expression', conditions: [{ field: actionFieldFor(e.from), op: 'eq', value: e.rule.value === 'NO' ? 'decline' : 'accept' }] };
      } else if (e.rule.type === 'random') {
        changed = true;
        var v = e.rule.value; e.rule = { type: 'expression', conditions: v != null ? [{ field: 'random', op: 'pct', value: v }] : [] };
      } else if (e.rule.type === 'predicate') {
        changed = true;
        e.rule = { type: 'expression', conditions: e.rule.value != null ? [{ field: e.rule.key || 'customer.type', op: 'eq', value: e.rule.value }] : [], fallback: e.rule.value == null };
      }
      e.rule.conditions = e.rule.conditions || [];
      // Buyer eligibility belongs to the purchase-flow entry. Source-node rules only distribute
      // buyers who have already entered this flow, so retain traffic percentages and remove filters.
      if (typeOf[e.from] === 'shopify') {
        var trafficOnly = e.rule.conditions.filter(function (c) { return c.field === 'random'; });
        if (trafficOnly.length !== e.rule.conditions.length) { e.rule.conditions = trafficOnly; changed = true; }
      }
    });
    // Guarantee exactly one fallback per fork. If none, mark the first branch with empty conditions;
    // if all branches have conditions, mark the last branch (= "safety net"). One-of semantics.
    var byFrom = {};
    (s.edges || []).forEach(function (e) { (byFrom[e.from] = byFrom[e.from] || []).push(e); });
    Object.keys(byFrom).forEach(function (k) {
      var arr = byFrom[k]; if (arr.length < 2) { arr.forEach(function (e) { delete e.rule.fallback; }); return; }
      var fallbacks = arr.filter(function (e) { return e.rule && e.rule.fallback; });
      if (fallbacks.length === 1) return;                            // exactly one → good
      changed = true;
      arr.forEach(function (e) { e.rule.fallback = false; });        // reset
      var empty = arr.filter(function (e) { return (e.rule.conditions || []).length === 0; })[0];
      (empty || arr[arr.length - 1]).rule.fallback = true;           // pick a default
    });
    return changed;
  }
  function fnRuleConds(e) { return (e && e.rule && e.rule.conditions) || []; }
  // Fallback = an explicit role per fork. The branch the system routes to when no sibling's
  // conditions match. Exactly one per fork. Conditions stay editable for fallback branches —
  // they're treated as "preference" but the branch acts as the safety net regardless.
  function fnRuleIsFallback(e) { return !!(e && e.rule && e.rule.fallback); }
  // The kind class used for arrow color/marker — derived from which fields the conditions reference.
  // Priority: action.* (accept/decline) > predicate (purple) > random (blue dash) > fallback (gray).
  // Fallback only wins if there are no conditions at all (purely the safety net).
  function fnRuleKind(e) {
    var conds = fnRuleConds(e);
    var act = conds.filter(function (c) { return /^action\./.test(c.field); })[0];
    if (act) return act.value === 'decline' ? 'decline' : 'accept';
    var hasRandom = conds.some(function (c) { return c.field === 'random'; });
    var hasOther = conds.some(function (c) { return c.field !== 'random'; });
    if (hasOther) return 'predicate';
    if (hasRandom) return 'random';
    return 'fallback';
  }
  // Build a short, comma-joined display label for the edge. Empty-conditions fallback shows "兜底";
  // a fallback WITH conditions shows the conditions + an "⚑" marker prefix so merchants can see both.
  function fnRuleLabel(e) {
    var conds = fnRuleConds(e);
    if (!conds.length) return t('Fallback');
    var prefix = fnRuleIsFallback(e) ? '⚑ ' : '';
    // Stable order: filters first (alphabetical by field), random last — so same conditions always
    // render in the same order across siblings ("老用户, 40%" not "40%, 老用户" depending on add order).
    conds = conds.slice().sort(function (a, b) {
      var ar = a.field === 'random', br = b.field === 'random';
      if (ar && !br) return 1;
      if (!ar && br) return -1;
      return a.field < b.field ? -1 : a.field > b.field ? 1 : 0;
    });
    var parts = conds.map(function (c) {
      var f = FIELD_CATALOG[c.field] || {};
      if (f.kind === 'percent') return (c.value != null ? c.value : '?') + '%';
      if (f.kind === 'multitag') {
        var v = Array.isArray(c.value) ? c.value : (c.value ? [c.value] : []);
        if (!v.length) return '?';
        var pre = c.op === 'none' ? '!' : '';
        return pre + v.join('+');
      }
      if (f.kind === 'enum') {
        var opt = (f.options || []).filter(function (o) { return o.value === c.value; })[0];
        return (c.op === 'ne' ? '!' : '') + (opt ? t(opt.short || opt.label) : c.value);
      }
      if (f.kind === 'number_op') {
        var unit = f.unit || ''; var sign = c.op === 'gt' ? '>' : c.op === 'lt' ? '<' : c.op === 'between' ? '' : '=';
        if (c.op === 'between' && Array.isArray(c.value)) return unit + c.value[0] + '~' + unit + c.value[1];
        return sign + unit + (c.value != null ? c.value : '?');
      }
      if (f.kind === 'bool') return (c.op === 'is_false' ? '!' : '') + t(f.label);
      return c.value;
    });
    return prefix + parts.join(', ');
  }
  function fnNode(s, id) { return (s.nodes || []).filter(function (n) { return n.id === id; })[0]; }
  function fnUid() { return 'n' + Math.random().toString(36).slice(2, 7); }
  function fnNodesOf(s, type) { return (s.nodes || []).filter(function (n) { return n.type === type; }); }
  function fnStageName(type) {
    return type === 'shopify' ? t('Storefront') : type === 'control' ? t('Shopify control') : t(fnLabel(type));
  }
  function fnOfferProduct(id) {
    if (!id) return null;
    return FLOW_OFFER_PRODUCTS.filter(function (product) { return product.id === id; })[0] || null;
  }
  function fnOfferBasePrice(product) {
    if (!product) return null;
    var price = Number(product.price);
    return isFinite(price) ? Math.max(0, price) : null;
  }
  function fnOfferDiscountValue(type, value) {
    var amount = Number(value);
    if (!isFinite(amount) || amount < 0) amount = 0;
    return type === 'fixed' ? amount : Math.min(100, amount);
  }
  function fnOfferPrice(product, type, value) {
    var base = fnOfferBasePrice(product);
    if (base == null) return null;
    var discount = fnOfferDiscountValue(type, value);
    var price = type === 'fixed' ? base - discount : base * (1 - discount / 100);
    return Math.max(0, Math.round(price * 100) / 100);
  }
  function fnOfferMoney(value) {
    return value == null || !isFinite(Number(value)) ? '—' : '$' + Number(value).toFixed(2);
  }
  function fnOfferValue(node) {
    var saved = (node && node.offer) || {};
    var product = fnOfferProduct(saved.productId);
    var type = saved.type === 'fixed' ? 'fixed' : 'percentage';
    var value = saved.value == null ? '' : saved.value;
    return {
      productId: product ? product.id : '',
      price: fnOfferPrice(product, type, value),
      compareAt: fnOfferBasePrice(product),
      type: type,
      value: value
    };
  }
  function fnOfferSummary(node) {
    var offer = fnOfferValue(node), product = fnOfferProduct(offer.productId);
    return product ? product.name + ' · ' + fnOfferMoney(offer.price) : t('No product selected');
  }
  function fnRuleSummary(edge) {
    var label = fnRuleLabel(edge || {});
    return label ? t(label) : t('All eligible customers');
  }
  function fnTrafficSummary(edge) {
    var traffic = fnRuleConds(edge).filter(function (condition) { return condition.field === 'random'; })[0];
    if (traffic && traffic.value != null) return traffic.value + '% ' + t('of entered traffic');
    return fnRuleIsFallback(edge) ? t('Remaining entered traffic') : t('All entered traffic');
  }
  // Traffic allocation inside a purchase flow is an experiment between the flow's
  // own Checkout pages. The Shopify control is intentionally excluded: it is the
  // entry-level system fallback for shoppers who did not enter this flow.
  function fnCheckoutTrafficEdges(st, fromId) {
    var source = fnNode(st, fromId) || fnNodesOf(st, 'shopify')[0];
    if (!source) return [];
    return fnForkEdges(st, source.id).filter(function (edge) {
      return (fnNode(st, edge.to) || {}).type === 'checkout';
    });
  }
  function fnCheckoutTrafficName(st, edge) {
    var checkout = fnNode(st, edge.to) || {};
    return t('Checkout') + ' · ' + esc(bcTplName('checkout', checkout.tpl));
  }
  function fnJourneyTargetName(st, id) {
    var node = fnNode(st, id) || {};
    if (fnIsControl(node.type)) return t('Shopify checkout');
    if (node.type === 'thankyou') return t('Thank you page');
    return t(fnLabel(node.type || 'page'));
  }
  function flowJourneyOutcomes(st, node) {
    var routes = fnForkEdges(st, node.id).filter(function (edge) { return fnRuleKind(edge) === 'accept' || fnRuleKind(edge) === 'decline'; });
    var outgoing = fnForkEdges(st, node.id);
    // Older, valid flows may use one unqualified edge when both answers proceed
    // to the same page. Show that decision explicitly, rather than making a
    // merchant read a connection line to infer what "No thanks" does.
    if (!routes.length && outgoing[0]) {
      var target = esc(fnJourneyTargetName(st, outgoing[0].to));
      return '<div class="fj-outcomes"><span class="fj-outcome accept"><b>' + t('Accepted') + '</b><i>→</i>' + target + '</span><span class="fj-outcome decline"><b>' + t('Declined') + '</b><i>→</i>' + target + '</span></div>';
    }
    if (!routes.length) return '';
    return '<div class="fj-outcomes">' + routes.map(function (edge) {
      var accepted = fnRuleKind(edge) === 'accept';
      return '<span class="fj-outcome ' + (accepted ? 'accept' : 'decline') + '"><b>' + t(accepted ? 'Accepted' : 'Declined') + '</b><i>→</i>' + esc(fnJourneyTargetName(st, edge.to)) + '</span>';
    }).join('') + '</div>';
  }
  function flowJourneyStage(st, type, options) {
    var nodes = fnNodesOf(st, type);
    var copy = options || {};
    var isOffer = type === 'upsell' || type === 'downsell';
    var eyebrow = copy.eyebrow ? '<span class="fj-eyebrow">' + t(copy.eyebrow) + '</span>' : '';
    var cards = nodes.map(function (node, index) {
      var checkoutNumber = type === 'checkout' && nodes.length > 1 ? index + 1 : null;
      var nodeIcon = checkoutNumber || copy.icon || '•';
      var nodeName = checkoutNumber ? t('Checkout') + ' ' + checkoutNumber : t(fnLabel(type));
      var meta = isOffer
        ? '<span class="fj-node-meta fj-offer-meta">' + esc(fnOfferSummary(node)) + '</span>'
        : '<span class="fj-node-meta">' + t('Template') + ': ' + esc(bcTplName(node.type, node.tpl)) + '</span>';
      var buttons = '';
      if (isOffer) {
        buttons += '<button type="button" class="btn btn-default" data-flow-offer="' + esc(node.id) + '">' + t(type === 'upsell' ? 'Configure Upsell' : 'Configure Downsell') + '</button>';
      } else {
        buttons += '<button type="button" class="btn btn-default" data-flow-template="' + esc(node.id) + '">' + t('Change template') + '</button>';
      }
      buttons += '<a class="btn btn-default" href="' + esc(bcEditHash(node.type, node.tpl)) + '">' + t('Edit design') + '</a>';
      if (type === 'checkout') buttons += '<button type="button" class="btn btn-default" data-flow-ab="' + esc(node.id) + '">A/B</button>';
      return '<article class="fj-node fj-node-' + esc(type) + '"><div class="fj-node-head"><span class="fj-stage-icon">' + esc(nodeIcon) + '</span><div><strong>' + esc(nodeName) + '</strong>' + meta + '</div></div><div class="fj-node-actions">' + buttons + '</div>' + (isOffer ? flowJourneyOutcomes(st, node) : '') + '</article>';
    }).join('');
    var empty = '<div class="fj-empty"><span>' + t(copy.empty || 'No page yet') + '</span></div>';
    var addButton = copy.addCheckout ? '<button type="button" class="fj-add" data-flow-add-checkout>+ ' + t('Add Checkout page') + '</button>' : '';
    return '<section class="fj-stage fj-stage-' + esc(type) + '"><header><div>' + eyebrow + '<h3>' + t(copy.title || fnStageName(type)) + '</h3><p>' + t(copy.description || '') + '</p></div></header><div class="fj-stage-nodes">' + (copy.beforeNodes || '') + (cards || empty) + addButton + '</div></section>';
  }
  function flowTrafficCard(st) {
    var branches = fnCheckoutTrafficEdges(st);
    if (branches.length < 2) return '';
    var rows = branches.map(function (edge) {
      return '<div class="fj-traffic-row"><span class="fj-traffic-dot"></span><span><strong>' + fnCheckoutTrafficName(st, edge) + '</strong><small>' + esc(fnTrafficSummary(edge)) + '</small></span><span class="fj-traffic-tag">' + t('Purchase flow') + '</span></div>';
    }).join('') || '<div class="fj-empty"><span>' + t('No traffic rule yet') + '</span></div>';
    return '<section class="fj-traffic panel card-pad"><div class="fj-card-head"><div><span class="fj-eyebrow">' + t('Traffic allocation') + '</span><h2>' + t('How entered customers are distributed') + '</h2><p>' + t('Split entered customers between BestCheckout Checkout pages.') + '</p></div><button type="button" class="btn btn-default" data-flow-traffic>' + t('Configure traffic') + '</button></div><div class="fj-traffic-list">' + rows + '</div></section>';
  }
  function flowJourneyTrafficMini(st) {
    var branches = fnCheckoutTrafficEdges(st);
    if (branches.length < 2) return '';
    var hasExplicitWeights = branches.some(function (edge) {
      var traffic = fnRuleConds(edge).filter(function (condition) { return condition.field === 'random'; })[0];
      return !!(traffic && traffic.value != null);
    });
    var labels = branches.map(function (edge, index) {
      var traffic = fnRuleConds(edge).filter(function (condition) { return condition.field === 'random'; })[0];
      var percent = traffic && traffic.value != null ? Number(traffic.value) : (hasExplicitWeights ? 0 : (index === 0 ? 100 : 0));
      if (!isFinite(percent)) percent = 0;
      return '<span class="fj-traffic-chip">' + fnCheckoutTrafficName(st, edge) + ' <b>' + esc(String(percent)) + '%</b></span>';
    }).join('');
    return '<section class="fj-traffic-mini"><header><div><small>' + t('Traffic rules') + '</small><strong>' + t('Checkout traffic') + '</strong></div><button type="button" class="btn btn-default" data-flow-traffic>' + t('Set traffic rules') + '</button></header><div>' + labels + '</div><p>' + t('Different audience → separate Funnel. Same audience → split traffic here.') + '</p></section>';
  }
  function flowJourneyStoreStage(flow, entryText) {
    return '<section class="fj-stage fj-stage-store"><header><div><h3>' + t('Shopify store') + '</h3><p>' + t('Matching customers begin here.') + '</p></div></header><div class="fj-stage-nodes"><article class="fj-node fj-node-store"><div class="fj-node-head"><span class="fj-stage-icon">S</span><div><strong>lavender-labs.myshopify.com</strong><span class="fj-node-meta">' + esc(entryText) + '</span></div></div><button type="button" class="fj-store-link" data-flow-entry>' + t('Configure entry') + '</button></article></div><div class="fj-stage-hint">' + t('Matching customers enter the BestCheckout journey.') + '</div></section>';
  }
  function flowJourneyFallback() {
    return '<div class="fj-fallback"><span class="fj-fallback-icon">S</span><div><span class="fj-eyebrow">' + t('System fallback') + '</span><strong>' + t('Unmatched customers continue to Shopify Checkout.') + '</strong><p>' + t('Always enabled. This route cannot be edited or removed.') + '</p></div></div>';
  }
  function fnJourneyAddOffer(type, templateId) {
    var s = bcFunnel();
    var checkouts = fnNodesOf(s, 'checkout'), thankyou = fnNodesOf(s, 'thankyou')[0];
    var upsell = fnNodesOf(s, 'upsell')[0], downsell = fnNodesOf(s, 'downsell')[0];
    if (!checkouts.length || !thankyou) { toast(t('Checkout and Thank you pages are required.')); return; }
    if (type === 'upsell') {
      if (upsell) { toast(t('An Upsell is already in this journey.')); return; }
      var upId = fnUid();
      s.nodes.push({ id: upId, type: 'upsell', tpl: templateId || 'default' });
      s.edges = (s.edges || []).filter(function (edge) {
        return !checkouts.some(function (checkout) { return edge.from === checkout.id && edge.to === thankyou.id; });
      });
      checkouts.forEach(function (checkout) { s.edges.push({ from: checkout.id, to: upId }); });
      s.edges.push({ from: upId, to: thankyou.id });
      bcFunnelSave(s); toast(t('Upsell added')); renderFunnel(); return;
    }
    if (!upsell) { toast(t('Add an Upsell before adding a Downsell.')); return; }
    if (downsell) { toast(t('A Downsell is already in this journey.')); return; }
    var downId = fnUid();
      s.nodes.push({ id: downId, type: 'downsell', tpl: templateId || 'default' });
    s.edges = (s.edges || []).filter(function (edge) { return !(edge.from === upsell.id && edge.to === thankyou.id); });
    s.edges.push({ from: upsell.id, to: thankyou.id, rule: { type: 'expression', conditions: [{ field: 'action.upsell', op: 'eq', value: 'accept' }] } });
    s.edges.push({ from: upsell.id, to: downId, rule: { type: 'expression', conditions: [{ field: 'action.upsell', op: 'eq', value: 'decline' }], fallback: true } });
    s.edges.push({ from: downId, to: thankyou.id });
    bcFunnelSave(s); toast(t('Downsell added')); renderFunnel();
  }
  function fnJourneyRemoveOffer(id) {
    var s = bcFunnel(), node = fnNode(s, id);
    if (!node || (node.type !== 'upsell' && node.type !== 'downsell')) return;
    var checkouts = fnNodesOf(s, 'checkout'), thankyou = fnNodesOf(s, 'thankyou')[0];
    var upsell = fnNodesOf(s, 'upsell')[0], downsell = fnNodesOf(s, 'downsell')[0];
    if (node.type === 'upsell' && downsell) { toast(t('Remove the linked Downsell first.')); return; }
    s.nodes = (s.nodes || []).filter(function (item) { return item.id !== id; });
    s.edges = (s.edges || []).filter(function (edge) { return edge.from !== id && edge.to !== id; });
    if (node.type === 'downsell' && upsell && thankyou) {
      var routes = fnForkEdges(s, upsell.id);
      if (!routes.some(function (edge) { return fnRuleKind(edge) === 'accept'; })) s.edges.push({ from: upsell.id, to: thankyou.id, rule: { type: 'expression', conditions: [{ field: 'action.upsell', op: 'eq', value: 'accept' }] } });
      if (!routes.some(function (edge) { return fnRuleKind(edge) === 'decline'; })) s.edges.push({ from: upsell.id, to: thankyou.id, rule: { type: 'expression', conditions: [{ field: 'action.upsell', op: 'eq', value: 'decline' }], fallback: true } });
    }
    if (node.type === 'upsell' && thankyou) checkouts.forEach(function (checkout) {
      if (!fnForkEdges(s, checkout.id).some(function (edge) { return edge.to === thankyou.id; })) s.edges.push({ from: checkout.id, to: thankyou.id });
    });
    bcFunnelSave(s); toast(t(node.type === 'upsell' ? 'Upsell removed' : 'Downsell removed')); renderFunnel();
  }
  function flowJourneyCanvasStyle() {
    return '<style>' +
      '.fj-canvas-journey{margin:0 0 12px;padding:0;overflow:hidden}.fj-canvas-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid var(--hair);background:#fff}.fj-canvas-head>div:first-child{display:flex;align-items:baseline;gap:7px}.fj-canvas-head strong{font-size:12px;color:var(--ink-body);font-weight:500}.fj-canvas-tools{display:flex;align-items:center;gap:6px;color:var(--ink-muted);font-size:11px}.fj-canvas-tools .btn{height:27px;padding:0 8px;font-size:11px}.fj-canvas{min-height:440px;overflow:auto;padding:16px;background-color:#fbfcfd;background-image:radial-gradient(#dbe1e8 1px,transparent 1px);background-size:12px 12px}.fj-canvas-row{display:grid;grid-template-columns:minmax(190px,1fr) 22px minmax(220px,1.15fr) 22px minmax(220px,1.15fr) 22px minmax(190px,1fr);align-items:start;column-gap:12px;width:100%;min-width:980px}.fj-canvas-row>.fj-stage{width:auto;min-width:0;min-height:0;padding:10px;background:rgba(255,255,255,.96);box-shadow:0 1px 2px rgb(16 24 40 / 4%)}.fj-canvas-row>.fj-stage header,.fj-offer-stack .fj-stage header{padding-bottom:8px}.fj-canvas-row>.fj-stage h3,.fj-offer-stack .fj-stage h3{font-size:12px}.fj-canvas-row>.fj-stage p,.fj-offer-stack .fj-stage p{font-size:10.5px}.fj-canvas-row .fj-stage-nodes{margin-top:9px}.fj-canvas-row .fj-node{padding:9px}.fj-canvas-row .fj-node-actions{margin-top:7px}.fj-canvas-row .fj-node-actions .btn{height:25px;font-size:10px;padding:0 7px}.fj-canvas-row .fj-stage-hint{font-size:10.5px}.fj-canvas-row .fj-store-link{border:0;background:none;padding:0;text-align:left;cursor:pointer}.fj-canvas-arrow{position:relative;display:grid;place-items:center;align-self:stretch;margin:0;color:transparent;font-size:0}.fj-canvas-arrow:before{position:absolute;top:118px;left:0;width:100%;border-top:1px solid #9aa7b6;content:""}.fj-canvas-arrow:after{position:absolute;top:111px;right:-1px;color:#7e8a98;font-size:18px;font-weight:700;content:"›"}.fj-offer-stack{position:relative;width:auto;min-width:0;display:grid;gap:0}.fj-offer-stack .fj-stage{min-width:0;min-height:0;padding:10px;background:rgba(255,255,255,.96);border:1px solid var(--hair);border-radius:10px;box-shadow:0 1px 2px rgb(16 24 40 / 4%)}.fj-offer-stack .fj-stage-downsell{margin-top:0}.fj-offer-branch{position:relative;height:34px;margin:0 18px}.fj-offer-branch:before{position:absolute;top:17px;left:0;width:100%;border-top:1px dashed #c6932f;content:""}.fj-decline-marker{position:absolute;top:8px;left:50%;z-index:1;transform:translateX(-50%);padding:1px 6px;color:#a9701a;background:#fff8eb;border:1px solid #efd6a1;border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap}.fj-traffic-mini{display:grid;gap:6px;margin:0 0 8px;padding:8px;border:1px solid #cfe1ff;border-radius:7px;background:#f7faff}.fj-traffic-mini header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:6px!important;padding:0!important;border:0!important}.fj-traffic-mini header small{display:block;color:var(--ink-muted);font-size:9.5px}.fj-traffic-mini header strong{display:block;color:var(--ink);font-size:10.5px}.fj-traffic-mini header .btn{height:23px;padding:0 6px;font-size:9.5px}.fj-traffic-mini>div{display:flex;flex-wrap:wrap;gap:4px}.fj-traffic-chip{display:inline-flex;align-items:center;padding:3px 5px;color:#2b62d6;background:#e8f0fe;border-radius:5px;font-size:9.5px;font-weight:650}.fj-traffic-chip b{margin-left:1px;font-weight:800;font-variant-numeric:tabular-nums}.fj-traffic-chip.is-control{color:#5f6c7b;background:#eef1f4}.fj-traffic-mini p{margin:0!important;font-size:9.5px!important;line-height:1.35!important}.fj-selected{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 12px;padding:12px 14px;border:1px solid var(--hair);border-radius:9px;background:#fff}.fj-selected strong{display:block;margin-top:2px;font-size:13px;color:var(--ink)}.fj-selected p{margin:3px 0 0;color:var(--ink-muted);font-size:11.5px;line-height:1.45}.fj-selected .btn{flex:none}@media(max-width:760px){.fj-canvas{min-height:0;padding:12px}.fj-canvas-row{min-width:980px}.fj-canvas-head{align-items:flex-start;flex-direction:column}.fj-canvas-tools{width:100%;justify-content:flex-end}.fj-selected{align-items:flex-start;flex-direction:column}.fj-selected .btn{width:100%}}' +
      '.fj-canvas-row-3{grid-template-columns:minmax(190px,1fr) 22px minmax(220px,1.15fr) 22px minmax(190px,1fr);min-width:720px}.fj-canvas-arrow:after{top:110px;right:-2px;padding:0 2px;color:#7e8a98;background:#fbfcfd;font-size:18px;font-weight:700;line-height:1;content:"→"}.fj-offer-branch{height:56px}.fj-offer-branch:after{position:absolute;top:29px;bottom:0;left:50%;border-left:1px dashed #c6932f;content:""}.fj-branch-arrow{position:absolute;z-index:2;top:37px;left:50%;transform:translateX(-50%);padding:0 2px;color:#b97917;background:#fbfcfd;font-size:13px;font-weight:700;line-height:13px}' +
      '.fj-canvas-row .fj-node-actions .btn{transition:border-color .16s ease,background-color .16s ease,color .16s ease,box-shadow .16s ease,transform .16s ease}.fj-canvas-row .fj-node-actions .btn:hover{border-color:#78a9df;background:#eaf4ff;color:#1768b3;box-shadow:0 2px 6px rgba(33,102,173,.18);transform:translateY(-1px)}.fj-canvas-row .fj-node-actions .btn:active{transform:translateY(0);box-shadow:none}.fj-canvas-row .fj-node-actions .btn:focus-visible{outline:2px solid #76adf1;outline-offset:2px;border-color:#4b8fd8}' +
      '</style>';
  }
  function renderFlowJourney(flow, st, dirty) {
    var source = fnNodesOf(st, 'shopify')[0];
    var firstRule = source && fnForkEdges(st, source.id)[0];
    var entryText = flowEntrySummary(flow) || fnRuleSummary(firstRule);
    var checkoutTraffic = fnCheckoutTrafficEdges(st, source && source.id);
    var trafficAction = checkoutTraffic.length > 1
      ? '<button type="button" class="btn btn-default" data-flow-traffic>' + t('Configure traffic') + '</button>'
      : '';
    var hasUpsell = fnNodesOf(st, 'upsell').length > 0;
    var hasDownsell = fnNodesOf(st, 'downsell').length > 0;
    var declineBranch = hasUpsell && hasDownsell
      ? '<div class="fj-offer-branch"><span class="fj-decline-marker">' + t('If declined') + '</span><span class="fj-branch-arrow" aria-hidden="true">↓</span></div>'
      : '';
    var offerStack = '';
    if (hasUpsell || hasDownsell) {
      offerStack = '<div class="fj-offer-stack">' +
        (hasUpsell ? flowJourneyStage(st, 'upsell', { title: 'Upsell', description: 'One-click offer after payment.', icon: '+' }) : '') +
        declineBranch +
        (hasDownsell ? flowJourneyStage(st, 'downsell', { title: 'Downsell', description: 'Alternative shown after an Upsell is declined.', icon: '↓' }) : '') +
        '</div>';
    }
    var journeyStages = [
      flowJourneyStoreStage(flow, entryText),
      flowJourneyStage(st, 'checkout', { title: 'Checkout', description: 'Collect payment and confirm the order.', icon: '1', beforeNodes: flowJourneyTrafficMini(st), addCheckout: true })
    ];
    if (offerStack) journeyStages.push(offerStack);
    journeyStages.push(flowJourneyStage(st, 'thankyou', { title: 'Thank you', description: 'Confirm the order and guide the next action.', icon: '✓' }));
    var journeyRow = journeyStages.join('<span class="fj-canvas-arrow">→</span>');
    var journeyMarkup = '<section class="fj-journey panel fj-canvas-journey"><header class="fj-canvas-head"><div><span class="fj-eyebrow">' + t('Purchase journey') + '</span><strong>' + esc(flowPagePath(st)) + '</strong></div><div class="fj-canvas-tools"><button type="button" class="btn btn-default" data-fj-zoom="fit">' + t('Fit') + '</button><button type="button" class="btn btn-default" data-fj-zoom="out">−</button><output data-fj-zoom-output>' + Math.round(fjCanvasZoom * 100) + '%</output><button type="button" class="btn btn-default" data-fj-zoom="in">+</button></div></header><div class="fj-canvas"><div class="fj-canvas-row fj-canvas-row-' + journeyStages.length + '">' + journeyRow + '</div></div></section>';
    root.innerHTML = (window.UI && window.UI.unsavedBar ? window.UI.unsavedBar({ show: dirty, saveLabel: 'Publish', saveAct: 'funnel-publish', discardAct: 'funnel-discard' }) : '') + wrap(GSTYLE + FSTYLE + XSTYLE + FLOW_SYSTEM_STYLE + flowDetailHeader(flow) +
      '<style>.fj-priority-edit{display:inline-flex;align-items:center;gap:4px;border:0;background:none;color:var(--brand);font:inherit;font-size:12px;font-weight:500;padding:0;cursor:pointer;margin-left:6px}.fj-priority-edit:hover{text-decoration:underline}</style><section class="fj-summary panel card-pad"><div class="fj-card-head"><div><h2>' + t('Customer entry') + '</h2><p>' + t('Set customer eligibility rules and priority for this flow. Customers who do not match continue to Shopify Checkout.') + '</p></div><div class="fj-summary-actions"><button type="button" class="btn btn-default" data-flow-entry>' + t('Configure entry') + '</button>' + trafficAction + '</div></div><div class="fj-summary-grid"><div><small>' + t('Eligible customers') + '</small><strong>' + esc(entryText) + '</strong></div><div><small>' + t('Priority') + '</small><strong>#' + esc(flow.priority) + '<button type="button" class="fj-priority-edit" data-flow-priority>' + t('Edit') + '</button></strong></div><div><small>' + t('System fallback') + '</small><strong>' + t('Shopify checkout') + '</strong></div></div></section>' +
      '<section class="fj-journey panel"><div class="fj-journey-head"><div><span class="fj-eyebrow">' + t('Pages and offers') + '</span><h2>' + t('Purchase journey') + '</h2><p>' + t('This funnel path was selected when the purchase flow was created. Configure its pages and offers here.') + '</p></div></div><div class="fj-stages">' +
        journeyStages.join('') +
      '</div>' + flowJourneyFallback() + '</section>');
    var legacyJourney = root.querySelector('.fj-journey');
    if (legacyJourney) legacyJourney.outerHTML = flowJourneyCanvasStyle() + journeyMarkup;
    var applyJourneyZoom = function () {
      var canvas = root.querySelector('.fj-canvas'), board = root.querySelector('.fj-canvas-row'), output = root.querySelector('[data-fj-zoom-output]');
      if (!canvas || !board) return;
      board.style.transform = 'scale(' + fjCanvasZoom + ')';
      board.style.transformOrigin = 'top left';
      board.style.marginBottom = Math.max(0, Math.round((board.offsetHeight || 440) * (fjCanvasZoom - 1))) + 'px';
      if (output) output.textContent = Math.round(fjCanvasZoom * 100) + '%';
    };
    root.querySelectorAll('[data-fj-zoom]').forEach(function (button) { button.onclick = function () {
      var action = button.getAttribute('data-fj-zoom');
      if (action === 'fit') fjCanvasZoom = Math.max(.72, Math.min(1, (root.querySelector('.fj-canvas').clientWidth - 24) / 1110));
      else if (action === 'in') fjCanvasZoom = Math.min(1.2, Number((fjCanvasZoom + .1).toFixed(2)));
      else fjCanvasZoom = Math.max(.65, Number((fjCanvasZoom - .1).toFixed(2)));
      applyJourneyZoom();
    }; });
    applyJourneyZoom();
    root.querySelectorAll('[data-flow-preview]').forEach(function (button) { button.onclick = function () { openFlowPreview(flow); }; });
    bindFlowStatusActions(flow, function () { renderFunnel(flow.id); }, function () { location.hash = '#/flows'; });
    root.querySelectorAll('[data-flow-entry]').forEach(function (button) { button.onclick = function () { openFlowEntryEditor(flow); }; });
    root.querySelectorAll('[data-flow-priority]').forEach(function (button) { button.onclick = function () { openFlowPriorityManager(function () { renderFunnel(flow.id); }); }; });
    root.querySelectorAll('[data-flow-traffic]').forEach(function (button) { button.onclick = function () { if (source) openRuleEditor(source.id); }; });
    root.querySelectorAll('[data-flow-add-checkout]').forEach(function (button) { button.onclick = function () { openPagePicker({ mode: 'add', type: 'checkout', lockType: true, parentId: source && source.id, title: 'Add Checkout page' }); }; });
    root.querySelectorAll('[data-flow-template]').forEach(function (button) { button.onclick = function () { var node = fnNode(bcFunnel(), button.getAttribute('data-flow-template')); if (node) openPagePicker({ mode: 'swap', id: node.id, type: node.type }); }; });
    root.querySelectorAll('[data-flow-offer]').forEach(function (button) { button.onclick = function () { openOfferConfig(button.getAttribute('data-flow-offer')); }; });
    root.querySelectorAll('[data-flow-ab]').forEach(function (button) { button.onclick = function () { openFunnelAB(button.getAttribute('data-flow-ab')); }; });
    var publish = root.querySelector('[data-act="funnel-publish"]');
    if (publish) publish.onclick = function () { publishFlowChanges(flow); renderFunnel(flow.id); };
    var discard = root.querySelector('[data-act="funnel-discard"]');
    if (discard) discard.onclick = function () { if (fnDiscardChanges(bcFunnel())) toast(t('Changes discarded')); renderFunnel(flow.id); };
    bcI18n(root);
  }

  function openFlowPreviewLegacy(flow) {
    var state = bcFunnel();
    var checkoutNodes = fnNodesOf(state, 'checkout');
    var upsell = fnNodesOf(state, 'upsell')[0];
    var downsell = fnNodesOf(state, 'downsell')[0];
    var thankyou = fnNodesOf(state, 'thankyou')[0];
    var source = fnNodesOf(state, 'shopify')[0];
    var modal = document.createElement('div');
    modal.className = 'xp-modal fp-layer';

    function checkoutTraffic(node) {
      var edge = (state.edges || []).filter(function (item) { return source && item.from === source.id && item.to === node.id; })[0];
      var traffic = fnRuleConds(edge).filter(function (condition) { return condition.field === 'random'; })[0];
      if (traffic && traffic.value != null) return traffic.value + '% ' + t('of entered traffic');
      return checkoutNodes.length > 1 ? t('Remaining entered traffic') : t('All entered traffic');
    }
    function discountText(node) {
      var offer = fnOfferValue(node), price = Number(offer.price), compareAt = Number(offer.compareAt);
      if (compareAt > price) return Math.round((1 - price / compareAt) * 100) + '% ' + t('off');
      return offer.value ? offer.value + (offer.type === 'percentage' ? '% ' + t('off') : ' ' + t('off')) : '';
    }
    function pageCard(node, type, left, top, index) {
      if (!node) return '';
      var title = type === 'checkout' && checkoutNodes.length > 1 ? t('Checkout') + ' ' + (index + 1) : t(type === 'thankyou' ? 'Thank you page' : 'Checkout');
      var meta = type === 'checkout' ? checkoutTraffic(node) : t('Template') + ' · ' + bcTplName(type, node.tpl);
      var icon = type === 'checkout' ? '1' : '✓';
      return '<article class="fp-card fp-card-' + type + '" style="left:' + left + 'px;top:' + top + 'px"><span class="fp-card-icon">' + icon + '</span><div class="fp-card-copy"><small>' + t(type === 'thankyou' ? 'Finish' : 'Step 1') + '</small><strong>' + esc(title) + '</strong><span>' + esc(meta) + '</span></div></article>';
    }
    function offerCard(node, type, left, top) {
      if (!node) return '';
      var offer = fnOfferValue(node), product = fnOfferProduct(offer.productId), label = type === 'upsell' ? t('Upsell') : t('Downsell');
      if (!product) return '<article class="fp-card fp-card-offer fp-card-' + type + '" style="left:' + left + 'px;top:' + top + 'px"><span class="fp-card-icon">' + (type === 'upsell' ? '+' : '↓') + '</span><div class="fp-card-copy"><small>' + label + '</small><strong>' + t('Not configured') + '</strong><span>' + t('Choose a product and discount') + '</span></div></article>';
      return '<article class="fp-card fp-card-offer fp-card-' + type + '" style="left:' + left + 'px;top:' + top + 'px"><span class="fp-card-icon">' + (type === 'upsell' ? '+' : '↓') + '</span><div class="fp-card-copy"><small>' + label + '</small><strong>' + esc(product.name) + '</strong><span class="fp-price">' + esc(fnOfferMoney(offer.price)) + (offer.compareAt ? ' <s>' + esc(fnOfferMoney(offer.compareAt)) + '</s>' : '') + '</span><em>' + esc(discountText(node)) + '</em></div></article>';
    }
    function path(d, tone) { return '<path d="' + d + '" class="fp-line fp-line-' + tone + '" marker-end="url(#fp-arrow-' + tone + ')" />'; }
    function label(x, y, text, tone) {
      var width = Math.max(56, String(text).length * 7 + 16);
      return '<g transform="translate(' + x + ' ' + y + ')" class="fp-label fp-label-' + tone + '"><rect width="' + width + '" height="22" rx="6"></rect><text x="8" y="15">' + esc(text) + '</text></g>';
    }

    var checkoutYs = checkoutNodes.length > 1 ? checkoutNodes.map(function (_, index) { return 56 + index * 180; }) : [158];
    var upTop = checkoutNodes.length > 1 ? 136 : 158;
    var downTop = 274;
    var thankTop = upsell ? (downsell ? 198 : 158) : 158;
    var previewLines = '';
    var previewLabels = '';
    if (upsell) {
      checkoutYs.forEach(function (top, index) {
        var center = top + 58;
        previewLines += path('M216 ' + center + ' C240 ' + center + ', 246 ' + (upTop + 58) + ', 280 ' + (upTop + 58), 'default');
        if (index === 0) previewLabels += label(230, Math.round((center + upTop + 58) / 2) - 11, t('Payment completed'), 'default');
      });
      if (downsell) {
        previewLines += path('M454 ' + (upTop + 46) + ' C500 ' + (upTop + 46) + ', 510 ' + (thankTop + 42) + ', 760 ' + (thankTop + 42), 'accept');
        previewLines += path('M454 ' + (upTop + 86) + ' C486 ' + (upTop + 86) + ', 490 ' + (downTop + 42) + ', 520 ' + (downTop + 42), 'decline');
        previewLines += path('M694 ' + (downTop + 44) + ' C722 ' + (downTop + 44) + ', 726 ' + (thankTop + 84) + ', 760 ' + (thankTop + 84), 'accept');
        previewLines += path('M694 ' + (downTop + 86) + ' C722 ' + (downTop + 86) + ', 726 ' + (thankTop + 98) + ', 760 ' + (thankTop + 98), 'decline');
        previewLabels += label(532, upTop + 13, t('Accepted'), 'accept') + label(462, upTop + 111, t('Declined'), 'decline') + label(700, downTop + 24, t('Accepted'), 'accept') + label(698, downTop + 104, t('Declined'), 'decline');
      } else {
        previewLines += path('M454 ' + (upTop + 46) + ' C548 ' + (upTop + 46) + ', 620 ' + (thankTop + 42) + ', 760 ' + (thankTop + 42), 'accept');
        previewLines += path('M454 ' + (upTop + 86) + ' C548 ' + (upTop + 86) + ', 620 ' + (thankTop + 86) + ', 760 ' + (thankTop + 86), 'decline');
        previewLabels += label(556, upTop + 22, t('Accepted'), 'accept') + label(556, upTop + 102, t('Declined'), 'decline');
      }
    } else {
      checkoutYs.forEach(function (top, index) {
        var center = top + 58;
        previewLines += path('M216 ' + center + ' C370 ' + center + ', 548 ' + (thankTop + 58) + ', 760 ' + (thankTop + 58), 'default');
        if (index === 0) previewLabels += label(440, Math.round((center + thankTop + 58) / 2) - 11, t('Payment completed'), 'default');
      });
    }
    var cardMarkup = checkoutNodes.map(function (node, index) { return pageCard(node, 'checkout', 42, checkoutYs[index], index); }).join('') +
      offerCard(upsell, 'upsell', 280, upTop) + offerCard(downsell, 'downsell', 520, downTop) + pageCard(thankyou, 'thankyou', 760, thankTop, 0);

    modal.innerHTML = XSTYLE + '<style>' +
      '.fp-layer{z-index:96;padding:16px}.fp-modal{width:min(1040px,calc(100vw - 32px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden}.fp-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 20px 14px;border-bottom:1px solid var(--hair)}.fp-head-main{min-width:0}.fp-head-main small{display:block;margin-bottom:3px;color:var(--ink-muted);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.fp-head-main h2{margin:0;color:var(--ink);font-size:17px;line-height:1.35;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fp-close{width:30px;height:30px;border:1px solid var(--ctl);border-radius:8px;background:#fff;color:var(--ink-muted);font-size:20px;line-height:1;cursor:pointer;flex:none}.fp-close:hover{border-color:var(--brand);background:#f5f9ff;color:var(--brand)}.fp-body{padding:14px 20px 12px;overflow:auto}.fp-kicker{margin:0 0 8px;color:var(--ink);font-size:14px;font-weight:700}.fp-canvas-wrap{border:1px solid #e2e6eb;border-radius:12px;background:linear-gradient(135deg,#fafbfd,#f5f7fa);overflow-x:auto;overflow-y:hidden}.fp-canvas{position:relative;width:960px;height:430px;min-width:960px;background-image:radial-gradient(#dce2ea 1px,transparent 1px);background-size:16px 16px}.fp-edges{position:absolute;inset:0;width:960px;height:430px;overflow:visible}.fp-line{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.fp-line-default{stroke:#93a5bb}.fp-line-accept{stroke:#52a778}.fp-line-decline{stroke:#db7a66}.fp-label rect{stroke:none}.fp-label text{font:600 11px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}.fp-label-default rect{fill:#e9f0f9}.fp-label-default text{fill:#47617e}.fp-label-accept rect{fill:#d9f7e8}.fp-label-accept text{fill:#1f7547}.fp-label-decline rect{fill:#ffe1dc}.fp-label-decline text{fill:#a74636}.fp-card{position:absolute;box-sizing:border-box;display:flex;align-items:flex-start;gap:10px;width:174px;min-height:112px;padding:12px;border:1px solid #e0e5ea;border-radius:11px;background:#fff;box-shadow:0 2px 4px rgb(16 24 40 / 7%);z-index:2}.fp-card-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#eaf2ff;color:var(--brand);font-size:13px;font-weight:750;flex:none}.fp-card-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:3px}.fp-card-copy small{font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--ink-muted)}.fp-card-copy strong{overflow:hidden;color:var(--ink);font-size:13px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.fp-card-copy>span{overflow:hidden;color:var(--ink-muted);font-size:11px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.fp-card-thankyou .fp-card-icon{background:#e7f7ed;color:#278250}.fp-card-offer{min-height:124px}.fp-card-upsell .fp-card-icon{background:#e7f6ee;color:#25804a}.fp-card-downsell .fp-card-icon{background:#fff2e2;color:#bc7412}.fp-price{color:var(--ink)!important;font-size:12px!important;font-weight:700}.fp-price s{margin-left:4px;color:#98a2b3;font-size:10.5px;font-weight:500}.fp-card-copy em{display:inline-flex;align-self:flex-start;margin-top:1px;padding:2px 6px;border-radius:999px;background:#eff7f2;color:#2b7a4a;font-size:10px;font-style:normal;font-weight:700}.fp-summary{display:flex;align-items:flex-start;gap:9px;margin:10px 0 0;padding:9px 11px;border:1px solid #d7e4f7;border-radius:9px;background:#f6f9ff;color:#47617e;font-size:12px;line-height:1.45}.fp-summary b{color:#254c79}.fp-summary-mark{display:grid;place-items:center;width:19px;height:19px;border-radius:50%;background:#dceaff;color:#2c69bf;font-size:11px;font-weight:800;flex:none}.fp-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 20px;border-top:1px solid var(--hair)}.fp-foot p{max-width:720px;margin:0;color:var(--ink-muted);font-size:12px;line-height:1.45}@media(max-width:680px){.fp-layer{padding:8px}.fp-modal{width:calc(100vw - 16px);max-height:calc(100vh - 16px)}.fp-head,.fp-body,.fp-foot{padding-left:14px;padding-right:14px}.fp-foot{align-items:flex-end;flex-direction:column}.fp-foot .btn{width:100%;justify-content:center}.fp-card{min-height:108px}}' +
      '</style><section class="xp-mc fp-modal" role="dialog" aria-modal="true" aria-label="' + esc(t('Preview purchase flow')) + '"><header class="fp-head"><div class="fp-head-main"><small>' + t('Preview purchase flow') + '</small><h2>' + esc(t(flow.name || 'Purchase flow')) + '</h2></div><button type="button" class="fp-close" data-flow-preview-close aria-label="' + esc(t('Close')) + '">×</button></header><div class="fp-body"><div class="fp-kicker">' + t('Purchase journey preview') + '</div><div class="fp-canvas-wrap"><div class="fp-canvas"><svg class="fp-edges" viewBox="0 0 960 430" aria-hidden="true"><defs><marker id="fp-arrow-default" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#93a5bb" stroke-width="1.5"/></marker><marker id="fp-arrow-accept" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#52a778" stroke-width="1.5"/></marker><marker id="fp-arrow-decline" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#db7a66" stroke-width="1.5"/></marker></defs>' + previewLines + previewLabels + '</svg>' + cardMarkup + '</div></div><div class="fp-summary"><span class="fp-summary-mark">i</span><span><b>' + t('Shopper entry') + ':</b> ' + esc(flowEntrySummary(flow)) + '<br>' + t('This preview reflects the saved checkout pages, offers, and branch rules in this purchase flow.') + '</span></div></div><footer class="fp-foot"><p>' + t('Entered shoppers only · other shoppers continue to Shopify Checkout.') + '</p><button type="button" class="btn btn-primary" data-flow-preview-close>' + t('Close') + '</button></footer></section>';
    document.body.appendChild(modal);
    bcI18n(modal);
    var close = function () { document.removeEventListener('keydown', onKey); modal.remove(); };
    var onKey = function (event) { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    modal.querySelectorAll('[data-flow-preview-close]').forEach(function (button) { button.onclick = close; });
    modal.onclick = function (event) { if (event.target === modal) close(); };
  }
  function openFlowPreview(flow) {
    var state = bcFunnel();
    var checkoutNodes = fnNodesOf(state, 'checkout');
    var upsell = fnNodesOf(state, 'upsell')[0];
    var downsell = fnNodesOf(state, 'downsell')[0];
    var thankyou = fnNodesOf(state, 'thankyou')[0];
    var steps = [];
    checkoutNodes.forEach(function (node, index) {
      steps.push({ id: node.id, type: 'checkout', node: node, label: t('Checkout') + (checkoutNodes.length > 1 ? ' ' + (index + 1) : '') });
    });
    if (upsell) steps.push({ id: upsell.id, type: 'upsell', node: upsell, label: t('Upsell') });
    if (downsell) steps.push({ id: downsell.id, type: 'downsell', node: downsell, label: t('Downsell') });
    if (thankyou) steps.push({ id: thankyou.id, type: 'thankyou', node: thankyou, label: t('Thank you page') });
    if (!steps.length) return;

    var activeId = steps[0].id;
    var device = 'desktop';
    var modal = document.createElement('div');
    modal.className = 'xp-modal fp-live-layer';

    function currentStep() {
      return steps.filter(function (step) { return step.id === activeId; })[0] || steps[0];
    }
    function productFor(node) {
      return fnOfferProduct(fnOfferValue(node || upsell || downsell).productId);
    }
    function discountFor(node) {
      var offer = fnOfferValue(node);
      var price = Number(offer.price), compareAt = Number(offer.compareAt);
      return compareAt > price ? Math.round((1 - price / compareAt) * 100) + '% ' + t('off') : '';
    }
    function checkoutScreen(step) {
      var product = productFor(upsell || downsell) || FLOW_OFFER_PRODUCTS[0];
      return '<div class="fp-live-page fp-live-checkout-page"><div class="fp-live-storebar"><strong>Lavender Labs</strong><span>' + t('Secure checkout') + '</span></div><div class="fp-live-checkout-grid"><section><p class="fp-live-eyebrow">' + t('Checkout') + '</p><h3>' + t('Secure checkout') + '</h3><label class="fp-live-field"><span>Contact</span><input readonly value="jane@example.com"></label><label class="fp-live-field"><span>' + t('Shipping') + '</span><input readonly value="Jane Doe · 45 Market Street"></label><div class="fp-live-choice"><span class="fp-live-choice-dot">✓</span><span>Card ending in 4242</span></div><button type="button" class="fp-live-primary" data-preview-accept>' + t('Complete order') + ' · $' + esc(product.price) + '</button></section><aside class="fp-live-summary-card"><span>' + t('Your order') + '</span><div class="fp-live-summary-row"><div class="fp-live-mini-art">' + esc(product.name.charAt(0)) + '</div><div><strong>' + esc(product.name) + '</strong><small>1 × $' + esc(product.price) + '</small></div></div><div class="fp-live-total"><span>Total</span><strong>$' + esc(product.price) + '</strong></div></aside></div></div>';
    }
    function offerScreen(step) {
      var offer = fnOfferValue(step.node);
      var product = productFor(step.node);
      var label = step.type === 'upsell' ? t('Upsell') : t('Downsell');
      var action = step.type === 'upsell' ? t('Add to order') : t('Accept this offer');
      if (!product) return '<div class="fp-live-page fp-live-offer-page"><div class="fp-live-confirm"><span class="fp-live-confirm-icon">✓</span><div><small>Order #1042</small><strong>' + t('Order confirmed') + '</strong></div></div><section class="fp-live-offer-main"><p class="fp-live-eyebrow">' + esc(label) + '</p><h3>' + t('Offer is not configured') + '</h3><p class="fp-live-offer-lead">' + t('Choose a product and discount before previewing this page.') + '</p></section></div>';
      return '<div class="fp-live-page fp-live-offer-page is-' + esc(step.type) + '"><div class="fp-live-confirm"><span class="fp-live-confirm-icon">✓</span><div><small>Order #1042</small><strong>' + t('Order confirmed') + '</strong></div><span class="fp-live-confirm-link">' + t('View order') + ' ›</span></div><section class="fp-live-offer-main"><p class="fp-live-eyebrow">' + esc(label) + '</p><h3>' + t('One more thing') + '</h3><p class="fp-live-offer-lead">' + t('Complete your order with a relevant add-on.') + '</p><div class="fp-live-countdown">' + t('Limited-time offer') + ' · 04:42</div><div class="fp-live-product-grid"><div class="fp-live-product-art"><span>' + esc(product.name.charAt(0)) + '</span><i>✦</i></div><div class="fp-live-product-copy"><h4>' + esc(product.name) + '</h4><div class="fp-live-price"><s>$' + esc(offer.compareAt) + '</s><strong>$' + esc(offer.price) + '</strong><em>' + esc(discountFor(step.node)) + '</em></div><p>' + t('Choose a variant') + '</p><div class="fp-live-select">Standard <span>⌄</span></div><div class="fp-live-quantity"><span>' + t('Quantity') + '</span><b>1</b></div><button type="button" class="fp-live-primary" data-preview-accept>' + esc(action) + ' · $' + esc(offer.price) + '</button><button type="button" class="fp-live-decline" data-preview-decline>' + t('No, thanks') + '</button></div></div></section></div>';
    }
    function thankyouScreen(step) {
      var product = productFor(upsell || downsell) || FLOW_OFFER_PRODUCTS[0];
      return '<div class="fp-live-page fp-live-thankyou-page"><div class="fp-live-thankyou-icon">✓</div><p class="fp-live-eyebrow">' + t('Thank you page') + '</p><h3>' + t('Thanks, your order is confirmed.') + '</h3><p>' + t('Order confirmation') + ' #1042 · ' + t('Template') + ': ' + esc(bcTplName('thankyou', step.node.tpl)) + '</p><div class="fp-live-thankyou-card"><div class="fp-live-summary-row"><div class="fp-live-mini-art">' + esc(product.name.charAt(0)) + '</div><div><strong>' + esc(product.name) + '</strong><small>' + t('Shipping') + ' · ' + t('Free') + '</small></div></div><div class="fp-live-total"><span>Total</span><strong>$' + esc(product.price) + '</strong></div></div><button type="button" class="fp-live-secondary">' + t('Continue shopping') + '</button></div>';
    }
    function screenFor(step) {
      if (step.type === 'checkout') return checkoutScreen(step);
      if (step.type === 'upsell' || step.type === 'downsell') return offerScreen(step);
      return thankyouScreen(step);
    }
    function nextAfterOffer(step, accepted) {
      if (step.type === 'upsell' && !accepted && downsell) return downsell.id;
      return thankyou ? thankyou.id : steps[0].id;
    }
    function render() {
      var step = currentStep();
      var rail = modal.querySelector('[data-preview-steps]');
      var stage = modal.querySelector('[data-preview-stage]');
      rail.innerHTML = steps.map(function (item, index) {
        return '<button type="button" class="fp-live-step' + (item.id === step.id ? ' is-active' : '') + '" data-preview-step="' + esc(item.id) + '"><span>' + (item.type === 'checkout' ? '1' : item.type === 'upsell' ? '+' : item.type === 'downsell' ? '↓' : '✓') + '</span>' + esc(item.label) + '</button>' + (index < steps.length - 1 ? '<i class="fp-live-arrow">›</i>' : '');
      }).join('');
      stage.innerHTML = '<div class="fp-live-frame' + (device === 'mobile' ? ' is-mobile' : '') + '">' + screenFor(step) + '</div>';
      modal.querySelectorAll('[data-preview-step]').forEach(function (button) { button.onclick = function () { activeId = button.getAttribute('data-preview-step'); render(); }; });
      var accept = modal.querySelector('[data-preview-accept]');
      if (accept) accept.onclick = function () { activeId = step.type === 'checkout' ? (upsell ? upsell.id : thankyou.id) : nextAfterOffer(step, true); render(); };
      var decline = modal.querySelector('[data-preview-decline]');
      if (decline) decline.onclick = function () { activeId = nextAfterOffer(step, false); render(); };
      var restart = modal.querySelector('[data-preview-restart]');
      if (restart) restart.onclick = function () { activeId = steps[0].id; render(); };
      modal.querySelectorAll('[data-preview-device]').forEach(function (button) { button.onclick = function () { device = button.getAttribute('data-preview-device'); render(); }; });
    }

    modal.innerHTML = XSTYLE + '<style>' +
      '.fp-live-layer{z-index:96;padding:16px}.fp-live-modal{width:min(1060px,calc(100vw - 32px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}.fp-live-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 20px;border-bottom:1px solid var(--hair)}.fp-live-head small{display:block;color:var(--ink-muted);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.fp-live-head h2{margin:2px 0 0;color:var(--ink);font-size:17px;line-height:1.3}.fp-live-close{width:30px;height:30px;border:1px solid var(--ctl);border-radius:8px;background:#fff;color:var(--ink-muted);font-size:20px;line-height:1;cursor:pointer}.fp-live-close:hover{border-color:var(--brand);background:#f5f9ff;color:var(--brand)}.fp-live-rail{display:flex;align-items:center;gap:8px;min-height:58px;padding:10px 16px;border-bottom:1px solid var(--hair);overflow-x:auto;background:#fff}.fp-live-steps{display:flex;align-items:center;gap:8px;min-width:max-content}.fp-live-step{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 12px;border:1px solid var(--ctl);border-radius:7px;background:#fff;color:var(--ink-body);font-size:12px;font-weight:600;cursor:pointer}.fp-live-step>span{display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#edf1f5;color:#607083;font-size:10px}.fp-live-step:hover{border-color:#9ec4fa;background:#fbfdff}.fp-live-step.is-active{border-color:#263442;background:#263442;color:#fff;box-shadow:0 0 0 2px rgb(38 52 66 / 12%)}.fp-live-step.is-active>span{background:#fff;color:#263442}.fp-live-arrow{color:#a5afbb;font-size:20px;font-style:normal}.fp-live-devices{display:flex;gap:4px;margin-left:auto}.fp-live-devices button{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--ctl);border-radius:7px;background:#fff;color:var(--ink-muted);font-size:15px;cursor:pointer}.fp-live-devices button.is-active,.fp-live-devices button:hover{border-color:var(--brand);background:#f5f9ff;color:var(--brand)}.fp-live-body{min-height:0;overflow:auto;padding:20px;background:#f4f5f7}.fp-live-frame{width:100%;max-width:840px;min-height:540px;margin:0 auto;border:1px solid #dde2e8;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgb(16 24 40 / 7%);overflow:hidden;transition:max-width .18s}.fp-live-frame.is-mobile{max-width:390px}.fp-live-page{min-height:540px;background:#fff;color:#273448}.fp-live-storebar{display:flex;align-items:center;justify-content:space-between;padding:17px 22px;border-bottom:1px solid #e7ebef}.fp-live-storebar strong{font-size:17px}.fp-live-storebar span{color:#748194;font-size:12px}.fp-live-checkout-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(240px,.9fr);gap:0}.fp-live-checkout-grid>section{padding:28px 30px}.fp-live-summary-card{min-height:100%;padding:28px 24px;background:#f7f8fa;border-left:1px solid #e7ebef}.fp-live-summary-card>span{display:block;margin-bottom:18px;color:#6b7787;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.fp-live-eyebrow{margin:0 0 7px;color:#63748a;font-size:11px;font-weight:750;letter-spacing:.05em;text-transform:uppercase}.fp-live-checkout-grid h3{margin:0 0 20px;font-size:22px}.fp-live-field{display:block;margin:0 0 14px;color:#536174;font-size:12px;font-weight:600}.fp-live-field span{display:block;margin-bottom:6px}.fp-live-field input{box-sizing:border-box;width:100%;height:40px;border:1px solid #d9dfe7;border-radius:7px;padding:0 11px;background:#fff;color:#455467;font:13px inherit}.fp-live-choice{display:flex;align-items:center;gap:8px;margin:20px 0;color:#455467;font-size:13px}.fp-live-choice-dot{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#e0f2ec;color:#16864f;font-size:11px;font-weight:800}.fp-live-primary{display:flex;align-items:center;justify-content:center;width:100%;height:42px;border:0;border-radius:7px;background:#1473bb;color:#fff;font-size:13px;font-weight:700;cursor:pointer}.fp-live-primary:hover{background:#0d64a5}.fp-live-summary-row{display:flex;align-items:center;gap:10px}.fp-live-summary-row strong{display:block;color:#2c3747;font-size:13px}.fp-live-summary-row small{display:block;margin-top:3px;color:#7a8697;font-size:12px}.fp-live-mini-art{display:grid;place-items:center;width:42px;height:42px;border-radius:8px;background:linear-gradient(135deg,#e3f5ef,#dbe8ff);color:#22674e;font-size:18px;font-weight:800}.fp-live-total{display:flex;align-items:center;justify-content:space-between;margin-top:20px;padding-top:15px;border-top:1px solid #dfe4e9;color:#566476;font-size:13px}.fp-live-total strong{color:#263442;font-size:17px}.fp-live-confirm{display:flex;align-items:center;gap:10px;padding:19px 28px;border-bottom:1px solid #e4e8ed}.fp-live-confirm-icon{display:grid;place-items:center;width:24px;height:24px;border:2px solid #2584ce;border-radius:50%;color:#2584ce;font-size:13px;font-weight:800}.fp-live-confirm small{display:block;color:#64738a;font-size:11px}.fp-live-confirm strong{display:block;margin-top:2px;font-size:15px}.fp-live-confirm-link{margin-left:auto;color:#1675bd;font-size:12px}.fp-live-offer-main{padding:28px 48px 38px}.fp-live-offer-main>h3{margin:0;color:#2a3442;font-size:25px;text-align:center}.fp-live-offer-lead{margin:7px auto 18px;color:#6f7e91;font-size:13px;text-align:center}.fp-live-countdown{margin:0 auto 18px;padding:10px 12px;border:1px solid #f1d994;border-radius:7px;background:#fff8df;color:#8f6512;font-size:13px;text-align:center}.fp-live-product-grid{display:grid;grid-template-columns:minmax(210px,.9fr) minmax(250px,1.1fr);gap:30px;align-items:start}.fp-live-product-art{position:relative;display:grid;place-items:center;min-height:260px;border-radius:8px;background:linear-gradient(145deg,#e5f5ef,#ccebdd);color:#23724d;overflow:hidden}.fp-live-offer-page.is-downsell .fp-live-product-art{background:linear-gradient(145deg,#fff2dc,#ffe0b6);color:#a5670e}.fp-live-product-art span{display:grid;place-items:center;width:128px;height:128px;border:8px solid rgb(255 255 255 / 75%);border-radius:30px;background:rgb(255 255 255 / 45%);font-size:64px;font-weight:800}.fp-live-product-art i{position:absolute;right:28px;bottom:26px;color:#fbad35;font-size:38px;font-style:normal}.fp-live-product-copy h4{margin:0 0 8px;color:#273448;font-size:22px;line-height:1.25}.fp-live-price{display:flex;align-items:baseline;gap:7px;margin-bottom:16px}.fp-live-price s{color:#8793a3;font-size:13px}.fp-live-price strong{font-size:18px}.fp-live-price em{color:#16864f;font-size:12px;font-style:normal;font-weight:700}.fp-live-product-copy p{margin:0 0 6px;color:#566476;font-size:12px;font-weight:600}.fp-live-select,.fp-live-quantity{display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;height:38px;margin-bottom:8px;border:1px solid #d9dfe7;border-radius:7px;padding:0 11px;color:#475669;font-size:12px}.fp-live-select span{color:#7c8795}.fp-live-quantity{max-width:100px}.fp-live-decline{display:block;width:100%;margin-top:10px;border:0;background:transparent;color:#1675bd;font-size:13px;cursor:pointer}.fp-live-thankyou-page{display:flex;align-items:center;flex-direction:column;justify-content:center;box-sizing:border-box;padding:50px 28px;text-align:center}.fp-live-thankyou-icon{display:grid;place-items:center;width:58px;height:58px;margin-bottom:16px;border-radius:50%;background:#e1f3e8;color:#16864f;font-size:28px;font-weight:800}.fp-live-thankyou-page h3{max-width:500px;margin:0;color:#273448;font-size:25px}.fp-live-thankyou-page>p{margin:9px 0 22px;color:#6c7a8c;font-size:13px}.fp-live-thankyou-card{width:min(430px,100%);box-sizing:border-box;margin:0 auto 18px;padding:16px;border:1px solid #e0e5ea;border-radius:9px;background:#fafbfd;text-align:left}.fp-live-secondary{height:38px;padding:0 16px;border:1px solid #cfd7e2;border-radius:7px;background:#fff;color:#2b62d6;font-size:13px;font-weight:650;cursor:pointer}.fp-live-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--hair)}.fp-live-foot .btn{height:32px}@media(max-width:720px){.fp-live-layer{padding:8px}.fp-live-modal{width:calc(100vw - 16px);max-height:calc(100vh - 16px)}.fp-live-head,.fp-live-foot{padding-left:14px;padding-right:14px}.fp-live-body{padding:12px}.fp-live-rail{padding:9px 12px}.fp-live-devices{display:none}.fp-live-checkout-grid,.fp-live-product-grid{grid-template-columns:1fr}.fp-live-summary-card{border-top:1px solid #e7ebef;border-left:0}.fp-live-offer-main{padding:24px 18px}.fp-live-offer-main>h3{font-size:21px}.fp-live-frame.is-mobile{max-width:100%}}' +
      '</style><section class="xp-mc fp-live-modal" role="dialog" aria-modal="true" aria-label="' + esc(t('Preview purchase flow')) + '"><header class="fp-live-head"><div><small>' + t('Preview as shopper') + '</small><h2>' + esc(t(flow.name || 'Purchase flow')) + '</h2></div><button type="button" class="fp-live-close" data-preview-close aria-label="' + esc(t('Close')) + '">×</button></header><div class="fp-live-rail"><div class="fp-live-steps" data-preview-steps></div><div class="fp-live-devices"><button type="button" data-preview-device="desktop" title="Desktop">▣</button><button type="button" data-preview-device="mobile" title="Mobile">▯</button></div></div><div class="fp-live-body" data-preview-stage></div><footer class="fp-live-foot"><button type="button" class="btn btn-default" data-preview-restart>' + t('Restart preview') + '</button><button type="button" class="btn btn-primary" data-preview-close>' + t('Close') + '</button></footer></section>';
    document.body.appendChild(modal);
    bcI18n(modal);
    var close = function () { document.removeEventListener('keydown', onKey); modal.remove(); };
    var onKey = function (event) { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    modal.querySelectorAll('[data-preview-close]').forEach(function (button) { button.onclick = close; });
    modal.onclick = function (event) { if (event.target === modal) close(); };
    render();
  }

  function openFlowEntryEditorLegacy(flow) {
    var buf = flowLegacyEntryConditions(flow), modal = document.createElement('div'); modal.className = 'xp-modal';
    var close = function () { modal.remove(); };
    function fieldOptions(selected) {
      return Object.keys(FLOW_ENTRY_FIELDS).map(function (key) {
        return '<option value="' + esc(key) + '"' + (key === selected ? ' selected' : '') + '>' + t(FLOW_ENTRY_FIELDS[key].label) + '</option>';
      }).join('');
    }
    function operatorOptions(field, selected) {
      if (field.kind === 'select' || field.kind === 'tags') return '';
      return (field.operators || []).map(function (operator) { return '<option value="' + esc(operator.value) + '"' + (operator.value === selected ? ' selected' : '') + '>' + t(operator.label) + '</option>'; }).join('');
    }
    function valueControl(index, condition) {
      var field = FLOW_ENTRY_FIELDS[condition.field] || FLOW_ENTRY_FIELDS.customer_tag;
      if (field.kind === 'select') {
        return '<select class="input fe-value" data-entry-value="' + index + '">' + field.options.map(function (option) { return '<option value="' + esc(option.value) + '"' + (option.value === condition.value ? ' selected' : '') + '>' + t(option.label) + '</option>'; }).join('') + '</select>';
      }
      if (field.kind === 'tags') {
        var tags = Array.isArray(condition.value) ? condition.value : [];
        return '<div class="fe-tags" data-entry-tags="' + index + '"><div class="fe-tag-list">' + tags.map(function (tag) { return '<span>' + esc(tag) + '<button type="button" data-entry-rm-tag="' + index + '" data-tag="' + esc(tag) + '">×</button></span>'; }).join('') + '</div><input class="input" data-entry-tag-input="' + index + '" placeholder="' + t('Type a tag and press Enter') + '"></div>';
      }
      var prefix = field.unit === '$' ? '<span>$</span>' : '';
      var suffix = field.unit === 'orders' ? '<span>' + t('orders') + '</span>' : field.unit === 'days' ? '<span>' + t('days') + '</span>' : '';
      return '<div class="fe-number">' + prefix + '<input class="input" type="number" min="0" step="1" data-entry-value="' + index + '" value="' + esc(condition.value == null ? '' : condition.value) + '">' + suffix + '</div>';
    }
    function row(index, condition) {
      var field = FLOW_ENTRY_FIELDS[condition.field] || FLOW_ENTRY_FIELDS.customer_tag;
      return '<div class="fe-row" data-entry-row="' + index + '"><select class="input fe-field" data-entry-field="' + index + '">' + fieldOptions(condition.field) + '</select>' +
        (field.kind === 'number' ? '<select class="input fe-op" data-entry-op="' + index + '">' + operatorOptions(field, condition.op) + '</select>' : '') +
        '<div class="fe-value-wrap">' + valueControl(index, condition) + '</div><button type="button" class="fe-remove" data-entry-remove="' + index + '" aria-label="' + t('Remove condition') + '">×</button></div>';
    }
    function render() {
      var conditions = buf.length ? buf.map(row).join('') : '<div class="fe-empty">' + t('No user attributes added. All customers can enter this flow.') + '</div>';
      modal.innerHTML = XSTYLE + FSTYLE + '<style>' +
        '.fe-modal{width:min(720px,calc(100vw - 32px))}.fe-intro{margin:0 0 14px;color:var(--ink-muted);font-size:13px;line-height:1.55}.fe-list{display:flex;flex-direction:column;gap:8px}.fe-row{display:grid;grid-template-columns:152px 118px minmax(0,1fr) 28px;gap:8px;align-items:center;border:1px solid var(--hair);border-radius:9px;background:var(--panel);padding:8px}.fe-row .input{height:34px;min-width:0;background:#fff}.fe-value-wrap{min-width:0}.fe-number{display:flex;align-items:center;gap:5px}.fe-number>span{color:var(--ink-muted);font-size:12px;white-space:nowrap}.fe-number .input{flex:1;width:100%}.fe-tags{display:flex;align-items:center;gap:6px;min-width:0}.fe-tag-list{display:flex;align-items:center;flex-wrap:wrap;gap:4px}.fe-tag-list span{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:5px;background:#e6f0ff;color:#225ec0;font-size:12px;white-space:nowrap}.fe-tag-list button{border:0;background:transparent;color:inherit;padding:0;line-height:1;cursor:pointer;font-size:15px}.fe-tags .input{flex:1;width:100%;min-width:110px}.fe-remove{width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:#9aa4b3;font-size:18px;cursor:pointer}.fe-remove:hover{background:#fdeaea;color:var(--err)}.fe-add{margin-top:10px}.fe-recognized{margin-top:14px;border-radius:8px;background:#fff8e8;color:#805d15;padding:10px 12px;font-size:12px;line-height:1.5}.fe-empty{border:1px dashed var(--ctl);border-radius:8px;padding:14px;color:var(--ink-muted);font-size:12.5px}.fe-msg{min-height:18px;margin:10px 0 0;color:var(--err);font-size:12px}.fe-msg:empty{display:none}@media(max-width:650px){.fe-row{grid-template-columns:1fr 1fr 28px}.fe-value-wrap{grid-column:1 / 3}.fe-tags{flex-wrap:wrap}.fe-tags .input{min-width:100%}}' +
        '</style><div class="xp-mc fe-modal"><div class="xp-mh">' + t('Configure customer entry') + '</div><div class="xp-mb"><p class="fe-intro"><strong>' + t('Who can enter this purchase flow?') + '</strong><br>' + t('Add cart, storefront, or customer conditions. Every condition must match before a customer enters this flow.') + '</p><div class="fe-list" data-entry-list>' + conditions + '</div><button type="button" class="btn btn-default fe-add" data-entry-add>+ ' + t('Add condition') + '</button><div class="fe-recognized">' + t('Customer attributes apply only to recognized Shopify customers. Customers who are not recognized or do not match continue to Shopify Checkout.') + '</div><p class="fe-msg" data-entry-msg></p></div><div class="xp-mf"><button type="button" class="btn btn-default" data-entry-cancel>' + t('Cancel') + '</button><button type="button" class="btn btn-primary" data-entry-save>' + t('Apply') + '</button></div></div>';
      bcI18n(modal);
      modal.querySelector('[data-entry-cancel]').onclick = close;
      modal.querySelector('[data-entry-add]').onclick = function () { buf.push({ field: 'cart_total', op: 'at_least', value: '' }); render(); };
      modal.querySelectorAll('[data-entry-remove]').forEach(function (button) { button.onclick = function () { buf.splice(Number(button.getAttribute('data-entry-remove')), 1); render(); }; });
      modal.querySelectorAll('[data-entry-field]').forEach(function (select) { select.onchange = function () {
        var index = Number(select.getAttribute('data-entry-field')), field = FLOW_ENTRY_FIELDS[select.value];
        buf[index] = { field: select.value, op: field.kind === 'number' ? field.operators[0].value : field.kind === 'tags' ? 'includes_any' : 'equals', value: field.kind === 'tags' ? [] : field.kind === 'select' ? field.options[0].value : '' }; render();
      }; });
      modal.querySelectorAll('[data-entry-op]').forEach(function (select) { select.onchange = function () { buf[Number(select.getAttribute('data-entry-op'))].op = select.value; }; });
      modal.querySelectorAll('[data-entry-value]').forEach(function (input) { input.oninput = function () { var index = Number(input.getAttribute('data-entry-value')); buf[index].value = input.type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value; }; });
      modal.querySelectorAll('[data-entry-rm-tag]').forEach(function (button) { button.onclick = function () { var index = Number(button.getAttribute('data-entry-rm-tag')), tag = button.getAttribute('data-tag'); buf[index].value = (buf[index].value || []).filter(function (item) { return item !== tag; }); render(); }; });
      modal.querySelectorAll('[data-entry-tag-input]').forEach(function (input) { input.onkeydown = function (event) { if (event.key !== 'Enter') return; event.preventDefault(); var index = Number(input.getAttribute('data-entry-tag-input')), tag = input.value.trim(); if (tag && (buf[index].value || []).indexOf(tag) < 0) buf[index].value = (buf[index].value || []).concat([tag]); render(); }; });
      modal.querySelector('[data-entry-save]').onclick = function () {
        var invalid = buf.some(function (condition) { var field = FLOW_ENTRY_FIELDS[condition.field] || {}; return field.kind === 'tags' ? !Array.isArray(condition.value) || !condition.value.length : condition.value === '' || condition.value == null; });
        if (invalid) { modal.querySelector('[data-entry-msg]').textContent = t('Complete or remove every condition before applying.'); return; }
        bcFlowUpdate(flow.id, { entryConditions: buf, entry: buf.length ? 'Custom audience' : 'All eligible customers', audience: buf.length ? 'Custom audience' : 'All eligible customers', updated: t('Just now') });
        close(); toast(t('Customer entry saved')); renderFunnel(flow.id);
      };
    }
    document.body.appendChild(modal); modal.addEventListener('click', function (event) { if (event.target === modal) close(); }); render();
  }
  function openFlowEntryEditor(flow) {
    var buf = flowLegacyEntryConditions(flow), modal = document.createElement('div'); modal.className = 'xp-modal';
    var close = function () { modal.remove(); };
    function fieldOptions(selected) {
      return ['Customer identity', 'Storefront context', 'Cart'].map(function (group) {
        var choices = Object.keys(FLOW_ENTRY_FIELDS).filter(function (key) { return FLOW_ENTRY_FIELDS[key].group === group; });
        return '<optgroup label="' + esc(t(group)) + '">' + choices.map(function (key) { return '<option value="' + esc(key) + '"' + (key === selected ? ' selected' : '') + '>' + t(FLOW_ENTRY_FIELDS[key].label) + '</option>'; }).join('') + '</optgroup>';
      }).join('');
    }
    function operatorOptions(field, selected) {
      return (field.operators || []).map(function (operator) { return '<option value="' + esc(operator.value) + '"' + (operator.value === selected ? ' selected' : '') + '>' + t(operator.label) + '</option>'; }).join('');
    }
    function valueControl(index, condition) {
      var field = FLOW_ENTRY_FIELDS[condition.field] || FLOW_ENTRY_FIELDS.customer_tag;
      if (field.kind === 'select') return '<select class="input fe-value" data-entry-value="' + index + '">' + field.options.map(function (option) { return '<option value="' + esc(option.value) + '"' + (option.value === condition.value ? ' selected' : '') + '>' + t(option.label) + '</option>'; }).join('') + '</select>';
      if (field.kind === 'tags') {
        var tags = Array.isArray(condition.value) ? condition.value : [];
        return '<div class="fe-tags" data-entry-tags="' + index + '"><div class="fe-tag-list">' + tags.map(function (tag) { return '<span>' + esc(tag) + '<button type="button" data-entry-rm-tag="' + index + '" data-tag="' + esc(tag) + '">×</button></span>'; }).join('') + '</div><input class="input" data-entry-tag-input="' + index + '" placeholder="' + t('Type a tag and press Enter') + '"></div>';
      }
      var prefix = field.unit === '$' ? '<span>$</span>' : '';
      var suffix = field.unit === 'orders' ? '<span>' + t('orders') + '</span>' : field.unit === 'days' ? '<span>' + t(condition.op === 'more_than' ? 'days ago' : 'days') + '</span>' : field.unit === 'items' ? '<span>' + t('items') + '</span>' : '';
      if (condition.op === 'between') {
        var range = condition.value && typeof condition.value === 'object' ? condition.value : {};
        return '<div class="fe-number fe-between">' + prefix + '<input class="input" type="number" min="0" step="1" data-entry-min="' + index + '" value="' + esc(range.min == null ? '' : range.min) + '"><span>' + t('and') + '</span>' + prefix + '<input class="input" type="number" min="0" step="1" data-entry-max="' + index + '" value="' + esc(range.max == null ? '' : range.max) + '">' + suffix + '</div>';
      }
      return '<div class="fe-number">' + prefix + '<input class="input" type="number" min="0" step="1" data-entry-value="' + index + '" value="' + esc(condition.value == null ? '' : condition.value) + '">' + suffix + '</div>';
    }
    function row(index, condition) {
      var field = FLOW_ENTRY_FIELDS[condition.field] || FLOW_ENTRY_FIELDS.customer_tag;
      return '<div class="fe-row" data-entry-row="' + index + '"><select class="input fe-field" data-entry-field="' + index + '">' + fieldOptions(condition.field) + '</select><select class="input fe-op" data-entry-op="' + index + '">' + operatorOptions(field, condition.op) + '</select><div class="fe-value-wrap">' + valueControl(index, condition) + '</div><button type="button" class="fe-remove" data-entry-remove="' + index + '" aria-label="' + t('Remove condition') + '">×</button></div>';
    }
    function invalidCondition(condition) {
      var field = FLOW_ENTRY_FIELDS[condition.field] || {};
      if (field.kind === 'tags') return !Array.isArray(condition.value) || !condition.value.length;
      if (condition.op === 'between') return !condition.value || condition.value.min === '' || condition.value.min == null || condition.value.max === '' || condition.value.max == null;
      return condition.value === '' || condition.value == null;
    }
    function render() {
      var conditions = buf.length ? buf.map(function (condition, index) { return row(index, condition); }).join('') : '<div class="fe-empty">' + t('No conditions added. All eligible customers can enter this purchase flow.') + '</div>';
      modal.innerHTML = XSTYLE + FSTYLE + '<style>' +
        '.fe-modal{width:min(760px,calc(100vw - 32px))}.fe-modal .xp-mh{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.fe-modal-title{display:flex;flex-direction:column;gap:3px}.fe-modal-title strong{font-size:18px;line-height:1.3;color:var(--ink)}.fe-modal-title small{color:var(--ink-muted);font-size:12px}.fe-close{border:0;background:transparent;color:var(--ink-muted);font-size:22px;line-height:1;padding:0;cursor:pointer}.fe-layer{display:flex;gap:10px;border:1px solid #cfe1ff;border-radius:8px;background:#f5f9ff;padding:11px 12px}.fe-layer-icon{display:grid;place-items:center;width:24px;height:24px;border-radius:7px;background:#e6f0ff;color:var(--brand);font-size:13px;font-weight:750;flex:none}.fe-layer b{display:block;color:#294f89;font-size:11.5px;line-height:1.35}.fe-layer strong{display:block;margin-top:2px;color:var(--ink);font-size:13px}.fe-layer p{margin:3px 0 0;color:var(--ink-muted);font-size:11.5px;line-height:1.45}.fe-routing{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.fe-control label{display:block;margin-bottom:5px;color:var(--ink-body);font-size:12px;font-weight:650}.fe-control .input,.fe-readonly{box-sizing:border-box;width:100%;height:35px}.fe-readonly{display:flex;align-items:center;border:1px solid var(--ctl);border-radius:7px;background:var(--panel);padding:0 10px;color:var(--ink-body);font-size:12.5px;font-weight:600}.fe-routing-hint{grid-column:1 / -1;margin:-4px 0 0;color:var(--ink-muted);font-size:10.5px;line-height:1.4}.fe-conditions{margin-top:14px;border:1px solid var(--hair);border-radius:9px;background:#fff;padding:10px}.fe-conditions-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:9px}.fe-conditions-head strong{display:block;color:var(--ink);font-size:12.5px}.fe-conditions-head p{margin:3px 0 0;color:var(--ink-muted);font-size:10.5px;line-height:1.4}.fe-fallback{display:inline-flex;align-items:center;border-radius:999px;background:#f1f3f5;color:#6b7280;padding:3px 7px;font-size:10px;white-space:nowrap}.fe-list{display:flex;flex-direction:column;gap:8px}.fe-row{display:grid;grid-template-columns:minmax(190px,1.18fr) minmax(130px,.8fr) minmax(180px,1fr) 26px;gap:6px;align-items:center;border:1px solid var(--ctl);border-radius:7px;background:#fff;padding:6px}.fe-row .input{height:33px;min-width:0;background:#fff}.fe-value-wrap{min-width:0}.fe-number{display:flex;align-items:center;gap:5px;min-width:0}.fe-number>span{color:var(--ink-muted);font-size:11px;white-space:nowrap}.fe-number .input{flex:1;width:100%;min-width:0}.fe-between{gap:4px}.fe-between .input{min-width:48px}.fe-tags{display:flex;align-items:center;gap:5px;min-width:0}.fe-tag-list{display:flex;align-items:center;flex-wrap:wrap;gap:4px}.fe-tag-list span{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:5px;background:#e6f0ff;color:#225ec0;font-size:11px;white-space:nowrap}.fe-tag-list button{border:0;background:transparent;color:inherit;padding:0;line-height:1;cursor:pointer;font-size:14px}.fe-tags .input{flex:1;width:100%;min-width:88px}.fe-remove{width:26px;height:26px;border:0;border-radius:6px;background:transparent;color:#9aa4b3;font-size:17px;cursor:pointer}.fe-remove:hover{background:#fdeaea;color:var(--err)}.fe-add{width:100%;height:31px;margin-top:8px;border:1px dashed #9cbbe9;border-radius:7px;background:#fbfdff;color:var(--brand);font-size:12px;font-weight:600;cursor:pointer}.fe-add:hover{border-color:var(--brand);background:#f3f8ff}.fe-helper{margin:9px 1px 0;color:var(--ink-muted);font-size:10px;line-height:1.4}.fe-empty{border:1px dashed var(--ctl);border-radius:7px;padding:13px;color:var(--ink-muted);font-size:12px}.fe-msg{min-height:18px;margin:9px 0 0;color:var(--err);font-size:12px}.fe-msg:empty{display:none}@media(max-width:650px){.fe-routing{grid-template-columns:1fr}.fe-routing-hint{grid-column:auto}.fe-conditions-head{flex-direction:column}.fe-row{grid-template-columns:1fr 1fr 26px}.fe-value-wrap{grid-column:1 / 3}.fe-tags{flex-wrap:wrap}.fe-tags .input{min-width:100%}}' +
        '</style><div class="xp-mc fe-modal"><div class="xp-mh"><div class="fe-modal-title"><strong>' + t('Configure customer entry') + '</strong><small>' + esc(t(flow.name)) + '</small></div><button type="button" class="fe-close" data-entry-cancel aria-label="' + t('Close') + '">×</button></div><div class="xp-mb"><section class="fe-layer"><span class="fe-layer-icon">1</span><div><b>' + t('Layer 1: Purchase flow routing') + '</b><strong>' + t('Choose the purchase flow first, then its Checkout page.') + '</strong><p>' + t('Customers who do not match this flow continue to Shopify Checkout.') + '</p></div></section><section class="fe-routing"><div class="fe-control"><label>' + t('Purchase flow priority') + '</label><input class="input" type="number" min="1" step="1" data-entry-priority value="' + esc(flow.priority) + '"></div><div class="fe-control"><label>' + t('Conflict handling') + '</label><div class="fe-readonly">' + t('Highest priority match') + '</div></div><p class="fe-routing-hint">' + t('Higher values win. If several purchase flows match, customers enter only the highest-priority flow.') + '</p></section><section class="fe-conditions"><header class="fe-conditions-head"><div><strong>' + t('Who enters this purchase flow? (AND)') + '</strong><p>' + t('A customer enters only when every condition below matches.') + '</p></div><span class="fe-fallback">' + t('No match → Shopify Checkout') + '</span></header><div class="fe-list" data-entry-list>' + conditions + '</div><button type="button" class="fe-add" data-entry-add>+ ' + t('Add condition') + '</button><p class="fe-helper">' + t('Combine customer identity, storefront context, and cart conditions. Customer order and tag conditions apply only to signed-in customers.') + '</p></section><p class="fe-msg" data-entry-msg></p></div><div class="xp-mf"><button type="button" class="btn btn-default" data-entry-cancel>' + t('Cancel') + '</button><button type="button" class="btn btn-primary" data-entry-save>' + t('Save customer entry') + '</button></div></div>';
      bcI18n(modal);
      modal.querySelectorAll('[data-entry-cancel]').forEach(function (button) { button.onclick = close; });
      modal.querySelector('[data-entry-add]').onclick = function () { buf.push({ field: 'cart_total', op: 'at_least', value: '' }); render(); };
      modal.querySelectorAll('[data-entry-remove]').forEach(function (button) { button.onclick = function () { buf.splice(Number(button.getAttribute('data-entry-remove')), 1); render(); }; });
      modal.querySelectorAll('[data-entry-field]').forEach(function (select) { select.onchange = function () { var index = Number(select.getAttribute('data-entry-field')), field = FLOW_ENTRY_FIELDS[select.value]; buf[index] = { field: select.value, op: field.operators[0].value, value: field.kind === 'tags' ? [] : field.kind === 'select' ? field.options[0].value : '' }; render(); }; });
      modal.querySelectorAll('[data-entry-op]').forEach(function (select) { select.onchange = function () { var index = Number(select.getAttribute('data-entry-op')); buf[index].op = select.value; if (select.value === 'between') buf[index].value = { min: '', max: '' }; else if (buf[index].value && typeof buf[index].value === 'object' && !Array.isArray(buf[index].value)) buf[index].value = ''; render(); }; });
      modal.querySelectorAll('[data-entry-value]').forEach(function (input) { var update = function () { var index = Number(input.getAttribute('data-entry-value')); buf[index].value = input.type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value; }; input.oninput = update; input.onchange = update; });
      modal.querySelectorAll('[data-entry-min]').forEach(function (input) { input.oninput = function () { var index = Number(input.getAttribute('data-entry-min')); if (!buf[index].value || typeof buf[index].value !== 'object') buf[index].value = { min: '', max: '' }; buf[index].value.min = input.value === '' ? '' : Number(input.value); }; });
      modal.querySelectorAll('[data-entry-max]').forEach(function (input) { input.oninput = function () { var index = Number(input.getAttribute('data-entry-max')); if (!buf[index].value || typeof buf[index].value !== 'object') buf[index].value = { min: '', max: '' }; buf[index].value.max = input.value === '' ? '' : Number(input.value); }; });
      modal.querySelectorAll('[data-entry-rm-tag]').forEach(function (button) { button.onclick = function () { var index = Number(button.getAttribute('data-entry-rm-tag')), tag = button.getAttribute('data-tag'); buf[index].value = (buf[index].value || []).filter(function (item) { return item !== tag; }); render(); }; });
      modal.querySelectorAll('[data-entry-tag-input]').forEach(function (input) { input.onkeydown = function (event) { if (event.key !== 'Enter') return; event.preventDefault(); var index = Number(input.getAttribute('data-entry-tag-input')), tag = input.value.trim(); if (tag && (buf[index].value || []).indexOf(tag) < 0) buf[index].value = (buf[index].value || []).concat([tag]); render(); }; });
      modal.querySelector('[data-entry-save]').onclick = function () {
        var priority = Math.round(Number(modal.querySelector('[data-entry-priority]').value));
        if (!priority || priority < 1) { modal.querySelector('[data-entry-msg]').textContent = t('Priority must be a positive whole number.'); return; }
        if (bcFlowList().some(function (candidate) { return candidate.id !== flow.id && Number(candidate.priority) === priority; })) { modal.querySelector('[data-entry-msg]').textContent = t('Each purchase flow needs a unique priority.'); return; }
        if (buf.some(invalidCondition)) { modal.querySelector('[data-entry-msg]').textContent = t('Complete or remove every condition before applying.'); return; }
        bcFlowUpdate(flow.id, { entryConditions: buf, entry: buf.length ? 'Custom audience' : 'All eligible customers', audience: buf.length ? 'Custom audience' : 'All eligible customers', priority: priority, updated: t('Just now') });
        close(); toast(t('Customer entry saved')); renderFunnel(flow.id);
      };
    }
    document.body.appendChild(modal); modal.addEventListener('click', function (event) { if (event.target === modal) close(); }); render();
  }
  function flowDetailHeader(flow) {
    return '<div class="fd-head"><style>' +
      '.fd-head{margin-bottom:18px}.fd-main{display:flex;align-items:center;justify-content:space-between;gap:18px}.fd-title{display:flex;align-items:center;gap:12px;min-width:0}.fd-title h1{margin:0;font-size:20px;font-weight:600;letter-spacing:normal;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fd-title .back-btn{text-decoration:none;font-size:21px;line-height:1}.fd-actions{display:flex;gap:8px;flex:none;flex-wrap:wrap;justify-content:flex-end}.fd-delete{color:var(--err)!important;border-color:#f0c9bf!important}.fd-delete:hover{background:#fff4f2!important;border-color:var(--err)!important}.fd-purpose{max-width:860px;margin:8px 0 0;color:var(--ink-muted);font-size:13px;line-height:1.6}@media(max-width:760px){.fd-main{align-items:flex-start;flex-direction:column}.fd-actions{justify-content:flex-start}}' +
      '</style><div class="fd-main"><div class="fd-title"><a class="back-btn" href="#/flows" aria-label="' + t('Back to purchase flows') + '" title="' + t('Back to purchase flows') + '">←</a><h1>' + esc(t(flow.name)) + '</h1>' + flowPill(flow.status) + '</div><div class="fd-actions"><button class="btn btn-default" data-flow-preview>' + t('Preview journey') + '</button>' + flowPrimaryButton(flow) + (flowIsLive(flow) ? '' : '<button type="button" class="btn btn-default fd-delete" data-flow-delete="' + esc(flow.id) + '">' + t('Delete purchase flow') + '</button>') + '</div></div><p class="fd-purpose">' + t(flowPurpose(flow)) + '</p></div>';
  }
  function flowCanvasNode(nd) {
    var pos = nd.pos || { x: 40, y: 40 };
    if (fnIsSource(nd.type)) {
      return '<div class="fc-node fc-src t-shopify" data-id="' + nd.id + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px">' +
        '<div class="fc-node-bar"><span class="fc-sicon">S</span><span class="fc-node-type">' + t('Shopify store') + '</span><span class="fc-grip">⠿</span></div>' +
        '<div class="fc-node-body"><div class="fc-src-dom">lavender-labs.myshopify.com</div>' +
          '<div class="fc-src-tag">' + t('Traffic source — shoppers enter the funnel here') + '</div>' +
          '<div class="fn-acts"><a class="btn btn-default" href="#/settings/base">' + t('Manage connection') + '</a></div></div>' +
        '<span class="fc-port" title="' + t('Drag to another node to connect') + '"></span></div>';
    }
    if (fnIsControl(nd.type)) {
      return '<div class="fc-node fc-ctrl t-control" data-id="' + nd.id + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px">' +
        '<div class="fc-node-bar"><span class="fc-cicon">S</span><span class="fc-node-type">' + t('Shopify checkout') + '</span><span class="fc-grip">⠿</span></div>' +
        '<div class="fc-node-body"><div class="fc-ctrl-tag">' + t('System fallback — unmatched shoppers continue to Shopify native checkout.') + '</div><span class="fc-system-lock">' + t('Always enabled. This route cannot be edited or removed.') + '</span></div>' +
      '</div>';
    }
    var n = nd, body;
    if (n.ab) {
      var splitA = n.ab.splitA != null ? n.ab.splitA : 50;
      var sA = n.ab.sA || 0, oA = n.ab.oA || 0, sB = n.ab.sB || 0, oB = n.ab.oB || 0;
      var crA = sA ? oA / sA * 100 : 0, crB = sB ? oB / sB * 100 : 0, has = sA > 0 && sB > 0;
      var lead = crB > crA ? 'B' : 'A', up = has ? Math.abs(crB - crA) / Math.max(0.01, Math.min(crA, crB)) * 100 : 0;
      var byUser = n.ab.splitBy === 'user';
      var abRow = function (k, col, seg, pct, cr) {
        var meter = byUser ? '<span class="fn-ab-seg">' + esc(seg) + '</span>' : '<span class="fn-ab-track"><span style="width:' + pct + '%;background:' + col + '"></span></span>';
        var metric = byUser ? (has ? cr.toFixed(1) + '%' : '·') : (pct + '%' + (has ? ' · ' + cr.toFixed(1) + '%' : ''));
        return '<div class="fn-ab-row"><b>' + k + '</b>' + meter + '<i>' + metric + '</i></div>';
      };
      body = '<div class="fn-ab"><div class="fn-ab-h">A/B · ' + esc(bcTplName(n.type, n.tpl)) + ' vs ' + esc(bcTplName(n.type, n.ab.b)) + (byUser ? ' <span class="fn-ab-mode">' + t('by user type') + '</span>' : '') + '</div>' +
        abRow('A', '#2b62d6', t('New'), splitA, crA) +
        abRow('B', '#7b4bd0', t('Returning'), 100 - splitA, crB) +
        (has
          ? '<div class="fn-ab-win">' + t('Variant') + ' ' + lead + ' +' + up.toFixed(0) + '% · ' + (n.ab.conf || 0) + '% · <a href="#" data-win="' + n.id + '">' + t('auto-pick winner') + '</a></div>'
          : '<div class="fn-ab-win" style="color:var(--ink-muted)">' + t('Collecting data — no winner yet') + '</div>') +
        '<div class="fn-ab-foot"><a href="' + bcEditHash(n.type, n.tpl) + '">' + t('Edit A') + '</a> · <a href="' + bcEditHash(n.type, n.ab.b) + '">' + t('Edit B') + '</a> · <a href="#" data-rmab="' + n.id + '">' + t('Remove A/B') + '</a></div></div>';
    } else {
      body = '<div class="fn-tpl">' + t('Template') + ': <b>' + esc(bcTplName(n.type, n.tpl)) + '</b> · <a href="#" data-swap="' + n.id + '">' + t('Change') + '</a></div>';
    }
    if (n.type === 'upsell' || n.type === 'downsell') body += '<div class="fn-offer-summary">' + esc(fnOfferSummary(n)) + '</div>';
    var deleteControl = fnCanRemovePage(bcFunnel(), n) ? '<button class="fc-del" data-del="' + n.id + '" title="' + t('Remove page') + '">✕</button>' : '';
    return '<div class="fc-node t-' + n.type + '" data-id="' + n.id + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px">' +
      '<div class="fc-node-bar"><span class="fc-dot"></span><span class="fc-node-type">' + t(fnLabel(n.type)) + '</span>' + deleteControl + '<span class="fc-grip">⠿</span></div>' +
      '<div class="fc-node-body">' + body +
        '<div class="fn-acts">' + ((n.type === 'upsell' || n.type === 'downsell') ? '<button type="button" class="btn btn-default" data-offer="' + n.id + '">' + t(n.type === 'upsell' ? 'Configure Upsell' : 'Configure Downsell') + '</button>' : '') + '<a class="btn btn-default" href="' + bcEditHash(n.type, n.tpl) + '">' + t('Edit') + '</a></div>' +
      '</div>' +
      '<span class="fc-port" title="' + t('Drag to another node to connect') + '"></span>' +
    '</div>';
  }
  function flowCanvasMarkup(st, inline) {
    fcEdges = st.edges || [];
    var nodes = (st.nodes || []).map(flowCanvasNode).join('');
    var inlineClass = inline ? ' fc-canvas-inline' : '';
    var scrollClass = inline ? ' fc-scroll-inline' : '';
    return '<div class="fc-bar' + (inline ? ' fc-bar-inline' : '') + '"><button class="btn btn-primary" id="fc-addbtn">+ ' + t('Add page') + '</button><span class="fc-sep"></span><button class="btn btn-default" data-z="out" title="Zoom out">−</button><span class="fc-zval" id="fc-z">100%</span><button class="btn btn-default" data-z="in" title="Zoom in">+</button><button class="btn btn-default" data-z="fit">' + t('Fit') + '</button><span class="fc-hint" id="fc-hint">' + t('Click a node to branch from it · drag the title bar to move') + '</span></div>' +
      '<div class="fc-scroll' + scrollClass + '" id="fc-scroll"><div class="fc-sizer" id="fc-sizer"><div class="fc-canvas' + inlineClass + '" id="fc-canvas" style="width:' + FC_W + 'px;height:' + FC_H + 'px"><svg class="fc-edges" id="fc-edges"></svg><div class="fc-labels" id="fc-labels"></div>' + nodes + '</div></div></div>';
  }
  // ---- Funnel canvas (Shopify source → pages; add/remove pages; in-node A/B with auto-winner) ----
  function renderFunnelLegacy(flowId) {
    var flow = bcFlowById(flowId || activeFlowId);
    if (!flow) { location.hash = '#/flows'; return; }
    activeFlowId = flow.id;
    var st = bcFunnel();
    var dirty = fnHasChanges(st);
    fcEdges = st.edges || [];
    var node = function (nd) {
      var pos = nd.pos || { x: 40, y: 40 };
      if (fnIsSource(nd.type)) {
        return '<div class="fc-node fc-src t-shopify" data-id="' + nd.id + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px">' +
          '<div class="fc-node-bar"><span class="fc-sicon">S</span><span class="fc-node-type">' + t('Shopify store') + '</span><span class="fc-grip">⠿</span></div>' +
          '<div class="fc-node-body"><div class="fc-src-dom">lavender-labs.myshopify.com</div>' +
            '<div class="fc-src-tag">' + t('Traffic source — customers enter the funnel here') + '</div>' +
            '<div class="fc-src-entry"><small>' + t('Customer entry') + '</small><b>' + esc(flowEntrySummary(flow)) + '</b></div>' +
            '<div class="fn-acts"><button type="button" class="btn btn-default" data-flow-entry-node>' + t('Configure entry') + '</button><a class="btn btn-default" href="#/settings/base">' + t('Manage connection') + '</a></div></div>' +
          '<span class="fc-port" title="' + t('Drag to another node to connect') + '"></span></div>';
      }
      if (fnIsControl(nd.type)) {
        return '<div class="fc-node fc-ctrl t-control" data-id="' + nd.id + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px">' +
          '<div class="fc-node-bar"><span class="fc-cicon">S</span><span class="fc-node-type">' + t('Shopify checkout') + '</span><span class="fc-grip">⠿</span></div>' +
          '<div class="fc-node-body"><div class="fc-ctrl-tag">' + t('System fallback — unmatched shoppers continue to Shopify native checkout.') + '</div><span class="fc-system-lock">' + t('Always enabled. This route cannot be edited or removed.') + '</span></div>' +
        '</div>';
      }
      var n = nd, body;
      if (n.ab) {
        var splitA = n.ab.splitA != null ? n.ab.splitA : 50;
        var sA = n.ab.sA || 0, oA = n.ab.oA || 0, sB = n.ab.sB || 0, oB = n.ab.oB || 0;
        var crA = sA ? oA / sA * 100 : 0, crB = sB ? oB / sB * 100 : 0, has = sA > 0 && sB > 0;
        var lead = crB > crA ? 'B' : 'A', up = has ? Math.abs(crB - crA) / Math.max(0.01, Math.min(crA, crB)) * 100 : 0;
        var byUser = n.ab.splitBy === 'user';
        var abRow = function (k, col, seg, pct, cr) {
          var meter = byUser ? '<span class="fn-ab-seg">' + esc(seg) + '</span>' : '<span class="fn-ab-track"><span style="width:' + pct + '%;background:' + col + '"></span></span>';
          var metric = byUser ? (has ? cr.toFixed(1) + '%' : '·') : (pct + '%' + (has ? ' · ' + cr.toFixed(1) + '%' : ''));
          return '<div class="fn-ab-row"><b>' + k + '</b>' + meter + '<i>' + metric + '</i></div>';
        };
        body = '<div class="fn-ab"><div class="fn-ab-h">A/B · ' + esc(bcTplName(n.type, n.tpl)) + ' vs ' + esc(bcTplName(n.type, n.ab.b)) + (byUser ? ' <span class="fn-ab-mode">' + t('by user type') + '</span>' : '') + '</div>' +
          abRow('A', '#2b62d6', t('New'), splitA, crA) +
          abRow('B', '#7b4bd0', t('Returning'), 100 - splitA, crB) +
          (has
            ? '<div class="fn-ab-win">' + t('Variant') + ' ' + lead + ' +' + up.toFixed(0) + '% · ' + (n.ab.conf || 0) + '% · <a href="#" data-win="' + n.id + '">' + t('auto-pick winner') + '</a></div>'
            : '<div class="fn-ab-win" style="color:var(--ink-muted)">' + t('Collecting data — no winner yet') + '</div>') +
          '<div class="fn-ab-foot"><a href="' + bcEditHash(n.type, n.tpl) + '">' + t('Edit A') + '</a> · <a href="' + bcEditHash(n.type, n.ab.b) + '">' + t('Edit B') + '</a> · <a href="#" data-rmab="' + n.id + '">' + t('Remove A/B') + '</a></div></div>';
      } else {
        body = '<div class="fn-tpl">' + t('Template') + ': <b>' + esc(bcTplName(n.type, n.tpl)) + '</b> · <a href="#" data-swap="' + n.id + '">' + t('Change') + '</a></div>';
      }
      if (n.type === 'upsell' || n.type === 'downsell') body += '<div class="fn-offer-summary">' + esc(fnOfferSummary(n)) + '</div>';
      var deleteControl = fnCanRemovePage(bcFunnel(), n) ? '<button class="fc-del" data-del="' + n.id + '" title="' + t('Remove page') + '">✕</button>' : '';
      return '<div class="fc-node t-' + n.type + '" data-id="' + n.id + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px">' +
        '<div class="fc-node-bar"><span class="fc-dot"></span><span class="fc-node-type">' + t(fnLabel(n.type)) + '</span>' + deleteControl + '<span class="fc-grip">⠿</span></div>' +
        '<div class="fc-node-body">' + body +
          '<div class="fn-acts">' + ((n.type === 'upsell' || n.type === 'downsell') ? '<button type="button" class="btn btn-default" data-offer="' + n.id + '">' + t(n.type === 'upsell' ? 'Configure Upsell' : 'Configure Downsell') + '</button>' : '') + '<a class="btn btn-default" href="' + bcEditHash(n.type, n.tpl) + '">' + t('Edit') + '</a></div>' +
        '</div>' +
        '<span class="fc-port" title="' + t('Drag to another node to connect') + '"></span>' +
      '</div>';
    };
    var nodes = (st.nodes || []).map(node).join('');
    root.innerHTML = (window.UI && window.UI.unsavedBar ? window.UI.unsavedBar({ show: dirty, saveLabel: 'Publish', saveAct: 'funnel-publish', discardAct: 'funnel-discard' }) : '') + wrap(GSTYLE + FSTYLE + XSTYLE + flowDetailHeader(flow) +
      '<div class="fc-bar">' +
        '<button class="btn btn-primary" id="fc-addbtn">+ ' + t('Add page') + '</button>' +
        '<button class="btn btn-default" data-flow-priority>' + t('Manage priorities') + '</button>' +
        '<span class="fc-sep"></span>' +
        // Tidy layout / Reset funnel removed — fnAutoLayout() runs automatically when a node is added or
// removed, so an explicit "tidy" button is redundant; "reset" was a developer convenience that
// merchants would only ever hit by accident.
'<button class="btn btn-default" data-z="out" title="Zoom out">−</button><span class="fc-zval" id="fc-z">100%</span><button class="btn btn-default" data-z="in" title="Zoom in">+</button><button class="btn btn-default" data-z="fit">' + t('Fit') + '</button>' +
        '<span class="fc-hint" id="fc-hint">' + t('Click a node to branch from it · drag the title bar to move') + '</span></div>' +
      '<div class="fc-scroll" id="fc-scroll"><div class="fc-sizer" id="fc-sizer"><div class="fc-canvas" id="fc-canvas" style="width:' + FC_W + 'px;height:' + FC_H + 'px">' +
        '<svg class="fc-edges" id="fc-edges"></svg><div class="fc-labels" id="fc-labels"></div>' + nodes +
      '</div></div></div>');
    var canvas = root.querySelector('#fc-canvas');
    root.querySelectorAll('[data-flow-preview]').forEach(function (button) { button.onclick = function () { openFlowPreview(flow); }; });
    root.querySelectorAll('[data-flow-mode]').forEach(function (button) { button.onclick = function () { flowDetailView = button.getAttribute('data-flow-mode'); renderFunnel(flow.id); }; });
    root.querySelectorAll('[data-flow-entry]').forEach(function (button) { button.onclick = function () { openRuleEditor('src'); }; });
    root.querySelectorAll('[data-flow-entry-node]').forEach(function (button) { button.onclick = function () { openFlowEntryEditor(flow); }; });
    root.querySelectorAll('[data-flow-priority]').forEach(function (button) { button.onclick = function () { openFlowPriorityManager(function () { renderFunnel(flow.id); }); }; });
    bindFlowStatusActions(flow, function () { renderFunnel(flow.id); }, function () { location.hash = '#/flows'; });
    root.querySelectorAll('[data-ab]').forEach(function (b) { b.onclick = function () { openFunnelAB(b.getAttribute('data-ab')); }; });
    root.querySelectorAll('[data-win]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var s = bcFunnel(), n = fnNode(s, a.getAttribute('data-win')); if (n && n.ab) { var cA = n.ab.sA ? n.ab.oA / n.ab.sA : 0, cB = n.ab.sB ? n.ab.oB / n.ab.sB : 0; if (cB >= cA) n.tpl = n.ab.b; n.ab = null; bcFunnelSave(s); } toast(t('Winner rolled out to 100%')); renderFunnel(); }; });
    root.querySelectorAll('[data-rmab]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var s = bcFunnel(), n = fnNode(s, a.getAttribute('data-rmab')); if (n) n.ab = null; bcFunnelSave(s); toast(t('A/B test removed')); renderFunnel(); }; });
    root.querySelectorAll('[data-offer]').forEach(function (button) { button.onclick = function () { openOfferConfig(button.getAttribute('data-offer')); }; });
    root.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); fnDeletePage(b.getAttribute('data-del')); }; });
    var applySel = function () { canvas.querySelectorAll('.fc-node').forEach(function (el) { el.classList.toggle('sel', el.getAttribute('data-id') === fcSel); }); };
    (st.nodes || []).forEach(function (nd) {
      var el = canvas.querySelector('.fc-node[data-id="' + nd.id + '"]'); if (!el) return;
      fcDrag(canvas, el, nd.id);
      fcPortDrag(canvas, el, nd.id);
      el.addEventListener('click', function (e) {
        if (e.target.closest('a,button')) return;
        fcSel = (fcSel === nd.id ? null : nd.id); applySel();
      });
    });
    var sc0 = root.querySelector('#fc-scroll'); if (sc0) sc0.addEventListener('click', function (e) {
      if (e.target.closest('.fc-node') || e.target.closest('.fc-ehit')) return;
      fcSel = null; applySel();
    });
    var addBtn = root.querySelector('#fc-addbtn'); if (addBtn) addBtn.onclick = function () { openPagePicker({ mode: 'add' }); };
    var pubBtn = root.querySelector('[data-act="funnel-publish"]');
    if (pubBtn) pubBtn.onclick = function () { publishFlowChanges(flow); renderFunnel(flow.id); };
    var discardBtn = root.querySelector('[data-act="funnel-discard"]');
    if (discardBtn) discardBtn.onclick = function () {
      var s = bcFunnel();
      if (fnDiscardChanges(s)) toast(t('Changes discarded'));
      renderFunnel();
    };
    root.querySelectorAll('[data-swap]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var s = bcFunnel(), n = fnNode(s, a.getAttribute('data-swap')); if (n) openPagePicker({ mode: 'swap', id: n.id, type: n.type }); }; });
    var applyZoom = function () { canvas.style.transform = 'scale(' + fcZoom + ')'; var sz = root.querySelector('#fc-sizer'); if (sz) { sz.style.width = (FC_W * fcZoom) + 'px'; sz.style.height = (FC_H * fcZoom) + 'px'; } var zl = root.querySelector('#fc-z'); if (zl) zl.textContent = Math.round(fcZoom * 100) + '%'; };
    root.querySelectorAll('[data-z]').forEach(function (b) { b.onclick = function () {
      var k = b.getAttribute('data-z');
      if (k === 'reset') { localStorage.removeItem(bcFunnelKey()); fcZoom = null; renderFunnel(); return; }
      if (k === 'tidy') { var s = bcFunnel(); fnAutoLayout(s); bcFunnelSave(s); toast(t('Layout tidied')); renderFunnel(); return; }
      if (k === 'fit') fcZoom = fcFit();
      else if (k === 'in') fcZoom = Math.min(1.3, Math.round(((fcZoom || 1) + 0.1) * 10) / 10);
      else fcZoom = Math.max(0.4, Math.round(((fcZoom || 1) - 0.1) * 10) / 10);
      applyZoom(); fcDrawEdges(canvas);
    }; });
    if (fcZoom == null) fcZoom = fcFit();
    applyZoom();
    fcAutoHeight(canvas);
    fcDrawEdges(canvas);
    applySel();
    bcI18n(root);
  }
  function bindFlowCanvas(flow, st) {
    var canvas = root.querySelector('#fc-canvas');
    if (!canvas) { bcI18n(root); return; }
    root.querySelectorAll('[data-flow-preview]').forEach(function (button) { button.onclick = function () { openFlowPreview(flow); }; });
    bindFlowStatusActions(flow, function () { renderFunnel(flow.id); }, function () { location.hash = '#/flows'; });
    root.querySelectorAll('[data-ab]').forEach(function (b) { b.onclick = function () { openFunnelAB(b.getAttribute('data-ab')); }; });
    root.querySelectorAll('[data-win]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var s = bcFunnel(), n = fnNode(s, a.getAttribute('data-win')); if (n && n.ab) { var cA = n.ab.sA ? n.ab.oA / n.ab.sA : 0, cB = n.ab.sB ? n.ab.oB / n.ab.sB : 0; if (cB >= cA) n.tpl = n.ab.b; n.ab = null; bcFunnelSave(s); } toast(t('Winner rolled out to 100%')); renderFunnel(flow.id); }; });
    root.querySelectorAll('[data-rmab]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var s = bcFunnel(), n = fnNode(s, a.getAttribute('data-rmab')); if (n) n.ab = null; bcFunnelSave(s); toast(t('A/B test removed')); renderFunnel(flow.id); }; });
    root.querySelectorAll('[data-offer]').forEach(function (button) { button.onclick = function () { openOfferConfig(button.getAttribute('data-offer')); }; });
    root.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); fnDeletePage(b.getAttribute('data-del')); }; });
    var applySel = function () { canvas.querySelectorAll('.fc-node').forEach(function (el) { el.classList.toggle('sel', el.getAttribute('data-id') === fcSel); }); };
    (st.nodes || []).forEach(function (nd) {
      var el = canvas.querySelector('.fc-node[data-id="' + nd.id + '"]'); if (!el) return;
      fcDrag(canvas, el, nd.id);
      fcPortDrag(canvas, el, nd.id);
      el.addEventListener('click', function (e) {
        if (e.target.closest('a,button')) return;
        fcSel = (fcSel === nd.id ? null : nd.id); applySel();
      });
    });
    var sc0 = root.querySelector('#fc-scroll'); if (sc0) sc0.addEventListener('click', function (e) {
      if (e.target.closest('.fc-node') || e.target.closest('.fc-ehit')) return;
      fcSel = null; applySel();
    });
    var addBtn = root.querySelector('#fc-addbtn'); if (addBtn) addBtn.onclick = function () { openPagePicker({ mode: 'add' }); };
    var pubBtn = root.querySelector('[data-act="funnel-publish"]');
    if (pubBtn) pubBtn.onclick = function () { publishFlowChanges(flow); renderFunnel(flow.id); };
    var discardBtn = root.querySelector('[data-act="funnel-discard"]');
    if (discardBtn) discardBtn.onclick = function () { var s = bcFunnel(); if (fnDiscardChanges(s)) toast(t('Changes discarded')); renderFunnel(flow.id); };
    root.querySelectorAll('[data-swap]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var s = bcFunnel(), n = fnNode(s, a.getAttribute('data-swap')); if (n) openPagePicker({ mode: 'swap', id: n.id, type: n.type }); }; });
    var applyZoom = function () { canvas.style.transform = 'scale(' + fcZoom + ')'; var sz = root.querySelector('#fc-sizer'); if (sz) { sz.style.width = (FC_W * fcZoom) + 'px'; sz.style.height = (FC_H * fcZoom) + 'px'; } var zl = root.querySelector('#fc-z'); if (zl) zl.textContent = Math.round(fcZoom * 100) + '%'; };
    root.querySelectorAll('[data-z]').forEach(function (b) { b.onclick = function () {
      var k = b.getAttribute('data-z');
      if (k === 'fit') fcZoom = fcFit();
      else if (k === 'in') fcZoom = Math.min(1.3, Math.round(((fcZoom || 1) + 0.1) * 10) / 10);
      else fcZoom = Math.max(0.4, Math.round(((fcZoom || 1) - 0.1) * 10) / 10);
      applyZoom(); fcDrawEdges(canvas);
    }; });
    if (fcZoom == null) fcZoom = fcFit();
    applyZoom();
    fcAutoHeight(canvas);
    fcDrawEdges(canvas);
    applySel();
    bcI18n(root);
  }
  function renderFunnel(flowId) {
    var flow = bcFlowById(flowId || activeFlowId);
    if (!flow) { location.hash = '#/flows'; return; }
    activeFlowId = flow.id;
    // Use the Custom App's large journey canvas: all steps, traffic and offer
    // branches remain visible without forcing merchants to read a node list.
    var state = bcFunnel();
    renderFlowJourney(flow, state, fnHasChanges(state));
  }
  function fcFit() {
    var sc = document.querySelector('#fc-scroll');
    if (!sc) return 0.8;
    // On a phone, keep cards readable and let the canvas scroll horizontally.
    var minZoom = window.matchMedia && window.matchMedia('(max-width:760px)').matches ? 0.65 : 0.4;
    return Math.max(minZoom, Math.min(1, (sc.clientWidth - 26) / FC_W));
  }
  // Canvas hugs its content: height = lowest node bottom + padding. Recomputed on render + drag.
  function fcAutoHeight(canvas) {
    // Full-page canvas uses the remaining viewport; embedded canvas stays compact inside the journey card.
    var scroll = document.querySelector('#fc-scroll');
    var inline = canvas.classList.contains('fc-canvas-inline');
    if (scroll) {
      var top = scroll.getBoundingClientRect().top;
      scroll.style.height = (inline ? Math.min(620, Math.max(440, Math.round(window.innerHeight * 0.54))) : Math.max(380, Math.round(window.innerHeight - top - 18))) + 'px';
    }
    // 2) the canvas plane hugs the content, but never shorter than the window (so the dotted area fills it)
    var max = 320;
    canvas.querySelectorAll('.fc-node').forEach(function (el) { max = Math.max(max, el.offsetTop + el.offsetHeight); });
    var fill = scroll ? Math.round((scroll.clientHeight - 6) / (fcZoom || 1)) : 0;
    FC_H = Math.max(Math.round(max + 46), fill);
    canvas.style.height = FC_H + 'px';
    var sz = document.querySelector('#fc-sizer'); if (sz) sz.style.height = (FC_H * (fcZoom || 1)) + 'px';
  }
  function fcDeleteEdge(from, to) {
    var s = bcFunnel();
    if (fnIsSystemFallbackEdge(s, from, to)) { toast(t('This system fallback cannot be removed.')); return; }
    s.edges = (s.edges || []).filter(function (e) { return !(e.from === from && e.to === to); });
    bcFunnelSave(s); toast(t('Connection removed')); renderFunnel();
  }
  // Click a connection → minimal menu: open the rule builder, or delete. The builder handles every
  // routing dimension (button outcomes, traffic %, customer attributes, tags…). Single-out-edge case
  // skips the routing rule option entirely — no fork, nothing to route between.
  function openEdgeMenu(from, to, x, y) {
    var ex = document.querySelector('.fc-emenu'); if (ex) ex.remove();
    var s0 = bcFunnel(), edge = (s0.edges || []).filter(function (e) { return e.from === from && e.to === to; })[0];
    if (!edge) return;
    var siblingsCount = (s0.edges || []).filter(function (e) { return e.from === from; }).length;
    var menu = document.createElement('div'); menu.className = 'fc-emenu';
    var items = '';
    if (siblingsCount < 2) {
      items = '<div class="fc-emh">' + t('Connection') + '</div>' +
              '<div class="fc-emi-info">' + t('Single path — add another branch from this node to use a routing rule.') + '</div>' +
              '<div class="fc-emsep"></div>' +
              '<button class="fc-emi del" data-act="del">' + t('Remove connection') + '</button>';
    } else {
      items = '<div class="fc-emh">' + t('Routing rule') + '</div>' +
              '<button class="fc-emi predicate" data-act="edit">' + t('Configure routing rule…') + '</button>' +
              '<div class="fc-emsep"></div>' +
              '<button class="fc-emi del" data-act="del">' + t('Remove connection') + '</button>';
    }
    menu.innerHTML = items;
    menu.style.cssText = 'position:fixed;left:' + Math.min(x, window.innerWidth - 240) + 'px;top:' + Math.min(y, window.innerHeight - 160) + 'px;z-index:120';
    document.body.appendChild(menu); bcI18n(menu);
    var close = function () { if (menu.parentNode) menu.remove(); document.removeEventListener('mousedown', outside); };
    var outside = function (e) { if (!menu.contains(e.target)) close(); };
    setTimeout(function () { document.addEventListener('mousedown', outside); }, 0);
    menu.querySelectorAll('[data-act]').forEach(function (b) { b.onclick = function () {
      var act = b.getAttribute('data-act');
      var s = bcFunnel();
      if (act === 'del') { if (fnIsSystemFallbackEdge(s, from, to)) { toast(t('This system fallback cannot be removed.')); close(); return; } s.edges = s.edges.filter(function (x) { return !(x.from === from && x.to === to); }); bcFunnelSave(s); close(); renderFunnel(); return; }
      if (act === 'edit') { close(); openRuleEditor(from); return; }
    }; });
  }
  // Fork edges = every out-edge from the source. The builder shows one row per edge with its conditions.
  function fnForkEdges(s, fromId) { return (s.edges || []).filter(function (e) { return e.from === fromId; }); }
  // ─── Routing rule builder (Azoya-style) ────────────────────────────────────────────────────────
  // The fork = a list of edges from `fromId`. Each edge has an `expression` rule = AND'd conditions.
  // For each edge we render: target name + condition rows + "+ add condition" + fallback checkbox.
  // Field dropdown is grouped (Basic / Behavior / Value / Tags / Action / Random); operator + value
  // controls switch based on the field's `kind`. State is buffered locally and committed on Apply.
  function openCheckoutTrafficEditor(fromId, s0, buf) {
    var flow = bcFlowById(activeFlowId) || {};
    var randomValue = function (branch) {
      var rule = branch.rule || {}, condition = (rule.conditions || []).filter(function (item) { return item.field === 'random'; })[0];
      return condition && condition.value != null ? Number(condition.value) : null;
    };
    // A new second Checkout starts at 0% so the existing page keeps all buyer
    // traffic until the merchant deliberately changes the split.
    var hasExplicitWeights = buf.some(function (branch) { return randomValue(branch) != null; });
    var weights = buf.map(function (branch, index) {
      var value = randomValue(branch);
      return value != null ? value : (hasExplicitWeights ? 0 : (index === 0 ? 100 : 0));
    });
    var m = document.createElement('div'); m.className = 'xp-modal';
    m.innerHTML = XSTYLE + FSTYLE + '<style>' +
      '.ct-mc{width:560px;max-width:calc(100vw - 32px)}.ct-head{position:relative;padding:16px 18px 12px;border-bottom:1px solid var(--hair)}.ct-head h2{margin:0;color:var(--ink);font-size:16px;line-height:1.35}.ct-head p{margin:3px 34px 0 0;color:var(--ink-muted);font-size:12px;line-height:1.45}.ct-close{position:absolute;top:13px;right:14px;width:28px;height:28px;border:1px solid var(--ctl);border-radius:7px;background:#fff;color:var(--ink-muted);font-size:18px;line-height:1;cursor:pointer}.ct-close:hover{border-color:var(--brand);color:var(--brand);background:#f5f9ff}.ct-body{display:grid;gap:12px;padding:14px 18px 16px;max-height:min(560px,calc(100vh - 188px));overflow:auto}.ct-audience{display:flex;align-items:center;gap:10px;padding:10px 11px;border:1px solid #cfe1ff;border-radius:8px;background:#f6f9ff}.ct-audience-icon{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#e5efff;color:var(--brand);font-size:13px;font-weight:750;flex:none}.ct-audience-copy{min-width:0;flex:1}.ct-audience-copy small,.ct-platform-copy small{display:block;color:var(--ink-muted);font-size:10.5px}.ct-audience-copy strong{display:block;margin-top:1px;color:var(--ink);font-size:12px}.ct-audience-copy span{display:block;margin-top:1px;color:var(--ink-muted);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ct-entry{border:0;background:none;color:var(--brand);font-size:11px;font-weight:600;white-space:nowrap;cursor:pointer}.ct-entry:hover{text-decoration:underline}.ct-split-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px}.ct-split-head strong{font-size:12px;color:var(--ink)}.ct-total{display:inline-flex;align-items:center;height:22px;padding:0 7px;border:1px solid #cfe1ff;border-radius:999px;background:#f1f6ff;color:var(--brand);font-size:11px;font-weight:750}.ct-total.invalid{border-color:#f6c5bf;background:#fff4f2;color:#c83e2a}.ct-platform{display:grid;gap:6px}.ct-platform-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.ct-platform-copy b{display:block;color:var(--ink);font-size:11.5px}.ct-platform-note{max-width:240px;color:var(--ink-muted);font-size:10px;line-height:1.35;text-align:right}.ct-route{display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid var(--hair);border-radius:8px;background:#fff}.ct-route.system{background:#fafbfc}.ct-route-icon{display:grid;place-items:center;width:23px;height:23px;border-radius:6px;background:#eef1f4;color:#607083;font-size:10px;font-weight:750;flex:none}.ct-route:not(.system) .ct-route-icon{background:#edf3ff;color:var(--brand)}.ct-route-copy{min-width:0;flex:1}.ct-route-copy strong{display:block;color:var(--ink);font-size:12px}.ct-route-copy small{display:block;margin-top:1px;color:var(--ink-muted);font-size:10px}.ct-percent{display:flex;align-items:center;gap:5px;flex:none}.ct-percent input{box-sizing:border-box;width:60px;height:28px;padding:0 7px;border:1px solid var(--ctl);border-radius:6px;color:var(--ink);font:600 12px/1 inherit;text-align:right;outline:0;appearance:textfield;-moz-appearance:textfield}.ct-percent input::-webkit-outer-spin-button,.ct-percent input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}.ct-percent input:focus{border-color:var(--brand);box-shadow:0 0 0 2px rgb(0 102 230 / 10%)}.ct-percent span{color:var(--ink-muted);font-size:11px;font-weight:600}.ct-add-page{height:30px;border:1px dashed #9cbbe9;border-radius:7px;background:#fbfdff;color:var(--brand);font-size:11px;font-weight:600;cursor:pointer}.ct-add-page:hover{border-color:var(--brand);background:#f3f8ff}.ct-separate{display:flex;gap:8px;padding:10px 11px;border:1px solid #cce6dd;border-radius:8px;background:#f2fbf6}.ct-separate-icon{color:#23824f;font-size:15px;line-height:1}.ct-separate strong{display:block;color:#276b48;font-size:11.5px}.ct-separate p{margin:2px 0 0;color:#4d795f;font-size:10.5px;line-height:1.4}.ct-msg{min-height:17px;color:var(--err);font-size:11px}.ct-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:11px 18px;border-top:1px solid var(--hair)}@media(max-width:560px){.ct-body{padding:12px}.ct-head{padding:14px 12px 10px}.ct-foot{padding:10px 12px}.ct-platform-head{align-items:flex-start;flex-direction:column}.ct-platform-note{text-align:left}.ct-audience{align-items:flex-start}.ct-entry{padding-top:3px}}' +
      '</style><div class="xp-mc ct-mc"><div class="ct-head"><h2>' + t('Set Checkout traffic rules') + '</h2><p>' + t('First decide who enters this Purchase flow, then decide which Checkout those customers use.') + '</p><button type="button" class="ct-close" data-ct-close aria-label="' + t('Close') + '">×</button></div>' +
        '<div class="ct-body"><div class="ct-audience"><span class="ct-audience-icon">◉</span><div class="ct-audience-copy"><small>' + t('Applies to') + '</small><strong>' + t('Customers who entered this purchase flow') + '</strong><span>' + esc(flowEntrySummary(flow)) + '</span></div><button type="button" class="ct-entry" data-ct-entry>' + t('Edit entry') + '</button></div>' +
          '<div class="ct-split-head"><strong>' + t('Checkout split for this audience') + '</strong><output class="ct-total" data-ct-total>100%</output></div><div class="ct-platform" data-ct-routes></div>' +
          '<div class="ct-separate"><span class="ct-separate-icon">⌘</span><div><strong>' + t('Use a separate Purchase flow for a different audience') + '</strong><p>' + t('Create a separate flow when customers should follow a different journey. Use this split only for a default route or an A/B experiment within the same audience.') + '</p></div></div>' +
        '</div><div class="ct-foot"><span class="ct-msg" data-ct-msg></span><button type="button" class="btn btn-default" data-ct-cancel>' + t('Cancel') + '</button><button type="button" class="btn btn-primary" data-ct-save>' + t('Save traffic rules') + '</button></div></div>';
    document.body.appendChild(m); bcI18n(m);
    var close = function () { m.remove(); };
    var routesEl = m.querySelector('[data-ct-routes]'), totalEl = m.querySelector('[data-ct-total]'), msgEl = m.querySelector('[data-ct-msg]'), saveBtn = m.querySelector('[data-ct-save]');
    var total = function () { return weights.reduce(function (sum, value) { return sum + (Number(value) || 0); }, 0); };
    var valid = function () { return weights.every(function (value) { return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100; }) && total() === 100; };
    var branchMarkup = function (branch, index) {
      var target = fnNode(s0, branch.to) || {};
      var detail = target.tpl ? t('Template') + ': ' + esc(bcTplName('checkout', target.tpl)) : t('BestCheckout Checkout page');
      return '<div class="ct-route"><span class="ct-route-icon">B</span><div class="ct-route-copy"><strong>' + fnCheckoutTrafficName(s0, branch) + '</strong><small>' + detail + '</small></div><label class="ct-percent"><input type="number" min="0" max="100" step="1" value="' + esc(String(weights[index])) + '" data-ct-weight="' + index + '"><span>%</span></label></div>';
    };
    function render() {
      routesEl.innerHTML = '<section class="ct-platform"><div class="ct-platform-head"><div class="ct-platform-copy"><b>BestCheckout</b><small>' + t('Checkout pages') + '</small></div><span class="ct-platform-note">' + t('Set one default Checkout or split the same audience across multiple pages.') + '</span></div>' + (buf.map(branchMarkup).join('') || '<div class="rb-empty">' + t('No BestCheckout Checkout page yet.') + '</div>') + '<button type="button" class="ct-add-page" data-ct-add-page>+ ' + t('Add Checkout page') + '</button></section>';
      routesEl.querySelectorAll('[data-ct-weight]').forEach(function (input) { input.oninput = function () { var index = +input.getAttribute('data-ct-weight'); weights[index] = input.value === '' ? '' : Number(input.value); validate(); }; });
      var addPage = routesEl.querySelector('[data-ct-add-page]'); if (addPage) addPage.onclick = function () { close(); openPagePicker({ mode: 'add', type: 'checkout' }); };
      validate();
    }
    function validate() {
      var currentTotal = total(), isValid = valid();
      totalEl.textContent = currentTotal + '%'; totalEl.className = 'ct-total' + (isValid ? '' : ' invalid');
      msgEl.textContent = isValid ? '' : t('Checkout traffic must total 100%.');
      saveBtn.disabled = !isValid;
    }
    m.addEventListener('click', function (event) { if (event.target === m) close(); });
    m.querySelector('[data-ct-close]').onclick = close;
    m.querySelector('[data-ct-cancel]').onclick = close;
    m.querySelector('[data-ct-entry]').onclick = function () { close(); openFlowEntryEditor(flow); };
    saveBtn.onclick = function () {
      var next = bcFunnel();
      var live = fnForkEdges(next, fromId);
      buf.forEach(function (branch, index) {
        branch.rule.conditions = (branch.rule.conditions || []).filter(function (condition) { return condition.field !== 'random'; });
        branch.rule.conditions.push({ field: 'random', op: 'pct', value: Number(weights[index]) });
        branch.rule.fallback = false;
        var liveBranch = live.filter(function (edge) { return edge.to === branch.to; })[0];
        if (liveBranch) liveBranch.rule = JSON.parse(JSON.stringify(branch.rule));
      });
      bcFunnelSave(next); close(); toast(t('Traffic rules saved')); renderFunnel(activeFlowId);
    };
    render();
  }
  function openRuleEditor(fromId) {
    var s0 = bcFunnel(), sourceNode = fnNode(s0, fromId) || {};
    var isEntryRouting = fnIsSource(sourceNode.type);
    var branches = isEntryRouting ? fnCheckoutTrafficEdges(s0, fromId) : fnForkEdges(s0, fromId);
    if (branches.length < 2) return;
    // Deep-clone branch rules into a buffer so cancel = no save.
    var buf = branches.map(function (e) { return { from: e.from, to: e.to, rule: JSON.parse(JSON.stringify(e.rule || { type: 'expression', conditions: [] })) }; });
    // Buyer eligibility is configured once at the purchase-flow entry. A source-node branch only
    // allocates buyers who already entered, so legacy customer filters cannot reappear here.
    if (isEntryRouting) buf.forEach(function (branch) {
      branch.rule.conditions = (branch.rule.conditions || []).filter(function (condition) { return condition.field === 'random'; });
      branch.rule.fallback = false;
    });
    if (isEntryRouting) { openCheckoutTrafficEditor(fromId, s0, buf); return; }
    var nodeOf = function (id) { var n = fnNode(s0, id) || {}; return fnIsControl(n.type) ? t('Shopify checkout') : t(fnLabel(n.type)); };
    var headTitle = (isEntryRouting ? t('Traffic allocation') : t('Routing rules')) + ' · ' + esc(t(fnLabel(sourceNode.type)));
    var m = document.createElement('div'); m.className = 'xp-modal';
    var entryNote = isEntryRouting ? '<div class="rb-modal-note">' + t('Customer eligibility is set in Customer entry. This screen only allocates customers who already entered the flow.') + '</div>' : '';
    m.innerHTML = XSTYLE + FSTYLE +
      '<div class="xp-mc rb-mc"><div class="xp-mh">' + headTitle + '</div>' +
        '<div class="xp-mb rb-body">' + entryNote + '<div class="rb-list" id="rb-list"></div></div>' +
        '<div class="xp-mf"><div class="rb-msg" id="rb-msg"></div><button class="btn btn-default" id="rb-cancel">' + t('Cancel') + '</button><button class="btn btn-primary" id="rb-ok">' + t('Apply') + '</button></div>' +
      '</div>';
    document.body.appendChild(m); bcI18n(m);
    var listEl = m.querySelector('#rb-list'), msgEl = m.querySelector('#rb-msg'), okBtn = m.querySelector('#rb-ok'), cancelBtn = m.querySelector('#rb-cancel');
    var close = function () { m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    cancelBtn.onclick = close;
    // Render one branch row. Fallback = explicit radio (exactly one per fork). Conditions stay
    // editable on the fallback branch too — its conditions are "preferred" but if no sibling
    // matches, traffic comes here regardless. Group `name="rb-fb-{token}"` ties the radios.
    var fbGroup = 'rb-fb-' + Math.random().toString(36).slice(2, 7);
    // Default: if no branch is marked fallback yet, set the last one (or one with no conditions)
    if (!buf.some(function (br) { return br.rule.fallback; })) {
      var empty = buf.filter(function (br) { return (br.rule.conditions || []).length === 0; })[0];
      (empty || buf[buf.length - 1]).rule.fallback = true;
    }
    // Split conditions visually into "user filter" (predicates) and "traffic weight" (random).
    // Same underlying data — `field:'random'` is still a condition — but the UI separates them so
    // merchants don't get confused about whether "45% AND new customer" means "45% of all, also new"
    // or "45% of new customers". The split makes it obvious: filters first, then % distribution.
    function render() {
      var html = '';
      buf.forEach(function (br, bi) {
        var name = nodeOf(br.to);
        var conds = (br.rule.conditions || []);
        var fb = !!br.rule.fallback;
        // Split conditions
        var filterConds = [], randomCond = null;
        conds.forEach(function (c, ci) { if (c.field === 'random') randomCond = { ci: ci, c: c }; else filterConds.push({ ci: ci, c: c }); });
        var filterHtml = filterConds.length ?
          filterConds.map(function (x) { return condRow(bi, x.ci, x.c); }).join('') :
          '<div class="rb-empty">' + t('No user filters — anyone is eligible for this branch.') + '</div>';
        var routingHtml = isEntryRouting
          ? ''
          : '<div class="rb-section-l">' + t('Who is eligible (AND):') + '</div><div class="rb-conds">' + filterHtml + '</div><button class="rb-addc" data-addc="' + bi + '">+ ' + t('Add user filter') + '</button><div class="rb-sep"></div>';
        var weightHtml = '';
        if (randomCond) {
          weightHtml = '<div class="rb-weight-row"><span class="rb-weight-prefix">' + t('Takes') + '</span>' +
            '<input type="number" class="rb-weight-input" data-bi="' + bi + '" min="0" max="100" value="' + esc(randomCond.c.value == null ? '' : String(randomCond.c.value)) + '">' +
            '<span class="rb-weight-suffix">' + t('% of the matched traffic') + '</span>' +
            '<button class="rb-weight-rm" data-rmw="' + bi + '" title="' + t('Remove weight') + '">✕</button></div>';
        } else {
          weightHtml = '<button class="rb-addc rb-addw" data-addw="' + bi + '">+ ' + t('Set traffic weight') + '</button>';
        }
        var fallbackControl = isEntryRouting && fnIsControl((fnNode(s0, br.to) || {}).type);
        var fallbackControlMarkup = fallbackControl
          ? '<span class="rb-system-fallback">' + t('System fallback') + '</span>'
          : (isEntryRouting ? '' : '<label class="rb-fb"><input type="radio" name="' + fbGroup + '" data-fb="' + bi + '"' + (fb ? ' checked' : '') + '> ' + t('Fallback') +
              ' <span class="rb-hint" tabindex="0">?<span class="rb-tip">' + t('Traffic that no sibling branch matches goes here. The conditions below are still respected as a preference, but this branch always catches the unmatched.') + '</span></span>' +
            '</label>');
        html += '<div class="rb-branch ' + (fb ? 'fallback' : '') + '" data-bi="' + bi + '">' +
          '<div class="rb-branch-h"><span class="rb-arrow">→</span> <b class="rb-target">' + esc(name) + '</b>' +
            fallbackControlMarkup +
          '</div>' +
          routingHtml +
          '<div class="rb-section-l">' + t(isEntryRouting ? 'Traffic share of entered customers:' : 'Traffic share among the eligible:') + '</div>' +
          weightHtml +
        '</div>';
      });
      listEl.innerHTML = html;
      bcI18n(listEl);
      wireBranchControls();
      validate();
    }
    function condRow(bi, ci, c) {
      var field = FIELD_CATALOG[c.field] || {};
      var kind = field.kind;
      var opMeta = OP_KINDS[kind] || { ops: [], value: 'none' };
      // Field dropdown — grouped optgroups. Random is excluded (it has its own weight UI).
      var fieldOpts = FIELD_GROUPS.filter(function (g) { return g.key !== 'random'; }).map(function (g) {
        var fs = Object.keys(FIELD_CATALOG).filter(function (k) { return FIELD_CATALOG[k].group === g.key; });
        if (!fs.length) return '';
        return '<optgroup label="' + esc(t(g.label)) + '">' + fs.map(function (k) {
          return '<option value="' + esc(k) + '"' + (k === c.field ? ' selected' : '') + '>' + esc(t(FIELD_CATALOG[k].label)) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
      // Op dropdown
      var opOpts = (opMeta.ops || []).map(function (o) { return '<option value="' + esc(o.value) + '"' + (o.value === c.op ? ' selected' : '') + '>' + esc(t(o.label)) + '</option>'; }).join('');
      // Value control
      var valHtml = '';
      if (opMeta.value === 'select') {
        var vOpts = (field.options || []).map(function (o) { return '<option value="' + esc(o.value) + '"' + (o.value === c.value ? ' selected' : '') + '>' + esc(t(o.label)) + '</option>'; }).join('');
        valHtml = '<select class="rb-val" data-bi="' + bi + '" data-ci="' + ci + '"><option value="">' + t('Select…') + '</option>' + vOpts + '</select>';
      } else if (opMeta.value === 'multi') {
        var sel = Array.isArray(c.value) ? c.value : [];
        valHtml = '<div class="rb-tags" data-bi="' + bi + '" data-ci="' + ci + '">' +
          sel.map(function (v) { return '<span class="rb-tag">' + esc(v) + '<button data-rmtag="' + esc(v) + '">×</button></span>'; }).join('') +
          '<select class="rb-tagadd"><option value="">+ ' + t('Add tag') + '</option>' + (field.options || []).filter(function (o) { return sel.indexOf(o.value) < 0; }).map(function (o) { return '<option value="' + esc(o.value) + '">' + esc(t(o.label)) + '</option>'; }).join('') + '</select>' +
        '</div>';
      } else if (opMeta.value === 'number') {
        if (c.op === 'between') {
          var lo = Array.isArray(c.value) ? c.value[0] : '', hi = Array.isArray(c.value) ? c.value[1] : '';
          valHtml = '<input type="number" class="rb-val rb-num2-lo" data-bi="' + bi + '" data-ci="' + ci + '" value="' + esc(lo == null ? '' : String(lo)) + '" placeholder="' + t('min') + '"><span class="rb-tilde">~</span><input type="number" class="rb-val rb-num2-hi" data-bi="' + bi + '" data-ci="' + ci + '" value="' + esc(hi == null ? '' : String(hi)) + '" placeholder="' + t('max') + '">';
        } else {
          valHtml = '<input type="number" class="rb-val" data-bi="' + bi + '" data-ci="' + ci + '" value="' + esc(c.value == null ? '' : String(c.value)) + '"' + (field.unit === '$' ? ' min="0"' : '') + '>' + (field.kind === 'percent' ? '<span class="rb-tilde">%</span>' : (field.unit ? '<span class="rb-tilde">' + esc(field.unit) + '</span>' : ''));
        }
      } // else: bool — no value control
      var hint = field.hint ? ' <span class="rb-hint" tabindex="0">?<span class="rb-tip">' + esc(t(field.hint)) + '</span></span>' : '';
      return '<div class="rb-cond" data-bi="' + bi + '" data-ci="' + ci + '">' +
        '<select class="rb-field">' + fieldOpts + '</select>' +
        '<select class="rb-op">' + opOpts + '</select>' +
        '<span class="rb-vwrap">' + valHtml + hint + '</span>' +
        '<button class="rb-rm" data-rm="' + bi + ',' + ci + '" title="' + t('Remove condition') + '">✕</button>' +
      '</div>';
    }
    function wireBranchControls() {
      // fallback radio — exactly one branch per fork; selecting one unmarks the others.
      listEl.querySelectorAll('[data-fb]').forEach(function (r) { r.onchange = function () {
        var bi = +r.getAttribute('data-fb');
        buf.forEach(function (br, i) { br.rule.fallback = (i === bi); });
        render();
      }; });
      // add condition
      listEl.querySelectorAll('[data-addc]').forEach(function (b) { b.onclick = function () {
        var bi = +b.getAttribute('data-addc');
        buf[bi].rule.conditions = buf[bi].rule.conditions || [];
        buf[bi].rule.conditions.push(defaultCondition(bi));
        render();
      }; });
      // remove condition (works on any branch, including the fallback)
      listEl.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () {
        var p = b.getAttribute('data-rm').split(','), bi = +p[0], ci = +p[1];
        buf[bi].rule.conditions.splice(ci, 1);
        render();
      }; });
      // add weight (random condition)
      listEl.querySelectorAll('[data-addw]').forEach(function (b) { b.onclick = function () {
        var bi = +b.getAttribute('data-addw');
        buf[bi].rule.conditions = buf[bi].rule.conditions || [];
        buf[bi].rule.conditions.push({ field: 'random', op: 'pct', value: 50 });
        render();
      }; });
      // remove weight
      listEl.querySelectorAll('[data-rmw]').forEach(function (b) { b.onclick = function () {
        var bi = +b.getAttribute('data-rmw');
        buf[bi].rule.conditions = (buf[bi].rule.conditions || []).filter(function (c) { return c.field !== 'random'; });
        render();
      }; });
      // weight input
      listEl.querySelectorAll('.rb-weight-input').forEach(function (inp) { inp.oninput = function () {
        var bi = +inp.getAttribute('data-bi');
        var rc = (buf[bi].rule.conditions || []).filter(function (c) { return c.field === 'random'; })[0];
        if (rc) { rc.value = inp.value === '' ? null : Number(inp.value); validate(); }
      }; });
      // field change
      listEl.querySelectorAll('.rb-cond').forEach(function (row) {
        var bi = +row.getAttribute('data-bi'), ci = +row.getAttribute('data-ci');
        var fieldSel = row.querySelector('.rb-field'), opSel = row.querySelector('.rb-op');
        fieldSel.onchange = function () {
          var nf = fieldSel.value, kind = (FIELD_CATALOG[nf] || {}).kind, opMeta = OP_KINDS[kind] || { ops: [] };
          buf[bi].rule.conditions[ci] = { field: nf, op: (opMeta.ops[0] || {}).value, value: kind === 'multitag' ? [] : null };
          render();
        };
        opSel.onchange = function () {
          var prev = buf[bi].rule.conditions[ci];
          var newOp = opSel.value;
          // For between switch, reset value shape
          if (newOp === 'between') buf[bi].rule.conditions[ci] = { field: prev.field, op: newOp, value: [null, null] };
          else if (prev.op === 'between') buf[bi].rule.conditions[ci] = { field: prev.field, op: newOp, value: null };
          else buf[bi].rule.conditions[ci].op = newOp;
          render();
        };
        // value inputs
        var vSel = row.querySelector('select.rb-val');
        if (vSel) vSel.onchange = function () { buf[bi].rule.conditions[ci].value = vSel.value || null; validate(); };
        var vNums = row.querySelectorAll('input.rb-val');
        if (vNums.length === 1 && !row.querySelector('.rb-num2-lo')) {
          vNums[0].oninput = function () { buf[bi].rule.conditions[ci].value = vNums[0].value === '' ? null : Number(vNums[0].value); validate(); };
        } else if (row.querySelector('.rb-num2-lo')) {
          var lo = row.querySelector('.rb-num2-lo'), hi = row.querySelector('.rb-num2-hi');
          [lo, hi].forEach(function (el) { el.oninput = function () {
            buf[bi].rule.conditions[ci].value = [lo.value === '' ? null : Number(lo.value), hi.value === '' ? null : Number(hi.value)];
            validate();
          }; });
        }
        // multitag controls
        var tagWrap = row.querySelector('.rb-tags');
        if (tagWrap) {
          tagWrap.querySelectorAll('[data-rmtag]').forEach(function (rb) { rb.onclick = function () {
            var v = rb.getAttribute('data-rmtag');
            buf[bi].rule.conditions[ci].value = (buf[bi].rule.conditions[ci].value || []).filter(function (x) { return x !== v; });
            render();
          }; });
          var addSel = tagWrap.querySelector('.rb-tagadd');
          if (addSel) addSel.onchange = function () {
            if (!addSel.value) return;
            var cur = buf[bi].rule.conditions[ci].value || [];
            buf[bi].rule.conditions[ci].value = cur.concat([addSel.value]);
            render();
          };
        }
      });
    }
    function defaultCondition(bi) {
      var srcType = (fnNode(s0, fromId) || {}).type;
      // Pick a sensible default based on source: Upsell/Downsell → action; otherwise → customer.type
      if (srcType === 'upsell') return { field: 'action.upsell', op: 'eq', value: 'accept' };
      if (srcType === 'downsell') return { field: 'action.downsell', op: 'eq', value: 'accept' };
      return { field: 'customer.type', op: 'eq', value: 'new' };
    }
    // Validation: at most one fallback per fork; no two non-fallback branches with the same conditions
    // (catches "both branches set to '新客'"); random conditions on the same source sum to 100 if any.
    function validate() {
      var errs = [];
      // Radio enforces "exactly one fallback" so no count check needed — but a defensive nudge if 0.
      if (!buf.some(function (b) { return b.rule.fallback; })) errs.push(t('Pick one branch as the fallback.'));
      // Random % sum check — per FILTER GROUP, not global. Branches with the same filter signature
      // share the segment, and weights within that segment must sum to 100. Different segments are
      // independent (e.g. new@20+new@80 = 100, returning@60+returning@40 = 100, fallback catches rest).
      var sumGroups = {};
      buf.forEach(function (b) {
        if (b.rule.fallback) return;
        var conds = b.rule.conditions || [];
        var randomC = conds.filter(function (c) { return c.field === 'random'; })[0];
        if (!randomC) return;
        var sig = conds.filter(function (c) { return c.field !== 'random'; }).map(function (c) { return c.field + ':' + c.op + ':' + JSON.stringify(c.value); }).sort().join('|');
        (sumGroups[sig] = sumGroups[sig] || []).push(randomC);
      });
      Object.keys(sumGroups).forEach(function (sig) {
        var arr = sumGroups[sig]; if (arr.length < 2) return;
        var sum = arr.reduce(function (a, c) { return a + (c.value != null ? Number(c.value) : 0); }, 0);
        if (sum !== 100) errs.push(t('Traffic %s for this segment must total 100') + ' (' + t('now') + ' ' + sum + ')');
      });
      // Duplicate-rule detection — only fires when both branches have IDENTICAL user filters AND
      // NEITHER has a random weight (weight is a valid differentiator). So 45/45 split with no
      // filters is fine (it's an A/B test); but two branches with the same filter and no random is
      // ambiguous.
      var sigs = {}, dup = null;
      buf.forEach(function (b) {
        if (b.rule.fallback) return;
        var hasRandom = (b.rule.conditions || []).some(function (c) { return c.field === 'random'; });
        if (hasRandom) return;
        var filterConds = (b.rule.conditions || []).filter(function (c) { return c.field !== 'random'; });
        if (!filterConds.length) return;  // empty filter without random → handled by fallback/A-B with random
        var key = filterConds.map(function (c) { return c.field + ':' + c.op + ':' + JSON.stringify(c.value); }).sort().join('|');
        if (sigs[key]) dup = b; else sigs[key] = true;
      });
      if (dup) errs.push(t('Two branches share the same user filters with no traffic weight — add a filter or weight to differentiate.'));
      // Missing values (any branch — even fallback's conditions should be complete).
      var missing = false;
      buf.forEach(function (b) {
        (b.rule.conditions || []).forEach(function (c) {
          var f = FIELD_CATALOG[c.field] || {};
          if (f.kind === 'multitag') { if (!Array.isArray(c.value) || !c.value.length) missing = true; }
          else if (f.kind === 'bool') { /* no value */ }
          else if (c.op === 'between') { if (!Array.isArray(c.value) || c.value[0] == null || c.value[1] == null) missing = true; }
          else { if (c.value == null || c.value === '') missing = true; }
        });
      });
      if (missing) errs.push(t('Some conditions are missing values.'));
      msgEl.textContent = errs[0] || '';
      msgEl.className = 'rb-msg' + (errs.length ? ' err' : '');
      okBtn.disabled = errs.length > 0;
    }
    okBtn.onclick = function () {
      var s = bcFunnel(), live = fnForkEdges(s, fromId);
      buf.forEach(function (br, i) { if (live[i]) live[i].rule = JSON.parse(JSON.stringify(br.rule)); });
      bcFunnelSave(s); close(); toast(t('Routing rules updated')); renderFunnel();
    };
    render();
  }
  // Small confirm/info modal (reuses the xp-modal shell) for demo actions that would call out to Shopify.
  function bcModal(title, html, okText, onOk) {
    var m = document.createElement('div'); m.className = 'xp-modal';
    // bcModal can be opened from pages that don't inject the funnel styles (e.g. Connect) — carry them.
    m.innerHTML = XSTYLE + FSTYLE + '<div class="xp-mc"><div class="xp-mh">' + esc(title) + '</div><div class="xp-mb">' + html + '</div>' +
      '<div class="xp-mf"><button class="btn btn-default" id="bm-cancel">' + t('Cancel') + '</button><button class="btn btn-primary" id="bm-ok">' + esc(okText) + '</button></div></div>';
    document.body.appendChild(m); bcI18n(m);
    var close = function () { m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('#bm-cancel').onclick = close;
    m.querySelector('#bm-ok').onclick = function () { close(); if (onOk) onOk(); };
    return m;
  }
  // Offers belong to a page in the journey.  Keeping this small, explicit
  // dialog near the page avoids the old pattern of sending merchants to a
  // disconnected "offers" area just to finish a one-click upsell.
  function openOfferConfig(id) {
    var state = bcFunnel(), node = fnNode(state, id);
    if (!node || (node.type !== 'upsell' && node.type !== 'downsell')) return;
    var pageType = node.type === 'upsell' ? 'Upsell' : 'Downsell';
    var offer = fnOfferValue(node);
    var selectedProduct = fnOfferProduct(offer.productId);
    var selectedType = offer.type || 'percentage';
    var discountValue = offer.value == null ? '' : String(offer.value);
    var modal = document.createElement('div'); modal.className = 'xp-modal';
    modal.innerHTML = XSTYLE + FLOW_SYSTEM_STYLE + '<div class="xp-mc fo-modal"><div class="xp-mh">' + t('Configure ' + pageType) + '</div><div class="xp-mb">' +
      '<div class="fo-intro"><strong>' + t(pageType) + '</strong><span>' + t('Configure a relevant product and price before publishing.') + '</span></div>' +
      '<div class="xp-f"><label>' + t('Offer product') + '</label><button type="button" class="fo-product-trigger" data-fo-product aria-label="' + t('Choose offer product') + '">' + offerProductTriggerHtml(selectedProduct) + '</button></div>' +
      '<div class="fo-grid"><div class="xp-f"><label>' + t('Original price') + '</label><output class="fo-readonly" id="fo-base">—</output><small class="fo-field-hint">' + t('From selected product') + '</small></div><div class="xp-f"><label>' + t('Offer price') + '</label><output class="fo-readonly fo-price-output" id="fo-price">—</output><small class="fo-field-hint">' + t('Calculated from discount') + '</small></div></div>' +
      '<div class="xp-f"><label>' + t('Offer discount') + '</label><div class="fo-discount-row"><div class="fo-types"><button type="button" class="fo-type' + (selectedType === 'percentage' ? ' on' : '') + '" data-fo-type="percentage">' + t('Percentage off') + '</button><button type="button" class="fo-type' + (selectedType === 'fixed' ? ' on' : '') + '" data-fo-type="fixed">' + t('Fixed amount off') + '</button></div><div class="fo-discount-input"><span data-fo-prefix></span><input id="fo-discount" type="number" min="0" step="1" value="' + esc(discountValue) + '" placeholder="0"><span data-fo-suffix>%</span></div></div></div>' +
      '<div class="fo-summary" id="fo-summary"></div>' +
      '</div><div class="xp-mf"><button type="button" class="btn btn-default" data-fo-cancel>' + t('Cancel') + '</button><button type="button" class="btn btn-primary" data-fo-save>' + t('Save ' + pageType) + '</button></div></div>';
    document.body.appendChild(modal); bcI18n(modal);
    var productTrigger = modal.querySelector('[data-fo-product]');
    var discountInput = modal.querySelector('#fo-discount');
    var saveButton = modal.querySelector('[data-fo-save]');
    var updateOffer = function () {
      var hasProduct = !!selectedProduct;
      var discount = fnOfferDiscountValue(selectedType, discountValue);
      var base = fnOfferBasePrice(selectedProduct);
      var price = fnOfferPrice(selectedProduct, selectedType, discount);
      productTrigger.innerHTML = offerProductTriggerHtml(selectedProduct);
      modal.querySelector('#fo-base').textContent = fnOfferMoney(base);
      modal.querySelector('#fo-price').textContent = fnOfferMoney(price);
      discountInput.disabled = !hasProduct;
      discountInput.step = selectedType === 'fixed' ? '0.01' : '1';
      discountInput.placeholder = selectedType === 'fixed' ? '0.00' : '0';
      discountInput.value = discountValue;
      modal.querySelector('[data-fo-prefix]').textContent = selectedType === 'fixed' ? '$' : '';
      modal.querySelector('[data-fo-suffix]').textContent = selectedType === 'fixed' ? '' : '%';
      modal.querySelectorAll('[data-fo-type]').forEach(function (button) { button.classList.toggle('on', button.getAttribute('data-fo-type') === selectedType); button.disabled = !hasProduct; });
      saveButton.disabled = !hasProduct;
      modal.querySelector('#fo-summary').innerHTML = hasProduct
        ? '<strong>' + esc(selectedProduct.name) + '</strong><span>' + esc(fnOfferMoney(price)) + ' <s>' + esc(fnOfferMoney(base)) + '</s></span><small>' + esc(selectedType === 'fixed' ? fnOfferMoney(discount) + ' ' + t('off') : String(discount) + '% ' + t('off')) + '</small>'
        : '<strong>' + t('No product selected') + '</strong><small>' + t('Choose a product to set its discount.') + '</small>';
    };
    productTrigger.onclick = function () { openOfferProductPicker(selectedProduct ? selectedProduct.id : '', function (product) { selectedProduct = product; updateOffer(); }); };
    discountInput.oninput = function () { discountValue = discountInput.value; updateOffer(); };
    modal.querySelectorAll('[data-fo-type]').forEach(function (button) { button.onclick = function () { selectedType = button.getAttribute('data-fo-type'); updateOffer(); }; });
    var close = function () { modal.remove(); };
    modal.addEventListener('click', function (event) { if (event.target === modal) close(); });
    modal.querySelector('[data-fo-cancel]').onclick = close;
    modal.querySelector('[data-fo-save]').onclick = function () {
      if (!selectedProduct) { toast(t('Choose a product before saving.')); return; }
      var latest = bcFunnel(), latestNode = fnNode(latest, id); if (!latestNode) { close(); return; }
      var discount = fnOfferDiscountValue(selectedType, discountValue);
      latestNode.offer = { productId: selectedProduct.id, price: fnOfferPrice(selectedProduct, selectedType, discount), compareAt: fnOfferBasePrice(selectedProduct), type: selectedType, value: String(discount) };
      bcFunnelSave(latest); close(); toast(t(pageType + ' saved')); renderFunnel();
    };
    updateOffer();
  }
  function offerProductTriggerHtml(product) {
    if (!product) return '<span class="fo-product-empty">' + t('No product selected') + '</span><span class="fo-product-choose">' + t('Choose product') + '</span>';
    return '<span class="fo-product-avatar">' + esc((product.name || '?').charAt(0).toUpperCase()) + '</span><span class="fo-product-copy"><strong>' + esc(product.name) + '</strong><small>$' + esc(product.price) + ' <s>$' + esc(product.compareAt) + '</s></small></span><span class="fo-product-change">' + t('Change product') + '<b>⌄</b></span>';
  }
  function openOfferProductPicker(selectedId, onPick) {
    // Reuse the subscription product selector so offers get the same search,
    // filters, inventory/status context and single-select confirmation flow.
    var selected = fnOfferProduct(selectedId);
    if (window.UI && typeof window.UI.productPicker === 'function') {
      window.UI.productPicker({
        multiple: false,
        zIndex: 500,
        selected: selected ? [selected.name] : [],
        products: FLOW_OFFER_PRODUCTS.map(function (product, index) {
          return {
            id: product.id,
            name: product.name,
            sku: 'BC-' + String(index + 1).padStart(3, '0'),
            price: Number(product.price),
            priceMax: Number(product.compareAt),
            variants: index % 3 === 0 ? 2 : 1,
            inv: [186, 72, 48, 520, 91][index] || 30,
            status: 'active',
            cat: index === 2 ? 'bundles' : 'add-ons'
          };
        }),
        categories: [{ value: 'add-ons', label: 'Checkout add-ons' }, { value: 'bundles', label: 'Bundles' }],
        fields: [{ value: 'name', label: 'Product name' }, { value: 'sku', label: 'SKU' }],
        statusOptions: [['active', 'Active']],
        onConfirm: function (products) {
          var picked = (products || [])[0];
          var product = picked ? (fnOfferProduct(picked.id) || FLOW_OFFER_PRODUCTS.filter(function (item) { return item.name === picked.name; })[0]) : null;
          if (product && onPick) onPick(product);
        }
      });
      return;
    }
    var picker = document.createElement('div'); picker.className = 'xp-modal fo-picker-layer';
    picker.innerHTML = XSTYLE + FLOW_SYSTEM_STYLE + '<style>' +
      '.fo-picker-layer{z-index:95}.fo-picker{width:min(620px,calc(100vw - 32px));max-height:min(720px,calc(100vh - 32px));overflow:hidden;display:flex;flex-direction:column}.fo-picker-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px 12px;border-bottom:1px solid var(--hair)}.fo-picker-head h2{margin:0;color:var(--ink);font-size:16px;line-height:1.35}.fo-picker-head p{margin:4px 0 0;color:var(--ink-muted);font-size:12px;line-height:1.45}.fo-picker-close{border:0;background:transparent;color:var(--ink-muted);font-size:22px;line-height:20px;padding:1px 3px;cursor:pointer}.fo-picker-close:hover{color:var(--ink)}.fo-picker-search{padding:12px 20px;border-bottom:1px solid var(--hair)}.fo-picker-search input{width:100%;height:36px;box-sizing:border-box;border:1px solid var(--ctl);border-radius:8px;padding:0 11px;color:var(--ink);font:inherit;font-size:13px;outline:0}.fo-picker-search input:focus{border-color:var(--brand);box-shadow:0 0 0 2px rgb(0 102 230 / 8%)}.fo-picker-list{overflow:auto;min-height:0;max-height:470px;padding:8px 12px 12px}.fo-picker-row{width:100%;display:flex;align-items:center;gap:11px;border:1px solid var(--hair);border-radius:9px;background:#fff;color:var(--ink);text-align:left;padding:10px;cursor:pointer;margin-top:7px}.fo-picker-row:first-child{margin-top:0}.fo-picker-row:hover{border-color:#9fc4f9;background:#fbfdff}.fo-picker-row.is-selected{border-color:var(--brand);background:#f5f9ff}.fo-picker-avatar{width:34px;height:34px;display:grid;place-items:center;flex:none;border-radius:8px;background:#e8f0ff;color:var(--brand);font-size:13px;font-weight:750}.fo-picker-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}.fo-picker-copy strong{color:var(--ink);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fo-picker-copy small{color:var(--ink-muted);font-size:11.5px}.fo-picker-copy s{margin-left:4px;color:#94a0ad}.fo-picker-state{padding:4px 7px;border-radius:999px;background:#edf4ff;color:var(--brand);font-size:11px;font-weight:700;white-space:nowrap}.fo-picker-empty{padding:38px 14px;text-align:center;color:var(--ink-muted);font-size:13px}@media(max-width:560px){.fo-picker-head,.fo-picker-search{padding-left:16px;padding-right:16px}.fo-picker-list{max-height:calc(100vh - 220px);padding-left:10px;padding-right:10px}}</style>' +
      '<div class="xp-mc fo-picker"><div class="fo-picker-head"><div><h2>' + t('Choose offer product') + '</h2><p>' + t('Choose a synced product for this offer.') + '</p></div><button type="button" class="fo-picker-close" data-fo-picker-close aria-label="' + t('Close') + '">×</button></div><div class="fo-picker-search"><input type="search" autocomplete="off" data-fo-picker-search placeholder="' + t('Search products') + '"></div><div class="fo-picker-list" data-fo-picker-list></div></div>';
    document.body.appendChild(picker); bcI18n(picker);
    var search = picker.querySelector('[data-fo-picker-search]');
    var list = picker.querySelector('[data-fo-picker-list]');
    var close = function () { picker.remove(); };
    var render = function () {
      var query = (search.value || '').trim().toLowerCase();
      var items = FLOW_OFFER_PRODUCTS.filter(function (product) { return !query || product.name.toLowerCase().indexOf(query) >= 0; });
      list.innerHTML = items.length ? items.map(function (product) {
        var selected = product.id === selectedId;
        return '<button type="button" class="fo-picker-row' + (selected ? ' is-selected' : '') + '" data-fo-picker-product="' + esc(product.id) + '" aria-pressed="' + selected + '"><span class="fo-picker-avatar">' + esc((product.name || '?').charAt(0).toUpperCase()) + '</span><span class="fo-picker-copy"><strong>' + esc(product.name) + '</strong><small>$' + esc(product.price) + ' <s>$' + esc(product.compareAt) + '</s></small></span><span class="fo-picker-state">' + t(selected ? 'Selected' : 'Choose') + '</span></button>';
      }).join('') : '<div class="fo-picker-empty">' + t('No products match your search.') + '</div>';
      list.querySelectorAll('[data-fo-picker-product]').forEach(function (button) { button.onclick = function () { var product = fnOfferProduct(button.getAttribute('data-fo-picker-product')); close(); if (onPick) onPick(product); }; });
    };
    picker.addEventListener('click', function (event) { if (event.target === picker) close(); });
    picker.querySelector('[data-fo-picker-close]').onclick = close;
    search.oninput = render;
    render(); search.focus();
  }
  // Append a page, branched from the SELECTED node (or the last node if nothing is selected). Two
  // children off one node = a traffic-split fork (a page-level A/B), which fcDrawEdges labels with %.
  // Smart default parent for "Add page" — pick the most likely upstream node by type, so the
  // merchant doesn't have to think. E.g. adding a checkout? branch from Shopify. Adding an upsell?
  // branch from the latest checkout. Falls through to source if nothing matches.
  function fnDefaultParent(s, type) {
    var nodes = s.nodes || [];
    var lastOf = function (preds) { for (var i = nodes.length - 1; i >= 0; i--) if (preds.indexOf(nodes[i].type) >= 0) return nodes[i].id; return null; };
    var src = nodes.filter(function (n) { return fnIsSource(n.type); })[0];
    if (type === 'checkout') return src ? src.id : null;
    if (type === 'upsell')   return lastOf(['checkout']) || lastOf(['upsell']) || (src && src.id);
    if (type === 'downsell') return lastOf(['upsell'])   || lastOf(['checkout']) || (src && src.id);
    if (type === 'thankyou') return lastOf(['upsell', 'downsell']) || lastOf(['checkout']) || (src && src.id);
    return src ? src.id : null;
  }
  function fnAddPage(type, tpl, parentIdOverride) {
    var s = bcFunnel();
    s.nodes = s.nodes || []; s.edges = s.edges || [];
    var parentId = parentIdOverride === undefined ? (fcSel || null) : parentIdOverride;  // '' / null = free
    var parent = parentId ? fnNode(s, parentId) : null;
    var id = fnUid(), pos;
    if (parent) {
      var pp = parent.pos || { x: 60, y: 80 };
      var sibs = s.edges.filter(function (e) { return e.from === parent.id; }).length;
      pos = { x: Math.min(FC_W - 250, pp.x + 280), y: Math.max(16, pp.y + sibs * 150) };
    } else {
      var maxB = 40; s.nodes.forEach(function (n) { if (n.pos) maxB = Math.max(maxB, n.pos.y + 150); });
      pos = { x: 60, y: maxB + 24 };   // drop in open space below; wire it with the ⌁ handle
    }
    s.nodes.push({ id: id, type: type, tpl: tpl || (type === 'checkout' ? 'standard' : 'default'), pos: pos });
    if (parent) s.edges.push({ from: parent.id, to: id });
    // Checkout variants are parallel entry pages, not a separate journey. When a
    // merchant adds one from the Shopify-store node, keep it on the same
    // post-purchase path as the existing Checkout page(s).
    if (type === 'checkout' && parent && fnIsSource(parent.type)) {
      var next = fnNodesOf(s, 'upsell')[0] || fnNodesOf(s, 'thankyou')[0];
      if (next) s.edges.push({ from: id, to: next.id });
    }
    bcFunnelSave(s); toast(parent ? t('Page added') : t('Page added — connect it with the ⌁ handle')); renderFunnel();
  }
  // Contextual template picker — replaces the standalone Templates library. Add mode: pick page type,
  // then a template (system + the merchant's saved ones) for it. Swap mode: change one node's template.
  function openPagePicker(opts) {
    opts = opts || {}; var mode = opts.mode || 'add';
    var TYPES = ['checkout', 'upsell', 'downsell', 'thankyou'];
    var s0 = bcFunnel();
    var selType = mode === 'swap' ? opts.type : (opts.type || 'checkout');
    var selTpl = mode === 'swap' ? (fnNode(s0, opts.id) || {}).tpl : null;
    var m = document.createElement('div'); m.className = 'xp-modal';
    var selParent = null, fixedParent = opts.parentId || '';
    var parentLabel = function (n) {
      if (fnIsSource(n.type)) return t('Shopify store');
      if (fnIsControl(n.type)) return t('Shopify checkout');
      return t(fnLabel(n.type)) + ' #' + n.id.slice(-3);
    };
    var renderFromRow = function () {
      var sCur = bcFunnel();
      var defId = fixedParent || fcSel || fnDefaultParent(sCur, selType);
      if (selParent === null) selParent = defId || '';
      var opts = (sCur.nodes || []).filter(function (n) { return !fnIsControl(n.type); }).map(function (n) {
        return '<option value="' + esc(n.id) + '"' + (n.id === selParent ? ' selected' : '') + '>' + esc(parentLabel(n)) + '</option>';
      }).join('');
      var noneSel = (selParent === '' || selParent == null) ? ' selected' : '';
      return '<div class="xp-f"><label>' + t('Branch from') + '</label>' +
        '<select class="se-pred" id="pp-from"><option value=""' + noneSel + '>' + t('(Free — connect later with the drag handle)') + '</option>' + opts + '</select>' +
      '</div>';
    };
    var fromRow = mode === 'add' && !opts.offerAdd && !fixedParent ? renderFromRow() : '';
    var typeRow = mode === 'add' && !opts.lockType ? '<div class="xp-f"><label>' + t('Page type') + '</label><div class="pp-types">' +
      TYPES.map(function (ty) { return '<button type="button" class="pp-type' + (ty === selType ? ' on' : '') + '" data-ty="' + ty + '">' + t(fnLabel(ty)) + '</button>'; }).join('') + '</div></div>' : '';
    var swapDraftNote = mode === 'swap' ? '<div class="pp-draft-note"><span class="pp-draft-note-icon">✓</span><div><strong>' + t('Changing the draft does not change shopper traffic.') + '</strong><p>' + t('The published version stays in use until this purchase flow is published again.') + '</p></div></div>' : '';
    m.innerHTML = '<div class="xp-mc"><div class="xp-mh">' + (mode === 'swap' ? t('Change template') : t(opts.title || 'Add a page')) + '</div><div class="xp-mb">' +
      typeRow + '<div class="xp-f"><label>' + t('Template') + '</label><div class="pp-tpls" id="pp-tpls"></div></div>' + swapDraftNote + fromRow +
      '</div><div class="xp-mf"><button class="btn btn-default" id="pp-cancel">' + t('Cancel') + '</button><button class="btn btn-primary" id="pp-ok">' + (mode === 'swap' ? t('Use selected page') : t('Add page')) + '</button></div></div>';
    document.body.appendChild(m);
    var wireFromSel = function () {
      var sel = m.querySelector('#pp-from'); if (sel) sel.onchange = function () { selParent = sel.value; };
    };
    wireFromSel();
    var renderTpls = function () {
      var list = bcTplList(selType).filter(function (x) { return !x.soon; });
      if (!selTpl || !list.some(function (x) { return x.id === selTpl; })) selTpl = list[0] && list[0].id;
      m.querySelector('#pp-tpls').innerHTML = list.map(function (x) {
        return '<button type="button" class="pp-tpl' + (x.id === selTpl ? ' on' : '') + '" data-tpl="' + x.id + '">' +
          '<span class="pp-thumb-wrap">' + bcTplThumb(x) + '</span>' +
          '<span class="pp-tpl-info"><span class="pp-tpl-nm">' + esc(x.name) + '</span>' +
            (x.tag ? '<span class="pp-tpl-tag">' + esc(t(x.tag)) + '</span>' : '') +
          '</span>' +
          (x.system ? '<span class="tp-sys">' + t('System') + '</span>' : '<span class="tp-saved">' + t('Saved') + '</span>') + '</button>';
      }).join('');
      m.querySelectorAll('#pp-tpls [data-tpl]').forEach(function (b) { b.onclick = function () { selTpl = b.getAttribute('data-tpl'); renderTpls(); }; });
    };
    renderTpls(); bcI18n(m);
    m.querySelectorAll('[data-ty]').forEach(function (b) { b.onclick = function () {
      selType = b.getAttribute('data-ty'); m.querySelectorAll('[data-ty]').forEach(function (x) { x.classList.toggle('on', x === b); });
      selTpl = null; selParent = null;  // reset so renderFromRow recomputes by new type
      // re-render the "branch from" row
      var fromHostBefore = m.querySelector('#pp-from'); if (fromHostBefore) { var newRow = renderFromRow(); fromHostBefore.closest('.xp-f').outerHTML = newRow; wireFromSel(); }
      renderTpls(); bcI18n(m);
    }; });
    var close = function () { m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('#pp-cancel').onclick = close;
    m.querySelector('#pp-ok').onclick = function () {
      if (!selTpl) { close(); return; }
      if (mode === 'swap') { var s = bcFunnel(), n = fnNode(s, opts.id); if (n) n.tpl = selTpl; bcFunnelSave(s); close(); toast(t('Template changed')); renderFunnel(); }
      else { close(); if (opts.offerAdd) fnJourneyAddOffer(selType, selTpl); else fnAddPage(selType, selTpl, fixedParent || selParent || ''); }
    };
  }
  function fnCanRemovePage(state, node) {
    if (!node || fnIsControl(node.type) || fnIsSource(node.type) || node.system) return false;
    return !((node.type === 'checkout' || node.type === 'thankyou') && fnNodesOf(state, node.type).length <= 1);
  }
  function fnDeletePage(id) {
    var s = bcFunnel(), node = fnNode(s, id);
    if (node && (fnIsControl(node.type) || fnIsSource(node.type) || node.system)) {
      toast(t('This required system step cannot be removed.'));
      return;
    }
    if (node && !fnCanRemovePage(s, node)) {
      toast(t('Keep at least one page of this type in the purchase flow.'));
      return;
    }
    s.nodes = (s.nodes || []).filter(function (n) { return n.id !== id; });
    s.edges = (s.edges || []).filter(function (e) { return e.from !== id && e.to !== id; });
    bcFunnelSave(s); toast(t('Page removed')); renderFunnel();
  }
  // Draw the routing arrows by measuring the live node boxes — handles drag + variable A/B-node height.
  function fcDrawEdges(canvas) {
    var svg = canvas.querySelector('#fc-edges'), labels = canvas.querySelector('#fc-labels');
    if (!svg) return;
    var paths = '', lab = '';
    // Sibling count per source for "is this edge in a fork?" — drives whether label is clickable.
    var siblings = {};
    fcEdges.forEach(function (e) { siblings[e.from] = (siblings[e.from] || 0) + 1; });
    var COLS = { accept: '#1f8f4e', decline: '#d98a2b', random: '#2b62d6', predicate: '#7b4bd0', fallback: '#9aa3af' };
    var MARKS = { accept: 'fcAa', decline: 'fcAd', random: 'fcAs', predicate: 'fcAp', fallback: 'fcA' };
    // Published-edge index — edges not in here render in red (unsaved changes).
    var pubKeys = fnPubEdgeKeys(bcFunnel());
    fcEdges.forEach(function (e) {
      var a = canvas.querySelector('.fc-node[data-id="' + e.from + '"]'), b = canvas.querySelector('.fc-node[data-id="' + e.to + '"]');
      if (!a || !b) return;
      var ax = a.offsetLeft + a.offsetWidth, ay = a.offsetTop + a.offsetHeight * (e.fromY || 0.5);
      // -10 leaves room for the SVG marker so the arrow head doesn't visually pierce
      // the target node's body. -6 was still too short on dense layouts.
      var bx = b.offsetLeft - 10, by = b.offsetTop + b.offsetHeight * 0.5;
      var dx = Math.max(46, Math.abs(bx - ax) / 2);
      var kind = fnRuleKind(e);
      var col = COLS[kind] || '#9aa3af', mk = MARKS[kind] || 'fcA';
      // Unpublished edge → render red (mirrors CC's "edits show as red until Publish").
      var edgeKey = e.from + '→' + e.to + ':' + JSON.stringify(e.rule || null);
      if (!pubKeys.has(edgeKey)) { col = '#ef4444'; mk = 'fcAr'; }
      // dashed if any random condition is present (visual: "split" still reads as dashed line)
      var hasRandom = fnRuleConds(e).some(function (c) { return c.field === 'random'; });
      var dash = (hasRandom && kind !== 'accept' && kind !== 'decline' ? ' stroke-dasharray="6 4"' : '');
      var d = 'M' + ax + ' ' + ay + ' C' + (ax + dx) + ' ' + ay + ',' + (bx - dx) + ' ' + by + ',' + bx + ' ' + by;
      paths += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2"' + dash + ' marker-end="url(#' + mk + ')"/>' +
        '<path class="fc-ehit" data-ef="' + esc(e.from) + '" data-et="' + esc(e.to) + '" d="' + d + '" fill="none" stroke="transparent" stroke-width="16"><title>' + t('Click to configure this connection') + '</title></path>';
      // Label = comma-joined condition values (from fnRuleLabel). Show only if it's a fork.
      var labelText = (siblings[e.from] >= 2) ? fnRuleLabel(e) : '';
      var editAttr = labelText ? ' data-edit="' + esc(e.from) + '" title="' + t('Click to edit the routing rules') + '"' : '';
      if (labelText) { var mx = (ax + bx) / 2, my = (ay + by) / 2 - 1; lab += '<div class="fc-elabel ' + kind + '"' + editAttr + ' style="left:' + mx + 'px;top:' + my + 'px">' + esc(labelText) + '</div>'; }
    });
    svg.innerHTML = '<defs>' +
      '<marker id="fcA" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6Z" fill="#9aa3af"/></marker>' +
      '<marker id="fcAa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6Z" fill="#1f8f4e"/></marker>' +
      '<marker id="fcAd" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6Z" fill="#d98a2b"/></marker>' +
      '<marker id="fcAs" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6Z" fill="#2b62d6"/></marker>' +
      '<marker id="fcAp" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6Z" fill="#7b4bd0"/></marker>' +
      '<marker id="fcAr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6Z" fill="#ef4444"/></marker>' +
      '</defs>' + paths;
    if (labels) { labels.innerHTML = lab; labels.querySelectorAll('[data-edit]').forEach(function (el) { el.onclick = function (ev) { ev.stopPropagation(); openRuleEditor(el.getAttribute('data-edit')); }; }); }
    svg.querySelectorAll('.fc-ehit').forEach(function (p) { p.onclick = function (ev) { ev.stopPropagation(); openEdgeMenu(p.getAttribute('data-ef'), p.getAttribute('data-et'), ev.clientX, ev.clientY); }; });
  }
  // Drag a node by its title bar; persist node.pos by id so the layout sticks across reloads.
  function fcDrag(canvas, node, id) {
    var bar = node.querySelector('.fc-node-bar'); if (!bar) return;
    bar.addEventListener('mousedown', function (ev) {
      if (ev.button !== 0 || (ev.target.closest && ev.target.closest('.fc-del'))) return;
      ev.preventDefault();
      var sx = ev.clientX, sy = ev.clientY, ol = node.offsetLeft, ot = node.offsetTop;
      node.style.zIndex = '5';
      var mv = function (e) {
        node.style.left = Math.max(0, ol + (e.clientX - sx) / fcZoom) + 'px';
        node.style.top = Math.max(0, ot + (e.clientY - sy) / fcZoom) + 'px';
        fcDrawEdges(canvas); fcAutoHeight(canvas);
      };
      var up = function () {
        document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
        node.style.zIndex = '';
        var moved = node.offsetLeft !== ol || node.offsetTop !== ot;
        var s = bcFunnel(), n = fnNode(s, id); if (n) { n.pos = { x: node.offsetLeft, y: node.offsetTop }; bcFunnelSave(s); }
        if (moved && window.UI && window.UI.setUnsavedBar) window.UI.setUnsavedBar(document, true);
      };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
  }
  // Feishu/draw.io-style "drag from port" connection. Hover a node → blue dot appears on its right
  // edge; drag from the dot → SVG ghost line follows the cursor; release over another node → edge
  // created. Keeps the ⌁ button as a click-based fallback so keyboard users aren't stranded.
  function fcPortDrag(canvas, node, id) {
    if (fnIsControl((fnNode(bcFunnel(), id) || {}).type)) return;
    var port = node.querySelector('.fc-port'); if (!port) return;
    port.addEventListener('mousedown', function (ev) {
      if (ev.button !== 0) return;
      ev.preventDefault(); ev.stopPropagation();
      var svg = canvas.querySelector('#fc-edges'); if (!svg) return;
      var rect = canvas.getBoundingClientRect();
      var sx = node.offsetLeft + node.offsetWidth, sy = node.offsetTop + node.offsetHeight / 2;
      var ghost = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      ghost.setAttribute('stroke', '#2b62d6'); ghost.setAttribute('stroke-width', '2');
      ghost.setAttribute('stroke-dasharray', '5 3'); ghost.setAttribute('fill', 'none');
      ghost.setAttribute('marker-end', 'url(#fcAs)');
      svg.appendChild(ghost);
      canvas.classList.add('fc-connecting');
      var lastTarget = null;
      function mv(e) {
        var z = fcZoom || 1;
        var cx = (e.clientX - rect.left) / z, cy = (e.clientY - rect.top) / z;
        var dx = Math.max(46, Math.abs(cx - sx) / 2);
        ghost.setAttribute('d', 'M' + sx + ' ' + sy + ' C' + (sx + dx) + ' ' + sy + ',' + (cx - dx) + ' ' + cy + ',' + cx + ' ' + cy);
        var hover = document.elementFromPoint(e.clientX, e.clientY);
        var tn = hover ? hover.closest('.fc-node') : null;
        if (tn === node) tn = null;
        if (tn !== lastTarget) {
          if (lastTarget) lastTarget.classList.remove('fc-drop-target');
          if (tn) tn.classList.add('fc-drop-target');
          lastTarget = tn;
        }
      }
      function up(e) {
        document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
        ghost.remove();
        canvas.classList.remove('fc-connecting');
        if (lastTarget) lastTarget.classList.remove('fc-drop-target');
        var hover = document.elementFromPoint(e.clientX, e.clientY);
        var target = hover ? hover.closest('.fc-node') : null;
        if (target && target !== node && !fnIsControl((fnNode(bcFunnel(), target.getAttribute('data-id')) || {}).type)) {
          var targetId = target.getAttribute('data-id');
          var s = bcFunnel(); s.edges = s.edges || [];
          if (!s.edges.some(function (e2) { return e2.from === id && e2.to === targetId; })) {
            s.edges.push({ from: id, to: targetId, rule: { type: 'expression', conditions: [], fallback: true } });
            bcFunnelSave(s); toast(t('Connected')); renderFunnel();
          }
        }
      }
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
  }
  function openFunnelAB(id) {
    var s0 = bcFunnel(), nd = fnNode(s0, id); if (!nd) return;
    var type = nd.type;
    var tpls = bcTplList(type).filter(function (x) { return !x.soon; });
    var cur = nd.tpl || (tpls[0] && tpls[0].id);
    var opts = tpls.filter(function (x) { return x.id !== cur; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('');
    if (!opts) { toast(t('This page has only one template — open 装修, then “Save as template” to make variant B, and A/B-test it.')); location.hash = bcEditHash(type, cur); return; }
    var m = document.createElement('div'); m.className = 'xp-modal';
    m.innerHTML = '<div class="xp-mc"><div class="xp-mh">' + t('New A/B test') + ' · ' + t(fnLabel(type)) + '</div><div class="xp-mb">' +
      '<div class="xp-f"><label>' + t('Variant A (current)') + '</label><input readonly value="' + esc(bcTplName(type, cur)) + '" style="height:38px;border:1px solid var(--line);border-radius:8px;padding:0 11px;font-size:13.5px;color:var(--ink-muted);background:var(--panel)"></div>' +
      '<div class="xp-f"><label>' + t('Variant B') + '</label><select id="fab-b">' + opts + '</select></div>' +
      '<div class="xp-f"><label>' + t('Split by') + '</label><div class="fab-seg"><button type="button" class="fab-segbtn on" data-by="traffic">' + t('Traffic %') + '</button><button type="button" class="fab-segbtn" data-by="user">' + t('User type') + '</button></div></div>' +
      '<div class="xp-f" id="fab-traffic"><label>' + t('Traffic split') + ' · <span id="fab-sl">50% / 50%</span></label><div class="xp-split"><b>A</b><input type="range" id="fab-split" min="10" max="90" step="5" value="50"><b>B</b></div></div>' +
      '<div class="xp-f" id="fab-usernote" hidden><div class="fab-note"><b>A → ' + t('New') + '</b> · ' + t('no paid order yet') + '<br><b>B → ' + t('Returning') + '</b> · ' + t('1+ paid order') + '<br><span style="opacity:.7">' + t('Read from the connected Shopify customer record.') + '</span></div></div>' +
      '</div><div class="xp-mf"><button class="btn btn-default" id="fab-cancel">' + t('Cancel') + '</button><button class="btn btn-primary" id="fab-start">' + t('Start A/B test') + '</button></div></div>';
    document.body.appendChild(m); bcI18n(m);
    var close = function () { m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('#fab-cancel').onclick = close;
    var by = 'traffic';
    m.querySelectorAll('[data-by]').forEach(function (b) { b.onclick = function () {
      by = b.getAttribute('data-by');
      m.querySelectorAll('[data-by]').forEach(function (x) { x.classList.toggle('on', x === b); });
      m.querySelector('#fab-traffic').hidden = (by === 'user');
      m.querySelector('#fab-usernote').hidden = (by !== 'user');
    }; });
    var sl = m.querySelector('#fab-split'), sll = m.querySelector('#fab-sl');
    sl.oninput = function () { sll.textContent = sl.value + '% / ' + (100 - sl.value) + '%'; };
    m.querySelector('#fab-start').onclick = function () {
      var s = bcFunnel(), n = fnNode(s, id); if (!n) { close(); return; }
      n.tpl = cur; n.ab = { b: m.querySelector('#fab-b').value, splitBy: by, splitA: by === 'user' ? 50 : parseInt(sl.value, 10), sA: 0, oA: 0, sB: 0, oB: 0, conf: 0 };
      bcFunnelSave(s); close(); toast(t('A/B test started — collecting data')); renderFunnel();
    };
  }
  // Register the BestCheckout sub-menu labels with the runtime-i18n overlay (sidebar is shell-rendered,
  // outside this module's bcI18n scope, so it needs the global DICT to show ZH).
  if (window.I18N && window.I18N.extend) window.I18N.extend({ 'Funnel': '漏斗', 'Templates': '模板库', 'Connection': '连接' });

  // ---- i18n (EN / 中文). The module renders English; a post-render DOM pass swaps
  //      exact-match UI strings to 中文 when the admin language is zh. Demo data
  //      (names / products / numbers) isn't in the map, so it stays as-is. ----
  const ZH = {
    'Overview': '总览', 'Payment routing': '支付路由', 'Subscriptions': '订阅', 'Post-purchase': '购后追加', 'Funnel editor': '漏斗编辑器', 'Shopify connect': 'Shopify 接入', 'Reports': '报表',
    /* Onboarding / activation checklist */
    'Get BestCheckout live': '让 BestCheckout 跑起来', 'Activation progress': '激活进度', 'Required left': '剩余必填',
    'done': '已完成', 'Collapse': '折叠', 'Required to launch': '上线还差', 'more steps': '步',
    'All required steps done — your funnel is ready to take orders.': '必填项全部完成——漏斗已可接单。',
    'Shopify connected': 'Shopify 已连接', 'Reconnect': '重新连接',
    'Shopify data auto-synced': '数据已自动同步', 'Products, inventory, discounts and customers sync automatically from Shopify': '商品、库存、折扣与客户从 Shopify 自动同步', 'View sync status': '查看同步状态',
    'Configure payments': '配置支付', 'Card processor (Airwallex / Stripe / PayPal Advanced) + PayPal wallet': '卡通道(Airwallex / Stripe / PayPal Advanced)+ PayPal 钱包',
    'Enable checkout intercept': '启用结账拦截', 'App Embed catches your cart Checkout button — no theme edits': 'App Embed 拦截购物车「Checkout」按钮——不改主题代码', 'Open Shopify theme': '打开 Shopify 主题',
    'Shipping rules': '物流规则', 'Inherits Shopify shipping by default — confirm or customize': '默认继承 Shopify 运费——确认或自定义', 'Review': '查看',
    'Custom checkout domain': '自定义结账域名', 'checkout.yourbrand.com — branded, auto-SSL': 'checkout.yourbrand.com——品牌化,SSL 自动签发', 'Set CNAME': '设置 CNAME',
    'Sender email / SMTP': '发件邮箱 / SMTP', 'Order confirmations from your own domain (lifts deliverability)': '订单确认邮件用品牌域名发出(提升到达率)', 'Configure': '配置',
    'Pick / customize template': '选 / 装修结账模板', 'Choose a checkout page, then customize it or create another one': '选择一个结账页面，再进行装修或新建页面', 'Open funnel': '打开漏斗',
    'Aura Checkout': 'Aura 结账页', 'Aura Thank you': 'Aura 致谢页',
    'First order': '首单到账', 'Auto-checked when the first BestCheckout order writes back to Shopify': '首笔 BestCheckout 订单写回 Shopify 时自动勾选', 'Mark as live (demo)': '标记为已上线 (演示)', 'Marked complete': '已标记完成',
    '(recommended)': '(推荐)',
    /* Payment branch question */
    'Which payment accounts do you have?': '你有哪些支付账号?',
    'None yet': '暂时没有',
    'Tell us what you have — we’ll recommend the right combo.': '告诉我们你有什么——我们推荐合适的组合。',
    'No problem — Airwallex is easiest to apply for. Stripe is fastest in most regions.': '没问题——Airwallex 申请最容易,Stripe 在大多数地区开通最快。',
    'processes Card · Apple Pay · Google Pay': '处理 Card · Apple Pay · Google Pay',
    'use PayPal Advanced for Card. Note: PayPal Express wallet is paused for IG/FB compat.': '用 PayPal Advanced 收卡。注意:PayPal Express 钱包按钮因 IG/FB 兼容问题暂未上线。',
    'Connect now': '现在去连接', 'Apply for Airwallex': '申请 Airwallex',
    'Approval rate': '过单率', 'AOV': '客单价', 'Subscription retention': '订阅留存', 'Chargeback rate': '拒付率', 'GMV · 30d': 'GMV · 30 天', 'Recovered by routing': '路由救回',
    'multi-MID routing + cascade': '多 MID 路由 + 级联', 'post-purchase + order bumps': '购后追加 + 凑单', 'cycle-over-cycle': '逐周期', 'RDR + Ethoca + 3DS': 'RDR + Ethoca + 3DS', 'routed via BestCheckout': '经 BestCheckout 路由', 'cascade + recycle saves': '级联 + 回收救回',
    'Routing performance': '路由表现', 'AI recommendations': 'AI 建议', 'View all': '查看全部', 'Recent high-impact activity': '近期高价值动作', 'Approval %': '过单率', 'Recovered': '救回',
    'Cascade': '级联', 'Recycle': '回收', 'Routing': '路由', 'Churn': '挽留', 'RDR': 'RDR',
    '+1 save': '+1 救回', 'rule fired': '规则触发', 'retained': '已挽留', 'CB avoided': '避免拒付',
    'Blended approval': '综合过单率', 'Cascade saves · 30d': '级联救回 · 30 天', 'Recycle saves · 30d': '回收救回 · 30 天', 'Active MIDs': '活跃 MID', '1 backup': '1 个备用',
    'Gateways & MIDs': '网关 / MID', 'Add MID': '添加 MID', 'MID / gateway': 'MID / 网关', 'Processor': '处理器', 'Category': '类目', 'MTD / cap': '本月 / 上限', 'Approval': '过单率', 'DR · txn · CB': '折扣率 · 笔费 · 拒付费', 'Cards': '卡种', 'Status': '状态', 'no cap': '无上限',
    'Routing rules (ATRI)': '路由规则（ATRI）', 'New rule': '新建规则', 'Rule': '规则', 'Algorithm': '算法', 'Condition': '条件',
    'Cascade — soft-decline retry': '级联 — 软拒重试', 'Recycle — failed-rebill recovery': '回收 — 续费失败救回', 'Attempt': '尝试', 'Wait': '等待', 'Price': '价格',
    'Try 1': '第 1 次', 'Try 2–5': '第 2–5 次', 'Stop': '停止', 'Best MID by rule': '按规则选最优 MID', 'Next-best MID, never repeat': '次优 MID，不重复', 'Hard decline or 5 tries': '硬拒或满 5 次',
    'All': '全部', 'Trial': '试用', 'Active': '活跃', 'Cancelled': '已取消', 'Recycle failed': '回收失败', 'Backup': '备用', 'On': '开', 'Off': '关',
    'Customer': '客户', 'Product': '产品', 'Frequency': '频率', 'Cycle': '周期', 'Next bill': '下次扣款', 'Amount': '金额', 'Next MID': '下次 MID', 'Action': '操作', 'Manage': '管理',
    'Subscribe & Save profiles': 'Subscribe & Save 方案', 'Profile': '方案', 'Base product': '基础产品', 'Frequencies': '频率', 'Discount': '折扣', 'Subs': '订阅数',
    'Churn-saver — cancel workflow': '挽留 — 取消工作流',
    'The funnel': '转化漏斗', 'Checkout': '结账', 'Upsell': '追加', 'Downsell': '降级', 'Thank you': '致谢页', 'Order bump': '凑单',
    'Single-page · order bump': '单页 · 凑单', 'One-click, no re-enter card': '一键，无需重输卡', 'On decline of the upsell': '追加被拒时', 'Write order back to Shopify': '订单写回 Shopify',
    'Offers': '报价', 'New offer': '新建报价', 'Offer': '报价', 'Type': '类型', 'Trigger': '触发', 'Take rate': '接受率', 'Edit': '编辑',
    'Connected': '已连接', 'OK': '正常', 'Sync status': '同步状态', 'Disconnect': '断开连接', 'Entity': '实体', 'Direction': '方向', 'Synced': '已同步', 'Mapped': '已映射', 'Webhooks': 'Webhooks', 'Managed in Authorization': '在店铺授权中管理', 'Update permissions': '更新权限', 'Manage connection': '管理连接',
    'Retention — cycle by cycle': '留存 — 逐周期', 'Attempted': '尝试', 'Approvals': '通过', 'Recycle saves': '回收救回', 'Retention': '留存', 'Net': '净额',
    'Card processing — by BIN': '过单 — 按 BIN', 'BIN': 'BIN', 'Brand': '卡组织', 'Issuer': '发卡行', 'Rebill appr.': '续费过单', 'CB %': '拒付率', 'Overall': '综合',
    'Page types': '页面类型', 'Funnel': '漏斗', 'Settings': '设置', 'Save': '保存', 'Preview': '预览', 'Locked': '锁定',
    'Landing page': '落地页', 'Landing': '落地页', 'Survey': '调查', 'Generic page': '通用页', 'Generic': '通用页',
    'Step name': '步骤名称', 'Route on accept': '接受后跳转', 'Route on decline': '拒绝后跳转',
    'Drag a page type onto the funnel, or reorder steps by dragging. Checkout & Thank you are locked.': '把页面类型拖到漏斗里，或拖动步骤重新排序。结账与致谢页已锁定。',
    'Step added': '已添加步骤', 'Step removed': '已删除步骤', 'Saved': '已保存',
    'Add a page': '添加页面', 'Funnel flow': '漏斗流程', 'Back to funnel': '返回漏斗', 'Blocks': '区块', 'Add block': '添加区块', 'Block settings': '区块设置',
    'Block added': '已添加区块', 'Block removed': '已删除区块',
    'No blocks yet.': '暂无区块。', 'Select a block to edit it.': '选择一个区块进行编辑。', 'No editable settings for this block.': '该区块暂无可编辑设置。', 'Add blocks to design this page': '添加区块来设计此页面',
    'Click a page type to add it before Thank you, drag a step to reorder, then click Edit on any step to design its page. Checkout and Thank you can be edited but not removed.': '点击页面类型即可在「致谢页」前添加；拖动步骤可重新排序；点击任意步骤的「编辑」即可设计该页面。结账页与致谢页可编辑但不可删除。',
    'Headline': '标题', 'Text': '文本', 'Image': '图片', 'Button': '按钮', 'Yes / No buttons': '是 / 否按钮', 'Countdown timer': '倒计时', 'Reviews': '评价', 'Feature list': '功能列表', 'Hero': '主视觉', 'Logo': 'Logo', 'Contact': '联系方式', 'Shipping': '配送', 'Payment': '支付', 'Order summary': '订单摘要', 'Tracking': '物流追踪',
    'Subtitle': '副标题', 'Button label': '按钮文字', 'Product name': '产品名称', 'Compare-at (optional)': '原价（可选）', 'Label': '文字', 'Color': '颜色', 'Yes button': '“是”按钮', 'Decline link': '拒绝链接', 'Title': '标题', 'Add-on price': '加购价格', 'Minutes': '分钟', 'Brand text': '品牌文字', 'Section title': '区块标题',
    'Welcome to BestCheckout': '欢迎使用 BestCheckout',
    'Connect your Shopify store to start — your storefront stays on Shopify, orders write back.': '先连接你的 Shopify 店铺即可开始——店铺前台仍在 Shopify,订单自动回写。',
    'Connect your Shopify store': '连接你的 Shopify 店铺', 'Connect Shopify': '连接 Shopify', 'Connected to Shopify': '已连接 Shopify',
    'We never touch your Shopify storefront checkout. BestCheckout runs your funnel, subscriptions and post-purchase, then writes orders back to Shopify via API — no App Store review needed.': '我们不碰你 Shopify 店铺前台的原生结账。BestCheckout 负责漏斗、订阅与购后,再通过 API 把订单写回 Shopify——无需经过 App Store 审核。',
    'OAuth — auto-sync Shopify data, write orders back.': 'OAuth——自动同步 Shopify 数据,回写订单。', 'Add a payment MID': '接入支付 MID', 'Connect a gateway so routing can begin.': '连接一个网关,路由即可开始。',
    'Auto-sync products from Shopify': '从 Shopify 自动同步商品', 'Mirror your catalog (read-only) for funnels.': '镜像你的商品(只读)供漏斗使用。',
    'Build your first funnel': '搭建首个漏斗', 'Checkout + one-click upsell in the editor.': '在编辑器里做结账 + 一键追加。', 'Go live': '上线', 'Send traffic to your BestCheckout funnel.': '把流量导向你的 BestCheckout 漏斗。',
    '68% of your orders now run through BestCheckout': '你已有 68% 的订单跑在 BestCheckout', 'Bring your whole store onto BestShopio — your data is already here.': '把整个店铺也搬到 BestShopio——你的数据本就在这里。', 'See 1-click migration': '看看一键迁移',
    'Migrate to BestShopio': '迁移到 BestShopio', 'Back to overview': '返回总览',
    'Your data: zero migration': '你的数据:零搬迁', 'Products, discounts, shipping and customers sync automatically from Shopify; paid orders already write back. Nothing to move for the checkout MVP.': '商品、折扣、运费与客户从 Shopify 自动同步；已付款订单自动回写。结账 MVP 无需搬迁数据。',
    'Your storefront: one-click stand-up': '你的店铺前台:一键起底', 'We spin up a BestShopio storefront with the same visual builder, pre-filled with your catalog. Adjust the theme, no rebuild from scratch.': '用同一套可视化搭建引擎为你起一个 BestShopio 店铺前台,商品预填好。调主题即可,无需从零重做。',
    'Your domain: guided switch': '你的域名:向导式切换', 'A wizard repoints your domain with automatic SSL, with redirects in place. This is the only real cut-over moment.': '向导帮你把域名重新指向并自动签发 SSL,并做好重定向。这是唯一真正的切换时刻。',
    'Because you came in through BestCheckout, this is an unlock — not the cold Shopify-to-BestShopio migration. That is the moat a standalone checkout tool can never offer.': '因为你是从 BestCheckout 进来的,这一步是"解锁"而非 Shopify→BestShopio 的冷迁移。这正是独立结账工具永远给不了的护城河。',
    'Unlock the full platform': '解锁全平台', 'Full platform unlocked': '已解锁全平台',
    'Options': '选项', 'Analytics': '分析', 'Publish': '发布', 'Published': '已发布', 'Live site': '线上站点', 'Opening live site': '正在打开线上站点', 'A/B test': 'A/B 测试',
    'Funnel visualizer': '漏斗可视化', 'Page': '页面', 'Page name': '页面名称', 'Page type': '页面类型', 'Edit page': '编辑页面', 'Delete': '删除',
    'Click a page to select it; its Edit button opens the page builder. Click an arrow to set its routing (button, dynamic upsells, country, new vs repeat customer). Click a page type on the left to add a page; use the + on a page, then click another page, to connect them.': '点击页面即可选中；它的「编辑」按钮会打开页面搭建器。点击箭头可设置该连线的路由（触发按钮、动态追加、国家、新客 / 复购客户）。点击左侧的页面类型可添加页面；点页面上的 +，再点另一个页面，即可把两者连接起来。',
    'Connection routing': '连线路由', 'Buttons / Links of': '按钮 / 链接：', 'Dynamic Upsells': '动态追加',
    'Products / tags that navigate with this arrow (blank = all).': '随此箭头跳转的商品 / 标签（留空 = 全部）。', 'blank = all products': '留空 = 全部商品',
    'Add product…': '添加商品…', 'Add': '添加', 'Enter product tags': '输入商品标签',
    'Match all selected products and tags': '匹配所有所选商品与标签', 'Include products previously purchased': '包含此前已购商品',
    'Countries': '国家', 'Ship countries that navigate with this arrow (blank = all).': '随此箭头跳转的配送国家（留空 = 全部）。', 'Choose Country (blank = all)': '选择国家（留空 = 全部）',
    'Customers': '客户', 'All Customers': '全部客户', 'New Customers Only': '仅新客户', 'Repeat Customers Only': '仅复购客户', 'Delete connection': '删除连线',
    'New': '新客', 'Repeat': '复购', 'Click a target page to connect': '点击目标页面以连接', 'Already connected': '已存在连线', 'Connection added': '已添加连线', 'Connection removed': '已删除连线', 'Page added': '已添加页面', 'Page removed': '已删除页面',
    'Presell page': '预售页', 'Lead page': '引导页', 'Checkout page': '结账页', 'Upsell page': '追加页', 'Downsell page': '降级页', 'Thank you page': '致谢页',
    'Configure your new checkout': '配置你的新结账', 'Set up your store connection, domain and accounts — your storefront stays on Shopify, orders write back.': '配置店铺连接、域名与各项账户——店铺前台仍在 Shopify，订单自动回写。',
    'Choose checkout': '选择结账平台', 'Domain entry': '域名录入', 'Merchant account': '收单账户', 'PayPal account': 'PayPal 账户', 'Fulfillment': '履约',
    'Route your Shopify cart to BestCheckout for checkout': '将 Shopify 购物车路由到 BestCheckout 结账', 'Route your WooCommerce cart to BestCheckout': '将 WooCommerce 购物车路由到 BestCheckout', 'Route your BigCommerce cart to BestCheckout': '将 BigCommerce 购物车路由到 BestCheckout', 'Custom / API integration': '自定义 / API 接入',
    'Selected': '已选择', 'Choose': '选择', 'Store URL': '店铺 URL',
    'Shopify integration uses a private app in your store (OAuth + Admin API). Enter the API key and password below. No Shopify App Store listing or review is involved.': 'Shopify 接入使用你店铺里的私有应用（OAuth + Admin API）。在下方填入 API key 与密码。全程不涉及 Shopify App Store 上架或审核。',
    'Skip Product Sync': '跳过商品同步', 'Sync Products': '同步商品',
    'Funnel domain': '漏斗域名', 'Point a subdomain at BestCheckout; we issue and renew SSL automatically.': '把一个子域名指向 BestCheckout；我们自动签发并续期 SSL。',
    'Brand logo': '品牌 Logo', 'Drag a logo here, or click to upload (PNG / SVG)': '把 Logo 拖到这里，或点击上传（PNG / SVG）',
    'Gateway': '网关', 'Merchant ID (MID)': '收单号 (MID)', 'Add more MIDs later in Payment routing to enable multi-MID load balancing and cascade.': '稍后可在「支付路由」里添加更多 MID，启用多 MID 负载均衡与级联。',
    'PayPal email': 'PayPal 邮箱', 'Connect PayPal': '连接 PayPal', 'SMTP host': 'SMTP 主机', 'Port': '端口', 'Username': '用户名', 'Password': '密码',
    'Fulfillment provider': '履约服务商', 'Orders captured by BestCheckout route to fulfillment and write back to Shopify.': 'BestCheckout 捕获的订单进入履约，并回写到 Shopify。',
    'Back': '上一步', 'Continue': '下一步', 'Finish setup': '完成设置', 'Setup complete': '设置完成',
    // ---- Connection hub ----
    'Connection': '连接',
    'Checkout design': '结账页装修', 'Thank-you design': '致谢页装修', 'Open the theme builder': '打开装修器',
    // Checkout template gallery
    'Use this template': '使用此模板', 'Most popular': '最受欢迎',
    'Pick a proven, high-converting checkout — apply it in one click, then fine-tune everything in the shared theme builder.': '挑一套验证过的高转化结账,一键套用,再到共享 theme 装修器里逐项细调。',
    'More building blocks are on the way: specialist / doctor endorsement, photo-review wall, and a Trustpilot rating bar.': '更多区块陆续上线:专家/医生背书、照片墙评价、Trustpilot 评分条。',
    'Pack-size value ladder — buy more, save more': '套餐价梯——买得越多省得越多',
    'Advertorial funnel — express pay + value props': '广告漏斗——Express 支付 + 价值主张',
    'Clean single-column checkout': '极简单列结账',
    // Page subtitle ("xxx · External checkout on lavender-labs.myshopify.com · orders write back to Shopify")
    // Translated as separate text-node fragments (the inline <b>domain</b> splits the line).
    'External checkout on': '外置结账在',
    'orders write back to Shopify': '订单回写 Shopify',
    '· orders write back to Shopify': '· 订单回写 Shopify', // kept for legacy callers that still go through bcI18n
    // Funnel publish workflow
    'Publish changes': '发布改动',
    'Published': '已发布',
    'Countdown': '倒计时', 'Pack tiers': '套餐档位', 'Add-on': '加购', 'Guarantee': '退款保证',
    'Reserve timer': '预留倒计时', 'Value props': '价值主张', 'Trust row': '信任条',
    // Funnel + Pages (新 IA)
    'Funnel': '漏斗', 'Templates': '模板库', 'Pages': '页面', 'Manage reusable Checkout, Upsell, Downsell and Thank you page assets.': '管理可复用的结账、追加、降级和 Thank you 页面资产。', 'Theme settings': '主题设置', 'Create page': '新建页面', 'Build once, use it in multiple purchase flows': '一次装修，复用到多个购买流程', 'Editing a page does not affect live purchase flows. After you confirm the changes, publish the purchase flow for buyers to see the new version.': '编辑页面不会影响已上线的购买流程。确认无误后，在购买流程中点击“发布”，买家才会看到新版本。', 'All pages': '全部页面', 'Published version': '已发布版本', 'No published version': '尚未发布', 'Draft version': '草稿版本', 'Used in': '使用于', 'Source': '来源', 'System starter': '系统起始页', 'Saved page': '已保存页面', 'Completion rate': '完成率', 'Take rate': '接受率', 'Recovery rate': '挽回率', 'Next-step click rate': '下一步点击率', 'Not live': '未上线', 'Page name': '页面名称', 'Untitled page': '未命名页面', 'A draft page is created first. It will not affect any purchase flow until you choose it in the flow canvas and publish the flow.': '系统会先创建草稿页面；只有在购买流程画布中选用并发布流程后，才会影响买家。', 'Create and edit': '创建并装修', 'Draft page created': '草稿页面已创建', 'Page duplicated': '页面已复制', 'Total': '共', 'Showing': '显示', 'pages': '个页面', 'No pages in this view.': '当前筛选下没有页面。', 'Duplicate': '复制', 'Customize': '装修', 'Edit': '装修', 'System': '系统', 'Saved': '已保存', 'Template': '模板', 'Add one more item': '再加一件', 'Save 20%': '立省 20%', 'Special price': '优惠价', 'auto-pick winner': '自动判赢', 'leading': '领先', 'Delete': '删除', 'Template deleted': '模板已删除', 'Saved from the builder': '从装修器保存',
    'Collecting data — no winner yet': '数据收集中——暂无获胜方', 'Edit A': '装修 A', 'Edit B': '装修 B', 'Remove A/B': '移除 A/B',
    'Fit': '适应', 'Reset layout': '重置布局', 'Reset funnel': '重置漏斗', 'Tidy layout': '整理布局', 'Layout tidied': '已整理布局', 'YES': '接受', 'NO': '拒绝',
    'Add page': '加页面', 'Remove page': '移除页面', 'Page added': '已加页面', 'Page removed': '已移除页面', 'Click a node to branch from it · drag the title bar to move': '点选节点,新页面从它分支 · 拖标题栏可移动',
    'Add a page': '添加页面', 'Change template': '更换模板', 'Page type': '页面类型', 'Branches from': '分支自', 'Branch from': '从哪个节点接入', 'Apply': '应用', 'Change': '更换', 'Template changed': '模板已更换',
    '(Free — connect later with the drag handle)': '(不自动连接 — 稍后用蓝点手动拖)',
    'Connected': '已连接', 'Connection removed': '已移除连接', 'Click to remove this connection': '点击设置或删除这条连线', 'Page added — connect it with the ⌁ handle': '已加页面——拖动右侧蓝点连到目标节点',
    'Drag to another node to connect': '拖动到另一个节点以建立连接',
    'Mark as “Accepted” (YES)': '设为「接受」(YES)', 'Mark as “Declined” (NO)': '设为「拒绝」(NO)', 'Make it a traffic split': '设为流量分流', 'Remove connection': '删除连线',
    'Routing rule': '路由规则', 'Routing rules': '路由规则', 'Set as': '设为', 'Accepted': '接受', 'Declined': '拒绝', 'Added': '加入', 'Accept button': '接受按钮', 'Decline button': '拒绝按钮',
    /* Rule builder (Azoya-style) */
    'Configure routing rule…': '配置路由规则…',
    'Fallback (catch-all)': '兜底(其他都不匹配)', 'Fallback': '兜底',
    'This branch catches anything not matched by the siblings above.': '这条支线接收上面所有兄弟支线都没匹配到的流量。',
    'No extra conditions — this branch is purely the catch-all.': '没有额外条件——纯粹作为兜底接收所有未匹配流量。',
    'Traffic that no sibling branch matches goes here. The conditions below are still respected as a preference, but this branch always catches the unmatched.': '所有兄弟支线都未匹配到的流量走这里。下面的条件仍作为「偏好」生效——但这条支线总是兜住没匹配到的流量。',
    'Pick one branch as the fallback.': '请选一条支线作为兜底。',
    'Who is eligible (AND):': '谁有资格走这条(全部满足):',
    'Traffic share among the eligible:': '在符合条件的用户里,流量配比:', 'Traffic share of entered buyers:': '在进入该流程的买家中，流量配比:',
    'No user filters — anyone is eligible for this branch.': '无用户筛选——所有用户都符合资格。',
    'Add user filter': '添加用户筛选',
    'Set traffic weight': '设置流量配比',
    'Takes': '占',
    '% of the matched traffic': '% 的匹配流量',
    'Remove weight': '删除配比',
    'Add condition': '添加条件', 'Remove condition': '删除条件',
    'Select…': '请选择…', 'Add tag': '添加标签', 'min': '最小值', 'max': '最大值',
    'Only one branch can be the fallback.': '只能有一条支线作为兜底。',
    'Traffic %s on this fork must total 100': '本分叉的流量百分比之和必须等于 100', 'now': '当前',
    'Traffic %s for this segment must total 100': '同一分群的流量百分比之和必须等于 100',
    'Two branches share the same conditions — add or change one to differentiate.': '两条支线条件完全相同——给其中一条改/加条件以区分。',
    'Two branches share the same user filters with no traffic weight — add a filter or weight to differentiate.': '两条支线用户筛选完全相同且都没设流量配比——加筛选或加配比以区分。',
    'Some conditions are missing values.': '部分条件缺少取值。',
    'Routing rules updated': '路由规则已更新',
    'Click to edit the routing rules': '点击编辑路由规则',
    /* Field group labels */
    'Basic attributes': '基本属性', 'Behavior': '用户行为', 'Value': '用户价值',
    'Customer tags': '用户标签', 'Upstream actions': '上游动作', 'Traffic split': '流量分流',
    /* Field labels */
    'New vs returning': '新老客户', 'Customer tag': '客户标签',
    'Country': '常驻国家', 'Past orders': '历史订单数', 'Cart total': '当前购物车额',
    'Device': '设备', 'Upsell decision': 'Upsell 决定', 'Downsell decision': 'Downsell 决定',
    'Only applicable to edges leaving an Upsell node': '只适用于 Upsell 节点的出边',
    'Only applicable to edges leaving a Downsell node': '只适用于 Downsell 节点的出边',
    'Traffic %': '流量百分比',
    /* Operators */
    'is': '等于', 'is not': '不等于', 'is any of': '包含任一', 'is all of': '包含全部',
    'is none of': '都不包含', 'between': '区间', 'before': '早于', 'after': '晚于',
    'is true': '是', 'is false': '否',
    /* Enum values */
    'United States': '美国', 'Canada': '加拿大', 'United Kingdom': '英国', 'Australia': '澳大利亚',
    'China': '中国', 'Japan': '日本',
    'Mobile': '移动端', 'Desktop': '电脑',
    'Accepted (YES)': '已接受 (YES)', 'Declined (NO)': '已拒绝 (NO)', 'Added (YES)': '已加入 (YES)',
    'Traffic split (%)': '流量分流 (%)', 'Customer segment': '客户分群', 'New / Returning': '新客 / 老客',
    'Click to configure this connection': '点击配置此连线', 'Click to edit this rule': '点击编辑规则',
    'Match traffic by': '按此匹配流量', 'Customer type': '客户类型', '(unmapped)': '(未指定)', 'Segment routing updated': '分群路由已更新',
    'New customer': '新客', 'Returning customer': '老客',
    'Connection': '连线', 'Single path — add another branch from this node to use a routing rule.': '单路径——从此节点再连一条边才能使用路由规则。',
    'Everyone else (catch-all)': '其他人(兜底)', 'Others': '其他',
    'Two branches can’t both route to': '两条支线不能同时路由到', 'Only one branch can be the catch-all.': '只能有一条支线作为兜底。',
    'Add another branch from this node first — a split needs at least two paths.': '请先从此节点再连出一条边——分流至少需要两条路径。',
    'This page has only one template — open 装修, then “Save as template” to make variant B, and A/B-test it.': '这个页面只有一个模板——先进「装修」,用「另存为模板」存出变体 B,再来做 A/B。',
    'Shopify checkout': 'Shopify 原生结账', 'Control group — the rest of the cart stays on Shopify’s native checkout.': '对照组——其余购物车流量留在 Shopify 原生结账。', 'Split rules': '分流规则', 'Remove control group': '移除对照组',
    'Click to edit the traffic split': '点击编辑分流比例', 'Traffic split updated': '分流比例已更新', 'Total': '合计', 'must total 100%': '需合计 100%',
    'New A/B test': '新建 A/B 测试', 'Variant A (current)': '变体 A(当前)', 'Start A/B test': '开始 A/B 测试', 'A/B test started — collecting data': 'A/B 测试已开始 · 数据收集中', 'A/B test removed': 'A/B 测试已移除', 'Save another template for this page first, then A/B test it': '先给这个页面另存一个模板,再做 A/B',
    'Split by': '分流方式', 'Traffic %': '按流量', 'User type': '按用户类型', 'by user type': '按用户类型', 'New': '新用户', 'Returning': '老用户', 'no paid order yet': '尚无支付订单', '1+ paid order': '有支付订单', 'Read from the connected Shopify customer record.': '取自已连接的 Shopify 客户记录。',
    'Checkout': '结账', 'Thank-you': '致谢', 'Upsell': '追加', 'Downsell': '降级', 'Shopify store': 'Shopify 店铺', 'Manage connection': '管理连接', 'Traffic source — buyers enter the funnel here': '流量来源——买家从这里进入漏斗',
    'Cart source · order summary': '购物车来源 · 订单摘要', 'Confirmation · tracking · reviews': '订单确认 · 物流追踪 · 评价', 'Post-purchase one-click add': '购后一键加购', 'Lower-price save': '更低价挽回',
    'Cart checkout — clean & trusted': '购物车结账 · 干净可信赖', 'Cart + full funnel extras': '购物车 + 全套漏斗增强', 'Offer picker for paid-media traffic': 'Offer 选择器 · 买量流量', 'Confirmation + tracking + reviews': '订单确认 + 物流 + 评价', 'Post-purchase add in one click': '购后一键加购', 'Lower-price save offer': '更低价挽回 offer',
    'YES → Thank-you · NO → Downsell': 'YES → 致谢 · NO → 降级', '→ Thank-you': '→ 致谢',
    'Every page type has a template library — our system starters plus the versions you save. Open one to customize, then save it back as a new template. The Funnel and A/B tests both pull from here.': '每个页面类型都有自己的模板库——我们给的系统起步款 + 你自己保存的版本。点开装修,再另存为新模板。漏斗和 A/B 都从这里取模板。',
    'Your funnel as a canvas. Cart traffic splits at your Shopify store — part runs through the BestCheckout funnel, the rest stays on Shopify’s native checkout as the control. Branch any node with Add page or the ⌁ handle; drag to rearrange.': '把漏斗画成画布:购物车流量在 Shopify 店铺这里分流——一部分走 BestCheckout 漏斗,其余留在 Shopify 原生结账作对照。用「加页面」或 ⌁ 手柄从任意节点分支;拖动可排列。',
    'Add a 2nd template as variant B from the library': '去模板库选第二个模板作为变体 B',
    'Standard': '标准版', 'Recommended': '推荐', 'The BestVoy production checkout — clean & trusted': 'BestVoy 生产环境结账——干净、可信赖',
    'Express pay': 'Express 支付', 'Full address': '完整地址', '2 shipping rates': '两档运费', 'Card': '银行卡', 'Form': '表单', 'Rating': '评分',
    'Advertorial funnel — timer, insurance bump, specialist card': '广告漏斗——倒计时、运费险加购、专家背书', 'Insurance bump': '运费险加购', 'Specialist': '专家背书',
    'Conversion': '转化版', 'Single-page funnel': '单页漏斗', 'Coming soon': '即将推出', 'Offer picker': '档位选择器', 'No cart summary': '无购物车摘要',
    'BestVoy production checkout — cart source, clean & trusted': 'BestVoy 生产结账——购物车来源,干净可信赖',
    'Cart checkout + full funnel: timer, insurance bump, specialist, reviews': '购物车结账 + 全套漏斗:倒计时、运费险、专家背书、评价',
    'Offer / Bundle picker for paid-media (AppLovin) landing-page traffic': 'Offer/Bundle 选择器,服务买量(AppLovin)落地页流量',
    'Checkout source = Cart (1.0): cart line items show in the order summary. Pick a proven layout, apply in one click, then fine-tune in the shared theme builder.': '结账数据来源 = 购物车(1.0):购物车行项进订单摘要。挑一套验证过的版式,一键套用,再到共享装修器细调。',
    'Single-page funnel (Offer source) is the paid-media landing-page line — P1. Post-purchase one-click upsell is already built into the Thank-you page.': '单页漏斗(Offer 来源)= 买量落地页那条线,P1。购后一键加购已并入致谢页。',
    // A/B tests
    'A/B tests': 'A/B 测试',
    'Split traffic across checkout variants, see what converts, and roll out the winner. Your Checkout templates double as variants.': '把流量拆给不同结账变体,看哪个转化更高,再全量上线获胜方。你的结账模板可直接当变体。',
    'New experiment': '新建实验', 'Goal': '目标', 'days': '天', 'sessions': '次访问', 'not started': '未开始',
    'Uplift': '提升', 'Confidence': '置信度', 'Draft': '草稿', 'Running': '进行中', 'Completed': '已结束',
    'Sessions': '访问量', 'Average order value': '客单价', 'Upsell accept rate': 'Upsell 接受率', 'Checkout conversion rate': '结账转化率', 'Revenue / visitor': '访客均收入',
    'Winner': '获胜', 'Leading variant': '领先变体', 'No clear leader yet': '暂无明显领先', 'Variant': '变体', 'uplift': '提升', 'Statistical confidence': '统计置信度',
    'End test & roll out winner': '结束并全量上线获胜方', 'Adjust traffic split': '调整流量分配', 'Winner rolled out to 100%': '获胜方已全量上线', 'Launch experiment': '启动实验', 'All experiments': '全部实验', 'Started': '开始于',
    'This experiment is a draft — launch it to start splitting traffic and collecting data.': '这是草稿实验——启动后才会开始分流并收集数据。',
    'Winner rolled out': '获胜方已上线', 'Experiment launched': '实验已启动', 'Traffic split — coming soon': '流量分配——即将上线',
    'New A/B experiment': '新建 A/B 实验', 'Experiment name': '实验名称', 'e.g. Checkout template test': '例如:结账模板对比', 'Test page': '测试页面', 'Variant A': '变体 A', 'Variant B': '变体 B', 'Traffic split': '流量分配', 'Primary goal': '主指标', 'Cancel': '取消', 'Current checkout design': '当前结账设计', 'Untitled experiment': '未命名实验',
    'Checkout template — Pack & Save vs Express Funnel': '结账模板 — Pack & Save vs Express Funnel', 'Guarantee — 90-day vs 120-day': '退款保证 — 90 天 vs 120 天', 'Urgency bar — on vs off': '倒计时条 — 开 vs 关',
    '90-day guarantee': '90 天保证', '120-day guarantee': '120 天保证', 'With countdown': '有倒计时', 'No countdown': '无倒计时',
    'Edit on the shared store theme builder — the same system as your storefront theme. Checkout & Thank-you are pages in it.': '在共享的店铺 theme 装修器里编辑——和店铺前台主题同一套体系。结账页与致谢页都是其中的页面。',
    'Mode': '模式', 'connected since': '连接于', 'last activity': '上次活动', 'last received': '上次接收',
    'Authorization': '店铺授权', 'Data auto-sync': '数据自动同步', 'Checkout injection': '结账注入', 'Checkout domain': '结账域名', 'Webhooks': 'Webhooks', 'App Embed': 'App Embed', 'Domain': '域名',
    'Installed via a private app (OAuth + Admin API) — no Shopify App Store listing or review. These are the permissions you granted at install:': '通过私有应用安装（OAuth + Admin API）——不上 Shopify App Store、不走审核。你在安装时授予了以下权限：',
    'Auto-sync products, variants & collections from Shopify': '从 Shopify 自动同步商品、变体与集合', 'Write paid orders back to Shopify to trigger fulfillment': '把已付款订单写回 Shopify 以触发履约',
    'Read inventory — Shopify stays source of truth': '读取库存——库存以 Shopify 为准', 'Auto-sync discounts from Shopify': '从 Shopify 自动同步促销',
    'Auto-sync shipping zones & rates from Shopify': '从 Shopify 自动同步运费区与费率', 'Auto-sync customers from Shopify': '从 Shopify 自动同步客户',
    'Re-authorize': '重新授权',
    'Update permissions': '更新权限', 'Update permissions on Shopify': '在 Shopify 上更新权限',
    'Re-opens the Shopify OAuth consent screen to refresh the access token and scopes. Your store stays connected — nothing is removed.': '重新打开 Shopify OAuth 授权页,刷新访问令牌与权限范围。店铺保持连接——不会移除任何东西。',
    'Opens the Shopify OAuth consent screen so the merchant can grant the updated scopes. The store stays connected; nothing is removed.': '打开 Shopify OAuth 授权页，让商家授予更新后的权限范围。店铺保持连接，不会移除任何内容。',
    'Shopify auto-sync · products, collections, discounts, shipping': 'Shopify 自动同步 · 商品、商品系列、折扣、运费', 'Write paid orders back to Shopify': '已付款订单写回 Shopify', 'Read customers (for the New vs Returning A/B)': '读取客户(用于 新客/老客 A/B)',
    'Re-authorize on Shopify': '在 Shopify 上重新授权', 'Update on Shopify': '在 Shopify 上更新', 'Permissions updated · scopes re-granted': '权限已更新 · 范围已重新授予', 'Token refreshed · scopes re-granted': '令牌已刷新 · 权限已重新授予',
    'Deep-links to Online Store → Themes → Customize → App embeds. Turn the BestCheckout embed on — it intercepts the cart “Checkout” button without editing theme code.': '深链到 网上商店 → 模板 → 自定义 → App 嵌入。打开 BestCheckout 嵌入即可拦截购物车「结账」按钮,无需改主题代码。',
    'Enabled': '已启用', 'Open Shopify': '打开 Shopify', 'Opening Shopify theme editor…': '正在打开 Shopify 主题编辑器……',
    'Shopify auto-sync · orders write back': 'Shopify 自动同步 · 订单回写',
    'Products, collections, discounts, shipping and customers sync automatically from Shopify. BestCheckout uses them for checkout, while paid orders write back to Shopify for fulfillment.': '商品、集合、促销、运费与客户从 Shopify 自动同步。BestCheckout 用这些数据完成结账，已付款订单再回写 Shopify 触发履约。',
    'Source of truth': '数据真源', 'Items': '条目', 'Last activity': '上次活动',
    'Fulfillment apps decrement stock on Shopify, so Shopify stays the source of truth.': '已装的发货 App 在 Shopify 侧扣减库存，故库存以 Shopify 为准。',
    'Paid BestCheckout orders write back to Shopify and trigger the installed fulfillment app.': 'BestCheckout 的已付款订单写回 Shopify，触发商家已装的发货 App。',
    'A one-line App Embed block in your live theme adds a "Checkout" interceptor — no theme code edits, survives theme updates.': '在当前主题里启用一个 App Embed 区块即可拦截「结账」——不改主题代码，主题更新也不会被覆盖。',
    'Live theme': '当前主题', 'last seen': '上次检测', 'Intercepts': '拦截位置', 'Enabled': '已启用',
    'Open in Shopify theme editor': '在 Shopify 主题编辑器中打开', 'split': '分流',
    'Send a slice of carts to BestCheckout; keep the rest on Shopify as a control. Ramp up as approval & AOV prove out.': '先把一部分购物车导向 BestCheckout，其余留在 Shopify 作为对照。过单率与客单价跑赢后再逐步放量。',
    'Edit routing rules': '编辑分流规则',
    'Your branded checkout lives on this subdomain. Point one CNAME at us and we issue & renew SSL automatically.': '你的品牌化结账跑在这个子域名上。把一条 CNAME 指向我们，SSL 自动签发与续期。',
    'Type': '类型', 'Host': '主机记录', 'Value': '记录值', 'Copy': '复制',
    'Auto-sync retry queued': '已排入自动同步重试', 'Automatic sync retry is queued. No action is needed.': '自动同步重试已排队，无需操作。', 'Demo: disconnect confirmation': '演示：断开连接确认',
    'Needs attention': '需要处理', 'Review issues': '查看问题', '5 areas need attention': '5 个区域需要处理', '4 areas need attention': '4 个区域需要处理',
    'Checkout is still available, but a few Shopify bridge checks need a quick fix before you ramp traffic.': '结账仍可用，但在放量前有几项 Shopify 接入检查需要快速修复。',
    'authorized': '已授权', 'Authorization active': '授权正常', 'BestCheckout was authorized during setup. No merchant action is needed unless the app is uninstalled or Shopify reports missing permissions.': 'BestCheckout 已在首次设置时完成授权。除非应用被卸载或 Shopify 报告权限缺失，否则商家无需操作。',
    'scopes need update': '权限需更新', 'Permission update needed': '需要更新权限', 'BestCheckout needs updated Shopify permissions for order write-back. Automatic sync continues, but write-back can fail until you re-authorize.': 'BestCheckout 需要更新 Shopify 权限以完成订单回写。自动同步会继续，但更新前订单回写可能失败。',
    'This stops BestCheckout routing, Shopify data auto-sync, webhooks, and order write-back. Your Shopify native checkout stays available, and you will need to re-authorize to reconnect.': '这会停止 BestCheckout 路由、Shopify 数据自动同步、Webhooks 和订单回写。你的 Shopify 原生结账仍可用；重新连接时需要再次授权。',
    'expires soon': '需要更新', 'Authorization expires in 3 days': '需要更新权限',
    'Shopify is asking for a fresh OAuth grant. Automatic sync continues for now, but order write-back can stop if this is ignored.': 'Shopify 需要重新 OAuth 授权。自动同步目前仍在继续，但如果忽略，订单回写可能停止。',
    'Review scopes': '查看权限', 'in sync': '正常', 'failed': '失败', 'pending': '待处理', 'Sync messages': '同步提示',
    'Automatic sync failed. We will keep retrying on schedule; you can retry now.': '自动同步失败。系统会按计划继续重试；你也可以现在重试。',
    'Automatic sync is queued. No action is needed.': '自动同步排队中，无需操作。',
    'Retry auto-sync': '重试自动同步',
    'Webhook delivery': 'Webhook 投递', 'Delivery issues': '投递问题', 'Callback signature failed after the OAuth token refresh window.': 'OAuth 令牌刷新窗口后回调签名校验失败。', 'Callback signature failed after webhook secret rotation.': 'Webhook secret 轮换后回调签名校验失败。',
    'Retry webhook': '重试 Webhook', 'not detected': '未检测到', 'Check again': '重新检测',
    'BestCheckout is enabled here, but the App Embed is not detected on the published Shopify theme.': '这里已启用 BestCheckout，但在已发布的 Shopify 主题中未检测到 App Embed。',
    'pending DNS': 'DNS 待生效', 'DNS not verified': 'DNS 未验证', 'DNS verified': 'DNS 已验证', 'CNAME is not resolving yet. Buyers stay on Shopify checkout until this domain is verified.': 'CNAME 尚未解析成功。该域名验证前，买家会继续留在 Shopify 结账。',
    'Verify DNS': '验证 DNS', 'DNS verified. Buyers can now use this checkout domain.': 'DNS 已验证，买家现在可以使用这个结账域名。', 'Auto-sync retry queued': '已排入自动同步重试', 'Automatic sync retry is queued. No action is needed.': '自动同步重试已排队，无需操作。', 'Webhook retry queued': 'Webhook 重试已排队', 'Waiting for Shopify to redeliver this webhook.': '等待 Shopify 重新投递该 Webhook。',
    'Theme check queued': '主题检测已排队', 'DNS verification queued': 'DNS 验证已排队',
    'Demo: re-opens the Shopify OAuth consent screen': '演示：重新打开 Shopify OAuth 授权页',
    'Demo: deep-links to Online Store → Themes → Customize → App embeds': '演示：深链到 Online Store → Themes → Customize → App embeds',
    'Demo: opens the A/B routing-rule builder': '演示：打开 A/B 分流规则编辑器', 'Copied': '已复制',
    // ---- Overview onboarding / migrate ----
    'Connect your store, sell through your new checkout, and move into BestShopio at your own pace.': '连接店铺、用新结账卖货，再按你自己的节奏搬进 BestShopio。',
    'Your activation path': '你的上手路径', 'Done': '完成', 'Start': '开始',
    'Auto-synced from Shopify': '已从 Shopify 自动同步', 'products': '个商品', 'discounts': '条促销', 'shipping rates': '条运费',
    'Connect Shopify & sync your data': '连接 Shopify 并同步数据', 'OAuth in one click; products, discounts, shipping and customers sync automatically from Shopify.': '一键 OAuth；商品、促销、运费与客户会从 Shopify 自动同步。',
    'Connect your payment accounts': '连接你的收款账户', 'Reuse your Airwallex / Stripe / PayPal.': '复用你的 Airwallex / Stripe / PayPal。',
    'Set your checkout domain': '设置结账域名', 'Point checkout.yourbrand.com at BestCheckout — auto-SSL.': '把 checkout.yourbrand.com 指向 BestCheckout——自动 SSL。',
    'Turn on checkout injection': '开启结账注入', 'Enable the App Embed and start with a small A/B split.': '启用 App Embed，先用小比例 A/B 起步。',
    'Build your first funnel': '搭建首个漏斗', 'Design checkout + one-click upsell in the editor.': '在编辑器里做结账 + 一键追加。',
    'Go live': '上线', 'Ramp up traffic; orders write back to Shopify.': '逐步放量；订单自动写回 Shopify。',
    'Ready to make BestShopio your store?': '准备好把 BestShopio 变成你的正式店铺了吗？',
    'Pre-flight: your data is already in BestShopio': '迁移前检查：你的数据已在 BestShopio',
    'Switch the main domain': '切换主域名', 'Stand up the storefront': '一键起店面',
    'This is the one real cut-over — repoint your main domain from Shopify to BestShopio.': '这是唯一真正的切换——把主域名从 Shopify 重新指向 BestShopio。',
    'Your data is already here': '数据本就在这里',
    'Products, discounts, shipping and customers sync automatically from Shopify. Paid BestCheckout orders are already here and write back to Shopify.': '商品、促销、运费与客户从 Shopify 自动同步。BestCheckout 已付款订单已在这里，并会回写 Shopify。',
    'Stand up your storefront': '起一个店面',
    'Spin up a BestShopio storefront with the same visual builder, pre-filled with your catalog. Adjust the theme — no rebuild.': '用同一套可视化搭建器起一个 BestShopio 店面，商品预填好。调主题即可——无需重做。',
    'Switch your main domain': '切换主域名',
    'Repoint your main domain (now on Shopify) to BestShopio, with automatic SSL. This is the one real cut-over.': '把主域名（现在 Shopify 上）重新指向 BestShopio，自动 SSL。这是唯一真正的切换。',
    'Demo: spins up a BestShopio storefront from your synced catalog': '演示：用你已自动同步的目录起一个 BestShopio 店面',
    // ---- Shopify OAuth consent (the "this is Shopify's page" step) ----
    'Continue to Shopify': '前往 Shopify 授权',
    'Install BestCheckout?': '安装 BestCheckout？', 'by Bestfulfill': '由 Bestfulfill 提供',
    'BestCheckout will be able to:': 'BestCheckout 将可以：',
    'Products & collections': '商品与商品系列', 'View products, collections and inventory': '查看商品、商品系列与库存',
    'Orders': '订单', 'View and create orders — write paid orders back for fulfillment': '查看与创建订单——把已付款订单回写以触发发货',
    'Discounts': '折扣', 'View discounts and price rules': '查看折扣与价格规则',
    'Shipping': '配送', 'View shipping zones and rates': '查看配送区域与运费',
    'Customers': '客户', 'View customers': '查看客户',
    'This is a custom (private) app installed via a one-time link — it is not listed on the Shopify App Store. By clicking Install, you grant the access above; you can uninstall anytime from Settings → Apps.': '这是通过一次性链接安装的自定义（私有）应用——未在 Shopify App Store 上架。点击「安装」即授予以上权限；你可随时在 设置 → 应用 中卸载。',
    'Install app': '安装应用',
    // ---- init flow: store / auto-sync / connected steps ----
    'BestCheckout installs as a private app via OAuth — no App Store listing, no review. We auto-sync products, discounts, shipping and customers from Shopify, and write paid orders back to Shopify.': 'BestCheckout 通过 OAuth 以私有应用方式安装——不上架、不审核。系统会从 Shopify 自动同步商品、折扣、运费与客户，并把已付款订单回写到 Shopify。',
    'Your Shopify store URL': '你的 Shopify 店铺网址', 'soon': '即将上线',
    'Connecting to': '正在连接', 'Syncing your catalog and registering webhooks — this usually takes a few seconds.': '正在自动同步你的目录并注册 webhooks——通常只需几秒。',
    'Access granted (OAuth)': '已授权（OAuth）', 'Syncing products': '同步商品', 'Syncing collections': '同步商品系列', 'Syncing discounts': '同步折扣', 'Syncing shipping rates': '同步运费', 'Registering webhooks': '注册 webhooks', 'Building the catalog mapping': '建立目录映射',
    'You’re connected!': '连接成功！',
    'Your Shopify catalog is now synced into BestShopio. BestCheckout uses it for checkout, while paid orders write back automatically.': '你的 Shopify 目录已自动同步到 BestShopio。BestCheckout 用它完成结账，已付款订单会自动回写。',
    'collections': '个商品系列',
    'Next: connect payments · set your checkout domain · turn on checkout injection · build your first funnel.': '接下来：接入收款 · 设置结账域名 · 开启结账注入 · 搭建首个漏斗。',
    'Enter BestCheckout': '进入 BestCheckout',
    // ---- Overview (MVP, checkout/upsell focus) ----
    'Checkout conversion': '结账转化率', 'Upsell take rate': 'Upsell 接受率', 'Orders · 30d': '订单 · 30 天',
    'fast single-page checkout': '极速单页结账', 'post-purchase upsell + order bumps': '购后追加 + 凑单', 'one-click, no re-enter card': '一键，无需重输卡', 'captured, written back to Shopify': '已捕获并回写 Shopify', 'through BestCheckout': '经 BestCheckout', '3DS on high-risk orders': '高风险订单走 3DS',
    'Checkout performance': '结账表现', 'Checkout conversion & orders captured — last 30 days.': '结账转化率与订单量 — 近 30 天。',
    // AI recommendations (whole-phrase keys so the fragment "Add" isn't half-translated)
    'Add a free-shipping order bump on the checkout page': '在结账页加一个「免邮」凑单',
    'Add a downsell after the “Sleep Bundle” upsell': '在「Sleep Bundle」追加之后加一个降级 offer',
    'Default repeat customers to Subscribe & Save 15%': '老客默认勾选「订阅省 15%」',
    'Collapse the checkout to a single step': '把结账并成单步',
    'Est. AOV +$3.10 / order': '预计客单价 +$3.10 / 单', 'Est. +9.8% recovered on upsell declines': '预计在拒绝追加时多挽回 9.8%', 'Est. subscription rate +6 pts': '预计订阅渗透 +6 个百分点', 'Est. conversion +2.4 pts': '预计转化 +2.4 个百分点',
    // Activity feed
    'Subscription': '订阅', 'paid': '已付款', 'recurring': '周期续费',
    'accepted — Calm Tea added at 15% off': '已接受——以 85 折加购 Calm Tea',
    'free-shipping protection added at checkout': '结账时加购了免邮保障',
    'Magnesium 30ct accepted after the upsell decline': '拒绝追加后接受了 Magnesium 30 粒装',
    'order completed, written back to Shopify (#1042)': '订单完成，已回写 Shopify（#1042）',
    'new Daily Greens monthly started from the checkout': '从结账页发起了 Daily Greens 月度订阅',
  };
  Object.assign(ZH, {
    'BestCheckout installs the App Embed automatically. If it is removed during a theme change, reinstall it here to restore checkout interception.': 'BestCheckout 默认自动注入 App Embed。如果主题变更时被移除，可以在这里重新安装，恢复结账拦截。',
    'Restore App Embed': '重新安装 App Embed',
    'Checkout intercept installed': '结账拦截已安装',
    'App Embed is installed automatically; restore it here if it is removed': 'App Embed 默认自动安装；如果被移除，可在这里恢复。',
    'View App Embed': '查看 App Embed',
    'detected': '已检测到',
    'The App Embed was not detected on the live Shopify theme. It may have been removed during a theme change; reinstall it to restore checkout interception.': '当前发布主题中未检测到 App Embed，可能是在主题变更时被移除。重新安装后即可恢复结账拦截。',
    'App Embed reinstalled and detected.': 'App Embed 已重新安装并检测成功。',
    'CNAME still is not resolving. Check the host and target, then verify again.': 'CNAME 仍未解析成功。请检查主机记录和目标值，然后再次验证。',
    'DNS verification failed. Check the DNS record, then verify again.': 'DNS 验证失败。请检查 DNS 记录后再次验证。'
    , 'You have unsaved changes': '你有未保存的改动'
    , 'Discard': '放弃'
    , 'Changes discarded': '已放弃改动'
  });
  Object.assign(ZH, {
    'Purchase flows': '购买流程', 'Back to purchase flows': '返回购买流程', 'Create purchase flow': '新建购买流程', 'Status': '状态',
    'All': '全部', 'Live': '已启用', 'Draft': '草稿', 'Paused': '已暂停', 'Priority': '优先级', 'Manage priorities': '管理优先级', 'Save priorities': '保存优先级', 'Priorities saved': '优先级已保存',
    'Higher numbers are checked first. Each purchase flow needs a unique priority.': '数值越大，系统越先检查；每条购买流程的优先级必须唯一。', 'Higher numbers are checked first. You can change this later.': '数值越大，系统越先检查；创建后仍可随时调整。', 'Choose an unused priority greater than 0.': '请输入大于 0 且未被占用的优先级。', 'Priority must be a positive whole number.': '优先级必须是大于 0 的整数。', 'Each purchase flow needs a unique priority.': '每条购买流程的优先级必须唯一。',
    'checkout': '结账页面', 'upsell': '加购页', 'downsell': '降购页', 'Upsell page': 'Upsell 页面', 'Downsell page': 'Downsell 页面', 'No Upsell or Downsell': '不含 Upsell 或 Downsell 页面', 'offers': '优惠页面', 'No offers': '不含优惠页面',
    'Thank you page': 'Thank you 页面', 'Open': '打开', 'purchase flows': '条购买流程', 'per page': '条/页',
    'of checkout traffic': '占结账流量', 'conversion': '转化率', 'average order value': '平均客单价',
    'First-order boost': '首单加购流程', 'Returning customer offer': '复购客户优惠', 'Smooth checkout': '顺畅结账', 'Give new customers a relevant one-click add-on after checkout.': '为新客户在完成结账后展示相关的一键加购。', 'Offer returning customers a lower-priced alternative if they decline the Upsell.': '复购客户拒绝 Upsell 后，继续展示更易接受的低价替代方案。', 'A focused checkout for all other shoppers, followed by the Thank you page.': '为其他买家提供简洁结账，完成后直接进入 Thank you 页面。',
    'First-time shoppers': '首次购买的买家', 'Returning shoppers': '复购买家', 'All remaining shoppers': '其余所有买家', 'All shoppers': '所有买家', 'Buyers not matched by higher-priority purchase flows': '未被更高优先级购买流程命中的买家',
    'New customers': '新客户', 'Returning customers': '复购客户', 'All other shoppers': '其他所有买家',
    'Today, 10:42': '今天 10:42', 'Saved today': '今天已保存', 'Yesterday': '昨天', 'Just now': '刚刚',
    'Flow name': '购买流程名称', 'Show to': '展示给', 'Show this flow to': '流程展示给谁', 'All eligible shoppers': '所有符合条件的买家',
    'New purchase flow': '新购买流程', 'You can add checkout pages, offers, and Thank you pages after creating the flow.': '创建后可继续添加结账页面、优惠页面和 Thank you 页面。',
    'Create a purchase flow': '新建购买流程', 'Choose the business result first. We will prepare a starter flow for you.': '先选择你希望提升的结果，我们会为你准备可继续编辑的起始流程。',
    'Choose a goal': '选择目标', 'Name and audience': '名称和展示人群', 'What would you like this purchase flow to improve?': '你希望这条购买流程优先提升什么？',
    'Increase average order value': '提升客单价', 'Show a relevant offer after payment.': '买家完成付款后展示一项相关加购。', 'Checkout → Upsell → Thank you': '结账页面 → 加购页 → Thank you 页面',
    'Recommended': '推荐', 'Recover declined offers': '挽回被拒绝的优惠', 'Offer a lower-priced alternative when the first offer is declined.': '首个优惠被拒绝后，继续提供更易接受的替代优惠。', 'Checkout → Upsell → Downsell → Thank you': '结账页面 → 加购页 → 降级页 → Thank you 页面',
    'Improve checkout completion': '提升结账完成率', 'Start with a focused checkout and add offers later.': '先完成简洁顺畅的结账，后续再按需添加优惠。', 'Checkout → Thank you': '结账页面 → Thank you 页面',
    'Nothing goes live when you create it': '创建后不会立即对买家生效', 'A draft is created with Shopify Checkout as the safety route. You choose traffic only when you publish.': '系统会先创建草稿，并保留 Shopify Checkout 作为安全兜底；发布时再决定要接入的流量。', 'A draft is created with Shopify Checkout as the safety route. Set the buyer entry from the flow after creating it.': '系统会先创建草稿，并保留 Shopify Checkout 作为安全兜底；创建后可在漏斗中配置买家入口。',
    'Continue': '继续', 'Back': '返回', 'Create flow': '创建流程', 'Starter flow': '起始流程', 'You can update the entry rule and add pages or offers after creating the flow.': '创建后，你仍可修改入口规则，并添加页面或优惠。',
    'Order value booster': '订单加购流程', 'Second-chance offer': '二次优惠流程', 'Close': '关闭'
  });
  Object.assign(ZH, {
    'Storefront': '店铺前台', 'Shopify control': 'Shopify 对照组', 'Safety fallback': '安全兜底', 'System fallback': '系统兜底', 'System': '系统', 'Required': '必选', 'Optional': '可选', 'Purchase flow': '购买流程',
    'Buyer entry': '买家入口', 'Who sees this purchase flow?': '哪些买家会看到这条购买流程？', 'All matching buyers enter this flow. Other buyers continue to Shopify Checkout.': '符合条件的买家会进入这条购买流程；其余买家继续进入 Shopify Checkout。',
    'Eligible shoppers': '符合条件的买家', 'Fallback': '兜底路径', 'Configure entry': '配置入口', 'Configure buyer entry': '配置买家入口', 'Who can enter this purchase flow?': '哪些买家可以进入这条购买流程？', 'This setting decides which buyers enter the flow. After they enter, the journey map only controls page routing and traffic allocation.': '此设置决定哪些买家进入流程；进入后，购买路径图只负责页面分流和流量分配。', 'Buyer group': '买家人群', 'Buyer entry saved': '买家入口已保存', 'Traffic allocation': '流量分配', 'How buyers enter this flow': '买家如何进入这条流程',
    'Customer type': '客户类型', 'New customer': '新客户', 'Returning customer': '复购客户', 'Customer tags': '客户标签', 'Past orders': '历史订单数', 'Customer lifetime spend': '客户累计消费', 'Last order': '最近一次下单', 'is at least': '至少为', 'is at most': '至多为', 'equals': '等于', 'is within the last': '最近', 'was more than': '距今超过', 'orders': '单', 'days': '天', 'Type a tag and press Enter': '输入标签后按 Enter 添加', 'Add user attribute': '添加用户属性', 'Add user attributes to target a specific group. Every condition must match before a buyer enters this flow.': '使用用户属性圈定人群；买家必须同时满足所有条件，才会进入这条购买流程。', 'Customer attributes apply only to recognized Shopify customers. Buyers who are not recognized or do not match continue to Shopify Checkout.': '客户标签、历史订单数、累计消费和最近一次下单仅适用于已识别的 Shopify 客户；未识别或不符合条件的买家会进入 Shopify Checkout。', 'Complete or remove every user attribute before applying.': '请补全或删除每一条用户属性条件后再应用。', 'No user attributes added. All buyers can enter this flow.': '尚未添加用户属性，所有买家都可以进入这条流程。',
    'Set the eligible audience and keep Shopify Checkout as a safe fallback.': '设置符合条件的买家，并保留 Shopify Checkout 作为安全兜底。', 'How entered buyers are distributed': '进入该流程的买家如何分流', 'Route buyers who enter this flow across checkout paths, and keep Shopify Checkout as a safe fallback.': '将进入该流程的买家分配到不同的结账路径，并保留 Shopify Checkout 作为安全兜底。', 'of entered traffic': '的进入流量', 'Remaining entered traffic': '其余进入流量', 'All entered traffic': '全部进入流量', 'Buyer eligibility is set in Buyer entry. This screen only allocates buyers who already entered the flow.': '买家资格由“买家入口”统一设置；此处只分配已经进入流程的买家。', 'Configure traffic': '配置流量', 'No traffic rule yet': '暂未设置流量规则',
    'Pages and offers': '页面和优惠', 'Purchase journey': '购买路径', 'Configure pages in order, then use the canvas only for advanced branching and routing.': '按顺序配置页面；只有需要高级分支和路由时才使用画布。', 'Arrange pages and offers directly on the journey map. Add a page when you want to extend the flow.': '直接在购买路径图中编排页面和优惠；需要扩展流程时再添加页面。',
    'Buyers and routing': '买家与路由', 'Set who enters this flow and its priority. Buyers who do not match always continue to Shopify Checkout.': '设置进入该流程的买家和优先级；不符合条件的买家会继续进入 Shopify 原生结账。', 'Configure the core path first, then add optional offers only when they support this flow’s goal.': '先配置核心购买路径；只有当优惠能帮助实现该流程目标时，再添加可选优惠。', 'This funnel path was selected when the purchase flow was created. Configure its pages and offers here.': '漏斗路径在创建购买流程时确定；请在此配置页面与优惠。',
    'Matching shoppers begin here.': '符合条件的买家从这里开始。', 'Matching shoppers enter the BestCheckout journey.': '符合条件的买家进入 BestCheckout 购买路径。', 'Unmatched shoppers continue to Shopify Checkout.': '未命中的买家将继续使用 Shopify 原生结账。', 'Always enabled. This route cannot be edited or removed.': '始终启用，不能编辑或删除。',
    'Open canvas editor': '打开画布编辑器', 'Back to journey': '返回购买路径', 'Start': '开始', 'Eligible carts start here.': '符合条件的购物车从这里进入。',
    'Step 1': '第 1 步', 'Checkout page': '结账页面', 'Collect payment and confirm the order.': '收集付款信息并确认订单。', 'Add a Checkout page': '添加结账页面',
    'After payment': '付款后', 'Optional one-click offer after payment.': '付款后可选的一键加购优惠。', 'One-click offer after payment.': '付款后展示的一键加购。', 'Add an Upsell page': '添加 Upsell 页面',
    'If declined': '被拒绝时', 'Optional lower-priced alternative.': '可选的低价替代优惠。', 'Alternative shown after an Upsell is declined.': '拒绝 Upsell 后展示的替代优惠。', 'Add a Downsell page': '添加 Downsell 页面',
    'Finish': '完成', 'Thank you page': 'Thank you 页面', 'Confirm the order and guide the next action.': '确认订单并引导买家完成下一步。', 'Add a Thank you page': '添加 Thank you 页面',
    'Add offer': '添加优惠', 'No page yet': '暂未添加页面', 'No Upsell added yet': '暂未添加 Upsell', 'Edit design': '装修页面', 'Configure offer': '配置优惠', 'Offer saved': '优惠已保存',
    'Checkout and Thank you pages are required.': '结账页面和 Thank you 页面为必选页面。', 'An Upsell is already in this journey.': '该购买路径中已有 Upsell。', 'A Downsell is already in this journey.': '该购买路径中已有 Downsell。', 'Add an Upsell before adding a Downsell.': '请先添加 Upsell，再添加 Downsell。', 'Remove the linked Downsell first.': '请先移除关联的 Downsell。', 'Upsell added': '已添加 Upsell', 'Downsell added': '已添加 Downsell', 'Upsell removed': '已移除 Upsell', 'Downsell removed': '已移除 Downsell', 'This required system step cannot be removed.': '这个必选系统步骤不能删除。', 'This system fallback cannot be removed.': '系统兜底路径不能删除。',
    'Offer product': '优惠商品', 'Choose offer product': '选择优惠商品', 'Choose a synced product for this offer.': '为本次优惠选择一件已同步商品。', 'Search products': '搜索商品', 'Selected': '已选中', 'Choose': '选择', 'No products match your search.': '没有找到匹配的商品。', 'Offer price': '优惠价', 'Original price': '商品价格', 'From selected product': '来自所选商品', 'Calculated from discount': '按优惠折扣自动计算', 'Offer discount': '优惠折扣', 'No product selected': '未选择商品', 'Choose product': '选择商品', 'Change product': '更换商品', 'Choose a product to set its discount.': '请选择商品后设置优惠折扣。', 'Choose a product before saving.': '请先选择优惠商品。', 'Not configured': '未配置', 'Choose a product and discount': '选择商品并设置优惠折扣', 'Offer is not configured': '该优惠尚未配置', 'Choose a product and discount before previewing this page.': '请先选择商品并设置优惠折扣，再预览该页面。', 'Compare-at price': '原价', 'Offer type': '优惠方式', 'Percentage off': '按比例优惠', 'Fixed amount off': '固定金额优惠', 'Page, product and rule.': '选择页面、商品和规则。', 'Use selected page': '使用选中的页面', 'Changing the draft does not change buyer traffic.': '修改草稿不会改变买家流量。', 'The published version stays in use until this purchase flow is published again.': '当前已发布版本会保持不变；再次发布购买流程后，新页面才会对买家生效。',
    'Configure a relevant product and price before publishing.': '发布前请先设置相关商品和优惠价格。', 'Save offer': '保存优惠', 'Template': '模板',
    /* Performance analysis */
    'Performance': '效果分析', 'See which purchase flows and offers are helping sales grow.': '了解哪些购买流程和加购优惠正在带来增长。', 'Data period': '统计周期', 'Last 7 days': '近 7 天', 'Last 30 days': '近 30 天', 'Last 90 days': '近 90 天',
    'Sales through BestCheckout': '通过 BestCheckout 完成的销售额', 'vs previous period': '较上一周期', 'Completed orders': '完成订单', 'paid and sent to Shopify': '已付款并同步至 Shopify', 'Checkout conversion': '结账转化率', 'vs Shopify Checkout': '较 Shopify Checkout', 'Additional offer sales': '加购优惠带来的销售额', 'of checkout sales': '占结账销售额',
    'Sales trend': '销售趋势', 'Completed checkout sales': '已完成结账的销售额', 'Sales growing': '销售额增长', 'This period': '本周期', 'BestCheckout is converting more buyers': '更多买家完成了结账', 'Your checkout conversion is higher than the Shopify control group. Keep the current setup running, then test the next buyer segment.': '当前结账转化率高于 Shopify 对照组。继续保持当前设置，并从下一个买家人群开始测试。', 'Review purchase flows': '查看购买流程',
    'Purchase flow performance': '购买流程表现', 'Compare the live journeys that buyers actually enter.': '比较买家实际进入的已启用购买流程。', 'Manage purchase flows': '管理购买流程', 'Purchase flow': '购买流程', 'Live purchase flow': '已启用购买流程', 'Entered checkout': '进入结账', 'Conversion': '转化率', 'Average order value': '平均订单金额', 'Sales': '销售额', 'vs Shopify': '较 Shopify',
    'Upsell': '加购推荐', 'Sleep Bundle offer': '睡眠套装优惠', 'buyers accepted after payment': '买家在付款后接受', 'Downsell': '降价替代推荐', 'Half-size alternative': '半规格替代优惠', 'recovered after the first offer was declined': '首次优惠被拒后挽回', 'Order bump': '结账加购', 'Shipping protection': '运输保障', 'added during checkout': '买家在结账时添加', 'Accept rate': '接受率', 'Added sales': '带来销售额',
    'How sales are counted': '销售额如何统计', 'Sales are counted after payment succeeds. Paid orders are then sent to Shopify, so the result here matches the orders your team fulfills.': '支付成功后才计入销售额。已付款订单会同步至 Shopify，因此这里的数据与团队实际履约的订单保持一致。', 'First-order boost': '首单提升', 'Smooth checkout': '顺畅结账'
    , 'Choose a goal': '选择目标', 'Name and audience': '命名和受众', 'Increase average order value': '提升客单价', 'Show one relevant offer after payment.': '在支付后展示一个相关优惠。', 'Recover declined offers': '挽回被拒绝的优惠', 'Follow a declined offer with a lower-priced alternative.': '在首个优惠被拒绝后展示一个更低价的替代方案。', 'Improve checkout completion': '提升结账完成率', 'Start with a focused checkout and add offers later.': '先从聚焦的结账开始，之后再添加优惠。', 'Nothing goes live when you create it': '创建时不会有任何内容上线', 'BestCheckout creates a draft. Shopify Checkout remains the safety fallback until you publish.': 'BestCheckout 会创建草稿；在你发布前，Shopify Checkout 始终是安全兜底。', 'Purchase flow name': '购买流程名称', 'Starting journey': '起始路径', 'Choose a starting rule. You can add more AND conditions later.': '选择最接近的起始规则。创建后仍可添加更多 AND 条件。', 'All eligible carts': '所有符合条件的购物车', 'Every cart with items can enter.': '所有包含商品的购物车都可进入。', 'Cart or product': '购物车或商品', 'Route high-value carts, selected products, or discount-code carts.': '为高客单价、指定商品或优惠码购物车设置专属路径。', 'Storefront market and language': '店铺市场和语言', 'Tailor the journey to the buyer’s selected storefront market or language.': '根据买家在店铺中选择的市场或语言匹配路径。', 'Cart product': '购物车商品', 'Route carts containing a selected product or SKU.': '让包含指定商品或 SKU 的购物车进入专属路径。', 'Customer conditions': '客户条件', 'Segment recognized customers by tags, order history, spend, or last order.': '按客户标签、历史订单、累计消费或最近下单进行细分。', 'Recognized customers only': '仅限已识别客户', 'Custom combination': '自定义组合', 'Start with a simple rule and refine it in Buyer entry after creation.': '先以简单规则创建，之后可在买家入口中细化。', 'Shopify Checkout always stays available': 'Shopify Checkout 始终可用', 'Buyers who are not recognized or do not match this purchase flow continue to Shopify Checkout.': '未识别或不符合此购买流程条件的买家会继续进入 Shopify Checkout。', 'Name the draft and choose who can enter it.': '为草稿命名，并选择哪些买家可以进入。', 'Create draft purchase flow': '创建购买流程草稿', 'Enter a purchase flow name.': '请输入购买流程名称。', 'Cart total': '购物车金额', 'Cart item count': '购物车商品数', 'Cart contains products': '购物车包含商品', 'Storefront market': '店铺市场', 'Storefront language': '店铺语言', 'items': '件', 'United States': '美国', 'Canada': '加拿大', 'United Kingdom': '英国', 'English': '英语', 'Chinese': '中文', 'Add cart, storefront, or customer conditions. Every condition must match before a buyer enters this flow.': '可添加购物车、店铺上下文或客户条件。买家须同时满足全部条件，才会进入此购买流程。', 'Add condition': '添加条件', 'Complete or remove every condition before applying.': '请补全或删除每一条条件后再应用。', 'Cart total is at least $60': '购物车金额至少为 $60', 'Storefront market is United States': '店铺市场为美国', 'Cart contains Sleep Reset Bundle': '购物车包含 Sleep Reset Bundle', 'Past orders is at least 1': '历史订单数至少为 1', 'Cart item count is at least 1': '购物车商品数至少为 1'
  });
  Object.assign(ZH, {
    'Name and conditions': '名称和条件',
    'Name the draft and set buyer conditions directly.': '命名草稿并直接设置买家条件。',
    'Add customer attributes, storefront, or cart conditions directly. Every condition must match.': '直接添加用户属性、店铺上下文或购物车条件；买家须同时满足全部条件。',
    'Customer order history and tags apply only to recognized Shopify customers.': '客户订单历史和标签仅适用于已识别的 Shopify 客户。',
    'Customer identity': '用户属性',
    'Storefront context': '店铺上下文',
    'Cart': '购物车'
  });
  Object.assign(ZH, {
    'System fallback — unmatched buyers continue to Shopify native checkout.': '系统兜底：未命中的买家继续使用 Shopify 原生结账。',
    'Keep at least one page of this type in the purchase flow.': '购买流程中至少保留一个此类型页面。',
    'Buyer journey': '购买路径',
    'Storefront → Checkout → post-purchase': '店铺前台 → 结账 → 购后流程',
    'Traffic rules': '流量规则',
    'Checkout traffic': '结账流量',
    'Set traffic rules': '设置流量规则',
    'Selected step': '当前步骤',
    'Shopify cart': 'Shopify 购物车',
    'Upsells': '加购优惠',
    'Downsells': '降价挽回',
    'Optional one-click offer after payment.': '支付后可选的一键加购优惠。',
    'Different audience → separate Funnel. Same audience → split traffic here.': '不同受众使用不同漏斗；相同受众在这里分配流量。',
    'Split entered buyers between BestCheckout Checkout pages.': '在 BestCheckout 的多个结账页面之间分配进入流程的买家。',
    'Eligible carts begin here. Configure the Checkout page for this journey in the next step.': '符合条件的购物车从这里进入；请在下一步配置此购买路径的结账页面。',
    'After offers': '优惠之后',
    'Purchase flow published': '购买流程已发布'
  });
  Object.assign(ZH, {
    'Set Checkout traffic rules': '设置结账流量规则',
    'First decide who enters this Purchase flow, then decide which Checkout those buyers use.': '先确定哪些买家进入此购买流程，再决定这些买家使用哪一种结账路径。',
    'Applies to': '适用于',
    'Buyers who entered this purchase flow': '进入此购买流程的买家',
    'Edit entry': '编辑入口',
    'Checkout split for this audience': '该人群的结账流量分配',
    'Native path / control': '原生路径 / 对照组',
    'BestCheckout Checkout page': 'BestCheckout 结账页面',
    'Set one default Checkout or split the same audience across multiple pages.': '可设置一个默认结账页面，或在相同人群中分配多个结账页面的流量。',
    'No BestCheckout Checkout page yet.': '尚未添加 BestCheckout 结账页面。',
    'Add Checkout page': '添加结账页面',
    'Use a separate Purchase flow for a different audience': '不同人群请使用独立购买流程',
    'Create a separate flow when buyers should follow a different journey. Use this split only for a default route or an A/B experiment within the same audience.': '当买家需要走不同购买路径时，请新建独立购买流程；此处仅用于同一人群下的默认路径或 A/B 测试分流。',
    'Save traffic rules': '保存流量规则',
    'Traffic rules saved': '流量规则已保存',
    'Checkout traffic must total 100%.': '结账流量合计必须为 100%。'
  });
  Object.assign(ZH, {
    'Create buyer journeys, then open one to arrange Checkout pages, Upsells, Downsells, and Thank you pages.': '创建购买流程，再进入其中配置结账页面、Upsell、Downsell 和 Thank you 页面。',
    'Give new customers a relevant one-click Upsell after checkout.': '为新客户在完成结账后展示相关的一键 Upsell。',
    'Show returning customers a Downsell after they decline the Upsell.': '复购客户拒绝 Upsell 后，展示一个更低价的 Downsell。',
    'Show a relevant Upsell after payment.': '在付款后展示一个相关 Upsell。',
    'Recover a declined Upsell': '挽回被拒绝的 Upsell',
    'Show a Downsell when an Upsell is declined.': '当 Upsell 被拒绝时展示 Downsell。',
    'Start with a focused Checkout and add Upsells or Downsells later.': '先从聚焦的结账开始，之后再按需添加 Upsell 或 Downsell。',
    'Add Upsell': '添加 Upsell',
    'Add Downsell': '添加 Downsell',
    'Configure Upsell': '配置 Upsell',
    'Configure Downsell': '配置 Downsell',
    'Save Upsell': '保存 Upsell',
    'Save Downsell': '保存 Downsell',
    'Upsell saved': 'Upsell 已保存',
    'Downsell saved': 'Downsell 已保存',
    'Purchase journey preview': '购买路径预览',
    'Payment completed': '付款完成',
    'off': '优惠',
    'This preview reflects the saved checkout pages, offers, and branch rules in this purchase flow.': '此预览会展示当前购买流程中已保存的结账页面、优惠与分支规则。',
    'Entered buyers only · other buyers continue to Shopify Checkout.': '此处仅展示已进入该购买流程的买家；其他买家会继续进入 Shopify Checkout。',
  });
  Object.assign(ZH, {
    'Customer identity': '客户身份',
    'Storefront context': '店铺前台上下文',
    'Cart': '购物车',
    'Account status': '账户状态',
    'First order or returning': '首单或复购',
    'Email marketing consent': '邮件营销订阅',
    'Last order date': '最近下单日期',
    'Storefront country': '店铺前台国家',
    'Cart subtotal': '购物车商品小计',
    'Cart currency': '购物车币种',
    'Cart products': '购物车商品',
    'Cart contains SKU': '购物车包含 SKU',
    'Signed in': '已登录',
    'Guest': '访客',
    'Subscribed': '已订阅',
    'Not subscribed': '未订阅',
    'is': '等于',
    'is not': '不等于',
    'has any of these tags': '包含任一标签',
    'has all of these tags': '包含全部标签',
    'has none of these tags': '不包含这些标签',
    'does not equal': '不等于',
    'is between': '介于',
    'is in the last': '最近',
    'is more than': '超过',
    'days ago': '天前',
    'and': '和',
    'Layer 1: Purchase flow routing': '第 1 层：购买流程路由',
    'Choose the purchase flow first, then its Checkout page.': '先确定买家是否进入此购买流程，再在流程内选择 Checkout 页面。',
    'Buyers who do not match this flow continue to Shopify Checkout.': '未命中此购买流程的买家会继续进入 Shopify Checkout。',
    'Purchase flow priority': '购买流程优先级',
    'Conflict handling': '冲突处理',
    'Highest priority match': '优先级最高者优先',
    'Higher values win. If several purchase flows match, buyers enter only the highest-priority flow.': '优先级数值越大越先命中；多个购买流程同时命中时，买家只会进入优先级最高的一条。',
    'Who enters this purchase flow? (AND)': '哪些买家会进入此购买流程？（AND）',
    'A buyer enters only when every condition below matches.': '买家必须同时满足以下所有条件，才会进入此购买流程。',
    'No match → Shopify Checkout': '未命中 → Shopify Checkout',
    'Combine customer identity, storefront context, and cart conditions. Customer order and tag conditions apply only to signed-in buyers.': '可组合客户身份、店铺前台上下文和购物车条件。客户订单与标签条件仅适用于已登录买家。',
    'No conditions added. All eligible buyers can enter this purchase flow.': '尚未添加条件，所有符合资格的买家都可进入此购买流程。',
    'Save buyer entry': '保存买家入口',
    'Preview as buyer': '买家预览',
    'Restart preview': '重新开始预览',
    'Secure checkout': '安全结账',
    'Complete order': '完成订单',
    'Your order': '你的订单',
    'One more thing': '再加一件',
    'Complete your order with a relevant add-on.': '加购一件相关商品，完成订单。',
    'Limited-time offer': '限时优惠',
    'Choose a variant': '选择规格',
    'Quantity': '数量',
    'Add to order': '添加到订单',
    'No, thanks': '暂不添加',
    'Accept this offer': '接受此优惠',
    'Order confirmed': '订单已确认',
    'Thanks, your order is confirmed.': '感谢，订单已确认。',
    'Order confirmation': '订单确认',
    'Free': '免费',
    'Continue shopping': '继续购物',
    'Shipping': '配送',
  });
  Object.assign(ZH, {
    'Editing a page does not affect live purchase flows. After you confirm the changes, publish the purchase flow for shoppers to see the new version.': '编辑页面不会影响已上线的购买流程。确认无误后，在购买流程中点击“发布”，买家才会看到新版本。',
    'Purchase flow paused. Shoppers will continue matching the next live purchase flow or Shopify Checkout.': '购买流程已暂停。买家会继续匹配下一条已启用购买流程或 Shopify Checkout。',
    'Pause purchase flow?': '暂停购买流程？', 'Pause flow': '暂停流程', 'New buyers will no longer enter this purchase flow. They will continue through the next matching live purchase flow, or Shopify Checkout.': '新的买家将不再进入此购买流程，而会继续匹配下一条已启用购买流程；若没有匹配项，则进入 Shopify Checkout。',
    'Arrange the pages shoppers see in this purchase flow.': '配置买家在此购买流程中看到的页面。',
    'Shoppers not matched by higher-priority purchase flows': '未被更高优先级购买流程命中的买家',
    'Create purchase flows, then open one to arrange Checkout pages, Upsells, Downsells, and Thank you pages.': '创建购买流程，再进入其中配置结账页面、Upsell、Downsell 和 Thank you 页面。',
    'A draft is created with Shopify Checkout as the safety route. Set the shopper entry from the flow after creating it.': '系统会先创建草稿，并保留 Shopify Checkout 作为安全兜底；创建后可在购买流程中配置买家入口。',
    'No conditions added. All eligible shoppers can enter this purchase flow.': '尚未添加条件，所有符合资格的买家都可进入此购买流程。',
    'Name the draft and set shopper conditions directly.': '命名草稿并直接设置买家条件。',
    'How entered shoppers are distributed': '进入该流程的买家如何分流',
    'Split entered shoppers between BestCheckout Checkout pages.': '在 BestCheckout 的多个结账页面之间分配进入流程的买家。',
    'Purchase journey': '购买路径',
    'Shopper entry': '买家入口',
    'Set eligibility rules and priority for this flow. Shoppers who do not match continue to Shopify Checkout.': '设置进入条件和优先级；未命中的买家会继续进入 Shopify Checkout。',
    'Entered shoppers only · other shoppers continue to Shopify Checkout.': '此处仅展示已进入该购买流程的买家；其他买家会继续进入 Shopify Checkout。',
    'Preview as shopper': '买家预览',
    'No user attributes added. All shoppers can enter this flow.': '尚未添加用户属性，所有买家都可以进入这条流程。',
    'Configure shopper entry': '配置买家入口',
    'Add cart, storefront, or customer conditions. Every condition must match before a shopper enters this flow.': '可添加购物车、店铺上下文或客户条件；买家须同时满足全部条件，才会进入此购买流程。',
    'Customer attributes apply only to recognized Shopify customers. Shoppers who are not recognized or do not match continue to Shopify Checkout.': '客户标签、历史订单数、累计消费和最近一次下单仅适用于已识别的 Shopify 客户；未识别或不符合条件的买家会进入 Shopify Checkout。',
    'Shopper entry saved': '买家入口已保存',
    'Shoppers who do not match this flow continue to Shopify Checkout.': '未命中此购买流程的买家会继续进入 Shopify Checkout。',
    'Higher values win. If several purchase flows match, shoppers enter only the highest-priority flow.': '优先级数值越大越先命中；多个购买流程同时命中时，买家只会进入优先级最高的一条。',
    'A shopper enters only when every condition below matches.': '买家必须同时满足以下所有条件，才会进入此购买流程。',
    'Combine customer identity, storefront context, and cart conditions. Customer order and tag conditions apply only to signed-in shoppers.': '可组合客户身份、店铺前台上下文和购物车条件。客户订单与标签条件仅适用于已登录买家。',
    'Save shopper entry': '保存买家入口',
    'Traffic source — shoppers enter the funnel here': '流量来源——买家从这里进入漏斗',
    'System fallback — unmatched shoppers continue to Shopify native checkout.': '系统兜底：未命中的买家继续使用 Shopify 原生结账。',
    'First decide who enters this Purchase flow, then decide which Checkout those shoppers use.': '先确定哪些买家进入此购买流程，再决定这些买家使用哪一种结账路径。',
    'Shoppers who entered this purchase flow': '进入此购买流程的买家',
    'Create a separate flow when shoppers should follow a different journey. Use this split only for a default route or an A/B experiment within the same audience.': '当买家需要走不同购买路径时，请新建独立购买流程；此处仅用于同一人群下的默认路径或 A/B 测试分流。',
    'Shopper eligibility is set in Shopper entry. This screen only allocates shoppers who already entered the flow.': '买家资格由“买家入口”统一设置；此处只分配已经进入流程的买家。',
    'Traffic share of entered shoppers:': '在进入该流程的买家中，流量配比：',
    'Changing the draft does not change shopper traffic.': '修改草稿不会改变买家流量。',
    'BestCheckout is converting more shoppers': '更多买家完成了结账',
    'Your checkout conversion is higher than the Shopify control group. Keep the current setup running, then test the next shopper segment.': '当前结账转化率高于 Shopify 对照组。继续保持当前设置，并从下一个买家人群开始测试。',
    'Compare the live journeys that shoppers actually enter.': '比较买家实际进入的已启用购买流程。',
    'shoppers accepted after payment': '买家在付款后接受',
    'DNS verified. Shoppers can now use this checkout domain.': 'DNS 已验证，买家现在可以使用这个结账域名。'
  });
  Object.assign(ZH, {
    'First-time customers': '首次购买客户',
    'All remaining customers': '其余所有客户',
    'All other customers': '其他所有客户',
    'All eligible customers': '所有符合条件的客户',
    'All customers': '所有客户',
    'Customers not matched by higher-priority purchase flows': '未被更高优先级购买流程命中的客户',
    'A focused checkout for all other customers, followed by the Thank you page.': '为其他客户提供简洁结账，完成后直接进入 Thank you 页面。',
    'A draft is created with Shopify Checkout as the safety route. Set the customer entry from the flow after creating it.': '系统会先创建草稿，并保留 Shopify Checkout 作为安全兜底；创建后可在购买流程中配置客户入口。',
    'No conditions added. All eligible customers can enter this purchase flow.': '尚未添加条件，所有符合资格的客户都可以进入此购买流程。',
    'How entered customers are distributed': '进入该流程的客户如何分流',
    'Split entered customers between BestCheckout Checkout pages.': '在 BestCheckout 的多个结账页面之间分配进入流程的客户。',
    'Customer entry': '客户入口',
    'Set customer eligibility rules and priority for this flow. Customers who do not match continue to Shopify Checkout.': '设置客户准入规则和优先级；不符合条件的客户会继续进入 Shopify Checkout。',
    'Eligible customers': '符合条件的客户',
    'Matching customers begin here.': '符合条件的客户从这里开始。',
    'Matching customers enter the BestCheckout journey.': '符合条件的客户进入 BestCheckout 购买路径。',
    'No user attributes added. All customers can enter this flow.': '尚未添加用户属性，所有客户都可以进入这条流程。',
    'Configure customer entry': '配置客户入口',
    'Add cart, storefront, or customer conditions. Every condition must match before a customer enters this flow.': '可添加购物车、店铺上下文或客户条件；客户须同时满足全部条件，才会进入此购买流程。',
    'Customer attributes apply only to recognized Shopify customers. Customers who are not recognized or do not match continue to Shopify Checkout.': '客户属性仅适用于已识别的 Shopify 客户；未识别或不符合条件的客户会继续进入 Shopify Checkout。',
    'Customer entry saved': '客户入口已保存',
    'Customers who do not match this flow continue to Shopify Checkout.': '未命中此购买流程的客户会继续进入 Shopify Checkout。',
    'Higher values win. If several purchase flows match, customers enter only the highest-priority flow.': '优先级数值越大越先命中；多个购买流程同时命中时，客户只会进入优先级最高的一条。',
    'A customer enters only when every condition below matches.': '客户必须同时满足以下所有条件，才会进入此购买流程。',
    'Combine customer identity, storefront context, and cart conditions. Customer order and tag conditions apply only to signed-in customers.': '可组合客户身份、店铺前台上下文和购物车条件。客户订单与标签条件仅适用于已登录的客户。',
    'Save customer entry': '保存客户入口',
    'Traffic source — customers enter the funnel here': '流量来源——客户从这里进入购买流程',
    'First decide who enters this Purchase flow, then decide which Checkout those customers use.': '先确定哪些客户进入此购买流程，再决定这些客户使用哪一种结账路径。',
    'Customers who entered this purchase flow': '进入此购买流程的客户',
    'Create a separate flow when customers should follow a different journey. Use this split only for a default route or an A/B experiment within the same audience.': '当客户需要走不同购买路径时，请新建独立购买流程；此处仅用于同一人群下的默认路径或 A/B 测试分流。',
    'Customer eligibility is set in Customer entry. This screen only allocates customers who already entered the flow.': '客户资格由“客户入口”统一设置；此处只分配已经进入流程的客户。',
    'Traffic share of entered customers:': '在进入该流程的客户中，流量配比：'
  });
  const t = (s) => (window.I18N && window.I18N.lang === 'zh' && ZH[s]) ? ZH[s] : s;
  function bcI18n(scope) {
    if (!window.I18N || window.I18N.lang !== 'zh') return;
    try {
      const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
      const nodes = []; let n; while ((n = w.nextNode())) nodes.push(n);
      nodes.forEach((node) => { const tr = node.nodeValue.trim(); if (tr && ZH[tr]) node.nodeValue = node.nodeValue.replace(tr, ZH[tr]); });
    } catch (e) {}
  }
  const ED = { sel: null };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = (p, w) => '<svg viewBox="0 0 24 24" width="' + (w || 16) + '" height="' + (w || 16) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const I = {
    up: svg('<path d="M7 17 17 7M9 7h8v8"/>', 14),
    bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-6z"/>', 16),
    route: svg('<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 3 3v6"/>', 16),
    repeat: svg('<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>', 16),
    cart: svg('<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h3l2.4 12.4a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/>', 16),
    link: svg('<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M8 12h8"/>', 16),
    ai: svg('<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="2"/>', 15),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 15),
    dot: svg('<circle cx="12" cy="12" r="3"/>', 8),
    check: svg('<path d="M20 6 9 17l-5-5"/>', 14),
  };
  const toast = (msg, type) => {
    const level = type || (/failed|失败|error/i.test(String(msg)) ? 'error' : 'success');
    const t = document.createElement('div');
    t.className = 'bc-message ' + level;
    t.innerHTML = '<span class="bc-message-ico">' + (level === 'error' ? '×' : level === 'warning' ? '!' : '✓') + '</span><span>' + esc(msg) + '</span>';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  };

  const STYLE = '<style>' +
    '.bc-message{position:fixed;top:16px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;max-width:min(560px,calc(100vw - 48px));padding:9px 16px;background:#fff;color:rgba(0,0,0,.88);border-radius:8px;font-size:14px;line-height:1.45;box-shadow:0 6px 16px 0 rgb(0 0 0/8%),0 3px 6px -4px rgb(0 0 0/12%),0 9px 28px 8px rgb(0 0 0/5%);z-index:300}.bc-message-ico{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:12px;font-weight:700;line-height:1;color:#fff;flex:none}.bc-message.success .bc-message-ico{background:#52c41a}.bc-message.error .bc-message-ico{background:#ff4d4f}.bc-message.warning .bc-message-ico{background:#faad14}.bc-head{margin-bottom:8px}.bc-h1{font-size:22px;font-weight:700;color:var(--ink)}.bc-sub{font-size:13px;color:var(--ink-muted);margin-top:3px}.bc-dot{display:inline-flex;align-items:center;justify-content:center;margin:0 7px;color:#9aa3ad;font-weight:500}' +
    '.bc-subnav{display:flex;gap:2px;border-bottom:1px solid var(--hair);margin:14px 0 20px;flex-wrap:wrap}' +
    '.bc-tab{padding:9px 14px;font-size:13.5px;color:var(--ink-muted);border-bottom:2px solid transparent;text-decoration:none;white-space:nowrap}' +
    '.bc-tab:hover{color:var(--ink)}.bc-tab.active{color:var(--ink);font-weight:600;border-bottom-color:var(--brand)}' +
    '.bc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:14px;margin-bottom:18px}' +
    '.bc-kpi{padding:15px 17px}.bc-kpi-l{font-size:12.5px;color:var(--ink-muted)}.bc-kpi-v{font-size:25px;font-weight:700;color:var(--ink);margin:5px 0 3px;letter-spacing:-.5px}' +
    '.bc-kpi-row{display:flex;align-items:center;gap:8px}.bc-kpi-s{font-size:11.5px;color:var(--ink-muted);margin-top:3px}' +
    '.bc-delta{font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:2px}.bc-delta.up{color:#1f8f4e}.bc-delta.down{color:#c0392b}' +
    '.bc-grid2{display:grid;grid-template-columns:1.55fr 1fr;gap:18px}.bc-grid2b{display:grid;grid-template-columns:1fr 1fr;gap:18px}' +
    '.bc-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}.bc-chip .d{width:6px;height:6px;border-radius:50%}' +
    '.bc-chip.green{background:#e7f7ee;color:#1f8f4e}.bc-chip.green .d{background:#1f8f4e}' +
    '.bc-chip.blue{background:#e8f0fe;color:#2b62d6}.bc-chip.blue .d{background:#2b62d6}' +
    '.bc-chip.amber{background:#fef3e0;color:#b9770e}.bc-chip.amber .d{background:#e0900e}' +
    '.bc-chip.gray{background:#eef0f2;color:#5b6470}.bc-chip.gray .d{background:#9aa3ad}' +
    '.bc-chip.red{background:#fdecec;color:#c0392b}.bc-chip.red .d{background:#c0392b}' +
    '.bc-chip.violet{background:#f0ebfb;color:#7b4bd0}.bc-chip.violet .d{background:#7b4bd0}' +
    '.bc-rec{display:flex;gap:11px;align-items:flex-start;padding:12px 13px;border-radius:10px;margin-bottom:9px;border:1px solid var(--hair)}' +
    '.bc-rec .ic{width:30px;height:30px;border-radius:8px;flex:none;display:inline-flex;align-items:center;justify-content:center}' +
    '.bc-rec.blue .ic{background:#e8f0fe;color:#2b62d6}.bc-rec.amber .ic{background:#fef3e0;color:#b9770e}.bc-rec.green .ic{background:#e7f7ee;color:#1f8f4e}.bc-rec.violet .ic{background:#f0ebfb;color:#7b4bd0}' +
    '.bc-rec .t{font-size:13.5px;font-weight:600;color:var(--ink);line-height:1.4}.bc-rec .m{font-size:12px;color:var(--ink-muted);margin-top:2px}' +
    '.bc-act{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--hair)}.bc-act:first-child{border-top:0}' +
    '.bc-act .av{width:30px;height:30px;border-radius:50%;flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}' +
    '.bc-act .at{flex:1;min-width:0;font-size:13px;color:var(--ink)}.bc-act .aw{font-size:11.5px;color:var(--ink-muted)}' +
    /* Activation checklist (onboarding card on Overview) */
    '.bc-onb{background:#fff;border:1.5px solid #d8c8f0;border-radius:14px;padding:18px 20px;margin-bottom:18px;background:linear-gradient(180deg,#faf7ff 0%,#fff 50px)}' +
    '.bc-onb-collapsed{padding:11px 18px;cursor:pointer;display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--ink)}' +
    '.bc-onb-collapsed:hover{background:linear-gradient(180deg,#f5efff 0%,#fafafe 100%)}' +
    '.bc-onb-rocket{font-size:17px}' +
    '.bc-onb-head{display:flex;align-items:center;gap:12px;margin-bottom:5px}' +
    '.bc-onb-h-l{font-size:15.5px;color:var(--ink)}.bc-onb-h-l b{font-weight:700}' +
    '.bc-onb-meta{font-size:12.5px;color:var(--ink-muted);margin-left:auto}' +
    '.bc-onb-tog{height:28px;padding:0 9px;min-width:28px;font-size:13px}' +
    '.bc-onb-sub{font-size:12.5px;color:var(--ink-muted);margin-bottom:11px}' +
    '.bc-onb-bar{height:6px;background:#eef0f3;border-radius:4px;margin-bottom:14px;overflow:hidden}' +
    '.bc-onb-bar span{display:block;height:100%;background:#7b4bd0;border-radius:4px;transition:width .3s}' +
    '.bc-onb-steps{display:flex;flex-direction:column;gap:3px}' +
    '.bc-onb-step{padding:9px 11px;border-radius:9px;border:1px solid transparent}' +
    '.bc-onb-step.current{background:#f6f0ff;border-color:#d8c8f0}' +
    '.bc-onb-step.done{opacity:.58}.bc-onb-step.done b{font-weight:600;color:var(--ink-muted);text-decoration:line-through;text-decoration-color:#cfd5dd}' +
    '.bc-onb-step-h{display:flex;align-items:flex-start;gap:10px}' +
    '.bc-onb-icon{flex:none;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;line-height:1;margin-top:1px}' +
    '.bc-onb-step.done .bc-onb-icon{background:#1f8f4e;color:#fff}' +
    '.bc-onb-step.current .bc-onb-icon{background:#7b4bd0;color:#fff}' +
    '.bc-onb-step.pending .bc-onb-icon{background:#fff;color:#c2c8d0;border:1.5px solid #d8dce2}' +
    '.bc-onb-text{flex:1;min-width:0;font-size:13.5px;color:var(--ink)}.bc-onb-text b{font-weight:700}' +
    '.bc-onb-hint{font-size:12px;color:var(--ink-muted);margin-top:3px;line-height:1.5}' +
    '.bc-onb-opt{font-size:11px;color:var(--ink-muted);font-weight:500;margin-left:4px}' +
    '.bc-onb-actions{display:flex;gap:8px;flex:none;align-items:flex-start}' +
    '.bc-onb-actions .btn{padding:5px 12px;font-size:12.5px;height:28px}' +
    '.bc-onb-current-actions{margin-top:10px;padding-left:28px}' +
    '.bc-onb-current-actions .btn{padding:7px 14px;font-size:13px}' +
    '.bc-onb-branch{margin-top:8px;padding:12px 14px;background:#fff;border:1px solid var(--hair);border-radius:10px}' +
    '.bc-onb-q{font-size:13px;font-weight:600;margin-bottom:9px;color:var(--ink)}' +
    '.bc-onb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}' +
    '.bc-onb-chip{font-size:12.5px;padding:6px 13px;border:1px solid var(--hair);border-radius:999px;background:#fff;cursor:pointer;color:var(--ink-body);font-weight:500}' +
    '.bc-onb-chip:hover{border-color:#aeb6c0}.bc-onb-chip.on{background:#7b4bd0;color:#fff;border-color:#7b4bd0}' +
    '.bc-onb-rec{font-size:12.5px;color:var(--ink-body);line-height:1.7;background:#faf7ff;border-radius:7px;padding:9px 11px}.bc-onb-rec.muted{color:var(--ink-muted);font-style:italic;background:#f6f7f9}' +
    '.bc-flow{display:flex;align-items:stretch;gap:0;flex-wrap:wrap}.bc-step{flex:1;min-width:150px;border:1px solid var(--hair);border-radius:10px;padding:12px 13px;position:relative}' +
    '.bc-step .n{font-size:12px;font-weight:700;color:var(--brand)}.bc-step .o{font-size:12.5px;color:var(--ink);margin-top:4px;line-height:1.4}.bc-step .k{font-size:11px;color:var(--ink-muted);margin-top:6px}' +
    '.bc-arrow{align-self:center;color:var(--ink-muted);padding:0 4px;font-size:18px}' +
    '.bc-note{font-size:12.5px;color:var(--ink-muted);background:var(--panel);border-radius:8px;padding:11px 13px;line-height:1.55}' +
    '.bc-badge-rt{font-size:11px;font-weight:700;color:#b9770e;background:#fef3e0;border-radius:5px;padding:2px 7px;margin-left:8px;vertical-align:middle}' +
    '@media(max-width:1000px){.bc-grid2,.bc-grid2b{grid-template-columns:1fr}}' +
  '</style>';

  // Checkout template gallery (the "Checkout design" submenu).
  const GSTYLE = '<style>' +
    '.cg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(284px,1fr));gap:16px}' +
    '.cg-card{border:1px solid var(--hair);border-radius:14px;overflow:hidden;background:#fff;display:flex;flex-direction:column;transition:box-shadow .15s,border-color .15s}' +
    '.cg-card:hover{box-shadow:var(--float-shadow);border-color:#d4d8de}' +
    '.cg-thumb{height:152px;background:#f6f7f9;padding:12px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid var(--hair)}' +
    '.cg-t-bar{height:14px;border-radius:4px;background:var(--acc);opacity:.9}.cg-t-gap{height:14px}' +
    '.cg-t-cols{flex:1;display:grid;grid-template-columns:1fr .68fr;gap:8px;min-height:0}' +
    '.cg-t-main{display:flex;flex-direction:column;gap:6px}.cg-t-main span{height:9px;border-radius:3px;background:#dfe3e8}.cg-t-main span.w{width:62%}' +
    '.cg-t-side{background:#fff;border:1px solid #e3e6ea;border-radius:6px;padding:7px;display:flex;flex-direction:column;gap:5px}' +
    '.cg-t-side i{height:8px;border-radius:3px;background:#e6e9ed}.cg-t-side b{height:13px;border-radius:4px;background:var(--acc);margin-top:auto}' +
    '.cg-t-solo{flex:1;width:72%;margin:0 auto;background:#fff;border:1px solid #e3e6ea;border-radius:6px;padding:9px;display:flex;flex-direction:column;gap:6px}' +
    '.cg-t-solo i{height:9px;border-radius:3px;background:#e6e9ed}.cg-t-solo b{height:14px;border-radius:4px;background:var(--acc);margin-top:4px}' +
    '.cg-t-foot{height:10px;border-radius:3px;background:#e9ebef}' +
    '.cg-body{padding:13px 15px 15px;display:flex;flex-direction:column;gap:7px;flex:1}' +
    '.cg-name{font-size:15px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:8px}' +
    '.cg-pop{font-size:10.5px;font-weight:700;color:#b9770e;background:#fef3e0;border-radius:5px;padding:2px 7px}' +
    '.cg-rec{font-size:10.5px;font-weight:700;color:#1f8f4e;background:#e7f7ee;border-radius:5px;padding:2px 7px}' +
    '.cg-soonbadge{font-size:10.5px;font-weight:700;color:#5b6470;background:#eef0f2;border-radius:5px;padding:2px 7px}.cg-soon{opacity:.92}' +
    '.cg-t-offer{flex:1;display:flex;flex-direction:column;gap:6px;justify-content:center}.cg-t-offer span{height:18px;border-radius:5px;background:#e3e6ea;border:1px solid #dfe3e8}.cg-t-offer span.sel{background:var(--acc);opacity:.85;border-color:transparent}' +
    '.cg-tag{font-size:12.5px;line-height:1.5}' +
    '.cg-chips{display:flex;flex-wrap:wrap;gap:5px;margin:1px 0 3px}' +
    '.cg-cm{font-size:11px;color:var(--ink-muted);background:var(--panel);border-radius:999px;padding:3px 9px}' +
    '.cg-actions{margin-top:auto;display:flex;gap:8px;padding-top:3px}.cg-actions .btn{flex:1;justify-content:center}' +
  '</style>';

  // Funnel canvas + Templates library
  const FSTYLE = '<style>' +
    '.tp-group{margin-bottom:26px}.tp-group-h{display:flex;align-items:baseline;gap:10px;margin-bottom:11px}.tp-group-name{font-size:15px;font-weight:700;color:var(--ink)}' +
    '.tp-sys{font-size:10.5px;font-weight:700;color:#2b62d6;background:#e8f0fe;border-radius:5px;padding:2px 7px}' +
    '.tp-saved{font-size:10.5px;font-weight:700;color:#1f8f4e;background:#e7f7ee;border-radius:5px;padding:2px 7px}' +
    '.fc-bar{display:flex;align-items:center;gap:8px;margin:0 0 12px;flex-wrap:wrap}.fc-bar .btn{padding:5px 11px;font-size:13px;min-width:34px;justify-content:center}' +
    '.fc-zval{font-size:12.5px;color:var(--ink-muted);min-width:46px;text-align:center}.fc-hint{font-size:12px;color:var(--ink-muted);margin-left:4px}' +
    '.fc-scroll{position:relative;overflow:auto;border:1px solid var(--hair);border-radius:14px;background:#fbfcfd;min-height:380px}' +
    '.fc-sizer{position:relative}' +
    '.fc-canvas{position:relative;transform-origin:0 0;background-image:radial-gradient(#dde2e8 1.1px,transparent 1.1px);background-size:22px 22px;background-position:8px 8px}' +
    '.fc-edges{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible}.fc-edges .fc-ehit{pointer-events:stroke;cursor:pointer}' +
    '.fc-labels{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}' +
    '.fc-elabel{position:absolute;transform:translate(-50%,-50%);font-size:10px;font-weight:800;letter-spacing:.04em;padding:2px 8px;border-radius:20px;background:#fff;border:1.5px solid #cfd5dd;color:#5b6470;white-space:nowrap;box-shadow:0 1px 2px rgba(20,30,50,.06);z-index:3}' +
    '.fc-elabel.accept{border-color:#bfe3cd;color:#1f8f4e}.fc-elabel.decline{border-color:#f0d4a8;color:#b9770e}.fc-elabel.random{border-color:#bcd0f5;color:#2b62d6;font-weight:800}.fc-elabel.predicate{border-color:#d8c8f0;color:#7b4bd0;font-weight:800}' +
    '.fc-elabel[data-edit]{pointer-events:auto;cursor:pointer}.fc-elabel[data-edit].random:hover{background:#eef3fe;border-color:#2b62d6}.fc-elabel[data-edit].predicate:hover{background:#f5eef9;border-color:#7b4bd0}' +
    '.se-list{display:flex;flex-direction:column;gap:8px}.se-row{display:flex;align-items:center;gap:10px}.se-name{flex:1;font-size:13.5px;color:var(--ink);font-weight:600}.se-pct{width:74px;height:36px;border:1px solid var(--line);border-radius:8px;padding:0 10px;font-size:14px;text-align:right}.se-sign{color:var(--ink-muted);font-size:13px}' +
    '.se-total{margin-top:12px;font-size:12.5px;color:var(--ink-muted)}' +
    '.fc-emenu{background:#fff;border:1px solid var(--hair);border-radius:10px;box-shadow:var(--float-shadow);padding:6px;min-width:236px;display:flex;flex-direction:column;gap:1px}' +
    '.fc-emh{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-muted);padding:3px 10px 5px}' +
    '.fc-emsep{height:1px;background:var(--hair);margin:5px 0}' +
    '.fc-emi{display:flex;align-items:center;gap:8px;text-align:left;font-size:13px;color:var(--ink);background:transparent;border:0;border-radius:7px;padding:8px 10px;cursor:pointer}.fc-emi:hover{background:var(--panel)}.fc-emi.on{background:var(--panel);font-weight:600}' +
    '.fc-emi-x{margin-left:auto;font-size:11.5px;color:var(--ink-muted);font-weight:400}' +
    '.fc-emi-info{font-size:12px;color:var(--ink-muted);padding:4px 10px 7px;line-height:1.5}' +
    '.fc-emi.accept{color:#1f8f4e}.fc-emi.decline{color:#b9770e}.fc-emi.random{color:#2b62d6}.fc-emi.predicate{color:#7b4bd0}' +
    '.fc-emi.del{color:#d64545}.fc-emi.del:hover{background:#fdeaea}' +
    '.se-pred{height:36px;border:1px solid var(--line);border-radius:8px;padding:0 11px;font-size:13.5px;background:#fff;color:var(--ink);min-width:170px}' +
    /* Routing rule builder (Azoya-style multi-condition AND) */
    '.rb-mc{width:min(500px,calc(100vw - 32px));max-width:none;max-height:min(720px,calc(100vh - 32px));display:flex;flex-direction:column;overflow:hidden}' +
    '.rb-mc .xp-mh{flex:none;padding:16px 18px 14px;border-bottom:1px solid var(--hair);font-size:14px;font-weight:700}' +
    '.rb-mc .rb-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:12px 18px 16px}' +
    '.rb-mc .xp-mf{flex:none;min-height:52px;padding:10px 18px;border-top:1px solid var(--hair);background:#fff}' +
    '.rb-list{display:flex;flex-direction:column;gap:10px;max-height:none;overflow:visible}' +
    '.rb-modal-note{margin:0 0 10px;padding:9px 10px;border:1px solid #d7e6ff;border-radius:7px;background:#f3f7ff;color:#315a91;font-size:12px;line-height:1.55}' +
    '.rb-branch{border:1px solid var(--hair);border-radius:9px;padding:12px;background:#fff;transition:border-color .15s,background .15s}' +
    '.rb-branch.fallback{border-color:#a9c7f5;background:linear-gradient(180deg,#f4f8ff 0%,#fff 48px)}' +
    '.rb-branch-h{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px}' +
    '.rb-arrow{color:var(--ink-muted);font-weight:700}' +
    '.rb-target{color:var(--ink);font-weight:700}' +
    '.rb-fb{margin-left:auto;font-size:12px;color:var(--ink-muted);display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-weight:500;white-space:nowrap}' +
    '.rb-fb input{margin:0}' +
    '.rb-fb-note{font-size:12px;color:var(--ink-muted);background:var(--panel);border-radius:7px;padding:8px 10px;line-height:1.5}' +
    '.rb-conds{display:flex;flex-direction:column;gap:7px;margin-bottom:8px}' +
    '.rb-cond{display:flex;align-items:center;gap:6px;background:var(--panel);border-radius:8px;padding:5px}' +
    '.rb-cond select,.rb-cond input.rb-val{height:32px;border:1px solid var(--line);border-radius:7px;padding:0 8px;font-size:12.5px;background:#fff;color:var(--ink)}' +
    '.rb-cond .rb-field{flex:0 0 150px;font-weight:500}' +
    '.rb-cond .rb-op{flex:0 0 92px}' +
    '.rb-cond .rb-vwrap{flex:1;min-width:0;display:flex;align-items:center;gap:5px}' +
    '.rb-cond .rb-vwrap select.rb-val,.rb-cond .rb-vwrap input.rb-val{flex:1;min-width:0}' +
    '.rb-cond .rb-tilde{color:var(--ink-muted);font-size:12px}' +
    '.rb-cond .rb-rm{width:26px;height:26px;border:0;background:transparent;color:#c2c8d0;font-size:12px;cursor:pointer;border-radius:5px;flex:none}.rb-cond .rb-rm:hover{background:#fdeaea;color:#d64545}' +
    '.rb-tags{flex:1;display:flex;flex-wrap:wrap;align-items:center;gap:5px;min-height:32px;padding:3px 6px;background:#fff;border:1px solid var(--line);border-radius:7px}' +
    '.rb-tag{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:#7b4bd0;background:#f1ecfb;border-radius:5px;padding:3px 4px 3px 8px}' +
    '.rb-tag button{border:0;background:transparent;color:#7b4bd0;cursor:pointer;font-size:13px;padding:0 3px}' +
    '.rb-tagadd{flex:none;height:24px;border:0;background:transparent;color:var(--brand);font-size:12px;cursor:pointer}' +
    '.rb-hint{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#e6e9ee;color:#6e7682;font-size:10px;font-weight:700;cursor:help;position:relative}.rb-hint:hover,.rb-hint:focus{background:#7b4bd0;color:#fff;outline:none}' +
    '.rb-hint .rb-tip{display:none;position:absolute;top:calc(100% + 9px);right:-6px;background:#3a3f4a;color:#fff;padding:9px 12px;border-radius:6px;font-size:12px;font-weight:400;line-height:1.55;width:280px;text-align:left;letter-spacing:0;z-index:200;box-shadow:0 4px 14px rgba(20,30,50,.22);white-space:normal;pointer-events:none}' +
    '.rb-hint .rb-tip::after{content:"";position:absolute;bottom:100%;right:10px;border:5px solid transparent;border-bottom-color:#3a3f4a}' +
    '.rb-hint:hover .rb-tip,.rb-hint:focus .rb-tip{display:block}' +
    '.rb-addc{margin-top:2px;font-size:12.5px;color:var(--brand);background:transparent;border:1px dashed var(--brand);border-radius:7px;padding:6px 11px;cursor:pointer}.rb-addc:hover{background:#eef3fe}' +
    '.rb-msg{flex:1;font-size:12px;color:var(--ink-muted)}.rb-msg.err{color:#d92d20}' +
    '.rb-section-l{font-size:11px;font-weight:600;color:var(--ink-muted);letter-spacing:.04em;margin:2px 0 5px;text-transform:uppercase}' +
    '.rb-empty{font-size:12.5px;color:var(--ink-muted);padding:8px 10px;background:#fafafa;border-radius:7px;border:1px dashed var(--hair)}.rb-entry-note{font-size:12px;line-height:1.55;color:#315a91;background:#f3f7ff;border:1px solid #d7e6ff;border-radius:7px;padding:9px 10px;margin:8px 0 12px}' +
    '.rb-sep{height:1px;background:var(--hair);margin:14px 0 12px}' +
    '.rb-weight-row{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink)}' +
    '.rb-weight-prefix{color:var(--ink-body)}' +
    '.rb-weight-suffix{color:var(--ink-body)}' +
    '.rb-weight-input{width:68px;height:32px;border:1px solid var(--line);border-radius:7px;padding:0 9px;font-size:13px;text-align:right;background:#fff;color:var(--ink)}' +
    '.rb-weight-rm{width:26px;height:26px;border:0;background:transparent;color:#c2c8d0;font-size:12px;cursor:pointer;border-radius:5px;margin-left:auto}.rb-weight-rm:hover{background:#fdeaea;color:#d64545}' +
    '.rb-addw{margin-top:0}' +
    '.fc-node{position:absolute;width:230px;background:#fff;border:1px solid var(--hair);border-radius:12px;box-shadow:0 1px 3px rgba(20,30,50,.07);cursor:pointer}.fc-node .fc-node-bar,.fc-node .fc-node-body{overflow:hidden;border-radius:inherit}.fc-node .fc-node-bar{border-radius:12px 12px 0 0}.fc-node .fc-node-body{border-radius:0 0 12px 12px}' +
    '.fc-node.sel{box-shadow:0 0 0 2px var(--brand),0 4px 14px rgba(20,30,50,.14)}' +
    '.fc-node-bar{display:flex;align-items:center;gap:7px;padding:9px 11px;cursor:grab;border-bottom:1px solid var(--hair);user-select:none;background:#fbfcfd}.fc-node-bar:active{cursor:grabbing}' +
    '.fc-dot{width:8px;height:8px;border-radius:50%;flex:none;background:#9aa3af}' +
    '.fc-node-type{font-size:13.5px;font-weight:700;color:var(--ink)}.fc-grip{margin-left:6px;color:#c2c8d0;font-size:12px}' +
    '.t-checkout .fc-dot{background:#2b62d6}.t-upsell .fc-dot{background:#1f8f4e}.t-downsell .fc-dot{background:#d98a2b}.t-thankyou .fc-dot{background:#7b4bd0}' +
    '.fc-node-body{padding:12px}' +
    '.fc-del{margin-left:auto;width:18px;height:18px;border:0;background:transparent;color:#c2c8d0;font-size:11px;cursor:pointer;border-radius:5px;display:grid;place-items:center;padding:0}.fc-del:hover{background:#fdeaea;color:#d64545}' +
    '.fc-canvas.fc-connecting{cursor:crosshair}' +
    /* Feishu-style drag-from-port: a blue dot on the right edge of every node. Hover-discoverable; */
    /* mousedown starts a drag with a ghost SVG line; release over a node creates the edge. */
    '.fc-port{position:absolute;right:-8px;top:50%;width:16px;height:16px;border-radius:50%;background:#2b62d6;border:2.5px solid #fff;box-shadow:0 0 0 1px #2b62d6,0 1px 3px rgba(20,30,50,.18);opacity:0;cursor:crosshair;transition:opacity .18s,transform .15s;z-index:4;transform:translateY(-50%)}' +
    '.fc-port::after{content:"";position:absolute;inset:3px;border-radius:50%;background:#fff;opacity:0;transition:opacity .15s}' +
    '.fc-node:hover .fc-port,.fc-port:hover,.fc-canvas.fc-connecting .fc-port{opacity:1}' +
    '.fc-port:hover{transform:translateY(-50%) scale(1.25)}.fc-port:hover::after{opacity:1}' +
    '.fc-node.fc-drop-target{box-shadow:0 0 0 2px #1f8f4e,0 4px 14px rgba(31,143,78,.22)!important}.fc-node.fc-drop-target .fc-node-bar{background:#eaf7ee}' +
    '.fc-src .fc-node-bar{background:#f3f9f4}.fc-src .fc-grip{margin-left:6px}.fc-sicon{width:18px;height:18px;border-radius:5px;background:#95bf47;color:#fff;font-weight:800;font-size:12px;display:grid;place-items:center;flex:none}' +
    '.fc-src-dom{font-size:12.5px;font-weight:700;color:var(--ink);word-break:break-all}.fc-src-tag{font-size:11.5px;color:var(--ink-muted);line-height:1.45;margin:4px 0 2px}' +
    '.fc-ctrl .fc-node-bar{background:#f3f9f4}.fc-ctrl .fc-del{margin-left:auto}.fc-ctrl .fc-grip{margin-left:6px}.fc-cicon{width:18px;height:18px;border-radius:5px;background:#95bf47;color:#fff;font-weight:800;font-size:12px;display:grid;place-items:center;flex:none}' +
    '.fc-ctrl-tag{font-size:11.5px;color:var(--ink-muted);line-height:1.45;margin:0 0 6px}.fc-system-lock{display:block;color:#64748b;font-size:10.5px;line-height:1.4}' +
    '.fc-src-entry{border-top:1px solid var(--hair);margin-top:8px;padding-top:7px}.fc-src-entry small{display:block;color:var(--ink-muted);font-size:10.5px;margin-bottom:2px}.fc-src-entry b{display:block;color:var(--ink-body);font-size:11.5px;line-height:1.35;max-height:32px;overflow:hidden}' +
    '.fc-add{position:relative;display:inline-flex}.fc-add-menu{position:absolute;top:calc(100% + 5px);left:0;z-index:60;background:#fff;border:1px solid var(--hair);border-radius:10px;box-shadow:var(--float-shadow);padding:5px;min-width:158px;display:flex;flex-direction:column;gap:2px}.fc-add-menu[hidden]{display:none}' +
    '.fc-add-menu button{text-align:left;font-size:13px;color:var(--ink);background:transparent;border:0;border-radius:7px;padding:8px 10px;cursor:pointer}.fc-add-menu button:hover{background:var(--panel)}' +
    '.fc-sep{width:1px;height:22px;background:var(--hair);margin:0 4px}' +
    '.fn-node-type{font-size:15px;font-weight:700;color:var(--ink)}' +
    '.fn-tpl{font-size:12.5px;color:var(--ink-muted)}.fn-tpl b{color:var(--ink)}' +
    '.fn-ab{border:1px solid #e3e6ea;border-radius:9px;padding:9px 10px;background:#fafbfc}' +
    '.fn-ab-h{font-size:11.5px;font-weight:600;color:var(--ink);margin-bottom:7px}' +
    '.fn-ab-row{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ink-muted);margin:4px 0}.fn-ab-row b{width:11px;font-weight:700}.fn-ab-row i{width:40px;text-align:right;font-style:normal}.fn-ab-track{flex:1;height:8px;background:#eef0f2;border-radius:4px;overflow:hidden}.fn-ab-track span{display:block;height:100%}' +
    '.fn-ab-seg{flex:1;font-size:10.5px;font-weight:700;color:#5b6470;background:#eef1f5;border-radius:5px;padding:2px 7px;text-align:center}' +
    '.fn-ab-mode{font-size:9.5px;font-weight:700;color:#7b4bd0;background:#f1ecfb;border-radius:5px;padding:1px 6px;letter-spacing:.02em}' +
    '.fab-seg{display:flex;gap:6px}.fab-segbtn{flex:1;font-size:12.5px;font-weight:600;color:var(--ink-body);background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 0;cursor:pointer}.fab-segbtn.on{border-color:var(--brand);color:var(--brand);background:#eef3fe}' +
    '.fab-note{font-size:12px;color:var(--ink-body);line-height:1.6;background:var(--panel);border-radius:8px;padding:10px 12px}' +
    '.pp-types{display:flex;gap:6px;flex-wrap:wrap}.pp-type{flex:1;min-width:70px;font-size:12.5px;font-weight:600;color:var(--ink-body);background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 4px;cursor:pointer}.pp-type.on{border-color:var(--brand);color:var(--brand);background:#eef3fe}' +
    '.pp-tpls{display:flex;flex-direction:column;gap:7px;max-height:230px;overflow:auto}' +
    '.pp-tpl{display:flex;align-items:center;gap:11px;text-align:left;font-size:13px;color:var(--ink);background:#fff;border:1.5px solid var(--line);border-radius:9px;padding:10px 12px;cursor:pointer}.pp-tpl:hover{border-color:#d4d8de}.pp-tpl.on{border-color:var(--brand);box-shadow:inset 0 0 0 1px var(--brand)}' +
    '.pp-draft-note{display:flex;align-items:flex-start;gap:8px;padding:10px 11px;border:1px solid #cce6dd;border-radius:8px;background:#f2fbf6}.pp-draft-note-icon{display:grid;place-items:center;width:17px;height:17px;margin-top:1px;border-radius:50%;background:#dff3e7;color:#23824f;font-size:10px;font-weight:800;flex:none}.pp-draft-note strong{display:block;color:#276b48;font-size:12px;line-height:1.4}.pp-draft-note p{margin:2px 0 0;color:#4d795f;font-size:11px;line-height:1.45}' +
    '.pp-thumb-wrap{flex:none;width:96px;height:60px;border:1px solid var(--hair);border-radius:6px;overflow:hidden;background:#f6f7f9}' +
    '.pp-thumb-wrap .cg-thumb{height:100%;padding:5px;gap:3px;border-bottom:0}' +
    '.pp-thumb-wrap .cg-t-bar,.pp-thumb-wrap .cg-t-gap{height:6px;border-radius:2px}' +
    '.pp-thumb-wrap .cg-t-cols{gap:3px}' +
    '.pp-thumb-wrap .cg-t-main span{height:5px;border-radius:2px}.pp-thumb-wrap .cg-t-side i,.pp-thumb-wrap .cg-t-side b{border-radius:2px}' +
    '.pp-thumb-wrap .cg-t-foot{height:4px;border-radius:2px}' +
    '.pp-thumb-wrap .cg-t-solo{padding:4px;gap:2px}.pp-thumb-wrap .cg-t-solo i,.pp-thumb-wrap .cg-t-solo b{border-radius:2px}' +
    '.pp-tpl-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}' +
    '.pp-tpl-nm{font-weight:600;font-size:13.5px;color:var(--ink)}' +
    '.pp-tpl-tag{font-size:11.5px;color:var(--ink-muted);line-height:1.4}' +
    '.pp-from{font-size:12px;color:var(--ink-muted);margin-top:2px}.pp-from b{color:var(--ink)}' +
    '.bm-scopes{margin:12px 0 0;padding-left:18px;font-size:13px;color:var(--ink-body);line-height:1.75}' +
    '.bm-embed{margin-top:12px;border:1px solid var(--hair);border-radius:9px;padding:11px 13px;display:flex;align-items:center;gap:9px;font-size:13px;color:var(--ink)}' +
    '.bm-toggle{flex:none;width:34px;height:18px;border-radius:20px;background:#1f8f4e;position:relative}.bm-toggle::after{content:"";position:absolute;right:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff}' +
    '.fn-ab-win{font-size:11px;color:#1f8f4e;margin-top:6px;line-height:1.4}.fn-ab-win a{color:#1f8f4e;font-weight:600;text-decoration:underline}' +
    '.fn-ab-foot{font-size:10.5px;margin-top:7px;color:var(--ink-muted)}.fn-ab-foot a{color:var(--brand);text-decoration:none}.fn-ab-foot a:hover{text-decoration:underline}' +
    '.fn-branch{font-size:11.5px;color:#b9770e;background:#fef3e0;border-radius:6px;padding:6px 9px;line-height:1.4}' +
    '.fn-acts{margin-top:auto;display:flex;gap:7px}.fn-acts .btn{flex:1;justify-content:center;font-size:12.5px}' +
    '.fc-node-body .fn-acts{margin-top:10px}' +
    '@media(max-width:760px){.fc-hint{display:none}}' +
  '</style>';

  const FLOW_SYSTEM_STYLE = '<style>' +
    '.fj-eyebrow{display:block;font-size:11px;line-height:1.2;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px}' +
    '.fj-card-head,.fj-journey-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.fj-card-head h2,.fj-journey-head h2{margin:0;color:var(--ink);font-size:16px;letter-spacing:-.1px}.fj-card-head p,.fj-journey-head p{margin:5px 0 0;max-width:640px;font-size:12.5px;line-height:1.55;color:var(--ink-muted)}' +
    '.fj-summary{margin:0 0 16px}.fj-summary .fj-card-head{align-items:center}.fj-summary-grid{display:grid;grid-template-columns:2fr 1fr 1.45fr;gap:0;margin-top:16px;border-top:1px solid var(--hair)}.fj-summary-grid>div{padding:13px 16px 2px 0;display:flex;flex-direction:column;gap:4px}.fj-summary-grid>div+div{border-left:1px solid var(--hair);padding-left:16px}.fj-summary-grid small{font-size:11.5px;color:var(--ink-muted)}.fj-summary-grid strong{font-size:13.5px;color:var(--ink)}' +
    '.fj-journey{margin:0 0 16px;padding:18px;overflow:hidden}.fj-journey .fc-bar{margin-top:16px}.fj-journey .fc-scroll{border-radius:10px}.fj-journey .fc-scroll-inline{min-height:440px}.fj-stages{display:grid;grid-template-columns:repeat(5,minmax(204px,1fr));gap:10px;margin-top:16px;overflow-x:auto;padding-bottom:2px}.fj-stage{min-width:204px;border:1px solid var(--hair);border-radius:10px;background:#fff;padding:13px;display:flex;flex-direction:column;min-height:255px}.fj-stage-store{background:#fbfcfd}.fj-stage header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--hair)}.fj-stage h3{margin:0;font-size:13.5px;color:var(--ink)}.fj-stage p{margin:3px 0 0;font-size:11.5px;line-height:1.45;color:var(--ink-muted)}.fj-store-note,.fj-empty{display:flex;align-items:center;justify-content:center;min-height:74px;border:1px dashed var(--ctl);border-radius:8px;background:var(--panel);margin:12px 0;color:var(--ink-muted);font-size:11.5px;text-align:center;padding:10px;line-height:1.45}.fj-stage-nodes{display:flex;flex-direction:column;gap:8px;margin-top:12px;flex:1}.fj-node{border:1px solid var(--hair);border-radius:8px;background:#fff;padding:10px}.fj-node-head{display:flex;gap:8px;align-items:flex-start}.fj-stage-icon{width:19px;height:19px;border-radius:6px;background:#edf3ff;color:var(--brand);display:grid;place-items:center;font-size:10px;font-weight:750;flex:none}.fj-node-upsell .fj-stage-icon{background:#e8f7ee;color:#23824f}.fj-node-downsell .fj-stage-icon{background:#fff3e6;color:#bc7412}.fj-node-thankyou .fj-stage-icon{background:#f1ebfb;color:#7448bd}.fj-node-head strong{display:block;font-size:12.5px;color:var(--ink)}.fj-node-meta{display:block;margin-top:2px;font-size:11px;line-height:1.35;color:var(--ink-muted);word-break:break-word}.fj-offer-meta{color:#2c6c4f}.fj-node-actions{display:flex;align-items:center;gap:5px;margin-top:9px;flex-wrap:wrap}.fj-node-actions .btn{height:27px;padding:0 8px;font-size:11px}.fj-node-remove{width:26px;height:27px;border:0;border-radius:6px;background:transparent;color:#a0a8b3;font-size:16px;cursor:pointer;margin-left:auto}.fj-node-remove:hover{color:#d92d20;background:#fff1f0}.fj-add{width:100%;height:31px;border:1px dashed #9cbbe9;border-radius:8px;background:#fbfdff;color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;margin-top:11px}.fj-add:hover{border-color:var(--brand);background:#f3f8ff}.fj-stage-state{display:inline-flex;align-items:center;width:max-content;margin-top:8px;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:700}.fj-stage-state.required{color:#225ec0;background:#eaf2ff}.fj-stage-state.optional{color:#6c5a21;background:#fff6d9}.fj-stage-state.system{color:#36703e;background:#eaf6ec}.fj-store-link{display:inline-flex;margin-top:9px;font-size:11px;color:var(--brand);text-decoration:none}.fj-store-link:hover{text-decoration:underline}.fj-stage-hint{margin-top:11px;color:var(--ink-muted);font-size:11px;line-height:1.45}.fj-outcomes{display:flex;flex-direction:column;gap:5px;margin-top:9px;padding-top:8px;border-top:1px solid var(--hair)}.fj-outcome{display:flex;align-items:center;gap:5px;font-size:10.5px;line-height:1.35;color:var(--ink-muted)}.fj-outcome b{font-size:10px}.fj-outcome i{font-style:normal;color:#9ba5b4}.fj-outcome.accept b{color:#25804a}.fj-outcome.decline b{color:#a9701a}.fj-fallback{display:flex;align-items:flex-start;gap:10px;margin-top:14px;padding:12px 13px;border:1px solid #d8dde5;border-radius:9px;background:#f8fafc}.fj-fallback-icon{display:grid;place-items:center;width:23px;height:23px;border-radius:7px;background:#e8edf3;color:#607083;font-size:11px;font-weight:750;flex:none}.fj-fallback .fj-eyebrow{margin-bottom:3px}.fj-fallback strong{display:block;font-size:12.5px;color:var(--ink)}.fj-fallback p{margin:2px 0 0;font-size:11.5px;line-height:1.45;color:var(--ink-muted)}.fj-summary-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.rb-system-fallback{display:inline-flex;align-items:center;margin-left:auto;padding:3px 7px;border-radius:999px;background:#edf1f5;color:#62708d;font-size:10px;font-weight:700}' +
    '.fj-traffic{margin:0 0 24px}.fj-traffic-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:16px}.fj-traffic-row{display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid var(--hair);border-radius:8px;background:#fff;min-width:0}.fj-traffic-dot{width:9px;height:9px;border-radius:50%;background:var(--brand);margin-top:4px;flex:none}.fj-traffic-dot.is-control{background:#94a0ad}.fj-traffic-row span:nth-child(2){min-width:0;display:flex;flex:1;flex-direction:column;gap:2px}.fj-traffic-row strong{font-size:12.5px;color:var(--ink)}.fj-traffic-row small{font-size:11px;color:var(--ink-muted);line-height:1.35}.fj-traffic-tag{font-size:10px;color:var(--ink-muted);white-space:nowrap}' +
    '.fo-modal{width:500px}.fo-intro{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid #cfe1ff;border-radius:8px;background:#f7faff;color:var(--ink)}.fo-intro strong{font-size:13px}.fo-intro span{font-size:12px;line-height:1.45;color:var(--ink-body)}.fo-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.fo-types{display:flex;gap:7px}.fo-type{flex:1;height:34px;border:1px solid var(--ctl);border-radius:8px;background:var(--panel);color:var(--ink-body);font-size:12px;font-weight:600;cursor:pointer}.fo-type.on{border-color:var(--brand);background:#eef4ff;color:var(--brand)}.fo-summary{display:grid;grid-template-columns:1fr auto;gap:2px 12px;align-items:center;padding:11px 12px;border-radius:8px;background:var(--panel)}.fo-summary strong{font-size:13px;color:var(--ink)}.fo-summary span{font-size:13px;font-weight:700;color:var(--ink)}.fo-summary s{font-size:11px;font-weight:400;color:var(--ink-muted);margin-left:4px}.fo-summary small{grid-column:1/-1;font-size:11px;color:var(--ink-muted)}' +
    '.fo-product-trigger{display:flex;align-items:center;gap:9px;width:100%;min-height:48px;padding:8px 10px;border:1px solid var(--ctl);border-radius:8px;background:#fff;color:var(--ink);font:inherit;text-align:left;cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease}.fo-product-trigger:hover{border-color:#8eb8eb;background:#fbfdff}.fo-product-trigger:focus-visible{outline:0;border-color:var(--brand);box-shadow:0 0 0 2px rgb(0 102 230 / 12%)}.fo-product-avatar{display:grid;place-items:center;width:28px;height:28px;border-radius:7px;background:#e8f0ff;color:var(--brand);font-size:12px;font-weight:750;flex:none}.fo-product-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}.fo-product-copy strong{overflow:hidden;color:var(--ink);font-size:13px;line-height:1.3;text-overflow:ellipsis;white-space:nowrap}.fo-product-copy small{color:var(--ink-muted);font-size:11.5px;line-height:1.35}.fo-product-copy s{margin-left:4px;color:#98a2b3}.fo-product-change{display:inline-flex;align-items:center;gap:4px;flex:none;color:var(--brand);font-size:12px;font-weight:650;white-space:nowrap}.fo-product-change b{font-size:15px;font-weight:500;line-height:1}' +
    '.fo-product-empty{flex:1;color:var(--ink-muted);font-size:13px}.fo-product-choose{padding:5px 8px;border:1px solid var(--ctl);border-radius:6px;color:var(--brand);font-size:12px;font-weight:600}.fo-readonly{display:flex;align-items:center;box-sizing:border-box;width:100%;height:36px;padding:0 10px;border:1px solid var(--ctl);border-radius:8px;background:var(--panel);color:var(--ink);font-size:13px}.fo-price-output{font-weight:700}.fo-field-hint{display:block;margin-top:5px;color:var(--ink-muted);font-size:11px;line-height:1.35}.fo-discount-row{display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:8px}.fo-discount-row .fo-types{min-width:0}.fo-discount-row .fo-type{min-width:0}.fo-discount-input{display:flex;align-items:center;height:34px;overflow:hidden;border:1px solid var(--ctl);border-radius:8px;background:#fff}.fo-discount-input:focus-within{border-color:var(--brand);box-shadow:0 0 0 2px rgb(0 102 230 / 10%)}.fo-discount-input span{display:grid;place-items:center;height:100%;padding:0 9px;background:var(--panel);color:var(--ink-body);font-size:12px}.fo-discount-input span:empty{display:none}.fo-discount-input [data-fo-prefix]{border-right:1px solid var(--ctl)}.fo-discount-input [data-fo-suffix]{border-left:1px solid var(--ctl)}.fo-discount-input input{width:100%;min-width:0;height:100%;border:0;outline:0;padding:0 9px;background:#fff;color:var(--ink);font:inherit;font-size:13px}.fo-discount-input input:disabled{background:var(--panel);color:var(--ink-muted);cursor:not-allowed}.fo-type:disabled{cursor:not-allowed;opacity:.55}.fo-summary:has(small:only-child){grid-template-columns:1fr}.fo-summary:has(small:only-child) strong{grid-column:1/-1}' +
    '.fn-offer-summary{margin-top:7px;font-size:11.5px;line-height:1.35;color:#2c6c4f;background:#edf9f1;border-radius:6px;padding:5px 7px}' +
    '@media(max-width:960px){.fj-summary-grid{grid-template-columns:1fr 1fr}.fj-summary-grid>div:nth-child(3){border-left:0;padding-left:0}.fj-traffic-list{grid-template-columns:1fr 1fr}}@media(max-width:680px){.fj-card-head,.fj-journey-head{display:block}.fj-card-head .btn,.fj-journey-head .btn{margin-top:12px}.fj-summary-actions{justify-content:flex-start}.fj-summary-grid{grid-template-columns:1fr}.fj-summary-grid>div,.fj-summary-grid>div+div{border-left:0;border-bottom:1px solid var(--hair);padding:11px 0}.fj-summary-grid>div:last-child{border-bottom:0}.fj-stages{grid-template-columns:1fr;overflow:visible}.fj-stage{min-width:0;min-height:0}.fj-traffic-list{grid-template-columns:1fr}.fo-grid{grid-template-columns:1fr}}' +
  '</style>';

  // A/B test (split testing) — boss-requested; the Checkout Champ core feature.
  const XSTYLE = '<style>' +
    '.xp-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px;flex-wrap:wrap}' +
    '.xp-list{display:flex;flex-direction:column;gap:12px}' +
    '.xp-card{border:1px solid var(--hair);border-radius:12px;padding:15px 17px;cursor:pointer;transition:box-shadow .15s,border-color .15s;background:#fff}' +
    '.xp-card:hover{box-shadow:var(--float-shadow);border-color:#d4d8de}' +
    '.xp-card-top{display:flex;align-items:center;gap:9px;margin-bottom:4px;flex-wrap:wrap}.xp-name{font-size:15px;font-weight:700;color:var(--ink)}' +
    '.xp-meta{font-size:12px;color:var(--ink-muted);margin-bottom:12px}' +
    '.xp-vs{display:grid;grid-template-columns:1fr 30px 1fr;align-items:stretch;gap:10px}' +
    '.xp-v{border:1px solid var(--hair);border-radius:9px;padding:9px 11px}.xp-v.lead{border-color:#bfe3cd;background:#f4fbf6}' +
    '.xp-v-h{display:flex;align-items:center;gap:7px;margin-bottom:4px}' +
    '.xp-v-badge{width:18px;height:18px;border-radius:5px;display:grid;place-items:center;font-size:11px;font-weight:800;color:#fff;background:#5b6470;flex:none}' +
    '.xp-v.A .xp-v-badge{background:#2b62d6}.xp-v.B .xp-v-badge{background:#7b4bd0}' +
    '.xp-v-name{font-size:13px;font-weight:600;color:var(--ink)}' +
    '.xp-v-metric{font-size:21px;font-weight:700;color:var(--ink);letter-spacing:-.5px;margin-top:2px}.xp-v-sub{font-size:11.5px;color:var(--ink-muted)}' +
    '.xp-vsx{display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--ink-muted)}' +
    '.xp-right{display:flex;gap:20px;align-items:center;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}' +
    '.xp-stat{text-align:right}.xp-stat .l{font-size:11px;color:var(--ink-muted)}.xp-stat .v{font-size:15px;font-weight:700;color:var(--ink)}.xp-up{color:#1f8f4e}' +
    '.xp-back{font-size:13px;color:var(--brand);text-decoration:none;display:inline-block;margin-bottom:12px}' +
    '.xp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:14px 0}' +
    '.xp-rv{border:1px solid var(--hair);border-radius:12px;padding:16px 18px;position:relative}.xp-rv.win{border-color:#bfe3cd;background:#f4fbf6}' +
    '.xp-rv-win{position:absolute;top:13px;right:13px;font-size:11px;font-weight:700;color:#1f8f4e;background:#e7f7ee;border-radius:6px;padding:3px 9px}' +
    '.xp-rv-h{display:flex;align-items:center;gap:8px;margin-bottom:9px;flex-wrap:wrap}' +
    '.xp-rv-metric{font-size:34px;font-weight:800;color:var(--ink);letter-spacing:-1px;line-height:1}.xp-rv-ml{font-size:12px;color:var(--ink-muted);margin-bottom:13px}' +
    '.xp-rv-row{display:flex;justify-content:space-between;font-size:12.5px;padding:6px 0;border-top:1px solid var(--hair)}.xp-rv-row .k{color:var(--ink-muted)}.xp-rv-row .v{font-weight:600;color:var(--ink)}' +
    '.xp-sum{border:1px solid var(--hair);border-radius:12px;padding:15px 17px;margin-bottom:6px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}' +
    '.xp-bar{flex:1;min-width:230px}.xp-bar-row{display:flex;align-items:center;gap:9px;margin:6px 0}' +
    '.xp-bar-row .lbl{width:18px;font-size:11px;font-weight:800;color:#fff;border-radius:4px;text-align:center;padding:2px 0}' +
    '.xp-bar-track{flex:1;height:14px;background:#eef0f2;border-radius:7px;overflow:hidden}.xp-bar-fill{height:100%;border-radius:7px;transition:width .4s}' +
    '.xp-bar-val{width:58px;text-align:right;font-size:12.5px;font-weight:700;color:var(--ink)}' +
    '.xp-modal{position:fixed;inset:0;background:rgba(20,24,32,.45);z-index:80;display:flex;align-items:center;justify-content:center;padding:20px}' +
    '.xp-mc{background:#fff;border-radius:14px;width:560px;max-width:100%;max-height:90vh;overflow:auto;box-shadow:var(--float-shadow)}' +
    '.xp-mh{padding:16px 20px;border-bottom:1px solid var(--hair);font-size:16px;font-weight:700;color:var(--ink)}' +
    '.xp-mb{padding:18px 20px;display:flex;flex-direction:column;gap:14px}' +
    '.xp-f{display:flex;flex-direction:column;gap:6px}.xp-f label{font-size:12.5px;font-weight:600;color:var(--ink)}' +
    '.xp-f input,.xp-f select{box-sizing:border-box;height:38px;border:1px solid var(--line);border-radius:8px;padding:0 11px;font-size:13.5px;color:var(--ink);background:#fff}.xp-f select{cursor:pointer}.xp-f input:focus,.xp-f select:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 2px rgb(0 102 230 / 12%)}' +
    '.xp-split{display:flex;align-items:center;gap:12px}.xp-split input[type=range]{flex:1}' +
    '.xp-mf{padding:14px 20px;border-top:1px solid var(--hair);display:flex;justify-content:flex-end;gap:9px}' +
    '@media(max-width:760px){.xp-grid2{grid-template-columns:1fr}.xp-vs{grid-template-columns:1fr}.xp-vsx{display:none}}' +
  '</style>';

  const SECTIONS = [
    { key: '',              label: 'Overview',         route: '#/bestcheckout' },
    { key: 'checkout',      label: 'Checkout design',  route: '#/bestcheckout/checkout' },
    { key: 'thankyou',      label: 'Thank-you design', route: '#/bestcheckout/thankyou' },
    { key: 'post-purchase', label: 'Post-purchase',    route: '#/bestcheckout/post-purchase' },
    { key: 'connect',       label: 'Connection',       route: '#/bestcheckout/connect' },
  ];
  // Sections are navigated from the sidebar second-level menu (PLUGGABLE_APPS children) — no in-page tabs.
  const subnav = () => '';
  // Use t() up-front for the surrounding English text so the bcI18n textNode walker
  // doesn't choke on a "漏斗 · External checkout on" mixed string it can't dict-match.
  const head = (sub) => {
    const title = (sub === t('Funnel') || sub === 'Funnel' || sub === 'Shopify connection') ? sub : 'BestCheckout';
    const meta = title === 'BestCheckout' ? '<div class="bc-sub">' + sub + '<span class="bc-dot">·</span>' + t('External checkout on') + ' <b>lavender-labs.myshopify.com</b><span class="bc-dot">·</span>' + t('orders write back to Shopify') + '</div>' : '';
    return '<div class="bc-head"><div class="bc-h1">' + title + '</div>' + meta + '</div>';
  };
  const chip = (text, cls) => '<span class="bc-chip ' + cls + '"><span class="d"></span>' + esc(text) + '</span>';
  const wrap = (inner) => '<div class="view-wrap">' + STYLE + inner + '</div>';
  const money = (n) => '$' + Number(n).toFixed(2);

  const statusChip = (s) => ({
    active: chip('Active', 'blue'), trial: chip('Trial', 'amber'), recycle: chip('Recycle', 'amber'),
    cancelled: chip('Cancelled', 'gray'), recycle_failed: chip('Recycle failed', 'red'),
    backup: chip('Backup', 'gray'), on: chip('On', 'green'), off: chip('Off', 'gray'),
  }[s] || chip(s, 'gray'));

  // ============ Shopify authorization — the first-run INITIALIZATION flow ============
  // Shown until the store is connected (bcConnected() === false). Four steps:
  // store URL → OAuth consent (scopes) → import progress → connected. This is the
  // on-ramp; once authorized the merchant works inside the full BestShopio platform.
  const CF = { step: 'store', store: 'lavender-labs.myshopify.com' };
  const CFSTYLE = '<style>' +
    '.cf{max-width:560px;margin:20px auto}' +
    '.cf-card{border:1px solid var(--hair);border-radius:14px;background:#fff;padding:26px 26px 22px;box-shadow:0 1px 2px rgba(20,30,50,.04)}' +
    '.cf-steps{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:18px}' +
    '.cf-dot{width:7px;height:7px;border-radius:50%;background:var(--ctl);transition:all .2s}.cf-dot.on{background:var(--brand);width:22px;border-radius:4px}' +
    '.cf-sb{width:46px;height:46px;border-radius:12px;background:#95bf47;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;margin:0 auto 14px}' +
    '.cf-h{font-size:20px;font-weight:700;color:var(--ink);text-align:center}' +
    '.cf-p{font-size:13px;color:var(--ink-muted);text-align:center;margin:8px auto 18px;line-height:1.6;max-width:440px}' +
    '.cf-fl{font-size:12px;color:var(--ink-muted);margin:0 0 6px;font-weight:600}' +
    '.cf-in{width:100%;height:40px;border:1px solid var(--ctl);border-radius:9px;padding:0 12px;font-size:13.5px;background:#fff;color:var(--ink)}' +
    '.cf-plats{display:flex;gap:8px;margin:14px 0 2px}' +
    '.cf-plat{flex:1;border:1px solid var(--hair);border-radius:9px;padding:10px 8px;text-align:center;font-size:12.5px;font-weight:600;color:var(--ink)}' +
    '.cf-plat.on{border-color:var(--brand);box-shadow:0 0 0 2px rgba(0,102,230,.12)}.cf-plat.soon{color:var(--ink-muted);background:var(--panel);font-weight:500}' +
    '.cf-scope{display:flex;gap:9px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--hair)}.cf-scope:first-of-type{border-top:0}.cf-scope svg{color:#1f8f4e;flex:none;margin-top:2px}.cf-scope .k{font-size:13px;color:var(--ink)}' +
    '.cf-sync{display:flex;align-items:center;gap:11px;padding:8px 0;font-size:13px;color:var(--ink)}.cf-sync .ck{width:20px;height:20px;border-radius:50%;background:#e7f7ee;color:#1f8f4e;display:flex;align-items:center;justify-content:center;flex:none;opacity:0;transform:scale(.5);animation:cfpop .3s ease forwards}.cf-sync .ck svg{width:12px;height:12px}' +
    '@keyframes cfpop{to{opacity:1;transform:scale(1)}}' +
    '.cf-bar{height:6px;border-radius:999px;background:var(--panel);overflow:hidden;margin:6px 0 16px}.cf-bar i{display:block;height:100%;background:var(--brand);width:8%;animation:cffill 2.1s ease forwards}@keyframes cffill{to{width:100%}}' +
    '.cf-done-ic{width:56px;height:56px;border-radius:50%;background:#e7f7ee;color:#1f8f4e;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}.cf-done-ic svg{width:30px;height:30px}' +
    '.cf-sum{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin:2px 0 14px}' +
    '.cf-next{font-size:12.5px;color:var(--ink-muted);text-align:center;line-height:1.6;margin-bottom:4px}' +
    '.cf-foot{display:flex;justify-content:space-between;gap:10px;margin-top:20px}' +
    // The OAuth consent step is rendered as a full-screen, Shopify-looking page (it represents the
    // redirect to Shopify — in reality this screen is hosted by Shopify, not by us).
    '.cf-sf{position:fixed;inset:0;z-index:200;background:#f6f6f7;display:flex;flex-direction:column;overflow:auto}' +
    '.cf-sf-top{height:56px;background:#1a1a1a;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 22px;flex:none}' +
    '.cf-sf-l{display:flex;align-items:center;gap:9px;font-weight:700;font-size:15px}' +
    '.cf-sf-l .m{width:22px;height:22px;border-radius:6px;background:#95bf47;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px}' +
    '.cf-sf-shop{font-size:13px;color:#c9c9c9}' +
    '.cf-sf-body{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:42px 20px}' +
    '.cf-oauth{width:100%;max-width:600px;background:#fff;border:1px solid #e1e3e5;border-radius:14px;overflow:hidden}' +
    '.cf-oauth-h{display:flex;align-items:center;gap:13px;padding:20px 22px;border-bottom:1px solid #e1e3e5}' +
    '.cf-oauth-ico{width:46px;height:46px;border-radius:11px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex:none}' +
    '.cf-oauth-t{font-size:17px;font-weight:700;color:#1a1a1a}.cf-oauth-s{font-size:13px;color:#6d7175;margin-top:2px}' +
    '.cf-oauth-b{padding:18px 22px}.cf-oauth-lbl{font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:6px}' +
    '.cf-oauth-row{display:flex;gap:10px;padding:8px 0;font-size:13px;color:#1a1a1a;line-height:1.5}.cf-oauth-row svg{color:#008060;flex:none;margin-top:2px}' +
    '.cf-oauth-note{font-size:12px;color:#6d7175;background:#f6f6f7;border-radius:8px;padding:11px 13px;margin-top:14px;line-height:1.55}' +
    '.cf-oauth-f{display:flex;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid #e1e3e5}' +
    '.cf-btn-sf{height:38px;padding:0 18px;border-radius:8px;border:0;background:#008060;color:#fff;font-size:13.5px;font-weight:600;cursor:pointer}.cf-btn-sf:hover{background:#006e52}' +
    '.cf-btn-ghost{height:38px;padding:0 16px;border-radius:8px;border:1px solid #babfc3;background:#fff;color:#1a1a1a;font-size:13.5px;font-weight:600;cursor:pointer}.cf-btn-ghost:hover{background:#f6f6f7}' +
  '</style>';
  const cfDots = (n) => '<div class="cf-steps">' + [0, 1, 2, 3].map((i) => '<span class="cf-dot' + (i === n ? ' on' : '') + '"></span>').join('') + '</div>';
  function cfStepStore() {
    return cfDots(0) + '<div class="cf-sb">S</div><div class="cf-h">' + t('Connect your Shopify store') + '</div>' +
      '<div class="cf-p">' + t('BestCheckout installs as a private app via OAuth — no App Store listing, no review. We auto-sync products, discounts, shipping and customers from Shopify, and write paid orders back to Shopify.') + '</div>' +
      '<div class="cf-fl">' + t('Your Shopify store URL') + '</div><input class="cf-in" id="cf-store" value="' + esc(CF.store) + '" placeholder="your-store.myshopify.com">' +
      '<div class="cf-plats"><div class="cf-plat on">Shopify</div><div class="cf-plat soon">WooCommerce · ' + t('soon') + '</div><div class="cf-plat soon">BigCommerce · ' + t('soon') + '</div></div>' +
      '<div class="cf-foot"><span></span><button class="btn btn-primary" data-cf="authorize">' + t('Continue to Shopify') + '</button></div>';
  }
  // Rendered as a full-screen, Shopify-hosted-looking page — this represents the redirect to
  // Shopify's own OAuth consent screen (in reality Shopify hosts this, not BestShopio).
  function cfStepAuthorize() {
    const access = [
      ['Products & collections', 'View products, collections and inventory'],
      ['Orders', 'View and create orders — write paid orders back for fulfillment'],
      ['Discounts', 'View discounts and price rules'],
      ['Shipping', 'View shipping zones and rates'],
      ['Customers', 'View customers'],
    ];
    const list = access.map((a) => '<div class="cf-oauth-row">' + I.check + '<div><b style="font-weight:600">' + t(a[0]) + '</b> — <span style="color:#6d7175">' + t(a[1]) + '</span></div></div>').join('');
    return '<div class="cf-sf">' +
      '<div class="cf-sf-top"><div class="cf-sf-l"><span class="m">S</span>Shopify</div><div class="cf-sf-shop">' + esc(CF.store) + '</div></div>' +
      '<div class="cf-sf-body"><div class="cf-oauth">' +
        '<div class="cf-oauth-h"><div class="cf-oauth-ico">B</div><div><div class="cf-oauth-t">' + t('Install BestCheckout?') + '</div><div class="cf-oauth-s">' + esc(CF.store) + ' · ' + t('by Bestfulfill') + '</div></div></div>' +
        '<div class="cf-oauth-b"><div class="cf-oauth-lbl">' + t('BestCheckout will be able to:') + '</div>' + list +
          '<div class="cf-oauth-note">' + t('This is a custom (private) app installed via a one-time link — it is not listed on the Shopify App Store. By clicking Install, you grant the access above; you can uninstall anytime from Settings → Apps.') + '</div>' +
        '</div>' +
        '<div class="cf-oauth-f"><button class="cf-btn-ghost" data-cf="store">' + t('Cancel') + '</button><button class="cf-btn-sf" data-cf="syncing">' + t('Install app') + '</button></div>' +
      '</div></div>' +
    '</div>';
  }
  function cfStepSyncing() {
    const items = [t('Access granted (OAuth)'), t('Syncing products') + ' (1,310)', t('Syncing collections') + ' (48)', t('Syncing discounts') + ' (23)', t('Syncing shipping rates') + ' (9)', t('Registering webhooks'), t('Building the catalog mapping')];
    const rows = items.map((it, i) => '<div class="cf-sync"><span class="ck" style="animation-delay:' + (0.15 + i * 0.27).toFixed(2) + 's">' + I.check + '</span>' + esc(it) + '</div>').join('');
    return cfDots(2) + '<div class="cf-h">' + t('Connecting to') + ' ' + esc(CF.store) + '…</div>' +
      '<div class="cf-p">' + t('Syncing your catalog and registering webhooks — this usually takes a few seconds.') + '</div>' +
      '<div class="cf-bar"><i></i></div>' + rows;
  }
  function cfStepDone() {
    const chips = ['1,310 ' + t('products'), '48 ' + t('collections'), '23 ' + t('discounts'), '9 ' + t('shipping rates')].map((c) => chip(c, 'green')).join('');
    return cfDots(3) + '<div class="cf-done-ic">' + I.check + '</div><div class="cf-h">' + t('You’re connected!') + '</div>' +
      '<div class="cf-p">' + t('Your Shopify catalog is now synced into BestShopio. BestCheckout uses it for checkout, while paid orders write back automatically.') + '</div>' +
      '<div class="cf-sum">' + chips + '</div>' +
      '<div class="cf-next">' + t('Next: connect payments · set your checkout domain · turn on checkout injection · build your first funnel.') + '</div>' +
      '<div class="cf-foot" style="justify-content:center"><button class="btn btn-primary" data-cf="enter">' + t('Enter BestCheckout') + '</button></div>';
  }
  function renderConnectFlow() {
    if (CF.step === 'authorize') {
      root.innerHTML = wrap(CFSTYLE + cfStepAuthorize()); // full-screen Shopify-looking consent page
    } else {
      const body = CF.step === 'syncing' ? cfStepSyncing() : CF.step === 'done' ? cfStepDone() : cfStepStore();
      root.innerHTML = wrap(CFSTYLE + '<div class="cf"><div class="cf-card">' + body + '</div></div>');
    }
    root.querySelectorAll('[data-cf]').forEach((b) => b.onclick = () => {
      const to = b.getAttribute('data-cf');
      const inp = root.querySelector('#cf-store'); if (inp && inp.value.trim()) CF.store = inp.value.trim();
      if (to === 'enter') { setBcConnected(true); CF.step = 'store'; toast(t('Connected to Shopify')); location.hash = '#/bestcheckout'; renderOverview(); return; }
      CF.step = to; renderConnectFlow();
    });
    // Auto-advance import → connected. Guard on the progress bar still being on screen (so we
    // don't overwrite another view if the user navigated away) — NOT on connected state, since
    // the demo entry (#/bestcheckout/onboarding) runs this flow even while already connected.
    if (CF.step === 'syncing') { setTimeout(function () { if (CF.step === 'syncing' && document.querySelector('.cf-bar')) { CF.step = 'done'; renderConnectFlow(); } }, 2300); }
    bcI18n(root);
  }

  // ===================== ACTIVATION CHECKLIST (onboarding card on Overview) =====================
  // Lives at the top of the Overview page. Hides itself once all 9 steps are done. Each step's
  // completion is read live from setup state, so jumping into Connection/Settings and back here
  // shows fresh progress (no manual marking). Branch question for payment is inline.
  function paymentBranchQuestion(s) {
    var accounts = s.payment_accounts || [];
    var chip = function (key, label) {
      var on = accounts.indexOf(key) >= 0;
      return '<button class="bc-onb-chip ' + (on ? 'on' : '') + '" data-onb-pay="' + key + '">' + (on ? '✓ ' : '') + t(label) + '</button>';
    };
    var rec = '';
    if (accounts.length === 0) {
      rec = '<div class="bc-onb-rec muted">' + t('Tell us what you have — we’ll recommend the right combo.') + '</div>';
    } else if (accounts.indexOf('none') >= 0) {
      rec = '<div class="bc-onb-rec">' + t('No problem — Airwallex is easiest to apply for. Stripe is fastest in most regions.') + '</div>';
    } else {
      var lines = [];
      if (accounts.indexOf('stripe') >= 0) lines.push('<b>Stripe</b> → ' + t('processes Card · Apple Pay · Google Pay'));
      if (accounts.indexOf('airwallex') >= 0) lines.push('<b>Airwallex</b> → ' + t('processes Card · Apple Pay · Google Pay'));
      if (accounts.indexOf('paypal') >= 0) lines.push('<b>PayPal</b> → ' + t('use PayPal Advanced for Card. Note: PayPal Express wallet is paused for IG/FB compat.'));
      rec = '<div class="bc-onb-rec">' + lines.join('<br>') + '</div>';
    }
    var cta = (accounts.length > 0 && accounts.indexOf('none') < 0)
      ? '<a class="btn btn-primary" href="#/payments">' + t('Connect now') + '</a>'
      : (accounts.indexOf('none') >= 0 ? '<a class="btn btn-default" href="https://airwallex.com" target="_blank">' + t('Apply for Airwallex') + '</a>' : '');
    return '<div class="bc-onb-branch">' +
      '<div class="bc-onb-q">' + t('Which payment accounts do you have?') + '</div>' +
      '<div class="bc-onb-chips">' + chip('stripe', 'Stripe') + chip('airwallex', 'Airwallex') + chip('paypal', 'PayPal') + chip('none', 'None yet') + '</div>' +
      rec + (cta ? '<div style="margin-top:8px">' + cta + '</div>' : '') +
    '</div>';
  }
  function renderOnboardingCard() {
    var p = bcSetupProgress();
    if (p.done >= p.total) return '';            // all 9 done → hide entirely
    var s = p.setup;
    if (s.collapsed) {
      return '<div class="bc-onb bc-onb-collapsed" data-onb="expand">' +
        '<span class="bc-onb-rocket">🚀</span> <b>' + t('Activation progress') + '</b> ' +
        '<span class="bc-onb-meta">' + p.done + '/' + p.total + '</span>' +
        (p.requiredLeft > 0 ? ' · ' + t('Required left') + ': ' + p.requiredLeft : '') +
        '<span class="bc-onb-tog">▼</span>' +
      '</div>';
    }
    var firstPendingIdx = -1;
    for (var i = 0; i < SETUP_STEPS.length; i++) { if (!SETUP_STEPS[i].check(s)) { firstPendingIdx = i; break; } }
    var head =
      '<div class="bc-onb">' +
        '<div class="bc-onb-head">' +
          '<div class="bc-onb-h-l"><span class="bc-onb-rocket">🚀</span> <b>' + t('Get BestCheckout live') + '</b></div>' +
          '<div class="bc-onb-meta">' + p.done + '/' + p.total + ' ' + t('done') + '</div>' +
          '<button class="bc-onb-tog btn btn-default" data-onb="collapse" title="' + t('Collapse') + '">−</button>' +
        '</div>' +
        '<div class="bc-onb-sub">' +
          (p.requiredLeft > 0 ? t('Required to launch') + ': ' + p.requiredLeft + ' ' + t('more steps') : t('All required steps done — your funnel is ready to take orders.')) +
        '</div>' +
        '<div class="bc-onb-bar"><span style="width:' + Math.round(p.done / p.total * 100) + '%"></span></div>';
    var steps = SETUP_STEPS.map(function (st, i) {
      var done = st.check(s);
      var current = !done && i === firstPendingIdx;
      var cls = done ? 'done' : current ? 'current' : 'pending';
      var icon = done ? '✓' : (current ? '◐' : '○');
      var ctaBtn = '';
      if (!done) {
        if (st.custom === 'payment') ctaBtn = paymentBranchQuestion(s);
        else if (st.mark) ctaBtn = '<button class="btn btn-default" data-onb-mark="' + st.mark + '">' + t(st.cta) + '</button>';
        else if (st.hash) ctaBtn = '<a class="btn ' + (current ? 'btn-primary' : 'btn-default') + '" href="' + st.hash + '">' + t(st.cta) + '</a>';
      }
      var optional = !st.required ? ' <span class="bc-onb-opt">' + t('(recommended)') + '</span>' : '';
      return '<div class="bc-onb-step ' + cls + '">' +
        '<div class="bc-onb-step-h">' +
          '<span class="bc-onb-icon">' + icon + '</span>' +
          '<div class="bc-onb-text"><b>' + t(st.label) + '</b>' + optional +
            (st.hint ? '<div class="bc-onb-hint">' + t(st.hint) + '</div>' : '') +
          '</div>' +
          (!current && ctaBtn && !st.custom ? '<div class="bc-onb-actions">' + ctaBtn + '</div>' : '') +
        '</div>' +
        (current && ctaBtn ? '<div class="bc-onb-current-actions">' + ctaBtn + '</div>' : '') +
      '</div>';
    }).join('');
    return head + '<div class="bc-onb-steps">' + steps + '</div></div>';
  }
  function wireOnboardingCard(scope) {
    scope = scope || root;
    scope.querySelectorAll('[data-onb]').forEach(function (b) { b.onclick = function () {
      var s = bcSetup(); s.collapsed = b.getAttribute('data-onb') === 'collapse'; bcSetupSave(s); renderOverview();
    }; });
    scope.querySelectorAll('[data-onb-pay]').forEach(function (b) { b.onclick = function () {
      var key = b.getAttribute('data-onb-pay'); var s = bcSetup(); var accts = s.payment_accounts || [];
      if (key === 'none') { accts = accts.indexOf('none') >= 0 ? [] : ['none']; }
      else { var i = accts.indexOf(key); if (i >= 0) accts.splice(i, 1); else accts = accts.filter(function (x) { return x !== 'none'; }).concat([key]); }
      s.payment_accounts = accts; bcSetupSave(s); renderOverview();
    }; });
    scope.querySelectorAll('[data-onb-mark]').forEach(function (b) { b.onclick = function () {
      var s = bcSetup(); s[b.getAttribute('data-onb-mark')] = true; bcSetupSave(s); toast(t('Marked complete')); renderOverview();
    }; });
  }

  // ===================== OVERVIEW =====================
  function renderOverview() {
    if (!bcConnected()) { if (CF.step === 'done') CF.step = 'store'; renderConnectFlow(); return; }
    const banner = ''; // 一键迁移 (one-click migration) is a Phase-2 unlock, not in 1.0
    const kpis = D.KPIS.map((k) => {
      const dcls = k.delta.trim().charAt(0) === '-' ? (k.good === 'down' ? 'up' : 'down') : 'up';
      return '<div class="panel bc-kpi"><div class="bc-kpi-l">' + esc(k.label) + '</div>' +
        '<div class="bc-kpi-v">' + esc(k.value) + '</div>' +
        '<div class="bc-kpi-row"><span class="bc-delta ' + dcls + '">' + I.up + esc(k.delta) + '</span></div>' +
        '<div class="bc-kpi-s">' + esc(k.sub) + '</div></div>';
    }).join('');
    const recs = D.AI_RECS.map((r) => '<div class="bc-rec ' + r.tone + '"><span class="ic">' + I.ai + '</span>' +
      '<div><div class="t">' + esc(r.title) + '</div><div class="m">' + esc(r.impact) + '</div></div></div>').join('');
    const acts = D.ACTIVITY.map((a) => '<div class="bc-act"><span class="av bc-chip ' + a.tone + '" style="border-radius:50%">' + esc(a.who.charAt(0)) + '</span>' +
      '<div class="at"><b>' + esc(a.who) + '</b> ' + esc(a.what) + '<div class="aw">' + esc(a.when) + '</div></div>' + chip(a.tag, a.tone) + '</div>').join('');

    root.innerHTML = wrap(
      head('Overview') + subnav('') + banner +
      renderOnboardingCard() +
      '<div class="bc-kpis">' + kpis + '</div>' +
      '<div class="bc-grid2">' +
        '<div class="panel card-pad"><div class="card-title" style="margin-bottom:6px">Checkout performance</div>' +
          '<div class="muted" style="font-size:12.5px;margin-bottom:10px">Checkout conversion &amp; orders captured — last 30 days.</div>' +
          '<div id="bc-chart" style="height:300px"></div></div>' +
        '<div class="panel card-pad"><div class="flex items-center justify-between" style="margin-bottom:12px"><div class="card-title">AI recommendations</div><a class="muted" style="font-size:12.5px" href="#/bestcheckout/post-purchase">View all</a></div>' + recs + '</div>' +
      '</div>' +
      '<div class="panel card-pad" style="margin-top:18px"><div class="card-title" style="margin-bottom:6px">Recent high-impact activity</div>' + acts + '</div>'
    );

    setTimeout(() => {
      const el = document.getElementById('bc-chart');
      if (!el || !window.echarts) return;
      chart = window.echarts.init(el);
      chart.setOption({
        grid: { left: 44, right: 48, top: 24, bottom: 30 },
        tooltip: { trigger: 'axis' },
        legend: { data: [t('Checkout conversion'), t('Orders')], right: 0, top: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 12 } },
        xAxis: { type: 'category', data: D.TREND.dates, axisLine: { lineStyle: { color: '#d8dce2' } }, axisLabel: { fontSize: 11, color: '#8a93a0' } },
        yAxis: [
          { type: 'value', min: 50, max: 70, axisLabel: { formatter: '{value}%', fontSize: 11, color: '#8a93a0' }, splitLine: { lineStyle: { color: '#eef0f3' } } },
          { type: 'value', axisLabel: { fontSize: 11, color: '#8a93a0' }, splitLine: { show: false } },
        ],
        series: [
          { name: t('Orders'), type: 'bar', yAxisIndex: 1, data: D.TREND.orders, barWidth: 14, itemStyle: { color: '#dbe7fb', borderRadius: [3, 3, 0, 0] } },
          { name: t('Checkout conversion'), type: 'line', smooth: true, data: D.TREND.conversion, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: '#3b6fd4' }, itemStyle: { color: '#3b6fd4' }, areaStyle: { color: 'rgba(59,111,212,.08)' } },
        ],
      });
    }, 0);
    wireOnboardingCard(root);
  }

  // ===================== PERFORMANCE =====================
  // This is a merchant decision page, rather than the generic report catalogue
  // used elsewhere in BestShopio. It connects sales results to the flows and
  // offers that produced them.
  var PERFORMANCE_PERIODS = {
    '7d': {
      label: 'Last 7 days', sales: '$117,284', salesDelta: '+16.7%', orders: '2,016', ordersDelta: '+14.9%', conversion: '63.8%', conversionDelta: '+4.7 pts', offerRevenue: '$15,448', offerShare: '13.2%',
      chart: [13200, 14860, 15520, 16140, 17280, 18310, 21974], chartLabels: ['Jul 9', 'Jul 10', 'Jul 11', 'Jul 12', 'Jul 13', 'Jul 14', 'Jul 15'],
      flows: [
        { name: 'First-order boost', sessions: '742', orders: '498', conversion: '67.1%', aov: '$62.40', sales: '$31,075', lift: '+6.4 pts', id: 'first-order-boost' },
        { name: 'Smooth checkout', sessions: '1,274', orders: '812', conversion: '63.7%', aov: '$55.75', sales: '$45,269', lift: '+4.1 pts', id: 'smooth-checkout' }
      ]
    },
    '30d': {
      label: 'Last 30 days', sales: '$490,044', salesDelta: '+18.4%', orders: '8,420', ordersDelta: '+17.8%', conversion: '64.2%', conversionDelta: '+5.1 pts', offerRevenue: '$63,180', offerShare: '12.9%',
      chart: [14120, 15240, 14980, 16040, 17120, 16980, 18140, 18820, 20160, 21040, 21870, 23120], chartLabels: ['Jun 24', 'Jun 27', 'Jun 30', 'Jul 3', 'Jul 6', 'Jul 9', 'Jul 12', 'Jul 15'],
      flows: [
        { name: 'First-order boost', sessions: '3,116', orders: '2,116', conversion: '67.9%', aov: '$62.40', sales: '$132,038', lift: '+6.4 pts', id: 'first-order-boost' },
        { name: 'Smooth checkout', sessions: '5,304', orders: '3,405', conversion: '64.2%', aov: '$55.75', sales: '$189,859', lift: '+4.8 pts', id: 'smooth-checkout' }
      ]
    },
    '90d': {
      label: 'Last 90 days', sales: '$1,367,890', salesDelta: '+15.2%', orders: '23,470', ordersDelta: '+13.6%', conversion: '62.9%', conversionDelta: '+4.3 pts', offerRevenue: '$166,740', offerShare: '12.2%',
      chart: [138800, 143220, 148140, 150680, 154920, 160140, 163480, 169030, 174920, 181340, 187220, 196000], chartLabels: ['Apr 17', 'May 1', 'May 15', 'May 29', 'Jun 12', 'Jun 26', 'Jul 10', 'Jul 15'],
      flows: [
        { name: 'First-order boost', sessions: '8,576', orders: '5,742', conversion: '66.9%', aov: '$62.18', sales: '$357,082', lift: '+5.9 pts', id: 'first-order-boost' },
        { name: 'Smooth checkout', sessions: '14,894', orders: '9,373', conversion: '62.9%', aov: '$55.94', sales: '$524,404', lift: '+4.2 pts', id: 'smooth-checkout' }
      ]
    }
  };
  function performanceChart(period) {
    var values = period.chart, min = Math.min.apply(null, values), max = Math.max.apply(null, values), span = Math.max(1, max - min);
    var points = values.map(function (value, index) { return (index * (640 / (values.length - 1))).toFixed(1) + ',' + (160 - ((value - min) / span) * 116).toFixed(1); }).join(' ');
    var area = '0,180 ' + points + ' 640,180';
    var labels = period.chartLabels.map(function (label) { return '<span>' + esc(label) + '</span>'; }).join('');
    return '<div class="pf-chart" role="img" aria-label="' + t('Sales trend') + '"><div class="pf-chart-axis"><span>' + esc('$' + Math.round(max / 1000) + 'k') + '</span><span>' + esc('$' + Math.round((min + span * .55) / 1000) + 'k') + '</span><span>' + esc('$' + Math.round(min / 1000) + 'k') + '</span></div><div class="pf-plot"><svg viewBox="0 0 640 180" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pfFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2b62d6" stop-opacity=".22"/><stop offset="1" stop-color="#2b62d6" stop-opacity="0"/></linearGradient></defs><line x1="0" y1="22" x2="640" y2="22"/><line x1="0" y1="91" x2="640" y2="91"/><line x1="0" y1="160" x2="640" y2="160"/><polygon points="' + area + '" fill="url(#pfFill)"/><polyline points="' + points + '" fill="none" stroke="#2b62d6" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg></div><div class="pf-chart-labels">' + labels + '</div></div>';
  }
  function renderPerformance() {
    var period = PERFORMANCE_PERIODS[performanceRange] || PERFORMANCE_PERIODS['30d'];
    var tabs = ['7d', '30d', '90d'].map(function (id) { return '<button type="button" class="pf-range' + (performanceRange === id ? ' active' : '') + '" data-performance-range="' + id + '">' + t(PERFORMANCE_PERIODS[id].label) + '</button>'; }).join('');
    var metric = function (label, value, delta, note) { return '<article class="panel pf-metric"><small>' + t(label) + '</small><strong>' + esc(value) + '</strong><span class="pf-positive">' + I.up + esc(delta) + '</span><em>' + t(note) + '</em></article>'; };
    var flowRows = period.flows.map(function (flow) { return '<tr><td><a href="#/flows/' + esc(flow.id) + '">' + t(flow.name) + '</a><small>' + t('Live purchase flow') + '</small></td><td>' + esc(flow.sessions) + '</td><td><strong>' + esc(flow.orders) + '</strong></td><td><strong>' + esc(flow.conversion) + '</strong><small class="pf-positive">' + esc(flow.lift) + ' ' + t('vs Shopify') + '</small></td><td>' + esc(flow.aov) + '</td><td><strong>' + esc(flow.sales) + '</strong></td></tr>'; }).join('');
    var offerSales = performanceRange === '7d' ? ['$8,642', '$2,910', '$3,896'] : performanceRange === '30d' ? ['$35,120', '$11,240', '$16,820'] : ['$92,750', '$29,380', '$44,610'];
    var offers = [
      { type: 'Upsell', title: 'Sleep Bundle offer', rate: '21.4%', sales: offerSales[0], note: 'shoppers accepted after payment', tone: 'blue' },
      { type: 'Downsell', title: 'Half-size alternative', rate: '9.8%', sales: offerSales[1], note: 'recovered after the first offer was declined', tone: 'violet' },
      { type: 'Order bump', title: 'Shipping protection', rate: '38.2%', sales: offerSales[2], note: 'added during checkout', tone: 'amber' }
    ].map(function (offer) { return '<article class="pf-offer"><span class="pf-offer-tag ' + offer.tone + '">' + t(offer.type) + '</span><strong>' + t(offer.title) + '</strong><p>' + t(offer.note) + '</p><div><span><small>' + t('Accept rate') + '</small><b>' + esc(offer.rate) + '</b></span><span><small>' + t('Added sales') + '</small><b>' + esc(offer.sales) + '</b></span></div></article>'; }).join('');
    root.innerHTML = wrap('<style>' +
      '.pf-page{width:100%;max-width:none;padding-bottom:40px}.pf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px}.pf-head h1{margin:0;font-size:20px;font-weight:600;color:var(--ink)}.pf-head p{margin:6px 0 0;font-size:13px;line-height:1.5;color:var(--ink-muted)}.pf-ranges{display:inline-flex;gap:3px;padding:3px;border:1px solid var(--hair);background:#fff;border-radius:9px;white-space:nowrap}.pf-range{height:30px;padding:0 11px;border:0;border-radius:6px;background:transparent;color:var(--ink-muted);font-size:12px;cursor:pointer}.pf-range:hover{background:var(--panel);color:var(--ink)}.pf-range.active{background:#edf4ff;color:var(--brand);font-weight:650}.pf-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.pf-metric{padding:15px 16px;min-width:0}.pf-metric small,.pf-metric em{display:block;color:var(--ink-muted);font-size:12px;font-style:normal;line-height:1.45}.pf-metric strong{display:block;margin:7px 0 5px;color:var(--ink);font-size:24px;font-weight:700;letter-spacing:-.4px}.pf-positive{display:inline-flex;align-items:center;gap:3px;color:#16864f;font-size:12px;font-weight:650}.pf-positive svg{width:13px;height:13px}.pf-metric em{margin-top:6px}.pf-main-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(280px,.8fr);gap:16px;margin-bottom:16px}.pf-card{border:1px solid var(--hair);border-radius:12px;background:#fff}.pf-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 18px 0}.pf-card-head h2{margin:0;color:var(--ink);font-size:15px;font-weight:650}.pf-card-head p{margin:4px 0 0;color:var(--ink-muted);font-size:12px;line-height:1.45}.pf-compare{padding:5px 8px;border-radius:6px;background:#eaf7ef;color:#16734b;font-size:11.5px;font-weight:650;white-space:nowrap}.pf-chart{display:grid;grid-template-columns:42px minmax(0,1fr);padding:13px 18px 16px}.pf-chart-axis{display:flex;flex-direction:column;justify-content:space-between;padding:3px 7px 22px 0;color:var(--ink-muted);font-size:10px;text-align:right}.pf-plot{height:180px;min-width:0}.pf-plot svg{width:100%;height:100%;overflow:visible}.pf-plot line{stroke:#edf0f4;stroke-width:1}.pf-chart-labels{grid-column:2;display:flex;justify-content:space-between;gap:6px;color:var(--ink-muted);font-size:10px;margin-top:3px}.pf-insight{padding:17px 18px;display:flex;flex-direction:column}.pf-insight-kicker{color:var(--brand);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.pf-insight h2{margin:8px 0 6px;font-size:16px;line-height:1.4;color:var(--ink)}.pf-insight p{margin:0;color:var(--ink-body);font-size:13px;line-height:1.55}.pf-insight-result{margin:16px 0;padding:12px;border-radius:8px;background:#f5f8fd}.pf-insight-result span{display:block;color:var(--ink-muted);font-size:12px}.pf-insight-result strong{display:block;margin-top:4px;color:var(--ink);font-size:21px}.pf-insight-result small{display:block;margin-top:2px;color:#16864f;font-size:12px}.pf-insight .btn{margin-top:auto;align-self:flex-start;text-decoration:none}.pf-flow-card{margin-bottom:16px;overflow:hidden}.pf-flow-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 18px;border-bottom:1px solid var(--hair)}.pf-flow-head h2{margin:0;color:var(--ink);font-size:15px}.pf-flow-head p{margin:4px 0 0;color:var(--ink-muted);font-size:12px}.pf-flow-head a{color:var(--brand);font-size:12.5px;font-weight:600;text-decoration:none;white-space:nowrap}.pf-table-wrap{overflow:auto}.pf-table{width:100%;border-collapse:collapse;min-width:780px}.pf-table th{padding:10px 16px;background:var(--panel);color:var(--ink-muted);font-size:11.5px;font-weight:650;text-align:right;white-space:nowrap}.pf-table th:first-child{text-align:left}.pf-table td{padding:13px 16px;border-top:1px solid var(--hair);color:var(--ink-body);font-size:13px;text-align:right;white-space:nowrap}.pf-table td:first-child{text-align:left;min-width:190px}.pf-table a{color:var(--brand);font-weight:650;text-decoration:none}.pf-table td small{display:block;margin-top:3px;color:var(--ink-muted);font-size:11.5px}.pf-offer-section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.pf-offer{border:1px solid var(--hair);border-radius:12px;background:#fff;padding:15px 16px}.pf-offer-tag{display:inline-flex;padding:3px 7px;border-radius:999px;font-size:10.5px;font-weight:700}.pf-offer-tag.blue{background:#eaf2ff;color:#2766c6}.pf-offer-tag.violet{background:#f3edff;color:#7a4bc0}.pf-offer-tag.amber{background:#fff4dc;color:#a66a00}.pf-offer>strong{display:block;margin-top:9px;color:var(--ink);font-size:14px}.pf-offer p{min-height:34px;margin:4px 0 13px;color:var(--ink-muted);font-size:12px;line-height:1.4}.pf-offer>div{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:11px;border-top:1px solid var(--hair)}.pf-offer small{display:block;color:var(--ink-muted);font-size:11px}.pf-offer b{display:block;margin-top:4px;color:var(--ink);font-size:14px}.pf-trust{display:flex;align-items:flex-start;gap:9px;margin-top:16px;padding:12px 14px;border:1px solid #cbe7d6;border-radius:10px;background:#f2fbf6;color:#286445}.pf-trust i{display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;border:1px solid currentColor;border-radius:50%;font-family:Georgia,serif;font-style:italic;font-weight:700;flex:none}.pf-trust strong{display:block;font-size:12.5px}.pf-trust p{margin:3px 0 0;font-size:12px;line-height:1.45}@media(max-width:1060px){.pf-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pf-main-grid{grid-template-columns:1fr}.pf-offer-section{grid-template-columns:1fr}}@media(max-width:640px){.pf-head{display:block}.pf-ranges{margin-top:12px;max-width:100%;overflow:auto}.pf-metrics{grid-template-columns:1fr}.pf-chart{padding-left:12px;padding-right:12px}.pf-chart-labels span:nth-child(even){display:none}.pf-offer-section{grid-template-columns:1fr}}' +
      '</style><div class="pf-page"><header class="pf-head"><div><h1>' + t('Performance') + '</h1><p>' + t('See which purchase flows and offers are helping sales grow.') + '</p></div><div class="pf-ranges" role="group" aria-label="' + t('Data period') + '">' + tabs + '</div></header><section class="pf-metrics">' +
      metric('Sales through BestCheckout', period.sales, period.salesDelta, 'vs previous period') + metric('Completed orders', period.orders, period.ordersDelta, 'paid and sent to Shopify') + metric('Checkout conversion', period.conversion, period.conversionDelta, 'vs Shopify Checkout') + metric('Additional offer sales', period.offerRevenue, period.offerShare, 'of checkout sales') +
      '</section><section class="pf-main-grid"><article class="pf-card"><div class="pf-card-head"><div><h2>' + t('Sales trend') + '</h2><p>' + t('Completed checkout sales') + ' · ' + t(period.label) + '</p></div><span class="pf-compare">' + t('Sales growing') + ' ' + esc(period.salesDelta) + '</span></div>' + performanceChart(period) + '</article><aside class="pf-card pf-insight"><span class="pf-insight-kicker">' + t('This period') + '</span><h2>' + t('BestCheckout is converting more shoppers') + '</h2><p>' + t('Your checkout conversion is higher than the Shopify control group. Keep the current setup running, then test the next shopper segment.') + '</p><div class="pf-insight-result"><span>' + t('Checkout conversion') + '</span><strong>' + esc(period.conversion) + ' <small>' + esc(period.conversionDelta) + ' ' + t('vs Shopify') + '</small></strong></div><a class="btn btn-primary" href="#/flows">' + t('Review purchase flows') + '</a></aside></section><section class="pf-card pf-flow-card"><div class="pf-flow-head"><div><h2>' + t('Purchase flow performance') + '</h2><p>' + t('Compare the live journeys that shoppers actually enter.') + '</p></div><a href="#/flows">' + t('Manage purchase flows') + ' ›</a></div><div class="pf-table-wrap"><table class="pf-table"><thead><tr><th>' + t('Purchase flow') + '</th><th>' + t('Entered checkout') + '</th><th>' + t('Completed orders') + '</th><th>' + t('Conversion') + '</th><th>' + t('Average order value') + '</th><th>' + t('Sales') + '</th></tr></thead><tbody>' + flowRows + '</tbody></table></div></section><section class="pf-offer-section">' + offers + '</section><section class="pf-trust"><i>i</i><div><strong>' + t('How sales are counted') + '</strong><p>' + t('Sales are counted after payment succeeds. Paid orders are then sent to Shopify, so the result here matches the orders your team fulfills.') + '</p></div></section></div>');
    root.querySelectorAll('[data-performance-range]').forEach(function (button) { button.onclick = function () { performanceRange = button.getAttribute('data-performance-range'); renderPerformance(); }; });
    bcI18n(root);
  }

  // ===================== CONNECTION HUB (the Shopify bridge — Phase 1 only) =====================
  // Everything a full BestShopio merchant never needs lives here, in one removable place:
  // ① authorization (OAuth)  ② Shopify data auto-sync  ③ checkout injection (App Embed)  ④ checkout domain.
  const CSTYLE = '<style>' +
    '.cn-intro{display:flex;align-items:flex-start;gap:8px;margin:2px 0 14px;color:var(--ink-muted);font-size:12.5px;line-height:1.45}' +
    '.cn-intro .ic{width:22px;height:22px;border-radius:6px;background:#eef4ff;color:var(--brand);display:inline-flex;align-items:center;justify-content:center;flex:none;margin-top:1px}.cn-intro .txt{flex:1;min-width:0}.cn-intro .l{font-weight:700;color:var(--ink-body);margin-right:6px}.cn-intro .d{color:var(--ink-muted)}' +
    '.cn-secnav{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 18px}' +
    '.cn-secnav button{font-size:12.5px;color:var(--ink-body);background:var(--panel);border:1px solid var(--hair);border-radius:999px;padding:6px 13px;cursor:pointer}' +
    '.cn-secnav button:hover{border-color:var(--brand);color:var(--brand)}' +
    '.cn-sec{scroll-margin-top:14px;margin-bottom:18px}' +
    '.cn-sec-h{display:flex;align-items:center;gap:9px;margin:0 0 11px}.cn-sec-n{width:25px;height:25px;border-radius:7px;background:#eef4ff;color:var(--brand);font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none}.cn-sec-t{font-size:15px;font-weight:700;color:var(--ink)}.cn-sec-x{font-size:12px;color:var(--ink-muted)}' +
    '.cn-sb{width:40px;height:40px;border-radius:11px;background:#95bf47;color:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none;font-weight:800}' +
    '.cn-dir{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600}' +
    '.cn-dir.two{color:#2b62d6}.cn-dir.pull{color:#1f8f4e}.cn-dir.push{color:#7b4bd0}' +
    '.cn-entity{display:flex;align-items:center;gap:6px;min-width:0}.cn-help{position:relative;width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#eef4ff;color:var(--brand);font-size:11px;font-weight:800;line-height:1;cursor:help;flex:none}.cn-help:focus{outline:2px solid #cfe1ff;outline-offset:2px}.cn-help:hover .cn-tip,.cn-help:focus .cn-tip{opacity:1;visibility:visible;transform:translate(0,0)}.cn-tip{position:absolute;left:22px;bottom:50%;transform:translate(0,4px);width:280px;max-width:min(70vw,360px);padding:9px 10px;border:1px solid var(--hair);border-radius:8px;background:#242833;color:#fff;font-size:12px;font-weight:500;line-height:1.45;box-shadow:var(--float-shadow);opacity:0;visibility:hidden;transition:.12s;z-index:120;white-space:normal}.cn-tip:after{content:"";position:absolute;left:-5px;bottom:10px;transform:rotate(45deg);width:10px;height:10px;background:#242833}' +
    '.cn-ab{display:flex;height:32px;border-radius:9px;overflow:hidden;border:1px solid var(--hair);margin:2px 0 12px}.cn-ab>div{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}.cn-ab .a{background:#e8f0fe;color:#2b62d6}.cn-ab .b{background:var(--panel);color:var(--ink-muted)}' +
    '.cn-dns{display:grid;grid-template-columns:84px 120px 1fr auto;border:1px solid var(--hair);border-radius:9px;overflow:hidden;font-size:12.5px}.cn-dns>div{padding:9px 11px}.cn-dns .h{background:var(--panel);color:var(--ink-muted);font-weight:600;border-bottom:1px solid var(--hair)}.cn-dns .v{font-family:ui-monospace,Menlo,monospace;color:var(--ink);border-bottom:1px solid var(--hair)}.cn-dns .cp{border-bottom:1px solid var(--hair)}' +
    '.cn-rulegrid{display:grid;grid-template-columns:1fr;gap:10px;margin:10px 0 12px}.cn-rule{border:1px solid var(--hair);background:var(--panel);border-radius:8px;padding:10px 12px;font-size:12.5px;color:var(--ink-body);line-height:1.5}.cn-rule b{display:block;font-size:12.5px;color:var(--ink);margin-bottom:2px}' +
    '.cn-table-frame{border:1px solid var(--hair);border-radius:10px;background:#fff;overflow-x:auto;overflow-y:visible}.cn-table-frame .tbl{border-collapse:separate;border-spacing:0}.cn-table-frame .tbl tbody tr:last-child td{border-bottom:0}.cn-table-frame .tbl thead th:first-child{border-top-left-radius:10px}.cn-table-frame .tbl thead th:last-child{border-top-right-radius:10px}' +
    '.cn-scope{display:flex;gap:12px;padding:9px 0;border-top:1px solid var(--hair)}.cn-scope:first-child{border-top:0}.cn-scope .k{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--ink);min-width:250px;flex:none}.cn-scope .w{font-size:12px;color:var(--ink-muted)}' +
    '.cn-li{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-body);padding:4px 0}.cn-li svg{color:#1f8f4e;flex:none}' +
    '.cn-alert{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #f0d49a;background:#fff8eb;border-radius:10px;padding:11px 12px;margin-bottom:12px}.cn-alert.red{border-color:#f3c6bf;background:#fff3f1}.cn-alert.green{border-color:#cdeedb;background:#f2fbf6}.cn-alert .t{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;font-weight:700;color:var(--ink)}.cn-alert .d{font-size:12.5px;color:var(--ink-body);line-height:1.5;margin-top:2px}.cn-alert .btn{height:28px;font-size:12px;padding:0 10px;flex:none}' +
    '.cn-sync-issues{margin-top:14px;padding:8px;border:1px solid var(--hair);border-radius:8px;background:#fff;display:flex;flex-direction:column;gap:8px}.cn-sync-issues-h{font-size:12px;font-weight:700;color:var(--ink-muted);padding:1px 3px 0}.cn-sync-issues .cn-fix{border:0;border-radius:7px;margin:0;padding:10px 12px}.cn-sync-issues .cn-fix .m{display:block}' +
    '.cn-fix{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 12px;padding:11px 12px;border:1px solid var(--hair);border-radius:10px;font-size:12.5px}.cn-fix.red{background:#fff7f5;border-color:#f3c6bf}.cn-fix.amber{background:#fffaf0;border-color:#f0d49a}.cn-fix .m{display:flex;flex-direction:column;gap:2px;color:var(--ink-body);line-height:1.45}.cn-fix .m b{color:var(--ink);font-size:13px}.cn-fix .btn{height:28px;font-size:12px;padding:0 10px;flex:none}' +
    '.cn-hook-issues{margin-top:12px;padding:10px 12px;border:1px solid #f3c6bf;border-radius:10px;background:#fff7f5;display:flex;flex-direction:column;gap:0}.cn-hook-issues-h{font-size:12px;font-weight:700;color:#991b1b;padding-bottom:7px}.cn-hook-issue{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid #fde2df}.cn-hook-issue .m{display:flex;flex-direction:column;gap:2px;color:var(--ink-body);font-size:12.5px;line-height:1.45}.cn-hook-issue .m b{color:var(--ink);font-size:13px}.cn-hook-issue .btn{height:28px;font-size:12px;padding:0 10px;flex:none}' +
    '@media(max-width:760px){.cn-scope{flex-direction:column;gap:2px}.cn-scope .k{min-width:0}.cn-dns,.cn-rulegrid{grid-template-columns:1fr}.cn-alert,.cn-fix,.cn-hook-issue{flex-direction:column;align-items:flex-start}}' +
  '</style>';
  const dirCell = (e) => e.dir === 'pull'
    ? '<span class="cn-dir pull">↓ Shopify → BestShopio</span>'
    : e.dir === 'push'
      ? '<span class="cn-dir push">↑ BestShopio → Shopify</span>'
      : '<span class="cn-dir pull">Shopify auto-sync</span>';
  const sotChip = (s) => chip(s, s === 'BestShopio' ? 'blue' : s === 'Shopify' ? 'green' : 'violet');
  const statusTone = (x, fallback) => x && x.tone ? x.tone : fallback;
  const connectStatusChip = (text, tone) => chip(t(text || 'OK'), tone || 'green');
  const cnAlert = (x, action, attr) => x ? '<div class="cn-alert ' + statusTone(x, 'amber') + '"><div><div class="t">' + connectStatusChip(x.status, statusTone(x, 'amber')) + '<span>' + t(x.title || '') + '</span></div><div class="d">' + t(x.detail || '') + '</div></div>' + (action ? '<button class="btn btn-default" ' + attr + '>' + t(action) + '</button>' : '') + '</div>' : '';
  const cnFix = (x, attr) => x && x.issue ? '<div class="cn-fix ' + statusTone(x, 'amber') + '"><div class="m"><b>' + esc(x.name || x.topic || '') + '</b><span>' + t(x.issue || x.error || '') + '</span></div>' + (x.action ? '<button class="btn btn-default" ' + attr + '>' + t(x.action) + '</button>' : '') + '</div>' : '';
  const entityStatusChip = (e) => connectStatusChip(e.status, e.tone || (e.status === 'in sync' ? 'green' : e.status === 'pending' ? 'amber' : 'red'));
  const hookStatusChip = (w) => connectStatusChip(w.status || (w.ok ? 'OK' : 'failed'), w.tone || (w.ok ? 'green' : 'red'));
  const domainTone = (d) => d.tone || (d.status === 'DNS verified' || d.status === 'live' ? 'green' : 'amber');
  function renderConnect() {
    const C = D.CONNECT;
    const entities = C.entities;
    const scopes = C.scopes.map((s) => '<div class="cn-scope"><span class="k">' + esc(s.name) + '</span><span class="w">' + t(s.why) + '</span></div>').join('');
    const entityName = (e) => '<div class="cn-entity"><span>' + esc(e.name) + '</span>' + (e.note ? '<span class="cn-help" tabindex="0">?<span class="cn-tip">' + esc(t(e.note)) + '</span></span>' : '') + '</div>';
    const ents = entities.map((e) => '<tr><td style="font-weight:500;color:var(--ink)">' + entityName(e) + '</td>' +
      '<td>' + dirCell(e) + '</td><td>' + sotChip(e.sot) + '</td>' +
      '<td class="num">' + e.count.toLocaleString() + '</td><td class="muted" style="font-size:12px">' + esc(e.last) + '</td>' +
      '<td>' + entityStatusChip(e) + '</td></tr>').join('');
    const syncFixes = entities.filter((e) => e.issue).map((e, idx) => cnFix(e, 'data-sync-fix="' + idx + '"')).join('');
    const hooks = C.webhooks.map((w) => '<div class="bc-act"><span class="av bc-chip ' + (w.tone || (w.ok ? 'green' : 'red')) + '" style="border-radius:50%">' + (w.ok ? '✓' : w.status === 'pending' ? '…' : '!') + '</span><div class="at"><b>' + esc(w.topic) + '</b><div class="aw">' + t('last received') + ' ' + esc(w.last) + (w.error ? ' · ' + t(w.error) : '') + '</div></div>' + hookStatusChip(w) + '</div>').join('');
    const hookFixes = C.webhooks.filter((w) => !w.ok && w.status !== 'pending').map((w, idx) => '<div class="cn-hook-issue"><div class="m"><b>' + esc(w.topic) + '</b><span>' + t(w.error || '') + '</span></div>' + (w.action ? '<button class="btn btn-default" data-hook-fix="' + idx + '">' + t(w.action) + '</button>' : '') + '</div>').join('');
    const intercept = C.embed.intercept.map((i) => '<div class="cn-li">' + I.check + esc(i) + '</div>').join('');
    const ab = C.embed.ab;

    root.innerHTML = wrap(CSTYLE +
      head('Shopify connection') + subnav('connect') +
      cnAlert(C.health, 'Review issues', 'data-cn="sync"') +
      // store header
      '<div class="panel card-pad" style="margin-bottom:16px"><div class="flex items-center justify-between" style="flex-wrap:wrap;gap:12px">' +
        '<div class="flex items-center gap-3"><span class="cn-sb">S</span>' +
        '<div><div style="font-size:15px;font-weight:600;color:var(--ink)">' + esc(C.shop) + '　' + chip('Connected', 'green') + (C.health ? ' ' + connectStatusChip(C.health.status, statusTone(C.health, 'amber')) : '') + '</div>' +
        '<div class="muted" style="font-size:12.5px;margin-top:2px">' + esc(C.plan) + '<span class="bc-dot">·</span>' + t('Mode') + ': <b>' + esc(C.mode) + '</b><span class="bc-dot">·</span>' + t('connected since') + ' ' + esc(C.connectedSince) + '<span class="bc-dot">·</span>' + t('last activity') + ' ' + esc(C.lastSync) + '</div></div></div></div></div>' +
      // section nav
      '<div class="cn-secnav">' +
        '<button data-cn="auth">① ' + t('Authorization') + '</button>' +
        '<button data-cn="sync">② ' + t('Data auto-sync') + '</button>' +
        '<button data-cn="hooks">③ ' + t('Webhooks') + '</button>' +
        '<button data-cn="inject">④ ' + t('App Embed') + '</button>' +
        '<button data-cn="domain">⑤ ' + t('Domain') + '</button></div>' +

      // ① Authorization
      '<div class="cn-sec" id="cn-auth"><div class="cn-sec-h"><span class="cn-sec-n">1</span><span class="cn-sec-t">' + t('Authorization') + '</span><span class="cn-sec-x">OAuth · custom distribution</span></div>' +
        '<div class="panel card-pad">' +
          cnAlert(C.authorization, C.authorization && C.authorization.primary, 'data-reauth') +
          '<div class="bc-note" style="margin-bottom:12px">' + t('Installed via a private app (OAuth + Admin API) — no Shopify App Store listing or review. These are the permissions you granted at install:') + '</div>' +
          scopes +
        '</div></div>' +

      // ② Data auto-sync
      '<div class="cn-sec" id="cn-sync"><div class="cn-sec-h"><span class="cn-sec-n">2</span><span class="cn-sec-t">' + t('Data auto-sync') + '</span><span class="cn-sec-x">' + t('Shopify auto-sync · orders write back') + '</span></div>' +
        '<div class="bc-note" style="margin-bottom:12px">' + t('Products, collections, discounts, shipping and customers sync automatically from Shopify. BestCheckout uses them for checkout, while paid orders write back to Shopify for fulfillment.') + '</div>' +
        '<div class="cn-table-frame"><table class="tbl" style="min-width:720px"><thead><tr><th>' + t('Entity') + '</th><th style="width:150px">' + t('Direction') + '</th><th style="width:120px">' + t('Source of truth') + '</th><th class="num" style="width:90px">' + t('Items') + '</th><th style="width:110px">' + t('Last activity') + '</th><th style="width:90px">' + t('Status') + '</th></tr></thead><tbody>' + ents + '</tbody></table></div>' +
        (syncFixes ? '<div class="cn-sync-issues"><div class="cn-sync-issues-h">' + t('Sync messages') + '</div>' + syncFixes + '</div>' : '') +
      '</div>' +

      // ③ Webhooks
      '<div class="cn-sec" id="cn-hooks"><div class="cn-sec-h"><span class="cn-sec-n">3</span><span class="cn-sec-t">' + t('Webhooks') + '</span><span class="cn-sec-x">Shopify Admin API callbacks</span></div>' +
        '<div class="panel card-pad"><div class="card-title" style="margin-bottom:6px">' + t('Webhook delivery') + '</div>' + hooks + (hookFixes ? '<div class="cn-hook-issues"><div class="cn-hook-issues-h">' + t('Delivery issues') + '</div>' + hookFixes + '</div>' : '') + '</div>' +
      '</div>' +
      // ④ App Embed
      '<div class="cn-sec" id="cn-inject"><div class="cn-sec-h"><span class="cn-sec-n">4</span><span class="cn-sec-t">' + t('App Embed') + '</span><span class="cn-sec-x">Theme App Extension</span></div>' +
        '<div class="bc-grid2b">' +
          '<div class="panel card-pad"><div class="flex items-center justify-between" style="margin-bottom:8px"><div class="card-title">App Embed　' + connectStatusChip(C.embed.health || (C.embed.enabled ? 'Enabled' : 'Off'), statusTone(C.embed, C.embed.enabled ? 'green' : 'gray')) + '</div></div>' +
            '<div class="muted" style="font-size:12.5px;line-height:1.55;margin-bottom:10px">' + t('BestCheckout installs the App Embed automatically. If it is removed during a theme change, reinstall it here to restore checkout interception.') + '</div>' +
            (C.embed.issue ? cnFix({ name: 'App Embed', issue: C.embed.issue, action: 'Restore App Embed', tone: statusTone(C.embed, 'red') }, 'data-embed-restore') : '') +
            '<div class="cn-li">' + I.check + t('Live theme') + ': <b style="color:var(--ink)">' + esc(C.embed.theme) + '</b> · ' + t('last seen') + ' ' + esc(C.embed.lastSeen) + '</div>' +
            '<div class="bc-kpi-s" style="margin:8px 0 4px;font-weight:600;color:var(--ink-muted)">' + t('Intercepts') + '</div>' + intercept +
            '</div>' +
          '<div class="panel card-pad"><div class="card-title" style="margin-bottom:8px">A/B ' + t('split') + '</div>' +
            '<div class="muted" style="font-size:12.5px;margin-bottom:6px">' + t('Send a slice of carts to BestCheckout; keep the rest on Shopify as a control. Ramp up as approval & AOV prove out.') + '</div>' +
            '<div class="cn-ab"><div class="a" style="width:' + ab.split + '%">BestCheckout ' + ab.split + '%</div><div class="b" style="width:' + (100 - ab.split) + '%">Shopify ' + (100 - ab.split) + '%</div></div>' +
            '<div class="cn-li" style="color:#2b62d6">→ BestCheckout: <span class="muted">' + esc(ab.sendToBestCheckout) + '</span></div>' +
            '<div class="cn-li" style="color:var(--ink-muted)">→ Shopify: <span class="muted">' + esc(ab.sendToShopify) + '</span></div>' +
            '<div style="margin-top:12px"><button class="btn btn-default" data-ab>' + t('Edit routing rules') + '</button></div></div>' +
        '</div></div>' +

      // ⑤ Domain
      '<div class="cn-sec" id="cn-domain"><div class="cn-sec-h"><span class="cn-sec-n">5</span><span class="cn-sec-t">' + t('Domain') + '</span></div>' +
        '<div class="panel card-pad">' +
          '<div class="flex items-center justify-between" style="flex-wrap:wrap;gap:10px;margin-bottom:12px"><div style="font-size:14px;font-weight:600;color:var(--ink)">' + esc(C.domain.sub) + '　' + connectStatusChip(C.domain.status, domainTone(C.domain)) + '</div></div>' +
          '<div class="muted" style="font-size:12.5px;margin-bottom:10px">' + t('Your branded checkout lives on this subdomain. Point one CNAME at us and we issue & renew SSL automatically.') + '</div>' +
          (C.domain.issue ? cnFix({ name: C.domain.sub, issue: C.domain.issue, action: 'Verify DNS', tone: domainTone(C.domain) }, 'data-domain-fix') : '') +
          '<div class="cn-dns"><div class="h">' + t('Type') + '</div><div class="h">' + t('Host') + '</div><div class="h">' + t('Value') + '</div><div class="h cp"></div>' +
            '<div class="v">CNAME</div><div class="v">checkout</div><div class="v">' + esc(C.domain.cname) + '</div><div class="cp"><button class="btn btn-default" data-copy style="height:28px;padding:0 10px;font-size:12px">' + t('Copy') + '</button></div></div>' +
        '</div></div>'
    );
    root.querySelectorAll('[data-cn]').forEach((b) => b.onclick = () => { const el = root.querySelector('#cn-' + b.getAttribute('data-cn')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    root.querySelectorAll('[data-sync-fix]').forEach((b) => b.onclick = () => { const withIssue = C.entities.filter((e) => e.issue); const e = withIssue[Number(b.getAttribute('data-sync-fix')) || 0]; if (!e) return; e.status = 'pending'; e.tone = 'amber'; e.last = 'retry queued'; e.issue = 'Automatic sync retry is queued. No action is needed.'; e.action = ''; renderConnect(); toast(t('Auto-sync retry queued')); });
    root.querySelectorAll('[data-hook-fix]').forEach((b) => b.onclick = () => { const failed = C.webhooks.filter((w) => !w.ok && w.status !== 'pending'); const w = failed[Number(b.getAttribute('data-hook-fix')) || 0]; if (!w) return; w.status = 'pending'; w.tone = 'amber'; w.last = 'retry queued'; w.error = 'Waiting for Shopify to redeliver this webhook.'; w.action = ''; renderConnect(); toast(t('Webhook retry queued')); });
    root.querySelectorAll('[data-embed-restore]').forEach((b) => b.onclick = () => {
      C.embed.health = 'detected'; C.embed.tone = 'green'; C.embed.issue = ''; C.embed.lastSeen = 'just now';
      const setup = bcSetup(); setup.embed_enabled = true; bcSetupSave(setup);
      renderConnect(); toast(t('App Embed reinstalled and detected.'));
    });
    root.querySelectorAll('[data-domain-fix]').forEach((b) => b.onclick = () => {
      dnsVerifyAttempts += 1;
      if (dnsVerifyAttempts < 2) {
        C.domain.status = 'DNS not verified';
        C.domain.tone = 'amber';
        C.domain.issue = 'CNAME still is not resolving. Check the host and target, then verify again.';
        renderConnect(); toast(t('DNS verification failed. Check the DNS record, then verify again.'));
        return;
      }
      C.domain.status = 'DNS verified'; C.domain.tone = 'green'; C.domain.issue = '';
      const setup = bcSetup(); setup.domain_set = true; bcSetupSave(setup);
      renderConnect(); toast(t('DNS verified. Shoppers can now use this checkout domain.'));
    });
    // Disconnecting Shopify breaks the entire bridge (Shopify auto-syncs + order write-back).
    // Styled confirm modal (matches admin visual language + i18n-translatable).
    root.querySelectorAll('[data-disc]').forEach((b) => b.onclick = () => {
      const backdrop = h('<div class="modal-backdrop"></div>');
      const mm = h('<div class="modal" style="width:460px"></div>');
      mm.innerHTML =
        '<div class="modal-head flex items-center justify-between"><span>' + t('Disconnect Shopify') + '</span>' +
          '<span class="drawer-x" data-x style="cursor:pointer"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></span>' +
        '</div>' +
        '<div class="modal-body" style="padding:18px 22px;font-size:13.5px;line-height:1.6;color:var(--ink-body)">' + t('This stops BestCheckout routing, Shopify data auto-sync, webhooks, and order write-back. Your Shopify native checkout stays available, and you will need to re-authorize to reconnect.') + '</div>' +
        '<div class="modal-foot" style="justify-content:flex-end"><div class="flex gap-2">' +
          '<button class="btn btn-default" data-cancel>' + t('Cancel') + '</button>' +
          '<button class="btn" style="background:var(--err);color:#fff" data-ok>' + t('Disconnect') + '</button>' +
        '</div></div>';
      backdrop.appendChild(mm); document.body.appendChild(backdrop);
      const close = () => backdrop.remove();
      mm.querySelector('[data-x]').onclick = close;
      mm.querySelector('[data-cancel]').onclick = close;
      backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
      mm.querySelector('[data-ok]').onclick = () => {
        close();
        setBcConnected(false); CF.step = 'store'; toast(t('Disconnected — reconnect from the start')); location.hash = '#/bestcheckout'; renderOverview();
      };
    });
    root.querySelectorAll('[data-reauth]').forEach((ra) => ra.onclick = () => bcModal(t('Update permissions'),
      '<div class="fab-note">' + t('Opens the Shopify OAuth consent screen so the merchant can grant the updated scopes. The store stays connected; nothing is removed.') + '</div>' +
      '<ul class="bm-scopes"><li>' + t('Shopify auto-sync · products, collections, discounts, shipping') + '</li><li>' + t('Write paid orders back to Shopify') + '</li><li>' + t('Read customers (for the New vs Returning A/B)') + '</li></ul>',
      t('Update on Shopify'), () => toast(t('Permissions updated · scopes re-granted'))));
    const ab2 = root.querySelector('[data-ab]'); if (ab2) ab2.onclick = () => { location.hash = '#/bestcheckout/funnel'; };
    const cp = root.querySelector('[data-copy]'); if (cp) cp.onclick = () => toast(t('Copied'));
  }

  function dispose() { if (chart) { try { chart.dispose(); } catch (e) {} chart = null; } }

  window.VIEWS.bestcheckout = {
    render: function (el, rest) {
      root = el; dispose();
      const parts = String(rest || '').split('/');
      const sub = parts[0];
      const flowId = parts[1];
      // MVP scope: Payment routing (multi-MID/ATRI) and Reports were cut — payments reuse the
      // merchant's connected PSP (native Settings → Payments); routing is a Phase-2 moat, not MVP.
      if (sub === 'performance') renderPerformance();
      else if (sub === 'flows') renderFlowList();
      else if (sub === 'funnel') renderFunnel(flowId);
      else if (sub === 'templates') renderTemplates();
      else if (sub === 'connect') renderConnect();
      else if (sub === 'onboarding' || sub === 'setup') { CF.step = 'store'; renderConnectFlow(); } // stable entry for demoing the auth flow, regardless of connected state
      // back-compat: old routes fold into the new IA (Funnel / Templates)
      else if (sub === 'checkout' || sub === 'thankyou') { location.hash = '#/bestcheckout/templates'; return; }
      else if (sub === 'experiments' || sub === 'post-purchase') { location.hash = '#/bestcheckout/funnel'; return; }
      else renderOverview();
      bcI18n(root);
    },
    unmount: function () { dispose(); },
  };
})();
