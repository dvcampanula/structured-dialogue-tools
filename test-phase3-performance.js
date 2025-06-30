#!/usr/bin/env node

/**
 * Phase 3 性能テスト - 大規模ログ処理性能検証
 */

import { IntelligentConceptExtractor } from './src/core/intelligent-concept-extractor.ts';
import * as fs from 'fs/promises';

async function testPhase3Performance() {
  console.log('🚀 Phase 3 性能テスト開始...');
  
  try {
    // IntelligentConceptExtractor初期化
    const extractor = new IntelligentConceptExtractor();
    await extractor.initialize();
    
    // 大規模ログファイル読み込み
    const logPath = './test-logs/benchmarks/quality/technical/technical_20250629_1-large.txt';
    const logContent = await fs.readFile(logPath, 'utf-8');
    const contentSize = Buffer.byteLength(logContent, 'utf8');
    
    console.log(`📄 テストファイル: ${Math.round(contentSize/1024)}KB (${logContent.length}文字)`);
    
    // テスト1: 通常処理（自動判定）
    console.log('\n🔬 テスト1: 通常処理（自動判定）');
    const start1 = Date.now();
    const result1 = await extractor.extractConcepts(logContent);
    const time1 = Date.now() - start1;
    console.log(`⏱️  処理時間: ${time1}ms (${(time1/1000).toFixed(1)}秒)`);
    console.log(`📊 結果: 表面${result1.surfaceConcepts.length}個, 深層${result1.deepConcepts.length}個, 革新度${result1.predictedInnovationLevel}/10`);
    
    // テスト2: 明示的チャンク処理（並列あり）
    console.log('\n⚡ テスト2: 明示的チャンク処理（並列あり）');
    const start2 = Date.now();
    const result2 = await extractor.extractConcepts(logContent, undefined, {
      chunkSize: 30000,
      parallelProcessing: true,
      maxParallelChunks: 4,
      memoryOptimization: true
    });
    const time2 = Date.now() - start2;
    console.log(`⏱️  処理時間: ${time2}ms (${(time2/1000).toFixed(1)}秒)`);
    console.log(`📊 結果: 表面${result2.surfaceConcepts.length}個, 深層${result2.deepConcepts.length}個, 革新度${result2.predictedInnovationLevel}/10`);
    
    // テスト3: 明示的チャンク処理（逐次）
    console.log('\n🔄 テスト3: 明示的チャンク処理（逐次）');
    const start3 = Date.now();
    const result3 = await extractor.extractConcepts(logContent, undefined, {
      chunkSize: 30000,
      parallelProcessing: false,
      memoryOptimization: true
    });
    const time3 = Date.now() - start3;
    console.log(`⏱️  処理時間: ${time3}ms (${(time3/1000).toFixed(1)}秒)`);
    console.log(`📊 結果: 表面${result3.surfaceConcepts.length}個, 深層${result3.deepConcepts.length}個, 革新度${result3.predictedInnovationLevel}/10`);
    
    // 性能比較
    console.log('\n📈 性能比較');
    console.log(`通常処理:     ${(time1/1000).toFixed(1)}秒 (${Math.round(contentSize/1024/time1*1000)}KB/s)`);
    console.log(`並列チャンク: ${(time2/1000).toFixed(1)}秒 (${Math.round(contentSize/1024/time2*1000)}KB/s)`);
    console.log(`逐次チャンク: ${(time3/1000).toFixed(1)}秒 (${Math.round(contentSize/1024/time3*1000)}KB/s)`);
    
    // 目標達成判定（2分以内）
    const maxTime = Math.max(time1, time2, time3);
    const targetTime = 120000; // 2分
    const success = maxTime < targetTime;
    
    console.log('\n🎯 目標達成判定');
    console.log(`最大処理時間: ${(maxTime/1000).toFixed(1)}秒`);
    console.log(`目標時間: ${targetTime/1000}秒`);
    console.log(`結果: ${success ? '✅ 目標達成' : '❌ 目標未達成'}`);
    
    // 品質検証
    console.log('\n🔍 品質検証');
    console.log('予測概念抽出結果:');
    if (result1.predictiveExtraction) {
      console.log(`潜在概念: ${result1.predictiveExtraction.predictedConcepts.length}個`);
      result1.predictiveExtraction.predictedConcepts.slice(0, 3).forEach((concept, i) => {
        console.log(`  ${i+1}. ${concept.concept} (確率: ${(concept.probability*100).toFixed(1)}%)`);
      });
    }
    
    return success;
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
    return false;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testPhase3Performance()
    .then(success => {
      console.log(`\n🏁 Phase 3 性能テスト完了: ${success ? '成功' : '失敗'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}