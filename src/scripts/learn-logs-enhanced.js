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
        
        const learningConfig = await persistentLearningDB.loadSystemData('learning-config');
        if (!learningConfig) {
            console.error('❌ learning-config.json の読み込みに失敗しました。');
            process.exit(1);
        }

        const dependencies = { persistentLearningDB, hybridProcessor, learningConfig };
        
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
                // シンプル処理実行（ワーカープール無効化）
                const fileResult = await processLogFileSimple(
                    filePath,
                    sentimentAnalyzer,
                    topicClassifier, 
                    dialoguePatternExtractor,
                    dependencies.learningConfig, // learningConfigを追加
                    dependencies
                );
                
                // 結果記録
                fileResults.push({
                    fileName,
                    ...fileResult,
                    processingTime: fileResult.processingTime
                });
                
                totalProcessed += fileResult.totalProcessed;
                
                // 学習データ保存
                await persistentLearningDB.saveLearningStats();
                
                console.log(`   ✅ ${fileName} 完了: ${fileResult.totalProcessed}行処理, ${fileResult.actualLearned}件学習`);
                
            } catch (error) {
                console.error(`   ❌ ${fileName} 処理エラー:`, error.message);
                fileResults.push({
                    fileName,
                    error: error.message,
                    totalProcessed: 0
                });
            }
        }
        
        
        
        // 総合結果表示
        const totalTime = Date.now() - startTime;
        
        console.log('\n🎉 拡張対話ログ学習完了');
        console.log('=' * 60);
        console.log(`📊 総合結果:`);
        console.log(`   - 処理ファイル数: ${totalFiles}`);
        console.log(`   - 総処理行数: ${totalProcessed}`);
        console.log(`   - 総処理時間: ${totalTime}ms (${(totalTime/1000).toFixed(2)}秒)`);
        console.log(`   - スループット: ${totalTime === 0 ? '0.00' : (totalProcessed / (totalTime/1000)).toFixed(2)}行/秒`);
        
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
        hybridProcessor.cleanup(); // 追加
        process.exit(0); // 追加
        
    } catch (error) {
        console.error('❌ 拡張対話ログ学習エラー:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * シンプル処理関数（ワーカープール回避）
 */
async function processLogFileSimple(filePath, sentimentAnalyzer, topicClassifier, dialoguePatternExtractor, learningConfig, dependencies) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // 対話データ抽出
    const conversations = await extractConversationsFromLines(lines, dependencies.hybridProcessor);
    
    let processedCount = 0;
    let actualLearned = 0;
    const processingStartTime = Date.now();
    
    // 学習データ蓄積用
    const learningData = {
        ngramPatterns: new Map(),
        qualityData: [],
        vocabularyStats: new Map(),
        relationshipPatterns: []
    };
    
    // 直接処理（ワーカー無し）
    for (const conversation of conversations) {
        try {
            const text = conversation.text;
            
            // N-gramパターン抽出
            const ngramResult = await extractNgramPatterns(text, dependencies.hybridProcessor);
            if (ngramResult && ngramResult.size > 0) {
                for (const [pattern, frequency] of ngramResult.entries()) {
                    learningData.ngramPatterns.set(pattern, (learningData.ngramPatterns.get(pattern) || 0) + frequency);
                }
                actualLearned++;
            }
            
            // 品質データ抽出
            const qualityResult = await extractQualityData(text, conversation.timestamp, dependencies.hybridProcessor);
            if (qualityResult) {
                learningData.qualityData.push(qualityResult);
                actualLearned++;
            }
            
            // 語彙統計学習
            const vocabResult = await extractVocabularyStats(text, dependencies.hybridProcessor);
            if (vocabResult) {
                for (const [word, stats] of vocabResult) {
                    if (learningData.vocabularyStats.has(word)) {
                        const existing = learningData.vocabularyStats.get(word);
                        existing.count += stats.count;
                        existing.contexts.push(...stats.contexts);
                    } else {
                        learningData.vocabularyStats.set(word, stats);
                    }
                }
                actualLearned++;
            }
            
            processedCount++;
            
            if (processedCount % 50 === 0) {
                console.log(`   📊 進捗: ${processedCount}件処理済み, 学習: ${actualLearned}件`);
            }
            
        } catch (error) {
            // エラーは無視して継続
        }
    }
    
    // 学習データを実際のデータベースに保存
    await saveLearningDataToDatabase(learningData, dependencies.persistentLearningDB);
    
    return {
        totalProcessed: processedCount,
        actualLearned: actualLearned,
        processingTime: Date.now() - processingStartTime
    };
}

/**
 * 対話データ抽出
 */
async function extractConversationsFromLines(lines, hybridProcessor) {
    const conversations = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 5) continue;
        
        const cleanLine = trimmed
            .replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?\s/, '')
            .replace(/^\[\d{4}-\d{2}-\d{2}.*?\]\s/, '')
            .replace(/^[>\-\*]\s/, '')
            .replace(/^(Human|Assistant|User|AI):\s*/i, '')
            .replace(/https?:\/\/[^\s]+/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // 形態素解析による品質チェック
        if (await isValidDialogue(cleanLine, hybridProcessor)) {
            conversations.push({
                text: cleanLine,
                length: cleanLine.length,
                timestamp: Date.now()
            });
        }
    }
    
    return conversations;
}

/**
 * 対話の有効性判定（形態素解析ベース）
 */
async function isValidDialogue(text, hybridProcessor) {
    try {
        // 基本的な長さチェック
        if (text.length < 5 || text.length > 200) return false;
        
        // 形態素解析実行
        const processed = await hybridProcessor.processText(text);
        const terms = processed.enhancedTerms || [];
        
        // 有意義な語彙の存在チェック
        const meaningfulTerms = terms.filter(term => 
            term.term.length > 1 && 
            term.pos !== '助詞' && 
            term.pos !== '助動詞' && 
            term.pos !== '記号' &&
            !/^[0-9]+$/.test(term.term)
        );
        
        // 日本語対話かつ有意義な語彙が2語以上
        return meaningfulTerms.length >= 2 && 
               /[\u3042-\u3096\u30A1-\u30FC\u4E00-\u9FAF]/.test(text);
               
    } catch (error) {
        return false;
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

/**
 * N-gramパターン抽出（形態素解析ベース）
 */
async function extractNgramPatterns(text, hybridProcessor) {
    try {
        const processed = await hybridProcessor.processText(text);
        const terms = processed.enhancedTerms || [];
        
        // 有意義な語彙のみフィルタリング
        const meaningfulTerms = terms.filter(term => 
            term.term.length > 1 && 
            term.pos !== '助詞' && 
            term.pos !== '助動詞' && 
            term.pos !== '記号' &&
            term.pos !== '補助記号' &&
            !/^[0-9]+$/.test(term.term) &&
            !/^[a-zA-Z]+$/.test(term.term) &&
            !term.term.includes('.')
        );
        
        const patterns = new Map();
        
        // 2-gram, 3-gram パターン抽出
        for (let i = 0; i < meaningfulTerms.length - 1; i++) {
            const bigram = `${meaningfulTerms[i].term} ${meaningfulTerms[i + 1].term}`;
            patterns.set(bigram, (patterns.get(bigram) || 0) + 1);
            
            if (i < meaningfulTerms.length - 2) {
                const trigram = `${meaningfulTerms[i].term} ${meaningfulTerms[i + 1].term} ${meaningfulTerms[i + 2].term}`;
                patterns.set(trigram, (patterns.get(trigram) || 0) + 1);
            }
        }
        
        return patterns;
    } catch (error) {
        console.error(`   ❌ extractNgramPatterns error: ${error.message}`); // エラーログを追加
        return new Map(); // 空のMapを返すように変更
    }
}

/**
 * 品質データ抽出
 */
async function extractQualityData(text, timestamp, hybridProcessor, learningConfig) {
    try {
        const processed = await hybridProcessor.processText(text);
        const terms = processed.enhancedTerms || [];
        
        // 有意義な語彙のみカウント
        const meaningfulTerms = terms.filter(term => 
            term.term.length > 1 && 
            term.pos !== '助詞' && 
            term.pos !== '助動詞' && 
            term.pos !== '記号' &&
            !/^[0-9]+$/.test(term.term)
        );
        
        // 品質スコアを実際の語彙密度・複雑度から算出
        const vocabularyRichness = meaningfulTerms.length / terms.length;
        const avgWordLength = meaningfulTerms.reduce((sum, term) => sum + term.term.length, 0) / meaningfulTerms.length;
        const uniqueWords = new Set(meaningfulTerms.map(term => term.term)).size;
        
        const qualityScore = (meaningfulTerms.length === 0 || terms.length === 0) ? learningConfig.qualityScoreMin : Math.min(learningConfig.qualityScoreMax, Math.max(learningConfig.qualityScoreMin, 
            vocabularyRichness * learningConfig.qualityScoreWeights.vocabularyRichness + 
            (avgWordLength / 10) * learningConfig.qualityScoreWeights.avgWordLength + 
            (uniqueWords / meaningfulTerms.length) * learningConfig.qualityScoreWeights.uniqueWordRatio
        ));
        
        return {
            text: text.substring(0, 100),
            score: qualityScore,
            features: {
                length: text.length,
                meaningfulTermCount: meaningfulTerms.length,
                vocabularyRichness: vocabularyRichness,
                avgWordLength: avgWordLength,
                uniqueWordRatio: uniqueWords / meaningfulTerms.length,
                timestamp: timestamp
            }
        };
    } catch (error) {
        return null;
    }
}

/**
 * 語彙統計抽出
 */
async function extractVocabularyStats(text, hybridProcessor) {
    try {
        const processed = await hybridProcessor.processText(text);
        const terms = processed.enhancedTerms || [];
        const vocabularyStats = new Map();
        
        // 有意義な語彙のみ統計作成
        const meaningfulTerms = terms.filter(term => 
            term.term.length > 1 && 
            term.pos !== '助詞' && 
            term.pos !== '助動詞' && 
            term.pos !== '記号' &&
            term.pos !== '補助記号' &&
            !/^[0-9]+$/.test(term.term) &&
            !/^[a-zA-Z]+$/.test(term.term) &&
            !term.term.includes('.') &&
            !term.term.includes('/')
        );
        
        for (const term of meaningfulTerms) {
            const word = term.term;
            vocabularyStats.set(word, {
                rewards: 1,
                selections: 1,
                count: 1,
                contexts: [text.substring(0, 50)],
                pos: term.pos || 'unknown',
                timestamp: Date.now()
            });
        }
        
        return vocabularyStats;
    } catch (error) {
        return null;
    }
}

/**
 * 学習データをデータベースに保存
 */
async function saveLearningDataToDatabase(learningData, persistentLearningDB) {
    try {
        // N-gramデータ保存
        if (learningData.ngramPatterns.size > 0) { // Mapのサイズでチェック
            const existingNgram = await persistentLearningDB.loadNgramData() || { ngramFrequencies: new Map(), contextFrequencies: new Map(), continuationCounts: new Map(), documentFreqs: new Map(), totalNgrams: 0, totalDocuments: 0 };
            for (const [pattern, frequency] of learningData.ngramPatterns.entries()) { // Mapのentries()を使用
                existingNgram.ngramFrequencies.set(pattern, (existingNgram.ngramFrequencies.get(pattern) || 0) + frequency);
            }
            await persistentLearningDB.saveNgramData(existingNgram);
        }
        
        // 品質データ保存
        if (learningData.qualityData.length > 0) {
            const existingQualityData = await persistentLearningDB.loadQualityTrainingData();
            let existingQualityArray = existingQualityData && Array.isArray(existingQualityData.data) ? existingQualityData.data : [];
            
            // Create a set of unique identifiers for existing data to quickly check for duplicates
            const existingDataIdentifiers = new Set();
            for (const item of existingQualityArray) {
                if (item && item.content && item.content.text && item.timestamp) {
                    existingDataIdentifiers.add(`${item.content.text}-${item.timestamp}`);
                }
            }

            const trulyNewQualityData = [];
            for (const newData of learningData.qualityData) {
                if (newData && newData.content && newData.content.text && newData.timestamp) {
                    const identifier = `${newData.content.text}-${newData.timestamp}`;
                    if (!existingDataIdentifiers.has(identifier)) {
                        trulyNewQualityData.push(newData);
                        existingDataIdentifiers.add(identifier); // Add to set to prevent duplicates within the current batch
                    }
                }
            }

            if (trulyNewQualityData.length > 0) {
                // Combine existing data with truly new data
                const combinedQualityData = [...existingQualityArray, ...trulyNewQualityData];

                await persistentLearningDB.saveQualityTrainingData({
                    data: combinedQualityData,
                    lastUpdated: Date.now(),
                    dataCount: combinedQualityData.length,
                    modelTrained: false,
                    accuracy: 0
                });
            }
        }
        
        // 語彙統計データ保存
        if (learningData.vocabularyStats.size > 0) {
            const existingBandit = await persistentLearningDB.loadBanditData() || { vocabularyStats: new Map(), totalSelections: 0 };
            for (const [word, stats] of learningData.vocabularyStats.entries()) { // Mapのentries()を使用
                if (existingBandit.vocabularyStats.has(word)) {
                    const existingStats = existingBandit.vocabularyStats.get(word);
                    existingStats.rewards += stats.rewards;
                    existingStats.selections += stats.selections;
                    existingBandit.vocabularyStats.set(word, existingStats);
                } else {
                    existingBandit.vocabularyStats.set(word, {
                        rewards: stats.rewards,
                        selections: stats.selections
                    });
                }
            }
            await persistentLearningDB.saveBanditData(existingBandit);
        }
        
        console.log('   💾 学習データ保存完了');
    } catch (error) {
        console.warn('   ⚠️ 学習データ保存エラー:', error.message);
    }
}

// 実行
main().catch(error => {
    console.error('❌ スクリプト実行エラー:', error);
    process.exit(1);
});