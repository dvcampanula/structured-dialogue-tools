#!/usr/bin/env node
/**
 * DialogueAPI - 実用対話APIシステム
 * 
 * 🤖 実際にユーザーが使える対話機能提供
 * 🧠 高度対話制御・動的学習・永続化統合
 * 💬 WebUI・外部アプリケーションからの対話要求処理
 */

import { AdvancedDialogueController } from '../systems/controllers/advanced-dialogue-controller.js';
import { PersonalDialogueAnalyzer } from '../analyzers/personal-dialogue-analyzer.js';
import { DomainKnowledgeBuilder } from '../data/domain-knowledge-builder.js';
import { PersonalResponseAdapter } from '../systems/adapters/personal-response-adapter.js';
import { persistentLearningDB } from '../data/persistent-learning-db.js';
import { dynamicTechnicalPatterns } from '../engines/response/dynamic-technical-patterns.js';
import { enhancedResponseGenerationEngineV2 } from '../engines/response/enhanced-response-generation-engine-v2.js';

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
        const responseResult = await this.generateResponse(dialogueResult, request, userSession);
        
        // レスポンス形式を正規化（Enhanced v2.0対応）
        let responseText;
        if (typeof responseResult === 'string') {
            responseText = responseResult;
        } else if (responseResult && typeof responseResult === 'object') {
            responseText = responseResult.response || responseResult.message || 'No response';
        } else {
            responseText = 'Invalid response format';
        }
        
        const responseAnalysis = typeof responseResult === 'object' ? responseResult.analysis : null;
        const vocabularyDiversification = typeof responseResult === 'object' ? 
            (responseResult.analysis?.vocabularyDiversification || responseResult.vocabularyDiversification) : null;
        
        console.log('🔍 応答結果構造:', {
            responseResultType: typeof responseResult,
            hasAnalysis: !!responseAnalysis,
            vocabularyDiversification: vocabularyDiversification,
            analysisKeys: responseAnalysis ? Object.keys(responseAnalysis) : []
        });

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
            analysis: {
                ...dialogueResult,
                vocabularyDiversification: vocabularyDiversification,
                dictionaryStats: typeof responseResult === 'object' ? 
                    (responseResult.analysis?.dictionaryStats || responseResult.dictionaryStats) : null,
                // Enhanced v2.0からの追加統計情報
                ...(responseAnalysis || {})
            },
            conversationId: conversationEntry.timestamp
        };
    }

    /**
     * 応答生成
     */
    async generateResponse(dialogueResult, request, userSession) {
        console.log(`🔥 generateResponse開始: message="${request.message}"`);
        
        // 応答指示から応答生成
        const guidance = dialogueResult.responseGuidance;
        
        // 基本応答生成
        let response = "";

        // 意図に基づく応答
        const intentType = dialogueResult.intentAnalysis?.primaryIntent?.type;
        console.log(`🎯 応答生成: 意図タイプ="${intentType}"`);
        
        // 🚀 Enhanced ResponseGenerationEngine v2.0 統合判定
        const useEnhanced = this.shouldUseEnhancedV2(dialogueResult, request);
        console.log(`🔍 Enhanced v2.0判定結果: ${useEnhanced} (intentType: ${intentType})`);
        
        if (useEnhanced) {
            console.log(`🚀 Enhanced v2.0応答生成開始: "${request.message}"`);
            response = await this.generateEnhancedResponseV2(request.message, dialogueResult, userSession);
            console.log(`✅ Enhanced v2.0応答生成完了: response type=${typeof response}`);
        } else {
            // 従来の意図ベース応答生成
            switch (intentType) {
                case 'learning':
                case 'learning_pivot':  // 複合意図にも対応
                    console.log(`🎓 学習応答生成: "${request.message}"`);
                    response = await this.generateLearningResponse(request.message, dialogueResult, userSession);
                    break;
                case 'question':
                case 'question_pivot':  // 複合意図にも対応
                    console.log(`❓ 質問応答生成: "${request.message}"`);
                    response = await this.generateQuestionResponse(request.message, dialogueResult, userSession);
                    break;
                case 'request':
                case 'request_pivot':   // 複合意図にも対応
                    console.log(`🔄 要求応答生成: "${request.message}"`);
                    response = await this.generateRequestResponse(request.message, dialogueResult, userSession);
                    break;
                case 'affirmation':     // 感謝・肯定応答
                    console.log(`👏 肯定応答生成: "${request.message}"`);
                    response = await this.generateAffirmationResponse(request.message, dialogueResult, userSession);
                    break;
                default:
                    console.log(`🔧 一般応答生成: "${request.message}"`);
                    response = await this.generateGeneralResponse(request.message, dialogueResult, userSession);
            }
        }

        // 個人特化適応（技術的応答の場合はスキップ）
        const isTechnicalResponse = this.isTechnicalResponse(response, request.message);
        
        if (userSession.responseAdapter && !isTechnicalResponse) {
            const responseText = typeof response === 'string' ? response : 
                (response?.response || response?.message || 'Unknown response');
            console.log(`🎯 個人特化応答適応開始: "${responseText.substring(0, 50)}..."`);
            
            const adaptationResult = await userSession.responseAdapter.adaptPersonalResponse(
                responseText,
                userSession.personalAnalyzer.getPersonalProfile(),
                userSession.domainBuilder.getDomainProfile(),
                request.message
            );
            
            // 適応結果から応答テキストを取得
            if (adaptationResult && adaptationResult.adaptedResponse) {
                response = adaptationResult.adaptedResponse;
            }
            
            console.log(`✅ 個人特化応答適応完了`);
        } else if (isTechnicalResponse) {
            console.log(`🔧 技術的応答保護: PersonalResponseAdapter処理をスキップ`);
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
        console.log(`🔄 generateRequestResponse呼び出し: "${message}"`);
        
        // 動的技術パターン検出による技術要求の特定
        const isTechnical = this.isTechnicalLearningQuery(message);
        console.log(`🔍 技術学習質問検出結果: ${isTechnical}`);
        
        if (isTechnical) {
            console.log(`✅ 技術学習質問として検出 - 技術応答生成開始`);
            const technicalResponse = await this.generateTechnicalLearningResponse(message, this.extractConceptsFromMessage(message), userSession);
            console.log(`📋 技術応答生成完了: ${technicalResponse?.length || 0}文字`);
            console.log(`🔍 技術応答プレビュー: ${technicalResponse?.substring(0, 100) || 'null'}...`);
            return technicalResponse;
        }
        
        console.log(`➡️ 汎用request応答生成`);
        
        
        // 従来の技術的要求検出
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
     * 技術的学習質問検出 - 動的パターン学習対応
     */
    isTechnicalLearningQuery(message) {
        console.log(`🔍 技術学習質問検出開始: "${message}"`);
        
        // 動的パターン学習システムを使用
        const result = dynamicTechnicalPatterns.isTechnicalQuery(message);
        console.log(`📊 動的パターン結果: 技術的=${result.isTechnical}, カテゴリ=${result.category || 'なし'}, 信頼度=${result.confidence || 0}`);
        
        // 学習フィードバック記録
        if (result.isTechnical) {
            console.log(`🎯 動的パターン検出: [${result.category}] 信頼度: ${result.confidence.toFixed(2)}`);
            
            // 成功事例として学習
            dynamicTechnicalPatterns.learnNewPattern(message, result.category, true);
        }
        
        return result.isTechnical;
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
     * 技術的学習応答生成 - 動的テンプレート対応
     */
    async generateTechnicalLearningResponse(message, concepts, userSession) {
        // 動的技術パターン検出
        const technicalResult = dynamicTechnicalPatterns.isTechnicalQuery(message);
        const technicalCategory = technicalResult.isTechnical ? technicalResult.category : null;
        
        // 動的テンプレート検出
        const templateDetection = dynamicResponseTemplateEngine.detectTemplateType(message, technicalCategory);
        console.log(`🎨 テンプレート検出: タイプ=${templateDetection.type}, 信頼度=${templateDetection.confidence?.toFixed(2)}`);
        console.log(`🔍 検出結果詳細:`, {
            type: templateDetection.type,
            confidence: templateDetection.confidence,
            hasPattern: !!templateDetection.pattern,
            pattern: templateDetection.pattern?.pattern || 'なし',
            isDefault: templateDetection.isDefault
        });
        
        // 動的テンプレートから応答生成（優先度向上）
        if (templateDetection.confidence > 0.2 || templateDetection.pattern || templateDetection.type === 'comparison') {
            console.log(`🎨 動的テンプレート応答生成開始: タイプ=${templateDetection.type}`);
            
            const templateResponse = await dynamicResponseTemplateEngine.generateResponse(
                message, 
                templateDetection, 
                technicalCategory, 
                userSession
            );
            
            console.log(`🔍 動的テンプレート応答デバッグ:`, {
                response: templateResponse ? templateResponse.substring(0, 100) + '...' : 'null',
                length: templateResponse?.length || 0,
                hasPlaceholders: templateResponse?.includes('{') || false
            });
            
            // テンプレート応答の採用条件を緩和
            if (templateResponse && templateResponse.length > 30) {
                console.log(`✅ 動的テンプレート応答生成成功: ${templateResponse.length}文字`);
                console.log(`🚫 フォールバックハードコード応答をスキップ`);
                return templateResponse;
            }
        }
        
        // 動的テンプレート強制適用（比較・最適化など）
        if (message.includes('比較') || message.includes('最適化') || message.includes('学習')) {
            console.log(`🎯 動的テンプレート強制適用: キーワードベース`);
            const fallbackResponse = await dynamicResponseTemplateEngine.generateResponse(
                message, 
                templateDetection, 
                technicalCategory, 
                userSession
            );
            
            if (fallbackResponse && fallbackResponse.length > 20) {
                console.log(`✅ 動的テンプレート強制生成成功: ${fallbackResponse.length}文字`);
                return fallbackResponse;
            }
        }
    }
    
    async generateFallbackResponse(message, dialogueResult, userSession) {
        // Enhanced v2.0失敗時の従来システムフォールバック
        const intentType = dialogueResult.intentAnalysis?.primaryIntent?.type || 'general';
        
        switch (intentType) {
            case 'learning':
                return `「${message}」について学習をサポートします。どの部分から始めたいか、具体的にお聞かせください。`;
            case 'question':
                return `「${message}」についてお答えします。どのような点について詳しく知りたいでしょうか？`;
            default:
                return await this.generateGeneralResponse(message, dialogueResult, userSession);
        }
    }

    shouldUseEnhancedV2(dialogueResult, request) {
        // Enhanced v2.0を全会話で有効化
        console.log(`🚀 Enhanced v2.0使用: message="${request.message.substring(0, 30)}..."`);
        return true;
    }

    async generateEnhancedResponseV2(message, dialogueResult, userSession) {
        try {
            // Enhanced ResponseGenerationEngine v2.0を使用
            const enhancedEngine = await import('../engines/response/enhanced-response-generation-engine-v2.js');
            const engine = new enhancedEngine.EnhancedResponseGenerationEngineV2();
            
            return await engine.generateUnifiedResponse({
                message,
                analysis: dialogueResult,
                userSession
            });
        } catch (error) {
            console.warn(`⚠️ Enhanced v2.0エラー: ${error.message}`);
            return await this.generateGeneralResponse(message, dialogueResult, userSession);
        }
    }

    updateStats(startTime, success) {
        // 簡易統計更新（削除されたメソッドの代替）
        const responseTime = Date.now() - startTime;
        console.log(`📊 応答統計: ${success ? '成功' : '失敗'}, 時間: ${responseTime}ms`);
    }

    async learnAndPersist(request, response, userSession) {
        try {
            // 学習データをpersistentLearningDBに保存
            await persistentLearningDB.logLearningEvent({
                userId: userSession?.userId || 'default',
                input: request.message,
                response: response,
                timestamp: new Date().toISOString(),
                sessionId: userSession?.sessionId,
                analysis: request.analysis || {}
            });

            console.log('📚 学習データ永続化完了');
        } catch (error) {
            console.warn('⚠️ 学習データ永続化エラー:', error.message);
        }
    }
}

// デフォルトインスタンス
export const dialogueAPI = new DialogueAPI();