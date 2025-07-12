import { StatisticalResponseGenerator, ResponseStrategies } from '../statistical-response-generator.js';
import { jest } from '@jest/globals';

// 依存関係のモック
const mockAIVocabularyProcessor = {
  processText: jest.fn(),
};

const mockPersistentLearningDB = {
  loadBanditData: jest.fn(),
  saveBanditData: jest.fn(),
};

describe('StatisticalResponseGenerator', () => {
  let generator;

  beforeEach(() => {
    // 各モックのリセット
    mockAIVocabularyProcessor.processText.mockReset().mockResolvedValue({
      success: true,
      originalText: 'test',
      processedTokens: [],
      dictionaryLookups: [],
      optimizedVocabulary: 'testWord',
      predictedContext: { predictedCategory: 'general', confidence: 0.7 },
      adaptedContent: { adaptedCategory: 'adapted', adaptationScore: 0.9 },
      cooccurrenceAnalysis: { totalTerms: 10, totalRelations: 20 },
      qualityPrediction: { qualityScore: 0.8, confidence: 0.9, grade: 'excellent' },
      processingTime: 10,
    });

    mockPersistentLearningDB.loadBanditData.mockReset().mockResolvedValue(null);
    mockPersistentLearningDB.saveBanditData.mockReset().mockResolvedValue(undefined);

    generator = new StatisticalResponseGenerator(mockAIVocabularyProcessor, mockPersistentLearningDB);
    generator.initializeStrategies(); // 戦略を初期化
  });

  test('初期化時に戦略が正しく設定されるべき', () => {
    expect(generator.strategyStats.size).toBeGreaterThan(0);
    expect(generator.strategyStats.has(ResponseStrategies.NGRAM_CONTINUATION)).toBe(true);
  });

  test('応答生成がすべてのAIモジュールを連携させるべき', async () => {
    const userInput = 'こんにちは';
    const userId = 'user1';

    const result = await generator.generateResponse(userInput, userId);

    expect(mockAIVocabularyProcessor.processText).toHaveBeenCalledWith(userInput, userId);
    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.strategy).toBeDefined();
    expect(result.qualityScore).toBeDefined();
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  test('戦略選択がUCBアルゴリズムに基づいて行われるべき', async () => {
    // 特定の戦略の報酬を高く設定し、それが選択されることを確認
    generator.strategyStats.set(ResponseStrategies.PERSONAL_ADAPTATION, {
      selections: 1,
      totalReward: 100, // 非常に高い報酬
      averageReward: 100,
      lastUsed: Date.now(),
    });

    const userInput = 'パーソナルな質問';
    const userId = 'user2';

    const result = await generator.generateResponse(userInput, userId);

    expect(result.strategy).toBe(ResponseStrategies.PERSONAL_ADAPTATION);
  });

  test('品質評価と改善が応答に適用されるべき', async () => {
    // 最初のprocessText呼び出し（分析）とそれに続く評価用processText呼び出しの両方をモック
    mockAIVocabularyProcessor.processText
      .mockResolvedValueOnce({
        success: true,
        originalText: 'test',
        processedTokens: [],
        dictionaryLookups: [],
        optimizedVocabulary: 'testWord',
        predictedContext: { predictedCategory: 'general', confidence: 0.7 },
        adaptedContent: { adaptedCategory: 'adapted', adaptationScore: 0.9 },
        cooccurrenceAnalysis: { totalTerms: 10, totalRelations: 20 },
        qualityPrediction: { qualityScore: 0.1, confidence: 0.2, grade: 'poor', improvements: [] }, // 低品質
        processingTime: 10,
      })
      .mockResolvedValueOnce({
        success: true,
        qualityPrediction: { qualityScore: 0.1, confidence: 0.2, grade: 'poor', improvements: [] }, // 評価でも低品質
      });

    const userInput = '短い文章';
    const userId = 'user3';

    const result = await generator.generateResponse(userInput, userId);

    expect(result.qualityScore).toBeLessThan(0.5); // 低品質が反映される
    expect(result.response).not.toBe('短い文章'); // 改善が試みられるため、元の文章とは異なるはず
  });

  test('学習データが正しく更新されるべき', async () => {
    const userInput = '学習テスト';
    const userId = 'user4';

    const result = await generator.generateResponse(userInput, userId);

    // 使用された戦略の統計が更新されていることを確認
    const strategyStats = generator.strategyStats.get(result.strategy);
    expect(strategyStats.selections).toBeGreaterThan(0);
    expect(strategyStats.totalReward).toBeGreaterThan(0);
    expect(strategyStats.lastUsed).toBeGreaterThan(0);
  });

  test('エラー発生時にフォールバック応答を返すはず', async () => {
    mockAIVocabularyProcessor.processText.mockRejectedValue(new Error('AI処理エラー'));

    const userInput = 'エラー発生';
    const userId = 'user5';

    const result = await generator.generateResponse(userInput, userId);

    expect(result.success).toBe(false);
    expect(result.response).toContain('申し訳ございません');
    expect(result.error).toBe('5AI分析エラー: AI処理エラー'); // 実装の実際のエラーメッセージ形式に合わせる
    expect(result.strategy).toBe('fallback');
  });
});