# 环境变量配置说明

## 创建 .env 文件

在项目根目录创建 `.env` 文件，包含以下配置：

```env
# Server Configuration
PORT=3000

# Network Configuration
# Options: 'base-mainnet' or 'base-sepolia'
NETWORK=base-mainnet

# Base RPC URL (optional, defaults to public RPC)
BASE_RPC_URL=https://mainnet.base.org

# Payment Receiver Address (REQUIRED)
# 你的 Base 网络钱包地址，用于接收 USDC 支付
RECEIVER_ADDRESS=0xYourWalletAddressHere

# Coinbase CDP Configuration (Optional - for future use)
# COINBASE_API_KEY=your_api_key_here
# COINBASE_API_SECRET=your_api_secret_here
# WALLET_ID=your_wallet_id_here
```

## 重要配置说明

### RECEIVER_ADDRESS（必需）
- 这是你的 Base 网络钱包地址
- 用户支付的 $1.10 USDC 将发送到这个地址
- 确保地址正确，否则无法收到支付

### NETWORK
- `base-mainnet`: Base 主网（生产环境）
- `base-sepolia`: Base 测试网（开发测试）

### BASE_RPC_URL
- 可以使用公共 RPC: `https://mainnet.base.org`
- 或者使用 Alchemy/Infura 等服务的 RPC（性能更好）
  - Alchemy: `https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
  - Infura: `https://base-mainnet.infura.io/v3/YOUR_API_KEY`







