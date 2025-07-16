#!/usr/bin/env node

/**
 * 最適化サーバー - 遅延初期化による高速起動
 * LazyInitializationManagerを使用してコンポーネントを段階的に読み込み
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { lazyInitManager } from '../../utils/lazy-initialization-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3002;

const chatHistories = new Map();

// 即座に必要な関数
function sendJSON(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function sendHTML(res, content) {
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
}

function addToChatHistory(userId, userInput, aiResponse, metadata = {}) {
    if (!chatHistories.has(userId)) {
        chatHistories.set(userId, []);
    }
    
    const history = chatHistories.get(userId);
    history.push({
        timestamp: Date.now(),
        user: userInput,
        ai: aiResponse,
        ...metadata
    });

    if (history.length > 50) {
        history.splice(0, history.length - 50);
    }
}

// コンポーネント遅延初期化登録
function registerComponents() {
    console.log('📋 コンポーネント登録開始...');

    // Level 0: データベース
    lazyInitManager.register('persistentLearningDB', async () => {
        const { PersistentLearningDB } = await import('../../data/persistent-learning-db.js');
        return new PersistentLearningDB();
    }, [], 1);

    lazyInitManager.register('dictionaryDB', async () => {
        const DictionaryDB = (await import('../../foundation/dictionary/dictionary-db.js')).default;
        const persistentLearningDB = await lazyInitManager.get('persistentLearningDB');
        const db = new DictionaryDB(persistentLearningDB);
        // initialize() はコンストラクタ内で呼ばれるので不要
        return db;
    }, ['persistentLearningDB'], 1);

    // Level 1: 基本プロセッサ
    lazyInitManager.register('hybridProcessor', async () => {
        const { EnhancedHybridLanguageProcessor } = await import('../../foundation/morphology/hybrid-processor.js');
        const processor = new EnhancedHybridLanguageProcessor();
        await processor.initialize();
        return processor;
    }, [], 2);

    // Level 2: コア学習モジュール
    lazyInitManager.register('ngramAI', async () => {
        const { NgramContextPatternAI } = await import('../../learning/ngram/ngram-context-pattern.js');
        const persistentLearningDB = await lazyInitManager.get('persistentLearningDB');
        const ngramAI = new NgramContextPatternAI(3, 0.75, persistentLearningDB);
        await ngramAI.initialize();
        return ngramAI;
    }, ['persistentLearningDB'], 2);

    lazyInitManager.register('dynamicLearner', async () => {
        const { DynamicRelationshipLearner } = await import('../../learning/cooccurrence/dynamic-relationship-learner.js');
        const persistentLearningDB = await lazyInitManager.get('persistentLearningDB');
        const hybridProcessor = await lazyInitManager.get('hybridProcessor');
        const ngramAI = await lazyInitManager.get('ngramAI');
        // DynamicRelationshipLearnerはuserIdを必要とするため、ここではインスタンス化しない
        // 代わりに、ファクトリ関数を登録する
        return async (userId) => { // ファクトリ関数をasyncにする
            const learner = new DynamicRelationshipLearner(persistentLearningDB, hybridProcessor, ngramAI, userId);
            await learner.initializeLearner(userId); // userIdで初期化
            return learner;
        };
    }, ['persistentLearningDB', 'hybridProcessor', 'ngramAI'], 3);
    
    lazyInitManager.register('banditAI', async () => {
        const { MultiArmedBanditVocabularyAI } = await import('../../learning/bandit/multi-armed-bandit-vocabulary.js');
        const persistentLearningDB = await lazyInitManager.get('persistentLearningDB');
        const banditAI = new MultiArmedBanditVocabularyAI(persistentLearningDB);
        await banditAI.initialize();
        return banditAI;
    }, ['persistentLearningDB'], 2);

    lazyInitManager.register('bayesianAI', async () => {
        const { BayesianPersonalizationAI } = await import('../../learning/bayesian/bayesian-personalization.js');
        const persistentLearningDB = await lazyInitManager.get('persistentLearningDB');
        const bayesianAI = new BayesianPersonalizationAI(persistentLearningDB);
        await bayesianAI.initialize();
        return bayesianAI;
    }, ['persistentLearningDB'], 2);

    lazyInitManager.register('qualityPredictor', async () => {
        const { QualityPredictionModel } = await import('../../learning/quality/quality-prediction-model.js');
        const persistentLearningDB = await lazyInitManager.get('persistentLearningDB');
        const ngramAI = await lazyInitManager.get('ngramAI');
        const dynamicLearnerFactory = await lazyInitManager.get('dynamicLearner'); // ファクトリを取得
        
        // ファクトリ関数を呼び出してインスタンスを生成
        const cooccurrenceLearnerInstance = await dynamicLearnerFactory('quality_predictor_user'); // ここをawaitする
        
        const qualityPredictor = new QualityPredictionModel(persistentLearningDB, ngramAI, cooccurrenceLearnerInstance);
        await qualityPredictor.initializeAIModules();
        return qualityPredictor;
    }, ['persistentLearningDB', 'ngramAI', 'dynamicLearner'], 2);

    // Level 3: 統合プロセッサ
    lazyInitManager.register('aiVocabularyProcessor', async () => {
        const { AIVocabularyProcessor } = await import('../../processing/vocabulary/ai-vocabulary-processor.js');
        const banditAI = await lazyInitManager.get('banditAI');
        const ngramAI = await lazyInitManager.get('ngramAI');
        const bayesianAI = await lazyInitManager.get('bayesianAI');
        const dynamicLearnerFactory = await lazyInitManager.get('dynamicLearner'); // ファクトリを取得
        const qualityPredictor = await lazyInitManager.get('qualityPredictor');
        const hybridProcessor = await lazyInitManager.get('hybridProcessor');
        const dictionary = await lazyInitManager.get('dictionaryDB');
        
        // ファクトリ関数を呼び出してインスタンスを生成
        const cooccurrenceLearnerInstance = await dynamicLearnerFactory('ai_processor_user');
        
        const processor = new AIVocabularyProcessor(banditAI, ngramAI, bayesianAI, cooccurrenceLearnerInstance, qualityPredictor, hybridProcessor, dictionary);
        await processor.initialize();
        return processor;
    }, ['banditAI', 'ngramAI', 'bayesianAI', 'dynamicLearner', 'qualityPredictor', 'hybridProcessor', 'dictionaryDB'], 2);

    // Level 4: 応答生成
    lazyInitManager.register('statisticalGenerator', async () => {
        const { StatisticalResponseGenerator } = await import('../../engines/response/statistical-response-generator.js');
        const aiVocabularyProcessor = await lazyInitManager.get('aiVocabularyProcessor');
        const persistentLearningDB = await lazyInitManager.get('persistentLearningDB');
        return new StatisticalResponseGenerator(aiVocabularyProcessor, persistentLearningDB);
    }, ['aiVocabularyProcessor', 'persistentLearningDB'], 2);

    console.log('✅ コンポーネント登録完了');
}

// HTTPサーバー作成
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    try {
        if (req.method === 'OPTIONS') {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }

        if (url.pathname === '/') {
            const htmlContent = await getWebUIContent();
            sendHTML(res, htmlContent);
            return;
        }

        if (url.pathname === '/status') {
            const stats = lazyInitManager.getStats();
            sendJSON(res, {
                success: true,
                serverStatus: 'running',
                port: PORT,
                initialization: stats,
                chatSessions: chatHistories.size
            });
            return;
        }

        if (url.pathname === '/api/process' && req.method === 'POST') {
            await handleProcessRequest(req, res);
            return;
        }

        if (url.pathname === '/api/chat' && req.method === 'POST') {
            await handleChatRequest(req, res);
            return;
        }

        sendJSON(res, { error: 'Not found' }, 404);

    } catch (error) {
        console.error('❌ リクエスト処理エラー:', error.message);
        sendJSON(res, { 
            error: 'Server error',
            message: error.message 
        }, 500);
    }
});

// 処理リクエスト処理
async function handleProcessRequest(req, res) {
    const body = await getRequestBody(req);
    const data = JSON.parse(body);
    
    const processor = await lazyInitManager.get('aiVocabularyProcessor');
    const result = await processor.processText(data.text, data.userId || 'default');
    
    sendJSON(res, result);
}

// チャットリクエスト処理
async function handleChatRequest(req, res) {
    const body = await getRequestBody(req);
    const data = JSON.parse(body);
    
    const generator = await lazyInitManager.get('statisticalGenerator');
    const result = await generator.generateResponse(data.message, data.userId || 'default');
    
    addToChatHistory(data.userId || 'default', data.message, result.response, {
        qualityScore: result.qualityScore,
        processingTime: result.processingTime
    });
    
    sendJSON(res, result);
}

// リクエストボディ取得
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// WebUI HTML取得
async function getWebUIContent() {
    const htmlPath = path.join(__dirname, '../../..', 'public', 'index.html');
    
    if (fs.existsSync(htmlPath)) {
        return fs.readFileSync(htmlPath, 'utf8');
    }

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>軽量統計学習型日本語処理AI</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .chat-container { border: 1px solid #ddd; height: 400px; overflow-y: auto; padding: 15px; background: #fafafa; border-radius: 5px; margin-bottom: 20px; }
        .input-container { display: flex; gap: 10px; }
        input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
        button { padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
        button:hover { background: #0056b3; }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user-message { background: #e3f2fd; margin-left: 20px; }
        .ai-message { background: #f1f8e9; margin-right: 20px; }
        .status { text-align: center; color: #666; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 軽量統計学習型日本語処理AI</h1>
        <div class="status">最適化サーバー実行中 - 遅延初期化対応</div>
        <div class="chat-container" id="chatContainer"></div>
        <div class="input-container">
            <input type="text" id="messageInput" placeholder="メッセージを入力..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()">送信</button>
            <button onclick="checkStatus()">状況確認</button>
        </div>
    </div>

    <script>
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;

            addMessage('user', message);
            input.value = '';

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, userId: 'default' })
                });

                const result = await response.json();
                addMessage('ai', result.response || result.error);
            } catch (error) {
                addMessage('ai', 'エラー: ' + error.message);
            }
        }

        function addMessage(type, content) {
            const container = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + type + '-message';
            messageDiv.textContent = (type === 'user' ? 'あなた: ' : 'AI: ') + content;
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }

        async function checkStatus() {
            try {
                const response = await fetch('/status');
                const status = await response.json();
                const stats = status.initialization;
                addMessage('ai', \`サーバー状況: \${stats.initializedComponents}/\${stats.totalComponents}件初期化済み (総読み込み時間: \${stats.totalLoadTime}ms)\`);
            } catch (error) {
                addMessage('ai', 'ステータス取得エラー: ' + error.message);
            }
        }
    </script>
</body>
</html>`;
}

// サーバー起動
async function startServer() {
    const startTime = Date.now();
    console.log('🚀 最適化サーバー起動開始...');
    
    // コンポーネント登録
    registerComponents();
    
    // サーバー開始
    server.listen(PORT, () => {
        const startupTime = Date.now() - startTime;
        console.log(`✅ サーバー起動完了: http://localhost:${PORT} (${startupTime}ms)`);
        console.log('📊 初期状況:');
        lazyInitManager.logStatus();
        
        // バックグラウンド初期化開始
        setTimeout(() => {
            lazyInitManager.initializeBackground().then(() => {
                console.log('🎉 全コンポーネント初期化完了');
                lazyInitManager.logStatus();
            });
        }, 1000);
    });
    
    // プロセス終了処理
    process.on('SIGINT', () => {
        console.log('\n🔄 サーバー終了処理...');
        lazyInitManager.cleanup();
        server.close(() => {
            console.log('✅ サーバー終了完了');
            process.exit(0);
        });
    });
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
    console.error('❌ 未処理例外:', error.message);
    console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未処理Promise拒否:', reason);
});

// サーバー起動実行
startServer();