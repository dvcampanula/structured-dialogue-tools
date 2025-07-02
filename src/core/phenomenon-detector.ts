#!/usr/bin/env node

/**
 * PhenomenonDetector - 現象検出システム
 * 
 * 構造的感染、メタ認知覚醒、モデル横断継承、対話革新等の
 * 抽象的現象を文脈的に検出・評価するシステム
 */

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

  constructor() {
    this.initializePhenomenonPatterns();
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
   * 現象統計の取得
   */
  public getPhenomenonStats(): { patternCount: number; totalIndicators: number } {
    const totalIndicators = this.phenomenonPatterns.reduce(
      (sum, pattern) => sum + pattern.indicators.length, 0
    );
    
    return {
      patternCount: this.phenomenonPatterns.length,
      totalIndicators
    };
  }
}