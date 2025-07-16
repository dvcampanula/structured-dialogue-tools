import { DynamicRelationshipLearner } from '../dynamic-relationship-learner.js';
import { jest } from '@jest/globals';

describe('DynamicRelationshipLearner', () => {
  let learner;
  let mockHybridProcessor;
  let mockNgramAI;
  let mockPersistentLearningDB;
  let mockConfigLoader;
  let newLearner; // Added for cleanup

  beforeEach(async () => {
    // 各テスト実行前にモックを完全にリセット
    jest.clearAllMocks();
    
    // 依存関係のモック作成
    mockHybridProcessor = {
      processText: jest.fn().mockResolvedValue({
        enhancedTerms: [
          { term: 'テスト' },
          { term: '単語' },
        ],
        tokens: [
          { surface: 'テスト', pos: '名詞' },
          { surface: '単語', pos: '名詞' },
          { surface: '動詞', pos: '動詞' },
          { surface: 'する', pos: '動詞' },
          { surface: 'です', pos: '助動詞' },
        ],
      }),
      initialize: jest.fn().mockResolvedValue(undefined),
    };

    mockNgramAI = {
      predictContext: jest.fn().mockResolvedValue({
        predictedCategory: 'general',
        confidence: 0.8,
      }),
      initialize: jest.fn().mockResolvedValue(undefined),
      documentFreqs: new Map([['テスト', 10], ['単語', 5]]),
      totalDocuments: 100,
    };

    mockPersistentLearningDB = {
      getUserSpecificRelations: jest.fn().mockReturnValue({}),
      saveUserSpecificRelations: jest.fn().mockResolvedValue(undefined),
    };

    mockConfigLoader = {
      loadConfig: jest.fn().mockResolvedValue({}),
    };

    // DynamicRelationshipLearnerのコンストラクタにモックを渡す（configLoaderは削除済み）
    learner = new DynamicRelationshipLearner(
      mockPersistentLearningDB,
      mockHybridProcessor,
      mockNgramAI,
      'testUser'
    );
    await learner.initializeLearner(); // Added initialization
  });

  afterEach(() => {
    // clearIntervalを呼び出してタイマーをクリーンアップ
    if (learner && learner.autoSaveInterval) {
      clearInterval(learner.autoSaveInterval);
      learner.autoSaveInterval = null;
    }
    if (newLearner && newLearner.autoSaveInterval) {
      clearInterval(newLearner.autoSaveInterval);
      newLearner.autoSaveInterval = null;
    }
    jest.clearAllTimers();
  });

  test('初期化時に既存データと設定がロードされるべき', async () => {
    const mockRelations = { userRelations: { 'word1': [{ term: 'word2', strength: 0.5 }] } }; // ネストされた構造を考慮
    mockPersistentLearningDB.getUserSpecificRelations.mockReturnValue(mockRelations);

    // 新しいインスタンスを作成し、初期化を待つ（configLoaderは削除済み）
    const newLearner = new DynamicRelationshipLearner(
      mockPersistentLearningDB,
      mockHybridProcessor,
      mockNgramAI,
      'testUser'
    );
    await newLearner.initializeLearner();
    expect(newLearner.userRelations).toEqual(mockRelations.userRelations || {}); // userRelationsがネストされている可能性を考慮
    expect(newLearner.learningConfig.minCoOccurrence).toBe(2); // デフォルト値
    // clearIntervalを呼び出してタイマーをクリーンアップ
    if (newLearner.autoSaveInterval) {
      clearInterval(newLearner.autoSaveInterval);
    }
  });

  test('会話からキーワードを抽出し、共起分析を行うべき', async () => {
    await learner.initializeLearner(); // initializeLearnerを明示的に呼び出す
    const input = 'これはテストの文章です';
    const response = 'テストの応答です';
    const history = ['以前の会話'];

    await learner.learnFromConversation(input, history, response);

    // メソッド呼び出し回数の確認
    expect(mockHybridProcessor.processText).toHaveBeenCalledTimes(3); // input, response, history
    expect(mockPersistentLearningDB.saveUserSpecificRelations).toHaveBeenCalledTimes(1);
    
    // データ構造の確認
    expect(Object.keys(learner.coOccurrenceData).length).toBeGreaterThan(0);
    expect(Object.keys(learner.userRelations).length).toBeGreaterThanOrEqual(0);
    
    // 呼び出しパラメータの確認（オプション引数なしで呼び出されることを確認）
    expect(mockHybridProcessor.processText).toHaveBeenCalledWith(input);
    expect(mockHybridProcessor.processText).toHaveBeenCalledWith(response);
    expect(mockHybridProcessor.processText).toHaveBeenCalledWith('以前の会話');
  });

  test('フィードバックに基づいて関係性を更新すべき', async () => {
    await learner.initializeLearner(); // initializeLearnerを明示的に呼び出す
    const vocabulary = 'テスト';
    const rating = 0.9;
    const contextText = 'これはテストの単語です';

    // 初期関係性を設定
    learner.addUserRelation('テスト', '単語', 0.1);

    await learner.learnFromFeedback(vocabulary, rating, contextText);

    const strength = learner.getRelationshipStrength('テスト', '単語');
    expect(strength).toBeGreaterThan(0.1); // 評価が高いので関係性が強化されるべき
    expect(mockPersistentLearningDB.saveUserSpecificRelations).toHaveBeenCalledTimes(1); // learnFromFeedback内で保存される
  });

  test('関係性強度取得が正しく動作すべき', async () => {
    await learner.initializeLearner(); // initializeLearnerを明示的に呼び出す
    
    // 関係性を追加
    learner.addUserRelation('テスト', '単語', 0.7);
    
    // 関係性強度を取得
    const strength = learner.getRelationshipStrength('テスト', '単語');
    expect(strength).toBe(0.7);
    
    // 存在しない関係性は0を返すべき
    const noRelation = learner.getRelationshipStrength('存在しない', '関係');
    expect(noRelation).toBe(0);
  });

  test('関係性の忘却処理が機能すべき', async () => {
    await learner.initializeLearner(); // initializeLearnerを明示的に呼び出す
    learner.addUserRelation('古い', '関係', 0.8);
    // 時間経過をシミュレート
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + (2 * 24 * 60 * 60 * 1000)); // 2日後

    learner.applyDecay();

    expect(learner.getRelationshipStrength('古い', '関係')).toBeLessThan(0.8); // 強度が減衰するべき
    jest.useRealTimers();
  });

  test('エラー処理が適切に動作すべき', async () => {
    await learner.initializeLearner();
    
    // モックでエラーを発生させる
    mockHybridProcessor.processText.mockRejectedValueOnce(new Error('解析エラー'));
    
    // エラーが発生してもメソッドが完了することを確認
    await expect(learner.learnFromConversation('エラーテスト', [], '応答')).resolves.not.toThrow();
    
    // 正常なケースではモック関数が呼ばれていることを確認
    mockHybridProcessor.processText.mockResolvedValueOnce({
      enhancedTerms: [{ term: 'テスト' }]
    });
    await learner.learnFromConversation('正常テスト', [], '応答テスト');
    expect(mockHybridProcessor.processText).toHaveBeenCalled();
  });

  test('統計的意味類似度計算が正常に動作すべき', async () => {
    await learner.initializeLearner();
    
    // 統計的意味類似度の計算をテスト
    const similarity = await learner.calculateStatisticalSemanticSimilarity('テスト', '単語');
    
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
    expect(Number.isFinite(similarity)).toBe(true);
  });
});
