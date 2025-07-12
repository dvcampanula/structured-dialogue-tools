#!/usr/bin/env node

/**
 * 統計的応答生成AI - StatisticalResponseGenerator
 * Phase 4: 5AI統合システムを活用した統計学習ベース応答生成
 * 
 * 機能:
 * - 既存5AI(MultiArmedBandit, N-gram, Bayesian, CoOccurrence, QualityPrediction)を活用
 * - 統計的応答戦略選択(UCBアルゴリズム)
 * - 品質評価・自己修正システム
 * - 対話履歴管理・学習データ蓄積
 */

import { AIVocabularyProcessor } from '../../processing/vocabulary/ai-vocabulary-processor.js';
import { PersistentLearningDB } from '../../data/persistent-learning-db.js';

// 応答戦略パターン定義
const ResponseStrategies = {
  NGRAM_CONTINUATION: 'ngram_continuation',       // N-gram統計継続型
  COOCCURRENCE_EXPANSION: 'cooccurrence_expansion', // 共起関係拡張型
  PERSONAL_ADAPTATION: 'personal_adaptation',     // ベイジアン個人適応型
  VOCABULARY_OPTIMIZATION: 'vocabulary_optimization', // 多腕バンディット最適化型
  QUALITY_FOCUSED: 'quality_focused'             // 品質予測重視型
};

class StatisticalResponseGenerator {
  constructor(aiVocabularyProcessor, learningDB) {
    // コア依存関係
    this.aiProcessor = aiVocabularyProcessor || new AIVocabularyProcessor();
    this.learningDB = learningDB || new PersistentLearningDB();
    
    // 応答戦略管理
    this.responseStrategies = new Map();
    this.contextHistory = [];
    this.qualityThresholds = {
      excellent: 0.8,
      good: 0.6,
      acceptable: 0.4,
      poor: 0.2
    };
    
    // 戦略選択用統計データ
    this.strategyStats = new Map();
    
    this.initializeStrategies();
    console.log('🗣️ StatisticalResponseGenerator初期化完了');
  }

  /**
   * 応答戦略初期化
   */
  initializeStrategies() {
    // 各戦略の初期統計値
    Object.values(ResponseStrategies).forEach(strategy => {
      this.strategyStats.set(strategy, {
        selections: 0,
        totalReward: 0.0,
        averageReward: 0.0,
        lastUsed: 0
      });
    });
  }

  /**
   * メイン応答生成メソッド
   * @param {string} userInput - ユーザー入力テキスト
   * @param {string} userId - ユーザーID
   * @returns {Promise<Object>} 応答生成結果
   */
  async generateResponse(userInput, userId = 'default') {
    try {
      console.log(`🗣️ 応答生成開始: "${userInput}" (ユーザー: ${userId})`);
      const startTime = Date.now();

      // 1. 既存5AIで分析
      let analysis;
      try {
        analysis = await this.aiProcessor.processText(userInput, userId);
        console.log('📊 5AI分析完了:', analysis.success ? '成功' : '失敗');
      } catch (analysisError) {
        console.error('❌ 5AI分析中にエラーが発生しました:', analysisError);
        return this.generateFallbackResponse(userInput, `5AI分析エラー: ${analysisError.message}`);
      }

      if (!analysis.success) {
        return this.generateFallbackResponse(userInput, '5AI分析エラー');
      }

      // 2. 応答戦略選択 (統計的決定)
      const strategy = this.selectResponseStrategy(analysis);
      console.log(`🎯 選択戦略: ${strategy}`);

      // 3. 統計的応答生成
      const response = await this.generateStatisticalResponse(analysis, strategy);
      console.log(`✨ 生成応答: "${response}"`);

      // 4. 品質評価・改善
      const qualityResult = await this.evaluateAndImprove(response, analysis);
      console.log(`📈 品質評価: ${qualityResult.qualityScore.toFixed(3)} (${qualityResult.grade})`);

      // 5. 学習データ更新
      await this.updateLearningData(userInput, response, qualityResult, strategy);

      // 6. 対話履歴保存
      this.addToContextHistory(userInput, response, strategy, qualityResult);

      const processingTime = Date.now() - startTime;
      console.log(`⚡ 応答生成完了 (${processingTime}ms)`);

      return {
        success: true,
        response: qualityResult.improvedResponse || response,
        confidence: qualityResult.confidence,
        strategy: strategy,
        qualityScore: qualityResult.qualityScore,
        grade: qualityResult.grade,
        improvements: qualityResult.improvements || [],
        analysisData: analysis,
        processingTime: processingTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 応答生成エラー:', error.message);
      return this.generateFallbackResponse(userInput, error.message);
    }
  }

  /**
   * 統計的応答戦略選択 (UCBアルゴリズム)
   * @param {Object} analysis - 5AI分析結果
   * @returns {string} 選択された戦略
   */
  selectResponseStrategy(analysis) {
    // AIVocabularyProcessorの返り値構造に合わせて修正
    const { predictedContext, optimizedVocabulary, adaptedContent } = analysis;
    
    // 基本スコア計算
    // optimizedVocabularyが文字列の場合は配列に変換してlength計算
    const vocabLength = Array.isArray(optimizedVocabulary) ? optimizedVocabulary.length : 
                       (optimizedVocabulary ? 1 : 0);
    
    const baseScores = {
      [ResponseStrategies.NGRAM_CONTINUATION]: (predictedContext?.confidence || 0) * 1.2,
      [ResponseStrategies.COOCCURRENCE_EXPANSION]: vocabLength * 0.3,
      [ResponseStrategies.PERSONAL_ADAPTATION]: (adaptedContent?.adaptationScore || 0) * 1.1,
      [ResponseStrategies.VOCABULARY_OPTIMIZATION]: vocabLength * 0.4,
      [ResponseStrategies.QUALITY_FOCUSED]: 0.9
    };

    // UCB (Upper Confidence Bound) 計算
    const totalSelections = Array.from(this.strategyStats.values())
      .reduce((sum, stats) => sum + stats.selections, 0);
    
    let bestStrategy = ResponseStrategies.NGRAM_CONTINUATION;
    let bestUCB = -Infinity;

    Object.values(ResponseStrategies).forEach(strategy => {
      const stats = this.strategyStats.get(strategy);
      const baseScore = baseScores[strategy] || 0;
      
      // UCB計算: 平均報酬 + 探索ボーナス
      const explorationBonus = totalSelections > 0 && stats.selections > 0
        ? 2 * Math.sqrt(Math.log(totalSelections) / stats.selections)
        : 10; // 未選択戦略に高いボーナス

      const ucbScore = stats.averageReward + explorationBonus + baseScore * 0.1;

      if (ucbScore > bestUCB) {
        bestUCB = ucbScore;
        bestStrategy = strategy;
      }
    });

    // 戦略使用回数更新
    const strategyStats = this.strategyStats.get(bestStrategy);
    strategyStats.selections++;
    strategyStats.lastUsed = Date.now();

    return bestStrategy;
  }

  /**
   * 統計的応答生成
   * @param {Object} analysis - 5AI分析結果
   * @param {string} strategy - 選択された戦略
   * @returns {Promise<string>} 生成された応答
   */
  async generateStatisticalResponse(analysis, strategy) {
    switch (strategy) {
      case ResponseStrategies.NGRAM_CONTINUATION:
        return this.generateNgramBasedResponse(analysis);
        
      case ResponseStrategies.COOCCURRENCE_EXPANSION:
        return this.generateCooccurrenceResponse(analysis);
        
      case ResponseStrategies.PERSONAL_ADAPTATION:
        return this.generatePersonalizedResponse(analysis);
        
      case ResponseStrategies.VOCABULARY_OPTIMIZATION:
        return this.generateVocabularyOptimizedResponse(analysis);
        
      case ResponseStrategies.QUALITY_FOCUSED:
        return this.generateQualityFocusedResponse(analysis);
        
      default:
        return this.generateNgramBasedResponse(analysis);
    }
  }

  /**
   * N-gram継続型応答生成
   */
  async generateNgramBasedResponse(analysis) {
    const { predictedContext, originalText } = analysis;
    
    // 基本的な文脈継続応答
    const contextCategory = predictedContext?.predictedCategory || 'general';
    const confidence = predictedContext?.confidence || 0.5;
    
    if (contextCategory === 'technical' && confidence > 0.7) {
      return `${originalText}について、技術的な観点から詳しく説明できます。どのような側面について知りたいですか？`;
    } else if (contextCategory === 'general') {
      return `${originalText}に関して、さらに詳しい情報や関連する内容をお手伝いできます。`;
    } else {
      return `${originalText}について、どのようなことをお知りになりたいでしょうか？`;
    }
  }

  /**
   * 共起関係拡張型応答生成
   */
  async generateCooccurrenceResponse(analysis) {
    const { optimizedVocabulary, originalText } = analysis;
    
    // optimizedVocabularyが文字列の場合と配列の場合を処理
    let keyTerm;
    if (Array.isArray(optimizedVocabulary) && optimizedVocabulary.length > 0) {
      keyTerm = optimizedVocabulary[0];
    } else if (typeof optimizedVocabulary === 'string') {
      keyTerm = optimizedVocabulary;
    }
    
    if (keyTerm) {
      return `${keyTerm}に関連して、${originalText}の文脈では他にも重要な要素があります。具体的にどの点に興味がおありですか？`;
    }
    
    return `${originalText}について、関連する概念や要素を含めて説明いたします。`;
  }

  /**
   * ベイジアン個人適応型応答生成
   */
  async generatePersonalizedResponse(analysis) {
    const { adaptedContent, originalText } = analysis;
    const adaptationScore = adaptedContent?.adaptationScore || 0;
    
    if (adaptationScore > 0.5) {
      return `あなたの興味や専門性を踏まえると、${originalText}については特に重要なポイントがあります。詳しくお聞かせください。`;
    }
    
    return `${originalText}について、あなたに最適な形で説明させていただきます。`;
  }

  /**
   * 語彙最適化型応答生成
   */
  async generateVocabularyOptimizedResponse(analysis) {
    const { optimizedVocabulary, originalText } = analysis;
    
    // optimizedVocabularyが文字列の場合と配列の場合を処理
    let terms;
    if (Array.isArray(optimizedVocabulary)) {
      terms = optimizedVocabulary.slice(0, 2).join('と') || '関連要素';
    } else if (optimizedVocabulary) {
      terms = optimizedVocabulary;
    } else {
      terms = '関連要素';
    }
    
    return `${originalText}では、${terms}が重要なキーワードとなります。これらについて詳しく説明いたします。`;
  }

  /**
   * 品質重視型応答生成
   */
  async generateQualityFocusedResponse(analysis) {
    const { qualityPrediction, originalText } = analysis;
    const qualityScore = qualityPrediction?.qualityScore || 0.5;
    
    if (qualityScore > 0.7) {
      return `${originalText}について、高品質で包括的な情報を提供いたします。どの側面を重点的に説明しましょうか？`;
    }
    
    return `${originalText}に関して、詳細で正確な情報をお届けします。`;
  }

  /**
   * 品質評価・改善
   */
  async evaluateAndImprove(response, analysis) {
    try {
      // 生成応答の品質評価
      const responseAnalysis = await this.aiProcessor.processText(response);
      const qualityScore = responseAnalysis.qualityPrediction?.qualityScore || analysis.qualityPrediction?.qualityScore || 0.5;
      const confidence = responseAnalysis.qualityPrediction?.confidence || analysis.qualityPrediction?.confidence || 0.5;
      
      // 品質グレード決定
      let grade = 'poor';
      if (qualityScore >= this.qualityThresholds.excellent) grade = 'excellent';
      else if (qualityScore >= this.qualityThresholds.good) grade = 'good';
      else if (qualityScore >= this.qualityThresholds.acceptable) grade = 'acceptable';
      
      const result = {
        qualityScore,
        confidence,
        grade,
        improvements: responseAnalysis.qualityPrediction?.improvements || analysis.qualityPrediction?.improvements || []
      };
      
      // 品質が低い場合の改善試行
      if (qualityScore < this.qualityThresholds.acceptable) {
        const improvedResponse = await this.improveResponse(response, analysis);
        result.improvedResponse = improvedResponse;
      }
      
      return result;
      
    } catch (error) {
      console.warn('品質評価エラー:', error.message);
      return {
        qualityScore: 0.5,
        confidence: 0.5,
        grade: 'acceptable',
        improvements: []
      };
    }
  }

  /**
   * 応答改善
   */
  async improveResponse(response, originalAnalysis) {
    // 簡易的な改善 - より詳細な実装は今後
    const improvements = originalAnalysis.result?.qualityPrediction?.improvements || [];
    
    let improvedResponse = response;
    
    // 基本的な改善パターン
    if (response.length < 20) {
      improvedResponse += ' より詳しく説明いたします。';
    }
    
    if (!response.includes('？') && !response.includes('。')) {
      improvedResponse += 'ご質問があれば、お聞かせください。';
    }
    
    return improvedResponse;
  }

  /**
   * 学習データ更新
   */
  async updateLearningData(userInput, response, qualityResult, strategy) {
    try {
      // 戦略の報酬更新
      const strategyStats = this.strategyStats.get(strategy);
      const reward = qualityResult.qualityScore;
      
      strategyStats.selections += 1;
      strategyStats.totalReward += reward;
      strategyStats.averageReward = strategyStats.totalReward / strategyStats.selections;
      strategyStats.lastUsed = Date.now();
      
      // 学習データ保存 (今後実装)
      // await this.learningDB.saveDialogueData(userInput, response, qualityResult);
      
    } catch (error) {
      console.warn('学習データ更新エラー:', error.message);
    }
  }

  /**
   * 対話履歴管理
   */
  addToContextHistory(userInput, response, strategy, qualityResult) {
    const entry = {
      userInput,
      response,
      strategy,
      qualityScore: qualityResult.qualityScore,
      grade: qualityResult.grade,
      timestamp: new Date().toISOString()
    };
    
    this.contextHistory.push(entry);
    
    // 履歴サイズ制限
    if (this.contextHistory.length > 100) {
      this.contextHistory.shift();
    }
  }

  /**
   * フォールバック応答生成
   */
  generateFallbackResponse(userInput, errorMessage = '') {
    return {
      success: false,
      response: `申し訳ございませんが、「${userInput}」について適切な応答を生成できませんでした。別の表現で再度お試しください。`,
      confidence: 0.3,
      strategy: 'fallback',
      qualityScore: 0.3,
      grade: 'poor',
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * システム状態取得
   */
  getSystemStatus() {
    return {
      initialized: true,
      strategiesCount: this.strategyStats.size,
      historyLength: this.contextHistory.length,
      strategyStats: Object.fromEntries(this.strategyStats),
      aiProcessorStatus: this.aiProcessor ? 'connected' : 'disconnected'
    };
  }
}

export { StatisticalResponseGenerator, ResponseStrategies };