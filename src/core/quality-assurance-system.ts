#!/usr/bin/env node

/**
 * 品質担保統合システム
 * IntelligentConceptExtractor の品質を保証し、実用性を担保
 */

import { IntelligentConceptExtractor, IntelligentExtractionResult } from './intelligent-concept-extractor';

export interface QualityAssuranceReport {
  isReliable: boolean;
  reliabilityScore: number;
  issues: QualityIssue[];
  recommendations: string[];
  usageGuidelines: string[];
}

export interface QualityIssue {
  type: 'low_confidence' | 'inconsistent_concepts' | 'poor_relevance' | 'insufficient_depth';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  affectedConcepts?: string[];
}

/**
 * 品質担保システム
 */
export class QualityAssuranceSystem {
  private extractor: IntelligentConceptExtractor;
  
  constructor() {
    this.extractor = new IntelligentConceptExtractor();
  }

  async initialize(): Promise<void> {
    await this.extractor.initialize();
  }

  /**
   * 品質担保付き概念抽出
   */
  async extractWithQualityAssurance(content: string): Promise<{
    result: IntelligentExtractionResult;
    qualityReport: QualityAssuranceReport;
  }> {
    // 基本抽出
    const result = await this.extractor.extractConcepts(content);
    
    // 品質評価
    const qualityReport = this.assessQuality(result, content);
    
    return { result, qualityReport };
  }

  /**
   * 品質評価
   */
  private assessQuality(result: IntelligentExtractionResult, content: string): QualityAssuranceReport {
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];
    const usageGuidelines: string[] = [];

    // 1. 信頼度チェック
    if (result.confidence < 50) {
      issues.push({
        type: 'low_confidence',
        severity: 'critical',
        description: `全体信頼度が${result.confidence}%と低すぎます`,
      });
      recommendations.push('より長い文章や専門的な内容で再試行してください');
    }

    // 2. 概念一貫性チェック
    const coherence = result.qualityPrediction.realTimeMetrics.conceptCoherence;
    if (coherence < 60) {
      issues.push({
        type: 'inconsistent_concepts',
        severity: 'warning',
        description: `概念一貫性が${coherence}%と低いです`,
      });
      recommendations.push('関連概念のグループ化を確認してください');
    }

    // 3. 対話関連性チェック
    const relevance = result.qualityPrediction.realTimeMetrics.dialogueRelevance;
    if (relevance < 30) {
      issues.push({
        type: 'poor_relevance',
        severity: 'warning',
        description: `対話関連性が${relevance}%と低いです`,
        affectedConcepts: result.deepConcepts.map(c => c.term)
      });
      recommendations.push('このツールは構造的対話・技術討論・学術研究に特化しています');
    }

    // 4. 意味的深度チェック  
    const depth = result.qualityPrediction.realTimeMetrics.semanticDepth;
    if (depth < 40) {
      issues.push({
        type: 'insufficient_depth',
        severity: 'info',
        description: `意味的深度が${depth}%です`,
      });
      recommendations.push('深層概念が少ない場合は、より専門的な議論を含めてください');
    }

    // 5. 使用ガイドライン生成
    this.generateUsageGuidelines(result, usageGuidelines);

    // 6. 総合信頼性スコア計算
    const reliabilityScore = this.calculateReliabilityScore(result, issues);
    const isReliable = reliabilityScore >= 70 && issues.filter(i => i.severity === 'critical').length === 0;

    return {
      isReliable,
      reliabilityScore,
      issues,
      recommendations,
      usageGuidelines
    };
  }

  /**
   * 使用ガイドライン生成
   */
  private generateUsageGuidelines(result: IntelligentExtractionResult, guidelines: string[]): void {
    // 対話タイプ別ガイドライン
    switch (result.dialogueTypeDetection) {
      case 'structural_dialogue':
        guidelines.push('✅ 構造的対話として高精度で解析されました');
        guidelines.push('→ セッション継続キーワード、革新度評価が信頼できます');
        break;
      case 'mathematical_research':
        guidelines.push('✅ 数学・科学研究として解析されました');
        guidelines.push('→ 革新度が高く評価される傾向があります');
        break;
      case 'academic_research':
        guidelines.push('✅ 学術研究として解析されました');
        guidelines.push('→ 論文価値評価、研究インパクト測定に適用可能');
        break;
      default:
        guidelines.push('⚠️  特化領域外の対話です');
        guidelines.push('→ 概念抽出結果は参考程度としてください');
    }

    // 革新度別ガイドライン
    if (result.predictedInnovationLevel >= 8) {
      guidelines.push('🚀 高革新度: セッション保存価値が高いです');
    } else if (result.predictedInnovationLevel >= 5) {
      guidelines.push('📈 中革新度: 有益な議論が含まれています');
    } else {
      guidelines.push('📝 低革新度: 基本的な議論レベルです');
    }

    // 深層概念数別ガイドライン
    if (result.deepConcepts.length >= 4) {
      guidelines.push('🧠 豊富な深層概念: 引き継ぎキーワードとして活用可能');
    } else if (result.deepConcepts.length >= 2) {
      guidelines.push('💡 適度な深層概念: 要約・タグ付けに使用可能');
    } else {
      guidelines.push('📋 深層概念少: より専門的な議論で精度向上');
    }
  }

  /**
   * 信頼性スコア計算
   */
  private calculateReliabilityScore(result: IntelligentExtractionResult, issues: QualityIssue[]): number {
    let score = result.confidence; // ベーススコア

    // 品質グレード調整
    const gradeBonus = {
      'A': 20, 'B': 10, 'C': 0, 'D': -10, 'F': -20
    };
    score += gradeBonus[result.qualityPrediction.qualityGrade];

    // 問題による減点
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 30; break;
        case 'warning': score -= 15; break;
        case 'info': score -= 5; break;
      }
    });

    // 対話タイプによる調整
    const typeBonus = {
      'structural_dialogue': 15,
      'mathematical_research': 10,
      'academic_research': 10,
      'technical_collaboration': 5,
      'default': -10
    };
    score += typeBonus[result.dialogueTypeDetection] || typeBonus.default;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * セッション継続支援
   */
  async generateContinuityKeywords(content: string): Promise<{
    keywords: string[];
    confidence: number;
    nextSessionGuidance: string;
  }> {
    const { result, qualityReport } = await this.extractWithQualityAssurance(content);
    
    if (!qualityReport.isReliable) {
      return {
        keywords: [],
        confidence: 0,
        nextSessionGuidance: '品質が低く、継続キーワード生成は推奨されません'
      };
    }

    const keywords = result.deepConcepts
      .filter(c => c.confidence >= 0.8)
      .map(c => c.term)
      .slice(0, 5);

    const guidance = this.generateNextSessionGuidance(result);

    return {
      keywords,
      confidence: qualityReport.reliabilityScore,
      nextSessionGuidance: guidance
    };
  }

  /**
   * 次セッションガイダンス生成
   */
  private generateNextSessionGuidance(result: IntelligentExtractionResult): string {
    const innovation = result.predictedInnovationLevel;
    const concepts = result.deepConcepts.slice(0, 3).map(c => c.term);
    
    if (innovation >= 8) {
      return `前回は革新度${innovation}/10の高価値セッションでした。「${concepts.join('」「')}」について更に深掘りできそうです。`;
    } else if (innovation >= 5) {
      return `前回の議論「${concepts.join('」「')}」を発展させて、より具体的な応用を探ってみましょう。`;
    } else {
      return `前回のトピック「${concepts.join('」「')}」について、より専門的な視点から議論を深めることをお勧めします。`;
    }
  }
}