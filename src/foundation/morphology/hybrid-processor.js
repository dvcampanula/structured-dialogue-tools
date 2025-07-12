/**
 * EnhancedHybridLanguageProcessor v7.2
 * kuromoji + MeCab + Word2Vec意味類似度統合システム
 * Phase 6H最終実装: 対話型AI品質向上のための最高品質概念抽出
 */

import kuromoji from 'kuromoji';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const mecab = require('@enjoyjs/node-mecab');

export class EnhancedHybridLanguageProcessor {
    constructor() {
        this.kuromoji = null;
        this.mecab = mecab;
        
        this.isInitialized = false;
        this.lastKuromojiTokenCount = 0;
        this.kuromojiTokens = [];
        
        

        // MeCab品詞フィルター
        this.mecabTechnicalFilters = [
            '名詞,固有名詞', // 固有名詞（製品名・技術名）
            '名詞,サ変接続', // サ変動詞（プログラミング、データベース等）
            '名詞,一般', // 一般名詞（技術用語多数）
            '名詞,英語', // 英語由来
        ];
    }

    /**
     * 初期化処理
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🧬 EnhancedHybridLanguageProcessor初期化中...');
            
            // kuromoji初期化
            this.kuromoji = await new Promise((resolve, reject) => {
                kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
                    if (err) reject(err);
                    else resolve(tokenizer);
                });
            });

            // MeCab動作確認
            const mecabTest = await this.mecab.analyze('テスト');
            if (!mecabTest) throw new Error('MeCab response empty');

            this.isInitialized = true;
            console.log('✅ EnhancedHybridLanguageProcessor初期化完了');
            console.log('🔧 kuromoji + MeCab + 軽量拡張 統合システム ready');
        } catch (error) {
            console.error('❌ EnhancedHybridLanguageProcessor初期化エラー:', error.message);
            throw error;
        }
    }

    /**
     * 拡張ハイブリッド処理（メイン処理）
     */
    async processText(text, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const {
            enableMeCab = true,
            enableGrouping = true,
            similarityThreshold = 0.3,
            qualityThreshold = 0.7
        } = options;

        try {
            const startTime = Date.now();

            // 1. 並列解析実行
            const [kuromojiResult, mecabResult] = await Promise.all([
                this.analyzeWithKuromoji(text),
                enableMeCab ? this.analyzeWithMeCab(text) : null
            ]);
            this.lastKuromojiTokenCount = kuromojiResult.tokens.length;
            this.kuromojiTokens = kuromojiResult.tokens;

            // 2. 技術用語抽出（統合版）
            const enhancedTerms = this.extractEnhancedTechnicalTerms(
                kuromojiResult.tokens,
                mecabResult?.tokens || [],
                text
            );

            // 3. 品質評価・フィルタリング
            const qualityFilteredTerms = this.filterByQuality(enhancedTerms, qualityThreshold);

            // 4. 概念グループ化（意味的類似度強化）
            const conceptGroups = enableGrouping ? 
                await this.groupSimilarConceptsEnhanced(qualityFilteredTerms.map(t => t.term), similarityThreshold) : {};

            // 5. 関係性分析
            const relationships = this.analyzeTermRelationships(text, qualityFilteredTerms.map(t => t.term));

            // 6. 概念関係性最適化（Phase 3） - 削除済み

            // 7. 統合結果生成
            return {
                originalText: text,
                kuromojiAnalysis: kuromojiResult,
                mecabAnalysis: mecabResult,
                enhancedTerms: qualityFilteredTerms,
                conceptGroups,
                relationships,
                statistics: {
                    totalTokens: kuromojiResult.tokens.length,
                    mecabTokens: mecabResult?.tokens.length || 0,
                    enhancedTermCount: qualityFilteredTerms.length,
                    conceptGroupCount: Object.keys(conceptGroups).length,
                    relationshipCount: relationships.length,
                    processingTime: Date.now() - startTime,
                    qualityScore: this.calculateOverallQuality(qualityFilteredTerms, conceptGroups, relationships)
                }
            };
        } catch (error) {
            console.error('❌ 拡張ハイブリッド処理エラー:', error.message);
            throw error;
        }
    }

    /**
     * kuromoji解析
     */
    async analyzeWithKuromoji(text) {
        const tokens = this.kuromoji.tokenize(text);
        console.log('Kuromoji tokens:', tokens);
        return {
            engine: 'kuromoji',
            tokens: tokens.map(token => ({
                surface: token.surface_form,
                partOfSpeech: token.pos || 'unknown',
                features: (token.pos || '').split(','),
                reading: token.reading || '',
                pronunciation: token.pronunciation || ''
            }))
        };
    }

    /**
     * MeCab解析
     */
    async analyzeWithMeCab(text) {
        try {
            const result = await this.mecab.analyze(text);
            const lines = result.split('\n').filter(line => line.trim() && line !== 'EOS');
            
            const tokens = lines.map(line => {
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    const features = parts[1].split(',');
                    return {
                        surface: parts[0],
                        partOfSpeech: parts[1],
                        features,
                        category: features[0] || '',
                        subCategory: features[1] || '',
                        reading: features[6] || '',
                        pronunciation: features[7] || ''
                    };
                }
                return null;
            }).filter(Boolean);

            return {
                engine: 'MeCab',
                tokens
            };
        } catch (error) {
            console.warn('⚠️ MeCab解析エラー:', error.message);
            return null;
        }
    }

    /**
     * 拡張技術用語抽出（kuromoji + MeCab統合）
     */
    extractEnhancedTechnicalTerms(kuromojiTokens, mecabTokens, originalText) {
        const termMap = new Map();

        // MeCab由来の用語（高品質）
        for (const token of mecabTokens) {
            // MeCabの品詞情報に基づいて技術用語を抽出
            if (this.mecabTechnicalFilters.some(filter => token.partOfSpeech.startsWith(filter))) {
                termMap.set(token.surface, {
                    term: token.surface,
                    sources: ['MeCab'],
                    kuromojiInfo: null,
                    mecabInfo: token,
                    confidence: 0.9, // MeCab由来は高信頼度
                    category: token.category // MeCabのカテゴリをそのまま利用
                });
            }
        }

        // kuromoji由来の用語（補完）
        for (const token of kuromojiTokens) {
            // MeCabで抽出されなかったが、kuromojiで名詞として認識された用語を補完
            if (!termMap.has(token.surface) && token.partOfSpeech === '名詞') {
                termMap.set(token.surface, {
                    term: token.surface,
                    sources: ['kuromoji'],
                    kuromojiInfo: token,
                    mecabInfo: null,
                    confidence: 0.5, // kuromoji由来は中信頼度
                    category: token.partOfSpeech // kuromojiの品詞をカテゴリとして利用
                });
            }
        }

        // 複合語検出・統合
        this.detectCompoundTerms(originalText, termMap);

        return Array.from(termMap.values());
    }

    /**
     * 複合語検出・統合
     * 連続する名詞や技術用語を複合語として検出・統合
     */
    detectCompoundTerms(originalText, termMap) {
        const terms = Array.from(termMap.values());
        const compoundTerms = [];
        
        // 位置でソート
        terms.sort((a, b) => a.position - b.position);
        
        for (let i = 0; i < terms.length - 1; i++) {
            const currentTerm = terms[i];
            const nextTerm = terms[i + 1];
            
            // 連続する技術用語または名詞の検出
            if (this.isConsecutive(currentTerm, nextTerm) && 
                this.shouldCombine(currentTerm, nextTerm)) {
                
                const combinedTerm = {
                    term: currentTerm.term + nextTerm.term,
                    position: currentTerm.position,
                    length: currentTerm.length + nextTerm.length,
                    confidence: Math.min(currentTerm.confidence, nextTerm.confidence),
                    source: 'compound',
                    originalTerms: [currentTerm.term, nextTerm.term]
                };
                
                compoundTerms.push(combinedTerm);
                
                // 元の用語を削除して複合語を追加
                termMap.delete(currentTerm.term);
                termMap.delete(nextTerm.term);
                termMap.set(combinedTerm.term, combinedTerm);
                
                // 次の項目をスキップ
                i++;
            }
        }
        
        return compoundTerms;
    }

    /**
     * 連続する用語かチェック
     */
    isConsecutive(term1, term2) {
        return (term1.position + term1.length) === term2.position;
    }

    /**
     * 結合すべき用語かチェック
     */
    shouldCombine(term1, term2) {
        // 両方とも技術用語または名詞の場合に結合
        const technicalSources = ['kuromoji_tech', 'mecab_tech'];
        const nounSources = ['kuromoji_noun', 'mecab_noun'];
        
        return (technicalSources.includes(term1.source) && technicalSources.includes(term2.source)) ||
               (nounSources.includes(term1.source) && nounSources.includes(term2.source)) ||
               (term1.term.length >= 3 && term2.term.length >= 3); // 長い用語同士
    }

    /**
     * 品質フィルタリング
     */
    filterByQuality(terms, threshold = 0.7) {
        return terms
            .filter(term => term.confidence >= threshold)
            .sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * 概念グループ化（意味的類似度強化版）
     */
    async groupSimilarConceptsEnhanced(terms, stringThreshold = 0.3) {
        // EnhancedSemanticEngineV2への依存を削除し、常に文字列ベースのグループ化を使用
        return this.groupSimilarConceptsByStringSimilarity(terms, stringThreshold);
    }

    /**
     * 概念グループ化（文字列類似度ベース - hybrid-language-processor.js統合）
     */
    groupSimilarConceptsByStringSimilarity(concepts, threshold = 0.3) {
        const groups = {};
        
        for (const concept of concepts) {
            let grouped = false;
            
            // 既存グループとの類似度チェック
            for (const [groupKey, groupMembers] of Object.entries(groups)) {
                const similarity = this.calculateStringSimilarity(concept, groupKey);
                if (similarity > threshold) {
                    groupMembers.push(concept);
                    grouped = true;
                    break;
                }
            }
            
            // 新しいグループ作成
            if (!grouped) {
                groups[concept] = [concept];
            }
        }

        return groups;
    }

    /**
     * 概念グループ化（従来版）
     */
    groupSimilarConcepts(terms, threshold = 0.3) {
        return this.groupSimilarConceptsEnhanced(terms, threshold, false, 0.7);
    }

    /**
     * 文字列類似度計算
     */
    calculateStringSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0 || len2 === 0) return 0.0;

        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        const maxLen = Math.max(len1, len2);
        return 1 - matrix[len2][len1] / maxLen;
    }

    /**
     * 用語関係性分析
     */
    analyzeTermRelationships(text, terms) {
        const relationships = [];
        
        for (let i = 0; i < terms.length; i++) {
            for (let j = i + 1; j < terms.length; j++) {
                const term1 = terms[i];
                const term2 = terms[j];
                
                const relationship = this.calculateTermRelationship(text, term1, term2);
                if (relationship.strength > 0.3) {
                    relationships.push(relationship);
                }
            }
        }

        return relationships.sort((a, b) => b.strength - a.strength);
    }

    /**
     * 用語間関係性計算
     */
    calculateTermRelationship(text, term1, term2) {
        const term1Indexes = this.findAllIndexes(text, term1);
        const term2Indexes = this.findAllIndexes(text, term2);
        
        let minDistance = Infinity;
        
        for (const index1 of term1Indexes) {
            for (const index2 of term2Indexes) {
                const distance = Math.abs(index1 - index2);
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
        }
        
        const strength = minDistance === Infinity ? 0 : Math.max(0, 1 - minDistance / 200);
        
        return {
            term1,
            term2,
            distance: minDistance,
            strength: parseFloat(strength.toFixed(3)),
            type: strength > 0.7 ? 'strong' : strength > 0.4 ? 'moderate' : 'weak'
        };
    }

    /**
     * 文字列の全出現位置取得
     */
    findAllIndexes(text, searchTerm) {
        const indexes = [];
        let index = text.indexOf(searchTerm);
        
        while (index !== -1) {
            indexes.push(index);
            index = text.indexOf(searchTerm, index + 1);
        }
        
        return indexes;
    }

    /**
     * 総合品質スコア計算（関係性最適化統合版）
     */
    calculateOverallQuality(terms, conceptGroups = {}, relationships = []) {
        if (terms.length === 0) return 0;
        
        // 基本スコア計算
        const avgConfidence = terms.reduce((sum, term) => sum + term.confidence, 0) / terms.length;
        const mecabRatio = terms.filter(term => term.sources.includes('MeCab')).length / terms.length;
        const diversityScore = new Set(terms.map(term => term.category)).size / 5; // 最大5カテゴリを想定
        
        const baseScore = avgConfidence * 0.25 + mecabRatio * 0.15 + diversityScore * 0.1;
        
        return parseFloat(Math.min(1.0, baseScore).toFixed(3));
    }
    
    

    /**
     * 類似用語発見（hybrid-language-processor.js統合）
     */
    findSimilarTerms(targetTerm, termList, threshold = 0.4) {
        const similarTerms = [];

        for (const term of termList) {
            if (term !== targetTerm) {
                const similarity = this.calculateStringSimilarity(targetTerm, term);
                if (similarity > threshold) {
                    similarTerms.push({
                        term,
                        similarity: parseFloat(similarity.toFixed(3))
                    });
                }
            }
        }

        return similarTerms.sort((a, b) => b.similarity - a.similarity);
    }

    

    

    /**
     * 概念の類似度情報付与（hybrid-language-processor.js統合）
     */
    enhanceConceptsWithSimilarity(tokens, technicalTerms) {
        const enhancedConcepts = [];

        for (const token of tokens) {
            const surface = token.surface || token.surface_form;
            const concept = {
                surface: surface,
                partOfSpeech: token.partOfSpeech || token.part_of_speech || 'unknown',
                isTechnical: technicalTerms.includes(surface),
                similarTerms: []
            };

            // 類似概念発見
            concept.similarTerms = this.findSimilarTerms(
                surface, 
                technicalTerms
            );

            enhancedConcepts.push(concept);
        }

        return enhancedConcepts;
    }

    /**
     * システム統計情報
     */
    getStatistics() {
        return {
            version: '7.4.0',
            isInitialized: this.isInitialized,
            engines: ['kuromoji', 'MeCab'],
            capabilities: [
                'kuromoji形態素解析',
                'MeCab詳細品詞解析',
                '拡張技術用語抽出',
                '品質評価・フィルタリング',
                '意味的類似度概念グループ化v2.0',
                '関係性分析',
                '複合語検出',
                'ドメイン特化類似度計算',
                '動的閾値調整',
                '文字列類似度計算（hybrid統合）',
                '類似用語発見（hybrid統合）',
                '概念強化（hybrid統合）'
            ],
        };
    }

    /**
     * 統計情報取得 (getStatsとして公開)
     */
    getStats() {
        return this.getStatistics();
    }

    /**
     * キーワード抽出メソッド (AIVocabularyProcessor用)
     * @param {string} text - 解析対象テキスト
     * @returns {Promise<Array<string>>} 抽出されたキーワードの配列
     */
    async extractKeywords(text) {
        if (!text || typeof text !== 'string') return [];
        
        try {
            const result = await this.processText(text, {
                enableMeCab: true,
                enableSimilarity: false,
                enableGrouping: false,
                enableRelationshipOptimization: false,
            });
            
            // enhancedTermsからキーワードを抽出
            return result.enhancedTerms ? result.enhancedTerms.map(term => term.term) : [];
        } catch (error) {
            console.warn('⚠️ キーワード抽出エラー:', error.message);
            return [];
        }
    }
}

