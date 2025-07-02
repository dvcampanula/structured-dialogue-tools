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
import { DialogueLogLearner } from '../core/dialogue-log-learner.js';
import fs from 'fs';
import multer from 'multer';

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
let logLearner;

// ファイルアップロード設定
const upload = multer({ 
  dest: 'workspace/temp/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB制限
});

// 初期化フラグ
let isInitialized = false;

// ミニマムAI初期化
async function initializeAI() {
  if (isInitialized) return;
  
  try {
    console.log('🌱 ミニマムAI初期化中...');
    minimalAI = new EnhancedMinimalAI();
    await minimalAI.initialize();
    
    // ログ学習システム初期化
    const conceptDB = minimalAI.getConceptDB();
    logLearner = new DialogueLogLearner(conceptDB, minimalAI);
    
    isInitialized = true;
    console.log('✅ ミニマムAI+ログ学習システム初期化完了');
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

// === ログ学習API エンドポイント ===

// API: ログファイルをアップロード・学習
app.post('/api/learn/upload', upload.single('logfile'), async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'ログファイルが指定されていません'
      });
    }
    
    console.log(`📄 ログファイル学習開始: ${req.file.originalname}`);
    
    const result = await logLearner.processLogFile(req.file.path);
    
    // 一時ファイル削除
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        format: result.format,
        conceptsExtracted: result.concepts.length,
        newConcepts: result.integrationResults.new.length,
        updatedConcepts: result.integrationResults.updated.length,
        metrics: result.metrics,
        learningStats: logLearner.getLearningStats()
      }
    });
  } catch (error) {
    console.error('ログ学習エラー:', error);
    // 一時ファイル削除（エラー時も）
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: test-logsディレクトリから自動学習
app.post('/api/learn/batch', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { directory } = req.body;
    const targetPath = directory || path.join(__dirname, '../../test-logs/benchmarks/quality/technical');
    
    console.log(`📁 バッチ学習開始: ${targetPath}`);
    
    const results = await logLearner.processLogDirectory(targetPath);
    
    res.json({
      success: true,
      data: {
        directory: targetPath,
        processedFiles: results.processedFiles,
        totalConcepts: results.totalConcepts,
        newConcepts: results.integrationResults.new.length,
        updatedConcepts: results.integrationResults.updated.length,
        learningStats: logLearner.getLearningStats()
      }
    });
  } catch (error) {
    console.error('バッチ学習エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 学習統計取得
app.get('/api/learn/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const stats = logLearner.getLearningStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 利用可能なログディレクトリ一覧
app.get('/api/learn/directories', async (req, res) => {
  try {
    const testLogsPath = path.join(__dirname, '../../test-logs');
    const directories = [];
    
    function scanDirectory(dirPath, relativePath = '') {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);
        
        if (fs.statSync(itemPath).isDirectory()) {
          const txtFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.txt'));
          if (txtFiles.length > 0) {
            directories.push({
              path: itemRelativePath,
              fullPath: itemPath,
              logCount: txtFiles.length,
              files: txtFiles
            });
          }
          // 再帰的にサブディレクトリを探索
          scanDirectory(itemPath, itemRelativePath);
        }
      }
    }
    
    if (fs.existsSync(testLogsPath)) {
      scanDirectory(testLogsPath);
    }
    
    res.json({
      success: true,
      data: {
        baseDirectory: testLogsPath,
        directories: directories.sort((a, b) => b.logCount - a.logCount)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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