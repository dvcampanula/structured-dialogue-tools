import { BayesianPersonalizationAI } from '../bayesian-personalization.js';
import { jest } from '@jest/globals';

describe('BayesianPersonalizationAI', () => {
  let bayesianAI;
  let mockPersistentLearningDB;

  beforeEach(() => {
    mockPersistentLearningDB = {
      loadAllUserProfiles: jest.fn().mockResolvedValue({}),
      saveUserProfile: jest.fn().mockResolvedValue(undefined),
      deleteUserProfile: jest.fn().mockResolvedValue(undefined),
      clearAllUserProfiles: jest.fn().mockResolvedValue(undefined),
    };
    bayesianAI = new BayesianPersonalizationAI(mockPersistentLearningDB);
  });

  test('初期化時に既存のユーザープロファイルがロードされるべき', async () => {
    const mockProfiles = {
      'user1': {
        userId: 'user1',
        classCounts: [['tech', 5]],
        featureCounts: [['tech', [['keyword_AI', 3]]]],
        totalInteractions: 5,
      },
    };
    mockPersistentLearningDB.loadAllUserProfiles.mockResolvedValue(mockProfiles);

    await bayesianAI.initialize();

    expect(mockPersistentLearningDB.loadAllUserProfiles).toHaveBeenCalledTimes(1);
    expect(bayesianAI.userProfiles.has('user1')).toBe(true);
    expect(bayesianAI.userProfiles.get('user1').totalInteractions).toBe(5);
  });

  test('ユーザー行動を学習し、プロファイルを更新すべき', async () => {
    await bayesianAI.initialize();
    const userId = 'testUser';
    const interaction1 = { class: 'tech', features: { keyword_AI: 1, sentiment_positive: 1 } };
    const interaction2 = { class: 'tech', features: { keyword_ML: 1 } };
    const interaction3 = { class: 'sports', features: { keyword_baseball: 1 } };

    await bayesianAI.learnUserBehavior(userId, interaction1);
    await bayesianAI.learnUserBehavior(userId, interaction2);
    await bayesianAI.learnUserBehavior(userId, interaction3);

    const userProfile = bayesianAI.userProfiles.get(userId);
    expect(userProfile.totalInteractions).toBe(3);
    expect(userProfile.classCounts.get('tech')).toBe(2);
    expect(userProfile.classCounts.get('sports')).toBe(1);
    expect(userProfile.featureCounts.get('tech').get('keyword_AI')).toBe(1);
    expect(userProfile.featureCounts.get('tech').get('keyword_ML')).toBe(1);
    expect(userProfile.featureCounts.get('sports').get('keyword_baseball')).toBe(1);
    expect(mockPersistentLearningDB.saveUserProfile).toHaveBeenCalledTimes(3);
  });

  test('ナイーブベイズの事後確率を正しく計算すべき', async () => {
    await bayesianAI.initialize();
    const userId = 'scoreUser';
    await bayesianAI.learnUserBehavior(userId, { class: 'positive', features: { good: 1, happy: 1 } });
    await bayesianAI.learnUserBehavior(userId, { class: 'positive', features: { good: 1 } });
    await bayesianAI.learnUserBehavior(userId, { class: 'negative', features: { bad: 1 } });

    const score1 = bayesianAI.calculateBayesianScore(userId, 'positive', { good: 1 });
    const score2 = bayesianAI.calculateBayesianScore(userId, 'negative', { bad: 1 });
    const score3 = bayesianAI.calculateBayesianScore(userId, 'positive', { bad: 1 }); // 負の特徴量

    expect(score1).toBeGreaterThan(score3); // goodな特徴はpositiveクラスのスコアを上げる
    expect(score2).toBeGreaterThan(score3); // badな特徴はnegativeクラスのスコアを上げる
    expect(Number.isFinite(score1)).toBe(true); // スコアは有限の数値
    expect(Number.isFinite(score2)).toBe(true); // スコアは有限の数値
  });

  test('ユーザープロファイルに基づいてコンテンツを適応すべき', async () => {
    await bayesianAI.initialize();
    const userId = 'adaptUser';
    await bayesianAI.learnUserBehavior(userId, { class: 'formal', features: { polite: 1, long_sentence: 1 } });
    await bayesianAI.learnUserBehavior(userId, { class: 'casual', features: { slang: 1, short_sentence: 1 } });

    const content1 = { text: 'Hello, how are you doing today?', features: { polite: 1 } };
    const adaptedContent1 = await bayesianAI.adaptForUser(userId, content1);
    expect(adaptedContent1.adaptedCategory).toBe('formal');
    expect(Number.isFinite(adaptedContent1.adaptationScore)).toBe(true);

    const content2 = { text: 'Yo, what\'s up?', features: { slang: 1 } };
    const adaptedContent2 = await bayesianAI.adaptForUser(userId, content2);
    expect(adaptedContent2.adaptedCategory).toBe('casual');
    expect(Number.isFinite(adaptedContent2.adaptationScore)).toBe(true);
  });

  test('ユーザープロファイルを削除すべき', async () => {
    await bayesianAI.initialize();
    const userId = 'deleteUser';
    await bayesianAI.learnUserBehavior(userId, { class: 'temp', features: {} });
    expect(bayesianAI.userProfiles.has(userId)).toBe(true);

    await bayesianAI.deleteUserProfile(userId);
    expect(bayesianAI.userProfiles.has(userId)).toBe(false);
    expect(mockPersistentLearningDB.deleteUserProfile).toHaveBeenCalledTimes(1);
  });

  test('全てのユーザープロファイルをクリアすべき', async () => {
    await bayesianAI.initialize();
    await bayesianAI.learnUserBehavior('userA', { class: 'temp', features: {} });
    await bayesianAI.learnUserBehavior('userB', { class: 'temp', features: {} });
    expect(bayesianAI.userProfiles.size).toBe(2);

    await bayesianAI.clearAllUserProfiles();
    expect(bayesianAI.userProfiles.size).toBe(0);
    expect(mockPersistentLearningDB.clearAllUserProfiles).toHaveBeenCalledTimes(1);
  });
});