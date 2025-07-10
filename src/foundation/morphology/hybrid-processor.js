/**
 * EnhancedHybridLanguageProcessor v7.2
 * kuromoji + MeCab + Word2Vec意味類似度統合システム
 * Phase 6H最終実装: 対話型AI品質向上のための最高品質概念抽出
 */

import kuromoji from 'kuromoji';
import { createRequire } from 'module';
import { ConceptRelationshipOptimizer } from '../../engines/processing/concept-relationship-optimizer.js';

const require = createRequire(import.meta.url);
const mecab = require('@enjoyjs/node-mecab');

export class EnhancedHybridLanguageProcessor {
    constructor() {
        this.kuromoji = null;
        this.mecab = mecab;
        this.semanticSimilarity = new SemanticSimilarityEngine();
        // this.semanticEngineV2 = new EnhancedSemanticEngineV2(); // Removed
        this.relationshipOptimizer = new ConceptRelationshipOptimizer();
        this.isInitialized = false;
        this.lastKuromojiTokenCount = 0;
        this.kuromojiTokens = [];
        
        // 技術パターン（拡張版）
        this.technicalPatterns = [
            /[A-Z]{2,}/, // 大文字略語
            /\w+Script/, // Script系
            /\w+SQL/, // SQL系
            /\w+API/, // API関連
            /\w+Framework/, // フレームワーク
            /\w+Library/, // ライブラリ
            /-like$/, // ~like技術
            /^AI|ML|DL|CNN|RNN|LSTM|GAN/, // AI/ML用語
            /Database|SQL|NoSQL/, // DB関連
            /Web|App|Mobile/, // プラットフォーム
            /React|Vue|Angular|Node\.js/, // 具体的技術名
            /Docker|Kubernetes|AWS|Azure|GCP/, // インフラ関連
        ];

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
            enableSimilarity = true,
            enableSemanticSimilarity = true,
            enableGrouping = true,
            enableRelationshipOptimization = true,
            similarityThreshold = 0.3,
            semanticThreshold = 0.7,
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
                await this.groupSimilarConceptsEnhanced(qualityFilteredTerms.map(t => t.term), similarityThreshold, enableSemanticSimilarity, semanticThreshold) : {};

            // 5. 関係性分析
            const relationships = enableSimilarity ? 
                this.analyzeTermRelationships(text, qualityFilteredTerms.map(t => t.term)) : [];

            // 6. 概念関係性最適化（Phase 3）
            const relationshipOptimization = enableRelationshipOptimization ?
                this.relationshipOptimizer.optimizeConceptRelationships(
                    qualityFilteredTerms.map(t => t.term),
                    conceptGroups,
                    relationships
                ) : null;

            // 7. 統合結果生成
            return {
                originalText: text,
                kuromojiAnalysis: kuromojiResult,
                mecabAnalysis: mecabResult,
                enhancedTerms: qualityFilteredTerms,
                conceptGroups,
                relationships,
                relationshipOptimization,
                statistics: {
                    totalTokens: kuromojiResult.tokens.length,
                    mecabTokens: mecabResult?.tokens.length || 0,
                    enhancedTermCount: qualityFilteredTerms.length,
                    conceptGroupCount: Object.keys(conceptGroups).length,
                    relationshipCount: relationships.length,
                    hierarchicalStructures: relationshipOptimization ? Object.keys(relationshipOptimization.hierarchicalStructure).length : 0,
                    dependencyCount: relationshipOptimization ? relationshipOptimization.dependencyMap.dependencies.length : 0,
                    optimizationCount: relationshipOptimization ? relationshipOptimization.optimizations.length : 0,
                    relationshipQuality: relationshipOptimization ? relationshipOptimization.qualityMetrics.overallQuality : 0,
                    processingTime: Date.now() - startTime,
                    qualityScore: this.calculateOverallQuality(qualityFilteredTerms, conceptGroups, relationships, relationshipOptimization)
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

        // kuromoji由来の用語
        for (const token of kuromojiTokens) {
            if (this.isPatternMatch(token.surface)) {
                termMap.set(token.surface, {
                    term: token.surface,
                    sources: ['kuromoji'],
                    kuromojiInfo: token,
                    mecabInfo: null,
                    confidence: 0.7,
                    category: 'pattern_match'
                });
            }
        }

        // MeCab由来の用語（高品質）
        for (const token of mecabTokens) {
            if (this.isMeCabTechnicalTerm(token)) {
                const existing = termMap.get(token.surface);
                if (existing) {
                    // 既存用語の品質向上
                    existing.sources.push('MeCab');
                    existing.mecabInfo = token;
                    existing.confidence = Math.min(1.0, existing.confidence + 0.3);
                    existing.category = this.categorizeMeCabTerm(token);
                } else {
                    // 新規MeCab用語
                    termMap.set(token.surface, {
                        term: token.surface,
                        sources: ['MeCab'],
                        kuromojiInfo: null,
                        mecabInfo: token,
                        confidence: 0.9, // MeCab由来は高信頼度
                        category: this.categorizeMeCabTerm(token)
                    });
                }
            }
        }

        // 複合語検出・統合
        this.detectCompoundTerms(originalText, termMap);

        return Array.from(termMap.values());
    }

    /**
     * パターンマッチング判定
     */
    isPatternMatch(surface) {
        return this.technicalPatterns.some(pattern => pattern.test(surface));
    }

    /**
     * MeCab技術用語判定
     */
    isMeCabTechnicalTerm(token) {
        // 固有名詞は高確率で技術用語
        if (token.category === '名詞' && token.subCategory === '固有名詞') {
            return true;
        }

        // サ変接続（プログラミング、データベース等）
        if (token.category === '名詞' && token.subCategory === 'サ変接続') {
            return this.isTechnicalContext(token.surface);
        }

        // 一般名詞で技術的な単語
        if (token.category === '名詞' && token.subCategory === '一般') {
            return this.isTechnicalContext(token.surface);
        }

        // 英語由来の用語
        if (token.features.some(f => f.includes('英語'))) {
            return true;
        }

        return false;
    }

    /**
     * 技術文脈判定
     */
    isTechnicalContext(term) {
        const technicalKeywords = [
            'システム', 'データ', 'ネットワーク', 'サーバー', 'クライアント',
            'インターフェース', 'アプリケーション', 'プラットフォーム',
            'アルゴリズム', 'プログラム', 'ソフトウェア', 'ハードウェア',
            'セキュリティ', 'プロトコル', 'アーキテクチャ', 'フレームワーク',
            'ライブラリ', 'モジュール', 'コンポーネント', 'サービス'
        ];

        return technicalKeywords.some(keyword => term.includes(keyword)) ||
               /[A-Za-z]/.test(term) || // 英字含む
               term.length >= 4; // 長めの専門用語
    }

    /**
     * MeCab用語カテゴリ化
     */
    categorizeMeCabTerm(token) {
        if (token.subCategory === '固有名詞') {
            return 'proper_noun';
        } else if (token.subCategory === 'サ変接続') {
            return 'technical_action';
        } else {
            return 'general_technical';
        }
    }

    /**
     * 複合語検出
     */
    detectCompoundTerms(text, termMap) {
        const compoundPatterns = [
            /(\w+)\.js/, // JavaScript系ライブラリ
            /(\w+)Script/, // Script系言語
            /(\w+)DB|(\w+)Database/, // データベース系
            /(\w+)API/, // API系
            /(\w+)Framework/, // フレームワーク系
        ];

        for (const pattern of compoundPatterns) {
            const matches = text.matchAll(new RegExp(pattern, 'g'));
            for (const match of matches) {
                const fullTerm = match[0];
                if (!termMap.has(fullTerm) && fullTerm.length > 3) {
                    termMap.set(fullTerm, {
                        term: fullTerm,
                        sources: ['compound_detection'],
                        kuromojiInfo: null,
                        mecabInfo: null,
                        confidence: 0.8,
                        category: 'compound_term'
                    });
                }
            }
        }
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
    async groupSimilarConceptsEnhanced(terms, stringThreshold = 0.3, enableSemantic = true, semanticThreshold = 0.7) {
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
    calculateOverallQuality(terms, conceptGroups = {}, relationships = [], relationshipOptimization = null) {
        if (terms.length === 0) return 0;
        
        // 基本スコア計算
        const avgConfidence = terms.reduce((sum, term) => sum + term.confidence, 0) / terms.length;
        const mecabRatio = terms.filter(term => term.sources.includes('MeCab')).length / terms.length;
        const diversityScore = new Set(terms.map(term => term.category)).size / 5; // 最大5カテゴリを想定
        
        // 意味類似度統合スコア計算
        const semanticScore = this.calculateSemanticIntegrationScore(terms, conceptGroups, relationships);
        
        // 関係性最適化スコア計算（Phase 3追加）
        const relationshipScore = relationshipOptimization ? 
            this.calculateRelationshipOptimizationScore(relationshipOptimization) : 0;
        
        // 拡張品質スコア（関係性最適化統合）
        const baseScore = avgConfidence * 0.25 + mecabRatio * 0.15 + diversityScore * 0.1;
        const semanticEnhancement = semanticScore * 0.3;
        const relationshipEnhancement = relationshipScore * 0.2;
        
        const enhancedScore = baseScore + semanticEnhancement + relationshipEnhancement;
        
        return parseFloat(Math.min(1.0, enhancedScore).toFixed(3));
    }
    
    /**
     * 関係性最適化スコア計算
     */
    calculateRelationshipOptimizationScore(relationshipOptimization) {
        if (!relationshipOptimization) return 0;
        
        const qualityMetrics = relationshipOptimization.qualityMetrics;
        const hierarchyCount = Object.keys(relationshipOptimization.hierarchicalStructure).length;
        const dependencyCount = relationshipOptimization.dependencyMap.dependencies.length;
        const optimizationCount = relationshipOptimization.optimizations.length;
        
        // 構造理解度スコア
        const structureScore = Math.min(1.0, (hierarchyCount + dependencyCount) / 20);
        
        // 最適化効果スコア
        const optimizationScore = qualityMetrics.optimizationPotential;
        
        // ネットワーク品質スコア
        const networkScore = qualityMetrics.overallQuality;
        
        // 統合関係性スコア
        return structureScore * 0.4 + optimizationScore * 0.35 + networkScore * 0.25;
    }
    
    /**
     * 意味類似度統合スコア計算
     */
    calculateSemanticIntegrationScore(terms, conceptGroups, relationships) {
        let semanticScore = 0;
        
        // 1. 意味グループ効果スコア
        const groupEffectScore = this.calculateGroupEffectScore(terms, conceptGroups);
        
        // 2. 関係性密度スコア
        const relationshipDensityScore = this.calculateRelationshipDensityScore(terms, relationships);
        
        // 3. 概念結合性スコア
        const cohesionScore = this.calculateConceptCohesionScore(conceptGroups);
        
        // 統合スコア（各要素の重み付き平均）
        semanticScore = (groupEffectScore * 0.4 + relationshipDensityScore * 0.35 + cohesionScore * 0.25);
        
        // デバッグ出力（開発時のみ）
        if (process.env.DEBUG_SEMANTIC) {
            console.log(`🔍 意味類似度統合スコア詳細:`);
            console.log(`  グループ効果: ${groupEffectScore.toFixed(3)} (グループ数: ${Object.keys(conceptGroups).length})`);
            console.log(`  関係性密度: ${relationshipDensityScore.toFixed(3)} (関係数: ${relationships.length})`);
            console.log(`  概念結合性: ${cohesionScore.toFixed(3)}`);
            console.log(`  統合スコア: ${semanticScore.toFixed(3)}`);
        }
        
        return Math.min(1.0, semanticScore);
    }
    
    /**
     * 意味グループ効果スコア計算
     */
    calculateGroupEffectScore(terms, conceptGroups) {
        if (Object.keys(conceptGroups).length === 0) return 0;
        
        const totalTerms = terms.length;
        const totalGroups = Object.keys(conceptGroups).length;
        const groupSizes = Object.values(conceptGroups).map(group => group.length);
        
        // 意味的凝縮度: 少ないグループ数で多くの用語をまとめるほど高い意味理解を示す
        const groupedTerms = groupSizes.reduce((sum, size) => sum + size, 0);
        const compressionRatio = totalTerms > 0 ? (totalTerms - totalGroups) / totalTerms : 0;
        
        // 意味的まとまりボーナス: 2個以上のメンバーを持つグループの比率
        const meaningfulGroups = groupSizes.filter(size => size >= 2).length;
        const meaningfulRatio = meaningfulGroups / Math.max(totalGroups, 1);
        
        // 大きなグループの存在ボーナス（関連性の強さを示す）
        const largeGroups = groupSizes.filter(size => size >= 3).length;
        const largeGroupBonus = Math.min(0.6, largeGroups / Math.max(totalGroups, 1));
        
        // 最適グループサイズボーナス（3-6個が理想的）
        const optimalGroups = groupSizes.filter(size => size >= 3 && size <= 6).length;
        const optimalRatio = optimalGroups / Math.max(totalGroups, 1);
        
        return compressionRatio * 0.35 + meaningfulRatio * 0.25 + largeGroupBonus * 0.25 + optimalRatio * 0.15;
    }
    
    /**
     * 関係性密度スコア計算
     */
    calculateRelationshipDensityScore(terms, relationships) {
        if (relationships.length === 0) return 0;
        
        const maxPossibleRelationships = (terms.length * (terms.length - 1)) / 2;
        const relationshipRatio = relationships.length / Math.max(maxPossibleRelationships, 1);
        
        // 強い関係性の比率
        const strongRelationships = relationships.filter(rel => rel.strength > 0.7).length;
        const strongRatio = strongRelationships / Math.max(relationships.length, 1);
        
        // 密度スコア計算
        const densityScore = relationshipRatio * 0.5 + strongRatio * 0.5;
        
        return Math.min(1.0, densityScore);
    }
    
    /**
     * 概念結合性スコア計算
     */
    calculateConceptCohesionScore(conceptGroups) {
        if (Object.keys(conceptGroups).length === 0) return 0;
        
        const groupSizes = Object.values(conceptGroups).map(group => group.length);
        const totalGroups = groupSizes.length;
        
        // 理想的なグループサイズ範囲（3-8個）での結合性評価
        const idealGroups = groupSizes.filter(size => size >= 3 && size <= 8).length;
        const cohesionRatio = idealGroups / Math.max(totalGroups, 1);
        
        // グループ間バランス（均等に分散されているほど高スコア）
        const avgSize = groupSizes.reduce((sum, size) => sum + size, 0) / totalGroups;
        const variance = groupSizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / totalGroups;
        const balanceScore = Math.max(0, 1 - variance / 10); // 分散が小さいほど高スコア
        
        return cohesionRatio * 0.6 + balanceScore * 0.4;
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
     * 技術用語判定（hybrid-language-processor.js統合）
     */
    isTechnicalTerm(term) {
        const technicalKeywords = [
            'システム', 'データ', 'ネットワーク', 'サーバー', 'クライアント',
            'インターフェース', 'アプリケーション', 'プラットフォーム',
            'アルゴリズム', 'データベース', 'プログラム', 'ソフトウェア',
            'ハードウェア', 'セキュリティ', 'プロトコル', 'アーキテクチャ'
        ];

        return technicalKeywords.some(keyword => term.includes(keyword)) ||
               /[A-Za-z]/.test(term); // 英字含む
    }

    /**
     * 技術用語抽出（hybrid-language-processor.js統合）
     */
    extractTechnicalTerms(tokens) {
        const techTerms = new Set();

        for (const token of tokens) {
            const surface = token.surface || token.surface_form;
            
            // パターンマッチング
            for (const pattern of this.technicalPatterns) {
                if (pattern.test(surface)) {
                    techTerms.add(surface);
                    break;
                }
            }

            // 品詞ベース抽出（専門用語候補）
            const pos = token.partOfSpeech || token.part_of_speech || '';
            if (pos.includes('名詞') && surface.length >= 3) {
                // 3文字以上の名詞で技術用語らしいもの
                if (this.isTechnicalTerm(surface)) {
                    techTerms.add(surface);
                }
            }
        }

        return Array.from(techTerms);
    }

    /**
     * 概念の類似度情報付与（hybrid-language-processor.js統合）
     */
    enhanceConceptsWithSimilarity(tokens, technicalTerms, enableSimilarity = true) {
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
            if (enableSimilarity && concept.isTechnical) {
                concept.similarTerms = this.findSimilarTerms(
                    surface, 
                    technicalTerms
                );
            }

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
            engines: ['kuromoji', 'MeCab', 'SemanticSimilarity', 'SemanticEngineV2', 'RelationshipOptimizer'],
            capabilities: [
                'kuromoji形態素解析',
                'MeCab詳細品詞解析',
                '拡張技術用語抽出',
                '品質評価・フィルタリング',
                '意味的類似度概念グループ化v2.0',
                '関係性分析',
                '複合語検出',
                '対話型AI品質最適化',
                'ドメイン特化類似度計算',
                '動的閾値調整',
                '階層構造分析',
                '依存関係マッピング',
                '概念ネットワーク構築',
                '関係性最適化推奨',
                '重要度・中心性計算',
                '文字列類似度計算（hybrid統合）',
                '類似用語発見（hybrid統合）',
                '概念強化（hybrid統合）'
            ],
            technicalPatternCount: this.technicalPatterns.length,
            mecabFilterCount: this.mecabTechnicalFilters.length,
            semanticGroupCount: this.semanticSimilarity.getGroupCount(),
            semanticV2Stats: this.semanticEngineV2.getStats(),
            relationshipOptimizerStats: this.relationshipOptimizer.getStatistics(),
            kuromojiTokens: this.kuromojiTokens.length
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
            });
            
            // enhancedTermsからキーワードを抽出
            return result.enhancedTerms ? result.enhancedTerms.map(term => term.term) : [];
        } catch (error) {
            console.warn('⚠️ キーワード抽出エラー:', error.message);
            return [];
        }
    }
}

/**
 * SemanticSimilarityEngine - 軽量意味類似度エンジン
 * 対話型AI品質向上のための高速意味マッチング
 */
class SemanticSimilarityEngine {
    constructor() {
        // 日本語技術用語の意味グループマップ（対話型AI最適化）
        this.semanticGroups = {
            'AI関連': {
                terms: ['AI', '人工知能', 'アーティフィシャルインテリジェンス', 'artificial intelligence'],
                weight: 0.95
            },
            '機械学習': {
                terms: ['ML', '機械学習', 'マシンラーニング', 'machine learning', 'ディープラーニング', 'deep learning'],
                weight: 0.95
            },
            'JavaScript系': {
                terms: ['JavaScript', 'JS', 'ジャバスクリプト', 'ECMAScript', 'TypeScript', 'TS'],
                weight: 0.9
            },
            'フロントエンド': {
                terms: ['React', 'Vue', 'Angular', 'フロントエンド', 'frontend', 'リアクト', 'ビュー', 'アンギュラー'],
                weight: 0.85
            },
            'バックエンド': {
                terms: ['Node.js', 'Express', 'FastAPI', 'Django', 'Flask', 'バックエンド', 'backend', 'サーバー', 'server'],
                weight: 0.85
            },
            'データベース': {
                terms: ['データベース', 'DB', 'database', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite'],
                weight: 0.9
            },
            'API関連': {
                terms: ['API', 'REST', 'GraphQL', 'RESTful', 'エンドポイント', 'endpoint'],
                weight: 0.9
            },
            'クラウド': {
                terms: ['AWS', 'Azure', 'GCP', 'Google Cloud', 'クラウド', 'cloud', 'Lambda', 'EC2'],
                weight: 0.9
            },
            'コンテナ': {
                terms: ['Docker', 'Kubernetes', 'コンテナ', 'container', 'K8s'],
                weight: 0.85
            },
            'DevOps': {
                terms: ['DevOps', 'CI/CD', 'アジャイル', 'agile', 'スクラム', 'scrum'],
                weight: 0.8
            },
            'ニューラルネット': {
                terms: ['CNN', 'RNN', 'LSTM', 'GAN', 'Transformer', 'ニューラルネットワーク'],
                weight: 0.9
            },
            'プログラミング言語': {
                terms: ['Python', 'Java', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin'],
                weight: 0.8
            }
        };
        
        // キャッシュ（パフォーマンス最適化）
        this.similarityCache = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * 意味的類似度計算
     */
    similarity(word1, word2) {
        if (word1 === word2) return 1.0;
        
        // キャッシュ確認
        const cacheKey = `${word1}|${word2}`;
        const reverseCacheKey = `${word2}|${word1}`;
        
        if (this.similarityCache.has(cacheKey)) {
            this.cacheHits++;
            return this.similarityCache.get(cacheKey);
        }
        
        if (this.similarityCache.has(reverseCacheKey)) {
            this.cacheHits++;
            return this.similarityCache.get(reverseCacheKey);
        }
        
        this.cacheMisses++;
        
        // 意味グループ内類似度
        const groupSimilarity = this.calculateGroupSimilarity(word1, word2);
        if (groupSimilarity > 0) {
            this.similarityCache.set(cacheKey, groupSimilarity);
            return groupSimilarity;
        }
        
        // 部分一致による類似度
        const partialSimilarity = this.calculatePartialSimilarity(word1, word2);
        if (partialSimilarity > 0.5) {
            this.similarityCache.set(cacheKey, partialSimilarity);
            return partialSimilarity;
        }
        
        // 文字レベル類似度（最小限）
        const charSimilarity = this.calculateCharacterSimilarity(word1, word2);
        this.similarityCache.set(cacheKey, charSimilarity);
        
        return charSimilarity;
    }

    /**
     * グループ内類似度計算
     */
    calculateGroupSimilarity(word1, word2) {
        for (const [groupName, group] of Object.entries(this.semanticGroups)) {
            const inGroup1 = group.terms.some(term => 
                term === word1 || word1.includes(term) || term.includes(word1)
            );
            const inGroup2 = group.terms.some(term => 
                term === word2 || word2.includes(term) || term.includes(word2)
            );
            
            if (inGroup1 && inGroup2) {
                return group.weight; // グループ重みによる類似度
            }
        }
        
        return 0;
    }

    /**
     * 部分一致類似度
     */
    calculatePartialSimilarity(word1, word2) {
        // 完全部分一致
        if (word1.includes(word2) || word2.includes(word1)) {
            const minLen = Math.min(word1.length, word2.length);
            const maxLen = Math.max(word1.length, word2.length);
            return 0.7 * (minLen / maxLen); // 長さ比を考慮
        }
        
        // 共通部分文字列
        const longestCommon = this.longestCommonSubstring(word1, word2);
        if (longestCommon.length > 2) {
            const avgLen = (word1.length + word2.length) / 2;
            return 0.6 * (longestCommon.length / avgLen);
        }
        
        return 0;
    }

    /**
     * 文字レベル類似度
     */
    calculateCharacterSimilarity(word1, word2) {
        const commonChars = new Set([...word1].filter(char => word2.includes(char)));
        const maxLen = Math.max(word1.length, word2.length);
        
        if (maxLen === 0) return 0;
        
        return (commonChars.size / maxLen) * 0.3; // 最小限の類似度
    }

    /**
     * 最長共通部分文字列
     */
    longestCommonSubstring(str1, str2) {
        let longest = '';
        
        for (let i = 0; i < str1.length; i++) {
            for (let j = i + 1; j <= str1.length; j++) {
                const substring = str1.slice(i, j);
                if (str2.includes(substring) && substring.length > longest.length) {
                    longest = substring;
                }
            }
        }
        
        return longest;
    }

    /**
     * グループ数取得
     */
    getGroupCount() {
        return Object.keys(this.semanticGroups).length;
    }

    /**
     * キャッシュ統計
     */
    getCacheStats() {
        const total = this.cacheHits + this.cacheMisses;
        return {
            size: this.similarityCache.size,
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate: total > 0 ? (this.cacheHits / total * 100).toFixed(1) : 0
        };
    }

    /**
     * キャッシュクリア
     */
    clearCache() {
        this.similarityCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
}

// Export both classes
export { SemanticSimilarityEngine };