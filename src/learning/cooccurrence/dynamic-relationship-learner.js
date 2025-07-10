import { EnhancedHybridLanguageProcessor, SemanticSimilarityEngine } from '../../foundation/morphology/hybrid-processor.js';
import fs from 'fs';
import path from 'path';
import { configLoader } from '../../data/config-loader.js';
import { persistentLearningDB } from '../../data/persistent-learning-db.js';

export class DynamicRelationshipLearner {
    constructor(userId = 'default') {
        this.userId = userId;
        this.userRelations = {};
        this.coOccurrenceData = {};
        this.contextStrengths = {};
        this.hybridProcessor = new EnhancedHybridLanguageProcessor();
        this.semanticSimilarityEngine = new SemanticSimilarityEngine();
        
        // 学習パラメータ
        this.learningConfig = {
            minCoOccurrence: 2,        // 最小共起回数
            strengthThreshold: 0.3,    // 関係性強度閾値
            maxRelationsPerTerm: 10,   // 1語あたり最大関係数
            decayFactor: 0.95,         // 忘却係数
            learningRate: 0.1          // 学習率
        };
        
        this.initializeLearner();
    }

    async initializeLearner() {
        try {
            // 永続化DBから既存の学習データ読み込み
            this.userRelations = persistentLearningDB.getUserSpecificRelations(this.userId);
            
            // 学習設定読み込み
            const config = await configLoader.loadConfig('learningConfig');
            if (config) {
                this.learningConfig = { ...this.learningConfig, ...config };
            }
            
            await this.hybridProcessor.initialize();
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
            
            // 文脈関係性分析
            await this.analyzeContextualRelationships(input, history, response);
            
            // 学習データ更新
            await this.updateRelationships();
            
            // 自動保存 - 学習後は必ず保存
            await this.saveUserData();
            
            console.log(`📚 学習完了: ${inputKeywords.length}+${responseKeywords.length}キーワード分析`);
            
        } catch (error) {
            console.error('❌ 学習エラー:', error.message);
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
    async analyzeContextualRelationships(input, history, response) {
        // 入力→応答の関係性
        const inputKeywords = await this.extractKeywords(input);
        const responseKeywords = await this.extractKeywords(response);
        
        for (const inputKw of inputKeywords) {
            for (const responseKw of responseKeywords) {
                if (inputKw !== responseKw) {
                    const relationKey = `${inputKw}->${responseKw}`;
                    
                    // 文脈強度計算
                    const strength = this.calculateContextualStrength(
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
     * 文脈強度計算
     */
    calculateContextualStrength(term1, term2, text1, text2) {
        let strength = 0;

        // 1. 単語間の距離に基づく強度
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
        } else {
            // 片方または両方の単語が見つからない場合、距離ベース強度は0
            minDistance = Infinity;
        }

        // 距離が近いほど強度が高い (最大100文字の範囲で影響)
        const distanceStrength = minDistance === Infinity ? 0 : Math.max(0, 1 - minDistance / 100);
        strength += distanceStrength * 0.5; // 距離ベース強度を全体の50%の重みで加算

        // 2. 意味的類似度に基づく強度
        const semanticSimilarity = this.semanticSimilarityEngine.similarity(term1, term2);
        strength += semanticSimilarity * 0.4; // 意味的類似度を全体の40%の重みで加算

        // 3. 技術用語ペアの強度向上 (既存ロジックを維持しつつ重みを調整)
        if (this.isTechnicalTerm(term1) && this.isTechnicalTerm(term2)) {
            strength += 0.1; // 技術用語ペアにボーナス (全体の10%の重み)
        }
        
        return Math.min(strength, 1.0); // 強度を0から1の範囲にクランプ
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
            await persistentLearningDB.saveUserSpecificRelations(this.userId, dataToSave);
            
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
    async extractKeywords(text) { // Make it async
        if (!text || typeof text !== 'string') return [];
        
        try {
            const processedResult = await this.hybridProcessor.processText(text, {
                enableMeCab: true,
                enableSimilarity: false, // Not needed for keyword extraction
                enableGrouping: false    // Not needed for keyword extraction
            });

            // 形態素解析結果から名詞を抽出
            const keywords = processedResult.tokens
                .filter(token => token.pos === '名詞') // 名詞のみを抽出
                .map(token => token.surface);
            
            // 重複除去・フィルタリング
            return [...new Set(keywords)]
                .filter(word => word.length >= 2) // 2文字以上の単語に限定
                .filter(word => !['こと', 'もの', 'ため', 'よう', 'そう', 'これ', 'それ', 'あれ', 'どれ'].includes(word)); // 一般的な助詞などを除外
        } catch (error) {
            console.error('❌ キーワード抽出エラー:', error.message);
            return []; // エラー時は空の配列を返す
        }
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

    isTechnicalTerm(term) {
        const technicalTerms = ['プログラミング', '開発', '実装', 'react', 'javascript', 'ai', '機械学習'];
        return technicalTerms.includes(term.toLowerCase());
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