#!/usr/bin/env node

/**
 * 構造的対話統合Webアプリケーション
 * 既存の分割・命名・書式ツールを統合したローカルサーバー
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { RawLogSplitter } from '../core/raw-log-splitter.js';
import { NamingHelper } from '../core/naming-helper.js';
import { LogFormatUnifier } from '../core/log-format-unifier.js';

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
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.splitter = new RawLogSplitter();
    this.namingHelper = new NamingHelper();
    this.formatUnifier = new LogFormatUnifier();
    
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
    
    // 設定取得・更新
    this.app.get('/api/settings', this.getSettings.bind(this));
    this.app.post('/api/settings', this.updateSettings.bind(this));
    
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
  private initializeHelpers(): void {
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