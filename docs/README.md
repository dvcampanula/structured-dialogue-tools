# Structured Dialogue Tools

AIとの構造的対話ログを自動分割・統一処理・構造化するツール群

## 🎯 概要

長いAI対話ログ（最大17万文字）を効率的に処理し、統一された構造的対話ログを生成するツールセットです。

### 🚀 統一ログヘッダーアプローチ（最新）
- **全体概念抽出**: ログ全体から主要概念を自動抽出
- **統一命名**: 一貫したファイル名とテーマ管理  
- **文脈保持分割**: 分割は文脈圧縮回避の手段として位置付け
- **品質保証**: 90%概念カバレッジ、8-13ms高速処理

### 従来機能との違い
```
❌ Before: チャンク1[技術] → file1, チャンク2[SSR] → file2 (断片化)
✅ After:  "構造的AI協働ログ" → 統一テーマでの一貫処理
```

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
# 複数ログテスト（推奨）
npm run test:multiple

# 統一処理テスト（最新）
npx tsx tests/test-unified-processor.ts

# 概念分析
npm run analyze:concepts

# Before/After実験
npm run experiment:ai
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

### 📁 プロジェクト構造
```
structured-dialogue-tools/
├── src/
│   ├── core/          # 核心機能
│   │   ├── raw-log-splitter.ts       # 従来の分割機能
│   │   └── unified-log-processor.ts  # 統一処理システム★
│   ├── web/           # Webアプリケーション
│   ├── tools/         # 分析ツール
│   └── experiments/   # 実験・デモツール
├── tests/             # テストファイル・データ（gitignore）
└── docs/              # ドキュメント類
    ├── LATEST_SESSION.md     # 最新状況★
    ├── DEVELOPMENT_LOG.md    # 完全な開発履歴
    └── usage-guide.md        # 詳細な使用ガイド
```

### 核心ツール
- `unified-log-processor.ts` - **統一処理システム（最新）**
- `raw-log-splitter.ts` - 生ログ分割エンジン（従来）
- `naming-helper.ts` - 命名支援システム
- `log-format-unifier.ts` - 書式統一ツール

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

## 🔧 開発状況

**現在の状態**: 統一ログヘッダーアプローチ実装完了  
**次の優先タスク**: Webアプリ統合、効果測定システム

### 最新の成果
- ✅ プロジェクト構造完全整理
- ✅ 統一処理システム実装
- ✅ 3種類ログでの動作確認（30K-107K文字）
- ✅ Git履歴クリーンアップ

### 次回セッション準備
最新状況は `docs/LATEST_SESSION.md` を参照

---

**開発者**: dvcampanula  
**作成日**: 2025-06-27  
**最終更新**: 2025-06-28  
**バージョン**: 1.1.0

🤖 Generated with [Claude Code](https://claude.ai/code)