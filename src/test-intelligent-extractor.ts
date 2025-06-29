#!/usr/bin/env node

/**
 * IntelligentConceptExtractor テストスクリプト
 * kuromoji形態素解析統合テスト
 */

import { IntelligentConceptExtractor } from './core/intelligent-concept-extractor';

async function testExtractor() {
  console.log('🚀 IntelligentConceptExtractor v2.0 テスト開始\n');
  
  const extractor = new IntelligentConceptExtractor();
  
  try {
    // 初期化（学習データ + 形態素解析器）
    console.log('📚 初期化中...');
    await extractor.initialize();
    console.log('✅ 初期化完了\n');
    
    // テスト用ログ（構造的対話）
    const testLog = `
    構造的対話によって新しい概念を共同生成しました。
    構造ハックの手法を使って、従来の固定化された応答パターンを突破しました。
    レイヤード・プロンプティングという新しい概念が自然に発生し、
    セーブデータ理論により文脈継承の実証に成功しました。
    構造的協働思考によって、AI-人間の知識創造プロセスを確立できました。
    `;
    
    console.log('🔬 概念抽出テスト実行中...');
    const result = await extractor.extractConcepts(testLog);
    
    console.log('\n📊 === 抽出結果 ===');
    console.log(`⚡ 処理時間: ${result.processingTime}ms`);
    console.log(`🎯 革新度予測: ${result.predictedInnovationLevel}/10`);
    console.log(`📈 社会的インパクト: ${result.predictedSocialImpact}`);
    console.log(`🔍 対話タイプ: ${result.dialogueTypeDetection}`);
    console.log(`✨ 信頼度: ${result.confidence}%`);
    console.log(`💡 突破確率: ${result.breakthroughProbability}%\n`);
    
    console.log('🌸 表面概念 (Top 5):');
    result.surfaceConcepts.slice(0, 5).forEach((concept, i) => {
      console.log(`  ${i+1}. ${concept.term} (信頼度: ${Math.round(concept.confidence * 100)}%)`);
      console.log(`     理由: ${concept.reasoning}`);
    });
    
    console.log('\n🧠 深層概念 (Top 5):');
    result.deepConcepts.slice(0, 5).forEach((concept, i) => {
      console.log(`  ${i+1}. ${concept.term} (信頼度: ${Math.round(concept.confidence * 100)}%)`);
      console.log(`     理由: ${concept.reasoning}`);
    });
    
    console.log('\n⚡ 時間革命マーカー:');
    result.timeRevolutionMarkers.forEach((marker, i) => {
      console.log(`  ${i+1}. "${marker.timeExpression}" - ${marker.efficiency}`);
      console.log(`     文脈: ${marker.context.substring(0, 50)}...`);
    });
    
    console.log('\n🔗 類似パターン:');
    result.similarPatterns.slice(0, 3).forEach((pattern, i) => {
      console.log(`  ${i+1}. ${pattern}`);
    });
    
    console.log('\n📊 品質予測:');
    console.log(`  概念密度: ${result.qualityPrediction.conceptDensity}%`);
    console.log(`  革新ポテンシャル: ${result.qualityPrediction.innovationPotential}%`);
    console.log(`  構造的対話スコア: ${result.qualityPrediction.structuralDialogueScore}%`);
    console.log(`  総合品質: ${result.qualityPrediction.overallQuality}%`);
    
    console.log('\n✅ IntelligentConceptExtractor v2.0 テスト完了！');
    console.log('🎉 75概念学習データベース + kuromoji形態素解析統合成功');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

// 実行
testExtractor();

export { testExtractor };