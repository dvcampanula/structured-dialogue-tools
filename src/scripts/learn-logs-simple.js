#!/usr/bin/env node

/**
 * シンプル拡張対話ログ学習スクリプト
 * Worker Threadsを使わない軽量版
 * 
 * 使用方法: npm run learn-logs-simple
 */

import fs from 'fs';
import path from 'path';
import { SentimentAnalyzer } from '../learning/sentiment/sentiment-analyzer.js';
import { TopicClassifier } from '../learning/topic/topic-classifier.js';
import { DialoguePatternExtractor } from '../learning/pattern/dialogue-pattern-extractor.js';
import { PersistentLearningDB } from '../data/persistent-learning-db.js';
import { EnhancedHybridLanguageProcessor } from '../foundation/morphology/hybrid-processor.js';

console.log('🚀 シンプル拡張対話ログ学習システム開始...');
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
        
        // 学習結果
        const learningResults = {
            sentimentResults: [],
            topicResults: [],
            patternResults: [],
            fileStats: []
        };
        
        // 各ログファイルを順次処理
        for (let i = 0; i < logFiles.length; i++) {
            const filePath = logFiles[i];
            const fileName = path.basename(filePath);
            
            console.log(`\n📁 処理中 [${i+1}/${logFiles.length}]: ${fileName}`);
            
            try {
                const fileStartTime = Date.now();
                
                // ファイル読み込み
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                
                // 対話抽出
                const conversations = extractConversationsFromLines(lines);
                console.log(`   📊 抽出された対話: ${conversations.length}件`);
                
                if (conversations.length === 0) {
                    console.log(`   ⚠️ ${fileName}: 対話が見つかりませんでした`);
                    continue;
                }
                
                // 各対話に対して拡張学習実行
                for (let j = 0; j < conversations.length; j++) {
                    const conversation = conversations[j];
                    const userId = `log-user-${i}-${j}`;
                    
                    if (j % 10 === 0) {
                        console.log(`   🔄 処理中: ${j}/${conversations.length}件`);
                    }
                    
                    // 感情分析
                    const sentimentResult = await sentimentAnalyzer.analyze(conversation.text, userId);
                    learningResults.sentimentResults.push({
                        fileName,
                        conversation: conversation.text,
                        sentiment: sentimentResult.sentiment,
                        emotionStrength: sentimentResult.emotionStrength
                    });
                    
                    // トピック分類
                    const topicResult = await topicClassifier.classify(conversation.text, userId);
                    learningResults.topicResults.push({
                        fileName,
                        conversation: conversation.text,
                        primaryTopic: topicResult.primaryTopic,
                        confidence: topicResult.confidence
                    });
                    
                    // 対話パターン抽出（簡易版）
                    if (conversation.userInput && conversation.aiResponse) {
                        const patternResult = await dialoguePatternExtractor.extract(
                            conversation.userInput, 
                            conversation.aiResponse, 
                            [], 
                            userId
                        );
                        learningResults.patternResults.push({
                            fileName,
                            userInput: conversation.userInput,
                            aiResponse: conversation.aiResponse,
                            inputPattern: patternResult.inputPatterns.type,
                            coherence: patternResult.coherenceScore
                        });
                    }
                    
                    totalProcessed++;
                }
                
                const fileTime = Date.now() - fileStartTime;
                learningResults.fileStats.push({
                    fileName,
                    conversations: conversations.length,
                    processingTime: fileTime
                });
                
                console.log(`   ✅ ${fileName} 完了: ${conversations.length}件処理 (${fileTime}ms)`);
                
            } catch (error) {
                console.error(`   ❌ ${fileName} 処理エラー:`, error.message);
                learningResults.fileStats.push({
                    fileName,
                    error: error.message,
                    conversations: 0
                });
            }
        }
        
        // 従来のログ学習も実行
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
        
        console.log('\n🎉 シンプル拡張対話ログ学習完了');
        console.log('=' * 60);
        console.log(`📊 総合結果:`);
        console.log(`   - 処理ファイル数: ${totalFiles}`);
        console.log(`   - 総処理対話数: ${totalProcessed}`);
        console.log(`   - 総処理時間: ${totalTime}ms (${(totalTime/1000).toFixed(2)}秒)`);
        console.log(`   - スループット: ${(totalProcessed / (totalTime/1000)).toFixed(2)}件/秒`);
        
        // 拡張学習統計表示
        console.log('\n📈 拡張学習統計:');
        console.log(`   - 感情分析結果: ${learningResults.sentimentResults.length}件`);
        console.log(`   - トピック分類結果: ${learningResults.topicResults.length}件`);
        console.log(`   - 対話パターン結果: ${learningResults.patternResults.length}件`);
        
        // 感情分布
        if (learningResults.sentimentResults.length > 0) {
            const sentimentDistribution = {};
            for (const result of learningResults.sentimentResults) {
                const sentiment = result.sentiment.label;
                sentimentDistribution[sentiment] = (sentimentDistribution[sentiment] || 0) + 1;
            }
            console.log(`   - 感情分布: ${JSON.stringify(sentimentDistribution)}`);
        }
        
        // トピック分布
        if (learningResults.topicResults.length > 0) {
            const topicDistribution = {};
            for (const result of learningResults.topicResults) {
                const topic = result.primaryTopic.topic;
                topicDistribution[topic] = (topicDistribution[topic] || 0) + 1;
            }
            console.log(`   - トピック分布: ${JSON.stringify(topicDistribution)}`);
        }
        
        // 学習データ保存
        await saveSimpleLearningResults(learningResults);
        
        console.log('\n✨ 全処理完了！拡張学習データが保存されました。');
        
    } catch (error) {
        console.error('❌ シンプル拡張対話ログ学習エラー:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * ログ行から対話抽出
 */
function extractConversationsFromLines(lines) {
    const conversations = [];
    let currentConversation = null;
    
    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        
        // ユーザー発言検出
        if (cleanLine.includes('User:') || cleanLine.includes('ユーザー:')) {
            if (currentConversation) {
                conversations.push(currentConversation);
            }
            currentConversation = {
                userInput: cleanLine.replace(/^.*?(User:|ユーザー:)\s*/, '').trim(),
                aiResponse: '',
                text: cleanLine
            };
        }
        // AI応答検出
        else if (cleanLine.includes('AI:') || cleanLine.includes('Assistant:') || cleanLine.includes('assistant:')) {
            if (currentConversation) {
                currentConversation.aiResponse = cleanLine.replace(/^.*?(AI:|Assistant:|assistant:)\s*/, '').trim();
                currentConversation.text += ' ' + cleanLine;
                conversations.push(currentConversation);
                currentConversation = null;
            }
        }
        // 一般的なテキスト
        else if (cleanLine.length > 10) {
            conversations.push({
                userInput: '',
                aiResponse: '',
                text: cleanLine
            });
        }
    }
    
    // 最後の対話を追加
    if (currentConversation) {
        conversations.push(currentConversation);
    }
    
    return conversations;
}

/**
 * 学習結果保存
 */
async function saveSimpleLearningResults(results) {
    try {
        const resultsPath = 'data/learning/simple-enhanced-learning-results.json';
        
        const dataToSave = {
            timestamp: Date.now(),
            totalSentimentResults: results.sentimentResults.length,
            totalTopicResults: results.topicResults.length,
            totalPatternResults: results.patternResults.length,
            fileStats: results.fileStats,
            // 最新100件のみ保存
            sentimentSample: results.sentimentResults.slice(-100),
            topicSample: results.topicResults.slice(-100),
            patternSample: results.patternResults.slice(-100)
        };
        
        fs.writeFileSync(resultsPath, JSON.stringify(dataToSave, null, 2));
        console.log(`💾 シンプル学習結果保存完了: ${resultsPath}`);
        
    } catch (error) {
        console.warn('⚠️ 学習結果保存エラー:', error.message);
    }
}

// 実行
main().catch(error => {
    console.error('❌ スクリプト実行エラー:', error);
    process.exit(1);
});