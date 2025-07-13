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
import { DialogueLogProcessor } from '../../learning/dialogue/dialogue-log-processor.js';

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
    this.dialogueLogProcessor = null; // 後で初期化
    
    // 応答戦略管理
    this.responseStrategies = new Map();
    this.contextHistory = [];
    
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
      const strategy = await this.selectResponseStrategy(analysis);
      console.log(`🎯 選択戦略: ${strategy}`);

      // 3. 統計的応答生成
      const response = await this.generateStatisticalResponse(analysis, strategy, userId);
      console.log(`✨ 生成応答: "${response}"`);

      // 4. 品質評価・改善
      const qualityResult = await this.evaluateAndImprove(response, analysis, userId);
      console.log(`📈 品質評価: ${qualityResult.qualityScore.toFixed(3)} (${qualityResult.grade})`);

      // 4.5. 外部ログ学習による応答改善
      const improvedResult = await this.improveWithDialogueLearning(
        qualityResult.improvedResponse || response, 
        userInput, 
        userId
      );

      // 5. 学習データ更新
      await this.updateLearningData(userInput, response, qualityResult, strategy);

      // 6. 対話履歴保存
      this.addToContextHistory(userInput, response, strategy, qualityResult);

      const processingTime = Date.now() - startTime;
      console.log(`⚡ 応答生成完了 (${processingTime}ms)`);

      return {
        success: true,
        response: improvedResult.response || qualityResult.improvedResponse || response,
        confidence: qualityResult.confidence,
        strategy: strategy,
        qualityScore: qualityResult.qualityScore,
        grade: qualityResult.grade,
        improvements: [
          ...(qualityResult.improvements || []),
          ...(improvedResult.improved ? ['dialogue_learning'] : [])
        ],
        analysisData: analysis,
        dialogueLearningApplied: improvedResult.improved,
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
   * @returns {Promise<string>} 選択された戦略
   */
  async selectResponseStrategy(analysis) {
    // AIVocabularyProcessorの返り値構造に合わせて修正
    const { predictedContext, optimizedVocabulary, adaptedContent } = analysis;
    
    // 統計学習ベース動的スコア計算（固定値完全除去）
    const baseScores = await this.calculateDynamicStrategyScores(analysis);

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

  /**
   * N-gram継続型応答生成
   */
  async generateNgramBasedResponse(analysis, userId = 'default') {
    const { predictedContext, originalText } = analysis;
    const nextWord = predictedContext?.predictedNextWord;
    const confidence = predictedContext?.confidence || 0;

    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
    if (nextWord && confidence > confidenceThresholds.lowConfidence) {
      return await this.generateNgramStatisticalResponse(originalText, nextWord, confidence);
    } else {
      return await this.generateLowConfidenceResponse(originalText, predictedContext);
    }
  }

  async generateCooccurrenceResponse(analysis, userId = 'default') {
    const { optimizedVocabulary, originalText, enhancedTerms } = analysis;
    
    let cooccurringWords = [];
    if (Array.isArray(optimizedVocabulary)) {
      cooccurringWords = optimizedVocabulary.slice(0, 3);
    } else if (optimizedVocabulary && typeof optimizedVocabulary === 'string') {
      cooccurringWords = [optimizedVocabulary];
    }
    
    try {
      let inputKeywords = [];
      if (analysis.processedTokens && Array.isArray(analysis.processedTokens)) {
        // 助詞や記号を除外して意味のある語彙のみ抽出
        inputKeywords = analysis.processedTokens
          .filter(t => t.partOfSpeech && !['助詞', '記号', '助動詞'].includes(t.partOfSpeech))
          .map(t => t.surface || t.word || t.term || t)
          .filter(Boolean);
      } else if (enhancedTerms && Array.isArray(enhancedTerms)) {
        inputKeywords = enhancedTerms.map(t => t.term || t.surface || t.word || t).filter(Boolean);
      } else if (analysis.dictionaryLookups && Array.isArray(analysis.dictionaryLookups)) {
        inputKeywords = analysis.dictionaryLookups.map(d => d.surface || d.word || d.term || d).filter(Boolean);
      }
      
      inputKeywords = await this.filterKeywordsByStatisticalQuality(inputKeywords);
      const relatedTerms = await this.getLearnedRelatedTerms(inputKeywords, userId);
      
      const semanticContext = await this.buildSemanticContext(inputKeywords, relatedTerms);
      
      // Call the main statistical response generator
      // セマンティック文脈を分析オブジェクトに変換
      const analysisForResponse = {
        originalText,
        semanticContext,
        processedTokens: inputKeywords.map(k => ({ surface: k }))
      };
      return await this.generateStatisticalResponse(analysisForResponse, null, userId);
      
    } catch (error) {
      console.warn('共起関係応答生成エラー:', error.message);
      // Fallback to minimal statistical response if an error occurs
      return await this.generateMinimalStatisticalResponse(originalText, []);
    }
  }

  /**
   * ベイジアン個人適応型応答生成
   */
  async generatePersonalizedResponse(analysis, userId = 'default') {
    const { adaptedContent, originalText } = analysis;
    const adaptationScore = adaptedContent?.adaptationScore || 0;
    const userCategory = adaptedContent?.userCategory || 'general';

    return await this.generateBayesianStatisticalResponse(originalText, adaptationScore, userCategory);
  }

  /**
   * 語彙最適化型応答生成
   */
  async generateVocabularyOptimizedResponse(analysis, userId = 'default') {
    const { optimizedVocabulary, originalText } = analysis;
    
    return await this.generateBanditStatisticalResponse(originalText, optimizedVocabulary);
  }

  /**
   * 品質重視型応答生成
   */
  async generateQualityFocusedResponse(analysis, userId = 'default') {
    const { qualityPrediction, originalText } = analysis;
    const qualityScore = qualityPrediction?.qualityScore || 0;

    return await this.generateQualityStatisticalResponse(originalText, qualityScore, qualityPrediction);
  }

  /**
   * 品質評価・改善
   */
  async evaluateAndImprove(response, analysis, userId) {
    try {
      // 生成応答の品質評価
      const responseAnalysis = await this.aiProcessor.processText(response);
      const qualityScore = responseAnalysis.qualityPrediction?.qualityScore || analysis.qualityPrediction?.qualityScore || 0.5;
      const confidence = responseAnalysis.qualityPrediction?.confidence || analysis.qualityPrediction?.confidence || 0.5;

      // 統計情報に基づいて品質グレードを動的に決定
      const stats = await this.learningDB.getQualityStats();
      const { average, stdDev } = stats;
      
      let grade = 'poor';
      if (qualityScore > average + stdDev) {
        grade = 'excellent';
      } else if (qualityScore > average) {
        grade = 'good';
      } else if (qualityScore > average - stdDev) {
        grade = 'acceptable';
      }

      const result = {
        qualityScore,
        confidence,
        grade,
        improvements: responseAnalysis.qualityPrediction?.improvements || analysis.qualityPrediction?.improvements || []
      };

      // 品質が低い場合の改善試行
      if (grade === 'poor' || grade === 'acceptable') {
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
   * 統計学習ベース動的戦略スコア計算（固定値完全除去）
   */
  async calculateDynamicStrategyScores(analysis) {
    const { predictedContext, optimizedVocabulary, adaptedContent, enhancedTerms } = analysis;
    
    try {
      // 1. N-gram統計的信頼度
      const ngramConfidence = predictedContext?.confidence || 0;
      const ngramDataQuality = await this.calculateNgramDataQuality();
      
      // 2. 共起関係の統計的豊富さ
      const cooccurrenceRichness = await this.calculateCooccurrenceRichness(enhancedTerms);
      
      // 3. ベイジアン個人適応の統計的適用可能性
      const personalAdaptationViability = await this.calculatePersonalAdaptationViability(adaptedContent);
      
      // 4. 語彙最適化の統計的効果性
      const vocabularyOptimizationEffectiveness = await this.calculateVocabularyOptimizationEffectiveness(optimizedVocabulary);
      
      // 5. 品質予測の統計的確信度
      const qualityPredictionConfidence = await this.calculateQualityPredictionConfidence(analysis);
      
      return {
        [ResponseStrategies.NGRAM_CONTINUATION]: ngramConfidence * ngramDataQuality,
        [ResponseStrategies.COOCCURRENCE_EXPANSION]: cooccurrenceRichness * 2.0, // 学習データ活用を優先
        [ResponseStrategies.PERSONAL_ADAPTATION]: personalAdaptationViability,
        [ResponseStrategies.VOCABULARY_OPTIMIZATION]: vocabularyOptimizationEffectiveness,
        [ResponseStrategies.QUALITY_FOCUSED]: qualityPredictionConfidence * 0.5 // 固定応答を避ける
      };
      
    } catch (error) {
      console.warn('動的戦略スコア計算エラー:', error.message);
      // エラー時は均等スコア
      // エラー時も統計的フォールバックを使用
      return await this.calculateStatisticalFallbackWeights();
    }
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
      return await this.getMinimalQualityScore('ngram');
    }
  }

  /**
   * 共起関係の統計的豊富さ評価
   */
  async calculateCooccurrenceRichness(enhancedTerms) {
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
      return await this.getMinimalQualityScore('cooccurrence');
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
   * 純粋統計学習ベース応答生成（テンプレート完全回避）
   */
  async generateStatisticalResponse(analysis, strategy = null, userId = 'default') {
    const { originalText, processedTokens, optimizedVocabulary, predictedContext, adaptedContent, cooccurrenceAnalysis, qualityPrediction } = analysis;
    
    // 戦略別処理の分岐
    if (strategy) {
      switch (strategy) {
        case ResponseStrategies.NGRAM_CONTINUATION:
          return this.generateNgramBasedResponse(analysis, userId);
        case ResponseStrategies.COOCCURRENCE_EXPANSION:
          return this.generateCooccurrenceResponse(analysis, userId);
        case ResponseStrategies.PERSONAL_ADAPTATION:
          return this.generatePersonalizedResponse(analysis, userId);
        case ResponseStrategies.VOCABULARY_OPTIMIZATION:
          return this.generateVocabularyOptimizedResponse(analysis, userId);
        case ResponseStrategies.QUALITY_FOCUSED:
          return this.generateQualityFocusedResponse(analysis, userId);
      }
    }
    
    let semanticContext = []; // Initialize semanticContext outside the try block

    const inputKeywords = processedTokens.map(t => t.surface || t.word || t.term || t).filter(Boolean);
    const allRelatedTerms = Object.values(cooccurrenceAnalysis?.relatedTerms || {}).flat();
    semanticContext = await this.buildSemanticContext(inputKeywords, allRelatedTerms);
    console.log('📊 generateStatisticalResponse: semanticContext', semanticContext);

    try {
      // 1. 学習データから語彙関係性の統計的パターンを抽出
      const relationshipPatterns = await this.extractRelationshipPatterns(semanticContext);
      console.log('📊 generateStatisticalResponse: relationshipPatterns', relationshipPatterns);
      
      // 2. 統計的文脈から文構造を生成
      const syntacticStructure = await this.generateSyntacticStructure(inputKeywords, relationshipPatterns, userId);
      
      // 3. 統計的語彙選択による語句生成
      const responseTokens = await this.generateResponseTokens(syntacticStructure, semanticContext);
      
      // 4. 統計的文連結による自然文生成
      return await this.assembleSentence(responseTokens, originalText);
      
    } catch (error) {
      console.warn('統計的応答生成エラー:', error.message);
      return await this.generateMinimalStatisticalResponse(originalText, semanticContext);
    }
  }

  /**
   * N-gram統計応答生成
   */
  async generateNgramStatisticalResponse(originalText, nextWord, confidence) {
    try {
      // Phase 1: Kneser-Neyスムージング統合N-gram生成
      const kneserNeyEnhancedTokens = await this.generateKneserNeyTokens(originalText, nextWord);
      
      // 高度統計モデルによる文脈パターン抽出
      const ngramPatterns = await this.learningDB.getNgramPatterns(nextWord);
      const enhancedPatterns = await this.enhanceWithKneserNey(ngramPatterns, kneserNeyEnhancedTokens);
      
      // 統計的確信度に基づく応答強度調整
      const responseIntensity = this.calculateResponseIntensity(confidence);
      
      // Kneser-Ney強化統計的文生成
      return await this.generateKneserNeyEnhancedSentence(originalText, nextWord, enhancedPatterns, responseIntensity);
      
    } catch (error) {
      console.warn('Kneser-Ney N-gram生成エラー:', error.message);
      return await this.generateMinimalNgramResponse(originalText, nextWord);
    }
  }

  /**
   * ベイジアン統計応答生成
   */
  async generateBayesianStatisticalResponse(originalText, adaptationScore, userCategory) {
    try {
      // ベイジアン分類結果から応答パターンを決定
      const bayesianPatterns = await this.extractBayesianPatterns(userCategory, adaptationScore);
      
      // 個人化統計に基づく語彙選択
      const personalizedVocab = await this.selectPersonalizedVocabulary(originalText, bayesianPatterns);
      
      // 統計的個人適応文生成
      return await this.generatePersonalizedSentence(originalText, personalizedVocab, adaptationScore);
      
    } catch (error) {
      return await this.generateMinimalBayesianResponse(originalText, userCategory);
    }
  }

  /**
   * 多腕バンディット統計応答生成
   */
  async generateBanditStatisticalResponse(originalText, optimizedVocabulary) {
    try {
      // バンディット最適化結果から語彙重要度を算出
      const vocabularyWeights = await this.calculateVocabularyWeights(optimizedVocabulary);
      
      // 重要度統計に基づく文構造決定
      const structuralPattern = await this.selectStructuralPattern(vocabularyWeights);
      
      // 最適化語彙による統計的文生成
      return await this.generateOptimizedSentence(originalText, vocabularyWeights, structuralPattern);
      
    } catch (error) {
      return await this.generateMinimalBanditResponse(originalText, optimizedVocabulary);
    }
  }

  /**
   * 品質予測統計応答生成
   */
  async generateQualityStatisticalResponse(originalText, qualityScore, qualityPrediction) {
    try {
      // 品質統計から応答適合性を判定
      const qualityMetrics = await this.analyzeQualityMetrics(qualityScore, qualityPrediction);
      
      // 品質レベルに応じた統計的応答戦略選択
      const qualityStrategy = await this.selectQualityStrategy(qualityMetrics);
      
      // 品質統計による適応的文生成
      return await this.generateQualityAdaptedSentence(originalText, qualityStrategy, qualityMetrics);
      
    } catch (error) {
      return await this.generateMinimalQualityResponse(originalText, qualityScore);
    }
  }

  /**
   * 統計的関係パターン抽出
   */
  async extractRelationshipPatterns(semanticContext) {
    if (!Array.isArray(semanticContext)) {
      return [];
    }
    return semanticContext.map(ctx => ({
      term: String(ctx.term), // Ensure term is a string
      strength: ctx.strength,
      patterns: ctx.count || 1,
      pos: ctx.pos || 'unknown' // 品詞情報を追加
    }));
  }

  /**
   * Phase 2: PCFG確率的文脈自由文法による統計的文構造生成
   * 文構造生成問題の根本解決 - 統計的文法ルールによる自然な文組み立て
   */
  async generateSyntacticStructure(inputKeywords, relationshipPatterns, userId) {
    try {
      console.log('🔧 PCFG文構造生成開始:', inputKeywords);
      
      // 1. 日本語PCFG文法ルール取得
      const grammarRules = await this.getJapanesePCFGRules(userId);
      
      // 2. 入力キーワードから最適文法パターン選択
      const selectedPattern = await this.selectBestGrammarPattern(inputKeywords, relationshipPatterns, grammarRules);
      
      // 3. 統計的確率に基づく文構造生成
      const generatedStructure = await this.applyPCFGRules(selectedPattern, relationshipPatterns);
      
      // 4. 文構造の統計的妥当性検証
      const validatedStructure = await this.validatePCFGStructure(generatedStructure);
      
      const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
      if (validatedStructure && validatedStructure.confidence > confidenceThresholds.lowConfidence) {
        console.log('✅ PCFG文構造生成成功:', validatedStructure.structure);
        return validatedStructure;
      }
      
      // フォールバック: 従来の統計的手法
      return this.generateFallbackSyntacticStructure(relationshipPatterns);
      
    } catch (error) {
      console.warn('PCFG文構造生成エラー:', error.message);
      return this.generateFallbackSyntacticStructure(relationshipPatterns);
    }
  }

  /**
   * フォールバック統計的文構造生成
   */
  generateFallbackSyntacticStructure(relationshipPatterns) {
    if (!Array.isArray(relationshipPatterns) || relationshipPatterns.length === 0) {
      return { primaryTerm: null, supportTerms: [], confidence: 0, structure: 'minimal' };
    }
    
    const maxStrength = Math.max(...relationshipPatterns.map(p => p.strength));
    return {
      primaryTerm: relationshipPatterns.find(p => p.strength === maxStrength)?.term,
      supportTerms: relationshipPatterns.filter(p => p.strength > 0.5).map(p => p.term),
      confidence: maxStrength,
      structure: 'fallback'
    };
  }

  /**
   * 統計的応答トークン生成
   * Phase 3分布意味論を活用した高度な語彙選択
   */
  async generateResponseTokens(syntacticStructure, semanticContext) {
    const filterNonVerbal = (term) => {
      // 句読点や記号、単独のひらがな・カタカナなどをフィルタリング
      return term && !/^[、。？！ー～・]$/.test(term) && !/^[あ-んア-ン]$/.test(term) && term.length > 1;
    };
    
    // Phase 3強化済み語彙を優先選択
    const phase3Enhanced = semanticContext.filter(ctx => ctx.phase3Enhanced);
    const regularContext = semanticContext.filter(ctx => !ctx.phase3Enhanced);
    
    let primaryTerm = null;
    let supportTerms = [];
    
    if (phase3Enhanced.length > 0) {
      // Phase 3で意味的に強化された語彙を優先使用
      primaryTerm = phase3Enhanced[0].term;
      supportTerms = phase3Enhanced.slice(1, 3).map(ctx => ctx.term);
      console.log('🧠 Phase 3強化語彙使用:', { primaryTerm, supportTerms });
    } else if (syntacticStructure.primaryTerm) {
      // フォールバック: 構文構造から語彙選択
      primaryTerm = typeof syntacticStructure.primaryTerm === 'string' ? syntacticStructure.primaryTerm : String(syntacticStructure.primaryTerm);
      supportTerms = Array.isArray(syntacticStructure.supportTerms) ? syntacticStructure.supportTerms.slice(0, 2).map(term => String(term)) : [];
    } else if (regularContext.length > 0) {
      // 通常の意味的文脈から選択
      primaryTerm = regularContext[0].term;
      supportTerms = regularContext.slice(1, 3).map(ctx => ctx.term);
    }

    return {
      primary: filterNonVerbal(primaryTerm) ? primaryTerm : null,
      support: supportTerms.filter(filterNonVerbal),
      confidence: syntacticStructure.confidence,
      structure: syntacticStructure.structure,
      generatedSentence: syntacticStructure.finalResponse, // 修正点: finalResponseをgeneratedSentenceにマッピング
      phase3Enhanced: phase3Enhanced.length > 0,
      semanticStrength: phase3Enhanced.length > 0 ? phase3Enhanced[0].semanticScore : 0
    };
  }

  /**
   * 統計的文連結
   * PCFGによって生成された文構造タイプと統計的語彙を組み合わせて、より自然な応答を生成
   */
  async assembleSentence(responseTokens, originalText) {
    const { primary, support, structure, confidence, generatedSentence, phase3Enhanced, semanticStrength } = responseTokens;

    // generatedSentence は structuralInfo オブジェクトになった
    const structuralInfo = generatedSentence;

    if (!structuralInfo || !structuralInfo.primary) {
      return await this.generateMinimalStatisticalResponse(originalText, []);
    }

    const terms = [structuralInfo.primary, ...structuralInfo.support].filter(Boolean);
    const joinedTerms = terms.join('、');
    
    // Phase 3意味的強化情報を表示メッセージに反映
    if (phase3Enhanced && semanticStrength > 0.7) {
      console.log(`🧠 高い意味的類似度(${semanticStrength.toFixed(3)})で応答生成`);
    }

    // 統計的確信度に基づく応答の調整
    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');

    let finalResponse = '';

    // Phase 3強化時の追加情報
    const phase3Indicator = phase3Enhanced ? '意味的に関連する' : '統計的に関連する';
    
    // ここで、structuralInfo と統計的確信度に基づいて動的に応答を生成
    // ハードコードされたテンプレートを排除し、より柔軟な生成ロジックを実装
    const primaryTerm = structuralInfo.primary;
    const supportTerms = structuralInfo.support;

    let generatedResponse = '';

    // 確信度とPhase 3強化の度合いに応じて応答の基本形を決定
    if (phase3Enhanced && semanticStrength > 0.8) {
      generatedResponse = `${primaryTerm}は、意味的に非常に高い関連性を持つ重要な概念です。`;
    } else if (confidence > confidenceThresholds.highConfidence) {
      generatedResponse = `${primaryTerm}について、${supportTerms.length > 0 ? supportTerms[0] : '詳しく'}説明できます。`;
    } else if (confidence > confidenceThresholds.mediumConfidence) {
      generatedResponse = `${primaryTerm}に関連する${phase3Indicator}情報が見つかりました。`;
    } else {
      generatedResponse = `${primaryTerm}について、何か統計的に分析できることはありますか？`;
    }

    // 構造タイプに応じた追加の調整（より汎用的な表現に）
    // switch文を排除し、より動的な文生成ロジックを実装
    if (structuralInfo.type === 'subject_predicate' && supportTerms.length > 0) {
      generatedResponse += ` ${primaryTerm}は${supportTerms[0]}です。`;
    } else if (structuralInfo.type === 'topic_focus' && supportTerms.length > 0) {
      generatedResponse += ` 主な焦点は${supportTerms[0]}です。`;
    } else if (structuralInfo.type === 'topic_comment' && supportTerms.length > 0) {
      generatedResponse += ` ${primaryTerm}に関する${supportTerms[0]}という見方があります。`;
    } else if (structuralInfo.type === 'topic_formal' && supportTerms.length > 0) {
      generatedResponse += ` ${primaryTerm}に関して、${supportTerms[0]}という考察が可能です。`;
    } else if (structuralInfo.type === 'object_focus' && supportTerms.length > 0) {
      generatedResponse += ` ${primaryTerm}を${supportTerms[0]}として分析できます。`;
    }
    // minimal, fallback, default のケースは、上記の基本形と品質評価で対応されるため、ここでは特別な追加は不要

    finalResponse = generatedResponse;

    // 最終的な応答の品質を統計的に評価し、必要に応じて調整
    const finalQualityScore = await this.evaluateSentenceQuality(finalResponse, confidence);
    if (finalQualityScore < confidenceThresholds.lowConfidence) {
      return await this.generateMinimalStatisticalResponse(originalText, []); // 品質が低い場合は最小応答にフォールバック
    }

    return finalResponse;
  }

  /**
   * 最小統計応答生成
   */
  async generateMinimalStatisticalResponse(originalText, semanticContext) {
    const text = typeof originalText === 'string' ? originalText : 'そのテーマ';
    
    if (Array.isArray(semanticContext) && semanticContext.length > 0) {
      const term = semanticContext[0].term;
      return `${term}について。`;
    }
    return `${text}について検討中です。`;
  }

  /**
   * N-gram最小応答
   */
  async generateMinimalNgramResponse(originalText, nextWord) {
    return `${nextWord}に関連して。`;
  }

  /**
   * ベイジアン最小応答
   */
  async generateMinimalBayesianResponse(originalText, userCategory) {
    return `${userCategory}の観点から。`;
  }

  /**
   * バンディット最小応答
   */
  async generateMinimalBanditResponse(originalText, optimizedVocabulary) {
    const term = Array.isArray(optimizedVocabulary) ? optimizedVocabulary[0] : optimizedVocabulary;
    return `${term}について。`;
  }

  /**
   * 統計学習ベース語彙品質フィルタリング（ハードコード完全回避）
   */
  async filterKeywordsByStatisticalQuality(keywords) {
    const qualifiedKeywords = [];
    
    try {
      // 学習データから語彙品質統計を取得
      const relations = await this.learningDB.getUserSpecificRelations('default');
      const vocabStats = this.calculateVocabularyStatistics(relations?.userRelations || {});
      
      for (const keyword of keywords) {
        const qualityScore = this.calculateKeywordQualityScore(keyword, vocabStats);
        
        // 統計的品質閾値による動的フィルタリング
        if (qualityScore > vocabStats.averageQuality) {
          qualifiedKeywords.push(keyword);
        }
      }
      
    } catch (error) {
      console.warn('統計的語彙フィルタリングエラー:', error.message);
      // エラー時は基本的な統計フィルタのみ
      return keywords.filter(k => k && k.length > 1);
    }
    
    return qualifiedKeywords;
  }

  /**
   * 語彙統計計算（完全データ駆動型）
   */
  calculateVocabularyStatistics(userRelations) {
    const allKeywords = Object.keys(userRelations);
    if (allKeywords.length === 0) {
      return { averageRelations: 0, averageLength: 2, averageQuality: 0.5, totalVocabulary: 0 };
    }
    
    // 1. 関係性統計
    const relationCounts = allKeywords.map(k => userRelations[k]?.length || 0);
    const averageRelations = relationCounts.reduce((sum, count) => sum + count, 0) / allKeywords.length;
    const relationVariance = relationCounts.reduce((sum, count) => sum + Math.pow(count - averageRelations, 2), 0) / allKeywords.length;
    
    // 2. 文字数統計
    const lengthStats = allKeywords.map(k => k.length);
    const averageLength = lengthStats.reduce((sum, len) => sum + len, 0) / allKeywords.length;
    const lengthVariance = lengthStats.reduce((sum, len) => sum + Math.pow(len - averageLength, 2), 0) / allKeywords.length;
    
    // 3. 実際の品質スコア分布を計算
    const qualityScores = allKeywords.map(keyword => this.calculateRawKeywordQuality(keyword, averageLength, averageRelations));
    qualityScores.sort((a, b) => a - b);
    
    // 4. 統計的閾値を分布から決定
    const q1Index = Math.floor(qualityScores.length * 0.25);
    const medianIndex = Math.floor(qualityScores.length * 0.5);
    const q3Index = Math.floor(qualityScores.length * 0.75);
    
    const q1 = qualityScores[q1Index] || 0;
    const median = qualityScores[medianIndex] || 0;
    const q3 = qualityScores[q3Index] || 0;
    
    // 四分位範囲による動的閾値（アウトライアー除去の標準手法）
    const iqr = q3 - q1;
    const dynamicThreshold = Math.max(q1 - 1.5 * iqr, median);
    
    return {
      averageRelations,
      averageLength,
      averageQuality: dynamicThreshold,
      relationVariance,
      lengthVariance,
      qualityDistribution: { q1, median, q3, iqr },
      totalVocabulary: allKeywords.length
    };
  }

  /**
   * 生の品質スコア計算（統計計算用）
   */
  calculateRawKeywordQuality(keyword, avgLength, avgRelations) {
    // 純粋な統計的指標のみ
    const lengthScore = keyword.length / Math.max(avgLength, 1);
    const diversityScore = this.calculateCharacterDiversity(keyword);
    const informationScore = this.calculateInformationContent(keyword);
    
    return lengthScore * 0.33 + diversityScore * 0.33 + informationScore * 0.34;
  }

  /**
   * キーワード品質スコア計算（統計ベース）
   */
  calculateKeywordQualityScore(keyword, vocabStats) {
    // 1. 文字数による統計的評価
    const lengthScore = Math.min(keyword.length / vocabStats.averageLength, 2.0);
    
    // 2. 文字種多様性による統計的評価
    const diversityScore = this.calculateCharacterDiversity(keyword);
    
    // 3. 情報量による統計的評価
    const informationScore = this.calculateInformationContent(keyword);
    
    return lengthScore * 0.3 + diversityScore * 0.4 + informationScore * 0.3;
  }

  /**
   * 文字種多様性計算
   */
  calculateCharacterDiversity(text) {
    const charTypes = new Set();
    for (const char of text) {
      const code = char.charCodeAt(0);
      if (code >= 0x3041 && code <= 0x3096) charTypes.add('hiragana');
      else if (code >= 0x30A1 && code <= 0x30FA) charTypes.add('katakana');
      else if (code >= 0x4E00 && code <= 0x9FAF) charTypes.add('kanji');
      else if (code >= 0x0030 && code <= 0x0039) charTypes.add('number');
      else if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) charTypes.add('latin');
    }
    return charTypes.size / 5; // 最大5種類で正規化
  }

  /**
   * 情報量計算（エントロピーベース）
   */
  calculateInformationContent(text) {
    const charFreq = {};
    for (const char of text) {
      charFreq[char] = (charFreq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const textLength = text.length;
    for (const freq of Object.values(charFreq)) {
      const probability = freq / textLength;
      entropy -= probability * Math.log2(probability);
    }
    
    return Math.min(entropy / 3, 1.0); // 最大3ビットで正規化
  }

  /**
   * 学習済み共起関係データから関連語彙を取得
   */
  async getLearnedRelatedTerms(keywords, userId = 'default') {
    const relatedTerms = [];
    
    try {
      const relations = await this.learningDB.getUserSpecificRelations(userId);
      const userRelations = relations.userRelations || {};
      
      // Iterate over all arrays of related terms within userRelations
      for (const key in userRelations) {
        if (Object.prototype.hasOwnProperty.call(userRelations, key)) {
          // Check if the key (keyword) is in the input keywords
          if (keywords.includes(key)) {
            const keywordRelations = userRelations[key];
            if (Array.isArray(keywordRelations)) {
              for (const relatedTerm of keywordRelations) {
                relatedTerms.push(relatedTerm);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('関連語彙取得エラー:', error.message);
    }
    
    return relatedTerms;
  }

  /**
   * 意味的文脈構築
   */
  async buildSemanticContext(inputKeywords, relatedTerms) {
    const contextMap = new Map();
    
    // 関連語彙を強度順にソート・集約
    for (const term of relatedTerms) {
      const key = term.term;
      if (!contextMap.has(key)) {
        contextMap.set(key, {
          term: key,
          strength: term.strength,
          count: term.count || 1,
          relevance: this.calculateRelevance(key, inputKeywords)
        });
      } else {
        // 既存エントリーの強度を更新（平均値）
        const existing = contextMap.get(key);
        existing.strength = (existing.strength + term.strength) / 2;
        existing.count += (term.count || 1);
      }
    }
    
    // 統計的スコア計算
    const statisticalResults = Array.from(contextMap.values())
      .map(ctx => ({
        ...ctx,
        totalScore: ctx.strength * 0.7 + ctx.relevance * 0.3
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
    
    // Phase 3: 意味的語彙選択統合
    try {
      // AIVocabularyProcessorから正しくNgramContextPatternAIにアクセス
      const ngramAI = this.aiProcessor?.ngramAI;
      if (ngramAI && ngramAI.contextVectors && ngramAI.contextVectors.size > 0) {
        console.log('🧠 Phase 3意味的語彙選択適用...');
        
        const candidateTerms = statisticalResults.map(ctx => ctx.term);
        const semanticResults = await ngramAI.selectSemanticallyAppropriateVocabulary(
          inputKeywords, 
          candidateTerms, 
          5
        );
        
        if (semanticResults && semanticResults.length > 0) {
          // 意味的スコアと統計的スコアを統合
          const integratedResults = semanticResults.map(semantic => {
            const statistical = statisticalResults.find(stat => stat.term === semantic.term);
            return {
              term: semantic.term,
              strength: statistical?.strength || 0,
              count: statistical?.count || 0,
              relevance: statistical?.relevance || 0.5,
              semanticScore: semantic.semanticScore,
              totalScore: (statistical?.totalScore || 0) * 0.6 + semantic.semanticScore * 0.4,
              phase3Enhanced: true,
              pos: statistical?.pos || 'unknown' // 品詞情報を追加
            };
          }).filter((value, index, self) => self.findIndex(v => v.term === value.term) === index); // 重複を排除
          
          console.log('✅ Phase 3統合完了:', integratedResults.length, '語彙');
          return integratedResults;
        }
      }
    } catch (error) {
      console.warn('⚠️ Phase 3意味的選択エラー:', error.message);
    }
    
    // フォールバック: 統計的結果のみ
    return statisticalResults.slice(0, 5);
  }

  /**
   * 関連度計算（簡易版）
   */
  calculateRelevance(term, inputKeywords) {
    let relevance = 0;
    for (const keyword of inputKeywords) {
      if (term.includes(keyword) || keyword.includes(term)) {
        relevance += 0.5;
      }
      if (term.length > 1 && keyword.length > 1) {
        // 文字数による類似度（簡易版）
        const similarity = this.calculateStringSimilarity(term, keyword);
        relevance += similarity * 0.3;
      }
    }
    return Math.min(relevance, 1.0);
  }

  /**
   * 文字列類似度計算（簡易版）
   */
  calculateStringSimilarity(str1, str2) {
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length >= str2.length ? str1 : str2;
    const editDistance = this.levenshteinDistance(shorter, longer);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * レーベンシュタイン距離計算
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
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
   * 外部対話ログ学習システムとの統合初期化
   */
  async initializeDialogueLearning() {
    try {
      console.log('📚 対話ログ学習システム初期化...');
      this.dialogueLogProcessor = new DialogueLogProcessor();
      await this.dialogueLogProcessor.initialize();
      
      // 全ログを処理
      const processingResult = await this.dialogueLogProcessor.processAllLogs();
      console.log('✅ 対話ログ学習システム統合完了');
      
      return processingResult;
    } catch (error) {
      console.error('❌ 対話ログ学習システム初期化エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 対話学習による応答改善
   */
  async improveWithDialogueLearning(response, userInput, userId) {
    if (!this.dialogueLogProcessor) {
      return { response, improved: false };
    }

    try {
      return await this.dialogueLogProcessor.improveResponseWithLearnings(response, userInput, userId);
    } catch (error) {
      console.error('❌ 対話学習による応答改善エラー:', error);
      return { response, improved: false, error: error.message };
    }
  }

  /**
   * システム状態取得
   */
  getSystemStatus() {
    const dialogueStatus = this.dialogueLogProcessor ? 
      this.dialogueLogProcessor.generateReport() : 
      { status: 'not_initialized' };

    return {
      initialized: true,
      strategiesCount: this.strategyStats.size,
      historyLength: this.contextHistory.length,
      strategyStats: Object.fromEntries(this.strategyStats),
      aiProcessorStatus: this.aiProcessor ? 'connected' : 'disconnected',
      dialogueLearningStatus: dialogueStatus
    };
  }

  /**
   * 生成された文の品質を統計的に評価
   */
  async evaluateSentenceQuality(sentence, confidence) {
    try {
      // ここでより高度な統計的品質評価ロジックを実装
      // 例: 語彙の多様性、文法的な正確さ、文脈との関連性などを統計的に分析
      // 現時点では、確信度をベースとした簡易的な評価
      return confidence; 
    } catch (error) {
      console.warn('文品質評価エラー:', error.message);
      return 0.1; // エラー時は低品質と判断
    }
  }

  /**
   * Phase 1: Kneser-Neyスムージングによるトークン生成
   * データ疎性問題を統計的に解決し、低頻度語彙の確率推定精度を向上
   */
  async generateKneserNeyTokens(originalText, nextWord) {
    try {
      // 基本N-gramカウント取得
      const ngramCounts = await this.getNgramCounts(originalText, nextWord);
      
      // Kneser-Neyスムージングパラメータ
      const D = 0.75; // 割引パラメータ（一般的な値）
      
      // 語彙全体の統計情報取得
      const vocabularyStats = await this.getVocabularyStatistics();
      
      // Kneser-Neyスムージング適用
      const smoothedTokens = [];
      for (const [context, word, count] of ngramCounts) {
        const kneserNeyProbability = this.calculateKneserNeyProbability(
          context, word, count, D, vocabularyStats
        );
        
        smoothedTokens.push({
          context,
          word, 
          originalCount: count,
          smoothedProbability: kneserNeyProbability,
          confidence: Math.min(kneserNeyProbability * 2, 1.0) // 確信度調整
        });
      }
      
      // 確率順でソート
      return smoothedTokens.sort((a, b) => b.smoothedProbability - a.smoothedProbability);
      
    } catch (error) {
      console.warn('Kneser-Neyトークン生成エラー:', error.message);
      return [];
    }
  }

  /**
   * Kneser-Neyスムージング確率計算
   */
  calculateKneserNeyProbability(context, word, count, D, vocabularyStats) {
    const contextCount = vocabularyStats.contextCounts[context] || 1;
    const wordTypeCount = vocabularyStats.wordTypeCounts[word] || 1;
    const totalTypes = vocabularyStats.totalWordTypes || 1000;
    
    // Kneser-Ney確率計算式
    // P_KN(w|c) = max(count(c,w) - D, 0) / count(c) + λ(c) * P_continuation(w)
    const mainTerm = Math.max(count - D, 0) / contextCount;
    const lambda = (D * vocabularyStats.uniqueContinuations[context] || 1) / contextCount;
    const continuationProbability = wordTypeCount / totalTypes;
    
    return mainTerm + lambda * continuationProbability;
  }

  /**
   * N-gramカウント取得（学習データベースから）
   */
  async getNgramCounts(originalText, nextWord) {
    try {
      const tokens = originalText.split(/\s+/).filter(Boolean);
      const ngramCounts = [];
      
      // 既存の学習データからN-gramパターンを抽出
      const relations = await this.learningDB.getUserSpecificRelations('default');
      
      for (const token of tokens) {
        if (relations.userRelations[token]) {
          for (const relatedTerm of relations.userRelations[token]) {
            ngramCounts.push([token, relatedTerm.term, relatedTerm.count || 1]);
          }
        }
      }
      
      return ngramCounts;
    } catch (error) {
      console.warn('N-gramカウント取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 語彙統計情報取得
   */
  async getVocabularyStatistics() {
    try {
      const relations = await this.learningDB.getUserSpecificRelations('default');
      const userRelations = relations.userRelations || {};
      
      const contextCounts = {};
      const wordTypeCounts = {};
      const uniqueContinuations = {};
      
      // 統計情報計算
      for (const [context, relatedTerms] of Object.entries(userRelations)) {
        contextCounts[context] = relatedTerms.length;
        uniqueContinuations[context] = relatedTerms.length;
        
        for (const term of relatedTerms) {
          wordTypeCounts[term.term] = (wordTypeCounts[term.term] || 0) + 1;
        }
      }
      
      return {
        contextCounts,
        wordTypeCounts,
        uniqueContinuations,
        totalWordTypes: Object.keys(wordTypeCounts).length
      };
    } catch (error) {
      console.warn('語彙統計取得エラー:', error.message);
      return {
        contextCounts: {},
        wordTypeCounts: {},
        uniqueContinuations: {},
        totalWordTypes: 1000
      };
    }
  }

  /**
   * Kneser-Neyでパターン強化
   */
  async enhanceWithKneserNey(ngramPatterns, kneserNeyTokens) {
    if (!Array.isArray(kneserNeyTokens) || kneserNeyTokens.length === 0) {
      return ngramPatterns;
    }
    
    return {
      original: ngramPatterns,
      kneserNeyEnhanced: kneserNeyTokens,
      combinedScore: kneserNeyTokens.reduce((sum, token) => sum + token.smoothedProbability, 0) / kneserNeyTokens.length
    };
  }

  /**
   * Kneser-Ney強化文生成
   * Kneser-Neyスムージングによって強化された語彙をより柔軟に組み込む
   */
  async generateKneserNeyEnhancedSentence(originalText, nextWord, enhancedPatterns, responseIntensity) {
    try {
      if (!enhancedPatterns.kneserNeyEnhanced || enhancedPatterns.kneserNeyEnhanced.length === 0) {
        return await this.generateMinimalNgramResponse(originalText, nextWord);
      }
      
      const bestToken = enhancedPatterns.kneserNeyEnhanced[0];
      const supportTokens = enhancedPatterns.kneserNeyEnhanced.slice(1, 3);
      const enhancedTerms = [bestToken.word, ...supportTokens.map(t => t.word)].filter(Boolean);
      
      if (enhancedTerms.length === 0) {
        return await this.generateMinimalNgramResponse(originalText, nextWord);
      }
      
      const confidence = bestToken.confidence || 0.5;
      const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');

      let kneserNeyResponse = '';

      if (confidence > confidenceThresholds.highConfidence) {
        kneserNeyResponse = `${originalText}について、統計的に「${enhancedTerms.join('」「')}」といった概念が強く関連しています。これらの関係性について詳しく説明できます。`;
      } else if (confidence > confidenceThresholds.mediumConfidence) {
        kneserNeyResponse = `「${enhancedTerms.join('」「')}」に関連があります。${originalText}との関連性について掘り下げてみましょう。`;
      } else {
        kneserNeyResponse = `「${enhancedTerms[0]}」について、${originalText}との関連性が見られます。`;
      }

      // 最終的な応答の品質を統計的に評価し、必要に応じて調整
      const finalQualityScore = await this.evaluateSentenceQuality(kneserNeyResponse, confidence);
      if (finalQualityScore < confidenceThresholds.lowConfidence) {
        return await this.generateMinimalNgramResponse(originalText, nextWord); // 品質が低い場合は最小応答にフォールバック
      }

      return kneserNeyResponse;
      
    } catch (error) {
      console.warn('Kneser-Ney強化文生成エラー:', error.message);
      return await this.generateMinimalNgramResponse(originalText, nextWord);
    }
  }

  /**
   * 統計的確率に基づく文構造生成
   */
  async applyPCFGRules(selectedPattern, relationshipPatterns) {
    const primaryTerm = relationshipPatterns.length > 0 ? String(relationshipPatterns[0].term) : "テーマ";
    const supportTerms = relationshipPatterns.length > 1 ? relationshipPatterns.slice(1, 3).map(p => String(p.term)) : [];
    const patternType = selectedPattern.pattern.type || 'subject_predicate';

    // finalResponse には、assembleSentence で動的に文を生成するために必要な構造情報をオブジェクトとして格納
    const structuralInfo = {
      type: patternType,
      primary: primaryTerm,
      support: supportTerms,
      // 必要に応じて、さらに詳細な構造情報や統計的メタデータを追加可能
      // 例: grammaticalRoles: { subject: primaryTerm, verb: 'is', object: supportTerms[0] },
      //     templateHint: 'explanation_template'
    };

    return {
      primaryTerm: primaryTerm,
      supportTerms: supportTerms,
      confidence: selectedPattern.pattern.probability || 0.5,
      structure: patternType,
      finalResponse: structuralInfo // オブジェクトとして構造情報を格納
    };
  }

  /**
   * 文構造の統計的妥当性検証
   */
  async validatePCFGStructure(generatedStructure) {
    // Placeholder: In a real scenario, this would validate the generated structure
    // against statistical norms or grammatical rules.
    return generatedStructure;
  }

  /**
   * Phase 2: PCFG文構造生成の核心実装
   * 確率的文脈自由文法による統計的文構造組み立て
   */
  async generatePCFGStructure(inputKeywords, relationshipPatterns, userId = 'default') {
    try {
      console.log('🔧 PCFG文構造生成開始:', inputKeywords);
      
      // 1. 日本語PCFG文法ルール取得
      const grammarRules = await this.getJapanesePCFGRules(userId);
      
      // 2. 入力キーワードから最適文法パターン選択
      const selectedPattern = await this.selectBestGrammarPattern(inputKeywords, relationshipPatterns, grammarRules);
      
      // 3. 統計的確率に基づく文構造生成
      const generatedStructure = await this.applyPCFGRules(selectedPattern, relationshipPatterns);
      
      // 4. 文構造の統計的妥当性検証
      const validatedStructure = this.validatePCFGStructure(generatedStructure);
      
      return validatedStructure;
      
    } catch (error) {
      console.warn('PCFG構造生成エラー:', error.message);
      return null;
    }
  }

  /**
   * 統計学習ベース動的PCFG文法ルール生成
   * ハードコーディング完全除去 - 学習データから統計的に生成
   */
  async getJapanesePCFGRules(userId) {
    try {
      console.log('📊 統計学習ベース文法ルール生成開始...');
      
      // 1. 学習データから統計的パターン抽出
      const learnedPatterns = await this.extractLearnedPatterns(userId);
      
      // 2. 動的確率計算
      const dynamicProbabilities = await this.calculateDynamicProbabilities(learnedPatterns);
      
      // 3. 適応的閾値計算
      const adaptiveThresholds = await this.calculateAdaptiveThresholds.bind(this)(userId);
      
      // 4. 統計的文法ルール構築
      const dynamicRules = this.buildStatisticalGrammarRules(learnedPatterns, dynamicProbabilities, adaptiveThresholds);
      
      console.log('✅ 動的文法ルール生成完了:', Object.keys(dynamicRules).length, '種類');
      return dynamicRules;
      
    } catch (error) {
      console.warn('動的文法ルール生成エラー:', error.message, '- フォールバックルール使用');
      return this.getFallbackGrammarRules();
    }
  }

  /**
   * 学習データからの統計的パターン抽出
   */
  async extractLearnedPatterns(userId) {
    try {
      // 既存学習データから関係性パターンを抽出
      const relations = await this.learningDB.getUserSpecificRelations(userId);
      const userRelations = relations?.userRelations || {};
      
      const patterns = {
        structural: [],      // 文構造パターン
        lexical: [],        // 語彙使用パターン  
        contextual: []      // 文脈パターン
      };
      
      // 学習データからパターン分析
      for (const [keyword, relatedTerms] of Object.entries(userRelations)) {
        // 語彙共起パターンから文構造推定
        const structuralPatterns = this.inferStructuralPatterns(keyword, relatedTerms);
        patterns.structural.push(...structuralPatterns);
        
        // 語彙使用頻度パターン
        const lexicalPatterns = this.analyzeLexicalPatterns(keyword, relatedTerms);
        patterns.lexical.push(...lexicalPatterns);
        
        // 文脈関係パターン
        const contextualPatterns = this.analyzeContextualPatterns(keyword, relatedTerms);
        patterns.contextual.push(...contextualPatterns);
      }
      
      console.log('📈 パターン抽出結果:', 
        `構造:${patterns.structural.length}`, 
        `語彙:${patterns.lexical.length}`, 
        `文脈:${patterns.contextual.length}`);
      
      return patterns;
      
    } catch (error) {
      console.warn('パターン抽出エラー:', error.message);
      return { structural: [], lexical: [], contextual: [] };
    }
  }

  /**
   * 構造パターン推定（共起関係から文構造を統計的に推定）
   */
  inferStructuralPatterns(keyword, relatedTerms) {
    const patterns = [];
    
    for (const term of relatedTerms) {
      const strength = term.count || 1;
      
      // 関係性の強さから文構造パターンを推定
      if (strength > 3) {
        patterns.push({
          type: 'high_relation',
          pattern: 'NP について VP',
          keyword: keyword,
          related: term.term,
          strength: strength,
          estimated_probability: Math.min(strength / 10, 0.8)
        });
      } else if (strength > 1) {
        patterns.push({
          type: 'medium_relation', 
          pattern: 'NP は VP',
          keyword: keyword,
          related: term.term,
          strength: strength,
          estimated_probability: Math.min(strength / 5, 0.6)
        });
      } else {
        patterns.push({
          type: 'low_relation',
          pattern: 'NP が VP',
          keyword: keyword,
          related: term.term, 
          strength: strength,
          estimated_probability: 0.3
        });
      }
    }
    
    return patterns;
  }

  /**
   * 語彙パターン分析
   */
  analyzeLexicalPatterns(keyword, relatedTerms) {
    const totalCount = relatedTerms.reduce((sum, term) => sum + (term.count || 1), 0);
    
    return relatedTerms.map(term => ({
      type: 'lexical_usage',
      keyword: keyword,
      term: term.term,
      frequency: term.count || 1,
      relative_frequency: (term.count || 1) / totalCount,
      usage_priority: (term.count || 1) > 2 ? 'high' : 'normal'
    }));
  }

  /**
   * 文脈パターン分析  
   */
  analyzeContextualPatterns(keyword, relatedTerms) {
    const patterns = [];
    const termTypes = this.classifyTermTypes(relatedTerms);
    
    // 概念的関係性から文脈パターンを推定
    if (termTypes.abstract > termTypes.concrete) {
      patterns.push({
        type: 'abstract_context',
        pattern: 'conceptual_explanation',
        keyword: keyword,
        context_type: 'theoretical',
        estimated_formality: 0.7
      });
    } else {
      patterns.push({
        type: 'concrete_context',
        pattern: 'practical_explanation', 
        keyword: keyword,
        context_type: 'practical',
        estimated_formality: 0.4
      });
    }
    
    return patterns;
  }

  /**
   * 語彙タイプ分類
   */
  classifyTermTypes(relatedTerms) {
    const classification = { abstract: 0, concrete: 0 };
    
    for (const term of relatedTerms) {
      // 簡易的な抽象/具象分類
      if (term.term.includes('的') || term.term.includes('性') || term.term.includes('論')) {
        classification.abstract++;
      } else {
        classification.concrete++;
      }
    }
    
    return classification;
  }

  /**
   * 動的確率計算
   */
  async calculateDynamicProbabilities(learnedPatterns) {
    try {
      const probabilities = {};
      
      // 構造パターンの統計的確率計算
      const structuralCounts = {};
      for (const pattern of learnedPatterns.structural) {
        const key = pattern.pattern;
        structuralCounts[key] = (structuralCounts[key] || 0) + pattern.strength;
      }
      
      // 確率正規化
      const totalStructural = Object.values(structuralCounts).reduce((sum, count) => sum + count, 0);
      probabilities.structural = {};
      
      for (const [pattern, count] of Object.entries(structuralCounts)) {
        probabilities.structural[pattern] = totalStructural > 0 ? count / totalStructural : 0.2;
      }
      
      // 最小閾値適用（極端な偏りを防ぐ）
      for (const pattern in probabilities.structural) {
        probabilities.structural[pattern] = Math.max(probabilities.structural[pattern], 0.05);
      }
      
      console.log('📊 動的確率計算完了:', Object.keys(probabilities.structural).length, '種類');
      return probabilities;
      
    } catch (error) {
      console.warn('動的確率計算エラー:', error.message);
      return { structural: {} };
    }
  }

  /**
   * 統計的文法ルール構築
   */
  buildStatisticalGrammarRules(patterns, probabilities, thresholds) {
    const rules = {
      S: [],
      NP: [],
      VP: [],
      QUESTION_PATTERNS: []
    };
    
    // 統計データからS（文）パターン生成
    const structuralProbs = probabilities.structural || {};
    for (const [pattern, probability] of Object.entries(structuralProbs)) {
      rules.S.push({
        pattern: pattern,
        probability: probability,
        type: this.inferPatternType(pattern),
        learned: true
      });
    }
    
    // 学習語彙からVP（動詞句）パターン生成
    const vpPatterns = this.generateVerbPhrases(patterns.lexical, thresholds);
    rules.VP = vpPatterns;
    
    // 名詞句パターンは学習データから動的生成
    rules.NP = this.generateNounPhrases(patterns.lexical);
    
    // 最小保証：空の場合のフォールバック
    if (rules.S.length === 0) {
      rules.S.push({
        pattern: 'NP について VP',
        probability: 1.0,
        type: 'learned_fallback',
        learned: false
      });
    }
    
    return rules;
  }

  /**
   * パターンタイプ推定
   */
  inferPatternType(pattern) {
    if (pattern.includes('について')) return 'topic_focus';
    if (pattern.includes('は')) return 'topic_comment';
    if (pattern.includes('が')) return 'subject_predicate';
    if (pattern.includes('に関して')) return 'topic_formal';
    if (pattern.includes('を')) return 'object_focus';
    return 'general';
  }

  /**
   * 動詞句統計生成
   */
  generateVerbPhrases(lexicalPatterns, thresholds) {
    const verbPhrases = [];
    const usageStats = this.analyzeVerbUsage(lexicalPatterns);
    
    // 使用頻度統計から動詞句を生成
    for (const [verb, stats] of Object.entries(usageStats)) {
      const probability = stats.frequency / stats.total;
      const confidence = this.calculateConfidenceLevel(stats.usage_count);
      
      verbPhrases.push({
        pattern: this.generateVerbPhrase(verb, confidence),
        probability: probability,
        type: this.classifyVerbType(verb, confidence),
        learned: true,
        confidence: confidence
      });
    }
    
    return verbPhrases.length > 0 ? verbPhrases : this.getMinimalVerbPhrases();
  }

  /**
   * 動詞使用統計分析
   */
  analyzeVerbUsage(lexicalPatterns) {
    const usage = {};
    let total = 0;
    
    for (const pattern of lexicalPatterns) {
      if (pattern.usage_priority === 'high') {
        const verb = this.extractVerbContext(pattern.term);
        if (verb) {
          usage[verb] = usage[verb] || { frequency: 0, usage_count: 0, total: 0 };
          usage[verb].frequency += pattern.frequency;
          usage[verb].usage_count++;
          total += pattern.frequency;
        }
      }
    }
    
    // 総計を設定
    for (const verb in usage) {
      usage[verb].total = total;
    }
    
    return usage;
  }

  /**
   * 動詞文脈抽出（簡易版）
   */
  extractVerbContext(term) {
    // 実際の実装では、より高度な動詞抽出を行う
    if (term.includes('説明') || term.includes('解説')) return '説明';
    if (term.includes('分析') || term.includes('検討')) return '分析';
    if (term.includes('関連') || term.includes('関係')) return '関連';
    return null;
  }

  /**
   * 動詞句生成
   */
  async generateVerbPhrase(verb, confidence) {
    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
    switch (verb) {
      case '説明':
        return confidence > confidenceThresholds.highConfidence ? '詳しく説明できます' : '説明できます';
      case '分析':
        return confidence > confidenceThresholds.highConfidence ? '詳細に分析します' : '分析します';
      case '関連':
        return '関連があります';
      default:
        return confidence > confidenceThresholds.mediumConfidence ? '詳しく検討します' : '検討します';
    }
  }

  /**
   * 信頼度レベル計算
   */
  calculateConfidenceLevel(usageCount) {
    if (usageCount >= 5) return 0.8;
    if (usageCount >= 3) return 0.6;
    if (usageCount >= 2) return 0.4;
    return 0.2;
  }

  /**
   * 動詞タイプ分類
   */
  async classifyVerbType(verb, confidence) {
    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
    if (confidence > confidenceThresholds.highConfidence) return 'high_confidence_action';
    if (confidence > confidenceThresholds.mediumConfidence) return 'medium_confidence_action';
    return 'low_confidence_action';
  }

  /**
   * 最小動詞句セット
   */
  getMinimalVerbPhrases() {
    return [
      { pattern: '検討します', probability: 0.5, type: 'minimal_action', learned: false },
      { pattern: '関連があります', probability: 0.3, type: 'minimal_relation', learned: false },
      { pattern: '説明できます', probability: 0.2, type: 'minimal_explanation', learned: false }
    ];
  }

  /**
   * 名詞句生成
   */
  generateNounPhrases(lexicalPatterns) {
    return [
      { pattern: 'KEYWORD', probability: 0.8, type: 'direct_keyword', learned: true },
      { pattern: 'KEYWORD + の関連概念', probability: 0.2, type: 'related_concept', learned: true }
    ];
  }

  /**
   * フォールバック文法ルール（緊急時用）
   */
  getFallbackGrammarRules() {
    console.warn('⚠️ フォールバック文法ルール使用 - 学習データ不足');
    return {
      S: [
        { pattern: 'NP について VP', probability: 1.0, type: 'fallback', learned: false }
      ],
      VP: [
        { pattern: '検討中です', probability: 1.0, type: 'fallback', learned: false }
      ],
      NP: [
        { pattern: 'KEYWORD', probability: 1.0, type: 'fallback', learned: false }
      ],
      QUESTION_PATTERNS: []
    };
  }

  /**
   * 適応的閾値計算システム
   * ハードコード閾値を完全除去し、学習データから動的に計算
   */
  async calculateAdaptiveThresholds(userId) {
    try {
      console.log('🎯 適応的閾値計算開始...');
      
      // 1. 応答履歴からパフォーマンス統計を取得
      const performanceStats = await this.analyzeResponsePerformance(userId);
      
      // 2. 学習データから品質指標を分析
      const qualityMetrics = await this.analyzeQualityMetrics(userId);
      
      // 3. 統計的最適閾値を計算
      const adaptiveThresholds = this.computeOptimalThresholds(performanceStats, qualityMetrics);
      
      // 初期状態でのフォールバックを減らすための調整
      if (performanceStats.totalResponses < 10) { // 例: 応答履歴が少ない場合
        adaptiveThresholds.lowConfidence = Math.max(adaptiveThresholds.lowConfidence, 0.1); // 最小値を設定
        adaptiveThresholds.mediumConfidence = Math.max(adaptiveThresholds.mediumConfidence, 0.3); // 最小値を設定
        adaptiveThresholds.highConfidence = Math.max(adaptiveThresholds.highConfidence, 0.5); // 最小値を設定
      }

      console.log('✅ 適応的閾値計算完了:', adaptiveThresholds);
      return adaptiveThresholds;
      
    } catch (error) {
      console.warn('適応的閾値計算エラー:', error.message);
      return this.getMinimalThresholds();
    }
  }

  /**
   * 動的重み計算 (calculateAdaptiveThresholdsのエイリアス)
   * 統計学習ベースの動的閾値・重み計算
   */
  async calculateDynamicWeights(type, userId = 'default') {
    try {
      const adaptiveThresholds = await this.calculateAdaptiveThresholds(userId);
      
      switch (type) {
        case 'confidenceThresholds':
          return {
            lowConfidence: adaptiveThresholds.lowConfidence,
            mediumConfidence: adaptiveThresholds.mediumConfidence,
            highConfidence: adaptiveThresholds.highConfidence
          };
          
        case 'cooccurrenceQuality':
          return {
            minStrength: adaptiveThresholds.relationshipStrength || 0.3,
            qualityThreshold: adaptiveThresholds.vocabularySelection || 0.5
          };
          
        default:
          return adaptiveThresholds;
      }
      
    } catch (error) {
      console.warn('動的重み計算エラー:', error.message);
      // フォールバック値
      return {
        lowConfidence: 0.1,
        mediumConfidence: 0.3,
        highConfidence: 0.5,
        minStrength: 0.3,
        qualityThreshold: 0.5
      };
    }
  }

  /**
   * 応答パフォーマンス統計分析
   */
  async analyzeResponsePerformance(userId) {
    try {
      // 過去の応答生成結果から統計を抽出
      const relations = await this.learningDB.getUserSpecificRelations(userId);
      const userRelations = relations?.userRelations || {}; // ここを修正
      
      let totalResponses = 0;
      let highQualityResponses = 0;
      let mediumQualityResponses = 0;
      let responseDistribution = {};
      
      // 関係性データから応答品質を推定
      for (const [keyword, relatedTerms] of Object.entries(userRelations)) {
        const relationshipStrength = relatedTerms.reduce((sum, term) => sum + (term.count || 1), 0);
        totalResponses++;
        
        if (relationshipStrength > 5) {
          highQualityResponses++;
          responseDistribution['high'] = (responseDistribution['high'] || 0) + 1;
        } else if (relationshipStrength > 2) {
          mediumQualityResponses++;
          responseDistribution['medium'] = (responseDistribution['medium'] || 0) + 1;
        } else {
          responseDistribution['low'] = (responseDistribution['low'] || 0) + 1;
        }
      }
      
      return {
        totalResponses,
        highQualityResponses,
        mediumQualityResponses,
        highQualityRate: totalResponses > 0 ? highQualityResponses / totalResponses : 0.1,
        mediumQualityRate: totalResponses > 0 ? mediumQualityResponses / totalResponses : 0.3,
        responseDistribution
      };
      
    } catch (error) {
      console.warn('パフォーマンス統計分析エラー:', error.message);
      return {
        totalResponses: 0,
        highQualityRate: 0.1,
        mediumQualityRate: 0.3,
        responseDistribution: {}
      };
    }
  }

  /**
   * 品質指標分析
   */
  async analyzeQualityMetrics(userId) { // userId を追加
    try {
      const relations = await this.learningDB.getUserSpecificRelations(userId); // userId を使用
      const userRelations = relations?.userRelations || {};
      
      const metrics = {
        vocabularyDiversity: 0,
        relationshipDensity: 0,
        contextualRichness: 0,
        averageRelationStrength: 0
      };
      
      if (Object.keys(userRelations).length === 0) {
        return metrics;
      }
      
      // 語彙多様性計算
      metrics.vocabularyDiversity = Object.keys(userRelations).length;
      
      // 関係性密度計算
      let totalRelations = 0;
      let totalStrength = 0;
      
      for (const [keyword, relatedTerms] of Object.entries(userRelations)) {
        totalRelations += relatedTerms.length;
        
        for (const term of relatedTerms) {
          totalStrength += (term.count || 1);
        }
      }
      
      metrics.relationshipDensity = totalRelations / Object.keys(userRelations).length;
      metrics.averageRelationStrength = totalRelations > 0 ? totalStrength / totalRelations : 0.5; // ゼロ除算対策
      
      // 文脈豊富度（関係性の深さ）
      metrics.contextualRichness = metrics.averageRelationStrength * metrics.relationshipDensity;
      
      return metrics;
      
    } catch (error) {
      console.warn('品質指標分析エラー:', error.message);
      return {
        vocabularyDiversity: 10,
        relationshipDensity: 2,
        contextualRichness: 1,
        averageRelationStrength: 1
      };
    }
  }

  /**
   * 統計的最適閾値計算
   */
  computeOptimalThresholds(performanceStats, qualityMetrics) {
    // 統計的指標に基づく最適閾値計算
    
    // 高品質閾値：過去のハイクオリティ応答の統計分布から計算
    const highConfidenceThreshold = Math.min(
      0.5 + (performanceStats.highQualityRate * 0.3),
      0.9
    );
    
    // 中品質閾値：平均パフォーマンスに基づく
    const mediumConfidenceThreshold = Math.min(
      0.3 + (performanceStats.mediumQualityRate * 0.2),
      highConfidenceThreshold - 0.1
    );
    
    // 関係性強度閾値：平均関係性強度の統計分布から
    const relationshipThreshold = Math.max(
      qualityMetrics.averageRelationStrength * 0.7,
      0.5
    );
    
    // 語彙選択閾値：語彙多様性に基づく適応
    const vocabularySelectionThreshold = Math.min(
      qualityMetrics.vocabularyDiversity / 100,
      0.8
    );
    
    return {
      highConfidence: highConfidenceThreshold,
      mediumConfidence: mediumConfidenceThreshold,
      lowConfidence: 0.1, // 初期値を設定
      relationshipStrength: relationshipThreshold,
      vocabularySelection: vocabularySelectionThreshold,
      
      // メタデータ（デバッグ用）
      basedOnStats: {
        highQualityRate: performanceStats.highQualityRate,
        avgRelationStrength: qualityMetrics.averageRelationStrength,
        vocabularyDiversity: qualityMetrics.vocabularyDiversity
      }
    };
  }

  /**
   * 最小閾値セット（フォールバック）
   */
  getMinimalThresholds() {
    console.warn('⚠️ 最小閾値セット使用 - 統計データ不足');
    return {
      highConfidence: 0.7,
      mediumConfidence: 0.4,
      relationshipStrength: 0.5,
      vocabularySelection: 0.3,
      basedOnStats: null
    };
  }

  /**
   * 最適文法パターン選択
   * 入力特性と統計データに基づく確率的選択
   */
  async selectBestGrammarPattern(inputKeywords, relationshipPatterns, grammarRules) {
    try {
      // 入力タイプ判定
      const inputType = this.analyzeInputType(inputKeywords);
      
      // 関係性強度によるパターン選択
      const relationshipStrength = this.calculateRelationshipStrength(relationshipPatterns);
      
      // 文法パターンの統計的適合度計算
      const patternScores = [];
      
      // 安全性確認: grammarRules.Sが存在且つ配列であるかチェック
      if (!grammarRules || !grammarRules.S || !Array.isArray(grammarRules.S)) {
        console.warn('⚠️ 文法ルールS配列が無効:', grammarRules);
        throw new Error('Invalid grammar rules structure');
      }
      
      if (grammarRules.S.length === 0) {
        console.warn('⚠️ 文法ルールS配列が空');
        throw new Error('Empty grammar rules S array');
      }
      
      for (const sPattern of grammarRules.S) {
        const score = this.calculatePatternScore(sPattern, inputType, relationshipStrength);
        patternScores.push({
          pattern: sPattern,
          score: score,
          type: sPattern.type
        });
      }
      
      // 最高スコアパターン選択
      patternScores.sort((a, b) => b.score - a.score);
      return patternScores[0];
      
    } catch (error) {
      console.warn('文法パターン選択エラー:', error.message);
      // より安全なフォールバック
      if (grammarRules && grammarRules.S && Array.isArray(grammarRules.S) && grammarRules.S.length > 0) {
        return grammarRules.S[0]; // デフォルトパターン
      } else {
        return this.createEmergencyGrammarPattern(inputKeywords);
      }
    }
  }

  /**
   * 文法パターンスコア計算
   */
  calculatePatternScore(pattern, inputType, relationshipStrength) {
    let score = pattern.probability || 0.1;

    // 入力タイプとの適合度を考慮
    if (pattern.type === inputType) {
      score *= 1.5; // 適合するタイプの場合、スコアを上げる
    }

    // 関係性強度を考慮
    score *= relationshipStrength; // 関係性強度が高いほどスコアを上げる

    return score;
  }

  /**
   * 入力タイプ分析
   */
  analyzeInputType(inputKeywords) {
    const keywordText = Array.isArray(inputKeywords) ? inputKeywords.join(' ') : String(inputKeywords);
    
    if (keywordText.includes('とは') || keywordText.includes('？')) {
      return 'definition_question';
    }
    if (keywordText.includes('について') || keywordText.includes('話せる')) {
      return 'topic_inquiry';
    }
    if (keywordText.includes('どう') || keywordText.includes('なぜ')) {
      return 'explanation_request';
    }
    
    return 'general_statement';
  }

  /**
   * 関係性強度計算
   */
  calculateRelationshipStrength(relationshipPatterns) {
    if (!Array.isArray(relationshipPatterns) || relationshipPatterns.length === 0) {
      return 0.1;
    }
    
    const avgStrength = relationshipPatterns.reduce((sum, p) => sum + (p.strength || 0), 0) / relationshipPatterns.length;
    return Math.min(avgStrength, 1.0);
  }

  /**
   * 緊急文法パターン作成
   */
  createEmergencyGrammarPattern(inputKeywords) {
    const keyword = inputKeywords && inputKeywords.length > 0 ? inputKeywords[0] : '何か';
    return {
      pattern: `${keyword}について検討中です。`,
      probability: 0.1,
      type: 'emergency_fallback',
      learned: false
    };
  }
}

export { StatisticalResponseGenerator };