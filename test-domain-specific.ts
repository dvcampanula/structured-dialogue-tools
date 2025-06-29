#!/usr/bin/env node

/**
 * ドメイン特化テスト - 異なるタイプの対話での精度検証
 */

import { IntelligentConceptExtractor } from './src/core/intelligent-concept-extractor';
import * as fs from 'fs/promises';

async function testDomainSpecific() {
  console.log('🔬 ドメイン特化精度テスト開始\n');
  
  const extractor = new IntelligentConceptExtractor();
  
  try {
    await extractor.initialize();
    console.log('✅ 初期化完了\n');
    
    // テストケース1: 構造的協働思考AI（教育系）
    const educationLog = `
    ユーザーの発言や思考から、表面的な内容だけでなく、その意図、隠れた前提、論理構造、そして感情や文脈を総合的に抽出し、明確に言語化・整理します。
    抽出した構造に基づき、思考の穴や飛躍、異なる視点などを提示し、ユーザー様の内省や思考の深化を促します。
    複雑な情報、複数の要素間の関係性や階層構造を抽出し、視覚的あるいは論理的に整理する能力。
    `;
    
    console.log('📚 テストケース1: 教育・学習支援系');
    console.log('━'.repeat(50));
    const result1 = await extractor.extractConcepts(educationLog);
    
    console.log(`革新度: ${result1.predictedInnovationLevel}/10`);
    console.log(`対話タイプ: ${result1.dialogueTypeDetection}`);
    console.log(`信頼度: ${result1.confidence}%\n`);
    
    console.log('深層概念 (Top 3):');
    result1.deepConcepts.slice(0, 3).forEach((concept, i) => {
      console.log(`  ${i+1}. ${concept.term} (${Math.round(concept.confidence * 100)}%)`);
    });
    
    // テストケース2: GitHub技術説明（開発系）
    const techLog = `
    このプロジェクトは、AI と人間が再帰的で文脈を保持した対話を通じて共同でアイデアを発展させるための相互作用手法です。
    文脈保持型の対話 - 従来の単発的なプロンプト工学とは異なり、対話履歴全体を資源として扱い、進化する目標や文脈を時間をかけて追跡する
    思考のパートナーとしてのAI - AIを単なるツールではなく「思考の仲間」として位置づけ、洞察を引き出し、再現可能な知識創造を可能にする
    `;
    
    console.log('\n\n💻 テストケース2: 技術開発・GitHub系');
    console.log('━'.repeat(50));
    const result2 = await extractor.extractConcepts(techLog);
    
    console.log(`革新度: ${result2.predictedInnovationLevel}/10`);
    console.log(`対話タイプ: ${result2.dialogueTypeDetection}`);
    console.log(`信頼度: ${result2.confidence}%\n`);
    
    console.log('深層概念 (Top 3):');
    result2.deepConcepts.slice(0, 3).forEach((concept, i) => {
      console.log(`  ${i+1}. ${concept.term} (${Math.round(concept.confidence * 100)}%)`);
    });
    
    // テストケース3: 数学的議論（学術系）
    const mathLog = `
    コラッツ予想からP≠NP予想という思考の流れを受けて、次元差による情報圧縮構造という新しい視点を導入しました。
    計算複雑性理論の根本に関わる深い洞察が得られ、数学的証明の構造について新たな理解が生まれました。
    この発見は数学界に革命的な影響を与える可能性があります。
    `;
    
    console.log('\n\n🔬 テストケース3: 数学・学術系');
    console.log('━'.repeat(50));
    const result3 = await extractor.extractConcepts(mathLog);
    
    console.log(`革新度: ${result3.predictedInnovationLevel}/10`);
    console.log(`対話タイプ: ${result3.dialogueTypeDetection}`);
    console.log(`信頼度: ${result3.confidence}%\n`);
    
    console.log('深層概念 (Top 3):');
    result3.deepConcepts.slice(0, 3).forEach((concept, i) => {
      console.log(`  ${i+1}. ${concept.term} (${Math.round(concept.confidence * 100)}%)`);
    });
    
    // 分析結果
    console.log('\n\n📊 ドメイン別分析結果');
    console.log('━'.repeat(50));
    console.log(`教育系 → 革新度: ${result1.predictedInnovationLevel}/10, 概念数: ${result1.deepConcepts.length}`);
    console.log(`技術系 → 革新度: ${result2.predictedInnovationLevel}/10, 概念数: ${result2.deepConcepts.length}`);
    console.log(`学術系 → 革新度: ${result3.predictedInnovationLevel}/10, 概念数: ${result3.deepConcepts.length}`);
    
    // 課題特定
    console.log('\n\n🎯 課題特定');
    console.log('━'.repeat(50));
    
    if (result1.predictedInnovationLevel === result2.predictedInnovationLevel && 
        result2.predictedInnovationLevel === result3.predictedInnovationLevel) {
      console.log('⚠️  ドメイン間の革新度区別が不十分');
    }
    
    const avgInnovation = (result1.predictedInnovationLevel + result2.predictedInnovationLevel + result3.predictedInnovationLevel) / 3;
    if (avgInnovation > 7) {
      console.log('⚠️  革新度判定が全体的に高すぎる可能性');
    }
    
    if (result1.dialogueTypeDetection === result2.dialogueTypeDetection && 
        result2.dialogueTypeDetection === result3.dialogueTypeDetection) {
      console.log('⚠️  対話タイプ検出の精度向上が必要');
    }
    
    console.log('\n✅ ドメイン特化テスト完了');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

testDomainSpecific();