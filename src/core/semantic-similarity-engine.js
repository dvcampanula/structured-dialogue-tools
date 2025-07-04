#!/usr/bin/env node
/**
 * SemanticSimilarityEngine - 意味類似度計算専用エンジン
 * 
 * 🧠 意味的類似度・関連性の計算処理分離
 * 🔗 キーワード関係性・概念マッピング機能
 * 📊 統計ベース類似度・文脈連続性計算
 */

import { configLoader } from './config-loader.js';

export class SemanticSimilarityEngine {
    constructor() {
        this.techRelations = {};
        this.staticRelations = {};
        this.userRelations = {};
        this.similarityCache = new Map();
        
        // 類似度計算パラメータ
        this.similarityConfig = {
            exactMatchWeight: 1.0,
            relatedTermWeight: 0.8,
            userLearnedWeight: 0.9,
            contextualWeight: 0.6,
            cacheMaxSize: 1000
        };
        
        this.initializeEngine();
    }

    async initializeEngine() {
        try {
            // 外部関係性データ読み込み
            this.staticRelations = await configLoader.getFlatTechRelations();
            this.techRelations = this.staticRelations;
            
            console.log('✅ SemanticSimilarityEngine初期化完了');
            console.log(`📊 静的関係性: ${Object.keys(this.staticRelations).length}件`);
            
        } catch (error) {
            console.warn('⚠️ 意味類似度エンジン初期化失敗:', error.message);
            this.loadFallbackRelations();
        }
    }

    /**
     * 動的学習データ統合
     */
    integrateUserRelations(dynamicLearner) {
        if (dynamicLearner) {
            this.userLearner = dynamicLearner;
            console.log('🔗 動的学習データ統合完了');
        }
    }

    /**
     * メイン類似度計算
     */
    async calculateSemanticSimilarity(text1, text2, contextData = {}) {
        const cacheKey = this.createCacheKey(text1, text2);
        if (this.similarityCache.has(cacheKey)) {
            return this.similarityCache.get(cacheKey);
        }

        const similarity = await this.computeSimilarity(text1, text2, contextData);
        
        // キャッシュ管理
        if (this.similarityCache.size >= this.similarityConfig.cacheMaxSize) {
            const firstKey = this.similarityCache.keys().next().value;
            this.similarityCache.delete(firstKey);
        }
        
        this.similarityCache.set(cacheKey, similarity);
        return similarity;
    }

    /**
     * 類似度計算コア処理
     */
    async computeSimilarity(text1, text2, contextData) {
        if (!text1 || !text2) return 0;

        const keywords1 = this.extractKeywords(text1);
        const keywords2 = this.extractKeywords(text2);

        if (keywords1.length === 0 && keywords2.length === 0) return 1.0;
        if (keywords1.length === 0 || keywords2.length === 0) return 0;

        let totalSimilarity = 0;
        let maxPossibleScore = 0;

        // 各キーワードペアで類似度計算
        for (const kw1 of keywords1) {
            let bestMatch = 0;
            
            for (const kw2 of keywords2) {
                const pairSimilarity = await this.calculateKeywordSimilarity(kw1, kw2, contextData);
                bestMatch = Math.max(bestMatch, pairSimilarity);
            }
            
            totalSimilarity += bestMatch;
            maxPossibleScore += 1.0;
        }

        return maxPossibleScore > 0 ? totalSimilarity / maxPossibleScore : 0;
    }

    /**
     * キーワード間類似度計算
     */
    async calculateKeywordSimilarity(keyword1, keyword2, contextData) {
        // 完全一致
        if (keyword1 === keyword2) {
            return this.similarityConfig.exactMatchWeight;
        }

        let similarity = 0;

        // 静的関係性チェック
        const staticSimilarity = this.checkStaticRelationship(keyword1, keyword2);
        similarity = Math.max(similarity, staticSimilarity * this.similarityConfig.relatedTermWeight);

        // 動的学習関係性チェック
        if (this.userLearner) {
            const userSimilarity = this.checkUserLearnedRelationship(keyword1, keyword2);
            similarity = Math.max(similarity, userSimilarity * this.similarityConfig.userLearnedWeight);
        }

        // 文脈的類似度
        if (contextData && Object.keys(contextData).length > 0) {
            const contextualSimilarity = this.calculateContextualSimilarity(keyword1, keyword2, contextData);
            similarity = Math.max(similarity, contextualSimilarity * this.similarityConfig.contextualWeight);
        }

        return Math.min(similarity, 1.0);
    }

    /**
     * 静的関係性チェック
     */
    checkStaticRelationship(keyword1, keyword2) {
        const relations1 = this.staticRelations[keyword1] || [];
        const relations2 = this.staticRelations[keyword2] || [];

        // 直接関係チェック
        if (relations1.includes(keyword2) || relations2.includes(keyword1)) {
            return 0.9;
        }

        // 間接関係チェック（共通関連語）
        const commonRelations = relations1.filter(rel => relations2.includes(rel));
        if (commonRelations.length > 0) {
            return 0.6 + (commonRelations.length * 0.1);
        }

        return 0;
    }

    /**
     * 学習済み関係性チェック
     */
    checkUserLearnedRelationship(keyword1, keyword2) {
        if (!this.userLearner) return 0;

        const strength1 = this.userLearner.getRelationshipStrength(keyword1, keyword2);
        const strength2 = this.userLearner.getRelationshipStrength(keyword2, keyword1);

        return Math.max(strength1, strength2);
    }

    /**
     * 文脈的類似度計算
     */
    calculateContextualSimilarity(keyword1, keyword2, contextData) {
        let contextualScore = 0;

        // 同一文脈内での共起
        if (contextData.entities && contextData.entities[keyword1] && contextData.entities[keyword2]) {
            contextualScore += 0.4;
        }

        // 話題関連性
        if (contextData.topics) {
            const topic1Match = contextData.topics.some(topic => topic.includes(keyword1));
            const topic2Match = contextData.topics.some(topic => topic.includes(keyword2));
            
            if (topic1Match && topic2Match) {
                contextualScore += 0.3;
            }
        }

        // 時間的近接性
        if (contextData.temporal && contextData.temporal.recentTerms) {
            const recent1 = contextData.temporal.recentTerms.includes(keyword1);
            const recent2 = contextData.temporal.recentTerms.includes(keyword2);
            
            if (recent1 && recent2) {
                contextualScore += 0.2;
            }
        }

        return Math.min(contextualScore, 1.0);
    }

    /**
     * 関連語取得
     */
    getRelatedTerms(keyword, includeUserLearned = true) {
        const relatedTerms = new Set();

        // 静的関係性
        const staticRelated = this.staticRelations[keyword] || [];
        staticRelated.forEach(term => relatedTerms.add(term));

        // 動的学習関係性
        if (includeUserLearned && this.userLearner) {
            const userRelated = this.userLearner.getUserRelations(keyword);
            userRelated.forEach(term => relatedTerms.add(term));
        }

        return Array.from(relatedTerms);
    }

    /**
     * 文脈連続性計算
     */
    async calculateSemanticContinuity(currentInput, conversationHistory) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return 1.0;
        }

        let totalContinuity = 0;
        let validComparisons = 0;

        // 直近数ターンとの類似度計算
        const recentTurns = conversationHistory.slice(-3);
        
        for (const turn of recentTurns) {
            const turnText = turn.content || turn.message || turn;
            if (turnText && typeof turnText === 'string') {
                const similarity = await this.calculateSemanticSimilarity(currentInput, turnText);
                totalContinuity += similarity;
                validComparisons++;
            }
        }

        return validComparisons > 0 ? totalContinuity / validComparisons : 0;
    }

    /**
     * 概念マッピング
     */
    mapConcepts(text) {
        const keywords = this.extractKeywords(text);
        const conceptMap = {};

        for (const keyword of keywords) {
            conceptMap[keyword] = {
                staticRelations: this.staticRelations[keyword] || [],
                userRelations: this.userLearner ? this.userLearner.getUserRelations(keyword) : [],
                strength: this.calculateConceptStrength(keyword)
            };
        }

        return conceptMap;
    }

    /**
     * 概念強度計算
     */
    calculateConceptStrength(keyword) {
        let strength = 0.5; // ベース強度

        // 関係性の豊富さ
        const staticCount = (this.staticRelations[keyword] || []).length;
        const userCount = this.userLearner ? this.userLearner.getUserRelations(keyword).length : 0;
        
        strength += Math.min(staticCount * 0.05, 0.3);
        strength += Math.min(userCount * 0.08, 0.2);

        return Math.min(strength, 1.0);
    }

    // ヘルパーメソッド
    extractKeywords(text) {
        if (!text || typeof text !== 'string') return [];
        
        const cleanText = text.toLowerCase();
        const keywords = [];
        
        // 技術用語抽出
        keywords.push(...cleanText.match(/(?:プログラミング|開発|学習|実装|react|javascript|ai|機械学習)/g) || []);
        
        // 漢字キーワード
        keywords.push(...cleanText.match(/[一-龯]{2,}/g) || []);
        
        // 重複除去・フィルタ
        return [...new Set(keywords)]
            .filter(word => word.length >= 2)
            .filter(word => !['です', 'ます', 'について'].includes(word))
            .slice(0, 10);
    }

    createCacheKey(text1, text2) {
        const shorter = text1.length < text2.length ? text1 : text2;
        const longer = text1.length >= text2.length ? text1 : text2;
        return `${shorter.substring(0, 20)}|${longer.substring(0, 20)}`;
    }

    loadFallbackRelations() {
        this.staticRelations = {
            'react': ['開発', 'ウェブ', 'javascript'],
            '学習': ['プログラミング', '開発', 'スキル'],
            'ai': ['機械学習', 'システム']
        };
        console.log('🔄 フォールバック関係性読み込み完了');
    }

    /**
     * 統計情報取得
     */
    getEngineStats() {
        return {
            staticRelationsCount: Object.keys(this.staticRelations).length,
            cacheSize: this.similarityCache.size,
            hasUserLearning: !!this.userLearner
        };
    }

    /**
     * キャッシュクリア
     */
    clearCache() {
        this.similarityCache.clear();
        console.log('🧹 類似度キャッシュクリア完了');
    }
}

// デフォルトインスタンス
export const semanticSimilarityEngine = new SemanticSimilarityEngine();