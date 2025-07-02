#!/usr/bin/env node

/**
 * ミニマムAI WebUI バックエンドサーバー
 * Express + EnhancedMinimalAI 統合
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { EnhancedMinimalAI } from '../core/enhanced-minimal-ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ミニマムAI インスタンス
let minimalAI;

// 初期化フラグ
let isInitialized = false;

// ミニマムAI初期化
async function initializeAI() {
  if (isInitialized) return;
  
  try {
    console.log('🌱 ミニマムAI初期化中...');
    minimalAI = new EnhancedMinimalAI();
    await minimalAI.initialize();
    isInitialized = true;
    console.log('✅ ミニマムAI初期化完了');
  } catch (error) {
    console.error('❌ ミニマムAI初期化エラー:', error);
    throw error;
  }
}

// ルート: WebUI提供
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'minimal-ai-ui.html'));
});

// API: ミニマムAI統計情報
app.get('/api/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const stats = minimalAI.getStatistics();
    res.json({
      success: true,
      data: {
        totalConcepts: stats.totalConcepts,
        learningPatterns: stats.learningPatterns,
        confidence: stats.confidence,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 基本対話（シンプルモード）
app.post('/api/chat/simple', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'メッセージが必要です'
      });
    }
    
    console.log(`💬 シンプル対話: "${message.slice(0, 50)}..."`);
    
    const response = await minimalAI.generateResponse(message);
    
    res.json({
      success: true,
      data: {
        response: response.response,
        confidence: response.confidence,
        detectedPhase: response.detectedPhase,
        suggestedConcepts: response.suggestedConcepts,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('シンプル対話エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 分析対話（分析モード）
app.post('/api/chat/analysis', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'メッセージが必要です'
      });
    }
    
    console.log(`🔬 分析対話: "${message.slice(0, 50)}..."`);
    
    const enhancedResponse = await minimalAI.generateEnhancedResponse(message);
    
    // グラフデータをシリアライズ可能な形式に変換
    const serializedResponse = {
      ...enhancedResponse,
      analysis: {
        ...enhancedResponse.analysis,
        conceptGraph: {
          nodes: enhancedResponse.analysis.conceptGraph.nodes,
          edges: enhancedResponse.analysis.conceptGraph.edges,
          clusters: enhancedResponse.analysis.conceptGraph.clusters,
          centralityScores: Array.from(enhancedResponse.analysis.conceptGraph.centralityScores.entries())
        }
      }
    };
    
    res.json({
      success: true,
      data: {
        ...serializedResponse,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('分析対話エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: フィードバック学習
app.post('/api/feedback', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { input, feedback, response } = req.body;
    
    if (!input || !feedback || !response) {
      return res.status(400).json({
        success: false,
        error: '入力、フィードバック、応答が必要です'
      });
    }
    
    console.log(`📚 フィードバック学習: ${feedback}`);
    
    await minimalAI.learnFromFeedback(input, feedback, response);
    
    res.json({
      success: true,
      message: 'フィードバック学習完了',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('フィードバック学習エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 分析結果フィードバック学習
app.post('/api/feedback/analysis', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { analysis, feedback } = req.body;
    
    if (!analysis || !feedback) {
      return res.status(400).json({
        success: false,
        error: '分析結果とフィードバックが必要です'
      });
    }
    
    console.log(`🧬 分析結果学習: ${feedback}`);
    
    await minimalAI.learnFromAnalysis(analysis, feedback);
    
    res.json({
      success: true,
      message: '分析結果学習完了',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('分析結果学習エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    initialized: isInitialized,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API: エクスポート
app.get('/api/export', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const stats = minimalAI.getStatistics();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: stats,
      metadata: {
        version: '1.0.0',
        type: 'minimal-ai-export'
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=minimal-ai-export-${new Date().toISOString().slice(0,10)}.json`);
    res.json(exportData);
    
  } catch (error) {
    console.error('エクスポートエラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// エラーハンドラー
app.use((error, req, res, next) => {
  console.error('サーバーエラー:', error);
  res.status(500).json({
    success: false,
    error: 'サーバー内部エラー',
    message: error.message
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません',
    path: req.path
  });
});

// サーバー起動
async function startServer() {
  try {
    // ミニマムAI初期化
    await initializeAI();
    
    // サーバー起動
    app.listen(PORT, () => {
      console.log('🚀 ミニマムAI WebUIサーバー起動');
      console.log(`📱 WebUI: http://localhost:${PORT}`);
      console.log(`🔌 API: http://localhost:${PORT}/api`);
      console.log('');
      console.log('🌟 利用可能な機能:');
      console.log('  😊 シンプルモード: 基本対話支援');
      console.log('  🔬 分析モード: 高度分析・異常検知・グラフ分析');
      console.log('  🧠 学習機能: 個人特化パターン学習');
      console.log('  📊 統計表示: リアルタイム統計・進捗表示');
      console.log('  📥 エクスポート: 対話履歴・学習データ保存');
      console.log('');
      console.log('✅ 完全プライベート・外部API不要・軽量・高速');
    });
    
  } catch (error) {
    console.error('❌ サーバー起動エラー:', error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n🛑 サーバー停止中...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 サーバー停止中...');
  process.exit(0);
});

// サーバー起動
startServer();