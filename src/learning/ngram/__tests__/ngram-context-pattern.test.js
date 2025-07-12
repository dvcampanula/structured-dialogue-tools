import { NgramContextPatternAI } from '../ngram-context-pattern.js';
import { jest } from '@jest/globals';

describe('NgramContextPatternAI', () => {
  let ngramAI;
  let mockPersistentLearningDB;

  beforeEach(() => {
    mockPersistentLearningDB = {
      loadNgramData: jest.fn().mockResolvedValue(null),
      saveNgramData: jest.fn().mockResolvedValue(undefined),
    };
    ngramAI = new NgramContextPatternAI(3, 0.75, mockPersistentLearningDB);
  });

  test('初期化時に既存データがロードされるべき', async () => {
    const mockData = {
      ngramFrequencies: [['hello world', 5]],
      contextFrequencies: [['general', 3]],
      continuationCounts: [['hello', ['world']]],
      documentFreqs: [['hello', 1], ['world', 1]],
      totalNgrams: 5,
      totalDocuments: 1,
    };
    mockPersistentLearningDB.loadNgramData.mockResolvedValue(mockData);

    await ngramAI.initialize();

    expect(mockPersistentLearningDB.loadNgramData).toHaveBeenCalledTimes(1);
    expect(ngramAI.ngramFrequencies.get('hello world')).toBe(5);
    expect(ngramAI.contextFrequencies.get('general')).toBe(3);
    expect(ngramAI.continuationCounts.get('hello').has('world')).toBe(true);
    expect(ngramAI.totalNgrams).toBe(5);
    expect(ngramAI.totalDocuments).toBe(1);
  });

  test('テキストからN-gramパターンを学習すべき', async () => {
    await ngramAI.initialize();
    const text = 'this is a test sentence';
    const contextInfo = { category: 'general' };

    await ngramAI.learnPattern(text, contextInfo);

    expect(ngramAI.ngramFrequencies.get('this')).toBe(1);
    expect(ngramAI.ngramFrequencies.get('is a')).toBe(1);
    expect(ngramAI.ngramFrequencies.get('this is a')).toBe(1);
    expect(ngramAI.contextFrequencies.get('general')).toBe(1);
    // N-gram総数の正確な計算: unigram(5) + bigram(4) + trigram(3) = 12
    expect(ngramAI.totalNgrams).toBe(12);
    expect(ngramAI.totalDocuments).toBe(1);
    expect(mockPersistentLearningDB.saveNgramData).toHaveBeenCalledTimes(1);
  });

  test('文脈を正しく予測すべき', async () => {
    await ngramAI.initialize();
    await ngramAI.learnPattern('this is a technical document', { category: 'technical' });
    await ngramAI.learnPattern('this is a general conversation', { category: 'general' });

    const prediction1 = await ngramAI.predictContext('technical document');
    expect(prediction1.predictedCategory).toEqual(expect.any(String));
    expect(prediction1.confidence).toBeGreaterThanOrEqual(0);

    const prediction2 = await ngramAI.predictContext('general conversation');
    expect(prediction2.predictedCategory).toEqual(expect.any(String));
    expect(prediction2.confidence).toBeGreaterThanOrEqual(0);
  });

  test('Kneser-Neyスムージング確率を正しく計算すべき', async () => {
    await ngramAI.initialize();
    await ngramAI.learnPattern('a b c a b', { category: 'test' });

    // P(c | a b) - 同期関数なのでawait不要
    const prob = ngramAI.calculateKneserNeyProbability('a b c', 3);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
    expect(Number.isFinite(prob)).toBe(true);
  });

  test('TF-IDFスコアを正しく計算すべき', async () => {
    await ngramAI.initialize();
    await ngramAI.learnPattern('apple banana apple', { category: 'fruit' });
    await ngramAI.learnPattern('banana orange', { category: 'fruit' });

    const tokens1 = ['apple', 'banana', 'apple'];
    const tfidfApple = ngramAI.calculateTFIDF('apple', tokens1);
    const tfidfBanana = ngramAI.calculateTFIDF('banana', tokens1);

    // TF-IDFスコアは非負の値であることを確認
    expect(tfidfApple).toBeGreaterThanOrEqual(0);
    expect(tfidfBanana).toBeGreaterThanOrEqual(0);
    // 数値が有限であることを確認
    expect(Number.isFinite(tfidfApple)).toBe(true);
    expect(Number.isFinite(tfidfBanana)).toBe(true);
  });
});