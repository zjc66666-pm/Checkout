// BestVoy Admin · Analytics prototype — content + secondary nav for the SPA shell.
// Chrome (sidebar + header) is injected by ../assets/shell.js; this file only
// renders the module body into the passed `root`, with its OWN horizontal tab
// bar (Overview / Reports / Live View) as secondary navigation, and registers
// itself as window.VIEWS.analytics for the shell's hash router.
(function () {
  let root; // set by the SPA shell router via VIEWS.analytics.render(el, rest)
  const ICON = window.ICON || window.ICONS || {}; // icons.js loads first; fallback just in case
  const { KPIS, SALES_TREND, BREAKDOWN, SALES_BY_CHANNEL, AOV_TREND, SESSIONS_TREND, FUNNEL, CONV_RATE_TREND, SALES_BY_REFERRER, SESSIONS_BY_REFERRER, PERF_BY_CHANNEL, CITY_COORDS, SALES_BY_PRODUCT, SESSIONS_BY_DEVICE, SESSIONS_BY_LOCATION, SOCIAL_REFERRER, LANDING_PAGES, SELL_THROUGH, COHORT, PAGEVIEWS_TREND, PAID_AMOUNT_TREND, REFUND_TREND, MARKETING_SALES_TREND, ORDERS_FULFILLED_TREND, SESSIONS_BY_COUNTRY, SESSIONS_BY_TRAFFIC, SESSIONS_BY_SOCIAL, PRODUCT_DATA, VARIANT_DATA, COUNTRY_TRAFFIC, REPORTS, REPORT_CATEGORIES, CATALOG } = window.DATA;
  // ---- Favorites (localStorage-backed) + current report id ----
  let CURRENT_REPORT = null;
  const FAV_KEY = 'bestvoy_fav_reports';
  const FAV = {
    list() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; } },
    has(id) { return FAV.list().includes(id); },
    toggle(id) { const l = FAV.list(); const i = l.indexOf(id); if (i >= 0) l.splice(i, 1); else l.push(id); localStorage.setItem(FAV_KEY, JSON.stringify(l)); return FAV.has(id); },
  };
  function bindFav(view) {
    const b = view.querySelector('[data-act="fav"]'); if (!b || !CURRENT_REPORT) return;
    const sync = () => { b.textContent = FAV.has(CURRENT_REPORT) ? '★ Favorited' : 'Favorites'; };
    sync();
    b.onclick = () => { const on = FAV.toggle(CURRENT_REPORT); sync(); toast(on ? 'Added to favorites' : 'Removed from favorites'); };
  }
  // ---- Custom reports (Save as products, localStorage-backed) ----
  const CUSTOM_KEY = 'bestvoy_custom_reports';
  const CUSTOM = {
    list() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch (e) { return []; } },
    add(rep) { const l = CUSTOM.list(); l.push(rep); localStorage.setItem(CUSTOM_KEY, JSON.stringify(l)); },
    remove(id) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(CUSTOM.list().filter((r) => r.id !== id))); },
  };
  function saveAsModal(baseId) {
    const base = (window.DATA.REPORTS.find((r) => r.id === baseId) || {});
    const back = document.createElement('div'); back.className = 'modal-backdrop';
    const close = () => back.remove();
    back.innerHTML = `<div class="modal" style="width:420px"><div class="modal-head">Save as new report</div><div class="modal-body"><label class="fld-label" style="margin-top:0">Report name</label><input class="filter-input" id="sa-name" value="${(base.name || 'My report')} (copy)" placeholder="${(base.name || 'My report')} (copy)" style="width:100%;padding-left:12px" /><p id="sa-err" style="font-size:12px;color:var(--err);display:none;margin-top:6px"></p></div><div class="modal-foot"><button class="btn btn-default" data-x>Cancel</button><button class="btn btn-primary" data-save>Save</button></div></div>`;
    document.body.appendChild(back);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    back.querySelector('[data-x]').onclick = close;
    const inp = back.querySelector('#sa-name'); inp.focus(); inp.select();
    back.querySelector('[data-save]').onclick = () => {
      const name = inp.value.trim(); const err = back.querySelector('#sa-err');
      if (!name) { err.textContent = 'Please enter a report name'; err.style.display = 'block'; return; }
      if (CUSTOM.list().some((r) => r.name === name)) { err.textContent = 'A report with this name already exists'; err.style.display = 'block'; return; }
      CUSTOM.add({ id: 'custom_' + Date.now(), name, baseId: baseId || null });
      close(); toast('Report saved');
    };
  }
  function deleteCustomModal(id, name, after) {
    const back = document.createElement('div'); back.className = 'modal-backdrop';
    const close = () => back.remove();
    back.innerHTML = `<div class="modal" style="width:420px"><div class="modal-head">Delete report?</div><div class="modal-body"><p style="font-size:13.5px;color:var(--ink-body);line-height:1.55;margin:0">Delete <b>${name}</b>? This can't be undone.</p></div><div class="modal-foot"><button class="btn btn-default" data-x>Cancel</button><button class="btn" style="background:var(--err);color:#fff;border-color:var(--err)" data-del>Delete</button></div></div>`;
    document.body.appendChild(back);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    back.querySelector('[data-x]').onclick = close;
    back.querySelector('[data-del]').onclick = () => { CUSTOM.remove(id); close(); toast('Report deleted'); if (after) after(); };
  }
  let charts = [];

  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const disposeCharts = () => { charts.forEach((c) => { if (c.__ro) c.__ro.disconnect(); c.dispose(); }); charts = []; if (window.__liveTimer) { clearInterval(window.__liveTimer); window.__liveTimer = null; } };
  const mkChart = (node, opt) => {
    const c = echarts.init(node); c.setOption(opt); charts.push(c);
    // Charts often init before the card grid has its final width, leaving the canvas wider
    // than its container (overflow until the window is resized). Resize once the container
    // has laid out, and on every later size change (scrollbar / sidebar / column reflow).
    requestAnimationFrame(() => c.resize());
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => c.resize()); ro.observe(node); c.__ro = ro; }
    return c;
  };
  window.addEventListener('resize', () => charts.forEach((c) => c.resize()));

  // ---------------- Secondary nav (analytics' own sub-views) ----------------
  // Rendered as a horizontal tab bar at the top of the analytics content. The
  // shared shell owns the sidebar + header; this is the in-module navigation
  // between Overview / Reports / Live View. Active is highlighted by `seg`.
  const SUBNAV = [
    { seg: 'overview', label: 'Overview', route: '#/analytics/overview' },
    { seg: 'reports', label: 'Reports', route: '#/analytics/reports' },
    { seg: 'live', label: 'Live View', route: '#/analytics/live' },
  ];
  function subNavHTML(active) {
    // Horizontal padding mirrors .view-wrap so the tab bar lines up with the
    // page content below it; the content view keeps its own .view-wrap padding.
    return `<div class="an-subnav" style="padding:14px 30px 0">
      <div class="tabs">${SUBNAV.map((t) =>
        `<div class="tab${t.seg === active ? ' active' : ''}" data-route="${t.route}">${t.label}</div>`).join('')}</div>
    </div>`;
  }
  function wireSubNav(scope) {
    (scope || root).querySelectorAll('.tabs [data-route]').forEach((t) =>
      (t.onclick = () => { location.hash = t.getAttribute('data-route'); }));
  }

  // ---------------- Reusable UI ----------------
  const topBar = (title, refreshed) => `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-baseline gap-3">
        <h1 class="page-title">${title}</h1>
        ${refreshed ? `<span class="muted" style="font-size:13px">Last refreshed: ${refreshed}</span>` : ''}
      </div>
    </div>`;

  // ---------------- Toolbar chips: date / comparison / currency / time unit ----------------
  const CHIP_STATE = { date: 'May 1–26, 2026', comparison: 'No comparison', currency: 'USD $', timeunit: 'Day', _range: { s: 0, e: 25 } };
  let onChipChange = null;
  function chipBar(opts) {
    opts = opts || {};
    const chip = (key, icon) => `<span class="chip" data-chip="${key}">${icon}<span class="chip-label" data-chip-label="${key}">${CHIP_STATE[key]}</span>${ICON.chevDown}</span>`;
    // Date range reuses the shared Orders dual-month picker (widgets.js enhanceRange) for a consistent, roomy calendar.
    const dateBox = `<div class="ui-range filter-input" data-ui-range data-ph="Date range" style="width:248px">` +
      `<input type="hidden" id="an-dstart" data-range="start" value="2026-05-01"/><input type="hidden" id="an-dend" data-range="end" value="2026-05-26"/></div>`;
    let html = `<div class="flex items-center gap-2 mb-4">` + dateBox + chip('comparison', ICON.compare);
    // currency switcher removed — analytics uses the store's default currency (USD)
    if (opts.timeunit) html += `<span class="chip" data-chip="timeunit">${ICON.calendar}<span class="muted" style="margin-right:4px">Time unit:</span><span class="chip-label" data-chip-label="timeunit">${CHIP_STATE.timeunit}</span>${ICON.chevDown}</span>`;
    return html + `</div>`;
  }
  function setChip(key, label) { document.querySelectorAll(`[data-chip-label="${key}"]`).forEach((e) => (e.textContent = label)); CHIP_STATE[key] = label; if (onChipChange) onChipChange(key, label); }
  function openPopover(anchor, html, onMount) {
    document.querySelectorAll('.pop-layer').forEach((p) => p.remove());
    const layer = document.createElement('div'); layer.className = 'pop-layer';
    const pop = document.createElement('div'); pop.className = 'menu-pop'; pop.style.position = 'fixed'; pop.innerHTML = html;
    layer.appendChild(pop); document.body.appendChild(layer);
    const r = anchor.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = r.left + 'px';
    const close = () => layer.remove();
    setTimeout(() => document.addEventListener('mousedown', function hh(e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) { close(); document.removeEventListener('mousedown', hh); } }), 0);
    if (onMount) onMount(pop, close);
  }
  function compareRangeLabel(kind) {
    const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const s = CHIP_STATE._range.s, e = CHIP_STATE._range.e, len = e - s + 1;
    const baseStart = new Date(2026, 4, s + 1);
    let st, en;
    if (kind === 'Previous year') { st = new Date(2025, 4, s + 1); en = new Date(2025, 4, e + 1); }
    else if (kind === 'Previous year (match day of week)') { st = new Date(baseStart); st.setDate(st.getDate() - 364); en = new Date(st); en.setDate(en.getDate() + len - 1); }
    else { en = new Date(baseStart); en.setDate(en.getDate() - 1); st = new Date(en); st.setDate(st.getDate() - (len - 1)); }
    const f = (d) => `${MN[d.getMonth()]} ${d.getDate()}`;
    return `${f(st)} – ${f(en)}, ${en.getFullYear()}`;
  }
  function openChip(el) {
    const key = el.getAttribute('data-chip');
    if (key === 'comparison') {
      const opts = ['No comparison', 'Previous period', 'Previous year', 'Previous year (match day of week)', 'Custom'];
      openPopover(el, opts.map((o) => `<div class="opt" data-v="${o}">${o}</div>`).join(''), (pop, close) => pop.querySelectorAll('[data-v]').forEach((o) => (o.onclick = () => {
        const v = o.getAttribute('data-v');
        if (v === 'Custom') { close(); openDatePopover(el, 'comparison'); return; }
        setChip('comparison', v === 'No comparison' ? 'No comparison' : compareRangeLabel(v));
        close();
      })));
    } else if (key === 'currency') {
      const cur = ['USD $', 'EUR €', 'GBP £', 'AUD $', 'CAD $', 'JPY ¥', 'CNY ¥', 'AED د.إ', 'SGD $', 'HKD $', 'NZD $', 'INR ₹'];
      openPopover(el, `<input class="input" id="cur-q" placeholder="Search for a currency" style="margin-bottom:6px;width:220px" /><div id="cur-list" style="max-height:220px;overflow:auto">${cur.map((c) => `<div class="opt" data-v="${c}">${c}</div>`).join('')}</div>`, (pop, close) => {
        const wire = () => pop.querySelectorAll('[data-v]').forEach((o) => (o.onclick = () => { setChip('currency', o.getAttribute('data-v')); close(); }));
        wire();
        pop.querySelector('#cur-q').oninput = (e) => { const q = e.target.value.toLowerCase(); pop.querySelector('#cur-list').innerHTML = cur.filter((c) => c.toLowerCase().includes(q)).map((c) => `<div class="opt" data-v="${c}">${c}</div>`).join(''); wire(); };
        pop.querySelector('#cur-q').focus();
      });
    } else if (key === 'timeunit') {
      openPopover(el, ['Day', 'Week', 'Month'].map((o) => `<div class="opt" data-v="${o}">${o}</div>`).join(''), (pop, close) => pop.querySelectorAll('[data-v]').forEach((o) => (o.onclick = () => { setChip('timeunit', o.getAttribute('data-v')); close(); })));
    } else if (key === 'date') {
      openDatePopover(el);
    }
  }
  function openDatePopover(anchor, target) {
    target = target || 'date';
    const presets = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'This month', 'Last month', 'Custom range'];
    const sel = { start: null, end: null };
    const mName = (m) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m];
    const grid = (y, m) => {
      const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
      const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      let cells = '';
      for (let i = 0; i < first; i++) cells += '<div></div>';
      for (let d = 1; d <= days; d++) cells += `<div class="cal-day" data-d="${y}-${m + 1}-${d}">${d}</div>`;
      return `<div><div style="font-weight:600;text-align:center;margin-bottom:6px;font-size:13px">${mName(m)} ${y}</div><div class="cal-grid">${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => `<div class="cal-h">${w}</div>`).join('')}${cells}</div></div>`;
    };
    const html = `<div style="display:flex;gap:14px">
      <div style="border-right:1px solid var(--hair);padding-right:12px;min-width:118px">${presets.map((p) => `<div class="opt" data-preset="${p}">${p}</div>`).join('')}</div>
      <div><div style="display:flex;gap:18px">${grid(2026, 3)}${grid(2026, 4)}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn btn-default" data-x>Cancel</button><button class="btn btn-primary" data-apply>Apply</button></div></div></div>`;
    openPopover(anchor, html, (pop, close) => {
      pop.style.maxHeight = 'none';
      const fmt = (s) => { const a = s.split('-'); return `${mName(+a[1] - 1).slice(0, 3)} ${a[2]}, ${a[0]}`; };
      const PR = { 'Today': [25, 25], 'Yesterday': [24, 24], 'Last 7 days': [19, 25], 'Last 30 days': [0, 25], 'Last 90 days': [0, 25], 'This month': [0, 25], 'Last month': [0, 25] };
      pop.querySelectorAll('[data-preset]').forEach((o) => (o.onclick = () => { const p = o.getAttribute('data-preset'); if (p !== 'Custom range') { if (target === 'date') CHIP_STATE._range = { s: PR[p][0], e: PR[p][1] }; setChip(target, p); close(); } }));
      pop.querySelectorAll('[data-d]').forEach((d) => (d.onclick = () => {
        const v = d.getAttribute('data-d');
        if (!sel.start || sel.end) { sel.start = v; sel.end = null; } else { sel.end = v; }
        pop.querySelectorAll('[data-d]').forEach((x) => x.classList.toggle('sel', x.getAttribute('data-d') === sel.start || x.getAttribute('data-d') === sel.end));
      }));
      pop.querySelector('[data-x]').onclick = close;
      pop.querySelector('[data-apply]').onclick = () => { if (sel.start) { const ix = (s) => { const a = s.split('-'); return a[1] === '5' ? Math.min(25, Math.max(0, +a[2] - 1)) : 0; }; let s = ix(sel.start), e = sel.end ? ix(sel.end) : s; if (e < s) { const tmp = s; s = e; e = tmp; } if (target === 'date') CHIP_STATE._range = { s, e }; setChip(target, sel.end ? `${fmt(sel.start)} – ${fmt(sel.end)}` : fmt(sel.start)); } close(); };
    });
  }

  // ---------------- Overview view ----------------
  // metric explanations (hover tooltip) + card→report links
  // SHOPLINE-style "how is this metric calculated" tooltips — adapted to our trimmed model (no tax / tip / duty / points / gift cards)
  const METRIC_INFO = {
    gross_sales: ['Gross sales', 'Product revenue before discounts and returns.', 'Gross sales = Σ (unit price × quantity)'],
    discounts: ['Discounts', 'Total reduction from discount codes and automatic promotions.', 'Discounts = product + order + shipping discounts'],
    returns: ['Returns', 'Value of items returned during the period.'],
    net_sales: ['Net sales', 'Sales after discounts and returns, before shipping.', 'Net sales = Gross sales − Discounts − Returns'],
    total_sales: ['Total sales', 'What your store actually took in.', 'Total sales = Net sales + Shipping  ·  (tax N/A in our model)'],
    aov: ['Average order value', 'Average value of an order.', 'AOV = Net sales ÷ Orders'],
    gross_profit: ['Gross profit', 'Profit after cost of goods sold (COGS captured at sale time).', 'Gross profit = Net sales − COGS'],
    gross_margin: ['Gross margin', 'Gross profit as a share of net sales.', 'Gross margin = Gross profit ÷ Net sales'],
    orders: ['Orders', 'Number of orders placed, across all sales channels.'],
    orders_fulfilled: ['Orders fulfilled', 'Orders fulfilled in the selected period.'],
    refunds: ['Refund amount', 'Total refunded back to customers in the period.'],
    returning_rate: ['Returning customer rate', 'Share of ordering customers who were returning.', 'Returning rate = returning customers ÷ customers'],
    sessions: ['Sessions', 'Visits to your online store. Source: self-hosted Sensors (神策).', 'A session ends after 30 min of inactivity'],
    page_views: ['Page views', 'Total pages viewed across all sessions. Source: 神策.'],
    conversion_rate: ['Conversion rate', 'Share of sessions that completed checkout.', 'Conversion rate = completed-checkout sessions ÷ sessions'],
    attributed_sales: ['Sales attributed to marketing', 'Sales from sessions that arrived via a marketing channel (last-touch attribution).'],
  };
  const KPI_LINK = {
    total_sales: { report: 'sales_over_time', tip: 'total_sales' },
    orders: { report: 'orders_over_time', tip: 'orders' },
    aov: { report: 'aov_over_time', tip: 'aov' },
    returning_rate: { report: 'new_vs_returning', tip: 'returning_rate' },
  };
  const TITLE_MAP = {
    'Sessions': { report: 'sessions_over_time', tip: 'sessions' },
    'Page views': { report: 'sessions_over_time', tip: 'page_views' },
    'Orders fulfilled': { report: 'fulfillment_status', tip: 'orders_fulfilled' },
    'Paid amount': { report: 'payments_over_time', tip: 'total_sales' },
    'Refund amount': { report: 'refunds_over_time', tip: 'refunds' },
    'Sales attributed to marketing': { report: 'sales_attributed_marketing', tip: 'attributed_sales' },
    'Conversion rate': { report: 'conversion_funnel', tip: 'conversion_rate' },
    'Top products': { report: 'sales_by_product', tip: 'total_sales' },
    'Sessions by device type': { report: 'sessions_by_device', tip: 'sessions' },
    'Sessions by country/region': { report: 'sessions_by_location', tip: 'sessions' },
    'Sessions by traffic source': { report: 'performance_by_channel', tip: 'sessions' },
    'Sessions by social source': { report: 'social_referrer_sales', tip: 'sessions' },
    'Popular sales by referrer source': { report: 'sales_by_referrer', tip: 'total_sales' },
    'Top landing pages by sessions': { report: 'sessions_by_landing', tip: 'sessions' },
    'Customer group analysis': { report: 'customer_cohort' },
    'New vs returning customers': { report: 'new_vs_returning', tip: 'returning_rate' },
    'Popular referral websites': { report: 'sessions_by_referrer', tip: 'sessions' },
  };
  function viewOverview(view) {
    view.innerHTML = `<div class="view-wrap">
      ${topBar('Analytics', '4:00 AM')}
      ${chipBar({ currency: true })}
      <div class="grid grid-cols-4 gap-4 mb-4" id="kpis"></div>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="panel card-pad"><div class="card-link-title mb-1">Sessions</div><div class="stat-value mb-2">${SESSIONS_TREND.total}</div><div class="chart" id="c-sessions"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-1">Page views</div><div class="stat-value mb-2">${PAGEVIEWS_TREND.total}</div><div class="chart" id="c-pageviews"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-1">Orders fulfilled</div><div class="stat-value mb-2">${ORDERS_FULFILLED_TREND.total}</div><div class="chart" id="c-fulfilled"></div></div>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="panel card-pad"><div class="card-link-title mb-1">Paid amount</div><div class="stat-value mb-2">${PAID_AMOUNT_TREND.total}</div><div class="chart" id="c-paid"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-1">Refund amount</div><div class="stat-value mb-2">${REFUND_TREND.total}</div><div class="chart" id="c-refund"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-1">Sales attributed to marketing</div><div class="stat-value mb-2">${MARKETING_SALES_TREND.total}</div><div class="chart" id="c-marketing"></div></div>
      </div>
      <div class="grid grid-cols-1 gap-4 mb-4">
        <div class="panel card-pad">
          <div class="card-link-title mb-1">Conversion rate</div>
          <div class="stat-value mb-3">2.3%</div>
          <div class="grid grid-cols-4 gap-3" id="funnel"></div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="panel card-pad"><div class="card-link-title mb-2">Top products</div><div class="chart" id="c-product"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-2">Sessions by device type</div><div class="chart" id="c-device"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-2">Sessions by country/region</div><div class="chart" id="c-country"></div></div>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="panel card-pad"><div class="card-link-title mb-2">Sessions by traffic source</div><div class="chart" id="c-traffic"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-2">Sessions by social source</div><div class="chart" id="c-socialsrc"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-2">Popular sales by referrer source</div><div class="chart" id="c-refsales"></div></div>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="panel card-pad"><div class="card-link-title mb-2">Top landing pages by sessions</div><div id="landing"></div></div>
        <div class="panel card-pad col-span-2"><div class="card-link-title mb-3">Customer group analysis</div><div style="height:300px" id="c-cohort"></div></div>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="panel card-pad col-span-2"><div class="card-link-title mb-2">New vs returning customers</div><div class="chart" id="c-newret"></div></div>
        <div class="panel card-pad"><div class="card-link-title mb-2">Popular referral websites</div><div id="referrals"></div></div>
      </div>
    </div>`;

    // KPI cards
    document.getElementById('kpis').innerHTML = KPIS.map((k, i) => `
      <div class="panel card-pad" data-report="${(KPI_LINK[k.key] || {}).report || ''}" style="cursor:pointer">
        <span class="muted" style="font-size:13px;border-bottom:1px dashed var(--ctl)" data-tip="${(KPI_LINK[k.key] || {}).tip || ''}">${k.label}</span>
        <div class="flex items-end justify-between mt-1">
          <div class="stat-value">${k.value}</div>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="${k.up ? 'delta-up' : 'delta-down'}">${k.delta}</span>
          <div style="width:96px;height:28px" id="spark-${i}"></div>
        </div>
      </div>`).join('');

    // funnel
    document.getElementById('funnel').innerHTML = FUNNEL.map((f, i) => `
      <div>
        <div class="muted" style="font-size:12px">${f.stage}</div>
        <div style="font-size:18px;font-weight:600;margin:2px 0">${f.pct}</div>
        <div style="height:80px;display:flex;align-items:flex-end">
          <div style="width:100%;background:var(--brand);opacity:${1 - i * 0.18};height:${[100, 30, 55, 42][i]}%;border-radius:6px 6px 0 0"></div>
        </div>
        <div class="muted" style="font-size:12px;margin-top:4px">${f.value}</div>
      </div>`).join('');

    // static side lists (no comparison effect)
    document.getElementById('landing').innerHTML = LANDING_PAGES.map((r) => `
      <div class="flex items-center justify-between py-2" style="border-bottom:1px solid var(--hair)">
        <span class="subtle" style="font-size:13px;max-width:68%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.page}</span>
        <span style="font-variant-numeric:tabular-nums">${r.value.toLocaleString()}</span>
      </div>`).join('');
    const REFERRAL_SITES = [['google.com', 134700], ['instagram.com', 81000], ['m.facebook.com', 54200], ['facebook.com', 33100], ['t.co', 12685], ['youtube.com', 7300]];
    document.getElementById('referrals').innerHTML = `<div class="flex items-center justify-between" style="padding:2px 0 6px;border-bottom:1px solid var(--hair)"><span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.03em">External referrer website</span><span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.03em">Sessions</span></div>` + REFERRAL_SITES.map((r) => `<div class="flex items-center justify-between py-2" style="border-bottom:1px solid var(--hair)"><span class="subtle" style="font-size:13px">${r[0]}</span><span style="font-variant-numeric:tabular-nums">${r[1].toLocaleString()}</span></div>`).join('');
    const NEWRET_NEW = SALES_TREND.values.map((v) => Math.round(v / 620));
    const NEWRET_RET = SALES_TREND.values.map((v, i) => Math.round(v / 1900) + (i % 3));
    // charts — re-render with Comparison series when the chip changes (R20)
    function paintCharts() {
      disposeCharts();
      const comp = CHIP_STATE.comparison !== 'No comparison';
      const cd = (a) => comp ? a.map((v) => Math.round(v * 0.9)) : null;
      const cdc = (d) => comp ? d.map((x) => Math.round(x.value * 0.9)) : null;
      KPIS.forEach((k, i) => mkChart(document.getElementById('spark-' + i), sparkOpt(SALES_TREND.values.map((v) => v * (0.6 + i * 0.1)), k.up)));
      mkChart(document.getElementById('c-sessions'), mkLineOpt(SESSIONS_TREND.dates, SESSIONS_TREND.values, '#5ab1ef', cd(SESSIONS_TREND.values)));
      mkChart(document.getElementById('c-pageviews'), mkLineOpt(PAGEVIEWS_TREND.dates, PAGEVIEWS_TREND.values, '#5ab1ef', cd(PAGEVIEWS_TREND.values)));
      mkChart(document.getElementById('c-fulfilled'), mkLineOpt(ORDERS_FULFILLED_TREND.dates, ORDERS_FULFILLED_TREND.values, '#0066e6', cd(ORDERS_FULFILLED_TREND.values)));
      mkChart(document.getElementById('c-paid'), mkLineOpt(PAID_AMOUNT_TREND.dates, PAID_AMOUNT_TREND.values, '#0066e6', cd(PAID_AMOUNT_TREND.values)));
      mkChart(document.getElementById('c-refund'), mkLineOpt(REFUND_TREND.dates, REFUND_TREND.values, '#D33612', cd(REFUND_TREND.values)));
      mkChart(document.getElementById('c-marketing'), mkLineOpt(MARKETING_SALES_TREND.dates, MARKETING_SALES_TREND.values, '#019680', cd(MARKETING_SALES_TREND.values)));
      mkChart(document.getElementById('c-product'), barOptH(SALES_BY_PRODUCT, '#0066e6', cdc(SALES_BY_PRODUCT)));
      mkChart(document.getElementById('c-device'), donutOpt(SESSIONS_BY_DEVICE, '1.32M', ['#0066e6', '#5ab1ef', '#a5c8ff', '#cfe1ff']));
      mkChart(document.getElementById('c-country'), barOptH(SESSIONS_BY_COUNTRY, '#5ab1ef', cdc(SESSIONS_BY_COUNTRY)));
      mkChart(document.getElementById('c-traffic'), barOptV(SESSIONS_BY_TRAFFIC, '#0066e6', cdc(SESSIONS_BY_TRAFFIC)));
      mkChart(document.getElementById('c-socialsrc'), barOptV(SESSIONS_BY_SOCIAL, '#5ab1ef', cdc(SESSIONS_BY_SOCIAL)));
      mkChart(document.getElementById('c-refsales'), barOptH(SALES_BY_REFERRER, '#0066e6', cdc(SALES_BY_REFERRER)));
      mkChart(document.getElementById('c-cohort'), heatmapOpt(COHORT));
      mkChart(document.getElementById('c-newret'), {
        grid: { left: 40, right: 16, top: 16, bottom: 36 }, tooltip: { trigger: 'axis' },
        legend: { bottom: 0, icon: 'roundRect', itemHeight: 3, itemWidth: 14, textStyle: { color: '#62708d', fontSize: 12 } },
        xAxis: { type: 'category', data: SALES_TREND.dates, boundaryGap: false, axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#94a3b8', fontSize: 11, interval: 4 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f3f6' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
        series: [{ type: 'line', name: 'New customers', data: NEWRET_NEW, smooth: true, symbol: 'none', lineStyle: { color: '#0066e6', width: 2 } }, { type: 'line', name: 'Returning customers', data: NEWRET_RET, smooth: true, symbol: 'none', lineStyle: { color: '#5ab1ef', width: 2 } }],
      });
    }
    paintCharts();
    onChipChange = () => paintCharts();

    // every card title → clickable into its report; attach metric tooltips
    view.querySelectorAll('.card-link-title').forEach((t) => {
      const m = TITLE_MAP[t.textContent.trim()]; if (!m) return;
      t.setAttribute('data-report', m.report);
      if (m.tip) t.setAttribute('data-tip', m.tip);
    });
    view.querySelectorAll('[data-report]').forEach((el) => el.addEventListener('click', () => { const r = el.getAttribute('data-report'); if (r) location.hash = '#/analytics/reports/' + r; }));
  }

  // ---------------- ECharts option helpers ----------------
  function lineOpt(dates, values, color) {
    return {
      grid: { left: 48, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis', axisPointer: { lineStyle: { color: '#019680' } } },
      xAxis: { type: 'category', data: dates, boundaryGap: false, axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#94a3b8', fontSize: 11, interval: 4 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f3f6' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
      series: [{ type: 'line', data: values, smooth: true, symbol: 'none', lineStyle: { color, width: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + '33' }, { offset: 1, color: color + '05' }]) } }],
    };
  }
  function sparkOpt(values, up) {
    const color = up ? '#008051' : '#D33612';
    return { grid: { left: 0, right: 0, top: 2, bottom: 2 }, xAxis: { type: 'category', show: false, boundaryGap: false }, yAxis: { type: 'value', show: false }, series: [{ type: 'line', data: values, smooth: true, symbol: 'none', lineStyle: { color, width: 1.5 } }] };
  }
  function donutOpt(data, centerText, colors) {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, icon: 'circle', textStyle: { color: '#62708d', fontSize: 12 } },
      color: colors || ['#0066e6', '#5ab1ef', '#a5c8ff', '#cfe1ff'],
      series: [{ type: 'pie', radius: ['55%', '78%'], center: ['50%', '42%'], avoidLabelOverlap: true, label: { show: true, position: 'center', formatter: centerText || '', fontSize: 16, fontWeight: 600, color: '#242833' }, labelLine: { show: false }, data }],
    };
  }
  function barOptH(data, color, comp) {
    const series = [{ type: 'bar', name: 'Current', data: data.map((d) => d.value).reverse(), itemStyle: { color: color || '#0066e6', borderRadius: [0, 4, 4, 0] }, barMaxWidth: comp ? 10 : 22 }];
    if (comp) series.push({ type: 'bar', name: 'Comparison', data: [...comp].reverse(), itemStyle: { color: '#cbd5e1', borderRadius: [0, 4, 4, 0] }, barMaxWidth: 10 });
    return {
      grid: { left: 8, right: 40, top: comp ? 28 : 8, bottom: 8, containLabel: true },
      legend: comp ? { top: 0, right: 0, icon: 'roundRect', itemHeight: 8, textStyle: { color: '#62708d', fontSize: 11 } } : undefined,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', splitNumber: 3, splitLine: { lineStyle: { color: '#f1f3f6' } }, axisLabel: { color: '#94a3b8', fontSize: 11, formatter: (v) => v >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? +(v / 1e3).toFixed(0) + 'K' : v } },
      yAxis: { type: 'category', data: data.map((d) => d.name).reverse(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#62708d', fontSize: 11, width: 150, overflow: 'truncate' } },
      series,
    };
  }
  function heatmapOpt(c) {
    const data = [];
    c.matrix.forEach((row, y) => row.forEach((v, x) => { if (v != null) data.push([x, c.cohorts.length - 1 - y, v]); }));
    return {
      tooltip: { position: 'top', formatter: (p) => `${c.cohorts[c.cohorts.length - 1 - p.value[1]]} · Month ${p.value[0]}: ${p.value[2]}%` },
      grid: { left: 86, right: 16, top: 8, bottom: 26 },
      xAxis: { type: 'category', data: c.cohorts.map((_, i) => 'Month ' + i), splitArea: { show: true }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
      yAxis: { type: 'category', data: [...c.cohorts].reverse(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#62708d', fontSize: 11 } },
      visualMap: { min: 0, max: 13, show: false, inRange: { color: ['#eef4ff', '#9bc0ff', '#0066e6'] } },
      series: [{ type: 'heatmap', data, label: { show: true, formatter: (p) => p.value[2] + '%', fontSize: 10, color: '#1f2937' }, itemStyle: { borderColor: '#fff', borderWidth: 2 }, emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,.2)' } } }],
    };
  }

  // ============ Reports library + report detail/builder (S2 + S3) ============
  const prettify = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const isMoney = (m) => /sales|profit|amount|spent|aov|refund|discount|tax/i.test(m);
  const isRate = (m) => /rate|through/i.test(m);
  const fmtMetric = (m, v) => isMoney(m) ? '$' + v.toLocaleString() : isRate(m) ? v + '%' : v.toLocaleString();
  const srcTag = (s) => `<span class="src-tag src-${s}"><span class="dot"></span>${s}</span>`;
  // Top-center success toast (Ant Design message parity) — mirrors store admin, not a bottom bar (C78).
  const toast = (msg) => { const t = document.createElement('div'); t.innerHTML = '<span style="color:#1f8f4e;display:inline-flex;font-weight:700">✓</span><span>' + msg + '</span>'; t.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;background:#fff;color:#1f2433;border:1px solid #e6e8ee;padding:9px 16px;border-radius:8px;font-size:13.5px;z-index:200;box-shadow:0 6px 20px rgba(20,30,55,.14)'; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };

  const DIM_LABELS = {
    product_title: ['3D Anti-Cellulite Leggings', 'Pocket Sculpting Leggings', 'Compression Sleeves', 'Short Leggings', 'Butt-Lifting Capris', 'Seamless Briefs'],
    variant: ['Black / S', 'Black / M', 'Black / L', 'Black / XL', 'Grey / M', 'Grey / L'],
    channel: ['Online Store', 'Shop', 'Draft Orders', 'POS'],
    billing_country: ['United States', 'Australia', 'United Kingdom', 'Canada', 'Germany'],
    country: ['United States', 'Australia', 'United Kingdom', 'Canada', 'Germany'],
    city: ['Chicago', 'Sydney', 'Atlanta', 'Houston', 'Melbourne'],
    currency: ['USD', 'AUD', 'GBP', 'CAD', 'EUR'],
    discount_code: ['WELCOME10', 'SUMMER20', 'FREESHIP', 'VIP15', 'BF30'],
    payment_method: ['Card', 'PayPal', 'Apple Pay', 'Google Pay'],
    fulfillment_status: ['Fulfilled', 'Partial Fulfilled', 'Unfulfilled'],
    customer_type: ['New', 'Returning'], spend_tier: ['High', 'Medium', 'Low'],
    device: ['Mobile', 'Desktop', 'Tablet', 'Other'],
    referrer: ['Direct', 'Search', 'Social', 'Referral', 'Email'],
    social_referrer: ['facebook', 'instagram', 'youtube', 'pinterest'],
    utm_campaign: ['spring_sale', 'retargeting', 'bf_promo', 'newsletter'],
    landing_page: ['/products/3d-anti-cellulite-legging', '/products/silix-high-waist', '/ (Homepage)', '/products/short-leggings', '/apps/bestrack'],
    abc_grade: ['A', 'B', 'C'], tax_region: ['US-CA', 'US-NY', 'AU-NSW', 'UK', 'DE'],
    path_step: ['Home → PDP', 'PDP → Cart', 'Cart → Checkout', 'Checkout → Purchase'],
    funnel_step: ['Sessions', 'Added to cart', 'Reached checkout', 'Completed checkout'],
    breakdown_item: ['Gross sales', 'Discounts', 'Returns', 'Net sales', 'Shipping', 'Taxes', 'Total sales'],
    order_no: ['SILIX1042', 'SILIX1041', 'SILIX1040', 'SILIX1039', 'SILIX1038'],
    customer_name: ['Emma W.', 'Liam S.', 'Olivia M.', 'Noah T.', 'Ava R.'],
    metric: ['Gross sales', 'Discounts', 'Net sales', 'Taxes', 'Total sales'],
  };
  const seedOf = (s) => { let h = 9; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x45d9f3b) >>> 0; return h >>> 0; };
  const rand = (r) => { r.s = (Math.imul(r.s, 1664525) + 1013904223) >>> 0; return r.s / 4294967296; };
  const genSeries = (seed, base) => { const r = { s: seed }; return SALES_TREND.dates.map(() => Math.round(base * (0.6 + rand(r) * 0.8))); };
  const genCats = (seed, dim, base) => { const r = { s: seed }; return (DIM_LABELS[dim] || ['A', 'B', 'C', 'D', 'E']).map((n, i) => ({ name: n, value: Math.round(base * (1 - i * 0.14) * (0.7 + rand(r) * 0.5)) })); };
  function barOptV(data, color, comp) {
    const series = [{ type: 'bar', name: 'Current', data: data.map((d) => d.value), itemStyle: { color: color || '#0066e6', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 36 }];
    if (comp) series.push({ type: 'bar', name: 'Comparison', data: comp, itemStyle: { color: '#cbd5e1', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 36 });
    return { grid: { left: 8, right: 8, top: comp ? 28 : 16, bottom: 24, containLabel: true },
      legend: comp ? { top: 0, right: 0, icon: 'roundRect', itemHeight: 8, textStyle: { color: '#62708d', fontSize: 11 } } : undefined,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: data.map((d) => d.name), axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#62708d', fontSize: 11 } },
      yAxis: { type: 'value', splitNumber: 3, splitLine: { lineStyle: { color: '#f1f3f6' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
      series };
  }
  const KNOWN_VIZ = {
    sales_over_time: { viz: 'line', fn: () => lineOpt(SALES_TREND.dates, SALES_TREND.values, '#0066e6') },
    sessions_over_time: { viz: 'line', fn: () => lineOpt(SESSIONS_TREND.dates, SESSIONS_TREND.values, '#5ab1ef') },
    aov_over_time: { viz: 'line', fn: () => lineOpt(AOV_TREND.dates, AOV_TREND.values, '#019680') },
    sales_by_channel: { viz: 'donut', fn: () => donutOpt(SALES_BY_CHANNEL, '$1.82M', ['#0066e6', '#5ab1ef', '#a5c8ff']) },
    sessions_by_device: { viz: 'donut', fn: () => donutOpt(SESSIONS_BY_DEVICE, '1.32M', ['#0066e6', '#5ab1ef', '#a5c8ff', '#cfe1ff']) },
    sales_by_product: { viz: 'barH', fn: () => barOptH(SALES_BY_PRODUCT, '#0066e6') },
    sessions_by_location: { viz: 'barH', fn: () => barOptH(SESSIONS_BY_LOCATION, '#5ab1ef') },
    social_referrer_sales: { viz: 'barH', fn: () => barOptH(SOCIAL_REFERRER, '#0066e6') },
  };
  function vizOption(cfg) {
    if (KNOWN_VIZ[cfg.id] && KNOWN_VIZ[cfg.id].viz === cfg.viz) return KNOWN_VIZ[cfg.id].fn();
    const seed = seedOf(cfg.id || cfg.metrics.join() + cfg.dims.join());
    const m = cfg.metrics[0] || 'value', d = cfg.dims.find((x) => !['day', 'week', 'month'].includes(x)) || 'product_title';
    const base = isRate(m) ? 5 : isMoney(m) ? 90000 : 1400;
    switch (cfg.viz) {
      case 'line': return lineOpt(SALES_TREND.dates, genSeries(seed, base), cfg.source === 'Behavior' ? '#5ab1ef' : '#0066e6');
      case 'bar': return barOptV(genCats(seed, d, base), '#0066e6');
      case 'barH': return barOptH(genCats(seed, d, base), cfg.source === 'Behavior' ? '#5ab1ef' : '#0066e6');
      case 'donut': return donutOpt(genCats(seed, d, base).slice(0, 4), '', ['#0066e6', '#5ab1ef', '#a5c8ff', '#cfe1ff']);
      case 'cohort': return heatmapOpt(COHORT);
      default: return null;
    }
  }
  function renderVizInto(node, cfg) {
    if (cfg.viz === 'table') { node.parentElement.style.display = 'none'; return; }
    node.parentElement.style.display = '';
    if (cfg.viz === 'single') { node.innerHTML = `<div style="padding:24px 4px"><div class="stat-value" style="font-size:40px">${fmtMetric(cfg.metrics[0] || '', 4127)}</div><div class="muted mt-1">${prettify(cfg.metrics[0] || 'Value')}</div></div>`; return; }
    if (cfg.viz === 'funnel') { node.innerHTML = `<div class="grid grid-cols-4 gap-3 mt-2">${FUNNEL.map((f, i) => `<div><div class="muted" style="font-size:12px">${f.stage}</div><div style="font-size:18px;font-weight:600;margin:2px 0">${f.pct}</div><div style="height:90px;display:flex;align-items:flex-end"><div style="width:100%;background:var(--brand);opacity:${1 - i * 0.18};height:${[100, 30, 55, 42][i]}%;border-radius:6px 6px 0 0"></div></div><div class="muted" style="font-size:12px;margin-top:4px">${f.value}</div></div>`).join('')}</div>`; return; }
    const opt = vizOption(cfg); if (opt) { node.style.height = '300px'; mkChart(node, opt); }
  }

  // ----- Reports library -----
  const CAT_DESC = {
    'Checkout performance': 'Revenue, completed orders, and average order value from BestCheckout.',
    'Purchase flows': 'See where buyers move forward or leave each configured purchase flow.',
    Offers: 'Compare upsell, downsell, and order-bump results by the discount used.',
    Payments: 'Review payment approval so you can improve the checkout experience.',
    Traffic: 'Understand which traffic sources and landing pages convert through checkout.',
  };
  function viewReports(view) {
    const state = { q: '' };
    const recent = REPORTS.filter((r) => r.viewed && r.viewed !== '—').slice().sort((a, b) => (a.viewed < b.viewed ? 1 : -1)).slice(0, 3);
    function cardFor(cat) {
      const items = REPORTS.filter((r) => r.cat === cat && (!state.q || r.name.toLowerCase().includes(state.q)));
      if (state.q && !items.length) return '';
      return `<div class="rep-card">
        <div class="rep-card-title">${cat}</div>
        <div class="rep-card-desc">${CAT_DESC[cat] || ''}</div>
        <div class="rep-card-sub">Report</div>
        ${items.map((r) => `<div class="rep-link" data-open="${r.id}">${r.name}</div>`).join('')}
      </div>`;
    }
    function render() {
      const favIds = FAV.list().filter((id) => REPORTS.find((r) => r.id === id));
      const fav = favIds.length
        ? `<div class="rep-card"><div class="rep-card-title">${ICON.star || '★'} My favorites</div><div class="rep-card-sub" style="margin-top:8px">Report</div>${favIds.map((id) => `<div class="rep-link" data-open="${id}">${REPORTS.find((r) => r.id === id).name}</div>`).join('')}</div>`
        : `<div class="rep-card"><div class="rep-card-title">${ICON.star || '★'} My favorites</div><div class="muted" style="font-size:13px;padding:6px 0 2px">You haven't favorited any reports yet.</div></div>`;
      const customs = CUSTOM.list();
      const customCard = `<div class="rep-card"><div class="rep-card-title">${ICON.star || '★'} Custom reports</div>${customs.length ? `<div class="rep-card-sub" style="margin-top:8px">Report</div>${customs.map((c) => `<div class="rep-link" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span data-open="${c.baseId || 'sales_over_time'}" style="flex:1;cursor:pointer">${c.name}</span><span data-delcustom="${c.id}" data-cname="${c.name}" title="Delete" style="cursor:pointer;color:var(--ink-muted)">×</span></div>`).join('')}` : `<div class="muted" style="font-size:13px;padding:6px 0 2px">No custom reports yet. Open a report and click Save as.</div>`}</div>`;
      view.innerHTML = `<div class="view-wrap">
        <div class="flex items-center justify-between mb-3"><h1 class="page-title">Reports</h1></div>
        <div class="flex items-center gap-2 mb-3" style="flex-wrap:wrap"><span class="muted" style="font-size:13px">Recently viewed</span>${recent.map((r) => `<span class="chip" data-open="${r.id}" style="height:28px;font-size:12.5px">${r.name}</span>`).join('')}</div>
        <div style="position:relative;margin-bottom:18px"><span style="position:absolute;left:12px;top:10px;color:var(--ink-muted)">${ICON.search}</span><input id="rsearch" class="filter-input" placeholder="Title" value="${state.q}" style="width:100%" /></div>
        <div class="rep-grid">${fav}${customCard}${REPORT_CATEGORIES.map(cardFor).join('')}</div>
        <div class="muted" style="font-size:13px;text-align:center;margin-top:24px">Learn more about Reports</div>
      </div>`;
      view.querySelectorAll('[data-open]').forEach((e) => (e.onclick = () => (location.hash = '#/analytics/reports/' + e.getAttribute('data-open'))));
      view.querySelectorAll('[data-delcustom]').forEach((e) => (e.onclick = (ev) => { ev.stopPropagation(); deleteCustomModal(e.getAttribute('data-delcustom'), e.getAttribute('data-cname'), render); }));
      const si = document.getElementById('rsearch');
      if (si) si.oninput = (e) => { state.q = e.target.value.toLowerCase(); const pos = e.target.selectionStart; render(); const n = document.getElementById('rsearch'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} };
    }
    render();
  }

  const getReport = (id) => REPORTS.find((r) => r.id === id);
  // ----- Report data model + transforms (so toolbar filters truly affect data) -----
  const CUR = { 'USD $': { sym: '$', rate: 1 }, 'EUR €': { sym: '€', rate: 0.92 }, 'GBP £': { sym: '£', rate: 0.79 }, 'AUD $': { sym: 'A$', rate: 1.52 }, 'CAD $': { sym: 'C$', rate: 1.37 }, 'JPY ¥': { sym: '¥', rate: 157 }, 'CNY ¥': { sym: '¥', rate: 7.2 }, 'SGD $': { sym: 'S$', rate: 1.35 }, 'HKD $': { sym: 'HK$', rate: 7.8 }, 'NZD $': { sym: 'NZ$', rate: 1.66 }, 'INR ₹': { sym: '₹', rate: 83 }, 'AED د.إ': { sym: 'AED ', rate: 3.67 } };
  function buildModel(r) {
    if (r.viz === 'funnel') return { kind: 'funnel', metricKeys: ['sessions'], dim: 'funnel_step', rows: FUNNEL.map((f) => ({ label: f.stage, vals: { sessions: parseInt(String(f.value).replace(/,/g, '')) || 0 } })) };
    if (r.viz === 'cohort') return { kind: 'cohort', metricKeys: [], rows: [] };
    const metricKeys = r.metrics.slice();
    const seed = seedOf(r.id);
    const timeDim = r.dims.find((d) => ['day', 'week', 'month'].includes(d));
    if (timeDim === 'day' || r.viz === 'line') {
      const known = { total_sales: SALES_TREND.values, gross_sales: SALES_TREND.values, sessions: SESSIONS_TREND.values, aov: AOV_TREND.values, conversion_rate: CONV_RATE_TREND.values };
      const series = {}; metricKeys.forEach((m, mi) => (series[m] = known[m] || genSeries(seed + mi * 97, isRate(m) ? 4 : isMoney(m) ? 80000 : 1200)));
      const rows = SALES_TREND.dates.map((d, i) => ({ label: d, vals: Object.fromEntries(metricKeys.map((m) => [m, series[m][i]])) }));
      return { kind: 'time', dim: 'Day', metricKeys, rows };
    }
    const dim = r.dims.find((d) => !['day', 'week', 'month'].includes(d)) || r.dims[0] || 'metric';
    const knownCat = { sales_by_product: SALES_BY_PRODUCT, sessions_by_device: SESSIONS_BY_DEVICE, sessions_by_location: SESSIONS_BY_LOCATION, social_referrer_sales: SOCIAL_REFERRER, sales_by_referrer: SALES_BY_REFERRER, sessions_by_referrer: SESSIONS_BY_REFERRER, sales_by_channel: SALES_BY_CHANNEL };
    const src = knownCat[r.id];
    const labels = src ? src.map((x) => x.name) : (DIM_LABELS[dim] || ['Row 1', 'Row 2', 'Row 3', 'Row 4', 'Row 5']);
    const rows = labels.map((l, i) => ({ label: l, vals: Object.fromEntries(metricKeys.map((m, mi) => { const rr = { s: seed + i * 131 + mi * 17 }; const base = src && mi === 0 ? src[i].value : Math.round((isMoney(m) ? 60000 : isRate(m) ? 100 : 900) * (0.35 + rand(rr) * 0.65)); return [m, base]; })) }));
    return { kind: 'cat', dim, metricKeys, rows };
  }
  function aggRows(rows, unit, keys) {
    if (unit === 'Day' || !rows.length) return rows;
    const size = unit === 'Week' ? 7 : rows.length, out = [];
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size), vals = {};
      keys.forEach((m) => { const s = chunk.reduce((a, b) => a + (b.vals[m] || 0), 0); vals[m] = isRate(m) ? s / chunk.length : s; });
      out.push({ label: unit === 'Month' ? 'May 2026' : `${chunk[0].label} – ${chunk[chunk.length - 1].label}`, vals });
    }
    return out;
  }
  function mkLineOpt(labels, vals, color, comp) {
    const series = [{ type: 'line', name: 'Selected period', data: vals, smooth: true, symbol: 'none', lineStyle: { color, width: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + '33' }, { offset: 1, color: color + '05' }]) } }];
    if (comp) series.push({ type: 'line', name: 'Comparison', data: comp, smooth: true, symbol: 'none', lineStyle: { color: '#94a3b8', width: 1.5, type: 'dashed' } });
    return { grid: { left: 54, right: 16, top: comp ? 30 : 16, bottom: 28 }, tooltip: { trigger: 'axis' }, legend: comp ? { top: 0, right: 0, icon: 'roundRect', itemHeight: 8, textStyle: { color: '#62708d', fontSize: 11 } } : undefined, xAxis: { type: 'category', data: labels, boundaryGap: false, axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#94a3b8', fontSize: 11, interval: labels.length > 14 ? 3 : 0 } }, yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f3f6' } }, axisLabel: { color: '#94a3b8', fontSize: 11, formatter: (v) => v >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? +(v / 1e3).toFixed(0) + 'K' : v } }, series };
  }
  // ---- Bespoke report renderers (SHOPLINE-style; generic template for the rest) ----
  const TREND_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline></svg>';
  function viewProductDataDetails(view) {
    const state = { dim: 'product', sortCol: null, sortDir: 'desc', page: 1, pageSize: 20, q: '', trend: null, focus: false, filters: [], metricsByDim: { product: ['Sales quantity', 'Sales', 'Sales %', 'Orders', 'Product views'], variant: ['Sales quantity', 'Sales', 'Sales %'] } };
    // Edit-able metric columns per dimension. Synth metrics derive from real fields so the table stays internally consistent.
    const METRICS = {
      product: [
        { l: 'Sales quantity', t: 'int', v: (x) => x.qty || 0 },
        { l: 'Sales', t: 'money', v: (x) => x.sales || 0 },
        { l: 'Sales %', t: 'pct', v: (x) => x.pct || 0 },
        { l: 'Orders', t: 'int', v: (x) => x.orders || 0 },
        { l: 'Product views', t: 'int', v: (x) => x.views || 0 },
        { l: 'Gross profit', t: 'money', v: (x) => Math.round((x.sales || 0) * 0.42) },
        { l: 'Refund amount', t: 'money', v: (x) => Math.round((x.sales || 0) * 0.03) },
        { l: 'Conversion rate', t: 'pct', v: (x) => (x.views ? Math.round((x.orders / x.views) * 1000) / 10 : 0) },
      ],
      variant: [
        { l: 'Sales quantity', t: 'int', v: (x) => x.qty || 0 },
        { l: 'Sales', t: 'money', v: (x) => x.sales || 0 },
        { l: 'Sales %', t: 'pct', v: (x) => x.pct || 0 },
        { l: 'Gross profit', t: 'money', v: (x) => Math.round((x.sales || 0) * 0.42) },
        { l: 'Refund amount', t: 'money', v: (x) => Math.round((x.sales || 0) * 0.03) },
      ],
    };
    onChipChange = () => render();
    function render() {
      disposeCharts();
      if (state.trend) return renderTrend(state.trend);
      const cur = CUR[CHIP_STATE.currency] || { sym: '$', rate: 1 };
      const isProd = state.dim === 'product';
      const src = isProd ? PRODUCT_DATA : VARIANT_DATA;
      const q = state.q.toLowerCase();
      let rows = src.filter((x) => !q || (x.name || x.product || '').toLowerCase().includes(q) || (x.spec || '').toLowerCase().includes(q) || (x.sku || '').toLowerCase().includes(q));
      state.filters.forEach((f) => { if (!f.value) return; const fv = String(f.value).toLowerCase(); rows = rows.filter((x) => { const field = String(f.dim === 'SKU' ? (x.sku || '') : (x.name || x.product || '')).toLowerCase(); return f.op === 'is' ? field === fv : f.op === 'is not' ? field !== fv : field.includes(fv); }); });
      const money = (v) => cur.sym + Math.round((v || 0) * cur.rate).toLocaleString();
      const METS = METRICS[state.dim] || [];
      const selMet = (state.metricsByDim[state.dim] || []).map((l) => METS.find((m) => m.l === l)).filter(Boolean);
      const fmtMet = (m, x) => m.t === 'money' ? money(m.v(x)) : m.t === 'pct' ? (Math.round(m.v(x) * 10) / 10) + '%' : (m.v(x) || 0).toLocaleString();
      if (state.sortCol != null && selMet[state.sortCol]) { const mv = selMet[state.sortCol].v; rows = rows.slice().sort((a, b) => state.sortDir === 'desc' ? mv(b) - mv(a) : mv(a) - mv(b)); }
      const totalRows = rows.length;
      const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
      const thumb = '<span style="display:inline-block;width:30px;height:30px;border-radius:6px;background:linear-gradient(135deg,#e6f0ff,#cfe1ff);margin-right:8px;flex:none"></span>';
      const sTh = (label, ci) => `<th class="num" data-sort="${ci}" style="cursor:pointer;white-space:nowrap">${label}${state.sortCol === ci ? (state.sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</th>`;
      const metTh = selMet.map((m, ci) => sTh(m.l, ci)).join('');
      const metTd = (x) => selMet.map((m) => `<td class="num">${fmtMet(m, x)}</td>`).join('');
      let thead, tbody;
      if (isProd) {
        thead = `<tr><th>NO.</th><th>Product</th><th>SKU</th>${metTh}<th class="num">Trend</th></tr>`;
        tbody = pageRows.map((x, i) => `<tr><td>${(state.page - 1) * state.pageSize + i + 1}</td><td><span style="display:flex;align-items:center">${thumb}<span style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.name}</span></span></td><td class="muted">${x.sku || 'N/A'}</td>${metTd(x)}<td class="num"><span data-trend="${x.name}" title="Product trend" style="cursor:pointer;color:var(--brand);display:inline-flex">${TREND_SVG}</span></td></tr>`).join('');
      } else {
        thead = `<tr><th>NO.</th><th>Sub-variant</th><th>SKU</th><th>Product</th>${metTh}<th class="num">Trend</th></tr>`;
        tbody = pageRows.map((x, i) => `<tr><td>${(state.page - 1) * state.pageSize + i + 1}</td><td><span style="display:flex;align-items:center">${thumb}<span>${x.spec}</span></span></td><td class="muted">${x.sku || 'N/A'}</td><td><span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block">${x.product}</span></td>${metTd(x)}<td class="num"><span data-trend="${x.spec}" title="Variant trend" style="cursor:pointer;color:var(--brand);display:inline-flex">${TREND_SVG}</span></td></tr>`).join('');
      }
      view.innerHTML = `<div class="view-wrap">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><button class="back-btn" data-route="#/analytics/reports">${ICON.arrowLeft}</button><h1 class="page-title" style="font-size:18px">Product data details</h1></div>
          <div class="flex items-center gap-2"><button class="btn btn-default" data-act="saveas">Save as</button><button class="btn btn-default" data-act="fav">Favorites</button></div>
        </div>
        ${chipBar({ currency: true })}
        <div class="tabs mb-3"><div class="tab ${isProd ? 'active' : ''}" data-dim="product">Product dimension</div><div class="tab ${!isProd ? 'active' : ''}" data-dim="variant">Sub-variant dimension</div></div>
        <div class="panel">
          <div class="p-3 flex items-center gap-3" style="border-bottom:1px solid var(--hair)">
            <div style="position:relative"><span style="position:absolute;left:10px;top:9px;color:var(--ink-muted)">${ICON.search}</span><input id="pq" class="filter-input" placeholder="Search product / SKU" value="${state.q}" /></div>
            <button class="btn btn-default" style="margin-left:auto" data-act="filters">More filters${state.filters.length ? ` (${state.filters.length})` : ''}</button>
            <button class="btn btn-default" data-act="edit">Edit</button>
          </div>
          <div id="ptable"><table class="tbl"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>
          <div class="p-3 flex items-center justify-between" style="border-top:1px solid var(--hair)">
            <span class="muted" style="font-size:13px">Total ${totalRows} records</span>
            <div class="pg">
              <span class="pg-item${state.page <= 1 ? ' disabled' : ''}" data-pg="prev">‹</span>
              ${Array.from({ length: totalPages }, (_, i) => `<span class="pg-item${state.page === i + 1 ? ' active' : ''}" data-pg="${i + 1}">${i + 1}</span>`).join('')}
              <span class="pg-item${state.page >= totalPages ? ' disabled' : ''}" data-pg="next">›</span>
              <select class="pg-size" data-pgsize>${[20, 50, 100].map((n) => `<option value="${n}"${state.pageSize === n ? ' selected' : ''}>${n} / page</option>`).join('')}</select>
            </div>
          </div>
        </div>
      </div>`;
      view.querySelectorAll('[data-route]').forEach((e) => (e.onclick = () => (location.hash = e.getAttribute('data-route'))));
      view.querySelector('[data-act="saveas"]').onclick = () => saveAsModal(CURRENT_REPORT); bindFav(view);
      view.querySelector('[data-act="filters"]').onclick = () => manageFiltersModal(state.filters, () => { state.page = 1; render(); }, [['Product', ['SKU', 'Product name']]]);
      view.querySelector('[data-act="edit"]').onclick = () => editDrawer({ dimensions: [], metrics: [[isProd ? 'Product metrics' : 'Sub-variant metrics', METRICS[state.dim].map((m) => m.l)]] }, { dims: new Set(), metrics: new Set(state.metricsByDim[state.dim]) }, (res) => { if (res.metrics && res.metrics.length) { state.metricsByDim[state.dim] = res.metrics; state.sortCol = null; render(); } });
      view.querySelectorAll('[data-dim]').forEach((e) => (e.onclick = () => { state.dim = e.getAttribute('data-dim'); state.page = 1; state.sortCol = null; render(); }));
      view.querySelectorAll('[data-sort]').forEach((th) => (th.onclick = () => { const ci = +th.getAttribute('data-sort'); if (state.sortCol === ci) state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc'; else { state.sortCol = ci; state.sortDir = 'desc'; } render(); }));
      view.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => { const v = b.getAttribute('data-pg'); if (v === 'prev') state.page = Math.max(1, state.page - 1); else if (v === 'next') state.page = Math.min(totalPages, state.page + 1); else state.page = +v; render(); }));
      const psel = view.querySelector('[data-pgsize]'); if (psel) psel.onchange = (e) => { state.pageSize = +e.target.value; state.page = 1; render(); };
      view.querySelectorAll('[data-trend]').forEach((b) => (b.onclick = () => { state.trend = b.getAttribute('data-trend'); render(); }));
      const pq = document.getElementById('pq');
      if (pq) { pq.oninput = (e) => { state.q = e.target.value; state.page = 1; state.focus = true; render(); }; if (state.focus) { pq.focus(); pq.setSelectionRange(pq.value.length, pq.value.length); state.focus = false; } }
    }
    function renderTrend(label) {
      const row = PRODUCT_DATA.find((p) => p.name === label) || VARIANT_DATA.find((v) => v.spec === label) || {};
      const views = row.views || (row.qty ? row.qty * 50 : 218);
      const buyers = row.orders || row.qty || 4;
      const cur = CUR[CHIP_STATE.currency] || { sym: '$', rate: 1 };
      const f = [
        { stage: 'Product views', value: views },
        { stage: 'Add to cart sessions', value: Math.max(buyers, Math.round(views * 0.037)) },
        { stage: 'Reached checkout sessions', value: Math.max(buyers, Math.round(views * 0.028)) },
        { stage: 'Unique buyers', value: buyers },
      ];
      const kpis = [
        ['Product conversion rate', (buyers / views * 100).toFixed(2) + '%'],
        ['Sales quantity', (row.qty || buyers).toLocaleString()],
        ['Orders', buyers.toLocaleString()],
        ['Gross sales', cur.sym + Math.round((row.sales || 559) * cur.rate).toLocaleString()],
        ['Add-to-cart', Math.round(views * 0.04).toLocaleString()],
      ];
      view.innerHTML = `<div class="view-wrap">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><button class="back-btn" data-back>${ICON.arrowLeft}</button><div><h1 class="page-title" style="font-size:18px">${label}</h1><div class="muted" style="font-size:12px">Product trend · funnel (behavior — 神策待建)</div></div></div>
        </div>
        ${chipBar({ currency: true })}
        <div class="grid grid-cols-5 gap-3 mb-4">${kpis.map(([k, v], i) => `<div class="panel card-pad"${i === 0 ? ' style="border:1px solid var(--brand)"' : ''}><div class="muted" style="font-size:13px">${k}</div><div class="stat-value mt-1" style="font-size:22px">${v}</div></div>`).join('')}</div>
        <div class="panel card-pad"><div class="card-title mb-3">Conversion funnel</div><div class="grid grid-cols-4 gap-3" id="pfunnel"></div></div>
      </div>`;
      document.getElementById('pfunnel').innerHTML = f.map((s, i) => `<div><div class="muted" style="font-size:12px">${s.stage}</div><div style="font-size:20px;font-weight:600;margin:2px 0">${s.value.toLocaleString()}</div><div style="height:96px;display:flex;align-items:flex-end"><div style="width:100%;background:var(--brand);opacity:${1 - i * 0.18};height:${[100, 60, 46, 32][i]}%;border-radius:6px 6px 0 0"></div></div>${i < 3 ? `<div class="muted" style="font-size:11px;margin-top:4px">${(f[i + 1].value / s.value * 100).toFixed(1)}% →</div>` : ''}</div>`).join('');
      view.querySelector('[data-back]').onclick = () => { state.trend = null; render(); };
    }
    render();
  }
  const BEHAVIOR_CAT = {
    dimensions: [
      ['Landing page', ['Landing page type', 'Landing page path', 'Landing page URL']],
      ['Location', ['Country/Region', 'Province/State', 'City']],
      ['Device', ['Browser', 'Browser version', 'Device type', 'Operating system version', 'Operating system']],
      ['Referrer', ['Referrer site', 'Referrer name', 'Referrer path', 'Referrer source', 'Traffic Source', 'Referrer URL']],
      ['Campaign', ['UTM content', 'UTM medium', 'UTM name', 'UTM source', 'UTM campaign keywords']],
      ['Time', ['Hour', 'Day', 'Week', 'Month', 'Quarter', 'Year', 'An hour of a day', 'A day of a week', 'A month of a year']],
    ],
    metrics: [
      ['Sessions', ['Sessions', 'Sessions of successful registration', 'Added to cart', 'Reached checkout', 'Added customer info', 'Added shipping method', 'Added payment Info', 'Completed checkout', 'Conversion rate', 'Bounce rate']],
    ],
  };
  const FILTER_DIMS = BEHAVIOR_CAT.dimensions;
  // Filter value enumerations — every filterable field offers its real possible values (vs free text)
  const FILTER_EXTRA = {
    'Order status': ['To pay', 'To ship', 'Shipped', 'Awaiting Review', 'Done', 'Refunded', 'Canceled'],
    'Pay status': ['Paid', 'Unpaid'],
    'Refund status': ['No refund', 'Refunding', 'Refunded'],
    'Fulfillment status': ['Fulfilled', 'Unfulfilled'],
    'SKU': ['SX-3DACL-01', 'SX-PSL-02', 'SX-CS-03', 'SX-SL-04', 'SX-BLC-05', 'SX-SB-06'],
    'Email': ['emma.w@example.com', 'liam.s@example.com', 'olivia.m@example.com', 'noah.t@example.com', 'ava.r@example.com'],
    'Sales channel': ['Online Store', 'Draft order'],
    'Currency': ['USD', 'AUD', 'GBP', 'CAD', 'EUR', 'NZD'],
    'Landing page path': ['/', '/user/signIn', '/products/3d-anti-cellulite-leggings', '/collections/leggings', '/cart', '/checkout', '/products/short-leggings'],
    'Referrer name': ['Facebook', 'Google', 'Instagram', 'TikTok', 'YouTube', 'Pinterest'],
  };
  // resolve at call time — COMMERCE_DIM_LABELS is declared later in the module (avoid TDZ)
  const DIM_SAMPLE_VALUES = { 'Order No.': ['SILIX1042', 'SILIX1041', 'SILIX1040', 'SILIX1039', 'SILIX1038', 'SILIX1037'], 'Customer name': ['Emma W.', 'Liam S.', 'Olivia M.', 'Noah T.', 'Ava R.', 'Mia K.'] };
  // Freeform / high-cardinality dims are text inputs (is / is not / contains), NOT dropdowns (R21 + PRD Manage-filters table).
  const TEXT_DIMS = new Set(['Order No.', 'Customer name', 'Email', 'SKU', 'Product name', 'Variant', 'Discount code', 'Landing page URL', 'Landing page path', 'Referrer name', 'Referrer site', 'UTM source', 'UTM medium', 'UTM campaign']);
  const filterEnumsFor = (dim) => TEXT_DIMS.has(dim) ? null : (BEHAVIOR_LABELS[dim] || COMMERCE_DIM_LABELS[dim] || DIM_SAMPLE_VALUES[dim] || FILTER_EXTRA[dim] || null);

  function manageFiltersModal(filters, onApply, dims) {
    const draft = filters.map((f) => ({ dim: f.dim, op: f.op, value: f.value }));
    if (!draft.length) draft.push({ dim: '', op: 'is', value: '' });
    const back = document.createElement('div'); back.className = 'modal-backdrop';
    const close = () => back.remove();
    const valueCell = (f, i) => {
      const enums = f.dim ? filterEnumsFor(f.dim) : null;
      if (enums) return `<div style="position:relative;flex:1"><div class="sel-trigger" data-valtrigger="${i}">${f.value ? f.value : '<span class="muted">Select a value</span>'}${ICON.chevDown}</div><div class="menu-pop sel-pop" data-valpop="${i}" style="display:none;position:absolute;left:0;right:0;top:38px;z-index:6;max-height:230px;overflow:auto">${enums.map((v) => `<div class="opt${f.value === v ? ' sel' : ''}" data-vpick="${v}">${v}</div>`).join('')}</div></div>`;
      return `<input class="filter-input" data-val="${i}" placeholder="Enter a value" value="${f.value || ''}" style="flex:1;width:auto;padding-left:12px" />`;
    };
    const groups = (dims || FILTER_DIMS).map(([g, items]) => `<div class="opt-group">${g}</div>${items.map((it) => `<div class="opt" data-pick="${it}">${it}</div>`).join('')}`).join('');
    function paint() {
      back.innerHTML = `<div class="modal" style="width:470px">
        <div class="modal-head">Manage filters</div>
        <div class="modal-body">
          ${draft.map((f, i) => `<div class="mb-3" data-row="${i}">
            <div style="position:relative;margin-bottom:8px">
              <div class="sel-trigger" data-seltrigger="${i}">${f.dim ? f.dim : '<span class="muted">Select</span>'}${ICON.chevDown}</div>
              <div class="menu-pop sel-pop" data-selpop="${i}" style="display:none;position:absolute;left:0;right:0;top:38px;z-index:5;max-height:230px">${groups}</div>
            </div>
            <div class="flex items-center gap-2">
              <select class="filter-select" data-op="${i}" style="width:96px"><option${f.op === 'is' ? ' selected' : ''}>is</option><option${f.op === 'is not' ? ' selected' : ''}>is not</option><option${f.op === 'contains' ? ' selected' : ''}>contains</option></select>
              ${valueCell(f, i)}
              ${draft.length > 1 ? `<span class="field-pill" data-rm="${i}" style="cursor:pointer">×</span>` : ''}
            </div>
          </div>`).join('')}
          <button class="btn btn-gray" data-act="addf">Add filters</button>
        </div>
        <div class="modal-foot"><button class="btn btn-default" data-x>Cancel</button><button class="btn btn-primary" data-apply>Apply</button></div>
      </div>`;
      back.querySelectorAll('[data-seltrigger]').forEach((t) => (t.onclick = (e) => { e.stopPropagation(); const i = t.getAttribute('data-seltrigger'); const pop = back.querySelector(`[data-selpop="${i}"]`); const isOpen = pop.style.display === 'block'; back.querySelectorAll('.sel-pop').forEach((p) => (p.style.display = 'none')); pop.style.display = isOpen ? 'none' : 'block'; }));
      back.querySelectorAll('[data-pick]').forEach((o) => (o.onclick = (e) => { e.stopPropagation(); const i = +o.closest('[data-row]').getAttribute('data-row'); draft[i].dim = o.getAttribute('data-pick'); draft[i].value = ''; paint(); }));
      back.querySelectorAll('[data-vpick]').forEach((o) => (o.onclick = (e) => { e.stopPropagation(); const i = +o.closest('[data-row]').getAttribute('data-row'); draft[i].value = o.getAttribute('data-vpick'); paint(); }));
      back.querySelectorAll('[data-valtrigger]').forEach((t) => (t.onclick = (e) => { e.stopPropagation(); const i = t.getAttribute('data-valtrigger'); const pop = back.querySelector(`[data-valpop="${i}"]`); const isOpen = pop.style.display === 'block'; back.querySelectorAll('.sel-pop').forEach((p) => (p.style.display = 'none')); pop.style.display = isOpen ? 'none' : 'block'; }));
      back.querySelectorAll('[data-op]').forEach((s) => (s.onchange = (e) => { draft[+s.getAttribute('data-op')].op = e.target.value; }));
      back.querySelectorAll('[data-val]').forEach((s) => (s.oninput = (e) => { draft[+s.getAttribute('data-val')].value = e.target.value; }));
      back.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { draft.splice(+b.getAttribute('data-rm'), 1); paint(); }));
      back.querySelector('[data-act="addf"]').onclick = () => { draft.push({ dim: '', op: 'is', value: '' }); paint(); };
      back.querySelector('[data-x]').onclick = close;
      back.querySelector('[data-apply]').onclick = () => { filters.length = 0; draft.filter((f) => f.dim && f.value).forEach((f) => filters.push({ dim: f.dim, op: f.op, value: f.value })); close(); onApply(); };
    }
    back.addEventListener('click', (e) => { if (e.target === back) close(); else if (!e.target.closest('.sel-trigger') && !e.target.closest('.sel-pop')) back.querySelectorAll('.sel-pop').forEach((p) => (p.style.display = 'none')); });
    document.body.appendChild(back);
    paint();
  }
  // ---- Edit drawer (right slide-in): catalog-driven column/metric picker (SHOPLINE) ----
  // catalog {dimensions,metrics}; current {dims:Set, metrics:Set}; onApply({dims:[],metrics:[]})
  function editDrawer(catalog, current, onApply) {
    const draft = { dims: new Set(current.dims), metrics: new Set(current.metrics) };
    const collapsed = new Set();
    let q = '';
    const dimGroups = catalog.dimensions.filter(([g]) => g !== 'Time');
    const metGroups = catalog.metrics;
    const back = document.createElement('div'); back.className = 'drawer-backdrop';
    const close = () => back.remove();
    const matchItems = (items) => items.filter((it) => !q || it.toLowerCase().includes(q));
    function groupHtml(kind, g, items, set) {
      const fil = matchItems(items); if (!fil.length) return '';
      const key = kind + '|' + g, col = collapsed.has(key), allOn = fil.every((it) => set.has(it));
      return `<div class="edit-group">
        <div class="edit-group-head" data-col="${key}"><span>${g}</span><span class="edit-caret${col ? ' col' : ''}">${ICON.chevDown}</span></div>
        ${col ? '' : `<a class="lnk edit-selall" data-selall="${key}">${allOn ? 'Unselect all' : 'Select all'}</a>${fil.map((it) => `<label class="edit-check"><input type="checkbox" data-ck="${kind}|${it}"${set.has(it) ? ' checked' : ''}/><span>${it}</span></label>`).join('')}`}
      </div>`;
    }
    function paint() {
      const body = back.querySelector('.drawer-body'); const st = body ? body.scrollTop : 0;
      const dimH = dimGroups.map(([g, items]) => groupHtml('dim', g, items, draft.dims)).join('');
      const metH = metGroups.map(([g, items]) => groupHtml('met', g, items, draft.metrics)).join('');
      back.innerHTML = `<div class="drawer">
        <div class="drawer-head"><span>Edit</span><span class="drawer-x" data-x>${ICON.close || '✕'}</span></div>
        <div class="drawer-search"><span class="search-ico">${ICON.search}</span><input class="filter-input" data-q placeholder="Search chart header" value="${q}" style="width:100%" /></div>
        <div class="drawer-body">
          ${dimGroups.length ? `<div class="edit-sec-label">DIMENSION</div>${dimH || '<div class="muted" style="padding:6px 0;font-size:13px">No match</div>'}` : ''}
          <div class="edit-sec-label"${dimGroups.length ? ' style="margin-top:10px"' : ''}>METRIC</div>${metH || '<div class="muted" style="padding:6px 0;font-size:13px">No match</div>'}
        </div>
        <div class="drawer-foot"><button class="btn btn-default" data-reset>Reset</button><span style="flex:1"></span><button class="btn btn-default" data-x>Cancel</button><button class="btn btn-primary" data-apply>Update</button></div>
      </div>`;
      const nb = back.querySelector('.drawer-body'); if (nb) nb.scrollTop = st;
      bind();
    }
    function bind() {
      const qi = back.querySelector('[data-q]');
      qi.oninput = (e) => { const pos = e.target.selectionStart; q = e.target.value.toLowerCase(); paint(); const n = back.querySelector('[data-q]'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} };
      back.querySelectorAll('[data-col]').forEach((h) => (h.onclick = (e) => { if (e.target.closest('[data-selall]')) return; const k = h.getAttribute('data-col'); collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k); paint(); }));
      back.querySelectorAll('[data-ck]').forEach((c) => (c.onchange = () => { const [kind, it] = c.getAttribute('data-ck').split('|'); const set = kind === 'dim' ? draft.dims : draft.metrics; c.checked ? set.add(it) : set.delete(it); paint(); }));
      back.querySelectorAll('[data-selall]').forEach((a) => (a.onclick = (e) => { e.stopPropagation(); const [kind, g] = a.getAttribute('data-selall').split('|'); const set = kind === 'dim' ? draft.dims : draft.metrics; const groups = kind === 'dim' ? dimGroups : metGroups; const items = matchItems((groups.find(([gg]) => gg === g) || [0, []])[1]); const allOn = items.every((it) => set.has(it)); items.forEach((it) => (allOn ? set.delete(it) : set.add(it))); paint(); }));
      back.querySelector('[data-reset]').onclick = () => { draft.dims = new Set(current.dims); draft.metrics = new Set(current.metrics); collapsed.clear(); q = ''; paint(); };
      back.querySelectorAll('[data-x]').forEach((b) => (b.onclick = close));
      back.querySelector('[data-apply]').onclick = () => { onApply({ dims: [...draft.dims], metrics: [...draft.metrics] }); close(); };
    }
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    document.body.appendChild(back);
    paint();
  }
  // ---- Catalog-driven behavior-report engine (SHOPLINE "Traffic acquisition: By X") ----
  const METRIC_KEY = { 'Sessions': 'sessions', 'Sessions of successful registration': 'reg', 'Added to cart': 'atc', 'Reached checkout': 'checkout', 'Added customer info': 'ci', 'Added shipping method': 'sm', 'Added payment Info': 'pi', 'Completed checkout': 'completed', 'Conversion rate': 'conversion', 'Bounce rate': 'bounce' };
  const RATE_METRICS = ['Conversion rate', 'Bounce rate'];
  const BEHAVIOR_LABELS = {
    'Day': SALES_TREND.dates,
    'Country/Region': ['United States', 'Australia', 'United Kingdom', 'Canada', 'Germany', 'New Zealand', 'Singapore', 'Ireland', 'Philippines', 'France', 'Hongkong', 'Viet Nam', 'India', 'Pakistan', 'Netherlands', 'Mexico'],
    'Device type': ['Mobile', 'Desktop', 'Tablet', 'Other'],
    'Browser': ['Chrome', 'Safari', 'Edge', 'Firefox', 'Samsung Internet'],
    'Operating system': ['iOS', 'Android', 'Windows', 'macOS', 'Linux'],
    'Landing page type': ['Product', 'Homepage', 'Collection', 'Checkout', 'Cart', 'Account', 'Blog'],
    'Landing page URL': ['/products/3d-anti-cellulite-leggings', '/', '/collections/leggings', '/products/silix-high-waist', '/cart', '/products/short-leggings', '/apps/bestrack'],
    'Referrer source': ['Direct', 'Social', 'Search', 'Referral', 'Email', 'Other'],
    'Referrer site': ['facebook.com', 'google.com', 'instagram.com', 't.co', 'youtube.com', 'pinterest.com'],
    'City': ['Chicago', 'Sydney', 'Atlanta', 'Houston', 'Melbourne', 'New York', 'London'],
    'UTM source': ['facebook', 'google', 'instagram', 'tiktok', 'newsletter'],
    'UTM medium': ['paid', 'organic', 'cpc', 'email', 'social'],
    'Province/State': ['California', 'New South Wales', 'Texas', 'Georgia', 'Victoria'],
    'Traffic Source': ['Direct', 'Social', 'Search', 'Referral', 'Email'],
  };
  function behaviorRows(dim) {
    const labels = BEHAVIOR_LABELS[dim] || ['Value A', 'Value B', 'Value C', 'Value D', 'Value E'];
    const seed = seedOf(dim);
    return labels.map((label, i) => {
      const r = { s: seed + i * 131 + 7 };
      const sessions = Math.round((1600 - i * 70) * (0.45 + rand(r) * 1.1)) + 18;
      const atc = Math.max(0, Math.round(sessions * (0.008 + rand(r) * 0.02)));
      const checkout = Math.max(0, Math.round(atc * (0.45 + rand(r) * 0.5)));
      const completed = Math.max(0, Math.round(checkout * (0.45 + rand(r) * 0.5)));
      return { label, sessions, atc, checkout, completed, reg: Math.round(sessions * 0.02), ci: checkout, sm: checkout, pi: completed, conversion: sessions ? +(completed / sessions * 100).toFixed(2) : 0, bounce: +(35 + rand(r) * 40).toFixed(1) };
    });
  }
  function viewBehaviorReport(view, cfg) {
    const state = { dim: cfg.dim, metrics: cfg.metrics.slice(), sortCol: 0, sortDir: 'desc', page: 1, pageSize: 20, filters: [] };
    onChipChange = () => render();
    const fmtV = (label, v) => RATE_METRICS.includes(label) ? v + '%' : (v || 0).toLocaleString();
    function render() {
      disposeCharts();
      const all = behaviorRows(state.dim);
      let rows = all.slice();
      state.filters.forEach((f) => { if (f.value) rows = rows.filter((r) => f.op === 'is' ? String(r.label).toLowerCase() === f.value.toLowerCase() : f.op === 'is not' ? String(r.label).toLowerCase() !== f.value.toLowerCase() : String(r.label).toLowerCase().includes(f.value.toLowerCase())); });
      const mk = METRIC_KEY[state.metrics[state.sortCol]] || 'sessions';
      rows = rows.slice().sort((a, b) => state.sortDir === 'desc' ? b[mk] - a[mk] : a[mk] - b[mk]);
      const sum = {}; ['sessions', 'atc', 'checkout', 'completed', 'reg', 'ci', 'sm', 'pi'].forEach((k) => (sum[k] = all.reduce((s, r) => s + r[k], 0)));
      sum.conversion = sum.sessions ? +(sum.completed / sum.sessions * 100).toFixed(2) : 0;
      sum.bounce = +(all.reduce((s, r) => s + r.bounce, 0) / all.length).toFixed(1);
      const totalRows = rows.length;
      const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
      const sTh = (label, ci) => `<th class="num" data-sort="${ci}" style="cursor:pointer;white-space:nowrap">${label}${state.sortCol === ci ? (state.sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</th>`;
      view.innerHTML = `<div class="view-wrap">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><button class="back-btn" data-route="#/analytics/reports">${ICON.arrowLeft}</button><h1 class="page-title" style="font-size:18px">${cfg.title}</h1></div>
          <div class="flex items-center gap-2"><button class="btn btn-default" data-act="saveas">Save as</button><button class="btn btn-default" data-act="fav">Favorites</button></div>
        </div>
        ${chipBar({ timeunit: !!cfg.chart })}
        <div class="panel">
          <div class="p-3 flex items-center justify-between" style="border-bottom:1px solid var(--hair)">
            <span class="flex items-center gap-2" style="flex-wrap:wrap"><button class="btn btn-gray" data-act="filters">Manage filters${state.filters.length ? ` (${state.filters.length})` : ''}</button>${state.filters.map((f, i) => `<span class="chip" style="background:#e6f0ff;color:var(--brand);border-color:#cfe1ff">${f.dim} ${f.op} ${f.value}<span data-rmf="${i}" style="cursor:pointer;margin-left:6px">×</span></span>`).join('')}</span>
            <button class="btn btn-default" data-act="edit">Edit</button>
          </div>
          <div id="bh-table"><table class="tbl"><thead><tr><th>${state.dim}</th>${state.metrics.map((m, ci) => sTh(m, ci)).join('')}</tr></thead><tbody><tr style="font-weight:600;background:var(--panel)"><td>Summary</td>${state.metrics.map((m) => `<td class="num">${fmtV(m, sum[METRIC_KEY[m]])}</td>`).join('')}</tr>${pageRows.map((r) => `<tr><td>${r.label}</td>${state.metrics.map((m) => `<td class="num">${fmtV(m, r[METRIC_KEY[m]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <div class="p-3 flex items-center justify-between" style="border-top:1px solid var(--hair)">
            <span class="muted" style="font-size:13px">Total ${totalRows} records</span>
            <div class="pg">
              <span class="pg-item${state.page <= 1 ? ' disabled' : ''}" data-pg="prev">‹</span>
              ${Array.from({ length: totalPages }, (_, i) => `<span class="pg-item${state.page === i + 1 ? ' active' : ''}" data-pg="${i + 1}">${i + 1}</span>`).join('')}
              <span class="pg-item${state.page >= totalPages ? ' disabled' : ''}" data-pg="next">›</span>
              <select class="pg-size" data-pgsize>${[20, 50, 100].map((n) => `<option value="${n}"${state.pageSize === n ? ' selected' : ''}>${n} / page</option>`).join('')}</select>
            </div>
          </div>
        </div>
      </div>`;
      view.querySelectorAll('[data-route]').forEach((e) => (e.onclick = () => (location.hash = e.getAttribute('data-route'))));
      view.querySelector('[data-act="saveas"]').onclick = () => saveAsModal(CURRENT_REPORT); bindFav(view);
      view.querySelector('[data-act="edit"]').onclick = () => editDrawer(BEHAVIOR_CAT, { dims: new Set([state.dim]), metrics: new Set(state.metrics) }, (res) => { if (res.dims.length) state.dim = res.dims[0]; if (res.metrics.length) state.metrics = res.metrics; state.sortCol = 0; state.page = 1; render(); });
      view.querySelector('[data-act="filters"]').onclick = () => manageFiltersModal(state.filters, () => { state.page = 1; render(); });
      view.querySelectorAll('[data-rmf]').forEach((b) => (b.onclick = () => { state.filters.splice(+b.getAttribute('data-rmf'), 1); render(); }));
      view.querySelectorAll('[data-sort]').forEach((th) => (th.onclick = () => { const ci = +th.getAttribute('data-sort'); if (state.sortCol === ci) state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc'; else { state.sortCol = ci; state.sortDir = 'desc'; } render(); }));
      view.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => { const v = b.getAttribute('data-pg'); if (v === 'prev') state.page = Math.max(1, state.page - 1); else if (v === 'next') state.page = Math.min(totalPages, state.page + 1); else state.page = +v; render(); }));
      const psel = view.querySelector('[data-pgsize]'); if (psel) psel.onchange = (e) => { state.pageSize = +e.target.value; state.page = 1; render(); };
    }
    render();
  }
  // ============ Commerce catalog + "By date range" chart report (SHOPLINE) ============
  // Trimmed to fields we actually have (no tax / gift cards / POS / staff). Referrer/Campaign live in Behavior (attribution pending 神策).
  const COMMERCE_CAT = {
    dimensions: [
      ['Orders', ['Order No.', 'Order status', 'Pay status', 'Refund status', 'Fulfillment status', 'Payment method']],
      ['Product', ['Product name', 'SKU', 'Variant']],
      ['Customer', ['Customer name', 'Email', 'Customer type']],
      ['Location', ['Country/Region', 'Province/State', 'City']],
      ['Discount', ['Discount code']],
      ['Sales channel', ['Sales channel', 'Currency']],
    ],
    metrics: [
      ['Sales result', ['Gross sales', 'Discounts', 'Returns', 'Net sales', 'Shipping', 'Total sales', 'Orders', 'Average order value', 'Sales quantity', 'Units per transaction', 'Gross profit', 'Gross margin', 'Refund amount']],
      ['Customers', ['Customers']],
    ],
  };
  const CATALOG_FOR = (source) => (source === 'Behavior' ? BEHAVIOR_CAT : COMMERCE_CAT);
  // chart-metric picker options (flat list shown in the "Sales ▾" selector) per source
  const CHART_METRICS = {
    Commerce: ['Total sales', 'Net sales', 'Gross sales', 'Discounts', 'Refund amount', 'Orders', 'Average order value', 'Sales quantity', 'Units per transaction', 'Gross profit', 'Gross margin'],
    Behavior: ['Sessions', 'Added to cart', 'Reached checkout', 'Completed checkout', 'Conversion rate', 'Bounce rate'],
  };
  // commerce metric value model (our data reality: tax / duty / gift cards = N/A → 0)
  const C_RATE = new Set(['Gross margin']);
  const C_RATIO = new Set(['Units per transaction', 'Average order value']);
  const C_COUNT = new Set(['Orders', 'Sales quantity', 'Customers']);
  function cSeries(metric) {
    const r = { s: seedOf('C|' + metric) };
    return SALES_TREND.values.map((sv, i) => {
      switch (metric) {
        case 'Total sales': return sv;
        case 'Net sales': return Math.round(sv * 0.968);
        case 'Gross sales': return Math.round(sv * 1.162);
        case 'Discounts': return -Math.round(sv * 0.158);
        case 'Returns': return -Math.round(sv * 0.008);
        case 'Refund amount': return -Math.round(sv * (i === 20 ? 0.085 : 0.002));
        case 'Shipping': return Math.round(sv * 0.031);
        case 'Gross profit': return Math.round(sv * 0.452);
        case 'Gross margin': return +(43 + rand(r) * 5).toFixed(1);
        case 'Orders': return Math.round(sv / 57.9);
        case 'Sales quantity': return Math.round(sv / 39);
        case 'Average order value': return +(54 + rand(r) * 6).toFixed(2);
        case 'Units per transaction': return +(1.3 + rand(r) * 0.3).toFixed(2);
        case 'Customers': return Math.round(sv / 70);
        default: return Math.round(sv * (0.15 + rand(r) * 0.25));
      }
    });
  }
  function behaviorDaySeries(metric) {
    const r = { s: seedOf('B|' + metric) };
    return SESSIONS_TREND.values.map((sv, i) => {
      switch (metric) {
        case 'Sessions': return sv;
        case 'Added to cart': return Math.round(sv * 0.012);
        case 'Reached checkout': return Math.round(sv * 0.006);
        case 'Completed checkout': return Math.round(sv * 0.0035);
        case 'Conversion rate': return +(CONV_RATE_TREND.values[i] || 2.3).toFixed(2);
        case 'Bounce rate': return +(38 + rand(r) * 30).toFixed(1);
        default: return Math.round(sv * (0.002 + rand(r) * 0.01));
      }
    });
  }
  const cFmt = (metric, v, cur) => {
    if (C_RATE.has(metric)) return (Math.round(v * 100) / 100) + '%';
    if (metric === 'Units per transaction') return (Math.round(v * 100) / 100).toFixed(2);
    if (C_COUNT.has(metric)) return Math.round(v).toLocaleString();
    const neg = v < 0;
    return (neg ? '-' : '') + cur.sym + Math.abs(Math.round(v * cur.rate)).toLocaleString();
  };
  const cAxis = (v) => { const a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 1e6 ? +(a / 1e6).toFixed(1) + 'M' : a >= 1e3 ? +(a / 1e3).toFixed(0) + 'K' : a); };
  function aggDR(rows, unit, metrics, isB) {
    if (unit === 'Day') return rows;
    const size = unit === 'Week' ? 7 : rows.length, out = [];
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size), vals = {};
      metrics.forEach((m) => { const s = chunk.reduce((a, b) => a + (b.vals[m] || 0), 0); const isR = isB ? RATE_METRICS.includes(m) : (C_RATE.has(m) || C_RATIO.has(m)); vals[m] = isR ? s / chunk.length : s; });
      out.push({ label: unit === 'Month' ? 'May 2026' : `${chunk[0].label} – ${chunk[chunk.length - 1].label}`, vals });
    }
    return out;
  }
  function aggSeries(series, unit, isRate) {
    if (unit === 'Day') return series.slice();
    const size = unit === 'Week' ? 7 : series.length, out = [];
    for (let i = 0; i < series.length; i += size) { const chunk = series.slice(i, i + size); const s = chunk.reduce((a, b) => a + b, 0); out.push(isRate ? +(s / chunk.length).toFixed(2) : s); }
    return out;
  }
  function drChartOpt(labels, series, isB) {
    const colors = isB ? ['#5ab1ef', '#019680'] : ['#0066e6', '#019680'];
    const ser = [];
    series.forEach((s, i) => {
      ser.push({ type: 'line', name: s.name, data: s.vals, smooth: true, symbol: 'none', lineStyle: { color: colors[i % 2], width: 2 }, areaStyle: i === 0 ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: colors[0] + '22' }, { offset: 1, color: colors[0] + '03' }]) } : undefined });
      if (s.comp) ser.push({ type: 'line', name: s.name + '[Compare]', data: s.comp, smooth: true, symbol: 'none', lineStyle: { color: colors[i % 2], width: 1.5, type: 'dashed', opacity: 0.55 } });
    });
    return { grid: { left: 56, right: 20, top: 16, bottom: 44 }, tooltip: { trigger: 'axis' }, legend: { bottom: 0, icon: 'roundRect', itemHeight: 3, itemWidth: 16, textStyle: { color: '#62708d', fontSize: 12 } }, xAxis: { type: 'category', data: labels, boundaryGap: false, axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#94a3b8', fontSize: 11, interval: labels.length > 14 ? 2 : 0 } }, yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f3f6' } }, axisLabel: { color: '#94a3b8', fontSize: 11, formatter: cAxis } }, series: ser };
  }
  function viewDateRangeReport(view, cfg) {
    const opts = CHART_METRICS[cfg.source] || CHART_METRICS.Commerce;
    const isB = cfg.source === 'Behavior';
    const state = { chartMetrics: [cfg.chartDefault], metrics: cfg.tableMetrics.slice(), page: 1, pageSize: 50, filters: [], banner: cfg.source === 'Commerce' };
    onChipChange = () => render();
    const seriesOf = isB ? behaviorDaySeries : cSeries;
    const fmt = isB ? ((m, v) => (RATE_METRICS.includes(m) ? v + '%' : (v || 0).toLocaleString())) : ((m, v) => cFmt(m, v, CUR[CHIP_STATE.currency] || { sym: '$', rate: 1 }));
    function render() {
      disposeCharts();
      let rows = SALES_TREND.dates.map((d, i) => ({ label: d, vals: Object.fromEntries(state.metrics.map((m) => [m, seriesOf(m)[i]])) }));
      rows = aggDR(rows, CHIP_STATE.timeunit, state.metrics, isB);
      const sum = {}; state.metrics.forEach((m) => { const all = rows.reduce((a, b) => a + (b.vals[m] || 0), 0); const isR = isB ? RATE_METRICS.includes(m) : (C_RATE.has(m) || C_RATIO.has(m)); sum[m] = isR ? all / (rows.length || 1) : all; });
      const totalRows = rows.length;
      const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
      view.innerHTML = `<div class="view-wrap">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><button class="back-btn" data-route="#/analytics/reports">${ICON.arrowLeft}</button><h1 class="page-title" style="font-size:18px">${cfg.title}</h1></div>
          <div class="flex items-center gap-2"><button class="btn btn-default" data-act="saveas">Save as</button><button class="btn btn-default" data-act="fav">Favorites</button></div>
        </div>
        ${chipBar({ currency: !isB, timeunit: true })}
        ${state.banner ? `<div class="info-banner"><span>We will be phasing out the Payment amount and Refund amount metrics in the Sales report soon — you can view them in the Finances report instead.</span><span class="x" data-bx>✕</span></div>` : ''}
        <div class="panel card-pad mb-4">
          <div class="flex items-center gap-3 mb-2">
            <span class="metric-sel" data-msel="0">${state.chartMetrics[0]}${ICON.chevDown}</span>
            ${state.chartMetrics[1] ? `<span class="muted">and</span><span class="metric-sel" data-msel="1">${state.chartMetrics[1]}${ICON.chevDown}</span><a class="lnk" data-mdel>Delete</a>` : `<a class="lnk" data-madd>Add metrics</a>`}
          </div>
          <div id="dr-chart" style="height:300px"></div>
        </div>
        <div class="panel">
          <div class="p-3 flex items-center justify-between" style="border-bottom:1px solid var(--hair)">
            <span class="flex items-center gap-2" style="flex-wrap:wrap"><button class="btn btn-gray" data-act="filters">Manage filters${state.filters.length ? ` (${state.filters.length})` : ''}</button>${state.filters.map((f, i) => `<span class="chip" style="background:#e6f0ff;color:var(--brand);border-color:#cfe1ff">${f.dim} ${f.op} ${f.value}<span data-rmf="${i}" style="cursor:pointer;margin-left:6px">×</span></span>`).join('')}</span>
            <button class="btn btn-default" data-act="edit">Edit</button>
          </div>
          <div id="dr-table"><table class="tbl"><thead><tr><th>${CHIP_STATE.timeunit}</th>${state.metrics.map((m) => `<th class="num">${m}</th>`).join('')}</tr></thead><tbody><tr style="font-weight:600;background:var(--panel)"><td>Summary</td>${state.metrics.map((m) => `<td class="num">${fmt(m, sum[m])}</td>`).join('')}</tr>${pageRows.map((r) => `<tr><td>${r.label}</td>${state.metrics.map((m) => `<td class="num">${fmt(m, r.vals[m])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <div class="p-3 flex items-center justify-between" style="border-top:1px solid var(--hair)">
            <span class="muted" style="font-size:13px">Total ${totalRows} records</span>
            <div class="pg">
              <span class="pg-item${state.page <= 1 ? ' disabled' : ''}" data-pg="prev">‹</span>
              ${Array.from({ length: totalPages }, (_, i) => `<span class="pg-item${state.page === i + 1 ? ' active' : ''}" data-pg="${i + 1}">${i + 1}</span>`).join('')}
              <span class="pg-item${state.page >= totalPages ? ' disabled' : ''}" data-pg="next">›</span>
              <select class="pg-size" data-pgsize>${[20, 50, 100].map((n) => `<option value="${n}"${state.pageSize === n ? ' selected' : ''}>${n} / page</option>`).join('')}</select>
            </div>
          </div>
        </div>
      </div>`;
      const comp = CHIP_STATE.comparison !== 'No comparison';
      const chartSeries = state.chartMetrics.map((m) => { const isR = isB ? RATE_METRICS.includes(m) : (C_RATE.has(m) || C_RATIO.has(m)); const v = aggSeries(seriesOf(m), CHIP_STATE.timeunit, isR); return { name: m, vals: v, comp: comp ? v.map((x) => Math.round(x * 0.88 * 100) / 100) : null }; });
      mkChart(document.getElementById('dr-chart'), drChartOpt(rows.map((r) => r.label), chartSeries, isB));
      view.querySelectorAll('[data-route]').forEach((e) => (e.onclick = () => (location.hash = e.getAttribute('data-route'))));
      view.querySelector('[data-act="saveas"]').onclick = () => saveAsModal(CURRENT_REPORT); bindFav(view);
      bindFav(view);
      view.querySelector('[data-act="edit"]').onclick = () => editDrawer(CATALOG_FOR(cfg.source), { dims: new Set(), metrics: new Set(state.metrics) }, (res) => { if (res.metrics.length) state.metrics = res.metrics; state.page = 1; render(); });
      view.querySelector('[data-act="filters"]').onclick = () => manageFiltersModal(state.filters, () => { state.page = 1; render(); }, CATALOG_FOR(cfg.source).dimensions);
      view.querySelectorAll('[data-rmf]').forEach((b) => (b.onclick = () => { state.filters.splice(+b.getAttribute('data-rmf'), 1); render(); }));
      const bx = view.querySelector('[data-bx]'); if (bx) bx.onclick = () => { state.banner = false; render(); };
      const pickMetric = (slot, el) => openPopover(el, opts.filter((o) => !state.chartMetrics.includes(o) || state.chartMetrics[slot] === o).map((o) => `<div class="opt" data-v="${o}">${o}${state.chartMetrics[slot] === o ? ' ✓' : ''}</div>`).join(''), (pop, close) => pop.querySelectorAll('[data-v]').forEach((o) => (o.onclick = () => { state.chartMetrics[slot] = o.getAttribute('data-v'); close(); render(); })));
      view.querySelectorAll('[data-msel]').forEach((el) => (el.onclick = () => pickMetric(+el.getAttribute('data-msel'), el)));
      const madd = view.querySelector('[data-madd]'); if (madd) madd.onclick = () => { state.chartMetrics.push(opts.find((o) => !state.chartMetrics.includes(o)) || opts[1]); render(); };
      const mdel = view.querySelector('[data-mdel]'); if (mdel) mdel.onclick = () => { state.chartMetrics = [state.chartMetrics[0]]; render(); };
      view.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => { const v = b.getAttribute('data-pg'); if (v === 'prev') state.page = Math.max(1, state.page - 1); else if (v === 'next') state.page = Math.min(totalPages, state.page + 1); else state.page = +v; render(); }));
      const psel = view.querySelector('[data-pgsize]'); if (psel) psel.onchange = (e) => { state.pageSize = +e.target.value; state.page = 1; render(); };
    }
    render();
  }

  // ============ Commerce "By dimension" report (T2) + Social→platform drill ⭐ ============
  const COMMERCE_DIM_LABELS = {
    'Channel': ['Direct', 'Search', 'Social', 'Email', 'Referral', 'Paid'],
    'Country/Region': ['United States', 'Australia', 'United Kingdom', 'Canada', 'Germany', 'New Zealand', 'Singapore', 'Ireland', 'France', 'Netherlands'],
    'Discount code': ['SUMMER20', 'WELCOME10', 'VIP15', 'FLASH30', 'FREESHIP', 'BUNDLE25'],
    'Variant': ['Black / S', 'Black / M', 'Black / L', 'Black / XL', 'Grey / M', 'Grey / L', 'Nude / M', 'Beige / M'],
    'Product name': ['3D Anti-Cellulite Leggings', 'Silix Pocket 3D Sculpting Leggings', 'Silix 3D Compression Sleeves', '3D Anti-Cellulite Short Leggings', 'SILIX Butt-Lifting Pocket Capris'],
    'Payment method': ['PayPal', 'Stripe', 'Airwallex'],
    'Customer type': ['New', 'Returning'],
    'Social platform': ['Facebook', 'Instagram', 'X', 'TikTok', 'YouTube', 'Pinterest'],
  };
  const SOCIAL_PLATFORMS = ['Facebook', 'Instagram', 'X', 'TikTok', 'YouTube', 'Social (other)'];
  function cMetricVal(metric, ts, r) {
    switch (metric) {
      case 'Total sales': return ts;
      case 'Net sales': return Math.round(ts * 0.968);
      case 'Gross sales': return Math.round(ts * 1.162);
      case 'Discounts': return -Math.round(ts * 0.158);
      case 'Returns': return -Math.round(ts * 0.008);
      case 'Refund amount': return -Math.round(ts * 0.01);
      case 'Shipping': return Math.round(ts * 0.031);
      case 'Gross profit': return Math.round(ts * 0.452);
      case 'Gross margin': return +(43 + rand(r) * 5).toFixed(1);
      case 'Orders': return Math.round(ts / 57.9);
      case 'Sales quantity': return Math.round(ts / 39);
      case 'Average order value': return +(52 + rand(r) * 10).toFixed(2);
      case 'Units per transaction': return +(1.3 + rand(r) * 0.3).toFixed(2);
      case 'Customers': return Math.round(ts / 120);
      default: return Math.round(ts * 0.2);
    }
  }
  function commerceDimRows(dim, metrics) {
    const labels = COMMERCE_DIM_LABELS[dim] || ['Value A', 'Value B', 'Value C', 'Value D', 'Value E'];
    return labels.map((label, i) => {
      const r = { s: seedOf('CD|' + dim + '|' + label) };
      const ts = Math.max(9000, Math.round((1400000 - i * 150000) * (0.55 + rand(r) * 0.8)));
      const vals = {}; metrics.forEach((m) => (vals[m] = cMetricVal(m, ts, r)));
      return { label, vals, _ts: ts };
    });
  }
  function socialDrillRows(parentTs, metrics) {
    const frac = [0.46, 0.27, 0.11, 0.08, 0.03, 0.05];
    return SOCIAL_PLATFORMS.map((p, i) => {
      const r = { s: seedOf('SOC|' + p) };
      const vals = {}; metrics.forEach((m) => (vals[m] = cMetricVal(m, Math.round(parentTs * frac[i]), r)));
      return { label: p, vals };
    });
  }
  function viewCommerceDimReport(view, cfg) {
    const state = { dim: cfg.dim, metrics: cfg.metrics.slice(), sortCol: 0, sortDir: 'desc', page: 1, pageSize: 20, filters: [], expanded: new Set() };
    onChipChange = () => render();
    function render() {
      disposeCharts();
      const cur = CUR[CHIP_STATE.currency] || { sym: '$', rate: 1 };
      const fmt = (m, v) => cFmt(m, v, cur);
      let rows = commerceDimRows(state.dim, state.metrics);
      state.filters.forEach((f) => { if (f.value) rows = rows.filter((r) => f.op === 'is' ? String(r.label).toLowerCase() === f.value.toLowerCase() : f.op === 'is not' ? String(r.label).toLowerCase() !== f.value.toLowerCase() : String(r.label).toLowerCase().includes(f.value.toLowerCase())); });
      const mk = state.metrics[state.sortCol] || state.metrics[0];
      rows = rows.slice().sort((a, b) => state.sortDir === 'desc' ? b.vals[mk] - a.vals[mk] : a.vals[mk] - b.vals[mk]);
      const sum = {}; state.metrics.forEach((m) => { const all = rows.reduce((a, b) => a + (b.vals[m] || 0), 0); sum[m] = (C_RATE.has(m) || C_RATIO.has(m)) ? all / (rows.length || 1) : all; });
      const totalRows = rows.length, totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
      const sTh = (label, ci) => `<th class="num" data-sort="${ci}" style="cursor:pointer;white-space:nowrap">${label}${state.sortCol === ci ? (state.sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</th>`;
      const cell0 = (r, child) => `<td>${child ? '<span style="display:inline-block;width:16px"></span>↳ ' : (cfg.drill && r.label === 'Social' ? `<span class="drill-caret${state.expanded.has('Social') ? ' open' : ''}" data-drill="Social">${ICON.chevDown}</span>` : '')}${r.label}</td>`;
      const trHtml = (r, child) => `<tr${child ? ' class="drill-row"' : ''}>${cell0(r, child)}${state.metrics.map((m) => `<td class="num">${fmt(m, r.vals[m])}</td>`).join('')}</tr>`;
      let body = '';
      pageRows.forEach((r) => { body += trHtml(r, false); if (cfg.drill && r.label === 'Social' && state.expanded.has('Social')) socialDrillRows(r._ts, state.metrics).forEach((c) => (body += trHtml(c, true))); });
      view.innerHTML = `<div class="view-wrap">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><button class="back-btn" data-route="#/analytics/reports">${ICON.arrowLeft}</button><h1 class="page-title" style="font-size:18px">${cfg.title}</h1></div>
          <div class="flex items-center gap-2"><button class="btn btn-default" data-act="saveas">Save as</button><button class="btn btn-default" data-act="fav">Favorites</button></div>
        </div>
        ${chipBar({ currency: true })}
        <div class="panel">
          <div class="p-3 flex items-center justify-between" style="border-bottom:1px solid var(--hair)">
            <span class="flex items-center gap-2" style="flex-wrap:wrap"><button class="btn btn-gray" data-act="filters">Manage filters${state.filters.length ? ` (${state.filters.length})` : ''}</button>${state.filters.map((f, i) => `<span class="chip" style="background:#e6f0ff;color:var(--brand);border-color:#cfe1ff">${f.dim} ${f.op} ${f.value}<span data-rmf="${i}" style="cursor:pointer;margin-left:6px">×</span></span>`).join('')}${cfg.drill ? '<span class="muted" style="font-size:12px">· Social row expands to platforms</span>' : ''}</span>
            <button class="btn btn-default" data-act="edit">Edit</button>
          </div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${state.dim}</th>${state.metrics.map((m, ci) => sTh(m, ci)).join('')}</tr></thead><tbody><tr style="font-weight:600;background:var(--panel)"><td>Summary</td>${state.metrics.map((m) => `<td class="num">${fmt(m, sum[m])}</td>`).join('')}</tr>${body}</tbody></table></div>
          <div class="p-3 flex items-center justify-between" style="border-top:1px solid var(--hair)">
            <span class="muted" style="font-size:13px">Total ${totalRows} records</span>
            <div class="pg">
              <span class="pg-item${state.page <= 1 ? ' disabled' : ''}" data-pg="prev">‹</span>
              ${Array.from({ length: totalPages }, (_, i) => `<span class="pg-item${state.page === i + 1 ? ' active' : ''}" data-pg="${i + 1}">${i + 1}</span>`).join('')}
              <span class="pg-item${state.page >= totalPages ? ' disabled' : ''}" data-pg="next">›</span>
              <select class="pg-size" data-pgsize>${[20, 50, 100].map((n) => `<option value="${n}"${state.pageSize === n ? ' selected' : ''}>${n} / page</option>`).join('')}</select>
            </div>
          </div>
        </div>
      </div>`;
      view.querySelectorAll('[data-route]').forEach((e) => (e.onclick = () => (location.hash = e.getAttribute('data-route'))));
      view.querySelector('[data-act="saveas"]').onclick = () => saveAsModal(CURRENT_REPORT); bindFav(view);
      bindFav(view);
      view.querySelector('[data-act="edit"]').onclick = () => editDrawer(COMMERCE_CAT, { dims: new Set([state.dim]), metrics: new Set(state.metrics) }, (res) => { if (res.dims.length) state.dim = res.dims[0]; if (res.metrics.length) state.metrics = res.metrics; state.sortCol = 0; state.page = 1; state.expanded.clear(); render(); });
      view.querySelector('[data-act="filters"]').onclick = () => manageFiltersModal(state.filters, () => { state.page = 1; render(); }, COMMERCE_CAT.dimensions);
      view.querySelectorAll('[data-rmf]').forEach((b) => (b.onclick = () => { state.filters.splice(+b.getAttribute('data-rmf'), 1); render(); }));
      view.querySelectorAll('[data-drill]').forEach((b) => (b.onclick = () => { const k = b.getAttribute('data-drill'); state.expanded.has(k) ? state.expanded.delete(k) : state.expanded.add(k); render(); }));
      view.querySelectorAll('[data-sort]').forEach((th) => (th.onclick = () => { const ci = +th.getAttribute('data-sort'); if (state.sortCol === ci) state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc'; else { state.sortCol = ci; state.sortDir = 'desc'; } render(); }));
      view.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => { const v = b.getAttribute('data-pg'); if (v === 'prev') state.page = Math.max(1, state.page - 1); else if (v === 'next') state.page = Math.min(totalPages, state.page + 1); else state.page = +v; render(); }));
      const psel = view.querySelector('[data-pgsize]'); if (psel) psel.onchange = (e) => { state.pageSize = +e.target.value; state.page = 1; render(); };
    }
    render();
  }

  // ============ T5 fixed report (chart + fixed table, no Edit/filters): Payment success rate ⭐ ============
  function viewPaymentSuccess(view) {
    const CH = [{ ch: 'PayPal', total: 1002, success: 968 }, { ch: 'Stripe', total: 231, success: 221 }, { ch: 'Airwallex', total: 148, success: 139 }];
    const OPTS = ['Payment success rate', 'Total payments', 'Successful payments'];
    const state = { chartMetrics: ['Payment success rate'] };
    onChipChange = () => render();
    const psSeries = (m) => { const r = { s: seedOf('PS|' + m) }; return SALES_TREND.dates.map(() => (m === 'Payment success rate' ? +(92 + rand(r) * 6).toFixed(1) : m === 'Total payments' ? Math.round(40 + rand(r) * 34) : Math.round(36 + rand(r) * 30))); };
    const rate = (s, t) => (t ? (s / t * 100).toFixed(1) : '0.0') + '%';
    function render() {
      disposeCharts();
      const sumT = CH.reduce((a, b) => a + b.total, 0), sumS = CH.reduce((a, b) => a + b.success, 0);
      view.innerHTML = `<div class="view-wrap">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><button class="back-btn" data-route="#/analytics/reports">${ICON.arrowLeft}</button><h1 class="page-title" style="font-size:18px">Orders: Payment success rate</h1></div>
          <div class="flex items-center gap-2"><button class="btn btn-default" data-act="saveas">Save as</button><button class="btn btn-default" data-act="fav">Favorites</button></div>
        </div>
        ${chipBar({ timeunit: true })}
        <div class="panel card-pad mb-4">
          <div class="flex items-center gap-3 mb-2">
            <span class="metric-sel" data-msel="0">${state.chartMetrics[0]}${ICON.chevDown}</span>
            ${state.chartMetrics[1] ? `<span class="muted">and</span><span class="metric-sel" data-msel="1">${state.chartMetrics[1]}${ICON.chevDown}</span><a class="lnk" data-mdel>Delete</a>` : `<a class="lnk" data-madd>Add metrics</a>`}
          </div>
          <div id="ps-chart" style="height:280px"></div>
        </div>
        <div class="panel">
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Payment channel</th><th class="num">Total payments</th><th class="num">Successful payments</th><th class="num">Payment success rate</th><th class="num">Options</th></tr></thead><tbody>
            <tr style="font-weight:600;background:var(--panel)"><td>Summary</td><td class="num">${sumT.toLocaleString()}</td><td class="num">${sumS.toLocaleString()}</td><td class="num">${rate(sumS, sumT)}</td><td class="num">—</td></tr>
            ${CH.map((c) => `<tr><td>${c.ch}</td><td class="num">${c.total.toLocaleString()}</td><td class="num">${c.success.toLocaleString()}</td><td class="num">${rate(c.success, c.total)}</td><td class="num"><span class="lnk" data-view="${c.ch}">View</span></td></tr>`).join('')}
          </tbody></table></div>
          <div class="p-3 flex items-center justify-between" style="border-top:1px solid var(--hair)"><span class="muted" style="font-size:13px">Total ${CH.length} records</span><span class="muted" style="font-size:12px">Fixed report · no Edit / Manage filters</span></div>
        </div>
      </div>`;
      const comp = CHIP_STATE.comparison !== 'No comparison';
      const cs = state.chartMetrics.map((m) => { const v = psSeries(m); return { name: m, vals: v, comp: comp ? v.map((x) => Math.round(x * 0.9 * 10) / 10) : null }; });
      mkChart(document.getElementById('ps-chart'), drChartOpt(SALES_TREND.dates, cs, false));
      view.querySelectorAll('[data-route]').forEach((e) => (e.onclick = () => (location.hash = e.getAttribute('data-route'))));
      view.querySelector('[data-act="saveas"]').onclick = () => saveAsModal(CURRENT_REPORT); bindFav(view);
      bindFav(view);
      view.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => toast('Payment channel · ' + b.getAttribute('data-view'))));
      const pickMetric = (slot, el) => openPopover(el, OPTS.filter((o) => !state.chartMetrics.includes(o) || state.chartMetrics[slot] === o).map((o) => `<div class="opt" data-v="${o}">${o}${state.chartMetrics[slot] === o ? ' ✓' : ''}</div>`).join(''), (pop, close) => pop.querySelectorAll('[data-v]').forEach((o) => (o.onclick = () => { state.chartMetrics[slot] = o.getAttribute('data-v'); close(); render(); })));
      view.querySelectorAll('[data-msel]').forEach((el) => (el.onclick = () => pickMetric(+el.getAttribute('data-msel'), el)));
      const madd = view.querySelector('[data-madd]'); if (madd) madd.onclick = () => { state.chartMetrics.push(OPTS.find((o) => !state.chartMetrics.includes(o)) || OPTS[1]); render(); };
      const mdel = view.querySelector('[data-mdel]'); if (mdel) mdel.onclick = () => { state.chartMetrics = [state.chartMetrics[0]]; render(); };
    }
    render();
  }

  // ============ T4 special-viz reports (funnel / cohort table / finance waterfall) ============
  function t4Header(title) {
    return `<div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2"><button class="back-btn" data-route="#/analytics/reports">${ICON.arrowLeft}</button><h1 class="page-title" style="font-size:18px">${title}</h1></div>
      <div class="flex items-center gap-2"><button class="btn btn-default" data-act="saveas">Save as</button><button class="btn btn-default" data-act="fav">Favorites</button></div>
    </div>`;
  }
  function t4Bind(view) {
    view.querySelectorAll('[data-route]').forEach((e) => (e.onclick = () => (location.hash = e.getAttribute('data-route'))));
    const sb = view.querySelector('[data-act="saveas"]'); if (sb) sb.onclick = () => saveAsModal(CURRENT_REPORT);
    bindFav(view);
  }
  function viewConversionFunnel(view) {
    onChipChange = () => render();
    const STAGES = [['Sessions', 1326165], ['Added to cart', 158520], ['Reached checkout', 79560], ['Added customer info', 68200], ['Added shipping method', 61300], ['Added payment info', 56721], ['Completed checkout', 30559]];
    function render() {
      disposeCharts();
      const top = STAGES[0][1], bottom = STAGES[STAGES.length - 1][1];
      const kpis = [['Conversion rate', (bottom / top * 100).toFixed(2) + '%'], ['Sessions', top.toLocaleString()], ['Completed checkout', bottom.toLocaleString()], ['Biggest drop-off', 'Cart → Checkout']];
      view.innerHTML = `<div class="view-wrap">
        ${t4Header('Conversion rate breakdown')}
        ${chipBar({})}
        <div class="grid grid-cols-4 gap-3 mb-4">${kpis.map(([k, v], i) => `<div class="panel card-pad"${i === 0 ? ' style="border:1px solid var(--brand)"' : ''}><div class="muted" style="font-size:13px">${k}</div><div class="stat-value mt-1" style="font-size:22px">${v}</div></div>`).join('')}</div>
        <div class="panel card-pad"><div class="card-title mb-3">Conversion funnel</div>
          ${STAGES.map((s, i) => { const pct = s[1] / top * 100; const step = i ? (s[1] / STAGES[i - 1][1] * 100) : null; return `<div style="margin-bottom:12px">
            <div class="flex items-center justify-between" style="font-size:13px;margin-bottom:4px"><span style="font-weight:500">${s[0]}</span><span class="muted">${s[1].toLocaleString()} · ${pct.toFixed(1)}% of sessions</span></div>
            <div style="height:26px;background:var(--panel);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.max(pct, 1)}%;background:var(--brand);opacity:${1 - i * 0.1}"></div></div>
            ${step !== null ? `<div class="muted" style="font-size:11px;margin-top:3px">↓ ${step.toFixed(1)}% step conversion · ${(100 - step).toFixed(1)}% drop-off</div>` : ''}
          </div>`; }).join('')}
        </div>
      </div>`;
      t4Bind(view);
    }
    render();
  }
  function viewCohort(view) {
    onChipChange = () => render();
    function render() {
      disposeCharts();
      const n = COHORT.matrix[0].length;
      const heads = ['Current month', ...Array.from({ length: n }, (_, i) => `Month ${i + 1}`)];
      const cell = (v) => { if (v == null) return '<td class="num" style="color:#cbd5e1">·</td>'; const a = Math.min(0.88, v / 13); return `<td class="num" style="background:rgba(0,102,230,${a.toFixed(2)});color:${v > 6 ? '#fff' : 'var(--ink)'}">${v.toFixed(2)}%</td>`; };
      view.innerHTML = `<div class="view-wrap">
        ${t4Header('Customer group analysis')}
        ${chipBar({})}
        <div class="muted mb-3" style="font-size:13px">Retention by signup cohort — % of each cohort that ordered again in later months. Source: derived (神策 + orders).</div>
        <div class="panel" style="overflow:auto"><table class="tbl"><thead><tr><th>Cohort</th>${heads.map((h) => `<th class="num">${h}</th>`).join('')}</tr></thead><tbody>
          ${COHORT.cohorts.map((c, ri) => `<tr><td style="white-space:nowrap;font-weight:500">${c}</td><td class="num" style="background:rgba(0,102,230,0.92);color:#fff">100.00%</td>${COHORT.matrix[ri].map(cell).join('')}</tr>`).join('')}
        </tbody></table></div>
      </div>`;
      t4Bind(view);
    }
    render();
  }
  function viewFinanceSummary(view) {
    onChipChange = () => render();
    function render() {
      disposeCharts();
      const cur = CUR[CHIP_STATE.currency] || { sym: '$', rate: 1 };
      const fmt = (val) => { const num = parseFloat(String(val).replace(/[^0-9.\-]/g, '')) || 0; return (num < 0 ? '-' : '') + cur.sym + Math.abs(Math.round(num * cur.rate)).toLocaleString(); };
      view.innerHTML = `<div class="view-wrap">
        ${t4Header('Finance summary')}
        ${chipBar({ currency: true })}
        <div class="panel"><table class="tbl"><thead><tr><th>Item</th><th class="num">Amount</th></tr></thead><tbody>
          ${BREAKDOWN.map((b) => `<tr style="${b.strong ? 'font-weight:600;background:var(--panel)' : ''}"><td>${b.label}</td><td class="num" style="${b.neg ? 'color:var(--err)' : ''}">${b.label === 'Taxes' ? '<span class="muted">N/A</span>' : fmt(b.value)}</td></tr>`).join('')}
        </tbody></table>
        <div class="p-3 muted" style="border-top:1px solid var(--hair);font-size:12px">Fixed report · no Edit / Manage filters. Net sales = Gross sales − Discounts − Returns; Total sales = Net sales + Shipping (tax not tracked in our model — N/A).</div>
        </div>
      </div>`;
      t4Bind(view);
    }
    render();
  }

  function viewUserPath(view) {
    onChipChange = () => render();
    function render() {
      disposeCharts();
      view.innerHTML = `<div class="view-wrap">
        ${t4Header('User path analysis')}
        ${chipBar({})}
        <div class="muted mb-3" style="font-size:13px">Most common navigation flows through your store. Source: behavior (神策) page sequences.</div>
        <div class="panel card-pad"><div id="sankey" style="height:460px"></div></div>
      </div>`;
      const nodes = [{ name: 'Landing' }, { name: 'Home' }, { name: 'Collection' }, { name: 'Product' }, { name: 'Search' }, { name: 'Cart' }, { name: 'Checkout' }, { name: 'Purchased' }, { name: 'Exit' }];
      const links = [
        { source: 'Landing', target: 'Product', value: 62000 }, { source: 'Landing', target: 'Home', value: 28000 }, { source: 'Landing', target: 'Collection', value: 18000 },
        { source: 'Home', target: 'Collection', value: 15000 }, { source: 'Home', target: 'Product', value: 9000 }, { source: 'Home', target: 'Exit', value: 4000 },
        { source: 'Collection', target: 'Product', value: 26000 }, { source: 'Collection', target: 'Exit', value: 7000 }, { source: 'Search', target: 'Product', value: 8000 },
        { source: 'Product', target: 'Cart', value: 34000 }, { source: 'Product', target: 'Exit', value: 61000 },
        { source: 'Cart', target: 'Checkout', value: 21000 }, { source: 'Cart', target: 'Exit', value: 13000 },
        { source: 'Checkout', target: 'Purchased', value: 13000 }, { source: 'Checkout', target: 'Exit', value: 8000 },
      ];
      mkChart(document.getElementById('sankey'), { tooltip: { trigger: 'item', triggerOn: 'mousemove' }, series: [{ type: 'sankey', data: nodes, links: links, emphasis: { focus: 'adjacency' }, nodeGap: 14, lineStyle: { color: 'gradient', opacity: 0.45, curveness: 0.5 }, itemStyle: { color: '#0066e6', borderColor: '#0066e6' }, label: { color: '#242833', fontSize: 12 } }] });
      t4Bind(view);
    }
    render();
  }
  function viewAttribution(view) {
    onChipChange = () => render();
    const CHANNELS = ['Direct', 'Search', 'Social', 'Email', 'Referral', 'Paid'];
    function render() {
      disposeCharts();
      const cur = CUR[CHIP_STATE.currency] || { sym: '$', rate: 1 };
      const rows = CHANNELS.map((ch, i) => { const r = { s: seedOf('ATTR|' + ch) }; const base = Math.round((320000 - i * 42000) * (0.6 + rand(r) * 0.7)); const first = Math.round(base * (0.9 + rand(r) * 0.4)); const last = Math.round(base * (0.8 + rand(r) * 0.5)); return { ch, first, last, linear: Math.round((first + last) / 2) }; });
      const m = (v) => cur.sym + Math.round(v * cur.rate).toLocaleString();
      const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
      view.innerHTML = `<div class="view-wrap">
        ${t4Header('Attribution model comparison')}
        ${chipBar({ currency: true })}
        <div class="muted mb-3" style="font-size:13px">Attributed sales by channel under different models. Source: behavior (神策) attribution — first-touch / last-touch / linear.</div>
        <div class="panel"><table class="tbl"><thead><tr><th>Channel</th><th class="num">First-touch</th><th class="num">Last-touch</th><th class="num">Linear</th></tr></thead><tbody>
          <tr style="font-weight:600;background:var(--panel)"><td>Summary</td><td class="num">${m(sum('first'))}</td><td class="num">${m(sum('last'))}</td><td class="num">${m(sum('linear'))}</td></tr>
          ${rows.map((r) => `<tr><td>${r.ch}</td><td class="num">${m(r.first)}</td><td class="num">${m(r.last)}</td><td class="num">${m(r.linear)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
      t4Bind(view);
    }
    render();
  }
  function viewABC(view) {
    onChipChange = () => render();
    function render() {
      disposeCharts();
      const cur = CUR[CHIP_STATE.currency] || { sym: '$', rate: 1 };
      let rows = PRODUCT_DATA.map((p) => ({ name: p.name, rev: p.sales })).sort((a, b) => b.rev - a.rev);
      const total = rows.reduce((s, r) => s + r.rev, 0);
      let cum = 0;
      rows = rows.map((r) => { cum += r.rev; const cumPct = cum / total * 100; return Object.assign(r, { pct: r.rev / total * 100, cumPct, grade: cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C' }); });
      const badge = (g) => `<span style="display:inline-block;padding:1px 8px;border-radius:9999px;font-size:11.5px;font-weight:600;${g === 'A' ? 'background:#e0f2ec;color:#00684a' : g === 'B' ? 'background:#fff7e0;color:#9a6b00' : 'background:#fee2e2;color:#b42318'}">${g}</span>`;
      view.innerHTML = `<div class="view-wrap">
        ${t4Header('ABC product analysis')}
        ${chipBar({ currency: true })}
        <div class="muted mb-3" style="font-size:13px">Pareto classification by revenue contribution — A: top 80%, B: next 15%, C: last 5%.</div>
        <div class="panel"><table class="tbl"><thead><tr><th>NO.</th><th>Product</th><th class="num">Revenue</th><th class="num">% of total</th><th class="num">Cumulative %</th><th class="num">Grade</th></tr></thead><tbody>
          ${rows.map((r, i) => `<tr><td>${i + 1}</td><td><span style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block">${r.name}</span></td><td class="num">${cur.sym}${Math.round(r.rev * cur.rate).toLocaleString()}</td><td class="num">${r.pct.toFixed(1)}%</td><td class="num">${r.cumPct.toFixed(1)}%</td><td class="num">${badge(r.grade)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
      t4Bind(view);
    }
    render();
  }

  const BEHAVIOR_CFG = {
    sessions_by_location: { title: 'Traffic acquisition: By country/region', dim: 'Country/Region', metrics: ['Sessions', 'Added to cart', 'Reached checkout', 'Completed checkout'] },
    sessions_by_device: { title: 'Traffic acquisition: By device', dim: 'Device type', metrics: ['Sessions', 'Added to cart', 'Reached checkout', 'Completed checkout'] },
    sessions_by_landing: { title: 'Top landing pages by sessions', dim: 'Landing page URL', metrics: ['Sessions', 'Reached checkout', 'Completed checkout', 'Conversion rate'] },
    sessions_by_referrer: { title: 'Traffic acquisition: By channel', dim: 'Referrer source', metrics: ['Sessions', 'Added to cart', 'Reached checkout', 'Completed checkout'] },
  };
  const DATE_RANGE_CFG = {
    sales_over_time: { title: 'Sales : By date range', source: 'Commerce', chartDefault: 'Total sales', tableMetrics: ['Discounts', 'Shipping', 'Net sales', 'Total sales', 'Gross profit', 'Orders'] },
  };
  const BESPOKE_REPORTS = { sales_by_product: viewProductDataDetails };
  Object.keys(BEHAVIOR_CFG).forEach((id) => (BESPOKE_REPORTS[id] = (view) => viewBehaviorReport(view, BEHAVIOR_CFG[id])));
  Object.keys(DATE_RANGE_CFG).forEach((id) => (BESPOKE_REPORTS[id] = (view) => viewDateRangeReport(view, Object.assign({ id }, DATE_RANGE_CFG[id]))));
  const COMMERCE_DIM_CFG = {
    sales_by_channel: { title: 'Sales: By channel', source: 'Commerce', dim: 'Channel', metrics: ['Total sales', 'Orders', 'Average order value', 'Gross profit'], drill: true },
    sales_by_billing_location: { title: 'Sales: By country/region', source: 'Commerce', dim: 'Country/Region', metrics: ['Total sales', 'Orders', 'Average order value'] },
    sales_by_discount: { title: 'Sales: By discount code', source: 'Commerce', dim: 'Discount code', metrics: ['Orders', 'Discounts', 'Total sales'] },
    sales_by_variant: { title: 'Sales: By variant (SKU)', source: 'Commerce', dim: 'Variant', metrics: ['Total sales', 'Sales quantity', 'Orders'] },
    customers_by_location: { title: 'Customers: By location', source: 'Commerce', dim: 'Country/Region', metrics: ['Customers', 'Orders', 'Total sales'] },
    top_products_units: { title: 'Top products by units sold', source: 'Commerce', dim: 'Product name', metrics: ['Sales quantity', 'Total sales', 'Orders'] },
    social_referrer_sales: { title: 'Sales by social referrer', source: 'Commerce', dim: 'Social platform', metrics: ['Total sales', 'Orders', 'Average order value'] },
  };
  Object.keys(COMMERCE_DIM_CFG).forEach((id) => (BESPOKE_REPORTS[id] = (view) => viewCommerceDimReport(view, COMMERCE_DIM_CFG[id])));
  BESPOKE_REPORTS.payment_success_rate = viewPaymentSuccess;
  BESPOKE_REPORTS.conversion_funnel = viewConversionFunnel;
  BESPOKE_REPORTS.customer_cohort = viewCohort;
  BESPOKE_REPORTS.retention = viewCohort;
  BESPOKE_REPORTS.finance_summary = viewFinanceSummary;
  BESPOKE_REPORTS.sales_breakdown = viewFinanceSummary;
  BESPOKE_REPORTS.user_path = viewUserPath;
  BESPOKE_REPORTS.abc_analysis = viewABC;
  BESPOKE_REPORTS.attribution_model_comparison = viewAttribution;

  function viewReportDetail(view, id) {
    CURRENT_REPORT = id;
    if (BESPOKE_REPORTS[id]) return BESPOKE_REPORTS[id](view, getReport(id));
    const r = getReport(id); if (!r) return viewReports(view);
    const model = buildModel(r);
    const isTime = model.kind === 'time';
    const isSingle = r.viz === 'single';
    const showChart = ['line', 'bar', 'barH', 'donut', 'funnel', 'cohort'].includes(r.viz) && !isSingle;
    const showTable = !isSingle && model.kind !== 'cohort';
    const dimName = prettify(model.dim || r.dims[0] || 'metric');
    const state = { sortCol: null, sortDir: 'desc', filters: [], fpOpen: false, viz: r.viz, page: 1, pageSize: 20, metrics: (model.metricKeys || []).slice() };
    // ---- Edit (columns): map drawer labels <-> metric keys + synthesize values for metrics added via Edit ----
    const _catMet = (CATALOG_FOR(r.source).metrics || []).reduce((a, g) => a.concat(g[1]), []);
    const LABELOF = {}, KEYOF = {};
    (model.metricKeys || []).forEach((k) => { const L = _catMet.find((l) => l.toLowerCase() === prettify(k).toLowerCase()) || prettify(k); LABELOF[k] = L; KEYOF[L.toLowerCase()] = k; });
    const labelOf = (k) => LABELOF[k] || prettify(k);
    const slugKey = (s) => 'x_' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    function ensureVals(keys) { (model.rows || []).forEach((row) => keys.forEach((m) => { if (row.vals[m] == null) { const rr = { s: seedOf(r.id + '|' + row.label + '|' + m) }; row.vals[m] = Math.round((isMoney(m) ? 60000 : isRate(m) ? 100 : 900) * (0.35 + rand(rr) * 0.65)); } })); }
    let mk = (model.metricKeys || []).slice();
    const VIZ_SHAPES = [['line', 'Line'], ['bar', 'Column'], ['barH', 'Bar'], ['donut', 'Donut']];
    const showSwitcher = ['line', 'bar', 'barH', 'donut'].includes(r.viz);
    onChipChange = () => render();
    function processed() {
      let rows = (model.rows || []).map((x) => ({ label: x.label, vals: Object.assign({}, x.vals) }));
      if (isTime) { rows = rows.slice(CHIP_STATE._range.s, CHIP_STATE._range.e + 1); rows = aggRows(rows, CHIP_STATE.timeunit, mk); }
      state.filters.forEach((f) => { rows = rows.filter((row) => f.op === 'is' ? row.label === f.value : f.op === 'is not' ? row.label !== f.value : String(row.label).toLowerCase().includes(String(f.value).toLowerCase())); });
      return rows;
    }
    function render() {
      disposeCharts();
      const cur = CUR[CHIP_STATE.currency] || { sym: '$', rate: 1 };
      mk = state.metrics; ensureVals(mk);
      const fmtV = (m, v) => isMoney(m) ? cur.sym + Math.round(v * cur.rate).toLocaleString() : isRate(m) ? (Math.round(v * 100) / 100) + '%' : Math.round(v).toLocaleString();
      let rows = processed();
      if (state.sortCol != null && mk[state.sortCol]) { const m = mk[state.sortCol]; rows = rows.slice().sort((a, b) => state.sortDir === 'desc' ? b.vals[m] - a.vals[m] : a.vals[m] - b.vals[m]); }
      const totalRows = rows.length;
      const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
      view.innerHTML = `<div class="view-wrap">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><button class="back-btn" data-route="#/analytics/reports">${ICON.arrowLeft}</button><h1 class="page-title" style="font-size:18px">${r.name}</h1></div>
          <div class="flex items-center gap-2">${showSwitcher ? `<span class="chip" data-chart-type><span class="muted" style="margin-right:4px">Chart:</span><span data-chart-label>${(VIZ_SHAPES.find(([k]) => k === state.viz) || ['', ''])[1]}</span>${ICON.chevDown}</span>` : ''}<button class="btn btn-default" data-act="saveas">Save as</button><button class="btn btn-default" data-act="fav">Favorites</button></div>
        </div>
        ${chipBar({ currency: true, timeunit: isTime })}
        ${isSingle ? `<div class="panel card-pad" style="padding:28px"><div class="muted" style="font-size:13px">${prettify(mk[0] || r.name)}</div><div class="stat-value" style="font-size:40px;margin-top:6px">${fmtV(mk[0] || '', (model.rows || []).reduce((a, b) => a + (b.vals[mk[0]] || 0), 0) || 4127)}</div></div>` : ''}
        ${showChart ? `<div class="panel card-pad mb-4"><div id="viz-area"></div></div>` : ''}
        ${showTable ? `<div class="panel">
          <div class="p-3 flex items-center justify-between" style="border-bottom:1px solid var(--hair)">
            <button class="btn btn-gray" data-act="filters">Manage filters${state.filters.length ? ` (${state.filters.length})` : ''}</button>
            <button class="btn btn-default" data-act="edit">Edit</button>
          </div>
          <div id="fpanel"></div>
          <div id="table-area"></div>
          <div class="p-3 flex items-center justify-between" style="border-top:1px solid var(--hair)">
            <span class="muted" style="font-size:13px">Total ${totalRows} records</span>
            <div class="pg">
              <span class="pg-item${state.page <= 1 ? ' disabled' : ''}" data-pg="prev">‹</span>
              ${Array.from({ length: totalPages }, (_, i) => `<span class="pg-item${state.page === i + 1 ? ' active' : ''}" data-pg="${i + 1}">${i + 1}</span>`).join('')}
              <span class="pg-item${state.page >= totalPages ? ' disabled' : ''}" data-pg="next">›</span>
              <select class="pg-size" data-pgsize>${[20, 50, 100].map((n) => `<option value="${n}"${state.pageSize === n ? ' selected' : ''}>${n} / page</option>`).join('')}</select>
            </div>
          </div>
        </div>` : ''}
      </div>`;
      if (showChart) {
        const node = document.getElementById('viz-area');
        if (model.kind === 'funnel') { renderVizInto(node, { viz: 'funnel' }); }
        else if (model.kind === 'cohort') { node.style.height = '300px'; mkChart(node, heatmapOpt(COHORT)); }
        else {
          node.style.height = '300px';
          const vz = state.viz;
          const color = r.source === 'Behavior' ? '#5ab1ef' : '#0066e6';
          const data = rows.map((x) => ({ name: x.label, value: Math.round((x.vals[mk[0]] || 0) * (isMoney(mk[0]) ? cur.rate : 1)) }));
          const comp = CHIP_STATE.comparison !== 'No comparison' ? data.map((d) => Math.round(d.value * 0.88)) : null;
          if (vz === 'donut') { mkChart(node, donutOpt(data.slice(0, 8), '', ['#0066e6', '#5ab1ef', '#a5c8ff', '#cfe1ff', '#e6f0ff', '#dbeafe', '#bfdbfe', '#eff6ff'])); }
          else if (vz === 'bar') { mkChart(node, barOptV(data, color, comp)); }
          else if (vz === 'barH') { mkChart(node, barOptH(data, color, comp)); }
          else { mkChart(node, mkLineOpt(data.map((d) => d.name), data.map((d) => d.value), color, comp)); }
        }
      }
      if (showTable) {
        const ta = document.getElementById('table-area');
        const cols = [dimName, ...mk.map(labelOf)];
        ta.innerHTML = `<table class="tbl"><thead><tr>${cols.map((c, i) => `<th class="${i ? 'num' : ''}" ${i ? `data-sort="${i - 1}" style="cursor:pointer"` : ''}>${c}${i && state.sortCol === i - 1 ? (state.sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</th>`).join('')}</tr></thead><tbody>${pageRows.map((row) => `<tr><td>${row.label}</td>${mk.map((m) => `<td class="num">${fmtV(m, row.vals[m])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        ta.querySelectorAll('[data-sort]').forEach((th) => (th.onclick = () => { const i = +th.getAttribute('data-sort'); if (state.sortCol === i) state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc'; else { state.sortCol = i; state.sortDir = 'desc'; } render(); }));
        view.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => { const v = b.getAttribute('data-pg'); if (v === 'prev') state.page = Math.max(1, state.page - 1); else if (v === 'next') state.page = Math.min(totalPages, state.page + 1); else state.page = +v; render(); }));
        const psel = view.querySelector('[data-pgsize]'); if (psel) psel.onchange = (e) => { state.pageSize = +e.target.value; state.page = 1; render(); };
        if (state.fpOpen) {
          const labelOpts = [...new Set((model.rows || []).map((x) => x.label))];
          document.getElementById('fpanel').innerHTML = `<div class="card-pad" style="border-bottom:1px solid var(--hair);background:var(--panel)">${state.filters.map((f, i) => `<div class="flex items-center gap-2 mb-2"><span style="font-size:13px;width:96px">${dimName}</span><select class="filter-select" data-fop="${i}"><option ${f.op === 'is' ? 'selected' : ''}>is</option><option ${f.op === 'is not' ? 'selected' : ''}>is not</option><option ${f.op === 'contains' ? 'selected' : ''}>contains</option></select><select class="filter-select" data-fval="${i}">${labelOpts.map((l) => `<option ${f.value === l ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="field-pill" style="cursor:pointer" data-frm="${i}">× remove</span></div>`).join('')}<button class="add-field" data-act="addfilter">+ Add filter</button></div>`;
          document.querySelectorAll('[data-fop]').forEach((s) => (s.onchange = (e) => { state.filters[+s.getAttribute('data-fop')].op = e.target.value; render(); }));
          document.querySelectorAll('[data-fval]').forEach((s) => (s.onchange = (e) => { state.filters[+s.getAttribute('data-fval')].value = e.target.value; render(); }));
          document.querySelectorAll('[data-frm]').forEach((b) => (b.onclick = () => { state.filters.splice(+b.getAttribute('data-frm'), 1); render(); }));
          document.querySelector('[data-act="addfilter"]').onclick = () => { state.filters.push({ op: 'is', value: labelOpts[0] }); render(); };
        }
        document.querySelector('[data-act="filters"]').onclick = () => manageFiltersModal(state.filters, () => { state.page = 1; render(); }, CATALOG_FOR(r.source).dimensions);
        document.querySelector('[data-act="edit"]').onclick = () => editDrawer({ dimensions: [], metrics: CATALOG_FOR(r.source).metrics }, { dims: new Set(), metrics: new Set(mk.map(labelOf)) }, (res) => { if (res.metrics && res.metrics.length) { state.metrics = res.metrics.map((L) => { const k = KEYOF[L.toLowerCase()] || slugKey(L); LABELOF[k] = L; KEYOF[L.toLowerCase()] = k; return k; }); state.sortCol = null; state.page = 1; render(); } });
      }
      view.querySelectorAll('[data-route]').forEach((e) => (e.onclick = () => (location.hash = e.getAttribute('data-route'))));
      const ctBtn = view.querySelector('[data-chart-type]');
      if (ctBtn) ctBtn.onclick = () => openPopover(ctBtn, VIZ_SHAPES.map(([k, lbl]) => `<div class="opt" data-v="${k}">${lbl}${state.viz === k ? ' ✓' : ''}</div>`).join(''), (pop, close) => pop.querySelectorAll('[data-v]').forEach((o) => (o.onclick = () => { state.viz = o.getAttribute('data-v'); close(); render(); })));
      view.querySelector('[data-act="saveas"]').onclick = () => saveAsModal(id); bindFav(view);
    }
    render();
  }

  function saveModal(cfg) {
    const back = document.createElement('div'); back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal"><div class="modal-head">Save report</div><div class="modal-body"><label class="muted" style="font-size:12px">Report name</label><input class="input mt-1" id="rname" value="${cfg.name === 'Untitled exploration' ? '' : cfg.name}" placeholder="e.g. Weekly sales by channel" /><div class="muted mt-3" style="font-size:12px">Saved reports appear in Reports and can be added to the Overview dashboard.</div></div><div class="modal-foot"><button class="btn btn-default" data-x>Cancel</button><button class="btn btn-primary" data-save>Save</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    back.querySelector('[data-x]').addEventListener('click', close);
    back.querySelector('[data-save]').addEventListener('click', () => { close(); toast('Report saved to your library'); });
    setTimeout(() => { const i = back.querySelector('#rname'); if (i) i.focus(); }, 30);
  }
  function globeOption() {
    return {
      backgroundColor: '#0b1020',
      globe: {
        baseTexture: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
        shading: 'lambert',
        atmosphere: { show: true },
        light: { main: { intensity: 1.4, shadow: false }, ambient: { intensity: 0.4 } },
        viewControl: { autoRotate: true, autoRotateSpeed: 8, distance: 185, rotateSensitivity: 2, zoomSensitivity: 1 },
      },
      series: [{
        type: 'scatter3D', coordinateSystem: 'globe', blendMode: 'lighter',
        symbolSize: 7, itemStyle: { color: '#3b9bff', opacity: 0.95 },
        data: CITY_COORDS,
      }],
    };
  }

  function viewLive(view) {
    const LIVE_LOC = [['Phoenix, US', 156], ['Los Angeles, US', 154], ['Chicago, US', 148], ['New York, US', 132], ['Houston, US', 120]];
    const dots = [[26, 38], [22, 46], [30, 33], [34, 30], [48, 28], [52, 64], [70, 36], [78, 58], [44, 42], [18, 40]];
    view.innerHTML = `<div class="view-wrap">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3"><h1 class="page-title">Live View</h1><span class="flex items-center gap-2 muted" style="font-size:13px"><span class="live-dot"></span>Just now</span></div>
        <button class="btn btn-default">Fullscreen</button>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="panel card-pad"><div class="muted" style="font-size:13px">Visitors right now</div><div class="stat-value mt-1" id="lv-visitors">128</div></div>
            <div class="panel card-pad"><div class="muted" style="font-size:13px">Total sales</div><div class="stat-value mt-1" id="lv-sales">$6,552</div></div>
            <div class="panel card-pad"><div class="muted" style="font-size:13px">Sessions</div><div class="stat-value mt-1" id="lv-sessions">9,280</div></div>
            <div class="panel card-pad"><div class="muted" style="font-size:13px">Orders</div><div class="stat-value mt-1" id="lv-orders">111</div></div>
          </div>
          <div class="panel card-pad">
            <div class="card-title mb-3">Customer behavior</div>
            <div class="grid grid-cols-3 gap-3">
              ${[['Active carts', 14, 100], ['Checking out', 5, 42], ['Purchased', 1, 18]].map(([l, n, hp]) => `<div><div class="muted" style="font-size:12px">${l}</div><div style="font-size:20px;font-weight:600;margin:2px 0">${n}</div><div style="height:64px;display:flex;align-items:flex-end"><div style="width:100%;background:var(--brand);height:${hp}%;border-radius:6px 6px 0 0"></div></div></div>`).join('')}
            </div>
          </div>
          <div class="panel card-pad">
            <div class="card-title mb-3">Sessions by location</div>
            ${LIVE_LOC.map(([n, v]) => `<div class="flex items-center justify-between py-1.5"><span class="subtle" style="font-size:13px">${n}</span><div class="flex items-center gap-2"><div style="width:90px;height:6px;background:var(--panel);border-radius:4px"><div style="height:6px;width:${(v / 156) * 100}%;background:var(--brand);border-radius:4px"></div></div><span style="font-size:12px;width:30px;text-align:right">${v}</span></div></div>`).join('')}
          </div>
          <div class="panel card-pad">
            <div class="card-title mb-2">New vs returning</div>
            <div class="flex gap-4 mb-2" style="font-size:13px"><span><span class="muted">New</span> <b>84</b></span><span><span class="muted">Returning</span> <b>27</b></span></div>
            <div style="height:14px;border-radius:7px;overflow:hidden;display:flex"><div style="width:76%;background:var(--brand)"></div><div style="width:24%;background:#7c3aed"></div></div>
          </div>
          <div class="panel card-pad">
            <div class="card-title mb-2">Top products</div>
            ${[['3D Anti-Cellulite Leggings', '$4,640'], ['Pocket Sculpting Leggings', '$464'], ['Compression Sleeves', '$320']].map(([n, v]) => `<div class="flex items-center justify-between py-1.5"><span class="subtle" style="font-size:13px">${n}</span><span style="font-size:13px;font-variant-numeric:tabular-nums">${v}</span></div>`).join('')}
          </div>
        </div>
        <div class="panel col-span-2" style="position:relative;overflow:hidden;min-height:560px;background:#0b1020">
          <div style="position:absolute;top:16px;left:16px;z-index:2"><div class="card-title" style="color:#fff">Live visitor & order activity</div><div style="font-size:12px;color:#aab4d4">Drag to rotate · scroll to zoom · dots = live visitors</div></div>
          <div id="globe" style="position:absolute;inset:0"></div>
          <div style="position:absolute;bottom:16px;left:16px;right:16px;z-index:2" class="flex items-center justify-between">
            <span class="pill pill-blue"><span class="dot"></span>Visitors right now <b style="margin-left:4px" id="lv-map-visitors">128</b></span>
            <span class="pill" style="background:#efe9ff"><span class="dot" style="background:#7c3aed"></span>Orders <b style="margin-left:4px">111</b></span>
          </div>
        </div>
      </div></div>`;
    try { mkChart(document.getElementById('globe'), globeOption()); } catch (e) { /* echarts-gl unavailable */ }
    let v = 128, s = 9280, o = 111, sales = 6552;
    window.__liveTimer = setInterval(() => {
      v = Math.max(95, v + Math.round((Math.random() - 0.5) * 16));
      s += Math.round(Math.random() * 8);
      if (Math.random() < 0.4) { o += 1; sales += Math.round(38 + Math.random() * 70); }
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('lv-visitors', v); set('lv-map-visitors', v); set('lv-sessions', s.toLocaleString()); set('lv-orders', o); set('lv-sales', '$' + sales.toLocaleString());
    }, 2200);
  }
  // ---------------- Router (SPA: driven by the shell via VIEWS.analytics.render) ----------------
  // `rest` is the hash part after the module id, e.g. '' / 'overview' / 'reports'
  // / 'reports/<id>' / 'live'. We render analytics' own secondary tab bar at the
  // top of `root` (for the three top-level sub-views), then the view body into a
  // child content element. Report detail pages get no tab bar (they have a back
  // button to Reports), matching the detail-page convention.
  function route(rest) {
    disposeCharts();
    document.querySelectorAll('.tipbox').forEach((t) => (t.style.display = 'none'));
    document.querySelectorAll('.pop-layer').forEach((p) => p.remove());
    onChipChange = null;
    if (!root) return;

    const parts = String(rest || '').split('/').filter(Boolean);
    const seg = parts[0] || 'overview';
    if (seg === 'explore' || seg === 'builder') { location.hash = '#/analytics/reports'; return; } // legacy routes → fixed-template Reports (no self-serve builder, PRD §3.3)

    // top-level sub-views show the secondary tab bar; report detail does not
    const isDetail = seg === 'reports' && parts[1];
    const activeSeg = ['overview', 'reports', 'live'].includes(seg) ? seg : 'overview';
    root.innerHTML = '<div id="an-content"></div>';
    const v = root.querySelector('#an-content');

    if (isDetail) viewReportDetail(v, parts[1]);
    else if (seg === 'reports') viewReports(v);
    else if (seg === 'live') viewLive(v);
    else viewOverview(v);

    if (root.parentElement) root.parentElement.scrollTop = 0;
  }

  // ---------------- Tooltips (metric explanations) ----------------
  function initTooltips() {
    const tip = document.createElement('div'); tip.className = 'tipbox'; tip.style.display = 'none';
    document.body.appendChild(tip);
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-tip]'); if (!el) return;
      const info = METRIC_INFO[el.getAttribute('data-tip')]; if (!info) return;
      tip.innerHTML = `<div class="tip-title">${info[0]}</div><div class="tip-desc">${info[1]}</div>` + (info[2] ? `<div class="tip-formula">${info[2]}</div>` : '');
      tip.style.display = 'block';
      const r = el.getBoundingClientRect();
      tip.style.left = Math.min(window.innerWidth - 276, Math.max(8, r.left)) + 'px';
      tip.style.top = (r.bottom + 8) + 'px';
    });
    document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-tip]')) tip.style.display = 'none'; });
  }

  // ---------------- Boot (one-time, on module load) ----------------
  // The shell loads this script once and caches it; these are global, idempotent
  // listeners (a single tooltip box + chip-popover delegation). No chrome, no
  // hash router, no initial render here — the shell drives render()/unmount().
  initTooltips();
  document.addEventListener('click', (e) => { const c = e.target.closest('[data-chip]'); if (c) openChip(c); });
  // shared date-range picker commits by firing change on #an-dend → map the picked range onto the mock series + re-render
  document.addEventListener('change', (e) => {
    if (!e.target || e.target.id !== 'an-dend') return;
    const pi = (v) => { const m = /-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return null; const mo = +m[1], d = +m[2]; return mo < 5 ? 0 : mo > 5 ? 25 : Math.max(0, Math.min(25, d - 1)); };
    const ds = document.getElementById('an-dstart'), de = document.getElementById('an-dend');
    let s = pi(ds && ds.value), en = pi(de && de.value);
    if (s == null || en == null) return;
    if (en < s) { const t = s; s = en; en = t; }
    CHIP_STATE._range = { s, e: en };
    if (onChipChange) onChipChange('date');
  });

  // ---------------- SPA shell registration ----------------
  window.VIEWS = window.VIEWS || {};
  window.VIEWS.analytics = {
    render: function (el, rest) { root = el; route(rest || ''); },
    unmount: function () {
      // dispose all ECharts instances + clear the live-view interval/timers so
      // charts/timers don't leak when navigating away (and back).
      disposeCharts();
      if (window.__liveTimer) { clearInterval(window.__liveTimer); window.__liveTimer = null; }
      onChipChange = null;
      document.querySelectorAll('.tipbox').forEach((t) => (t.style.display = 'none'));
      document.querySelectorAll('.pop-layer').forEach((p) => p.remove());
    },
  };
})();
