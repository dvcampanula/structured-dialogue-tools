import { MultiArmedBanditVocabularyAI } from '../multi-armed-bandit-vocabulary.js';
import { jest } from '@jest/globals';

describe('MultiArmedBanditVocabularyAI', () => {
  let banditAI;
  let mockPersistentLearningDB;

  beforeEach(() => {
    // 各テストの前にモックをリセット
    mockPersistentLearningDB = {
      loadBanditData: jest.fn(),
      saveBanditData: jest.fn(),
    };

    banditAI = new MultiArmedBanditVocabularyAI(mockPersistentLearningDB);
  });

  afterEach(() => {
    // モックのリセットはbeforeEachで行うので、ここでは不要
  });

  test('初期化時に既存データがロードされるべき', async () => {
    const mockData = {
      vocabularyStats: [['word1', { rewards: 10, selections: 5 }]],
      totalSelections: 5,
    };
    mockPersistentLearningDB.loadBanditData.mockResolvedValue(mockData);

    await banditAI.initialize();

    expect(mockPersistentLearningDB.loadBanditData).toHaveBeenCalledTimes(1);
    expect(banditAI.getVocabularyStats().get('word1')).toEqual({ rewards: 10, selections: 5 });
    expect(banditAI.totalSelections).toBe(5);
  });

  test('未選択の語彙は高いUCB値を持つべき', async () => {
    mockPersistentLearningDB.loadBanditData.mockResolvedValue(null); // データがない状態をモック
    await banditAI.initialize();
    const ucb = banditAI.calculateUCBValue('newWord');
    expect(ucb).toBe(Infinity);
  });

  test('語彙が選択された際に統計が更新されるべき', async () => {
    mockPersistentLearningDB.loadBanditData.mockResolvedValue(null); // データがない状態をモック
    await banditAI.initialize();
    await banditAI.selectVocabulary(['testWord']);

    const stats = banditAI.getVocabularyStats().get('testWord');
    expect(stats.selections).toBe(1);
    expect(banditAI.totalSelections).toBe(1);
    expect(mockPersistentLearningDB.saveBanditData).toHaveBeenCalledTimes(1);
  });

  test('ユーザーフィードバックに基づいて報酬が更新されるべき', async () => {
    mockPersistentLearningDB.loadBanditData.mockResolvedValue(null); // データがない状態をモック
    await banditAI.initialize();
    await banditAI.selectVocabulary(['feedbackWord']); // 選択して統計を初期化
    await banditAI.updateRewards('feedbackWord', 0.8);

    const stats = banditAI.getVocabularyStats().get('feedbackWord');
    expect(stats.rewards).toBeCloseTo(0.8);
    expect(mockPersistentLearningDB.saveBanditData).toHaveBeenCalledTimes(2); // selectとupdateで2回
  });

  test('UCB値に基づいて最適な語彙が選択されるべき', async () => {
    mockPersistentLearningDB.loadBanditData.mockResolvedValue(null); // データがない状態をモック
    await banditAI.initialize();

    // 統計をセットアップ
    await banditAI.selectVocabulary(['wordA']); // selections: 1, rewards: 0
    await banditAI.updateRewards('wordA', 0.1); // rewards: 0.1

    await banditAI.selectVocabulary(['wordB']); // selections: 1, rewards: 0
    await banditAI.updateRewards('wordB', 0.9); // rewards: 0.9

    // wordCは未選択なのでUCBはInfinity
    const selected = await banditAI.selectVocabulary(['wordA', 'wordB', 'wordC']);
    expect(selected).toBe('wordC'); // 未選択の語彙が優先される

    // wordCが選択されたので、次にwordAとwordBのUCBを比較
    // calculateUCBValueを直接呼び出して確認
    const ucbA = banditAI.calculateUCBValue('wordA');
    const ucbB = banditAI.calculateUCBValue('wordB');

    // wordBの方が平均報酬が高いので、UCB値も高くなるはず
    // ただし、探索項もあるので厳密な値は計算が複雑。ここではUCB値の大小関係をテスト
    // 厳密なUCB値の比較は、探索項が十分に小さくなるか、報酬の差が大きい場合に有効
    // このテストでは、UCB値の計算ロジックが正しく、より良い報酬の語彙が最終的に選ばれることを確認する
    // 一旦、UCB値の計算がエラーなく行われることを確認し、より複雑なシナリオは別途検討
    expect(ucbA).toBeLessThan(ucbB); // wordBの方が報酬が高いので、UCBも高くなるはず

    // 次の選択でwordBが選ばれることを期待
    const nextSelected = await banditAI.selectVocabulary(['wordA', 'wordB']);
    expect(nextSelected).toBe('wordB');
  });
});
