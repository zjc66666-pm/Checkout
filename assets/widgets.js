/* BestVoy Admin prototype — shared UI widgets (mirrors antd Select + RangePicker look).
   Loaded globally after shell.js. Two enhancers run automatically over the SPA:
     1. Native <select class="filter-select|pg-size"> -> antd-style custom dropdown.
        The native <select> stays in the DOM (hidden) so every existing `.value`
        read and `onchange` handler keeps working unchanged; picking an option just
        writes the value back and dispatches a native `change` event.
     2. <div data-ui-range> wrapping hidden #start/#end inputs -> English dual-month
        range popover. On commit it writes both inputs then fires ONE `change` on the
        end input (consumers read both on that event => single re-render).
   A MutationObserver re-applies both after each SPA re-render (idempotent via data-ui). */
(function () {
  'use strict';

  var CHEV = '<svg class="ui-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var CAL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { if (!s) return null; var p = String(s).split('-'); if (p.length < 3) return null; var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }
  function strip(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  // ---------- shared popover layer ----------
  var openLayer = null;
  function closePop() {
    if (!openLayer) return;
    var l = openLayer; openLayer = null;
    document.removeEventListener('mousedown', l._out, true);
    window.removeEventListener('resize', l._close, true);
    window.removeEventListener('scroll', l._close, true);
    if (l.parentNode) l.parentNode.removeChild(l);
  }
  function openPop(anchor, panel, opts) {
    closePop();
    opts = opts || {};
    var layer = document.createElement('div');
    layer.className = 'pop-layer';
    panel.classList.add('menu-pop');
    layer.appendChild(panel);
    document.body.appendChild(layer);
    var r = anchor.getBoundingClientRect();
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var left = r.left, top = r.bottom + 6;
    if (opts.align === 'right') left = r.right - pw;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - 8 - pw;
    if (left < 8) left = 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - 6 - ph); // flip up
    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
    layer._close = closePop;
    layer._out = function (e) { if (!panel.contains(e.target) && !anchor.contains(e.target)) closePop(); };
    setTimeout(function () { document.addEventListener('mousedown', layer._out, true); }, 0);
    window.addEventListener('resize', layer._close, true);
    window.addEventListener('scroll', layer._close, true);
    openLayer = layer;
    return layer;
  }

  // ---------- 1. custom select ----------
  function enhanceSelect(sel) {
    sel.setAttribute('data-ui', '1');
    var btn = document.createElement('div');
    btn.className = 'ui-select ' + sel.className.replace('data-ui', '');
    var cs = sel.getAttribute('style');
    if (cs) btn.setAttribute('style', cs);
    var label = document.createElement('span');
    label.className = 'ui-select-label';
    btn.appendChild(label);
    btn.insertAdjacentHTML('beforeend', CHEV);
    function curText() { var o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; }
    function sync() { label.textContent = curText(); }
    sync();
    sel.style.display = 'none';
    sel.parentNode.insertBefore(btn, sel);

    btn.onclick = function () {
      if (openLayer && openLayer._owner === btn) { closePop(); return; }
      var panel = document.createElement('div');
      panel.className = 'ui-select-pop';
      panel.style.minWidth = Math.max(btn.offsetWidth, 160) + 'px';
      Array.prototype.forEach.call(sel.options, function (o, i) {
        var opt = document.createElement('div');
        opt.className = 'opt' + (i === sel.selectedIndex ? ' sel' : '');
        opt.textContent = o.textContent;
        opt.onclick = function () {
          if (sel.selectedIndex !== i) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
          sync();
          closePop();
        };
        panel.appendChild(opt);
      });
      var l = openPop(btn, panel);
      l._owner = btn;
    };
    // keep label fresh if some code sets value programmatically
    sel.addEventListener('change', sync);
  }

  // ---------- 2. dual-month range picker ----------
  function enhanceRange(box) {
    box.setAttribute('data-ui', '1');
    var inputs = box.querySelectorAll('input[type="hidden"], input[data-range]');
    var startEl = box.querySelector('[data-range="start"]') || inputs[0];
    var endEl = box.querySelector('[data-range="end"]') || inputs[1];
    var ph = box.getAttribute('data-ph') || 'Start date → End date';

    var text = document.createElement('span');
    text.className = 'ui-range-text';
    box.insertBefore(text, box.firstChild);
    box.insertAdjacentHTML('beforeend', '<span class="ui-range-ico">' + CAL + '</span>');

    function refresh() {
      var s = startEl && startEl.value, e = endEl && endEl.value;
      if (s && e) { text.textContent = s + '  →  ' + e; text.classList.remove('muted'); }
      else { text.textContent = ph; text.classList.add('muted'); }
    }
    refresh();

    box.onclick = function () {
      if (openLayer && openLayer._owner === box) { closePop(); return; }
      var start = parseYmd(startEl && startEl.value);
      var end = parseYmd(endEl && endEl.value);
      var today = strip(new Date());
      var view = new Date((start || today).getFullYear(), (start || today).getMonth(), 1);

      var panel = document.createElement('div');
      panel.className = 'cal-pop';

      // quick presets (relative to today) — mirrors the analytics date picker
      var PRESETS = [
        ['Today', function () { return [today, today]; }],
        ['Yesterday', function () { var d = addDays(today, -1); return [d, d]; }],
        ['Last 7 days', function () { return [addDays(today, -6), today]; }],
        ['Last 30 days', function () { return [addDays(today, -29), today]; }],
        ['Last 90 days', function () { return [addDays(today, -89), today]; }],
        ['This month', function () { return [new Date(today.getFullYear(), today.getMonth(), 1), today]; }],
        ['Last month', function () { return [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)]; }],
      ];

      function apply() {
        if (startEl) startEl.value = start ? ymd(start) : '';
        if (endEl) { endEl.value = end ? ymd(end) : ''; endEl.dispatchEvent(new Event('change', { bubbles: true })); }
        refresh();
        closePop();
      }
      function pick(d) {
        if (!start || (start && end)) { start = d; end = null; }
        else if (d < start) { start = d; }
        else { end = d; }
        draw(); // no auto-commit — user confirms with Apply
      }
      function month(base) {
        var y = base.getFullYear(), m = base.getMonth();
        var gridStart = new Date(y, m, 1 - new Date(y, m, 1).getDay());
        var cells = '';
        for (var i = 0; i < 42; i++) {
          var d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
          var cls = 'cal-cell';
          if (d.getMonth() !== m) cls += ' out';
          if (sameDay(d, today)) cls += ' today';
          if (start && end && d > start && d < end) cls += ' in';
          if (sameDay(d, start)) cls += ' sel start';
          if (sameDay(d, end)) cls += ' sel end';
          cells += '<div class="' + cls + '" data-d="' + ymd(d) + '">' + d.getDate() + '</div>';
        }
        return { title: MONTHS[m] + ' ' + y, cells: cells };
      }
      function draw() {
        var L = month(view), R = month(addMonths(view, 1));
        var wk = WK.map(function (w) { return '<span>' + w + '</span>'; }).join('');
        var presets = PRESETS.map(function (p, i) { return '<div class="cal-preset" data-preset="' + i + '">' + p[0] + '</div>'; }).join('');
        var selText = start ? (ymd(start) + '  →  ' + (end ? ymd(end) : '…')) : 'Select a date range';
        panel.innerHTML =
          '<div class="cal-body">' +
            '<div class="cal-presets">' + presets + '</div>' +
            '<div class="cal-wrap">' +
              '<div class="cal">' +
                '<div class="cal-hd"><button class="cal-nav" data-nav="-12">«</button><button class="cal-nav" data-nav="-1">‹</button><span class="cal-title">' + L.title + '</span><span class="cal-sp"></span></div>' +
                '<div class="cal-week">' + wk + '</div><div class="cal-grid">' + L.cells + '</div>' +
              '</div>' +
              '<div class="cal">' +
                '<div class="cal-hd"><span class="cal-sp"></span><span class="cal-title">' + R.title + '</span><button class="cal-nav" data-nav="1">›</button><button class="cal-nav" data-nav="12">»</button></div>' +
                '<div class="cal-week">' + wk + '</div><div class="cal-grid">' + R.cells + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cal-foot">' +
            '<span class="cal-sel-text">' + selText + '</span><span style="flex:1"></span>' +
            '<button class="btn btn-default" data-cal-cancel>Cancel</button>' +
            '<button class="btn btn-primary" data-cal-apply' + (start && end ? '' : ' disabled') + '>Apply</button>' +
          '</div>';
        panel.querySelectorAll('[data-nav]').forEach(function (b) {
          b.onclick = function (e) { e.stopPropagation(); view = addMonths(view, +b.getAttribute('data-nav')); draw(); };
        });
        panel.querySelectorAll('[data-d]').forEach(function (c) {
          c.onclick = function (e) { e.stopPropagation(); pick(parseYmd(c.getAttribute('data-d'))); };
        });
        panel.querySelectorAll('[data-preset]').forEach(function (el) {
          el.onclick = function (e) { e.stopPropagation(); var r = PRESETS[+el.getAttribute('data-preset')][1](); start = r[0]; end = r[1]; view = new Date(start.getFullYear(), start.getMonth(), 1); draw(); };
        });
        panel.querySelector('[data-cal-cancel]').onclick = function (e) { e.stopPropagation(); closePop(); };
        panel.querySelector('[data-cal-apply]').onclick = function (e) { e.stopPropagation(); if (start && end) apply(); };
      }
      draw();
      var l = openPop(box, panel);
      l._owner = box;
    };
    box.addEventListener('ui-range-refresh', refresh);
  }

  // ---------- shared "Unsaved changes" bar (UnSavedChanges.tsx) ----------
  // One implementation for every edit page so they can't drift apart again. Dark,
  // full-width, fixed to the very top of the viewport (covers the 60px header) — the
  // products module / live-admin treatment. unsavedBar() returns the markup (always
  // hidden initially); setUnsavedBar() flips it on/off from a module's dirty-sync.
  var ALERT_ICO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
  function escAttr(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // opts: { saveLabel:'Add'|'Update'|…, saveAct:'save-bar'(default), discardAct:'discard'(default),
  //         show:false(default) }. saveAct/discardAct let a module keep its existing [data-act] wiring.
  // Default is hidden (render-once + toggle via setUnsavedBar). Modules that conditionally inject the
  // bar only when dirty pass show:true so it renders visible.
  function unsavedBar(opts) {
    opts = opts || {};
    var saveLabel = opts.saveLabel || 'Save';
    var saveAct = opts.saveAct || 'save-bar';
    var discardAct = opts.discardAct || 'discard';
    var hidden = opts.show ? '' : ' style="display:none"';
    return '<div id="unsaved-bar" class="unsaved-bar"' + hidden + '>' +
      '<div style="flex:1"></div>' +
      '<div class="flex items-center gap-2"><span style="display:inline-flex">' + ALERT_ICO + '</span>' +
        '<span style="font-size:13.5px">You have unsaved changes</span></div>' +
      '<div class="flex items-center justify-end gap-3" style="flex:1">' +
        '<button class="btn unsaved-discard" data-act="' + escAttr(discardAct) + '">Discard</button>' +
        '<button class="btn btn-primary" data-act="' + escAttr(saveAct) + '">' + escAttr(saveLabel) + '</button>' +
      '</div>' +
    '</div>';
  }
  // Toggle the bar within `scope` (an element or document). Pass the module's dirty flag.
  function setUnsavedBar(scope, dirty) {
    var host = (scope && scope.querySelector) ? scope : document;
    var bar = host.querySelector('#unsaved-bar');
    if (bar) bar.style.display = dirty ? 'flex' : 'none';
  }

  // ---------- scan + observe ----------
  // enhance filter-bar selects, page-size, and form-field selects (.input);
  // skip the rich-text toolbar (.rt-select) and anything opting out via data-no-ui.
  var SEL = 'select.filter-select, select.pg-size, select.input';
  function scan(scope) {
    var root = scope || document;
    root.querySelectorAll(SEL).forEach(function (s) {
      if (s.hasAttribute('data-ui') || s.hasAttribute('data-no-ui') || s.classList.contains('rt-select')) return;
      try { enhanceSelect(s); } catch (e) {}
    });
    root.querySelectorAll('[data-ui-range]:not([data-ui])').forEach(function (b) { try { enhanceRange(b); } catch (e) {} });
  }
  // setTimeout (not rAF) so enhancement still fires in a backgrounded/hidden tab where rAF is paused
  var pending = false;
  function schedule() { if (pending) return; pending = true; setTimeout(function () { pending = false; scan(document); }, 0); }
  function init() {
    try { scan(document); } catch (e) {}
    try { new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ---------- shared product picker (one implementation for collections / bundles / subscriptions) ----------
  // opts: { multiple:true, selected:[names], max:100, products:[], categories:[], fields:[], statusOptions:[], onConfirm:function(products){} }
  // products passed to onConfirm are the full picked rows ({name, sku, price, ...}).
  // variants: number of SKUs (1 = single-variant). priceMax > price = a price range. partial = some variants out of stock.
  var PP_PRODUCTS = [
    { name: 'Neurix Focus & Energy Gum', sku: 'GUM-FE',  price: 34.99, priceMax: 39.99, variants: 4, inv: 1240, status: 'active', cat: 'supplements' },
    { name: 'Peppermint Gum',            sku: 'GUM-PEP', price: 12.00, variants: 1, inv: 860,  status: 'active', cat: 'supplements' },
    { name: 'Spearmint Gum',             sku: 'GUM-SPE', price: 12.00, variants: 1, inv: 540,  status: 'active', cat: 'supplements' },
    { name: 'Watermelon Gum',            sku: 'GUM-WAT', price: 12.00, variants: 3, inv: 0,    status: 'active', cat: 'supplements' },
    { name: 'Ginger Gum',                sku: 'GUM-GIN', price: 12.00, variants: 1, inv: 120,  status: 'draft',  cat: 'supplements' },
    { name: 'Energy Drink Mix',          sku: 'DRK-ENE', price: 29.00, priceMax: 34.00, variants: 5, inv: 430,  status: 'active', cat: 'beverages' },
    { name: 'Focus Capsules',            sku: 'CAP-FOC', price: 39.00, priceMax: 45.00, variants: 2, inv: 210,  status: 'active', cat: 'supplements' },
    { name: 'Sleep Gummies',             sku: 'GUM-SLP', price: 24.00, priceMax: 28.00, variants: 3, inv: 780,  status: 'active', cat: 'supplements' },
    { name: 'Greens Powder',             sku: 'PWD-GRN', price: 35.00, variants: 1, inv: 90,   status: 'active', cat: 'beverages' },
    { name: 'Signature Blend Coffee',    sku: 'COF-500', price: 24.00, priceMax: 30.00, variants: 4, inv: 1500, status: 'active', cat: 'beverages', partial: true },
    { name: 'Cold Brew Concentrate',     sku: 'COF-CB',  price: 28.00, priceMax: 32.00, variants: 2, inv: 340,  status: 'active', cat: 'beverages' },
    { name: 'Shaker Bottle',             sku: 'ACC-SHK', price: 9.99,  variants: 1, inv: 2000, status: 'active', cat: 'accessories' },
  ];
  var PP_IMGS = ['https://silixwear.com/cdn/shop/files/Dark-GRAY.jpg?v=1776154216&width=120', 'https://silixwear.com/cdn/shop/files/01_cf6e37ef-a0ab-4c82-ac61-c30d06d3111e.jpg?width=120', 'https://silixwear.com/cdn/shop/files/01_50091071-d25f-4060-9fce-acd28e12ce10.jpg?width=120', 'https://silixwear.com/cdn/shop/files/7_3bd5ccd0-0637-4559-b7be-1cd8196b15d4.jpg?width=120'];
  PP_PRODUCTS.forEach(function (p, i) { p.image = PP_IMGS[i % PP_IMGS.length]; });
  var PP_CATS = [{ value: 'supplements', label: 'Supplements' }, { value: 'beverages', label: 'Beverages' }, { value: 'accessories', label: 'Accessories' }];
  var PP_FIELDS = [{ value: 'name', label: 'Product name' }, { value: 'sku', label: 'SKU' }];
  var PP_STATUS = [['active', 'Active'], ['draft', 'Draft']];
  var SRCH_ICO = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
  var X_ICO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  function ppMoney(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: (n % 1 ? 2 : 0), maximumFractionDigits: 2 }); }
  function ppInventory(p) {
    var txt = (p.inv || 0) + ' on sale' + (p.variants > 1 ? ' · ' + p.variants + ' variants' : '');
    var badge = (!p.inv) ? 'Out of stock' : (p.partial ? 'Partial - Out of stock' : '');
    return txt + (badge ? ' <span style="color:#c2620f;background:#fff2e6;border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600;white-space:nowrap">' + badge + '</span>' : '');
  }
  function ppPrice(p) { return (p.priceMax && p.priceMax > p.price) ? ppMoney(p.price) + ' ~ ' + ppMoney(p.priceMax) : ppMoney(p.price); }

  function productPicker(opts) {
    opts = opts || {};
    var multiple = opts.multiple !== false;
    var max = opts.max || 100;
    var onConfirm = opts.onConfirm || function () {};
    // Subscriptions, Bundles and BestCheckout share this picker.  Callers can
    // provide their own catalog while keeping the same filtering/table UX.
    var products = (opts.products && opts.products.length ? opts.products : PP_PRODUCTS).slice();
    var categories = opts.categories || PP_CATS;
    var fields = opts.fields || PP_FIELDS;
    var statusOptions = opts.statusOptions || PP_STATUS;
    var st = { field: 'name', kw: '', kwApplied: '', cat: '', priceMin: '', priceMax: '', priceApplied: false, status: [], page: 1, size: 8, sel: new Set(opts.selected || []) };
    var backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
    if (opts.zIndex != null) backdrop.style.zIndex = String(opts.zIndex);
    var m = document.createElement('div'); m.className = 'modal'; m.style.width = '960px'; m.style.maxWidth = '94vw';
    backdrop.appendChild(m); document.body.appendChild(backdrop);
    var close = function () { closePop(); backdrop.remove(); };
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });

    function filtered() {
      var rows = products.slice();
      if (st.kwApplied) { var q = st.kwApplied.toLowerCase(); rows = rows.filter(function (p) { return (st.field === 'sku' ? p.sku : p.name).toLowerCase().indexOf(q) >= 0; }); }
      if (st.cat) rows = rows.filter(function (p) { return p.cat === st.cat; });
      if (st.priceApplied) { var lo = st.priceMin !== '' ? Number(st.priceMin) : -Infinity, hi = st.priceMax !== '' ? Number(st.priceMax) : Infinity; rows = rows.filter(function (p) { var pmax = p.priceMax != null ? p.priceMax : p.price; return pmax >= lo && p.price <= hi; }); }
      if (st.status.length) rows = rows.filter(function (p) { return st.status.indexOf(p.status) >= 0; });
      return rows;
    }
    function statusTxt() { var match = statusOptions.filter(function (s) { return s[0] === st.status[0]; })[0]; return st.status.length === 1 ? (match ? match[1] : 'Status') : (st.status.length > 1 ? st.status.length + ' selected' : 'Status'); }
    function priceTxt() { var mn = st.priceMin !== '' ? ppMoney(st.priceMin) : 'Min', mx = st.priceMax !== '' ? ppMoney(st.priceMax) : 'Max'; return mn + ' - ' + mx; }
    function tagList() {
      var t = [];
      if (st.cat) t.push(['category', 'Category', (categories.filter(function (c) { return c.value === st.cat; })[0] || {}).label]);
      if (st.kwApplied) t.push(['keyword', (fields.filter(function (f) { return f.value === st.field; })[0] || {}).label, st.kwApplied]);
      if (st.priceApplied) t.push(['price', 'Price range', priceTxt()]);
      if (st.status.length) t.push(['status', 'Status', st.status.map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(', ')]);
      return t;
    }
    function pagerHtml(page, pages) {
      var item = function (lbl, p, dis, act) { return '<span class="pg-item' + (act ? ' active' : '') + (dis ? ' disabled' : '') + '"' + (dis ? '' : ' data-pg="' + p + '"') + '>' + lbl + '</span>'; };
      var nums = ''; for (var p = 1; p <= pages; p++) nums += item(String(p), p, false, p === page);
      return '<div class="pg">' + item('‹', page - 1, page <= 1) + nums + item('›', page + 1, page >= pages) + '</div>';
    }
    var IMG = '<span style="width:36px;height:36px;border-radius:6px;background:#e9ecf2;color:#9aa3b2;display:grid;place-items:center;font-size:9px;font-weight:600;flex:none">IMG</span>';

    function paint() {
      var rows = filtered(); var pages = Math.max(1, Math.ceil(rows.length / st.size));
      if (st.page > pages) st.page = pages;
      var pageRows = rows.slice((st.page - 1) * st.size, (st.page - 1) * st.size + st.size);
      var fieldOpts = fields.map(function (f) { return '<option value="' + f.value + '"' + (st.field === f.value ? ' selected' : '') + '>' + f.label + '</option>'; }).join('');
      var catOpts = '<option value="">Category</option>' + categories.map(function (c) { return '<option value="' + c.value + '"' + (st.cat === c.value ? ' selected' : '') + '>' + c.label + '</option>'; }).join('');
      var tg = tagList();
      var rowHtml = function (p) {
        var on = st.sel.has(p.name);
        return '<tr data-pp="' + escAttr(p.name) + '" style="cursor:pointer">' +
          '<td style="width:44px"><input type="' + (multiple ? 'checkbox' : 'radio') + '"' + (on ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:var(--brand);pointer-events:none" /></td>' +
          '<td><div class="flex items-center gap-2"><span style="width:36px;height:36px;border-radius:6px;overflow:hidden;background:#e9ecf2;flex:none;display:inline-block">' + (p.image ? '<img src="' + escAttr(p.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.remove()" />' : IMG) + '</span><span style="color:var(--ink)">' + escAttr(p.name) + '</span></div></td>' +
          '<td class="muted" style="font-size:13px">' + ppInventory(p) + '</td>' +
          '<td>' + ppPrice(p) + '</td>' +
          '<td>' + (p.status === 'active' ? '<span class="pill pill-green">Active</span>' : '<span class="pill pill-gray">Draft</span>') + '</td>' +
        '</tr>';
      };
      m.innerHTML =
        '<div class="modal-head flex items-center justify-between"><span>' + (multiple ? 'Add products' : 'Add product') + '</span><span data-x style="cursor:pointer">' + X_ICO + '</span></div>' +
        '<div class="modal-body">' +
          '<div class="flex items-center gap-2" style="flex-wrap:wrap">' +
            '<div class="flex" style="width:340px"><select class="filter-select" id="pp-field" style="width:140px;border-top-right-radius:0;border-bottom-right-radius:0">' + fieldOpts + '</select>' +
              '<div style="position:relative;flex:1"><input class="filter-input" id="pp-kw" placeholder="Search" value="' + escAttr(st.kw) + '" style="width:100%;padding-right:30px;border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px" /><span style="position:absolute;right:9px;top:9px;color:var(--ink-muted)">' + SRCH_ICO + '</span></div></div>' +
            '<select class="filter-select" id="pp-cat" style="width:170px">' + catOpts + '</select>' +
            '<div class="sel-trigger" id="pp-price" style="width:170px"><span class="' + (st.priceApplied ? '' : 'muted') + '">' + (st.priceApplied ? priceTxt() : 'Price range') + '</span>' + CHEV + '</div>' +
            '<div class="sel-trigger" id="pp-status" style="width:150px"><span class="' + (st.status.length ? '' : 'muted') + '">' + statusTxt() + '</span>' + CHEV + '</div>' +
          '</div>' +
          (tg.length ? '<div class="flex gap-2" style="flex-wrap:wrap;margin-top:8px" id="pp-tags">' + tg.map(function (t) { return '<span class="field-pill" data-clear="' + t[0] + '"><span class="muted">' + escAttr(t[1]) + ':</span> ' + escAttr(t[2]) + ' <span class="x">&times;</span></span>'; }).join('') + '</div>' : '') +
          '<div style="border:1px solid var(--hair);border-radius:8px;overflow:hidden;margin-top:12px"><div style="max-height:380px;overflow:auto"><table class="tbl"><thead><tr><th style="width:44px"></th><th>Product</th><th style="width:150px">Inventory</th><th style="width:100px">Price</th><th style="width:100px">Status</th></tr></thead><tbody id="pp-tbody">' +
            (pageRows.length ? pageRows.map(rowHtml).join('') : '<tr><td colspan="5" style="text-align:center;padding:36px" class="muted">No products match these filters.</td></tr>') +
          '</tbody></table></div></div>' +
        '</div>' +
        '<div class="modal-foot flex items-center justify-between"><span class="muted" style="font-size:13px">' + st.sel.size + (multiple ? ' / ' + max : '') + ' selected</span>' +
          '<div class="flex items-center gap-3">' + pagerHtml(st.page, pages) + '<button class="btn btn-default" data-cancel>Cancel</button><button class="btn btn-primary"' + (st.sel.size === 0 ? ' disabled' : '') + ' data-ok>' + (multiple ? 'Add products' : 'Add product') + '</button></div></div>';

      m.querySelector('[data-x]').onclick = close;
      m.querySelector('[data-cancel]').onclick = close;
      var field = m.querySelector('#pp-field'); field.onchange = function () { st.field = field.value; if (st.kw.trim()) st.kwApplied = st.kw.trim(); st.page = 1; paint(); };
      var kw = m.querySelector('#pp-kw');
      kw.oninput = function () { st.kw = kw.value; if (!kw.value.trim() && st.kwApplied) { st.kwApplied = ''; st.page = 1; paint(); } };
      kw.onkeydown = function (e) { if (e.key === 'Enter') { st.kwApplied = st.kw.trim(); st.page = 1; paint(); } };
      kw.onblur = function () { st.kwApplied = st.kw.trim(); st.page = 1; paint(); };
      var cat = m.querySelector('#pp-cat'); cat.onchange = function () { st.cat = cat.value; st.page = 1; paint(); };
      var statusChip = m.querySelector('#pp-status'); statusChip.onclick = function () { openStatusPop(statusChip); };
      var priceChip = m.querySelector('#pp-price'); if (priceChip) priceChip.onclick = function () { openPricePop(priceChip); };
      m.querySelectorAll('#pp-tags [data-clear]').forEach(function (tgl) { tgl.onclick = function () { var k = tgl.getAttribute('data-clear'); if (k === 'category') st.cat = ''; if (k === 'keyword') { st.kw = ''; st.kwApplied = ''; } if (k === 'price') { st.priceApplied = false; st.priceMin = ''; st.priceMax = ''; } if (k === 'status') st.status = []; st.page = 1; paint(); }; });
      m.querySelectorAll('#pp-tbody tr[data-pp]').forEach(function (tr) { tr.onclick = function () { var name = tr.getAttribute('data-pp'); if (multiple) { if (st.sel.has(name)) st.sel.delete(name); else if (st.sel.size < max) st.sel.add(name); } else { st.sel = new Set([name]); } paint(); }; });
      m.querySelectorAll('.pg-item[data-pg]').forEach(function (el) { el.onclick = function () { st.page = Number(el.getAttribute('data-pg')); paint(); }; });
      var ok = m.querySelector('[data-ok]'); if (ok) ok.onclick = function () { if (st.sel.size === 0) return; var picked = products.filter(function (p) { return st.sel.has(p.name); }); close(); onConfirm(picked); };
      if (window.UI && window.UI.scan) window.UI.scan(m);
    }
    function openStatusPop(anchor) {
      var panel = document.createElement('div'); panel.style.minWidth = '150px'; panel.style.padding = '6px';
      panel.innerHTML = statusOptions.map(function (s) { return '<label class="flex items-center gap-2" style="padding:7px 10px;cursor:pointer;border-radius:6px"><input type="checkbox" data-v="' + s[0] + '"' + (st.status.indexOf(s[0]) >= 0 ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:var(--brand)" /><span style="font-size:13px">' + s[1] + '</span></label>'; }).join('');
      panel.querySelectorAll('input[data-v]').forEach(function (cb) { cb.onchange = function () { var v = cb.getAttribute('data-v'); if (cb.checked) { if (st.status.indexOf(v) < 0) st.status.push(v); } else st.status = st.status.filter(function (x) { return x !== v; }); st.page = 1; paint(); }; });
      openPop(anchor, panel);
    }
    function openPricePop(anchor) {
      var panel = document.createElement('div'); panel.style.minWidth = '300px'; panel.style.padding = '14px';
      panel.innerHTML =
        '<div class="flex items-center gap-2">' +
          '<div class="pr-field"><span class="pr-cur">$</span><input class="pr-input" id="pp-pmin" placeholder="Min" type="number" value="' + escAttr(st.priceMin) + '" /></div>' +
          '<span class="muted">-</span>' +
          '<div class="pr-field"><span class="pr-cur">$</span><input class="pr-input" id="pp-pmax" placeholder="Max" type="number" value="' + escAttr(st.priceMax) + '" /></div>' +
        '</div>' +
        '<div class="flex justify-end gap-2" style="margin-top:12px">' +
          '<button class="btn btn-default" data-pp-pclear>Clear</button>' +
          '<button class="btn btn-primary" data-pp-papply>Apply</button>' +
        '</div>';
      panel.querySelector('[data-pp-papply]').onclick = function () { st.priceMin = panel.querySelector('#pp-pmin').value; st.priceMax = panel.querySelector('#pp-pmax').value; st.priceApplied = (st.priceMin !== '' || st.priceMax !== ''); st.page = 1; closePop(); paint(); };
      panel.querySelector('[data-pp-pclear]').onclick = function () { st.priceMin = ''; st.priceMax = ''; st.priceApplied = false; st.page = 1; closePop(); paint(); };
      openPop(anchor, panel);
    }
    paint();
  }

  // Single-select bundle picker — mirrors productPicker's modal shell but lighter (bundles have no inventory/price facets).
  function bundlePicker(opts) {
    opts = opts || {};
    var onConfirm = opts.onConfirm || function () {};
    var DB = window.DATA_BUNDLES || { bundles: [], templates: [] };
    var tplLabel = function (v) { var t = (DB.templates || []).filter(function (x) { return x.value === v; })[0]; return t ? t.label : v; };
    var st = { kw: '', sel: opts.selected ? String(opts.selected) : '' };
    var backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
    var m = document.createElement('div'); m.className = 'modal'; m.style.width = '760px'; m.style.maxWidth = '94vw';
    backdrop.appendChild(m); document.body.appendChild(backdrop);
    var close = function () { backdrop.remove(); };
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });

    function filtered() {
      var rows = (DB.bundles || []).slice();
      if (st.kw.trim()) { var q = st.kw.trim().toLowerCase(); rows = rows.filter(function (b) { return (b.name || '').toLowerCase().indexOf(q) >= 0 || (b.parentProduct || '').toLowerCase().indexOf(q) >= 0; }); }
      return rows;
    }
    function rowHtml(b) {
      var on = st.sel === String(b.id);
      return '<tr data-bid="' + escAttr(b.id) + '" style="cursor:pointer">' +
        '<td style="width:44px"><input type="radio"' + (on ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:var(--brand);pointer-events:none" /></td>' +
        '<td><div style="color:var(--ink);font-weight:500">' + escAttr(b.name) + '</div><div class="muted" style="font-size:12px">' + escAttr(b.id) + '</div></td>' +
        '<td class="muted" style="font-size:13px">' + escAttr(b.parentProduct) + '</td>' +
        '<td><span class="pill pill-blue">' + escAttr(tplLabel(b.template)) + '</span></td>' +
        '<td>' + (b.status === 'active' ? '<span class="pill pill-green">Active</span>' : '<span class="pill pill-gray">Draft</span>') + '</td>' +
      '</tr>';
    }
    function renderRows() {
      var rows = filtered();
      m.querySelector('#bp-tbody').innerHTML = rows.length ? rows.map(rowHtml).join('') : '<tr><td colspan="5" style="text-align:center;padding:36px" class="muted">No bundles found.</td></tr>';
      m.querySelectorAll('#bp-tbody tr[data-bid]').forEach(function (tr) { tr.onclick = function () { st.sel = tr.getAttribute('data-bid'); renderRows(); }; });
      var ok = m.querySelector('[data-ok]'); if (ok) ok.disabled = !st.sel;
    }
    m.innerHTML =
      '<div class="modal-head flex items-center justify-between"><span>Add bundle</span><span data-x style="cursor:pointer">' + X_ICO + '</span></div>' +
      '<div class="modal-body">' +
        '<div style="position:relative;width:340px"><input class="filter-input" id="bp-kw" placeholder="Search bundles" style="width:100%;padding-right:30px" /><span style="position:absolute;right:9px;top:9px;color:var(--ink-muted)">' + SRCH_ICO + '</span></div>' +
        '<div style="border:1px solid var(--hair);border-radius:8px;overflow:hidden;margin-top:12px"><div style="max-height:380px;overflow:auto"><table class="tbl"><thead><tr><th style="width:44px"></th><th>Bundle</th><th style="width:180px">Parent product</th><th style="width:150px">Template</th><th style="width:90px">Status</th></tr></thead><tbody id="bp-tbody"></tbody></table></div></div>' +
      '</div>' +
      '<div class="modal-foot flex items-center justify-end gap-3"><button class="btn btn-default" data-cancel>Cancel</button><button class="btn btn-primary" disabled data-ok>Add bundle</button></div>';
    m.querySelector('[data-x]').onclick = close;
    m.querySelector('[data-cancel]').onclick = close;
    var kw = m.querySelector('#bp-kw'); kw.oninput = function () { st.kw = kw.value; renderRows(); };
    m.querySelector('[data-ok]').onclick = function () {
      if (!st.sel) return;
      var picked = (DB.bundles || []).filter(function (b) { return String(b.id) === st.sel; })[0];
      close();
      if (!picked) return;
      // attach a representative image: matching product's photo, else a deterministic placeholder
      var img = '', match = PP_PRODUCTS.filter(function (pp) { return pp.name === picked.parentProduct; })[0];
      if (match) img = match.image;
      else if (typeof PP_IMGS !== 'undefined' && PP_IMGS.length) { var h = 0, nm = String(picked.name); for (var i = 0; i < nm.length; i++) h = (h * 31 + nm.charCodeAt(i)) >>> 0; img = PP_IMGS[h % PP_IMGS.length]; }
      onConfirm(Object.assign({}, picked, { image: img }));
    };
    renderRows();
  }

  // Shared confirm dialog — same look as the settings module's Ant-style Modal.confirm (modal-* theme classes).
  // window.UI.confirm({ title, content, okText, cancelText, danger, width, onOk })
  function confirmDialog(opts) {
    opts = opts || {};
    var backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
    var m = document.createElement('div'); m.className = 'modal'; m.style.width = (opts.width || 440) + 'px';
    m.innerHTML =
      '<div class="modal-head flex items-center justify-between"><span>' + escAttr(opts.title || 'Confirm') + '</span><span data-x style="cursor:pointer">' + X_ICO + '</span></div>' +
      '<div class="modal-body"><div class="muted" style="font-size:13.5px;line-height:1.6">' + escAttr(opts.content || '') + '</div></div>' +
      '<div class="modal-foot">' +
        '<button class="btn btn-default" data-cancel>' + escAttr(opts.cancelText || 'Cancel') + '</button>' +
        '<button class="btn ' + (opts.danger ? '' : 'btn-primary') + '"' + (opts.danger ? ' style="background:var(--err);color:#fff;border-color:var(--err)"' : '') + ' data-ok>' + escAttr(opts.okText || 'OK') + '</button>' +
      '</div>';
    backdrop.appendChild(m); document.body.appendChild(backdrop);
    var onKey = function (e) { if (e.key === 'Escape') close(); else if (e.key === 'Enter') { var ok = m.querySelector('[data-ok]'); if (ok) ok.click(); } };
    var close = function () { document.removeEventListener('keydown', onKey); backdrop.remove(); };
    m.querySelector('[data-x]').onclick = close;
    m.querySelector('[data-cancel]').onclick = close;
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });
    m.querySelector('[data-ok]').onclick = function () { close(); if (opts.onOk) opts.onOk(); };
    document.addEventListener('keydown', onKey);
  }

  window.UI = { scan: scan, closePop: closePop, unsavedBar: unsavedBar, setUnsavedBar: setUnsavedBar, productPicker: productPicker, bundlePicker: bundlePicker, confirm: confirmDialog };
})();
