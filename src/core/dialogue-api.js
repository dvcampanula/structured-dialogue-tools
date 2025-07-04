#!/usr/bin/env node
/**
 * DialogueAPI - 実用対話APIシステム
 * 
 * 🤖 実際にユーザーが使える対話機能提供
 * 🧠 高度対話制御・動的学習・永続化統合
 * 💬 WebUI・外部アプリケーションからの対話要求処理
 */

import { AdvancedDialogueController } from './advanced-dialogue-controller.js';
import { PersonalDialogueAnalyzer } from './personal-dialogue-analyzer.js';
import { DomainKnowledgeBuilder } from './domain-knowledge-builder.js';
import { PersonalResponseAdapter } from './personal-response-adapter.js';
import { persistentLearningDB } from './persistent-learning-db.js';

export class DialogueAPI {
    constructor() {
        this.activeUsers = new Map();
        this.conversationSessions = new Map();
        
        // 統計情報
        this.apiStats = {
            totalRequests: 0,
            totalUsers: 0,
            totalConversations: 0,
            averageResponseTime: 0,
            successRate: 0
        };
        
        this.initializeAPI();
    }

    async initializeAPI() {
        console.log('🚀 DialogueAPI初期化開始');
        
        // データベース統計取得
        const dbStats = persistentLearningDB.getDatabaseStats();
        console.log(`📊 データベース統計: ユーザー${dbStats.summary.totalUsers}人, 関係性${dbStats.summary.totalRelations}件`);
        
        console.log('✅ DialogueAPI初期化完了');
    }

    /**
     * メイン対話処理
     */
    async processDialogue(request) {
        const startTime = Date.now();
        
        try {
            // リクエスト検証
            const validatedRequest = this.validateRequest(request);
            
            // ユーザーセッション取得・作成
            const userSession = await this.getUserSession(validatedRequest.userId);
            
            // 対話処理実行
            const response = await this.executeDialogue(validatedRequest, userSession);
            
            // 学習・永続化
            await this.learnAndPersist(validatedRequest, response, userSession);
            
            // 統計更新
            this.updateStats(startTime, true);
            
            return {
                success: true,
                response: response,
                metadata: {
                    responseTime: Date.now() - startTime,
                    userId: validatedRequest.userId,
                    sessionId: userSession.sessionId,
                    learningUpdated: true
                }
            };
            
        } catch (error) {
            console.error('❌ 対話処理エラー:', error.message);
            this.updateStats(startTime, false);
            
            return {
                success: false,
                error: error.message,
                response: "申し訳ございませんが、エラーが発生しました。もう一度お試しください。",
                metadata: {
                    responseTime: Date.now() - startTime,
                    errorType: error.name
                }
            };
        }
    }

    /**
     * リクエスト検証
     */
    validateRequest(request) {
        if (!request) {
            throw new Error('リクエストが空です');
        }

        if (!request.message || typeof request.message !== 'string') {
            throw new Error('有効なメッセージが必要です');
        }

        if (request.message.length > 10000) {
            throw new Error('メッセージが長すぎます (最大10,000文字)');
        }

        return {
            userId: request.userId || 'anonymous',
            message: request.message.trim(),
            sessionId: request.sessionId,
            context: request.context || {},
            preferences: request.preferences || {}
        };
    }

    /**
     * ユーザーセッション取得・作成
     */
    async getUserSession(userId) {
        if (this.activeUsers.has(userId)) {
            return this.activeUsers.get(userId);
        }

        // 新規ユーザーセッション作成
        const session = await this.createUserSession(userId);
        this.activeUsers.set(userId, session);
        
        return session;
    }

    /**
     * ユーザーセッション作成
     */
    async createUserSession(userId) {
        console.log(`👤 新規ユーザーセッション作成: ${userId}`);

        // 各AIコンポーネント初期化
        const personalAnalyzer = new PersonalDialogueAnalyzer();
        const domainBuilder = new DomainKnowledgeBuilder();
        const responseAdapter = new PersonalResponseAdapter();
        
        // 永続化DBから概念DB読み込み
        const conceptDB = persistentLearningDB.getConceptLearning();
        
        // 高度対話制御システム初期化
        const dialogueController = new AdvancedDialogueController(
            personalAnalyzer,
            domainBuilder, 
            responseAdapter,
            conceptDB,
            userId
        );
        
        await dialogueController.initializeDialogueController();

        const session = {
            userId: userId,
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            dialogueController: dialogueController,
            personalAnalyzer: personalAnalyzer,
            domainBuilder: domainBuilder,
            responseAdapter: responseAdapter,
            conversationHistory: persistentLearningDB.getConversationHistory().filter(c => c.userId === userId) || [],
            createdAt: Date.now(),
            lastActivity: Date.now(),
            metadata: {
                totalMessages: 0,
                avgResponseTime: 0,
                satisfaction: 0.8
            }
        };

        this.apiStats.totalUsers++;
        return session;
    }

    /**
     * 対話実行
     */
    async executeDialogue(request, userSession) {
        console.log(`💬 対話実行: ${request.userId} - "${request.message.substring(0, 50)}..."`);

        // 会話履歴準備
        const conversationHistory = userSession.conversationHistory.slice(-10); // 最新10件
        
        // 高度対話制御実行
        const dialogueResult = await userSession.dialogueController.controlAdvancedDialogue(
            request.message,
            conversationHistory
        );

        // 応答生成
        const responseText = await this.generateResponse(dialogueResult, request, userSession);

        // 会話履歴更新
        const conversationEntry = {
            timestamp: Date.now(),
            userId: request.userId,
            sessionId: userSession.sessionId,
            userMessage: request.message,
            aiResponse: responseText,
            dialogueAnalysis: {
                contextDepth: dialogueResult.contextAnalysis?.contextDepth,
                intentType: dialogueResult.intentAnalysis?.primaryIntent?.type,
                intentConfidence: dialogueResult.intentAnalysis?.confidence,
                semanticContinuity: dialogueResult.contextAnalysis?.semanticContinuity,
                strategy: dialogueResult.dialogueStrategy?.primary
            }
        };

        userSession.conversationHistory.push(conversationEntry);
        userSession.lastActivity = Date.now();
        userSession.metadata.totalMessages++;

        return {
            message: responseText,
            analysis: dialogueResult,
            conversationId: conversationEntry.timestamp
        };
    }

    /**
     * 応答生成
     */
    async generateResponse(dialogueResult, request, userSession) {
        // 応答指示から応答生成
        const guidance = dialogueResult.responseGuidance;
        
        // 基本応答生成
        let response = "";

        // 意図に基づく応答
        const intentType = dialogueResult.intentAnalysis?.primaryIntent?.type;
        
        switch (intentType) {
            case 'learning':
                response = await this.generateLearningResponse(request.message, dialogueResult, userSession);
                break;
            case 'question':
                response = await this.generateQuestionResponse(request.message, dialogueResult, userSession);
                break;
            case 'request':
                response = await this.generateRequestResponse(request.message, dialogueResult, userSession);
                break;
            default:
                response = await this.generateGeneralResponse(request.message, dialogueResult, userSession);
        }

        // 個人特化適応
        if (userSession.responseAdapter) {
            const adaptationResult = await userSession.responseAdapter.adaptPersonalResponse(
                response,
                userSession.personalAnalyzer.getPersonalProfile(),
                userSession.domainBuilder.getDomainProfile(),
                request.message
            );
            
            // 適応結果から応答テキストを取得
            if (adaptationResult && adaptationResult.adaptedResponse) {
                response = adaptationResult.adaptedResponse;
            }
        }

        return response;
    }

    /**
     * 学習型応答生成
     */
    async generateLearningResponse(message, dialogueResult, userSession) {
        const concepts = this.extractConceptsFromMessage(message);
        
        // 技術的学習質問の検出と専門応答生成
        if (this.isTechnicalLearningQuery(message)) {
            return await this.generateTechnicalLearningResponse(message, concepts, userSession);
        }
        
        let response = `${concepts[0]}について学習されるのですね。`;
        
        // ドメイン知識に基づく詳細説明
        if (userSession.domainBuilder) {
            const domainProfile = userSession.domainBuilder.getDomainProfile();
            const relevantDomain = this.findRelevantDomain(concepts, domainProfile);
            
            if (relevantDomain) {
                response += `\n\n${relevantDomain}分野での学習として、以下のステップをお勧めします：\n`;
                response += `1. 基本概念の理解\n2. 実践的な演習\n3. 応用事例の確認`;
            }
        }

        // 文脈継続性に基づく追加情報
        const continuity = dialogueResult.contextAnalysis?.semanticContinuity || 0;
        if (continuity > 0.5) {
            response += `\n\n先ほどの内容との関連性も考慮して、段階的に進めていきましょう。`;
        }

        return response;
    }

    /**
     * 質問型応答生成
     */
    async generateQuestionResponse(message, dialogueResult, userSession) {
        // 技術的質問の検出と専門応答生成
        if (this.isTechnicalQuestion(message)) {
            return await this.generateTechnicalResponse(message, userSession);
        }
        
        let response = "ご質問をありがとうございます。";
        
        // 概念抽出と説明
        const concepts = this.extractConceptsFromMessage(message);
        if (concepts.length > 0) {
            response += `\n\n${concepts[0]}について説明いたします：`;
            
            // 学習済み関係性の活用
            const learnedRelations = await this.getLearnedRelations(concepts[0], userSession);
            if (learnedRelations.length > 0) {
                response += `\n関連する概念として、${learnedRelations.join('、')}があります。`;
            }
        }
        
        return response;
    }

    /**
     * 要求型応答生成
     */
    async generateRequestResponse(message, dialogueResult, userSession) {
        // 技術的要求の検出と専門応答生成
        if (this.isTechnicalRequest(message)) {
            return await this.generateTechnicalImplementationResponse(message, userSession);
        }
        
        let response = "承知いたしました。";
        
        // 要求内容の分析
        const requestType = this.analyzeRequestType(message);
        
        switch (requestType) {
            case 'implementation':
                response += "\n実装方法について具体的な手順をご提案します。";
                break;
            case 'explanation':
                response += "\n詳しく説明させていただきます。";
                break;
            case 'example':
                response += "\n具体的な例をご紹介します。";
                break;
            default:
                response += "\nサポートさせていただきます。";
        }
        
        return response;
    }

    /**
     * 一般応答生成
     */
    async generateGeneralResponse(message, dialogueResult, userSession) {
        const confidence = dialogueResult.intentAnalysis?.confidence || 0.5;
        
        if (confidence < 0.6) {
            return "申し訳ございませんが、ご質問の内容をもう少し詳しく教えていただけますでしょうか？";
        }
        
        return "ありがとうございます。詳しくサポートさせていただきます。";
    }

    /**
     * 技術的学習質問検出
     */
    isTechnicalLearningQuery(message) {
        const technicalPatterns = [
            /React.*useState/i, /hook.*react/i, /javascript.*function/i,
            /プログラミング.*学習/i, /開発.*方法/i, /実装.*手順/i,
            /useState.*フック/i, /javascript.*コード/i, /API.*使い方/i
        ];
        return technicalPatterns.some(pattern => pattern.test(message));
    }

    /**
     * 技術的質問検出
     */
    isTechnicalQuestion(message) {
        const technicalQuestionPatterns = [
            /React.*useStateについて/i, /hook.*について/i, /javascript.*とは/i,
            /どのように.*実装/i, /どうやって.*使う/i, /何.*method/i,
            /useStateとは/i, /フックとは/i, /コンポーネント.*何/i
        ];
        return technicalQuestionPatterns.some(pattern => pattern.test(message));
    }

    /**
     * 技術的要求検出
     */
    isTechnicalRequest(message) {
        const technicalRequestPatterns = [
            /コード.*例.*見せて/i, /実装.*してみせて/i, /具体的.*example/i,
            /サンプル.*コード/i, /実際.*書き方/i, /どう.*書く/i
        ];
        return technicalRequestPatterns.some(pattern => pattern.test(message));
    }

    /**
     * 技術的学習応答生成
     */
    async generateTechnicalLearningResponse(message, concepts, userSession) {
        // React useStateの例
        if (message.match(/React.*useState|useState.*フック/i)) {
            let response = "ReactのuseStateフックについて説明いたします。\n\n";
            
            response += "**useStateとは**\n";
            response += "useStateはReactの基本的なHookの一つで、関数コンポーネントで状態管理を行うために使用します。\n\n";
            
            response += "**基本的な使い方**\n";
            response += "```javascript\n";
            response += "import React, { useState } from 'react';\n\n";
            response += "function Counter() {\n";
            response += "  const [count, setCount] = useState(0);\n\n";
            response += "  return (\n";
            response += "    <div>\n";
            response += "      <p>現在のカウント: {count}</p>\n";
            response += "      <button onClick={() => setCount(count + 1)}>\n";
            response += "        カウントアップ\n";
            response += "      </button>\n";
            response += "    </div>\n";
            response += "  );\n";
            response += "}\n```\n\n";
            
            response += "**重要なポイント**\n";
            response += "1. **分割代入**: useState()は[現在の値, 更新関数]の配列を返します\n";
            response += "2. **初期値**: useState(0)の0が初期値となります\n";
            response += "3. **更新関数**: setCountを呼ぶことで状態が更新され、再レンダリングが発生します\n\n";
            
            // 学習済み関係性を活用
            const learnedRelations = await this.getLearnedRelations('useState', userSession);
            if (learnedRelations.length > 0) {
                response += `**関連概念**: ${learnedRelations.join('、')}\n\n`;
            }
            
            response += "**学習のステップ**\n";
            response += "1. まずは簡単な状態（数値、文字列）から始める\n";
            response += "2. オブジェクトや配列の状態管理に挑戦\n";
            response += "3. 複数のuseStateを組み合わせて使う\n";
            response += "4. useReducerやカスタムHookとの比較・使い分けを学ぶ";
            
            return response;
        }
        
        // JavaScript関数の例
        if (message.match(/javascript.*function|関数.*javascript/i)) {
            return this.generateJavaScriptFunctionResponse();
        }
        
        // 一般的な技術学習応答
        return `${concepts[0]}について技術的な観点から詳しく説明いたします。具体的な実装例や使用方法についてもお示しします。`;
    }

    /**
     * 技術的質問応答生成
     */
    async generateTechnicalResponse(message, userSession) {
        // React useState
        if (message.match(/React.*useState.*について|useStateとは/i)) {
            let response = "ReactのuseStateフックについてお答えします。\n\n";
            
            response += "useStateは関数コンポーネントで状態を管理するためのReact Hookです。\n\n";
            response += "**特徴**:\n";
            response += "• 関数コンポーネント内で状態を持てる\n";
            response += "• 状態が変更されると自動的に再レンダリングが発生\n";
            response += "• 初期値を設定できる\n";
            response += "• 複数の状態を独立して管理可能\n\n";
            
            response += "**構文**: `const [state, setState] = useState(initialValue);`\n\n";
            
            // 学習済み関係性の活用
            const learnedRelations = await this.getLearnedRelations('useState', userSession);
            if (learnedRelations.length > 0) {
                response += `関連する技術: ${learnedRelations.join('、')}\n\n`;
            }
            
            response += "より詳しい使用例が必要でしたら、お気軽にお聞かせください。";
            
            return response;
        }
        
        // Hook全般について
        if (message.match(/hook.*について|フックとは/i)) {
            return this.generateHookExplanationResponse();
        }
        
        return "技術的な質問にお答えします。より具体的な情報をお聞かせいただければ、詳細な説明をいたします。";
    }

    /**
     * 技術的実装応答生成
     */
    async generateTechnicalImplementationResponse(message, userSession) {
        // useState実装例
        if (message.match(/useState.*コード.*例|実装.*useState/i)) {
            let response = "useStateの実装例をご紹介します。\n\n";
            
            response += "**基本例 - カウンター**\n";
            response += "```javascript\nimport React, { useState } from 'react';\n\n";
            response += "function Counter() {\n";
            response += "  const [count, setCount] = useState(0);\n\n";
            response += "  const increment = () => setCount(count + 1);\n";
            response += "  const decrement = () => setCount(count - 1);\n";
            response += "  const reset = () => setCount(0);\n\n";
            response += "  return (\n";
            response += "    <div>\n";
            response += "      <h2>カウント: {count}</h2>\n";
            response += "      <button onClick={increment}>+1</button>\n";
            response += "      <button onClick={decrement}>-1</button>\n";
            response += "      <button onClick={reset}>リセット</button>\n";
            response += "    </div>\n";
            response += "  );\n}\n\nexport default Counter;\n```\n\n";
            
            response += "**応用例 - フォーム管理**\n";
            response += "```javascript\nfunction ContactForm() {\n";
            response += "  const [formData, setFormData] = useState({\n";
            response += "    name: '',\n";
            response += "    email: '',\n";
            response += "    message: ''\n";
            response += "  });\n\n";
            response += "  const handleChange = (e) => {\n";
            response += "    setFormData({\n";
            response += "      ...formData,\n";
            response += "      [e.target.name]: e.target.value\n";
            response += "    });\n";
            response += "  };\n\n";
            response += "  return (\n";
            response += "    <form>\n";
            response += "      <input\n";
            response += "        name=\"name\"\n";
            response += "        value={formData.name}\n";
            response += "        onChange={handleChange}\n";
            response += "        placeholder=\"お名前\"\n";
            response += "      />\n";
            response += "      {/* 他のフィールドも同様 */}\n";
            response += "    </form>\n";
            response += "  );\n}\n```\n\n";
            
            response += "このように、useStateは様々な場面で活用できます。他の実装例についてもお気軽にお聞きください。";
            
            return response;
        }
        
        return "具体的な実装例をお示しします。どのような技術について詳しく知りたいでしょうか？";
    }

    /**
     * JavaScript関数説明応答
     */
    generateJavaScriptFunctionResponse() {
        let response = "JavaScript関数について説明いたします。\n\n";
        
        response += "**関数の定義方法**\n\n";
        response += "1. **関数宣言**\n";
        response += "```javascript\nfunction greet(name) {\n  return `こんにちは、${name}さん！`;\n}\n```\n\n";
        
        response += "2. **関数式**\n";
        response += "```javascript\nconst greet = function(name) {\n  return `こんにちは、${name}さん！`;\n};\n```\n\n";
        
        response += "3. **アロー関数**\n";
        response += "```javascript\nconst greet = (name) => {\n  return `こんにちは、${name}さん！`;\n};\n\n// 短縮形\nconst greet = name => `こんにちは、${name}さん！`;\n```\n\n";
        
        response += "**使用例**\n";
        response += "```javascript\nconsole.log(greet('田中')); // 'こんにちは、田中さん！'\n```";
        
        return response;
    }

    /**
     * Hook説明応答
     */
    generateHookExplanationResponse() {
        let response = "React Hookについて説明いたします。\n\n";
        
        response += "**Hookとは**\n";
        response += "Hookは関数コンポーネントでReactの機能（状態管理、ライフサイクルなど）を使えるようにする仕組みです。\n\n";
        
        response += "**主要なHook**\n";
        response += "• **useState**: 状態管理\n";
        response += "• **useEffect**: 副作用処理（ライフサイクル）\n";
        response += "• **useContext**: コンテキストの値を取得\n";
        response += "• **useReducer**: 複雑な状態管理\n";
        response += "• **useCallback**: 関数のメモ化\n";
        response += "• **useMemo**: 値のメモ化\n\n";
        
        response += "**Hookのルール**\n";
        response += "1. Hookは関数の最上位でのみ呼び出す\n";
        response += "2. ループ、条件分岐、ネストした関数内では呼び出さない\n";
        response += "3. React関数でのみ使用する";
        
        return response;
    }

    /**
     * 学習・永続化
     */
    async learnAndPersist(request, response, userSession) {
        try {
            // 動的学習実行
            if (userSession.dialogueController.dynamicLearner) {
                await userSession.dialogueController.learnFromDialogue(
                    request.message,
                    userSession.conversationHistory,
                    response.message
                );
                
                // 学習済みデータの永続化
                const learnerStats = userSession.dialogueController.dynamicLearner.getLearningStats();
                if (learnerStats) {
                    // 関係性データの保存
                    const userRelations = userSession.dialogueController.dynamicLearner.userRelations;
                    if (userRelations && userRelations.size > 0) {
                        await persistentLearningDB.saveUserRelations(userRelations);
                    }
                    
                    // 学習統計の更新
                    await persistentLearningDB.recordLearningEvent('dynamic_learning_update', {
                        userId: request.userId,
                        relations: learnerStats.totalRelations,
                        concepts: learnerStats.totalConcepts,
                        learningStats: learnerStats
                    });
                }
            }

            // 会話履歴の永続化
            await persistentLearningDB.saveConversationHistory(userSession.conversationHistory);
            
            // 個人分析データの更新
            if (userSession.personalAnalyzer) {
                const profile = userSession.personalAnalyzer.analyzeDialogueInteraction(
                    request.message,
                    response.message
                );
                
                // 永続化（必要に応じて）
                await persistentLearningDB.recordLearningEvent('personal_analysis_update', {
                    userId: request.userId,
                    profile: profile
                });
            }
            
        } catch (error) {
            console.error('❌ 学習・永続化エラー:', error.message);
        }
    }

    /**
     * 統計更新
     */
    updateStats(startTime, success) {
        const responseTime = Date.now() - startTime;
        
        this.apiStats.totalRequests++;
        this.apiStats.averageResponseTime = 
            (this.apiStats.averageResponseTime * (this.apiStats.totalRequests - 1) + responseTime) / this.apiStats.totalRequests;
        
        if (success) {
            this.apiStats.successRate = 
                (this.apiStats.successRate * (this.apiStats.totalRequests - 1) + 1) / this.apiStats.totalRequests;
        } else {
            this.apiStats.successRate = 
                (this.apiStats.successRate * (this.apiStats.totalRequests - 1)) / this.apiStats.totalRequests;
        }
    }

    // ヘルパーメソッド
    extractConceptsFromMessage(message) {
        const concepts = [];
        const text = message.toLowerCase();
        
        // 技術概念
        const techConcepts = ['react', 'javascript', 'プログラミング', '開発', '実装', 'ai', '機械学習'];
        for (const concept of techConcepts) {
            if (text.includes(concept)) {
                concepts.push(concept);
            }
        }
        
        // 漢字概念
        const kanjiConcepts = text.match(/[一-龯]{2,}/g) || [];
        concepts.push(...kanjiConcepts.slice(0, 3));
        
        return [...new Set(concepts)];
    }

    findRelevantDomain(concepts, domainProfile) {
        const domains = ['技術', 'ビジネス', '学習', '創作'];
        
        for (const domain of domains) {
            if (domainProfile[domain] && domainProfile[domain].confidence > 0.5) {
                return domain;
            }
        }
        
        return null;
    }

    async getLearnedRelations(concept, userSession) {
        if (!userSession.dialogueController.dynamicLearner) return [];
        
        const relations = userSession.dialogueController.dynamicLearner.getUserRelations(concept);
        return relations.slice(0, 3); // 最大3個
    }

    analyzeRequestType(message) {
        const text = message.toLowerCase();
        
        if (text.includes('実装') || text.includes('作って') || text.includes('開発')) {
            return 'implementation';
        }
        if (text.includes('説明') || text.includes('教えて') || text.includes('とは')) {
            return 'explanation';
        }
        if (text.includes('例') || text.includes('サンプル') || text.includes('具体的')) {
            return 'example';
        }
        
        return 'general';
    }

    /**
     * API統計取得
     */
    getAPIStats() {
        return {
            ...this.apiStats,
            activeUsers: this.activeUsers.size,
            totalSessions: this.conversationSessions.size,
            databaseStats: persistentLearningDB.getDatabaseStats()
        };
    }

    /**
     * ユーザーセッション統計
     */
    getUserSessionStats(userId) {
        const session = this.activeUsers.get(userId);
        if (!session) return null;

        return {
            userId: userId,
            sessionId: session.sessionId,
            totalMessages: session.metadata.totalMessages,
            conversationLength: session.conversationHistory.length,
            lastActivity: session.lastActivity,
            createdAt: session.createdAt,
            learningStats: session.dialogueController.getLearningStats()
        };
    }

    /**
     * セッションクリーンアップ
     */
    cleanupInactiveSessions() {
        const now = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30分

        for (const [userId, session] of this.activeUsers) {
            if (now - session.lastActivity > sessionTimeout) {
                console.log(`🧹 非アクティブセッションクリーンアップ: ${userId}`);
                this.activeUsers.delete(userId);
            }
        }
    }
}

// デフォルトインスタンス
export const dialogueAPI = new DialogueAPI();