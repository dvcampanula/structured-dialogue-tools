#!/usr/bin/env node
/**
 * PersonalResponseAdapter - 個人特化応答適応システム
 * 
 * 🧠 Phase 6H.2: 個人特化学習エンジン - 応答適応コア実装
 * 🎯 学習済み個人特性を活用した適応的応答生成
 * 🔄 PersonalDialogueAnalyzer + DomainKnowledgeBuilder統合
 */

import fs from 'fs';
import path from 'path';

export class PersonalResponseAdapter {
    constructor(personalAnalyzer, domainBuilder, conceptDB) {
        this.personalAnalyzer = personalAnalyzer;
        this.domainBuilder = domainBuilder;
        this.conceptDB = conceptDB;
        this.adaptationCache = new Map();
        this.responseHistory = [];
        this.adaptationStats = {
            totalAdaptations: 0,
            successfulAdaptations: 0,
            personalityMatches: 0,
            domainAlignments: 0,
            styleAdjustments: 0
        };
        this.initializeAdaptationEngine();
    }

    initializeAdaptationEngine() {
        this.adaptationStrategies = {
            // 応答長適応
            length: {
                short: (content) => this.condenseResponse(content),
                medium: (content) => this.balanceResponse(content),
                long: (content) => this.expandResponse(content)
            },
            
            // 詳細度適応
            detail: {
                minimal: (content) => this.minimizeDetails(content),
                moderate: (content) => this.moderateDetails(content),
                detailed: (content) => this.maximizeDetails(content)
            },
            
            // トーン適応
            tone: {
                formal: (content) => this.formalizeContent(content),
                neutral: (content) => this.neutralizeContent(content),
                casual: (content) => this.casualizeContent(content)
            },
            
            // 質問スタイル適応
            questioning: {
                direct: (content) => this.directQuestions(content),
                suggestive: (content) => this.suggestiveQuestions(content),
                exploratory: (content) => this.exploratoryQuestions(content)
            },
            
            // サポートスタイル適応
            support: {
                analytical: (content) => this.analyticalSupport(content),
                empathetic: (content) => this.empatheticSupport(content),
                practical: (content) => this.practicalSupport(content)
            }
        };

        this.domainAdaptationRules = {
            technical: {
                vocabulary: 'technical_terms',
                examples: 'code_examples',
                structure: 'step_by_step',
                depth: 'implementation_focused'
            },
            business: {
                vocabulary: 'business_terms',
                examples: 'case_studies',
                structure: 'outcome_focused',
                depth: 'strategic_level'
            },
            casual: {
                vocabulary: 'everyday_language',
                examples: 'relatable_scenarios',
                structure: 'conversational',
                depth: 'intuitive_level'
            },
            creative: {
                vocabulary: 'expressive_language',
                examples: 'creative_analogies',
                structure: 'inspirational',
                depth: 'conceptual_level'
            },
            academic: {
                vocabulary: 'scholarly_terms',
                examples: 'research_examples',
                structure: 'logical_progression',
                depth: 'theoretical_foundation'
            }
        };
        
        console.log('✅ PersonalResponseAdapter: 適応エンジン初期化完了');
    }

    /**
     * 個人特性に基づく応答適応メイン処理
     * 
     * 注意: 入力はユーザーメッセージ、適応対象は生成済み応答
     */
    async adaptToPersonality(responseToAdapt, context = {}) {
        console.log(`🎯 個人特化応答適応開始: "${responseToAdapt.substring(0, 50)}..."`);
        
        try {
            // 個人プロファイル取得
            const personalProfile = await this.getPersonalProfile();
            
            // ドメイン関連性分析（応答内容に基づく）
            const domainContext = await this.analyzeDomainContext(responseToAdapt, context);
            
            // 個人特化適応適用
            const adaptedResponse = await this.applyPersonalizations(
                responseToAdapt, 
                personalProfile, 
                domainContext,
                responseToAdapt
            );
            
            // 学習・改善フィードバック
            await this.recordAdaptation(responseToAdapt, responseToAdapt, adaptedResponse, personalProfile);
            
            this.adaptationStats.totalAdaptations++;
            console.log(`✅ 個人特化応答適応完了`);
            
            return {
                response: adaptedResponse,
                adaptationInfo: {
                    personalityMatch: personalProfile.confidenceScore,
                    domainAlignment: domainContext.relevanceScore,
                    appliedAdaptations: this.getAppliedAdaptations(personalProfile),
                    responseMetrics: this.calculateResponseMetrics(adaptedResponse)
                }
            };
        } catch (error) {
            console.error('❌ 個人特化応答適応エラー:', error);
            return {
                response: responseToAdapt, // 元の応答をそのまま返す
                adaptationInfo: { error: error.message }
            };
        }
    }

    /**
     * 継続学習による個人適応の改善
     */
    async learnFromFeedback(interaction, feedback) {
        console.log(`🧠 フィードバック学習開始`);
        
        const learningData = {
            input: interaction.input,
            response: interaction.response,
            adaptations: interaction.adaptationInfo,
            feedback: feedback,
            timestamp: new Date().toISOString()
        };

        // フィードバックベースの改善
        if (feedback.satisfied) {
            await this.reinforceSuccessfulPatterns(learningData);
            this.adaptationStats.successfulAdaptations++;
        } else {
            await this.adjustAdaptationStrategies(learningData);
        }

        // 個人プロファイル更新
        await this.updatePersonalProfile(learningData);
        
        // 学習履歴記録
        this.responseHistory.push(learningData);
        
        console.log(`✅ フィードバック学習完了`);
        return this.generateLearningReport(learningData);
    }

    /**
     * リアルタイム応答スタイル調整
     */
    async adjustResponseStyle(currentResponse, adjustmentRequest) {
        console.log(`🔄 リアルタイム応答調整: ${adjustmentRequest.type}`);
        
        let adjustedResponse = currentResponse;
        
        switch (adjustmentRequest.type) {
            case 'shorter':
                adjustedResponse = this.condenseResponse(currentResponse);
                break;
            case 'longer':
                adjustedResponse = this.expandResponse(currentResponse);
                break;
            case 'more_technical':
                adjustedResponse = await this.increaseTechnicalDepth(currentResponse);
                break;
            case 'simpler':
                adjustedResponse = this.simplifyResponse(currentResponse);
                break;
            case 'more_examples':
                adjustedResponse = await this.addMoreExamples(currentResponse);
                break;
            case 'more_formal':
                adjustedResponse = this.formalizeContent(currentResponse);
                break;
            case 'more_casual':
                adjustedResponse = this.casualizeContent(currentResponse);
                break;
        }
        
        this.adaptationStats.styleAdjustments++;
        console.log(`✅ リアルタイム応答調整完了`);
        
        return adjustedResponse;
    }

    /**
     * 個人学習データ統合・プロファイル生成
     */
    async generatePersonalizedLearningProfile() {
        console.log(`📊 個人学習プロファイル生成開始`);
        
        const personalProfile = await this.getPersonalProfile();
        const domainExpertise = await this.getDomainExpertise();
        const responsePreferences = this.analyzeResponsePreferences();
        const learningProgress = this.assessLearningProgress();
        
        const profile = {
            id: `personalized_learning_profile_${Date.now()}`,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            
            // 個人特性統合
            personality: {
                communicationStyle: personalProfile.communication,
                emotionalProfile: personalProfile.personality,
                preferredInteractionStyle: this.determinePreferredInteractionStyle(personalProfile)
            },
            
            // ドメイン専門性
            expertise: {
                primaryDomains: domainExpertise.primaryDomains,
                skillLevels: domainExpertise.skillLevels,
                knowledgeDepth: domainExpertise.knowledgeDepth,
                specializations: this.extractSpecializations(domainExpertise)
            },
            
            // 応答適応設定
            adaptationSettings: {
                responsePreferences: responsePreferences,
                domainAdaptations: this.generateDomainAdaptations(domainExpertise),
                personalityAdaptations: this.generatePersonalityAdaptations(personalProfile),
                contextualRules: this.createContextualRules(personalProfile, domainExpertise)
            },
            
            // 学習進捗・成長
            learning: {
                progress: learningProgress,
                improvements: this.identifyImprovementAreas(),
                adaptationSuccess: this.calculateAdaptationSuccessRate(),
                nextSteps: this.recommendNextLearningSteps()
            },
            
            // システム統計
            systemStats: this.adaptationStats,
            
            // 信頼度・品質指標
            qualityMetrics: {
                profileCompleteness: this.calculateProfileCompleteness(personalProfile, domainExpertise),
                adaptationAccuracy: this.calculateAdaptationAccuracy(),
                learningEffectiveness: this.calculateLearningEffectiveness(),
                personalizationDepth: this.calculatePersonalizationDepth()
            }
        };
        
        console.log(`✅ 個人学習プロファイル生成完了`);
        return profile;
    }

    // コア適応メソッド群
    async getPersonalProfile() {
        if (this.personalAnalyzer && typeof this.personalAnalyzer.getPersonalProfile === 'function') {
            return this.personalAnalyzer.getPersonalProfile();
        } else if (this.personalAnalyzer && typeof this.personalAnalyzer.generatePersonalProfile === 'function') {
            return this.personalAnalyzer.generatePersonalProfile();
        }
        return this.getDefaultPersonalProfile();
    }

    async getDomainExpertise() {
        if (this.domainBuilder && typeof this.domainBuilder.getDomainProfile === 'function') {
            return this.domainBuilder.getDomainProfile();
        } else if (this.domainBuilder && typeof this.domainBuilder.generateExpertiseProfile === 'function') {
            return this.domainBuilder.generateExpertiseProfile();
        }
        return this.getDefaultDomainExpertise();
    }

    async analyzeDomainContext(input, context) {
        const domainRelevance = {};
        let primaryDomain = 'general';
        let relevanceScore = 0.5;
        
        if (this.domainBuilder) {
            const filteredKnowledge = this.domainBuilder.filterKnowledgeForPersonalization(input, context);
            
            // 最も関連性の高いドメインを特定
            for (const [domain, info] of Object.entries(filteredKnowledge)) {
                domainRelevance[domain] = info.relevance;
                if (info.relevance > relevanceScore) {
                    primaryDomain = domain;
                    relevanceScore = info.relevance;
                }
            }
        }
        
        return {
            primaryDomain,
            relevanceScore,
            domainRelevance,
            adaptationStrategy: this.domainAdaptationRules[primaryDomain] || this.domainAdaptationRules.casual
        };
    }

    async generateBaseResponse(input, context) {
        // 基本応答生成 - 実際のAIモデルやAPIとの統合ポイント
        // ここでは簡略実装
        if (this.conceptDB && this.conceptDB.processText) {
            try {
                const result = await this.conceptDB.processText(input);
                return this.formatBaseResponse(result, input);
            } catch (error) {
                console.warn('概念DB処理エラー、フォールバック応答を生成:', error);
            }
        }
        
        return this.generateGenericResponse(input, context);
    }

    async applyPersonalizations(baseResponse, personalProfile, domainContext, originalInput) {
        let adaptedResponse = baseResponse;
        
        // 応答スタイル適応
        adaptedResponse = await this.applyResponseStyleAdaptations(adaptedResponse, personalProfile);
        
        // ドメイン特化適応（originalInputを渡す）
        adaptedResponse = await this.applyDomainAdaptations(adaptedResponse, domainContext, originalInput);
        
        // パーソナリティ適応
        adaptedResponse = await this.applyPersonalityAdaptations(adaptedResponse, personalProfile);
        
        // 文脈的最適化
        adaptedResponse = await this.applyContextualOptimizations(adaptedResponse, originalInput, personalProfile);
        
        return adaptedResponse;
    }

    async applyResponseStyleAdaptations(response, profile) {
        const responsePrefs = profile.communication?.responseStyles || {};
        let adapted = response;
        
        // 応答長調整
        if (responsePrefs.responseLength) {
            const preferredLength = this.getDominantPreference(responsePrefs.responseLength);
            adapted = this.adaptationStrategies.length[preferredLength](adapted);
        }
        
        // 詳細度調整
        if (responsePrefs.detailLevel) {
            const preferredDetail = this.getDominantPreference(responsePrefs.detailLevel);
            adapted = this.adaptationStrategies.detail[preferredDetail](adapted);
        }
        
        // トーン調整
        if (responsePrefs.tone) {
            const preferredTone = this.getDominantPreference(responsePrefs.tone);
            adapted = this.adaptationStrategies.tone[preferredTone](adapted);
        }
        
        return adapted;
    }

    async applyDomainAdaptations(response, domainContext, originalMessage = null) {
        const strategy = domainContext.adaptationStrategy;
        let adapted = response;
        
        // 適応処理をスキップすべきかの判定（originalMessageを使用）
        if (originalMessage && this.shouldSkipAdaptations(response, originalMessage)) {
            console.log(`🚫 ドメイン適応スキップ: 日常会話・感謝メッセージのため`);
            return adapted;
        }
        
        // 専門用語適応
        if (strategy.vocabulary === 'technical_terms') {
            adapted = this.enhanceWithTechnicalTerms(adapted);
        } else if (strategy.vocabulary === 'everyday_language') {
            adapted = this.simplifyTechnicalTerms(adapted);
        }
        
        // 例示スタイル適応（感謝・お礼メッセージには適用しない）
        const isGratitudeMessage = this.isGratitudeMessage(response);
        if (!isGratitudeMessage) {
            if (strategy.examples === 'code_examples') {
                adapted = await this.addCodeExamples(adapted);
            } else if (strategy.examples === 'relatable_scenarios') {
                adapted = await this.addRelatableExamples(adapted, originalMessage);
            }
        }
        
        // 構造適応（感謝・お礼メッセージには適用しない）
        if (!isGratitudeMessage) {
            if (strategy.structure === 'step_by_step') {
                adapted = this.restructureStepByStep(adapted);
            } else if (strategy.structure === 'conversational') {
                adapted = this.restructureConversational(adapted, originalMessage);
            }
        }
        
        return adapted;
    }

    async applyPersonalityAdaptations(response, profile) {
        const personality = profile.personality || {};
        let adapted = response;
        
        // 感情傾向適応
        if (personality.emotionalTendencies) {
            const emotions = personality.emotionalTendencies.emotions || {};
            if (emotions.positive > emotions.negative) {
                adapted = this.addPositiveFraming(adapted);
            }
            if (emotions.excitement > 0.3) {
                adapted = this.addEnthusiasticTone(adapted);
            }
        }
        
        // パーソナリティ特性適応
        if (personality.emotionalTendencies) {
            const traits = personality.emotionalTendencies.personalityTraits || {};
            if (traits.analytical > 0.5) {
                adapted = this.enhanceAnalyticalContent(adapted);
            }
            if (traits.creative > 0.5) {
                adapted = this.enhanceCreativeContent(adapted);
            }
            if (traits.practical > 0.5) {
                adapted = this.enhancePracticalContent(adapted);
            }
        }
        
        return adapted;
    }

    async applyContextualOptimizations(response, originalInput, profile) {
        let optimized = response;
        
        // 質問タイプ分析と最適化
        if (originalInput.includes('?') || originalInput.includes('？')) {
            optimized = this.optimizeForQuestion(optimized, profile);
        }
        
        // 問題解決コンテキスト最適化
        if (originalInput.match(/問題|エラー|困っ|うまくいかない/)) {
            optimized = this.optimizeForProblemSolving(optimized, profile);
        }
        
        // 学習コンテキスト最適化
        if (originalInput.match(/学習|勉強|理解したい|教えて/)) {
            optimized = this.optimizeForLearning(optimized, profile);
        }
        
        return optimized;
    }

    // 応答変換メソッド群
    condenseResponse(content) {
        const sentences = content.split(/[。！？.!?]/).filter(s => s.trim());
        if (sentences.length <= 2) return content;
        
        // 重要な文を選択して短縮
        const keyPoints = sentences.slice(0, Math.ceil(sentences.length / 2));
        return keyPoints.join('。') + '。';
    }

    expandResponse(content) {
        // 応答を詳細化（動的パターン）
        const expansions = [
            'より詳細に説明すると、この分野には重要な考慮点がいくつかあります。',
            'さらに深く掘り下げると、実践的な観点から検討すべき要素があります。',
            '具体的なアプローチとしては、段階的に進めることが効果的です。',
            'より包括的に理解するために、関連する要素も考慮してみましょう。',
            '実際の応用を考えると、追加で検討すべきポイントがあります。'
        ];
        
        const randomExpansion = expansions[Math.floor(Math.random() * expansions.length)];
        return content + '\n\n' + randomExpansion;
    }

    balanceResponse(content) {
        // 適度な長さに調整
        const sentences = content.split(/[。！？.!?]/).filter(s => s.trim());
        if (sentences.length < 3) {
            return this.expandResponse(content);
        } else if (sentences.length > 6) {
            return this.condenseResponse(content);
        }
        return content;
    }

    minimizeDetails(content) {
        // 詳細を最小化
        return content.replace(/具体的には[^。]*。/g, '')
                     .replace(/例えば[^。]*。/g, '')
                     .replace(/詳細は[^。]*。/g, '');
    }

    moderateDetails(content) {
        // 適度な詳細を保持
        return content;
    }

    maximizeDetails(content) {
        // 詳細を最大化
        return content + '\n\n具体的な実装例や詳細な手順については、以下の点も考慮することが重要です。';
    }

    formalizeContent(content) {
        // 敬語・丁寧語化
        return content.replace(/だ/g, 'です')
                     .replace(/である/g, 'であります')
                     .replace(/する/g, 'いたします')
                     .replace(/。/g, 'ます。');
    }

    neutralizeContent(content) {
        // 中性的なトーン
        return content;
    }

    casualizeContent(content) {
        // カジュアル化
        return content.replace(/です/g, 'だ')
                     .replace(/ます/g, '')
                     .replace(/であります/g, 'だ');
    }

    directQuestions(content) {
        // 直接的な質問追加
        return content + '\n\nこの点について、具体的にどの部分で困っていますか？';
    }

    suggestiveQuestions(content) {
        // 提案的な質問追加
        return content + '\n\nこのようなアプローチはいかがでしょうか？';
    }

    exploratoryQuestions(content) {
        // 探索的な質問追加
        return content + '\n\n他にも関連する要素があるかもしれませんが、どう思いますか？';
    }

    analyticalSupport(content) {
        // 分析的サポート強化
        return content + '\n\nデータや論理的な観点から見ると、以下の要因が重要です。';
    }

    empatheticSupport(content) {
        // 共感的サポート強化
        return content + '\n\nお困りの気持ちをお察しします。一緒に解決策を見つけていきましょう。';
    }

    practicalSupport(content) {
        // 実用的サポート強化
        return content + '\n\n実際の手順として、まず次のステップから始めてみてください。';
    }

    // ユーティリティメソッド群
    getDominantPreference(preferences) {
        return Object.entries(preferences)
            .sort(([,a], [,b]) => b - a)[0][0];
    }

    formatBaseResponse(result, input) {
        if (result && result.extractedConcepts) {
            const concepts = result.extractedConcepts.slice(0, 5);
            return `「${input}」について、以下の要素が重要です：\n\n${concepts.map(c => `• ${c.text || c.name}`).join('\n')}\n\nこれらの点を考慮して進めてはいかがでしょうか。`;
        }
        return this.generateGenericResponse(input);
    }

    generateGenericResponse(input, context = {}) {
        return `「${input}」についてですね。この件についてお手伝いさせていただきます。具体的にどのような点でサポートが必要でしょうか？`;
    }

    generateFallbackResponse(input, context) {
        return `申し訳ございませんが、「${input}」について適切な応答を生成できませんでした。別の表現で質問していただけますでしょうか？`;
    }

    enhanceWithTechnicalTerms(content) {
        // 技術用語を強化（簡略実装）
        return content.replace(/システム/g, 'システムアーキテクチャ')
                     .replace(/データ/g, 'データ構造')
                     .replace(/処理/g, 'プロセッシング');
    }

    isGratitudeMessage(response) {
        // 感謝・お礼メッセージの判定
        const gratitudePatterns = [
            'お役に立', '喜ん', '光栄', '満足', '嬉しい', '安心',
            'ありがと', '感謝', '助かり', 'サポート'
        ];
        
        return gratitudePatterns.some(pattern => response.includes(pattern));
    }

    isCasualConversation(response, originalMessage) {
        // 日常会話・挨拶の判定
        const casualPatterns = [
            'おはよう', 'こんにちは', 'こんばんは', 'お疲れ',
            'いい天気', '最近どう', '元気', '調子', 'どうですか',
            'はじめまして', 'よろしく', 'いらっしゃい'
        ];
        
        // 原則として originalMessage を基準に判定
        const checkText = originalMessage || response;
        const isGreeting = casualPatterns.some(pattern => 
            checkText.toLowerCase().includes(pattern.toLowerCase())
        );
        
        // 短文での挨拶パターンもチェック
        if (originalMessage && originalMessage.length < 15) {
            const shortCasualPatterns = ['おはよう', 'こんに', 'お疲れ'];
            const isShortGreeting = shortCasualPatterns.some(pattern => 
                originalMessage.includes(pattern)
            );
            if (isShortGreeting) {
                console.log(`🔍 短文挨拶検出: "${originalMessage}"`);
                return true;
            }
        }
        
        return isGreeting;
    }

    shouldSkipAdaptations(response, originalMessage) {
        // 適応処理をスキップすべきかの総合判定
        return this.isGratitudeMessage(response) || 
               this.isCasualConversation(response, originalMessage);
    }

    restructureStepByStep(content) {
        // ステップバイステップ構造化
        const sentences = content.split('。').filter(s => s.trim());
        return sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n') + '。';
    }

    restructureConversational(content, originalMessage = null) {
        // 日常会話での不適切な構造化を回避
        if (originalMessage && this.isCasualConversation(content, originalMessage)) {
            console.log(`🚫 日常会話のため構造化スキップ`);
            return content;
        }
        
        // 会話的構造化
        return 'そうですね、' + content + 'ということですね。';
    }

    addPositiveFraming(content) {
        return '素晴らしい質問ですね！' + content;
    }

    addEnthusiasticTone(content) {
        return content + '一緒に頑張りましょう！';
    }

    enhanceAnalyticalContent(content) {
        return content + '\n\n分析的に考えると、この問題の根本原因と解決策を体系的に整理できます。';
    }

    enhanceCreativeContent(content) {
        return content + '\n\n創造的なアプローチとして、新しい視点からこの問題を捉えてみることもできます。';
    }

    enhancePracticalContent(content) {
        return content + '\n\n実用的な観点から、すぐに実行できる具体的なアクションプランを提案します。';
    }

    optimizeForQuestion(content, profile) {
        return content + '\n\n他にご質問がございましたら、お気軽にお聞かせください。';
    }

    optimizeForProblemSolving(content, profile) {
        return content + '\n\n問題解決のため、段階的にアプローチしていきましょう。';
    }

    optimizeForLearning(content, profile) {
        return content + '\n\n学習を進めるため、理解度を確認しながら進めていきます。';
    }

    // 学習・分析メソッド群
    async recordAdaptation(input, baseResponse, adaptedResponse, profile) {
        const adaptationRecord = {
            timestamp: new Date().toISOString(),
            input: input.substring(0, 100),
            baseLength: baseResponse.length,
            adaptedLength: adaptedResponse.length,
            profileConfidence: profile.confidenceScore || 0,
            adaptations: this.getAppliedAdaptations(profile)
        };
        
        // 適応履歴に記録（実装時はデータベースに保存）
        this.responseHistory.push(adaptationRecord);
    }

    getAppliedAdaptations(profile) {
        const adaptations = [];
        
        if (profile.communication?.responseStyles) {
            adaptations.push('responseStyle');
        }
        if (profile.personality?.emotionalTendencies) {
            adaptations.push('personality');
        }
        
        return adaptations;
    }

    calculateResponseMetrics(response) {
        return {
            length: response.length,
            sentenceCount: response.split(/[。！？.!?]/).length - 1,
            technicalTerms: (response.match(/\b[A-Z]{2,}\b/g) || []).length,
            questionCount: (response.match(/[？?]/g) || []).length
        };
    }

    // プロファイル分析メソッド群
    analyzeResponsePreferences() {
        const recentInteractions = this.responseHistory.slice(-10);
        const preferences = {
            averageLength: 0,
            commonAdaptations: {},
            successPatterns: {}
        };
        
        if (recentInteractions.length > 0) {
            preferences.averageLength = recentInteractions
                .reduce((sum, r) => sum + (r.adaptedLength || 0), 0) / recentInteractions.length;
                
            // 他の分析も実装（簡略化）
        }
        
        return preferences;
    }

    determinePreferredInteractionStyle(profile) {
        const communication = profile.communication || {};
        const personality = profile.personality || {};
        
        let style = 'balanced';
        
        if (personality.emotionalTendencies?.personalityTraits?.analytical > 0.6) {
            style = 'analytical';
        } else if (personality.emotionalTendencies?.personalityTraits?.creative > 0.6) {
            style = 'creative';
        } else if (personality.emotionalTendencies?.personalityTraits?.practical > 0.6) {
            style = 'practical';
        }
        
        return style;
    }

    extractSpecializations(domainExpertise) {
        const specializations = [];
        
        if (domainExpertise.primaryDomains) {
            for (const domain of domainExpertise.primaryDomains) {
                if (domain.score > 50) {
                    specializations.push(domain.domain);
                }
            }
        }
        
        return specializations;
    }

    generateDomainAdaptations(domainExpertise) {
        const adaptations = {};
        
        for (const domain of Object.keys(this.domainAdaptationRules)) {
            const skillLevel = domainExpertise.skillLevels?.[domain] || 'beginner';
            adaptations[domain] = {
                ...this.domainAdaptationRules[domain],
                skillLevel: skillLevel
            };
        }
        
        return adaptations;
    }

    generatePersonalityAdaptations(personalProfile) {
        const adaptations = {};
        const personality = personalProfile.personality || {};
        
        if (personality.emotionalTendencies) {
            const traits = personality.emotionalTendencies.personalityTraits || {};
            
            adaptations.analyticalBoost = traits.analytical || 0;
            adaptations.creativeBoost = traits.creative || 0;
            adaptations.practicalBoost = traits.practical || 0;
            adaptations.technicalFocus = traits.technical || 0;
        }
        
        return adaptations;
    }

    createContextualRules(personalProfile, domainExpertise) {
        return {
            questionHandling: this.determineQuestionHandlingStyle(personalProfile),
            problemSolving: this.determineProblemSolvingStyle(personalProfile),
            learningSupport: this.determineLearningStyle(domainExpertise),
            errorHandling: this.determineErrorHandlingStyle(personalProfile)
        };
    }

    // その他のメソッド（簡略実装）
    getDefaultPersonalProfile() {
        return {
            communication: { responseStyles: { responseLength: { medium: 1 } } },
            personality: { emotionalTendencies: { personalityTraits: { practical: 0.5 } } },
            confidenceScore: 0.3
        };
    }

    getDefaultDomainExpertise() {
        return {
            primaryDomains: [{ domain: 'general', score: 30 }],
            skillLevels: { general: 'intermediate' },
            knowledgeDepth: { general: 40 }
        };
    }

    assessLearningProgress() {
        return {
            totalInteractions: this.responseHistory.length,
            successRate: this.calculateAdaptationSuccessRate(),
            improvement: 'steady'
        };
    }

    identifyImprovementAreas() {
        return ['domain_depth', 'personality_accuracy', 'response_timing'];
    }

    calculateAdaptationSuccessRate() {
        if (this.adaptationStats.totalAdaptations === 0) return 0;
        return this.adaptationStats.successfulAdaptations / this.adaptationStats.totalAdaptations;
    }

    recommendNextLearningSteps() {
        return [
            'より多くの対話サンプルでの学習',
            'ドメイン特化知識の深化',
            '感情認識精度の向上'
        ];
    }

    calculateProfileCompleteness(personalProfile, domainExpertise) {
        let completeness = 0;
        if (personalProfile.communication) completeness += 0.3;
        if (personalProfile.personality) completeness += 0.3;
        if (domainExpertise.primaryDomains?.length > 0) completeness += 0.4;
        return completeness;
    }

    calculateAdaptationAccuracy() {
        // 適応精度計算の簡略実装
        return this.adaptationStats.totalAdaptations > 0 ? 0.75 : 0;
    }

    calculateLearningEffectiveness() {
        // 学習効果計算の簡略実装
        return this.responseHistory.length > 5 ? 0.8 : 0.5;
    }

    calculatePersonalizationDepth() {
        // 個人化深度計算の簡略実装
        const adaptationTypes = ['responseStyle', 'personality', 'domain', 'context'];
        return adaptationTypes.length * 0.25;
    }

    async reinforceSuccessfulPatterns(learningData) {
        // 成功パターンの強化学習（簡略実装）
        console.log('成功パターンを強化:', learningData.adaptations);
    }

    async adjustAdaptationStrategies(learningData) {
        // 適応戦略の調整（簡略実装）
        console.log('適応戦略を調整:', learningData.feedback);
    }

    async updatePersonalProfile(learningData) {
        // 個人プロファイルの更新（簡略実装）
        if (this.personalAnalyzer) {
            // 実際の更新処理は PersonalDialogueAnalyzer に委譲
        }
    }

    generateLearningReport(learningData) {
        return {
            timestamp: learningData.timestamp,
            improvementAreas: this.identifyImprovementAreas(),
            nextSteps: this.recommendNextLearningSteps(),
            learningEffectiveness: this.calculateLearningEffectiveness()
        };
    }

    determineQuestionHandlingStyle(profile) {
        const styles = profile.communication?.responseStyles?.questioningStyle || {};
        return this.getDominantPreference(styles) || 'balanced';
    }

    determineProblemSolvingStyle(profile) {
        const traits = profile.personality?.emotionalTendencies?.personalityTraits || {};
        if (traits.analytical > 0.5) return 'systematic';
        if (traits.creative > 0.5) return 'innovative';
        if (traits.practical > 0.5) return 'pragmatic';
        return 'balanced';
    }

    determineLearningStyle(domainExpertise) {
        const primaryDomain = domainExpertise.primaryDomains?.[0]?.domain || 'general';
        
        if (primaryDomain === 'technical') return 'hands_on';
        if (primaryDomain === 'academic') return 'theoretical';
        if (primaryDomain === 'creative') return 'experimental';
        return 'adaptive';
    }

    determineErrorHandlingStyle(profile) {
        const emotions = profile.personality?.emotionalTendencies?.emotions || {};
        
        if (emotions.caution > 0.5) return 'detailed';
        if (emotions.confidence > 0.5) return 'concise';
        return 'supportive';
    }

    /**
     * 個人応答適応（DialogueAPI互換）
     */
    async adaptPersonalResponse(baseResponse, userProfile, context = {}) {
        try {
            // 個人特性に基づく応答適応
            const adaptedResponse = await this.adaptToPersonality(baseResponse, context);
            
            return {
                adaptedResponse: adaptedResponse.response,
                adaptationMetrics: {
                    personalityAlignment: adaptedResponse.adaptationInfo?.personalityMatch || 0.7,
                    domainRelevance: adaptedResponse.adaptationInfo?.domainAlignment || 0.8,
                    styleConsistency: 0.9,
                    responseOptimization: 0.85
                },
                appliedAdaptations: adaptedResponse.adaptationInfo?.appliedAdaptations || [],
                confidenceScore: userProfile?.confidenceScore || 0.8
            };
        } catch (error) {
            console.error('❌ PersonalResponseAdapter.adaptPersonalResponse エラー:', error);
            return {
                adaptedResponse: baseResponse,
                adaptationMetrics: {
                    personalityAlignment: 0.5,
                    domainRelevance: 0.5,
                    styleConsistency: 0.5,
                    responseOptimization: 0.5
                },
                appliedAdaptations: [],
                confidenceScore: 0.5,
                error: error.message
            };
        }
    }
}