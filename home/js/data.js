/* BestShopio Admin - Home dashboard mock.
   Period summaries are intentionally aggregated here so Home stays independent
   from the lazy-loaded Analytics workspace. */
(function () {
  window.DATA_HOME = {
    periods: {
      '7d': {
        label: 'Last 7 days',
        comparison: 'vs previous 7 days',
        metrics: [
          { title: 'Sales through BestCheckout', value: '$117,284', change: '+16.7%' },
          { title: 'Completed orders', value: '2,016', change: '+14.9%' },
          { title: 'Checkout conversion', value: '63.8%', change: '+4.7 pts' },
          { title: 'Additional offer sales', value: '$15,448', change: '+13.2%' }
        ],
        series: [13200, 14860, 15520, 16140, 17280, 18310, 21974],
        labels: ['Jul 9', 'Jul 10', 'Jul 11', 'Jul 12', 'Jul 13', 'Jul 14', 'Jul 15'],
        flows: [
          { name: 'First-order boost', sessions: '742', orders: '498', conversion: '67.1%', aov: '$62.40', sales: '$31,075', lift: '+6.4 pts', id: 'first-order-boost' },
          { name: 'Smooth checkout', sessions: '1,274', orders: '812', conversion: '63.7%', aov: '$55.75', sales: '$45,269', lift: '+4.1 pts', id: 'smooth-checkout' }
        ],
        offers: [
          { type: 'Upsell', title: 'Sleep Bundle offer', rate: '21.4%', sales: '$8,642', note: 'Shoppers accepted after payment', tone: 'blue' },
          { type: 'Downsell', title: 'Half-size alternative', rate: '9.8%', sales: '$2,910', note: 'Recovered after the first offer was declined', tone: 'violet' },
          { type: 'Order bump', title: 'Shipping protection', rate: '38.2%', sales: '$3,896', note: 'Added during checkout', tone: 'amber' }
        ]
      },
      '30d': {
        label: 'Last 30 days',
        comparison: 'vs previous 30 days',
        metrics: [
          { title: 'Sales through BestCheckout', value: '$490,044', change: '+18.4%' },
          { title: 'Completed orders', value: '8,420', change: '+17.8%' },
          { title: 'Checkout conversion', value: '64.2%', change: '+5.1 pts' },
          { title: 'Additional offer sales', value: '$63,180', change: '+12.9%' }
        ],
        series: [14120, 15240, 14980, 16040, 17120, 16980, 18140, 18820, 20160, 21040, 21870, 23120],
        labels: ['Jun 24', 'Jun 27', 'Jun 30', 'Jul 3', 'Jul 6', 'Jul 9', 'Jul 12', 'Jul 15'],
        flows: [
          { name: 'First-order boost', sessions: '3,116', orders: '2,116', conversion: '67.9%', aov: '$62.40', sales: '$132,038', lift: '+6.4 pts', id: 'first-order-boost' },
          { name: 'Smooth checkout', sessions: '5,304', orders: '3,405', conversion: '64.2%', aov: '$55.75', sales: '$189,859', lift: '+4.8 pts', id: 'smooth-checkout' }
        ],
        offers: [
          { type: 'Upsell', title: 'Sleep Bundle offer', rate: '21.4%', sales: '$35,120', note: 'Shoppers accepted after payment', tone: 'blue' },
          { type: 'Downsell', title: 'Half-size alternative', rate: '9.8%', sales: '$11,240', note: 'Recovered after the first offer was declined', tone: 'violet' },
          { type: 'Order bump', title: 'Shipping protection', rate: '38.2%', sales: '$16,820', note: 'Added during checkout', tone: 'amber' }
        ]
      },
      '90d': {
        label: 'Last 90 days',
        comparison: 'vs previous 90 days',
        metrics: [
          { title: 'Sales through BestCheckout', value: '$1,367,890', change: '+15.2%' },
          { title: 'Completed orders', value: '23,470', change: '+13.6%' },
          { title: 'Checkout conversion', value: '62.9%', change: '+4.3 pts' },
          { title: 'Additional offer sales', value: '$166,740', change: '+12.2%' }
        ],
        series: [138800, 143220, 148140, 150680, 154920, 160140, 163480, 169030, 174920, 181340, 187220, 196000],
        labels: ['Apr 17', 'May 1', 'May 15', 'May 29', 'Jun 12', 'Jun 26', 'Jul 10', 'Jul 15'],
        flows: [
          { name: 'First-order boost', sessions: '8,576', orders: '5,742', conversion: '66.9%', aov: '$62.18', sales: '$357,082', lift: '+5.9 pts', id: 'first-order-boost' },
          { name: 'Smooth checkout', sessions: '14,894', orders: '9,373', conversion: '62.9%', aov: '$55.94', sales: '$524,404', lift: '+4.2 pts', id: 'smooth-checkout' }
        ],
        offers: [
          { type: 'Upsell', title: 'Sleep Bundle offer', rate: '21.4%', sales: '$92,750', note: 'Shoppers accepted after payment', tone: 'blue' },
          { type: 'Downsell', title: 'Half-size alternative', rate: '9.8%', sales: '$29,380', note: 'Recovered after the first offer was declined', tone: 'violet' },
          { type: 'Order bump', title: 'Shipping protection', rate: '38.2%', sales: '$44,610', note: 'Added during checkout', tone: 'amber' }
        ]
      }
    },
    storeHealth: [
      { label: 'Shopify connection', value: 'Connected', detail: 'lavender-labs.myshopify.com', tone: 'ok', href: '#/settings/base' },
      { label: 'Payment services', value: '3 ready', detail: 'Airwallex, Stripe, PayPal', tone: 'ok', href: '#/payments' },
      { label: 'Checkout domain', value: 'Connected', detail: 'checkout.lavenderlabs.co', tone: 'ok', href: '#/domains' },
      { key: 'flows', label: 'Purchase flows', href: '#/flows' }
    ],
    update: {
      version: 'Next step',
      title: 'Preview the live checkout before sending traffic.',
      detail: 'Publish only the purchase flow you want buyers to enter.',
      href: '#/flows'
    }
  };
}());
