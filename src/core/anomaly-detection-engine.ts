#!/usr/bin/env node

/**
 * AnomalyDetectionEngine - 異常検知エンジン実装
 * 
 * 統計的に珍しい概念組み合わせを検出し、
 * 新しいパターンや現象の発見を支援するシステム
 */

import { 
  AnomalyDetectionEngine, 
  ConceptAnomaly, 
  ConceptUsageData 
} from './evolutionary-pattern-discovery.js';

export class StatisticalAnomalyDetectionEngine implements AnomalyDetectionEngine {
  private baselineData: Map<string, number> = new Map(); // concept pair -> frequency
  private conceptFrequencies: Map<string, number> = new Map();
  private totalObservations: number = 0;
  private anomalyThreshold: number = 0.05; // 5% threshold for anomaly
  
  constructor() {
    this.initializeBaseline();
  }

  /**
   * 概念組み合わせの異常を検出
   */
  public detectConceptCombinationAnomalies(concepts: string[], content: string): ConceptAnomaly[] {
    const anomalies: ConceptAnomaly[] = [];
    const contentWords = content.toLowerCase().split(/\s+/);
    
    // 概念ペアの共起頻度を計算
    const conceptPairs = this.generateConceptPairs(concepts);
    
    for (const [concept1, concept2] of conceptPairs) {
      const pairKey = this.createPairKey(concept1, concept2);
      
      // 実際の共起頻度を計算
      const actualFrequency = this.calculateCooccurrenceFrequency(concept1, concept2, contentWords);
      
      // 期待頻度を計算（独立性仮定）
      const expectedFrequency = this.calculateExpectedFrequency(concept1, concept2);
      
      // 異常スコアを計算
      const anomalyScore = this.calculateAnomalyScore(actualFrequency, expectedFrequency);
      
      // 異常閾値を超える場合は異常として記録
      if (anomalyScore > this.anomalyThreshold) {
        const contextWords = this.extractContext(concept1, concept2, contentWords, 5);
        
        anomalies.push({
          conceptPair: [concept1, concept2],
          frequency: actualFrequency,
          expectedFrequency,
          anomalyScore,
          context: contextWords,
          discoveredAt: new Date()
        });
      }
    }
    
    // 異常スコア順でソート
    anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
    
    console.log(`🔍 異常検知: ${conceptPairs.length}ペア検査, ${anomalies.length}異常発見`);
    
    return anomalies;
  }

  /**
   * 異常検知ベースラインの更新
   */
  public updateAnomalyBaseline(newData: ConceptUsageData[]): void {
    console.log(`📊 ベースライン更新: ${newData.length}データ追加`);
    
    for (const data of newData) {
      // 個別概念頻度を更新
      for (const concept of data.concepts) {
        const current = this.conceptFrequencies.get(concept) || 0;
        this.conceptFrequencies.set(concept, current + 1);
      }
      
      // ペア共起頻度を更新
      for (const [pairKey, frequency] of data.cooccurrences) {
        const current = this.baselineData.get(pairKey) || 0;
        this.baselineData.set(pairKey, current + frequency);
      }
      
      this.totalObservations++;
    }
    
    // 閾値を動的調整
    this.adjustAnomalyThreshold();
  }

  /**
   * 現在の異常検知閾値を取得
   */
  public getAnomalyThreshold(): number {
    return this.anomalyThreshold;
  }

  /**
   * 概念ペアの生成
   */
  private generateConceptPairs(concepts: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        pairs.push([concepts[i], concepts[j]]);
      }
    }
    
    return pairs;
  }

  /**
   * ペアキーの作成（順序正規化）
   */
  private createPairKey(concept1: string, concept2: string): string {
    return concept1 < concept2 ? `${concept1}|${concept2}` : `${concept2}|${concept1}`;
  }

  /**
   * 共起頻度の計算
   */
  private calculateCooccurrenceFrequency(concept1: string, concept2: string, words: string[]): number {
    const windowSize = 10; // 10語以内での共起をカウント
    let cooccurrenceCount = 0;
    
    const concept1Positions = words.map((word, index) => 
      word.includes(concept1.toLowerCase()) ? index : -1
    ).filter(pos => pos !== -1);
    
    const concept2Positions = words.map((word, index) => 
      word.includes(concept2.toLowerCase()) ? index : -1
    ).filter(pos => pos !== -1);
    
    for (const pos1 of concept1Positions) {
      for (const pos2 of concept2Positions) {
        if (Math.abs(pos1 - pos2) <= windowSize) {
          cooccurrenceCount++;
        }
      }
    }
    
    return cooccurrenceCount;
  }

  /**
   * 期待頻度の計算（独立性仮定）
   */
  private calculateExpectedFrequency(concept1: string, concept2: string): number {
    const freq1 = this.conceptFrequencies.get(concept1) || 1;
    const freq2 = this.conceptFrequencies.get(concept2) || 1;
    
    // 独立性仮定での期待頻度
    return (freq1 * freq2) / Math.max(this.totalObservations, 1);
  }

  /**
   * 異常スコアの計算
   */
  private calculateAnomalyScore(actual: number, expected: number): number {
    if (expected === 0) return actual > 0 ? 1.0 : 0.0;
    
    // カイ二乗検定ベースの異常スコア
    const chiSquare = Math.pow(actual - expected, 2) / expected;
    
    // 0-1に正規化（シグモイド関数使用）
    return 1 / (1 + Math.exp(-chiSquare + 3));
  }

  /**
   * 文脈語の抽出
   */
  private extractContext(concept1: string, concept2: string, words: string[], windowSize: number): string[] {
    const contextWords: Set<string> = new Set();
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (word.includes(concept1.toLowerCase()) || word.includes(concept2.toLowerCase())) {
        // 前後のウィンドウから文脈を抽出
        const start = Math.max(0, i - windowSize);
        const end = Math.min(words.length, i + windowSize + 1);
        
        for (let j = start; j < end; j++) {
          if (words[j].length > 2 && !words[j].includes(concept1.toLowerCase()) && !words[j].includes(concept2.toLowerCase())) {
            contextWords.add(words[j]);
          }
        }
      }
    }
    
    return Array.from(contextWords).slice(0, 10); // 最大10語
  }

  /**
   * ベースラインの初期化
   */
  private initializeBaseline(): void {
    // 一般的な概念組み合わせのベースライン
    const commonPairs = [
      ['システム', '実装'],
      ['分析', 'データ'],
      ['機能', '改善'],
      ['品質', '向上'],
      ['概念', '抽出']
    ];
    
    for (const [concept1, concept2] of commonPairs) {
      const pairKey = this.createPairKey(concept1, concept2);
      this.baselineData.set(pairKey, 5); // 基本頻度
      this.conceptFrequencies.set(concept1, 10);
      this.conceptFrequencies.set(concept2, 10);
    }
    
    this.totalObservations = 50;
    console.log('📊 異常検知ベースライン初期化完了');
  }

  /**
   * 異常検知閾値の動的調整
   */
  private adjustAnomalyThreshold(): void {
    // データ量に応じて閾値を調整
    if (this.totalObservations > 100) {
      this.anomalyThreshold = 0.03; // より厳しく
    } else if (this.totalObservations > 500) {
      this.anomalyThreshold = 0.02; // さらに厳しく
    }
    
    console.log(`📈 異常検知閾値調整: ${this.anomalyThreshold}`);
  }

  /**
   * 高度な異常検知手法
   */
  public detectSemanticAnomalies(concepts: string[], content: string): ConceptAnomaly[] {
    const anomalies: ConceptAnomaly[] = [];
    
    // セマンティック距離ベースの異常検知
    const semanticAnomalies = this.detectSemanticDistanceAnomalies(concepts, content);
    anomalies.push(...semanticAnomalies);
    
    // 時系列ベースの異常検知
    const temporalAnomalies = this.detectTemporalAnomalies(concepts, content);
    anomalies.push(...temporalAnomalies);
    
    return anomalies;
  }

  private detectSemanticDistanceAnomalies(concepts: string[], content: string): ConceptAnomaly[] {
    // セマンティック距離が予想外に近い/遠い概念ペアを検出
    // 実装は簡略化（実際にはベクトル埋め込みを使用）
    return [];
  }

  private detectTemporalAnomalies(concepts: string[], content: string): ConceptAnomaly[] {
    // 時間的出現パターンが異常な概念を検出
    return [];
  }

  /**
   * 統計情報の取得
   */
  public getDetectionStatistics(): {
    baselineEntries: number;
    totalObservations: number;
    averageAnomalyThreshold: number;
    topAnomalousPatterns: string[];
  } {
    const topPatterns = Array.from(this.baselineData.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);

    return {
      baselineEntries: this.baselineData.size,
      totalObservations: this.totalObservations,
      averageAnomalyThreshold: this.anomalyThreshold,
      topAnomalousPatterns: topPatterns
    };
  }
}