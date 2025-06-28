#!/usr/bin/env node

import { UnifiedLogProcessor } from '../src/core/unified-log-processor.js';
import fs from 'fs';

console.log('🧪 統一ログ処理システムのテスト');
console.log('=' * 50);

const processor = new UnifiedLogProcessor();

// テストログの読み込み
const testLogs = [
  { name: 'test-raw-log.txt', description: '構造的協働思考ログ (30K)' },
  { name: 'test-raw-log-2.txt', description: '心理カウンセリングログ (69K)' },
  { name: 'test-raw-log-3.txt', description: '数学哲学ログ (107K)' }
].filter(log => fs.existsSync(log.name));

console.log(`📄 テスト対象: ${testLogs.length}ファイル`);

for (const testLog of testLogs) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${testLog.description}`);
  console.log(`${'='.repeat(60)}`);
  
  const startTime = Date.now();
  const rawLog = fs.readFileSync(testLog.name, 'utf-8');
  
  try {
    // 統一処理実行
    const structure = await processor.processUnifiedLog(rawLog, testLog.description);
    const processingTime = Date.now() - startTime;
    
    console.log(`\n📊 処理結果:`);
    console.log(`   タイトル: ${structure.header.title}`);
    console.log(`   主要概念: ${structure.header.mainConcepts.join(', ')}`);
    console.log(`   議論範囲: ${structure.header.discussionScope}`);
    console.log(`   対話形式: ${structure.header.dialogueType}`);
    console.log(`   推奨ファイル名: ${structure.header.suggestedFilename}`);
    console.log(`   チャンク数: ${structure.chunks.length}個`);
    console.log(`   処理時間: ${processingTime}ms`);
    
    console.log(`\n🎯 品質指標:`);
    console.log(`   概念カバレッジ: ${structure.metadata.qualityMetrics.conceptCoverage}%`);
    console.log(`   文脈保持度: ${structure.metadata.qualityMetrics.contextPreservation}%`);
    console.log(`   チャンク一貫性: ${structure.metadata.qualityMetrics.chunkCoherence}%`);
    
    // 最初のチャンクのサンプル表示
    if (structure.chunks.length > 0) {
      const firstChunk = structure.chunks[0];
      console.log(`\n📄 チャンク1サンプル (${firstChunk.characterRange}):`);
      console.log(`   ${firstChunk.content.substring(0, 200)}...`);
    }
    
    // 統一出力をファイルに保存
    const outputPath = `unified-${testLog.name.replace('.txt', '-result.md')}`;
    const unifiedOutput = processor.generateUnifiedOutput(structure);
    fs.writeFileSync(outputPath, unifiedOutput);
    console.log(`\n💾 統一出力を保存: ${outputPath}`);
    
  } catch (error) {
    console.error(`❌ 処理エラー: ${error}`);
  }
}

console.log('\n✅ 統一処理システムテスト完了');
console.log('\n💡 使用方法:');
console.log('   - unified-*.md ファイルで全体構造を確認');
console.log('   - 各チャンクのプロンプトをコピーしてAIに送信');
console.log('   - 全体テーマを意識した一貫した構造化が可能');