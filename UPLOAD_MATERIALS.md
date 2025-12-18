# 📤 资料上传指南

## ⚠️ 重要：不要上传到 GitHub！

**绝对不要将付费资料上传到 GitHub 公开仓库！**

## ✅ 正确的上传方式

### 方案一：Railway Volume（推荐，最简单）

Railway 提供持久化存储，可以存储资料文件。

#### 步骤：

1. **在 Railway 创建 Volume**
   ```
   进入 Railway 项目
   → 点击 "New" → "Volume"
   → 命名：materials-storage
   → 挂载路径：/app/materials
   → 连接到你的服务
   ```

2. **通过 Railway CLI 上传文件**
   ```bash
   # 安装 Railway CLI
   npm i -g @railway/cli
   
   # 登录
   railway login
   
   # 连接到项目
   railway link
   
   # 上传文件
   railway run --service your-service-name -- \
     sh -c "echo 'your-file-content' > /app/materials/downloads/your-file.pdf"
   ```

3. **或者通过 Web 界面上传**
   - Railway Web 界面可能不支持直接上传
   - 需要创建上传 API 接口

### 方案二：创建上传 API 接口（推荐）

在服务器上创建上传接口，通过 Web 界面上传。

#### 实现步骤：

1. **添加上传接口到 server.js**
   ```javascript
   const multer = require('multer');
   const upload = multer({ dest: 'materials/uploads/' });
   
   app.post('/api/admin/upload', upload.single('file'), (req, res) => {
     // 验证管理员权限（使用 API Key）
     // 保存文件到 materials/downloads/
     // 更新 materials-config.json
   });
   ```

2. **通过 Web 界面上传**
   - 访问你的网站
   - 使用管理员界面上传文件
   - 文件直接保存到服务器

### 方案三：使用云存储（最安全）

#### AWS S3 / Cloudflare R2

1. **创建存储桶**
   - 设置为私有
   - 只允许服务器访问

2. **修改代码**
   - 资料存储在云存储中
   - 通过预签名 URL 提供下载

3. **上传文件**
   - 通过云存储控制台上传
   - 或通过 API 上传

### 方案四：SSH 直接上传（简单直接）

1. **获取 Railway SSH 访问**
   - Railway 可能不直接支持 SSH
   - 需要查看 Railway 文档

2. **或使用 Railway CLI**
   ```bash
   railway run --service your-service -- bash
   # 然后在容器内上传文件
   ```

## 🔧 当前配置

- ✅ `materials/` 已添加到 `.gitignore`
- ✅ 资料文件已从 Git 中移除
- ⚠️ **但 GitHub 历史中可能还有文件！**

## 🚨 紧急：清理 GitHub 历史

如果资料文件已经在 GitHub 历史中，需要完全移除：

```bash
# 使用 git filter-repo（推荐）
git filter-repo --path materials/downloads --invert-paths

# 强制推送（危险，但必要）
git push origin main --force
```

**注意：这会重写 Git 历史，需要团队成员重新克隆仓库。**

## 📝 推荐实现

### 最简单：创建上传 API

1. 添加上传接口
2. 通过 Web 界面上传
3. 文件保存在服务器文件系统

### 最安全：云存储

1. 使用 S3/R2/OSS
2. 资料存储在云端
3. 通过预签名 URL 下载

## 🎯 下一步

告诉我你选择哪个方案，我可以帮你实现！


