# 🔒 资料安全上传指南

## ⚠️ 重要警告

**绝对不要将付费资料上传到 GitHub 公开仓库！**

如果资料文件在 GitHub 上，任何人都可以直接访问，付费解锁就失去意义了。

## ✅ 正确的资料上传方式

### 方案一：通过 Railway 文件系统上传（推荐，最简单）

Railway 提供了持久化存储卷（Volume），可以存储资料文件。

#### 步骤：

1. **在 Railway 创建 Volume**
   - 进入 Railway 项目
   - 点击 "New" → "Volume"
   - 命名：`materials-storage`
   - 挂载路径：`/app/materials`

2. **上传资料文件**
   - 使用 Railway CLI 或 Web 界面
   - 或者通过 SSH 连接到服务器上传

3. **配置环境变量**
   - 在 Railway 设置中添加：
     ```
     MATERIALS_PATH=/app/materials
     ```

4. **修改 server.js**
   - 使用环境变量指定资料路径
   - 确保路径指向 Volume

### 方案二：使用云存储服务（推荐，最安全）

#### 使用 AWS S3 / Cloudflare R2 / 阿里云 OSS

1. **创建存储桶**
   - 设置为私有访问
   - 只允许服务器通过 API 访问

2. **修改 server.js**
   - 添加云存储 SDK
   - 资料文件存储在云存储中
   - 通过预签名 URL 提供下载（带过期时间）

3. **配置环境变量**
   ```
   STORAGE_TYPE=s3
   S3_BUCKET=your-bucket-name
   S3_ACCESS_KEY=your-access-key
   S3_SECRET_KEY=your-secret-key
   ```

### 方案三：使用 Railway 的临时文件系统（简单但不持久）

**注意：Railway 的文件系统是临时的，重启会丢失！**

1. **通过 API 上传**
   - 创建上传接口
   - 通过 Web 界面上传文件
   - 文件存储在服务器内存/临时目录

2. **定期备份**
   - 需要定期备份到云存储

### 方案四：使用私有 Git 仓库 + 环境变量

1. **创建私有 Git 仓库**
   - 专门存储资料文件
   - 设置为私有

2. **在服务器上克隆**
   - 部署时自动克隆私有仓库
   - 使用 GitHub Token 认证

3. **配置环境变量**
   ```
   MATERIALS_REPO=git@github.com:your-username/materials-private.git
   MATERIALS_TOKEN=your-github-token
   ```

## 🚫 已修复的安全问题

1. ✅ **已将 `materials/` 添加到 `.gitignore`**
   - 资料文件不会再被提交到 Git

2. ✅ **已从 Git 中移除资料文件**
   - 从版本控制中删除，但保留本地文件

## 📝 当前配置

- `materials-config.json` - 资料配置（可以提交，不包含实际文件）
- `materials/downloads/` - 实际资料文件（**已添加到 .gitignore**）

## 🔧 推荐的实现方案

### 最简单：Railway Volume + 环境变量

1. 在 Railway 创建 Volume
2. 通过 Railway CLI 或 Web 界面上传文件
3. 修改 server.js 使用环境变量路径

### 最安全：云存储（S3/R2）

1. 创建云存储桶
2. 修改 server.js 集成云存储 SDK
3. 通过预签名 URL 提供下载

## ⚠️ 立即行动

1. **检查 GitHub 仓库**
   - 访问 https://github.com/bitoranges/Personalcz
   - 确认 `materials/` 目录不在仓库中

2. **如果资料文件已经在 GitHub**
   - 需要从 Git 历史中完全移除
   - 使用 `git filter-branch` 或 `git filter-repo`

3. **选择上传方案**
   - 推荐使用 Railway Volume 或云存储

## 📞 需要帮助？

告诉我你选择哪个方案，我可以帮你实现！


