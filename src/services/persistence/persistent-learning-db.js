#!/usr/bin/env node
/**
 * PersistentLearningDB - 動的学習データ永続化システム
 * 
 * 🗄️ SQLite + JSONファイル永続化システム
 * 💾 学習データ・ユーザー関係性・会話履歴の永続保存
 * 🔄 サーバー再起動時の自動復元・高速読み込み
 */

import fs from 'fs';
import path from 'path';

export class PersistentLearningDB {
    constructor(basePath = './data/learning') {
        this.basePath = basePath;
        this.userProfilesDir = path.join(this.basePath, 'user_profiles');
        this.systemDataDir = path.join(this.basePath, 'system_data');
        this.ensureDataDirectory();
        this.ensureUserProfilesDirectory();
        this.ensureSystemDataDirectory();
        
        // データファイルパス
        this.userRelationsPath = path.join(this.basePath, 'user-relations.json');
        this.conceptLearningPath = path.join(this.basePath, 'concept-learning.json');
        this.conversationHistoryPath = path.join(this.basePath, 'conversation-history.json');
        this.learningStatsPath = path.join(this.basePath, 'learning-stats.json');
        this.conceptAnalysisDBPath = path.join(this.basePath, 'concept-analysis-db.json');
        this.banditDataPath = path.join(this.basePath, 'bandit-data.json');
        this.ngramDataPath = path.join(this.basePath, 'ngram-data.json');
        this.qualityTrainingDataPath = path.join(this.basePath, 'quality-training-data.json');
        
        // インメモリキャッシュ
        this.userRelationsCache = new Map();
        this.conceptLearningCache = new Map();
        this.conversationCache = [];
        this.statsCache = {};
        this.banditDataCache = null;
        this.ngramDataCache = null;
        
        // 初期化フラグ（重複読み込み防止）
        this.isDataLoaded = false;
        
        // 非同期初期化を遅延実行
        this._initPromise = this.loadAllData();
        
        if (process.env.DEBUG_VERBOSE === 'true') {
            console.log('✅ PersistentLearningDB初期化完了');
            console.log(`📂 データベース: ${this.basePath}`);
        }
    }

    /**
     * 初期化完了を待機
     */
    async waitForInitialization() {
        await this._initPromise;
    }

    /**
     * データディレクトリ確保
     */
    ensureDataDirectory() {
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
            console.log(`📁 データディレクトリ作成: ${this.basePath}`);
        }
    }

    /**
     * ユーザープロファイルディレクトリ確保
     */
    ensureUserProfilesDirectory() {
        if (!fs.existsSync(this.userProfilesDir)) {
            fs.mkdirSync(this.userProfilesDir, { recursive: true });
            console.log(`📁 ユーザープロファイルディレクトリ作成: ${this.userProfilesDir}`);
        }
    }

    /**
     * システムデータディレクトリ確保
     */
    ensureSystemDataDirectory() {
        if (!fs.existsSync(this.systemDataDir)) {
            fs.mkdirSync(this.systemDataDir, { recursive: true });
            console.log(`📁 システムデータディレクトリ作成: ${this.systemDataDir}`);
        }
    }

    /**
     * 全データ読み込み（起動時）
     */
    async loadAllData() {
        if (this.isDataLoaded) {
            if (process.env.DEBUG_VERBOSE === 'true') {
                console.log('⏭️ データ既読み込み済み、スキップ');
            }
            return;
        }
        
        try {
            await Promise.all([
                this.loadUserRelations(),
                this.loadConceptLearning(),
                this.loadConversationHistory(),
                this.loadLearningStats(),
                this.loadBanditData(),
                this.loadNgramData()
            ]);
            
            this.isDataLoaded = true;
            
            if (process.env.DEBUG_VERBOSE === 'true') {
                console.log(`💾 データ読み込み完了: 関係性${this.userRelationsCache.size}件, 概念${this.conceptLearningCache.size}件, 会話${this.conversationCache.length}件`);
            }
            
        } catch (error) {
            console.warn('⚠️ データ読み込みエラー:', error.message);
            this.initializeEmptyData();
        }
    }

    /**
     * N-gramデータ読み込み
     */
    async loadNgramData() {
        if (fs.existsSync(this.ngramDataPath)) {
            const data = JSON.parse(fs.readFileSync(this.ngramDataPath, 'utf8'));
            
            // Geminiのデータ破損を修復
            const repairDataArray = (arrayData) => {
                if (!Array.isArray(arrayData)) return [];
                
                const repaired = [];
                for (const item of arrayData) {
                    if (!Array.isArray(item) || item.length < 2) {
                        console.warn('⚠️ 不正なN-gramエントリをスキップ (配列ではないか要素が少ない):', item);
                        continue;
                    }

                    let key = null;
                    let value = null;

                    // 形式: [数値, [数値, 文字列]] または [数値, [文字列, 数値]]
                    if (typeof item[0] === 'number' && Array.isArray(item[1]) && item[1].length === 2) {
                        if (typeof item[1][0] === 'number' && typeof item[1][1] === 'string') {
                            key = item[1][1];
                            value = item[1][0];
                        } else if (typeof item[1][0] === 'string' && typeof item[1][1] === 'number') {
                            key = item[1][0];
                            value = item[1][1];
                        }
                    }
                    // 形式: [文字列, 数値] (正しい形式)
                    else if (typeof item[0] === 'string' && typeof item[1] === 'number') {
                        key = item[0];
                        value = item[1];
                    }
                    // 形式: [数値, 文字列] (逆の形式)
                    else if (typeof item[0] === 'number' && typeof item[1] === 'string') {
                        key = item[1];
                        value = item[0];
                    }
                    // 形式: [キー, [値1, 値2, ...]] の場合 (continuationCounts用)
                    else if (typeof item[0] === 'string' && Array.isArray(item[1])) {
                        key = item[0];
                        value = item[1]; // 配列をそのまま値として保持
                    }

                    if (key !== null && value !== null) {
                        repaired.push([key, value]);
                    } else {
                        console.warn('⚠️ 不明なN-gramデータ形式をスキップ:', item);
                    }
                }
                console.log(`📊 データ修復: ${arrayData.length} → ${repaired.length} エントリ`);
                return repaired;
            };
            
            // Mapオブジェクトに変換して返す
            const loadedData = {
                ngramFrequencies: new Map(repairDataArray(data.ngramFrequencies || [])),
                contextFrequencies: new Map(repairDataArray(data.contextFrequencies || [])),
                continuationCounts: new Map(repairDataArray(data.continuationCounts || []).map(([key, valueArray]) => [key, new Set(Array.isArray(valueArray) ? valueArray : [])])),
                documentFreqs: new Map(repairDataArray(data.documentFreqs || [])),
                totalNgrams: data.totalNgrams || 0,
                totalDocuments: data.totalDocuments || 0,
            };
            this.ngramDataCache = loadedData;
            console.log(`📊 N-gramデータ読み込み・修復完了: ${loadedData.ngramFrequencies.size}パターン`);
            return loadedData;
        }
        return null;
    }

    /**
     * N-gramデータ保存
     */
    async saveNgramData(data) {
        try {
            const dataToSave = {
                ngramFrequencies: Array.from(data.ngramFrequencies.entries()),
                contextFrequencies: Array.from(data.contextFrequencies.entries()),
                continuationCounts: Array.from(data.continuationCounts.entries()).map(([key, valueSet]) => [key, Array.from(valueSet)]),
                documentFreqs: Array.from(data.documentFreqs.entries()),
                totalNgrams: data.totalNgrams,
                totalDocuments: data.totalDocuments,
            };
            fs.writeFileSync(this.ngramDataPath, JSON.stringify(dataToSave, null, 2));
            this.ngramDataCache = data;
            console.log(`💾 N-gramデータ保存完了`);
        } catch (error) {
            console.error('❌ N-gramデータ保存エラー:', error.message);
        }
    }

    /**
     * 品質予測モデル読み込み
     */
    async loadQualityPredictionModel() {
        const modelPath = path.join(this.basePath, 'quality-prediction-model.json');
        try {
            if (fs.existsSync(modelPath)) {
                const data = fs.readFileSync(modelPath, 'utf8');
                if (process.env.DEBUG_VERBOSE === 'true') {
                    console.log('📥 品質予測モデル読み込み完了');
                }
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.warn('⚠️ 品質予測モデル読み込みエラー:', error.message);
            return null;
        }
    }

    /**
     * 品質予測モデル保存
     */
    async saveQualityPredictionModel(modelData) {
        const modelPath = path.join(this.basePath, 'quality-prediction-model.json');
        try {
            fs.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));
            if (process.env.DEBUG_VERBOSE === 'true') {
                console.log('💾 品質予測モデル保存完了');
            }
        } catch (error) {
            console.error('❌ 品質予測モデル保存エラー:', error.message);
        }
    }

    /**
     * 改善パターン読み込み
     */
    async loadImprovementPatterns() {
        const patternsPath = path.join(this.basePath, 'improvement-patterns.json');
        try {
            if (fs.existsSync(patternsPath)) {
                const data = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
                // Mapに変換できる形式か確認
                if (Array.isArray(data) && data.every(item => Array.isArray(item) && item.length === 2)) {
                    console.log('📚 改善パターン読み込み完了');
                    return new Map(data);
                } else {
                    console.warn('⚠️ 改善パターンデータが不正な形式です。空のMapで初期化します。');
                    return new Map();
                }
            }
            return new Map(); // ファイルが存在しない場合もMapを返す
        } catch (error) {
            console.warn('⚠️ 改善パターン読み込みエラー:', error.message);
            return new Map();
        }
    }

    /**
     * 改善パターン保存
     */
    async saveImprovementPatterns(patterns) {
        const patternsPath = path.join(this.basePath, 'improvement-patterns.json');
        try {
            fs.writeFileSync(patternsPath, JSON.stringify(patterns, null, 2));
            console.log('💾 改善パターン保存完了');
        } catch (error) {
            console.error('❌ 改善パターン保存エラー:', error.message);
        }
    }

    /**
     * バンディットデータ読み込み
     */
    async loadBanditData() {
        if (fs.existsSync(this.banditDataPath)) {
            const data = JSON.parse(fs.readFileSync(this.banditDataPath, 'utf8'));
            // Mapオブジェクトに変換して返す
            const loadedData = {
                vocabularyStats: new Map(data.vocabularyStats && Array.isArray(data.vocabularyStats) ? data.vocabularyStats : []),
                totalSelections: data.totalSelections || 0,
            };
            this.banditDataCache = loadedData;
            console.log(`🎰 バンディットデータ読み込み完了`);
            return loadedData;
        }
        return null;
    }

    /**
     * バンディットデータ保存
     */
    async saveBanditData(data) {
        try {
            const dataToSave = {
                vocabularyStats: Array.from(data.vocabularyStats.entries()),
                totalSelections: data.totalSelections,
            };
            fs.writeFileSync(this.banditDataPath, JSON.stringify(dataToSave, null, 2));
            this.banditDataCache = data;
            // console.log(`💾 バンディットデータ保存完了`); // ログを削除
        } catch (error) {
            console.error('❌ バンディットデータ保存エラー:', error.message);
        }
    }

    /**
     * 特定ユーザープロファイル保存
     */
    async saveUserProfile(userId, profileData) {
        const filePath = path.join(this.userProfilesDir, `${userId}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2));
        } catch (error) {
            console.error(`❌ ユーザープロファイル保存エラー (${userId}):`, error.message);
            throw error;
        }
    }

    /**
     * 特定ユーザープロファイル読み込み
     */
    async loadUserProfile(userId) {
        const filePath = path.join(this.userProfilesDir, `${userId}.json`);
        try {
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                // Mapオブジェクトに変換して返す
                const loadedData = {
                    userId: data.userId,
                    classCounts: new Map(data.classCounts || []),
                    featureCounts: new Map(data.featureCounts ? data.featureCounts.map(([key, valueArray]) => [key, new Map(valueArray)]) : []),
                    totalInteractions: data.totalInteractions || 0,
                    preferences: new Map(data.preferences || []),
                };
                return loadedData;
            }
        } catch (error) {
            console.error(`❌ ユーザープロファイル読み込みエラー (${userId}):`, error.message);
        }
        return null;
    }

    /**
     * 全てのユーザープロファイル読み込み
     */
    async loadAllUserProfiles() {
        const allProfiles = {};
        try {
            const files = fs.readdirSync(this.userProfilesDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const userId = file.replace('.json', '');
                    const profile = await this.loadUserProfile(userId);
                    if (profile) {
                        allProfiles[userId] = profile;
                    }
                }
            }
        } catch (error) {
            console.error('❌ 全ユーザープロファイル読み込みエラー:', error.message);
        }
        return allProfiles;
    }

    /**
     * 特定ユーザープロファイル削除
     */
    async deleteUserProfile(userId) {
        const filePath = path.join(this.userProfilesDir, `${userId}.json`);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
        } catch (error) {
            console.error(`❌ ユーザープロファイル削除エラー (${userId}):`, error.message);
        }
        return false;
    }

    /**
     * 全てのユーザープロファイルをクリア
     */
    async clearAllUserProfiles() {
        try {
            const files = fs.readdirSync(this.userProfilesDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(this.userProfilesDir, file));
                }
            }
            return true;
        } catch (error) {
            console.error('❌ 全ユーザープロファイルクリアエラー:', error.message);
        }
        return false;
    }

    /**
     * ユーザー関係性データ読み込み
     */
    async loadUserRelations() {
        if (fs.existsSync(this.userRelationsPath)) {
            const data = JSON.parse(fs.readFileSync(this.userRelationsPath, 'utf8'));
            
            // 読み込んだデータがオブジェクトであることを確認
            if (typeof data === 'object' && data !== null) {
                // 読み込んだオブジェクトをMapに変換し、ネストされたMapも再構築
                this.userRelationsCache = new Map();
                for (const [userKey, userData] of Object.entries(data)) {
                    const loadedUserData = { ...userData };
                    if (Array.isArray(loadedUserData.userRelations)) {
                        loadedUserData.userRelations = new Map(loadedUserData.userRelations);
                    }
                    if (Array.isArray(loadedUserData.coOccurrenceData)) {
                        loadedUserData.coOccurrenceData = new Map(loadedUserData.coOccurrenceData);
                    }
                    this.userRelationsCache.set(userKey, loadedUserData);
                }
            } else {
                console.warn('⚠️ ユーザー関係性データが不正な形式です。空のMapで初期化します。');
                this.userRelationsCache = new Map();
            }

            console.log(`📊 ユーザー関係性読み込み: ${this.userRelationsCache.size}件`);
        }
    }

    /**
     * 概念学習データ読み込み
     */
    async loadConceptLearning() {
        if (fs.existsSync(this.conceptLearningPath)) {
            const data = JSON.parse(fs.readFileSync(this.conceptLearningPath, 'utf8'));
            
            // 読み込んだデータが配列であることを確認し、Mapに変換
            if (Array.isArray(data)) {
                this.conceptLearningCache = new Map(data);
            } else {
                console.warn('⚠️ 概念学習データが不正な形式です。空のMapで初期化します。');
                this.conceptLearningCache = new Map();
            }
            
            console.log(`🧠 概念学習データ読み込み: ${this.conceptLearningCache.size}件`);
        }
    }

    /**
     * 会話履歴読み込み
     */
    async loadConversationHistory() {
        if (fs.existsSync(this.conversationHistoryPath)) {
            const data = JSON.parse(fs.readFileSync(this.conversationHistoryPath, 'utf8'));
            if (Array.isArray(data)) {
                this.conversationCache = data;
            } else {
                console.warn('⚠️ 会話履歴データが不正な形式です。空の配列で初期化します。');
                this.conversationCache = [];
            }
            console.log(`💬 会話履歴読み込み: ${this.conversationCache.length}件`);
        }
    }

    /**
     * 学習統計読み込み
     */
    async loadLearningStats() {
        if (fs.existsSync(this.learningStatsPath)) {
            const data = JSON.parse(fs.readFileSync(this.learningStatsPath, 'utf8'));
            if (typeof data === 'object' && data !== null) {
                this.statsCache = data;
            } else {
                console.warn('⚠️ 学習統計データが不正な形式です。デフォルト値で初期化します。');
                this.initializeStats();
            }
            console.log(`📈 学習統計読み込み完了`);
        } else {
            this.initializeStats();
        }
    }

    /**
     * 空データ初期化
     */
    initializeEmptyData() {
        this.userRelationsCache = new Map();
        this.conceptLearningCache = new Map();
        this.conversationCache = [];
        this.initializeStats();
        
        console.log('🆕 空データベース初期化完了');
    }

    /**
     * 統計初期化
     */
    initializeStats() {
        this.statsCache = {
            totalConversations: 0,
            totalRelationsLearned: 0,
            totalConceptsLearned: 0,
            lastLearningDate: Date.now(),
            qualityScore: 0.5,
            learningEvents: []
        };
    }

    /**
     * ユーザー関係性保存
     */
    async saveUserRelations(userRelationsMap) {
        try {
            // Mapをオブジェクトに変換
            const dataToSave = {};
            let totalRelationsCount = 0;
            for (const [userKey, userData] of userRelationsMap) {
                const processedUserData = { ...userData };
                if (processedUserData.userRelations instanceof Map) {
                    processedUserData.userRelations = Array.from(processedUserData.userRelations.entries());
                }
                if (processedUserData.coOccurrenceData instanceof Map) {
                    processedUserData.coOccurrenceData = Array.from(processedUserData.coOccurrenceData.entries());
                }
                dataToSave[userKey] = processedUserData;
                if (userData && userData.userRelations) {
                    totalRelationsCount += (userData.userRelations instanceof Map) ? userData.userRelations.size : Object.keys(userData.userRelations).length;
                }
                this.userRelationsCache.set(userKey, userData);
            }
            
            fs.writeFileSync(this.userRelationsPath, JSON.stringify(dataToSave, null, 2));
            console.log(`💾 ユーザー関係性保存: ${Object.keys(dataToSave).length}件のユーザー, ${totalRelationsCount}件の関係性`);
            
            // 統計更新
            this.statsCache.totalRelationsLearned = totalRelationsCount;
            this.statsCache.lastLearningDate = Date.now();
            await this.saveLearningStats();
            
        } catch (error) {
            console.error('❌ ユーザー関係性保存エラー:', error.message);
        }
    }

    /**
     * 概念学習データ保存
     */
    async saveConceptLearning(conceptData) {
        try {
            const dataToSave = Array.from(conceptData.entries());
            
            fs.writeFileSync(this.conceptLearningPath, JSON.stringify(dataToSave, null, 2));
            this.conceptLearningCache = conceptData;
            console.log(`🧠 概念学習データ保存: ${conceptData.size}件`);
            
            // 統計更新
            this.statsCache.totalConceptsLearned = conceptData.size;
            await this.saveLearningStats();
            
        } catch (error) {
            console.error('❌ 概念学習データ保存エラー:', error.message);
        }
    }

    /**
     * 会話履歴保存
     */
    async saveConversationHistory(conversations) {
        try {
            // 最新1000件のみ保持
            const limitedConversations = conversations.slice(-1000);
            this.conversationCache = limitedConversations;
            
            fs.writeFileSync(this.conversationHistoryPath, JSON.stringify(limitedConversations, null, 2));
            console.log(`💬 会話履歴保存: ${limitedConversations.length}件`);
            
            // 統計更新
            this.statsCache.totalConversations = limitedConversations.length;
            await this.saveLearningStats();
            
        } catch (error) {
            console.error('❌ 会話履歴保存エラー:', error.message);
        }
    }

    /**
     * 学習統計保存
     */
    async saveLearningStats() {
        try {
            fs.writeFileSync(this.learningStatsPath, JSON.stringify(this.statsCache, null, 2));
        } catch (error) {
            console.error('❌ 学習統計保存エラー:', error.message);
        }
    }

    /**
     * 学習イベント記録
     */
    async recordLearningEvent(eventType, eventData) {
        const event = {
            timestamp: Date.now(),
            type: eventType,
            data: eventData
        };
        
        this.statsCache.learningEvents.push(event);
        
        // 動的学習データの場合、統計カウンターを更新
        if (eventType === 'dynamic_learning_update' && eventData.learningStats) {
            this.statsCache.totalRelationsLearned = Math.max(
                this.statsCache.totalRelationsLearned, 
                eventData.learningStats.totalRelations || 0
            );
            this.statsCache.totalConceptsLearned = Math.max(
                this.statsCache.totalConceptsLearned,
                eventData.learningStats.totalTerms || 0
            );
            this.statsCache.lastLearningDate = Date.now();
        }
        
        // 最新100件のみ保持
        if (this.statsCache.learningEvents.length > 100) {
            this.statsCache.learningEvents = this.statsCache.learningEvents.slice(-100);
        }
        
        await this.saveLearningStats();
    }

    /**
     * ユーザー関係性取得
     */
    getUserRelations() {
        return this.userRelationsCache;
    }

    /**
     * 概念学習データ取得
     */
    getConceptLearning() {
        return this.conceptLearningCache;
    }

    /**
     * 会話履歴取得
     */
    getConversationHistory() {
        return this.conversationCache;
    }

    /**
     * 学習統計取得
     */
    getLearningStats() {
        return {
            ...this.statsCache,
            databaseSize: {
                userRelations: this.userRelationsCache.size,
                conceptLearning: this.conceptLearningCache.size,
                conversationHistory: this.conversationCache.length
            }
        };
    }

    /**
     * 特定ユーザーの関係性取得
     */
    getUserSpecificRelations(userId) {
        const userKey = `user_${userId}`;
        const data = this.userRelationsCache.get(userKey);
        return data || { userRelations: {}, coOccurrenceData: {}, learningConfig: {} }; // Ensure a consistent structure is returned
    }

    /**
     * 特定ユーザーの関係性保存
     */
    async saveUserSpecificRelations(userId, relations) {
        const userKey = `user_${userId}`;
        
        // relationsオブジェクトの正しい構造を確保
        const validatedRelations = {
            userRelations: relations.userRelations || {},
            coOccurrenceData: relations.coOccurrenceData || {},
            learningConfig: relations.learningConfig || {
                minCoOccurrence: 2,
                strengthThreshold: 0.3,
                maxRelationsPerTerm: 10,
                decayFactor: 0.95,
                learningRate: 0.1,
                forgettingThreshold: 0.1,
                maxMemorySize: 1000,
                batchSaveInterval: 5,
                qualityThreshold: 0.6
            },
            lastSaved: Date.now()
        };
        
        this.userRelationsCache.set(userKey, validatedRelations);
        
        // 全データ保存
        await this.saveUserRelations(this.userRelationsCache);
        
        // 学習イベント記録
        await this.recordLearningEvent('user_relations_update', {
            userId: userId,
            relationsCount: Object.keys(validatedRelations.userRelations).length
        });
    }

    /**
     * 概念関係性検索
     */
    searchConceptRelations(concept) {
        const results = [];
        
        for (const [key, data] of this.conceptLearningCache) {
            if (key.includes(concept) || JSON.stringify(data).includes(concept)) {
                results.push({ concept: key, data: data });
            }
        }
        
        return results;
    }

    /**
     * 学習品質評価更新
     */
    async updateQualityScore(newScore) {
        this.statsCache.qualityScore = newScore;
        this.statsCache.lastQualityUpdate = Date.now();
        
        await this.saveLearningStats();
        await this.recordLearningEvent('quality_update', { score: newScore });
    }

    /**
     * 品質スコアの統計情報を取得
     */
    async getQualityStats() {
        if (this.conversationCache.length === 0) {
            return { average: 0.5, stdDev: 0.1, count: 0 }; // デフォルト値
        }

        const scores = this.conversationCache.map(c => c.qualityScore).filter(s => typeof s === 'number');

        if (scores.length === 0) {
            return { average: 0.5, stdDev: 0.1, count: 0 };
        }

        const sum = scores.reduce((acc, score) => acc + score, 0);
        const average = sum / scores.length;

        const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        return { average, stdDev, count: scores.length };
    }

    /**
     * データベース統計
     */
    getDatabaseStats() {
        const stats = this.getLearningStats();
        
        return {
            summary: {
                totalUsers: this.getUserCount(),
                totalRelations: stats.databaseSize.userRelations,
                totalConcepts: stats.databaseSize.conceptLearning,
                totalConversations: stats.databaseSize.conversationHistory,
                qualityScore: stats.qualityScore
            },
            performance: {
                cacheHitRate: this.calculateCacheHitRate(),
                averageLoadTime: this.getAverageLoadTime(),
                dataIntegrity: this.checkDataIntegrity()
            },
            recentActivity: {
                lastLearning: stats.lastLearningDate,
                recentEvents: stats.learningEvents.slice(-10)
            }
        };
    }

    /**
     * ユーザー数取得
     */
    getUserCount() {
        let userCount = 0;
        for (const key of this.userRelationsCache.keys()) {
            if (key.startsWith('user_')) {
                userCount++;
            }
        }
        return userCount;
    }

    /**
     * キャッシュヒット率計算
     */
    calculateCacheHitRate() {
        // 簡易実装：実際は詳細な統計が必要
        return 0.95;
    }

    /**
     * 平均読み込み時間取得
     */
    getAverageLoadTime() {
        // 簡易実装：実際は計測データが必要
        return '25ms';
    }

    /**
     * データ整合性チェック
     */
    checkDataIntegrity() {
        try {
            // ファイル存在チェック
            const files = [
                this.userRelationsPath,
                this.conceptLearningPath,
                this.conversationHistoryPath,
                this.learningStatsPath
            ];
            
            let integrityScore = 0;
            for (const file of files) {
                if (fs.existsSync(file)) {
                    integrityScore += 0.25;
                }
            }
            
            return Math.round(integrityScore * 100) + '%';
            
        } catch (error) {
            return 'エラー';
        }
    }

    /**
     * データベースバックアップ
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.basePath, 'backups', timestamp);
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        try {
            const files = [
                'user-relations.json',
                'concept-learning.json', 
                'conversation-history.json',
                'learning-stats.json'
            ];
            
            for (const file of files) {
                const srcPath = path.join(this.basePath, file);
                const destPath = path.join(backupDir, file);
                
                if (fs.existsSync(srcPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
            
            console.log(`💾 バックアップ作成完了: ${backupDir}`);
            return backupDir;
            
        } catch (error) {
            console.error('❌ バックアップ作成エラー:', error.message);
            throw error;
        }
    }

    /**
     * バックアップ一覧取得
     */
    async listBackups() {
        const backupBaseDir = path.join(this.basePath, 'backups');
        if (!fs.existsSync(backupBaseDir)) {
            return [];
        }

        const backupDirs = fs.readdirSync(backupBaseDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const backupList = [];
        for (const dirName of backupDirs) {
            const backupPath = path.join(backupBaseDir, dirName);
            const statsPath = path.join(backupPath, 'learning-stats.json'); // バックアップ内の統計ファイル
            let backupInfo = {
                name: dirName,
                path: backupPath,
                createdAt: fs.statSync(backupPath).mtime.toISOString(),
                size: 0, // 後で計算
                totalConversations: 0,
                totalConcepts: 0
            };

            try {
                // バックアップ内のファイルを合計してサイズを計算
                const filesInBackup = fs.readdirSync(backupPath);
                for (const file of filesInBackup) {
                    backupInfo.size += fs.statSync(path.join(backupPath, file)).size;
                }

                // 統計ファイルから詳細情報を取得
                if (fs.existsSync(statsPath)) {
                    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
                    backupInfo.totalConversations = stats.totalConversations || 0;
                    backupInfo.totalConcepts = stats.totalConceptsLearned || 0;
                }
            } catch (error) {
                console.warn(`⚠️ バックアップ情報読み込みエラー (${dirName}):`, error.message);
            }
            backupList.push(backupInfo);
        }

        // 作成日時でソート（新しいものが先頭）
        return backupList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    /**
     * データクリーンアップ
     */
    async cleanupOldData() {
        try {
            // 古い会話履歴の削除（30日以上前）
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            this.conversationCache = this.conversationCache.filter(conv => {
                return conv.timestamp > thirtyDaysAgo;
            });
            
            await this.saveConversationHistory(this.conversationCache);
            
            // 古いバックアップの削除（7日以上前）
            const backupDir = path.join(this.basePath, 'backups');
            if (fs.existsSync(backupDir)) {
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                const backups = fs.readdirSync(backupDir);
                
                for (const backup of backups) {
                    const backupPath = path.join(backupDir, backup);
                    const stats = fs.statSync(backupPath);
                    
                    if (stats.mtime.getTime() < sevenDaysAgo) {
                        fs.rmSync(backupPath, { recursive: true });
                        console.log(`🗑️ 古いバックアップ削除: ${backup}`);
                    }
                }
            }
            
            console.log('✅ データクリーンアップ完了');
            
        } catch (error) {
            console.error('❌ データクリーンアップエラー:', error.message);
        }
    }
    
    /**
     * 学習イベントログ記録
     */
    async logLearningEvent(eventData) {
        try {
            // 現在の学習統計を取得
            let stats = this.getLearningStats();
            
            // 学習イベントをstatsに追加
            if (!stats.learningEvents) {
                stats.learningEvents = [];
            }
            
            stats.learningEvents.push({
                timestamp: Date.now(),
                type: 'learning_event',
                data: {
                    userId: eventData.userId,
                    input: eventData.input,
                    response: eventData.response,
                    sessionId: eventData.sessionId,
                    analysis: eventData.analysis
                }
            });
            
            // 学習統計更新
            stats.lastLearningDate = Date.now();
            stats.totalConversations = (stats.totalConversations || 0) + 1;
            
            // 保存
            this.saveLearningStats(stats);
            
            console.log('📚 学習イベントログ記録完了');
            
        } catch (error) {
            console.warn('⚠️ 学習イベントログ記録エラー:', error.message);
        }
    }

    /**
     * 品質予測訓練データの保存
     */
    async saveQualityTrainingData(trainingData) {
        try {
            fs.writeFileSync(this.qualityTrainingDataPath, JSON.stringify(trainingData, null, 2));
            console.log('💾 品質訓練データ保存完了');
            console.log(`[saveQualityTrainingData] Path: ${this.qualityTrainingDataPath}`);
            console.log(`[saveQualityTrainingData] Data size: ${JSON.stringify(trainingData).length} bytes`);
        } catch (error) {
            console.warn('⚠️ 品質訓練データ保存エラー:', error.message);
            throw error;
        }
    }

    /**
     * 品質予測訓練データの読み込み
     */
    async loadQualityTrainingData() {
        try {
            if (fs.existsSync(this.qualityTrainingDataPath)) {
                const data = JSON.parse(fs.readFileSync(this.qualityTrainingDataPath, 'utf8'));
                if (data && Array.isArray(data.data)) { // data.dataが配列であることを確認
                    console.log(`📊 品質訓練データ読み込み完了: ${data.data.length}件`);
                    return data;
                } else {
                    console.warn('⚠️ 品質訓練データが不正な形式です。空のデータで初期化します。');
                    return { data: [], lastUpdated: 0, dataCount: 0, modelTrained: false, accuracy: 0 };
                }
            }
            return null;
        } catch (error) {
            console.warn('⚠️ 品質訓練データ読み込みエラー:', error.message);
            return null;
        }
    }

    /**
     * システムデータ読み込み
     */
    async loadSystemData(key) {
        const filePath = path.join(this.systemDataDir, `${key}.json`);
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.warn(`⚠️ システムデータ読み込みエラー (${key}):`, error.message);
            return null;
        }
    }

    /**
     * システムデータ保存
     */
    async saveSystemData(key, data) {
        const filePath = path.join(this.systemDataDir, `${key}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`❌ システムデータ保存エラー (${key}):`, error.message);
            throw error;
        }
    }
}

// デフォルトインスタンス
export const persistentLearningDB = new PersistentLearningDB();