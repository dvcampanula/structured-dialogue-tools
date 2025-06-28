#!/usr/bin/env node

/**
 * 統一ログ処理システムの精度検証
 */

import { readFileSync, existsSync } from 'fs';
import { UnifiedLogProcessor } from '../src/core/unified-log-processor.js';

interface TestCase {
  file: string;
  expectedCharLength: number;
  expectedDialogueType?: 'human_led' | 'ai_led' | 'collaborative' | 'free_form';
  expectedChunkCount?: number;
  expectedConcepts?: string[];
  description: string;
}

interface ValidationResult {
  testCase: string;
  passed: boolean;
  details: {
    actualCharLength: number;
    actualDialogueType: string;
    actualChunkCount: number;
    actualConcepts: string[];
    actualQualityScore?: number;
  };
  issues: string[];
}

class AccuracyValidator {
  private processor: UnifiedLogProcessor;
  
  constructor() {
    this.processor = new UnifiedLogProcessor();
  }

  /**
   * テストケース定義
   */
  private getTestCases(): TestCase[] {
    return [
      {
        file: 'test-raw-log.txt',
        expectedCharLength: 30459,
        expectedDialogueType: 'free_form',
        expectedChunkCount: 4,
        expectedConcepts: ['構造的対話', '構造的協働思考'], // 実際の主要テーマ
        description: '構造的協働思考ログ (30K)'
      },
      {
        file: 'test-raw-log-2.txt', 
        expectedCharLength: 69235,
        expectedDialogueType: 'free_form',
        expectedChunkCount: 8,
        expectedConcepts: ['構造的対話', '意識', '認知'], // 実際の主要テーマ
        description: '心理カウンセリングログ (69K)'
      },
      {
        file: 'test-raw-log-3.txt',
        expectedCharLength: 107362,
        expectedDialogueType: 'ai_led',
        expectedChunkCount: 11,
        expectedConcepts: ['構造的対話', '意識', 'AIとの協働'], // 実際の主要テーマ
        description: '数学哲学ログ (107K)'
      }
    ];
  }

  /**
   * 精度検証実行
   */
  async runValidation(): Promise<ValidationResult[]> {
    const testCases = this.getTestCases();
    const results: ValidationResult[] = [];

    console.log('🔍 統一ログ処理システム精度検証開始\n');

    for (const testCase of testCases) {
      console.log(`📋 検証中: ${testCase.description}`);
      
      const result = await this.validateTestCase(testCase);
      results.push(result);
      
      this.printResult(result);
      console.log('---\n');
    }

    return results;
  }

  /**
   * 個別テストケース検証
   */
  private async validateTestCase(testCase: TestCase): Promise<ValidationResult> {
    const issues: string[] = [];
    
    try {
      // ファイル読み込み
      const filePath = `${testCase.file}`;
      if (!existsSync(filePath)) {
        return {
          testCase: testCase.description,
          passed: false,
          details: {
            actualCharLength: 0,
            actualDialogueType: 'unknown',
            actualChunkCount: 0,
            actualConcepts: []
          },
          issues: [`ファイルが見つかりません: ${filePath}`]
        };
      }

      const rawLog = readFileSync(filePath, 'utf-8');
      
      // 統一処理実行
      const startTime = Date.now();
      const result = await this.processor.processUnifiedLog(rawLog);
      const processingTime = Date.now() - startTime;

      // 文字数検証
      if (Math.abs(rawLog.length - testCase.expectedCharLength) > 100) {
        issues.push(`文字数不一致: 期待=${testCase.expectedCharLength}, 実際=${rawLog.length}`);
      }

      // 対話形式検証
      if (testCase.expectedDialogueType && result.header.dialogueType !== testCase.expectedDialogueType) {
        issues.push(`対話形式不一致: 期待=${testCase.expectedDialogueType}, 実際=${result.header.dialogueType}`);
      }

      // チャンク数検証
      if (testCase.expectedChunkCount && Math.abs(result.chunks.length - testCase.expectedChunkCount) > 1) {
        issues.push(`チャンク数不一致: 期待=${testCase.expectedChunkCount}, 実際=${result.chunks.length}`);
      }

      // 概念検出検証
      if (testCase.expectedConcepts) {
        const missedConcepts = testCase.expectedConcepts.filter(concept => 
          !result.header.mainConcepts.some(detected => detected.includes(concept))
        );
        if (missedConcepts.length > 0) {
          issues.push(`概念未検出: ${missedConcepts.join(', ')}`);
        }
      }

      // 処理時間検証 (2秒以上は問題)
      if (processingTime > 2000) {
        issues.push(`処理時間過大: ${processingTime}ms`);
      }

      // 品質スコア検証
      const qualityScore = result.qualityMetrics?.overallScore;
      if (qualityScore !== undefined && qualityScore < 50) {
        issues.push(`品質スコア低下: ${qualityScore.toFixed(1)}/100`);
      }

      return {
        testCase: testCase.description,
        passed: issues.length === 0,
        details: {
          actualCharLength: rawLog.length,
          actualDialogueType: result.header.dialogueType,
          actualChunkCount: result.chunks.length,
          actualConcepts: result.header.mainConcepts,
          actualQualityScore: qualityScore
        },
        issues
      };

    } catch (error) {
      return {
        testCase: testCase.description,
        passed: false,
        details: {
          actualCharLength: 0,
          actualDialogueType: 'error',
          actualChunkCount: 0,
          actualConcepts: []
        },
        issues: [`処理エラー: ${error instanceof Error ? error.message : '不明なエラー'}`]
      };
    }
  }

  /**
   * 結果表示
   */
  private printResult(result: ValidationResult): void {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.testCase}`);
    
    if (result.details.actualQualityScore !== undefined) {
      const scoreColor = result.details.actualQualityScore >= 85 ? '🟢' : 
                        result.details.actualQualityScore >= 70 ? '🟡' : '🔴';
      console.log(`📊 品質スコア: ${scoreColor} ${result.details.actualQualityScore.toFixed(1)}/100`);
    }
    
    console.log(`📏 文字数: ${result.details.actualCharLength.toLocaleString()}`);
    console.log(`🎭 対話形式: ${result.details.actualDialogueType}`);
    console.log(`📦 チャンク数: ${result.details.actualChunkCount}`);
    console.log(`🔑 主要概念: ${result.details.actualConcepts.slice(0, 3).join(', ')}`);
    
    if (result.issues.length > 0) {
      console.log('⚠️  課題:');
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    }
  }

  /**
   * 全体統計表示
   */
  printSummary(results: ValidationResult[]): void {
    const passCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = (passCount / totalCount * 100).toFixed(1);

    console.log('📊 検証結果サマリー');
    console.log('='.repeat(50));
    console.log(`✅ 成功: ${passCount}/${totalCount} (${passRate}%)`);
    
    const failedCases = results.filter(r => !r.passed);
    if (failedCases.length > 0) {
      console.log(`❌ 失敗: ${failedCases.length}件`);
      failedCases.forEach(result => {
        console.log(`   - ${result.testCase}: ${result.issues.join(', ')}`);
      });
    }

    // 品質スコア統計
    const qualityScores = results
      .map(r => r.details.actualQualityScore)
      .filter((score): score is number => score !== undefined);
    
    if (qualityScores.length > 0) {
      const avgScore = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      const minScore = Math.min(...qualityScores);
      const maxScore = Math.max(...qualityScores);
      
      console.log(`\n📈 品質スコア統計:`);
      console.log(`   平均: ${avgScore.toFixed(1)}/100`);
      console.log(`   範囲: ${minScore.toFixed(1)} - ${maxScore.toFixed(1)}`);
    }
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new AccuracyValidator();
  
  validator.runValidation()
    .then(results => {
      validator.printSummary(results);
      
      const allPassed = results.every(r => r.passed);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 検証実行エラー:', error);
      process.exit(1);
    });
}