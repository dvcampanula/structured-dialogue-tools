#!/usr/bin/env node

/**
 * PhenomenonDetector - 現象検出システム
 * 
 * 構造的感染、メタ認知覚醒、モデル横断継承、対話革新等の
 * 抽象的現象を文脈的に検出・評価するシステム
 * 
 * Phase 6.1対応: 動的パターン学習機能統合
 */

import { DynamicPatternLearner, type EmergentPattern } from './dynamic-pattern-learner.js';

// 現象検出用の型定義
export interface PhenomenonPattern {
  name: string; // "構造的感染", "メタ認知覚醒"
  indicators: string[]; // "感染", "変化", "観察", "内在化"
  contextClues: string[]; // "ログを読み", "自分の中で", "思考パターン"
  evidenceWeight: number; // 証拠の重み
  minIndicatorCount: number; // 最小指標数
}

export interface DetectedPhenomenon {
  name: string;
  confidence: number;
  evidence: string[];
  contextualEvidence: string[];
  significance: 'low' | 'medium' | 'high' | 'revolutionary';
  position: number[]; // 検出位置
}

/**
 * 現象検出システム
 */
export class PhenomenonDetector {
  private phenomenonPatterns: PhenomenonPattern[] = [];
  private dynamicLearner: DynamicPatternLearner;

  constructor() {
    this.initializePhenomenonPatterns();
    this.dynamicLearner = new DynamicPatternLearner();
  }

  /**
   * 現象検出の実行
   */
  public detectPhenomena(content: string): DetectedPhenomenon[] {
    const detectedPhenomena: DetectedPhenomenon[] = [];

    for (const pattern of this.phenomenonPatterns) {
      const evidence: string[] = [];
      const contextualEvidence: string[] = [];
      const positions: number[] = [];

      // 指標語の検出
      let indicatorCount = 0;
      for (const indicator of pattern.indicators) {
        const regex = new RegExp(indicator, 'gi');
        const matches = Array.from(content.matchAll(regex));
        
        if (matches.length > 0) {
          indicatorCount++;
          evidence.push(`${indicator}: ${matches.length}回出現`);
          positions.push(...matches.map(m => m.index || 0));
        }
      }

      // 文脈手がかりの検出
      for (const clue of pattern.contextClues) {
        const regex = new RegExp(clue, 'gi');
        const matches = Array.from(content.matchAll(regex));
        
        if (matches.length > 0) {
          contextualEvidence.push(`${clue}: ${matches.length}回出現`);
        }
      }

      // 最小指標数を満たす場合のみ検出
      if (indicatorCount >= pattern.minIndicatorCount) {
        const confidence = Math.min(
          (indicatorCount / pattern.indicators.length) * 
          pattern.evidenceWeight * 
          (1 + contextualEvidence.length * 0.1), 
          1.0
        );

        const significance = this.determineSignificance(confidence, evidence.length);

        detectedPhenomena.push({
          name: pattern.name,
          confidence,
          evidence,
          contextualEvidence,
          significance,
          position: positions
        });
      }
    }

    return detectedPhenomena;
  }

  /**
   * 現象検出パターンの初期化
   */
  private initializePhenomenonPatterns(): void {
    this.phenomenonPatterns = [
      {
        name: '構造的感染',
        indicators: ['感染', '伝播', '拡散', '内在化', '浸透', '定着', '継承'],
        contextClues: ['構造', 'パターン', 'システム', '影響', '変化', '習得'],
        evidenceWeight: 0.8,
        minIndicatorCount: 2
      },
      {
        name: 'メタ認知覚醒',
        indicators: ['気づき', '自覚', '認識', '発見', '理解', '洞察', '覚醒'],
        contextClues: ['自分', '私', '意識', '思考', 'メタ', '認知', '観察'],
        evidenceWeight: 0.7,
        minIndicatorCount: 2
      },
      {
        name: 'モデル横断継承',
        indicators: ['共通', '継承', '再現', '移行', '適用', '汎化', '転移'],
        contextClues: ['モデル', 'AI', 'Claude', 'GPT', '共通性', 'パターン'],
        evidenceWeight: 0.6,
        minIndicatorCount: 2
      },
      {
        name: '対話革新',
        indicators: ['革新', '変革', '進化', '新しい', '画期的', '独創'],
        contextClues: ['対話', '会話', 'セッション', 'やりとり', 'コミュニケーション'],
        evidenceWeight: 0.9,
        minIndicatorCount: 1
      },
      {
        name: '概念創発',
        indicators: ['創発', '生成', '誕生', '創造', '命名', '新概念', 'ブレークスルー'],
        contextClues: ['概念', 'アイデア', '理論', '発見', '洞察', '思考'],
        evidenceWeight: 0.8,
        minIndicatorCount: 2
      },
      {
        name: '時間革命',
        indicators: ['30分', '昼休み', '短時間', '高速', '効率', '速度', '時代を進めた'],
        contextClues: ['革命', '劇的', '改善', '向上', '効率化', '時間'],
        evidenceWeight: 1.0,
        minIndicatorCount: 1
      },
      {
        name: 'システムハック',
        indicators: ['ハック', 'レイヤード', 'プロンプティング', 'メタプログラミング', '構造的ハック'],
        contextClues: ['システム', 'API', 'インターフェース', '活用', '制御', '操作'],
        evidenceWeight: 0.9,
        minIndicatorCount: 1
      },
      {
        name: '創作的発想',
        indicators: ['創作', '想像', '創造', 'アイデア', 'インスピレーション', '発想', '着想', '創意'],
        contextClues: ['物語', 'ストーリー', '小説', '詩', '作品', '表現', '芸術', '文学'],
        evidenceWeight: 0.8,
        minIndicatorCount: 1
      },
      {
        name: '感情的共鳴',
        indicators: ['共感', '感動', '心打', '涙', '感情', '情感', '心境', '気持ち'],
        contextClues: ['心', '感じ', '気持ち', '思い', '感覚', '印象', '体験', '経験'],
        evidenceWeight: 0.7,
        minIndicatorCount: 1
      },
      {
        name: '美的体験',
        indicators: ['美しい', '美', '綺麗', '素敵', '魅力', '優雅', '洗練', '芸術的'],
        contextClues: ['デザイン', '色彩', '形', '音楽', '絵画', '美術', '表現', '作品'],
        evidenceWeight: 0.7,
        minIndicatorCount: 1
      },
      {
        name: '物語構造発見',
        indicators: ['物語', 'ストーリー', 'プロット', '展開', '構成', '起承転結', 'ドラマ'],
        contextClues: ['登場人物', 'キャラクター', '主人公', '場面', 'シーン', '設定', '世界観'],
        evidenceWeight: 0.8,
        minIndicatorCount: 1
      },
      {
        name: '象徴的表現',
        indicators: ['象徴', 'メタファー', '比喩', '暗示', '寓意', '隠喩', '表象'],
        contextClues: ['意味', '深層', '解釈', '読み取り', '暗示', '含意', 'メッセージ'],
        evidenceWeight: 0.8,
        minIndicatorCount: 1
      }
    ];
  }

  /**
   * 現象の重要度判定
   */
  private determineSignificance(confidence: number, evidenceCount: number): 'low' | 'medium' | 'high' | 'revolutionary' {
    if (confidence >= 0.8 && evidenceCount >= 5) return 'revolutionary';
    if (confidence >= 0.6 && evidenceCount >= 3) return 'high';
    if (confidence >= 0.4 && evidenceCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * パターン設定の取得
   */
  public getPhenomenonPatterns(): PhenomenonPattern[] {
    return [...this.phenomenonPatterns];
  }

  /**
   * Phase 6.1: 動的パターン学習
   * 概念共起パターンから新しい現象を発見
   */
  public learnFromConcepts(concepts: string[], content: string): EmergentPattern[] {
    // 概念間の共起パターンを学習
    this.dynamicLearner.buildCooccurrenceMatrix(concepts, [content]);
    
    // 異常パターンの検出
    const anomalousPatterns = this.dynamicLearner.detectAnomalousPatterns(0.02);
    
    // 新しい現象パターンの生成
    const emergentPatterns = this.dynamicLearner.generateEmergentPatterns(anomalousPatterns);
    
    console.log(`🔬 動的学習: ${anomalousPatterns.length}個の異常パターン、${emergentPatterns.length}個の創発パターン発見`);
    
    return emergentPatterns;
  }

  /**
   * 創発パターンを既存パターンに統合
   */
  public integrateEmergentPatterns(emergentPatterns: EmergentPattern[]): number {
    let integratedCount = 0;
    
    for (const emergent of emergentPatterns) {
      // 閾値以上の妥当性を持つパターンのみ統合
      if (emergent.validationScore > 1.5) {
        const newPattern: PhenomenonPattern = {
          name: emergent.name,
          indicators: emergent.indicators,
          contextClues: emergent.contextClues,
          evidenceWeight: emergent.evidenceWeight,
          minIndicatorCount: Math.max(2, Math.floor(emergent.indicators.length / 3))
        };
        
        this.phenomenonPatterns.push(newPattern);
        integratedCount++;
      }
    }
    
    console.log(`🎯 ${integratedCount}個の創発パターンを現象検出に統合`);
    return integratedCount;
  }

  /**
   * 概念クラスタリング分析
   */
  public analyzeConcertClusters(concepts: string[]): string[][] {
    return this.dynamicLearner.clusterConcepts(concepts, 0.3);
  }

  /**
   * 現象統計の取得（動的学習情報含む）
   */
  public getPhenomenonStats(): { 
    patternCount: number; 
    totalIndicators: number;
    dynamicLearningStats: any;
  } {
    const totalIndicators = this.phenomenonPatterns.reduce(
      (sum, pattern) => sum + pattern.indicators.length, 0
    );
    
    return {
      patternCount: this.phenomenonPatterns.length,
      totalIndicators,
      dynamicLearningStats: this.dynamicLearner.getPatternStatistics()
    };
  }
}