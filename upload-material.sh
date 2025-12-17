#!/bin/bash
# 资料上传脚本
# 使用方法: ./upload-material.sh <file-path> <material-id> [title] [description]

if [ $# -lt 2 ]; then
  echo "使用方法: $0 <file-path> <material-id> [title] [description]"
  echo "示例: $0 ./my-file.pdf m1 '资料标题' '资料描述'"
  exit 1
fi

FILE_PATH=$1
MATERIAL_ID=$2
TITLE=${3:-"资料标题"}
DESCRIPTION=${4:-"资料描述"}
FILENAME=$(basename "$FILE_PATH")

# 从环境变量读取 Railway URL 和 Admin Key
RAILWAY_URL=${RAILWAY_URL:-"https://your-app.up.railway.app"}
ADMIN_KEY=${ADMIN_KEY}

if [ -z "$ADMIN_KEY" ]; then
  echo "错误: 请设置 ADMIN_KEY 环境变量"
  echo "export ADMIN_KEY=your-admin-key"
  exit 1
fi

echo "📤 上传资料文件..."
echo "文件: $FILE_PATH"
echo "资料ID: $MATERIAL_ID"
echo "标题: $TITLE"

# 上传文件
curl -X POST "$RAILWAY_URL/api/admin/upload" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -H "X-Material-ID: $MATERIAL_ID" \
  -H "X-Filename: $FILENAME" \
  -H "X-Title: $TITLE" \
  -H "X-Description: $DESCRIPTION" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$FILE_PATH"

echo ""
echo "✅ 上传完成！"
