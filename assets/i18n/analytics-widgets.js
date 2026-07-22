/* i18n: analytics + widgets */
window.I18N.extend({
  // ============================================================
  //  ANALYTICS  (analytics/js/app.js + data.js)
  // ============================================================

  // ---- secondary nav + page titles (SUBNAV / topBar) ----
  "Analytics": "数据分析",
  "Overview": "概览",
  "Reports": "报表",
  "Live View": "实时概览",

  // ---- toolbar chips: comparison / currency / time unit ----
  "No comparison": "不对比",
  "Previous period": "上一周期",
  "Previous year": "去年同期",
  "Previous year (match day of week)": "去年同期（对齐星期）",
  "Custom": "自定义",
  "Time unit:": "时间粒度：",
  "Day": "天",
  "Week": "周",
  "Month": "月",
  "Search for a currency": "搜索货币",

  // ---- date range picker (chips + popover presets) ----
  "Date range": "日期范围",
  "Today": "今天",
  "Yesterday": "昨天",
  "Last 7 days": "近 7 天",
  "Last 30 days": "近 30 天",
  "Last 90 days": "近 90 天",
  "This month": "本月",
  "Last month": "上月",
  "Custom range": "自定义区间",
  "Cancel": "取消",
  "Apply": "应用",
  "Select a date range": "选择日期范围",
  "Start date → End date": "开始日期 → 结束日期",

  // ---- metric tooltips (METRIC_INFO: title / desc / formula) ----
  "Gross sales": "总销售额",
  "Product revenue before discounts and returns.": "折扣与退货前的商品收入。",
  "Gross sales = Σ (unit price × quantity)": "总销售额 = Σ（单价 × 数量）",
  "Discounts": "折扣",
  "Total reduction from discount codes and automatic promotions.": "折扣码与自动促销带来的总减免。",
  "Discounts = product + order + shipping discounts": "折扣 = 商品 + 订单 + 运费折扣",
  "Returns": "退货",
  "Value of items returned during the period.": "周期内退货商品的金额。",
  "Net sales": "净销售额",
  "Sales after discounts and returns, before shipping.": "扣除折扣与退货后、计入运费前的销售额。",
  "Net sales = Gross sales − Discounts − Returns": "净销售额 = 总销售额 − 折扣 − 退货",
  "Total sales": "销售总额",
  "What your store actually took in.": "店铺实际收入。",
  "Total sales = Net sales + Shipping  ·  (tax N/A in our model)": "销售总额 = 净销售额 + 运费  ·（本模型不计税）",
  "Average order value": "客单价",
  "Average value of an order.": "单笔订单的平均金额。",
  "AOV = Net sales ÷ Orders": "客单价 = 净销售额 ÷ 订单数",
  "Gross profit": "毛利",
  "Profit after cost of goods sold (COGS captured at sale time).": "扣除商品成本（下单时记录的 COGS）后的利润。",
  "Gross profit = Net sales − COGS": "毛利 = 净销售额 − 商品成本",
  "Gross margin": "毛利率",
  "Gross profit as a share of net sales.": "毛利占净销售额的比例。",
  "Gross margin = Gross profit ÷ Net sales": "毛利率 = 毛利 ÷ 净销售额",
  "Number of orders placed, across all sales channels.": "全部销售渠道的下单数量。",
  "Orders fulfilled": "已发货订单",
  "Orders fulfilled in the selected period.": "所选周期内已发货的订单。",
  "Refund amount": "退款金额",
  "Total refunded back to customers in the period.": "周期内退还给客户的总额。",
  "Returning customer rate": "复购率",
  "Share of ordering customers who were returning.": "下单客户中复购客户的占比。",
  "Returning rate = returning customers ÷ customers": "复购率 = 复购客户 ÷ 客户数",
  "Sessions": "访问会话",
  "Visits to your online store. Source: self-hosted Sensors (神策).": "对在线店铺的访问。数据来源：自建 Sensors（神策）。",
  "A session ends after 30 min of inactivity": "无操作 30 分钟后会话结束",
  "Page views": "页面浏览量",
  "Total pages viewed across all sessions. Source: 神策.": "全部会话浏览的页面总数。数据来源：神策。",
  "Conversion rate": "转化率",
  "Share of sessions that completed checkout.": "完成结账的会话占比。",
  "Conversion rate = completed-checkout sessions ÷ sessions": "转化率 = 完成结账会话 ÷ 会话数",
  "Sales attributed to marketing": "营销归因销售额",
  "Sales from sessions that arrived via a marketing channel (last-touch attribution).": "通过营销渠道进入的会话带来的销售额（末次触点归因）。",

  // ---- Overview KPI labels (data.js KPIS) ----
  "Sales": "销售额",

  // ---- Overview card titles (TITLE_MAP keys) ----
  "Paid amount": "收款金额",
  "Sessions by device type": "按设备类型的会话",
  "Sessions by country/region": "按国家/地区的会话",
  "Sessions by traffic source": "按流量来源的会话",
  "Sessions by social source": "按社媒来源的会话",
  "Popular sales by referrer source": "按引荐来源的热门销售",
  "Top landing pages by sessions": "会话最多的落地页",
  "Customer group analysis": "客户分群分析",
  "New vs returning customers": "新客与复购客户",
  "Popular referral websites": "热门引荐网站",
  "Top products": "热销商品",

  // ---- Overview side lists ----
  "External referrer website": "外部引荐网站",
  "New customers": "新客户",
  "Returning customers": "复购客户",

  // ---- chart series names ----
  "Current": "本期",
  "Comparison": "对比",
  "Selected period": "所选周期",

  // ============================================================
  //  REPORTS LIBRARY  (viewReports)
  // ============================================================
  "Recently viewed": "最近查看",
  "Title": "标题",
  "Learn more about Reports": "了解更多报表用法",
  "My favorites": "我的收藏",
  "Custom reports": "自定义报表",
  "Report": "报表",
  "You haven't favorited any reports yet.": "你还没有收藏任何报表。",
  "No custom reports yet. Open a report and click Save as.": "暂无自定义报表。打开报表后点击「另存为」。",
  "Delete": "删除",

  // ---- report category descriptions (CAT_DESC) ----
  "Compare sales across products, variants, channels, and discounts.": "对比商品、款式、渠道与折扣维度的销售。",
  "Track orders, fulfillment, payment success, and returns.": "跟踪订单、发货、支付成功与退货。",
  "Acquisition, retention, cohorts, and spending habits.": "获客、留存、分群与消费习惯。",
  "Session trends by source, device, country, and landing page.": "按来源、设备、国家与落地页的会话趋势。",
  "Order values, sales, refunds, and payments.": "订单金额、销售、退款与收款。",
  "Product performance, inventory, ratings, and profitability.": "商品表现、库存、评分与盈利能力。",
  "Where customers come from and how well they convert.": "客户来自哪里、转化效果如何。",

  // ---- report category names (REPORT_CATEGORIES) ----
  "Orders": "订单",
  "Customers": "客户",
  "Behavior": "行为",
  "Finances": "财务",
  "Products": "商品",
  "Marketing": "营销",

  // ---- report names (data.js REPORTS) ----
  "Sales: By date range": "销售：按日期范围",
  "Sales : By date range": "销售：按日期范围",
  "Product data details": "商品数据明细",
  "Sales by variant (SKU)": "按款式（SKU）的销售",
  "Sales by channel": "按渠道的销售",
  "Sales by discount code": "按折扣码的销售",
  "Sales by country/region": "按国家/地区的销售",
  "Total sales by currency": "按货币的销售总额",
  "Average order value over time": "客单价趋势",
  "Daily store conversion": "店铺每日转化",
  "Orders over time": "订单趋势",
  "Orders by fulfillment status": "按发货状态的订单",
  "Partial shipped orders": "部分发货订单",
  "Average time to fulfill": "平均发货时长",
  "Payment success rate": "支付成功率",
  "New customers over time": "新客户趋势",
  "Customers by location": "按地区的客户",
  "One-time customers": "一次性客户",
  "Customer cohort analysis": "客户分群分析",
  "Predicted spend tier": "预测消费档位",
  "Sessions over time": "会话趋势",
  "Conversion rate over time": "转化率趋势",
  "Conversion rate breakdown": "转化率拆解",
  "Traffic acquisition: By device": "流量获取：按设备",
  "Traffic acquisition: By country/region": "流量获取：按国家/地区",
  "Traffic acquisition: By channel": "流量获取：按渠道",
  "User path analysis": "用户路径分析",
  "Retention analysis": "留存分析",
  "Landing-page conversion rate": "落地页转化率",
  "Finance summary": "财务汇总",
  "Total sales breakdown": "销售总额拆解",
  "Total sales by order": "按订单的销售总额",
  "Discounts by order": "按订单的折扣",
  "Taxes": "税费",
  "Payments by method": "按方式的收款",
  "Payments over time": "收款趋势",
  "Gross profit by product": "按商品的毛利",
  "Refunds over time": "退款趋势",
  "Top products by units sold": "按销量的热销商品",
  "Products by sell-through rate": "按动销率的商品",
  "Inventory remaining per product": "各商品剩余库存",
  "ABC product analysis": "ABC 商品分析",
  "Average rating by product": "按商品的平均评分",
  "Sessions by UTM campaign": "按 UTM 活动的会话",
  "Performance by referring channel": "按引荐渠道的表现",
  "Total sales by social referrer": "按社媒引荐的销售总额",
  "Total sales by referrer": "按引荐来源的销售总额",
  "Attribution model comparison": "归因模型对比",

  // ============================================================
  //  REPORT DETAIL — shared toolbar / table chrome
  // ============================================================
  "Save as": "另存为",
  "Favorites": "收藏",
  "★ Favorited": "★ 已收藏",
  "Edit": "编辑",
  "Update": "更新",
  "Reset": "重置",
  "Summary": "汇总",
  "Chart:": "图表：",
  "and": "与",
  "Add metrics": "添加指标",
  "Manage filters": "管理筛选",
  "Add filters": "添加筛选",
  "Add filter": "添加筛选",
  "+ Add filter": "+ 添加筛选",
  "× remove": "× 移除",
  "is": "等于",
  "is not": "不等于",
  "contains": "包含",
  "Select": "请选择",
  "Select a value": "选择一个值",
  "Enter a value": "输入一个值",

  // ---- Save-as / save / delete modals ----
  "Save as new report": "另存为新报表",
  "Report name": "报表名称",
  "Please enter a report name": "请输入报表名称",
  "A report with this name already exists": "已存在同名报表",
  "Save": "保存",
  "Delete report?": "删除报表？",
  "Save report": "保存报表",
  "e.g. Weekly sales by channel": "例如：按渠道的每周销售",
  "Saved reports appear in Reports and can be added to the Overview dashboard.": "保存的报表会出现在「报表」中，并可添加到「概览」仪表盘。",

  // ---- toasts ----
  "Added to favorites": "已加入收藏",
  "Removed from favorites": "已从收藏移除",
  "Report saved": "报表已保存",
  "Report deleted": "报表已删除",
  "Report saved to your library": "报表已保存到你的报表库",

  // ---- chart-shape switcher (VIZ_SHAPES) ----
  "Line": "折线图",
  "Column": "柱状图",
  "Bar": "条形图",
  "Donut": "环形图",

  // ---- edit drawer ----
  "Search chart header": "搜索图表表头",
  "DIMENSION": "维度",
  "METRIC": "指标",
  "No match": "无匹配项",
  "Select all": "全选",
  "Unselect all": "取消全选",

  // ============================================================
  //  REPORT DETAIL — Product data details (viewProductDataDetails)
  // ============================================================
  "Product dimension": "商品维度",
  "Sub-variant dimension": "子款式维度",
  "Product metrics": "商品指标",
  "Sub-variant metrics": "子款式指标",
  "Search product / SKU": "搜索商品 / SKU",
  "More filters": "更多筛选",
  "Product": "商品",
  "Sub-variant": "子款式",
  "Trend": "趋势",
  // table metric column labels (METRICS[].l)
  "Sales quantity": "销量",
  "Sales %": "销售占比",
  "Product views": "商品浏览量",
  // product trend funnel
  "Product trend": "商品趋势",
  "Variant trend": "款式趋势",
  "Add to cart sessions": "加购会话",
  "Reached checkout sessions": "进入结账会话",
  "Unique buyers": "去重买家",
  "Product conversion rate": "商品转化率",
  "Add-to-cart": "加购",
  "Conversion funnel": "转化漏斗",

  // ============================================================
  //  REPORT DETAIL — Behavior reports (viewBehaviorReport / BEHAVIOR_CAT)
  // ============================================================
  // dimension group labels + items (BEHAVIOR_CAT.dimensions)
  "Landing page": "落地页",
  "Landing page type": "落地页类型",
  "Landing page path": "落地页路径",
  "Landing page URL": "落地页 URL",
  "Location": "地区",
  "Country/Region": "国家/地区",
  "Province/State": "省/州",
  "City": "城市",
  "Device": "设备",
  "Browser": "浏览器",
  "Browser version": "浏览器版本",
  "Device type": "设备类型",
  "Operating system version": "操作系统版本",
  "Operating system": "操作系统",
  "Referrer": "引荐来源",
  "Referrer site": "引荐站点",
  "Referrer name": "引荐名称",
  "Referrer path": "引荐路径",
  "Referrer source": "引荐来源",
  "Traffic Source": "流量来源",
  "Referrer URL": "引荐 URL",
  "Campaign": "营销活动",
  "UTM content": "UTM 内容",
  "UTM medium": "UTM 媒介",
  "UTM name": "UTM 名称",
  "UTM source": "UTM 来源",
  "UTM campaign keywords": "UTM 活动关键词",
  "UTM campaign": "UTM 活动",
  "Time": "时间",
  "Hour": "小时",
  "Quarter": "季度",
  "Year": "年",
  "An hour of a day": "一天中的某小时",
  "A day of a week": "一周中的某天",
  "A month of a year": "一年中的某月",
  // metric group + items (BEHAVIOR_CAT.metrics / METRIC_KEY)
  "Sessions of successful registration": "注册成功会话",
  "Added to cart": "加购",
  "Reached checkout": "进入结账",
  "Added customer info": "已填客户信息",
  "Added shipping method": "已选配送方式",
  "Added payment Info": "已填支付信息",
  "Added payment info": "已填支付信息",
  "Completed checkout": "完成结账",
  "Bounce rate": "跳出率",

  // ============================================================
  //  REPORT DETAIL — Commerce catalog (COMMERCE_CAT) + filter enums
  // ============================================================
  // dimension group labels + items
  "Order No.": "订单号",
  "Order status": "订单状态",
  "Pay status": "支付状态",
  "Refund status": "退款状态",
  "Fulfillment status": "发货状态",
  "Payment method": "支付方式",
  "Product name": "商品名称",
  "SKU": "SKU",
  "Variant": "款式",
  "Customer": "客户",
  "Customer name": "客户名称",
  "Email": "邮箱",
  "Customer type": "客户类型",
  "Discount": "折扣",
  "Discount code": "折扣码",
  "Sales channel": "销售渠道",
  "Currency": "货币",
  "Social platform": "社媒平台",
  // metric group labels + items (Sales result / Customers)
  "Sales result": "销售结果",
  "Shipping": "运费",
  "Units per transaction": "件单量",
  // chart-metric picker (CHART_METRICS)
  "Total payments": "收款笔数",
  "Successful payments": "成功收款笔数",

  // ---- filter value enums (FILTER_EXTRA / status pills) ----
  "To pay": "待付款",
  "To ship": "待发货",
  "Shipped": "已发货",
  "Awaiting Review": "待评价",
  "Done": "已完成",
  "Refunded": "已退款",
  "Canceled": "已取消",
  "Paid": "已支付",
  "Unpaid": "未支付",
  "No refund": "无退款",
  "Refunding": "退款中",
  "Fulfilled": "已发货",
  "Partial Fulfilled": "部分发货",
  "Unfulfilled": "未发货",
  "Online Store": "在线店铺",
  "Draft order": "草稿订单",
  "Draft Orders": "草稿订单",
  "Shop": "Shop",
  "New": "新客",
  "Returning": "复购",
  "Direct": "直接访问",
  "Social": "社媒",
  "Referral": "引荐",
  "Other": "其他",
  "Mobile": "手机",
  "Desktop": "桌面端",
  "Tablet": "平板",
  "Homepage": "首页",
  "Collection": "商品系列",
  "Checkout": "结账",
  "Cart": "购物车",
  "Account": "账户",
  "Blog": "博客",
  "Social (other)": "社媒（其他）",

  // ============================================================
  //  REPORT DETAIL — fixed / special reports
  // ============================================================
  // Payment success rate (viewPaymentSuccess)
  "Orders: Payment success rate": "订单：支付成功率",
  "Payment channel": "支付渠道",
  "Options": "操作",
  "View": "查看",
  "Fixed report · no Edit / Manage filters": "固定报表 ·（无编辑 / 管理筛选）",
  // Commerce dim report titles (COMMERCE_DIM_CFG)
  "Sales: By channel": "销售：按渠道",
  "Sales: By country/region": "销售：按国家/地区",
  "Sales: By discount code": "销售：按折扣码",
  "Sales: By variant (SKU)": "销售：按款式（SKU）",
  "Customers: By location": "客户：按地区",
  "Sales by social referrer": "按社媒引荐的销售",
  "· Social row expands to platforms": "·「社媒」行可展开到各平台",
  // Date-range report banner
  "We will be phasing out the Payment amount and Refund amount metrics in the Sales report soon — you can view them in the Finances report instead.": "「销售」报表中的收款金额与退款金额指标即将下线 —— 可改在「财务」报表中查看。",
  // Conversion funnel (viewConversionFunnel)
  "Biggest drop-off": "最大流失环节",
  // Cohort (viewCohort)
  "Retention by signup cohort — % of each cohort that ordered again in later months. Source: derived (神策 + orders).": "按注册分群的留存 —— 各分群在后续月份再次下单的占比。数据来源：派生（神策 + 订单）。",
  "Cohort": "分群",
  "Current month": "当月",
  // Finance summary (viewFinanceSummary + BREAKDOWN labels)
  "Item": "项目",
  "Amount": "金额",
  "Shipping charges": "运费",
  "Return fees": "退货费",
  "Fixed report · no Edit / Manage filters. Net sales = Gross sales − Discounts − Returns; Total sales = Net sales + Shipping (tax not tracked in our model — N/A).": "固定报表 ·（无编辑 / 管理筛选）。净销售额 = 总销售额 − 折扣 − 退货；销售总额 = 净销售额 + 运费（本模型不计税 —— N/A）。",
  // User path (viewUserPath)
  "Most common navigation flows through your store. Source: behavior (神策) page sequences.": "店铺中最常见的浏览路径。数据来源：行为（神策）页面序列。",
  // Attribution (viewAttribution)
  "Attributed sales by channel under different models. Source: behavior (神策) attribution — first-touch / last-touch / linear.": "不同模型下按渠道的归因销售额。数据来源：行为（神策）归因 —— 首次触点 / 末次触点 / 线性。",
  "Channel": "渠道",
  "First-touch": "首次触点",
  "Last-touch": "末次触点",
  "Linear": "线性",
  // ABC analysis (viewABC)
  "Pareto classification by revenue contribution — A: top 80%, B: next 15%, C: last 5%.": "按收入贡献的帕累托分级 —— A：前 80%，B：其后 15%，C：末 5%。",
  "Revenue": "收入",
  "% of total": "占总额比例",
  "Cumulative %": "累计占比",
  "Grade": "等级",

  // ============================================================
  //  LIVE VIEW  (viewLive)
  // ============================================================
  "Fullscreen": "全屏",
  "Just now": "刚刚",
  "Visitors right now": "当前访客",
  "Customer behavior": "客户行为",
  "Active carts": "活跃购物车",
  "Checking out": "结账中",
  "Purchased": "已购买",
  "Sessions by location": "按地区的会话",
  "New vs returning": "新客与复购",
  "Live visitor & order activity": "实时访客与下单动态",
  "Drag to rotate · scroll to zoom · dots = live visitors": "拖拽旋转 · 滚动缩放 · 圆点 = 实时访客",

  // ============================================================
  //  SHARED WIDGETS  (assets/widgets.js)
  // ============================================================
  // ---- unsaved-changes bar ----
  "You have unsaved changes": "你有未保存的更改",
  "Discard": "放弃",

  // ---- product picker ----
  "Add products": "添加商品",
  "Add product": "添加商品",
  "Search": "搜索",
  "Category": "分类",
  "Price range": "价格区间",
  "Status": "状态",
  "Min": "最小值",
  "Max": "最大值",
  "Clear": "清除",
  "Supplements": "保健品",
  "Beverages": "饮品",
  "Accessories": "配件",
  "Active": "上架",
  "Draft": "草稿",
  "Inventory": "库存",
  "Price": "价格",
  "Out of stock": "缺货",
  "Partial - Out of stock": "部分缺货",
  "No products match these filters.": "没有符合筛选条件的商品。",

  // ---- bundle picker ----
  "Add bundle": "添加套装",
  "Search bundles": "搜索套装",
  "Bundle": "套装",
  "Parent product": "主商品",
  "Template": "模板",
  "No bundles found.": "未找到套装。",

  // ---- confirm dialog defaults ----
  "Confirm": "确认",
  "OK": "确定",
  "Close": "关闭"
});

window.I18N.addRules([
  // pagination footer: "Total N records"
  { re: /^Total (\d+) records$/, zh: function (m) { return '共 ' + m[1] + ' 条'; } },
  // page-size note inside trigger text (rare) — option text is skipped by engine
  { re: /^(\d+) selected$/, zh: function (m) { return '已选 ' + m[1] + ' 项'; } },
  // product picker footer: "N selected" or "N / M selected"
  { re: /^(\d+) \/ (\d+) selected$/, zh: function (m) { return '已选 ' + m[1] + ' / ' + m[2] + ' 项'; } },
  // toolbar buttons with a count badge: "More filters (N)" / "Manage filters (N)"
  { re: /^More filters \((\d+)\)$/, zh: function (m) { return '更多筛选 (' + m[1] + ')'; } },
  { re: /^Manage filters \((\d+)\)$/, zh: function (m) { return '管理筛选 (' + m[1] + ')'; } },
  // product picker inventory line: "N on sale" / "N on sale · K variants"
  { re: /^(\d+) on sale · (\d+) variants$/, zh: function (m) { return m[1] + ' 件在售 · ' + m[2] + ' 个款式'; } },
  { re: /^(\d+) on sale$/, zh: function (m) { return m[1] + ' 件在售'; } },
  // cohort table headers: "Month N"
  { re: /^Month (\d+)$/, zh: function (m) { return '第 ' + m[1] + ' 个月'; } },
  // conversion-funnel stage caption: "N · X.X% of sessions"
  { re: /^([\d,]+) · ([\d.]+)% of sessions$/, zh: function (m) { return m[1] + ' · 占会话 ' + m[2] + '%'; } },
  // conversion-funnel step caption: "↓ X.X% step conversion · Y.Y% drop-off"
  { re: /^↓ ([\d.]+)% step conversion · ([\d.]+)% drop-off$/, zh: function (m) { return '↓ 环节转化 ' + m[1] + '% · 流失 ' + m[2] + '%'; } },
  // product-trend funnel step caption: "X.X% →"
  { re: /^([\d.]+)% →$/, zh: function (m) { return m[1] + '% →'; } },
  // payment-success toast: "Payment channel · <name>" (channel name kept as-is)
  { re: /^Payment channel · (.+)$/, zh: function (m) { return '支付渠道 · ' + m[1]; } }
]);
