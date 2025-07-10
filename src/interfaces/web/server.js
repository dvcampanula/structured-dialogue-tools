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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3002;

let aiVocabularyProcessor; // AIVocabularyProcessorのインスタンス

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
        <h1>🧬 軽量統計学習型日本語処理AI</h1>
        <p>シンプル版 - 基本動作確認</p>
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

    } else if (url.pathname === '/health' && req.method === 'GET') {
        sendJSON(res, { 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            version: 'simple-v1'
        });
        
    } else {
        sendJSON(res, { error: 'Not Found' }, 404);
    }
}

// サーバー起動関数
async function startServer() {
    try {
        console.log('Initializing AIVocabularyProcessor...');
        aiVocabularyProcessor = new AIVocabularyProcessor();
        await aiVocabularyProcessor.initialize();
        console.log('AIVocabularyProcessor initialized.');

        const server = http.createServer(handleRequest);

        server.listen(PORT, () => {
            console.log('🚀 シンプルサーバー起動完了');
            console.log(`📍 http://localhost:${PORT}`);
            console.log('✅ AI統合完了 - 実際の処理が実行されます');
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