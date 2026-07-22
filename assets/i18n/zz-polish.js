/* BestShopio prototypes — i18n QA polish layer (loads after all module shards).

   Fixes found during the live preview sweep: interpolated templates and strings that
   are split across nodes by a <b>, so an exact full-sentence key never matches. Kept
   separate from the shards so the QA pass is auditable. The `zz-` prefix sorts it last
   among assets/i18n/*; index.html still loads i18n-dict.js (the chrome overrides) after. */
(function () {
  'use strict';
  if (!window.I18N || !window.I18N.extend) return;

  var MON = { Jan: '1月', Feb: '2月', Mar: '3月', Apr: '4月', May: '5月', Jun: '6月',
              Jul: '7月', Aug: '8月', Sep: '9月', Oct: '10月', Nov: '11月', Dec: '12月' };

  // ---- discounts: one row subtitle is `[info, min, uses].join('  •  ')` (data strings) ----
  function dseg(s) {
    s = (s || '').trim();
    var map = { 'No minimum': '无最低要求', 'Free shipping on all products': '全场免运费',
                'One per customer': '每人限一次', 'No usage limit': '不限使用次数' };
    if (map[s]) return map[s];
    var m;
    if ((m = s.match(/^(\d+)% off entire order$/))) return '全单立减 ' + m[1] + '%';
    if ((m = s.match(/^(\d+)% off (\d+) products?$/))) return m[2] + ' 件商品立减 ' + m[1] + '%';
    if ((m = s.match(/^\$([\d.,]+) off entire order$/))) return '全单立减 $' + m[1];
    if ((m = s.match(/^\$([\d.,]+) off (\d+) products?$/))) return m[2] + ' 件商品立减 $' + m[1];
    if ((m = s.match(/^Min (\d+) items?$/))) return '最低 ' + m[1] + ' 件';
    if ((m = s.match(/^Min(?:imum)? purchase of \$([\d.,]+)$/))) return '最低消费 $' + m[1];
    if ((m = s.match(/^Min(?:imum)? purchase of (\d+) items?$/))) return '最低消费 ' + m[1] + ' 件';
    if ((m = s.match(/^Buy (\d+) get (\d+)$/))) return '买 ' + m[1] + ' 送 ' + m[2];
    if ((m = s.match(/^Used (\d+) times?$/))) return '已使用 ' + m[1] + ' 次';
    if ((m = s.match(/^Limit (\d+) per customer$/))) return '每位顾客限 ' + m[1] + ' 次';
    if ((m = s.match(/^(\d+) per customer$/))) return '每位顾客限 ' + m[1] + ' 次';
    if ((m = s.match(/^(\d+) uses? total$/))) return '共 ' + m[1] + ' 次';
    if ((m = s.match(/^Limit (\d+)(?: uses?)?$/))) return '限用 ' + m[1] + ' 次';
    return s; // unknown segment → keep as-is
  }

  window.I18N.extend({
    // discounts — filter chips, headers, placeholder, empty state
    'Combines with': '可叠加', 'Start date': '开始日期', 'Start date range': '开始日期范围',
    'Times used': '使用次数', 'Combinations': '可叠加', 'Used': '使用次数', 'Method': '方式',
    'Title / Discount code': '标题 / 折扣码',
    'No discounts match these filters.': '没有符合筛选条件的折扣。',
    'No minimum': '无最低要求', 'Free shipping on all products': '全场免运费',

    // collections — type enum (lowercase) + image placeholder
    'manual': '手动', 'automated': '自动', 'IMG': '图',

    // settings → Payments — sentence split by <b>this store only</b>
    'Payment connections belong to': '收款连接仅属于',
    'this store only': '本店铺',
    'and are never shared between stores. A newly created store always starts with no processor connected, so you connect fresh credentials here.':
      '，且绝不会在店铺之间共享。新建店铺默认未连接任何收款渠道，需在此重新填写凭据连接。',

    // subscriptions — chart weekday short names, KPI delta, failure reasons
    'Mon': '周一', 'Tue': '周二', 'Wed': '周三', 'Thu': '周四', 'Fri': '周五', 'Sat': '周六', 'Sun': '周日',
    'vs last month': '较上月',
    'Insufficient funds': '余额不足', 'Card declined': '银行卡被拒', 'Expired card': '卡已过期',
    'Do not honor': '发卡行拒绝', 'Processing error': '处理出错'
  });

  window.I18N.addRules([
    // discounts row subtitle (data joined by '  •  '); only fire on a real discount summary
    { re: /  •  /, zh: function (m, s) {
        var parts = s.split('  •  ');
        if (!/^(\$?[\d.,]+%? off |Free shipping on all products$|Buy \d+ get )/.test(parts[0])) return null;
        return parts.map(dseg).join('  •  ');
      } },
    // single-segment discount summaries (no bullet)
    { re: /^(\d+)% off (\d+) products?$/, zh: function (m) { return m[2] + ' 件商品立减 ' + m[1] + '%'; } },
    { re: /^(\d+)% off entire order$/, zh: function (m) { return '全单立减 ' + m[1] + '%'; } },
    { re: /^\$([\d.,]+) off (\d+) products?$/, zh: function (m) { return m[2] + ' 件商品立减 $' + m[1]; } },
    { re: /^\$([\d.,]+) off entire order$/, zh: function (m) { return '全单立减 $' + m[1]; } },

    // analytics / online-store — "Last refreshed:" / "Last saved:" + dynamic time
    { re: /^Last refreshed: (.+)$/, zh: function (m) { return '最近刷新：' + m[1]; } },
    { re: /^Last saved: (.+)$/, zh: function (m) { return '最近保存：' + m[1]; } },

    // subscriptions — "N to resolve", chart dates "Jun 19" / "Jun 19, 2026"
    { re: /^(\d+) to resolve$/, zh: function (m) { return m[1] + ' 项待处理'; } },
    { re: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})$/, zh: function (m) { return MON[m[1]] + m[2] + '日'; } },
    { re: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})$/, zh: function (m) { return m[3] + '年' + MON[m[1]] + m[2] + '日'; } }
  ]);
})();
