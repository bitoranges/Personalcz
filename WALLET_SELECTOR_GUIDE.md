# 钱包选择器使用指南

## 功能说明

现在点击"Unlock All Access"按钮时，会显示一个钱包选择器界面，让用户选择使用哪个钱包进行支付。

## 支持的钱包

### 自动检测的钱包

钱包选择器会自动检测以下已安装的钱包：

1. **MetaMask** 🦊
2. **Binance Wallet** 🔶
3. **OKX Wallet** ✅
4. **Coinbase Wallet** 🔵
5. **Brave Wallet** 🦁
6. **Trust Wallet** 🔷
7. 其他支持 EIP-6963 标准的钱包

## 工作原理

### 1. EIP-6963 标准检测

钱包选择器使用 EIP-6963 标准来检测所有已安装的钱包。这是最新的钱包发现标准，允许同时检测多个钱包而不冲突。

### 2. 传统检测（Legacy）

对于不支持 EIP-6963 的钱包，使用传统的检测方法：
- 检测 `window.ethereum`
- 检测 `window.BinanceChain`
- 检测 `window.okxwallet`
- 检测 `window.trustwallet`

### 3. 用户界面

当用户点击"Unlock All Access"按钮时：
1. 如果未连接钱包，会显示钱包选择器模态框
2. 列出所有检测到的钱包
3. 用户点击选择钱包
4. 自动连接到选定的钱包
5. 继续支付流程

## 用户体验流程

```
用户点击 "Unlock All Access"
    ↓
显示钱包选择器
    ↓
用户选择钱包（如 MetaMask）
    ↓
钱包连接请求（钱包弹窗确认）
    ↓
连接成功
    ↓
自动继续支付流程
    ↓
钱包确认支付
    ↓
内容解锁
```

## 如果没有检测到钱包

如果用户没有安装任何钱包，钱包选择器会显示：
- 提示信息："No wallets detected"
- 提供下载链接：
  - MetaMask 下载
  - Binance Wallet 下载
  - OKX Wallet 下载

## 注意事项

### Binance Wallet 特殊处理

Binance Wallet 使用不同的 API 结构，代码中已特殊处理。但请注意：
- Binance Wallet 主要用于 BSC（Binance Smart Chain）
- 本项目的支付在 Base 网络上进行
- 确保钱包支持 Base 网络，或代码会自动切换网络

### 网络切换

x402-client.js 会自动处理网络切换：
- 如果钱包不在 Base 网络，会提示用户切换
- 支持自动添加 Base 网络到钱包

## 技术实现

### WalletSelector 组件

位置：`frontend/components/WalletSelector.tsx`

主要功能：
- 检测所有可用钱包
- 显示钱包列表
- 处理钱包选择
- 提供下载链接（如果没有钱包）

### x402-client.js 更新

更新了 `connectWallet()` 方法：
- 支持传入特定的钱包 provider
- 处理不同钱包的特殊情况
- 支持 EIP-6963 和传统检测

### MaterialsCard 组件更新

- 添加了钱包选择器状态管理
- 更新了 `handleUnlock()` 逻辑
- 添加了 `handleWalletSelect()` 处理函数

## 测试建议

### 测试场景

1. **单个钱包**：
   - 只安装 MetaMask，测试是否正常显示和连接

2. **多个钱包**：
   - 安装多个钱包（MetaMask + OKX），测试是否能正确显示所有钱包

3. **无钱包**：
   - 禁用所有钱包扩展，测试是否显示下载链接

4. **不同钱包连接**：
   - 测试使用 MetaMask 连接
   - 测试使用 OKX Wallet 连接
   - 测试使用 Binance Wallet 连接（如果支持 Base 网络）

### 调试

如果遇到问题，检查浏览器控制台：
- 钱包检测日志
- 连接错误信息
- 网络切换提示

## 未来改进

可能的改进方向：
1. 记住用户上次选择的钱包
2. 显示钱包图标（如果钱包提供）
3. 支持 WalletConnect（移动钱包）
4. 更好的错误处理和提示

---

**最后更新**：2024-12-14



