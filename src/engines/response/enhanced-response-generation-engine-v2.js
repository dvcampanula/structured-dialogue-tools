#!/usr/bin/env node
/**
 * Enhanced ResponseGenerationEngine v2.0
 * 
 * 🎯 Phase 7H.2: 統合分析パイプライン・応答生成システム
 * 🧠 DynamicTemplate・Emotion・Personal統合による次世代応答生成
 * 📊 文脈理解強化・品質最適化・個人特化応答生成
 */

import { DynamicResponseTemplateEngine } from './dynamic-response-template-engine.js';
import { AdvancedEmotionAnalyzer } from '../../analyzers/advanced-emotion-analyzer.js';
import { PersonalResponseAdapter } from '../../systems/adapters/personal-response-adapter.js';
import { DynamicTechnicalPatterns } from './dynamic-technical-patterns.js';

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
 * 文脈理解強化エンジン
 */
export class ContextEnrichmentEngine {
    constructor() {
        this.contextDepthThreshold = 0.6;
        this.semanticSimilarityThreshold = 0.4;
        this.continuityBonus = 0.2;
        
        console.log('✅ ContextEnrichmentEngine初期化完了');
    }
    
    /**
     * 文脈分析・強化処理
     */
    async enrichContext(analysisResult) {
        const startTime = Date.now();
        
        try {
            const enrichment = {
                conversationalContinuity: this.analyzeConversationalFlow(analysisResult),
                topicalCoherence: this.analyzeTopicalCoherence(analysisResult),
                emotionalProgression: this.analyzeEmotionalProgression(analysisResult),
                personalContextualFit: this.analyzePersonalContextualFit(analysisResult),
                technicalContextualDepth: this.analyzeTechnicalContext(analysisResult)
            };
            
            // 統合文脈スコア計算
            enrichment.overallContextScore = this.calculateOverallContextScore(enrichment);
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
        const text1 = (turn1.content || turn1.message || turn1 || '').toLowerCase();
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
        this.dynamicTemplateEngine = new DynamicResponseTemplateEngine();
        this.emotionAnalyzer = new AdvancedEmotionAnalyzer();
        this.personalAdapter = null; // 外部から注入
        this.technicalPatterns = new DynamicTechnicalPatterns();
        
        // 新規コンポーネント
        this.contextEnrichmentEngine = new ContextEnrichmentEngine();
        
        // 設定
        this.config = {
            enableTemplateEngine: true,
            enableEmotionAnalysis: true,
            enablePersonalAdaptation: true,
            enableContextEnrichment: true,
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
        
        console.log('🚀 Enhanced ResponseGenerationEngine v2.0 初期化完了');
        console.log(`📊 設定: Template=${this.config.enableTemplateEngine}, Emotion=${this.config.enableEmotionAnalysis}, Personal=${this.config.enablePersonalAdaptation}`);
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
            
            // 1. 統合分析結果初期化
            const analysisResult = new UnifiedAnalysisResult(userInput, conversationHistory);
            
            // 2. 各分析システム実行
            await this.performUnifiedAnalysis(analysisResult, userProfile);
            
            // 3. 文脈理解強化
            if (this.config.enableContextEnrichment) {
                await this.contextEnrichmentEngine.enrichContext(analysisResult);
            }
            
            // 4. 応答戦略決定
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
            
            return {
                response: finalResponse,
                analysisResult: analysisResult,
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
        
        // 動的テンプレート分析
        if (this.config.enableTemplateEngine) {
            analysisPromises.push(
                this.analyzeTemplateNeeds(analysisResult)
                    .catch(err => console.warn('テンプレート分析エラー:', err.message))
            );
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
        
        // 並列実行
        await Promise.allSettled(analysisPromises);
    }
    
    async analyzeTemplateNeeds(analysisResult) {
        const technical = analysisResult.technicalAnalysis;
        const detection = this.dynamicTemplateEngine.detectTemplateType(
            analysisResult.userInput, 
            technical?.category
        );
        analysisResult.templateAnalysis = detection;
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
    
    /**
     * 応答戦略決定
     */
    determineResponseStrategy(analysisResult) {
        const strategy = {
            primary: 'balanced',
            secondary: [],
            confidence: 0.5,
            reasoning: []
        };
        
        // 技術的コンテンツ重視
        if (analysisResult.technicalAnalysis?.isTechnical) {
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
        
        // 個人特化戦略
        if (analysisResult.personalAnalysis?.adaptationStrength > 0.6) {
            strategy.secondary.push('personalized');
            strategy.confidence += 0.15;
            strategy.reasoning.push('個人特化');
        }
        
        strategy.confidence = Math.min(strategy.confidence, 1.0);
        
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
                response = await this.generateTechnicalResponse(analysisResult);
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
    
    async generateTechnicalResponse(analysisResult) {
        // 技術的応答生成
        const template = analysisResult.templateAnalysis;
        
        if (template && template.confidence > 0.3) {
            const templateResponse = await this.dynamicTemplateEngine.generateResponse(
                analysisResult.userInput,
                template,
                analysisResult.technicalAnalysis?.category,
                {} // userSession placeholder
            );
            
            if (templateResponse && templateResponse.length > 30) {
                return templateResponse;
            }
        }
        
        // フォールバック技術応答
        return `技術的な内容について詳しく説明いたします。${analysisResult.technicalAnalysis?.category || '該当分野'}に関する具体的な情報をお示しします。`;
    }
    
    async generateEmotionalResponse(analysisResult) {
        const emotion = analysisResult.emotionAnalysis;
        const dominantEmotion = emotion?.dominantEmotion || 'neutral';
        
        const emotionalResponses = {
            excitement: "とても興味深いご質問ですね！詳しくお答えします。",
            curiosity: "探求心溢れるご質問ですね。一緒に考えてみましょう。",
            frustration: "お困りのようですね。解決に向けて支援いたします。",
            satisfaction: "良い方向に進んでいるようですね。さらにサポートします。"
        };
        
        return emotionalResponses[dominantEmotion] || "ご質問にお答えします。";
    }
    
    async generatePersonalizedResponse(analysisResult) {
        if (this.personalAdapter && this.personalAdapter.generatePersonalizedResponse) {
            return await this.personalAdapter.generatePersonalizedResponse(
                analysisResult.userInput,
                analysisResult.personalAnalysis
            );
        }
        
        return "あなたの特性に合わせて回答いたします。";
    }
    
    async generateBalancedResponse(analysisResult) {
        // バランス型応答
        const contextScore = analysisResult.contextEnrichment?.overallContextScore || 0.5;
        
        if (contextScore > 0.7) {
            return "文脈を踏まえて、詳しくお答えします。";
        } else {
            return "ご質問の内容について、分かりやすく説明いたします。";
        }
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