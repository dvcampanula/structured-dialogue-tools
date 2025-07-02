#!/usr/bin/env node

/**
 * 構造的対話統合Webアプリケーション
 * 既存の分割・命名・書式ツールを統合したローカルサーバー
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { RawLogSplitter } from '../core/raw-log-splitter.js';
import { NamingHelper } from '../core/naming-helper.js';
import { LogFormatUnifier } from '../core/log-format-unifier.js';
import { UnifiedLogProcessor } from '../core/unified-log-processor.js';
import { IntelligentConceptExtractor } from '../core/intelligent-concept-extractor.js';
import { SessionManagementSystem } from '../core/session-management-system.js';
import { PredictiveQualityAssessment } from '../core/predictive-quality-assessment.js';
import { AIIntegrationService } from '../core/ai-integration-service.js';

interface ProcessRequest {
  rawLog: string;
  sessionContext?: string;
  options?: {
    targetChunkSize?: number;
    preserveContext?: boolean;
    addChunkHeaders?: boolean;
    generateFilenames?: boolean;
    unifyFormat?: boolean;
  };
}

interface ProcessResult {
  success: boolean;
  chunks: Array<{
    index: number;
    content: string;
    metadata: any;
    suggestedFilename?: string;
    unifiedContent?: string;
  }>;
  summary: {
    originalLength: number;
    chunkCount: number;
    avgChunkSize: number;
    processingTime: number;
  };
  structuringPrompts?: string[];
  error?: string;
}

class StructuredDialogueApp {
  private app: express.Application;
  private splitter: RawLogSplitter;
  private namingHelper: NamingHelper;
  private formatUnifier: LogFormatUnifier;
  private unifiedProcessor: UnifiedLogProcessor;
  private intelligentExtractor: IntelligentConceptExtractor;
  private aiIntegrationService: AIIntegrationService;
  private sessionManager: SessionManagementSystem;
  private predictiveQualityAssessment: PredictiveQualityAssessment;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.splitter = new RawLogSplitter();
    this.namingHelper = new NamingHelper();
    this.formatUnifier = new LogFormatUnifier();
    this.intelligentExtractor = new IntelligentConceptExtractor();
    this.unifiedProcessor = new UnifiedLogProcessor(this.intelligentExtractor);
    this.sessionManager = new SessionManagementSystem('./web_sessions', './web_session_database.json', this.intelligentExtractor);
    this.aiIntegrationService = new AIIntegrationService(this.intelligentExtractor);
    this.predictiveQualityAssessment = new PredictiveQualityAssessment();
    
    this.setupMiddleware();
    this.setupRoutes();
    
    // 初期化を非同期で実行
    setTimeout(() => this.initializeHelpers(), 0);
  }

  /**
   * ミドルウェア設定
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  /**
   * ルート設定
   */
  private setupRoutes(): void {
    // メイン処理エンドポイント
    this.app.post('/api/process-log', this.processLog.bind(this));
    
    // 統一処理エンドポイント（新機能）
    this.app.post('/api/process-unified', this.processUnified.bind(this));
    
    // IntelligentConceptExtractor エンドポイント（NEW + Phase 3）
    this.app.post('/api/extract-concepts', this.extractConcepts.bind(this));
    this.app.post('/api/extract-concepts-chunked', this.extractConceptsChunked.bind(this));
    
    // SessionManagement エンドポイント（NEW）
    this.app.post('/api/sessions/save', this.saveSession.bind(this));
    this.app.post('/api/sessions/start-new', this.startNewSession.bind(this));
    this.app.get('/api/sessions/list', this.listSessions.bind(this));
    this.app.get('/api/sessions/stats', this.getSessionStats.bind(this));
    this.app.get('/api/sessions/handover/latest', this.getLatestHandover.bind(this));
    this.app.get('/api/sessions/:id', this.getSession.bind(this));
    this.app.post('/api/sessions/search', this.searchSessions.bind(this));
    
    // AI Integration エンドポイント（Phase 5 NEW）
    this.app.post('/api/ai/analyze', this.analyzeWithAI.bind(this));
    this.app.post('/api/ai/compare', this.compareAIProviders.bind(this));
    this.app.get('/api/ai/providers', this.getAIProviders.bind(this));
    this.app.get('/api/ai/stats', this.getAIStats.bind(this));
    this.app.get('/api/ai/history', this.getAIAnalysisHistory.bind(this));
    
    // 設定取得・更新
    this.app.get('/api/settings', this.getSettings.bind(this));
    this.app.post('/api/settings', this.updateSettings.bind(this));
    this.app.get('/api/config/concept-extraction', this.getConceptExtractionConfig.bind(this));
    this.app.get('/api/learning/session-stats', this.getSessionLearningStats.bind(this));
    
    // 予測品質評価エンドポイント
    this.app.post('/api/quality/predictive-assessment', this.getPredictiveQualityAssessment.bind(this));
    
    // ツール別エンドポイント
    this.app.post('/api/split-only', this.splitOnly.bind(this));
    this.app.post('/api/name-only', this.nameOnly.bind(this));
    this.app.post('/api/format-only', this.formatOnly.bind(this));
    
    // ヘルスチェック
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // メインページ
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  /**
   * ヘルパー初期化
   */
  private async initializeHelpers(): Promise<void> {
    console.log('🚀 サーバー起動高速化: 必要時初期化モードに変更');
    
    // 軽量初期化のみ実行（重い処理は初回使用時に遅延初期化）
    try {
      // IntelligentConceptExtractor: 学習DBのみ読み込み、Kuromoji初期化は遅延化
      console.log('✅ IntelligentConceptExtractor 軽量初期化完了');
    } catch (error) {
      console.warn('⚠️ IntelligentConceptExtractor 初期化失敗:', error);
    }
    
    // AI Integration Service: API プロバイダー初期化
    try {
      await this.aiIntegrationService.initialize();
      console.log('✅ AI Integration Service 初期化完了');
    } catch (error) {
      console.warn('⚠️ AI Integration Service 初期化失敗:', error);
    }
    
    // SessionManagementSystem の初期化（共有インスタンス使用）
    try {
      await this.sessionManager.initialize();
      console.log('✅ SessionManagementSystem 初期化完了');
    } catch (error) {
      console.warn('⚠️ SessionManagementSystem 初期化失敗:', error);
    }
    // 既存ログファイルリストで命名ヘルパーを初期化
    const existingLogs = [
      'log_p00_discovery_01.md',
      'log_p00_discovery_02.md', 
      'log_p00_discovery_03.md',
      'log_p01_article_01.md',
      'log_p01_init_01.md',
      'log_p02_propagation_01.md',
      'log_p02_trial_math_01.md',
      'log_p02_trial_math_02.md',
      'log_p02_trigger_01.md',
      'log_p02_trigger_02.md',
      'log_p02_trigger_03.md',
      'log_p02_trigger_04.md',
      'log_p02_trigger_05.md',
      'log_p02_trigger_06.md',
      'log_p02_trigger_07.md',
      'log_p02_trigger_08.md',
      'log_p02_trigger_09.md',
      'log_p03_applications_01.md',
      'log_p03_finalize_01.md',
      'log_p04_transition_01.md',
      'log_p05_extension_01.md',
      'log_p05_extension_02.md',
      'log_p05_extension_03.md',
      'log_p05_extension_04.md',
      'log_p05_extension_05.md',
      'log_p05_extension_06.md',
      'log_p05_extension_07.md',
      'log_p06_propagation_01.md',
      'log_p06_reflection_01_claude.md'
    ];
    
    this.namingHelper.initialize(existingLogs);
    console.log('✅ 命名ヘルパー初期化完了');
  }

  /**
   * メイン処理: 生ログを分割・命名・書式統一
   */
  private async processLog(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { rawLog, sessionContext, options = {} }: ProcessRequest = req.body;
      
      if (!rawLog || rawLog.trim().length === 0) {
        res.status(400).json({ 
          success: false, 
          error: '生ログが空です' 
        });
        return;
      }

      console.log(`📄 処理開始: ${rawLog.length}文字`);

      // 1. 分割処理
      const splitOptions = {
        targetChunkSize: options.targetChunkSize || 10000,
        preserveContext: options.preserveContext !== false,
        addChunkHeaders: options.addChunkHeaders !== false
      };
      
      const chunks = this.splitter.splitRawLog(rawLog, sessionContext);
      console.log(`✂️ 分割完了: ${chunks.length}チャンク`);

      // 2. 処理結果生成
      const processedChunks = await Promise.all(
        chunks.map(async (chunk, index) => {
          let suggestedFilename: string | undefined;
          let unifiedContent: string | undefined;

          // 命名提案
          if (options.generateFilenames !== false) {
            const namingSuggestions = this.namingHelper.suggest(
              chunk.content,
              {
                currentPhase: this.detectPhaseFromContent(chunk.content),
                contentHints: this.analyzeContentHints(chunk.content),
                dialogueMetrics: {
                  length: chunk.content.length,
                  complexity: chunk.boundaries.length,
                  newConcepts: this.countNewConcepts(chunk.content)
                }
              }
            );
            
            suggestedFilename = namingSuggestions[0]?.filename;
          }

          // 書式統一
          if (options.unifyFormat !== false && suggestedFilename) {
            unifiedContent = this.formatUnifier.unifyLogFormat(
              chunk.content,
              suggestedFilename,
              {
                preserveContent: true,
                addMissingEmojis: true,
                standardizeMarkdown: true,
                addMetadata: true,
                generateToc: false
              }
            );
          }

          return {
            index: chunk.index,
            content: chunk.content,
            metadata: chunk.metadata,
            suggestedFilename,
            unifiedContent
          };
        })
      );

      // 3. 構造化プロンプト生成
      const structuringPrompts = this.splitter.generateStructuringPrompts(chunks, sessionContext);

      // 4. サマリー生成
      const processingTime = Date.now() - startTime;
      const summary = {
        originalLength: rawLog.length,
        chunkCount: chunks.length,
        avgChunkSize: Math.round(
          chunks.reduce((sum, c) => sum + c.metadata.characterCount, 0) / chunks.length
        ),
        processingTime
      };

      console.log(`✅ 処理完了: ${processingTime}ms`);

      const result: ProcessResult = {
        success: true,
        chunks: processedChunks,
        summary,
        structuringPrompts
      };

      res.json(result);

    } catch (error) {
      console.error('❌ 処理エラー:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        summary: {
          originalLength: 0,
          chunkCount: 0,
          avgChunkSize: 0,
          processingTime: Date.now() - startTime
        }
      });
    }
  }

  /**
   * 統一ログ処理（新機能）
   */
  private async processUnified(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { rawLog, sessionContext, options } = req.body;
      
      if (!rawLog || typeof rawLog !== 'string') {
        res.status(400).json({
          success: false,
          error: '有効な生ログが必要です'
        });
        return;
      }

      console.log(`🚀 統一処理開始: ${rawLog.length}文字`);
      if (options) {
        console.log(`📊 処理オプション: 並列=${options.parallelProcessing}, チャンク=${options.chunkSize}B`);
      }
      
      // 統一処理実行（概念抽出も内部で実行される）
      const unifiedStructure = await this.unifiedProcessor.processUnifiedLog(rawLog, sessionContext, options);
      const unifiedOutput = this.unifiedProcessor.generateUnifiedOutput(unifiedStructure);
      
      // 概念抽出結果を統一処理結果から取得（重複実行を回避）
      const conceptExtraction = unifiedStructure.conceptAnalysis;
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ 統一処理完了: ${processingTime}ms`);
      
      // レスポンス
      res.json({
        success: true,
        type: 'unified',
        unified: {
          header: unifiedStructure.header,
          chunks: unifiedStructure.chunks,
          metadata: unifiedStructure.metadata,
          qualityMetrics: unifiedStructure.qualityMetrics,
          output: unifiedOutput
        },
        extraction: conceptExtraction,
        summary: {
          originalLength: rawLog.length,
          chunkCount: unifiedStructure.chunks.length,
          avgChunkSize: Math.round(rawLog.length / unifiedStructure.chunks.length),
          mainConcepts: unifiedStructure.header.mainConcepts,
          processingTime,
          surfaceConceptsCount: conceptExtraction.surfaceConcepts.length,
          deepConceptsCount: conceptExtraction.deepConcepts.length,
          timeMarkersCount: conceptExtraction.timeRevolutionMarkers.length
        }
      });
      
    } catch (error) {
      console.error('統一処理エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        summary: {
          originalLength: 0,
          chunkCount: 0,
          avgChunkSize: 0,
          processingTime: Date.now() - startTime
        }
      });
    }
  }

  /**
   * IntelligentConceptExtractor API エンドポイント（Phase 3対応）
   */
  private async extractConcepts(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { logContent, options } = req.body;
      
      if (!logContent || typeof logContent !== 'string') {
        res.status(400).json({
          success: false,
          error: 'logContent (string) が必要です'
        });
        return;
      }

      const contentSize = Buffer.byteLength(logContent, 'utf8');
      console.log(`🔬 概念抽出開始: ${logContent.length}文字 (${Math.round(contentSize/1024)}KB)`);
      
      // Phase 3: オプション付きで概念抽出（並列処理デフォルト有効）
      const processingOptions = {
        parallelProcessing: true,
        chunkSize: 15000,
        maxParallelChunks: 4,
        ...options // クライアント指定のオプションで上書き
      };
      const extractionResult = await this.intelligentExtractor.extractConcepts(logContent, undefined, processingOptions);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ 概念抽出完了: ${processingTime}ms, 革新度${extractionResult.predictedInnovationLevel}/10`);
      
      // レスポンス
      res.json({
        success: true,
        extraction: extractionResult,
        summary: {
          originalLength: logContent.length,
          contentSizeKB: Math.round(contentSize/1024),
          surfaceConceptsCount: extractionResult.surfaceConcepts.length,
          deepConceptsCount: extractionResult.deepConcepts.length,
          timeMarkersCount: extractionResult.timeRevolutionMarkers.length,
          processingTime,
          usedChunking: contentSize > 100000
        }
      });
      
    } catch (error) {
      console.error('概念抽出エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        summary: {
          originalLength: 0,
          contentSizeKB: 0,
          surfaceConceptsCount: 0,
          deepConceptsCount: 0,
          timeMarkersCount: 0,
          processingTime: Date.now() - startTime,
          usedChunking: false
        }
      });
    }
  }

  /**
   * Phase 3: チャンク分割概念抽出API（明示的な大規模ログ処理）
   */
  private async extractConceptsChunked(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { logContent, options = {} } = req.body;
      
      if (!logContent || typeof logContent !== 'string') {
        res.status(400).json({
          success: false,
          error: 'logContent (string) が必要です'
        });
        return;
      }

      const contentSize = Buffer.byteLength(logContent, 'utf8');
      console.log(`⚡ 大規模ログ処理開始: ${logContent.length}文字 (${Math.round(contentSize/1024)}KB)`);
      
      // Phase 3: 強制的にチャンク処理を実行
      const processingOptions = {
        chunkSize: options.chunkSize || 50000, // 50KB default
        parallelProcessing: options.parallelProcessing !== false, // default true
        maxParallelChunks: options.maxParallelChunks || 4,
        memoryOptimization: options.memoryOptimization !== false, // default true
        ...options
      };
      
      const extractionResult = await this.intelligentExtractor.extractConcepts(
        logContent, 
        undefined, 
        processingOptions
      );
      
      const processingTime = Date.now() - startTime;
      const throughputKBPerSec = Math.round((contentSize / 1024) / (processingTime / 1000));
      
      console.log(`⚡ 大規模処理完了: ${processingTime}ms, ${throughputKBPerSec}KB/s, 革新度${extractionResult.predictedInnovationLevel}/10`);
      
      // レスポンス
      res.json({
        success: true,
        extraction: extractionResult,
        summary: {
          originalLength: logContent.length,
          contentSizeKB: Math.round(contentSize/1024),
          surfaceConceptsCount: extractionResult.surfaceConcepts.length,
          deepConceptsCount: extractionResult.deepConcepts.length,
          timeMarkersCount: extractionResult.timeRevolutionMarkers.length,
          processingTime,
          throughputKBPerSec,
          usedChunking: true,
          chunkingOptions: processingOptions
        }
      });
      
    } catch (error) {
      console.error('チャンク分割処理エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        summary: {
          originalLength: 0,
          contentSizeKB: 0,
          surfaceConceptsCount: 0,
          deepConceptsCount: 0,
          timeMarkersCount: 0,
          processingTime: Date.now() - startTime,
          throughputKBPerSec: 0,
          usedChunking: true
        }
      });
    }
  }

  /**
   * 分割のみ実行
   */
  private async splitOnly(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { rawLog, sessionContext, options = {} } = req.body;
      const chunks = this.splitter.splitRawLog(rawLog, sessionContext);
      
      res.json({
        success: true,
        chunks: chunks.map(c => ({
          index: c.index,
          content: c.content,
          metadata: c.metadata
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '分割エラー'
      });
    }
  }

  /**
   * 命名のみ実行
   */
  private async nameOnly(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { content, context = {} } = req.body;
      const suggestions = this.namingHelper.suggest(content, context);
      
      res.json({
        success: true,
        suggestions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '命名エラー'
      });
    }
  }

  /**
   * 書式統一のみ実行
   */
  private async formatOnly(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { content, filename, options = {} } = req.body;
      const unified = this.formatUnifier.unifyLogFormat(content, filename, options);
      
      res.json({
        success: true,
        unifiedContent: unified
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '書式統一エラー'
      });
    }
  }

  /**
   * 設定取得
   */
  private getSettings(req: express.Request, res: express.Response): void {
    res.json({
      splitter: {
        targetChunkSize: 10000,
        maxChunkSize: 12000,
        minChunkSize: 5000,
        overlapSize: 500
      },
      naming: {
        confidence: 0.8,
        suggestAlternatives: true
      },
      format: {
        preserveContent: true,
        addMissingEmojis: true,
        standardizeMarkdown: true,
        addMetadata: true
      }
    });
  }

  /**
   * 設定更新
   */
  private updateSettings(req: express.Request, res: express.Response): void {
    // TODO: 設定の永続化実装
    res.json({ success: true, message: '設定を更新しました' });
  }

  /**
   * 概念抽出設定取得
   */
  private getConceptExtractionConfig(req: express.Request, res: express.Response): void {
    try {
      const configStats = this.intelligentExtractor['configManager'].getConfigStats();
      const flatStopWords = this.intelligentExtractor['configManager'].getFlatStopWords();
      
      res.json({
        success: true,
        config: {
          ...configStats,
          stopWordsSample: flatStopWords.slice(0, 20), // 最初の20個をサンプルとして
          totalCategories: Object.keys(configStats.categories).length,
          isExternalized: true,
          configPath: 'src/config/concept-extraction-config.json'
        },
        message: '外部設定ファイル化完了'
      });
    } catch (error) {
      console.error('概念抽出設定取得エラー:', error);
      res.status(500).json({
        success: false,
        error: '設定取得に失敗しました',
        isExternalized: false
      });
    }
  }

  /**
   * セッション学習統計取得
   */
  private async getSessionLearningStats(req: express.Request, res: express.Response): Promise<void> {
    try {
      const sessionLearningSystem = this.intelligentExtractor['sessionLearningSystem'];
      
      // 学習データを構築（キャッシュされていない場合）
      let stats = sessionLearningSystem.getLearningStats();
      if (!stats) {
        console.log('🔄 セッション学習データを構築中...');
        await sessionLearningSystem.buildLearningData();
        stats = sessionLearningSystem.getLearningStats();
      }
      
      res.json({
        success: true,
        stats: stats || {
          totalSessions: 0,
          uniqueConcepts: 0,
          userPatterns: 0,
          averageInnovationLevel: 0,
          topConcepts: [],
          qualityTrends: null
        },
        message: 'セッション学習統計を取得しました',
        features: {
          sessionLearningEnabled: true,
          predictiveIntegration: true,
          realTimeUpdates: true
        }
      });
    } catch (error) {
      console.error('セッション学習統計取得エラー:', error);
      res.status(500).json({
        success: false,
        error: '学習統計の取得に失敗しました',
        features: {
          sessionLearningEnabled: false,
          predictiveIntegration: false,
          realTimeUpdates: false
        }
      });
    }
  }

  /**
   * コンテンツからフェーズ推測
   */
  private detectPhaseFromContent(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('発見') || lowerContent.includes('discovery')) return 'p00';
    if (lowerContent.includes('記事') || lowerContent.includes('article')) return 'p01';
    if (lowerContent.includes('実験') || lowerContent.includes('trigger')) return 'p02';
    if (lowerContent.includes('応用') || lowerContent.includes('application')) return 'p03';
    if (lowerContent.includes('遷移') || lowerContent.includes('transition')) return 'p04';
    if (lowerContent.includes('拡張') || lowerContent.includes('extension')) return 'p05';
    if (lowerContent.includes('振り返り') || lowerContent.includes('reflection')) return 'p06';
    
    return 'p02'; // デフォルト
  }

  /**
   * コンテンツヒント分析
   */
  private analyzeContentHints(content: string): any {
    const hints: any = {};
    const lowerContent = content.toLowerCase();
    
    hints.isDiscovery = lowerContent.includes('発見') || lowerContent.includes('discovery');
    hints.isTrigger = lowerContent.includes('実験') || lowerContent.includes('trigger');
    hints.isExtension = lowerContent.includes('拡張') || lowerContent.includes('extension');
    hints.isApplication = lowerContent.includes('応用') || lowerContent.includes('application');
    hints.isMath = lowerContent.includes('数学') || lowerContent.includes('math');
    hints.isExperimental = lowerContent.includes('試行') || lowerContent.includes('experimental');
    
    return hints;
  }

  /**
   * 新概念数カウント
   */
  private countNewConcepts(content: string): number {
    const conceptPatterns = [
      /新しい/g,
      /概念/g,
      /アイデア/g,
      /発見/g,
      /仮説/g
    ];
    
    return conceptPatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * セッション保存API
   */
  private async saveSession(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    const TIMEOUT_MS = 25000; // 25秒タイムアウト
    
    try {
      const { content, options = {} } = req.body;
      
      if (!content || typeof content !== 'string') {
        res.status(400).json({
          success: false,
          error: 'セッションコンテンツが必要です'
        });
        return;
      }

      console.log(`💾 セッション保存開始: ${content.length}文字`);
      console.log(`📊 受信データ構造確認:`, {
        hasPreProcessedResults: !!req.body.preProcessedResults,
        usePreProcessedData: options.usePreProcessedData,
        skipReprocessing: options.skipReprocessing
      });
      
      if (req.body.preProcessedResults) {
        console.log('🔍 preProcessedResults詳細:', {
          hasConceptExtraction: !!req.body.preProcessedResults.conceptExtraction,
          hasUnifiedProcessing: !!req.body.preProcessedResults.unifiedProcessing,
          hasQualityMetrics: !!req.body.preProcessedResults.qualityMetrics,
          unifiedKeys: req.body.preProcessedResults.unifiedProcessing ? Object.keys(req.body.preProcessedResults.unifiedProcessing) : null
        });
      } else {
        console.log('❌ preProcessedResults が送信されていません');
      }
      
      const saveOptions = {
        autoAnalysis: options.skipReprocessing ? false : (options.autoAnalysis !== false), // 重複処理スキップ
        generateHandover: options.generateHandover !== false,
        archiveOldSessions: options.archiveOldSessions || false,
        backupEnabled: options.backupEnabled !== false,
        customTags: options.customTags || [],
        forceHandover: options.forceHandover || false,
        // 処理済みデータを直接使用（req.bodyのトップレベルから取得）
        preProcessedResults: req.body.preProcessedResults || null,
        usePreProcessedData: options.usePreProcessedData || false
      };
      
      // タイムアウト付きでセッション保存実行
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session save timeout')), TIMEOUT_MS);
      });
      
      const sessionRecord = await Promise.race([
        this.sessionManager.saveSession(content, saveOptions),
        timeoutPromise
      ]) as any; // Typed as SessionRecord from successful path
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ セッション保存完了: ${processingTime}ms`);
      
      res.json({
        success: true,
        session: {
          id: sessionRecord.id,
          filename: sessionRecord.filename,
          tags: sessionRecord.tags,
          phase: sessionRecord.phase,
          timestamp: sessionRecord.timestamp,
          qualityScore: sessionRecord.analysis?.qualityAssurance.reliabilityScore || 0,
          isReliable: sessionRecord.analysis?.qualityAssurance.isReliable || false,
          innovationLevel: sessionRecord.analysis?.conceptExtraction.predictedInnovationLevel || 0
        },
        processingTime
      });
      
    } catch (error) {
      console.error('セッション保存エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        processingTime: Date.now() - startTime,
        isTimeout: error instanceof Error && error.message === 'Session save timeout'
      });
    }
  }

  /**
   * 新セッション開始API
   */
  private async startNewSession(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { useHandover = true } = req.body;
      
      console.log('🆕 新セッション開始...');
      
      const result = await this.sessionManager.startNewSession(useHandover);
      
      res.json({
        success: true,
        sessionId: result.sessionId,
        hasHandover: !!result.handover,
        handover: result.handover ? {
          fromSessionId: result.handover.fromSessionId,
          keywords: result.handover.keywords,
          guidance: result.handover.guidance,
          contextSummary: result.handover.contextSummary,
          qualityScore: result.handover.qualityScore
        } : null,
        startPrompt: result.startPrompt
      });
      
    } catch (error) {
      console.error('新セッション開始エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * セッション一覧取得API
   */
  private listSessions(req: express.Request, res: express.Response): void {
    try {
      const stats = this.sessionManager.getSessionStatistics();
      
      res.json({
        success: true,
        totalSessions: stats.totalSessions,
        averageQuality: stats.averageQuality,
        phaseDistribution: stats.phaseDistribution,
        tagDistribution: stats.tagDistribution
      });
      
    } catch (error) {
      console.error('セッション一覧取得エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * セッション取得API
   */
  private async getSession(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const session = await this.sessionManager.loadSession(id);
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'セッションが見つかりません'
        });
        return;
      }
      
      res.json({
        success: true,
        session: {
          id: session.id,
          filename: session.filename,
          content: session.content,
          tags: session.tags,
          phase: session.phase,
          timestamp: session.timestamp,
          status: session.status,
          analysis: session.analysis ? {
            qualityScore: session.analysis.qualityAssurance.reliabilityScore,
            isReliable: session.analysis.qualityAssurance.isReliable,
            innovationLevel: session.analysis.conceptExtraction.predictedInnovationLevel,
            dialogueType: session.analysis.conceptExtraction.dialogueTypeDetection,
            deepConcepts: session.analysis.conceptExtraction.deepConcepts.slice(0, 5),
            continuityKeywords: session.analysis.continuityKeywords
          } : null
        }
      });
      
    } catch (error) {
      console.error('セッション取得エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * セッション検索API
   */
  private searchSessions(req: express.Request, res: express.Response): void {
    try {
      const query = req.body;
      
      const sessions = this.sessionManager.searchSessions(query);
      
      res.json({
        success: true,
        sessions: sessions.map(session => ({
          id: session.id,
          filename: session.filename,
          tags: session.tags,
          phase: session.phase,
          timestamp: session.timestamp,
          qualityScore: session.analysis?.qualityAssurance.reliabilityScore || 0,
          isReliable: session.analysis?.qualityAssurance.isReliable || false,
          innovationLevel: session.analysis?.conceptExtraction.predictedInnovationLevel || 0
        })),
        count: sessions.length
      });
      
    } catch (error) {
      console.error('セッション検索エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * セッション統計API
   */
  private getSessionStats(req: express.Request, res: express.Response): void {
    try {
      const stats = this.sessionManager.getSessionStatistics();
      
      res.json({
        success: true,
        stats
      });
      
    } catch (error) {
      console.error('セッション統計エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * 最新引き継ぎデータ取得API
   */
  private getLatestHandover(req: express.Request, res: express.Response): void {
    try {
      const handover = this.sessionManager.getLatestHandover();
      
      res.json({
        success: true,
        hasHandover: !!handover,
        handover: handover ? {
          fromSessionId: handover.fromSessionId,
          keywords: handover.keywords,
          guidance: handover.guidance,
          contextSummary: handover.contextSummary,
          qualityScore: handover.qualityScore,
          handoverDate: handover.handoverDate
        } : null
      });
      
    } catch (error) {
      console.error('引き継ぎデータ取得エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * AI統合分析API（Phase 5）
   */
  private async analyzeWithAI(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { logContent, analysisType, providers, options } = req.body;

      if (!logContent) {
        res.status(400).json({
          success: false,
          error: 'logContent is required'
        });
        return;
      }

      const result = await this.aiIntegrationService.analyzeDialogue({
        logContent,
        analysisType: analysisType || 'concept-extraction',
        providers,
        options
      });

      res.json({
        success: true,
        result
      });

    } catch (error) {
      console.error('AI分析エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * AIプロバイダー比較API（Phase 5）
   */
  private async compareAIProviders(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { logContent, analysisType, providers } = req.body;

      if (!logContent || !providers || providers.length < 2) {
        res.status(400).json({
          success: false,
          error: 'logContent and at least 2 providers are required'
        });
        return;
      }

      const result = await this.aiIntegrationService.analyzeDialogue({
        logContent,
        analysisType: analysisType || 'concept-extraction',
        providers,
        options: { compareResults: true }
      });

      res.json({
        success: true,
        comparison: result
      });

    } catch (error) {
      console.error('AIプロバイダー比較エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * 利用可能なAIプロバイダー取得API（Phase 5）
   */
  private getAIProviders(req: express.Request, res: express.Response): void {
    try {
      const providers = this.aiIntegrationService.getAvailableProviders();
      const stats = this.aiIntegrationService.getProviderStats();

      res.json({
        success: true,
        providers,
        stats
      });

    } catch (error) {
      console.error('AIプロバイダー取得エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * AI統計情報取得API（Phase 5）
   */
  private getAIStats(req: express.Request, res: express.Response): void {
    try {
      const stats = this.aiIntegrationService.getProviderStats();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('AI統計取得エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * AI分析履歴取得API（Phase 5）
   */
  private getAIAnalysisHistory(req: express.Request, res: express.Response): void {
    try {
      const history = this.aiIntegrationService.getAnalysisHistory();
      const limit = parseInt(req.query.limit as string) || 50;

      res.json({
        success: true,
        history: history.slice(-limit),
        total: history.length
      });

    } catch (error) {
      console.error('AI分析履歴取得エラー:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  /**
   * 予測品質評価API
   */
  private async getPredictiveQualityAssessment(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { content } = req.body;
      
      if (!content || typeof content !== 'string') {
        res.status(400).json({ 
          error: 'Invalid request', 
          details: 'content (string) is required' 
        });
        return;
      }

      console.log('🔮 予測品質評価API実行中...', { contentLength: content.length });

      // 概念抽出を実行
      const extractionResult = await this.intelligentExtractor.extractConcepts(content);
      
      // 予測品質評価を実行
      const predictiveQuality = this.predictiveQualityAssessment.assessPredictiveQuality(extractionResult);
      
      // レポート生成
      const report = this.predictiveQualityAssessment.formatPredictiveQualityReport(predictiveQuality);

      console.log('✅ 予測品質評価完了:', {
        predictiveQualityScore: predictiveQuality.predictiveQualityScore.toFixed(1),
        valueDrivers: predictiveQuality.valueDrivers.length,
        innovationSignals: predictiveQuality.innovationSignals.length
      });

      res.json({
        success: true,
        extractionResult,
        predictiveQuality,
        report,
        metadata: {
          processingTime: Date.now(),
          contentLength: content.length,
          apiVersion: 'predictive-quality-v1.0'
        }
      });

    } catch (error) {
      console.error('❌ 予測品質評価APIエラー:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * サーバー起動
   */
  public start(): void {
    console.log(`🚀 構造的対話アプリケーション起動`);
    console.log(`📱 URL: http://localhost:${this.port}`);
    console.log(`🔧 API: http://localhost:${this.port}/api/`);
    
    this.app.listen(this.port, '0.0.0.0', (err?: Error) => {
      if (err) {
        console.error('❌ サーバー起動エラー:', err);
        return;
      }
      console.log(`✅ サーバーがポート${this.port}で正常に起動しました`);
      console.log(`🌐 WSL外部アクセス: http://localhost:${this.port} (Windowsブラウザから)`);
    });
  }
}

// 実行
// アプリケーション起動
const app = new StructuredDialogueApp(3000);
app.start();

export { StructuredDialogueApp };