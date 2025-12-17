# 私有仓库部署授权指南

## 🔐 私有仓库部署说明

你的仓库是**私有仓库**，部署服务需要授权才能访问。以下是各平台的授权方式：

---

## 🚂 Railway（推荐）

### 授权方式：
1. **使用 GitHub 账号登录 Railway**
   - 访问 https://railway.app
   - 点击 "Login with GitHub"
   - **Railway 会自动请求访问你的私有仓库权限**

2. **授权权限**
   - GitHub 会弹出授权页面
   - 选择 "Authorize Railway"
   - Railway 会获得访问你私有仓库的权限

3. **部署**
   - 在 Railway 中选择 "Deploy from GitHub repo"
   - 你的私有仓库 `bitoranges/Personalcz` 会出现在列表中
   - 选择并部署即可

### ✅ 优点：
- 自动授权，无需手动配置
- 安全可靠
- 支持私有仓库

---

## 🌐 Render

### 授权方式：
1. **使用 GitHub 账号登录 Render**
   - 访问 https://render.com
   - 点击 "Get Started for Free" → "Sign up with GitHub"

2. **授权权限**
   - GitHub 会要求授权 Render 访问你的仓库
   - 选择 "Authorize Render"
   - 可以选择授权所有仓库或仅特定仓库

3. **部署**
   - 创建 Web Service
   - 选择你的私有仓库 `bitoranges/Personalcz`
   - 配置并部署

---

## 🔑 如果需要手动授权（高级）

### 使用 Personal Access Token (PAT)

如果部署服务不支持 GitHub OAuth，可以使用 PAT：

1. **创建 GitHub Personal Access Token**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token" → "Generate new token (classic)"
   - 权限选择：
     - ✅ `repo` (完整仓库访问权限)
     - ✅ `read:packages` (如果需要读取包)
   - 生成并**复制 token**（只显示一次）

2. **在部署服务中使用**
   - 在部署服务的 Git 配置中
   - 使用 token 作为密码
   - 用户名：你的 GitHub 用户名
   - 密码：刚才生成的 token

---

## ⚠️ 安全注意事项

1. **不要将 token 提交到代码**
   - Token 应该只在部署平台配置
   - 不要写入 `.env` 或代码文件

2. **使用最小权限原则**
   - 只授予必要的权限
   - 定期轮换 token

3. **Railway/Render 推荐**
   - 这些平台使用 OAuth，更安全
   - 不需要手动管理 token

---

## 🎯 推荐流程（Railway）

### 最简单的方式：

1. **访问 Railway**
   ```
   https://railway.app
   ```

2. **登录**
   - 点击 "Login with GitHub"
   - 授权 Railway 访问你的仓库

3. **部署**
   - "New Project" → "Deploy from GitHub repo"
   - 选择 `bitoranges/Personalcz`
   - Railway 会自动检测并部署

4. **配置环境变量**
   - 在 Railway 项目设置中添加环境变量
   - 不需要任何 token 或额外授权

### ✅ 完成！

Railway 通过 GitHub OAuth 自动获得访问权限，你不需要做任何额外配置。

---

## 📝 总结

- ✅ **Railway/Render**: 使用 GitHub OAuth，自动授权，最简单
- ⚙️ **其他平台**: 可能需要 Personal Access Token
- 🔒 **安全性**: OAuth 比手动 token 更安全

**建议：直接使用 Railway，5 分钟完成部署，无需手动配置授权！**
