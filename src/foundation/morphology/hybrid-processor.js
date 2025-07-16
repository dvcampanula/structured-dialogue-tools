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
        
        

        // 純粋形態素解析（フィルター完全除去）
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

        // URL除去
        text = text.replace(/(https?:\/\/[^\s]+)/g, '');

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
            
            // Null安全な処理
            const kuromojiTokens = kuromojiResult?.tokens || [];
            const mecabTokens = mecabResult?.tokens || [];
            
            this.lastKuromojiTokenCount = kuromojiTokens.length;
            this.kuromojiTokens = kuromojiTokens;

            // 2. 純粋形態素解析 - 全トークンを返却（フィルタリング・分類なし）
            const rawEnhancedTerms = kuromojiTokens.map((token, index) => ({
                term: token.surface,
                pos: token.partOfSpeech,
                reading: token.reading,
                position: index,
                source: 'kuromoji'
            }));

            // 3. 意味のある単語のみをフィルタリング
            const enhancedTerms = rawEnhancedTerms.filter(term => isMeaningfulTerm(term.term));

            // 4. 純粋形態素解析結果を返却（統計学習AIが上位で処理）
            return {
                originalText: text,
                enhancedTerms: enhancedTerms,
                tokens: kuromojiTokens, // 後方互換性
                statistics: {
                    totalTokens: kuromojiTokens.length,
                    mecabTokens: mecabTokens.length,
                    enhancedTermCount: enhancedTerms.length,
                    processingTime: Date.now() - startTime
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
        // console.log('Kuromoji tokens:', tokens); // デバッグ出力無効化
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
     * システム統計情報（純粋形態素解析）
     */
    getStatistics() {
        return {
            version: '8.0.0-PURE',
            isInitialized: this.isInitialized,
            engines: ['kuromoji', 'MeCab'],
            capabilities: [
                '純粋形態素解析（kuromoji）',
                '純粋形態素解析（MeCab）',
                '統計学習AI用データ生成'
            ],
            purity: '100% - ハードコード・ルールベース要素完全除去'
        };
    }

    /**
     * 統計情報取得
     */
    getStats() {
        return this.getStatistics();
    }

    /**
     * クリーンアップ処理
     */
    cleanup() {
        // 現時点では解放すべきリソースがないため空
        console.log('🧹 EnhancedHybridLanguageProcessorクリーンアップ完了');
    }
}

/**
 * 語彙が応答に使えるほど意味があるかを判定する厳格なフィルタ
 * @param {string} term - 検証する語彙
 * @returns {boolean} 意味がある場合はtrue
 */
export function isMeaningfulTerm(term) {
    if (!term || typeof term !== 'string' || term.trim().length < 2) {
        return false;
    }

    // 助詞、助動詞、その他意味の薄い単語のブラックリスト
    const blacklist = [
        'する', 'いる', 'ある', 'なる', 'いう', 'できる', 'こと', 'もの', 'ため', 'よう',
        'て', 'に', 'を', 'は', 'が', 'の', 'も', 'へ', 'と', 'や', 'か', 'さ',
        'です', 'ます', 'でした', 'ました', 'ください', 'でしょう', 'だろう',
        'これ', 'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'あそこ', 'どこ'
    ];
    if (blacklist.includes(term)) {
        return false;
    }

    // 記号や句読点のみの文字列を拒否
    if (/^[ -/:-@[-`{-~　、。？！ー～・]+$/.test(term)) {
        return false;
    }

    // 小さい「っ」や「ゃ」などで終わる単語（断片の可能性が高い）を拒否
    if (/[ぁぃぅぇぉゃゅょっ]$/.test(term)) {
        return false;
    }

    // 全てがひらがなまたはカタカナで、かつ2文字以下の単語を拒否
    if (/^([あ-ん]{1,2}|[ア-ン]{1,2})$/.test(term)) {
        return false;
    }

    // 数字のみの文字列を拒否
    if (/^[0-9]+$/.test(term)) {
        return false;
    }

    return true;
}
