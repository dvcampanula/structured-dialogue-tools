/**
 * HybridLanguageProcessor v7.0
 * kuromoji + 文字列類似度ベースの拡張言語処理システム
 * Phase 6H: ハイブリッド言語処理強化の基盤実装
 */

import kuromoji from 'kuromoji';

export class HybridLanguageProcessor {
    constructor() {
        this.kuromoji = null;
        this.isInitialized = false;
        this.technicalPatterns = [
            /[A-Z]{2,}/, // 大文字略語 (API, SQL, etc.)
            /\w+Script/, // Script系 (JavaScript, TypeScript)
            /\w+SQL/, // SQL系 (NoSQL, MySQL)
            /\w+API/, // API関連 (REST API, GraphQL API)
            /\w+Framework/, // フレームワーク系
            /\w+Library/, // ライブラリ系
            /-like$/, // ~like技術
            /^AI|ML|DL|CNN|RNN|LSTM|GAN/, // AI/ML用語
            /Database|SQL|NoSQL/, // DB関連
            /Web|App|Mobile/, // プラットフォーム
            /React|Vue|Angular|Node\.js/, // 具体的技術名
        ];
    }

    /**
     * 初期化処理
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🧬 HybridLanguageProcessor初期化中...');
            
            this.kuromoji = await new Promise((resolve, reject) => {
                kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
                    if (err) reject(err);
                    else resolve(tokenizer);
                });
            });

            this.isInitialized = true;
            console.log('✅ HybridLanguageProcessor初期化完了');
        } catch (error) {
            console.error('❌ HybridLanguageProcessor初期化エラー:', error.message);
            throw error;
        }
    }

    /**
     * ハイブリッド言語処理（メイン処理）
     * @param {string} text - 処理対象テキスト
     * @param {Object} options - 処理オプション
     * @returns {Object} 統合処理結果
     */
    async processText(text, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const {
            enableSimilarity = true,
            enableGrouping = true,
            similarityThreshold = 0.3,
            enableTechnicalTerms = true
        } = options;

        try {
            // 1. kuromoji基本解析
            const kuromojiTokens = this.kuromoji.tokenize(text);
            
            // 2. 技術用語抽出
            const technicalTerms = enableTechnicalTerms ? 
                this.extractTechnicalTerms(kuromojiTokens) : [];
            
            // 3. 概念グループ化（類似度ベース）
            const conceptGroups = enableGrouping ? 
                this.groupSimilarConcepts([...technicalTerms], similarityThreshold) : {};
            
            // 4. 拡張概念情報
            const enhancedConcepts = this.enhanceConceptsWithSimilarity(
                kuromojiTokens, 
                technicalTerms, 
                enableSimilarity
            );

            // 5. 統合結果生成
            return {
                originalText: text,
                tokens: kuromojiTokens,
                technicalTerms,
                conceptGroups,
                enhancedConcepts,
                statistics: {
                    totalTokens: kuromojiTokens.length,
                    technicalTermCount: technicalTerms.length,
                    conceptGroupCount: Object.keys(conceptGroups).length,
                    processingTime: Date.now()
                }
            };
        } catch (error) {
            console.error('❌ ハイブリッド処理エラー:', error.message);
            throw error;
        }
    }

    /**
     * 技術用語抽出（kuromoji + パターンマッチング）
     * @param {Array} tokens - kuromojiトークン配列
     * @returns {Array} 技術用語配列
     */
    extractTechnicalTerms(tokens) {
        const techTerms = new Set();

        for (const token of tokens) {
            const surface = token.surface_form;
            
            // パターンマッチング
            for (const pattern of this.technicalPatterns) {
                if (pattern.test(surface)) {
                    techTerms.add(surface);
                    break;
                }
            }

            // 品詞ベース抽出（専門用語候補）
            const pos = token.part_of_speech || '';
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
     * 技術用語判定
     * @param {string} term - 判定対象用語
     * @returns {boolean} 技術用語かどうか
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
     * 概念グループ化（文字列類似度ベース）
     * @param {Array} concepts - 概念配列
     * @param {number} threshold - 類似度閾値
     * @returns {Object} グループ化結果
     */
    groupSimilarConcepts(concepts, threshold = 0.3) {
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
     * 文字列類似度計算（Levenshtein距離ベース）
     * @param {string} str1 - 文字列1
     * @param {string} str2 - 文字列2
     * @returns {number} 類似度 (0.0-1.0)
     */
    calculateStringSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
        if (len2 === 0) return 0.0;

        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

        // 初期化
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        // 動的プログラミング
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,       // 削除
                    matrix[j - 1][i] + 1,       // 挿入
                    matrix[j - 1][i - 1] + indicator // 置換
                );
            }
        }

        const maxLen = Math.max(len1, len2);
        return 1 - matrix[len2][len1] / maxLen;
    }

    /**
     * 概念の類似度情報付与
     * @param {Array} tokens - 元トークン
     * @param {Array} technicalTerms - 技術用語
     * @param {boolean} enableSimilarity - 類似度計算有効化
     * @returns {Array} 拡張概念情報
     */
    enhanceConceptsWithSimilarity(tokens, technicalTerms, enableSimilarity = true) {
        const enhancedConcepts = [];

        for (const token of tokens) {
            const concept = {
                surface: token.surface_form,
                partOfSpeech: token.part_of_speech || 'unknown',
                isTechnical: technicalTerms.includes(token.surface_form),
                similarTerms: []
            };

            // 類似概念発見
            if (enableSimilarity && concept.isTechnical) {
                concept.similarTerms = this.findSimilarTerms(
                    token.surface_form, 
                    technicalTerms
                );
            }

            enhancedConcepts.push(concept);
        }

        return enhancedConcepts;
    }

    /**
     * 類似用語発見
     * @param {string} targetTerm - 対象用語
     * @param {Array} termList - 用語リスト
     * @param {number} threshold - 類似度閾値
     * @returns {Array} 類似用語配列
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
     * バッチ処理（複数テキスト同時処理）
     * @param {Array} texts - テキスト配列
     * @param {Object} options - 処理オプション
     * @returns {Array} 処理結果配列
     */
    async batchProcess(texts, options = {}) {
        const results = [];
        
        for (const text of texts) {
            try {
                const result = await this.processText(text, options);
                results.push(result);
            } catch (error) {
                console.error('❌ バッチ処理エラー:', error.message);
                results.push({ error: error.message, originalText: text });
            }
        }

        return results;
    }

    /**
     * 統計情報取得
     * @returns {Object} システム統計
     */
    getStatistics() {
        return {
            isInitialized: this.isInitialized,
            technicalPatternCount: this.technicalPatterns.length,
            version: '7.0.0',
            capabilities: [
                'kuromoji形態素解析',
                '技術用語抽出',
                '文字列類似度計算',
                '概念グループ化',
                'バッチ処理'
            ]
        };
    }
}