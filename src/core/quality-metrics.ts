#!/usr/bin/env node

/**
 * 品質測定システム
 * 統一ログ処理の効果を定量的に測定
 */

import type { LogHeader, ProcessedChunk, UnifiedLogStructure } from './unified-log-processor.js';

interface QualityMetrics {
  conceptDetection: ConceptDetectionMetrics;
  processingPerformance: ProcessingPerformanceMetrics;
  structuralQuality: StructuralQualityMetrics;
  overallScore: number;
}

interface ConceptDetectionMetrics {
  detectedConceptsCount: number;
  conceptDensity: number;           // 概念密度 (概念数/文字数)
  conceptCoverage: number;          // 概念カバレッジ (0-100)
  keywordMatchRate: number;         // 重要キーワードマッチ率
  conceptCoherence: number;         // 概念間の一貫性
}

interface ProcessingPerformanceMetrics {
  totalProcessingTime: number;      // 総処理時間 (ms)
  chunkProcessingTime: number;      // チャンク処理時間 (ms)
  conceptExtractionTime: number;    // 概念抽出時間 (ms)
  memoryUsage: number;              // メモリ使用量 (MB)
  throughput: number;               // スループット (文字/秒)
}

interface StructuralQualityMetrics {
  chunkBalanceScore: number;        // チャンク間バランス (0-100)
  contextPreservationScore: number; // 文脈保持スコア (0-100)
  chunkCoherenceScore: number;      // チャンク内一貫性 (0-100)
  headerAccuracy: number;           // ヘッダー精度 (0-100)
  promptCompleteness: number;       // プロンプト完全性 (0-100)
}

class QualityAssessment {
  private startTime: number = 0;
  private chunkStartTime: number = 0;
  private conceptStartTime: number = 0;

  /**
   * 処理開始時刻を記録
   */
  startProcessing(): void {
    this.startTime = Date.now();
  }

  /**
   * チャンク処理開始時刻を記録
   */
  startChunkProcessing(): void {
    this.chunkStartTime = Date.now();
  }

  /**
   * 概念抽出開始時刻を記録
   */
  startConceptExtraction(): void {
    this.conceptStartTime = Date.now();
  }

  /**
   * 統一ログ構造の品質を総合評価
   */
  assessQuality(structure: UnifiedLogStructure, rawLogLength: number): QualityMetrics {
    const conceptDetection = this.assessConceptDetection(structure.header, rawLogLength);
    const processingPerformance = this.assessProcessingPerformance(structure, rawLogLength);
    const structuralQuality = this.assessStructuralQuality(structure);
    
    const overallScore = this.calculateOverallScore(conceptDetection, processingPerformance, structuralQuality);

    return {
      conceptDetection,
      processingPerformance,
      structuralQuality,
      overallScore
    };
  }

  /**
   * 概念検出能力の評価
   */
  private assessConceptDetection(header: LogHeader, rawLogLength: number): ConceptDetectionMetrics {
    const detectedConceptsCount = header.mainConcepts.length;
    const conceptDensity = (detectedConceptsCount / rawLogLength) * 10000; // 1万文字あたりの概念数
    
    // 重要キーワードの定義
    const importantKeywords = [
      '構造的対話', '構造的協働思考', 'メタ認知', 'AI能力', '文脈保持',
      '概念創発', '思考パートナー', 'セーブポイント', '意識', '認知',
      '感情理解', 'パーソナル', '寄り添い', '継続学習', '品質向上'
    ];
    
    // キーワードマッチ率の計算
    const matchedKeywords = header.mainConcepts.filter(concept => 
      importantKeywords.some(keyword => concept.includes(keyword))
    );
    const keywordMatchRate = matchedKeywords.length / Math.max(detectedConceptsCount, 1) * 100;
    
    // 概念カバレッジの計算 (概念数と品質のバランス) - 改良版
    const conceptCoverage = Math.min(100, 
      Math.max(30, detectedConceptsCount * 12) + // 基本スコアは30点保証
      keywordMatchRate * 0.8 + // キーワードマッチを重視
      (detectedConceptsCount >= 5 ? 15 : 0) // 5概念以上でボーナス
    );
    
    // 概念間一貫性の評価 (議論範囲との関連性)
    const conceptCoherence = this.evaluateConceptCoherence(header.mainConcepts, header.discussionScope);

    return {
      detectedConceptsCount,
      conceptDensity,
      conceptCoverage,
      keywordMatchRate,
      conceptCoherence
    };
  }

  /**
   * 処理性能の評価
   */
  private assessProcessingPerformance(structure: UnifiedLogStructure, rawLogLength: number): ProcessingPerformanceMetrics {
    const totalProcessingTime = structure.metadata.totalProcessingTime;
    const chunkProcessingTime = this.chunkStartTime > 0 ? Date.now() - this.chunkStartTime : 0;
    const conceptExtractionTime = this.conceptStartTime > 0 ? Date.now() - this.conceptStartTime : 0;
    
    // メモリ使用量の推定 (構造のサイズベース)
    const structureSize = JSON.stringify(structure).length;
    const memoryUsage = structureSize / (1024 * 1024); // MB
    
    // スループットの計算 (文字/秒)
    const throughput = totalProcessingTime > 0 ? (rawLogLength / totalProcessingTime) * 1000 : 0;

    return {
      totalProcessingTime,
      chunkProcessingTime,
      conceptExtractionTime,
      memoryUsage,
      throughput
    };
  }

  /**
   * 構造品質の評価
   */
  private assessStructuralQuality(structure: UnifiedLogStructure): StructuralQualityMetrics {
    const { header, chunks } = structure;
    
    // チャンク間バランスの評価（改良版：自然な分散を考慮）
    const chunkSizes = chunks.map(chunk => chunk.content.length);
    const avgSize = chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length;
    const variance = chunkSizes.reduce((acc, size) => acc + Math.pow(size - avgSize, 2), 0) / chunkSizes.length;
    const coefficientOfVariation = Math.sqrt(variance) / avgSize;
    
    // 自然な分散範囲（0.3-0.7）を許容し、その範囲内では高スコア維持
    let chunkBalanceScore;
    if (coefficientOfVariation <= 0.3) {
      chunkBalanceScore = 95; // 非常に均等
    } else if (coefficientOfVariation <= 0.7) {
      chunkBalanceScore = 85 - (coefficientOfVariation - 0.3) * 25; // 自然な分散範囲
    } else {
      chunkBalanceScore = Math.max(20, 75 - (coefficientOfVariation - 0.7) * 40); // 大きな分散のみペナルティ
    }
    
    // 文脈保持スコア (チャンク数と総文字数のバランス)
    const contextPreservationScore = Math.min(100, 
      100 - (Math.abs(chunks.length - Math.ceil(header.totalCharacters / 8000)) * 10)
    );
    
    // チャンク内一貫性スコア (プロンプトの完全性)
    const chunkCoherenceScore = chunks.every(chunk => 
      chunk.continuationPrompt.includes(header.title) && 
      chunk.continuationPrompt.includes('構造化してください')
    ) ? 95 : 75;
    
    // ヘッダー精度 (必要フィールドの充実度)
    const headerFieldsScore = [
      header.title.length > 10,
      header.mainConcepts.length >= 3,
      header.discussionScope.length > 10,
      header.suggestedFilename.includes('.md')
    ].filter(Boolean).length * 25;
    
    // プロンプト完全性 (指示+内容の完備性)
    const promptCompleteness = chunks.every(chunk =>
      chunk.continuationPrompt.includes('構造化指示') &&
      chunk.continuationPrompt.includes(chunk.content.substring(0, 100))
    ) ? 100 : 80;

    return {
      chunkBalanceScore,
      contextPreservationScore: contextPreservationScore,
      chunkCoherenceScore,
      headerAccuracy: headerFieldsScore,
      promptCompleteness
    };
  }

  /**
   * 概念間一貫性の評価
   */
  private evaluateConceptCoherence(concepts: string[], discussionScope: string): number {
    if (concepts.length === 0) return 0;
    
    // 議論範囲との関連度
    const scopeRelevance = concepts.filter(concept => 
      discussionScope.includes(concept) || concept.length > 5
    ).length / concepts.length;
    
    // 概念の重複度 (低いほど良い)
    const uniqueConcepts = new Set(concepts).size;
    const uniquenessScore = uniqueConcepts / concepts.length;
    
    return (scopeRelevance * 60 + uniquenessScore * 40);
  }

  /**
   * 総合スコアの計算
   */
  private calculateOverallScore(
    conceptDetection: ConceptDetectionMetrics,
    performance: ProcessingPerformanceMetrics,
    structural: StructuralQualityMetrics
  ): number {
    // 重み付け: 概念検出35%, 構造品質45%, 性能20%
    const conceptScore = (
      conceptDetection.conceptCoverage * 0.4 +
      conceptDetection.keywordMatchRate * 0.3 +
      conceptDetection.conceptCoherence * 0.3
    );
    
    const structuralScore = (
      structural.chunkBalanceScore * 0.2 +
      structural.contextPreservationScore * 0.3 +
      structural.chunkCoherenceScore * 0.2 +
      structural.headerAccuracy * 0.15 +
      structural.promptCompleteness * 0.15
    );
    
    // 性能スコア (処理時間が短いほど高得点) - 改良版
    const processingSeconds = performance.totalProcessingTime / 1000;
    let performanceScore;
    
    // 現実的な処理時間を考慮した評価
    if (processingSeconds <= 10) {
      performanceScore = 100; // 10秒以内は最高評価
    } else if (processingSeconds <= 30) {
      performanceScore = 90 - (processingSeconds - 10) * 1.5; // 30秒までは緊々に減点
    } else if (processingSeconds <= 60) {
      performanceScore = 60 - (processingSeconds - 30) * 1; // 60秒までは緩やかに減点
    } else {
      performanceScore = Math.max(30, 60 - (processingSeconds - 60) * 0.5); // 60秒超過は最低30点保証
    }
    
    // デバッグ情報追加
    const finalScore = conceptScore * 0.35 + structuralScore * 0.45 + performanceScore * 0.20;
    console.log(`📊 スコア内訳: 概念(${conceptScore.toFixed(1)}) 構造(${structuralScore.toFixed(1)}) 性能(${performanceScore.toFixed(1)}) → 総合(${finalScore.toFixed(1)})`);
    
    return finalScore;
  }

  /**
   * メトリクスの可読性表示
   */
  formatMetricsReport(metrics: QualityMetrics): string {
    return `
# 📊 品質測定レポート

## 🎯 総合スコア: ${metrics.overallScore.toFixed(1)}/100

## 🔍 概念検出能力
- **検出概念数**: ${metrics.conceptDetection.detectedConceptsCount}個
- **概念密度**: ${metrics.conceptDetection.conceptDensity.toFixed(3)}/万文字
- **概念カバレッジ**: ${metrics.conceptDetection.conceptCoverage.toFixed(1)}%
- **キーワードマッチ率**: ${metrics.conceptDetection.keywordMatchRate.toFixed(1)}%
- **概念一貫性**: ${metrics.conceptDetection.conceptCoherence.toFixed(1)}%

## ⚡ 処理性能
- **総処理時間**: ${metrics.processingPerformance.totalProcessingTime}ms
- **チャンク処理時間**: ${metrics.processingPerformance.chunkProcessingTime}ms
- **概念抽出時間**: ${metrics.processingPerformance.conceptExtractionTime}ms
- **メモリ使用量**: ${metrics.processingPerformance.memoryUsage.toFixed(2)}MB
- **スループット**: ${metrics.processingPerformance.throughput.toFixed(0)}文字/秒

## 🏗️ 構造品質
- **チャンクバランス**: ${metrics.structuralQuality.chunkBalanceScore.toFixed(1)}%
- **文脈保持**: ${metrics.structuralQuality.contextPreservationScore.toFixed(1)}%
- **チャンク一貫性**: ${metrics.structuralQuality.chunkCoherenceScore.toFixed(1)}%
- **ヘッダー精度**: ${metrics.structuralQuality.headerAccuracy.toFixed(1)}%
- **プロンプト完全性**: ${metrics.structuralQuality.promptCompleteness.toFixed(1)}%
    `.trim();
  }
}

export { QualityAssessment, type QualityMetrics, type ConceptDetectionMetrics, type ProcessingPerformanceMetrics, type StructuralQualityMetrics };