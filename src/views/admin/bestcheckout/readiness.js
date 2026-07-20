/*
 * System-owned launch readiness.  These checks are derived from the same
 * resources used at publish time; merchants never tick a setup item complete.
 */

function pageIsPublished(state, pageId) {
  const page = state.pages.find((item) => item.id === pageId);
  return Boolean(page && page.publishedVersionId);
}

function primaryConfiguredFunnel(state) {
  return state.funnels.find((funnel) => funnel.nodes && funnel.nodes.some((node) => node.kind === 'checkout')) || null;
}

function check(id, route, minutes, title, titleZh, ready, readyDetail, readyDetailZh, actionDetail, actionDetailZh, source, sourceZh) {
  return {
    id, route, minutes, title, titleZh, ready, source, sourceZh,
    state: ready ? 'complete' : 'action_required',
    detail: ready ? readyDetail : actionDetail,
    detailZh: ready ? readyDetailZh : actionDetailZh,
  };
}

export function getSetupReadiness(state) {
  const funnel = primaryConfiguredFunnel(state);
  const domainReady = state.store.domainStatus === 'Verified' && state.store.sslStatus === 'Active';
  const checkoutPageReady = state.pages.some((page) => page.type === 'checkout' && page.publishedVersionId);
  const thankYouPageReady = state.pages.some((page) => page.type === 'thank-you' && page.publishedVersionId);
  const journeyPagesReady = checkoutPageReady && thankYouPageReady;
  const funnelPagesReady = Boolean(funnel) && funnel.nodes.filter((node) => node.pageId).every((node) => pageIsPublished(state, node.pageId));
  const funnelReady = Boolean(funnel) && funnelPagesReady && funnel.guardrails && funnel.guardrails.graph === 'Ready';
  const bindings = (funnel && funnel.paymentRouteBindings) || [];
  const paymentReady = bindings.length > 0 && bindings.every((binding) => {
    const provider = state.providers.find((item) => item.id === binding.providerId);
    return provider && provider.status === 'Connected' && binding.status === 'Verified' && binding.authorizationState === 'Verified' && binding.webhookState === 'Verified' && binding.testPaymentState === 'Passed';
  });
  const trackingReady = Array.isArray(state.tracking) && state.tracking.length > 0 && state.tracking.every((item) => item.state === 'Healthy');
  const prerequisiteReady = domainReady && journeyPagesReady && funnelReady && paymentReady && trackingReady;
  const hostedTraffic = funnel && (funnel.runtimeTraffic || { hosted: funnel.hostedTraffic }).hosted;
  const live = Boolean(funnel && funnel.status === 'Live' && hostedTraffic > 0);
  const checks = [
    check('page', 'pages', 2, 'Set Checkout and Thank you pages', '设置 Checkout 与 Thank you 页面', journeyPagesReady, 'Your Checkout and Thank you pages are ready to go live.', 'Checkout 与 Thank you 页面已准备上线。', 'Create and publish the Checkout page buyers use to pay, plus the Thank you page they see after payment.', '创建并发布买家付款时使用的 Checkout 页面，以及付款成功后看到的 Thank you 页面。', 'Page version service', '页面版本服务'),
    check('funnel', funnel ? 'funnels/' + funnel.id : 'funnels', 2, 'Set purchase flow', '设置购买流程', funnelReady, 'Your purchase flow is ready for buyers to complete their order.', '购买流程已准备好，买家可以顺利完成下单。', 'Connect the Checkout page, optional Upsell and Downsell offers, and Thank you page into one complete purchase flow.', '把 Checkout 页面、可选的 Upsell / Downsell，以及 Thank you 页面连成一条完整的购买路径。', 'Funnel graph validation', '漏斗路径校验'),
    check('domain', 'settings?tab=domain', 1, 'Set checkout address', '设置结账网址', domainReady, 'Your checkout address is connected and ready to use.', '结账网址已连接，可以正常访问。', 'Set a branded address for your checkout and follow the instructions to connect it.', '为结账页设置你的品牌网址，并按指引完成连接。', 'DNS + SSL monitor', 'DNS + SSL 监控'),
    check('payments', 'settings?tab=payments', 1, 'Set payment methods', '设置收款方式', paymentReady, 'Your payment methods are connected and ready to accept payments.', '收款方式已连接，可以正常收款。', 'Connect the payment methods you want to offer buyers, then complete a test payment.', '连接你要提供给买家的收款方式，并完成一次测试付款。', 'Payment capability check', '支付能力校验'),
    check('tracking', 'settings?tab=attribution', 1, 'Set conversion tracking', '设置订单转化追踪', trackingReady, 'Your order conversions are being recorded normally.', '订单转化已开始正常记录。', 'Connect your advertising or analytics tools and confirm order conversions can be recorded.', '连接广告或数据分析工具，确认订单转化可以正常记录。', 'Tracking health monitor', '归因健康监控'),
  ];
  const launch = {
    id: 'launch', route: funnel ? 'funnels/' + funnel.id : 'funnels', minutes: 3,
    title: live ? 'Checkout live' : 'Ready to publish', titleZh: live ? '结账页已上线' : '准备发布',
    state: live ? 'complete' : prerequisiteReady ? 'ready' : 'blocked',
    ready: live || prerequisiteReady,
    detail: live ? 'Your checkout is receiving buyers. Shopify native checkout remains available as a fallback.' : prerequisiteReady ? 'Everything is ready. Preview and publish your checkout when you are ready.' : 'Complete the setup above before publishing your checkout.',
    detailZh: live ? '你的结账页正在承接买家。Shopify 原生结账仍可作为备用路径。' : prerequisiteReady ? '所有设置已完成。你可以预览并发布结账页。' : '完成上方设置后，即可发布结账页。',
    source: live ? 'Live deployment monitor' : 'Publish guardrails', sourceZh: live ? '线上部署监控' : '发布护栏',
  };
  return { checks, launch, live, requiredReady: prerequisiteReady, completeCount: checks.filter((item) => item.state === 'complete').length + (live ? 1 : 0) };
}
