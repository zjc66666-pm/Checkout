/* i18n: Google channel workspace — workspace home + Data tracking sub-page (GA4 / Ads / GTM / Remarketing) + events matrix */
window.I18N.extend({
  // ============================== Workspace home ==============================
  // Note: brand names "Google", "GA4", "Google Analytics 4", "Google Ads", "Google
  // Merchant Center", "Google Tag Manager", "Google Remarketing", "YouTube",
  // "Shopping Ads", "Free Listings", "Search", "Shopping" are kept in English.
  "Verify your store domain with Google": "用 Google 验证店铺网域",
  "Verified domain ownership is required for Merchant Center listings, conversion tracking, and to claim ad assets across your Google Ads and YouTube placements.": "验证网域所有权是 Merchant Center 上架、转化追踪、Google Ads / YouTube 广告资产认领的前置条件。",

  "GA4 + Google Ads + Google Tag Manager": "GA4 + Google Ads + Google Tag Manager",
  "Stream conversion events to GA4 via gtag.js (browser) and the Measurement Protocol (server-side); fire Purchase conversions to Google Ads; optionally install a GTM container.": "通过 gtag.js（浏览器端）+ Measurement Protocol（服务器端）将转化事件回传到 GA4；把 Purchase 转化事件回传到 Google Ads；按需安装 GTM 容器。",

  "Product sync": "商品同步",
  "Sync products to Google Merchant Center": "同步商品到 Google Merchant Center",
  "Send your products and variants to Merchant Center for Shopping Ads and Free Listings. Monitor approval status per destination and re-submit rejected items in one click.": "把商品和款式同步到 Merchant Center 用于 Shopping Ads + Free Listings，按渠道监控审核状态、一键重新提交被驳回的商品。",

  "Run Google Ads campaigns": "投放 Google Ads",
  "Open accounts, configure campaigns, track performance, and reconcile finance from one place. Google Ads is the native ad tool for Search, Shopping, and YouTube.": "一站完成账户开通、广告配置、效果跟踪、财务对账。Google Ads 是 Search、Shopping、YouTube 的原生广告工具。",

  // ============================== Data tracking sub-page ==============================
  // Top tip banner — kept as a single text node in google/app.js so the whole sentence matches.
  "Events fire from the storefront browser (gtag.js) and our server-side Measurement Protocol with a shared event_id — GA4 dedupes automatically, so attribution survives iOS 14+ tracking blocks (which would otherwise eat 30–50% of client-side events).": "事件在店面浏览器（gtag.js）和服务器端 Measurement Protocol 同时上报（共享 event_id），GA4 自动去重，归因不受 iOS 14+ 拦截影响（否则浏览器端事件会丢失 30–50%）。",

  // Section titles + lead-in copy (left column of the two-column layout, mirrors Facebook fb-sec)
  "Website data reporting": "Website 数据上报",
  "Send conversion events to Google Analytics 4 and Google Ads, and optionally install a GTM container to manage multiple third-party pixels.": "把转化事件回传到 Google Analytics 4 和 Google Ads；可选安装 GTM 容器统一管理多个三方 pixel。",
  "Audience reporting": "受众群体上报",
  "Build remarketing audiences from your storefront traffic. Requires a connected Google Ads account before this can be configured.": "用店面流量构建 remarketing 受众群体，需要先连接 Google Ads 账号才能配置。",

  // GA4 connector card
  "Stream events to GA4 via gtag.js (browser) and the Measurement Protocol (server-side). Both fire with a shared event_id so GA4 dedupes automatically.": "通过 gtag.js（浏览器端）+ Measurement Protocol（服务器端）将事件回传到 GA4。两侧共享 event_id，GA4 自动去重。",
  "Measurement ID": "Measurement ID",
  "API secret (Measurement Protocol)": "API secret（Measurement Protocol）",
  "GA4 Admin → Data Streams → your stream → Measurement Protocol API secrets → Create.": "GA4 Admin → 数据流 → 你的数据流 → Measurement Protocol API secrets → 创建。",

  // Google Ads connector card
  "Google Ads Conversion": "Google Ads Conversion",
  "Fire the Purchase conversion to Google Ads. Get Conversion ID + Purchase label from Google Ads → Tools → Conversions → your Purchase action.": "把 Purchase 转化事件回传到 Google Ads。Conversion ID 和 Purchase label 在 Google Ads → 工具 → 转化 → 你的 Purchase 动作里获取。",
  "Conversion ID": "Conversion ID",
  "Purchase conversion label": "Purchase 转化 label",
  "Lead conversion label": "Lead 转化 label",
  "Google Ads → Tools → Conversions → your Purchase action → Tag setup → Use Google Tag Manager.": "Google Ads → 工具 → 转化 → 你的 Purchase 动作 → Tag setup → 选 Use Google Tag Manager。",
  "Optional — fired when a lead form is submitted (not used by the core checkout funnel).": "选填——在提交 lead 表单时触发（不参与核心结账漏斗）。",

  // GTM connector card
  "Install a GTM container instead of writing tags inline. Useful when you also run third-party pixels (TikTok, Reddit, Snap) through one tag manager.": "安装 GTM 容器替代手写 tag。当你想用同一个 tag manager 同时管多个三方 pixel（TikTok、Reddit、Snap）时实用。",
  "Container ID": "Container ID",
  "Container version": "Container 版本",
  "(optional)": "(选填)",
  "Tag Manager → workspace → top-right header shows GTM-XXXXXX.": "Tag Manager → workspace → 右上角 header 显示 GTM-XXXXXX。",
  "Latest published": "最新发布",
  "Staging (workspace preview)": "Staging (workspace 预览)",
  "Optional — pin to a specific published version. Default uses the latest published.": "选填——锁定到某个已发布版本。默认使用最新发布版本。",

  // Remarketing placeholder card
  "Build remarketing audiences from your storefront traffic so Google Ads can re-target browsers who didn't buy.": "用店面流量构建 remarketing 受众群体，让 Google Ads 能对未购买的浏览者再次投放。",
  "Remarketing audience": "Remarketing 受众",

  // Events matrix (auto-fired)
  "Events sent automatically": "自动上报事件",
  "BestShopio fires these events client-side (gtag.js) and server-side (Measurement Protocol / Google Ads conversions). You don't install any tracking code per app.": "BestShopio 在客户端（gtag.js）和服务器端（Measurement Protocol / Google Ads 转化）同时上报这些事件。商家无需手动埋码。",
  "Event": "事件",
  "GA4 event name": "GA4 事件名",

  // Event rows (name + fires-when)
  "Page view":                                           "Page view",
  "Every storefront page load":                          "店面每次页面加载",
  "View product / offer":                                "View product / offer",
  "Product page, upsell offer, downsell offer":          "商品页、追加 offer、降级 offer",
  "Add to cart / accept upsell":                         "Add to cart / accept upsell",
  "Cart add + one-click upsell accept":                  "购物车加入 + 一键追加接受",
  "Begin checkout":                                      "Begin checkout",
  "Buyer lands on the checkout page":                    "用户进入结账页面",
  "Payment info added":                                  "Payment info added",
  "Buyer fills payment method":                          "用户填写支付方式",
  "Purchase":                                            "Purchase",
  "Order written back (Thank-you / order_create webhook)": "订单回写（致谢页 / order_create webhook）",
  "Conversion (Purchase)":                               "Conversion (Purchase)",

  // ============================== Buttons / status / shared ==============================
  "events": "个事件",            // chip 上的 "6 events"
  "Set up":                "前往设置",
  "Save":                  "保存",
  "Disconnect":            "断开连接",
  "Linked":                "已连接",
  "Not linked":            "未连接",
  "Not connected yet":     "未连接",
  "Unauthorized":          "未授权",
  "Learn more":            "了解更多",
  "Stored securely · value is masked": "已安全存储 · 值已隐藏",
  "Saved successfully":    "保存成功",
  "This field is required": "此项为必填",
  "Disconnected":          "已断开",
  "OAuth authorization flow — coming soon": "OAuth 授权流程 — 即将上线",

  // Native confirm() — these are best-effort: native dialogs are not always
  // overlay-translatable on every browser, but we keep the key here for parity.
  "Disconnecting will clear the saved credentials (Measurement ID / Conversion ID / Container ID). You'll need to re-enter them to reconnect. Continue?": "断开会清除已保存的凭据（Measurement ID / Conversion ID / Container ID），重新连接时需要重新粘贴。确认断开？",

  // Title attributes (hover hints)
  "Pause reporting (credentials are kept)":   "暂停上报（保留凭据）",
  "Clears Measurement ID and API secret":     "清除 Measurement ID 和 API secret",
  "Clears Conversion ID and labels":          "清除 Conversion ID 和 labels",
  "Clears Container ID and version":          "清除 Container ID 和版本",

  // Styled confirm modal
  "Confirm":            "确认",
  "Cancel":             "取消",
  "Disconnect":         "断开连接",
  "Disconnecting will clear the saved credentials (Measurement ID / Conversion ID / Container ID). You'll need to re-enter them to reconnect.": "断开后将清除已保存的凭据（Measurement ID / Conversion ID / Container ID）。重新连接时需要重新粘贴。",

  // Edit / Connect modal
  "Edit":               "编辑",
  "Connect":            "连接",
  "Save":               "保存",
  "Edit Google Analytics 4":         "编辑 Google Analytics 4",
  "Connect Google Analytics 4":      "连接 Google Analytics 4",
  "Edit Google Ads Conversion":      "编辑 Google Ads Conversion",
  "Connect Google Ads Conversion":   "连接 Google Ads Conversion",
  "Edit Google Tag Manager":         "编辑 Google Tag Manager",
  "Connect Google Tag Manager":      "连接 Google Tag Manager",
  "Clears Measurement ID and API secret. You'll need to re-enter the credentials to reconnect.": "清除 Measurement ID 和 API secret。重新连接时需要重新粘贴。",
  "Clears Conversion ID and labels. You'll need to re-enter the credentials to reconnect.": "清除 Conversion ID 和 labels。重新连接时需要重新粘贴。",
  "Clears Container ID. You'll need to re-enter the credentials to reconnect.": "清除 Container ID。重新连接时需要重新粘贴。",
});
