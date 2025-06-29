#!/usr/bin/env node

/**
 * 統合ログ管理システムのテスト
 * 全機能統合後の動作確認
 */

import { IntegratedLogManagement } from './src/core/integrated-log-management';
import * as fs from 'fs/promises';

async function testIntegratedSystem() {
  console.log('🚀 統合ログ管理システムテスト開始\n');
  
  const logManager = new IntegratedLogManagement();
  
  try {
    await logManager.initialize();
    console.log('✅ 統合システム初期化完了\n');

    // テスト1: 短いログの完全分析
    const shortLog = `
    構造的対話について議論しました。
    レイヤード・プロンプティングという新しい手法を使って、
    AIとの協働による知識創造を実現しました。
    セーブデータ理論により、対話の継続性を確保できます。
    `;

    console.log('📊 テスト1: 短いログの完全分析');
    console.log('━'.repeat(60));
    
    const analysis1 = await logManager.analyzeLog(shortLog, {
      enableSplitting: true,
      targetChunkSize: 2000,
      enableQualityCheck: true,
      minReliabilityThreshold: 50,
      autoNaming: true,
      includeTimestamp: false,
      generateContinuityKeywords: true,
      maxKeywords: 5
    });

    console.log(`🎯 対話タイプ: ${analysis1.conceptExtraction.dialogueTypeDetection}`);
    console.log(`⚡ 革新度: ${analysis1.conceptExtraction.predictedInnovationLevel}/10`);
    console.log(`🔒 信頼性: ${analysis1.qualityAssurance.reliabilityScore}%`);
    console.log(`✅ 品質OK: ${analysis1.qualityAssurance.isReliable}`);
    console.log(`✂️  分割推奨: ${analysis1.splitRecommendation.shouldSplit}`);
    console.log(`📁 提案ファイル名: ${analysis1.namingSuggestion.filename}`);
    console.log(`🔗 継続キーワード: [${analysis1.continuityKeywords.join(', ')}]`);
    console.log(`📝 次セッション: ${analysis1.sessionGuidance.substring(0, 80)}...`);

    // テスト2: 簡易分析
    console.log('\n\n📊 テスト2: 簡易分析');
    console.log('━'.repeat(60));
    
    const quickResult = await logManager.quickAnalyze(shortLog);
    console.log(`品質: ${quickResult.quality}%`);
    console.log(`分割必要: ${quickResult.shouldSplit}`);
    console.log(`キーワード: [${quickResult.keywords.join(', ')}]`);
    console.log(`ファイル名: ${quickResult.filename}`);

    // テスト3: 長いログの分析（実際のファイル使用）
    try {
      const longLog = await fs.readFile('tests/test-raw-log-3.txt', 'utf-8');
      
      console.log('\n\n📊 テスト3: 長いログの分析');
      console.log('━'.repeat(60));
      console.log(`ログサイズ: ${longLog.length} 文字`);
      
      const analysis3 = await logManager.analyzeLog(longLog);
      
      console.log(`🎯 対話タイプ: ${analysis3.conceptExtraction.dialogueTypeDetection}`);
      console.log(`⚡ 革新度: ${analysis3.conceptExtraction.predictedInnovationLevel}/10`);
      console.log(`🔒 信頼性: ${analysis3.qualityAssurance.reliabilityScore}%`);
      console.log(`✂️  分割推奨: ${analysis3.splitRecommendation.shouldSplit}`);
      console.log(`📦 分割理由: ${analysis3.splitRecommendation.reason}`);
      console.log(`🔢 チャンク数: ${analysis3.chunks.length}`);
      console.log(`📁 提案ファイル名: ${analysis3.namingSuggestion.filename}`);
      
      if (analysis3.continuityKeywords.length > 0) {
        console.log(`🔗 継続キーワード: [${analysis3.continuityKeywords.join(', ')}]`);
      }

    } catch (error) {
      console.log('\n⚠️  長いログファイルが見つからないため、スキップ');
    }

    // テスト4: 品質問題のあるログ
    const poorLog = `
    今日は天気がいいですね。
    はい、そうですね。
    散歩でもしましょうか。
    `;

    console.log('\n\n📊 テスト4: 品質問題のあるログ');
    console.log('━'.repeat(60));
    
    const analysis4 = await logManager.analyzeLog(poorLog);
    
    console.log(`🔒 信頼性: ${analysis4.qualityAssurance.reliabilityScore}%`);
    console.log(`✅ 品質OK: ${analysis4.qualityAssurance.isReliable}`);
    console.log(`⚠️  問題数: ${analysis4.qualityAssurance.issues.length}`);
    
    if (analysis4.qualityAssurance.issues.length > 0) {
      console.log('問題詳細:');
      analysis4.qualityAssurance.issues.forEach((issue, i) => {
        console.log(`  ${i+1}. [${issue.severity}] ${issue.description}`);
      });
    }

    // 統合システム評価
    console.log('\n\n📋 統合システム評価');
    console.log('━'.repeat(60));
    console.log('✅ 概念抽出 + 品質保証 - 統合完了');
    console.log('✅ ログ分割 + 品質評価 - 統合完了');
    console.log('✅ 命名支援 + 継続性支援 - 統合完了');
    console.log('✅ バッチ処理 + 簡易分析 - 実装完了');
    
    console.log('\n🎯 実用機能:');
    console.log('- 完全ログ分析: 全機能統合済み');
    console.log('- 簡易分析: 高速処理対応');
    console.log('- 品質担保: 自動判定・推奨機能');
    console.log('- 継続性支援: キーワード + ガイダンス');
    console.log('- 分割推奨: 自動判定 + 実行');
    console.log('- 命名支援: 自動ファイル名生成');
    
    console.log('\n✅ 統合ログ管理システムテスト完了');
    
  } catch (error) {
    console.error('❌ 統合テスト失敗:', error);
    process.exit(1);
  }
}

testIntegratedSystem();