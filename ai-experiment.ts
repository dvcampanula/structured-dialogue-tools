#!/usr/bin/env node

import { RawLogSplitter } from './src/core/raw-log-splitter.js';
import fs from 'fs';

/**
 * Before/After実証実験用データ生成
 * 同一チャンクを旧版/新版で処理し、AI送信用の比較データを作成
 */

console.log('🧪 Before/After AI実証実験用データ生成');
console.log('=' * 60);

// 旧版処理のシミュレーション
class LegacyProcessor {
  process(content: string): {
    summary: string;
    keywords: string[];
    chunk: string;
  } {
    // 固定切り詰め（文字境界無視）
    const summary = content.substring(0, 100) + '...';
    
    // 固定キーワード
    const keywords = ['構造的対話', 'メタ認知', 'AI'];
    
    return {
      summary,
      keywords,
      chunk: content
    };
  }
}

// 新版処理
const newSplitter = new RawLogSplitter({
  targetChunkSize: 8000,
  preserveContext: true,
  addChunkHeaders: true
});

// テスト用チャンクの準備
const rawLog = fs.readFileSync('./test-raw-log.txt', 'utf-8');
const testChunk = rawLog.substring(9700, 17700); // 8000文字のサンプル

console.log(`📏 テストチャンク: ${testChunk.length}文字`);

// 旧版処理
const legacy = new LegacyProcessor();
const oldResult = legacy.process(testChunk);

// 新版処理
const newChunks = newSplitter.splitRawLog(testChunk, 'AI実験用');
const newResult = newChunks[0];

// AI送信用プロンプト生成
function generateAIPrompt(version: 'old' | 'new', data: any): string {
  if (version === 'old') {
    return `以下の対話ログチャンクを構造化してください。

## 文脈情報
要約: ${data.summary}
キーワード: ${data.keywords.join(', ')}

## 対話内容
${data.chunk}

---
上記を構造的対話ログとして整理し、以下を評価してください：
1. 重要概念の見落としがないか
2. 文脈の理解に問題がないか  
3. 構造化の精度（1-10点）`;
  } else {
    return `以下の対話ログチャンクを構造化してください。

## チャンク情報
- 文字数: ${data.metadata.characterCount}
- 分割理由: ${data.metadata.splitReason}
- 文脈要約: ${data.metadata.contextSummary}

## 継続指示
${data.metadata.continuationPrompt}

## 対話内容
${data.content}

---
上記を構造的対話ログとして整理し、以下を評価してください：
1. 重要概念の見落としがないか
2. 文脈の理解に問題がないか
3. 構造化の精度（1-10点）`;
  }
}

// 実験用ファイル生成
const experimentData = {
  testCase: {
    original_chunk_length: testChunk.length,
    source: 'test-raw-log.txt (offset: 9700-17700)'
  },
  old_version: {
    prompt: generateAIPrompt('old', oldResult),
    metadata: {
      summary_method: 'fixed_truncation',
      keyword_method: 'static_list',
      context_preservation: false
    }
  },
  new_version: {
    prompt: generateAIPrompt('new', newResult),
    metadata: {
      summary_method: 'smart_truncation_with_boundaries',
      keyword_method: 'adaptive_learning_based',
      context_preservation: true,
      detected_concepts: newResult?.metadata.contextSummary.match(/\[([^\]]+)\]/)?.[1]?.split(', ') || []
    }
  },
  evaluation_criteria: [
    "重要概念の捕捉率 (0-100%)",
    "文脈理解の正確性 (1-10点)", 
    "構造化の論理性 (1-10点)",
    "見落とした新概念の数",
    "全体的な有用性 (1-10点)"
  ]
};

// ファイル出力
fs.writeFileSync('./experiment-prompts.json', JSON.stringify(experimentData, null, 2));

console.log('✅ 実験用データ生成完了');
console.log('\n📋 次のステップ:');
console.log('1. experiment-prompts.json の old_version.prompt をClaude/ChatGPTに送信');
console.log('2. new_version.prompt を同じAIに送信');
console.log('3. 両結果を evaluation_criteria で比較評価');
console.log('4. 定量的な改善効果を測定');

console.log('\n🎯 期待される改善:');
console.log('- 概念捕捉率: 50% → 95%');
console.log('- 文脈理解: 6/10 → 9/10');
console.log('- 新概念検出: 0個 → 5-8個');

// 簡易版プロンプトをコンソール出力
console.log('\n' + '='.repeat(80));
console.log('📤 AI送信用プロンプト (旧版)');
console.log('='.repeat(80));
console.log(experimentData.old_version.prompt.substring(0, 500) + '...');

console.log('\n' + '='.repeat(80));
console.log('📤 AI送信用プロンプト (新版)');  
console.log('='.repeat(80));
console.log(experimentData.new_version.prompt.substring(0, 500) + '...');