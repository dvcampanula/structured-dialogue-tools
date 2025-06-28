#!/usr/bin/env node

/**
 * 複数生ログの一括検証・分析システム
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { UnifiedLogProcessor } from '../src/core/unified-log-processor.js';

interface LogAnalysis {
  filename: string;
  size: number;
  dialogueType: string;
  chunkCount: number;
  concepts: string[];
  qualityScore: number;
  processingTime: number;
  title: string;
  scope: string;
}

interface BatchResult {
  analyses: LogAnalysis[];
  summary: {
    totalLogs: number;
    avgQualityScore: number;
    avgProcessingTime: number;
    dialogueTypeDistribution: Record<string, number>;
    sizeDistribution: { small: number; medium: number; large: number };
  };
}

class BatchValidator {
  private processor: UnifiedLogProcessor;
  
  constructor() {
    this.processor = new UnifiedLogProcessor();
  }

  /**
   * testsフォルダの全生ログを自動検出・分析
   */
  async runBatchValidation(): Promise<BatchResult> {
    console.log('🔍 生ログ一括検証開始\n');

    // test-raw-log*.txt ファイルを自動検出
    const logFiles = readdirSync('.')
      .filter(file => file.match(/^test-raw-log.*\.txt$/))
      .sort();

    if (logFiles.length === 0) {
      console.log('❌ 検証対象のログファイルが見つかりません');
      return {
        analyses: [],
        summary: {
          totalLogs: 0,
          avgQualityScore: 0,
          avgProcessingTime: 0,
          dialogueTypeDistribution: {},
          sizeDistribution: { small: 0, medium: 0, large: 0 }
        }
      };
    }

    console.log(`📋 検出ファイル: ${logFiles.length}件`);
    logFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    const analyses: LogAnalysis[] = [];

    // 各ログファイルを処理
    for (const file of logFiles) {
      console.log(`📄 処理中: ${file}`);
      
      try {
        const analysis = await this.analyzeLog(file);
        analyses.push(analysis);
        this.printAnalysis(analysis);
      } catch (error) {
        console.log(`❌ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
      
      console.log('---\n');
    }

    // 全体サマリー生成
    const summary = this.generateSummary(analyses);
    
    return { analyses, summary };
  }

  /**
   * 個別ログファイルの分析
   */
  private async analyzeLog(filename: string): Promise<LogAnalysis> {
    const rawLog = readFileSync(filename, 'utf-8');
    
    const startTime = Date.now();
    const result = await this.processor.processUnifiedLog(rawLog);
    const processingTime = Date.now() - startTime;

    return {
      filename,
      size: rawLog.length,
      dialogueType: result.header.dialogueType,
      chunkCount: result.chunks.length,
      concepts: result.header.mainConcepts,
      qualityScore: result.qualityMetrics?.overallScore || 0,
      processingTime,
      title: result.header.title,
      scope: result.header.discussionScope
    };
  }

  /**
   * 分析結果の表示
   */
  private printAnalysis(analysis: LogAnalysis): void {
    const sizeCategory = this.getSizeCategory(analysis.size);
    const qualityColor = this.getQualityColor(analysis.qualityScore);
    const dialogueTypeIcon = this.getDialogueTypeIcon(analysis.dialogueType);
    const isAIvsAI = analysis.filename.includes('ai') || analysis.title.includes('AI');
    
    console.log(`📊 ${analysis.filename} ${isAIvsAI ? '🤖×🤖' : ''}`);
    console.log(`   📏 サイズ: ${analysis.size.toLocaleString()}文字 (${sizeCategory})`);
    console.log(`   ${dialogueTypeIcon} 対話形式: ${analysis.dialogueType}`);
    console.log(`   📦 チャンク数: ${analysis.chunkCount}個`);
    console.log(`   ${qualityColor} 品質スコア: ${analysis.qualityScore.toFixed(1)}/100`);
    console.log(`   ⏱️  処理時間: ${analysis.processingTime}ms`);
    console.log(`   📝 タイトル: ${analysis.title}`);
    console.log(`   🔑 主要概念: ${analysis.concepts.slice(0, 3).join(', ')}`);
    
    if (isAIvsAI) {
      console.log(`   🔬 AI×AI特性: 概念密度・論理性・専門性を評価`);
    }
  }

  /**
   * 全体サマリー生成
   */
  private generateSummary(analyses: LogAnalysis[]): BatchResult['summary'] {
    if (analyses.length === 0) {
      return {
        totalLogs: 0,
        avgQualityScore: 0,
        avgProcessingTime: 0,
        dialogueTypeDistribution: {},
        sizeDistribution: { small: 0, medium: 0, large: 0 }
      };
    }

    const avgQualityScore = analyses.reduce((sum, a) => sum + a.qualityScore, 0) / analyses.length;
    const avgProcessingTime = analyses.reduce((sum, a) => sum + a.processingTime, 0) / analyses.length;

    const dialogueTypeDistribution: Record<string, number> = {};
    analyses.forEach(a => {
      dialogueTypeDistribution[a.dialogueType] = (dialogueTypeDistribution[a.dialogueType] || 0) + 1;
    });

    const sizeDistribution = analyses.reduce(
      (dist, a) => {
        const category = this.getSizeCategory(a.size);
        if (category === '小規模') dist.small++;
        else if (category === '中規模') dist.medium++;
        else dist.large++;
        return dist;
      },
      { small: 0, medium: 0, large: 0 }
    );

    return {
      totalLogs: analyses.length,
      avgQualityScore,
      avgProcessingTime,
      dialogueTypeDistribution,
      sizeDistribution
    };
  }

  /**
   * 全体統計の表示
   */
  printSummary(result: BatchResult): void {
    const { analyses, summary } = result;
    
    console.log('📊 一括検証結果サマリー');
    console.log('='.repeat(60));
    console.log(`📁 総ログ数: ${summary.totalLogs}件`);
    console.log(`📈 平均品質スコア: ${summary.avgQualityScore.toFixed(1)}/100`);
    console.log(`⏱️  平均処理時間: ${summary.avgProcessingTime.toFixed(1)}ms`);

    console.log('\n🎭 対話形式分布:');
    Object.entries(summary.dialogueTypeDistribution).forEach(([type, count]) => {
      const percentage = (count / summary.totalLogs * 100).toFixed(1);
      console.log(`   ${type}: ${count}件 (${percentage}%)`);
    });

    console.log('\n📏 サイズ分布:');
    console.log(`   小規模 (0-20K): ${summary.sizeDistribution.small}件`);
    console.log(`   中規模 (20-80K): ${summary.sizeDistribution.medium}件`);
    console.log(`   大規模 (80K+): ${summary.sizeDistribution.large}件`);

    console.log('\n🏆 品質ランキング (TOP5):');
    analyses
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 5)
      .forEach((analysis, index) => {
        const medal = ['🥇', '🥈', '🥉', '🏅', '🏅'][index];
        console.log(`   ${medal} ${analysis.filename}: ${analysis.qualityScore.toFixed(1)}/100`);
      });

    console.log('\n⚠️  要改善項目:');
    const lowQualityLogs = analyses.filter(a => a.qualityScore < 70);
    if (lowQualityLogs.length > 0) {
      console.log(`   品質スコア70未満: ${lowQualityLogs.length}件`);
      lowQualityLogs.forEach(log => {
        console.log(`     - ${log.filename}: ${log.qualityScore.toFixed(1)}/100`);
      });
    }

    const slowLogs = analyses.filter(a => a.processingTime > 1000);
    if (slowLogs.length > 0) {
      console.log(`   処理時間1秒超: ${slowLogs.length}件`);
      slowLogs.forEach(log => {
        console.log(`     - ${log.filename}: ${log.processingTime}ms`);
      });
    }

    if (lowQualityLogs.length === 0 && slowLogs.length === 0) {
      console.log('   すべてのログが良好な品質です！✨');
    }
  }

  /**
   * サイズカテゴリの判定
   */
  private getSizeCategory(size: number): string {
    if (size < 20000) return '小規模';
    if (size < 80000) return '中規模';
    return '大規模';
  }

  /**
   * 品質スコアの色分け
   */
  private getQualityColor(score: number): string {
    if (score >= 85) return '🟢';
    if (score >= 70) return '🟡';
    return '🔴';
  }

  /**
   * 対話形式のアイコン
   */
  private getDialogueTypeIcon(type: string): string {
    switch (type) {
      case 'human_led': return '👤';
      case 'ai_led': return '🤖';
      case 'collaborative': return '🤝';
      case 'ai_collaborative': return '🤖🤝🤖';
      case 'free_form': return '💭';
      default: return '❓';
    }
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new BatchValidator();
  
  validator.runBatchValidation()
    .then(result => {
      validator.printSummary(result);
      
      const avgScore = result.summary.avgQualityScore;
      console.log(`\n🎯 総合評価: ${avgScore >= 85 ? '優秀' : avgScore >= 70 ? '良好' : '要改善'}`);
      
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 一括検証エラー:', error);
      process.exit(1);
    });
}