#!/usr/bin/env node

/**
 * 単一ログファイル解析スクリプト
 */

import * as fs from 'fs/promises';
import { IntelligentConceptExtractor } from '../src/core/intelligent-concept-extractor.js';
import { QualityAssuranceSystem } from '../src/core/quality-assurance-system.js';

async function analyzeSingleLog(filePath: string) {
  console.log(`🔬 ログファイル解析: ${filePath}`);
  console.log('='.repeat(60));
  
  try {
    // ファイル読み込み
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`📄 ファイルサイズ: ${Math.round(content.length/1024)}KB (${content.length}文字)`);
    
    // IntelligentConceptExtractor初期化・実行
    const extractor = new IntelligentConceptExtractor();
    await extractor.initialize();
    
    console.log('\n🧠 IntelligentConceptExtractor解析中...');
    const result = await extractor.extractConcepts(content);
    
    console.log('\n📊 解析結果:');
    console.log('='.repeat(40));
    console.log(`🎯 革新度: ${result.predictedInnovationLevel}/10`);
    console.log(`🔍 対話タイプ: ${result.dialogueTypeDetection}`);
    console.log(`💯 信頼度: ${result.confidence}%`);
    
    console.log('\n🌟 深層概念 (TOP 5):');
    result.deepConcepts.slice(0, 5).forEach((concept, i) => {
      console.log(`  ${i+1}. ${concept.term} (重要度: ${concept.importance})`);
    });
    
    console.log('\n⚡ 時間革命マーカー:');
    if (result.timeRevolutionMarkers.length > 0) {
      result.timeRevolutionMarkers.forEach((marker, i) => {
        console.log(`  ${i+1}. ${marker}`);
      });
    } else {
      console.log('  なし');
    }
    
    console.log('\n📈 品質予測:');
    console.log(`  全体品質: ${result.qualityPrediction.overallQuality}%`);
    console.log(`  概念密度: ${result.qualityPrediction.conceptDensity}%`);
    console.log(`  突破確率: ${result.qualityPrediction.breakthroughPotential}%`);
    
    // QualityAssuranceSystem解析
    console.log('\n🛡️ 品質保証システム解析中...');
    const qaSystem = new QualityAssuranceSystem(extractor);
    await qaSystem.initialize();
    
    const qaResult = await qaSystem.extractWithQualityAssurance(content);
    
    console.log('\n📋 品質保証結果:');
    console.log('='.repeat(40));
    console.log(`🎯 信頼性スコア: ${qaResult.qualityReport.reliabilityScore}%`);
    console.log(`✅ 信頼性判定: ${qaResult.qualityReport.isReliable ? '信頼できる' : '要検証'}`);
    
    console.log('\n📊 リアルタイム品質メトリクス:');
    const metrics = qaResult.qualityReport.realTimeMetrics;
    console.log(`  概念一貫性: ${metrics.conceptCoherence.toFixed(1)}%`);
    console.log(`  対話関連性: ${metrics.dialogueRelevance.toFixed(1)}%`);
    console.log(`  専門用語精度: ${metrics.terminologyAccuracy.toFixed(1)}%`);
    console.log(`  抽出信頼性: ${metrics.extractionReliability.toFixed(1)}%`);
    console.log(`  意味的深度: ${metrics.semanticDepth.toFixed(1)}%`);
    console.log(`  文脈適合性: ${metrics.contextualFitness.toFixed(1)}%`);
    
    console.log('\n💡 推奨事項:');
    qaResult.qualityReport.recommendations.forEach((rec, i) => {
      console.log(`  ${i+1}. ${rec}`);
    });
    
  } catch (error) {
    console.error('❌ 解析エラー:', error);
  }
}

// コマンドライン引数からファイルパス取得
const filePath = process.argv[2];
if (!filePath) {
  console.error('使用方法: node analyze-single-log.ts <ファイルパス>');
  process.exit(1);
}

analyzeSingleLog(filePath);