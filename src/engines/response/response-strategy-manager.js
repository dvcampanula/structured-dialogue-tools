import { PersistentLearningDB } from '../../data/persistent-learning-db.js';

// 応答戦略パターン定義
const ResponseStrategies = {
  NGRAM_CONTINUATION: 'ngram_continuation',       // N-gram統計継続型
  COOCCURRENCE_EXPANSION: 'cooccurrence_expansion', // 共起関係拡張型
  PERSONAL_ADAPTATION: 'personal_adaptation',     // ベイジアン個人適応型
  VOCABULARY_OPTIMIZATION: 'vocabulary_optimization', // 多腕バンディット最適化型
  QUALITY_FOCUSED: 'quality_focused'             // 品質予測重視型
};

export class ResponseStrategyManager {
  constructor(learningDB, calculateDynamicWeights, getLearnedRelatedTerms) {
    this.learningDB = learningDB; // PersistentLearningDBのインスタンス
    this.calculateDynamicWeights = calculateDynamicWeights; // StatisticalResponseGeneratorのメソッド
    this.getLearnedRelatedTerms = getLearnedRelatedTerms; // StatisticalResponseGeneratorのメソッド
    this.strategyStats = new Map();
    this.initializeStrategies();
    console.log('📊 ResponseStrategyManager初期化完了');
  }

  /**
   * 応答戦略初期化
   */
  initializeStrategies() {
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
   * 対話ステージを決定
   * @param {Object} analysis - 5AI分析結果
   * @returns {string} 対話ステージ (例: 'greeting', 'information_request', 'problem_solving', 'confirmation', 'general')
   */
  async determineDialogueStage(analysis) {
    const { originalText, predictedContext, optimizedVocabulary, adaptedContent, cooccurrenceAnalysis } = analysis;

    // 統計的ステージ判定ロジック
    const stageScores = {};
    const stageKeywords = await this.getDialogueStageKeywords();

    for (const stage in stageKeywords) {
      stageScores[stage] = 0;
      for (const keyword in stageKeywords[stage]) {
        if (originalText.includes(keyword)) {
          stageScores[stage] += stageKeywords[stage][keyword];
        }
      }
    }

    // 分析結果に基づく追加スコアリング
    if (predictedContext?.confidence > 0.7) {
      stageScores.context_driven = (stageScores.context_driven || 0) + 1;
    }
    if (optimizedVocabulary?.length > 0) {
      stageScores.vocabulary_focused = (stageScores.vocabulary_focused || 0) + 1;
    }
    if (adaptedContent?.adaptationScore > 0.5) {
      stageScores.personalized = (stageScores.personalized || 0) + 1;
    }
    if (cooccurrenceAnalysis?.relatedTerms && Object.keys(cooccurrenceAnalysis.relatedTerms).length > 0) {
      stageScores.relationship_exploration = (stageScores.relationship_exploration || 0) + 1;
    }

    // 最高スコアのステージを選択
    let bestStage = 'general';
    let maxScore = 0;
    for (const stage in stageScores) {
      if (stageScores[stage] > maxScore) {
        maxScore = stageScores[stage];
        bestStage = stage;
      }
    }

    return bestStage;
  }

  /**
   * 対話ステージキーワード取得 (学習データから取得するように拡張可能)
   */
  async getDialogueStageKeywords() {
    // 将来的にはlearningDBから動的に取得
    return {
      greeting: { 'こんにちは': 1, 'こんばんは': 1, 'おはよう': 1, 'やあ': 1, 'どうも': 1 },
      information_request: { '何ができる': 1, '教えて': 1, '知りたい': 1, 'について': 1 },
      problem_solving: { '問題': 1, 'エラー': 1, 'うまくいかない': 1, '解決': 1 },
      confirmation: { '確認': 1, '合ってる': 1, '正しい': 1, '本当に': 1 }
    };
  }

  /**
   * 統計的応答戦略選択 (UCBアルゴリズム)
   * @param {Object} analysis - 5AI分析結果
   * @param {string} dialogueStage - 現在の対話ステージ
   * @returns {Promise<string>} 選択された戦略
   */
  async selectResponseStrategy(analysis, dialogueStage) {
    const { predictedContext, optimizedVocabulary, adaptedContent } = analysis;
    
    // 統計学習ベース動的スコア計算（固定値完全除去）
    const baseScores = await this.calculateDynamicStrategyScores(analysis, dialogueStage);

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
   * 学習データ更新 (戦略報酬部分のみ)
   */
  async updateStrategyLearningData(qualityResult, strategy) {
    try {
      // 戦略の報酬更新
      const strategyStats = this.strategyStats.get(strategy);
      const reward = qualityResult.qualityScore;
      
      strategyStats.selections += 1;
      strategyStats.totalReward += reward;
      strategyStats.averageReward = strategyStats.totalReward / strategyStats.selections;
      strategyStats.lastUsed = Date.now();
      
    } catch (error) {
      console.warn('戦略学習データ更新エラー:', error.message);
    }
  }

  /**
   * 統計学習ベース動的戦略スコア計算（固定値完全除去）
   */
  async calculateDynamicStrategyScores(analysis, dialogueStage) {
    const { predictedContext, optimizedVocabulary, adaptedContent, enhancedTerms } = analysis;
    
    try {
      // Phase 0 Critical Fix: 統計学習ベースの動的重み計算
      const statisticalWeights = await this.calculateStatisticalStrategyWeights();

      // 各種分析指標の計算
      const analysisMetrics = {
        ngram: (predictedContext?.confidence || 0) * (await this.calculateNgramDataQuality()),
        cooccurrence: await this.calculateCooccurrenceRichness(enhancedTerms, analysis.userId),
        personalization: await this.calculatePersonalAdaptationViability(adaptedContent),
        vocabOptimization: await this.calculateVocabularyOptimizationEffectiveness(optimizedVocabulary),
        quality: await this.calculateQualityPredictionConfidence(analysis)
      };

      // 統計的重みと分析指標を統合してスコアを計算
      let scores = {
        [ResponseStrategies.NGRAM_CONTINUATION]: statisticalWeights.ngram * analysisMetrics.ngram,
        [ResponseStrategies.COOCCURRENCE_EXPANSION]: statisticalWeights.cooccurrence * analysisMetrics.cooccurrence,
        [ResponseStrategies.PERSONAL_ADAPTATION]: statisticalWeights.personalization * analysisMetrics.personalization,
        [ResponseStrategies.VOCABULARY_OPTIMIZATION]: statisticalWeights.vocabOptimization * analysisMetrics.vocabOptimization,
        [ResponseStrategies.QUALITY_FOCUSED]: statisticalWeights.quality * analysisMetrics.quality
      };

      // 対話ステージに応じた戦略スコアの調整 (ヒューリスティックな調整として維持)
      switch (dialogueStage) {
        case 'greeting':
          scores[ResponseStrategies.NGRAM_CONTINUATION] *= 1.5;
          break;
        case 'information_request':
          scores[ResponseStrategies.COOCCURRENCE_EXPANSION] *= 1.2;
          scores[ResponseStrategies.NGRAM_CONTINUATION] *= 1.1;
          break;
        case 'problem_solving':
          scores[ResponseStrategies.QUALITY_FOCUSED] *= 1.5;
          scores[ResponseStrategies.COOCCURRENCE_EXPANSION] *= 1.3;
          break;
        case 'confirmation':
          scores[ResponseStrategies.NGRAM_CONTINUATION] *= 1.3;
          break;
        case 'context_driven':
          scores[ResponseStrategies.NGRAM_CONTINUATION] *= 1.2;
          scores[ResponseStrategies.PERSONAL_ADAPTATION] *= 1.1;
          break;
        case 'vocabulary_focused':
          scores[ResponseStrategies.VOCABULARY_OPTIMIZATION] *= 1.5;
          break;
        case 'personalized':
          scores[ResponseStrategies.PERSONAL_ADAPTATION] *= 1.5;
          break;
        case 'relationship_exploration':
          scores[ResponseStrategies.COOCCURRENCE_EXPANSION] *= 1.5;
          break;
        case 'general':
        default:
          // No change
          break;
      }

      return scores;
      
    } catch (error) {
      console.warn('動的戦略スコア計算エラー:', error.message);
      return await this.calculateStatisticalFallbackWeights();
    }
  }

  /**
   * 統計的戦略重み計算
   * @returns {Promise<Object>} 各戦略の統計的重み
   */
  async calculateStatisticalStrategyWeights() {
    const weights = {};
    let totalReward = 0;

    // 各戦略の平均報酬を取得
    for (const strategy of Object.values(ResponseStrategies)) {
      const stats = this.strategyStats.get(strategy);
      weights[strategy] = stats.averageReward > 0 ? stats.averageReward : 0.1; // ゼロ報酬を避ける
      totalReward += weights[strategy];
    }

    // 正規化して重みを算出
    if (totalReward > 0) {
      for (const strategy in weights) {
        weights[strategy] /= totalReward;
      }
    } else {
      // 報酬データがない場合は均等に割り振る
      const numStrategies = Object.keys(ResponseStrategies).length;
      for (const strategy in weights) {
        weights[strategy] = 1 / numStrategies;
      }
    }
    
    return {
        ngram: weights[ResponseStrategies.NGRAM_CONTINUATION],
        cooccurrence: weights[ResponseStrategies.COOCCURRENCE_EXPANSION],
        personalization: weights[ResponseStrategies.PERSONAL_ADAPTATION],
        vocabOptimization: weights[ResponseStrategies.VOCABULARY_OPTIMIZATION],
        quality: weights[ResponseStrategies.QUALITY_FOCUSED]
    };
  }

  /**
   * 統計的フォールバック重み計算
   */
  calculateStatisticalFallbackWeights() {
    console.warn('⚠️ 統計的フォールバック重み使用');
    return {
      [ResponseStrategies.NGRAM_CONTINUATION]: 0.2,
      [ResponseStrategies.COOCCURRENCE_EXPANSION]: 0.2,
      [ResponseStrategies.PERSONAL_ADAPTATION]: 0.2,
      [ResponseStrategies.VOCABULARY_OPTIMIZATION]: 0.2,
      [ResponseStrategies.QUALITY_FOCUSED]: 0.2
    };
  }

  /**
   * N-gramデータ品質の統計的評価
   */
  async calculateNgramDataQuality() {
    try {
      const stats = await this.learningDB.getNgramStats();
      const dataRichness = Math.min(stats.totalPatterns / 100, 1.0); // 100パターンで最大値
      const averageConfidence = stats.averageConfidence || 0;
      
      // 動的重み計算（固定値0.6, 0.4を除去）
      const weights = await this.calculateDynamicWeights('cooccurrenceQuality');
      return (dataRichness * weights.primary + averageConfidence * weights.secondary);
      
    } catch {
      return this.getMinimalQualityScore('ngram');
    }
  }

  /**
   * 共起関係の統計的豊富さ評価
   */
  async calculateCooccurrenceRichness(enhancedTerms, userId) {
    if (!enhancedTerms || enhancedTerms.length === 0) return 0.1;
    
    try {
      const keywords = enhancedTerms.map(t => t.term);
      const relatedTerms = await this.getLearnedRelatedTerms(keywords, userId);
      const uniqueRelations = new Set(relatedTerms.map(r => r.term)).size;
      const relationDensity = Math.min(uniqueRelations / (keywords.length * 5), 1.0); // 1キーワードあたり5関係で最大
      const avgStrength = relatedTerms.reduce((sum, r) => sum + r.strength, 0) / Math.max(relatedTerms.length, 1);
      
      // 動的重み計算（固定値0.7, 0.3を除去）
      const weights = await this.calculateDynamicWeights('cooccurrenceQuality');
      return relationDensity * weights.primary + avgStrength * weights.secondary;
      
    } catch {
      return this.getMinimalQualityScore('cooccurrence');
    }
  }

  /**
   * 最小品質スコア取得
   */
  getMinimalQualityScore(type) {
    console.warn(`⚠️ 最小品質スコア使用 - ${type}データ不足`);
    return { primary: 0.5, secondary: 0.5 }; // デフォルト値
  }

  /**
   * ベイジアン個人適応の統計的適用可能性
   */
  async calculatePersonalAdaptationViability(adaptedContent) {
    try {
      const adaptationScore = adaptedContent?.adaptationScore || 0;
      const userDataRichness = await this.calculateUserDataRichness();
      return adaptationScore * 0.6 + userDataRichness * 0.4;
    } catch {
      return 0.1;
    }
  }

  /**
   * ユーザーデータ豊富さの統計的評価
   */
  async calculateUserDataRichness() {
    try {
      const userStats = await this.learningDB.getUserStats('default');
      const interactionCount = userStats.totalInteractions || 0;
      const profileCompleteness = userStats.profileCompleteness || 0;
      const richnessScore = Math.min(interactionCount / 50, 1.0) * 0.7 + profileCompleteness * 0.3;
      return richnessScore;
    } catch {
      return 0.1;
    }
  }

  /**
   * 語彙最適化の統計的効果性
   */
  async calculateVocabularyOptimizationEffectiveness(optimizedVocabulary) {
    try {
      const vocabQuality = Array.isArray(optimizedVocabulary) ? optimizedVocabulary.length / 10 : 
                          (optimizedVocabulary ? 0.5 : 0);
      const banditStats = await this.learningDB.getBanditStats();
      const optimizationHistory = banditStats.totalOptimizations || 0;
      const effectivenessScore = Math.min(vocabQuality, 1.0) * 0.6 + Math.min(optimizationHistory / 100, 1.0) * 0.4;
      
      return effectivenessScore;
    } catch {
      return 0.1;
    }
  }

  /**
   * 品質予測の統計的確信度
   */
  async calculateQualityPredictionConfidence(analysis) {
    try {
      const qualityScore = analysis.qualityPrediction?.qualityScore || 0;
      const confidence = analysis.qualityPrediction?.confidence || 0;
      const predictionReliability = qualityScore * confidence;
      
      const qualityStats = await this.learningDB.getQualityStats();
      const historicalAccuracy = qualityStats.averageAccuracy || 0;
      
      return predictionReliability * 0.7 + historicalAccuracy * 0.3;
    } catch {
      return 0.1;
    }
  }

  /**
   * N-gramデータ品質の統計的評価
   */
  async calculateNgramDataQuality() {
    try {
      const stats = await this.learningDB.getNgramStats();
      const dataRichness = Math.min(stats.totalPatterns / 100, 1.0); // 100パターンで最大値
      const averageConfidence = stats.averageConfidence || 0;
      
      // 動的重み計算（固定値0.6, 0.4を除去）
      const weights = await this.calculateDynamicWeights('cooccurrenceQuality');
      return (dataRichness * weights.primary + averageConfidence * weights.secondary);
      
    } catch {
      return this.getMinimalQualityScore('ngram');
    }
  }

  /**
   * 共起関係の統計的豊富さ評価
   */
  async calculateCooccurrenceRichness(enhancedTerms, userId) {
    if (!enhancedTerms || enhancedTerms.length === 0) return 0.1;
    
    try {
      const keywords = enhancedTerms.map(t => t.term);
      const relatedTerms = await this.getLearnedRelatedTerms(keywords, userId);
      const uniqueRelations = new Set(relatedTerms.map(r => r.term)).size;
      const relationDensity = Math.min(uniqueRelations / (keywords.length * 5), 1.0); // 1キーワードあたり5関係で最大
      const avgStrength = relatedTerms.reduce((sum, r) => sum + r.strength, 0) / Math.max(relatedTerms.length, 1);
      
      // 動的重み計算（固定値0.7, 0.3を除去）
      const weights = await this.calculateDynamicWeights('cooccurrenceQuality');
      return relationDensity * weights.primary + avgStrength * weights.secondary;
      
    } catch {
      return this.getMinimalQualityScore('cooccurrence');
    }
  }
}

// ResponseStrategiesもexport
export { ResponseStrategies };
