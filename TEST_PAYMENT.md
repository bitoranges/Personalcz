# 测试支付功能

## 如果你看到 "Hook x402 paywall here: POST /api/unlock"

这说明浏览器可能缓存了旧版本的 HTML 文件。

### 解决方法：

1. **硬刷新浏览器缓存**：
   - Mac: `Cmd + Shift + R` 或 `Cmd + Option + R`
   - Windows/Linux: `Ctrl + Shift + R` 或 `Ctrl + F5`

2. **或者清除浏览器缓存**：
   - Chrome: 设置 → 隐私和安全 → 清除浏览数据 → 选择"缓存的图片和文件"

3. **检查浏览器控制台**：
   - 按 F12 打开开发者工具
   - 查看 Console 标签页
   - 应该看到 "✅ Unlock button initialized with x402 payment handler" 消息

### 确保后端服务器正在运行：

```bash
npm start
```

服务器应该显示：
```
🚀 x402 Payment Server running on port 3000
```

### 测试步骤：

1. 确保后端服务器运行中
2. 硬刷新浏览器页面（Cmd+Shift+R）
3. 打开浏览器控制台（F12）查看是否有错误
4. 点击 "Pay $1.10 USDC (Base)" 按钮
5. 应该会提示连接钱包，而不是显示 alert

如果还有问题，请检查控制台的错误信息。
