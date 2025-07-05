#!/usr/bin/env node
/**
 * 対話WebUIサーバー
 * 統合学習エンジンとWebUIを接続するAPIサーバー
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { UnifiedLearningEngine } from '../core/unified-learning-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DialogueWebServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.unifiedEngine = new UnifiedLearningEngine();
    this.requestCount = 0;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS設定（簡易版）
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // JSON解析
    this.app.use(express.json());

    // 静的ファイル配信
    this.app.use(express.static(path.join(__dirname)));

    // ログ出力
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // メインページ
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'dialogue-web-ui.html'));
    });

    // 対話API
    this.app.post('/api/dialogue', async (req, res) => {
      try {
        const { type, message, userId, sessionId, context } = req.body;
        
        if (!message || typeof message !== 'string') {
          return res.status(400).json({
            error: 'メッセージが必要です',
            code: 'INVALID_MESSAGE'
          });
        }

        console.log(`📝 対話処理開始: ${message.substring(0, 50)}...`);

        // 統合学習エンジンで処理
        const learningResult = await this.unifiedEngine.processInput({
          type: type || 'dialogue',
          message,
          userId: userId || 'web-ui-user',
          sessionId: sessionId || 'web-ui-session',
          context: context || {}
        });

        // 応答生成
        const response = await this.generateResponse(message, learningResult);
        
        this.requestCount++;
        
        console.log(`✅ 対話処理完了: ${learningResult.metadata.processingTime}ms`);

        res.json({
          success: true,
          response: response,
          learningResult: learningResult,
          metadata: {
            requestId: this.requestCount,
            timestamp: new Date().toISOString(),
            processingTime: learningResult.metadata.processingTime,
            confidence: learningResult.metadata.confidence,
            concepts: learningResult.concepts.length,
            relationships: learningResult.relationships.length
          }
        });

      } catch (error) {
        console.error('❌ 対話処理エラー:', error);
        
        res.status(500).json({
          error: '対話処理中にエラーが発生しました',
          code: 'PROCESSING_ERROR',
          details: error.message
        });
      }
    });

    // エンジン状態API
    this.app.get('/api/status', (req, res) => {
      try {
        const status = this.unifiedEngine.getEngineStatus();
        
        res.json({
          success: true,
          status: 'running',
          engine: status,
          server: {
            requestCount: this.requestCount,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: '1.0.0'
          }
        });
      } catch (error) {
        console.error('❌ 状態取得エラー:', error);
        
        res.status(500).json({
          error: '状態取得中にエラーが発生しました',
          code: 'STATUS_ERROR',
          details: error.message
        });
      }
    });

    // 学習データエクスポートAPI
    this.app.get('/api/export', async (req, res) => {
      try {
        const userId = 'web-ui-user';
        const data = await this.unifiedEngine.exportLearningData(userId);
        
        if (!data) {
          return res.status(404).json({
            error: '学習データが見つかりません',
            code: 'DATA_NOT_FOUND'
          });
        }

        res.json({
          success: true,
          data: data,
          exportTime: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ データエクスポートエラー:', error);
        
        res.status(500).json({
          error: 'データエクスポート中にエラーが発生しました',
          code: 'EXPORT_ERROR',
          details: error.message
        });
      }
    });

    this.app.get('/api/export/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;
        const data = await this.unifiedEngine.exportLearningData(userId);
        
        if (!data) {
          return res.status(404).json({
            error: '学習データが見つかりません',
            code: 'DATA_NOT_FOUND'
          });
        }

        res.json({
          success: true,
          data: data,
          exportTime: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ データエクスポートエラー:', error);
        
        res.status(500).json({
          error: 'データエクスポート中にエラーが発生しました',
          code: 'EXPORT_ERROR',
          details: error.message
        });
      }
    });

    // エンジン設定更新API
    this.app.post('/api/config', (req, res) => {
      try {
        const { config } = req.body;
        
        if (!config || typeof config !== 'object') {
          return res.status(400).json({
            error: '設定データが必要です',
            code: 'INVALID_CONFIG'
          });
        }

        this.unifiedEngine.updateConfig(config);
        
        res.json({
          success: true,
          message: '設定が更新されました',
          config: this.unifiedEngine.getEngineStatus().config
        });
      } catch (error) {
        console.error('❌ 設定更新エラー:', error);
        
        res.status(500).json({
          error: '設定更新中にエラーが発生しました',
          code: 'CONFIG_ERROR',
          details: error.message
        });
      }
    });

    // 統計リセットAPI
    this.app.post('/api/reset', (req, res) => {
      try {
        this.unifiedEngine.resetStats();
        this.requestCount = 0;
        
        res.json({
          success: true,
          message: '統計情報をリセットしました'
        });
      } catch (error) {
        console.error('❌ 統計リセットエラー:', error);
        
        res.status(500).json({
          error: '統計リセット中にエラーが発生しました',
          code: 'RESET_ERROR',
          details: error.message
        });
      }
    });

    // エラーハンドリング
    this.app.use((err, req, res, next) => {
      console.error('❌ サーバーエラー:', err);
      
      res.status(500).json({
        error: 'サーバー内部エラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        details: err.message
      });
    });

    // 404ハンドリング
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'エンドポイントが見つかりません',
        code: 'NOT_FOUND',
        path: req.path
      });
    });
  }

  /**
   * 応答生成メソッド
   */
  async generateResponse(message, learningResult) {
    try {
      // 基本的な応答生成ロジック
      const concepts = learningResult.concepts;
      const relationships = learningResult.relationships;
      
      // 技術的な質問の検出
      const techKeywords = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Vue.js', 'Python', 'Java'];
      const foundTechKeywords = techKeywords.filter(keyword => 
        message.toLowerCase().includes(keyword.toLowerCase())
      );

      let response = '';

      if (foundTechKeywords.length > 0) {
        response = this.generateTechnicalResponse(message, foundTechKeywords, concepts, relationships);
      } else if (concepts.length > 0) {
        response = this.generateConceptResponse(message, concepts, relationships);
      } else {
        response = this.generateGenericResponse(message);
      }

      // 学習結果の付加情報
      if (learningResult.metadata.confidence > 0.5) {
        response += `\n\n💡 **学習結果**: ${concepts.length}個の概念と${relationships.length}個の関係性を学習しました。`;
      }

      return response;
      
    } catch (error) {
      console.error('応答生成エラー:', error);
      return 'すみません、応答の生成中にエラーが発生しました。';
    }
  }

  /**
   * 技術的な応答生成
   */
  generateTechnicalResponse(message, techKeywords, concepts, relationships) {
    const tech = techKeywords[0];
    
    if (tech === 'React' && message.toLowerCase().includes('usestate')) {
      return `ReactのuseStateフックについて説明します。\n\n**useStateとは**\nReactの基本的なHookの一つで、関数コンポーネントで状態管理を行うために使用します。\n\n**基本的な使い方**\n\`\`\`javascript\nimport React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>現在のカウント: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        カウントアップ\n      </button>\n    </div>\n  );\n}\n\`\`\`\n\n**重要なポイント**\n1. **分割代入**: useState()は[現在の値, 更新関数]の配列を返します\n2. **初期値**: useState(0)の0が初期値となります\n3. **更新関数**: setCountを呼ぶことで状態が更新され、再レンダリングが発生します`;
    }
    
    return `${tech}について詳しく説明いたします。\n\n学習した概念: ${concepts.join(', ')}\n\n${tech}は現代的な開発において重要な技術です。具体的な質問があれば、より詳細な説明をいたします。`;
  }

  /**
   * 概念ベースの応答生成
   */
  generateConceptResponse(message, concepts, relationships) {
    const topConcepts = concepts.slice(0, 3);
    
    return `ご質問の内容から以下の概念を学習しました:\n\n**主要概念**: ${topConcepts.join(', ')}\n\n${relationships.length > 0 ? `**関係性**: ${relationships.length}個の関係性を発見しました。` : ''}\n\nこれらの概念について、より詳しく知りたい点があれば、お気軽にお聞かせください。`;
  }

  /**
   * 一般的な応答生成
   */
  generateGenericResponse(message) {
    return `ご質問いただき、ありがとうございます。\n\n統合学習エンジンがメッセージを分析し、学習を行いました。より具体的な質問や技術的な内容について教えていただけると、より詳細な回答を提供できます。\n\n例えば：\n- プログラミングに関する質問\n- 技術的な概念の説明\n- 学習したい内容の詳細\n\nなどについて、お気軽にお聞かせください。`;
  }

  /**
   * サーバー起動
   */
  async start() {
    try {
      console.log('🚀 対話WebUIサーバー起動中...');
      
      // 統合学習エンジンの初期化を待機
      await this.unifiedEngine.initializeEngine();
      
      this.app.listen(this.port, () => {
        console.log('✅ 対話WebUIサーバー起動完了');
        console.log(`🌐 URL: http://localhost:${this.port}`);
        console.log('📊 統合学習エンジン準備完了');
        console.log('=' .repeat(50));
      });
      
    } catch (error) {
      console.error('❌ サーバー起動エラー:', error);
      process.exit(1);
    }
  }
}

// サーバー起動
const server = new DialogueWebServer();
server.start();