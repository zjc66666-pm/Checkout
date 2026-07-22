/* BestCheckout module — mock data (the Checkout-Champ-style layer on BestShopio).
   Pure demo data; mirrors the shape the real module would read from the API.
   The Checkout Champ research → built as an "增强式" Shopify-connect App:
   external high-converting checkout + multi-MID payment routing + subscriptions. */
window.DATA_BC = {
  // ---- Overview KPIs (down=good for chargebacks/decline) ----
  KPIS: [
    { label: 'Checkout conversion', value: '64.2%',  delta: '+5.1 pts', up: true,  sub: 'fast single-page checkout' },
    { label: 'AOV',                 value: '$58.20', delta: '+12.8%',   up: true,  sub: 'post-purchase upsell + order bumps' },
    { label: 'Upsell take rate',    value: '23.4%',  delta: '+3.2 pts', up: true,  sub: 'one-click, no re-enter card' },
    { label: 'Orders · 30d',        value: '8,420',  delta: '+18.3%',   up: true,  sub: 'captured, written back to Shopify' },
    { label: 'GMV · 30d',           value: '$2.68M', delta: '+14.8%',   up: true,  sub: 'through BestCheckout' },
    { label: 'Chargeback rate',     value: '0.42%',  delta: '-0.08 pts',up: true,  sub: '3DS on high-risk orders', good: 'down' },
  ],

  TREND: {
    dates:      ['May 12','May 16','May 20','May 24','May 28','Jun 1','Jun 5','Jun 9','Jun 13','Jun 17','Jun 21','Jun 25'],
    conversion: [57.8, 58.6, 59.9, 59.2, 60.8, 61.7, 61.3, 62.6, 63.1, 63.8, 63.4, 64.4],
    orders:     [232, 246, 258, 251, 270, 285, 281, 298, 305, 312, 309, 328],
  },

  AI_RECS: [
    { tone: 'blue',   title: 'Add a free-shipping order bump on the checkout page', impact: 'Est. AOV +$3.10 / order' },
    { tone: 'violet', title: 'Add a downsell after the “Sleep Bundle” upsell', impact: 'Est. +9.8% recovered on upsell declines' },
    { tone: 'amber',  title: 'Default repeat customers to Subscribe & Save 15%', impact: 'Est. subscription rate +6 pts' },
    { tone: 'green',  title: 'Collapse the checkout to a single step', impact: 'Est. conversion +2.4 pts' },
  ],

  ACTIVITY: [
    { who: 'Upsell',       what: 'accepted — Calm Tea added at 15% off',                when: '2 min ago',  tag: '+$19.00',  tone: 'green'  },
    { who: 'Order bump',   what: 'free-shipping protection added at checkout',          when: '15 min ago', tag: '+$2.99',   tone: 'amber'  },
    { who: 'Downsell',     what: 'Magnesium 30ct accepted after the upsell decline',    when: '1 hr ago',   tag: '+$16.00',  tone: 'violet' },
    { who: 'Checkout',     what: 'order completed, written back to Shopify (#1042)',     when: '1 hr ago',   tag: 'paid',     tone: 'blue'   },
    { who: 'Subscription', what: 'new Daily Greens monthly started from the checkout',  when: '2 hr ago',   tag: 'recurring',tone: 'green'  },
  ],

  // ---- Payment routing ----
  GATEWAYS: [
    { id: 'g1', title: 'Stripe-US-1',        processor: 'Stripe',     category: 'Corp A · US',  mid: 'acct_1Q8…', cap: 500000, mtd: 312400, approval: 93.8, dr: 2.9, txn: 0.30, cbFee: 15, cards: 'V · M · A · D', status: 'active' },
    { id: 'g2', title: 'Adyen-EU-2',         processor: 'Adyen',      category: 'Corp A · EU',  mid: 'CHKMrc…',   cap: 400000, mtd: 268900, approval: 94.6, dr: 3.1, txn: 0.11, cbFee: 18, cards: 'V · M · A',     status: 'active' },
    { id: 'g3', title: 'NMI-US-1 · high-risk',processor: 'NMI',       category: 'Corp B · US',  mid: '987432',    cap: 250000, mtd: 188200, approval: 88.1, dr: 4.2, txn: 0.25, cbFee: 25, cards: 'V · M',         status: 'active' },
    { id: 'g4', title: 'Airwallex-Global',   processor: 'Airwallex',  category: 'Corp A · GL',  mid: 'awx_44…',   cap: 350000, mtd:  96300, approval: 91.2, dr: 3.0, txn: 0.20, cbFee: 18, cards: 'V · M · A · D', status: 'active' },
    { id: 'g5', title: 'PayPal Commerce',    processor: 'PayPal',     category: 'Wallet',       mid: 'PPC-77…',   cap: 0,      mtd: 142100, approval: 96.0, dr: 3.4, txn: 0.00, cbFee: 20, cards: 'Wallet',        status: 'active' },
    { id: 'g6', title: 'Stripe-EU-bk',       processor: 'Stripe',     category: 'Corp A · EU',  mid: 'acct_1R…', cap: 200000, mtd:   4200, approval: 92.9, dr: 2.9, txn: 0.30, cbFee: 15, cards: 'V · M · A · D', status: 'backup' },
  ],
  ROUTING_RULES: [
    { name: 'EU cards → Adyen-EU-2',          algorithm: 'Geolocation → Weighted', cond: 'Ship country in EU · any card',     cascade: 'Soft-cascade (≤5)', status: 'on' },
    { name: 'High-ticket > $200 → Stripe-US', algorithm: 'Priority queue',         cond: 'Amount ≥ $200 · US',                cascade: 'Soft-cascade (≤5)', status: 'on' },
    { name: 'AmEx → NMI-US-1',                algorithm: 'BIN routing',            cond: 'Card brand = AmEx',                 cascade: 'Soft-cascade (≤5)', status: 'on' },
    { name: 'Intelligent BIN (everything else)', algorithm: 'Intelligent (3★)',   cond: 'Default · by historical approval',  cascade: 'Soft-cascade (≤5)', status: 'on' },
    { name: 'Load-balance US 60/40',          algorithm: 'Weighted',               cond: 'US · Visa/MC',                      cascade: '—',                 status: 'off' },
  ],
  CASCADE_NOTE: 'Soft declines auto-retry to the next-best MID — up to 5 attempts, never the same MID twice. Hard declines stop immediately.',
  RECYCLE: [
    { n: 'Attempt 1', wait: '+3 days',  reduce: 'full price' },
    { n: 'Attempt 2', wait: '+5 days',  reduce: '−$10' },
    { n: 'Attempt 3', wait: '+7 days',  reduce: '−$10' },
    { n: 'Extended 4–9', wait: 'cascade to backup MID', reduce: 'continue reductions' },
  ],
  RECYCLE_NOTE: 'Failed rebills auto-retry with price-reduction + waiting interval (soft declines only) — up to 9 attempts before “Recycle failed”.',

  // ---- Subscriptions ----
  SUBSCRIPTIONS: [
    { id: 's1', customer: 'Amanda Lee',    product: 'Daily Greens',     freq: 'Monthly',    cycle: 4, nextBill: '2026-07-02', amount: 39.97, status: 'active',   mid: 'Stripe-US-1' },
    { id: 's2', customer: 'Michael Brown', product: 'Sleep Bundle',     freq: 'Bi-monthly', cycle: 2, nextBill: '2026-07-09', amount: 64.00, status: 'active',   mid: 'Adyen-EU-2'  },
    { id: 's3', customer: 'Jessica Taylor',product: 'Magnesium',        freq: 'Monthly',    cycle: 1, nextBill: '2026-06-28', amount: 24.00, status: 'trial',    mid: 'Stripe-US-1' },
    { id: 's4', customer: 'Daniel Wilson', product: 'Daily Greens',     freq: 'Monthly',    cycle: 7, nextBill: '2026-06-26', amount: 39.97, status: 'recycle',  mid: 'NMI-US-1'    },
    { id: 's5', customer: 'Sophie Martin', product: 'Protein Refill',   freq: 'Monthly',    cycle: 3, nextBill: '2026-07-01', amount: 49.00, status: 'active',   mid: 'Airwallex'   },
    { id: 's6', customer: 'Liam Garcia',   product: 'Sleep Bundle',     freq: 'Monthly',    cycle: 5, nextBill: '—',          amount: 32.00, status: 'cancelled',mid: '—'           },
    { id: 's7', customer: 'Emma Davis',    product: 'Daily Greens',     freq: 'Bi-monthly', cycle: 2, nextBill: '2026-07-14', amount: 72.00, status: 'active',   mid: 'Stripe-US-1' },
    { id: 's8', customer: 'Noah Miller',   product: 'Magnesium',        freq: 'Monthly',    cycle: 9, nextBill: '—',          amount: 24.00, status: 'recycle_failed', mid: 'NMI-US-1' },
  ],
  SUB_TABS: [
    { key: 'all', label: 'All' }, { key: 'trial', label: 'Trial' }, { key: 'active', label: 'Active' },
    { key: 'recycle', label: 'Recycle' }, { key: 'cancelled', label: 'Cancelled' },
  ],
  SUB_PROFILES: [
    { name: 'Subscribe & Save 15%', product: 'Daily Greens',   freqs: 'Monthly / Bi-monthly', discount: '15%', subs: 1240 },
    { name: 'Sleep Club',           product: 'Sleep Bundle',    freqs: 'Monthly',              discount: '10%', subs:  612 },
    { name: 'Refill auto-ship',     product: 'Protein Refill',  freqs: 'Monthly',              discount: '12%', subs:  388 },
  ],
  CHURN_STEPS: [
    { step: '1 · Initial offer',     offer: '20% off the next 3 orders',        kept: '34%' },
    { step: '2 · Reason',            offer: 'Why are you leaving? (single pick)', kept: '—'  },
    { step: '3 · Skip / delay',      offer: 'Skip next shipment · delay 30 days', kept: '21%' },
    { step: '4 · Change frequency',  offer: 'Switch monthly → bi-monthly',       kept: '11%' },
    { step: '5 · Final confirm',     offer: 'Confirm cancel / keep subscription', kept: '—'  },
  ],

  // ---- Post-purchase ----
  POST_PURCHASE: [
    { name: 'Sleep Bundle upsell',     type: 'Upsell',     trigger: 'After checkout',    product: 'Magnesium + Tea',  discount: '15%', take: '21.4%', status: 'on' },
    { name: 'Half-size downsell',      type: 'Downsell',   trigger: 'On upsell decline', product: 'Magnesium 30ct',   discount: '20%', take: '9.8%',  status: 'on' },
    { name: 'Free shipping bump',      type: 'Order bump', trigger: 'In checkout',       product: 'Shipping protect', discount: '—',   take: '38.2%', status: 'on' },
    { name: 'Subscribe & Save bump',   type: 'Order bump', trigger: 'In checkout',       product: 'Daily Greens sub', discount: '15%', take: '17.5%', status: 'on' },
    { name: 'Second-product upsell',   type: 'Upsell',     trigger: 'After upsell #1',   product: 'Protein Refill',   discount: '10%', take: '12.1%', status: 'off' },
  ],

  // ---- Connection hub (the Shopify bridge — Phase 1 only, removed at Phase 2) ----
  // The four bridge concerns that a full BestShopio merchant never sees, all in one place:
  // ① authorization (OAuth)  ② Shopify data auto-sync  ③ checkout injection (App Embed)  ④ checkout domain.
  CONNECT: {
    platform: 'Shopify', shop: 'lavender-labs.myshopify.com', status: 'needs attention',
    mode: 'External checkout (redirect)', plan: 'Shopify Basic', connectedSince: '2026-05-28', lastSync: '2 min ago',
    health: {
      status: 'Needs attention', tone: 'amber',
      title: '4 areas need attention',
      detail: 'Checkout is still available, but a few Shopify bridge checks need a quick fix before you ramp traffic.',
    },
    authorization: {
      status: 'authorized', tone: 'green',
      title: 'Authorization active',
      detail: 'BestCheckout was authorized during setup. No merchant action is needed unless the app is uninstalled or Shopify reports missing permissions.',
      secondary: 'Review scopes',
    },
    // ① OAuth scopes granted at install (custom distribution — no App Store review)
    scopes: [
      { name: 'read_products',                  why: 'Auto-sync products, variants & collections from Shopify' },
      { name: 'read_orders, write_orders',       why: 'Write paid orders back to Shopify to trigger fulfillment' },
      { name: 'read_inventory',                  why: 'Read inventory — Shopify stays source of truth' },
      { name: 'read_price_rules',              why: 'Auto-sync discounts from Shopify' },
      { name: 'read_shipping',                   why: 'Auto-sync shipping zones & rates from Shopify' },
      { name: 'read_customers',                why: 'Auto-sync customers for checkout and A/B rules' },
    ],
    // ② Shopify data auto-sync — dir: pull (Shopify→BestCheckout) for catalog data; push only for paid orders
    entities: [
      { name: 'Products & variants', dir: 'pull', sot: 'Shopify',      count: 1310, last: '2 min ago',       status: 'in sync' },
      { name: 'Collections',         dir: 'pull', sot: 'Shopify',      count: 48,   last: 'queued',          status: 'pending', tone: 'amber', issue: 'Automatic sync is queued. No action is needed.' },
      { name: 'Discounts',           dir: 'pull', sot: 'Shopify',      count: 23,   last: 'failed 18 min ago', status: 'failed', tone: 'red', issue: 'Automatic sync failed. We will keep retrying on schedule; you can retry now.', action: 'Retry auto-sync' },
      { name: 'Shipping rates',      dir: 'pull', sot: 'Shopify',      count: 9,    last: 'failed 12 min ago', status: 'failed', tone: 'red', issue: 'Automatic sync failed. We will keep retrying on schedule; you can retry now.', action: 'Retry auto-sync' },
      { name: 'Inventory',           dir: 'pull', sot: 'Shopify',      count: 1310, last: '4 min ago',       status: 'in sync', note: 'Fulfillment apps decrement stock on Shopify, so Shopify stays the source of truth.' },
      { name: 'Orders',              dir: 'push', sot: 'BestCheckout', count: 8420, last: 'just now',        status: 'in sync', note: 'Paid BestCheckout orders write back to Shopify and trigger the installed fulfillment app.' },
      { name: 'Customers',           dir: 'pull', sot: 'Shopify',      count: 215,  last: 'queued',          status: 'pending', tone: 'amber', issue: 'Automatic sync is queued. No action is needed.' },
    ],
    webhooks: [
      { topic: 'orders/create', last: '2 min ago', ok: true },
      { topic: 'orders/paid', last: 'failed 6 min ago', ok: false, error: 'Callback signature failed after webhook secret rotation.', action: 'Retry webhook' },
      { topic: 'products/update', last: 'failed 11 min ago', ok: false, error: 'Callback signature failed after the OAuth token refresh window.', action: 'Retry webhook' },
      { topic: 'inventory_levels/update', last: '4 min ago', ok: true },
      { topic: 'customers/update', last: '1 hr ago', ok: true },
    ],
    // ③ checkout injection — Theme App Extension (App Embed), no theme code edits
    embed: {
      enabled: true, health: 'not detected', tone: 'red', theme: 'Shrine PRO', lastSeen: '17 min ago',
      issue: 'The App Embed was not detected on the live Shopify theme. It may have been removed during a theme change; reinstall it to restore checkout interception.',
      intercept: ['Cart page — “Checkout” button', 'Product page — “Buy it now”', 'Cart drawer — express checkout'],
      ab: { split: 50, sendToBestCheckout: 'Repeat customers · AOV ≥ $80 · EU cards', sendToShopify: 'Everyone else (control group)' },
    },
    // ④ checkout domain — the branded subdomain orders redirect to (Phase 1; replaced by main-domain switch at Phase 2)
    domain: { sub: 'checkout.lavenderlabs.co', cname: 'cname.bestcheckout.app', status: 'DNS not verified', tone: 'amber', issue: 'CNAME is not resolving yet. Buyers stay on Shopify checkout until this domain is verified.' },
  },

  // ---- Migration (Phase 1 → Phase 2): unlock the full platform, switch the main domain ----
  MIGRATE: {
    share: 68, // % of orders now running through BestCheckout
    preflight: [
      { name: 'Products & variants', detail: '1,310 auto-synced from Shopify', ok: true },
      { name: 'Collections',         detail: '48 auto-synced',                        ok: true },
      { name: 'Discounts',           detail: '23 rules auto-synced',                  ok: true },
      { name: 'Shipping rates',      detail: '9 rates auto-synced',                   ok: true },
      { name: 'Orders & customers',  detail: '8,420 orders · 215 customers',     ok: true },
    ],
    steps: [
      { n: '1', tone: 'g', title: 'Your data is already here', detail: 'Products, discounts, shipping and customers sync automatically from Shopify. Paid BestCheckout orders are already here and write back to Shopify.' },
      { n: '2', tone: 'b', title: 'Stand up your storefront', detail: 'Spin up a BestShopio storefront with the same visual builder, pre-filled with your catalog. Adjust the theme — no rebuild.' },
      { n: '3', tone: 'a', title: 'Switch your main domain', detail: 'Repoint your main domain (now on Shopify) to BestShopio, with automatic SSL. This is the one real cut-over.' },
    ],
  },

  // ---- Reports ----
  RETENTION: [
    { cycle: 'Cycle 1', purchases: 3544, attempted: 3544, approvals: 3544, recycleSave: 0,   retention: '100%',  net: '$112,400' },
    { cycle: 'Cycle 2', purchases: 3544, attempted: 3120, approvals: 2647, recycleSave: 182, retention: '74.8%', net: '$83,200' },
    { cycle: 'Cycle 3', purchases: 3544, attempted: 2540, approvals: 2118, recycleSave: 141, retention: '59.8%', net: '$66,900' },
    { cycle: 'Cycle 4', purchases: 3544, attempted: 2010, approvals: 1702, recycleSave: 118, retention: '48.0%', net: '$54,100' },
    { cycle: 'Cycle 5+', purchases: 3544, attempted: 1580, approvals: 1361, recycleSave: 96, retention: '38.4%', net: '$121,800' },
  ],
  CARD_BIN: [
    { bin: '424242', brand: 'Visa',       bank: 'Chase',           approval: '94.1%', rb: '88.3%', cb: '0.31%', overall: '91.2%' },
    { bin: '516844', brand: 'Mastercard', bank: 'Capital One',     approval: '92.7%', rb: '86.1%', cb: '0.44%', overall: '89.4%' },
    { bin: '378282', brand: 'AmEx',       bank: 'American Express', approval: '87.9%', rb: '82.0%', cb: '0.52%', overall: '85.0%' },
    { bin: '601100', brand: 'Discover',   bank: 'Discover',        approval: '90.3%', rb: '84.5%', cb: '0.38%', overall: '87.4%' },
    { bin: '455673', brand: 'Visa',       bank: 'BBVA (EU)',       approval: '95.2%', rb: '90.1%', cb: '0.22%', overall: '92.7%' },
  ],

  // ---- Funnel editor (checkout & post-purchase funnel) ----
  FUNNEL: {
    name: 'Magnesium — Sleep Funnel',
    domain: 'checkout.lavenderlabs.co',
    steps: [
      { id: 'st1', type: 'lead', name: 'Lead page', sub: 'Pre-sell / ad lander', x: 30, y: 250, blocks: [
        { id: 'b1', type: 'hero',     props: { headline: 'Sleep better in 7 nights', sub: 'Doctor-formulated magnesium blend', cta: 'Shop now' } },
        { id: 'b2', type: 'features', props: { title: 'Why 12,000+ people switched' } },
        { id: 'b3', type: 'reviews',  props: { title: '4.8 · 12,480 reviews' } },
        { id: 'b4', type: 'button',   props: { label: 'Get 30% off today', color: '#3b6fd4' } },
      ] },
      { id: 'st2', type: 'checkout', name: 'Checkout', sub: 'Single-page · order bump', locked: true, x: 250, y: 250, blocks: [
        { id: 'b1', type: 'logo',        props: { text: 'Lavender Labs' } },
        { id: 'b2', type: 'contact',     props: { title: 'Contact' } },
        { id: 'b3', type: 'shipping',    props: { title: 'Shipping address' } },
        { id: 'b4', type: 'orderBump',   props: { title: 'Add shipping protection', price: '2.99' } },
        { id: 'b5', type: 'payment',     props: { title: 'Payment' } },
        { id: 'b6', type: 'cartSummary', props: { title: 'Order summary' } },
      ] },
      { id: 'st3', type: 'upsell', name: 'Upsell #1', sub: 'New customer · Calm Tea 15% off', x: 480, y: 70, blocks: [
        { id: 'b1', type: 'timer',    props: { minutes: '10', text: 'This one-time offer expires in' } },
        { id: 'b2', type: 'headline', props: { text: 'Wait! Add Calm Tea at 15% off' } },
        { id: 'b3', type: 'product',  props: { name: 'Calm Tea', price: '19.00', compareAt: '24.00' } },
        { id: 'b4', type: 'yesno',    props: { yes: 'Yes, add to my order', no: 'No thanks' } },
      ] },
      { id: 'st4', type: 'downsell', name: 'Downsell', sub: 'On decline · 30ct 20% off', x: 720, y: 70, blocks: [
        { id: 'b1', type: 'headline', props: { text: 'Try a smaller size at 20% off' } },
        { id: 'b2', type: 'product',  props: { name: 'Magnesium 30ct', price: '16.00', compareAt: '20.00' } },
        { id: 'b3', type: 'yesno',    props: { yes: 'Add the smaller size', no: 'No thanks' } },
      ] },
      { id: 'st5', type: 'upsell', name: 'Upsell #2', sub: 'Repeat customer · Protein 10% off', x: 480, y: 430, blocks: [
        { id: 'b1', type: 'headline', props: { text: 'One more: Protein Refill, 10% off' } },
        { id: 'b2', type: 'product',  props: { name: 'Protein Refill', price: '44.00', compareAt: '49.00' } },
        { id: 'b3', type: 'yesno',    props: { yes: 'Add to my order', no: 'No thanks' } },
      ] },
      { id: 'st6', type: 'thankyou', name: 'Thank you', sub: 'Receipt · write back to Shopify', locked: true, x: 950, y: 250, blocks: [
        { id: 'b1', type: 'headline',    props: { text: 'Thank you for your order!' } },
        { id: 'b2', type: 'cartSummary', props: { title: 'Your order' } },
        { id: 'b3', type: 'tracking',    props: { title: 'Track your shipment' } },
      ] },
    ],
    edges: [
      { id: 'e1', from: 'st1', to: 'st2', button: 'Get 30% off today', products: [], tags: [], matchAll: false, includePrev: false, countries: [], customers: 'all' },
      { id: 'e2', from: 'st2', to: 'st3', button: 'Complete My Order', products: ['(496) Premium Edition – $59.99', '(497) Order Bump – $27.90'], tags: [], matchAll: true, includePrev: false, countries: [], customers: 'new' },
      { id: 'e3', from: 'st2', to: 'st5', button: 'Complete My Order', products: [], tags: [], matchAll: false, includePrev: false, countries: [], customers: 'repeat' },
      { id: 'e4', from: 'st3', to: 'st6', button: 'Yes, add to my order', products: [], tags: [], matchAll: false, includePrev: false, countries: [], customers: 'all' },
      { id: 'e5', from: 'st3', to: 'st4', button: 'No thanks', products: [], tags: [], matchAll: false, includePrev: false, countries: [], customers: 'all' },
      { id: 'e6', from: 'st4', to: 'st6', button: 'Complete', products: [], tags: [], matchAll: false, includePrev: false, countries: [], customers: 'all' },
      { id: 'e7', from: 'st5', to: 'st6', button: 'Yes, add to my order', products: [], tags: [], matchAll: false, includePrev: false, countries: [], customers: 'all' },
    ],
    palette: [
      { type: 'presell',  name: 'Presell page' },
      { type: 'lead',     name: 'Lead page' },
      { type: 'checkout', name: 'Checkout page' },
      { type: 'upsell',   name: 'Upsell page' },
      { type: 'downsell', name: 'Downsell page' },
      { type: 'thankyou', name: 'Thank you page' },
    ],
    // blocks you can drop onto a page (in the page editor)
    blockTypes: [
      { type: 'headline', name: 'Headline' },
      { type: 'text',     name: 'Text' },
      { type: 'image',    name: 'Image' },
      { type: 'product',  name: 'Product' },
      { type: 'button',   name: 'Button' },
      { type: 'yesno',    name: 'Yes / No buttons' },
      { type: 'orderBump',name: 'Order bump' },
      { type: 'timer',    name: 'Countdown timer' },
      { type: 'reviews',  name: 'Reviews' },
      { type: 'features',  name: 'Feature list' },
      { type: 'hero',     name: 'Hero' },
    ],
  },
};
