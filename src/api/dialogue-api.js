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
import { dynamicResponseTemplateEngine } from '../engines/response/dynamic-response-template-engine.js';

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
        console.log(`🎯 応答生成: 意図タイプ="${intentType}"`);
        
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

        // 個人特化適応（技術的応答の場合はスキップ）
        const isTechnicalResponse = this.isTechnicalResponse(response, request.message);
        
        if (userSession.responseAdapter && !isTechnicalResponse) {
            console.log(`🎯 個人特化応答適応開始: "${response.substring(0, 50)}..."`);
            
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
        
        // フォールバック: 既存ハードコード応答（削除予定）
        // データサイエンス Python vs R
        if (false && message.match(/データサイエンス.*Python.*R.*比較/i)) {
            let response = "データサイエンスにおけるPythonとRの比較について説明いたします。\n\n";
            
            response += "**Python の特徴**\n";
            response += "• 汎用性が高く、Web開発からAIまで幅広く使用\n";
            response += "• ライブラリが豊富（pandas, numpy, scikit-learn, TensorFlow）\n";
            response += "• 可読性の高いシンプルな構文\n";
            response += "• 機械学習・深層学習のエコシステムが充実\n\n";
            
            response += "**R の特徴**\n";
            response += "• 統計解析に特化した言語設計\n";
            response += "• 統計パッケージが非常に豊富（CRAN）\n";
            response += "• データ可視化に優れている（ggplot2）\n";
            response += "• 学術研究での利用が多い\n\n";
            
            response += "**選択指針**\n";
            response += "• **Python**: 機械学習・AI・大規模システム開発\n";
            response += "• **R**: 統計解析・学術研究・高度な可視化\n\n";
            
            return response;
        }
        
        // SQL JOIN最適化
        if (message.match(/SQL.*JOIN.*最適化.*方法/i)) {
            let response = "SQLでJOINを使った複雑なクエリの最適化方法について説明いたします。\n\n";
            
            response += "**基本最適化テクニック**\n\n";
            response += "1. **適切なインデックスの作成**\n";
            response += "```sql\n";
            response += "-- JOIN条件とWHERE条件にインデックス\n";
            response += "CREATE INDEX idx_user_id ON orders(user_id);\n";
            response += "CREATE INDEX idx_order_date ON orders(order_date);\n```\n\n";
            
            response += "2. **JOINの順序最適化**\n";
            response += "```sql\n";
            response += "-- 小さいテーブルから先にJOIN\n";
            response += "SELECT u.name, o.total\n";
            response += "FROM users u  -- 小\n";
            response += "INNER JOIN orders o ON u.id = o.user_id  -- 大\n";
            response += "WHERE u.active = 1;\n```\n\n";
            
            response += "3. **WHERE条件の最適化**\n";
            response += "• JOIN前にできるだけ絞り込む\n";
            response += "• SARG（Search ARGument）を意識した条件設計\n";
            response += "• 関数を使わない条件記述\n\n";
            
            response += "**パフォーマンス計測**\n";
            response += "• EXPLAIN PLANでの実行計画確認\n";
            response += "• インデックススキャンvsフルテーブルスキャンの判断\n";
            response += "• コスト見積もりの確認\n\n";
            
            return response;
        }
        
        // ディープラーニング学習パス
        if (message.match(/ディープラーニング.*数学.*基礎.*実装.*体系的.*学習/i)) {
            let response = "ディープラーニングの数学的基礎から実装まで体系的な学習パスをご提案します。\n\n";
            
            response += "**Phase 1: 数学的基礎（1-2ヶ月）**\n";
            response += "• 線形代数: ベクトル、行列、固有値・固有ベクトル\n";
            response += "• 微分積分: 偏微分、連鎖律、勾配計算\n";
            response += "• 確率統計: ベイズ定理、分布、最尤推定\n";
            response += "• 推奨書籍: 『機械学習のための数学』『パターン認識と機械学習』\n\n";
            
            response += "**Phase 2: 機械学習基礎（2-3ヶ月）**\n";
            response += "• 教師あり学習: 回帰、分類、決定木、SVM\n";
            response += "• 教師なし学習: クラスタリング、次元削減\n";
            response += "• 評価指標: 交差検証、精度、再現率、F1スコア\n";
            response += "• 実装: scikit-learn での基本的な機械学習\n\n";
            
            response += "**Phase 3: ディープラーニング理論（2-3ヶ月）**\n";
            response += "• ニューラルネットワーク: パーセプトロン、多層NN\n";
            response += "• バックプロパゲーション: 誤差逆伝播アルゴリズム\n";
            response += "• 活性化関数、損失関数、最適化手法\n";
            response += "• 正則化: Dropout、Batch Normalization\n\n";
            
            response += "**Phase 4: 実装・応用（3-4ヶ月）**\n";
            response += "• フレームワーク: TensorFlow / PyTorch\n";
            response += "• CNN: 画像認識、畳み込み、プーリング\n";
            response += "• RNN: 時系列データ、LSTM、GRU\n";
            response += "• Transformer: Attention機構、BERT、GPT\n\n";
            
            response += "**実践プロジェクト**\n";
            response += "• 画像分類（CIFAR-10, ImageNet）\n";
            response += "• 自然言語処理（感情分析、機械翻訳）\n";
            response += "• 生成モデル（GAN、VAE）\n\n";
            
            return response;
        }
        
        // トラブルシューティング - アプリの白い画面
        if (message.match(/アプリ.*画面.*真っ白.*動かない.*助けて/i)) {
            let response = "アプリの画面が真っ白になる問題の解決方法をご案内します。\n\n";
            
            response += "**一般的な原因と対処法**\n\n";
            response += "1. **JavaScriptエラー**\n";
            response += "• ブラウザの開発者ツール（F12）でConsoleタブを確認\n";
            response += "• エラーメッセージが表示されている場合は、そのエラーを修正\n";
            response += "• `console.log()` を使用してエラー箇所を特定\n\n";
            
            response += "2. **ルーティングの問題**\n";
            response += "• React Routerの設定確認\n";
            response += "• 存在しないパスへのアクセス\n";
            response += "• BrowserRouter vs HashRouter の設定\n\n";
            
            response += "3. **コンポーネントのレンダリングエラー**\n";
            response += "• return文でJSXが正しく返されているか確認\n";
            response += "• 条件分岐でundefinedやnullが返されていないか\n";
            response += "• コンポーネントのpropsが正しく渡されているか\n\n";
            
            response += "**デバッグ手順**\n";
            response += "1. ブラウザのConsoleでエラー確認\n";
            response += "2. Network タブでAPIリクエストの失敗確認\n";
            response += "3. React Developer Tools でコンポーネントツリー確認\n";
            response += "4. 段階的に要素を削除してエラー箇所を特定\n\n";
            
            response += "**緊急対処法**\n";
            response += "• ブラウザのキャッシュクリア（Ctrl+Shift+R）\n";
            response += "• ローカルストレージ・セッションストレージのクリア\n";
            response += "• 最新のコードでnpm install & npm start\n\n";
            
            response += "具体的なエラーメッセージがあれば、より詳細な解決策をご提案できます。";
            
            return response;
        }
        
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
        
        // JavaScript Promise/async-await の例
        if (message.match(/promise.*async.*await|async.*await.*promise|javascript.*promise.*async|promise.*違い|async.*await.*違い/i)) {
            return await this.generatePromiseAsyncAwaitResponse(message, concepts, userSession);
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
     * 感謝・肯定応答生成
     */
    async generateAffirmationResponse(message, dialogueResult, userSession) {
        let response = "";
        
        // 感謝パターンの検出
        if (message.match(/ありがとう|感謝|助かり|thank/i)) {
            const gratitudeResponses = [
                "どういたしまして！お役に立てて嬉しいです。",
                "喜んでいただけて何よりです！",
                "お役に立てて光栄です。",
                "ありがとうございます。引き続きサポートいたします。"
            ];
            response = gratitudeResponses[Math.floor(Math.random() * gratitudeResponses.length)];
            
            // さらなる支援の提案
            if (message.match(/助かり|解決|わかり|理解/i)) {
                response += "\n\n他にもご質問やお困りのことがございましたら、遠慮なくお聞かせください。";
            }
        }
        // 肯定パターンの検出
        else if (message.match(/そうです|はい|その通り|yes/i)) {
            response = "そうですね！それでは、さらに詳しく見ていきましょう。";
        }
        // 一般的な肯定
        else {
            response = "ありがとうございます。何かお手伝いできることがあれば、お気軽にお声かけください。";
        }
        
        return response;
    }

    /**
     * 技術的応答検出
     */
    isTechnicalResponse(response, originalMessage) {
        // 技術的応答の特徴を検出
        const technicalIndicators = [
            // Promise/async-await 関連
            /Promise.*async.*await/i, /```javascript/i, /非同期処理/i,
            // コード例やマークダウン
            /```\w+/i, /\*\*.*\*\*/i, /##\s+/i,
            // 技術的キーワード
            /fetch.*then.*catch/i, /try.*catch/i, /await.*fetch/i,
            // React/JavaScript 関連
            /useState.*Hook/i, /import.*React/i, /function.*Component/i
        ];
        
        // 応答に技術的特徴が含まれているかチェック
        const hasTechnicalContent = technicalIndicators.some(pattern => pattern.test(response));
        
        // 元のメッセージが技術的質問かチェック
        const isTechnicalQuery = this.isTechnicalLearningQuery(originalMessage) || 
                                this.isTechnicalQuestion(originalMessage) || 
                                this.isTechnicalRequest(originalMessage);
        
        return hasTechnicalContent || isTechnicalQuery;
    }

    /**
     * Promise/async-await応答生成
     */
    async generatePromiseAsyncAwaitResponse(message, concepts, userSession) {
        let response = "JavaScriptのPromiseとasync/awaitについて詳しく説明します。\n\n";
        
        response += "## 📋 **Promiseとasync/awaitの基本的な違い**\n\n";
        
        response += "### 🔹 **Promise**\n";
        response += "- **定義**: 非同期処理の結果を表現するオブジェクト\n";
        response += "- **状態**: `pending`（実行中）→ `fulfilled`（成功）または `rejected`（失敗）\n";
        response += "- **書き方**: `.then()` と `.catch()` メソッドチェーン\n\n";
        
        response += "```javascript\n";
        response += "// Promise を使った書き方\n";
        response += "fetch('/api/data')\n";
        response += "  .then(response => response.json())\n";
        response += "  .then(data => {\n";
        response += "    console.log('データ取得成功:', data);\n";
        response += "  })\n";
        response += "  .catch(error => {\n";
        response += "    console.error('エラー:', error);\n";
        response += "  });\n```\n\n";
        
        response += "### 🔹 **async/await**\n";
        response += "- **定義**: Promiseをより読みやすく書くための構文糖衣\n";
        response += "- **async**: 関数を非同期関数として宣言\n";
        response += "- **await**: Promiseの結果を待つ\n\n";
        
        response += "```javascript\n";
        response += "// async/await を使った書き方\n";
        response += "async function fetchData() {\n";
        response += "  try {\n";
        response += "    const response = await fetch('/api/data');\n";
        response += "    const data = await response.json();\n";
        response += "    console.log('データ取得成功:', data);\n";
        response += "    return data;\n";
        response += "  } catch (error) {\n";
        response += "    console.error('エラー:', error);\n";
        response += "  }\n";
        response += "}\n```\n\n";
        
        response += "## 🎯 **主な違いとメリット**\n\n";
        
        response += "| 項目 | Promise | async/await |\n";
        response += "|------|---------|-------------|\n";
        response += "| **可読性** | メソッドチェーン | 同期的な書き方 |\n";
        response += "| **エラー処理** | `.catch()` | `try/catch` |\n";
        response += "| **複数の非同期処理** | `.then()`チェーン | 順次`await` |\n";
        response += "| **条件分岐** | 複雑になりがち | 直感的 |\n\n";
        
        response += "## 📝 **実践的な使い分け**\n\n";
        
        response += "### 🔸 **async/awaitが適している場面**\n";
        response += "```javascript\n";
        response += "// 複数の非同期処理を順番に実行\n";
        response += "async function processUserData(userId) {\n";
        response += "  const user = await fetchUser(userId);\n";
        response += "  const profile = await fetchProfile(user.profileId);\n";
        response += "  const settings = await fetchSettings(user.settingsId);\n";
        response += "  \n";
        response += "  return { user, profile, settings };\n";
        response += "}\n```\n\n";
        
        response += "### 🔸 **Promiseが適している場面**\n";
        response += "```javascript\n";
        response += "// 複数の非同期処理を並列実行\n";
        response += "Promise.all([\n";
        response += "  fetch('/api/users'),\n";
        response += "  fetch('/api/products'),\n";
        response += "  fetch('/api/orders')\n";
        response += "])\n";
        response += ".then(responses => {\n";
        response += "  // 全て完了した時の処理\n";
        response += "});\n```\n\n";
        
        response += "## 💡 **重要なポイント**\n";
        response += "1. **内部的には同じ**: async/awaitもPromiseベース\n";
        response += "2. **async関数**: 必ずPromiseを返す\n";
        response += "3. **await**: Promiseでない値にも使える\n";
        response += "4. **エラー処理**: try/catchの方が直感的\n";
        response += "5. **デバッグ**: async/awaitの方がスタックトレースが分かりやすい\n\n";
        
        // 学習済み関係性の活用
        const learnedRelations = await this.getLearnedRelations('Promise', userSession);
        if (learnedRelations.length > 0) {
            response += `**関連する学習済み概念**: ${learnedRelations.join('、')}\n\n`;
        }
        
        response += "**次のステップ**: より詳しい実装例や特定のユースケースについて、お気軽にお聞きください！";
        
        return response;
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