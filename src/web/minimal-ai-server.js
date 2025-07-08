#!/usr/bin/env node

/**
 * ミニマムAI WebUI バックエンドサーバー
 * Express + AdvancedDialogueController 統合
 * 
 * 🚀 新アーキテクチャ: 司令塔(AdvancedDialogueController)中心
 * ✅ 不要なAPIエンドポイントと初期化ロジックをクリーンアップ
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ★ 新アーキテクチャに必要なモジュールのみをインポート
import { AdvancedDialogueController } from '../systems/controllers/advanced-dialogue-controller.js';
import { EnhancedResponseGenerationEngineV2 } from '../engines/response/enhanced-response-generation-engine-v2.js';
import { PersonalDialogueAnalyzer } from '../analyzers/personal-dialogue-analyzer.js';
import { DomainKnowledgeBuilder } from '../data/domain-knowledge-builder.js';
import { PersonalResponseAdapter } from '../systems/adapters/personal-response-adapter.js';
import { persistentLearningDB } from '../data/persistent-learning-db.js';
import { MetaCognitiveController } from '../systems/controllers/metacognitive-controller.js';

// fsとmulterはファイルアップロードAPIが残る場合に必要
import fs from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- 司令塔と専門家のインスタンス化 ---
let dialogueController; // 新しい司令塔
let responseGenerator;  // 応答生成の専門家

// ファイルアップロード設定 (既存のAPIのために残す)
const upload = multer({
  dest: 'workspace/temp/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB制限
});

// 初期化フラグ
let isInitialized = false;

// ミニマムAI初期化 (新アーキテクチャに特化)
async function initializeAI() {
  if (isInitialized) return;
  
  try {
    console.log('🌱 システム初期化中 (新アーキテクチャ)...');

    // 応答生成の専門家を初期化
    responseGenerator = new EnhancedResponseGenerationEngineV2({
      enableEmotionAnalysis: true,
      enablePersonalAdaptation: true,
      enableContextEnrichment: true,
      qualityThreshold: 0.7
    });

    // 依存オブジェクトをインスタンス化
    const personalDialogueAnalyzerInstance = new PersonalDialogueAnalyzer();
    const domainKnowledgeBuilderInstance = new DomainKnowledgeBuilder();
    const personalResponseAdapterInstance = new PersonalResponseAdapter(personalDialogueAnalyzerInstance, domainKnowledgeBuilderInstance, null); // PersonalResponseAdapterも依存性注入を考慮

    // ★ minimalAIを初期化し、conceptDBを取得
    minimalAI = new EnhancedMinimalAI();
    await minimalAI.initialize();
    const conceptDBInstance = minimalAI.getConceptDB();

    // メタ認知コントローラーを初期化
    const metaCognitiveControllerInstance = new MetaCognitiveController(
        null, // dialogueControllerは後で設定
        responseGenerator,
        personalDialogueAnalyzerInstance,
        conceptDBInstance
    );

    // 司令塔を初期化 (依存を注入)
    dialogueController = new AdvancedDialogueController(
        personalDialogueAnalyzerInstance,
        domainKnowledgeBuilderInstance,
        personalResponseAdapterInstance,
        conceptDBInstance,
        metaCognitiveControllerInstance // ★ MetaCognitiveControllerを注入
    );
    // MetaCognitiveControllerにdialogueControllerを設定
    metaCognitiveControllerInstance.dialogueController = dialogueController;
    // 応答生成エンジンを司令塔に注入 (司令塔が応答生成を指示するため)
    dialogueController.responseGenerator = responseGenerator; 

    console.log('✅ 司令塔(AdvancedDialogueController)と応答生成専門家(EnhancedResponseGenerationEngineV2)の初期化完了');
    
    isInitialized = true;
    console.log('✅ 全システムの初期化が完了しました。');
  } catch (error) {
    console.error('❌ 初期化エラー:', error);
    throw error;
  }
}

// ルート: WebUI提供
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'minimal-ai-ui.html'));
});

// =============================================================================
// ★ 新アーキテクチャ対話API エンドポイント (唯一の対話窓口)
// =============================================================================

app.post('/api/v2/dialogue/chat', async (req, res) => {
    try {
        if (!isInitialized) await initializeAI();

        const { message, userId = 'default', sessionId = 'default-session' } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'message is required' });
        }

        // 1. 司令塔に対話制御を依頼
        const controlResult = await dialogueController.controlAdvancedDialogue(message);

        // 2. 司令塔の指示に基づき、応答生成専門家が応答を生成
        // controlResultにはresponseGuidanceが含まれるはず
        const responseResult = await responseGenerator.generateUnifiedResponse(
            message, 
            controlResult, // 司令塔からの制御結果全体を渡す
            {}
        );

        // 3. メタ認知コントローラーに対話結果を渡す
        await dialogueController.processDialogueResultsForMetaCognition(controlResult, responseResult);

        res.json({
            success: true,
            response: responseResult.response,
            metadata: {
                controlResult: controlResult,
                responseResult: responseResult.analysis
            }
        });

    } catch (error) {
        console.error('❌ 新対話APIエラー:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// ★ 既存APIエンドポイント (新アーキテクチャで不要なものはコメントアウト)
// =============================================================================

// API: ミニマムAI統計情報 (後方互換 - 司令塔から取得するように変更推奨)
app.get('/api/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    // 司令塔からシステム統計を取得するように変更
    const stats = dialogueController.getSystemStats(); // 仮の呼び出し
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 分析対話（分析モード）- コメントアウト (新アーキテクチャで統合されるべき)
/*
app.post('/api/chat/analysis', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'メッセージが必要です' });
    }
    console.log(`🔬 分析対話: "${message.slice(0, 50)}..."`);
    const enhancedResponse = await minimalAI.generateEnhancedResponse(message);
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
    res.json({ success: true, data: { ...serializedResponse, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('分析対話エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: フィードバック学習 - コメントアウト (司令塔経由で処理されるべき)
/*
app.post('/api/feedback', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { input, feedback, response } = req.body;
    if (!input || !feedback || !response) {
      return res.status(400).json({ success: false, error: '入力、フィードバック、応答が必要です' });
    }
    console.log(`📚 フィードバック学習: ${feedback}`);
    await minimalAI.learnFromFeedback(input, feedback, response);
    res.json({ success: true, message: 'フィードバック学習完了', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('フィードバック学習エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: 分析結果フィードバック学習 - コメントアウト (司令塔経由で処理されるべき)
/*
app.post('/api/feedback/analysis', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { analysis, feedback } = req.body;
    if (!analysis || !feedback) {
      return res.status(400).json({ success: false, error: '分析結果とフィードバックが必要です' });
    }
    console.log(`🧬 分析結果学習: ${feedback}`);
    await minimalAI.learnFromAnalysis(analysis, feedback);
    res.json({ success: true, message: '分析結果学習完了', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('分析結果学習エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

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

// API: エクスポート - コメントアウト (司令塔経由で処理されるべき)
/*
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
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// ======================================
// Phase 6H.2 個人特化学習エンジン API - コメントアウト (司令塔経由で処理されるべき)
// ======================================
/*
app.post('/api/chat/personal', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { message, context = {} } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'メッセージが必要です' });
    }
    console.log(`🎯 個人特化対話: "${message.slice(0, 50)}..."`);
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
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/personal/learn', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { dialogueLogs } = req.body;
    if (!dialogueLogs || !Array.isArray(dialogueLogs)) {
      return res.status(400).json({ success: false, error: '対話ログ配列が必要です' });
    }
    console.log(`🧠 個人学習データ追加: ${dialogueLogs.length}ログ`);
    const speechPatterns = await personalAnalyzer.analyzePersonalSpeechPatterns(dialogueLogs);
    const technicalLogs = dialogueLogs.filter(log => JSON.stringify(log).match(/JavaScript|React|データベース|プログラム|開発|技術/));
    const businessLogs = dialogueLogs.filter(log => JSON.stringify(log).match(/プロジェクト|管理|チーム|ビジネス|スケジュール/));
    const casualLogs = dialogueLogs.filter(log => JSON.stringify(log).match(/学習|勉強|教えて|わからない|困っ/));
    const results = { speechPatterns: speechPatterns, domainAnalysis: {} };
    if (technicalLogs.length > 0) { results.domainAnalysis.technical = await domainBuilder.buildTechnicalKnowledge(technicalLogs); }
    if (businessLogs.length > 0) { results.domainAnalysis.business = await domainBuilder.buildBusinessKnowledge(businessLogs); }
    if (casualLogs.length > 0) { results.domainAnalysis.casual = await domainBuilder.buildCasualKnowledge(casualLogs); }
    res.json({ success: true, message: '個人学習データ追加完了', data: results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('個人学習データ追加エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/personal/feedback', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { interaction, feedback } = req.body;
    if (!interaction || !feedback) {
      return res.status(400).json({ success: false, error: 'インタラクションとフィードバックが必要です' });
    }
    console.log(`📚 個人特化フィードバック学習: ${feedback.rating || 'N/A'}点`);
    const learningResult = await responseAdapter.learnFromFeedback(interaction, feedback);
    res.json({ success: true, message: '個人特化フィードバック学習完了', data: learningResult, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('個人特化フィードバック学習エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/personal/adjust', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { currentResponse, adjustmentRequest } = req.body;
    if (!currentResponse || !adjustmentRequest) {
      return res.status(400).json({ success: false, error: '現在の応答と調整リクエストが必要です' });
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
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// === ログ学習API エンドポイント - コメントアウト (司令塔経由で処理されるべき)
/*
app.post('/api/learn/upload', upload.single('logfile'), async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'ログファイルが指定されていません' });
    }
    console.log(`📄 ログファイル学習開始: ${req.file.originalname}`);
    const result = await logLearner.processLogFile(req.file.path);
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
    if (req.file && fs.existsSync(req.file.path)) { fs.unlinkSync(req.file.path); }
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/learn/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const stats = logLearner.getLearningStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
            directories.push({ path: itemRelativePath, fullPath: itemPath, logCount: txtFiles.length, files: txtFiles });
          }
          scanDirectory(itemPath, itemRelativePath);
        }
      }
    }
    if (fs.existsSync(testLogsPath)) { scanDirectory(testLogsPath); }
    res.json({ success: true, data: { baseDirectory: testLogsPath, directories: directories.sort((a, b) => b.logCount - a.logCount) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: 品質改善実行 - コメントアウト (司令塔経由で処理されるべき)
/*
app.post('/api/quality/improve', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    console.log('🧹 品質改善開始...');
    const currentDB = minimalAI.getConceptDB();
    const { ConceptQualityManager } = await import('../core/concept-quality-manager.js');
    const qualityManager = new ConceptQualityManager();
    const improvedDB = qualityManager.improveConceptDB(currentDB);
    minimalAI.updateConceptDB(improvedDB);
    const qualityReport = qualityManager.generateQualityReport(currentDB, improvedDB);
    console.log(`✅ 品質改善完了: ${qualityReport.improvements.improvementRatio}%改善`);
    res.json({ success: true, data: { report: qualityReport, improvements: improvedDB.qualityStats, message: `品質改善完了 - ${improvedDB.qualityStats.improvementRatio}%の効率化を達成` } });
  } catch (error) {
    console.error('品質改善エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: 品質統計取得 - コメントアウト (司令塔経由で処理されるべき)
/*
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
    for (const concept of allConcepts) {
      const quality = qualityManager.calculateQualityScore(concept);
      if (quality >= qualityManager.qualityThresholds.excellent) { qualityStats.qualityDistribution.excellent++; } else if (quality >= qualityManager.qualityThresholds.good) { qualityStats.qualityDistribution.good++; } else if (quality >= qualityManager.qualityThresholds.acceptable) { qualityStats.qualityDistribution.acceptable++; } else { qualityStats.qualityDistribution.poor++; }
      const category = concept.category || 'general';
      qualityStats.categoryDistribution[category] = (qualityStats.categoryDistribution[category] || 0) + 1;
    }
    const duplicateGroups = qualityManager.findDuplicateGroups(allConcepts);
    qualityStats.duplicatesPotential = duplicateGroups.length;
    res.json({ success: true, data: qualityStats });
  } catch (error) {
    console.error('品質統計取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: バックアップ作成 - コメントアウト (司令塔経由で処理されるべき)
/*
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
    if (!fs.existsSync(backupDir)) { fs.mkdirSync(backupDir, { recursive: true }); }
    const backupFile = path.join(backupDir, `concept-db-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`📦 バックアップ作成: ${backupFile}`);
    res.json({ success: true, data: { filename: `concept-db-backup-${timestamp}.json`, size: fs.statSync(backupFile).size, conceptCount: (backupData.conceptDB.concepts?.surface?.length || 0) + (backupData.conceptDB.concepts?.deep?.length || 0), timestamp } });
  } catch (error) {
    console.error('バックアップ作成エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: バックアップ一覧取得 - コメントアウト (司令塔経由で処理されるべき)
/*
app.get('/api/backup/list', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../data/backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, data: { backups: [] } });
    }
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('concept-db-backup-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return { filename: file, size: stats.size, created: stats.mtime, conceptCount: (data.conceptDB?.concepts?.surface?.length || 0) + (data.conceptDB?.concepts?.deep?.length || 0), version: 'unknown' };
        } catch (parseError) {
          return { filename: file, size: stats.size, created: stats.mtime, conceptCount: 0, version: 'corrupted' };
        }
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json({ success: true, data: { backups: files } });
  } catch (error) {
    console.error('バックアップ一覧取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: システム設定取得 - コメントアウト (司令塔経由で処理されるべき)
/*
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
    res.json({ success: true, data: defaultSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// === ハイブリッド処理API エンドポイント - コメントアウト (司令塔経由で処理されるべき)
/*
app.post('/api/hybrid/process', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { text, options = {} } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'テキストが必要です' });
    }
    console.log(`🔬 ハイブリッド処理: "${text.slice(0, 50)}..."`);
    const { EnhancedHybridLanguageProcessor } = await import('../core/enhanced-hybrid-processor.js');
    const processor = new EnhancedHybridLanguageProcessor();
    await processor.initialize();
    const result = await processor.processText(text, options);
    const textCategory = options.category || 'default';
    const adjustmentResult = await qualityAdjuster.autoAdjust(result, textCategory);
    res.json({ success: true, data: adjustmentResult.optimizedResult, originalData: adjustmentResult.originalResult, qualityImprovement: adjustmentResult.qualityImprovement, targetAchieved: adjustmentResult.targetAchieved, processingTime: result.statistics.processingTime, adjustmentTime: adjustmentResult.processingTime, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('ハイブリッド処理エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/quality/evaluate', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { text, options = {} } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'テキストが必要です' });
    }
    console.log(`📊 品質評価: "${text.slice(0, 50)}..."`);
    const { EnhancedHybridLanguageProcessor } = await import('../core/enhanced-hybrid-processor.js');
    const processor = new EnhancedHybridLanguageProcessor();
    await processor.initialize();
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
    res.json({ success: true, data: qualityData, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('品質評価エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/concept/extract', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { text, options = {} } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'テキストが必要です' });
    }
    console.log(`🧠 概念抽出: "${text.slice(0, 50)}..."`);
    const { EnhancedHybridLanguageProcessor } = await import('../core/enhanced-hybrid-processor.js');
    const processor = new EnhancedHybridLanguageProcessor();
    await processor.initialize();
    const result = await processor.processText(text, options);
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
    res.json({ success: true, data: conceptData, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('概念抽出エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats/hybrid', async (req, res) => {
  try {
    const hybridStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      lastProcessed: null
    };
    res.json({ success: true, data: hybridStats, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/quality/auto-adjustment/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const stats = qualityAdjuster.getSystemStats();
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/quality/auto-adjustment/settings', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { settings } = req.body;
    qualityAdjuster.updateSettings(settings);
    res.json({ success: true, message: '品質自動調整設定を更新しました', currentSettings: qualityAdjuster.adjustmentParams, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
      lastBackup: null
    };
    res.json({ success: true, data: systemInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// エラーハンドラー
app.use((error, req, res, next) => {
  console.error('サーバーエラー:', error);
  res.status(500).json({
    success: false,
    error: 'サーバー内部エラー',
    message: error.message
  });
});

// === 🤖 実用対話API エンドポイント - コメントアウト (新アーキテクチャで統合されるべき)
/*
app.post('/api/dialogue/chat', async (req, res) => {
  try {
    const startTime = Date.now();
    const dialogueResult = await dialogueAPI.processDialogue(req.body);
    res.json({ success: dialogueResult.success, response: dialogueResult.response, metadata: { ...dialogueResult.metadata, serverResponseTime: Date.now() - startTime }, error: dialogueResult.error || null });
  } catch (error) {
    console.error('❌ 実用対話API エラー:', error);
    res.status(500).json({ success: false, error: error.message, response: "申し訳ございませんが、エラーが発生しました。もう一度お試しください。" });
  }
});

app.get('/api/dialogue/stats', async (req, res) => {
  try {
    const stats = dialogueAPI.getAPIStats();
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('対話API統計エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dialogue/user/:userId/stats', async (req, res) => {
  try {
    const userStats = dialogueAPI.getUserSessionStats(req.params.userId);
    if (!userStats) {
      return res.status(404).json({ success: false, error: 'ユーザーセッションが見つかりません' });
    }
    res.json({ success: true, data: userStats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('ユーザーセッション統計エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dialogue/database/stats', async (req, res) => {
  try {
    const { persistentLearningDB } = await import('../core/persistent-learning-db.js');
    const dbStats = persistentLearningDB.getDatabaseStats();
    res.json({ success: true, data: dbStats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('学習データベース統計エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/dialogue/database/backup', async (req, res) => {
  try {
    const { persistentLearningDB } = await import('../core/persistent-learning-db.js');
    const backupPath = await persistentLearningDB.createBackup();
    res.json({ success: true, data: { backupPath: backupPath, message: 'バックアップ作成完了' }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('データベースバックアップエラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// =============================================================================
// データ永続化強制保存 API - コメントアウト (司令塔経由で処理されるべき)
/*
app.post('/api/force-save', async (req, res) => {
  try {
    if (!isInitialized) { return res.status(503).json({ success: false, error: 'システム初期化中です' }); }
    console.log('🔄 学習データ強制保存開始...');
    let savedItems = 0;
    if (global.dialogueAPI && global.dialogueAPI.dynamicLearner) { await global.dialogueAPI.dynamicLearner.saveUserData(); savedItems++; }
    if (global.dialogueAPI && global.dialogueAPI.advancedController) {
      try {
        const learningStats = global.dialogueAPI.advancedController.getLearningStats();
        if (learningStats) { console.log('💾 概念学習データ保存中...'); savedItems++; }
      } catch (error) { console.warn('⚠️ 概念学習データ保存エラー:', error.message); }
    }
    if (unifiedEngine) { await unifiedEngine.saveAllLearningData(); savedItems++; }
    console.log(`✅ 学習データ強制保存完了: ${savedItems}件`);
    res.json({ success: true, message: '学習データを強制保存しました', savedItems: savedItems, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ 学習データ強制保存エラー:', error);
    res.status(500).json({ success: false, error: '保存中にエラーが発生しました', details: error.message });
  }
});
*/

// =============================================================================
// 統合学習エンジン API - コメントアウト (司令塔経由で処理されるべき)
// =============================================================================
/*
app.post('/api/unified-dialogue', async (req, res) => {
  try {
    if (!isInitialized) { return res.status(503).json({ success: false, error: 'システム初期化中です。しばらくお待ちください。' }); }
    const { type, message, userId, sessionId, context } = req.body;
    if (!message || typeof message !== 'string') { return res.status(400).json({ success: false, error: 'メッセージが必要です', code: 'INVALID_MESSAGE' }); }
    console.log(`📝 統合学習対話処理開始: ${message.substring(0, 50)}...`);
    const learningResult = await unifiedEngine.processInput({ type: type || 'dialogue', message, userId: userId || 'web-ui-user', sessionId: sessionId || 'web-ui-session', context: context || {} });
    let response;
    if (responseEngine) {
      console.log(`🎯 ResponseGenerationEngine使用: 動的応答生成`);
      const effectiveSessionId = sessionId || `web-session-${Date.now()}`;
      const responseResult = await responseEngine.generateResponse(effectiveSessionId, message, { learningResult, userId: userId || 'web-ui-user', type: type || 'dialogue' });
      response = responseResult.response.content;
      if (learningResult.metadata.confidence > 0.5) { response += `\n\n💡 **学習結果**: ${learningResult.concepts.length}個の概念と${learningResult.relationships.length}個の関係性を学習しました。`; }
    } else {
      console.log(`⚠️ ResponseGenerationEngine未利用: フォールバック応答生成`);
      response = await generateUnifiedResponse(message, learningResult);
    }
    console.log(`✅ 統合学習対話処理完了: ${learningResult.metadata.processingTime}ms`);
    res.json({ success: true, response: response, learningResult: learningResult, metadata: { timestamp: new Date().toISOString(), processingTime: learningResult.metadata.processingTime, confidence: learningResult.metadata.confidence, concepts: learningResult.concepts.length, relationships: learningResult.relationships.length } });
  } catch (error) {
    console.error('❌ 統合学習対話処理エラー:', error);
    res.status(500).json({ success: false, error: '対話処理中にエラーが発生しました', code: 'PROCESSING_ERROR', details: error.message });
  }
});

app.get('/api/unified-status', (req, res) => {
  try {
    if (!isInitialized || !unifiedEngine) {
      return res.status(503).json({ success: false, error: '統合学習エンジンが初期化されていません' });
    }
    const status = unifiedEngine.getEngineStatus();
    res.json({ success: true, status: 'running', engine: status, server: { uptime: process.uptime(), memory: process.memoryUsage(), version: '1.0.0' } });
  } catch (error) {
    console.error('❌ 統合学習エンジン状態取得エラー:', error);
    res.status(500).json({ success: false, error: '状態取得中にエラーが発生しました', code: 'STATUS_ERROR', details: error.message });
  }
});

app.get('/api/unified-export', async (req, res) => {
  try {
    if (!isInitialized || !unifiedEngine) {
      return res.status(503).json({ success: false, error: '統合学習エンジンが初期化されていません' });
    }
    const userId = req.query.userId || 'web-ui-user';
    const data = await unifiedEngine.exportLearningData(userId);
    if (!data) { return res.status(404).json({ success: false, error: '学習データが見つかりません', code: 'DATA_NOT_FOUND' }); }
    res.json({ success: true, data: data, exportTime: new Date().toISOString() });
  } catch (error) {
    console.error('❌ 統合学習データエクスポートエラー:', error);
    res.status(500).json({ success: false, error: 'データエクスポート中にエラーが発生しました', code: 'EXPORT_ERROR', details: error.message });
  }
});

// 統合学習応答生成ヘルパー関数 - コメントアウト (新アーキテクチャで不要)
/*
async function generateUnifiedResponse(message, learningResult) {
  try {
    const concepts = learningResult.concepts;
    const relationships = learningResult.relationships;
    const techKeywords = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Vue.js', 'Python', 'Java', 'CSS', 'HTML'];
    const foundTechKeywords = techKeywords.filter(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    let response = '';
    if (foundTechKeywords.length > 0) { response = generateTechnicalUnifiedResponse(message, foundTechKeywords, concepts, relationships); } else if (concepts.length > 0) { response = generateConceptUnifiedResponse(message, concepts, relationships); } else { response = generateGenericUnifiedResponse(message); }
    if (learningResult.metadata.confidence > 0.5) { response += `\n\n💡 **学習結果**: ${concepts.length}個の概念と${relationships.length}個の関係性を学習しました。`; }
    return response;
  } catch (error) {
    console.error('統合学習応答生成エラー:', error);
    return 'すみません、応答の生成中にエラーが発生しました。';
  }
}

function generateTechnicalUnifiedResponse(message, techKeywords, concepts, relationships) {
  const tech = techKeywords[0];
  if (tech === 'React' && message.toLowerCase().includes('usestate')) {
    return `ReactのuseStateフックについて詳しく説明します.\n\n**useStateとは**\nReactの基本的なHookの一つで、関数コンポーネントで状態管理を行うために使用します.\n\n**基本的な使い方**\n\`\`\`javascript\nimport React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>現在のカウント: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        カウントアップ\n      </button>\n    </div>\n  );\n}\n\`\`\`\n\n**重要なポイント**\n1. **分割代入**: useState()は[現在の値, 更新関数]の配列を返します\n2. **初期値**: useState(0)の0が初期値となります\n3. **更新関数**: setCountを呼ぶことで状態が更新され、再レンダリングが発生します`;
  }
  return `${tech}について詳しく説明いたします.\n\n学習した概念: ${concepts.join(', ')}\n\n${tech}は現代的な開発において重要な技術です。具体的な質問があれば、より詳細な説明をいたします。`;
}

function generateConceptUnifiedResponse(message, concepts, relationships) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('構造的対話') || lowerMessage.includes('構造的') && lowerMessage.includes('対話')) {
    return `構造的対話について詳しく説明いたします.\n\n**構造的対話とは**\n構造的対話は、単なる質問応答を超えた、体系的で継続的な対話手法です。以下の特徴があります：\n\n**主な特徴:**\n1. **継続性**: 過去の対話を参考にした一貫した応答\n2. **文脈理解**: 会話の流れと背景を考慮した理解\n3. **学習性**: 対話を通じて相手の特性や好みを学習\n4. **構造化**: 明確な目的と段階的なアプローチ\n\n**活用場面:**\n- 複雑な問題解決のためのブレインストーミング\n- 学習や教育における段階的理解の促進\n- プロジェクト計画や設計における要件整理\n\n構造的対話は、AI と人間が協力して深い洞察を得るための有効な手法として注目されています。\n\n何か具体的に知りたい点はありますか？`;
  }
  if (lowerMessage.includes('どう思う') || lowerMessage.includes('どう考える')) {
    const topic = message.replace(/について.*/, '').replace(/どう思う.*/, '').replace(/どう考える.*/, '').trim();
    return `${topic}について私の見解をお話しします.\n\n${topic}は興味深いテーマですね。この分野では多様な視点と深い理解が重要だと考えています.\n\n具体的にどのような観点から${topic}について知りたいでしょうか？例えば：\n- 基本的な概念や定義\n- 実践的な活用方法\n- 関連する技術や手法\n- 具体的な事例や応用\n\nより詳しくお答えできるよう、ご関心のある方向性を教えていただけますか？`;
  }
  if (lowerMessage.includes('教えて') || lowerMessage.includes('詳しく') || lowerMessage.includes('説明')) {
    const topic = message.replace(/について.*/, '').replace(/教えて.*/, '').replace(/詳しく.*/, '').replace(/説明.*/, '').trim();
    if (topic.length > 0) {
      return `${topic}について詳しく説明させていただきます.\n\n${topic}は多面的なテーマですが、具体的にはどの側面について知りたいでしょうか？\n\n以下のような観点から詳しく説明できます：\n- ${topic}の基本概念と定義\n- ${topic}の実用的な活用方法\n- ${topic}に関連する技術や手法\n- ${topic}の具体的な事例\n\nご関心のある方向性を教えていただければ、より適切で詳細な説明を提供いたします。`;
    } else {
      return `ご質問の内容について詳しく説明いたします.\n\n具体的にどのような情報をお求めでしょうか？質問内容を明確にしていただけると、より適切で有用な回答を提供できます。`;
    }
  }
  return `ご質問について考えてみました.\n\n「${message}」というご質問ですが、より具体的で有用な回答をするために、以下の点を教えていただけますか：\n\n• どのような背景や文脈でこの質問をされていますか？\n• 特に知りたい側面や観点はありますか？\n• 初心者向け？それとも詳しい方向けの説明をお求めですか？\n\nより詳細な情報をいただけると、あなたのニーズに合った適切な回答を提供できます。\n\n${concepts.length > 0 ? `\n💡 学習した概念: ${concepts.slice(0, 3).join(', ')}` : ''}`;
}

function generateGenericUnifiedResponse(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('こんにちは') || lowerMessage.includes('はじめまして') || lowerMessage.includes('hello')) {
    return `こんにちは！統合学習エンジンです.\n\nお気軽に何でもお聞かせください。特に以下のような分野が得意です：\n\n🔧 **技術分野**: React、JavaScript、Python、プログラミング全般\n💭 **概念説明**: AI、機械学習、システム設計\n📚 **学習支援**: 構造的対話、知識整理\n\n何について話しましょうか？`;
  }
  if (lowerMessage.includes('ありがとう') || lowerMessage.includes('thanks')) {
    return `どういたしまして！お役に立てて嬉しいです.\n\n他にも何かご質問があれば、お気軽にお聞かせください。継続的な対話を通じて、より良いサポートを提供できます。`;
  }
  return `「${message}」について考えてみますね.\n\nより具体的で有用な回答をするために、もう少し詳しく教えていただけますか？\n\n例えば：\n• 何を知りたいのか\n• どのような背景や目的があるのか\n• どの程度の詳しさを求めているのか\n\n技術的な質問、概念の説明、学習サポートなど、幅広くお手伝いできます。`;
}
*/

// === Phase 7H.1 マルチターン対話API - コメントアウト (司令塔経由で処理されるべき)
/*
app.post('/api/dialogue/session/start', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const { userId = 'default', initialInput } = req.body;
    console.log(`🎬 新規セッション開始: userId=${userId}`);
    const result = multiTurnManager.startSession(userId, initialInput);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('セッション開始エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/dialogue/multi-turn', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const { sessionId, userInput, additionalContext } = req.body;
    if (!sessionId || !userInput) { return res.status(400).json({ success: false, error: 'sessionIdとuserInputが必要です' }); }
    console.log(`💬 マルチターン処理: ${sessionId.substr(0, 8)}... - "${userInput.slice(0, 50)}..."`);
    const result = await multiTurnManager.processMultiTurn(sessionId, userInput, additionalContext);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('マルチターン処理エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dialogue/session/:sessionId', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const { sessionId } = req.params;
    const session = multiTurnManager.activeSessions.get(sessionId);
    if (!session) { return res.status(404).json({ success: false, error: 'セッションが見つかりません' }); }
    res.json({ success: true, data: { sessionId: session.sessionId, userId: session.userId, startTime: session.startTime, lastActivity: session.lastActivity, turnCount: session.turns.length, topicStack: session.topicStack, emotionalState: session.emotionalState, goalProgress: session.goalProgress, contextSummary: session.turns.length > 0 ? `最新ターン: ${session.turns[session.turns.length - 1].userInput.substring(0, 50)}...` : 'セッション開始' }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('セッション状態取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/dialogue/session/:sessionId/end', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const { sessionId } = req.params;
    const finalStats = multiTurnManager.endSession(sessionId);
    if (!finalStats) { return res.status(404).json({ success: false, error: 'セッションが見つかりません' }); }
    res.json({ success: true, data: finalStats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('セッション終了エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dialogue/system-stats', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const systemStats = multiTurnManager.getSystemStats();
    res.json({ success: true, data: systemStats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('システム統計取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// ========== Phase 7H.2 応答生成エンジン API - コメントアウト (司令塔経由で処理されるべき) ==========
/*
app.post('/api/response/generate', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const { sessionId, userInput, context = {} } = req.body;
    if (!sessionId || !userInput) { return res.status(400).json({ success: false, error: 'sessionIdとuserInputが必要です' }); }
    console.log(`🎯 動的応答生成: ${sessionId.substr(0, 8)}... - "${userInput.slice(0, 30)}..."`);
    const result = await responseEngine.generateResponse(sessionId, userInput, context);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('動的応答生成エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/response/template-select', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const { userInput, sessionId, emotionHint, formalityHint } = req.body;
    if (!userInput) { return res.status(400).json({ success: false, error: 'userInputが必要です' }); }
    const intentAnalysis = responseEngine.analyzeIntent(userInput);
    const emotionAnalysis = responseEngine.analyzeEmotion(userInput, { turns: 1 });
    const personalContext = await responseEngine.analyzePersonalContext(sessionId, { turns: 1 });
    const templateSelection = responseEngine.selectDynamicTemplate( intentAnalysis, emotionAnalysis, personalContext );
    res.json({ success: true, data: { templateSelection, intentAnalysis, emotionAnalysis, personalContext }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('テンプレート選択エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/response/quality-check', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const { responseText, userInput, context } = req.query;
    if (!responseText || !userInput) { return res.status(400).json({ success: false, error: 'responseTextとuserInputが必要です' }); }
    const mockResponse = { content: responseText, adaptationLevel: 0.7, contextEnriched: true };
    const qualityScore = responseEngine.evaluateResponseQuality( mockResponse, userInput, JSON.parse(context || '{}') );
    res.json({ success: true, data: { qualityScore, responseLength: responseText.length, recommendations: qualityScore < 0.7 ? ['応答をより詳細にすることを検討してください', '文脈への適応を強化してください'] : ['品質基準を満たしています'] }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('品質チェックエラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/response/generation-stats', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const generationStats = responseEngine.getGenerationStats();
    const templateStats = responseEngine.getTemplateSelectionStats();
    res.json({ success: true, data: { generationStats, templateStats, systemStatus: 'active' }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('生成統計取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// ========== Enhanced ResponseGenerationEngine v2.0 API - コメントアウト (司令塔経由で処理されるべき) ==========
/*
app.post('/api/response/unified-generate', async (req, res) => {
  try {
    if (!isInitialized) await initializeAI();
    const { userInput, conversationHistory = [], userProfile = {}, userId = 'anonymous' } = req.body;
    if (!userInput || typeof userInput !== 'string') { return res.status(400).json({ success: false, error: 'userInputが必要です（文字列）' }); }
    console.log(`🚀 Enhanced ResponseGeneration v2.0: "${userInput.substring(0, 50)}..." (ユーザー: ${userId})`);
    const result = await enhancedResponseEngineV2.generateUnifiedResponse( userInput, conversationHistory, userProfile );
    if (result.response && !result.error) {
      try {
        const interaction = { input: userInput, response: result.response, adaptationInfo: result.analysis };
        const feedback = { satisfied: true, rating: 4, type: 'implicit' };
        responseAdapter.learnFromFeedback(interaction, feedback).catch(err => { console.warn('⚠️ 非同期フィードバック学習エラー:', err.message); });
      }
      catch (learningError) { console.warn('⚠️ 学習データ更新エラー:', learningError.message); }
    }
    res.json({ success: !result.error, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Enhanced ResponseGeneration v2.0 エラー:', error);
    res.status(500).json({ success: false, error: error.message, data: { response: '申し訳ございませんが、応答生成中にエラーが発生しました。' } });
  }
});
*/

// サーバー起動
app.listen(PORT, async () => {
  console.log(`サーバー起動中... http://localhost:${PORT}`);
  try {
    await initializeAI();
    console.log(`✅ サーバー準備完了: http://localhost:${PORT}`);
  } catch (error) {
    console.error('サーバー起動失敗:', error);
    process.exit(1);
  }
});

// 定期的なクリーンアップ
setInterval(async () => {
  try {
    if (isInitialized) {
      console.log('🧹 定期クリーンアップ実行...');
      await persistentLearningDB.cleanupOldData();
    }
  } catch (error) {
    console.error('定期クリーンアップエラー:', error);
  }
}, 24 * 60 * 60 * 1000); // 24時間ごと

// デフォルトインスタンス
export const minimalAiServer = app;
