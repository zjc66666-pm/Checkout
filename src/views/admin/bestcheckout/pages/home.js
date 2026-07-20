import { badge, banner, button, icon, metricCard, pageHeader, progressBar, routeButton, sectionHeader } from '../components/common.js';
import { getSetupReadiness } from '../readiness.js?rev=20260719-optional-growth-v105';
import { escapeHtml } from '../utils.js';

function renderFunnelRows(state) {
  return state.funnels.map(function (funnel) {
    return '<button type="button" class="overview-funnel-row" data-route="funnels?funnel=' + escapeHtml(funnel.id) + '"><span class="overview-funnel-name"><strong data-i18n-skip>' + escapeHtml(funnel.name) + '</strong><small data-i18n-skip>' + escapeHtml(funnel.audience) + '</small></span><span><small>Conversion</small><strong>' + escapeHtml(funnel.conversion) + '</strong></span><span><small>Average order value</small><strong>' + escapeHtml(funnel.aov) + '</strong></span><span>' + badge(funnel.status) + '</span>' + icon('chevron', 15) + '</button>';
  }).join('');
}

function renderQuickStartLegacy(state) {
  const onboarding = state.onboarding;
  if (!onboarding || onboarding.complete) return '';
  const isZh = state.ui.locale === 'zh';
  const steps = onboarding.steps || [];
  const currentIndex = Math.min(Math.max(0, state.ui.onboardingStep || 0), Math.max(0, steps.length - 1));
  const current = steps[currentIndex] || steps[0];
  const completedCount = currentIndex;
  const completedMinutes = steps.slice(0, currentIndex).reduce(function (total, item) { return total + item.minutes; }, 0);
  const totalMinutes = steps.reduce(function (total, item) { return total + item.minutes; }, 0);
  const stepList = steps.map(function (step, index) {
    const status = index < currentIndex ? ' is-complete' : index === currentIndex ? ' is-current' : '';
    const available = index <= currentIndex;
    return '<button type="button" class="quickstart-step' + status + '"' + (available ? ' data-action="open-onboarding" data-onboarding-step="' + index + '"' : ' disabled aria-disabled="true"') + '><span>' + (index < currentIndex ? icon('check', 13) : index + 1) + '</span><div><strong>' + escapeHtml(isZh ? step.titleZh : step.title) + '</strong><small>' + escapeHtml(index === currentIndex ? (isZh ? step.detailZh : step.detail) : (isZh ? '完成后解锁' : 'Unlocks after the previous step')) + '</small></div><em>' + escapeHtml(isZh ? step.minutes + ' 分钟' : step.minutes + ' min') + '</em></button>';
  }).join('');
  return '<section class="quickstart-card"><div class="quickstart-overview"><div class="quickstart-copy"><span class="quickstart-kicker">' + escapeHtml(isZh ? '10 分钟快速启用' : '10-minute quick start') + '</span><h2>' + escapeHtml(isZh ? '跟着 ' + steps.length + ' 步完成首个可发布漏斗' : 'Get your first Funnel ready in ' + steps.length + ' guided steps') + '</h2><p>' + escapeHtml(isZh ? '只做上线必需的配置；诊断、监控和优化会留在「上线健康度」中持续处理。' : 'Do only what is needed to launch. Ongoing diagnostics and optimization stay in Launch health.') + '</p></div><div class="quickstart-side"><div class="quickstart-progress"><div><strong>' + completedCount + '/' + steps.length + '</strong><span>' + escapeHtml(isZh ? '已完成' : 'complete') + '</span></div><small>' + escapeHtml(isZh ? (totalMinutes - completedMinutes) + ' 分钟剩余' : (totalMinutes - completedMinutes) + ' min remaining') + '</small></div><button type="button" class="button button-primary" data-action="open-onboarding">' + icon('play', 16) + '<span>' + escapeHtml(isZh ? '继续引导' : 'Continue setup') + '</span></button></div></div><div class="quickstart-body"><div class="quickstart-steps" role="list">' + stepList + '</div><aside class="quickstart-current"><span>' + escapeHtml(isZh ? '当前步骤' : 'Current step') + '</span><h3>' + escapeHtml(isZh ? current.titleZh : current.title) + '</h3><p>' + escapeHtml(isZh ? current.detailZh : current.detail) + '</p><div><strong>' + escapeHtml(isZh ? current.minutes + ' 分钟' : current.minutes + ' min') + '</strong><small>' + escapeHtml(isZh ? '完成后自动进入下一步' : 'The next step unlocks when this is complete.') + '</small></div></aside></div></section>';
}

function renderQuickStartManualLegacy(state) {
  const onboarding = state.onboarding;
  if (!onboarding || onboarding.complete) return '';
  const isZh = state.ui.locale === 'zh';
  const steps = onboarding.steps || [];
  const currentIndex = Math.min(Math.max(0, state.ui.onboardingStep || 0), Math.max(0, steps.length - 1));
  const current = steps[currentIndex] || steps[0];
  const completedCount = currentIndex;
  const completedMinutes = steps.slice(0, currentIndex).reduce(function (total, item) { return total + item.minutes; }, 0);
  const totalMinutes = steps.reduce(function (total, item) { return total + item.minutes; }, 0);
  const actionLabel = function (step, index) {
    if (index < currentIndex) return isZh ? '查看配置' : 'Review';
    if (step.id === 'launch') return isZh ? '查看发布检查' : 'View checks';
    return isZh ? '去配置' : 'Configure';
  };
  const statusLabel = function (step, index) {
    if (index < currentIndex) return isZh ? '已完成，可随时回看配置' : 'Complete · review anytime';
    if (index === currentIndex) return isZh ? step.detailZh : step.detail;
    if (step.id === 'launch') return isZh ? '完成必要配置后可在此查看发布检查。' : 'Review launch checks after the required configuration is ready.';
    return isZh ? '可提前完成此项配置；引导进度会保留。' : 'You can configure this now; your guided progress is preserved.';
  };
  const stepList = steps.map(function (step, index) {
    const status = index < currentIndex ? ' is-complete' : index === currentIndex ? ' is-current' : '';
    return '<article class="quickstart-step' + status + '" role="listitem"><span>' + (index < currentIndex ? icon('check', 13) : index + 1) + '</span><div><strong>' + escapeHtml(isZh ? step.titleZh : step.title) + '</strong><small>' + escapeHtml(statusLabel(step, index)) + '</small></div><button type="button" class="quickstart-step-action" data-action="onboarding-open-step" data-step-index="' + index + '" data-target-route="' + escapeHtml(step.route || 'home') + '">' + escapeHtml(actionLabel(step, index)) + icon('chevron', 14) + '</button><em>' + escapeHtml(isZh ? step.minutes + ' 分钟' : step.minutes + ' min') + '</em></article>';
  }).join('');
  const currentAction = '<button type="button" class="button button-primary" data-action="onboarding-open-step" data-step-index="' + currentIndex + '" data-target-route="' + escapeHtml(current.route || 'home') + '">' + icon('arrow', 16) + '<span>' + escapeHtml(actionLabel(current, currentIndex)) + '</span></button>';
  return '<section class="quickstart-card"><div class="quickstart-overview"><div class="quickstart-copy"><span class="quickstart-kicker">' + escapeHtml(isZh ? '10 分钟快速启用' : '10-minute quick start') + '</span><h2>' + escapeHtml(isZh ? '跟着 ' + steps.length + ' 步完成首个可发布漏斗' : 'Get your first Funnel ready in ' + steps.length + ' guided steps') + '</h2><p>' + escapeHtml(isZh ? '每一步都有独立配置入口；可并行的配置可以提前完成，最终发布仍会做完整检查。' : 'Every step has a direct configuration entry. Independent work can be completed early; launch still runs the full readiness check.') + '</p></div><div class="quickstart-side"><div class="quickstart-progress"><div><strong>' + completedCount + '/' + steps.length + '</strong><span>' + escapeHtml(isZh ? '已完成' : 'complete') + '</span></div><small>' + escapeHtml(isZh ? (totalMinutes - completedMinutes) + ' 分钟剩余' : (totalMinutes - completedMinutes) + ' min remaining') + '</small></div><button type="button" class="button button-secondary" data-action="open-onboarding">' + icon('play', 16) + '<span>' + escapeHtml(isZh ? '查看引导' : 'View guide') + '</span></button></div></div><div class="quickstart-body"><div class="quickstart-steps" role="list">' + stepList + '</div><aside class="quickstart-current"><span>' + escapeHtml(isZh ? '当前步骤' : 'Current step') + '</span><h3>' + escapeHtml(isZh ? current.titleZh : current.title) + '</h3><p>' + escapeHtml(isZh ? current.detailZh : current.detail) + '</p><div><strong>' + escapeHtml(isZh ? current.minutes + ' 分钟' : current.minutes + ' min') + '</strong><small>' + escapeHtml(isZh ? '跳转不会自动标记完成；完成后回到此处继续引导。' : 'Opening the task does not mark it complete. Return here to continue the guide.') + '</small></div>' + currentAction + '</aside></div></section>';
}

function renderPrelaunchOverviewLegacy(state) {
  const isZh = state.ui.locale === 'zh';
  const onboarding = state.onboarding;
  const steps = onboarding.steps || [];
  const index = Math.min(Math.max(0, state.ui.onboardingStep || 0), Math.max(0, steps.length - 1));
  const current = steps[index] || steps[0];
  const afterPublish = [
    { icon: 'analytics', title: isZh ? '销售表现' : 'Sales performance', detail: isZh ? '发布后，这里会显示结账转化、客单价和购后收入。' : 'After publishing, see checkout conversion, order value and post-purchase revenue.' },
    { icon: 'activity', title: isZh ? '店铺状态' : 'Store status', detail: isZh ? '结账网址、收款和订单数据会持续更新，方便你及时发现问题。' : 'Keep track of your checkout address, payments and order data.' },
    { icon: 'shield', title: isZh ? '安心上线' : 'Launch with confidence', detail: isZh ? '发布前，买家会继续在 Shopify 原生结账完成付款。' : 'Before publishing, buyers continue through your Shopify checkout.' },
  ].map(function (item) {
    return '<div><span>' + icon(item.icon, 18) + '</span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.detail) + '</small></div>';
  }).join('');
  const nextTitle = isZh ? '完成后你会在这里看到什么' : 'What appears here after you publish';
  const nextDescription = isZh ? '先完成当前步骤「' + current.titleZh + '」，再进行安全测试与发布。' : 'Finish “' + current.title + '”, then run a safe test and publish.';
  const healthTitle = isZh ? '上线健康度' : 'Launch health';
  const healthDescription = isZh ? '首次发布后开始持续监控；启用期间不混入完成状态。' : 'Ongoing monitoring starts after the first publish; setup status stays in Quick start.';
  const healthNoteTitle = isZh ? '会在发布后自动启用' : 'Starts automatically after publishing';
  const healthNoteCopy = isZh ? '域名、支付、追踪、主题劫持和订单回写会显示为需要处理或已完成。' : 'Domain, payments, tracking, theme interception and order writeback will surface as healthy or needing action.';
  return '<section class="overview-dashboard-grid onboarding-dashboard-grid"><div class="overview-dashboard-column"><section class="card"><div class="card-pad">' + sectionHeader(nextTitle, nextDescription) + '<div class="onboarding-after-launch">' + afterPublish + '</div></div></section></div><div class="overview-dashboard-column"><aside class="card onboarding-health-preview"><div class="card-pad">' + sectionHeader(healthTitle, healthDescription) + '<div class="onboarding-health-note"><span>' + icon('activity', 18) + '</span><div><strong>' + escapeHtml(healthNoteTitle) + '</strong><small>' + escapeHtml(healthNoteCopy) + '</small></div></div>' + button(isZh ? '继续快速启用' : 'Continue Quick start', 'open-onboarding', { kind: 'plain', icon: 'play' }) + '</div></aside></div></section>';
}

function setupLabel(state, value) { return state.ui.locale === 'zh' ? value.zh : value.en; }

function setupActionLabel(state, item) {
  if (item.state === 'complete') return setupLabel(state, { en: 'View', zh: '查看' });
  if (item.state === 'ready') return setupLabel(state, { en: 'Preview & publish', zh: '预览并发布' });
  if (item.id === 'launch') return setupLabel(state, { en: 'Publish', zh: '去发布' });
  return setupLabel(state, { en: 'Set up', zh: '去设置' });
}

function setupStateLabel(state, item) {
  if (item.state === 'complete') return setupLabel(state, { en: 'Complete', zh: '已完成' });
  if (item.state === 'ready') return setupLabel(state, { en: 'Ready to publish', zh: '可以发布' });
  if (item.state === 'blocked') return setupLabel(state, { en: 'Finish setup first', zh: '请先完成设置' });
  return setupLabel(state, { en: 'Set up needed', zh: '待设置' });
}

function renderQuickStart(state) {
  const isZh = state.ui.locale === 'zh';
  const readiness = getSetupReadiness(state);
  if (readiness.live) return '';
  const items = readiness.checks;
  const next = items.find((item) => item.state !== 'complete') || readiness.launch;
  const unresolvedMinutes = readiness.checks.filter((item) => item.state !== 'complete').reduce((sum, item) => sum + item.minutes, 0);
  const stepList = items.map(function (item) {
    const stateClass = ' is-' + item.state.replace('_', '-');
    const stateIcon = item.state === 'complete' ? icon('check', 14) : item.state === 'ready' ? icon('play', 14) : icon('alert', 14);
    return '<article class="quickstart-step quickstart-system-check' + stateClass + '" role="listitem"><span>' + stateIcon + '</span><div><strong>' + escapeHtml(isZh ? item.titleZh : item.title) + '</strong><small>' + escapeHtml(isZh ? item.detailZh : item.detail) + '</small></div><em>' + escapeHtml(setupStateLabel(state, item)) + '</em><button type="button" class="quickstart-step-action" data-action="onboarding-open-step" data-target-route="' + escapeHtml(item.route) + '">' + escapeHtml(setupActionLabel(state, item)) + icon('chevron', 14) + '</button></article>';
  }).join('');
  const optionalGrowth = '<article class="quickstart-step quickstart-system-check quickstart-optional-growth" role="listitem"><span>' + icon('sparkles', 14) + '</span><div><strong>' + escapeHtml(isZh ? '添加 Upsell / Downsell（可选）' : 'Add Upsell / Downsell (optional)') + '</strong><small>' + escapeHtml(isZh ? '付款后展示 Upsell；买家拒绝后可用 Downsell 提供替代选择。不影响上线，可随时添加。' : 'Show an Upsell after payment, or a Downsell after an offer is declined. It never delays launch and can be added anytime.') + '</small></div><em>' + escapeHtml(isZh ? '可选' : 'Optional') + '</em><button type="button" class="quickstart-step-action" data-route="funnels">' + escapeHtml(isZh ? '去添加' : 'Add') + icon('chevron', 14) + '</button></article>';
  const nextAction = '<button type="button" class="button button-primary" data-action="onboarding-open-step" data-target-route="' + escapeHtml(next.route) + '">' + icon(next.state === 'ready' ? 'play' : 'arrow', 16) + '<span>' + escapeHtml(setupActionLabel(state, next)) + '</span></button>';
  return '<section class="quickstart-card quickstart-system-card"><div class="quickstart-overview"><div class="quickstart-copy"><span class="quickstart-kicker">' + escapeHtml(isZh ? '准备上线' : 'Get ready to launch') + '</span><h2>' + escapeHtml(isZh ? '完成 ' + items.length + ' 项上线准备' : 'Complete ' + items.length + ' launch tasks') + '</h2></div><div class="quickstart-side"><div class="quickstart-progress"><div><strong>' + readiness.completeCount + '/' + items.length + '</strong><span>' + escapeHtml(isZh ? '已完成' : 'complete') + '</span></div><small>' + escapeHtml(isZh ? '预计约 ' + unresolvedMinutes + ' 分钟' : '~' + unresolvedMinutes + ' min remaining') + '</small></div><button type="button" class="button button-secondary" data-action="open-onboarding">' + icon('shield', 16) + '<span>' + escapeHtml(isZh ? '查看准备事项' : 'View setup tasks') + '</span></button></div></div><div class="quickstart-body"><div class="quickstart-steps quickstart-system-steps" role="list">' + stepList + optionalGrowth + '</div><aside class="quickstart-current quickstart-system-summary"><span>' + escapeHtml(isZh ? '下一步' : 'Next step') + '</span><h3>' + escapeHtml(isZh ? next.titleZh : next.title) + '</h3><p>' + escapeHtml(isZh ? next.detailZh : next.detail) + '</p><div><strong>' + escapeHtml(setupStateLabel(state, next)) + '</strong><small>' + escapeHtml(isZh ? '完成后可继续下一项，无需按固定顺序设置。' : 'Complete tasks in any order, then continue with the next one.') + '</small></div>' + nextAction + '</aside></div></section>';
}

function renderPrelaunchOverview(state) {
  const isZh = state.ui.locale === 'zh';
  const readiness = getSetupReadiness(state);
  const items = readiness.checks;
  const next = items.find((item) => item.state !== 'complete') || readiness.launch;
  const afterPublish = [
    { icon: 'analytics', title: isZh ? '销售表现' : 'Sales performance', detail: isZh ? '发布后，这里会显示结账转化、客单价和购后收入。' : 'After publishing, see checkout conversion, order value and post-purchase revenue.' },
    { icon: 'activity', title: isZh ? '店铺状态' : 'Store status', detail: isZh ? '结账网址、收款和订单数据会持续更新，方便你及时发现问题。' : 'Keep track of your checkout address, payments and order data.' },
    { icon: 'shield', title: isZh ? '安心上线' : 'Launch with confidence', detail: isZh ? '发布前，买家会继续在 Shopify 原生结账完成付款。' : 'Before publishing, buyers continue through your Shopify checkout.' },
  ].map(function (item) { return '<div><span>' + icon(item.icon, 18) + '</span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.detail) + '</small></div>'; }).join('');
  return '<section class="overview-dashboard-grid onboarding-dashboard-grid"><div class="overview-dashboard-column"><section class="card"><div class="card-pad">' + sectionHeader(isZh ? '上线后你可以看到什么' : 'What you can see after launch', isZh ? '完成上方设置后，即可预览并发布结账页。' : 'Complete the setup above, then preview and publish your checkout.') + '<div class="onboarding-after-launch">' + afterPublish + '</div></div></section></div><div class="overview-dashboard-column"><aside class="card onboarding-health-preview"><div class="card-pad">' + sectionHeader(isZh ? '下一步设置' : 'Next setup task', isZh ? '完成以下任一设置后，再继续下一项。' : 'Complete any task below, then move to the next one.') + '<div class="onboarding-health-note"><span>' + icon(next.state === 'complete' ? 'check' : 'alert', 18) + '</span><div><strong>' + escapeHtml(isZh ? next.titleZh : next.title) + '</strong><small>' + escapeHtml(isZh ? next.detailZh : next.detail) + '</small></div></div><button type="button" class="button button-plain" data-action="onboarding-open-step" data-target-route="' + escapeHtml(next.route) + '">' + icon('arrow', 16) + '<span>' + escapeHtml(setupActionLabel(state, next)) + '</span></button></div></aside></div></section>';
}

export function renderHome(state) {
  const isFirstLaunch = !getSetupReadiness(state).live;
  const isZh = state.ui.locale === 'zh';
  const liveFunnel = state.funnels.find(function (item) { return item.status === 'Live'; });
  const primaryFunnel = liveFunnel || state.funnels[0];
  const runtimeTraffic = primaryFunnel.runtimeTraffic || { hosted: primaryFunnel.hostedTraffic, native: primaryFunnel.nativeTraffic };
  const circuitOpen = primaryFunnel.runtimeOverride === 'writeback_circuit_open';
  const eligibleToday = 1842;
  const hostedToday = Math.round(eligibleToday * runtimeTraffic.hosted / 100);
  const metrics = [
    metricCard('Attributed GMV', state.metrics.gmv, 'analytics'),
    metricCard('Checkout conversion', state.metrics.conversion, 'flow'),
    metricCard('Average order value', state.metrics.aov, 'orders'),
    metricCard('Post-purchase revenue', state.metrics.recovered, 'sparkles'),
  ].join('');

  const checks = state.launchChecks.map(function (item) {
    return '<button type="button" class="check-row" data-route="' + escapeHtml(item.route) + '"><span class="check-state check-state-' + (item.state === 'Complete' ? 'complete' : 'attention') + '">' + icon(item.state === 'Complete' ? 'check' : 'alert', 15) + '</span><span class="check-copy"><strong>' + escapeHtml(item.label) + '</strong><small>' + escapeHtml(item.detail) + '</small></span>' + badge(item.state) + icon('chevron', 15) + '</button>';
  }).join('');

  const recent = state.activity.slice(0, 4).map(function (event) {
    return '<li class="activity-compact"><span class="activity-icon activity-' + escapeHtml(event.category) + '">' + icon(event.category === 'post-purchase' ? 'sparkles' : event.category === 'payment' ? 'card' : event.category === 'tracking' ? 'pixel' : event.category === 'sync' ? 'sync' : 'orders', 16) + '</span><div><strong>' + escapeHtml(event.title) + '</strong><small>' + escapeHtml(event.detail) + '</small></div><time>' + escapeHtml(event.time) + '</time></li>';
  }).join('');

  const header = pageHeader(
    isZh ? '概览' : 'Overview',
    isZh ? '查看收入提升、购买流程，以及这家店铺接下来需要完成的事项。' : 'See revenue lift, purchase flows and the next setup task for this store.',
    button(isZh ? '创建页面' : 'Create page', 'create-page', { icon: 'pages' }) + button(isZh ? '创建购买流程' : 'Create purchase flow', 'open-create-funnel', { kind: 'primary', icon: 'plus' })
  );

  const liveBanner = isFirstLaunch
    ? banner('warning', isZh ? '结账页尚未上线' : 'Your checkout is not live yet', isZh ? '完成上方设置并发布前，买家会继续使用现有 Shopify 结账完成付款。' : 'Complete the setup above, then publish your checkout. Until then, buyers continue through Shopify checkout.', button(isZh ? '查看上线准备' : 'View launch setup', 'open-onboarding', { kind: 'plain', icon: 'shield' }))
    : banner(
      liveFunnel && !circuitOpen ? 'success' : 'warning',
      circuitOpen ? 'Writeback circuit is protecting new checkout sessions' : liveFunnel ? 'BestCheckout is live on ' + runtimeTraffic.hosted + '% of eligible traffic' : 'Hosted checkout traffic is paused',
      circuitOpen ? 'New buyers use Shopify native checkout before payment. Existing paid orders continue finalization and reconciliation.' : liveFunnel ? 'Shopify native checkout keeps a ' + runtimeTraffic.native + '% control group and remains the automatic pre-payment safety route.' : 'All eligible buyers currently continue through Shopify native checkout.',
      routeButton('Review traffic', 'funnels', { kind: 'plain' })
    );

  const funnelPerformance = '<section class="card"><div class="card-pad">' + sectionHeader('Funnel performance', 'Open a Funnel to change its journey, audience or traffic.', routeButton('View all funnels', 'funnels', { kind: 'plain' })) + '<div class="overview-funnel-list">' + renderFunnelRows(state) + '</div></div></section>';
  const launchHealth = '<aside class="card"><div class="card-pad">' + sectionHeader('Launch health', 'Ongoing monitoring after launch. First-time setup stays in Quick start.', routeButton('Diagnostics', 'settings?tab=diagnostics', { kind: 'plain' })) + '</div><div class="check-list">' + checks + '</div></aside>';
  const today = '<section class="card home-summary"><div class="card-pad">' + sectionHeader('Today', (liveFunnel ? 'Live performance for ' : 'Latest configuration for ') + primaryFunnel.name) + '<div class="today-score"><div><span>Eligible sessions</span><strong>' + eligibleToday.toLocaleString('en-US') + '</strong></div><div><span>Hosted checkout</span><strong>' + hostedToday.toLocaleString('en-US') + '</strong></div></div><div class="traffic-summary"><div class="traffic-label"><span>BestCheckout runtime</span><strong>' + runtimeTraffic.hosted + '%</strong></div>' + progressBar(runtimeTraffic.hosted, liveFunnel && !circuitOpen ? 'success' : 'brand') + '<div class="traffic-legend"><span><i class="legend-bestcheckout"></i>Hosted</span><span><i class="legend-native"></i>Shopify native runtime ' + runtimeTraffic.native + '%</span></div></div><div class="outcome-list"><div><span>Completed checkouts</span><strong>84</strong></div><div><span>Accepted upsells</span><strong>16</strong></div><div><span>Safe skips</span><strong>3</strong></div><div><span>Writeback failures</span><strong class="text-success">0</strong></div></div></div></section>';
  const trendLabels = isZh ? ['周五', '周六', '周日', '周一', '周二', '周三', '今天'] : ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Today'];
  const completedToday = 84;
  const trendSource = (state.chart || [42, 45, 44, 49, 52, 51, 56]).slice(-7);
  const sourceMax = Math.max.apply(null, trendSource);
  const trendValues = trendSource.map(function (value) { return Math.round(value / sourceMax * completedToday); });
  const trendMax = Math.max.apply(null, trendValues);
  const trendMin = Math.min.apply(null, trendValues);
  const trendRange = Math.max(1, trendMax - trendMin);
  const plotBottom = 55;
  const trendPoints = trendValues.map(function (value, index) {
    return {
      x: Number((16 + index * (568 / 6)).toFixed(1)),
      y: Number((plotBottom - ((value - trendMin) / trendRange * 35 + 6)).toFixed(1)),
    };
  });
  const trendPolyline = trendPoints.map(function (point) { return point.x + ',' + point.y; }).join(' ');
  const trendArea = 'M ' + trendPoints[0].x + ' ' + plotBottom + ' L ' + trendPoints.map(function (point) { return point.x + ' ' + point.y; }).join(' L ') + ' L ' + trendPoints[trendPoints.length - 1].x + ' ' + plotBottom + ' Z';
  const trendDots = trendPoints.map(function (point, index) { return '<circle class="home-trend-dot' + (index === trendPoints.length - 1 ? ' is-current' : '') + '" cx="' + point.x + '" cy="' + point.y + '" r="' + (index === trendPoints.length - 1 ? '4' : '2.5') + '" />'; }).join('');
  const trendLabelMarkup = trendLabels.map(function (label, index) { return '<small class="' + (index === trendLabels.length - 1 ? 'is-current' : '') + '">' + escapeHtml(label) + '</small>'; }).join('');
  const trendAverage = Math.round(trendValues.reduce(function (sum, value) { return sum + value; }, 0) / trendValues.length);
  const trend = '<section class="card home-trend"><div class="card-pad"><div class="home-trend-heading"><div><h2>' + escapeHtml(isZh ? '近 7 日结账表现' : 'Checkout performance · last 7 days') + '</h2><p>' + escapeHtml(isZh ? '已完成结账数，实时数据每小时更新。' : 'Completed checkouts, refreshed hourly.') + '</p></div><span class="home-trend-kpi"><small>' + escapeHtml(isZh ? '今天' : 'Today') + '</small><strong>' + completedToday + '</strong></span></div><div class="home-trend-chart" role="img" aria-label="' + escapeHtml(isZh ? '近 7 日完成结账趋势' : 'Last 7-day completed checkout trend') + '"><div class="home-trend-plot"><svg viewBox="0 0 600 64" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="home-trend-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#008060" stop-opacity=".22"/><stop offset="100%" stop-color="#008060" stop-opacity="0"/></linearGradient></defs><line class="home-trend-grid" x1="0" y1="14" x2="600" y2="14"/><line class="home-trend-grid" x1="0" y1="34" x2="600" y2="34"/><line class="home-trend-grid" x1="0" y1="55" x2="600" y2="55"/><path class="home-trend-area" d="' + trendArea + '"/><polyline class="home-trend-line" points="' + trendPolyline + '"/>' + trendDots + '</svg></div><div class="home-trend-labels">' + trendLabelMarkup + '</div></div><div class="home-trend-footer"><span>' + escapeHtml(isZh ? '日均完成结账' : 'Average completed') + ' <strong>' + trendAverage + '</strong></span><span>' + escapeHtml(isZh ? '平均转化率' : 'Average conversion') + ' <strong>5.42%</strong></span><span>' + escapeHtml(isZh ? '相对原生结账' : 'vs Shopify native') + ' <strong>+0.84 pts</strong></span></div></div></section>';
  const activity = '<section class="card"><div class="card-pad">' + sectionHeader('Recent activity', 'Payments, post-purchase actions and Shopify writeback in one timeline.', routeButton('View all', 'activity', { kind: 'plain' })) + '<ul class="activity-compact-list">' + recent + '</ul></div></section>';

  const dashboard = isFirstLaunch
    ? renderPrelaunchOverview(state)
    : '<section class="metric-grid">' + metrics + '</section><section class="overview-dashboard-grid"><div class="overview-dashboard-column">' + funnelPerformance + today + trend + '</div><div class="overview-dashboard-column">' + launchHealth + activity + '</div></section>';
  return '<div class="page-stack">' + header + renderQuickStart(state) + liveBanner + dashboard + '</div>';
}
