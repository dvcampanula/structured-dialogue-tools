import { EnhancedHybridLanguageProcessor } from '../../foundation/morphology/hybrid-processor.js';
import fs from 'fs';
import path from 'path';
import { persistentLearningDB as defaultPersistentLearningDB } from '../../data/persistent-learning-db.js';
import { NgramContextPatternAI as defaultNgramContextPatternAI } from '../ngram/ngram-context-pattern.js';

export class DynamicRelationshipLearner {
    constructor(userId = 'default', dependencies = {}) {
        this.userId = userId;
        this.userRelations = {};
        this.coOccurrenceData = {};
        this.contextStrengths = {};
        
        this.persistentLearningDB = dependencies.persistentLearningDB || defaultPersistentLearningDB;
        this.hybridProcessor = dependencies.hybridProcessor || new EnhancedHybridLanguageProcessor();
        this.ngramAI = dependencies.ngramAI || new defaultNgramContextPatternAI(3, 0.75);

        this.semanticCache = new Map(); // 意味類似度キャッシュ
        this.tfIdfCache = new Map(); // TF-IDFキャッシュ
        
        // 学習パラメータ
        this.learningConfig = {
            minCoOccurrence: 2,        // 最小共起回数
            strengthThreshold: 0.3,    // 関係性強度閾値
            maxRelationsPerTerm: 10,   // 1語あたり最大関係数
            decayFactor: 0.95,         // 忘却係数
            learningRate: 0.1          // 学習率
        };
        
        // initializeLearnerはコンストラクタで呼ばない。テストで制御するため。
        // this.initializeLearner();
    }

    async initializeLearner() {
        try {
            // 永続化DBから既存の学習データ読み込み
            const loadedRelations = await this.persistentLearningDB.getUserSpecificRelations(this.userId);
            if (loadedRelations) {
                this.userRelations = loadedRelations.userRelations || {};
                this.coOccurrenceData = loadedRelations.coOccurrenceData || {};
                this.learningConfig = { ...this.learningConfig, ...loadedRelations.learningConfig };
            }
            
            // 学習設定読み込み（直接ファイル読み込み）
            try {
                const configPath = path.join(process.cwd(), 'src', 'config', 'learning-config.json');
                if (fs.existsSync(configPath)) {
                    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    this.learningConfig = { ...this.learningConfig, ...configData };
                    console.log('✅ 学習設定読み込み完了');
                }
            } catch (error) {
                console.warn('⚠️ 学習設定読み込み失敗:', error.message);
            }
            
            await this.hybridProcessor.initialize();
            await this.ngramAI.initialize();
            console.log(`✅ DynamicRelationshipLearner初期化完了 (ユーザー: ${this.userId})`);
            console.log(`📊 既存関係数: ${Object.keys(this.userRelations).length}件`);
            
            // 定期保存タイマー（5分間隔）
            this.autoSaveInterval = setInterval(() => {
                this.saveUserData().catch(err => 
                    console.warn('⚠️ 定期保存エラー:', err.message)
                );
            }, 5 * 60 * 1000);
            
        } catch (error) {
            console.warn('⚠️ 学習データ読み込み失敗、新規作成:', error.message);
            this.userRelations = {};
            this.coOccurrenceData = {};
        }
    }

    /**
     * 会話から概念関係を学習
     */
    async learnFromConversation(input, history, response) {
        try {
            // 全テキストからキーワード抽出
            const inputKeywords = await this.extractKeywords(input);
            const responseKeywords = await this.extractKeywords(response);
            
            // 履歴キーワード
            const historyKeywords = [];
            for (const turn of history) {
                const turnText = turn.content || turn.message || turn;
                historyKeywords.push(...await this.extractKeywords(turnText));
            }
            
            // 共起分析
            await this.analyzeCoOccurrence(inputKeywords, responseKeywords);
            await this.analyzeCoOccurrence(inputKeywords, historyKeywords);
            
            // 文脈関係性分析（既に抽出したキーワードを渡して重複回避）
            await this.analyzeContextualRelationships(input, history, response, inputKeywords, responseKeywords);
            
            // 学習データ更新
            await this.updateRelationships();
            
            // 自動保存 - 学習後は必ず保存
            await this.saveUserData();
            
            console.log(`📚 学習完了: ${inputKeywords.length}+${responseKeywords.length}キーワード分析`);
            
        } catch (error) {
            
        }
    }

    /**
     * AIVocabularyProcessorから呼び出される共起分析のメインエントリポイント
     * @param {string} text - 入力テキスト
     * @param {string} optimizedVocabulary - 最適化された語彙
     */
    async analyze(text, optimizedVocabulary) {
        try {
            // learnFromConversation を利用して共起分析を行う
            // input: text, history: [], response: optimizedVocabulary
            // learnFromConversation は内部で analyzeCoOccurrence, analyzeContextualRelationships, updateRelationships, saveUserData を呼び出す
            await this.learnFromConversation(text, [], optimizedVocabulary);
            console.log(`📚 CoOccurrenceAnalyzer: テキストと最適化語彙の共起分析完了`);
        } catch (error) {
            console.error('❌ CoOccurrenceAnalyzer analyzeエラー:', error.message);
        }
    }

    /**
     * AIVocabularyProcessorから呼び出されるフィードバック学習エントリポイント
     * @param {string} vocabulary - 評価された語彙
     * @param {number} rating - ユーザーからの評価 (0-1の範囲)
     * @param {string} contextText - 評価時の文脈テキスト
     */
    async learnFromFeedback(vocabulary, rating, contextText) {
        try {
            // 評価された語彙と文脈テキスト内のキーワードとの関係性を強化/弱化
            const contextKeywords = await this.extractKeywords(contextText);
            
            for (const kw of contextKeywords) {
                if (vocabulary !== kw) {
                    // 評価が高いほど関係性を強化、低いほど弱化
                    // rating 0.5 を中立として、それより高ければ強化、低ければ弱化
                    const adjustment = (rating - 0.5) * this.learningConfig.learningRate * 2; // -learningRate to +learningRate
                    const currentStrength = this.getRelationshipStrength(vocabulary, kw);
                    const newStrength = currentStrength + adjustment;
                    this.addUserRelation(vocabulary, kw, Math.max(0, Math.min(1, newStrength))); // 0-1にクランプ
                }
            }
            await this.saveUserData();
            console.log(`📚 CoOccurrenceAnalyzer: フィードバック学習完了 for ${vocabulary} (Rating: ${rating})`);
        } catch (error) {
            console.error('❌ CoOccurrenceAnalyzer learnFromFeedbackエラー:', error.message);
        }
    }

    /**
     * 共起キーワード分析
     */
    async analyzeCoOccurrence(keywords1, keywords2, fullText = '') {
        for (const kw1 of keywords1) {
            for (const kw2 of keywords2) {
                if (kw1 !== kw2) {
                    const pairKey = this.createPairKey(kw1, kw2);
                    
                    // 共起回数増加
                    if (!this.coOccurrenceData[pairKey]) {
                        this.coOccurrenceData[pairKey] = {
                            term1: kw1,
                            term2: kw2,
                            count: 0,
                            strength: 0,
                            contexts: []
                        };
                    }
                    
                    this.coOccurrenceData[pairKey].count++;
                    // 共起が発生した文脈を記録
                    if (fullText) {
                        this.coOccurrenceData[pairKey].contexts.push(fullText.substring(0, 100)); // テキストの冒頭100文字を記録
                        // 重複する文脈を避けるためにSetを使用することも検討
                        this.coOccurrenceData[pairKey].contexts = [...new Set(this.coOccurrenceData[pairKey].contexts)];
                    }
                }
            }
        }
    }

    /**
     * 文脈関係性分析
     */
    async analyzeContextualRelationships(input, history, response, inputKeywords, responseKeywords) {
        // キーワードが未提供の場合のみ抽出（重複回避）
        const finalInputKeywords = inputKeywords || await this.extractKeywords(input);
        const finalResponseKeywords = responseKeywords || await this.extractKeywords(response);
        
        for (const inputKw of finalInputKeywords) {
            for (const responseKw of finalResponseKeywords) {
                if (inputKw !== responseKw) {
                    const relationKey = `${inputKw}->${responseKw}`;
                    
                    // 文脈強度計算（非同期呼び出し）
                    const strength = await this.calculateContextualStrength(
                        inputKw, responseKw, input, response
                    );
                    
                    if (!this.contextStrengths[relationKey]) {
                        this.contextStrengths[relationKey] = [];
                    }
                    
                    this.contextStrengths[relationKey].push({
                        strength: strength,
                        context: { input: input, response: response }, // 全体を記録
                        timestamp: Date.now()
                    });
                }
            }
        }
    }

    /**
     * 文脈強度計算 - 統計学習ベースの意味類似度評価
     */
    async calculateContextualStrength(term1, term2, text1, text2) {
        let strength = 0;

        // 1. 距離ベース強度（基本的な共起関係）
        const distanceStrength = this.calculateDistanceStrength(term1, term2, text1, text2);
        strength += distanceStrength * 0.3;

        // 2. 統計的意味類似度（N-gramベース）
        const semanticSimilarity = await this.calculateStatisticalSemanticSimilarity(term1, term2);
        strength += semanticSimilarity * 0.4;

        // 3. 文脈コサイン類似度（共使用文脈パターン）
        const contextualSimilarity = await this.calculateContextualCosineSimilarity(term1, term2);
        strength += contextualSimilarity * 0.3;
        
        return Math.min(strength, 1.0);
    }

    /**
     * 距離ベース強度計算
     */
    calculateDistanceStrength(term1, term2, text1, text2) {
        const term1IndexesInText1 = this.findAllIndexes(text1, term1);
        const term2IndexesInText2 = this.findAllIndexes(text2, term2);
        
        let minDistance = Infinity;
        if (term1IndexesInText1.length > 0 && term2IndexesInText2.length > 0) {
            for (const index1 of term1IndexesInText1) {
                for (const index2 of term2IndexesInText2) {
                    const distance = Math.abs(index1 - index2);
                    if (distance < minDistance) {
                        minDistance = distance;
                    }
                }
            }
        }

        return minDistance === Infinity ? 0 : Math.max(0, 1 - minDistance / 100);
    }

    /**
     * 統計的意味類似度計算（N-gramベース）
     */
    async calculateStatisticalSemanticSimilarity(term1, term2) {
        const cacheKey = `${term1}|${term2}`;
        if (this.semanticCache.has(cacheKey)) {
            return this.semanticCache.get(cacheKey);
        }

        try {
            // 各用語の文脈予測を取得
            const context1 = await this.ngramAI.predictContext(term1);
            const context2 = await this.ngramAI.predictContext(term2);
            
            // 文脈予測結果の類似度を計算
            let similarity = 0;
            
            // 同じ文脈カテゴリーの場合、信頼度に基づいてスコア計算
            if (context1.predictedCategory === context2.predictedCategory) {
                const avgConfidence = (context1.confidence + context2.confidence) / 2;
                similarity = avgConfidence * 0.8; // 同一文脈ボーナス
            } else {
                // 異なる文脈でも信頼度が低い場合は一定の類似度を付与
                const minConfidence = Math.min(context1.confidence, context2.confidence);
                if (minConfidence < 0.5) {
                    similarity = 0.2; // 不確実性ボーナス
                }
            }
            
            // N-gram共有パターンを計算
            const ngramSimilarity = await this.calculateNgramPatternSimilarity(term1, term2);
            similarity = Math.max(similarity, ngramSimilarity);
            
            this.semanticCache.set(cacheKey, similarity);
            return similarity;
            
        } catch (error) {
            console.warn(`⚠️ 意味類似度計算エラー: ${error.message}`);
            return 0;
        }
    }

    /**
     * N-gramパターン類似度計算
     */
    async calculateNgramPatternSimilarity(term1, term2) {
        // 各用語を含むN-gramパターンを取得
        const pattern1 = await this.extractNgramPatterns(term1);
        const pattern2 = await this.extractNgramPatterns(term2);
        
        if (pattern1.length === 0 || pattern2.length === 0) return 0;
        
        // コサイン類似度でパターン類似度を計算
        const intersection = pattern1.filter(p => pattern2.includes(p));
        const union = [...new Set([...pattern1, ...pattern2])];
        
        return union.length > 0 ? intersection.length / union.length : 0;
    }

    /**
     * 文脈コサイン類似度計算
     */
    async calculateContextualCosineSimilarity(term1, term2) {
        try {
            // 各用語の共起ベクトルを構築
            const vector1 = this.buildCooccurrenceVector(term1);
            const vector2 = this.buildCooccurrenceVector(term2);
            
            if (vector1.length === 0 || vector2.length === 0) return 0;
            
            // コサイン類似度計算
            return this.calculateCosineSimilarity(vector1, vector2);
            
        } catch (error) {
            console.warn(`⚠️ コサイン類似度計算エラー: ${error.message}`);
            return 0;
        }
    }

    /**
     * 関係性データ更新
     */
    async updateRelationships() {
        // 共起データから関係性抽出
        for (const [pairKey, data] of Object.entries(this.coOccurrenceData)) {
            if (data.count >= this.learningConfig.minCoOccurrence) {
                // 関係性強度計算
                const strength = this.calculateRelationshipStrength(data);
                
                if (strength >= this.learningConfig.strengthThreshold) {
                    this.addUserRelation(data.term1, data.term2, strength);
                }
            }
        }
        
        // 文脈強度データから関係性抽出
        for (const [relationKey, strengthData] of Object.entries(this.contextStrengths)) {
            const avgStrength = strengthData.reduce((sum, s) => sum + s.strength, 0) / strengthData.length;
            
            if (avgStrength >= this.learningConfig.strengthThreshold) {
                const [term1, term2] = relationKey.split('->');
                this.addUserRelation(term1, term2, avgStrength);
            }
        }
        
        // 老朽化処理（忘却）
        this.applyDecay();
    }

    /**
     * ユーザー関係性追加
     */
    addUserRelation(term1, term2, strength) {
        if (!this.userRelations[term1]) {
            this.userRelations[term1] = [];
        }
        
        // 既存関係の更新
        const existing = this.userRelations[term1].find(r => r.term === term2);
        if (existing) {
            // 指数移動平均で更新
            existing.strength = existing.strength * (1 - this.learningConfig.learningRate) + 
                               strength * this.learningConfig.learningRate;
            existing.lastUpdated = Date.now();
        } else {
            // 新規関係追加
            this.userRelations[term1].push({
                term: term2,
                strength: strength,
                count: 1,
                firstSeen: Date.now(),
                lastUpdated: Date.now()
            });
        }
        
        // 関係数制限
        if (this.userRelations[term1].length > this.learningConfig.maxRelationsPerTerm) {
            this.userRelations[term1].sort((a, b) => b.strength - a.strength);
            this.userRelations[term1] = this.userRelations[term1].slice(0, this.learningConfig.maxRelationsPerTerm);
        }
    }

    /**
     * 忘却処理
     */
    applyDecay() {
        for (const [term, relations] of Object.entries(this.userRelations)) {
            for (const relation of relations) {
                // 時間経過による強度減衰
                const age = Date.now() - relation.lastUpdated;
                const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
                
                if (daysSinceUpdate > 1) {
                    relation.strength *= Math.pow(this.learningConfig.decayFactor, daysSinceUpdate);
                }
            }
            
            // 弱い関係性を削除
            this.userRelations[term] = relations.filter(r => r.strength > 0.1);
            
            // 空の配列を削除
            if (this.userRelations[term].length === 0) {
                delete this.userRelations[term];
            }
        }
    }

    /**
     * 学習済み関係性取得
     */
    getUserRelations(term) {
        const relations = this.userRelations[term] || [];
        return relations
            .filter(r => r.strength > this.learningConfig.strengthThreshold)
            .map(r => r.term);
    }

    /**
     * 関係性強度取得
     */
    getRelationshipStrength(term1, term2) {
        const relations = this.userRelations[term1] || [];
        const relation = relations.find(r => r.term === term2);
        return relation ? relation.strength : 0;
    }

    /**
     * 学習データ保存
     */
    async saveUserData() {
        try {
            const dataToSave = {
                userRelations: this.userRelations,
                coOccurrenceData: this.coOccurrenceData,
                learningConfig: this.learningConfig,
                lastSaved: Date.now()
            };
            
            // 永続化DBに保存
            await this.persistentLearningDB.saveUserSpecificRelations(this.userId, dataToSave);
            
            console.log(`💾 学習データ永続化完了: ${Object.keys(this.userRelations).length}語の関係性`);
            
        } catch (error) {
            console.error('❌ 学習データ保存エラー:', error.message);
        }
    }

    /**
     * クリーンアップ（定期保存タイマー停止）
     */
    cleanup() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            console.log('🔄 定期保存タイマー停止');
        }
    }

    /**
     * 学習統計取得
     */
    getLearningStats() {
        const totalTerms = Object.keys(this.userRelations).length;
        const totalRelations = Object.values(this.userRelations)
            .reduce((sum, relations) => sum + relations.length, 0);
        
        const avgStrength = Object.values(this.userRelations)
            .flat()
            .reduce((sum, r) => sum + r.strength, 0) / Math.max(totalRelations, 1);
        
        return {
            totalTerms,
            totalRelations,
            averageStrength: avgStrength,
            coOccurrencePairs: Object.keys(this.coOccurrenceData).length
        };
    }

    // ヘルパーメソッド
    /**
     * 統計的キーワード抽出（TF-IDF強化版）
     */
    async extractKeywords(text) {
        if (!text || typeof text !== 'string') return [];
        
        try {
            const processedResult = await this.hybridProcessor.processText(text, {
                enableMeCab: true,
                enableGrouping: false
            });

            // 名詞と動詞を抽出（より幅広いキーワード抽出）
            const candidates = processedResult.tokens
                .filter(token => ['名詞', '動詞'].includes(token.pos))
                .map(token => token.surface);
            
            // TF-IDFスコアでキーワードをランキング
            const keywordsWithScore = await this.calculateKeywordTFIDF(candidates, text);
            
            // 高スコアのキーワードを選択
            return keywordsWithScore
                .sort((a, b) => b.score - a.score)
                .slice(0, Math.min(20, keywordsWithScore.length)) // 上位20キーワード
                .filter(item => item.score > 0.1) // 低スコアを除外
                .map(item => item.word);
                
        } catch (error) {
            console.error('❌ キーワード抽出エラー:', error.message);
            return [];
        }
    }

    /**
     * TF-IDFスコア計算
     */
    async calculateKeywordTFIDF(candidates, text) {
        const wordFreq = new Map();
        const totalWords = candidates.length;
        
        // TF計算
        candidates.forEach(word => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        });
        
        const keywordsWithScore = [];
        
        for (const [word, freq] of wordFreq.entries()) {
            if (word.length < 2 || this.isStopWord(word)) continue;
            
            // TF: 正規化された頻度
            const tf = freq / totalWords;
            
            // IDF: N-gramモジュールから文書頻度を取得
            const idf = await this.calculateIDF(word);
            
            const score = tf * idf;
            if (score > 0) {
                keywordsWithScore.push({ word, score, tf, idf });
            }
        }
        
        return keywordsWithScore;
    }

    /**
     * IDF計算（N-gramモジュールと連携）
     */
    async calculateIDF(word) {
        if (this.tfIdfCache.has(word)) {
            return this.tfIdfCache.get(word);
        }
        
        try {
            // N-gramモジュールのドキュメント頻度情報を使用
            const docFreq = this.ngramAI.documentFreqs.get(word) || 1;
            const totalDocs = Math.max(this.ngramAI.totalDocuments, 1);
            
            const idf = Math.log(totalDocs / docFreq);
            this.tfIdfCache.set(word, idf);
            return idf;
            
        } catch (error) {
            return 1; // フォールバック
        }
    }

    /**
     * ストップワード判定
     */
    isStopWord(word) {
        const stopWords = [
            'こと', 'もの', 'ため', 'よう', 'そう', 'これ', 'それ', 'あれ', 'どれ',
            'できる', 'する', 'なる', 'いる', 'ある', 'ない', 'いう', '見る',
            '今日', '今', 'とき', '時', '日', '年', '月', '分', '秒'
        ];
        return stopWords.includes(word);
    }

    createPairKey(term1, term2) {
        return term1 < term2 ? `${term1}|${term2}` : `${term2}|${term1}`;
    }

    calculateRelationshipStrength(data) {
        // 共起回数ベース強度
        const countStrength = Math.min(data.count / 10, 1.0);
        
        // 文脈多様性
        const contextDiversity = Math.min(data.contexts.length / 3, 1.0);
        
        return (countStrength * 0.7 + contextDiversity * 0.3);
    }

    

    /**
     * 文字列の全出現位置取得
     */
    /**
     * N-gramパターン抽出
     */
    async extractNgramPatterns(term) {
        // 用語を含むサンプル文を生成
        const sampleText = `${term}について ${term}の実装 ${term}を使用`;
        
        try {
            const context = await this.ngramAI.predictContext(sampleText);
            return [context.predictedCategory]; // 簡化したパターン抽出
        } catch (error) {
            return [];
        }
    }

    /**
     * 共起ベクトル構築
     */
    buildCooccurrenceVector(term) {
        const vector = [];
        const relations = this.userRelations[term] || [];
        
        // 全用語の辞書を作成
        const allTerms = new Set();
        Object.keys(this.userRelations).forEach(t => allTerms.add(t));
        Object.values(this.userRelations).forEach(rels => 
            rels.forEach(r => allTerms.add(r.term))
        );
        
        // ベクトル構築
        for (const otherTerm of allTerms) {
            const relation = relations.find(r => r.term === otherTerm);
            vector.push(relation ? relation.strength : 0);
        }
        
        return vector;
    }

    /**
     * コサイン類似度計算
     */
    calculateCosineSimilarity(vector1, vector2) {
        if (vector1.length !== vector2.length || vector1.length === 0) return 0;
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
            norm1 += vector1[i] * vector1[i];
            norm2 += vector2[i] * vector2[i];
        }
        
        const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * 文字列の全出現位置取得
     */
    findAllIndexes(text, searchTerm) {
        const indexes = [];
        let index = text.indexOf(searchTerm);
        
        while (index !== -1) {
            indexes.push(index);
            index = text.indexOf(searchTerm, index + 1);
        }
        
        return indexes;
    }
}

// デフォルトインスタンス
export const dynamicLearner = new DynamicRelationshipLearner();