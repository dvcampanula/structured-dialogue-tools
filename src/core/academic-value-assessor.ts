#!/usr/bin/env node

/**
 * AcademicValueAssessor - 学術価値評価システム
 * 
 * 新規性、実証性、実用的影響、方法論的貢献を評価し、
 * 研究ギャップの特定と改善提案を行うシステム
 */

import { DetectedPhenomenon } from './phenomenon-detector.js';
import { DialoguePhaseResult } from './dialogue-phase-analyzer.js';

// 学術価値評価用の型定義
export interface AcademicValue {
  novelty: number; // 新規性評価
  evidenceQuality: number; // 実証性評価
  practicalImpact: number; // 実用的影響
  researchGap: string[]; // 研究ギャップ
  methodologicalContribution: number; // 方法論的貢献
}

export interface AcademicValueAssessment extends AcademicValue {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
}

/**
 * 学術価値評価システム
 */
export class AcademicValueAssessor {
  private academicValueCriteria: AcademicValue = {
    novelty: 0,
    evidenceQuality: 0,
    practicalImpact: 0,
    researchGap: [],
    methodologicalContribution: 0
  };

  constructor() {
    this.initializeAcademicValueCriteria();
  }

  /**
   * 学術価値の評価
   */
  public assessAcademicValue(
    content: string, 
    phenomena: DetectedPhenomenon[], 
    dialoguePhases: DialoguePhaseResult[]
  ): AcademicValueAssessment {
    // 新規性評価
    const noveltyScore = this.calculateNoveltyScore(phenomena, content);
    
    // 実証性評価
    const evidenceScore = this.calculateEvidenceQuality(content, phenomena);
    
    // 実用的影響評価
    const impactScore = this.calculatePracticalImpact(phenomena, dialoguePhases);
    
    // 方法論的貢献評価
    const methodologicalScore = this.calculateMethodologicalContribution(content);

    const overallScore = (noveltyScore + evidenceScore + impactScore + methodologicalScore) / 4;

    return {
      novelty: noveltyScore,
      evidenceQuality: evidenceScore,
      practicalImpact: impactScore,
      researchGap: this.identifyResearchGaps(phenomena),
      methodologicalContribution: methodologicalScore,
      overallScore,
      strengths: this.identifyStrengths(phenomena, dialoguePhases),
      weaknesses: this.identifyWeaknesses(phenomena, dialoguePhases),
      improvementSuggestions: this.generateImprovementSuggestions(overallScore, phenomena)
    };
  }

  /**
   * 詳細分析レポートの生成
   */
  public generateDetailedReport(assessment: AcademicValueAssessment): {
    summary: string;
    recommendations: string[];
    researchDirections: string[];
  } {
    const summary = `学術価値総合評価: ${(assessment.overallScore * 100).toFixed(1)}%
新規性: ${(assessment.novelty * 100).toFixed(1)}% | 実証性: ${(assessment.evidenceQuality * 100).toFixed(1)}%
実用性: ${(assessment.practicalImpact * 100).toFixed(1)}% | 方法論: ${(assessment.methodologicalContribution * 100).toFixed(1)}%`;

    const recommendations = [
      ...assessment.improvementSuggestions,
      ...(assessment.overallScore < 0.7 ? ['学術的厳密性の向上が必要'] : []),
      ...(assessment.novelty < 0.5 ? ['新規性の強化が必要'] : [])
    ];

    const researchDirections = assessment.researchGap.map(gap => 
      `研究方向性: ${gap.replace('の現象は既存研究での報告が少ない新領域', '分野での深化研究')}`
    );

    return {
      summary,
      recommendations,
      researchDirections
    };
  }

  /**
   * 新規性評価の計算
   */
  private calculateNoveltyScore(phenomena: DetectedPhenomenon[], content: string): number {
    const revolutionaryPhenomena = phenomena.filter(p => p.significance === 'revolutionary');
    const highPhenomena = phenomena.filter(p => p.significance === 'high');
    
    let score = revolutionaryPhenomena.length * 0.4 + highPhenomena.length * 0.3;
    
    // 新概念検出語の存在確認
    const noveltyIndicators = ['初', '新', '革新', '画期', '独創', '前例', '初回'];
    const noveltyCount = noveltyIndicators.reduce((count, indicator) => 
      count + (content.match(new RegExp(indicator, 'g')) || []).length, 0);
    
    score += Math.min(noveltyCount * 0.05, 0.3);
    
    return Math.min(score, 1.0);
  }

  /**
   * 実証性評価の計算
   */
  private calculateEvidenceQuality(content: string, phenomena: DetectedPhenomenon[]): number {
    const evidenceKeywords = ['実証', '証明', '確認', '検証', 'テスト', '実験', '観察', '記録'];
    const evidenceCount = evidenceKeywords.reduce((count, keyword) => 
      count + (content.match(new RegExp(keyword, 'g')) || []).length, 0);
    
    const totalEvidence = phenomena.reduce((sum, p) => sum + p.evidence.length, 0);
    
    return Math.min((evidenceCount * 0.1 + totalEvidence * 0.05), 1.0);
  }

  /**
   * 実用的影響の計算
   */
  private calculatePracticalImpact(phenomena: DetectedPhenomenon[], phases: DialoguePhaseResult[]): number {
    const impactPhenomena = phenomena.filter(p => 
      p.name.includes('革新') || p.name.includes('感染') || p.significance === 'revolutionary'
    );
    
    const validationPhase = phases.find(p => p.phase === 'validation');
    
    let score = impactPhenomena.length * 0.3;
    if (validationPhase && validationPhase.confidence > 0.5) score += 0.4;
    
    return Math.min(score, 1.0);
  }

  /**
   * 方法論的貢献の計算
   */
  private calculateMethodologicalContribution(content: string): number {
    const methodKeywords = ['手法', '方法', 'プロセス', 'アプローチ', '技術', 'システム', 'フレームワーク'];
    const methodCount = methodKeywords.reduce((count, keyword) => 
      count + (content.match(new RegExp(keyword, 'g')) || []).length, 0);
    
    return Math.min(methodCount * 0.05, 1.0);
  }

  /**
   * 研究ギャップの特定
   */
  private identifyResearchGaps(phenomena: DetectedPhenomenon[]): string[] {
    const gaps: string[] = [];
    
    phenomena.forEach(p => {
      if (p.significance === 'revolutionary') {
        gaps.push(`${p.name}の現象は既存研究での報告が少ない新領域`);
      }
      if (p.confidence > 0.7) {
        gaps.push(`${p.name}の実証的研究が不足している領域`);
      }
    });
    
    return gaps;
  }

  /**
   * 強みの特定
   */
  private identifyStrengths(phenomena: DetectedPhenomenon[], phases: DialoguePhaseResult[]): string[] {
    const strengths: string[] = [];
    
    const highConfidencePhenomena = phenomena.filter(p => p.confidence > 0.6);
    if (highConfidencePhenomena.length > 0) {
      strengths.push(`高信頼度現象検出: ${highConfidencePhenomena.map(p => p.name).join(', ')}`);
    }
    
    if (phases.length >= 3) {
      strengths.push('多段階的対話構造の実現');
    }
    
    const revolutionaryPhenomena = phenomena.filter(p => p.significance === 'revolutionary');
    if (revolutionaryPhenomena.length > 0) {
      strengths.push('革命的現象の発見');
    }
    
    return strengths;
  }

  /**
   * 弱みの特定
   */
  private identifyWeaknesses(phenomena: DetectedPhenomenon[], phases: DialoguePhaseResult[]): string[] {
    const weaknesses: string[] = [];
    
    const lowConfidencePhenomena = phenomena.filter(p => p.confidence < 0.4);
    if (lowConfidencePhenomena.length > 0) {
      weaknesses.push(`証拠不足の現象: ${lowConfidencePhenomena.map(p => p.name).join(', ')}`);
    }
    
    if (phases.length < 2) {
      weaknesses.push('対話段階の複雑性不足');
    }
    
    if (phenomena.length === 0) {
      weaknesses.push('検出可能な現象の不在');
    }
    
    return weaknesses;
  }

  /**
   * 改善提案の生成
   */
  private generateImprovementSuggestions(overallScore: number, phenomena: DetectedPhenomenon[]): string[] {
    const suggestions: string[] = [];
    
    if (overallScore < 0.6) {
      suggestions.push('より具体的な実証例の追加');
      suggestions.push('現象の詳細な観察記録の充実');
    }
    
    if (phenomena.length < 2) {
      suggestions.push('多角的な現象分析の実施');
    }
    
    const lowEvidencePhenomena = phenomena.filter(p => p.evidence.length < 3);
    if (lowEvidencePhenomena.length > 0) {
      suggestions.push('現象の証拠となる具体例の追加');
    }
    
    if (overallScore < 0.4) {
      suggestions.push('学術的フレームワークの導入');
      suggestions.push('理論的背景の強化');
    }
    
    return suggestions;
  }

  /**
   * 学術価値評価基準の初期化
   */
  private initializeAcademicValueCriteria(): void {
    this.academicValueCriteria = {
      novelty: 0,
      evidenceQuality: 0,
      practicalImpact: 0,
      researchGap: [],
      methodologicalContribution: 0
    };
  }

  /**
   * 評価統計の取得
   */
  public getAssessmentStats(): {
    criteriaCount: number;
    evaluationDimensions: string[];
  } {
    return {
      criteriaCount: Object.keys(this.academicValueCriteria).length,
      evaluationDimensions: ['新規性', '実証性', '実用性', '方法論的貢献', '研究ギャップ']
    };
  }
}