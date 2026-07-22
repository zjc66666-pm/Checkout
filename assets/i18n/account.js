/* BestShopio prototypes — i18n dictionary for the standalone account / SSO pages
   (prototypes/account/*.html). These pages don't load the SPA shell, so each one loads
   ../assets/i18n.js + this file directly. Brands (BestShopio / Google / Lark) and sample
   data (emails, domains, store names) stay English. Common words (Change password, Sign
   out, Cancel, Done, New password…) are already in the engine's base dict. */
(function () {
  'use strict';
  if (!window.I18N || !window.I18N.extend) return;

  window.I18N.extend({
    // ---- shared hero / oauth (signin, register, forgot, staff) ----
    'Welcome to': '欢迎使用',
    'Sign in to the shop': '登录店铺后台',
    'Sign in': '登录', 'Sign in now': '立即登录', 'Go to sign in': '前往登录',
    'Register': '注册', 'Forgot password': '忘记密码',
    'Email': '邮箱', 'Password': '密码', 'Confirm password': '确认密码',
    'Verification code': '验证码', 'Verification': '验证', 'Verify': '验证',
    'Send': '发送', 'Send code': '发送验证码', 'Resend': '重新发送',
    'or': '或', 'Show password': '显示密码',
    'Sign in with Google': '使用 Google 登录', 'Sign in with Lark': '使用 Lark 登录',
    'Already have an account?': '已有账户？',

    // ---- validation / toasts (auth.js + inline) ----
    'Please enter email': '请输入邮箱',
    'The email you entered is invalid': '邮箱格式不正确',
    'The email you entered is not registered': '该邮箱尚未注册',
    'The email has been registered': '该邮箱已被注册',
    'Please enter password': '请输入密码',
    'Please enter verification code': '请输入验证码',
    'Incorrect verification code': '验证码不正确',
    'Verification code sent': '验证码已发送',
    'Signed in successfully': '登录成功',
    'Registration successful': '注册成功',

    // ---- forgot password ----
    'Please verify your login account to reset your password': '请验证你的登录账户以重置密码',
    'Reset password': '重置密码',
    'Success!': '成功！',
    'Your password has been reset.': '你的密码已重置。',

    // ---- staff register (invite) ----
    'Please use the invited account to complete the registration': '请使用受邀账户完成注册',
    'Current login account': '当前登录账户',
    'The invitation link has expired or is invalid': '邀请链接已过期或无效',
    'Please ask the store owner to send a new invitation.': '请联系店铺所有者重新发送邀请。',

    // ---- stores portal ----
    'Stores': '店铺',
    'Choose a store to get started': '选择一个店铺开始吧',
    'Good morning, choose a store to get started': '早上好，选择一个店铺开始吧',
    'Good afternoon, choose a store to get started': '下午好，选择一个店铺开始吧',
    'Good evening, choose a store to get started': '晚上好，选择一个店铺开始吧',
    'Request access to a store': '申请加入店铺',
    'Create store': '创建店铺',
    'Create a new store': '创建新店铺',
    'Live in under 3 minutes': '3 分钟内即可上线',
    'Total order': '总订单数', 'Total order amount': '订单总额', 'in 30 days': '近 30 天',
    'Setting up your store…': '正在创建你的店铺…',
    // store status tags
    'Active': '运营中', 'Provisioning': '开通中',
    'Request pending': '申请待审核', 'Request rejected': '申请被拒', 'No access': '无权限',
    // request-access modal
    'Store name': '店铺名称', 'Store url': '店铺网址', 'Access code': '访问码',
    'Please enter store name': '请输入店铺名称',
    'Format: www.domain.com. Exclude protocols (https://)': '格式：www.domain.com，不含协议头（https://）',
    'Unique code shared by the store administrator': '由店铺管理员提供的专属访问码',
    'Please enter store url': '请输入店铺网址',
    'Please enter access code': '请输入访问码',
    'The information provided does not match any store in our system. Please double-check your credentials': '所填信息与系统中的任何店铺都不匹配，请核对后重试',
    'Request sent successfully!': '申请已发送！',
    'A pending account request has been created.': '已创建一条待审核的加入申请。',
    'Please wait for the store owner to approve your access.': '请等待店铺所有者批准你的访问权限。',
    'OK': '确定',

    // ---- create store wizard ----
    'Back to stores': '返回店铺列表',
    'Create a store': '创建店铺',
    'Add your basic store information and complete the setup. Everything else — hosting, database, search, email, a free domain and SSL — is set up for you automatically in under 3 minutes.':
      '填写店铺基本信息并完成设置。其余一切——主机、数据库、搜索、邮件、免费域名与 SSL——都会在 3 分钟内自动为你配置好。',
    'Add your basic store information and complete the setup': '填写店铺基本信息并完成设置',
    'Give your store a name': '给你的店铺起个名字',
    'A great store name is a big part of your success. Make sure it aligns with your brand and products.': '好名字是成功的重要一环。请确保它契合你的品牌与商品。',
    "How'd you like to call your store?": '你想给店铺起什么名字？',
    "Where's your store located?": '你的店铺位于哪里？',
    "Set your store's default location so we can host it in the nearest region and optimize speed for your customers.": '设置店铺默认所在地，我们会就近部署、为你的顾客优化访问速度。',
    'Your store will be hosted in our': '你的店铺将部署在我们的',
    'region.': '区域。',
    'Choose store currency': '选择店铺币种',
    'This is the main currency you wish to sell in.': '这是你主要的销售币种。',
    'USD is selected by default. You can change it at any time in your store settings.': '默认选择 USD，你可以随时在店铺设置中修改。',
    'Store contact email': '店铺联系邮箱',
    "This is the email you'll use to send notifications to and receive orders from customers.": '你将用这个邮箱向顾客发送通知、接收订单。',
    "This is different from your account email. We'll email a 6-digit code to confirm you own it.": '该邮箱与你的账户邮箱不同。我们会发送一个 6 位验证码以确认归属。',
    'Preview the email': '预览邮件',
    '(demo code: 288866)': '（演示验证码：288866）',
    'Enter the 6-digit code': '输入 6 位验证码',
    'Email verified': '邮箱已验证',
    'Store contact phone number': '店铺联系电话',
    'Our customer service team will provide exclusive support to this number. Change it anytime.': '我们的客服团队将为该号码提供专属支持，可随时修改。',
    'Please enter phone number': '请输入电话号码',
    'Please enter a valid email': '请输入有效邮箱',
    'Please verify this email before continuing': '请先验证该邮箱再继续',
    // country options (native <select>)
    'United States': '美国', 'Canada': '加拿大', 'Mexico': '墨西哥', 'Brazil': '巴西',
    'United Kingdom': '英国', 'Germany': '德国', 'Spain': '西班牙', 'France': '法国',
    'Italy': '意大利', 'Netherlands': '荷兰', 'Singapore': '新加坡',
    'Hong Kong, China': '中国香港', 'Australia': '澳大利亚', 'Japan': '日本',
    // hosting region names
    'Frankfurt (EU)': '法兰克福（欧盟）', 'London (UK)': '伦敦（英国）',
    // currency options
    'USD — US Dollar': 'USD — 美元', 'EUR — Euro': 'EUR — 欧元', 'GBP — British Pound': 'GBP — 英镑',
    'CAD — Canadian Dollar': 'CAD — 加元', 'AUD — Australian Dollar': 'AUD — 澳元',

    // ---- provisioning ----
    'Setting up your store': '正在创建你的店铺',
    "This usually takes under 3 minutes. You can leave this page — we'll keep working in the background.": '通常 3 分钟内完成。你可以离开此页面——我们会在后台继续处理。',
    'Setting up your store database': '正在创建店铺数据库',
    'Configuring cache': '正在配置缓存',
    'Preparing media storage': '正在准备媒体存储',
    'Building product search index': '正在构建商品搜索索引',
    'Wiring up the message queue': '正在接入消息队列',
    'Connecting order management': '正在连接订单管理',
    'Assigning your store domain': '正在分配店铺域名',
    'Securing with SSL': '正在配置 SSL 加密',
    'Setting up email & monitoring': '正在设置邮件与监控',
    'Loading your starter theme': '正在载入初始主题',
    'Your store is ready': '你的店铺已就绪',
    'Everything is set up. Add products, connect payments and go live.': '一切就绪。添加商品、接入收款，即可上线。',
    'Go to dashboard': '进入后台',
    'You can safely close this tab —': '你可以安全关闭此标签页——',
    'back to stores': '返回店铺列表',

    // ---- verification email mockup (email-verify.html) ----
    'Prototype · the email a merchant receives when they set a new store contact email': '原型 · 商家设置新的店铺联系邮箱时收到的邮件',
    'From': '发件人', 'Subject': '主题',
    'Verify your store contact email': '验证你的店铺联系邮箱',
    'Confirm your store contact email': '确认你的店铺联系邮箱',
    "You're setting": '你正在将',
    "as the contact email for your store. Enter this code to confirm it's you:": '设为店铺的联系邮箱。请输入以下验证码以确认是你本人：',
    'This code expires in 5 minutes.': '验证码 5 分钟内有效。',
    "Keep this code private — BestShopio will never ask you for it. If you didn't request this, you can safely ignore this email and your store's contact email won't change.": '请妥善保管此验证码——BestShopio 绝不会向你索取。如果这不是你本人操作，可忽略此邮件，店铺联系邮箱不会变更。',
    "This is an automated message from BestShopio — please don't reply.": '这是来自 BestShopio 的自动邮件——请勿回复。'
  });

  window.I18N.addRules([
    { re: /^Signed in with (.+)$/, zh: function (m) { return '已通过 ' + m[1] + ' 登录'; } },
    { re: /^Setting up (.+)$/, zh: function (m) { return '正在创建 ' + m[1]; } }, // "Setting up your store" handled exactly above
    { re: /^Resend \((\d+)\)$/, zh: function (m) { return '重新发送（' + m[1] + '）'; } },
    { re: /^Please enter a store name \(2.50 characters\)$/, zh: function () { return '请输入店铺名称（2–50 个字符）'; } }
  ]);
})();
