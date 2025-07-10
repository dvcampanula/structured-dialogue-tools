/**
 * AIVocabularyProcessor - AI駆動語彙処理システム
 * 
 * 多腕バンディット、N-gram、ベイジアン、共起分析の各AI機能を統合し、
 * テキストの語彙処理を最適化します。
 */
import { MultiArmedBanditVocabularyAI } from '../../learning/bandit/multi-armed-bandit-vocabulary.js';
import { NgramContextPatternAI } from '../../learning/ngram/ngram-context-pattern.js';
import { BayesianPersonalizationAI } from '../../learning/bayesian/bayesian-personalization.js';
import { DynamicRelationshipLearner } from '../../learning/cooccurrence/dynamic-relationship-learner.js';
import { EnhancedHybridLanguageProcessor } from '../../foundation/morphology/hybrid-processor.js';

export class AIVocabularyProcessor {
  constructor() {
    this.banditAI = new MultiArmedBanditVocabularyAI();
    this.ngramAI = new NgramContextPatternAI();
    this.bayesianAI = new BayesianPersonalizationAI();
    this.cooccurrenceAI = new DynamicRelationshipLearner();
    this.hybridProcessor = new EnhancedHybridLanguageProcessor();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    console.log('🧬 AIVocabularyProcessor初期化中...');
    await Promise.all([
      this.banditAI.initialize(),
      this.ngramAI.initialize(),
      this.bayesianAI.initialize(),
      this.cooccurrenceAI.initializeLearner(),
      this.hybridProcessor.initialize(),
    ]);
    this.isInitialized = true;
    console.log('✅ AIVocabularyProcessor初期化完了');
  }

  /**
   * テキストを処理し、最適な語彙選択を行います。
   * @param {string} text - 処理対象のテキスト
   * @param {object} options - 処理オプション (例: userId, contextInfo)
   * @returns {Promise<object>} 処理結果
   */
  async processText(text, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { userId, contextInfo } = options;

    // 1. N-gram AIによる文脈予測
    const predictedContext = await this.ngramAI.predictContext(text);
    console.log('Predicted Context:', predictedContext);

    // 2. ベイジアン AIによる個人適応
    let adaptedContent = { text: text, features: { category: predictedContext.predictedCategory } };
    if (userId) {
      adaptedContent = await this.bayesianAI.adaptForUser(userId, adaptedContent);
      console.log('Adapted Content for User:', adaptedContent);
    }

    // 3. 多腕バンディット AIによる語彙選択最適化 (例: 候補語彙を生成し、最適なものを選択)
    const candidateVocabularies = await this._generateCandidateVocabularies(text, adaptedContent);
    const optimizedVocabulary = await this.banditAI.selectVocabulary(candidateVocabularies.map(v => v.word));
    console.log('Optimized Vocabulary:', optimizedVocabulary);

    // 4. 共起分析
    await this.cooccurrenceAI.analyze(text, optimizedVocabulary);

    return {
      originalText: text,
      processedText: this._applyOptimizedVocabulary(text, optimizedVocabulary),
      optimizedVocabulary: optimizedVocabulary,
      predictedContext: predictedContext,
      adaptedContent: adaptedContent,
    };
  }

  /**
   * 候補語彙を生成します。
   * (これは簡易的な例であり、実際には形態素解析などを用いて生成します)
   * @param {string} text - 元のテキスト
   * @param {object} adaptedContent - 適応されたコンテンツ
   * @returns {Array<object>} 候補語彙の配列 (例: [{ word: '単語', score: 0.8 }])
   */
  async _generateCandidateVocabularies(text, adaptedContent) {
    // EnhancedHybridLanguageProcessor を使用してキーワードを抽出
    const processedResult = await this.hybridProcessor.processText(text, {
      enableMeCab: true,
      enableSimilarity: false,
      enableGrouping: false,
    });

    const keywords = processedResult.enhancedTerms.map(term => term.term);

    // ベイジアンAIの適応結果を考慮して候補語彙に重み付け
    // adaptedContent.adaptedCategory を利用して、そのカテゴリに属するキーワードのスコアを上げるなど
    return keywords.map(word => ({
      word: word,
      score: 0.5, // 初期スコア。後で適応結果に基づいて調整
    }));
  }

  /**
   * 最適化された語彙をテキストに適用します。
   * (これは簡易的な例であり、実際にはより複雑な置換ロジックが必要です)
   * @param {string} originalText - 元のテキスト
   * @param {string} optimizedVocabulary - 最適化された語彙
   * @returns {string} 処理後のテキスト
   */
  _applyOptimizedVocabulary(originalText, optimizedVocabulary) {
    // 例: 最適化された語彙を強調表示する
    if (optimizedVocabulary) {
      return originalText.replace(new RegExp(optimizedVocabulary, 'g'), `**${optimizedVocabulary}**`);
    }
    return originalText;
  }

  /**
   * 語彙候補の中から最適なものを選択します。
   * (これはprocessText内部で呼び出されるため、直接呼び出すことは稀です)
   * @param {Array<object>} candidates - 語彙候補の配列
   * @returns {object} 最適化された語彙
   */
  optimizeVocabulary(candidates) {
    // 多腕バンディットAIを使用して最適な語彙を選択
    const selectedWord = this.banditAI.selectVocabulary(candidates.map(c => c.word));
    return candidates.find(c => c.word === selectedWord);
  }

  /**
   * ユーザーフィードバックを各AIに伝播させます。
   * @param {string} userId - ユーザーID
   * @param {string} vocabulary - 評価された語彙
   * @param {number} rating - ユーザーからの評価
   * @param {string} contextText - 評価時の文脈テキスト
   */
  async recordFeedback(userId, vocabulary, rating, contextText) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.banditAI.updateRewards(vocabulary, rating);
    
    // N-gram AIに学習させる
    const predictedContext = await this.ngramAI.predictContext(contextText); // ここで予測し直すのは、最新の学習状態を反映するため
    await this.ngramAI.learnPattern(contextText, { category: predictedContext.predictedCategory });

    // ベイジアンAIに学習させる
    const features = {};
    features[vocabulary] = 1; // 評価された語彙自体を特徴量とする
    features.is_rated_positive = rating > 0.5 ? 1 : 0; // 評価がポジティブかどうかの特徴量
    // contextText からキーワードを抽出し、特徴量として追加することも可能
    const contextKeywords = await this.hybridProcessor.extractKeywords(contextText);
    contextKeywords.forEach(kw => features[`keyword_${kw}`] = 1);

    await this.bayesianAI.learnUserBehavior(userId, {
      class: predictedContext.predictedCategory,
      features: features,
    });
    
    await this.cooccurrenceAI.learnFromFeedback(vocabulary, rating, contextText);
  }
}
