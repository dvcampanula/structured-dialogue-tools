#!/usr/bin/env node

/**
 * DynamicPatternLearner - 動的パターン学習システム
 * 
 * AI以外のアプローチによる概念認識能力向上
 * Phase 6.1 ベクトル埋め込み技術統合に対応
 */

export interface PatternDiscovery {
  pattern: string;
  frequency: number;
  contexts: string[];
  noveltyScore: number;
  confidence: number;
}

export interface ConceptCooccurrence {
  concept1: string;
  concept2: string;
  frequency: number;
  contexts: string[];
  significance: number;
}

export interface EmergentPattern {
  name: string;
  indicators: string[];
  contextClues: string[];
  evidenceWeight: number;
  discoverySource: string;
  validationScore: number;
}

/**
 * 動的パターン学習・異常検知システム
 * 
 * 人間の概念認識プロセスを工学的に実装：
 * 1. 統計的異常検知 - 珍しい概念組み合わせの発見
 * 2. 共起パターン分析 - 概念間の新しい関係性検出
 * 3. 自動パターン生成 - 発見から検出ルール作成
 */
export class DynamicPatternLearner {
  private cooccurrenceMatrix: Map<string, Map<string, number>> = new Map();
  private patternHistory: PatternDiscovery[] = [];
  private discoveredPatterns: EmergentPattern[] = [];

  /**
   * 概念共起行列の構築
   */
  public buildCooccurrenceMatrix(concepts: string[], contexts: string[]): void {
    for (let i = 0; i < concepts.length; i++) {
      const concept1 = concepts[i];
      
      if (!this.cooccurrenceMatrix.has(concept1)) {
        this.cooccurrenceMatrix.set(concept1, new Map());
      }
      
      // 同一文脈内での概念共起を記録
      for (let j = i + 1; j < concepts.length; j++) {
        const concept2 = concepts[j];
        const matrix1 = this.cooccurrenceMatrix.get(concept1)!;
        
        matrix1.set(concept2, (matrix1.get(concept2) || 0) + 1);
      }
    }
  }

  /**
   * 統計的異常検知による新パターン発見
   */
  public detectAnomalousPatterns(threshold: number = 0.05): PatternDiscovery[] {
    const discoveries: PatternDiscovery[] = [];
    
    this.cooccurrenceMatrix.forEach((cooccurrences, concept1) => {
      cooccurrences.forEach((frequency, concept2) => {
        // 期待値からの逸脱度計算
        const expectedFrequency = this.calculateExpectedFrequency(concept1, concept2);
        const anomalyScore = frequency / Math.max(expectedFrequency, 1);
        
        if (anomalyScore > (1 / threshold)) {
          discoveries.push({
            pattern: `${concept1} + ${concept2}`,
            frequency,
            contexts: this.getContextsForPair(concept1, concept2),
            noveltyScore: anomalyScore,
            confidence: this.calculateConfidence(frequency, expectedFrequency)
          });
        }
      });
    });
    
    return discoveries.sort((a, b) => b.noveltyScore - a.noveltyScore);
  }

  /**
   * 新しい現象パターンの自動生成
   */
  public generateEmergentPatterns(discoveries: PatternDiscovery[]): EmergentPattern[] {
    const emergentPatterns: EmergentPattern[] = [];
    
    // 高ノベルティスコアの発見からパターンを生成
    const significantDiscoveries = discoveries.filter(d => d.noveltyScore > 2.0);
    
    for (const discovery of significantDiscoveries) {
      const [concept1, concept2] = discovery.pattern.split(' + ');
      
      // 関連語の抽出
      const relatedConcepts = this.findRelatedConcepts([concept1, concept2]);
      
      const emergentPattern: EmergentPattern = {
        name: this.generatePatternName(concept1, concept2),
        indicators: [concept1, concept2, ...relatedConcepts.slice(0, 3)],
        contextClues: this.extractContextClues(discovery.contexts),
        evidenceWeight: Math.min(discovery.confidence, 1.0),
        discoverySource: `異常検知: ${discovery.pattern}`,
        validationScore: discovery.noveltyScore
      };
      
      emergentPatterns.push(emergentPattern);
    }
    
    return emergentPatterns;
  }

  /**
   * 概念間距離計算（意味的関連性）
   */
  public calculateConceptDistance(concept1: string, concept2: string): number {
    // 共起頻度ベースの意味的距離
    const cooccurrence = this.cooccurrenceMatrix.get(concept1)?.get(concept2) || 0;
    const concept1Total = this.getTotalCooccurrences(concept1);
    const concept2Total = this.getTotalCooccurrences(concept2);
    
    if (concept1Total === 0 || concept2Total === 0) return 1.0;
    
    // Jaccard係数的な類似度計算
    const similarity = cooccurrence / (concept1Total + concept2Total - cooccurrence);
    return 1.0 - similarity;
  }

  /**
   * 概念クラスタリング
   */
  public clusterConcepts(concepts: string[], maxDistance: number = 0.3): string[][] {
    const clusters: string[][] = [];
    const visited = new Set<string>();
    
    for (const concept of concepts) {
      if (visited.has(concept)) continue;
      
      const cluster = [concept];
      visited.add(concept);
      
      // 類似概念をクラスターに追加
      for (const otherConcept of concepts) {
        if (visited.has(otherConcept)) continue;
        
        const distance = this.calculateConceptDistance(concept, otherConcept);
        if (distance <= maxDistance) {
          cluster.push(otherConcept);
          visited.add(otherConcept);
        }
      }
      
      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  // プライベートヘルパーメソッド
  private calculateExpectedFrequency(concept1: string, concept2: string): number {
    const total1 = this.getTotalCooccurrences(concept1);
    const total2 = this.getTotalCooccurrences(concept2);
    const totalConcepts = this.cooccurrenceMatrix.size;
    
    return (total1 * total2) / Math.max(totalConcepts * totalConcepts, 1);
  }
  
  private getTotalCooccurrences(concept: string): number {
    const cooccurrences = this.cooccurrenceMatrix.get(concept);
    if (!cooccurrences) return 0;
    
    return Array.from(cooccurrences.values()).reduce((sum, freq) => sum + freq, 0);
  }
  
  private calculateConfidence(observed: number, expected: number): number {
    if (expected === 0) return 1.0;
    return Math.min(observed / expected, 1.0);
  }
  
  private getContextsForPair(concept1: string, concept2: string): string[] {
    // 実装簡略化：実際は文脈情報を保存・取得
    return [`${concept1}と${concept2}の文脈`];
  }
  
  private findRelatedConcepts(concepts: string[]): string[] {
    // 実装簡略化：関連概念の検索
    return [];
  }
  
  private generatePatternName(concept1: string, concept2: string): string {
    return `${concept1}-${concept2}連携パターン`;
  }
  
  private extractContextClues(contexts: string[]): string[] {
    // 実装簡略化：文脈から手がかり語を抽出
    return ['関連', '連携', '統合'];
  }

  /**
   * 学習結果の統計情報取得
   */
  public getPatternStatistics(): {
    totalPatterns: number;
    cooccurrenceEntries: number;
    emergentPatterns: number;
    averageNovelty: number;
  } {
    const totalPatterns = this.patternHistory.length;
    const cooccurrenceEntries = Array.from(this.cooccurrenceMatrix.values())
      .reduce((sum, map) => sum + map.size, 0);
    const emergentPatterns = this.discoveredPatterns.length;
    const averageNovelty = this.patternHistory.length > 0 
      ? this.patternHistory.reduce((sum, p) => sum + p.noveltyScore, 0) / this.patternHistory.length
      : 0;

    return {
      totalPatterns,
      cooccurrenceEntries,
      emergentPatterns,
      averageNovelty
    };
  }
}