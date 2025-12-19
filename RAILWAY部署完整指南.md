# Railway 完整部署指南

## 📋 部署前准备

### 1. 确保代码已推送到 GitHub

```bash
# 检查 Git 状态
git status

# 如果有未提交的更改，提交并推送
git add .
git commit -m "准备部署到 Railway"
git push origin main
```

### 2. 准备环境变量值

你需要准备以下信息：

- **RECEIVER_ADDRESS**: 你的 Base 网络钱包地址（用于接收 USDC 支付）
- **ADMIN_KEY**: 管理员密钥（用于上传资料，可选但推荐）

---

## 🚀 部署步骤

### 步骤 1：创建新项目

1. 登录 [Railway](https://railway.app)
2. 点击 **"New Project"** 或 **"New"** 按钮
3. 选择 **"GitHub Repository"**
4. 授权 Railway 访问你的 GitHub（如果还没授权）
5. 选择仓库：`bitoranges/Personalcz`
6. 点击 **"Deploy Now"**

### 步骤 2：配置环境变量（必须！）

部署开始后，立即配置环境变量：

1. 在项目页面，点击 **"Variables"** 标签
2. 点击 **"New Variable"** 添加以下变量：

#### 必需的环境变量：

```env
PORT=3000
NODE_ENV=production
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
RECEIVER_ADDRESS=0x你的钱包地址
```

#### 可选的环境变量：

```env
ADMIN_KEY=你的管理员密钥（用于上传资料）
```

**重要提示**：
- `RECEIVER_ADDRESS` 是**必须的**，否则支付功能无法工作
- 确保地址值正确，没有多余空格
- 地址必须以 `0x` 开头

### 步骤 3：等待部署完成

1. 查看 **"Deploy Logs"** 标签，等待构建完成
2. 构建过程包括：
   - 安装依赖
   - 构建前端
   - 启动服务器

3. 检查日志中是否有错误：
   - ✅ 看到 "✅ Server is ready to accept HTTP requests" 表示成功
   - ❌ 看到错误信息需要检查配置

### 步骤 4：获取部署 URL

1. 部署完成后，Railway 会自动生成一个 URL
2. 格式类似：`https://your-app-name.up.railway.app`
3. 点击 **"Settings"** → **"Domains"** 可以配置自定义域名

---

## ✅ 验证部署

### 1. 健康检查

访问健康检查端点：

```bash
curl https://your-app-name.up.railway.app/health
```

应该返回：

```json
{
  "status": "ok",
  "timestamp": "2025-12-19T...",
  "network": "base-mainnet",
  "receiverAddress": "0x...",
  "provider": "initialized",
  "frontendExists": true
}
```

### 2. 访问网站

在浏览器中打开部署 URL，应该能看到你的网站。

### 3. 测试支付功能

1. 点击 "Unlock" 按钮
2. 连接钱包（MetaMask 等）
3. 确认支付要求显示正确
4. 完成支付测试

---

## 📦 资料存储方案（不使用 Volume）

由于 Railway Volume 不稳定，推荐使用以下方案：

### 方案 1：云存储（推荐）

使用云存储服务存储资料文件：

#### 选项 A：Cloudflare R2（推荐，免费额度大）

1. 注册 Cloudflare R2
2. 创建存储桶
3. 获取 API 密钥
4. 修改代码使用 R2 SDK 上传/下载文件

#### 选项 B：AWS S3 / 阿里云 OSS / 腾讯云 COS

类似 R2，使用对应的 SDK。

### 方案 2：临时存储（开发测试用）

如果只是测试，可以：
- 使用 Railway 容器临时存储（重启会丢失）
- 每次重新部署后重新上传资料

### 方案 3：外部文件服务器

将资料文件放在独立的文件服务器上，通过 URL 访问。

---

## 🔧 配置文件说明

### railway.json

项目根目录的 `railway.json` 已配置好：

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install --production=false --ignore-scripts && cd frontend && npm install --legacy-peer-deps && cd .. && npm run build"
  },
  "deploy": {
    "startCommand": "node --trace-warnings server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

**关键配置**：
- `startCommand`: 直接使用 `node` 命令，避免 npm 包装问题
- `healthcheckPath`: 健康检查路径
- `healthcheckTimeout`: 100 秒超时

### package.json

启动脚本已配置：

```json
{
  "scripts": {
    "start": "node --trace-warnings server.js"
  }
}
```

---

## 🐛 常见问题排查

### 问题 1：502 Bad Gateway

**可能原因**：
- 环境变量未设置
- 服务器启动失败
- 端口配置错误

**解决方法**：
1. 检查 **Deploy Logs** 是否有错误
2. 确认 `RECEIVER_ADDRESS` 已设置
3. 确认 `PORT=3000` 已设置
4. 检查服务器是否成功启动

### 问题 2：Internal Server Error

**可能原因**：
- `RECEIVER_ADDRESS` 未设置或格式错误
- RPC 连接失败

**解决方法**：
1. 检查环境变量 `RECEIVER_ADDRESS` 是否正确
2. 检查 `BASE_RPC_URL` 是否可访问
3. 查看 **Deploy Logs** 中的错误信息

### 问题 3：前端页面无法加载

**可能原因**：
- 前端构建失败
- 静态文件路径错误

**解决方法**：
1. 检查 **Build Logs** 确认前端构建成功
2. 确认 `frontend/dist/` 目录存在
3. 检查 **Deploy Logs** 中是否有文件服务错误

### 问题 4：健康检查失败

**可能原因**：
- 服务器启动时间过长
- 健康检查路径错误

**解决方法**：
1. 增加 `healthcheckTimeout`（已在 railway.json 中设置为 100 秒）
2. 确认 `/health` 端点可访问
3. 检查服务器启动日志

---

## 📝 部署后检查清单

- [ ] 环境变量已全部设置
- [ ] 部署日志显示成功
- [ ] 健康检查返回 `{"status":"ok"}`
- [ ] 网站可以正常访问
- [ ] 前端页面正常显示
- [ ] 支付功能可以正常使用
- [ ] 钱包连接正常

---

## 🔄 重新部署

如果需要重新部署：

1. **推送代码到 GitHub**：
   ```bash
   git add .
   git commit -m "更新代码"
   git push origin main
   ```

2. **Railway 会自动检测并重新部署**

3. **或者手动触发**：
   - 在 Railway 项目页面
   - 点击 **"Deployments"**
   - 点击 **"Redeploy"**

---

## 🆘 需要帮助？

如果遇到问题：

1. **查看日志**：
   - **Build Logs**: 构建过程
   - **Deploy Logs**: 服务器启动和运行日志
   - **HTTP Logs**: HTTP 请求日志

2. **检查配置**：
   - 环境变量是否正确
   - `railway.json` 配置是否正确
   - GitHub 仓库连接是否正常

3. **联系支持**：
   - Railway 支持：https://railway.app/help
   - 项目 Issues：在 GitHub 仓库创建 issue

---

## 📚 相关文档

- `配置说明_中文.md` - 详细配置说明
- `ENV_SETUP.md` - 环境变量配置
- `502错误根本原因分析.md` - 502 错误排查
- `Volume挂载问题修复_v2.md` - Volume 相关问题（如果将来使用）

---

## ⚠️ 重要提示

1. **不要提交敏感信息**：
   - `.env` 文件已在 `.gitignore` 中
   - 环境变量只在 Railway 中设置

2. **资料文件不要提交到 Git**：
   - `materials/` 目录已在 `.gitignore` 中
   - 使用云存储或其他方案存储资料

3. **定期备份**：
   - 备份 `materials-config.json`
   - 备份环境变量配置
   - 备份重要数据

4. **监控部署**：
   - 定期检查部署状态
   - 监控错误日志
   - 设置告警（如果 Railway 支持）

---

**部署愉快！** 🚀

