#!/usr/bin/env node

/**
 * リアルタイム品質評価システムのテスト
 */

import { IntelligentConceptExtractor } from './src/core/intelligent-concept-extractor';

async function testQualitySystem() {
  console.log('🔬 リアルタイム品質評価システムテスト開始\n');
  
  const extractor = new IntelligentConceptExtractor();
  
  try {
    await extractor.initialize();
    console.log('✅ 初期化完了\n');
    
    // テスト1: 高品質な構造的対話
    const highQualityLog = `
    構造的対話によって新しい概念を共同生成しました。
    レイヤード・プロンプティングという革新的手法を使って、従来の固定化された応答パターンを突破しました。
    セーブデータ理論により文脈継承の実証に成功し、構造的協働思考によって、AI-人間の知識創造プロセスを確立できました。
    `;
    
    console.log('📊 テスト1: 高品質構造的対話');
    console.log('━'.repeat(60));
    const result1 = await extractor.extractConcepts(highQualityLog);
    
    console.log(`🎯 対話タイプ: ${result1.dialogueTypeDetection}`);
    console.log(`⚡ 革新度: ${result1.predictedInnovationLevel}/10`);
    console.log(`🏆 品質グレード: ${result1.qualityPrediction.qualityGrade}`);
    console.log(`📈 総合品質: ${result1.qualityPrediction.overallQuality}%`);
    console.log(`🔧 ドメイン特化: ${result1.qualityPrediction.domainSpecificScore}%\n`);
    
    console.log('📊 リアルタイムメトリクス:');
    const metrics1 = result1.qualityPrediction.realTimeMetrics;
    console.log(`  概念一貫性: ${metrics1.conceptCoherence}%`);
    console.log(`  対話関連性: ${metrics1.dialogueRelevance}%`);
    console.log(`  専門用語精度: ${metrics1.terminologyAccuracy}%`);
    console.log(`  抽出信頼性: ${metrics1.extractionReliability}%`);
    console.log(`  意味的深度: ${metrics1.semanticDepth}%`);
    console.log(`  文脈適合性: ${metrics1.contextualFitness}%\n`);
    
    console.log('💡 改善提案:');
    result1.qualityPrediction.improvementSuggestions.forEach((suggestion, i) => {
      console.log(`  ${i+1}. ${suggestion}`);
    });
    
    // テスト2: 中品質な技術討論
    const mediumQualityLog = `
    AIシステムの開発について議論しました。
    データ処理の効率化と情報管理の改善を検討し、新しいアルゴリズムの導入可能性を探りました。
    技術的な課題解決に向けて、いくつかの手法を比較検討しています。
    `;
    
    console.log('\n\n📊 テスト2: 中品質技術討論');
    console.log('━'.repeat(60));
    const result2 = await extractor.extractConcepts(mediumQualityLog);
    
    console.log(`🎯 対話タイプ: ${result2.dialogueTypeDetection}`);
    console.log(`⚡ 革新度: ${result2.predictedInnovationLevel}/10`);
    console.log(`🏆 品質グレード: ${result2.qualityPrediction.qualityGrade}`);
    console.log(`📈 総合品質: ${result2.qualityPrediction.overallQuality}%`);
    console.log(`🔧 ドメイン特化: ${result2.qualityPrediction.domainSpecificScore}%\n`);
    
    console.log('📊 リアルタイムメトリクス:');
    const metrics2 = result2.qualityPrediction.realTimeMetrics;
    console.log(`  概念一貫性: ${metrics2.conceptCoherence}%`);
    console.log(`  対話関連性: ${metrics2.dialogueRelevance}%`);
    console.log(`  専門用語精度: ${metrics2.terminologyAccuracy}%`);
    console.log(`  抽出信頼性: ${metrics2.extractionReliability}%`);
    console.log(`  意味的深度: ${metrics2.semanticDepth}%`);
    console.log(`  文脈適合性: ${metrics2.contextualFitness}%\n`);
    
    console.log('💡 改善提案:');
    result2.qualityPrediction.improvementSuggestions.forEach((suggestion, i) => {
      console.log(`  ${i+1}. ${suggestion}`);
    });
    
    // テスト3: 低品質な一般対話
    const lowQualityLog = `
    今日は天気がいいですね。
    何か面白いことはありませんか。
    そうですね、いろいろなことがありますね。
    `;
    
    console.log('\n\n📊 テスト3: 低品質一般対話');
    console.log('━'.repeat(60));
    const result3 = await extractor.extractConcepts(lowQualityLog);
    
    console.log(`🎯 対話タイプ: ${result3.dialogueTypeDetection}`);
    console.log(`⚡ 革新度: ${result3.predictedInnovationLevel}/10`);
    console.log(`🏆 品質グレード: ${result3.qualityPrediction.qualityGrade}`);
    console.log(`📈 総合品質: ${result3.qualityPrediction.overallQuality}%`);
    console.log(`🔧 ドメイン特化: ${result3.qualityPrediction.domainSpecificScore}%\n`);
    
    console.log('📊 リアルタイムメトリクス:');
    const metrics3 = result3.qualityPrediction.realTimeMetrics;
    console.log(`  概念一貫性: ${metrics3.conceptCoherence}%`);
    console.log(`  対話関連性: ${metrics3.dialogueRelevance}%`);
    console.log(`  専門用語精度: ${metrics3.terminologyAccuracy}%`);
    console.log(`  抽出信頼性: ${metrics3.extractionReliability}%`);
    console.log(`  意味的深度: ${metrics3.semanticDepth}%`);
    console.log(`  文脈適合性: ${metrics3.contextualFitness}%\n`);
    
    console.log('💡 改善提案:');
    result3.qualityPrediction.improvementSuggestions.forEach((suggestion, i) => {
      console.log(`  ${i+1}. ${suggestion}`);
    });
    
    // 品質比較
    console.log('\n\n📊 品質比較結果');
    console.log('━'.repeat(60));
    console.log(`高品質構造的対話: ${result1.qualityPrediction.qualityGrade}グレード (${result1.qualityPrediction.overallQuality}%)`);
    console.log(`中品質技術討論  : ${result2.qualityPrediction.qualityGrade}グレード (${result2.qualityPrediction.overallQuality}%)`);
    console.log(`低品質一般対話  : ${result3.qualityPrediction.qualityGrade}グレード (${result3.qualityPrediction.overallQuality}%)`);
    
    console.log('\n✅ リアルタイム品質評価システムテスト完了');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

testQualitySystem();