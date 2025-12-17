#!/bin/bash
set -e

echo "📦 Installing root dependencies..."
npm install --production=false --ignore-scripts

echo "📦 Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps
cd ..

echo "🏗️ Building frontend..."
npm run build

echo "✅ Build complete!"
