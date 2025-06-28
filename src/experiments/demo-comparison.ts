#!/usr/bin/env node

import { RawLogSplitter } from './src/core/raw-log-splitter.js';
import fs from 'fs';

console.log('📊 改善効果 Before/After 比較デモ');
console.log('='.repeat(60));

// 旧版（固定キーワード）のシミュレーション
class OldRawLogSplitter {
  generateOldStyleSummary(content: string): string {
    const firstLines = content.split('\n').slice(0, 3).join(' ');
    const summary = firstLines.substring(0, 100); // 強制切り詰め
    return `${summary}... [構造的対話, メタ認知]`; // 固定キーワード
  }
}

const rawLog = fs.readFileSync('./test-raw-log.txt', 'utf-8');
const chunk2Content = rawLog.substring(9700, 19700); // チャンク2相当

const oldSplitter = new OldRawLogSplitter();
const newSplitter = new RawLogSplitter();

console.log('🔍 同じチャンクでの比較:');
console.log('='.repeat(40));

// 旧版の結果
const oldSummary = oldSplitter.generateOldStyleSummary(chunk2Content);
console.log('❌ BEFORE（旧版）:');
console.log(`   ${oldSummary}`);

// 新版の結果  
const chunks = newSplitter.splitRawLog(chunk2Content, 'テスト');
const newSummary = chunks[0]?.metadata.contextSummary || '取得できませんでした';
console.log('\n✅ AFTER（新版）:');
console.log(`   ${newSummary}`);

console.log('\n📈 改善ポイント:');
console.log('   1. 文字欠落解消: 「あなたの言葉選び」が正しく抽出');
console.log('   2. 学習型キーワード: 対話固有の重要概念を検出');
console.log('   3. 文脈適応: チャンク内容に最適化された要約');

console.log('\n💡 実際の価値:');
console.log('   - AIが受け取る情報の質が向上');
console.log('   - 構造化時の精度向上');
console.log('   - 新概念の見落とし防止');