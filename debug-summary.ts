#!/usr/bin/env node

import { RawLogSplitter } from './src/core/raw-log-splitter.js';
import fs from 'fs';

// テストファイルを読み込み
const rawLog = fs.readFileSync('./test-raw-log.txt', 'utf-8');

// チャンク2の開始位置を計算（約10000文字目）
const chunk2Start = 10000 - 300; // オーバーラップを考慮
const chunk2Content = rawLog.substring(chunk2Start, chunk2Start + 10300);

console.log('チャンク2の冒頭部分:');
console.log('='.repeat(50));
console.log(chunk2Content.substring(0, 200));
console.log('='.repeat(50));

// 分割ツールのgenerateContextSummaryメソッドをテスト
const splitter = new RawLogSplitter();

// プライベートメソッドにアクセスするためにanyでキャスト
const summary = (splitter as any).generateContextSummary(chunk2Content);
console.log(`\n生成された要約: "${summary}"`);

// User/Human検出のテスト
const lines = chunk2Content.split('\n');
const userPrompts = lines.filter(line => 
  /^(User|Human|ユーザー|質問|依頼)[:：]/.test(line.trim())
);

console.log(`\nUser/Human検出数: ${userPrompts.length}`);
if (userPrompts.length > 0) {
  console.log(`最初のプロンプト: "${userPrompts[0]}"`);
  
  const cleaned = userPrompts[0].replace(/^(User|Human|ユーザー|質問|依頼)[:：]\s*/, '');
  console.log(`クリーンアップ後: "${cleaned}"`);
  console.log(`クリーンアップ後の長さ: ${cleaned.length}`);
}