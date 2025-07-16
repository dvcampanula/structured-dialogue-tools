/**
 * SentimentAnalyzer - 感情分析学習システム
 * 日本語テキストの感情パターンを統計的に学習・分析
 */

export class SentimentAnalyzer {
    constructor(dependencies = {}) {
        this.persistentLearningDB = dependencies.persistentLearningDB;
        this.hybridProcessor = dependencies.hybridProcessor;
        
        // 感情パターン辞書
        this.emotionPatterns = {
            positive: [
                '嬉しい', '楽しい', '良い', '素晴らしい', '最高', '感謝', 'ありがと',
                '好き', '愛', '幸せ', '満足', '成功', '達成', '喜び', '感動',
                '😊', '😄', '👍', '❤️', '✨', '🎉'
            ],
            negative: [
                '悲しい', '辛い', '困る', 'だめ', '最悪', '嫌い', '怒り', '憎',
                '失敗', '問題', 'エラー', '不安', '心配', '疲れ', '痛い',
                '😢', '😞', '😠', '💔', '😰', '😵'
            ],
            neutral: [
                'そう', 'です', 'ます', 'ある', 'いる', '思う', '考える', 'する',
                'なる', 'こと', 'もの', 'とき', 'ところ', '場合', '状況'
            ]
        };
        
        // 感情強度修飾語 (動的読み込みに変更)
        this.intensifiers = {};

        // 感情スコアの重み (動的読み込み)
        this.sentimentWeights = {};
        
        // 学習済み感情パターン
        this.learnedPatterns = new Map();
        this.contextualPatterns = new Map();
        
        this.loadIntensifiers(); // 非同期で読み込み
        this.loadSentimentWeights(); // 非同期で読み込み
        console.log('🎭 SentimentAnalyzer初期化完了');
    }

    /**
     * 感情スコアの重みをDBから読み込む
     */
    async loadSentimentWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('sentiment_score_weights');
            if (data && Object.keys(data).length > 0) {
                this.sentimentWeights = data;
            } else {
                await this._initializeDefaultSentimentWeights();
            }
        } catch (error) {
            console.warn('⚠️ 感情スコア重みの読み込みエラー:', error.message);
            await this._initializeDefaultSentimentWeights();
        }
    }

    /**
     * デフォルトの感情スコア重みを初期化して保存
     */
    async _initializeDefaultSentimentWeights() {
        const defaultWeights = {
            baseScore: 0.5,
            positiveRatio: 0.5,
            negativeRatio: 0.5,
            neutralConfidence: 0.6,
            defaultConfidence: 0.3
        };
        this.sentimentWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('sentiment_score_weights', defaultWeights);
            console.log('✅ デフォルト感情スコア重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト感情スコア重みの保存エラー:', error.message);
        }
    }

    /**
     * 感情強度修飾語をDBから読み込む
     */
    async loadIntensifiers() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('sentiment_intensifiers');
            if (data && Object.keys(data).length > 0) {
                this.intensifiers = data;
            } else {
                // データがない場合はデフォルト値を設定して保存
                await this._initializeDefaultIntensifiers();
            }
        } catch (error) {
            console.warn('⚠️ 感情強度修飾語の読み込みエラー:', error.message);
            // エラー時もデフォルト値で初期化
            await this._initializeDefaultIntensifiers();
        }
    }

    /**
     * デフォルトの感情強度修飾語を初期化して保存
     */
    async _initializeDefaultIntensifiers() {
        const defaultIntensifiers = {
            strong: ['とても', 'すごく', '非常に', '本当に', '超', 'めちゃくちゃ', '激しく'],
            moderate: ['少し', 'やや', 'ちょっと', 'まあまあ', 'それなりに'],
            weak: ['あまり', 'それほど', 'そんなに', 'たいして']
        };
        this.intensifiers = defaultIntensifiers;
        try {
            await this.persistentLearningDB.saveSystemData('sentiment_intensifiers', defaultIntensifiers);
            console.log('✅ デフォルト感情強度修飾語をDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト感情強度修飾語の保存エラー:', error.message);
        }
    }

    /**
     * 感情分析実行
     * @param {string} text - 分析対象テキスト
     * @param {string} userId - ユーザーID
     */
    async analyze(text, userId = 'default') {
        try {
            const analysis = {
                text,
                sentiment: this.calculateBaseSentiment(text),
                emotionStrength: this.calculateEmotionStrength(text),
                emotionWords: this.extractEmotionWords(text),
                contextualEmotion: await this.analyzeContextualEmotion(text),
                personalizedScore: await this.getPersonalizedScore(text, userId),
                timestamp: Date.now()
            };

            // 学習データとして記録
            await this.learnFromAnalysis(analysis, userId);
            
            return analysis;
            
        } catch (error) {
            console.error('❌ 感情分析エラー:', error.message);
            return this.getDefaultAnalysis(text);
        }
    }

    /**
     * 基本感情スコア計算
     */
    calculateBaseSentiment(text) {
        let positiveScore = 0;
        let negativeScore = 0;
        let neutralScore = 0;

        const words = text.split(/[\s\u3000\u3001\u3002]+/);
        
        for (const word of words) {
            // 感情語彙マッチング
            if (this.emotionPatterns.positive.some(pattern => word.includes(pattern))) {
                positiveScore += 1;
            }
            if (this.emotionPatterns.negative.some(pattern => word.includes(pattern))) {
                negativeScore += 1;
            }
            if (this.emotionPatterns.neutral.some(pattern => word.includes(pattern))) {
                neutralScore += this.sentimentWeights.neutralScore || 0.5;
            }
            
            // 絵文字分析
            if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(word)) {
                if (this.emotionPatterns.positive.includes(word)) {
                    positiveScore += 2;
                } else if (this.emotionPatterns.negative.includes(word)) {
                    negativeScore += 2;
                }
            }
        }

        const total = positiveScore + negativeScore + neutralScore;
        if (total === 0) {
            return { label: 'neutral', score: this.sentimentWeights.baseScore, confidence: this.sentimentWeights.defaultConfidence };
        }

        const positiveRatio = positiveScore / total;
        const negativeRatio = negativeScore / total;
        
        if (positiveRatio > negativeRatio && positiveRatio > 0.3) {
            return { 
                label: 'positive', 
                score: this.sentimentWeights.baseScore + (positiveRatio * this.sentimentWeights.positiveRatio), 
                confidence: Math.min(positiveRatio * 2, 1.0) 
            };
        } else if (negativeRatio > positiveRatio && negativeRatio > 0.3) {
            return { 
                label: 'negative', 
                score: this.sentimentWeights.baseScore - (negativeRatio * this.sentimentWeights.negativeRatio), 
                confidence: Math.min(negativeRatio * 2, 1.0) 
            };
        }
        
        return { label: 'neutral', score: this.sentimentWeights.baseScore, confidence: this.sentimentWeights.neutralConfidence };
    }

    /**
     * 感情強度計算
     */
    calculateEmotionStrength(text) {
        let strengthMultiplier = 1.0;
        
        // 強調表現の検出
        for (const [level, words] of Object.entries(this.intensifiers)) {
            for (const word of words) {
                if (text.includes(word)) {
                    switch (level) {
                        case 'strong': strengthMultiplier *= 1.5; break;
                        case 'moderate': strengthMultiplier *= 1.2; break;
                        case 'weak': strengthMultiplier *= 0.8; break;
                    }
                }
            }
        }
        
        // 感嘆符・疑問符による強度調整
        const exclamationCount = (text.match(/[！!]/g) || []).length;
        const questionCount = (text.match(/[？?]/g) || []).length;
        
        strengthMultiplier += exclamationCount * 0.2;
        strengthMultiplier += questionCount * 0.1;
        
        // カタカナ使用による感情表現強化検出
        const katakanaRatio = (text.match(/[\u30A0-\u30FF]/g) || []).length / text.length;
        if (katakanaRatio > 0.3) {
            strengthMultiplier *= 1.3;
        }
        
        return Math.min(strengthMultiplier, 3.0);
    }

    /**
     * 感情語抽出
     */
    extractEmotionWords(text) {
        const emotionWords = [];
        const words = text.split(/[\s\u3000\u3001\u3002]+/);
        
        for (const word of words) {
            for (const [emotion, patterns] of Object.entries(this.emotionPatterns)) {
                for (const pattern of patterns) {
                    if (word.includes(pattern)) {
                        emotionWords.push({
                            word: word,
                            emotion: emotion,
                            pattern: pattern,
                            position: text.indexOf(word)
                        });
                    }
                }
            }
        }
        
        return emotionWords;
    }

    /**
     * 文脈感情分析
     */
    async analyzeContextualEmotion(text) {
        try {
            // 形態素解析による文脈理解
            if (this.hybridProcessor) {
                const processed = await this.hybridProcessor.processText(text);
                const terms = processed.enhancedTerms || [];
                
                // 品詞組み合わせによる感情パターン検出
                let contextualScore = 0;
                for (let i = 0; i < terms.length - 1; i++) {
                    const current = terms[i];
                    const next = terms[i + 1];
                    
                    // 形容詞 + 名詞の組み合わせ強化
                    if (current.pos?.includes('形容詞') && next.pos?.includes('名詞')) {
                        if (this.isEmotionWord(current.term)) {
                            contextualScore += 0.3;
                        }
                    }
                    
                    // 動詞 + 副詞の組み合わせ
                    if (current.pos?.includes('動詞') && next.pos?.includes('副詞')) {
                        if (this.isEmotionWord(next.term)) {
                            contextualScore += 0.2;
                        }
                    }
                }
                
                return {
                    score: Math.min(contextualScore, 1.0),
                    patterns: terms.length,
                    method: 'morphological'
                };
            }
            
            return { score: 0, patterns: 0, method: 'none' };
            
        } catch (error) {
            console.warn('⚠️ 文脈感情分析エラー:', error.message);
            return { score: 0, patterns: 0, method: 'error' };
        }
    }

    /**
     * 個人化感情スコア取得
     */
    async getPersonalizedScore(text, userId) {
        const userPattern = this.learnedPatterns.get(userId);
        if (!userPattern) {
            return { score: 0.5, confidence: 0.1, method: 'default' };
        }

        // ユーザーの過去の感情パターンから予測
        const words = text.split(/[\s\u3000]+/);
        let personalScore = 0;
        let matchCount = 0;
        
        for (const word of words) {
            if (userPattern.wordEmotions.has(word)) {
                const emotionData = userPattern.wordEmotions.get(word);
                personalScore += emotionData.averageScore;
                matchCount++;
            }
        }
        
        if (matchCount === 0) {
            return { score: 0.5, confidence: 0.1, method: 'no_history' };
        }
        
        const finalScore = personalScore / matchCount;
        const confidence = Math.min(matchCount / 10, 0.9);
        
        return { 
            score: finalScore, 
            confidence, 
            method: 'personalized',
            matchedWords: matchCount 
        };
    }

    /**
     * 分析結果から学習
     */
    async learnFromAnalysis(analysis, userId) {
        try {
            // ログ学習の場合は個人データ保存をスキップ
            if (userId.startsWith('log_batch_') || userId === 'log_learning') {
                return;
            }
            
            // ユーザー固有パターン学習
            if (!this.learnedPatterns.has(userId)) {
                this.learnedPatterns.set(userId, {
                    wordEmotions: new Map(),
                    patternHistory: [],
                    emotionTrends: { positive: 0, negative: 0, neutral: 0 }
                });
            }
            
            const userPattern = this.learnedPatterns.get(userId);
            
            // 感情語の学習
            for (const emotionWord of analysis.emotionWords) {
                const word = emotionWord.word;
                const emotion = emotionWord.emotion;
                const score = analysis.sentiment.score;
                
                if (!userPattern.wordEmotions.has(word)) {
                    userPattern.wordEmotions.set(word, {
                        occurrences: 0,
                        totalScore: 0,
                        averageScore: 0.5,
                        emotions: { positive: 0, negative: 0, neutral: 0 }
                    });
                }
                
                const wordData = userPattern.wordEmotions.get(word);
                wordData.occurrences++;
                wordData.totalScore += score;
                wordData.averageScore = wordData.totalScore / wordData.occurrences;
                wordData.emotions[emotion]++;
            }
            
            // パターン履歴記録
            userPattern.patternHistory.push({
                timestamp: Date.now(),
                sentiment: analysis.sentiment,
                strength: analysis.emotionStrength,
                contextual: analysis.contextualEmotion.score
            });
            
            // 最新100件のみ保持
            if (userPattern.patternHistory.length > 100) {
                userPattern.patternHistory = userPattern.patternHistory.slice(-100);
            }
            
            // 感情傾向更新
            userPattern.emotionTrends[analysis.sentiment.label]++;
            
            // データベース保存（10回に1回のみ保存）
            if (this.persistentLearningDB && userPattern.patternHistory.length % 10 === 0) {
                await this.saveLearningData(userId);
            }
            
        } catch (error) {
            console.error('❌ 感情分析学習エラー:', error.message);
        }
    }

    /**
     * 学習データ保存
     */
    async saveLearningData(userId) {
        try {
            const userPattern = this.learnedPatterns.get(userId);
            if (!userPattern) return;
            
            const dataToSave = {
                wordEmotions: Array.from(userPattern.wordEmotions.entries()),
                patternHistory: userPattern.patternHistory.slice(-50), // 最新50件
                emotionTrends: userPattern.emotionTrends,
                lastUpdated: Date.now()
            };
            
            const filePath = `sentiment_analysis_${userId}`;
            await this.persistentLearningDB.saveUserProfile(filePath, dataToSave);
            
        } catch (error) {
            console.error('❌ 感情分析データ保存エラー:', error.message);
        }
    }

    /**
     * 学習データ読み込み
     */
    async loadLearningData(userId) {
        try {
            const filePath = `sentiment_analysis_${userId}`;
            const data = await this.persistentLearningDB.loadUserProfile(filePath);
            
            if (data) {
                const userPattern = {
                    wordEmotions: new Map(data.wordEmotions || []),
                    patternHistory: data.patternHistory || [],
                    emotionTrends: data.emotionTrends || { positive: 0, negative: 0, neutral: 0 }
                };
                
                this.learnedPatterns.set(userId, userPattern);
                console.log(`✅ 感情分析データ読み込み完了 (${userId})`);
            }
            
        } catch (error) {
            console.warn(`⚠️ 感情分析データ読み込みエラー (${userId}):`, error.message);
        }
    }

    /**
     * ユーザー感情統計取得
     */
    getUserEmotionStats(userId) {
        const userPattern = this.learnedPatterns.get(userId);
        if (!userPattern) {
            return { error: 'No data found for user' };
        }
        
        const total = Object.values(userPattern.emotionTrends).reduce((a, b) => a + b, 0);
        const stats = {
            totalAnalyses: total,
            emotionDistribution: {},
            wordEmotionCount: userPattern.wordEmotions.size,
            averageConfidence: 0,
            recentTrend: 'neutral'
        };
        
        // 感情分布計算
        for (const [emotion, count] of Object.entries(userPattern.emotionTrends)) {
            stats.emotionDistribution[emotion] = total > 0 ? (count / total) : 0;
        }
        
        // 最近の傾向
        if (userPattern.patternHistory.length > 0) {
            const recent = userPattern.patternHistory.slice(-10);
            const recentPositive = recent.filter(p => p.sentiment.label === 'positive').length;
            const recentNegative = recent.filter(p => p.sentiment.label === 'negative').length;
            
            if (recentPositive > recentNegative) {
                stats.recentTrend = 'positive';
            } else if (recentNegative > recentPositive) {
                stats.recentTrend = 'negative';
            }
            
            // 平均信頼度
            stats.averageConfidence = recent.reduce((sum, p) => sum + p.sentiment.confidence, 0) / recent.length;
        }
        
        return stats;
    }

    /**
     * 感情語判定
     */
    isEmotionWord(word) {
        for (const patterns of Object.values(this.emotionPatterns)) {
            if (patterns.some(pattern => word.includes(pattern))) {
                return true;
            }
        }
        return false;
    }

    /**
     * デフォルト分析結果
     */
    getDefaultAnalysis(text) {
        return {
            text,
            sentiment: { label: 'neutral', score: 0.5, confidence: 0.3 },
            emotionStrength: 1.0,
            emotionWords: [],
            contextualEmotion: { score: 0, patterns: 0, method: 'default' },
            personalizedScore: { score: 0.5, confidence: 0.1, method: 'default' },
            timestamp: Date.now()
        };
    }
}