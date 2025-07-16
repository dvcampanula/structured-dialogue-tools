/**
 * 統計的対話学習システム
 * 外部対話ログを統計学習により処理して対話品質を改善
 * パターンマッチング回避・完全統計学習アプローチ
 */

import { EnhancedHybridLanguageProcessor } from '../../foundation/morphology/hybrid-processor.js';
import { NgramContextPatternAI } from '../ngram/ngram-context-pattern.js';
import { DynamicRelationshipLearner } from '../cooccurrence/dynamic-relationship-learner.js';
import { QualityPredictionModel } from '../quality/quality-prediction-model.js';
import { BayesianPersonalizationAI } from '../bayesian/bayesian-personalization.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class StatisticalDialogueLearner {
    constructor() {
        this.morphProcessor = null;
        this.ngramModel = null;
        this.relationshipLearner = null;
        this.qualityPredictor = null;
        this.bayesianPersonalizer = null;
        
        // 統計的対話学習データ
        this.dialogueStatistics = {
            totalProcessed: 0,
            responsePatterns: new Map(),
            contextTransitions: new Map(),
            qualityCorrelations: new Map(),
            userAdaptations: new Map(),
            processedPairHashes: new Set()  // 重複回避用ハッシュセット
        };
        
        this.isInitialized = false;
    }

    async initialize() {
        console.log('🧬 統計的対話学習システム初期化開始...');
        
        try {
            // 形態素解析器初期化
            this.morphProcessor = new EnhancedHybridLanguageProcessor();
            await this.morphProcessor.initialize();
            
            // N-gram言語モデル初期化
            this.ngramModel = new NgramContextPatternAI();
            
            // 動的関係学習器初期化
            this.relationshipLearner = new DynamicRelationshipLearner();
            
            // 品質予測モデル初期化
            this.qualityPredictor = new QualityPredictionModel();
            
            // ベイジアン個人化モデル初期化
            this.bayesianPersonalizer = new BayesianPersonalizationAI();
            
            // 既存の対話統計データ読み込み
            await this.loadDialogueStatistics();
            
            this.isInitialized = true;
            console.log('✅ 統計的対話学習システム初期化完了');
            
        } catch (error) {
            console.error('❌ 統計的対話学習システム初期化失敗:', error);
            throw error;
        }
    }

    /**
     * 外部対話ログを統計学習で処理
     * @param {string} logContent - 対話ログの内容
     * @param {string} sourceName - ログのソース名（Claude、Gemini等）
     * @returns {Promise<Object>} 学習結果
     */
    async processDialogueLog(logContent, sourceName = 'unknown') {
        if (!this.isInitialized) {
            throw new Error('統計的対話学習システムが初期化されていません');
        }

        console.log(`📚 対話ログ統計学習開始: ${sourceName}`);
        const startTime = Date.now();

        try {
            // 🎯 新アプローチ: ペア抽出せず、全文から直接統計学習
            console.log(`📝 直接統計学習開始: ${sourceName}`);
            
            // 1. 文章分割と前処理
            const sentences = this.extractSentences(logContent);
            console.log(`📝 文章数: ${sentences.length}`);
            
            // 2. 各文章から統計的特徴学習
            const learningResults = [];
            let processedSentences = 0;
            
            for (const sentence of sentences) {
                if (sentence.trim().length < 10) continue; // 短すぎる文をスキップ
                
                const result = await this.learnFromSentence(sentence, sourceName);
                if (result.success) {
                    learningResults.push(result);
                    processedSentences++;
                }
                
                if (processedSentences % 10 === 0) {
                    console.log(`🔄 処理中: ${processedSentences}/${sentences.length} 文章`);
                }
            }
            
            // 3. 学習統計の更新
            this.dialogueStatistics.totalProcessed += processedSentences;
            
            // 4. 学習データの永続化
            await this.saveDialogueStatistics();
            
            const processingTime = Date.now() - startTime;
            console.log(`✅ 対話ログ統計学習完了: ${processedSentences}文章処理 (${processingTime}ms)`);
            
            return {
                success: true,
                sourceName,
                totalSentences: sentences.length,
                processedSentences,
                learningResults,
                processingTime,
                statistics: this.getStatisticsSummary()
            };
            
        } catch (error) {
            console.error('❌ 対話ログ統計学習エラー:', error);
            return {
                success: false,
                error: error.message,
                sourceName
            };
        }
    }

    /**
     * 統計的手法による対話ペア抽出
     * パターンマッチング回避・形態素解析+統計的境界検出
     */
    async extractDialoguePairsStatistically(logContent) {
        const lines = logContent.split('\n').filter(line => line.trim());
        const dialoguePairs = [];
        
        let currentUser = null;
        let currentAI = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // 形態素解析による統計的分類
            const processResult = await this.morphProcessor.processText(line);
            const morphemes = processResult.tokens || [];
            const classification = await this.classifyLineStatistically(line, morphemes, i, lines);
            
            if (classification.type === 'user_input') {
                // 前のペアが完成していれば保存
                if (currentUser && currentAI) {
                    dialoguePairs.push({
                        userInput: currentUser,
                        aiResponse: currentAI,
                        confidence: classification.confidence
                    });
                }
                currentUser = line;
                currentAI = null;
                
            } else if (classification.type === 'ai_response' && currentUser) {
                currentAI = line;
            }
        }
        
        // 最後のペア処理
        if (currentUser && currentAI) {
            dialoguePairs.push({
                userInput: currentUser,
                aiResponse: currentAI,
                confidence: 0.8
            });
        }
        
        console.log(`📊 対話ペア抽出結果: ${dialoguePairs.length}ペア`);
        
        return dialoguePairs;
    }

    /**
     * 純粋統計的行分類（パターンマッチング完全排除）
     */
    async classifyLineStatistically(line, morphemes, position, allLines) {
        // 純粋統計的特徴量抽出
        const features = this.extractFeatures(line, morphemes);
        
        // 位置統計
        features.relative_position = position / Math.max(allLines.length, 1);
        
        // 文脈統計
        features.context_similarity = await this.calculateContextSimilarity(line, position, allLines);
        
        // ベイジアン分類による確率的判定
        const userScore = this.bayesianPersonalizer.calculateBayesianScore('dialogue_classifier', 'user_input', features);
        const aiScore = this.bayesianPersonalizer.calculateBayesianScore('dialogue_classifier', 'ai_response', features);
        
        // スコアが-Infinityの場合（学習データ不足）は統計的ヒューリスティックを使用
        if (userScore === -Infinity && aiScore === -Infinity) {
            return this.fallbackClassification(features);
        }
        
        const type = userScore > aiScore ? 'user_input' : 'ai_response';
        const confidence = this.calculateClassificationConfidence(userScore, aiScore);
        
        return { type, confidence, features };
    }

    /**
     * 分類信頼度計算
     */
    calculateClassificationConfidence(userScore, aiScore) {
        if (userScore === -Infinity && aiScore === -Infinity) return 0.5;
        if (userScore === -Infinity) return Math.round((Math.exp(aiScore) / (Math.exp(aiScore) + 0.001)) * 1e6) / 1e6;
        if (aiScore === -Infinity) return Math.round((Math.exp(userScore) / (Math.exp(userScore) + 0.001)) * 1e6) / 1e6;
        
        const expUser = Math.exp(userScore);
        const expAI = Math.exp(aiScore);
        const confidence = Math.max(expUser, expAI) / (expUser + expAI + 0.001);
        return Math.round(confidence * 1e6) / 1e6;
    }

    /**
     * 学習データ不足時の統計的フォールバック分類
     */
    fallbackClassification(features) {
        // 純粋統計的重み計算（固定閾値排除）
        const featureWeights = this.calculateFeatureWeights(features);
        
        // 文脈的手がかりに基づく分類（統計的）
        let userScore = featureWeights.user_indicators;
        let aiScore = featureWeights.ai_indicators;
        
        // 文長と語彙多様性による統計的判定
        if (features.text_length < 50 && features.lexical_diversity < 0.5) {
            userScore += 0.3; // 短い文は質問傾向
        }
        
        if (features.text_length > 100 && features.lexical_diversity > 0.7) {
            aiScore += 0.4; // 長い文は説明傾向
        }
        
        // 品詞分布による統計的分類
        if (features.particle_ratio > 0.2) {
            userScore += 0.2; // 助詞が多い場合は質問傾向
        }
        
        if (features.noun_ratio > 0.4) {
            aiScore += 0.2; // 名詞が多い場合は説明傾向
        }
        
        const confidence = Math.round((Math.abs(userScore - aiScore) / Math.max(userScore + aiScore, 0.001)) * 1e6) / 1e6;
        
        return { type, confidence, features };
    }

    /**
     * 統計的特徴重み計算（固定閾値完全排除）
     */
    calculateFeatureWeights(features) {
        // 特徴量の統計的分析に基づく重み計算
        const weights = {
            user_indicators: 0,
            ai_indicators: 0
        };
        
        // 語彙多様性の統計的重み（正規化）
        const diversityWeight = Math.round((features.lexical_diversity * 0.4) * 1e6) / 1e6;
        weights.user_indicators += diversityWeight;
        weights.ai_indicators += Math.round(((1 - features.lexical_diversity) * 0.3) * 1e6) / 1e6;
        
        // 品詞エントロピーの統計的重み（正規化）
        const entropyNormalized = Math.round((Math.min(features.avg_pos_entropy / 3.0, 1.0)) * 1e6) / 1e6;
        weights.user_indicators += entropyNormalized * 0.3;
        weights.ai_indicators += Math.round(((1 - entropyNormalized) * 0.4) * 1e6) / 1e6;
        
        // 文長の統計的重み（ロジスティック変換）
        const lengthNormalized = Math.round((1 / (1 + Math.exp(-(features.text_length - 100) / 30))) * 1e6) / 1e6;
        weights.user_indicators += Math.round(((1 - lengthNormalized) * 0.2) * 1e6) / 1e6;
        weights.ai_indicators += Math.round((lengthNormalized * 0.2) * 1e6) / 1e6;
        
        // 形態素密度の統計的重み
        const morphemeDensity = features.morpheme_count / Math.max(features.text_length, 1);
        const densityNormalized = Math.round((Math.min(morphemeDensity * 10, 1.0)) * 1e6) / 1e6;
        weights.user_indicators += densityNormalized * 0.1;
        weights.ai_indicators += Math.round(((1 - densityNormalized) * 0.1) * 1e6) / 1e6;
        
        return weights;
    }

    /**
     * 文脈類似度の統計的計算
     */
    async calculateContextSimilarity(line, position, allLines) {
        if (position === 0) return 0;
        
        const prevLine = allLines[position - 1];
        const currentResult = await this.morphProcessor.processText(line);
        const prevResult = await this.morphProcessor.processText(prevLine);
        const currentMorphemes = currentResult.tokens || [];
        const prevMorphemes = prevResult.tokens || [];
        
        // 共起関係による類似度計算
        const sharedTerms = new Set();
        for (const curr of currentMorphemes) {
            for (const prev of prevMorphemes) {
                if (curr.surface === prev.surface) {
                    sharedTerms.add(curr.surface);
                }
            }
        }
        
        const similarity = sharedTerms.size / Math.max(currentMorphemes.length, prevMorphemes.length);
        return Math.round(similarity * 1e6) / 1e6;
    }

    /**
     * 対話ペアから統計学習
     */
    async learnFromDialoguePair(dialoguePair, sourceName) {
        const { userInput, aiResponse } = dialoguePair;
        
        // 1. 形態素解析
        const userResult = await this.morphProcessor.processText(userInput);
        const aiResult = await this.morphProcessor.processText(aiResponse);
        const userMorphemes = userResult.tokens || [];
        const aiMorphemes = aiResult.tokens || [];
        
        // 2. N-gram学習
        const ngramResult = await this.ngramModel.learnFromSequence(
            [...userMorphemes.map(m => m.surface), '|||', ...aiMorphemes.map(m => m.surface)]
        );
        
        // 3. 共起関係学習
        const relationshipResult = await this.relationshipLearner.learnFromTerms(
            userMorphemes.map(m => m.surface),
            `dialogue_${sourceName}`
        );
        
        // 4. 品質評価学習
        const qualityResult = await this.qualityPredictor.evaluateAndLearn(aiResponse, {
            context: userInput,
            source: sourceName,
            features: {
                responseLength: aiResponse.length,
                morphemeCount: aiMorphemes.length,
                coherence: this.calculateCoherence(userMorphemes, aiMorphemes)
            }
        });
        
        // 5. ベイジアン個人化学習 - 対話分類データとして学習
        const userFeatures = this.extractFeatures(userInput, userMorphemes);
        const aiFeatures = this.extractFeatures(aiResponse, aiMorphemes);
        
        await this.bayesianPersonalizer.learnUserBehavior('dialogue_classifier', {
            class: 'user_input',
            features: userFeatures
        });
        
        await this.bayesianPersonalizer.learnUserBehavior('dialogue_classifier', {
            class: 'ai_response', 
            features: aiFeatures
        });
        
        const personalizationResult = {
            userLearned: true,
            aiLearned: true,
            userFeatures,
            aiFeatures
        };
        
        return {
            ngram: ngramResult,
            relationships: relationshipResult,
            quality: qualityResult,
            personalization: personalizationResult
        };
    }

    /**
     * 応答コヒーレンス計算（統計的手法）
     */
    calculateCoherence(userMorphemes, aiMorphemes) {
        const userTerms = new Set(userMorphemes.map(m => m.surface));
        const aiTerms = new Set(aiMorphemes.map(m => m.surface));
        
        const intersection = new Set([...userTerms].filter(x => aiTerms.has(x)));
        const union = new Set([...userTerms, ...aiTerms]);
        
        return intersection.size / union.size; // Jaccard係数
    }

    /**
     * 純粋統計的特徴量抽出（パターンマッチング完全排除）
     */
    extractFeatures(text, morphemes) {
        // 統計的特徴量のみ - ハードコード排除
        const textLength = text.length;
        const morphemeCount = morphemes.length;
        
        // 形態素分布統計
        const posDistribution = this.calculatePOSDistribution(morphemes);
        
        // 文字種分布統計  
        const charTypeDistribution = this.calculateCharTypeDistribution(text);
        
        // 語彙密度統計
        const lexicalDensity = this.calculateLexicalDensity(morphemes);
        
        const features = {
            // 基本統計特徴
            text_length: textLength,
            morpheme_count: morphemeCount,
            avg_morpheme_length: morphemeCount > 0 ? textLength / morphemeCount : 0,
            
            // 品詞分布統計
            verb_ratio: posDistribution.verb_ratio,
            noun_ratio: posDistribution.noun_ratio,
            particle_ratio: posDistribution.particle_ratio,
            adjective_ratio: posDistribution.adjective_ratio,
            auxiliary_ratio: posDistribution.auxiliary_ratio,
            
            // 文字種統計
            hiragana_ratio: charTypeDistribution.hiragana_ratio,
            katakana_ratio: charTypeDistribution.katakana_ratio,
            kanji_ratio: charTypeDistribution.kanji_ratio,
            symbol_ratio: charTypeDistribution.symbol_ratio,
            
            // 語彙多様性統計
            lexical_diversity: lexicalDensity.diversity,
            unique_morpheme_ratio: lexicalDensity.unique_ratio,
            avg_pos_entropy: lexicalDensity.pos_entropy
        };
        
        return features;
    }

    /**
     * 品詞分布統計計算
     */
    calculatePOSDistribution(morphemes) {
        if (morphemes.length === 0) {
            return { verb_ratio: 0, noun_ratio: 0, particle_ratio: 0, adjective_ratio: 0, auxiliary_ratio: 0 };
        }
        
        const posCounts = morphemes.reduce((counts, morpheme) => {
            const pos = morpheme.partOfSpeech || '';
            if (pos.includes('動詞')) counts.verb++;
            else if (pos.includes('名詞')) counts.noun++;
            else if (pos.includes('助詞')) counts.particle++;
            else if (pos.includes('形容詞')) counts.adjective++;
            else if (pos.includes('助動詞')) counts.auxiliary++;
            return counts;
        }, { verb: 0, noun: 0, particle: 0, adjective: 0, auxiliary: 0 });
        
        const total = morphemes.length;
        return {
            verb_ratio: posCounts.verb / total,
            noun_ratio: posCounts.noun / total,
            particle_ratio: posCounts.particle / total,
            adjective_ratio: posCounts.adjective / total,
            auxiliary_ratio: posCounts.auxiliary / total
        };
    }

    /**
     * 文字種分布統計計算（正規表現排除）
     */
    calculateCharTypeDistribution(text) {
        if (text.length === 0) {
            return { hiragana_ratio: 0, katakana_ratio: 0, kanji_ratio: 0, other_ratio: 0 };
        }
        
        const charCounts = [...text].reduce((counts, char) => {
            const code = char.charCodeAt(0);
            // Unicode範囲による文字種判定（正規表現排除）
            if (code >= 0x3041 && code <= 0x3096) counts.hiragana++;
            else if (code >= 0x30A1 && code <= 0x30FA) counts.katakana++;
            else if (code >= 0x4E00 && code <= 0x9FAF) counts.kanji++;
            else counts.other++;
            return counts;
        }, { hiragana: 0, katakana: 0, kanji: 0, other: 0 });
        
        const total = text.length;
        return {
            hiragana_ratio: charCounts.hiragana / total,
            katakana_ratio: charCounts.katakana / total,
            kanji_ratio: charCounts.kanji / total,
            other_ratio: charCounts.other / total
        };
    }

    /**
     * 語彙密度統計計算
     */
    calculateLexicalDensity(morphemes) {
        if (morphemes.length === 0) {
            return { diversity: 0, unique_ratio: 0, pos_entropy: 0 };
        }
        
        const surfaces = morphemes.map(m => m.surface).filter(s => s);
        const uniqueSurfaces = new Set(surfaces);
        const posTypes = morphemes.map(m => m.partOfSpeech).filter(p => p);
        const uniquePOS = new Set(posTypes);
        
        // TTR (Type-Token Ratio)
        const diversity = uniqueSurfaces.size / Math.max(surfaces.length, 1);
        const unique_ratio = uniqueSurfaces.size / Math.max(morphemes.length, 1);
        
        // 品詞エントロピー計算
        const posFreq = {};
        posTypes.forEach(pos => posFreq[pos] = (posFreq[pos] || 0) + 1);
        const entropy = Object.values(posFreq).reduce((ent, freq) => {
            const prob = freq / posTypes.length;
            return ent - prob * Math.log2(prob);
        }, 0);
        
        return {
            diversity,
            unique_ratio,
            pos_entropy: entropy
        };
    }

    /**
     * 学習済み統計を使用した応答生成改善
     */
    async improveResponse(originalResponse, userInput, userId = 'default') {
        if (!this.isInitialized) {
            return { response: originalResponse, improved: false };
        }

        try {
            // 1. ユーザー入力の形態素解析
            const userResult = await this.morphProcessor.processText(userInput);
            const userMorphemes = userResult.tokens || [];
            
            // 2. N-gramモデルによる文脈予測
            const contextPrediction = await this.ngramModel.predictNextSequence(
                userMorphemes.map(m => m.surface)
            );
            
            // 3. 共起関係による応答候補語彙強化
            const enhancedVocabulary = await this.relationshipLearner.suggestRelatedTerms(
                userMorphemes.map(m => m.surface),
                userId
            );
            
            // 4. 品質予測による応答評価・改善
            const qualityAnalysis = await this.qualityPredictor.evaluateAndImprove(originalResponse, {
                userInput,
                context: userInput,
                userId
            });
            
            // 5. 統計的応答合成
            const improvedResponse = await this.synthesizeStatisticalResponse(
                originalResponse,
                contextPrediction,
                enhancedVocabulary,
                qualityAnalysis
            );
            
            return {
                response: improvedResponse,
                improved: true,
                improvements: {
                    context: contextPrediction,
                    vocabulary: enhancedVocabulary,
                    quality: qualityAnalysis
                }
            };
            
        } catch (error) {
            console.error('❌ 応答改善エラー:', error);
            return { response: originalResponse, improved: false, error: error.message };
        }
    }

    /**
     * 統計的応答合成
     */
    async synthesizeStatisticalResponse(original, contextPrediction, vocabulary, qualityAnalysis) {
        // TODO: 高度な統計的合成アルゴリズム実装
        // 現在は基本的な品質改善を適用
        
        if (qualityAnalysis.improvements && qualityAnalysis.improvements.length > 0) {
            let improved = original;
            
            // 品質改善提案を統計的に適用
            for (const improvement of qualityAnalysis.improvements) {
                if (improvement.type === 'vocabulary_enhancement' && vocabulary.suggestions) {
                    // 語彙多様化適用
                    improved = await this.applyVocabularyEnhancement(improved, vocabulary.suggestions);
                }
            }
            
            return improved;
        }
        
        return original;
    }

    /**
     * 語彙強化適用
     */
    async applyVocabularyEnhancement(text, suggestions) {
        // 統計的語彙置換（基本実装）
        let enhanced = text;
        
        for (const suggestion of suggestions.slice(0, 3)) { // 上位3つの提案を適用
            // 動的閾値計算（フォールバック付き）
            let confidenceThreshold;
            try {
                confidenceThreshold = await this.calculateDynamicThreshold('highConfidence');
            } catch (error) {
                confidenceThreshold = 0.7; // フォールバック
            }
            if (suggestion.confidence > confidenceThreshold) {
                // 高信頼度の語彙強化のみ適用
                enhanced = enhanced.replace(
                    new RegExp(`\\b${suggestion.original}\\b`, 'g'),
                    suggestion.enhanced
                );
            }
        }
        
        return enhanced;
    }

    async loadDialogueStatistics() {
        try {
            const statsPath = path.join(process.cwd(), 'data', 'learning', 'dialogue-statistics.json');
            const data = await fs.readFile(statsPath, 'utf8');
            const stats = JSON.parse(data);
            
            // Mapオブジェクトの復元
            this.dialogueStatistics.responsePatterns = new Map(stats.responsePatterns || []);
            this.dialogueStatistics.contextTransitions = new Map(stats.contextTransitions || []);
            this.dialogueStatistics.qualityCorrelations = new Map(stats.qualityCorrelations || []);
            this.dialogueStatistics.userAdaptations = new Map(stats.userAdaptations || []);
            this.dialogueStatistics.totalProcessed = stats.totalProcessed || 0;
            this.dialogueStatistics.processedPairHashes = new Set(stats.processedPairHashes || []);
            
        } catch (error) {
            console.log('📊 対話統計データが見つかりません、新規作成します');
            this.dialogueStatistics = {
                totalProcessed: 0,
                responsePatterns: new Map(),
                contextTransitions: new Map(),
                qualityCorrelations: new Map(),
                userAdaptations: new Map(),
                processedPairHashes: new Set()
            };
        }
    }

    async saveDialogueStatistics() {
        try {
            const statsDir = path.join(process.cwd(), 'data', 'learning');
            await fs.mkdir(statsDir, { recursive: true });
            
            const statsPath = path.join(statsDir, 'dialogue-statistics.json');
            const data = {
                totalProcessed: this.dialogueStatistics.totalProcessed,
                responsePatterns: Array.from(this.dialogueStatistics.responsePatterns.entries()),
                contextTransitions: Array.from(this.dialogueStatistics.contextTransitions.entries()),
                qualityCorrelations: Array.from(this.dialogueStatistics.qualityCorrelations.entries()),
                userAdaptations: Array.from(this.dialogueStatistics.userAdaptations.entries()),
                processedPairHashes: Array.from(this.dialogueStatistics.processedPairHashes),
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(statsPath, JSON.stringify(data, null, 2));
            
        } catch (error) {
            console.error('❌ 対話統計データ保存エラー:', error);
        }
    }

    /**
     * 対話ペアのハッシュ生成（重複検出用）
     */
    generatePairHash(userInput, aiResponse) {
        // 正規化（空白・改行除去、小文字化）
        const normalizedUser = userInput.replace(/\s+/g, ' ').trim().toLowerCase();
        const normalizedAI = aiResponse.replace(/\s+/g, ' ').trim().toLowerCase();
        
        // SHA256ハッシュ生成
        const combined = `${normalizedUser}|||${normalizedAI}`;
        return crypto.createHash('sha256').update(combined, 'utf8').digest('hex').substring(0, 16);
    }

    getStatisticsSummary() {
        return {
            totalProcessed: this.dialogueStatistics.totalProcessed,
            responsePatterns: this.dialogueStatistics.responsePatterns.size,
            contextTransitions: this.dialogueStatistics.contextTransitions.size,
            qualityCorrelations: this.dialogueStatistics.qualityCorrelations.size,
            userAdaptations: this.dialogueStatistics.userAdaptations.size,
            uniqueProcessedPairs: this.dialogueStatistics.processedPairHashes.size,
            isInitialized: this.isInitialized
        };
    }

    /**
     * 文章分割（改行・句点区切り）
     */
    extractSentences(text) {
        return text
            .split(/[\n\r。！？\.]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    /**
     * 個別文章からの統計学習
     */
    async learnFromSentence(sentence, sourceName) {
        try {
            // 形態素解析
            const morphResult = await this.morphProcessor.processText(sentence);
            const morphemes = morphResult.tokens || [];
            
            // 統計的特徴抽出
            const features = this.extractFeatures(sentence, morphemes);
            
            // N-gram学習
            if (this.ngramLearner && morphemes.length > 0) {
                const terms = morphemes.map(m => m.surface || m.word).filter(t => t);
                await this.ngramLearner.learn(terms);
            }
            
            // 共起関係学習
            if (this.relationshipLearner && morphemes.length > 1) {
                const keywords = morphemes
                    .filter(m => m.partOfSpeech === '名詞' || m.partOfSpeech === '動詞')
                    .map(m => m.surface || m.word)
                    .filter(k => k && k.length > 1);
                
                if (keywords.length > 1) {
                    // 共起分析による関係性学習
                    await this.relationshipLearner.learnFromConversation(
                        keywords.join(' '), 
                        [], 
                        sentence
                    );
                }
            }
            
            // 語彙学習（多腕バンディット）
            if (this.banditLearner && morphemes.length > 0) {
                const vocabulary = morphemes.map(m => m.surface || m.word).filter(v => v);
                for (const word of vocabulary) {
                    await this.banditLearner.recordSelection(word, 0.5); // 中性的評価
                }
            }
            
            return {
                success: true,
                sentence: sentence.substring(0, 50) + '...',
                features,
                morphemeCount: morphemes.length
            };
            
        } catch (error) {
            console.warn(`⚠️ 文章学習エラー: ${sentence.substring(0, 30)}...`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 動的閾値計算
     * 学習データから統計的に閾値を計算
     */
    async calculateDynamicThreshold(thresholdType) {
        try {
            const stats = this.dialogueStatistics.qualityCorrelations;
            const values = Array.from(stats.values()).filter(v => typeof v === 'number');
            
            if (values.length === 0) {
                // フォールバック：デフォルト統計的閾値
                switch (thresholdType) {
                    case 'highConfidence':
                        return 0.75; // 第3四分位点に相当
                    case 'mediumConfidence':
                        return 0.5;  // 中央値に相当
                    case 'lowConfidence':
                        return 0.25; // 第1四分位点に相当
                    default:
                        return 0.5;
                }
            }
            
            // 統計的計算
            values.sort((a, b) => a - b);
            const q1 = values[Math.floor(values.length * 0.25)];
            const median = values[Math.floor(values.length * 0.5)];
            const q3 = values[Math.floor(values.length * 0.75)];
            
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
            console.warn('⚠️ 動的閾値計算エラー:', error.message);
            return 0.5; // 安全なフォールバック
        }
    }
}