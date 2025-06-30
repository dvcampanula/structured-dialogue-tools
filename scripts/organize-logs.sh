#!/bin/bash

# テストログ整理スクリプト（シェル版）
# test-logs/直下のファイルを分析・整理

echo "🗂️  テストログ自動整理ツール"
echo "================================"

# ドライラン実行
echo "📋 整理計画を確認中..."
node --import tsx/esm scripts/organize-test-logs.ts

echo ""
echo "📂 現在のtest-logs/構造:"
find test-logs -type f -name "*.txt" -o -name "*.md" -o -name "*.log" | head -20

echo ""
echo "❓ 実行しますか？ (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🚀 ファイル整理を実行中..."
    node --import tsx/esm scripts/organize-test-logs.ts --execute
    
    echo ""
    echo "📊 整理後の構造:"
    tree test-logs/ -I "README.md" || find test-logs -type f | sort
    
    echo ""
    echo "✅ 整理完了！"
else
    echo "❌ キャンセルされました"
fi