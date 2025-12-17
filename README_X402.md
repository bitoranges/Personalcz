# x402 支付集成说明

## 项目概述

这是一个基于 x402 协议的个人网站支付系统。用户支付 $1.10 USDC（在 Base 网络上）即可解锁所有资料。

## 已实现的功能

### 后端 (server.js)
- ✅ HTTP 402 Payment Required 协议实现
- ✅ 链上 USDC 交易验证（使用 ethers.js）
- ✅ Base 网络支持
- ✅ 支付状态跟踪
- ✅ 解锁内容 API

### 前端 (x402-client.js)
- ✅ 钱包连接（MetaMask, Coinbase Wallet 等）
- ✅ 自动处理 402 响应
- ✅ USDC 代币转账
- ✅ 网络切换支持
- ✅ 支付证明生成

## 安装和使用

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `ENV_SETUP.md`）：

```env
PORT=3000
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
RECEIVER_ADDRESS=0xYourWalletAddressHere
```

**重要**: 将 `RECEIVER_ADDRESS` 替换为你的 Base 网络钱包地址。

### 3. 启动服务器

```bash
npm start
# 或开发模式
npm run dev
```

### 4. 前端集成

在你的 HTML 页面中：

```html
<!-- 引入 ethers.js -->
<script src="https://cdn.ethers.io/lib/ethers-6.9.0.umd.min.js"></script>
<!-- 引入 x402 客户端 -->
<script src="x402-client.js"></script>

<script>
  // 初始化 x402 客户端
  const client = new x402Client({
    apiUrl: 'http://localhost:3000',
    onPaymentRequired: (reqs) => {
      console.log('Payment required:', reqs);
    },
    onPaymentSuccess: (data) => {
      console.log('Payment successful!', data);
      // 显示解锁的内容
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  // 解锁内容
  async function unlockContent() {
    try {
      // 连接钱包（如果未连接）
      if (!client.isWalletConnected()) {
        await client.connectWallet();
      }
      
      // 解锁内容（自动处理支付流程）
      const result = await client.unlockContent();
      console.log('Unlocked materials:', result.materials);
    } catch (error) {
      console.error('Failed to unlock:', error);
    }
  }
</script>
```

## API 端点

### GET /api/unlock
检查访问权限，如果未支付则返回 402 和支付要求。

### POST /api/unlock
验证支付并解锁内容。需要在请求头中包含 `X-Payment` 或 body 中包含 `paymentProof`。

### GET /api/payment-status
检查指定钱包地址的支付状态。

### GET /health
健康检查端点。

## 支付流程

1. 用户请求 `/api/unlock`
2. 服务器检查是否已支付
3. 如果未支付，返回 HTTP 402 和支付要求（金额、接收地址等）
4. 前端自动处理 402 响应：
   - 连接用户钱包
   - 执行 USDC 转账交易
   - 等待交易确认
   - 使用交易哈希作为支付证明重试请求
5. 服务器验证链上交易
6. 验证成功后返回解锁的内容

## 网络配置

### Base 主网
- Chain ID: 8453
- USDC Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- RPC: `https://mainnet.base.org`
- Explorer: `https://basescan.org`

### Base Sepolia 测试网
- Chain ID: 84532
- USDC Contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- RPC: `https://sepolia.base.org`

## 注意事项

1. **钱包地址**: 确保 `RECEIVER_ADDRESS` 是正确的 Base 网络地址
2. **USDC 余额**: 用户需要有足够的 USDC 余额（$1.10 + gas 费）
3. **网络**: 确保用户的钱包已添加 Base 网络
4. **Gas 费**: 用户需要支付 ETH 作为 gas 费（Base 网络 gas 费很低）
5. **生产环境**: 建议使用专业的 RPC 服务（Alchemy/Infura）而不是公共 RPC

## 测试

### 使用测试网

1. 设置 `NETWORK=base-sepolia` 在 `.env` 文件中
2. 获取 Base Sepolia 测试网 USDC（可能需要从 faucet 获取）
3. 使用测试钱包进行测试

### 测试步骤

1. 启动服务器
2. 打开包含 x402-client.js 的 HTML 页面
3. 点击解锁按钮
4. 连接钱包
5. 确认支付交易
6. 等待交易确认
7. 查看解锁的内容

## Coinbase CDP 集成（可选）

如果你在 Coinbase CDP Portal 申请了账号，可以配置以下环境变量来使用 Coinbase Server Wallet API（未来可以用于更高级的功能）：

```env
COINBASE_API_KEY=your_api_key
COINBASE_API_SECRET=your_api_secret
WALLET_ID=your_wallet_id
```

当前实现已经可以正常工作，Coinbase CDP 配置是可选的。





