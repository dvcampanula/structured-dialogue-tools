#!/usr/bin/env node

/**
 * test-raw-log-8.txt の解析テスト - 複雑な混合対話ケース
 */

import { IntelligentConceptExtractor } from './src/core/intelligent-concept-extractor';
import * as fs from 'fs/promises';

async function testLog8Analysis() {
  console.log('🔬 test-raw-log-8.txt 解析テスト開始');
  console.log('🚨 予想される課題: 複雑な混合対話による不安定性\n');
  
  const extractor = new IntelligentConceptExtractor();
  
  try {
    await extractor.initialize();
    console.log('✅ 初期化完了\n');
    
    // ログファイル読み込み
    const logContent = await fs.readFile('tests/test-raw-log-8.txt', 'utf-8');
    console.log(`📄 ログサイズ: ${logContent.length} 文字`);
    console.log(`📄 行数: ${logContent.split('\n').length}`);
    
    // 部分解析（最初の3000文字）
    const shortContent = logContent.substring(0, 3000);
    console.log('\n📊 部分解析 (最初の3000文字)');
    console.log('━'.repeat(60));
    
    const result1 = await extractor.extractConcepts(shortContent);
    
    console.log(`🎯 対話タイプ: ${result1.dialogueTypeDetection}`);
    console.log(`⚡ 革新度: ${result1.predictedInnovationLevel}/10`);
    console.log(`✨ 信頼度: ${result1.confidence}%`);
    console.log(`🏆 品質グレード: ${result1.qualityPrediction.qualityGrade}`);
    console.log(`📈 総合品質: ${result1.qualityPrediction.overallQuality}%\n`);
    
    console.log(`🌸 表面概念数: ${result1.surfaceConcepts.length}`);
    console.log(`🧠 深層概念数: ${result1.deepConcepts.length}`);
    console.log(`⚡ 時間革命マーカー数: ${result1.timeRevolutionMarkers.length}\n`);
    
    if (result1.deepConcepts.length > 0) {
      console.log('🧠 深層概念 (Top 5):');
      result1.deepConcepts.slice(0, 5).forEach((concept, i) => {
        console.log(`  ${i+1}. ${concept.term} (${Math.round(concept.confidence * 100)}%)`);
        console.log(`     ${concept.reasoning.substring(0, 60)}...`);
      });
      console.log('');
    }
    
    // 品質メトリクス
    const metrics = result1.qualityPrediction.realTimeMetrics;
    console.log('📊 リアルタイムメトリクス:');
    console.log(`  概念一貫性: ${metrics.conceptCoherence}%`);
    console.log(`  対話関連性: ${metrics.dialogueRelevance}%`);
    console.log(`  専門用語精度: ${metrics.terminologyAccuracy}%`);
    console.log(`  抽出信頼性: ${metrics.extractionReliability}%`);
    console.log(`  意味的深度: ${metrics.semanticDepth}%`);
    console.log(`  文脈適合性: ${metrics.contextualFitness}%\n`);
    
    // 改善提案
    console.log('💡 改善提案:');
    result1.qualityPrediction.improvementSuggestions.forEach((suggestion, i) => {
      console.log(`  ${i+1}. ${suggestion}`);
    });
    
    // 全体解析（最初の8000文字まで）
    const mediumContent = logContent.substring(0, 8000);
    console.log('\n\n📊 中規模解析 (最初の8000文字)');
    console.log('━'.repeat(60));
    
    const result2 = await extractor.extractConcepts(mediumContent);
    
    console.log(`🎯 対話タイプ: ${result2.dialogueTypeDetection}`);
    console.log(`⚡ 革新度: ${result2.predictedInnovationLevel}/10`);
    console.log(`🏆 品質グレード: ${result2.qualityPrediction.qualityGrade}`);
    console.log(`📈 総合品質: ${result2.qualityPrediction.overallQuality}%`);
    console.log(`🧠 深層概念数: ${result2.deepConcepts.length}`);
    
    // 安定性比較
    console.log('\n\n📊 安定性比較');
    console.log('━'.repeat(60));
    console.log(`対話タイプ変化: ${result1.dialogueTypeDetection} → ${result2.dialogueTypeDetection}`);
    console.log(`革新度変化: ${result1.predictedInnovationLevel}/10 → ${result2.predictedInnovationLevel}/10`);
    console.log(`深層概念数変化: ${result1.deepConcepts.length} → ${result2.deepConcepts.length}`);
    console.log(`品質グレード変化: ${result1.qualityPrediction.qualityGrade} → ${result2.qualityPrediction.qualityGrade}`);
    
    // 不安定性評価
    const dialogueChanged = result1.dialogueTypeDetection !== result2.dialogueTypeDetection;
    const innovationChanged = Math.abs(result1.predictedInnovationLevel - result2.predictedInnovationLevel) > 2;
    const conceptCountChanged = Math.abs(result1.deepConcepts.length - result2.deepConcepts.length) > 2;
    
    console.log('\n🔍 不安定性評価:');
    if (dialogueChanged) console.log('  ⚠️  対話タイプが変化 - 不安定');
    if (innovationChanged) console.log('  ⚠️  革新度が大幅変化 - 不安定');
    if (conceptCountChanged) console.log('  ⚠️  深層概念数が大幅変化 - 不安定');
    
    if (!dialogueChanged && !innovationChanged && !conceptCountChanged) {
      console.log('  ✅ 安定した解析結果');
    }
    
    // 課題特定
    console.log('\n🎯 特定された課題:');
    console.log('  1. Detroit: Become Human + 技術議論 + アンドロイド対話の混合');
    console.log('  2. 専門技術用語（RED、ナノ流体等）の大量出現');
    console.log('  3. フィクション概念（ブルーブラッド、Thirium）との混在');
    console.log('  4. 長文による文脈の複雑化');
    
    console.log('\n✅ test-raw-log-8.txt 解析完了');
    
  } catch (error) {
    console.error('❌ 解析失敗:', error);
    process.exit(1);
  }
}

testLog8Analysis();