# 🚀 部署配置完整指南 (v0.1)

## 📋 当前状态

### ✅ 已完成的修复

1. **Internal Server Error 修复**
   - ✅ 改进了错误处理
   - ✅ 添加了详细的错误日志
   - ✅ 改进了 Provider 初始化检查

2. **资料存储方案**
   - ✅ 已实现文件上传和下载 API
   - ✅ 资料文件已从 Git 中移除（`.gitignore`）
   - ✅ 支持通过 API 上传资料

### ⚠️ 需要配置的事项

1. **Railway 环境变量**（必须设置）
2. **Railway Volume**（推荐，用于持久化存储资料）

---

## 1️⃣ 修复 Unlock 错误：配置环境变量

### 问题原因

点击 unlock 时出现 "Internal server error" 的原因是：
- `RECEIVER_ADDRESS` 环境变量未在 Railway 中设置
- `generatePaymentRequirements()` 函数检查到未设置后抛出错误
- 错误被捕获，返回 500 错误

### 解决步骤

#### 步骤 1：在 Railway 设置环境变量

1. 登录 [Railway](https://railway.app)
2. 进入你的项目
3. 点击 **Settings** → **Variables**
4. 添加以下环境变量：

```env
# 必需的环境变量
PORT=3000
NODE_ENV=production
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
RECEIVER_ADDRESS=0x你的钱包地址（必须！）

# 可选的环境变量
ADMIN_KEY=你的管理员密钥（用于上传资料）
```

#### 步骤 2：验证配置

1. **检查健康检查端点**
   ```bash
   curl https://your-app.up.railway.app/health
   ```
   
   应该返回：
   ```json
   {
     "status": "ok",
     "timestamp": "2024-12-XX...",
     "network": "base-mainnet",
     "receiverAddress": "0x..."
   }
   ```

2. **查看 Railway 日志**
   - Railway → Deployments → 最新部署 → View Logs
   - 应该看到：
     ```
     ✅ Connected to Base network: https://mainnet.base.org
     ✅ Receiver address: 0x...
     🚀 x402 Payment Server running on port 3000
     ```

3. **测试 Unlock 功能**
   - 打开网站
   - 点击"解锁内容"
   - 应该不再出现 "Internal server error"
   - 应该看到支付要求（402 响应）

#### 步骤 3：重新部署

设置环境变量后，Railway 会自动重新部署。如果没有自动部署：
1. 点击 **Deployments**
2. 点击 **Redeploy**

---

## 2️⃣ 资料存储方案配置

### 📦 当前方案说明

**已实现的方案：** 服务器文件系统存储

**存储位置：**
- 本地开发：`/Users/ryan/Personalcz/materials/downloads/`
- Railway 部署：`/app/materials/downloads/`

**⚠️ 重要限制：**
- Railway 的容器文件系统是**临时的**
- 服务器重启后文件会丢失
- 重新部署后文件会丢失

### ✅ 解决方案：配置 Railway Volume（推荐）

#### 方案 A：使用 Railway Volume（持久化存储）

**优点：**
- ✅ 数据持久化，重启不丢失
- ✅ 重新部署不丢失
- ✅ 简单易用，无需修改代码

**配置步骤：**

1. **创建 Volume**
   - Railway 项目 → **New** → **Volume**
   - 名称：`materials-storage`
   - 挂载路径：`/app/materials`
   - 点击 **Create**

2. **验证 Volume**
   - Volume 创建后会自动挂载
   - 代码会自动使用 `/app/materials/downloads/` 路径
   - 无需修改代码

3. **上传资料文件**

   **方法 1：使用上传脚本（推荐）**
   
   ```bash
   # 设置环境变量
   export RAILWAY_URL=https://your-app.up.railway.app
   export ADMIN_KEY=your-admin-key
   
   # 上传文件
   ./upload-material.sh ./my-file.pdf m1 "资料标题" "资料描述"
   ```
   
   **方法 2：使用 curl**
   
   ```bash
   curl -X POST https://your-app.up.railway.app/api/admin/upload \
     -H "X-Admin-Key: your-admin-key" \
     -H "X-Material-ID: m1" \
     -H "X-Filename: my-file.pdf" \
     -H "X-Title: 资料标题" \
     -H "X-Description: 资料描述" \
     -H "Content-Type: application/octet-stream" \
     --data-binary @./my-file.pdf
   ```

4. **验证上传**
   
   ```bash
   # 检查 materials-config.json（会显示文件信息）
   curl https://your-app.up.railway.app/materials-config.json
   ```

#### 方案 B：使用云存储（长期方案）

如果资料文件很多或需要更可靠的存储，可以迁移到云存储：

**推荐服务：**
- Cloudflare R2（免费额度大，兼容 S3 API）
- AWS S3
- 阿里云 OSS

**实现步骤：**
1. 创建云存储桶
2. 安装 SDK：`npm install @aws-sdk/client-s3`
3. 修改 `server.js` 集成云存储
4. 配置环境变量（存储密钥等）

**详细文档：** 见 `MATERIALS_STORAGE_GUIDE.md`

---

## 3️⃣ 资料上传详细说明

### 上传 API

**端点：** `POST /api/admin/upload`

**请求头：**
```
X-Admin-Key: {ADMIN_KEY}        # 必需：管理员密钥
X-Material-ID: m1               # 必需：资料 ID
X-Filename: my-file.pdf         # 必需：文件名
X-Title: 资料标题                # 可选：标题
X-Description: 资料描述          # 可选：描述
X-Material-Type: pdf            # 可选：类型（默认 pdf）
Content-Type: application/octet-stream
```

**请求体：** 文件的二进制内容

**响应：**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "materialId": "m1",
  "filename": "my-file.pdf",
  "filePath": "materials/downloads/my-file.pdf"
}
```

### 使用上传脚本

1. **设置环境变量**
   ```bash
   export RAILWAY_URL=https://your-app.up.railway.app
   export ADMIN_KEY=your-admin-key
   ```

2. **上传文件**
   ```bash
   ./upload-material.sh ./report.pdf m1 "2024 Q4 报告" "季度分析报告"
   ```

3. **检查结果**
   ```bash
   # 查看 materials-config.json
   cat materials-config.json
   ```

### 资料配置

上传后，文件信息会自动添加到 `materials-config.json`：

```json
{
  "materials": [
    {
      "id": "m1",
      "title": "资料标题",
      "description": "资料描述",
      "type": "pdf",
      "filename": "my-file.pdf",
      "downloadPath": "materials/downloads/my-file.pdf"
    }
  ]
}
```

---

## 4️⃣ 完整配置检查清单

### ✅ Railway 环境变量

- [ ] `PORT=3000`
- [ ] `NODE_ENV=production`
- [ ] `NETWORK=base-mainnet`
- [ ] `BASE_RPC_URL=https://mainnet.base.org`
- [ ] `RECEIVER_ADDRESS=0x你的钱包地址` ⚠️ **必须设置**
- [ ] `ADMIN_KEY=你的管理员密钥`（可选，用于上传资料）

### ✅ Railway Volume

- [ ] 已创建 Volume：`materials-storage`
- [ ] 挂载路径：`/app/materials`
- [ ] Volume 状态：已连接

### ✅ 测试步骤

1. **健康检查**
   ```bash
   curl https://your-app.up.railway.app/health
   ```
   - [ ] 返回 `status: "ok"`
   - [ ] 返回 `receiverAddress: "0x..."`

2. **Unlock 功能**
   - [ ] 打开网站
   - [ ] 点击"解锁内容"
   - [ ] 不再出现 "Internal server error"
   - [ ] 显示支付要求（402 响应）

3. **资料上传**（如果配置了 ADMIN_KEY）
   - [ ] 使用上传脚本上传测试文件
   - [ ] 文件成功上传
   - [ ] `materials-config.json` 已更新

4. **资料下载**（支付后）
   - [ ] 用户支付后可以下载文件
   - [ ] 未支付用户无法下载（403 错误）

---

## 5️⃣ 故障排查

### 问题：Unlock 仍然报错 "Internal server error"

**检查：**
1. Railway 环境变量 `RECEIVER_ADDRESS` 是否设置
2. 值是否正确（无多余空格）
3. Railway 日志中是否有错误信息

**解决：**
```bash
# 检查健康检查端点
curl https://your-app.up.railway.app/health

# 如果 receiverAddress 显示 "Not configured"，说明环境变量未设置
```

### 问题：资料文件丢失

**原因：**
- 没有配置 Railway Volume
- 服务器重启或重新部署

**解决：**
1. 创建 Railway Volume（见方案 A）
2. 重新上传资料文件

### 问题：无法上传资料

**检查：**
1. `ADMIN_KEY` 环境变量是否设置
2. 请求头 `X-Admin-Key` 是否正确
3. 文件大小是否超过 100MB 限制

**解决：**
```bash
# 检查环境变量
# Railway → Settings → Variables → ADMIN_KEY

# 测试上传
curl -X POST https://your-app.up.railway.app/api/admin/upload \
  -H "X-Admin-Key: your-admin-key" \
  -H "X-Material-ID: test1" \
  -H "X-Filename: test.pdf" \
  --data-binary @./test.pdf
```

---

## 6️⃣ 下一步操作

### 立即执行（必须）

1. ✅ **设置 Railway 环境变量**
   - 进入 Railway → Settings → Variables
   - 添加 `RECEIVER_ADDRESS=0x你的钱包地址`
   - 等待自动重新部署

2. ✅ **验证修复**
   - 访问 `/health` 端点
   - 测试 unlock 功能
   - 查看 Railway 日志确认无错误

### 推荐执行（建议）

3. ✅ **创建 Railway Volume**
   - Railway → New → Volume
   - 名称：`materials-storage`
   - 挂载路径：`/app/materials`

4. ✅ **上传资料文件**
   - 使用上传脚本上传资料
   - 验证文件可以正常下载

### 长期规划（可选）

5. ⏸️ **迁移到云存储**
   - 如果资料文件很多
   - 如果需要更高的可靠性
   - 参考 `MATERIALS_STORAGE_GUIDE.md`

---

## 📚 相关文档

- `FIXES_SUMMARY.md` - 修复总结
- `MATERIALS_STORAGE_GUIDE.md` - 资料存储详细指南
- `DEPLOYMENT_FIXES.md` - 部署问题诊断
- `ENV_SETUP.md` - 环境变量配置说明

---

## 🆘 需要帮助？

如果遇到问题：

1. **查看 Railway 日志**
   - Railway → Deployments → 最新部署 → View Logs
   - 复制错误信息

2. **查看浏览器控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 和 Network 标签

3. **检查环境变量**
   - 确认所有必需变量已设置
   - 确认值正确（无多余空格）

告诉我具体错误，我可以进一步诊断！

