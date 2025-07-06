#!/usr/bin/env node
/**
 * DynamicTechnicalPatterns - 動的技術パターン学習システム
 * 
 * 🧠 技術質問パターンの動的学習・自動更新
 * 📊 成功事例からのパターン抽出・強化
 * 💾 外部設定ファイルベースの学習管理
 */

import fs from 'fs';
import path from 'path';
import { configLoader } from './config-loader.js';

export class DynamicTechnicalPatterns {
    constructor() {
        this.technicalPatterns = new Map();
        this.learningHistory = [];
        this.patternStats = new Map();
        this.configPath = './src/config/technical-patterns.json';
        this.lastUpdate = Date.now();
        this.initialized = false;
        
        // 非同期初期化を開始
        this.initializePatterns().then(() => {
            this.initialized = true;
        }).catch(error => {
            console.error('❌ DynamicTechnicalPatterns初期化失敗:', error);
            this.initializeDefaultPatterns();
            this.initialized = true;
        });
    }

    async initializePatterns() {
        try {
            // 外部設定ファイルから技術パターン読み込み
            const config = await configLoader.loadConfig('technicalPatterns');
            if (config) {
                this.loadPatternsFromConfig(config);
            }
            
            // 学習データから動的パターン復元
            await this.loadLearnedPatterns();
            
            console.log(`✅ DynamicTechnicalPatterns初期化完了`);
            console.log(`📊 パターンカテゴリ: ${this.technicalPatterns.size}件`);
            
        } catch (error) {
            console.warn('⚠️ 技術パターン初期化エラー:', error.message);
            this.initializeDefaultPatterns();
        }
    }

    /**
     * 設定ファイルからパターン読み込み
     */
    loadPatternsFromConfig(config) {
        if (config.technicalPatterns) {
            config.technicalPatterns.forEach(category => {
                this.technicalPatterns.set(category.category, {
                    patterns: category.patterns.map(p => new RegExp(p, 'i')),
                    rawPatterns: category.patterns,
                    confidence: 1.0,
                    successCount: 0,
                    lastUsed: Date.now()
                });
            });
        }
        
        if (config.technicalKeywords) {
            this.loadKeywordPatterns(config.technicalKeywords);
        }
        
        if (config.learningPatterns) {
            this.loadLearningPatterns(config.learningPatterns);
        }
    }

    /**
     * キーワードパターン読み込み
     */
    loadKeywordPatterns(keywordCategories) {
        keywordCategories.forEach(category => {
            // 正規表現メタ文字をエスケープ
            const escapedKeywords = category.keywords.map(keyword => 
                keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            );
            const keywordPattern = escapedKeywords.join('|');
            const patternName = `keywords_${category.category}`;
            
            this.technicalPatterns.set(patternName, {
                patterns: [new RegExp(`(${keywordPattern})`, 'i')],
                rawPatterns: [`(${keywordPattern})`],
                confidence: 0.8,
                successCount: 0,
                lastUsed: Date.now()
            });
        });
    }

    /**
     * 学習パターン読み込み
     */
    loadLearningPatterns(learningCategories) {
        learningCategories.forEach(category => {
            this.technicalPatterns.set(category.category, {
                patterns: category.patterns.map(p => new RegExp(p, 'i')),
                rawPatterns: category.patterns,
                confidence: 0.9,
                successCount: 0,
                lastUsed: Date.now()
            });
        });
    }

    /**
     * デフォルトパターン初期化
     */
    initializeDefaultPatterns() {
        const defaultPatterns = [
            {
                category: 'react_javascript',
                patterns: ['React.*useState', 'javascript.*function', 'hook.*react', 'React.*Hook']
            },
            {
                category: 'async_programming',
                patterns: ['async.*await', 'promise.*then', '非同期.*処理', 'Promise.*async']
            },
            {
                category: 'data_science',
                patterns: ['データサイエンス.*Python.*R', 'Python.*R.*比較', '機械学習.*実装', 'データ分析.*手法']
            },
            {
                category: 'database_sql',
                patterns: ['SQL.*JOIN.*最適化', 'データベース.*設計', 'クエリ.*最適化']
            },
            {
                category: 'troubleshooting',
                patterns: ['エラー.*解決', '動かない.*助けて', 'デバッグ.*方法', 'アプリ.*画面.*真っ白']
            }
        ];
        
        defaultPatterns.forEach(category => {
            this.technicalPatterns.set(category.category, {
                patterns: category.patterns.map(p => new RegExp(p, 'i')),
                rawPatterns: category.patterns,
                confidence: 0.7,
                successCount: 0,
                lastUsed: Date.now()
            });
        });
    }

    /**
     * 技術質問検出
     */
    isTechnicalQuery(message) {
        // 初期化チェック
        if (!this.initialized) {
            console.warn('⚠️ DynamicTechnicalPatterns未初期化 - デフォルトパターンで継続');
            this.initializeDefaultPatterns();
        }
        
        let bestMatch = null;
        let maxConfidence = 0;
        
        for (const [category, patternData] of this.technicalPatterns) {
            for (const pattern of patternData.patterns) {
                if (pattern.test(message)) {
                    const confidence = this.calculateMatchConfidence(message, pattern, patternData);
                    
                    if (confidence > maxConfidence) {
                        maxConfidence = confidence;
                        bestMatch = {
                            category,
                            pattern: pattern.source,
                            confidence
                        };
                    }
                }
            }
        }
        
        // 閾値以上で技術質問と判定
        if (maxConfidence >= 0.6) {
            this.recordSuccessfulMatch(bestMatch.category);
            return {
                isTechnical: true,
                category: bestMatch.category,
                confidence: maxConfidence,
                pattern: bestMatch.pattern
            };
        }
        
        return { isTechnical: false, confidence: maxConfidence };
    }

    /**
     * マッチ信頼度計算
     */
    calculateMatchConfidence(message, pattern, patternData) {
        // 基本信頼度
        let confidence = patternData.confidence;
        
        // 成功履歴による補正
        const successBonus = Math.min(patternData.successCount * 0.1, 0.3);
        confidence += successBonus;
        
        // メッセージ長による補正
        const lengthFactor = Math.min(message.length / 50, 1.0);
        confidence *= (0.7 + lengthFactor * 0.3);
        
        // 技術キーワード密度
        const techKeywordDensity = this.calculateTechKeywordDensity(message);
        confidence *= (0.8 + techKeywordDensity * 0.2);
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 技術キーワード密度計算
     */
    calculateTechKeywordDensity(message) {
        const techKeywords = [
            'プログラミング', '開発', '実装', 'コード', 'API', 'データベース',
            'アルゴリズム', 'フレームワーク', 'ライブラリ', 'JavaScript', 'React',
            'Python', 'SQL', '機械学習', 'ディープラーニング', 'AI'
        ];
        
        const words = message.toLowerCase().split(/\s+/);
        const techCount = words.filter(word => 
            techKeywords.some(tech => word.includes(tech.toLowerCase()))
        ).length;
        
        return techCount / Math.max(words.length, 1);
    }

    /**
     * 成功マッチ記録
     */
    recordSuccessfulMatch(category) {
        if (this.technicalPatterns.has(category)) {
            const patternData = this.technicalPatterns.get(category);
            patternData.successCount++;
            patternData.lastUsed = Date.now();
            
            // 学習履歴記録
            this.learningHistory.push({
                timestamp: Date.now(),
                category,
                action: 'successful_match',
                confidence: patternData.confidence
            });
        }
    }

    /**
     * 新しいパターン学習
     */
    async learnNewPattern(message, category, isSuccessful) {
        if (!isSuccessful) return;
        
        // メッセージから特徴的なパターンを抽出
        const extractedPatterns = this.extractPatternsFromMessage(message);
        
        for (const pattern of extractedPatterns) {
            await this.addLearnedPattern(category, pattern);
        }
        
        // 設定ファイル更新
        await this.saveUpdatedPatterns();
    }

    /**
     * メッセージからパターン抽出
     */
    extractPatternsFromMessage(message) {
        const patterns = [];
        
        // 技術用語の組み合わせパターンを抽出
        const techTerms = this.extractTechnicalTerms(message);
        
        if (techTerms.length >= 2) {
            // 2語組み合わせパターン
            for (let i = 0; i < techTerms.length - 1; i++) {
                patterns.push(`${techTerms[i]}.*${techTerms[i + 1]}`);
            }
        }
        
        // 動詞+技術用語パターン
        const actionWords = ['教えて', '実装', '作る', '解決', '修正', '最適化'];
        for (const action of actionWords) {
            if (message.includes(action)) {
                for (const term of techTerms) {
                    patterns.push(`${term}.*${action}`);
                }
            }
        }
        
        return patterns;
    }

    /**
     * 技術用語抽出
     */
    extractTechnicalTerms(message) {
        const technicalTerms = [
            'React', 'useState', 'JavaScript', 'Python', 'SQL', 'データベース',
            'API', '機械学習', 'ディープラーニング', 'アルゴリズム', 'フレームワーク',
            'async', 'await', 'Promise', 'JOIN', '最適化', 'デバッグ', 'エラー'
        ];
        
        return technicalTerms.filter(term => 
            message.toLowerCase().includes(term.toLowerCase())
        );
    }

    /**
     * 学習済みパターン追加
     */
    async addLearnedPattern(category, pattern) {
        if (!this.technicalPatterns.has(category)) {
            this.technicalPatterns.set(category, {
                patterns: [],
                rawPatterns: [],
                confidence: 0.5,
                successCount: 0,
                lastUsed: Date.now()
            });
        }
        
        const patternData = this.technicalPatterns.get(category);
        
        // 重複チェック
        if (!patternData.rawPatterns.includes(pattern)) {
            patternData.patterns.push(new RegExp(pattern, 'i'));
            patternData.rawPatterns.push(pattern);
            
            console.log(`📚 新パターン学習: [${category}] ${pattern}`);
        }
    }

    /**
     * 学習済みパターン読み込み
     */
    async loadLearnedPatterns() {
        try {
            const learningStatsPath = './data/learning/learning-stats.json';
            if (fs.existsSync(learningStatsPath)) {
                const stats = JSON.parse(fs.readFileSync(learningStatsPath, 'utf8'));
                
                // 学習統計から技術パターンを推定
                if (stats.learningEvents) {
                    this.analyzeLearningEventsForPatterns(stats.learningEvents);
                }
            }
        } catch (error) {
            console.warn('⚠️ 学習済みパターン読み込みエラー:', error.message);
        }
    }

    /**
     * 学習イベントからパターン分析
     */
    analyzeLearningEventsForPatterns(events) {
        const technicalEvents = events.filter(event => 
            event.type === 'personal_analysis_update' && 
            event.data?.profile?.interaction?.technicalTermsUsed > 0
        );
        
        // 技術用語使用頻度からパターン強化
        technicalEvents.forEach(event => {
            const techTermCount = event.data.profile.interaction.technicalTermsUsed;
            if (techTermCount > 0) {
                this.reinforcePatternsByUsage(techTermCount);
            }
        });
    }

    /**
     * 使用頻度によるパターン強化
     */
    reinforcePatternsByUsage(usageCount) {
        for (const [category, patternData] of this.technicalPatterns) {
            if (category.includes('react') || category.includes('javascript')) {
                patternData.confidence = Math.min(patternData.confidence + usageCount * 0.1, 1.0);
            }
        }
    }

    /**
     * 更新されたパターンを保存
     */
    async saveUpdatedPatterns() {
        try {
            const currentConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            
            // 学習されたパターンで設定更新
            currentConfig.technicalPatterns.forEach(category => {
                if (this.technicalPatterns.has(category.category)) {
                    const patternData = this.technicalPatterns.get(category.category);
                    category.patterns = patternData.rawPatterns;
                }
            });
            
            currentConfig.lastUpdated = new Date().toISOString();
            currentConfig.dynamicLearning.lastPatternUpdate = Date.now();
            
            fs.writeFileSync(this.configPath, JSON.stringify(currentConfig, null, 2));
            console.log(`💾 技術パターン設定更新完了`);
            
        } catch (error) {
            console.error('❌ パターン保存エラー:', error.message);
        }
    }

    /**
     * パターン統計取得
     */
    getPatternStats() {
        const stats = {
            totalCategories: this.technicalPatterns.size,
            totalPatterns: 0,
            avgConfidence: 0,
            mostUsedCategory: null,
            recentLearning: this.learningHistory.slice(-10)
        };
        
        let totalConfidence = 0;
        let maxSuccess = 0;
        
        for (const [category, data] of this.technicalPatterns) {
            stats.totalPatterns += data.patterns.length;
            totalConfidence += data.confidence;
            
            if (data.successCount > maxSuccess) {
                maxSuccess = data.successCount;
                stats.mostUsedCategory = category;
            }
        }
        
        stats.avgConfidence = totalConfidence / this.technicalPatterns.size;
        
        return stats;
    }
}

// デフォルトインスタンス
export const dynamicTechnicalPatterns = new DynamicTechnicalPatterns();