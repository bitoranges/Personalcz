# Wallet ID 获取指南

## 重要说明

**对于当前的 x402 实现，Wallet ID 不是必需的！**

当前的实现是直接验证区块链上的交易，不依赖 Coinbase Server Wallet API，所以即使没有 Wallet ID，系统也能正常工作。

Wallet ID 主要用于 Coinbase Server Wallet 的托管服务，如果你将来需要使用 Coinbase 的托管钱包功能，才需要配置它。

## 如何获取 Wallet ID（可选）

### 方法 1：使用脚本自动获取（推荐）

我已经创建了一个帮助脚本 `get-wallet-id.js`，运行以下命令：

```bash
node get-wallet-id.js
```

这会自动调用 Coinbase CDP API 列出你的所有钱包，并显示 Wallet ID。

### 方法 2：从 Coinbase CDP Portal 获取

1. 访问 [Coinbase CDP Portal - Server Wallet](https://portal.cdp.coinbase.com/products/server-wallet)
2. 登录你的账号
3. 如果已经有创建的钱包，在钱包列表中找到钱包，Wallet ID 会显示在钱包详情中
4. 如果还没有钱包，可以创建一个（但当前实现不需要）

### 方法 3：通过 Coinbase CDP API 手动查询

你可以使用以下 API 端点来获取钱包列表：

```bash
curl -X GET "https://api.cdp.coinbase.com/v1/wallets" \
  -H "X-CB-ACCESS-KEY: 你的API_KEY" \
  -H "X-CB-ACCESS-SIGNATURE: 签名" \
  -H "X-CB-ACCESS-TIMESTAMP: 时间戳"
```

## 当前配置状态

✅ **已配置**：
- `RECEIVER_ADDRESS`: 0xacef27b4e182381b941bfb3d03411aa825f5c1b9 （你的钱包地址）
- `COINBASE_API_KEY`: 已配置
- `COINBASE_API_SECRET`: 已配置

⏸️ **可选配置**：
- `WALLET_ID`: 如果需要使用 Coinbase Server Wallet 功能，可以配置

## 下一步

由于 Wallet ID 是可选的，你现在可以：

1. **直接开始使用**：运行 `npm start` 启动服务器，系统会使用你的钱包地址接收支付
2. **或者先获取 Wallet ID**：运行 `node get-wallet-id.js` 获取 Wallet ID 后，将其添加到 `.env` 文件中

两种方式都可以正常工作！







