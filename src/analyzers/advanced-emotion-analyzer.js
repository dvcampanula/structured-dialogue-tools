#!/usr/bin/env node
/**
 * AdvancedEmotionAnalyzer - Phase 7H.2.2高度感情認識システム
 * 
 * 🎯 複雑感情・感情推移・個人感情パターン学習
 * 🔧 ResponseGenerationEngine統合・感情適応応答
 */

import fs from 'fs';

export class AdvancedEmotionAnalyzer {
    constructor() {
        // 感情認識統計
        this.emotionStats = {
            totalAnalyses: 0,
            emotionDistribution: new Map(),
            complexEmotionDetections: 0,
            averageIntensity: 0
        };
        
        // 複雑感情パターン
        this.complexEmotionPatterns = {
            // 複合感情パターン
            mixed_positive: {
                keywords: ['嬉しい', 'でも', '心配', '不安', '期待'],
                description: '喜びと不安の混在',
                intensity_modifier: 0.8
            },
            frustrated_hope: {
                keywords: ['困る', 'けど', '頑張', '希望', 'きっと'],
                description: '困惑と希望の併存',
                intensity_modifier: 0.7
            },
            grateful_concern: {
                keywords: ['ありがとう', 'しかし', '気になる', '心配', 'でも'],
                description: '感謝と懸念の複合',
                intensity_modifier: 0.6
            },
            excited_nervous: {
                keywords: ['楽しみ', 'ドキドキ', '緊張', '不安', 'わくわく'],
                description: '興奮と緊張の混合',
                intensity_modifier: 0.9
            }
        };
        
        // 感情強度指標
        this.intensityMarkers = {
            very_high: ['とても', 'すごく', '本当に', '非常に', '心から'],
            high: ['かなり', 'だいぶ', 'けっこう', '結構'],
            moderate: ['まあまあ', 'そこそこ', 'ある程度'],
            low: ['少し', 'ちょっと', 'やや', '若干'],
            very_low: ['ほんの', 'わずかに', 'かすかに']
        };
        
        // 感情遷移パターン
        this.transitionPatterns = {
            escalation: ['だんだん', '次第に', 'ますます', '徐々に', 'どんどん'],
            sudden_change: ['急に', '突然', 'いきなり', 'すぐに'],
            gradual_shift: ['時間が経つと', '考えてみると', 'よく思うと'],
            cyclical: ['また', '再び', '繰り返し', '何度も']
        };
        
        // 個人感情履歴
        this.personalEmotionHistory = new Map();
        
        // データ保存パス
        this.dataPath = './data/learning/emotion-analysis.json';
        this.historyPath = './data/learning/emotion-history.json';
        this.ensureDataDirectory();
        
        console.log('✅ AdvancedEmotionAnalyzer初期化完了');
    }
    
    /**
     * データディレクトリ確保
     */
    ensureDataDirectory() {
        const dir = './data/learning';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    
    /**
     * 高度感情分析メイン処理
     */
    async analyzeAdvancedEmotion(userInput, sessionId = 'default', context = {}) {
        const analysisId = `${sessionId}_${Date.now()}`;
        
        try {
            // 1. 基本感情分析
            const basicEmotion = this.analyzeBasicEmotion(userInput);
            
            // 2. 複雑感情検出
            const complexEmotion = this.detectComplexEmotions(userInput, basicEmotion);
            
            // 3. 感情強度分析
            const intensityAnalysis = this.analyzeEmotionIntensity(userInput);
            
            // 4. 感情遷移検出
            const transitionAnalysis = this.detectEmotionTransition(userInput, sessionId);
            
            // 5. 個人感情パターン分析
            const personalPattern = this.analyzePersonalEmotionPattern(sessionId, basicEmotion, complexEmotion);
            
            // 6. 統合感情プロファイル生成
            const emotionProfile = this.generateEmotionProfile(
                basicEmotion,
                complexEmotion,
                intensityAnalysis,
                transitionAnalysis,
                personalPattern
            );
            
            // 7. 感情履歴更新
            this.updateEmotionHistory(sessionId, emotionProfile, userInput);
            
            // 8. 統計更新
            this.updateEmotionStats(emotionProfile);
            
            console.log(`🎭 高度感情分析完了: ${emotionProfile.dominantEmotion} (複雑度: ${emotionProfile.complexity})`);
            
            return {
                analysisId,
                emotionProfile,
                metadata: {
                    sessionId,
                    timestamp: new Date(),
                    inputLength: userInput.length,
                    analysisVersion: '1.0'
                }
            };
            
        } catch (error) {
            console.error('❌ 高度感情分析エラー:', error);
            return this.generateFallbackEmotionAnalysis(userInput, sessionId);
        }
    }
    
    /**
     * 基本感情分析
     */
    analyzeBasicEmotion(userInput) {
        const lowerInput = userInput.toLowerCase();
        
        const emotionKeywords = {
            joy: ['嬉しい', '楽しい', '喜び', '幸せ', 'うれしい', '素晴らしい'],
            sadness: ['悲しい', '寂しい', '落ち込む', '憂鬱', 'がっかり'],
            anger: ['怒り', '腹立つ', 'イライラ', 'むかつく', '憤り'],
            fear: ['怖い', '恐怖', '不安', '心配', 'ドキドキ'],
            surprise: ['驚き', 'びっくり', '意外', '予想外', '驚く'],
            disgust: ['嫌', '気持ち悪い', '不快', '嫌悪'],
            trust: ['信頼', '安心', '頼もしい', '信じる'],
            anticipation: ['期待', '楽しみ', 'わくわく', '待ち遠しい']
        };
        
        const emotionScores = {};
        let totalScore = 0;
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            let score = 0;
            for (const keyword of keywords) {
                const matches = (lowerInput.match(new RegExp(keyword, 'g')) || []).length;
                score += matches;
            }
            emotionScores[emotion] = score;
            totalScore += score;
        }
        
        // 正規化
        const normalizedScores = {};
        if (totalScore > 0) {
            for (const [emotion, score] of Object.entries(emotionScores)) {
                normalizedScores[emotion] = score / totalScore;
            }
        }
        
        // 支配的感情決定
        const dominantEmotion = Object.entries(normalizedScores)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
        
        return {
            dominantEmotion,
            emotionScores: normalizedScores,
            confidence: totalScore > 0 ? Math.min(totalScore * 0.2, 1.0) : 0.3,
            detectedKeywords: this.extractDetectedKeywords(userInput, emotionKeywords)
        };
    }
    
    /**
     * 複雑感情検出
     */
    detectComplexEmotions(userInput, basicEmotion) {
        const lowerInput = userInput.toLowerCase();
        const detectedPatterns = [];
        
        for (const [patternName, pattern] of Object.entries(this.complexEmotionPatterns)) {
            let matchCount = 0;
            let detectedKeywords = [];
            
            for (const keyword of pattern.keywords) {
                if (lowerInput.includes(keyword)) {
                    matchCount++;
                    detectedKeywords.push(keyword);
                }
            }
            
            // 50%以上のキーワードマッチで複雑感情と判定
            if (matchCount >= Math.ceil(pattern.keywords.length * 0.5)) {
                detectedPatterns.push({
                    pattern: patternName,
                    description: pattern.description,
                    confidence: matchCount / pattern.keywords.length,
                    intensity_modifier: pattern.intensity_modifier,
                    detectedKeywords
                });
            }
        }
        
        // 複雑感情の複雑度計算
        const complexity = detectedPatterns.length > 0 ? 
            Math.min(detectedPatterns.length * 0.3 + 0.4, 1.0) : 0.0;
        
        return {
            isComplex: detectedPatterns.length > 0,
            complexity,
            patterns: detectedPatterns,
            primaryPattern: detectedPatterns.length > 0 ? detectedPatterns[0] : null
        };
    }
    
    /**
     * 感情強度分析
     */
    analyzeEmotionIntensity(userInput) {
        const lowerInput = userInput.toLowerCase();
        let intensityScore = 0.5; // ベースライン
        let detectedMarkers = [];
        
        // 強度マーカー検出
        for (const [level, markers] of Object.entries(this.intensityMarkers)) {
            for (const marker of markers) {
                if (lowerInput.includes(marker)) {
                    detectedMarkers.push({ level, marker });
                    
                    // 強度スコア調整
                    switch (level) {
                        case 'very_high': intensityScore += 0.4; break;
                        case 'high': intensityScore += 0.3; break;
                        case 'moderate': intensityScore += 0.1; break;
                        case 'low': intensityScore -= 0.1; break;
                        case 'very_low': intensityScore -= 0.2; break;
                    }
                }
            }
        }
        
        // 感嘆符・疑問符による強度調整
        const exclamationCount = (userInput.match(/[!！]/g) || []).length;
        const questionCount = (userInput.match(/[?？]/g) || []).length;
        intensityScore += exclamationCount * 0.1 + questionCount * 0.05;
        
        // 大文字・繰り返し文字による強度調整
        const upperCaseRatio = (userInput.match(/[A-Z]/g) || []).length / userInput.length;
        const repeatedChars = (userInput.match(/(.)\1{2,}/g) || []).length;
        intensityScore += upperCaseRatio * 0.2 + repeatedChars * 0.1;
        
        return {
            intensity: Math.max(0.0, Math.min(1.0, intensityScore)),
            detectedMarkers,
            intensityFactors: {
                markers: detectedMarkers.length,
                exclamations: exclamationCount,
                questions: questionCount,
                uppercase: upperCaseRatio,
                repetitions: repeatedChars
            }
        };
    }
    
    /**
     * 感情遷移検出
     */
    detectEmotionTransition(userInput, sessionId) {
        const lowerInput = userInput.toLowerCase();
        const detectedTransitions = [];
        
        for (const [transitionType, markers] of Object.entries(this.transitionPatterns)) {
            for (const marker of markers) {
                if (lowerInput.includes(marker)) {
                    detectedTransitions.push({
                        type: transitionType,
                        marker,
                        position: lowerInput.indexOf(marker)
                    });
                }
            }
        }
        
        // 過去の感情との比較（履歴があれば）
        const emotionHistory = this.getEmotionHistory(sessionId);
        const previousEmotion = emotionHistory.length > 0 ? 
            emotionHistory[emotionHistory.length - 1].dominantEmotion : null;
        
        return {
            hasTransition: detectedTransitions.length > 0,
            transitions: detectedTransitions,
            previousEmotion,
            transitionIndicators: detectedTransitions.length
        };
    }
    
    /**
     * 個人感情パターン分析
     */
    analyzePersonalEmotionPattern(sessionId, basicEmotion, complexEmotion) {
        const history = this.getEmotionHistory(sessionId);
        
        if (history.length === 0) {
            return {
                isNewUser: true,
                dominantPersonalEmotion: null,
                emotionVariability: 0,
                frequentPatterns: []
            };
        }
        
        // 感情分布分析
        const emotionCounts = {};
        for (const entry of history) {
            const emotion = entry.dominantEmotion;
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        }
        
        // 支配的個人感情
        const dominantPersonalEmotion = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];
        
        // 感情変動性計算
        const uniqueEmotions = Object.keys(emotionCounts).length;
        const emotionVariability = history.length > 1 ? 
            uniqueEmotions / history.length : 0;
        
        // 頻出パターン検出
        const frequentPatterns = this.detectFrequentEmotionPatterns(history);
        
        return {
            isNewUser: false,
            dominantPersonalEmotion,
            emotionVariability,
            frequentPatterns,
            sessionCount: history.length,
            personalityTendency: this.inferPersonalityTendency(emotionCounts, emotionVariability)
        };
    }
    
    /**
     * 統合感情プロファイル生成
     */
    generateEmotionProfile(basicEmotion, complexEmotion, intensityAnalysis, transitionAnalysis, personalPattern) {
        // 複雑感情考慮による支配的感情決定
        let dominantEmotion = basicEmotion.dominantEmotion;
        if (complexEmotion.isComplex && complexEmotion.primaryPattern) {
            dominantEmotion = `complex_${complexEmotion.primaryPattern.pattern}`;
        }
        
        // 総合信頼度計算
        const confidence = (
            basicEmotion.confidence * 0.4 +
            (complexEmotion.isComplex ? complexEmotion.patterns[0]?.confidence || 0 : 0.5) * 0.3 +
            (intensityAnalysis.detectedMarkers.length > 0 ? 0.8 : 0.5) * 0.3
        );
        
        return {
            dominantEmotion,
            complexity: complexEmotion.complexity,
            intensity: intensityAnalysis.intensity,
            confidence: Math.min(confidence, 1.0),
            basicEmotion: basicEmotion.dominantEmotion,
            complexEmotions: complexEmotion.patterns,
            transitions: transitionAnalysis.transitions,
            personalPattern: personalPattern.dominantPersonalEmotion,
            emotionFactors: {
                hasComplexEmotion: complexEmotion.isComplex,
                hasTransition: transitionAnalysis.hasTransition,
                isPersonalized: !personalPattern.isNewUser,
                intensityLevel: this.getIntensityLevel(intensityAnalysis.intensity)
            }
        };
    }
    
    /**
     * 感情履歴更新
     */
    updateEmotionHistory(sessionId, emotionProfile, userInput) {
        const historyEntry = {
            timestamp: new Date(),
            dominantEmotion: emotionProfile.dominantEmotion,
            intensity: emotionProfile.intensity,
            complexity: emotionProfile.complexity,
            confidence: emotionProfile.confidence,
            inputSample: userInput.substring(0, 50) + (userInput.length > 50 ? '...' : '')
        };
        
        if (!this.personalEmotionHistory.has(sessionId)) {
            this.personalEmotionHistory.set(sessionId, []);
        }
        
        const history = this.personalEmotionHistory.get(sessionId);
        history.push(historyEntry);
        
        // 履歴サイズ制限（最新50件まで保持）
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
        
        // ファイル保存
        this.saveEmotionHistory();
    }
    
    /**
     * フォールバック感情分析
     */
    generateFallbackEmotionAnalysis(userInput, sessionId) {
        return {
            analysisId: `fallback_${sessionId}_${Date.now()}`,
            emotionProfile: {
                dominantEmotion: 'neutral',
                complexity: 0.3,
                intensity: 0.5,
                confidence: 0.4,
                basicEmotion: 'neutral',
                complexEmotions: [],
                transitions: [],
                personalPattern: null,
                emotionFactors: {
                    hasComplexEmotion: false,
                    hasTransition: false,
                    isPersonalized: false,
                    intensityLevel: 'moderate'
                }
            },
            metadata: {
                sessionId,
                timestamp: new Date(),
                inputLength: userInput.length,
                isFallback: true
            }
        };
    }
    
    /**
     * ヘルパーメソッド群
     */
    extractDetectedKeywords(userInput, emotionKeywords) {
        const detected = [];
        const lowerInput = userInput.toLowerCase();
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            for (const keyword of keywords) {
                if (lowerInput.includes(keyword)) {
                    detected.push({ emotion, keyword });
                }
            }
        }
        
        return detected;
    }
    
    getEmotionHistory(sessionId) {
        return this.personalEmotionHistory.get(sessionId) || [];
    }
    
    detectFrequentEmotionPatterns(history) {
        if (history.length < 3) return [];
        
        const patterns = [];
        
        // 3連続同じ感情パターン検出
        for (let i = 0; i <= history.length - 3; i++) {
            const emotions = history.slice(i, i + 3).map(h => h.dominantEmotion);
            if (emotions[0] === emotions[1] && emotions[1] === emotions[2]) {
                patterns.push({
                    type: 'stable_emotion',
                    emotion: emotions[0],
                    frequency: 3
                });
            }
        }
        
        return patterns;
    }
    
    inferPersonalityTendency(emotionCounts, emotionVariability) {
        const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
        const positiveEmotions = ['joy', 'trust', 'anticipation'].reduce((sum, emotion) => 
            sum + (emotionCounts[emotion] || 0), 0);
        const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'].reduce((sum, emotion) => 
            sum + (emotionCounts[emotion] || 0), 0);
        
        const positiveRatio = positiveEmotions / totalEmotions;
        const negativeRatio = negativeEmotions / totalEmotions;
        
        if (emotionVariability > 0.7) {
            return 'emotionally_dynamic';
        } else if (positiveRatio > 0.6) {
            return 'optimistic';
        } else if (negativeRatio > 0.6) {
            return 'cautious';
        } else {
            return 'balanced';
        }
    }
    
    getIntensityLevel(intensity) {
        if (intensity >= 0.8) return 'very_high';
        if (intensity >= 0.6) return 'high';
        if (intensity >= 0.4) return 'moderate';
        if (intensity >= 0.2) return 'low';
        return 'very_low';
    }
    
    /**
     * 統計更新
     */
    updateEmotionStats(emotionProfile) {
        this.emotionStats.totalAnalyses++;
        
        // 感情分布更新
        const emotion = emotionProfile.dominantEmotion;
        this.emotionStats.emotionDistribution.set(
            emotion,
            (this.emotionStats.emotionDistribution.get(emotion) || 0) + 1
        );
        
        // 複雑感情検出統計
        if (emotionProfile.emotionFactors.hasComplexEmotion) {
            this.emotionStats.complexEmotionDetections++;
        }
        
        // 平均強度更新
        const currentAvg = this.emotionStats.averageIntensity;
        this.emotionStats.averageIntensity = 
            (currentAvg * (this.emotionStats.totalAnalyses - 1) + emotionProfile.intensity) / 
            this.emotionStats.totalAnalyses;
    }
    
    /**
     * データ保存
     */
    saveEmotionHistory() {
        try {
            const historyData = {};
            for (const [sessionId, history] of this.personalEmotionHistory) {
                historyData[sessionId] = history;
            }
            
            fs.writeFileSync(this.historyPath, JSON.stringify(historyData, null, 2));
            console.log('💾 感情履歴データ保存完了');
        } catch (error) {
            console.error('⚠️ 感情履歴保存エラー:', error.message);
        }
    }
    
    /**
     * 統計取得
     */
    getAdvancedEmotionStats() {
        const emotionDistribution = Object.fromEntries(this.emotionStats.emotionDistribution);
        const complexEmotionRate = this.emotionStats.totalAnalyses > 0 ? 
            (this.emotionStats.complexEmotionDetections / this.emotionStats.totalAnalyses * 100).toFixed(1) : 0;
        
        return {
            totalAnalyses: this.emotionStats.totalAnalyses,
            emotionDistribution,
            complexEmotionRate: `${complexEmotionRate}%`,
            averageIntensity: this.emotionStats.averageIntensity.toFixed(3),
            activeUsers: this.personalEmotionHistory.size,
            lastUpdated: new Date()
        };
    }
    
    /**
     * 感情パターン学習統計
     */
    getEmotionPatternLearningStats() {
        const allPatterns = [];
        let totalSessions = 0;
        
        for (const [sessionId, history] of this.personalEmotionHistory) {
            totalSessions++;
            const patterns = this.detectFrequentEmotionPatterns(history);
            allPatterns.push(...patterns);
        }
        
        const patternCounts = {};
        for (const pattern of allPatterns) {
            const key = `${pattern.type}_${pattern.emotion}`;
            patternCounts[key] = (patternCounts[key] || 0) + 1;
        }
        
        return {
            totalSessions,
            totalPatterns: allPatterns.length,
            patternDistribution: patternCounts,
            averagePatternsPerSession: totalSessions > 0 ? 
                (allPatterns.length / totalSessions).toFixed(2) : 0
        };
    }
}