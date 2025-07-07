#!/usr/bin/env node
/**
 * Vocabulary Diversifier - 語彙多様化システム
 * 
 * 🎯 ローカル・無料環境での自然性向上
 * 📚 同義語・類語による表現バリエーション
 * 🔄 文脈に応じた語彙選択
 */

/**
 * 日本語同義語・類語辞書
 * フリーで利用可能な語彙データベース
 */
export class JapaneseSynonymDict {
    constructor() {
        // 感情表現の同義語
        this.emotionSynonyms = {
            // ポジティブ感情
            "嬉しい": ["喜ばしい", "幸せ", "満足", "安心"],
            "楽しい": ["面白い", "愉快", "興味深い", "心地よい"],
            "良い": ["素晴らしい", "優秀", "優れた", "立派", "見事", "素敵"],
            "すごい": ["素晴らしい", "驚くべき", "見事", "立派", "感動的"],
            
            // 感謝表現
            "ありがとう": ["感謝", "恐縮", "助かる", "恩に着る", "お礼"],
            "感謝": ["ありがたい", "恩義", "御礼", "謝意"],
            "助かる": ["支援される", "救われる", "恩恵を受ける"],
            
            // ネガティブ感情
            "困る": ["悩む", "苦労する", "手こずる", "行き詰まる", "当惑する"],
            "悲しい": ["辛い", "寂しい", "切ない", "哀しい", "憂鬱"],
            "不安": ["心配", "懸念", "憂慮", "気がかり", "恐れ"],
            
            // サポート表現
            "助ける": ["支援する", "サポートする", "援助する", "手伝う", "協力する"],
            "教える": ["指導する", "説明する", "伝える", "案内する", "ガイドする"],
            "解決": ["改善", "対処", "対応", "処理", "克服"]
        };
        
        // 接続表現の同義語
        this.connectionSynonyms = {
            "そして": ["それから", "また", "さらに", "加えて", "その上"],
            "しかし": ["けれども", "ただし", "一方で", "とはいえ", "もっとも"],
            "だから": ["そのため", "従って", "よって", "ゆえに", "それで"],
            "例えば": ["たとえば", "具体的には", "実際に", "要するに"]
        };
        
        // 丁寧語・敬語バリエーション
        this.politenessVariations = {
            "です": ["でございます", "であります", "なのです"],
            "ます": ["ております", "いたします", "させていただきます"],
            "ください": ["くださいませ", "いただけますでしょうか", "お願いいたします"]
        };
        
        console.log('📚 JapaneseSynonymDict初期化完了');
        console.log(`📊 語彙データ: 感情${Object.keys(this.emotionSynonyms).length}語, 接続${Object.keys(this.connectionSynonyms).length}語, 敬語${Object.keys(this.politenessVariations).length}語`);
    }
    
    /**
     * 単語の同義語を取得
     */
    getSynonyms(word, category = 'emotion') {
        let dict;
        switch (category) {
            case 'emotion':
                dict = this.emotionSynonyms;
                break;
            case 'connection':
                dict = this.connectionSynonyms;
                break;
            case 'politeness':
                dict = this.politenessVariations;
                break;
            default:
                dict = this.emotionSynonyms;
        }
        
        return dict[word] || [];
    }
    
    /**
     * ランダムな同義語選択
     */
    getRandomSynonym(word, category = 'emotion') {
        const synonyms = this.getSynonyms(word, category);
        if (synonyms.length === 0) return word;
        
        return synonyms[Math.floor(Math.random() * synonyms.length)];
    }
    
    /**
     * 文脈に応じた同義語選択
     */
    getContextualSynonym(word, context = {}) {
        const synonyms = this.getSynonyms(word, context.category);
        if (synonyms.length === 0) return word;
        
        // 丁寧度に応じた選択
        if (context.politeness === 'formal') {
            const formalSynonyms = synonyms.filter(s => 
                s.includes('ございま') || s.includes('いたしま') || s.length > word.length
            );
            if (formalSynonyms.length > 0) {
                return formalSynonyms[Math.floor(Math.random() * formalSynonyms.length)];
            }
        }
        
        // 感情強度に応じた選択
        if (context.intensity === 'high') {
            const intenseSynonyms = synonyms.filter(s => 
                s.includes('とても') || s.includes('非常に') || s.includes('大変')
            );
            if (intenseSynonyms.length > 0) {
                return intenseSynonyms[Math.floor(Math.random() * intenseSynonyms.length)];
            }
        }
        
        // デフォルトはランダム選択
        return synonyms[Math.floor(Math.random() * synonyms.length)];
    }
}

/**
 * 語彙多様化エンジン
 * 応答テキストの語彙を自然にバリエーション化
 */
export class VocabularyDiversifier {
    constructor() {
        this.synonymDict = new JapaneseSynonymDict();
        this.usageHistory = new Map(); // 使用履歴追跡
        this.diversityTarget = 0.7; // 多様性目標値
        
        // 辞書DB統合（オプション）
        this.dictionaryDB = null;
        this.enableDictionaryDB = true;
        
        console.log('🎨 VocabularyDiversifier初期化完了');
        
        // 辞書DB初期化
        if (this.enableDictionaryDB) {
            this.initializeDictionaryDB();
        }
    }
    
    /**
     * 辞書DB初期化（JMdict + Wiktionary統合版）
     */
    async initializeDictionaryDB() {
        try {
            const DictionaryDBCoreModule = await import('./dictionary-db-core.js');
            this.dictionaryDB = new DictionaryDBCoreModule.DictionaryDBCore();
            
            // 配布DB読み込み（軽量版）
            const initResult = await this.dictionaryDB.loadFromDistribution('./data/dictionary-db/');
            if (initResult.success) {
                console.log(`📚 配布辞書DB読み込み完了: ${initResult.totalEntries}エントリ (${initResult.loadTime}ms)`);
            } else {
                console.warn('⚠️ 配布DB読み込み失敗、フォールバック実行');
                // フォールバックは不要（軽量版のため）
            }
            
            // 同義語マッピング強化実行（配布DB利用）
            await this.buildEnhancedSynonymMap();
            
        } catch (error) {
            console.warn('⚠️ DictionaryDB初期化失敗、内蔵辞書を使用:', error.message);
            this.enableDictionaryDB = false;
        }
    }

    /**
     * Wiktionary統合処理
     */
    async integrateWiktionary() {
        try {
            console.log('🌟 Wiktionary統合開始...');
            
            const WiktionaryIntegratorModule = await import('./wiktionary-integrator.js');
            const integrator = new WiktionaryIntegratorModule.WiktionaryIntegrator(this.dictionaryDB);
            
            const result = await integrator.integrateWiktionary();
            
            if (result.integratedEntries > 0) {
                console.log(`✅ Wiktionary統合成功: ${result.integratedEntries}エントリ統合`);
                console.log(`📈 語彙数拡張: ${result.dictionarySize}エントリ (同義語: ${result.synonymMapSize})`);
                console.log(`⚡ 処理時間: ${result.processingTime}ms`);
                
                // 統合結果を保存
                this.wiktionaryStats = result;
                
                return true;
            } else {
                console.log('⚠️ Wiktionary統合エントリ数0、サンプルデータで続行');
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Wiktionary統合失敗:', error.message);
            return false;
        }
    }
    
    /**
     * JMdict読み込み（利用可能な場合）
     */
    async loadJMdictIfAvailable() {
        try {
            const jmdictPath = './data/dictionaries/JMdict';
            const fs = await import('fs');
            
            // ファイル存在チェック
            const stats = await fs.promises.stat(jmdictPath);
            if (stats.size > 0) {
                console.log('🔥 JMdict統合開始...');
                const result = await this.dictionaryDB.loadJMdict(jmdictPath);
                
                if (result.success) {
                    console.log(`✅ JMdict統合成功: ${result.entriesProcessed}エントリ`);
                    console.log(`💾 語彙データベース: ${result.totalEntries}エントリ`);
                } else {
                    console.log('⚠️ JMdict統合失敗、サンプルデータを使用');
                }
            }
        } catch (error) {
            console.log('📖 JMdictファイル未検出、サンプルデータで続行');
        }
    }
    
    /**
     * メイン多様化処理
     */
    async diversifyResponse(originalText, context = {}) {
        try {
            console.log(`🎨 語彙多様化開始: "${originalText.substring(0, 30)}..."`);
            
            let diversifiedText = originalText;
            
            // 1. 感情語彙の多様化
            diversifiedText = this.diversifyEmotionWords(diversifiedText, context);
            
            // 2. 接続表現の多様化
            diversifiedText = this.diversifyConnections(diversifiedText, context);
            
            // 3. 敬語・丁寧語の調整
            diversifiedText = this.adjustPoliteness(diversifiedText, context);
            
            // 4. 使用履歴の更新
            this.updateUsageHistory(originalText, diversifiedText);
            
            console.log(`✨ 語彙多様化完了: 変更箇所=${this.countChanges(originalText, diversifiedText)}件`);
            return diversifiedText;
            
        } catch (error) {
            console.error('❌ 語彙多様化エラー:', error.message);
            return originalText;
        }
    }
    
    /**
     * 感情語彙の多様化（強化版・連鎖防止）
     */
    diversifyEmotionWords(text, context) {
        let result = text;
        const replacedWords = new Set(); // 連鎖置換防止
        
        // 1. 日本語単語抽出
        const japaneseWords = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g) || [];
        
        // 2. 高品質同義語による置換（1回のみ）
        if (this.dictionaryDB) {
            japaneseWords.forEach(word => {
                if (result.includes(word) && word.length > 1 && !replacedWords.has(word)) {
                    // 高品質同義語選択
                    const synonym = this.getHighQualitySynonym(word, context);
                    if (synonym && synonym !== word && this.isAppropriateSynonym(word, synonym)) {
                        result = result.replace(new RegExp(word, 'g'), synonym);
                        replacedWords.add(word);
                        replacedWords.add(synonym); // 置換後の語も保護
                        console.log(`🚀 高品質語彙置換: "${word}" → "${synonym}"`);
                    }
                }
            });
        }
        
        // 3. フォールバック: 内蔵辞書（未置換語のみ）
        const emotionWords = Object.keys(this.synonymDict.emotionSynonyms);
        emotionWords.forEach(word => {
            if (result.includes(word) && !replacedWords.has(word)) {
                // 使用履歴を考慮して多様化
                const recentUsage = this.getRecentUsage(word);
                let synonym = word;
                
                if (recentUsage.length > 2) {
                    // 最近使用した語彙を避ける
                    synonym = this.getUnusedSynonym(word, recentUsage, context);
                } else {
                    // 通常の同義語選択
                    synonym = this.synonymDict.getContextualSynonym(word, {
                        ...context,
                        category: 'emotion'
                    });
                }
                
                if (synonym !== word && this.isAppropriateSynonym(word, synonym)) {
                    result = result.replace(new RegExp(word, 'g'), synonym);
                    replacedWords.add(word);
                    console.log(`🔄 感情語彙置換: "${word}" → "${synonym}"`);
                }
            }
        });
        
        return result;
    }
    
    /**
     * 適切な同義語かチェック（動的評価版）
     */
    isAppropriateSynonym(original, synonym) {
        // 1. 基本的な不適切性チェック
        if (this.isInappropriatePair(original, synonym)) {
            return false;
        }
        
        // 2. 語調レベル差チェック
        if (this.hasToneIncompatibility(original, synonym)) {
            return false;
        }
        
        // 3. 意味領域差チェック
        if (this.hasSemanticIncompatibility(original, synonym)) {
            return false;
        }
        
        // 4. DictionaryDBベースの品質チェック
        if (this.dictionaryDB) {
            const qualityScore = this.calculateSynonymPairQuality(original, synonym);
            if (qualityScore < 30) { // 品質閾値
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 不適切ペア判定（最小限のハードコード）
     */
    isInappropriatePair(original, synonym) {
        // 明らかに不適切な組み合わせのみ（最小限）
        const criticalPairs = {
            "嬉しい": ["愉悦"], // 性的含意のある語
            "助ける": ["愉悦"]   // 意味が全く異なる
        };
        
        return criticalPairs[original]?.includes(synonym) || false;
    }
    
    /**
     * 語調不一致チェック
     */
    hasToneIncompatibility(original, synonym) {
        const toneLevel = this.calculateToneLevel(original);
        const synonymToneLevel = this.calculateToneLevel(synonym);
        
        // 語調レベル差が2以上は不適切
        return Math.abs(toneLevel - synonymToneLevel) >= 2;
    }
    
    /**
     * 語調レベル計算
     */
    calculateToneLevel(word) {
        // 0: カジュアル, 1: 標準, 2: 丁寧, 3: 格式高い
        const formalPatterns = /恐縮|謝意|恩義|ございま|いたしま/;
        const casualPatterns = /愉悦|娯楽|やば|すげ/;
        
        if (formalPatterns.test(word)) return 3;
        if (casualPatterns.test(word)) return 0;
        if (word.length > 4) return 2; // 長い語は比較的丁寧
        return 1; // 標準
    }
    
    /**
     * 意味領域不一致チェック
     */
    hasSemanticIncompatibility(original, synonym) {
        const originalDomain = this.getSemanticDomain(original);
        const synonymDomain = this.getSemanticDomain(synonym);
        
        // 完全に異なる意味領域は不適切
        const incompatibleDomains = [
            ['emotion', 'action'],
            ['emotion', 'object'],
            ['abstract', 'concrete']
        ];
        
        return incompatibleDomains.some(([domain1, domain2]) => 
            (originalDomain === domain1 && synonymDomain === domain2) ||
            (originalDomain === domain2 && synonymDomain === domain1)
        );
    }
    
    /**
     * 意味領域判定
     */
    getSemanticDomain(word) {
        // DictionaryDBの情報を活用
        if (this.dictionaryDB) {
            const entry = this.dictionaryDB.getWordInfo(word);
            if (entry && entry.pos.length > 0) {
                const pos = entry.pos[0];
                if (pos.includes('形容詞')) return 'emotion';
                if (pos.includes('動詞')) return 'action';
                if (pos.includes('名詞')) return 'object';
            }
        }
        
        // フォールバック: パターンベース
        if (/嬉し|悲し|楽し|良い|悪い/.test(word)) return 'emotion';
        if (/する|教え|助け|学ぶ/.test(word)) return 'action';
        return 'abstract';
    }
    
    /**
     * 同義語ペア品質計算
     */
    calculateSynonymPairQuality(original, synonym) {
        if (!this.dictionaryDB) return 50; // デフォルト品質
        
        const entry1 = this.dictionaryDB.getWordInfo(original);
        const entry2 = this.dictionaryDB.getWordInfo(synonym);
        
        if (!entry1 || !entry2) return 40;
        
        let quality = 0;
        
        // 品詞一致度 (40点満点)
        const posOverlap = entry1.pos.filter(pos => entry2.pos.includes(pos)).length;
        quality += Math.min(posOverlap * 20, 40);
        
        // 頻度類似度 (30点満点)
        const freqDiff = Math.abs((entry1.frequency || 0) - (entry2.frequency || 0));
        quality += Math.max(0, 30 - freqDiff);
        
        // 定義類似度 (30点満点)
        if (entry1.definitions.length > 0 && entry2.definitions.length > 0) {
            const similarity = this.dictionaryDB.calculateDefinitionSimilarityFast(
                entry1.definitions, entry2.definitions
            );
            quality += similarity * 30;
        }
        
        return quality;
    }
    
    /**
     * 辞書DBによる多様化
     */
    diversifyWithDictionaryDB(text, context) {
        if (!this.dictionaryDB) return text;
        
        let result = text;
        const words = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g) || [];
        
        words.forEach(word => {
            if (result.includes(word)) {
                const synonym = this.dictionaryDB.getContextualSynonym(word, {
                    pos: context.pos,
                    level: context.politeness === 'formal' ? 'formal' : 'common'
                });
                
                if (synonym && synonym !== word) {
                    result = result.replace(new RegExp(word, 'g'), synonym);
                    console.log(`📚 辞書DB置換: "${word}" → "${synonym}"`);
                }
            }
        });
        
        return result;
    }
    
    /**
     * 接続表現の多様化
     */
    diversifyConnections(text, context) {
        const connectionWords = Object.keys(this.synonymDict.connectionSynonyms);
        
        let result = text;
        connectionWords.forEach(word => {
            if (result.includes(word)) {
                const synonym = this.synonymDict.getRandomSynonym(word, 'connection');
                if (synonym !== word) {
                    result = result.replace(new RegExp(word, 'g'), synonym);
                    console.log(`🔗 接続表現置換: "${word}" → "${synonym}"`);
                }
            }
        });
        
        return result;
    }
    
    /**
     * 敬語・丁寧語の調整
     */
    adjustPoliteness(text, context) {
        const politeness = context.politeness || 'standard';
        
        if (politeness === 'formal') {
            // より丁寧な表現に変換
            let result = text;
            result = result.replace(/です/g, 'でございます');
            result = result.replace(/ます/g, 'いたします');
            result = result.replace(/ください/g, 'くださいませ');
            
            if (result !== text) {
                console.log('🎩 丁寧語調整: formal適用');
            }
            return result;
        } else if (politeness === 'casual') {
            // よりカジュアルな表現に変換
            let result = text;
            result = result.replace(/でございます/g, 'です');
            result = result.replace(/いたします/g, 'ます');
            result = result.replace(/くださいませ/g, 'ください');
            
            if (result !== text) {
                console.log('😊 丁寧語調整: casual適用');
            }
            return result;
        }
        
        return text;
    }
    
    /**
     * 最近の使用履歴取得
     */
    getRecentUsage(word) {
        const history = this.usageHistory.get(word) || [];
        const recentThreshold = Date.now() - (30 * 60 * 1000); // 30分以内
        return history.filter(entry => entry.timestamp > recentThreshold);
    }
    
    /**
     * 未使用の同義語取得
     */
    getUnusedSynonym(word, recentUsage, context) {
        const synonyms = this.synonymDict.getSynonyms(word, 'emotion');
        const usedSynonyms = recentUsage.map(entry => entry.synonym);
        
        const unusedSynonyms = synonyms.filter(s => !usedSynonyms.includes(s));
        if (unusedSynonyms.length > 0) {
            return unusedSynonyms[Math.floor(Math.random() * unusedSynonyms.length)];
        }
        
        // すべて使用済みの場合は通常選択
        return this.synonymDict.getContextualSynonym(word, context);
    }
    
    /**
     * 使用履歴更新
     */
    updateUsageHistory(original, diversified) {
        // 変更された語彙を記録
        const changes = this.detectChanges(original, diversified);
        changes.forEach(change => {
            const history = this.usageHistory.get(change.original) || [];
            history.push({
                synonym: change.replacement,
                timestamp: Date.now(),
                context: change.context
            });
            
            // 履歴サイズ制限（最新10件まで）
            if (history.length > 10) {
                history.splice(0, history.length - 10);
            }
            
            this.usageHistory.set(change.original, history);
        });
    }
    
    /**
     * 変更箇所検出
     */
    detectChanges(original, diversified) {
        // 簡易的な変更検出（実装簡略化）
        const changes = [];
        if (original !== diversified) {
            changes.push({
                original: 'detected_change',
                replacement: 'applied_synonym',
                context: 'general'
            });
        }
        return changes;
    }
    
    /**
     * 変更数カウント
     */
    countChanges(original, diversified) {
        return original === diversified ? 0 : 1;
    }
    
    /**
     * 多様性統計取得
     */
    getDiversityStatistics() {
        return {
            totalWords: this.usageHistory.size,
            diversityScore: this.calculateDiversityScore(),
            recentUsage: this.getRecentUsageStats(),
            target: this.diversityTarget
        };
    }
    
    /**
     * 多様性スコア計算
     */
    calculateDiversityScore() {
        if (this.usageHistory.size === 0) return 0;
        
        let totalUsage = 0;
        let uniqueUsage = 0;
        
        this.usageHistory.forEach(history => {
            totalUsage += history.length;
            uniqueUsage += new Set(history.map(h => h.synonym)).size;
        });
        
        return totalUsage > 0 ? uniqueUsage / totalUsage : 0;
    }
    
    /**
     * 最近の使用統計
     */
    getRecentUsageStats() {
        const stats = {};
        this.usageHistory.forEach((history, word) => {
            const recent = this.getRecentUsage(word);
            if (recent.length > 0) {
                stats[word] = recent.length;
            }
        });
        return stats;
    }
    
    /**
     * 🚀 同義語マッピング強化実行
     */
    async buildEnhancedSynonymMap() {
        if (!this.dictionaryDB) return;
        
        try {
            console.log('🔄 同義語マッピング強化開始（VocabularyDiversifier）');
            
            // 辞書DBの同義語マッピング強化実行
            const result = await this.dictionaryDB.buildEnhancedSynonymMap();
            
            console.log('✅ 同義語マッピング強化完了');
            console.log(`📊 統計: 類似性${result.similarityPairs}組, グループ${result.groupSynonyms}組, 相互${result.crossLinks}組`);
            
            // 同義語品質を評価
            await this.evaluateSynonymQuality();
            
        } catch (error) {
            console.error('❌ 同義語マッピング強化エラー:', error.message);
        }
    }
    
    /**
     * 同義語品質評価
     */
    async evaluateSynonymQuality() {
        if (!this.dictionaryDB) return;
        
        console.log('📈 同義語品質評価開始');
        
        // 代表的な単語の同義語を確認
        const testWords = ['嬉しい', '困る', '助ける', '学ぶ', '教える'];
        let totalQuality = 0;
        let evaluatedWords = 0;
        
        for (const word of testWords) {
            const synonyms = this.dictionaryDB.getSynonyms(word, 10);
            if (synonyms.length > 0) {
                const wordInfo = this.dictionaryDB.getWordInfo(word);
                const quality = wordInfo ? wordInfo.synonymQuality || 0 : 0;
                
                console.log(`🔍 "${word}": ${synonyms.length}同義語, 品質スコア${quality}点`);
                console.log(`   同義語: ${synonyms.slice(0, 3).join(', ')}...`);
                
                totalQuality += quality;
                evaluatedWords++;
            }
        }
        
        const averageQuality = evaluatedWords > 0 ? (totalQuality / evaluatedWords) : 0;
        console.log(`📊 同義語品質平均: ${averageQuality.toFixed(1)}点`);
        
        // 品質改善の提案
        if (averageQuality < 60) {
            console.log('💡 品質改善提案: 同義語マッピングの閾値調整が必要');
        } else if (averageQuality >= 80) {
            console.log('🎉 同義語品質優秀: 高品質な語彙多様化が期待されます');
        }
    }
    
    /**
     * 高品質同義語選択
     */
    getHighQualitySynonym(word, context = {}) {
        if (!this.dictionaryDB) {
            return this.synonymDict.getContextualSynonym(word, context);
        }
        
        // 品質スコアを考慮した同義語選択
        const synonyms = this.dictionaryDB.getSynonyms(word, 10);
        if (synonyms.length === 0) {
            return this.synonymDict.getContextualSynonym(word, context);
        }
        
        // 品質スコアの高い同義語を優先
        const qualifiedSynonyms = synonyms.filter(synonym => {
            const entry = this.dictionaryDB.getWordInfo(synonym);
            return entry && (entry.synonymQuality || 0) > 50;
        });
        
        if (qualifiedSynonyms.length > 0) {
            // 使用履歴を考慮して選択
            const recentUsage = this.getRecentUsage(word);
            const usedSynonyms = recentUsage.map(entry => entry.synonym);
            const unusedSynonyms = qualifiedSynonyms.filter(s => !usedSynonyms.includes(s));
            
            if (unusedSynonyms.length > 0) {
                return unusedSynonyms[Math.floor(Math.random() * unusedSynonyms.length)];
            }
            
            return qualifiedSynonyms[Math.floor(Math.random() * qualifiedSynonyms.length)];
        }
        
        // フォールバック: 通常の同義語選択
        return this.dictionaryDB.getContextualSynonym(word, context);
    }
    
    /**
     * 変更率計算
     */
    calculateChangeRate(original, modified) {
        if (original === modified) return 0;
        
        const originalLength = original.length;
        const modifiedLength = modified.length;
        const lengthDiff = Math.abs(originalLength - modifiedLength);
        
        // レーベンシュタイン距離の簡易版
        let distance = 0;
        for (let i = 0; i < Math.min(originalLength, modifiedLength); i++) {
            if (original[i] !== modified[i]) {
                distance++;
            }
        }
        distance += lengthDiff;
        
        return distance / Math.max(originalLength, modifiedLength);
    }
}

/**
 * デフォルトエクスポート
 */
export default VocabularyDiversifier;