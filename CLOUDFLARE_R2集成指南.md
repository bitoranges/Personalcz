# Cloudflare R2 集成指南

## 📋 需要的配置信息

要集成 Cloudflare R2，你需要提供以下信息：

1. **Account ID**: Cloudflare 账户 ID
2. **Access Key ID**: R2 API 访问密钥 ID
3. **Secret Access Key**: R2 API 密钥
4. **Bucket 名称**: 存储桶名称（从 URL 看应该是 `personalcz`）
5. **Public URL**（可选）: `https://67d9b3f7229e37e0770df1862b259cdc.r2.cloudflarestorage.com/personalcz`

## 🔧 如何获取这些信息

### 1. 获取 Account ID

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 在右侧边栏可以看到 **Account ID**

### 2. 创建 R2 API Token

1. 进入 **R2** → **Manage R2 API Tokens**
2. 点击 **Create API Token**
3. 设置权限（至少需要 Read 和 Write）
4. 保存 **Access Key ID** 和 **Secret Access Key**（只显示一次！）

### 3. 确认 Bucket 名称

从你提供的 URL 看，bucket 名称应该是：`personalcz`

## 🚀 集成步骤

### 步骤 1：安装依赖

```bash
npm install @aws-sdk/client-s3
```

### 步骤 2：设置环境变量

在 Railway 的 **Variables** 中添加：

```env
# Cloudflare R2 配置
R2_ACCOUNT_ID=你的Account_ID
R2_ACCESS_KEY_ID=你的Access_Key_ID
R2_SECRET_ACCESS_KEY=你的Secret_Access_Key
R2_BUCKET_NAME=personalcz
R2_PUBLIC_URL=https://67d9b3f7229e37e0770df1862b259cdc.r2.cloudflarestorage.com/personalcz
```

### 步骤 3：代码集成

代码会自动检测 R2 配置，如果设置了环境变量，就会使用 R2 存储。

## 📝 使用说明

### 上传文件到 R2

上传 API 会自动检测：
- 如果设置了 R2 环境变量 → 上传到 R2
- 如果没有设置 → 使用本地存储（临时）

### 下载文件从 R2

下载 API 会自动：
- 如果文件在 R2 → 生成预签名 URL 或直接返回 R2 URL
- 如果文件在本地 → 从本地文件系统读取

## ⚠️ 重要提示

1. **安全性**：
   - 不要将 `R2_SECRET_ACCESS_KEY` 提交到 Git
   - 只在 Railway 环境变量中设置

2. **权限设置**：
   - R2 API Token 需要至少 Read 和 Write 权限
   - 如果使用公共访问，需要设置 CORS

3. **URL 格式**：
   - 公共 URL：`https://[account-id].r2.cloudflarestorage.com/[bucket-name]`
   - 私有访问：使用预签名 URL

## 🔍 验证集成

1. **检查环境变量**：
   - 确认所有 R2 相关变量已设置

2. **测试上传**：
   ```bash
   curl -X POST https://your-app.up.railway.app/api/admin/upload \
     -H "X-Admin-Key: your-admin-key" \
     -H "X-Material-ID: test1" \
     -H "X-Filename: test.pdf" \
     --data-binary @./test.pdf
   ```

3. **检查日志**：
   - 查看 Deploy Logs 确认 R2 连接成功
   - 应该看到 "✅ R2 storage initialized"

## 📚 相关文档

- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [AWS S3 SDK 文档](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

---

**请提供以下信息，我会帮你完成集成：**

1. Account ID
2. Access Key ID
3. Secret Access Key
4. 确认 bucket 名称是 `personalcz`

