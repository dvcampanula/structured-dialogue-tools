/**
 * LearningWorker - 学習処理ワーカー
 * メインスレッドから独立して学習タスクを実行
 */

import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { PersistentLearningDB } from '../data/persistent-learning-db.js';

const workerId = workerData.workerId;
const learningDB = new PersistentLearningDB();

// ワーカー初期化
console.log(`🔧 学習ワーカー${workerId}初期化中...`);

// 感情・トピックパターンの動的読み込み
let sentimentPatterns = {};
let topicPatterns = {};

async function loadPatterns() {
    try {
        const sentimentData = await learningDB.loadSystemData('sentiment_intensifiers');
        sentimentPatterns = sentimentData || await _initializeDefaultSentimentPatterns();

        const topicData = await learningDB.loadSystemData('topic_categories');
        topicPatterns = topicData || await _initializeDefaultTopicPatterns();
        
        console.log(`✅ ワーカー${workerId}: 学習パターン読み込み完了`);
    } catch (error) {
        console.error(`❌ ワーカー${workerId}: 学習パターン読み込みエラー:`, error);
        sentimentPatterns = await _initializeDefaultSentimentPatterns();
        topicPatterns = await _initializeDefaultTopicPatterns();
    }
}

async function _initializeDefaultSentimentPatterns() {
    const defaults = {
        positive: ['嬉しい', '楽しい', '良い', '素晴らしい', '感謝'],
        negative: ['悲しい', '辛い', '困る', 'だめ', '嫌い']
    };
    try {
        await learningDB.saveSystemData('sentiment_intensifiers', defaults);
    } catch (e) { console.error(e); }
    return defaults;
}

async function _initializeDefaultTopicPatterns() {
    const defaults = {
        technology: ['プログラミング', 'AI', 'システム', 'データ'],
        daily_life: ['生活', '家族', '友達', '食事'],
        work: ['仕事', '会社', 'ビジネス', '会議']
    };
    try {
        await learningDB.saveSystemData('topic_categories', defaults);
    } catch (e) { console.error(e); }
    return defaults;
}

loadPatterns();

// タスク処理関数マップ
const taskHandlers = {
    'sentiment_analysis': handleSentimentAnalysis,
    'topic_classification': handleTopicClassification,
    'dialogue_pattern': handleDialoguePattern,
    'log_file_processing': handleLogFileProcessing,
    'batch_learning': handleBatchLearning,
    'statistical_analysis': handleStatisticalAnalysis,
    'data_cleaning': handleDataCleaning,
    'feature_extraction': handleFeatureExtraction
};

// メインメッセージハンドラ
parentPort.on('message', async (message) => {
    const { taskId, type, data, options } = message;
    const startTime = Date.now();
    
    try {
        console.log(`🔄 ワーカー${workerId}: タスク${taskId} (${type}) 開始`);
        
        const handler = taskHandlers[type];
        if (!handler) {
            throw new Error(`Unknown task type: ${type}`);
        }
        
        const result = await handler(data, options);
        const processingTime = Date.now() - startTime;
        
        parentPort.postMessage({
            taskId,
            success: true,
            result,
            processingTime
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error(`❌ ワーカー${workerId}: タスク${taskId}エラー:`, error.message);
        
        parentPort.postMessage({
            taskId,
            success: false,
            error: error.message,
            processingTime
        });
    }
});

/**
 * 感情分析タスク処理
 */
async function handleSentimentAnalysis(data, options) {
    const { texts, userId } = data;
    const results = [];
    
    for (const text of texts) {
        const analysis = await analyzeSentiment(text);
        results.push({
            text,
            sentiment: analysis.sentiment,
            confidence: analysis.confidence,
            emotionWords: analysis.emotionWords,
            timestamp: Date.now()
        });
    }
    
    return {
        userId,
        totalAnalyzed: results.length,
        results,
        summary: calculateSentimentSummary(results)
    };
}

/**
 * トピック分類タスク処理
 */
async function handleTopicClassification(data, options) {
    const { texts, userId } = data;
    const results = [];
    
    for (const text of texts) {
        const classification = await classifyTopic(text);
        results.push({
            text,
            primaryTopic: classification.primaryTopic,
            confidence: classification.confidence,
            allScores: classification.allScores,
            timestamp: Date.now()
        });
    }
    
    return {
        userId,
        totalClassified: results.length,
        results,
        summary: calculateTopicSummary(results)
    };
}

/**
 * 対話パターンタスク処理
 */
async function handleDialoguePattern(data, options) {
    const { conversations, userId } = data;
    const results = [];
    
    for (const conversation of conversations) {
        const pattern = await extractDialoguePattern(conversation);
        results.push({
            conversation,
            patterns: pattern.patterns,
            flow: pattern.flow,
            style: pattern.style,
            timestamp: Date.now()
        });
    }
    
    return {
        userId,
        totalProcessed: results.length,
        results,
        summary: calculatePatternSummary(results)
    };
}

/**
 * ログファイル処理タスク
 */
async function handleLogFileProcessing(data, options) {
    const { filePath, processingType } = data;
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Log file not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const results = {
        filePath,
        totalLines: lines.length,
        processedLines: 0,
        extractedData: []
    };
    
    switch (processingType) {
        case 'extract_conversations':
            results.extractedData = extractConversationsFromLog(lines);
            break;
        case 'extract_errors':
            results.extractedData = extractErrorsFromLog(lines);
            break;
        case 'extract_patterns':
            results.extractedData = extractPatternsFromLog(lines);
            break;
        default:
            results.extractedData = lines.slice(0, 100); // 最初の100行
    }
    
    results.processedLines = results.extractedData.length;
    
    return results;
}

/**
 * バッチ学習タスク処理
 */
async function handleBatchLearning(data, options) {
    const { learningData, learningType } = data;
    const results = {
        learningType,
        totalItems: learningData.length,
        processedItems: 0,
        learnedPatterns: [],
        statistics: {}
    };
    
    for (const item of learningData) {
        try {
            const learned = await processLearningItem(item, learningType);
            results.learnedPatterns.push(learned);
            results.processedItems++;
        } catch (error) {
            console.warn(`⚠️ 学習アイテム処理失敗:`, error.message);
        }
    }
    
    results.statistics = calculateLearningStatistics(results.learnedPatterns);
    
    return results;
}

/**
 * 統計分析タスク処理
 */
async function handleStatisticalAnalysis(data, options) {
    const { dataset, analysisType } = data;
    
    switch (analysisType) {
        case 'correlation':
            return calculateCorrelation(dataset);
        case 'distribution':
            return analyzeDistribution(dataset);
        case 'clustering':
            return performClustering(dataset);
        case 'trend_analysis':
            return analyzeTrends(dataset);
        default:
            return performBasicStatistics(dataset);
    }
}

/**
 * データクリーニングタスク処理
 */
async function handleDataCleaning(data, options) {
    const { rawData, cleaningRules } = data;
    const results = {
        originalCount: rawData.length,
        cleanedData: [],
        removedItems: [],
        statistics: {}
    };
    
    for (const item of rawData) {
        const cleaned = cleanDataItem(item, cleaningRules);
        if (cleaned.valid) {
            results.cleanedData.push(cleaned.data);
        } else {
            results.removedItems.push({
                original: item,
                reasons: cleaned.reasons
            });
        }
    }
    
    results.statistics = {
        cleanedCount: results.cleanedData.length,
        removedCount: results.removedItems.length,
        retentionRate: results.cleanedData.length / results.originalCount
    };
    
    return results;
}

/**
 * 特徴抽出タスク処理
 */
async function handleFeatureExtraction(data, options) {
    const { texts, extractionType } = data;
    const results = {
        extractionType,
        totalTexts: texts.length,
        features: []
    };
    
    for (const text of texts) {
        const features = await extractFeatures(text, extractionType);
        results.features.push({
            text,
            features,
            timestamp: Date.now()
        });
    }
    
    return results;
}

/**
 * ヘルパー関数群
 */

// 感情分析
async function analyzeSentiment(text) {
    const positiveWords = sentimentPatterns.positive || [];
    const negativeWords = sentimentPatterns.negative || [];
    
    let positiveScore = 0;
    let negativeScore = 0;
    const emotionWords = [];
    
    for (const word of positiveWords) {
        if (text.includes(word)) {
            positiveScore++;
            emotionWords.push({ word, type: 'positive' });
        }
    }
    
    for (const word of negativeWords) {
        if (text.includes(word)) {
            negativeScore++;
            emotionWords.push({ word, type: 'negative' });
        }
    }
    
    let sentiment = 'neutral';
    let confidence = 0.5;
    
    if (positiveScore > negativeScore) {
        sentiment = 'positive';
        confidence = 0.5 + (positiveScore / (positiveScore + negativeScore + 1)) * 0.5;
    } else if (negativeScore > positiveScore) {
        sentiment = 'negative';
        confidence = 0.5 + (negativeScore / (positiveScore + negativeScore + 1)) * 0.5;
    }
    
    return { sentiment, confidence, emotionWords };
}

// トピック分類
async function classifyTopic(text) {
    const topics = topicPatterns || {};
    
    const scores = {};
    let maxScore = 0;
    let primaryTopic = 'general';
    
    for (const [topic, keywords] of Object.entries(topics)) {
        let score = 0;
        // keywordsが配列であることを確認
        if (Array.isArray(keywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) score++;
            }
            scores[topic] = keywords.length > 0 ? score / keywords.length : 0;
        } else if (keywords && Array.isArray(keywords.keywords)) {
            // topic_categoriesの構造に対応
            for (const keyword of keywords.keywords) {
                if (text.includes(keyword)) score++;
            }
            scores[topic] = keywords.keywords.length > 0 ? score / keywords.keywords.length : 0;
        }
        
        if (scores[topic] > maxScore) {
            maxScore = scores[topic];
            primaryTopic = topic;
        }
    }
    
    return {
        primaryTopic,
        confidence: maxScore,
        allScores: scores
    };
}

// 対話パターン抽出
async function extractDialoguePattern(conversation) {
    const patterns = [];
    const flow = { turns: conversation.length };
    const style = { formal: 0, casual: 0 };
    
    for (const turn of conversation) {
        const turnText = turn.content || turn.message || turn;
        
        // パターン検出
        if (turnText.includes('？') || turnText.includes('?')) {
            patterns.push('question');
        }
        if (turnText.includes('ありがとう')) {
            patterns.push('gratitude');
        }
        
        // スタイル分析
        if (turnText.includes('です') || turnText.includes('ます')) {
            style.formal++;
        }
        if (turnText.includes('だよ') || turnText.includes('だね')) {
            style.casual++;
        }
    }
    
    return { patterns, flow, style };
}

// ログからの会話抽出
function extractConversationsFromLog(lines) {
    const conversations = [];
    let currentConversation = [];
    
    for (const line of lines) {
        if (line.includes('User:') || line.includes('AI:')) {
            currentConversation.push(line);
        } else if (currentConversation.length > 0) {
            conversations.push([...currentConversation]);
            currentConversation = [];
        }
    }
    
    return conversations;
}

// ログからのエラー抽出
function extractErrorsFromLog(lines) {
    return lines.filter(line => 
        line.includes('ERROR') || 
        line.includes('エラー') || 
        line.includes('❌')
    );
}

// ログからのパターン抽出
function extractPatternsFromLog(lines) {
    const patterns = {};
    
    for (const line of lines) {
        const words = line.split(/\s+/);
        for (const word of words) {
            if (word.length > 2) {
                patterns[word] = (patterns[word] || 0) + 1;
            }
        }
    }
    
    return Object.entries(patterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50)
        .map(([word, count]) => ({ word, count }));
}

// 学習アイテム処理
async function processLearningItem(item, learningType) {
    switch (learningType) {
        case 'sentiment':
            return await analyzeSentiment(item.text);
        case 'topic':
            return await classifyTopic(item.text);
        default:
            return { processed: true, item };
    }
}

// 基本統計計算
function performBasicStatistics(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        return { error: 'Invalid dataset' };
    }
    
    const values = dataset.filter(v => typeof v === 'number');
    if (values.length === 0) {
        return { error: 'No numeric values found' };
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sortedValues = values.sort((a, b) => a - b);
    const median = sortedValues[Math.floor(values.length / 2)];
    
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
        count: values.length,
        sum,
        mean,
        median,
        min: Math.min(...values),
        max: Math.max(...values),
        variance,
        standardDeviation: stdDev
    };
}

// データクリーニング
function cleanDataItem(item, rules) {
    const result = { valid: true, data: item, reasons: [] };
    
    if (rules.removeEmpty && (!item || item.toString().trim() === '')) {
        result.valid = false;
        result.reasons.push('empty');
    }
    
    if (rules.minLength && item.toString().length < rules.minLength) {
        result.valid = false;
        result.reasons.push('too_short');
    }
    
    if (rules.maxLength && item.toString().length > rules.maxLength) {
        result.valid = false;
        result.reasons.push('too_long');
    }
    
    return result;
}

// 特徴抽出
async function extractFeatures(text, extractionType) {
    const features = {
        length: text.length,
        wordCount: text.split(/\s+/).length,
        sentenceCount: (text.match(/[。！？.!?]/g) || []).length + 1
    };
    
    if (extractionType === 'linguistic') {
        features.kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
        features.hiraganaCount = (text.match(/[\u3040-\u309f]/g) || []).length;
        features.katakanaCount = (text.match(/[\u30a0-\u30ff]/g) || []).length;
    }
    
    return features;
}

// サマリー計算関数
function calculateSentimentSummary(results) {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    
    for (const result of results) {
        sentimentCounts[result.sentiment]++;
    }
    
    return {
        distribution: sentimentCounts,
        totalAnalyzed: results.length,
        dominantSentiment: Object.keys(sentimentCounts).reduce((a, b) => 
            sentimentCounts[a] > sentimentCounts[b] ? a : b
        )
    };
}

function calculateTopicSummary(results) {
    const topicCounts = {};
    
    for (const result of results) {
        const topic = result.primaryTopic;
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
    
    return {
        distribution: topicCounts,
        totalClassified: results.length,
        dominantTopic: Object.keys(topicCounts).reduce((a, b) => 
            topicCounts[a] > topicCounts[b] ? a : b
        )
    };
}

function calculatePatternSummary(results) {
    const allPatterns = [];
    
    for (const result of results) {
        allPatterns.push(...result.patterns);
    }
    
    const patternCounts = {};
    for (const pattern of allPatterns) {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    }
    
    return {
        totalConversations: results.length,
        uniquePatterns: Object.keys(patternCounts).length,
        mostCommonPattern: Object.keys(patternCounts).reduce((a, b) => 
            patternCounts[a] > patternCounts[b] ? a : b
        )
    };
}

function calculateLearningStatistics(patterns) {
    return {
        totalPatterns: patterns.length,
        successRate: patterns.filter(p => p && !p.error).length / patterns.length,
        averageConfidence: patterns.filter(p => p.confidence)
            .reduce((sum, p) => sum + p.confidence, 0) / 
            patterns.filter(p => p.confidence).length || 0
    };
}

console.log(`✅ 学習ワーカー${workerId}準備完了`);