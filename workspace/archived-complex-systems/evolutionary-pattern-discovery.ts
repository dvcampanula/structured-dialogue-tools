#!/usr/bin/env node

/**
 * EvolutionaryPatternDiscovery - 進化的パターン発見システム
 * 
 * 前回セッションで提案された最有望アプローチ:
 * 1. 異常検知 - 統計的に珍しい概念組み合わせの検出
 * 2. グラフ分析 - 概念間関係の新しいパターン発見  
 * 3. 自動学習 - 発見されたパターンからの新しい検出ルール生成
 * 4. 評価フィードバック - 人間評価による学習システムの改良
 * 
 * Phase 6.1+ 対応の進化的AI統合システム
 */

import { DynamicPatternLearner, type EmergentPattern } from './dynamic-pattern-learner.js';
import { DetectedPhenomenon } from './phenomenon-detector.js';
import { StatisticalAnomalyDetectionEngine } from './anomaly-detection-engine.js';
import { GraphBasedConceptAnalyzer } from './concept-graph-analyzer.js';

// 1. 異常検知エンジン用の型定義
export interface AnomalyDetectionEngine {
  detectConceptCombinationAnomalies(concepts: string[], content: string): ConceptAnomaly[];
  updateAnomalyBaseline(newData: ConceptUsageData[]): void;
  getAnomalyThreshold(): number;
}

export interface ConceptAnomaly {
  conceptPair: [string, string];
  frequency: number;
  expectedFrequency: number;
  anomalyScore: number; // 0-1, higher = more anomalous
  context: string[];
  discoveredAt: Date;
}

export interface ConceptUsageData {
  concepts: string[];
  cooccurrences: Map<string, number>;
  context: string;
  timestamp: Date;
}

// 2. グラフ分析機能用の型定義
export interface ConceptRelationship {
  source: string;
  target: string;
  type: 'cooccurrence' | 'semantic' | 'causal' | 'temporal';
  strength: number;
  evidence: string[];
}

export interface ConceptGraphAnalyzer {
  buildConceptGraph(concepts: string[], relationships: ConceptRelationship[]): ConceptGraph;
  findNewPatterns(graph: ConceptGraph): NewPatternDiscovery[];
  analyzePatternEvolution(historical: ConceptGraph[], current: ConceptGraph): PatternEvolution[];
}

export interface ConceptGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  clusters: ConceptCluster[];
  centralityScores: Map<string, number>;
}

export interface ConceptNode {
  id: string;
  concept: string;
  frequency: number;
  importance: number;
  semanticCategory: string;
}

export interface ConceptEdge {
  source: string;
  target: string;
  weight: number;
  relationshipType: 'cooccurrence' | 'semantic' | 'causal' | 'temporal';
  strength: number;
}

export interface ConceptCluster {
  id: string;
  concepts: string[];
  cohesion: number;
  theme: string;
}

export interface NewPatternDiscovery {
  patternType: 'emerging_cluster' | 'novel_relationship' | 'concept_bridge' | 'semantic_drift';
  confidence: number;
  description: string;
  involvedConcepts: string[];
  significance: number;
}

export interface PatternEvolution {
  evolutionType: 'strengthening' | 'weakening' | 'emergence' | 'dissolution';
  timespan: { start: Date; end: Date };
  affectedConcepts: string[];
  magnitude: number;
}

// 3. 自動学習ループ用の型定義
export interface PatternEvolutionLearner {
  generateRulesFromPatterns(patterns: NewPatternDiscovery[]): DetectionRule[];
  optimizeExistingRules(performanceData: RulePerformance[]): DetectionRule[];
  adaptToNewDomains(domainData: DomainAdaptationData): void;
}

export interface DetectionRule {
  id: string;
  name: string;
  indicators: string[];
  contextClues: string[];
  evidenceWeight: number;
  minIndicatorCount: number;
  confidence: number;
  source: 'manual' | 'auto_generated' | 'evolved';
  validationScore: number;
}

export interface RulePerformance {
  ruleId: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  domainSpecificPerformance: Map<string, number>;
}

export interface DomainAdaptationData {
  domain: string;
  sampleTexts: string[];
  expectedPhenomena: string[];
  domainSpecificTerms: string[];
}

// 4. 評価フィードバック統合用の型定義
export interface HumanEvaluationIntegrator {
  collectFeedback(detectedPhenomena: DetectedPhenomenon[], humanAnnotations: HumanAnnotation[]): EvaluationResult;
  updateSystemWeights(feedback: EvaluationResult): void;
  generateImprovementSuggestions(performanceAnalysis: PerformanceAnalysis): SystemImprovement[];
}

export interface HumanAnnotation {
  textId: string;
  annotatedPhenomena: string[];
  confidence: number;
  comments: string;
  timestamp: Date;
  annotatorId: string;
}

export interface EvaluationResult {
  agreement: number; // 0-1
  discrepancies: Discrepancy[];
  systemStrengths: string[];
  systemWeaknesses: string[];
  recommendedAdjustments: WeightAdjustment[];
}

export interface Discrepancy {
  phenomenonName: string;
  systemDetected: boolean;
  humanAnnotated: boolean;
  confidenceDifference: number;
  reasonAnalysis: string;
}

export interface WeightAdjustment {
  componentName: string;
  currentWeight: number;
  recommendedWeight: number;
  justification: string;
}

export interface PerformanceAnalysis {
  overallAccuracy: number;
  domainSpecificAccuracy: Map<string, number>;
  phenomenonSpecificAccuracy: Map<string, number>;
  trends: PerformanceTrend[];
}

export interface PerformanceTrend {
  metric: string;
  timepoints: Date[];
  values: number[];
  direction: 'improving' | 'declining' | 'stable';
}

export interface SystemImprovement {
  priority: 'high' | 'medium' | 'low';
  category: 'detection_accuracy' | 'false_positive_reduction' | 'domain_adaptation' | 'speed_optimization';
  description: string;
  estimatedImpact: number;
  implementationComplexity: 'low' | 'medium' | 'high';
}

// 統合システムメインインターフェース
export interface EvolutionaryPatternDiscovery {
  anomalyDetection: AnomalyDetectionEngine;
  graphAnalysis: ConceptGraphAnalyzer;
  autoLearning: PatternEvolutionLearner;
  feedbackSystem: HumanEvaluationIntegrator;
  
  // メインの進化的発見プロセス
  discoverEvolutionaryPatterns(
    concepts: string[], 
    content: string, 
    historicalData?: HistoricalPatternData
  ): EvolutionaryDiscoveryResult;
}

export interface HistoricalPatternData {
  previousDiscoveries: NewPatternDiscovery[];
  conceptEvolution: ConceptEvolutionHistory[];
  performanceHistory: PerformanceAnalysis[];
}

export interface ConceptEvolutionHistory {
  concept: string;
  usageOverTime: { timestamp: Date; frequency: number; context: string[] }[];
  semanticShifts: { timestamp: Date; newMeaning: string; evidence: string[] }[];
}

export interface EvolutionaryDiscoveryResult {
  anomalies: ConceptAnomaly[];
  newPatterns: NewPatternDiscovery[];
  generatedRules: DetectionRule[];
  conceptGraph: ConceptGraph;
  evolutionPredictions: PatternEvolution[];
  confidence: number;
  noveltyScore: number;
  recommendedActions: SystemImprovement[];
}

/**
 * 進化的パターン発見システムメインクラス
 */
export class EvolutionaryPatternDiscoverySystem implements EvolutionaryPatternDiscovery {
  public anomalyDetection!: AnomalyDetectionEngine;
  public graphAnalysis!: ConceptGraphAnalyzer;
  public autoLearning!: PatternEvolutionLearner;
  public feedbackSystem!: HumanEvaluationIntegrator;
  
  private dynamicLearner: DynamicPatternLearner;
  private discoveryHistory: EvolutionaryDiscoveryResult[] = [];

  constructor() {
    this.dynamicLearner = new DynamicPatternLearner();
    this.initializeComponents();
  }

  private initializeComponents(): void {
    console.log('🚀 進化的パターン発見システム初期化中...');
    
    // 1. 異常検知エンジンの初期化
    this.anomalyDetection = new StatisticalAnomalyDetectionEngine();
    
    // 2. グラフ分析機能の初期化
    this.graphAnalysis = new GraphBasedConceptAnalyzer();
    
    // 3. 自動学習ループの初期化
    this.autoLearning = {
      generateRulesFromPatterns: (patterns: NewPatternDiscovery[]) => this.generateRulesFromPatterns(patterns),
      optimizeExistingRules: (performance: RulePerformance[]) => [],
      adaptToNewDomains: (data: DomainAdaptationData) => {}
    };
    
    // 4. 評価フィードバックシステムの初期化
    this.feedbackSystem = {
      collectFeedback: (detected: DetectedPhenomenon[], annotations: HumanAnnotation[]) => this.collectFeedback(detected, annotations),
      updateSystemWeights: (feedback: EvaluationResult) => {},
      generateImprovementSuggestions: (analysis: PerformanceAnalysis) => []
    };
    
    console.log('✅ 進化的パターン発見システム初期化完了');
  }

  /**
   * メインの進化的パターン発見プロセス
   */
  public discoverEvolutionaryPatterns(
    concepts: string[], 
    content: string, 
    historicalData?: HistoricalPatternData
  ): EvolutionaryDiscoveryResult {
    console.log(`🔬 進化的パターン発見開始: ${concepts.length}概念`);
    
    // Phase 1: 異常検知
    const anomalies = this.detectAnomalies(concepts, content);
    
    // Phase 2: グラフ分析  
    const { newPatterns, conceptGraph } = this.analyzeConceptGraph(concepts, anomalies);
    
    // Phase 3: 自動学習
    const generatedRules = this.generateEvolutionaryRules(newPatterns);
    
    // Phase 4: 進化予測
    const evolutionPredictions = this.predictPatternEvolution(conceptGraph, historicalData);
    
    // 統合結果
    const result: EvolutionaryDiscoveryResult = {
      anomalies,
      newPatterns,
      generatedRules,
      conceptGraph,
      evolutionPredictions,
      confidence: this.calculateDiscoveryConfidence(anomalies, newPatterns),
      noveltyScore: this.calculateNoveltyScore(newPatterns),
      recommendedActions: this.generateActionRecommendations(newPatterns, anomalies)
    };
    
    this.discoveryHistory.push(result);
    console.log(`✨ 進化的発見完了: ${newPatterns.length}新パターン, 信頼度${(result.confidence * 100).toFixed(1)}%`);
    
    return result;
  }

  private detectAnomalies(concepts: string[], content: string): ConceptAnomaly[] {
    return this.anomalyDetection.detectConceptCombinationAnomalies(concepts, content);
  }

  private analyzeConceptGraph(concepts: string[], anomalies: ConceptAnomaly[]): { 
    newPatterns: NewPatternDiscovery[], 
    conceptGraph: ConceptGraph 
  } {
    // 異常から関係性を構築
    const relationships = anomalies.map(anomaly => ({
      source: anomaly.conceptPair[0],
      target: anomaly.conceptPair[1],
      type: 'cooccurrence' as const,
      strength: anomaly.anomalyScore,
      evidence: anomaly.context
    }));
    
    // グラフ構築
    const conceptGraph = this.graphAnalysis.buildConceptGraph(concepts, relationships);
    
    // 新パターン発見
    const newPatterns = this.graphAnalysis.findNewPatterns(conceptGraph);
    
    return { newPatterns, conceptGraph };
  }

  private generateEvolutionaryRules(patterns: NewPatternDiscovery[]): DetectionRule[] {
    return this.autoLearning.generateRulesFromPatterns(patterns);
  }

  private predictPatternEvolution(graph: ConceptGraph, historical?: HistoricalPatternData): PatternEvolution[] {
    if (!historical || historical.previousDiscoveries.length === 0) {
      return [];
    }
    
    return this.graphAnalysis.analyzePatternEvolution([graph], graph);
  }

  /**
   * パターンから検出ルールを生成
   */
  private generateRulesFromPatterns(patterns: NewPatternDiscovery[]): DetectionRule[] {
    const rules: DetectionRule[] = [];
    
    for (const pattern of patterns) {
      if (pattern.confidence > 0.6) {
        const rule: DetectionRule = {
          id: `evolved_${pattern.patternType}_${Date.now()}`,
          name: `進化的${pattern.patternType}検出`,
          indicators: pattern.involvedConcepts,
          contextClues: pattern.description.split(' ').slice(0, 5),
          evidenceWeight: pattern.confidence,
          minIndicatorCount: Math.max(1, Math.floor(pattern.involvedConcepts.length / 2)),
          confidence: pattern.confidence,
          source: 'auto_generated',
          validationScore: pattern.significance
        };
        
        rules.push(rule);
      }
    }
    
    console.log(`🧠 自動ルール生成: ${rules.length}ルール作成`);
    return rules;
  }

  /**
   * フィードバック収集の実装
   */
  private collectFeedback(detected: DetectedPhenomenon[], annotations: HumanAnnotation[]): EvaluationResult {
    const agreement = this.calculateAgreement(detected, annotations);
    const discrepancies = this.findDiscrepancies(detected, annotations);
    
    return {
      agreement,
      discrepancies,
      systemStrengths: ['パターン発見能力'],
      systemWeaknesses: discrepancies.length > 0 ? ['精度向上必要'] : [],
      recommendedAdjustments: []
    };
  }

  private calculateAgreement(detected: DetectedPhenomenon[], annotations: HumanAnnotation[]): number {
    if (annotations.length === 0) return 0.5; // デフォルト
    
    let matches = 0;
    let total = Math.max(detected.length, annotations.length);
    
    for (const phenomenon of detected) {
      const hasAnnotation = annotations.some(ann => 
        ann.annotatedPhenomena.includes(phenomenon.name)
      );
      if (hasAnnotation) matches++;
    }
    
    return total > 0 ? matches / total : 0;
  }

  private findDiscrepancies(detected: DetectedPhenomenon[], annotations: HumanAnnotation[]): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];
    
    // 簡略実装
    const allPhenomena = new Set([
      ...detected.map(d => d.name),
      ...annotations.flatMap(a => a.annotatedPhenomena)
    ]);
    
    for (const phenomenon of allPhenomena) {
      const systemDetected = detected.some(d => d.name === phenomenon);
      const humanAnnotated = annotations.some(a => a.annotatedPhenomena.includes(phenomenon));
      
      if (systemDetected !== humanAnnotated) {
        discrepancies.push({
          phenomenonName: phenomenon,
          systemDetected,
          humanAnnotated,
          confidenceDifference: 0.3,
          reasonAnalysis: 'システムと人間の判断に相違'
        });
      }
    }
    
    return discrepancies;
  }

  private calculateDiscoveryConfidence(anomalies: ConceptAnomaly[], patterns: NewPatternDiscovery[]): number {
    // 発見信頼度計算
    if (anomalies.length === 0 && patterns.length === 0) return 0;
    return Math.min(0.8, (anomalies.length * 0.1 + patterns.length * 0.2));
  }

  private calculateNoveltyScore(patterns: NewPatternDiscovery[]): number {
    // 新規性スコア計算
    return patterns.reduce((sum, p) => sum + p.significance, 0) / Math.max(patterns.length, 1);
  }

  private generateActionRecommendations(
    patterns: NewPatternDiscovery[], 
    anomalies: ConceptAnomaly[]
  ): SystemImprovement[] {
    // システム改善提案生成
    const recommendations: SystemImprovement[] = [];
    
    if (patterns.length > 3) {
      recommendations.push({
        priority: 'high',
        category: 'detection_accuracy',
        description: '新パターン統合による検出精度向上',
        estimatedImpact: 0.15,
        implementationComplexity: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * 進化的学習の統計情報取得
   */
  public getEvolutionaryStats(): {
    totalDiscoveries: number;
    averageNoveltyScore: number;
    patternEvolutionRate: number;
    discoveryHistory: number;
  } {
    const totalPatterns = this.discoveryHistory.reduce((sum, r) => sum + r.newPatterns.length, 0);
    const avgNovelty = this.discoveryHistory.reduce((sum, r) => sum + r.noveltyScore, 0) / Math.max(this.discoveryHistory.length, 1);
    
    return {
      totalDiscoveries: totalPatterns,
      averageNoveltyScore: avgNovelty,
      patternEvolutionRate: this.discoveryHistory.length > 1 ? totalPatterns / this.discoveryHistory.length : 0,
      discoveryHistory: this.discoveryHistory.length
    };
  }
}