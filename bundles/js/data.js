/* BestShopio Admin · Bundles — mock data (V1.143, rebuilt to the agreed model).
   A bundle = a PDP purchase-area offer attached to a PARENT PRODUCT. The widget
   TEMPLATE decides both the BOM shape and the storefront rendering. Bundles carry
   NO subscription rules — subscription lives entirely in the Subscriptions plan
   that picks this bundle's product. The discount lands in the shared offer engine
   (mocked here), never a shadow discount record. */
window.DATA_BUNDLES = {
  templates: [
    { value: 'volume', label: 'Volume · Buy X Get Y',       desc: 'Same product, quantity tiers (1 / 2-pack / 3-pack + gifts).', auto: true },
    { value: 'ab',     label: 'Mix & Match · A+B Set',      desc: 'Two products sold together as a complete look.',             auto: false },
    // 'fbt' (Frequently Bought Together) and 'box' (Build-a-box) are retired for now — the A+B set covers the "bought together" case.
  ],
  badges: ['Most Popular', 'Best Deal', 'Limited Time', 'Family Deal', 'Best Value'],

  bundles: [
    { id: 'BND-01', name: 'Focus Gum — Multipack',       parentProduct: 'Neurix Focus & Energy Gum', template: 'volume', status: 'active', tierCount: 3, orders: 312, createdAt: '2026-05-01' },
    { id: 'BND-02', name: 'Coffee Lovers 3-Pack',        parentProduct: 'Signature Blend Coffee',     parentProductId: 50501, template: 'volume', status: 'draft',  tierCount: 3, orders: 0,   createdAt: '2026-06-01' },
    { id: 'BND-03', name: 'Complete Wellness Set',       parentProduct: 'High Waist Leggings',        parentProductId: 50412, template: 'ab',     status: 'active', tierCount: 2, orders: 148, createdAt: '2026-05-10' },
    { id: 'BND-04', name: 'Yoga Outfit — Top + Legging', parentProduct: 'High Waist Leggings',        parentProductId: 50412, template: 'ab',     status: 'draft',  tierCount: 2, orders: 0,   createdAt: '2026-06-09' },
    { id: 'BND-05', name: 'Leggings Starter Kit',        parentProduct: 'High Waist Leggings',        parentProductId: 50412, template: 'volume', status: 'draft',  tierCount: 3, orders: 0,   createdAt: '2026-06-15' },
    { id: 'BND-06', name: 'Focus Gum Trial Bundle',      parentProduct: 'Neurix Focus & Energy Gum', template: 'volume', status: 'draft',  tierCount: 2, orders: 0,   createdAt: '2026-06-16' },
    { id: 'BND-07', name: 'Coffee Office Pack',          parentProduct: 'Coffee Office Pack',         parentProductId: 50506, template: 'volume', status: 'active', tierCount: 3, orders: 42,  createdAt: '2026-06-17' },
    { id: 'BND-08', name: 'Coffee Weekend Pack',         parentProduct: 'Coffee Office Pack',         parentProductId: 50506, template: 'volume', status: 'draft',  tierCount: 2, orders: 0,   createdAt: '2026-06-18' },
  ],

  // detail samples loaded when editing / used as starting points
  samples: {
    volume: {
      parentProduct: 'Neurix Focus & Energy Gum', brandColor: '#8a5a2b', defaultTier: 1,
      header: { text: 'The offer ends tonight!', align: 'center', line: true, thickness: 2 },
      tiers: [
        { qty: 1, title: '1 PC',  subtitle: '',                       price: 34.99, compareAt: 49,  badge: '',             components: [{ role: 'main', product: 'Neurix Focus & Energy Gum', qty: 1, displayName: '' }] },
        { qty: 2, title: '2 PCS', subtitle: 'One to wear, one to wash.', price: 49.30, compareAt: 98,  badge: 'Most Popular', tag: '50% OFF', components: [{ role: 'main', product: 'Neurix Focus & Energy Gum', qty: 2, displayName: '' }, { role: 'gift', product: 'Focus E-Book', qty: 1, displayName: 'FREE E-Book' }] },
        { qty: 3, title: '3 PCS', subtitle: '',                       price: 69.60, compareAt: 147, badge: 'Best Value', tag: 'Save 30%',   components: [{ role: 'main', product: 'Neurix Focus & Energy Gum', qty: 3, displayName: '' }, { role: 'gift', product: 'Focus E-Book', qty: 1, displayName: 'FREE E-Book' }, { role: 'gift', product: 'Shaker Bottle', qty: 1, displayName: 'FREE Shaker', variants: 2 }] },
      ],
    },
    ab: {
      parentProduct: 'High Waist Leggings', brandColor: '#8a5a2b', defaultTier: 1,
      header: { text: 'Complete the look', align: 'center', line: false, thickness: 2 },
      tiers: [
        { qty: 1, title: '', subtitle: '', price: 29,    compareAt: 39, badge: '',         components: [{ role: 'main', product: 'High Waist Leggings', qty: 1, displayName: '' }] },
        { qty: 2, title: 'Frequently Bought Together', subtitle: '', price: 49.30, compareAt: 78, badge: 'Save $15', components: [{ role: 'main', product: 'High Waist Leggings', qty: 1, displayName: '' }, { role: 'main', product: 'Impact Sports Bra', qty: 1, displayName: '' }] },
      ],
    },
    fbt: {
      parentProduct: 'Neurix Focus & Energy Gum', brandColor: '#8a5a2b',
      header: { text: 'Frequently bought together', align: 'center', line: false, thickness: 2 },
      tiers: [
        { qty: 1, title: '', subtitle: '', price: 54.99, compareAt: 69, badge: '', components: [
          { role: 'main', product: 'Neurix Focus & Energy Gum', qty: 1, displayName: '' },
          { role: 'main', product: 'Shaker Bottle',            qty: 1, displayName: '' },
          { role: 'main', product: 'Focus Capsules',           qty: 1, displayName: '' },
        ] },
      ],
    },
    box: {
      parentProduct: 'Build Your Wellness Box', brandColor: '#3f6b34',
      header: { text: 'Build your box', align: 'center', line: true, thickness: 2 },
      boxSize: 4, pricingMode: 'percent', pricingValue: 15,
      pool: ['Peppermint Gum', 'Spearmint Gum', 'Watermelon Gum', 'Ginger Gum', 'Energy Drink Mix', 'Focus Capsules', 'Sleep Gummies', 'Greens Powder'],
    },
  },

  pricingModes: [
    { value: 'fixed',    label: 'Fixed box price' },
    { value: 'per_item', label: 'Sum of item prices' },
    { value: 'percent',  label: 'Percent off the box' },
  ],
};
