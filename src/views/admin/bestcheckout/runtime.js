import { FUNNEL_DEPLOYMENT_SCHEMA_VERSION, TRACKING_CONTRACT_VERSION } from './type.js';

function normalizeForHash(value) {
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce(function (result, key) {
    result[key] = normalizeForHash(value[key]);
    return result;
  }, {});
}

export function deterministicPayloadHash(value) {
  const input = JSON.stringify(normalizeForHash(value));
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'payload_' + (hash >>> 0).toString(16).padStart(8, '0');
}

export function graphEdgesForNodes(nodes) {
  const entry = nodes.find(function (node) { return node.kind === 'entry'; });
  const checkouts = nodes.filter(function (node) { return node.kind === 'checkout'; });
  const upsells = nodes.filter(function (node) { return node.kind === 'upsell'; });
  const downsells = nodes.filter(function (node) { return node.kind === 'downsell'; });
  const thankyous = nodes.filter(function (node) { return node.kind === 'thank-you'; });
  const edges = [];
  const thankyouFor = function (index) { return thankyous.length ? thankyous[index % thankyous.length] : null; };
  if (entry) checkouts.forEach(function (checkout) {
    edges.push({ from: entry.id, to: checkout.id, outcome: 'eligible_hosted_bucket' });
  });
  if (entry) edges.push({ from: entry.id, to: 'shopify-native-checkout', outcome: 'native_control_or_fallback' });
  checkouts.forEach(function (checkout, index) {
    if (upsells[0]) {
      edges.push({ from: checkout.id, to: upsells[0].id, outcome: 'checkout_completed_offer_eligible' });
      thankyous.forEach(function (thankyou) {
        edges.push({ from: checkout.id, to: thankyou.id, outcome: 'offer_ineligible_or_skipped' });
      });
    } else {
      const thankyou = thankyouFor(index);
      if (thankyou) edges.push({ from: checkout.id, to: thankyou.id, outcome: 'checkout_completed' });
    }
  });
  upsells.forEach(function (node, index) {
    const nextUpsell = upsells[index + 1];
    const fallback = downsells[index] || downsells[0];
    const thankyou = thankyouFor(index);
    if (nextUpsell) edges.push({ from: node.id, to: nextUpsell.id, outcome: 'accepted_continue_sequence' });
    else if (thankyou) edges.push({ from: node.id, to: thankyou.id, outcome: 'accepted' });
    if (fallback) edges.push({ from: node.id, to: fallback.id, outcome: 'declined' });
    else if (thankyou) edges.push({ from: node.id, to: thankyou.id, outcome: 'declined_or_unavailable' });
    if (nextUpsell) edges.push({ from: node.id, to: nextUpsell.id, outcome: 'unavailable_or_skipped' });
    else if (thankyou) edges.push({ from: node.id, to: thankyou.id, outcome: 'unavailable_or_skipped' });
  });
  downsells.forEach(function (node, index) {
    const nextDownsell = downsells[index + 1];
    const thankyou = thankyouFor(upsells.length + index);
    if (thankyou) edges.push({ from: node.id, to: thankyou.id, outcome: 'accepted' });
    if (nextDownsell) edges.push({ from: node.id, to: nextDownsell.id, outcome: 'declined_continue_sequence' });
    else if (thankyou) edges.push({ from: node.id, to: thankyou.id, outcome: 'declined' });
    if (nextDownsell) edges.push({ from: node.id, to: nextDownsell.id, outcome: 'unavailable_or_skipped' });
    else if (thankyou) edges.push({ from: node.id, to: thankyou.id, outcome: 'unavailable_or_skipped' });
  });
  return edges;
}

export function validateGraphCoverage(nodes, edges) {
  const normalizedNodes = nodes.map(function (node) {
    return {
      id: node.id || node.nodeId,
      kind: node.kind,
      offerRuleRef: node.offerRuleRef || null,
      recommendationRuleRef: node.recommendationRuleRef || null,
    };
  });
  const nodeIds = new Set(normalizedNodes.map(function (node) { return node.id; }));
  nodeIds.add('shopify-native-checkout');
  const errors = [];
  const validEdges = Array.isArray(edges) ? edges : [];
  validEdges.forEach(function (edge) {
    if (!nodeIds.has(edge.from)) errors.push('unknown_from:' + edge.from);
    if (!nodeIds.has(edge.to)) errors.push('unknown_to:' + edge.to);
  });
  const edgesFrom = function (nodeId) { return validEdges.filter(function (edge) { return edge.from === nodeId; }); };
  const hasOutcome = function (nodeId, predicate) { return edgesFrom(nodeId).some(function (edge) { return predicate(edge.outcome); }); };
  const entries = normalizedNodes.filter(function (node) { return node.kind === 'entry'; });
  if (entries.length !== 1) errors.push('entry_count');
  if (normalizedNodes.filter(function (node) { return node.kind === 'checkout'; }).length < 1) errors.push('checkout_count');
  if (normalizedNodes.filter(function (node) { return node.kind === 'thank-you'; }).length < 1) errors.push('thankyou_count');
  entries.forEach(function (node) {
    if (!hasOutcome(node.id, function (outcome) { return outcome === 'eligible_hosted_bucket'; })) errors.push('entry_hosted_path:' + node.id);
    if (!hasOutcome(node.id, function (outcome) { return outcome === 'native_control_or_fallback'; })) errors.push('entry_native_path:' + node.id);
  });
  const hasUpsell = normalizedNodes.some(function (node) { return node.kind === 'upsell'; });
  normalizedNodes.filter(function (node) { return node.kind === 'checkout'; }).forEach(function (node) {
    if (!hasOutcome(node.id, function (outcome) { return outcome.indexOf('checkout_completed') === 0; })) errors.push('checkout_success_path:' + node.id);
    if (hasUpsell && !hasOutcome(node.id, function (outcome) { return outcome === 'offer_ineligible_or_skipped'; })) errors.push('checkout_offer_skip:' + node.id);
  });
  normalizedNodes.filter(function (node) { return node.kind === 'upsell' || node.kind === 'downsell'; }).forEach(function (node) {
    if (!node.offerRuleRef) errors.push('offer_rule_ref:' + node.id);
    if (!node.recommendationRuleRef) errors.push('recommendation_rule_ref:' + node.id);
    if (!hasOutcome(node.id, function (outcome) { return outcome.indexOf('accepted') === 0; })) errors.push('offer_accept:' + node.id);
    if (!hasOutcome(node.id, function (outcome) { return outcome.indexOf('declined') === 0; })) errors.push('offer_decline:' + node.id);
    if (!hasOutcome(node.id, function (outcome) { return outcome === 'unavailable_or_skipped'; })) errors.push('offer_skip:' + node.id);
  });
  const terminalKinds = new Set(['thank-you', 'fallback']);
  const reachesTerminal = function reachesTerminal(nodeId, seen) {
    const node = normalizedNodes.find(function (item) { return item.id === nodeId; });
    if (nodeId === 'shopify-native-checkout' || (node && terminalKinds.has(node.kind))) return true;
    if (seen.has(nodeId)) return false;
    const nextSeen = new Set(seen);
    nextSeen.add(nodeId);
    return edgesFrom(nodeId).some(function (edge) { return reachesTerminal(edge.to, nextSeen); });
  };
  normalizedNodes.filter(function (node) { return !terminalKinds.has(node.kind); }).forEach(function (node) {
    if (!reachesTerminal(node.id, new Set())) errors.push('dead_end:' + node.id);
  });
  const entryId = entries[0] && entries[0].id;
  if (entryId) {
    const reachable = new Set([entryId]);
    let changed = true;
    while (changed) {
      changed = false;
      validEdges.forEach(function (edge) {
        if (reachable.has(edge.from) && !reachable.has(edge.to)) {
          reachable.add(edge.to);
          changed = true;
        }
      });
    }
    normalizedNodes.forEach(function (node) {
      if (!reachable.has(node.id)) errors.push('unreachable:' + node.id);
    });
  }
  return { ready: errors.length === 0, errors: Array.from(new Set(errors)) };
}

function runtimeNodesForFunnel(state, funnel) {
  const nodes = funnel.nodes.map(function (node) {
    const page = node.pageId ? state.pages.find(function (item) { return item.id === node.pageId; }) : null;
    return {
      nodeId: node.id,
      kind: node.kind,
      pageId: node.pageId || null,
      pinnedVersion: page ? page.version : null,
      pinnedVersionId: page ? page.publishedVersionId : null,
      offerRuleRef: node.offerRuleRef || null,
      recommendationRuleRef: node.recommendationRuleRef || null,
    };
  });
  nodes.push({
    nodeId: 'shopify-native-checkout',
    kind: 'fallback',
    pageId: null,
    pinnedVersion: null,
    pinnedVersionId: null,
    offerRuleRef: null,
    recommendationRuleRef: null,
  });
  return nodes;
}

export function buildRuntimePayload(state, funnel) {
  const paymentBindings = (funnel.paymentRouteBindings || []).map(function (binding) {
    return Object.assign({}, structuredClone(binding), {
      regions: binding.regions.slice().sort(),
      currencies: binding.currencies.slice().sort(),
      methods: binding.methods.slice().sort(),
    });
  }).sort(function (left, right) { return left.providerId.localeCompare(right.providerId); });
  const checkoutNodes = funnel.nodes.filter(function (node) { return node.kind === 'checkout'; });
  const savedCheckoutAllocation = funnel.checkoutAllocations || {};
  const savedCheckoutVariants = savedCheckoutAllocation.checkouts || {};
  const nativeCheckoutAllocation = Number.isFinite(Number(savedCheckoutAllocation.native)) ? Number(savedCheckoutAllocation.native) : funnel.nativeTraffic;
  const hasSavedCheckoutVariant = checkoutNodes.some(function (node) { return Number.isFinite(Number(savedCheckoutVariants[node.id])); });
  const checkoutVariants = checkoutNodes.map(function (node, index) {
    return {
      nodeId: node.id,
      allocation: Number.isFinite(Number(savedCheckoutVariants[node.id])) ? Number(savedCheckoutVariants[node.id]) : (!hasSavedCheckoutVariant && index === 0 ? 100 - nativeCheckoutAllocation : 0),
    };
  });
  return {
    schemaVersion: FUNNEL_DEPLOYMENT_SCHEMA_VERSION,
    sourceFunnelRevision: funnel.draftRevisionId,
    sourceFunnelRevisionSequence: funnel.draftRevisionSequence,
    surface: {
      mode: state.store.checkoutSurfaceMode,
      version: state.store.checkoutSurfaceVersion,
      distributionMode: state.store.distributionMode,
      accessPolicyRef: state.store.shopifyAccessPolicyRef,
      merchantAuthorizationRef: state.store.merchantAuthorizationRef,
      planEligibilityRef: state.store.planEligibilityRef,
      appEmbedVerificationRef: state.store.appEmbedVerificationRef,
      checkoutOrigin: 'https://' + state.store.domain,
      targetRegions: (state.store.targetRegions || []).slice().sort(),
    },
    audience: {
      label: funnel.audience,
      priority: funnel.priority,
      conflictPolicy: funnel.conflictPolicy,
      eligibilityRules: funnel.rules.slice(),
      eligibilityConditions: structuredClone(funnel.audienceConditions || []),
    },
    allocation: {
      hosted: funnel.hostedTraffic,
      native: funnel.nativeTraffic,
      allocationVersion: funnel.allocationVersion,
      bucketSeed: funnel.bucketSeed,
    },
    checkoutRouting: {
      audience: funnel.audience,
      nativeCheckoutAllocation: nativeCheckoutAllocation,
      bestCheckoutVariants: checkoutVariants,
    },
    nodes: runtimeNodesForFunnel(state, funnel),
    graphEdges: structuredClone(funnel.graphEdges || graphEdgesForNodes(funnel.nodes)),
    paymentRoute: {
      policyRef: funnel.paymentRoutePolicyRef,
      checkoutCurrency: state.store.checkoutCurrency,
      connectionRefs: (funnel.paymentRouteBindings || []).map(function (binding) {
        return { providerId: binding.providerId, connectionRef: binding.connectionRef };
      }).sort(function (left, right) { return left.providerId.localeCompare(right.providerId); }),
      bindings: paymentBindings,
      requiredMethods: (funnel.requiredPaymentMethods || []).slice().sort(),
      capabilityDimensions: ['payment_method', 'region', 'currency', 'authorization_state'],
    },
    cartHandoffContract: {
      schemaVersion: state.store.cartHandoffSchemaVersion,
      requiredFields: ['variant_id', 'quantity', 'line_properties', 'selling_plan', 'market', 'currency', 'discounts', 'shipping', 'tax', 'duty'],
      authoritativeRefresh: 'required_before_payment',
      ttlSeconds: state.store.cartHandoffTtlSeconds,
    },
    postPurchaseCapabilityPolicyRef: funnel.postPurchaseCapabilityPolicyRef,
    fallbackPolicy: {
      ref: funnel.fallbackPolicyRef,
      preCharge: 'shopify_native_checkout',
      paymentUnknown: 'query_provider_then_resume',
      captured: 'finalize_reconcile_or_refund',
    },
    trackingContract: {
      version: funnel.trackingContractVersion || TRACKING_CONTRACT_VERSION,
      destinationIds: state.tracking.filter(function (item) { return item.state === 'Healthy'; }).map(function (item) { return item.id; }).sort(),
    },
    writebackPolicy: {
      circuitBreakerRef: state.store.writebackCircuitBreakerRef,
      maxBacklog: state.store.writebackMaxBacklog,
      maxAgeMinutes: state.store.writebackMaxAgeMinutes,
      onOpen: 'new_hosted_sessions_to_native_existing_payments_reconcile',
    },
  };
}
