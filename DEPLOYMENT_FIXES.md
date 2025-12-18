# 🔧 部署问题修复指南

## ❌ 当前问题：Internal Server Error

### 问题描述
点击钱包后报错：`Internal server error`

### 可能原因

1. **RECEIVER_ADDRESS 未设置**（最可能）
   - 支付验证需要 `RECEIVER_ADDRESS` 环境变量
   - 如果未设置，会导致支付验证失败

2. **Provider 初始化失败**
   - Base RPC 连接失败
   - 网络问题

3. **支付验证错误**
   - 交易验证失败
   - 链上查询失败

## ✅ 修复步骤

### 1. 检查 Railway 环境变量

**进入 Railway → Settings → Variables，确保以下变量已设置：**

```
PORT=3000
NODE_ENV=production
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
RECEIVER_ADDRESS=0x你的钱包地址（必须设置！）
ADMIN_KEY=你的管理员密钥（可选，用于上传资料）
```

**⚠️ 关键：`RECEIVER_ADDRESS` 必须设置！**

### 2. 检查服务器日志

**进入 Railway → Deployments → 最新部署 → View Logs**

**应该看到的日志：**
```
✅ Connected to Base network: https://mainnet.base.org
✅ Receiver address: 0x...
💰 Receiver: 0x...
```

**如果看到错误：**
```
❌ RECEIVER_ADDRESS not set! Payment verification will fail.
❌ Please set RECEIVER_ADDRESS environment variable in Railway.
```

**解决：** 在 Railway 设置 `RECEIVER_ADDRESS` 环境变量

### 3. 测试健康检查端点

访问：`https://your-app.up.railway.app/health`

**应该返回：**
```json
{
  "status": "ok",
  "timestamp": "2024-12-17T...",
  "network": "base-mainnet",
  "receiverAddress": "0x..."
}
```

**如果 `receiverAddress` 显示 `"Not configured"`：**
- 说明 `RECEIVER_ADDRESS` 未设置
- 需要立即设置环境变量

## 🔍 已添加的错误处理

### 1. 更详细的错误日志

所有 API 端点现在都会记录：
- 错误消息
- 错误堆栈
- 请求上下文

### 2. Provider 初始化检查

- 检查 `RECEIVER_ADDRESS` 是否设置
- 检查 Provider 是否初始化成功
- 在支付验证前检查 Provider 状态

### 3. 友好的错误消息

- 生产环境：隐藏详细错误（安全）
- 开发环境：显示详细错误（调试）

## 📋 检查清单

### 部署前检查

- [ ] `RECEIVER_ADDRESS` 已设置
- [ ] `BASE_RPC_URL` 已设置（或使用默认值）
- [ ] `NETWORK` 已设置（或使用默认值）
- [ ] 服务器日志显示 Provider 初始化成功

### 部署后检查

- [ ] 访问 `/health` 端点，确认 `receiverAddress` 已配置
- [ ] 查看服务器日志，确认没有错误
- [ ] 测试钱包连接，确认不再报错

## 🐛 常见错误和解决方案

### 错误 1: `RECEIVER_ADDRESS not configured`

**原因：** 环境变量未设置

**解决：**
1. 进入 Railway → Settings → Variables
2. 添加 `RECEIVER_ADDRESS=0x你的钱包地址`
3. 重新部署

### 错误 2: `Provider not initialized`

**原因：** Provider 初始化失败

**检查：**
1. `BASE_RPC_URL` 是否正确
2. 网络连接是否正常
3. RPC 端点是否可访问

**解决：**
1. 检查 `BASE_RPC_URL` 环境变量
2. 尝试使用其他 RPC 端点：
   ```
   BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
   ```

### 错误 3: `Transaction verification failed`

**原因：** 支付验证失败

**可能原因：**
1. 交易哈希无效
2. 交易未确认
3. 交易金额不足
4. 接收地址不匹配

**检查：**
1. 查看服务器日志中的详细错误
2. 检查交易是否在链上
3. 确认接收地址正确

## 📝 测试步骤

### 1. 健康检查

```bash
curl https://your-app.up.railway.app/health
```

**预期响应：**
```json
{
  "status": "ok",
  "receiverAddress": "0x..."
}
```

### 2. 测试解锁端点

```bash
curl https://your-app.up.railway.app/api/unlock
```

**预期响应：**
```json
{
  "success": false,
  "unlocked": false,
  "message": "Payment required to unlock content",
  "paymentRequirements": { ... }
}
```

**如果返回 500 错误：**
- 检查服务器日志
- 确认 `RECEIVER_ADDRESS` 已设置

### 3. 测试钱包连接

1. 打开网站
2. 点击"解锁内容"
3. 选择钱包
4. 查看浏览器控制台和服务器日志

## 🔄 已修复的问题

- ✅ 添加了详细的错误日志
- ✅ 改进了 Provider 初始化检查
- ✅ 添加了友好的错误消息
- ✅ 改进了支付验证错误处理
- ✅ 移除了文件日志（改用 console.log）

## 📞 需要帮助？

如果问题仍然存在：

1. **查看 Railway 日志**
   - 复制所有错误日志
   - 发送给我分析

2. **查看浏览器控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 和 Network 标签
   - 复制错误信息

3. **检查环境变量**
   - 确认所有必需变量已设置
   - 确认值正确（无多余空格）

告诉我具体错误，我可以进一步诊断！
