(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function tr(value) {
    return window.I18N && window.I18N.lang === 'zh' && window.I18N.t ? window.I18N.t(value) : value;
  }

  function formatDate(value) {
    var date = new Date(value);
    var isZh = window.I18N && window.I18N.lang === 'zh';
    var locale = isZh ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale, { month: isZh ? 'numeric' : 'short', day: 'numeric', year: 'numeric' }) + ' · ' +
      date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function tone(status) {
    if (status === 'Needs attention') return 'warn';
    if (status === 'Draft') return 'muted';
    if (status === 'Published') return 'blue';
    return 'ok';
  }

  function render(root) {
    var rows = (window.DATA_ACTIVITY || []).slice();
    var selectedType = 'all';
    var selectedStatus = 'all';
    var query = '';
    var from = '';
    var to = '';
    var page = 1;
    var pageSize = 20;

    root.innerHTML =
      '<div class="view-wrap ac-view">' +
        '<style>' +
          '.ac-view{max-width:none;margin:0;padding:0 0 4px}' +
          '.ac-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}.ac-head h1{margin:0;color:var(--ink);font-size:20px;font-weight:600;line-height:1.5}.ac-head p{margin:5px 0 0;color:var(--ink-muted);font-size:13px;line-height:1.5;max-width:620px}' +
          '.ac-summary{display:flex;align-items:center;gap:8px;border:1px solid var(--hair);background:#fff;border-radius:10px;padding:9px 12px;color:var(--ink-muted);font-size:12.5px;white-space:nowrap}.ac-summary b{color:var(--ink)}' +
          '.ac-panel{background:#fff;border:1px solid var(--hair);border-radius:12px;box-shadow:0 1px 2px rgba(20,30,50,.03);overflow:visible}' +
          '.ac-filter{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--hair)}.ac-search-group,.ac-date-group{display:flex;align-items:center;min-width:0;height:34px;border:1px solid var(--ctl);border-radius:7px;background:#fff}.ac-search-group{width:360px;max-width:100%}.ac-search-group select,.ac-date-group select{height:32px;box-sizing:border-box;border:0;border-right:1px solid var(--hair);border-radius:7px 0 0 7px;background:#fff;color:var(--ink-body);font:inherit;font-size:12.5px;padding:0 9px;outline:0}.ac-search-group select{width:122px;flex:none}.ac-search{position:relative;flex:1;min-width:0}.ac-search input{width:100%;height:32px;box-sizing:border-box;border:0;background:transparent;color:var(--ink);font:inherit;font-size:12.5px;padding:0 31px 0 10px;outline:0}.ac-search svg{position:absolute;right:10px;top:9px;width:14px;height:14px;fill:none;stroke:var(--ink-muted);stroke-width:1.8;pointer-events:none}.ac-date-group{width:350px;max-width:100%}.ac-date-group select{width:94px;flex:none}.ac-date-group input{width:112px;min-width:0;height:32px;box-sizing:border-box;border:0;background:transparent;color:var(--ink);font:inherit;font-size:12px;padding:0 7px;outline:0}.ac-date-divider{color:var(--ink-muted);font-size:12px;white-space:nowrap}.ac-status-select{width:124px;height:34px;box-sizing:border-box;border:1px solid var(--ctl);border-radius:7px;background:#fff;color:var(--ink-body);font:inherit;font-size:12.5px;padding:0 9px;outline:0}.ac-reset{border:0;background:transparent;color:var(--brand);font:600 12.5px inherit;padding:7px 4px;cursor:pointer}.ac-search-group:focus-within,.ac-date-group:focus-within,.ac-status-select:focus{border-color:var(--brand);box-shadow:0 0 0 2px rgb(0 102 230 / 8%)}' +
          '.ac-table-wrap{overflow-x:auto}.ac-table{width:100%;border-collapse:collapse;min-width:760px}.ac-table th{text-align:left;background:var(--panel);color:var(--ink-muted);font-size:11.5px;font-weight:650;letter-spacing:.02em;padding:10px 18px;border-bottom:1px solid var(--hair)}.ac-table td{padding:15px 18px;border-bottom:1px solid var(--hair);vertical-align:top}.ac-table tr:last-child td{border-bottom:0}.ac-title{font-size:13.5px;font-weight:650;color:var(--ink);line-height:1.4}.ac-detail{font-size:12.5px;line-height:1.5;color:var(--ink-muted);margin-top:3px;max-width:560px}.ac-type{display:inline-flex;align-items:center;border-radius:5px;background:#f0f3f7;color:#546174;font-size:11.5px;font-weight:650;padding:4px 7px;white-space:nowrap}.ac-status{display:inline-flex;align-items:center;gap:5px;border-radius:999px;font-size:11.5px;font-weight:650;padding:4px 8px;white-space:nowrap}.ac-status:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}.ac-status.ok{color:#008051;background:#e8f5ee}.ac-status.blue{color:#1565c0;background:#eaf2fe}.ac-status.warn{color:#9c6500;background:#fff3d4}.ac-status.muted{color:#62708d;background:#eef1f5}.ac-time{color:var(--ink-muted);font-size:12.5px;white-space:nowrap}.ac-empty{padding:48px 20px;text-align:center;color:var(--ink-muted);font-size:13px}.ac-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:#fff}.ac-total{color:var(--ink-muted);font-size:12.5px}.ac-total b{color:var(--ink);font-weight:600}.ac-footer .pg{margin-left:auto}.ac-footer .pg-item{font:inherit;font-size:13px}.ac-footer .pg-size{font-size:12.5px}' +
          '@media(max-width:760px){.ac-head{display:block}.ac-summary{display:inline-flex;margin-top:14px}.ac-filter{align-items:stretch}.ac-search-group,.ac-date-group{width:100%;max-width:none}.ac-status-select{width:100%}.ac-date-group input{flex:1}.ac-reset{align-self:flex-start}.ac-footer{align-items:flex-start;flex-direction:column}.ac-footer .pg{margin-left:0;max-width:100%;gap:5px}.ac-footer .pg-item{min-width:30px}.ac-footer .pg-size{min-width:0}}' +
        '</style>' +
        '<div class="ac-head"><div><h1>Activity log</h1><p>Review the meaningful changes to this Shopify store: purchase flows, checkout pages, payment services, and orders.</p></div><div class="ac-summary">Showing <b data-count></b> events</div></div>' +
        '<section class="ac-panel">' +
          '<div class="ac-filter">' +
            '<div class="ac-search-group"><select id="ac-type" aria-label="' + esc(tr('Type')) + '"><option value="all">All activity</option><option value="Flow">Flow</option><option value="Page">Page</option><option value="Order">Order</option><option value="Payment">Payment</option><option value="Domain">Domain</option><option value="Store">Store</option></select><div class="ac-search"><input id="ac-search" type="search" autocomplete="off" placeholder="' + esc(tr('Search activity')) + '" /><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg></div></div>' +
            '<div class="ac-date-group"><select id="ac-time" aria-label="' + esc(tr('Event time')) + '"><option value="at">Event time</option></select><input id="ac-from" type="date" aria-label="' + esc(tr('From')) + '" /><span class="ac-date-divider">&rarr;</span><input id="ac-to" type="date" aria-label="' + esc(tr('To')) + '" /></div>' +
            '<select class="ac-status-select" id="ac-status" aria-label="' + esc(tr('Status')) + '"><option value="all">All statuses</option><option value="Completed">Completed</option><option value="Published">Published</option><option value="Draft">Draft</option><option value="Needs attention">Needs attention</option></select>' +
            '<button class="ac-reset" type="button" data-reset>Reset</button>' +
          '</div>' +
          '<div class="ac-table-wrap"><table class="ac-table"><thead><tr><th>Activity</th><th>Type</th><th>Status</th><th>Time</th></tr></thead><tbody data-rows></tbody></table></div>' +
          '<footer class="ac-footer"><span class="ac-total" data-total></span><div class="pg" data-pager></div></footer>' +
        '</section>' +
      '</div>';

    var typeSelect = root.querySelector('#ac-type');
    var statusSelect = root.querySelector('#ac-status');
    var searchInput = root.querySelector('#ac-search');
    var fromInput = root.querySelector('#ac-from');
    var toInput = root.querySelector('#ac-to');
    var rowsEl = root.querySelector('[data-rows]');
    var countEl = root.querySelector('[data-count]');
    var totalEl = root.querySelector('[data-total]');
    var pagerEl = root.querySelector('[data-pager]');

    if (window.I18N) window.I18N.apply(root);

    function activeRows() {
      var needle = query.trim().toLowerCase();
      return rows.filter(function (row) {
        var date = new Date(row.at);
        if (selectedType !== 'all' && row.type !== selectedType) return false;
        if (selectedStatus !== 'all' && row.status !== selectedStatus) return false;
        if (needle && [row.title, row.detail, row.type, row.status].join(' ').toLowerCase().indexOf(needle) < 0) return false;
        if (from && date < new Date(from + 'T00:00:00')) return false;
        if (to && date > new Date(to + 'T23:59:59')) return false;
        return true;
      });
    }

    function totalLabel(total) {
      if (window.I18N && window.I18N.lang === 'zh') return tr('Total') + total + tr('records');
      return 'Total ' + total + ' records';
    }

    function pageSizeLabel(size) {
      if (window.I18N && window.I18N.lang === 'zh') return tr('Per page') + ' ' + size + ' ' + tr('records');
      return size + ' / page';
    }

    function pagerHtml(pages) {
      var item = function (label, target, opts) {
        opts = opts || {};
        var cls = 'pg-item' + (opts.active ? ' active' : '') + (opts.disabled ? ' disabled' : '');
        return '<button type="button" class="' + cls + '"' + (opts.disabled ? ' disabled' : ' data-ac-page="' + target + '"') + '>' + label + '</button>';
      };
      var nums = '';
      for (var p = 1; p <= pages; p++) nums += item(String(p), p, { active: p === page });
      return item('&lsaquo;', page - 1, { disabled: page <= 1 }) + nums + item('&rsaquo;', page + 1, { disabled: page >= pages }) +
        '<select class="pg-size" data-ac-page-size aria-label="' + esc(tr('Per page')) + '">' + [20, 50, 100].map(function (size) {
          return '<option value="' + size + '"' + (size === pageSize ? ' selected' : '') + '>' + esc(pageSizeLabel(size)) + '</option>';
        }).join('') + '</select>';
    }

    function wirePager() {
      pagerEl.querySelectorAll('[data-ac-page]').forEach(function (button) { button.onclick = function () {
        page = Number(button.getAttribute('data-ac-page')); paint();
      }; });
      var sizeSelect = pagerEl.querySelector('[data-ac-page-size]');
      if (sizeSelect) sizeSelect.onchange = function () { pageSize = Number(sizeSelect.value); page = 1; paint(); };
    }

    function paint() {
      var visible = activeRows();
      var pages = Math.max(1, Math.ceil(visible.length / pageSize));
      if (page > pages) page = pages;
      var start = (page - 1) * pageSize;
      var pageRows = visible.slice(start, start + pageSize);
      countEl.textContent = visible.length;
      totalEl.innerHTML = totalLabel(visible.length);
      rowsEl.innerHTML = pageRows.length ? pageRows.map(function (row) {
        return '<tr><td><div class="ac-title">' + esc(row.title) + '</div><div class="ac-detail">' + esc(row.detail) + '</div></td><td><span class="ac-type">' + esc(row.type) + '</span></td><td><span class="ac-status ' + tone(row.status) + '">' + esc(row.status) + '</span></td><td class="ac-time">' + formatDate(row.at) + '</td></tr>';
      }).join('') : '<tr><td colspan="4"><div class="ac-empty">No activity matches these filters.</div></td></tr>';
      pagerEl.innerHTML = pagerHtml(pages);
      if (window.I18N) { window.I18N.apply(rowsEl); window.I18N.apply(pagerEl); }
      wirePager();
    }

    typeSelect.addEventListener('change', function () { selectedType = this.value; page = 1; paint(); });
    statusSelect.addEventListener('change', function () { selectedStatus = this.value; page = 1; paint(); });
    searchInput.addEventListener('input', function () { query = this.value; page = 1; paint(); });
    fromInput.addEventListener('change', function () { from = this.value; page = 1; paint(); });
    toInput.addEventListener('change', function () { to = this.value; page = 1; paint(); });
    root.querySelector('[data-reset]').addEventListener('click', function () {
      selectedType = 'all'; selectedStatus = 'all'; query = ''; from = ''; to = ''; page = 1;
      typeSelect.value = selectedType; statusSelect.value = selectedStatus; searchInput.value = ''; fromInput.value = ''; toInput.value = ''; paint();
    });
    paint();
  }

  window.VIEWS = window.VIEWS || {};
  window.VIEWS.activity = { render: render };
}());
