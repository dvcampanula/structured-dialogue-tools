#!/usr/bin/env node
/**
 * ConfigLoader - 設定・データファイルローダー
 * 
 * 🔧 外部設定ファイルの読み込み・管理
 * 📊 semantic-relationships.json, evaluation-thresholds.json等の統一管理
 */

import fs from 'fs';
import path from 'path';

export class ConfigLoader {
    constructor() {
        this.cache = new Map();
        this.dataDir = path.join(process.cwd(), 'src', 'data');
        this.configDir = path.join(process.cwd(), 'src', 'config');
        
        // デフォルト設定パス
        this.configPaths = {
            semanticRelationships: path.join(this.dataDir, 'semantic-relationships.json'),
            evaluationThresholds: path.join(this.configDir, 'evaluation-thresholds.json'),
            systemConfig: path.join(this.configDir, 'system-config.json'),
            learningConfig: path.join(this.configDir, 'learning-config.json'),
            technicalPatterns: path.join(this.configDir, 'technical-patterns.json'),
            responseTemplates: path.join(this.configDir, 'response-templates.json')
        };
    }

    /**
     * 設定ファイル読み込み（キャッシュ付き）
     */
    async loadConfig(configName) {
        if (this.cache.has(configName)) {
            return this.cache.get(configName);
        }

        const configPath = this.configPaths[configName];
        if (!configPath) {
            throw new Error(`Unknown config: ${configName}`);
        }

        if (!fs.existsSync(configPath)) {
            console.warn(`⚠️ Config file not found: ${configPath}`);
            return null;
        }

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);
            
            this.cache.set(configName, config);
            console.log(`✅ Config loaded: ${configName}`);
            
            return config;
        } catch (error) {
            console.error(`❌ Error loading config ${configName}:`, error.message);
            throw error;
        }
    }

    /**
     * 意味関係性データ取得
     */
    async getSemanticRelationships() {
        const config = await this.loadConfig('semanticRelationships');
        return config?.techRelations || {};
    }

    /**
     * フラット化された関係性マップ取得（後方互換性）
     */
    async getFlatTechRelations() {
        const relationships = await this.getSemanticRelationships();
        const flatRelations = {};

        // カテゴリごとの関係性をフラット化
        for (const category of Object.values(relationships)) {
            for (const [key, relations] of Object.entries(category)) {
                flatRelations[key] = relations;
            }
        }

        return flatRelations;
    }

    /**
     * 意図パターン取得
     */
    async getIntentPatterns() {
        const config = await this.loadConfig('semanticRelationships');
        return config?.intentPatterns || {};
    }

    /**
     * 評価閾値取得
     */
    async getEvaluationThresholds() {
        const config = await this.loadConfig('evaluationThresholds');
        return config || {};
    }

    /**
     * キーワード抽出設定取得
     */
    async getKeywordExtractionConfig() {
        const config = await this.loadConfig('semanticRelationships');
        return config?.keywordExtraction || {};
    }

    /**
     * 設定リロード
     */
    async reloadConfig(configName) {
        this.cache.delete(configName);
        return await this.loadConfig(configName);
    }

    /**
     * 全設定キャッシュクリア
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Config cache cleared');
    }

    /**
     * 動的学習データ保存
     */
    async saveUserRelations(userId, relations) {
        const userDataPath = path.join(this.dataDir, `user-learned-relations-${userId}.json`);
        
        try {
            fs.writeFileSync(userDataPath, JSON.stringify(relations, null, 2));
            console.log(`💾 User relations saved: ${userId}`);
        } catch (error) {
            console.error(`❌ Error saving user relations:`, error.message);
            throw error;
        }
    }

    /**
     * 動的学習データ読み込み
     */
    async loadUserRelations(userId) {
        const userDataPath = path.join(this.dataDir, `user-learned-relations-${userId}.json`);
        
        if (!fs.existsSync(userDataPath)) {
            return {};
        }

        try {
            const content = fs.readFileSync(userDataPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`❌ Error loading user relations:`, error.message);
            return {};
        }
    }

    /**
     * 設定ファイル存在確認
     */
    validateConfigFiles() {
        const results = {};
        
        for (const [name, path] of Object.entries(this.configPaths)) {
            results[name] = {
                path: path,
                exists: fs.existsSync(path)
            };
        }

        return results;
    }
}

// シングルトンインスタンス
export const configLoader = new ConfigLoader();