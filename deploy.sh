#!/bin/bash
# FlyerGen Deploy Script
# Rebuilds frontend and deploys to /var/www/apps/flyergen

set -e

PROJECT_DIR="/root/.local/.openclaw/workspace/projects/flyergen"
DEPLOY_DIR="/var/www/apps/flyergen"

echo "🔨 Building frontend..."
cd "$PROJECT_DIR/frontend"
npm run build

echo "📦 Deploying to $DEPLOY_DIR..."
mkdir -p "$DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"/*
cp -r dist/* "$DEPLOY_DIR/"

echo "🔄 Reloading Caddy..."
systemctl reload caddy

echo "✅ Deploy complete! https://flyergen.steppa.online"
