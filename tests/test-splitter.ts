#!/usr/bin/env node

import { RawLogSplitter } from '../src/core/raw-log-splitter.js';
import fs from 'fs';

// テストファイルを読み込み
const rawLog = fs.readFileSync('./test-raw-log.txt', 'utf-8');

console.log(`📄 テスト開始: ${rawLog.length}文字のGeminiログ`);

// 分割ツールでテスト
const splitter = new RawLogSplitter({
  targetChunkSize: 8000,
  maxChunkSize: 10000,
  preserveContext: true,
  addChunkHeaders: true,
  overlapSize: 300
});

const chunks = splitter.splitRawLog(rawLog, 'Geminiとの構造的対話テスト');

console.log('\n🔍 分割結果詳細:');
chunks.forEach((chunk, index) => {
  console.log(`\n--- チャンク ${chunk.index} ---`);
  console.log(`文字数: ${chunk.metadata.characterCount}`);
  console.log(`分割理由: ${chunk.metadata.splitReason}`);
  console.log(`対話含有: ${chunk.metadata.containsDialogue ? 'あり' : 'なし'}`);
  console.log(`文脈要約: ${chunk.metadata.contextSummary}`);
  console.log(`境界数: ${chunk.boundaries.length}`);
});

// 構造化プロンプト生成
const prompts = splitter.generateStructuringPrompts(chunks, 'Geminiとの構造的対話テスト');
console.log(`\n📝 構造化プロンプト: ${prompts.length}個生成`);