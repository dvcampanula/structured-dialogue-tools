/**
 * A/Bテスト自動化フレームワーク
 * 
 * REDESIGNで要求される品質保証システムの実装
 * 異なるアルゴリズムの性能を統計的に比較する
 */

export class ABTestFramework {
    constructor(learningConfig = {}) {
        this.testResults = new Map(); // testId -> results
        this.runningTests = new Map(); // testId -> testConfig
        this.statisticalSignificanceThreshold = learningConfig.significanceThreshold || 0.05;
        this.minimumSampleSize = learningConfig.minSampleSize || 100;
        this.confidenceLevel = learningConfig.confidenceLevel || 0.95;
        
        console.log('🧪 A/Bテストフレームワーク初期化完了');
    }

    /**
     * A/Bテストを実行
     * @param {string} testId - テストID
     * @param {Object} algorithmA - アルゴリズムA
     * @param {Object} algorithmB - アルゴリズムB
     * @param {Array} testCases - テストケース
     * @returns {Promise<Object>} テスト結果
     */
    async runAlgorithmComparison(testId, algorithmA, algorithmB, testCases) {
        console.log(`🔬 A/Bテスト開始: ${testId}`);
        
        if (testCases.length < this.minimumSampleSize) {
            throw new Error(`サンプルサイズが不足: ${testCases.length} < ${this.minimumSampleSize}`);
        }
        
        // テストケースをランダムに分割
        const shuffledCases = this.shuffleArray([...testCases]);
        const splitPoint = Math.floor(shuffledCases.length / 2);
        const casesA = shuffledCases.slice(0, splitPoint);
        const casesB = shuffledCases.slice(splitPoint);
        
        // 並行実行でテスト
        const [resultsA, resultsB] = await Promise.all([
            this.runBatchTest(algorithmA, casesA, 'A'),
            this.runBatchTest(algorithmB, casesB, 'B')
        ]);
        
        // 統計的有意性を計算
        const significance = this.performStatisticalTest(resultsA, resultsB);
        
        const testResult = {
            testId,
            timestamp: Date.now(),
            algorithmA: {
                name: algorithmA.name || 'Algorithm A',
                metrics: resultsA.metrics,
                sampleSize: casesA.length
            },
            algorithmB: {
                name: algorithmB.name || 'Algorithm B', 
                metrics: resultsB.metrics,
                sampleSize: casesB.length
            },
            statisticalSignificance: significance,
            recommendation: this.generateRecommendation(significance),
            confidenceInterval: significance.confidenceInterval,
            isSignificant: significance.pValue < this.statisticalSignificanceThreshold
        };
        
        this.testResults.set(testId, testResult);
        console.log(`✅ A/Bテスト完了: ${testId}`);
        
        return testResult;
    }

    /**
     * バッチテスト実行
     * @param {Object} algorithm - アルゴリズム
     * @param {Array} testCases - テストケース
     * @param {string} group - グループ名
     * @returns {Promise<Object>} テスト結果
     */
    async runBatchTest(algorithm, testCases, group) {
        const startTime = Date.now();
        const results = [];
        const errors = [];
        
        for (const testCase of testCases) {
            try {
                const result = await this.runSingleTest(algorithm, testCase);
                results.push(result);
            } catch (error) {
                errors.push({ testCase, error: error.message });
            }
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const metrics = this.calculateMetrics(results, totalTime);
        
        return {
            group,
            metrics,
            totalTime,
            errorCount: errors.length,
            errors: errors.slice(0, 5), // 最初の5つのエラーのみ記録
            sampleSize: results.length
        };
    }

    /**
     * 単一テスト実行
     * @param {Object} algorithm - アルゴリズム
     * @param {Object} testCase - テストケース
     * @returns {Promise<Object>} テスト結果
     */
    async runSingleTest(algorithm, testCase) {
        const startTime = Date.now();
        
        let result;
        if (typeof algorithm.execute === 'function') {
            result = await algorithm.execute(testCase.input);
        } else if (typeof algorithm === 'function') {
            result = await algorithm(testCase.input);
        } else {
            throw new Error('アルゴリズムに実行可能なメソッドが見つかりません');
        }
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        // 品質評価
        const quality = this.evaluateQuality(result, testCase.expected);
        
        return {
            input: testCase.input,
            output: result,
            expected: testCase.expected,
            quality,
            processingTime,
            success: quality > 0.5 // 成功判定閾値
        };
    }

    /**
     * 品質評価
     * @param {any} result - 実際の結果
     * @param {any} expected - 期待される結果
     * @returns {number} 品質スコア (0-1)
     */
    evaluateQuality(result, expected) {
        if (!result || !expected) return 0;
        
        // 文字列比較の場合
        if (typeof result === 'string' && typeof expected === 'string') {
            return this.calculateTextSimilarity(result, expected);
        }
        
        // 数値比較の場合
        if (typeof result === 'number' && typeof expected === 'number') {
            const diff = Math.abs(result - expected);
            const maxValue = Math.max(Math.abs(result), Math.abs(expected));
            return maxValue === 0 ? 1 : Math.max(0, 1 - diff / maxValue);
        }
        
        // デフォルト: 完全一致
        return result === expected ? 1 : 0;
    }

    /**
     * テキスト類似度計算
     * @param {string} text1 - テキスト1
     * @param {string} text2 - テキスト2
     * @returns {number} 類似度 (0-1)
     */
    calculateTextSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        const intersection = new Set([...set1].filter(w => set2.has(w)));
        const union = new Set([...set1, ...set2]);
        
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    /**
     * メトリクス計算
     * @param {Array} results - テスト結果
     * @param {number} totalTime - 総処理時間
     * @returns {Object} メトリクス
     */
    calculateMetrics(results, totalTime) {
        if (results.length === 0) {
            return {
                successRate: 0,
                averageQuality: 0,
                averageProcessingTime: 0,
                throughput: 0,
                standardDeviation: 0
            };
        }
        
        const successCount = results.filter(r => r.success).length;
        const successRate = successCount / results.length;
        
        const qualityScores = results.map(r => r.quality);
        const averageQuality = qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;
        
        const processingTimes = results.map(r => r.processingTime);
        const averageProcessingTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length;
        
        const throughput = results.length / (totalTime / 1000); // requests per second
        
        // 標準偏差計算
        const variance = qualityScores.reduce((sum, q) => sum + Math.pow(q - averageQuality, 2), 0) / qualityScores.length;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            successRate: Math.round(successRate * 10000) / 10000,
            averageQuality: Math.round(averageQuality * 10000) / 10000,
            averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
            throughput: Math.round(throughput * 100) / 100,
            standardDeviation: Math.round(standardDeviation * 10000) / 10000
        };
    }

    /**
     * 統計的有意性検定
     * @param {Object} resultsA - グループAの結果
     * @param {Object} resultsB - グループBの結果
     * @returns {Object} 統計的有意性結果
     */
    performStatisticalTest(resultsA, resultsB) {
        const meanA = resultsA.metrics.averageQuality;
        const meanB = resultsB.metrics.averageQuality;
        const stdA = resultsA.metrics.standardDeviation;
        const stdB = resultsB.metrics.standardDeviation;
        const nA = resultsA.sampleSize;
        const nB = resultsB.sampleSize;
        
        // Welchのt検定
        const pooledStd = Math.sqrt((stdA * stdA) / nA + (stdB * stdB) / nB);
        const tStatistic = (meanA - meanB) / pooledStd;
        
        // 自由度計算（Welch-Satterthwaite equation）
        const degreesOfFreedom = Math.pow(pooledStd, 4) / 
            (Math.pow(stdA * stdA / nA, 2) / (nA - 1) + Math.pow(stdB * stdB / nB, 2) / (nB - 1));
        
        // p値の近似計算（簡易版）
        const pValue = this.approximatePValue(Math.abs(tStatistic), degreesOfFreedom);
        
        // 信頼区間計算
        const marginOfError = 1.96 * pooledStd; // 95%信頼区間
        const confidenceInterval = {
            lower: (meanA - meanB) - marginOfError,
            upper: (meanA - meanB) + marginOfError
        };
        
        return {
            tStatistic: Math.round(tStatistic * 10000) / 10000,
            degreesOfFreedom: Math.round(degreesOfFreedom * 100) / 100,
            pValue: Math.round(pValue * 10000) / 10000,
            confidenceInterval: {
                lower: Math.round(confidenceInterval.lower * 10000) / 10000,
                upper: Math.round(confidenceInterval.upper * 10000) / 10000
            },
            effectSize: Math.round(Math.abs(meanA - meanB) * 10000) / 10000
        };
    }

    /**
     * p値の近似計算
     * @param {number} tStat - t統計量
     * @param {number} df - 自由度
     * @returns {number} p値
     */
    approximatePValue(tStat, df) {
        // 簡易近似式（正確なt分布計算の代替）
        if (df > 30) {
            // 正規分布近似
            return 2 * (1 - this.standardNormalCDF(tStat));
        } else {
            // 簡易t分布近似
            const factor = 1 + (tStat * tStat) / df;
            return 2 * Math.pow(factor, -df / 2);
        }
    }

    /**
     * 標準正規分布の累積分布関数（近似）
     * @param {number} x - 値
     * @returns {number} 累積確率
     */
    standardNormalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    /**
     * 誤差関数の近似
     * @param {number} x - 値
     * @returns {number} 誤差関数値
     */
    erf(x) {
        // Abramowitz and Stegun近似
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        
        const t = 1 / (1 + p * x);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    }

    /**
     * 推奨事項生成
     * @param {Object} significance - 統計的有意性結果
     * @returns {string} 推奨事項
     */
    generateRecommendation(significance) {
        if (significance.pValue < this.statisticalSignificanceThreshold) {
            if (significance.effectSize > 0.1) {
                return significance.tStatistic > 0 ? 
                    'アルゴリズムAを推奨（統計的に有意な改善）' : 
                    'アルゴリズムBを推奨（統計的に有意な改善）';
            } else {
                return '統計的に有意だが効果量が小さいため、実用的な差はない';
            }
        } else {
            return '統計的に有意な差は検出されなかった';
        }
    }

    /**
     * 配列をシャッフル
     * @param {Array} array - 配列
     * @returns {Array} シャッフルされた配列
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * テスト結果取得
     * @param {string} testId - テストID
     * @returns {Object} テスト結果
     */
    getTestResult(testId) {
        return this.testResults.get(testId);
    }

    /**
     * 全テスト結果取得
     * @returns {Array} 全テスト結果
     */
    getAllTestResults() {
        return Array.from(this.testResults.values());
    }

    /**
     * テスト結果サマリー生成
     * @returns {Object} サマリー
     */
    generateSummary() {
        const results = this.getAllTestResults();
        const significantTests = results.filter(r => r.isSignificant);
        
        return {
            totalTests: results.length,
            significantTests: significantTests.length,
            significanceRate: results.length > 0 ? significantTests.length / results.length : 0,
            averageEffectSize: results.length > 0 ? 
                results.reduce((sum, r) => sum + r.statisticalSignificance.effectSize, 0) / results.length : 0,
            lastUpdated: Date.now()
        };
    }
}

export default ABTestFramework;