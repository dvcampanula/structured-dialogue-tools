/**
 * NgramContextPatternAI - N-gram言語モデルによる文脈パターン認識AI
 * 
 * Variable-order N-gramとKneser-Neyスムージングを用いて、
 * テキストの文脈パターンを学習し、予測します。
 */
import { persistentLearningDB } from '../../data/persistent-learning-db.js';
import { SparseCooccurrenceMatrix } from '../../foundation/dictionary/sparse-matrix.js';
import * as numeric from 'numeric';
import minhash from 'minhash';
const MinHash = minhash.Minhash;
const LshIndex = minhash.LshIndex;

/**
 * NgramContextPatternAI - N-gram言語モデルによる文脈パターン認識AI
 * 
 * Variable-order N-gramとKneser-Neyスムージングを用いて、
 * テキストの文脈パターンを学習し、予測します。
 */
export class NgramContextPatternAI {
  constructor(maxNgramOrder = 3, discountParameter = 0.75, persistentDB, learningConfig = {}, vocabularyBandit = null) {
    this.persistentLearningDB = persistentDB;
    this.ngramFrequencies = new Map(); // Map<ngram: string, frequency: number>
    this.contextFrequencies = new Map(); // Map<context: string, frequency: number>
    this.continuationCounts = new Map(); // Map<ngram: string, unique_continuation_count: number>
    this.totalNgrams = 0;
    
    // UCB多腕バンディット統合
    this.vocabularyBandit = vocabularyBandit;
    this.banditIntegrationEnabled = !!vocabularyBandit;
    
    // N-gram設定の拡張
    const ngramConfig = learningConfig.ngramConfig || {};
    this.maxNgramOrder = ngramConfig.maxNgramOrder || maxNgramOrder;
    this.minNgramOrder = ngramConfig.minNgramOrder || 2;
    this.enableHighOrderNgrams = ngramConfig.enableHighOrderNgrams || false;
    this.contextWindowSize = ngramConfig.contextWindowSize || 7;
    this.logicalConnectorWeight = ngramConfig.logicalConnectorWeight || 1.5;
    this.structurePreservationWeight = ngramConfig.structurePreservationWeight || 1.2;
    
    this.discountParameter = discountParameter; // Kneser-Ney discount parameter
    this.documentFreqs = new Map(); // For TF-IDF: Map<term: string, doc_count: number>
    this.totalDocuments = 0;
    this.totalCooccurrences = 0; // 追加
    
    // Phase 3: 分布意味論統合
    this.cooccurrenceMatrix = new SparseCooccurrenceMatrix(); // Sparse Matrixに変更
    this.contextVectors = new Map(); // Map<term: string, vector: number[]>
    this.semanticCache = new Map(); // 類似度計算キャッシュ
    this.lshIndex = new LshIndex(); // LSHインデックス
    this.minHash = new MinHash(); // MinHashインスタンス
    NgramContextPatternAI.termTotalCooccurrencesCache = NgramContextPatternAI.termTotalCooccurrencesCache || new Map(); // getTermTotalCooccurrencesのキャッシュ
    this.vectorDimensions = 50; // 軽量ベクトル次元数
    this.similarityThreshold = null; // 動的計算される類似度閾値

    this.learningConfig = { // 動的設定
      minVectorDimensions: 10, // 最小ベクトル次元数
      maxVectorDimensions: 100, // 最大ベクトル次元数
      dimensionGrowthFactor: 0.1, // 次元成長率
      minSimilarityThreshold: 0.3, // 最小類似度閾値
      maxSimilarityThreshold: 0.8, // 最大類似度閾値
      similarityThresholdGrowthFactor: 0.01 // 類似度閾値成長率
    };
    Object.assign(this.learningConfig, learningConfig); // 外部設定で上書き可能
    
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    console.log('🧬 NgramContextPatternAI初期化中...');
    try {
      const loadedData = await this.persistentLearningDB.loadNgramData();
      if (loadedData) {
        const combinedFrequencies = new Map(loadedData.ngramFrequencies || []);
        if (loadedData.extendedPatterns) {
          for (const [pattern, data] of Object.entries(loadedData.extendedPatterns)) {
            if (!combinedFrequencies.has(pattern)) {
              combinedFrequencies.set(pattern, data.count || 1);
            }
          }
        }
        this.ngramFrequencies = combinedFrequencies;
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
        
        // Phase 3: 分布意味論初期化はlazyInitManagerで明示的に呼び出す
        // if (this.ngramFrequencies.size > 0) {
        //   console.log('🚀 Phase 3分布意味論統合開始...');
        //   console.log('DEBUG: NgramContextPatternAI.initialize - cooccurrenceMatrix before initializeDistributionalSemantics:', this.cooccurrenceMatrix);
        //   await this.initializeDistributionalSemantics();
        //   console.log('DEBUG: NgramContextPatternAI.initialize - cooccurrenceMatrix after initializeDistributionalSemantics:', this.cooccurrenceMatrix);
        // }
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
    for (let n = this.minNgramOrder; n <= this.maxNgramOrder; n++) {
      for (let i = 0; i <= tokens.length - n; i++) {
        const ngram = tokens.slice(i, i + n).join(' ');
        
        // 高次N-gramの重み付け処理
        const weight = this.calculateNgramWeight(ngram, n);
        this.updateNgramFrequency(ngram, weight);
        
        // Kneser-Ney用の継続カウントを更新
        if (n > 1) {
          this.updateContinuationCount(ngram, tokens, i, n);
        }
      }
    }

    // 文脈頻度の統計学習: データ自身から文脈パターンを発見
    const discoveredContext = this.discoverContextFromData(tokens);
    if (discoveredContext) {
      this.updateContextFrequency(discoveredContext);
    }
    await this._saveData();
  }

  /**
   * N-gramの重みを計算します（論理構造・接続詞の重み付け）
   * @param {string} ngram - 対象N-gram
   * @param {number} order - N-gramの次数
   * @returns {number} 重み
   */
  calculateNgramWeight(ngram, order) {
    let weight = 1.0;
    
    // 論理接続詞の重み付け
    const logicalConnectors = ['しかし', 'そこで', 'それで', 'しかも', 'また', 'さらに', 'つまり', 'すなわち', 'ただし', 'したがって', 'よって', 'だから', 'なぜなら', 'つまり', 'すると', 'まず', '次に', '最後に', 'そして', 'そうすると', 'このように', 'このため', 'その結果'];
    
    for (const connector of logicalConnectors) {
      if (ngram.includes(connector)) {
        weight *= this.logicalConnectorWeight;
        break;
      }
    }
    
    // 高次N-gramの構造保持重み
    if (order >= 4 && this.enableHighOrderNgrams) {
      weight *= this.structurePreservationWeight;
    }
    
    return weight;
  }

  /**
   * N-gramの頻度を更新します。
   * @param {string} ngram - 更新するN-gram
   * @param {number} weight - 重み（デフォルト1.0）
   */
  updateNgramFrequency(ngram, weight = 1.0) {
    this.ngramFrequencies.set(ngram, (this.ngramFrequencies.get(ngram) || 0) + weight);
    this.totalNgrams += weight;
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
   * UCB多腕バンディットによる語彙選択最適化を統合
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
      // 純粋統計学習: データ不足の場合は未知として返す
      return { predictedCategory: 'unknown', confidence: 0 };
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
      const prob = totalContinuations > 0 ? continuationCount / totalContinuations : 1e-10;
      return Math.round(prob * 1e6) / 1e6;
    }
    
    const tokens = ngram.split(' ');
    const prefix = tokens.slice(0, order - 1).join(' ');
    const word = tokens[order - 1];
    
    // プレフィックスの頻度
    const prefixFreq = this.ngramFrequencies.get(prefix) || 0;
    const ngramFreq = this.ngramFrequencies.get(ngram) || 0;
    
    if (prefixFreq === 0) {
      // バックオフ: 低次のモデルを使用 (Kneser-Neyのバックオフは、現在のN-gramの最後の単語を削除し、そのプレフィックスの確率を計算する)
      // ここでは、N-gramの最後の単語を除いたプレフィックスの確率を計算する
      const backoffNgram = tokens.slice(0, order - 1).join(' ');
      return this.calculateKneserNeyProbability(backoffNgram, order - 1);
    }
    
    // メインターム: max(count - d, 0) / count(prefix)
    const dynamicDiscountParameter = this.calculateDynamicDiscountParameter();
    const discountedFreq = Math.max(ngramFreq - dynamicDiscountParameter, 0);
    const mainTerm = Math.round((discountedFreq / prefixFreq) * 1e6) / 1e6;
    
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
    
    const lambda = (this.discountParameter * uniqueContinuations) / prefixFreq;
    return Math.round(lambda * 1e6) / 1e6;
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
    const tf = Math.round((termFreq / Math.max(1, tokens.length - ngramTokens.length + 1)) * 1e6) / 1e6;
    
    // IDF: 逆文書頻度
    const docFreq = this.documentFreqs.get(ngram) || 0;
    const idf = docFreq > 0 ? Math.log(this.totalDocuments / docFreq) : 0;
    
    return Math.max(0, tf * idf);
  }

  /**
   * 統計学習ベース文脈発見
   * データ自身から文脈パターンを自動発見
   */
  discoverContextFromData(tokens) {
    if (!tokens || tokens.length === 0) return null;
    
    // 統計的特徴ベースの文脈分類
    const stats = this.calculateTokenStatistics(tokens);
    
    // 語彙密度による分類
    if (stats.uniqueTokenRatio > 0.8) {
      return `diverse_vocabulary_${Math.round(stats.avgTokenLength)}`;
    }
    
    // 長さパターンによる分類
    if (stats.avgTokenLength > 5) {
      return `long_tokens_${tokens.length}`;
    }
    
    // 頻度パターンによる分類
    if (stats.maxFrequency > 1) {
      return `repetitive_pattern_${stats.maxFrequency}`;
    }
    
    // デフォルト: 基本統計パターン
    return `pattern_${tokens.length}_${Math.round(stats.avgTokenLength)}`;
  }

  /**
   * トークン統計計算
   */
  calculateTokenStatistics(tokens) {
    const uniqueTokens = new Set(tokens);
    const tokenFreqs = new Map();
    
    tokens.forEach(token => {
      tokenFreqs.set(token, (tokenFreqs.get(token) || 0) + 1);
    });
    
    const lengths = tokens.map(t => t.length);
    const avgTokenLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const maxFrequency = Math.max(...tokenFreqs.values());
    
    return {
      uniqueTokenRatio: uniqueTokens.size / tokens.length,
      avgTokenLength: avgTokenLength,
      maxFrequency: maxFrequency,
      totalTokens: tokens.length
    };
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

  // ===== Phase 3: 分布意味論メソッド =====

  /**
   * 共起行列構築
   * N-gram学習データから語彙間の共起関係を構築
   */
  buildCooccurrenceMatrix(windowSize = 5) {
    console.log('🧠 分布意味論: 共起行列構築開始...');
    
    this.cooccurrenceMatrix.clear();
    const processedTerms = new Set();
    
    // N-gramデータから共起関係を抽出
    for (const [ngram, frequency] of this.ngramFrequencies) {
      const terms = ngram.split(' ').filter(term => term.length > 1);
      
      for (let i = 0; i < terms.length; i++) {
        for (let j = i + 1; j < Math.min(i + windowSize, terms.length); j++) {
          const term1 = terms[i];
          const term2 = terms[j];
          
          if (term1 !== term2) {
            this.cooccurrenceMatrix.set(term1, term2, frequency);
            
            processedTerms.add(term1);
            processedTerms.add(term2);
          }
        }
      }
    }
    
    console.log(`✅ 共起行列構築完了: ${this.cooccurrenceMatrix.size}組, ${this.cooccurrenceMatrix.vocabularySize}語彙`);
    this.totalCooccurrences = Array.from(this.cooccurrenceMatrix).reduce((sum, [, , count]) => sum + count, 0); // Sparse Matrixのイテレータを使用
    return { pairCount: this.cooccurrenceMatrix.size, termCount: this.cooccurrenceMatrix.vocabularySize };
  }

  /**
   * 分布ベクトル生成
   * PMI (Pointwise Mutual Information) を用いた軽量分布表現
   */
  generateDistributionalVectors() {
    console.log('🧮 分布ベクトル生成開始...');
    
    this.contextVectors.clear();
    
    // 全共起総数を計算（PMI正規化用）
    const totalCooccurrences = this.totalCooccurrences;
    
    // 🚀 根本的最適化: 全語彙の総共起数を事前計算
    console.log('📊 語彙別総共起数の事前計算開始...');
    const termTotalCooccurrences = new Map();
    
    for (const [term1, term2, coCount] of this.cooccurrenceMatrix) { // Sparse Matrixのイテレータを使用
      // term1の総共起数を累積
      termTotalCooccurrences.set(term1, (termTotalCooccurrences.get(term1) || 0) + coCount);
      // term2の総共起数を累積
      termTotalCooccurrences.set(term2, (termTotalCooccurrences.get(term2) || 0) + coCount);
    }
    
    console.log(`📊 語彙別総共起数計算完了: ${termTotalCooccurrences.size}語彙`);
    
    // 🚀 根本的最適化: 統計的フィルタリング（パーセンタイル法）
    const cooccurrenceCounts = Array.from(this.cooccurrenceMatrix).map(([, , count]) => count); // Sparse Matrixのイテレータを使用
    cooccurrenceCounts.sort((a, b) => b - a); // 降順ソート（高頻度から低頻度）
    
    // より厳密な統計的フィルタリング
    const percentileIndex = Math.floor(cooccurrenceCounts.length * 0.15); // 上位15%を対象
    const minCooccurrence = Math.max(cooccurrenceCounts[percentileIndex] || 1, 3); // 最小値保証
    
    const relevantEntries = Array.from(this.cooccurrenceMatrix) // Sparse Matrixのイテレータを使用
      .filter(([, , coCount]) => coCount >= minCooccurrence);
    
    console.log(`📊 統計的フィルタリング: ${this.cooccurrenceMatrix.size}組 → ${relevantEntries.length}組`);
    
    // 各語彙の分布ベクトル生成
    const termVectors = new Map();
    
    // 最大共起数を事前計算
    const maxCooccurrence = relevantEntries.length > 0 ? relevantEntries[0][2] : 1; // relevantEntriesの構造変更
    
    // セマンティック多様性キャッシュ（計算量削減）
    const diversityCache = new Map();
    
    // バッチ処理でスタックオーバーフロー防止
    const batchSize = 5000; // 統計的フィルタリング後なので大きめに
    for (let batchStart = 0; batchStart < relevantEntries.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, relevantEntries.length);
      const batch = relevantEntries.slice(batchStart, batchEnd);
      
      for (const [term1, term2, coCount] of batch) { // relevantEntriesの構造変更

        // 🚀 O(1)で総共起数を取得（事前計算済み）
        const term1TotalCooccurrences = termTotalCooccurrences.get(term1) || 0;
        const term2TotalCooccurrences = termTotalCooccurrences.get(term2) || 0;

        // PMIとTF-IDFを計算
        const pmi = this.calculatePMI(term1, term2, coCount, totalCooccurrences, term1TotalCooccurrences, term2TotalCooccurrences);
        const tfidf = this.calculateTermTFIDF(term1, term2, coCount, term1TotalCooccurrences, term2TotalCooccurrences);

        if (pmi > 0 || tfidf > 0) {
          // 高度化ハイブリッドスコア: 動的重み付け + 正規化
          const pmiNormalized = Math.min(1.0, pmi / 10.0); // PMI正規化
          const tfidfNormalized = Math.min(1.0, tfidf); // TF-IDF正規化
          
          // 情報理論に基づく動的重み調整
          const frequencyRatio = coCount / maxCooccurrence; // 0-1正規化
          
          // シグモイド関数による滑らかな重み遷移
          const sigmoid = 1 / (1 + Math.exp(-5 * (frequencyRatio - 0.5))); // 中点0.5で遷移
          const pmiWeight = 0.3 + (sigmoid * 0.4); // 0.3-0.7の理論的範囲
          const tfidfWeight = 1.0 - pmiWeight;
          
          // 🚀 高速多様性計算（calculateSemanticDiversity回避）
          const diversityKey = `${term1}|||${term2}`;
          let diversityFactor = diversityCache.get(diversityKey);
          if (diversityFactor === undefined) {
            // 軽量多様性計算: 文字列長差 + 頻度差のみ
            const lengthDiff = Math.abs(term1.length - term2.length) / Math.max(term1.length, term2.length, 1);
            const freqDiff = Math.abs(Math.log(term1TotalCooccurrences + 1) - Math.log(term2TotalCooccurrences + 1)) / Math.log(Math.max(term1TotalCooccurrences, term2TotalCooccurrences) + 1);
            diversityFactor = (lengthDiff + freqDiff) / 2;
            
            diversityCache.set(diversityKey, diversityFactor);
            // キャッシュサイズ制限
            if (diversityCache.size > 10000) {
              diversityCache.clear();
            }
          }
          
          // 改善された品質スコア正規化
          const baseScore = (pmiNormalized * pmiWeight + tfidfNormalized * tfidfWeight);
          const diversityBonus = (1 + diversityFactor * 0.05); // 多様性ボーナス減少
          const hybridScore = Math.tanh(baseScore * diversityBonus) * 50; // tanh正規化で0-50範囲

          // term1のベクトルにcoTermとhybridScoreを追加
          if (!termVectors.has(term1)) {
            termVectors.set(term1, []);
          }
          termVectors.get(term1).push({ term: term2, score: hybridScore, pmi, tfidf, count: coCount });

          // term2のベクトルにcoTermとhybridScoreを追加
          if (!termVectors.has(term2)) {
            termVectors.set(term2, []);
          }
          termVectors.get(term2).push({ term: term1, score: hybridScore, pmi, tfidf, count: coCount });
        }
      }
      
      // バッチ進捗報告
      console.log(`📊 分布ベクトル生成進捗: ${batchEnd}/${relevantEntries.length}ペア (${((batchEnd / relevantEntries.length) * 100).toFixed(2)}%)`);
      
      // メモリ圧迫回避のため、バッチ間でガベージコレクションを促進
      if (batchStart > 0 && batchStart % (batchSize * 10) === 0) {
        if (global.gc) {
          global.gc();
        }
      }
    }

    // 各語彙のベクトルを構築
    const termList = Array.from(termVectors.keys());
    this.vectorDimensions = Math.min(
      this.learningConfig.maxVectorDimensions,
      Math.max(
        this.learningConfig.minVectorDimensions,
        Math.floor(termList.length * this.learningConfig.dimensionGrowthFactor)
      )
    );
    console.log(`📊 PMI計算用統計: 語彙数=${termList.length}, 共起総数=${totalCooccurrences}, ベクトル次元=${this.vectorDimensions}`);

    // ランダム射影のための行列を生成（一度だけ）
    if (!this.randomProjectionMatrix || this.randomProjectionMatrix.length !== this.vectorDimensions) {
      this.randomProjectionMatrix = Array(this.vectorDimensions).fill(0).map(() => 
        Array(this.vectorDimensions).fill(0).map(() => (Math.random() * 2 - 1)) // -1から1の範囲でランダム
      );
    }

    for (const targetTerm of termList) {
      const originalVector = new Array(this.vectorDimensions).fill(0);
      const hybridValues = termVectors.get(targetTerm) || [];

      hybridValues.sort((a, b) => b.score - a.score);
      
      // ベクトル各次元に多様化されたスコアを設定
      let nonZeroValues = 0;
      for (let i = 0; i < Math.min(this.vectorDimensions, hybridValues.length); i++) {
        const frequencyWeight = Math.log(1 + hybridValues[i].count) / Math.log(10);
        const diversityFactor = (i + 1) / this.vectorDimensions;
        
        const value = hybridValues[i].score * frequencyWeight * (1 + diversityFactor * 0.1);
        originalVector[i] = value;
        nonZeroValues++; // 常にインクリメント
      }

      // 最終的な安全性チェック
      for (let i = 0; i < originalVector.length; i++) {
        if (isNaN(originalVector[i]) || !isFinite(originalVector[i])) {
          originalVector[i] = 0;
        } else if (originalVector[i] < 0) {
          originalVector[i] = Math.abs(originalVector[i]);
        }
      }
      
      // ベクトル正規化
      const norm = Math.sqrt(originalVector.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        for (let i = 0; i < originalVector.length; i++) {
          originalVector[i] /= norm;
        }
      }

      // ランダム射影による次元削減
      const compressedVector = Array(this.vectorDimensions).fill(0);
      for (let i = 0; i < this.vectorDimensions; i++) {
        for (let j = 0; j < originalVector.length; j++) {
          compressedVector[i] += originalVector[j] * this.randomProjectionMatrix[i][j];
        }
      }

      // デバッグ: 最初の数語彙でベクトル詳細表示
      if (process.env.DEBUG_VERBOSE === 'true' && this.contextVectors.size < 5) {
        console.log(`🧮 ベクトル生成: ${targetTerm} (非ゼロ=${nonZeroValues}, norm=${norm.toFixed(3)})`);
        console.log(`  - 元ベクトル例: [${originalVector.slice(0, 5).map(v => v.toFixed(3)).join(', ')}]`);
        console.log(`  - 圧縮後: [${compressedVector.slice(0, 5).map(v => v.toFixed(3)).join(', ')}]`);
      }
      
      this.contextVectors.set(targetTerm, compressedVector);
      
      // LSHインデックス登録（MinHashライブラリ対応）
      try {
        // MinHashは文字列の集合を期待するため、ベクトルを文字列特徴に変換
        const vectorFeatures = compressedVector
          .map((v, i) => `${i}:${Math.floor(v * 1000)}`)
          .filter(f => !f.includes('0:0')); // ゼロ値を除外
        
        const termMinHash = new MinHash();
        vectorFeatures.forEach(feature => termMinHash.update(feature));
        this.lshIndex.insert(targetTerm, termMinHash);
      } catch (error) {
        // LSHエラー時は無視（フォールバック検索を使用）
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ LSH登録エラー ${targetTerm}:`, error.message);
        }
      }
    }
    
    console.log(`✅ 分布ベクトル生成完了: ${this.contextVectors.size}語彙`);
    console.log(`📊 LSHインデックス登録完了: ${this.contextVectors.size}語彙`);
    return { vectorCount: this.contextVectors.size, dimensions: this.vectorDimensions };
  }

  /**
   * 改良コサイン類似度計算（多様化強化版）
   */
  calculateCosineSimilarity(term1, term2) {
    const cacheKey = `${term1}|||${term2}`;
    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey);
    }
    
    const vector1 = this.contextVectors.get(term1);
    const vector2 = this.contextVectors.get(term2);
    
    if (!vector1 || !vector2) {
      this.semanticCache.set(cacheKey, 0);
      return 0;
    }
    
    // コサイン類似度
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    const cosine = (norm1 > 0 && norm2 > 0) ? Math.round((dotProduct / (norm1 * norm2)) * 1e6) / 1e6 : 0;

    // Word Mover's Distance (WMD) の簡易版を導入
    // 語彙の「移動コスト」を考慮した類似度
    const wmdSimilarity = this.calculateSimplifiedWMDSimilarity(term1, term2, vector1, vector2);

    // ハイブリッド類似度：コサイン80% + WMD20%
    const hybridSimilarity = (cosine * 0.8) + (wmdSimilarity * 0.2);
    
    const similarity = Math.max(0, Math.min(1, hybridSimilarity)); // [0,1]に正規化
    this.semanticCache.set(cacheKey, similarity);
    return similarity;
  }

  /**
   * 簡易版 Word Mover's Distance (WMD) 類似度計算
   * @param {string} term1 - 単語1
   * @param {string} term2 - 単語2
   * @param {Array<number>} vector1 - 単語1のベクトル
   * @param {Array<number>} vector2 - 単語2のベクトル
   * @returns {number} WMD類似度スコア (0-1)
   */
  calculateSimplifiedWMDSimilarity(term1, term2, vector1, vector2) {
    // ユークリッド距離
    let euclideanDistance = 0;
    for (let i = 0; i < vector1.length; i++) {
      euclideanDistance += Math.pow(vector1[i] - vector2[i], 2);
    }
    euclideanDistance = Math.sqrt(euclideanDistance);

    // 単語の頻度情報（簡易的に単語の長さを使用）
    const freq1 = term1.length;
    const freq2 = term2.length;

    // 頻度と距離を組み合わせた「移動コスト」の簡易的な表現
    // 頻度が近いほど、移動コストが低いとみなす
    const frequencyCost = Math.abs(freq1 - freq2) / Math.max(freq1, freq2, 1);

    // 距離と頻度コストを統合
    // 距離が小さいほど、頻度コストが低いほど類似度が高い
    const combinedCost = euclideanDistance * 0.7 + frequencyCost * 0.3;

    // 類似度スコアに変換
    return 1 / (1 + combinedCost);
  }

  /**
   * 意味的に類似した語彙を取得
   */
  findSemanticallySimilarTerms(targetTerm, candidateTerms, threshold = null) {
    const actualThreshold = threshold || this.calculateDynamicSimilarityThreshold(candidateTerms);
    const similarities = [];
    
    try {
      // LSH近似検索による高速候補選択（MinHashライブラリ対応）
      const targetVector = this.contextVectors.get(targetTerm);
      if (targetVector) {
        const targetFeatures = targetVector
          .map((v, i) => `${i}:${Math.floor(v * 1000)}`)
          .filter(f => !f.includes('0:0'));
        
        const targetMinHash = new MinHash();
        targetFeatures.forEach(feature => targetMinHash.update(feature));
        
        const lshCandidates = this.lshIndex.query(targetMinHash, candidateTerms.length * 2);
        const lshSet = new Set(lshCandidates);
        
        // LSH候補を優先的に処理
        for (const candidate of candidateTerms) {
          if (candidate === targetTerm) continue;
          
          const similarity = this.calculateCosineSimilarity(targetTerm, candidate);
          if (similarity >= actualThreshold) {
            similarities.push({
              term: candidate,
              similarity: similarity,
              semanticStrength: similarity,
              lshHit: lshSet.has(candidate) // LSHでヒットしたかを記録
            });
          }
        }
      } else {
        throw new Error('Target vector not found');
      }
      
    } catch (error) {
      // LSHエラー時のフォールバック: 従来の総当たり検索
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ LSH検索エラー、フォールバック:', error.message);
      }
      for (const candidate of candidateTerms) {
        if (candidate === targetTerm) continue;
        
        const similarity = this.calculateCosineSimilarity(targetTerm, candidate);
        if (similarity >= actualThreshold) {
          similarities.push({
            term: candidate,
            similarity: similarity,
            semanticStrength: similarity
          });
        }
      }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 動的類似度閾値計算
   * 候補語彙の類似度分布に基づいて適応的に閾値を決定
   */
  calculateDynamicSimilarityThreshold(candidateTerms) {
    if (candidateTerms.length === 0) return 0.5; // デフォルト
    
    // 全候補の類似度を計算
    const similarities = [];
    for (const candidate of candidateTerms) {
      const avgSimilarity = this.getAverageSemanticSimilarity(candidate);
      if (avgSimilarity > 0) {
        similarities.push(avgSimilarity);
      }
    }
    
    if (similarities.length === 0) return 0.5;
    
    // 統計的閾値計算（四分位数ベース）
    similarities.sort((a, b) => a - b);
    const q1Index = Math.floor(similarities.length * 0.25);
    const q3Index = Math.floor(similarities.length * 0.75);
    const medianIndex = Math.floor(similarities.length * 0.5);
    
    const q1 = similarities[q1Index] || 0;
    const q3 = similarities[q3Index] || 1;
    const median = similarities[medianIndex] || 0.5;
    
    // 適応的閾値: 中央値とQ3の中間点
    const adaptiveThreshold = (median + q3) / 2;
    
    // 実用的範囲に制限
    return Math.max(0.3, Math.min(0.8, adaptiveThreshold));
  }

  /**
   * 語彙の平均意味的類似度計算
   */
  getAverageSemanticSimilarity(term) {
    if (!this.contextVectors.has(term)) return 0;
    
    let totalSimilarity = 0;
    let count = 0;
    
    // 他の語彙との平均類似度を計算
    for (const otherTerm of this.contextVectors.keys()) {
      if (otherTerm !== term) {
        const similarity = this.calculateCosineSimilarity(term, otherTerm);
        totalSimilarity += similarity;
        count++;
      }
    }
    
    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Phase 3統合: 意味的語彙選択
   */
  async selectSemanticallyAppropriateVocabulary(inputTerms, candidateTerms, maxResults = 5) {
    if (this.contextVectors.size === 0) {
      console.warn('⚠️ 分布ベクトル未生成 - 基本統計に回帰');
      return candidateTerms.slice(0, maxResults);
    }
    
    const semanticScores = new Map();
    
    // 入力語彙との意味的類似度計算
    for (const candidate of candidateTerms) {
      let totalSimilarity = 0;
      let validComparisons = 0;
      
      for (const inputTerm of inputTerms) {
        const similarity = this.calculateCosineSimilarity(inputTerm, candidate);
        if (similarity > 0) {
          totalSimilarity += similarity;
          validComparisons++;
        }
      }
      
      const avgSimilarity = validComparisons > 0 ? totalSimilarity / validComparisons : 0;
      semanticScores.set(candidate, avgSimilarity);
    }
    
    // 意味的類似度順にソート
    const sortedCandidates = candidateTerms
      .map(term => ({ term, semanticScore: semanticScores.get(term) || 0 }))
      .sort((a, b) => b.semanticScore - a.semanticScore);

    // 動的類似度閾値に基づいてフィルタリング
    const dynamicThreshold = this.calculateDynamicSimilarityThreshold(sortedCandidates.map(c => c.term));
    const filteredCandidates = sortedCandidates.filter(c => c.semanticScore >= dynamicThreshold);

    console.log('🎯 意味的語彙選択完了:', filteredCandidates.slice(0, maxResults).map(c => `${c.term}(${c.semanticScore.toFixed(3)})`));
    return filteredCandidates.slice(0, maxResults);
  }

  /**
   * UCB多腕バンディット統合: 高次N-gramコンテキストでの最適語彙選択
   * @param {Array<string>} contextTokens - 文脈トークン（高次N-gramで抽出）
   * @param {Array<string>} candidateTerms - 候補語彙
   * @param {Object} options - オプション
   * @returns {Promise<Object>} 最適化された語彙選択結果
   */
  async selectOptimalVocabularyWithBandit(contextTokens, candidateTerms, options = {}) {
    const maxResults = options.maxResults || 5;
    const useSemanticFiltering = options.useSemanticFiltering !== false;
    const banditWeight = options.banditWeight || 0.6;
    const semanticWeight = options.semanticWeight || 0.4;

    if (!this.banditIntegrationEnabled) {
      console.warn('⚠️ UCB多腕バンディット未統合 - 意味的選択にフォールバック');
      return await this.selectSemanticallyAppropriateVocabulary(contextTokens, candidateTerms, maxResults);
    }

    // 1. N-gramコンテキストから語彙候補を生成
    const contextualCandidates = this.extractContextualCandidates(contextTokens, candidateTerms);
    
    // 2. 意味的フィルタリング（オプション）
    let filteredCandidates = contextualCandidates;
    if (useSemanticFiltering && this.contextVectors.size > 0) {
      const semanticResults = await this.selectSemanticallyAppropriateVocabulary(
        contextTokens, 
        contextualCandidates.map(c => c.term), 
        Math.min(candidateTerms.length, maxResults * 2)
      );
      
      // 意味的スコアを統合
      filteredCandidates = contextualCandidates.map(candidate => {
        const semanticMatch = semanticResults.find(s => s.term === candidate.term);
        return {
          ...candidate,
          semanticScore: semanticMatch ? semanticMatch.semanticScore : 0
        };
      });
    }

    // 3. UCBバンディットによる最適選択
    const banditCandidates = filteredCandidates.map(c => c.term);
    const selectedTerm = await this.vocabularyBandit.selectVocabulary(banditCandidates);

    // 4. UCBスコア正規化（Infinity問題解決）
    const ucbScores = new Map();
    let maxFiniteUCB = 0;
    
    for (const candidate of filteredCandidates) {
      const rawUCB = this.vocabularyBandit.calculateUCBValue(candidate.term);
      if (isFinite(rawUCB)) {
        ucbScores.set(candidate.term, rawUCB);
        maxFiniteUCB = Math.max(maxFiniteUCB, rawUCB);
      } else {
        ucbScores.set(candidate.term, null); // Infinityマーク
      }
    }
    
    // Infinity値に統一された高スコアを割り当て
    const infinityReplacement = maxFiniteUCB > 0 ? maxFiniteUCB * 1.5 : 1.0;
    
    // 5. ハイブリッドスコア計算
    const results = [];
    for (const candidate of filteredCandidates.slice(0, maxResults)) {
      let banditScore = ucbScores.get(candidate.term);
      if (banditScore === null) {
        banditScore = infinityReplacement; // Infinity置換
      }
      
      // 正規化: 0-1範囲に収束
      const normalizedBanditScore = candidate.term === selectedTerm ? 1.0 : 
        Math.min(1.0, banditScore / (maxFiniteUCB > 0 ? maxFiniteUCB * 2 : 1.0));

      const semanticScore = candidate.semanticScore || 0;
      const contextualScore = candidate.ngramScore || 0;
      
      const hybridScore = (normalizedBanditScore * banditWeight) + 
                         (semanticScore * semanticWeight * 0.5) + 
                         (contextualScore * semanticWeight * 0.5);

      results.push({
        term: candidate.term,
        hybridScore: Math.round(hybridScore * 10000) / 10000,
        banditScore: Math.round(normalizedBanditScore * 10000) / 10000,
        semanticScore: Math.round(semanticScore * 10000) / 10000,
        contextualScore: Math.round(contextualScore * 10000) / 10000,
        isOptimal: candidate.term === selectedTerm
      });
    }

    results.sort((a, b) => b.hybridScore - a.hybridScore);

    console.log('🎯 UCB+N-gram統合語彙選択完了:', {
      selectedTerm,
      topResults: results.slice(0, 3).map(r => `${r.term}(${r.hybridScore})`),
      banditWeight,
      semanticWeight
    });

    return {
      selectedTerm,
      results: results.slice(0, maxResults),
      metadata: {
        contextTokens,
        totalCandidates: candidateTerms.length,
        filteredCandidates: filteredCandidates.length,
        banditEnabled: this.banditIntegrationEnabled,
        semanticEnabled: useSemanticFiltering
      }
    };
  }

  /**
   * 高次N-gramコンテキストから語彙候補を抽出
   * @param {Array<string>} contextTokens - 文脈トークン
   * @param {Array<string>} candidateTerms - 候補語彙
   * @returns {Array<Object>} コンテキストスコア付き候補
   */
  extractContextualCandidates(contextTokens, candidateTerms) {
    const candidates = [];
    
    for (const term of candidateTerms) {
      let maxNgramScore = 0;
      let bestNgramOrder = 0;

      // 各N-gram次数でのコンテキスト適合度を計算
      for (let n = this.minNgramOrder; n <= this.maxNgramOrder; n++) {
        for (let i = 0; i <= contextTokens.length - n; i++) {
          const ngram = contextTokens.slice(i, i + n).join(' ');
          
          // N-gram + 候補語彙の組み合わせスコア
          const extendedNgram = `${ngram} ${term}`;
          const ngramScore = this.calculateKneserNeyProbability(extendedNgram, n + 1);
          
          if (ngramScore > maxNgramScore) {
            maxNgramScore = ngramScore;
            bestNgramOrder = n + 1;
          }
        }
      }

      candidates.push({
        term,
        ngramScore: maxNgramScore,
        bestNgramOrder,
        contextualFit: maxNgramScore * bestNgramOrder // 高次の方が重要
      });
    }

    return candidates.sort((a, b) => b.contextualFit - a.contextualFit);
  }

  // ===== ヘルパーメソッド =====

  getCooccurrenceKey(term1, term2) {
    return term1 < term2 ? `${term1}|||${term2}` : `${term2}|||${term1}`;
  }

  getTermCooccurrences(targetTerm) {
    const cooccurrences = new Map();
    const targetTermId = this.cooccurrenceMatrix.termToId.get(targetTerm);

    if (targetTermId === undefined) {
      return [];
    }

    for (const [coTerm, count] of this.cooccurrenceMatrix.getCooccurrencesByRowId(targetTermId)) {
      cooccurrences.set(coTerm, count);
    }
    
    return Array.from(cooccurrences.entries())
      .sort((a, b) => b[1] - a[1]); // 頻度順
  }

  calculatePMI(term1, term2, cooccurrenceCount, totalCooccurrences, term1TotalCooccurrences, term2TotalCooccurrences) {
    if (cooccurrenceCount < this.learningConfig.minCooccurrenceForPMI) return 0; // 閾値未満は計算しない

    const term1Count = term1TotalCooccurrences; // 引数から取得
    const term2Count = term2TotalCooccurrences; // 引数から取得
    
    if (term1Count === 0 || term2Count === 0 || totalCooccurrences === 0) return 0;
    
    // 正規化PMI計算: 実際の共起頻度 vs 期待される共起頻度
    const pTerm1 = term1Count / totalCooccurrences;
    const pTerm2 = term2Count / totalCooccurrences;
    const pCooccur = cooccurrenceCount / totalCooccurrences;
    
    const expectedCooccur = pTerm1 * pTerm2;
    if (expectedCooccur === 0) return 0;
    
    const pmi = Math.log2(pCooccur / expectedCooccur);
    
    // 正のPMIのみ使用（PPMI: Positive PMI）
    return Math.max(0, pmi);
  }

  getTermTotalCooccurrences(term) {
    if (NgramContextPatternAI.termTotalCooccurrencesCache.has(term)) {
      return NgramContextPatternAI.termTotalCooccurrencesCache.get(term);
    }

    let total = 0;
    const termId = this.cooccurrenceMatrix.termToId.get(term);
    if (termId !== undefined) {
      for (const [coTerm, count] of this.cooccurrenceMatrix.getCooccurrencesByRowId(termId)) {
        total += count;
      }
    }
    NgramContextPatternAI.termTotalCooccurrencesCache.set(term, total);
    return total;
  }

  /**
   * 語彙ペア間のTF-IDFスコア計算
   * 共起頻度ベースのTF-IDF類似度測定
   */
  calculateTermTFIDF(targetTerm, coTerm, coCount, targetTotalCooccurrences, coTermTotalCooccurrences) {
    // TF: 対象語彙における共起語彙の相対頻度
    const tf = targetTotalCooccurrences > 0 ? coCount / targetTotalCooccurrences : 0;
    
    // IDF: 共起語彙の希少性（逆語彙頻度）
    const totalTerms = this.contextVectors ? this.contextVectors.size : 1;
    const idf = coTermTotalCooccurrences > 0 ? 
      Math.log(totalTerms / (1 + coTermTotalCooccurrences)) : 0;
    
    return Math.max(0, tf * idf);
  }

  /**
   * 語彙固有のハッシュ値計算
   * 決定論的だが語彙ごとに異なる値を生成
   */
  calculateTermHash(term) {
    let hash = 0;
    for (let i = 0; i < term.length; i++) {
      const char = term.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    // 0-1範囲の正の値に正規化
    return Math.abs(hash) / 2147483647;
  }

  /**
   * セマンティック多様性係数計算
   * 語彙ペア間の意味的距離と文字列類似度から多様性を評価
   * @param {string} term1 - 語彙1
   * @param {string} term2 - 語彙2
   * @returns {number} 多様性係数 (0-1, 高いほど多様)
   */
  calculateSemanticDiversity(term1, term2) {
    // 1. 文字列編集距離による類似度
    const editDistance = this.calculateEditDistance(term1, term2);
    const maxLen = Math.max(term1.length, term2.length);
    const stringDiversity = maxLen > 0 ? editDistance / maxLen : 0;
    
    // 2. 語彙頻度分布による多様性
    const freq1 = this.getTermTotalCooccurrences(term1);
    const freq2 = this.getTermTotalCooccurrences(term2);
    const freqRatio = freq1 > 0 && freq2 > 0 ? 
      Math.abs(Math.log(freq1) - Math.log(freq2)) / Math.log(Math.max(freq1, freq2)) : 0.5;
    
    // 3. 語彙長による構造的多様性
    const lengthDiversity = Math.abs(term1.length - term2.length) / Math.max(term1.length, term2.length, 1);
    
    // 4. ハッシュベース擬似ランダム多様性
    const hash1 = this.calculateTermHash(term1);
    const hash2 = this.calculateTermHash(term2);
    const hashDiversity = Math.abs(hash1 - hash2);
    
    // 重み付き合成多様性スコア
    const diversityScore = (stringDiversity * 0.4) + 
                          (freqRatio * 0.3) + 
                          (lengthDiversity * 0.2) + 
                          (hashDiversity * 0.1);
    
    return Math.min(1.0, Math.max(0.0, diversityScore));
  }

  /**
   * 編集距離計算（レーベンシュタイン距離の軽量版）
   * @param {string} str1 - 文字列1
   * @param {string} str2 - 文字列2
   * @returns {number} 編集距離
   */
  calculateEditDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    
    // 長い文字列の場合は近似計算
    if (m > 20 || n > 20) {
      // 共通文字数ベースの近似
      const common = new Set(str1.split('')).size + new Set(str2.split('')).size - 
                     new Set([...str1, ...str2]).size;
      return Math.max(m, n) - common;
    }
    
    // 短い文字列は正確な編集距離
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // 削除
            dp[i][j - 1] + 1,     // 挿入
            dp[i - 1][j - 1] + 1  // 置換
          );
        }
      }
    }
    
    return dp[m][n];
  }

  /**
   * Phase 3初期化
   */
  async initializeDistributionalSemantics() {
    console.log('🧠 Phase 3分布意味論初期化: 既存関係性データ活用...');
    
    try {
      // 既存の語彙関係性データから共起行列を構築
      const relationshipData = await this.buildCooccurrenceFromRelationships();
      
      if (relationshipData.pairCount === 0) {
        // N-gramデータからのフォールバック
        const ngramResult = this.buildCooccurrenceMatrix();
        const vectorResult = this.generateDistributionalVectors();
        
        console.log('🎉 Phase 3分布意味論初期化完了 (N-gramベース):', {
          cooccurrencePairs: ngramResult.pairCount,
          vocabularySize: ngramResult.termCount,
          vectorDimensions: vectorResult.dimensions
        });
        
        return ngramResult.pairCount > 0;
      } else {
        const vectorResult = this.generateDistributionalVectors();
        
        console.log('🎉 Phase 3分布意味論初期化完了 (関係性ベース):', {
          cooccurrencePairs: relationshipData.pairCount,
          vocabularySize: relationshipData.termCount,
          vectorDimensions: vectorResult.dimensions,
          source: 'vocabulary_relationships'
        });
        
        return true;
      }
    } catch (error) {
      console.error('❌ 分布意味論初期化エラー:', error.message);
      return false;
    }
  }

  /**
   * 動的な割引パラメータを計算します。
   * 学習データのスパース性に基づいて調整
   * @returns {number} 動的な割引パラメータ
   */
  calculateDynamicDiscountParameter() {
    // N-gramの総数とユニークなN-gramの数に基づいてスパース性を評価
    const sparsity = 1 - (this.ngramFrequencies.size / Math.max(1, this.totalNgrams));

    // スパース性が高いほど、より大きな割引パラメータを使用（よりスムージングを強くする）
    // 0.5から0.95の範囲で調整
    const dynamicDiscount = 0.5 + (0.45 * sparsity);

    return Math.min(Math.max(dynamicDiscount, 0.5), 0.95); // 0.5から0.95の範囲にクランプ
  }

  /**
   * 既存語彙関係性データから共起行列構築
   */
  async buildCooccurrenceFromRelationships() {
    this.cooccurrenceMatrix.clear();
    
    try {
      // persistentLearningDBから関係性データを取得
      const relations = await this.persistentLearningDB.getUserSpecificRelations('default');
      const userRelations = relations.userRelations || {};
      
      console.log(`📊 関係性データ処理開始: ${Object.keys(userRelations).length}語彙`);
      
      // 語彙関係性から共起関係を構築
      for (const [keyword, relatedTerms] of Object.entries(userRelations)) {
        if (!keyword || keyword.length < 2) continue;
        
        for (const relatedTermData of relatedTerms) {
          const relatedTerm = relatedTermData.term || relatedTermData;
          if (!relatedTerm || typeof relatedTerm !== 'string' || relatedTerm.length < 2 || relatedTerm === keyword) continue;
          
          // 関係性の強度に基づく重み付け（strengthまたはcountを使用）
          const weight = relatedTermData.strength || relatedTermData.count || 1.0;
          this.cooccurrenceMatrix.set(keyword, relatedTerm, weight);
        }
      }
      
      console.log(`✅ 関係性ベース共起行列構築完了: ${this.cooccurrenceMatrix.size}組, ${this.cooccurrenceMatrix.vocabularySize}語彙`);
      this.totalCooccurrences = Array.from(this.cooccurrenceMatrix).reduce((sum, [, , count]) => sum + count, 0); // Sparse Matrixのイテレータを使用
      return { pairCount: this.cooccurrenceMatrix.size, termCount: this.cooccurrenceMatrix.vocabularySize };
      
    } catch (error) {
      console.warn('⚠️ 関係性データ読み込みエラー:', error.message);
      return { pairCount: 0, termCount: 0 };
    }
  }
}
