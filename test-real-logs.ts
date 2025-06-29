#!/usr/bin/env node

/**
 * 実際のログファイルでの最終テスト
 */

import { IntelligentConceptExtractor } from './src/core/intelligent-concept-extractor';
import * as fs from 'fs/promises';

async function testRealLogs() {
  console.log('🔬 実際のログファイルテスト開始\n');
  
  const extractor = new IntelligentConceptExtractor();
  
  try {
    await extractor.initialize();
    console.log('✅ 初期化完了\n');
    
    // テスト対象ログファイル
    const testFiles = [
      'tests/test-raw-log-1.txt',
      'tests/test-raw-log-3.txt', 
      'tests/test-ai-x-ai-sample.txt'
    ];
    
    for (const filePath of testFiles) {
      try {
        const logContent = await fs.readFile(filePath, 'utf-8');
        const shortContent = logContent.substring(0, 2000); // 最初の2000文字のみ
        
        console.log(`📄 テスト: ${filePath}`);
        console.log('━'.repeat(60));
        
        const result = await extractor.extractConcepts(shortContent);
        
        console.log(`🎯 対話タイプ: ${result.dialogueTypeDetection}`);
        console.log(`⚡ 革新度: ${result.predictedInnovationLevel}/10`);
        console.log(`✨ 信頼度: ${result.confidence}%`);
        console.log(`🔍 深層概念数: ${result.deepConcepts.length}`);
        
        if (result.deepConcepts.length > 0) {
          console.log('🧠 深層概念 (Top 3):');
          result.deepConcepts.slice(0, 3).forEach((concept, i) => {
            console.log(`  ${i+1}. ${concept.term} (${Math.round(concept.confidence * 100)}%)`);
          });
        }
        
        console.log('\n');
        
      } catch (fileError) {
        console.log(`⚠️  ${filePath}: ファイル読み込みエラー\n`);
      }
    }
    
    console.log('✅ 実際のログテスト完了');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

testRealLogs();