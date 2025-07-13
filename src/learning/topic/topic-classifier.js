/**
 * TopicClassifier - トピック分類学習システム
 * 日本語テキストの話題・ドメインを統計的に分類・学習
 */

export class TopicClassifier {
    constructor(dependencies = {}) {
        this.persistentLearningDB = dependencies.persistentLearningDB;
        this.hybridProcessor = dependencies.hybridProcessor;
        
        // 基本トピックカテゴリ
        this.topicCategories = {
            technology: {
                keywords: ['プログラミング', 'AI', '機械学習', 'コンピュータ', 'ソフトウェア', 'アプリ', 'システム', 'データ', 'ネットワーク', 'セキュリティ'],
                score: 0
            },
            daily_life: {
                keywords: ['日常', '生活', '家族', '友達', '食事', '料理', '買い物', '掃除', '仕事', '学校', '趣味'],
                score: 0
            },
            entertainment: {
                keywords: ['映画', '音楽', 'ゲーム', 'アニメ', 'マンガ', 'スポーツ', 'テレビ', '本', '読書', '旅行'],
                score: 0
            },
            work_business: {
                keywords: ['仕事', '会社', 'ビジネス', '会議', 'プロジェクト', '売上', '顧客', '営業', '経営', '戦略'],
                score: 0
            },
            health_wellness: {
                keywords: ['健康', '病気', '医療', '運動', 'スポーツ', 'ダイエット', '睡眠', 'ストレス', '病院', '薬'],
                score: 0
            },
            education: {
                keywords: ['勉強', '学習', '教育', '学校', '大学', '試験', '宿題', '授業', '先生', '生徒', '研究'],
                score: 0
            },
            relationships: {
                keywords: ['恋愛', '結婚', '友情', '家族', '人間関係', '付き合い', 'デート', '別れ', '喧嘩', '相談'],
                score: 0
            },
            news_current: {
                keywords: ['ニュース', '政治', '経済', '社会', '事件', '災害', '天気', '選挙', '国際', '環境'],
                score: 0
            }
        };
        
        // 学習済みトピックパターン
        this.learnedTopics = new Map();
        this.userTopicPreferences = new Map();
        this.temporalTopicTrends = [];
        
        console.log('📂 TopicClassifier初期化完了');
    }

    /**
     * トピック分類実行
     * @param {string} text - 分類対象テキスト
     * @param {string} userId - ユーザーID
     * @param {Array} context - 文脈情報
     */
    async classify(text, userId = 'default', context = []) {
        try {
            const classification = {
                text,
                primaryTopic: await this.calculatePrimaryTopic(text),
                topicScores: await this.calculateAllTopicScores(text),
                personalizedTopics: await this.getPersonalizedTopics(text, userId),
                contextualTopics: await this.analyzeContextualTopics(text, context),
                confidence: 0,
                keyTerms: await this.extractTopicKeyTerms(text),
                timestamp: Date.now()
            };

            // 信頼度計算
            classification.confidence = this.calculateConfidence(classification);
            
            // 学習データとして記録
            await this.learnFromClassification(classification, userId);
            
            return classification;
            
        } catch (error) {
            console.error('❌ トピック分類エラー:', error.message);
            return this.getDefaultClassification(text);
        }
    }

    /**
     * 主要トピック計算
     */
    async calculatePrimaryTopic(text) {
        const scores = await this.calculateAllTopicScores(text);
        
        let maxScore = 0;
        let primaryTopic = 'general';
        
        for (const [topic, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                primaryTopic = topic;
            }
        }
        
        return {
            topic: primaryTopic,
            score: maxScore,
            confidence: maxScore > 0.3 ? 'high' : maxScore > 0.15 ? 'medium' : 'low'
        };
    }

    /**
     * 全トピックスコア計算
     */
    async calculateAllTopicScores(text) {
        const scores = {};
        const words = this.tokenizeText(text);
        
        for (const [topicName, topicData] of Object.entries(this.topicCategories)) {
            let score = 0;
            let matchCount = 0;
            
            // キーワードマッチング
            for (const keyword of topicData.keywords) {
                for (const word of words) {
                    if (word.includes(keyword) || keyword.includes(word)) {
                        score += this.calculateKeywordWeight(keyword, word);
                        matchCount++;
                    }
                }
            }
            
            // 正規化
            if (matchCount > 0) {
                score = score / Math.sqrt(words.length); // 文書長で正規化
                score = Math.min(score, 1.0);
            }
            
            scores[topicName] = score;
        }
        
        // 形態素解析による詳細分析
        if (this.hybridProcessor) {
            const morphScores = await this.calculateMorphologicalTopicScores(text);
            for (const [topic, morphScore] of Object.entries(morphScores)) {
                scores[topic] = (scores[topic] || 0) + morphScore * 0.3;
            }
        }
        
        return scores;
    }

    /**
     * 形態素解析によるトピックスコア計算
     */
    async calculateMorphologicalTopicScores(text) {
        try {
            const processed = await this.hybridProcessor.processText(text);
            const terms = processed.enhancedTerms || [];
            const scores = {};
            
            for (const term of terms) {
                const { term: word, pos } = term;
                
                // 名詞の重み付け高
                const posWeight = pos?.includes('名詞') ? 1.5 : 
                                 pos?.includes('動詞') ? 1.2 : 
                                 pos?.includes('形容詞') ? 1.0 : 0.5;
                
                // 各トピックとの関連度計算
                for (const [topicName, topicData] of Object.entries(this.topicCategories)) {
                    for (const keyword of topicData.keywords) {
                        const similarity = this.calculateSemanticSimilarity(word, keyword);
                        if (similarity > 0.3) {
                            scores[topicName] = (scores[topicName] || 0) + similarity * posWeight * 0.1;
                        }
                    }
                }
            }
            
            return scores;
            
        } catch (error) {
            console.warn('⚠️ 形態素解析トピック分析エラー:', error.message);
            return {};
        }
    }

    /**
     * 個人化トピック取得
     */
    async getPersonalizedTopics(text, userId) {
        const userPrefs = this.userTopicPreferences.get(userId);
        if (!userPrefs) {
            return { topics: [], confidence: 0, method: 'default' };
        }

        const baseScores = await this.calculateAllTopicScores(text);
        const personalizedScores = {};
        
        // ユーザーの過去の興味に基づく重み付け
        for (const [topic, baseScore] of Object.entries(baseScores)) {
            const userInterest = userPrefs.topicInterests[topic] || 0;
            const personalizedScore = baseScore * (1 + userInterest * 0.5);
            personalizedScores[topic] = personalizedScore;
        }
        
        // 上位3つのトピックを返す
        const sortedTopics = Object.entries(personalizedScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([topic, score]) => ({ topic, score }));
        
        const avgConfidence = userPrefs.totalClassifications > 10 ? 0.8 : 
                             userPrefs.totalClassifications > 5 ? 0.6 : 0.4;
        
        return {
            topics: sortedTopics,
            confidence: avgConfidence,
            method: 'personalized',
            dataPoints: userPrefs.totalClassifications
        };
    }

    /**
     * 文脈トピック分析
     */
    async analyzeContextualTopics(text, context) {
        if (!context || context.length === 0) {
            return { topics: [], confidence: 0, method: 'no_context' };
        }

        const contextualScores = {};
        
        // 文脈内の他のメッセージも分析
        for (const contextItem of context.slice(-5)) { // 最新5件
            const contextText = contextItem.content || contextItem.message || contextItem;
            const contextScores = await this.calculateAllTopicScores(contextText);
            
            for (const [topic, score] of Object.entries(contextScores)) {
                contextualScores[topic] = (contextualScores[topic] || 0) + score * 0.3;
            }
        }
        
        // 現在のテキストのスコアと組み合わせ
        const currentScores = await this.calculateAllTopicScores(text);
        for (const [topic, score] of Object.entries(currentScores)) {
            contextualScores[topic] = (contextualScores[topic] || 0) + score;
        }
        
        const sortedContextTopics = Object.entries(contextualScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([topic, score]) => ({ topic, score }));
        
        return {
            topics: sortedContextTopics,
            confidence: context.length > 2 ? 0.7 : 0.5,
            method: 'contextual',
            contextSize: context.length
        };
    }

    /**
     * トピックキーワード抽出
     */
    async extractTopicKeyTerms(text) {
        try {
            const keyTerms = [];
            
            if (this.hybridProcessor) {
                const processed = await this.hybridProcessor.processText(text);
                const terms = processed.enhancedTerms || [];
                
                for (const term of terms) {
                    const { term: word, pos, score } = term;
                    
                    // 重要な品詞のみ抽出
                    if (pos?.includes('名詞') || pos?.includes('動詞')) {
                        const topicRelevance = this.calculateTopicRelevance(word);
                        
                        if (topicRelevance > 0.2) {
                            keyTerms.push({
                                term: word,
                                pos: pos,
                                relevance: topicRelevance,
                                score: score || 0
                            });
                        }
                    }
                }
            }
            
            // スコア順でソート
            return keyTerms
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 10);
                
        } catch (error) {
            console.warn('⚠️ キーワード抽出エラー:', error.message);
            return [];
        }
    }

    /**
     * 分類結果から学習
     */
    async learnFromClassification(classification, userId) {
        try {
            // ユーザー嗜好学習
            if (!this.userTopicPreferences.has(userId)) {
                this.userTopicPreferences.set(userId, {
                    topicInterests: {},
                    classificationHistory: [],
                    totalClassifications: 0,
                    lastUpdated: Date.now()
                });
            }
            
            const userPrefs = this.userTopicPreferences.get(userId);
            
            // 主要トピックの興味度を増加
            const primaryTopic = classification.primaryTopic.topic;
            userPrefs.topicInterests[primaryTopic] = (userPrefs.topicInterests[primaryTopic] || 0) + 0.1;
            
            // 高スコアトピックも学習
            for (const [topic, score] of Object.entries(classification.topicScores)) {
                if (score > 0.3) {
                    userPrefs.topicInterests[topic] = (userPrefs.topicInterests[topic] || 0) + score * 0.05;
                }
            }
            
            // 分類履歴記録
            userPrefs.classificationHistory.push({
                timestamp: Date.now(),
                primaryTopic: classification.primaryTopic,
                confidence: classification.confidence,
                keyTerms: classification.keyTerms.slice(0, 3)
            });
            
            // 最新50件のみ保持
            if (userPrefs.classificationHistory.length > 50) {
                userPrefs.classificationHistory = userPrefs.classificationHistory.slice(-50);
            }
            
            userPrefs.totalClassifications++;
            userPrefs.lastUpdated = Date.now();
            
            // 時系列トピックトレンド記録
            this.temporalTopicTrends.push({
                timestamp: Date.now(),
                topic: primaryTopic,
                confidence: classification.confidence,
                userId: userId
            });
            
            // 最新1000件のみ保持
            if (this.temporalTopicTrends.length > 1000) {
                this.temporalTopicTrends = this.temporalTopicTrends.slice(-1000);
            }
            
            // データ保存
            if (this.persistentLearningDB) {
                await this.saveLearningData(userId);
            }
            
        } catch (error) {
            console.error('❌ トピック分類学習エラー:', error.message);
        }
    }

    /**
     * 学習データ保存
     */
    async saveLearningData(userId) {
        try {
            const userPrefs = this.userTopicPreferences.get(userId);
            if (!userPrefs) return;
            
            const dataToSave = {
                topicInterests: userPrefs.topicInterests,
                classificationHistory: userPrefs.classificationHistory.slice(-30),
                totalClassifications: userPrefs.totalClassifications,
                lastUpdated: userPrefs.lastUpdated
            };
            
            const filePath = `topic_classification_${userId}`;
            await this.persistentLearningDB.saveUserProfile(filePath, dataToSave);
            
        } catch (error) {
            console.error('❌ トピック分類データ保存エラー:', error.message);
        }
    }

    /**
     * 学習データ読み込み
     */
    async loadLearningData(userId) {
        try {
            const filePath = `topic_classification_${userId}`;
            const data = await this.persistentLearningDB.loadUserProfile(filePath);
            
            if (data) {
                this.userTopicPreferences.set(userId, data);
                console.log(`✅ トピック分類データ読み込み完了 (${userId})`);
            }
            
        } catch (error) {
            console.warn(`⚠️ トピック分類データ読み込みエラー (${userId}):`, error.message);
        }
    }

    /**
     * ユーザートピック統計取得
     */
    getUserTopicStats(userId) {
        const userPrefs = this.userTopicPreferences.get(userId);
        if (!userPrefs) {
            return { error: 'No data found for user' };
        }
        
        const sortedInterests = Object.entries(userPrefs.topicInterests)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        const stats = {
            totalClassifications: userPrefs.totalClassifications,
            topInterests: sortedInterests.map(([topic, score]) => ({ topic, score })),
            recentTopics: [],
            diversityScore: 0
        };
        
        // 最近のトピック傾向
        if (userPrefs.classificationHistory.length > 0) {
            const recent = userPrefs.classificationHistory.slice(-10);
            const topicCounts = {};
            
            for (const entry of recent) {
                const topic = entry.primaryTopic.topic;
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
            
            stats.recentTopics = Object.entries(topicCounts)
                .sort(([,a], [,b]) => b - a)
                .map(([topic, count]) => ({ topic, count }));
        }
        
        // 多様性スコア計算
        const interestCount = Object.keys(userPrefs.topicInterests).length;
        stats.diversityScore = Math.min(interestCount / 8, 1.0); // 8カテゴリで最大
        
        return stats;
    }

    /**
     * ヘルパーメソッド
     */
    tokenizeText(text) {
        return text.split(/[\s\u3000\u3001\u3002\u30fb・、。！？()（）「」『』【】\[\]]+/)
                  .filter(word => word.length > 1);
    }

    calculateKeywordWeight(keyword, word) {
        const exactMatch = keyword === word ? 1.0 : 0.7;
        const lengthBonus = Math.min(keyword.length / 5, 1.2);
        return exactMatch * lengthBonus;
    }

    calculateSemanticSimilarity(word1, word2) {
        // 簡易類似度計算
        if (word1 === word2) return 1.0;
        if (word1.includes(word2) || word2.includes(word1)) return 0.7;
        
        // 文字レベル類似度
        const longer = word1.length > word2.length ? word1 : word2;
        const shorter = word1.length <= word2.length ? word1 : word2;
        
        let matches = 0;
        for (const char of shorter) {
            if (longer.includes(char)) matches++;
        }
        
        return matches / longer.length;
    }

    calculateTopicRelevance(word) {
        let maxRelevance = 0;
        
        for (const topicData of Object.values(this.topicCategories)) {
            for (const keyword of topicData.keywords) {
                const similarity = this.calculateSemanticSimilarity(word, keyword);
                maxRelevance = Math.max(maxRelevance, similarity);
            }
        }
        
        return maxRelevance;
    }

    calculateConfidence(classification) {
        const primaryScore = classification.primaryTopic.score;
        const personalizedConfidence = classification.personalizedTopics.confidence;
        const contextualConfidence = classification.contextualTopics.confidence;
        const keyTermsCount = classification.keyTerms.length;
        
        let confidence = primaryScore * 0.4 + 
                        personalizedConfidence * 0.3 + 
                        contextualConfidence * 0.2 + 
                        Math.min(keyTermsCount / 5, 1.0) * 0.1;
        
        return Math.min(confidence, 1.0);
    }

    getDefaultClassification(text) {
        return {
            text,
            primaryTopic: { topic: 'general', score: 0.1, confidence: 'low' },
            topicScores: { general: 0.1 },
            personalizedTopics: { topics: [], confidence: 0, method: 'default' },
            contextualTopics: { topics: [], confidence: 0, method: 'no_context' },
            confidence: 0.1,
            keyTerms: [],
            timestamp: Date.now()
        };
    }
}