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

// API: 品質改善実行
app.post('/api/quality/improve', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    console.log('🧹 品質改善開始...');
    
    // 現在の概念DBを取得
    const currentDB = minimalAI.getConceptDB();
    
    // 品質管理システムのインスタンス作成
    const { ConceptQualityManager } = await import('../core/concept-quality-manager.js');
    const qualityManager = new ConceptQualityManager();
    
    // 品質改善実行
    const improvedDB = qualityManager.improveConceptDB(currentDB);
    
    // 改善されたDBをシステムに適用
    minimalAI.updateConceptDB(improvedDB);
    
    // 品質レポート生成
    const qualityReport = qualityManager.generateQualityReport(currentDB, improvedDB);
    
    console.log(`✅ 品質改善完了: ${qualityReport.improvements.improvementRatio}%改善`);
    
    res.json({
      success: true,
      data: {
        report: qualityReport,
        improvements: improvedDB.qualityStats,
        message: `品質改善完了 - ${improvedDB.qualityStats.improvementRatio}%の効率化を達成`
      }
    });
    
  } catch (error) {
    console.error('品質改善エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 品質統計取得
app.get('/api/quality/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const conceptDB = minimalAI.getConceptDB();
    const { ConceptQualityManager } = await import('../core/concept-quality-manager.js');
    const qualityManager = new ConceptQualityManager();
    
    const allConcepts = [
      ...(conceptDB.concepts?.surface || []),
      ...(conceptDB.concepts?.deep || [])
    ];
    
    // 品質分析
    const qualityStats = {
      totalConcepts: allConcepts.length,
      surfaceConcepts: conceptDB.concepts?.surface?.length || 0,
      deepConcepts: conceptDB.concepts?.deep?.length || 0,
      qualityDistribution: {
        excellent: 0,
        good: 0,
        acceptable: 0,
        poor: 0
      },
      categoryDistribution: {},
      duplicatesPotential: 0
    };
    
    // 品質分布計算
    for (const concept of allConcepts) {
      const quality = qualityManager.calculateQualityScore(concept);
      
      if (quality >= qualityManager.qualityThresholds.excellent) {
        qualityStats.qualityDistribution.excellent++;
      } else if (quality >= qualityManager.qualityThresholds.good) {
        qualityStats.qualityDistribution.good++;
      } else if (quality >= qualityManager.qualityThresholds.acceptable) {
        qualityStats.qualityDistribution.acceptable++;
      } else {
        qualityStats.qualityDistribution.poor++;
      }
      
      // カテゴリ分布
      const category = concept.category || 'general';
      qualityStats.categoryDistribution[category] = (qualityStats.categoryDistribution[category] || 0) + 1;
    }
    
    // 重複可能性の簡易チェック
    const duplicateGroups = qualityManager.findDuplicateGroups(allConcepts);
    qualityStats.duplicatesPotential = duplicateGroups.length;
    
    res.json({
      success: true,
      data: qualityStats
    });
    
  } catch (error) {
    console.error('品質統計取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: バックアップ作成
app.get('/api/backup/create', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      conceptDB: minimalAI.getConceptDB(),
      learningStats: logLearner.getLearningStats(),
      version: '1.0.0'
    };
    
    const backupDir = path.join(__dirname, '../../data/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `concept-db-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    console.log(`📦 バックアップ作成: ${backupFile}`);
    
    res.json({
      success: true,
      data: {
        filename: `concept-db-backup-${timestamp}.json`,
        size: fs.statSync(backupFile).size,
        conceptCount: (backupData.conceptDB.concepts?.surface?.length || 0) + (backupData.conceptDB.concepts?.deep?.length || 0),
        timestamp
      }
    });
    
  } catch (error) {
    console.error('バックアップ作成エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: バックアップ一覧取得
app.get('/api/backup/list', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../data/backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({
        success: true,
        data: { backups: [] }
      });
    }
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('concept-db-backup-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            filename: file,
            size: stats.size,
            created: stats.mtime,
            conceptCount: (data.conceptDB?.concepts?.surface?.length || 0) + (data.conceptDB?.concepts?.deep?.length || 0),
            version: data.version || 'unknown'
          };
        } catch (parseError) {
          return {
            filename: file,
            size: stats.size,
            created: stats.mtime,
            conceptCount: 0,
            version: 'corrupted'
          };
        }
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      success: true,
      data: { backups: files }
    });
    
  } catch (error) {
    console.error('バックアップ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: システム設定取得
app.get('/api/settings', async (req, res) => {
  try {
    const defaultSettings = {
      qualityThresholds: {
        excellent: 0.8,
        good: 0.6,
        acceptable: 0.4
      },
      learningSettings: {
        autoBackup: true,
        backupInterval: 24, // hours
        maxBackups: 10
      },
      performanceSettings: {
        chunkSize: 50,
        parallelProcessing: true,
        memoryOptimization: true
      }
    };
    
    res.json({
      success: true,
      data: defaultSettings
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: システム情報取得
app.get('/api/system/info', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      conceptDBSize: {
        surface: minimalAI.getConceptDB().concepts?.surface?.length || 0,
        deep: minimalAI.getConceptDB().concepts?.deep?.length || 0
      },
      learningStats: logLearner.getLearningStats(),
      lastBackup: null // TODO: implement
    };
    
    res.json({
      success: true,
      data: systemInfo
    });
    
  } catch (error) {
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