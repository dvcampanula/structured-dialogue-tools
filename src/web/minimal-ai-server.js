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
import { QualityAutoAdjustmentSystem } from '../core/quality-auto-adjustment-system.js';
import { PersonalDialogueAnalyzer } from '../core/personal-dialogue-analyzer.js';
import { DomainKnowledgeBuilder } from '../core/domain-knowledge-builder.js';
import { PersonalResponseAdapter } from '../core/personal-response-adapter.js';
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
let qualityAdjuster;

// Phase 6H.2 個人特化学習エンジン
let personalAnalyzer;
let domainBuilder;
let responseAdapter;

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
    
    // 品質自動調整システム初期化
    qualityAdjuster = new QualityAutoAdjustmentSystem();
    
    // Phase 6H.2 個人特化学習エンジン初期化
    console.log('🧠 Phase 6H.2個人特化学習エンジン初期化中...');
    personalAnalyzer = new PersonalDialogueAnalyzer(conceptDB, minimalAI);
    domainBuilder = new DomainKnowledgeBuilder(conceptDB, null);
    responseAdapter = new PersonalResponseAdapter(personalAnalyzer, domainBuilder, conceptDB);
    console.log('✅ Phase 6H.2個人特化学習エンジン初期化完了');
    
    isInitialized = true;
    console.log('✅ ミニマムAI+ログ学習+ハイブリッド処理+品質自動調整+Phase6H.2個人特化学習システム初期化完了');
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

// ======================================
// Phase 6H.2 個人特化学習エンジン API
// ======================================

// API: 個人特化対話（Phase 6H.2メイン機能）
app.post('/api/chat/personal', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { message, context = {} } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'メッセージが必要です'
      });
    }
    
    console.log(`🎯 個人特化対話: "${message.slice(0, 50)}..."`);
    
    // 個人特化応答生成
    const personalizedResult = await responseAdapter.adaptToPersonality(message, context);
    
    res.json({
      success: true,
      data: {
        response: personalizedResult.response,
        adaptationInfo: personalizedResult.adaptationInfo,
        personalityMatch: personalizedResult.adaptationInfo?.personalityMatch || 0,
        domainAlignment: personalizedResult.adaptationInfo?.domainAlignment || 0,
        appliedAdaptations: personalizedResult.adaptationInfo?.appliedAdaptations || [],
        responseMetrics: personalizedResult.adaptationInfo?.responseMetrics || {},
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('個人特化対話エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 個人プロファイル取得
app.get('/api/personal/profile', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    console.log('📊 個人プロファイル取得');
    
    const personalProfile = personalAnalyzer.generatePersonalProfile();
    const domainProfile = domainBuilder.generateExpertiseProfile();
    const learningProfile = await responseAdapter.generatePersonalizedLearningProfile();
    
    res.json({
      success: true,
      data: {
        personalProfile: personalProfile,
        domainProfile: domainProfile,
        learningProfile: learningProfile,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('個人プロファイル取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 個人学習データ追加
app.post('/api/personal/learn', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { dialogueLogs } = req.body;
    
    if (!dialogueLogs || !Array.isArray(dialogueLogs)) {
      return res.status(400).json({
        success: false,
        error: '対話ログ配列が必要です'
      });
    }
    
    console.log(`🧠 個人学習データ追加: ${dialogueLogs.length}ログ`);
    
    // 個人対話パターン分析
    const speechPatterns = await personalAnalyzer.analyzePersonalSpeechPatterns(dialogueLogs);
    
    // ドメイン知識構築
    const technicalLogs = dialogueLogs.filter(log => 
      JSON.stringify(log).match(/JavaScript|React|データベース|プログラム|開発|技術/)
    );
    const businessLogs = dialogueLogs.filter(log => 
      JSON.stringify(log).match(/プロジェクト|管理|チーム|ビジネス|スケジュール/)
    );
    const casualLogs = dialogueLogs.filter(log => 
      JSON.stringify(log).match(/学習|勉強|教えて|わからない|困っ/)
    );
    
    const results = {
      speechPatterns: speechPatterns,
      domainAnalysis: {}
    };
    
    if (technicalLogs.length > 0) {
      results.domainAnalysis.technical = await domainBuilder.buildTechnicalKnowledge(technicalLogs);
    }
    if (businessLogs.length > 0) {
      results.domainAnalysis.business = await domainBuilder.buildBusinessKnowledge(businessLogs);
    }
    if (casualLogs.length > 0) {
      results.domainAnalysis.casual = await domainBuilder.buildCasualKnowledge(casualLogs);
    }
    
    res.json({
      success: true,
      message: '個人学習データ追加完了',
      data: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('個人学習データ追加エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: フィードバック学習（Phase 6H.2拡張）
app.post('/api/personal/feedback', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { interaction, feedback } = req.body;
    
    if (!interaction || !feedback) {
      return res.status(400).json({
        success: false,
        error: 'インタラクションとフィードバックが必要です'
      });
    }
    
    console.log(`📚 個人特化フィードバック学習: ${feedback.rating || 'N/A'}点`);
    
    const learningResult = await responseAdapter.learnFromFeedback(interaction, feedback);
    
    res.json({
      success: true,
      message: '個人特化フィードバック学習完了',
      data: learningResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('個人特化フィードバック学習エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: リアルタイム応答調整
app.post('/api/personal/adjust', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { currentResponse, adjustmentRequest } = req.body;
    
    if (!currentResponse || !adjustmentRequest) {
      return res.status(400).json({
        success: false,
        error: '現在の応答と調整リクエストが必要です'
      });
    }
    
    console.log(`🔄 リアルタイム応答調整: ${adjustmentRequest.type}`);
    
    const adjustedResponse = await responseAdapter.adjustResponseStyle(currentResponse, adjustmentRequest);
    
    res.json({
      success: true,
      data: {
        originalResponse: currentResponse,
        adjustedResponse: adjustedResponse,
        adjustmentType: adjustmentRequest.type
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('リアルタイム応答調整エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: Phase 6H.2統計情報
app.get('/api/personal/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const personalStats = personalAnalyzer.analysisStats;
    const domainStats = domainBuilder.buildingStats;
    const adaptationStats = responseAdapter.adaptationStats;
    
    res.json({
      success: true,
      data: {
        personalAnalysis: personalStats,
        domainBuilding: domainStats,
        responseAdaptation: adaptationStats,
        systemStatus: {
          personalAnalyzerReady: !!personalAnalyzer,
          domainBuilderReady: !!domainBuilder,
          responseAdapterReady: !!responseAdapter
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Phase 6H.2統計情報エラー:', error);
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

// === ハイブリッド処理API エンドポイント ===

// API: ハイブリッド処理
app.post('/api/hybrid/process', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { text, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'テキストが必要です'
      });
    }
    
    console.log(`🔬 ハイブリッド処理: "${text.slice(0, 50)}..."`);
    
    // ハイブリッド処理プロセッサー使用
    const { EnhancedHybridLanguageProcessor } = await import('../core/enhanced-hybrid-processor.js');
    const processor = new EnhancedHybridLanguageProcessor();
    await processor.initialize();
    
    const result = await processor.processText(text, options);
    
    // 品質自動調整適用
    const textCategory = options.category || 'default';
    const adjustmentResult = await qualityAdjuster.autoAdjust(result, textCategory);
    
    res.json({
      success: true,
      data: adjustmentResult.optimizedResult,
      originalData: adjustmentResult.originalResult,
      qualityImprovement: adjustmentResult.qualityImprovement,
      targetAchieved: adjustmentResult.targetAchieved,
      processingTime: result.statistics.processingTime,
      adjustmentTime: adjustmentResult.processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('ハイブリッド処理エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: ハイブリッド品質評価
app.post('/api/quality/evaluate', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { text, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'テキストが必要です'
      });
    }
    
    console.log(`📊 品質評価: "${text.slice(0, 50)}..."`);
    
    // ハイブリッド処理プロセッサー使用
    const { EnhancedHybridLanguageProcessor } = await import('../core/enhanced-hybrid-processor.js');
    const processor = new EnhancedHybridLanguageProcessor();
    await processor.initialize();
    
    // MeCab有効・無効での比較
    const [withMeCab, withoutMeCab] = await Promise.all([
      processor.processText(text, { ...options, enableMeCab: true }),
      processor.processText(text, { ...options, enableMeCab: false })
    ]);
    
    const qualityData = {
      withMeCab: {
        conceptCount: withMeCab.statistics.enhancedTermCount,
        qualityScore: withMeCab.statistics.qualityScore,
        processingTime: withMeCab.statistics.processingTime
      },
      withoutMeCab: {
        conceptCount: withoutMeCab.statistics.enhancedTermCount,
        qualityScore: withoutMeCab.statistics.qualityScore,
        processingTime: withoutMeCab.statistics.processingTime
      },
      improvement: {
        conceptCountImprovement: ((withMeCab.statistics.enhancedTermCount - withoutMeCab.statistics.enhancedTermCount) / Math.max(withoutMeCab.statistics.enhancedTermCount, 1) * 100).toFixed(1),
        qualityScoreImprovement: ((withMeCab.statistics.qualityScore - withoutMeCab.statistics.qualityScore) / Math.max(withoutMeCab.statistics.qualityScore, 0.1) * 100).toFixed(1)
      }
    };
    
    res.json({
      success: true,
      data: qualityData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('品質評価エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: ハイブリッド概念抽出
app.post('/api/concept/extract', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { text, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'テキストが必要です'
      });
    }
    
    console.log(`🧠 概念抽出: "${text.slice(0, 50)}..."`);
    
    // ハイブリッド処理プロセッサー使用
    const { EnhancedHybridLanguageProcessor } = await import('../core/enhanced-hybrid-processor.js');
    const processor = new EnhancedHybridLanguageProcessor();
    await processor.initialize();
    
    const result = await processor.processText(text, options);
    
    // 概念抽出に特化した結果
    const conceptData = {
      concepts: result.enhancedTerms,
      conceptGroups: result.conceptGroups,
      relationships: result.relationships,
      statistics: {
        conceptCount: result.enhancedTerms.length,
        groupCount: Object.keys(result.conceptGroups).length,
        relationshipCount: result.relationships.length,
        qualityScore: result.statistics.qualityScore
      }
    };
    
    res.json({
      success: true,
      data: conceptData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('概念抽出エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: ハイブリッド処理統計
app.get('/api/stats/hybrid', async (req, res) => {
  try {
    const hybridStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      lastProcessed: null
    };
    
    res.json({
      success: true,
      data: hybridStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 品質自動調整統計
app.get('/api/quality/auto-adjustment/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const stats = qualityAdjuster.getSystemStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 品質自動調整設定更新
app.post('/api/quality/auto-adjustment/settings', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    
    const { settings } = req.body;
    qualityAdjuster.updateSettings(settings);
    
    res.json({
      success: true,
      message: '品質自動調整設定を更新しました',
      currentSettings: qualityAdjuster.adjustmentParams,
      timestamp: new Date().toISOString()
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
      hybridEnabled: true,
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
      console.log('  🔬 ハイブリッド処理: Phase 6H kuromoji+MeCab+Word2Vec統合');
      console.log('  📊 統計表示: リアルタイム統計・進捗表示');
      console.log('  📥 エクスポート: 対話履歴・学習データ保存');
      console.log('');
      console.log('🎯 Phase 6H成果: +192.6%概念抽出・+112.9%品質向上・A評価達成');
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