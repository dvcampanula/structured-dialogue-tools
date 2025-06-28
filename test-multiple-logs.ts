#!/usr/bin/env node

import { RawLogSplitter } from './src/core/raw-log-splitter.js';
import fs from 'fs';
import path from 'path';

// 複数ログファイルのテスト
const testFiles = [
  'test-raw-log.txt',
  'test-raw-log-2.txt',
  'test-raw-log-3.txt'
].filter(file => fs.existsSync(file));

console.log(`📄 複数ログテスト開始: ${testFiles.length}ファイル`);

const splitter = new RawLogSplitter({
  targetChunkSize: 8000,
  maxChunkSize: 10000,
  preserveContext: true,
  addChunkHeaders: true,
  overlapSize: 300
});

testFiles.forEach((fileName, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ファイル ${index + 1}: ${fileName}`);
  console.log(`${'='.repeat(60)}`);
  
  const rawLog = fs.readFileSync(fileName, 'utf-8');
  console.log(`📏 ファイルサイズ: ${rawLog.length}文字`);
  
  // 対話形式の推定
  const hasUserMarkers = /^(User|Human|ユーザー)[:：]/m.test(rawLog);
  const hasAssistantMarkers = /^(Assistant|AI|Claude|GPT|Gemini)[:：]/m.test(rawLog);
  const dialogueType = hasUserMarkers && hasAssistantMarkers ? '構造化対話' : 
                      hasUserMarkers ? 'ユーザー主導' : 
                      hasAssistantMarkers ? 'AI主導' : '自由形式';
  
  console.log(`🎭 対話形式: ${dialogueType}`);
  
  const chunks = splitter.splitRawLog(rawLog, `${fileName}のテスト`);
  
  console.log(`\n🔍 分割結果 (${chunks.length}チャンク):`);
  chunks.slice(0, 3).forEach((chunk) => { // 最初の3チャンクのみ表示
    console.log(`\n--- チャンク ${chunk.index} ---`);
    console.log(`📊 文字数: ${chunk.metadata.characterCount}`);
    console.log(`🎯 分割理由: ${chunk.metadata.splitReason}`);
    console.log(`💬 対話含有: ${chunk.metadata.containsDialogue ? 'あり' : 'なし'}`);
    console.log(`📝 文脈要約: ${chunk.metadata.contextSummary.substring(0, 100)}...`);
    
    // キーワードの詳細表示
    const keywordMatch = chunk.metadata.contextSummary.match(/\[([^\]]+)\]/);
    if (keywordMatch) {
      console.log(`🔑 抽出キーワード: ${keywordMatch[1]}`);
    }
  });
  
  if (chunks.length > 3) {
    console.log(`\n... 他 ${chunks.length - 3} チャンク`);
  }
  
  // キーワード統計
  const allKeywords = chunks.map(c => {
    const match = c.metadata.contextSummary.match(/\[([^\]]+)\]/);
    return match ? match[1].split(', ') : [];
  }).flat();
  
  const keywordFreq = allKeywords.reduce((acc, kw) => {
    acc[kw] = (acc[kw] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\n📊 キーワード統計:`);
  Object.entries(keywordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([keyword, count]) => {
      console.log(`  "${keyword}": ${count}回`);
    });
});

console.log(`\n✅ テスト完了`);
console.log(`\n💡 新しいログをテストするには:`);
console.log(`   1. test-raw-log-2.txt を作成して生ログを貼り付け`);
console.log(`   2. npx tsx test-multiple-logs.ts を実行`);