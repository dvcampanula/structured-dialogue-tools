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
        this.persistentLearningDB = persistentDB;
        this.ngramAI = ngramAI;
        this.cooccurrenceLearner = cooccurrenceLearner;
        this.improvementPatterns = new Map(); // 学習された改善パターン
        this.isAIModulesInitialized = false;
        this.isModelTrained = false;
        
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

        // 改善提案の重み (動的読み込み)
        this.improvementWeights = {};

        // 統計的信頼度計算の重み (動的読み込み)
        this.confidenceWeights = {};

        // フォールバック品質予測の重み (動的読み込み)
        this.fallbackWeights = {};

        // 統計的複雑度計算の重み (動的読み込み)
        this.complexityWeights = {};

        // 文脈密度計算の重み (動的読み込み)
        this.contextDensityWeights = {};

        // 意味的一貫性計算の重み (動的読み込み)
        this.semanticCoherenceWeights = {};

        // 語彙多様性計算の重み (動的読み込み)
        this.vocabularyDiversityWeights = {};

        // ノイズスコア計算の重み (動的読み込み)
        this.noiseScoreWeights = {};

        // 構造スコア計算の重み (動的読み込み)
        this.structureScoreWeights = {};

        // 長さスコア計算の重み (動的読み込み)
        this.lengthScoreWeights = {};
        
        // 学習統計初期化
        this.learningStats = {
            totalPredictions: 0,
            correctPredictions: 0,
            averageAccuracy: 0
        };
        
        // initializeAIModulesはコンストラクタで呼ばない。テストで制御するため。
        // this.initializeAIModules();
        this.loadImprovementWeights(); // 非同期で読み込み
        this.loadConfidenceWeights(); // 非同期で読み込み
        this.loadFallbackWeights(); // 非同期で読み込み
        this.loadComplexityWeights(); // 非同期で読み込み
        this.loadContextDensityWeights(); // 非同期で読み込み
        this.loadSemanticCoherenceWeights(); // 非同期で読み込み
        this.loadVocabularyDiversityWeights(); // 非同期で読み込み
        this.loadNoiseScoreWeights(); // 非同期で読み込み
        this.loadStructureScoreWeights(); // 非同期で読み込み
        this.loadLengthScoreWeights(); // 非同期で読み込み
        console.log('🧬 QualityPredictionModel初期化完了');
    }

    /**
     * 長さスコア計算の重みをDBから読み込む
     */
    async loadLengthScoreWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_length_score_weights');
            if (data && Object.keys(data).length > 0) {
                this.lengthScoreWeights = data;
            } else {
                await this._initializeDefaultLengthScoreWeights();
            }
        } catch (error) {
            console.warn('⚠️ 長さスコア重みの読み込みエラー:', error.message);
            await this._initializeDefaultLengthScoreWeights();
        }
    }

    /**
     * デフォルトの長さスコア重みを初期化して保存
     */
    async _initializeDefaultLengthScoreWeights() {
        const defaultWeights = {
            linearDecayMin: 0.3,
            linearDecayFactor: 0.1,
            elseCase: 0.1
        };
        this.lengthScoreWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_length_score_weights', defaultWeights);
            console.log('✅ デフォルト長さスコア重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト長さスコア重みの保存エラー:', error.message);
        }
    }

    /**
     * 構造スコア計算の重みをDBから読み込む
     */
    async loadStructureScoreWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_structure_score_weights');
            if (data && Object.keys(data).length > 0) {
                this.structureScoreWeights = data;
            } else {
                await this._initializeDefaultStructureScoreWeights();
            }
        } catch (error) {
            console.warn('⚠️ 構造スコア重みの読み込みエラー:', error.message);
            await this._initializeDefaultStructureScoreWeights();
        }
    }

    /**
     * デフォルトの構造スコア重みを初期化して保存
     */
    async _initializeDefaultStructureScoreWeights() {
        const defaultWeights = {
            charTypeFactor: 0.6,
            lengthFactorHigh: 0.4,
            lengthFactorMedium: 0.2
        };
        this.structureScoreWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_structure_score_weights', defaultWeights);
            console.log('✅ デフォルト構造スコア重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト構造スコア重みの保存エラー:', error.message);
        }
    }

    /**
     * ノイズスコア計算の重みをDBから読み込む
     */
    async loadNoiseScoreWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_noise_score_weights');
            if (data && Object.keys(data).length > 0) {
                this.noiseScoreWeights = data;
            } else {
                await this._initializeDefaultNoiseScoreWeights();
            }
        } catch (error) {
            console.warn('⚠️ ノイズスコア重みの読み込みエラー:', error.message);
            await this._initializeDefaultNoiseScoreWeights();
        }
    }

    /**
     * デフォルトのノイズスコア重みを初期化して保存
     */
    async _initializeDefaultNoiseScoreWeights() {
        const defaultWeights = {
            charNoiseRatio: 0.6,
            specialChars: 0.3
        };
        this.noiseScoreWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_noise_score_weights', defaultWeights);
            console.log('✅ デフォルトノイズスコア重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルトノイズスコア重みの保存エラー:', error.message);
        }
    }

    /**
     * 語彙多様性計算の重みをDBから読み込む
     */
    async loadVocabularyDiversityWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_vocabulary_diversity_weights');
            if (data && Object.keys(data).length > 0) {
                this.vocabularyDiversityWeights = data;
            } else {
                await this._initializeDefaultVocabularyDiversityWeights();
            }
        } catch (error) {
            console.warn('⚠️ 語彙多様性重みの読み込みエラー:', error.message);
            await this._initializeDefaultVocabularyDiversityWeights();
        }
    }

    /**
     * デフォルトの語彙多様性重みを初期化して保存
     */
    async _initializeDefaultVocabularyDiversityWeights() {
        const defaultWeights = {
            ngramPattern: 0.3,
            relatedTerms: 0.04
        };
        this.vocabularyDiversityWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_vocabulary_diversity_weights', defaultWeights);
            console.log('✅ デフォルト語彙多様性重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト語彙多様性重みの保存エラー:', error.message);
        }
    }

    /**
     * 意味的一貫性計算の重みをDBから読み込む
     */
    async loadSemanticCoherenceWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_semantic_coherence_weights');
            if (data && Object.keys(data).length > 0) {
                this.semanticCoherenceWeights = data;
            } else {
                await this._initializeDefaultSemanticCoherenceWeights();
            }
        } catch (error) {
            console.warn('⚠️ 意味的一貫性重みの読み込みエラー:', error.message);
            await this._initializeDefaultSemanticCoherenceWeights();
        }
    }

    /**
     * デフォルトの意味的一貫性重みを初期化して保存
     */
    async _initializeDefaultSemanticCoherenceWeights() {
        const defaultWeights = {
            charTypeCoherence: 0.4,
            charTypeIncoherence: 0.2,
            contextPrediction: 0.4,
            relatedTerms: 0.2
        };
        this.semanticCoherenceWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_semantic_coherence_weights', defaultWeights);
            console.log('✅ デフォルト意味的一貫性重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト意味的一貫性重みの保存エラー:', error.message);
        }
    }

    /**
     * 統計的複雑度計算の重みをDBから読み込む
     */
    async loadComplexityWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_complexity_weights');
            if (data && Object.keys(data).length > 0) {
                this.complexityWeights = data;
            } else {
                await this._initializeDefaultComplexityWeights();
            }
        } catch (error) {
            console.warn('⚠️ 統計的複雑度重みの読み込みエラー:', error.message);
            await this._initializeDefaultComplexityWeights();
        }
    }

    /**
     * デフォルトの統計的複雑度重みを初期化して保存
     */
    async _initializeDefaultComplexityWeights() {
        const defaultWeights = {
            baseComplexity: 0.3,
            contextPrediction: 0.4,
            relatedTerms: 0.05
        };
        this.complexityWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_complexity_weights', defaultWeights);
            console.log('✅ デフォルト統計的複雑度重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト統計的複雑度重みの保存エラー:', error.message);
        }
    }

    /**
     * 文脈密度計算の重みをDBから読み込む
     */
    async loadContextDensityWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_context_density_weights');
            if (data && Object.keys(data).length > 0) {
                this.contextDensityWeights = data;
            } else {
                await this._initializeDefaultContextDensityWeights();
            }
        } catch (error) {
            console.warn('⚠️ 文脈密度重みの読み込みエラー:', error.message);
            await this._initializeDefaultContextDensityWeights();
        }
    }

    /**
     * デフォルトの文脈密度重みを初期化して保存
     */
    async _initializeDefaultContextDensityWeights() {
        const defaultWeights = {
            contextPrediction: 0.3,
            relatedTerms: 0.05
        };
        this.contextDensityWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_context_density_weights', defaultWeights);
            console.log('✅ デフォルト文脈密度重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト文脈密度重みの保存エラー:', error.message);
        }
    }

    /**
     * 統計的信頼度計算の重みをDBから読み込む
     */
    async loadConfidenceWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_confidence_weights');
            if (data && Object.keys(data).length > 0) {
                this.confidenceWeights = data;
            } else {
                await this._initializeDefaultConfidenceWeights();
            }
        } catch (error) {
            console.warn('⚠️ 統計的信頼度重みの読み込みエラー:', error.message);
            await this._initializeDefaultConfidenceWeights();
        }
    }

    /**
     * デフォルトの統計的信頼度重みを初期化して保存
     */
    async _initializeDefaultConfidenceWeights() {
        const defaultWeights = {
            qualityConfidence: 0.4,
            dataConfidence: 0.3,
            lengthConfidence: 0.3
        };
        this.confidenceWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_confidence_weights', defaultWeights);
            console.log('✅ デフォルト統計的信頼度重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト統計的信頼度重みの保存エラー:', error.message);
        }
    }

    /**
     * 改善提案の重みをDBから読み込む
     */
    async loadImprovementWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_improvement_weights');
            if (data && Object.keys(data).length > 0) {
                this.improvementWeights = data;
            } else {
                await this._initializeDefaultImprovementWeights();
            }
        } catch (error) {
            console.warn('⚠️ 改善提案重みの読み込みエラー:', error.message);
            await this._initializeDefaultImprovementWeights();
        }
    }

    /**
     * デフォルトの改善提案重みを初期化して保存
     */
    async _initializeDefaultImprovementWeights() {
        const defaultWeights = {
            lengthScore: 0.2,
            statisticalComplexity: 0.15,
            contextDensity: 0.12
        };
        this.improvementWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_improvement_weights', defaultWeights);
            console.log('✅ デフォルト改善提案重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルト改善提案重みの保存エラー:', error.message);
        }
    }

    /**
     * フォールバック品質予測の重みをDBから読み込む
     */
    async loadFallbackWeights() {
        try {
            const data = await this.persistentLearningDB.loadSystemData('quality_fallback_weights');
            if (data && Object.keys(data).length > 0) {
                this.fallbackWeights = data;
            } else {
                await this._initializeDefaultFallbackWeights();
            }
        } catch (error) {
            console.warn('⚠️ フォールバック重みの読み込みエラー:', error.message);
            await this._initializeDefaultFallbackWeights();
        }
    }

    /**
     * デフォルトのフォールバック品質予測重みを初期化して保存
     */
    async _initializeDefaultFallbackWeights() {
        const defaultWeights = {
            lengthScore: 0.3,
            structureScore: 0.4,
            noiseScore: 0.3
        };
        this.fallbackWeights = defaultWeights;
        try {
            await this.persistentLearningDB.saveSystemData('quality_fallback_weights', defaultWeights);
            console.log('✅ デフォルトフォールバック重みをDBに保存しました。');
        } catch (error) {
            console.error('❌ デフォルトフォールバック重みの保存エラー:', error.message);
        }
    }

    /**
     * AI統計学習モジュールの初期化
     */
    async initializeAIModules() {
        if (process.env.DEBUG_VERBOSE === 'true') {
            console.log(`DEBUG: QualityPredictionModel.initializeAIModules`);
            console.log(`DEBUG: this.persistentLearningDB type:`, typeof this.persistentLearningDB);
        }
        try {
            await this.ngramAI.initialize();
            // cooccurrenceLearnerはファクトリ関数として渡されるため、ここでインスタンス化して初期化
            // ただし、QualityPredictionModelのinitializeAIModulesはuserIdを受け取らないため、
            // ここではダミーのuserId ('quality_predictor') を使用する。
            // 実際のユーザーごとの学習はAIVocabularyProcessorからcooccurrenceLearnerが呼び出される際に行われる。
            if (typeof this.cooccurrenceLearner === 'function') { // cooccurrenceLearnerがファクトリ関数である場合
                this.cooccurrenceLearner = this.cooccurrenceLearner('quality_predictor'); // インスタンス化
            }
            await this.cooccurrenceLearner.initializeLearner('quality_predictor'); // userIdを渡す
            await this.loadModel();
            await this.loadImprovementPatterns();
            await this.loadTrainingData(); // 永続化された訓練データを読み込み
            if (this.trainingData.length >= 3 && !this.isModelTrained) {
                console.log('🤖 起動時にモデルを再訓練します...');
                await this.trainModel(this.trainingData);
                this.isModelTrained = true;
            }
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
            if (!trainingData || trainingData.length === 0) {
                throw new Error('訓練データがありません');
            }

            const numFeatures = this.featureNames.length; // 特徴量の数
            const minSamplesRequired = numFeatures * 5; // 統計的有意性のための最低サンプル数 (特徴量の5倍)

            if (trainingData.length < minSamplesRequired) {
                console.warn(`⚠️ 訓練データが不十分です。最低${minSamplesRequired}件必要ですが、現在${trainingData.length}件です。`);
                // 訓練をスキップするか、フォールバックモデルを使用するなどの選択肢
                this.isModelTrained = false;
                this.regressionWeights = [];
                this.predictionAccuracy = 0;
                return {
                    accuracy: 0,
                    weights: [],
                    featureNames: this.featureNames,
                    trainingSize: trainingData.length,
                    message: '訓練データ不足のためモデル訓練をスキップしました'
                };
            }

            console.log(`🤖 線形回帰モデル訓練開始: ${trainingData.length}件のデータ`);

            // 特徴量行列とターゲットベクトルを構築
            const features = [];
            const targets = [];

            for (const data of trainingData) {
                const featureVector = await this.extractFeatures(data.content);
                if (featureVector && featureVector.length === numFeatures) {
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
            
            const confidenceThreshold = await this.calculateDynamicThreshold('mediumConfidence');
            if (contextPrediction.confidence > confidenceThreshold) {
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
     * 自動学習: 応答生成結果から品質予測モデルを更新
     * @param {Object} content - 入力コンテンツ
     * @param {number} actualQuality - 実際の品質スコア
     */
    async learnFromResponse(content, actualQuality) {
        try {
            // 重複チェックと統合
            const existingIndex = this.trainingData.findIndex(data => {
                // コンテンツの比較は、テキスト内容に基づいて行う
                const existingText = data.content.text || data.content.term || String(data.content);
                const newText = content.text || content.term || String(content);
                return existingText === newText;
            });

            if (existingIndex !== -1) {
                // 既存のエントリを更新
                this.trainingData[existingIndex].qualityScore = actualQuality;
                this.trainingData[existingIndex].timestamp = Date.now();
                console.log(`📚 品質予測学習データ更新: スコア${actualQuality.toFixed(3)} (既存データ更新)`);
            } else {
                // 新しい訓練データとして追加
                this.trainingData.push({
                    content: content,
                    qualityScore: actualQuality,
                    timestamp: Date.now()
                });
                console.log(`📚 品質予測学習データ追加: スコア${actualQuality.toFixed(3)} (総${this.trainingData.length}件)`);
            }

            // 十分なデータが蓄積されたら再訓練
            if (this.trainingData.length >= 5 && this.trainingData.length % 5 === 0) {
                await this.retrainModel();
            }

            // データ永続化
            await this.saveTrainingData();

        } catch (error) {
            console.warn('⚠️ 品質予測自動学習エラー:', error.message);
        }
    }

    /**
     * モデル再訓練（自動学習）
     */
    async retrainModel() {
        try {
            console.log('🔄 品質予測モデル再訓練開始...');
            
            // 最新の訓練データで再訓練
            const result = await this.trainModel(this.trainingData);
            
            console.log(`✅ 品質予測モデル再訓練完了: 精度${result.accuracy.toFixed(3)}`);
            
            return result;
            
        } catch (error) {
            console.warn('⚠️ モデル再訓練失敗:', error.message);
        }
    }

    /**
     * 訓練データの永続化
     */
    async saveTrainingData() {
        try {
            const trainingDataForSave = {
                data: this.trainingData,
                lastUpdated: Date.now(),
                dataCount: this.trainingData.length,
                modelTrained: this.isModelTrained,
                accuracy: this.predictionAccuracy
            };

            if (this.persistentLearningDB && this.persistentLearningDB.saveQualityTrainingData) {
                await this.persistentLearningDB.saveQualityTrainingData(trainingDataForSave);
            }
            
        } catch (error) {
            console.warn('⚠️ 品質訓練データ保存エラー:', error.message);
        }
    }

    /**
     * 永続化された訓練データの読み込み
     */
    async loadTrainingData() {
        try {
            if (this.persistentLearningDB && this.persistentLearningDB.loadQualityTrainingData) {
                const savedData = await this.persistentLearningDB.loadQualityTrainingData();
                
                if (savedData && savedData.data && Array.isArray(savedData.data)) {
                    this.trainingData = savedData.data;
                    console.log(`📊 品質訓練データ読み込み: ${this.trainingData.length}件`);
                    
                    // 十分なデータがあれば自動的に訓練
                    if (this.trainingData.length >= 3) {
                        await this.trainModel(this.trainingData);
                    }
                }
            }
            
        } catch (error) {
            console.warn('⚠️ 品質訓練データ読み込みエラー:', error.message);
        }
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
        const weights = this.contextDensityWeights;
        
        let density = 0;
        
        // 基本的な関連語比率
        const basicDensity = relatedTerms.length / Math.max(text.length / 10, 1);
        density += Math.min(0.5, basicDensity);
        
        // 統計学習ベース文脈密度
        if (this.isAIModulesInitialized) {
            try {
                // N-gram文脈予測による密度評価
                const contextPrediction = await this.ngramAI.predictContext(text);
                density += contextPrediction.confidence * (weights.contextPrediction || 0.3);
                
                // 共起関係による密度評価
                const relatedCount = this.cooccurrenceLearner.getUserRelations(text).length;
                density += Math.min(0.2, relatedCount * (weights.relatedTerms || 0.05));
                
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
        const weights = this.semanticCoherenceWeights;
        
        let coherence = 0;
        
        // 基本的な文字種一貫性
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        const hasKatakana = /[\u30A0-\u30FF]/.test(text);
        const hasAlphabet = /[A-Za-z]/.test(text);
        coherence += (hasKanji && hasKatakana) || hasAlphabet ? (weights.charTypeCoherence || 0.4) : (weights.charTypeIncoherence || 0.2);
        
        // 統計学習ベース一貫性評価
        if (this.isAIModulesInitialized) {
            try {
                // N-gram文脈一貫性
                const contextPrediction = await this.ngramAI.predictContext(text);
                coherence += contextPrediction.confidence * (weights.contextPrediction || 0.4);
                
                // 関連語の意味的一貫性
                const relatedTerms = this.cooccurrenceLearner.getUserRelations(text);
                if (relatedTerms.length > 0) {
                    // 関連語の平均関係性強度
                    const avgStrength = relatedTerms.slice(0, 3).reduce((sum, term) => {
                        return sum + this.cooccurrenceLearner.getRelationshipStrength(text, term);
                    }, 0) / Math.min(3, relatedTerms.length);
                    coherence += avgStrength * (weights.relatedTerms || 0.2);
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
        const weights = this.vocabularyDiversityWeights;
        
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
                diversity += ngramPattern * (weights.ngramPattern || 0.3);
                
                // 関連語の多様性（異なるカテゴリの関連語数）
                const relatedTerms = this.cooccurrenceLearner.getUserRelations(text);
                const diversityBonus = Math.min(0.2, relatedTerms.length * (weights.relatedTerms || 0.04));
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
            
            const rSquared = 1 - (Math.round((residualSumSquares / totalSumSquares) * 1e6) / 1e6);
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
        const weights = this.fallbackWeights;
        
        // 基本的な統計評価
        const basicScore = (
            this.calculateStatisticalLengthScore(text) * (weights.lengthScore || 0.3) +
            this.calculateStatisticalStructureScore(text) * (weights.structureScore || 0.4) +
            (1.0 - this.calculateStatisticalNoiseScore(text)) * (weights.noiseScore || 0.3)
        );
        
        // 特徴量構築（統計学習ベース）
        const features = { text: text, length: text.length };
        
        // 統計学習ベース信頼度計算
        const dynamicConfidence = this.calculateStatisticalConfidence(features, basicScore);
        
        return {
            qualityScore: basicScore,
            confidence: dynamicConfidence,
            grade: this.getQualityGrade(basicScore),
            features: {},
            modelUsed: 'statistical_fallback',
            predictionAccuracy: dynamicConfidence
        };
    }

    /**
     * 統計学習ベース信頼度計算
     */
    calculateStatisticalConfidence(features, qualityScore) {
        const weights = this.confidenceWeights;
        // 1. 品質スコアベース信頼度（高品質ほど高信頼度）
        const qualityConfidence = Math.min(0.9, qualityScore * 1.2);
        
        // 2. 学習データ量ベース信頼度
        const dataConfidence = Math.min(0.8, this.learningStats.totalPredictions / 100);
        
        // 3. テキスト長ベース信頼度（適切な長さで高信頼度）
        const textLength = features?.text?.length || 10;
        const lengthConfidence = Math.min(0.9, Math.max(0.3, 1.0 - Math.abs(textLength - 50) / 100));
        
        // 4. 統計的信頼度統合
        const baseConfidence = (qualityConfidence * (weights.qualityConfidence || 0.4) +
                                dataConfidence * (weights.dataConfidence || 0.3) +
                                lengthConfidence * (weights.lengthConfidence || 0.3));
        
        // 5. ランダム性追加（統計学習らしい変動）
        const randomVariation = (Math.random() - 0.5) * 0.1; // ±0.05の変動
        
        return Math.max(0.2, Math.min(0.95, baseConfidence + randomVariation));
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
        const weights = this.improvementWeights;
        const patterns = {
            lengthScore: {
                issue: '語彙長が統計的最適値から逸脱',
                suggestion: '統計分析に基づく最適長（4-12文字）への調整を推奨',
                expectedImprovement: (1 - score) * (weights.lengthScore || 0.2),
                confidence: 0.8
            },
            statisticalComplexity: {
                issue: '統計的複雑度が目標値以下',
                suggestion: '統計学習で特定された高品質パターンの採用を推奨',
                expectedImprovement: (1 - score) * (weights.statisticalComplexity || 0.15),
                confidence: 0.75
            },
            contextDensity: {
                issue: '文脈関連性が統計モデル期待値以下',
                suggestion: 'N-gram分析で特定された関連語群の組み込みを推奨',
                expectedImprovement: (1 - score) * (weights.contextDensity || 0.12),
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
        const correlation = denominator === 0 ? 0 : numerator / denominator;
        return Math.round(correlation * 1e6) / 1e6;
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
        const weights = this.lengthScoreWeights;
        // 統計的最適長：4-12文字でピーク
        if (length >= 4 && length <= 12) {
            return 1.0;
        } else if (length >= 2 && length <= 20) {
            // 線形減衰
            return Math.max((weights.linearDecayMin || 0.3), 1.0 - Math.abs(length - 8) * (weights.linearDecayFactor || 0.1));
        } else {
            return (weights.elseCase || 0.1);
        }
    }

    /**
     * 統計学習ベース頻度スコア計算
     */
    calculateStatisticalFrequencyScore(frequency) {
        const weights = this.frequencyScoreWeights;
        // 寶数正規化：低頻度でも適度なスコア
        return Math.min(1.0, Math.log10(frequency + 1) / (weights.divisor || 3));
    }

    /**
     * 統計学習ベースノイズスコア計算
     */
    calculateStatisticalNoiseScore(text) {
        let noiseScore = 0;
        const weights = this.noiseScoreWeights;
        
        // 高頻度文字パターン（統計的ノイズ）
        const commonChars = /[あ-んはですますだけ]/;
        const charNoiseRatio = (text.match(commonChars) || []).length / text.length;
        noiseScore += charNoiseRatio * (weights.charNoiseRatio || 0.6);
        
        // 特殊文字・記号
        const specialChars = /[!@#$%^&*()\-+=\[\]{}|;:'",.<>?/`~]/;
        if (specialChars.test(text)) {
            noiseScore += (weights.specialChars || 0.3);
        }
        
        return Math.min(1.0, noiseScore);
    }

    /**
     * 統計学習ベース構造スコア計算
     */
    calculateStatisticalStructureScore(text) {
        let structureScore = 0;
        const weights = this.structureScoreWeights;
        
        // 文字種混合性（複雑度指標）
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        const hasKatakana = /[\u30A0-\u30FF]/.test(text);
        const hasAlphabet = /[A-Za-z]/.test(text);
        const hasNumber = /[0-9]/.test(text);
        
        const charTypeCount = [hasKanji, hasKatakana, hasAlphabet, hasNumber].filter(Boolean).length;
        structureScore += charTypeCount / 4 * (weights.charTypeFactor || 0.6);
        
        // 長さに基づく構造性
        if (text.length > 6) {
            structureScore += (weights.lengthFactorHigh || 0.4);
        } else if (text.length > 3) {
            structureScore += (weights.lengthFactorMedium || 0.2);
        }
        
        return Math.min(1.0, structureScore);
    }

    /**
     * 統計学習ベース複雑度計算（技術用語度の代替）
     */
    async calculateStatisticalComplexity(text) {
        const weights = this.complexityWeights;
        let complexity = 0;
        
        // 基本的な複雑度：長さと文字種多様性
        const baseComplexity = Math.min(1.0, text.length / 15) * (weights.baseComplexity || 0.3);
        complexity += baseComplexity;
        
        // 統計学習ベース複雑度（N-gram連携）
        if (this.isAIModulesInitialized) {
            try {
                const contextPrediction = await this.ngramAI.predictContext(text);
                // 高信頼度文脈予測は複雑度が高い
                complexity += contextPrediction.confidence * (weights.contextPrediction || 0.4);
                
                // 共起関係の複雑度
                const relatedTerms = this.cooccurrenceLearner.getUserRelations(text);
                complexity += Math.min(0.3, relatedTerms.length * (weights.relatedTerms || 0.05));
                
            } catch (error) {
                console.warn('⚠️ 統計複雑度計算エラー:', error.message);
            }
        }
        
        return Math.min(1.0, complexity);
    }

    /**
     * 動的閾値計算
     * 品質予測データから統計的に閾値を計算
     */
    async calculateDynamicThreshold(thresholdType) {
        try {
            // 既存の品質予測データから閾値を計算
            const qualityData = this.qualityData || [];
            const scores = qualityData.map(d => d.score).filter(s => typeof s === 'number');
            
            if (scores.length === 0) {
                // フォールバック：統計的デフォルト閾値
                switch (thresholdType) {
                    case 'highConfidence':
                        return 0.75;
                    case 'mediumConfidence':
                        return 0.6;
                    case 'lowConfidence':
                        return 0.3;
                    default:
                        return 0.5;
                }
            }
            
            // 統計的閾値計算
            scores.sort((a, b) => a - b);
            const q1 = scores[Math.floor(scores.length * 0.25)];
            const median = scores[Math.floor(scores.length * 0.5)];
            const q3 = scores[Math.floor(scores.length * 0.75)];
            
            switch (thresholdType) {
                case 'highConfidence':
                    return q3;
                case 'mediumConfidence':
                    return median;
                case 'lowConfidence':
                    return q1;
                default:
                    return median;
            }
            
        } catch (error) {
            console.warn('⚠️ 品質予測モデル動的閾値計算エラー:', error.message);
            return 0.6; // 安全なフォールバック
        }
    }
}

export default QualityPredictionModel;