#!/usr/bin/env node
/**
 * Dictionary Database System - 辞書データベースシステム
 * 
 * 🌟 フリー辞書データの効率的活用
 * 📚 JMdict/EDICT + Wiktionary統合
 * 🚀 高速検索・軽量メモリ使用
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * 軽量辞書エントリ構造
 */
class DictionaryEntry {
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
 * 軽量辞書データベース
 * フリー辞書データの効率的管理
 */
export class DictionaryDB {
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
            lastUpdated: null
        };
        
        // キャッシュマネージャー
        this.cacheManager = null;
        this.enableCaching = true;
        
        // 設定
        this.config = {
            maxMemoryMB: 500,          // メモリ使用制限（拡張）
            enableCaching: true,        // キャッシュ有効
            compressionLevel: 'balanced' // 'fast', 'balanced', 'max'
        };
        
        console.log('📚 DictionaryDB初期化開始');
        
        // キャッシュマネージャー初期化
        if (this.enableCaching) {
            this.initializeCacheManager();
        }
    }

    /**
     * キャッシュマネージャー初期化
     */
    async initializeCacheManager() {
        try {
            const { DictionaryCacheManager } = await import('../../builders/dictionary-cache-manager.js');
            this.cacheManager = new DictionaryCacheManager();
            console.log('🗄️ キャッシュマネージャー初期化完了');
        } catch (error) {
            console.warn('⚠️ キャッシュマネージャー初期化失敗:', error.message);
            this.enableCaching = false;
        }
    }

    /**
     * 高速初期化（キャッシュ優先）
     */
    async fastInitialize() {
        console.log('🚀 辞書DB高速初期化開始...');
        
        // キャッシュマネージャー確保
        if (!this.cacheManager && this.enableCaching) {
            await this.initializeCacheManager();
        }
        
        // キャッシュからの読み込み試行
        if (this.cacheManager) {
            const cacheData = await this.cacheManager.loadDictionaryCache();
            if (cacheData) {
                return await this.loadFromCache(cacheData);
            }
        }
        
        // キャッシュ無効時は通常初期化
        console.log('💾 キャッシュ無効、通常初期化実行...');
        return await this.normalInitialize();
    }

    /**
     * キャッシュからの高速読み込み
     */
    async loadFromCache(cacheData) {
        console.log('⚡ キャッシュから辞書DB復元中...');
        const startTime = Date.now();
        
        // データ構造復元
        this.entries = cacheData.entries;
        this.synonymMap = cacheData.synonymMap;
        this.readingMap = cacheData.readingMap;
        this.posMap = cacheData.posMap;
        this.stats = cacheData.stats;
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ キャッシュ読み込み完了: ${loadTime}ms`);
        console.log(`📊 復元統計: ${this.getSize()}エントリ, ${this.synonymMap.size}同義語`);
        
        return {
            success: true,
            method: 'cache',
            loadTime,
            totalEntries: this.getSize()
        };
    }

    /**
     * 通常初期化（解析+キャッシュ保存）
     */
    async normalInitialize() {
        console.log('🔄 通常初期化開始（解析+キャッシュ保存）...');
        const startTime = Date.now();
        
        try {
            // サンプルデータ初期化
            await this.initializeSampleData();
            
            // JMdict読み込み
            const jmdictPath = './data/dictionaries/JMdict';
            const jmdictResult = await this.loadJMdict(jmdictPath);
            console.log(`📚 JMdict統合結果: ${jmdictResult.success ? 'success' : 'failed'}`);
            
            const totalTime = Date.now() - startTime;
            console.log(`✅ 通常初期化完了: ${totalTime}ms`);
            console.log(`📊 最終エントリ数: ${this.getSize()}エントリ`);
            
            // 🔥 完全統合後にキャッシュ保存
            if (this.cacheManager && this.getSize() > 100) { // 最小エントリ数確認
                console.log('💾 完全統合辞書DBキャッシュ保存開始...');
                const cacheSuccess = await this.cacheManager.saveDictionaryCache(this);
                if (cacheSuccess) {
                    console.log('✅ 完全統合辞書DBキャッシュ保存完了');
                } else {
                    console.warn('⚠️ キャッシュ保存失敗');
                }
            } else {
                console.log('⚠️ エントリ数不足または無効、キャッシュ保存スキップ');
            }
            
            return {
                success: true,
                method: 'parse',
                loadTime: totalTime,
                totalEntries: this.getSize(),
                jmdictIntegrated: jmdictResult.success
            };
            
        } catch (error) {
            console.error('❌ 通常初期化エラー:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * サンプル辞書データの初期化
     * 実際のJMdict/EDICT統合前のテスト用
     */
    async initializeSampleData() {
        console.log('📖 サンプル辞書データ読み込み開始');
        
        // 感情・表現語彙の強化データ
        const sampleEntries = [
            // 感謝表現群
            new DictionaryEntry('ありがとう', 'ありがとう', 
                ['感謝の気持ちを表す'], 
                ['感謝', 'お礼', '謝意', 'サンキュー'], 
                [], ['感動詞']),
            
            new DictionaryEntry('感謝', 'かんしゃ', 
                ['恩恵を受けたことに対するお礼の気持ち'], 
                ['ありがとう', 'お礼', '謝意', '恩義'], 
                ['恨み', '怨恨'], ['名詞', 'サ変動詞']),
            
            new DictionaryEntry('恐縮', 'きょうしゅく', 
                ['申し訳なく思うこと', '恐れ入ること'], 
                ['恐れ入る', '申し訳ない', 'すみません'], 
                [], ['名詞', 'サ変動詞']),
            
            // 感情表現群
            new DictionaryEntry('嬉しい', 'うれしい', 
                ['喜ばしい気持ち', '満足な状態'], 
                ['喜ばしい', '楽しい', '愉快', '幸せ', '満足'], 
                ['悲しい', '辛い'], ['形容詞']),
            
            new DictionaryEntry('楽しい', 'たのしい', 
                ['心が弾む', '愉快な気分'], 
                ['愉快', '面白い', '興味深い', '娯楽的'], 
                ['つまらない', '退屈'], ['形容詞']),
            
            new DictionaryEntry('困る', 'こまる', 
                ['どうしてよいかわからない', '当惑する'], 
                ['悩む', '当惑', '苦労', '手こずる', '行き詰まる'], 
                ['解決', '安心'], ['動詞']),
            
            // サポート・援助表現
            new DictionaryEntry('助ける', 'たすける', 
                ['困っている人の力になる', '援助する'], 
                ['支援', 'サポート', '援助', '手伝う', '協力'], 
                ['妨害', '邪魔'], ['動詞']),
            
            new DictionaryEntry('支援', 'しえん', 
                ['力を貸して助けること'], 
                ['サポート', '援助', '協力', '後押し', 'バックアップ'], 
                ['妨害', '阻害'], ['名詞', 'サ変動詞']),
            
            // 学習・教育表現
            new DictionaryEntry('学ぶ', 'まなぶ', 
                ['知識や技能を身につける'], 
                ['勉強', '習得', '学習', '修得', '会得'], 
                ['無知', '怠慢'], ['動詞']),
            
            new DictionaryEntry('教える', 'おしえる', 
                ['知識や技能を相手に伝える'], 
                ['指導', '説明', '指南', 'ガイド', '案内'], 
                ['隠す', '秘匿'], ['動詞']),
            
            // 程度・強度表現
            new DictionaryEntry('とても', 'とても', 
                ['程度が甚だしいさま'], 
                ['非常に', 'すごく', '大変', 'かなり', '相当'], 
                ['少し', 'わずか'], ['副詞']),
            
            new DictionaryEntry('少し', 'すこし', 
                ['量や程度がわずかなさま'], 
                ['ちょっと', 'わずか', 'やや', '若干'], 
                ['たくさん', '大量'], ['副詞']),
            
            // 接続・論理表現
            new DictionaryEntry('そして', 'そして', 
                ['前の事柄に続いて'], 
                ['それから', 'また', 'さらに', '加えて'], 
                [], ['接続詞']),
            
            new DictionaryEntry('しかし', 'しかし', 
                ['前の事柄と相反することを述べる'], 
                ['けれども', 'だが', 'ただし', '一方'], 
                [], ['接続詞'])
        ];
        
        // エントリをデータベースに追加
        for (const entry of sampleEntries) {
            await this.addEntry(entry);
        }
        
        // 使用頻度設定（サンプル）
        this.setFrequency('ありがとう', 95);
        this.setFrequency('嬉しい', 85);
        this.setFrequency('困る', 75);
        this.setFrequency('助ける', 70);
        
        this.stats.loadedSources.push('sample_enhanced_vocabulary');
        this.stats.lastUpdated = Date.now();
        
        console.log(`✅ サンプル辞書データ読み込み完了: ${this.stats.totalEntries}エントリ`);
        console.log(`📊 メモリ使用量: ${this.estimateMemoryUsage()}MB`);
    }
    
    /**
     * エントリをデータベースに追加
     */
    async addEntry(entry) {
        this.entries.set(entry.word, entry);
        
        // 同義語マップ更新
        const synonymSet = new Set(entry.synonyms);
        this.synonymMap.set(entry.word, synonymSet);
        
        // 読みマップ更新
        if (entry.reading) {
            if (!this.readingMap.has(entry.reading)) {
                this.readingMap.set(entry.reading, new Set());
            }
            this.readingMap.get(entry.reading).add(entry.word);
        }
        
        // 品詞マップ更新
        for (const pos of entry.pos) {
            if (!this.posMap.has(pos)) {
                this.posMap.set(pos, new Set());
            }
            this.posMap.get(pos).add(entry.word);
        }
        
        this.stats.totalEntries++;
    }

    /**
     * 単語・読み・定義・同義語・反義語・品詞を指定してエントリ作成
     */
    addEntry(word, reading = null, definitions = [], synonyms = [], antonyms = [], pos = []) {
        const entry = new DictionaryEntry(word, reading, definitions, synonyms, antonyms, pos);
        this.entries.set(word, entry);
        
        // 同義語マップ更新
        const synonymSet = new Set(synonyms);
        this.synonymMap.set(word, synonymSet);
        
        // 読みマップ更新
        if (reading) {
            if (!this.readingMap.has(reading)) {
                this.readingMap.set(reading, new Set());
            }
            this.readingMap.get(reading).add(word);
        }
        
        // 品詞マップ更新
        for (const p of pos) {
            if (!this.posMap.has(p)) {
                this.posMap.set(p, new Set());
            }
            this.posMap.get(p).add(word);
        }
        
        this.stats.totalEntries++;
        return entry;
    }

    /**
     * 既存エントリ取得
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
     * 単語の同義語取得
     */
    getSynonyms(word, maxResults = 5) {
        const synonymSet = this.synonymMap.get(word);
        if (!synonymSet || synonymSet.size === 0) {
            return [];
        }
        
        // 頻度でソート
        const synonymsWithFreq = Array.from(synonymSet).map(syn => {
            const entry = this.entries.get(syn);
            return {
                word: syn,
                frequency: entry ? entry.frequency : 0,
                entry: entry
            };
        });
        
        synonymsWithFreq.sort((a, b) => b.frequency - a.frequency);
        return synonymsWithFreq.slice(0, maxResults).map(item => item.word);
    }
    
    /**
     * 文脈を考慮した同義語選択
     */
    getContextualSynonym(word, context = {}) {
        const synonyms = this.getSynonyms(word, 10);
        if (synonyms.length === 0) return word;
        
        // 品詞フィルタリング
        if (context.pos) {
            const filteredSynonyms = synonyms.filter(syn => {
                const entry = this.entries.get(syn);
                return entry && entry.pos.includes(context.pos);
            });
            if (filteredSynonyms.length > 0) {
                return this.selectBestSynonym(filteredSynonyms, context);
            }
        }
        
        return this.selectBestSynonym(synonyms, context);
    }
    
    /**
     * 最適な同義語選択
     */
    selectBestSynonym(synonyms, context) {
        // レベル考慮選択
        if (context.level) {
            const levelSynonyms = synonyms.filter(syn => {
                const entry = this.entries.get(syn);
                return entry && entry.level === context.level;
            });
            if (levelSynonyms.length > 0) {
                return levelSynonyms[Math.floor(Math.random() * levelSynonyms.length)];
            }
        }
        
        // 頻度考慮選択（上位70%から選択）
        const topSynonyms = synonyms.slice(0, Math.max(1, Math.floor(synonyms.length * 0.7)));
        return topSynonyms[Math.floor(Math.random() * topSynonyms.length)];
    }
    
    /**
     * 単語情報取得
     */
    getWordInfo(word) {
        return this.entries.get(word);
    }
    
    /**
     * 品詞による検索
     */
    getWordsByPOS(pos) {
        return Array.from(this.posMap.get(pos) || []);
    }
    
    /**
     * 頻度設定
     */
    setFrequency(word, frequency) {
        const entry = this.entries.get(word);
        if (entry) {
            entry.frequency = frequency;
        }
    }
    
    /**
     * メモリ使用量推定
     */
    estimateMemoryUsage() {
        // 簡易推定（実際はより複雑）
        const avgEntrySize = 200; // バイト
        return (this.stats.totalEntries * avgEntrySize) / (1024 * 1024);
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
     * データベースエクスポート（将来の実装用）
     */
    async exportToJSON(filePath) {
        const data = {
            entries: Array.from(this.entries.entries()),
            stats: this.stats,
            version: '1.0.0',
            exportDate: new Date().toISOString()
        };
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`📁 辞書データエクスポート完了: ${filePath}`);
    }
    
    /**
     * JMdict/EDICT統合実装（最適化版）
     */
    async loadJMdict(jmdictPath) {
        console.log('📥 JMdict読み込み開始（最適化版）');
        console.log(`📂 ファイルパス: ${jmdictPath}`);
        
        try {
            // ファイル存在確認
            const stats = await fs.stat(jmdictPath);
            console.log(`📊 ファイルサイズ: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
            
            // メモリ効率最適化設定
            const memoryLimit = Math.min(this.config.maxMemoryMB, 50); // 50MB制限
            const maxEntries = this.config.maxEntries || 200000; // 最大20万エントリ
            
            console.log(`⚡ 最適化設定: メモリ制限${memoryLimit}MB, 最大${maxEntries}エントリ`);
            
            // ストリーミング読み込み（メモリ効率化）
            console.log('📖 ストリーミング読み込み開始...');
            const entries = await this.parseJMdictXMLOptimized(jmdictPath, maxEntries);
            console.log(`🔍 最適化抽出エントリ数: ${entries.length}`);
            
            // バッチ処理（メモリ効率化）
            let processed = 0;
            const batchSize = 500; // バッチサイズ縮小
            
            for (let i = 0; i < entries.length; i += batchSize) {
                const batch = entries.slice(i, i + batchSize);
                
                for (const entry of batch) {
                    await this.addEntry(entry);
                    processed++;
                }
                
                // 頻繁なメモリチェック
                const memUsage = this.estimateMemoryUsage();
                if (memUsage > memoryLimit) {
                    console.log(`⛔ メモリ制限到達: ${memUsage}MB > ${memoryLimit}MB`);
                    console.log(`📊 処理完了: ${processed}/${entries.length}エントリ`);
                    break;
                }
                
                // 進捗表示
                if (processed % 2000 === 0) {
                    console.log(`📈 処理進捗: ${processed}/${entries.length} (${(processed/entries.length*100).toFixed(1)}%) | メモリ: ${memUsage.toFixed(1)}MB`);
                }
            }
            
            this.stats.loadedSources.push('JMdict_optimized');
            this.stats.lastUpdated = Date.now();
            
            console.log(`✅ JMdict最適化統合完了: ${processed}エントリ追加`);
            console.log(`📊 総エントリ数: ${this.stats.totalEntries}`);
            console.log(`💾 最終メモリ使用量: ${this.estimateMemoryUsage().toFixed(2)}MB`);
            
            return {
                success: true,
                entriesProcessed: processed,
                totalEntries: this.stats.totalEntries,
                memoryUsage: this.estimateMemoryUsage(),
                optimization: 'enabled'
            };
            
        } catch (error) {
            console.error('❌ JMdict最適化読み込みエラー:', error.message);
            return {
                success: false,
                error: error.message,
                entriesProcessed: 0
            };
        }
    }
    
    /**
     * JMdict XML パーサー（最適化版・ストリーミング）
     */
    async parseJMdictXMLOptimized(jmdictPath, maxEntries = 10000) {
        console.log('🔧 JMdict XML最適化パース開始');
        
        const entries = [];
        const fs = await import('fs');
        
        try {
            // ストリーミング読み込み
            const fileStream = fs.createReadStream(jmdictPath, { encoding: 'utf8', highWaterMark: 64 * 1024 }); // 64KB chunk
            
            let buffer = '';
            let processedCount = 0;
            
            return new Promise((resolve, reject) => {
                fileStream.on('data', (chunk) => {
                    buffer += chunk;
                    
                    // エントリ境界で分割
                    const entryPattern = /<entry>(.*?)<\/entry>/gs;
                    let match;
                    
                    while ((match = entryPattern.exec(buffer)) !== null && entries.length < maxEntries) {
                        try {
                            const entry = this.parseJMdictEntryOptimized(match[1]);
                            if (entry) {
                                entries.push(entry);
                                processedCount++;
                            }
                            
                            // 進捗表示
                            if (processedCount % 1000 === 0) {
                                console.log(`🔄 ストリーミング進捗: ${processedCount}エントリ処理済み`);
                            }
                            
                        } catch (error) {
                            // 個別エントリエラーは無視
                            continue;
                        }
                    }
                    
                    // 処理済み部分をバッファから削除
                    const lastEntryEnd = buffer.lastIndexOf('</entry>');
                    if (lastEntryEnd !== -1) {
                        buffer = buffer.substring(lastEntryEnd + 8);
                    }
                    
                    // 制限到達時は早期終了
                    if (entries.length >= maxEntries) {
                        fileStream.destroy();
                        console.log(`⚡ 制限到達により早期終了: ${entries.length}エントリ`);
                        resolve(entries);
                    }
                });
                
                fileStream.on('end', () => {
                    console.log(`✅ ストリーミングパース完了: ${entries.length}エントリ抽出`);
                    resolve(entries);
                });
                
                fileStream.on('error', (error) => {
                    console.error('❌ ストリーミング読み込みエラー:', error.message);
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error('❌ 最適化パースエラー:', error.message);
            return [];
        }
    }
    
    /**
     * 最適化版エントリパース
     */
    parseJMdictEntryOptimized(entryXml) {
        // 高速パターンマッチング
        const kanjiMatch = entryXml.match(/<keb>(.*?)<\/keb>/);
        const readingMatch = entryXml.match(/<reb>(.*?)<\/reb>/);
        const glossMatches = entryXml.match(/<gloss(?:[^>]*)>(.*?)<\/gloss>/g);
        const posMatches = entryXml.match(/<pos>&([^;]+);<\/pos>/g);
        
        // 必須要素チェック
        const primaryWord = kanjiMatch ? kanjiMatch[1].trim() : (readingMatch ? readingMatch[1].trim() : null);
        if (!primaryWord || !this.isValidJapaneseWord(primaryWord)) return null;
        
        // 定義抽出（最初の2つまで）
        const definitions = [];
        if (glossMatches) {
            for (let i = 0; i < Math.min(glossMatches.length, 2); i++) {
                const glossMatch = glossMatches[i].match(/<gloss(?:[^>]*)>(.*?)<\/gloss>/);
                if (glossMatch && glossMatch[1] && glossMatch[1].length > 2) {
                    definitions.push(glossMatch[1].trim());
                }
            }
        }
        
        if (definitions.length === 0) return null;
        
        // 品詞抽出（最初の3つまで）
        const posList = [];
        if (posMatches) {
            for (let i = 0; i < Math.min(posMatches.length, 3); i++) {
                const posMatch = posMatches[i].match(/<pos>&([^;]+);<\/pos>/);
                if (posMatch) {
                    posList.push(this.normalizePOS(posMatch[1]));
                }
            }
        }
        
        // エントリ作成
        const entry = new DictionaryEntry(
            primaryWord,
            readingMatch ? readingMatch[1].trim() : null,
            definitions,
            [], // 同義語は後で処理
            [], // 反義語は後で処理
            posList
        );
        
        // 簡易頻度・レベル推定
        entry.frequency = this.estimateFrequencyFast(primaryWord);
        entry.level = primaryWord.length <= 3 ? 'basic' : 'common';
        
        return entry;
    }
    
    /**
     * 高速頻度推定
     */
    estimateFrequencyFast(word) {
        let frequency = 30; // ベース頻度
        
        if (word.length <= 2) frequency += 20;
        if (/^[あ-ん]+$/.test(word)) frequency += 15;
        if (/^[ア-ン]+$/.test(word)) frequency += 10;
        
        return Math.min(frequency, 100);
    }
    
    /**
     * JMdict XML パーサー
     */
    parseJMdictXML(xmlContent) {
        console.log('🔧 JMdict XMLパース開始');
        
        const entries = [];
        
        // エントリの正規表現パターン（修正版）
        const entryPattern = /<entry>(.*?)<\/entry>/gs;
        const entSeqPattern = /<ent_seq>(\d+)<\/ent_seq>/;
        const kanjiPattern = /<keb>(.*?)<\/keb>/g;
        const readingPattern = /<reb>(.*?)<\/reb>/g;
        const sensePattern = /<sense>(.*?)<\/sense>/gs;
        const glossPattern = /<gloss(?:[^>]*)>(.*?)<\/gloss>/g;
        const posPattern = /<pos>&([^;]+);<\/pos>/g;
        
        let entryMatch;
        let processedCount = 0;
        
        // エントリを一つずつ処理
        while ((entryMatch = entryPattern.exec(xmlContent)) !== null) {
            const entryXml = entryMatch[1];
            
            try {
                // エントリ番号抽出
                const entSeqMatch = entryXml.match(entSeqPattern);
                if (!entSeqMatch) continue;
                
                // 漢字表記抽出（修正版）
                const kanjiMatches = Array.from(entryXml.matchAll(kanjiPattern));
                const kanjiWords = kanjiMatches.map(match => match[1]?.trim()).filter(word => word);
                
                // 読み抽出（修正版）
                const readingMatches = Array.from(entryXml.matchAll(readingPattern));
                const readings = readingMatches.map(match => match[1]?.trim()).filter(reading => reading);
                
                // センス（意味・定義）抽出
                const senseMatches = Array.from(entryXml.matchAll(sensePattern));
                const definitions = [];
                const posList = new Set();
                
                for (const senseMatch of senseMatches) {
                    const senseXml = senseMatch[1];
                    
                    // 品詞抽出
                    const posMatches = Array.from(senseXml.matchAll(posPattern));
                    posMatches.forEach(match => posList.add(this.normalizePOS(match[1])));
                    
                    // 語義抽出（修正版：英語のみ）
                    const glossMatches = Array.from(senseXml.matchAll(glossPattern));
                    glossMatches.forEach(match => {
                        const gloss = match[1]?.trim();
                        // 英語の定義のみ採用（xml:langがない、またはenのもの）
                        const fullMatch = match[0];
                        const isEnglish = !fullMatch.includes('xml:lang') || fullMatch.includes('xml:lang="en"');
                        
                        if (gloss && !gloss.includes('&') && isEnglish && gloss.length > 2) {
                            definitions.push(gloss);
                        }
                    });
                }
                
                // エントリ作成（漢字がある場合は漢字、ない場合は読み）
                const primaryWord = kanjiWords.length > 0 ? kanjiWords[0] : readings[0];
                const primaryReading = readings.length > 0 ? readings[0] : null;
                
                // 有効なエントリのみ作成（日本語単語 + 英語定義）
                if (primaryWord && definitions.length > 0 && this.isValidJapaneseWord(primaryWord)) {
                    const entry = new DictionaryEntry(
                        primaryWord,
                        primaryReading,
                        definitions.slice(0, 3), // 定義は上位3つまで
                        [], // 同義語は後で処理
                        [], // 反義語は後で処理
                        Array.from(posList)
                    );
                    
                    // 頻度推定（簡易）
                    entry.frequency = this.estimateFrequency(primaryWord, definitions);
                    entry.level = this.estimateLevel(primaryWord, definitions);
                    
                    entries.push(entry);
                }
                
                processedCount++;
                
                // 軽量化：進捗表示とメモリチェック
                if (processedCount % 10000 === 0) {
                    console.log(`🔄 XMLパース進捗: ${processedCount}エントリ`);
                    
                    // メモリ効率化：大量処理時は一部エントリのみ
                    if (processedCount > 50000 && entries.length > 30000) {
                        console.log('📊 メモリ効率化のため処理制限');
                        break;
                    }
                }
                
            } catch (error) {
                // 個別エントリエラーは無視して継続
                continue;
            }
        }
        
        console.log(`✅ JMdict XMLパース完了: ${entries.length}エントリ抽出`);
        return entries;
    }
    
    /**
     * 品詞の正規化
     */
    normalizePOS(pos) {
        const posMap = {
            'adj-i': '形容詞',
            'adj-na': 'ナ形容詞', 
            'adj-no': '連体詞',
            'adv': '副詞',
            'conj': '接続詞',
            'int': '感動詞',
            'n': '名詞',
            'v1': '一段動詞',
            'v5': '五段動詞',
            'vs-s': 'サ変動詞',
            'vz': 'ザ変動詞'
        };
        
        return posMap[pos] || pos;
    }
    
    /**
     * 頻度推定（簡易）
     */
    estimateFrequency(word, definitions) {
        let frequency = 0;
        
        // 文字数による推定
        if (word.length <= 2) frequency += 20;
        else if (word.length <= 4) frequency += 10;
        
        // ひらがな・カタカナによる推定
        if (/^[あ-ん]+$/.test(word)) frequency += 15;
        if (/^[ア-ン]+$/.test(word)) frequency += 10;
        
        // 定義数による推定
        frequency += Math.min(definitions.length * 5, 20);
        
        return Math.min(frequency, 100);
    }
    
    /**
     * レベル推定（簡易）
     */
    estimateLevel(word, definitions) {
        // 基本的な単語判定
        if (word.length <= 3 && /^[あ-ん]+$/.test(word)) {
            return 'basic';
        }
        
        // 複雑な単語判定
        if (word.length > 6 || definitions.some(def => def.length > 50)) {
            return 'advanced';
        }
        
        return 'common';
    }
    
    /**
     * 有効な日本語単語の判定
     */
    isValidJapaneseWord(word) {
        if (!word || word.length === 0) return false;
        
        // 1文字のカタカナ記号は除外
        if (word.length === 1 && /[ヽヾゝゞ〃]/.test(word)) return false;
        
        // 日本語文字を含むかチェック
        const hasJapanese = /[ぁ-んァ-ヶ一-龠]/.test(word);
        
        // 英数字のみは除外
        const isOnlyAlphanumeric = /^[a-zA-Z0-9\s\-\.]+$/.test(word);
        
        return hasJapanese && !isOnlyAlphanumeric;
    }
    
    /**
     * 🚀 同義語マッピング強化システム（最適化版）
     * 効率的な処理により大規模データセット対応
     */
    async buildEnhancedSynonymMap() {
        console.log('🔄 同義語マッピング強化開始（最適化版）');
        
        const entries = Array.from(this.entries.values());
        const totalEntries = entries.length;
        
        // 処理制限: 大規模データセット対応
        const maxProcessEntries = Math.min(totalEntries, 5000); // 5000語まで
        const processEntries = entries.slice(0, maxProcessEntries);
        
        console.log(`📊 処理対象: ${processEntries.length}/${totalEntries}エントリ (最適化済み)`);
        
        let similarityPairs = 0;
        let groupSynonyms = 0;
        let crossLinks = 0;
        
        // 1. 効率的な意味グループ化（優先実行）
        console.log('🎯 効率的意味グループ化実行中...');
        const semanticGroups = this.buildSemanticGroupsOptimized(processEntries);
        
        for (const group of semanticGroups) {
            if (group.size > 1 && group.size <= 10) { // グループサイズ制限
                const groupArray = Array.from(group);
                for (let i = 0; i < groupArray.length; i++) {
                    for (let j = i + 1; j < groupArray.length; j++) {
                        this.addSynonymPair(groupArray[i], groupArray[j], 0.6);
                        groupSynonyms++;
                    }
                }
            }
        }
        
        console.log(`✅ 意味グループ化完了: ${groupSynonyms}組の同義語ペア追加`);
        
        // 2. サンプリングベース類似性分析
        console.log('📊 サンプリングベース類似性分析実行中...');
        const sampleSize = Math.min(processEntries.length, 1000); // 1000語サンプル
        const sampleEntries = this.selectRepresentativeSample(processEntries, sampleSize);
        
        for (let i = 0; i < sampleEntries.length; i++) {
            const entry1 = sampleEntries[i];
            
            // 近接エントリのみと比較（効率化）
            const nearbyRange = Math.min(50, sampleEntries.length - i - 1);
            
            for (let j = i + 1; j < i + 1 + nearbyRange; j++) {
                const entry2 = sampleEntries[j];
                
                // 品詞フィルタリング
                const hasCommonPOS = entry1.pos.some(pos => entry2.pos.includes(pos));
                if (!hasCommonPOS) continue;
                
                // 高速類似度計算
                const similarity = this.calculateDefinitionSimilarityFast(entry1.definitions, entry2.definitions);
                
                if (similarity > 0.5) { // 閾値を上げて精度重視
                    this.addSynonymPair(entry1.word, entry2.word, similarity);
                    similarityPairs++;
                }
            }
            
            // 進捗表示
            if (i % 100 === 0) {
                console.log(`🔄 サンプル処理進捗: ${i}/${sampleEntries.length} (${(i/sampleEntries.length*100).toFixed(1)}%)`);
            }
        }
        
        console.log(`✅ サンプリング類似性分析完了: ${similarityPairs}組の同義語ペア検出`);
        
        // 3. 既存同義語の相互リンク強化
        console.log('🔗 既存同義語の相互リンク強化実行中...');
        
        const synonymEntries = Array.from(this.synonymMap.entries()).slice(0, 1000); // 1000語まで
        for (const [word, synonyms] of synonymEntries) {
            for (const synonym of synonyms) {
                if (this.synonymMap.has(synonym)) {
                    const reciprocalSynonyms = this.synonymMap.get(synonym);
                    if (!reciprocalSynonyms.has(word)) {
                        reciprocalSynonyms.add(word);
                        crossLinks++;
                    }
                }
            }
        }
        
        console.log(`✅ 相互リンク強化完了: ${crossLinks}の相互リンク追加`);
        
        // 4. 効率的品質スコア計算
        console.log('📈 効率的品質スコア計算実行中...');
        this.calculateSynonymQualityScoresOptimized();
        
        console.log('🎉 最適化版同義語マッピング強化完了!');
        return {
            similarityPairs: similarityPairs,
            groupSynonyms: groupSynonyms,
            crossLinks: crossLinks,
            totalSynonyms: this.synonymMap.size,
            processedEntries: processEntries.length,
            optimization: 'enabled'
        };
    }
    
    /**
     * 英語定義類似性計算
     */
    calculateDefinitionSimilarity(definitions1, definitions2) {
        if (!definitions1.length || !definitions2.length) return 0;
        
        let maxSimilarity = 0;
        
        for (const def1 of definitions1) {
            for (const def2 of definitions2) {
                const similarity = this.calculateTextSimilarity(def1.toLowerCase(), def2.toLowerCase());
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }
        }
        
        return maxSimilarity;
    }
    
    /**
     * テキスト類似度計算（改良版Jaccard係数）
     */
    calculateTextSimilarity(text1, text2) {
        // 単語トークン化
        const tokens1 = new Set(text1.match(/\b\w+\b/g) || []);
        const tokens2 = new Set(text2.match(/\b\w+\b/g) || []);
        
        // 共通トークン数
        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);
        
        // Jaccard係数計算
        const jaccardSimilarity = intersection.size / union.size;
        
        // 長さ類似度ボーナス
        const lengthSimilarity = 1 - Math.abs(text1.length - text2.length) / Math.max(text1.length, text2.length);
        
        // 組み合わせ類似度
        return (jaccardSimilarity * 0.7) + (lengthSimilarity * 0.3);
    }
    
    /**
     * 意味グループ構築（最適化版）
     */
    buildSemanticGroupsOptimized(entries) {
        const groups = [];
        const keywordGroups = new Map();
        
        // エントリ制限による効率化
        const processEntries = entries.slice(0, Math.min(entries.length, 2000));
        
        for (const entry of processEntries) {
            // 効率的キーワード抽出
            const keywords = this.extractKeywordsOptimized(entry.definitions);
            
            for (const keyword of keywords) {
                if (!keywordGroups.has(keyword)) {
                    keywordGroups.set(keyword, new Set());
                }
                keywordGroups.get(keyword).add(entry.word);
            }
        }
        
        // 意味のあるグループのみ採用（サイズ制限）
        for (const [keyword, wordSet] of keywordGroups) {
            if (wordSet.size >= 2 && wordSet.size <= 20) { // 2-20語のグループ
                groups.push(wordSet);
            }
        }
        
        return groups;
    }
    
    /**
     * 意味グループ構築
     */
    buildSemanticGroups() {
        const groups = [];
        const processedWords = new Set();
        
        // 共通定義キーワードによるグループ化
        const keywordGroups = new Map();
        
        for (const [word, entry] of this.entries) {
            if (processedWords.has(word)) continue;
            
            // 定義から重要キーワード抽出
            const keywords = this.extractKeywords(entry.definitions);
            
            for (const keyword of keywords) {
                if (!keywordGroups.has(keyword)) {
                    keywordGroups.set(keyword, new Set());
                }
                keywordGroups.get(keyword).add(word);
            }
        }
        
        // グループサイズが2以上のものを採用
        for (const [keyword, wordSet] of keywordGroups) {
            if (wordSet.size >= 2) {
                groups.push(wordSet);
            }
        }
        
        return groups;
    }
    
    /**
     * 定義からキーワード抽出
     */
    extractKeywords(definitions) {
        const keywords = new Set();
        const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'and', 'or', 'but', 'not', 'so', 'if', 'than', 'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs']);
        
        for (const definition of definitions) {
            const words = definition.toLowerCase().match(/\b\w+\b/g) || [];
            for (const word of words) {
                if (word.length > 3 && !stopWords.has(word)) {
                    keywords.add(word);
                }
            }
        }
        
        return Array.from(keywords);
    }
    
    /**
     * 同義語ペア追加
     */
    addSynonymPair(word1, word2, similarity) {
        // word1の同義語にword2を追加
        if (!this.synonymMap.has(word1)) {
            this.synonymMap.set(word1, new Set());
        }
        this.synonymMap.get(word1).add(word2);
        
        // word2の同義語にword1を追加（相互リンク）
        if (!this.synonymMap.has(word2)) {
            this.synonymMap.set(word2, new Set());
        }
        this.synonymMap.get(word2).add(word1);
        
        // 既存のエントリに同義語情報を追加
        const entry1 = this.entries.get(word1);
        const entry2 = this.entries.get(word2);
        
        if (entry1 && !entry1.synonyms.includes(word2)) {
            entry1.synonyms.push(word2);
        }
        if (entry2 && !entry2.synonyms.includes(word1)) {
            entry2.synonyms.push(word1);
        }
    }
    
    /**
     * 代表的サンプル選択
     */
    selectRepresentativeSample(entries, sampleSize) {
        if (entries.length <= sampleSize) return entries;
        
        // 頻度ベースサンプリング（高頻度語優先）
        const sortedEntries = entries.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
        
        // 上位50%から均等サンプリング
        const topEntries = sortedEntries.slice(0, Math.floor(entries.length * 0.5));
        const step = Math.floor(topEntries.length / sampleSize);
        
        const sample = [];
        for (let i = 0; i < topEntries.length && sample.length < sampleSize; i += Math.max(1, step)) {
            sample.push(topEntries[i]);
        }
        
        return sample;
    }
    
    /**
     * 高速定義類似性計算
     */
    calculateDefinitionSimilarityFast(definitions1, definitions2) {
        if (!definitions1.length || !definitions2.length) return 0;
        
        // 最初の定義のみ比較（高速化）
        const def1 = definitions1[0].toLowerCase();
        const def2 = definitions2[0].toLowerCase();
        
        // 単語数制限による高速化
        const words1 = def1.split(/\s+/).slice(0, 10);
        const words2 = def2.split(/\s+/).slice(0, 10);
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }
    
    /**
     * 効率的キーワード抽出
     */
    extractKeywordsOptimized(definitions) {
        const keywords = new Set();
        const commonWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on', 'for', 'with', 'by']);
        
        for (const definition of definitions.slice(0, 2)) { // 最初の2定義のみ
            const words = definition.toLowerCase().match(/\b\w{4,}\b/g) || []; // 4文字以上のみ
            for (const word of words.slice(0, 5)) { // 最初の5単語のみ
                if (!commonWords.has(word)) {
                    keywords.add(word);
                }
            }
        }
        
        return Array.from(keywords);
    }
    
    /**
     * 効率的品質スコア計算
     */
    calculateSynonymQualityScoresOptimized() {
        const synonymEntries = Array.from(this.synonymMap.entries()).slice(0, 1000); // 1000語まで
        
        for (const [word, synonyms] of synonymEntries) {
            const entry = this.entries.get(word);
            if (!entry) continue;
            
            // 簡易品質スコア計算
            let qualityScore = 0;
            
            // 同義語数によるスコア（簡易版）
            qualityScore += Math.min(synonyms.size * 15, 60);
            
            // 品詞一致度（サンプル確認）
            let posMatches = 0;
            let checkedSynonyms = 0;
            for (const synonym of synonyms) {
                if (checkedSynonyms >= 5) break; // 最初の5語のみチェック
                
                const synonymEntry = this.entries.get(synonym);
                if (synonymEntry && synonymEntry.pos.some(pos => entry.pos.includes(pos))) {
                    posMatches++;
                }
                checkedSynonyms++;
            }
            
            if (checkedSynonyms > 0) {
                qualityScore += (posMatches / checkedSynonyms) * 40;
            }
            
            // 品質スコアを格納
            entry.synonymQuality = Math.min(qualityScore, 100);
        }
    }
    
    /**
     * 同義語品質スコア計算
     */
    calculateSynonymQualityScores() {
        for (const [word, synonyms] of this.synonymMap) {
            const entry = this.entries.get(word);
            if (!entry) continue;
            
            // 品質スコア計算
            let qualityScore = 0;
            
            // 同義語数によるスコア
            qualityScore += Math.min(synonyms.size * 10, 50);
            
            // 品詞一致度によるスコア
            let posMatches = 0;
            for (const synonym of synonyms) {
                const synonymEntry = this.entries.get(synonym);
                if (synonymEntry && synonymEntry.pos.some(pos => entry.pos.includes(pos))) {
                    posMatches++;
                }
            }
            qualityScore += (posMatches / synonyms.size) * 30;
            
            // 頻度差によるスコア調整
            let frequencyBalance = 0;
            for (const synonym of synonyms) {
                const synonymEntry = this.entries.get(synonym);
                if (synonymEntry) {
                    const freqDiff = Math.abs(entry.frequency - synonymEntry.frequency);
                    frequencyBalance += Math.max(0, 20 - freqDiff);
                }
            }
            qualityScore += (frequencyBalance / synonyms.size);
            
            // 品質スコアを格納
            entry.synonymQuality = Math.min(qualityScore, 100);
        }
    }
    
    /**
     * ヘルスチェック
     */
    healthCheck() {
        const health = {
            status: 'healthy',
            issues: [],
            recommendations: []
        };
        
        // メモリ使用量チェック
        const memUsage = this.estimateMemoryUsage();
        if (memUsage > this.config.maxMemoryMB) {
            health.issues.push(`メモリ使用量超過: ${memUsage}MB > ${this.config.maxMemoryMB}MB`);
            health.recommendations.push('辞書データの圧縮またはクリーンアップを検討');
        }
        
        // データ整合性チェック
        if (this.synonymMap.size !== this.entries.size) {
            health.issues.push('同義語マップとエントリ数の不整合');
        }
        
        if (health.issues.length > 0) {
            health.status = 'warning';
        }
        
        return health;
    }
}

/**
 * デフォルトエクスポート
 */
export default DictionaryDB;