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
    
    // Phase 3: 分布意味論統合
    this.contextVectors = new Map(); // Map<term: string, vector: number[]>
    this.cooccurrenceMatrix = new Map(); // Map<term1_term2: string, count: number>
    this.semanticCache = new Map(); // 類似度計算キャッシュ
    this.vectorDimensions = 50; // 軽量ベクトル次元数
    this.similarityThreshold = null; // 動的計算される類似度閾値
    
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
        
        // Phase 3: 分布意味論初期化
        if (this.ngramFrequencies.size > 0) {
          console.log('🚀 Phase 3分布意味論統合開始...');
          await this.initializeDistributionalSemantics();
        }
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

    // 文脈頻度の統計学習: データ自身から文脈パターンを発見
    const discoveredContext = this.discoverContextFromData(tokens);
    if (discoveredContext) {
      this.updateContextFrequency(discoveredContext);
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
            const key = this.getCooccurrenceKey(term1, term2);
            const currentCount = this.cooccurrenceMatrix.get(key) || 0;
            this.cooccurrenceMatrix.set(key, currentCount + frequency);
            
            processedTerms.add(term1);
            processedTerms.add(term2);
          }
        }
      }
    }
    
    console.log(`✅ 共起行列構築完了: ${this.cooccurrenceMatrix.size}組, ${processedTerms.size}語彙`);
    return { pairCount: this.cooccurrenceMatrix.size, termCount: processedTerms.size };
  }

  /**
   * 分布ベクトル生成
   * PMI (Pointwise Mutual Information) を用いた軽量分布表現
   */
  generateDistributionalVectors() {
    console.log('🧮 分布ベクトル生成開始...');
    
    this.contextVectors.clear();
    const allTerms = new Set();
    
    // 全語彙収集
    for (const key of this.cooccurrenceMatrix.keys()) {
      const [term1, term2] = key.split('|||');
      allTerms.add(term1);
      allTerms.add(term2);
    }
    
    const termList = Array.from(allTerms);
    // 全共起総数を計算（PMI正規化用）
    const totalCooccurrences = Array.from(this.cooccurrenceMatrix.values()).reduce((sum, count) => sum + count, 0);
    console.log(`📊 PMI計算用統計: 語彙数=${termList.length}, 共起総数=${totalCooccurrences}`);
    
    // 各語彙の分布ベクトル生成
    for (const targetTerm of termList) {
      const vector = new Array(this.vectorDimensions).fill(0);
      const termCooccurrences = this.getTermCooccurrences(targetTerm);
      
      // PMI + TF-IDFハイブリッドベクトル生成（多様化改良版）
      const hybridValues = [];
      for (const [coTerm, coCount] of termCooccurrences) {
        const pmi = this.calculatePMI(targetTerm, coTerm, coCount, totalCooccurrences);
        const tfidf = this.calculateTermTFIDF(targetTerm, coTerm, coCount);
        
        if (pmi > 0 || tfidf > 0) {
          // PMIとTF-IDFを統合したスコア
          const hybridScore = (pmi * 0.7) + (tfidf * 0.3);
          hybridValues.push({ 
            term: coTerm, 
            score: hybridScore,
            pmi: pmi,
            tfidf: tfidf,
            count: coCount 
          });
        }
      }
      
      // ハイブリッドスコアでソートして上位を選択
      hybridValues.sort((a, b) => b.score - a.score);
      
      // ベクトル各次元に多様化されたスコアを設定
      let nonZeroValues = 0;
      for (let i = 0; i < Math.min(this.vectorDimensions, hybridValues.length); i++) {
        // 語彙頻度による重み付けで多様性を向上
        const frequencyWeight = Math.log(1 + hybridValues[i].count) / Math.log(10);
        const diversityFactor = (i + 1) / this.vectorDimensions; // 次元位置による多様化
        
        vector[i] = hybridValues[i].score * frequencyWeight * (1 + diversityFactor * 0.1);
        nonZeroValues++;
      }
      
      // 適応的正規化（単一共起対策・NaN/負値対策）
      if (nonZeroValues === 1) {
        // 単一共起の場合、語彙特徴に基づく多様化
        const termLength = Math.max(1, targetTerm.length);
        const termComplexity = Math.min(1.0, termLength / 10); // 語彙複雑度 [0,1]
        const baseValue = Math.abs(vector[0]) || 0.01; // 負値・NaN対策
        
        // 語彙固有のシード値でハッシュベース多様化
        const termHash = this.calculateTermHash(targetTerm);
        
        for (let i = 1; i < Math.min(8, this.vectorDimensions); i++) {
          // 語彙特性と位置ベースの多様化
          const positionFactor = (i + 1) / this.vectorDimensions;
          const hashVariation = (termHash * (i + 1) * 0.1) % 1; // 0-1範囲
          const complexityVariation = termComplexity * (0.5 + hashVariation * 0.5);
          
          vector[i] = baseValue * complexityVariation * (0.05 + positionFactor * 0.2);
        }
        vector[0] = baseValue; // 基準値を正の値に設定
        nonZeroValues = Math.min(8, this.vectorDimensions);
      } else if (nonZeroValues > 1) {
        // 複数共起の場合、安全な正規化
        const validValues = vector.filter(v => !isNaN(v) && isFinite(v) && v > 0);
        if (validValues.length > 0) {
          const maxScore = Math.max(...validValues);
          for (let i = 0; i < vector.length; i++) {
            if (!isNaN(vector[i]) && isFinite(vector[i]) && vector[i] > 0) {
              vector[i] = vector[i] / maxScore; // [0, 1]範囲に正規化
            } else {
              vector[i] = 0; // 無効値をゼロに設定
            }
          }
        }
      }
      
      // 最終的な安全性チェック
      for (let i = 0; i < vector.length; i++) {
        if (isNaN(vector[i]) || !isFinite(vector[i])) {
          vector[i] = 0;
        } else if (vector[i] < 0) {
          vector[i] = Math.abs(vector[i]); // 負値を絶対値に変換
        }
      }
      
      // ベクトル正規化
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        for (let i = 0; i < vector.length; i++) {
          vector[i] /= norm;
        }
      }
      
      // デバッグ: 最初の数語彙でベクトル詳細表示
      if (this.contextVectors.size < 3) {
        console.log(`🧮 ベクトル生成: ${targetTerm} (共起数=${termCooccurrences.length}, 非ゼロ=${nonZeroValues}, norm=${norm.toFixed(3)})`);
        console.log(`  ベクトル例: [${vector.slice(0, 5).map(v => v.toFixed(3)).join(', ')}]`);
      }
      
      this.contextVectors.set(targetTerm, vector);
    }
    
    console.log(`✅ 分布ベクトル生成完了: ${this.contextVectors.size}語彙`);
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
    
    // マンハッタン距離とコサイン類似度のハイブリッド計算
    let dotProduct = 0;
    let manhattanDistance = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      manhattanDistance += Math.abs(vector1[i] - vector2[i]);
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    // コサイン類似度
    const cosine = (norm1 > 0 && norm2 > 0) ? dotProduct / (norm1 * norm2) : 0;
    
    // マンハッタン距離ベース類似度（逆距離）
    const manhattan = 1 / (1 + manhattanDistance);
    
    // 語彙特性による重み付け
    const termDistance = Math.abs(term1.length - term2.length);
    const lengthSimilarity = 1 / (1 + termDistance * 0.1);
    
    // ハイブリッド類似度：コサイン60% + マンハッタン30% + 語彙特性10%
    const hybridSimilarity = (cosine * 0.6) + (manhattan * 0.3) + (lengthSimilarity * 0.1);
    
    const similarity = Math.max(0, Math.min(1, hybridSimilarity)); // [0,1]に正規化
    this.semanticCache.set(cacheKey, similarity);
    return similarity;
  }

  /**
   * 意味的に類似した語彙を取得
   */
  findSemanticallySimilarTerms(targetTerm, candidateTerms, threshold = null) {
    const actualThreshold = threshold || this.calculateDynamicSimilarityThreshold(candidateTerms);
    const similarities = [];
    
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
      .sort((a, b) => b.semanticScore - a.semanticScore)
      .slice(0, maxResults);
    
    console.log('🎯 意味的語彙選択完了:', sortedCandidates.map(c => `${c.term}(${c.semanticScore.toFixed(3)})`));
    return sortedCandidates;
  }

  // ===== ヘルパーメソッド =====

  getCooccurrenceKey(term1, term2) {
    return term1 < term2 ? `${term1}|||${term2}` : `${term2}|||${term1}`;
  }

  getTermCooccurrences(targetTerm) {
    const cooccurrences = new Map();
    
    for (const [key, count] of this.cooccurrenceMatrix) {
      const [term1, term2] = key.split('|||');
      if (term1 === targetTerm) {
        cooccurrences.set(term2, count);
      } else if (term2 === targetTerm) {
        cooccurrences.set(term1, count);
      }
    }
    
    return Array.from(cooccurrences.entries())
      .sort((a, b) => b[1] - a[1]); // 頻度順
  }

  calculatePMI(term1, term2, cooccurrenceCount, totalCooccurrences) {
    const term1Count = this.getTermTotalCooccurrences(term1);
    const term2Count = this.getTermTotalCooccurrences(term2);
    
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
    let total = 0;
    for (const [key, count] of this.cooccurrenceMatrix) {
      const [term1, term2] = key.split('|||');
      if (term1 === term || term2 === term) {
        total += count;
      }
    }
    return total;
  }

  /**
   * 語彙ペア間のTF-IDFスコア計算
   * 共起頻度ベースのTF-IDF類似度測定
   */
  calculateTermTFIDF(targetTerm, coTerm, coCount) {
    // TF: 対象語彙における共起語彙の相対頻度
    const targetTotalCooccurrences = this.getTermTotalCooccurrences(targetTerm);
    const tf = targetTotalCooccurrences > 0 ? coCount / targetTotalCooccurrences : 0;
    
    // IDF: 共起語彙の希少性（逆語彙頻度）
    const coTermTotalCooccurrences = this.getTermTotalCooccurrences(coTerm);
    const totalTerms = this.contextVectors ? this.contextVectors.size : 1;
    const idf = coTermTotalCooccurrences > 0 ? 
      Math.log(totalTerms / (1 + coTermTotalCooccurrences)) : 0;
    
    return tf * idf;
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
   * 既存語彙関係性データから共起行列構築
   */
  async buildCooccurrenceFromRelationships() {
    this.cooccurrenceMatrix.clear();
    const processedTerms = new Set();
    
    try {
      // persistentLearningDBから関係性データを取得
      const relations = await this.persistentLearningDB.getUserSpecificRelations('default');
      const userRelations = relations.userRelations || {};
      
      console.log(`📊 関係性データ処理開始: ${Object.keys(userRelations).length}語彙`);
      
      // 語彙関係性から共起関係を構築
      for (const [keyword, relatedTerms] of Object.entries(userRelations)) {
        if (!keyword || keyword.length < 2) continue;
        
        processedTerms.add(keyword);
        
        for (const relatedTermData of relatedTerms) {
          const relatedTerm = relatedTermData.term || relatedTermData;
          if (!relatedTerm || typeof relatedTerm !== 'string' || relatedTerm.length < 2 || relatedTerm === keyword) continue;
          
          const key = this.getCooccurrenceKey(keyword, relatedTerm);
          const currentCount = this.cooccurrenceMatrix.get(key) || 0;
          // 関係性の強度に基づく重み付け（strengthまたはcountを使用）
          const weight = relatedTermData.strength || relatedTermData.count || 1.0;
          this.cooccurrenceMatrix.set(key, currentCount + weight);
          
          processedTerms.add(relatedTerm);
        }
      }
      
      console.log(`✅ 関係性ベース共起行列構築完了: ${this.cooccurrenceMatrix.size}組, ${processedTerms.size}語彙`);
      return { pairCount: this.cooccurrenceMatrix.size, termCount: processedTerms.size };
      
    } catch (error) {
      console.warn('⚠️ 関係性データ読み込みエラー:', error.message);
      return { pairCount: 0, termCount: 0 };
    }
  }
}
