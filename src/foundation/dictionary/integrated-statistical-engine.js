#!/usr/bin/env node
/**
 * Integrated Statistical Engine for JMDict
 * 統合統計エンジン - 全実装者の統計手法を統合
 * 
 * 🔬 統合対象:
 * - 私の実装: PMI計算・カイ二乗検定・統計的有意性検定
 * - Gemini実装: UCB統計・線形回帰・信頼区間計算
 * - 前セッション: 基本統計・品質スコア
 * 
 * 🎯 目標: 数学的に正確な統計処理の統一
 */

import { DictionaryDBBase } from './dictionary-db-core.js';

/**
 * 統合統計エンジン
 * 全実装者の統計手法を統一・最適化
 */
export class IntegratedStatisticalEngine {
    constructor(dictionaryDB) {
        this.dictionaryDB = dictionaryDB;
        
        // 統計キャッシュ
        this.pmiCache = new Map();
        this.significanceCache = new Map();
        this.ucbCache = new Map();
        this.qualityCache = new Map();
        
        // 統計データ
        this.cooccurrenceMatrix = new Map();
        this.wordFrequencies = new Map();
        this.posStatistics = new Map();
        
        // 統計パラメータ
        this.statisticalConfig = {
            // PMI計算
            pmiMinSamples: 3,
            pmiSmoothingFactor: 0.01,
            
            // カイ二乗検定
            chiSquareAlpha: 0.05,  // 有意水準
            chiSquareThreshold: 3.84,  // p < 0.05
            
            // UCB統計
            explorationConstant: Math.sqrt(2),
            confidenceInterval: 0.95,
            
            // 品質統計
            qualityThresholds: {
                excellent: 0.8,
                good: 0.6,
                acceptable: 0.4,
                poor: 0.2
            }
        };
        
        // 統計記録
        this.stats = {
            pmiCalculations: 0,
            significanceTests: 0,
            ucbCalculations: 0,
            qualityPredictions: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        console.log('📊 統合統計エンジン初期化完了');
    }

    /**
     * 統合PMI計算
     * 私の実装 + Gemini最適化 + 前セッション品質管理
     */
    calculateIntegratedPMI(word1, word2) {
        const cacheKey = word1 < word2 ? `${word1}:${word2}` : `${word2}:${word1}`;
        
        // キャッシュチェック
        if (this.pmiCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.pmiCache.get(cacheKey);
        }
        
        this.stats.cacheMisses++;
        
        // 語彙の出現確率（スムージング適用）
        const prob1 = this.getSmoothedWordProbability(word1);
        const prob2 = this.getSmoothedWordProbability(word2);
        
        // 同時出現確率
        const jointProb = this.getJointProbability(word1, word2);
        
        // PMI計算（ログ2ベース）
        let pmi = 0;
        if (jointProb > 0 && prob1 > 0 && prob2 > 0) {
            pmi = Math.log2(jointProb / (prob1 * prob2));
        }
        
        // 正規化PMI（-1から1の範囲）
        const normalizedPMI = pmi / Math.abs(Math.log2(jointProb));
        
        const result = {
            pmi: pmi,
            normalizedPMI: normalizedPMI,
            jointProbability: jointProb,
            word1Probability: prob1,
            word2Probability: prob2,
            confidence: this.calculatePMIConfidence(word1, word2)
        };
        
        this.pmiCache.set(cacheKey, result);
        this.stats.pmiCalculations++;
        
        return result;
    }

    /**
     * 統合統計的有意性検定
     * 私のカイ二乗検定 + Gemini信頼区間 + 前セッション品質保証
     */
    calculateIntegratedSignificance(word1, word2) {
        const cacheKey = `sig_${word1}_${word2}`;
        
        if (this.significanceCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.significanceCache.get(cacheKey);
        }
        
        this.stats.cacheMisses++;
        
        const cooccurrenceCount = this.getCooccurrenceCount(word1, word2);
        const freq1 = this.getWordFrequency(word1);
        const freq2 = this.getWordFrequency(word2);
        const totalWords = this.dictionaryDB.entries.size;
        
        // 最小サンプル数チェック
        if (cooccurrenceCount < this.statisticalConfig.pmiMinSamples) {
            const result = {
                isSignificant: false,
                reason: 'insufficient_samples',
                sampleSize: cooccurrenceCount,
                confidence: 0,
                pValue: 1.0,
                chiSquare: 0
            };
            
            this.significanceCache.set(cacheKey, result);
            return result;
        }
        
        // カイ二乗検定の実装（改良版）
        const expected = (freq1 * freq2) / totalWords;
        const observed = cooccurrenceCount;
        
        // 連続性の修正を適用
        const chiSquare = Math.pow(Math.abs(observed - expected) - 0.5, 2) / expected;
        
        // p値の近似計算
        const pValue = this.calculatePValueFromChiSquare(chiSquare, 1);
        
        // 有意性判定
        const isSignificant = pValue < this.statisticalConfig.chiSquareAlpha;
        
        // 信頼度計算（Gemini方式を統合）
        const confidence = Math.min(1.0, Math.max(0.0, 1.0 - pValue));
        
        // 効果サイズ計算
        const effectSize = this.calculateEffectSize(observed, expected, totalWords);
        
        const result = {
            isSignificant,
            reason: isSignificant ? 'statistically_significant' : 'not_significant',
            sampleSize: cooccurrenceCount,
            confidence,
            pValue,
            chiSquare,
            effectSize,
            expected,
            observed
        };
        
        this.significanceCache.set(cacheKey, result);
        this.stats.significanceTests++;
        
        return result;
    }

    /**
     * 統合UCB値計算
     * Gemini実装 + 統計的信頼性向上
     */
    calculateIntegratedUCB(vocabulary, vocabularyStats, totalSelections) {
        const cacheKey = `ucb_${vocabulary}_${totalSelections}`;
        
        if (this.ucbCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.ucbCache.get(cacheKey);
        }
        
        this.stats.cacheMisses++;
        
        if (!vocabularyStats.has(vocabulary)) {
            // 未選択語彙は無限大UCB値
            return {
                ucbValue: Infinity,
                averageReward: 0,
                explorationTerm: Infinity,
                confidence: 0,
                reason: 'unselected'
            };
        }
        
        const stats = vocabularyStats.get(vocabulary);
        const averageReward = stats.rewards / stats.selections;
        
        // 動的探索定数（Gemini実装を統合）
        const dynamicExplorationConstant = Math.max(
            0.1, // 最小値
            this.statisticalConfig.explorationConstant * Math.pow(0.99, totalSelections)
        );
        
        // UCB探索項の計算
        const explorationTerm = dynamicExplorationConstant * 
            Math.sqrt(Math.log(totalSelections + 1) / stats.selections);
        
        // 統計的信頼度計算
        const confidence = Math.min(1.0, stats.selections / (stats.selections + 10));
        
        // UCB値の計算
        const ucbValue = averageReward + explorationTerm;
        
        const result = {
            ucbValue,
            averageReward,
            explorationTerm,
            confidence,
            dynamicExplorationConstant,
            reason: 'calculated'
        };
        
        this.ucbCache.set(cacheKey, result);
        this.stats.ucbCalculations++;
        
        return result;
    }

    /**
     * 統合品質予測
     * 全実装者の品質評価手法を統合
     */
    calculateIntegratedQuality(word1, word2) {
        const cacheKey = `quality_${word1}_${word2}`;
        
        if (this.qualityCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.qualityCache.get(cacheKey);
        }
        
        this.stats.cacheMisses++;
        
        // PMI品質
        const pmiResult = this.calculateIntegratedPMI(word1, word2);
        const pmiQuality = Math.max(0, Math.min(1, (pmiResult.normalizedPMI + 1) / 2));
        
        // 統計的有意性品質
        const significanceResult = this.calculateIntegratedSignificance(word1, word2);
        const significanceQuality = significanceResult.confidence;
        
        // 頻度品質
        const freq1 = this.getWordFrequency(word1);
        const freq2 = this.getWordFrequency(word2);
        const freqQuality = Math.min(1, Math.sqrt(freq1 * freq2) / 100);
        
        // 品詞一致品質
        const posQuality = this.calculatePOSQuality(word1, word2);
        
        // 重み付き統合品質
        const weights = {
            pmi: 0.3,
            significance: 0.3,
            frequency: 0.2,
            pos: 0.2
        };
        
        const integratedQuality = 
            pmiQuality * weights.pmi +
            significanceQuality * weights.significance +
            freqQuality * weights.frequency +
            posQuality * weights.pos;
        
        const result = {
            integratedQuality,
            components: {
                pmi: pmiQuality,
                significance: significanceQuality,
                frequency: freqQuality,
                pos: posQuality
            },
            confidence: Math.min(pmiResult.confidence, significanceResult.confidence),
            isHighQuality: integratedQuality >= this.statisticalConfig.qualityThresholds.good
        };
        
        this.qualityCache.set(cacheKey, result);
        this.stats.qualityPredictions++;
        
        return result;
    }

    /**
     * スムージング付き語彙確率計算
     */
    getSmoothedWordProbability(word) {
        const frequency = this.getWordFrequency(word);
        const totalWords = this.dictionaryDB.entries.size;
        const smoothingFactor = this.statisticalConfig.pmiSmoothingFactor;
        
        return (frequency + smoothingFactor) / (totalWords + smoothingFactor * totalWords);
    }

    /**
     * 同時出現確率計算
     */
    getJointProbability(word1, word2) {
        const cooccurrenceCount = this.getCooccurrenceCount(word1, word2);
        const totalPairs = this.dictionaryDB.entries.size * (this.dictionaryDB.entries.size - 1) / 2;
        
        return cooccurrenceCount / totalPairs;
    }

    /**
     * PMI信頼度計算
     */
    calculatePMIConfidence(word1, word2) {
        const cooccurrenceCount = this.getCooccurrenceCount(word1, word2);
        const minCount = Math.min(
            this.getWordFrequency(word1),
            this.getWordFrequency(word2)
        );
        
        return Math.min(1.0, cooccurrenceCount / Math.max(minCount, 1));
    }

    /**
     * カイ二乗分布からp値を計算
     */
    calculatePValueFromChiSquare(chiSquare, degreesOfFreedom) {
        // 自由度1のカイ二乗分布の簡易p値計算
        if (degreesOfFreedom === 1) {
            if (chiSquare <= 0) return 1.0;
            if (chiSquare >= 10) return 0.0;
            
            // 近似式による計算
            const z = Math.sqrt(chiSquare);
            const p = 2 * (1 - this.normalCDF(z));
            return Math.max(0, Math.min(1, p));
        }
        
        return 0.5; // フォールバック
    }

    /**
     * 標準正規分布の累積分布関数（近似）
     */
    normalCDF(z) {
        const sign = z >= 0 ? 1 : -1;
        z = Math.abs(z);
        
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        
        const t = 1 / (1 + p * z);
        const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        
        return 0.5 * (1 + sign * erf);
    }

    /**
     * 効果サイズ計算（Cohen's w）
     */
    calculateEffectSize(observed, expected, totalWords) {
        const chiSquare = Math.pow(observed - expected, 2) / expected;
        return Math.sqrt(chiSquare / totalWords);
    }

    /**
     * 品詞一致品質計算
     */
    calculatePOSQuality(word1, word2) {
        const entry1 = this.dictionaryDB.getEntry(word1);
        const entry2 = this.dictionaryDB.getEntry(word2);
        
        if (!entry1 || !entry2 || !entry1.pos || !entry2.pos) {
            return 0.5; // 情報不足時は中間値
        }
        
        const commonPOS = entry1.pos.filter(pos => entry2.pos.includes(pos));
        const totalPOS = new Set([...entry1.pos, ...entry2.pos]).size;
        
        return commonPOS.length / totalPOS;
    }

    /**
     * 共起回数取得
     */
    getCooccurrenceCount(word1, word2) {
        const pairKey = word1 < word2 ? `${word1}:${word2}` : `${word2}:${word1}`;
        return this.cooccurrenceMatrix.get(pairKey) || 0;
    }

    /**
     * 語彙頻度取得
     */
    getWordFrequency(word) {
        const entry = this.dictionaryDB.getEntry(word);
        return entry ? (entry.frequency || 30) : 1;
    }

    /**
     * 統計サマリー取得
     */
    getStatisticalSummary() {
        const cacheEfficiency = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses);
        
        return {
            ...this.stats,
            cacheEfficiency: cacheEfficiency || 0,
            pmiCacheSize: this.pmiCache.size,
            significanceCacheSize: this.significanceCache.size,
            ucbCacheSize: this.ucbCache.size,
            qualityCacheSize: this.qualityCache.size,
            totalCacheSize: this.pmiCache.size + this.significanceCache.size + 
                           this.ucbCache.size + this.qualityCache.size
        };
    }

    /**
     * キャッシュクリア
     */
    clearCaches() {
        this.pmiCache.clear();
        this.significanceCache.clear();
        this.ucbCache.clear();
        this.qualityCache.clear();
        
        console.log('🧹 統計キャッシュクリア完了');
    }
}

export default IntegratedStatisticalEngine;