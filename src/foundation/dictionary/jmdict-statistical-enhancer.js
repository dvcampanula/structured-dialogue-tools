#!/usr/bin/env node
/**
 * JMDict Statistical Enhancement System
 * Phase 0 Foundation Implementation: JMDict辞書の統計的活用
 * 
 * 🎯 目標: 21万語辞書の統計ポテンシャルを完全活用
 * 📊 機能: 品詞情報・同義語・定義文の統計処理
 * 🔬 技術: PMI計算・統計的有意性検定・品質管理
 */

import { DictionaryDB } from './dictionary-db.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * JMDict統計強化エンジン
 * 21万語辞書の統計学習基盤システム
 */
export class JMDictStatisticalEnhancer {
    constructor(dictionaryDB) {
        this.dictionaryDB = dictionaryDB;
        this.statisticalCache = new Map();
        this.pmiCache = new Map();
        this.cooccurrenceMatrix = new Map();
        this.posStatistics = new Map();
        this.synonymNetworks = new Map();
        
        this.stats = {
            totalEnhancedEntries: 0,
            pmiCalculations: 0,
            statisticalValidations: 0,
            qualityScores: 0,
            lastUpdated: null
        };
        
        console.log('📊 JMDict統計強化エンジン初期化');
    }

    /**
     * 初期化 - 辞書データの統計的分析開始
     */
    async initialize() {
        console.log('🚀 JMDict統計強化システム初期化開始...');
        
        // 1. 品詞統計の構築
        await this.buildPOSStatistics();
        
        // 2. 共起行列の構築
        await this.buildCooccurrenceMatrix();
        
        // 3. 同義語ネットワークの構築
        await this.buildSynonymNetworks();
        
        // 4. 基本統計の計算
        await this.calculateBasicStatistics();
        
        this.stats.lastUpdated = Date.now();
        console.log('✅ JMDict統計強化システム初期化完了');
        
        return this.getInitializationReport();
    }

    /**
     * 品詞統計の構築
     * "pos": "unknown" 問題を解決
     */
    async buildPOSStatistics() {
        console.log('📝 品詞統計構築開始...');
        
        const posFrequency = new Map();
        const posCooccurrence = new Map();
        let unknownPOSCount = 0;
        let enhancedPOSCount = 0;
        
        for (const [word, entry] of this.dictionaryDB.entries) {
            // 品詞情報の統計
            if (entry.pos && entry.pos.length > 0) {
                for (const pos of entry.pos) {
                    if (pos === 'unknown') {
                        unknownPOSCount++;
                        continue;
                    }
                    
                    posFrequency.set(pos, (posFrequency.get(pos) || 0) + 1);
                    
                    // 品詞共起の計算
                    for (const otherPOS of entry.pos) {
                        if (pos !== otherPOS) {
                            const pair = `${pos}:${otherPOS}`;
                            posCooccurrence.set(pair, (posCooccurrence.get(pair) || 0) + 1);
                        }
                    }
                    
                    enhancedPOSCount++;
                }
            } else {
                unknownPOSCount++;
            }
        }
        
        this.posStatistics = {
            frequency: posFrequency,
            cooccurrence: posCooccurrence,
            unknownCount: unknownPOSCount,
            enhancedCount: enhancedPOSCount,
            totalEntries: this.dictionaryDB.entries.size
        };
        
        console.log(`📊 品詞統計完了: ${enhancedPOSCount}強化, ${unknownPOSCount}未知`);
        console.log(`📈 品詞カテゴリ数: ${posFrequency.size}`);
        
        // 上位品詞の表示
        const topPOS = Array.from(posFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        console.log('🔝 上位品詞:');
        topPOS.forEach(([pos, count]) => {
            console.log(`  ${pos}: ${count}語`);
        });
        
        return this.posStatistics;
    }

    /**
     * 共起行列の構築
     * 語彙間の統計的関係を計算
     */
    async buildCooccurrenceMatrix() {
        console.log('🔗 共起行列構築開始...');
        
        const cooccurrenceData = new Map();
        const wordFrequency = new Map();
        let totalPairs = 0;
        
        // 語彙頻度の計算
        for (const [word, entry] of this.dictionaryDB.entries) {
            wordFrequency.set(word, entry.frequency || 30);
        }
        
        // 定義文ベース共起の計算
        for (const [word1, entry1] of this.dictionaryDB.entries) {
            if (!entry1.definitions || entry1.definitions.length === 0) continue;
            
            const def1Words = this.extractDefinitionWords(entry1.definitions);
            
            for (const [word2, entry2] of this.dictionaryDB.entries) {
                if (word1 === word2 || !entry2.definitions || entry2.definitions.length === 0) continue;
                
                const def2Words = this.extractDefinitionWords(entry2.definitions);
                
                // 定義文の語彙重複度
                const overlap = this.calculateWordOverlap(def1Words, def2Words);
                
                if (overlap > 0.1) { // 10%以上の重複
                    const pairKey = word1 < word2 ? `${word1}:${word2}` : `${word2}:${word1}`;
                    cooccurrenceData.set(pairKey, overlap);
                    totalPairs++;
                }
            }
            
            // 進捗表示（1000語ごと）
            if (totalPairs % 1000 === 0 && totalPairs > 0) {
                console.log(`🔄 共起計算進捗: ${totalPairs}ペア処理済み`);
            }
            
            // メモリ効率化: 10000ペアで制限
            if (totalPairs >= 10000) {
                console.log('⚡ メモリ効率化のため共起計算を制限');
                break;
            }
        }
        
        this.cooccurrenceMatrix = cooccurrenceData;
        
        console.log(`✅ 共起行列構築完了: ${totalPairs}ペア`);
        console.log(`📊 平均共起値: ${this.calculateAverageCooccurrence()}`);
        
        return {
            totalPairs,
            averageCooccurrence: this.calculateAverageCooccurrence(),
            matrixSize: this.cooccurrenceMatrix.size
        };
    }

    /**
     * 同義語ネットワークの構築
     * JMDict同義語情報の統計的拡張
     */
    async buildSynonymNetworks() {
        console.log('🕸️ 同義語ネットワーク構築開始...');
        
        const synonymNetworks = new Map();
        let networkNodes = 0;
        let networkEdges = 0;
        
        for (const [word, entry] of this.dictionaryDB.entries) {
            if (!entry.synonyms || entry.synonyms.length === 0) continue;
            
            // 基本同義語ネットワーク
            const network = new Set(entry.synonyms);
            
            // 統計的同義語拡張
            for (const synonym of entry.synonyms) {
                const synonymEntry = this.dictionaryDB.entries.get(synonym);
                if (synonymEntry && synonymEntry.synonyms) {
                    for (const extendedSynonym of synonymEntry.synonyms) {
                        if (extendedSynonym !== word) {
                            network.add(extendedSynonym);
                        }
                    }
                }
            }
            
            // 品詞ベース同義語候補
            if (entry.pos && entry.pos.length > 0) {
                const posCandidates = this.findPOSBasedCandidates(word, entry.pos[0]);
                for (const candidate of posCandidates.slice(0, 3)) { // 上位3候補
                    if (this.calculateSemanticSimilarity(word, candidate) > 0.6) {
                        network.add(candidate);
                    }
                }
            }
            
            if (network.size > 0) {
                synonymNetworks.set(word, network);
                networkNodes++;
                networkEdges += network.size;
            }
        }
        
        this.synonymNetworks = synonymNetworks;
        
        console.log(`✅ 同義語ネットワーク構築完了: ${networkNodes}ノード, ${networkEdges}エッジ`);
        console.log(`📊 平均同義語数: ${(networkEdges / Math.max(networkNodes, 1)).toFixed(2)}`);
        
        return {
            networkNodes,
            networkEdges,
            averageSynonyms: networkEdges / Math.max(networkNodes, 1)
        };
    }

    /**
     * PMI (Point-wise Mutual Information) 計算
     * 統計的関連性の測定
     */
    calculatePMI(word1, word2) {
        const cacheKey = word1 < word2 ? `${word1}:${word2}` : `${word2}:${word1}`;
        
        if (this.pmiCache.has(cacheKey)) {
            return this.pmiCache.get(cacheKey);
        }
        
        // 語彙の出現確率
        const prob1 = this.getWordProbability(word1);
        const prob2 = this.getWordProbability(word2);
        
        // 同時出現確率
        const jointProb = this.getJointProbability(word1, word2);
        
        // PMI計算
        let pmi = 0;
        if (jointProb > 0 && prob1 > 0 && prob2 > 0) {
            pmi = Math.log2(jointProb / (prob1 * prob2));
        }
        
        this.pmiCache.set(cacheKey, pmi);
        this.stats.pmiCalculations++;
        
        return pmi;
    }

    /**
     * 統計的有意性検定
     * サンプル数による信頼性評価
     */
    calculateStatisticalSignificance(word1, word2) {
        const cooccurrenceCount = this.getCooccurrenceCount(word1, word2);
        const freq1 = this.getWordFrequency(word1);
        const freq2 = this.getWordFrequency(word2);
        
        // 最小サンプル数チェック
        const minSampleSize = 3;
        if (cooccurrenceCount < minSampleSize) {
            return {
                isSignificant: false,
                reason: 'insufficient_samples',
                sampleSize: cooccurrenceCount,
                confidence: 0
            };
        }
        
        // カイ二乗検定の簡易版
        const expected = (freq1 * freq2) / this.dictionaryDB.entries.size;
        const chiSquare = Math.pow(cooccurrenceCount - expected, 2) / expected;
        
        // 有意性判定 (p < 0.05 相当)
        const isSignificant = chiSquare > 3.84;
        
        // 信頼度計算
        const confidence = Math.min(chiSquare / 10, 1.0);
        
        this.stats.statisticalValidations++;
        
        return {
            isSignificant,
            reason: isSignificant ? 'statistically_significant' : 'not_significant',
            sampleSize: cooccurrenceCount,
            confidence,
            chiSquare
        };
    }

    /**
     * データ品質管理
     * 浮動小数点精度修正・データ整合性チェック
     */
    async performDataQualityManagement() {
        console.log('🔍 データ品質管理開始...');
        
        let precisionFixes = 0;
        let consistencyFixes = 0;
        let validationErrors = 0;
        
        for (const [word, entry] of this.dictionaryDB.entries) {
            // 浮動小数点精度修正
            if (entry.frequency && typeof entry.frequency === 'number') {
                const fixedFreq = Math.round(entry.frequency * 10000) / 10000;
                if (fixedFreq !== entry.frequency) {
                    entry.frequency = fixedFreq;
                    precisionFixes++;
                }
            }
            
            // データ整合性チェック
            if (entry.pos && entry.pos.includes('unknown')) {
                // JMDict情報から品詞を推定
                const estimatedPOS = this.estimatePOSFromDefinitions(entry.definitions);
                if (estimatedPOS !== 'unknown') {
                    entry.pos = entry.pos.filter(pos => pos !== 'unknown');
                    entry.pos.push(estimatedPOS);
                    consistencyFixes++;
                }
            }
            
            // 定義文の品質チェック
            if (!entry.definitions || entry.definitions.length === 0) {
                validationErrors++;
            }
        }
        
        console.log(`✅ データ品質管理完了:`);
        console.log(`  精度修正: ${precisionFixes}件`);
        console.log(`  整合性修正: ${consistencyFixes}件`);
        console.log(`  検証エラー: ${validationErrors}件`);
        
        return {
            precisionFixes,
            consistencyFixes,
            validationErrors,
            totalEntries: this.dictionaryDB.entries.size
        };
    }

    /**
     * 基本統計の計算
     */
    async calculateBasicStatistics() {
        console.log('📊 基本統計計算開始...');
        
        const stats = {
            totalEntries: this.dictionaryDB.entries.size,
            posDistribution: this.posStatistics.frequency,
            averageDefinitions: 0,
            averageSynonyms: 0,
            qualityScores: new Map()
        };
        
        let totalDefs = 0;
        let totalSyns = 0;
        
        for (const [word, entry] of this.dictionaryDB.entries) {
            // 定義数統計
            if (entry.definitions) {
                totalDefs += entry.definitions.length;
            }
            
            // 同義語数統計
            if (entry.synonyms) {
                totalSyns += entry.synonyms.length;
            }
            
            // 品質スコア計算
            const qualityScore = this.calculateEntryQualityScore(entry);
            stats.qualityScores.set(word, qualityScore);
            this.stats.qualityScores++;
        }
        
        stats.averageDefinitions = totalDefs / stats.totalEntries;
        stats.averageSynonyms = totalSyns / stats.totalEntries;
        
        console.log(`📈 基本統計完了:`);
        console.log(`  平均定義数: ${stats.averageDefinitions.toFixed(2)}`);
        console.log(`  平均同義語数: ${stats.averageSynonyms.toFixed(2)}`);
        console.log(`  品質スコア計算: ${this.stats.qualityScores}件`);
        
        return stats;
    }

    /**
     * エントリ品質スコア計算
     */
    calculateEntryQualityScore(entry) {
        let score = 0;
        
        // 定義の品質 (40点)
        if (entry.definitions && entry.definitions.length > 0) {
            score += Math.min(entry.definitions.length * 10, 40);
        }
        
        // 品詞情報の品質 (20点)
        if (entry.pos && entry.pos.length > 0 && !entry.pos.includes('unknown')) {
            score += 20;
        }
        
        // 同義語の品質 (20点)
        if (entry.synonyms && entry.synonyms.length > 0) {
            score += Math.min(entry.synonyms.length * 5, 20);
        }
        
        // 頻度情報の品質 (20点)
        if (entry.frequency && entry.frequency > 0) {
            score += 20;
        }
        
        return Math.min(score, 100);
    }

    /**
     * ヘルパーメソッド群
     */
    
    extractDefinitionWords(definitions) {
        const words = new Set();
        for (const def of definitions) {
            const tokens = def.toLowerCase().match(/\b\w+\b/g) || [];
            tokens.forEach(token => words.add(token));
        }
        return words;
    }
    
    calculateWordOverlap(words1, words2) {
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    
    calculateAverageCooccurrence() {
        if (this.cooccurrenceMatrix.size === 0) return 0;
        
        let total = 0;
        for (const value of this.cooccurrenceMatrix.values()) {
            total += value;
        }
        return total / this.cooccurrenceMatrix.size;
    }
    
    getWordProbability(word) {
        const entry = this.dictionaryDB.entries.get(word);
        if (!entry) return 0.0001; // 未知語の確率
        
        return (entry.frequency || 30) / 100; // 頻度を確率に変換
    }
    
    getJointProbability(word1, word2) {
        const pairKey = word1 < word2 ? `${word1}:${word2}` : `${word2}:${word1}`;
        const cooccurrence = this.cooccurrenceMatrix.get(pairKey);
        
        if (!cooccurrence) return 0.0001;
        
        return cooccurrence / 10000; // 共起値を確率に変換
    }
    
    getCooccurrenceCount(word1, word2) {
        const pairKey = word1 < word2 ? `${word1}:${word2}` : `${word2}:${word1}`;
        return this.cooccurrenceMatrix.get(pairKey) || 0;
    }
    
    getWordFrequency(word) {
        const entry = this.dictionaryDB.entries.get(word);
        return entry ? (entry.frequency || 30) : 0;
    }
    
    findPOSBasedCandidates(word, pos) {
        const candidates = [];
        const wordsWithPOS = this.dictionaryDB.getWordsByPOS(pos);
        
        for (const candidate of wordsWithPOS) {
            if (candidate !== word) {
                candidates.push(candidate);
            }
        }
        
        return candidates.slice(0, 10); // 上位10候補
    }
    
    calculateSemanticSimilarity(word1, word2) {
        const entry1 = this.dictionaryDB.entries.get(word1);
        const entry2 = this.dictionaryDB.entries.get(word2);
        
        if (!entry1 || !entry2) return 0;
        
        // 定義文の類似度
        const def1Words = this.extractDefinitionWords(entry1.definitions || []);
        const def2Words = this.extractDefinitionWords(entry2.definitions || []);
        
        return this.calculateWordOverlap(def1Words, def2Words);
    }
    
    estimatePOSFromDefinitions(definitions) {
        if (!definitions || definitions.length === 0) return 'unknown';
        
        const def = definitions[0].toLowerCase();
        
        // 簡易品詞推定
        if (def.includes('noun') || def.includes('person') || def.includes('thing')) return '名詞';
        if (def.includes('verb') || def.includes('action') || def.includes('do')) return '動詞';
        if (def.includes('adjective') || def.includes('quality') || def.includes('state')) return '形容詞';
        if (def.includes('adverb') || def.includes('manner') || def.includes('way')) return '副詞';
        
        return 'その他';
    }
    
    /**
     * 初期化レポート生成
     */
    getInitializationReport() {
        return {
            timestamp: new Date().toISOString(),
            dictionarySize: this.dictionaryDB.entries.size,
            posStatistics: {
                totalCategories: this.posStatistics.frequency.size,
                unknownPOS: this.posStatistics.unknownCount,
                enhancedPOS: this.posStatistics.enhancedCount
            },
            cooccurrenceMatrix: {
                totalPairs: this.cooccurrenceMatrix.size,
                averageCooccurrence: this.calculateAverageCooccurrence()
            },
            synonymNetworks: {
                totalNetworks: this.synonymNetworks.size,
                averageSynonyms: this.synonymNetworks.size > 0 ? 
                    Array.from(this.synonymNetworks.values()).reduce((sum, network) => sum + network.size, 0) / this.synonymNetworks.size : 0
            },
            statistics: this.stats
        };
    }
    
    /**
     * システム統計の取得
     */
    getSystemStatistics() {
        return {
            ...this.stats,
            posCategories: this.posStatistics.frequency.size,
            cooccurrencePairs: this.cooccurrenceMatrix.size,
            synonymNetworks: this.synonymNetworks.size,
            cacheEfficiency: {
                pmiCache: this.pmiCache.size,
                statisticalCache: this.statisticalCache.size
            }
        };
    }
}

export default JMDictStatisticalEnhancer;