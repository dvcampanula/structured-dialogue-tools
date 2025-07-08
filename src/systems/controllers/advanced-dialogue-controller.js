#!/usr/bin/env node
/**
 * AdvancedDialogueController - 高度対話制御・管理システム
 * 
 * 🧠 Phase 7H: キメラAI完全版 - 高度対話制御システム
 * 🎯 多段階文脈追跡・高度意図認識・動的会話フロー制御
 * 🔄 Phase 6H.2個人特化学習エンジンとの完全統合
 */

import fs from 'fs';
import path from 'path';
import { configLoader } from '../../data/config-loader.js';
import { DynamicRelationshipLearner } from '../../engines/learning/dynamic-relationship-learner.js';
import { SemanticSimilarityEngine } from '../../engines/processing/semantic-similarity-engine.js';
import { IntentRecognitionEngine } from '../../engines/dialogue/intent-recognition-engine.js';
import { ContextTrackingSystem } from '../../engines/dialogue/context-tracking-system.js';
import { DialogueFlowController } from '../../engines/dialogue/dialogue-flow-controller.js';
import { persistentLearningDB } from '../../data/persistent-learning-db.js';

export class AdvancedDialogueController {
    constructor(personalDialogueAnalyzer, domainKnowledgeBuilder, personalResponseAdapter, conceptDB, metaCognitiveController, hybridProcessor, qualityAdjuster, conceptQualityManager, userId = 'default') {
        this.personalDialogueAnalyzer = personalDialogueAnalyzer; // 注入されたアナライザー
        this.domainKnowledgeBuilder = domainKnowledgeBuilder;     // 注入されたビルダー
        this.personalResponseAdapter = personalResponseAdapter;   // 注入されたアダプター
        this.conceptDB = conceptDB; // 注入されたconceptDB
        this.db = persistentLearningDB; // DBインスタンスを保持
        // metaCognitiveController削除済み - ハードコード満載システムのため不要
        this.hybridProcessor = hybridProcessor; // 注入されたハイブリッドプロセッサー
        this.qualityAdjuster = qualityAdjuster; // 注入された品質調整システム
        this.conceptQualityManager = conceptQualityManager; // 注入された概念品質管理システム
        
        // 外部設定・データ（起動時に読み込み）
        this.techRelations = {};
        this.intentPatterns = {};
        this.evaluationThresholds = {};
        this.keywordConfig = {};
        
        // 動的学習システム
        this.userId = userId;
        this.dynamicLearner = null;
        
        // モジュラーコンポーネント
        this.semanticEngine = new SemanticSimilarityEngine();
        this.intentEngine = new IntentRecognitionEngine();
        this.contextTracker = new ContextTrackingSystem();
        this.flowController = new DialogueFlowController();
        
        // 対話制御コア
        this.contextMemory = new Map();
        this.conversationHistory = []; // 初期化時にDBからロード
        this.dialogueState = {
            currentTopic: null,
            intentStack: [],
            contextDepth: 0,
            conversationGoals: [],
            activeStrategies: []
        };
        
        // 統計・メトリクス
        this.controllerStats = {
            totalConversations: 0,
            contextTrackingAccuracy: 0,
            intentRecognitionAccuracy: 0,
            flowControlEffectiveness: 0,
            averageContextDepth: 0
        };
        
        this.initializeDialogueController();
    }

    async initializeDialogueController() {
        // 外部設定・データ読み込み
        await this.loadExternalConfig();
        
        // ★ DBから対話履歴を読み込み
        await this.loadConversationHistory();

        // 動的学習システム初期化
        this.dynamicLearner = new DynamicRelationshipLearner(this.userId);
        
        // モジュール間の統合
        await this.integrateModules();
        
        console.log('✅ AdvancedDialogueController: モジュラー高度対話制御システム初期化完了');
    }

    /**
     * ★ DBから対話履歴を読み込む
     */
    async loadConversationHistory() {
        try {
            const history = await this.db.getConversationHistory();
            if (history && history.length > 0) {
                this.conversationHistory = history;
                console.log(`📚 DBから対話履歴を読み込みました: ${history.length}件`);
            }
        } catch (error) {
            console.warn('⚠️ 対話履歴の読み込みに失敗しました。', error);
            this.conversationHistory = [];
        }
    }

    /**
     * ★ DBに対話履歴を保存する
     */
    async saveConversationHistory() {
        try {
            await this.db.saveConversationHistory(this.conversationHistory);
            console.log(`💾 対話履歴をDBに保存しました: ${this.conversationHistory.length}件`);
        } catch (error) {
            console.error('❌ 対話履歴の保存に失敗しました。', error);
        }
    }

    /**
     * 外部設定・データファイル読み込み
     */
    async loadExternalConfig() {
        try {
            // 関係性マッピング読み込み
            this.techRelations = await configLoader.getFlatTechRelations();
            
            // 意図パターン読み込み  
            this.intentPatterns = await configLoader.getIntentPatterns();
            
            // 評価閾値読み込み
            this.evaluationThresholds = await configLoader.getEvaluationThresholds();
            
            // キーワード抽出設定読み込み
            this.keywordConfig = await configLoader.getKeywordExtractionConfig();
            
            console.log('✅ 外部設定読み込み完了');
            console.log(`📊 関係性マッピング: ${Object.keys(this.techRelations).length}件`);
            console.log(`🎯 意図パターン: ${Object.keys(this.intentPatterns.basic || {}).length}件`);
            
        } catch (error) {
            console.warn('⚠️ 外部設定読み込み失敗、デフォルト設定を使用:', error.message);
            await this.loadFallbackConfig();
        }
    }

    /**
     * フォールバック設定（外部ファイル読み込み失敗時）
     */
    async loadFallbackConfig() {
        console.log('🔄 フォールバック設定読み込み中...');
        
        // 最小限の関係性マッピング
        this.techRelations = {
            'react': ['開発', 'ウェブ', 'javascript'],
            '学習': ['プログラミング', '開発', 'スキル'],
            'ai': ['機械学習', 'システム']
        };
        
        // 基本意図パターン
        this.intentPatterns = {
            basic: {
                question: "(?:[？?]|どう|なぜ|教えて)",
                learning: "(?:学習|理解|覚え)"
            }
        };
        
        // デフォルト評価閾値
        this.evaluationThresholds = {
            contextContinuity: {
                semanticSimilarity: { basic: 0.10, minimal: 0.05 }
            }
        };
        
        console.log('✅ フォールバック設定完了');
    }

    /**
     * モジュール統合
     */
    async integrateModules() {
        // 意味類似度エンジンに動的学習データ統合
        this.semanticEngine.integrateUserRelations(this.dynamicLearner);
        
        console.log('🔗 モジュール統合完了');
    }

    /**
     * 動的学習実行（会話完了後）
     */
    async learnFromDialogue(input, conversationHistory, response) {
        if (this.dynamicLearner) {
            try {
                await this.dynamicLearner.learnFromConversation(input, conversationHistory, response);
                
                // 定期的にデータ保存
                if (this.controllerStats.totalConversations % 5 === 0) {
                    await this.dynamicLearner.saveUserData();
                }
                
            } catch (error) {
                console.warn('⚠️ 動的学習エラー:', error.message);
            }
        }
    }

    /**
     * 学習統計取得
     */
    getLearningStats() {
        if (this.dynamicLearner) {
            return this.dynamicLearner.getLearningStats();
        }
        return { totalTerms: 0, totalRelations: 0, averageStrength: 0 };
    }

    /**
     * 高度対話制御メイン処理
     */
    async controlAdvancedDialogue(input, conversationHistory = []) {
        console.log(`🧠 高度対話制御開始: "${input.substring(0, 50)}..."`);
        
        try {
            // Step 1: 多段階文脈追跡（モジュール使用）
            const contextAnalysis = await this.contextTracker.trackContext(input, this.conversationHistory);
            
            // Step 2: 高度意図認識（モジュール使用）
            const intentAnalysis = await this.intentEngine.recognizeIntent(input, contextAnalysis);
            
            // Step 3: 動的会話フロー制御（モジュール使用）
            const flowControl = await this.flowController.controlDialogueFlow(intentAnalysis, contextAnalysis);
            
            // Step 4: 対話戦略決定（モジュール使用）
            const dialogueStrategy = await this.flowController.determineDialogueStrategy(flowControl, intentAnalysis);
            
            // Step 5: 個人特化統合（モジュール使用）
            const personalizedStrategy = await this.flowController.integratePersonalAdaptation(dialogueStrategy);
            
            // Step 6: 応答生成指示作成（モジュール使用）
            const responseGuidance = this.flowController.createResponseGuidance(personalizedStrategy);
            
            const result = {
                contextAnalysis: contextAnalysis,
                intentAnalysis: intentAnalysis,
                flowControl: flowControl,
                dialogueStrategy: dialogueStrategy,
                personalizedStrategy: personalizedStrategy,
                responseGuidance: responseGuidance,
                conversationMetrics: this.calculateConversationMetrics()
            };

            // ★ 対話ターンの要約を作成し、状態を更新
            const summary = this._summarizeTurn(input, result);
            this.updateDialogueState(summary);
            
            // 意味的連続性計算（モジュール使用）
            contextAnalysis.semanticContinuity = await this.semanticEngine.calculateSemanticContinuity(input, conversationHistory);
            result.contextAnalysis.semanticContinuity = contextAnalysis.semanticContinuity; // 結果オブジェクトに反映
            
            this.controllerStats.totalConversations++;
            console.log(`✅ 高度対話制御完了: 文脈深度${contextAnalysis.contextDepth}, 意図信頼度${intentAnalysis.confidence}`);
            
            // ★ 対話履歴をDBに保存
            await this.saveConversationHistory();

            // Step 7: メタ認知コントローラーを呼び出し、対話結果を渡す
            // MetaCognitiveController削除済み - ハードコード満載システムのため不要

            return result;
            
        } catch (error) {
            console.error('❌ 高度対話制御エラー:', error);
            return this.generateFallbackControl(input, conversationHistory);
        }
    }

    /**
     * 対話結果をメタ認知コントローラーに渡す
     */
    async processDialogueResultsForMetaCognition(controlResult, responseResult) {
        // MetaCognitiveController削除済み - ハードコード満載システムのため不要
    }

    /**
     * 多段階文脈追跡システム
     */
    async trackMultiTurnContext(currentInput, conversationHistory) {
        console.log(`📊 多段階文脈追跡: ${conversationHistory.length}ターン履歴分析`);
        
        const contextAnalysis = {
            contextDepth: 0,
            topicEvolution: [],
            referenceChain: [],
            contextualEntities: {},
            temporalFlow: {},
            semanticContinuity: 0,
            contextBreaks: []
        };

        // 文脈深度計算
        contextAnalysis.contextDepth = Math.min(conversationHistory.length, 10);
        
        // 話題変遷追跡
        contextAnalysis.topicEvolution = this.analyzeTopicEvolution(conversationHistory);
        
        // 参照チェーン分析
        contextAnalysis.referenceChain = this.buildReferenceChain(currentInput, conversationHistory);
        
        // 文脈的エンティティ抽出
        contextAnalysis.contextualEntities = await this.extractContextualEntities(conversationHistory);
        
        // 時間的フロー分析
        contextAnalysis.temporalFlow = this.analyzeTemporalFlow(conversationHistory);
        
        // 意味的連続性評価
        contextAnalysis.semanticContinuity = await this.calculateSemanticContinuity(currentInput, conversationHistory);
        
        // 文脈断絶検出
        contextAnalysis.contextBreaks = this.detectContextBreaks(conversationHistory);
        
        // 文脈メモリ更新
        this.updateContextMemory(contextAnalysis);
        
        return contextAnalysis;
    }

    /**
     * 高度意図認識システム
     */
    async recognizeAdvancedIntent(input, contextAnalysis) {
        console.log(`🎯 高度意図認識開始`);
        
        const intentAnalysis = {
            primaryIntent: null,
            secondaryIntents: [],
            implicitIntents: [],
            intentConfidence: 0,
            intentEvolution: [],
            goalAlignment: {},
            emotionalIntent: {},
            pragmaticIntent: {}
        };

        // 基本意図分類
        const basicIntent = await this.classifyBasicIntent(input);
        
        // 文脈的意図推論
        const contextualIntent = this.inferContextualIntent(input, contextAnalysis);
        
        // 個人特化意図パターン
        const personalIntent = await this.recognizePersonalIntentPatterns(input);
        
        // 暗示的意図検出
        const implicitIntent = this.detectImplicitIntent(input, contextAnalysis);
        
        // 感情的意図分析
        const emotionalIntent = this.analyzeEmotionalIntent(input);
        
        // 語用論的意図分析
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
        intentAnalysis.intentConfidence = this.calculateIntentConfidence(intentAnalysis);
        
        // 意図進化追跡
        intentAnalysis.intentEvolution = this.trackIntentEvolution(intentAnalysis);
        
        return intentAnalysis;
    }

    /**
     * 動的会話フロー制御システム
     */
    async controlConversationFlow(intentAnalysis, contextAnalysis) {
        console.log(`🔄 動的会話フロー制御開始`);
        
        const flowControl = {
            currentPhase: null,
            nextPhase: null,
            flowStrategy: null,
            transitionTriggers: [],
            flowOptimization: {},
            adaptationNeeds: [],
            conversationGoals: [],
            strategicDirections: []
        };

        // 現在の会話フェーズ特定
        flowControl.currentPhase = this.identifyCurrentConversationPhase(contextAnalysis, intentAnalysis);
        
        // 最適な次フェーズ決定
        flowControl.nextPhase = this.determineOptimalNextPhase(flowControl.currentPhase, intentAnalysis);
        
        // フロー戦略選択
        flowControl.flowStrategy = this.selectFlowStrategy(intentAnalysis, contextAnalysis);
        
        // 遷移トリガー設定
        flowControl.transitionTriggers = this.setupTransitionTriggers(flowControl);
        
        // フロー最適化案
        flowControl.flowOptimization = this.generateFlowOptimization(contextAnalysis, intentAnalysis);
        
        // 適応ニーズ特定
        flowControl.adaptationNeeds = this.identifyAdaptationNeeds(intentAnalysis);
        
        // 会話目標設定
        flowControl.conversationGoals = this.setConversationGoals(intentAnalysis, contextAnalysis);
        
        // 戦略的方向性決定
        flowControl.strategicDirections = this.determineStrategicDirections(flowControl);
        
        return flowControl;
    }

    /**
     * 対話戦略決定システム
     */
    async determineDialogueStrategy(flowControl, intentAnalysis) {
        console.log(`🎲 対話戦略決定開始`);
        
        const strategy = {
            primaryStrategy: null,
            supportingStrategies: [],
            adaptationApproach: null,
            interactionStyle: null,
            responseFramework: {},
            engagementTactics: [],
            personalityAlignment: {}
        };

        // 主戦略決定
        strategy.primaryStrategy = this.selectPrimaryStrategy(intentAnalysis, flowControl);
        
        // 支援戦略選択
        strategy.supportingStrategies = this.selectSupportingStrategies(strategy.primaryStrategy, intentAnalysis);
        
        // 適応アプローチ選択
        strategy.adaptationApproach = this.selectAdaptationApproach(intentAnalysis);
        
        // インタラクションスタイル決定
        strategy.interactionStyle = this.determineInteractionStyle(intentAnalysis, flowControl);
        
        // 応答フレームワーク構築
        strategy.responseFramework = this.buildResponseFramework(strategy);
        
        // エンゲージメント戦術
        strategy.engagementTactics = this.selectEngagementTactics(intentAnalysis);
        
        return strategy;
    }

    /**
     * 個人特化統合システム
     */
    async integratePersonalAdaptation(dialogueStrategy) {
        console.log(`👤 個人特化統合開始`);
        
        // 個人プロファイル取得
        const personalProfile = this.personalAnalyzer.generatePersonalProfile();
        const domainProfile = this.domainBuilder.generateExpertiseProfile();
        
        const personalizedStrategy = {
            ...dialogueStrategy,
            personalAdaptations: {},
            domainAdaptations: {},
            styleAdaptations: {},
            preferenceAlignment: {},
            customizations: {}
        };

        // 個人特性適応
        personalizedStrategy.personalAdaptations = this.adaptToPersonalTraits(
            dialogueStrategy, personalProfile
        );
        
        // ドメイン特化適応
        personalizedStrategy.domainAdaptations = this.adaptToDomainExpertise(
            dialogueStrategy, domainProfile
        );
        
        // スタイル適応
        personalizedStrategy.styleAdaptations = this.adaptToPersonalStyle(
            dialogueStrategy, personalProfile
        );
        
        // 好み整合
        personalizedStrategy.preferenceAlignment = this.alignWithPreferences(
            dialogueStrategy, personalProfile
        );
        
        // カスタマイゼーション
        personalizedStrategy.customizations = this.applyPersonalCustomizations(
            dialogueStrategy, personalProfile, domainProfile
        );
        
        return personalizedStrategy;
    }

    /**
     * 応答生成指示作成
     */
    createResponseGuidance(personalizedStrategy) {
        const guidance = {
            responseStructure: this.defineResponseStructure(personalizedStrategy),
            contentGuidelines: this.createContentGuidelines(personalizedStrategy),
            styleInstructions: this.generateStyleInstructions(personalizedStrategy),
            adaptationRules: this.defineAdaptationRules(personalizedStrategy),
            qualityTargets: this.setQualityTargets(personalizedStrategy),
            creativityConstraints: this.setCreativityConstraints(personalizedStrategy)
        };
        
        return guidance;
    }

    // ユーティリティメソッド群 (実装を簡略化)
    analyzeTopicEvolution(history) {
        if (history.length === 0) return [];
        
        const topics = [];
        let currentTopic = null;
        
        for (const [index, turn] of history.entries()) {
            const turnTopic = this.extractTopicKeywords(turn);
            if (!currentTopic || this.calculateTopicSimilarity(currentTopic, turnTopic) < 0.6) {
                currentTopic = turnTopic;
                topics.push({
                    topic: turnTopic,
                    startTurn: index,
                    endTurn: index,
                    transitions: []
                });
            } else {
                topics[topics.length - 1].endTurn = index;
            }
        }
        
        return topics;
    }

    buildReferenceChain(currentInput, history) {
        const references = [];
        const pronouns = ['それ', 'これ', 'あれ', 'そこ', 'ここ', 'あそこ', 'その', 'この', 'あの'];
        const questionWords = ['どう', 'どれ', 'どこ', 'いつ', 'なぜ', 'どのように'];
        
        // 指示語の参照解決
        for (const pronoun of pronouns) {
            if (currentInput.includes(pronoun)) {
                const referent = this.findReferent(pronoun, history);
                if (referent) {
                    references.push({
                        type: 'pronoun',
                        term: pronoun,
                        referent: referent,
                        distance: referent.distance,
                        confidence: referent.confidence || 0.8
                    });
                }
            }
        }
        
        // 疑問詞の文脈依存性検出
        for (const questionWord of questionWords) {
            if (currentInput.includes(questionWord)) {
                const contextualTopic = this.findContextualTopic(questionWord, history);
                if (contextualTopic) {
                    references.push({
                        type: 'question',
                        term: questionWord,
                        referent: contextualTopic,
                        distance: contextualTopic.distance,
                        confidence: contextualTopic.confidence || 0.7
                    });
                }
            }
        }
        
        // 話題継続性の検出
        const topicContinuity = this.detectTopicContinuity(currentInput, history);
        if (topicContinuity.hasReference) {
            references.push({
                type: 'topic_continuation',
                term: topicContinuity.topic,
                referent: topicContinuity.referent,
                distance: topicContinuity.distance,
                confidence: topicContinuity.confidence
            });
        }
        
        return references;
    }

    async extractContextualEntities(history) {
        const entities = {
            people: new Set(),
            places: new Set(),
            things: new Set(),
            concepts: new Set(),
            temporal: new Set()
        };
        
        for (const turn of history) {
            if (this.conceptDB && this.conceptDB.processText) {
                try {
                    const result = await this.conceptDB.processText(turn.content || turn.message || turn);
                    if (result.extractedConcepts) {
                        result.extractedConcepts.forEach(concept => {
                            entities.concepts.add(concept.name || concept.text);
                        });
                    }
                } catch (error) {
                    console.warn('概念抽出エラー:', error);
                }
            }
        }
        
        return {
            people: Array.from(entities.people),
            places: Array.from(entities.places),
            things: Array.from(entities.things),
            concepts: Array.from(entities.concepts),
            temporal: Array.from(entities.temporal)
        };
    }

    analyzeTemporalFlow(history) {
        return {
            chronology: this.extractChronology(history),
            timeReferences: this.extractTimeReferences(history),
            sequenceMarkers: this.extractSequenceMarkers(history),
            temporalRelations: this.analyzeTemporalRelations(history)
        };
    }

    async calculateSemanticContinuity(currentInput, history) {
        if (history.length === 0) return 1.0;
        
        let totalSimilarity = 0;
        let count = 0;
        let weightedSum = 0;
        let weightSum = 0;
        
        // 重み付き意味的類似度計算（直近ほど重要）
        const maxHistory = Math.min(history.length, 5); // 最大5ターン
        
        for (let i = 0; i < maxHistory; i++) {
            const historyIndex = history.length - 1 - i;
            const turn = history[historyIndex];
            const weight = Math.pow(0.8, i); // 距離に応じて重み減少
            
            const similarity = await this.calculateTextSimilarity(
                currentInput, 
                turn.content || turn.message || turn
            );
            
            // キーワード重複度も考慮
            const keywordOverlap = this.calculateKeywordOverlap(currentInput, turn.content || turn.message || turn);
            
            // 総合類似度計算
            const enhancedSimilarity = (similarity * 0.7 + keywordOverlap * 0.3);
            
            weightedSum += enhancedSimilarity * weight;
            weightSum += weight;
            totalSimilarity += enhancedSimilarity;
            count++;
        }
        
        // 重み付き平均と単純平均の調和平均
        const weightedAverage = weightSum > 0 ? weightedSum / weightSum : 0;
        const simpleAverage = count > 0 ? totalSimilarity / count : 0;
        
        // 調和平均で最終的な継続性スコア計算
        let continuityScore = weightedAverage > 0 && simpleAverage > 0 
            ? 2 * (weightedAverage * simpleAverage) / (weightedAverage + simpleAverage)
            : Math.max(weightedAverage, simpleAverage);
        
        // 意図的連続性ボーナス（学習・説明・提案パターン）
        const intentBonus = this.calculateIntentContinuityBonus(currentInput, history);
        continuityScore = Math.min(continuityScore + intentBonus, 1.0);
        
        return Math.min(Math.max(continuityScore, 0.1), 1.0); // 0.1-1.0の範囲に制限
    }

    calculateIntentContinuityBonus(currentInput, history) {
        if (history.length === 0) return 0;
        
        let bonus = 0;
        
        // 外部設定から意図パターンを取得
        const contextualPatterns = this.intentPatterns.contextual || {};
        const learningPattern = new RegExp(contextualPatterns.learningPattern || "(?:学習|理解)", 'g');
        const requestPattern = new RegExp(contextualPatterns.requestPattern || "(?:提案|ステップ)", 'g');
        const skillPattern = new RegExp(contextualPatterns.skillPattern || "(?:レベル|スキル)", 'g');
        const technicalPattern = new RegExp(contextualPatterns.technicalPattern || "(?:プログラミング|開発)", 'g');
        
        // 現在の入力の意図分析
        const currentHasLearning = learningPattern.test(currentInput);
        const currentHasRequest = requestPattern.test(currentInput);
        const currentHasSkill = skillPattern.test(currentInput);
        
        // 履歴の意図パターン分析
        let historyHasLearning = false;
        let historyHasSkill = false;
        let historyHasTechnical = false;
        
        for (const turn of history) {
            const turnText = turn.content || turn.message || turn;
            if (learningPattern.test(turnText)) historyHasLearning = true;
            if (skillPattern.test(turnText)) historyHasSkill = true;
            if (technicalPattern.test(turnText)) {
                historyHasTechnical = true;
            }
        }
        
        // 意図的連続性ボーナス計算
        if (currentHasLearning && (historyHasLearning || historyHasTechnical)) {
            bonus += 0.05; // 学習継続ボーナス
        }
        
        if (currentHasRequest && historyHasTechnical) {
            bonus += 0.05; // 技術質問継続ボーナス
        }
        
        if (currentHasSkill && (historyHasSkill || historyHasTechnical)) {
            bonus += 0.05; // スキル・レベル関連継続ボーナス
        }
        
        // 技術分野共通ボーナス
        if (historyHasTechnical && technicalPattern.test(currentInput)) {
            bonus += 0.03; // 技術分野継続ボーナス
        }
        
        return Math.min(bonus, 0.15); // 最大15%のボーナス
    }

    /**
     * 重要語句抽出（外部設定対応）
     */
    extractImportantTerms(cleanText) {
        const importantTerms = [];
        const termConfig = this.keywordConfig.importantTerms || {};
        
        // 各カテゴリのパターンから抽出
        for (const [category, pattern] of Object.entries(termConfig)) {
            if (typeof pattern === 'string') {
                const regex = new RegExp(pattern, 'g');
                const matches = cleanText.match(regex) || [];
                importantTerms.push(...matches);
            }
        }
        
        // フォールバック（外部設定がない場合）
        if (importantTerms.length === 0) {
            importantTerms.push(
                ...cleanText.match(/(?:プログラミング|開発|学習|実装|react|javascript)/g) || []
            );
        }
        
        return importantTerms;
    }

    detectContextBreaks(history) {
        const breaks = [];
        
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];
            
            const topicSimilarity = this.calculateTopicSimilarity(
                this.extractTopicKeywords(prev),
                this.extractTopicKeywords(curr)
            );
            
            if (topicSimilarity < 0.3) {
                breaks.push({
                    position: i,
                    type: 'topic_shift',
                    severity: 1 - topicSimilarity
                });
            }
        }
        
        return breaks;
    }

    async classifyBasicIntent(input) {
        const intentPatterns = {
            question: /[？?]|どう|なぜ|いつ|どこ|だれ|何|教えて/,
            request: /お願い|してください|してほしい|できますか/,
            information: /について|に関して|情報|詳細|説明/,
            problem: /困っ|問題|エラー|うまくいかない|できない/,
            learning: /学習|勉強|理解したい|覚えたい|習いたい/,
            casual: /こんにちは|ありがとう|よろしく|雑談/,
            creative: /アイデア|創造|新しい|クリエイティブ|発想/
        };
        
        for (const [intent, pattern] of Object.entries(intentPatterns)) {
            if (pattern.test(input)) {
                return {
                    type: intent,
                    confidence: 0.8,
                    evidence: input.match(pattern)
                };
            }
        }
        
        return {
            type: 'general',
            confidence: 0.5,
            evidence: []
        };
    }

    inferContextualIntent(input, contextAnalysis) {
        // 文脈から意図を推論
        const contextualClues = {
            followUp: contextAnalysis.referenceChain.length > 0,
            topicContinuation: contextAnalysis.semanticContinuity > 0.7,
            newTopic: contextAnalysis.contextBreaks.length > 0,
            deepDive: contextAnalysis.contextDepth > 5
        };
        
        if (contextualClues.followUp) {
            return { type: 'follow_up', confidence: 0.8 };
        } else if (contextualClues.topicContinuation) {
            return { type: 'continuation', confidence: 0.7 };
        } else if (contextualClues.newTopic) {
            return { type: 'topic_change', confidence: 0.9 };
        } else if (contextualClues.deepDive) {
            return { type: 'deep_exploration', confidence: 0.6 };
        }
        
        return { type: 'neutral', confidence: 0.5 };
    }

    async recognizePersonalIntentPatterns(input) {
        // 個人特化意図パターン認識
        const personalProfile = this.personalAnalyzer.generatePersonalProfile();
        
        if (personalProfile.personality?.emotionalTendencies?.personalityTraits) {
            const traits = personalProfile.personality.emotionalTendencies.personalityTraits;
            
            if (traits.analytical > 0.6 && input.match(/分析|データ|詳細|ロジック/)) {
                return { type: 'analytical_inquiry', confidence: 0.9 };
            } else if (traits.creative > 0.6 && input.match(/アイデア|創造|発想|新しい/)) {
                return { type: 'creative_exploration', confidence: 0.9 };
            } else if (traits.practical > 0.6 && input.match(/実用|実際|やり方|手順/)) {
                return { type: 'practical_guidance', confidence: 0.9 };
            }
        }
        
        return { type: 'general_personal', confidence: 0.5 };
    }

    // その他のメソッド（簡略実装）
    detectImplicitIntent(input, contextAnalysis) {
        const implicit = [];
        
        // 省略された情報の推論
        if (input.length < 20 && contextAnalysis.contextDepth > 0) {
            implicit.push({ type: 'context_dependent', confidence: 0.7 });
        }
        
        // 感情的含意の検出
        if (input.match(/でも|しかし|ただ|やっぱり/)) {
            implicit.push({ type: 'emotional_undertone', confidence: 0.6 });
        }
        
        return implicit;
    }

    analyzeEmotionalIntent(input) {
        const emotions = {
            positive: (input.match(/嬉しい|楽しい|良い|素晴らしい|ありがとう/) || []).length,
            negative: (input.match(/悲しい|困る|問題|エラー|失敗/) || []).length,
            neutral: 1
        };
        
        const total = Object.values(emotions).reduce((sum, val) => sum + val, 0);
        
        return {
            emotions: Object.fromEntries(
                Object.entries(emotions).map(([k, v]) => [k, v / total])
            ),
            dominantEmotion: Object.entries(emotions).sort(([,a], [,b]) => b - a)[0][0]
        };
    }

    analyzePragmaticIntent(input, contextAnalysis) {
        return {
            speechAct: this.identifySpeechAct(input),
            politenessLevel: this.assessPolitenessLevel(input),
            directness: this.assessDirectness(input),
            cooperativeness: this.assessCooperativeness(input, contextAnalysis)
        };
    }

    // 対話状態管理
    updateDialogueState(summary) {
        this.dialogueState.currentTopic = summary.topic;
        this.dialogueState.intentStack.push(summary.intent);
        this.dialogueState.contextDepth = summary.analysis.contextDepth;
        // this.dialogueState.conversationGoals = flowControl.conversationGoals;
        
        // 履歴更新 (★ 要約オブジェクトを保存)
        this.conversationHistory.push(summary);
        
        // 履歴サイズ制限
        if (this.conversationHistory.length > 50) {
            this.conversationHistory = this.conversationHistory.slice(-40);
        }
    }

    updateContextMemory(contextAnalysis) {
        const key = `context_${Date.now()}`;
        this.contextMemory.set(key, {
            ...contextAnalysis,
            timestamp: new Date().toISOString()
        });
        
        // メモリサイズ制限
        if (this.contextMemory.size > 100) {
            const oldestKey = this.contextMemory.keys().next().value;
            this.contextMemory.delete(oldestKey);
        }
    }

    calculateConversationMetrics() {
        return {
            totalTurns: this.conversationHistory.length,
            averageContextDepth: this.calculateAverageContextDepth(),
            intentAccuracy: this.calculateIntentAccuracy(),
            flowEffectiveness: this.calculateFlowEffectiveness(),
            personalAdaptationScore: this.calculatePersonalAdaptationScore()
        };
    }

    // フォールバック処理
    generateFallbackControl(input, conversationHistory) {
        return {
            contextAnalysis: { contextDepth: 0, semanticContinuity: 0.5 },
            intentAnalysis: { primaryIntent: { type: 'general', confidence: 0.3 } },
            flowControl: { currentPhase: 'general', flowStrategy: 'adaptive' },
            dialogueStrategy: { primaryStrategy: 'supportive' },
            responseGuidance: { responseStructure: 'basic', styleInstructions: 'neutral' },
            fallback: true
        };
    }

    // 簡略ヘルパーメソッド
    extractTopicKeywords(turn) {
        const text = turn.content || turn.message || turn.toString();
        return text.split(/\s+/).filter(word => word.length > 2).slice(0, 5);
    }

    calculateTopicSimilarity(topic1, topic2) {
        if (!topic1 || !topic2) return 0;
        const intersection = topic1.filter(word => topic2.includes(word));
        const union = [...new Set([...topic1, ...topic2])];
        return union.length > 0 ? intersection.length / union.length : 0;
    }

    findReferent(pronoun, history) {
        // 強化実装 - 複数ターンから最適な参照先を検索
        if (history.length === 0) return null;
        
        const maxDistance = Math.min(history.length, 3); // 最大3ターン遡る
        
        for (let i = 0; i < maxDistance; i++) {
            const historyIndex = history.length - 1 - i;
            const turn = history[historyIndex];
            const turnText = turn.content || turn.message || turn;
            
            // 参照先候補の評価
            const referenceScore = this.evaluateReferenceCandidate(pronoun, turnText);
            
            if (referenceScore > 0.5) {
                return {
                    text: turnText,
                    distance: i + 1,
                    confidence: referenceScore
                };
            }
        }
        
        // フォールバック: 直前のターン
        const lastTurn = history[history.length - 1];
        return {
            text: lastTurn.content || lastTurn.message || lastTurn,
            distance: 1,
            confidence: 0.5
        };
    }

    findContextualTopic(questionWord, history) {
        if (history.length === 0) return null;
        
        // 直近の話題から文脈依存トピックを検索
        const recentTopics = this.analyzeTopicEvolution(history).slice(-2);
        
        if (recentTopics.length > 0) {
            const latestTopic = recentTopics[recentTopics.length - 1];
            return {
                text: latestTopic.topic.join(' '),
                distance: 1,
                confidence: 0.7
            };
        }
        
        return null;
    }

    detectTopicContinuity(currentInput, history) {
        if (history.length === 0) return { hasReference: false };
        
        const currentKeywords = this.extractKeywords(currentInput);
        const lastTurn = history[history.length - 1];
        const lastKeywords = this.extractKeywords(lastTurn.content || lastTurn.message || lastTurn);
        
        const overlap = currentKeywords.filter(kw => lastKeywords.includes(kw));
        
        if (overlap.length > 0) {
            return {
                hasReference: true,
                topic: overlap[0],
                referent: { text: lastTurn.content || lastTurn.message || lastTurn },
                distance: 1,
                confidence: Math.min(overlap.length / Math.max(currentKeywords.length, 1), 1.0)
            };
        }
        
        return { hasReference: false };
    }

    evaluateReferenceCandidate(pronoun, candidateText) {
        // 指示語と候補テキストの適合性を評価
        const textLength = candidateText.length;
        const hasNoun = /[a-zA-Z\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]{3,}/.test(candidateText);
        
        let score = 0;
        
        // テキスト長による評価
        if (textLength > 10) score += 0.3;
        if (textLength > 30) score += 0.2;
        
        // 内容の豊富さ
        if (hasNoun) score += 0.3;
        
        // 指示語タイプによる調整
        if (['それ', 'その'].includes(pronoun)) {
            // 直接的な指示語は高スコア
            score += 0.2;
        }
        
        return Math.min(score, 1.0);
    }

    async calculateTextSimilarity(text1, text2) {
        // 日本語対応類似度計算
        const keywords1 = this.extractKeywords(text1);
        const keywords2 = this.extractKeywords(text2);
        
        if (keywords1.length === 0 && keywords2.length === 0) return 1.0;
        if (keywords1.length === 0 || keywords2.length === 0) return 0.0;
        
        // 完全一致チェック
        const exactMatches = keywords1.filter(kw1 => 
            keywords2.some(kw2 => kw1 === kw2)
        );
        
        // 部分一致チェック（含有関係）
        const partialMatches = keywords1.filter(kw1 => 
            keywords2.some(kw2 => kw1.includes(kw2) || kw2.includes(kw1))
        );
        
        // 関連語チェック（技術用語）
        const relatedMatches = this.checkRelatedTerms(keywords1, keywords2);
        
        // 類似度計算（重み付き）
        const totalKeywords = Math.max(keywords1.length, keywords2.length);
        const similarity = (
            exactMatches.length * 1.0 +           // 完全一致: 100%
            partialMatches.length * 0.7 +         // 部分一致: 70%
            relatedMatches * 0.5                  // 関連語: 50%
        ) / totalKeywords;
        
        return Math.min(similarity, 1.0);
    }

    checkRelatedTerms(keywords1, keywords2) {
        // 外部設定から技術関連語の関係性を取得
        const techRelations = this.techRelations;
        
        let relatedCount = 0;
        
        for (const kw1 of keywords1) {
            for (const kw2 of keywords2) {
                // 1. 静的関係性チェック（従来の外部設定）
                if (techRelations[kw1]?.includes(kw2) || techRelations[kw2]?.includes(kw1)) {
                    relatedCount += 1.0;
                    continue;
                }
                
                // 2. 動的学習関係性チェック（新機能）
                if (this.dynamicLearner) {
                    const dynamicStrength1 = this.dynamicLearner.getRelationshipStrength(kw1, kw2);
                    const dynamicStrength2 = this.dynamicLearner.getRelationshipStrength(kw2, kw1);
                    const maxDynamicStrength = Math.max(dynamicStrength1, dynamicStrength2);
                    
                    if (maxDynamicStrength > 0.3) {
                        relatedCount += maxDynamicStrength;
                        continue;
                    }
                }
                
                // 部分一致チェック（含有関係）
                if (kw1.includes(kw2) || kw2.includes(kw1)) {
                    relatedCount += 0.8;
                    continue;
                }
                
                // カテゴリ別関連チェック
                const webTerms = ['ウェブ', 'web', 'react', 'html', 'css', 'javascript', 'アプリケーション'];
                const devTerms = ['開発', '実装', 'プログラミング', 'コード', 'システム', '作成'];
                const managementTerms = ['状態管理', '管理', 'システム'];
                const learningTerms = ['学習', 'プログラミング', '開発'];
                
                // Web開発カテゴリ
                if (webTerms.includes(kw1) && webTerms.includes(kw2) && kw1 !== kw2) {
                    relatedCount += 0.6;
                    continue;
                }
                
                // 開発カテゴリ
                if (devTerms.includes(kw1) && devTerms.includes(kw2) && kw1 !== kw2) {
                    relatedCount += 0.7;
                    continue;
                }
                
                // 管理カテゴリ
                if (managementTerms.includes(kw1) && managementTerms.includes(kw2) && kw1 !== kw2) {
                    relatedCount += 0.5;
                    continue;
                }
                
                // 学習カテゴリ
                if (learningTerms.includes(kw1) && learningTerms.includes(kw2) && kw1 !== kw2) {
                    relatedCount += 0.4;
                    continue;
                }
            }
        }
        
        return relatedCount;
    }

    calculateKeywordOverlap(text1, text2) {
        // 重要キーワードの重複度計算
        const keywords1 = this.extractKeywords(text1);
        const keywords2 = this.extractKeywords(text2);
        
        if (keywords1.length === 0 && keywords2.length === 0) return 1.0;
        if (keywords1.length === 0 || keywords2.length === 0) return 0.0;
        
        const intersection = keywords1.filter(kw => keywords2.includes(kw));
        const union = [...new Set([...keywords1, ...keywords2])];
        
        return union.length > 0 ? intersection.length / union.length : 0;
    }

    extractKeywords(text) {
        // 日本語対応キーワード抽出（外部設定版）
        const cleanText = text.toLowerCase();
        
        // 外部設定から重要語句パターンを取得
        const importantTerms = this.extractImportantTerms(cleanText);
        
        // 漢字キーワード（名詞相当）
        const kanjiKeywords = cleanText.match(/[一-龯]{2,}/g) || [];
        
        // カタカナキーワード（外来語・技術用語）
        const katakanaKeywords = cleanText.match(/[ァ-ヴー]{2,}/g) || [];
        
        // 英語キーワード
        const englishKeywords = cleanText.match(/[a-z]{3,}/g) || [];
        
        // 外部設定からストップワードを取得
        const stopwords = this.keywordConfig.stopwords || [];
        
        // 全キーワードをマージ・クリーンアップ
        const allKeywords = [...new Set([...importantTerms, ...kanjiKeywords, ...katakanaKeywords, ...englishKeywords])]
            .filter(word => word.length >= 2) // 2文字以上
            .filter(word => !stopwords.some(stop => word.includes(stop))) // ストップワード含有チェック
            .filter(word => !/^[あ-ん]{1,2}$/.test(word)) // ひらがな1-2文字除外
            .filter(word => !/^[0-9]+$/.test(word)) // 数字のみ除外
            .filter(word => !/^[ぁ-ん]*[です|ます|した|ている]$/.test(word)) // 語尾変化除外
            .slice(0, 10); // 最大10個
        
        return allKeywords;
    }

    extractChronology(history) { return []; }
    extractTimeReferences(history) { return []; }
    extractSequenceMarkers(history) { return []; }
    analyzeTemporalRelations(history) { return {}; }

    determinePrimaryIntent(basic, contextual, personal, implicit) {
        // 最も信頼度の高い意図を選択
        const candidates = [basic, contextual, personal, ...implicit];
        return candidates.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    }

    identifySecondaryIntents(basic, contextual, personal) {
        return [basic, contextual, personal].filter(intent => 
            intent && intent.confidence && intent.confidence > 0.5
        ).slice(1);
    }

    calculateIntentConfidence(intentAnalysis) {
        return intentAnalysis.primaryIntent?.confidence || 0.5;
    }

    trackIntentEvolution(intentAnalysis) {
        return [intentAnalysis.primaryIntent];
    }

    identifyCurrentConversationPhase(context, intent) {
        if (context.contextDepth === 0) return 'initiation';
        if (context.contextDepth < 3) return 'exploration';
        if (context.contextDepth < 7) return 'development';
        return 'conclusion';
    }

    determineOptimalNextPhase(currentPhase, intent) {
        const transitions = {
            'initiation': 'exploration',
            'exploration': 'development',
            'development': 'conclusion',
            'conclusion': 'initiation'
        };
        return transitions[currentPhase] || 'exploration';
    }

    selectFlowStrategy(intent, context) {
        if (intent.primaryIntent?.type === 'question') return 'informative';
        if (intent.primaryIntent?.type === 'problem') return 'problem_solving';
        if (intent.primaryIntent?.type === 'creative') return 'creative_exploration';
        return 'adaptive';
    }

    setupTransitionTriggers(flowControl) {
        return [`phase_${flowControl.nextPhase}`, 'user_satisfaction', 'goal_achievement'];
    }

    generateFlowOptimization(context, intent) {
        return {
            suggestedDirections: ['deepen_context', 'explore_alternatives'],
            efficiencyTips: ['maintain_focus', 'encourage_elaboration']
        };
    }

    identifyAdaptationNeeds(intent) {
        const needs = [];
        if (intent.primaryIntent?.confidence < 0.7) needs.push('intent_clarification');
        if (intent.implicitIntents?.length > 0) needs.push('implicit_addressing');
        return needs;
    }

    setConversationGoals(intent, context) {
        return ['user_satisfaction', 'information_transfer', 'relationship_building'];
    }

    determineStrategicDirections(flowControl) {
        return [`enhance_${flowControl.flowStrategy}`, 'maintain_engagement'];
    }

    selectPrimaryStrategy(intent, flow) {
        const strategies = {
            'question': 'informative',
            'problem': 'problem_solving',
            'learning': 'educational',
            'creative': 'collaborative'
        };
        return strategies[intent.primaryIntent?.type] || 'supportive';
    }

    selectSupportingStrategies(primary, intent) {
        return ['empathetic', 'adaptive', 'clarifying'];
    }

    selectAdaptationApproach(intent) {
        return intent.primaryIntent?.confidence > 0.8 ? 'direct' : 'exploratory';
    }

    determineInteractionStyle(intent, flow) {
        return 'collaborative';
    }

    buildResponseFramework(strategy) {
        return {
            structure: 'structured',
            tone: 'supportive',
            depth: 'appropriate'
        };
    }

    selectEngagementTactics(intent) {
        return ['active_listening', 'thoughtful_questioning', 'encouraging_feedback'];
    }

    adaptToPersonalTraits(strategy, profile) {
        return { adapted: true, profile_used: !!profile };
    }

    adaptToDomainExpertise(strategy, profile) {
        return { adapted: true, domain_considered: true };
    }

    adaptToPersonalStyle(strategy, profile) {
        return { style_adapted: true };
    }

    alignWithPreferences(strategy, profile) {
        return { preferences_aligned: true };
    }

    applyPersonalCustomizations(strategy, personal, domain) {
        return { customized: true };
    }

    defineResponseStructure(strategy) {
        return 'adaptive_structure';
    }

    createContentGuidelines(strategy) {
        return ['be_helpful', 'be_clear', 'be_engaging'];
    }

    generateStyleInstructions(strategy) {
        return 'match_user_style';
    }

    defineAdaptationRules(strategy) {
        return ['adapt_to_context', 'respect_preferences'];
    }

    setQualityTargets(strategy) {
        return { clarity: 0.9, helpfulness: 0.9, engagement: 0.8 };
    }

    setCreativityConstraints(strategy) {
        return { appropriate: true, relevant: true };
    }

    calculateAverageContextDepth() {
        if (this.conversationHistory.length === 0) return 0;
        const total = this.conversationHistory.reduce((sum, turn) => 
            sum + (turn.contextAnalysis?.contextDepth || 0), 0);
        return total / this.conversationHistory.length;
    }

    calculateIntentAccuracy() { return 0.8; }
    calculateFlowEffectiveness() { return 0.85; }
    calculatePersonalAdaptationScore() { return 0.9; }

    identifySpeechAct(input) { return 'informative'; }
    assessPolitenessLevel(input) { return 0.7; }
    assessDirectness(input) { return 0.6; }
    assessCooperativeness(input, context) { return 0.8; }

    /**
     * システム統計取得
     */
    getSystemStats() {
        return {
            totalConversations: this.controllerStats.totalConversations,
            learningStats: this.getLearningStats(),
            dialogueState: this.dialogueState,
            // 他の関連する統計情報をここに追加
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 全データをエクスポート
     */
    async exportAllData() {
        const learningStats = await this.db.getLearningStats();
        const conversationHistory = await this.db.getConversationHistory();
        const userRelations = await this.db.getAllUserRelations();

        return {
            learningStats,
            conversationHistory,
            userRelations,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    /**
     * ユーザーフィードバックを処理し、学習に反映
     */
    async processFeedback(input, feedback, response) {
        try {
            // persistentLearningDBにフィードバックイベントを記録
            await this.db.logLearningEvent({
                type: 'user_feedback',
                userId: this.userId,
                input: input,
                feedback: feedback,
                response: response,
                timestamp: new Date().toISOString()
            });

            // MetaCognitiveController削除済み - ハードコード満載システムのため不要
            console.log(`✅ フィードバック処理完了: ${feedback.rating || 'N/A'}点`);
        } catch (error) {
            console.error('❌ フィードバック処理エラー:', error);
            throw error;
        }
    }

    /**
     * 分析結果に対するフィードバックを処理し、学習に反映
     */
    async processAnalysisFeedback(analysis, feedback) {
        try {
            // persistentLearningDBに分析フィードバックイベントを記録
            await this.db.logLearningEvent({
                type: 'analysis_feedback',
                userId: this.userId,
                analysis: analysis,
                feedback: feedback,
                timestamp: new Date().toISOString()
            });

            // MetaCognitiveController削除済み - ハードコード満載システムのため不要
            console.log(`✅ 分析フィードバック処理完了: ${feedback.rating || 'N/A'}点`);
        } catch (error) {
            console.error('❌ 分析フィードバック処理エラー:', error);
            throw error;
        }
    }

    async processAnalysisFeedback(analysis, feedback) {
        try {
            // persistentLearningDBに分析フィードバックイベントを記録
            await this.db.logLearningEvent({
                type: 'analysis_feedback',
                userId: this.userId,
                analysis: analysis,
                feedback: feedback,
                timestamp: new Date().toISOString()
            });

            // MetaCognitiveController削除済み - ハードコード満載システムのため不要
            console.log(`✅ 分析フィードバック処理完了: ${feedback.rating || 'N/A'}点`);
        } catch (error) {
            console.error('❌ 分析フィードバック処理エラー:', error);
            throw error;
        }
    }

    /**
     * リアルタイム応答スタイル調整
     */
    async adjustResponseStyle(currentResponse, adjustmentRequest) {
        try {
            if (!this.responseGenerator || !this.responseGenerator.applyResponseGuidanceAdjustments) {
                throw new Error('応答生成エンジンが初期化されていないか、調整機能がありません。');
            }

            // adjustmentRequestをresponseGuidanceの形式に変換
            const guidance = {
                responseStructure: adjustmentRequest.type === 'shorter' || adjustmentRequest.type === 'longer' ? (adjustmentRequest.type === 'shorter' ? 'summary_only' : 'adaptive_structure') : undefined,
                styleInstructions: adjustmentRequest.type === 'more_formal' ? 'formal' : (adjustmentRequest.type === 'more_casual' ? 'casual' : undefined),
                contentGuidelines: adjustmentRequest.type === 'be_concise' ? ['be_concise'] : (adjustmentRequest.type === 'be_detailed' ? ['be_detailed'] : undefined)
                // 他の調整リクエストタイプに応じてguidanceを拡張
            };

            // EnhancedResponseGenerationEngineV2の応答調整ヘルパーメソッドを呼び出す
            const adjustedResponse = await this.responseGenerator.applyResponseGuidanceAdjustments(currentResponse, guidance);

            console.log(`✅ リアルタイム応答調整完了: ${adjustmentRequest.type}`);
            return adjustedResponse;
        } catch (error) {
            console.error('❌ リアルタイム応答調整エラー:', error);
            throw error;
        }
    }

    /**
     * 個人プロファイル取得
     */
    async getPersonalProfile() {
        const personalProfile = await this.personalDialogueAnalyzer.analyzePersonalDialogues(this.conversationHistory);
        const domainProfile = this.domainKnowledgeBuilder.generateExpertiseProfile();
        // PersonalResponseAdapterのgeneratePersonalizedLearningProfileは削除されたため、ここでは直接生成
        const learningProfile = {
            totalInteractions: this.conversationHistory.length,
            learningStats: this.getLearningStats(),
            // その他の学習関連情報
        };

        return {
            personalProfile,
            domainProfile,
            learningProfile,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 個人統計情報取得
     */
    async getPersonalStats() {
        const personalAnalysisStats = this.personalDialogueAnalyzer.analysisStats;
        const domainBuildingStats = this.domainKnowledgeBuilder.buildingStats;
        const responseAdaptationStats = this.personalResponseAdapter.adaptationStats;

        return {
            personalAnalysis: personalAnalysisStats,
            domainBuilding: domainBuildingStats,
            responseAdaptation: responseAdaptationStats,
            systemStatus: {
                personalAnalyzerReady: !!this.personalDialogueAnalyzer,
                domainBuilderReady: !!this.domainKnowledgeBuilder,
                responseAdapterReady: !!this.personalResponseAdapter
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 対話ログを処理し、個人学習データとして反映
     */
    async processDialogueLogsForLearning(dialogueLogs) {
        try {
            if (!dialogueLogs || !Array.isArray(dialogueLogs)) {
                throw new Error('対話ログ配列が必要です');
            }
            console.log(`🧠 個人学習データ追加: ${dialogueLogs.length}ログ`);

            // PersonalDialogueAnalyzerで話し方パターンを分析
            const personalAnalysisResult = await this.personalDialogueAnalyzer.analyzePersonalDialogues(dialogueLogs);
            // ここでpersonalAnalysisResultをpersistentLearningDBに保存するロジックが必要になる可能性あり

            // DomainKnowledgeBuilderでドメイン知識を構築
            const domainAnalysisResults = await this.domainKnowledgeBuilder.buildKnowledgeFromDialogueLogs(dialogueLogs);

            // persistentLearningDBに学習イベントを記録
            await this.db.logLearningEvent({
                type: 'personal_learning',
                userId: this.userId,
                data: {
                    personalAnalysis: personalAnalysisResult,
                    domainAnalysis: domainAnalysisResults,
                    logCount: dialogueLogs.length
                },
                timestamp: new Date().toISOString()
            });

            console.log(`✅ 個人学習データ追加完了: ${dialogueLogs.length}ログ`);
            return {
                personalAnalysis: personalAnalysisResult,
                domainAnalysis: domainAnalysisResults
            };
        } catch (error) {
            console.error('❌ 個人学習データ追加エラー:', error);
            throw error;
        }
    }

    /**
     * ハイブリッド処理を実行
     */
    async processHybrid(text, options = {}) {
        if (!this.hybridProcessor) {
            throw new Error('ハイブリッドプロセッサーが初期化されていません。');
        }
        const result = await this.hybridProcessor.processText(text, options);
        const textCategory = options.category || 'default';
        const adjustmentResult = await this.qualityAdjuster.autoAdjust(result, textCategory);
        return { optimizedResult: adjustmentResult.optimizedResult, originalResult: adjustmentResult.originalResult, qualityImprovement: adjustmentResult.qualityImprovement, targetAchieved: adjustmentResult.targetAchieved, processingTime: result.statistics.processingTime, adjustmentTime: adjustmentResult.processingTime };
    }

    /**
     * テキストの品質を評価
     */
    async evaluateTextQuality(text, options = {}) {
        if (!this.hybridProcessor) {
            throw new Error('ハイブリッドプロセッサーが初期化されていません。');
        }
        const [withMeCab, withoutMeCab] = await Promise.all([
            this.hybridProcessor.processText(text, { ...options, enableMeCab: true }),
            this.hybridProcessor.processText(text, { ...options, enableMeCab: false })
        ]);
        const qualityData = {
            withMeCab: {
                conceptCount: withMeCab.statistics.enhancedTermCount,
                qualityScore: withMeCab.statistics.qualityScore,
                processingTime: withMeCab.statistics.processingTime
            },
            withoutMeCab: {
                conceptCount: withoutMeCab.statistics.enhancedTermCount,
                qualityScore: withoutMeCab.statistics.qualityScore,
                processingTime: withoutMeCab.statistics.processingTime
            },
            improvement: {
                conceptCountImprovement: ((withMeCab.statistics.enhancedTermCount - withoutMeCab.statistics.enhancedTermCount) / Math.max(withoutMeCab.statistics.enhancedTermCount, 1) * 100).toFixed(1),
                qualityScoreImprovement: ((withMeCab.statistics.qualityScore - withoutMeCab.statistics.qualityScore) / Math.max(withoutMeCab.statistics.qualityScore, 0.1) * 100).toFixed(1)
            }
        };
        return qualityData;
    }

    /**
     * テキストから概念を抽出
     */
    async extractConceptsFromText(text, options = {}) {
        if (!this.hybridProcessor) {
            throw new Error('ハイブリッドプロセッサーが初期化されていません。');
        }
        const result = await this.hybridProcessor.processText(text, options);
        const conceptData = {
            concepts: result.enhancedTerms,
            conceptGroups: result.conceptGroups,
            relationships: result.relationships,
            statistics: {
                conceptCount: result.enhancedTerms.length,
                groupCount: Object.keys(result.conceptGroups).length,
                relationshipCount: result.relationships.length,
                qualityScore: result.statistics.qualityScore
            }
        };
        return conceptData;
    }

    /**
     * ハイブリッド処理統計取得
     */
    async getHybridStats() {
        if (!this.hybridProcessor) {
            throw new Error('ハイブリッドプロセッサーが初期化されていません。');
        }
        // EnhancedHybridLanguageProcessorにgetStats()メソッドがあると仮定
        // もしなければ、ここで手動で統計情報を集計する
        return this.hybridProcessor.getStats ? this.hybridProcessor.getStats() : {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageProcessingTime: 0,
            lastProcessed: null
        };
    }

    /**
     * 品質自動調整統計取得
     */
    async getQualityAdjustmentStats() {
        if (!this.qualityAdjuster) {
            throw new Error('品質調整システムが初期化されていません。');
        }
        return this.qualityAdjuster.getSystemStats();
    }

    /**
     * 品質自動調整設定更新
     */
    async updateQualityAdjustmentSettings(settings) {
        if (!this.qualityAdjuster) {
            throw new Error('品質調整システムが初期化されていません。');
        }
        this.qualityAdjuster.updateSettings(settings);
        return { message: '品質自動調整設定を更新しました', currentSettings: this.qualityAdjuster.adjustmentParams };
    }

    /**
     * システム情報取得
     */
    async getSystemInfo() {
        const learningStats = this.getLearningStats();
        const conceptDB = this.conceptDB; // minimalAIから取得したconceptDB

        return {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: '1.0.0',
            nodeVersion: process.version,
            platform: process.platform,
            conceptDBSize: {
                surface: conceptDB.concepts?.surface?.length || 0,
                deep: conceptDB.concepts?.deep?.length || 0
            },
            learningStats: learningStats,
            hybridEnabled: !!this.hybridProcessor,
            lastBackup: null // TODO: persistentLearningDBから取得
        };
    }

    /**
     * 品質改善を実行
     */
    async executeQualityImprovement() {
        if (!this.conceptQualityManager) {
            throw new Error('概念品質管理システムが初期化されていません。');
        }
        const currentDB = this.conceptDB; // minimalAIから取得したconceptDB
        const improvedDB = this.conceptQualityManager.improveConceptDB(currentDB);
        // minimalAI.updateConceptDB(improvedDB); // minimalAIのupdateConceptDBを呼び出す
        // TODO: minimalAIのupdateConceptDBを呼び出す方法を検討
        const qualityReport = this.conceptQualityManager.generateQualityReport(currentDB, improvedDB);
        return { report: qualityReport, improvements: improvedDB.qualityStats, message: `品質改善完了 - ${improvedDB.qualityStats.improvementRatio}%の効率化を達成` };
    }

    /**
     * 品質統計取得
     */
    async getQualityStats() {
        if (!this.conceptQualityManager) {
            throw new Error('概念品質管理システムが初期化されていません。');
        }
        const conceptDB = this.conceptDB; // minimalAIから取得したconceptDB
        const allConcepts = [
            ...(conceptDB.concepts?.surface || []),
            ...(conceptDB.concepts?.deep || [])
        ];
        const qualityStats = {
            totalConcepts: allConcepts.length,
            surfaceConcepts: conceptDB.concepts?.surface?.length || 0,
            deepConcepts: conceptDB.concepts?.deep?.length || 0,
            qualityDistribution: {
                excellent: 0,
                good: 0,
                acceptable: 0,
                poor: 0
            },
            categoryDistribution: {},
            duplicatesPotential: 0
        };
        for (const concept of allConcepts) {
            const quality = this.conceptQualityManager.calculateQualityScore(concept);
            if (quality >= this.conceptQualityManager.qualityThresholds.excellent) { qualityStats.qualityDistribution.excellent++; } else if (quality >= this.conceptQualityManager.qualityThresholds.good) { qualityStats.qualityDistribution.good++; } else if (quality >= this.conceptQualityManager.qualityThresholds.acceptable) { qualityStats.qualityDistribution.acceptable++; } else { qualityStats.qualityDistribution.poor++; }
            const category = concept.category || 'general';
            qualityStats.categoryDistribution[category] = (qualityStats.categoryDistribution[category] || 0) + 1;
        }
        const duplicateGroups = this.conceptQualityManager.findDuplicateGroups(allConcepts);
        qualityStats.duplicatesPotential = duplicateGroups.length;
        return qualityStats;
    }

    /**
     * 個人プロファイル取得

    /**
     * ★ 対話ターンの要約を作成する
     * @param {string} input - ユーザー入力
     * @param {Object} result - 制御結果オブジェクト
     * @returns {Object} - 要約オブジェクト
     */
    _summarizeTurn(input, result) {
        const { contextAnalysis, intentAnalysis } = result;
        return {
            userInput: input,
            // response: result.responseGuidance, // 将来的にAIの応答も記録
            timestamp: new Date().toISOString(),
            topic: contextAnalysis.contextualState?.dominantTopic || 'unknown',
            intent: intentAnalysis.primaryIntent?.type || 'unknown',
            keywords: this.extractKeywords(input),
            // 元の分析結果も保持しておく
            analysis: {
                contextDepth: contextAnalysis.contextDepth,
                intentConfidence: intentAnalysis.confidence,
                flowStrategy: result.dialogueStrategy?.primaryStrategy,
            }
        };
    }
}

// サブクラス（簡略実装）
class AdvancedIntentClassifier {
    constructor() {
        this.patterns = new Map();
        this.learningHistory = [];
    }
}

class DynamicFlowController {
    constructor() {
        this.flowRules = new Map();
        this.adaptationStrategies = [];
    }
}

class MultiTurnContextTracker {
    constructor() {
        this.contextWindow = 10;
        this.trackingAccuracy = 0.85;
    }
}

class DialogueStateManager {
    constructor() {
        this.stateHistory = [];
        this.currentState = null;
    }
}