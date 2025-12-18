# 🔍 Railway 应用无法响应诊断指南

## 问题现象

- Railway 显示 "Application failed to respond"
- 应用完全无法访问
- 环境变量已正确设置（`RECEIVER_ADDRESS` 等）

## 可能原因

### 1. 应用启动失败（最常见）

**检查方法：**
1. Railway → Deployments → 最新部署
2. 点击 **View Logs**
3. 查看启动日志，查找错误信息

**常见错误：**

#### 错误 A：依赖安装失败
```
npm ERR! code ELIFECYCLE
npm ERR! errno 1
```
**解决：**
- 检查 `package.json` 中的依赖版本
- 确保所有依赖都兼容 Node.js 版本

#### 错误 B：前端构建失败
```
Error: Cannot find module 'xxx'
```
**解决：**
- 确保 `frontend/package.json` 存在
- 检查构建脚本是否正确

#### 错误 C：端口监听失败
```
Error: listen EADDRINUSE: address already in use :::3000
```
**解决：**
- Railway 会自动设置 `PORT` 环境变量
- 确保代码使用 `process.env.PORT`

#### 错误 D：Provider 初始化失败
```
❌ Failed to initialize provider
```
**解决：**
- 检查 `BASE_RPC_URL` 是否正确
- 检查网络连接

### 2. 运行时崩溃

**检查方法：**
1. Railway → Deployments → 最新部署
2. 查看实时日志
3. 查找崩溃前的最后一条日志

**常见原因：**
- 未捕获的异常
- 内存溢出
- 依赖缺失

### 3. 健康检查失败

Railway 会定期检查应用健康状态，如果应用不响应，会显示错误。

**检查：**
- 应用是否在监听端口
- `/health` 端点是否正常响应

## 🔧 诊断步骤

### 步骤 1：查看部署日志

1. Railway → Deployments
2. 点击最新的部署
3. 点击 **View Logs**
4. 查找以下关键词：
   - `Error`
   - `Failed`
   - `Cannot`
   - `❌`

### 步骤 2：检查启动脚本

确保 `package.json` 中的启动脚本正确：

```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### 步骤 3：检查依赖安装

在日志中查找：
```
npm install
```
确认所有依赖都成功安装。

### 步骤 4：检查前端构建

如果使用前端构建，检查：
```
npm run build
```
是否成功完成。

### 步骤 5：测试健康检查端点

如果应用已启动，测试：
```bash
curl https://your-app.up.railway.app/health
```

## 🚨 常见错误和解决方案

### 错误 1：Module not found

**错误信息：**
```
Error: Cannot find module 'ethers'
```

**解决：**
1. 确保 `package.json` 包含所有依赖
2. Railway 会自动运行 `npm install`
3. 如果问题持续，尝试重新部署

### 错误 2：Frontend build failed

**错误信息：**
```
Error: Cannot find module './dist/index.html'
```

**解决：**
1. 确保构建脚本正确：
   ```json
   {
     "scripts": {
       "build": "cd frontend && npm install && npm run build"
     }
   }
   ```
2. 或者使用 Railway 的构建命令

### 错误 3：Provider initialization failed

**错误信息：**
```
❌ Failed to initialize provider
```

**解决：**
1. 检查 `BASE_RPC_URL` 环境变量
2. 检查网络连接
3. 尝试使用不同的 RPC URL（如 Alchemy）

### 错误 4：Port already in use

**错误信息：**
```
Error: listen EADDRINUSE
```

**解决：**
- Railway 会自动设置端口
- 确保代码使用 `process.env.PORT || 3000`

## 📋 检查清单

- [ ] 查看 Railway 部署日志
- [ ] 确认所有依赖已安装
- [ ] 确认前端构建成功（如果使用）
- [ ] 确认环境变量已设置
- [ ] 确认应用正在监听端口
- [ ] 测试 `/health` 端点

## 🔍 获取详细日志

### 方法 1：Railway Web UI

1. Railway → Deployments → 最新部署
2. 点击 **View Logs**
3. 复制所有错误信息

### 方法 2：Railway CLI

```bash
railway logs
```

### 方法 3：检查构建日志

1. Railway → Deployments
2. 查看构建阶段的日志
3. 查找构建错误

## 🛠️ 快速修复尝试

### 尝试 1：重新部署

1. Railway → Deployments
2. 点击 **Redeploy**
3. 等待部署完成

### 尝试 2：清除构建缓存

1. Railway → Settings → General
2. 清除构建缓存
3. 重新部署

### 尝试 3：检查 Node.js 版本

确保 Railway 使用正确的 Node.js 版本：

1. Railway → Settings → Variables
2. 添加：`NODE_VERSION=20`（或你需要的版本）

### 尝试 4：简化启动

临时移除可能导致问题的代码：

1. 注释掉 provider 初始化
2. 只保留基本的 Express 服务器
3. 测试是否能启动
4. 逐步恢复功能

## 📞 需要帮助？

如果以上步骤都无法解决问题：

1. **复制完整的部署日志**（从开始到错误）
2. **复制环境变量列表**（隐藏敏感信息）
3. **告诉我具体的错误信息**

我可以根据具体错误进一步诊断！

## 🔗 相关文档

- Railway 文档：https://docs.railway.app
- 常见错误：https://docs.railway.app/troubleshooting/common-errors

