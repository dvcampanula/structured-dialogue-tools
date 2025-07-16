/**
 * DialoguePatternExtractor - 対話パターン抽出・学習システム
 * 会話の流れ、文体、応答パターンを統計的に学習・分析
 */

export class DialoguePatternExtractor {
    constructor(dependencies = {}) {
        this.persistentLearningDB = dependencies.persistentLearningDB;
        this.hybridProcessor = dependencies.hybridProcessor;
        
        // パターン (動的読み込みに変更)
        this.patternTypes = {};
        this.stylePatterns = {};
        this.intentPatterns = {};
        
        // 学習済みパターン
        this.learnedPatterns = new Map();
        this.conversationFlows = new Map();
        this.temporalPatterns = [];
        
        this.loadPatterns(); // 非同期で読み込み
        console.log('🔄 DialoguePatternExtractor初期化完了');
    }

    /**
     * パターンをDBから読み込む
     */
    async loadPatterns() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('dialogue_patterns');
            if (data && Object.keys(data).length > 0) {
                this.patternTypes = data.patternTypes || {};
                this.stylePatterns = data.stylePatterns || {};
                this.intentPatterns = data.intentPatterns || {};
            } else {
                // データがない場合はデフォルト値を設定して保存
                await this._initializeDefaultPatterns();
            }
        } catch (error) {
            console.warn('⚠️ 対話パターンの読み込みエラー:', error.message);
            // エラー時もデフォルト値で初期化
            await this._initializeDefaultPatterns();
        }
    }

    /**
     * デフォルトのパターンを初期化して保存
     */
    async _initializeDefaultPatterns() {
        const defaultPatterns = {
            patternTypes: {
                question_answer: {
                    patterns: ['？', '?', 'どう', 'なに', 'いつ', 'どこ', 'だれ', 'なぜ', 'どのように'],
                    weight: 1.2
                },
                request_response: {
                    patterns: ['してください', 'お願い', 'ください', 'してほしい', 'やって'],
                    weight: 1.1
                },
                greeting_farewell: {
                    patterns: ['こんにちは', 'おはよう', 'こんばんは', 'さようなら', 'また', 'お疲れ'],
                    weight: 0.8
                },
                explanation_clarification: {
                    patterns: ['つまり', 'すなわち', '要するに', 'という意味', '詳しく', '具体的に'],
                    weight: 1.0
                },
                agreement_disagreement: {
                    patterns: ['そうです', 'はい', 'いいえ', '違います', '賛成', '反対'],
                    weight: 0.9
                },
                emotion_expression: {
                    patterns: ['嬉しい', '悲しい', '困る', '驚く', '心配', '安心'],
                    weight: 1.3
                }
            },
            stylePatterns: {
                formal: ['です', 'ます', 'である', 'いたします', 'ございます'],
                casual: ['だよ', 'だね', 'じゃん', 'かも', 'っぽい'],
                polite: ['いただき', 'させて', 'お世話', 'お願い', 'ありがとう'],
                technical: ['システム', '実装', '機能', 'アルゴリズム', 'データ'],
                emotional: ['！', '♪', '✨', '💗', '😊', 'うれしい', 'かなしい']
            },
            intentPatterns: {
                information_seeking: ['何', 'どう', 'いつ', 'どこ', '教えて', '知りたい'],
                action_request: ['して', 'やって', 'お願い', 'ください', 'ほしい'],
                social_interaction: ['こんにちは', 'ありがとう', 'すみません', 'お疲れ'],
                problem_solving: ['困って', '問題', 'エラー', '解決', '助けて'],
                opinion_sharing: ['思う', '考える', '感じる', '意見', '個人的に']
            }
        };
        
        this.patternTypes = defaultPatterns.patternTypes;
        this.stylePatterns = defaultPatterns.stylePatterns;
        this.intentPatterns = defaultPatterns.intentPatterns;

        try {
            await this.persistentLearningDB.saveSystemData('dialogue_patterns', defaultPatterns);
            console.log('✅ デフォルト対話パターンをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト対話パターンの保存エラー:', error.message);
        }
    }

    /**
     * 対話パターン抽出実行
     * @param {string} userInput - ユーザー入力
     * @param {string} aiResponse - AI応答
     * @param {Array} context - 対話文脈
     * @param {string} userId - ユーザーID
     */
    async extract(userInput, aiResponse, context = [], userId = 'default') {
        try {
            const pattern = {
                userInput,
                aiResponse,
                inputPatterns: await this.analyzeInputPatterns(userInput),
                responsePatterns: await this.analyzeResponsePatterns(aiResponse),
                conversationFlow: await this.analyzeConversationFlow(userInput, aiResponse, context),
                styleAnalysis: await this.analyzeConversationStyle(userInput, aiResponse),
                temporalFeatures: this.extractTemporalFeatures(context),
                coherenceScore: await this.calculateCoherence(userInput, aiResponse, context),
                timestamp: Date.now()
            };

            // 学習処理
            await this.learnFromPattern(pattern, userId);
            
            return pattern;
            
        } catch (error) {
            console.error('❌ 対話パターン抽出エラー:', error.message);
            return this.getDefaultPattern(userInput, aiResponse);
        }
    }

    /**
     * 入力パターン分析
     */
    async analyzeInputPatterns(userInput) {
        const patterns = {
            type: 'unknown',
            confidence: 0,
            features: [],
            linguisticFeatures: await this.extractLinguisticFeatures(userInput),
            intentClassification: this.classifyIntent(userInput)
        };

        let maxScore = 0;
        let detectedType = 'unknown';

        // パターンタイプ検出
        for (const [type, typeData] of Object.entries(this.patternTypes)) {
            let score = 0;
            const matchedPatterns = [];

            for (const pattern of typeData.patterns) {
                if (userInput.includes(pattern)) {
                    score += typeData.weight; // 動的に読み込まれた重みを使用
                    matchedPatterns.push(pattern);
                }
            }

            if (score > maxScore) {
                maxScore = score;
                detectedType = type;
                patterns.features = matchedPatterns;
            }
        }

        patterns.type = detectedType;
        patterns.confidence = Math.min(maxScore / 3, 1.0);

        return patterns;
    }

    /**
     * 応答パターン分析
     */
    async analyzeResponsePatterns(aiResponse) {
        const patterns = {
            length: aiResponse.length,
            complexity: this.calculateTextComplexity(aiResponse),
            informativenessScore: await this.calculateInformativeness(aiResponse),
            linguisticFeatures: await this.extractLinguisticFeatures(aiResponse),
            responseStrategy: this.identifyResponseStrategy(aiResponse)
        };

        return patterns;
    }

    /**
     * 会話フロー分析
     */
    async analyzeConversationFlow(userInput, aiResponse, context) {
        const flow = {
            turnLength: context.length + 1,
            topicContinuity: await this.calculateTopicContinuity(userInput, context),
            coherenceFlow: await this.calculateFlowCoherence(context.concat([userInput, aiResponse])),
            transitionType: this.identifyTransitionType(userInput, context),
            conversationStage: this.identifyConversationStage(context)
        };

        return flow;
    }

    /**
     * 会話スタイル分析
     */
    async analyzeConversationStyle(userInput, aiResponse) {
        const userStyle = this.analyzeTextStyle(userInput);
        const aiStyle = this.analyzeTextStyle(aiResponse);
        
        return {
            userStyle,
            aiStyle,
            styleAlignment: this.calculateStyleAlignment(userStyle, aiStyle),
            formalityLevel: this.calculateFormalityLevel(userInput, aiResponse),
            emotionalTone: await this.analyzeEmotionalTone(userInput, aiResponse)
        };
    }

    /**
     * テキストスタイル分析
     */
    analyzeTextStyle(text) {
        const styleScores = {};
        
        for (const [styleName, patterns] of Object.entries(this.stylePatterns)) {
            let score = 0;
            const matchedPatterns = [];
            
            for (const pattern of patterns) {
                const matches = (text.match(new RegExp(pattern, 'g')) || []).length;
                if (matches > 0) {
                    score += matches;
                    matchedPatterns.push(pattern);
                }
            }
            
            styleScores[styleName] = {
                score: score / text.length * 100, // 正規化
                matches: matchedPatterns
            };
        }
        
        // 主要スタイル決定
        const dominantStyle = Object.entries(styleScores)
            .sort(([,a], [,b]) => b.score - a.score)[0];
        
        return {
            dominantStyle: dominantStyle[0],
            confidence: dominantStyle[1].score,
            allScores: styleScores
        };
    }

    /**
     * 言語的特徴抽出
     */
    async extractLinguisticFeatures(text) {
        const features = {
            length: text.length,
            sentenceCount: (text.match(/[。！？.!?]/g) || []).length + 1,
            wordCount: text.split(/[\s\u3000]+/).length,
            kanjiRatio: this.calculateKanjiRatio(text),
            hiraganaRatio: this.calculateHiraganaRatio(text),
            katakanaRatio: this.calculateKatakanaRatio(text),
            punctuationDensity: this.calculatePunctuationDensity(text)
        };

        if (this.hybridProcessor) {
            try {
                const processed = await this.hybridProcessor.processText(text);
                features.morphologicalFeatures = {
                    nounsCount: (processed.enhancedTerms || []).filter(t => t.pos?.includes('名詞')).length,
                    verbsCount: (processed.enhancedTerms || []).filter(t => t.pos?.includes('動詞')).length,
                    adjectivesCount: (processed.enhancedTerms || []).filter(t => t.pos?.includes('形容詞')).length,
                    totalTerms: (processed.enhancedTerms || []).length
                };
            } catch (error) {
                console.warn('⚠️ 形態素解析エラー:', error.message);
            }
        }

        return features;
    }

    /**
     * 意図分類
     */
    classifyIntent(text) {
        const intents = this.intentPatterns;
        let maxScore = 0;
        let classifiedIntent = 'general';

        for (const [intent, keywords] of Object.entries(intents)) {
            let score = 0;
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    score++;
                }
            }
            
            if (score > maxScore) {
                maxScore = score;
                classifiedIntent = intent;
            }
        }

        return {
            intent: classifiedIntent,
            confidence: Math.min(maxScore / 3, 1.0)
        };
    }

    /**
     * 時系列特徴抽出
     */
    extractTemporalFeatures(context) {
        if (context.length === 0) {
            return { stage: 'opening', turnsElapsed: 0, avgTurnLength: 0 };
        }

        const totalLength = context.reduce((sum, turn) => {
            const turnText = turn.content || turn.message || turn;
            return sum + turnText.length;
        }, 0);

        return {
            stage: context.length < 3 ? 'opening' : 
                   context.length < 10 ? 'development' : 'continuation',
            turnsElapsed: context.length,
            avgTurnLength: totalLength / context.length,
            conversationDuration: this.estimateConversationDuration(context)
        };
    }

    /**
     * 一貫性スコア計算
     */
    async calculateCoherence(userInput, aiResponse, context) {
        try {
            let coherenceScore = 0.5; // ベーススコア

            // トピック一貫性
            const topicCoherence = await this.calculateTopicContinuity(userInput, context);
            coherenceScore += topicCoherence * 0.3;

            // 応答適切性
            const responseRelevance = this.calculateResponseRelevance(userInput, aiResponse);
            coherenceScore += responseRelevance * 0.4;

            // 文脈適切性
            const contextualAppropriate = this.calculateContextualAppropriateness(aiResponse, context);
            coherenceScore += contextualAppropriate * 0.3;

            return Math.min(coherenceScore, 1.0);

        } catch (error) {
            console.warn('⚠️ 一貫性計算エラー:', error.message);
            return 0.5;
        }
    }

    /**
     * パターンから学習
     */
    async learnFromPattern(pattern, userId) {
        try {
            // ログ学習の場合は個人データ保存をスキップ
            if (userId.startsWith('log_batch_') || userId === 'log_learning') {
                return;
            }
            
            // ユーザー固有パターン学習
            if (!this.learnedPatterns.has(userId)) {
                this.learnedPatterns.set(userId, {
                    inputPatterns: new Map(),
                    responsePatterns: new Map(),
                    stylePreferences: {},
                    conversationHistory: [],
                    patternStatistics: {}
                });
            }

            const userPatterns = this.learnedPatterns.get(userId);

            // 入力パターン学習
            const inputType = pattern.inputPatterns.type;
            if (!userPatterns.inputPatterns.has(inputType)) {
                userPatterns.inputPatterns.set(inputType, {
                    count: 0,
                    avgConfidence: 0,
                    examples: []
                });
            }

            const inputData = userPatterns.inputPatterns.get(inputType);
            inputData.count++;
            inputData.avgConfidence = (inputData.avgConfidence * (inputData.count - 1) + pattern.inputPatterns.confidence) / inputData.count;
            inputData.examples.push({
                text: pattern.userInput,
                timestamp: Date.now()
            });

            // 最新10件のみ保持
            if (inputData.examples.length > 10) {
                inputData.examples = inputData.examples.slice(-10);
            }

            // スタイル嗜好学習
            const userStyle = pattern.styleAnalysis.userStyle.dominantStyle;
            userPatterns.stylePreferences[userStyle] = (userPatterns.stylePreferences[userStyle] || 0) + 1;

            // 会話履歴記録
            userPatterns.conversationHistory.push({
                timestamp: Date.now(),
                inputType: inputType,
                coherence: pattern.coherenceScore,
                style: userStyle
            });

            // 最新100件のみ保持
            if (userPatterns.conversationHistory.length > 100) {
                userPatterns.conversationHistory = userPatterns.conversationHistory.slice(-100);
            }

            // 時系列パターン記録
            this.temporalPatterns.push({
                timestamp: Date.now(),
                userId: userId,
                pattern: {
                    inputType: inputType,
                    coherence: pattern.coherenceScore,
                    conversationStage: pattern.temporalFeatures.stage
                }
            });

            // 最新1000件のみ保持
            if (this.temporalPatterns.length > 1000) {
                this.temporalPatterns = this.temporalPatterns.slice(-1000);
            }

            // データ保存（10回に1回のみ保存）
            if (this.persistentLearningDB && userPatterns.conversationHistory.length % 10 === 0) {
                await this.saveLearningData(userId);
            }

        } catch (error) {
            console.error('❌ 対話パターン学習エラー:', error.message);
        }
    }

    /**
     * 学習データ保存
     */
    async saveLearningData(userId) {
        try {
            const userPatterns = this.learnedPatterns.get(userId);
            if (!userPatterns) return;

            const dataToSave = {
                inputPatterns: Array.from(userPatterns.inputPatterns.entries()),
                responsePatterns: Array.from(userPatterns.responsePatterns.entries()),
                stylePreferences: userPatterns.stylePreferences,
                conversationHistory: userPatterns.conversationHistory.slice(-50),
                lastUpdated: Date.now()
            };

            const filePath = `dialogue_patterns_${userId}`;
            await this.persistentLearningDB.saveUserProfile(filePath, dataToSave);

        } catch (error) {
            console.error('❌ 対話パターンデータ保存エラー:', error.message);
        }
    }

    /**
     * 学習データ読み込み
     */
    async loadLearningData(userId) {
        try {
            const filePath = `dialogue_patterns_${userId}`;
            const data = await this.persistentLearningDB.loadUserProfile(filePath);

            if (data) {
                const userPatterns = {
                    inputPatterns: new Map(data.inputPatterns || []),
                    responsePatterns: new Map(data.responsePatterns || []),
                    stylePreferences: data.stylePreferences || {},
                    conversationHistory: data.conversationHistory || [],
                    patternStatistics: {}
                };

                this.learnedPatterns.set(userId, userPatterns);
                console.log(`✅ 対話パターンデータ読み込み完了 (${userId})`);
            }

        } catch (error) {
            console.warn(`⚠️ 対話パターンデータ読み込みエラー (${userId}):`, error.message);
        }
    }

    /**
     * ヘルパーメソッド群
     */
    calculateKanjiRatio(text) {
        const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
        return text.length > 0 ? kanjiCount / text.length : 0;
    }

    calculateHiraganaRatio(text) {
        const hiraganaCount = (text.match(/[\u3040-\u309f]/g) || []).length;
        return text.length > 0 ? hiraganaCount / text.length : 0;
    }

    calculateKatakanaRatio(text) {
        const katakanaCount = (text.match(/[\u30a0-\u30ff]/g) || []).length;
        return text.length > 0 ? katakanaCount / text.length : 0;
    }

    calculatePunctuationDensity(text) {
        const punctuationCount = (text.match(/[。、！？.,:;!?]/g) || []).length;
        return text.length > 0 ? punctuationCount / text.length : 0;
    }

    calculateTextComplexity(text) {
        const avgWordLength = text.split(/[\s\u3000]+/).reduce((sum, word) => sum + word.length, 0) / text.split(/[\s\u3000]+/).length;
        const sentenceCount = (text.match(/[。！？.!?]/g) || []).length + 1;
        const avgSentenceLength = text.length / sentenceCount;
        
        return (avgWordLength + avgSentenceLength / 10) / 2;
    }

    async calculateInformativeness(text) {
        // 情報量の簡易計算
        const uniqueWords = new Set(text.split(/[\s\u3000\u3001\u3002]+/));
        const wordVariety = uniqueWords.size / text.split(/[\s\u3000\u3001\u3002]+/).length;
        const lengthFactor = Math.min(text.length / 100, 1.0);
        
        return wordVariety * lengthFactor;
    }

    async calculateTopicContinuity(currentText, context) {
        if (context.length === 0) return 0.5;

        // 簡易実装: キーワード重複率
        const currentWords = new Set(currentText.split(/[\s\u3000\u3001\u3002]+/));
        const contextWords = new Set();
        
        for (const turn of context.slice(-3)) { // 最新3ターンのみ
            const turnText = turn.content || turn.message || turn;
            turnText.split(/[\s\u3000\u3001\u3002]+/).forEach(word => contextWords.add(word));
        }

        const intersection = new Set([...currentWords].filter(x => contextWords.has(x)));
        const union = new Set([...currentWords, ...contextWords]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    getDefaultPattern(userInput, aiResponse) {
        return {
            userInput,
            aiResponse,
            inputPatterns: { type: 'unknown', confidence: 0, features: [] },
            responsePatterns: { length: aiResponse.length, complexity: 1 },
            conversationFlow: { turnLength: 1, topicContinuity: 0.5 },
            styleAnalysis: { userStyle: { dominantStyle: 'neutral' } },
            temporalFeatures: { stage: 'opening', turnsElapsed: 0 },
            coherenceScore: 0.5,
            timestamp: Date.now()
        };
    }
}