/* BestShopio prototypes — SPA menu manifest + changelog (single source of truth).
   Mirrors the real bestvoy-admin layouts/menu.ts. The shell (shell.js) renders ONE
   persistent sidebar from these and routes by hash (no page reloads).

   Two menu CONTEXTS, exactly like the real admin:
   - NAV_MENU      = the main admin menu (Products & Content are expandable parents).
   - NAV_SETTINGS  = the settings menu; when the route starts with #/settings the
                     sidebar switches to this set + a "Settings" bar with an X back.

   Analytics is NOT in the live admin — it's our addition; per product decision it
   sits as a top-level item between Content and Online store. */

window.SITE = { brand: 'BestCheckout', store: 'Lavender Labs', role: 'Owner', email: 'hello@lavenderlabs.co' };

/* Stores this signed-in account can access — drives the header store-switcher.
   Mirrors the SSO stores panel (prototypes/account/stores.html). Entering a store
   from the panel opens index.html?store=<name>; the switcher opens others in a new tab. */
window.STORES = [
  { name: 'Lavender Labs', url: 'lavender-labs.myshopify.com' },
  { name: 'Aura Living', url: 'aura-living.myshopify.com' },
  { name: 'Northline Goods', url: 'northline-goods.myshopify.com' }
];

// Top-level base modules (no group label). Order: Orders / Products / Customers
// / Discounts / Analytics / Content (analytics intentionally before content).
window.NAV_MENU = [
  { id: 'home', label: 'Overview', icon: 'home', route: '#/home', desc: 'Setup, attention items, and checkout data for this store.' },
  { id: 'flows', label: 'Purchase flows', icon: 'apps', route: '#/flows', desc: 'Choose who sees each checkout, upsell, and downsell flow.' },
  { id: 'pages', label: 'Checkout pages', icon: 'page', route: '#/pages', desc: 'Customize checkout and Thank you pages.' },
  { id: 'orders', label: 'Orders', icon: 'inbox', route: '#/orders', desc: 'Orders created in BestCheckout and sent back to Shopify.' },
  { id: 'activity', label: 'Activity log', icon: 'bell', route: '#/activity', desc: 'Important changes and service events for this Shopify store.' },
  {
    id: 'settings', label: 'Settings', icon: 'settings', route: '#/settings/base', desc: 'Manage the Shopify store and services that power checkout.',
    children: [
      { id: 'settings-base', label: 'Shopify connection', route: '#/settings/base' },
      { id: 'settings-payments', label: 'Payment services', route: '#/settings/payments' },
      { id: 'settings-domains', label: 'Checkout domain', route: '#/settings/domains' },
      { id: 'settings-notifications', label: 'Email notifications', route: '#/settings/notifications' },
      { id: 'settings-roles', label: 'Roles', route: '#/settings/roles' },
      { id: 'settings-staff', label: 'Staff', route: '#/settings/staff' }
    ]
  }
];

// "Channels" group — per-platform sales-channel workspaces (Shopify-style channels).
// Mirrors the BestShopio Planning Map's Channel column.
window.NAV_CHANNELS = [];

window.NAV_SETTINGS = [
  { id: 'base', label: 'Shopify connection', icon: 'settings', route: '#/settings/base' },
  { id: 'payments', label: 'Payment services', icon: 'card', route: '#/settings/payments' },
  { id: 'domains', label: 'Checkout domain', icon: 'globe', route: '#/settings/domains' },
  { id: 'notifications', label: 'Email notifications', icon: 'bell', route: '#/settings/notifications' },
  { id: 'staffperms', label: 'Staff and permissions', icon: 'userPen', route: '#/settings/roles', children: [
    { id: 'roles', label: 'Roles', route: '#/settings/roles' },
    { id: 'staff', label: 'Staff', route: '#/settings/staff' }
  ] }
];

/* ---------- Subscriptions workspace (V1.142) ----------
   See 系统架构认知 §2: the main site keeps the base infrastructure (subscription
   product type, subscription orders); this app wraps the recurring logic. The
   workspace is a resident top-level item in the sidebar — the separate "Apps"
   shell was dropped as redundant while there's a single built-in app.
   PLUGGABLE_APPS / AppState are kept for a future app marketplace. */
// Apps Store — order matters for the "Apps" sidebar group:
// BestCheckout first (focus app, sits under the Channels group), then
// Subscriptions and Bundles (older built-ins).
window.PLUGGABLE_APPS = [
  {
    id: 'bestcheckout', name: 'BestCheckout', icon: 'card', builtin: true, category: 'Selling', status: 'available',
    tagline: 'High-converting external checkout for your Shopify store — and your on-ramp to BestShopio.',
    blurb: 'Bring your Shopify store: products, discounts, shipping and customers sync automatically from Shopify for checkout. Paid orders write back to Shopify for fulfillment. Sell through a faster checkout with one-click post-purchase upsells and multi-MID payment routing, then migrate to a native BestShopio store with a single domain switch. Subscriptions reuse the Subscriptions app.',
    permissions: ['Connect a Shopify store (OAuth)', 'Auto-sync products, collections, discounts, shipping and customers from Shopify', 'Write paid orders back to Shopify to trigger fulfillment', 'Use connected payment gateways for checkout & routing'],
    // App workspace with a second-level menu (like Subscriptions / Analytics): parent = Overview, children below.
    menu: { id: 'bestcheckout', label: 'BestCheckout', icon: 'card', route: '#/bestcheckout', desc: 'External high-converting checkout, payment routing & post-purchase for a connected Shopify store.',
      children: [
        { id: 'bestcheckout-funnel',     label: 'Funnel',     route: '#/bestcheckout/funnel' },
        { id: 'bestcheckout-connect',    label: 'Connection', route: '#/bestcheckout/connect' },
      ] },
  },
  {
    id: 'subscriptions', name: 'Subscriptions', icon: 'refresh', builtin: true, category: 'Selling', status: 'available',
    tagline: 'Sell products on a recurring schedule — Subscribe & Save.',
    blurb: 'Turn one-off products into recurring revenue. Customers subscribe on the product page and are billed automatically through your connected Airwallex, Stripe or PayPal; every cycle drops a fresh order into Orders.',
    permissions: ['Read products and customers', 'Create orders on the main store', 'Use connected payment gateways for recurring charges'],
    // Workspace menu item, injected into the sidebar only when the app is ON.
    menu: { id: 'subscriptions', label: 'Subscriptions', icon: 'refresh', route: '#/subscriptions',
      desc: 'Subscription plans, contracts, recurring orders and billing.',
      children: [
        { id: 'subscriptions-plans',      label: 'Plans',         route: '#/subscriptions/plans' },
        { id: 'subscriptions-contracts',  label: 'Subscriptions', route: '#/subscriptions/contracts' },
      ] },
  },
  {
    id: 'bundles', name: 'Bundles', icon: 'box', builtin: true, category: 'Selling', status: 'available',
    tagline: 'Quantity breaks and build-a-box bundles.',
    blurb: 'Sell more per order with quantity-break offers (Buy 1 / BOGO / N-pack + gifts) or let customers build their own box. Bundles can be one-time or subscription.',
    menu: { id: 'bundles', label: 'Bundles', icon: 'box', route: '#/bundles', desc: 'Quantity-break and build-a-box bundles.' },
  },
  { id: 'loyalty',   name: 'Loyalty & Rewards', icon: 'badgePercent', builtin: true, category: 'Marketing', status: 'coming_soon', tagline: 'Points, rewards and a loyalty program.' },
  { id: 'wholesale', name: 'Wholesale / B2B',   icon: 'tag',          builtin: true, category: 'Selling',   status: 'coming_soon', tagline: 'Wholesale pricing, minimum order quantity and B2B customers.' },
  { id: 'affiliate', name: 'Affiliate',         icon: 'userPen',      builtin: true, category: 'Marketing', status: 'coming_soon', tagline: 'Referral links and commission payouts.' },
];

/* Per-store app enable-state (prototype: localStorage; real admin: store config). */
window.AppState = {
  k: function (id) { return 'bsio_app_' + id; },
  isEnabled: function (id) { try { return localStorage.getItem(this.k(id)) === '1'; } catch (e) { return false; } },
  setEnabled: function (id, on) { try { localStorage.setItem(this.k(id), on ? '1' : '0'); } catch (e) {} },
};

/* Sidebar menu = base modules + Channels group + Apps group.
   Entries with `_group` are section dividers (rendered as <div class="nav-group-label">)
   by shell.js renderSidebar. Order:
     base modules (NAV_MENU)
     → "Channels" divider → NAV_CHANNELS
     → "Apps" divider → enabled PLUGGABLE_APPS in declaration order */
window.buildMenu = function () {
  return window.NAV_MENU;
};

/* route first-segment -> module folder to lazy-load (router uses this). */
window.ROUTE_MODULE = {
  home: 'home',
  flows: 'bestcheckout',
  pages: 'bestcheckout',
  orders: 'orders',
  activity: 'activity',
  payments: 'settings',
  domains: 'settings',
  notifications: 'settings',
  settings: 'settings',
  /* Existing bookmarks remain valid while merchants adopt the new IA. */
  bestcheckout: 'bestcheckout',
  analytics: 'analytics'
};

/* A merchant-facing help centre must never take them out of unfinished work. */
window.BESTSHOPIO_HELP_CENTER_URL = 'help/';

/* Newest first. `modules` lists the route ids each version touched (for the Home changelog). */
window.CHANGELOG = [
  {
    version: 'V1.143', date: '2026-06', title: 'BestCheckout — external checkout for Shopify merchants',
    modules: [],
    items: [
      'New app (sits under Bundles): connect a Shopify store and sell through a faster external checkout with one-click post-purchase upsells and multi-MID payment routing',
      'Shopify auto-sync — products, collections, discounts, shipping and customers are read from Shopify for checkout; paid orders write back to trigger the merchant’s existing fulfillment apps',
      'Connection hub gathers the whole Shopify bridge — authorization (OAuth), Shopify data auto-sync, checkout injection (App Embed) and the checkout domain — and retires at migration',
      'One-domain-switch migration to a native BestShopio store; subscriptions reuse the Subscriptions app rather than a second engine',
    ],
  },
  {
    version: 'V1.142', date: '2026-06', title: 'Subscriptions — sell on a recurring schedule',
    modules: [],
    items: [
      'Subscriptions: a new top-level workspace — click it for the Overview (MRR / active / upcoming charges / churn)',
      'Plans, Subscriptions (contracts), Orders and Settings sit under it',
      'Recurring billing through your connected Airwallex, Stripe or PayPal — Subscribe & Save with trials, subscription discounts and failed-payment retries (dunning)',
      'Storefront: One-time vs Subscribe & Save on the product page, plus a customer portal to pause / skip / change / cancel',
    ],
  },
  {
    version: 'V1.141', date: '2026-06', title: 'Notifications — configurable order emails',
    modules: [],
    items: [
      'Settings → Notifications: turn order confirmation & shipping emails on/off per store — no code, no redeploy (replaces the hardcoded per-site templates)',
      'Email editor with merge variables + safe dynamic blocks (order summary / tracking) and a starter template library, with a live desktop/mobile preview and test send',
      'Brand settings (logo / color / footer) shared across every notification; extensible event catalog for refund, welcome, verification and more',
    ],
  },
  {
    version: 'V1.139', date: '2026-06', title: 'Self-service store provisioning',
    modules: [],
    items: [
      'Account portal: Create store wizard → live Provisioning progress (database / storage / search / OMS / domain / SSL) in under 3 minutes',
      'Store Home: Setup guide card (Add product · Set up payments · Choose theme · Connect domain · Go live)',
      'Settings → Domains: connect a custom domain with auto DNS detection + automatic SSL (issue & renew)',
    ],
  },
  {
    version: 'V1.129', date: '2026-06', title: 'Staff & permissions + SSO multi-store portal',
    modules: [],
    items: [
      'SSO portal (account/signin.html → stores.html): sign in once, pick a store card to enter its admin',
      'Header store-switcher + account menu (Change password / Sign out) tie the admin back to the portal',
      'Settings → Roles (permission tree) and Staff (5-state lifecycle: Add / Edit / Review / Delete)',
    ],
  },
  {
    version: 'SPA', date: '2026-06', title: 'Single-page app — one persistent shell, instant routing',
    modules: ['orders', 'products', 'analytics'],
    items: [
      'Converted to a SPA: one shell + hash router, no per-click reload (matches the live admin)',
      'Menu rebuilt to mirror menu.ts: expandable Products/Content, Settings as its own menu context',
      'Analytics placed as a top-level item between Content and Online store',
    ],
  },
  {
    version: 'Modules', date: '2026-06', title: 'Full merchant-admin module set',
    modules: ['products', 'collections', 'reviews', 'orders', 'discounts', 'customers', 'blog', 'page', 'menu', 'online-store', 'google'],
    items: [
      'Catalog, Sales, Content, Channels and Settings modules built against reference/bestvoy-admin',
      'Orders: 3-layer discounts, refund / fulfill flows',
    ],
  },
  {
    version: 'V1.137', date: '2026-06', title: 'Analytics module — reports engine + behavior data',
    modules: ['analytics'],
    items: [
      'Commerce dimension reports with Social -> platform drill-down',
      'Behavior data wired to a self-hosted Sensors (神策) SDK',
    ],
  },
];
