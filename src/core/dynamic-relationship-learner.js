#!/usr/bin/env node
/**
 * DynamicRelationshipLearner - 動的関係性学習システム
 * 
 * 🧠 会話から概念関係を動的学習
 * 📊 共起キーワード分析・文脈関係性計算
 * 💾 ユーザー固有関係性の蓄積・永続化
 */

import fs from 'fs';
import path from 'path';
import { configLoader } from './config-loader.js';

export class DynamicRelationshipLearner {
    constructor(userId = 'default') {
        this.userId = userId;
        this.userRelations = {};
        this.coOccurrenceData = {};
        this.contextStrengths = {};
        
        // 学習パラメータ
        this.learningConfig = {
            minCoOccurrence: 2,        // 最小共起回数
            strengthThreshold: 0.3,    // 関係性強度閾値
            maxRelationsPerTerm: 10,   // 1語あたり最大関係数
            decayFactor: 0.95,         // 忘却係数
            learningRate: 0.1          // 学習率
        };
        
        this.initializeLearner();
    }

    async initializeLearner() {
        try {
            // 既存の学習データ読み込み
            this.userRelations = await configLoader.loadUserRelations(this.userId);
            
            // 学習設定読み込み
            const config = await configLoader.loadConfig('learningConfig');
            if (config) {
                this.learningConfig = { ...this.learningConfig, ...config };
            }
            
            console.log(`✅ DynamicRelationshipLearner初期化完了 (ユーザー: ${this.userId})`);
            console.log(`📊 既存関係数: ${Object.keys(this.userRelations).length}件`);
            
        } catch (error) {
            console.warn('⚠️ 学習データ読み込み失敗、新規作成:', error.message);
            this.userRelations = {};
        }
    }

    /**
     * 会話から概念関係を学習
     */
    async learnFromConversation(input, history, response) {
        try {
            // 全テキストからキーワード抽出
            const inputKeywords = this.extractKeywords(input);
            const responseKeywords = this.extractKeywords(response);
            
            // 履歴キーワード
            const historyKeywords = [];
            for (const turn of history) {
                const turnText = turn.content || turn.message || turn;
                historyKeywords.push(...this.extractKeywords(turnText));
            }
            
            // 共起分析
            await this.analyzeCoOccurrence(inputKeywords, responseKeywords);
            await this.analyzeCoOccurrence(inputKeywords, historyKeywords);
            
            // 文脈関係性分析
            await this.analyzeContextualRelationships(input, history, response);
            
            // 学習データ更新
            await this.updateRelationships();
            
            console.log(`📚 学習完了: ${inputKeywords.length}+${responseKeywords.length}キーワード分析`);
            
        } catch (error) {
            console.error('❌ 学習エラー:', error.message);
        }
    }

    /**
     * 共起キーワード分析
     */
    async analyzeCoOccurrence(keywords1, keywords2) {
        for (const kw1 of keywords1) {
            for (const kw2 of keywords2) {
                if (kw1 !== kw2) {
                    const pairKey = this.createPairKey(kw1, kw2);
                    
                    // 共起回数増加
                    if (!this.coOccurrenceData[pairKey]) {
                        this.coOccurrenceData[pairKey] = {
                            term1: kw1,
                            term2: kw2,
                            count: 0,
                            strength: 0,
                            contexts: []
                        };
                    }
                    
                    this.coOccurrenceData[pairKey].count++;
                }
            }
        }
    }

    /**
     * 文脈関係性分析
     */
    async analyzeContextualRelationships(input, history, response) {
        // 入力→応答の関係性
        const inputKeywords = this.extractKeywords(input);
        const responseKeywords = this.extractKeywords(response);
        
        for (const inputKw of inputKeywords) {
            for (const responseKw of responseKeywords) {
                if (inputKw !== responseKw) {
                    const relationKey = `${inputKw}->${responseKw}`;
                    
                    // 文脈強度計算
                    const strength = this.calculateContextualStrength(
                        inputKw, responseKw, input, response
                    );
                    
                    if (!this.contextStrengths[relationKey]) {
                        this.contextStrengths[relationKey] = [];
                    }
                    
                    this.contextStrengths[relationKey].push({
                        strength: strength,
                        context: { input: input.substring(0, 50), response: response.substring(0, 50) },
                        timestamp: Date.now()
                    });
                }
            }
        }
    }

    /**
     * 文脈強度計算
     */
    calculateContextualStrength(term1, term2, text1, text2) {
        // 距離ベース強度
        const pos1 = text1.toLowerCase().indexOf(term1);
        const pos2 = text2.toLowerCase().indexOf(term2);
        
        if (pos1 === -1 || pos2 === -1) return 0;
        
        // 基本強度
        let strength = 0.5;
        
        // 同一文内での強度向上
        if (text1.includes(term2) || text2.includes(term1)) {
            strength += 0.3;
        }
        
        // 技術用語ペアの強度向上
        if (this.isTechnicalTerm(term1) && this.isTechnicalTerm(term2)) {
            strength += 0.2;
        }
        
        return Math.min(strength, 1.0);
    }

    /**
     * 関係性データ更新
     */
    async updateRelationships() {
        // 共起データから関係性抽出
        for (const [pairKey, data] of Object.entries(this.coOccurrenceData)) {
            if (data.count >= this.learningConfig.minCoOccurrence) {
                // 関係性強度計算
                const strength = this.calculateRelationshipStrength(data);
                
                if (strength >= this.learningConfig.strengthThreshold) {
                    this.addUserRelation(data.term1, data.term2, strength);
                }
            }
        }
        
        // 文脈強度データから関係性抽出
        for (const [relationKey, strengthData] of Object.entries(this.contextStrengths)) {
            const avgStrength = strengthData.reduce((sum, s) => sum + s.strength, 0) / strengthData.length;
            
            if (avgStrength >= this.learningConfig.strengthThreshold) {
                const [term1, term2] = relationKey.split('->');
                this.addUserRelation(term1, term2, avgStrength);
            }
        }
        
        // 老朽化処理（忘却）
        this.applyDecay();
    }

    /**
     * ユーザー関係性追加
     */
    addUserRelation(term1, term2, strength) {
        if (!this.userRelations[term1]) {
            this.userRelations[term1] = [];
        }
        
        // 既存関係の更新
        const existing = this.userRelations[term1].find(r => r.term === term2);
        if (existing) {
            // 指数移動平均で更新
            existing.strength = existing.strength * (1 - this.learningConfig.learningRate) + 
                               strength * this.learningConfig.learningRate;
            existing.lastUpdated = Date.now();
        } else {
            // 新規関係追加
            this.userRelations[term1].push({
                term: term2,
                strength: strength,
                count: 1,
                firstSeen: Date.now(),
                lastUpdated: Date.now()
            });
        }
        
        // 関係数制限
        if (this.userRelations[term1].length > this.learningConfig.maxRelationsPerTerm) {
            this.userRelations[term1].sort((a, b) => b.strength - a.strength);
            this.userRelations[term1] = this.userRelations[term1].slice(0, this.learningConfig.maxRelationsPerTerm);
        }
    }

    /**
     * 忘却処理
     */
    applyDecay() {
        for (const [term, relations] of Object.entries(this.userRelations)) {
            for (const relation of relations) {
                // 時間経過による強度減衰
                const age = Date.now() - relation.lastUpdated;
                const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
                
                if (daysSinceUpdate > 1) {
                    relation.strength *= Math.pow(this.learningConfig.decayFactor, daysSinceUpdate);
                }
            }
            
            // 弱い関係性を削除
            this.userRelations[term] = relations.filter(r => r.strength > 0.1);
            
            // 空の配列を削除
            if (this.userRelations[term].length === 0) {
                delete this.userRelations[term];
            }
        }
    }

    /**
     * 学習済み関係性取得
     */
    getUserRelations(term) {
        const relations = this.userRelations[term] || [];
        return relations
            .filter(r => r.strength > this.learningConfig.strengthThreshold)
            .map(r => r.term);
    }

    /**
     * 関係性強度取得
     */
    getRelationshipStrength(term1, term2) {
        const relations = this.userRelations[term1] || [];
        const relation = relations.find(r => r.term === term2);
        return relation ? relation.strength : 0;
    }

    /**
     * 学習データ保存
     */
    async saveUserData() {
        try {
            await configLoader.saveUserRelations(this.userId, {
                userRelations: this.userRelations,
                coOccurrenceData: this.coOccurrenceData,
                learningConfig: this.learningConfig,
                lastSaved: Date.now()
            });
            
            console.log(`💾 学習データ保存完了: ${Object.keys(this.userRelations).length}語の関係性`);
            
        } catch (error) {
            console.error('❌ 学習データ保存エラー:', error.message);
        }
    }

    /**
     * 学習統計取得
     */
    getLearningStats() {
        const totalTerms = Object.keys(this.userRelations).length;
        const totalRelations = Object.values(this.userRelations)
            .reduce((sum, relations) => sum + relations.length, 0);
        
        const avgStrength = Object.values(this.userRelations)
            .flat()
            .reduce((sum, r) => sum + r.strength, 0) / Math.max(totalRelations, 1);
        
        return {
            totalTerms,
            totalRelations,
            averageStrength: avgStrength,
            coOccurrencePairs: Object.keys(this.coOccurrenceData).length
        };
    }

    // ヘルパーメソッド
    extractKeywords(text) {
        if (!text || typeof text !== 'string') return [];
        
        const cleanText = text.toLowerCase();
        const keywords = [];
        
        // 技術用語抽出
        keywords.push(...cleanText.match(/(?:プログラミング|開発|学習|実装|react|javascript|ai|機械学習)/g) || []);
        
        // 漢字キーワード
        keywords.push(...cleanText.match(/[一-龯]{2,}/g) || []);
        
        // 重複除去・フィルタ
        return [...new Set(keywords)]
            .filter(word => word.length >= 2)
            .filter(word => !['です', 'ます', 'について'].includes(word))
            .slice(0, 10);
    }

    createPairKey(term1, term2) {
        return term1 < term2 ? `${term1}|${term2}` : `${term2}|${term1}`;
    }

    calculateRelationshipStrength(data) {
        // 共起回数ベース強度
        const countStrength = Math.min(data.count / 10, 1.0);
        
        // 文脈多様性
        const contextDiversity = Math.min(data.contexts.length / 3, 1.0);
        
        return (countStrength * 0.7 + contextDiversity * 0.3);
    }

    isTechnicalTerm(term) {
        const technicalTerms = ['プログラミング', '開発', '実装', 'react', 'javascript', 'ai', '機械学習'];
        return technicalTerms.includes(term.toLowerCase());
    }
}

// デフォルトインスタンス
export const dynamicLearner = new DynamicRelationshipLearner();