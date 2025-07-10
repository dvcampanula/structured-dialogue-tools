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
  constructor(maxNgramOrder = 3) { // Add maxNgramOrder to constructor
    this.ngramFrequencies = new Map(); // Map<ngram: string, frequency: number>
    this.contextFrequencies = new Map(); // Map<context: string, frequency: number>
    this.totalNgrams = 0;
    this.maxNgramOrder = maxNgramOrder; // Store maxNgramOrder
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    console.log('🧬 NgramContextPatternAI初期化中...');
    try {
      const loadedData = await persistentLearningDB.loadNgramData();
      if (loadedData) {
        this.ngramFrequencies = new Map(loadedData.ngramFrequencies);
        this.contextFrequencies = new Map(loadedData.contextFrequencies);
        this.totalNgrams = loadedData.totalNgrams;
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

    // N-gramの生成と頻度学習
    for (let n = 1; n <= this.maxNgramOrder; n++) { // Loop for different N-gram orders
      for (let i = 0; i <= tokens.length - n; i++) {
        const ngram = tokens.slice(i, i + n).join(' ');
        this.updateNgramFrequency(ngram);
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
    this.totalNgrams++; // This should probably count unique ngrams or total tokens, but for now, keep as is.
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
   * (簡易的な実装。実際にはKneser-Neyスムージングなどを用いる)
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

    // Iterate through all learned contexts
    for (const [context, contextFreq] of this.contextFrequencies.entries()) {
      let currentContextScore = 0;
      // For each context, calculate a score based on matching n-grams in the text
      for (let n = 1; n <= this.maxNgramOrder; n++) {
        for (let i = 0; i <= tokens.length - n; i++) {
          const ngram = tokens.slice(i, i + n).join(' ');
          const ngramFreq = this.ngramFrequencies.get(ngram) || 0;
          // A very simplified scoring: sum of ngram frequencies, weighted by context frequency
          // In a real scenario, this would involve conditional probabilities and Kneser-Ney
          currentContextScore += ngramFreq * (contextFreq / this.totalNgrams); // Simplified weighting
        }
      }

      if (currentContextScore > maxScore) {
        maxScore = currentContextScore;
        bestContext = context;
      }
    }
    
    // If no context is found, fallback to the most frequent context or a default
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
        // Confidence calculation needs to be more robust
        return { predictedCategory: bestContext, confidence: highestFreq / this.totalNgrams };
    } else if (bestContext === null) {
        return { predictedCategory: 'general', confidence: 0 }; // Default if no learning has occurred
    }

    // Confidence calculation is still very basic and needs refinement for real Kneser-Ney
    return { predictedCategory: bestContext, confidence: maxScore > 0 ? maxScore / this.totalNgrams : 0 };
  }

  /**
   * Kneser-Neyスムージングを用いたN-gramの確率を計算します。
   * (これはスケルトンであり、実際のKneser-Ney実装はより複雑です)
   * @param {string} ngram - 計算対象のN-gram
   * @param {number} order - N-gramの次数 (例: 2 for bigram)
   * @returns {number} スムージングされた確率
   */
  calculateSmoothProbability(ngram, order) {
    // Kneser-Neyスムージングの基本概念:
    // P_KN(w_i | w_{i-n+1}...w_{i-1}) = max(count(w_{i-1}w_i) - d, 0) / count(w_{i-1}) + lambda(w_{i-1}) * P_KN(w_i | w_{i-n+2}...w_{i-1})
    // ここでは、その概念を反映するためのプレースホルダーを提供します。

    const frequency = this.ngramFrequencies.get(ngram) || 0;
    if (order === 1) {
      // Unigram probability (smoothed)
      return frequency / this.totalNgrams; // Simplified
    } else {
      // Higher-order N-gram probability (simplified Kneser-Ney idea)
      // This would involve:
      // 1. Discounting (d) for observed n-grams
      // 2. Lower-order probability (recursive call or pre-calculated)
      // 3. Lambda term (context-dependent smoothing parameter)

      // For now, a very basic smoothed frequency
      const prefix = ngram.split(' ').slice(0, order - 1).join(' ');
      const prefixFreq = this.ngramFrequencies.get(prefix) || 1; // Avoid division by zero
      
      // This is NOT Kneser-Ney, just a slightly less naive probability
      return (frequency + 0.1) / (prefixFreq + 0.1 * this.ngramFrequencies.size); // Add-alpha smoothing idea
    }
  }

  /**
   * N-gramデータを永続化します。
   */
  async _saveData() {
    const dataToSave = {
      ngramFrequencies: Array.from(this.ngramFrequencies.entries()),
      contextFrequencies: Array.from(this.contextFrequencies.entries()),
      totalNgrams: this.totalNgrams,
    };
    await persistentLearningDB.saveNgramData(dataToSave);
    console.log('💾 N-gramデータ保存完了');
  }
}
