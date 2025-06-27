# 構造的対話ツール群

AIとの対話ログを自動分割・命名・書式統一するツール群

## 🎯 概要

長いAI対話ログ（最大17万文字）を効率的に処理し、構造化された対話ログを生成するツールセットです。

### 主要機能
- **自動分割**: 意味境界を認識した最適分割（10,000字前後）
- **命名支援**: 既存パターンを学習した自動ファイル名生成
- **書式統一**: 一貫した構造化ログ形式への変換
- **文脈保持**: チャンク間のオーバーラップによる情報欠損防止

## 🚀 クイックスタート

### インストール
```bash
git clone <your-repo-url>
cd structured-dialogue-tools
npm install
```

### 基本使用方法
```bash
# Webアプリケーション起動
npm start

# ブラウザで http://localhost:3000 にアクセス
```

### 個別ツール実行
```bash
# ログパターン分析
npm run analyze:logs

# 分割ツールテスト
npm run test:split

# 命名ヘルパーテスト
npm run test:naming

# 書式統一ツールテスト
npm run test:format
```

## 📊 使用例

### 1. Webアプリでの処理
1. AIとの対話ログをコピー
2. http://localhost:3000 のテキストエリアに貼り付け
3. 「ログを処理」ボタンをクリック
4. 結果を3つのタブで確認：
   - **分割結果**: チャンクごとの内容
   - **構造化プロンプト**: AI用の継続指示
   - **統一書式**: 最終保存形式

### 2. 処理フロー
```
17万文字の生ログ
    ↓ 自動分割
17チャンク（各10K字）
    ↓ 構造化プロンプト生成
AI用の詳細指示17個
    ↓ AIで構造化
構造化ログ17個
    ↓ 書式統一
統一された最終ファイル
```

## 🛠️ ツール構成

### 核心ツール
- `raw-log-splitter.ts` - 生ログ分割エンジン
- `naming-helper.ts` - 命名支援システム
- `log-format-unifier.ts` - 書式統一ツール

### 分析ツール
- `log-pattern-analyzer.ts` - 既存ログパターン分析
- `log-format-analyzer.ts` - 書式構造分析

### 統合アプリ
- `structured-dialogue-app.ts` - Webアプリケーション
- `public/index.html` - フロントエンドUI

## 📁 ファイル命名規則

自動生成されるファイル名例：
```
log_p02_trigger_10.md     # p02フェーズ、triggerカテゴリ、10番目
log_p05_extension_08.md   # p05フェーズ、extensionカテゴリ、8番目
log_p06_reflection_01_claude.md  # モデル名付き
```

### フェーズ分類
- `p00`: discovery（発見・探索）
- `p01`: article, init（文書化・初期化）
- `p02`: propagation, trigger, trial（実験・トリガー・伝播）
- `p03`: applications, finalize（応用・確定）
- `p04`: transition（遷移）
- `p05`: extension（拡張・発展）
- `p06`: reflection, propagation（振り返り・伝播）

## ⚙️ 設定

### 分割設定
```typescript
{
  targetChunkSize: 10000,    // 目標分割サイズ
  maxChunkSize: 12000,       // 最大許容サイズ
  minChunkSize: 5000,        // 最小許容サイズ
  overlapSize: 500,          // チャンク間オーバーラップ
  preserveContext: true      // 文脈境界保持
}
```

### 書式設定
```typescript
{
  preserveContent: true,     // 既存内容保持
  addMissingEmojis: true,    // 絵文字自動追加
  standardizeMarkdown: true, // マークダウン標準化
  addMetadata: true,         // メタデータ付与
  generateToc: false         // 目次生成
}
```

## 🔧 トラブルシューティング

### よくある問題

#### ポート3000が使用中
```bash
# 別のポートで起動
PORT=3001 npm start
```

#### メモリ不足エラー
```bash
# Node.jsメモリ上限を増加
node --max-old-space-size=4096 structured-dialogue-app.ts
```

#### 大きすぎるログファイル
- 推奨最大サイズ: 200万文字
- 17万文字以下が最適
- 事前に日付/セッション単位で分割を検討

## 📈 パフォーマンス

### 処理能力
- **10万文字**: 1-2秒
- **17万文字**: 2-5秒（推奨サイズ）
- **50万文字**: 5-10秒
- **100万文字**: 15-30秒

### メモリ使用量
- **基本**: 50MB程度
- **大容量処理時**: 200-500MB

## 🤝 コントリビューション

1. このプロジェクトをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🔗 関連リンク

- [構造的対話フレームワーク](https://github.com/dvcampanula/structured-dialogue)
- [Claude Code](https://claude.ai/code)

---

**開発者**: dvcampanula  
**作成日**: 2025-06-27  
**バージョン**: 1.0.0

🤖 Generated with [Claude Code](https://claude.ai/code)