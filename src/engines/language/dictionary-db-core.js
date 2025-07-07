#!/usr/bin/env node
/**
 * DictionaryDB Core - 軽量辞書データベース（読み込み専用）
 * 
 * 🚀 配布済み辞書DB専用・高速・軽量
 * 📚 解析機能除去・エッセンシャル機能のみ
 * ⚡ 即座利用可能・ゼロセットアップ
 */

/**
 * 軽量辞書エントリ構造
 */
export class DictionaryEntry {
    constructor(word, reading = null, definitions = [], synonyms = [], antonyms = [], pos = []) {
        this.word = word;           // 単語
        this.reading = reading;     // 読み（ひらがな）
        this.definitions = definitions; // 定義・意味
        this.synonyms = synonyms;   // 同義語
        this.antonyms = antonyms;   // 反義語
        this.pos = pos;            // 品詞 (part of speech)
        this.frequency = 0;        // 使用頻度
        this.level = 'common';     // 語彙レベル
    }
}

/**
 * 軽量辞書データベース（コア版）
 * 配布済みDB読み込み専用・解析機能なし
 */
export class DictionaryDBCore {
    constructor() {
        // メインデータ構造
        this.entries = new Map();        // word -> DictionaryEntry
        this.synonymMap = new Map();     // word -> Set(synonyms)
        this.readingMap = new Map();     // reading -> Set(words)
        this.posMap = new Map();         // pos -> Set(words)
        
        // 統計・メタデータ
        this.stats = {
            totalEntries: 0,
            loadedSources: [],
            memoryUsage: 0,
            lastUpdated: null,
            version: '1.0.0'
        };
        
        console.log('📚 DictionaryDB Core初期化完了（軽量版）');
    }

    /**
     * 配布済み辞書DB読み込み
     */
    async loadFromDistribution(dbPath = './data/dictionary-db/') {
        console.log('⚡ 配布済み辞書DB読み込み開始...');
        const startTime = Date.now();
        
        try {
            // キャッシュ形式データ読み込み
            const cacheData = await this.loadCacheFormat(dbPath);
            if (cacheData) {
                await this.loadFromCacheData(cacheData);
                
                const loadTime = Date.now() - startTime;
                console.log(`✅ 配布済みDB読み込み完了: ${loadTime}ms`);
                console.log(`📊 辞書統計: ${this.getSize()}エントリ, ${this.synonymMap.size}同義語`);
                
                return {
                    success: true,
                    method: 'distribution',
                    loadTime,
                    totalEntries: this.getSize()
                };
            }
            
            // フォールバック: サンプルデータ
            console.log('📖 配布DB未検出、サンプルデータ使用');
            await this.loadSampleData();
            
            const loadTime = Date.now() - startTime;
            return {
                success: true,
                method: 'sample',
                loadTime,
                totalEntries: this.getSize()
            };
            
        } catch (error) {
            console.error('❌ 配布DB読み込みエラー:', error.message);
            
            // 緊急フォールバック
            await this.loadSampleData();
            
            return {
                success: false,
                method: 'fallback',
                error: error.message,
                totalEntries: this.getSize()
            };
        }
    }

    /**
     * キャッシュ形式データ読み込み
     */
    async loadCacheFormat(dbPath) {
        try {
            const { promises: fs } = await import('fs');
            const path = await import('path');
            
            // メタデータ確認
            const metadataPath = path.default.join(dbPath, 'cache-metadata.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            if (!metadata || metadata.stats.totalEntries < 100) {
                console.log('⚠️ 配布DB無効（エントリ数不足）');
                return null;
            }
            
            // チャンクファイル読み込み
            const files = await fs.readdir(dbPath);
            const chunkFiles = files.filter(file => file.startsWith('parsed-dictionary-chunk-'));
            
            if (chunkFiles.length === 0) {
                console.log('⚠️ 辞書チャンクファイル未検出');
                return null;
            }
            
            const cacheData = {
                entries: new Map(),
                synonymMap: new Map(),
                readingMap: new Map(),
                posMap: new Map(),
                stats: metadata.stats
            };
            
            // チャンクデータ統合
            chunkFiles.sort();
            for (const chunkFile of chunkFiles) {
                const chunkPath = path.default.join(dbPath, chunkFile);
                const chunkContent = await fs.readFile(chunkPath, 'utf8');
                const chunkData = JSON.parse(chunkContent);
                
                for (const entryData of chunkData.entries) {
                    const entry = new DictionaryEntry(
                        entryData.word,
                        entryData.reading,
                        entryData.definitions || [],
                        entryData.synonyms || [],
                        entryData.antonyms || [],
                        entryData.pos || []
                    );
                    entry.frequency = entryData.frequency || 0;
                    entry.level = entryData.level || 'common';
                    entry.source = entryData.source;
                    entry.lang = entryData.lang;
                    entry.quality = entryData.quality;
                    
                    cacheData.entries.set(entryData.word, entry);
                }
            }
            
            // 同義語マップ読み込み
            const synonymMapPath = path.default.join(dbPath, 'synonym-map.json');
            const synonymMapContent = await fs.readFile(synonymMapPath, 'utf8');
            const synonymMapData = JSON.parse(synonymMapContent);
            
            for (const { word, synonyms } of synonymMapData.entries) {
                cacheData.synonymMap.set(word, new Set(synonyms));
            }
            
            // インデックス読み込み
            const indicesPath = path.default.join(dbPath, 'dictionary-indices.json');
            const indicesContent = await fs.readFile(indicesPath, 'utf8');
            const indicesData = JSON.parse(indicesContent);
            
            for (const { reading, words } of indicesData.readingMap) {
                cacheData.readingMap.set(reading, new Set(words));
            }
            
            for (const { pos, words } of indicesData.posMap) {
                cacheData.posMap.set(pos, new Set(words));
            }
            
            console.log(`📦 配布DB形式読み込み成功: ${cacheData.entries.size}エントリ`);
            return cacheData;
            
        } catch (error) {
            console.log(`⚠️ 配布DB読み込み失敗: ${error.message}`);
            return null;
        }
    }

    /**
     * キャッシュデータから復元
     */
    async loadFromCacheData(cacheData) {
        this.entries = cacheData.entries;
        this.synonymMap = cacheData.synonymMap;
        this.readingMap = cacheData.readingMap;
        this.posMap = cacheData.posMap;
        this.stats = {
            ...cacheData.stats,
            loadedAt: Date.now()
        };
    }

    /**
     * サンプルデータ読み込み（フォールバック）
     */
    async loadSampleData() {
        const sampleEntries = [
            new DictionaryEntry('ありがとう', 'ありがとう', 
                ['感謝の気持ちを表す'], 
                ['感謝', 'お礼', '謝意', 'サンキュー'], 
                [], ['感動詞']),
            
            new DictionaryEntry('嬉しい', 'うれしい', 
                ['喜ばしい気持ち', '満足な状態'], 
                ['喜ばしい', '楽しい', '愉快', '幸せ', '満足'], 
                ['悲しい', '辛い'], ['形容詞']),
            
            new DictionaryEntry('困る', 'こまる', 
                ['どうしてよいかわからない', '当惑する'], 
                ['悩む', '当惑', '苦労', '手こずる', '行き詰まる'], 
                ['解決', '安心'], ['動詞']),
            
            new DictionaryEntry('助ける', 'たすける', 
                ['困っている人の力になる', '援助する'], 
                ['支援', 'サポート', '援助', '手伝う', '協力'], 
                ['妨害', '邪魔'], ['動詞']),
        ];
        
        for (const entry of sampleEntries) {
            this.entries.set(entry.word, entry);
            this.synonymMap.set(entry.word, new Set(entry.synonyms));
            
            if (entry.reading) {
                if (!this.readingMap.has(entry.reading)) {
                    this.readingMap.set(entry.reading, new Set());
                }
                this.readingMap.get(entry.reading).add(entry.word);
            }
            
            for (const pos of entry.pos) {
                if (!this.posMap.has(pos)) {
                    this.posMap.set(pos, new Set());
                }
                this.posMap.get(pos).add(entry.word);
            }
        }
        
        this.stats.totalEntries = sampleEntries.length;
        this.stats.loadedSources = ['sample_core'];
        this.stats.lastUpdated = Date.now();
        
        console.log(`📖 サンプルデータ読み込み完了: ${sampleEntries.length}エントリ`);
    }

    /**
     * 単語の同義語取得
     */
    getSynonyms(word, maxResults = 5) {
        const synonymSet = this.synonymMap.get(word);
        if (!synonymSet || synonymSet.size === 0) {
            return [];
        }
        
        const synonymsArray = Array.from(synonymSet);
        return synonymsArray.slice(0, maxResults);
    }

    /**
     * 文脈を考慮した同義語選択
     */
    getContextualSynonym(word, context = {}) {
        const synonyms = this.getSynonyms(word, 10);
        if (synonyms.length === 0) return word;
        
        // フォーマリティ考慮
        if (context.formality === 'formal') {
            const formalSynonyms = synonyms.filter(s => 
                s.includes('ございま') || s.includes('いたしま') || s.length > word.length
            );
            if (formalSynonyms.length > 0) {
                return formalSynonyms[Math.floor(Math.random() * formalSynonyms.length)];
            }
        }
        
        // デフォルトはランダム選択
        return synonyms[Math.floor(Math.random() * synonyms.length)];
    }

    /**
     * エントリ取得
     */
    getEntry(word) {
        return this.entries.get(word);
    }

    /**
     * データベースサイズ取得
     */
    getSize() {
        return this.entries.size;
    }

    /**
     * 品詞による検索
     */
    getWordsByPOS(pos) {
        return Array.from(this.posMap.get(pos) || []);
    }

    /**
     * 統計情報取得
     */
    getStatistics() {
        return {
            ...this.stats,
            memoryUsage: this.estimateMemoryUsage(),
            synonymMapSize: this.synonymMap.size,
            readingMapSize: this.readingMap.size,
            posMapSize: this.posMap.size
        };
    }

    /**
     * メモリ使用量推定
     */
    estimateMemoryUsage() {
        const avgEntrySize = 200; // バイト
        return (this.stats.totalEntries * avgEntrySize) / (1024 * 1024);
    }

    /**
     * 単語情報取得（VocabularyDiversifier互換）
     */
    getWordInfo(word) {
        const entry = this.getEntry(word);
        if (!entry) return null;
        
        return {
            word: entry.word,
            reading: entry.reading,
            definitions: entry.definitions || [],
            synonyms: entry.synonyms || [],
            pos: entry.pos || [],
            frequency: entry.frequency || 0,
            level: entry.level || 'common'
        };
    }

    /**
     * 強化同義語マップ構築（VocabularyDiversifier互換）
     */
    async buildEnhancedSynonymMap() {
        console.log('🔄 同義語マッピング強化開始（DictionaryDBCore軽量版）');
        
        try {
            let enhancedCount = 0;
            
            // 既存同義語マップを基に強化
            for (const [word, synonyms] of this.synonymMap.entries()) {
                if (synonyms && synonyms.size > 0) {
                    // 相互参照追加
                    for (const synonym of synonyms) {
                        if (!this.synonymMap.has(synonym)) {
                            this.synonymMap.set(synonym, new Set());
                        }
                        this.synonymMap.get(synonym).add(word);
                        enhancedCount++;
                    }
                }
            }
            
            console.log(`✅ 同義語マッピング強化完了: ${enhancedCount}件追加`);
            return { enhancedCount, totalSynonyms: this.synonymMap.size };
            
        } catch (error) {
            console.warn('⚠️ 同義語マッピング強化エラー:', error.message);
            return { enhancedCount: 0, totalSynonyms: this.synonymMap.size };
        }
    }
}

export default DictionaryDBCore;