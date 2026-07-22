/* Merchant-visible history only. Connection internals and platform monitoring
   stay in the BestCheckout operations console. */
(function () {
  window.DATA_ACTIVITY = [
    { at: '2026-07-20T10:42:00', type: 'Flow', title: 'Published “First order booster”', detail: 'New buyers can now see the checkout and an optional one-click offer.', status: 'Published' },
    { at: '2026-07-20T09:16:00', type: 'Order', title: 'Order #BC-10482 sent to Shopify', detail: 'Paid order was created in your Shopify admin and is ready for fulfillment.', status: 'Completed' },
    { at: '2026-07-19T17:08:00', type: 'Page', title: 'Updated Thank you page', detail: 'The order confirmation message and recommended product block were changed.', status: 'Published' },
    { at: '2026-07-19T14:21:00', type: 'Payment', title: 'Stripe is ready to accept payments', detail: 'Your payment service passed the connection check.', status: 'Completed' },
    { at: '2026-07-19T11:05:00', type: 'Flow', title: 'Saved “Returning customer offer”', detail: 'The flow is saved as a draft and is not live yet.', status: 'Draft' },
    { at: '2026-07-18T16:32:00', type: 'Domain', title: 'Checkout domain connected', detail: 'Customers can now open checkout.lavenderlabs.co securely.', status: 'Completed' },
    { at: '2026-07-18T13:18:00', type: 'Order', title: 'Order #BC-10476 sent to Shopify', detail: 'Paid order was created in your Shopify admin and is ready for fulfillment.', status: 'Completed' },
    { at: '2026-07-18T10:46:00', type: 'Page', title: 'Published “Aura checkout”', detail: 'The checkout page is now available to the flow that uses it.', status: 'Published' },
    { at: '2026-07-17T18:04:00', type: 'Payment', title: 'PayPal needs your attention', detail: 'Reconnect the account before new buyers can choose PayPal at checkout.', status: 'Needs attention' },
    { at: '2026-07-17T15:37:00', type: 'Store', title: 'Shopify store connected', detail: 'Products, discounts, and shipping options are ready for checkout setup.', status: 'Completed' },
    { at: '2026-07-17T12:20:00', type: 'Flow', title: 'Enabled one-click upsell', detail: 'Eligible buyers can accept the offer after payment without entering details again.', status: 'Published' },
    { at: '2026-07-16T16:52:00', type: 'Order', title: 'Order #BC-10461 sent to Shopify', detail: 'Paid order was created in your Shopify admin and is ready for fulfillment.', status: 'Completed' },
    { at: '2026-07-16T11:18:00', type: 'Store', title: 'Checkout catalog updated', detail: 'Your latest available products and discounts can now be used in purchase flows.', status: 'Completed' },
    { at: '2026-07-15T14:06:00', type: 'Page', title: 'Saved checkout page draft', detail: 'The draft remains private until you publish it.', status: 'Draft' },
    { at: '2026-07-15T09:34:00', type: 'Flow', title: 'Disabled abandoned flow', detail: 'Customers who no longer match the flow now continue to your default checkout.', status: 'Completed' },
    { at: '2026-07-14T18:16:00', type: 'Domain', title: 'Renewed checkout domain certificate', detail: 'checkout.lavenderlabs.co will remain available to buyers without interruption.', status: 'Completed' },
    { at: '2026-07-14T09:30:00', type: 'Payment', title: 'Airwallex connection verified', detail: 'Card and express checkout are ready to accept payments.', status: 'Completed' },
    { at: '2026-07-13T16:42:00', type: 'Page', title: 'Published order bump on checkout', detail: 'Added shipping protection as an optional item before payment.', status: 'Published' },
    { at: '2026-07-12T13:05:00', type: 'Flow', title: 'Updated first-order boost routing', detail: 'New customers now receive the intended checkout allocation.', status: 'Published' },
    { at: '2026-07-11T10:24:00', type: 'Order', title: 'Order #BC-10439 sent to Shopify', detail: 'Paid order was created in your Shopify admin and is ready for fulfillment.', status: 'Completed' },
    { at: '2026-07-10T15:18:00', type: 'Store', title: 'Shopify delivery options synced', detail: 'Updated delivery methods are ready for checkout.', status: 'Completed' },
    { at: '2026-07-09T11:36:00', type: 'Payment', title: 'PayPal payment method enabled', detail: 'Eligible buyers can now choose PayPal at checkout.', status: 'Completed' }
  ];
}());
