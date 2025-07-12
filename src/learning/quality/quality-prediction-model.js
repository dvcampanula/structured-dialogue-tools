/**
 * QualityPredictionModel - 線形回帰による品質予測AI
 * 
 * REDESIGN仕様書121-147行準拠: 統計的機械学習による品質予測・改善提案
 * ConceptQualityManagerの特徴量計算を活用し、真のデータ駆動型品質予測を実現
 */

// 真の線形回帰実装（最小二乗法）
// ConceptQualityManager removed - using pure statistical learning instead
import { persistentLearningDB as defaultPersistentLearningDB } from '../../data/persistent-learning-db.js';
import { NgramContextPatternAI } from '../ngram/ngram-context-pattern.js';
import { DynamicRelationshipLearner } from '../cooccurrence/dynamic-relationship-learner.js';

export class QualityPredictionModel {
    constructor(persistentDB, ngramAI, cooccurrenceLearner) {
        this.persistentLearningDB = persistentDB || defaultPersistentLearningDB;
        this.ngramAI = ngramAI || new NgramContextPatternAI(3, 0.75);
        this.cooccurrenceLearner = cooccurrenceLearner || new DynamicRelationshipLearner('quality_predictor');
        this.improvementPatterns = new Map(); // 学習された改善パターン
        this.isAIModulesInitialized = false;
        
        // 線形回帰モデル
        this.regressionModel = null;
        this.regressionWeights = [];
        this.predictionAccuracy = 0;
        
        // 統計学習特徴量定義（技術用語分類除去）
        this.featureNames = [
            'lengthScore',           // 長さ評価
            'frequencyScore',        // 頻度評価
            'relevanceScore',        // 関連性評価  
            'noiseScore',           // ノイズ度（負の特徴量）
            'structureScore',       // 構造性評価
            'contextDensity',       // 文脈密度
            'semanticCoherence',    // 意味的一貫性
            'vocabularyDiversity',  // 語彙多様性
            'statisticalComplexity' // 統計的複雑度（技術用語度の代替）
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
        
        // initializeAIModulesはコンストラクタで呼ばない。テストで制御するため。
        // this.initializeAIModules();
        console.log('🧬 QualityPredictionModel初期化完了');
    }

    /**
     * AI統計学習モジュールの初期化
     */
    async initializeAIModules() {
        try {
            await this.ngramAI.initialize();
            await this.cooccurrenceLearner.initializeLearner();
            await this.loadModel();
            await this.loadImprovementPatterns();
            this.isAIModulesInitialized = true;
            console.log('🤖 統計学習モジュール初期化完了');
        } catch (error) {
            console.warn('⚠️ 統計学習モジュール初期化エラー:', error.message);
        }
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
                const featureVector = await this.extractFeatures(data.content);
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
    async predictQuality(content) {
        try {
            if (!this.isModelTrained) {
                // モデル未訓練の場合はConceptQualityManagerのヒューリスティック使用
                console.warn('⚠️ モデル未訓練 - ヒューリスティック品質評価使用');
                return this.fallbackQualityPrediction(content);
            }

            // 特徴量抽出
            const features = await this.extractFeatures(content);
            
            // 線形回帰による予測
            const predictedScore = this.regressionModel.predict([features])[0];
            const normalizedScore = Math.max(0, Math.min(1, predictedScore));

            // 信頼度計算（特徴量の分散と訓練データとの類似度基準）
            const confidence = await this.calculatePredictionConfidence(features);

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
     * 統計学習ベース改善提案生成
     * @param {Object} content - 分析対象コンテンツ
     * @returns {Array} 改善提案リスト
     */
    async suggestImprovements(content) {
        try {
            const qualityResult = await this.predictQuality(content);
            const features = qualityResult.features;
            const improvements = [];

            // 統計学習ベース改善パターン検索
            const statisticalImprovements = await this.generateStatisticalImprovements(content, qualityResult);
            improvements.push(...statisticalImprovements);

            // N-gramベース文脈改善提案
            const contextualImprovements = await this.generateContextualImprovements(content);
            improvements.push(...contextualImprovements);

            // 共起関係ベース関連語提案
            const relationshipImprovements = await this.generateRelationshipImprovements(content);
            improvements.push(...relationshipImprovements);

            // 過去の成功パターンからの学習
            const learnedImprovements = await this.generateLearnedImprovements(content, qualityResult);
            improvements.push(...learnedImprovements);

            // 重複排除と統計的信頼度によるソート
            const uniqueImprovements = this.deduplicateAndRankImprovements(improvements);

            return uniqueImprovements.slice(0, 5); // 上位5つの提案を返す

        } catch (error) {
            console.error('❌ 統計学習改善提案エラー:', error.message);
            return await this.fallbackRuleBasedImprovements(content);
        }
    }

    /**
     * 統計学習ベース改善パターン生成
     */
    async generateStatisticalImprovements(content, qualityResult) {
        const improvements = [];
        const features = qualityResult.features;
        
        // 低スコア特徴量の統計的分析
        const lowScoreFeatures = Object.entries(features)
            .filter(([_, score]) => score < 0.5)
            .sort(([_, a], [__, b]) => a - b); // 最も低いスコア順

        for (const [featureName, score] of lowScoreFeatures.slice(0, 3)) {
            const pattern = await this.getImprovementPattern(featureName, score);
            if (pattern) {
                improvements.push({
                    type: `statistical_${featureName}`,
                    priority: this.calculatePriority(score, pattern.confidence),
                    issue: pattern.issue,
                    suggestion: pattern.suggestion,
                    expectedImprovement: pattern.expectedImprovement,
                    confidence: pattern.confidence,
                    source: 'statistical_learning'
                });
            }
        }

        return improvements;
    }

    /**
     * N-gramベース文脈改善提案
     */
    async generateContextualImprovements(content) {
        if (!this.isAIModulesInitialized) return [];
        
        const improvements = [];
        const text = content.text || content.term || String(content);
        
        try {
            // 文脈予測で改善方向を分析
            const contextPrediction = await this.ngramAI.predictContext(text);
            
            if (contextPrediction.confidence > 0.6) {
                const suggestedCategory = contextPrediction.predictedCategory;
                improvements.push({
                    type: 'contextual_alignment',
                    priority: 'medium',
                    issue: `文脈が「${suggestedCategory}」により適合可能`,
                    suggestion: `「${suggestedCategory}」文脈に特化した語彙選択を検討してください`,
                    expectedImprovement: 0.12 * contextPrediction.confidence,
                    confidence: contextPrediction.confidence,
                    source: 'ngram_analysis'
                });
            }
        } catch (error) {
            console.warn('⚠️ 文脈改善分析エラー:', error.message);
        }

        return improvements;
    }

    /**
     * 共起関係ベース関連語提案
     */
    async generateRelationshipImprovements(content) {
        if (!this.isAIModulesInitialized) return [];
        
        const improvements = [];
        const text = content.text || content.term || String(content);
        
        try {
            // 統計的関連語取得
            const relatedTerms = this.cooccurrenceLearner.getUserRelations(text);
            
            if (relatedTerms.length > 0) {
                const topRelated = relatedTerms.slice(0, 3).join('、');
                improvements.push({
                    type: 'relationship_enhancement',
                    priority: 'medium',
                    issue: '統計的関連語との連携が可能',
                    suggestion: `関連語「${topRelated}」との組み合わせを検討してください`,
                    expectedImprovement: 0.08 + (relatedTerms.length * 0.02),
                    confidence: Math.min(0.9, relatedTerms.length * 0.2),
                    source: 'cooccurrence_analysis'
                });
            }
        } catch (error) {
            console.warn('⚠️ 関係性改善分析エラー:', error.message);
        }

        return improvements;
    }

    /**
     * 過去の成功パターン学習改善提案
     */
    async generateLearnedImprovements(content, qualityResult) {
        const improvements = [];
        const currentScore = qualityResult.qualityScore;
        
        // 学習済み改善パターンから類似ケースを検索
        for (const [patternKey, pattern] of this.improvementPatterns.entries()) {
            const similarity = this.calculateContentSimilarity(content, pattern.originalContent);
            
            if (similarity > 0.6 && pattern.actualImprovement > 0.1) {
                improvements.push({
                    type: 'learned_pattern',
                    priority: pattern.actualImprovement > 0.2 ? 'high' : 'medium',
                    issue: pattern.identifiedIssue,
                    suggestion: pattern.successfulSolution,
                    expectedImprovement: pattern.actualImprovement * similarity,
                    confidence: similarity * pattern.confidence,
                    source: 'historical_learning'
                });
            }
        }

        return improvements;
    }

    /**
     * フォールバック用ルールベース改善提案
     */
    async fallbackRuleBasedImprovements(content) {
        console.warn('⚠️ フォールバック: ルールベース改善提案を使用');
        const qualityResult = this.predictQuality(content);
        const features = qualityResult.features;
        
        const improvements = [];
        
        if (features.lengthScore < 0.5) {
            improvements.push({
                type: 'length_optimization',
                priority: 'high',
                issue: '語彙の長さが最適でない',
                suggestion: '3-20文字の適切な長さの語彙を選択してください',
                expectedImprovement: 0.15,
                source: 'rule_based_fallback'
            });
        }
        
        return improvements.slice(0, 3);
    }

    /**
     * コンテンツから特徴量ベクトルを抽出
     * ConceptQualityManagerの計算要素を活用・拡張
     */
    async extractFeatures(content) {
        try {
            // コンテンツの正規化
            const text = content.text || content.term || content.name || String(content);
            const metadata = content.metadata || {};
            
            // 純粋統計学習ベース特徴量計算
            const lengthScore = this.calculateStatisticalLengthScore(text);
            const frequencyScore = this.calculateStatisticalFrequencyScore(metadata.frequency || 1);
            const relevanceScore = metadata.relevanceScore || metadata.confidence || 0.5;
            const noiseScore = this.calculateStatisticalNoiseScore(text);
            const structureScore = this.calculateStatisticalStructureScore(text);
            const statisticalComplexity = await this.calculateStatisticalComplexity(text);

            // 拡張特徴量（統計的品質予測用）
            const contextDensity = await this.calculateContextDensity(content);
            const semanticCoherence = await this.calculateSemanticCoherence(content);
            const vocabularyDiversity = await this.calculateVocabularyDiversity(content);

            return [
                lengthScore,
                frequencyScore, 
                relevanceScore,
                1.0 - noiseScore,  // ノイズは負の特徴量なので反転
                structureScore,
                contextDensity,
                semanticCoherence,
                vocabularyDiversity,
                statisticalComplexity
            ];

        } catch (error) {
            console.warn('⚠️ 特徴量抽出エラー:', error.message);
            // エラー時は中性的な特徴量を返す
            return new Array(this.featureNames.length).fill(0.5);
        }
    }

    /**
     * 統計学習ベース文脈密度計算
     */
    async calculateContextDensity(content) {
        const text = content.text || String(content);
        const relatedTerms = content.relatedTerms || content.relatedConcepts || [];
        
        let density = 0;
        
        // 基本的な関連語比率
        const basicDensity = relatedTerms.length / Math.max(text.length / 10, 1);
        density += Math.min(0.5, basicDensity);
        
        // 統計学習ベース文脈密度
        if (this.isAIModulesInitialized) {
            try {
                // N-gram文脈予測による密度評価
                const contextPrediction = await this.ngramAI.predictContext(text);
                density += contextPrediction.confidence * 0.3;
                
                // 共起関係による密度評価
                const relatedCount = this.cooccurrenceLearner.getUserRelations(text).length;
                density += Math.min(0.2, relatedCount * 0.05);
                
            } catch (error) {
                console.warn('⚠️ 統計的文脈密度計算エラー:', error.message);
            }
        }
        
        return Math.min(1.0, density);
    }

    /**
     * 統計学習ベース意味的一貫性計算
     */
    async calculateSemanticCoherence(content) {
        const text = content.text || String(content);
        
        let coherence = 0;
        
        // 基本的な文字種一貫性
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        const hasKatakana = /[\u30A0-\u30FF]/.test(text);
        const hasAlphabet = /[A-Za-z]/.test(text);
        coherence += (hasKanji && hasKatakana) || hasAlphabet ? 0.4 : 0.2;
        
        // 統計学習ベース一貫性評価
        if (this.isAIModulesInitialized) {
            try {
                // N-gram文脈一貫性
                const contextPrediction = await this.ngramAI.predictContext(text);
                coherence += contextPrediction.confidence * 0.4;
                
                // 関連語の意味的一貫性
                const relatedTerms = this.cooccurrenceLearner.getUserRelations(text);
                if (relatedTerms.length > 0) {
                    // 関連語の平均関係性強度
                    const avgStrength = relatedTerms.slice(0, 3).reduce((sum, term) => {
                        return sum + this.cooccurrenceLearner.getRelationshipStrength(text, term);
                    }, 0) / Math.min(3, relatedTerms.length);
                    coherence += avgStrength * 0.2;
                }
                
            } catch (error) {
                console.warn('⚠️ 統計的意味一貫性計算エラー:', error.message);
            }
        }
        
        return Math.min(1.0, coherence);
    }

    /**
     * 統計学習ベース語彙多様性計算
     */
    async calculateVocabularyDiversity(content) {
        const text = content.text || String(content);
        
        let diversity = 0;
        
        // 基本的な文字種多様性
        const charTypes = [];
        if (/[\u3040-\u309F]/.test(text)) charTypes.push('hiragana');
        if (/[\u30A0-\u30FF]/.test(text)) charTypes.push('katakana');
        if (/[\u4E00-\u9FAF]/.test(text)) charTypes.push('kanji');
        if (/[A-Za-z]/.test(text)) charTypes.push('alphabet');
        if (/[0-9]/.test(text)) charTypes.push('number');
        diversity += Math.min(0.5, charTypes.length / 3);
        
        // 統計学習ベース多様性評価
        if (this.isAIModulesInitialized) {
            try {
                // N-gram語彙多様性
                const ngramPattern = await this.extractNgramDiversity(text);
                diversity += ngramPattern * 0.3;
                
                // 関連語の多様性（異なるカテゴリの関連語数）
                const relatedTerms = this.cooccurrenceLearner.getUserRelations(text);
                const diversityBonus = Math.min(0.2, relatedTerms.length * 0.04);
                diversity += diversityBonus;
                
            } catch (error) {
                console.warn('⚠️ 統計的語彙多様性計算エラー:', error.message);
            }
        }
        
        return Math.min(1.0, diversity);
    }

    /**
     * N-gram語彙多様性抽出
     */
    async extractNgramDiversity(text) {
        try {
            // 複数文脈での予測を試行
            const contexts = [
                `${text}について`,
                `${text}の実装`,
                `${text}を使用`
            ];
            
            const predictions = await Promise.all(
                contexts.map(ctx => this.ngramAI.predictContext(ctx))
            );
            
            // 異なる文脈予測結果の多様性を評価
            const uniqueCategories = new Set(predictions.map(p => p.predictedCategory));
            return Math.min(1.0, uniqueCategories.size / 3);
            
        } catch (error) {
            return 0;
        }
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
    async calculatePredictionConfidence(features) {
        if (!this.trainingData.length) return 0.5;
        
        try {
            // 訓練データとの類似度による信頼度
            const trainingFeatures = await Promise.all(this.trainingData.map(data => this.extractFeatures(data.content)));
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
        // 統計学習フォールバック（技術用語分類除去）
        const text = content.text || content.term || String(content);
        
        // 基本的な統計評価
        const basicScore = (
            this.calculateStatisticalLengthScore(text) * 0.3 +
            this.calculateStatisticalStructureScore(text) * 0.4 +
            (1.0 - this.calculateStatisticalNoiseScore(text)) * 0.3
        );
        
        return {
            qualityScore: basicScore,
            confidence: 0.5, // フォールバックの信頼度
            grade: this.getQualityGrade(basicScore),
            features: {},
            modelUsed: 'statistical_fallback',
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
    /**
     * 改善パターン取得
     */
    async getImprovementPattern(featureName, score) {
        // シンプルな統計パターンマッピング
        const patterns = {
            lengthScore: {
                issue: '語彙長が統計的最適値から逸脱',
                suggestion: '統計分析に基づく最適長（4-12文字）への調整を推奨',
                expectedImprovement: (1 - score) * 0.2,
                confidence: 0.8
            },
            statisticalComplexity: {
                issue: '統計的複雑度が目標値以下',
                suggestion: '統計学習で特定された高品質パターンの採用を推奨',
                expectedImprovement: (1 - score) * 0.15,
                confidence: 0.75
            },
            contextDensity: {
                issue: '文脈関連性が統計モデル期待値以下',
                suggestion: 'N-gram分析で特定された関連語群の組み込みを推奨',
                expectedImprovement: (1 - score) * 0.12,
                confidence: 0.75
            }
        };
        
        return patterns[featureName] || null;
    }

    /**
     * 優先度計算
     */
    calculatePriority(score, confidence) {
        const impact = (1 - score) * confidence;
        if (impact > 0.6) return 'high';
        if (impact > 0.3) return 'medium';
        return 'low';
    }

    /**
     * 改善提案重複排除とランキング
     */
    deduplicateAndRankImprovements(improvements) {
        const seen = new Set();
        const unique = improvements.filter(imp => {
            const key = `${imp.type}_${imp.issue}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        
        return unique.sort((a, b) => {
            const scoreA = (a.expectedImprovement || 0) * (a.confidence || 0.5);
            const scoreB = (b.expectedImprovement || 0) * (b.confidence || 0.5);
            return scoreB - scoreA;
        });
    }

    /**
     * コンテンツ類似度計算
     */
    calculateContentSimilarity(content1, content2) {
        const text1 = content1.text || content1.term || String(content1);
        const text2 = content2.text || content2.term || String(content2);
        
        // 簡易的な文字列類似度（ジャカード係数）
        const set1 = new Set(text1.split(''));
        const set2 = new Set(text2.split(''));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * 改善パターン読み込み
     */
    async loadImprovementPatterns() {
        try {
            const patterns = await this.persistentLearningDB.loadImprovementPatterns();
            if (patterns) {
                this.improvementPatterns = new Map(patterns);
                console.log(`📚 改善パターン読み込み: ${this.improvementPatterns.size}件`);
            }
        } catch (error) {
            console.warn('⚠️ 改善パターン読み込みエラー:', error.message);
        }
    }

    /**
     * 改善パターン保存
     */
    async saveImprovementPatterns() {
        try {
            const patternsArray = Array.from(this.improvementPatterns.entries());
            await this.persistentLearningDB.saveImprovementPatterns(patternsArray);
            console.log(`💾 改善パターン保存: ${patternsArray.length}件`);
        } catch (error) {
            console.warn('⚠️ 改善パターン保存エラー:', error.message);
        }
    }

    /**
     * 改善パターン学習（フィードバックから）
     */
    async learnFromFeedback(originalContent, appliedSuggestion, beforeScore, afterScore) {
        try {
            const actualImprovement = afterScore - beforeScore;
            
            if (actualImprovement > 0.05) { // 有意な改善のみ学習
                const patternKey = `${appliedSuggestion.type}_${Date.now()}`;
                const pattern = {
                    originalContent,
                    identifiedIssue: appliedSuggestion.issue,
                    successfulSolution: appliedSuggestion.suggestion,
                    actualImprovement,
                    confidence: Math.min(0.9, actualImprovement / 0.3),
                    learnedAt: new Date().toISOString()
                };
                
                this.improvementPatterns.set(patternKey, pattern);
                await this.saveImprovementPatterns();
                
                console.log(`🎓 改善パターン学習: ${actualImprovement.toFixed(3)}の改善`);
            }
        } catch (error) {
            console.warn('⚠️ 改善パターン学習エラー:', error.message);
        }
    }

    /**
     * モデル統計情報取得
     */
    getModelStats() {
        return {
            isModelTrained: this.isModelTrained,
            predictionAccuracy: this.predictionAccuracy,
            trainingDataSize: this.trainingData.length,
            featureCount: this.featureNames.length,
            featureNames: this.featureNames,
            regressionWeights: this.regressionWeights,
            qualityThresholds: this.qualityThresholds,
            improvementPatternsCount: this.improvementPatterns.size,
            isAIModulesInitialized: this.isAIModulesInitialized
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

    /**
     * 統計学習ベース長さスコア計算
     */
    calculateStatisticalLengthScore(text) {
        const length = text.length;
        // 統計的最適長：4-12文字でピーク
        if (length >= 4 && length <= 12) {
            return 1.0;
        } else if (length >= 2 && length <= 20) {
            // 線形減衰
            return Math.max(0.3, 1.0 - Math.abs(length - 8) * 0.1);
        } else {
            return 0.1;
        }
    }

    /**
     * 統計学習ベース頻度スコア計算
     */
    calculateStatisticalFrequencyScore(frequency) {
        // 寶数正規化：低頻度でも適度なスコア
        return Math.min(1.0, Math.log10(frequency + 1) / 3);
    }

    /**
     * 統計学習ベースノイズスコア計算
     */
    calculateStatisticalNoiseScore(text) {
        let noiseScore = 0;
        
        // 高頻度文字パターン（統計的ノイズ）
        const commonChars = /[あ-んはですますだけ]/;
        const charNoiseRatio = (text.match(commonChars) || []).length / text.length;
        noiseScore += charNoiseRatio * 0.6;
        
        // 特殊文字・記号
        const specialChars = /[!@#$%^&*()\-+=\[\]{}|;:'",.<>?/`~]/;
        if (specialChars.test(text)) {
            noiseScore += 0.3;
        }
        
        return Math.min(1.0, noiseScore);
    }

    /**
     * 統計学習ベース構造スコア計算
     */
    calculateStatisticalStructureScore(text) {
        let structureScore = 0;
        
        // 文字種混合性（複雑度指標）
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        const hasKatakana = /[\u30A0-\u30FF]/.test(text);
        const hasAlphabet = /[A-Za-z]/.test(text);
        const hasNumber = /[0-9]/.test(text);
        
        const charTypeCount = [hasKanji, hasKatakana, hasAlphabet, hasNumber].filter(Boolean).length;
        structureScore += charTypeCount / 4 * 0.6;
        
        // 長さに基づく構造性
        if (text.length > 6) {
            structureScore += 0.4;
        } else if (text.length > 3) {
            structureScore += 0.2;
        }
        
        return Math.min(1.0, structureScore);
    }

    /**
     * 統計学習ベース複雑度計算（技術用語度の代替）
     */
    async calculateStatisticalComplexity(text) {
        let complexity = 0;
        
        // 基本的な複雑度：長さと文字種多様性
        const baseComplexity = Math.min(1.0, text.length / 15) * 0.3;
        complexity += baseComplexity;
        
        // 統計学習ベース複雑度（N-gram連携）
        if (this.isAIModulesInitialized) {
            try {
                const contextPrediction = await this.ngramAI.predictContext(text);
                // 高信頼度文脈予測は複雑度が高い
                complexity += contextPrediction.confidence * 0.4;
                
                // 共起関係の複雑度
                const relatedTerms = this.cooccurrenceLearner.getUserRelations(text);
                complexity += Math.min(0.3, relatedTerms.length * 0.05);
                
            } catch (error) {
                console.warn('⚠️ 統計複雑度計算エラー:', error.message);
            }
        }
        
        return Math.min(1.0, complexity);
    }
}

export default QualityPredictionModel;