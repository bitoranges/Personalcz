# Git 推送问题解决方案

## 问题
无法通过 HTTPS 推送到 GitHub（连接超时）

## 解决方案

### 方案一：使用 SSH（推荐）

如果你已经配置了 SSH 密钥：

```bash
# 切换到 SSH URL
git remote set-url origin git@github.com:bitoranges/Personalcz.git

# 推送
git push origin main
```

### 方案二：配置 Git 使用代理（如果有代理）

```bash
# 设置 HTTP 代理
git config --global http.proxy http://proxy.example.com:8080
git config --global https.proxy https://proxy.example.com:8080

# 推送
git push origin main

# 推送完成后，取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 方案三：增加超时时间

```bash
# 增加 Git 超时时间
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999

# 推送
git push origin main
```

### 方案四：使用 GitHub CLI

```bash
# 安装 GitHub CLI（如果还没安装）
# brew install gh

# 登录
gh auth login

# 推送
git push origin main
```

### 方案五：使用 GitHub Desktop

1. 下载 GitHub Desktop：https://desktop.github.com
2. 登录你的 GitHub 账号
3. 添加仓库
4. 点击 "Push origin"

### 方案六：直接在 Railway 配置（最快）

如果推送一直失败，可以直接在 Railway 界面配置：

1. 进入 Railway 项目
2. Settings → Build
3. 修改 Build Command：
   ```
   npm ci && cd frontend && npm ci && cd .. && npm run build
   ```
4. 点击 "Redeploy"

这样即使代码没推送，也能修复构建问题。

## 当前未推送的提交

- `1355612` - Add nixpacks.toml to fix Railway build
- `7dccc83` - Add private repo deployment guide  
- `09173e3` - Fix Railway build: install frontend dependencies

## 推荐操作顺序

1. **先尝试 SSH**（如果已配置）
2. **如果不行，使用 GitHub Desktop**
3. **如果还是不行，直接在 Railway 配置构建命令**
