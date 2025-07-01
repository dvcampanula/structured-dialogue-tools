# コミットガイドライン

**プロジェクトの長期的健全性を保つためのコミット基準**

---

## 🚫 コミットしないもの

### 一時的・使い捨てファイル
- **テストスクリプト**: `test-*.js`, `debug-*.ts` 等の一時検証用
- **実験ファイル**: `experiment-*.js`, `poc-*.ts` 等の概念実証用
- **デバッグファイル**: `temp-*.json`, `debug-output.txt` 等
- **個人メモ**: `notes.md`, `todo-personal.txt` 等

### 自動生成・一時出力
- **ログファイル**: `*.log`, `debug.txt`, `output-*.json`
- **ビルド成果物**: `dist/` の一時ファイル（必要な成果物は除く）
- **キャッシュ**: `.cache/`, `temp/`, `tmp/` 配下
- **IDE設定**: `.vscode/`, `.idea/` 等の個人環境設定

---

## ✅ コミットするもの

### 永続的価値のあるコード
- **コアシステム**: `src/core/` の機能実装
- **設定ファイル**: `package.json`, `tsconfig.json`, `.env.example`
- **API実装**: 実用的なエンドポイント・機能

### 長期的価値のあるドキュメント
- **システム仕様**: `README.md`, `DEVELOPMENT_LOG.md`
- **引き継ぎ情報**: `LATEST_SESSION.md`, `NEXT_SESSION_HANDOVER.md`
- **技術文書**: アーキテクチャ・API仕様・ユーザーガイド

### 継続的に使用するリソース
- **テストデータ**: `test-logs/` の標準的なテストファイル
- **設定ファイル**: 環境設定・概念抽出設定等

---

## 📋 判定基準

### コミット前のチェックリスト
- [ ] **再利用性**: 他の開発者・将来の自分が使うか？
- [ ] **永続性**: プロジェクト終了まで価値を持つか？
- [ ] **必要性**: システム動作・理解に必要か？
- [ ] **メンテナンス**: 継続的に更新・改善するか？

### 判定例
```bash
# ❌ コミットしない
test-quality-improvements.js     # 一時検証用
debug-concept-extraction.ts      # デバッグ用
session-notes-20250701.md       # 個人メモ
temp-api-response.json          # 一時出力

# ✅ コミットする  
src/core/quality-metrics.ts     # コア機能
DEVELOPMENT_LOG.md              # プロジェクト記録
package.json                    # 設定ファイル
test-logs/standard/sample.txt   # 標準テストデータ
```

---

## 🔧 実装方法

### .gitignore 設定
```gitignore
# 一時・テストファイル
test-*.js
test-*.ts
debug-*
temp-*
experiment-*
poc-*

# 個人メモ・ノート
notes.md
notes-*.md
todo-personal.*
session-notes-*

# 出力・ログ
*.log
debug.txt
output-*.json
temp-output.*

# 一時ディレクトリ
temp/
tmp/
.cache/
debug-output/
```

### コミット前の確認コマンド
```bash
# ファイル確認
git status

# 一時ファイルが含まれていないかチェック
git diff --name-only | grep -E "(test-|debug-|temp-|experiment-)"

# 含まれている場合は除外
git reset HEAD <一時ファイル名>
```

---

## 🗂️ ディレクトリ構成ルール

### 一時作業用ディレクトリ
```
/workspace/          # 一時作業・実験用（gitignore対象）
  ├── experiments/   # 概念実証・実験
  ├── debug/         # デバッグ用ファイル  
  ├── temp/          # 一時ファイル
  └── notes/         # 個人メモ
```

### 永続化ディレクトリ
```
/src/                # コアシステム
/docs/               # 正式ドキュメント
/test-logs/          # 標準テストデータ
/config/             # 設定ファイル
```

---

## 🚨 緊急時の対応

### 間違ってコミットした場合
```bash
# 最新コミットから除外（コミット前の状態に戻す）
git reset --soft HEAD~1
git reset HEAD <不要ファイル>
git commit -m "修正されたコミットメッセージ"

# ファイルを.gitignoreに追加
echo "ファイル名" >> .gitignore
git add .gitignore
git commit -m "不要ファイルをgitignoreに追加"
```

---

## 📊 今回の対応

### 今回コミットした一時ファイル
- `test-quality-improvements.js` - 品質改善検証用

### 推奨対応
1. **即座に除外**: 次回セッションで .gitignore に追加
2. **workspace/ 作成**: 一時作業用ディレクトリ設置
3. **ルール適用**: 今後の開発で厳密に適用

---

**原則**: 「他の開発者が clone した時に不要なファイル」「プロジェクト完了後に価値がないファイル」はコミットしない