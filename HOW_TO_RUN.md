# 如何运行项目

## 项目结构

本项目已经整合了前端和后端代码：
- **前端**: React + TypeScript + Vite (位于 `frontend/` 目录)
- **后端**: Node.js + Express (位于根目录的 `server.js`)
- **x402 支付客户端**: 位于 `x402-client.js` 和 `frontend/public/x402-client.js`

## 快速开始

### 1. 安装依赖

首先安装后端依赖：

```bash
npm install
```

然后安装前端依赖：

```bash
cd frontend
npm install
cd ..
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件（参考 `ENV_SETUP.md`）：

```env
PORT=3000
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
RECEIVER_ADDRESS=0xYourWalletAddressHere
```

### 3. 运行项目

有两种运行方式：

#### 方式一：开发模式（推荐）

**终端 1 - 启动后端服务器：**

```bash
npm run dev
```

后端服务器将在 `http://localhost:3000` 启动。

**终端 2 - 启动前端开发服务器：**

```bash
npm run dev:frontend
```

前端开发服务器将在 `http://localhost:5173` 启动，并自动代理 API 请求到后端。

然后在浏览器中访问 `http://localhost:5173`

#### 方式二：生产模式

**构建前端：**

```bash
npm run build
```

这会构建前端代码到 `frontend/dist/` 目录。

**启动服务器（同时服务前端和后端）：**

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动，同时服务：
- 前端静态文件（从 `frontend/dist/`）
- API 端点（`/api/*`）

### 4. 测试支付流程

1. 确保后端服务器正在运行
2. 在浏览器中打开前端页面（开发模式：`http://localhost:5173`，生产模式：`http://localhost:3000`）
3. 点击 "Unlock All Access" 按钮
4. 连接你的钱包（MetaMask、Coinbase Wallet 等）
5. 确认支付交易（$1.00 USDC on Base）
6. 等待交易确认（通常在几秒内）
7. 内容会自动解锁并显示

## 运行测试

### 后端测试

```bash
npm test
# 或者
npm run test:backend
```

### 前端测试

```bash
cd frontend
npm test
# 或者使用 UI 模式
npm run test:ui
```

### 运行所有测试

```bash
npm test
cd frontend && npm test
```

## 重要提示

### 后端服务器必须运行

前端页面需要连接到后端服务器（`http://localhost:3000`）才能正常工作。如果后端没有运行，支付功能将无法使用。

### 开发模式 vs 生产模式

- **开发模式**: 前端运行在端口 5173，通过 Vite 代理 API 请求到后端（端口 3000）
- **生产模式**: 前端构建后的静态文件由后端服务器（端口 3000）提供服务

### 浏览器控制台

如果遇到问题，打开浏览器的开发者工具（F12），查看 Console 标签页中的错误信息。

### 钱包要求

- 需要安装 MetaMask 或 Coinbase Wallet 浏览器扩展
- 钱包中需要有 Base 网络（如果没有会自动提示添加）
- 需要有 USDC 代币（在 Base 网络上，至少 $1.00）
- 需要有少量 ETH 作为 gas 费

## API 端点

后端提供以下 API 端点：

- `GET /health` - 健康检查
- `GET /api/unlock` - 检查访问权限或返回 402 支付要求
- `POST /api/unlock` - 验证支付并解锁内容
- `GET /api/payment-status` - 检查支付状态
- `POST /api/payment-intent` - 创建支付意图

## 常见问题

### 1. "Failed to fetch" 错误
- 确保后端服务器正在运行
- 检查服务器是否在 `http://localhost:3000`
- 开发模式下，检查前端是否正确代理了 API 请求

### 2. "No wallet found" 错误
- 安装 MetaMask 或 Coinbase Wallet 扩展
- 刷新页面

### 3. "Network not found" 错误
- 代码会自动尝试添加 Base 网络
- 如果失败，手动在钱包中添加 Base 网络：
  - Network Name: Base
  - RPC URL: https://mainnet.base.org
  - Chain ID: 8453
  - Currency Symbol: ETH

### 4. "Insufficient balance" 错误
- 确保钱包中有足够的 USDC（至少 $1.00）
- 确保有少量 ETH 作为 gas 费

### 5. 前端页面无法加载
- 开发模式：确保 `npm run dev:frontend` 正在运行
- 生产模式：确保已经运行了 `npm run build` 构建前端

### 6. x402-client.js 未找到
- 确保 `x402-client.js` 文件存在于 `frontend/public/` 目录
- 检查服务器是否正确配置了静态文件服务

## 开发模式

### 后端自动重启

使用 `npm run dev` 启动后端，nodemon 会自动监听文件变化并重启服务器。

### 前端热更新

使用 `npm run dev:frontend` 启动前端，Vite 会提供热模块替换（HMR），代码更改会自动刷新。

## 部署

### 生产构建

1. 构建前端：
   ```bash
   npm run build
   ```

2. 确保 `.env` 文件配置正确（特别是 `RECEIVER_ADDRESS`）

3. 启动服务器：
   ```bash
   npm start
   ```

### 环境变量

生产环境中，确保设置以下环境变量：
- `PORT`: 服务器端口（默认 3000）
- `NETWORK`: 网络（base-mainnet 或 base-sepolia）
- `BASE_RPC_URL`: Base RPC URL
- `RECEIVER_ADDRESS`: 接收 USDC 支付的钱包地址（必需）






