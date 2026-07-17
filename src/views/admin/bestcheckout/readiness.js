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
  const funnelPagesReady = Boolean(funnel) && funnel.nodes.filter((node) => node.pageId).every((node) => pageIsPublished(state, node.pageId));
  const funnelReady = Boolean(funnel) && funnelPagesReady && funnel.guardrails && funnel.guardrails.graph === 'Ready';
  const bindings = (funnel && funnel.paymentRouteBindings) || [];
  const paymentReady = bindings.length > 0 && bindings.every((binding) => {
    const provider = state.providers.find((item) => item.id === binding.providerId);
    return provider && provider.status === 'Connected' && binding.status === 'Verified' && binding.authorizationState === 'Verified' && binding.webhookState === 'Verified' && binding.testPaymentState === 'Passed';
  });
  const trackingReady = Array.isArray(state.tracking) && state.tracking.length > 0 && state.tracking.every((item) => item.state === 'Healthy');
  const prerequisiteReady = domainReady && checkoutPageReady && funnelReady && paymentReady && trackingReady;
  const hostedTraffic = funnel && (funnel.runtimeTraffic || { hosted: funnel.hostedTraffic }).hosted;
  const live = Boolean(funnel && funnel.status === 'Live' && hostedTraffic > 0);
  const checks = [
    check('page', 'pages', 2, 'Published Checkout page', '已发布的 Checkout 页面', checkoutPageReady, 'At least one Checkout page has a published version.', '至少已有一个 Checkout 页面版本已发布。', 'Publish a Checkout page version for the Funnel to use.', '发布一个供漏斗使用的 Checkout 页面版本。', 'Page version service', '页面版本服务'),
    check('funnel', funnel ? 'funnels/' + funnel.id : 'funnels', 2, 'Funnel configuration', '漏斗配置', funnelReady, 'Funnel pages and graph validation are ready.', '漏斗页面与路径校验均已就绪。', 'Add the Checkout and post-purchase path, then resolve graph validation.', '添加 Checkout 与购后路径，并完成路径校验。', 'Funnel graph validation', '漏斗路径校验'),
    check('domain', 'settings?tab=domain', 1, 'Checkout domain', 'Checkout 域名', domainReady, 'DNS and SSL are verified.', 'DNS 与 SSL 已验证。', 'Add the checkout subdomain record, then let DNS and SSL verification finish.', '添加 checkout 二级域名解析，等待 DNS 与 SSL 验证完成。', 'DNS + SSL monitor', 'DNS + SSL 监控'),
    check('payments', 'settings?tab=payments', 1, 'Payment routing', '支付路由', paymentReady, 'Required provider capabilities, webhooks and test payments passed.', '所需的支付能力、Webhook 与测试支付均已通过。', 'Connect the required providers and pass capability, webhook and test-payment checks.', '连接所需支付机构，并通过能力、Webhook 与测试支付校验。', 'Payment capability check', '支付能力校验'),
    check('tracking', 'settings?tab=attribution', 1, 'Conversion tracking', '转化归因', trackingReady, 'All configured conversion destinations are healthy.', '所有已配置的转化目的地均健康。', 'Resolve consent, ownership or server-event review for the discovered destinations.', '处理已发现目的地的同意、归属或服务端事件审核。', 'Tracking health monitor', '归因健康监控'),
  ];
  const launch = {
    id: 'launch', route: funnel ? 'funnels/' + funnel.id : 'funnels', minutes: 3,
    title: live ? 'Funnel live' : 'Publish readiness', titleZh: live ? '漏斗已上线' : '发布准备',
    state: live ? 'complete' : prerequisiteReady ? 'ready' : 'blocked',
    ready: live || prerequisiteReady,
    detail: live ? 'Hosted traffic is live and Shopify native checkout remains the safety path.' : prerequisiteReady ? 'All required checks passed. You can run a safe preview and publish traffic.' : 'Publishing is blocked until the required system checks pass.',
    detailZh: live ? '已开始承接托管流量，Shopify 原生 Checkout 仍是安全路径。' : prerequisiteReady ? '所有必需校验已通过，可以进行安全预览并发布流量。' : '发布会在所有必需系统校验通过前保持阻止。',
    source: live ? 'Live deployment monitor' : 'Publish guardrails', sourceZh: live ? '线上部署监控' : '发布护栏',
  };
  return { checks, launch, live, requiredReady: prerequisiteReady, completeCount: checks.filter((item) => item.state === 'complete').length + (live ? 1 : 0) };
}
