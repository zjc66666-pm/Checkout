// Mock data + nav config for the Analytics prototype.
window.DATA = (function () {
  // ---- Sidebar navigation (mirrors bestvoy-admin + new Analytics group) ----
  const NAV = {
    main: [
      { id: 'orders', label: 'Orders', icon: 'inbox', route: '#/m/orders' },
      { id: 'products', label: 'Products', icon: 'tag', children: [
        { label: 'Collections', route: '#/m/collections' },
        { label: 'Reviews', route: '#/m/reviews' },
      ] },
      { id: 'customers', label: 'Customers', icon: 'userPen', route: '#/m/customers' },
      { id: 'discounts', label: 'Discounts', icon: 'badgePercent', route: '#/m/discount' },
      { id: 'content', label: 'Content', icon: 'newspaper', children: [
        { label: 'Blog', route: '#/m/blog' },
        { label: 'Page', route: '#/m/page' },
        { label: 'Menu', route: '#/m/menu' },
      ] },
      { id: 'analytics', label: 'Analytics', icon: 'analytics', route: '#/analytics/overview', children: [
        { label: 'Reports', route: '#/analytics/reports' },
        { label: 'Live View', route: '#/analytics/live' },
      ] },
      { id: 'online_store', label: 'Online store', icon: 'globe', route: '#/m/online-store' },
      { id: 'google', label: 'Google', icon: 'google', route: '#/m/google' },
    ],
    footer: [{ id: 'settings', label: 'Settings', icon: 'settings', route: '#/m/settings' }],
  };

  // ---- Overview KPIs (top summary cards) ----
  const KPIS = [
    { key: 'total_sales', label: 'Sales', value: '$1,825,125.27', delta: '+9.4%', up: true },
    { key: 'orders', label: 'Orders', value: '31,553', delta: '+2.6%', up: true },
    { key: 'aov', label: 'Average order value', value: '$55.95', delta: '+1.1%', up: true },
    { key: 'returning_rate', label: 'Returning customer rate', value: '17.27%', delta: '-0.8%', up: false },
  ];

  // ---- Total sales over time (May 1–26) ----
  const SALES_TREND = {
    dates: ['May 1','May 2','May 3','May 4','May 5','May 6','May 7','May 8','May 9','May 10','May 11','May 12','May 13','May 14','May 15','May 16','May 17','May 18','May 19','May 20','May 21','May 22','May 23','May 24','May 25','May 26'],
    values: [89808,88240,88219,81908,84054,80272,80791,80300,84486,85945,73356,73766,76485,72246,76627,77950,77413,64249,77263,77256,86845,87413,94092,91638,88460,82984],
    total: '$1,825,125.27',
  };

  // ---- Total sales breakdown (waterfall list) ----
  const BREAKDOWN = [
    { label: 'Gross sales', value: '$2,122,079.57', strong: false },
    { label: 'Discounts', value: '-$336,917.52', neg: true },
    { label: 'Returns', value: '-$17,700.53', neg: true },
    { label: 'Net sales', value: '$1,767,461.52', strong: true },
    { label: 'Shipping charges', value: '$56,311.86' },
    { label: 'Return fees', value: '$0.00' },
    { label: 'Taxes', value: '$1,351.89' },
    { label: 'Total sales', value: '$1,825,125.27', strong: true },
  ];

  // ---- Sales by channel (donut) ----
  const SALES_BY_CHANNEL = [
    { name: 'Online Store', value: 1790000 },
    { name: 'Shop', value: 26200 },
    { name: 'Draft Orders', value: 166 },
  ];

  // ---- AOV over time ----
  const AOV_TREND = {
    dates: SALES_TREND.dates,
    values: [56.1,55.8,55.9,54.2,55.0,54.1,54.6,54.0,55.2,55.7,52.9,53.1,53.8,52.4,53.6,54.0,53.7,50.2,53.3,53.3,55.9,56.1,57.8,57.0,56.2,55.0],
    value: '$55.95',
  };

  // ---- Sessions over time (behavior / 神策) ----
  const SESSIONS_TREND = {
    dates: SALES_TREND.dates,
    values: [52000,51200,51100,49000,50300,48200,48800,48400,50600,51500,44100,44500,46200,43800,46100,47000,46700,39000,46500,46400,52600,53000,57100,55600,53800,50300],
    total: '1,326,165',
  };

  // ---- Conversion funnel ----
  const FUNNEL = [
    { stage: 'Sessions', pct: '100%', value: '1,326,165' },
    { stage: 'Added to cart', pct: '1.19%', value: '15,852' },
    { stage: 'Reached checkout', pct: '4.27%', value: '56,721' },
    { stage: 'Completed checkout', pct: '2.3%', value: '30,559' },
  ];

  // ---- Conversion rate over time (behavior / 神策) ----
  const CONV_RATE_TREND = {
    dates: SALES_TREND.dates,
    values: [2.82, 2.9, 2.42, 2.22, 2.23, 2.16, 2.39, 2.25, 2.75, 2.66, 2.03, 1.93, 2.43, 2.39, 2.19, 2.31, 2.34, 1.96, 2.1, 1.86, 2.16, 2.27, 2.75, 2.62, 2.23, 1.91],
    value: '2.3%',
  };
  // ---- Referrer breakdowns ----
  const SALES_BY_REFERRER = [
    { name: 'None · None', value: 1460000 },
    { name: 'search · google', value: 134700 },
    { name: 'social · facebook', value: 81000 },
    { name: 'None · silixwear', value: 74100 },
    { name: 'None · android', value: 20900 },
  ];
  const SESSIONS_BY_REFERRER = [
    { name: 'Direct · None', value: 30600 },
    { name: 'Social · facebook', value: 18000 },
    { name: 'Direct · Chicago', value: 13500 },
    { name: 'Direct · Atlanta', value: 11800 },
    { name: 'Direct · Houston', value: 11000 },
  ];
  const PERF_BY_CHANNEL = [
    { channel: 'Direct', sessions: '612,840', orders: '14,231', sales: '$846,210' },
    { channel: 'Search', sessions: '298,420', orders: '8,902', sales: '$512,330' },
    { channel: 'Social', sessions: '256,110', orders: '5,418', sales: '$331,870' },
    { channel: 'Email', sessions: '88,540', orders: '2,104', sales: '$128,640' },
    { channel: 'Referral', sessions: '41,200', orders: '986', sales: '$59,430' },
  ];
  // ---- City coords for Live View globe ([lon, lat]) ----
  const CITY_COORDS = [
    [-112.07, 33.45], [-118.24, 34.05], [-87.63, 41.88], [-74.0, 40.71], [-95.37, 29.76],
    [-122.42, 37.77], [-80.19, 25.76], [-0.13, 51.5], [151.2, -33.87], [139.69, 35.69],
    [-79.38, 43.65], [13.4, 52.52], [2.35, 48.85], [103.82, 1.35], [-99.13, 19.43],
  ];

  // ---- Total sales by product (commerce) ----
  const SALES_BY_PRODUCT = [
    { name: '3D Anti-Cellulite Leggings · Silix', value: 1310000 },
    { name: 'Silix Pocket 3D Sculpting Leggings', value: 187100 },
    { name: 'Silix 3D Compression Sleeves', value: 75500 },
    { name: '3D Anti-Cellulite Short Leggings', value: 68400 },
    { name: 'SILIX Butt-Lifting Pocket Capris', value: 48100 },
  ];

  // ---- Sessions by device (behavior / 神策) ----
  const SESSIONS_BY_DEVICE = [
    { name: 'Mobile', value: 1200000 },
    { name: 'Desktop', value: 100900 },
    { name: 'Tablet', value: 24600 },
    { name: 'Other', value: 15 },
  ];

  // ---- Sessions by location (behavior / 神策) ----
  const SESSIONS_BY_LOCATION = [
    { name: 'US · Illinois · Chicago', value: 21500 },
    { name: 'AU · New South Wales · Sydney', value: 18300 },
    { name: 'US · Georgia · Atlanta', value: 16400 },
    { name: 'US · Texas · Houston', value: 15600 },
    { name: 'AU · Victoria · Melbourne', value: 15200 },
  ];

  // ---- Total sales by social referrer ----
  const SOCIAL_REFERRER = [
    { name: 'facebook', value: 453900 },
    { name: 'youtube', value: 7300 },
    { name: 'instagram', value: 3400 },
    { name: 'pinterest', value: 900 },
  ];

  // ---- Sessions by landing page (behavior / 神策) ----
  const LANDING_PAGES = [
    { page: '/products/3d-anti-cellulite-legging', value: 1134380 },
    { page: '/products/silix-high-waist-tummy-control', value: 52947 },
    { page: '/  (Homepage)', value: 20821 },
    { page: '/products/3d-anti-cellulite-short-leggings', value: 18453 },
    { page: '/apps/bestrack', value: 12685 },
  ];

  // ---- Products by sell-through rate ----
  const SELL_THROUGH = [
    { name: 'Silix 3D Compression Sleeves · Black', pct: 100 },
    { name: '3D Anti-Cellulite Leggings · Black / L', pct: 96 },
    { name: '3D Anti-Cellulite Leggings · Black / XL', pct: 92 },
    { name: '3D Anti-Cellulite Leggings · Black / M', pct: 88 },
    { name: '3D Anti-Cellulite Leggings · Black / XXL', pct: 81 },
  ];

  // ---- Customer cohort analysis (retention %; null = future month) ----
  const COHORT = {
    cohorts: ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026'],
    matrix: [
      [2.07, 2.53, 0.82, 0.62, 0.36, 0.51, 0.20, 0.41],
      [2.66, 2.32, 1.21, 0.99, 1.77, 1.33, 0.88, null],
      [3.45, 4.78, 1.89, 1.67, 1.22, 1.00, null, null],
      [4.45, 4.51, 3.57, 2.63, 1.50, null, null, null],
      [4.30, 12.65, 10.45, 5.90, null, null, null, null],
      [4.19, 12.89, 7.58, null, null, null, null, null],
      [5.72, 9.52, null, null, null, null, null, null],
      [4.97, null, null, null, null, null, null, null],
    ],
  };

  // ---- New Overview metric trends + breakdowns (mock; behavior = 神策待建) ----
  const PAGEVIEWS_TREND = { dates: SALES_TREND.dates, values: SESSIONS_TREND.values.map((v) => Math.round(v * 2.3)), total: '3,042,118' };
  const PAID_AMOUNT_TREND = { dates: SALES_TREND.dates, values: SALES_TREND.values.map((v) => Math.round(v * 0.98)), total: '$1,786,402' };
  const REFUND_TREND = { dates: SALES_TREND.dates, values: SALES_TREND.values.map((v, i) => -Math.round(v * (i === 20 ? 0.085 : 0.002))), total: '-$17,701' };
  const MARKETING_SALES_TREND = { dates: SALES_TREND.dates, values: SALES_TREND.values.map((v) => Math.round(v * 0.43)), total: '$781,930' };
  const ORDERS_FULFILLED_TREND = { dates: SALES_TREND.dates, values: SESSIONS_TREND.values.map((v) => Math.round(v / 40)), total: '32,638' };
  const SESSIONS_BY_COUNTRY = [{ name: 'United States', value: 21500 }, { name: 'Australia', value: 4800 }, { name: 'United Kingdom', value: 3200 }, { name: 'Canada', value: 2100 }, { name: 'Germany', value: 1500 }];
  const SESSIONS_BY_TRAFFIC = [{ name: 'Other', value: 14200 }, { name: 'Direct', value: 6100 }, { name: 'Social', value: 1800 }, { name: 'Search', value: 920 }];
  const SESSIONS_BY_SOCIAL = [{ name: 'facebook', value: 18000 }, { name: 'instagram', value: 12000 }, { name: 'snapchat', value: 820 }];

  // ---- Product data details (bespoke report; views/funnel = 神策待建) ----
  // commerce 真实可落: name/sku/qty/sales/orders ; behavior 待神策: views/funnel
  const PRODUCT_DATA = [
    { name: '3D Anti-Cellulite Leggings', sku: 'SX-3DACL-01', qty: 8420, sales: 1310000, pct: 71.8, orders: 6900, views: 1134380 },
    { name: 'Silix Pocket 3D Sculpting Leggings', sku: 'SX-P3DSL-02', qty: 1180, sales: 187100, pct: 10.3, orders: 980, views: 152947 },
    { name: 'Silix 3D Compression Sleeves', sku: 'BB-3DCS-03', qty: 620, sales: 75500, pct: 4.1, orders: 540, views: 48400 },
    { name: '3D Anti-Cellulite Short Leggings', sku: 'SX-3DASL-04', qty: 540, sales: 68400, pct: 3.7, orders: 470, views: 41200 },
    { name: 'SILIX Butt-Lifting Pocket Capris', sku: 'FL-BLPC-05', qty: 410, sales: 48100, pct: 2.6, orders: 360, views: 33800 },
    { name: 'Seamless High-Waist Briefs', sku: 'LV-SHWB-06', qty: 380, sales: 32600, pct: 1.8, orders: 300, views: 27500 },
    { name: 'Silix Sport Bra Pro', sku: 'FL-SBP-07', qty: 290, sales: 28900, pct: 1.6, orders: 240, views: 21900 },
    { name: 'Compression Maternity Leggings', sku: 'BB-CML-08', qty: 240, sales: 24100, pct: 1.3, orders: 210, views: 18600 },
    { name: 'Silix Ankle Support Sleeve', sku: 'MN-ASS-09', qty: 180, sales: 12800, pct: 0.7, orders: 150, views: 12685 },
    { name: 'Silix Yoga Flow Pants', sku: 'SX-YFP-10', qty: 120, sales: 9400, pct: 0.5, orders: 100, views: 8900 },
    { name: 'Silix Seamless Camisole', sku: 'LV-SSC-11', qty: 90, sales: 6300, pct: 0.3, orders: 80, views: 6400 },
    { name: 'Silix Knee Compression Band', sku: 'MN-KCB-12', qty: 60, sales: 3900, pct: 0.2, orders: 55, views: 4100 },
  ];
  const VARIANT_DATA = [
    { spec: 'Black / S', sku: 'SX-3DACL-BLK-S', product: '3D Anti-Cellulite Leggings', qty: 1820, sales: 280400, pct: 15.4 },
    { spec: 'Black / M', sku: 'SX-3DACL-BLK-M', product: '3D Anti-Cellulite Leggings', qty: 1640, sales: 252600, pct: 13.8 },
    { spec: 'Black / L', sku: 'SX-3DACL-BLK-L', product: '3D Anti-Cellulite Leggings', qty: 1510, sales: 232500, pct: 12.7 },
    { spec: 'Black / XL', sku: 'SX-3DACL-BLK-XL', product: '3D Anti-Cellulite Leggings', qty: 980, sales: 150900, pct: 8.3 },
    { spec: 'Grey / M', sku: 'SX-3DACL-GRY-M', product: '3D Anti-Cellulite Leggings', qty: 740, sales: 113900, pct: 6.2 },
    { spec: 'Grey / L', sku: 'SX-3DACL-GRY-L', product: '3D Anti-Cellulite Leggings', qty: 690, sales: 106200, pct: 5.8 },
    { spec: 'Black / M', sku: 'SX-P3DSL-BLK-M', product: 'Silix Pocket 3D Sculpting Leggings', qty: 520, sales: 82400, pct: 4.5 },
    { spec: 'Black / L', sku: 'SX-P3DSL-BLK-L', product: 'Silix Pocket 3D Sculpting Leggings', qty: 480, sales: 76100, pct: 4.2 },
    { spec: 'One Size', sku: 'BB-3DCS-OS', product: 'Silix 3D Compression Sleeves', qty: 620, sales: 75500, pct: 4.1 },
    { spec: 'Black / S', sku: 'SX-3DASL-BLK-S', product: '3D Anti-Cellulite Short Leggings', qty: 300, sales: 38000, pct: 2.1 },
    { spec: 'Black / M', sku: 'SX-3DASL-BLK-M', product: '3D Anti-Cellulite Short Leggings', qty: 240, sales: 30400, pct: 1.7 },
    { spec: 'Nude / M', sku: 'FL-BLPC-NUD-M', product: 'SILIX Butt-Lifting Pocket Capris', qty: 230, sales: 27000, pct: 1.5 },
    { spec: 'Black / L', sku: 'FL-BLPC-BLK-L', product: 'SILIX Butt-Lifting Pocket Capris', qty: 180, sales: 21100, pct: 1.2 },
    { spec: 'Beige / M', sku: 'LV-SHWB-BEI-M', product: 'Seamless High-Waist Briefs', qty: 200, sales: 17200, pct: 0.9 },
  ];

  // ---- Traffic acquisition: By country/region (bespoke; behavior = 神策待建) ----
  const COUNTRY_TRAFFIC = [
    { country: 'United States', sessions: 1134380, atc: 13900, checkout: 8400, completed: 6810 },
    { country: 'Australia', sessions: 152947, atc: 1880, checkout: 1130, completed: 905 },
    { country: 'United Kingdom', sessions: 64210, atc: 760, checkout: 450, completed: 360 },
    { country: 'Canada', sessions: 41200, atc: 510, checkout: 300, completed: 245 },
    { country: 'Germany', sessions: 33800, atc: 410, checkout: 240, completed: 190 },
    { country: 'New Zealand', sessions: 27500, atc: 320, checkout: 190, completed: 150 },
    { country: 'Singapore', sessions: 21900, atc: 250, checkout: 150, completed: 120 },
    { country: 'Ireland', sessions: 18600, atc: 210, checkout: 130, completed: 100 },
    { country: 'Philippines', sessions: 12685, atc: 60, checkout: 24, completed: 11 },
    { country: 'France', sessions: 9800, atc: 110, checkout: 66, completed: 53 },
    { country: 'Hongkong', sessions: 8400, atc: 95, checkout: 56, completed: 45 },
    { country: 'Viet Nam', sessions: 7600, atc: 34, checkout: 20, completed: 8 },
    { country: 'India', sessions: 6900, atc: 30, checkout: 15, completed: 7 },
    { country: 'Pakistan', sessions: 5400, atc: 22, checkout: 8, completed: 4 },
    { country: 'Netherlands', sessions: 4200, atc: 48, checkout: 28, completed: 22 },
    { country: 'Mexico', sessions: 3100, atc: 22, checkout: 12, completed: 9 },
  ];

  // The report renderer is shared with BestShopio, but this registry is intentionally
  // limited to decisions a BestCheckout merchant can make in this product.
  const REPORTS = [
    { id: 'sales_over_time', name: 'Checkout sales over time', cat: 'Checkout performance', source: 'Commerce', by: 'System', viewed: '2026-05-29', viz: 'line', metrics: ['total_sales'], dims: ['day'] },
    { id: 'orders_over_time', name: 'Completed orders over time', cat: 'Checkout performance', source: 'Commerce', by: 'System', viewed: '2026-05-28', viz: 'line', metrics: ['orders'], dims: ['day'] },
    { id: 'aov_over_time', name: 'Average order value over time', cat: 'Checkout performance', source: 'Commerce', by: 'System', viewed: '2026-05-25', viz: 'line', metrics: ['aov'], dims: ['day'] },
    { id: 'conversion_funnel', name: 'Checkout conversion funnel', cat: 'Purchase flows', source: 'Behavior', by: 'System', viewed: '2026-05-27', viz: 'funnel', metrics: ['sessions'], dims: ['funnel_step'] },
    { id: 'conversion_rate_over_time', name: 'Checkout conversion trend', cat: 'Purchase flows', source: 'Behavior', by: 'System', viewed: '2026-05-26', viz: 'line', metrics: ['conversion_rate'], dims: ['day'] },
    { id: 'sales_by_discount', name: 'Offer performance by discount', cat: 'Offers', source: 'Commerce', by: 'System', viewed: '2026-05-24', viz: 'table', metrics: ['orders', 'discounts', 'gross_sales'], dims: ['discount_code'] },
    { id: 'payment_success_rate', name: 'Payment success by service', cat: 'Payments', source: 'Commerce', by: 'System', viewed: '2026-05-25', viz: 'table', metrics: ['payment_success_rate'], dims: ['payment_channel'] },
    { id: 'performance_by_channel', name: 'Purchase flow traffic by source', cat: 'Traffic', source: 'Behavior', by: 'System', viewed: '2026-05-23', viz: 'table', metrics: ['sessions', 'orders', 'attributed_sales'], dims: ['channel'] },
    { id: 'sessions_by_landing', name: 'Landing page conversion', cat: 'Traffic', source: 'Behavior', by: 'System', viewed: '2026-05-20', viz: 'table', metrics: ['sessions', 'conversion_rate'], dims: ['landing_page'] },
  ];

  const REPORT_CATEGORIES = ['Checkout performance', 'Purchase flows', 'Offers', 'Payments', 'Traffic'];

  // Semantic-layer catalog — drives the Edit drawer + Manage filters pickers (per source; fixed-template reports only)
  const CATALOG = {
    Commerce: {
      metrics: ['total_sales', 'gross_sales', 'net_sales', 'discounts', 'returns', 'taxes', 'orders', 'aov', 'units_sold', 'gross_profit', 'refunds', 'customers', 'new_customers', 'total_spent', 'inventory', 'sell_through_rate', 'avg_rating'],
      dimensions: ['day', 'week', 'month', 'product_title', 'variant', 'channel', 'billing_country', 'currency', 'discount_code', 'payment_method', 'fulfillment_status', 'customer_type', 'order_no'],
    },
    Behavior: {
      metrics: ['sessions', 'visitors', 'page_views', 'conversion_rate', 'add_to_cart_rate', 'bounce_rate', 'attributed_sales', 'users', 'retention_rate'],
      dimensions: ['day', 'device', 'os', 'browser', 'city', 'country', 'landing_page', 'referrer', 'utm_source', 'utm_campaign', 'social_referrer', 'funnel_step', 'path_step'],
    },
  };

  return { NAV, KPIS, SALES_TREND, BREAKDOWN, SALES_BY_CHANNEL, AOV_TREND, SESSIONS_TREND, FUNNEL, CONV_RATE_TREND, SALES_BY_REFERRER, SESSIONS_BY_REFERRER, PERF_BY_CHANNEL, CITY_COORDS, SALES_BY_PRODUCT, SESSIONS_BY_DEVICE, SESSIONS_BY_LOCATION, SOCIAL_REFERRER, LANDING_PAGES, SELL_THROUGH, COHORT, PAGEVIEWS_TREND, PAID_AMOUNT_TREND, REFUND_TREND, MARKETING_SALES_TREND, ORDERS_FULFILLED_TREND, SESSIONS_BY_COUNTRY, SESSIONS_BY_TRAFFIC, SESSIONS_BY_SOCIAL, PRODUCT_DATA, VARIANT_DATA, COUNTRY_TRAFFIC, REPORTS, REPORT_CATEGORIES, CATALOG };
})();
