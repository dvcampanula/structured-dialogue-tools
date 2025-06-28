# structured-dialogue-tools 使用ガイド

## 🎯 実際の使用シナリオ

### シナリオ1: ChatGPTとの技術議論を構造化

1. **生ログ準備**
   ```
   User: Next.jsでSSRとSSGの使い分けについて教えて
   ChatGPT: Next.jsにおけるSSR（Server-Side Rendering）と...
   [長い対話が続く]
   ```

2. **ツール実行**
   - Webアプリ（http://localhost:3000）に貼り付け
   - または `test-raw-log.txt` に保存して `npx tsx test-splitter.ts`

3. **結果活用**
   - 分割されたチャンクを別々のAIに送信
   - 構造化プロンプトでClaude等に再構造化依頼
   - `log_p02_tech_discussion_01.md` として保存

### シナリオ2: 複数AIでの概念探索

1. **段階的対話**
   - Claude: 基礎概念の探索
   - ChatGPT: 実装方法の議論  
   - Gemini: 哲学的な深掘り

2. **統合処理**
   - 各AIとの対話を個別ファイルで保存
   - `test-multiple-logs.ts` で一括分析
   - 共通概念・相違点を抽出

3. **最終構造化**
   - 学習型キーワードで重要概念を特定
   - 統合された知見を新しい構造的対話として再編

### シナリオ3: 長期プロジェクトでの知識蓄積

1. **継続的記録**
   ```
   project-logs/
   ├── week1-exploration.txt    # 初期探索
   ├── week2-implementation.txt # 実装議論
   ├── week3-optimization.txt   # 最適化検討
   ```

2. **定期的分析**
   - 週次で `concept-analyzer.ts` 実行
   - 新概念の出現パターンを追跡
   - プロジェクト進化の可視化

## 🔧 高度な使用方法

### API連携での自動化

```bash
# 生ログを自動分割してAPIに送信
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"rawLog": "...", "options": {"targetChunkSize": 8000}}'
```

### バッチ処理

```bash
# 複数ファイルの一括処理
for log in logs/*.txt; do
  echo "Processing $log..."
  cp "$log" test-raw-log.txt
  npx tsx test-splitter.ts > "results/$(basename $log .txt).json"
done
```

### 概念データベースの育成

```bash
# 1. 新しいログで概念抽出
npx tsx concept-analyzer.ts

# 2. 手動で重要概念を選別
# concept-analysis-results.json を編集

# 3. データベース更新
npx tsx adaptive-keyword-extractor.ts

# 4. 次回から学習済み概念を活用
```

## 📊 出力の活用方法

### 分割されたチャンクの使い方

1. **AIへの順次送信**
   ```
   Claude用プロンプト:
   「以下のチャンク1/4を構造化してください。
   [前チャンクからの継続を意識してください]
   
   [チャンク内容]」
   ```

2. **並列処理**
   - 複数のAIに同時送信
   - 結果の比較・統合

3. **段階的深化**
   - チャンク1: 概要把握
   - チャンク2-3: 詳細分析
   - チャンク4: 結論・次ステップ

### 構造化プロンプトの活用

```
生成されたプロンプト例:
「以下の生ログチャンク（2/4）を構造化対話ログに変換してください。

## チャンク情報
- 文字数: 8500
- 分割理由: natural_boundary
- 文脈要約: 技術実装の具体的手順について... [Next.js, SSR, 実装]

## 継続指示
これは2番目のチャンクです。前のチャンクからの文脈継承を意識してください。

[実際のチャンク内容]」
```

## 💡 ベストプラクティス

### 1. ログの準備
- 対話マーカー（User:, Assistant:）を明確に
- タイムスタンプがある場合は保持
- 重要な概念は「」で囲む

### 2. 設定の調整
- **短い対話**: targetChunkSize: 5000
- **長い議論**: targetChunkSize: 10000  
- **技術的内容**: overlapSize: 500（用語の継続性）
- **哲学的議論**: overlapSize: 300（概念の流れ）

### 3. 結果の検証
- 文脈要約が適切か確認
- キーワードが議論の核心を捉えているか
- チャンク間の連続性は保たれているか

### 4. 継続的改善
- 使用後の評価をconcept-database.jsonに反映
- 新しい分野では概念抽出を再調整
- 定期的にキーワード重み付けを見直し

---

## 🚀 今すぐ始める

1. サーバー起動: `npm start`
2. http://localhost:3000 にアクセス
3. 手持ちの対話ログを貼り付け
4. 「分割実行」ボタンをクリック
5. 結果をAIに送信して構造化完了！

structured-dialogue-toolsで、あなたの対話を価値ある知識資産に変換しましょう。