#!/usr/bin/env node

/**
 * test-raw-log-9.txt の解析テスト - 学術的対話・論文執筆相談
 */

import { IntelligentConceptExtractor } from './src/core/intelligent-concept-extractor';
import * as fs from 'fs/promises';

async function testLog9Analysis() {
  console.log('🔬 test-raw-log-9.txt 解析テスト開始');
  console.log('📝 内容: Copilotとの構造的対話学術討論・論文執筆相談\n');
  
  const extractor = new IntelligentConceptExtractor();
  
  try {
    await extractor.initialize();
    console.log('✅ 初期化完了\n');
    
    // ログファイル読み込み
    const logContent = await fs.readFile('tests/test-raw-log-9.txt', 'utf-8');
    console.log(`📄 ログサイズ: ${logContent.length} 文字`);
    console.log(`📄 行数: ${logContent.split('\n').length}`);
    
    // 全体解析
    console.log('\n📊 全体解析');
    console.log('━'.repeat(60));
    
    const result = await extractor.extractConcepts(logContent);
    
    console.log(`🎯 対話タイプ: ${result.dialogueTypeDetection}`);
    console.log(`⚡ 革新度: ${result.predictedInnovationLevel}/10`);
    console.log(`✨ 信頼度: ${result.confidence}%`);
    console.log(`🏆 品質グレード: ${result.qualityPrediction.qualityGrade}`);
    console.log(`📈 総合品質: ${result.qualityPrediction.overallQuality}%`);
    console.log(`🔧 ドメイン特化: ${result.qualityPrediction.domainSpecificScore}%\n`);
    
    console.log(`🌸 表面概念数: ${result.surfaceConcepts.length}`);
    console.log(`🧠 深層概念数: ${result.deepConcepts.length}`);
    console.log(`⚡ 時間革命マーカー数: ${result.timeRevolutionMarkers.length}\n`);
    
    // 表面概念（Top 5）
    if (result.surfaceConcepts.length > 0) {
      console.log('🌸 表面概念 (Top 5):');
      result.surfaceConcepts.slice(0, 5).forEach((concept, i) => {
        console.log(`  ${i+1}. ${concept.term} (${Math.round(concept.confidence * 100)}%)`);
      });
      console.log('');
    }
    
    // 深層概念（All）
    if (result.deepConcepts.length > 0) {
      console.log('🧠 深層概念 (全て):');
      result.deepConcepts.forEach((concept, i) => {
        console.log(`  ${i+1}. ${concept.term} (${Math.round(concept.confidence * 100)}%)`);
        console.log(`     ${concept.reasoning}`);
      });
      console.log('');
    }
    
    // 時間革命マーカー
    if (result.timeRevolutionMarkers.length > 0) {
      console.log('⚡ 時間革命マーカー:');
      result.timeRevolutionMarkers.forEach((marker, i) => {
        console.log(`  ${i+1}. "${marker.timeExpression}" - ${marker.efficiency}`);
        console.log(`     文脈: ${marker.context.substring(0, 50)}...`);
      });
      console.log('');
    }
    
    // 品質メトリクス詳細
    const metrics = result.qualityPrediction.realTimeMetrics;
    console.log('📊 リアルタイム品質メトリクス:');
    console.log(`  概念一貫性: ${metrics.conceptCoherence}% 🎯`);
    console.log(`  対話関連性: ${metrics.dialogueRelevance}% 🔗`);
    console.log(`  専門用語精度: ${metrics.terminologyAccuracy}% 📚`);
    console.log(`  抽出信頼性: ${metrics.extractionReliability}% ⚡`);
    console.log(`  意味的深度: ${metrics.semanticDepth}% 🧠`);
    console.log(`  文脈適合性: ${metrics.contextualFitness}% 🎭\n`);
    
    // 改善提案
    console.log('💡 改善提案:');
    result.qualityPrediction.improvementSuggestions.forEach((suggestion, i) => {
      console.log(`  ${i+1}. ${suggestion}`);
    });
    
    // ログ8との比較（参考として前回の結果を想定）
    console.log('\n\n📊 ログ特性比較 (ログ8 vs ログ9)');
    console.log('━'.repeat(60));
    console.log('ログ8 (Detroit+技術):');
    console.log('  - フィクション+技術混合');
    console.log('  - 深層概念: 5個 (ブルーブラッド等)');
    console.log('  - structural_dialogue');
    console.log('  - 革新度: 5/10');
    console.log('');
    console.log('ログ9 (学術討論):');
    console.log(`  - 学術的議論・論文相談`);
    console.log(`  - 深層概念: ${result.deepConcepts.length}個`);
    console.log(`  - ${result.dialogueTypeDetection}`);
    console.log(`  - 革新度: ${result.predictedInnovationLevel}/10`);
    
    // 学術性・一般化可能性評価
    console.log('\n🎓 学術性評価:');
    const academicConcepts = result.deepConcepts.filter(c => 
      c.reasoning.includes('学術') || 
      c.term.includes('学会') || 
      c.term.includes('論文') ||
      c.term.includes('研究')
    ).length;
    
    if (academicConcepts > 0) {
      console.log(`  ✅ 学術関連深層概念: ${academicConcepts}個`);
    } else {
      console.log('  ⚠️  学術関連深層概念: 検出されず');
    }
    
    // 局所性評価
    console.log('\n🌍 一般化可能性評価:');
    const structuralConcepts = result.deepConcepts.filter(c => 
      c.term.includes('構造的対話') || c.term.includes('GitHu') || c.term.includes('知識')
    ).length;
    
    if (structuralConcepts > result.deepConcepts.length * 0.6) {
      console.log('  🎯 構造的対話特化型 - 局所的だが深い専門性');
    } else {
      console.log('  🌐 一般的学術討論型 - 広い適用可能性');
    }
    
    console.log('\n✅ test-raw-log-9.txt 解析完了');
    
  } catch (error) {
    console.error('❌ 解析失敗:', error);
    process.exit(1);
  }
}

testLog9Analysis();