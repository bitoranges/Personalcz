# 快速开始指南

## 🎯 5分钟快速配置

### 1. 配置头像（1分钟）

将你的头像文件放到：
```
frontend/assets/avatar.svg
```

支持的格式：`.svg`（推荐）、`.png`、`.jpg`

如需使用其他文件名，修改 `frontend/components/Header.tsx` 第 8 行：
```typescript
const avatarImage = '/assets/avatar.svg';  // 改为你的文件名
```

### 2. 添加文件（2分钟）

1. **放置文件**：
   ```bash
   cp /path/to/your/file.pdf materials/downloads/
   ```

2. **编辑配置**：打开 `materials-config.json`，添加：
   ```json
   {
     "id": "my-file",
     "title": "我的文件",
     "description": "文件描述",
     "type": "pdf",
     "date": "2024-12-14",
     "filename": "my-file.pdf",
     "downloadPath": "materials/downloads/my-file.pdf"
   }
   ```

### 3. 修改前端内容（1分钟）

编辑 `frontend/constants.ts`：
- `motto` - 顶部大标题
- `tagline` - 个人简介
- `socials` - 社交媒体链接
- `price.amount` - 价格

### 4. 配置环境变量（1分钟）

创建 `.env` 文件：
```env
PORT=3000
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
RECEIVER_ADDRESS=0xYourWalletAddressHere
```

### 5. 启动测试

```bash
# 启动后端
npm start

# 启动前端（新终端）
npm run dev:frontend
```

访问 `http://localhost:5173` 测试！

---

## 📚 详细文档

- **完整配置**：查看 `CONFIGURATION_GUIDE.md`
- **测试下载**：查看 `TEST_FILE_DOWNLOAD.md`
- **部署指南**：查看 `CONFIGURATION_GUIDE.md` 中的部署部分



