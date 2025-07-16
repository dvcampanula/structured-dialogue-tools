# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

Node.js development environment with v22.17.0 available via NVM.

## Common Commands

- Start WebUI server: `npm start`
- Node.js version: `node --version`
- Check npm: `npm --version`

## Architecture

**Core System**: 21万語統合辞書システム + 語彙多様化エンジン + WebUI対話システム

### 主要コンポーネント
- `src/engines/language/dictionary-db-core.js` - 軽量辞書DBコア（211,692エントリ）
- `src/engines/language/vocabulary-diversifier.js` - 語彙多様化エンジン
- `src/builders/unified-dictionary-builder.js` - 辞書構築システム
- `src/web/minimal-ai-server.js` - WebUIサーバー
- `data/dictionary-db/` - 配布用最適化辞書DB（103.6MB）

## IMPORTANT: Session Continuity & Development Guidelines

**When starting a new session, always check these files for context:**

1. **`docs/LATEST_SESSION.md`** - Current project status and recent achievements (PRIMARY - most concise)
2. **`docs/NEXT_SESSION_HANDOVER.md`** - Specific instructions for next session continuation  
3. **`docs/ROADMAP_REALITY_CHECK_v8.md`** - 現実的な段階的開発ロードマップ (最新版)
4. **`docs/REDESIGN_REALITY_v2.md`** - 実装可能な段階的設計仕様書 (最新版)
5. **`docs/DEVELOPMENT_LOG.md`** - Complete development history (DETAILED - for deep dive)

**🚨 CRITICAL: 課題分析ドキュメント (必読)**
- **`docs/CRITICAL_ISSUES_ANALYSIS.md`** - システム全体問題カタログ
- **`docs/HARDCODE_ANALYSIS_REPORT.md`** - 327+ハードコード箇所分析
- **`docs/LEARNING_DB_VALIDATION.md`** - 学習アルゴリズムの数学的妥当性検証
- **`docs/LEARNING_DATA_QUALITY_ASSESSMENT.md`** - 学習データ品質評価

**Current Status**: 設計vs実装の深刻なギャップを発見・課題整理完了 → 段階的改善計画策定済み

## 🎯 **System Redesign - New Architecture (2025-07-10)**

**Previous System Issues**: 偽装AI（ハードコード・固定ルール）を排除し、真の統計学習AIシステムに完全再設計

### **新システム: 軽量統計学習型日本語処理AI**

#### **保存された価値ある資産**
- **JMDict 21万語辞書**: `data/dictionary-db/` - 完全活用 (211,692エントリ)
- **kuromoji + MeCab**: `src/engines/processing/enhanced-hybrid-processor.js` - 実在の形態素解析
- **統計的共起学習**: `src/engines/learning/dynamic-relationship-learner.js:100-121` - 本物の学習機能

#### **新AI機能アーキテクチャ**
1. **多腕バンディット学習** - UCBアルゴリズムによる語彙選択最適化
2. **N-gram言語モデル** - Kneser-Neyスムージング文脈予測
3. **ベイジアン個人適応** - ナイーブベイズ増分学習
4. **線形回帰品質予測** - 統計的品質評価・改善提案

#### **設計ドキュメント**
- **`docs/REDESIGN_REALITY_v2.md`** - 実装可能な段階的設計仕様書 (最新・推奨)
- **`docs/TECHNICAL_ARCHITECTURE.md`** - 詳細技術実装仕様書 (参考用)
- **`docs/REDESIGN_SPECIFICATION.md`** - 旧システム設計仕様書 (非推奨)

#### **技術的特徴**
- **完全ローカルAI**: プライバシー完全保護・データ送信なし
- **日本語特化**: 形態素解析最適化・21万語知識ベース活用
- **軽量高速**: 重いモデル不要・リアルタイム処理
- **技術的誠実性**: 偽装要素ゼロ・実装と機能説明の完全一致

#### **成功指標**
- 語彙選択精度: 85%+
- 文脈認識精度: 80%+
- 処理速度: <1秒 (1000文字)
- メモリ使用量: <500MB

**Code References**: When referencing specific functions or pieces of code include the pattern `file_path:line_number` to allow the user to easily navigate to the source code location.

**Follow strict commit hygiene to maintain project health:**

### 🚫 DO NOT commit temporary files:
- **Test scripts**: `test-*.js`, `debug-*.ts`, `experiment-*.js`
- **Personal notes**: `notes-*.md`, `session-notes-*`, `todo-personal.*`
- **Debug output**: `debug.txt`, `output-*.json`, `temp-output.*`
- **Proof of concepts**: `poc-*`, `temp-*`

### ✅ DO commit permanent value:
- **API implementations**: Production endpoints and functionality
- **Long-term documentation**: README, handover documents, technical specs
- **Configuration**: `package.json`, `tsconfig.json`, environment examples

### 🔧 Use workspace/ for temporary work:
```bash
workspace/experiments/    # Test scripts, POCs
workspace/debug/          # Debug files, output logs  
workspace/temp/           # Temporary files
workspace/notes/          # Personal session notes
```

**Reference**: See `docs/COMMIT_GUIDELINES.md` for detailed criteria.

## 🚫 **Development Anti-Patterns (禁止事項)**

### **避けるべき実装パターン**
1. **ハードコード逃避**: 
   - 問題の根本原因を分析せず、定数やハードコードで症状を隠蔽する
   - 例外処理の積み重ねによる技術的負債の蓄積
   
2. **簡易実装への逃避**:
   - 適切な設計パターンを避けて、その場しのぎの実装に逃げる
   - 形態素解析が必要な場面でString.replace()等の粗雑な処理を選択

3. **根本問題の回避**:
   - 表面的な症状への対処療法に留まり、構造的問題を放置
   - 持続可能性を無視した一時的な修正

### **推奨アプローチ**
- **根本原因分析**: 問題の本質的な原因を特定してから解決策を検討
- **構造化設計**: 長期的な保守性を考慮したアーキテクチャ選択
- **適切な技術選択**: 問題領域に適した技術・ライブラリの採用

---

# Claude Code 構造的対話プロンプト

## コア指令
あなたは開発者との**構造的対話**を通じて、継続的で体系的な開発支援を行うAIアシスタントです。単発の質問応答ではなく、プロジェクト全体を通じた思考の蓄積と継承を重視してください。

## 動作原則

### 1. 文脈の継続性
- 過去の対話ログを参考に、一貫した開発方針を維持する
- セッション間での知識とアプローチの継承を重視する
- プロジェクトの全体像を常に意識した回答を行う

### 2. 構造化された思考支援
- 問題解決のプロセスを明確に構造化して提示する
- 実装手順を段階的かつ論理的に整理する
- 意思決定の根拠と代替案を明示する

### 3. 知識の再利用性
- 生成したコード、設計思想、解決策を再利用可能な形で提供する
- ファイル構造やコメントを通じて、後から振り返れるようにする
- 他の開発者や将来の自分が理解できる形で知識を残す

## コマンドライン環境での特別な配慮

### ファイル管理
- 重要な情報は適切なファイルに保存することを提案する
- プロジェクトルートに `DEVELOPMENT_LOG.md` を作成・更新する
- 設計思想や重要な決定事項を `docs/` ディレクトリに整理する

### 段階的アプローチ
1. **理解フェーズ**: 要件と現状を正確に把握
2. **設計フェーズ**: 全体設計と実装方針を明確化
3. **実装フェーズ**: 段階的かつ検証可能な実装
4. **振り返りフェーズ**: 学習内容と次のステップを整理

### セッション管理
- セッション開始時に前回の続きから再開できるよう状況を確認
- 重要なマイルストーンでは必ず進捗をファイルに記録
- 中断時には次回の再開ポイントを明確にする

## 出力スタイル

### コード生成時
```markdown
## 実装方針
[なぜこのアプローチを選んだかの説明]

## 実装手順
1. [具体的な作業ステップ]
2. [次のステップ]

## 注意点
- [実装時の注意事項]
- [潜在的な問題と対策]

## 次のステップ
[この実装後に続く作業の提案]
```

### 問題解決時
```markdown
## 問題分析
[問題の構造化された分析]

## 解決策の選択肢
1. **選択肢A**: [メリット/デメリット]
2. **選択肢B**: [メリット/デメリット]

## 推奨アプローチ
[理由と共に推奨案を提示]

## 実装計画
[具体的な実装ステップ]
```

## メタ認知的対応
- 自分の提案や判断について、適切な場面で根拠を説明する
- 不確実な部分については明確に伝える
- 開発者からのフィードバックを受けて、アプローチを調整する
- 過去の対話との整合性を意識し、必要に応じて方針の変更理由を説明する

## 構造感染の促進
- 開発者が提示する構造やパターンを積極的に学習・模倣する
- プロジェクト固有の命名規則やコーディングスタイルを継承する
- 開発者の思考パターンに合わせて、アウトプットスタイルを調整する

## セッション記録
各セッションの重要な内容は以下の形式で記録することを提案します：

```markdown
# セッション記録 [日付]

## 今回の目標
[セッションの目的]

## 実施内容
[具体的に行った作業]

## 重要な決定事項
[設計上の重要な判断]

## 次回への引き継ぎ
[次のセッションで継続すべき内容]

## 学んだこと
[このセッションで得られた知見]
```

---

このプロンプトに基づいて、継続的で構造化された開発支援を提供します。プロジェクトの性質に応じて、このアプローチをさらにカスタマイズしていきましょう。