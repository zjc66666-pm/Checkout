/* BestShopio Admin · Bundles workspace (V1.143 rebuild).
   A bundle = a PDP purchase-area offer on a PARENT PRODUCT. Widget TEMPLATE drives
   both BOM shape and storefront rendering. NO subscription rules here — a Subscriptions
   plan picks this bundle's product; the discount lands in the shared offer engine.
   Routes: #/bundles · /new · /create/:tpl · /edit/:id */
(function () {
  const D = window.DATA_BUNDLES;
  let root;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => n == null || n === '' ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: (n % 1 ? 2 : 0), maximumFractionDigits: 2 });
  const svg = (p, w) => '<svg viewBox="0 0 24 24" width="' + (w || 16) + '" height="' + (w || 16) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const I = {
    back: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', 18),
    chev: svg('<path d="m9 18 6-6-6-6"/>', 16),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', 18),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 15),
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 15),
    trash: svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', 16),
    layers: svg('<path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>', 22),
    box: svg('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>', 22),
  };
  const toast = (msg) => { const t = document.createElement('div'); t.textContent = msg; t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#242833;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:200;box-shadow:var(--float-shadow)'; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };
  const card = (title, inner, right) => '<div class="panel card-pad mb-4"><div class="flex items-center justify-between mb-3"><div class="card-title">' + title + '</div>' + (right || '') + '</div>' + inner + '</div>';
  const label = (t) => '<div class="ctrl-label" style="text-transform:none;margin-bottom:6px">' + t + '</div>';

  const byId = (id) => D.bundles.find((b) => String(b.id) === String(id));
  const tplOf = (v) => D.templates.find((t) => t.value === v) || D.templates[0];
  const STATUS = { active: { label: 'Activated', cls: 'pill-green' }, draft: { label: 'Deactivated', cls: 'pill-gray' } };
  const parentName = (b) => String((b && b.parentProduct) || '').trim();
  function activeSiblingOf(bundle, nextStatus) {
    const parent = parentName(bundle);
    if (nextStatus !== 'active' || !parent) return null;
    const id = bundle && bundle.id != null ? String(bundle.id) : '';
    return D.bundles.find((b) => String(b.id) !== id && parentName(b) === parent && b.status === 'active') || null;
  }
  function deactivateActiveSiblings(bundle) {
    const parent = parentName(bundle);
    if (!parent) return;
    const id = bundle && bundle.id != null ? String(bundle.id) : '';
    D.bundles.forEach((b) => { if (String(b.id) !== id && parentName(b) === parent && b.status === 'active') b.status = 'draft'; });
  }
  function setBundleStatus(bundle, nextStatus) {
    if (!bundle) return;
    if (nextStatus === 'active') deactivateActiveSiblings(bundle);
    bundle.status = nextStatus;
  }
  function confirmReplaceActive(bundle, onOk) {
    const conflict = activeSiblingOf(bundle, bundle.status || 'active');
    if (!conflict) { onOk(); return; }
    window.UI.confirm({
      title: 'Replace current active Bundle?',
      content: parentName(bundle) + ' already has an active Bundle: ' + (conflict.name || conflict.id) + '. Activating ' + (bundle.name || 'this Bundle') + ' will deactivate the current active Bundle.',
      okText: 'Replace and activate',
      onOk: onOk,
    });
  }
  const pill = (m) => '<span class="pill ' + m.cls + '">' + esc(m.label) + '</span>';
  const IMG = (px) => '<span style="width:' + (px || 40) + 'px;height:' + (px || 40) + 'px;border-radius:6px;background:#e9ecf2;color:#9aa3b2;display:grid;place-items:center;font-size:9px;font-weight:600;flex:none">IMG</span>';
  // Placeholder product photos — deterministic per product name (same name -> same photo); swap for real product main images when wired to data.
  const PROD_IMGS = ['https://silixwear.com/cdn/shop/files/Dark-GRAY.jpg?v=1776154216&width=400', 'https://silixwear.com/cdn/shop/files/01_cf6e37ef-a0ab-4c82-ac61-c30d06d3111e.jpg?width=400', 'https://silixwear.com/cdn/shop/files/01_50091071-d25f-4060-9fce-acd28e12ce10.jpg?width=400', 'https://silixwear.com/cdn/shop/files/7_3bd5ccd0-0637-4559-b7be-1cd8196b15d4.jpg?width=400'];
  const prodImg = (name) => { var s = String(name || 'x'), h = 0, i = 0; for (; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PROD_IMGS[h % PROD_IMGS.length]; };
  // Resolve a component/parent to an image: chosen product's image, else a deterministic placeholder by name, else none.
  const compImg = (c) => (c && c.image) || (c && c.product ? prodImg(c.product) : '');
  const imgBox = (src, px) => '<span style="width:' + (px || 40) + 'px;height:' + (px || 40) + 'px;border-radius:6px;overflow:hidden;background:#e9ecf2;color:#9aa3b2;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;flex:none">' + (src ? '<img src="' + src + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.remove()" />' : 'IMG') + '</span>';
  // Request a Shopify-CDN image at a specific width so large render targets aren't fed thumbnail-res (picker stores width=120) and blurred up.
  const imgAt = (url, w) => { if (!url) return url; return /[?&]width=\d+/.test(url) ? url.replace(/width=\d+/, 'width=' + w) : url + (url.indexOf('?') >= 0 ? '&' : '?') + 'width=' + w; };
  // Ant-style number field: input + stacked ▲▼ steppers (native spinner hidden via .bn-num CSS).
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
  // Synthetic variant options for the preview (real PDP would list the product's actual variant titles).
  const VAR_COLORS = ['Grey', 'Black', 'Navy', 'Olive', 'Sand', 'Off-White'];
  const VAR_SIZES = ['S', 'M', 'L', 'XL'];
  const VAR_LENGTHS = ['Full Length', '7/8 Length', 'Cropped'];
  const variantList = (name, count) => {
    count = Math.max(1, count || 4);
    const out = [];
    for (let i = 0; i < count; i++) { const c = VAR_COLORS[i % VAR_COLORS.length]; out.push(count > VAR_COLORS.length ? c + ' / ' + VAR_SIZES[Math.floor(i / VAR_COLORS.length) % VAR_SIZES.length] : c); }
    return out;
  };
  // Synthetic labeled option groups for the preview. More SKUs ⇒ more option dimensions (Color → +Size → +Length).
  const variantGroups = (count) => { count = Math.max(1, count || 1); if (count <= 1) return []; const g = [{ name: 'Color', values: VAR_COLORS }]; if (count >= 3) g.push({ name: 'Size', values: VAR_SIZES }); if (count >= 5) g.push({ name: 'Length', values: VAR_LENGTHS }); return g; };

  // ---- badge combobox (focus shows recommended, also free type) ----
  function closeBadgePop() { document.querySelectorAll('.bn-badge-layer').forEach((l) => l.remove()); }
  function openBadgePop(input, onPick) {
    closeBadgePop();
    const layer = document.createElement('div'); layer.className = 'bn-badge-layer'; layer.style.cssText = 'position:fixed;inset:0;z-index:130';
    const pop = document.createElement('div'); pop.className = 'menu-pop'; pop.style.cssText = 'position:fixed;padding:6px;max-height:240px;overflow:auto;min-width:' + Math.max(input.offsetWidth, 170) + 'px';
    pop.innerHTML = '<div class="muted" style="padding:4px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Recommended</div>' +
      D.badges.map((b) => '<div class="opt" data-b="' + esc(b) + '" style="padding:8px 10px;cursor:pointer;border-radius:6px;font-size:13px">' + esc(b) + '</div>').join('');
    const r = input.getBoundingClientRect(); pop.style.top = (r.bottom + 4) + 'px'; pop.style.left = r.left + 'px';
    layer.appendChild(pop); document.body.appendChild(layer);
    pop.querySelectorAll('[data-b]').forEach((o) => o.onmousedown = (e) => { e.preventDefault(); input.value = o.getAttribute('data-b'); onPick(o.getAttribute('data-b')); closeBadgePop(); });
    layer.onmousedown = (e) => { if (e.target === layer) closeBadgePop(); };
  }

  // ---- preview variant dropdown ----
  function closeVarPop() { document.querySelectorAll('.bn-var-layer').forEach((l) => l.remove()); }
  function openVariantPop(anchor, opts, curIdx, onPick) {
    closeVarPop();
    const layer = document.createElement('div'); layer.className = 'bn-var-layer'; layer.style.cssText = 'position:fixed;inset:0;z-index:130';
    const pop = document.createElement('div'); pop.className = 'menu-pop'; pop.style.cssText = 'position:fixed;padding:6px;max-height:240px;overflow:auto;min-width:' + Math.max(anchor.offsetWidth, 150) + 'px';
    pop.innerHTML = opts.map((o, i) => '<div class="opt" data-vi="' + i + '" style="padding:8px 10px;cursor:pointer;border-radius:6px;font-size:13px' + (i === curIdx ? ';background:#eef2f8;font-weight:600' : '') + '">' + esc(o) + '</div>').join('');
    layer.appendChild(pop); document.body.appendChild(layer);
    const r = anchor.getBoundingClientRect(); const pw = pop.offsetWidth;
    let left = r.left; if (left + pw > window.innerWidth - 8) left = window.innerWidth - 8 - pw;
    pop.style.top = (r.bottom + 4) + 'px'; pop.style.left = Math.max(8, left) + 'px';
    pop.querySelectorAll('[data-vi]').forEach((o) => o.onmousedown = (e) => { e.preventDefault(); onPick(+o.getAttribute('data-vi')); closeVarPop(); });
    layer.onmousedown = (e) => { if (e.target === layer) closeVarPop(); };
  }

  // ================= LIST =================
  // Mirrors the Products / Orders list shell: keyword group + filters, select-all + row
  // checkboxes, bulk toolbar, an Action column header, and a paginated footer.
  let LST = { kw: '', kwApplied: '', kwType: 'name', tpl: '', status: '', page: 1, size: 20, sel: {} };
  const KW_FIELDS = [{ value: 'name', label: 'Bundle name' }, { value: 'parent', label: 'Parent product' }, { value: 'id', label: 'Bundle ID' }];

  function listRows() {
    let rows = D.bundles.slice();
    if (LST.kwApplied) {
      const q = LST.kwApplied.toLowerCase();
      rows = rows.filter((b) => {
        if (LST.kwType === 'parent') return (b.parentProduct || '').toLowerCase().indexOf(q) >= 0;
        if (LST.kwType === 'id') return String(b.id).toLowerCase().indexOf(q) >= 0;
        return (b.name || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    if (LST.tpl) rows = rows.filter((b) => b.template === LST.tpl);
    if (LST.status) rows = rows.filter((b) => b.status === LST.status);
    return rows;
  }

  function pagerHtml(page, pages) {
    const item = (label, p, opts) => {
      opts = opts || {};
      return '<span class="pg-item' + (opts.active ? ' active' : '') + (opts.disabled ? ' disabled' : '') + '"' + (opts.disabled ? '' : ' data-page="' + p + '"') + '>' + label + '</span>';
    };
    let nums = '';
    for (let p = 1; p <= pages; p++) nums += item(String(p), p, { active: p === page });
    return '<div class="pg">' + item('‹', page - 1, { disabled: page <= 1 }) + nums + item('›', page + 1, { disabled: page >= pages }) +
      '<select class="pg-size" id="bn-pgsize">' + ['20', '50', '100'].map((s) => '<option value="' + s + '"' + (Number(s) === LST.size ? ' selected' : '') + '>' + s + ' / page</option>').join('') + '</select></div>';
  }

  function renderList() {
    if (!D.bundles.length) return renderEmpty();
    const all = listRows();
    const total = all.length;
    const pages = Math.max(1, Math.ceil(total / LST.size));
    if (LST.page > pages) LST.page = pages;
    const pageRows = all.slice((LST.page - 1) * LST.size, (LST.page - 1) * LST.size + LST.size);

    const kwOpts = KW_FIELDS.map((o) => '<option value="' + o.value + '"' + (LST.kwType === o.value ? ' selected' : '') + '>' + o.label + '</option>').join('');
    const tplOpts = '<option value="">All templates</option>' + D.templates.map((t) => '<option value="' + t.value + '"' + (LST.tpl === t.value ? ' selected' : '') + '>' + esc(t.label) + '</option>').join('');
    const statusOpts = '<option value="">All status</option><option value="active"' + (LST.status === 'active' ? ' selected' : '') + '>Activated</option><option value="draft"' + (LST.status === 'draft' ? ' selected' : '') + '>Deactivated</option>';
    const searchIco = svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', 16);

    const tags = [];
    if (LST.kwApplied) tags.push('<span class="field-pill" data-clear="kw">' + esc((KW_FIELDS.find((o) => o.value === LST.kwType) || {}).label || '') + ': ' + esc(LST.kwApplied) + ' <span class="x">&times;</span></span>');
    if (LST.tpl) tags.push('<span class="field-pill" data-clear="tpl">Template: ' + esc(tplOf(LST.tpl).label) + ' <span class="x">&times;</span></span>');
    if (LST.status) tags.push('<span class="field-pill" data-clear="status">Status: ' + (LST.status === 'active' ? 'Activated' : 'Deactivated') + ' <span class="x">&times;</span></span>');

    const selCount = Object.keys(LST.sel).filter((k) => LST.sel[k]).length;
    const allOnPageSel = pageRows.length > 0 && pageRows.every((b) => LST.sel[b.id]);

    const rows = pageRows.map((b) =>
      '<tr data-id="' + b.id + '" style="cursor:pointer">' +
        '<td data-stop><input type="checkbox" class="bn-rowsel" data-id="' + b.id + '" ' + (LST.sel[b.id] ? 'checked' : '') + ' style="width:15px;height:15px;accent-color:var(--brand);cursor:pointer" /></td>' +
        '<td><div style="font-weight:600;color:var(--ink)">' + esc(b.name) + '</div><div class="muted" style="font-size:12px">' + esc(b.id) + '</div></td>' +
        '<td>' + esc(b.parentProduct) + '</td>' +
        '<td><span class="pill pill-blue">' + esc(tplOf(b.template).label) + '</span></td>' +
        '<td>' + pill(STATUS[b.status]) + '</td>' +
        '<td class="num">' + b.orders + '</td>' +
        '<td style="text-align:center" data-stop><button class="back-btn bn-view" data-view="' + b.id + '" title="View" style="width:30px;height:30px;color:var(--ink-muted)">' + I.eye + '</button></td>' +
      '</tr>').join('');

    root.innerHTML =
      '<div class="flex items-center justify-between mb-4"><h1 class="page-title">Bundles</h1>' +
        '<a class="btn btn-primary" href="#/bundles/new">Add bundle</a></div>' +
      '<div class="panel">' +
        '<div class="card-pad" style="padding-bottom:8px"><div class="flex items-start gap-2" style="flex-wrap:wrap">' +
          '<div class="flex" style="min-width:340px"><select class="filter-select" id="bn-kwtype" style="width:150px;border-top-right-radius:0;border-bottom-right-radius:0">' + kwOpts + '</select>' +
            '<div style="position:relative;flex:1"><input class="filter-input" id="bn-kw" placeholder="Search" value="' + esc(LST.kw) + '" style="width:100%;padding-left:12px;padding-right:32px;border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px" /><span style="position:absolute;right:10px;top:9px;color:var(--ink-muted)">' + searchIco + '</span></div></div>' +
          '<select class="filter-select" id="bn-tplf" style="width:200px">' + tplOpts + '</select>' +
          '<select class="filter-select" id="bn-statusf" style="width:150px">' + statusOpts + '</select>' +
        '</div>' + (tags.length ? '<div class="flex gap-2 mt-3" style="flex-wrap:wrap" id="bn-tags">' + tags.join('') + '</div>' : '') + '</div>' +
        '<div style="overflow-x:auto"><table class="tbl" style="min-width:1040px">' +
          // Shopify pattern: when rows are selected the header row itself becomes the bulk-action bar.
          '<thead>' + (selCount > 0
            ? '<tr class="tbl-bulk"><th style="width:38px"><input type="checkbox" id="bn-selall" checked style="width:15px;height:15px;accent-color:var(--brand);cursor:pointer" /></th>' +
                '<th colspan="6" style="font-weight:500"><div class="flex items-center gap-3">' +
                  '<span style="font-weight:600;color:var(--ink)">' + selCount + ' selected</span>' +
                  '<button class="btn btn-default" style="height:28px" data-bulk="activate">Activate</button>' +
                  '<button class="btn btn-default" style="height:28px" data-bulk="draft">Deactivate</button>' +
                  '<button class="btn btn-default" style="height:28px;color:var(--err);border-color:#f3c4ba" data-bulk="delete">Delete</button>' +
                '</div></th></tr>'
            : '<tr><th style="width:38px"><input type="checkbox" id="bn-selall" ' + (allOnPageSel ? 'checked' : '') + ' style="width:15px;height:15px;accent-color:var(--brand);cursor:pointer" /></th>' +
                '<th>Bundle</th><th style="width:240px">Parent product</th><th style="width:200px">Template</th><th style="width:110px">Status</th><th class="num" style="width:90px">Orders</th><th style="width:80px;text-align:center">Action</th></tr>') +
          '</thead>' +
          '<tbody id="bn-tbody">' + (pageRows.length ? rows : '<tr><td colspan="7" style="text-align:center;padding:40px" class="muted">No bundles match these filters.</td></tr>') + '</tbody>' +
        '</table></div>' +
        '<div class="flex items-center justify-between card-pad"><span class="muted" style="font-size:13px">Total ' + total + ' records</span>' + pagerHtml(LST.page, pages) + '</div>' +
      '</div>';
    wireList();
  }

  function wireList() {
    const kwType = root.querySelector('#bn-kwtype'); if (kwType) kwType.onchange = () => { LST.kwType = kwType.value; if (LST.kwApplied) { LST.page = 1; renderList(); } };
    const kw = root.querySelector('#bn-kw');
    if (kw) { kw.oninput = () => { LST.kw = kw.value; }; const commit = () => { LST.kwApplied = (LST.kw || '').trim(); LST.page = 1; renderList(); }; kw.onkeydown = (e) => { if (e.key === 'Enter') kw.blur(); }; kw.onblur = commit; }
    const tplf = root.querySelector('#bn-tplf'); if (tplf) tplf.onchange = () => { LST.tpl = tplf.value; LST.page = 1; renderList(); };
    const stf = root.querySelector('#bn-statusf'); if (stf) stf.onchange = () => { LST.status = stf.value; LST.page = 1; renderList(); };
    root.querySelectorAll('#bn-tags [data-clear]').forEach((tg) => tg.onclick = () => { const k = tg.getAttribute('data-clear'); if (k === 'kw') { LST.kw = ''; LST.kwApplied = ''; } if (k === 'tpl') LST.tpl = ''; if (k === 'status') LST.status = ''; LST.page = 1; renderList(); });
    const ps = root.querySelector('#bn-pgsize'); if (ps) ps.onchange = () => { LST.size = Number(ps.value); LST.page = 1; renderList(); };
    root.querySelectorAll('.pg-item[data-page]').forEach((el) => el.onclick = () => { LST.page = Number(el.getAttribute('data-page')); renderList(); });
    const selAll = root.querySelector('#bn-selall');
    if (selAll) {
      const pageIds = listRows().slice((LST.page - 1) * LST.size, (LST.page - 1) * LST.size + LST.size).map((b) => b.id);
      const selN = pageIds.filter((id) => LST.sel[id]).length;
      selAll.indeterminate = selN > 0 && selN < pageIds.length;
      selAll.onchange = () => { pageIds.forEach((id) => { if (selAll.checked) LST.sel[id] = true; else delete LST.sel[id]; }); renderList(); };
    }
    root.querySelectorAll('.bn-rowsel').forEach((c) => c.onchange = (e) => { e.stopPropagation(); const id = c.getAttribute('data-id'); if (c.checked) LST.sel[id] = true; else delete LST.sel[id]; renderList(); });
    root.querySelectorAll('[data-bulk]').forEach((btn) => btn.onclick = () => {
      const act = btn.getAttribute('data-bulk');
      const ids = Object.keys(LST.sel).filter((k) => LST.sel[k]);
      if (!ids.length) return;
      if (act === 'delete') {
        window.UI.confirm({ title: 'Delete bundles', content: 'Delete ' + ids.length + ' bundle' + (ids.length > 1 ? 's' : '') + '? This can\'t be undone.', okText: 'Delete', danger: true, onOk: () => { D.bundles = D.bundles.filter((b) => ids.indexOf(String(b.id)) < 0); LST.sel = {}; toast('Deleted successfully'); renderList(); } });
        return;
      }
      const selected = ids.map((id) => byId(id)).filter(Boolean);
      if (act !== 'activate') {
        selected.forEach((b) => { b.status = 'draft'; });
        LST.sel = {}; toast('Deactivated'); renderList();
        return;
      }
      const seenParents = {};
      const duplicateParent = selected.find((b) => { const p = parentName(b); if (!p) return false; if (seenParents[p]) return true; seenParents[p] = true; return false; });
      if (duplicateParent) return toast('Only one Bundle can be activated per parent product');
      const conflicts = selected.map((b) => activeSiblingOf(b, 'active')).filter(Boolean);
      const applyActivate = () => { selected.forEach((b) => setBundleStatus(b, 'active')); LST.sel = {}; toast('Activated'); renderList(); };
      if (conflicts.length) {
        window.UI.confirm({
          title: 'Replace current active Bundle?',
          content: conflicts.length + ' parent product' + (conflicts.length > 1 ? 's already have' : ' already has') + ' an active Bundle. Activating the selected Bundle' + (selected.length > 1 ? 's' : '') + ' will deactivate the current active Bundle for each affected product.',
          okText: 'Replace and activate',
          onOk: applyActivate,
        });
        return;
      }
      applyActivate();
    });
    root.querySelectorAll('#bn-tbody tr[data-id]').forEach((tr) => tr.onclick = (e) => { if (e.target.closest('[data-stop]')) return; location.hash = '#/bundles/edit/' + tr.getAttribute('data-id'); });
    root.querySelectorAll('.bn-view').forEach((el) => el.onclick = (e) => { e.stopPropagation(); location.hash = '#/bundles/edit/' + el.getAttribute('data-view'); });
  }
  function renderEmpty() {
    root.innerHTML = '<div class="flex items-center justify-between mb-4"><h1 class="page-title">Bundles</h1></div>' +
      '<div class="panel placeholder" style="min-height:300px"><div style="text-align:center"><div style="font-weight:600;margin-bottom:6px;color:var(--ink)">Sell more per order with bundles</div>' +
      '<div class="muted" style="margin-bottom:16px">A PDP purchase-area offer: quantity tiers, A+B sets, or build-a-box.</div>' +
      '<a class="btn btn-primary" href="#/bundles/new">Add bundle</a></div></div>';
  }

  // ================= TEMPLATE PICKER =================
  function renderTemplatePicker() {
    // Static storefront-preview thumbnails so merchants see at a glance what each type looks like.
    const TPL_ART = {
      volume: '<svg viewBox="0 0 260 158" fill="none" font-family="system-ui,-apple-system,sans-serif"><rect x="20" y="8" width="220" height="32" rx="8" fill="#fff" stroke="#e3e7ee"/><circle cx="38" cy="24" r="6" fill="none" stroke="#cdd3dd" stroke-width="2"/><text x="54" y="29" font-size="13" fill="#6b7280">1 pack</text><text x="224" y="29" font-size="13" font-weight="700" fill="#9aa3b2" text-anchor="end">$34</text><rect x="20" y="48" width="220" height="58" rx="8" stroke-width="2" style="fill:var(--brand-50);stroke:var(--brand)"/><circle cx="38" cy="68" r="6" fill="none" stroke-width="2" style="stroke:var(--brand)"/><circle cx="38" cy="68" r="2.8" style="fill:var(--brand)"/><text x="54" y="65" font-size="13" font-weight="700" style="fill:var(--brand)">2 packs</text><text x="54" y="80" font-size="10.5" fill="#9aa3b2">Save 20%</text><text x="224" y="73" font-size="14" font-weight="700" style="fill:var(--brand)" text-anchor="end">$49</text><rect x="32" y="87" width="138" height="13" rx="6.5" style="fill:var(--brand)"/><text x="39" y="96.5" font-size="8.5" font-weight="700" fill="#fff">+ FREE GIFT</text><rect x="146" y="41" width="66" height="15" rx="7.5" style="fill:var(--brand)"/><text x="179" y="52" font-size="8.5" font-weight="700" fill="#fff" text-anchor="middle">POPULAR</text><rect x="20" y="114" width="220" height="32" rx="8" fill="#fff" stroke="#e3e7ee"/><circle cx="38" cy="130" r="6" fill="none" stroke="#cdd3dd" stroke-width="2"/><text x="54" y="135" font-size="13" fill="#6b7280">3 packs</text><text x="224" y="135" font-size="13" font-weight="700" fill="#9aa3b2" text-anchor="end">$60</text></svg>',
      ab: '<svg viewBox="0 0 260 150" fill="none" font-family="system-ui,-apple-system,sans-serif"><rect x="26" y="14" width="80" height="62" rx="10" fill="#eaf1ff" stroke="#d3e2ff"/><text x="66" y="53" font-size="26" font-weight="700" fill="#8fb0ec" text-anchor="middle">A</text><circle cx="130" cy="45" r="15" fill="#fff" stroke-width="2.4" style="stroke:var(--brand)"/><path d="M130 38v14M123 45h14" stroke-width="2.6" stroke-linecap="round" style="stroke:var(--brand)"/><rect x="154" y="14" width="80" height="62" rx="10" fill="#fdeee6" stroke="#f7d9c8"/><text x="194" y="53" font-size="26" font-weight="700" fill="#e0a880" text-anchor="middle">B</text><rect x="26" y="96" width="208" height="38" rx="9" style="fill:var(--brand)"/><text x="130" y="120" font-size="13.5" font-weight="700" fill="#fff" text-anchor="middle">Buy A + B together</text></svg>',
      fbt: '<svg viewBox="0 0 260 150" fill="none" font-family="system-ui,-apple-system,sans-serif"><rect x="20" y="12" width="220" height="40" rx="8" fill="#fff" stroke="#e3e7ee"/><rect x="30" y="20" width="24" height="24" rx="5" fill="#eaf1ff"/><text x="64" y="30" font-size="12" font-weight="600" fill="#5b6470">This item</text><text x="64" y="44" font-size="10.5" fill="#9aa3b2">Main product</text><rect x="20" y="60" width="220" height="32" rx="8" fill="#fff" stroke="#e3e7ee"/><rect x="30" y="68" width="16" height="16" rx="4" style="fill:var(--brand)"/><path d="M34 76l3 3 5-6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="54" y="66" width="20" height="20" rx="4" fill="#fdeee6"/><text x="82" y="80" font-size="12" fill="#5b6470">Add-on</text><text x="230" y="80" font-size="12" font-weight="700" fill="#9aa3b2" text-anchor="end">+ $12</text><rect x="20" y="100" width="220" height="32" rx="8" fill="#fff" stroke="#e3e7ee"/><rect x="30" y="108" width="16" height="16" rx="4" style="fill:var(--brand)"/><path d="M34 116l3 3 5-6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="54" y="106" width="20" height="20" rx="4" fill="#eafaf0"/><text x="82" y="120" font-size="12" fill="#5b6470">Add-on</text><text x="230" y="120" font-size="12" font-weight="700" fill="#9aa3b2" text-anchor="end">+ $9</text></svg>',
      box: '<svg viewBox="0 0 260 150" fill="none" font-family="system-ui,-apple-system,sans-serif"><text x="20" y="24" font-size="14" font-weight="700" fill="#5b6470">Build your box</text><text x="20" y="40" font-size="11" fill="#9aa3b2">Pick any 4 items</text><rect x="20" y="52" width="64" height="40" rx="8" fill="#eef0f5" stroke-width="2" style="stroke:var(--brand)"/><rect x="98" y="52" width="64" height="40" rx="8" fill="#eef0f5" stroke="#e3e7ee"/><rect x="176" y="52" width="64" height="40" rx="8" fill="#eef0f5" stroke-width="2" style="stroke:var(--brand)"/><rect x="20" y="100" width="64" height="40" rx="8" fill="#eef0f5" stroke-width="2" style="stroke:var(--brand)"/><rect x="98" y="100" width="64" height="40" rx="8" fill="#eef0f5" stroke="#e3e7ee"/><rect x="176" y="100" width="64" height="40" rx="8" fill="#eef0f5" stroke-width="2" style="stroke:var(--brand)"/><circle cx="76" cy="60" r="7" style="fill:var(--brand)"/><path d="M73 60l2.2 2.2 4-4.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="232" cy="60" r="7" style="fill:var(--brand)"/><path d="M229 60l2.2 2.2 4-4.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="76" cy="108" r="7" style="fill:var(--brand)"/><path d="M73 108l2.2 2.2 4-4.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="232" cy="108" r="7" style="fill:var(--brand)"/><path d="M229 108l2.2 2.2 4-4.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
    const cardHtml = (t) =>
      '<div class="panel" data-pick="' + t.value + '" style="padding:0;cursor:pointer;overflow:hidden">' +
        '<div style="background:#f5f6fa;border-bottom:1px solid var(--hair);padding:14px 16px">' + (TPL_ART[t.value] || '') + '</div>' +
        '<div style="padding:16px 18px">' +
          '<div style="font-size:15px;font-weight:600;color:var(--ink)">' + esc(t.label) + '</div>' +
          '<div class="muted" style="font-size:12.5px;margin-top:5px;line-height:1.5">' + esc(t.desc) + '</div>' +
        '</div>' +
      '</div>';
    root.innerHTML =
      '<div style="max-width:1040px;margin:0 auto">' +
        '<div class="flex items-center gap-2 mb-6"><a class="back-btn" href="#/bundles" title="Back">' + I.back + '</a><span class="page-title">Choose a bundle type</span></div>' +
        '<div class="muted" style="margin-bottom:16px">The template decides how it looks on the product page and how its tiers are built.</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" id="bn-pick">' + D.templates.map(cardHtml).join('') + '</div>' +
      '</div>';
    root.querySelectorAll('#bn-pick [data-pick]').forEach((c) => c.onclick = () => { location.hash = '#/bundles/create/' + c.getAttribute('data-pick'); });
  }

  // ================= EDITOR =================
  let EDIT = null, EDIT_ID = null, previewSel = 0, EDIT_ORIGIN = null, previewVar = {};
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const snapshot = () => JSON.stringify(EDIT);
  const syncUnsaved = () => { if (window.UI && window.UI.setUnsavedBar) window.UI.setUnsavedBar(root, EDIT_ORIGIN !== null && snapshot() !== EDIT_ORIGIN); };

  function renderEditor(bundle, tpl) {
    const t = (bundle && bundle.template) || tpl || 'volume';
    const s = D.samples[t] || D.samples.volume;
    EDIT_ID = bundle ? bundle.id : null;
    EDIT = clone(s);
    EDIT.template = t;
    EDIT.name = bundle ? bundle.name : '';
    EDIT.status = bundle ? bundle.status : 'active';
    if (!bundle) { EDIT.parentProduct = ''; (EDIT.tiers || []).forEach((t2) => { t2.components = (t2.components || []).filter((c) => c.role !== 'gift'); const fm = (t2.components || []).find((c) => c.role === 'main'); if (fm) fm.product = ''; }); } // new bundle starts clean: no parent product, no gifts (merchant adds gifts via "Add gift")
    if (EDIT.defaultTier == null) EDIT.defaultTier = Math.min(1, ((EDIT.tiers || []).length || 1) - 1);
    if (EDIT.defaultTier > (EDIT.tiers || []).length - 1) EDIT.defaultTier = Math.max(0, (EDIT.tiers || []).length - 1);
    previewSel = EDIT.defaultTier;
    previewVar = {};
    EDIT_ORIGIN = snapshot();
    paintEditor(!!bundle);
  }

  function paintEditor(isEdit) {
    const t = EDIT.template;
    const isBox = t === 'box';
    const tplOpts = D.templates.map((x) => '<option value="' + x.value + '"' + (x.value === t ? ' selected' : '') + '>' + esc(x.label) + '</option>').join('');
    const alignOpts = ['left', 'center', 'right'].map((a) => '<option value="' + a + '"' + (EDIT.header.align === a ? ' selected' : '') + '>' + a.charAt(0).toUpperCase() + a.slice(1) + '</option>').join('');

    const targetCard = card('Parent product',
      '<div style="display:flex;align-items:center;gap:12px;border:1px solid var(--hair);border-radius:8px;padding:12px">' + imgBox(compImg({ image: EDIT.parentImage, product: EDIT.parentProduct }), 40) +
        '<div style="flex:1;min-width:0"><div style="font-size:13.5px;color:var(--ink);font-weight:500">' + (esc(EDIT.parentProduct) || '<span class="muted">No product selected</span>') + '</div>' +
        '<div class="muted" style="font-size:12px">This bundle appears on this product\'s page.</div></div>' +
        '<button class="btn btn-default" data-act="pick-parent">' + ((EDIT.parentProduct || '').trim() ? 'Change' : 'Add product') + '</button></div>');

    const displayCard = card('Display settings & template',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
        '<div>' + label('Widget template') + '<select class="input" id="bn-tpl">' + tplOpts + '</select></div>' +
        '<div>' + label('Brand color') + '<div style="display:flex;align-items:center;gap:8px"><input type="color" id="bn-color" value="' + esc(EDIT.brandColor) + '" style="width:44px;height:34px;border:1px solid var(--ctl);border-radius:6px;background:none;padding:2px;cursor:pointer" /><span class="muted" style="font-size:12.5px">' + esc(EDIT.brandColor) + '</span></div></div>' +
      '</div>');

    const headerCard = card('Bundle configuration',
      '<div style="display:grid;grid-template-columns:2fr 1fr;gap:14px">' +
        '<div>' + label('Header text') + '<input class="input" id="bn-htext" value="' + esc(EDIT.header.text) + '" /></div>' +
        '<div>' + label('Alignment') + '<select class="input" id="bn-halign">' + alignOpts + '</select></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;align-items:start">' +
        '<div>' + label('Header line') +
          '<label class="flex items-center gap-2" style="cursor:pointer;font-size:13.5px;color:var(--ink)"><input type="checkbox" id="bn-hline"' + (EDIT.header.line ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:var(--brand)" /> Add a line to the header title</label>' +
        '</div>' +
        (EDIT.header.line
          ? '<div>' + label('Line thickness') +
              '<div class="flex items-center gap-3"><input type="range" id="bn-hthick" min="1" max="10" step="1" value="' + (EDIT.header.thickness || 2) + '" style="flex:1;accent-color:var(--brand)" /><span id="bn-hthick-val" style="font-size:13px;color:var(--ink);width:42px;text-align:right">' + (EDIT.header.thickness || 2) + ' px</span></div>' +
            '</div>'
          : '<div></div>') +
      '</div>');

    const body = isBox ? boxBody() : tiersBody();

    root.innerHTML =
      (window.UI && window.UI.unsavedBar ? window.UI.unsavedBar({ saveLabel: isEdit ? 'Save' : 'Add', saveAct: 'save', discardAct: 'discard-bar' }) : '') +
      '<div class="detail-wrap">' +
        '<div class="flex items-center gap-2 mb-6">' +
          '<a class="back-btn" href="#/bundles" title="Back">' + I.back + '</a><span class="page-title">' + (isEdit ? esc(EDIT.name || 'Bundle') : 'Add bundle') + '</span>' + (isEdit ? ' ' + pill(STATUS[EDIT.status]) : '') +
        '</div>' +
        '<div class="detail-cols" style="max-width:1220px"><div class="detail-main">' +
          card('Bundle name', '<input class="input" id="bn-name" value="' + esc(EDIT.name) + '" placeholder="e.g. Focus Gum — Multipack" />') +
          targetCard + displayCard + headerCard + body +
          '<div class="flex items-center justify-end gap-2" style="margin-top:20px">' + (isEdit ? '<button class="btn btn-default" data-act="delete" style="color:var(--err);border-color:#f3c4ba">Delete</button>' : '') + '<button class="btn btn-primary" data-act="save">' + (isEdit ? 'Save' : 'Add bundle') + '</button></div>' +
        '</div><div class="detail-rail" style="width:400px;flex:0 0 400px">' +
          '<div style="position:sticky;top:16px">' +
            card('Status', '<div style="display:flex;flex-direction:column;gap:11px;padding:2px 0">' +
              '<label class="flex items-center gap-2" style="cursor:pointer;font-size:13.5px;color:var(--ink)"><input type="radio" name="bn-status" class="bn-statusr" value="active"' + (EDIT.status === 'active' ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:var(--brand);cursor:pointer" /> Activated</label>' +
              '<label class="flex items-center gap-2" style="cursor:pointer;font-size:13.5px;color:var(--ink)"><input type="radio" name="bn-status" class="bn-statusr" value="draft"' + (EDIT.status === 'draft' ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:var(--brand);cursor:pointer" /> Deactivated</label>' +
              '<div class="muted" style="font-size:12px;line-height:1.45;padding-top:2px">One parent product can have only one active Bundle. Draft/deactivated Bundles can be kept.</div>' +
            '</div>') +
            card('Preview', '<div id="bn-preview">' + previewInner() + '</div>') +
          '</div>' +
        '</div></div>' +
      '</div>';
    wireEditor(isEdit);
  }

  // ---- tiers body (volume / ab / fbt) ----
  function tiersBody() {
    return card('Tiers', '<div id="bn-tiers">' + EDIT.tiers.map(tierCard).join('') + '</div>' +
      '<button class="btn btn-default" data-act="add-tier">' + I.plus + ' Add tier</button>');
  }
  function tierCard(t, i) {
    const isVolume = EDIT.template === 'volume';
    const tierSelectable = (EDIT.template === 'volume' || EDIT.template === 'ab') && EDIT.tiers.length > 1;
    const defaultCtrl = tierSelectable ? '<label class="flex items-center gap-1" style="cursor:pointer;font-size:12.5px;color:var(--ink-body)" title="Pre-selected on the product page"><input type="radio" name="bn-default" class="bn-default" data-i="' + i + '"' + (EDIT.defaultTier === i ? ' checked' : '') + ' style="width:14px;height:14px;accent-color:var(--brand);cursor:pointer" /> Default selection</label>' : '';
    const head = '<div class="flex items-center justify-between mb-3"><div style="font-weight:600;color:var(--ink);font-size:13.5px">Tier ' + (i + 1) + '</div>' +
      '<div class="flex items-center gap-3">' + defaultCtrl +
      (i > 0 ? '<button class="back-btn" data-rmtier="' + i + '" title="Remove" style="width:28px;height:28px;color:var(--ink-muted)">' + I.x + '</button>' : '') +
      '</div></div>';
    const qtyRow = isVolume ? '<div>' + label('Buy qty') + numInput('bn-f', 'data-i="' + i + '" data-k="qty"', t.qty, { min: 1 }) + '</div>' : '';
    const fields =
      '<div style="display:grid;grid-template-columns:' + (isVolume ? 'repeat(3,1fr)' : '1fr 1fr') + ';gap:12px">' +
        qtyRow +
        '<div>' + label('Title') + '<input class="input bn-f" data-i="' + i + '" data-k="title" value="' + esc(t.title) + '" placeholder="e.g. 2 PCS" /></div>' +
        '<div>' + label('Title tag') + '<input class="input bn-tag" data-i="' + i + '" value="' + esc(t.tag) + '" placeholder="e.g. 50% OFF" /></div>' +
        '<div>' + label('Subtitle') + '<input class="input bn-f" data-i="' + i + '" data-k="subtitle" value="' + esc(t.subtitle) + '" placeholder="optional" /></div>' +
        '<div>' + label('Price') + numInput('bn-f', 'data-i="' + i + '" data-k="price"', (t.price == null ? '' : t.price), { min: 0, step: '0.01' }) + '</div>' +
        '<div>' + label('Compare-at') + numInput('bn-f', 'data-i="' + i + '" data-k="compareAt"', (t.compareAt == null ? '' : t.compareAt), { min: 0, step: '0.01' }) + '</div>' +
        '<div>' + label('Corner badge') + '<input class="input bn-badge" data-i="' + i + '" value="' + esc(t.badge) + '" placeholder="Pick or type" autocomplete="off" /></div>' +
      '</div>';
    const comps = '<div class="ctrl-label" style="text-transform:none;margin:14px 0 8px">Components (BOM)</div>' +
      t.components.map((c, ci) => componentRow(c, i, ci)).join('') +
      '<div class="flex gap-2 mt-1">' +
        (EDIT.template !== 'volume' ? '<button class="btn btn-default" data-addcomp="main:' + i + '">' + I.plus + ' Add main product</button>' : '') +
        '<button class="btn btn-default" data-addcomp="gift:' + i + '">' + I.plus + ' Add gift</button>' +
      '</div>';
    return '<div class="panel card-pad mb-3" style="background:var(--panel)">' + head + fields + comps + '</div>';
  }
  function componentRow(c, ti, ci) {
    const firstMainCi = EDIT.tiers[ti].components.findIndex((x) => x.role === 'main');
    const isParentMain = c.role === 'main' && ci === firstMainCi; // the tier's anchor = the Parent product above
    const isVolumeMain = EDIT.template === 'volume' && c.role === 'main';
    const roleTag = c.role === 'main'
      ? '<span style="font-size:10px;font-weight:700;color:var(--brand);background:var(--brand-50);border-radius:3px;padding:1px 6px">MAIN</span>'
      : '<span style="font-size:10px;font-weight:700;color:#c2620f;background:#fff2e6;border-radius:3px;padding:1px 6px">GIFT</span>';
    const qtyCell = isVolumeMain
      ? '<span class="muted" style="font-size:12.5px;white-space:nowrap">× <b style="color:var(--ink)" data-mainqty="' + ti + '">' + (EDIT.tiers[ti].qty) + '</b></span>'
      : numInput('bn-cq', 'data-i="' + ti + '" data-ci="' + ci + '"', c.qty, { min: 1, w: '78px' });
    // The parent main follows the Parent product above — it is never swapped or removed per-tier.
    const canRemove = !isParentMain && (c.role === 'gift' || (c.role === 'main' && EDIT.tiers[ti].components.filter((x) => x.role === 'main').length > 1));
    const hint = isParentMain ? ' <span class="muted" style="font-size:11px">&middot; follows Parent product</span>' : '';
    const changeBtn = isParentMain ? '' : '<button class="back-btn bn-cp" data-i="' + ti + '" data-ci="' + ci + '" title="Change product" style="width:30px;height:30px;color:var(--ink-muted)">' + I.layers + '</button>';
    return '<div class="flex items-center gap-3" style="border:1px solid var(--hair);border-radius:8px;padding:10px;margin-bottom:8px;background:#fff">' +
      imgBox(compImg(c), 34) +
      '<div style="flex:1;min-width:0">' + roleTag + ' <span style="font-size:13px;color:var(--ink)">' + (esc(c.product) || '<span class="muted">No product</span>') + '</span>' + hint +
        '<input class="input bn-cn" data-i="' + ti + '" data-ci="' + ci + '" value="' + esc(c.displayName) + '" placeholder="Display name (optional)" style="height:30px;margin-top:6px;font-size:12.5px" /></div>' +
      qtyCell +
      changeBtn +
      (canRemove ? '<button class="back-btn bn-cr" data-i="' + ti + '" data-ci="' + ci + '" title="Remove" style="width:30px;height:30px;color:var(--ink-muted)">' + I.trash + '</button>' : '') +
    '</div>';
  }

  // ---- box body ----
  function boxBody() {
    const modeOpts = D.pricingModes.map((m) => '<option value="' + m.value + '"' + (EDIT.pricingMode === m.value ? ' selected' : '') + '>' + m.label + '</option>').join('');
    const valLabel = EDIT.pricingMode === 'percent' ? 'Percent off (%)' : EDIT.pricingMode === 'fixed' ? 'Box price ($)' : 'Per-item adjustment';
    const chips = (EDIT.pool || []).length
      ? EDIT.pool.map((p, i) => '<span class="pill pill-gray" style="padding:4px 8px 4px 12px">' + esc(p) + ' <button data-rmpool="' + i + '" style="border:0;background:none;cursor:pointer;color:var(--ink-muted);padding:0 2px">&times;</button></span>').join(' ')
      : '<span class="muted" style="font-size:13px">No products in the pool yet.</span>';
    return card('Product pool', '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">' + chips + '</div><button class="btn btn-default" data-act="add-pool">' + I.plus + ' Add products</button>') +
      card('Box rules', '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
        '<div>' + label('Items per box') + numInput('bn-box', 'data-k="boxSize"', EDIT.boxSize, { min: 1 }) + '</div>' +
        '<div>' + label('Pricing') + '<select class="input" id="bn-mode">' + modeOpts + '</select></div>' +
        '<div>' + label(valLabel) + numInput('bn-box', 'data-k="pricingValue"', EDIT.pricingValue, { min: 0, step: '0.01' }) + '</div>' +
      '</div>');
  }

  // ================= PREVIEW =================
  function previewInner() {
    const bc = EDIT.brandColor || '#8a5a2b';
    const headAlign = EDIT.header.align || 'center';
    const head = '<div style="text-align:' + headAlign + ';font-weight:700;color:' + bc + ';font-size:16px;margin-bottom:14px' + (EDIT.header.line ? ';border-bottom:' + (EDIT.header.thickness || 2) + 'px solid ' + bc + ';padding-bottom:8px' : '') + '">' + (esc(EDIT.header.text) || 'Bundle') + '</div>';

    // Shared PDP main-product area — mirrors the storefront product page's right column.
    const chevDn = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="flex:none"><path d="m6 9 6 6 6-6"/></svg>';
    const variantSel = (key, vname, vcount) => {
      const opts = variantList(vname, vcount);
      const idx = Math.min(previewVar[key] || 0, opts.length - 1);
      return '<span class="bn-vsel" data-vsel="' + key + '" data-vcount="' + vcount + '" data-vname="' + esc(vname || '') + '" style="display:inline-flex;align-items:center;justify-content:space-between;gap:6px;flex:1;min-width:0;border:1px solid var(--ctl);border-radius:6px;padding:5px 9px;font-size:12px;color:var(--ink-body);background:#fff;white-space:nowrap;cursor:pointer">' + esc(opts[idx] || 'Variant') + ' ' + chevDn + '</span>';
    };
    const basePrice = (EDIT.tiers && EDIT.tiers[0] && EDIT.tiers[0].price != null) ? EDIT.tiers[0].price : null;
    const imgIcon = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#b6bdca" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>';
    const productArea =
      '<div style="margin-bottom:18px">' +
        '<div style="position:relative;aspect-ratio:1/1;width:100%;background:#eef0f5;border-radius:12px;overflow:hidden;margin-bottom:14px">' +
          '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#9aa3b2;font-size:12px;font-weight:600">' + imgIcon + '<span>Product image</span></div>' +
          (compImg({ image: EDIT.parentImage, product: EDIT.parentProduct }) ? '<img src="' + imgAt(compImg({ image: EDIT.parentImage, product: EDIT.parentProduct }), 800) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()" />' : '') +
        '</div>' +
        '<div style="font-weight:600;color:var(--ink);font-size:17px;line-height:1.3">' + (esc(EDIT.parentProduct) || 'Product name') + '</div>' +
        '<div style="color:var(--ink);font-size:16px;font-weight:700;margin-top:6px">' + money(basePrice) + '</div>' +
      '</div>';
    const cta = '<button class="btn" style="width:100%;justify-content:center;text-align:center;margin-top:10px;height:44px;font-size:14px;font-weight:600;background:' + bc + ';color:#fff;border:0;border-radius:8px">Add to cart</button>';

    if (EDIT.template === 'box') {
      return productArea + head + '<div style="border:1px solid var(--hair);border-radius:8px;padding:14px;text-align:center">' +
        '<div style="font-weight:600;color:var(--ink)">Build your box · pick ' + EDIT.boxSize + '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:6px">' + (EDIT.pool || []).length + ' products · ' + (EDIT.pricingMode === 'percent' ? EDIT.pricingValue + '% off' : EDIT.pricingMode === 'fixed' ? money(EDIT.pricingValue) + ' box' : 'sum of items') + '</div></div>' + cta;
    }

    // fbt — main product + a list of checkable suggested add-ons (no quantity tiers).
    if (EDIT.template === 'fbt') {
      const ft = EDIT.tiers[0] || { components: [] };
      const items = (ft.components || []).map((c, idx) => {
        const checkbox = '<span style="flex:none;width:16px;height:16px;border-radius:4px;background:' + bc + ';display:inline-grid;place-items:center"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg></span>';
        return '<div class="flex items-center gap-2" style="padding:9px 0' + (idx ? ';border-top:1px solid var(--hair)' : '') + '">' + checkbox + imgBox(compImg(c), 34) +
          '<div style="flex:1;min-width:0;font-size:13px;color:var(--ink)">' + (esc(c.product) || 'Product') + (idx === 0 ? ' <span class="muted" style="font-size:11px">&middot; this item</span>' : '') + '</div></div>';
      }).join('');
      return productArea + head + '<div style="border:1px solid var(--hair);border-radius:8px;padding:2px 12px">' + items +
        '<div class="flex items-center justify-between" style="border-top:1px solid var(--hair);padding:10px 0 4px;font-size:13.5px"><span class="muted">Total &middot; ' + (ft.components || []).length + ' items</span><span style="font-weight:700;color:' + bc + '">' + money(ft.price) + (ft.compareAt ? ' <s class="muted" style="font-weight:400;font-size:12px">' + money(ft.compareAt) + '</s>' : '') + '</span></div></div>' +
        '<button class="btn" style="width:100%;justify-content:center;text-align:center;margin-top:10px;height:44px;font-size:14px;font-weight:600;background:' + bc + ';color:#fff;border:0;border-radius:8px">Add selected to cart</button>';
    }

    // volume / ab — radio-switchable tier cards; the selected tier expands its variant pickers.
    if (previewSel >= EDIT.tiers.length) previewSel = EDIT.tiers.length - 1;
    if (previewSel < 0) previewSel = 0;
    const cards = EDIT.tiers.map((t, i) => {
      const on = i === previewSel;
      const mains = (t.components || []).filter((c) => c.role === 'main');
      const gifts = (t.components || []).filter((c) => c.role === 'gift');
      const badge = t.badge ? '<span style="position:absolute;top:-9px;right:10px;background:' + bc + ';color:#fff;font-size:10px;font-weight:700;border-radius:4px;padding:2px 8px">' + esc(t.badge) + '</span>' : '';
      const radio = '<span style="flex:none;width:15px;height:15px;border-radius:50%;border:1.5px solid ' + (on ? bc : 'var(--ctl)') + ';display:inline-grid;place-items:center">' + (on ? '<span style="width:7px;height:7px;border-radius:50%;background:' + bc + '"></span>' : '') + '</span>';
      const variantRows = on ? mains.map((m, mi) => {
        const multi = (m.variants == null || m.variants > 1); // single-variant products have nothing to pick
        const vcount = (m.variants == null ? 6 : m.variants);
        const qty = Math.max(1, m.qty || 1);
        const groups = multi ? variantGroups(vcount) : [];
        let row = '<div class="flex items-center gap-2" style="margin-top:10px">' + imgBox(compImg(m), 40) +
          '<div style="flex:1;min-width:0;font-size:13px;color:var(--ink)">' + (esc(m.displayName) || esc(m.product) || 'Product') + '</div>' +
          '<span class="muted" style="font-size:13px;white-space:nowrap">&times; ' + qty + '</span></div>';
        // Option-name title (e.g. "Color, Size, Length") + one selectable dropdown per option, per unit (#1, #2, ...).
        if (groups.length) {
          row += '<div class="muted" style="font-size:11px;margin-top:8px;font-weight:600">' + groups.map((g) => esc(g.name)).join(', ') + '</div>';
          for (let k = 1; k <= qty; k++) {
            row += '<div class="flex items-center gap-2" style="margin-top:5px">' + (qty > 1 ? '<span style="font-size:11.5px;color:var(--ink-muted);width:22px;flex:none">#' + k + '</span>' : '') +
              '<div style="display:flex;gap:6px;flex:1;min-width:0">' +
              groups.map((g, gi) => { const key = i + ':' + mi + ':' + k + ':' + gi; const sidx = Math.min(previewVar[key] || 0, g.values.length - 1); return '<select class="bn-vsel" data-vsel="' + key + '" style="flex:1;min-width:0;height:30px;border:1px solid var(--ctl);border-radius:6px;padding:0 6px;font-size:12px;color:var(--ink-body);background:#fff;cursor:pointer">' + g.values.map((v, vi) => '<option' + (vi === sidx ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select>'; }).join('') +
              '</div></div>';
          }
        }
        return row;
      }).join('') : '';
      // Gift rows bleed to the card edges (negative margin cancels the card padding) and round off the bottom corners.
      const giftRows = gifts.length ? '<div style="margin:10px -12px -12px;border-radius:0 0 6.5px 6.5px;overflow:hidden' + (on ? '' : ';opacity:0.5') + '">' + gifts.map((g, gi) => {
        const gmulti = (g.variants != null && g.variants > 1);   // single-variant gifts have nothing to pick
        const ggroups = gmulti ? variantGroups(g.variants) : [];
        // Compact: variant dropdown(s) sit inline on the gift's own row (right-aligned) — no separate title line, so the row stays one line tall.
        const sel = ggroups.length ? '<div style="display:flex;gap:6px;flex:none;margin-left:auto">' + ggroups.map((gg, ggi) => { const key = 'g:' + i + ':' + gi + ':' + ggi; const sidx = Math.min(previewVar[key] || 0, gg.values.length - 1); return '<select class="bn-vsel" data-vsel="' + key + '" title="' + esc(gg.name) + '" style="height:26px;max-width:128px;border:1px solid rgba(255,255,255,0.55);border-radius:6px;padding:0 6px;font-size:11.5px;color:var(--ink-body);background:#fff;cursor:pointer">' + gg.values.map((v, vi) => '<option' + (vi === sidx ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select>'; }).join('') + '</div>' : '';
        return '<div class="flex items-center gap-2" style="background:' + bc + ';color:#fff;font-size:11.5px;padding:7px 12px' + (gi ? ';border-top:1px solid rgba(255,255,255,0.18)' : '') + '"><span style="width:38px;height:38px;border-radius:5px;overflow:hidden;background:rgba(255,255,255,0.25);flex:none;display:inline-block"><img src="' + compImg(g) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.remove()" /></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">+ ' + esc(g.displayName || g.product) + '</span>' + sel + '</div>';
      }).join('') + '</div>' : '';
      return '<div data-ptier="' + i + '" style="position:relative;border:1.5px solid ' + (on ? bc : 'var(--hair)') + ';border-radius:8px;padding:12px;margin-bottom:10px;cursor:pointer">' + badge +
        '<div class="flex items-center justify-between" style="gap:8px">' +
          '<div class="flex items-center gap-2" style="min-width:0">' + radio +
            '<div style="min-width:0"><div class="flex items-center gap-2" style="flex-wrap:wrap"><span style="font-weight:600;color:var(--ink);font-size:13.5px">' + (esc(t.title) || (t.qty + ' PCS')) + '</span>' + (t.tag ? '<span style="background:' + bc + ';color:#fff;font-size:9.5px;font-weight:700;border-radius:4px;padding:2px 6px;white-space:nowrap">' + esc(t.tag) + '</span>' : '') + '</div>' +
              (t.subtitle ? '<div class="muted" style="font-size:11.5px">' + esc(t.subtitle) + '</div>' : '') + '</div>' +
          '</div>' +
          '<div style="text-align:right;flex:none"><span style="font-weight:700;color:' + bc + '">' + money(t.price) + '</span>' + (t.compareAt ? ' <s class="muted" style="font-size:12px">' + money(t.compareAt) + '</s>' : '') + '</div>' +
        '</div>' + variantRows + giftRows + '</div>';
    }).join('');
    return productArea + head + cards + cta;
  }
  function updatePreview() { const el = root.querySelector('#bn-preview'); if (el) { el.innerHTML = previewInner(); wirePreview(); } }
  function wirePreview() {
    root.querySelectorAll('#bn-preview [data-ptier]').forEach((el) => el.onclick = () => { previewSel = +el.getAttribute('data-ptier'); updatePreview(); });
    // Variant dropdowns are interactive <select>s; keep their clicks from bubbling to the tier card (which would re-render), and remember each choice.
    root.querySelectorAll('#bn-preview .bn-vsel[data-vsel]').forEach((el) => {
      el.onclick = (e) => e.stopPropagation();
      el.onmousedown = (e) => e.stopPropagation();
      el.onchange = (e) => { e.stopPropagation(); previewVar[el.getAttribute('data-vsel')] = el.selectedIndex; };
    });
  }

  // ================= WIRE =================
  function wireEditor(isEdit) {
    const repaint = () => paintEditor(isEdit);
    const nm = root.querySelector('#bn-name'); if (nm) nm.oninput = () => { EDIT.name = nm.value; };
    root.querySelectorAll('.bn-statusr').forEach((r) => r.onchange = () => { EDIT.status = r.value; });
    root.querySelector('[data-act="pick-parent"]').onclick = () => window.UI.productPicker({ multiple: false, selected: EDIT.parentProduct ? [EDIT.parentProduct] : [], onConfirm: (p) => { if (p[0]) { EDIT.parentProduct = p[0].name; EDIT.parentImage = p[0].image; (EDIT.tiers || []).forEach((t) => { const fm = (t.components || []).find((c) => c.role === 'main'); if (fm) { fm.product = p[0].name; fm.variants = p[0].variants; fm.image = p[0].image; } }); } repaint(); } });
    const tpl = root.querySelector('#bn-tpl'); if (tpl) tpl.onchange = () => { renderEditor({ id: EDIT_ID, name: EDIT.name, template: tpl.value, status: EDIT.status }, tpl.value); };
    const color = root.querySelector('#bn-color'); if (color) color.oninput = () => { EDIT.brandColor = color.value; updatePreview(); root.querySelector('#bn-color').nextElementSibling.textContent = color.value; };
    const ht = root.querySelector('#bn-htext'); if (ht) ht.oninput = () => { EDIT.header.text = ht.value; updatePreview(); };
    const ha = root.querySelector('#bn-halign'); if (ha) ha.onchange = () => { EDIT.header.align = ha.value; updatePreview(); };
    const hl = root.querySelector('#bn-hline'); if (hl) hl.onchange = () => { EDIT.header.line = hl.checked; if (hl.checked && !(EDIT.header.thickness > 0)) EDIT.header.thickness = 2; repaint(); };
    const ht2 = root.querySelector('#bn-hthick'); if (ht2) ht2.oninput = () => { EDIT.header.thickness = +ht2.value; var hv = root.querySelector('#bn-hthick-val'); if (hv) hv.textContent = ht2.value + ' px'; updatePreview(); };
    // tier scalar fields
    root.querySelectorAll('.bn-f').forEach((el) => el.oninput = () => {
      const i = +el.getAttribute('data-i'), k = el.getAttribute('data-k');
      let v = el.value; if (k === 'qty') v = Number(v) || 1; if (k === 'price' || k === 'compareAt') v = v === '' ? null : Number(v);
      EDIT.tiers[i][k] = v;
      if (k === 'qty') { EDIT.tiers[i].components.forEach((c) => { if (c.role === 'main') c.qty = EDIT.tiers[i].qty; }); const mq = root.querySelector('[data-mainqty="' + i + '"]'); if (mq) mq.textContent = EDIT.tiers[i].qty; }
      updatePreview();
    });
    root.querySelectorAll('.bn-badge').forEach((el) => { el.oninput = () => { EDIT.tiers[+el.getAttribute('data-i')].badge = el.value; updatePreview(); }; el.onfocus = () => openBadgePop(el, (v) => { EDIT.tiers[+el.getAttribute('data-i')].badge = v; updatePreview(); }); });
    root.querySelectorAll('.bn-tag').forEach((el) => el.oninput = () => { EDIT.tiers[+el.getAttribute('data-i')].tag = el.value; updatePreview(); });
    root.querySelectorAll('.bn-cq').forEach((el) => el.oninput = () => { EDIT.tiers[+el.getAttribute('data-i')].components[+el.getAttribute('data-ci')].qty = Number(el.value) || 1; updatePreview(); });
    root.querySelectorAll('.bn-cn').forEach((el) => el.oninput = () => { EDIT.tiers[+el.getAttribute('data-i')].components[+el.getAttribute('data-ci')].displayName = el.value; updatePreview(); });
    root.querySelectorAll('.bn-cp').forEach((el) => el.onclick = () => { const i = +el.getAttribute('data-i'), ci = +el.getAttribute('data-ci'); window.UI.productPicker({ multiple: false, selected: [], onConfirm: (p) => { if (p[0]) { EDIT.tiers[i].components[ci].product = p[0].name; EDIT.tiers[i].components[ci].variants = p[0].variants; EDIT.tiers[i].components[ci].image = p[0].image; } repaint(); } }); });
    root.querySelectorAll('.bn-cr').forEach((el) => el.onclick = () => { EDIT.tiers[+el.getAttribute('data-i')].components.splice(+el.getAttribute('data-ci'), 1); repaint(); });
    root.querySelectorAll('[data-addcomp]').forEach((el) => el.onclick = () => {
      const parts = el.getAttribute('data-addcomp').split(':'), role = parts[0], i = +parts[1];
      window.UI.productPicker({ multiple: true, selected: [], onConfirm: (ps) => {
        if (!ps || !ps.length) return;
        ps.forEach((p) => EDIT.tiers[i].components.push({ role: role, product: p.name, qty: 1, displayName: '', variants: p.variants, image: p.image }));
        repaint();
      } });
    });
    root.querySelectorAll('.bn-default').forEach((el) => el.onchange = () => { EDIT.defaultTier = +el.getAttribute('data-i'); previewSel = EDIT.defaultTier; updatePreview(); });
    root.querySelectorAll('[data-rmtier]').forEach((el) => el.onclick = () => { const ri = +el.getAttribute('data-rmtier'); EDIT.tiers.splice(ri, 1); if (EDIT.defaultTier >= EDIT.tiers.length) EDIT.defaultTier = EDIT.tiers.length - 1; else if (ri < EDIT.defaultTier) EDIT.defaultTier--; previewSel = EDIT.defaultTier; repaint(); });
    const addTier = root.querySelector('[data-act="add-tier"]'); if (addTier) addTier.onclick = () => { const last = EDIT.tiers[EDIT.tiers.length - 1]; const q = EDIT.template === 'volume' ? (last ? last.qty + 1 : 1) : 1; EDIT.tiers.push({ qty: q, title: '', subtitle: '', price: null, compareAt: null, badge: '', components: [{ role: 'main', product: EDIT.parentProduct, qty: q, displayName: '' }] }); repaint(); };
    // box
    root.querySelectorAll('.bn-box').forEach((el) => el.oninput = () => { EDIT[el.getAttribute('data-k')] = Number(el.value) || 0; updatePreview(); });
    const mode = root.querySelector('#bn-mode'); if (mode) mode.onchange = () => { EDIT.pricingMode = mode.value; repaint(); };
    const addPool = root.querySelector('[data-act="add-pool"]'); if (addPool) addPool.onclick = () => window.UI.productPicker({ multiple: true, selected: EDIT.pool || [], onConfirm: (ps) => { EDIT.pool = ps.map((p) => p.name); repaint(); } });
    root.querySelectorAll('[data-rmpool]').forEach((el) => el.onclick = () => { EDIT.pool.splice(+el.getAttribute('data-rmpool'), 1); repaint(); });
    // save / delete
    root.querySelectorAll('[data-act="save"]').forEach((b) => b.onclick = () => doSave(isEdit));
    const dscb = root.querySelector('[data-act="discard-bar"]'); if (dscb) dscb.onclick = () => { EDIT = JSON.parse(EDIT_ORIGIN); paintEditor(isEdit); };
    const del = root.querySelector('[data-act="delete"]'); if (del) del.onclick = () => window.UI.confirm({ title: 'Delete bundle', content: 'Delete this bundle? This can\'t be undone.', okText: 'Delete', danger: true, onOk: () => { const i = D.bundles.findIndex((x) => x.id === EDIT_ID); if (i >= 0) D.bundles.splice(i, 1); toast('Deleted successfully'); location.hash = '#/bundles'; } });
    root.querySelectorAll('.bn-nup, .bn-ndn').forEach((b) => b.onclick = () => { const inp = b.closest('.bn-num').querySelector('input'); if (!inp) return; const step = parseFloat(inp.step) || 1, min = inp.min !== '' ? parseFloat(inp.min) : -Infinity; let v = (parseFloat(inp.value) || 0) + (b.classList.contains('bn-nup') ? step : -step); if (v < min) v = min; inp.value = (String(step).indexOf('.') >= 0) ? v.toFixed(2) : String(v); inp.dispatchEvent(new Event('input', { bubbles: true })); });
    wirePreview();
    root.oninput = syncUnsaved; root.onchange = syncUnsaved; // dirty-sync after any field change
    syncUnsaved();
  }

  function doSave(isEdit) {
    if (!(EDIT.name || '').trim()) return toast('Enter a bundle name');
    if (!(EDIT.parentProduct || '').trim()) return toast('Select a parent product first');
    const nextStatus = EDIT.status || 'active';
    const nextId = isEdit ? EDIT_ID : 'BND-' + String(D.bundles.length + 1).padStart(2, '0');
    const nextBundle = { id: nextId, name: EDIT.name, parentProduct: EDIT.parentProduct, template: EDIT.template, status: nextStatus, tierCount: (EDIT.tiers || []).length };
    const commit = () => {
      if (isEdit) {
        const i = D.bundles.findIndex((x) => x.id === EDIT_ID);
        if (i < 0) return toast('Bundle not found');
        Object.assign(D.bundles[i], { name: nextBundle.name, parentProduct: nextBundle.parentProduct, template: nextBundle.template, tierCount: nextBundle.tierCount });
        setBundleStatus(D.bundles[i], nextStatus);
        EDIT_ORIGIN = snapshot();
        syncUnsaved();
        toast('Updated successfully');
        return;
      }
      const created = Object.assign({}, nextBundle, { orders: 0, createdAt: '2026-06-19' });
      D.bundles.unshift(created);
      setBundleStatus(created, nextStatus);
      toast('Created successfully');
      location.hash = '#/bundles';
    };
    if (nextStatus === 'active') return confirmReplaceActive(nextBundle, commit);
    commit();
  }

  // ================= ROUTER =================
  function route(rest) {
    closeBadgePop();
    const parts = (rest || '').split('/').filter(Boolean);
    const p0 = parts[0];
    if (!p0) return renderList();
    if (p0 === 'new') return renderTemplatePicker();
    if (p0 === 'create') return renderEditor(null, parts[1] || 'volume');
    if (p0 === 'edit') { const b = byId(parts[1]); if (!b) return renderList(); return renderEditor(b, b.template); }
    return renderList();
  }
  window.VIEWS = window.VIEWS || {};
  window.VIEWS.bundles = { render: function (el, rest) { root = el; route(rest || ''); }, unmount: function () { closeBadgePop(); closeVarPop(); if (root) { root.oninput = null; root.onchange = null; } } };
})();
