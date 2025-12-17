#!/bin/bash
# Railway 构建脚本
# 确保所有依赖都已安装后再构建

echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "🏗️ Building frontend..."
npm run build

echo "✅ Build complete!"
