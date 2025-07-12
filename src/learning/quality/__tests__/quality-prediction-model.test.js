import { QualityPredictionModel } from '../quality-prediction-model.js';
import { jest } from '@jest/globals';

// 依存関係のモック
const mockPersistentLearningDB = {
  loadQualityPredictionModel: jest.fn(),
  saveQualityPredictionModel: jest.fn(),
  loadImprovementPatterns: jest.fn(),
  saveImprovementPatterns: jest.fn(),
};

const mockNgramAI = {
  predictContext: jest.fn(),
  initialize: jest.fn(),
};

const mockCooccurrenceLearner = {
  getUserRelations: jest.fn(),
  getRelationshipStrength: jest.fn(),
  initializeLearner: jest.fn(),
  calculateStatisticalSemanticSimilarity: jest.fn(),
  extractKeywords: jest.fn(),
  autoSaveInterval: null, // autoSaveIntervalプロパティを追加
};

describe('QualityPredictionModel', () => {
  let qualityModel;

  beforeEach(() => {
    // 各モックのリセットと初期設定
    mockPersistentLearningDB.loadQualityPredictionModel.mockReset().mockResolvedValue(null);
    mockPersistentLearningDB.saveQualityPredictionModel.mockReset().mockResolvedValue(undefined);
    mockPersistentLearningDB.loadImprovementPatterns.mockReset().mockResolvedValue(null);
    mockPersistentLearningDB.saveImprovementPatterns.mockReset().mockResolvedValue(undefined);

    mockNgramAI.predictContext.mockReset().mockResolvedValue({
      predictedCategory: 'general',
      confidence: 0.5,
    });
    mockNgramAI.initialize.mockReset().mockResolvedValue(undefined);

    mockCooccurrenceLearner.getUserRelations.mockReset().mockReturnValue([]);
    mockCooccurrenceLearner.getRelationshipStrength.mockReset().mockReturnValue(0);
    mockCooccurrenceLearner.initializeLearner.mockReset().mockResolvedValue(undefined);
    mockCooccurrenceLearner.calculateStatisticalSemanticSimilarity.mockReset().mockResolvedValue(0.5);
    mockCooccurrenceLearner.extractKeywords.mockReset().mockResolvedValue(['テスト', '文章']);
    mockCooccurrenceLearner.autoSaveInterval = null; // autoSaveIntervalをリセット

    qualityModel = new QualityPredictionModel(mockPersistentLearningDB, mockNgramAI, mockCooccurrenceLearner);
    // AIモジュールの初期化はテストケース内で明示的に呼び出す
  });

  afterEach(() => {
    // Jestのタイマーをクリア
    jest.clearAllTimers();
    // cooccurrenceLearnerのタイマーをクリア
    if (qualityModel.cooccurrenceLearner && qualityModel.cooccurrenceLearner.autoSaveInterval) {
      clearInterval(qualityModel.cooccurrenceLearner.autoSaveInterval);
    }
  });

  test('初期化時にAIモジュールとモデルがロードされるべき', async () => {
    const mockModelData = {
      regressionWeights: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], // バイアス項含む
      predictionAccuracy: 0.85,
      isModelTrained: true,
    };
    mockPersistentLearningDB.loadQualityPredictionModel.mockResolvedValue(mockModelData);

    const mockImprovementPatterns = [['pattern1', { issue: 'test', suggestion: 'fix' }]];
    mockPersistentLearningDB.loadImprovementPatterns.mockResolvedValue(mockImprovementPatterns);

    // 依存するAIモジュールをQualityPredictionModelのコンストラクタに渡す
    qualityModel = new QualityPredictionModel(mockPersistentLearningDB, mockNgramAI, mockCooccurrenceLearner);
    await qualityModel.initializeAIModules();

    expect(mockPersistentLearningDB.loadQualityPredictionModel).toHaveBeenCalledTimes(1);
    expect(mockPersistentLearningDB.loadImprovementPatterns).toHaveBeenCalledTimes(1);
    expect(mockNgramAI.initialize).toHaveBeenCalledTimes(1);
    expect(mockCooccurrenceLearner.initializeLearner).toHaveBeenCalledTimes(1);
    expect(qualityModel.isAIModulesInitialized).toBe(true);
    expect(qualityModel.regressionWeights.length).toBeGreaterThan(0);
    expect(qualityModel.predictionAccuracy).toBe(0.85);
    expect(qualityModel.isModelTrained).toBe(true);
    expect(qualityModel.improvementPatterns.size).toBe(1);
  });

  test('訓練データが不十分な場合、モデル訓練はエラーを投げるべき', async () => {
    await expect(qualityModel.trainModel([])).rejects.toThrow('訓練データが不十分です（最低3件必要）');
    await expect(qualityModel.trainModel([{ content: 'a', qualityScore: 0.5 }])).rejects.toThrow('訓練データが不十分です（最低3件必要）');
  });

  test('線形回帰モデルを正しく訓練すべき', async () => {
    await qualityModel.initializeAIModules(); // 依存AIモジュールを初期化
    const trainingData = [
      { content: '短い文章', qualityScore: 0.2 },
      { content: 'これはテストの長い文章です', qualityScore: 0.8 },
      { content: '非常に長い、複雑な、そして関連性の高い技術的な文章です', qualityScore: 0.95 },
    ];

    const result = await qualityModel.trainModel(trainingData);

    expect(result.accuracy).toBeGreaterThan(0); // 精度が0より大きいことを確認
    expect(result.weights.length).toBe(qualityModel.featureNames.length + 1); // バイアス項含む
    expect(qualityModel.isModelTrained).toBe(true);
    expect(mockPersistentLearningDB.saveQualityPredictionModel).toHaveBeenCalledTimes(1);
  });

  test('コンテンツの品質を予測すべき', async () => {
    await qualityModel.initializeAIModules(); // 依存AIモジュールを初期化
    // モデルを訓練しておく
    const trainingData = [
      { content: '短い文章', qualityScore: 0.2 },
      { content: 'これはテストの長い文章です', qualityScore: 0.8 },
      { content: '非常に長い、複雑な、そして関連性の高い技術的な文章です', qualityScore: 0.95 },
    ];
    await qualityModel.trainModel(trainingData);

    const contentToPredict = { text: 'これはテストの文章です' };
    const prediction = await qualityModel.predictQuality(contentToPredict);

    expect(prediction.qualityScore).toBeGreaterThanOrEqual(0);
    expect(prediction.qualityScore).toBeLessThanOrEqual(1);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.grade).toMatch(/^(excellent|good|acceptable|poor)$/);
    expect(Object.keys(prediction.features).length).toBe(qualityModel.featureNames.length);
  });

  test('改善提案を生成すべき', async () => {
    await qualityModel.initializeAIModules(); // 依存AIモジュールを初期化
    // モデルを訓練しておく
    const trainingData = [
      { content: '短い文章', qualityScore: 0.2 },
      { content: 'これはテストの長い文章です', qualityScore: 0.8 },
      { content: '非常に長い、複雑な、そして関連性の高い技術的な文章です', qualityScore: 0.95 },
    ];
    await qualityModel.trainModel(trainingData);

    const contentToImprove = { text: '短い単語' };
    const improvements = await qualityModel.suggestImprovements(contentToImprove);

    expect(improvements.length).toBeGreaterThan(0);
    expect(improvements[0]).toHaveProperty('suggestion');
    expect(improvements[0]).toHaveProperty('priority');
  });

  test('フィードバックから改善パターンを学習すべき', async () => {
    await qualityModel.initializeAIModules(); // 依存AIモジュールを初期化
    const originalContent = { text: '元の文章' };
    const appliedSuggestion = { issue: '長さ不足', suggestion: '長くする' };
    const beforeScore = 0.3;
    const afterScore = 0.7;

    await qualityModel.learnFromFeedback(originalContent, appliedSuggestion, beforeScore, afterScore);

    expect(mockPersistentLearningDB.saveImprovementPatterns).toHaveBeenCalledTimes(1);
    expect(qualityModel.improvementPatterns.size).toBeGreaterThan(0);
  });

  test('モデルが訓練されていない場合、フォールバック品質予測を使用すべき', async () => {
    // initializeAIModulesは呼ばない
    const contentToPredict = { text: 'テスト' };
    const prediction = await qualityModel.predictQuality(contentToPredict);

    expect(prediction.modelUsed).toBe('statistical_fallback');
    expect(prediction.qualityScore).toBeGreaterThanOrEqual(0);
    expect(prediction.qualityScore).toBeLessThanOrEqual(1);
  });
});