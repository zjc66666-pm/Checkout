/* BestShopio Admin · Settings prototype — SPA sub-module of the shared shell.
   When the route is #/settings/* the shell (../assets/shell.js) renders the
   settings sidebar (7 items) + a "Settings" bar, then mounts this module via
   window.VIEWS.settings.render(rootEl, rest). This file renders ONLY the content
   of the active settings sub-page into #root (NO internal left sub-nav). `rest`
   (the part after #/settings/) selects the sub-page.
   Mirrors reference/bestvoy-admin web-antd settings/** views & copy exactly.
   SECURITY: secret fields render masked placeholders only — never plaintext. */
(function () {
  const D = window.DATA_SETTINGS;
  let root; // set by the SPA shell router via VIEWS.settings.render(el, rest)

  // tiny html -> element helper (same pattern as orders prototype)
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- inline icons (match shell.js .nav-ico style) ----
  const svg = (p, w) => '<svg viewBox="0 0 24 24" width="' + (w || 18) + '" height="' + (w || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const I = {
    truck:  svg('<path d="M10 17h4V5H2v12h2"/><path d="M14 9h4l4 4v4h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/>'),
    chevR:  svg('<path d="m9 18 6-6-6-6"/>', 16),
    chevL:  svg('<path d="m15 18-6-6 6-6"/>', 18),
    chevD:  svg('<path d="m6 9 6 6 6-6"/>', 16),
    plus:   svg('<path d="M12 5v14M5 12h14"/>', 16),
    image:  svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L5 19"/>', 18),
    x:      svg('<path d="M18 6 6 18M6 6l12 12"/>', 16),
    globe:  svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14.5 14.5 0 0 0 0 18 14.5 14.5 0 0 0 0-18"/>', 16),
    check:  svg('<path d="M20 6 9 17l-5-5"/>', 14),
    tagSm:  svg('<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.3"/>', 18),
    grid:   svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>', 18),
    pencil: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 16),
    trash:  svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', 16),
    dots:   svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', 16),
    grip:   svg('<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>', 16),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 16),
    info:   svg('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>', 16),
  };

  // ---- toast (same as orders) ----
  const toast = (msg) => { const t = document.createElement('div'); t.textContent = msg; t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#242833;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:90;box-shadow:var(--float-shadow)'; document.body.appendChild(t); setTimeout(() => t.remove(), 1900); };

  // ---- confirm dialog (mirrors Ant Modal.confirm) ----
  const confirm = (opts) => modal({
    title: opts.title, width: opts.width || 460,
    body: '<div class="muted" style="font-size:13.5px;line-height:1.6">' + esc(opts.content) + '</div>',
    okText: opts.okText || 'OK', danger: opts.danger,
    onOk: (m, close) => { close(); opts.onOk && opts.onOk(); },
  });

  // ===== shared small builders (reuse theme classes) =====
  // Linked/Not linked dot pill (matches render.tsx tag-dot-success / tag-dot-bg)
  const linkedPill = (linked) => linked
    ? '<span class="pill pill-green"><span class="dot"></span>Linked</span>'
    : '<span class="pill pill-gray"><span class="dot"></span>Not linked</span>';

  const sectionTitle = (t, sub) =>
    '<div class="card-title">' + esc(t) + '</div>' + (sub ? '<div class="muted" style="font-size:12.5px;margin-top:2px">' + esc(sub) + '</div>' : '');

  // a soft grey inner block (mirrors the borderless .b-c rows in the admin: #f7f8fb, no border)
  const block = (inner, bg) => '<div class="b-c" style="padding:14px 16px' + (bg ? ';background:' + bg : '') + '">' + inner + '</div>';

  // an Ant-style Switch (visual)
  let sw = 0;
  const toggle = (on, label) => {
    const id = 'sw' + (++sw);
    return '<label class="set-switch' + (on ? ' on' : '') + '" data-toggle="' + id + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '><span class="set-knob"></span></label>';
  };

  // ===========================================================================
  // PAINT: shell renders the sidebar + "Settings" bar; we render ONLY the active
  // sub-page content into #root. Edit-like centered pages use .detail-wrap.
  // ===========================================================================
  // `centered` pages mirror the real admin's centered w-[860px] forms.
  function paint(bodyHtml, centered) {
    root.innerHTML =
      '<style>' + STYLES + '</style>' +
      (centered ? '<div class="set-narrow">' + bodyHtml + '</div>' : bodyHtml);
    // wire generic toggles (visual only)
    root.querySelectorAll('[data-toggle]').forEach((el) => el.onclick = () => el.classList.toggle('on'));
    // image upload tiles → open the OS file chooser (Store logo/ico/no-data, Checkout logo)
    root.querySelectorAll('.up-tile').forEach((el) => el.onclick = () => openFilePicker());
  }

  // open the native local-file chooser for image uploads (prototype: selection is visual only)
  function openFilePicker() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/svg+xml,.ico';
    inp.style.display = 'none';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) toast('Selected ' + f.name); inp.remove(); };
    document.body.appendChild(inp);
    inp.click();
  }

  // a Page-style header (title + optional description + optional right slot)
  const pageHead = (title, sub, rightHtml) =>
    '<div class="flex items-start justify-between mb-4" style="gap:12px">' +
      '<div><div class="page-title" style="font-size:20px">' + esc(title) + '</div>' +
        (sub ? '<div class="muted" style="font-size:13px;margin-top:2px">' + esc(sub) + '</div>' : '') + '</div>' +
      '<div class="flex items-center gap-2">' + (rightHtml || '') + '</div>' +
    '</div>';

  const updateBtn = '<button class="btn btn-primary" data-act="save">Update</button>';

  // editable text field for a modal. `secret` only adds a "masked" note — the
  // value itself is always masked in DATA for secret fields.
  function field(label, value, placeholder, opts) {
    opts = opts || {};
    const v = value || '';
    const req = opts.optional ? '' : ' <span style="color:var(--err)">*</span>';
    const learn = opts.learnMore ? '<a class="lnk" href="' + esc(opts.learnMore) + '" target="_blank" rel="noreferrer" style="font-weight:400;float:right">Learn more</a>' : '';
    const addon = opts.addonBefore
      ? '<div class="set-addon"><span class="set-addon-prefix">' + esc(opts.addonBefore) + '</span><input class="input" value="' + esc(v) + '" placeholder="' + esc(placeholder || '') + '" style="border-top-left-radius:0;border-bottom-left-radius:0" /></div>'
      : '<input class="input" value="' + esc(v) + '" placeholder="' + esc(placeholder || '') + '" />';
    return '<div style="margin-bottom:12px"><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">' + esc(label) + req + learn + '</div>' +
      addon +
      (opts.secret && v ? '<div class="muted" style="font-size:11.5px;margin-top:4px">Stored securely · value is masked</div>' : '') +
      (opts.hint ? '<div class="muted" style="font-size:11.5px;margin-top:4px">' + esc(opts.hint) + '</div>' : '') +
      '</div>';
  }

  // PC + Mobile preview modal (NoDataPreviewModal / checkout preview modal)
  function openPreviewModal(title) {
    modal({ title: title, width: 760, okText: 'Complete', hideCancel: true,
      body:
        '<div style="display:grid;grid-template-columns:3fr 2fr;gap:20px">' +
          '<div><div class="text-sm" style="text-align:center;font-weight:600;color:var(--ink);margin-bottom:10px">PC Display</div>' +
            '<div class="preview-frame" style="height:230px"><span class="muted">Storefront PC preview</span></div></div>' +
          '<div><div class="text-sm" style="text-align:center;font-weight:600;color:var(--ink);margin-bottom:10px">Mobile Display</div>' +
            '<div class="preview-frame" style="height:230px"><span class="muted">Mobile preview</span></div></div>' +
        '</div>',
      onOk: (m, close) => close() });
  }

  // ===========================================================================
  // TAB 1 — BASE  ("Basic settings", centered w-860)
  //   render.tsx: Store information / Product information / Order information /
  //   Login through social media (Google only). One Update btn.
  // ===========================================================================
  function renderBase() {
    const b = D.base;

    const uploadCard = (u, label, desc, previewTitle) => {
      const tile = u.set
        ? '<div class="up-tile filled"><span class="up-ico">' + I.image + '</span><span class="up-name">' + esc(u.name) + '</span>' +
            '<button class="up-x" title="Remove">' + I.x + '</button></div>'
        : '<div class="up-tile"><span class="up-plus">' + I.plus + '</span><span class="up-add">Add images</span></div>';
      return block(
        '<div class="text-sm" style="font-weight:600;color:var(--ink);margin-bottom:2px">' + esc(label) + '</div>' +
        '<div class="muted" style="font-size:12.5px;margin-bottom:10px">' + esc(desc) +
          ' <a class="lnk" data-preview="' + esc(previewTitle) + '">Preview display here.</a>' +
          ' Recommended size: ' + esc(u.rec) + ', format: ' + esc(u.format) + '.</div>' +
        tile
      );
    };

    const fontTags = b.store.fonts.map((f) =>
      '<span class="field-pill">' + esc(f) + ' <span class="x" data-font="' + esc(f) + '">&times;</span></span>').join('');

    // V1.129 §7.4 Store: editable Store name (0/30) + read-only url / currency / time zone
    const sd = b.store.details || { name: 'Lavender Labs', url: 'lavender-labs.myshopify.com', currency: 'USD $', timezone: 'GMT-04:00' };
    const detailRow = (label, value) =>
      '<div class="flex items-center gap-3"><span class="text-sm" style="font-weight:600;color:var(--ink);min-width:140px">' + esc(label) + '</span>' +
      '<span class="muted" style="font-size:13px">' + esc(value) + '</span></div>';
    const storeDetailsBlock = block(
      '<div class="flex flex-col gap-4">' +
        '<div>' +
          '<div class="flex items-center justify-between" style="margin-bottom:6px">' +
            '<span class="text-sm" style="font-weight:600;color:var(--ink)">Store name</span>' +
            '<span class="muted" id="sd-name-cnt" style="font-size:12px">' + (sd.name || '').length + '/30</span></div>' +
          '<input class="input" style="width:100%" maxlength="30" placeholder="Please enter" value="' + esc(sd.name) + '"' +
            ' oninput="var e=document.getElementById(\'sd-name-cnt\');if(e)e.textContent=this.value.length+\'/30\'">' +
        '</div>' +
        detailRow('Store url', sd.url) +
        detailRow('Default currency', sd.currency) +
        detailRow('Default time zone', sd.timezone) +
      '</div>'
    );

    const storeCard =
      '<div class="panel card-pad mb-4">' + sectionTitle('Store information') +
        '<div class="mt-4 flex flex-col gap-4">' +
          storeDetailsBlock +
          uploadCard(b.store.logo, 'Store logo', 'This logo is displayed on the store.', 'Display Position of Store logo') +
          uploadCard(b.store.ico, 'Store ico', 'The icon displayed in the browser window.', 'Display Position of Store ico') +
          uploadCard(b.store.noData, 'No data icon', 'This logo is displayed on the store.', 'Display Position of No data icon') +
          block(
            '<div class="flex items-center justify-between mb-1">' +
              '<div><div class="text-sm" style="font-weight:600;color:var(--ink)">Store Font</div>' +
              '<div class="muted" style="font-size:12.5px">Add your preferred fonts to control store typography.</div></div>' +
              '<button class="btn btn-gray" data-act="add-font">Add font</button>' +
            '</div>' +
            '<div class="flex flex-wrap gap-1 mt-3">' + (fontTags || '<span class="muted" style="font-size:12.5px">No fonts added</span>') + '</div>'
          ) +
        '</div>' +
      '</div>';

    const prodRow = (p, name) => block(
      '<div class="flex items-center gap-3 mb-1"><span class="text-sm" style="font-weight:600;color:var(--ink)">' + esc(name) + '</span>' + toggle(p.on, name) + '</div>' +
      '<div class="muted" style="font-size:12.5px">' + esc(p.desc) + '</div>'
    );
    const productCard =
      '<div class="panel card-pad mb-4">' + sectionTitle('Product information') +
        '<div class="mt-4 flex flex-col gap-4">' +
          prodRow(b.product.reviews, 'Product Reviews') +
          prodRow(b.product.original, 'Original Price') +
        '</div>' +
      '</div>';

    const orderCard =
      '<div class="panel card-pad mb-4">' + sectionTitle('Order information') +
        '<div class="mt-4 flex flex-col gap-4">' +
          block(
            '<div class="text-sm" style="font-weight:600;color:var(--ink);margin-bottom:2px">Order ID prefix</div>' +
            '<div class="muted" style="font-size:12.5px;margin-bottom:8px">Order ID starts from 1001 by default. You may add a prefix to create custom IDs. e.g. "EN1001"</div>' +
            '<input class="input" id="ord-prefix" maxlength="10" placeholder="Please enter" value="' + esc(b.order.prefix) + '" style="width:300px" />' +
            '<div class="muted" style="font-size:12.5px;margin-top:6px">Order ID will be displayed as <span class="subtle" id="ord-prefix-eg">' + esc(b.order.prefix) + '1001, ' + esc(b.order.prefix) + '1002, ' + esc(b.order.prefix) + '1003...</span></div>'
          ) +
          block(
            '<div class="flex items-center gap-3 mb-1"><span class="text-sm" style="font-weight:600;color:var(--ink)">Order Auto-Cancel Time</span>' +
              '<div class="set-addon"><input class="input" type="number" value="' + b.order.autoCancelMinutes + '" min="1" max="1440" style="width:140px;border-top-right-radius:0;border-bottom-right-radius:0" /><span class="set-addon-suffix">Minutes</span></div></div>' +
            '<div class="muted" style="font-size:12.5px">Duration for To pay orders after Place order.</div>'
          ) +
          block(
            '<div class="flex items-center gap-3 mb-1"><span class="text-sm" style="font-weight:600;color:var(--ink)">Order Auto-Receive Time</span>' +
              '<div class="set-addon"><input class="input" type="number" value="' + b.order.autoReceiveDays + '" min="1" max="100" style="width:140px;border-top-right-radius:0;border-bottom-right-radius:0" /><span class="set-addon-suffix">Days</span></div></div>' +
            '<div class="muted" style="font-size:12.5px">Orders are auto-Receive after a set number of days from shipping (e.g., 10 days).</div>'
          ) +
        '</div>' +
      '</div>';

    const socialRow = (s) =>
      '<div class="flex items-center justify-between" style="padding:12px 0">' +
        '<div class="flex items-center gap-3">' + I.globe +
          '<span class="text-sm" style="font-weight:600;color:var(--ink)">' + esc(s.name) + '</span>' + linkedPill(s.linked) +
        '</div>' +
        '<button class="btn btn-gray" data-social="' + s.key + '">' + (s.linked ? 'Edit' : 'Link') + '</button>' +
      '</div>';
    const socialCard =
      '<div class="panel card-pad mb-4">' + sectionTitle('Login through social media', 'After connecting, customers can log in to the online store through their social media accounts.') +
        '<div class="mt-2">' + block(b.social.map(socialRow).join('')) + '</div>' +
      '</div>';

    paint(
      pageHead('Basic settings') +
      storeCard + productCard + orderCard + socialCard +
      '<div class="flex justify-end">' + updateBtn + '</div>',
      true
    );

    // wiring
    root.querySelectorAll('[data-act="save"]').forEach((b2) => b2.onclick = () => toast('Settings updated successfully'));
    root.querySelectorAll('[data-preview]').forEach((b2) => b2.onclick = () => openPreviewModal(b2.getAttribute('data-preview')));
    const addFont = root.querySelector('[data-act="add-font"]'); if (addFont) addFont.onclick = () => openAddFontModal();
    root.querySelectorAll('[data-font]').forEach((x) => x.onclick = () => toast('Removed font ' + x.getAttribute('data-font')));
    root.querySelectorAll('[data-social]').forEach((b2) => b2.onclick = () => openLoginModal(b2.getAttribute('data-social')));
    const pfx = root.querySelector('#ord-prefix');
    if (pfx) pfx.oninput = () => { const v = pfx.value || ''; const eg = root.querySelector('#ord-prefix-eg'); if (eg) eg.textContent = v + '1001, ' + v + '1002, ' + v + '1003...'; };
  }

  // Standalone BestCheckout only exposes the Shopify-store settings that affect
  // checkout. Storefront theme, social login and catalogue-administration
  // controls remain in the underlying BestShopio record and are not merchant
  // actions in this product.
  function renderShopifyStore() {
    const syncRow = (name, count, detail, last) =>
      '<div class="bc-store-row"><div><strong>' + esc(name) + '</strong><span>' + esc(detail) + '</span><small class="bc-sync-last">Last synced ' + esc(last) + '</small></div><div class="bc-store-row-end"><b>' + esc(count) + '</b><span class="pill pill-green"><span class="dot"></span>Synced</span></div></div>';
    const status = '<span class="pill pill-green"><span class="dot"></span>Connected</span>';
    const body =
      '<style>' +
        '.bc-store-kicker{font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--ink-muted);text-transform:uppercase;margin-bottom:10px}.bc-store-name{font-size:17px;font-weight:700;color:var(--ink);margin-bottom:4px}.bc-store-domain{font-size:13px;color:var(--ink-muted)}.bc-store-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px;padding-top:16px;border-top:1px solid var(--hair)}.bc-store-fact small{display:block;color:var(--ink-muted);font-size:11px;margin-bottom:4px}.bc-store-fact strong{display:block;color:var(--ink-body);font-size:13px;font-weight:600;line-height:1.4}.bc-store-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0;border-top:1px solid var(--hair)}.bc-store-row:first-child{border-top:0;padding-top:0}.bc-store-row strong{display:block;font-size:13.5px;color:var(--ink)}.bc-store-row span,.bc-store-row small{display:block;font-size:12px;color:var(--ink-muted);margin-top:3px;line-height:1.45}.bc-store-row-end{display:flex;align-items:center;gap:10px;white-space:nowrap}.bc-store-row-end>b{font-size:13px;color:var(--ink)}.bc-store-row-end .pill{margin:0}.bc-writeback{display:flex;align-items:flex-start;gap:11px;padding:14px 16px}.bc-writeback-ico{width:28px;height:28px;display:grid;place-items:center;flex:none;border-radius:50%;background:#e8f8ef;color:#14834c}.bc-writeback strong{display:block;font-size:13.5px;color:var(--ink);margin-bottom:4px}.bc-writeback p{margin:0;color:var(--ink-muted);font-size:12.5px;line-height:1.55}.bc-writeback-links{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;font-weight:500}.bc-connection-option{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 0;border-top:1px solid var(--hair)}.bc-connection-option:first-child{padding-top:0;border-top:0}.bc-connection-option strong{display:block;font-size:13px;color:var(--ink)}.bc-connection-option span{display:block;font-size:12px;color:var(--ink-muted);line-height:1.5;margin-top:3px}@media(max-width:760px){.bc-store-facts{grid-template-columns:1fr;gap:10px}.bc-store-row,.bc-connection-option{align-items:flex-start;flex-direction:column}.bc-store-row-end{flex-direction:row;align-items:center}.bc-store-row-end>b{display:none}}' +
      '</style>' +
      pageHead('Shopify connection', 'Review the Shopify store and syncs that power your BestCheckout purchase experience.', '<button class="btn btn-default" data-act="connection">Manage connection</button>') +
      '<section class="panel card-pad mb-4"><div class="bc-store-kicker">Connected Shopify store</div><div class="flex items-start justify-between" style="gap:12px"><div><div class="bc-store-name">Lavender Labs</div><div class="bc-store-domain">lavender-labs.myshopify.com</div></div>' + status + '</div><div class="bc-store-facts"><div class="bc-store-fact"><small>Shop name</small><strong>Lavender Labs</strong></div><div class="bc-store-fact"><small>Myshopify domain</small><strong>lavender-labs.myshopify.com</strong></div><div class="bc-store-fact"><small>Connection status</small><strong>Connected via custom app</strong></div></div></section>' +
      '<section class="panel card-pad mb-4">' + sectionTitle('Shopify → BestCheckout data sync', 'BestCheckout reads Shopify as the source of truth for checkout. Data flows one way into BestCheckout.') +
        '<div class="mt-4">' +
          syncRow('Products and variants', '1,310 items', 'Available in product and offer selectors', '3 minutes ago') +
          syncRow('Discounts', '23 active', 'Available when buyers enter or receive an offer', '5 minutes ago') +
          syncRow('Shipping options', '9 options', 'Shown after the buyer enters a delivery address', '5 minutes ago') +
        '</div><div class="mt-3"><button class="btn btn-default" data-act="sync">Sync now</button></div>' +
      '</section>' +
      '<section class="panel card-pad mb-4">' + sectionTitle('Order write-back to Shopify', 'BestCheckout creates the order, then Shopify remains the fulfillment workspace.') +
        '<div class="mt-4"><div class="b-c bc-writeback"><span class="bc-writeback-ico">' + I.check + '</span><div><strong>Paid BestCheckout orders are automatically created in Shopify</strong><p>After payment, your existing Shopify fulfillment workflow continues as usual. There is no setting to save on this page.</p><div class="bc-writeback-links"><a class="lnk" href="#/orders">View orders</a><a class="lnk" href="#/activity">View sync activity</a></div></div></div></div>' +
      '</section>';

    // This is an operational overview, not a compact form. Keep it aligned
    // with Orders and notifications instead of centering it at 860px.
    paint(body, false);
    const sync = root.querySelector('[data-act="sync"]');
    if (sync) sync.onclick = () => {
      sync.disabled = true; sync.textContent = 'Syncing…';
      root.querySelectorAll('.bc-sync-last').forEach((el) => { el.textContent = 'Syncing now…'; });
      setTimeout(() => {
        if (!root || !root.contains(sync)) return;
        sync.disabled = false; sync.textContent = 'Sync now';
        root.querySelectorAll('.bc-sync-last').forEach((el) => { el.textContent = 'Last synced just now'; });
        toast('Shopify data sync completed');
      }, 650);
    };
    const connection = root.querySelector('[data-act="connection"]');
    if (connection) connection.onclick = () => {
      const ctrl = modal({
        title: 'Manage Shopify connection', width: 560, okText: 'Done', hideCancel: true,
        body: '<div class="bc-connection-option"><div><strong>App credentials</strong><span>Client ID and client secret are stored securely. Update them only when you replace the custom app.</span></div><button class="btn btn-default" data-connection-credentials>Update credentials</button></div><div class="bc-connection-option"><div><strong>Authorization</strong><span>Refresh the Shopify grant if access was revoked or required scopes changed.</span></div><button class="btn btn-default" data-connection-reauthorize>Reauthorize</button></div><div class="bc-connection-option"><div><strong>Disconnect store</strong><span>This stops checkout routing, data sync, and order write-back for this store.</span></div><button class="btn" style="background:var(--err);color:#fff" data-connection-disconnect>Disconnect</button></div>',
        onOk: function (m, close) { close(); }
      });
      const credentials = ctrl.m.querySelector('[data-connection-credentials]');
      if (credentials) credentials.onclick = () => toast('Open your custom app to update credentials');
      const reauthorize = ctrl.m.querySelector('[data-connection-reauthorize]');
      if (reauthorize) reauthorize.onclick = () => toast('Shopify reauthorization started');
      const disconnect = ctrl.m.querySelector('[data-connection-disconnect]');
      if (disconnect) disconnect.onclick = () => { ctrl.close(); confirm({ title: 'Disconnect Shopify store', content: 'This stops BestCheckout routing, Shopify data sync, and order write-back. Shopify native checkout stays available.', okText: 'Disconnect', danger: true, onOk: () => toast('Shopify connection disconnected') }); };
    };
  }

  // Add font — mirrors fontModel.tsx: "Font:" label + Ant Select(mode=multiple) of
  // removable font tags, grey Cancel + orange (#db4015) OK.
  function openAddFontModal() {
    const sel = D.base.store.fonts.slice();
    const chips = () => sel.map((f) =>
      '<span class="ms-tag">' + esc(f) + '<span class="ms-x" data-rm="' + esc(f) + '">&times;</span></span>').join('');
    const ctrl = modal({
      title: 'Add font', width: 400, okText: 'OK',
      okStyle: 'background:#db4015;border-color:#db4015;color:#fff',
      body:
        '<div style="padding:8px 0 0">' +
          '<div class="flex items-center gap-4" style="margin-bottom:24px">' +
            '<span class="text-sm" style="font-weight:500;color:var(--ink);width:48px;flex:none">Font:</span>' +
            '<div class="ms-box" id="ms-box" style="flex:1"></div>' +
          '</div>' +
        '</div>',
      onOk: (m, close) => { close(); toast('Store fonts updated'); },
    });
    const box = ctrl.m.querySelector('#ms-box');
    const paint = () => {
      box.innerHTML = chips() + '<input class="ms-input" placeholder="' + (sel.length ? '' : 'Select') + '" />';
      box.querySelectorAll('[data-rm]').forEach((x) => x.onclick = () => {
        const f = x.getAttribute('data-rm'); const i = sel.indexOf(f); if (i > -1) sel.splice(i, 1); paint();
      });
    };
    paint();
  }
  function openLoginModal(key) {
    const s = D.base.social.find((x) => x.key === key);
    const body =
      '<div class="muted mb-4" style="font-size:13px">' + esc(s.blurb) + '</div>' +
      field('App ID', s.fields.appId, 'Please enter App ID') +
      field('App Secret', s.fields.appSecret, 'Please enter App Secret', { secret: true }) +
      field('Redirect URIs', s.fields.redirectUris, "Please enter Redirect URIs, You can enter your store's homepage URL.");
    modal({ title: s.modalTitle, width: 620, okText: 'Save',
      body, onOk: (m, close) => { close(); toast(s.linked ? 'Edit successfully' : 'Connected successfully'); },
      extraLeft: s.linked ? '<button class="btn" style="background:var(--err);color:#fff" data-disc>Cancel connection</button>' : '',
      onExtra: (m, close) => { close(); toast('Cancelled connection successfully'); } });
  }
  // ===========================================================================
  // TAB 2 — PAYMENTS  ("Payments", centered w-860)
  //   render.tsx: "Card Payments & Express Checkout" card (processor radio +
  //   Airwallex then Stripe rows: logo + method icons + Linked dot + Edit/Link)
  //   then a separate PayPal card. Credentials are entered in modals only.
  // ===========================================================================
  // ---- v2 资源 / 能力 ----
  const PAY_ASSET = 'settings/assets/payments/';
  const payImg = (f, hh) => '<img src="' + PAY_ASSET + f + '" style="height:' + (hh || 18) + 'px" alt=""/>';
  const PAY_ICON = {
    cards: payImg('visa.svg', 20) + payImg('mastercard.svg', 20) + payImg('amex.svg', 20) + payImg('unionpay.svg', 20),
    applepay: payImg('applepay.svg'), googlepay: payImg('googlepay.svg'), link: payImg('link.svg'),
    amazonpay: payImg('amazonpay.svg'), klarna: payImg('klarna.svg'), paypal: payImg('paypal-logo.svg', 16),
  };
  // 各处理方「我们采用的集成方式」下 Express 块实际能出的方式（均已查官方文档核实 2026-06，见 PRD §5.2）。
  // PayPal Cards 没有条目：当前接入不提供 PayPal Apple Pay / Google Pay，不能假装成 Express 钱包。
  // Adyen=Components / Checkout=Flow / NMI=Collect.js / Mollie=Components(GooglePay 待确认) / Braintree=Hosted Fields
  const PAY_EXPRESS = {
    stripe: ['applepay', 'googlepay', 'link', 'klarna', 'amazonpay'], airwallex: ['applepay', 'googlepay'],
    adyen: ['applepay', 'googlepay'], checkout: ['applepay', 'googlepay'], mollie: ['applepay'], nmi: ['applepay', 'googlepay'], braintree: ['applepay', 'googlepay'],
  };
  // 连接弹窗字段规格（Stripe / Airwallex 字段、文案、Learn more 链接对齐线上 StripeAccount / AirwallexAccount）
  const PAY_FORMS = {
    stripe: { desc: 'Allows users to pay with Card, Apple Pay, Google Pay, Link, Amazon Pay, and Klarna (where available).',
      fields: [
        { k: 'pub', label: 'Publishable Key', msg: 'Please enter Publishable Key' },
        { k: 'sec', label: 'Secret Key', msg: 'Please enter Secret Key' },
        { k: 'sign', label: 'Signing secret', msg: 'Please enter Signing secret' },
      ] },
    airwallex: { desc: 'Allows users to pay with Visa, Master Card, American Express, Discover, Diners Club, JCB, Afterpay, Klarna, Apple Pay, Google Pay',
      fields: [
        { k: 'cid', label: 'Client ID', msg: 'Please enter Client ID' },
        { k: 'appkey', label: 'App Key', msg: 'Please enter App Key' },
        { k: 'api', label: 'API endpoints', msg: 'Please enter API endpoints', learn: 'https://www.airwallex.com/docs/api' },
        { k: 'wsec', label: 'Webhook Secret Key', msg: 'Please enter Webhook Secret Key' },
        { k: 'wip', label: 'Webhook Whitelist IP addresses', msg: 'Please enter Webhook Whitelist IP addresses', learn: 'https://www.airwallex.com/docs/developer-tools/webhooks/listen-for-webhook-events#whitelist-ip-addresses' },
      ], file: 'Airwallex domain verification file' },
    paypal: { desc: 'Connect one PayPal account for PayPal Wallet and, where eligible, PayPal Cards.', fields: [
      { k: 'cid', label: 'Client ID' }, { k: 'sec', label: 'Client secret' }, { k: 'whid', label: 'Webhook ID' },
    ] },
    adyen: { fields: [{ k: 'api', label: 'API key' }, { k: 'mer', label: 'Merchant account' }, { k: 'ck', label: 'Client key' }, { k: 'hmac', label: 'HMAC key' }] },
    checkout: { fields: [{ k: 'pub', label: 'Public key' }, { k: 'sec', label: 'Secret key' }, { k: 'wsig', label: 'Webhook signature key' }] },
    mollie: { fields: [{ k: 'api', label: 'API key (live)' }, { k: 'pid', label: 'Profile ID' }, { k: 'wsec', label: 'Webhook secret' }] },
    nmi: { fields: [{ k: 'sk', label: 'Security key' }, { k: 'tk', label: 'Tokenization key' }, { k: 'wsk', label: 'Webhook signing key' }] },
    braintree: { fields: [{ k: 'mid', label: 'Merchant ID' }, { k: 'pub', label: 'Public key' }, { k: 'priv', label: 'Private key' }] },
    klarna_direct: { fields: [{ k: 'uid', label: 'API username (UID)' }, { k: 'pwd', label: 'API password' }, { k: 'region', label: 'Region（EU / NA / OC）' }] },
  };

  // PayPal Cards reuses the connected PayPal account. It is a primary-card candidate,
  // not a second card form and not an Express wallet provider.
  const pProcsVis = () => {
    const pp = D.payments.paypal;
    const paypalCards = pp.connected && pp.capabilities.cards === 'eligible'
      ? [{ key: 'paypal_cards', name: 'PayPal Cards', logo: 'paypal-logo.svg', connected: true, accountKey: 'paypal' }]
      : [];
    return D.payments.processors.concat(paypalCards);
  };
  const pConnected = () => pProcsVis().filter((p) => p.connected);
  function pActive() { let a = pProcsVis().find((p) => p.key === D.payments.cardProcessor && p.connected); if (!a) a = pConnected()[0] || null; return a; }
  const pLogo = (p, hh) => p.logo
    ? payImg(p.logo, hh || 20) + (p.key === 'paypal_cards' ? '<span>PayPal Cards</span>' : '')
    : '<span class="pm-mono">' + esc(p.name) + '</span>';
  function pMethPill(connected, on) {
    if (!connected) return '<span class="pill pill-gray"><span class="dot"></span>Not connected</span>';
    return on ? '<span class="pill pill-green"><span class="dot"></span>Connected</span>' : '<span class="pill pill-gray"><span class="dot"></span>Disabled</span>';
  }
  // ① 卡 + Express 单处理方槽位（picker 内连接/切换/管理）
  function pSlot() {
    const a = pActive();
    const picker = '<div class="proc-pick"><span class="lab">Card processor</span>' +
      pProcsVis().map((p) => {
        if (p.connected) {
          const on = a && p.key === a.key;
          // ⚙ on every connected provider → edit credentials anytime; click a non-active name = switch
          const cog = '<button class="pchip-cog" data-cfg="' + (p.accountKey || p.key) + '" title="Manage credentials">⚙</button>';
          if (on) return '<span class="pchip on"><span class="pchip-name">' + pLogo(p, 15) + '</span>' + cog + '</span>';
          return '<span class="pchip"><button class="pchip-name" data-setproc="' + p.key + '" title="Set as processor">' + pLogo(p, 15) + '</button>' + cog + '</span>';
        }
        return '<button class="add" data-cfg="' + p.key + '">+ ' + esc(p.name) + '</button>';
      }).join('') + '</div>';
    if (!a) {
      return '<div class="panel card-pad"><div class="slot-head"><span class="slot-title">Cards &amp; Express processor</span>' + picker + '</div>' +
        '<div class="muted" style="padding:14px 0 4px;font-size:13px">No processor connected yet. Click “+ …” above to connect one and start accepting cards and Apple/Google Pay.</div></div>';
    }
    const paypalCards = a.key === 'paypal_cards';
    const expIcos = (PAY_EXPRESS[a.key] || []).map((id) => PAY_ICON[id]).join(' ');
    const intro = paypalCards
      ? 'PayPal Cards uses the connected PayPal account. It replaces the card processor only; PayPal Apple Pay and Google Pay are not available in this integration.'
      : 'Once a processor is connected, card input and Express both show at checkout automatically; the specific wallets are auto-detected by buyer device/environment.';
    const cardMeta = paypalCards ? 'PayPal Card Fields · Visa / Mastercard / Amex …' : 'Visa / Mastercard / Amex / UnionPay …';
    const expressRow = paypalCards
      ? '<div class="slot-row"><span class="ic"><span class="pill pill-gray"><span class="dot"></span>Not available</span></span><div class="bd"><span class="lbl">Express wallets</span><span class="meta">Apple Pay and Google Pay are not available with the current PayPal integration.</span></div></div>'
      : '<div class="slot-row"><span class="ic">' + (expIcos || '<span class="muted" style="font-size:12px">This processor has no Express</span>') + '</span><div class="bd"><span class="lbl">Express Checkout</span><span class="meta">Auto-rendered by buyer environment · <span class="lnkico" data-dash="' + a.key + '">Manage in dashboard ↗</span></span></div></div>';
    return '<div class="panel card-pad">' +
      '<div class="slot-head"><span class="slot-title">Processed by ' + esc(a.name) + '</span>' + picker + '</div>' +
      '<div class="sec-sub" style="margin:0 0 14px">' + intro + '</div>' +
      '<div class="slot-row"><span class="ic">' + PAY_ICON.cards + '</span><div class="bd"><span class="lbl">Cards</span><span class="meta">' + cardMeta + '</span></div></div>' +
      expressRow +
      '<div class="syncline">Synced from the active processor · just now · <span class="lnkico" data-dash="' + a.key + '">↻ Refresh</span></div>' +
    '</div>';
  }

  // ② 独立支付方式（PayPal / Klarna 自有直连）
  function pIndep() {
    let html = ''; const pp = D.payments.paypal;
    html += '<div class="panel imeth paypal-method"><div class="imeth-head"><span class="lg">' + payImg('paypal-logo.svg', 24) + '</span><div><div class="nm">PayPal Wallet</div><div class="sub">Independent wallet, self-settling · runs alongside the card processor</div></div><div class="right">' + pMethPill(pp.connected, pp.walletOn) + (pp.connected ? '<span class="sw' + (pp.walletOn ? ' on' : '') + '" data-itg="paypal"><i></i></span><button class="set-prim" data-cfg="paypal">Manage</button>' : '<button class="btn btn-primary" data-cfg="paypal">Connect</button>') + '</div></div></div>';
    {
      const k = D.payments.klarna;
      if (k.directConnected) {
        html += '<div class="panel imeth" style="display:block"><div style="display:flex;align-items:center;gap:13px"><span class="lg">' + payImg('klarna.svg', 24) + '</span><div><div class="nm">Klarna · own direct account</div><div class="sub">Your own Klarna direct account · rates usually better than via a PSP</div></div><div class="right">' + pMethPill(true, k.directOn) + '<span class="sw' + (k.directOn ? ' on' : '') + '" data-itg="klarna_direct"><i></i></span><button class="set-prim" data-cfg="klarna_direct">Manage</button></div></div><div class="dnote">💡 Klarna at checkout uses your direct account; if the active processor also has Klarna enabled, it defers to the direct account automatically to avoid showing twice to buyers.</div></div>';
      } else {
        html += '<div class="panel imeth"><span class="lg">' + payImg('klarna.svg', 24) + '</span><div><div class="nm">Klarna · own direct account</div><div class="sub">Have your own Klarna account? Connect it for better rates and platform routing (otherwise it is rendered by the active processor).</div></div><div class="right"><span class="pill pill-gray"><span class="dot"></span>Not connected</span><button class="btn btn-primary" data-cfg="klarna_direct">Connect</button></div></div>';
      }
    }
    return html;
  }

  // 手机端结账预览（对齐实测：快捷支付按钮 → OR → 银行卡）
  function pPreview() {
    const a = pActive();
    const express = a ? (PAY_EXPRESS[a.key] || []).slice() : [];
    const hasPaypal = D.payments.paypal.connected && D.payments.paypal.walletOn;
    const klarnaDirect = D.payments.klarna.directConnected && D.payments.klarna.directOn;
    const hasCard = !!a;
    if (!express.length && !hasPaypal && !klarnaDirect && !hasCard) return '<div class="muted" style="text-align:center;padding:24px 0;font-size:13px">No payment provider connected yet, buyers can\'t pay.</div>';
    const order = { applepay: 0, googlepay: 1, link: 2, amazonpay: 3, klarna: 4 };
    express.sort((x, y) => (order[x] ?? 9) - (order[y] ?? 9));
    const stacked = a && a.key === 'airwallex';
    const ppBtn = '<div style="height:46px;border-radius:9px;background:#ffc439;display:grid;place-items:center;margin-bottom:8px">' + payImg('paypal-logo.svg', 20) + '</div>';
    const fullBox = (id) => '<div class="wallet" style="width:100%;height:46px;margin-bottom:8px">' + PAY_ICON[id] + '</div>';
    let html = '';
    if (hasPaypal) html += ppBtn;
    if (stacked) {
      express.forEach((id) => html += fullBox(id));
      if (klarnaDirect && !express.includes('klarna')) html += fullBox('klarna');
    } else {
      const grid = express.slice(); if (klarnaDirect && !grid.includes('klarna')) grid.push('klarna');
      if (grid.length) html += '<div class="wallets">' + grid.map((id, i) => { const full = (grid.length % 2 === 1) && (i === grid.length - 1); return '<div class="wallet"' + (full ? ' style="grid-column:1 / -1"' : '') + '>' + PAY_ICON[id] + '</div>'; }).join('') + '</div>';
    }
    if (hasCard) {
      const anyW = hasPaypal || express.length || klarnaDirect;
      if (anyW) html += '<div style="text-align:center;font-size:11px;color:var(--ink-muted);margin:2px 0 10px">or pay with card</div>';
      const cardLabel = a && a.key === 'paypal_cards' ? 'Cards · PayPal' : 'Cards';
      html += '<div class="ck-opt sel"><span class="ck-radio"></span><span>' + cardLabel + '</span><span class="ck-ico">' + PAY_ICON.cards + '</span></div>';
    }
    return html + '<div class="ck-pay">Pay now</div>';
  }

  function pReco() {
    if (D.payments.phase !== 2) return '';
    return '<div class="reco"><div class="star">★</div><div style="flex:1"><div style="font-weight:700;font-size:14px;color:var(--ink)">BestShopio Payments <span class="pill pill-blue" style="margin-left:6px"><span class="dot"></span>Coming soon</span></div><div class="sec-sub" style="margin:3px 0 0">Platform acquiring — one-click setup, instant settlement, smart routing + retries behind the scenes. No account of your own needed.</div></div><button class="btn btn-gray" disabled style="opacity:.6;cursor:default">Coming soon</button></div>';
  }

  // Switch processor — confirm dialog (reuses SPA modal())
  function pConfirmSwitch(key) {
    const cur = pActive(); const p = pProcsVis().find((x) => x.key === key);
    const paypalImpact = key === 'paypal_cards'
      ? '<div class="dnote" style="margin-top:10px">Cards will move to PayPal. Apple Pay and Google Pay from the current processor will no longer be shown.</div>'
      : '';
    modal({ title: 'Switch card processor', width: 440, okText: 'Switch',
      body: '<div style="font-size:13.5px;line-height:1.65;color:var(--ink-body)">Cards and Express Checkout at checkout will switch processor. The payment methods buyers see may change accordingly.</div><div style="font-size:13px;margin-top:8px"><b>' + esc(cur ? cur.name : '—') + '</b> → <b>' + esc(p.name) + '</b></div>' + paypalImpact + '<div class="muted" style="font-size:12px;margin-top:10px">Switch during off-peak hours; in-flight transactions are unaffected.</div>',
      onOk: (m, close) => { D.payments.cardProcessor = key; close(); renderPayments(); toast('Switched successfully'); } });
  }

  function pIsConnected(key) { if (key === 'paypal') return D.payments.paypal.connected; if (key === 'paypal_cards') return D.payments.paypal.connected && D.payments.paypal.capabilities.cards === 'eligible'; if (key === 'klarna_direct') return D.payments.klarna.directConnected; const p = D.payments.processors.find((p) => p.key === key); return p && p.connected; }
  function pEntName(key) { if (key === 'paypal' || key === 'paypal_cards') return 'PayPal'; if (key === 'klarna_direct') return 'Klarna Direct'; const p = D.payments.processors.find((p) => p.key === key); return p ? p.name : ''; }

  // 连接 / 管理弹窗（复用 SPA modal()；凭证按 shop_id 隔离 + webhook 提示）
  function pConnect(key) {
    if (key === 'paypal') D.payments.paypal.connected = true;
    else if (key === 'paypal_cards') return;
    else if (key === 'klarna_direct') { D.payments.klarna.directConnected = true; D.payments.klarna.directOn = true; }
    else { const pr = D.payments.processors.find((p) => p.key === key); pr.connected = true; if (!D.payments.processors.some((p) => p.connected && p.key === D.payments.cardProcessor)) D.payments.cardProcessor = key; }
  }
  function pDisconnect(key) {
    if (key === 'paypal') {
      D.payments.paypal.connected = false;
      if (D.payments.cardProcessor === 'paypal_cards') { const n = pConnected()[0]; D.payments.cardProcessor = n ? n.key : null; }
    }
    else if (key === 'klarna_direct') D.payments.klarna.directConnected = false;
    else { const pr = D.payments.processors.find((p) => p.key === key); pr.connected = false; if (D.payments.cardProcessor === key) { const n = pConnected()[0]; D.payments.cardProcessor = n ? n.key : null; } }
  }
  function pOpenConnect(key) {
    const connected = pIsConnected(key); const name = pEntName(key);
    const spec = PAY_FORMS[key] || { fields: [{ k: 'k1', label: 'API key' }, { k: 'k2', label: 'Secret' }] };
    let body = '';
    if (spec.desc) body += '<div class="muted" style="font-size:13px;margin-bottom:12px;line-height:1.5">' + esc(spec.desc) + '</div>';
    if (key === 'paypal') body += pPaypalCapabilities();
    body += '<div class="muted" style="font-size:12.5px;margin-bottom:14px;line-height:1.5">Credentials are used for this store only (isolated by shop_id). Webhook callback URL:<br/><code style="font-size:11.5px;color:var(--brand)">/webhook/' + key + '/{shop_id}</code></div>';
    body += spec.fields.map((f) => {
      const learn = f.learn ? '<a href="' + f.learn + '" target="_blank" style="font-size:12px;color:var(--brand);font-weight:400">Learn more</a>' : '';
      return '<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;color:var(--ink);margin-bottom:6px"><span>' + esc(f.label) + ' <span style="color:var(--err)">*</span></span>' + learn + '</div>' +
        '<input class="input" data-pf="' + f.k + '" placeholder="Please enter ' + esc(f.label) + '"' + (connected ? ' value="•••••••••••• (saved)"' : '') + ' />' +
        '<div data-perr="' + f.k + '" style="min-height:18px;font-size:12px;color:var(--err);margin-top:3px"></div></div>';
    }).join('');
    if (spec.file) body += '<div style="margin-bottom:4px"><div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:6px">' + esc(spec.file) + '</div><button class="btn btn-default" type="button" data-zip>Upload ZIP</button><div class="muted" style="font-size:11.5px;margin-top:4px">Only .zip files up to 1MB are supported.</div></div>';

    const dlg = modal({
      title: (connected ? 'Manage ' : 'Connect ') + name, width: 520, okText: connected ? 'Save' : 'Connect',
      body,
      extraLeft: connected ? '<button class="btn" style="background:var(--err);color:#fff" data-disc>Cancel connection</button>' : '',
      onOk: (m, close) => {
        // 校验：必填字段不能为空（对齐线上 validateForm）
        let okAll = true, firstBad = null;
        spec.fields.forEach((f) => {
          const inp = m.querySelector('[data-pf="' + f.k + '"]');
          const err = m.querySelector('[data-perr="' + f.k + '"]');
          const val = ((inp && inp.value) || '').trim();
          if (!val) { okAll = false; if (err) err.textContent = f.msg || ('Please enter ' + f.label); if (inp) inp.style.borderColor = 'var(--err)'; if (!firstBad) firstBad = inp; }
        });
        if (!okAll) { if (firstBad) firstBad.focus(); return; }   // 校验不过不关闭
        if (!connected) pConnect(key);
        close(); renderPayments(); toast(connected ? 'Edit successfully' : 'Connected successfully');
      },
      onExtra: (m, close) => { pDisconnect(key); close(); renderPayments(); toast('Cancelled connection successfully'); },
    });
    // 输入即清除该字段错误；ZIP 走本地文件选择（原型）
    dlg.m.querySelectorAll('[data-pf]').forEach((inp) => inp.oninput = () => { const err = dlg.m.querySelector('[data-perr="' + inp.dataset.pf + '"]'); if (err) err.textContent = ''; inp.style.borderColor = ''; });
    const zip = dlg.m.querySelector('[data-zip]'); if (zip) zip.onclick = () => openFilePicker();
  }

  const PAY_CSS =
    '.payv2{width:100%}.payv2 .pay-grid{display:grid;grid-template-columns:1fr;gap:24px;align-items:start;width:100%;max-width:none}' +
    '@media(min-width:1200px){.payv2 .pay-grid{grid-template-columns:minmax(0,1fr) 340px}}' +
    '.payv2 .seg{display:inline-flex;background:#eef0f7;border-radius:9px;padding:3px;gap:2px}' +
    '.payv2 .seg button{border:none;background:transparent;height:30px;padding:0 14px;border-radius:7px;font-size:13px;font-weight:600;color:var(--ink-muted);cursor:pointer}' +
    '.payv2 .seg button.on{background:#fff;color:var(--brand);box-shadow:0 1px 2px rgb(16 24 40/8%)}' +
    '.payv2 .sec-title{font-size:14px;font-weight:600;color:var(--ink);margin:20px 0 4px}' +
    '.payv2 .sec-sub{font-size:13px;color:var(--ink-muted);margin:0 0 12px;line-height:1.5}' +
    '.payv2 .slot-head{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-bottom:10px}' +
    '.payv2 .slot-title{font-weight:600;font-size:14px;color:var(--ink)}' +
    '.payv2 .proc-pick{display:flex;gap:8px;flex-wrap:wrap;align-items:center;row-gap:8px}' +
    '.payv2 .proc-pick .lab{font-size:12px;color:var(--ink-muted);margin-right:2px}' +
    '.payv2 .proc-pick button{height:30px;padding:0 11px;border-radius:8px;border:1px solid var(--ctl);background:#fff;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;color:var(--ink)}' +
    '.payv2 .proc-pick button.on{border-color:var(--brand);background:var(--brand-50);color:var(--brand);font-weight:600}' +
    '.payv2 .proc-pick img{height:15px}' +
    '.payv2 .proc-pick .add{border-style:dashed;color:var(--brand)}' +
    '.payv2 .proc-pick .add:hover{background:var(--brand-50)}' +
    '.payv2 .proc-pick .pchip{display:inline-flex;align-items:center;height:30px;border:1px solid var(--ctl);border-radius:8px;overflow:hidden}' +
    '.payv2 .proc-pick .pchip.on{border-color:var(--brand);background:var(--brand-50)}' +
    '.payv2 .proc-pick .pchip .pchip-name{height:28px;padding:0 6px 0 11px;border:none;background:transparent;display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--ink);cursor:pointer}' +
    '.payv2 .proc-pick .pchip.on .pchip-name{color:var(--brand);font-weight:600;cursor:default}' +
    '.payv2 .proc-pick .pchip .pchip-name:hover{background:rgba(0,0,0,.04)}' +
    '.payv2 .proc-pick .pchip.on .pchip-name:hover{background:transparent}' +
    '.payv2 .proc-pick .pchip .pchip-cog{height:28px;padding:0 8px;border:none;border-left:1px solid var(--hair);background:transparent;color:var(--ink-muted);cursor:pointer;font-size:12px}' +
    '.payv2 .proc-pick .pchip .pchip-cog:hover{background:rgba(0,0,0,.05);color:var(--ink)}' +
    '.payv2 .proc-pick .lock{height:30px;padding:0 11px;border-radius:8px;border:1px dashed var(--hair);background:var(--panel);font-size:13px;color:var(--ink-muted);display:inline-flex;align-items:center;gap:6px}' +
    '.payv2 .slot-row{display:flex;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--hair)}' +
    '.payv2 .slot-row .ic{display:flex;gap:4px;align-items:center;flex-wrap:wrap}' +
    '.payv2 .slot-row .ic img{height:20px}' +
    '.payv2 .slot-row .bd{display:flex;flex-direction:column}' +
    '.payv2 .slot-row .lbl{font-weight:600;font-size:13.5px;color:var(--ink)}' +
    '.payv2 .slot-row .meta{font-size:12px;color:var(--ink-muted);margin-top:2px}' +
    '.payv2 .slot-row .right{margin-left:auto}' +
    '.payv2 .sw{width:34px;height:20px;border-radius:9999px;background:#cfd5e4;position:relative;cursor:pointer;transition:background .15s;flex:none;display:inline-block}' +
    '.payv2 .sw.on{background:var(--brand)}' +
    '.payv2 .sw i{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgb(0 0 0/20%)}' +
    '.payv2 .sw.on i{left:16px}' +
    '.payv2 .lnkico{color:var(--brand);cursor:pointer}.payv2 .lnkico:hover{text-decoration:underline}' +
    '.payv2 .syncline{font-size:12px;color:var(--ink-muted);padding-top:12px;border-top:1px solid var(--hair);display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.payv2 .imeth{display:flex;align-items:center;gap:13px;padding:15px 16px;margin-bottom:12px}' +
    '.payv2 .paypal-method{display:block}.payv2 .imeth-head{display:flex;align-items:center;gap:13px}' +
    '.payv2 .imeth .lg{height:24px;display:flex;align-items:center}.payv2 .imeth .lg img{height:24px}' +
    '.payv2 .imeth .nm{font-weight:700;font-size:14px;color:var(--ink)}' +
    '.payv2 .imeth .sub{font-size:12.5px;color:var(--ink-muted);margin-top:2px}' +
    '.payv2 .imeth .right{margin-left:auto;display:flex;align-items:center;gap:10px}' +
    '.payv2 .dnote{margin:10px 0 0;font-size:12.5px;color:#1e3a8a;background:#eef4ff;border:1px solid #cfe1ff;border-radius:9px;padding:9px 12px;line-height:1.6}' +
    '.payv2 .set-prim{font-size:12px;color:var(--brand);background:#fff;border:1px solid var(--ctl);border-radius:8px;padding:5px 11px;cursor:pointer}' +
    '.payv2 .set-prim:hover{border-color:var(--brand);background:var(--brand-50)}' +
    '.payv2 .pm-mono{font-weight:800;font-size:13px;color:var(--ink)}' +
    '.payv2 .reco{display:flex;align-items:center;gap:14px;padding:16px;border:1px solid #cfe1ff;background:linear-gradient(95deg,#eef4ff,#f7faff);border-radius:12px;margin-bottom:18px}' +
    '.payv2 .reco .star{width:38px;height:38px;border-radius:10px;background:var(--brand);color:#fff;display:grid;place-items:center;flex:none}' +
    '.payv2 .preview-col{position:sticky;top:16px}' +
    '.payv2 .phone{background:#fff;border:1px solid var(--ctl);border-radius:22px;box-shadow:var(--float-shadow);padding:14px;max-width:380px;margin:0 auto}' +
    '.payv2 .phone-notch{width:90px;height:5px;border-radius:3px;background:#e3e6ef;margin:2px auto 12px}' +
    '.payv2 .ck-h{font-size:13px;font-weight:700;color:var(--ink);margin:2px 0 10px}' +
    '.payv2 .ck-opt{display:flex;align-items:center;gap:10px;border:1px solid var(--ctl);border-radius:10px;padding:11px 12px;margin-bottom:8px;font-size:13px}' +
    '.payv2 .ck-opt.sel{border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-50)}' +
    '.payv2 .ck-radio{width:16px;height:16px;border-radius:50%;border:2px solid var(--ctl);flex:none}' +
    '.payv2 .ck-opt.sel .ck-radio{border-color:var(--brand);background:radial-gradient(circle at center,var(--brand) 0 4px,#fff 5px)}' +
    '.payv2 .ck-ico{margin-left:auto;display:flex;gap:4px}.payv2 .ck-ico img{height:16px}' +
    '.payv2 .ck-pay{margin-top:6px;height:42px;border-radius:10px;background:var(--brand);color:#fff;font-weight:700;font-size:14px;display:grid;place-items:center}' +
    '.payv2 .wallets{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}' +
    '.payv2 .wallet{height:40px;border-radius:9px;border:1px solid var(--ctl);display:grid;place-items:center}.payv2 .wallet img{height:18px}' +
    '.payv2 .preview-note{font-size:11.5px;color:var(--ink-muted);text-align:center;margin-top:10px;line-height:1.5}' +
    '.payv2 .foot-note{font-size:12px;color:var(--ink-muted);margin-top:20px;line-height:1.7}';

  function renderPayments() {
    const main =
      '<div class="sec-title" style="margin-top:0">① Cards &amp; Express checkout</div>' +
      '<div class="sec-sub">Only one processor at a time renders card fields. Express wallets follow the active processor; PayPal Cards does not provide Apple Pay or Google Pay in this integration.</div>' +
      pSlot() +
      '<div class="sec-title">② Independent payment methods</div>' +
      '<div class="sec-sub">Self-settling — can run alongside the card processor, each on its own rails.</div>' +
      pIndep();
    const preview =
      '<div class="preview-col"><div class="phone"><div class="phone-notch"></div>' +
        '<div class="ck-h">Checkout · methods buyers see</div>' + pPreview() + '</div>' +
        '<div class="preview-note">What buyers see are the methods lit up by connected providers; flip the switches above and this updates live.</div></div>';
    paint(
      '<style>' + PAY_CSS + '</style>' +
      '<div class="payv2">' +
        '<div style="margin-bottom:14px"><div class="page-title" style="font-size:20px">Payments</div></div>' +
        '<div class="pay-grid"><div>' + main + '</div>' + preview + '</div>' +
      '</div>',
      false
    );
    root.querySelectorAll('[data-setproc]').forEach((el) => el.onclick = () => pConfirmSwitch(el.dataset.setproc));
    root.querySelectorAll('[data-itg]').forEach((el) => el.onclick = () => { const k = el.dataset.itg; if (k === 'paypal') D.payments.paypal.walletOn = !D.payments.paypal.walletOn; else if (k === 'klarna_direct') D.payments.klarna.directOn = !D.payments.klarna.directOn; renderPayments(); });
    root.querySelectorAll('[data-cfg]').forEach((el) => el.onclick = () => pOpenConnect(el.dataset.cfg));
    root.querySelectorAll('[data-dash]').forEach((el) => el.onclick = () => toast('(Prototype) Opens the processor dashboard — Payment method configurations'));
  }

  // (旧 openProviderModal 已移除——连接/管理改由 pOpenConnect 承接，见上)

  // NOTE: Tracking pixels (Meta / GA4 / TikTok / Google Ads / Custom) moved out
  //   of Settings — Pixel + CAPI now lives in each platform's Channel workspace:
  //   #/facebook (Meta) and #/google (GA4 + Google Ads). Aligns with BestShopio
  //   Channel architecture.

  // ===========================================================================
  // TAB 3 — CURRENCY  ("Currency", full width)
  //   index.vue: description "Default currency: USD $" + search bar + table.
  //   edit.vue rendered as a modal here (rate/symbol/status), exchange_rate_type
  //   0 = automatic, 1 = manual; price rounding "Round up to the nearest …".
  // ===========================================================================
  function renderCurrency() {
    const c = D.currency;
    const rows = c.list.map((r) =>
      '<tr data-cid="' + r.id + '">' +
        '<td><div class="flex items-center gap-2"><span class="ccy-flag">' + esc(r.country_code) + '</span>' +
          '<span class="subtle" style="font-weight:500">' + esc(r.country_name) + '</span></div></td>' +
        '<td>' + esc(r.currency_code) + '</td>' +
        '<td>' + esc(r.currency_symbol) + '</td>' +
        '<td>' + toggle(r.currency_status === 1, r.currency_code + ' status') + '</td>' +
        '<td>' + esc(r.exchange_rate_type_text) + '</td>' +
        '<td class="muted">' + esc(r.exchange_rate_round_type_text) + '</td>' +
        '<td style="text-align:right"><button class="lnk" data-edit-ccy="' + r.id + '">Edit</button></td>' +
      '</tr>').join('');

    const fieldOpts = c.searchFieldOptions.map((o) => '<option value="' + o.value + '">' + esc(o.label) + '</option>').join('');

    const table =
      '<div class="panel">' +
        '<div class="card-pad" style="background:#f7f8fb;border-bottom:1px solid var(--hair);border-radius:10px 10px 0 0;padding:12px 16px">' +
          '<div class="flex items-center gap-2 flex-wrap">' +
            '<select class="filter-select" style="width:160px">' + fieldOpts + '</select>' +
            '<input class="filter-input" placeholder="Please enter keywords to search" style="padding-left:12px;width:268px" />' +
            '<select class="filter-select" style="width:160px"><option>Status</option><option>On</option><option>Off</option></select>' +
            '<select class="filter-select" style="width:160px"><option>Exchange rate</option><option>Automatic</option><option>Manual</option></select>' +
          '</div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="tbl" style="min-width:900px">' +
          '<thead><tr><th>Country</th><th>Currency code</th><th>Currency symbol</th><th>Status</th><th>Exchange rate</th><th>Price rounding</th><th style="text-align:right">Action</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table></div>' +
      '</div>';

    paint(
      pageHead('Currency', 'Default currency: ' + c.defaultCurrency) +
      table,
      false
    );

    root.querySelectorAll('[data-edit-ccy]').forEach((b2) => b2.onclick = (e) => { e.stopPropagation(); openCurrencyEdit(Number(b2.getAttribute('data-edit-ccy'))); });
    root.querySelectorAll('#root tr[data-cid]').forEach((tr) => tr.onclick = () => openCurrencyEdit(Number(tr.getAttribute('data-cid'))));
  }

  function openCurrencyEdit(id) {
    const r = D.currency.list.find((x) => x.id === id);
    if (!r) return;
    const auto = r.exchange_rate_type === 0;
    const radio = (on, label, sub) =>
      '<label class="set-radio2' + (on ? ' on' : '') + '"><span class="proc-radio">' + (on ? '<span class="proc-dot"></span>' : '') + '</span>' +
      '<span><span class="subtle" style="font-weight:500">' + esc(label) + '</span>' + (sub ? '<div class="muted" style="font-size:12px;margin-top:2px">' + esc(sub) + '</div>' : '') + '</span></label>';
    const round = r.exchange_rate_round_type === 1;
    const body =
      block('<div class="flex gap-8 text-sm"><div><span class="muted">Currency code:</span> <span class="subtle" style="font-weight:500">' + esc(r.currency_code) + '</span></div>' +
            '<div><span class="muted">Currency symbol:</span> <span class="subtle" style="font-weight:500">' + esc(r.currency_symbol) + '</span></div></div>') +
      // Exchange rate
      '<div style="border:1px solid var(--hair);border-radius:10px;padding:14px 16px;margin-top:16px">' +
        '<div class="card-title" style="font-size:15px;margin-bottom:10px">Exchange rate</div>' +
        '<div class="flex flex-col gap-2">' +
          radio(auto, 'Using automatic exchange rates', 'The price of an item will change automatically based on the market rate and includes a 0% conversion fee. 1 ' + r.original_currency + ' = ' + r.exchange_rate_auto_value + ' ' + r.currency_code + '.') +
          radio(!auto, 'Use manual exchange rates', 'Customized exchange rates, no conversion fees.') +
        '</div>' +
        '<div class="mt-2 flex items-center gap-2" style="' + (auto ? 'opacity:.5' : '') + '"><span class="muted text-sm">1 ' + esc(r.original_currency) + ' =</span>' +
          '<div class="set-addon"><input class="input" type="number" value="' + esc(r.exchange_rate) + '" step="0.01" min="0" style="width:160px;border-top-right-radius:0;border-bottom-right-radius:0" /><span class="set-addon-suffix">' + esc(r.currency_code) + '</span></div></div>' +
      '</div>' +
      // Price rounding
      '<div style="border:1px solid var(--hair);border-radius:10px;padding:14px 16px;margin-top:16px">' +
        '<div class="card-title" style="font-size:15px;margin-bottom:10px">Price rounding</div>' +
        '<div class="flex flex-col gap-2">' +
          '<label class="set-radio' + (round ? ' on' : '') + '"><span class="proc-radio">' + (round ? '<span class="proc-dot"></span>' : '') + '</span><span>Round up to the nearest ' + esc(r.currency_code) + ' ' + esc(r.currency_symbol) + '</span>' +
            '<input class="input" type="number" value="' + (r.exchange_rate_round || 1) + '" min="1" style="width:120px;margin-left:8px"' + (round ? '' : ' disabled') + ' /></label>' +
          '<label class="set-radio' + (round ? '' : ' on') + '"><span class="proc-radio">' + (round ? '' : '<span class="proc-dot"></span>') + '</span>Do not round prices</label>' +
          (round ? '' : '<div class="muted" style="font-size:12px;margin-left:24px">The price will automatically be rounded to two decimal places.</div>') +
        '</div>' +
      '</div>' +
      // Price decimal
      '<div style="border:1px solid var(--hair);border-radius:10px;padding:14px 16px;margin-top:16px">' +
        '<div class="card-title" style="font-size:15px;margin-bottom:10px">Price decimal</div>' +
        '<div class="flex flex-col gap-2">' + [0, 1, 2].map((d) => '<label class="set-radio' + (r.exchange_rate_decimal === d ? ' on' : '') + '"><span class="proc-radio">' + (r.exchange_rate_decimal === d ? '<span class="proc-dot"></span>' : '') + '</span>' + d + '</label>').join('') + '</div>' +
      '</div>';
    modal({ title: r.country_name, width: 600, okText: 'Update', body, onOk: (m, close) => { close(); toast('Updated successfully'); } });
  }

  // ===========================================================================
  // TAB 4 — METAFIELDS  ("Metafields", centered w-860)
  //   list.tsx (resource picker) -> detail.tsx (Name / Data Type / Used in) ->
  //   form.tsx (add/edit, custom. prefix). No system pill / nskey in the table.
  //   sub-state: mfResource = null (picker) | 'products' | 'variants'
  // ===========================================================================
  let mfResource = null;
  let mfAdding = false; // true = showing the inline "Add field definition" view (not a modal — mirrors form.tsx)

  function renderMetafields() {
    const m = D.metafields;
    if (!mfResource) {
      const rows = m.resources.map((r) => {
        const count = (m.definitions[r.key] || []).length;
        const ico = r.badge
          ? '<span class="mf-res-ico">' + esc(r.badge) + '</span>'
          : '<span class="mf-res-ico">' + I.tagSm + '</span>';
        return '<button class="mf-res" data-res="' + r.key + '">' + ico +
          '<span style="flex:1;text-align:left"><span class="text-sm" style="font-weight:600;color:var(--ink);display:block">' + esc(r.title) + '</span>' +
          '<span class="muted" style="font-size:12.5px">' + count + ' definitions</span></span>' +
          '<span class="muted">' + I.chevR + '</span></button>';
      }).join('');
      paint(
        pageHead('Metafields', 'Add a custom piece of data to a specific part of your store') +
        '<div class="panel card-pad">' + sectionTitle('Metafield', 'Select a module to manage extended fields') +
          '<div class="mt-4 flex flex-col gap-2">' + rows + '</div>' +
        '</div>',
        true
      );
      root.querySelectorAll('[data-res]').forEach((b2) => b2.onclick = () => { mfResource = b2.getAttribute('data-res'); renderMetafields(); });
      return;
    }

    const r = m.resources.find((x) => x.key === mfResource);
    const defs = m.definitions[mfResource] || [];
    if (mfAdding) { paintAddDefinition(r); return; }
    const suffix = mfResource === 'variants' ? 'variants' : 'products';
    const title = mfResource === 'variants' ? 'Product variant metafields' : 'Product metafields';
    const rows = defs.map((d) =>
      '<tr>' +
        '<td><div class="flex items-center gap-3"><span class="muted mf-grip">' + I.grip + '</span><span class="subtle" style="font-weight:500">' + esc(d.name) + '</span></div></td>' +
        '<td><div class="flex items-center gap-2"><span class="mf-type-ico">' + I.tagSm + '</span><span>' + esc(d.typeLabel) + '</span></div></td>' +
        '<td class="muted">' + d.usedIn + ' ' + suffix + '</td>' +
      '</tr>').join('');

    paint(
      '<div class="flex items-center justify-between mb-4">' +
        '<div class="flex items-center gap-3">' +
          '<button class="back-btn" data-act="mf-back" title="Back">' + I.chevL + '</button>' +
          '<div class="page-title" style="font-size:18px">' + esc(title) + '</div>' +
        '</div>' +
        (defs.length ? '<button class="btn btn-primary" data-act="mf-add">Add fields</button>' : '') +
      '</div>' +
      (defs.length
        ? '<div class="panel"><div style="overflow-x:auto"><table class="tbl" style="min-width:560px">' +
            '<thead><tr><th>Name</th><th>Data Type</th><th>Used in</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table></div>' +
            '<div class="flex items-center justify-between card-pad"><span class="muted" style="font-size:13px">Total ' + defs.length + ' records</span></div>' +
          '</div>'
        : // blank state (blank.tsx)
          '<div class="panel" style="min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px">' +
            '<div class="mf-blank-ico">' + I.tagSm + '</div>' +
            '<div class="card-title" style="font-size:18px;margin-top:16px">' + (mfResource === 'variants' ? 'Add metafield for product variant' : 'Add metafield for product category') + '</div>' +
            '<div class="muted" style="font-size:13px;margin-top:6px;margin-bottom:18px">' + (mfResource === 'variants' ? 'Used to add extention fields and data for product variant' : 'Used to add extention fields and data for product category') + '</div>' +
            '<button class="btn btn-primary" data-act="mf-add">Add fields</button>' +
          '</div>'),
      true
    );
    const back = root.querySelector('[data-act="mf-back"]'); if (back) back.onclick = () => { mfResource = null; renderMetafields(); };
    root.querySelectorAll('[data-act="mf-add"]').forEach((b2) => b2.onclick = () => { mfAdding = true; renderMetafields(); });
  }

  // Add field definition — an inline VIEW with a back arrow (mirrors form.tsx), NOT a modal.
  function paintAddDefinition(resource) {
    const m = D.metafields;
    const typeOpts = m.typeOptions.map((g) =>
      '<optgroup label="' + esc(g.group) + '">' + g.types.map((t) => '<option value="' + t.type + '">' + esc(t.label) + '</option>').join('') + '</optgroup>').join('');
    const title = resource.key === 'variants' ? 'Add variant metafield definition' : 'Add product metafield definition';
    paint(
      '<div class="flex items-center gap-3 mb-4">' +
        '<button class="back-btn" data-act="def-back" title="Back">' + I.chevL + '</button>' +
        '<div class="page-title" style="font-size:18px">' + esc(title) + '</div>' +
      '</div>' +
      '<div class="panel card-pad">' +
        field('Name', '', 'Name') +
        field('Namespace and key', '', 'namespace.key', { addonBefore: 'custom.' }) +
        '<div style="margin-bottom:12px"><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Type <span style="color:var(--err)">*</span></div>' +
          '<select class="input"><option value="" disabled selected>Select type</option>' + typeOpts + '</select></div>' +
        '<div><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Description (Optional)</div>' +
          '<textarea class="input" rows="3" placeholder="Please Enter" style="height:auto;padding:8px 12px;resize:vertical"></textarea></div>' +
      '</div>' +
      '<div class="flex justify-end gap-2 mt-4">' +
        '<button class="btn btn-default" data-act="def-cancel">Cancel</button>' +
        '<button class="btn btn-primary" data-act="def-add">Add</button>' +
      '</div>',
      true
    );
    const goBack = () => { mfAdding = false; renderMetafields(); };
    const back = root.querySelector('[data-act="def-back"]'); if (back) back.onclick = goBack;
    const cancel = root.querySelector('[data-act="def-cancel"]'); if (cancel) cancel.onclick = goBack;
    const add = root.querySelector('[data-act="def-add"]'); if (add) add.onclick = () => { mfAdding = false; toast(resource.key + ' metafield definition created successfully'); renderMetafields(); };
  }

  // ===========================================================================
  // TAB 6 — SHIPPABLE LOCATIONS  ("Ship locations", full width)
  //   index.vue + list.tsx + table.tsx: filter bar + expandable table
  //   (Country/Region / Located in / Status (Visible|Hidden) / Sort / Action).
  //   LocationFormModal: Country/Region + Located in + Status radio + Sort.
  // ===========================================================================
  function flattenLocations(nodes, depth, acc, openSet) {
    nodes.forEach((n) => {
      acc.push({ node: n, depth: depth });
      if (n.children && n.children.length && openSet.has(n.id)) {
        flattenLocations(n.children, depth + 1, acc, openSet);
      }
    });
    return acc;
  }
  let locOpen = new Set([1]); // expanded row ids (North America open by default)

  function renderLocations() {
    const tree = D.locations.tree;
    let total = 0;
    tree.forEach((n) => { total++; });

    const rowsHtml = () => {
      const flat = flattenLocations(tree, 0, [], locOpen);
      return flat.map(({ node: n, depth }) => {
        const indent = depth * 16;
        const hasKids = n.snum && n.snum > 0;
        const caret = hasKids
          ? '<button class="loc-caret' + (locOpen.has(n.id) ? ' open' : '') + '" data-loc-toggle="' + n.id + '">' + I.chevR + '</button>'
          : '<span style="width:16px;display:inline-block"></span>';
        const flag = depth === 0 && n.code ? '<span class="ccy-flag" style="width:20px;height:14px">' + esc(n.code) + '</span>' : (depth === 0 ? '<span class="ccy-flag" style="width:20px;height:14px"></span>' : '');
        const vis = n.is_show === 1;
        const sortVal = (!n.sort || Number(n.sort) === 0) ? '--' : n.sort;
        return '<tr data-locrow="' + n.id + '">' +
          '<td><div class="flex items-center gap-2" style="padding-left:' + indent + 'px">' + caret + flag + '<span>' + esc(n.name) + '</span></div></td>' +
          '<td class="muted">' + (n.located_in ? esc(n.located_in) : '- -') + '</td>' +
          '<td><div class="flex items-center gap-2">' + toggle(vis, n.name + ' status') + '<span class="muted">' + (vis ? 'Visible' : 'Hidden') + '</span></div></td>' +
          '<td class="muted">' + esc(sortVal) + '</td>' +
          '<td><div class="flex items-center gap-1">' +
            '<button class="set-icon-btn" data-loc-edit="' + n.id + '" title="Edit">' + I.pencil + '</button>' +
            '<button class="set-icon-btn danger" data-loc-del="' + n.id + '" title="Delete">' + I.trash + '</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
    };

    paint(
      pageHead('Ship locations', 'Set delivery regions at checkout', '<button class="btn btn-primary" data-act="loc-add">Add location</button>') +
      '<div class="panel">' +
        '<div class="card-pad" style="background:#fff;border-bottom:1px solid var(--hair);padding:16px">' +
          '<div class="flex items-center gap-2 flex-wrap">' +
            '<select class="filter-select" style="width:150px"><option value="country">Country/Region</option><option value="locatedIn">Located in</option></select>' +
            '<input class="filter-input" placeholder="Search" style="padding-left:12px;width:268px" />' +
            '<select class="filter-select" style="width:160px"><option>Status</option><option>Visible</option><option>Hidden</option></select>' +
          '</div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="tbl loc-table" style="min-width:760px">' +
          '<thead><tr><th>Country/Region</th><th>Located in</th><th style="width:160px">Status</th><th style="width:120px">Sort</th><th style="width:110px">Action</th></tr></thead>' +
          '<tbody id="loc-tbody">' + rowsHtml() + '</tbody>' +
        '</table></div>' +
        '<div class="flex items-center justify-between card-pad"><span class="muted" style="font-size:13px">Total ' + total + ' records</span></div>' +
      '</div>',
      false
    );

    const wire = () => {
      root.querySelectorAll('[data-loc-toggle]').forEach((el) => el.onclick = (e) => {
        e.stopPropagation();
        const id = Number(el.getAttribute('data-loc-toggle'));
        if (locOpen.has(id)) locOpen.delete(id); else locOpen.add(id);
        const tb = root.querySelector('#loc-tbody'); if (tb) { tb.innerHTML = rowsHtml(); wire(); }
      });
      root.querySelectorAll('[data-loc-edit]').forEach((el) => el.onclick = (e) => { e.stopPropagation(); openLocationModal('edit', Number(el.getAttribute('data-loc-edit'))); });
      root.querySelectorAll('[data-loc-del]').forEach((el) => el.onclick = (e) => {
        e.stopPropagation();
        confirm({ title: 'Delete location', content: 'Once deleted, the data cannot be retrieved. Please confirm before proceeding!', okText: 'Delete', danger: true, onOk: () => toast('Location deleted successfully') });
      });
    };
    wire();
    const add = root.querySelector('[data-act="loc-add"]'); if (add) add.onclick = () => openLocationModal('add');
  }

  function findLocNode(nodes, id) {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) { const f = findLocNode(n.children, id); if (f) return f; }
    }
    return null;
  }

  function openLocationModal(mode, id) {
    const rec = mode === 'edit' ? findLocNode(D.locations.tree, id) : null;
    // flat list of all locations as "Located in" options
    const flatOpts = [];
    const walk = (nodes, prefix) => nodes.forEach((n) => {
      flatOpts.push({ id: n.id, label: (prefix ? prefix + ' > ' : '') + n.name });
      if (n.children) walk(n.children, (prefix ? prefix + ' > ' : '') + n.name);
    });
    walk(D.locations.tree, '');
    const vis = rec ? rec.is_show === 1 : true;
    const body =
      field('Country/Region', rec ? rec.name : '', 'Country/Region') +
      '<div style="margin-bottom:12px"><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Located in <span style="color:var(--err)">*</span></div>' +
        '<select class="input"' + (mode === 'edit' ? ' disabled' : '') + '><option value="" disabled' + (rec ? '' : ' selected') + '>Please select</option>' +
          flatOpts.map((o) => '<option value="' + o.id + '"' + (rec && rec.located_in && o.label === (rec.located_in) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
        '</select></div>' +
      '<div style="margin-bottom:12px"><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Status <span style="color:var(--err)">*</span></div>' +
        '<label class="set-radio' + (vis ? ' on' : '') + '" style="margin-right:16px"><span class="proc-radio">' + (vis ? '<span class="proc-dot"></span>' : '') + '</span>Visible</label>' +
        '<label class="set-radio' + (vis ? '' : ' on') + '"><span class="proc-radio">' + (vis ? '' : '<span class="proc-dot"></span>') + '</span>Hidden</label></div>' +
      '<div><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Sort</div>' +
        '<div class="flex items-center gap-3"><input class="input" type="number" min="0" placeholder="Sort" value="' + (rec && rec.sort ? rec.sort : '') + '" style="width:200px" />' +
        '<span class="muted" style="font-size:12px">Higher sort show first</span></div></div>';
    modal({ title: mode === 'edit' ? 'Edit location' : 'Add location', width: 620, okText: mode === 'edit' ? 'Update' : 'Add', body,
      onOk: (m, close) => { close(); toast(mode === 'edit' ? 'Updated successfully' : 'Added successfully'); } });
  }

  // ===========================================================================
  // TAB 7 — SHIPPING RATES  ("Shipping rates", centered w-860)
  //   list.tsx -> general.tsx / custom.tsx (profile detail with ZonesPanel +
  //   NoChargeAreas; custom adds profile-name + Products). Rate/Zone modals.
  //   sub-state: rateProfile = null (list) | profile id
  // ===========================================================================
  let rateProfile = null;

  function renderRates() {
    const data = D.rates;
    if (rateProfile == null) {
      const general = data.profiles.find((p) => p.is_general === 1);
      const customs = data.profiles.filter((p) => p.is_general === 0);

      const generalRow = general
        ? '<div class="rate-row" data-profile="' + general.id + '">' +
            '<span class="rate-ico">' + I.globe + '</span>' +
            '<span style="flex:1;text-align:left"><span class="muted" style="font-size:13px">Supported shipping ' + general.zones_count + ' zone(s)</span></span>' +
            '<span class="muted">' + I.chevR + '</span></div>'
        : '';
      const generalCard =
        '<div class="panel card-pad mb-4">' +
          '<div class="mb-2"><div class="text-sm" style="font-weight:600;color:var(--ink)">General shipping rates</div>' +
            '<div class="muted" style="font-size:12.5px">All products that are not in other shipping profiles.</div></div>' +
          generalRow +
        '</div>';

      const customRow = (p) =>
        '<div class="rate-row" data-profile="' + p.id + '">' +
          '<span class="rate-ico">' + I.globe + '</span>' +
          '<span style="flex:1;text-align:left">' +
            '<span class="text-sm" style="font-weight:600;color:var(--ink);display:block">' + esc(p.name) + '</span>' +
            '<span class="muted" style="font-size:12.5px">Includes ' + (p.products_count || 0) + ' product(s), available for shipping to ' + (p.regions_count || 0) + ' region(s)</span>' +
          '</span>' +
          '<span class="muted">' + I.chevR + '</span></div>';
      const customCard =
        '<div class="panel card-pad mb-4">' +
          '<div class="flex items-center justify-between mb-2"><div><div class="text-sm" style="font-weight:600;color:var(--ink)">Custom shipping profile</div>' +
            '<div class="muted" style="font-size:12.5px">Create a shipping profile to add custom rates for groups of products.</div></div>' +
            '<button class="btn btn-primary" data-act="add-profile">Add</button></div>' +
          '<div class="mt-3 flex flex-col gap-3">' + (customs.length ? customs.map(customRow).join('') : '<div class="muted text-sm" style="text-align:center;padding:24px 0">No custom profiles</div>') + '</div>' +
        '</div>';

      paint(
        pageHead('Shipping rates', 'Set shipping fees at checkout.') +
        generalCard + customCard,
        true
      );
      root.querySelectorAll('[data-profile]').forEach((b2) => b2.onclick = () => { rateProfile = Number(b2.getAttribute('data-profile')); renderRates(); });
      const ap = root.querySelector('[data-act="add-profile"]'); if (ap) ap.onclick = () => { rateProfile = 'new'; renderRates(); };
      return;
    }

    renderRateProfile();
  }

  function renderRateProfile() {
    const data = D.rates;
    const isNew = rateProfile === 'new';
    const p = isNew ? null : data.profiles.find((x) => x.id === rateProfile);
    if (!isNew && !p) { rateProfile = null; renderRates(); return; }
    const isCustom = isNew || p.is_general === 0;
    const sym = data.currencySymbol;
    const title = p ? (p.is_general === 1 ? 'General shipping rates' : 'Edit the shipping rates for custom profile') : 'Add the shipping rates for custom profile';

    const rateRule = (rt) => {
      if (rt.condition_type === 'none') return '';
      if (rt.condition_type === 'price') {
        const mn = Number(rt.min_value || 0);
        return rt.max_value == null ? 'Orders ' + sym + mn.toFixed(2) + ' and up' : 'Orders ' + sym + mn.toFixed(2) + '-' + sym + Number(rt.max_value).toFixed(2);
      }
      const mn = Number(rt.min_value || 0);
      return rt.max_value == null ? 'Weight ' + mn.toFixed(2) + 'g and up' : 'Weight ' + mn.toFixed(2) + 'g-' + Number(rt.max_value).toFixed(2) + 'g';
    };
    const ratePrice = (rt) => rt.price === 0
      ? '<span class="rate-free">Free</span>'
      : '<span class="rate-price">' + sym + Number(rt.price).toFixed(2) + '</span>';

    const zones = p ? p.zones : [];
    const zoneBlock = (z) => {
      const areasText = (z.areas && z.areas.length) ? z.areas.join(', ') : (z.region_ids ? z.region_ids.length + ' region(s)' : '');
      const rates = z.rates.length
        ? '<div class="rate-list">' + z.rates.map((rt) =>
            '<div class="rate-item"><div style="min-width:0"><div class="subtle" style="font-weight:500;font-size:13px">' + esc(rt.name) + '</div>' +
              (rateRule(rt) ? '<div class="muted" style="font-size:12px">' + rateRule(rt) + '</div>' : '') + '</div>' +
              '<div class="flex items-center gap-2">' + ratePrice(rt) +
                '<button class="set-icon-btn" data-rate-menu="' + z.id + ':' + rt.id + '" title="More">' + I.dots + '</button></div></div>').join('') + '</div>'
        : '<div class="rate-empty"><div class="muted text-sm">No shipping rates found for this region</div>' +
            '<div style="margin-top:10px"><button class="btn btn-primary" style="height:28px" data-add-rate="' + z.id + '">Add shipping rate</button></div>' +
            '<div style="margin-top:10px;font-size:12px;color:var(--err)">Add shipping to ensure that customers in this area complete the checkout</div></div>';
      return '<div class="zone-block">' +
        '<div class="flex items-center justify-between">' +
          '<div class="flex items-center gap-2"><span class="zone-ico">' + I.truck + '</span><span class="subtle" style="font-weight:600">' + esc(z.name) + '</span></div>' +
          '<div class="flex items-center gap-2">' +
            (z.rates.length ? '<button class="btn btn-gray" style="height:28px" data-add-rate="' + z.id + '">Add shipping rate</button>' : '') +
            '<button class="set-icon-btn" data-zone-menu="' + z.id + '" title="More">' + I.dots + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="muted" style="font-size:12px;margin:4px 0 10px">Includes deliveries to: ' + esc(areasText) + '</div>' +
        rates +
      '</div>';
    };

    const zonesCard =
      '<div class="panel mb-4">' +
        '<div class="flex items-center justify-between card-pad" style="border-bottom:1px solid var(--hair);padding:16px"><div>' +
          '<div class="text-sm" style="font-weight:600;color:var(--ink);font-size:15px">Shipping zones and shipping rates</div>' +
          '<div class="muted" style="font-size:12px;margin-top:2px">Set shipping zones and rates visible to customers at checkout.</div></div>' +
          (zones.length ? '<button class="btn btn-gray" style="height:28px" data-act="add-zone">Add shipping zone</button>' : '') +
        '</div>' +
        (zones.length
          ? '<div class="card-pad flex flex-col gap-3" style="padding:16px">' + zones.map(zoneBlock).join('') + '</div>'
          : '<div class="card-pad" style="text-align:center;padding:40px"><div class="muted text-sm">No shipping zones yet</div>' +
              '<div style="margin-top:10px"><button class="btn btn-primary" style="height:28px" data-act="add-zone">Add shipping zone</button></div></div>') +
      '</div>';

    const noChargeAreas = D.rates.noChargeAreas;
    const noCharge =
      '<div class="panel card-pad mb-4">' +
        '<div class="text-sm" style="font-weight:600;color:var(--ink);margin-bottom:6px">Areas with no shipping charges added</div>' +
        (noChargeAreas.length
          ? '<div class="muted" style="font-size:12px">' + noChargeAreas.length + ' countries/regions: ' + esc(noChargeAreas.join(', ')) + '</div>'
          : '<div class="muted text-sm">No data available</div>') +
      '</div>';

    // custom-profile name + products
    let customHead = '';
    if (isCustom) {
      const prods = (p && p.products) || [];
      const prodRows = prods.length
        ? '<div class="rate-list">' + prods.map((pr) =>
            '<div class="rate-item"><div class="flex items-center gap-3"><span class="prod-thumb">IMG</span>' +
              '<div><div class="text-sm">' + esc(pr.store_name) + '</div>' + (pr.spec_type === 1 ? '<div class="muted" style="font-size:12px">(' + pr.variantNum + ' variants selected)</div>' : '') + '</div></div>' +
              '<button class="set-icon-btn" title="Remove">' + I.x + '</button></div>').join('') + '</div>'
        : '<div class="muted text-sm" style="text-align:center;padding:24px 0">No data available<div style="margin-top:8px"><button class="btn btn-primary" style="height:28px" data-act="add-products">Add products</button></div></div>';
      customHead =
        '<div class="panel card-pad mb-4">' +
          '<div class="text-sm" style="font-weight:600;color:var(--ink);margin-bottom:6px">Custom profile name <span class="muted" style="font-weight:400">(Customers won\'t see this)</span></div>' +
          '<input class="input" maxlength="100" placeholder="Please enter" value="' + esc(p ? p.name : '') + '" /></div>' +
        '<div class="panel card-pad mb-4">' +
          '<div class="flex items-center justify-between mb-3"><div class="text-sm" style="font-weight:600;color:var(--ink);font-size:15px">Products</div>' +
            (prods.length ? '<button class="btn btn-gray" style="height:28px" data-act="add-products">Add products</button>' : '') + '</div>' +
          prodRows +
        '</div>';
    } else {
      // general profile shows a read-only Products panel
      customHead =
        '<div class="panel card-pad mb-4">' +
          '<div class="text-sm" style="font-weight:600;color:var(--ink);font-size:15px">Products</div>' +
          '<div class="muted" style="font-size:12px;margin-top:4px">All products not in other profiles. Newly created products are added to this profile.</div>' +
          '<div class="muted text-sm" style="text-align:center;padding:24px 0;margin-top:8px;border:1px solid var(--hair);border-radius:8px">No data available</div>' +
        '</div>';
    }

    const footer = isCustom
      ? '<div class="flex items-center ' + (isNew ? 'justify-end' : 'justify-between') + '">' +
          (isNew ? '' : '<button class="btn" style="background:var(--err);color:#fff" data-act="del-profile">Delete group profile</button>') +
          '<button class="btn btn-primary" data-act="save">' + (isNew ? 'Add' : 'Update') + '</button>' +
        '</div>'
      : '<div class="flex justify-end">' + updateBtn + '</div>';

    paint(
      '<div class="flex items-center gap-3 mb-4">' +
        '<button class="back-btn" data-act="rate-back" title="Back">' + I.chevL + '</button>' +
        '<div class="page-title" style="font-size:20px">' + esc(title) + '</div>' +
      '</div>' +
      customHead + zonesCard + noCharge + footer,
      true
    );

    const back = root.querySelector('[data-act="rate-back"]'); if (back) back.onclick = () => { rateProfile = null; renderRates(); };
    root.querySelectorAll('[data-act="save"]').forEach((b2) => b2.onclick = () => { toast(isNew ? 'Created successfully' : 'Updated successfully'); if (isNew) { rateProfile = null; renderRates(); } });
    const az = root.querySelector('[data-act="add-zone"]'); if (az) az.onclick = () => openZoneModal('add');
    const ap2 = root.querySelector('[data-act="add-products"]'); if (ap2) ap2.onclick = () => toast('Add products — select products for this profile');
    const dp = root.querySelector('[data-act="del-profile"]'); if (dp) dp.onclick = () => confirm({ title: 'Delete group profile', content: 'Are you sure you want to delete this profile?', okText: 'Delete', danger: true, onOk: () => { toast('Deleted successfully'); rateProfile = null; renderRates(); } });
    root.querySelectorAll('[data-add-rate]').forEach((b2) => b2.onclick = () => openRateModal('add', Number(b2.getAttribute('data-add-rate')), null));
    root.querySelectorAll('[data-rate-menu]').forEach((b2) => b2.onclick = (e) => {
      const [zid, rid] = b2.getAttribute('data-rate-menu').split(':').map(Number);
      openRowMenu(e.currentTarget, [
        { label: 'Edit rate', onClick: () => openRateModal('edit', zid, rid) },
        { label: 'Delete', danger: true, onClick: () => { const z = (p.zones || []).find((x) => x.id === zid); confirm({ title: 'Delete rate', content: 'Are you sure you want to delete "' + (z ? (z.rates.find((r) => r.id === rid) || {}).name : '') + '"?', okText: 'Delete', danger: true, onOk: () => { if (z) z.rates = z.rates.filter((r) => r.id !== rid); renderRateProfile(); } }); } },
      ]);
    });
    root.querySelectorAll('[data-zone-menu]').forEach((b2) => b2.onclick = (e) => {
      const zid = Number(b2.getAttribute('data-zone-menu'));
      openRowMenu(e.currentTarget, [
        { label: 'Edit zone', onClick: () => openZoneModal('edit', zid) },
        { label: 'Delete', danger: true, onClick: () => { const z = (p.zones || []).find((x) => x.id === zid); confirm({ title: 'Delete zone', content: 'Are you sure you want to delete "' + (z ? z.name : '') + '"?', okText: 'Delete', danger: true, onOk: () => { if (p) p.zones = p.zones.filter((x) => x.id !== zid); renderRateProfile(); } }); } },
      ]);
    });
  }

  // tiny dropdown menu anchored to a button (mirrors Ant Dropdown)
  function openRowMenu(anchor, items) {
    document.querySelectorAll('.row-menu').forEach((m) => m.remove());
    const menu = h('<div class="row-menu"></div>');
    menu.innerHTML = items.map((it, i) => '<button class="row-menu-item' + (it.danger ? ' danger' : '') + '" data-i="' + i + '">' + esc(it.label) + '</button>').join('');
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 4) + 'px';
    menu.style.left = (r.right + window.scrollX - menu.offsetWidth) + 'px';
    menu.querySelectorAll('[data-i]').forEach((el) => el.onclick = () => { const it = items[Number(el.getAttribute('data-i'))]; menu.remove(); it.onClick(); });
    setTimeout(() => {
      const close = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); } };
      document.addEventListener('click', close);
    }, 0);
  }

  function openZoneModal(mode, zoneId) {
    const data = D.rates;
    const p = data.profiles.find((x) => x.id === rateProfile);
    const z = mode === 'edit' && p ? (p.zones || []).find((x) => x.id === zoneId) : null;
    const regionNames = [];
    const walk = (nodes) => nodes.forEach((n) => { regionNames.push(n.name); if (n.children) walk(n.children); });
    walk(D.locations.tree);
    const selected = z && z.areas ? z.areas : [];
    const body =
      '<div style="margin-bottom:16px"><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Shipping zone name <span class="muted" style="font-weight:400">(Customers won\'t see this)</span></div>' +
        '<input class="input" maxlength="100" placeholder="Please enter shipping zone name" value="' + esc(z ? z.name : '') + '" /></div>' +
      '<div><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Shipping zone</div>' +
        '<div class="zone-region-pick">' +
          regionNames.slice(0, 12).map((nm) =>
            '<label class="edit-check" style="padding:5px 0"><input type="checkbox"' + (selected.includes(nm) ? ' checked' : '') + ' /><span>' + esc(nm) + '</span></label>').join('') +
        '</div></div>';
    modal({ title: mode === 'edit' ? 'Edit shipping zone' : 'Add shipping zone', width: 560, okText: mode === 'edit' ? 'Done' : 'Add', body,
      onOk: (m, close) => { close(); toast('Shipping zone saved'); } });
  }

  function openRateModal(mode, zoneId, rateId) {
    const data = D.rates;
    const p = data.profiles.find((x) => x.id === rateProfile);
    const zone = p ? (p.zones || []).find((z) => z.id === zoneId) : null;
    const rt = (mode === 'edit' && zone) ? (zone.rates.find((r) => r.id === rateId) || {}) : {};
    const sym = data.currencySymbol;
    const cond = rt.condition_type || 'none';
    const hasCond = cond === 'price' || cond === 'weight';

    const condRadio = (val, label) =>
      '<label class="set-radio' + (cond === val ? ' on' : '') + '" data-radio="cond" data-val="' + val + '" style="margin-right:16px"><span class="proc-radio">' + (cond === val ? '<span class="proc-dot"></span>' : '') + '</span>' + esc(label) + '</label>';

    const isPrice = cond === 'price';
    const minMaxBlock = (unit, before) =>
      '<div class="flex items-center gap-3" style="margin-top:8px"><div class="text-sm" style="width:140px">Minimum ' + unit + ':</div>' +
        '<div class="set-addon">' + (before ? '<span class="set-addon-prefix">' + esc(sym) + '</span>' : '') + '<input class="input" type="number" min="0" step="0.01" value="' + (rt.min_value != null ? rt.min_value : '') + '" style="width:120px' + (before ? ';border-top-left-radius:0;border-bottom-left-radius:0' : '') + '" />' + (before ? '' : '<span class="set-addon-suffix">g</span>') + '</div></div>' +
      '<div class="flex items-center gap-3" style="margin-top:8px"><div class="text-sm" style="width:140px">Maximum ' + unit + ':</div>' +
        '<div class="set-addon">' + (before ? '<span class="set-addon-prefix">' + esc(sym) + '</span>' : '') + '<input class="input" type="number" min="0" step="0.01" placeholder="No limit" value="' + (rt.max_value != null ? rt.max_value : '') + '" style="width:120px' + (before ? ';border-top-left-radius:0;border-bottom-left-radius:0' : '') + '" />' + (before ? '' : '<span class="set-addon-suffix">g</span>') + '</div></div>';

    const body =
      '<div style="margin-bottom:14px"><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Shipping rate name <span class="muted" style="font-weight:400">(Displayed during checkout when the customer chooses a logistics option. PayPal limits this to 24 characters — longer names may cause checkout errors.)</span></div>' +
        '<input class="input" maxlength="24" placeholder="Please enter shipping rate name" value="' + esc(rt.name || '') + '" list="rate-name-sugg" />' +
        '<datalist id="rate-name-sugg">' + data.rateNameSuggestions.map((s) => '<option value="' + esc(s) + '"></option>').join('') + '</datalist></div>' +
      '<div style="margin-bottom:14px"><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Additional description</div>' +
        '<textarea class="input" rows="3" maxlength="100" placeholder="Additional description for logistic timeliness, delivery noticeand other information, which will be displayed when there is no freight merge. (Optional)" style="height:auto;padding:8px 12px;resize:vertical">' + esc(rt.description || '') + '</textarea></div>' +
      '<div style="margin-bottom:12px"><div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Price:</div>' +
        '<div class="set-addon"><span class="set-addon-prefix">' + esc(sym) + '</span><input class="input" type="number" min="0" step="0.01" value="' + (rt.price != null ? rt.price : '') + '" style="width:160px;border-top-left-radius:0;border-bottom-left-radius:0" /></div></div>' +
      '<div style="margin-bottom:10px"><a class="lnk" data-act="toggle-cond">' + (hasCond ? 'Delete conditions' : 'More pricing options') + '</a></div>' +
      '<div data-cond-wrap style="display:' + (hasCond ? 'block' : 'none') + '">' +
        '<div class="ctrl-label" style="text-transform:none;margin-bottom:6px">Charging method <span class="muted" style="font-weight:400">(Conditions are inclusive on both ends: Minimum ≤ value ≤ Maximum)</span></div>' +
        '<div style="margin-bottom:4px">' + condRadio('weight', 'Based on item weight') + condRadio('price', 'Based on order price') + '</div>' +
        '<div data-minmax>' + (cond === 'weight' ? minMaxBlock('weight', false) : minMaxBlock('price', true)) + '</div>' +
      '</div>' +
      '<div style="margin-top:14px"><div class="ctrl-label" style="text-transform:none;margin-bottom:8px">Checkout preview</div>' +
        '<div class="checkout-preview"><div class="checkout-preview-row"><div style="max-width:80%"><div class="text-sm" style="font-weight:500">' + esc(rt.name || 'Shipping rate name') + '</div>' +
          '<div class="muted" style="font-size:12px">' + esc(rt.description || 'Additional description') + '</div></div>' +
          '<div class="text-sm" style="font-weight:500">' + (Number(rt.price || 0) === 0 ? '<span class="rate-free">Free</span>' : sym + Number(rt.price || 0).toFixed(2)) + '</div></div></div>' +
      '</div>';

    const ctrl = modal({ title: mode === 'edit' ? 'Edit shipping rate' : 'Add shipping rate', width: 640, okText: mode === 'edit' ? 'Done' : 'Add', body,
      onOk: (m, close) => { close(); toast('Shipping rate saved'); } });

    // toggle "More pricing options"
    const tog = ctrl.m.querySelector('[data-act="toggle-cond"]');
    const wrap = ctrl.m.querySelector('[data-cond-wrap]');
    if (tog) tog.onclick = () => {
      const open = wrap.style.display === 'none';
      wrap.style.display = open ? 'block' : 'none';
      tog.textContent = open ? 'Delete conditions' : 'More pricing options';
    };
    // charging-method radio toggle + swap min/max units
    const wireCond = () => ctrl.m.querySelectorAll('[data-radio="cond"]').forEach((el) => el.onclick = () => {
      const val = el.getAttribute('data-val');
      ctrl.m.querySelectorAll('[data-radio="cond"]').forEach((s) => { s.classList.remove('on'); const d = s.querySelector('.proc-radio'); if (d) d.innerHTML = ''; });
      el.classList.add('on'); const dot = el.querySelector('.proc-radio'); if (dot) dot.innerHTML = '<span class="proc-dot"></span>';
      const mm = ctrl.m.querySelector('[data-minmax]');
      if (mm) mm.innerHTML = val === 'weight' ? minMaxBlock('weight', false) : minMaxBlock('price', true);
    });
    wireCond();
  }

  // ===========================================================================
  // MODAL (shared) — mirrors the orders prototype modal
  // ===========================================================================
  function modal({ title, body, width, okText, onOk, extraLeft, onExtra, danger, hideCancel, okStyle }) {
    const backdrop = h('<div class="modal-backdrop"></div>');
    const m = h('<div class="modal"></div>');
    if (width) m.style.width = width + 'px';
    m.innerHTML =
      '<div class="modal-head flex items-center justify-between"><span>' + esc(title) + '</span>' +
        '<span class="drawer-x" data-x style="cursor:pointer">' + I.x + '</span></div>' +
      '<div class="modal-body" style="max-height:70vh;overflow:auto">' + body + '</div>' +
      '<div class="modal-foot" style="justify-content:' + (extraLeft ? 'space-between' : 'flex-end') + '">' +
        (extraLeft || '') +
        '<div class="flex gap-2">' + (hideCancel ? '' : '<button class="btn btn-default" data-cancel>Cancel</button>') +
        '<button class="btn ' + (danger || okStyle ? '' : 'btn-primary') + '" ' + (danger ? 'style="background:var(--err);color:#fff"' : (okStyle ? 'style="' + okStyle + '"' : '')) + ' data-ok>' + (okText || 'Save') + '</button></div></div>';
    backdrop.appendChild(m); document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    m.querySelector('[data-x]').onclick = close;
    const cancelBtn = m.querySelector('[data-cancel]'); if (cancelBtn) cancelBtn.onclick = close;
    backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
    m.querySelector('[data-ok]').onclick = () => onOk(m, close);
    // submit on Enter from a text input (textarea / Shift+Enter keep newline behavior)
    m.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.tagName === 'INPUT') {
        e.preventDefault();
        const okBtn = m.querySelector('[data-ok]');
        if (okBtn) okBtn.click();
      }
    });
    const disc = m.querySelector('[data-disc]'); if (disc && onExtra) disc.onclick = () => onExtra(m, close);
    // generic radio/checkbox visual toggles inside modal (skip ones wired by caller)
    m.querySelectorAll('.set-radio:not([data-radio]), .set-radio2').forEach((el) => el.onclick = () => {
      const grp = el.parentElement;
      grp.querySelectorAll('.set-radio, .set-radio2').forEach((s) => { s.classList.remove('on'); const d = s.querySelector('.proc-radio'); if (d) d.innerHTML = ''; });
      el.classList.add('on'); const dot = el.querySelector('.proc-radio'); if (dot) dot.innerHTML = '<span class="proc-dot"></span>';
    });
    return { m, close };
  }

  // ===========================================================================
  // ROUTER  (SPA: shell passes `rest` = the part after #/settings/)
  // sub-page ids: base | payments | currency | metafields |
  //   shippable-locations | shipping-rates. Deeper segments pre-seed drill state.
  // ===========================================================================
  // ===========================================================================
  // V1.129 Staff and permissions — Roles + Staff (replaces the earlier stubs).
  // SSO grants a store; inside the store admin you manage Roles (menu/permission
  // tree) and Staff (5-state account lifecycle). Mock data is module-scoped so the
  // CRUD flows mutate and re-render in place.
  // ===========================================================================
  const ROLE_NAMES = ['Administrator', 'Operations Specialist', 'Customer Service Representative', 'Order Specialist'];
  const PERM_TREE = [
    { title: 'Home', children: ['Dashboard'] },
    { title: 'Orders', children: ['Order list', 'Order detail', 'Shipping', 'Edit shipping address', 'Refund', 'Note'] },
    { title: 'Products', children: ['Product list', 'Add product', 'Edit product', 'Collections'] },
    { title: 'Discounts', children: ['Discount list', 'Add discount', 'Edit discount'] },
    { title: 'Customers', children: ['Customer list', 'Customer detail'] },
    { title: 'Content', children: ['Blog', 'Page', 'Menu'] },
    { title: 'Google', children: ['Google sync'] },
    { title: 'Settings', children: ['Basic settings', 'Payments', 'Staff and permissions'] },
  ];
  const ALL_LEAVES = PERM_TREE.reduce((a, p) => a.concat(p.children), []);
  let rolesData = [
    { role: 'Administrator', desc: 'Full access to all features and settings', members: 5, perms: ALL_LEAVES.slice() },
    { role: 'Operations Specialist', desc: 'Manages products, marketing, and orders', members: 4, perms: ['Product list', 'Add product', 'Edit product', 'Collections', 'Discount list', 'Add discount', 'Order list', 'Order detail'] },
    { role: 'Customer Service Representative', desc: 'Manages customer inquiries, returns, and exchanges', members: 3, perms: ['Customer list', 'Customer detail', 'Order list', 'Order detail', 'Note', 'Refund'] },
    { role: 'Order Specialist', desc: '', members: 0, perms: ['Order list', 'Order detail', 'Shipping', 'Edit shipping address'] },
  ];
  let staffData = [
    { email: 'zhangsan@gmail.com', role: ['Administrator'], name: 'Zhang San', status: 'Active' },
    { email: 'lisi@gmail.com', role: ['Operations Specialist'], name: 'Li Si', status: 'Inactive' },
    { email: 'wangwu@gmail.com', role: ['Customer Service Representative'], name: 'Wang Wu', status: 'Invite pending' },
    { email: 'liuma@gmail.com', role: ['Order Specialist'], name: '', status: 'Request pending' },
    { email: 'chenliu@gmail.com', role: ['Administrator'], name: 'Chen Liu', status: 'Request rejected' },
  ];
  let accessCode = '0815';
  const STAFF_PILL = { 'Active': 'pill-green', 'Inactive': 'pill-gray', 'Invite pending': 'pill-orange', 'Request pending': 'pill-blue', 'Request rejected': 'pill-red' };
  const ALL_STATUSES = ['Active', 'Inactive', 'Invite pending', 'Request pending', 'Request rejected'];

  // inline svgs scoped to these pages
  const SP_X = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const SP_CARET = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  const SP_CHEVR = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  const SP_REVIEW = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>';

  const SP_STYLES = `
  .sp-wrap { width: 100%; max-width: none; margin: 0; }
  .sp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
  .sp-sub { color: var(--ink-muted); font-size: 13px; margin-top: 4px; }
  .sp-actions { display: flex; align-items: center; gap: 10px; flex: none; }
  .sp-card { border: 1px solid var(--hair); border-radius: 12px; overflow: visible; background: #fff; }
  .sp-filter { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--hair); }
  .sp-search { display: flex; align-items: center; height: 36px; border: 1px solid var(--ctl); border-radius: 8px; overflow: hidden; background: #fff; }
  .sp-search .lbl { display: flex; align-items: center; height: 100%; padding: 0 12px; font-size: 13px; font-weight: 600; color: var(--ink); background: var(--panel); border-right: 1px solid var(--hair); }
  .sp-search input { height: 100%; min-width: 240px; padding: 0 12px; border: 0; outline: 0; font-size: 13px; color: var(--ink); background: transparent; }
  .sp-search .ui-select { border: 0 !important; border-right: 1px solid var(--hair) !important; border-radius: 0 !important; height: 100%; background: var(--panel); min-width: 92px; }
  .sp-field-sel { min-width: 92px; }
  .sp-dd { position: relative; }
  .sp-dd-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border: 1px solid var(--ctl); border-radius: 8px; background: #fff; font-size: 13px; color: var(--ink); cursor: pointer; }
  .sp-dd-btn svg { color: var(--ink-muted); }
  .sp-dd-menu { position: absolute; top: 42px; left: 0; min-width: 200px; background: #fff; border: 1px solid var(--hair); border-radius: 8px; box-shadow: var(--float-shadow); padding: 6px; z-index: 50; }
  .sp-dd-menu[hidden] { display: none; }
  .sp-opt { display: flex; align-items: center; gap: 9px; padding: 7px 8px; border-radius: 6px; font-size: 13px; color: var(--ink-body); cursor: pointer; }
  .sp-opt:hover { background: var(--panel); }
  .sp-opt input { width: 15px; height: 15px; accent-color: var(--brand); }
  .sp-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px; }
  .sp-chips:not(:empty) { padding: 12px 16px 2px; }
  .sp-chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 6px; background: #eef2ff; color: #33415c; font-size: 12.5px; }
  .sp-chip button { display: inline-flex; border: 0; background: none; color: #7587b0; cursor: pointer; padding: 0; }
  .sp-ellip { display: inline-block; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
  .sp-foot { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--hair); }
  .sp-empty { padding: 56px 0; text-align: center; color: var(--ink-muted); font-size: 13px; }
  .sp-icon-btn { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 7px; border: 0; background: transparent; color: var(--ink-muted); cursor: pointer; }
  .sp-icon-btn:hover { background: var(--panel); color: var(--ink); }
  .sp-icon-btn.danger:hover { color: var(--err); }
  /* modal form fields */
  .sp-field { margin-bottom: 16px; }
  .sp-label { display: block; margin-bottom: 7px; font-size: 13.5px; font-weight: 600; color: #2f3542; }
  .sp-input-wrap { position: relative; }
  .sp-input { width: 100%; height: 42px; padding: 0 54px 0 14px; border: 1px solid var(--ctl); border-radius: 6px; font-size: 14px; color: var(--ink); box-sizing: border-box; outline: none; }
  .sp-input:focus { border-color: var(--brand); box-shadow: 0 0 0 2px rgb(0 102 230 / 8%); }
  .sp-input.err { border-color: var(--err); }
  .sp-input[disabled] { background: var(--panel); color: var(--ink-muted); }
  .sp-cnt { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--ink-muted); }
  .sp-err { margin-top: 6px; color: var(--err); font-size: 13px; }
  .sp-err:empty { display: none; }
  /* permission tree */
  .perm-tree { border: 1px solid var(--hair); border-radius: 8px; padding: 6px 6px; max-height: 280px; overflow: auto; }
  .perm-row { display: flex; align-items: center; gap: 4px; padding: 3px 6px; }
  .perm-caret { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0; border: 0; background: none; color: var(--ink-muted); cursor: pointer; transition: transform .12s; flex: none; }
  .perm-caret.open { transform: rotate(90deg); }
  .perm-children { padding-left: 30px; padding-bottom: 4px; display: flex; flex-direction: column; }
  .perm-children[hidden] { display: none; }
  .chk { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink-body); cursor: pointer; padding: 4px 0; }
  .chk input { width: 15px; height: 15px; accent-color: var(--brand); cursor: pointer; flex: none; }
  /* role multi-select */
  .sp-ms-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 42px; padding: 6px 12px; border: 1px solid var(--ctl); border-radius: 6px; cursor: pointer; }
  .sp-ms-box.err { border-color: var(--err); }
  .sp-ms-ph { color: var(--ink-muted); font-size: 14px; }
  .sp-ms-val { display: flex; flex-wrap: wrap; gap: 6px; }
  .sp-ms-tag { background: #f0f1f3; border-radius: 4px; padding: 2px 8px; font-size: 13px; color: var(--ink); }
  .sp-ms-list { margin-top: 6px; border: 1px solid var(--hair); border-radius: 8px; padding: 6px; }
  .sp-ms-list[hidden] { display: none; }
  /* radio (Active/Inactive) */
  .sp-radio { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: var(--ink-body); cursor: pointer; margin-right: 28px; }
  .sp-radio input { width: 15px; height: 15px; accent-color: var(--brand); }
  `;

  function spPager() {
    return '<div class="pg"><button class="pg-item" disabled>&lsaquo;</button><button class="pg-item active">1</button><button class="pg-item" disabled>&rsaquo;</button><span class="muted" style="margin-left:8px;font-size:13px">20 / page</span></div>';
  }

  // ---- permission tree (Add/Edit role) ----
  function permTreeHtml(checked) {
    checked = checked || [];
    const cset = new Set(checked);
    return '<div class="perm-tree">' + PERM_TREE.map((p, i) => {
      const childCount = p.children.filter((c) => cset.has(c)).length;
      const allOn = childCount === p.children.length;
      const kids = p.children.map((c) =>
        '<label class="chk"><input type="checkbox" data-leaf="' + esc(c) + '" data-parent="' + i + '"' + (cset.has(c) ? ' checked' : '') + '/><span>' + esc(c) + '</span></label>'
      ).join('');
      return '<div class="perm-node">' +
        '<div class="perm-row"><button type="button" class="perm-caret" data-caret="' + i + '">' + SP_CHEVR + '</button>' +
          '<label class="chk"><input type="checkbox" data-grp="' + i + '"' + (allOn ? ' checked' : '') + '/><span style="font-weight:600">' + esc(p.title) + '</span></label></div>' +
        '<div class="perm-children" data-children="' + i + '" hidden>' + kids + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }
  function wirePermTree(m) {
    m.querySelectorAll('[data-caret]').forEach((btn) => {
      btn.onclick = () => {
        const i = btn.getAttribute('data-caret');
        const kids = m.querySelector('[data-children="' + i + '"]');
        const open = kids.hasAttribute('hidden');
        if (open) kids.removeAttribute('hidden'); else kids.setAttribute('hidden', '');
        btn.classList.toggle('open', open);
      };
    });
    const syncGroup = (i) => {
      const grp = m.querySelector('[data-grp="' + i + '"]');
      const kids = Array.from(m.querySelectorAll('[data-parent="' + i + '"]'));
      const on = kids.filter((k) => k.checked).length;
      grp.checked = on === kids.length && on > 0;
      grp.indeterminate = on > 0 && on < kids.length;
    };
    m.querySelectorAll('[data-grp]').forEach((grp) => {
      grp.onclick = () => {
        const i = grp.getAttribute('data-grp');
        m.querySelectorAll('[data-parent="' + i + '"]').forEach((k) => { k.checked = grp.checked; });
        grp.indeterminate = false;
      };
    });
    m.querySelectorAll('[data-leaf]').forEach((leaf) => {
      leaf.addEventListener('change', () => syncGroup(leaf.getAttribute('data-parent')));
    });
    PERM_TREE.forEach((p, i) => syncGroup(i));
  }
  function collectPerms(m) {
    return Array.from(m.querySelectorAll('[data-leaf]:checked')).map((c) => c.getAttribute('data-leaf'));
  }
  function wireCounter(m, id) {
    const inp = m.querySelector('#' + id), cnt = m.querySelector('#' + id + '-cnt');
    const upd = () => { if (cnt) cnt.textContent = inp.value.length + '/100'; };
    inp.addEventListener('input', upd); upd();
  }

  // ---- role multi-select (Add/Edit/Review staff) ----
  function roleSelectHtml(selected) {
    selected = selected || [];
    const box = selected.length
      ? '<div class="sp-ms-val">' + selected.map((r) => '<span class="sp-ms-tag">' + esc(r) + '</span>').join('') + '</div>'
      : '<span class="sp-ms-ph">Select role</span>';
    const opts = ROLE_NAMES.map((r) => '<label class="chk"><input type="checkbox" data-role value="' + esc(r) + '"' + (selected.indexOf(r) >= 0 ? ' checked' : '') + '/><span>' + esc(r) + '</span></label>').join('');
    return '<div class="sp-ms"><div class="sp-ms-box" data-ms-box>' + box + '<span style="color:var(--ink-muted);flex:none">' + SP_CARET + '</span></div>' +
      '<div class="sp-ms-list" data-ms-list hidden>' + opts + '</div></div>';
  }
  function wireRoleSelect(m) {
    const box = m.querySelector('[data-ms-box]'), list = m.querySelector('[data-ms-list]');
    const toggle = () => { if (list.hasAttribute('hidden')) list.removeAttribute('hidden'); else list.setAttribute('hidden', ''); };
    box.onclick = toggle;
    const redraw = () => {
      const sel = collectRoles(m);
      box.innerHTML = (sel.length
        ? '<div class="sp-ms-val">' + sel.map((r) => '<span class="sp-ms-tag">' + esc(r) + '</span>').join('') + '</div>'
        : '<span class="sp-ms-ph">Select role</span>') + '<span style="color:var(--ink-muted);flex:none">' + SP_CARET + '</span>';
      box.onclick = toggle;
    };
    m.querySelectorAll('[data-role]').forEach((c) => c.addEventListener('change', redraw));
  }
  function collectRoles(m) { return Array.from(m.querySelectorAll('[data-role]:checked')).map((c) => c.value); }
  function setErr(m, key, msg) {
    const el = m.querySelector('[data-err="' + key + '"]'); if (el) el.textContent = msg || '';
  }

  // ===================== ROLES =====================
  let roleQuery = '';
  function roleRowsHtml() {
    const list = rolesData.filter((r) => !roleQuery || r.role.toLowerCase().indexOf(roleQuery.toLowerCase()) >= 0);
    if (!list.length) return '<tr><td colspan="4"><div class="sp-empty">No data</div></td></tr>';
    return list.map((r) => {
      const desc = r.desc ? '<span class="sp-ellip" title="' + esc(r.desc) + '">' + esc(r.desc) + '</span>' : '<span class="muted">- -</span>';
      return '<tr data-role="' + esc(r.role) + '">' +
        '<td style="font-weight:500;color:var(--ink)">' + esc(r.role) + '</td>' +
        '<td class="muted">' + desc + '</td>' +
        '<td>' + r.members + '</td>' +
        '<td><div class="flex" style="gap:2px"><button class="sp-icon-btn" data-edit title="Edit">' + I.pencil + '</button><button class="sp-icon-btn danger" data-del title="Delete">' + I.trash + '</button></div></td>' +
      '</tr>';
    }).join('');
  }
  function refreshRoles(scope) {
    scope.querySelector('#sp-rbody').innerHTML = roleRowsHtml();
    scope.querySelector('#sp-rchips').innerHTML = roleQuery
      ? '<span class="sp-chip">Role: ' + esc(roleQuery) + ' <button data-clear>' + SP_X + '</button></span>' : '';
    wireRoleRows(scope);
  }
  function wireRoleRows(scope) {
    scope.querySelectorAll('#sp-rbody [data-edit]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); openRoleModal(b.closest('tr').getAttribute('data-role')); });
    scope.querySelectorAll('#sp-rbody [data-del]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); deleteRole(b.closest('tr').getAttribute('data-role')); });
    const clear = scope.querySelector('#sp-rchips [data-clear]');
    if (clear) clear.onclick = () => { roleQuery = ''; scope.querySelector('#sp-role-q').value = ''; refreshRoles(scope); };
  }
  function renderRoles() {
    root.innerHTML = '<style>' + SP_STYLES + '</style>' +
      '<div class="sp-wrap">' +
        '<div class="sp-head"><div><div class="page-title">Roles</div><div class="sp-sub">Manage staff roles and access permissions</div></div>' +
          '<button class="btn btn-primary" data-add>Add role</button></div>' +
        '<div class="sp-card">' +
          '<div class="sp-filter"><div class="sp-search"><span class="lbl">Role</span><input id="sp-role-q" placeholder="Search" value="' + esc(roleQuery) + '"/></div></div>' +
          '<div class="sp-chips" id="sp-rchips"></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Role</th><th>Description</th><th style="width:120px">Member</th><th style="width:120px">Action</th></tr></thead><tbody id="sp-rbody"></tbody></table></div>' +
          '<div class="sp-foot"><span class="muted">Total ' + rolesData.length + ' records</span>' + spPager() + '</div>' +
        '</div>' +
      '</div>';
    const scope = root;
    refreshRoles(scope);
    scope.querySelector('[data-add]').onclick = () => openRoleModal(null);
    const q = scope.querySelector('#sp-role-q');
    q.addEventListener('input', () => { roleQuery = q.value.trim(); refreshRoles(scope); q.focus(); });
  }
  function openRoleModal(roleName) {
    const existing = roleName ? rolesData.find((r) => r.role === roleName) : null;
    const body =
      '<div class="sp-field"><label class="sp-label">Role</label><div class="sp-input-wrap"><input id="r-name" class="sp-input" maxlength="100" placeholder="Example: Order Specialist" value="' + esc(existing ? existing.role : '') + '"/><span class="sp-cnt" id="r-name-cnt">0/100</span></div><div class="sp-err" data-err="r-name"></div></div>' +
      '<div class="sp-field"><label class="sp-label">Description</label><div class="sp-input-wrap"><input id="r-desc" class="sp-input" maxlength="100" placeholder="Example: Handles order fulfillment and shipping logistics" value="' + esc(existing ? existing.desc : '') + '"/><span class="sp-cnt" id="r-desc-cnt">0/100</span></div></div>' +
      '<div class="sp-field"><label class="sp-label">Permission</label>' + permTreeHtml(existing ? existing.perms : []) + '<div class="sp-err" data-err="perm"></div></div>';
    const ref = modal({
      title: existing ? 'Edit role' : 'Add role', width: 560, okText: existing ? 'Update' : 'Add', body,
      onOk: (m, close) => {
        const name = m.querySelector('#r-name').value.trim();
        const desc = m.querySelector('#r-desc').value.trim();
        const perms = collectPerms(m);
        setErr(m, 'r-name', ''); setErr(m, 'perm', ''); m.querySelector('#r-name').classList.remove('err');
        let ok = true;
        if (!name) { setErr(m, 'r-name', 'Please enter role'); m.querySelector('#r-name').classList.add('err'); ok = false; }
        else if (rolesData.some((r) => r.role.toLowerCase() === name.toLowerCase() && (!existing || r.role !== existing.role))) { setErr(m, 'r-name', 'Role already exist'); m.querySelector('#r-name').classList.add('err'); ok = false; }
        if (!perms.length) { setErr(m, 'perm', 'Please select permission'); ok = false; }
        if (!ok) return;
        if (existing) { existing.role = name; existing.desc = desc; existing.perms = perms; toast('Updated successfully'); }
        else { rolesData.push({ role: name, desc, members: 0, perms }); toast('Added successfully'); }
        close(); renderRoles();
      },
    });
    wireCounter(ref.m, 'r-name'); wireCounter(ref.m, 'r-desc'); wirePermTree(ref.m);
  }
  function deleteRole(roleName) {
    const r = rolesData.find((x) => x.role === roleName);
    confirm({
      title: 'Confirm to delete?', okText: 'Confirm', danger: true,
      content: 'Once deleted, the data cannot be retrieved. Please confirm before proceeding!',
      onOk: () => {
        if (r && r.members > 0) { toast('Failed to delete. This role is currently in use'); return; }
        rolesData = rolesData.filter((x) => x.role !== roleName);
        toast('Deleted successfully'); renderRoles();
      },
    });
  }

  // ===================== STAFF =====================
  let staffField = 'Email', staffQuery = '', staffStatuses = [];
  function staffMatch(s) {
    if (staffStatuses.length && staffStatuses.indexOf(s.status) < 0) return false;
    if (!staffQuery) return true;
    const q = staffQuery.toLowerCase();
    const val = staffField === 'Email' ? s.email : staffField === 'Name' ? s.name : s.role.join(', ');
    return String(val).toLowerCase().indexOf(q) >= 0;
  }
  function staffActions(s) {
    const edit = '<button class="sp-icon-btn" data-edit title="Edit">' + I.pencil + '</button>';
    const del = '<button class="sp-icon-btn danger" data-del title="Delete">' + I.trash + '</button>';
    const review = '<button class="sp-icon-btn" data-review title="Review">' + SP_REVIEW + '</button>';
    if (s.status === 'Active' || s.status === 'Inactive') return edit + del;
    if (s.status === 'Invite pending') return del;
    return review + del; // Request pending / Request rejected
  }
  function staffRowsHtml() {
    const list = staffData.filter(staffMatch);
    if (!list.length) return '<tr><td colspan="5"><div class="sp-empty">No data</div></td></tr>';
    return list.map((s) => {
      const roleTxt = s.role.length ? s.role.join(', ') : '- -';
      const name = s.name ? esc(s.name) : '<span class="muted">- -</span>';
      return '<tr data-email="' + esc(s.email) + '">' +
        '<td>' + esc(s.email) + '</td>' +
        '<td><span class="sp-ellip" title="' + esc(roleTxt) + '">' + esc(roleTxt) + '</span></td>' +
        '<td>' + name + '</td>' +
        '<td><span class="pill ' + STAFF_PILL[s.status] + '"><span class="dot"></span>' + s.status + '</span></td>' +
        '<td><div class="flex" style="gap:2px">' + staffActions(s) + '</div></td>' +
      '</tr>';
    }).join('');
  }
  function staffChipsHtml() {
    let chips = '';
    if (staffQuery) chips += '<span class="sp-chip">' + staffField + ': ' + esc(staffQuery) + ' <button data-clear-q>' + SP_X + '</button></span>';
    if (staffStatuses.length) chips += '<span class="sp-chip">Status: ' + staffStatuses.join(', ') + ' <button data-clear-s>' + SP_X + '</button></span>';
    return chips;
  }
  function refreshStaff(scope) {
    scope.querySelector('#sp-sbody').innerHTML = staffRowsHtml();
    scope.querySelector('#sp-schips').innerHTML = staffChipsHtml();
    wireStaffRows(scope);
    const cq = scope.querySelector('#sp-schips [data-clear-q]'); if (cq) cq.onclick = () => { staffQuery = ''; scope.querySelector('#sp-staff-q').value = ''; refreshStaff(scope); };
    const cs = scope.querySelector('#sp-schips [data-clear-s]'); if (cs) cs.onclick = () => { staffStatuses = []; if (scope.querySelector('#sp-status-menu')) scope.querySelectorAll('#sp-status-menu input').forEach((x) => { x.checked = false; }); refreshStaff(scope); };
  }
  function wireStaffRows(scope) {
    scope.querySelectorAll('#sp-sbody [data-edit]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); openStaffModal('edit', b.closest('tr').getAttribute('data-email')); });
    scope.querySelectorAll('#sp-sbody [data-review]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); openStaffModal('review', b.closest('tr').getAttribute('data-email')); });
    scope.querySelectorAll('#sp-sbody [data-del]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); deleteStaff(b.closest('tr').getAttribute('data-email')); });
  }
  function renderStaff() {
    root.innerHTML = '<style>' + SP_STYLES + '</style>' +
      '<div class="sp-wrap">' +
        '<div class="sp-head"><div><div class="page-title">Staff</div><div class="sp-sub">Manage team members and their account access.</div>' +
          '<div class="sp-sub" style="margin-top:6px">Access code: <b id="sp-code" style="color:var(--ink)">' + accessCode + '</b></div></div>' +
          '<div class="sp-actions"><button class="btn" data-gencode>Generate new code</button><button class="btn btn-primary" data-add>Add staff</button></div></div>' +
        '<div class="sp-card">' +
          '<div class="sp-filter">' +
            '<div class="sp-search"><select id="sp-field" class="filter-select sp-field-sel"><option>Email</option><option>Role</option><option>Name</option></select><input id="sp-staff-q" placeholder="Search"/></div>' +
            '<div class="sp-dd"><button class="sp-dd-btn" id="sp-status-btn">Status' + SP_CARET + '</button><div class="sp-dd-menu" id="sp-status-menu" hidden></div></div>' +
          '</div>' +
          '<div class="sp-chips" id="sp-schips"></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Email</th><th style="width:230px">Role</th><th style="width:130px">Name</th><th style="width:150px">Status</th><th style="width:110px">Action</th></tr></thead><tbody id="sp-sbody"></tbody></table></div>' +
          '<div class="sp-foot"><span class="muted">Total ' + staffData.length + ' records</span>' + spPager() + '</div>' +
        '</div>' +
      '</div>';
    const scope = root;
    refreshStaff(scope);
    scope.querySelector('[data-add]').onclick = () => openStaffModal('add');
    scope.querySelector('[data-gencode]').onclick = () => {
      accessCode = String(Math.floor(1000 + Math.random() * 9000));
      scope.querySelector('#sp-code').textContent = accessCode;
      toast('New access code generated');
    };
    const fsel = scope.querySelector('#sp-field');
    fsel.addEventListener('change', () => { staffField = fsel.value; if (staffQuery) refreshStaff(scope); });
    const q = scope.querySelector('#sp-staff-q');
    q.value = staffQuery;
    q.addEventListener('input', () => { staffQuery = q.value.trim(); refreshStaff(scope); q.focus(); });
    const sbtn = scope.querySelector('#sp-status-btn'), smenu = scope.querySelector('#sp-status-menu');
    smenu.innerHTML = ALL_STATUSES.map((st) => '<label class="sp-opt"><input type="checkbox" value="' + st + '"' + (staffStatuses.indexOf(st) >= 0 ? ' checked' : '') + '/><span>' + st + '</span></label>').join('');
    sbtn.onclick = (e) => { e.stopPropagation(); smenu.hidden = !smenu.hidden; };
    smenu.querySelectorAll('input').forEach((c) => c.addEventListener('change', () => {
      staffStatuses = Array.from(smenu.querySelectorAll('input:checked')).map((x) => x.value);
      refreshStaff(scope);
    }));
    if (!root.__spMenuClose) {
      root.__spMenuClose = true;
      document.addEventListener('mousedown', (e) => {
        const dd = root.querySelector('.sp-dd');
        const menu = root.querySelector('#sp-status-menu');
        if (menu && dd && !dd.contains(e.target)) menu.hidden = true;
      });
    }
  }
  function openStaffModal(mode, email) {
    const s = email ? staffData.find((x) => x.email === email) : null;
    const isAdd = mode === 'add', isReview = mode === 'review';
    const title = isAdd ? 'Add staff' : isReview ? 'Review staff' : 'Edit staff';
    const emailField = isAdd
      ? '<div class="sp-field"><label class="sp-label">Email</label><div class="sp-input-wrap"><input id="s-email" class="sp-input" maxlength="100" placeholder="Example: name@example.com"/><span class="sp-cnt" id="s-email-cnt">0/100</span></div><div class="sp-err" data-err="s-email"></div></div>'
      : '<div class="sp-field"><label class="sp-label">Email</label><input class="sp-input" disabled value="' + esc(s.email) + '"/></div>';
    const selectedRoles = (isReview || isAdd) ? [] : s.role.slice();
    const roleField = '<div class="sp-field"><label class="sp-label">Role</label>' + roleSelectHtml(selectedRoles) + '<div class="sp-err" data-err="s-role"></div></div>';
    const nameField = '<div class="sp-field"><label class="sp-label">Name</label><div class="sp-input-wrap"><input id="s-name" class="sp-input" maxlength="100" placeholder="Please enter full name. Example: John Smith" value="' + esc(s && !isReview ? s.name : '') + '"/><span class="sp-cnt" id="s-name-cnt">0/100</span></div></div>';
    const statusField = (mode === 'edit')
      ? '<div class="sp-field"><label class="sp-label">Status</label><div style="display:flex;align-items:center"><label class="sp-radio"><input type="radio" name="s-status" value="Active"' + (s.status === 'Active' ? ' checked' : '') + '/> Active</label><label class="sp-radio"><input type="radio" name="s-status" value="Inactive"' + (s.status !== 'Active' ? ' checked' : '') + '/> Inactive</label></div></div>'
      : '';
    const body = emailField + roleField + nameField + statusField;
    const okText = isAdd ? 'Add' : isReview ? 'Approve' : 'Update';
    const ref = modal({
      title, width: 560, okText, hideCancel: isReview, body,
      onOk: (m, close) => {
        const roles = collectRoles(m);
        setErr(m, 's-role', ''); setErr(m, 's-email', '');
        let ok = true;
        let emailVal = s ? s.email : '';
        if (isAdd) {
          emailVal = m.querySelector('#s-email').value.trim();
          if (!emailVal) { setErr(m, 's-email', 'Please enter email'); ok = false; }
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { setErr(m, 's-email', 'The email you entered is invalid'); ok = false; }
          else if (staffData.some((x) => x.email.toLowerCase() === emailVal.toLowerCase())) { setErr(m, 's-email', 'Email already exist'); ok = false; }
        }
        if (!roles.length) { setErr(m, 's-role', 'Please select role'); ok = false; }
        if (!ok) return;
        const name = m.querySelector('#s-name') ? m.querySelector('#s-name').value.trim() : (s ? s.name : '');
        if (isAdd) {
          staffData.unshift({ email: emailVal, role: roles, name, status: 'Invite pending' });
          toast('Add staff successfully');
        } else if (isReview) {
          s.role = roles; s.name = name; s.status = 'Active';
          toast('Staff access approved successfully');
        } else {
          s.role = roles; s.name = name;
          const st = m.querySelector('input[name="s-status"]:checked');
          if (st) s.status = st.value;
          toast('Update staff successfully');
        }
        close(); renderStaff();
      },
    });
    wireRoleSelect(ref.m);
    if (ref.m.querySelector('#s-email-cnt')) wireCounter(ref.m, 's-email');
    if (ref.m.querySelector('#s-name-cnt')) wireCounter(ref.m, 's-name');
    if (isReview) {
      const foot = ref.m.querySelector('.modal-foot .flex');
      const rej = document.createElement('button'); rej.className = 'btn btn-default'; rej.textContent = 'Reject';
      foot.insertBefore(rej, foot.firstChild);
      rej.onclick = () => { s.status = 'Request rejected'; ref.close(); toast('Staff request has been rejected'); renderStaff(); };
    }
  }
  function deleteStaff(email) {
    confirm({
      title: 'Confirm to delete?', okText: 'Confirm', danger: true,
      content: 'Once deleted, the data cannot be retrieved. Please confirm before proceeding!',
      onOk: () => { staffData = staffData.filter((x) => x.email !== email); toast('Deleted successfully'); renderStaff(); },
    });
  }

  // ===========================================================================
  // V1.139 Self-service · DOMAINS  (Settings → Domains)
  //   System (free) domain is auto-connected at provisioning and not deletable.
  //   Custom domains: 3-step Add wizard (input → configure DNS → bound) with
  //   automatic DNS detection + automatic SSL (issue & auto-renew). State machine
  //   per PRD §6.2: pending_verification → ssl_pending → connected (dns_error /
  //   ssl_failed are the failure branches). Mock data is module-scoped and now
  //   carries one domain in EVERY status (connected / redirecting / redirectable /
  //   pending_verification / dns_error / ssl_pending / ssl_failed / system) so a dev
  //   can see each state → available-action mapping at a glance (PRD §6.3).
  // ===========================================================================
  let domainsData = [
    { domain: 'www.nutrofuels.com',         type: 'custom', primary: true,  status: 'connected',            redirectTo: null },
    { domain: 'nutrofuels.com',             type: 'custom', primary: false, status: 'connected',            redirectTo: 'www.nutrofuels.com' },
    { domain: 'nutrofuels.shop',            type: 'custom', primary: false, status: 'connected',            redirectTo: null },
    { domain: 'shop.nutrofuels.io',         type: 'custom', primary: false, status: 'pending_verification', redirectTo: null },
    { domain: 'go.nutrofuels.io',           type: 'custom', primary: false, status: 'dns_error',            redirectTo: null },
    { domain: 'checkout.nutrofuels.io',     type: 'custom', primary: false, status: 'ssl_pending',          redirectTo: null },
    { domain: 'promo.nutrofuels.io',        type: 'custom', primary: false, status: 'ssl_failed',           redirectTo: null },
    { domain: 'nutrofuels.stores.bestshopio.com', type: 'system', primary: false, status: 'connected',      redirectTo: null },
  ];
  // BestCheckout has one buyer-facing checkout address per Shopify store. It is
  // deliberately separate from the storefront's primary / redirect domains.
  let checkoutDomain = { domain: 'checkout.lavenderlabs.co', status: 'connected' };
  let domainStep = null;   // null = list · 'add' = configure DNS · 'bound' = success (set by show())
  let pendingDomain = '';  // domain being added through the wizard
  let domainVerifyFailed = false; // wizard: first "Verify now" shows the DNS-not-detected state, retry succeeds

  const DOMAIN_BADGE = {
    connected:            { cls: 'pill-green',  label: 'Connected' },
    pending_verification: { cls: 'pill-orange', label: 'Pending verification' },
    dns_error:            { cls: 'pill-red',    label: 'DNS error' },
    ssl_pending:          { cls: 'pill-blue',   label: 'SSL pending' },
    ssl_failed:           { cls: 'pill-red',    label: 'SSL failed' },
  };
  const PLATFORM_IP = '76.223.54.18';
  const PLATFORM_CNAME = 'connect.bestcheckout.com';

  const DOMAIN_STYLES = `
  .dom-wrap { width: 100%; max-width: none; margin: 0; }
  .dom-list { border: 1px solid var(--hair); border-radius: 12px; overflow: hidden; background: #fff; }
  .dom-row { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-bottom: 1px solid var(--hair); }
  .dom-row:last-child { border-bottom: none; }
  .dom-ico { width: 36px; height: 36px; border-radius: 8px; background: #eef2ff; color: var(--brand); display: grid; place-items: center; flex: none; }
  .dom-info { flex: 1; min-width: 0; }
  .dom-name { font-weight: 600; font-size: 14px; color: var(--ink); }
  .dom-meta { color: var(--ink-muted); font-size: 12.5px; margin-top: 3px; }
  .dom-meta a { color: var(--brand); cursor: pointer; }
  .dom-actions { display: flex; align-items: center; gap: 14px; flex: none; }
  .dom-link { color: var(--ink-muted); font-size: 13px; font-weight: 500; cursor: pointer; background: none; border: 0; }
  .dom-link:hover { color: var(--ink); }
  .dom-link.danger { color: var(--err); }
  /* add-domain wizard */
  .dstep { display: flex; align-items: center; gap: 10px; margin: 4px 0 24px; font-size: 13px; color: var(--ink-muted); }
  .dstep .sp { display: flex; align-items: center; gap: 8px; }
  .dstep .sn { width: 22px; height: 22px; border-radius: 50%; background: var(--panel); color: var(--ink-muted); display: grid; place-items: center; font-size: 12px; font-weight: 700; }
  .dstep .sp.on .sn { background: var(--brand); color: #fff; }
  .dstep .sp.on { color: var(--ink); font-weight: 600; }
  .dstep .sp.ok .sn { background: #2bb673; color: #fff; }
  .dstep .ln { width: 30px; height: 1px; background: var(--hair); }
  .dns-tbl { border: 1px solid var(--hair); border-radius: 8px; overflow: hidden; }
  .dns-tr { display: grid; grid-template-columns: 96px 90px 1fr 86px; align-items: center; border-bottom: 1px solid var(--hair); }
  .dns-tr:last-child { border-bottom: none; }
  .dns-th { background: var(--panel); font-size: 11px; font-weight: 700; color: var(--ink-muted); text-transform: uppercase; letter-spacing: .4px; }
  .dns-cell { padding: 11px 14px; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dns-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .dns-copy { font-size: 12px; font-weight: 600; color: var(--brand); border: 1px solid var(--ctl); background: #fff; border-radius: 6px; padding: 5px 10px; cursor: pointer; }
  .ssl-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-muted); margin-top: 16px; }
  .ssl-spin { width: 13px; height: 13px; border: 2px solid var(--brand); border-top-color: transparent; border-radius: 50%; animation: dsp .7s linear infinite; }
  @keyframes dsp { to { transform: rotate(360deg); } }
  .dns-fail { display: flex; align-items: flex-start; gap: 10px; margin-top: 16px; padding: 12px 14px; border-radius: 8px; background: #fdecea; color: #b3261e; font-size: 13px; line-height: 1.5; }
  .dns-fail svg { width: 16px; height: 16px; flex: none; margin-top: 1px; }
  .dbound { text-align: center; padding: 30px 20px 12px; }
  .dbound .ck { width: 60px; height: 60px; border-radius: 50%; background: #e7f7ee; color: #2bb673; display: grid; place-items: center; margin: 0 auto 16px; }
  /* modal form fields (Connect domain) — same look as the Roles/Staff modal inputs */
  .sp-field { margin-bottom: 16px; }
  .sp-label { display: block; margin-bottom: 7px; font-size: 13.5px; font-weight: 600; color: #2f3542; }
  .sp-input-wrap { position: relative; }
  .sp-input { width: 100%; height: 42px; padding: 0 14px; border: 1px solid var(--ctl); border-radius: 6px; font-size: 14px; color: var(--ink); box-sizing: border-box; outline: none; background: #fff; }
  .sp-input::placeholder { color: var(--ink-muted); }
  .sp-input:focus { border-color: var(--brand); box-shadow: 0 0 0 2px rgb(0 102 230 / 8%); }
  .sp-input.err { border-color: var(--err); }
  .sp-err { margin-top: 6px; color: var(--err); font-size: 13px; }
  .sp-err:empty { display: none; }
  @media (max-width: 720px) { .dns-tr { grid-template-columns: 1fr; } .dns-th { display: none; } .dns-cell { border-bottom: 1px solid var(--hair); } .dom-row { flex-wrap: wrap; } }
  `;

  function domainMetaLine(d) {
    if (d.type === 'system') return 'Free store domain · always available';
    if (d.primary) return 'Primary domain';
    if (d.status === 'connected') {
      return d.redirectTo
        ? 'Redirects to ' + esc(d.redirectTo) + ' · <a data-primary="' + esc(d.domain) + '">Set as primary</a>'
        : '<a data-primary="' + esc(d.domain) + '">Set as primary</a> · <a data-redirect="' + esc(d.domain) + '">Redirect</a>';
    }
    if (d.status === 'pending_verification' || d.status === 'dns_error') {
      const msg = d.status === 'dns_error' ? 'DNS records not detected yet' : 'Waiting for DNS records';
      return msg + ' · <a data-verify="' + esc(d.domain) + '">Verify now</a> · <a data-guide="' + esc(d.domain) + '">View guide</a>';
    }
    if (d.status === 'ssl_pending') return 'DNS verified · issuing SSL certificate…';
    if (d.status === 'ssl_failed') return 'SSL issuance failed · <a data-verify="' + esc(d.domain) + '">Retry</a>';
    return '';
  }
  function domainRowHtml(d) {
    const badge = DOMAIN_BADGE[d.status] || { cls: 'pill-gray', label: d.status };
    const sslSuffix = (d.primary && d.status === 'connected') ? ' · SSL active' : '';
    // Primary + system domains are not deletable — you must set another domain as primary first (PRD §6.3).
    const del = (d.type === 'system' || d.primary) ? '' : '<button class="dom-link danger" data-del="' + esc(d.domain) + '">Delete</button>';
    return '<div class="dom-row">' +
        '<div class="dom-ico">' + I.globe + '</div>' +
        '<div class="dom-info"><div class="dom-name">' + esc(d.domain) + '</div>' +
          '<div class="dom-meta">' + domainMetaLine(d) + '</div></div>' +
        '<div class="dom-actions"><span class="pill ' + badge.cls + '"><span class="dot"></span>' + badge.label + sslSuffix + '</span>' + del + '</div>' +
      '</div>';
  }
  function renderDomainList() {
    const badge = DOMAIN_BADGE[checkoutDomain.status] || DOMAIN_BADGE.connected;
    paint(
      '<style>' + DOMAIN_STYLES +
        '.checkout-domain-card{border:1px solid var(--hair);border-radius:12px;background:#fff;padding:20px}.checkout-domain-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.checkout-domain-icon{width:40px;height:40px;border-radius:10px;background:#eef3ff;color:var(--brand);display:grid;place-items:center;flex:none}.checkout-domain-eyebrow{font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:5px}.checkout-domain-name{font-size:16px;line-height:1.35;font-weight:600;color:var(--ink)}.checkout-domain-note{font-size:12.5px;line-height:1.55;color:var(--ink-muted);margin-top:6px}.checkout-domain-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--hair)}.checkout-domain-fact{min-width:0}.checkout-domain-fact small{display:block;color:var(--ink-muted);font-size:11px;margin-bottom:4px}.checkout-domain-fact strong{display:block;color:var(--ink-body);font-size:13px;font-weight:600;line-height:1.4}.checkout-domain-assurance{display:flex;gap:10px;align-items:flex-start;margin-top:16px;padding:12px 13px;border-radius:8px;background:#f7f9fc;color:var(--ink-body);font-size:12.5px;line-height:1.55}.checkout-domain-assurance svg{color:var(--brand);width:18px;height:18px;flex:none;margin-top:1px}@media(max-width:720px){.checkout-domain-top{flex-direction:column}.checkout-domain-grid{grid-template-columns:1fr;gap:10px}}' +
        '</style><div class="dom-wrap">' +
        pageHead('Checkout domain', 'Set the secure address buyers see throughout a BestCheckout purchase flow: checkout, Upsell, Downsell, and Thank you pages. Your Shopify storefront domain stays unchanged.',
          '<button class="btn btn-primary" data-add-domain>Change checkout domain</button>') +
        '<section class="checkout-domain-card"><div class="checkout-domain-top"><div class="flex" style="gap:12px"><span class="checkout-domain-icon">' + I.globe + '</span><div><div class="checkout-domain-eyebrow">Checkout address</div><div class="checkout-domain-name">' + esc(checkoutDomain.domain) + '</div><div class="checkout-domain-note">Used throughout each BestCheckout purchase flow.</div></div></div><span class="pill ' + badge.cls + '"><span class="dot"></span><span>' + badge.label + '</span><span> · </span><span>SSL active</span></span></div>' +
          '<div class="checkout-domain-grid"><div class="checkout-domain-fact"><small>Used on</small><strong>Checkout · Upsell · Downsell · Thank you pages</strong></div><div class="checkout-domain-fact"><small>SSL</small><strong>Active · renews automatically</strong></div><div class="checkout-domain-fact"><small>Shopify storefront</small><strong>lavender-labs.myshopify.com</strong></div></div>' +
          '<div class="checkout-domain-assurance">' + I.info + '<span>Your Shopify storefront keeps its current address. This domain is used only for BestCheckout purchase-flow pages: checkout, Upsell, Downsell, and Thank you.</span></div>' +
        '</section>' +
        '<div class="set-note" style="margin-top:18px"><div class="card-title" style="margin-bottom:4px">One domain, one checkout experience</div>' +
          '<div class="muted" style="font-size:12.5px;line-height:1.5">A branded checkout domain helps buyers recognize your store while BestCheckout handles the secure checkout experience.</div></div>' +
      '</div>',
      false
    );
    root.querySelector('[data-add-domain]').onclick = openAddDomainModal;
  }
  function renderAddDomainDNS() {
    const dom = pendingDomain || 'yourdomain.com';
    const host = dom.split('.')[0] || 'checkout';
    paint(
      '<style>' + DOMAIN_STYLES + '</style><div class="dom-wrap">' +
        pageHead('Set checkout domain') +
        '<div class="dstep">' +
          '<span class="sp ok"><span class="sn">' + I.check + '</span>Choose checkout domain</span><span class="ln"></span>' +
          '<span class="sp on"><span class="sn">2</span>Configure DNS</span><span class="ln"></span>' +
          '<span class="sp"><span class="sn">3</span>Ready</span>' +
        '</div>' +
        '<div class="panel card-pad">' +
          '<div class="card-title">Add this DNS record at your domain provider</div>' +
          '<div class="muted" style="font-size:13px;margin:4px 0 16px;line-height:1.5">Sign in to the provider that manages <b>' + esc(dom) + '</b> and add this CNAME. This does not change your Shopify storefront domain.</div>' +
          '<div class="dns-tbl">' +
            '<div class="dns-tr dns-th"><div class="dns-cell">Type</div><div class="dns-cell">Name</div><div class="dns-cell">Value</div><div class="dns-cell"></div></div>' +
            '<div class="dns-tr"><div class="dns-cell dns-mono">CNAME</div><div class="dns-cell dns-mono">' + esc(host) + '</div><div class="dns-cell dns-mono">' + PLATFORM_CNAME + '</div><div class="dns-cell"><button class="dns-copy" data-copy="' + PLATFORM_CNAME + '">Copy</button></div></div>' +
          '</div>' +
          (domainVerifyFailed
            ? '<div class="dns-fail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><div><b>We couldn\'t detect your CNAME yet.</b> DNS changes can take up to 30 minutes to take effect. Double-check the record above, then verify again.</div></div>'
            : '<div class="ssl-pill"><span class="ssl-spin"></span>Waiting for the CNAME to take effect. SSL is then issued automatically (usually within 30 minutes).</div>') +
          '<div class="flex items-center justify-between" style="margin-top:22px">' +
            '<a class="lnk" data-guide-faq style="font-size:13px;cursor:pointer">Having issues? View the setup guide</a>' +
            '<div class="flex" style="gap:10px"><button class="btn btn-gray" data-verify-later>Verify later</button><button class="btn btn-primary" data-verify-now>' + (domainVerifyFailed ? 'Verify again' : 'Verify now') + '</button></div>' +
          '</div>' +
        '</div>' +
      '</div>',
      false
    );
    root.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { try { navigator.clipboard.writeText(b.getAttribute('data-copy')); } catch (e) {} toast('Copied'); });
    root.querySelector('[data-verify-later]').onclick = () => { location.hash = '#/settings/domains'; };
    root.querySelector('[data-verify-now]').onclick = () => {
      if (!domainVerifyFailed) { domainVerifyFailed = true; renderAddDomainDNS(); }    // first check: DNS not propagated yet → show failure state
      else { domainVerifyFailed = false; location.hash = '#/settings/domains/bound'; } // retry: records detected → bound
    };
    root.querySelector('[data-guide-faq]').onclick = () => openDomainGuide();
  }
  function renderAddDomainBound() {
    const dom = pendingDomain || 'yourdomain.com';
    paint(
      '<style>' + DOMAIN_STYLES + '</style><div class="dom-wrap">' +
        pageHead('Set checkout domain') +
        '<div class="dstep">' +
          '<span class="sp ok"><span class="sn">' + I.check + '</span>Choose checkout domain</span><span class="ln"></span>' +
          '<span class="sp ok"><span class="sn">' + I.check + '</span>Configure DNS</span><span class="ln"></span>' +
          '<span class="sp on"><span class="sn">3</span>Ready</span>' +
        '</div>' +
        '<div class="panel card-pad"><div class="dbound">' +
          '<div class="ck"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
          '<div class="page-title" style="font-size:20px"><span>' + esc(dom) + '</span><span> is ready for checkout</span></div>' +
          '<div class="muted" style="font-size:13.5px;margin-top:6px;line-height:1.6">Buyers will use <b>https://' + esc(dom) + '</b> on your BestCheckout checkout, Upsell, Downsell, and Thank you pages. Your Shopify storefront domain is unchanged.</div>' +
          '<div style="color:#2bb673;font-weight:600;font-size:13px;margin-top:8px">SSL active · auto-renews before expiry</div>' +
          '<div style="margin-top:20px"><button class="btn btn-primary" data-back-domains>Back to checkout domain</button></div>' +
        '</div></div>' +
      '</div>',
      false
    );
    root.querySelector('[data-back-domains]').onclick = () => {
      if (pendingDomain) checkoutDomain = { domain: pendingDomain, status: 'connected' };
      pendingDomain = '';
      location.hash = '#/settings/domains';
    };
  }
  function renderDomains() {
    if (domainStep === 'add') return renderAddDomainDNS();
    if (domainStep === 'bound') return renderAddDomainBound();
    return renderDomainList();
  }
  function validDomain(v) {
    return /^(?!www\.)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(v);
  }
  function openAddDomainModal() {
    modal({
      title: 'Set checkout domain', width: 520, okText: 'Next',
      body:
        '<div class="muted" style="font-size:13px;margin-bottom:14px">Use a subdomain for the buyer checkout, such as <b>checkout.yourdomain.com</b>. Your Shopify storefront domain will not change.</div>' +
        '<div class="sp-field"><label class="sp-label">Checkout domain</label><div class="sp-input-wrap"><input id="add-dom" class="sp-input" placeholder="checkout.yourdomain.com" style="padding-right:14px"/></div><div class="sp-err" data-err="add-dom"></div></div>',
      onOk: (m, close) => {
        const v = (m.querySelector('#add-dom').value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        setErr(m, 'add-dom', ''); m.querySelector('#add-dom').classList.remove('err');
        if (!v) { setErr(m, 'add-dom', 'Please enter a checkout domain'); m.querySelector('#add-dom').classList.add('err'); return; }
        if (!validDomain(v) || v.split('.').length < 3) { setErr(m, 'add-dom', 'Use a subdomain, for example checkout.yourdomain.com'); m.querySelector('#add-dom').classList.add('err'); return; }
        if (checkoutDomain.domain === v) { setErr(m, 'add-dom', 'This is already your checkout domain'); m.querySelector('#add-dom').classList.add('err'); return; }
        pendingDomain = v; domainVerifyFailed = false; close(); location.hash = '#/settings/domains/add';
      },
    });
  }
  function deleteDomain(dom) {
    confirm({
      title: 'Remove this domain?', okText: 'Remove', danger: true,
      content: 'Customers will no longer reach your store at ' + dom + '. You can re-add it later.',
      onOk: () => { domainsData = domainsData.filter((d) => d.domain !== dom); toast('Domain removed'); renderDomainList(); },
    });
  }
  function setPrimaryDomain(dom) {
    domainsData.forEach((d) => { d.primary = (d.domain === dom); if (d.domain === dom) d.redirectTo = null; });
    toast('Primary domain updated'); renderDomainList();
  }
  // "Redirect" = send this domain's visitors (301) to the primary domain, so every
  // address resolves to one canonical store URL (good for SEO + branding).
  function redirectDomain(dom) {
    const primary = domainsData.find((d) => d.primary);
    if (!primary) { toast('Set a primary domain first'); return; }
    const d = domainsData.find((x) => x.domain === dom);
    if (d) { d.redirectTo = primary.domain; toast('Now redirecting to ' + primary.domain); renderDomainList(); }
  }
  function verifyDomain(dom) {
    const d = domainsData.find((x) => x.domain === dom);
    if (d) { d.status = 'connected'; }
    toast('Domain connected · SSL active'); renderDomainList();
  }
  // "Having issues? View the setup guide" — DNS records recap + troubleshooting.
  function openDomainGuide() {
    const host = (pendingDomain || 'checkout.yourdomain.com').split('.')[0] || 'checkout';
    modal({
      title: 'Connecting your checkout domain', width: 580, okText: 'Got it', hideCancel: true,
      body:
        '<div class="muted" style="font-size:13px;margin-bottom:14px;line-height:1.6">At your domain provider (GoDaddy, Namecheap, Alibaba Cloud, …), add this CNAME record. We detect it automatically and issue SSL for the checkout domain.</div>' +
        '<div class="dns-tbl" style="margin-bottom:16px">' +
          '<div class="dns-tr dns-th" style="grid-template-columns:96px 90px 1fr"><div class="dns-cell">Type</div><div class="dns-cell">Name</div><div class="dns-cell">Value</div></div>' +
          '<div class="dns-tr" style="grid-template-columns:96px 90px 1fr"><div class="dns-cell dns-mono">CNAME</div><div class="dns-cell dns-mono">' + esc(host) + '</div><div class="dns-cell dns-mono">' + PLATFORM_CNAME + '</div></div>' +
        '</div>' +
        '<div style="font-weight:600;font-size:13.5px;color:var(--ink);margin-bottom:8px">If it isn\'t verifying</div>' +
        '<ul style="margin:0;padding-left:18px;color:var(--ink-body);font-size:13px;line-height:1.75">' +
          '<li>DNS changes can take up to 30 minutes — sometimes a few hours — to take effect. Wait, then verify again.</li>' +
          '<li>Remove any old CNAME record on <b>' + esc(host) + '</b> that points elsewhere.</li>' +
          '<li>If your domain is proxied (e.g. Cloudflare), set the records to <b>DNS only</b>, not proxied.</li>' +
          '<li>Copy the values exactly — a typo or trailing dot will fail.</li>' +
        '</ul>',
      onOk: (m, close) => close(),
    });
  }

  // ===========================================================================
  // NOTIFICATIONS (V1.141) — transactional email config, per store.
  //   List (events grouped) -> Editor (left form + live desktop/mobile preview)
  //   + Brand settings (shared tokens). Merge tags + dynamic "blocks" expand in
  //   the preview against sample order data, so the body can't be broken.
  //   sub-state: notifSub = null (list) | 'brand' | <eventCode> (editor)
  // ===========================================================================
  let notifSub = null;
  let notifDevice = 'desktop';

  // sample order data the preview renders against (resolves {{merge.tags}})
  const NF_SAMPLE = {
    'customer.first_name': 'Emma', 'customer.name': 'Emma Johnson',
    'order.number': '1042', 'order.detail_url': '#', 'order.currency': 'US$', 'order.date': 'June 10, 2026',
    'order.subtotal': 'US$ 88.00', 'order.shipping': 'US$ 8.00', 'order.total': 'US$ 96.00',
    'order.shipping_address': 'Emma Johnson, 2261 Market St, San Francisco, CA 94114, US',
    'order.payment_method': 'Visa ···· 4242',
    'shipment.tracking_number': 'LX123456789CN', 'shipment.carrier': 'YunExpress', 'shipment.tracking_url': '#',
  };
  const NF_ITEMS = [
    { name: 'Aurora Knit Sweater', variant: 'Size M / Sand', qty: 1, price: 'US$ 58.00' },
    { name: 'Everyday Crossbody Bag', variant: 'Caramel', qty: 1, price: 'US$ 30.00' },
  ];
  const NF_CLS = { Transactional: '<span class="nf-cls t">Transactional</span>', Marketing: '<span class="nf-cls m">Marketing</span>', Internal: '<span class="nf-cls i">Internal</span>' };
  const nfStatusPill = (c) => c.enabled
    ? '<span class="pill pill-green"><span class="dot"></span>On</span>'
    : '<span class="pill pill-gray"><span class="dot"></span>Off</span>';

  function nfFindEvent(code) {
    for (const g of D.notifications.groups) { const e = (g.events || []).find((x) => x.code === code); if (e) return { ev: e, group: g }; }
    return null;
  }
  const nfSwitch = (on, code) => '<label class="set-switch' + (on ? ' on' : '') + '" data-nf-toggle="' + code + '"><span class="set-knob"></span></label>';

  // resolve a scalar merge tag against brand + sample data
  function nfResolve(key, b) {
    if (key === 'store.name') return b.storeName;
    if (key === 'store.url') return 'lavender-labs.myshopify.com';
    if (key === 'store.contact_email') return b.contactEmail;
    if (key.indexOf('store.') === 0) return b.storeName;
    return NF_SAMPLE[key];
  }
  // expand a dynamic block tag to safe HTML (the merchant never hand-codes loops)
  function nfBlock(tag, b) {
    const color = b.primaryColor || '#0066e6';
    const panel = (label, inner) =>
      '<div style="background:#f7f8fa;border-radius:12px;padding:20px 22px;margin:0 0 16px">' +
        (label ? '<div style="font-size:12px;font-weight:600;letter-spacing:.04em;color:#9aa3b2;margin-bottom:14px">' + label + '</div>' : '') + inner + '</div>';
    const itemsRows = (items) => items.map((it) => {
      const initial = esc(String(it.name || '·').trim().charAt(0));
      return '<div style="display:flex;align-items:center;gap:14px;padding:9px 0">' +
        '<div style="width:50px;height:50px;border-radius:10px;background:#eef2fb;color:' + color + ';font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;flex:none">' + initial + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:#2a2f3a">' + esc(it.name) + '</div>' +
          '<div style="font-size:12.5px;color:#9aa3b2;margin-top:2px">' + esc(it.variant) + ' · Qty ' + it.qty + '</div></div>' +
        '<div style="font-size:14px;font-weight:600;color:#2a2f3a;white-space:nowrap">' + esc(it.price) + '</div>' +
      '</div>';
    }).join('');
    const totalRow = (label, val) => '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13.5px;color:#6b7480"><span>' + label + '</span><span>' + val + '</span></div>';
    if (tag === 'block.cta_button')
      return '<div style="margin:0 0 22px">' +
        '<a href="#" style="display:inline-block;background:' + color + ';color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px">View your order</a>' +
        '<a href="#" style="display:inline-block;color:' + color + ';font-size:14px;text-decoration:none;margin-left:18px">Visit our store</a></div>';
    if (tag === 'block.tracking')
      return panel('Tracking number · ' + NF_SAMPLE['shipment.carrier'],
        '<div style="font-size:18px;font-weight:700;color:#1f2430;letter-spacing:.02em;margin-bottom:16px">' + NF_SAMPLE['shipment.tracking_number'] + '</div>' +
        '<a href="#" style="display:inline-block;background:' + color + ';color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:8px">Track package</a>');
    if (tag === 'block.order_summary')
      return panel('Order summary', itemsRows(NF_ITEMS) +
        '<div style="border-top:1px solid #e7eaef;margin-top:10px;padding-top:14px">' + totalRow('Subtotal', NF_SAMPLE['order.subtotal']) + totalRow('Shipping', NF_SAMPLE['order.shipping']) + '</div>' +
        '<div style="border-top:1px solid #e7eaef;margin-top:12px;padding-top:14px;display:flex;justify-content:space-between;align-items:center">' +
          '<span style="font-size:15px;font-weight:700;color:#1f2430">Total</span><span style="font-size:18px;font-weight:700;color:#1f2430">' + NF_SAMPLE['order.total'] + '</span></div>');
    if (tag === 'block.shipping_address')
      return panel('Shipping address', '<div style="font-size:14px;color:#5a6473;line-height:1.7">' + esc(NF_SAMPLE['order.shipping_address']) + '</div>');
    if (tag === 'block.line_items') return itemsRows(NF_ITEMS);
    if (tag === 'block.shipment_items') return panel('Items in this shipment', itemsRows(NF_ITEMS));
    return '';
  }
  // expand a body string (blocks first, then scalar tags) -> preview HTML
  function nfExpand(body, b) {
    return String(body || '')
      .replace(/\{\{\s*(block\.[a-z_]+)\s*\}\}/gi, (m, t) => nfBlock(t.trim(), b))
      .replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (m, k) => { const v = nfResolve(k.trim(), b); return v != null ? esc(v) : '<span class="nf-unktag">{{' + esc(k.trim()) + '}}</span>'; });
  }
  // expand inline text (subject / preheader) -> plain text
  function nfText(str, b) {
    return String(str || '').replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (m, k) => { const v = nfResolve(k.trim(), b); return v != null ? v : ''; });
  }

  // the rendered email card (device = 'desktop' | 'mobile')
  function nfCardHtml(b, st) {
    const color = b.primaryColor || '#0066e6';
    const mobile = st.device === 'mobile';
    const width = mobile ? 360 : 600;
    const px = mobile ? 24 : 40;
    return '<div class="email-card" style="width:' + width + 'px">' +
      '<div style="height:4px;background:' + color + '"></div>' +
      '<div style="padding:28px ' + px + 'px 22px;text-align:center;border-bottom:1px solid #eef0f4">' +
        '<span style="font-size:20px;font-weight:700;letter-spacing:-.01em;color:#1f2430">' + esc(b.storeName || 'Your store') + '</span></div>' +
      '<div style="padding:32px ' + px + 'px 8px">' + nfExpand(st.body, b) + '</div>' +
      '<div style="padding:22px ' + px + 'px 28px;background:#fafbfc;border-top:1px solid #eef0f4;text-align:center">' +
        '<div style="font-size:13px;color:#9aa3b2;line-height:1.7">Questions? Reply to this email or contact <a href="#" style="color:' + color + ';text-decoration:none">' + esc(b.contactEmail || '') + '</a></div>' +
        (b.footerText ? '<div style="font-size:12px;color:#b8c0cd;margin-top:10px">' + esc(b.footerText) + '</div>' : '') +
        (b.address ? '<div style="font-size:12px;color:#c7cdd8;margin-top:3px">' + esc(b.address) + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  // read the live form values for the preview
  function nfReadForm(ev) {
    const g = (id) => { const el = root.querySelector('#' + id); return el ? el.value : ''; };
    return {
      device: notifDevice,
      fromName: g('nf-fromname') || ev.config.fromName,
      fromEmail: g('nf-fromemail') || ev.config.fromEmail,
      subject: g('nf-subject') || ev.config.subject,
      body: (root.querySelector('#nf-body') ? root.querySelector('#nf-body').value : ev.config.body),
    };
  }
  function nfUpdatePreview(ev) {
    const b = D.notifications.brand;
    const st = nfReadForm(ev);
    const inbox = root.querySelector('#nf-inbox');
    if (inbox) inbox.innerHTML =
      '<div><span class="l">From </span><span class="v">' + esc(st.fromName) + '</span> <span class="l">&lt;' + esc(st.fromEmail) + '&gt;</span></div>' +
      '<div style="margin-top:3px"><span class="l">Subject </span><span class="v">' + esc(nfText(st.subject, b)) + '</span></div>';
    const stage = root.querySelector('#nf-stage');
    if (stage) { stage.innerHTML = nfCardHtml(b, st); nfFit(); }
  }
  // scale the email card to fit the preview stage width (keeps a faithful layout)
  function nfFit() {
    try {
      const stage = root.querySelector('#nf-stage'); const card = stage && stage.querySelector('.email-card');
      if (!card) return;
      card.style.transform = 'none';
      const avail = stage.clientWidth - 24, w = card.offsetWidth;
      const s = Math.min(1, avail / w);
      card.style.transformOrigin = 'top center';
      card.style.transform = 'scale(' + s + ')';
      stage.style.height = (card.offsetHeight * s + 36) + 'px';
    } catch (e) {}
  }
  function insertAtCursor(el, text) {
    const s = el.selectionStart || 0, e = el.selectionEnd || 0;
    el.value = el.value.slice(0, s) + text + el.value.slice(e);
    el.selectionStart = el.selectionEnd = s + text.length; el.focus();
  }

  function renderNotifications() {
    if (notifSub) { const f = nfFindEvent(notifSub); if (f && !f.group.locked) return renderNotifEditor(f.ev); notifSub = null; }
    return renderNotifList();
  }

  function renderNotifList() {
    const n = D.notifications;
    const groupsHtml = n.groups.map((g) => {
      const rows = g.events.map((ev) => {
        if (g.locked) {
          return '<div class="nf-row locked">' +
            '<span class="nf-ico">' + I.globe + '</span>' +
            '<div class="nf-main"><div class="nf-name">' + esc(ev.name) + ' ' + (NF_CLS[ev.cls] || '') + '</div><div class="nf-desc">' + esc(ev.desc) + '</div></div>' +
            '<div class="nf-right"><span class="pill pill-gray">Coming soon</span></div></div>';
        }
        const c = ev.config;
        return '<div class="nf-row" data-edit="' + ev.code + '">' +
          '<span class="nf-ico">' + I.globe + '</span>' +
          '<div class="nf-main"><div class="nf-name">' + esc(ev.name) + ' ' + (NF_CLS[ev.cls] || '') + '</div>' +
            '<div class="nf-desc">' + esc(ev.desc) + '</div></div>' +
          '<div class="nf-meta">Email' + (c.updatedAt ? ' · edited ' + esc(c.updatedAt) : ' · not set up') + '</div>' +
          '<div class="nf-right">' + nfStatusPill(c) + nfSwitch(c.enabled, ev.code) + '<span class="nf-chev">' + I.chevR + '</span></div>' +
        '</div>';
      }).join('');
      return '<div class="nf-group">' +
        '<div class="nf-group-h">' + esc(g.label) + (g.locked ? '<span class="nf-soon">Roadmap</span>' : '') + '</div>' +
        (g.note ? '<div class="muted" style="font-size:12.5px;margin:0 2px 8px">' + esc(g.note) + '</div>' : '') +
        '<div class="nf-list">' + rows + '</div></div>';
    }).join('');

    paint(
      '<style>' + NOTIF_STYLES + '</style>' +
      pageHead('Notifications', 'Email your customers when key order events happen. These settings belong to this store only.') +
      '<div class="set-note mb-4" style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--brand);flex:none;display:inline-flex">' + I.info + '</span>' +
        '<div class="muted" style="font-size:12.5px;line-height:1.5">Turn a notification on to start sending it. Edit the sender, subject and content — the live preview shows exactly what your customer receives. The logo, brand color and store name come from your <a class="lnk" href="#/settings/base">store settings</a>.</div></div>' +
      groupsHtml,
      false
    );

    root.querySelectorAll('[data-nf-toggle]').forEach((el) => el.onclick = (e) => {
      e.stopPropagation();
      const f = nfFindEvent(el.getAttribute('data-nf-toggle')); if (!f) return;
      const c = f.ev.config; c.enabled = !c.enabled;
      toast(c.enabled ? f.ev.name + ' turned on' : f.ev.name + ' turned off');
      renderNotifList();
    });
    root.querySelectorAll('[data-edit]').forEach((el) => el.onclick = () => { notifSub = el.getAttribute('data-edit'); renderNotifications(); });
  }

  function renderNotifEditor(ev) {
    const n = D.notifications, c = ev.config, b = n.brand;
    const tags = (n.mergeTags.common || []).concat(n.mergeTags[ev.code] || []);
    const varOpts = '<option value="">Insert variable</option>' + tags.map((t) => '<option value="' + t + '">{{' + t + '}}</option>').join('');
    const blockList = n.blocks[ev.code] || [];
    const blockOpts = '<option value="">Insert block</option>' + blockList.map((bl) => '<option value="' + bl.tag + '">' + esc(bl.label) + '</option>').join('');

    const fld = (label, id, value, hint, ph) =>
      '<div style="margin-bottom:14px"><label class="nf-label" for="' + id + '">' + esc(label) + '</label>' +
        '<input class="input" id="' + id + '" value="' + esc(value || '') + '" placeholder="' + esc(ph || '') + '" style="width:100%" />' +
        (hint ? '<div class="nf-hint">' + esc(hint) + '</div>' : '') + '</div>';

    const form =
      '<div class="panel card-pad">' +
        '<div class="flex items-center justify-between" style="margin-bottom:16px">' +
          '<div><div class="nf-label" style="margin:0">Status</div><div class="nf-hint">' + (c.enabled ? 'This notification is being sent.' : 'Turn on to start sending.') + '</div></div>' +
          nfSwitch(c.enabled, '__editor') +
        '</div>' +
        fld('From name', 'nf-fromname', c.fromName, '', 'Sender name') +
        fld('From email', 'nf-fromemail', c.fromEmail, 'Must be an address on your verified sending domain (' + n.sendingDomain + '). Custom domains are on the roadmap.', 'orders@' + n.sendingDomain) +
        fld('Reply-to', 'nf-replyto', c.replyTo, 'Customer replies go here.', 'service@example.com') +
        fld('Subject', 'nf-subject', c.subject, '', 'Subject line') +
        fld('Preheader', 'nf-preheader', c.preheader, 'The short preview text shown in the inbox after the subject.', 'Preview text') +
        '<div><label class="nf-label">Email body</label>' +
          '<div class="nf-toolbar">' +
            '<select class="nf-insert input" data-no-ui id="nf-ins-var">' + varOpts + '</select>' +
            (blockList.length ? '<select class="nf-insert input" data-no-ui id="nf-ins-block">' + blockOpts + '</select>' : '') +
            '<button class="btn btn-gray" data-tpl type="button">Start from template</button>' +
          '</div>' +
          '<textarea class="nf-body" id="nf-body" spellcheck="false">' + esc(c.body) + '</textarea>' +
          '<div class="nf-hint">Edit the HTML and insert variables. Dynamic blocks (order summary, tracking…) render order data safely — you never write the loop.</div>' +
        '</div>' +
      '</div>';

    const preview =
      '<div class="nf-preview">' +
        '<div class="nf-pv-head"><div class="nf-label" style="margin:0">Preview</div>' +
          '<div class="nf-seg">' +
            '<button data-dev="desktop" class="' + (notifDevice === 'desktop' ? 'on' : '') + '">Desktop</button>' +
            '<button data-dev="mobile" class="' + (notifDevice === 'mobile' ? 'on' : '') + '">Mobile</button>' +
          '</div>' +
        '</div>' +
        '<div class="nf-inbox" id="nf-inbox"></div>' +
        '<div class="nf-stage" id="nf-stage"></div>' +
      '</div>';

    paint(
      '<style>' + NOTIF_STYLES + '</style>' +
      '<div class="flex items-center justify-between mb-4" style="gap:12px">' +
        '<div class="flex items-center gap-3">' +
          '<button class="back-btn" data-back title="Back">' + I.chevL + '</button>' +
          '<div><div class="page-title" style="font-size:18px">' + esc(ev.name) + '</div>' +
            '<div class="muted" style="font-size:12.5px;margin-top:2px">' + (NF_CLS[ev.cls] || '') + ' · Email · sent automatically</div></div>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<button class="btn btn-default" data-test>Send test email</button>' +
          '<button class="btn btn-primary" data-save>Save</button>' +
        '</div>' +
      '</div>' +
      '<div class="nf-editor">' + form + preview + '</div>',
      false
    );

    nfUpdatePreview(ev);
    setTimeout(nfFit, 0);

    // back
    root.querySelector('[data-back]').onclick = () => { notifSub = null; renderNotifications(); };
    // status toggle in the form
    const enSw = root.querySelector('[data-nf-toggle="__editor"]');
    if (enSw) enSw.onclick = () => { enSw.classList.toggle('on'); c.enabled = enSw.classList.contains('on'); };
    // device toggle
    root.querySelectorAll('[data-dev]').forEach((bd) => bd.onclick = () => {
      notifDevice = bd.getAttribute('data-dev');
      root.querySelectorAll('[data-dev]').forEach((x) => x.classList.toggle('on', x === bd));
      nfUpdatePreview(ev);
    });
    // live preview on edits
    ['nf-fromname', 'nf-fromemail', 'nf-subject', 'nf-body'].forEach((id) => { const el = root.querySelector('#' + id); if (el) el.addEventListener('input', () => nfUpdatePreview(ev)); });
    // variable / block inserters
    const insVar = root.querySelector('#nf-ins-var');
    if (insVar) insVar.onchange = () => { if (insVar.value) { insertAtCursor(root.querySelector('#nf-body'), '{{' + insVar.value + '}}'); insVar.selectedIndex = 0; nfUpdatePreview(ev); } };
    const insBlk = root.querySelector('#nf-ins-block');
    if (insBlk) insBlk.onchange = () => { if (insBlk.value) { insertAtCursor(root.querySelector('#nf-body'), '\n{{' + insBlk.value + '}}\n'); insBlk.selectedIndex = 0; nfUpdatePreview(ev); } };
    // start from template
    const tpl = root.querySelector('[data-tpl]'); if (tpl) tpl.onclick = () => openNotifTemplateModal(ev);
    // test send
    root.querySelector('[data-test]').onclick = () => openNotifTestModal(ev);
    // save — the Status toggle controls sending; Save persists everything
    root.querySelector('[data-save]').onclick = () => {
      nfSaveFromForm(ev); toast('Saved');
      if (window.SettingsChrome) window.SettingsChrome.setDirty(false);
      notifSub = null; renderNotifications();
    };
  }

  // persist the form back into the event config (prototype: in-memory)
  function nfSaveFromForm(ev) {
    const g = (id) => { const el = root.querySelector('#' + id); return el ? el.value : undefined; };
    const c = ev.config;
    ['fromName|nf-fromname', 'fromEmail|nf-fromemail', 'replyTo|nf-replyto', 'subject|nf-subject', 'preheader|nf-preheader'].forEach((p) => { const [k, id] = p.split('|'); const v = g(id); if (v !== undefined) c[k] = v; });
    const body = root.querySelector('#nf-body'); if (body) c.body = body.value;
    c.updatedAt = '2026-06-10';
  }

  function openNotifTemplateModal(ev) {
    const presets = (D.notifications.presets[ev.code] || []);
    const cards = presets.map((p, i) =>
      '<label class="nf-tpl" data-tpl-pick="' + i + '">' +
        '<div class="nf-tpl-thumb">' + esc(p.name.charAt(0)) + '</div>' +
        '<div><div class="text-sm" style="font-weight:600;color:var(--ink)">' + esc(p.name) + '</div>' +
          '<div class="muted" style="font-size:12px;margin-top:2px">' + esc(p.subject) + '</div></div>' +
      '</label>').join('');
    const ctrl = modal({
      title: 'Start from a template', width: 520, hideCancel: false, okText: 'Cancel',
      body: '<div class="muted mb-4" style="font-size:13px">Pick a starting point. You can edit everything afterwards — this replaces the current subject and body.</div><div class="nf-tpl-list">' + cards + '</div>',
      onOk: (m, close) => close(),
    });
    ctrl.m.querySelectorAll('[data-tpl-pick]').forEach((el) => el.onclick = () => {
      const p = presets[Number(el.getAttribute('data-tpl-pick'))];
      const sub = root.querySelector('#nf-subject'); if (sub) sub.value = p.subject;
      const body = root.querySelector('#nf-body'); if (body) body.value = p.body;
      ctrl.close(); toast('Template applied'); nfUpdatePreview(ev);
    });
  }

  function openNotifTestModal(ev) {
    modal({
      title: 'Send a test email', width: 460, okText: 'Send test',
      body: '<div class="muted mb-4" style="font-size:13px">We’ll send this notification with sample order data so you can check how it looks in a real inbox.</div>' +
        field('Send to', window.SITE && window.SITE.email ? window.SITE.email : '', 'you@example.com'),
      onOk: (m, close) => { const inp = m.querySelector('input'); const to = inp ? inp.value : ''; close(); toast(to ? 'Test email sent to ' + to : 'Test email sent'); },
    });
  }

  const NOTIF_STYLES = `
  .nf-group { margin-bottom: 22px; }
  .nf-group:last-child { margin-bottom: 0; }
  .nf-group-h { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-muted); margin: 0 2px 8px; }
  .nf-soon { text-transform: none; letter-spacing: 0; font-size: 11px; font-weight: 500; color: var(--ink-muted); background: var(--panel); border: 1px solid var(--hair); border-radius: 9999px; padding: 1px 8px; }
  .nf-list { display: flex; flex-direction: column; gap: 10px; }
  .nf-row { display: flex; align-items: center; gap: 14px; padding: 13px 16px; border: 1px solid var(--hair); border-radius: 10px; background: #fff; cursor: pointer; transition: border-color .12s, background .12s; }
  .nf-row:hover { border-color: var(--brand); background: #fcfdff; }
  .nf-row.locked { cursor: default; background: var(--panel); }
  .nf-row.locked:hover { border-color: var(--hair); background: var(--panel); }
  .nf-ico { width: 36px; height: 36px; border-radius: 8px; background: #e6f0ff; color: var(--brand); display: grid; place-items: center; flex: none; }
  .nf-row.locked .nf-ico { background: #eef0f4; color: var(--ink-muted); }
  .nf-main { flex: 1; min-width: 0; }
  .nf-name { font-size: 14px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 8px; }
  .nf-desc { font-size: 12.5px; color: var(--ink-muted); margin-top: 2px; }
  .nf-meta { font-size: 12px; color: var(--ink-muted); white-space: nowrap; }
  .nf-cls { font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 9999px; }
  .nf-cls.t { background: #e0f2ec; color: #00684a; }
  .nf-cls.m { background: #ffedd5; color: #b45309; }
  .nf-cls.i { background: #dbeafe; color: #2563eb; }
  .nf-right { display: flex; align-items: center; gap: 12px; flex: none; }
  .nf-chev { color: var(--ink-muted); display: inline-flex; }
  @media (max-width: 760px) { .nf-meta { display: none; } }

  /* editor */
  .nf-editor { display: grid; grid-template-columns: minmax(360px, 440px) minmax(0, 1fr); gap: 20px; align-items: start; }
  @media (max-width: 1080px) { .nf-editor { grid-template-columns: 1fr; } }
  .nf-label { display: block; font-size: 13px; font-weight: 600; color: var(--ink); margin: 0 0 6px; }
  .nf-hint { font-size: 11.5px; color: var(--ink-muted); margin-top: 5px; line-height: 1.5; }
  .nf-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  .nf-insert { height: 32px; width: auto; min-width: 140px; padding: 0 10px; }
  .nf-body { width: 100%; min-height: 220px; font: 12.5px/1.6 ui-monospace, Menlo, Consolas, monospace; padding: 10px 12px; border: 1px solid var(--ctl); border-radius: 8px; resize: vertical; color: var(--ink); background: #fff; }
  .nf-body:focus { outline: none; border-color: var(--brand); }

  /* preview */
  .nf-preview { position: sticky; top: 8px; }
  .nf-pv-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .nf-seg { display: inline-flex; border: 1px solid var(--ctl); border-radius: 8px; overflow: hidden; }
  .nf-seg button { border: none; background: #fff; padding: 6px 14px; font-size: 12.5px; color: var(--ink-body); cursor: pointer; }
  .nf-seg button + button { border-left: 1px solid var(--ctl); }
  .nf-seg button.on { background: var(--brand); color: #fff; }
  .nf-inbox { border: 1px solid var(--hair); border-bottom: none; border-radius: 10px 10px 0 0; background: #fff; padding: 10px 14px; font-size: 12.5px; }
  .nf-inbox .l { color: var(--ink-muted); } .nf-inbox .v { color: var(--ink); font-weight: 500; }
  .nf-stage { border: 1px solid var(--hair); border-radius: 0 0 10px 10px; background: #eef1f5; padding: 18px 12px; overflow: hidden; }
  .email-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgb(16 24 40 / 8%); overflow: hidden; margin: 0 auto; font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  .email-card .nf-h { margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #1f2430; letter-spacing: -.01em; }
  .email-card .nf-lead { margin: 0 0 22px; font-size: 15px; color: #5a6473; line-height: 1.7; }
  .email-card .nf-fine { margin: 18px 0 0; font-size: 13px; color: #9aa3b2; line-height: 1.7; }
  .nf-unktag { background: #fff4d6; color: #92660a; border-radius: 4px; padding: 0 4px; font-size: .92em; }

  /* template picker */
  .nf-tpl-list { display: flex; flex-direction: column; gap: 10px; }
  .nf-tpl { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--hair); border-radius: 10px; cursor: pointer; }
  .nf-tpl:hover { border-color: var(--brand); background: #fcfdff; }
  .nf-tpl-thumb { width: 40px; height: 40px; border-radius: 8px; background: #e6f0ff; color: var(--brand); font-weight: 700; display: grid; place-items: center; flex: none; }
  `;

  const ROUTES = {
    notifications: renderNotifications,
    base: renderShopifyStore,
    domains: renderDomains,
    payments: renderPayments,
    currency: renderCurrency,
    metafields: renderMetafields,
    'shippable-locations': renderLocations,
    'shipping-rates': renderRates,
    roles: renderRoles,
    staff: renderStaff,
  };

  let curRest = '';
  // settings dirty bar: any edit in the content flips the shell header to "You have unsaved changes"
  function wireDirty() {
    if (!root || root.__dirtyWired) return;
    root.__dirtyWired = true;
    const onEdit = () => {
      if (!window.SettingsChrome) return;
      window.SettingsChrome.setDirty(true, {
        onDiscard: () => { show(curRest); if (window.SettingsChrome) window.SettingsChrome.setDirty(false); },
        onUpdate: () => { toast('Updated successfully'); if (window.SettingsChrome) window.SettingsChrome.setDirty(false); },
      });
    };
    root.addEventListener('input', onEdit);
    root.addEventListener('change', onEdit);
  }
  function show(rest) {
    curRest = rest || '';
    const parts = String(rest || '').split('/').filter(Boolean);
    const key = ROUTES[parts[0]] ? parts[0] : 'base';
    const sub = parts[1];
    // reset / seed drill-down sub-states for the active sub-page
    mfResource = (key === 'metafields' && sub) ? decodeURIComponent(sub) : null;
    mfAdding = false;
    rateProfile = (key === 'shipping-rates' && sub != null && sub !== '')
      ? (sub === 'new' ? 'new' : Number(decodeURIComponent(sub))) : null;
    domainStep = (key === 'domains' && sub) ? sub : null;
    notifSub = (key === 'notifications' && sub != null && sub !== '') ? decodeURIComponent(sub) : null;
    ROUTES[key]();
    wireDirty();
    if (root && root.parentElement) root.parentElement.scrollTop = 0;
  }

  // ===========================================================================
  // page-scoped styles (Settings-only widgets layered on top of theme.css)
  // ===========================================================================
  const STYLES = `
  /* centered forms mirror the real admin's w-[860px] pages */
  .set-narrow { width: 860px; max-width: 100%; margin: 0 auto; }

  /* switch */
  .set-switch { display: inline-flex; align-items: center; width: 40px; height: 22px; border-radius: 9999px; background: var(--ctl); cursor: pointer; transition: background .15s; flex: none; padding: 2px; }
  .set-switch.on { background: var(--brand); }
  .set-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 2px rgb(0 0 0 / 20%); }
  .set-switch.on .set-knob { transform: translateX(18px); }

  /* upload tile */
  .up-tile { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; width: 104px; height: 104px; border: 1px dashed var(--ctl); border-radius: 8px; background: var(--panel); color: var(--ink-muted); cursor: pointer; }
  .up-tile:hover { border-color: var(--brand); color: var(--brand); }
  .up-plus { display: inline-flex; }
  .up-add { font-size: 11.5px; }
  .up-tile.filled { border-style: solid; background: #fff; position: relative; color: var(--ink-body); }
  .up-ico { color: var(--brand); }
  .up-name { font-size: 10.5px; max-width: 88px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .up-x { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 6px; border: none; background: rgba(0,0,0,.45); color: #fff; display: grid; place-items: center; cursor: pointer; }

  /* input addon (suffix/prefix) */
  .set-addon { display: inline-flex; align-items: stretch; }
  .set-addon .input { border-radius: var(--radius); }
  .set-addon-suffix, .set-addon-prefix { display: inline-flex; align-items: center; padding: 0 12px; border: 1px solid var(--ctl); background: var(--panel); font-size: 13px; color: var(--ink-body); }
  .set-addon-suffix { border-left: none; border-top-right-radius: var(--radius); border-bottom-right-radius: var(--radius); }
  .set-addon-prefix { border-right: none; border-top-left-radius: var(--radius); border-bottom-left-radius: var(--radius); }

  .set-range { flex: 1; accent-color: var(--brand); height: 4px; }

  /* note / banner box — borderless grey (mirrors reference rounded-md bg-[#f7f8fa]) */
  .set-note { background: #f7f8fb; border-radius: 8px; padding: 16px; }

  /* multi-select tag box (Add font modal — Ant Select mode=multiple look) */
  .ms-box { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 36px; padding: 4px 8px; border: 1px solid var(--ctl); border-radius: 8px; background: #fff; cursor: text; }
  .ms-box:focus-within { border-color: var(--brand); }
  .ms-tag { display: inline-flex; align-items: center; gap: 6px; background: #f0f1f3; border-radius: 4px; padding: 2px 6px 2px 8px; font-size: 13px; color: var(--ink); }
  .ms-x { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-muted); font-size: 14px; line-height: 1; }
  .ms-x:hover { color: var(--ink); }
  .ms-input { flex: 1; min-width: 60px; border: none; outline: none; background: transparent; font-size: 13px; height: 26px; color: var(--ink); }

  /* payments — processor logo + soft icon box (mirrors render.tsx + global .b-c) */
  .prov-block { margin-bottom: 24px; }
  .prov-block:last-child { margin-bottom: 0; }
  .prov-logo { display: flex; align-items: center; margin-bottom: 16px; }
  .prov-logo img { display: block; width: auto; object-fit: contain; }

  .pay-bc { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #f7f8fb; border-radius: 8px 8px 0 0; padding: 16px; }
  .pay-icons { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
  .pay-ico { height: 24px; width: auto; object-fit: contain; display: block; }
  .proc-radio { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--ctl); display: inline-grid; place-items: center; flex: none; }
  .set-radio.on .proc-radio, .set-radio2.on .proc-radio { border-color: var(--brand); }
  .proc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); }
  .set-radio { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink-body); cursor: pointer; }
  .set-radio2 { display: flex; align-items: flex-start; gap: 8px; font-size: 13.5px; color: var(--ink-body); cursor: pointer; padding: 8px 10px; border: 1px solid var(--hair); border-radius: 8px; }
  .set-radio2.on { border-color: var(--brand); background: #e6f0ff; }

  /* currency flag chip */
  .ccy-flag { display: inline-grid; place-items: center; width: 22px; height: 16px; border-radius: 3px; background: var(--panel); border: 1px solid var(--hair); font-size: 9px; font-weight: 700; color: var(--ink-muted); letter-spacing: -.02em; }

  /* metafields */
  .mf-res { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 14px; border: 1px solid var(--hair); border-radius: 10px; background: var(--panel); cursor: pointer; }
  .mf-res:hover { background: #f1f3f8; }
  .mf-res-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 8px; background: #fff; border: 1px solid var(--hair); color: var(--ink-muted); flex: none; font-size: 11px; font-weight: 600; }
  .mf-grip { cursor: move; color: var(--ink-muted); display: inline-flex; }
  .mf-type-ico { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 5px; border: 1px solid var(--hair); color: var(--ink-muted); flex: none; }
  .mf-blank-ico { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; background: #e6f0ff; color: var(--brand); }

  /* icon button (table row actions / dropdown trigger) */
  .set-icon-btn { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 7px; border: none; background: transparent; color: var(--ink-muted); cursor: pointer; }
  .set-icon-btn:hover { background: var(--panel); color: var(--ink); }
  .set-icon-btn.danger:hover { color: var(--err); }

  /* shippable locations table */
  .loc-table tbody tr { cursor: default; }
  .loc-caret { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; padding: 0; border: none; background: transparent; cursor: pointer; color: var(--ink-muted); transition: transform .15s; flex: none; }
  .loc-caret.open { transform: rotate(90deg); }

  /* dropdown row menu */
  .row-menu { position: absolute; z-index: 95; min-width: 120px; background: #fff; border: 1px solid var(--hair); border-radius: 8px; box-shadow: var(--float-shadow); padding: 4px; }
  .row-menu-item { display: block; width: 100%; text-align: left; padding: 7px 10px; border: none; background: transparent; font-size: 13px; color: var(--ink-body); border-radius: 6px; cursor: pointer; }
  .row-menu-item:hover { background: var(--panel); }
  .row-menu-item.danger { color: var(--err); }

  /* shipping rates */
  .rate-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 1px solid var(--hair); border-radius: 10px; background: var(--panel); cursor: pointer; }
  .rate-row:hover { background: #f1f3f8; }
  .rate-ico { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; background: #fff; border: 1px solid var(--hair); color: var(--ink-muted); flex: none; }
  .zone-block { border: 1px solid var(--hair); border-radius: 12px; padding: 14px 16px; }
  .zone-ico { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; background: #e6f0ff; color: var(--brand); flex: none; }
  .rate-list { border: 1px solid var(--hair); border-radius: 8px; overflow: hidden; }
  .rate-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #fff; border-bottom: 1px solid var(--hair); }
  .rate-item:last-child { border-bottom: none; }
  .rate-empty { border: 1px solid var(--hair); border-radius: 8px; background: var(--panel); padding: 16px; text-align: center; }
  .rate-free { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 6px; background: var(--ok-bg); color: #00684a; font-size: 12px; font-weight: 600; }
  .rate-price { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 6px; background: #e6f0ff; color: #0058c4; font-size: 12px; font-weight: 600; }
  .prod-thumb { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 6px; background: var(--panel); border: 1px solid var(--hair); color: var(--ink-muted); font-size: 10px; flex: none; }

  /* checkout preview (rate modal) */
  .checkout-preview { background: var(--panel); border-radius: 8px; padding: 14px; }
  .checkout-preview-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid var(--hair); border-radius: 8px; padding: 10px 14px; }

  /* zone region picker */
  .zone-region-pick { max-height: 220px; overflow: auto; border: 1px solid var(--hair); border-radius: 8px; padding: 8px 12px; }

  /* preview modal frame */
  .preview-frame { display: grid; place-items: center; border: 1px solid var(--hair); border-radius: 10px; background: var(--panel); }
  `;

  // ---- SPA registration (the shell drives render + renders the sidebar) ----
  window.VIEWS = window.VIEWS || {};
  window.VIEWS.settings = { render: function (el, rest) { root = el; show(rest || 'base'); } };
})();
