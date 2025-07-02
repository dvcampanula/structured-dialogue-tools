# Workspace ディレクトリ

**一時作業・実験・デバッグ用の作業領域**

## 📁 ディレクトリ構成

- **experiments/**: 概念実証・機能実験・テストスクリプト
- **debug/**: デバッグ用ファイル・ログ・出力結果
- **temp/**: 一時ファイル・中間生成物
- **notes/**: 個人メモ・セッションノート・TODO

## 🚫 重要な注意

- **このディレクトリはgitignore対象です**
- **ファイルは自動的にコミットされません**
- **永続化が必要な成果は適切なディレクトリに移動してください**

## 📋 使用例

```bash
# 品質改善テスト
workspace/experiments/test-quality-improvements.js

# デバッグ出力
workspace/debug/concept-extraction-debug.json

# 一時的な実験
workspace/temp/api-response-test.json

# セッションメモ
workspace/notes/session-20250701.md
```

## 🔄 成果の永続化

価値のある成果は以下に移動：
- **コード**: `src/` ディレクトリ
- **ドキュメント**: `docs/` ディレクトリ  
- **テストデータ**: `test-logs/` ディレクトリ
- **設定**: `config/` ディレクトリ