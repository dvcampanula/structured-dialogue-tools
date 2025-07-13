import { MultiArmedBanditVocabularyAI } from '../../learning/bandit/multi-armed-bandit-vocabulary.js';
import { NgramContextPatternAI } from '../../learning/ngram/ngram-context-pattern.js';
import { BayesianPersonalizationAI } from '../../learning/bayesian/bayesian-personalization.js';
import { DynamicRelationshipLearner } from '../../learning/cooccurrence/dynamic-relationship-learner.js';
import { QualityPredictionModel } from '../../learning/quality/quality-prediction-model.js';
import { EnhancedHybridLanguageProcessor } from '../../foundation/morphology/hybrid-processor.js';
import DictionaryDB from '../../foundation/dictionary/dictionary-db.js';

export class AIVocabularyProcessor {
  constructor(banditAI, ngramAI, bayesianAI, cooccurrenceLearner, qualityPredictor, hybridProcessor, dictionary) {
    this.banditAI = banditAI || new MultiArmedBanditVocabularyAI();
    this.ngramAI = ngramAI || new NgramContextPatternAI();
    this.bayesianAI = bayesianAI || new BayesianPersonalizationAI();
    this.cooccurrenceLearner = cooccurrenceLearner || new DynamicRelationshipLearner();
    this.qualityPredictor = qualityPredictor || new QualityPredictionModel();
    this.hybridProcessor = hybridProcessor || new EnhancedHybridLanguageProcessor();
    this.dictionary = dictionary || new DictionaryDB();
    
    this.isInitialized = false;
    console.log('🧠 AIVocabularyProcessor初期化中...');
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await Promise.all([
        this.banditAI.initialize(),
        this.ngramAI.initialize(),
        this.bayesianAI.initialize(),
        this.cooccurrenceLearner.initializeLearner(),
        this.qualityPredictor.initializeAIModules(),
        this.hybridProcessor.initialize(),
        this.dictionary.initialize()
      ]);
      this.isInitialized = true;
      console.log('✅ AIVocabularyProcessor初期化完了。全AIモジュールがロードされました。');
    } catch (error) {
      console.error('❌ AIVocabularyProcessor初期化エラー:', error.message);
      throw error;
    }
  }

  /**
   * ユーザー入力テキストを処理し、5つのAIモジュールを統合して分析結果を生成します。
   * @param {string} text - ユーザー入力テキスト
   * @param {string} userId - ユーザーID (個人適応用)
   * @returns {Promise<Object>} 統合分析結果
   */
  async processText(text, userId = 'default') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`✨ AIVocabularyProcessor: テキスト処理開始 - "${text}"`);
    const startTime = Date.now();
    
    let result = {
      success: true,
      originalText: text,
      processedTokens: [],
      dictionaryLookups: [],
      optimizedVocabulary: null,
      predictedContext: null,
      adaptedContent: null,
      cooccurrenceAnalysis: null,
      qualityPrediction: null,
      processingTime: 0
    };

    try {
      // 1. 形態素解析と辞書ルックアップ
      const processed = await this.hybridProcessor.processText(text);
      
      // enhancedTermsまたはtokensから統一的に処理
      const tokens = processed.tokens || processed.enhancedTerms || [];
      
      if (tokens.length > 0) {
        // 0. 処理済みトークンの保存
        result.processedTokens = tokens;
        result.enhancedTerms = tokens; // 互換性のため
        
        const lookupResults = await Promise.all(
          tokens.map(token => this.dictionary.lookup(token.surface || token.term))
        );
        result.dictionaryLookups = lookupResults.filter(Boolean);
        
        // 2. 多腕バンディットによる語彙最適化
        const candidateVocabularies = tokens.map(t => t.surface || t.term);
        result.optimizedVocabulary = await this.banditAI.selectVocabulary(candidateVocabularies);
        
        // 3. N-gramによる文脈予測
        result.predictedContext = await this.ngramAI.predictContext(text);
        
        // 4. ベイジアン個人適応
        const contentFeatures = this._extractFeaturesForBayesian(tokens, result.predictedContext);
        result.adaptedContent = await this.bayesianAI.adaptForUser(userId, { text: text, features: contentFeatures });
        
        // 5. 共起関係学習
        // DynamicRelationshipLearnerのanalyzeメソッドを呼び出す
        await this.cooccurrenceLearner.analyze(text, result.optimizedVocabulary);
        result.cooccurrenceAnalysis = {
          learningStats: this.cooccurrenceLearner.getLearningStats(),
          relatedTerms: this.cooccurrenceLearner.getUserRelationsData()
        };
        
        // 6. 品質予測
        result.qualityPrediction = await this.qualityPredictor.predictQuality({
          text: text,
          metadata: {
            frequency: result.optimizedVocabulary ? 1 : 0, // 仮の頻度
            relevanceScore: result.predictedContext?.confidence || 0.5 // 文脈予測の信頼度を関連性スコアとして利用
          }
        });
        
        result.success = true;
      } else {
        console.warn('⚠️ トークン解析結果が空です');
      }

    } catch (error) {
      console.error('❌ AIVocabularyProcessor処理エラー:', error.message);
      result.success = false;
      result.error = error.message;
    } finally {
      result.processingTime = Date.now() - startTime;
      console.log(`✅ AIVocabularyProcessor: 処理完了 (${result.processingTime}ms)`);
    }

    return result;
  }

  /**
   * ベイジアンAI用の特徴量を抽出します。
   * @param {Array} tokens - 形態素解析されたトークン
   * @param {Object} predictedContext - N-gramによる文脈予測結果
   * @returns {Object} ベイジアンAI用の特徴量
   * @private
   */
  _extractFeaturesForBayesian(tokens, predictedContext) {
    const features = {};
    
    // 例: 品詞の出現頻度を特徴量として追加
    tokens.forEach(token => {
      const posFeature = `pos_${token.pos}`;
      features[posFeature] = (features[posFeature] || 0) + 1;
    });

    // 例: 文脈カテゴリを特徴量として追加
    if (predictedContext && predictedContext.predictedCategory) {
      features[`context_${predictedContext.predictedCategory}`] = 1;
    }

    // その他の特徴量（例: 感情、キーワードなど）をここに追加可能
    // features['sentiment_positive'] = 1; // 仮
    // features['keyword_AI'] = 1; // 仮

    return features;
  }

  /**
   * ユーザーフィードバックを各AIモジュールに伝播します。
   * @param {string} userId - ユーザーID
   * @param {string} vocabulary - 評価された語彙
   * @param {number} rating - ユーザーからの評価
   * @param {string} contextText - 評価時の文脈テキスト
   */
  async propagateFeedback(userId, vocabulary, rating, contextText) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log(`🔄 フィードバック伝播開始: ${vocabulary} (Rating: ${rating})`);
    
    try {
      await this.banditAI.updateRewards(vocabulary, rating);
      
      // N-gram AIに学習させる
      const predictedContext = await this.ngramAI.predictContext(contextText); // ここで予測し直すのは、最新の学習状態を反映するため
      await this.ngramAI.learnPattern(contextText, { category: predictedContext.predictedCategory });

      // ベイジアンAIに学習させる
      const features = {};
      features[vocabulary] = 1; // 評価された語彙自体を特徴量とする
      features.is_rated_positive = rating > 0.5 ? 1 : 0; // 評価がポジティブかどうかの特徴量
      // contextText からキーワードを抽出し、特徴量として追加することも可能
      const contextAnalysis = await this.processText(contextText);
      const contextKeywords = contextAnalysis.enhancedTerms ? contextAnalysis.enhancedTerms.map(term => term.term) : [];
      contextKeywords.forEach(kw => features[`keyword_${kw}`] = 1);

      await this.bayesianAI.learnUserBehavior(userId, {
        class: predictedContext.predictedCategory,
        features: features,
      });
      
      await this.cooccurrenceLearner.learnFromFeedback(vocabulary, rating, contextText);
      
      // QualityPredictionModelのlearnFromFeedbackは直接呼ばれないため、ここでは呼び出さない
      // await this.qualityPredictor.learnFromFeedback(originalContent, appliedSuggestion, beforeScore, afterScore);

      console.log('✅ フィードバック伝播完了。');
      
    } catch (error) {
      console.error('❌ フィードバック伝播エラー:', error.message);
    }
  }
}
