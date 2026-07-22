/* BestShopio prototypes — runtime i18n layer (EN source -> ZH overlay).

   Why a runtime overlay (not a source refactor): every module renders English
   straight into innerHTML across ~18 app.js files. Instead of rewriting 22k lines,
   this single script translates the rendered DOM:
     - an exact-match phrase dictionary (DICT) keyed by the trimmed text-node value,
     - a few regex RULES for interpolated strings ("3 of 4 tasks done · 75%"),
     - a MutationObserver that re-translates any newly added subtree — so lazily
       loaded module views, dropdowns, modals, toasts and date-pickers are covered
       with ZERO changes to the modules themselves.

   Language is persisted in localStorage and defaults to ZH (this is "the Chinese
   version"). Toggling reloads the page (hash route is preserved), which keeps the
   English path byte-for-byte unchanged — backward compatible: when lang==='en'
   this file installs the toggle and does nothing else.

   Extending: module dictionaries call  window.I18N.extend({ "English": "中文" })
   and  window.I18N.addRules([{ re:/.../,$ zh:function(m){...} }]).  See assets/i18n-dict.js. */
(function () {
  'use strict';

  var LANG_KEY = 'bsio_lang';
  function getLang() { try { return localStorage.getItem(LANG_KEY) || 'zh'; } catch (e) { return 'zh'; } }
  function setLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} }
  var lang = getLang();

  // ---------------- dictionary ----------------
  // Keyed by the EXACT trimmed text content of a DOM text node (or attribute value).
  // Brand/proper nouns (BestShopio, BestCheckout, Shopify, Airwallex, Stripe, PayPal,
  // Google, SKU, OAuth, SSL, DNS, MID, OMS, MRR…) are intentionally absent => stay as-is.
  var DICT = {
    // ---- top sidebar menu ----
    'Orders': '订单', 'Products': '商品', 'Collections': '商品系列', 'Reviews': '评价',
    'Customers': '客户', 'Discounts': '折扣', 'Content': '内容', 'Blog': '博客',
    'Page': '页面', 'Menu': '导航菜单', 'Analytics': '数据分析', 'Reports': '报表',
    'Live View': '实时概览', 'Online store': '网上商店',
    'Subscriptions': '订阅', 'Plans': '套餐', 'Bundles': '捆绑销售', 'Settings': '设置',

    // ---- settings menu ----
    'Basic settings': '基础设置', 'Payments': '收款', 'Currency': '币种', 'Checkout': '结账',
    'Notifications': '通知', 'Domains': '域名', 'Metafields': '元字段',
    'Ship locations': '发货地', 'Shipping rates': '运费',
    'Staff and permissions': '员工与权限', 'Roles': '角色', 'Staff': '员工',

    // ---- Home: module card descriptions (nav.js desc) ----
    'Orders, fulfillment, refunds and returns.': '订单、发货、退款与退货。',
    'Products, variants, inventory, media and metafields.': '商品、款式、库存、媒体与元字段。',
    'Group products into collections with nesting and SEO.': '将商品归入商品系列，支持嵌套与 SEO。',
    'Product reviews, replies and moderation.': '商品评价、回复与审核。',
    'Customer profiles, orders, subscriptions and timeline.': '客户资料、订单、订阅与动态时间线。',
    'Product / order / shipping discounts with stacking rules.': '商品 / 订单 / 运费折扣，支持叠加规则。',
    'Blog posts, pages and storefront menus.': '博客文章、页面与店铺导航菜单。',
    'Blog posts and categories with rich content.': '博客文章与分类，支持富文本内容。',
    'Custom pages (About, Contact, policies).': '自定义页面（关于、联系、政策条款）。',
    'Storefront navigation menus (two-level tree).': '店铺前台导航菜单（两级树）。',
    'Reports engine, funnels, behavior (Sensors) and live view.': '报表引擎、漏斗、行为（神策）与实时概览。',
    'Theme list and the visual store builder.': '主题列表与可视化店铺编辑器。',
    'Google Merchant Center product / variant sync.': 'Google Merchant Center 商品 / 款式同步。',
    'Subscription plans, contracts, recurring orders and billing.': '订阅套餐、合约、周期订单与扣款。',
    'Quantity-break and build-a-box bundles.': '阶梯数量与自由组合套装。',
    'External high-converting checkout, payment routing & post-purchase for a connected Shopify store.': '面向已接入 Shopify 店铺的高转化外部结账、收款路由与购后追加。',

    // ---- pluggable app names / taglines (Apps cards) ----
    'Loyalty & Rewards': '积分与奖励', 'Wholesale / B2B': '批发 / B2B', 'Affiliate': '分销联盟',
    'Sell products on a recurring schedule — Subscribe & Save.': '按周期循环销售商品——「订阅省」。',
    'Quantity breaks and build-a-box bundles.': '阶梯数量与自由组合套装。',
    'High-converting external checkout for your Shopify store — and your on-ramp to BestShopio.': '为 Shopify 店铺打造的高转化外部结账——也是迁入 BestShopio 的入口。',
    'Points, rewards and a loyalty program.': '积分、奖励与会员计划。',
    'Wholesale pricing, minimum order quantity and B2B customers.': '批发价、起订量与 B2B 客户。',
    'Referral links and commission payouts.': '推荐链接与佣金结算。',

    // ---- Home hub chrome (shell.js) ----
    'BestShopio — Admin prototype': 'BestShopio —— 后台原型',
    'One living set of merchant-admin prototypes, mirroring the live admin. Pick a module, or see what changed below.': '一套持续维护的商家后台原型，对齐线上后台。选择一个模块，或查看下方的更新内容。',
    'What changed': '更新内容',

    // ---- changelog titles (nav.js) ----
    'BestCheckout — external checkout for Shopify merchants': 'BestCheckout —— 面向 Shopify 商家的外部结账',
    'Subscriptions — sell on a recurring schedule': '订阅 —— 按周期循环销售',
    'Notifications — configurable order emails': '通知 —— 可配置的订单邮件',
    'Self-service store provisioning': '自助开通店铺',
    'Staff & permissions + SSO multi-store portal': '员工与权限 + SSO 多店铺门户',
    'Single-page app — one persistent shell, instant routing': '单页应用 —— 常驻外壳，即时路由',
    'Full merchant-admin module set': '完整的商家后台模块集',
    'Analytics module — reports engine + behavior data': '数据分析模块 —— 报表引擎 + 行为数据',

    // ---- changelog items (nav.js) ----
    'New app (sits under Bundles): connect a Shopify store and sell through a faster external checkout with one-click post-purchase upsells and multi-MID payment routing': '新增应用（位于「捆绑销售」下方）：接入 Shopify 店铺，通过更快的外部结账页销售，支持一键购后追加与多 MID 收款路由',
    'Shopify auto-sync — products, collections, discounts, shipping and customers are read from Shopify for checkout; paid orders write back to trigger the merchant’s existing fulfillment apps': 'Shopify 自动同步——商品、商品系列、折扣、运费与客户从 Shopify 读取供结账使用；已付款订单回写以触发商家现有的发货应用',
    'Connection hub gathers the whole Shopify bridge — authorization (OAuth), Shopify data auto-sync, checkout injection (App Embed) and the checkout domain — and retires at migration': '连接中心汇集整条 Shopify 通道——授权（OAuth）、Shopify 数据自动同步、结账注入（App Embed）与结账域名——迁移完成后即退役',
    'One-domain-switch migration to a native BestShopio store; subscriptions reuse the Subscriptions app rather than a second engine': '一次切换域名即可迁移为原生 BestShopio 店铺；订阅复用「订阅」应用，无需第二套引擎',
    'Subscriptions: a new top-level workspace — click it for the Overview (MRR / active / upcoming charges / churn)': '订阅：全新一级工作区——点击查看概览（MRR / 活跃 / 即将扣款 / 流失）',
    'Plans, Subscriptions (contracts), Orders and Settings sit under it': '套餐、订阅（合约）、订单与设置均归于其下',
    'Recurring billing through your connected Airwallex, Stripe or PayPal — Subscribe & Save with trials, subscription discounts and failed-payment retries (dunning)': '通过已接入的 Airwallex、Stripe 或 PayPal 周期性扣款——「订阅省」支持试用、订阅折扣与扣款失败重试（催款）',
    'Storefront: One-time vs Subscribe & Save on the product page, plus a customer portal to pause / skip / change / cancel': '店铺前台：商品页提供「一次性购买」与「订阅省」，并设客户自助中心，可暂停 / 跳过 / 修改 / 取消',
    'Settings → Notifications: turn order confirmation & shipping emails on/off per store — no code, no redeploy (replaces the hardcoded per-site templates)': '设置 → 通知：按店铺开关订单确认与发货邮件——无需写代码、无需重新部署（取代各站点写死的模板）',
    'Email editor with merge variables + safe dynamic blocks (order summary / tracking) and a starter template library, with a live desktop/mobile preview and test send': '邮件编辑器支持合并变量 + 安全动态区块（订单摘要 / 物流追踪）与入门模板库，并提供桌面/移动实时预览与测试发送',
    'Brand settings (logo / color / footer) shared across every notification; extensible event catalog for refund, welcome, verification and more': '品牌设置（Logo / 颜色 / 页脚）在所有通知间共享；事件目录可扩展，涵盖退款、欢迎、验证等',
    'Account portal: Create store wizard → live Provisioning progress (database / storage / search / OMS / domain / SSL) in under 3 minutes': '账户门户：建店向导 → 实时开通进度（数据库 / 存储 / 搜索 / OMS / 域名 / SSL），3 分钟内完成',
    'Store Home: Setup guide card (Add product · Set up payments · Choose theme · Connect domain · Go live)': '店铺首页：设置引导卡（添加商品 · 配置收款 · 选择主题 · 绑定域名 · 上线）',
    'Settings → Domains: connect a custom domain with auto DNS detection + automatic SSL (issue & renew)': '设置 → 域名：绑定自定义域名，自动检测 DNS + 自动 SSL（签发与续期）',
    'SSO portal (account/signin.html → stores.html): sign in once, pick a store card to enter its admin': 'SSO 门户（account/signin.html → stores.html）：一次登录，点选店铺卡片进入对应后台',
    'Header store-switcher + account menu (Change password / Sign out) tie the admin back to the portal': '顶栏店铺切换器 + 账户菜单（修改密码 / 退出登录）将后台与门户打通',
    'Settings → Roles (permission tree) and Staff (5-state lifecycle: Add / Edit / Review / Delete)': '设置 → 角色（权限树）与员工（5 态生命周期：添加 / 编辑 / 审核 / 删除）',
    'Converted to a SPA: one shell + hash router, no per-click reload (matches the live admin)': '改造为单页应用：一套外壳 + 哈希路由，点击不再整页刷新（与线上后台一致）',
    'Menu rebuilt to mirror menu.ts: expandable Products/Content, Settings as its own menu context': '菜单按 menu.ts 重建：可展开的「商品 / 内容」，设置作为独立菜单上下文',
    'Analytics placed as a top-level item between Content and Online store': '数据分析作为一级入口，置于「内容」与「网上商店」之间',
    'Catalog, Sales, Content, Channels and Settings modules built against reference/bestvoy-admin': '商品目录、销售、内容、渠道与设置模块，均对照 reference/bestvoy-admin 构建',
    'Orders: 3-layer discounts, refund / fulfill flows': '订单：三层折扣、退款 / 发货流程',
    'Commerce dimension reports with Social -> platform drill-down': '电商维度报表，支持社媒 → 平台下钻',
    'Behavior data wired to a self-hosted Sensors (神策) SDK': '行为数据接入自部署的神策 Sensors SDK',

    // ---- Setup guide card (shell.js) ----
    'Set up your store': '设置你的店铺',
    'Add your first product': '添加第一个商品',
    'List a product so customers have something to buy.': '上架一个商品，让顾客有东西可买。',
    'Set up payments': '配置收款',
    'Connect Airwallex, Stripe or PayPal to get paid.': '接入 Airwallex、Stripe 或 PayPal 以收款。',
    'Connect your domain': '绑定你的域名',
    'Use your own domain instead of the free one.': '使用自有域名替换免费域名。',
    'Preview & go live': '预览并上线',
    'Review your store and open it to customers.': '检查店铺并对顾客开放。',
    'Optional': '可选', 'Hide': '隐藏',

    // ---- header menus (shell.js) ----
    'View all stores': '查看全部店铺',
    'Change password': '修改密码',
    'Sign out': '退出登录',
    'You have unsaved changes': '有未保存的更改',
    'Current password': '当前密码',
    'New password': '新密码',
    'Confirm new password': '确认新密码',
    'Enter current password': '请输入当前密码',
    'Enter new password': '请输入新密码',
    'Re-enter new password': '请再次输入新密码',
    'Please enter current password': '请输入当前密码',
    'Please enter new password': '请输入新密码',
    '8 characters minimum': '至少 8 个字符',
    'Passwords do not match.': '两次密码不一致。',
    'Change password successfully': '密码修改成功',

    // ---- common chrome actions / status ----
    'Discard': '放弃', 'Update': '更新', 'Loading…': '加载中…',
    'Add': '添加', 'Start': '开始', 'Done': '完成', 'Cancel': '取消',
    'Close': '关闭', 'Save': '保存', 'Save changes': '保存更改',
    'Edit': '编辑', 'Delete': '删除', 'Remove': '移除', 'Apply': '应用',
    'Search': '搜索', 'Export': '导出', 'Import': '导入', 'Preview': '预览',
    'Active': '已启用', 'Draft': '草稿', 'Archived': '已归档',

    // ---- Orders statuses (seeds the first module; full set lands in i18n-dict.js) ----
    'To pay': '待付款', 'To ship': '待发货', 'Shipped': '已发货',
    'Awaiting Review': '待评价', 'Refunded': '已退款', 'Canceled': '已取消',
    'Paid': '已付款', 'Unpaid': '未付款', 'Fulfilled': '已发货', 'Unfulfilled': '未发货',

    // ---- date picker (widgets.js) ----
    'Jan': '1月', 'Feb': '2月', 'Mar': '3月', 'Apr': '4月', 'May': '5月', 'Jun': '6月',
    'Jul': '7月', 'Aug': '8月', 'Sep': '9月', 'Oct': '10月', 'Nov': '11月', 'Dec': '12月',
    'Su': '日', 'Mo': '一', 'Tu': '二', 'We': '三', 'Th': '四', 'Fr': '五', 'Sa': '六'
  };

  // ---- regex rules for interpolated text nodes ----
  // Each: { re, zh(matchArray)->string|null }. Tried only when DICT misses.
  var RULES = [
    { re: /^(\d+) of (\d+) tasks done\s·\s(\d+)%$/, zh: function (m) { return '已完成 ' + m[1] + '/' + m[2] + ' 项 · ' + m[3] + '%'; } },
    { re: /^Module “(.+)” not found\.$/, zh: function (m) { return '未找到模块「' + m[1] + '」。'; } },
    { re: /^Failed to load “(.+)”\.$/, zh: function (m) { return '加载「' + m[1] + '」失败。'; } }
  ];

  // attributes whose values are user-visible
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  var suppress = false; // reentrancy guard for our own characterData writes

  function pad2(s) { return s; }

  // translate a raw string (preserving leading/trailing whitespace); null = no change
  function tr(raw) {
    if (raw == null) return null;
    var key = raw.trim();
    if (!key) return null;
    var hit = DICT[key];
    if (hit == null) {
      for (var i = 0; i < RULES.length; i++) {
        var m = key.match(RULES[i].re);
        if (m) { var z = RULES[i].zh(m, key); if (z != null) { hit = z; break; } } // zh gets the full trimmed text too
      }
    }
    if (hit == null) return null;
    var lead = (raw.match(/^\s*/) || [''])[0];
    var trail = (raw.match(/\s*$/) || [''])[0];
    return lead + hit + trail;
  }

  function translateTextNode(tn) {
    var p = tn.parentNode;
    if (!p) return;
    var tag = p.nodeName;
    // NOTE: <option> is translated. On SPA pages widgets.js hides native selects (so
    // translating their option text is harmless), and the standalone account pages have
    // plain native selects (country/currency) that must be translated.
    if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'TEXTAREA') return;
    if (p.closest && p.closest('.i18n-skip')) return;
    var z = tr(tn.nodeValue);
    if (z != null && z !== tn.nodeValue) { suppress = true; tn.nodeValue = z; suppress = false; }
  }

  function translateAttrs(el) {
    if (el.closest && el.closest('.i18n-skip')) return; // attrs (e.g. placeholder) inside a skipped subtree stay untranslated
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (el.hasAttribute && el.hasAttribute(a)) {
        var v = el.getAttribute(a);
        var hit = tr(v); // DICT + RULES（如 "Please enter X" → "请输入 X"），与文本节点一致
        if (hit != null && hit !== v) el.setAttribute(a, hit);
      }
    }
  }

  // translate a node (text node, or element subtree)
  function translateTree(node) {
    if (!node) return;
    if (node.nodeType === 3) { translateTextNode(node); return; }
    if (node.nodeType !== 1) return;
    if (node.classList && node.classList.contains('i18n-skip')) return;
    if (node.closest && node.closest('.i18n-skip')) return;
    translateAttrs(node);
    // descendant text nodes
    var tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    var batch = [], t;
    while ((t = tw.nextNode())) batch.push(t);
    for (var i = 0; i < batch.length; i++) translateTextNode(batch[i]);
    // descendant attributes
    if (node.querySelectorAll) {
      var els = node.querySelectorAll('[' + ATTRS.join('],[') + ']');
      for (var j = 0; j < els.length; j++) translateAttrs(els[j]);
    }
  }

  // ---------------- top-right language toggle ----------------
  function injectStyle() {
    if (document.getElementById('i18n-style')) return;
    var st = document.createElement('style');
    st.id = 'i18n-style';
    st.textContent =
      '.i18n-toggle{display:inline-flex;align-items:center;border:1px solid var(--hair,#e5e7eb);border-radius:8px;overflow:hidden;height:30px;margin-right:4px;background:var(--panel,#fff)}' +
      '.i18n-toggle button{appearance:none;border:0;background:transparent;cursor:pointer;font-size:12.5px;font-weight:600;line-height:1;padding:0 10px;height:100%;color:var(--ink-muted,#6b7280)}' +
      '.i18n-toggle button.on{background:var(--brand,#111827);color:#fff}' +
      '.i18n-toggle button+button{border-left:1px solid var(--hair,#e5e7eb)}' +
      '.i18n-toggle-float{position:fixed;top:14px;right:16px;z-index:9999;box-shadow:0 2px 10px rgba(16,24,40,.14)}' +
      '.acct-header .i18n-toggle{margin-right:12px}';
    document.head.appendChild(st);
  }
  function buildToggle() {
    var wrap = document.createElement('div');
    wrap.className = 'i18n-toggle i18n-skip';
    wrap.innerHTML =
      '<button type="button" data-l="zh" class="' + (lang === 'zh' ? 'on' : '') + '">中</button>' +
      '<button type="button" data-l="en" class="' + (lang === 'en' ? 'on' : '') + '">EN</button>';
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-l]'); if (!b) return;
      var l = b.getAttribute('data-l');
      if (l === lang) return;
      setLang(l);
      location.reload(); // hash route is preserved across reload
    });
    return wrap;
  }
  function ensureToggle() {
    if (document.querySelector('.i18n-toggle')) return;
    if (document.body && document.body.hasAttribute('data-i18n-no-toggle')) return;
    injectStyle();
    // 1) SPA admin chrome
    var right = document.querySelector('.hdr-right');
    if (right) { right.insertBefore(buildToggle(), right.firstChild); return; }
    // 2) account-portal pages with a top bar (stores / create-store / provisioning)
    var acctUser = document.querySelector('.acct-header .acct-user');
    if (acctUser && acctUser.parentNode) { acctUser.parentNode.insertBefore(buildToggle(), acctUser); return; }
    // 3) standalone auth pages (signin / register / forgot / staff) — float top-right
    if (document.body) { var fl = buildToggle(); fl.classList.add('i18n-toggle-float'); document.body.appendChild(fl); }
  }

  // ---------------- boot ----------------
  function boot() {
    if (lang === 'zh') {
      if (document.documentElement) document.documentElement.setAttribute('lang', 'zh-CN');
      translateTree(document.body);
    }
    ensureToggle();
    // observe additions so lazily rendered views / popovers / toasts get translated.
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === 'childList') {
          if (lang === 'zh') for (var j = 0; j < mu.addedNodes.length; j++) translateTree(mu.addedNodes[j]);
        } else if (mu.type === 'characterData') {
          if (lang === 'zh' && !suppress) translateTextNode(mu.target);
        }
      }
      ensureToggle(); // re-inject if the header chrome was rebuilt
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: lang === 'zh' });
    // a couple of late passes catch anything the shell paints just after us
    if (lang === 'zh') {
      requestAnimationFrame(function () { translateTree(document.body); });
      setTimeout(function () { translateTree(document.body); ensureToggle(); }, 0);
    }
  }

  // ---------------- public API ----------------
  window.I18N = {
    lang: lang,
    t: function (s) { var z = tr(s); return z == null ? s : z; },
    extend: function (obj) { if (obj) for (var k in obj) if (obj.hasOwnProperty(k)) DICT[k] = obj[k]; if (lang === 'zh' && document.body) translateTree(document.body); return this; },
    addRules: function (arr) { if (arr && arr.length) RULES = RULES.concat(arr); if (lang === 'zh' && document.body) translateTree(document.body); return this; },
    apply: function (root) { if (lang === 'zh') translateTree(root || document.body); },
    set: function (l) { setLang(l); location.reload(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
