#!/usr/bin/env node
/**
 * ResponseGenerationEngine - Phase 7H.2.1動的応答生成エンジン
 * 
 * 🎯 文脈考慮・感情適応・個人特化応答生成
 * 🔧 SimpleMultiTurnManager統合・動的テンプレート選択
 */

import fs from 'fs';

export class ResponseGenerationEngine {
    constructor(multiTurnManager = null, personalAnalyzer = null) {
        this.multiTurnManager = multiTurnManager;
        this.personalAnalyzer = personalAnalyzer;
        
        // 応答生成統計
        this.generationStats = {
            totalGenerations: 0,
            templateSelections: new Map(),
            qualityScores: [],
            averageGenerationTime: 0
        };
        
        // 動的テンプレートカテゴリ
        this.templateCategories = {
            greeting: {
                formal: "ご挨拶いただき、ありがとうございます。本日はどのようなお手伝いをさせていただけますでしょうか？",
                casual: "こんにちは！今日はどんなことについてお話ししましょうか？",
                warm: "お疲れさまです。何かご相談やお聞きになりたいことがあれば、お気軽にお声かけください。"
            },
            question_response: {
                informative: "ご質問について詳しくお答えいたします。",
                supportive: "とても良いご質問ですね。一緒に考えてみましょう。",
                analytical: "この問題を整理して、段階的に解決していきましょう。"
            },
            gratitude_response: {
                humble: "お役に立てて光栄です。引き続きサポートさせていただきます。",
                encouraging: "喜んでいただけて嬉しいです！他にも何かあれば遠慮なくお聞かせください。",
                professional: "ありがとうございます。継続的なサポートを提供いたします。"
            },
            general_support: {
                empathetic: "お話を伺って、お気持ちを理解いたします。",
                solution_focused: "この課題に対する具体的な解決策を考えてみましょう。",
                exploratory: "詳しく状況を教えていただけますか？より適切な支援を提供します。"
            }
        };
        
        // 感情コンテキストマッピング
        this.emotionContextMap = {
            positive: ['warm', 'encouraging', 'supportive'],
            neutral: ['professional', 'informative', 'analytical'],
            negative: ['empathetic', 'supportive', 'solution_focused'],
            uncertain: ['exploratory', 'supportive', 'empathetic']
        };
        
        console.log('✅ ResponseGenerationEngine初期化完了');
    }
    
    /**
     * メイン応答生成
     */
    async generateResponse(sessionId, userInput, context = {}) {
        const startTime = Date.now();
        
        try {
            // 1. セッション文脈分析
            const sessionContext = await this.analyzeSessionContext(sessionId);
            
            // 2. 意図・感情分析
            const intentAnalysis = this.analyzeIntent(userInput);
            const emotionAnalysis = this.analyzeEmotion(userInput, sessionContext);
            
            // 3. 個人特化分析
            const personalContext = await this.analyzePersonalContext(sessionId, sessionContext);
            
            // 4. 動的テンプレート選択
            const templateSelection = this.selectDynamicTemplate(
                intentAnalysis, 
                emotionAnalysis, 
                personalContext
            );
            
            // 5. 文脈考慮応答生成
            const generatedResponse = this.generateContextualResponse(
                userInput,
                templateSelection,
                sessionContext,
                personalContext
            );
            
            // 6. 品質評価
            const qualityScore = this.evaluateResponseQuality(
                generatedResponse,
                userInput,
                context
            );
            
            // 7. 統計更新
            this.updateGenerationStats(templateSelection, qualityScore, Date.now() - startTime);
            
            console.log(`🎯 応答生成完了: ${generatedResponse.responseType} (品質: ${qualityScore})`);
            
            return {
                response: generatedResponse,
                metadata: {
                    sessionId,
                    intentAnalysis,
                    emotionAnalysis,
                    templateSelection,
                    qualityScore,
                    generationTime: Date.now() - startTime
                }
            };
            
        } catch (error) {
            console.error('❌ 応答生成エラー:', error);
            return this.generateFallbackResponse(userInput, sessionId);
        }
    }
    
    /**
     * セッション文脈分析
     */
    async analyzeSessionContext(sessionId) {
        if (!this.multiTurnManager) {
            return { turns: 0, context: '新規セッション' };
        }
        
        const sessionState = this.multiTurnManager.getSessionState(sessionId);
        
        if (!sessionState.found) {
            return { turns: 0, context: '新規セッション' };
        }
        
        return {
            turns: sessionState.totalTurns,
            recentTurns: sessionState.recentTurns || [],
            sessionDuration: sessionState.lastActivity ? 
                Date.now() - new Date(sessionState.lastActivity).getTime() : 0,
            context: this.buildSessionSummary(sessionState.recentTurns)
        };
    }
    
    /**
     * 意図分析
     */
    analyzeIntent(userInput) {
        const lowerInput = userInput.toLowerCase();
        
        let primaryIntent = 'general_inquiry';
        let confidence = 0.6;
        let subIntents = [];
        
        // 挨拶検出
        if (lowerInput.includes('こんにちは') || lowerInput.includes('hello') || 
            lowerInput.includes('はじめまして')) {
            primaryIntent = 'greeting';
            confidence = 0.9;
        }
        // 質問検出
        else if (lowerInput.includes('?') || lowerInput.includes('？') || 
                 lowerInput.includes('何') || lowerInput.includes('どう') ||
                 lowerInput.includes('いつ') || lowerInput.includes('どこ')) {
            primaryIntent = 'question';
            confidence = 0.8;
            
            // 質問タイプ分析
            if (lowerInput.includes('なぜ') || lowerInput.includes('理由')) {
                subIntents.push('explanation_request');
            }
            if (lowerInput.includes('方法') || lowerInput.includes('やり方')) {
                subIntents.push('how_to_request');
            }
        }
        // 感謝検出
        else if (lowerInput.includes('ありがとう') || lowerInput.includes('感謝') ||
                 lowerInput.includes('thank')) {
            primaryIntent = 'gratitude';
            confidence = 0.9;
        }
        // 要求・依頼検出
        else if (lowerInput.includes('お願い') || lowerInput.includes('してください') ||
                 lowerInput.includes('手伝って') || lowerInput.includes('支援')) {
            primaryIntent = 'request';
            confidence = 0.8;
        }
        
        return {
            primaryIntent,
            confidence,
            subIntents,
            analysisDetails: {
                inputLength: userInput.length,
                questionMarks: (userInput.match(/[?？]/g) || []).length,
                politeMarkers: (userInput.match(/です|ます|でしょう/g) || []).length
            }
        };
    }
    
    /**
     * 感情分析
     */
    analyzeEmotion(userInput, sessionContext) {
        const lowerInput = userInput.toLowerCase();
        let emotionScore = 0;
        let dominantEmotion = 'neutral';
        let confidence = 0.5;
        
        // ポジティブ指標
        const positiveKeywords = ['嬉しい', '楽しい', '素晴らしい', '良い', '感謝', 'ありがとう'];
        const positiveCount = positiveKeywords.filter(word => lowerInput.includes(word)).length;
        
        // ネガティブ指標
        const negativeKeywords = ['困る', '問題', '難しい', '分からない', '心配', '不安'];
        const negativeCount = negativeKeywords.filter(word => lowerInput.includes(word)).length;
        
        // 不確実性指標
        const uncertaintyKeywords = ['分からない', 'よく分からない', '迷って', '判断'];
        const uncertaintyCount = uncertaintyKeywords.filter(word => lowerInput.includes(word)).length;
        
        // 感情スコア計算
        emotionScore = positiveCount - negativeCount;
        
        if (positiveCount > 0 && emotionScore > 0) {
            dominantEmotion = 'positive';
            confidence = Math.min(0.9, 0.6 + positiveCount * 0.1);
        } else if (negativeCount > 0 && emotionScore < 0) {
            dominantEmotion = 'negative';
            confidence = Math.min(0.9, 0.6 + negativeCount * 0.1);
        } else if (uncertaintyCount > 0) {
            dominantEmotion = 'uncertain';
            confidence = Math.min(0.8, 0.5 + uncertaintyCount * 0.1);
        }
        
        // セッション文脈による調整
        if (sessionContext.turns > 3) {
            confidence *= 1.1; // 長期セッションは感情分析精度向上
        }
        
        return {
            dominantEmotion,
            emotionScore,
            confidence: Math.min(confidence, 1.0),
            details: {
                positiveCount,
                negativeCount,
                uncertaintyCount,
                sessionInfluence: sessionContext.turns > 1
            }
        };
    }
    
    /**
     * 個人特化文脈分析
     */
    async analyzePersonalContext(sessionId, sessionContext) {
        // 基本的な個人特化分析
        const personalContext = {
            communicationStyle: 'neutral',
            preferredFormality: 'polite',
            interactionHistory: sessionContext.turns,
            adaptationLevel: Math.min(sessionContext.turns * 0.1, 1.0)
        };
        
        // セッション履歴から通信スタイル推測
        if (sessionContext.recentTurns && sessionContext.recentTurns.length > 0) {
            const recentInputs = sessionContext.recentTurns.map(t => t.userInput).join(' ');
            
            // フォーマリティ分析
            const politeMarkers = (recentInputs.match(/です|ます|でしょう|いただき/g) || []).length;
            const casualMarkers = (recentInputs.match(/だよ|だね|じゃん|～/g) || []).length;
            
            if (politeMarkers > casualMarkers) {
                personalContext.preferredFormality = 'formal';
                personalContext.communicationStyle = 'polite';
            } else if (casualMarkers > politeMarkers) {
                personalContext.preferredFormality = 'casual';
                personalContext.communicationStyle = 'friendly';
            }
        }
        
        return personalContext;
    }
    
    /**
     * 動的テンプレート選択
     */
    selectDynamicTemplate(intentAnalysis, emotionAnalysis, personalContext) {
        const { primaryIntent } = intentAnalysis;
        const { dominantEmotion } = emotionAnalysis;
        const { preferredFormality } = personalContext;
        
        // テンプレートカテゴリ選択
        let templateCategory = 'general_support';
        
        if (primaryIntent === 'greeting') {
            templateCategory = 'greeting';
        } else if (primaryIntent === 'question') {
            templateCategory = 'question_response';
        } else if (primaryIntent === 'gratitude') {
            templateCategory = 'gratitude_response';
        }
        
        // 感情に基づくスタイル選択
        const emotionStyles = this.emotionContextMap[dominantEmotion] || this.emotionContextMap.neutral;
        
        // フォーマリティとカテゴリに基づくスタイル選択
        const availableStyles = Object.keys(this.templateCategories[templateCategory] || {});
        let preferredStyle = emotionStyles[0];
        
        if (preferredFormality === 'formal') {
            // フォーマル優先: professional > humble > analytical
            preferredStyle = availableStyles.find(s => ['professional', 'humble', 'analytical'].includes(s)) || 
                           emotionStyles.find(s => availableStyles.includes(s)) || availableStyles[0];
        } else if (preferredFormality === 'casual') {
            // カジュアル優先: warm > encouraging > casual
            preferredStyle = availableStyles.find(s => ['warm', 'encouraging', 'casual'].includes(s)) || 
                           emotionStyles.find(s => availableStyles.includes(s)) || availableStyles[0];
        } else {
            // 感情に基づく選択（利用可能なスタイルの中から）
            preferredStyle = emotionStyles.find(s => availableStyles.includes(s)) || availableStyles[0];
        }
        
        // テンプレート取得
        const selectedTemplate = this.templateCategories[templateCategory]?.[preferredStyle] || 
                                this.templateCategories.general_support.empathetic;
        
        return {
            category: templateCategory,
            style: preferredStyle,
            template: selectedTemplate,
            selectionReason: {
                intent: primaryIntent,
                emotion: dominantEmotion,
                formality: preferredFormality,
                availableStyles: this.templateCategories[templateCategory] ? Object.keys(this.templateCategories[templateCategory]) : []
            }
        };
    }
    
    /**
     * 文脈考慮応答生成
     */
    generateContextualResponse(userInput, templateSelection, sessionContext, personalContext) {
        let baseResponse = templateSelection.template;
        
        // セッション文脈追加
        if (sessionContext.turns > 1) {
            const contextualAddition = this.generateContextualAddition(sessionContext, personalContext);
            if (contextualAddition) {
                baseResponse += ` ${contextualAddition}`;
            }
        }
        
        // 個人特化調整
        baseResponse = this.applyPersonalAdaptation(baseResponse, personalContext);
        
        return {
            content: baseResponse,
            responseType: `${templateSelection.category}_${templateSelection.style}`,
            adaptationLevel: personalContext.adaptationLevel,
            contextEnriched: sessionContext.turns > 1
        };
    }
    
    /**
     * 文脈的追加生成
     */
    generateContextualAddition(sessionContext, personalContext) {
        if (sessionContext.turns > 5) {
            return "継続的な対話を通じて、より適切な支援を提供できるよう努めます。";
        } else if (sessionContext.turns > 2) {
            return "これまでのお話も踏まえて対応いたします。";
        }
        return null;
    }
    
    /**
     * 個人特化適応
     */
    applyPersonalAdaptation(response, personalContext) {
        // フォーマリティ調整
        if (personalContext.preferredFormality === 'casual') {
            response = response.replace(/いたします/g, 'します')
                             .replace(/でございます/g, 'です')
                             .replace(/いただけますでしょうか/g, 'いただけますか');
        }
        
        return response;
    }
    
    /**
     * 応答品質評価
     */
    evaluateResponseQuality(generatedResponse, userInput, context) {
        let qualityScore = 0.7; // ベースライン
        
        // 応答長評価
        const responseLength = generatedResponse.content.length;
        if (responseLength > 20 && responseLength < 200) {
            qualityScore += 0.1;
        }
        
        // 文脈適応評価
        if (generatedResponse.contextEnriched) {
            qualityScore += 0.1;
        }
        
        // 個人特化評価
        if (generatedResponse.adaptationLevel > 0.5) {
            qualityScore += 0.1;
        }
        
        return Math.min(qualityScore, 1.0);
    }
    
    /**
     * フォールバック応答生成
     */
    generateFallbackResponse(userInput, sessionId) {
        return {
            response: {
                content: "申し訳ございません。お話を理解して、適切にお答えできるよう努力いたします。もう少し詳しく教えていただけますでしょうか？",
                responseType: "fallback_empathetic",
                adaptationLevel: 0.3,
                contextEnriched: false
            },
            metadata: {
                sessionId,
                isFallback: true,
                generationTime: 50
            }
        };
    }
    
    /**
     * セッションサマリー構築
     */
    buildSessionSummary(recentTurns) {
        if (!recentTurns || recentTurns.length === 0) {
            return '新規セッション';
        }
        
        const turnCount = recentTurns.length;
        const lastTurn = recentTurns[recentTurns.length - 1];
        
        return `${turnCount}ターン経過、最新: ${lastTurn.intent || '一般対話'}`;
    }
    
    /**
     * 統計更新
     */
    updateGenerationStats(templateSelection, qualityScore, generationTime) {
        this.generationStats.totalGenerations++;
        
        // テンプレート選択統計
        const selectionKey = `${templateSelection.category}_${templateSelection.style}`;
        this.generationStats.templateSelections.set(
            selectionKey,
            (this.generationStats.templateSelections.get(selectionKey) || 0) + 1
        );
        
        // 品質スコア統計
        this.generationStats.qualityScores.push(qualityScore);
        
        // 生成時間統計
        const currentAvg = this.generationStats.averageGenerationTime;
        this.generationStats.averageGenerationTime = 
            (currentAvg * (this.generationStats.totalGenerations - 1) + generationTime) / 
            this.generationStats.totalGenerations;
    }
    
    /**
     * 統計取得
     */
    getGenerationStats() {
        const qualityScores = this.generationStats.qualityScores;
        const averageQuality = qualityScores.length > 0 ? 
            qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;
        
        return {
            totalGenerations: this.generationStats.totalGenerations,
            averageQuality: averageQuality.toFixed(3),
            averageGenerationTime: Math.round(this.generationStats.averageGenerationTime),
            templateDistribution: Object.fromEntries(this.generationStats.templateSelections),
            lastUpdated: new Date()
        };
    }
    
    /**
     * テンプレート選択統計
     */
    getTemplateSelectionStats() {
        const total = this.generationStats.totalGenerations;
        const distribution = {};
        
        for (const [template, count] of this.generationStats.templateSelections) {
            distribution[template] = {
                count,
                percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
            };
        }
        
        return {
            totalSelections: total,
            distribution,
            topTemplates: Object.entries(distribution)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
        };
    }
}