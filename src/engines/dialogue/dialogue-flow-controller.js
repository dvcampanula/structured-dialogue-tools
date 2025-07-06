#!/usr/bin/env node
/**
 * DialogueFlowController - 対話フロー制御専用コントローラー
 * 
 * 🔄 動的会話フロー制御・管理機能分離
 * 🎭 対話戦略決定・個人特化統合
 * 📋 応答生成指示・対話状態管理
 */

export class DialogueFlowController {
    constructor() {
        this.dialogueState = {
            currentTopic: null,
            intentStack: [],
            contextDepth: 0,
            conversationGoals: [],
            activeStrategies: [],
            flowHistory: []
        };
        
        // フロー制御パラメータ
        this.flowConfig = {
            maxIntentStack: 10,
            maxStrategyStack: 5,
            goalTrackingWindow: 20,
            strategyAdaptationRate: 0.2,
            flowTransitionThreshold: 0.6,
            personalAdaptationWeight: 0.3
        };
        
        // 対話戦略タイプ
        this.strategyTypes = {
            directive: { focus: 'goal_achievement', adaptability: 0.3 },
            exploratory: { focus: 'knowledge_discovery', adaptability: 0.8 },
            supportive: { focus: 'user_assistance', adaptability: 0.6 },
            collaborative: { focus: 'joint_problem_solving', adaptability: 0.7 },
            educational: { focus: 'learning_facilitation', adaptability: 0.5 }
        };
        
        // フロー制御統計
        this.flowStats = {
            totalTransitions: 0,
            strategyChanges: 0,
            goalAchievements: 0,
            adaptationEvents: 0
        };
        
        console.log('✅ DialogueFlowController初期化完了');
    }

    /**
     * メイン対話フロー制御
     */
    async controlDialogueFlow(intentAnalysis, contextAnalysis, personalData = {}) {
        console.log(`🔄 対話フロー制御開始: 意図${intentAnalysis.primaryIntent?.type}, 文脈深度${contextAnalysis.contextDepth}`);
        
        try {
            const flowControl = {
                flowTransition: null,
                strategyAdaptation: null,
                goalAlignment: {},
                conversationDirection: null,
                adaptationSignals: [],
                flowMetrics: {}
            };

            // Step 1: フロー遷移分析
            flowControl.flowTransition = await this.analyzeFlowTransition(intentAnalysis, contextAnalysis);
            
            // Step 2: 戦略適応
            flowControl.strategyAdaptation = await this.adaptDialogueStrategy(intentAnalysis, contextAnalysis, personalData);
            
            // Step 3: 目標整合性分析
            flowControl.goalAlignment = this.analyzeGoalAlignment(intentAnalysis, contextAnalysis);
            
            // Step 4: 会話方向決定
            flowControl.conversationDirection = this.determineConversationDirection(flowControl);
            
            // Step 5: 適応シグナル検出
            flowControl.adaptationSignals = this.detectAdaptationSignals(intentAnalysis, contextAnalysis, personalData);
            
            // Step 6: フローメトリクス計算
            flowControl.flowMetrics = this.calculateFlowMetrics(flowControl);
            
            // 対話状態更新
            this.updateDialogueState(intentAnalysis, contextAnalysis, flowControl);
            
            console.log(`✅ フロー制御完了: 方向${flowControl.conversationDirection}, 戦略${flowControl.strategyAdaptation?.recommendedStrategy}`);
            
            return flowControl;
            
        } catch (error) {
            console.error('❌ 対話フロー制御エラー:', error.message);
            return this.generateFallbackFlow(intentAnalysis, contextAnalysis);
        }
    }

    /**
     * フロー遷移分析
     */
    async analyzeFlowTransition(intentAnalysis, contextAnalysis) {
        const transition = {
            type: 'continuation',
            confidence: 0.5,
            triggers: [],
            expectedOutcome: null,
            adaptationRequired: false
        };

        // 意図ベース遷移分析
        if (intentAnalysis.primaryIntent) {
            const intentType = intentAnalysis.primaryIntent.type;
            
            // 意図変化による遷移
            if (this.hasIntentShift(intentType)) {
                transition.type = 'intent_shift';
                transition.confidence = intentAnalysis.primaryIntent.confidence;
                transition.triggers.push('intent_change');
                transition.adaptationRequired = true;
            }
            
            // 複合意図による複雑化
            if (intentAnalysis.secondaryIntents.length > 2) {
                transition.type = 'complexity_increase';
                transition.adaptationRequired = true;
                transition.triggers.push('multiple_intents');
            }
        }

        // 文脈ベース遷移分析
        if (contextAnalysis.contextBreaks && contextAnalysis.contextBreaks.length > 0) {
            transition.type = 'context_break';
            transition.confidence = 0.8;
            transition.triggers.push('context_discontinuity');
            transition.adaptationRequired = true;
        }

        // 文脈深度による遷移
        if (contextAnalysis.contextDepth > 8) {
            transition.type = 'deep_engagement';
            transition.expectedOutcome = 'detailed_exploration';
        } else if (contextAnalysis.contextDepth < 3) {
            transition.type = 'surface_interaction';
            transition.expectedOutcome = 'quick_resolution';
        }

        // 話題変遷による遷移
        if (contextAnalysis.topicEvolution && contextAnalysis.topicEvolution.length > 0) {
            const recentEvolution = contextAnalysis.topicEvolution.slice(-2);
            if (recentEvolution.length === 2 && recentEvolution[1].patternType === 'shift') {
                transition.type = 'topic_shift';
                transition.triggers.push('topic_change');
                transition.adaptationRequired = true;
            }
        }

        return transition;
    }

    /**
     * 対話戦略適応
     */
    async adaptDialogueStrategy(intentAnalysis, contextAnalysis, personalData) {
        const adaptation = {
            currentStrategy: this.getCurrentStrategy(),
            recommendedStrategy: null,
            adaptationReason: [],
            confidenceLevel: 0,
            personalFactors: {},
            strategyMix: {}
        };

        // 基本戦略決定
        const baseStrategy = this.determineBaseStrategy(intentAnalysis, contextAnalysis);
        
        // 個人特化要素統合
        const personalAdaptation = this.integratePersonalFactors(baseStrategy, personalData);
        
        // 文脈適応
        const contextAdaptation = this.adaptToContext(personalAdaptation, contextAnalysis);
        
        adaptation.recommendedStrategy = contextAdaptation.strategy;
        adaptation.adaptationReason = contextAdaptation.reasons;
        adaptation.confidenceLevel = contextAdaptation.confidence;
        adaptation.personalFactors = personalAdaptation.factors;
        adaptation.strategyMix = this.calculateStrategyMix(contextAdaptation);

        // 戦略変更必要性判定
        if (adaptation.recommendedStrategy !== adaptation.currentStrategy) {
            this.flowStats.strategyChanges++;
            adaptation.changeRequired = true;
        }

        return adaptation;
    }

    /**
     * 目標整合性分析
     */
    analyzeGoalAlignment(intentAnalysis, contextAnalysis) {
        const alignment = {
            primaryGoal: null,
            goalStack: [],
            completionRate: 0,
            conflictingGoals: [],
            emergentGoals: []
        };

        // 意図から目標推定
        if (intentAnalysis.primaryIntent) {
            alignment.primaryGoal = this.inferGoalFromIntent(intentAnalysis.primaryIntent);
        }

        // 既存目標との整合性チェック
        alignment.goalStack = this.updateGoalStack(alignment.primaryGoal, contextAnalysis);
        
        // 完了率計算
        alignment.completionRate = this.calculateGoalCompletion(alignment.goalStack);
        
        // 目標競合検出
        alignment.conflictingGoals = this.detectGoalConflicts(alignment.goalStack);
        
        // 新興目標検出
        alignment.emergentGoals = this.detectEmergentGoals(intentAnalysis, contextAnalysis);

        return alignment;
    }

    /**
     * 会話方向決定
     */
    determineConversationDirection(flowControl) {
        const direction = {
            primary: null,
            alternatives: [],
            confidence: 0,
            reasoning: []
        };

        // フロー遷移による方向性
        if (flowControl.flowTransition) {
            switch (flowControl.flowTransition.type) {
                case 'deep_engagement':
                    direction.primary = 'exploration_deepening';
                    direction.reasoning.push('深い関与パターン検出');
                    break;
                case 'topic_shift':
                    direction.primary = 'topic_transition';
                    direction.reasoning.push('話題転換パターン検出');
                    break;
                case 'context_break':
                    direction.primary = 'context_repair';
                    direction.reasoning.push('文脈断絶修復必要');
                    break;
                default:
                    direction.primary = 'natural_continuation';
            }
        }

        // 戦略による方向調整
        if (flowControl.strategyAdaptation && flowControl.strategyAdaptation.recommendedStrategy) {
            const strategy = flowControl.strategyAdaptation.recommendedStrategy;
            direction.alternatives = this.getAlternativeDirections(strategy);
        }

        // 目標整合性による調整
        if (flowControl.goalAlignment && flowControl.goalAlignment.conflictingGoals.length > 0) {
            direction.alternatives.unshift('goal_reconciliation');
            direction.reasoning.push('目標競合解決必要');
        }

        // 信頼度計算
        direction.confidence = this.calculateDirectionConfidence(direction, flowControl);

        return direction;
    }

    /**
     * 適応シグナル検出
     */
    detectAdaptationSignals(intentAnalysis, contextAnalysis, personalData) {
        const signals = [];

        // 意図信頼度低下シグナル
        if (intentAnalysis.confidence < 0.6) {
            signals.push({
                type: 'intent_uncertainty',
                strength: 1 - intentAnalysis.confidence,
                recommendation: 'clarification_seeking'
            });
        }

        // 文脈断絶シグナル
        if (contextAnalysis.contextBreaks && contextAnalysis.contextBreaks.length > 0) {
            signals.push({
                type: 'context_disruption',
                strength: Math.min(contextAnalysis.contextBreaks.length * 0.3, 1.0),
                recommendation: 'context_bridging'
            });
        }

        // 個人適応シグナル
        if (personalData && personalData.preferences) {
            const adaptationNeeded = this.assessPersonalAdaptationNeed(personalData);
            if (adaptationNeeded.required) {
                signals.push({
                    type: 'personal_adaptation',
                    strength: adaptationNeeded.urgency,
                    recommendation: adaptationNeeded.strategy
                });
            }
        }

        // 複雑性シグナル
        const complexity = this.assessConversationComplexity(intentAnalysis, contextAnalysis);
        if (complexity > 0.7) {
            signals.push({
                type: 'complexity_overload',
                strength: complexity,
                recommendation: 'simplification'
            });
        }

        return signals.sort((a, b) => b.strength - a.strength);
    }

    /**
     * 対話戦略決定
     */
    async determineDialogueStrategy(flowControl, intentAnalysis) {
        const strategy = {
            primary: null,
            supporting: [],
            rationale: [],
            adaptationLevel: 0,
            executionPlan: {},
            fallbackStrategies: []
        };

        // フロー制御からの戦略推薦
        if (flowControl.strategyAdaptation && flowControl.strategyAdaptation.recommendedStrategy) {
            strategy.primary = flowControl.strategyAdaptation.recommendedStrategy;
            strategy.rationale.push('フロー制御による推薦');
        }

        // 意図ベース戦略補完
        const intentStrategy = this.deriveStrategyFromIntent(intentAnalysis);
        if (intentStrategy && intentStrategy !== strategy.primary) {
            strategy.supporting.push(intentStrategy);
            strategy.rationale.push('意図分析による補完');
        }

        // 適応レベル決定
        strategy.adaptationLevel = this.calculateAdaptationLevel(flowControl, intentAnalysis);

        // 実行計画作成
        strategy.executionPlan = this.createExecutionPlan(strategy, flowControl);

        // フォールバック戦略
        strategy.fallbackStrategies = this.generateFallbackStrategies(strategy.primary);

        return strategy;
    }

    /**
     * 個人特化統合
     */
    async integratePersonalAdaptation(dialogueStrategy) {
        const personalizedStrategy = {
            baseStrategy: dialogueStrategy,
            personalAdaptations: {},
            adaptationStrength: 0,
            culturalFactors: {},
            communicationStyle: {},
            preferenceAlignment: {}
        };

        // 個人的学習スタイル適応
        personalizedStrategy.personalAdaptations.learningStyle = this.adaptToLearningStyle(dialogueStrategy);
        
        // コミュニケーションスタイル適応
        personalizedStrategy.communicationStyle = this.adaptCommunicationStyle(dialogueStrategy);
        
        // 嗜好整合性
        personalizedStrategy.preferenceAlignment = this.alignWithPreferences(dialogueStrategy);
        
        // 適応強度計算
        personalizedStrategy.adaptationStrength = this.calculatePersonalAdaptationStrength(personalizedStrategy);

        return personalizedStrategy;
    }

    /**
     * 応答生成指示作成
     */
    createResponseGuidance(personalizedStrategy) {
        const guidance = {
            tone: null,
            structure: null,
            content_focus: [],
            interaction_style: null,
            adaptation_instructions: [],
            quality_targets: {},
            personalization_hints: {}
        };

        // 基本戦略からの指示
        if (personalizedStrategy.baseStrategy && personalizedStrategy.baseStrategy.primary) {
            const strategyConfig = this.strategyTypes[personalizedStrategy.baseStrategy.primary];
            if (strategyConfig) {
                guidance.content_focus.push(strategyConfig.focus);
            }
        }

        // トーン決定
        guidance.tone = this.determineTone(personalizedStrategy);
        
        // 構造決定
        guidance.structure = this.determineStructure(personalizedStrategy);
        
        // インタラクションスタイル
        guidance.interaction_style = this.determineInteractionStyle(personalizedStrategy);
        
        // 適応指示
        guidance.adaptation_instructions = this.createAdaptationInstructions(personalizedStrategy);
        
        // 品質目標
        guidance.quality_targets = this.setQualityTargets(personalizedStrategy);
        
        // 個人化ヒント
        guidance.personalization_hints = this.generatePersonalizationHints(personalizedStrategy);

        return guidance;
    }

    // ヘルパーメソッド群
    getCurrentStrategy() {
        return this.dialogueState.activeStrategies.length > 0 ? 
               this.dialogueState.activeStrategies[this.dialogueState.activeStrategies.length - 1] : 
               'supportive';
    }

    hasIntentShift(currentIntentType) {
        if (this.dialogueState.intentStack.length === 0) return false;
        
        const lastIntent = this.dialogueState.intentStack[this.dialogueState.intentStack.length - 1];
        return lastIntent !== currentIntentType;
    }

    determineBaseStrategy(intentAnalysis, contextAnalysis) {
        const intentType = intentAnalysis.primaryIntent?.type;
        
        // 意図タイプから基本戦略マッピング
        const intentStrategyMap = {
            'question': 'supportive',
            'learning': 'educational',
            'request': 'directive',
            'clarification': 'supportive',
            'exploration': 'exploratory'
        };
        
        let baseStrategy = intentStrategyMap[intentType] || 'supportive';
        
        // 文脈深度による調整
        if (contextAnalysis.contextDepth > 5) {
            baseStrategy = 'collaborative';
        }
        
        return baseStrategy;
    }

    integratePersonalFactors(baseStrategy, personalData) {
        const factors = {
            communicationPreference: 'balanced',
            learningStyle: 'adaptive',
            interactionTempo: 'medium'
        };
        
        let adaptedStrategy = baseStrategy;
        
        // 個人データから適応
        if (personalData.preferences) {
            if (personalData.preferences.detail_level === 'high') {
                adaptedStrategy = 'educational';
                factors.communicationPreference = 'detailed';
            } else if (personalData.preferences.detail_level === 'low') {
                adaptedStrategy = 'directive';
                factors.communicationPreference = 'concise';
            }
        }
        
        return {
            strategy: adaptedStrategy,
            factors: factors
        };
    }

    adaptToContext(personalAdaptation, contextAnalysis) {
        let strategy = personalAdaptation.strategy;
        const reasons = [];
        let confidence = 0.7;
        
        // 文脈断絶による適応
        if (contextAnalysis.contextBreaks && contextAnalysis.contextBreaks.length > 0) {
            strategy = 'supportive';
            reasons.push('文脈断絶への対応');
            confidence += 0.2;
        }
        
        // 話題安定性による適応
        if (contextAnalysis.trackingMetrics && contextAnalysis.trackingMetrics.topicStability > 0.8) {
            if (strategy === 'supportive') {
                strategy = 'exploratory';
                reasons.push('安定した話題での探索促進');
            }
        }
        
        return {
            strategy: strategy,
            reasons: reasons,
            confidence: Math.min(confidence, 1.0)
        };
    }

    calculateStrategyMix(contextAdaptation) {
        const mix = {};
        const primary = contextAdaptation.strategy;
        
        mix[primary] = 0.7;
        
        // 補完戦略
        if (primary === 'directive') {
            mix['supportive'] = 0.3;
        } else if (primary === 'exploratory') {
            mix['collaborative'] = 0.3;
        } else {
            mix['educational'] = 0.3;
        }
        
        return mix;
    }

    inferGoalFromIntent(primaryIntent) {
        const intentGoalMap = {
            'question': 'information_acquisition',
            'learning': 'knowledge_building',
            'request': 'task_completion',
            'clarification': 'understanding_improvement'
        };
        
        return intentGoalMap[primaryIntent.type] || 'general_assistance';
    }

    updateGoalStack(primaryGoal, contextAnalysis) {
        const currentGoals = [...this.dialogueState.conversationGoals];
        
        if (primaryGoal && !currentGoals.includes(primaryGoal)) {
            currentGoals.push(primaryGoal);
        }
        
        // 古い目標の削除
        if (currentGoals.length > this.flowConfig.goalTrackingWindow) {
            currentGoals.shift();
        }
        
        return currentGoals;
    }

    calculateGoalCompletion(goalStack) {
        if (goalStack.length === 0) return 1.0;
        
        // 簡単な完了率計算（実際はより複雑な論理が必要）
        const completedGoals = goalStack.filter(goal => this.isGoalCompleted(goal)).length;
        return completedGoals / goalStack.length;
    }

    isGoalCompleted(goal) {
        // 簡易実装：実際は文脈分析に基づく判定が必要
        return Math.random() > 0.3; // プレースホルダー
    }

    detectGoalConflicts(goalStack) {
        const conflicts = [];
        
        for (let i = 0; i < goalStack.length - 1; i++) {
            for (let j = i + 1; j < goalStack.length; j++) {
                if (this.areGoalsConflicting(goalStack[i], goalStack[j])) {
                    conflicts.push({
                        goal1: goalStack[i],
                        goal2: goalStack[j],
                        severity: 0.6
                    });
                }
            }
        }
        
        return conflicts;
    }

    areGoalsConflicting(goal1, goal2) {
        const conflictPairs = [
            ['task_completion', 'knowledge_building'],
            ['information_acquisition', 'creative_exploration']
        ];
        
        return conflictPairs.some(pair => 
            (pair[0] === goal1 && pair[1] === goal2) || 
            (pair[1] === goal1 && pair[0] === goal2)
        );
    }

    detectEmergentGoals(intentAnalysis, contextAnalysis) {
        const emergent = [];
        
        // 暗示的意図からの新興目標
        if (intentAnalysis.implicitIntents) {
            for (const implicit of intentAnalysis.implicitIntents) {
                if (implicit.type === 'learning_continuation') {
                    emergent.push({
                        goal: 'progressive_learning',
                        confidence: implicit.confidence,
                        source: 'implicit_intent'
                    });
                }
            }
        }
        
        return emergent;
    }

    getAlternativeDirections(strategy) {
        const alternatives = {
            'directive': ['task_focused', 'goal_oriented'],
            'exploratory': ['discovery_mode', 'creative_exploration'],
            'supportive': ['assistance_mode', 'guidance_provision'],
            'collaborative': ['joint_solving', 'co_creation'],
            'educational': ['teaching_mode', 'learning_facilitation']
        };
        
        return alternatives[strategy] || ['adaptive_response'];
    }

    calculateDirectionConfidence(direction, flowControl) {
        let confidence = 0.6; // ベース値
        
        // フロー遷移の信頼度影響
        if (flowControl.flowTransition && flowControl.flowTransition.confidence) {
            confidence += flowControl.flowTransition.confidence * 0.3;
        }
        
        // 戦略適応の信頼度影響
        if (flowControl.strategyAdaptation && flowControl.strategyAdaptation.confidenceLevel) {
            confidence += flowControl.strategyAdaptation.confidenceLevel * 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }

    assessPersonalAdaptationNeed(personalData) {
        const need = {
            required: false,
            urgency: 0,
            strategy: 'maintain_current'
        };
        
        // プレースホルダー実装
        if (personalData.preferences && personalData.preferences.adaptation_sensitivity === 'high') {
            need.required = true;
            need.urgency = 0.8;
            need.strategy = 'high_personalization';
        }
        
        return need;
    }

    assessConversationComplexity(intentAnalysis, contextAnalysis) {
        let complexity = 0;
        
        // 意図の複雑さ
        complexity += intentAnalysis.secondaryIntents ? intentAnalysis.secondaryIntents.length * 0.1 : 0;
        complexity += intentAnalysis.implicitIntents ? intentAnalysis.implicitIntents.length * 0.15 : 0;
        
        // 文脈の複雑さ
        complexity += (contextAnalysis.contextDepth || 0) * 0.05;
        complexity += (contextAnalysis.contextBreaks ? contextAnalysis.contextBreaks.length * 0.2 : 0);
        
        return Math.min(complexity, 1.0);
    }

    deriveStrategyFromIntent(intentAnalysis) {
        if (!intentAnalysis.primaryIntent) return 'supportive';
        
        const intentType = intentAnalysis.primaryIntent.type;
        const confidence = intentAnalysis.primaryIntent.confidence;
        
        if (confidence < 0.5) {
            return 'supportive'; // 不確実な意図には支援的に
        }
        
        const strategyMap = {
            'question': 'educational',
            'request': 'directive',
            'learning': 'collaborative'
        };
        
        return strategyMap[intentType] || 'adaptive';
    }

    calculateAdaptationLevel(flowControl, intentAnalysis) {
        let level = 0.5;
        
        // 適応シグナルによる調整
        if (flowControl.adaptationSignals) {
            const maxSignalStrength = Math.max(...flowControl.adaptationSignals.map(s => s.strength), 0);
            level += maxSignalStrength * 0.3;
        }
        
        // 意図信頼度による調整
        if (intentAnalysis.confidence < 0.6) {
            level += 0.2;
        }
        
        return Math.min(level, 1.0);
    }

    createExecutionPlan(strategy, flowControl) {
        return {
            primaryAction: this.mapStrategyToAction(strategy.primary),
            supportingActions: strategy.supporting.map(s => this.mapStrategyToAction(s)),
            adaptationTriggers: flowControl.adaptationSignals || [],
            qualityCheckpoints: ['mid_response', 'pre_completion'],
            fallbackTriggers: ['low_confidence', 'user_confusion']
        };
    }

    mapStrategyToAction(strategyType) {
        const actionMap = {
            'directive': 'provide_clear_instructions',
            'exploratory': 'encourage_discovery',
            'supportive': 'offer_assistance',
            'collaborative': 'invite_participation',
            'educational': 'facilitate_learning'
        };
        
        return actionMap[strategyType] || 'adaptive_response';
    }

    generateFallbackStrategies(primaryStrategy) {
        const fallbacks = {
            'directive': ['supportive', 'educational'],
            'exploratory': ['collaborative', 'supportive'],
            'supportive': ['educational', 'collaborative'],
            'collaborative': ['supportive', 'directive'],
            'educational': ['supportive', 'collaborative']
        };
        
        return fallbacks[primaryStrategy] || ['supportive'];
    }

    adaptToLearningStyle(dialogueStrategy) {
        // プレースホルダー：実際は個人データに基づく適応
        return {
            visual_emphasis: 0.3,
            structured_approach: 0.7,
            example_frequency: 0.5
        };
    }

    adaptCommunicationStyle(dialogueStrategy) {
        return {
            formality_level: 0.4,
            directness: 0.6,
            empathy_expression: 0.7
        };
    }

    alignWithPreferences(dialogueStrategy) {
        return {
            detail_level: 0.7,
            interaction_pace: 0.6,
            feedback_frequency: 0.5
        };
    }

    calculatePersonalAdaptationStrength(personalizedStrategy) {
        const adaptations = personalizedStrategy.personalAdaptations;
        let strength = 0;
        
        // 各適応要素の重み計算
        Object.values(adaptations).forEach(adaptation => {
            if (typeof adaptation === 'object') {
                const avgValue = Object.values(adaptation).reduce((a, b) => a + b, 0) / Object.values(adaptation).length;
                strength += avgValue * this.flowConfig.personalAdaptationWeight;
            }
        });
        
        return Math.min(strength, 1.0);
    }

    determineTone(personalizedStrategy) {
        const strategy = personalizedStrategy.baseStrategy?.primary;
        const adaptationStrength = personalizedStrategy.adaptationStrength;
        
        const toneMap = {
            'directive': 'clear_and_focused',
            'exploratory': 'curious_and_open',
            'supportive': 'warm_and_helpful',
            'collaborative': 'engaging_and_inclusive',
            'educational': 'patient_and_informative'
        };
        
        let baseTone = toneMap[strategy] || 'balanced';
        
        // 個人適応による調整
        if (adaptationStrength > 0.7) {
            baseTone = `personalized_${baseTone}`;
        }
        
        return baseTone;
    }

    determineStructure(personalizedStrategy) {
        const strategy = personalizedStrategy.baseStrategy?.primary;
        
        const structureMap = {
            'directive': 'step_by_step',
            'exploratory': 'open_ended',
            'supportive': 'guided_conversation',
            'collaborative': 'interactive_dialogue',
            'educational': 'structured_learning'
        };
        
        return structureMap[strategy] || 'adaptive_structure';
    }

    determineInteractionStyle(personalizedStrategy) {
        const commStyle = personalizedStrategy.communicationStyle;
        
        if (commStyle.directness > 0.7) {
            return 'direct_interaction';
        } else if (commStyle.empathy_expression > 0.7) {
            return 'empathetic_interaction';
        } else {
            return 'balanced_interaction';
        }
    }

    createAdaptationInstructions(personalizedStrategy) {
        const instructions = [];
        
        if (personalizedStrategy.adaptationStrength > 0.6) {
            instructions.push('apply_high_personalization');
        }
        
        if (personalizedStrategy.preferenceAlignment.detail_level > 0.7) {
            instructions.push('provide_detailed_explanations');
        }
        
        if (personalizedStrategy.communicationStyle.empathy_expression > 0.6) {
            instructions.push('express_understanding_and_support');
        }
        
        return instructions;
    }

    setQualityTargets(personalizedStrategy) {
        return {
            clarity: 0.85,
            relevance: 0.90,
            personalization: personalizedStrategy.adaptationStrength,
            engagement: 0.80,
            helpfulness: 0.88
        };
    }

    generatePersonalizationHints(personalizedStrategy) {
        const hints = {};
        
        if (personalizedStrategy.personalAdaptations.learningStyle) {
            hints.learning_adaptation = personalizedStrategy.personalAdaptations.learningStyle;
        }
        
        if (personalizedStrategy.communicationStyle) {
            hints.communication_adaptation = personalizedStrategy.communicationStyle;
        }
        
        return hints;
    }

    calculateFlowMetrics(flowControl) {
        return {
            transitionSmoothness: this.calculateTransitionSmoothness(flowControl.flowTransition),
            strategicAlignment: this.calculateStrategicAlignment(flowControl.strategyAdaptation),
            goalCoherence: this.calculateGoalCoherence(flowControl.goalAlignment),
            adaptationResponsiveness: this.calculateAdaptationResponsiveness(flowControl.adaptationSignals),
            overallFlowQuality: this.calculateOverallFlowQuality(flowControl)
        };
    }

    calculateTransitionSmoothness(flowTransition) {
        if (!flowTransition) return 0.5;
        
        let smoothness = flowTransition.confidence || 0.5;
        
        if (flowTransition.adaptationRequired) {
            smoothness *= 0.8; // 適応必要な場合は若干低下
        }
        
        return smoothness;
    }

    calculateStrategicAlignment(strategyAdaptation) {
        if (!strategyAdaptation) return 0.5;
        
        return strategyAdaptation.confidenceLevel || 0.5;
    }

    calculateGoalCoherence(goalAlignment) {
        if (!goalAlignment) return 0.5;
        
        let coherence = goalAlignment.completionRate || 0.5;
        
        // 競合目標によるペナルティ
        if (goalAlignment.conflictingGoals && goalAlignment.conflictingGoals.length > 0) {
            coherence *= 0.7;
        }
        
        return coherence;
    }

    calculateAdaptationResponsiveness(adaptationSignals) {
        if (!adaptationSignals || adaptationSignals.length === 0) return 1.0;
        
        // シグナル数が多いほど適応必要性が高い
        const responsiveness = Math.max(0, 1.0 - adaptationSignals.length * 0.2);
        return responsiveness;
    }

    calculateOverallFlowQuality(flowControl) {
        const metrics = flowControl.flowMetrics || {};
        
        const weights = {
            transitionSmoothness: 0.25,
            strategicAlignment: 0.25,
            goalCoherence: 0.25,
            adaptationResponsiveness: 0.25
        };
        
        let quality = 0;
        quality += (metrics.transitionSmoothness || 0.5) * weights.transitionSmoothness;
        quality += (metrics.strategicAlignment || 0.5) * weights.strategicAlignment;
        quality += (metrics.goalCoherence || 0.5) * weights.goalCoherence;
        quality += (metrics.adaptationResponsiveness || 0.5) * weights.adaptationResponsiveness;
        
        return quality;
    }

    updateDialogueState(intentAnalysis, contextAnalysis, flowControl) {
        // 意図スタック更新
        if (intentAnalysis.primaryIntent) {
            this.dialogueState.intentStack.push(intentAnalysis.primaryIntent.type);
            if (this.dialogueState.intentStack.length > this.flowConfig.maxIntentStack) {
                this.dialogueState.intentStack.shift();
            }
        }
        
        // 文脈深度更新
        this.dialogueState.contextDepth = contextAnalysis.contextDepth || 0;
        
        // 現在の話題更新
        if (contextAnalysis.contextualState && contextAnalysis.contextualState.dominantTopic) {
            this.dialogueState.currentTopic = contextAnalysis.contextualState.dominantTopic;
        }
        
        // アクティブ戦略更新
        if (flowControl.strategyAdaptation && flowControl.strategyAdaptation.recommendedStrategy) {
            this.dialogueState.activeStrategies.push(flowControl.strategyAdaptation.recommendedStrategy);
            if (this.dialogueState.activeStrategies.length > this.flowConfig.maxStrategyStack) {
                this.dialogueState.activeStrategies.shift();
            }
        }
        
        // フロー履歴更新
        this.dialogueState.flowHistory.push({
            timestamp: Date.now(),
            intentType: intentAnalysis.primaryIntent?.type,
            strategy: flowControl.strategyAdaptation?.recommendedStrategy,
            flowQuality: flowControl.flowMetrics?.overallFlowQuality
        });
        
        // 統計更新
        this.flowStats.totalTransitions++;
    }

    generateFallbackFlow(intentAnalysis, contextAnalysis) {
        return {
            flowTransition: { type: 'continuation', confidence: 0.3, adaptationRequired: false },
            strategyAdaptation: { recommendedStrategy: 'supportive', confidenceLevel: 0.5 },
            goalAlignment: { completionRate: 0.5, conflictingGoals: [] },
            conversationDirection: { primary: 'natural_continuation', confidence: 0.5 },
            adaptationSignals: [],
            flowMetrics: { overallFlowQuality: 0.5 }
        };
    }

    /**
     * システム統計情報
     */
    getSystemStats() {
        return {
            ...this.flowStats,
            currentIntentStackLength: this.dialogueState.intentStack.length,
            currentStrategyStackLength: this.dialogueState.activeStrategies.length,
            avgFlowQuality: this.calculateAverageFlowQuality()
        };
    }

    calculateAverageFlowQuality() {
        if (this.dialogueState.flowHistory.length === 0) return 0.5;
        
        const qualitySum = this.dialogueState.flowHistory
            .filter(h => h.flowQuality !== undefined)
            .reduce((sum, h) => sum + h.flowQuality, 0);
        
        const qualityCount = this.dialogueState.flowHistory.filter(h => h.flowQuality !== undefined).length;
        
        return qualityCount > 0 ? qualitySum / qualityCount : 0.5;
    }

    /**
     * 状態リセット
     */
    resetState() {
        this.dialogueState = {
            currentTopic: null,
            intentStack: [],
            contextDepth: 0,
            conversationGoals: [],
            activeStrategies: [],
            flowHistory: []
        };
        console.log('🔄 対話フロー状態リセット完了');
    }
}

// デフォルトインスタンス
export const dialogueFlowController = new DialogueFlowController();