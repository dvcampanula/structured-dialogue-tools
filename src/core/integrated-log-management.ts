#!/usr/bin/env node

/**
 * 統合ログ管理システム
 * 既存の全システムを統合し、完全なログ管理ワークフローを提供
 */

import { RawLogSplitter, type LogChunk } from './raw-log-splitter.js';
import { QualityAssessment, type QualityMetrics } from './quality-metrics.js';
import { UnifiedLogProcessor, type UnifiedLogStructure } from './unified-log-processor.js';
import { NamingHelper, type NamingSuggestion } from './naming-helper.js';
import { QualityAssuranceSystem, type QualityAssuranceReport } from './quality-assurance-system.js';
import { IntelligentConceptExtractor, type IntelligentExtractionResult } from './intelligent-concept-extractor.js';

export interface IntegratedLogAnalysis {
  // 基本分析
  conceptExtraction: IntelligentExtractionResult;
  qualityAssurance: QualityAssuranceReport;
  
  // ログ処理
  logStructure: UnifiedLogStructure;
  chunks: LogChunk[];
  
  // メタデータ
  namingSuggestion: NamingSuggestion;
  legacyQualityMetrics: QualityMetrics;
  
  // 実用機能
  continuityKeywords: string[];
  sessionGuidance: string;
  splitRecommendation: SplitRecommendation;
}

export interface SplitRecommendation {
  shouldSplit: boolean;
  reason: string;
  suggestedSplitPoints: number[];
  chunkSizes: number[];
}

export interface LogManagementOptions {
  // 分割オプション
  enableSplitting: boolean;
  targetChunkSize: number;
  
  // 品質オプション
  enableQualityCheck: boolean;
  minReliabilityThreshold: number;
  
  // 命名オプション
  autoNaming: boolean;
  includeTimestamp: boolean;
  
  // 継続性オプション
  generateContinuityKeywords: boolean;
  maxKeywords: number;
}

/**
 * 統合ログ管理システム
 */
export class IntegratedLogManagement {
  private splitter: RawLogSplitter;
  private qualityAssessment: QualityAssessment;
  private unifiedProcessor: UnifiedLogProcessor;
  private namingHelper: NamingHelper;
  private qualityAssurance: QualityAssuranceSystem;
  private conceptExtractor: IntelligentConceptExtractor;

  constructor(sharedConceptExtractor?: IntelligentConceptExtractor) {
    this.splitter = new RawLogSplitter();
    this.qualityAssessment = new QualityAssessment();
    this.conceptExtractor = sharedConceptExtractor || new IntelligentConceptExtractor();
    this.unifiedProcessor = new UnifiedLogProcessor(this.conceptExtractor);
    this.namingHelper = new NamingHelper();
    this.qualityAssurance = new QualityAssuranceSystem(this.conceptExtractor);
  }

  async initialize(): Promise<void> {
    // 共有ConceptExtractorの初期化確認
    if (!this.conceptExtractor.isInitialized) {
      await this.conceptExtractor.initialize();
    }
    
    // QualityAssuranceSystemの初期化（共有インスタンス使用）
    await this.qualityAssurance.initialize();
    
    // UnifiedLogProcessorの初期化
    await this.unifiedProcessor.initialize();
  }

  /**
   * 完全ログ分析
   */
  async analyzeLog(
    content: string, 
    options: LogManagementOptions = this.getDefaultOptions()
  ): Promise<IntegratedLogAnalysis> {
    
    console.log('🔍 統合ログ分析開始...');
    
    // Step 1: 基本概念抽出と品質保証
    console.log('📊 概念抽出と品質評価...');
    const { result: conceptExtraction, qualityReport: qualityAssurance } = 
      await this.qualityAssurance.extractWithQualityAssurance(content);

    // Step 2: 分割推奨判定
    const splitRecommendation = this.analyzeSplitNeed(content, conceptExtraction);
    
    // Step 3: ログ分割（必要な場合）
    let chunks: LogChunk[] = [];
    if (options.enableSplitting && splitRecommendation.shouldSplit) {
      console.log('✂️  ログ分割実行...');
      chunks = this.splitter.splitRawLog(content);
    }

    // Step 4: 統一ログ処理
    console.log('🏗️  統一ログ処理...');
    const logStructure = await this.unifiedProcessor.processUnifiedLog(content);

    // Step 5: 従来品質メトリクス
    console.log('📈 品質メトリクス計算...');
    const legacyQualityMetrics = await this.qualityAssessment.assessQuality(
      logStructure, conceptExtraction
    );

    // Step 6: 命名提案
    let namingSuggestion: NamingSuggestion = {
      filename: 'log_analysis.md',
      confidence: 50,
      reasoning: 'Default naming',
      category: 'general',
      phase: 'unknown',
      alternatives: []
    };
    
    if (options.autoNaming) {
      console.log('📝 ファイル名提案生成...');
      const suggestions = this.namingHelper.suggest(content, {
        contentHints: this.extractContentHints(conceptExtraction),
        dialogueMetrics: {
          length: content.length,
          complexity: conceptExtraction.predictedInnovationLevel,
          newConcepts: conceptExtraction.deepConcepts.length
        }
      });
      
      // 最も信頼度の高い提案を使用
      if (suggestions.length > 0) {
        namingSuggestion = suggestions[0];
      }
    }

    // Step 7: 継続性キーワード
    let continuityKeywords: string[] = [];
    let sessionGuidance = '';
    
    if (options.generateContinuityKeywords && qualityAssurance.isReliable) {
      console.log('🔗 継続性キーワード生成...');
      const continuityData = await this.qualityAssurance.generateContinuityKeywords(content);
      continuityKeywords = continuityData.keywords.slice(0, options.maxKeywords);
      sessionGuidance = continuityData.nextSessionGuidance;
    }

    console.log('✅ 統合ログ分析完了');

    return {
      conceptExtraction,
      qualityAssurance,
      logStructure,
      chunks,
      namingSuggestion,
      legacyQualityMetrics,
      continuityKeywords,
      sessionGuidance,
      splitRecommendation
    };
  }

  /**
   * 分割必要性の分析
   */
  private analyzeSplitNeed(content: string, extraction: IntelligentExtractionResult): SplitRecommendation {
    const contentLength = content.length;
    const shouldSplit = contentLength > 8000; // 8000文字以上なら分割推奨
    
    let reason = '';
    const suggestedSplitPoints: number[] = [];
    const chunkSizes: number[] = [];

    if (shouldSplit) {
      if (contentLength > 15000) {
        reason = '長大なログ（15000文字以上）のため分割を強く推奨';
      } else if (contentLength > 10000) {
        reason = '中程度のログ（10000文字以上）のため分割推奨';
      } else {
        reason = 'コンテキスト保持のため分割推奨';
      }

      // 簡易分割ポイント計算
      const targetSize = 4000;
      for (let i = targetSize; i < contentLength; i += targetSize) {
        suggestedSplitPoints.push(i);
        chunkSizes.push(Math.min(targetSize, contentLength - i));
      }
    } else {
      reason = '適切なサイズのため分割不要';
    }

    return {
      shouldSplit,
      reason,
      suggestedSplitPoints,
      chunkSizes
    };
  }

  /**
   * 内容ヒント抽出
   */
  private extractContentHints(extraction: IntelligentExtractionResult): any {
    return {
      isDiscovery: extraction.predictedInnovationLevel >= 8,
      isTrigger: extraction.timeRevolutionMarkers.length > 0,
      isExtension: extraction.deepConcepts.length >= 4,
      isApplication: extraction.dialogueTypeDetection === 'technical_collaboration',
      isArticle: extraction.dialogueTypeDetection === 'academic_research',
      isTransition: extraction.qualityPrediction.overallQuality < 60,
      isMath: extraction.dialogueTypeDetection === 'mathematical_research',
      isExperimental: extraction.confidence < 70
    };
  }

  /**
   * デフォルトオプション
   */
  private getDefaultOptions(): LogManagementOptions {
    return {
      enableSplitting: true,
      targetChunkSize: 4000,
      enableQualityCheck: true,
      minReliabilityThreshold: 70,
      autoNaming: true,
      includeTimestamp: false,
      generateContinuityKeywords: true,
      maxKeywords: 5
    };
  }

  /**
   * 簡易分析（高速版）
   */
  async quickAnalyze(content: string): Promise<{
    quality: number;
    shouldSplit: boolean;
    keywords: string[];
    filename: string;
  }> {
    const { result, qualityReport } = await this.qualityAssurance.extractWithQualityAssurance(content);
    
    return {
      quality: qualityReport.reliabilityScore,
      shouldSplit: content.length > 8000,
      keywords: result.deepConcepts.slice(0, 3).map(c => c.term),
      filename: `log_${result.dialogueTypeDetection}_${Date.now()}.md`
    };
  }

  /**
   * バッチ処理
   */
  async batchAnalyze(logFiles: string[]): Promise<IntegratedLogAnalysis[]> {
    const results: IntegratedLogAnalysis[] = [];
    
    for (let i = 0; i < logFiles.length; i++) {
      console.log(`📊 バッチ処理 ${i+1}/${logFiles.length}: ${logFiles[i].substring(0, 50)}...`);
      const analysis = await this.analyzeLog(logFiles[i]);
      results.push(analysis);
    }
    
    return results;
  }
}