# 📦 资料存储方案详细指南

## 🎯 当前实现方案

### 方案：服务器文件系统存储（当前实现）

**存储位置：**
- 文件保存在服务器的 `materials/downloads/` 目录
- 路径：`/app/materials/downloads/`（在 Railway 部署环境中）

**工作原理：**
1. 通过 `POST /api/admin/upload` API 上传文件
2. 文件直接写入服务器文件系统
3. 文件路径保存在 `materials-config.json` 中
4. 用户支付后通过 `GET /api/download/:materialId` 下载文件

**代码实现：**
```javascript
// server.js - 上传接口
app.post('/api/admin/upload', express.raw({ type: '*/*', limit: '100mb' }), (req, res) => {
  // 1. 验证管理员权限（X-Admin-Key）
  // 2. 创建 materials/downloads 目录（如果不存在）
  // 3. 保存文件到 materials/downloads/{filename}
  // 4. 更新 materials-config.json
});
```

## ⚠️ 重要限制和注意事项

### Railway 文件系统特性

**⚠️ 关键问题：Railway 的文件系统是临时的！**

- ✅ 文件可以正常保存和读取
- ❌ **服务器重启后文件会丢失**
- ❌ **重新部署后文件会丢失**
- ❌ **容器重建后文件会丢失**

**这意味着：**
- 如果服务器重启，所有上传的资料都会丢失
- 如果重新部署代码，所有资料都会丢失
- 需要定期备份资料文件

## ✅ 解决方案对比

### 方案一：Railway Volume（推荐，持久化存储）

**优点：**
- ✅ 数据持久化，重启不丢失
- ✅ 简单易用，无需额外服务
- ✅ Railway 原生支持

**缺点：**
- ⚠️ 需要手动创建 Volume
- ⚠️ 需要配置挂载路径

**实现步骤：**

1. **在 Railway 创建 Volume**
   ```
   Railway 项目 → New → Volume
   名称：materials-storage
   挂载路径：/app/materials
   ```

2. **修改 server.js 使用 Volume 路径**
   ```javascript
   // 使用环境变量指定路径
   const MATERIALS_DIR = process.env.MATERIALS_DIR || path.join(__dirname, 'materials', 'downloads');
   ```

3. **上传文件**
   - 通过 API 上传（文件会自动保存到 Volume）
   - 或通过 Railway CLI 直接上传

**当前代码已支持：**
- ✅ 代码已经使用相对路径 `materials/downloads/`
- ✅ 如果 Volume 挂载到 `/app/materials`，代码会自动使用
- ✅ 无需修改代码，只需创建 Volume

### 方案二：云存储（最安全，推荐生产环境）

**使用 AWS S3 / Cloudflare R2 / 阿里云 OSS**

**优点：**
- ✅ 数据永久保存
- ✅ 高可用性
- ✅ 支持 CDN 加速
- ✅ 支持预签名 URL（安全下载）
- ✅ 不占用服务器存储空间

**缺点：**
- ⚠️ 需要配置云存储服务
- ⚠️ 需要修改代码集成 SDK
- ⚠️ 可能有存储费用

**实现步骤：**

1. **创建云存储桶**
   - AWS S3 / Cloudflare R2 / 阿里云 OSS
   - 设置为私有访问

2. **安装 SDK**
   ```bash
   npm install @aws-sdk/client-s3  # AWS S3
   # 或
   npm install @aws-sdk/client-s3  # Cloudflare R2 (兼容 S3 API)
   ```

3. **修改 server.js**
   ```javascript
   // 添加云存储上传和下载逻辑
   // 上传时保存到云存储
   // 下载时生成预签名 URL
   ```

4. **配置环境变量**
   ```
   STORAGE_TYPE=s3
   S3_BUCKET=your-bucket
   S3_ACCESS_KEY=your-key
   S3_SECRET_KEY=your-secret
   ```

### 方案三：当前方案 + 定期备份（临时方案）

**适用于：**
- 资料文件不多
- 可以接受偶尔丢失
- 有定期备份机制

**实现：**
1. 继续使用当前的文件系统存储
2. 定期备份 `materials/downloads/` 目录
3. 备份到本地或云存储

## 📋 当前实现详细说明

### 1. 上传流程

**API 端点：** `POST /api/admin/upload`

**请求头：**
```
X-Admin-Key: {ADMIN_KEY}  # 管理员密钥（环境变量）
X-Material-ID: m1         # 资料 ID
X-Filename: my-file.pdf   # 文件名
X-Title: 资料标题          # 可选
X-Description: 描述        # 可选
X-Material-Type: pdf      # 可选，默认 pdf
Content-Type: application/octet-stream
```

**请求体：**
- 文件的二进制内容

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

**使用脚本上传：**
```bash
# 设置环境变量
export RAILWAY_URL=https://your-app.up.railway.app
export ADMIN_KEY=your-admin-key

# 上传文件
./upload-material.sh ./my-file.pdf m1 "资料标题" "资料描述"
```

### 2. 存储位置

**本地开发：**
- 路径：`/Users/ryan/Personalcz/materials/downloads/`
- 文件直接保存在项目目录

**Railway 部署：**
- 路径：`/app/materials/downloads/`
- 如果没有 Volume，文件保存在容器文件系统（临时）

**配置文件：**
- `materials-config.json` - 资料元数据（可以提交到 Git）
- `materials/downloads/` - 实际文件（已添加到 .gitignore）

### 3. 下载流程

**API 端点：** `GET /api/download/:materialId`

**流程：**
1. 用户点击下载
2. 前端检查是否已支付（通过 `X-Wallet-Address` header）
3. 服务器验证支付状态
4. 如果已支付，返回文件流
5. 如果未支付，返回 403 错误

**代码位置：**
- `server.js` 第 500-572 行

## 🔧 配置说明

### 环境变量

**必需：**
```
RECEIVER_ADDRESS=0x...  # 接收支付的钱包地址
ADMIN_KEY=your-secret-key  # 管理员上传密钥
```

**可选：**
```
MATERIALS_DIR=/app/materials/downloads  # 资料存储目录（默认：materials/downloads）
```

### 文件结构

```
Personalcz/
├── materials/
│   ├── downloads/          # 实际文件存储（.gitignore）
│   │   ├── file1.pdf
│   │   └── file2.zip
│   └── .gitkeep
├── materials-config.json   # 资料配置（可以提交）
└── upload-material.sh      # 上传脚本
```

## 🚀 推荐方案

### 短期（现在）：使用当前方案 + Railway Volume

1. **创建 Railway Volume**
   - 进入 Railway 项目
   - New → Volume
   - 名称：`materials-storage`
   - 挂载路径：`/app/materials`

2. **上传资料**
   ```bash
   ./upload-material.sh ./my-file.pdf m1 "标题" "描述"
   ```

3. **文件会自动保存到 Volume**
   - 重启不丢失
   - 重新部署不丢失

### 长期（生产环境）：迁移到云存储

1. 选择云存储服务（推荐 Cloudflare R2，免费额度大）
2. 修改代码集成云存储 SDK
3. 迁移现有文件到云存储
4. 更新下载逻辑使用预签名 URL

## 📝 使用示例

### 上传资料

```bash
# 1. 设置环境变量
export RAILWAY_URL=https://your-app.up.railway.app
export ADMIN_KEY=your-admin-key

# 2. 上传 PDF
./upload-material.sh ./report.pdf m1 "2024 Q4 报告" "季度分析报告"

# 3. 上传 ZIP
./upload-material.sh ./toolkit.zip m2 "工具包" "开发工具集合"
```

### 检查上传结果

```bash
# 检查 materials-config.json
cat materials-config.json

# 检查文件是否存在（本地）
ls -lh materials/downloads/
```

## ⚠️ 安全注意事项

1. **不要将资料文件提交到 Git**
   - ✅ `materials/downloads/` 已在 `.gitignore`
   - ✅ 只有 `materials-config.json` 可以提交

2. **保护管理员密钥**
   - ✅ `ADMIN_KEY` 只设置在环境变量中
   - ✅ 不要提交到代码仓库

3. **验证下载权限**
   - ✅ 服务器会验证用户是否已支付
   - ✅ 未支付用户无法下载文件

## 🔍 故障排查

### 问题：上传失败

**检查：**
1. `ADMIN_KEY` 环境变量是否设置
2. 请求头 `X-Admin-Key` 是否正确
3. 文件大小是否超过 100MB 限制
4. 服务器日志查看具体错误

### 问题：文件丢失

**原因：**
- Railway 容器重启（如果没有 Volume）
- 重新部署代码

**解决：**
- 创建 Railway Volume
- 或迁移到云存储

### 问题：下载失败

**检查：**
1. 用户是否已支付
2. 文件是否存在
3. 服务器日志查看错误

## 📞 需要帮助？

如果遇到问题，请检查：
1. Railway 日志
2. 浏览器控制台
3. 服务器日志

告诉我具体错误，我可以帮你解决！
