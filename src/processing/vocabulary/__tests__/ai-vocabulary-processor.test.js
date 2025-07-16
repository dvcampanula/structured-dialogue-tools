import { AIVocabularyProcessor } from '../ai-vocabulary-processor.js';
import { jest } from '@jest/globals';

// 依存関係のモック
const mockMultiArmedBanditVocabularyAI = {
  initialize: jest.fn(),
  selectVocabulary: jest.fn(),
  updateRewards: jest.fn(),
};

const mockNgramContextPatternAI = {
  initialize: jest.fn(),
  predictContext: jest.fn(),
  learnPattern: jest.fn(),
};

const mockBayesianPersonalizationAI = {
  initialize: jest.fn(),
  adaptForUser: jest.fn(),
  learnUserBehavior: jest.fn(),
};

const mockDynamicRelationshipLearner = {
  initializeLearner: jest.fn(),
  analyze: jest.fn(),
  learnFromFeedback: jest.fn(),
  getLearningStats: jest.fn(),
  getUserRelationsData: jest.fn().mockReturnValue({}), // Added for AIVocabularyProcessor
};

const mockQualityPredictionModel = {
  initializeAIModules: jest.fn(),
  predictQuality: jest.fn(),
};

const mockEnhancedHybridLanguageProcessor = {
  initialize: jest.fn(),
  processText: jest.fn(),
};

const mockDictionaryDB = {
  initialize: jest.fn(),
  lookup: jest.fn(),
};

describe('AIVocabularyProcessor', () => {
  let processor;

  beforeEach(async () => {
    // 各モックのリセット
    mockMultiArmedBanditVocabularyAI.initialize.mockReset().mockResolvedValue(undefined);
    mockMultiArmedBanditVocabularyAI.selectVocabulary.mockReset().mockResolvedValue('optimizedWord');
    mockMultiArmedBanditVocabularyAI.updateRewards.mockReset().mockResolvedValue(undefined);

    mockNgramContextPatternAI.initialize.mockReset().mockResolvedValue(undefined);
    mockNgramContextPatternAI.predictContext.mockReset().mockResolvedValue({
      predictedCategory: 'general',
      confidence: 0.7,
    });
    mockNgramContextPatternAI.learnPattern.mockReset().mockResolvedValue(undefined);

    mockBayesianPersonalizationAI.initialize.mockReset().mockResolvedValue(undefined);
    mockBayesianPersonalizationAI.adaptForUser.mockReset().mockResolvedValue({
      adaptedCategory: 'adapted',
      adaptationScore: 0.9,
    });
    mockBayesianPersonalizationAI.learnUserBehavior.mockReset().mockResolvedValue(undefined);

    mockDynamicRelationshipLearner.initializeLearner.mockReset().mockResolvedValue(undefined);
    mockDynamicRelationshipLearner.analyze.mockReset().mockResolvedValue(undefined);
    mockDynamicRelationshipLearner.learnFromFeedback.mockReset().mockResolvedValue(undefined);
    mockDynamicRelationshipLearner.getLearningStats.mockReset().mockReturnValue({ totalTerms: 10, totalRelations: 20 });

    mockQualityPredictionModel.initializeAIModules.mockReset().mockResolvedValue(undefined);
    mockQualityPredictionModel.predictQuality.mockReset().mockResolvedValue({
      qualityScore: 0.85,
      confidence: 0.9,
      grade: 'excellent',
      features: {
        lengthScore: 0.7,
        frequencyScore: 0.6,
        relevanceScore: 0.8,
        noiseScore: 0.2,
        structureScore: 0.9,
        contextDensity: 0.7,
        semanticCoherence: 0.8,
        vocabularyDiversity: 0.6,
        statisticalComplexity: 0.75
      },
      modelUsed: 'linear_regression',
      predictionAccuracy: 0.9,
    });

    mockEnhancedHybridLanguageProcessor.initialize.mockReset().mockResolvedValue(undefined);
    mockEnhancedHybridLanguageProcessor.processText.mockReset().mockResolvedValue({
      tokens: [
        { surface: 'test', pos: '名詞' },
        { surface: 'word', pos: '名詞' },
      ],
    });

    mockDictionaryDB.initialize.mockReset().mockResolvedValue(undefined);
    mockDictionaryDB.lookup.mockReset().mockResolvedValue({
      word: 'test',
      reading: 'テスト',
      definitions: ['テスト'],
    });

    // AIVocabularyProcessorのコンストラクタにモックを渡す
    processor = new AIVocabularyProcessor(
      mockMultiArmedBanditVocabularyAI,
      mockNgramContextPatternAI,
      mockBayesianPersonalizationAI,
      mockDynamicRelationshipLearner,
      mockQualityPredictionModel,
      mockEnhancedHybridLanguageProcessor,
      mockDictionaryDB
    );
    await processor.initialize('testUser'); // Added initialization
  });

  afterEach(() => {
    // Jestのタイマーをクリア
    jest.clearAllTimers();
    // 依存するAIモジュールのタイマーをクリア
    // DynamicRelationshipLearnerがsetIntervalを使用しているため、そのタイマーをクリア
    if (mockDynamicRelationshipLearner.autoSaveInterval) {
      clearInterval(mockDynamicRelationshipLearner.autoSaveInterval);
      mockDynamicRelationshipLearner.autoSaveInterval = null; // 参照をクリア
    }
  });

  test('初期化時にすべての依存AIモジュールが初期化されるべき', async () => {
    await processor.initialize('testUser');

    expect(mockMultiArmedBanditVocabularyAI.initialize).toHaveBeenCalledTimes(1);
    expect(mockNgramContextPatternAI.initialize).toHaveBeenCalledTimes(1);
    expect(mockBayesianPersonalizationAI.initialize).toHaveBeenCalledTimes(1);
    expect(mockDynamicRelationshipLearner.initializeLearner).toHaveBeenCalledTimes(1);
    expect(mockQualityPredictionModel.initializeAIModules).toHaveBeenCalledTimes(1);
    expect(mockEnhancedHybridLanguageProcessor.initialize).toHaveBeenCalledTimes(1);
    expect(mockDictionaryDB.initialize).toHaveBeenCalledTimes(1);
    expect(processor.isInitialized).toBe(true);
  });

  test('テキスト処理がすべてのAIモジュールを連携させるべき', async () => {
    await processor.initialize('testUser'); // プロセッサを初期化
    const text = 'これはテストの文章です';
    const userId = 'user123';

    const result = await processor.processText(text, userId);

    expect(mockEnhancedHybridLanguageProcessor.processText).toHaveBeenCalledWith(text);
    expect(mockDictionaryDB.lookup).toHaveBeenCalledTimes(2); // test, word
    expect(mockMultiArmedBanditVocabularyAI.selectVocabulary).toHaveBeenCalledTimes(1);
    expect(mockNgramContextPatternAI.predictContext).toHaveBeenCalledWith(text);
    expect(mockBayesianPersonalizationAI.adaptForUser).toHaveBeenCalledTimes(1);
    expect(mockDynamicRelationshipLearner.analyze).toHaveBeenCalledWith(text, 'optimizedWord');
    expect(mockQualityPredictionModel.predictQuality).toHaveBeenCalledTimes(1);

    expect(result.success).toBe(true);
    expect(result.originalText).toBe(text);
    expect(result.optimizedVocabulary).toBe('optimizedWord');
    expect(result.predictedContext.confidence).toBe(0.7);
    expect(result.adaptedContent.adaptationScore).toBe(0.9);
    expect(result.cooccurrenceAnalysis.learningStats.totalTerms).toBe(10);
    expect(result.qualityPrediction.qualityScore).toBe(0.85);
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
    expect(result.processedTokens).toHaveLength(2);
    expect(result.dictionaryLookups).toHaveLength(2);
  });

  test('フィードバック伝播がすべての関連AIモジュールを更新すべき', async () => {
    await processor.initialize('testUser'); // プロセッサを初期化
    
    // propagateFeedback内でprocessTextが呼ばれるため、processTextの戻り値を上書き設定
    const mockProcessTextResult = {
      success: true,
      originalText: 'これはフィードバックの文脈です',
      processedTokens: [
        { surface: 'フィードバック', pos: '名詞' },
        { surface: '文脈', pos: '名詞' }
      ],
      dictionaryLookups: [],
      optimizedVocabulary: 'フィードバック',
      predictedContext: { predictedCategory: 'general', confidence: 0.7 },
      adaptedContent: { adaptedCategory: 'adapted', adaptationScore: 0.9 },
      cooccurrenceAnalysis: { totalTerms: 2, totalRelations: 1 },
      qualityPrediction: { qualityScore: 0.8, confidence: 0.8, grade: 'good' },
      processingTime: 1,
      enhancedTerms: [
        { term: 'フィードバック' },
        { term: '文脈' }
      ]
    };
    
    // processTextのモックを一時的に上書き
    const originalProcessText = processor.processText;
    processor.processText = jest.fn().mockResolvedValue(mockProcessTextResult);
    
    const userId = 'user123';
    const vocabulary = 'feedbackWord';
    const rating = 0.8;
    const contextText = 'これはフィードバックの文脈です';

    await processor.propagateFeedback(userId, vocabulary, rating, contextText);

    expect(mockMultiArmedBanditVocabularyAI.updateRewards).toHaveBeenCalledWith(vocabulary, rating);
    expect(mockNgramContextPatternAI.learnPattern).toHaveBeenCalledTimes(1);
    expect(mockBayesianPersonalizationAI.learnUserBehavior).toHaveBeenCalledTimes(1);
    expect(mockDynamicRelationshipLearner.learnFromFeedback).toHaveBeenCalledWith(vocabulary, rating, contextText);
    
    // 元のメソッドを復元
    processor.processText = originalProcessText;
  });

  test('テキスト処理中にエラーが発生した場合、適切なフォールバックを返すはず', async () => {
    await processor.initialize('testUser');
    mockEnhancedHybridLanguageProcessor.processText.mockRejectedValue(new Error('解析エラー'));

    const result = await processor.processText('エラーテスト', 'userError');

    expect(result.success).toBe(false);
    expect(result.error).toBe('解析エラー');
    expect(result.optimizedVocabulary).toBeNull();
    expect(result.predictedContext).toBeNull();
    expect(result.adaptedContent).toBeNull();
    expect(result.cooccurrenceAnalysis).toBeNull();
    expect(result.qualityPrediction).toBeNull();
  });
});