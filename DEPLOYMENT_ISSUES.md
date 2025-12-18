# 部署问题诊断和修复

## 🔍 问题分析

### 问题 1: 所有钱包都显示"解锁失败请重试"

**可能原因：**
1. API URL 配置错误（前端无法连接到后端）
2. 服务器端支付验证失败
3. 网络请求被 CORS 阻止
4. 环境变量未正确配置（RECEIVER_ADDRESS 等）

**诊断步骤：**
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签的日志
3. 查看 Network 标签，检查 API 请求：
   - 请求是否发送成功？
   - 返回的状态码是什么？
   - 响应内容是什么？

**已添加的调试日志：**
- `[MaterialsCard]` - 钱包选择和处理
- `[x402-client]` - 支付流程
- `[POST /api/unlock]` - 服务器端处理
- `[verifyPayment]` - 支付验证

### 问题 2: 点击 Binance 后再点 MetaMask，还是调用 Binance

**可能原因：**
1. `rawProvider` 没有正确清除
2. `explicitProvider` 参数没有正确传递
3. 浏览器缓存了 provider 引用

**已修复：**
1. ✅ 在每次选择钱包前清除 `rawProvider` 和 `walletAddress`
2. ✅ 添加了详细的日志来追踪 provider 选择
3. ✅ 确保 `explicitProvider` 正确传递到 `handlePaymentRequired`

## 🔧 检查清单

### 1. 检查 Railway 环境变量

进入 Railway → Settings → Variables，确保以下变量已设置：

```
PORT=3000
NODE_ENV=production
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
RECEIVER_ADDRESS=你的钱包地址（必须设置！）
```

**重要：** 如果 `RECEIVER_ADDRESS` 未设置，支付验证会失败！

### 2. 检查浏览器控制台

打开部署的网站，按 F12，查看 Console：

**应该看到的日志：**
```
[MaterialsCard] Clearing previous provider, selecting wallet: MetaMask
[MaterialsCard] Calling unlockContent with provider: ...
[x402-client] unlockContent: Setting rawProvider: ethereum
[x402-client] Fetching unlock endpoint: ...
```

**如果看到错误：**
- `Failed to fetch` → API URL 配置错误
- `CORS error` → 服务器 CORS 配置问题
- `Payment verification failed` → 检查 RECEIVER_ADDRESS

### 3. 检查 Network 请求

在 Network 标签中：

1. **GET /api/unlock**
   - 应该返回 402 状态码
   - 响应应该包含 `paymentRequirements`

2. **POST /api/unlock**
   - 应该返回 200 状态码
   - 响应应该包含 `unlocked: true` 和 `materials`

**如果返回 402：**
- 支付验证失败
- 检查服务器日志查看具体原因

## 🐛 常见问题

### 问题：所有钱包都失败

**检查：**
1. Railway 环境变量 `RECEIVER_ADDRESS` 是否设置
2. 浏览器控制台是否有错误
3. Network 请求是否成功

### 问题：钱包选择错误

**检查：**
1. 浏览器控制台日志，查看 provider 选择过程
2. 确认每次选择前 `rawProvider` 被清除
3. 确认 `explicitProvider` 正确传递

## 📝 下一步

1. **查看浏览器控制台日志**
   - 复制所有 `[MaterialsCard]` 和 `[x402-client]` 日志
   - 发送给我分析

2. **查看 Railway 日志**
   - 进入 Railway → Deployments → 点击最新部署 → View Logs
   - 查看服务器端日志

3. **测试步骤**
   - 选择一个钱包
   - 查看控制台日志
   - 告诉我具体看到了什么错误

## 🔄 已推送的修复

- ✅ 添加了详细的控制台日志
- ✅ 改进了 provider 清除逻辑
- ✅ 修复了错误处理
- ✅ 移除了文件日志（改用 console.log）

代码已提交，等待推送。请查看浏览器控制台和 Railway 日志，告诉我具体的错误信息。


