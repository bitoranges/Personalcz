# 测试状态 / Test Status

## ✅ 所有测试通过 / All Tests Passing

### 后端测试 (Backend Tests)
- **框架**: Jest + Supertest
- **测试文件**: `__tests__/server.test.js`
- **测试数量**: 9 个测试用例
- **状态**: ✅ 全部通过

**测试覆盖**:
- ✅ GET /health - 健康检查
- ✅ GET /api/unlock - 支付要求（无钱包地址）
- ✅ GET /api/unlock - 支付要求（钱包地址未支付）
- ✅ GET /api/payment-status - 支付状态检查
- ✅ POST /api/payment-intent - 创建支付意图
- ✅ POST /api/unlock - 验证支付流程

### 前端测试 (Frontend Tests)
- **框架**: Vitest + Testing Library
- **测试文件**: `frontend/__tests__/MaterialsCard.test.tsx`
- **测试数量**: 5 个测试用例
- **状态**: ✅ 全部通过

**测试覆盖**:
- ✅ 渲染材料卡片
- ✅ 显示解锁按钮（锁定状态）
- ✅ 显示材料列表
- ✅ 显示正确的价格信息
- ✅ 显示锁定状态的材料

## 运行测试

### 运行所有测试
```bash
npm test
```

### 仅运行后端测试
```bash
npm run test:backend
```

### 仅运行前端测试
```bash
cd frontend
npm test
```

## 测试配置

### 后端测试配置
- **配置文件**: `jest.config.js`
- **设置文件**: `jest.setup.js`
- **环境变量**: `NODE_ENV=test` (自动设置)

### 前端测试配置
- **配置文件**: `frontend/vitest.config.ts`
- **设置文件**: `frontend/vitest.setup.ts`
- **环境**: jsdom (模拟浏览器环境)

## 注意事项

1. **服务器启动**: 测试环境会自动设置 `NODE_ENV=test`，防止服务器在测试时启动监听端口
2. **Mock 对象**: 前端测试使用 Mock 对象模拟 `x402Client` 和 `window.location`
3. **测试隔离**: 每个测试用例前后都会清理 mock 状态

## 持续集成

测试已配置为可以在 CI/CD 环境中运行：
- 无需外部依赖（除了 Node.js）
- 无需真实的区块链网络连接
- 所有外部服务都已 mock






