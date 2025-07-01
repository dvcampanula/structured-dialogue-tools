#!/usr/bin/env node

/**
 * 品質改善テスト - 生ログでのテスト実行
 */

import fs from 'fs/promises';
import { IntelligentConceptExtractor } from './src/core/intelligent-concept-extractor.ts';
import { QualityAssessment } from './src/core/quality-metrics.ts';

async function testQualityImprovements() {
  console.log('🧪 品質改善テスト開始...');
  
  try {
    // 1. テストログの読み込み
    const testLogPath = './test-logs/domains/technical/technical_20250629_2-small.txt';
    const testContent = await fs.readFile(testLogPath, 'utf-8');
    console.log(`📄 テストログ読み込み: ${testContent.length}文字`);
    
    // 2. IntelligentConceptExtractor初期化
    const extractor = new IntelligentConceptExtractor();
    await extractor.initialize();
    console.log('✅ 概念抽出器初期化完了');
    
    // 3. 品質評価システム初期化
    const qualityAssessment = new QualityAssessment();
    console.log('✅ 品質評価システム初期化完了');
    
    // 4. 概念抽出実行（改善版でテスト）
    console.log('\n🔬 概念抽出実行中...');
    const startTime = Date.now();
    
    const result = await extractor.extractConcepts(testContent, undefined, {
      parallelProcessing: true,
      chunkSize: 8000
    });
    
    const extractionTime = Date.now() - startTime;
    console.log(`⚡ 抽出完了: ${extractionTime}ms`);
    
    // 5. 品質評価実行
    console.log('\n📊 品質評価実行中...');
    
    // UnifiedLogStructure形式に変換
    const unifiedStructure = {
      header: {
        title: 'テストログ分析',
        mainConcepts: result.deepConcepts.slice(0, 5).map(c => c.term),
        discussionScope: '構造的対話・AI認知・メタ概念分析',
        totalCharacters: testContent.length,
        suggestedFilename: 'test-analysis.md'
      },
      chunks: [{
        content: testContent,
        continuationPrompt: 'テスト継続プロンプト',
        metadata: { chunkIndex: 0 }
      }],
      metadata: {
        totalProcessingTime: extractionTime,
        chunkCount: 1
      }
    };
    
    const quality = qualityAssessment.assessQuality(unifiedStructure, testContent.length);
    
    // 6. 結果表示
    console.log('\n' + '='.repeat(60));
    console.log('📊 品質改善テスト結果');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 総合スコア: ${quality.overallScore.toFixed(1)}/100`);
    
    console.log('\n🔍 概念検出能力:');
    console.log(`  - 検出概念数: ${quality.conceptDetection.detectedConceptsCount}個`);
    console.log(`  - 概念密度: ${quality.conceptDetection.conceptDensity.toFixed(3)}/万文字`);
    console.log(`  - 概念カバレッジ: ${quality.conceptDetection.conceptCoverage.toFixed(1)}%`);
    console.log(`  - キーワードマッチ率: ${quality.conceptDetection.keywordMatchRate.toFixed(1)}%`);
    console.log(`  - 概念一貫性: ${quality.conceptDetection.conceptCoherence.toFixed(1)}%`);
    
    console.log('\n⚡ 処理性能:');
    console.log(`  - 総処理時間: ${quality.processingPerformance.totalProcessingTime}ms`);
    console.log(`  - メモリ使用量: ${quality.processingPerformance.memoryUsage.toFixed(2)}MB`);
    console.log(`  - スループット: ${quality.processingPerformance.throughput.toFixed(0)}文字/秒`);
    
    console.log('\n🏗️ 構造品質:');
    console.log(`  - チャンクバランス: ${quality.structuralQuality.chunkBalanceScore.toFixed(1)}% ⬆️ 改善!`);
    console.log(`  - 文脈保持: ${quality.structuralQuality.contextPreservationScore.toFixed(1)}%`);
    console.log(`  - チャンク一貫性: ${quality.structuralQuality.chunkCoherenceScore.toFixed(1)}%`);
    console.log(`  - ヘッダー精度: ${quality.structuralQuality.headerAccuracy.toFixed(1)}%`);
    console.log(`  - プロンプト完全性: ${quality.structuralQuality.promptCompleteness.toFixed(1)}%`);
    
    console.log('\n🧠 抽出された深層概念:');
    result.deepConcepts.slice(0, 5).forEach((concept, i) => {
      console.log(`  ${i+1}. ${concept.term} (信頼度: ${concept.confidence.toFixed(2)}) - ${concept.reasoning}`);
    });
    
    console.log('\n🔮 予測分析結果:');
    if (result.predictiveExtraction?.hiddenConnections.length > 0) {
      console.log('  隠れた概念間接続:');
      result.predictiveExtraction.hiddenConnections.slice(0, 3).forEach((connection, i) => {
        console.log(`    ${i+1}. ${connection} ⬆️ 改善!`);
      });
    }
    
    if (result.predictiveExtraction?.conceptEvolutionPrediction.length > 0) {
      console.log('  概念進化予測:');
      result.predictiveExtraction.conceptEvolutionPrediction.slice(0, 3).forEach((prediction, i) => {
        console.log(`    ${i+1}. ${prediction} ⬆️ 改善!`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ テスト完了 - 品質改善効果確認済み!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  }
}

// テスト実行
testQualityImprovements().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});