#!/usr/bin/env node

/**
 * SessionLearningSystem - セッションデータベース学習システム
 * 
 * web_session_database.jsonから実際の使用パターンを学習し、
 * 概念抽出精度の向上・ユーザー固有パターン検出・品質予測改善を実現
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface SessionLearningData {
  totalSessions: number;
  conceptFrequency: Map<string, ConceptUsagePattern>;
  userPatterns: Map<string, UserConceptPattern>;
  qualityTrends: QualityTrendAnalysis;
  innovationLevelDistribution: Map<number, number>;
  temporalPatterns: TemporalPattern[];
  lastLearningUpdate: string;
}

export interface ConceptUsagePattern {
  term: string;
  frequency: number;
  averageConfidence: number;
  classifications: { surface: number; deep: number };
  contexts: string[]; // ファイル名パターン
  userFeedback: UserFeedbackPattern[];
  qualityCorrelation: number; // 高品質セッションでの出現率
}

export interface UserConceptPattern {
  preferredConcepts: string[];
  innovationLevel: number;
  sessionCount: number;
  qualityAverage: number;
  conceptDiversity: number; // 使用概念の多様性
  temporalEvolution: ConceptEvolution[];
}

export interface QualityTrendAnalysis {
  averageInnovationLevel: number;
  confidenceTrends: number[];
  conceptDensityTrends: number[];
  successPatterns: string[];
  failurePatterns: string[];
}

export interface TemporalPattern {
  timeWindow: string; // 'daily', 'weekly', 'monthly'
  conceptTrends: Array<{
    concept: string;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    significance: number;
  }>;
  qualityEvolution: number[];
}

export interface UserFeedbackPattern {
  sessionId: string;
  expectedConcepts: string[];
  missedConcepts: string[];
  overExtracted: string[];
  userSatisfaction: number; // 推定値
}

export interface ConceptEvolution {
  timestamp: string;
  concepts: string[];
  innovationLevel: number;
  context: string;
}

export class SessionLearningSystem {
  private sessionDbPath: string;
  private learningData: SessionLearningData | null = null;
  private analysisCache: Map<string, any> = new Map();

  constructor(sessionDbPath: string = './web_session_database.json') {
    this.sessionDbPath = sessionDbPath;
  }

  /**
   * セッションデータベースから学習データを構築
   */
  async buildLearningData(): Promise<SessionLearningData> {
    console.log('📊 セッション学習データ構築開始...');
    
    try {
      const sessionData = await this.loadSessionDatabase();
      
      const learningData: SessionLearningData = {
        totalSessions: sessionData.sessions.length,
        conceptFrequency: new Map(),
        userPatterns: new Map(),
        qualityTrends: await this.analyzeQualityTrends(sessionData.sessions),
        innovationLevelDistribution: new Map(),
        temporalPatterns: await this.analyzeTemporalPatterns(sessionData.sessions),
        lastLearningUpdate: new Date().toISOString()
      };

      // 概念使用パターンの分析
      await this.analyzeConceptUsagePatterns(sessionData.sessions, learningData);
      
      // ユーザーパターンの分析
      await this.analyzeUserPatterns(sessionData.sessions, learningData);
      
      // 革新度分布の分析
      this.analyzeInnovationDistribution(sessionData.sessions, learningData);
      
      this.learningData = learningData;
      
      console.log(`✅ 学習データ構築完了: ${learningData.totalSessions}セッション, ${learningData.conceptFrequency.size}概念`);
      
      return learningData;
      
    } catch (error) {
      console.error('❌ 学習データ構築エラー:', error);
      throw error;
    }
  }

  /**
   * セッションデータベースの読み込み
   */
  private async loadSessionDatabase(): Promise<{ sessions: any[] }> {
    const data = await fs.readFile(this.sessionDbPath, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * 概念使用パターンの分析
   */
  private async analyzeConceptUsagePatterns(sessions: any[], learningData: SessionLearningData): Promise<void> {
    console.log('🔍 概念使用パターン分析中...');
    
    for (const session of sessions) {
      if (!session.analysis?.conceptExtraction) continue;
      
      const concepts = [
        ...(session.analysis.conceptExtraction.surfaceConcepts || []),
        ...(session.analysis.conceptExtraction.deepConcepts || [])
      ];
      
      for (const concept of concepts) {
        const term = concept.term;
        let pattern = learningData.conceptFrequency.get(term);
        
        if (!pattern) {
          pattern = {
            term,
            frequency: 0,
            averageConfidence: 0,
            classifications: { surface: 0, deep: 0 },
            contexts: [],
            userFeedback: [],
            qualityCorrelation: 0
          };
          learningData.conceptFrequency.set(term, pattern);
        }
        
        // 使用頻度・信頼度の更新
        pattern.frequency++;
        pattern.averageConfidence = this.updateAverage(
          pattern.averageConfidence, 
          concept.confidence, 
          pattern.frequency
        );
        
        // 分類の記録
        if (concept.classification === 'surface') {
          pattern.classifications.surface++;
        } else if (concept.classification === 'deep') {
          pattern.classifications.deep++;
        }
        
        // コンテキストの記録
        if (session.filename && !pattern.contexts.includes(session.filename)) {
          pattern.contexts.push(session.filename);
        }
        
        // 品質相関の計算
        const sessionQuality = this.calculateSessionQuality(session);
        pattern.qualityCorrelation = this.updateAverage(
          pattern.qualityCorrelation,
          sessionQuality,
          pattern.frequency
        );
      }
    }
  }

  /**
   * ユーザーパターンの分析
   */
  private async analyzeUserPatterns(sessions: any[], learningData: SessionLearningData): Promise<void> {
    console.log('👤 ユーザーパターン分析中...');
    
    // セッションIDから疑似ユーザーIDを抽出（実際の実装では認証情報を使用）
    const userSessions = new Map<string, any[]>();
    
    for (const session of sessions) {
      const userId = this.extractUserId(session.id); // 疑似ユーザーID
      
      if (!userSessions.has(userId)) {
        userSessions.set(userId, []);
      }
      userSessions.get(userId)!.push(session);
    }
    
    for (const [userId, userSessionList] of userSessions.entries()) {
      const pattern: UserConceptPattern = {
        preferredConcepts: this.extractPreferredConcepts(userSessionList),
        innovationLevel: this.calculateUserInnovationLevel(userSessionList),
        sessionCount: userSessionList.length,
        qualityAverage: this.calculateUserQualityAverage(userSessionList),
        conceptDiversity: this.calculateConceptDiversity(userSessionList),
        temporalEvolution: this.extractConceptEvolution(userSessionList)
      };
      
      learningData.userPatterns.set(userId, pattern);
    }
  }

  /**
   * 品質トレンドの分析
   */
  private async analyzeQualityTrends(sessions: any[]): Promise<QualityTrendAnalysis> {
    console.log('📈 品質トレンド分析中...');
    
    const innovationLevels = sessions
      .filter(s => s.analysis?.conceptExtraction?.predictedInnovationLevel)
      .map(s => s.analysis.conceptExtraction.predictedInnovationLevel);
      
    const confidenceValues = sessions
      .filter(s => s.analysis?.conceptExtraction?.confidence)
      .map(s => s.analysis.conceptExtraction.confidence);
    
    return {
      averageInnovationLevel: this.calculateAverage(innovationLevels),
      confidenceTrends: this.calculateTrends(confidenceValues),
      conceptDensityTrends: this.calculateConceptDensityTrends(sessions),
      successPatterns: this.identifySuccessPatterns(sessions),
      failurePatterns: this.identifyFailurePatterns(sessions)
    };
  }

  /**
   * 時系列パターンの分析
   */
  private async analyzeTemporalPatterns(sessions: any[]): Promise<TemporalPattern[]> {
    console.log('⏰ 時系列パターン分析中...');
    
    // タイムスタンプでソート
    const sortedSessions = sessions.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return [
      await this.analyzeDailyPatterns(sortedSessions),
      await this.analyzeWeeklyPatterns(sortedSessions),
      await this.analyzeMonthlyPatterns(sortedSessions)
    ];
  }

  /**
   * 革新度分布の分析
   */
  private analyzeInnovationDistribution(sessions: any[], learningData: SessionLearningData): void {
    for (const session of sessions) {
      const innovationLevel = session.analysis?.conceptExtraction?.predictedInnovationLevel;
      if (typeof innovationLevel === 'number') {
        const rounded = Math.round(innovationLevel);
        learningData.innovationLevelDistribution.set(
          rounded,
          (learningData.innovationLevelDistribution.get(rounded) || 0) + 1
        );
      }
    }
  }

  /**
   * 学習データに基づく概念予測
   */
  async predictConcepts(context: string, currentConcepts: string[]): Promise<Array<{
    concept: string;
    probability: number;
    reasoning: string;
    source: 'session_learning';
  }>> {
    if (!this.learningData) {
      await this.buildLearningData();
    }
    
    const predictions: Array<{
      concept: string;
      probability: number;
      reasoning: string;
      source: 'session_learning';
    }> = [];
    
    // 文脈に基づく概念予測
    for (const [concept, pattern] of this.learningData!.conceptFrequency.entries()) {
      if (currentConcepts.includes(concept)) continue;
      
      const contextMatch = pattern.contexts.some(ctx => 
        this.calculateContextSimilarity(context, ctx) > 0.7
      );
      
      if (contextMatch && pattern.frequency > 2) {
        const probability = Math.min(0.9, 
          (pattern.frequency / this.learningData!.totalSessions) * 
          pattern.averageConfidence * 
          pattern.qualityCorrelation
        );
        
        if (probability > 0.3) {
          predictions.push({
            concept,
            probability,
            reasoning: `セッション学習: ${pattern.frequency}回出現, 品質相関${pattern.qualityCorrelation.toFixed(2)}`,
            source: 'session_learning'
          });
        }
      }
    }
    
    return predictions.sort((a, b) => b.probability - a.probability).slice(0, 5);
  }

  /**
   * 学習データの統計情報取得
   */
  getLearningStats(): {
    totalSessions: number;
    uniqueConcepts: number;
    userPatterns: number;
    averageInnovationLevel: number;
    topConcepts: Array<{ concept: string; frequency: number; confidence: number }>;
    qualityTrends: any;
  } | null {
    if (!this.learningData) return null;
    
    const topConcepts = Array.from(this.learningData.conceptFrequency.entries())
      .sort(([,a], [,b]) => b.frequency - a.frequency)
      .slice(0, 10)
      .map(([concept, pattern]) => ({
        concept,
        frequency: pattern.frequency,
        confidence: pattern.averageConfidence
      }));
    
    return {
      totalSessions: this.learningData.totalSessions,
      uniqueConcepts: this.learningData.conceptFrequency.size,
      userPatterns: this.learningData.userPatterns.size,
      averageInnovationLevel: this.learningData.qualityTrends.averageInnovationLevel,
      topConcepts,
      qualityTrends: this.learningData.qualityTrends
    };
  }

  // ヘルパーメソッド群
  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  private calculateSessionQuality(session: any): number {
    const extraction = session.analysis?.conceptExtraction;
    if (!extraction) return 0;
    
    return (
      (extraction.predictedInnovationLevel || 0) / 10 * 0.4 +
      (extraction.confidence || 0) / 100 * 0.3 +
      (extraction.surfaceConcepts?.length || 0) / 10 * 0.15 +
      (extraction.deepConcepts?.length || 0) / 5 * 0.15
    );
  }

  private extractUserId(sessionId: string): string {
    // 実際の実装では認証情報から取得
    return sessionId.split('_')[1] || 'anonymous';
  }

  private extractPreferredConcepts(sessions: any[]): string[] {
    const conceptCounts = new Map<string, number>();
    
    for (const session of sessions) {
      const concepts = [
        ...(session.analysis?.conceptExtraction?.surfaceConcepts || []),
        ...(session.analysis?.conceptExtraction?.deepConcepts || [])
      ];
      
      for (const concept of concepts) {
        conceptCounts.set(concept.term, (conceptCounts.get(concept.term) || 0) + 1);
      }
    }
    
    return Array.from(conceptCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([concept,]) => concept);
  }

  private calculateUserInnovationLevel(sessions: any[]): number {
    const levels = sessions
      .filter(s => s.analysis?.conceptExtraction?.predictedInnovationLevel)
      .map(s => s.analysis.conceptExtraction.predictedInnovationLevel);
    
    return levels.length > 0 ? this.calculateAverage(levels) : 0;
  }

  private calculateUserQualityAverage(sessions: any[]): number {
    return this.calculateAverage(sessions.map(s => this.calculateSessionQuality(s)));
  }

  private calculateConceptDiversity(sessions: any[]): number {
    const allConcepts = new Set<string>();
    
    for (const session of sessions) {
      const concepts = [
        ...(session.analysis?.conceptExtraction?.surfaceConcepts || []),
        ...(session.analysis?.conceptExtraction?.deepConcepts || [])
      ];
      
      for (const concept of concepts) {
        allConcepts.add(concept.term);
      }
    }
    
    return allConcepts.size / Math.max(sessions.length, 1);
  }

  private extractConceptEvolution(sessions: any[]): ConceptEvolution[] {
    return sessions.map(session => ({
      timestamp: session.timestamp,
      concepts: [
        ...(session.analysis?.conceptExtraction?.surfaceConcepts || []),
        ...(session.analysis?.conceptExtraction?.deepConcepts || [])
      ].map(c => c.term),
      innovationLevel: session.analysis?.conceptExtraction?.predictedInnovationLevel || 0,
      context: session.filename || 'unknown'
    }));
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private calculateTrends(values: number[]): number[] {
    // 簡単な移動平均によるトレンド計算
    const windowSize = 5;
    const trends: number[] = [];
    
    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i);
      trends.push(this.calculateAverage(window));
    }
    
    return trends;
  }

  private calculateConceptDensityTrends(sessions: any[]): number[] {
    return sessions.map(session => {
      const concepts = [
        ...(session.analysis?.conceptExtraction?.surfaceConcepts || []),
        ...(session.analysis?.conceptExtraction?.deepConcepts || [])
      ];
      return concepts.length;
    });
  }

  private identifySuccessPatterns(sessions: any[]): string[] {
    // 高品質セッションのパターンを特定
    const highQualitySessions = sessions.filter(s => this.calculateSessionQuality(s) > 0.7);
    return highQualitySessions.map(s => s.filename || 'unknown').slice(0, 5);
  }

  private identifyFailurePatterns(sessions: any[]): string[] {
    // 低品質セッションのパターンを特定
    const lowQualitySessions = sessions.filter(s => this.calculateSessionQuality(s) < 0.3);
    return lowQualitySessions.map(s => s.filename || 'unknown').slice(0, 5);
  }

  private async analyzeDailyPatterns(sessions: any[]): Promise<TemporalPattern> {
    // 日次パターンの分析実装
    return {
      timeWindow: 'daily',
      conceptTrends: [],
      qualityEvolution: []
    };
  }

  private async analyzeWeeklyPatterns(sessions: any[]): Promise<TemporalPattern> {
    // 週次パターンの分析実装
    return {
      timeWindow: 'weekly',
      conceptTrends: [],
      qualityEvolution: []
    };
  }

  private async analyzeMonthlyPatterns(sessions: any[]): Promise<TemporalPattern> {
    // 月次パターンの分析実装
    return {
      timeWindow: 'monthly',
      conceptTrends: [],
      qualityEvolution: []
    };
  }

  private calculateContextSimilarity(context1: string, context2: string): number {
    // 簡単な文字列類似度計算
    const words1 = context1.toLowerCase().split(/\W+/);
    const words2 = context2.toLowerCase().split(/\W+/);
    
    const intersection = words1.filter(word => words2.includes(word)).length;
    const union = new Set([...words1, ...words2]).size;
    
    return intersection / union;
  }
}