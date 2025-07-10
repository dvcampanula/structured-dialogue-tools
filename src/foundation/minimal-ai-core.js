#!/usr/bin/env node
/**
 * MinimalAICore - 育てる自家製ミニマムAI
 *
 * 🌱 LLM不要の軽量・高速・プライベート対話支援AI
 * 🧠 75概念学習DB + 動的学習による成長型AI
 * 🎯 構造的対話特化・個人特化・完全ローカル
 *
 * 技術的キメラ: 7つの技術の独自組み合わせ
 * - 形態素解析 + 統計分析 + パターンマッチング
 * - 動的学習 + テンプレート応答 + 個人特化
 * - 軽量知識グラフ
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { EnhancedHybridLanguageProcessor } from '../processing/enhanced-hybrid-processor.js';
import { enhancedResponseGenerationEngineV2 } from '../response/enhanced-response-generation-engine-v2.js';
// 対話フェーズ予測AI（統計+ルールベース）
class DialoguePhasePredictor {
    phasePatterns = new Map([
        ['analysis', ['分析', '理解', '調査', '確認', 'どうやって', 'なぜ', '問題']],
        ['design', ['設計', '構造', 'アーキテクチャ', '方針', '計画', 'どのように', '戦略']],
        ['implementation', ['実装', 'コード', '作成', '構築', 'やってみる', '試す', '開始']],
        ['reflection', ['振り返り', '改善', '学習', '次回', 'まとめ', '感想', '評価']]
    ]);
    predict(text) {
        const scores = new Map();
        // 各フェーズのスコア計算
        for (const [phase, keywords] of this.phasePatterns) {
            let score = 0;
            for (const keyword of keywords) {
                const count = (text.match(new RegExp(keyword, 'g')) || []).length;
                score += count;
            }
            scores.set(phase, score);
        }
        // 最高スコアのフェーズを選択
        const maxScore = Math.max(...scores.values());
        const predictedPhase = Array.from(scores.entries()).find(([_, score]) => score === maxScore)?.[0] || 'analysis';
        const confidence = maxScore > 0 ? Math.min(maxScore / 10, 1.0) : 0.3;
        return { phase: predictedPhase, confidence };
    }
}
// ローカル概念関連性エンジン（API不要の瞬時推薦）
class LocalConceptEngine {
    conceptGraph = new Map(); // キー: 概念名 (string), 値: 概念オブジェクト (object)
    constructor(concepts) {
        // 概念グラフ構築
        for (const concept of concepts) {
            this.conceptGraph.set(concept.name, concept); // 概念オブジェクト全体を保存
        }
    }
    getRelatedConcepts(inputConceptName, maxResults = 5) {
        const concept = this.conceptGraph.get(inputConceptName);
        if (!concept || !concept.relatedConcepts) {
            return [];
        }
        const related = [];
        for (const relatedName of concept.relatedConcepts) {
            const relatedConcept = this.conceptGraph.get(relatedName);
            if (relatedConcept) {
                related.push(relatedConcept);
            }
        }
        return related.slice(0, maxResults);
    }
    async findConceptsInText(text, languageProcessor = null) {
        // Enhanced版: 形態素解析ベース概念抽出
        if (languageProcessor) {
            try {
                const analysisResult = await languageProcessor.processText(text, {
                    enableMeCab: true,
                    enableSimilarity: true,
                    enableSemanticSimilarity: true,
                    enableGrouping: true,
                    enableRelationshipOptimization: false
                });

                const detected = new Set();

                // 1. EnhancedHybridLanguageProcessorによって抽出された用語を優先
                for (const termInfo of analysisResult.enhancedTerms) {
                    const term = termInfo.term;
                    // 概念グラフに存在するか、または事前定義された技術用語リストに含まれるか
                    if (this.conceptGraph.has(term)) {
                        detected.add(this.conceptGraph.get(term)); // 概念オブジェクトを保存
                    }
                }

                // 2. 既存の概念グラフ内の用語で、入力テキストに直接含まれるものを追加
                //    これにより、analysisResult.enhancedTermsで検出されなかったが、
                //    概念グラフにあり、かつ入力テキストに存在する用語を拾う
                const normalizedText = text.toLowerCase();
                for (const conceptObj of this.conceptGraph.values()) { // values()で概念オブジェクトを取得
                    if (normalizedText.includes(conceptObj.name.toLowerCase())) {
                        detected.add(conceptObj); // 概念オブジェクトを保存
                    }
                }

                // 3. 検出された概念をフィルタリングし、優先順位付け
                const finalConcepts = Array.from(detected).filter(c => {
                    // 短すぎる概念や一般的な助詞などを除外
                    return c.name.length > 1 && !['の', 'は', 'が', 'を', 'に', 'で', 'と', 'も', 'です', 'ます'].includes(c.name);
                });

                // 優先順位付け: 長い概念を優先し、次にアルファベット順
                const sortedConcepts = finalConcepts.sort((a, b) => {
                    if (b.name.length !== a.name.length) {
                        return b.name.length - a.name.length;
                    }
                    return a.name.localeCompare(b.name);
                });

                console.log(`🔍 Enhanced概念検出: ${sortedConcepts.length}件 - ${sortedConcepts.map(c => c.name).join(', ')}`);
                return sortedConcepts.slice(0, 8); // 上位8件に制限
            } catch (error) {
                console.warn('⚠️ Enhanced概念抽出エラー、フォールバック使用:', error.message);
            }
        }
        
        // フォールバック: 従来の文字列マッチング
        const found = [];
        const normalizedText = text.toLowerCase().replace(/[。、！？\s\-]/g, '');
        
        for (const conceptObj of this.conceptGraph.values()) { // values()で概念オブジェクトを取得
            const conceptName = conceptObj.name;
            const normalizedConcept = conceptName.toLowerCase().replace(/[。、！？\s\-]/g, '');
            if (normalizedText.includes(normalizedConcept) && normalizedConcept.length > 1) {
                found.push(conceptObj); // 概念オブジェクトを保存
            }
            else if (conceptName.length > 3) {
                const conceptParts = conceptName.split(/[\s\-]/).filter(part => part.length > 2);
                if (conceptParts.some(part => normalizedText.includes(part.toLowerCase()))) {
                    found.push(conceptObj); // 概念オブジェクトを保存
                }
            }
        }
        
        const uniqueFound = [...new Set(found)];
        return uniqueFound.sort((a, b) => b.name.length - a.name.length).slice(0, 8);
    }
}
// AI応答生成器（Enhanced v2.0統合）
class EnhancedAIResponseGenerator {
    async generate(phase, concepts, userInput, conversationHistory = [], relevantConcepts = []) {
        // Enhanced ResponseGenerationEngine v2.0を使用した真のAI応答生成
        try {
            // 学習済み概念の統合
            const enhancedConcepts = [...concepts];
            
            // 関連概念から高い関連度のものを統合
            for (const relevantConcept of relevantConcepts) {
                if (relevantConcept.relevanceScore > 0.6) {
                    enhancedConcepts.push({
                        name: relevantConcept.concept.name || relevantConcept.concept,
                        category: relevantConcept.concept.category || 'general',
                        confidence: relevantConcept.relevanceScore,
                        context: relevantConcept.context,
                        source: 'learned'
                    });
                }
            }
            
            const controlResult = {
            contextAnalysis: { 
                contextualEntities: { concepts: enhancedConcepts }, 
                conversationHistory: conversationHistory,
                learnedConcepts: relevantConcepts // 学習済み概念情報を追加
            },
            intentAnalysis: { primaryIntent: { type: phase, confidence: 1.0 } },
            flowControl: {},
            dialogueStrategy: { 
                primaryStrategy: enhancedConcepts.some(c => c.category === 'technical' || c.category === 'programming' || c.category === 'technology') ? 'technical' : 'general' 
            },
            personalizedStrategy: {},
            responseGuidance: {
                useLearnedConcepts: relevantConcepts.length > 0,
                conceptIntegration: relevantConcepts.length > 0 ? 'adaptive' : 'standard'
            }
        };

        const result = await enhancedResponseGenerationEngineV2.generateUnifiedResponse(
            userInput,
            controlResult,
            {} // userProfileは空オブジェクトで渡す
        );
            return result.response;
        } catch (error) {
            console.warn('Enhanced v2.0エラー:', error.message);
            // 学習済み概念を活用したフォールバック
            if (relevantConcepts.length > 0) {
                const mainConcept = relevantConcepts[0].concept.name || relevantConcepts[0].concept;
                const context = relevantConcepts[0].context || '';
                return `${mainConcept}について${context ? `（${context}）` : ''}、学習した内容を踏まえてお答えします。どのような点について詳しく知りたいでしょうか？`;
            } else {
                const mainConcept = concepts[0] || 'このテーマ';
                return `${mainConcept}について、さらに詳しくお話ししましょう。どのような点に特に興味をお持ちでしょうか？`;
            }
        }
    }
}
// 育てる自家製ミニマムAI メインクラス
export class MinimalAICore {
    conceptDB;
    phasePredictor;
    conceptEngine;
    responseGenerator;
    languageProcessor;
    constructor() {
        this.phasePredictor = new DialoguePhasePredictor();
        this.responseGenerator = new EnhancedAIResponseGenerator();
        this.languageProcessor = new EnhancedHybridLanguageProcessor();
    }
    async initialize() {
        console.log('🤖 MinimalAICore初期化開始...');
        
        // EnhancedHybridLanguageProcessor初期化
        await this.languageProcessor.initialize();
        console.log('✅ 言語処理エンジン初期化完了');
        
        // EnhancedResponseGenerationEngineV2初期化
        await enhancedResponseGenerationEngineV2.initialize();
        console.log('✅ 応答生成エンジン初期化完了');
        
        // 軽量化概念DB読み込み
        await this.loadMinimalConceptDB();
        console.log('✅ 概念DB読み込み完了');
        
        // ローカル概念エンジン初期化
        const allConcepts = [...this.conceptDB.concepts.surface, ...this.conceptDB.concepts.deep];
        this.conceptEngine = new LocalConceptEngine(allConcepts);
        console.log('✅ 概念エンジン初期化完了');
        
        console.log('🚀 MinimalAICore初期化完了');
    }
    async loadMinimalConceptDB() {
        try {
            // 既存の75概念DBから軽量版抽出
            const fullDBPath = path.join(process.cwd(), 'data', 'learning', 'concept-analysis-db.json');
            const fullDB = JSON.parse(await fs.readFile(fullDBPath, 'utf-8'));
            // 軽量化変換
            this.conceptDB = this.convertToMinimalDB(fullDB);
        }
        catch (error) {
            // フォールバック: 基本概念セット
            this.conceptDB = this.createFallbackDB();
        }
    }
    convertToMinimalDB(fullDB) {
        const surfaceConcepts = [];
        const deepConcepts = [];
        
        // 事前定義された技術用語を追加
        const predefinedTechnicalTerms = [
            { name: 'JavaScript', frequency: 10, contexts: ['programming', 'web'], relatedConcepts: ['TypeScript', 'Node.js'], confidence: 0.95 },
            { name: 'API', frequency: 12, contexts: ['programming', 'web', 'system'], relatedConcepts: ['REST', 'GraphQL'], confidence: 0.9 },
            { name: 'Python', frequency: 8, contexts: ['programming', 'data_science'], relatedConcepts: ['Django', 'Flask'], confidence: 0.9 },
            { name: 'AI', frequency: 15, contexts: ['general', 'technology'], relatedConcepts: ['機械学習', 'ディープラーニング'], confidence: 0.98 },
            { name: '機械学習', frequency: 13, contexts: ['technology', 'data_science'], relatedConcepts: ['AI', 'アルゴリズム'], confidence: 0.95 },
            { name: 'ディープラーニング', frequency: 11, contexts: ['technology', 'AI'], relatedConcepts: ['ニューラルネットワーク', 'CNN'], confidence: 0.92 },
            { name: 'Node.js', frequency: 9, contexts: ['programming', 'backend'], relatedConcepts: ['JavaScript', 'Express'], confidence: 0.9 },
            { name: 'React', frequency: 8, contexts: ['programming', 'frontend'], relatedConcepts: ['JavaScript', 'Vue'], confidence: 0.88 },
            { name: 'Docker', frequency: 7, contexts: ['devops', 'container'], relatedConcepts: ['Kubernetes', 'マイクロサービス'], confidence: 0.85 },
            { name: 'Kubernetes', frequency: 6, contexts: ['devops', 'orchestration'], relatedConcepts: ['Docker', 'クラウド'], confidence: 0.83 },
            { name: 'マイクロサービス', frequency: 5, contexts: ['architecture', 'devops'], relatedConcepts: ['Docker', 'Kubernetes'], confidence: 0.8 },
            { name: 'Webアプリケーション', frequency: 7, contexts: ['web', 'frontend', 'backend'], relatedConcepts: ['React', 'Node.js'], confidence: 0.88 },
            { name: 'アーキテクチャ', frequency: 5, contexts: ['system_design'], relatedConcepts: ['設計', '構造'], confidence: 0.8 }
        ];
        predefinedTechnicalTerms.forEach(term => {
            this.addOrUpdateConcept(surfaceConcepts, term.name, term.contexts[0], term.frequency, term.relatedConcepts, term.confidence);
        });
        // 全ログから概念を抽出し統計化
        for (const [logKey, analysis] of Object.entries(fullDB.analysisHistory)) {
            const analysisData = analysis;
            // 表面概念
            for (const concept of analysisData.surfaceConcepts || []) {
                this.addOrUpdateConcept(surfaceConcepts, concept, analysisData.dialogueType || '');
            }
            // 深層概念
            for (const concept of analysisData.deepConcepts || []) {
                this.addOrUpdateConcept(deepConcepts, concept, analysisData.dialogueType || '');
            }
        }
        return {
            totalConcepts: surfaceConcepts.length + deepConcepts.length,
            lastUpdated: new Date().toISOString(),
            concepts: { surface: surfaceConcepts, deep: deepConcepts },
            patterns: this.extractDialoguePatterns(),
            personalLearning: []
        };
    }
    addOrUpdateConcept(concepts, conceptName, context, frequency = 1, relatedConcepts = [], confidence = 0.7) {
        const existing = concepts.find(c => c.name === conceptName);
        if (existing) {
            existing.frequency = (existing.frequency || 0) + frequency;
            if (!existing.contexts.includes(context)) {
                existing.contexts.push(context);
            }
            existing.relatedConcepts = [...new Set([...existing.relatedConcepts, ...relatedConcepts])];
            existing.confidence = Math.max(existing.confidence, confidence);
        }
        else {
            concepts.push({
                name: conceptName,
                frequency: frequency,
                contexts: [context],
                relatedConcepts: relatedConcepts,
                confidence: confidence
            });
        }
    }
    extractDialoguePatterns() {
        return [
            {
                phase: 'analysis',
                indicators: ['分析', '理解', '調査'],
                nextPhaseHints: ['設計', '構造化', '計画'],
                responseTemplates: ['分析を深めていきましょう', '詳しく見てみます']
            },
            {
                phase: 'implementation',
                indicators: ['実装', '作成', '構築'],
                nextPhaseHints: ['テスト', '検証', '改善'],
                responseTemplates: ['実装を進めていきます', '段階的に構築します']
            }
        ];
    }
    createFallbackDB() {
        return {
            totalConcepts: 20,
            lastUpdated: new Date().toISOString(),
            concepts: {
                surface: [
                    { name: '構造的対話', frequency: 10, contexts: ['technical'], relatedConcepts: ['AI', 'プロンプト'], confidence: 0.9 },
                    { name: 'AI', frequency: 15, contexts: ['technical'], relatedConcepts: ['対話', '知識'], confidence: 0.95 }
                ],
                deep: [
                    { name: 'セーブデータ理論', frequency: 5, contexts: ['conceptual'], relatedConcepts: ['継続性', '文脈'], confidence: 0.8 }
                ]
            },
            patterns: this.extractDialoguePatterns(),
            personalLearning: []
        };
    }
    // メイン処理: ミニマムAI応答生成
    async generateResponse(userInput) {
        console.log(`🎯 generateResponse開始: "${userInput}"`);
        
        // 1. 対話フェーズ予測
        const phaseResult = this.phasePredictor.predict(userInput);
        console.log(`📊 フェーズ予測: ${phaseResult.phase} (信頼度: ${phaseResult.confidence})`);
        
        // 2. 概念抽出（Enhanced版使用）
        const detectedConcepts = await this.conceptEngine.findConceptsInText(userInput, this.languageProcessor);
        console.log(`🔍 検出概念: ${detectedConcepts.length}件`);
        
        // 3. 学習済み関連概念の検索
        console.log(`🎯 学習済み概念検索開始...`);
        const relevantConcepts = await this.findRelevantConcepts(userInput);
        console.log(`🎯 学習済み概念検索完了: ${relevantConcepts.length}件`);
        
        // 4. 関連概念推薦
        const suggestedConcepts = [];
        for (const concept of detectedConcepts) {
            const related = this.conceptEngine.getRelatedConcepts(concept, 3);
            suggestedConcepts.push(...related);
        }
        
        // 5. AI応答生成（Enhanced v2.0 + 学習済み概念統合）
        const response = await this.responseGenerator.generate(phaseResult.phase, detectedConcepts, userInput, [], relevantConcepts);
        
        // 6. 学習シグナル検出
        const learningSignal = this.detectLearningOpportunity(userInput, detectedConcepts);
        
        return {
            response,
            confidence: phaseResult.confidence,
            detectedPhase: phaseResult.phase,
            suggestedConcepts: [...new Set(suggestedConcepts)].slice(0, 5),
            learningSignal,
            // Enhanced追加情報
            languageAnalysis: {
                conceptsDetected: detectedConcepts,
                processingMethod: this.languageProcessor ? 'enhanced' : 'fallback',
                processorStats: this.languageProcessor ? this.languageProcessor.getStatistics() : null
            }
        };
    }
    detectLearningOpportunity(input, concepts) {
        // 高品質対話の特徴検出
        const qualityIndicators = ['なぜなら', '具体的には', '例えば', '一方で', 'しかし'];
        const hasQualityIndicators = qualityIndicators.some(indicator => input.includes(indicator));
        if (hasQualityIndicators && concepts.length > 0) {
            return {
                shouldLearn: true,
                pattern: `${concepts[0]}_quality_dialogue`,
                quality: 0.8
            };
        }
        return undefined;
    }
    // 個人特化学習機能
    async learnFromFeedback(input, feedback, response) {
        if (feedback === 'positive') {
            const pattern = {
                trigger: input.slice(0, 50), // 最初の50文字をトリガーに
                preferredResponse: response,
                learningCount: 1,
                lastUsed: new Date().toISOString()
            };
            this.conceptDB.personalLearning.push(pattern);
            // 定期的な保存（実装簡素化のため省略）
            console.log('📚 個人特化パターン学習完了:', pattern.trigger);
        }
    }
    // 統計情報取得
    getStatistics() {
        return {
            totalConcepts: this.conceptDB.totalConcepts,
            learningPatterns: this.conceptDB.personalLearning.length,
            confidence: 0.85, // 動的計算（簡素化）
            // Enhanced言語処理統計
            languageProcessing: {
                isEnhanced: !!this.languageProcessor,
                processorStats: this.languageProcessor ? this.languageProcessor.getStatistics() : null
            }
        };
    }

    // 概念DB取得
    getConceptDB() {
        return this.conceptDB;
    }

    // DialogueController取得
    getDialogueController() {
        return this.dialogueController;
    }

    // 概念DB更新
    updateConceptDB(newConceptDB) {
        this.conceptDB = newConceptDB;
        
        // ローカル概念エンジンも更新
        const allConcepts = [...this.conceptDB.concepts.surface, ...this.conceptDB.concepts.deep];
        this.conceptEngine = new LocalConceptEngine(allConcepts);
        
        console.log(`📊 概念DB更新完了: ${this.conceptDB.totalConcepts}個の概念`);
    }

    // 関連概念検索エンジン
    async findRelevantConcepts(userInput) {
        const relevantConcepts = [];
        const allConcepts = [...this.conceptDB.concepts.surface, ...this.conceptDB.concepts.deep];
        
        console.log(`🔍 概念検索開始: "${userInput}" 対象概念数: ${allConcepts.length}`);
        
        // 1. 直接マッチング（概念名がユーザー入力に含まれる）
        for (const concept of allConcepts) {
            const conceptName = concept.name;
            if (userInput.includes(conceptName)) {
                relevantConcepts.push({
                    concept: concept,
                    matchType: 'direct',
                    relevanceScore: 1.0,
                    context: concept.context || ''
                });
                console.log(`✓ 直接マッチ: "${conceptName}"`);
            }
        }
        
        // 2. 逆マッチング（ユーザー入力のキーワードが概念名に含まれる）
        const userKeywords = userInput.split(/[。、！？\s]+/).filter(word => word.length > 1);
        for (const concept of allConcepts) {
            const conceptName = concept.name;
            const alreadyMatched = relevantConcepts.some(rc => rc.concept.name === conceptName);
            
            if (!alreadyMatched) {
                for (const keyword of userKeywords) {
                    if (conceptName.includes(keyword) && keyword.length > 1) {
                        relevantConcepts.push({
                            concept: concept,
                            matchType: 'reverse',
                            relevanceScore: 0.8,
                            context: concept.context || ''
                        });
                        console.log(`✓ 逆マッチ: "${conceptName}" <- "${keyword}"`);
                        break;
                    }
                }
            }
        }
        
        // 3. 部分マッチング（キーワードの一部が一致）
        for (const concept of allConcepts) {
            const conceptName = concept.name;
            const alreadyMatched = relevantConcepts.some(rc => rc.concept.name === conceptName);
            
            if (!alreadyMatched && conceptName.length > 2) {
                for (const keyword of userKeywords) {
                    if (keyword.length > 2 && (
                        conceptName.includes(keyword.substring(0, 3)) ||
                        keyword.includes(conceptName.substring(0, Math.min(conceptName.length, 3)))
                    )) {
                        relevantConcepts.push({
                            concept: concept,
                            matchType: 'partial',
                            relevanceScore: 0.6,
                            context: concept.context || ''
                        });
                        console.log(`✓ 部分マッチ: "${conceptName}" <-> "${keyword}"`);
                        break;
                    }
                }
            }
        }
        
        // 3. 関連概念の展開
        for (const matchedConcept of relevantConcepts) {
            const relatedConcepts = matchedConcept.concept.relatedConcepts || [];
            for (const relatedName of relatedConcepts) {
                const relatedConcept = allConcepts.find(c => c.name === relatedName);
                if (relatedConcept) {
                    const alreadyMatched = relevantConcepts.some(rc => 
                        rc.concept.name === relatedName
                    );
                    if (!alreadyMatched) {
                        relevantConcepts.push({
                            concept: relatedConcept,
                            matchType: 'related',
                            relevanceScore: 0.5,
                            context: relatedConcept.context || ''
                        });
                    }
                }
            }
        }
        
        // 関連度順にソート
        relevantConcepts.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        console.log(`🔍 関連概念検索結果: ${relevantConcepts.length}件`);
        return relevantConcepts;
    }
}
