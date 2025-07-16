/**
 * BayesianPersonalizationAI - ナイーブベイズ増分学習による個人適応AI
 * 
 * ユーザーの行動履歴から個人プロファイルを構築し、
 * ナイーブベイズ分類器を用いてコンテンツを個人に最適化します。
 */
import { persistentLearningDB } from '../../data/persistent-learning-db.js';

/**
 * BayesianPersonalizationAI - ナイーブベイズ増分学習による個人適応AI
 * 
 * ユーザーの行動履歴から個人プロファイルを構築し、
 * ナイーブベイズ分類器を用いてコンテンツを個人に最適化します。
 */
export class BayesianPersonalizationAI {
  constructor(persistentDB) {
    this.persistentLearningDB = persistentDB;
    this.userProfiles = new Map(); // Map<userId: string, UserProfile>
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    console.log('🧬 BayesianPersonalizationAI初期化中...');
    // 既存のユーザープロファイルをすべて読み込む
    const allUserProfilesData = await this.persistentLearningDB.loadAllUserProfiles();
    for (const userId in allUserProfilesData) {
      const profileData = allUserProfilesData[userId];
      const profile = this._initializeUserProfile(userId);
      profile.classCounts = new Map(profileData.classCounts || []);
      profile.totalInteractions = profileData.totalInteractions || 0;
      profile.preferences = new Map(profileData.preferences || []);

      if (profileData.featureCounts) {
        for (const [classKey, features] of profileData.featureCounts) {
          profile.featureCounts.set(classKey, new Map(features));
        }
      }
      this.userProfiles.set(userId, profile);
    }
    this.isInitialized = true;
    console.log(`✅ BayesianPersonalizationAI初期化完了。${this.userProfiles.size}件のプロファイルを読み込みました。`);
  }

  /**
   * ユーザープロファイルの初期構造を定義します。
   * @param {string} userId - ユーザーID
   * @returns {object} 新しいユーザープロファイルオブジェクト
   */
  _initializeUserProfile(userId) {
    return {
      userId: userId,
      classCounts: new Map(), // Map<class: string, count: number>
      featureCounts: new Map(), // Map<class: string, Map<feature: string, count: number>>
      totalInteractions: 0, // Total number of interactions learned
      preferences: new Map(), // User-specific preferences beyond Naive Bayes
    };
  }

  /**
   * ユーザーの行動を学習し、プロファイルを更新します。
   * @param {string} userId - ユーザーID
   * @param {object} interaction - ユーザーのインタラクションデータ
   *   (例: { class: 'technical', features: { keyword_AI: 1, sentiment_positive: 1, rating: 1 } })
   *   'class' はコンテンツのカテゴリや種類、'features' はそのコンテンツの特徴を表すキーバリューペア
   */
  async learnUserBehavior(userId, interaction) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, this._initializeUserProfile(userId));
    }
    const userProfile = this.userProfiles.get(userId);

    const { class: interactionClass, features } = interaction;

    // Update class counts
    userProfile.classCounts.set(interactionClass, (userProfile.classCounts.get(interactionClass) || 0) + 1);
    userProfile.totalInteractions++;

    // Update feature counts for the given class
    if (!userProfile.featureCounts.has(interactionClass)) {
      userProfile.featureCounts.set(interactionClass, new Map());
    }
    const classFeatures = userProfile.featureCounts.get(interactionClass);

    for (const featureKey in features) {
      if (features[featureKey]) { // Assuming features are boolean or count-based
        classFeatures.set(featureKey, (classFeatures.get(featureKey) || 0) + 1);
      }
    }
    // 学習後にプロファイルを保存
    await this._saveUserProfile(userId);
  }

  /**
   * ナイーブベイズの事後確率を計算します。
   * P(Class | Features) = P(Class) * P(Feature1 | Class) * P(Feature2 | Class) * ...
   * @param {string} userId - ユーザーID
   * @param {string} targetClass - 評価するクラス (例: 'technical')
   * @param {object} contentFeatures - コンテンツの特徴 (例: { keyword_AI: 1, sentiment_positive: 1 })
   * @returns {number} 事後確率 (対数確率)
   */
  calculateBayesianScore(userId, targetClass, contentFeatures) {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      return -Infinity; // User profile not found
    }

    const classCount = userProfile.classCounts.get(targetClass) || 0;
    if (classCount === 0) {
      return -Infinity; // Class not seen for this user
    }

    // Prior probability P(Class)
    let score = Math.log(classCount / userProfile.totalInteractions);

    const classFeatureCounts = userProfile.featureCounts.get(targetClass);
    const totalFeaturesInClass = classFeatureCounts ? Array.from(classFeatureCounts.values()).reduce((sum, count) => sum + count, 0) : 0;
    const vocabularySize = this._getUniqueFeatureCount(userId); // Total unique features across all classes for this user

    for (const featureKey in contentFeatures) {
      if (contentFeatures[featureKey]) {
        const featureCountInClass = (classFeatureCounts && classFeatureCounts.get(featureKey)) || 0;
        // P(Feature | Class) with Laplace smoothing
        const likelihood = (featureCountInClass + 1) / (totalFeaturesInClass + vocabularySize);
        score += Math.log(likelihood);
      }
    }
    return score;
  }

  /**
   * 全てのクラスでユニークな特徴の数を取得します (ラプラススムージング用)。
   * @param {string} userId - ユーザーID
   * @returns {number} ユニークな特徴の総数
   */
  _getUniqueFeatureCount(userId) {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) return 0;

    const uniqueFeatures = new Set();
    for (const classMap of userProfile.featureCounts.values()) {
      for (const featureKey of classMap.keys()) {
        uniqueFeatures.add(featureKey);
      }
    }
    return uniqueFeatures.size;
  }

  /**
   * ユーザープロファイルに基づいてコンテンツを適応させます。
   * @param {string} userId - ユーザーID
   * @param {object} content - 適応させるコンテンツ (例: { text: '...', features: { category_technical: 1, keyword_AI: 1 } })
   *   'content' オブジェクトは、分類に使用する 'features' プロパティを持つことを想定
   * @returns {object} 適応されたコンテンツ (最適なカテゴリとスコアが付与される)
   */
  async adaptForUser(userId, content) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      console.warn(`⚠️ ユーザープロファイルが見つかりません: ${userId}。一般的な適応を適用します。`);
      return { ...content, adaptedCategory: 'general', adaptationScore: 0 };
    }

    if (!content || !content.features) {
      return { ...content, adaptedCategory: 'general', adaptationScore: 0 }; // Cannot adapt without features
    }

    let bestScore = -Infinity;
    let bestCategory = 'general'; // Default category

    // Iterate through all known classes (categories) for this user
    for (const knownClass of userProfile.classCounts.keys()) {
      const score = this.calculateBayesianScore(userId, knownClass, content.features);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = knownClass;
      }
    }

    return { ...content, adaptedCategory: bestCategory, adaptationScore: bestScore };
  }

  /**
   * ユーザープロファイルを永続化します。
   * @param {string} userId - ユーザーID
   */
  async _saveUserProfile(userId) {
    const userProfile = this.userProfiles.get(userId);
    if (userProfile) {
      // MapをJSONに変換可能な形式に変換
      const profileToSave = {
        userId: userProfile.userId,
        classCounts: Array.from(userProfile.classCounts.entries()),
        featureCounts: Array.from(userProfile.featureCounts.entries()).map(([key, value]) => [key, Array.from(value.entries())]),
        totalInteractions: userProfile.totalInteractions,
        preferences: Array.from(userProfile.preferences.entries()),
      };
      await this.persistentLearningDB.saveUserProfile(userId, profileToSave);
      console.log(`💾 ユーザープロファイル保存完了: ${userId}`);
    }
  }

  /**
   * ユーザープロファイルを削除します。
   * @param {string} userId - ユーザーID
   */
  async deleteUserProfile(userId) {
    this.userProfiles.delete(userId);
    await this.persistentLearningDB.deleteUserProfile(userId);
    console.log(`🗑️ ユーザープロファイル削除完了: ${userId}`);
  }

  /**
   * 全てのユーザープロファイルをクリアします。
   */
  async clearAllUserProfiles() {
    this.userProfiles.clear();
    await this.persistentLearningDB.clearAllUserProfiles();
    console.log('🗑️ 全てのユーザープロファイルをクリアしました。');
  }
}
