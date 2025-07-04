#!/usr/bin/env node
/**
 * IntentRecognitionEngine - 意図認識専用エンジン
 * 
 * 🎯 高度意図認識・分類処理分離
 * 🧠 文脈的・個人特化意図推論
 * 📊 多層意図分析・信頼度計算
 */

import { configLoader } from './config-loader.js';

export class IntentRecognitionEngine {
    constructor() {
        this.intentPatterns = {};
        this.intentClassificationCache = new Map();
        this.personalIntentHistory = [];
        
        // 意図認識パラメータ
        this.recognitionConfig = {
            basicIntentWeight: 0.4,
            contextualIntentWeight: 0.3,
            personalIntentWeight: 0.3,
            confidenceThreshold: 0.6,
            cacheMaxSize: 500,
            historyMaxLength: 50
        };
        
        // 意図カテゴリ定義
        this.intentCategories = {
            basic: ['question', 'request', 'learning', 'clarification', 'affirmation'],
            contextual: ['continuation', 'elaboration', 'pivot', 'summary'],
            emotional: ['satisfaction', 'frustration', 'curiosity', 'excitement'],
            pragmatic: ['directive', 'collaborative', 'explorative', 'confirmative']
        };
        
        this.initializeEngine();
    }

    async initializeEngine() {
        try {
            // 意図パターン読み込み
            this.intentPatterns = await configLoader.getIntentPatterns();
            
            console.log('✅ IntentRecognitionEngine初期化完了');
            console.log(`🎯 意図パターン: ${Object.keys(this.intentPatterns.basic || {}).length}件`);
            
        } catch (error) {
            console.warn('⚠️ 意図認識エンジン初期化失敗:', error.message);
            this.loadFallbackPatterns();
        }
    }

    /**
     * メイン意図認識処理
     */
    async recognizeIntent(input, contextAnalysis = {}) {
        const cacheKey = this.createIntentCacheKey(input, contextAnalysis);
        if (this.intentClassificationCache.has(cacheKey)) {
            return this.intentClassificationCache.get(cacheKey);
        }

        const intentAnalysis = await this.performIntentAnalysis(input, contextAnalysis);
        
        // キャッシュ管理
        if (this.intentClassificationCache.size >= this.recognitionConfig.cacheMaxSize) {
            const firstKey = this.intentClassificationCache.keys().next().value;
            this.intentClassificationCache.delete(firstKey);
        }
        
        this.intentClassificationCache.set(cacheKey, intentAnalysis);
        
        // 個人意図履歴更新
        this.updatePersonalIntentHistory(intentAnalysis);
        
        return intentAnalysis;
    }

    /**
     * 意図分析コア処理
     */
    async performIntentAnalysis(input, contextAnalysis) {
        const intentAnalysis = {
            primaryIntent: null,
            secondaryIntents: [],
            implicitIntents: [],
            confidence: 0,
            intentEvolution: [],
            goalAlignment: {},
            emotionalIntent: {},
            pragmaticIntent: {},
            reasoning: []
        };

        // Step 1: 基本意図分類
        const basicIntent = await this.classifyBasicIntent(input);
        
        // Step 2: 文脈的意図推論
        const contextualIntent = this.inferContextualIntent(input, contextAnalysis);
        
        // Step 3: 個人特化意図パターン
        const personalIntent = await this.recognizePersonalIntentPatterns(input);
        
        // Step 4: 暗示的意図検出
        const implicitIntent = this.detectImplicitIntent(input, contextAnalysis);
        
        // Step 5: 感情的意図分析
        const emotionalIntent = this.analyzeEmotionalIntent(input);
        
        // Step 6: 語用論的意図分析
        const pragmaticIntent = this.analyzePragmaticIntent(input, contextAnalysis);

        // 意図統合・優先順位付け
        intentAnalysis.primaryIntent = this.determinePrimaryIntent(
            basicIntent, contextualIntent, personalIntent, implicitIntent
        );
        
        intentAnalysis.secondaryIntents = this.identifySecondaryIntents(
            basicIntent, contextualIntent, personalIntent
        );
        
        intentAnalysis.implicitIntents = implicitIntent;
        intentAnalysis.emotionalIntent = emotionalIntent;
        intentAnalysis.pragmaticIntent = pragmaticIntent;
        
        // 信頼度計算
        intentAnalysis.confidence = this.calculateIntentConfidence(intentAnalysis);
        
        // 推論過程記録
        intentAnalysis.reasoning = this.buildReasoningTrace(
            basicIntent, contextualIntent, personalIntent, implicitIntent
        );

        return intentAnalysis;
    }

    /**
     * 基本意図分類
     */
    async classifyBasicIntent(input) {
        const basicIntents = {
            question: 0,
            request: 0,
            learning: 0,
            clarification: 0,
            affirmation: 0
        };

        const inputLower = input.toLowerCase();

        // パターンマッチング
        if (this.intentPatterns.basic) {
            for (const [intentType, patterns] of Object.entries(this.intentPatterns.basic)) {
                if (basicIntents.hasOwnProperty(intentType)) {
                    const regex = new RegExp(patterns, 'gi');
                    const matches = (inputLower.match(regex) || []).length;
                    basicIntents[intentType] = Math.min(matches * 0.3, 1.0);
                }
            }
        }

        // 追加パターン検出
        this.detectAdditionalBasicPatterns(inputLower, basicIntents);

        // 最高スコア意図を返す
        const maxIntent = Object.entries(basicIntents).reduce((a, b) => 
            basicIntents[a[0]] > basicIntents[b[0]] ? a : b
        );

        return {
            type: maxIntent[0],
            confidence: maxIntent[1],
            allScores: basicIntents
        };
    }

    /**
     * 文脈的意図推論
     */
    inferContextualIntent(input, contextAnalysis) {
        const contextualIntents = {
            continuation: 0,
            elaboration: 0,
            pivot: 0,
            summary: 0
        };

        // 文脈深度による推論
        if (contextAnalysis.contextDepth) {
            if (contextAnalysis.contextDepth > 3) {
                contextualIntents.continuation += 0.4;
            }
            if (contextAnalysis.contextDepth > 5) {
                contextualIntents.elaboration += 0.3;
            }
        }

        // 話題変遷による推論
        if (contextAnalysis.topicEvolution && contextAnalysis.topicEvolution.length > 0) {
            const recentTopicChange = contextAnalysis.topicEvolution.slice(-2);
            if (recentTopicChange.length === 2 && recentTopicChange[0] !== recentTopicChange[1]) {
                contextualIntents.pivot += 0.6;
            }
        }

        // 意味的連続性による推論
        if (contextAnalysis.semanticContinuity !== undefined) {
            if (contextAnalysis.semanticContinuity > 0.7) {
                contextualIntents.continuation += 0.5;
            } else if (contextAnalysis.semanticContinuity < 0.3) {
                contextualIntents.pivot += 0.4;
            }
        }

        // 参照チェーンによる推論
        if (contextAnalysis.referenceChain && contextAnalysis.referenceChain.length > 0) {
            contextualIntents.elaboration += Math.min(contextAnalysis.referenceChain.length * 0.2, 0.6);
        }

        const maxContextualIntent = Object.entries(contextualIntents).reduce((a, b) => 
            contextualIntents[a[0]] > contextualIntents[b[0]] ? a : b
        );

        return {
            type: maxContextualIntent[0],
            confidence: maxContextualIntent[1],
            allScores: contextualIntents
        };
    }

    /**
     * 個人特化意図パターン認識
     */
    async recognizePersonalIntentPatterns(input) {
        const personalIntents = {
            habitual: 0,
            preferential: 0,
            adaptive: 0
        };

        // 履歴からパターン検出
        if (this.personalIntentHistory.length > 5) {
            const recentIntents = this.personalIntentHistory.slice(-10);
            
            // 習慣的意図検出
            const intentFrequency = {};
            recentIntents.forEach(intent => {
                if (intent.primaryIntent) {
                    intentFrequency[intent.primaryIntent.type] = 
                        (intentFrequency[intent.primaryIntent.type] || 0) + 1;
                }
            });

            const mostFrequent = Object.entries(intentFrequency).reduce((a, b) => 
                a[1] > b[1] ? a : b, ['none', 0]);
            
            if (mostFrequent[1] >= 3) {
                personalIntents.habitual = Math.min(mostFrequent[1] / 10, 0.8);
            }
        }

        // 入力パターンによる個人化
        const inputLength = input.length;
        if (inputLength > 100) {
            personalIntents.preferential += 0.3; // 詳細志向
        } else if (inputLength < 20) {
            personalIntents.adaptive += 0.4; // 簡潔志向
        }

        const maxPersonalIntent = Object.entries(personalIntents).reduce((a, b) => 
            personalIntents[a[0]] > personalIntents[b[0]] ? a : b
        );

        return {
            type: maxPersonalIntent[0],
            confidence: maxPersonalIntent[1],
            allScores: personalIntents,
            historyLength: this.personalIntentHistory.length
        };
    }

    /**
     * 暗示的意図検出
     */
    detectImplicitIntent(input, contextAnalysis) {
        const implicitIntents = [];

        // 省略された要求の検出
        if (this.containsIncompleteRequest(input)) {
            implicitIntents.push({
                type: 'completion_request',
                confidence: 0.7,
                reasoning: '不完全な要求文の検出'
            });
        }

        // 確認要求の暗示
        if (this.containsUncertainty(input)) {
            implicitIntents.push({
                type: 'confirmation_seek',
                confidence: 0.6,
                reasoning: '不確実性表現の検出'
            });
        }

        // 学習継続意図
        if (contextAnalysis.contextDepth > 2 && this.containsLearningContinuation(input)) {
            implicitIntents.push({
                type: 'learning_continuation',
                confidence: 0.8,
                reasoning: '学習継続パターンの検出'
            });
        }

        return implicitIntents;
    }

    /**
     * 感情的意図分析
     */
    analyzeEmotionalIntent(input) {
        const emotionalMarkers = {
            satisfaction: ['良い', 'いい', '素晴らしい', '完璧', 'ありがとう'],
            frustration: ['困っ', '分からない', 'うまくいかない', '難しい'],
            curiosity: ['面白い', '興味深い', 'もっと', '詳しく'],
            excitement: ['すごい', 'わくわく', '楽しみ', '期待']
        };

        const inputLower = input.toLowerCase();
        const emotionalScores = {};

        for (const [emotion, markers] of Object.entries(emotionalMarkers)) {
            let score = 0;
            for (const marker of markers) {
                if (inputLower.includes(marker)) {
                    score += 0.3;
                }
            }
            emotionalScores[emotion] = Math.min(score, 1.0);
        }

        const dominantEmotion = Object.entries(emotionalScores).reduce((a, b) => 
            a[1] > b[1] ? a : b, ['neutral', 0]);

        return {
            dominantEmotion: dominantEmotion[0],
            confidence: dominantEmotion[1],
            allEmotions: emotionalScores
        };
    }

    /**
     * 語用論的意図分析
     */
    analyzePragmaticIntent(input, contextAnalysis) {
        const pragmaticFeatures = {
            directiveness: this.calculateDirectiveness(input),
            politeness: this.calculatePoliteness(input),
            urgency: this.calculateUrgency(input),
            specificity: this.calculateSpecificity(input)
        };

        return {
            features: pragmaticFeatures,
            communicativeAct: this.determineCommunicativeAct(pragmaticFeatures),
            socialContext: this.inferSocialContext(pragmaticFeatures, contextAnalysis)
        };
    }

    /**
     * 主要意図決定
     */
    determinePrimaryIntent(basicIntent, contextualIntent, personalIntent, implicitIntents) {
        const weights = this.recognitionConfig;
        
        const combinedScore = 
            basicIntent.confidence * weights.basicIntentWeight +
            contextualIntent.confidence * weights.contextualIntentWeight +
            personalIntent.confidence * weights.personalIntentWeight;

        // 暗示的意図の高スコアチェック
        const highConfidenceImplicit = implicitIntents.find(intent => 
            intent.confidence > weights.confidenceThreshold
        );

        if (highConfidenceImplicit && highConfidenceImplicit.confidence > combinedScore) {
            return {
                type: highConfidenceImplicit.type,
                confidence: highConfidenceImplicit.confidence,
                source: 'implicit'
            };
        }

        // 複合意図の場合
        if (combinedScore > weights.confidenceThreshold) {
            return {
                type: `${basicIntent.type}_${contextualIntent.type}`,
                confidence: combinedScore,
                source: 'combined',
                components: {
                    basic: basicIntent,
                    contextual: contextualIntent,
                    personal: personalIntent
                }
            };
        }

        // 基本意図を返す
        return {
            type: basicIntent.type,
            confidence: basicIntent.confidence,
            source: 'basic'
        };
    }

    /**
     * 副次意図特定
     */
    identifySecondaryIntents(basicIntent, contextualIntent, personalIntent) {
        const secondaryIntents = [];
        const threshold = 0.4;

        // 基本意図の中で閾値以上のもの
        for (const [type, score] of Object.entries(basicIntent.allScores)) {
            if (score >= threshold && type !== basicIntent.type) {
                secondaryIntents.push({ type, confidence: score, category: 'basic' });
            }
        }

        // 文脈意図の中で閾値以上のもの
        for (const [type, score] of Object.entries(contextualIntent.allScores)) {
            if (score >= threshold && type !== contextualIntent.type) {
                secondaryIntents.push({ type, confidence: score, category: 'contextual' });
            }
        }

        return secondaryIntents.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    }

    /**
     * 信頼度計算
     */
    calculateIntentConfidence(intentAnalysis) {
        let confidence = intentAnalysis.primaryIntent ? intentAnalysis.primaryIntent.confidence : 0;

        // 副次意図による補強
        if (intentAnalysis.secondaryIntents.length > 0) {
            const secondaryBoost = intentAnalysis.secondaryIntents[0].confidence * 0.2;
            confidence += secondaryBoost;
        }

        // 暗示的意図による補強
        if (intentAnalysis.implicitIntents.length > 0) {
            const implicitBoost = Math.max(...intentAnalysis.implicitIntents.map(i => i.confidence)) * 0.15;
            confidence += implicitBoost;
        }

        // 感情的確信度による調整
        if (intentAnalysis.emotionalIntent.confidence > 0.5) {
            confidence += 0.1;
        }

        return Math.min(confidence, 1.0);
    }

    // ヘルパーメソッド群
    detectAdditionalBasicPatterns(inputLower, basicIntents) {
        // 技術学習パターン（最優先）
        if ((inputLower.includes('react') || inputLower.includes('javascript') || 
             inputLower.includes('フック') || inputLower.includes('usestate') ||
             inputLower.includes('プログラミング') || inputLower.includes('開発')) &&
            (inputLower.includes('教えて') || inputLower.includes('について') || 
             inputLower.includes('詳しく') || inputLower.includes('説明'))) {
            basicIntents.learning += 0.9; // 技術学習は最高優先度
        }

        // 質問パターン
        if (inputLower.includes('？') || inputLower.includes('?') || 
            inputLower.includes('どう') || inputLower.includes('なぜ')) {
            basicIntents.question += 0.4;
        }

        // 一般学習パターン
        if (inputLower.includes('学習') || inputLower.includes('理解') || 
            inputLower.includes('覚え') || inputLower.includes('教えて')) {
            basicIntents.learning += 0.5;
        }

        // 技術実装要求パターン
        if ((inputLower.includes('コード') || inputLower.includes('実装') || 
             inputLower.includes('例') || inputLower.includes('サンプル')) &&
            (inputLower.includes('見せて') || inputLower.includes('してください'))) {
            basicIntents.request += 0.8; // 技術実装要求
        }

        // 一般要求パターン
        else if (inputLower.includes('してください') || inputLower.includes('お願い') || 
                 inputLower.includes('作って')) {
            basicIntents.request += 0.6;
        }
    }

    containsIncompleteRequest(input) {
        const incompleteMarkers = ['...', '。。。', 'とか', 'みたいな', 'など'];
        return incompleteMarkers.some(marker => input.includes(marker));
    }

    containsUncertainty(input) {
        const uncertaintyMarkers = ['多分', 'おそらく', 'かもしれない', 'と思う', 'はず'];
        return uncertaintyMarkers.some(marker => input.includes(marker));
    }

    containsLearningContinuation(input) {
        const continuationMarkers = ['次は', 'それから', 'さらに', 'もう少し', '続き'];
        return continuationMarkers.some(marker => input.includes(marker));
    }

    calculateDirectiveness(input) {
        const directiveMarkers = ['してください', '必要', '重要', 'すぐに'];
        return directiveMarkers.filter(marker => input.includes(marker)).length * 0.25;
    }

    calculatePoliteness(input) {
        const politenessMarkers = ['お願い', 'すみません', 'ありがとう', 'お疲れ様'];
        return Math.min(politenessMarkers.filter(marker => input.includes(marker)).length * 0.3, 1.0);
    }

    calculateUrgency(input) {
        const urgencyMarkers = ['急い', 'すぐ', '至急', '緊急'];
        return Math.min(urgencyMarkers.filter(marker => input.includes(marker)).length * 0.4, 1.0);
    }

    calculateSpecificity(input) {
        const specificMarkers = ['具体的', '詳しく', '正確', '厳密'];
        return Math.min(specificMarkers.filter(marker => input.includes(marker)).length * 0.35, 1.0);
    }

    determineCommunicativeAct(pragmaticFeatures) {
        if (pragmaticFeatures.directiveness > 0.6) return 'directive';
        if (pragmaticFeatures.urgency > 0.5) return 'urgent_request';
        if (pragmaticFeatures.specificity > 0.5) return 'information_seeking';
        return 'general_communication';
    }

    inferSocialContext(pragmaticFeatures, contextAnalysis) {
        return {
            formalityLevel: pragmaticFeatures.politeness,
            collaborativeIndex: Math.max(0, 1 - pragmaticFeatures.directiveness),
            engagementLevel: (contextAnalysis.contextDepth || 0) / 10
        };
    }

    buildReasoningTrace(basicIntent, contextualIntent, personalIntent, implicitIntents) {
        return [
            `基本意図: ${basicIntent.type} (信頼度: ${basicIntent.confidence.toFixed(2)})`,
            `文脈意図: ${contextualIntent.type} (信頼度: ${contextualIntent.confidence.toFixed(2)})`,
            `個人意図: ${personalIntent.type} (信頼度: ${personalIntent.confidence.toFixed(2)})`,
            `暗示意図: ${implicitIntents.length}件検出`
        ];
    }

    updatePersonalIntentHistory(intentAnalysis) {
        this.personalIntentHistory.push({
            timestamp: Date.now(),
            primaryIntent: intentAnalysis.primaryIntent,
            confidence: intentAnalysis.confidence
        });

        if (this.personalIntentHistory.length > this.recognitionConfig.historyMaxLength) {
            this.personalIntentHistory.shift();
        }
    }

    createIntentCacheKey(input, contextAnalysis) {
        const contextKey = contextAnalysis.contextDepth || 0;
        return `${input.substring(0, 30)}_${contextKey}`;
    }

    loadFallbackPatterns() {
        this.intentPatterns = {
            basic: {
                question: "(?:[？?]|どう|なぜ|教えて)",
                learning: "(?:学習|理解|覚え)",
                request: "(?:してください|お願い|作って)"
            }
        };
        console.log('🔄 フォールバック意図パターン読み込み完了');
    }

    /**
     * エンジン統計情報
     */
    getEngineStats() {
        return {
            cacheSize: this.intentClassificationCache.size,
            personalHistoryLength: this.personalIntentHistory.length,
            patternsLoaded: Object.keys(this.intentPatterns.basic || {}).length
        };
    }

    /**
     * キャッシュクリア
     */
    clearCache() {
        this.intentClassificationCache.clear();
        console.log('🧹 意図認識キャッシュクリア完了');
    }
}

// デフォルトインスタンス
export const intentRecognitionEngine = new IntentRecognitionEngine();