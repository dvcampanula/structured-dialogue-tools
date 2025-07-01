#!/usr/bin/env node

/**
 * セッション管理システム
 * セーブ・記録・引き継ぎの完全ワークフロー
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { IntegratedLogManagement, type IntegratedLogAnalysis } from './integrated-log-management.js';
import { IntelligentConceptExtractor } from './intelligent-concept-extractor.js';
import { PredictiveQualityAssessment, PredictiveQualityMetrics } from './predictive-quality-assessment.js';

export interface SessionRecord {
  id: string;
  timestamp: string;
  filename: string;
  analysis: IntegratedLogAnalysis;
  content: string;
  tags: string[];
  phase: string;
  status: 'active' | 'completed' | 'archived';
}

export interface SessionHandover {
  fromSessionId: string;
  toSessionId: string;
  keywords: string[];
  guidance: string;
  contextSummary: string;
  qualityScore: number;
  handoverDate: string;
  predictiveQualityMetrics?: PredictiveQualityMetrics;  // 予測品質評価追加
}

export interface SessionDatabase {
  sessions: SessionRecord[];
  handovers: SessionHandover[];
  metadata: {
    totalSessions: number;
    lastSessionId: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface SaveOptions {
  autoAnalysis: boolean;
  generateHandover: boolean;
  archiveOldSessions: boolean;
  backupEnabled: boolean;
  customTags?: string[];
  forceHandover?: boolean;
  // WebUI統合用: 処理済みデータ活用
  preProcessedResults?: any;
  usePreProcessedData?: boolean;
}

/**
 * セッション管理システム
 */
export class SessionManagementSystem {
  private logManager: IntegratedLogManagement;
  private sessionsDir: string;
  private databaseFile: string;
  private database: SessionDatabase;
  private conceptExtractor: IntelligentConceptExtractor;
  private predictiveQualityAssessment: PredictiveQualityAssessment;

  constructor(sessionsDir = './sessions', databaseFile = './session_database.json', sharedConceptExtractor?: IntelligentConceptExtractor) {
    this.conceptExtractor = sharedConceptExtractor || new IntelligentConceptExtractor();
    this.logManager = new IntegratedLogManagement(this.conceptExtractor);
    this.predictiveQualityAssessment = new PredictiveQualityAssessment();
    this.sessionsDir = path.resolve(sessionsDir);
    this.databaseFile = path.resolve(databaseFile);
    this.database = {
      sessions: [],
      handovers: [],
      metadata: {
        totalSessions: 0,
        lastSessionId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  async initialize(): Promise<void> {
    console.log('🚀 セッション管理システム初期化...');
    
    // ディレクトリ作成
    await this.ensureDirectories();
    
    // データベース読み込み
    await this.loadDatabase();
    
    // 共有ConceptExtractorが未初期化の場合のみ初期化
    if (!this.conceptExtractor.isInitialized) {
      await this.conceptExtractor.initialize();
    }
    
    // ログ管理システム初期化（共有インスタンス使用）
    await this.logManager.initialize();
    
    console.log('✅ セッション管理システム初期化完了');
  }

  /**
   * セッション保存
   */
  async saveSession(
    content: string, 
    options: SaveOptions = this.getDefaultSaveOptions()
  ): Promise<SessionRecord> {
    console.log('💾 セッション保存開始...');
    
    // Step 1: 分析実行（処理済みデータまたは新規分析）
    let analysis: IntegratedLogAnalysis | null = null;
    
    if (options.usePreProcessedData && options.preProcessedResults) {
      console.log('📊 処理済みデータを使用してセッション作成...');
      console.log('🔍 受信データキー:', Object.keys(options.preProcessedResults));
      // 処理済みデータから分析結果を構築
      analysis = this.constructAnalysisFromPreProcessed(options.preProcessedResults);
      console.log('✅ 分析結果構築完了:', {
        filename: analysis.namingSuggestion.filename,
        qualityScore: analysis.qualityAssurance.reliabilityScore
      });
    } else if (options.autoAnalysis) {
      console.log('📊 セッション分析実行...');
      analysis = await this.logManager.analyzeLog(content);
    }

    // Step 2: セッションID生成
    const sessionId = this.generateSessionId();
    
    // Step 3: ファイル名決定（ユニーク性保証）
    const baseFilename = analysis?.namingSuggestion.filename || `session_${sessionId}.md`;
    const filename = this.ensureUniqueFilename(baseFilename, sessionId);
    const filepath = path.join(this.sessionsDir, filename);
    const saveContent = this.formatSessionContent(content, analysis, sessionId);
    
    // Step 4: セッションレコード作成
    const sessionRecord: SessionRecord = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      filename,
      analysis: analysis!,
      content,
      tags: this.generateTags(analysis, options.customTags),
      phase: this.determinePhase(analysis),
      status: 'active'
    };

    // Step 5: データベース更新（同期処理）
    this.database.sessions.push(sessionRecord);
    this.database.metadata.totalSessions++;
    this.database.metadata.lastSessionId = sessionId;
    this.database.metadata.updatedAt = new Date().toISOString();

    // 🚀 Phase 4最適化: ファイルI/O並列化実装
    console.log('⚡ 並列処理でファイルI/O最適化実行中...');
    
    const parallelTasks: Promise<any>[] = [];

    // 必須処理: ファイル保存とデータベース保存を並列実行
    parallelTasks.push(
      fs.writeFile(filepath, saveContent, 'utf-8')
        .then(() => console.log(`💾 セッションファイル保存完了: ${filename}`))
    );
    parallelTasks.push(
      this.saveDatabase()
        .then(() => console.log('📊 データベース保存完了'))
    );

    // 条件付き処理: バックアップを並列実行
    if (options.backupEnabled) {
      parallelTasks.push(
        this.createBackup(sessionRecord)
          .then(() => console.log('💿 バックアップ作成完了'))
      );
    }

    // 条件付き処理: 引き継ぎ生成を並列実行
    console.log('🔍 引き継ぎ生成条件チェック:', {
      generateHandover: options.generateHandover,
      isReliable: analysis?.qualityAssurance.isReliable,
      forceHandover: options.forceHandover,
      qualityScore: analysis?.qualityAssurance?.reliabilityScore
    });
    
    if (options.generateHandover && (analysis?.qualityAssurance.isReliable || options.forceHandover)) {
      parallelTasks.push(
        this.generateHandover(sessionRecord, options.forceHandover)
          .then(() => console.log('🔄 引き継ぎデータ生成完了'))
      );
    } else {
      console.log('⚠️ 引き継ぎデータ生成スキップ:', {
        reason: !options.generateHandover ? 'generateHandover=false' : 'quality check failed'
      });
    }

    // 🚀 並列実行: 全てのファイルI/O操作を同時実行
    await Promise.all(parallelTasks);

    console.log(`✅ セッション保存完了: ${filename}`);
    return sessionRecord;
  }

  /**
   * 引き継ぎ生成
   */
  async generateHandover(fromSession: SessionRecord, forceGenerate = false): Promise<SessionHandover | null> {
    console.log('🔗 引き継ぎデータ生成...', {
      sessionId: fromSession.id,
      forceGenerate,
      qualityScore: fromSession.analysis?.qualityAssurance?.reliabilityScore,
      isReliable: fromSession.analysis?.qualityAssurance.isReliable
    });

    // 予測品質評価の実行
    let predictiveQualityMetrics: PredictiveQualityMetrics | undefined;
    if (fromSession.analysis?.conceptExtraction) {
      console.log('🔮 予測品質評価実行中...');
      predictiveQualityMetrics = this.predictiveQualityAssessment.assessPredictiveQuality(fromSession.analysis.conceptExtraction);
      console.log('🔮 予測品質スコア:', predictiveQualityMetrics.predictiveQualityScore.toFixed(1));
    }

    // 引き継ぎ判定: 従来の品質評価 OR 予測品質評価（70%以上）で判定
    const shouldGenerate = forceGenerate || 
      fromSession.analysis?.qualityAssurance.isReliable ||
      (predictiveQualityMetrics && predictiveQualityMetrics.predictiveQualityScore >= 70);

    if (!shouldGenerate) {
      console.log('⚠️  品質が低いため引き継ぎスキップ', {
        legacyQuality: fromSession.analysis?.qualityAssurance?.reliabilityScore,
        predictiveQuality: predictiveQualityMetrics?.predictiveQualityScore
      });
      return null;
    }

    const handover: SessionHandover = {
      fromSessionId: fromSession.id,
      toSessionId: '', // 次回セッション時に設定
      keywords: fromSession.analysis?.continuityKeywords || [],
      guidance: fromSession.analysis?.sessionGuidance || '前回セッションからの継続です。',
      contextSummary: this.generateContextSummary(fromSession),
      qualityScore: fromSession.analysis?.qualityAssurance?.reliabilityScore || 0,
      handoverDate: new Date().toISOString(),
      predictiveQualityMetrics: predictiveQualityMetrics  // 予測品質評価を保存
    };

    this.database.handovers.push(handover);
    await this.saveDatabase();

    console.log('✅ 引き継ぎデータ生成完了:', {
      handoverId: handover.fromSessionId,
      totalHandovers: this.database.handovers.length,
      keywords: handover.keywords,
      legacyQualityScore: handover.qualityScore,
      predictiveQualityScore: predictiveQualityMetrics?.predictiveQualityScore
    });
    return handover;
  }

  /**
   * セッション読み込み
   */
  async loadSession(sessionId: string): Promise<SessionRecord | null> {
    const session = this.database.sessions.find(s => s.id === sessionId);
    if (!session) {
      console.log(`❌ セッション ${sessionId} が見つかりません`);
      return null;
    }

    // ファイル内容も読み込み
    const filepath = path.join(this.sessionsDir, session.filename);
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      session.content = this.extractOriginalContent(content);
      return session;
    } catch (error) {
      console.log(`❌ ファイル読み込みエラー: ${session.filename}`);
      return null;
    }
  }

  /**
   * 引き継ぎデータ取得
   */
  getLatestHandover(): SessionHandover | null {
    console.log('🔍 引き継ぎデータ取得:', {
      totalHandovers: this.database.handovers.length,
      handoverIds: this.database.handovers.map(h => h.fromSessionId)
    });
    
    if (this.database.handovers.length === 0) {
      console.log('📭 引き継ぎデータなし');
      return null;
    }
    
    // 最新の引き継ぎデータを取得（toSessionIdに関係なく）
    const sortedHandovers = this.database.handovers
      .sort((a, b) => new Date(b.handoverDate).getTime() - new Date(a.handoverDate).getTime());
    
    const latest = sortedHandovers[0] || null;
    console.log('📋 最新引き継ぎデータ:', latest ? {
      fromSessionId: latest.fromSessionId,
      qualityScore: latest.qualityScore,
      handoverDate: latest.handoverDate
    } : 'なし');
    
    return latest;
  }

  /**
   * 新セッション開始
   */
  async startNewSession(useHandover = true): Promise<{
    sessionId: string;
    handover?: SessionHandover;
    startPrompt?: string;
  }> {
    console.log('🆕 新セッション開始...');
    
    const sessionId = this.generateSessionId();
    let handover: SessionHandover | undefined;
    let startPrompt: string | undefined;

    if (useHandover) {
      handover = this.getLatestHandover() || undefined;
      if (handover) {
        // 引き継ぎデータを新セッションに関連付け
        handover.toSessionId = sessionId;
        
        // 開始プロンプト生成
        startPrompt = this.generateStartPrompt(handover);
        
        await this.saveDatabase();
        console.log('✅ 引き継ぎデータ適用完了');
      }
    }

    console.log(`✅ 新セッション開始: ${sessionId}`);
    return { sessionId, handover, startPrompt };
  }

  /**
   * セッション検索
   */
  searchSessions(query: {
    tags?: string[];
    phase?: string;
    dateRange?: { start: string; end: string };
    minQuality?: number;
    keywords?: string[];
  }): SessionRecord[] {
    return this.database.sessions.filter(session => {
      // タグフィルタ
      if (query.tags && !query.tags.some(tag => session.tags.includes(tag))) {
        return false;
      }

      // フェーズフィルタ
      if (query.phase && session.phase !== query.phase) {
        return false;
      }

      // 日付フィルタ
      if (query.dateRange) {
        const sessionDate = new Date(session.timestamp);
        const start = new Date(query.dateRange.start);
        const end = new Date(query.dateRange.end);
        if (sessionDate < start || sessionDate > end) {
          return false;
        }
      }

      // 品質フィルタ
      if (query.minQuality && session.analysis?.qualityAssurance.reliabilityScore < query.minQuality) {
        return false;
      }

      // キーワードフィルタ
      if (query.keywords) {
        const sessionKeywords = session.analysis?.continuityKeywords || [];
        if (!query.keywords.some(keyword => sessionKeywords.includes(keyword))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * セッション統計
   */
  getSessionStatistics(): {
    totalSessions: number;
    averageQuality: number;
    phaseDistribution: Record<string, number>;
    tagDistribution: Record<string, number>;
    qualityTrend: { date: string; quality: number }[];
  } {
    const sessions = this.database.sessions;
    
    // セッションが存在しない場合のデフォルト値
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageQuality: 0,
        phaseDistribution: {},
        tagDistribution: {},
        qualityTrend: []
      };
    }
    
    const averageQuality = sessions.reduce((sum, s) => 
      sum + (s.analysis?.qualityAssurance.reliabilityScore || 0), 0) / sessions.length;
    
    const phaseDistribution: Record<string, number> = {};
    const tagDistribution: Record<string, number> = {};
    
    sessions.forEach(session => {
      // フェーズ分布
      phaseDistribution[session.phase] = (phaseDistribution[session.phase] || 0) + 1;
      
      // タグ分布
      session.tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    });

    // 品質トレンド（過去30日）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const qualityTrend = sessions
      .filter(s => new Date(s.timestamp) >= thirtyDaysAgo)
      .map(s => ({
        date: s.timestamp.split('T')[0],
        quality: s.analysis?.qualityAssurance.reliabilityScore || 0
      }));

    return {
      totalSessions: sessions.length,
      averageQuality: Math.round(averageQuality || 0),
      phaseDistribution,
      tagDistribution,
      qualityTrend
    };
  }

  /**
   * プライベートヘルパーメソッド
   */

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await fs.mkdir(path.join(this.sessionsDir, 'backups'), { recursive: true });
  }

  private async loadDatabase(): Promise<void> {
    try {
      const data = await fs.readFile(this.databaseFile, 'utf-8');
      this.database = JSON.parse(data);
    } catch (error) {
      // データベースファイルが存在しない場合は新規作成
      console.log('📝 新規データベース作成');
    }
  }

  private async saveDatabase(): Promise<void> {
    await fs.writeFile(this.databaseFile, JSON.stringify(this.database, null, 2), 'utf-8');
  }

  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `session_${timestamp}_${random}`;
  }

  private formatSessionContent(content: string, analysis: IntegratedLogAnalysis | null, sessionId: string): string {
    const header = [
      `# セッション記録: ${sessionId}`,
      ``,
      `## メタデータ`,
      `- セッションID: ${sessionId}`,
      `- 作成日時: ${new Date().toISOString()}`,
      analysis ? `- 対話タイプ: ${analysis.conceptExtraction.dialogueTypeDetection}` : '',
      analysis ? `- 革新度: ${analysis.conceptExtraction.predictedInnovationLevel}/10` : '',
      analysis ? `- 品質スコア: ${analysis.qualityAssurance.reliabilityScore}%` : '',
      analysis ? `- 継続キーワード: ${analysis.continuityKeywords.join(', ')}` : '',
      ``,
      `## セッション内容`,
      ``,
      content,
      ``,
      `---`,
      `*Generated by Structured Dialogue Tools*`
    ].filter(Boolean).join('\n');

    return header;
  }

  private extractOriginalContent(formattedContent: string): string {
    const contentStart = formattedContent.indexOf('## セッション内容');
    const contentEnd = formattedContent.lastIndexOf('---');
    
    if (contentStart === -1 || contentEnd === -1) {
      return formattedContent;
    }
    
    return formattedContent.substring(contentStart + 20, contentEnd).trim();
  }

  private generateTags(analysis: IntegratedLogAnalysis | null, customTags?: string[]): string[] {
    const tags: string[] = [];
    
    if (analysis) {
      // 対話タイプベースのタグ
      tags.push(analysis.conceptExtraction.dialogueTypeDetection);
      
      // 革新度ベースのタグ
      const innovation = analysis.conceptExtraction.predictedInnovationLevel;
      if (innovation >= 8) tags.push('high_innovation');
      else if (innovation >= 5) tags.push('medium_innovation');
      else tags.push('low_innovation');
      
      // 品質ベースのタグ
      if (analysis.qualityAssurance.isReliable) tags.push('reliable');
      else tags.push('needs_improvement');
      
      // 深層概念ベースのタグ（有意味な概念のみ）
      analysis.conceptExtraction.deepConcepts.slice(0, 3).forEach(concept => {
        const sanitizedTerm = concept.term.replace(/[^a-zA-Z0-9]/g, '_');
        // アンダースコアのみまたは空文字の場合はスキップ
        if (sanitizedTerm && sanitizedTerm !== '_' && !/^_+$/.test(sanitizedTerm)) {
          tags.push(`concept_${sanitizedTerm}`);
        }
      });
    }
    
    // カスタムタグ追加
    if (customTags) {
      tags.push(...customTags);
    }
    
    return [...new Set(tags)]; // 重複除去
  }

  private determinePhase(analysis: IntegratedLogAnalysis | null): string {
    if (!analysis) return 'unknown';
    
    const innovation = analysis.conceptExtraction.predictedInnovationLevel;
    const concepts = analysis.conceptExtraction.deepConcepts.length;
    
    if (innovation >= 8 && concepts >= 4) return 'discovery';
    if (innovation >= 6 && concepts >= 2) return 'development';
    if (innovation >= 4) return 'exploration';
    return 'basic';
  }

  private generateContextSummary(session: SessionRecord): string {
    const analysis = session.analysis;
    if (!analysis) return 'セッション概要情報なし';
    
    const concepts = analysis.conceptExtraction.deepConcepts.slice(0, 3).map(c => c.term);
    return `${analysis.conceptExtraction.dialogueTypeDetection}セッション。主要概念: ${concepts.join(', ')}。革新度: ${analysis.conceptExtraction.predictedInnovationLevel}/10。`;
  }

  private generateStartPrompt(handover: SessionHandover): string {
    return [
      `## 前回セッションからの継続`,
      ``,
      `**継続キーワード**: ${handover.keywords.join(', ')}`,
      ``,
      `**前回の概要**: ${handover.contextSummary}`,
      ``,
      `**今回の方針**: ${handover.guidance}`,
      ``,
      `**品質スコア**: ${handover.qualityScore}% (従来評価)`,
      handover.predictiveQualityMetrics ? `**予測品質スコア**: ${handover.predictiveQualityMetrics.predictiveQualityScore.toFixed(1)}%` : '',
      handover.predictiveQualityMetrics ? `**継続推奨**: ${handover.predictiveQualityMetrics.continuityRecommendations.join(', ')}` : '',
      ``,
      `---`,
      ``,
      `これらの内容を踏まえて、今回のセッションを開始しましょう。`
    ].join('\n');
  }

  private async createBackup(session: SessionRecord): Promise<void> {
    const backupDir = path.join(this.sessionsDir, 'backups');
    const backupFile = path.join(backupDir, `${session.id}_backup.json`);
    
    await fs.writeFile(backupFile, JSON.stringify(session, null, 2), 'utf-8');
  }

  /**
   * 処理済みデータからIntegratedLogAnalysisを構築
   */
  private constructAnalysisFromPreProcessed(preProcessedResults: any): IntegratedLogAnalysis {
    console.log('🔄 処理済みデータから分析結果を構築中...');
    
    const conceptExtraction = preProcessedResults.conceptExtraction;
    const unifiedProcessing = preProcessedResults.unifiedProcessing;
    const qualityMetrics = preProcessedResults.qualityMetrics || unifiedProcessing?.qualityMetrics;
    
    // 統一処理結果から命名提案を取得
    const filename = unifiedProcessing?.header?.suggestedFilename || 'session_unnamed.md';
    
    return {
      conceptExtraction: conceptExtraction || {
        surfaceConcepts: [],
        deepConcepts: [],
        timeRevolutionMarkers: [],
        predictedInnovationLevel: 0,
        confidence: 0,
        processingTime: 0
      },
      namingSuggestion: {
        filename: filename,
        confidence: 85,
        reasoning: '統一処理結果から生成された提案',
        category: 'unified_processing',
        phase: 'p05', // Phase 5として設定
        alternatives: [filename.replace('.md', '_alt.md')]
      },
      qualityAssurance: {
        isReliable: (qualityMetrics?.overallScore >= 70) || (conceptExtraction?.confidence >= 70) || false,
        reliabilityScore: qualityMetrics?.overallScore || conceptExtraction?.confidence || 0,
        issues: [],
        recommendations: [],
        usageGuidelines: []
      },
      logStructure: unifiedProcessing || {},
      chunks: unifiedProcessing?.chunks || [],
      legacyQualityMetrics: {
        isReliable: qualityMetrics?.overallScore >= 70 || false,
        reliabilityScore: qualityMetrics?.overallScore || 0,
        issues: [],
        recommendations: [],
        usageGuidelines: []
      },
      continuityKeywords: conceptExtraction?.deepConcepts?.slice(0, 5).map((c: any) => c.term) || [],
      sessionGuidance: '処理済みデータから生成されたセッション',
      splitRecommendation: {
        shouldSplit: false,
        reason: '統一処理済みのため分割不要',
        suggestedSplitPoints: [],
        chunkSizes: []
      }
    };
  }

  /**
   * ユニークなファイル名を保証（上書き防止）
   */
  private ensureUniqueFilename(baseFilename: string, sessionId: string): string {
    // セッションIDを含む場合はそのまま使用（既にユニーク）
    if (baseFilename.includes(sessionId)) {
      return baseFilename;
    }
    
    // log_pXX_xxx_yyy.md 形式の場合、セッションIDを挿入
    const logPattern = /^(log_p\d+_[^_]+_[^_]+)\.md$/;
    const match = baseFilename.match(logPattern);
    
    if (match) {
      const baseName = match[1];
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
      return `${baseName}_${timestamp}.md`;
    }
    
    // その他の形式の場合、タイムスタンプ追加
    const nameWithoutExt = baseFilename.replace('.md', '');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    return `${nameWithoutExt}_${timestamp}.md`;
  }

  private getDefaultSaveOptions(): SaveOptions {
    return {
      autoAnalysis: true,
      generateHandover: true,
      archiveOldSessions: false,
      backupEnabled: true
    };
  }
}