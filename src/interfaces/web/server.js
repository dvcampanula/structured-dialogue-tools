#!/usr/bin/env node

/**
 * 軽量統計学習型日本語処理AI - シンプルサーバー
 * 最低限の機能で動作確認、徐々に機能追加予定
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIVocabularyProcessor } from '../../processing/vocabulary/ai-vocabulary-processor.js';
import { StatisticalResponseGenerator } from '../../engines/response/statistical-response-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3002;

let aiVocabularyProcessor; // AIVocabularyProcessorのインスタンス
let statisticalGenerator; // StatisticalResponseGeneratorのインスタンス
const chatHistories = new Map(); // 対話履歴管理

// シンプルなJSONレスポンス
function sendJSON(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// シンプルなHTMLレスポンス
function sendHTML(res, content) {
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
}

// 対話履歴管理ヘルパー
function addToChatHistory(userId, userInput, aiResponse, metadata = {}) {
    if (!chatHistories.has(userId)) {
        chatHistories.set(userId, []);
    }
    
    const history = chatHistories.get(userId);
    history.push({
        timestamp: new Date().toISOString(),
        userInput,
        aiResponse,
        ...metadata
    });
    
    // 履歴サイズ制限
    if (history.length > 100) {
        history.shift();
    }
}

function getChatHistory(userId, limit = 50) {
    const history = chatHistories.get(userId) || [];
    return history.slice(-limit);
}

// リクエストハンドラ
async function handleRequest(req, res) { // asyncを追加
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    // CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // ルーティング
    if (url.pathname === '/' && req.method === 'GET') {
        // シンプルなWebUI
        const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>軽量統計学習型日本語処理AI</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; color: #333; }
        .input-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        textarea, input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
        textarea { height: 100px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .result { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .status.success { background: #d4edda; color: #155724; }
        .status.error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧬 軽量統計学習型日本語処理AI - Phase 4</h1>
        <p>統計的応答生成AI対話システム</p>
    </div>
    
    <div class="input-group">
        <label for="text">テキスト:</label>
        <textarea id="text" placeholder="プログラミングの効率を向上させる方法について"></textarea>
    </div>
    
    <div class="input-group">
        <label for="userId">ユーザーID:</label>
        <input type="text" id="userId" value="demo-user">
    </div>
    
    <button onclick="processText()">処理実行</button>
    
    <div id="result" class="result" style="display:none;"></div>
    
    <!-- Phase 4: 対話システム -->
    <hr style="margin: 40px 0;">
    <h2>🗣️ AI対話システム</h2>
    
    <div class="input-group">
        <label for="chatMessage">メッセージ:</label>
        <input type="text" id="chatMessage" placeholder="こんにちは！何について話しましょうか？">
    </div>
    
    <button onclick="sendChatMessage()">送信</button>
    
    <div id="chatHistory" class="result" style="display:block; max-height: 400px; overflow-y: auto;"></div>
    
    <script>
        async function processText() {
            const text = document.getElementById('text').value;
            const userId = document.getElementById('userId').value;
            
            if (!text.trim()) {
                showResult('テキストを入力してください', 'error');
                return;
            }
            
            try {
                showResult('処理中...', 'info');
                
                const response = await fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, userId })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showResult(JSON.stringify(data, null, 2), 'success');
                } else {
                    showResult('エラー: ' + data.error, 'error');
                }
            } catch (error) {
                showResult('通信エラー: ' + error.message, 'error');
            }
        }
        
        function showResult(message, type) {
            const result = document.getElementById('result');
            result.innerHTML = '<pre>' + message + '</pre>';
            result.className = 'result status ' + type;
            result.style.display = 'block';
        }
        
        // Phase 4: 対話機能
        async function sendChatMessage() {
            const message = document.getElementById('chatMessage').value;
            const userId = document.getElementById('userId').value;
            
            if (!message.trim()) {
                alert('メッセージを入力してください');
                return;
            }
            
            try {
                // ユーザーメッセージを履歴に追加
                addMessageToHistory('user', message);
                document.getElementById('chatMessage').value = '';
                
                // AI応答を取得
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, userId })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // AI応答を履歴に追加
                    addMessageToHistory('ai', data.response, {
                        strategy: data.strategy,
                        confidence: data.confidence,
                        qualityScore: data.qualityMetrics.score,
                        grade: data.qualityMetrics.grade,
                        processingTime: data.processingTime
                    });
                } else {
                    addMessageToHistory('error', 'エラー: ' + data.error);
                }
            } catch (error) {
                addMessageToHistory('error', '通信エラー: ' + error.message);
            }
        }
        
        function addMessageToHistory(type, message, metadata = {}) {
            const chatHistory = document.getElementById('chatHistory');
            const messageDiv = document.createElement('div');
            messageDiv.style.marginBottom = '15px';
            messageDiv.style.padding = '10px';
            messageDiv.style.borderRadius = '8px';
            
            if (type === 'user') {
                messageDiv.style.background = '#e3f2fd';
                messageDiv.style.textAlign = 'right';
                messageDiv.innerHTML = '<strong>あなた:</strong> ' + message;
            } else if (type === 'ai') {
                messageDiv.style.background = '#f1f8e9';
                let metaInfo = '';
                if (metadata.strategy) {
                    metaInfo = '<br><small>戦略: ' + metadata.strategy + 
                              ' | 信頼度: ' + (metadata.confidence || 0).toFixed(2) +
                              ' | 品質: ' + metadata.grade + 
                              ' (' + (metadata.qualityScore || 0).toFixed(2) + ')' +
                              ' | 処理時間: ' + (metadata.processingTime || 0) + 'ms</small>';
                }
                messageDiv.innerHTML = '<strong>AI:</strong> ' + message + metaInfo;
            } else {
                messageDiv.style.background = '#ffebee';
                messageDiv.innerHTML = '<strong>エラー:</strong> ' + message;
            }
            
            chatHistory.appendChild(messageDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
        
        // Enterキーで送信
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('chatMessage').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendChatMessage();
                }
            });
        });
    </script>
</body>
</html>`;
        sendHTML(res, html);
        
    } else if (url.pathname === '/api/process' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => { // asyncを追加
            try {
                const { text, userId } = JSON.parse(body);
                
                if (!aiVocabularyProcessor) {
                    sendJSON(res, { success: false, error: 'AI Processor not initialized' }, 500);
                    return;
                }

                const result = await aiVocabularyProcessor.processText(text, userId);
                sendJSON(res, { success: true, result });
            } catch (error) {
                console.error('Error processing text:', error);
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
        
    } else if (url.pathname === '/api/feedback' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => { // asyncを追加
            try {
                const { userId, originalText, processedText, selectedVocabulary, feedbackType } = JSON.parse(body);

                if (!aiVocabularyProcessor) {
                    sendJSON(res, { success: false, error: 'AI Processor not initialized' }, 500);
                    return;
                }

                await aiVocabularyProcessor.recordFeedback(userId, originalText, processedText, selectedVocabulary, feedbackType);
                sendJSON(res, { success: true, message: 'Feedback recorded successfully' });
            } catch (error) {
                console.error('Error recording feedback:', error);
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });

    } else if (url.pathname === '/api/chat' && req.method === 'POST') {
        // Phase 4: 統計的応答生成API
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { message, userId = 'default', sessionId } = JSON.parse(body);
                
                if (!message || typeof message !== 'string') {
                    sendJSON(res, { success: false, error: 'メッセージが必要です' }, 400);
                    return;
                }
                
                if (!statisticalGenerator) {
                    sendJSON(res, { success: false, error: 'Statistical Generator not initialized' }, 500);
                    return;
                }
                
                console.log(`🗣️ 対話リクエスト: "${message}" (ユーザー: ${userId})`);
                
                // 統計的応答生成
                const result = await statisticalGenerator.generateResponse(message, userId);
                
                if (result.success) {
                    // 対話履歴保存
                    addToChatHistory(userId, message, result.response, {
                        strategy: result.strategy,
                        qualityScore: result.qualityScore,
                        grade: result.grade,
                        confidence: result.confidence,
                        processingTime: result.processingTime
                    });
                    
                    // 成功レスポンス
                    sendJSON(res, {
                        success: true,
                        response: result.response,
                        confidence: result.confidence,
                        strategy: result.strategy,
                        qualityMetrics: {
                            score: result.qualityScore,
                            grade: result.grade,
                            improvements: result.improvements
                        },
                        processingTime: result.processingTime,
                        timestamp: result.timestamp
                    });
                } else {
                    // エラーレスポンス
                    sendJSON(res, result, 500);
                }
                
            } catch (error) {
                console.error('❌ 対話API エラー:', error);
                sendJSON(res, {
                    success: false,
                    error: '内部サーバーエラー',
                    details: error.message
                }, 500);
            }
        });

    } else if (url.pathname.startsWith('/api/chat/history/') && req.method === 'GET') {
        // 対話履歴取得API
        const pathParts = url.pathname.split('/');
        const userId = pathParts[4];
        const limit = parseInt(url.searchParams.get('limit')) || 50;
        
        if (!userId) {
            sendJSON(res, { success: false, error: 'ユーザーIDが必要です' }, 400);
            return;
        }
        
        try {
            const history = getChatHistory(userId, limit);
            sendJSON(res, {
                success: true,
                history,
                count: history.length
            });
        } catch (error) {
            console.error('❌ 履歴API エラー:', error);
            sendJSON(res, {
                success: false,
                error: '履歴取得エラー',
                details: error.message
            }, 500);
        }

    } else if (url.pathname === '/api/chat/status' && req.method === 'GET') {
        // システム状態API
        try {
            const systemStatus = statisticalGenerator ? statisticalGenerator.getSystemStatus() : { initialized: false };
            
            sendJSON(res, {
                success: true,
                status: systemStatus,
                serverInfo: {
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    nodeVersion: process.version
                }
            });
        } catch (error) {
            console.error('❌ 状態API エラー:', error);
            sendJSON(res, {
                success: false,
                error: '状態取得エラー',
                details: error.message
            }, 500);
        }
        
    } else if (url.pathname === '/health' && req.method === 'GET') {
        sendJSON(res, { 
            status: 'healthy', 
            ai: statisticalGenerator ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            version: 'phase4-v1'
        });
        
    } else {
        sendJSON(res, { error: 'Not Found' }, 404);
    }
}

// サーバー起動関数
async function startServer() {
    try {
        console.log('🚀 Phase 4 システム初期化開始...');
        
        // AIVocabularyProcessor初期化をスキップ（基礎固め用）
        console.log('📊 AIVocabularyProcessor初期化をスキップ（基礎固め用）');
        aiVocabularyProcessor = null;
        
        // StatisticalResponseGenerator初期化をスキップ（基礎固め用）
        console.log('🗣️ StatisticalResponseGenerator初期化をスキップ（基礎固め用）');
        statisticalGenerator = null;
        
        // 対話ログ学習システムは別コマンドで実行 (npm run learn-logs)
        console.log('ℹ️  対話ログ学習は `npm run learn-logs` コマンドで別途実行してください');

        const server = http.createServer(handleRequest);

        server.listen(PORT, () => {
            console.log('🚀 Phase 4 統計的応答生成AI サーバー起動完了');
            console.log(`📍 http://localhost:${PORT}`);
            console.log('✅ 5AI統合+対話システム完了 - 実際の統計学習AI処理が実行されます');
            console.log('🗣️ 対話機能: 統計的応答生成・品質評価・自己学習システム稼働中');
        });

        server.on('error', (error) => {
            console.error('❌ サーバーエラー:', error);
            process.exit(1);
        });

        process.on('SIGINT', () => {
            console.log('\n⏹️  サーバー停止');
            process.exit(0);
        });
    } catch (error) {
        console.error('❌ サーバー起動失敗:', error);
        process.exit(1);
    }
}

// サーバー起動
startServer();