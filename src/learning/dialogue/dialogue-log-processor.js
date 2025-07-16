/**
 * 対話ログ一括処理システム
 * workspace/raw-logs/以下の外部ログを統計学習で処理
 */

import { StatisticalDialogueLearner } from './statistical-dialogue-learner.js';
import fs from 'fs/promises';
import path from 'path';

export class DialogueLogProcessor {
    constructor() {
        this.learner = null;
        this.isInitialized = false;
        this.processedLogs = new Set();
        this.processingResults = [];
    }

    async initialize() {
        console.log('📚 対話ログ処理システム初期化...');
        
        this.learner = new StatisticalDialogueLearner();
        await this.learner.initialize();
        
        this.isInitialized = true;
        console.log('✅ 対話ログ処理システム初期化完了');
    }

    /**
     * workspace/raw-logs/内の全ログファイルを処理
     */
    async processAllLogs() {
        if (!this.isInitialized) {
            throw new Error('対話ログ処理システムが初期化されていません');
        }

        console.log('🔄 外部対話ログ一括処理開始...');
        const startTime = Date.now();

        try {
            const logsDir = path.join(process.cwd(), 'data', 'logs');
            const logFiles = await this.getLogFiles(logsDir);
            
            console.log(`📁 発見されたログファイル: ${logFiles.length}個`);
            
            const results = [];
            
            for (const logFile of logFiles) {
                if (this.processedLogs.has(logFile)) {
                    console.log(`⏭️  スキップ (処理済み): ${logFile}`);
                    continue;
                }
                
                console.log(`📖 処理中: ${logFile}`);
                const result = await this.processLogFile(logFile);
                results.push(result);
                
                if (result.success) {
                    this.processedLogs.add(logFile);
                    // 処理済みファイルをprocessed/に移動
                    await this.moveToProcessed(logFile);
                }
            }
            
            const totalTime = Date.now() - startTime;
            
            console.log(`✅ 対話ログ一括処理完了: ${results.length}ファイル (${totalTime}ms)`);
            
            this.processingResults = results;
            
            return {
                success: true,
                processedFiles: results.length,
                totalTime,
                results,
                summary: this.generateProcessingSummary(results)
            };
            
        } catch (error) {
            console.error('❌ 対話ログ一括処理エラー:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ログファイル一覧取得（再帰的にサブディレクトリを検索）
     */
    /**
     * ログファイル一覧取得（再帰的にサブディレクトリを検索）
     */
    async getLogFiles(logsDir) {
        const logFiles = [];
        try {
            const entries = await fs.readdir(logsDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(logsDir, entry.name);
                if (entry.isDirectory()) {
                    // サブディレクトリ内のログファイルも再帰的に検索
                    if (entry.name !== 'processed') { // processedディレクトリは除外
                        const subFiles = await this.getLogFiles(fullPath);
                        logFiles.push(...subFiles);
                    }
                } else if (entry.isFile() && (entry.name.endsWith('.txt') || entry.name.endsWith('.log') || entry.name.endsWith('.md')) && entry.name !== 'README.md') {
                    // logs/ 直下のログファイル
                    logFiles.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`❌ ログディレクトリ読み取りエラー: ${logsDir}`, error);
        }
        return logFiles;
    }

    /**
     * 個別ログファイル処理
     */
    async processLogFile(filePath) {
        try {
            const fileName = path.basename(filePath);
            const sourceName = this.extractSourceName(fileName);
            
            console.log(`  📄 読み込み: ${fileName} (ソース: ${sourceName})`);
            
            const content = await fs.readFile(filePath, 'utf8');
            
            if (!content || content.trim().length === 0) {
                return {
                    success: false,
                    fileName,
                    sourceName,
                    error: 'ファイルが空です'
                };
            }
            
            // 統計的対話学習実行
            const learningResult = await this.learner.processDialogueLog(content, sourceName);
            
            console.log(`  ✅ 完了: ${fileName} - ${learningResult.processedPairs || 0}ペア処理`);
            
            return {
                success: true,
                fileName,
                sourceName,
                filePath,
                contentLength: content.length,
                ...learningResult
            };
            
        } catch (error) {
            console.error(`❌ ログファイル処理エラー (${filePath}):`, error);
            return {
                success: false,
                fileName: path.basename(filePath),
                filePath,
                error: error.message
            };
        }
    }

    /**
     * ファイル名からソース名抽出
     */
    extractSourceName(fileName) {
        const name = fileName.toLowerCase();
        
        if (name.includes('claude') || name.includes('くろーど')) return 'Claude';
        if (name.includes('gemini') || name.includes('じぇみに')) return 'Gemini';
        if (name.includes('gpt') || name.includes('chatgpt')) return 'ChatGPT';
        if (name.includes('grok')) return 'Grok';
        if (name.includes('perplexity')) return 'Perplexity';
        
        return 'Unknown';
    }

    /**
     * 処理結果サマリー生成
     */
    generateProcessingSummary(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        const totalPairs = successful.reduce((sum, r) => sum + (r.processedPairs || 0), 0);
        const totalProcessingTime = successful.reduce((sum, r) => sum + (r.processingTime || 0), 0);
        
        const sourceBreakdown = {};
        successful.forEach(r => {
            const source = r.sourceName || 'Unknown';
            if (!sourceBreakdown[source]) {
                sourceBreakdown[source] = { files: 0, pairs: 0 };
            }
            sourceBreakdown[source].files++;
            sourceBreakdown[source].pairs += r.processedPairs || 0;
        });
        
        return {
            totalFiles: results.length,
            successfulFiles: successful.length,
            failedFiles: failed.length,
            totalDialoguePairs: totalPairs,
            totalProcessingTime,
            averageProcessingTime: totalProcessingTime / Math.max(successful.length, 1),
            sourceBreakdown,
            errorSummary: failed.map(f => ({ file: f.fileName, error: f.error }))
        };
    }

    /**
     * 処理済みログファイルをリアルタイム学習に統合
     */
    async integrateWithRealtimeLearning() {
        if (!this.isInitialized) {
            throw new Error('対話ログ処理システムが初期化されていません');
        }

        console.log('🔗 リアルタイム学習システムとの統合開始...');
        
        try {
            // 学習済み統計データを現在の学習システムに反映
            const statistics = this.learner.getStatisticsSummary();
            
            console.log('📊 統合統計情報:');
            console.log(`  - 処理済み対話ペア: ${statistics.totalProcessed}`);
            console.log(`  - 応答パターン: ${statistics.responsePatterns}`);
            console.log(`  - 文脈遷移: ${statistics.contextTransitions}`);
            console.log(`  - 品質相関: ${statistics.qualityCorrelations}`);
            console.log(`  - ユーザー適応: ${statistics.userAdaptations}`);
            
            return {
                success: true,
                statistics,
                message: 'リアルタイム学習システムとの統合完了'
            };
            
        } catch (error) {
            console.error('❌ リアルタイム学習統合エラー:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 特定ユーザーの応答を学習済みデータで改善
     */
    async improveResponseWithLearnings(originalResponse, userInput, userId = 'default') {
        if (!this.isInitialized) {
            return { response: originalResponse, improved: false };
        }

        return await this.learner.improveResponse(originalResponse, userInput, userId);
    }

    /**
     * 処理状況レポート生成
     */
    generateReport() {
        if (this.processingResults.length === 0) {
            return {
                status: 'no_processing',
                message: 'まだ対話ログの処理が実行されていません'
            };
        }

        const summary = this.generateProcessingSummary(this.processingResults);
        const learnerStats = this.learner.getStatisticsSummary();

        return {
            status: 'processed',
            processingTimestamp: new Date().toISOString(),
            fileSummary: summary,
            learningStatistics: learnerStats,
            processedLogFiles: Array.from(this.processedLogs),
            totalLearningEffect: {
                totalProcessed: learnerStats.totalProcessed,
                isActive: learnerStats.isInitialized
            }
        };
    }

    /**
     * 処理済みファイルをprocessed/ディレクトリに移動
     */
    async moveToProcessed(filePath) {
        try {
            const fileName = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const processedFileName = `${timestamp}_${fileName}`;
            
            const processedDir = path.join(process.cwd(), 'data', 'logs', 'processed');
            await fs.mkdir(processedDir, { recursive: true });
            
            const processedPath = path.join(processedDir, processedFileName);
            
            // ファイル移動（コピー後削除）
            await fs.copyFile(filePath, processedPath);
            await fs.unlink(filePath);
            
            console.log(`📦 移動完了: ${fileName} → processed/${processedFileName}`);
            
        } catch (error) {
            console.warn(`⚠️ ファイル移動失敗: ${filePath}`, error.message);
            // 移動失敗しても処理は続行
        }
    }
}