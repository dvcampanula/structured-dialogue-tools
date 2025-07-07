#!/usr/bin/env node
/**
 * DictionaryCacheManager - 辞書DB永続化システム
 * 
 * 🚀 解析済み辞書データJSON保存・高速読み込み
 * 📊 JMdict + Wiktionary統合結果キャッシュ
 * 🔄 更新検出・自動再構築システム
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 辞書キャッシュマネージャー
 * 重い解析処理の結果を永続化して高速起動を実現
 */
export class DictionaryCacheManager {
    constructor() {
        this.cacheDir = './data/dictionary-cache/';
        this.cacheFiles = {
            parsed: 'parsed-dictionary.json',
            metadata: 'cache-metadata.json',
            synonymMap: 'synonym-map.json',
            indices: 'dictionary-indices.json'
        };
        
        this.sourceFiles = {
            jmdict: './data/dictionaries/JMdict',
            wiktionary: './data/wiktionary/kaikki-english.json'
        };
        
        // キャッシュ設定
        this.config = {
            enableCompression: true,
            maxCacheAgeDays: 30,
            enableIntegrityCheck: true,
            chunkSize: 5000 // 大容量対応分割保存
        };
        
        console.log('🗄️ DictionaryCacheManager初期化完了');
    }

    /**
     * キャッシュディレクトリ確保
     */
    async ensureCacheDirectory() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            console.log('📁 辞書キャッシュディレクトリ確保完了');
        } catch (error) {
            console.warn('⚠️ キャッシュディレクトリ作成エラー:', error.message);
        }
    }

    /**
     * ソースファイルのハッシュ計算
     */
    async calculateSourceHash() {
        const hashes = {};
        
        for (const [name, filePath] of Object.entries(this.sourceFiles)) {
            try {
                const stats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf8');
                
                // ファイルサイズ + 修更時刻 + 内容の一部でハッシュ計算
                const hashInput = `${stats.size}-${stats.mtime.getTime()}-${content.substring(0, 1000)}`;
                hashes[name] = crypto.createHash('md5').update(hashInput).digest('hex');
                
                console.log(`🔍 ${name}ハッシュ: ${hashes[name]}`);
            } catch (error) {
                console.warn(`⚠️ ${name}ファイルハッシュ計算失敗:`, error.message);
                hashes[name] = null;
            }
        }
        
        return hashes;
    }

    /**
     * キャッシュメタデータ取得
     */
    async getCacheMetadata() {
        try {
            const metadataPath = path.join(this.cacheDir, this.cacheFiles.metadata);
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            return JSON.parse(metadataContent);
        } catch (error) {
            console.log('📋 キャッシュメタデータ未検出（初回実行）');
            return null;
        }
    }

    /**
     * キャッシュ有効性チェック
     */
    async isCacheValid() {
        await this.ensureCacheDirectory();
        
        const metadata = await this.getCacheMetadata();
        if (!metadata) return false;
        
        // ハッシュ比較
        const currentHashes = await this.calculateSourceHash();
        const cachedHashes = metadata.sourceHashes || {};
        
        for (const [name, currentHash] of Object.entries(currentHashes)) {
            if (currentHash !== cachedHashes[name]) {
                console.log(`🔄 ${name}ファイル変更検出: ${cachedHashes[name]} → ${currentHash}`);
                return false;
            }
        }
        
        // 有効期限チェック
        const cacheAge = Date.now() - new Date(metadata.createdAt).getTime();
        const maxAge = this.config.maxCacheAgeDays * 24 * 60 * 60 * 1000;
        
        if (cacheAge > maxAge) {
            console.log('⏰ キャッシュ有効期限切れ');
            return false;
        }
        
        console.log('✅ キャッシュ有効性確認完了');
        return true;
    }

    /**
     * 辞書DBデータ保存
     */
    async saveDictionaryCache(dictionaryDB) {
        console.log('💾 辞書DBキャッシュ保存開始...');
        const startTime = Date.now();
        
        await this.ensureCacheDirectory();
        
        try {
            // 1. メインエントリデータ保存（分割対応）
            await this.saveParsedDictionary(dictionaryDB);
            
            // 2. 同義語マップ保存
            await this.saveSynonymMap(dictionaryDB);
            
            // 3. インデックス保存
            await this.saveIndices(dictionaryDB);
            
            // 4. メタデータ保存
            await this.saveMetadata(dictionaryDB);
            
            const saveTime = Date.now() - startTime;
            console.log(`✅ 辞書DBキャッシュ保存完了: ${saveTime}ms`);
            
            return true;
        } catch (error) {
            console.error('❌ キャッシュ保存エラー:', error.message);
            return false;
        }
    }

    /**
     * 解析済み辞書データ保存（分割対応）
     */
    async saveParsedDictionary(dictionaryDB) {
        const entries = Array.from(dictionaryDB.entries.entries());
        const chunks = [];
        
        // チャンク分割
        for (let i = 0; i < entries.length; i += this.config.chunkSize) {
            chunks.push(entries.slice(i, i + this.config.chunkSize));
        }
        
        console.log(`📦 辞書データを${chunks.length}チャンクに分割保存`);
        
        // チャンク別保存
        for (let i = 0; i < chunks.length; i++) {
            const chunkData = {
                chunkIndex: i,
                totalChunks: chunks.length,
                entries: chunks[i].map(([word, entry]) => ({
                    word,
                    reading: entry.reading,
                    definitions: entry.definitions,
                    synonyms: entry.synonyms,
                    antonyms: entry.antonyms,
                    pos: entry.pos,
                    frequency: entry.frequency,
                    level: entry.level,
                    source: entry.source,
                    lang: entry.lang,
                    quality: entry.quality
                }))
            };
            
            const chunkPath = path.join(this.cacheDir, `parsed-dictionary-chunk-${i}.json`);
            await fs.writeFile(chunkPath, JSON.stringify(chunkData));
        }
        
        console.log(`💾 辞書エントリ保存完了: ${entries.length}エントリ`);
    }

    /**
     * 同義語マップ保存
     */
    async saveSynonymMap(dictionaryDB) {
        const synonymMapData = {
            size: dictionaryDB.synonymMap.size,
            entries: Array.from(dictionaryDB.synonymMap.entries()).map(([word, synonymSet]) => ({
                word,
                synonyms: Array.from(synonymSet)
            }))
        };
        
        const synonymMapPath = path.join(this.cacheDir, this.cacheFiles.synonymMap);
        await fs.writeFile(synonymMapPath, JSON.stringify(synonymMapData));
        
        console.log(`🔗 同義語マップ保存完了: ${synonymMapData.size}エントリ`);
    }

    /**
     * インデックス保存
     */
    async saveIndices(dictionaryDB) {
        const indicesData = {
            readingMap: Array.from(dictionaryDB.readingMap.entries()).map(([reading, wordSet]) => ({
                reading,
                words: Array.from(wordSet)
            })),
            posMap: Array.from(dictionaryDB.posMap.entries()).map(([pos, wordSet]) => ({
                pos,
                words: Array.from(wordSet)
            }))
        };
        
        const indicesPath = path.join(this.cacheDir, this.cacheFiles.indices);
        await fs.writeFile(indicesPath, JSON.stringify(indicesData));
        
        console.log('📇 インデックス保存完了');
    }

    /**
     * メタデータ保存
     */
    async saveMetadata(dictionaryDB) {
        const sourceHashes = await this.calculateSourceHash();
        
        const metadata = {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            sourceHashes,
            stats: {
                totalEntries: dictionaryDB.stats.totalEntries,
                loadedSources: dictionaryDB.stats.loadedSources,
                memoryUsage: dictionaryDB.stats.memoryUsage,
                lastUpdated: dictionaryDB.stats.lastUpdated
            },
            config: this.config
        };
        
        const metadataPath = path.join(this.cacheDir, this.cacheFiles.metadata);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        console.log('📋 メタデータ保存完了');
    }

    /**
     * 辞書DBデータ読み込み
     */
    async loadDictionaryCache() {
        console.log('📖 辞書DBキャッシュ読み込み開始...');
        const startTime = Date.now();
        
        try {
            // キャッシュ有効性確認
            const isValid = await this.isCacheValid();
            if (!isValid) {
                console.log('⚠️ キャッシュ無効、再構築が必要');
                return null;
            }
            
            // DictionaryDB再構築用データ
            const cacheData = {
                entries: new Map(),
                synonymMap: new Map(),
                readingMap: new Map(),
                posMap: new Map(),
                stats: {}
            };
            
            // 1. チャンク分割データ読み込み
            await this.loadParsedDictionary(cacheData);
            
            // 2. 同義語マップ読み込み
            await this.loadSynonymMap(cacheData);
            
            // 3. インデックス読み込み
            await this.loadIndices(cacheData);
            
            // 4. メタデータ読み込み
            const metadata = await this.getCacheMetadata();
            cacheData.stats = metadata.stats;
            
            const loadTime = Date.now() - startTime;
            console.log(`✅ 辞書DBキャッシュ読み込み完了: ${loadTime}ms`);
            console.log(`📊 読み込み統計: ${cacheData.entries.size}エントリ, ${cacheData.synonymMap.size}同義語`);
            
            return cacheData;
            
        } catch (error) {
            console.error('❌ キャッシュ読み込みエラー:', error.message);
            return null;
        }
    }

    /**
     * 分割された辞書データ読み込み
     */
    async loadParsedDictionary(cacheData) {
        // チャンクファイル検索
        const files = await fs.readdir(this.cacheDir);
        const chunkFiles = files.filter(file => file.startsWith('parsed-dictionary-chunk-'));
        
        console.log(`📦 ${chunkFiles.length}個のチャンクファイル検出`);
        
        // チャンク順序ソート
        chunkFiles.sort((a, b) => {
            const aIndex = parseInt(a.match(/chunk-(\d+)/)[1]);
            const bIndex = parseInt(b.match(/chunk-(\d+)/)[1]);
            return aIndex - bIndex;
        });
        
        // チャンク読み込み
        for (const chunkFile of chunkFiles) {
            const chunkPath = path.join(this.cacheDir, chunkFile);
            const chunkContent = await fs.readFile(chunkPath, 'utf8');
            const chunkData = JSON.parse(chunkContent);
            
            // エントリ復元
            for (const entryData of chunkData.entries) {
                const entry = {
                    word: entryData.word,
                    reading: entryData.reading,
                    definitions: entryData.definitions || [],
                    synonyms: entryData.synonyms || [],
                    antonyms: entryData.antonyms || [],
                    pos: entryData.pos || [],
                    frequency: entryData.frequency || 0,
                    level: entryData.level || 'common',
                    source: entryData.source,
                    lang: entryData.lang,
                    quality: entryData.quality
                };
                
                cacheData.entries.set(entryData.word, entry);
            }
        }
        
        console.log(`📚 辞書エントリ読み込み完了: ${cacheData.entries.size}エントリ`);
    }

    /**
     * 同義語マップ読み込み
     */
    async loadSynonymMap(cacheData) {
        const synonymMapPath = path.join(this.cacheDir, this.cacheFiles.synonymMap);
        const synonymMapContent = await fs.readFile(synonymMapPath, 'utf8');
        const synonymMapData = JSON.parse(synonymMapContent);
        
        for (const { word, synonyms } of synonymMapData.entries) {
            cacheData.synonymMap.set(word, new Set(synonyms));
        }
        
        console.log(`🔗 同義語マップ読み込み完了: ${cacheData.synonymMap.size}エントリ`);
    }

    /**
     * インデックス読み込み
     */
    async loadIndices(cacheData) {
        const indicesPath = path.join(this.cacheDir, this.cacheFiles.indices);
        const indicesContent = await fs.readFile(indicesPath, 'utf8');
        const indicesData = JSON.parse(indicesContent);
        
        // 読みマップ復元
        for (const { reading, words } of indicesData.readingMap) {
            cacheData.readingMap.set(reading, new Set(words));
        }
        
        // 品詞マップ復元
        for (const { pos, words } of indicesData.posMap) {
            cacheData.posMap.set(pos, new Set(words));
        }
        
        console.log('📇 インデックス読み込み完了');
    }

    /**
     * キャッシュクリア
     */
    async clearCache() {
        try {
            const files = await fs.readdir(this.cacheDir);
            for (const file of files) {
                await fs.unlink(path.join(this.cacheDir, file));
            }
            console.log('🗑️ キャッシュクリア完了');
        } catch (error) {
            console.warn('⚠️ キャッシュクリアエラー:', error.message);
        }
    }

    /**
     * キャッシュ統計取得
     */
    async getCacheStats() {
        try {
            const files = await fs.readdir(this.cacheDir);
            let totalSize = 0;
            
            for (const file of files) {
                const stats = await fs.stat(path.join(this.cacheDir, file));
                totalSize += stats.size;
            }
            
            const metadata = await this.getCacheMetadata();
            
            return {
                fileCount: files.length,
                totalSizeBytes: totalSize,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                createdAt: metadata?.createdAt,
                isValid: await this.isCacheValid()
            };
        } catch (error) {
            return { error: error.message };
        }
    }
}

export default DictionaryCacheManager;