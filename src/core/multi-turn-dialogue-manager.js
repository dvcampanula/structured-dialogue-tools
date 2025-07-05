#!/usr/bin/env node
/**
 * MultiTurnDialogueManager - Phase 7H.1 マルチターン対話制御システム
 * 
 * 🧬 既存DialogueFlowController拡張型マルチターン対話管理
 * 🎯 長期会話・文脈継続・感情状態追跡
 * 🔄 PersonalDialogueAnalyzer統合・学習データ連携
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class MultiTurnDialogueManager {
    constructor(dialogueFlowController, personalDialogueAnalyzer, contextTrackingSystem) {
        this.dialogueFlowController = dialogueFlowController;
        this.personalAnalyzer = personalDialogueAnalyzer;
        this.contextTracker = contextTrackingSystem;
        
        // マルチターンセッション管理
        this.activeSessions = new Map();
        this.sessionHistory = [];
        
        // 設定パラメータ
        this.config = {
            maxSessionDuration: 24 * 60 * 60 * 1000, // 24時間
            maxTurnsPerSession: 100,
            contextRetentionTurns: 20,
            memoryCleanupInterval: 60 * 60 * 1000, // 1時間
            effectivenessThreshold: 0.7,
            personalAdaptationRate: 0.15
        };
        
        // データ永続化パス
        this.dataPath = './data/learning/multi-turn-sessions.json';
        this.memoryPath = './data/learning/dialogue-memory.json';
        
        // セッション統計
        this.stats = {
            totalSessions: 0,
            activeSessions: 0,
            averageTurns: 0,
            totalTurns: 0,
            longestSession: 0,
            memoryEntries: 0
        };
        
        // 長期記憶ストレージ
        this.longTermMemory = new Map();
        
        this.initializeSystem();
        console.log('🚀 MultiTurnDialogueManager初期化完了');
    }
    
    initializeSystem() {
        // 既存セッションデータの読み込み
        this.loadSessionData();
        this.loadMemoryData();
        
        // 定期クリーンアップ設定
        setInterval(() => {
            this.cleanupExpiredSessions();
            this.optimizeMemory();
        }, this.config.memoryCleanupInterval);
    }
    
    /**
     * 新規セッション開始
     */
    startSession(userId, initialInput = null) {
        const sessionId = crypto.randomUUID();
        const session = {
            sessionId,
            userId,
            startTime: new Date(),
            lastActivity: new Date(),
            turns: [],
            topicStack: [],
            emotionalState: {
                current: 'neutral',
                history: [],
                intensity: 0.5
            },
            goalProgress: {
                identified: false,
                goals: [],
                completedGoals: [],
                progressScore: 0
            },
            personalizations: {
                learnedPatterns: [],
                preferredStrategies: [],
                adaptationScore: 0
            },
            contextSummary: {
                mainTopics: [],
                keyEntities: [],
                conversationFlow: []
            }
        };
        
        this.activeSessions.set(sessionId, session);
        this.stats.totalSessions++;
        this.stats.activeSessions++;
        
        // 初期入力がある場合は処理
        if (initialInput) {
            return this.processMultiTurn(sessionId, initialInput);
        }
        
        console.log(`📝 新規セッション開始: ${sessionId} (ユーザー: ${userId})`);
        return { sessionId, session };
    }
    
    /**
     * マルチターン対話処理
     */
    async processMultiTurn(sessionId, userInput, additionalContext = {}) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`セッションが見つかりません: ${sessionId}`);
        }
        
        // ターン情報作成
        const turnId = session.turns.length + 1;
        const timestamp = new Date();
        
        // 文脈情報構築
        const dialogueContext = this.buildDialogueContext(session, userInput, additionalContext);
        
        // 意図認識（既存システム活用）
        const intentResult = await this.analyzeIntentWithContext(userInput, dialogueContext);
        
        // 感情状態更新
        const emotionalUpdate = this.updateEmotionalState(session, userInput, intentResult);
        
        // 対話戦略決定（既存DialogueFlowController活用）
        let strategyResult;
        if (this.dialogueFlowController && this.dialogueFlowController.determineDialogueStrategy) {
            strategyResult = this.dialogueFlowController.determineDialogueStrategy(
                intentResult.intent,
                dialogueContext,
                session.personalizations
            );
        } else {
            // フォールバック戦略
            strategyResult = {
                strategy: this.determineBasicStrategy(intentResult.intent),
                confidence: 0.7,
                adaptations: []
            };
        }
        
        // 応答生成指示
        const responseGeneration = await this.generateResponseInstruction(
            session,
            userInput,
            intentResult,
            strategyResult,
            dialogueContext
        );
        
        // ターンデータ作成
        const turn = {
            turnId,
            timestamp,
            userInput,
            detectedIntent: intentResult.intent,
            intentConfidence: intentResult.confidence,
            emotionalState: emotionalUpdate,
            strategyUsed: strategyResult.strategy,
            contextSnapshot: dialogueContext,
            responseInstruction: responseGeneration,
            effectiveness: null // 後で評価
        };
        
        // セッション更新
        session.turns.push(turn);
        session.lastActivity = timestamp;
        session.topicStack = this.updateTopicStack(session.topicStack, intentResult.topics);
        session.emotionalState = emotionalUpdate;
        session.goalProgress = this.updateGoalProgress(session.goalProgress, intentResult, turn);
        
        // 長期記憶への格納
        this.storeInLongTermMemory(session, turn);
        
        // 個人特化学習（PersonalDialogueAnalyzer統合）
        await this.enhancePersonalLearning(session, turn);
        
        // セッション制限チェック
        this.enforceSessionLimits(session);
        
        // 統計更新
        this.updateStats(session);
        
        // データ永続化
        this.persistSessionData(session);
        
        console.log(`💬 マルチターン処理完了: Turn ${turnId} (Session: ${sessionId.substr(0, 8)})`);
        
        return {
            sessionId,
            turnId,
            processedInput: userInput,
            detectedIntent: intentResult,
            emotionalState: emotionalUpdate,
            strategyUsed: strategyResult,
            responseInstruction: responseGeneration,
            contextSummary: this.generateContextSummary(session),
            sessionStats: {
                totalTurns: session.turns.length,
                sessionDuration: timestamp - session.startTime,
                mainTopics: session.topicStack.slice(-5)
            }
        };
    }
    
    /**
     * 対話文脈構築
     */
    buildDialogueContext(session, currentInput, additionalContext) {
        const recentTurns = session.turns.slice(-this.config.contextRetentionTurns);
        
        return {
            sessionId: session.sessionId,
            userId: session.userId,
            currentTurn: session.turns.length + 1,
            recentHistory: recentTurns.map(turn => ({
                input: turn.userInput,
                intent: turn.detectedIntent,
                timestamp: turn.timestamp
            })),
            topicStack: session.topicStack,
            emotionalJourney: session.emotionalState.history.slice(-10),
            goalContext: session.goalProgress,
            personalContext: session.personalizations,
            longTermContext: this.retrieveRelevantMemories(currentInput, session.userId),
            additionalContext
        };
    }
    
    /**
     * 文脈を考慮した意図認識
     */
    async analyzeIntentWithContext(userInput, dialogueContext) {
        // 基本意図認識（既存システム）
        let baseIntent;
        if (this.contextTracker && this.contextTracker.analyzeIntent) {
            baseIntent = await this.contextTracker.analyzeIntent(userInput);
        } else {
            // フォールバック意図認識
            baseIntent = {
                intent: this.classifyBasicIntent(userInput),
                confidence: 0.7,
                entities: []
            };
        }
        
        // 文脈強化
        const contextualIntent = this.enhanceIntentWithContext(baseIntent, dialogueContext);
        
        // トピック抽出
        const topics = this.extractTopicsFromInput(userInput, dialogueContext);
        
        return {
            intent: contextualIntent.intent,
            confidence: contextualIntent.confidence,
            topics,
            contextualFactors: contextualIntent.factors,
            originalIntent: baseIntent
        };
    }
    
    /**
     * 感情状態更新
     */
    updateEmotionalState(session, userInput, intentResult) {
        // 感情分析（シンプル実装）
        const emotionalCues = this.detectEmotionalCues(userInput);
        const intentEmotionMapping = this.mapIntentToEmotion(intentResult.intent);
        
        const previousEmotion = session.emotionalState.current;
        const newEmotion = this.calculateEmotionalTransition(
            previousEmotion,
            emotionalCues,
            intentEmotionMapping
        );
        
        const emotionalState = {
            current: newEmotion.emotion,
            intensity: newEmotion.intensity,
            confidence: newEmotion.confidence,
            transition: {
                from: previousEmotion,
                to: newEmotion.emotion,
                reason: newEmotion.reason
            },
            history: [...session.emotionalState.history, {
                emotion: newEmotion.emotion,
                intensity: newEmotion.intensity,
                timestamp: new Date(),
                trigger: userInput.substr(0, 50)
            }].slice(-20) // 最新20件保持
        };
        
        return emotionalState;
    }
    
    /**
     * 応答生成指示作成
     */
    async generateResponseInstruction(session, userInput, intentResult, strategyResult, dialogueContext) {
        return {
            responseType: this.determineResponseType(intentResult, strategyResult),
            toneAndStyle: this.determineResponseTone(session.emotionalState, session.personalizations),
            contentGuidance: this.generateContentGuidance(intentResult, dialogueContext),
            personalizationHints: this.generatePersonalizationHints(session),
            strategyParameters: strategyResult.parameters,
            contextualReferences: this.generateContextualReferences(dialogueContext),
            goalAlignment: this.alignWithGoals(session.goalProgress, intentResult)
        };
    }
    
    /**
     * 長期記憶への格納
     */
    storeInLongTermMemory(session, turn) {
        const memoryKey = `${session.userId}_${Date.now()}`;
        const importance = this.calculateMemoryImportance(turn);
        
        if (importance > 0.5) { // 重要度閾値
            const memory = {
                key: memoryKey,
                userId: session.userId,
                sessionId: session.sessionId,
                content: turn.userInput,
                intent: turn.detectedIntent,
                context: turn.contextSnapshot.recentHistory.slice(-3),
                importance,
                timestamp: turn.timestamp,
                tags: this.generateMemoryTags(turn),
                emotionalContext: turn.emotionalState.current
            };
            
            this.longTermMemory.set(memoryKey, memory);
            this.stats.memoryEntries++;
            
            // 定期的にメモリをファイルに保存
            if (this.stats.memoryEntries % 10 === 0) {
                this.persistMemoryData();
            }
        }
    }
    
    /**
     * 関連記憶の取得
     */
    retrieveRelevantMemories(query, userId, maxResults = 5) {
        const userMemories = Array.from(this.longTermMemory.values())
            .filter(memory => memory.userId === userId)
            .sort((a, b) => b.importance - a.importance);
        
        // シンプルなキーワードマッチング（将来的にはベクトル検索等に拡張）
        const relevantMemories = userMemories
            .filter(memory => this.calculateRelevance(query, memory) > 0.3)
            .slice(0, maxResults);
        
        return relevantMemories.map(memory => ({
            content: memory.content,
            context: memory.context,
            importance: memory.importance,
            timestamp: memory.timestamp,
            relevance: this.calculateRelevance(query, memory)
        }));
    }
    
    /**
     * 個人特化学習強化
     */
    async enhancePersonalLearning(session, turn) {
        if (this.personalAnalyzer) {
            // PersonalDialogueAnalyzerとの統合
            const personalInsights = await this.personalAnalyzer.analyzePersonalPattern(
                session.userId,
                turn.userInput,
                turn.detectedIntent,
                session.contextSummary
            );
            
            // 学習結果をセッションに反映
            session.personalizations.learnedPatterns.push(...personalInsights.newPatterns);
            session.personalizations.adaptationScore = personalInsights.adaptationScore;
            
            // 戦略最適化
            if (personalInsights.recommendedStrategies) {
                session.personalizations.preferredStrategies = personalInsights.recommendedStrategies;
            }
        }
    }
    
    /**
     * セッション終了・クリーンアップ
     */
    endSession(sessionId, reason = 'user_request') {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;
        
        // セッション最終統計
        const finalStats = {
            sessionId,
            userId: session.userId,
            duration: new Date() - session.startTime,
            totalTurns: session.turns.length,
            endReason: reason,
            finalEmotionalState: session.emotionalState.current,
            achievedGoals: session.goalProgress.completedGoals.length,
            personalizationScore: session.personalizations.adaptationScore
        };
        
        // 履歴に移動
        this.sessionHistory.push({
            ...session,
            endTime: new Date(),
            endReason: reason,
            finalStats
        });
        
        // アクティブセッションから削除
        this.activeSessions.delete(sessionId);
        this.stats.activeSessions--;
        
        // データ永続化
        this.persistSessionData();
        
        console.log(`🏁 セッション終了: ${sessionId.substr(0, 8)} (理由: ${reason})`);
        return finalStats;
    }
    
    /**
     * データの永続化
     */
    persistSessionData(specificSession = null) {
        try {
            const dataToSave = {
                activeSessions: Array.from(this.activeSessions.entries()),
                sessionHistory: this.sessionHistory.slice(-100), // 最新100セッション
                stats: this.stats,
                lastUpdate: new Date()
            };
            
            fs.writeFileSync(this.dataPath, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.error('セッションデータ保存エラー:', error);
        }
    }
    
    persistMemoryData() {
        try {
            const memoryData = {
                memories: Array.from(this.longTermMemory.entries()),
                stats: {
                    totalEntries: this.longTermMemory.size,
                    lastUpdate: new Date()
                }
            };
            
            fs.writeFileSync(this.memoryPath, JSON.stringify(memoryData, null, 2));
        } catch (error) {
            console.error('記憶データ保存エラー:', error);
        }
    }
    
    /**
     * データの読み込み
     */
    loadSessionData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                this.activeSessions = new Map(data.activeSessions || []);
                this.sessionHistory = data.sessionHistory || [];
                this.stats = { ...this.stats, ...data.stats };
                console.log('📂 セッションデータ読み込み完了');
            }
        } catch (error) {
            console.error('セッションデータ読み込みエラー:', error);
        }
    }
    
    loadMemoryData() {
        try {
            if (fs.existsSync(this.memoryPath)) {
                const data = JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
                this.longTermMemory = new Map(data.memories || []);
                console.log('🧠 記憶データ読み込み完了');
            }
        } catch (error) {
            console.error('記憶データ読み込みエラー:', error);
        }
    }
    
    /**
     * ユーティリティメソッド群
     */
    
    // 感情手がかり検出
    detectEmotionalCues(text) {
        const emotionalKeywords = {
            positive: ['嬉しい', '楽しい', '満足', '良い', 'ありがとう', '素晴らしい'],
            negative: ['悲しい', '困る', '問題', '悪い', 'だめ', '心配'],
            neutral: ['なるほど', 'そうですね', '理解', '確認']
        };
        
        let positiveScore = 0;
        let negativeScore = 0;
        
        for (const word of emotionalKeywords.positive) {
            if (text.includes(word)) positiveScore++;
        }
        for (const word of emotionalKeywords.negative) {
            if (text.includes(word)) negativeScore++;
        }
        
        return {
            positive: positiveScore,
            negative: negativeScore,
            intensity: Math.max(positiveScore, negativeScore) / 10
        };
    }
    
    // 記憶重要度計算
    calculateMemoryImportance(turn) {
        let importance = 0.3; // 基本重要度
        
        // 意図の重要度
        if (turn.detectedIntent && turn.intentConfidence > 0.8) importance += 0.2;
        
        // 感情の強度
        if (turn.emotionalState.intensity > 0.7) importance += 0.2;
        
        // 文脈の豊富さ
        if (turn.contextSnapshot.recentHistory.length > 3) importance += 0.1;
        
        // ユーザー入力の長さ（詳細な内容）
        if (turn.userInput.length > 50) importance += 0.1;
        
        return Math.min(importance, 1.0);
    }
    
    // 関連性計算
    calculateRelevance(query, memory) {
        const queryWords = query.split(/\s+/);
        const memoryWords = memory.content.split(/\s+/);
        
        let matchCount = 0;
        for (const qWord of queryWords) {
            if (memoryWords.some(mWord => mWord.includes(qWord) || qWord.includes(mWord))) {
                matchCount++;
            }
        }
        
        return matchCount / Math.max(queryWords.length, 1);
    }
    
    // システム統計取得
    getSystemStats() {
        return {
            ...this.stats,
            activeSessionsDetail: Array.from(this.activeSessions.values()).map(session => ({
                sessionId: session.sessionId,
                userId: session.userId,
                turns: session.turns.length,
                duration: new Date() - session.startTime,
                lastActivity: session.lastActivity
            })),
            memoryStats: {
                totalEntries: this.longTermMemory.size,
                entriesPerUser: this.calculateMemoryPerUser()
            }
        };
    }
    
    calculateMemoryPerUser() {
        const userMemoryCounts = {};
        for (const memory of this.longTermMemory.values()) {
            userMemoryCounts[memory.userId] = (userMemoryCounts[memory.userId] || 0) + 1;
        }
        return userMemoryCounts;
    }
    
    // 基本戦略決定（フォールバック）
    determineBasicStrategy(intent) {
        const strategyMap = {
            'greeting': 'friendly_response',
            'question': 'informative_response',
            'gratitude': 'acknowledgment',
            'testing': 'collaborative_testing',
            'general_inquiry': 'helpful_response'
        };
        
        return strategyMap[intent] || 'general_assistance';
    }
    
    // 基本意図分類（フォールバック）
    classifyBasicIntent(userInput) {
        const lowerInput = userInput.toLowerCase();
        
        if (lowerInput.includes('こんにちは') || lowerInput.includes('hello')) {
            return 'greeting';
        } else if (lowerInput.includes('?') || lowerInput.includes('？') || lowerInput.includes('何') || lowerInput.includes('どう')) {
            return 'question';
        } else if (lowerInput.includes('ありがとう') || lowerInput.includes('thank')) {
            return 'gratitude';
        } else if (lowerInput.includes('テスト') || lowerInput.includes('test')) {
            return 'testing';
        } else {
            return 'general_inquiry';
        }
    }
    
    // 意図強化メソッド
    enhanceIntentWithContext(baseIntent, dialogueContext) {
        // 文脈を考慮した意図強化
        let enhancedConfidence = baseIntent.confidence || 0.5;
        
        // 過去の意図との一貫性チェック
        if (dialogueContext.recentHistory.length > 0) {
            const recentIntents = dialogueContext.recentHistory.map(h => h.intent);
            const consistentIntents = recentIntents.filter(intent => intent === baseIntent.intent);
            if (consistentIntents.length > 1) {
                enhancedConfidence = Math.min(enhancedConfidence * 1.2, 1.0);
            }
        }
        
        return {
            intent: baseIntent.intent || 'general_inquiry',
            confidence: enhancedConfidence,
            factors: ['context_consistency', 'history_analysis']
        };
    }
    
    // トピック抽出
    extractTopicsFromInput(userInput, dialogueContext) {
        // シンプルなキーワードベーストピック抽出
        const keywords = userInput.split(/\s+/).filter(word => word.length > 3);
        const topics = keywords.slice(0, 3); // 最大3トピック
        return topics;
    }
    
    // 意図と感情マッピング
    mapIntentToEmotion(intent) {
        const intentEmotionMap = {
            'question': 'curious',
            'complaint': 'negative',
            'praise': 'positive',
            'request': 'neutral',
            'greeting': 'positive'
        };
        
        return intentEmotionMap[intent] || 'neutral';
    }
    
    // 感情遷移計算
    calculateEmotionalTransition(previousEmotion, emotionalCues, intentEmotion) {
        let newEmotion = 'neutral';
        let intensity = 0.5;
        let confidence = 0.6;
        
        // 感情手がかりベース判定
        if (emotionalCues.positive > emotionalCues.negative) {
            newEmotion = 'positive';
            intensity = 0.5 + (emotionalCues.positive * 0.1);
        } else if (emotionalCues.negative > emotionalCues.positive) {
            newEmotion = 'negative';
            intensity = 0.5 + (emotionalCues.negative * 0.1);
        } else {
            newEmotion = intentEmotion;
        }
        
        // 前の感情からの継続性
        if (previousEmotion === newEmotion) {
            confidence = Math.min(confidence * 1.3, 1.0);
        }
        
        return {
            emotion: newEmotion,
            intensity: Math.min(intensity, 1.0),
            confidence,
            reason: 'cue_analysis'
        };
    }
    
    // レスポンスタイプ決定
    determineResponseType(intentResult, strategyResult) {
        const intent = intentResult.intent;
        
        const responseTypeMap = {
            'question': 'informative',
            'request': 'supportive',
            'complaint': 'supportive',
            'analysis': 'analytical',
            'greeting': 'conversational'
        };
        
        return responseTypeMap[intent] || 'conversational';
    }
    
    // レスポンストーン決定
    determineResponseTone(emotionalState, personalizations) {
        const emotion = emotionalState.current;
        
        const toneMap = {
            'positive': 'enthusiastic',
            'negative': 'empathetic',
            'neutral': 'professional'
        };
        
        return {
            tone: toneMap[emotion] || 'professional',
            formality: 'medium',
            personalizedHints: personalizations.learnedPatterns.slice(0, 3)
        };
    }
    
    // コンテンツガイダンス生成
    generateContentGuidance(intentResult, dialogueContext) {
        const intent = intentResult.intent;
        const confidence = intentResult.confidence;
        
        let guidance = "";
        
        if (confidence > 0.8) {
            guidance = `高信頼度意図（${intent}）に基づく詳細応答を生成`;
        } else if (confidence > 0.6) {
            guidance = `中信頼度意図（${intent}）に基づく標準応答を生成`;
        } else {
            guidance = `低信頼度のため確認的応答を生成`;
        }
        
        // 文脈情報の統合
        if (dialogueContext.recentHistory.length > 2) {
            guidance += "、過去の文脈を参照";
        }
        
        return guidance;
    }
    
    // 個人化ヒント生成
    generatePersonalizationHints(session) {
        const patterns = session.personalizations.learnedPatterns;
        const strategies = session.personalizations.preferredStrategies;
        
        return {
            communicationStyle: patterns.slice(0, 2),
            preferredApproaches: strategies.slice(0, 2),
            adaptationLevel: session.personalizations.adaptationScore
        };
    }
    
    // 文脈参照生成
    generateContextualReferences(dialogueContext) {
        const recentHistory = dialogueContext.recentHistory.slice(-3);
        const topicStack = dialogueContext.topicStack.slice(-3);
        
        return {
            recentTopics: topicStack,
            recentInteractions: recentHistory.map(h => ({
                input: h.input.substr(0, 30),
                intent: h.intent
            })),
            longTermContext: dialogueContext.longTermContext.slice(0, 2)
        };
    }
    
    // ゴールアライメント
    alignWithGoals(goalProgress, intentResult) {
        if (!goalProgress.identified) {
            return {
                alignment: 'goal_discovery',
                suggestion: 'ユーザーの目標を特定する対話を促進'
            };
        }
        
        const activeGoals = goalProgress.goals.filter(goal => !goal.completed);
        if (activeGoals.length > 0) {
            return {
                alignment: 'goal_progress',
                suggestion: `進行中のゴール「${activeGoals[0].name}」に向けた支援`
            };
        }
        
        return {
            alignment: 'goal_maintenance',
            suggestion: '新しい目標設定の支援'
        };
    }
    
    // メモリタグ生成
    generateMemoryTags(turn) {
        const tags = [];
        
        // 意図ベースタグ
        if (turn.detectedIntent) {
            tags.push(`intent:${turn.detectedIntent}`);
        }
        
        // 感情ベースタグ
        if (turn.emotionalState.current !== 'neutral') {
            tags.push(`emotion:${turn.emotionalState.current}`);
        }
        
        // 入力長ベースタグ
        if (turn.userInput.length > 100) {
            tags.push('detailed_input');
        }
        
        // 時間ベースタグ
        const hour = turn.timestamp.getHours();
        if (hour < 12) {
            tags.push('morning');
        } else if (hour < 18) {
            tags.push('afternoon');
        } else {
            tags.push('evening');
        }
        
        return tags;
    }
    
    // その他のヘルパーメソッド
    updateTopicStack(currentStack, newTopics) {
        return [...currentStack, ...newTopics].slice(-10); // 最新10トピック
    }
    
    updateGoalProgress(currentProgress, intentResult, turn) {
        // 簡単なゴール進捗管理実装
        return currentProgress; // TODO: より詳細な実装
    }
    
    generateContextSummary(session) {
        const recentTurns = session.turns.slice(-5);
        return {
            mainTopics: session.topicStack.slice(-3),
            recentIntents: recentTurns.map(t => t.detectedIntent),
            emotionalTrend: session.emotionalState.current,
            sessionProgress: session.turns.length
        };
    }
    
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.activeSessions) {
            if (now - session.lastActivity.getTime() > this.config.maxSessionDuration) {
                this.endSession(sessionId, 'timeout');
            }
        }
    }
    
    optimizeMemory() {
        // 古い低重要度記憶の削除
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30日前
        for (const [key, memory] of this.longTermMemory) {
            if (memory.timestamp < cutoffDate && memory.importance < 0.6) {
                this.longTermMemory.delete(key);
            }
        }
    }
    
    updateStats(session) {
        this.stats.totalTurns++;
        this.stats.averageTurns = this.stats.totalTurns / this.stats.totalSessions;
        this.stats.longestSession = Math.max(this.stats.longestSession, session.turns.length);
    }
    
    enforceSessionLimits(session) {
        if (session.turns.length > this.config.maxTurnsPerSession) {
            this.endSession(session.sessionId, 'turn_limit');
        }
    }
}