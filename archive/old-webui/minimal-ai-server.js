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
import fetch from 'node-fetch';

// ★ 新アーキテクチャに必要なモジュールのみをインポート
import { AdvancedDialogueController } from '../../systems/controllers/advanced-dialogue-controller.js';
// import { EnhancedResponseGenerationEngineV2 } from '../engines/response/enhanced-response-generation-engine-v2.js'; // 削除済み
import { PersonalDialogueAnalyzer } from '../../analyzers/personal-dialogue-analyzer.js';
import { DomainKnowledgeBuilder } from '../../data/domain-knowledge-builder.js';
import { PersonalResponseAdapter } from '../../systems/adapters/personal-response-adapter.js';
import { persistentLearningDB } from '../../data/persistent-learning-db.js';
import { DialogueLogLearner } from '../../engines/learning/dialogue-log-learner-adapter.js';
import { EnhancedHybridLanguageProcessor } from '../../foundation/morphology/hybrid-processor.js';
import { QualityAutoAdjustmentSystem } from '../../systems/managers/quality-auto-adjustment-system.js';
import { ConceptQualityEvaluator } from '../../tools/concept-quality-evaluator.js';
import { MinimalAICore } from '../../foundation/minimal-ai-core.js';

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
// let responseGenerator;  // 応答生成の専門家 (削除済み)
let minimalAI; // EnhancedMinimalAI インスタンス
let logLearner; // DialogueLogLearner インスタンス
let hybridProcessor; // EnhancedHybridLanguageProcessor インスタンス
let qualityAdjuster; // QualityAutoAdjustmentSystem インスタンス

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

    // 応答生成の専門家を初期化 (削除済み)
    // responseGenerator = new EnhancedResponseGenerationEngineV2({
    //   enableEmotionAnalysis: true,
    //   enablePersonalAdaptation: true,
    //   enableContextEnrichment: true,
    //   qualityThreshold: 0.7
    // });
    // await responseGenerator.initialize();

    // 依存オブジェクトをインスタンス化
    const personalDialogueAnalyzerInstance = new PersonalDialogueAnalyzer();
    const domainKnowledgeBuilderInstance = new DomainKnowledgeBuilder();
    const personalResponseAdapterInstance = new PersonalResponseAdapter(personalDialogueAnalyzerInstance, domainKnowledgeBuilderInstance, null); // PersonalResponseAdapterも依存性注入を考慮

    // ★ minimalAIを初期化し、conceptDBを取得
    minimalAI = new MinimalAICore();
    await minimalAI.initialize();
    const conceptDBInstance = minimalAI.getConceptDB();

    // ログ学習システム初期化
    logLearner = new DialogueLogLearner(conceptDBInstance, minimalAI);

    // ハイブリッド処理システム初期化
    hybridProcessor = new EnhancedHybridLanguageProcessor();
    await hybridProcessor.initialize();

    // 品質自動調整システム初期化
    qualityAdjuster = new QualityAutoAdjustmentSystem();

    let conceptQualityEvaluator; // ConceptQualityEvaluator インスタンス
    conceptQualityEvaluator = new ConceptQualityEvaluator(conceptDBInstance);


    // 司令塔を初期化 (依存を注入)
    dialogueController = new AdvancedDialogueController(
        personalDialogueAnalyzerInstance,
        domainKnowledgeBuilderInstance,
        personalResponseAdapterInstance,
        conceptDBInstance,
        hybridProcessor,
        qualityAdjuster,
        conceptQualityEvaluator
    );
    // 応答生成エンジンを司令塔に注入 (司令塔が応答生成を指示するため) (削除済み)
    // dialogueController.responseGenerator = responseGenerator; 

    console.log('✅ 司令塔(AdvancedDialogueController)の初期化完了');
    
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
        const response = dialogueController.generateResponse(controlResult.responseGuidance);

        // 3. メタ認知コントローラーに対話結果を渡す (削除済み)
        // await dialogueController.processDialogueResultsForMetaCognition(controlResult, responseResult);

        res.json({
            success: true,
            response: response,
            metadata: {
                controlResult: controlResult,
                // responseResult: responseResult.analysis // 削除済み
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
    // 司令塔に対話制御を依頼し、詳細な分析結果を取得
    const controlResult = await dialogueController.controlAdvancedDialogue(message);
    
    // 概念グラフの情報を整形（controlResultから取得）
    const conceptGraph = controlResult.contextAnalysis?.contextualEntities || {};

    const serializedResponse = {
      analysis: {
        conceptGraph: {
          nodes: conceptGraph.concepts ? conceptGraph.concepts.map(c => ({ id: c, label: c })) : [],
          edges: [], // 現状では関係性がないため空
          clusters: [],
          centralityScores: []
        },
        // その他の分析結果をここに追加
        contextAnalysis: controlResult.contextAnalysis,
        intentAnalysis: controlResult.intentAnalysis,
        flowControl: controlResult.flowControl
      },
      timestamp: new Date().toISOString()
    };
    res.json({ success: true, data: serializedResponse });
  } catch (error) {
    console.error('分析対話エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    await dialogueController.processFeedback(input, feedback, response);
    res.json({ success: true, message: 'フィードバック学習完了', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('フィードバック学習エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: 分析結果フィードバック学習 - コメントアウト (司令塔経由で処理されるべき)
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
    await dialogueController.processAnalysisFeedback(analysis, feedback);
    res.json({ success: true, message: '分析結果学習完了', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('分析結果学習エラー:', error);
    res.status(500).json({ success: false, error: error.message });
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

// API: エクスポート - コメントアウト (司令塔経由で処理されるべき)
app.get('/api/export', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const exportData = await dialogueController.exportAllData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=minimal-ai-export-${new Date().toISOString().slice(0,10)}.json`);
    res.json(exportData);
  } catch (error) {
    console.error('エクスポートエラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================
// Phase 6H.2 個人特化学習エンジン API - コメントアウト (司令塔経由で処理されるべき)
// ======================================
/*
app.post('/api/chat/personal', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { message, userId = 'default', sessionId = 'default-session' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'メッセージが必要です' });
    }
    console.log(`🎯 個人特化対話 (旧API経由): "${message.slice(0, 50)}..."`);
    
    // 新しいv2対話APIを呼び出す
    const v2Response = await fetch(`http://localhost:${PORT}/api/v2/dialogue/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId, sessionId })
    });
    const v2Data = await v2Response.json();

    if (v2Data.success) {
        res.json({
            success: true,
            data: {
                response: v2Data.response,
                adaptationInfo: v2Data.metadata.responseResult.personalAnalysis, // v2の個人分析結果をマッピング
                personalityMatch: v2Data.metadata.responseResult.personalAnalysis?.adaptationStrength || 0,
                domainAlignment: v2Data.metadata.responseResult.personalAnalysis?.domain?.relevance || 0,
                appliedAdaptations: v2Data.metadata.responseResult.personalAnalysis?.recommendedAdaptations || [],
                responseMetrics: v2Data.metadata.responseResult.qualityMetrics || {},
                timestamp: new Date().toISOString()
            }
        });
    } else {
        res.status(v2Response.status).json(v2Data);
    }
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
    const profileData = await dialogueController.getPersonalProfile();
    res.json({ success: true, data: profileData });
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
    const results = await dialogueController.processDialogueLogsForLearning(dialogueLogs);
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
    // AdvancedDialogueControllerのprocessFeedbackを呼び出す
    await dialogueController.processFeedback(interaction.input, feedback, interaction.response);
    res.json({ success: true, message: '個人特化フィードバック学習完了', data: { interaction, feedback }, timestamp: new Date().toISOString() });
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
    const adjustedResponse = await dialogueController.adjustResponseStyle(currentResponse, adjustmentRequest);
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
    const stats = await dialogueController.getPersonalStats();
    res.json({ success: true, data: stats });
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
    console.error('学習統計取得エラー:', error);
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
    console.error('ログディレクトリ一覧取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// API: 品質改善実行 - コメントアウト (司令塔経由で処理されるべき)
app.post('/api/quality/improve', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    console.log('🧹 品質改善開始...');
    const result = await dialogueController.executeQualityImprovement();
    // minimalAIのconceptDBを更新
    minimalAI.updateConceptDB(result.improvements); // qualityReportからimprovementsを取得
    res.json({ success: true, data: result.report, improvements: result.improvements, message: result.message });
  } catch (error) {
    console.error('品質改善エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 品質統計取得 - コメントアウト (司令塔経由で処理されるべき)
app.get('/api/quality/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const qualityStats = await dialogueController.getQualityStats();
    res.json({ success: true, data: qualityStats });
  } catch (error) {
    console.error('品質統計取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: バックアップ作成 - コメントアウト (司令塔経由で処理されるべき)
app.get('/api/backup/create', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const backupPath = await persistentLearningDB.createBackup();
    res.json({ success: true, data: { filename: path.basename(backupPath), path: backupPath, message: 'バックアップ作成完了' }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('バックアップ作成エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: バックアップ一覧取得 - コメントアウト (司令塔経由で処理されるべき)
app.get('/api/backup/list', async (req, res) => {
  try {
    const backups = await persistentLearningDB.listBackups();
    res.json({ success: true, data: { backups: backups } });
  } catch (error) {
    console.error('バックアップ一覧取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: システム設定取得 - コメントアウト (司令塔経由で処理されるべき)
app.get('/api/settings', async (req, res) => {
  try {
    // configLoaderをインポート
    const { configLoader } = await import('../data/config-loader.js');
    
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
    // configLoaderから設定を読み込むことも可能だが、ここではデフォルトを返す
    res.json({ success: true, data: defaultSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    const result = await dialogueController.processHybrid(text, options);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
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
    const qualityData = await dialogueController.evaluateTextQuality(text, options);
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
    const conceptData = await dialogueController.extractConceptsFromText(text, options);
    res.json({ success: true, data: conceptData, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('概念抽出エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats/hybrid', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const hybridStats = await dialogueController.getHybridStats();
    res.json({ success: true, data: hybridStats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('ハイブリッド処理統計エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/quality/auto-adjustment/stats', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const stats = await dialogueController.getQualityAdjustmentStats();
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('品質統計取得エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/quality/auto-adjustment/settings', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const { settings } = req.body;
    const result = await dialogueController.updateQualityAdjustmentSettings(settings);
    res.json({ success: true, message: result.message, currentSettings: result.currentSettings, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('品質自動調整設定エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/system/info', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAI();
    }
    const systemInfo = await dialogueController.getSystemInfo();
    res.json({ success: true, data: systemInfo });
  } catch (error) {
    console.error('システム情報取得エラー:', error);
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
// 削除済み - MetaCognitiveController削除により不要












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
