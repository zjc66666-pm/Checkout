/* BestShopio prototypes — i18n FINAL override layer (loads last → wins).

   The per-module shards (assets/i18n/*.js) all extend ONE shared dictionary, so when
   two modules translate the SAME English word differently (e.g. selling-apps maps
   "Analytics"→"分析" while the sidebar needs "数据分析"), whichever shard loads last
   silently wins. This file loads AFTER every shard and re-pins:
     1. the persistent chrome — sidebar menu + settings nav + common action words —
        so no module shard can ever break the navigation, and
     2. a curated pick for genuinely ambiguous cross-module terms (status words, etc.).
   Everything else (harmless synonyms like 背景/背景色) is left to last-shard-wins. */
(function () {
  'use strict';
  if (!window.I18N || !window.I18N.extend) return;

  window.I18N.extend({
    // ---- sidebar menu (canonical, must match the chrome) ----
    'Orders': '订单', 'Products': '商品', 'Collections': '商品系列', 'Reviews': '评价',
    'Customers': '客户', 'Discounts': '折扣', 'Content': '内容', 'Blog': '博客',
    'Page': '页面', 'Menu': '导航菜单', 'Analytics': '数据分析', 'Reports': '报表',
    'Live View': '实时概览', 'Online store': '网上商店',
    'Subscriptions': '订阅', 'Plans': '套餐', 'Bundles': '捆绑销售', 'Settings': '设置',

    // ---- settings nav (canonical) ----
    'Basic settings': '基础设置', 'Payments': '收款', 'Currency': '币种', 'Checkout': '结账',
    'Notifications': '通知', 'Domains': '域名', 'Metafields': '元字段',
    'Ship locations': '发货地', 'Shipping rates': '运费',
    'Staff and permissions': '员工与权限', 'Roles': '角色', 'Staff': '员工',

    // ---- common actions (canonical, keep consistent everywhere) ----
    'Save': '保存', 'Save changes': '保存更改', 'Cancel': '取消', 'Delete': '删除',
    'Edit': '编辑', 'Add': '添加', 'Create': '创建', 'Update': '更新', 'Remove': '移除',
    'Search': '搜索', 'Export': '导出', 'Import': '导入', 'Preview': '预览',
    'Publish': '发布', 'Discard': '放弃', 'Done': '完成', 'Apply': '应用',
    'Reset': '重置', 'Close': '关闭', 'Confirm': '确认', 'All': '全部', 'Select': '选择',

    // ---- ambiguous cross-module terms → one curated pick ----
    'Status': '状态', 'Active': '已启用', 'Draft': '草稿', 'Archived': '已归档',
    'Paid': '已付款', 'Unpaid': '未付款',
    'Country': '国家/地区', 'Countries': '国家/地区',
    'Payment method': '付款方式', 'Details': '详情', 'Overview': '概览',
    'Cards': '银行卡', // payments page label (bestcheckout MID table uses its own local dict → unaffected)
    'Title': '标题', 'Type': '类型', 'Name': '名称', 'Date': '日期',
    'Status:': '状态：'
  });

  window.I18N.addRules([]);
})();
