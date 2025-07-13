#!/usr/bin/env node

/**
 * 拡張対話ログ学習スクリプト
 * 感情分析・トピック分類・対話パターン抽出を含む並列処理対応版
 * 
 * 使用方法: npm run learn-logs-enhanced
 */

import fs from 'fs';
import path from 'path';
import { learningPipeline } from '../streams/learning-pipeline.js';
import { SentimentAnalyzer } from '../learning/sentiment/sentiment-analyzer.js';
import { TopicClassifier } from '../learning/topic/topic-classifier.js';
import { DialoguePatternExtractor } from '../learning/pattern/dialogue-pattern-extractor.js';
import { PersistentLearningDB } from '../data/persistent-learning-db.js';
import { EnhancedHybridLanguageProcessor } from '../foundation/morphology/hybrid-processor.js';

console.log('🚀 拡張対話ログ学習システム開始...');
console.log('=' * 60);

async function main() {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalFiles = 0;
    
    try {
        // 依存関係初期化
        console.log('🔧 依存関係初期化中...');
        const persistentLearningDB = new PersistentLearningDB();
        const hybridProcessor = new EnhancedHybridLanguageProcessor();
        await hybridProcessor.initialize();
        
        const dependencies = { persistentLearningDB, hybridProcessor };
        
        // 拡張学習コンポーネント初期化
        console.log('🧠 拡張学習コンポーネント初期化中...');
        const sentimentAnalyzer = new SentimentAnalyzer(dependencies);
        const topicClassifier = new TopicClassifier(dependencies);
        const dialoguePatternExtractor = new DialoguePatternExtractor(dependencies);
        
        // ログディレクトリ確認
        const logDir = 'data/logs';
        if (!fs.existsSync(logDir)) {
            console.error(`❌ ログディレクトリが見つかりません: ${logDir}`);
            process.exit(1);
        }
        
        // ログファイル一覧取得
        const logFiles = fs.readdirSync(logDir)
            .filter(file => file.endsWith('.txt') && !file.includes('Zone.Identifier'))
            .map(file => path.join(logDir, file));
        
        if (logFiles.length === 0) {
            console.warn('⚠️ 処理対象のログファイルが見つかりません');
            process.exit(0);
        }
        
        console.log(`📋 処理対象: ${logFiles.length}ファイル`);
        totalFiles = logFiles.length;
        
        // 並列処理設定
        const processingOptions = {
            batchSize: 50,
            concurrency: 4,
            processingTypes: ['sentiment', 'topic', 'pattern']
        };
        
        // ファイル別処理結果
        const fileResults = [];
        
        // 各ログファイルを順次処理
        for (let i = 0; i < logFiles.length; i++) {
            const filePath = logFiles[i];
            const fileName = path.basename(filePath);
            
            console.log(`\n📁 処理中 [${i+1}/${logFiles.length}]: ${fileName}`);
            
            try {
                // ストリーミング処理実行
                const fileResult = await learningPipeline.processLogFile(
                    filePath,
                    (progress) => {
                        if (progress.batchesCompleted % 10 === 0) {
                            console.log(`   📊 進捗: ${progress.linesProcessed}行処理済み, ${progress.batchesCompleted}バッチ完了`);
                        }
                    },
                    processingOptions
                );
                
                // 結果記録
                fileResults.push({
                    fileName,
                    ...fileResult,
                    processingTime: fileResult.processingTime
                });
                
                totalProcessed += fileResult.totalProcessed;
                
                console.log(`   ✅ ${fileName} 完了: ${fileResult.totalProcessed}行処理`);
                
            } catch (error) {
                console.error(`   ❌ ${fileName} 処理エラー:`, error.message);
                fileResults.push({
                    fileName,
                    error: error.message,
                    totalProcessed: 0
                });
            }
        }
        
        // 追加学習処理（従来のログ学習も実行）
        console.log('\n🔄 従来ログ学習システム実行中...');
        try {
            const { AIVocabularyProcessor } = await import('../processing/vocabulary/ai-vocabulary-processor.js');
            const { StatisticalResponseGenerator } = await import('../engines/response/statistical-response-generator.js');
            
            const aiProcessor = new AIVocabularyProcessor();
            const statisticalGenerator = new StatisticalResponseGenerator(aiProcessor);
            
            const legacyResult = await statisticalGenerator.initializeDialogueLearning();
            
            if (legacyResult.success) {
                console.log('✅ 従来ログ学習完了');
                console.log(`   📊 対話ペア: ${legacyResult.summary?.totalDialoguePairs || 0}件`);
            } else {
                console.warn('⚠️ 従来ログ学習失敗:', legacyResult.error);
            }
            
        } catch (error) {
            console.warn('⚠️ 従来ログ学習スキップ:', error.message);
        }
        
        // 総合結果表示
        const totalTime = Date.now() - startTime;
        
        console.log('\n🎉 拡張対話ログ学習完了');
        console.log('=' * 60);
        console.log(`📊 総合結果:`);
        console.log(`   - 処理ファイル数: ${totalFiles}`);
        console.log(`   - 総処理行数: ${totalProcessed}`);
        console.log(`   - 総処理時間: ${totalTime}ms (${(totalTime/1000).toFixed(2)}秒)`);
        console.log(`   - スループット: ${(totalProcessed / (totalTime/1000)).toFixed(2)}行/秒`);
        
        // ファイル別詳細
        console.log('\n📋 ファイル別詳細:');
        for (const result of fileResults) {
            if (result.error) {
                console.log(`   ❌ ${result.fileName}: エラー (${result.error})`);
            } else {
                console.log(`   ✅ ${result.fileName}: ${result.totalProcessed}行 (${result.processingTime}ms)`);
            }
        }
        
        // 学習統計表示
        console.log('\n📈 学習統計:');
        const stats = await persistentLearningDB.getLearningStats();
        console.log(`   - 総関係性: ${stats.totalRelationsLearned}件`);
        console.log(`   - 総会話: ${stats.totalConversations}件`);
        console.log(`   - 品質スコア: ${stats.qualityScore?.toFixed(3) || 'N/A'}`);
        console.log(`   - 最終更新: ${stats.lastLearningDate ? new Date(stats.lastLearningDate).toLocaleString() : 'N/A'}`);
        
        // 拡張学習結果保存
        await saveEnhancedLearningResults({
            fileResults,
            totalProcessed,
            totalFiles,
            totalTime,
            timestamp: Date.now()
        });
        
        console.log('\n✨ 全処理完了！拡張学習データが保存されました。');
        
    } catch (error) {
        console.error('❌ 拡張対話ログ学習エラー:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * 拡張学習結果保存
 */
async function saveEnhancedLearningResults(results) {
    try {
        const resultsPath = 'data/learning/enhanced-log-learning-results.json';
        
        // 既存結果読み込み
        let allResults = [];
        if (fs.existsSync(resultsPath)) {
            const existingData = fs.readFileSync(resultsPath, 'utf8');
            allResults = JSON.parse(existingData);
        }
        
        // 新しい結果追加
        allResults.push(results);
        
        // 最新10件のみ保持
        if (allResults.length > 10) {
            allResults = allResults.slice(-10);
        }
        
        // 保存
        fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));
        console.log(`💾 学習結果保存完了: ${resultsPath}`);
        
    } catch (error) {
        console.warn('⚠️ 学習結果保存エラー:', error.message);
    }
}

/**
 * 進捗表示ヘルパー
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}時間${minutes % 60}分${seconds % 60}秒`;
    } else if (minutes > 0) {
        return `${minutes}分${seconds % 60}秒`;
    } else {
        return `${seconds}秒`;
    }
}

// 実行
main().catch(error => {
    console.error('❌ スクリプト実行エラー:', error);
    process.exit(1);
});