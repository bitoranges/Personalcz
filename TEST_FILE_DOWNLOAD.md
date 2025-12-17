# 文件下载功能测试指南

## 测试前准备

### 1. 准备测试文件

在 `materials/downloads/` 目录下放置测试文件：

```bash
# 创建测试PDF文件（示例）
echo "This is a test PDF file" > materials/downloads/test-file.pdf

# 或使用现有文件
cp /path/to/your/file.pdf materials/downloads/test-file.pdf
```

### 2. 配置 materials-config.json

确保 `materials-config.json` 中包含测试文件：

```json
{
  "materials": [
    {
      "id": "test1",
      "title": "一夜10x的文件",
      "description": "这是一个测试文件",
      "type": "pdf",
      "date": "2024-12-14",
      "filename": "test-file.pdf",
      "downloadPath": "materials/downloads/test-file.pdf"
    }
  ]
}
```

### 3. 启动服务器

```bash
npm start
```

## 测试步骤

### 步骤 1：测试未支付状态

1. 打开浏览器访问 `http://localhost:5173`（开发模式）或 `http://localhost:3000`（生产模式）

2. **不支付**，直接尝试访问下载链接：
   ```
   http://localhost:3000/api/download/test1?walletAddress=0xYourTestAddress
   ```

3. **预期结果**：应该返回 403 错误，提示需要支付

### 步骤 2：完成支付流程

1. 点击 "Unlock All Access" 按钮
2. 连接钱包（MetaMask 或其他）
3. 确认支付 $1.00 USDC
4. 等待交易确认

### 步骤 3：测试下载功能

1. **支付成功后**，材料列表应该显示为已解锁状态

2. **点击文件**：
   - 对于 PDF/Archive 类型：应该自动开始下载
   - 对于 Link 类型：应该在新标签页打开链接

3. **检查下载**：
   - 文件应该成功下载到浏览器的默认下载目录
   - 文件名应该是 `materials-config.json` 中配置的 `filename`

### 步骤 4：验证下载API

使用 curl 或 Postman 测试 API：

```bash
# 使用已支付的钱包地址测试
curl -H "X-Wallet-Address: 0xYourPaidWalletAddress" \
     http://localhost:3000/api/download/test1?walletAddress=0xYourPaidWalletAddress \
     --output downloaded-file.pdf

# 应该成功下载文件
```

### 步骤 5：测试未授权访问

```bash
# 使用未支付的钱包地址
curl -H "X-Wallet-Address: 0xUnpaidWalletAddress" \
     http://localhost:3000/api/download/test1?walletAddress=0xUnpaidWalletAddress

# 应该返回 403 Forbidden
```

## 预期行为

### ✅ 成功场景

- 支付后，材料列表显示已解锁
- 点击文件后，浏览器开始下载
- 下载的文件名正确
- 文件内容完整

### ❌ 失败场景处理

- **403 Forbidden**：未支付或钱包地址不匹配
- **404 Not Found**：文件不存在或配置错误
- **500 Internal Server Error**：服务器内部错误（检查日志）

## 调试技巧

### 查看服务器日志

```bash
# 如果使用 npm start
# 日志会直接输出到终端

# 如果使用 PM2
pm2 logs personalcz
```

### 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- Network 标签：检查下载请求的状态码
- Console 标签：查看是否有 JavaScript 错误

### 常见问题

1. **文件下载失败**
   - 检查文件路径是否正确
   - 检查文件是否存在
   - 检查文件权限

2. **403 错误**
   - 确认钱包地址已支付
   - 检查钱包地址是否正确传递

3. **下载的文件损坏**
   - 检查服务器是否正确设置了 Content-Type
   - 检查文件本身是否完整

## 生产环境测试

在生产环境部署后，使用真实钱包地址进行完整测试：

1. 使用真实钱包连接
2. 完成真实支付（小额测试）
3. 验证文件下载功能
4. 检查文件完整性

---

**注意**：在生产环境测试时，请使用小额金额进行测试，确认功能正常后再正式上线。



