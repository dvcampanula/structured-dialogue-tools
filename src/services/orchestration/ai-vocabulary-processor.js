import { MultiArmedBanditVocabularyAI } from '../../modules/bandit/multi-armed-bandit-vocabulary.js';
import { NgramContextPatternAI } from '../../modules/ngram/ngram-context-pattern.js';
import { BayesianPersonalizationAI } from '../../modules/bayesian/bayesian-personalization.js';
import { DynamicRelationshipLearner } from '../../modules/cooccurrence/dynamic-relationship-learner.js';
import { QualityPredictionModel } from '../../modules/quality/quality-prediction-model.js';
import { EnhancedHybridLanguageProcessor } from '../../core/language/hybrid-processor.js';
import { DictionaryDB } from '../dictionary/dictionary-db.js';

export class AIVocabularyProcessor {
  constructor(banditAI, ngramAI, bayesianAI, cooccurrenceLearner, qualityPredictor, hybridProcessor, dictionary, userId = 'default') {
    this.banditAI = banditAI;
    this.ngramAI = ngramAI;
    this.bayesianAI = bayesianAI;
    this.cooccurrenceLearner = cooccurrenceLearner;
    this.qualityPredictor = qualityPredictor;
    this.hybridProcessor = hybridProcessor;
    this.dictionary = dictionary;
    this.userId = userId; // Add this line

    // TF-IDF関連のプロパティ
    this.documents = []; // 処理された文書の配列
    this.vocabulary = new Set(); // 全てのユニークな単語
    this.documentTermFrequencies = new Map(); // Map<documentId, Map<term, frequency>>
    this.inverseDocumentFrequencies = new Map(); // Map<term, idf>
    this.documentCount = 0; // 文書数
    
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
        this.cooccurrenceLearner.initializeLearner(this.userId), // userIdを渡す
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

    // cooccurrenceLearnerがまだ初期化されていない場合、ここで初期化
    if (!this.cooccurrenceLearner.isInitialized) {
        await this.cooccurrenceLearner.initializeLearner(userId);
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
      const step1Start = Date.now();
      const processed = await this.hybridProcessor.processText(text);
      console.log(`⏱️ 1.形態素解析: ${Date.now() - step1Start}ms`);
      
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
        const step2Start = Date.now();
        const candidateVocabularies = tokens.filter(t => !['助詞', '助動詞', '記号'].includes(t.pos)).map(t => t.surface || t.term);
        result.optimizedVocabulary = await this.banditAI.selectVocabulary(candidateVocabularies);
        console.log(`⏱️ 2.語彙最適化: ${Date.now() - step2Start}ms`);
        
        // 3. N-gramによる文脈予測
        const step3Start = Date.now();
        result.predictedContext = await this.ngramAI.predictContext(text);
        console.log(`⏱️ 3.N-gram予測: ${Date.now() - step3Start}ms`);
        
        // 4. ベイジアン個人適応
        const step4Start = Date.now();
        const contentFeatures = this._extractFeaturesForBayesian(tokens, result.predictedContext);
        result.adaptedContent = await this.bayesianAI.adaptForUser(userId, { text: text, features: contentFeatures });
        console.log(`⏱️ 4.ベイジアン適応: ${Date.now() - step4Start}ms`);
        
        // 5. 共起関係学習
        const step5Start = Date.now();
        // DynamicRelationshipLearnerのanalyzeメソッドを呼び出す
        await this.cooccurrenceLearner.analyze(text, result.optimizedVocabulary);
        result.cooccurrenceAnalysis = {
          learningStats: this.cooccurrenceLearner.getLearningStats(),
          relatedTerms: this.cooccurrenceLearner.getUserRelationsData()
        };
        console.log(`⏱️ 5.共起学習: ${Date.now() - step5Start}ms`);
        
        // 6. 品質予測
        const step6Start = Date.now();
        result.qualityPrediction = await this.qualityPredictor.predictQuality({
          text: text,
          metadata: {
            frequency: result.optimizedVocabulary ? 1 : 0, // 仮の頻度
            relevanceScore: result.predictedContext?.confidence || 0.5 // 文脈予測の信頼度を関連性スコアとして利用
          }
        });
        console.log(`⏱️ 6.品質予測: ${Date.now() - step6Start}ms`);

        // 7. TF-IDFスコア計算
        result.tfidfScores = await this.calculateTfIdf(text, tokens);
        
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
   * [Private method]
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
   * TF-IDFスコアを計算し、結果に含めます。
   * @param {string} text - 処理するテキスト
   * @param {Array} tokens - 形態素解析されたトークン
   * @returns {Object} TF-IDFスコアを含むオブジェクト
   */
  async calculateTfIdf(text, tokens) {
    const documentId = this.documentCount++;
    const termFrequencies = new Map();

    for (const token of tokens) {
      const term = token.surface || token.term;
      termFrequencies.set(term, (termFrequencies.get(term) || 0) + 1);
      this.vocabulary.add(term);
    }
    this.documentTermFrequencies.set(documentId, termFrequencies);
    this.documents.push(text);

    // IDFの更新
    for (const term of this.vocabulary) {
      let docCount = 0;
      for (const [docId, tfMap] of this.documentTermFrequencies.entries()) {
        if (tfMap.has(term)) {
          docCount++;
        }
      }
      this.inverseDocumentFrequencies.set(term, Math.log(this.documentCount / (docCount + 1)));
    }

    const tfidfScores = {};
    for (const [term, tf] of termFrequencies.entries()) {
      const idf = this.inverseDocumentFrequencies.get(term) || 0;
      tfidfScores[term] = tf * idf;
    }

    return tfidfScores;
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
      const features = new Map();
      if (typeof vocabulary === 'string') {
        features.set(vocabulary, 1); // 評価された語彙自体を特徴量とする
      }
      features.set('is_rated_positive', rating > 0.5 ? 1 : 0); // 評価がポジティブかどうかの特徴量
      // contextText からキーワードを抽出し、特徴量として追加することも可能
      const contextAnalysis = await this.processText(contextText);
      const contextKeywords = contextAnalysis.enhancedTerms ? contextAnalysis.enhancedTerms.map(term => term.term) : [];
      contextKeywords.forEach(kw => features.set(`keyword_${kw}`, 1));

      await this.bayesianAI.learnUserBehavior(userId, {
        class: predictedContext.predictedCategory,
        features: features,
      });
      
      if (typeof vocabulary === 'string') {
        await this.cooccurrenceLearner.learnFromFeedback(vocabulary, rating, contextText);
      }
      
      // QualityPredictionModelのlearnFromFeedbackは直接呼ばれないため、ここでは呼び出さない
      // await this.qualityPredictor.learnFromFeedback(originalContent, appliedSuggestion, beforeScore, afterScore);

      console.log('✅ フィードバック伝播完了。');
      
    } catch (error) {
      console.error('❌ フィードバック伝播エラー:', error.message);
    }
  }
}