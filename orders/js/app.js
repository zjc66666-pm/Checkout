/* BestShopio Admin · Orders prototype — list + detail + modals, hash-routed.
   Chrome (sidebar + header) is injected by ../assets/shell.js; this file only
   renders the module body into #root. Mirrors reference/bestvoy-admin orders:
     - views/admin/orders/pages/list.tsx + components/list/* (tabs, search, table)
     - views/admin/orders/pages/detial.tsx + components/detail/* (cards, modals) */
(function () {
  const D = window.DATA_ORDERS;
  let root; // set by the SPA shell router via VIEWS.orders.render(el, rest)

  // tiny html -> element helper
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => '$' + Number(n || 0).toFixed(2);
  // Product options are presented with one separator across all order-detail rows.
  const variantText = (value) => String(value == null ? '' : value).trim().replace(/\s*,\s*/g, ' / ');

  // ---- inline icons (svg style matches shell.js .nav-ico) ----
  const svg = (p, w) => '<svg viewBox="0 0 24 24" width="' + (w || 16) + '" height="' + (w || 16) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const I = {
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    chevDown: svg('<path d="m6 9 6 6 6-6"/>', 14),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', 18),
    arrowLeft: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', 18),
    pencil: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 15),
    mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>', 15),
    phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>', 15),
    tag: svg('<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.3"/>', 13),
    recurring: svg('<path d="M21 12a9 9 0 0 0-15.2-6.5L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15.2 6.5L21 16"/><path d="M21 21v-5h-5"/>', 13),
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 16),
  };
  // Shopify is the merchant's fulfillment workspace. These labels describe the
  // outcome the merchant needs to act on, rather than the implementation detail
  // of the write-back job.
  const SHOPIFY_SYNC_STATUS = {
    in_shopify:    { text: 'In Shopify',          cls: 'pill-green' },
    sending:       { text: 'Sending to Shopify',  cls: 'pill-orange' },
    attention:     { text: 'Needs attention',     cls: 'pill-red' },
    after_payment: { text: 'Sync after payment',  cls: 'pill-gray' },
    shopify_order: { text: 'Created in Shopify',  cls: 'pill-gray' },
  };

  function shopifyAdminOrderUrl(o) {
    const reference = String((o && o.shopify_order_id) || '').replace(/[^A-Za-z0-9_-]/g, '');
    return reference ? 'https://admin.shopify.com/store/lavender-labs/orders/' + encodeURIComponent(reference) : '';
  }

  // ---- toast ----
  const toast = (msg) => { const t = document.createElement('div'); t.textContent = msg; t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#242833;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:90;box-shadow:var(--float-shadow)'; document.body.appendChild(t); if (window.I18N) window.I18N.apply(t); setTimeout(() => t.remove(), 1900); };

  const pill = (map, key) => {
    const m = map[key] || { text: key, cls: 'pill-gray' };
    if (m.dash) return '<span class="muted">--</span>';
    return '<span class="pill ' + m.cls + '"><span class="dot"></span>' + esc(m.text) + '</span>';
  };

  function isBestCheckoutOrder(o) {
    return Boolean(o && o.source === 'BestCheckout');
  }

  // BestCheckout lists only successful payments from its own checkout. Native
  // Shopify orders, unpaid checkouts, and abandoned checkouts stay in Shopify.
  function paidBestCheckoutOrders() {
    return (D.ORDERS || []).filter((o) => isBestCheckoutOrder(o) && o.payment_status === 'paid');
  }

  function shopifySyncState(o) {
    if (!isBestCheckoutOrder(o)) return { key: 'shopify_order', detail: 'This order was created in Shopify.' };
    if (o.shopify_writeback_status === 'synced') return { key: 'in_shopify', detail: 'This order is in Shopify and can follow your usual fulfillment process.' };
    if (o.shopify_writeback_status === 'pending') return { key: 'sending', detail: 'This paid order is being sent to Shopify. Fulfillment starts after it appears there.' };
    if (o.shopify_writeback_status === 'failed') return { key: 'attention', detail: 'Shopify could not create this order. Check the connection, then try again.' };
    return { key: 'after_payment', detail: 'This order will be sent to Shopify after payment.' };
  }

  function orderSourceDetail(o) {
    return isBestCheckoutOrder(o) ? '<span>BestCheckout</span><span class="muted" style="margin-left:6px;font-size:12px">Purchase flow</span>' : '<span>Shopify checkout</span>';
  }

  function shopifySyncPill(o) {
    const state = shopifySyncState(o);
    return pill(SHOPIFY_SYNC_STATUS, state.key);
  }

  function shopifySyncCell(o) {
    const state = shopifySyncState(o);
    const id = o.shopify_order_id ? '<span class="shopify-status-id">' + esc(o.shopify_order_id) + '</span>' : '';
    const shopifyUrl = state.key === 'in_shopify' ? shopifyAdminOrderUrl(o) : '';
    const openInShopify = shopifyUrl ? '<a class="shopify-inline-action shopify-admin-link" href="' + esc(shopifyUrl) + '" target="_blank" rel="noreferrer">View in Shopify</a>' : '';
    const review = state.key === 'attention' ? '<button class="shopify-inline-action" type="button" data-review-shopify="' + esc(o.order_id) + '">Review sync</button>' : '';
    return '<div class="shopify-status-cell"><div class="flex items-center gap-2" style="white-space:nowrap">' + shopifySyncPill(o) + id + '</div>' + (openInShopify || review) + '</div>';
  }

  // ---- count rows per tab (for tab badges) ----
  // tab badges reflect the active search/total filter (mirrors the live admin), excluding the tab itself
  function matchesTab(o, key) {
    if (key === 'paid') return true;
    if (key === 'syncing') return shopifySyncState(o).key === 'sending';
    if (key === 'attention') return shopifySyncState(o).key === 'attention';
    return false;
  }
  const tabCount = (key) => nonTabFiltered().filter((o) => matchesTab(o, key)).length;

  // ================= LIST VIEW =================
  const LST = {
    tab: 'paid', kwType: 'order_sn', kw: '', kwApplied: '',
    timeType: 'create_date', dateStart: '', dateEnd: '',
    totalMin: '', totalMax: '', totalApplied: false,
    page: 1, size: 20,
  };

  // everything EXCEPT the status-tab filter (so tab badges can count this set)
  function nonTabFiltered() {
    let rows = paidBestCheckoutOrders();
    if (LST.kwApplied) {
      const q = LST.kwApplied.toLowerCase();
      rows = rows.filter((o) => {
        switch (LST.kwType) {
          case 'order_sn': return o.order_sn.toLowerCase().includes(q);
          case 'receiver': return (o.shipping.name || '').toLowerCase().includes(q);
          case 'email': return (o.shipping.email || '').toLowerCase().includes(q);
          case 'phone': return (o.shipping.phone || '').toLowerCase().includes(q);
          case 'country': return (o.shipping.country || '').toLowerCase().includes(q);
          case 'nickname': return (o.user.nickname || '').toLowerCase().includes(q);
          default: return JSON.stringify(o).toLowerCase().includes(q);
        }
      });
    }
    if (LST.totalApplied) {
      const lo = LST.totalMin === '' ? -Infinity : Number(LST.totalMin);
      const hi = LST.totalMax === '' ? Infinity : Number(LST.totalMax);
      rows = rows.filter((o) => o.total >= lo && o.total <= hi);
    }
    return rows;
  }

  function filteredRows() {
    let rows = nonTabFiltered();
    rows = rows.filter((o) => matchesTab(o, LST.tab));
    return rows;
  }

  function shipName(o) {
    const s = o.shipping || {};
    return [s.first_name, s.last_name].filter(Boolean).join(' ') || s.name || '--';
  }

  function renderList() {
    LST.page = LST.page || 1;
    const rows = filteredRows();
    const totalRecords = rows.length;
    const pages = Math.max(1, Math.ceil(totalRecords / LST.size));
    if (LST.page > pages) LST.page = pages;
    const start = (LST.page - 1) * LST.size;
    const pageRows = rows.slice(start, start + LST.size);

    const kwOpts = D.KEYWORD_OPTIONS.map((o) => '<option value="' + o.value + '"' + (o.value === LST.kwType ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
    const timeOpts = D.TIME_OPTIONS.map((o) => '<option value="' + o.value + '"' + (o.value === LST.timeType ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');

    const tabsHtml = D.TABS.map((t) =>
      '<div class="tab' + (t.key === LST.tab ? ' active' : '') + '" data-tab="' + t.key + '">' + esc(t.label) +
      '<span class="count-badge">' + tabCount(t.key) + '</span></div>').join('');

    // filter tags row (active keyword / date / total) — mirrors search.tsx blue Tags
    const tags = [];
    if (LST.kwApplied) {
      const lbl = (D.KEYWORD_OPTIONS.find((o) => o.value === LST.kwType) || {}).label || '';
      tags.push('<span class="field-pill" data-clear="kw">' + esc(lbl) + ': ' + esc(LST.kwApplied) + ' <span class="x">&times;</span></span>');
    }
    if (LST.dateStart && LST.dateEnd) {
      const lbl = (D.TIME_OPTIONS.find((o) => o.value === LST.timeType) || {}).label || '';
      tags.push('<span class="field-pill" data-clear="date">' + esc(lbl) + ': ' + esc(LST.dateStart) + ' ~ ' + esc(LST.dateEnd) + ' <span class="x">&times;</span></span>');
    }
    if (LST.totalApplied) {
      const txt = (LST.totalMin !== '' ? money(LST.totalMin) : 'Min') + ' – ' + (LST.totalMax !== '' ? money(LST.totalMax) : 'Max');
      tags.push('<span class="field-pill" data-clear="total">Total range: ' + esc(txt) + ' <span class="x">&times;</span></span>');
    }

    const totalChipText = LST.totalApplied
      ? ((LST.totalMin !== '' ? money(LST.totalMin) : 'Min') + ' – ' + (LST.totalMax !== '' ? money(LST.totalMax) : 'Max'))
      : 'Total range';

    root.innerHTML =
      '<div class="orders-page-head">' +
        '<h1 class="page-title">Orders</h1>' +
        '<p class="orders-page-subtitle">Paid BestCheckout orders are automatically created in Shopify. Fulfillment and refunds are managed there.</p>' +
      '</div>' +
      '<div class="panel">' +
        '<div class="tabs" style="padding:0 8px" id="ord-tabs">' + tabsHtml + '</div>' +
        // filter bar (search.tsx: keyword group / time group / total-range chip)
        '<div class="card-pad" style="padding-bottom:8px">' +
          '<div class="flex items-start gap-2" style="flex-wrap:wrap">' +
            '<div class="flex" style="min-width:428px">' +
              '<select class="filter-select" id="kw-type" style="width:160px;border-top-right-radius:0;border-bottom-right-radius:0">' + kwOpts + '</select>' +
              '<div style="position:relative;flex:1">' +
                '<input class="filter-input" id="kw-input" placeholder="Search" value="' + esc(LST.kw) + '" style="width:100%;padding-left:12px;padding-right:52px;border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px" />' +
                '<span class="kw-clear" data-kw-clear title="Clear">&times;</span>' +
                '<span style="position:absolute;right:10px;top:9px;color:var(--ink-muted)">' + I.search + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="flex" style="min-width:428px">' +
              '<select class="filter-select" id="time-type" style="width:160px;border-top-right-radius:0;border-bottom-right-radius:0">' + timeOpts + '</select>' +
              // dual-month English range picker (widgets.js) — hidden inputs keep ids so wireList reads them
              '<div class="ui-range filter-input" data-ui-range style="width:268px;border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px;padding-left:12px;padding-right:10px">' +
                '<input type="hidden" id="date-start" data-range="start" value="' + esc(LST.dateStart) + '" />' +
                '<input type="hidden" id="date-end" data-range="end" value="' + esc(LST.dateEnd) + '" />' +
              '</div>' +
            '</div>' +
            '<div class="sel-trigger" id="total-chip" style="width:240px">' +
              '<span class="' + (LST.totalApplied ? '' : 'muted') + '">' + esc(totalChipText) + '</span>' + I.chevDown +
            '</div>' +
          '</div>' +
          (tags.length ? '<div class="flex gap-2 mt-3" style="flex-wrap:wrap" id="filter-tags">' + tags.join('') + '</div>' : '') +
        '</div>' +
        // table (table.tsx columns + leading row-selection checkbox)
        '<div style="overflow-x:auto">' +
        '<table class="tbl" style="min-width:1040px">' +
          '<thead><tr>' +
            '<th style="width:48px;text-align:center"><input type="checkbox" class="ord-check-all" /></th>' +
            '<th>Order number</th><th>Order date</th><th>User</th><th>Shipping address</th>' +
            '<th>Total</th><th data-tip="Shows whether this paid BestCheckout order has been created in Shopify.">Shopify sync status</th>' +
            '<th>Payment method</th><th style="text-align:center">Action</th>' +
          '</tr></thead>' +
          '<tbody id="ord-tbody">' +
            (pageRows.length ? pageRows.map(rowHtml).join('')
              : '<tr><td colspan="9" style="text-align:center;padding:40px" class="muted">No orders match these filters.</td></tr>') +
          '</tbody>' +
        '</table>' +
        '</div>' +
        // pagination footer (table.tsx: "Total N records" + Ant Pagination)
        '<div class="flex items-center justify-between card-pad">' +
          '<span class="muted" style="font-size:13px">Total ' + totalRecords + ' records</span>' +
          pagerHtml(LST.page, pages) +
        '</div>' +
      '</div>';

    wireList();
    if (window.I18N) window.I18N.apply(root);
  }

  // Inline source tags under the order number: keep the list compact; contract/cycle details live in the detail page.
  // The Subscription tag describes the selected purchase option, not the existence of a contract.
  function hasSubscriptionPurchase(o) {
    return Boolean(o && (o.has_subscription || o.sub || (o.items || []).some((item) => item && item.subLine)));
  }

  function orderTags(o) {
    const tag = (txt, bg, fg) => '<span style="display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;line-height:1;padding:3px 6px;border-radius:4px;background:' + bg + ';color:' + fg + '">' + txt + '</span>';
    let out = '';
    if (hasSubscriptionPurchase(o)) out += tag('Subscription', '#e6f0ff', '#1d6fe0');
    if (o.bundle) out += tag('Bundle', '#eef0f4', '#525a6b');
    return out ? '<div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap;font-weight:400">' + out + '</div>' : '';
  }

  function rowHtml(o) {
    return '<tr data-id="' + o.order_id + '">' +
      '<td style="text-align:center"><input type="checkbox" class="ord-check" data-id="' + o.order_id + '" /></td>' +
      '<td style="font-weight:600;color:var(--brand)"><span style="white-space:nowrap">' + esc(o.order_sn) + '</span>' + orderTags(o) + '</td>' +
      '<td class="muted">' + esc(o.create_time) + '</td>' +
      '<td>' + esc(o.user.nickname) + '</td>' +
      // shipping address: name + chevron, click opens full-address popover (table.tsx Popover)
      '<td style="max-width:200px">' +
        '<span class="ship-cell" data-ship="' + o.order_id + '" style="display:inline-flex;align-items:center;gap:4px;max-width:100%;cursor:pointer">' +
          '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(shipName(o)) + '</span>' +
          '<span class="muted" style="display:inline-flex">' + I.chevDown + '</span>' +
        '</span>' +
      '</td>' +
      '<td style="font-weight:600;color:var(--ink)">' + money(o.total) + '</td>' +
      '<td>' + shopifySyncCell(o) + '</td>' +
      '<td class="muted">' + esc(o.payment_method) + '</td>' +
      '<td style="text-align:center"><button class="back-btn" data-view="' + o.order_id + '" title="BestCheckout details" aria-label="BestCheckout details" style="width:30px;height:30px">' + I.eye + '</button></td>' +
    '</tr>';
  }

  function pagerHtml(page, pages) {
    const item = (label, p, opts) => {
      opts = opts || {};
      const cls = 'pg-item' + (opts.active ? ' active' : '') + (opts.disabled ? ' disabled' : '');
      return '<span class="' + cls + '"' + (opts.disabled ? '' : ' data-page="' + p + '"') + '>' + label + '</span>';
    };
    let nums = '';
    for (let p = 1; p <= pages; p++) nums += item(String(p), p, { active: p === page });
    return '<div class="pg">' +
      item('‹', page - 1, { disabled: page <= 1 }) + nums + item('›', page + 1, { disabled: page >= pages }) +
      '<select class="pg-size" id="pg-size">' +
        ['20', '50', '100'].map((s) => '<option value="' + s + '"' + (Number(s) === LST.size ? ' selected' : '') + '>' + s + ' / page</option>').join('') +
      '</select>' +
    '</div>';
  }

  function wireList() {
    root.querySelectorAll('#ord-tabs .tab').forEach((t) => t.onclick = () => { LST.tab = t.getAttribute('data-tab'); LST.page = 1; renderList(); });
    const kwType = root.querySelector('#kw-type');
    const kwInput = root.querySelector('#kw-input');
    if (kwType) kwType.onchange = () => { LST.kwType = kwType.value; };
    if (kwInput) {
      kwInput.oninput = () => { LST.kw = kwInput.value; };
      const commit = () => { LST.kwApplied = (LST.kw || '').trim(); LST.page = 1; renderList(); };
      kwInput.onkeydown = (e) => { if (e.key === 'Enter') commit(); };
      kwInput.onblur = commit;
    }
    const kwClear = root.querySelector('[data-kw-clear]');
    if (kwClear) kwClear.onclick = () => { LST.kw = ''; LST.kwApplied = ''; LST.page = 1; renderList(); };
    const timeType = root.querySelector('#time-type');
    if (timeType) timeType.onchange = () => { LST.timeType = timeType.value; };
    const ds = root.querySelector('#date-start'), de = root.querySelector('#date-end');
    // range picker writes both hidden inputs then fires change on #date-end only -> one re-render
    const applyDates = () => { LST.dateStart = ds ? ds.value : ''; LST.dateEnd = de ? de.value : ''; LST.page = 1; renderList(); };
    if (ds) ds.onchange = applyDates;
    if (de) de.onchange = applyDates;
    const chip = root.querySelector('#total-chip');
    if (chip) chip.onclick = () => openTotalPopover(chip);
    root.querySelectorAll('#filter-tags [data-clear]').forEach((tg) => tg.onclick = () => {
      const k = tg.getAttribute('data-clear');
      if (k === 'kw') { LST.kw = ''; LST.kwApplied = ''; }
      if (k === 'date') { LST.dateStart = ''; LST.dateEnd = ''; }
      if (k === 'total') { LST.totalApplied = false; LST.totalMin = ''; LST.totalMax = ''; }
      LST.page = 1; renderList();
    });
    const ps = root.querySelector('#pg-size');
    if (ps) ps.onchange = () => { LST.size = Number(ps.value); LST.page = 1; renderList(); };
    root.querySelectorAll('.pg-item[data-page]').forEach((el) => el.onclick = () => { LST.page = Number(el.getAttribute('data-page')); renderList(); });
    const attention = root.querySelector('[data-shopify-attention]');
    if (attention) attention.onclick = () => goDetail(attention.getAttribute('data-shopify-attention'));
    root.querySelectorAll('[data-review-shopify]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); goDetail(b.getAttribute('data-review-shopify')); });
    root.querySelectorAll('.shopify-admin-link').forEach((link) => link.onclick = (e) => { e.stopPropagation(); });
    // row click -> detail (but not when clicking checkbox / ship popover / view button)
    root.querySelectorAll('#ord-tbody tr[data-id]').forEach((tr) => tr.onclick = (e) => {
      if (e.target.closest('.ord-check') || e.target.closest('.ship-cell') || e.target.closest('[data-view]') || e.target.closest('[data-review-shopify]')) return;
      goDetail(tr.getAttribute('data-id'));
    });
    root.querySelectorAll('[data-view]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); goDetail(b.getAttribute('data-view')); });
    // shipping-address popover
    root.querySelectorAll('.ship-cell').forEach((c) => c.onclick = (e) => { e.stopPropagation(); openShipPopover(c, c.getAttribute('data-ship')); });
    // select-all checkbox (visual only)
    const all = root.querySelector('.ord-check-all');
    if (all) all.onchange = () => { root.querySelectorAll('.ord-check').forEach((c) => { c.checked = all.checked; }); };
  }

  // shipping-address popover (table.tsx renderShippingAddressDetail)
  function openShipPopover(anchor, id) {
    closePops();
    const o = D.ORDERS.find((r) => String(r.order_id) === String(id));
    if (!o) return;
    const s = o.shipping || {};
    const lines = [];
    if (s.detail) lines.push(esc(s.detail));
    if (s.detail2) lines.push(esc(s.detail2));
    const cityLine = [s.city, s.province, s.post_code].filter(Boolean).map(esc).join(' ');
    if (cityLine) lines.push(cityLine);
    if (s.country) lines.push(esc(s.country));
    if (s.email) lines.push(esc(s.email));
    if (s.phone) lines.push('+' + esc(s.phone_code) + ' ' + esc(s.phone));
    const layer = h('<div class="pop-layer"></div>');
    const pop = h('<div class="menu-pop" style="position:fixed;min-width:300px;max-width:420px;padding:14px;line-height:1.9"></div>');
    pop.innerHTML = '<div style="font-weight:600;color:var(--ink)">' + esc(shipName(o)) + '</div>' +
      lines.map((l) => '<div class="subtle" style="font-size:13px">' + l + '</div>').join('');
    layer.appendChild(pop); document.body.appendChild(layer);
    const r = anchor.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = r.left + 'px';
    setTimeout(() => document.addEventListener('mousedown', function hh(e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) { closePops(); document.removeEventListener('mousedown', hh); } }), 0);
  }

  function openTotalPopover(anchor) {
    closePops();
    const layer = h('<div class="pop-layer"></div>');
    const pop = h('<div class="menu-pop" style="position:fixed;min-width:260px;padding:14px"></div>');
    pop.innerHTML =
      '<div class="ctrl-label" style="margin-bottom:8px">Total range</div>' +
      '<div class="flex items-center gap-2">' +
        '<input class="input" id="tr-min" placeholder="Min" type="number" value="' + esc(LST.totalMin) + '" style="width:96px" />' +
        '<span class="muted">to</span>' +
        '<input class="input" id="tr-max" placeholder="Max" type="number" value="' + esc(LST.totalMax) + '" style="width:96px" />' +
      '</div>' +
      '<div class="flex justify-end gap-2 mt-3">' +
        '<button class="btn btn-default" data-x>Clear</button>' +
        '<button class="btn btn-primary" data-apply>Apply</button>' +
      '</div>';
    layer.appendChild(pop); document.body.appendChild(layer);
    const r = anchor.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = r.left + 'px';
    pop.querySelector('[data-apply]').onclick = () => {
      LST.totalMin = pop.querySelector('#tr-min').value;
      LST.totalMax = pop.querySelector('#tr-max').value;
      LST.totalApplied = LST.totalMin !== '' || LST.totalMax !== '';
      LST.page = 1; closePops(); renderList();
    };
    pop.querySelector('[data-x]').onclick = () => { LST.totalApplied = false; LST.totalMin = ''; LST.totalMax = ''; LST.page = 1; closePops(); renderList(); };
    setTimeout(() => document.addEventListener('mousedown', function hh(e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) { closePops(); document.removeEventListener('mousedown', hh); } }), 0);
  }
  const closePops = () => document.querySelectorAll('.pop-layer').forEach((p) => p.remove());

  // ================= DETAIL VIEW =================
  function subscriptionScheduleLabel(contract) {
    const plan = String((contract && contract.plan) || '').toLowerCase();
    return (plan.includes('bimonthly') || plan.includes('every 2 months')) ? 'Delivery every 2 months' : 'Delivery every 1 month';
  }

  function subscriptionShipping(contract) {
    const parts = String((contract && contract.address) || '').split(',').map((x) => x.trim()).filter(Boolean);
    const name = String((contract && contract.customer) || '').trim().split(/\s+/).filter(Boolean);
    const stateZip = parts.length > 1 ? parts[parts.length - 2] : '';
    const stateMatch = stateZip.match(/^(.*?)\s+(\S+)$/);
    return {
      first_name: name.length > 1 ? name.slice(0, -1).join(' ') : (name[0] || ''),
      last_name: name.length > 1 ? name[name.length - 1] : '',
      detail: parts[0] || '',
      detail2: parts.length > 4 ? parts[1] : '',
      city: parts.length > 2 ? parts[parts.length - 3] : '',
      province: stateMatch ? stateMatch[1] : stateZip,
      post_code: stateMatch ? stateMatch[2] : '',
      country: parts.length ? parts[parts.length - 1] : '',
      phone_code: '', phone: '', email: (contract && contract.email) || '',
    };
  }

  function subscriptionItemImage(product) {
    const label = String(product || 'S').split(/\s+/).slice(0, 1).join('').slice(0, 1).toUpperCase() || 'S';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" rx="6" fill="#e6f0ff"/><text x="22" y="27" font-family="Arial" font-size="13" font-weight="600" fill="#1d4ed8" text-anchor="middle">' + label + '</text></svg>');
  }

  // Subscription history owns the billing record. It becomes a normal order-detail snapshot when opened from a contract.
  function subscriptionOrderDetail(orderSn) {
    const subs = window.DATA_SUBS;
    if (!subs || !Array.isArray(subs.contracts)) return null;
    const sn = String(orderSn || '');
    let contract = null;
    let charge = null;
    for (let i = 0; i < subs.contracts.length; i++) {
      const found = (subs.contracts[i].history || []).find((row) => String(row.id) === sn);
      if (found) { contract = subs.contracts[i]; charge = found; break; }
    }
    if (!contract || !charge) return null;
    const ledger = (subs.orders || []).find((row) => String(row.id) === sn && String(row.contract) === String(contract.id));
    const chargeStatus = (ledger && ledger.status) || charge.status || 'paid';
    const isPaid = chargeStatus === 'paid' || chargeStatus === 'refunded';
    const orderStatus = chargeStatus === 'paid' ? 'shipped' : (chargeStatus === 'refunded' ? 'refund' : 'to_pay');
    const qty = Math.max(1, Number(contract.qty) || 1);
    const amount = Number(charge.amount != null ? charge.amount : contract.amount) || 0;
    const date = charge.date || contract.startedAt || '';
    const userId = Number((String(contract.id).match(/\d+/) || ['0'])[0]);
    const shipping = subscriptionShipping(contract);
    const paymentEvent = isPaid ? 'Recurring payment captured' : (chargeStatus === 'retrying' ? 'Recurring payment retry scheduled' : 'Recurring payment failed');
    return {
      order_id: 'subscription-' + sn,
      order_sn: sn,
      status: orderStatus,
      paid: isPaid ? 1 : 0,
      order_type: 0,
      payment_status: isPaid ? 'paid' : 'unpaid',
      verify_code: '',
      create_time: date ? date + ' 09:00' : '',
      pay_time: isPaid && date ? date + ' 09:01' : null,
      payment_method: contract.method || '--',
      delivery_name: '', delivery_id: '',
      user: { nickname: contract.customer || 'Customer', uid: userId },
      shipping,
      note: 'Recurring charge from ' + contract.id + '.',
      sub: { id: contract.id, cycle: charge.cycle || contract.cyclesDone || 1, next: contract.next || '', deliveryLabel: subscriptionScheduleLabel(contract) },
      total_num: qty, subtotal: amount, shipping_fee: 0, total: amount, paid_amount: isPaid ? amount : 0,
      order_discounts: [], shipping_discounts: [], total_savings: 0,
      items: [{ title: contract.product, sku: contract.plan, image: subscriptionItemImage(contract.product), unit_price: amount / qty, qty, line_total: amount, product_price: amount, discounts: [], subLine: true, subLabel: subscriptionScheduleLabel(contract) }],
      timeline: [
        { label: 'Order created from ' + contract.id + ' (cycle ' + (charge.cycle || contract.cyclesDone || 1) + ')', time: date ? date + ' 09:00' : '--' },
        { label: paymentEvent + ' via ' + (contract.method || 'gateway'), time: date ? date + ' 09:01' : '--' },
      ],
    };
  }

  function renderDetail(id) {
    const listOrder = (D.ORDERS || []).find((row) => String(row.order_id) === String(id) || String(row.order_sn) === String(id));
    if (listOrder && !isBestCheckoutOrder(listOrder)) { renderMissing(id); return; }
    const stored = D.DETAILS[id] || D.DETAILS[Number(id)];
    const byOrderNumber = stored ? null : Object.keys(D.DETAILS).map((key) => D.DETAILS[key]).find((row) => String(row.order_sn) === String(id));
    const o = stored || byOrderNumber || subscriptionOrderDetail(id);
    if (!o) { renderMissing(id); return; }

    root.innerHTML =
      '<div class="detail-wrap">' +
        // BestCheckout owns the payment record; Shopify owns post-payment fulfillment.
        '<div class="flex items-center justify-between mb-4">' +
          '<div class="flex items-center gap-3">' +
            '<button class="back-btn" data-act="back" title="Back">' + I.arrowLeft + '</button>' +
            '<div class="flex items-center gap-2" style="flex-wrap:wrap">' +
              '<span class="page-title">' + esc(o.order_sn) + '</span>' +
              '<button class="back-btn" data-act="copy" title="Copy" style="width:30px;height:30px;background:transparent">' + I.copy + '</button>' +
              '<span class="pill pill-blue"><span class="dot"></span>BestCheckout</span>' + shopifySyncPill(o) +
            '</div>' +
          '</div>' +
        '</div>' +
        // two-column body (main + 275px rail) — detial.tsx layout
        '<div class="detail-cols">' +
          '<div class="detail-main">' +
            productsCard(o) +
            amountCard(o) +
            shippingAddressCard(o) +
            integrationCard(o) +
            timelineCard(o) +
          '</div>' +
          '<div class="detail-rail">' +
            notesCard(o) +
            customerCard(o) +
          '</div>' +
        '</div>' +
      '</div>';

    wireDetail(o);
    if (window.I18N) window.I18N.apply(root);
  }

  function cardOpen(titleHtml, rightHtml) {
    return '<div class="panel card-pad mb-4">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<div class="card-title flex items-center gap-2">' + titleHtml + '</div>' +
        (rightHtml || '') +
      '</div>';
  }

  // ---- Products card: flat ant List (ProductsCard.tsx) — title + SKU + discount tags ----
  function productsCard(o) {
    const items = o.items || [];
    const blocks = [];
    let i = 0;
    while (i < items.length) {
      if (items[i].bundle) {   // group a consecutive run of the same bundle's components into one block
        const name = items[i].bundle; const grp = [];
        while (i < items.length && items[i].bundle === name) { grp.push(items[i]); i++; }
        blocks.push(bundleGroupHtml(name, grp, bundleSubscription(grp, o.sub)));
      } else {
        // Every top-level item owns its own frame. Only bundle components share a container.
        blocks.push('<div style="border:1px solid var(--hair);border-radius:10px;padding:0 16px">' + itemRowHtml(items[i], false, itemSubscription(items[i], o.sub)) + '</div>');
        i++;
      }
    }
    return cardOpen('<span>Product</span>') + blocks.join('<div style="height:12px"></div>') + '</div>';
  }
  // A mixed order can create more than one subscription contract. Keep the snapshot on the item
  // where available while retaining the order-level field for older mock records.
  function itemSubscription(it, fallbackSub) {
    return it && it.subscription ? it.subscription : (it && it.subLine ? fallbackSub : null);
  }
  function bundleSubscription(group, fallbackSub) {
    const scoped = group.find((it) => it && it.subscription);
    return scoped ? scoped.subscription : (group.some((it) => it && it.subLine) ? fallbackSub : null);
  }
  function subscriptionContractReference(sub) {
    if (!sub || !sub.id) return '';
    return '<span aria-hidden="true" class="muted">&middot;</span>' +
      '<a href="#/subscriptions/contracts/' + encodeURIComponent(sub.id) + '" style="color:var(--brand);font-weight:500;text-decoration:none">' + esc(sub.id) + '</a>';
  }
  function subscriptionDiscountLabel(discount) {
    const label = String((discount && discount.name) || '').trim();
    return /^delivery every\b/i.test(label) ? 'Subscription discount' : (label || 'Subscription discount');
  }
  // One product line row. Subscription products use the same metadata hierarchy as bundle subscriptions.
  function itemRowHtml(it, topBorder, sub) {
    const discounts = it.discounts || [];
    const hasDisc = discounts.length > 0;
    // Explicit types support lines with both discounts. Names retain compatibility with older mock data.
    const discountType = (d) => {
      const type = String(d.type || '').toLowerCase();
      if (type === 'subscription' || type === 'product' || type === 'bundle') return type;
      const name = String(d.name || '');
      if (/^bundle discount\b/i.test(name)) return 'bundle';
      if (/^(subscription discount|delivery every\b)/i.test(name)) return 'subscription';
      if (/^product discount\b/i.test(name)) return 'product';
      return it.subLine ? 'subscription' : 'product';
    };
    const productDiscounts = discounts.filter((d) => discountType(d) === 'product');
    const subscriptionDiscounts = it.subLine ? discounts.filter((d) => discountType(d) === 'subscription') : [];
    const variantHtml = it.sku ?
      '<div class="muted" style="font-size:12px">' + esc(variantText(it.sku)) + '</div>' : '';
    const disc = productDiscounts.map((d) =>
      '<div class="flex items-center gap-1 mt-1" style="font-size:12px;color:#8B8B8B">' + I.tag +
      '<span>' + esc(d.name) + ' (-' + money(d.amount) + ')</span></div>').join('');
    const delivery = sub && sub.deliveryLabel ? String(sub.deliveryLabel).replace(/\s*\([^)]*\)\s*$/, '') : (it.subLabel || 'Delivery schedule');
    const subMeta = it.subLine && sub ?
      '<div style="grid-column:1 / -1;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-top:2px;font-size:12px;color:var(--ink-body);line-height:1.45">' +
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:var(--brand-50);color:var(--brand);flex:none">' + I.recurring + '</span>' +
        '<span style="font-weight:600;color:var(--ink)">Subscription</span><span aria-hidden="true" class="muted">&middot;</span>' +
        '<span>' + esc(delivery) + '</span>' + subscriptionContractReference(sub) +
      '</div>' : '';
    const subDiscounts = subscriptionDiscounts.length ?
      '<div style="grid-column:1 / -1;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-bottom:2px">' + subscriptionDiscounts.map((d) =>
        '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-muted);line-height:1.45"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none">' + I.tag + '</span><span>' + esc(subscriptionDiscountLabel(d)) + ' (-' + money(d.amount) + ')</span></span>').join('') +
      '</div>' : '';
    return '<div style="display:grid;grid-template-columns:minmax(0,1fr) 44px 104px;gap:14px;align-items:flex-start;padding:14px 0' +
        (topBorder ? ';border-top:1px solid var(--hair)' : '') + '">' +
      '<div class="flex items-center gap-3" style="min-width:0">' +
        '<img src="' + it.image + '" alt="" style="width:40px;height:40px;border-radius:6px;flex:none" />' +
        '<div style="min-width:0">' +
          '<div style="font-weight:500;font-size:13.5px;color:var(--ink);line-height:1.35">' + esc(it.title) + '</div>' +
          variantHtml +
          disc +
        '</div>' +
      '</div>' +
      '<div class="muted" style="font-size:13px;text-align:right;white-space:nowrap;padding-top:2px">x ' + it.qty + '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;min-width:0;text-align:right;font-variant-numeric:tabular-nums;font-size:13px;font-weight:500;color:var(--ink-body);line-height:1.35;white-space:nowrap">' +
        '<div>' + money(it.product_price) + '</div>' +
        (hasDisc ? '<div class="muted" style="text-decoration:line-through">' + money(it.line_total) + '</div>' : '') +
      '</div>' +
      subMeta + subDiscounts +
    '</div>';
  }
  // Recurring-order strip at the top of the Product card — links back to the contract.
  function subOrderStrip(sub) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 12px;background:#eef4ff;border:1px solid #d6e4ff;border-radius:8px;margin-bottom:12px;font-size:12.5px">' +
      '<span style="color:#1d4ed8"><b>Recurring order</b> · from ' + esc(sub.id) + ' · cycle ' + sub.cycle + (sub.next ? ' · next charge ' + esc(sub.next) : '') + '</span>' +
      '<a href="#/subscriptions/contracts/' + esc(sub.id) + '" style="color:#1d4ed8;font-weight:600;white-space:nowrap;text-decoration:none">View contract →</a>' +
    '</div>';
  }
  // Bundle group block — component SKUs (+ gifts) under one header with a subtotal.
  function bundleGroupHtml(name, group, sub) {
    const compareTotal = group.reduce((s, it) => s + (Number(it.line_total) || 0), 0);
    const paidTotal = group.reduce((s, it) => s + (Number(it.product_price) || 0), 0);
    const hasSub = group.some((it) => it.subLine);
    const meta = (group.find((it) => it.bundleMeta) || {}).bundleMeta || {};
    const discountLines = [];
    if (meta.bundleDiscount) discountLines.push(meta.bundleDiscount);
    if (meta.subscriptionLabel) discountLines.push(meta.subscriptionLabel);
    if (!discountLines.length) {
      group.forEach((it) => (it.discounts || []).forEach((d) => discountLines.push(esc(d.name) + ' (-' + money(d.amount) + ')')));
    }

    const displayDiscount = (txt) => {
      const text = String(txt || '');
      if (/^Delivery every /i.test(text)) {
        const amount = text.match(/\([^)]*\)\s*$/);
        return 'Subscription discount' + (amount ? ' ' + amount[0] : '');
      }
      return text;
    };
    const liveSeen = {};
    const liveDiscountHtml = discountLines.filter((txt) => {
      const key = String(txt);
      if (liveSeen[key]) return false;
      liveSeen[key] = true;
      return true;
    }).map((txt) =>
      '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-muted);line-height:1.45"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none">' + I.tag + '</span><span>' + esc(displayDiscount(txt)) + '</span></span>').join('');
    const delivery = sub && sub.deliveryLabel ? String(sub.deliveryLabel).replace(/\s*\([^)]*\)\s*$/, '') : '';
    const subHtml = hasSub && sub ?
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:0 14px 10px;font-size:12px;color:var(--ink-body);line-height:1.45">' +
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:var(--brand-50);color:var(--brand);flex:none">' + I.recurring + '</span>' +
        '<span style="font-weight:600;color:var(--ink)">Subscription</span><span aria-hidden="true" class="muted">&middot;</span>' +
        '<span>' + esc(delivery || 'Delivery schedule') + '</span>' + subscriptionContractReference(sub) +
      '</div>' : '';
    const bundleRows = group.map((it, gi) =>
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:12px;align-items:start;padding:12px 14px' + (gi > 0 ? ';border-top:1px solid var(--hair)' : '') + '">' +
        '<div class="flex items-start gap-3" style="min-width:0">' +
          '<img src="' + it.image + '" alt="" style="width:40px;height:40px;border-radius:6px;flex:none" />' +
          '<div style="min-width:0"><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;line-height:1.35">' +
            (it.gift
              ? '<span style="display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;color:#16794a;background:#e8f7ee;border-radius:3px;padding:3px 6px">Free</span>'
              : '<span style="display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;color:#9a6400;background:#fff4de;border-radius:3px;padding:3px 6px">Included</span>') +
            '<span style="font-weight:500;font-size:13px;color:var(--ink)">' + esc(it.title) + '</span></div>' +
            '<div class="muted" style="font-size:12px;margin-top:3px">' + esc(variantText(it.sku)) + '</div></div>' +
        '</div>' +
        '<div class="muted" style="font-size:13px;text-align:right;padding-top:4px;white-space:nowrap">x ' + it.qty + '</div>' +
      '</div>').join('');
    return '<div style="border:1px solid var(--hair);border-radius:8px;overflow:hidden;background:#fff">' +
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) 104px;gap:14px;align-items:start;padding:14px">' +
        '<div style="display:flex;align-items:center;gap:9px;min-width:0"><span style="display:inline-flex;align-items:center;font-size:11px;font-weight:600;color:#9a6400;background:#fff4de;border-radius:3px;padding:4px 7px;flex:none">Bundle</span><span style="font-weight:500;font-size:13.5px;color:var(--ink);min-width:0;word-break:break-word">' + esc(name) + '</span></div>' +
        '<div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;text-align:right;white-space:nowrap">' +
          (compareTotal > paidTotal + 0.001 ? '<span class="muted" style="font-size:12px;text-decoration:line-through">' + money(compareTotal) + '</span>' : '') +
          '<span style="font-weight:600;font-size:13.5px;color:var(--ink)">' + money(paidTotal) + '</span>' +
        '</div>' +
      '</div>' +
      subHtml +
      (liveDiscountHtml ? '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:0 14px 10px">' + liveDiscountHtml + '</div>' : '') +
      '<div style="border-top:1px solid var(--hair)">' + bundleRows + '</div>' +
    '</div>';
    const seen = {};
    const discountHtml = discountLines.filter((txt) => {
      const key = String(txt);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).map((txt) =>
      '<div class="flex items-center gap-1" style="font-size:12px;color:#8B8B8B;line-height:1.45">' + I.tag + '<span>' + esc(txt) + '</span></div>').join('');
    const rows = group.map((it, gi) =>
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) 90px 70px;gap:12px;align-items:center;padding:9px 0' + (gi > 0 ? ';border-top:1px solid var(--hair)' : '') + '">' +
        '<div class="flex items-center gap-3" style="min-width:0">' +
          '<img src="' + it.image + '" alt="" style="width:34px;height:34px;border-radius:6px;flex:none" />' +
          '<div style="min-width:0"><div style="font-weight:500;font-size:13px;color:var(--ink)">' + esc(it.title) + (it.gift ? ' <span style="color:#1f8f4e;font-size:10.5px;font-weight:700">FREE GIFT</span>' : '') + '</div>' +
            '<div class="muted" style="font-size:12px">' + esc(variantText(it.sku)) + '</div></div>' +
        '</div>' +
        '<div class="muted" style="font-size:13px">x ' + it.qty + '</div>' +
        '<div style="font-size:13px;font-weight:500;color:var(--ink-body)">' + (it.gift ? '<span style="color:#1f8f4e">Free</span>' : money(it.product_price)) + '</div>' +
      '</div>').join('');
    return '<div style="border:1.5px solid #d6e4ff;border-radius:10px;overflow:hidden">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;background:#eef4ff">' +
        '<span style="font-weight:600;font-size:13px;color:#1d4ed8">' + esc(name) + ' <span style="font-weight:700;font-size:10px;background:#dbe7ff;color:#1d4ed8;border-radius:4px;padding:2px 6px;margin-left:4px;letter-spacing:.03em">BUNDLE</span>' + (hasSub ? ' <span style="font-weight:700;font-size:10px;background:#e6f0ff;color:#1d6fe0;border-radius:4px;padding:2px 6px;margin-left:4px;letter-spacing:.03em">SUBSCRIPTION</span>' : '') + '</span>' +
        '<span style="font-weight:700;font-size:13.5px;color:var(--ink)">' + money(paidTotal) + (compareTotal > paidTotal + 0.001 ? '<span class="muted" style="font-weight:500;text-decoration:line-through;margin-left:6px">' + money(compareTotal) + '</span>' : '') + '</span>' +
      '</div>' +
      (discountHtml ? '<div style="padding:8px 14px 0;background:#fff">' + discountHtml + '</div>' : '') +
      '<div style="padding:2px 14px 8px">' + rows + '</div>' +
    '</div>';
  }

  // ---- Amount card (AmountCard.tsx): subtotal / order discounts / shipping / total / savings / paid ----
  function amountCard(o) {
    const row = (label, valHtml, opts) => {
      opts = opts || {};
      return '<div class="flex items-center justify-between" style="padding:7px 0;' + (opts.border ? 'border-top:1px solid var(--hair);margin-top:2px;padding-top:12px;' : '') + '">' +
        '<div style="' + (opts.sub ? 'font-size:12px;color:#8B8B8B;display:flex;align-items:center;gap:6px' : 'font-size:13.5px;color:var(--ink-body)') + (opts.bold ? ';font-weight:700;color:var(--ink)' : '') + '">' + (opts.sub ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none">' + I.tag + '</span><span>' + label + '</span>' : label) + '</div>' +
        '<div style="' + (opts.sub ? 'font-size:12px;color:#8B8B8B' : 'font-size:13.5px;font-weight:500;color:var(--ink)') + (opts.bold ? ';font-weight:700' : '') + '">' + valHtml + '</div>' +
      '</div>';
    };
    const shipFee = Number(o.shipping_fee || 0);
    const orderDiscs = o.order_discounts || [];
    const shipDiscs = o.shipping_discounts || [];
    const shipDiscountTotal = shipDiscs.reduce((sum, discount) => sum + Number(discount.amount || 0), 0);

    let body = row('Subtotal <span class="muted" style="margin-left:6px">· ' + (o.total_num || 0) + ' items</span>', money(o.subtotal));
    // order discounts (header label + each discount sub-row), mirroring AmountCard
    if (orderDiscs.length) {
      body += row('Order Discount', '');
      orderDiscs.forEach((d) => { body += row(esc(d.name), '-' + money(d.amount), { sub: true }); });
    }
    // Shipping discount rows preserve every applied code; FREE appears only when they cover the full shipping fee.
    if (shipDiscs.length && shipFee > 0) {
      const remainingShipping = Math.max(0, shipFee - shipDiscountTotal);
      body += row('Shipping', '<span class="muted" style="text-decoration:line-through;margin-right:6px">' + money(shipFee) + '</span><span>' + (remainingShipping === 0 ? 'FREE' : money(remainingShipping)) + '</span>');
      shipDiscs.forEach((discount) => { body += row(esc(discount.name || 'Shipping Discount'), '-' + money(discount.amount), { sub: true }); });
    } else {
      body += row('Shipping', shipFee > 0 ? money(shipFee) : 'FREE');
    }
    body += row('Total', money(o.total), { border: true, bold: true });
    if ((o.total_savings || 0) > 0) body += row('TOTAL SAVINGS ' + money(o.total_savings), '', { sub: true });
    if ((o.refunded_amount || 0) > 0) body += row('Refunded', '-' + money(o.refunded_amount), { sub: true });
    body += row('Paid', money(o.paid_amount));
    return cardOpen('<span>Amount</span>') + body + '</div>';
  }

  function descRow(label, val) {
    return '<div style="display:flex;padding:6px 0"><div class="muted" style="width:120px;flex:none;font-size:13px">' + label + '</div>' +
      '<div class="subtle" style="font-size:13px;min-width:0;word-break:break-word">' + (val || '--') + '</div></div>';
  }

  function integrationRow(label, val, topAlign) {
    return '<div style="display:flex;align-items:' + (topAlign ? 'flex-start' : 'center') + ';padding:6px 0">' +
      '<div class="muted" style="width:120px;flex:none;font-size:13px;line-height:22px">' + label + '</div>' +
      '<div class="subtle" style="display:flex;align-items:center;min-height:22px;font-size:13px;min-width:0;word-break:break-word">' + (val || '--') + '</div></div>';
  }

  // ---- Shipping address card (ShippingAddressCard.tsx): 2-col, no inline edit ----
  function shippingAddressCard(o) {
    const s = o.shipping;
    const phone = s.phone ? ('+' + esc(s.phone_code) + ' ' + esc(s.phone)) : '';
    const grid =
      '<div class="grid grid-cols-2" style="gap:0 16px">' +
        descRow('First name', esc(s.first_name)) + descRow('Last name', esc(s.last_name)) +
        descRow('Address', esc(s.detail)) + descRow('Apartment', esc(s.detail2)) +
        descRow('City', esc(s.city)) + descRow('State', esc(s.province)) +
        descRow('ZIP code', esc(s.post_code)) + descRow('Country', esc(s.country)) +
        descRow('Phone', phone) + descRow('Email', esc(s.email)) +
      '</div>';
    return cardOpen('<span>Shipping address</span>') + grid + '</div>';
  }

  // ---- Shipping logistics card (ShippingLogisticsCard.tsx): order-level delivery ----
  function shippingLogisticsCard(o) {
    const tn = o.delivery_id && o.delivery_id !== '—' ? o.delivery_id : '';
    const track = tn ? '<a class="lnk" href="https://t.17track.net/en#nums=' + encodeURIComponent(tn) + '" target="_blank" rel="noreferrer">Order tracking</a>' : '';
    const grid =
      '<div class="grid grid-cols-2" style="gap:0 16px">' +
        descRow('Logistics', esc(o.delivery_name || '')) +
        '<div style="display:flex;padding:6px 0"><div class="muted" style="width:120px;flex:none;font-size:13px">Tracking number</div>' +
          '<div class="subtle flex items-center gap-2" style="font-size:13px">' + (tn ? esc(tn) : '--') + ' ' + track + '</div></div>' +
      '</div>';
    return cardOpen('<span>Shipping logistics</span>') + grid + '</div>';
  }

  function integrationCard(o) {
    const state = shopifySyncState(o);
    const shopifyId = o.shopify_order_id ? '<span class="muted" style="margin-left:6px">' + esc(o.shopify_order_id) + '</span>' : '';
    const shopifyUrl = state.key === 'in_shopify' ? shopifyAdminOrderUrl(o) : '';
    const openInShopify = shopifyUrl ? '<a class="btn btn-default" href="' + esc(shopifyUrl) + '" target="_blank" rel="noreferrer">View in Shopify</a>' : '';
    const retry = state.key === 'attention' ? '<button class="btn btn-default" data-act="retry-shopify">Retry sync</button>' : '';
    return cardOpen('<span>Shopify</span>', openInShopify || retry) +
      integrationRow('Order source', orderSourceDetail(o)) +
      integrationRow('Shopify sync status', shopifySyncPill(o) + shopifyId) +
      '<div class="subtle" style="font-size:12.5px;line-height:1.55;margin-top:6px">' + esc(state.detail) + '</div>' +
      '<div class="subtle" style="font-size:12.5px;line-height:1.55;margin-top:6px">Fulfillment and refunds are managed in Shopify.</div>' +
    '</div>';
  }

  // ---- Timeline card (TimelineCard.tsx): label left, time right; Ant Empty when none ----
  function timelineCard(o) {
    const list = o.timeline || [];
    const items = list.map((t, i, arr) =>
      '<div class="cl-item">' +
        '<div class="cl-rail"><div class="cl-dot"></div>' + (i < arr.length - 1 ? '<div class="cl-line"></div>' : '') + '</div>' +
        '<div class="cl-body" style="padding-bottom:' + (i < arr.length - 1 ? '14px' : '0') + '">' +
          '<div class="flex items-center justify-between gap-3">' +
            '<span class="subtle" style="font-size:13px">' + esc(t.label || '--') + '</span>' +
            '<span class="muted" style="font-size:12px;white-space:nowrap">' + esc(t.time || '--') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>').join('');
    const empty = '<div class="muted" style="text-align:center;padding:18px 0;font-size:13px">No data</div>';
    return cardOpen('<span>Timeline</span>') + '<div>' + (items || empty) + '</div></div>';
  }

  // ---- Notes card (NotesCard.tsx): single note value + pencil-edit ----
  function notesCard(o) {
    const note = o.note ? esc(o.note) : '<span class="muted">No notes</span>';
    const editBtn = '<button class="back-btn" data-act="edit-note" title="Edit" style="width:28px;height:28px;background:transparent">' + I.pencil + '</button>';
    return cardOpen('<span>Notes</span>', editBtn) +
      '<div class="subtle" style="font-size:13px;white-space:pre-wrap">' + note + '</div>' +
    '</div>';
  }

  // The order keeps its own address snapshot, while this compact card is the
  // operator's entry point into the customer's cross-order profile.
  function customerCard(o) {
    const user = o.user || {};
    const shipping = o.shipping || {};
    const name = String(user.nickname || [shipping.first_name, shipping.last_name].filter(Boolean).join(' ') || 'Customer').trim();
    const customerId = user.uid == null || user.uid === '' ? '' : String(user.uid);
    const email = String(shipping.email || '').trim();
    const phoneCode = String(shipping.phone_code || '').replace(/^\+/, '').trim();
    const phone = shipping.phone ? ((phoneCode ? '+' + phoneCode + ' ' : '') + String(shipping.phone).trim()) : '';
    const profileLink = customerId
      ? '<a class="lnk" href="#/customers/' + encodeURIComponent(customerId) + '" style="font-size:13px;font-weight:500">View customer</a>'
      : '';
    const contactRows = [
      email ? '<div class="flex items-center gap-2" style="min-width:0;color:var(--ink-muted)">' + I.mail + '<span class="subtle" style="font-size:13px;line-height:1.45;overflow-wrap:anywhere">' + esc(email) + '</span></div>' : '',
      phone ? '<div class="flex items-center gap-2" style="min-width:0;color:var(--ink-muted)">' + I.phone + '<span class="subtle" style="font-size:13px;line-height:1.45">' + esc(phone) + '</span></div>' : '',
    ].filter(Boolean).join('');

    return cardOpen('<span>Customer</span>', profileLink) +
      '<div style="min-width:0">' +
        '<div style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.4">' + esc(name) + '</div>' +
        (contactRows ? '<div style="display:flex;flex-direction:column;gap:7px;margin-top:10px">' + contactRows + '</div>' : '') +
      '</div>' +
      (customerId ? '<div class="flex items-center justify-between gap-3" style="margin-top:14px;padding-top:10px;border-top:1px solid var(--hair);font-size:13px"><span class="muted">Customer ID</span><span class="subtle" style="font-variant-numeric:tabular-nums">' + esc(customerId) + '</span></div>' : '') +
    '</div>';
  }

  function renderMissing(id) {
    root.innerHTML =
      '<div class="detail-wrap">' +
        '<div class="flex items-center gap-3 mb-4">' +
          '<button class="back-btn" data-act="back">' + I.arrowLeft + '</button>' +
          '<span class="page-title">#' + esc(id) + '</span>' +
        '</div>' +
        '<div class="panel placeholder"><div><div style="font-weight:600;margin-bottom:6px">Detail not available in this prototype</div>' +
          '<div class="muted">Return to the order list and select a valid sample order.</div></div></div>' +
      '</div>';
    const b = root.querySelector('[data-act="back"]'); if (b) b.onclick = () => { location.hash = '#/orders'; };
  }

  function wireDetail(o) {
    const back = root.querySelector('[data-act="back"]'); if (back) back.onclick = () => { location.hash = '#/orders'; };
    const copy = root.querySelector('[data-act="copy"]'); if (copy) copy.onclick = () => { try { navigator.clipboard.writeText(o.order_sn); } catch (e) {} toast('Copied'); };
    const en = root.querySelector('[data-act="edit-note"]'); if (en) en.onclick = () => openEditNoteModal(o);
    const retry = root.querySelector('[data-act="retry-shopify"]'); if (retry) retry.onclick = () => retryShopifySync(o);
  }

  // ================= MODALS =================
  function modal({ title, body, width, okText, onOk }) {
    const backdrop = h('<div class="modal-backdrop"></div>');
    const m = h('<div class="modal"></div>');
    if (width) m.style.width = width + 'px';
    m.style.maxWidth = 'calc(100vw - 32px)';
    m.innerHTML =
      '<div class="modal-head flex items-center justify-between"><span>' + title + '</span>' +
        '<span class="drawer-x" data-x>' + I.x + '</span></div>' +
      '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-foot"><button class="btn btn-default" data-cancel>Cancel</button>' +
        '<button class="btn btn-primary" data-ok>' + (okText || 'Save') + '</button></div>';
    backdrop.appendChild(m); document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    m.querySelector('[data-x]').onclick = close;
    m.querySelector('[data-cancel]').onclick = close;
    backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
    m.querySelector('[data-ok]').onclick = () => onOk(m, close);
    return { m, close };
  }

  function mockTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  function syncListOrder(detail) {
    const row = D.ORDERS.find((order) => String(order.order_id) === String(detail.order_id));
    if (!row) return;
    row.order_status = detail.status;
    row.payment_status = detail.payment_status;
    row.delivery_name = detail.delivery_name || '';
    row.delivery_id = detail.delivery_id || '';
    row.delivery_time = detail.delivery_time || row.delivery_time || null;
    if (detail.source) row.source = detail.source;
    if (detail.shopify_writeback_status) row.shopify_writeback_status = detail.shopify_writeback_status;
    row.shopify_order_id = detail.shopify_order_id || '';
    row.shopify_writeback_detail = detail.shopify_writeback_detail || '';
  }

  function retryShopifySync(o) {
    if (!o || shopifySyncState(o).key !== 'attention') return;
    const queuedAt = mockTimestamp();
    o.source = 'BestCheckout';
    o.shopify_writeback_status = 'pending';
    o.shopify_writeback_detail = 'This paid order is being sent to Shopify again.';
    o.timeline = o.timeline || [];
    o.timeline.push({ label: 'Shopify sync retried', time: queuedAt });
    syncListOrder(o);
    renderDetail(o.order_id);
    toast('Sending to Shopify');

    // Prototype-only success response: it demonstrates the merchant-facing
    // lifecycle without pretending that the browser calls Shopify directly.
    setTimeout(() => {
      o.shopify_writeback_status = 'synced';
      o.shopify_order_id = '#SHP-89137';
      o.shopify_writeback_detail = 'This order is in Shopify and can follow your usual fulfillment process.';
      o.timeline.push({ label: 'Order is in Shopify · #SHP-89137', time: mockTimestamp() });
      syncListOrder(o);
      if (location.hash === '#/orders/' + o.order_id) renderDetail(o.order_id);
      toast('Order is in Shopify');
    }, 750);
  }

  // Shipping modal (ShippingButton.tsx): Logistics + Tracking number, ok=Confirm
  function openShippingModal(o) {
    const body =
      '<div class="mb-3"><label class="ctrl-label" style="text-transform:none">Logistics <span style="color:var(--err)">*</span></label>' +
        '<input class="input" id="f-carrier" placeholder="Please enter Logistics" value="' + esc(o.delivery_name || '') + '" style="margin-top:4px" /></div>' +
      '<div><label class="ctrl-label" style="text-transform:none">Tracking number <span style="color:var(--err)">*</span></label>' +
        '<input class="input" id="f-tracking" placeholder="Please enter Tracking number" value="' + esc(o.delivery_id || '') + '" style="margin-top:4px" /></div>' +
      '<div id="f-err" style="color:var(--err);font-size:12px;margin-top:8px;display:none"></div>';
    modal({
      title: 'Shipping', width: 520, okText: 'Confirm',
      body,
      onOk: (m, close) => {
        const carrier = m.querySelector('#f-carrier').value.trim();
        const tracking = m.querySelector('#f-tracking').value.trim();
        const e = m.querySelector('#f-err');
        if (!carrier) { e.textContent = 'Please enter Logistics'; e.style.display = 'block'; return; }
        if (!tracking) { e.textContent = 'Please enter Tracking number'; e.style.display = 'block'; return; }
        const shippedAt = mockTimestamp();
        o.delivery_name = carrier;
        o.delivery_id = tracking;
        o.delivery_time = shippedAt;
        o.status = 'shipped';
        o.timeline = o.timeline || [];
        o.timeline.push({ label: 'Order shipped via ' + carrier + ' · tracking ' + tracking, time: shippedAt });
        syncListOrder(o);
        close();
        renderDetail(o.order_id);
        toast('Shipped');
      },
    });
  }

  // Refund modal (RefundOrderModal.tsx): Refund amount + Reason for refund, ok=Save
  function openRefundModal(o) {
    const body =
      '<div class="mb-3"><label class="ctrl-label" style="text-transform:none">Refund amount <span style="color:var(--err)">*</span></label>' +
        '<div style="position:relative;margin-top:4px"><span class="muted" style="position:absolute;left:12px;top:8px">$</span>' +
        '<input class="input" id="rf-amt" type="number" step="0.01" min="0" placeholder="0.00" style="padding-left:24px" /></div></div>' +
      '<div><label class="ctrl-label" style="text-transform:none">Reason for refund <span style="color:var(--err)">*</span></label>' +
        '<input class="input" id="rf-reason" placeholder="Please enter Refund reason" style="margin-top:4px" />' +
        '<div class="muted" style="font-size:12px;margin-top:6px">Only you and other staff can see this reason</div></div>' +
      '<div id="rf-err" style="color:var(--err);font-size:12px;margin-top:8px;display:none"></div>';
    modal({
      title: 'Refund', width: 920, okText: 'Save',
      body,
      onOk: (m, close) => {
        const amt = Number(m.querySelector('#rf-amt').value);
        const reason = m.querySelector('#rf-reason').value.trim();
        const e = m.querySelector('#rf-err');
        if (!amt || amt <= 0) { e.textContent = 'Please enter Refund amount'; e.style.display = 'block'; return; }
        if (amt > o.paid_amount + 0.001) { e.textContent = 'Refund cannot exceed the paid amount (' + money(o.paid_amount) + ').'; e.style.display = 'block'; return; }
        if (!reason) { e.textContent = 'Please enter Refund reason'; e.style.display = 'block'; return; }
        const refundedAt = mockTimestamp();
        o.refunded_amount = Number(o.refunded_amount || 0) + amt;
        o.paid_amount = Math.max(0, Number(o.paid_amount || 0) - amt);
        if (o.paid_amount < 0.001) o.status = 'refund';
        o.timeline = o.timeline || [];
        o.timeline.push({ label: (o.status === 'refund' ? 'Full' : 'Partial') + ' refund of ' + money(amt) + ' issued · ' + reason, time: refundedAt });
        syncListOrder(o);
        close();
        renderDetail(o.order_id);
        toast('Refund issued');
      },
    });
  }

  // Verify order modal (VerifyOrderButton.tsx): Order/Code header + product table + qty, ok=Verify
  function openVerifyModal(o) {
    const items = o.items || [];
    const rowsHtml = items.map((it, i) => {
      const remaining = it.remaining != null ? it.remaining : it.qty;
      return '<tr>' +
        '<td style="width:40px;text-align:center"><input type="checkbox" class="vf-pick" data-i="' + i + '"' + (remaining <= 0 ? ' disabled' : '') + ' /></td>' +
        '<td><div class="flex items-center gap-3"><img src="' + it.image + '" alt="" style="width:40px;height:40px;border-radius:6px;flex:none" />' +
          '<div style="min-width:0"><div style="font-weight:500;font-size:13px">' + esc(it.title) + '</div><div class="muted" style="font-size:12px">' + esc(variantText(it.sku)) + '</div></div></div></td>' +
        '<td class="num">' + money(it.unit_price) + '</td>' +
        '<td class="num">' + remaining + '</td>' +
        '<td class="num"><input class="input" type="number" min="1" max="' + remaining + '" value="' + Math.max(remaining, 1) + '"' + (remaining <= 0 ? ' disabled' : '') + ' style="width:72px;height:30px" data-vqty="' + i + '" /></td>' +
      '</tr>';
    }).join('');
    const body =
      '<div class="flex items-center justify-between mb-3" style="font-size:13px">' +
        '<span class="muted">Order: <span class="subtle" style="font-weight:500">' + esc(o.order_sn) + '</span></span>' +
        '<span class="muted">Code: <span class="subtle" style="font-weight:500">' + esc(o.verify_code || '--') + '</span></span>' +
      '</div>' +
      '<div style="border:1px solid var(--hair);border-radius:8px;overflow:hidden">' +
        '<table class="tbl" style="font-size:13px"><thead><tr><th></th><th>Product</th><th class="num">Price</th><th class="num">Remaining</th><th class="num">Verify qty</th></tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody></table></div>' +
      '<div id="vf-err" style="color:var(--err);font-size:12px;margin-top:8px;display:none"></div>';
    modal({
      title: 'Verify order', width: 920, okText: 'Verify',
      body,
      onOk: (m, close) => {
        const n = m.querySelectorAll('.vf-pick:checked').length;
        if (!n) { const e = m.querySelector('#vf-err'); e.textContent = 'Please select products to verify'; e.style.display = 'block'; return; }
        close(); toast('Verified');
      },
    });
  }

  // Edit shipping address modal (EditShippingAddressButton.tsx): Contact + Delivery sections, ok=Save
  function openEditAddressModal(o) {
    const s = o.shipping;
    const inp = (id, ph, val) => '<input class="input" id="' + id + '" placeholder="' + esc(ph) + '" value="' + esc(val || '') + '" style="margin-bottom:12px" />';
    const body =
      '<div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:8px">Contact</div>' +
      inp('a-email', 'Email', s.email) +
      '<div style="font-size:13px;font-weight:500;color:var(--ink);margin:4px 0 8px">Delivery</div>' +
      inp('a-country', 'Country/Region', s.country) +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' + inp('a-first', 'First name', s.first_name) + '</div>' +
        '<div>' + inp('a-last', 'Last name', s.last_name) + '</div>' +
      '</div>' +
      inp('a-addr', 'Address', s.detail) +
      inp('a-apt', 'Apartment, suite, etc.(optional)', s.detail2) +
      '<div class="grid grid-cols-3 gap-3">' +
        '<div>' + inp('a-state', 'State', s.province) + '</div>' +
        '<div>' + inp('a-city', 'City', s.city) + '</div>' +
        '<div>' + inp('a-zip', 'ZIP code', s.post_code) + '</div>' +
      '</div>' +
      '<div class="flex" style="margin-bottom:0">' +
        '<div class="flex items-center justify-center" style="height:34px;width:72px;flex:none;border:1px solid var(--ctl);border-right:none;border-radius:6px 0 0 6px;background:var(--panel);font-size:13px;color:var(--ink-body)">+' + esc(s.phone_code || '1') + '</div>' +
        '<input class="input" id="a-phone" placeholder="Phone" value="' + esc(s.phone || '') + '" style="border-radius:0 6px 6px 0" />' +
      '</div>' +
      '<div id="a-err" style="color:var(--err);font-size:12px;margin-top:8px;display:none"></div>';
    modal({
      title: 'Edit shipping address', width: 760, okText: 'Save',
      body,
      onOk: (m, close) => {
        const req = ['a-email', 'a-country', 'a-first', 'a-last', 'a-addr', 'a-state', 'a-city', 'a-zip', 'a-phone'];
        const missing = req.some((id) => !m.querySelector('#' + id).value.trim());
        if (missing) { const e = m.querySelector('#a-err'); e.textContent = 'Please fill in all required fields.'; e.style.display = 'block'; return; }
        close(); toast('Updated');
      },
    });
  }

  // Edit note modal (NotesCard.tsx): single textarea + char counter + blank validation, ok=Save
  function openEditNoteModal(o) {
    const MAX = 5000;
    const body =
      '<div><textarea class="input" id="n-note" placeholder="Enter note" maxlength="' + MAX + '" style="height:auto;min-height:112px;padding:8px 12px;resize:vertical">' + esc(o.note || '') + '</textarea></div>' +
      '<div class="flex items-center justify-between" style="margin-top:6px">' +
        '<span id="n-err" style="color:var(--err);font-size:12px"></span>' +
        '<span class="muted" id="n-count" style="font-size:12px">' + String(o.note || '').length + '/' + MAX + '</span>' +
      '</div>';
    const ctrl = modal({
      title: 'Edit note', width: 620, okText: 'Save',
      body,
      onOk: (m, close) => {
        const v = m.querySelector('#n-note').value;
        if (!v.trim()) { m.querySelector('#n-err').textContent = "Can't be blank"; return; }
        o.note = v;
        close(); toast('Updated'); renderDetail(o.order_id);
      },
    });
    const ta = ctrl.m.querySelector('#n-note');
    const cnt = ctrl.m.querySelector('#n-count');
    ta.oninput = () => { cnt.textContent = ta.value.length + '/' + MAX; ctrl.m.querySelector('#n-err').textContent = ''; };
  }

  // ================= ROUTER (SPA: registered with the shell router) =================
  function goDetail(id) { location.hash = '#/orders/' + id; }

  function route(rest) {
    closePops();
    if (rest) { renderDetail(decodeURIComponent(rest)); if (root && root.parentElement) root.parentElement.scrollTop = 0; }
    else { renderList(); }
  }

  window.VIEWS = window.VIEWS || {};
  window.VIEWS.orders = { render: function (el, rest) { root = el; route(rest || ''); } };
})();
