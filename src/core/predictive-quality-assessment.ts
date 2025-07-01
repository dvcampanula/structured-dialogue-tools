#!/usr/bin/env node

/**
 * 予測概念ベース品質評価システム v1.0
 * 従来の減点システムに代わる、予測概念を活用した革新的品質評価
 */

import type { IntelligentExtractionResult } from './intelligent-concept-extractor';

export interface PredictiveQualityMetrics {
  // 予測概念ベース指標
  predictiveValueScore: number;          // 予測価値スコア (0-100)
  conceptInnovationDensity: number;      // 革新概念密度 (0-100)
  emergentPatternStrength: number;       // 創発パターン強度 (0-100)
  continuityPotential: number;           // 継続可能性 (0-100)
  
  // 統合指標
  predictiveQualityScore: number;        // 予測品質総合スコア (0-100)
  
  // 詳細分析
  valueDrivers: ValueDriver[];           // 価値推進要因
  innovationSignals: InnovationSignal[]; // 革新シグナル
  continuityRecommendations: string[];   // 継続推奨事項
}

export interface ValueDriver {
  type: 'predicted_concept' | 'emergent_pattern' | 'meta_concept' | 'concept_evolution';
  description: string;
  impact: number;                        // 影響度 (0-100)
  confidence: number;                    // 信頼度 (0-100)
}

export interface InnovationSignal {
  signal: string;                        // シグナル名
  strength: number;                      // 強度 (0-100)
  novelty: number;                       // 新規性 (0-100)
  potential: number;                     // 発展可能性 (0-100)
}

/**
 * 予測概念ベース品質評価システム
 */
export class PredictiveQualityAssessment {
  
  /**
   * 予測概念を活用した品質評価
   */
  assessPredictiveQuality(result: IntelligentExtractionResult): PredictiveQualityMetrics {
    // 1. 予測価値スコア計算
    const predictiveValueScore = this.calculatePredictiveValueScore(result);
    
    // 2. 革新概念密度計算
    const conceptInnovationDensity = this.calculateConceptInnovationDensity(result);
    
    // 3. 創発パターン強度計算
    const emergentPatternStrength = this.calculateEmergentPatternStrength(result);
    
    // 4. 継続可能性計算
    const continuityPotential = this.calculateContinuityPotential(result);
    
    // 5. 価値推進要因抽出
    const valueDrivers = this.extractValueDrivers(result);
    
    // 6. 革新シグナル検出
    const innovationSignals = this.detectInnovationSignals(result);
    
    // 7. 継続推奨事項生成
    const continuityRecommendations = this.generateContinuityRecommendations(result);
    
    // 8. 総合スコア計算
    const predictiveQualityScore = this.calculateOverallPredictiveScore({
      predictiveValueScore,
      conceptInnovationDensity, 
      emergentPatternStrength,
      continuityPotential
    });
    
    return {
      predictiveValueScore: this.ensureValidNumber(predictiveValueScore),
      conceptInnovationDensity: this.ensureValidNumber(conceptInnovationDensity),
      emergentPatternStrength: this.ensureValidNumber(emergentPatternStrength),
      continuityPotential: this.ensureValidNumber(continuityPotential),
      predictiveQualityScore: this.ensureValidNumber(predictiveQualityScore),
      valueDrivers: valueDrivers || [],
      innovationSignals: innovationSignals || [],
      continuityRecommendations: continuityRecommendations || []
    };
  }
  
  /**
   * 予測価値スコア計算
   * 予測概念の数・確率・新規性から算出
   */
  private calculatePredictiveValueScore(result: IntelligentExtractionResult): number {
    if (!result.predictiveExtraction?.predictedConcepts) {
      return 0;
    }
    
    const predictedConcepts = result.predictiveExtraction.predictedConcepts;
    
    // 高確率予測概念（>70%）のボーナス
    const highConfidenceConcepts = predictedConcepts.filter(c => c.probability > 0.7);
    const highConfidenceBonus = Math.min(40, highConfidenceConcepts.length * 10);
    
    // 予測概念数によるベーススコア
    const conceptCountScore = Math.min(30, predictedConcepts.length * 3);
    
    // 平均確率によるスコア（ゼロ除算対策）
    const avgProbability = predictedConcepts.length > 0 
      ? predictedConcepts.reduce((sum, c) => sum + c.probability, 0) / predictedConcepts.length
      : 0;
    const probabilityScore = avgProbability * 30;
    
    return Math.min(100, highConfidenceBonus + conceptCountScore + probabilityScore);
  }
  
  /**
   * 革新概念密度計算
   * 革新度と概念品質のバランス評価
   */
  private calculateConceptInnovationDensity(result: IntelligentExtractionResult): number {
    const innovationLevel = result.predictedInnovationLevel || 0;
    const conceptCount = result.deepConcepts?.length || 0;
    
    // 革新度ベーススコア（インフレ対策で調整）
    const innovationScore = Math.min(50, innovationLevel * 5); // 10→50点にキャップ
    
    // 深層概念数によるスコア
    const conceptScore = Math.min(30, conceptCount * 5);
    
    // メタ概念パターンによるボーナス
    const metaConceptBonus = this.calculateMetaConceptBonus(result);
    
    return Math.min(100, innovationScore + conceptScore + metaConceptBonus);
  }
  
  /**
   * 創発パターン強度計算
   */
  private calculateEmergentPatternStrength(result: IntelligentExtractionResult): number {
    if (!result.predictiveExtraction?.emergentPatterns) {
      return 0;
    }
    
    const patterns = result.predictiveExtraction.emergentPatterns;
    
    // パターン数によるベーススコア
    const patternCountScore = Math.min(40, patterns.length * 8);
    
    // パターン強度の平均（ゼロ除算対策）
    const avgStrength = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + (p.strength || 0), 0) / patterns.length
      : 0;
    const strengthScore = avgStrength * 60; // 0-1 → 0-60
    
    return Math.min(100, patternCountScore + strengthScore);
  }
  
  /**
   * 継続可能性計算
   */
  private calculateContinuityPotential(result: IntelligentExtractionResult): number {
    let score = 0;
    
    // 対話タイプによるベーススコア
    const typeScore = this.getDialogueTypeScore(result.dialogueTypeDetection);
    score += typeScore;
    
    // セッション継続キーワードの品質
    if (result.sessionContinuityKeywords && result.sessionContinuityKeywords.length > 0) {
      score += Math.min(25, result.sessionContinuityKeywords.length * 5);
    }
    
    // 概念進化の可能性
    if (result.predictiveExtraction?.conceptEvolutionPrediction) {
      const evolutionPotential = result.predictiveExtraction.conceptEvolutionPrediction.length * 8;
      score += Math.min(25, evolutionPotential);
    }
    
    // 未解決な課題・問いの存在
    const openEndedness = this.calculateOpenEndednessScore(result);
    score += openEndedness;
    
    return Math.min(100, score);
  }
  
  /**
   * メタ概念ボーナス計算
   */
  private calculateMetaConceptBonus(result: IntelligentExtractionResult): number {
    // メタ概念パターンの検出状況から算出
    const metaPatterns = result.metaConceptPatterns || [];
    return Math.min(20, metaPatterns.length * 3);
  }
  
  /**
   * 対話タイプスコア
   */
  private getDialogueTypeScore(dialogueType: string): number {
    const typeScores: Record<string, number> = {
      'structural_dialogue': 30,        // 構造的対話は高継続価値
      'mathematical_research': 25,      // 数学研究は発展性高
      'academic_research': 25,          // 学術研究も発展性高
      'technical_collaboration': 20,    // 技術協働は実用価値
      'conceptual_exploration': 20,     // 概念探索は継続価値
      'default': 10                     // その他は基本スコア
    };
    
    return typeScores[dialogueType] || typeScores.default;
  }
  
  /**
   * 開放性スコア計算（未解決な課題・発展可能性）
   */
  private calculateOpenEndednessScore(result: IntelligentExtractionResult): number {
    let score = 0;
    
    // 時間革命マーカーの存在（未来への展望）
    if (result.timeRevolutionMarkers && result.timeRevolutionMarkers.length > 0) {
      score += Math.min(15, result.timeRevolutionMarkers.length * 3);
    }
    
    // 深層概念の多様性（異なる分野への展開可能性）
    if (result.deepConcepts && result.deepConcepts.length > 0) {
      const diversityScore = Math.min(10, result.deepConcepts.length * 2);
      score += diversityScore;
    }
    
    return score;
  }
  
  /**
   * 価値推進要因抽出
   */
  private extractValueDrivers(result: IntelligentExtractionResult): ValueDriver[] {
    const drivers: ValueDriver[] = [];
    
    // 予測概念による価値
    if (result.predictiveExtraction?.predictedConcepts) {
      const highValueConcepts = result.predictiveExtraction.predictedConcepts
        .filter(c => c.probability > 0.7)
        .slice(0, 3);
      
      highValueConcepts.forEach(concept => {
        drivers.push({
          type: 'predicted_concept',
          description: `高確率予測概念: ${concept.term}`,
          impact: concept.probability * 100,
          confidence: concept.probability * 100
        });
      });
    }
    
    // 創発パターンによる価値
    if (result.predictiveExtraction?.emergentPatterns) {
      result.predictiveExtraction.emergentPatterns
        .slice(0, 2)
        .forEach(pattern => {
          drivers.push({
            type: 'emergent_pattern',
            description: `創発パターン: ${pattern.pattern}`,
            impact: (pattern.strength || 0) * 100,
            confidence: 85
          });
        });
    }
    
    // メタ概念による価値
    if (result.metaConceptPatterns && result.metaConceptPatterns.length > 0) {
      drivers.push({
        type: 'meta_concept',
        description: `メタ概念パターン検出: ${result.metaConceptPatterns.length}件`,
        impact: Math.min(100, result.metaConceptPatterns.length * 15),
        confidence: 80
      });
    }
    
    return drivers;
  }
  
  /**
   * 革新シグナル検出
   */
  private detectInnovationSignals(result: IntelligentExtractionResult): InnovationSignal[] {
    const signals: InnovationSignal[] = [];
    
    // 高革新度シグナル
    if (result.predictedInnovationLevel >= 8) {
      signals.push({
        signal: '高革新度対話',
        strength: result.predictedInnovationLevel * 10,
        novelty: 90,
        potential: 85
      });
    }
    
    // 新概念創発シグナル
    if (result.predictiveExtraction?.predictedConcepts) {
      const newConcepts = result.predictiveExtraction.predictedConcepts
        .filter(c => c.probability > 0.8);
      
      if (newConcepts.length > 0) {
        signals.push({
          signal: '新概念創発',
          strength: Math.min(100, newConcepts.length * 25),
          novelty: 95,
          potential: 90
        });
      }
    }
    
    // 概念進化シグナル
    if (result.predictiveExtraction?.conceptEvolutionPrediction) {
      const evolutionCount = result.predictiveExtraction.conceptEvolutionPrediction.length;
      if (evolutionCount > 0) {
        signals.push({
          signal: '概念進化予測',
          strength: Math.min(100, evolutionCount * 20),
          novelty: 75,
          potential: 95
        });
      }
    }
    
    return signals;
  }
  
  /**
   * 継続推奨事項生成
   */
  private generateContinuityRecommendations(result: IntelligentExtractionResult): string[] {
    const recommendations: string[] = [];
    
    // 予測概念ベースの推奨
    if (result.predictiveExtraction?.predictedConcepts) {
      const topPredicted = result.predictiveExtraction.predictedConcepts
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 2);
      
      if (topPredicted.length > 0) {
        recommendations.push(`🔮 高確率予測概念「${topPredicted.map(c => c.term).join('」「')}」の深掘り検討`);
      }
    }
    
    // 創発パターンベースの推奨
    if (result.predictiveExtraction?.emergentPatterns && result.predictiveExtraction.emergentPatterns.length > 0) {
      recommendations.push(`⚡ 創発パターンの実証・応用可能性の探索`);
    }
    
    // 対話タイプ別推奨
    switch (result.dialogueTypeDetection) {
      case 'structural_dialogue':
        recommendations.push(`🏗️ 構造的対話の深化・体系化の継続`);
        break;
      case 'mathematical_research':
        recommendations.push(`🔬 数学的洞察の理論化・証明の検討`);
        break;
      case 'academic_research':
        recommendations.push(`📚 学術的価値の論文化・研究発展の検討`);
        break;
    }
    
    return recommendations;
  }
  
  /**
   * 総合予測品質スコア計算
   */
  private calculateOverallPredictiveScore(metrics: {
    predictiveValueScore: number;
    conceptInnovationDensity: number;
    emergentPatternStrength: number;
    continuityPotential: number;
  }): number {
    // NaN/undefined対策
    const safeMetrics = {
      predictiveValueScore: this.ensureValidNumber(metrics.predictiveValueScore),
      conceptInnovationDensity: this.ensureValidNumber(metrics.conceptInnovationDensity),
      emergentPatternStrength: this.ensureValidNumber(metrics.emergentPatternStrength),
      continuityPotential: this.ensureValidNumber(metrics.continuityPotential)
    };
    
    // 重み付け: 予測価値30%, 革新密度25%, 創発強度25%, 継続性20%
    const score = (
      safeMetrics.predictiveValueScore * 0.30 +
      safeMetrics.conceptInnovationDensity * 0.25 +
      safeMetrics.emergentPatternStrength * 0.25 +
      safeMetrics.continuityPotential * 0.20
    );
    
    return this.ensureValidNumber(score);
  }
  
  /**
   * 数値の安全性確保（NaN/undefined/null → 0変換）
   */
  private ensureValidNumber(value: number | null | undefined): number {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, value)); // 0-100範囲にクランプ
  }
  
  /**
   * 品質評価の可読性レポート生成
   */
  formatPredictiveQualityReport(metrics: PredictiveQualityMetrics): string {
    // 安全な数値表示関数
    const safeFormat = (value: number | null | undefined): string => {
      const safe = this.ensureValidNumber(value);
      return safe.toFixed(1);
    };
    
    return `
# 🔮 予測概念ベース品質評価レポート

## 🎯 総合予測品質スコア: ${safeFormat(metrics.predictiveQualityScore)}/100

## 📊 詳細指標
- **🔮 予測価値スコア**: ${safeFormat(metrics.predictiveValueScore)}/100
- **💡 革新概念密度**: ${safeFormat(metrics.conceptInnovationDensity)}/100  
- **⚡ 創発パターン強度**: ${safeFormat(metrics.emergentPatternStrength)}/100
- **🔄 継続可能性**: ${safeFormat(metrics.continuityPotential)}/100

## 🚀 価値推進要因
${metrics.valueDrivers?.map(driver => 
  `- **${driver.description}** (影響度: ${safeFormat(driver.impact)}, 信頼度: ${safeFormat(driver.confidence)})`
).join('\n') || 'なし'}

## 🎨 革新シグナル
${metrics.innovationSignals?.map(signal =>
  `- **${signal.signal}** - 強度: ${safeFormat(signal.strength)}, 新規性: ${safeFormat(signal.novelty)}, 可能性: ${safeFormat(signal.potential)}`  
).join('\n') || 'なし'}

## 🔄 継続推奨事項
${metrics.continuityRecommendations?.map(rec => `- ${rec}`).join('\n') || 'なし'}
    `.trim();
  }
}