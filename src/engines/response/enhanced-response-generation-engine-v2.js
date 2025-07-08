#!/usr/bin/env node
/**
 * Enhanced ResponseGenerationEngine v2.0
 * 
 * 🎯 Phase 7H.2: 統合分析パイプライン・応答生成システム
 * 🧠 DynamicTemplate・Emotion・Personal統合による次世代応答生成
 * 📊 文脈理解強化・品質最適化・個人特化応答生成
 */

import { AdvancedEmotionAnalyzer } from '../../analyzers/advanced-emotion-analyzer.js';
import { PersonalResponseAdapter } from '../../systems/adapters/personal-response-adapter.js';
import { DynamicTechnicalPatterns } from './dynamic-technical-patterns.js';
import { VocabularyDiversifier } from '../language/vocabulary-diversifier.js';
import { persistentLearningDB } from '../../data/persistent-learning-db.js';

/**
 * 統合分析結果データ構造
 */
export class UnifiedAnalysisResult {
    constructor(userInput, conversationHistory = []) {
        this.timestamp = Date.now();
        this.userInput = userInput;
        this.conversationHistory = conversationHistory;
        
        // 各分析システムの結果
        this.templateAnalysis = null;     // DynamicResponseTemplateEngine
        this.emotionAnalysis = null;      // AdvancedEmotionAnalyzer
        this.personalAnalysis = null;     // PersonalResponseAdapter
        this.technicalAnalysis = null;    // DynamicTechnicalPatterns
        
        // 統合結果
        this.contextEnrichment = null;    // 文脈理解強化結果
        this.responseStrategy = null;     // 応答戦略決定
        this.qualityMetrics = null;       // 品質評価指標
        
        // メタデータ
        this.processingTime = 0;
        this.confidence = 0;
        this.systemLoad = this.getSystemLoad();
    }
    
    getSystemLoad() {
        return {
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            timestamp: Date.now()
        };
    }
}

/**
 * 文脈理解強化エンジン（ContextTrackingSystem統合版）
 */
export class ContextEnrichmentEngine {
    constructor() {
        this.contextDepthThreshold = 0.6;
        this.semanticSimilarityThreshold = 0.4;
        this.continuityBonus = 0.2;
        
        // ContextTrackingSystem統合
        this.initializeContextTracker();
        
        console.log('✅ ContextEnrichmentEngine初期化完了');
    }
    
    /**
     * ContextTrackingSystem統合初期化
     */
    async initializeContextTracker() {
        try {
            const { ContextTrackingSystem } = await import('../dialogue/context-tracking-system.js');
            this.contextTracker = new ContextTrackingSystem();
            console.log('🔗 ContextTrackingSystem統合完了');
        } catch (error) {
            console.warn('⚠️ ContextTrackingSystem統合失敗、内蔵システム使用:', error.message);
            this.contextTracker = null;
        }
    }
    
    /**
     * 文脈分析・強化処理（ContextTrackingSystem統合版）
     */
    async enrichContext(analysisResult) {
        const startTime = Date.now();
        
        try {
            let enrichment = {};
            
            // ContextTrackingSystem優先使用
            if (this.contextTracker) {
                const contextAnalysis = await this.contextTracker.trackContext(
                    analysisResult.userInput,
                    analysisResult.conversationHistory || []
                );
                
                // ContextTrackingSystemの結果を統合
                enrichment = {
                    // 高度文脈分析結果
                    contextDepth: contextAnalysis.contextDepth,
                    topicEvolution: contextAnalysis.topicEvolution,
                    referenceChain: contextAnalysis.referenceChain,
                    contextualEntities: contextAnalysis.contextualEntities,
                    temporalFlow: contextAnalysis.temporalFlow,
                    contextBreaks: contextAnalysis.contextBreaks,
                    
                    // 既存分析との統合
                    conversationalContinuity: this.analyzeConversationalFlow(analysisResult),
                    topicalCoherence: this.analyzeTopicalCoherence(analysisResult),
                    emotionalProgression: this.analyzeEmotionalProgression(analysisResult),
                    personalContextualFit: this.analyzePersonalContextualFit(analysisResult),
                    technicalContextualDepth: this.analyzeTechnicalContext(analysisResult),
                    
                    // ContextTrackingSystem追加メトリクス
                    trackingMetrics: contextAnalysis.trackingMetrics,
                    contextualState: contextAnalysis.contextualState
                };
                
                console.log(`🔗 ContextTrackingSystem活用: 深度=${contextAnalysis.contextDepth}, 話題変遷=${contextAnalysis.topicEvolution.length}件`);
            } else {
                // フォールバック: 内蔵システム使用
                enrichment = {
                    conversationalContinuity: this.analyzeConversationalFlow(analysisResult),
                    topicalCoherence: this.analyzeTopicalCoherence(analysisResult),
                    emotionalProgression: this.analyzeEmotionalProgression(analysisResult),
                    personalContextualFit: this.analyzePersonalContextualFit(analysisResult),
                    technicalContextualDepth: this.analyzeTechnicalContext(analysisResult)
                };
            }
            
            // 統合文脈スコア計算（強化版）
            enrichment.overallContextScore = this.calculateEnhancedContextScore(enrichment);
            enrichment.contextConfidence = this.calculateContextConfidence(enrichment);
            enrichment.processingTime = Date.now() - startTime;
            
            analysisResult.contextEnrichment = enrichment;
            
            console.log(`📊 文脈理解強化完了: スコア=${enrichment.overallContextScore.toFixed(2)}, 信頼度=${enrichment.contextConfidence.toFixed(2)}`);
            
            return enrichment;
            
        } catch (error) {
            console.error('❌ 文脈理解強化エラー:', error.message);
            return this.createFallbackEnrichment();
        }
    }
    
    analyzeConversationalFlow(analysisResult) {
        const history = analysisResult.conversationHistory;
        if (history.length === 0) return { continuity: 0, flow: 'initial' };
        
        // 会話の連続性分析
        const recentTurns = history.slice(-3);
        let flowScore = 0.5; // ベーススコア
        
        // 話題の継続性
        if (recentTurns.length > 1) {
            const topicSimilarity = this.calculateTopicSimilarity(
                recentTurns[recentTurns.length - 1],
                analysisResult.userInput
            );
            flowScore += topicSimilarity * this.continuityBonus;
        }
        
        return {
            continuity: Math.min(flowScore, 1.0),
            flow: flowScore > 0.7 ? 'continuous' : flowScore > 0.4 ? 'transitional' : 'divergent',
            turnCount: history.length
        };
    }
    
    analyzeTopicalCoherence(analysisResult) {
        // 話題の一貫性分析
        const technical = analysisResult.technicalAnalysis;
        const template = analysisResult.templateAnalysis;
        
        let coherence = 0.5;
        
        if (technical?.isTechnical) {
            coherence += 0.3;
        }
        
        if (template?.templateType && template.confidence > 0.5) {
            coherence += 0.2;
        }
        
        return {
            score: Math.min(coherence, 1.0),
            factors: ['technical_continuity', 'template_alignment']
        };
    }
    
    analyzeEmotionalProgression(analysisResult) {
        const emotion = analysisResult.emotionAnalysis;
        if (!emotion) return { progression: 'neutral', stability: 0.5 };
        
        // 感情の進行・安定性分析
        return {
            progression: emotion.dominantEmotion || 'neutral',
            stability: emotion.confidence || 0.5,
            trend: 'stable' // 簡略実装
        };
    }
    
    analyzePersonalContextualFit(analysisResult) {
        const personal = analysisResult.personalAnalysis;
        if (!personal) return { fit: 0.5, adaptation: 'standard' };
        
        // 個人特性との適合性分析
        return {
            fit: personal.adaptationStrength || 0.5,
            adaptation: personal.adaptationStrength > 0.7 ? 'high' : 'standard',
            factors: personal.personalFactors || {}
        };
    }
    
    analyzeTechnicalContext(analysisResult) {
        const technical = analysisResult.technicalAnalysis;
        if (!technical?.isTechnical) return { depth: 0, category: 'general' };
        
        return {
            depth: technical.confidence || 0.5,
            category: technical.category || 'general',
            complexity: technical.confidence > 0.7 ? 'high' : 'medium'
        };
    }
    
    calculateOverallContextScore(enrichment) {
        const weights = {
            conversationalContinuity: 0.25,
            topicalCoherence: 0.25,
            emotionalProgression: 0.2,
            personalContextualFit: 0.15,
            technicalContextualDepth: 0.15
        };
        
        let score = 0;
        score += enrichment.conversationalContinuity.continuity * weights.conversationalContinuity;
        score += enrichment.topicalCoherence.score * weights.topicalCoherence;
        score += enrichment.emotionalProgression.stability * weights.emotionalProgression;
        score += enrichment.personalContextualFit.fit * weights.personalContextualFit;
        score += enrichment.technicalContextualDepth.depth * weights.technicalContextualDepth;
        
        return score;
    }
    
    /**
     * ContextTrackingSystem統合版文脈スコア計算
     */
    calculateEnhancedContextScore(enrichment) {
        // ContextTrackingSystemの高度メトリクスがある場合は優先使用
        if (enrichment.trackingMetrics && enrichment.contextualState) {
            const contextWeights = {
                // ContextTrackingSystem高度メトリクス
                overallContextQuality: 0.3,
                topicStability: 0.15,
                referenceClarity: 0.1,
                temporalConsistency: 0.1,
                
                // 既存分析との統合
                conversationalContinuity: 0.15,
                topicalCoherence: 0.1,
                emotionalProgression: 0.05,
                personalContextualFit: 0.05
            };
            
            let enhancedScore = 0;
            
            // ContextTrackingSystemメトリクス
            enhancedScore += (enrichment.trackingMetrics.overallContextQuality || 0.5) * contextWeights.overallContextQuality;
            enhancedScore += (enrichment.trackingMetrics.topicStability || 0.5) * contextWeights.topicStability;
            enhancedScore += (enrichment.trackingMetrics.referenceClarity || 0.5) * contextWeights.referenceClarity;
            enhancedScore += (enrichment.trackingMetrics.temporalConsistency || 0.5) * contextWeights.temporalConsistency;
            
            // 既存分析との統合（利用可能な場合）
            if (enrichment.conversationalContinuity) {
                enhancedScore += enrichment.conversationalContinuity.continuity * contextWeights.conversationalContinuity;
            }
            if (enrichment.topicalCoherence) {
                enhancedScore += enrichment.topicalCoherence.score * contextWeights.topicalCoherence;
            }
            if (enrichment.emotionalProgression) {
                enhancedScore += enrichment.emotionalProgression.stability * contextWeights.emotionalProgression;
            }
            if (enrichment.personalContextualFit) {
                enhancedScore += enrichment.personalContextualFit.fit * contextWeights.personalContextualFit;
            }
            
            return Math.min(enhancedScore, 1.0);
        } else {
            // フォールバック: 従来方式
            return this.calculateOverallContextScore(enrichment);
        }
    }
    
    calculateContextConfidence(enrichment) {
        // 各要素の信頼度から総合信頼度計算
        const factors = [
            enrichment.conversationalContinuity.continuity,
            enrichment.topicalCoherence.score,
            enrichment.emotionalProgression.stability,
            enrichment.personalContextualFit.fit,
            enrichment.technicalContextualDepth.depth
        ];
        
        const avg = factors.reduce((sum, f) => sum + f, 0) / factors.length;
        const variance = factors.reduce((sum, f) => sum + Math.pow(f - avg, 2), 0) / factors.length;
        
        // 分散が小さいほど信頼度が高い
        return Math.max(0.3, 1 - Math.sqrt(variance));
    }
    
    calculateTopicSimilarity(turn1, currentInput) {
        // 簡略版話題類似度計算
        const text1 = (typeof turn1 === 'string' ? turn1 : (turn1?.content || turn1?.message || turn1?.userMessage || '')).toLowerCase();
        const text2 = currentInput.toLowerCase();
        
        const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
        const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
        
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    
    createFallbackEnrichment() {
        return {
            conversationalContinuity: { continuity: 0.5, flow: 'transitional' },
            topicalCoherence: { score: 0.5, factors: [] },
            emotionalProgression: { progression: 'neutral', stability: 0.5 },
            personalContextualFit: { fit: 0.5, adaptation: 'standard' },
            technicalContextualDepth: { depth: 0.3, category: 'general' },
            overallContextScore: 0.5,
            contextConfidence: 0.5,
            processingTime: 0
        };
    }
}

/**
 * Enhanced ResponseGenerationEngine v2.0 メインクラス
 */
export class EnhancedResponseGenerationEngineV2 {
    constructor(options = {}) {
        // 統合コンポーネント初期化
        this.emotionAnalyzer = new AdvancedEmotionAnalyzer();
        this.personalAdapter = null; // 外部から注入
        this.technicalPatterns = new DynamicTechnicalPatterns();
        
        // 新規コンポーネント
        this.contextEnrichmentEngine = new ContextEnrichmentEngine();
        
        // 語彙多様化エンジン（ローカル・無料自然性向上）
        this.vocabularyDiversifier = new VocabularyDiversifier();
        
        // 設定
        this.config = {
            enableEmotionAnalysis: true,
            enablePersonalAdaptation: true,
            enableContextEnrichment: true,
            enableVocabularyDiversification: true, // 語彙多様化
            enableLearningIntegration: true, // 学習データ統合
            qualityThreshold: 0.7,
            maxProcessingTime: 5000,
            ...options
        };
        
        // 統計
        this.stats = {
            totalRequests: 0,
            successfulResponses: 0,
            averageProcessingTime: 0,
            averageQualityScore: 0,
            lastProcessingTime: Date.now()
        };
        
        console.log('🚀 Enhanced ResponseGenerationEngine v2.0 + Vocabulary Diversifier + Learning Integration 初期化完了');
        console.log(`📊 設定: Emotion=${this.config.enableEmotionAnalysis}, Personal=${this.config.enablePersonalAdaptation}, VocabDiversify=${this.config.enableVocabularyDiversification}, Learning=${this.config.enableLearningIntegration}`);
    }
    
    /**
     * PersonalResponseAdapter設定
     */
    setPersonalAdapter(personalAdapter) {
        this.personalAdapter = personalAdapter;
        console.log('✅ PersonalResponseAdapter統合完了');
    }
    
    /**
     * 統合応答生成メイン処理
     */
    async generateUnifiedResponse(userInput, conversationHistory = [], userProfile = {}) {
        const startTime = Date.now();
        this.stats.totalRequests++;
        
        try {
            console.log(`🎯 Enhanced ResponseGeneration v2.0 開始: "${userInput.substring(0, 50)}..."`);
            
            // DialogueAPIから分析データが渡された場合の処理
            let actualConversationHistory = [];
            let externalAnalysisData = null;
            
            if (conversationHistory && conversationHistory.generalAnalysis) {
                // conversationHistoryがanalysisDataオブジェクトの場合
                externalAnalysisData = conversationHistory;
                actualConversationHistory = conversationHistory.conversationHistory || [];
                console.log(`🔗 外部分析データ受信: generalAnalysis.category="${externalAnalysisData.generalAnalysis?.category}"`);
            } else {
                // 通常の会話履歴配列の場合
                actualConversationHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
            }
            
            // 1. 統合分析結果初期化
            const analysisResult = new UnifiedAnalysisResult(userInput, actualConversationHistory);
            
            // 2. 外部分析データがあれば統合（Phase 1汎用AI化対応）
            if (externalAnalysisData) {
                if (externalAnalysisData.generalAnalysis) {
                    analysisResult.generalAnalysis = externalAnalysisData.generalAnalysis;
                    console.log(`🔗 外部generalAnalysis統合: category="${analysisResult.generalAnalysis.category}"`);
                }
                if (externalAnalysisData.emotionAnalysis) {
                    analysisResult.emotionAnalysis = externalAnalysisData.emotionAnalysis;
                }
                if (externalAnalysisData.templateAnalysis) {
                    analysisResult.templateAnalysis = externalAnalysisData.templateAnalysis;
                }
                if (externalAnalysisData.personalAnalysis) {
                    analysisResult.personalAnalysis = externalAnalysisData.personalAnalysis;
                }
            }
            
            // 3. 不足している分析データを内部で補完
            if (!analysisResult.technicalAnalysis) {
                await this.performUnifiedAnalysis(analysisResult, userProfile);
            }
            
            console.log(`🔍 統合分析完了: generalAnalysis=`, analysisResult.generalAnalysis, `technicalAnalysis=`, analysisResult.technicalAnalysis);
            
            // 4. 文脈理解強化
            if (this.config.enableContextEnrichment) {
                await this.contextEnrichmentEngine.enrichContext(analysisResult);
            }
            
            // 5. 応答戦略決定
            const responseStrategy = this.determineResponseStrategy(analysisResult);
            analysisResult.responseStrategy = responseStrategy;
            
            // 5. 統合応答生成
            const finalResponse = await this.generateFinalResponse(analysisResult);
            
            // 6. 品質評価・最適化
            const qualityMetrics = this.evaluateResponseQuality(analysisResult, finalResponse);
            analysisResult.qualityMetrics = qualityMetrics;
            
            // 7. 統計更新
            analysisResult.processingTime = Date.now() - startTime;
            this.updateStats(analysisResult, true);
            
            console.log(`✅ Enhanced ResponseGeneration v2.0 完了: ${analysisResult.processingTime}ms, 品質=${qualityMetrics.overallScore.toFixed(2)}`);
            
            // 語彙多様化統計の収集（遅延読み込み対応）
            const vocabularyStats = this.vocabularyDiversifier ? {
                dictionaryEntries: this.vocabularyDiversifier.dictionaryDB?.getSize() || 0,
                synonymMapSize: this.vocabularyDiversifier.dictionaryDB?.synonymMap?.size || 0,
                diversificationEnabled: this.config.enableVocabularyDiversification,
                diversificationApplied: finalResponse !== analysisResult.userInput,
                dictionaryStatus: this.vocabularyDiversifier.dictionaryDB ? 'loaded' : 'loading',
                internalSynonyms: Object.keys(this.vocabularyDiversifier.synonymDict?.emotionSynonyms || {}).length
            } : null;

            return {
                response: finalResponse,
                analysisResult: analysisResult,
                analysis: {
                    vocabularyDiversification: vocabularyStats,
                    dictionaryStats: vocabularyStats,
                    processingTime: analysisResult.processingTime,
                    qualityScore: qualityMetrics.overallScore,
                    responseStrategy: responseStrategy.primary
                },
                metadata: {
                    processingTime: analysisResult.processingTime,
                    qualityScore: qualityMetrics.overallScore,
                    responseStrategy: responseStrategy.primary,
                    systemVersion: 'v2.0'
                }
            };
            
        } catch (error) {
            console.error('❌ Enhanced ResponseGeneration v2.0 エラー:', error.message);
            this.updateStats(null, false);
            
            return {
                response: "申し訳ございませんが、エラーが発生しました。もう一度お試しください。",
                error: error.message,
                metadata: {
                    processingTime: Date.now() - startTime,
                    systemVersion: 'v2.0'
                }
            };
        }
    }
    
    /**
     * 統合分析実行
     */
    async performUnifiedAnalysis(analysisResult, userProfile) {
        const analysisPromises = [];
        
        // 技術パターン分析（同期）
        try {
            analysisResult.technicalAnalysis = this.technicalPatterns.isTechnicalQuery(analysisResult.userInput);
        } catch (err) {
            console.warn('技術パターン分析エラー:', err.message);
            analysisResult.technicalAnalysis = { isTechnical: false, confidence: 0 };
        }
        
        
        // 感情分析
        if (this.config.enableEmotionAnalysis) {
            analysisPromises.push(
                this.analyzeEmotionalState(analysisResult)
                    .catch(err => console.warn('感情分析エラー:', err.message))
            );
        }
        
        // 個人特化分析
        if (this.config.enablePersonalAdaptation && this.personalAdapter) {
            analysisPromises.push(
                this.analyzePersonalContext(analysisResult, userProfile)
                    .catch(err => console.warn('個人特化分析エラー:', err.message))
            );
        }
        
        // 学習データ統合分析
        if (this.config.enableLearningIntegration) {
            analysisPromises.push(
                this.analyzeLearningContext(analysisResult, userProfile)
                    .catch(err => console.warn('学習データ分析エラー:', err.message))
            );
        }
        
        // 並列実行
        await Promise.allSettled(analysisPromises);
    }
    
    
    async analyzeEmotionalState(analysisResult) {
        // AdvancedEmotionAnalyzerとの統合
        const emotion = await this.emotionAnalyzer.analyzeAdvancedEmotion(
            analysisResult.userInput,
            analysisResult.conversationHistory
        );
        analysisResult.emotionAnalysis = emotion;
    }
    
    async analyzePersonalContext(analysisResult, userProfile) {
        // PersonalResponseAdapterとの統合
        if (this.personalAdapter && this.personalAdapter.analyzePersonalContext) {
            const personal = await this.personalAdapter.analyzePersonalContext(
                analysisResult.userInput,
                userProfile,
                analysisResult.conversationHistory
            );
            analysisResult.personalAnalysis = personal;
        }
    }
    
    async analyzeLearningContext(analysisResult, userProfile) {
        // 学習データベースから関連情報を取得
        try {
            const userId = userProfile?.userId || 'default';
            
            // ユーザーの関係性データを取得
            const userRelations = await persistentLearningDB.getUserRelations(userId);
            
            // 会話履歴を取得
            const conversationHistory = await persistentLearningDB.getConversationHistory(userId, 5);
            
            // 学習統計を取得
            const learningStats = await persistentLearningDB.getLearningStats();
            
            // 分析結果に学習データを統合
            analysisResult.learningAnalysis = {
                userRelations: userRelations || [],
                pastConversations: conversationHistory || [],
                learningStats: learningStats || {},
                hasLearningData: (userRelations?.length > 0) || (conversationHistory?.length > 0),
                adaptationStrength: this.calculateAdaptationStrength(userRelations, conversationHistory)
            };
            
            console.log(`📚 学習データ統合: 関係性${userRelations?.length || 0}件, 履歴${conversationHistory?.length || 0}件`);
        } catch (error) {
            console.warn('学習データ統合エラー:', error.message);
            analysisResult.learningAnalysis = {
                userRelations: [],
                pastConversations: [],
                hasLearningData: false,
                adaptationStrength: 0
            };
        }
    }
    
    calculateAdaptationStrength(userRelations, conversationHistory) {
        const relationScore = Math.min((userRelations?.length || 0) / 10, 1.0);
        const historyScore = Math.min((conversationHistory?.length || 0) / 5, 1.0);
        return (relationScore + historyScore) / 2;
    }
    
    /**
     * 応答戦略決定
     */
    determineResponseStrategy(analysisResult) {
        const strategy = {
            primary: 'general', // デフォルトを'general'に変更（汎用AI化）
            secondary: [],
            confidence: 0.5,
            reasoning: []
        };
        
        // 感情・日常会話を最優先
        const generalAnalysis = analysisResult.generalAnalysis;
        if (generalAnalysis?.category && ['gratitude', 'emotional_support', 'greeting', 'learning_support'].includes(generalAnalysis.category)) {
            strategy.primary = 'general';
            strategy.confidence += 0.4;
            strategy.reasoning.push(`感情・日常会話検出: ${generalAnalysis.category}`);
        }
        // 技術的コンテンツは次の優先度
        else if (analysisResult.technicalAnalysis?.isTechnical) {
            strategy.primary = 'technical';
            strategy.confidence += 0.3;
            strategy.reasoning.push('技術的内容検出');
        }
        
        // テンプレート適用戦略
        if (analysisResult.templateAnalysis?.confidence > 0.5) {
            strategy.secondary.push('template_driven');
            strategy.confidence += 0.2;
            strategy.reasoning.push('テンプレート適用');
        }
        
        // 感情考慮戦略
        if (analysisResult.emotionAnalysis?.confidence > 0.6) {
            strategy.secondary.push('emotion_aware');
            strategy.confidence += 0.15;
            strategy.reasoning.push('感情配慮');
        }
        
        // 学習データ活用戦略
        if (analysisResult.learningAnalysis?.hasLearningData) {
            strategy.secondary.push('learning_enhanced');
            strategy.confidence += analysisResult.learningAnalysis.adaptationStrength * 0.2;
            strategy.reasoning.push(`学習データ活用 (強度: ${(analysisResult.learningAnalysis.adaptationStrength * 100).toFixed(0)}%)`);
        }
        
        // 個人特化戦略
        if (analysisResult.personalAnalysis?.adaptationStrength > 0.6) {
            strategy.secondary.push('personalized');
            strategy.confidence += 0.15;
            strategy.reasoning.push('個人特化');
        }
        
        strategy.confidence = Math.min(strategy.confidence, 1.0);
        
        console.log(`🎯 応答戦略決定: primary="${strategy.primary}", confidence=${strategy.confidence.toFixed(2)}, reasoning=[${strategy.reasoning.join(', ')}]`);
        
        return strategy;
    }
    
    /**
     * 最終応答生成
     */
    async generateFinalResponse(analysisResult) {
        const strategy = analysisResult.responseStrategy;
        let response = "";
        
        // 戦略に基づく応答生成
        switch (strategy.primary) {
            case 'technical':
            case 'general':
                response = await this.generateGeneralResponse(analysisResult);
                break;
            case 'emotional':
                response = await this.generateEmotionalResponse(analysisResult);
                break;
            case 'personalized':
                response = await this.generatePersonalizedResponse(analysisResult);
                break;
            default:
                response = await this.generateBalancedResponse(analysisResult);
        }
        
        // 二次戦略適用
        for (const secondaryStrategy of strategy.secondary) {
            response = await this.applySecondaryStrategy(response, secondaryStrategy, analysisResult);
        }
        
        return response;
    }
    
    async generateGeneralResponse(analysisResult) {
        console.log(`🔍 GeneralResponse開始: generalAnalysis=`, analysisResult.generalAnalysis, `technicalAnalysis=`, analysisResult.technicalAnalysis);
        
        const general = analysisResult.generalAnalysis || analysisResult.technicalAnalysis || { 
            category: 'general_conversation',
            confidence: 0.5,
            patterns: [],
            conversationType: 'statement'
        }; // 後方互換性 + デフォルト値
        const userInput = analysisResult.userInput;
        const template = analysisResult.templateAnalysis;
        
        // 1. 学習データ強化応答生成
        if (analysisResult.learningAnalysis?.hasLearningData) {
            const learningEnhancedResponse = await this.generateLearningEnhancedResponse(userInput, general, analysisResult.learningAnalysis);
            if (learningEnhancedResponse) {
                console.log(`🧠 学習強化応答生成成功: "${userInput}"`);
                return learningEnhancedResponse;
            }
        }
        
        // 2. 感情・日常会話重視のカテゴリ別応答生成
        console.log(`🔍 カテゴリ別応答判定: category="${general?.category}", userInput="${userInput}"`);
        if (general?.category) {
            switch (general.category) {
                case 'gratitude':
                    console.log(`💝 感謝応答生成: "${userInput}"`);
                    return await this.generateGratitudeResponse(userInput, general);
                case 'emotional_support':
                    console.log(`🤗 感情サポート応答生成: "${userInput}"`);
                    return await this.generateEmotionalSupportResponse(userInput, general);
                case 'greeting':
                    console.log(`👋 挨拶応答生成: "${userInput}"`);
                    return await this.generateGreetingResponse(userInput, general);
                case 'learning_support':
                    console.log(`📚 学習サポート応答生成: "${userInput}"`);
                    return await this.generateLearningSupportResponse(userInput, general);
                case 'comparison_request':
                    console.log(`⚖️ 比較応答生成: "${userInput}"`);
                    return await this.generateComparisonResponse(userInput, general);
                case 'how_to_request':
                    console.log(`❓ 方法応答生成: "${userInput}"`);
                    return await this.generateHowToResponse(userInput, general);
                case 'technical_inquiry':
                    console.log(`🔧 技術応答生成: "${userInput}"`);
                    return await this.generateTechnicalInquiryResponse(userInput, general);
                default:
                    console.log(`💬 汎用応答生成: "${userInput}" (カテゴリ: ${general.category})`);
                    return await this.generateGeneralConversationResponse(userInput, general);
            }
        }
        
        // 3. インテリジェントフォールバック
        return this.generateIntelligentFallback(userInput, { type: 'general', context: general });
    }
    
    async generateEmotionalResponse(analysisResult) {
        const emotion = analysisResult.emotionAnalysis;
        const userInput = analysisResult.userInput;
        const dominantEmotion = emotion?.dominantEmotion || 'neutral';
        let baseResponse;
        
        // 感謝応答の具体化
        if (userInput.includes('ありがとう') || userInput.includes('参考になり') || userInput.includes('助かり')) {
            baseResponse = "お役に立てて嬉しいです！他にもご質問がございましたら、いつでもお聞かせください。どのような技術的な課題でもサポートいたします。";
        }
        // ヘルプ要求の具体化
        else if (userInput.includes('困って') || userInput.includes('助けて') || userInput.includes('エラー') || userInput.includes('動かない')) {
            baseResponse = "お困りの状況をお察しします。具体的なエラー内容や発生している状況を教えていただければ、解決策をご提案できます。どのような問題が発生していますか？";
        }
        // 感情別応答の具体化
        else {
            switch (dominantEmotion) {
                case 'excitement':
                    baseResponse = `とても興味深いご質問ですね！「${this.extractKeyTopic(userInput)}」について詳しくお答えします。`;
                    break;
                case 'curiosity':
                    baseResponse = `探求心溢れるご質問ですね。「${this.extractKeyTopic(userInput)}」について一緒に考えてみましょう。`;
                    break;
                case 'frustration':
                    baseResponse = "お困りのようですね。問題解決に向けて一緒に取り組みましょう。具体的な状況を教えていただけますか？";
                    break;
                case 'satisfaction':
                    baseResponse = "良い方向に進んでいるようですね。さらなる向上に向けてサポートします。";
                    break;
                default:
                    baseResponse = await this.generateIntelligentFallback(userInput, { type: 'emotional', emotion: dominantEmotion });
            }
        }
        
        // 語彙多様化処理（感情応答対応）
        if (this.config.enableVocabularyDiversification && baseResponse) {
            const context = {
                category: 'emotional_response',
                emotion: dominantEmotion,
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: analysisResult.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generatePersonalizedResponse(analysisResult) {
        let baseResponse;
        
        if (this.personalAdapter && this.personalAdapter.generatePersonalizedResponse) {
            baseResponse = await this.personalAdapter.generatePersonalizedResponse(
                analysisResult.userInput,
                analysisResult.personalAnalysis
            );
        } else {
            baseResponse = "あなたの特性に合わせて回答いたします。";
        }
        
        // 語彙多様化処理（個人適応対応）
        if (this.config.enableVocabularyDiversification && baseResponse) {
            const context = {
                category: 'personalized_response',
                personalAnalysis: analysisResult.personalAnalysis,
                politeness: this.determinePoliteness(analysisResult.userInput, {}),
                intensity: this.determineIntensity(analysisResult.userInput),
                conversationHistory: analysisResult.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateBalancedResponse(analysisResult) {
        const userInput = analysisResult.userInput;
        const contextScore = analysisResult.contextEnrichment?.overallContextScore || 0.5;
        let baseResponse;
        
        // 天気等の一般質問への具体的対応
        if (userInput.includes('天気')) {
            baseResponse = "申し訳ございませんが、リアルタイムの天気情報は提供できません。天気予報は気象庁のWebサイトや天気アプリをご利用ください。他の技術的なご質問でしたらお答えできます。";
        }
        // 挨拶への対応
        else if (userInput.includes('こんに') || userInput.includes('おはよう') || userInput.includes('こんばん')) {
            baseResponse = "こんにちは！技術的なご質問やプログラミングに関するお困りごとがございましたら、お気軽にお聞かせください。";
        }
        // 文脈スコアに基づく応答
        else if (contextScore > 0.7) {
            const keyTopic = this.extractKeyTopic(userInput);
            baseResponse = `文脈を踏まえて、「${keyTopic}」について詳しくお答えします。どの側面について特に知りたいでしょうか？`;
        } else {
            baseResponse = await this.generateIntelligentFallback(userInput, { type: 'balanced', contextScore });
        }
        
        // 語彙多様化処理（バランス応答対応）
        if (this.config.enableVocabularyDiversification && baseResponse) {
            const context = {
                category: 'balanced_response',
                contextScore: contextScore,
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: analysisResult.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async applySecondaryStrategy(response, strategy, analysisResult) {
        switch (strategy) {
            case 'template_driven':
                // テンプレート要素追加
                break;
            case 'emotion_aware':
                // 感情考慮の調整
                const emotion = analysisResult.emotionAnalysis?.dominantEmotion;
                if (emotion === 'frustration') {
                    response = "お困りの状況を理解いたします。" + response;
                }
                break;
            case 'personalized':
                // 個人特化調整
                break;
        }
        
        return response;
    }
    
    /**
     * 応答品質評価
     */
    evaluateResponseQuality(analysisResult, response) {
        const metrics = {
            relevance: this.evaluateRelevance(analysisResult, response),
            coherence: this.evaluateCoherence(response),
            completeness: this.evaluateCompleteness(analysisResult, response),
            personalization: this.evaluatePersonalization(analysisResult, response),
            technicalAccuracy: this.evaluateTechnicalAccuracy(analysisResult, response)
        };
        
        // 重み付き総合スコア
        const weights = { relevance: 0.3, coherence: 0.25, completeness: 0.2, personalization: 0.15, technicalAccuracy: 0.1 };
        metrics.overallScore = Object.entries(weights)
            .reduce((sum, [key, weight]) => sum + metrics[key] * weight, 0);
        
        return metrics;
    }
    
    evaluateRelevance(analysisResult, response) {
        // 関連性評価（簡略版）
        const inputWords = new Set(analysisResult.userInput.toLowerCase().split(/\s+/));
        const responseWords = new Set(response.toLowerCase().split(/\s+/));
        const intersection = new Set([...inputWords].filter(w => responseWords.has(w)));
        
        return Math.min(intersection.size / Math.max(inputWords.size, 1), 1.0);
    }
    
    evaluateCoherence(response) {
        // 一貫性評価（文長・構造を考慮）
        const sentences = response.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
        const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / Math.max(sentences.length, 1);
        
        return Math.min(avgLength / 100, 1.0); // 100文字程度を基準
    }
    
    evaluateCompleteness(analysisResult, response) {
        // 完全性評価
        return response.length > 50 ? 0.8 : 0.4;
    }
    
    evaluatePersonalization(analysisResult, response) {
        return analysisResult.personalAnalysis?.adaptationStrength || 0.5;
    }
    
    evaluateTechnicalAccuracy(analysisResult, response) {
        return analysisResult.technicalAnalysis?.isTechnical ? 0.8 : 0.6;
    }
    
    /**
     * 統計更新
     */
    updateStats(analysisResult, success) {
        if (success) {
            this.stats.successfulResponses++;
            
            if (analysisResult) {
                this.stats.averageProcessingTime = 
                    (this.stats.averageProcessingTime * (this.stats.successfulResponses - 1) + analysisResult.processingTime) / this.stats.successfulResponses;
                
                if (analysisResult.qualityMetrics) {
                    this.stats.averageQualityScore = 
                        (this.stats.averageQualityScore * (this.stats.successfulResponses - 1) + analysisResult.qualityMetrics.overallScore) / this.stats.successfulResponses;
                }
            }
        }
        
        this.stats.lastProcessingTime = Date.now();
    }
    
    /**
     * 🌟 感情・日常会話重視応答生成メソッド群
     */
    
    async generateGratitudeResponse(userInput, general) {
        let baseResponse = "お役に立てて嬉しいです！😊\n\n他にもご質問やお手伝いできることがございましたら、いつでもお気軽にお声かけください。どのようなことでもサポートいたします。";
        
        // 語彙多様化処理（ローカル・無料自然性向上）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'gratitude',
                politeness: this.determinePoliteness(userInput, general),
                intensity: this.determineIntensity(userInput),
                conversationHistory: general?.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateEmotionalSupportResponse(userInput, general) {
        let baseResponse;
        if (userInput.includes('落ち込') || userInput.includes('つらい')) {
            baseResponse = "お疲れ様です。落ち込むこともありますよね。\n\n一人で抱え込まずに、お話しいただけて良かったです。どのようなことでお困りですか？具体的な状況を教えていただければ、一緒に解決策を考えましょう。";
        } else if (userInput.includes('困って') || userInput.includes('不安')) {
            baseResponse = "お困りの状況をお察しします。不安な気持ち、よく分かります。\n\n解決に向けて一緒に取り組みましょう。具体的にどのような問題が発生していますか？詳しく教えていただければ、適切なアドバイスをご提案できます。";
        } else {
            baseResponse = "大変そうですね。お疲れ様です。\n\nどのようなことでお悩みでしょうか？お聞かせください。一緒に解決策を考えましょう。";
        }
        
        // 語彙多様化処理（ローカル・無料自然性向上）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'emotional_support',
                politeness: this.determinePoliteness(userInput, general),
                intensity: this.determineIntensity(userInput),
                conversationHistory: general?.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateGreetingResponse(userInput, general) {
        let baseResponse;
        if (userInput.includes('おはよう')) {
            baseResponse = "おはようございます！☀️\n\n今日も良い一日になりますように。何かお手伝いできることがあれば、お気軽にお声かけくださいね。";
        } else if (userInput.includes('こんにちは') || userInput.includes('こんに')) {
            baseResponse = "こんにちは！😊\n\nお疲れ様です。今日はどのようなことでお手伝いできるでしょうか？";
        } else if (userInput.includes('はじめまして')) {
            baseResponse = "はじめまして！お会いできて嬉しいです。😊\n\n私はあなたの学習や相談をサポートするAIアシスタントです。どのようなことでもお気軽にご相談ください。よろしくお願いします！";
        } else {
            baseResponse = "こんにちは！\n\n今日はどのようなことでお手伝いできるでしょうか？何でもお気軽にお聞かせください。";
        }
        
        // 語彙多様化処理（ローカル・無料自然性向上）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'greeting',
                politeness: this.determinePoliteness(userInput, general),
                intensity: this.determineIntensity(userInput),
                conversationHistory: general?.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateLearningSupportResponse(userInput, general) {
        let baseResponse;
        if (userInput.includes('初心者') || userInput.includes('始め')) {
            baseResponse = "学習を始められるのですね！素晴らしいです！🌟\n\n初心者の方には、基本から一歩ずつ確実に進むことをおすすめします。あなたのペースに合わせて、分かりやすくサポートします。\n\nどの分野の学習をお考えですか？具体的な目標があれば教えてください。";
        } else if (userInput.includes('勉強方法') || userInput.includes('学習方法')) {
            baseResponse = "効果的な学習方法についてお答えします！📚\n\n一人ひとりに最適な学習スタイルがありますので、あなたに合った方法を一緒に見つけましょう。どのような分野を学習されたいのか、現在のレベルや目標を教えてください。";
        } else {
            baseResponse = "学習についてのご質問ですね！📝\n\nあなたの目標達成をサポートします。どの分野について学びたいか、どのようなことで困っているかを詳しく教えてください。";
        }
        
        // 語彙多様化処理（ローカル・無料自然性向上）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'learning_support',
                politeness: this.determinePoliteness(userInput, general),
                intensity: this.determineIntensity(userInput),
                conversationHistory: general?.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateTechnicalInquiryResponse(userInput, general) {
        let baseResponse;
        if (userInput.includes('初心者') && userInput.includes('プログラミング')) {
            baseResponse = "プログラミング学習を始められるのですね！素晴らしいです！💻\n\n初心者の方には、まず基本的な概念から始めることをおすすめします。あなたの興味や目標に合わせて、最適な学習パスをご提案できます。\n\nどのような分野に興味がありますか？Webサイト作成、アプリ開発、データ分析など、目指したい方向があれば教えてください。";
        } else {
            baseResponse = "技術的なご質問ですね！🔧\n\nあなたのレベルや目的に合わせて、分かりやすく説明いたします。具体的にどのような技術や課題についてお聞きしたいでしょうか？";
        }
        
        // 語彙多様化処理（技術分野対応）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'technical_inquiry',
                politeness: this.determinePoliteness(userInput, general),
                intensity: this.determineIntensity(userInput),
                conversationHistory: general?.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateGeneralConversationResponse(userInput, general) {
        let baseResponse = `「${this.extractKeyTopic(userInput)}」についてお話ししましょう！\n\n何でもお気軽にお聞かせください。あなたのお役に立てるよう、できる限りサポートいたします。どのような点について詳しく知りたいでしょうか？`;
        
        // 語彙多様化処理（一般会話対応）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'general_conversation',
                politeness: this.determinePoliteness(userInput, general),
                intensity: this.determineIntensity(userInput),
                conversationHistory: general?.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    /**
     * 丁寧度判定
     */
    determinePoliteness(userInput, general) {
        // 深い感謝表現
        if (userInput.includes('心より') || userInput.includes('深く') || userInput.includes('本当に')) {
            return 'formal';
        }
        
        // カジュアルな表現
        if (/！|!|😊|😄|すごく|めっちゃ/.test(userInput)) {
            return 'casual';
        }
        
        return 'standard';
    }
    
    /**
     * 感情強度判定
     */
    determineIntensity(userInput) {
        // 高強度表現
        if (userInput.includes('とても') || userInput.includes('すごく') || userInput.includes('本当に')) {
            return 'high';
        }
        
        // 低強度表現
        if (userInput.includes('ちょっと') || userInput.includes('少し') || userInput.includes('まあ')) {
            return 'low';
        }
        
        return 'medium';
    }

    /**
     * 🔧 既存技術系カテゴリ別応答生成メソッド群（後方互換性）
     */
    async generateDataScienceResponse(userInput, technical) {
        let baseResponse;
        if (userInput.includes('比較') || userInput.includes('違い')) {
            const tools = this.extractComparisonTargets(userInput);
            baseResponse = `データサイエンス分野での${tools}の比較についてお答えします。\n\n用途、性能、学習コスト、エコシステムの観点から詳しく比較して、あなたの目的に最適な選択肢をご提案します。具体的にどの観点を重視されますか？`;
        } else {
            baseResponse = `データサイエンス（${technical.category}）について詳しく解説します。具体的な手法、ツールの選択、実装方法について、あなたの目的に合わせてご説明します。`;
        }
        
        // 語彙多様化処理（データサイエンス技術対応）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'data_science_technical',
                technicalCategory: technical.category,
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateReactResponse(userInput, technical) {
        let baseResponse;
        if (userInput.includes('useState') || userInput.includes('hook')) {
            baseResponse = `Reactのフック（useState等）について、使い方から実践的な応用例まで詳しく解説します。\n\nコード例を交えて、状態管理のベストプラクティスと注意点をご説明します。どのような機能を実装されたいですか？`;
        } else {
            baseResponse = `React/JavaScript（${technical.category}）について、実践的なコード例と共に詳しく解説します。どのような機能や概念について知りたいでしょうか？`;
        }
        
        // 語彙多様化処理（React技術対応）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'react_technical',
                technicalCategory: technical.category,
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateHowToResponse(userInput, technical) {
        const action = this.extractActionFromHowTo(userInput);
        let baseResponse = `「${action}」の方法について、ステップバイステップで詳しく解説します。\n\n前提条件、必要なツール、具体的な手順、注意点とトラブルシューティングまで包括的にご説明します。どの部分から始めたいでしょうか？`;
        
        // 語彙多様化処理（How-to技術対応）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'howto_technical',
                action: action,
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateComparisonResponse(userInput, technical) {
        const targets = this.extractComparisonTargets(userInput);
        let baseResponse = `${targets}の比較について詳しく分析します。\n\n性能、使いやすさ、学習コスト、適用場面の観点から比較し、あなたの要件に最適な選択肢をご提案します。どの観点を特に重視されますか？`;
        
        // 語彙多様化処理（比較技術対応）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'comparison_technical',
                targets: targets,
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateDebuggingResponse(userInput, technical) {
        let baseResponse = `デバッグ・問題解決について、システマティックなアプローチをご提案します。\n\n問題の特定、原因分析、解決策の検討、予防方法まで、実践的な手順をご説明します。具体的にどのような問題が発生していますか？`;
        
        // 語彙多様化処理（デバッグ技術対応）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'debugging_technical',
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    async generateGenericTechnicalResponse(userInput, technical) {
        const topic = this.extractKeyTopic(userInput);
        let baseResponse = `「${topic}」（技術分野: ${technical.category}）について詳しく解説します。\n\n基本概念から実践的な応用まで、あなたのレベルと目的に合わせて説明します。どの側面について特に知りたいでしょうか？`;
        
        // 語彙多様化処理（汎用技術対応）
        if (this.config.enableVocabularyDiversification) {
            const context = {
                category: 'generic_technical',
                topic: topic,
                technicalCategory: technical.category,
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
        }
        
        return baseResponse;
    }
    
    /**
     * インテリジェントフォールバック生成
     */
    async generateIntelligentFallback(userInput, context) {
        let baseResponse;
        
        // 質問タイプの推定
        if (userInput.includes('どう') || userInput.includes('方法') || userInput.includes('やり方')) {
            const topic = this.extractKeyTopic(userInput);
            baseResponse = `「${topic}」の方法についてお答えします。より具体的な状況や目的を教えていただければ、詳細なアドバイスをご提供できます。`;
        }
        else if (userInput.includes('比較') || userInput.includes('違い')) {
            const targets = this.extractComparisonTargets(userInput);
            baseResponse = `${targets}の比較についてお答えします。どの観点での比較をお求めでしょうか？性能、使いやすさ、学習コスト等、ご希望をお聞かせください。`;
        }
        else if (userInput.includes('とは') || userInput.includes('について')) {
            const topic = this.extractKeyTopic(userInput);
            baseResponse = `「${topic}」について詳しく解説します。基本概念から実践的な応用まで、どの側面について特に知りたいでしょうか？`;
        }
        else {
            // デフォルト（大幅改善）
            const topic = this.extractKeyTopic(userInput);
            baseResponse = `「${topic}」についてお答えします。より詳しい回答のために、具体的な状況や目的をお聞かせください。技術的な課題解決をサポートいたします。`;
        }
        
        // 語彙多様化処理（フォールバック応答対応）
        if (this.config.enableVocabularyDiversification && baseResponse) {
            const diversificationContext = {
                category: 'fallback_response',
                fallbackType: context?.type || 'general',
                politeness: this.determinePoliteness(userInput, {}),
                intensity: this.determineIntensity(userInput),
                conversationHistory: context?.conversationHistory || []
            };
            baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, diversificationContext);
        }
        
        return baseResponse;
    }
    
    /**
     * 🧠 軽量セマンティック分類・感情語辞書
     */
    
    getEmotionDictionary() {
        return {
            positive: ['ありがとう', 'うれしい', '感謝', '助かり', '良い', 'よかった', '嬉しい', '満足', '素晴らしい'],
            negative: ['困って', '落ち込', 'つらい', '不安', 'わからない', '疲れ', '悩み', '心配', 'だめ'],
            greeting: ['おはよう', 'こんに', 'はじめまして', 'お疲れ', 'いらっしゃい', '最近どう', '元気', '調子', 'どうですか'],
            learning: ['教えて', '学習', '勉強', '覚え', 'わかりやすく', '知りたい', '理解', '習得'],
            support: ['手伝って', 'サポート', '支援', '相談', 'アドバイス', '解決'],
            technical: ['プログラミング', 'Python', 'JavaScript', 'React', 'データサイエンス', 'コード', '開発']
        };
    }
    
    calculateEmotionScore(userInput) {
        const dictionary = this.getEmotionDictionary();
        const scores = {};
        
        for (const [emotion, words] of Object.entries(dictionary)) {
            scores[emotion] = words.reduce((score, word) => {
                return score + (userInput.includes(word) ? 1 : 0);
            }, 0);
        }
        
        return scores;
    }
    
    detectDominantEmotion(userInput) {
        const scores = this.calculateEmotionScore(userInput);
        const maxScore = Math.max(...Object.values(scores));
        
        if (maxScore === 0) return 'neutral';
        
        const dominantEmotion = Object.keys(scores).find(emotion => scores[emotion] === maxScore);
        return { emotion: dominantEmotion, score: maxScore, allScores: scores };
    }
    
    calculateIntentSimilarity(userInput, knownPatterns) {
        // 簡単なコサイン類似度の代替：キーワード重複スコア
        const inputWords = userInput.toLowerCase().split(/\s+/);
        const similarities = {};
        
        const patterns = {
            daily_conversation: ['おはよう', 'こんに', '元気', '今日', '昨日', '明日', '最近どう', '調子', 'どうですか'],
            emotional_support: ['困って', '不安', '落ち込', 'つらい', '悩み', '心配'],
            learning_request: ['教えて', '学習', '勉強', '覚え', '知りたい', '方法'],
            technical_inquiry: ['プログラミング', 'コード', '開発', 'Python', 'JavaScript'],
            gratitude: ['ありがとう', '感謝', '助かり', 'よかった'],
            general_question: ['何', 'どう', 'どの', 'いつ', 'どこ', 'なぜ']
        };
        
        for (const [intent, keywords] of Object.entries(patterns)) {
            const overlap = inputWords.filter(word => 
                keywords.some(keyword => word.includes(keyword) || keyword.includes(word))
            );
            similarities[intent] = overlap.length / Math.max(inputWords.length, keywords.length);
        }
        
        return similarities;
    }
    
    selectFlexibleStrategy(userInput) {
        const emotionResult = this.detectDominantEmotion(userInput);
        const intentSimilarities = this.calculateIntentSimilarity(userInput);
        
        // 感情が強い場合は感情優先
        if (emotionResult.score > 1) {
            if (emotionResult.emotion === 'positive') return 'gratitude_focused';
            if (emotionResult.emotion === 'negative') return 'emotional_support';
            if (emotionResult.emotion === 'greeting') return 'greeting_focused';
        }
        
        // 意図ベースの選択
        const topIntent = Object.entries(intentSimilarities)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (topIntent[1] > 0.2) {
            return topIntent[0];
        }
        
        return 'general_conversation';
    }

    /**
     * ヘルパーメソッド群
     */
    extractKeyTopic(input) {
        // 技術用語の抽出
        const techTerms = ['Python', 'JavaScript', 'React', 'データサイエンス', 'SQL', 'TensorFlow', 'PyTorch', 'AI', 'Machine Learning'];
        for (const term of techTerms) {
            if (input.toLowerCase().includes(term.toLowerCase())) {
                return term;
            }
        }
        
        // 一般的なキーワード抽出
        const words = input.split(/[。、\s]+/);
        const meaningfulWords = words.filter(word => word.length > 2 && !['について', 'を教えて', 'ください', 'です', 'ます'].includes(word));
        return meaningfulWords[0] || '該当分野';
    }
    
    extractComparisonTargets(input) {
        const patterns = [
            /(.+?)と(.+?)の?比較/,
            /(.+?)と(.+?)の?違い/,
            /(.+?)vs\.?(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) {
                return `${match[1].trim()}と${match[2].trim()}`;
            }
        }
        
        return 'ツール・技術';
    }
    
    extractActionFromHowTo(input) {
        const actionPattern = /(.+?)(の?方法|やり方|どう)/;
        const match = input.match(actionPattern);
        return match ? match[1].trim() : '実装・設定';
    }

    /**
     * 学習データ強化応答生成
     */
    async generateLearningEnhancedResponse(userInput, general, learningAnalysis) {
        try {
            // 学習データから関連情報を抽出
            const relatedConcepts = this.extractRelatedConcepts(userInput, learningAnalysis.userRelations);
            const conversationContext = this.extractConversationContext(learningAnalysis.pastConversations);
            const personalPreferences = this.extractPersonalPreferences(learningAnalysis);

            // 学習データに基づく個人化されたベース応答を生成
            let baseResponse = await this.generatePersonalizedBaseResponse(
                userInput, 
                general, 
                relatedConcepts, 
                conversationContext, 
                personalPreferences
            );

            if (!baseResponse) {
                return null; // 学習データが応答生成に適用できない場合
            }

            // 語彙多様化処理（学習データ考慮）
            if (this.config.enableVocabularyDiversification) {
                const context = {
                    category: general?.category || 'learning_enhanced',
                    politeness: this.determinePoliteness(userInput, general),
                    intensity: this.determineIntensity(userInput),
                    conversationHistory: learningAnalysis.pastConversations || [],
                    personalPreferences: personalPreferences,
                    relatedConcepts: relatedConcepts
                };
                baseResponse = await this.vocabularyDiversifier.diversifyResponse(baseResponse, context);
            }

            return baseResponse;
        } catch (error) {
            console.warn('学習強化応答生成エラー:', error.message);
            return null;
        }
    }

    extractRelatedConcepts(userInput, userRelations) {
        const inputWords = userInput.toLowerCase().split(/\s+/);
        const relatedConcepts = [];

        for (const relation of userRelations || []) {
            for (const word of inputWords) {
                if (relation.concept1?.toLowerCase().includes(word) || relation.concept2?.toLowerCase().includes(word)) {
                    relatedConcepts.push({
                        concept1: relation.concept1,
                        concept2: relation.concept2,
                        strength: relation.strength || 1,
                        context: relation.context
                    });
                }
            }
        }

        return relatedConcepts.slice(0, 3); // 最大3つまで
    }

    extractConversationContext(pastConversations) {
        if (!pastConversations || pastConversations.length === 0) {
            return { themes: [], patterns: [], recentTopics: [] };
        }

        const recentTopics = pastConversations.slice(-3).map(conv => conv.topic || conv.userMessage?.substring(0, 50));
        const themes = [...new Set(pastConversations.map(conv => conv.category || 'general'))];
        
        return {
            themes: themes.slice(0, 3),
            patterns: [],
            recentTopics: recentTopics.filter(Boolean)
        };
    }

    extractPersonalPreferences(learningAnalysis) {
        return {
            adaptationStrength: learningAnalysis.adaptationStrength || 0,
            preferredTopics: [],
            communicationStyle: 'friendly', // デフォルト値
            detailLevel: 'medium'
        };
    }

    async generatePersonalizedBaseResponse(userInput, general, relatedConcepts, conversationContext, personalPreferences) {
        // 関連概念がある場合の個人化応答
        if (relatedConcepts.length > 0) {
            const mainConcept = relatedConcepts[0];
            const personalizedResponse = `「${userInput}」についてですね。`;
            
            if (mainConcept.concept1 && mainConcept.concept2) {
                return personalizedResponse + `以前お話しした「${mainConcept.concept1}」と「${mainConcept.concept2}」の関連性を踏まえて、さらに詳しくお話ししましょう。

${this.generateContextualResponse(userInput, mainConcept, general)}`;
            }
        }

        // 過去の会話履歴がある場合の継続性応答
        if (conversationContext.recentTopics.length > 0) {
            const recentTopic = conversationContext.recentTopics[0];
            return `「${userInput}」についてですね。以前の「${recentTopic}」に関するお話も踏まえて、お答えしますね。

${this.generateContinuityResponse(userInput, recentTopic, general)}`;
        }

        return null; // 学習データが活用できない場合
    }

    generateContextualResponse(userInput, concept, general) {
        const category = general?.category || 'general';
        
        switch (category) {
            case 'technical_inquiry':
                return `「${concept.concept1}」と「${concept.concept2}」の関係性から考えると、この技術的な課題にはいくつかのアプローチが考えられます。あなたの過去の学習パターンを考慮して、最適な解決方法をご提案します。`;
            case 'learning_support':
                return `これまでの学習内容を振り返ると、「${concept.concept1}」での経験が今回の「${concept.concept2}」の理解に活かせそうです。段階的に進めていきましょう。`;
            default:
                return `「${concept.concept1}」と「${concept.concept2}」のつながりを意識しながら、あなたに最適な情報をお伝えします。`;
        }
    }

    generateContinuityResponse(userInput, recentTopic, general) {
        return `前回の「${recentTopic}」から発展して、今回のテーマも深く探求していきましょう。あなたの学習の流れを大切にしながら、新しい視点も加えてお答えします。`;
    }

    /**
     * システム統計取得
     */
    getSystemStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalRequests > 0 ? this.stats.successfulResponses / this.stats.totalRequests : 0,
            config: this.config,
            uptime: Date.now() - this.stats.lastProcessingTime
        };
    }
}

// デフォルトインスタンス
export const enhancedResponseGenerationEngineV2 = new EnhancedResponseGenerationEngineV2();