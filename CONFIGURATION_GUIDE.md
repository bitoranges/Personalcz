# 完整配置指南 / Complete Configuration Guide

本文档提供详细的配置说明，包括文件下载、头像设置、前端配置等所有内容。

This guide provides detailed configuration instructions for file downloads, avatar setup, frontend configuration, and more.

---

## 📁 目录 / Table of Contents

1. [文件下载配置](#文件下载配置)
2. [头像配置](#头像配置)
3. [前端内容配置](#前端内容配置)
4. [环境变量配置](#环境变量配置)
5. [部署建议](#部署建议)

---

## 📥 文件下载配置 / File Download Configuration

### 1. 文件存放位置 / File Storage Location

所有可下载的文件应该放在 `materials/downloads/` 目录下。

All downloadable files should be placed in the `materials/downloads/` directory.

```
Personalcz/
└── materials/
    ├── downloads/          # 存放可下载文件
    │   ├── file1.pdf
    │   ├── file2.zip
    │   └── ...
    └── uploads/            # 临时上传目录（可选）
```

### 2. 配置文件：`materials-config.json`

文件位置：项目根目录下的 `materials-config.json`

#### 配置格式：

```json
{
  "materials": [
    {
      "id": "m1",                    // 唯一ID（必须）
      "title": "文件标题",            // 显示在前端的标题（必须）
      "description": "文件描述",      // 显示在前端的描述（必须）
      "type": "pdf",                 // 文件类型：pdf, archive, zip, link（必须）
      "date": "2024-12-01",          // 日期，格式：YYYY-MM-DD（必须）
      "filename": "my-file.pdf",     // 下载时的文件名（文件类型必需）
      "downloadPath": "materials/downloads/my-file.pdf"  // 相对路径（文件类型必需）
    },
    {
      "id": "m2",
      "title": "外部链接",
      "description": "这是一个外部链接",
      "type": "link",                // link 类型
      "date": "2024-12-10",
      "url": "https://example.com"   // 外部URL（link类型必需）
    }
  ]
}
```

#### 字段说明：

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符，用于下载和识别 |
| `title` | string | ✅ | 显示在前端的标题 |
| `description` | string | ✅ | 显示在前端的描述 |
| `type` | string | ✅ | 类型：`pdf`, `archive`, `zip`, `link` |
| `date` | string | ✅ | 日期，格式：`YYYY-MM-DD` |
| `filename` | string | ⚠️ | 下载文件名（`type` 不是 `link` 时必需） |
| `downloadPath` | string | ⚠️ | 文件相对路径（`type` 不是 `link` 时必需） |
| `url` | string | ⚠️ | 外部URL（`type` 为 `link` 时必需） |

#### 示例配置：

```json
{
  "materials": [
    {
      "id": "m1",
      "title": "2024 Q4 Crypto Market Outlook",
      "description": "Comprehensive analysis of liquidity cycles and BTC dominance metrics.",
      "type": "pdf",
      "date": "2024-12-01",
      "filename": "2024-Q4-Crypto-Outlook.pdf",
      "downloadPath": "materials/downloads/2024-Q4-Crypto-Outlook.pdf"
    },
    {
      "id": "m2",
      "title": "High Conviction Alpha List",
      "description": "Curated list of altcoin setups with entry/exit targets.",
      "type": "link",
      "date": "2024-12-10",
      "url": "https://example.com/alpha-list"
    },
    {
      "id": "m3",
      "title": "Institutional On-Chain Toolkit",
      "description": "Dashboard configurations and data sources.",
      "type": "archive",
      "date": "2024-12-14",
      "filename": "on-chain-toolkit.zip",
      "downloadPath": "materials/downloads/on-chain-toolkit.zip"
    }
  ]
}
```

### 3. 添加新文件的步骤 / Steps to Add New Files

1. **准备文件**：将文件放到 `materials/downloads/` 目录
   ```bash
   cp /path/to/your/file.pdf materials/downloads/
   ```

2. **编辑配置文件**：打开 `materials-config.json`，添加新条目
   ```json
   {
     "id": "m4",                    // 使用新的唯一ID
     "title": "新文件标题",
     "description": "文件描述",
     "type": "pdf",
     "date": "2024-12-15",
     "filename": "new-file.pdf",
     "downloadPath": "materials/downloads/new-file.pdf"
   }
   ```

3. **重启服务器**：修改配置后需要重启服务器
   ```bash
   npm start
   ```

### 4. 支持的文件类型 / Supported File Types

| 类型 | 说明 | 是否需要文件 |
|------|------|--------------|
| `pdf` | PDF文档 | ✅ |
| `archive` | 压缩包 | ✅ |
| `zip` | ZIP文件 | ✅ |
| `link` | 外部链接 | ❌ |

**注意**：服务器会自动设置正确的 Content-Type，确保浏览器能正确处理文件。

---

## 🖼️ 头像配置 / Avatar Configuration

### 1. 头像文件位置

头像文件应放在 `frontend/assets/avatar.svg`（或 `avatar.png`、`avatar.jpg` 等）

```
frontend/
└── assets/
    └── avatar.svg    # 或 avatar.png, avatar.jpg
```

### 2. 支持的格式

- SVG（推荐，矢量图，任意缩放不失真）
- PNG（透明背景）
- JPG/JPEG（照片）

### 3. 配置步骤

1. **准备头像文件**
   ```bash
   # 将头像文件复制到 assets 目录
   cp /path/to/your/avatar.png frontend/assets/avatar.png
   ```

2. **修改 Header 组件**（如果需要更改文件名）

   文件位置：`frontend/components/Header.tsx`

   ```typescript
   // 如果使用 PNG 格式
   const avatarImage = '/assets/avatar.png';
   
   // 如果使用 JPG 格式
   const avatarImage = '/assets/avatar.jpg';
   
   // 默认 SVG（推荐）
   const avatarImage = '/assets/avatar.svg';
   ```

3. **确保文件被正确服务**

   服务器已配置自动服务 `frontend/assets/` 目录下的文件，无需额外配置。

### 4. 图片尺寸建议

- **推荐尺寸**：200x200px 到 400x400px
- **文件大小**：尽量控制在 100KB 以内（SVG 通常更小）
- **格式选择**：
  - 简单图标/logo → SVG（推荐）
  - 照片 → PNG 或 JPG
  - 需要透明背景 → PNG

---

## 🎨 前端内容配置 / Frontend Content Configuration

### 1. 配置文件位置

`frontend/constants.ts`

### 2. 可配置内容

```typescript
export const CONFIG: SiteConfig = {
  // 网站名称
  name: 'Chengzi Space',
  
  // 顶部座右铭（大标题）
  motto: 'Always all in, forever with tears in my eyes!',
  
  // 个人简介/标签行
  tagline: 'Bitcoin Holder | Crypto Investor & Researcher | Hunting Alpha with AI · Daily updates, no breaks · Absolutely no full-position gambling.',
  
  // 社交媒体链接
  socials: {
    x: 'https://x.com/chengzi_95330',        // Twitter/X 链接
    telegram: 'https://t.me/zicheng_95330',  // Telegram 链接
  },
  
  // 支付配置
  price: {
    amount: 1.00,      // 价格（美元）
    currency: 'USDC',  // 货币类型
    chain: 'BASE',     // 区块链网络
  },
};
```

### 3. 修改步骤

1. 打开 `frontend/constants.ts`
2. 修改对应的值
3. 保存文件
4. 如果前端正在运行，会自动热更新；否则需要重新构建

---

## ⚙️ 环境变量配置 / Environment Variables

### 1. 配置文件位置

项目根目录下的 `.env` 文件（需要手动创建）

### 2. 必需配置

```env
# 服务器端口
PORT=3000

# 区块链网络（base-mainnet 或 base-sepolia）
NETWORK=base-mainnet

# Base RPC URL
BASE_RPC_URL=https://mainnet.base.org

# 接收USDC支付的钱包地址（必需！）
RECEIVER_ADDRESS=0xYourWalletAddressHere
```

### 3. 详细说明

参考 `ENV_SETUP.md` 文件获取完整的环境变量配置说明。

---

## 🚀 部署建议 / Deployment Recommendations

### 选项 1：Vercel（推荐新手）⭐

**优点**：
- ✅ 完全免费（个人项目）
- ✅ 零配置部署
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 简单的 Git 集成
- ✅ 自动部署预览

**步骤**：

1. **准备项目**
   ```bash
   # 构建前端
   cd frontend
   npm run build
   cd ..
   ```

2. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

3. **部署**
   ```bash
   vercel
   ```

4. **配置环境变量**
   - 在 Vercel 控制台添加环境变量
   - 注意：Vercel 主要用于前端，后端需要单独部署

**限制**：
- 主要用于静态网站和 Serverless Functions
- 需要将后端部署到其他地方（如 Railway、Render）

---

### 选项 2：Railway（全栈部署推荐）⭐⭐⭐

**优点**：
- ✅ 支持 Node.js 全栈应用
- ✅ 简单的 Git 集成
- ✅ 自动部署
- ✅ 免费额度（$5/月）
- ✅ 环境变量管理
- ✅ 日志查看

**步骤**：

1. **注册 Railway 账号**
   - 访问 https://railway.app
   - 使用 GitHub 登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库

3. **配置构建**
   - Railway 会自动检测 Node.js 项目
   - 构建命令：`npm run build`（前端）
   - 启动命令：`npm start`（后端）

4. **设置环境变量**
   - 在 Railway 项目设置中添加所有 `.env` 变量
   - 特别是 `RECEIVER_ADDRESS`

5. **配置文件存储**
   - Railway 提供持久化存储
   - 确保 `materials/` 目录文件被包含在部署中
   - 或使用 Railway Volumes 持久化存储

---

### 选项 3：Render（免费额度友好）⭐⭐

**优点**：
- ✅ 免费套餐可用
- ✅ 支持 Node.js
- ✅ 自动 HTTPS
- ✅ 环境变量管理

**步骤**：

1. **注册 Render 账号**
   - 访问 https://render.com

2. **创建 Web Service**
   - 连接 GitHub 仓库
   - 选择构建命令：`npm install && cd frontend && npm install && npm run build`
   - 选择启动命令：`npm start`

3. **配置环境变量**
   - 在 Environment 标签添加所有变量

---

### 选项 4：DigitalOcean App Platform（稳定可靠）⭐⭐

**优点**：
- ✅ 稳定可靠
- ✅ 易于扩展
- ✅ 完整的文档

**成本**：$5/月起

---

### 选项 5：自托管（VPS）

**推荐的 VPS 提供商**：
- **Linode**：简单易用，文档完善
- **DigitalOcean**：社区资源丰富
- **Vultr**：价格优惠
- **Hetzner**：欧洲，价格低

**部署步骤**：

1. **购买 VPS**（建议配置：1 CPU, 1GB RAM, 25GB SSD）

2. **安装 Node.js**
   ```bash
   # 使用 nvm 安装 Node.js
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

3. **安装 PM2**（进程管理器）
   ```bash
   npm install -g pm2
   ```

4. **克隆项目**
   ```bash
   git clone your-repo-url
   cd Personalcz
   npm install
   cd frontend && npm install && npm run build && cd ..
   ```

5. **配置环境变量**
   ```bash
   cp .env.example .env
   nano .env  # 编辑环境变量
   ```

6. **启动应用**
   ```bash
   pm2 start server.js --name personalcz
   pm2 save
   pm2 startup  # 设置开机自启
   ```

7. **配置 Nginx**（反向代理）
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **安装 SSL 证书**（Let's Encrypt）
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## 📋 部署检查清单 / Deployment Checklist

在部署前，请确认：

- [ ] `.env` 文件已配置所有必需变量
- [ ] `RECEIVER_ADDRESS` 已设置为正确的钱包地址
- [ ] 前端已构建（`npm run build` in `frontend/`）
- [ ] `materials-config.json` 已配置
- [ ] 所有文件已放在 `materials/downloads/` 目录
- [ ] 头像文件已放在 `frontend/assets/` 目录
- [ ] `frontend/constants.ts` 中的内容已更新
- [ ] 测试过本地运行（`npm start`）
- [ ] 测试过支付流程
- [ ] 测试过文件下载

---

## 🔒 安全建议 / Security Recommendations

1. **不要提交 `.env` 文件到 Git**
   - 确保 `.env` 在 `.gitignore` 中

2. **使用环境变量管理敏感信息**
   - 生产环境使用平台的环境变量功能

3. **文件访问控制**
   - 确保 `materials/downloads/` 目录下的文件只能通过API下载
   - 不要直接暴露文件路径

4. **HTTPS 必需**
   - 生产环境必须使用 HTTPS
   - 保护用户数据和支付信息

---

## 📞 常见问题 / FAQ

### Q: 文件上传后无法下载？

A: 检查：
1. 文件路径是否正确（`materials-config.json` 中的 `downloadPath`）
2. 文件是否真的存在于该路径
3. 服务器是否有读取权限
4. 是否已支付（检查钱包地址是否在已支付列表中）

### Q: 头像不显示？

A: 检查：
1. 文件是否在 `frontend/assets/` 目录
2. 文件名是否匹配（默认是 `avatar.svg`）
3. 文件格式是否支持
4. 浏览器控制台是否有 404 错误

### Q: 部署后无法访问？

A: 检查：
1. 环境变量是否已配置
2. 端口是否正确
3. 防火墙是否允许访问
4. 域名 DNS 是否已配置

---

## 📚 相关文档 / Related Documentation

- `HOW_TO_RUN.md` - 本地运行指南
- `ENV_SETUP.md` - 环境变量配置
- `README.md` - 项目概述

---

**最后更新**：2024-12-14





