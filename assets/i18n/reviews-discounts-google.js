/* i18n: reviews + discounts + google */
window.I18N.extend({
  /* ============================== REVIEWS ============================== */
  // page / list
  "Reviews": "评价",
  "Add review": "添加评价",
  "All": "全部",
  "Search": "搜索",
  "Rating": "评分",
  "Status": "状态",
  // status pill / values
  "Visible": "显示中",
  "Hidden": "已隐藏",
  // keyword-field options (utils.ts REVIEW_SEARCH_FIELD_OPTIONS)
  "Review content": "评价内容",
  "Customer name": "客户名称",
  "Product name": "商品名称",
  "Product SPU": "商品 SPU",
  "Product SKU": "商品 SKU",
  "Product barcode": "商品条码",
  "Product ID": "商品 ID",
  "Variant ID": "款式 ID",
  // rating multi-select options
  "1 star": "1 星",
  "2 stars": "2 星",
  "3 stars": "3 星",
  "4 stars": "4 星",
  "5 stars": "5 星",
  // table headers
  "Review": "评价",
  "Customer": "客户",
  "Product": "商品",
  "Action": "操作",
  // table eye button
  "View": "查看",
  // empty / no-match states
  "No reviews match these filters.": "没有符合筛选条件的评价。",
  "Add and manage your reviews": "添加并管理你的评价",
  // detail header
  "Edit review": "编辑评价",
  "Reply": "回复",
  "Back to reviews": "返回评价列表",
  // product card
  "Select a product": "选择商品",
  "Select product": "选择商品",
  "Search products": "搜索商品",
  "No products found.": "未找到商品。",
  "Select": "选择",
  // review details card
  "Review details": "评价详情",
  "Share more details about the product, such as quality, fit, shipping, or overall experience.": "分享更多商品细节，例如质量、版型、物流或整体体验。",
  "Review time (UTC+0)": "评价时间（UTC+0）",
  // media card
  "Photos & videos": "图片与视频",
  "Remove": "移除",
  "Supports files in jpg, png, webp, gif, mp4, webm, and mov formats. Files smaller than 4MB work better. Maximum file size 10MB.": "支持 jpg、png、webp、gif、mp4、webm、mov 格式文件。文件小于 4MB 效果更佳。单个文件最大 10MB。",
  "Video preview": "视频预览",
  // customer card
  "Name": "名称",
  "Reviewer's name": "评价人姓名",
  "Avatar": "头像",
  "Add image": "添加图片",
  "Supports files in jpg/jpeg/png/webp formats. Files smaller than 4MB work better.": "支持 jpg/jpeg/png/webp 格式文件。文件小于 4MB 效果更佳。",
  // recommend card
  "Recommend": "推荐",
  "Show on homepage": "在首页展示",
  "Priority": "优先级",
  "Enter priority": "请输入优先级",
  "Higher priority review show first": "优先级越高的评价越靠前展示",
  // theme card
  "Theme template": "主题模板",
  "Default": "默认",
  "Choose how you'd like the page to look like": "选择页面的展示样式",
  // footer / delete
  "Delete review": "删除评价",
  // missing state
  "Review not found": "未找到评价",
  "Go back and open one of the reviews from the list.": "返回并从列表中打开一条评价。",
  // reply modal
  "Reply name": "回复名称",
  "e.g. Store name": "例如：店铺名称",
  "Reply content": "回复内容",
  "Write a reply...": "撰写回复…",
  // validation toasts (reviewEdit.utils.ts)
  "Please select a product": "请选择商品",
  "Please select rating": "请选择评分",
  "Please enter review content": "请输入评价内容",
  "Please select review time": "请选择评价时间",
  "Please enter customer name": "请输入客户名称",
  "Please enter priority": "请输入优先级",
  "Please enter reply name": "请输入回复名称",
  "Please enter reply content": "请输入回复内容",
  // toasts
  "Updated successfully": "更新成功",
  "Added successfully": "添加成功",
  "Replied successfully": "回复成功",
  "Deleted successfully": "删除成功",
  // discard / delete confirm
  "Discard changes?": "放弃更改？",
  "All unsaved changes will be lost": "所有未保存的更改都将丢失",
  "Discard": "放弃",
  "Cancel": "取消",
  "Confirm to delete?": "确认删除？",
  "Once deleted, the data cannot be retrieved.\nPlease confirm before proceeding!": "删除后数据将无法恢复。\n请确认后再继续！",
  "Delete": "删除",
  "OK": "确定",
  "Save": "保存",

  /* ============================= DISCOUNTS ============================= */
  // page / list
  "Discounts": "折扣",
  "Add discount": "添加折扣",
  "Active": "进行中",
  "Scheduled": "已排期",
  "Expired": "已过期",
  "Title / Discount code": "名称 / 折扣码",
  // table headers
  "Title": "名称",
  "Method": "方式",
  "Type": "类型",
  "Combinations": "叠加",
  "Used": "已使用",
  // copy / row hints
  "Copy code": "复制折扣码",
  "No discounts match these filters.": "没有符合筛选条件的折扣。",
  // type/method/combines filter options
  "Amount off products": "商品立减",
  "Amount off order": "订单立减",
  "Free shipping": "免运费",
  "Code": "折扣码",
  "Automatic": "自动",
  "Product discounts": "商品折扣",
  "Order discounts": "订单折扣",
  "Shipping discounts": "运费折扣",
  // date popover
  "Start date range": "开始日期范围",
  "to": "至",
  "Last week": "最近一周",
  "Last month": "最近一个月",
  "Clear": "清除",
  "Apply": "应用",
  // used popover
  "Times used": "使用次数",
  "Minimum value": "最小值",
  "Maximum value": "最大值",
  "Confirm": "确认",
  // create-type modal
  "Select discount type": "选择折扣类型",
  "Discount specific products or collections of products.": "对指定商品或商品系列进行打折。",
  "Discount the total order amount.": "对订单总额进行打折。",
  "Offer free shipping on an order.": "为订单提供免运费。",
  // detail header / status buttons
  "Back to discounts": "返回折扣列表",
  "Turn on": "启用",
  "Turn off": "停用",
  "Turned on successfully": "已启用",
  "Turned off successfully": "已停用",
  "Please save changes before updating status.": "更新状态前请先保存更改。",
  // method card
  "Discount code": "折扣码",
  "Generate": "生成",
  "Eg. BLACKFRIDAY20": "例如：BLACKFRIDAY20",
  "Customers must enter this code at checkout.": "客户需在结账时输入此折扣码。",
  "Eg. Black Friday": "例如：Black Friday",
  "Customers will see this in their cart and at checkout.": "客户将在购物车和结账时看到该名称。",
  // value card
  "Discount value": "折扣数值",
  "Percentage off": "按百分比",
  "Fixed amount": "固定金额",
  "Percentage": "百分比",
  // applies-to card
  "Applies to": "适用范围",
  "Specific products": "指定商品",
  "Select products": "选择商品",
  // minimum purchase card
  "Minimum purchase requirements": "最低消费要求",
  "No minimum requirements": "无最低要求",
  "Minimum purchase amount": "最低消费金额",
  "Minimum quantity of items": "最低商品件数",
  "Applies to all products": "适用于全部商品",
  "Applies only to selected collections": "仅适用于所选商品系列",
  "Applies only to selected products": "仅适用于所选商品",
  // maximum uses card
  "Maximum discount uses": "折扣最大使用次数",
  "Limit number of times this discount can be used in total": "限制此折扣的总使用次数",
  "Limit number of times this discount can be used per customer": "限制每位客户可使用此折扣的次数",
  "Once per order": "每单一次",
  "If not selected, the amount will be taken off each eligible item in an order.": "若不勾选，则订单中每件符合条件的商品都会享受立减。",
  // countries card
  "Countries": "国家/地区",
  "All countries": "所有国家/地区",
  // eligibility card
  "Eligibility": "适用对象",
  "All customers": "所有客户",
  // combinations card
  "Product discount": "商品折扣",
  "Order discount": "订单折扣",
  "All eligible order discounts will apply": "所有符合条件的订单折扣都将生效",
  "The largest eligible shipping discount will apply in addition to eligible order discounts": "在符合条件的订单折扣之外，还将叠加生效最高的运费折扣",
  "Each eligible item in the cart may receive up to one product discount": "购物车中每件符合条件的商品最多享受一项商品折扣",
  "All eligible order discounts will apply in addition to eligible product discounts": "在符合条件的商品折扣之外，还将叠加生效所有符合条件的订单折扣",
  "The largest eligible shipping discount will apply in addition to eligible product discounts": "在符合条件的商品折扣之外，还将叠加生效最高的运费折扣",
  "Test different combinations to avoid unexpected reductions": "请测试不同的叠加组合，以避免出现意外的折扣力度",
  // active time card
  "Active time": "有效期",
  "Start time (UTC+00:00)": "开始时间（UTC+00:00）",
  "End time (UTC+00:00)": "结束时间（UTC+00:00）",
  "Never expires": "永不过期",
  // timeline card
  "Timeline": "动态时间线",
  "No logs yet.": "暂无记录。",
  // overview card
  "Overview": "概览",
  "Details": "明细",
  "Performance": "效果",
  "Free shipping on all products": "全部商品免运费",
  "No minimum purchase requirement": "无最低消费要求",
  "Applies once per order": "每单仅适用一次",
  "Can't combine with other discounts": "不可与其他折扣叠加",
  "Combines with product, order, and shipping discounts": "可与商品、订单和运费折扣叠加",
  // product picker modal
  "Search products": "搜索商品",
  "No products found.": "未找到商品。",
  "Add": "添加",
  // combinable modal
  "Discount can combine with": "可叠加的折扣",
  "No discounts selected to combine with.": "尚未选择可叠加的折扣。",
  "Done": "完成",
  // save validation toasts
  "Discount code can't be blank": "折扣码不能为空",
  "Title can't be blank": "名称不能为空",
  "Discount value can't be blank": "折扣数值不能为空",
  "Please select at least one product or variant": "请至少选择一个商品或款式",
  "Discount created successfully": "折扣创建成功",
  // discard confirm (discounts variant has trailing period)
  "All unsaved changes will be lost.": "所有未保存的更改都将丢失。",
  // missing state
  "Detail not available in this prototype": "该详情在本原型中暂不可用",

  /* ============================== GOOGLE ============================== */
  // products list page
  "Products": "商品",
  "Sync GMC": "同步至 GMC",
  // submit_status tabs / pills
  "Unsubmitted": "未提交",
  "Submitted": "已提交",
  "Partial submitted": "部分提交",
  "Pending": "待处理",
  "Unknown": "未知",
  // product keyword options
  // ("Product name" / "Product ID" / "Variant ID" shared with Reviews above)
  "Variant": "款式",
  // product table headers
  "Variants": "款式",
  "GMC issues summary": "GMC 问题汇总",
  "Last sync": "最近同步",
  // variants cell label words (each its own span/text node)
  "Approved": "已批准",
  "Total": "合计",
  // issue chips (label words; counts are separate nodes)
  "Disapproved": "未批准",
  "Demoted": "已降权",
  "Not impacted": "未受影响",
  "Unspecified": "未指定",
  "No products match these filters.": "没有符合筛选条件的商品。",
  // variants list page
  "Variants": "款式",
  "Back to products": "返回商品列表",
  "Select all in this product selected": "选择该商品下的全部款式",
  "Select all in this product": "选择该商品下的全部款式",
  "Unselect all": "取消全选",
  // variant filters
  "Price range": "价格区间",
  "Inventory range": "库存区间",
  // variant table headers
  "SKU": "SKU",
  "Price": "价格",
  "Inventory": "库存",
  "Free Listings": "免费商品详情",
  "Shopping Ads": "购物广告",
  "Display Ads": "展示广告",
  "No variants match these filters.": "没有符合筛选条件的款式。",
  // destination statuses (standalone text nodes in cells / cards)
  // ("Approved"/"Disapproved"/"Pending"/"Unsubmitted" shared above)
  "Unknown issue": "未知问题",
  // variant detail
  "Variant Detail": "款式详情",
  "Edit Product": "编辑商品",
  "View raw data": "查看原始数据",
  "Back to variants": "返回款式列表",
  "Opens the storefront product editor (roadmap)": "将打开店铺商品编辑器（规划中）",
  // detail sections
  "Basic information": "基本信息",
  "Basic product data": "商品基础数据",
  "The product information you submit using these attributes is the foundation for creating successful ads and free listings for your products. Make sure everything you submit is of the quality you'd show to a customer.": "你通过这些属性提交的商品信息，是为商品打造成功广告和免费商品详情的基础。请确保提交的所有内容都达到可向客户展示的质量。",
  "Product category": "商品类目",
  "You can use these attributes to organize your advertising campaigns in Google Ads and to override Google's automatic product categorization in specific cases.": "你可以使用这些属性在 Google Ads 中组织广告系列，并在特定情况下覆盖 Google 的自动商品归类。",
  "Product identifiers": "商品标识符",
  "Include codes that identify your product.": "填写可识别你商品的编码。",
  "Detailed product description": "商品详细描述",
  "These attributes are used to provide product identifiers that define the products you're selling in the global marketplace and can help boost the performance of your ads and free listings.": "这些属性用于提供商品标识符，以界定你在全球市场销售的商品，并有助于提升广告和免费商品详情的表现。",
  "Price and availability": "价格与库存状态",
  "These attributes define the price and availability for your products. This information is shown to potential customers in ads and free listings.": "这些属性定义商品的价格与库存状态。这些信息会在广告和免费商品详情中展示给潜在客户。",
  "Shopping campaigns and other configurations": "购物广告系列及其他配置",
  "These attributes are used to control how your product data is used when you create advertising campaigns in Google Ads.": "这些属性用于控制在 Google Ads 中创建广告系列时，如何使用你的商品数据。",
  "Destinations": "投放位置",
  "These attributes can be used to control the different locations where your content can appear. For example, you could use this attribute if you want a product to appear in a dynamic remarketing campaign, but not in a Shopping ads campaign.": "这些属性用于控制内容可出现的不同位置。例如，若你希望某商品出现在动态再营销广告系列中，但不出现在购物广告系列中，便可使用该属性。",
  "Shipping": "运费",
  "These attributes can be used together with the account shipping settings and return settings to help you provide accurate shipping and return costs. People who are shopping online rely on shipping costs and speeds, as well as return policies, to help them make choices about what to buy, so it's important to take the time to submit quality information.": "这些属性可与账户的运费设置和退货设置配合使用，帮助你提供准确的运费和退货费用。网购者会依据运费、配送时效以及退货政策来决定购买，因此花时间提交高质量的信息很重要。",
  // detail field labels
  "Additional image link": "附加图片链接",
  "3D model link": "3D 模型链接",
  "Mobile link": "移动端链接",
  "Canonical link": "规范链接",
  "Structured title": "结构化标题",
  "Structured description": "结构化描述",
  "Google product category": "Google 商品类目",
  "Product type": "商品类型",
  "Brand": "品牌",
  "GTIN": "GTIN",
  "MPN": "MPN",
  "Identifier exists": "存在标识符",
  "Condition": "成色",
  "Adult": "成人内容",
  "Multipack": "多件装",
  "Bundle": "套装",
  "Age group": "年龄段",
  "Color": "颜色",
  "Gender": "性别",
  "Material": "材质",
  "Pattern": "图案",
  "Size": "尺码",
  "Size type": "尺码类型",
  "Size system": "尺码体系",
  "Product length": "商品长度",
  "Product width": "商品宽度",
  "Product height": "商品高度",
  "Product weight": "商品重量",
  "Product detail": "商品细节",
  "Product highlight": "商品亮点",
  "Availability": "库存状态",
  "Availability date": "上架日期",
  "Cost of goods sold": "商品成本",
  "Expiration date": "过期日期",
  "Sale price": "促销价",
  "Sale price effective date": "促销价生效日期",
  "Auto pricing min price": "自动定价最低价",
  "Sell on Google quantity": "Google 在售数量",
  "Ads redirect": "广告跳转链接",
  "Custom label 0": "自定义标签 0",
  "Custom label 1": "自定义标签 1",
  "Custom label 2": "自定义标签 2",
  "Custom label 3": "自定义标签 3",
  "Custom label 4": "自定义标签 4",
  "Promotion ID": "促销 ID",
  "Lifestyle image link": "场景图链接",
  "Excluded destination": "排除的投放位置",
  "Included destination": "包含的投放位置",
  "Pause": "暂停",
  "Country": "国家/地区",
  "Region": "地区",
  "Service": "配送服务",
  "Location ID": "地区 ID",
  "Location group name": "地区分组名称",
  "Postal code": "邮政编码",
  "Min handling time": "最短备货时间",
  "Max handling time": "最长备货时间",
  "Min transit time": "最短运输时间",
  "Max transit time": "最长运输时间",
  "Shipping label": "运费标签",
  "Shipping weight": "运送重量",
  "Shipping length": "运送长度",
  "Shipping width": "运送宽度",
  "Shipping height": "运送高度",
  "Free shipping threshold": "免运费门槛",
  // spec-link footer
  "Product data specification:": "商品数据规范：",
  // raw data page
  "Raw data": "原始数据",
  "Back to variant detail": "返回款式详情",
  // missing state
  "Assembled GMC detail not available in this prototype": "该 GMC 组装详情在本原型中暂不可用",
  // sync toast
  "Sync GMC successfully": "已成功同步至 GMC"
});

window.I18N.addRules([
  /* ---- shared: pagination footer "Total N records" ---- */
  { re: /^Total (\d+) records$/, zh: function (m) { return "共 " + m[1] + " 条记录"; } },

  /* ============================== REVIEWS ============================== */
  // rating / status chip "N selected"
  { re: /^(\d+) selected$/, zh: function (m) { return "已选 " + m[1] + " 项"; } },
  // textarea / input counters "x / y"
  { re: /^(\d+) \/ (\d+)$/, zh: function (m) { return m[1] + " / " + m[2]; } },
  // merchant reply card title "Response from {name}"
  { re: /^Response from (.+)$/, zh: function (m) { return "来自 " + m[1] + " 的回复"; } },
  // active filter tag: Rating
  { re: /^Rating: (.+)$/, zh: function (m) { return "评分：" + m[1].split(", ").map(function (s) { return s.replace(/^(\d+) stars?$/, "$1 星"); }).join("、"); } },
  // active filter tag: Status (Visible/Hidden, comma-joined)
  { re: /^Status: (.+)$/, zh: function (m) {
      var map = { Visible: "显示中", Hidden: "已隐藏" };
      return "状态：" + m[1].split(", ").map(function (s) { return map[s] || s; }).join("、");
    } },

  /* ============================= DISCOUNTS ============================= */
  // filter chips with count "Type · N" / "Method · N" / "Combines · N"
  { re: /^Type · (\d+)$/, zh: function (m) { return "类型 · " + m[1]; } },
  { re: /^Method · (\d+)$/, zh: function (m) { return "方式 · " + m[1]; } },
  { re: /^Combines · (\d+)$/, zh: function (m) { return "叠加 · " + m[1]; } },
  // used chip "N+ used" / "N–M used"
  { re: /^(\d+)(\+| – \d+| – \d+| -\d+|–\d+)? used$/, zh: function (m) { return (m[0].replace(/ used$/, "")) + " 次使用"; } },
  // active filter tags (label prefix translated, value kept)
  { re: /^Title\/Discount code: (.+)$/, zh: function (m) { return "名称 / 折扣码：" + m[1]; } },
  { re: /^Type: (.+)$/, zh: function (m) {
      var map = { "Amount off products": "商品立减", "Amount off order": "订单立减", "Free shipping": "免运费" };
      return "类型：" + m[1].split(", ").map(function (s) { return map[s] || s; }).join("、");
    } },
  { re: /^Method: (.+)$/, zh: function (m) {
      var map = { Code: "折扣码", Automatic: "自动" };
      return "方式：" + m[1].split(", ").map(function (s) { return map[s] || s; }).join("、");
    } },
  { re: /^Combines with: (.+)$/, zh: function (m) {
      var map = { "Product discounts": "商品折扣", "Order discounts": "订单折扣", "Shipping discounts": "运费折扣" };
      return "可叠加：" + m[1].split(", ").map(function (s) { return map[s] || s; }).join("、");
    } },
  { re: /^Times used: (.+)$/, zh: function (m) { return "使用次数：" + m[1]; } },
  // detail page titles
  { re: /^Add (product|order|shipping) discount$/, zh: function (m) {
      var map = { product: "商品", order: "订单", shipping: "运费" };
      return "添加" + map[m[1]] + "折扣";
    } },
  { re: /^Discount #(.+)$/, zh: function (m) { return "折扣 #" + m[1]; } },
  // combinations banner "N discounts"
  { re: /^(\d+) discounts$/, zh: function (m) { return m[1] + " 个折扣"; } },
  // applies-to product "(N of M variants selected)"
  { re: /^\((\d+) of (\d+) variants selected\)$/, zh: function (m) { return "（已选 " + m[1] + "/" + m[2] + " 个款式）"; } },
  // overview value text
  { re: /^(\d+(?:\.\d+)?)% off entire order$/, zh: function (m) { return "整单立减 " + m[1] + "%"; } },
  { re: /^\$(\d+(?:\.\d+)?) off entire order$/, zh: function (m) { return "整单立减 $" + m[1]; } },
  { re: /^(\d+(?:\.\d+)?)% off (\d+) products?$/, zh: function (m) { return m[2] + " 件商品立减 " + m[1] + "%"; } },
  { re: /^\$(\d+(?:\.\d+)?) off (\d+) products?$/, zh: function (m) { return m[2] + " 件商品立减 $" + m[1]; } },
  { re: /^Minimum purchase of \$(\d+(?:\.\d+)?)$/, zh: function (m) { return "最低消费 $" + m[1]; } },
  { re: /^Minimum purchase of (\d+(?:\.\d+)?) items$/, zh: function (m) { return "最低购买 " + m[1] + " 件"; } },
  { re: /^Use (\d+) times in total$/, zh: function (m) { return "总计可使用 " + m[1] + " 次"; } },
  { re: /^Use (\d+) times per customer$/, zh: function (m) { return "每位客户可使用 " + m[1] + " 次"; } },
  { re: /^Combines with (.+) discounts$/, zh: function (m) {
      var map = { product: "商品", order: "订单", shipping: "运费" };
      var parts = m[1].replace(/,? and /g, ", ").split(", ").map(function (s) { return map[s] || s; });
      return "可与" + parts.join("、") + "折扣叠加";
    } },
  { re: /^Start at (.+)$/, zh: function (m) { return "开始于 " + m[1]; } },
  { re: /^End at (.+)$/, zh: function (m) { return "结束于 " + m[1]; } },
  { re: /^(\d+) used$/, zh: function (m) { return "已使用 " + m[1] + " 次"; } },
  { re: /^\$([\d,]+(?:\.\d+)?) in total sales$/, zh: function (m) { return "总销售额 $" + m[1]; } },

  /* ============================== GOOGLE ============================== */
  // selection toolbar "N Selected"
  { re: /^(\d+) Selected$/, zh: function (m) { return "已选 " + m[1] + " 项"; } },
  // issue chips "N Disapproved" / "N Demoted" / "N Not impacted"
  { re: /^(\d+) Disapproved$/, zh: function (m) { return m[1] + " 项未批准"; } },
  { re: /^(\d+) Demoted$/, zh: function (m) { return m[1] + " 项已降权"; } },
  { re: /^(\d+) Not impacted$/, zh: function (m) { return m[1] + " 项未受影响"; } },
  // sync toast with count
  { re: /^Sync GMC successfully \((\d+) product\(s\)\)$/, zh: function (m) { return "已成功同步至 GMC（" + m[1] + " 个商品）"; } },
  // variant missing-state title "Variant <id>"
  { re: /^Variant (gmc-.+)$/, zh: function (m) { return "款式 " + m[1]; } }
]);
