/* BestShopio Admin · Subscriptions app — workspace (V1.142).
   Pluggable app (turned on from #/apps). Sub-routes mirror the sidebar children:
     #/subscriptions            -> Overview (KPIs + MRR + upcoming charges + dunning settings)
     #/subscriptions/plans      -> Plans (+ /plans/:id detail, /plans/0 = create)
     #/subscriptions/contracts  -> Subscriptions (contracts)
     (recurring-orders sub-page retired — not routed; recurring orders live in the main Orders module)
     #/subscriptions/settings   -> alias -> Overview (Settings folded in; kept for old links)
   Chrome (sidebar + header) is the shared shell.js; this renders the body into #root. */
(function () {
  const D = window.DATA_SUBS;
  let root;
  let chart = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US');
  const imgCell = (src, px) => { px = px || 40; return '<span style="width:' + px + 'px;height:' + px + 'px;border-radius:6px;overflow:hidden;background:#e9ecf2;color:#9aa3b2;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;flex:none">' + (src ? '<img src="' + esc(src) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.remove()" />' : 'IMG') + '</span>'; };
  // Deterministic product photos + synthetic variants — same source as the bundle editor, so the bundle preview here renders identically.
  const PROD_IMGS = ['https://silixwear.com/cdn/shop/files/Dark-GRAY.jpg?v=1776154216&width=400', 'https://silixwear.com/cdn/shop/files/01_cf6e37ef-a0ab-4c82-ac61-c30d06d3111e.jpg?width=400', 'https://silixwear.com/cdn/shop/files/01_50091071-d25f-4060-9fce-acd28e12ce10.jpg?width=400', 'https://silixwear.com/cdn/shop/files/7_3bd5ccd0-0637-4559-b7be-1cd8196b15d4.jpg?width=400'];
  const prodImg = (name) => { var s = String(name || 'x'), h = 0, i = 0; for (; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PROD_IMGS[h % PROD_IMGS.length]; };
  const compImg = (c) => (c && c.image) || (c && c.product ? prodImg(c.product) : '');
  const imgAt = (url, w) => { if (!url) return url; return /[?&]width=\d+/.test(url) ? url.replace(/width=\d+/, 'width=' + w) : url + (url.indexOf('?') >= 0 ? '&' : '?') + 'width=' + w; };
  // Ant-style number field with ▲▼ steppers — matches the bundle editor's numInput (native spinner hidden via .bn-num CSS).
  const numInput = (cls, data, value, opts) => {
    opts = opts || {};
    const a = 'class="input ' + cls + '" ' + data + ' type="number"' + (opts.min != null ? ' min="' + opts.min + '"' : '') + (opts.step ? ' step="' + opts.step + '"' : '');
    return '<span class="bn-num" style="' + (opts.w ? 'width:' + opts.w : 'width:100%') + ';display:inline-flex;align-items:stretch;height:36px;border:1px solid var(--ctl);border-radius:var(--radius);overflow:hidden;background:#fff">' +
      '<input ' + a + ' value="' + value + '" style="flex:1;min-width:0;height:100%;border:0;border-radius:0;padding:0 10px" />' +
      '<span style="flex:none;width:20px;display:flex;flex-direction:column;border-left:1px solid var(--ctl)">' +
        '<button type="button" class="bn-nup" tabindex="-1" style="flex:1;border:0;background:#f3f4f8;cursor:pointer;color:var(--ink-muted);font-size:7px;line-height:0">&#9650;</button>' +
        '<button type="button" class="bn-ndn" tabindex="-1" style="flex:1;border:0;border-top:1px solid var(--ctl);background:#f3f4f8;cursor:pointer;color:var(--ink-muted);font-size:7px;line-height:0">&#9660;</button>' +
      '</span></span>';
  };
  const VAR_COLORS = ['Grey', 'Black', 'Navy', 'Olive', 'Sand', 'Off-White'];
  const VAR_SIZES = ['S', 'M', 'L', 'XL'];
  const VAR_LENGTHS = ['Full Length', '7/8 Length', 'Cropped'];
  const variantList = (name, count) => { count = Math.max(1, count || 4); var out = []; for (var i = 0; i < count; i++) { var c = VAR_COLORS[i % VAR_COLORS.length]; out.push(count > VAR_COLORS.length ? c + ' / ' + VAR_SIZES[Math.floor(i / VAR_COLORS.length) % VAR_SIZES.length] : c); } return out; };
  // Synthetic labeled option groups for the preview (a real PDP lists the product's own option names). More SKUs ⇒ more option dimensions.
  const variantGroups = (count) => { count = Math.max(1, count || 1); if (count <= 1) return []; var g = [{ name: 'Color', values: VAR_COLORS }]; if (count >= 3) g.push({ name: 'Size', values: VAR_SIZES }); if (count >= 5) g.push({ name: 'Length', values: VAR_LENGTHS }); return g; };
  const svg = (p, w) => '<svg viewBox="0 0 24 24" width="' + (w || 16) + '" height="' + (w || 16) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const I = {
    chev: svg('<path d="m9 18 6-6-6-6"/>', 16),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', 18),
    back: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', 18),
    alert: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 16),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 15),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  };
  const SUBS_METRIC_TIPS = {
    arpu: ['ARPU', 'Average monthly revenue generated by each active subscription contract.', 'Monthly recurring revenue ÷ Active subscriptions'],
    churn: ['Churn rate', 'The share of subscriptions cancelled this month compared with active subscriptions at the start of the month. Lower is better.', 'Cancelled subscriptions this month ÷ active subscriptions at month start'],
  };
  let subsMetricTipReady = false;

  function initSubsMetricTooltips() {
    if (subsMetricTipReady) return;
    subsMetricTipReady = true;
    const tipEl = () => {
      let tip = document.querySelector('.subs-tipbox');
      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'tipbox subs-tipbox';
        tip.style.display = 'none';
        document.body.appendChild(tip);
      }
      return tip;
    };
    const hide = () => { const tip = document.querySelector('.subs-tipbox'); if (tip) tip.style.display = 'none'; };
    const show = (el) => {
      const info = SUBS_METRIC_TIPS[el.getAttribute('data-subs-tip')];
      if (!info) return;
      const tip = tipEl();
      tip.innerHTML = '<div class="tip-title">' + esc(info[0]) + '</div><div class="tip-desc">' + esc(info[1]) + '</div><div class="tip-formula">' + esc(info[2]) + '</div>';
      tip.style.display = 'block';
      const r = el.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 276, Math.max(8, r.left - 10));
      let top = r.bottom + 8;
      if (top + tip.offsetHeight > window.innerHeight - 8) top = r.top - tip.offsetHeight - 8;
      tip.style.left = left + 'px';
      tip.style.top = Math.max(8, top) + 'px';
    };
    document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-subs-tip]'); if (el) show(el); });
    document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-subs-tip]'); if (el) show(el); });
    document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-subs-tip]')) hide(); });
    document.addEventListener('focusout', (e) => { if (e.target.closest('[data-subs-tip]')) hide(); });
    document.addEventListener('click', (e) => { const el = e.target.closest('[data-subs-tip]'); if (el) show(el); else hide(); });
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', hide, true);
  }
  // Top-center success toast (Ant Design message parity) — mirrors the store admin + Analytics, not a bottom bar.
  const toast = (msg) => { const t = document.createElement('div'); t.innerHTML = '<span style="color:#1f8f4e;display:inline-flex;font-weight:700">✓</span><span>' + esc(msg) + '</span>'; t.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;background:#fff;color:#1f2433;border:1px solid #e6e8ee;padding:9px 16px;border-radius:8px;font-size:13.5px;z-index:200;box-shadow:0 6px 20px rgba(20,30,55,.14)'; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };

  const planById = (id) => D.plans.find((p) => String(p.id) === String(id));
  const cycleLabel = (c) => !c ? '—' : (c.every === 1 ? 'Every ' + c.unit : 'Every ' + c.every + ' ' + c.unit + 's');
  const gwName = (id) => (D.gateways.find((g) => g.id === id) || {}).name || id;

  const STATUS = {
    active:    { label: 'Active',    cls: 'pill-green' },
    past_due:  { label: 'Past due',  cls: 'pill-red' },
    cancelled: { label: 'Cancelled', cls: 'pill-gray' },
    draft:     { label: 'Draft',     cls: 'pill-gray' },
    paid:      { label: 'Paid',      cls: 'pill-green' },
    failed:    { label: 'Failed',    cls: 'pill-red' },
    retrying:  { label: 'Retrying',  cls: 'pill-orange' },
    refunded:  { label: 'Refunded',  cls: 'pill-gray' },
  };
  const pill = (s) => { const m = STATUS[s] || { label: s, cls: 'pill-gray' }; return '<span class="pill ' + m.cls + '">' + esc(m.label) + '</span>'; };
  // Plans use a unified Activated/Deactivated state (distinct from subscription contracts, which keep Active/Paused/etc.).
  const PLAN_STATUS = { active: 'Activated', draft: 'Deactivated' };
  const planPill = (s) => '<span class="pill ' + (s === 'draft' ? 'pill-gray' : 'pill-green') + '">' + (PLAN_STATUS[s] || s) + '</span>';

  const planProductName = (p) => String((p && p.product) || '').trim();
  function activePlanSiblingOf(plan, nextStatus) {
    const product = planProductName(plan);
    if (nextStatus !== 'active' || !product) return null;
    const id = plan && plan.id != null ? String(plan.id) : '';
    return D.plans.find((p) => String(p.id) !== id && planProductName(p) === product && p.status === 'active') || null;
  }
  function deactivateActivePlanSiblings(plan) {
    const product = planProductName(plan);
    if (!product) return;
    const id = plan && plan.id != null ? String(plan.id) : '';
    D.plans.forEach((p) => { if (String(p.id) !== id && planProductName(p) === product && p.status === 'active') p.status = 'draft'; });
  }
  function setPlanStatus(plan, nextStatus) {
    if (!plan) return;
    if (nextStatus === 'active') deactivateActivePlanSiblings(plan);
    plan.status = nextStatus;
  }
  function confirmReplaceActivePlan(plan, onOk) {
    const conflict = activePlanSiblingOf(plan, plan.status || 'active');
    if (!conflict) { onOk(); return; }
    window.UI.confirm({
      title: 'Replace current active plan?',
      content: planProductName(plan) + ' already has an active subscription plan: ' + (conflict.name || conflict.id) + '. Activating ' + (plan.name || 'this plan') + ' will deactivate the current active plan.',
      okText: 'Replace and activate',
      onOk: onOk,
    });
  }

  // ================= OVERVIEW =================
  function renderOverview() {
    const m = D.metrics;
    const pastDue = D.contracts.filter((c) => c.status === 'past_due').length;
    const atRisk = D.orders.filter((o) => o.status === 'failed' || o.status === 'retrying');
    const atRiskValue = atRisk.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const arpu = m.activeSubs ? m.mrr / m.activeSubs : 0;

    const kpi = (label, value, delta, sub, attr) =>
      '<div class="panel card-pad"' + (attr || '') + '>' +
        '<div class="muted" style="font-size:12.5px">' + label + '</div>' +
        '<div class="stat-value" style="margin-top:6px">' + value + '</div>' +
        (delta || (sub ? '<div class="muted" style="font-size:12px;margin-top:3px">' + sub + '</div>' : '')) +
      '</div>';
    const helpTip = (key) => '<span class="metric-help" data-subs-tip="' + key + '" role="button" tabindex="0" aria-label="' + esc(SUBS_METRIC_TIPS[key][0]) + ' explanation"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></span>';

    const attention = (pastDue || atRisk.length)
      ? '<div class="panel card-pad" style="border-color:#f3d2c4;background:#fff7f3;display:flex;align-items:center;gap:12px;margin-bottom:18px">' +
          '<span style="color:var(--err);flex:none">' + I.alert + '</span>' +
          '<div style="flex:1;font-size:13.5px;color:var(--ink-body)"><b>Needs attention.</b> ' +
            pastDue + ' subscription' + (pastDue === 1 ? '' : 's') + ' past due · ' + atRisk.length + ' payment' + (atRisk.length === 1 ? '' : 's') + ' failing.</div>' +
          '<button class="btn btn-default" data-act="goto-atrisk">Review</button>' +
        '</div>'
      : '';

    root.innerHTML =
      '<div class="flex items-center justify-between mb-4"><h1 class="page-title">Subscriptions</h1>' +
        '<div class="flex items-center gap-2">' +
          '<a class="btn btn-primary" href="#/subscriptions/plans/0">Add plan</a>' +
          '<button class="btn btn-default" data-act="dunning-settings" title="Failed payment settings">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:-2px;margin-right:5px"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>Settings</button>' +
        '</div></div>' +
      attention +
      '<div class="kpi-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:16px;margin-bottom:18px">' +
        kpi('Monthly recurring revenue', money(m.mrr), '<div style="margin-top:3px"><span class="delta-up">+' + m.mrrDelta + '%</span> <span class="muted" style="font-size:12px">vs last month</span></div>') +
        kpi('Active subscriptions', m.activeSubs.toLocaleString(), '<div style="margin-top:3px"><span class="delta-up">+' + m.activeDelta + '%</span> <span class="muted" style="font-size:12px">vs last month</span></div>') +
        kpi('ARPU' + helpTip('arpu'), money(Math.round(arpu)), null, 'per active subscription') +
        kpi('Failed payments', '<span style="color:' + (atRisk.length ? 'var(--err)' : 'inherit') + '">' + atRisk.length + '</span>', null, money(atRiskValue) + ' at risk' + (atRisk.length ? ' · view →' : ''), atRisk.length ? ' data-act="goto-atrisk" style="cursor:pointer"' : '') +
        kpi('Churn rate' + helpTip('churn'), m.churn + '%', '<div style="margin-top:3px"><span class="delta-up">' + m.churnDelta + '%</span> <span class="muted" style="font-size:12px">lower is better</span></div>') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);gap:16px;margin-bottom:16px" class="subs-ov-cols">' +
        '<div class="panel card-pad">' +
          '<div class="flex items-center justify-between" style="margin-bottom:8px"><div class="card-title">Monthly recurring revenue</div>' +
            '<span class="muted" style="font-size:12px">Last 12 months</span></div>' +
          '<div id="subs-mrr-chart" style="height:280px"></div>' +
        '</div>' +
        '<div class="panel card-pad">' +
          '<div class="flex items-center justify-between" style="margin-bottom:10px"><div class="card-title">Upcoming charges</div>' +
            '<span class="muted" style="font-size:12px">Next 7 days</span></div>' +
          D.upcoming.map(upcomingRow).join('') +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px" class="subs-ov-cols">' +
        topPlansHtml() +
        atRiskHtml(atRisk) +
      '</div>' +
      '<style>@media(max-width:860px){.subs-ov-cols{grid-template-columns:1fr!important}}</style>';

    const ds = root.querySelector('[data-act="dunning-settings"]'); if (ds) ds.onclick = openDunningModal;
    root.querySelectorAll('[data-act="goto-atrisk"]').forEach((el) => el.onclick = (e) => { e.preventDefault(); const t = root.querySelector('#subs-atrisk'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    root.querySelectorAll('.ar-row[data-cid]').forEach((el) => el.onclick = () => { location.hash = '#/subscriptions/contracts/' + el.getAttribute('data-cid'); });
    initChart();
  }

  // Top plans — active plans ranked by monthly recurring revenue (subscribers × price), with a mini bar.
  function topPlansHtml() {
    const ranked = D.plans.filter((p) => p.status === 'active')
      .map((p) => ({ name: p.name, subs: p.subscribers || 0, mrr: (p.subscribers || 0) * (p.price || 0) }))
      .sort((a, b) => b.mrr - a.mrr).slice(0, 5);
    const max = ranked.length ? (ranked[0].mrr || 1) : 1;
    const rows = ranked.map((p, i) =>
      '<div style="padding:10px 0' + (i < ranked.length - 1 ? ';border-bottom:1px solid var(--hair)' : '') + '">' +
        '<div class="flex items-center justify-between" style="margin-bottom:6px;gap:10px">' +
          '<span style="font-size:13.5px;color:var(--ink);font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.name) + '</span>' +
          '<span style="font-size:13px;color:var(--ink);font-weight:600;flex:none">' + money(p.mrr) + '<span class="muted" style="font-weight:400;font-size:12px">/mo</span></span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div style="flex:1;height:6px;background:var(--hair);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + Math.max(4, Math.round(p.mrr / max * 100)) + '%;background:var(--brand)"></div></div>' +
          '<span class="muted" style="font-size:12px;flex:none">' + p.subs + ' subs</span>' +
        '</div>' +
      '</div>').join('');
    return '<div class="panel card-pad">' +
      '<div class="flex items-center justify-between" style="margin-bottom:2px"><div class="card-title">Top plans</div>' +
        '<a href="#/subscriptions/plans" style="font-size:12px;color:var(--brand);font-weight:500">All plans →</a></div>' +
      '<div class="muted" style="font-size:12px;margin-bottom:6px">By monthly recurring revenue</div>' + rows +
    '</div>';
  }

  // At-risk payments — failing / retrying renewals (the dunning queue). Click a row to open the contract.
  function atRiskHtml(atRisk) {
    if (!atRisk.length) {
      return '<div class="panel card-pad" id="subs-atrisk"><div class="card-title" style="margin-bottom:6px">At-risk payments</div>' +
        '<div class="muted" style="font-size:13px;padding:10px 0">No failing payments — all caught up.</div></div>';
    }
    const rows = atRisk.map((o, i) => {
      const isRetry = o.status === 'retrying';
      const meta = isRetry
        ? 'Retry ' + (o.attempt || 1) + '/' + D.settings.dunning.retries + ' · next ' + fmtDate(o.nextRetry)
        : 'Failed' + (o.reason ? ' · ' + esc(o.reason) : '');
      const exists = !!D.contracts.find((c) => c.id === o.contract);
      return '<div class="ar-row"' + (exists ? ' data-cid="' + esc(o.contract) + '" style="cursor:pointer;' : ' style="') + 'padding:11px 0' + (i < atRisk.length - 1 ? ';border-bottom:1px solid var(--hair)' : '') + '">' +
        '<div class="flex items-center justify-between" style="gap:10px">' +
          '<div style="min-width:0"><div style="font-size:13.5px;color:var(--ink);font-weight:500">' + esc(o.customer) + '</div>' +
            '<div class="muted" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(o.plan) + ' · ' + esc(o.contract) + '</div></div>' +
          '<div style="text-align:right;flex:none">' +
            '<div style="font-size:13px;font-weight:600;color:var(--err)">' + money(o.amount) + '</div>' +
            '<div style="font-size:11.5px;color:' + (isRetry ? 'var(--ink-muted)' : 'var(--err)') + '">' + meta + '</div></div>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<div class="panel card-pad" id="subs-atrisk">' +
      '<div class="flex items-center justify-between" style="margin-bottom:2px"><div class="card-title">At-risk payments</div>' +
        '<span class="muted" style="font-size:12px">' + atRisk.length + ' to resolve</span></div>' +
      '<div class="muted" style="font-size:12px;margin-bottom:4px">Failing or retrying renewals (dunning queue)</div>' + rows +
    '</div>';
  }

  // Failed-payments (dunning) settings — opened from the Settings button next to "Add plan".
  function openDunningModal() {
    const s = D.settings;
    const body =
      '<div class="muted" style="font-size:12.5px;margin-bottom:14px;line-height:1.5">How recurring charges retry before a subscription is cancelled.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
        '<div>' + label('Retry attempts') + '<input class="input" id="dn-retries" type="number" min="0" max="10" value="' + s.dunning.retries + '" /></div>' +
        '<div>' + label('Days between retries') + '<input class="input" id="dn-interval" type="number" min="1" value="' + s.dunning.intervalDays + '" /></div>' +
        '<div style="grid-column:1/-1">' + label('After the last failed attempt') + '<div class="muted" style="font-size:12.5px;line-height:1.5">The subscription is automatically <b>cancelled</b> and the customer is notified — no further retries or charges.</div></div>' +
      '</div>';
    const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
    const m = document.createElement('div'); m.className = 'modal'; m.style.width = '520px'; m.style.maxWidth = 'calc(100vw - 32px)';
    m.innerHTML =
      '<div class="modal-head flex items-center justify-between"><span>Failed payments (dunning)</span><span data-x style="cursor:pointer;font-size:18px;line-height:1;color:var(--muted)">&times;</span></div>' +
      '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-foot"><button class="btn btn-default" data-cancel>Cancel</button><button class="btn btn-primary" data-ok>Save</button></div>';
    backdrop.appendChild(m); document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    m.querySelector('[data-x]').onclick = close;
    m.querySelector('[data-cancel]').onclick = close;
    backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
    m.querySelector('[data-ok]').onclick = () => {
      s.dunning.retries = Number(m.querySelector('#dn-retries').value) || 0;
      s.dunning.intervalDays = Number(m.querySelector('#dn-interval').value) || 1;
      close(); toast('Settings saved');
    };
  }

  function upcomingRow(u) {
    const d = new Date(u.date + 'T00:00:00');
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    const md = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return '<div class="flex items-center justify-between" style="padding:9px 0;border-bottom:1px solid var(--hair)">' +
      '<div><div style="font-size:13.5px;color:var(--ink);font-weight:500">' + md + '</div>' +
        '<div class="muted" style="font-size:11.5px">' + day + ' · ' + u.count + ' charges</div></div>' +
      '<div class="num" style="font-size:13.5px;color:var(--ink);font-weight:600">' + money(u.value) + '</div>' +
    '</div>';
  }

  function initChart() {
    const el = root.querySelector('#subs-mrr-chart');
    if (!el || typeof echarts === 'undefined') return;
    chart = echarts.init(el);
    chart.setOption({
      grid: { left: 52, right: 16, top: 18, bottom: 28 },
      tooltip: { trigger: 'axis', valueFormatter: (v) => '$' + Number(v).toLocaleString('en-US') },
      xAxis: { type: 'category', data: D.mrrTrend.map((p) => p.m), boundaryGap: false,
        axisLine: { lineStyle: { color: '#eaedf1' } }, axisTick: { show: false }, axisLabel: { color: '#62708d', fontSize: 11 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eaedf1' } },
        axisLabel: { color: '#62708d', fontSize: 11, formatter: (v) => '$' + (v / 1000) + 'k' } },
      series: [{
        type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: D.mrrTrend.map((p) => p.v),
        lineStyle: { color: '#0066e6', width: 2.5 }, itemStyle: { color: '#0066e6' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(0,102,230,.18)' }, { offset: 1, color: 'rgba(0,102,230,0)' }]) },
      }],
    });
    window.addEventListener('resize', onResize);
  }
  function onResize() { if (chart) chart.resize(); }
  function disposeChart() { if (chart) { chart.dispose(); chart = null; } window.removeEventListener('resize', onResize); }

  // ================= PLANS (list) =================
  const LSTP = { tab: 'all', kw: '', kwType: 'name', kwApplied: '', page: 1, size: 20 };
  const PLAN_FIELDS = [{ value: 'name', label: 'Plan name' }, { value: 'product', label: 'Product' }, { value: 'id', label: 'Plan ID' }];
  const TABSP = [{ k: 'all', label: 'All' }, { k: 'active', label: 'Activated' }, { k: 'draft', label: 'Deactivated' }];
  function plansFiltered() {
    let rows = D.plans.slice();
    if (LSTP.tab !== 'all') rows = rows.filter((p) => p.status === LSTP.tab);
    if (LSTP.kwApplied) { const q = LSTP.kwApplied.toLowerCase(); rows = rows.filter((p) => String(p[LSTP.kwType] || '').toLowerCase().includes(q)); }
    return rows;
  }
  function planPager(page, pages) {
    const item = (label, pg, opts) => { opts = opts || {}; return '<span class="pg-item' + (opts.active ? ' active' : '') + (opts.disabled ? ' disabled' : '') + '"' + (opts.disabled ? '' : ' data-page="' + pg + '"') + '>' + label + '</span>'; };
    let nums = ''; for (let pg = 1; pg <= pages; pg++) nums += item(String(pg), pg, { active: pg === page });
    return '<div class="pg">' + item('‹', page - 1, { disabled: page <= 1 }) + nums + item('›', page + 1, { disabled: page >= pages }) +
      '<select class="pg-size" id="pl-pgsize">' + ['20', '50', '100'].map((s) => '<option value="' + s + '"' + (Number(s) === LSTP.size ? ' selected' : '') + '>' + s + ' / page</option>').join('') + '</select></div>';
  }
  function renderPlans() {
    const all = plansFiltered();
    const total = all.length;
    const pages = Math.max(1, Math.ceil(total / LSTP.size));
    if (LSTP.page > pages) LSTP.page = pages;
    const pageRows = all.slice((LSTP.page - 1) * LSTP.size, (LSTP.page - 1) * LSTP.size + LSTP.size);
    const rows = pageRows.map((p) => {
      const disc = discountLabel(p) ? '<span class="pill pill-green" style="padding:1px 7px">' + discountLabel(p) + '</span>' : '';
      return '<tr data-id="' + p.id + '" style="cursor:pointer">' +
        '<td><div style="font-weight:600;color:var(--ink)">' + esc(p.name) + '</div>' +
          '<div class="muted" style="font-size:12px">' + esc(p.id) + '</div></td>' +
        '<td><div class="flex items-center gap-2">' + imgCell(compImg({ image: p.image, product: p.product }), 32) + '<div style="min-width:0"><div style="color:var(--ink)">' + esc(p.product) + '</div>' + (p.itemType === 'bundle' ? '<span class="pill pill-blue" style="font-size:10px;margin-top:3px;display:inline-block">Sold as a bundle</span>' : '') + '</div></div></td>' +
        '<td>' + (p.itemType === 'bundle' ? '<span class="muted">Per pack</span>' : cycleLabel(p.cycle)) + '</td>' +
        '<td>' + (p.itemType === 'bundle' ? planBundlePrice(p) : (money(p.price) + (p.compareAt ? ' <span class="muted" style="text-decoration:line-through;font-size:12px">' + money(p.compareAt) + '</span>' : '') + ' ' + disc)) + '</td>' +
        '<td class="num">' + p.subscribers + '</td>' +
        '<td>' + planPill(p.status) + '</td>' +
        '<td style="text-align:center" data-stop><button class="back-btn pl-view" data-view="' + p.id + '" title="View" style="width:30px;height:30px;color:var(--ink-muted)">' + I.eye + '</button></td>' +
      '</tr>';
    }).join('');

    root.innerHTML =
      '<div class="flex items-center justify-between mb-4"><h1 class="page-title">Plans</h1>' +
        '<a class="btn btn-primary" href="#/subscriptions/plans/0">Add plan</a></div>' +
      '<div class="panel">' + tabsBar(TABSP, LSTP.tab, (k) => k === 'all' ? D.plans.length : D.plans.filter((p) => p.status === k).length) + filterBar(LSTP, PLAN_FIELDS) +
        '<div style="overflow-x:auto"><table class="tbl" style="min-width:840px">' +
          '<thead><tr><th>Plan</th><th>Product</th><th>Cycle</th><th>Price</th><th class="num">Subscribers</th><th style="width:110px">Status</th><th style="width:80px;text-align:center">Action</th></tr></thead>' +
          '<tbody id="pl-tbody">' + (rows || '<tr><td colspan="7" class="muted" style="text-align:center;padding:40px">No plans match these filters.</td></tr>') + '</tbody>' +
        '</table></div>' +
        '<div class="flex items-center justify-between card-pad"><span class="muted" style="font-size:13px">Total ' + total + ' records</span>' + planPager(LSTP.page, pages) + '</div>' +
      '</div>';

    root.querySelectorAll('#pl-tbody tr[data-id]').forEach((tr) => tr.onclick = (e) => { if (e.target.closest('[data-stop]')) return; location.hash = '#/subscriptions/plans/' + tr.getAttribute('data-id'); });
    root.querySelectorAll('.pl-view').forEach((el) => el.onclick = (e) => { e.stopPropagation(); location.hash = '#/subscriptions/plans/' + el.getAttribute('data-view'); });
    root.querySelectorAll('.tab[data-tab]').forEach((t) => t.onclick = () => { LSTP.tab = t.getAttribute('data-tab'); LSTP.page = 1; renderPlans(); });
    root.querySelectorAll('.pg-item[data-page]').forEach((el) => el.onclick = () => { LSTP.page = Number(el.getAttribute('data-page')); renderPlans(); });
    const ps = root.querySelector('#pl-pgsize'); if (ps) ps.onchange = () => { LSTP.size = Number(ps.value); LSTP.page = 1; renderPlans(); };
    wireFilter(LSTP, renderPlans);
  }

  // ================= PLAN detail / create =================
  let EDIT = null, ORIGINAL = null, EDIT_ID = null, previewBuyMode = 'sub';
  const snap = (o) => JSON.parse(JSON.stringify(o));
  const isDirty = () => JSON.stringify(EDIT) !== JSON.stringify(ORIGINAL);
  const syncBar = () => window.UI && window.UI.setUnsavedBar(document, isDirty());

  const supportedWidgetStyle = (style) => WID_STYLES.indexOf(style) >= 0 ? style : 'radio';

  function emptyPlan() {
    return { id: 0, name: '', status: 'draft', itemType: '', product: '', sku: '', bundleId: '', bundleTemplate: '', tierIndex: 0, image: '', widgetStyle: supportedWidgetStyle(WID.style), cycle: { every: 1, unit: 'month' },
      price: null, compareAt: null, discountType: 'percent', discountValue: 10, currency: 'USD', minCycles: 0, gateway: D.settings.defaultGateway, subscribers: 0, createdAt: '2026-06-18' };
  }

  function renderPlanDetail(id) {
    const isEdit = String(id) !== '0';
    if (isEdit) { const p = planById(id); if (!p) return renderMissing('Plan', '#/subscriptions/plans'); EDIT_ID = p.id; EDIT = snap(p); }
    else { EDIT_ID = null; EDIT = emptyPlan(); }
    if (EDIT.widgetStyle == null) EDIT.widgetStyle = WID.style;       // existing plans predate per-plan style
    EDIT.widgetStyle = supportedWidgetStyle(EDIT.widgetStyle);        // Frequency needs multiple plans on the same product; not supported in this MVP.
    if (!EDIT.itemType) EDIT.itemType = EDIT.product ? 'product' : '';
    if (EDIT.discountValue == null) { EDIT.discountType = EDIT.discountType || 'percent'; EDIT.discountValue = EDIT.discountPct || 0; } // migrate legacy percent-only plans
    previewBuyMode = 'sub';
    ORIGINAL = snap(EDIT);
    paintPlan(isEdit);
  }

  function card(title, inner, right) {
    return '<div class="panel card-pad mb-4"><div class="flex items-center justify-between mb-3"><div class="card-title">' + title + '</div>' + (right || '') + '</div>' + inner + '</div>';
  }
  const label = (t) => '<div class="ctrl-label" style="text-transform:none;margin-bottom:6px">' + t + '</div>';

  function paintPlan(isEdit) {
    const p = EDIT;
    const saveText = isEdit ? 'Save' : 'Add plan';
    const recalc = (p.compareAt && p.price) ? Math.max(0, Math.round((1 - p.price / p.compareAt) * 100)) : 0;

    const unitOpt = ['week', 'month', 'year'].map((u) => '<option value="' + u + '"' + (p.cycle.unit === u ? ' selected' : '') + '>' + u + (p.cycle.every === 1 ? '' : 's') + '</option>').join('');
    // Status lives in the right rail as a radio group (mirrors Add bundle). Plans are only ever Active or Draft.
    const statusRadios = ['active', 'draft'].map((s) => '<label class="flex items-center gap-2" style="cursor:pointer;font-size:13.5px;color:var(--ink)"><input type="radio" name="pl-status" class="pl-statusr" value="' + s + '"' + (p.status === s ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:var(--brand);cursor:pointer" /> ' + PLAN_STATUS[s] + '</label>').join('');

    const gw = D.gateways.map((g) =>
      '<label class="flex items-start gap-2" style="cursor:pointer;padding:8px 0">' +
        '<input type="radio" name="pl-gw" value="' + g.id + '"' + (p.gateway === g.id ? ' checked' : '') + ' style="accent-color:var(--brand);width:15px;height:15px;margin-top:2px" />' +
        '<span><span style="font-size:13.5px;color:var(--ink);font-weight:500">' + esc(g.name) + '</span>' +
        '<span class="muted" style="display:block;font-size:11.5px;line-height:1.45">' + esc(g.note) + '</span></span>' +
      '</label>').join('');

    // Item selection — a plan attaches to a PRODUCT. If that product has an active bundle, the subscription covers the bundle.
    const isBun = p.itemType === 'bundle';
    const itemRow = (p.itemType && p.product)
      ? '<div style="display:flex;align-items:center;gap:12px;border:1px solid var(--hair);border-radius:8px;padding:12px">' +
          imgCell(p.image, 40) +
          '<div style="flex:1;min-width:0"><div style="font-size:13.5px;color:var(--ink);font-weight:500">' + esc(p.product) + '</div>' +
            (isBun
              ? '<div style="font-size:12px;margin-top:3px"><span class="pill pill-blue" style="font-size:10px">Sold as a bundle</span> <span class="muted">' + esc(p.bundleId) + '</span></div>'
              : (p.sku ? '<div class="muted" style="font-size:12px">SKU ' + esc(p.sku) + '</div>' : '')) + '</div>' +
          '<button class="btn btn-default" data-act="clear-item">Clear selected product</button>' +
        '</div>'
      : '<div style="display:flex;align-items:center;gap:10px;border:1px dashed var(--ctl);border-radius:8px;padding:14px">' +
          '<span class="muted" style="flex:1;min-width:0;font-size:13.5px">No product selected</span>' +
          '<button class="btn btn-default" data-act="pick-product">Add product</button>' +
        '</div>';

    // Tier picker — shown only for a bundle with more than one tier; price/components are tier-level.
    const _tiers = bundleTiers(p);
    const tierSel = (p.itemType === 'bundle' && _tiers.length > 1)
      ? '<div style="margin-top:12px">' + label('Subscribed tier') +
          '<div style="display:flex;flex-direction:column;gap:8px" id="pl-tiers">' +
          _tiers.map((t, i) => {
            const on = (p.tierIndex || 0) === i;
            const ttl = esc(t.title) || (t.qty + ' PCS');
            return '<label data-ptier="' + i + '" style="display:flex;align-items:center;gap:10px;border:1.5px solid ' + (on ? 'var(--brand)' : 'var(--hair)') + ';border-radius:8px;padding:9px 11px;cursor:pointer">' +
              '<input type="radio" name="pl-tier"' + (on ? ' checked' : '') + ' style="accent-color:var(--brand);width:15px;height:15px;pointer-events:none;flex:none" />' +
              '<span style="flex:1;min-width:0;font-size:13px;color:var(--ink);font-weight:500">' + ttl + (t.tag ? ' <span class="pill pill-blue" style="font-size:10px">' + esc(t.tag) + '</span>' : '') + '</span>' +
              '<span style="font-weight:700;color:var(--ink);font-size:13px;white-space:nowrap">' + money(t.price) + (t.compareAt ? ' <s class="muted" style="font-weight:400;font-size:11px">' + money(t.compareAt) + '</s>' : '') + '</span>' +
            '</label>';
          }).join('') +
          '</div></div>'
      : '';

    // Compact storefront-style thumbnails (line-art glyph + label); the full render shows live in the right-rail preview.
    const styleNames = { radio: 'Radio list', buttons: 'Buttons', bordered: 'Bordered' };
    const styleThumb = (key) => {
      const on = p.widgetStyle === key;
      return '<div data-pstyle="' + key + '" style="cursor:pointer;border:1.5px solid ' + (on ? 'var(--brand)' : 'var(--ctl)') + ';border-radius:8px;padding:16px 14px 14px;position:relative;background:#fff">' +
        (on ? '<span style="position:absolute;top:8px;right:10px;color:var(--brand);font-size:12px;line-height:1">●</span>' : '') +
        '<div style="height:48px;display:flex;align-items:center;justify-content:center">' + styleGlyph(key) + '</div>' +
        '<div style="font-size:12.5px;color:var(--ink);margin-top:10px;text-align:center;font-weight:500">' + styleNames[key] + '</div></div>';
    };

    root.innerHTML =
      '<div class="detail-wrap">' +
        (window.UI ? window.UI.unsavedBar({ saveLabel: isEdit ? 'Save' : 'Add' }) : '') +
        '<div class="flex items-center justify-between mb-6"><div class="flex items-center gap-2">' +
          '<button class="back-btn" data-act="back" title="Back to plans">' + I.back + '</button>' +
          '<span class="page-title">' + (isEdit ? esc(p.name || 'Plan') : 'Add plan') + '</span>' + (isEdit ? ' ' + planPill(p.status) : '') +
        '</div></div>' +
        '<div class="detail-cols" style="max-width:1220px">' +
          '<div class="detail-main">' +
            card('Plan name',
              '<input class="input" id="pl-name" value="' + esc(p.name) + '" placeholder="e.g. Coffee Club — Monthly" />') +
            card('Product',
              itemRow + tierSel +
              '<div class="muted" style="font-size:12px;margin-top:8px">Subscribe &amp; Save offers one product or bundle on a recurring schedule. Customers pick one-time or subscribe on its product page.</div>') +
            card('Billing',
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
                '<div>' + label('Bill every') + '<div style="display:flex;gap:8px">' + numInput('', 'id="pl-every"', p.cycle.every, { min: 1, w: '92px' }) + '<select class="input" id="pl-unit" style="flex:1">' + unitOpt + '</select></div></div>' +
                '<div>' + label('One-time price') + '<div class="input" id="pl-onetime" style="display:flex;align-items:center;background:var(--panel);color:var(--ink)">' + (p.compareAt != null ? money(p.compareAt) : '<span class="muted">—</span>') + '</div><div class="muted" style="font-size:11px;margin-top:5px">From the ' + (p.itemType === 'bundle' ? 'selected bundle tier' : 'product') + '</div></div>' +
                '<div>' + label('Subscription discount') +
                  '<div style="display:flex;gap:8px;align-items:stretch">' +
                    '<div style="display:inline-flex;border:1px solid var(--ctl);border-radius:8px;overflow:hidden;flex:none">' +
                      '<button type="button" class="pl-dtbtn" data-dt="percent" style="height:36px;padding:0 11px;font-size:12.5px;border:none;cursor:pointer;' + (p.discountType !== 'fixed' ? 'background:var(--brand);color:#fff' : 'background:#fff;color:var(--ink)') + '">Percentage off</button>' +
                      '<button type="button" class="pl-dtbtn" data-dt="fixed" style="height:36px;padding:0 11px;font-size:12.5px;border:none;border-left:1px solid var(--ctl);cursor:pointer;' + (p.discountType === 'fixed' ? 'background:var(--brand);color:#fff' : 'background:#fff;color:var(--ink)') + '">Fixed amount</button>' +
                    '</div>' +
                    '<div style="display:inline-flex;align-items:stretch;border:1px solid var(--ctl);border-radius:8px;overflow:hidden;height:36px;flex:1;min-width:0">' +
                      (p.discountType === 'fixed' ? '<span style="display:grid;place-items:center;padding:0 9px;background:var(--panel);color:var(--ink-body);font-size:13px;border-right:1px solid var(--ctl)">$</span>' : '') +
                      '<input id="pl-discval" type="number" min="0" step="' + (p.discountType === 'fixed' ? '0.01' : '1') + '" placeholder="' + (p.discountType === 'fixed' ? '0.00' : '0') + '" value="' + (p.discountValue || 0) + '" style="flex:1;border:none;outline:none;padding:0 10px;font-size:13px;width:100%;min-width:0" />' +
                      (p.discountType !== 'fixed' ? '<span style="display:grid;place-items:center;padding:0 9px;background:var(--panel);color:var(--ink-body);font-size:13px;border-left:1px solid var(--ctl)">%</span>' : '') +
                    '</div>' +
                  '</div></div>' +
                '<div>' + label('Recurring price') + '<div class="input" id="pl-recurring" style="display:flex;align-items:center;background:var(--panel);color:var(--ink);font-weight:600">' + recurringDisplay(p) + '</div></div>' +
              '</div>') +
            card('Commitment',
              label('Minimum cycles') + numInput('', 'id="pl-min"', p.minCycles, { min: 0, w: '220px' }) + '<div class="muted" style="font-size:11.5px;margin-top:6px">Customers can\'t cancel before this many charges. 0 = cancel anytime.</div>') +
            card('Storefront style',
              '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px" id="pl-styles">' + WID_STYLES.map(styleThumb).join('') + '</div>' +
              '<div class="muted" style="font-size:12px;margin-top:12px">How the Subscribe &amp; Save options look on this product\'s page.</div>') +
            '<div class="flex gap-2 mt-1" style="justify-content:flex-end">' +
              '<button class="btn btn-primary" data-act="save">' + saveText + '</button>' +
              (isEdit ? '<button class="btn btn-default" data-act="delete" style="color:var(--err);border-color:#f3c4ba">Delete plan</button>' : '') +
            '</div>' +
          '</div>' +
          '<div class="detail-rail" style="width:400px;flex:0 0 400px">' +
            card('Status', '<div style="display:flex;flex-direction:column;gap:11px;padding:2px 0">' + statusRadios +
              '<div class="muted" style="font-size:12px;line-height:1.45;padding-top:2px">One product can have only one active subscription plan on the storefront. Draft/deactivated plans can be kept.</div>' +
            '</div>') +
            card('Preview', '<div id="pl-preview">' + planPreview(p) + '</div>') +
            (isEdit ? card('Performance',
              '<div class="flex items-center justify-between" style="font-size:13.5px"><span class="muted">Active subscribers</span><span style="font-weight:600;color:var(--ink)">' + p.subscribers + '</span></div>' +
              '<div class="flex items-center justify-between" style="font-size:13.5px;margin-top:10px"><span class="muted">Created</span><span style="color:var(--ink)">' + esc(p.createdAt) + '</span></div>') : '') +
          '</div>' +
        '</div>' +
      '</div>';

    wirePlan(isEdit);
    if (window.UI) window.UI.scan(root);
  }

  function wirePlan(isEdit) {
    const p = EDIT;
    const back = root.querySelector('[data-act="back"]'); if (back) back.onclick = () => { if (!isDirty()) { location.hash = '#/subscriptions/plans'; return; } window.UI.confirm({ title: 'Discard changes?', content: 'You have unsaved changes. Leave without saving?', okText: 'Leave', cancelText: 'Stay', danger: true, onOk: () => { location.hash = '#/subscriptions/plans'; } }); };
    const bind = (id, fn) => { const el = root.querySelector(id); if (el) el.oninput = () => { fn(el.value); syncBar(); }; };
    const bindSel = (id, fn) => { const el = root.querySelector(id); if (el) el.onchange = () => { fn(el.value); syncBar(); }; };
    bind('#pl-name', (v) => p.name = v);
    root.querySelectorAll('.pl-statusr').forEach((r) => r.onchange = () => { p.status = r.value; syncBar(); });
    const refreshPreview = () => { const pv = root.querySelector('#pl-preview'); if (pv) { pv.innerHTML = planPreview(p); wirePreviewInner(); } };
    // Recurring price is DERIVED from the read-only one-time price minus the subscription discount (percent or fixed).
    const recompute = () => { p.price = recurringPrice(p); const rec = root.querySelector('#pl-recurring'); if (rec) rec.innerHTML = recurringDisplay(p); refreshPreview(); };
    bind('#pl-every', (v) => { p.cycle.every = Number(v) || 1; recompute(); });
    bindSel('#pl-unit', (v) => { p.cycle.unit = v; recompute(); });
    root.querySelectorAll('.pl-dtbtn').forEach((b) => b.onclick = () => { p.discountType = b.getAttribute('data-dt'); p.price = recurringPrice(p); paintPlan(isEdit); syncBar(); });
    bind('#pl-discval', (v) => { let d = v === '' ? 0 : Number(v); if (d < 0) d = 0; if (p.discountType !== 'fixed' && d > 100) d = 100; p.discountValue = d; recompute(); });
    bind('#pl-min', (v) => p.minCycles = Number(v) || 0);
    root.querySelectorAll('.bn-nup, .bn-ndn').forEach((b) => b.onclick = () => { const inp = b.closest('.bn-num').querySelector('input'); const step = Number(inp.step) || 1, mn = inp.getAttribute('min'); let v = (Number(inp.value) || 0) + (b.classList.contains('bn-nup') ? step : -step); if (mn !== null) v = Math.max(Number(mn), v); inp.value = (String(step).indexOf('.') >= 0) ? v.toFixed(2) : v; inp.dispatchEvent(new Event('input', { bubbles: true })); });
    const pickP = root.querySelector('[data-act="pick-product"]'); if (pickP) pickP.onclick = () => window.UI.productPicker({ multiple: false, selected: p.product ? [p.product] : [], onConfirm: function (prods) { if (prods[0]) { const prod = prods[0]; const bun = activeBundleFor(prod.name); p.product = prod.name; p.image = prod.image || ''; if (bun) { p.itemType = 'bundle'; p.bundleId = bun.id; p.bundleTemplate = bun.template; p.sku = ''; p.tierIndex = 0; const t0 = bundleTiers(p)[0]; if (t0) { p.compareAt = t0.price; p.cycle.every = Math.max(1, t0.qty || 1); } } else { p.itemType = 'product'; p.sku = prod.sku; p.bundleId = ''; p.bundleTemplate = ''; p.tierIndex = 0; if (prod.price != null) p.compareAt = prod.price; } p.price = recurringPrice(p); } paintPlan(isEdit); syncBar(); } });
    // bundle is auto-detected from the picked product (product-anchored) — no separate bundle picker
    const clr = root.querySelector('[data-act="clear-item"]'); if (clr) clr.onclick = () => { p.itemType = ''; p.product = ''; p.sku = ''; p.bundleId = ''; p.bundleTemplate = ''; p.tierIndex = 0; p.image = ''; paintPlan(isEdit); syncBar(); };
    root.querySelectorAll('#pl-styles [data-pstyle]').forEach((c) => c.onclick = () => { p.widgetStyle = c.getAttribute('data-pstyle'); paintPlan(isEdit); syncBar(); });
    // Subscription cadence follows the pack: an N-piece tier delivers every N months (consumption-aligned, like Shopify). Merchant can still override Bill every.
    const selectTier = (i) => { p.tierIndex = i; const t = bundleTiers(p)[i]; if (t) { p.compareAt = t.price; p.cycle.every = Math.max(1, t.qty || 1); p.price = recurringPrice(p); } paintPlan(isEdit); syncBar(); };
    root.querySelectorAll('#pl-tiers [data-ptier]').forEach((el) => el.onclick = () => selectTier(+el.getAttribute('data-ptier')));
    function wirePreviewInner() {
      root.querySelectorAll('#pl-preview [data-ptier]').forEach((el) => el.onclick = () => selectTier(+el.getAttribute('data-ptier')));
      root.querySelectorAll('#pl-preview [data-buymode]').forEach((el) => el.onclick = () => { previewBuyMode = el.getAttribute('data-buymode'); refreshPreview(); });
      // Variant dropdowns are interactive; keep their clicks from bubbling to the tier card (which would re-render and reset them).
      root.querySelectorAll('#pl-preview .pl-vsel').forEach((el) => { el.onclick = (e) => e.stopPropagation(); el.onmousedown = (e) => e.stopPropagation(); });
    }
    wirePreviewInner();
    const save = root.querySelector('[data-act="save"]'); if (save) save.onclick = () => doSavePlan(isEdit);
    const saveBar = root.querySelector('[data-act="save-bar"]'); if (saveBar) saveBar.onclick = () => doSavePlan(isEdit);
    const disc = root.querySelector('[data-act="discard"]'); if (disc) disc.onclick = () => { EDIT = snap(ORIGINAL); paintPlan(isEdit); };
    const del = root.querySelector('[data-act="delete"]'); if (del) del.onclick = () => window.UI.confirm({ title: 'Delete plan', content: 'Delete this plan? Existing subscriptions keep running.', okText: 'Delete', danger: true, onOk: () => { const i = D.plans.findIndex((x) => x.id === EDIT_ID); if (i >= 0) D.plans.splice(i, 1); ORIGINAL = snap(EDIT); toast('Deleted successfully'); location.hash = '#/subscriptions/plans'; } });
    syncBar();
  }

  function doSavePlan(isEdit) {
    const p = EDIT;
    if (!(p.name || '').trim()) return toast('Enter a plan name');
    if (p.compareAt == null || p.compareAt <= 0) return toast('Select a product or bundle first');
    p.price = recurringPrice(p);
    const nextStatus = p.status || 'draft';
    const nextId = isEdit ? EDIT_ID : 'PL-' + (1000 + D.plans.length + 1);
    const nextPlan = Object.assign({}, p, { id: nextId, status: nextStatus });
    const commit = () => {
      if (isEdit) {
        const i = D.plans.findIndex((x) => x.id === EDIT_ID);
        if (i < 0) return toast('Plan not found');
        D.plans[i] = Object.assign({}, D.plans[i], p, { id: EDIT_ID });
        setPlanStatus(D.plans[i], nextStatus);
        ORIGINAL = snap(EDIT);
        syncBar();
        toast('Updated successfully');
        return;
      }
      p.id = nextId;
      const created = snap(p);
      D.plans.unshift(created);
      setPlanStatus(created, nextStatus);
      ORIGINAL = snap(p);
      toast('Created successfully');
      location.hash = '#/subscriptions/plans';
    };
    if (nextStatus === 'active') return confirmReplaceActivePlan(nextPlan, commit);
    commit();
  }

  function renderMissing(what, backHash) {
    root.innerHTML = '<div class="flex items-center gap-3 mb-4"><button class="back-btn" data-act="back">' + I.back + '</button><span class="page-title">' + esc(what) + ' not found</span></div>' +
      '<div class="panel placeholder"><div class="muted">Go back and pick one from the list.</div></div>';
    const b = root.querySelector('[data-act="back"]'); if (b) b.onclick = () => { location.hash = backHash; };
  }

  // ================= shared helpers for the list/detail views below =================
  const fmtDate = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const row2 = (k, v) => '<div class="flex items-center justify-between" style="padding:7px 0;border-bottom:1px solid var(--hair);font-size:13.5px"><span class="muted">' + k + '</span><span style="color:var(--ink);font-weight:500;text-align:right">' + v + '</span></div>';
  const chk = (id, on, txt, dis, desc) => '<label class="flex gap-2 ' + (desc ? 'items-start' : 'items-center') + '" style="padding:6px 0;font-size:13.5px;cursor:pointer' + (dis ? ';opacity:.5' : '') + '"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + ' style="accent-color:var(--brand);width:15px;height:15px;flex:none' + (desc ? ';margin-top:2px' : '') + '" /> <span>' + esc(txt) + (desc ? '<span class="muted" style="display:block;font-size:12px;font-weight:400;line-height:1.45;margin-top:2px">' + esc(desc) + '</span>' : '') + '</span></label>';
  function tabsBar(tabs, cur, cntFn) {
    return '<div class="tabs" style="padding:0 8px">' + tabs.map((t) => '<div class="tab' + (t.k === cur ? ' active' : '') + '" data-tab="' + t.k + '">' + t.label + '<span class="count-badge">' + cntFn(t.k) + '</span></div>').join('') + '</div>';
  }
  // standard list filter bar (mirrors orders/products: field select + search Input.Group + clear + filter tags)
  function filterBar(state, fields) {
    const opts = fields.map((f) => '<option value="' + f.value + '"' + (f.value === state.kwType ? ' selected' : '') + '>' + esc(f.label) + '</option>').join('');
    const lbl = (fields.find((f) => f.value === state.kwType) || {}).label || '';
    const tags = state.kwApplied ? '<div class="flex gap-2 mt-3" style="flex-wrap:wrap" id="f-tags"><span class="field-pill" data-clear="kw">' + esc(lbl) + ': ' + esc(state.kwApplied) + ' <span class="x">&times;</span></span></div>' : '';
    return '<div class="card-pad" style="padding-bottom:8px"><div class="flex items-start gap-2" style="flex-wrap:wrap">' +
      '<div class="flex" style="min-width:420px">' +
        '<select class="filter-select" id="f-type" style="width:160px;border-top-right-radius:0;border-bottom-right-radius:0">' + opts + '</select>' +
        '<div style="position:relative;flex:1">' +
          '<input class="filter-input" id="f-kw" placeholder="Search" value="' + esc(state.kw) + '" style="width:100%;padding-left:12px;padding-right:52px;border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px" />' +
          (state.kw ? '<span class="kw-clear" data-kw-clear title="Clear">&times;</span>' : '') +
          '<span style="position:absolute;right:10px;top:9px;color:var(--ink-muted)">' + I.search + '</span>' +
        '</div>' +
      '</div></div>' + tags + '</div>';
  }
  function wireFilter(state, rerender) {
    const resetPage = () => { if (Object.prototype.hasOwnProperty.call(state, 'page')) state.page = 1; };
    const ft = root.querySelector('#f-type'); if (ft) ft.onchange = () => { state.kwType = ft.value; if ((state.kw || '').trim()) state.kwApplied = state.kw.trim(); resetPage(); rerender(); };
    const fk = root.querySelector('#f-kw');
    if (fk) { fk.oninput = () => { state.kw = fk.value; }; const commit = () => { state.kwApplied = (state.kw || '').trim(); resetPage(); rerender(); }; fk.onkeydown = (e) => { if (e.key === 'Enter') commit(); }; fk.onblur = commit; }
    const kc = root.querySelector('[data-kw-clear]'); if (kc) kc.onclick = () => { state.kw = ''; state.kwApplied = ''; resetPage(); rerender(); };
    root.querySelectorAll('#f-tags [data-clear]').forEach((tg) => tg.onclick = () => { state.kw = ''; state.kwApplied = ''; resetPage(); rerender(); });
  }

  // ================= SUBSCRIPTIONS (contracts) — list =================
  const LSTC = { tab: 'all', kw: '', kwType: 'customer', kwApplied: '', page: 1, size: 10 };
  const CONTRACT_FIELDS = [{ value: 'customer', label: 'Customer' }, { value: 'email', label: 'Email' }, { value: 'plan', label: 'Plan' }, { value: 'id', label: 'Subscription ID' }];
  const TABSC = [{ k: 'all', label: 'All' }, { k: 'active', label: 'Active' }, { k: 'past_due', label: 'Past due' }, { k: 'cancelled', label: 'Cancelled' }];
  const contractsFiltered = () => {
    let rows = LSTC.tab === 'all' ? D.contracts.slice() : D.contracts.filter((c) => c.status === LSTC.tab);
    if (LSTC.kwApplied) { const q = LSTC.kwApplied.toLowerCase(); rows = rows.filter((c) => String(c[LSTC.kwType] || '').toLowerCase().includes(q)); }
    return rows;
  };
  // The plan a contract runs on (drives the frequency shown in the list + the projected upcoming schedule).
  const contractPlan = (c) => D.plans.find((p) => p.id === c.planId || p.name === c.plan);
  const contractFreq = (c) => { const p = contractPlan(c); return p ? cycleLabel(p.cycle) : '<span class="muted">—</span>'; };
  function contractPager(page, pages) {
    const item = (label, pg, opts) => { opts = opts || {}; return '<span class="pg-item' + (opts.active ? ' active' : '') + (opts.disabled ? ' disabled' : '') + '"' + (opts.disabled ? '' : ' data-page="' + pg + '"') + '>' + label + '</span>'; };
    let nums = ''; for (let pg = 1; pg <= pages; pg++) nums += item(String(pg), pg, { active: pg === page });
    return '<div class="pg">' + item('&lsaquo;', page - 1, { disabled: page <= 1 }) + nums + item('&rsaquo;', page + 1, { disabled: page >= pages }) +
      '<select class="pg-size" id="ct-pgsize">' + ['10', '20', '50', '100'].map((s) => '<option value="' + s + '"' + (Number(s) === LSTC.size ? ' selected' : '') + '>' + s + ' / page</option>').join('') + '</select></div>';
  }

  function renderContracts() {
    const all = contractsFiltered();
    const total = all.length;
    const pages = Math.max(1, Math.ceil(total / LSTC.size));
    if (LSTC.page > pages) LSTC.page = pages;
    const pageRows = all.slice((LSTC.page - 1) * LSTC.size, (LSTC.page - 1) * LSTC.size + LSTC.size);
    const cnt = (k) => k === 'all' ? D.contracts.length : D.contracts.filter((c) => c.status === k).length;
    const rows = pageRows.map((c) =>
      '<tr data-id="' + c.id + '" style="cursor:pointer">' +
        '<td><div style="font-weight:600;color:var(--ink)">' + esc(c.customer) + '</div><div class="muted" style="font-size:12px">' + esc(c.email) + '</div></td>' +
        '<td><div style="color:var(--ink)">' + esc(c.plan) + '</div><div class="muted" style="font-size:12px">' + esc(c.product) + '</div></td>' +
        '<td>' + contractFreq(c) + '</td>' +
        '<td>' + (c.next ? fmtDate(c.next) : '<span class="muted">—</span>') + '</td>' +
        '<td class="num">' + money(c.amount) + '</td>' +
        '<td>' + pill(c.status) + '</td>' +
        '<td style="text-align:center" data-stop><button class="back-btn ct-view" data-view="' + c.id + '" title="View" style="width:30px;height:30px;color:var(--ink-muted)">' + I.eye + '</button></td>' +
      '</tr>').join('');
    root.innerHTML =
      '<div class="flex items-center justify-between mb-4"><h1 class="page-title">Subscriptions</h1></div>' +
      '<div class="panel">' + tabsBar(TABSC, LSTC.tab, cnt) + filterBar(LSTC, CONTRACT_FIELDS) +
        '<div style="overflow-x:auto"><table class="tbl" style="min-width:880px">' +
          '<thead><tr><th>Customer</th><th>Plan</th><th style="width:120px">Frequency</th><th style="width:130px">Next charge</th><th class="num" style="width:90px">Amount</th><th style="width:110px">Status</th><th style="width:80px;text-align:center">Action</th></tr></thead>' +
          '<tbody id="ct-tbody">' + (rows || '<tr><td colspan="7" class="muted" style="text-align:center;padding:40px">No subscriptions in this view.</td></tr>') + '</tbody>' +
        '</table></div>' +
        '<div class="flex items-center justify-between card-pad"><span class="muted" style="font-size:13px">Total ' + total + ' records</span>' + contractPager(LSTC.page, pages) + '</div>' +
      '</div>';
    root.querySelectorAll('#ct-tbody tr[data-id]').forEach((tr) => tr.onclick = (e) => { if (e.target.closest('[data-stop]')) return; location.hash = '#/subscriptions/contracts/' + tr.getAttribute('data-id'); });
    root.querySelectorAll('.ct-view').forEach((el) => el.onclick = (e) => { e.stopPropagation(); location.hash = '#/subscriptions/contracts/' + el.getAttribute('data-view'); });
    root.querySelectorAll('.tab[data-tab]').forEach((t) => t.onclick = () => { LSTC.tab = t.getAttribute('data-tab'); LSTC.page = 1; renderContracts(); });
    root.querySelectorAll('.pg-item[data-page]').forEach((el) => el.onclick = () => { LSTC.page = Number(el.getAttribute('data-page')); renderContracts(); });
    const ps = root.querySelector('#ct-pgsize'); if (ps) ps.onchange = () => { LSTC.size = Number(ps.value); LSTC.page = 1; renderContracts(); };
    wireFilter(LSTC, renderContracts);
  }

  // ================= SUBSCRIPTION (contract) — detail + at-merchant actions =================
  function productLink(c) {
    const id = c && c.productId;
    if (!id) return '<span>' + esc(c && c.product) + '</span>';
    return '<a href="#/products/' + encodeURIComponent(id) + '" style="color:var(--brand);font-weight:500;text-decoration:none">' + esc(c.product) + '</a>';
  }
  function orderLink(id) {
    return '<a href="#/orders/' + encodeURIComponent(id) + '" style="color:var(--brand);font-weight:500;text-decoration:none">' + esc(id) + '</a>';
  }
  function summaryHtml(c) {
    const plan = contractPlan(c);
    return row2('Plan', esc(c.plan)) + row2('Product', productLink(c)) + row2('Quantity', c.qty) +
      row2('Billing cycle', plan ? cycleLabel(plan.cycle) : '—') + row2('Amount per cycle', money(c.amount)) +
      row2('Started', fmtDate(c.startedAt)) + row2('Charges completed', c.cyclesDone);
  }
  function scheduleHtml(c) {
    if (c.status === 'cancelled') return '<div class="muted" style="font-size:13.5px">Ended on ' + fmtDate(c.endedAt) + '. No further charges.</div>';
    const overdue = c.status === 'past_due';
    return '<div style="font-size:13.5px;color:var(--ink)">' + (overdue ? '<span style="color:var(--err)">Payment overdue since <b>' + fmtDate(c.next) + '</b></span>' : 'Next charge on <b>' + fmtDate(c.next) + '</b>') + ' · ' + money(c.amount) + '</div>' +
      '<div class="muted" style="font-size:12px;margin-top:6px">Charged automatically via ' + gwName(c.gateway) + '.</div>';
  }
  function orderHistory(c) {
    if (!c.history || !c.history.length) return '<div class="muted" style="font-size:13px">No charges yet.</div>';
    return '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Order</th><th>Date</th><th class="num">Amount</th><th style="width:110px">Status</th></tr></thead><tbody>' +
      c.history.map((o) => '<tr><td>' + orderLink(o.id) + '</td><td>' + fmtDate(o.date) + '</td><td class="num">' + money(o.amount) + '</td><td>' + pill(o.status) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }
  function custHtml(c) { return row2('Name', esc(c.customer)) + row2('Email', esc(c.email)) + '<div style="padding-top:8px;font-size:12.5px;color:var(--ink-body);line-height:1.5"><span class="muted">Ships to</span><br>' + esc(c.address) + '</div>'; }
  function payHtml(c) { return row2('Method', esc(c.method)) + row2('Gateway', gwName(c.gateway)); }

  // Add n billing cycles to a YYYY-MM-DD date (used to project the upcoming charge schedule). Deterministic — no Date.now().
  function addCycle(dateStr, every, unit, n) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const step = (every || 1) * n;
    if (unit === 'week') d.setDate(d.getDate() + 7 * step);
    else if (unit === 'year') d.setFullYear(d.getFullYear() + step);
    else d.setMonth(d.getMonth() + step);
    const p2 = (x) => String(x).length < 2 ? '0' + x : String(x);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  // Projected upcoming charges from the current schedule (read-only forecast).
  function upcomingHtml(c) {
    if (c.status === 'cancelled') return '<div class="muted" style="font-size:13px">No upcoming charges — this subscription has ended.</div>';
    if (!c.next) return '<div class="muted" style="font-size:13px">No upcoming charges scheduled.</div>';
    const plan = contractPlan(c); const every = plan ? plan.cycle.every : 1; const unit = plan ? plan.cycle.unit : 'month';
    let rows = '';
    for (let i = 0; i < 4; i++) {
      const date = i === 0 ? c.next : addCycle(c.next, every, unit, i);
      const lbl = i === 0 ? (c.status === 'past_due' ? 'Overdue' : 'Next charge') : 'Scheduled';
      const cls = (i === 0 && c.status === 'past_due') ? 'pill-red' : (i === 0 ? 'pill-blue' : 'pill-gray');
      rows += '<tr><td>' + fmtDate(date) + '</td><td>' + productLink(c) + '</td><td class="num">' + money(c.amount) + '</td><td><span class="pill ' + cls + '">' + lbl + '</span></td></tr>';
    }
    return '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="width:130px">Charge date</th><th>Product</th><th class="num" style="width:90px">Amount</th><th style="width:120px">Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="muted" style="font-size:12px;margin-top:8px">Projected from the current schedule — skipping or rescheduling a charge shifts these dates.</div>';
  }
  // Activity log — a timeline synthesized from start date, charge history and current status.
  function activityHtml(c) {
    const ev = [{ d: c.startedAt, t: 'Subscription started', sub: 'Plan: ' + c.plan }];
    (c.history || []).forEach((o) => ev.push({ d: o.date, t: (o.status === 'paid' ? 'Charge succeeded' : o.status === 'failed' ? 'Charge failed' : 'Charge ' + o.status) + ' · ' + money(o.amount), orderId: o.id }));
    if (c.status === 'cancelled') ev.push({ d: c.endedAt, t: 'Subscription cancelled', sub: 'No further charges' });
    else if (c.next) ev.push({ d: c.next, t: 'Next charge scheduled', sub: money(c.amount), future: true });
    ev.sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')));
    return '<div>' + ev.map((e, i) => {
      const last = i === ev.length - 1;
      return '<div style="display:flex;gap:12px">' +
        '<div style="flex:none;display:flex;flex-direction:column;align-items:center"><span style="width:10px;height:10px;border-radius:50%;flex:none;margin-top:3px;background:' + (e.future ? 'var(--ctl)' : 'var(--brand)') + '"></span>' + (last ? '' : '<span style="flex:1;width:2px;background:var(--hair);margin:2px 0"></span>') + '</div>' +
        '<div style="flex:1;min-width:0;padding-bottom:' + (last ? '0' : '16px') + '"><div style="font-size:13px;color:var(--ink);font-weight:500">' + esc(e.t) + '</div>' + (e.orderId ? '<div class="muted" style="font-size:12px">Order ' + orderLink(e.orderId) + '</div>' : e.sub ? '<div class="muted" style="font-size:12px">' + esc(e.sub) + '</div>' : '') + '</div>' +
        '<div class="muted" style="font-size:12px;white-space:nowrap;flex:none">' + (e.d ? fmtDate(e.d) : '') + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }
  // Tab bar + body for the contract detail (Details / Past orders / Upcoming orders / Activity log).

  function actionBtns(c) {
    if (c.status === 'cancelled') return '<div class="muted" style="font-size:13px">Cancelled on ' + fmtDate(c.endedAt) + '. No further charges.</div>';
    const b = (act, txt, danger) => '<button class="btn btn-default" data-ca="' + act + '" style="width:100%;justify-content:center;margin-bottom:8px' + (danger ? ';color:var(--err);border-color:#f3c4ba' : '') + '">' + txt + '</button>';
    let out = '';
    // Manage actions mirror the Customer-portal settings (Cancel + basic edits). Pause / Skip / Reschedule / Swap are retired — low frequency.
    if (c.status === 'active') out += b('address', 'Change shipping address');
    if (c.status === 'past_due') out += b('retry', 'Retry payment now') + b('method', 'Update payment method');
    return out + b('cancel', 'Cancel subscription', true);
  }
  function handleAction(c, act) {
    switch (act) {
      case 'retry': c.status = 'active'; toast('Payment retried — charge succeeded'); break;
      case 'cancel': window.UI.confirm({ title: 'Cancel subscription', content: 'Cancel this subscription? It will stop future charges.', okText: 'Cancel subscription', danger: true, onOk: () => { c.status = 'cancelled'; c.endedAt = '2026-06-22'; c.next = ''; toast('Subscription cancelled'); renderContractDetail(c.id); } }); return;
      case 'address': openAddressModal(c); return;
      case 'method': toast('Update payment method — opens the gateway hosted page in production'); return;
    }
    renderContractDetail(c.id);
  }

  // Edit shipping address — mirrors the Orders module modal (Contact + Delivery sections, Save with required-field validation).
  function openAddressModal(c) {
    const parts = String(c.address || '').split(',').map((x) => x.trim()).filter(Boolean);   // mock: "<street>, <city>, <state> <zip>, <country>"
    const street = parts[0] || '';
    const country = parts.length >= 4 ? parts[parts.length - 1] : '';
    const stateZip = parts.length >= 3 ? parts[parts.length - 2] : '';
    const szM = stateZip.match(/^(.*?)\s+(\S+)$/);
    const state = szM ? szM[1] : stateZip;
    const zip = szM ? szM[2] : '';
    const city = parts.length >= 4 ? parts[1] : '';
    const nm = String(c.customer || '').trim().split(/\s+/);
    const first = nm.length > 1 ? nm.slice(0, -1).join(' ') : (nm[0] || '');
    const last = nm.length > 1 ? nm[nm.length - 1] : '';
    const inp = (id, ph, val) => '<input class="input" id="' + id + '" placeholder="' + esc(ph) + '" value="' + esc(val || '') + '" style="margin-bottom:12px" />';
    const body =
      '<div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:8px">Contact</div>' +
      inp('sa-email', 'Email', c.email) +
      '<div style="font-size:13px;font-weight:500;color:var(--ink);margin:4px 0 8px">Delivery</div>' +
      inp('sa-country', 'Country/Region', country) +
      '<div class="grid grid-cols-2 gap-3"><div>' + inp('sa-first', 'First name', first) + '</div><div>' + inp('sa-last', 'Last name', last) + '</div></div>' +
      inp('sa-addr', 'Address', street) +
      inp('sa-apt', 'Apartment, suite, etc.(optional)', '') +
      '<div class="grid grid-cols-3 gap-3"><div>' + inp('sa-state', 'State', state) + '</div><div>' + inp('sa-city', 'City', city) + '</div><div>' + inp('sa-zip', 'ZIP code', zip) + '</div></div>' +
      inp('sa-phone', 'Phone', c.phone) +
      '<div id="sa-err" style="color:var(--err);font-size:12px;margin-top:4px;display:none">Please fill in all required fields.</div>';
    const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
    const m = document.createElement('div'); m.className = 'modal'; m.style.width = '760px'; m.style.maxWidth = 'calc(100vw - 32px)';
    m.innerHTML =
      '<div class="modal-head flex items-center justify-between"><span>Edit shipping address</span><span data-x style="cursor:pointer;font-size:18px;line-height:1;color:var(--muted)">&times;</span></div>' +
      '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-foot"><button class="btn btn-default" data-cancel>Cancel</button><button class="btn btn-primary" data-ok>Save</button></div>';
    backdrop.appendChild(m); document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    m.querySelector('[data-x]').onclick = close;
    m.querySelector('[data-cancel]').onclick = close;
    backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
    m.querySelector('[data-ok]').onclick = () => {
      const req = ['sa-email', 'sa-country', 'sa-first', 'sa-last', 'sa-addr', 'sa-state', 'sa-city', 'sa-zip'];   // phone optional — contract model carries no phone yet
      if (req.some((id) => !m.querySelector('#' + id).value.trim())) { m.querySelector('#sa-err').style.display = 'block'; return; }
      const g = (id) => m.querySelector('#' + id).value.trim();
      c.email = g('sa-email'); c.phone = g('sa-phone');
      c.address = [g('sa-addr'), g('sa-apt'), g('sa-city'), (g('sa-state') + ' ' + g('sa-zip')).trim(), g('sa-country')].filter(Boolean).join(', ');
      close(); toast('Address updated'); renderContractDetail(c.id);
    };
  }

  function renderContractDetail(id) {
    const c = D.contracts.find((x) => String(x.id) === String(id));
    if (!c) return renderMissing('Subscription', '#/subscriptions/contracts');
    root.innerHTML =
      '<div class="detail-wrap">' +
        '<div class="flex items-center justify-between mb-6"><div class="flex items-center gap-2">' +
          '<button class="back-btn" data-act="back" title="Back">' + I.back + '</button>' +
          '<span class="page-title">' + esc(c.customer) + '</span> ' + pill(c.status) +
        '</div><span class="muted" style="font-size:13px">' + esc(c.id) + '</span></div>' +
        '<div class="detail-cols"><div class="detail-main">' +
          card('Subscription', summaryHtml(c)) +
          card('Billing schedule', scheduleHtml(c)) +
          card('Upcoming orders', upcomingHtml(c)) +
          card('Past orders', orderHistory(c)) +
          card('Activity log', activityHtml(c)) +
        '</div><div class="detail-rail">' +
          card('Manage', actionBtns(c)) +
          card('Customer', custHtml(c)) +
          card('Payment', payHtml(c)) +
        '</div></div>' +
      '</div>';
    const back = root.querySelector('[data-act="back"]'); if (back) back.onclick = () => { location.hash = '#/subscriptions/contracts'; };
    root.querySelectorAll('[data-ca]').forEach((btn) => btn.onclick = () => handleAction(c, btn.getAttribute('data-ca')));
  }

  // ================= ORDERS (recurring) =================
  const LSTO = { tab: 'all', kw: '', kwType: 'id', kwApplied: '' };
  const ORDER_FIELDS = [{ value: 'id', label: 'Order' }, { value: 'customer', label: 'Customer' }, { value: 'plan', label: 'Plan' }];
  const TABSO = [{ k: 'all', label: 'All' }, { k: 'paid', label: 'Paid' }, { k: 'failed', label: 'Failed' }, { k: 'retrying', label: 'Retrying' }, { k: 'refunded', label: 'Refunded' }];
  const ordersFiltered = () => {
    let rows = LSTO.tab === 'all' ? D.orders.slice() : D.orders.filter((o) => o.status === LSTO.tab);
    if (LSTO.kwApplied) { const q = LSTO.kwApplied.toLowerCase(); rows = rows.filter((o) => String(o[LSTO.kwType] || '').toLowerCase().includes(q)); }
    return rows;
  };

  function renderOrders() {
    const cnt = (k) => k === 'all' ? D.orders.length : D.orders.filter((o) => o.status === k).length;
    const rows = ordersFiltered().map((o) =>
      '<tr data-cid="' + o.contract + '" style="cursor:pointer">' +
        '<td style="font-weight:600;color:var(--ink)">' + esc(o.id) + '</td>' +
        '<td>' + esc(o.customer) + '</td>' +
        '<td>' + esc(o.plan) + '</td>' +
        '<td>' + fmtDate(o.date) + '</td>' +
        '<td class="num">' + money(o.amount) + '</td>' +
        '<td>' + pill(o.status) +
          (o.status === 'retrying' && o.nextRetry ? '<div class="muted" style="font-size:11px">retry ' + fmtDate(o.nextRetry) + '</div>' : '') +
          (o.status === 'failed' && o.reason ? '<div class="muted" style="font-size:11px">' + esc(o.reason) + '</div>' : '') + '</td>' +
        '<td><a href="#/subscriptions/contracts/' + encodeURIComponent(o.contract) + '" style="color:var(--brand)">' + esc(o.contract) + '</a></td>' +
        '<td style="text-align:center">' + ((o.status === 'failed' || o.status === 'retrying') ? '<button class="btn btn-default" data-retry="' + o.id + '" style="height:28px;padding:0 10px">Retry</button>' : '') + '</td>' +
      '</tr>').join('');
    root.innerHTML =
      '<div class="flex items-center justify-between mb-4"><h1 class="page-title">Orders</h1></div>' +
      '<div class="panel">' + tabsBar(TABSO, LSTO.tab, cnt) + filterBar(LSTO, ORDER_FIELDS) +
        '<div style="overflow-x:auto"><table class="tbl" style="min-width:940px">' +
          '<thead><tr><th>Order</th><th>Customer</th><th>Plan</th><th style="width:120px">Date</th><th class="num" style="width:90px">Amount</th><th style="width:120px">Status</th><th style="width:130px">Subscription</th><th style="width:90px"></th></tr></thead>' +
          '<tbody id="od-tbody">' + (rows || '<tr><td colspan="8" class="muted" style="text-align:center;padding:40px">No orders in this view.</td></tr>') + '</tbody>' +
        '</table></div>' +
      '</div>';
    root.querySelectorAll('.tab[data-tab]').forEach((t) => t.onclick = () => { LSTO.tab = t.getAttribute('data-tab'); renderOrders(); });
    wireFilter(LSTO, renderOrders);
    root.querySelectorAll('#od-tbody tr[data-cid]').forEach((tr) => tr.onclick = (e) => { if (e.target.closest('[data-retry],a')) return; const cid = tr.getAttribute('data-cid'); if (D.contracts.find((c) => c.id === cid)) location.hash = '#/subscriptions/contracts/' + cid; });
    root.querySelectorAll('[data-retry]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); toast('Retrying charge ' + b.getAttribute('data-retry') + '…'); });
  }

  // ================= STOREFRONT (subscription widget display) =================
  const WID = { tab: 'pdp', style: 'radio', showReward: false, showBenefits: false, showSwap: false };
  const WID_STYLES = ['radio', 'buttons', 'bordered'];

  // a mini purchase-options box rendered in the chosen style (used by the style preview + the live plan preview).
  // o defaults reproduce the shop-level Storefront sample ($5 / $4.75 / 5% / every 20 days); pass a plan to reflect real numbers.
  function buyBox(style, o) {
    o = o || {};
    const real = !!o.real; // a real plan (the shop showcase passes no opts -> generic $5 demo)
    const oneTime = real ? (o.oneTime != null ? o.oneTime : null) : 5;
    const sub = real ? (o.sub != null ? o.sub : null) : 4.75;
    const pct = real ? (o.pct || 0) : 5;
    const freqTxt = o.freq || 'Delivery every 20 days';
    const hasDisc = pct > 0;
    const ps = (v) => v == null ? '—' : money(v);
    const strike = hasDisc ? '<span class="muted" style="text-decoration:line-through">' + money(oneTime) + '</span>' : '';
    const save = hasDisc ? '<span class="pill pill-green" style="padding:0 7px">' + pct + '%</span>' : '';
    const subTxt = (hasDisc ? 'Subscribe &amp; Save ' + save + ' ' + strike + ' ' : 'Subscribe ') + '<b>' + money(sub) + '</b>';
    const radio = (on) => '<span style="width:15px;height:15px;border-radius:50%;border:1.5px solid ' + (on ? 'var(--brand)' : 'var(--ctl)') + ';flex:none;display:inline-grid;place-items:center">' + (on ? '<span style="width:7px;height:7px;border-radius:50%;background:var(--brand)"></span>' : '') + '</span>';
    // Real plan = one fixed cycle (set in admin), so show the frequency as static text — not a customer-selectable dropdown. Shop showcase keeps the dropdown look.
    const sel = real ? '<div class="muted" style="margin-top:6px;margin-left:23px;font-size:12.5px">' + esc(freqTxt) + '</div>' : '<div class="input" style="height:32px;display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-size:12.5px">' + esc(freqTxt) + ' <span class="muted">▾</span></div>';
    const head = '<div class="muted" style="font-size:12px;margin-bottom:8px;font-weight:600">Purchase options</div>';
    const mode = o.mode || 'sub'; const onOne = real && mode === 'onetime', onSub = !real || mode === 'sub';
    const datOne = real ? ' data-buymode="onetime"' : ''; const datSub = real ? ' data-buymode="sub"' : '';
    const subLeft = hasDisc ? 'Subscribe &amp; Save ' + save : 'Subscribe';
    const onePrice = '<span style="flex:none;white-space:nowrap;font-weight:600;color:var(--ink)">' + ps(oneTime) + '</span>';
    const subPrice = '<span style="flex:none;white-space:nowrap">' + (hasDisc ? '<span class="muted" style="text-decoration:line-through">' + ps(oneTime) + '</span> ' : '') + '<b>' + ps(sub) + '</b></span>';
    // each option row: [radio] [name + discount pill, left] ... [price(s), right]
    const oneRow = (st) => '<label' + datOne + ' style="display:flex;align-items:center;gap:8px;cursor:pointer;' + (st || 'padding:6px 0') + '">' + radio(onOne) + '<span style="flex:1;min-width:0">One-time Purchase</span>' + onePrice + '</label>';
    const subRow = (st) => '<label' + datSub + ' style="display:flex;align-items:center;gap:8px;cursor:pointer;' + (st || 'padding:6px 0') + '">' + radio(onSub) + '<span style="flex:1;min-width:0">' + subLeft + '</span>' + subPrice + '</label>';
    if (style === 'freq') {
      const subList = real
        ? '<div style="display:flex;flex-direction:column;gap:5px;padding:5px 0 2px">' +
            '<div class="muted" style="font-size:12px">Delivery frequency</div>' +
            '<div class="input" style="height:32px;display:flex;align-items:center;justify-content:space-between;font-size:12.5px;background:#f7f8fb;cursor:default">' + esc(freqTxt) + ' <span class="muted">▾</span></div>' +
            '<div class="muted" style="font-size:11.5px">Fixed by this plan</div>' +
          '</div>'
        : '<label style="display:flex;gap:8px;align-items:center;padding:4px 0">' + radio(true) + '<span>Delivery every 5 days</span></label>' +
          '<label style="display:flex;gap:8px;align-items:center;padding:4px 0">' + radio(false) + '<span>Delivery every 10 days</span></label>';
      return head + oneRow() + subRow() +
        '<div style="margin:4px 0 0 24px">' + (real ? '' : '<div class="muted" style="font-size:12px;margin-bottom:4px">Delivery Frequency</div>') + subList + '</div>';
    }
    if (style === 'buttons') {
      const btn = (m, t1, t2, t3, on) => '<div' + (real && m ? ' data-buymode="' + m + '"' : '') + ' style="border:1.5px solid ' + (on ? 'var(--brand)' : 'var(--ctl)') + ';border-radius:8px;padding:10px;text-align:center;font-size:12px;line-height:1.5;display:flex;flex-direction:column;justify-content:center;align-items:center;cursor:pointer">' + '<div>' + t1 + '</div>' + (t2 ? '<div style="font-weight:600;color:var(--ok)">' + t2 + '</div>' : '') + (t3 ? '<div>' + t3 + '</div>' : '') + '</div>';
      const cells = real
        ? btn('onetime', 'One-time<br>' + ps(oneTime), '', '', onOne) + btn('sub', 'Subscribe', hasDisc ? 'Save ' + pct + '%' : '', (hasDisc ? '<s class="muted">' + ps(oneTime) + '</s> ' : '') + ps(sub), onSub)
        : btn('', 'One-time<br>$5.00', '', '', false) + btn('', 'Every 2-weeks', 'Save 10%', '<s class="muted">$5</s> $4.5', true) +
          btn('', 'Every 4-weeks', 'Save 8%', '<s class="muted">$5</s> $4.6', false) + btn('', 'Every 6-weeks', 'Save 5%', '<s class="muted">$5</s> $4.75', false);
      return head + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + cells + '</div>';
    }
    if (style === 'bordered') {
      return head +
        oneRow('border:1px solid ' + (onOne ? 'var(--ink)' : 'var(--hair)') + ';border-radius:8px;padding:11px') +
        '<div style="border:1.5px solid ' + (onSub ? 'var(--ink)' : 'var(--hair)') + ';border-radius:8px;padding:11px;margin-top:8px">' + subRow('') + sel + '</div>';
    }
    return head + oneRow() + subRow() + sel;
  }

  // compact line-art glyph for each widget style (used by the plan-page style thumbnails)
  function styleGlyph(key) {
    const dot = (f) => '<span style="width:7px;height:7px;border-radius:50%;border:1.5px solid ' + (f ? 'var(--brand)' : 'var(--ctl)') + ';background:' + (f ? 'var(--brand)' : 'transparent') + ';flex:none"></span>';
    const bar = (w) => '<span style="height:5px;width:' + w + ';background:#d7dbe7;border-radius:2px;flex:none"></span>';
    const row = (f, w) => '<div style="display:flex;align-items:center;gap:4px">' + dot(f) + bar(w) + '</div>';
    if (key === 'buttons') {
      const cell = (on) => '<span style="height:13px;border:1.5px solid ' + (on ? 'var(--brand)' : 'var(--ctl)') + ';border-radius:3px;display:block"></span>';
      return '<div style="display:grid;grid-template-columns:15px 15px;gap:4px">' + cell(false) + cell(true) + cell(false) + cell(false) + '</div>';
    }
    if (key === 'freq') {
      return '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">' + row(false, '30px') + row(true, '24px') + '<div style="padding-left:11px">' + row(true, '20px') + '</div></div>';
    }
    if (key === 'bordered') {
      return '<div style="display:flex;flex-direction:column;gap:4px"><span style="border:1px solid var(--ctl);border-radius:4px;padding:3px 5px;display:block">' + row(false, '26px') + '</span><span style="border:1.5px solid var(--brand);border-radius:4px;padding:3px 5px;display:block">' + row(true, '26px') + '</span></div>';
    }
    return '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">' + row(false, '32px') + row(true, '26px') + '</div>';
  }

  // A bundle plan subscribes to a specific TIER. Tiers come from the bundle template sample (same source the bundle editor uses).
  function bundleTiers(p) {
    if (p.itemType !== 'bundle' || !p.bundleTemplate) return [];
    const s = (window.DATA_BUNDLES && window.DATA_BUNDLES.samples) ? window.DATA_BUNDLES.samples[p.bundleTemplate] : null;
    return (s && s.tiers) ? s.tiers : [];
  }
  function bundleSampleFor(p) {
    return (window.DATA_BUNDLES && window.DATA_BUNDLES.samples) ? window.DATA_BUNDLES.samples[p.bundleTemplate] : null;
  }
  // A product is "sold as a bundle" when it has an ACTIVE bundle (backend enforces at most one active per product).
  function activeBundleFor(productName) {
    const list = (window.DATA_BUNDLES && window.DATA_BUNDLES.bundles) ? window.DATA_BUNDLES.bundles : [];
    return list.filter(function (b) { return b.parentProduct === productName && b.status === 'active'; })[0] || null;
  }

  // Recurring price display: derived recurring amount + cycle suffix (shown read-only in the Billing card).
  // Recurring price = one-time price minus the subscription discount (percent OR fixed). One-time comes from the product/bundle.
  function recurringPrice(p) {
    if (p.compareAt == null) return null;
    var v = p.discountValue || 0;
    var r = (p.discountType === 'fixed') ? (p.compareAt - v) : (p.compareAt * (1 - v / 100));
    return Math.max(0, Math.round(r * 100) / 100);
  }
  function discountLabel(p) {
    var dt = p.discountType || 'percent';
    var dv = (p.discountValue != null ? p.discountValue : p.discountPct) || 0;
    if (!dv) return '';
    return dt === 'fixed' ? '−' + money(dv) : '−' + dv + '%';
  }
  // Apply the plan's subscription discount to an arbitrary price (per-tier — used only to build the bundle price range in the list).
  function applyDisc(price, p) { if (price == null) return null; var v = p.discountValue || 0; var r = (p.discountType === 'fixed') ? (price - v) : (price * (1 - v / 100)); return Math.max(0, Math.round(r * 100) / 100); }
  // A bundle plan spans every pack tier; the LIST shows a price range "from $X" (cheapest pack's recurring). The editor is unchanged.
  function planBundlePrice(p) { var ts = bundleTiers(p); var recs = ts.map(function (t) { return applyDisc(t.price, p); }).filter(function (x) { return x != null; }); if (!recs.length) return '—'; return 'from ' + money(Math.min.apply(null, recs)); }
  function recurringDisplay(p) {
    if (p.price == null) return '<span class="muted" style="font-weight:400">—</span>';
    const u = p.cycle.every === 1 ? p.cycle.unit : p.cycle.every + ' ' + p.cycle.unit + 's';
    return money(p.price) + '<span class="muted" style="font-weight:400;font-size:12px;margin-left:6px">/ ' + u + '</span>';
  }

  // map a plan's pricing/cycle into buyBox opts (empty -> representative defaults so a blank new plan still looks real)
  // Always returns a REAL plan opts (real:true) so the preview shows the actual 2-option layout following Bill every — even with no product (prices show as —, not the $5 showcase).
  function planBuyOpts(p) {
    const oneTime = p.compareAt != null ? p.compareAt : (p.price != null ? p.price : null);
    const pct = (p.compareAt && p.price != null) ? Math.max(0, Math.round((1 - p.price / p.compareAt) * 100)) : 0;
    return { real: true, oneTime: oneTime, sub: (p.price != null ? p.price : null), pct: pct, mode: previewBuyMode, freq: 'Delivery ' + cycleLabel(p.cycle).toLowerCase(), unit: (p.cycle && p.cycle.unit ? p.cycle.unit + 's' : 'months') };
  }

  // Full bundle PDP preview — renders the SAME markup as the bundle editor (offer line, tier cards, bleed-to-edge gift block,
  // variant rows) so it stays consistent, then appends the subscribe widget for the selected tier. Tier cards are clickable.
  function bundleOfferPreview(p) {
    const tiers = bundleTiers(p);
    const sample = bundleSampleFor(p) || {};
    const bc = sample.brandColor || '#8a5a2b';
    const tpl = sample.template || p.bundleTemplate;
    const hdr = sample.header || {};
    const sel = Math.max(0, Math.min(p.tierIndex || 0, tiers.length - 1));
    const chevDn = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="flex:none"><path d="m6 9 6 6 6-6"/></svg>';
    const imgIcon = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#b6bdca" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>';
    const head = '<div style="text-align:' + (hdr.align || 'center') + ';font-weight:700;color:' + bc + ';font-size:16px;margin-bottom:14px' + (hdr.line ? ';border-bottom:' + (hdr.thickness || 2) + 'px solid ' + bc + ';padding-bottom:8px' : '') + '">' + (esc(hdr.text) || 'Bundle') + '</div>';
    const mainImg = p.image || compImg({ product: p.product });
    const productArea = '<div style="margin-bottom:18px">' +
      '<div style="position:relative;aspect-ratio:1/1;width:100%;background:#eef0f5;border-radius:12px;overflow:hidden;margin-bottom:14px">' +
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#9aa3b2;font-size:12px;font-weight:600">' + imgIcon + '<span>Product image</span></div>' +
        (mainImg ? '<img src="' + esc(imgAt(mainImg, 800)) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()" />' : '') +
      '</div>' +
      '<div style="font-weight:600;color:var(--ink);font-size:17px;line-height:1.3">' + (esc(p.product) || 'Product name') + '</div>' +
      '<div style="color:var(--ink);font-size:16px;font-weight:700;margin-top:6px">' + money(tiers[0] ? tiers[0].price : null) + '</div>' +
    '</div>';
    const selTtl = esc((tiers[sel] || {}).title) || ((tiers[sel] || {}).qty + ' PCS');
    const subSection = '<div style="border-top:1px solid var(--hair);margin:14px 0 0;padding-top:12px">' + buyBox(p.widgetStyle, planBuyOpts(p)) + widExtras() + '</div>';
    const cta = '<button class="btn" style="width:100%;justify-content:center;text-align:center;margin-top:12px;height:44px;font-size:14px;font-weight:600;background:' + bc + ';color:#fff;border:0;border-radius:8px">Add to cart</button>';

    if (tpl === 'box') {
      return productArea + head + '<div style="border:1px solid var(--hair);border-radius:8px;padding:14px;text-align:center"><div style="font-weight:600;color:var(--ink)">Build your box &middot; pick ' + (sample.boxSize || 0) + '</div><div class="muted" style="font-size:12px;margin-top:6px">' + (sample.pool || []).length + ' products</div></div>' + subSection + cta;
    }
    if (tpl === 'fbt') {
      const ft = tiers[0] || { components: [] };
      const items = (ft.components || []).map(function (c, idx) {
        const checkbox = '<span style="flex:none;width:16px;height:16px;border-radius:4px;background:' + bc + ';display:inline-grid;place-items:center"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg></span>';
        return '<div class="flex items-center gap-2" style="padding:9px 0' + (idx ? ';border-top:1px solid var(--hair)' : '') + '">' + checkbox + imgCell(compImg(c), 34) + '<div style="flex:1;min-width:0;font-size:13px;color:var(--ink)">' + (esc(c.product) || 'Product') + (idx === 0 ? ' <span class="muted" style="font-size:11px">&middot; this item</span>' : '') + '</div></div>';
      }).join('');
      return productArea + head + '<div style="border:1px solid var(--hair);border-radius:8px;padding:2px 12px">' + items + '<div class="flex items-center justify-between" style="border-top:1px solid var(--hair);padding:10px 0 4px;font-size:13.5px"><span class="muted">Total &middot; ' + (ft.components || []).length + ' items</span><span style="font-weight:700;color:' + bc + '">' + money(ft.price) + (ft.compareAt ? ' <s class="muted" style="font-weight:400;font-size:12px">' + money(ft.compareAt) + '</s>' : '') + '</span></div></div>' + subSection + cta;
    }

    // volume / ab — radio-switchable tier cards (clickable in the preview too); selected tier expands its variant rows + gifts.
    const cards = tiers.map(function (t, i) {
      const on = i === sel;
      const mains = (t.components || []).filter(function (c) { return c.role === 'main'; });
      const gifts = (t.components || []).filter(function (c) { return c.role === 'gift'; });
      const badge = t.badge ? '<span style="position:absolute;top:-9px;right:10px;background:' + bc + ';color:#fff;font-size:10px;font-weight:700;border-radius:4px;padding:2px 8px">' + esc(t.badge) + '</span>' : '';
      const radio = '<span style="flex:none;width:15px;height:15px;border-radius:50%;border:1.5px solid ' + (on ? bc : 'var(--ctl)') + ';display:inline-grid;place-items:center">' + (on ? '<span style="width:7px;height:7px;border-radius:50%;background:' + bc + '"></span>' : '') + '</span>';
      const variantRows = on ? mains.map(function (m) {
        const multi = (m.variants == null || m.variants > 1);
        const vcount = (m.variants == null ? 6 : m.variants);
        const qty = Math.max(1, m.qty || 1);
        const groups = multi ? variantGroups(vcount) : [];
        var row = '<div class="flex items-center gap-2" style="margin-top:10px">' + imgCell(compImg(m), 40) + '<div style="flex:1;min-width:0;font-size:13px;color:var(--ink)">' + (esc(m.displayName) || esc(m.product) || 'Product') + '</div><span class="muted" style="font-size:13px;white-space:nowrap">&times; ' + qty + '</span></div>';
        if (groups.length) {
          // Option-name title (e.g. "Color, Size, Length") + one selectable dropdown per option, per unit.
          row += '<div class="muted" style="font-size:11px;margin-top:8px;font-weight:600">' + groups.map(function (g) { return esc(g.name); }).join(', ') + '</div>';
          for (var k = 1; k <= qty; k++) {
            row += '<div class="flex items-center gap-2" style="margin-top:5px">' + (qty > 1 ? '<span style="font-size:11.5px;color:var(--ink-muted);width:22px;flex:none">#' + k + '</span>' : '') +
              '<div style="display:flex;gap:6px;flex:1;min-width:0">' +
              groups.map(function (g) { return '<select class="pl-vsel" style="flex:1;min-width:0;height:30px;border:1px solid var(--ctl);border-radius:6px;padding:0 6px;font-size:12px;color:var(--ink-body);background:#fff;cursor:pointer">' + g.values.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('') + '</select>'; }).join('') +
              '</div></div>';
          }
        }
        return row;
      }).join('') : '';
      const giftRows = gifts.length ? '<div style="margin:10px -12px -12px;border-radius:0 0 6.5px 6.5px;overflow:hidden' + (on ? '' : ';opacity:0.5') + '">' + gifts.map(function (g, gi) {
        const gmulti = (g.variants != null && g.variants > 1);   // single-variant gifts have nothing to pick
        const ggroups = gmulti ? variantGroups(g.variants) : [];
        // Compact: variant dropdown(s) sit inline on the gift's own row (right-aligned) — no separate title line, so the row stays one line tall.
        var sel = ggroups.length ? '<div style="display:flex;gap:6px;flex:none;margin-left:auto">' + ggroups.map(function (gg) { return '<select class="pl-vsel" title="' + esc(gg.name) + '" style="height:26px;max-width:128px;border:1px solid rgba(255,255,255,0.55);border-radius:6px;padding:0 6px;font-size:11.5px;color:var(--ink-body);background:#fff;cursor:pointer">' + gg.values.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('') + '</select>'; }).join('') + '</div>' : '';
        return '<div class="flex items-center gap-2" style="background:' + bc + ';color:#fff;font-size:11.5px;padding:7px 12px' + (gi ? ';border-top:1px solid rgba(255,255,255,0.18)' : '') + '"><span style="width:38px;height:38px;border-radius:5px;overflow:hidden;background:rgba(255,255,255,0.25);flex:none;display:inline-block"><img src="' + compImg(g) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.remove()" /></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">+ ' + esc(g.displayName || g.product) + '</span>' + sel + '</div>';
      }).join('') + '</div>' : '';
      return '<div data-ptier="' + i + '" style="position:relative;border:1.5px solid ' + (on ? bc : 'var(--hair)') + ';border-radius:8px;padding:12px;margin-bottom:10px;cursor:pointer">' + badge +
        '<div class="flex items-center justify-between" style="gap:8px"><div class="flex items-center gap-2" style="min-width:0">' + radio +
          '<div style="min-width:0"><div class="flex items-center gap-2" style="flex-wrap:wrap"><span style="font-weight:600;color:var(--ink);font-size:13.5px">' + (esc(t.title) || (t.qty + ' PCS')) + '</span>' + (t.tag ? '<span style="background:' + bc + ';color:#fff;font-size:9.5px;font-weight:700;border-radius:4px;padding:2px 6px;white-space:nowrap">' + esc(t.tag) + '</span>' : '') + '</div>' + (t.subtitle ? '<div class="muted" style="font-size:11.5px">' + esc(t.subtitle) + '</div>' : '') + '</div></div>' +
          '<div style="text-align:right;flex:none"><span style="font-weight:700;color:' + bc + '">' + money(t.price) + '</span>' + (t.compareAt ? ' <s class="muted" style="font-size:12px">' + money(t.compareAt) + '</s>' : '') + '</div>' +
        '</div>' + variantRows + giftRows + '</div>';
    }).join('');
    return productArea + head + cards + subSection + cta;
  }

  // storefront PDP preview for a plan — product image/name/price + the chosen subscribe widget
  function planPreview(p) {
    if (p.itemType === 'bundle' && bundleTiers(p).length) return bundleOfferPreview(p);
    const name = esc(p.product) || '<span class="muted">Product name</span>';
    const tag = ''; // bundle context is already clear from the offer rendering below; no redundant pill in the preview
    const imgArea = '<div style="aspect-ratio:1/1;width:100%;background:#eef0f5;border-radius:8px;margin-bottom:12px;overflow:hidden;position:relative">' +
      (p.image ? '<img src="' + esc(imgAt(p.image, 800)) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()" />'
               : '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9aa3b2;font-size:12px;font-weight:600">Product image</div>') + '</div>';
    return '<div style="border:1px solid var(--hair);border-radius:10px;padding:14px">' +
      imgArea +
      '<div style="font-weight:600;color:var(--ink);font-size:15px;line-height:1.3">' + name + tag + '</div>' +
      '<div style="font-size:18px;font-weight:700;color:var(--ink);margin:6px 0 14px">' + (p.price != null ? money(p.price) : '—') + '</div>' +
      buyBox(p.widgetStyle, planBuyOpts(p)) + widExtras() +
      '<button class="btn btn-primary" style="width:100%;margin-top:14px;justify-content:center">Add to cart</button>' +
    '</div>';
  }

  function widExtras() {
    let out = '';
    if (WID.showReward) out += '<div style="margin-top:10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 10px;font-size:12px"><b>Free gift</b> on your 3rd order</div>';
    if (WID.showBenefits) out += '<div class="muted" style="margin-top:10px;font-size:12px;line-height:1.7">✓ Free shipping&nbsp;&nbsp;✓ Cancel anytime&nbsp;&nbsp;✓ Manage in your account</div>';
    if (WID.showSwap) out += '<div class="muted" style="margin-top:8px;font-size:12px">Includes: Starter kit → Refill from the 2nd order</div>';
    return out;
  }

  function renderStorefront() {
    const styleCard = (key) => {
      WID.style = supportedWidgetStyle(WID.style);
      const on = WID.style === key;
      return '<div class="panel" data-wstyle="' + key + '" style="padding:14px;cursor:pointer;position:relative;border-color:' + (on ? 'var(--brand)' : 'var(--hair)') + (on ? ';box-shadow:0 0 0 1px var(--brand)' : '') + '">' +
        (on ? '<span style="position:absolute;top:8px;right:10px;color:var(--brand);font-size:13px">●</span>' : '') + buyBox(key) + '</div>';
    };
    const tog = (id, on, lbl) => '<label class="flex items-center justify-between" style="padding:13px 0;cursor:pointer"><span style="font-weight:500;color:var(--ink);font-size:13.5px">' + lbl + '</span>' +
      '<span data-wtog="' + id + '" style="width:40px;height:22px;border-radius:999px;background:' + (on ? 'var(--brand)' : 'var(--ctl)') + ';position:relative;flex:none"><span style="position:absolute;top:2px;left:' + (on ? '20px' : '2px') + ';width:18px;height:18px;border-radius:50%;background:#fff"></span></span></label>';

    root.innerHTML =
      '<div class="flex items-center justify-between mb-4"><h1 class="page-title">Subscription widget</h1></div>' +
      '<div class="detail-cols"><div class="detail-main">' +
        card('Widget styles',
          '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px" id="wstyles">' + WID_STYLES.map(styleCard).join('') + '</div>' +
          '<div class="info-banner" style="margin-top:14px;font-size:12px">More styling (fonts, colors, spacing) is available in the Theme Editor.</div>') +
        card('Display options',
          tog('showReward', WID.showReward, 'Show reward') + '<div style="border-top:1px solid var(--hair)"></div>' +
          tog('showBenefits', WID.showBenefits, 'Show subscription benefits info') + '<div style="border-top:1px solid var(--hair)"></div>' +
          tog('showSwap', WID.showSwap, 'Show swap product descriptions')) +
      '</div><div class="detail-rail">' +
        card('Preview',
          '<div style="border:1px solid var(--hair);border-radius:10px;padding:16px">' +
            '<div style="height:10px;width:55%;background:var(--panel);border-radius:4px;margin-bottom:8px"></div>' +
            '<div style="height:10px;width:80%;background:var(--panel);border-radius:4px;margin-bottom:12px"></div>' +
            '<div style="font-size:20px;font-weight:700;color:var(--ink);margin-bottom:14px">$4.75</div>' +
            buyBox(WID.style) + widExtras() +
            '<button class="btn btn-primary" style="width:100%;margin-top:14px">Add to cart</button>' +
          '</div>') +
      '</div></div>';

    root.querySelectorAll('#wstyles [data-wstyle]').forEach((c) => c.onclick = () => { WID.style = c.getAttribute('data-wstyle'); renderStorefront(); });
    root.querySelectorAll('[data-wtog]').forEach((t) => t.onclick = () => { const k = t.getAttribute('data-wtog'); WID[k] = !WID[k]; renderStorefront(); });
  }

  // ================= ROUTER =================
  initSubsMetricTooltips();

  function route(rest) {
    disposeChart();
    document.querySelectorAll('.subs-tipbox').forEach((t) => (t.style.display = 'none'));
    const parts = (rest || '').split('/').filter(Boolean);
    const page = parts[0] || 'overview';
    const id = parts[1];
    if (page === 'plans') return id != null ? renderPlanDetail(id) : renderPlans();
    if (page === 'contracts') return id != null ? renderContractDetail(id) : renderContracts();
    if (page === 'orders') return renderOrders();
    if (page === 'settings') return renderOverview();   // dunning now lives in a modal on the Overview — keep alias for old links
    return renderOverview();
  }

  window.VIEWS = window.VIEWS || {};
  window.VIEWS.subscriptions = {
    render: function (el, rest) { root = el; route(rest || ''); },
    unmount: function () { disposeChart(); document.querySelectorAll('.subs-tipbox').forEach((t) => (t.style.display = 'none')); },
  };
})();
