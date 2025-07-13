/**
 * LearningPipeline - ストリーミング学習パイプライン
 * 大量のログデータを効率的にストリーミング処理
 */

import { Readable, Transform, Writable, pipeline } from 'stream';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { learningWorkerPool } from '../workers/learning-worker-pool.js';

export class LearningPipeline {
    constructor(options = {}) {
        this.batchSize = options.batchSize || 100;
        this.concurrency = options.concurrency || 4;
        this.processingTypes = options.processingTypes || ['sentiment', 'topic', 'pattern'];
        
        this.stats = {
            totalProcessed: 0,
            successfulBatches: 0,
            failedBatches: 0,
            startTime: null,
            endTime: null
        };
        
        console.log('🔄 LearningPipeline初期化完了');
    }

    /**
     * ログファイルストリーミング処理
     * @param {string} filePath - ログファイルパス
     * @param {Function} onProgress - 進捗コールバック
     * @param {Object} options - オプション
     */
    async processLogFile(filePath, onProgress, options = {}) {
        this.stats.startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const results = [];
            let lineCount = 0;
            let batchCount = 0;
            
            const fileStream = createReadStream(filePath);
            const lineReader = createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            const batchProcessor = new LogBatchProcessor({
                batchSize: this.batchSize,
                processingTypes: this.processingTypes,
                onBatchComplete: async (batchResult) => {
                    results.push(batchResult);
                    batchCount++;
                    
                    if (batchResult.success) {
                        this.stats.successfulBatches++;
                    } else {
                        this.stats.failedBatches++;
                    }
                    
                    if (onProgress) {
                        onProgress({
                            linesProcessed: lineCount,
                            batchesCompleted: batchCount,
                            currentResult: batchResult,
                            elapsedTime: Date.now() - this.stats.startTime
                        });
                    }
                }
            });

            lineReader.on('line', (line) => {
                lineCount++;
                this.stats.totalProcessed++;
                batchProcessor.addLine(line);
            });

            lineReader.on('close', async () => {
                await batchProcessor.flush();
                this.stats.endTime = Date.now();
                
                const summary = this.generateProcessingSummary(results);
                resolve(summary);
            });

            lineReader.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * 会話データストリーミング処理
     * @param {Array} conversations - 会話データ配列
     * @param {Function} onProgress - 進捗コールバック
     */
    async processConversations(conversations, onProgress) {
        this.stats.startTime = Date.now();
        
        const conversationStream = Readable.from(conversations);
        const results = [];
        
        const processingStream = new Transform({
            objectMode: true,
            transform: async (conversation, encoding, callback) => {
                try {
                    const result = await this.processSingleConversation(conversation);
                    callback(null, result);
                } catch (error) {
                    callback(error);
                }
            }
        });

        const collectorStream = new Writable({
            objectMode: true,
            write: (result, encoding, callback) => {
                results.push(result);
                this.stats.totalProcessed++;
                
                if (onProgress) {
                    onProgress({
                        processed: results.length,
                        total: conversations.length,
                        currentResult: result,
                        elapsedTime: Date.now() - this.stats.startTime
                    });
                }
                
                callback();
            }
        });

        return new Promise((resolve, reject) => {
            pipeline(
                conversationStream,
                processingStream,
                collectorStream,
                (error) => {
                    this.stats.endTime = Date.now();
                    
                    if (error) {
                        reject(error);
                    } else {
                        resolve(this.generateProcessingSummary(results));
                    }
                }
            );
        });
    }

    /**
     * バッチデータ並列処理
     * @param {Array} dataItems - データアイテム配列
     * @param {string} processingType - 処理タイプ
     * @param {Function} onProgress - 進捗コールバック
     */
    async processBatchData(dataItems, processingType, onProgress) {
        this.stats.startTime = Date.now();
        
        const batches = this.createBatches(dataItems, this.batchSize);
        const results = [];
        
        console.log(`📊 バッチ処理開始: ${batches.length}バッチ, 総アイテム${dataItems.length}件`);
        
        try {
            const batchResults = await learningWorkerPool.executeStreamingBatch(
                batches.map(batch => ({
                    type: 'batch_learning',
                    data: {
                        learningData: batch,
                        learningType: processingType
                    },
                    priority: 'normal'
                })),
                (progress) => {
                    if (onProgress) {
                        onProgress({
                            ...progress,
                            processingType,
                            elapsedTime: Date.now() - this.stats.startTime
                        });
                    }
                }
            );
            
            this.stats.endTime = Date.now();
            
            return this.generateProcessingSummary(batchResults);
            
        } catch (error) {
            console.error('❌ バッチ処理エラー:', error.message);
            throw error;
        }
    }

    /**
     * 単一会話処理
     */
    async processSingleConversation(conversation) {
        const tasks = [];
        
        // 各処理タイプでタスク生成
        for (const processingType of this.processingTypes) {
            tasks.push({
                type: processingType === 'sentiment' ? 'sentiment_analysis' :
                      processingType === 'topic' ? 'topic_classification' : 
                      'dialogue_pattern',
                data: this.prepareConversationData(conversation, processingType)
            });
        }
        
        const results = await learningWorkerPool.executeBatch(tasks);
        
        return {
            conversation,
            processingResults: results.results,
            timestamp: Date.now()
        };
    }

    /**
     * 会話データ準備
     */
    prepareConversationData(conversation, processingType) {
        switch (processingType) {
            case 'sentiment':
                return {
                    texts: this.extractTextsFromConversation(conversation),
                    userId: conversation.userId || 'default'
                };
            case 'topic':
                return {
                    texts: this.extractTextsFromConversation(conversation),
                    userId: conversation.userId || 'default'
                };
            case 'pattern':
                return {
                    conversations: [conversation],
                    userId: conversation.userId || 'default'
                };
            default:
                return { conversation };
        }
    }

    /**
     * 会話からテキスト抽出
     */
    extractTextsFromConversation(conversation) {
        const texts = [];
        
        if (Array.isArray(conversation)) {
            for (const turn of conversation) {
                const text = turn.content || turn.message || turn.text || turn;
                if (typeof text === 'string' && text.trim()) {
                    texts.push(text.trim());
                }
            }
        } else if (typeof conversation === 'object') {
            if (conversation.messages && Array.isArray(conversation.messages)) {
                return this.extractTextsFromConversation(conversation.messages);
            } else if (conversation.content || conversation.message) {
                const text = conversation.content || conversation.message;
                if (typeof text === 'string' && text.trim()) {
                    texts.push(text.trim());
                }
            }
        } else if (typeof conversation === 'string') {
            texts.push(conversation.trim());
        }
        
        return texts;
    }

    /**
     * バッチ作成
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * 処理サマリー生成
     */
    generateProcessingSummary(results) {
        const summary = {
            totalProcessed: this.stats.totalProcessed,
            successfulBatches: this.stats.successfulBatches,
            failedBatches: this.stats.failedBatches,
            processingTime: this.stats.endTime - this.stats.startTime,
            throughput: this.stats.totalProcessed / ((this.stats.endTime - this.stats.startTime) / 1000),
            results: results,
            statistics: this.calculateResultStatistics(results)
        };
        
        console.log(`📊 処理完了サマリー:`);
        console.log(`  総処理件数: ${summary.totalProcessed}`);
        console.log(`  成功バッチ: ${summary.successfulBatches}`);
        console.log(`  失敗バッチ: ${summary.failedBatches}`);
        console.log(`  処理時間: ${summary.processingTime}ms`);
        console.log(`  スループット: ${summary.throughput.toFixed(2)}件/秒`);
        
        return summary;
    }

    /**
     * 結果統計計算
     */
    calculateResultStatistics(results) {
        const stats = {
            totalResults: results.length,
            successRate: 0,
            averageProcessingTime: 0,
            typeDistribution: {}
        };
        
        let successCount = 0;
        let totalProcessingTime = 0;
        
        for (const result of results) {
            if (result && !result.error) {
                successCount++;
            }
            
            if (result && result.processingTime) {
                totalProcessingTime += result.processingTime;
            }
            
            // タイプ別分布
            const type = result?.type || 'unknown';
            stats.typeDistribution[type] = (stats.typeDistribution[type] || 0) + 1;
        }
        
        stats.successRate = successCount / results.length;
        stats.averageProcessingTime = totalProcessingTime / results.length;
        
        return stats;
    }

    /**
     * パイプライン統計取得
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: this.stats.startTime && !this.stats.endTime,
            currentThroughput: this.stats.startTime && !this.stats.endTime ? 
                this.stats.totalProcessed / ((Date.now() - this.stats.startTime) / 1000) : 0
        };
    }

    /**
     * 統計リセット
     */
    resetStats() {
        this.stats = {
            totalProcessed: 0,
            successfulBatches: 0,
            failedBatches: 0,
            startTime: null,
            endTime: null
        };
    }
}

/**
 * ログバッチプロセッサー
 */
class LogBatchProcessor {
    constructor(options) {
        this.batchSize = options.batchSize;
        this.processingTypes = options.processingTypes;
        this.onBatchComplete = options.onBatchComplete;
        this.currentBatch = [];
    }

    addLine(line) {
        if (line.trim()) {
            this.currentBatch.push(line.trim());
            
            if (this.currentBatch.length >= this.batchSize) {
                this.processBatch();
            }
        }
    }

    async processBatch() {
        if (this.currentBatch.length === 0) return;
        
        const batch = [...this.currentBatch];
        this.currentBatch = [];
        
        try {
            const result = await this.processLogBatch(batch);
            
            if (this.onBatchComplete) {
                await this.onBatchComplete({
                    success: true,
                    batch: batch,
                    result: result,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('❌ バッチ処理エラー:', error.message);
            
            if (this.onBatchComplete) {
                await this.onBatchComplete({
                    success: false,
                    batch: batch,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }
    }

    async processLogBatch(batch) {
        // ログ行から対話データを抽出
        const conversations = this.extractConversationsFromBatch(batch);
        
        if (conversations.length === 0) {
            return { extractedConversations: 0, processed: 0 };
        }
        
        // 並列処理でバッチを処理
        const tasks = this.processingTypes.map(type => ({
            type: type === 'sentiment' ? 'sentiment_analysis' :
                  type === 'topic' ? 'topic_classification' : 
                  'dialogue_pattern',
            data: {
                texts: conversations.map(c => c.text || c),
                userId: 'batch_processing'
            }
        }));
        
        const results = await learningWorkerPool.executeBatch(tasks);
        
        return {
            extractedConversations: conversations.length,
            processed: results.successful,
            failed: results.failed,
            results: results.results
        };
    }

    extractConversationsFromBatch(batch) {
        const conversations = [];
        
        for (const line of batch) {
            // 簡易的な会話パターン検出
            if (line.includes('User:') || line.includes('AI:') || 
                line.includes('ユーザー:') || line.includes('assistant:')) {
                
                const cleanedLine = line
                    .replace(/^\d{4}-\d{2}-\d{2}.*?:\s*/, '') // タイムスタンプ除去
                    .replace(/^(User:|AI:|ユーザー:|assistant:)\s*/, '') // プレフィックス除去
                    .trim();
                
                if (cleanedLine.length > 10) { // 最小長制限
                    conversations.push({ text: cleanedLine, source: 'log' });
                }
            }
        }
        
        return conversations;
    }

    async flush() {
        if (this.currentBatch.length > 0) {
            await this.processBatch();
        }
    }
}

// デフォルトインスタンス
export const learningPipeline = new LearningPipeline();