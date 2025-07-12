import { DynamicRelationshipLearner } from '../dynamic-relationship-learner.js';
import { jest } from '@jest/globals';

describe('DynamicRelationshipLearner', () => {
  let learner;
  let mockHybridProcessor;
  let mockNgramAI;
  let mockPersistentLearningDB;
  let mockConfigLoader;

  beforeEach(() => {
    // 各テスト実行前にモックを完全にリセット
    jest.clearAllMocks();
    
    // 依存関係のモック作成
    mockHybridProcessor = {
      processText: jest.fn().mockResolvedValue({
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

    // DynamicRelationshipLearnerのコンストラクタにモックを渡す
    learner = new DynamicRelationshipLearner('testUser', {
      persistentLearningDB: mockPersistentLearningDB,
      hybridProcessor: mockHybridProcessor,
      ngramAI: mockNgramAI,
      configLoader: mockConfigLoader,
    });
  });

  afterEach(() => {
    // clearIntervalを呼び出してタイマーをクリーンアップ
    if (learner && learner.autoSaveInterval) {
      clearInterval(learner.autoSaveInterval);
    }
    jest.clearAllTimers();
  });

  test('初期化時に既存データと設定がロードされるべき', async () => {
    const mockRelations = { userRelations: { 'word1': [{ term: 'word2', strength: 0.5 }] } }; // ネストされた構造を考慮
    mockPersistentLearningDB.getUserSpecificRelations.mockReturnValue(mockRelations);
    mockConfigLoader.loadConfig.mockResolvedValue({ minCoOccurrence: 3 });

    // 新しいインスタンスを作成し、初期化を待つ
    const newLearner = new DynamicRelationshipLearner('testUser', {
      persistentLearningDB: mockPersistentLearningDB,
      hybridProcessor: mockHybridProcessor,
      ngramAI: mockNgramAI,
      configLoader: mockConfigLoader,
    });
    await newLearner.initializeLearner();

    expect(mockPersistentLearningDB.getUserSpecificRelations).toHaveBeenCalledWith('testUser');
    expect(mockConfigLoader.loadConfig).toHaveBeenCalledWith('learningConfig');
    expect(newLearner.userRelations).toEqual(mockRelations.userRelations || {}); // userRelationsがネストされている可能性を考慮
    expect(newLearner.learningConfig.minCoOccurrence).toBe(3);
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
    
    // 呼び出しパラメータの確認
    expect(mockHybridProcessor.processText).toHaveBeenCalledWith(input, { enableMeCab: true, enableGrouping: false });
    expect(mockHybridProcessor.processText).toHaveBeenCalledWith(response, { enableMeCab: true, enableGrouping: false });
    expect(mockHybridProcessor.processText).toHaveBeenCalledWith('以前の会話', { enableMeCab: true, enableGrouping: false });
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

  test('TF-IDFスコアを正しく計算すべき', async () => {
    await learner.initializeLearner(); // initializeLearnerを明示的に呼び出す
    const text = 'テスト単語';
    const keywords = await learner.extractKeywords(text);

    // モックされたNgramAIのdocumentFreqsとtotalDocumentsを使用
    const tfidfScore = await learner.calculateKeywordTFIDF(keywords, text);

    expect(tfidfScore.length).toBeGreaterThan(0);
    expect(tfidfScore[0].score).toBeGreaterThan(0);
    expect(Number.isFinite(tfidfScore[0].score)).toBe(true);
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
      tokens: [{ surface: 'テスト', pos: '名詞' }]
    });
    await learner.extractKeywords('正常テスト');
    expect(mockHybridProcessor.processText).toHaveBeenCalledWith('正常テスト', { enableMeCab: true, enableGrouping: false });
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