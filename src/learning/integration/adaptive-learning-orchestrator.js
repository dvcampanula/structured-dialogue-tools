/**
 * Adaptive Learning Orchestrator - 統合学習システム制御
 * 
 * UCB多腕バンディット、N-gram、分布意味論、A/Bテストを統合管理
 * リアルタイム品質評価とアルゴリズム選択最適化
 */

import { ABTestFramework } from '../../testing/ab-test-framework.js';
import { persistentLearningDB } from '../../data/persistent-learning-db.js';

/**
 * Adaptive Learning Orchestrator
 * 統合学習システムの中央制御クラス
 */
export class AdaptiveLearningOrchestrator {
  constructor(ngramAI, vocabularyBandit, learningConfig = {}) {
    this.ngramAI = ngramAI;
    this.vocabularyBandit = vocabularyBandit;
    this.abTestFramework = new ABTestFramework(learningConfig);
    
    // 統合制御設定
    this.orchestrationConfig = {
      enableABTesting: learningConfig.enableABTesting !== false,
      qualityThreshold: learningConfig.qualityThreshold || 0.7,
      adaptiveSelectionEnabled: learningConfig.adaptiveSelectionEnabled !== false,
      performanceMonitoringEnabled: learningConfig.performanceMonitoringEnabled !== false,
      minSampleSizeForTest: learningConfig.minSampleSizeForTest || 50,
      maxConcurrentTests: learningConfig.maxConcurrentTests || 3
    };
    
    // パフォーマンス追跡
    this.performanceMetrics = new Map();
    this.runningTests = new Map();
    this.algorithmPerformanceHistory = [];
    
    // アルゴリズム選択戦略
    this.selectionStrategies = new Map([
      ['semantic_only', this.selectVocabularySemanticOnly.bind(this)],
      ['bandit_only', this.selectVocabularyBanditOnly.bind(this)],
      ['hybrid_balanced', this.selectVocabularyHybridBalanced.bind(this)],
      ['hybrid_bandit_heavy', this.selectVocabularyHybridBanditHeavy.bind(this)],
      ['hybrid_semantic_heavy', this.selectVocabularyHybridSemanticHeavy.bind(this)]
    ]);
    
    this.currentStrategy = 'hybrid_balanced';
    
    console.log('🎭 Adaptive Learning Orchestrator初期化完了');
  }

  /**
   * 統合語彙選択: A/Bテスト + 適応的アルゴリズム選択
   * @param {Array<string>} contextTokens - 文脈トークン
   * @param {Array<string>} candidateTerms - 候補語彙
   * @param {Object} options - オプション
   * @returns {Promise<Object>} 最適化された選択結果
   */
  async selectOptimalVocabulary(contextTokens, candidateTerms, options = {}) {
    const sessionId = options.sessionId || `session_${Date.now()}`;
    const requestId = `${sessionId}_${this.performanceMetrics.size}`;
    
    // 1. A/Bテスト実行判定
    if (this.shouldRunABTest(contextTokens, candidateTerms)) {
      return await this.runABTestVocabularySelection(contextTokens, candidateTerms, options, requestId);
    }
    
    // 2. 適応的アルゴリズム選択
    const selectedStrategy = await this.selectOptimalStrategy(contextTokens, candidateTerms);
    const startTime = Date.now();
    
    // 3. 選択された戦略で語彙選択実行
    const result = await this.executeStrategy(selectedStrategy, contextTokens, candidateTerms, options);
    
    // 4. パフォーマンス記録
    const endTime = Date.now();
    await this.recordPerformance(requestId, selectedStrategy, result, endTime - startTime);
    
    return {
      ...result,
      selectedStrategy,
      requestId,
      processingTime: endTime - startTime,
      orchestratorMetadata: {
        abTestEnabled: this.orchestrationConfig.enableABTesting,
        strategiesAvailable: Array.from(this.selectionStrategies.keys()),
        currentOptimalStrategy: selectedStrategy
      }
    };
  }

  /**
   * A/Bテスト実行判定
   */
  shouldRunABTest(contextTokens, candidateTerms) {
    if (!this.orchestrationConfig.enableABTesting) return false;
    if (candidateTerms.length < this.orchestrationConfig.minSampleSizeForTest) return false;
    if (this.runningTests.size >= this.orchestrationConfig.maxConcurrentTests) return false;
    
    // 語彙多様性に基づくテスト価値判定
    const diversityScore = this.calculateVocabularyDiversity(candidateTerms);
    return diversityScore > 0.5; // 多様性が高い場合のみA/Bテスト実行
  }

  /**
   * A/Bテスト語彙選択実行
   */
  async runABTestVocabularySelection(contextTokens, candidateTerms, options, requestId) {
    const testId = `vocab_test_${requestId}`;
    
    // テストケース生成
    const testCases = candidateTerms.map(term => ({
      input: { contextTokens, targetTerm: term },
      expected: null // 品質は後で評価
    }));
    
    // アルゴリズムA: セマンティック選択
    const algorithmA = {
      name: 'Semantic Selection',
      execute: async (input) => {
        return await this.ngramAI.selectSemanticallyAppropriateVocabulary(
          input.contextTokens, 
          [input.targetTerm], 
          1
        );
      }
    };
    
    // アルゴリズムB: UCB統合選択
    const algorithmB = {
      name: 'UCB Integrated Selection',
      execute: async (input) => {
        return await this.ngramAI.selectOptimalVocabularyWithBandit(
          input.contextTokens,
          [input.targetTerm],
          { maxResults: 1 }
        );
      }
    };
    
    try {
      // A/Bテスト実行
      this.runningTests.set(testId, { startTime: Date.now(), contextTokens, candidateTerms });
      const abTestResult = await this.abTestFramework.runAlgorithmComparison(
        testId, 
        algorithmA, 
        algorithmB, 
        testCases
      );
      
      // 勝利アルゴリズムの決定ロジックを修正
      let winningAlgorithmName;
      const qualityA = abTestResult.algorithmA.metrics.averageQuality;
      const qualityB = abTestResult.algorithmB.metrics.averageQuality;

      if (abTestResult.isSignificant) {
        winningAlgorithmName = qualityA > qualityB ? 'semantic_only' : 'hybrid_balanced';
      } else {
        // 有意差がない場合は、品質がわずかでも高い方を選択
        winningAlgorithmName = qualityA > qualityB ? 'semantic_only' : 'hybrid_balanced';
      }

      const finalResult = await this.executeStrategy(winningAlgorithmName, contextTokens, candidateTerms, options);
      
      this.runningTests.delete(testId);
      
      return {
        ...finalResult,
        abTestResult,
        selectedViaABTest: true,
        winningAlgorithm: winningAlgorithmName,
        testId
      };
      
    } catch (error) {
      console.error(`❌ A/Bテストエラー ${testId}:`, error.message);
      this.runningTests.delete(testId);
      
      // フォールバック: デフォルト戦略
      return await this.executeStrategy('hybrid_balanced', contextTokens, candidateTerms, options);
    }
  }

  /**
   * 最適戦略選択
   */
  async selectOptimalStrategy(contextTokens, candidateTerms) {
    if (!this.orchestrationConfig.adaptiveSelectionEnabled) {
      return this.currentStrategy;
    }
    
    // 履歴ベース戦略選択
    const recentPerformance = this.algorithmPerformanceHistory
      .slice(-10) // 直近10回
      .reduce((acc, record) => {
        if (!acc[record.strategy]) acc[record.strategy] = [];
        acc[record.strategy].push(record.quality);
        return acc;
      }, {});
    
    // 各戦略の平均品質計算
    let bestStrategy = this.currentStrategy;
    let bestQuality = 0;
    
    for (const [strategy, qualities] of Object.entries(recentPerformance)) {
      if (qualities.length >= 3) { // 最低3サンプル必要
        const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
        if (avgQuality > bestQuality) {
          bestQuality = avgQuality;
          bestStrategy = strategy;
        }
      }
    }
    
    return bestStrategy;
  }

  /**
   * 戦略実行
   */
  async executeStrategy(strategy, contextTokens, candidateTerms, options) {
    const strategyFunction = this.selectionStrategies.get(strategy);
    if (!strategyFunction) {
      console.warn(`⚠️ 未知の戦略: ${strategy}, デフォルトにフォールバック`);
      return await this.selectVocabularyHybridBalanced(contextTokens, candidateTerms, options);
    }
    
    return await strategyFunction(contextTokens, candidateTerms, options);
  }

  // ===== 戦略実装 =====

  async selectVocabularySemanticOnly(contextTokens, candidateTerms, options) {
    const results = await this.ngramAI.selectSemanticallyAppropriateVocabulary(
      contextTokens, 
      candidateTerms, 
      options.maxResults || 5
    );
    
    return {
      selectedTerm: results[0]?.term || candidateTerms[0],
      results: results.map(r => ({ term: r.term || r, score: Math.min(1.0, r.semanticScore || 0.5) })),
      strategy: 'semantic_only',
      confidence: results.length > 0 ? 0.8 : 0.3
    };
  }

  async selectVocabularyBanditOnly(contextTokens, candidateTerms, options) {
    if (this.vocabularyBandit) {
      const selectedTerm = await this.vocabularyBandit.selectVocabulary(candidateTerms);
      return {
        selectedTerm,
        results: [{ term: selectedTerm, score: 1.0 }],
        strategy: 'bandit_only',
        confidence: 0.9
      };
    }
    
    return await this.selectVocabularySemanticOnly(contextTokens, candidateTerms, options);
  }

  async selectVocabularyHybridBalanced(contextTokens, candidateTerms, options) {
    if (this.ngramAI.banditIntegrationEnabled) {
      const result = await this.ngramAI.selectOptimalVocabularyWithBandit(
        contextTokens,
        candidateTerms,
        { ...options, banditWeight: 0.5, semanticWeight: 0.5 }
      );
      result.confidence = result.results.reduce((sum, r) => sum + r.hybridScore, 0) / (result.results.length || 1);
      return result;
    }
    
    return await this.selectVocabularySemanticOnly(contextTokens, candidateTerms, options);
  }

  async selectVocabularyHybridBanditHeavy(contextTokens, candidateTerms, options) {
    if (this.ngramAI.banditIntegrationEnabled) {
      const result = await this.ngramAI.selectOptimalVocabularyWithBandit(
        contextTokens,
        candidateTerms,
        { ...options, banditWeight: 0.7, semanticWeight: 0.3 }
      );
      result.confidence = result.results.reduce((sum, r) => sum + r.hybridScore, 0) / (result.results.length || 1);
      return result;
    }
    
    return await this.selectVocabularyBanditOnly(contextTokens, candidateTerms, options);
  }

  async selectVocabularyHybridSemanticHeavy(contextTokens, candidateTerms, options) {
    if (this.ngramAI.banditIntegrationEnabled) {
      const result = await this.ngramAI.selectOptimalVocabularyWithBandit(
        contextTokens,
        candidateTerms,
        { ...options, banditWeight: 0.3, semanticWeight: 0.7 }
      );
      result.confidence = result.results.reduce((sum, r) => sum + r.hybridScore, 0) / (result.results.length || 1);
      return result;
    }
    
    return await this.selectVocabularySemanticOnly(contextTokens, candidateTerms, options);
  }

  // ===== ユーティリティメソッド =====

  calculateVocabularyDiversity(candidateTerms) {
    if (candidateTerms.length < 2) return 0;
    
    const uniqueLengths = new Set(candidateTerms.map(term => term.length)).size;
    const avgLength = candidateTerms.reduce((sum, term) => sum + term.length, 0) / candidateTerms.length;
    const lengthVariance = candidateTerms.reduce((sum, term) => sum + Math.pow(term.length - avgLength, 2), 0) / candidateTerms.length;
    
    return Math.min(1.0, (uniqueLengths / candidateTerms.length) + (Math.sqrt(lengthVariance) / avgLength));
  }

  async recordPerformance(requestId, strategy, result, processingTime) {
    const quality = this.estimateResultQuality(result);
    
    const performanceRecord = {
      requestId,
      strategy,
      quality,
      processingTime,
      timestamp: Date.now(),
      selectedTerm: result.selectedTerm,
      confidence: result.confidence || 0.5
    };
    
    this.performanceMetrics.set(requestId, performanceRecord);
    this.algorithmPerformanceHistory.push(performanceRecord);
    
    // 履歴サイズ制限
    if (this.algorithmPerformanceHistory.length > 100) {
      this.algorithmPerformanceHistory = this.algorithmPerformanceHistory.slice(-50);
    }
    
    // UCBフィードバック学習
    if (this.vocabularyBandit && result.selectedTerm) {
      await this.vocabularyBandit.updateRewards(result.selectedTerm, quality);
    }
  }

  estimateResultQuality(result) {
    // 適応的統計学的品質評価: 文脈依存重み配分
    if (result.results && result.results.length > 0) {
      
      // 1. 情報理論的多様性評価 (Shannon entropy)
      const termFreq = new Map();
      result.results.forEach(r => {
        const term = r.term || r;
        const count = termFreq.get(term) || 0;
        termFreq.set(term, count + 1);
      });
      
      let shannonEntropy = 0;
      const total = result.results.length;
      for (const freq of termFreq.values()) {
        const p = freq / total;
        shannonEntropy -= p * Math.log2(p);
      }
      const maxEntropy = Math.log2(Math.min(termFreq.size, total));
      const entropyScore = maxEntropy > 0 ? shannonEntropy / maxEntropy : 0;
      
      // 2. 統計的安定性評価 (分散の逆数)
      const scores = result.results.map(r => r.score || r.hybridScore || 0);
      const validScores = scores.filter(s => isFinite(s));
      
      if (validScores.length === 0) return 0.1;
      
      const mean = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
      const variance = validScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / validScores.length;
      const stabilityScore = variance > 0 ? 1 / (1 + variance) : 1.0;
      
      // 3. 統計的信頼性評価 (有限スコア比率)
      const reliabilityScore = validScores.length / scores.length;
      
      // 4. 分布の健全性評価 (正規化された平均)
      const normalizedMean = validScores.length > 0 ? 
        Math.min(1.0, Math.max(0.0, mean)) : 0.0;
      
      // 5. 適応的重み配分: 文脈・タスク・データ特性に基づく
      const contextSize = result.contextTokens?.length || 3;
      const candidateSize = result.results.length;
      const taskComplexity = Math.log2(candidateSize + 1);
      const strategyType = result.strategy || 'unknown';
      
      // 文脈長による適応: 短文脈→多様性重視、長文脈→安定性重視
      let entropyWeight = Math.max(0.2, 0.6 - (contextSize * 0.04));
      
      // タスク複雑性による適応: 複雑→安定性重視、単純→分布重視
      let stabilityWeight = Math.min(0.4, 0.15 + (taskComplexity * 0.08));
      
      // 候補数による適応: 少数→信頼性重視、多数→エントロピー重視
      let reliabilityWeight = Math.max(0.1, 0.25 - (candidateSize * 0.015));
      
      // 戦略タイプによる適応
      const strategyAdjustment = {
        'semantic_only': { entropy: 0.1, stability: -0.05, reliability: 0.05 },
        'bandit_only': { entropy: -0.1, stability: 0.1, reliability: 0.05 },
        'hybrid_balanced': { entropy: 0.0, stability: 0.0, reliability: 0.0 },
        'hybrid_bandit_heavy': { entropy: -0.05, stability: 0.05, reliability: 0.0 },
        'hybrid_semantic_heavy': { entropy: 0.05, stability: -0.05, reliability: 0.0 }
      };
      
      const adjustment = strategyAdjustment[strategyType] || { entropy: 0, stability: 0, reliability: 0 };
      entropyWeight += adjustment.entropy;
      stabilityWeight += adjustment.stability;
      reliabilityWeight += adjustment.reliability;
      
      // 分布重みは残り全て
      let distributionWeight = 1.0 - entropyWeight - stabilityWeight - reliabilityWeight;
      
      // 重み正規化 (負値防止)
      entropyWeight = Math.max(0.1, entropyWeight);
      stabilityWeight = Math.max(0.1, stabilityWeight);
      reliabilityWeight = Math.max(0.1, reliabilityWeight);
      distributionWeight = Math.max(0.1, distributionWeight);
      
      const totalWeight = entropyWeight + stabilityWeight + reliabilityWeight + distributionWeight;
      const normalizedWeights = {
        entropy: entropyWeight / totalWeight,
        stability: stabilityWeight / totalWeight,
        reliability: reliabilityWeight / totalWeight,
        distribution: distributionWeight / totalWeight
      };
      
      // 適応的品質スコア計算
      const qualityScore = (entropyScore * normalizedWeights.entropy) + 
                          (stabilityScore * normalizedWeights.stability) + 
                          (reliabilityScore * normalizedWeights.reliability) + 
                          (normalizedMean * normalizedWeights.distribution);
      
      // デバッグ情報 (必要に応じて)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 適応的品質評価: ${strategyType}`);
        console.log(`  文脈長: ${contextSize}, 候補数: ${candidateSize}, 複雑度: ${taskComplexity.toFixed(2)}`);
        console.log(`  重み - エントロピー: ${normalizedWeights.entropy.toFixed(3)}, 安定性: ${normalizedWeights.stability.toFixed(3)}, 信頼性: ${normalizedWeights.reliability.toFixed(3)}, 分布: ${normalizedWeights.distribution.toFixed(3)}`);
        console.log(`  スコア - エントロピー: ${entropyScore.toFixed(3)}, 安定性: ${stabilityScore.toFixed(3)}, 信頼性: ${reliabilityScore.toFixed(3)}, 分布: ${normalizedMean.toFixed(3)}`);
        console.log(`  最終品質: ${qualityScore.toFixed(4)}`);
      }
      
      return Math.min(1.0, Math.max(0.1, qualityScore));
    }
    
    // フォールバック: 戦略固有の理論的品質
    const strategyBaseQuality = {
      'semantic_only': 0.6,    // 単一手法の限界
      'bandit_only': 0.7,      // 学習による向上
      'hybrid_balanced': 0.75, // バランス効果
      'hybrid_bandit_heavy': 0.7,  // 学習重視
      'hybrid_semantic_heavy': 0.65 // 意味重視
    };
    
    return strategyBaseQuality[result.strategy] || result.confidence || 0.5;
  }

  // ===== 統計・レポート =====

  getPerformanceReport() {
    const strategies = Array.from(this.selectionStrategies.keys());
    const report = strategies.map(strategy => {
      const records = this.algorithmPerformanceHistory.filter(r => r.strategy === strategy);
      
      if (records.length === 0) {
        return { strategy, usage: 0, avgQuality: 0, avgProcessingTime: 0 };
      }
      
      const avgQuality = records.reduce((sum, r) => sum + r.quality, 0) / records.length;
      const avgProcessingTime = records.reduce((sum, r) => sum + r.processingTime, 0) / records.length;
      
      return {
        strategy,
        usage: records.length,
        avgQuality: Math.round(avgQuality * 10000) / 10000,
        avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
        lastUsed: Math.max(...records.map(r => r.timestamp))
      };
    });
    
    return {
      totalRequests: this.performanceMetrics.size,
      runningABTests: this.runningTests.size,
      strategiesPerformance: report.sort((a, b) => b.avgQuality - a.avgQuality),
      currentOptimalStrategy: this.currentStrategy,
      abTestsCompleted: this.abTestFramework.getAllTestResults().length
    };
  }

  getCurrentOptimalStrategy() {
    return this.currentStrategy;
  }

  setStrategy(strategy) {
    if (this.selectionStrategies.has(strategy)) {
      this.currentStrategy = strategy;
      console.log(`🎯 戦略変更: ${strategy}`);
    } else {
      console.warn(`⚠️ 未知の戦略: ${strategy}`);
    }
  }
}

export default AdaptiveLearningOrchestrator;