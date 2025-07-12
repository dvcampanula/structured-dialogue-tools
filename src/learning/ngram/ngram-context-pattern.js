/**
 * NgramContextPatternAI - N-gram言語モデルによる文脈パターン認識AI
 * 
 * Variable-order N-gramとKneser-Neyスムージングを用いて、
 * テキストの文脈パターンを学習し、予測します。
 */
import { persistentLearningDB } from '../../data/persistent-learning-db.js';

/**
 * NgramContextPatternAI - N-gram言語モデルによる文脈パターン認識AI
 * 
 * Variable-order N-gramとKneser-Neyスムージングを用いて、
 * テキストの文脈パターンを学習し、予測します。
 */
export class NgramContextPatternAI {
  constructor(maxNgramOrder = 3, discountParameter = 0.75, persistentDB) {
    this.persistentLearningDB = persistentDB || persistentLearningDB;
    this.ngramFrequencies = new Map(); // Map<ngram: string, frequency: number>
    this.contextFrequencies = new Map(); // Map<context: string, frequency: number>
    this.continuationCounts = new Map(); // Map<ngram: string, unique_continuation_count: number>
    this.totalNgrams = 0;
    this.maxNgramOrder = maxNgramOrder;
    this.discountParameter = discountParameter; // Kneser-Ney discount parameter
    this.documentFreqs = new Map(); // For TF-IDF: Map<term: string, doc_count: number>
    this.totalDocuments = 0;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    console.log('🧬 NgramContextPatternAI初期化中...');
    try {
      const loadedData = await this.persistentLearningDB.loadNgramData();
      if (loadedData) {
        this.ngramFrequencies = new Map(loadedData.ngramFrequencies);
        this.contextFrequencies = new Map(loadedData.contextFrequencies);
        // continuationCountsの復元時にSetオブジェクトを再構築
        this.continuationCounts = new Map();
        if (loadedData.continuationCounts) {
          for (const [key, valueArray] of loadedData.continuationCounts) {
            this.continuationCounts.set(key, new Set(valueArray));
          }
        }
        this.documentFreqs = new Map(loadedData.documentFreqs || []);
        this.totalNgrams = loadedData.totalNgrams;
        this.totalDocuments = loadedData.totalDocuments || 0;
        console.log(`✅ NgramContextPatternAI初期化完了。${this.ngramFrequencies.size}件のN-gram統計を読み込みました。`);
      } else {
        console.log('✅ NgramContextPatternAI初期化完了。新規データ。');
      }
    } catch (error) {
      console.error('❌ NgramContextPatternAI初期化エラー:', error.message);
    }
    this.isInitialized = true;
  }

  /**
   * テキストからN-gramパターンを学習します。
   * @param {string} text - 学習対象のテキスト
   * @param {object} contextInfo - テキストの文脈情報 (例: { category: 'technical' })
   */
  async learnPattern(text, contextInfo) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // テキストをトークン化（ここでは簡易的にスペースで分割）
    const tokens = text.split(/\s+/).filter(token => token.length > 0);
    const uniqueTokens = new Set(tokens);
    
    // TF-IDF学習のためのドキュメント頻度更新
    this.totalDocuments++;
    uniqueTokens.forEach(token => {
      this.documentFreqs.set(token, (this.documentFreqs.get(token) || 0) + 1);
    });

    // N-gramの生成と頻度学習
    for (let n = 1; n <= this.maxNgramOrder; n++) {
      for (let i = 0; i <= tokens.length - n; i++) {
        const ngram = tokens.slice(i, i + n).join(' ');
        this.updateNgramFrequency(ngram);
        
        // Kneser-Ney用の継続カウントを更新
        if (n > 1) {
          this.updateContinuationCount(ngram, tokens, i, n);
        }
      }
    }

    // 文脈頻度の学習
    if (contextInfo && contextInfo.category) {
      this.updateContextFrequency(contextInfo.category);
    }
    await this._saveData();
  }

  /**
   * N-gramの頻度を更新します。
   * @param {string} ngram - 更新するN-gram
   */
  updateNgramFrequency(ngram) {
    this.ngramFrequencies.set(ngram, (this.ngramFrequencies.get(ngram) || 0) + 1);
    this.totalNgrams++;
  }

  /**
   * Kneser-Ney用の継続カウントを更新します。
   * @param {string} ngram - 対象のN-gram
   * @param {Array} tokens - 全トークン配列
   * @param {number} position - N-gramの位置
   * @param {number} n - N-gramの次数
   */
  updateContinuationCount(ngram, tokens, position, n) {
    const prefix = tokens.slice(position, position + n - 1).join(' ');
    const suffix = tokens.slice(position + 1, position + n).join(' ');
    
    // 前文脈の継続カウント
    if (!this.continuationCounts.has(prefix)) {
      this.continuationCounts.set(prefix, new Set());
    }
    this.continuationCounts.get(prefix).add(tokens[position + n - 1]);
    
    // 後文脈の継続カウント（逆向き）
    const reverseKey = `_reverse_${suffix}`;
    if (!this.continuationCounts.has(reverseKey)) {
      this.continuationCounts.set(reverseKey, new Set());
    }
    this.continuationCounts.get(reverseKey).add(tokens[position]);
  }

  /**
   * 文脈の頻度を更新します。
   * @param {string} context - 更新する文脈
   */
  updateContextFrequency(context) {
    this.contextFrequencies.set(context, (this.contextFrequencies.get(context) || 0) + 1);
  }

  /**
   * テキストの文脈を予測します。
   * Kneser-NeyスムージングとTF-IDFを用いた統計的スコアリング
   * @param {string} text - 予測対象のテキスト
   * @returns {object} 予測された文脈情報
   */
  async predictContext(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const tokens = text.split(/\s+/).filter(token => token.length > 0);
    let bestContext = null;
    let maxScore = -Infinity;

    // 各文脈に対して統計的スコアを計算
    for (const [context, contextFreq] of this.contextFrequencies.entries()) {
      let contextScore = 0;
      let totalWeight = 0;
      
      // N-gramの次数ごとに重み付きスコアを計算
      for (let n = 1; n <= this.maxNgramOrder; n++) {
        const ngramWeight = n; // 高次のN-gramほど重みを大きく
        
        for (let i = 0; i <= tokens.length - n; i++) {
          const ngram = tokens.slice(i, i + n).join(' ');
          
          // Kneser-Neyスムージング確率を計算
          const knProbability = this.calculateKneserNeyProbability(ngram, n);
          
          // TF-IDFスコアを計算
          const tfidfScore = this.calculateTFIDF(ngram, tokens);
          
          // 統計的スコア: KN確率 × TF-IDF × 文脈頻度
          const score = knProbability * tfidfScore * Math.log(1 + contextFreq);
          contextScore += score * ngramWeight;
          totalWeight += ngramWeight;
        }
      }
      
      // 正規化されたスコア
      const normalizedScore = totalWeight > 0 ? contextScore / totalWeight : 0;
      
      if (normalizedScore > maxScore) {
        maxScore = normalizedScore;
        bestContext = context;
      }
    }
    
    // フォールバック処理
    if (bestContext === null && this.contextFrequencies.size > 0) {
      let mostFrequentContext = null;
      let highestFreq = 0;
      for (const [context, freq] of this.contextFrequencies.entries()) {
        if (freq > highestFreq) {
          highestFreq = freq;
          mostFrequentContext = context;
        }
      }
      bestContext = mostFrequentContext;
      return { 
        predictedCategory: bestContext, 
        confidence: Math.min(0.5, highestFreq / this.totalDocuments) 
      };
    } else if (bestContext === null) {
      return { predictedCategory: 'general', confidence: 0 };
    }

    // 信頼度を統計的に計算
    const confidence = Math.min(0.95, maxScore / (1 + maxScore));
    return { predictedCategory: bestContext, confidence };
  }

  /**
   * Kneser-Neyスムージングを用いたN-gramの確率を計算します。
   * @param {string} ngram - 計算対象のN-gram
   * @param {number} order - N-gramの次数
   * @returns {number} Kneser-Neyスムージング確率
   */
  calculateKneserNeyProbability(ngram, order) {
    if (order === 1) {
      // Unigram: 継続カウントベースの確率
      const continuationCount = this.getContinuationCount(ngram);
      const totalContinuations = this.getTotalContinuations();
      return totalContinuations > 0 ? continuationCount / totalContinuations : 1e-10;
    }
    
    const tokens = ngram.split(' ');
    const prefix = tokens.slice(0, order - 1).join(' ');
    const word = tokens[order - 1];
    
    // プレフィックスの頻度
    const prefixFreq = this.ngramFrequencies.get(prefix) || 0;
    const ngramFreq = this.ngramFrequencies.get(ngram) || 0;
    
    if (prefixFreq === 0) {
      // バックオフ: 低次のモデルを使用
      return this.calculateKneserNeyProbability(tokens.slice(1).join(' '), order - 1);
    }
    
    // メインターム: max(count - d, 0) / count(prefix)
    const discountedFreq = Math.max(ngramFreq - this.discountParameter, 0);
    const mainTerm = discountedFreq / prefixFreq;
    
    // ラムダターム: バックオフ重み
    const lambda = this.calculateLambda(prefix);
    const backoffProb = this.calculateKneserNeyProbability(
      tokens.slice(1).join(' '), 
      order - 1
    );
    
    return mainTerm + lambda * backoffProb;
  }
  
  /**
   * ラムダパラメータを計算します。
   * @param {string} prefix - プレフィックス
   * @returns {number} ラムダ値
   */
  calculateLambda(prefix) {
    const prefixFreq = this.ngramFrequencies.get(prefix) || 0;
    if (prefixFreq === 0) return 0;
    
    // プレフィックスに続くユニークな単語数
    const uniqueContinuations = this.continuationCounts.get(prefix)?.size || 0;
    
    return (this.discountParameter * uniqueContinuations) / prefixFreq;
  }
  
  /**
   * 継続カウントを取得します。
   * @param {string} ngram - 対象N-gram
   * @returns {number} 継続カウント
   */
  getContinuationCount(ngram) {
    const reverseKey = `_reverse_${ngram}`;
    return this.continuationCounts.get(reverseKey)?.size || 0;
  }
  
  /**
   * 総継続カウントを取得します。
   * @returns {number} 総継続カウント
   */
  getTotalContinuations() {
    let total = 0;
    for (const [key, continuationSet] of this.continuationCounts.entries()) {
      if (key.startsWith('_reverse_')) {
        total += continuationSet.size;
      }
    }
    return total;
  }
  
  /**
   * TF-IDFスコアを計算します。
   * @param {string} ngram - 対象N-gram
   * @param {Array} tokens - ドキュメントのトークン配列
   * @returns {number} TF-IDFスコア
   */
  calculateTFIDF(ngram, tokens) {
    const ngramTokens = ngram.split(' ');
    
    // TF: ドキュメント内の出現頻度
    let termFreq = 0;
    for (let i = 0; i <= tokens.length - ngramTokens.length; i++) {
      const candidate = tokens.slice(i, i + ngramTokens.length).join(' ');
      if (candidate === ngram) termFreq++;
    }
    
    // 正規化TF
    const tf = termFreq / Math.max(1, tokens.length - ngramTokens.length + 1);
    
    // IDF: 逆文書頻度
    const docFreq = this.documentFreqs.get(ngram) || 0;
    const idf = docFreq > 0 ? Math.log(this.totalDocuments / docFreq) : 0;
    
    return tf * idf;
  }

  /**
   * N-gramデータを永続化します。
   */
  async _saveData() {
    // Setオブジェクトをシリアライズ可能な形式に変換
    const continuationCountsArray = Array.from(this.continuationCounts.entries()).map(
      ([key, valueSet]) => [key, Array.from(valueSet)]
    );
    
    const dataToSave = {
      ngramFrequencies: Array.from(this.ngramFrequencies.entries()),
      contextFrequencies: Array.from(this.contextFrequencies.entries()),
      continuationCounts: continuationCountsArray,
      documentFreqs: Array.from(this.documentFreqs.entries()),
      totalNgrams: this.totalNgrams,
      totalDocuments: this.totalDocuments,
    };
    await this.persistentLearningDB.saveNgramData(dataToSave);
    console.log('💾 N-gramデータ保存完了');
  }
}
