#!/usr/bin/env node
/**
 * JSON File Manager - 統合JSONファイル操作ユーティリティ
 * 
 * 🔗 重複処理の統合・統一化
 * 📁 ファイル操作の共通化・エラーハンドリング統一
 * ⚡ 高性能・メモリ効率最適化
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * 統合JSONファイルマネージャー
 * 全コードベースのJSONファイル操作を統一
 */
export class JSONFileManager {
    constructor(config = {}) {
        this.config = {
            // デフォルト設定
            encoding: 'utf8',
            indent: 2,
            createDirectories: true,
            backupOnWrite: false,
            cacheEnabled: true,
            maxCacheSize: 100,
            ...config
        };
        
        // ファイルキャッシュ
        this.fileCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            writes: 0,
            errors: 0
        };
        
        // 操作統計
        this.operationStats = {
            reads: 0,
            writes: 0,
            creates: 0,
            errors: 0,
            totalTime: 0
        };
        
        console.log('📁 JSON File Manager初期化完了');
    }

    /**
     * 統合JSONファイル読み込み
     * 全重複処理を統一・最適化
     */
    async readJSONFile(filePath, options = {}) {
        const startTime = Date.now();
        const fullPath = path.resolve(filePath);
        const config = { ...this.config, ...options };
        
        try {
            // キャッシュチェック
            if (config.cacheEnabled && this.fileCache.has(fullPath)) {
                const cached = this.fileCache.get(fullPath);
                
                // ファイル変更時刻チェック
                const stats = await fs.stat(fullPath);
                if (stats.mtime.getTime() === cached.mtime) {
                    this.cacheStats.hits++;
                    return { 
                        success: true, 
                        data: cached.data, 
                        fromCache: true,
                        path: fullPath
                    };
                } else {
                    // キャッシュ無効化
                    this.fileCache.delete(fullPath);
                }
            }
            
            this.cacheStats.misses++;
            
            // ファイル存在チェック
            const exists = await this.fileExists(fullPath);
            if (!exists) {
                if (config.createIfNotExists) {
                    const defaultData = config.defaultData || {};
                    await this.writeJSONFile(fullPath, defaultData);
                    return {
                        success: true,
                        data: defaultData,
                        created: true,
                        path: fullPath
                    };
                }
                
                return {
                    success: false,
                    error: 'file_not_found',
                    path: fullPath,
                    message: `ファイルが見つかりません: ${fullPath}`
                };
            }
            
            // ファイル読み込み
            const content = await fs.readFile(fullPath, config.encoding);
            
            // JSON解析
            let data;
            try {
                data = JSON.parse(content);
            } catch (parseError) {
                return {
                    success: false,
                    error: 'json_parse_error',
                    path: fullPath,
                    message: `JSON解析エラー: ${parseError.message}`,
                    parseError
                };
            }
            
            // キャッシュ保存
            if (config.cacheEnabled) {
                const stats = await fs.stat(fullPath);
                this.fileCache.set(fullPath, {
                    data: data,
                    mtime: stats.mtime.getTime(),
                    size: stats.size
                });
                
                // キャッシュサイズ制限
                if (this.fileCache.size > this.config.maxCacheSize) {
                    this.clearOldestCache();
                }
            }
            
            this.operationStats.reads++;
            this.operationStats.totalTime += Date.now() - startTime;
            
            return {
                success: true,
                data: data,
                fromCache: false,
                path: fullPath,
                size: content.length,
                readTime: Date.now() - startTime
            };
            
        } catch (error) {
            this.operationStats.errors++;
            this.cacheStats.errors++;
            
            return {
                success: false,
                error: 'read_error',
                path: fullPath,
                message: `ファイル読み込みエラー: ${error.message}`,
                originalError: error
            };
        }
    }

    /**
     * 統合JSONファイル書き込み
     * 全重複処理を統一・安全性向上
     */
    async writeJSONFile(filePath, data, options = {}) {
        const startTime = Date.now();
        const fullPath = path.resolve(filePath);
        const config = { ...this.config, ...options };
        
        try {
            // ディレクトリ作成
            if (config.createDirectories) {
                const dirPath = path.dirname(fullPath);
                await this.ensureDirectory(dirPath);
            }
            
            // バックアップ作成
            if (config.backupOnWrite) {
                const exists = await this.fileExists(fullPath);
                if (exists) {
                    const backupPath = `${fullPath}.backup`;
                    await fs.copyFile(fullPath, backupPath);
                }
            }
            
            // JSON文字列化
            let jsonString;
            try {
                jsonString = JSON.stringify(data, null, config.indent);
            } catch (stringifyError) {
                return {
                    success: false,
                    error: 'json_stringify_error',
                    path: fullPath,
                    message: `JSON文字列化エラー: ${stringifyError.message}`,
                    stringifyError
                };
            }
            
            // ファイル書き込み
            await fs.writeFile(fullPath, jsonString, config.encoding);
            
            // キャッシュ更新
            if (config.cacheEnabled) {
                const stats = await fs.stat(fullPath);
                this.fileCache.set(fullPath, {
                    data: data,
                    mtime: stats.mtime.getTime(),
                    size: stats.size
                });
            }
            
            this.operationStats.writes++;
            this.operationStats.totalTime += Date.now() - startTime;
            this.cacheStats.writes++;
            
            return {
                success: true,
                path: fullPath,
                size: jsonString.length,
                writeTime: Date.now() - startTime
            };
            
        } catch (error) {
            this.operationStats.errors++;
            
            return {
                success: false,
                error: 'write_error',
                path: fullPath,
                message: `ファイル書き込みエラー: ${error.message}`,
                originalError: error
            };
        }
    }

    /**
     * 分割JSONファイル書き込み（大容量対応）
     * DictionaryCacheManager の分割保存機能を統合
     */
    async writeChunkedJSONFile(filePath, data, options = {}) {
        const config = {
            chunkSize: 1000,
            chunkPrefix: 'chunk-',
            ...options
        };
        
        const fullPath = path.resolve(filePath);
        const dirPath = path.dirname(fullPath);
        const baseName = path.basename(fullPath, '.json');
        
        try {
            // ディレクトリ作成
            await this.ensureDirectory(dirPath);
            
            // データ分割
            const chunks = this.splitDataIntoChunks(data, config.chunkSize);
            const chunkPaths = [];
            
            // チャンク書き込み
            for (let i = 0; i < chunks.length; i++) {
                const chunkPath = path.join(dirPath, `${baseName}-${config.chunkPrefix}${i}.json`);
                const writeResult = await this.writeJSONFile(chunkPath, chunks[i]);
                
                if (!writeResult.success) {
                    return {
                        success: false,
                        error: 'chunk_write_error',
                        chunkIndex: i,
                        chunkPath,
                        message: `チャンク${i}の書き込みエラー`,
                        originalError: writeResult
                    };
                }
                
                chunkPaths.push(chunkPath);
            }
            
            // メタデータ書き込み
            const metadata = {
                totalChunks: chunks.length,
                chunkSize: config.chunkSize,
                totalItems: Array.isArray(data) ? data.length : Object.keys(data).length,
                chunkPaths: chunkPaths,
                createdAt: new Date().toISOString()
            };
            
            const metadataPath = path.join(dirPath, `${baseName}-metadata.json`);
            const metadataResult = await this.writeJSONFile(metadataPath, metadata);
            
            if (!metadataResult.success) {
                return {
                    success: false,
                    error: 'metadata_write_error',
                    message: 'メタデータ書き込みエラー',
                    originalError: metadataResult
                };
            }
            
            return {
                success: true,
                path: fullPath,
                chunks: chunkPaths.length,
                chunkPaths: chunkPaths,
                metadataPath: metadataPath,
                totalSize: chunkPaths.reduce((sum, _, i) => sum + chunks[i].length, 0)
            };
            
        } catch (error) {
            return {
                success: false,
                error: 'chunked_write_error',
                path: fullPath,
                message: `分割書き込みエラー: ${error.message}`,
                originalError: error
            };
        }
    }

    /**
     * 分割JSONファイル読み込み
     */
    async readChunkedJSONFile(filePath, options = {}) {
        const fullPath = path.resolve(filePath);
        const dirPath = path.dirname(fullPath);
        const baseName = path.basename(fullPath, '.json');
        const metadataPath = path.join(dirPath, `${baseName}-metadata.json`);
        
        try {
            // メタデータ読み込み
            const metadataResult = await this.readJSONFile(metadataPath);
            if (!metadataResult.success) {
                return {
                    success: false,
                    error: 'metadata_read_error',
                    message: 'メタデータ読み込みエラー',
                    originalError: metadataResult
                };
            }
            
            const metadata = metadataResult.data;
            const chunks = [];
            
            // チャンク読み込み
            for (const chunkPath of metadata.chunkPaths) {
                const chunkResult = await this.readJSONFile(chunkPath);
                if (!chunkResult.success) {
                    return {
                        success: false,
                        error: 'chunk_read_error',
                        chunkPath,
                        message: `チャンク読み込みエラー`,
                        originalError: chunkResult
                    };
                }
                
                chunks.push(chunkResult.data);
            }
            
            // データ統合
            const mergedData = this.mergeChunks(chunks, metadata);
            
            return {
                success: true,
                data: mergedData,
                path: fullPath,
                chunks: chunks.length,
                totalItems: metadata.totalItems,
                metadata: metadata
            };
            
        } catch (error) {
            return {
                success: false,
                error: 'chunked_read_error',
                path: fullPath,
                message: `分割読み込みエラー: ${error.message}`,
                originalError: error
            };
        }
    }

    /**
     * ファイル存在チェック
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * ディレクトリ作成（再帰的）
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return { success: true, path: dirPath };
        } catch (error) {
            return {
                success: false,
                error: 'directory_create_error',
                path: dirPath,
                message: `ディレクトリ作成エラー: ${error.message}`,
                originalError: error
            };
        }
    }

    /**
     * データ分割
     */
    splitDataIntoChunks(data, chunkSize) {
        if (Array.isArray(data)) {
            const chunks = [];
            for (let i = 0; i < data.length; i += chunkSize) {
                chunks.push(data.slice(i, i + chunkSize));
            }
            return chunks;
        } else if (typeof data === 'object') {
            const entries = Object.entries(data);
            const chunks = [];
            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunkEntries = entries.slice(i, i + chunkSize);
                chunks.push(Object.fromEntries(chunkEntries));
            }
            return chunks;
        }
        
        return [data];
    }

    /**
     * チャンク統合
     */
    mergeChunks(chunks, metadata) {
        if (!chunks.length) return null;
        
        const firstChunk = chunks[0];
        
        if (Array.isArray(firstChunk)) {
            return chunks.flat();
        } else if (typeof firstChunk === 'object') {
            return chunks.reduce((merged, chunk) => ({ ...merged, ...chunk }), {});
        }
        
        return chunks[0];
    }

    /**
     * 古いキャッシュクリア
     */
    clearOldestCache() {
        const entries = Array.from(this.fileCache.entries());
        entries.sort((a, b) => a[1].mtime - b[1].mtime);
        
        const removeCount = Math.floor(this.config.maxCacheSize * 0.2);
        for (let i = 0; i < removeCount && entries.length > 0; i++) {
            this.fileCache.delete(entries[i][0]);
        }
    }

    /**
     * キャッシュクリア
     */
    clearCache() {
        this.fileCache.clear();
        this.cacheStats = { hits: 0, misses: 0, writes: 0, errors: 0 };
        console.log('🧹 JSONファイルキャッシュクリア完了');
    }

    /**
     * 統計情報取得
     */
    getStatistics() {
        const cacheHitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses);
        const avgOperationTime = this.operationStats.totalTime / 
            (this.operationStats.reads + this.operationStats.writes);
        
        return {
            operations: this.operationStats,
            cache: {
                ...this.cacheStats,
                hitRate: cacheHitRate || 0,
                size: this.fileCache.size,
                maxSize: this.config.maxCacheSize
            },
            performance: {
                averageOperationTime: avgOperationTime || 0,
                totalOperations: this.operationStats.reads + this.operationStats.writes
            },
            config: this.config
        };
    }

    /**
     * 設定更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ JSON File Manager設定更新完了');
    }

    /**
     * ヘルスチェック
     */
    async healthCheck() {
        const stats = this.getStatistics();
        const health = {
            status: 'healthy',
            issues: [],
            recommendations: []
        };
        
        // エラー率チェック
        const errorRate = stats.operations.errors / stats.performance.totalOperations;
        if (errorRate > 0.1) {
            health.status = 'warning';
            health.issues.push(`高いエラー率: ${(errorRate * 100).toFixed(1)}%`);
            health.recommendations.push('ファイルパスとディスク容量を確認してください');
        }
        
        // キャッシュ効率チェック
        if (stats.cache.hitRate < 0.5) {
            health.issues.push(`低いキャッシュヒット率: ${(stats.cache.hitRate * 100).toFixed(1)}%`);
            health.recommendations.push('キャッシュサイズの増加を検討してください');
        }
        
        return health;
    }
}

export default JSONFileManager;