/* i18n: orders + customers */
window.I18N.extend({
  // ===================== ORDERS =====================
  // ---- page title ----
  "Orders": "订单",

  // ---- list tabs (data.js TABS) ----
  "All": "全部",
  "To Pay": "待付款",
  "To Ship": "待发货",
  "Shipped": "已发货",
  "Awaiting Review": "待评价",
  "Archived": "已归档",
  "Refund": "退款",
  "Cancel": "取消",

  // ---- keyword-type select (data.js KEYWORD_OPTIONS) ----
  "Order number": "订单号",
  "Receiver": "收货人",
  "Email": "邮箱",
  "Phone": "电话",
  "Country/Region": "国家/地区",
  "Product name": "商品名称",
  "Product SPU": "商品 SPU",
  "Product SKU": "商品 SKU",
  "Product barcode": "商品条码",
  "Product ID": "商品 ID",
  "Variant ID": "款式 ID",
  "User": "用户",

  // ---- time-type select (data.js TIME_OPTIONS) ----
  "Creation time": "创建时间",
  "Payment time": "付款时间",
  "Fulfillment time": "发货时间",

  // ---- filter bar ----
  "Search": "搜索",
  "Clear": "清除",
  "Total range": "金额区间",
  "Min": "最小值",
  "Max": "最大值",
  "to": "至",
  "Apply": "应用",

  // ---- list table headers ----
  "Order date": "订单日期",
  "Shipping address": "收货地址",
  "Total": "合计",
  "Order status": "订单状态",
  "Payment status": "付款状态",
  "Payment method": "付款方式",
  "Fulfillment status": "发货状态",
  "Action": "操作",
  "No orders match these filters.": "没有符合筛选条件的订单。",
  "Channel": "渠道",
  "Source": "来源",
  "Shopify write-back": "Shopify 回写",
  "Checkout source": "下单来源",
  "Shopify status": "Shopify 状态",
  "Shopify sync status": "Shopify 同步状态",
  "Shopify order sync": "Shopify 订单同步",
  "Paid BestCheckout orders are automatically created in Shopify. Fulfillment and refunds are managed there.": "BestCheckout 的已付款订单会自动创建到 Shopify。发货和退款请在 Shopify 中处理。",
  "Fulfillment and refunds are managed in Shopify.": "发货和退款请在 Shopify 中处理。",
  "Review order": "查看订单",
  "Review sync": "检查同步",
  "View in Shopify": "在 Shopify 中查看订单",
  "BestCheckout details": "BestCheckout 订单详情",
  "Order source": "下单来源",
  "In Shopify": "已进入 Shopify",
  "Sending to Shopify": "正在同步到 Shopify",
  "Syncing": "同步中",
  "Needs attention": "需处理",
  "Sync after payment": "付款后同步",
  "Created in Shopify": "已在 Shopify 创建",
  "Review": "查看",
  "Retry sync": "重新同步",

  // ---- order status / payment status / fulfillment pills ----
  "To pay": "待付款",
  "To ship": "待发货",
  "Refunded": "已退款",
  "Canceled": "已取消",
  "Done": "完成",
  "Paid": "已付款",
  "Unpaid": "未付款",
  "Fulfilled": "已发货",
  "Unfulfilled": "未发货",

  // ---- inline order source tags ----
  "Bundle": "捆绑销售",
  "View contract": "查看合约",
  "BestCheckout": "BestCheckout",
  "Online store": "在线商店",
  "synced": "已同步",
  "pending": "待处理",
  "failed": "失败",

  // ---- detail header actions ----
  "Verify order": "核销订单",
  "Shipping": "配送",
  "Edit shipping address": "编辑收货地址",
  "Copied": "已复制",

  // ---- detail card titles ----
  "Product": "商品",
  "Amount": "金额",
  "Shipping logistics": "物流信息",
  "Integration": "集成状态",
  "Timeline": "动态时间线",
  "Notes": "备注",

  // ---- products card ----
  "FREE GIFT": "免费赠品",
  "Free": "免费",
  "Recurring order": "周期订单",

  // ---- amount card ----
  "Subtotal": "小计",
  "Order discount": "订单折扣",
  "FREE": "免运费",
  "Free Shipping": "免运费",

  // ---- shipping logistics card ----
  "Logistics": "物流商",
  "Tracking number": "物流单号",
  "Order tracking": "物流追踪",

  // ---- timeline card ----
  "No data": "暂无数据",
  "Captured by BestCheckout funnel": "由 BestCheckout 漏斗捕获",
  "Shopify write-back pending": "Shopify 回写待处理",
  "Written back to Shopify · #SHP-89142": "已回写 Shopify · #SHP-89142",
  "Fulfillment app notified from Shopify": "Shopify 已通知履约 App",
  "Shopify write-back failed · shipping profile stale": "Shopify 回写失败 · 运费配置过期",
  "Waiting for Shopify Admin API acceptance. Fulfillment is held until write-back succeeds.": "等待 Shopify Admin API 接收。回写成功前暂不触发履约。",
  "Written back to Shopify and ready for the installed fulfillment app.": "已回写 Shopify，可由已安装的履约 App 继续处理。",
  "Shopify rejected the write-back because shipping profile data is stale. Retry after fixing Connection.": "Shopify 因运费配置过期拒绝回写。请修复 Connection 后重试。",
  "Order has been written back to Shopify.": "订单已回写 Shopify。",
  "Write-back is queued.": "回写已排队。",
  "Write-back needs attention.": "回写需要处理。",
  "No Shopify write-back status.": "暂无 Shopify 回写状态。",
  "This order was created in Shopify.": "这笔订单已在 Shopify 中创建。",
  "This order is in Shopify and can follow your usual fulfillment process.": "这笔订单已进入 Shopify，可继续沿用原有的发货流程。",
  "This paid order is being sent to Shopify. Fulfillment starts after it appears there.": "这笔已付款订单正在同步到 Shopify；同步完成后即可进入原有发货流程。",
  "Shopify could not create this order. Check the connection, then try again.": "Shopify 未能创建这笔订单。请检查连接后重新同步。",
  "This order will be sent to Shopify after payment.": "这笔订单会在付款后同步到 Shopify。",
  "This paid order is being sent to Shopify again.": "这笔已付款订单正在重新同步到 Shopify。",
  "Shopify sync retried": "已重新发起 Shopify 同步",
  "Order is in Shopify": "订单已进入 Shopify",
  "Order is in Shopify · #SHP-89137": "订单已进入 Shopify · #SHP-89137",

  // ---- notes card ----
  "No notes": "暂无备注",

  // ---- shipping address card ----
  "First name": "名",
  "Last name": "姓",
  "Address": "地址",
  "Apartment": "公寓/门牌",
  "City": "城市",
  "State": "州/省",
  "ZIP code": "邮编",
  "Country": "国家/地区",

  // ---- customer quick profile ----
  "Customer": "客户",
  "View customer": "查看客户",
  "Customer ID": "客户 ID",
  "Customer ID:": "客户 ID：",
  "Nickname": "昵称",
  "User ID": "用户 ID",

  // ---- missing-detail placeholder ----
  "Detail not available in this prototype": "本原型暂无该详情",
  "Open one of the orders with sample detail: SILIX1042, SILIX1041, SILIX1040, SILIX1039 or SILIX1037.": "请打开带示例详情的订单：SILIX1042、SILIX1041、SILIX1040、SILIX1039 或 SILIX1037。",

  // ---- modals: shared footer ----
  "Confirm": "确认",

  // ---- shipping modal ----
  "Please enter Logistics": "请输入物流商",
  "Please enter Tracking number": "请输入物流单号",

  // ---- refund modal ----
  "Refund amount": "退款金额",
  "Reason for refund": "退款原因",
  "Please enter Refund reason": "请输入退款原因",
  "Only you and other staff can see this reason": "该原因仅你和其他员工可见",
  "Please enter Refund amount": "请输入退款金额",
  "Refund submitted": "退款已提交",

  // ---- verify order modal ----
  "Order:": "订单：",
  "Code:": "核销码：",
  "Price": "价格",
  "Remaining": "剩余",
  "Verify qty": "核销数量",
  "Verify": "核销",
  "Please select products to verify": "请选择要核销的商品",
  "Verified": "已核销",

  // ---- edit shipping address modal ----
  "Contact": "联系方式",
  "Delivery": "配送信息",
  "Apartment, suite, etc.(optional)": "公寓、套间等（选填）",
  "Please fill in all required fields.": "请填写所有必填项。",
  "Updated": "已更新",

  // ---- edit note modal (orders + customers) ----
  "Edit note": "编辑备注",
  "Enter note": "请输入备注",
  "Can't be blank": "不能为空",

  // ---- refund reasons (data.js REFUND_REASONS) ----
  "Out of stock": "缺货",
  "Customer changed mind": "客户改变主意",
  "Wrong item shipped": "发错商品",
  "Damaged in transit": "运输中损坏",
  "Size / fit issue": "尺码/版型问题",
  "Duplicate order": "重复下单",
  "Other": "其他",

  // ===================== CUSTOMERS =====================
  // ---- page title ----
  "Customers": "客户",

  // ---- marketing / email subscription status (app.js MK + data.js MARKETING_OPTIONS) ----
  "Subscribed": "已订阅",
  "Not subscribed": "未订阅",
  "Unsubscribed": "已退订",

  // ---- account status (app.js acctBadge + data.js ACCOUNT_OPTIONS) ----
  "Guest": "访客",
  "Registered": "已注册",

  // ---- customer order-status enum (app.js orderStatusCell mapA / mapB) ----
  "Failed group": "拼团失败",
  "To pay balance": "待付尾款",
  "Balance payment expired": "尾款支付已过期",
  "To pick up": "待自提",

  // ---- keyword-type select (data.js KEYWORD_OPTIONS) ----
  "Customer name": "客户名称",

  // ---- filter bar ----
  "Email subscription": "邮件订阅",
  "Account status": "账户状态",
  "Order range": "订单数区间",
  "Amount spent range": "消费金额区间",

  // ---- list table headers ----
  "Location": "地区",
  "Orders": "订单",
  "Amount spent": "消费金额",
  "No customers match these filters.": "没有符合筛选条件的客户。",

  // ---- detail header ----
  "Customer since:": "成为客户时间：",
  "Last order:": "最近订单：",
  "Source:": "来源：",
  "Last signed in :": "上次登录：",
  "Source :": "来源：",

  // ---- stats cards ----
  "Average Order Value": "客单价",

  // ---- order list card ----
  "Order list": "订单列表",
  "View detail": "查看详情",
  "No orders": "暂无订单",
  "Unnamed product": "未命名商品",

  // ---- timeline card ----
  "No activity yet.": "暂无动态。",

  // ---- details card ----
  "Details": "详情",
  "Copy email": "复制邮箱",
  "No information": "暂无信息",

  // ---- subscriptions card ----
  "Subscriptions": "订阅",
  "Subscription date:": "订阅时间：",

  // ---- address card ----
  "No address": "暂无地址",

  // ---- missing-detail placeholder ----
  "Open one of the customers flagged with sample detail: Emma Whitfield, Yuki Tanaka, Ava Johnson or the Toronto guest shopper.": "请打开带示例详情的客户：Emma Whitfield、Yuki Tanaka、Ava Johnson 或多伦多的访客买家。",

  // ---- edit note modal ----
  "Note": "备注"
});

window.I18N.addRules([
  // pagination footer: "Total N records" (orders list, customer list, order-list card)
  { re: /^Total (\d+) records$/, zh: function (m) { return '共 ' + m[1] + ' 条'; } },
  // amount card subtotal sub-label: "· N items"
  { re: /^·\s(\d+) items$/, zh: function (m) { return '· ' + m[1] + ' 件商品'; } },
  // customer order-list card subtotal label: "Subtotal . N items"
  { re: /^Subtotal \. (\d+) items$/, zh: function (m) { return '小计 · ' + m[1] + ' 件商品'; } },
  // total-savings row (orders amount card + customer order-list card): "TOTAL SAVINGS $X"
  { re: /^TOTAL SAVINGS (.+)$/, zh: function (m) { return '共省 ' + m[1]; } },
  // product line unit price x qty: "$X x N"
  { re: /^(\$[\d.,]+) x (\d+)$/, zh: function (m) { return m[1] + ' x ' + m[2]; } },
  // bundle component / customer order product qty: "x N"
  { re: /^x (\d+)$/, zh: function (m) { return 'x ' + m[1]; } },
  // customer list "Orders" cell: "N order" / "N orders"
  { re: /^(\d+) orders?$/, zh: function (m) { return m[1] + ' 笔订单'; } },
  // customer stats card Orders value: "N Orders"
  { re: /^(\d+) Orders$/, zh: function (m) { return m[1] + ' 笔订单'; } },
  // recurring-order strip (subscription order): "... · from SUB-x · cycle N · next charge DATE"
  { re: /^· from (\S+) · cycle (\d+)(?: · next charge (.+))?$/, zh: function (m) {
      return '· 来自 ' + m[1] + ' · 第 ' + m[2] + ' 期' + (m[3] ? ' · 下次扣款 ' + m[3] : '');
  } },
  // customer header source line: "YYYY-MM-DD HH:MM from SOURCE" (date-anchored to stay narrow)
  { re: /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}) from (.+)$/, zh: function (m) { return m[1] + ' · 来自 ' + m[2]; } }
  // note: char counter "N/5000" is digits-only -> no rule. Filter pills ("Total range: $X – $Y",
  // "Email subscription: ...", etc.) are interpolated data; their static labels are translated via
  // the dictionary chips above, and the value half stays as data — no extra rule added.
]);
