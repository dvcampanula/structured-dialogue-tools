/**
 * MultiArmedBanditVocabularyAI - 多腕バンディットアルゴリズムによる語彙選択最適化AI
 * 
 * UCB (Upper Confidence Bound) アルゴリズムを用いて、
 * ユーザーのフィードバックに基づいて最適な語彙を選択・学習します。
 */
import { persistentLearningDB } from '../../data/persistent-learning-db.js';

/**
 * MultiArmedBanditVocabularyAI - 多腕バンディットアルゴリズムによる語彙選択最適化AI
 * 
 * UCB (Upper Confidence Bound) アルゴリズムを用いて、
 * ユーザーのフィードバックに基づいて最適な語彙を選択・学習します。
 */
export class MultiArmedBanditVocabularyAI {
  constructor(persistentDB, learningConfig = {}) {
    this.persistentLearningDB = persistentDB;
    this.vocabularyStats = new Map(); // Map<vocabulary: string, { rewards: number, selections: number }>
    this.totalSelections = 0;
    this.explorationConstant = Math.sqrt(2); // UCBアルゴリズムの探索定数
    this.isInitialized = false;
    this.learningConfig = { // 動的設定
      initialExplorationBonus: 5, // 冷開始時の初期探索ボーナス
      explorationDecayRate: 0.99, // 探索定数の減衰率
      minExplorationConstant: 0.1 // 探索定数の最小値
    };
    Object.assign(this.learningConfig, learningConfig); // 外部設定で上書き可能
  }

  async initialize() {
    if (this.isInitialized) return;
    console.log('🧬 MultiArmedBanditVocabularyAI初期化中...');
    try {
      const loadedData = await this.persistentLearningDB.loadBanditData();
      if (loadedData) {
        this.vocabularyStats = new Map(loadedData.vocabularyStats);
        this.totalSelections = loadedData.totalSelections;
        console.log(`✅ MultiArmedBanditVocabularyAI初期化完了。${this.vocabularyStats.size}件の語彙統計を読み込みました。`);
      } else {
        console.log('✅ MultiArmedBanditVocabularyAI初期化完了。新規データ。');
      }
    } catch (error) {
      console.error('❌ MultiArmedBanditVocabularyAI初期化エラー:', error.message);
    }
    this.isInitialized = true;
  }

  /**
   * 語彙のUCB値を計算します。
   * UCB値 = 平均報酬 + 探索項
   * @param {string} vocabulary - 評価する語彙
   * @returns {number} UCB値
   */
  calculateUCBValue(vocabulary) {
    if (!this.isInitialized) {
      console.warn('⚠️ MultiArmedBanditVocabularyAIが初期化されていません。');
      return Infinity; // 初期化されていない場合は無限大を返して選択を促す
    }

    if (!this.vocabularyStats.has(vocabulary)) {
      // 未選択の語彙は初期探索ボーナスを付与
      return Infinity; // 非常に高いUCB値を与え、優先的に選択されるようにする
    }

    const stats = this.vocabularyStats.get(vocabulary);
    const averageReward = stats.rewards / stats.selections;

    // 動的な探索定数
    const dynamicExplorationConstant = Math.max(
      this.learningConfig.minExplorationConstant,
      this.explorationConstant * Math.pow(this.learningConfig.explorationDecayRate, this.totalSelections)
    );

    const explorationTerm = dynamicExplorationConstant * Math.sqrt(Math.log(this.totalSelections + 1) / stats.selections);

    return averageReward + explorationTerm;
  }

  /**
   * 候補の中から最適な語彙を選択します。
   * @param {Array<string>} candidates - 選択肢となる語彙の配列
   * @returns {string} 選択された最適な語彙
   */
  async selectVocabulary(candidates) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (candidates.length === 0) {
      return null;
    }

    let bestVocabulary = null;
    let maxUCBValue = -Infinity;

    for (const vocabulary of candidates) {
      const ucbValue = this.calculateUCBValue(vocabulary);
      if (ucbValue > maxUCBValue) {
        maxUCBValue = ucbValue;
        bestVocabulary = vocabulary;
      }
    }

    // 選択された語彙の統計を更新
    await this.recordSelection(bestVocabulary);
    return bestVocabulary;
  }

  /**
   * 語彙が選択されたことを記録します。
   * @param {string} vocabulary - 選択された語彙
   */
  async recordSelection(vocabulary) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.vocabularyStats.has(vocabulary)) {
      this.vocabularyStats.set(vocabulary, { rewards: 0, selections: 0 });
    }
    const stats = this.vocabularyStats.get(vocabulary);
    stats.selections++;
    this.totalSelections++;
    await this._saveData();
  }

  /**
   * ユーザーフィードバックに基づいて語彙の報酬を更新します。
   * @param {string} vocabulary - フィードバック対象の語彙
   * @param {number} userRating - ユーザーからの評価 (例: 0-1の範囲)
   */
  async updateRewards(vocabulary, userRating) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.vocabularyStats.has(vocabulary)) {
      const stats = this.vocabularyStats.get(vocabulary);
      // 報酬を0-1の範囲に正規化することを保証
      const normalizedRating = Math.max(0, Math.min(1, userRating));
      stats.rewards += Math.round(normalizedRating * 10000) / 10000;
      await this._saveData();
    }
  }

  /**
   * 現在の語彙統計を取得します。
   * @returns {Map<string, { rewards: number, selections: number }>} 語彙統計
   */
  getVocabularyStats() {
    return this.vocabularyStats;
  }

  /**
   * バンディットデータを永続化します。
   */
  async _saveData() {
    const dataToSave = {
      vocabularyStats: Array.from(this.vocabularyStats.entries()),
      totalSelections: this.totalSelections,
    };
    await this.persistentLearningDB.saveBanditData(dataToSave);
    // console.log('💾 バンディットデータ保存完了'); // ログを削除
  }
}
