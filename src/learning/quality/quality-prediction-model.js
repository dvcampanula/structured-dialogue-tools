/**
 * QualityPredictionModel - 線形回帰による品質予測AI
 * 
 * REDESIGN仕様書121-147行準拠: 統計的機械学習による品質予測・改善提案
 * ConceptQualityManagerの特徴量計算を活用し、真のデータ駆動型品質予測を実現
 */

// 真の線形回帰実装（最小二乗法）
import { ConceptQualityManager } from '../../analyzers/concept-quality-manager.js';
import { persistentLearningDB as defaultPersistentLearningDB } from '../../data/persistent-learning-db.js';

export class QualityPredictionModel {
    constructor(persistentDB = defaultPersistentLearningDB, conceptQualityManager = new ConceptQualityManager()) {
        this.persistentLearningDB = persistentDB;
        this.conceptQualityManager = conceptQualityManager;
        
        // 線形回帰モデル
        this.regressionModel = null;
        this.regressionWeights = [];
        this.predictionAccuracy = 0;
        
        // 特徴量定義 (ConceptQualityManagerの計算要素を拡張)
        this.featureNames = [
            'lengthScore',           // 長さ評価
            'technicalScore',        // 技術用語度
            'relevanceScore',        // 関連性評価  
            'frequencyScore',        // 頻度評価
            'noiseScore',           // ノイズ度（負の特徴量）
            'structureScore',       // 構造性評価
            'contextDensity',       // 文脈密度
            'semanticCoherence',    // 意味的一貫性
            'vocabularyDiversity'   // 語彙多様性
        ];
        
        // 訓練データ蓄積
        this.trainingData = [];
        this.isModelTrained = false;
        
        // 品質閾値（初期値：ConceptQualityManager準拠）
        this.qualityThresholds = {
            excellent: 0.8,
            good: 0.6,
            acceptable: 0.4,
            poor: 0.2
        };
        
        console.log('🧬 QualityPredictionModel初期化完了');
    }

    /**
     * 線形回帰モデルの訓練
     * @param {Array} trainingData - 訓練データ [{ content, qualityScore }, ...]
     */
    async trainModel(trainingData) {
        try {
            if (!trainingData || trainingData.length < 3) {
                throw new Error('訓練データが不十分です（最低3件必要）');
            }

            console.log(`🤖 線形回帰モデル訓練開始: ${trainingData.length}件のデータ`);

            // 特徴量行列とターゲットベクトルを構築
            const features = [];
            const targets = [];

            for (const data of trainingData) {
                const featureVector = this.extractFeatures(data.content);
                if (featureVector && featureVector.length === this.featureNames.length) {
                    features.push(featureVector);
                    targets.push(data.qualityScore);
                }
            }

            if (features.length === 0) {
                throw new Error('有効な特徴量ベクトルが生成されませんでした');
            }

            console.log(`🔢 特徴量行列: ${features.length} x ${features[0].length}`);
            console.log(`🎯 ターゲット: ${targets.length}件`);

            // 真の線形回帰実装（最小二乗法による正規方程式解法）
            this.regressionWeights = this.solveLinearRegression(features, targets);
            
            // 予測関数を設定
            this.regressionModel = {
                predict: (featureMatrix) => {
                    return featureMatrix.map(featureVector => {
                        // バイアス項（weights[0]）+ 特徴量重み
                        let prediction = this.regressionWeights[0]; // バイアス項
                        for (let i = 0; i < featureVector.length; i++) {
                            prediction += this.regressionWeights[i + 1] * (featureVector[i] || 0);
                        }
                        return prediction;
                    });
                }
            };

            // 予測精度計算（R²値）
            this.predictionAccuracy = this.calculatePredictionAccuracy(features, targets);

            // 訓練データを永続化
            this.trainingData = trainingData;
            await this.saveModel();
            
            this.isModelTrained = true;
            
            console.log(`✅ 線形回帰モデル訓練完了`);
            console.log(`📊 予測精度 (R²): ${(this.predictionAccuracy * 100).toFixed(1)}%`);
            console.log(`🔢 回帰重み:`, this.regressionWeights.map((w, i) => {
                if (i === 0) return `bias: ${w.toFixed(3)}`;
                return `${this.featureNames[i-1]}: ${w.toFixed(3)}`;
            }).join(', '));

            return {
                accuracy: this.predictionAccuracy,
                weights: this.regressionWeights,
                featureNames: this.featureNames,
                trainingSize: trainingData.length
            };

        } catch (error) {
            console.error('❌ モデル訓練エラー:', error.message);
            throw error;
        }
    }

    /**
     * コンテンツの品質予測
     * @param {Object} content - 予測対象コンテンツ
     * @returns {Object} 品質スコアと信頼度
     */
    predictQuality(content) {
        try {
            if (!this.isModelTrained) {
                // モデル未訓練の場合はConceptQualityManagerのヒューリスティック使用
                console.warn('⚠️ モデル未訓練 - ヒューリスティック品質評価使用');
                return this.fallbackQualityPrediction(content);
            }

            // 特徴量抽出
            const features = this.extractFeatures(content);
            
            // 線形回帰による予測
            const predictedScore = this.regressionModel.predict([features])[0];
            const normalizedScore = Math.max(0, Math.min(1, predictedScore));

            // 信頼度計算（特徴量の分散と訓練データとの類似度基準）
            const confidence = this.calculatePredictionConfidence(features);

            // 品質グレード判定
            const grade = this.getQualityGrade(normalizedScore);

            return {
                qualityScore: parseFloat(normalizedScore.toFixed(3)),
                confidence: parseFloat(confidence.toFixed(3)),
                grade: grade,
                features: this.featureNames.reduce((obj, name, i) => {
                    obj[name] = parseFloat(features[i].toFixed(3));
                    return obj;
                }, {}),
                modelUsed: 'linear_regression',
                predictionAccuracy: this.predictionAccuracy
            };

        } catch (error) {
            console.error('❌ 品質予測エラー:', error.message);
            return this.fallbackQualityPrediction(content);
        }
    }

    /**
     * 改善提案生成
     * @param {Object} content - 分析対象コンテンツ
     * @returns {Array} 改善提案リスト
     */
    suggestImprovements(content) {
        try {
            const qualityResult = this.predictQuality(content);
            const features = qualityResult.features;
            const improvements = [];

            // 特徴量別改善提案
            if (features.lengthScore < 0.5) {
                improvements.push({
                    type: 'length_optimization',
                    priority: 'high',
                    issue: '語彙の長さが最適でない',
                    suggestion: '3-20文字の適切な長さの語彙を選択してください',
                    expectedImprovement: 0.15
                });
            }

            if (features.technicalScore < 0.3) {
                improvements.push({
                    type: 'technical_enhancement',
                    priority: 'medium', 
                    issue: '技術用語の使用が少ない',
                    suggestion: 'より具体的な技術用語を使用して専門性を向上させてください',
                    expectedImprovement: 0.12
                });
            }

            if (features.noiseScore > 0.5) {
                improvements.push({
                    type: 'noise_reduction',
                    priority: 'high',
                    issue: 'ノイズが多い（一般的すぎる語・記号等）',
                    suggestion: 'より具体的で意味のある語彙に置き換えてください',
                    expectedImprovement: 0.18
                });
            }

            if (features.structureScore < 0.4) {
                improvements.push({
                    type: 'structure_improvement',
                    priority: 'medium',
                    issue: '構造的複雑さが不足',
                    suggestion: '複合語や専門用語構造を活用してください',
                    expectedImprovement: 0.10
                });
            }

            if (features.contextDensity < 0.5) {
                improvements.push({
                    type: 'context_enhancement',
                    priority: 'medium',
                    issue: '文脈密度が低い',
                    suggestion: 'より多くの関連概念を含めて文脈を豊かにしてください',
                    expectedImprovement: 0.08
                });
            }

            // 総合的な改善提案
            if (qualityResult.qualityScore < this.qualityThresholds.acceptable) {
                improvements.push({
                    type: 'comprehensive_rewrite',
                    priority: 'critical',
                    issue: '全体的な品質が低い',
                    suggestion: '語彙選択から見直し、技術的で構造化された表現を心がけてください',
                    expectedImprovement: 0.25
                });
            }

            // 優先度・期待改善度順でソート
            improvements.sort((a, b) => {
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                return priorityDiff !== 0 ? priorityDiff : b.expectedImprovement - a.expectedImprovement;
            });

            return improvements;

        } catch (error) {
            console.error('❌ 改善提案生成エラー:', error.message);
            return [{
                type: 'error',
                priority: 'low',
                issue: '改善提案の生成に失敗',
                suggestion: '手動での品質確認を推奨',
                expectedImprovement: 0
            }];
        }
    }

    /**
     * コンテンツから特徴量ベクトルを抽出
     * ConceptQualityManagerの計算要素を活用・拡張
     */
    extractFeatures(content) {
        try {
            // コンテンツの正規化
            const text = content.text || content.term || content.name || String(content);
            const metadata = content.metadata || {};
            
            // ConceptQualityManagerベースの特徴量計算
            const concept = { name: text, ...metadata };
            
            // 基本特徴量 (ConceptQualityManager準拠)
            const lengthScore = this.conceptQualityManager.calculateLengthScore(text);
            const technicalScore = this.conceptQualityManager.calculateTechnicalScore(text);
            const relevanceScore = metadata.relevanceScore || metadata.confidence || 0.5;
            const frequencyScore = this.conceptQualityManager.calculateFrequencyScore(metadata.frequency || 1);
            const noiseScore = this.conceptQualityManager.calculateNoiseScore(text);
            const structureScore = this.conceptQualityManager.calculateStructureScore(text);

            // 拡張特徴量（統計的品質予測用）
            const contextDensity = this.calculateContextDensity(content);
            const semanticCoherence = this.calculateSemanticCoherence(content);
            const vocabularyDiversity = this.calculateVocabularyDiversity(content);

            return [
                lengthScore,
                technicalScore, 
                relevanceScore,
                frequencyScore,
                1.0 - noiseScore,  // ノイズは負の特徴量なので反転
                structureScore,
                contextDensity,
                semanticCoherence,
                vocabularyDiversity
            ];

        } catch (error) {
            console.warn('⚠️ 特徴量抽出エラー:', error.message);
            // エラー時は中性的な特徴量を返す
            return new Array(this.featureNames.length).fill(0.5);
        }
    }

    /**
     * 文脈密度計算
     */
    calculateContextDensity(content) {
        const text = content.text || String(content);
        const relatedTerms = content.relatedTerms || content.relatedConcepts || [];
        const textLength = text.length;
        
        if (textLength === 0) return 0;
        
        // 関連語数と文字数の比率
        const relatedRatio = relatedTerms.length / Math.max(textLength / 10, 1);
        return Math.min(1.0, relatedRatio);
    }

    /**
     * 意味的一貫性計算
     */
    calculateSemanticCoherence(content) {
        const text = content.text || String(content);
        const category = content.category || 'general';
        
        // カテゴリ一致度による一貫性評価
        const categoryCoherence = category !== 'general' ? 0.8 : 0.4;
        
        // 文字種の統一性（技術用語パターン）
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        const hasKatakana = /[\u30A0-\u30FF]/.test(text);
        const hasAlphabet = /[A-Za-z]/.test(text);
        
        const characterConsistency = (hasKanji && hasKatakana) || hasAlphabet ? 0.8 : 0.6;
        
        return (categoryCoherence + characterConsistency) / 2;
    }

    /**
     * 語彙多様性計算
     */
    calculateVocabularyDiversity(content) {
        const text = content.text || String(content);
        
        // 文字種多様性
        const charTypes = [];
        if (/[\u3040-\u309F]/.test(text)) charTypes.push('hiragana');
        if (/[\u30A0-\u30FF]/.test(text)) charTypes.push('katakana');
        if (/[\u4E00-\u9FAF]/.test(text)) charTypes.push('kanji');
        if (/[A-Za-z]/.test(text)) charTypes.push('alphabet');
        if (/[0-9]/.test(text)) charTypes.push('number');
        
        const diversityScore = Math.min(1.0, charTypes.length / 3);
        
        // 長さによる多様性ボーナス
        const lengthBonus = text.length > 5 ? 0.1 : 0;
        
        return Math.min(1.0, diversityScore + lengthBonus);
    }

    /**
     * 予測精度計算 (R²値)
     */
    calculatePredictionAccuracy(features, targets) {
        try {
            const predictions = features.map(feature => this.regressionModel.predict([feature])[0]);
            
            const meanTarget = targets.reduce((sum, val) => sum + val, 0) / targets.length;
            const totalSumSquares = targets.reduce((sum, val) => sum + Math.pow(val - meanTarget, 2), 0);
            const residualSumSquares = targets.reduce((sum, val, i) => 
                sum + Math.pow(val - predictions[i], 2), 0);
            
            const rSquared = 1 - (residualSumSquares / totalSumSquares);
            return Math.max(0, Math.min(1, rSquared));
            
        } catch (error) {
            console.warn('⚠️ 精度計算エラー:', error.message);
            return 0;
        }
    }

    /**
     * 予測信頼度計算
     */
    calculatePredictionConfidence(features) {
        if (!this.trainingData.length) return 0.5;
        
        try {
            // 訓練データとの類似度による信頼度
            const trainingFeatures = this.trainingData.map(data => this.extractFeatures(data.content));
            const similarities = trainingFeatures.map(trainFeature => {
                const distance = Math.sqrt(
                    features.reduce((sum, val, i) => sum + Math.pow(val - trainFeature[i], 2), 0)
                );
                return Math.exp(-distance); // ガウシアン類似度
            });
            
            const maxSimilarity = Math.max(...similarities);
            const avgSimilarity = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
            
            // 高精度モデルほど信頼度が高い
            const modelConfidence = this.predictionAccuracy;
            
            return (maxSimilarity * 0.4 + avgSimilarity * 0.3 + modelConfidence * 0.3);
            
        } catch (error) {
            console.warn('⚠️ 信頼度計算エラー:', error.message);
            return 0.5;
        }
    }

    /**
     * フォールバック品質予測（モデル未訓練時）
     */
    fallbackQualityPrediction(content) {
        const concept = { 
            name: content.text || content.term || String(content),
            ...content
        };
        
        const qualityScore = this.conceptQualityManager.calculateQualityScore(concept);
        
        return {
            qualityScore: qualityScore,
            confidence: 0.6, // ヒューリスティックの信頼度
            grade: this.getQualityGrade(qualityScore),
            features: {},
            modelUsed: 'heuristic_fallback',
            predictionAccuracy: 0
        };
    }

    /**
     * 品質グレード取得
     */
    getQualityGrade(score) {
        if (score >= this.qualityThresholds.excellent) return 'excellent';
        if (score >= this.qualityThresholds.good) return 'good';  
        if (score >= this.qualityThresholds.acceptable) return 'acceptable';
        return 'poor';
    }

    /**
     * モデル保存
     */
    async saveModel() {
        try {
            const modelData = {
                regressionWeights: this.regressionWeights,
                predictionAccuracy: this.predictionAccuracy,
                featureNames: this.featureNames,
                qualityThresholds: this.qualityThresholds,
                trainingSize: this.trainingData.length,
                lastTrained: new Date().toISOString(),
                isModelTrained: this.isModelTrained
            };

            await this.persistentLearningDB.saveQualityPredictionModel(modelData);
            console.log(`💾 品質予測モデル保存完了`);
            
        } catch (error) {
            console.error('❌ モデル保存エラー:', error.message);
        }
    }

    /**
     * モデル読み込み
     */
    async loadModel() {
        try {
            const modelData = await this.persistentLearningDB.loadQualityPredictionModel();
            
            if (modelData && modelData.regressionWeights) {
                this.regressionWeights = modelData.regressionWeights;
                this.predictionAccuracy = modelData.predictionAccuracy || 0;
                this.isModelTrained = modelData.isModelTrained || false;
                
                // 重みからモデル再構築
                if (this.isModelTrained && this.regressionWeights.length === this.featureNames.length + 1) {
                    // 予測関数を再構築
                    this.regressionModel = {
                        predict: (featureMatrix) => {
                            return featureMatrix.map(featureVector => {
                                // バイアス項（weights[0]）+ 特徴量重み
                                let prediction = this.regressionWeights[0]; // バイアス項
                                for (let i = 0; i < featureVector.length; i++) {
                                    prediction += this.regressionWeights[i + 1] * (featureVector[i] || 0);
                                }
                                return prediction;
                            });
                        }
                    };
                    console.log(`📥 品質予測モデル読み込み完了 (精度: ${(this.predictionAccuracy * 100).toFixed(1)}%)`);
                } else {
                    console.log(`📥 モデルデータ読み込み完了（再訓練が必要）`);
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.warn('⚠️ モデル読み込みエラー:', error.message);
            return false;
        }
    }

    /**
     * 統計情報取得
     */
    getModelStats() {
        return {
            isModelTrained: this.isModelTrained,
            predictionAccuracy: this.predictionAccuracy,
            trainingDataSize: this.trainingData.length,
            featureCount: this.featureNames.length,
            featureNames: this.featureNames,
            regressionWeights: this.regressionWeights,
            qualityThresholds: this.qualityThresholds
        };
    }

    /**
     * 真の線形回帰実装 - 正規化された最小二乗法
     * Ridge回帰: weights = (X^T * X + λI)^-1 * X^T * y  
     * @param {Array<Array<number>>} features - 特徴量行列 (m x n)
     * @param {Array<number>} targets - ターゲットベクトル (m x 1)
     * @returns {Array<number>} 回帰重み (n+1 x 1, バイアス項含む)
     */
    solveLinearRegression(features, targets) {
        try {
            const m = features.length; // サンプル数
            const n = features[0].length; // 特徴量数
            
            console.log(`🔢 線形回帰計算: ${m}サンプル × ${n}特徴量`);
            
            // 小サンプル対応: Ridge回帰の正則化パラメータ
            const lambda = m < n ? 0.1 : 0.001; // サンプル数が特徴量数より少ない場合は強い正則化
            
            // バイアス項を追加した設計行列 X を構築 (m x (n+1))
            const X = [];
            for (let i = 0; i < m; i++) {
                // バイアス項 (1.0) を先頭に追加
                X[i] = [1.0, ...features[i]];
            }
            
            // X^T (転置行列) を計算 ((n+1) x m)
            const XT = this.transposeMatrix(X);
            
            // X^T * X を計算 ((n+1) x (n+1))
            const XTX = this.multiplyMatrices(XT, X);
            
            // Ridge回帰: X^T * X + λI を計算（正則化項追加）
            const regularizedXTX = this.addRegularization(XTX, lambda);
            
            // X^T * y を計算 ((n+1) x 1)
            const XTy = this.multiplyMatrixVector(XT, targets);
            
            // (X^T * X + λI)^-1 を計算 - 改良されたガウス・ジョーダン法
            const XTX_inv = this.invertMatrixWithPivoting(regularizedXTX);
            
            // 最終的な重み = (X^T * X + λI)^-1 * X^T * y
            const weights = this.multiplyMatrixVector(XTX_inv, XTy);
            
            console.log(`✅ Ridge回帰解法完了: 重み${weights.length}個計算 (λ=${lambda})`);
            
            return weights;
            
        } catch (error) {
            console.error('❌ 線形回帰計算エラー:', error.message);
            
            // エラー時は最小二乗解析解を使用
            return this.fallbackSimpleRegression(features, targets);
        }
    }

    /**
     * 正則化項を追加（Ridge回帰）
     * @param {Array<Array<number>>} matrix - 元の行列
     * @param {number} lambda - 正則化パラメータ
     * @returns {Array<Array<number>>} 正則化された行列
     */
    addRegularization(matrix, lambda) {
        const n = matrix.length;
        const regularized = matrix.map(row => [...row]); // コピー
        
        // 対角要素にλを追加（バイアス項は正則化しない）
        for (let i = 1; i < n; i++) { // i=0はバイアス項なのでスキップ
            regularized[i][i] += lambda;
        }
        
        return regularized;
    }

    /**
     * フォールバック用シンプル回帰（平均ベース）
     */
    fallbackSimpleRegression(features, targets) {
        console.log('📊 フォールバック: 特徴量統計ベース回帰を使用');
        
        const n = features[0].length;
        const fallbackWeights = new Array(n + 1).fill(0);
        
        // バイアス項は目標値の平均
        const targetMean = targets.reduce((sum, val) => sum + val, 0) / targets.length;
        fallbackWeights[0] = targetMean;
        
        // 各特徴量と目標値の相関を簡易計算
        for (let i = 0; i < n; i++) {
            const featureValues = features.map(row => row[i]);
            const correlation = this.calculateCorrelation(featureValues, targets);
            fallbackWeights[i + 1] = correlation * 0.1; // 小さな重みに設定
        }
        
        console.log('⚠️ フォールバック重みを使用:', fallbackWeights);
        return fallbackWeights;
    }

    /**
     * 相関係数計算
     */
    calculateCorrelation(x, y) {
        const n = x.length;
        const meanX = x.reduce((sum, val) => sum + val, 0) / n;
        const meanY = y.reduce((sum, val) => sum + val, 0) / n;
        
        let numerator = 0;
        let denominatorX = 0;
        let denominatorY = 0;
        
        for (let i = 0; i < n; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            numerator += dx * dy;
            denominatorX += dx * dx;
            denominatorY += dy * dy;
        }
        
        const denominator = Math.sqrt(denominatorX * denominatorY);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * 行列の転置
     * @param {Array<Array<number>>} matrix
     * @returns {Array<Array<number>>}
     */
    transposeMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const transposed = [];
        
        for (let j = 0; j < cols; j++) {
            transposed[j] = [];
            for (let i = 0; i < rows; i++) {
                transposed[j][i] = matrix[i][j];
            }
        }
        
        return transposed;
    }

    /**
     * 行列の乗算 A * B
     * @param {Array<Array<number>>} A - 行列A (m x p)
     * @param {Array<Array<number>>} B - 行列B (p x n)
     * @returns {Array<Array<number>>} 結果行列 (m x n)
     */
    multiplyMatrices(A, B) {
        const m = A.length;
        const p = A[0].length;
        const n = B[0].length;
        
        const result = [];
        for (let i = 0; i < m; i++) {
            result[i] = [];
            for (let j = 0; j < n; j++) {
                result[i][j] = 0;
                for (let k = 0; k < p; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        
        return result;
    }

    /**
     * 行列とベクトルの乗算 A * v
     * @param {Array<Array<number>>} A - 行列A (m x n)
     * @param {Array<number>} v - ベクトルv (n x 1)
     * @returns {Array<number>} 結果ベクトル (m x 1)
     */
    multiplyMatrixVector(A, v) {
        const m = A.length;
        const n = A[0].length;
        
        const result = [];
        for (let i = 0; i < m; i++) {
            result[i] = 0;
            for (let j = 0; j < n; j++) {
                result[i] += A[i][j] * v[j];
            }
        }
        
        return result;
    }

    /**
     * 改良されたガウス・ジョーダン法による逆行列計算（ピボット選択付き）
     * @param {Array<Array<number>>} matrix - 正方行列
     * @returns {Array<Array<number>>} 逆行列
     */
    invertMatrixWithPivoting(matrix) {
        return this.invertMatrix(matrix);
    }

    /**
     * ガウス・ジョーダン法による逆行列計算
     * @param {Array<Array<number>>} matrix - 正方行列
     * @returns {Array<Array<number>>} 逆行列
     */
    invertMatrix(matrix) {
        const n = matrix.length;
        
        // 拡大行列 [A | I] を作成
        const augmented = [];
        for (let i = 0; i < n; i++) {
            augmented[i] = [...matrix[i]];
            for (let j = 0; j < n; j++) {
                augmented[i][n + j] = (i === j) ? 1 : 0;
            }
        }
        
        // ガウス・ジョーダン消去法
        for (let i = 0; i < n; i++) {
            // 主軸要素を見つける（部分ピボット選択）
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            
            // 行を交換
            if (maxRow !== i) {
                [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
            }
            
            // 対角要素が0の場合（特異行列）
            if (Math.abs(augmented[i][i]) < 1e-10) {
                throw new Error(`特異行列: 対角要素[${i}][${i}] = ${augmented[i][i]}`);
            }
            
            // 対角要素を1にする
            const pivot = augmented[i][i];
            for (let j = 0; j < 2 * n; j++) {
                augmented[i][j] /= pivot;
            }
            
            // 他の行から現在の行を引いて0にする
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = augmented[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        augmented[k][j] -= factor * augmented[i][j];
                    }
                }
            }
        }
        
        // 逆行列部分を抽出
        const inverse = [];
        for (let i = 0; i < n; i++) {
            inverse[i] = augmented[i].slice(n);
        }
        
        return inverse;
    }
}

export default QualityPredictionModel;