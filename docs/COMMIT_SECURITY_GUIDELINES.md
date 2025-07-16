# 🔒 コミットセキュリティガイドライン

## 📋 **プライバシー・セキュリティ保護ルール**

### ⚠️ **絶対にコミットしてはいけないもの**

#### **1. プライベート対話ログ**
```bash
❌ 禁止:
data/logs/claude/*.txt
data/logs/gemini/*.log  
data/logs/chatgpt/*.md
data/logs/processed/*

✅ 例外:
data/logs/README.md  # 説明書のみOK
```

#### **2. 機密情報・認証データ**
```bash
❌ 禁止:
*.secret
*.private
*-credentials.*
*-secrets.*
api-keys.*
tokens.*
auth-*
```

#### **3. 個人識別情報**
```bash
❌ 禁止:
personal-*
private-*
confidential-*
user-data-*
session-data-*
```

#### **4. デバッグ・一時ファイル**
```bash
❌ 禁止:
debug-*
temp-*
experiment-*
poc-*
sample-*
demo-*
test-*.js
learning-debug-*
training-output-*
```

#### **5. バックアップ・出力ファイル**
```bash
❌ 禁止:
*.bak
*.backup
output-*.json
error-*.log
crash-*.log
*.dump
*.trace
```

---

## 🛡️ **セキュリティ確認方法**

### **1. コミット前チェック**
```bash
# ステージングエリア確認
git status

# 機密ファイルがないかチェック
git diff --cached --name-only | grep -E "\.(txt|log|secret|private)$"

# 除外設定テスト
git check-ignore personal-data.txt  # 除外されていればOK
```

### **2. 除外設定テスト**
```bash
# プライベートログ除外確認
git check-ignore data/logs/claude/test.txt
# → ファイルパスが表示されれば正常除外

# 機密ファイル除外確認  
git check-ignore test-credentials.json
# → ファイルパスが表示されれば正常除外
```

---

## 🚀 **安全なコミット手順**

### **Step 1: ファイル確認**
```bash
git status
# 追加予定ファイルをすべて確認
```

### **Step 2: 機密チェック**
```bash
# 機密ファイルパターン検索
git ls-files | grep -E "(secret|private|credential|auth-|personal-|user-data)"
# → 何も表示されなければOK
```

### **Step 3: 安全コミット**
```bash
git add <安全なファイルのみ>
git commit -m "機能追加: <詳細>"
```

---

## 📊 **コミット除外カテゴリ一覧**

### **✅ 現在の.gitignore保護範囲**

| カテゴリ | パターン | 理由 |
|---------|---------|------|
| **プライベートログ** | `data/logs/**/` | 機密対話ログ保護 |
| **認証・秘密情報** | `*.secret`, `*-credentials.*` | セキュリティ保護 |
| **個人データ** | `personal-*`, `user-data-*` | プライバシー保護 |
| **デバッグファイル** | `debug-*`, `temp-*` | 開発環境整理 |
| **大容量ファイル** | `data/dictionaries/JMdict` | リポジトリサイズ制限 |
| **一時作業** | `workspace/`, `poc-*` | 実験・テスト分離 |
| **バックアップ** | `*.bak`, `restore-*` | 履歴管理分離 |

---

## 🔍 **トラブルシューティング**

### **問題: 機密ファイルが誤ってコミットされた**
```bash
# 最新コミットから削除（まだpushしていない場合）
git reset --soft HEAD~1
git reset HEAD <機密ファイル>
git commit -m "修正コミット"

# 既にpushした場合（危険）
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch <機密ファイル>' \
--prune-empty --tag-name-filter cat -- --all
```

### **問題: .gitignoreが効かない**
```bash
# 既にtrackingされているファイルを除外
git rm --cached <ファイル名>
git add .gitignore
git commit -m "gitignore適用"
```

---

## 🎯 **推奨ワークフロー**

1. **開発中**: 機密ファイルは `workspace/` や `data/logs/` に配置
2. **コミット前**: `git status` で全ファイル確認
3. **機密チェック**: 上記パターンに該当しないか確認
4. **段階コミット**: 安全なファイルのみ選択的にコミット
5. **定期確認**: `.gitignore` 設定の見直し

---

**🔒 プライバシーファースト: 疑わしいファイルは除外優先で安全性を確保**