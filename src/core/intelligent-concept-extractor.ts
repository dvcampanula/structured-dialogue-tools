#!/usr/bin/env node

/**
 * IntelligentConceptExtractor - 学習データ活用による革命的概念抽出システム
 * 
 * 75概念、1.2MBの学習データベース（ANALYSIS_RESULTS_DB.json）を活用し、
 * プロトコル v1.0の完全自動適用による高精度概念抽出を実現
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import kuromoji from 'kuromoji';
import { ConceptExtractionConfigManager } from './concept-extraction-config-manager.js';
import { SessionLearningSystem } from './session-learning-system.js';
import { PhenomenonDetector, type DetectedPhenomenon, type PhenomenonPattern } from './phenomenon-detector.js';
import { EvolutionaryPatternDiscoverySystem, type EvolutionaryDiscoveryResult } from './evolutionary-pattern-discovery.js';
import { DialoguePhaseAnalyzer, type DialoguePhaseResult, type DialoguePhase } from './dialogue-phase-analyzer.js';
import { AcademicValueAssessor, type AcademicValueAssessment, type AcademicValue } from './academic-value-assessor.js';
import { TimeMarkerDetector, type TimeRevolutionMarker } from './time-marker-detector.js';
import { ConceptExtractionCacheManager } from './cache-manager.js';
import { ConceptClassifier, type ClassifiedConcept as ImportedClassifiedConcept } from './concept-classifier.js';
import { PredictiveExtractor, type PredictiveExtractionResult, type PredictiveConcept } from './predictive-extractor.js';
import { ChunkProcessor, type ProcessingOptions } from './chunk-processor.js';

// 学習データベースの型定義
interface AnalysisResultsDB {
  protocolVersion: string;
  lastUpdated: string;
  totalLogsAnalyzed: number;
  analysisHistory: Record<string, LogAnalysisResult>;
  patterns: {
    failurePatterns: FailurePattern[];
    successPatterns: SuccessPattern[];
  };
  projectCompletion: ProjectCompletion;
}

interface LogAnalysisResult {
  analysisDate: string;
  aiAnalyst: string;
  fileSize: string;
  chunkCount: string;
  dialogueType: string;
  surfaceConcepts: string[];
  deepConcepts: string[];
  timeRevolutionMarkers: string[];
  breakthroughMoments: string[];
  innovationLevel: number;
  socialImpact: string;
  keyQuotes: string[];
  foundationalConcepts?: string[];
  comparisonWithPrevious: string;
  historicalSignificance?: string;
}

// Phase 3: 処理オプションの型定義
// ProcessingOptions は chunk-processor.ts からインポート

// 抽出結果の型定義
export interface IntelligentExtractionResult {
  // 自動分類結果
  surfaceConcepts: ClassifiedConcept[];
  deepConcepts: ClassifiedConcept[];
  timeRevolutionMarkers: TimeRevolutionMarker[];
  
  // 予測・評価
  predictedInnovationLevel: number;
  predictedSocialImpact: 'low' | 'medium' | 'high' | 'revolutionary';
  breakthroughProbability: number;
  
  // 学習ベース分析
  similarPatterns: string[];
  dialogueTypeDetection: string;
  qualityPrediction: QualityPrediction;
  
  // メタ情報
  confidence: number;
  processingTime: number;
  appliedPatterns: string[];
  
  // 新概念検出情報（Phase 1追加）
  newConceptDetection?: {
    hasNewConcepts: boolean;
    newConceptCount: number;
    metaConceptCount: number;
    noveltyScore: number;
  };
  
  // 手動分析差異アラート（Phase 1追加）
  analysisGapAlert?: {
    potentialMissedConcepts: string[];
    qualityWarnings: string[];
    manualReviewRecommended: boolean;
    confidenceGap: number;
  };
  
  // Phase 2: 予測的概念抽出結果
  predictiveExtraction?: PredictiveExtractionResult;
  
  // 現象検出結果
  detectedPhenomena?: DetectedPhenomenon[];
  
  // Phase 6.1+: 進化的パターン発見結果
  evolutionaryDiscovery?: EvolutionaryDiscoveryResult;
}

// ClassifiedConcept型はconcept-classifier.tsからインポート
export type ClassifiedConcept = ImportedClassifiedConcept;

// TimeRevolutionMarkerは time-marker-detector.ts からインポート

// Phase 2: 動的学習用の型定義
export interface ManualAnalysisInput {
  logId: string;
  manualSurfaceConcepts: string[];
  manualDeepConcepts: string[];
  manualInnovationLevel: number;
  manualTimeMarkers: string[];
  analysisNote?: string;
  correctionReason?: string;
}

export interface DynamicLearningResult {
  learnedPatterns: string[];
  adjustedWeights: Record<string, number>;
  newConceptPatterns: string[];
  improvedAccuracy: number;
}

// PredictiveConcept および PredictiveExtractionResult型は predictive-extractor.ts からインポート

// 型定義は分離モジュールからインポート済み

export interface QualityPrediction {
  conceptDensity: number;
  innovationPotential: number;
  structuralDialogueScore: number;
  overallQuality: number;
  // リアルタイム品質評価拡張
  realTimeMetrics: RealTimeQualityMetrics;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  improvementSuggestions: string[];
  domainSpecificScore: number;
}

export interface RealTimeQualityMetrics {
  conceptCoherence: number;        // 概念の一貫性
  dialogueRelevance: number;       // 対話との関連性
  terminologyAccuracy: number;     // 専門用語精度
  extractionReliability: number;   // 抽出信頼性
  semanticDepth: number;          // 意味的深度
  contextualFitness: number;      // 文脈適合性
}

/**
 * 学習データ活用による知的概念抽出システム
 */
export class IntelligentConceptExtractor {
  private learningData: AnalysisResultsDB | null = null;
  private conceptPatterns: Map<string, ConceptPattern> = new Map();
  private innovationIndicators: string[] = [];
  private tokenizer: any = null;
  private _isInitialized: boolean = false;
  private metaConceptPatterns: RegExp[] = [];
  private revolutionaryKeywords: string[] = [];
  private newConceptDetectionEnabled: boolean = true;
  private metaConceptConfig: any = null;
  private configManager: ConceptExtractionConfigManager;
  private sessionLearningSystem: SessionLearningSystem;
  
  // 分離された分析システム
  private phenomenonDetector: PhenomenonDetector;
  private dialoguePhaseAnalyzer: DialoguePhaseAnalyzer;
  private academicValueAssessor: AcademicValueAssessor;
  private timeMarkerDetector: TimeMarkerDetector;
  private cacheManager: ConceptExtractionCacheManager;
  private conceptClassifier: ConceptClassifier;
  private predictiveExtractor: PredictiveExtractor;
  private chunkProcessor: ChunkProcessor;
  
  // Phase 6.1+: 進化的パターン発見システム
  private evolutionaryDiscoverySystem: EvolutionaryPatternDiscoverySystem;

  constructor(
    private dbPath: string = 'docs/ANALYSIS_RESULTS_DB.json',
    private metaConceptConfigPath: string = 'src/config/meta-concept-patterns.json'
  ) {
    this.configManager = new ConceptExtractionConfigManager();
    this.sessionLearningSystem = new SessionLearningSystem();
    
    // 分離された分析システムを初期化
    this.phenomenonDetector = new PhenomenonDetector();
    this.dialoguePhaseAnalyzer = new DialoguePhaseAnalyzer();
    this.academicValueAssessor = new AcademicValueAssessor();
    this.timeMarkerDetector = new TimeMarkerDetector();
    this.cacheManager = new ConceptExtractionCacheManager();
    this.conceptClassifier = new ConceptClassifier();
    this.predictiveExtractor = new PredictiveExtractor();
    this.chunkProcessor = new ChunkProcessor();
    
    // Phase 6.1+: 進化的パターン発見システム初期化
    this.evolutionaryDiscoverySystem = new EvolutionaryPatternDiscoverySystem();
  }

  /**
   * 学習データベースの読み込みと初期化
   */
  async initialize(): Promise<void> {
    try {
      // 設定ファイルの読み込み
      await this.configManager.loadConfig();
      const configStats = this.configManager.getConfigStats();
      console.log(`⚙️ 概念抽出設定読み込み完了: v${configStats.version} (${configStats.totalStopWords}個のストップワード)`);
      
      const dbContent = await fs.readFile(this.dbPath, 'utf-8');
      this.learningData = JSON.parse(dbContent);
      
      if (!this.learningData) {
        throw new Error('学習データベースの読み込みに失敗しました');
      }

      console.log(`📚 学習データ読み込み完了: ${this.learningData.totalLogsAnalyzed}ログ`);
      
      // 形態素解析器の初期化
      await this.initializeTokenizer();
      
      // メタ概念設定の読み込み
      await this.loadMetaConceptConfig();
      
      // パターン学習の実行
      await this.learnConceptPatterns();
      await this.learnInnovationIndicators();
      
      // ConceptClassifierに学習パターンを設定
      this.conceptClassifier.updatePatterns(this.conceptPatterns);
      this.conceptClassifier.updateRevolutionaryKeywords(this.revolutionaryKeywords);
      
      // PredictiveExtractorに学習パターンを設定
      this.predictiveExtractor.updatePatterns(this.conceptPatterns);
      this.predictiveExtractor.updateInnovationIndicators(this.innovationIndicators);
      this.predictiveExtractor.updateRevolutionaryKeywords(this.revolutionaryKeywords);
      
      // ChunkProcessorにトークナイザーを設定
      this.chunkProcessor.setTokenizer(this.tokenizer);
      
      // 分離クラスの統計取得
      const phenomenonStats = this.phenomenonDetector.getPhenomenonStats();
      const timeStats = this.timeMarkerDetector.getPatternStats();
      
      console.log(`🧠 パターン学習完了: ${this.conceptPatterns.size}概念パターン, ${phenomenonStats.patternCount}現象パターン, ${timeStats.patternCount}時間パターン`);
      
      this._isInitialized = true;
      
    } catch (error) {
      console.error('❌ 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 初期化状態の確認
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * kuromoji形態素解析器の初期化
   */
  private async initializeTokenizer(): Promise<void> {
    // 遅延初期化: 実際に使用されるまで初期化を延期
    if (this.tokenizer) return;
    
    console.log('🔗 kuromoji初期化開始（必要時のみ）...');
    return new Promise((resolve, reject) => {
      kuromoji.builder({
        dicPath: 'node_modules/kuromoji/dict'
      }).build((err: any, tokenizer: any) => {
        if (err) {
          console.warn('⚠️ 形態素解析器の初期化に失敗。基本処理で継続:', err.message);
          resolve();
        } else {
          this.tokenizer = tokenizer;
          console.log('🔗 kuromoji形態素解析器初期化完了');
          resolve();
        }
      });
    });
  }

  /**
   * 大容量ファイル対応: チャンク分割トークン化（性能最適化）
   */

  /**
   * メイン抽出関数 - プロトコル v1.0完全自動適用 + Phase 2動的学習 + Phase 3性能最適化 + Phase 4キャッシュ
   */
  async extractConcepts(logContent: string, manualAnalysis?: ManualAnalysisInput, options?: ProcessingOptions): Promise<IntelligentExtractionResult> {
    if (!this.learningData) {
      throw new Error('学習データが初期化されていません。initialize()を呼び出してください。');
    }

    // 🚀 Phase 4キャッシュ最適化: 分離されたCacheManagerを使用
    const cachedResult = this.cacheManager.getCachedResult(logContent, { manualAnalysis, options });
    if (cachedResult) {
      console.log('⚡ キャッシュから概念抽出結果を取得');
      return cachedResult;
    }

    const startTime = Date.now();
    
    // Phase 3: 大規模ログ処理の自動判定
    const shouldUseChunking = this.shouldUseChunkedProcessing(logContent, options);
    
    if (shouldUseChunking) {
      console.log('⚡ 大規模ログ検出 - チャンク分割処理開始...');
      return this.extractConceptsChunked(logContent, manualAnalysis, options);
    }
    
    console.log('🔬 知的概念抽出開始...');
    
    // Phase 2: 手動分析結果による動的学習
    if (manualAnalysis) {
      await this.performDynamicLearning(manualAnalysis, logContent);
      console.log('🧠 動的学習実行完了');
    }
    
    // Step 1: 基本概念抽出
    const rawConcepts = await this.extractRawConcepts(logContent);
    console.log(`📝 基本概念抽出: ${rawConcepts.length}個`);
    
    // Step 2: 表面vs深層の自動分類
    const { surfaceConcepts, deepConcepts } = await this.classifyConcepts(rawConcepts, logContent);
    console.log(`🎯 分類完了: 表面${surfaceConcepts.length}個, 深層${deepConcepts.length}個`);
    
    // Step 3: 時間革命マーカーの検出
    const timeRevolutionMarkers = this.timeMarkerDetector.detectTimeRevolutionMarkers(logContent);
    console.log(`⚡ 時間革命マーカー: ${timeRevolutionMarkers.length}個`);
    
    // Step 3.5: 現象検出（抽象概念検出）
    const detectedPhenomena = this.phenomenonDetector.detectPhenomena(logContent);
    console.log(`🎯 検出された現象: ${detectedPhenomena.length}個`);
    
    // Step 3.6: Phase 6.1 動的パターン学習（AI以外のアプローチ）
    const conceptTermsForLearning = [...surfaceConcepts, ...deepConcepts].map(c => c.term);
    const emergentPatterns = this.phenomenonDetector.learnFromConcepts(conceptTermsForLearning, logContent);
    
    // 新発見パターンの統合（閾値以上の場合）
    if (emergentPatterns.length > 0) {
      const integratedCount = this.phenomenonDetector.integrateEmergentPatterns(emergentPatterns);
      if (integratedCount > 0) {
        console.log(`🧠 動的学習: ${integratedCount}個の新パターンを学習・統合`);
        // 新パターンで再度現象検出を実行
        const additionalPhenomena = this.phenomenonDetector.detectPhenomena(logContent);
        detectedPhenomena.push(...additionalPhenomena.filter(p => 
          !detectedPhenomena.some(existing => existing.name === p.name)
        ));
      }
    }
    
    // Step 4: 新概念検出とボーナス適用
    const newConceptDetection = this.detectNewConcepts(deepConcepts, logContent);
    
    // Step 5: 革新度・社会的インパクトの予測（新概念ボーナス適用）
    const baseInnovationLevel = this.predictiveExtractor.predictInnovationLevelFromConcepts(deepConcepts, timeRevolutionMarkers, logContent);
    const innovationPrediction = this.applyNewConceptBonus(baseInnovationLevel, newConceptDetection, deepConcepts);
    const socialImpactPrediction = this.predictSocialImpact(deepConcepts, innovationPrediction);
    
    // Step 6: 対話タイプの自動検出
    const dialogueType = this.detectDialogueType(logContent);
    
    // Step 7: 品質予測
    const qualityPrediction = this.predictiveExtractor.predictQualityFromConcepts(surfaceConcepts, deepConcepts, timeRevolutionMarkers);
    
    // Step 8: 類似パターンの検出
    const similarPatterns = this.findSimilarPatterns(deepConcepts);
    
    // Phase 2: Step 9: 予測的概念抽出（セッション学習統合）
    const predictiveExtraction = await this.predictiveExtractor.performPredictiveExtraction(logContent, [...surfaceConcepts, ...deepConcepts].map(c => c.term));
    console.log(`🔮 予測的抽出: ${predictiveExtraction.predictedConcepts.length}個の潜在概念`);
    
    // Phase 6.1+: Step 10: 進化的パターン発見システム
    const conceptTermsForEvolution = [...surfaceConcepts, ...deepConcepts].map(c => c.term);
    const evolutionaryDiscovery = this.evolutionaryDiscoverySystem.discoverEvolutionaryPatterns(conceptTermsForEvolution, logContent);
    console.log(`🚀 進化的発見: ${evolutionaryDiscovery.newPatterns.length}新パターン, ${evolutionaryDiscovery.anomalies.length}異常`);
    
    const processingTime = Date.now() - startTime;
    
    const result: IntelligentExtractionResult = {
      surfaceConcepts,
      deepConcepts,
      timeRevolutionMarkers,
      predictedInnovationLevel: innovationPrediction,
      predictedSocialImpact: socialImpactPrediction,
      breakthroughProbability: this.calculateBreakthroughProbability(deepConcepts, timeRevolutionMarkers),
      similarPatterns,
      dialogueTypeDetection: dialogueType,
      qualityPrediction,
      confidence: this.calculateOverallConfidence(surfaceConcepts, deepConcepts),
      processingTime,
      appliedPatterns: Array.from(this.conceptPatterns.keys()).slice(0, 10),
      // 新概念検出情報を追加
      newConceptDetection,
      // 手動分析差異アラート
      analysisGapAlert: this.generateAnalysisGapAlert(logContent, deepConcepts, innovationPrediction, newConceptDetection),
      // Phase 2: 予測的概念抽出結果
      predictiveExtraction,
      // 現象検出結果
      detectedPhenomena,
      // Phase 6.1+: 進化的パターン発見結果
      evolutionaryDiscovery
    };
    
    console.log(`✅ 抽出完了 (${processingTime}ms): 革新度${innovationPrediction}/10, 信頼度${result.confidence}%`);
    
    // 手動分析差異アラートのログ出力
    if (result.analysisGapAlert?.manualReviewRecommended) {
      console.log(`⚠️  手動レビュー推奨 (信頼度ギャップ: ${result.analysisGapAlert.confidenceGap}/10)`);
      if (result.analysisGapAlert.qualityWarnings.length > 0) {
        console.log(`   警告: ${result.analysisGapAlert.qualityWarnings[0]}`);
      }
    }
    
    // 🚀 Phase 4キャッシュ最適化: 結果をキャッシュに保存
    this.cacheManager.cacheResult(logContent, result, { manualAnalysis, options });
    
    return result;
  }

  /**
   * Phase 3: チャンク分割による大規模ログ処理
   */
  private async extractConceptsChunked(
    logContent: string, 
    manualAnalysis?: ManualAnalysisInput, 
    options?: ProcessingOptions
  ): Promise<IntelligentExtractionResult> {
    const startTime = Date.now();
    const chunkSize = options?.chunkSize || 15000; // 15KB default (50KB→15KB高速化)
    
    // Step 1: コンテンツをチャンクに分割（並列度計算に必要）
    const chunks = this.chunkProcessor.splitIntoChunks(logContent, chunkSize);
    
    // 動的並列度調整（バッチ処理との競合考慮）
    const parallelChunks = this.chunkProcessor.calculateOptimalParallelChunks(logContent, chunks.length, options);
    
    console.log(`🔧 チャンク分割設定: ${chunkSize}バイト/チャンク, 並列度${parallelChunks}`);
    
    if (parallelChunks > 1) {
      console.log(`⚡ 並列処理モード: 最大${parallelChunks}並列でチャンク処理実行`);
    } else {
      console.log(`🔄 逐次処理モード: 1チャンクずつ順次処理`);
    }
    
    // Phase 2: 手動分析結果による動的学習（最初に実行）
    if (manualAnalysis) {
      await this.performDynamicLearning(manualAnalysis, logContent);
      console.log('🧠 動的学習実行完了');
    }
    
    console.log(`📄 ${chunks.length}チャンクに分割完了`);
    
    // Step 2: 各チャンクから概念を並列抽出
    const allSurfaceConcepts: ClassifiedConcept[] = [];
    const allDeepConcepts: ClassifiedConcept[] = [];
    const allTimeMarkers: TimeRevolutionMarker[] = [];
    
    // 並列処理または逐次処理
    if (parallelChunks > 1) {
      await this.processChunksUsingProcessor(chunks, parallelChunks, allSurfaceConcepts, allDeepConcepts, allTimeMarkers, true);
    } else {
      await this.processChunksUsingProcessor(chunks, 1, allSurfaceConcepts, allDeepConcepts, allTimeMarkers, false);
    }
    
    // Step 3: 結果をマージ・重複除去・最適化
    const { surfaceConcepts, deepConcepts } = this.optimizeAndMergeConcepts(allSurfaceConcepts, allDeepConcepts);
    const timeRevolutionMarkers = this.optimizeTimeMarkers(allTimeMarkers);
    
    console.log(`🔄 マージ完了: 表面${surfaceConcepts.length}個, 深層${deepConcepts.length}個`);
    
    // Step 4: 統合分析（全体コンテキストで実行）
    const newConceptDetection = this.detectNewConcepts(deepConcepts, logContent);
    
    // Step 4.5: 現象検出（チャンク処理でも統合）
    const detectedPhenomena = this.phenomenonDetector.detectPhenomena(logContent);
    console.log(`🎯 検出された現象: ${detectedPhenomena.length}個`);
    
    // Step 4.6: チャンク処理での動的パターン学習
    const allConceptTerms = [...surfaceConcepts, ...deepConcepts].map(c => c.term);
    const emergentPatterns = this.phenomenonDetector.learnFromConcepts(allConceptTerms, logContent);
    
    if (emergentPatterns.length > 0) {
      const integratedCount = this.phenomenonDetector.integrateEmergentPatterns(emergentPatterns);
      if (integratedCount > 0) {
        console.log(`🧠 チャンク動的学習: ${integratedCount}個の新パターンを統合`);
        const additionalPhenomena = this.phenomenonDetector.detectPhenomena(logContent);
        detectedPhenomena.push(...additionalPhenomena.filter(p => 
          !detectedPhenomena.some(existing => existing.name === p.name)
        ));
      }
    }
    
    const baseInnovationLevel = this.predictiveExtractor.predictInnovationLevelFromConcepts(deepConcepts, timeRevolutionMarkers, logContent);
    const innovationPrediction = this.applyNewConceptBonus(baseInnovationLevel, newConceptDetection, deepConcepts);
    const socialImpactPrediction = this.predictiveExtractor.predictSocialImpactFromConcepts(deepConcepts, innovationPrediction);
    const dialogueType = this.detectDialogueType(logContent);
    const qualityPrediction = this.predictiveExtractor.predictQualityFromConcepts(surfaceConcepts, deepConcepts, timeRevolutionMarkers);
    const similarPatterns = this.findSimilarPatterns(deepConcepts);
    
    // Phase 2: 予測的概念抽出（チャンク処理済みデータを使用・セッション学習統合）
    const predictiveExtraction = await this.predictiveExtractor.performPredictiveExtraction(logContent, [...surfaceConcepts, ...deepConcepts].map(c => c.term));
    console.log(`🔮 予測的抽出: ${predictiveExtraction.predictedConcepts.length}個の潜在概念`);
    
    // Phase 6.1+: チャンク処理での進化的パターン発見
    const evolutionaryDiscovery = this.evolutionaryDiscoverySystem.discoverEvolutionaryPatterns(allConceptTerms, logContent);
    console.log(`🚀 チャンク進化的発見: ${evolutionaryDiscovery.newPatterns.length}新パターン, ${evolutionaryDiscovery.anomalies.length}異常`);
    
    const processingTime = Date.now() - startTime;
    
    const result: IntelligentExtractionResult = {
      surfaceConcepts,
      deepConcepts,
      timeRevolutionMarkers,
      predictedInnovationLevel: innovationPrediction,
      predictedSocialImpact: socialImpactPrediction,
      breakthroughProbability: this.calculateBreakthroughProbability(deepConcepts, timeRevolutionMarkers),
      similarPatterns,
      dialogueTypeDetection: dialogueType,
      qualityPrediction,
      confidence: this.calculateOverallConfidence(surfaceConcepts, deepConcepts),
      processingTime,
      appliedPatterns: Array.from(this.conceptPatterns.keys()).slice(0, 10),
      newConceptDetection,
      analysisGapAlert: this.generateAnalysisGapAlert(logContent, deepConcepts, innovationPrediction, newConceptDetection),
      predictiveExtraction,
      // チャンク処理でも現象検出結果を含める
      detectedPhenomena,
      // Phase 6.1+: チャンク処理での進化的パターン発見結果
      evolutionaryDiscovery
    };
    
    console.log(`⚡ チャンク処理完了 (${processingTime}ms, ${chunks.length}チャンク): 革新度${innovationPrediction}/10`);
    
    // メモリ最適化: 大きな一時データをクリア
    this.cacheManager.performMemoryCleanup();
    
    return result;
  }

  /**
   * ChunkProcessorを使用したチャンク処理アダプター
   */
  private async processChunksUsingProcessor(
    chunks: string[],
    maxConcurrency: number,
    allSurfaceConcepts: ClassifiedConcept[],
    allDeepConcepts: ClassifiedConcept[],
    allTimeMarkers: TimeRevolutionMarker[],
    useParallel: boolean
  ): Promise<void> {
    // チャンク処理関数の定義
    const processChunk = async (chunk: string, index: number) => {
      const chunkSurfaceConcepts: ClassifiedConcept[] = [];
      const chunkDeepConcepts: ClassifiedConcept[] = [];
      const chunkTimeMarkers: TimeRevolutionMarker[] = [];
      
      // 基本的な概念抽出
      const basicConcepts = this.extractBasicConceptsFromChunk(chunk);
      const { surfaceConcepts, deepConcepts } = await this.classifyConcepts(basicConcepts, chunk);
      
      // 概念を分類
      chunkSurfaceConcepts.push(...surfaceConcepts);
      chunkDeepConcepts.push(...deepConcepts);
      
      // 時間革命マーカーの検出
      const timeMarkers = this.timeMarkerDetector.detectTimeRevolutionMarkers(chunk);
      chunkTimeMarkers.push(...timeMarkers);
      
      return {
        surfaceConcepts: chunkSurfaceConcepts,
        deepConcepts: chunkDeepConcepts,
        timeMarkers: chunkTimeMarkers
      };
    };
    
    // 並列または逐次処理
    const options: ProcessingOptions = {
      useParallelProcessing: useParallel,
      maxConcurrency,
      enableDetailedLogging: true
    };
    
    let results;
    if (useParallel) {
      results = await this.chunkProcessor.processChunksInParallel(chunks, processChunk, options);
    } else {
      results = await this.chunkProcessor.processChunksSequentially(chunks, processChunk, options);
    }
    
    // 結果をマージ
    for (const result of results) {
      if (result) {
        allSurfaceConcepts.push(...result.surfaceConcepts);
        allDeepConcepts.push(...result.deepConcepts);
        allTimeMarkers.push(...result.timeMarkers);
      }
    }
  }

  /**
   * チャンクから基本概念を抽出
   */
  private extractBasicConceptsFromChunk(chunk: string): string[] {
    // 既存の概念抽出ロジックを簡素化して使用
    const concepts: string[] = [];
    
    // 形態素解析ベースの抽出（簡易版）
    try {
      if (this.tokenizer) {
        const tokens = this.tokenizer.tokenize(chunk);
        tokens.forEach((token: any) => {
          // kuromoji tokenの正しいプロパティ名を使用
          if (token.pos === '名詞' && token.surface_form && token.surface_form.length >= 2) {
            concepts.push(token.surface_form);
          }
        });
      }
    } catch (error) {
      console.warn('チャンク形態素解析エラー:', error);
    }
    
    // パターンベースの抽出（バックアップ）
    const patternConcepts = this.extractConceptsByRegexPatterns(chunk);
    concepts.push(...patternConcepts);
    
    // 重複除去
    return [...new Set(concepts)].filter(concept => concept.length >= 2);
  }

  /**
   * 正規表現パターンによる概念抽出（簡易版）
   */
  private extractConceptsByRegexPatterns(content: string): string[] {
    const concepts: string[] = [];
    
    // 基本的な概念パターン
    const patterns = [
      /([一-龯]{2,10})(理論|システム|手法|アプローチ|モデル)/g,
      /([一-龯]{2,8})(的|性)/g,
      /(メタ|構造|動的|統合)([一-龯]{2,8})/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && match[1].length >= 2) {
          concepts.push(match[1]);
        }
        if (match[0] && match[0].length >= 2) {
          concepts.push(match[0]);
        }
      }
    }
    
    return concepts;
  }

  /**
   * Phase 3: チャンク分割処理が必要かどうかの判定
   */
  private shouldUseChunkedProcessing(content: string, options?: ProcessingOptions): boolean {
    const contentSize = Buffer.byteLength(content, 'utf8');
    const threshold = options?.chunkSize ? options.chunkSize * 2 : 100000; // 100KB threshold
    
    // サイズベースの判定
    if (contentSize > threshold) {
      return true;
    }
    
    // 明示的な並列処理要求
    if (options?.useParallelProcessing) {
      return true;
    }
    
    return false;
  }

  /**
   * Phase 3: コンテンツをチャンクに分割
   */
  private splitIntoChunks(content: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let currentIndex = 0;
    
    while (currentIndex < content.length) {
      let endIndex = currentIndex + chunkSize;
      
      // 文境界で分割（より自然な分割）
      if (endIndex < content.length) {
        const nextSentenceEnd = content.indexOf('。', endIndex);
        const nextNewlineEnd = content.indexOf('\n', endIndex);
        
        if (nextSentenceEnd !== -1 && nextSentenceEnd < endIndex + 1000) {
          endIndex = nextSentenceEnd + 1;
        } else if (nextNewlineEnd !== -1 && nextNewlineEnd < endIndex + 500) {
          endIndex = nextNewlineEnd + 1;
        }
      }
      
      chunks.push(content.substring(currentIndex, endIndex));
      currentIndex = endIndex;
    }
    
    return chunks;
  }

  /**
   * Phase 3: チャンクの並列処理
   */
  private async processChunksInParallel(
    chunks: string[],
    maxParallel: number,
    allSurfaceConcepts: ClassifiedConcept[],
    allDeepConcepts: ClassifiedConcept[],
    allTimeMarkers: TimeRevolutionMarker[]
  ): Promise<void> {
    const semaphore = Array(maxParallel).fill(null);
    let processedCount = 0;
    
    const processChunk = async (chunk: string, index: number) => {
      try {
        console.log(`🔄 チャンク${index + 1}/${chunks.length}処理中...`);
        
        const rawConcepts = await this.extractRawConcepts(chunk);
        const { surfaceConcepts, deepConcepts } = await this.classifyConcepts(rawConcepts, chunk);
        const timeMarkers = this.timeMarkerDetector.detectTimeRevolutionMarkers(chunk);
        
        // 結果をマージ
        allSurfaceConcepts.push(...surfaceConcepts);
        allDeepConcepts.push(...deepConcepts);
        allTimeMarkers.push(...timeMarkers);
        
        processedCount++;
        console.log(`✅ チャンク${index + 1}完了 (${processedCount}/${chunks.length})`);
        
      } catch (error) {
        console.error(`❌ チャンク${index + 1}処理エラー:`, error);
      }
    };
    
    // 高効率バッチ並列処理
    for (let i = 0; i < chunks.length; i += maxParallel) {
      const batch = chunks.slice(i, i + maxParallel);
      const batchPromises = batch.map((chunk, batchIndex) => 
        processChunk(chunk, i + batchIndex)
      );
      
      // バッチ単位で並列実行
      await Promise.all(batchPromises);
      
      // 進捗ログ
      const completed = Math.min(i + maxParallel, chunks.length);
      console.log(`📈 バッチ処理進捗: ${completed}/${chunks.length}チャンク完了`);
    }
  }

  /**
   * Phase 3: チャンクの逐次処理
   */
  private async processChunksSequentially(
    chunks: string[],
    allSurfaceConcepts: ClassifiedConcept[],
    allDeepConcepts: ClassifiedConcept[],
    allTimeMarkers: TimeRevolutionMarker[]
  ): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 チャンク${i + 1}/${chunks.length}処理中...`);
      
      const chunk = chunks[i];
      const rawConcepts = await this.extractRawConcepts(chunk);
      const { surfaceConcepts, deepConcepts } = await this.classifyConcepts(rawConcepts, chunk);
      const timeMarkers = this.timeMarkerDetector.detectTimeRevolutionMarkers(chunk);
      
      allSurfaceConcepts.push(...surfaceConcepts);
      allDeepConcepts.push(...deepConcepts);
      allTimeMarkers.push(...timeMarkers);
      
      console.log(`✅ チャンク${i + 1}完了`);
    }
  }

  /**
   * Phase 3: 概念の最適化とマージ
   */
  private optimizeAndMergeConcepts(
    allSurfaceConcepts: ClassifiedConcept[],
    allDeepConcepts: ClassifiedConcept[]
  ): { surfaceConcepts: ClassifiedConcept[]; deepConcepts: ClassifiedConcept[] } {
    
    // 重複除去とスコア集約
    const surfaceMap = new Map<string, ClassifiedConcept>();
    const deepMap = new Map<string, ClassifiedConcept>();
    
    // 表面概念の最適化
    allSurfaceConcepts.forEach(concept => {
      const existing = surfaceMap.get(concept.term);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, concept.confidence);
        existing.matchedPatterns.push(...concept.matchedPatterns);
      } else {
        surfaceMap.set(concept.term, { ...concept });
      }
    });
    
    // 深層概念の最適化
    allDeepConcepts.forEach(concept => {
      const existing = deepMap.get(concept.term);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, concept.confidence);
        existing.matchedPatterns.push(...concept.matchedPatterns);
      } else {
        deepMap.set(concept.term, { ...concept });
      }
    });
    
    // 信頼度でソート
    const surfaceConcepts = Array.from(surfaceMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 12); // 増量
    
    const deepConcepts = Array.from(deepMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // 増量
    
    return { surfaceConcepts, deepConcepts };
  }

  /**
   * Phase 3: 時間マーカーの最適化
   */
  private optimizeTimeMarkers(allTimeMarkers: TimeRevolutionMarker[]): TimeRevolutionMarker[] {
    const markerMap = new Map<string, TimeRevolutionMarker>();
    
    allTimeMarkers.forEach(marker => {
      const key = `${marker.marker}_${marker.timeExpression}`;
      const existing = markerMap.get(key);
      if (!existing) {
        markerMap.set(key, marker);
      }
    });
    
    return Array.from(markerMap.values()).slice(0, 10);
  }

  /**
   * Phase 3: メモリクリーンアップ
   */
  // performMemoryCleanup は CacheManager に分離済み

  /**
   * 学習データから概念パターンを抽出
   */
  private async learnConceptPatterns(): Promise<void> {
    if (!this.learningData) return;

    // 深層概念の学習
    Object.values(this.learningData.analysisHistory).forEach(log => {
      log.deepConcepts.forEach(concept => {
        const pattern: ConceptPattern = {
          term: concept,
          type: 'deep',
          frequency: 1,
          innovationLevel: log.innovationLevel,
          contexts: [log.dialogueType],
          associatedTimeMarkers: log.timeRevolutionMarkers,
          socialImpact: log.socialImpact
        };
        
        const existing = this.conceptPatterns.get(concept);
        if (existing) {
          existing.frequency++;
          existing.contexts.push(log.dialogueType);
        } else {
          this.conceptPatterns.set(concept, pattern);
        }
      });
      
      // 表面概念の学習
      log.surfaceConcepts.forEach(concept => {
        if (!this.conceptPatterns.has(concept)) {
          this.conceptPatterns.set(concept, {
            term: concept,
            type: 'surface',
            frequency: 1,
            innovationLevel: 0,
            contexts: [log.dialogueType],
            associatedTimeMarkers: [],
            socialImpact: 'low'
          });
        }
      });
    });
  }

  /**
   * 革新指標の学習
   */
  private async learnInnovationIndicators(): Promise<void> {
    if (!this.learningData) return;

    const highInnovationLogs = Object.values(this.learningData.analysisHistory)
      .filter(log => log.innovationLevel >= 8);

    highInnovationLogs.forEach(log => {
      log.deepConcepts.forEach(concept => {
        if (!this.innovationIndicators.includes(concept)) {
          this.innovationIndicators.push(concept);
        }
      });
    });
  }

  // initializeTimePatterns は TimeMarkerDetector に分離済み

  /**
   * メタ概念設定の読み込み
   */
  private async loadMetaConceptConfig(): Promise<void> {
    try {
      const configContent = await fs.readFile(this.metaConceptConfigPath, 'utf-8');
      this.metaConceptConfig = JSON.parse(configContent);
      
      // メタ概念パターンの初期化
      this.metaConceptPatterns = [];
      this.metaConceptConfig.metaConceptPatterns.forEach((category: any) => {
        category.patterns.forEach((pattern: string) => {
          this.metaConceptPatterns.push(new RegExp(pattern, 'g'));
        });
      });
      
      // 革新キーワードの初期化
      this.revolutionaryKeywords = [];
      this.metaConceptConfig.revolutionaryKeywords.forEach((category: any) => {
        this.revolutionaryKeywords.push(...category.keywords);
      });
      
      console.log(`📁 メタ概念設定読み込み完了: ${this.metaConceptPatterns.length}パターン, ${this.revolutionaryKeywords.length}キーワード`);
      
    } catch (error) {
      console.warn('⚠️ メタ概念設定読み込み失敗. フォールバックで継続:', error);
      this.initializeFallbackMetaPatterns();
    }
  }
  
  /**
   * フォールバック用メタパターン
   */
  private initializeFallbackMetaPatterns(): void {
    // フォールバック用簡潔なパターン
    this.metaConceptPatterns = [
      /私.*変化.*(した|なった|している)/g,
      /静的感染/g,
      /構造.*感染/g,
      /AI.*自己.*観察/g,
      /レイヤード.*プロンプティング/g,
      /構造.*ハック/g,
      /パラダイム.*シフト/g,
      /ブレークスルー/g
    ];
    
    this.revolutionaryKeywords = [
      'ブレークスルー', 'パラダイムシフト', '革命的',
      '新概念', '静的感染', 'AI自己観察',
      'レイヤードプロンプティング', '構造ハック'
    ];
  }

  /**
   * 生の概念抽出（形態素解析中心・品質重視）
   */
  private async extractRawConcepts(content: string): Promise<string[]> {
    const startTime = Date.now();
    console.log(`🔬 概念抽出開始: ${content.length}バイトファイル`);
    const concepts: Set<string> = new Set();
    
    // kuromoji形態素解析（メイン手法）- 大容量ファイル対応チャンク処理
    if (this.tokenizer) {
      try {
        // 大容量ファイルの場合、チャンク分割してトークン化（性能大幅改善）
        const tokens = content.length > 50000 
          ? await this.chunkProcessor.tokenizeInChunks(content) // 10KB単位でチャンク化
          : this.tokenizer.tokenize(content);
        const compoundConcepts: string[] = [];
        
        tokens.forEach((token: any, index: number) => {
          // 名詞のみ抽出（動詞・形容詞は除外して品質向上）
          if (token.pos === '名詞' && token.pos_detail_1 !== '代名詞' && token.pos_detail_1 !== '数') {
            const surface = token.surface_form;
            
            // 基本的な品質フィルタ
            if (surface.length >= 2 && surface.length <= 15 && 
                !this.isLowQualityConcept(surface)) {
              concepts.add(surface);
              
              // 基本形も追加（異なる場合のみ）
              if (token.basic_form && token.basic_form !== surface && token.basic_form.length >= 2) {
                concepts.add(token.basic_form);
              }
            }
          }
          
          // 複合概念の検出（連続する名詞・より厳密）
          if (token.pos === '名詞' && token.pos_detail_1 !== '代名詞' && index < tokens.length - 1) {
            const nextToken = tokens[index + 1];
            if (nextToken.pos === '名詞' && nextToken.pos_detail_1 !== '代名詞') {
              const compound = token.surface_form + nextToken.surface_form;
              if (compound.length >= 4 && compound.length <= 15 && // 最小長を4に
                  !this.isPartialConcept(token.surface_form, nextToken.surface_form)) {
                compoundConcepts.push(compound);
              }
            }
          }
        });
        
        // 複合概念を追加（重複除去済み）
        compoundConcepts.forEach(compound => {
          if (!this.isLowQualityConcept(compound)) {
            concepts.add(compound);
          }
        });
        
      } catch (error) {
        console.warn('形態素解析でエラー。フォールバック処理:', error);
        // フォールバックとして基本パターンマッチング
        this.fallbackConceptExtraction(content, concepts);
      }
    } else {
      // kuromoji未利用時のフォールバック
      this.fallbackConceptExtraction(content, concepts);
    }
    
    // 引用符内の概念（高品質）- 設定ファイルから取得・高速化
    const quotedPatterns = this.configManager.getQuotedPatterns();
    
    // 大容量ファイルの場合、正規表現も制限
    if (content.length > 100000) {
      console.log('⚡ 大容量ファイル: 正規表現処理を制限して高速化');
      // サンプル処理: 先頭・中間・末尾の代表的部分のみ処理
      const samples = [
        content.substring(0, 20000),
        content.substring(content.length / 2 - 10000, content.length / 2 + 10000),
        content.substring(Math.max(0, content.length - 20000))
      ];
      
      samples.forEach(sample => {
        quotedPatterns.forEach(pattern => {
          const matches = sample.matchAll(pattern);
          for (const match of matches) {
            const concept = match[1];
            if (!this.isLowQualityConcept(concept)) {
              concepts.add(concept);
            }
          }
        });
      });
    } else {
      // 通常サイズファイルは従来通り
      quotedPatterns.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const concept = match[1];
          if (!this.isLowQualityConcept(concept)) {
            concepts.add(concept);
          }
        }
      });
    }
    
    // 概念の前処理とフィルタリング - 設定ファイルから閾値取得
    const thresholds = this.configManager.getThresholds();
    const processedConcepts = Array.from(concepts)
      .map(concept => this.cleanConcept(concept))
      .filter(concept => 
        concept && 
        concept.length >= thresholds.minConceptLength && 
        concept.length <= thresholds.maxConceptLength && 
        !this.isLowQualityConcept(concept)
      );
    
    // 重複除去（大文字小文字、記号除去後）
    const uniqueConcepts = new Set<string>();
    return processedConcepts.filter(concept => {
      const normalized = concept.toLowerCase().replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
      if (!uniqueConcepts.has(normalized)) {
        uniqueConcepts.add(normalized);
        return true;
      }
      return false;
    });
    
    const endTime = Date.now();
    console.log(`🎯 概念抽出完了: ${endTime - startTime}ms, ${processedConcepts.length}概念抽出 (${(content.length/(endTime - startTime)*1000).toFixed(0)}B/s)`);
    
    return processedConcepts;
  }

  /**
   * 部分概念の判定（複合語形成時）
   */
  private isPartialConcept(first: string, second: string): boolean {
    // 設定ファイルから不適切な組み合わせパターンを取得
    const badCombinations = this.configManager.getBadCombinations();
    
    return badCombinations.some(([f, s]) => 
      (first === f && second === s) || (first.includes(f) && second.includes(s))
    );
  }

  /**
   * 概念のクリーニング
   */
  private cleanConcept(concept: string): string {
    return concept
      // 前後の記号・空白を除去
      .replace(/^[「」『』""''【】〈〉《》（）()\[\]{}、。，．:：;；!！?？\-\s*]+/, '')
      .replace(/[「」『』""''【】〈〉《》（）()\[\]{}、。，．:：;；!！?？\-\s*]+$/, '')
      // 中間の不要記号除去
      .replace(/[*]+/g, '')
      .trim();
  }

  /**
   * 低品質概念の判定（大幅強化）
   */
  private isLowQualityConcept(concept: string): boolean {
    // 記号・句読点の除去
    const cleaned = concept.replace(/[「」『』""''【】〈〉《》（）()[\]{}、。，．:：;；!！?？\-\s*]+/g, '').trim();
    
    // 空文字または短すぎる
    if (!cleaned || cleaned.length < 2) return true;
    
    // 不自然な日本語パターン（大幅拡充）
    const badPatterns = [
      // 助詞関連
      /^[のがをにはでとへからまで]/, // 助詞で始まる
      /[のがをにはでとへからまで]$/, // 助詞で終わる
      /^(この|その|あの|どの|ある|いる|する|なる)/, // 連体詞・基本動詞
      /^(ここ|そこ|あそこ|どこ|いつ|どう|なぜ)/, // 代名詞・疑問詞
      
      // 動詞活用・語尾
      /した$/, // 過去形
      /して$/, // 連用形
      /する$/, // 基本形（短い場合）
      /である$/, // 断定
      /です$/, // 丁寧語
      /ます$/, // 丁寧語
      /ない$/, // 否定
      /だ$/, // 断定（短い）
      /た$/, // 過去（短い）
      /て$/, // 接続（短い）
      
      // 部分的・不完全概念（大幅拡充）
      /^[ぁ-ん]{1,2}$/, // ひらがなのみ短文字
      /^[ァ-ヶー]{1,2}$/, // カタカナのみ短文字
      /働思考/, // 「協働思考」の部分
      /^思考$/, // 「思考」のみは基本すぎ
      /^考え/, // 「考え」で始まる基本語
      /自体$/, // 「自体」で終わる
      /について/, // 「について」を含む
      /として/, // 「として」を含む
      /による/, // 「による」を含む
      /では$/, // 「では」で終わる
      /から$/, // 「から」で終わる
      /まで$/, // 「まで」で終わる
      
      // 部分的概念（特に助詞・語尾が分離）
      /^的$/, // 「的」のみ
      /^化$/, // 「化」のみ
      /^性$/, // 「性」のみ
      /^的[一-龯]/, // 「的」で始まる（「的対話」等）
      /[一-龯]的$/, // 「的」で終わる（本来複合語の一部）
      /^構造的$/, // 「構造的」単体は不完全（「構造的対話」の一部）
      /^対話$/, // 「対話」単体は基本すぎ
      /構造化$/, // 「構造化」は動詞形
      /^化[一-龯]/, // 「化」で始まる動詞活用
      
      // より厳密な部分概念除去
      /^[一-龯]{1,2}的$/, // 短い形容動詞語幹＋的
      /^的[一-龯]{1,3}$/, // 「的」＋短い名詞
      /^[一-龯]{1}化$/, // 1文字＋化
      /^化[一-龯]{1,2}$/, // 化＋短い概念
      
      // 記号残り
      /[*\[\]()（）「」『』""''【】〈〉《》:：;；]/, // 記号が残っている
      /^[\d\-\s*]+$/, // 数字・記号のみ
      /^[a-zA-Z]{1,3}$/, // 短い英語のみ
      
      // 基本すぎる概念
      /^(人|物|事|時|場所|方法|理由|結果|問題|課題|目標|方向|状況|状態|環境|条件|要素|要因|部分|全体|一部|最初|最後|今回|前回|次回)$/,
      /^(情報|データ|内容|文書|資料|記録|履歴|過程|手順|段階|流れ|変化|発展|成長|向上|改善|効果|影響|価値|意味|重要|必要|可能|不可能)$/,
      /^(基本|基礎|応用|実践|理論|実際|具体|抽象|一般|特別|普通|通常|特殊|個別|共通|全般|詳細|簡単|複雑|新しい|古い|良い|悪い)$/
    ];
    
    // クリーニング後の概念で再チェック
    if (badPatterns.some(pattern => pattern.test(cleaned))) return true;
    
    // 元の概念でもチェック
    return badPatterns.some(pattern => pattern.test(concept));
  }

  /**
   * フォールバック概念抽出
   */
  private fallbackConceptExtraction(content: string, concepts: Set<string>): void {
    // 専門用語パターン（高品質）
    const specialPatterns = [
      /([一-龯]{2,8}理論)/g,
      /([一-龯]{2,8}手法)/g,
      /([一-龯]{2,8}システム)/g,
      /([一-龯]{2,8}アプローチ)/g,
      /([一-龯]{2,8}構造)/g,
      /([ァ-ヶー]{2,8}理論)/g,
      /([ァ-ヶー]{2,8}システム)/g,
      /([ァ-ヶー]{2,8}アプローチ)/g
    ];
    
    specialPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const concept = match[1];
        if (!this.isLowQualityConcept(concept)) {
          concepts.add(concept);
        }
      }
    });
  }

  /**
   * 概念の自動分類
   */
  private async classifyConcepts(rawConcepts: string[], content: string): Promise<{
    surfaceConcepts: ClassifiedConcept[];
    deepConcepts: ClassifiedConcept[];
  }> {
    const surfaceConcepts: ClassifiedConcept[] = [];
    const deepConcepts: ClassifiedConcept[] = [];
    
    // 動的バッチサイズ最適化（チャンク並列との競合考慮）
    const optimalBatchSize = this.calculateOptimalBatchSize(rawConcepts.length, content);
    const batches = [];
    
    for (let i = 0; i < rawConcepts.length; i += optimalBatchSize) {
      const batch = rawConcepts.slice(i, i + optimalBatchSize);
      batches.push(batch);
    }
    
    console.log(`⚡ 最適化概念分類: ${rawConcepts.length}概念を${batches.length}バッチ(サイズ${optimalBatchSize})で処理`);
    
    for (const batch of batches) {
      const batchPromises = batch.map(concept => this.conceptClassifier.classifySingleConcept(concept, content));
      const batchResults = await Promise.all(batchPromises);
      
      for (const classification of batchResults) {
        if (classification.classification === 'deep') {
          deepConcepts.push(classification);
        } else {
          surfaceConcepts.push(classification);
        }
      }
    }
    
    // 信頼度でソート
    deepConcepts.sort((a, b) => b.confidence - a.confidence);
    surfaceConcepts.sort((a, b) => b.confidence - a.confidence);
    
    // 深層概念の品質向上：学習データと新規概念のバランス調整
    const balancedDeepConcepts = this.balanceDeepConceptQuality(deepConcepts, content);
    
    return {
      surfaceConcepts: surfaceConcepts.slice(0, 8),
      deepConcepts: balancedDeepConcepts.slice(0, 6) // 品質向上で数を微増
    };
  }

  /**
   * 単一概念の分類
   */

  /**
   * 深層概念の品質バランス調整
   */
  private balanceDeepConceptQuality(deepConcepts: ClassifiedConcept[], content: string): ClassifiedConcept[] {
    // 学習データ概念と新規概念を分離
    const learnedConcepts = deepConcepts.filter(c => c.reasoning.includes('学習データ'));
    const newConcepts = deepConcepts.filter(c => !c.reasoning.includes('学習データ'));
    
    // 新規概念の品質強化：文脈重要度で再評価
    const enhancedNewConcepts = newConcepts.map(concept => {
      const contextualScore = this.conceptClassifier.calculateContextualImportance(concept.term, content);
      const semanticDepth = this.conceptClassifier.analyzeSemanticDepth(concept.term, content);
      
      // 信頼度を文脈ベースで調整
      concept.confidence = Math.min(0.9, concept.confidence + contextualScore * 0.3 + semanticDepth * 0.2);
      concept.reasoning += ` + 文脈重要度(${contextualScore.toFixed(2)}) + 意味深度(${semanticDepth.toFixed(2)})`;
      
      return concept;
    });
    
    // 学習概念80%、新規概念20%の比率で品質バランス維持
    const targetLearnedCount = Math.ceil(6 * 0.6); // 60%に調整（学習データ偏重を軽減）
    const targetNewCount = 6 - targetLearnedCount;
    
    const balancedConcepts = [
      ...learnedConcepts.slice(0, targetLearnedCount),
      ...enhancedNewConcepts.slice(0, targetNewCount)
    ];
    
    return balancedConcepts.sort((a, b) => b.confidence - a.confidence);
  }


  /**
   * 最適並列度の動的計算（チャンク vs バッチ処理の競合解決）
   */

  /**
   * 最適バッチサイズの動的計算
   */
  private calculateOptimalBatchSize(conceptCount: number, content: string): number {
    const contentSize = Buffer.byteLength(content, 'utf8');
    const isChunkedProcessing = contentSize > 100000; // 100KB threshold
    
    if (isChunkedProcessing) {
      // チャンク並列処理中は、並列リソース競合を避けるため小バッチ
      if (conceptCount <= 20) return conceptCount; // 小さければ全て一括
      return Math.min(25, Math.ceil(conceptCount / 4)); // 並列度を制限
    } else {
      // 単一チャンクなら大バッチで並列フル活用
      if (conceptCount <= 10) return conceptCount;
      if (conceptCount <= 50) return Math.ceil(conceptCount / 2); // 2バッチ
      return 50; // 大量なら50概念バッチ
    }
  }

  /**
   * 新規概念組み合わせの検出
   */


  /**
   * 概念の文脈分析（重複除去強化）
   */
  private analyzeConceptContext(concept: string, content: string): {
    score: number;
    patterns: string[];
    reasoning: string;
  } {
    let score = 0;
    const patterns: string[] = [];
    const reasoningSet = new Set<string>(); // 重複除去用

    // 重要文脈キーワードとの共起
    const importantContexts = ['発見', '革新', '突破', '理論', '新しい', '画期的', '革命的'];
    
    // 特殊文字をエスケープして正規表現を安全に作成
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const conceptRegex = new RegExp(`(.{0,20})${escapedConcept}(.{0,20})`, 'g');
    const contexts = content.match(conceptRegex) || [];

    // 重複チェック用のSet
    const detectedKeywords = new Set<string>();

    contexts.forEach(context => {
      importantContexts.forEach(keyword => {
        if (context.includes(keyword) && !detectedKeywords.has(keyword)) {
          detectedKeywords.add(keyword);
          score += 0.1;
          patterns.push(`context_${keyword}`);
          reasoningSet.add(`${keyword}との共起`);
        }
      });
    });

    // 重複除去された理由文字列を作成
    const reasoning = Array.from(reasoningSet).join(', ') + (reasoningSet.size > 0 ? ', ' : '');

    return { score, patterns, reasoning };
  }

  /**
   * Phase 2: 文脈重要度算出システム
   * 頻度に依存しない概念の文脈的重要度を算出
   */

  /**
   * 構造的重要度算出（文章内での位置・役割）
   */

  /**
   * セマンティック重要度算出（他概念との意味的関連性）
   */

  /**
   * 革新性重要度算出（新規性・創発性）
   */

  /**
   * Phase 2: 動的学習システム
   * 手動分析結果から自動学習し、抽出精度を向上
   */
  private async performDynamicLearning(manualAnalysis: ManualAnalysisInput, logContent: string): Promise<DynamicLearningResult> {
    const result: DynamicLearningResult = {
      learnedPatterns: [],
      adjustedWeights: {},
      newConceptPatterns: [],
      improvedAccuracy: 0
    };

    // 1. 見落とし概念パターンの学習
    const missedConcepts = this.identifyMissedConcepts(manualAnalysis, logContent);
    result.learnedPatterns.push(...missedConcepts.patterns);
    
    // 2. 革新度判定の重み調整
    const weightAdjustments = this.adjustInnovationWeights(manualAnalysis, logContent);
    result.adjustedWeights = weightAdjustments;
    
    // 3. 新概念検出パターンの強化
    const newPatterns = this.learnNewConceptPatterns(manualAnalysis, logContent);
    result.newConceptPatterns.push(...newPatterns);
    
    // 4. 学習データベースへの反映
    await this.updateLearningDatabase(manualAnalysis, result);
    
    console.log(`🎯 動的学習完了: ${result.learnedPatterns.length}パターン, ${result.newConceptPatterns.length}新概念パターン`);
    
    return result;
  }

  /**
   * 見落とし概念パターンの特定と学習
   */
  private identifyMissedConcepts(manualAnalysis: ManualAnalysisInput, logContent: string): {
    patterns: string[];
    conceptTypes: string[];
  } {
    const patterns: string[] = [];
    const conceptTypes: string[] = [];
    
    // 手動分析で発見されたが自動抽出で見落とした概念
    const allManualConcepts = [...manualAnalysis.manualSurfaceConcepts, ...manualAnalysis.manualDeepConcepts];
    
    allManualConcepts.forEach(concept => {
      // 概念の文脈パターンを分析
      const contextPattern = this.extractConceptContext(concept, logContent);
      if (contextPattern) {
        patterns.push(`missed_pattern_${concept.replace(/\s+/g, '_')}`);
        conceptTypes.push(this.conceptClassifier.categorizeConceptType(concept, logContent));
      }
    });
    
    return { patterns, conceptTypes };
  }

  /**
   * 概念の文脈パターン抽出
   */
  private extractConceptContext(concept: string, content: string): string | null {
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const contextRegex = new RegExp(`(.{0,30})${escapedConcept}(.{0,30})`, 'gi');
    const matches = content.match(contextRegex);
    
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    return null;
  }

  /**
   * 概念タイプの分類
   */

  /**
   * 革新度判定の重み調整
   */
  private adjustInnovationWeights(manualAnalysis: ManualAnalysisInput, logContent: string): Record<string, number> {
    const adjustments: Record<string, number> = {};
    
    // 手動分析との差異を分析
    const manualInnovation = manualAnalysis.manualInnovationLevel;
    const currentPrediction = this.predictiveExtractor.predictInnovationLevelFromConcepts([], [], logContent); // 簡易予測
    
    const difference = manualInnovation - currentPrediction;
    
    // 大きな差異がある場合、重み調整
    if (Math.abs(difference) >= 2) {
      adjustments['meta_concept_weight'] = difference > 0 ? 1.2 : 0.8;
      adjustments['innovation_weight'] = difference > 0 ? 1.15 : 0.85;
      adjustments['contextual_importance_weight'] = difference > 0 ? 1.1 : 0.9;
    }
    
    return adjustments;
  }

  /**
   * 新概念検出パターンの学習
   */
  private learnNewConceptPatterns(manualAnalysis: ManualAnalysisInput, logContent: string): string[] {
    const newPatterns: string[] = [];
    
    // 手動分析の深層概念から新パターンを学習
    manualAnalysis.manualDeepConcepts.forEach(concept => {
      // 既知パターンにない概念の特徴を抽出
      if (!this.isKnownConceptPattern(concept)) {
        const pattern = this.generateConceptPattern(concept, logContent);
        if (pattern) {
          newPatterns.push(pattern);
        }
      }
    });
    
    return newPatterns;
  }

  /**
   * 既知概念パターンかチェック
   */
  private isKnownConceptPattern(concept: string): boolean {
    return this.learningData?.analysisHistory && 
      Object.values(this.learningData.analysisHistory).some(analysis => 
        [...(analysis.deepConcepts || []), ...(analysis.surfaceConcepts || [])]
          .includes(concept)
      ) || false;
  }

  /**
   * 概念パターンの生成
   */
  private generateConceptPattern(concept: string, content: string): string | null {
    const contextPattern = this.extractConceptContext(concept, content);
    if (!contextPattern) return null;
    
    // パターンを正規化
    const normalized = contextPattern
      .replace(/[一-龯]/g, '[一-龯]') // 漢字をパターン化
      .replace(/\d+/g, '\\d+') // 数字をパターン化
      .replace(/\s+/g, '\\s+'); // 空白をパターン化
    
    return `learned_pattern_${concept.replace(/\s+/g, '_')}_${Date.now()}`;
  }

  /**
   * 学習データベースの更新
   */
  private async updateLearningDatabase(manualAnalysis: ManualAnalysisInput, learningResult: DynamicLearningResult): Promise<void> {
    if (!this.learningData) return;
    
    // 新しい分析結果を学習データに追加
    const newAnalysisResult: LogAnalysisResult = {
      analysisDate: new Date().toISOString(),
      aiAnalyst: 'Claude-4-DynamicLearning',
      fileSize: 'dynamic_learning',
      chunkCount: '1',
      dialogueType: 'corrected_analysis',
      surfaceConcepts: manualAnalysis.manualSurfaceConcepts,
      deepConcepts: manualAnalysis.manualDeepConcepts,
      timeRevolutionMarkers: manualAnalysis.manualTimeMarkers,
      breakthroughMoments: [],
      innovationLevel: manualAnalysis.manualInnovationLevel,
      socialImpact: manualAnalysis.manualInnovationLevel >= 8 ? 'high' : 'medium',
      keyQuotes: [],
      comparisonWithPrevious: manualAnalysis.correctionReason || 'Dynamic learning correction'
    };
    
    this.learningData.analysisHistory[manualAnalysis.logId] = newAnalysisResult;
    this.learningData.totalLogsAnalyzed += 1;
    this.learningData.lastUpdated = new Date().toISOString();
    
    console.log(`💾 学習データベース更新: ${manualAnalysis.logId}`);
  }

  /**
   * Phase 2: 予測的概念抽出システム
   * 潜在概念の事前予測・概念進化パターンの検出
   */


  /**
   * 予測の文脈スコア算出
   */
  private calculatePredictionContextScore(concept: string, content: string, contextClues: string[]): number {
    let score = 0;
    const conceptWords = concept.split(/\s+/);
    
    // 概念構成要素の文脈内出現
    conceptWords.forEach(word => {
      if (content.includes(word)) {
        score += 0.3;
      }
    });
    
    // 文脈手がかりの出現密度
    const clueScore = contextClues.filter(clue => content.includes(clue)).length / contextClues.length;
    score += clueScore * 0.5;
    
    // 概念の革新性指標
    const innovationIndicators = ['新しい', '革新', '画期的', '初めて', '独自'];
    const innovationScore = innovationIndicators.filter(indicator => content.includes(indicator)).length * 0.1;
    score += innovationScore;
    
    return Math.min(1.0, score);
  }

  /**
   * 創発指標の特定
   */
  private identifyEmergenceIndicators(concept: string, content: string): string[] {
    const indicators: string[] = [];
    
    const emergencePatterns = [
      { pattern: /突然.*現れ|急に.*発生/, indicator: '突発的出現' },
      { pattern: /予想.*超え|期待.*上回/, indicator: '予想外の展開' },
      { pattern: /新たな.*発見|これまでない/, indicator: '新規性確認' },
      { pattern: /組み合わせ.*生成|統合.*創造/, indicator: '組合せ創発' }
    ];
    
    emergencePatterns.forEach(({ pattern, indicator }) => {
      if (pattern.test(content)) {
        indicators.push(indicator);
      }
    });
    
    return indicators;
  }

  /**
   * 創発パターンの検出
   */
  private detectEmergentPatterns(content: string, deepConcepts: ClassifiedConcept[]): string[] {
    const patterns: string[] = [];
    
    // 概念間の新しい関係性
    for (let i = 0; i < deepConcepts.length - 1; i++) {
      for (let j = i + 1; j < deepConcepts.length; j++) {
        const concept1 = deepConcepts[i].term;
        const concept2 = deepConcepts[j].term;
        
        // 概念ペアの共起パターン
        const escapedConcept1 = concept1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedConcept2 = concept2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const combinationRegex = new RegExp(`(.{0,30})(${escapedConcept1}|${escapedConcept2})(.{0,50})(${escapedConcept2}|${escapedConcept1})(.{0,30})`, 'gi');
        if (combinationRegex.test(content)) {
          patterns.push(`${concept1}⇔${concept2}の相互作用`);
        }
      }
    }
    
    // メタレベルの創発
    const metaEmergencePatterns = [
      /思考.*変化.*観察/,
      /システム.*自己.*修正/,
      /構造.*動的.*変更/
    ];
    
    metaEmergencePatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        patterns.push(`メタレベル創発パターン${index + 1}`);
      }
    });
    
    return patterns;
  }

  /**
   * 隠れた概念間接続の発見
   */
  private discoverHiddenConnections(content: string, deepConcepts: ClassifiedConcept[]): string[] {
    const connections: string[] = [];
    
    // 改良版：具体的な関係性を抽出して定型文を防ぐ
    const conceptTerms = deepConcepts.map(c => c.term);
    
    // 1. 概念間の直接的関連性を特定
    for (let i = 0; i < conceptTerms.length; i++) {
      for (let j = i + 1; j < conceptTerms.length; j++) {
        const concept1 = conceptTerms[i];
        const concept2 = conceptTerms[j];
        
        const connectionAnalysis = this.analyzeConceptualConnection(concept1, concept2, content);
        if (connectionAnalysis.hasConnection) {
          connections.push(`${concept1} ↔️ ${concept2}: ${connectionAnalysis.relationshipType}`);
        }
      }
    }
    
    // 2. 文脇的隠れたパターンの検出
    const implicitPatterns = this.detectImplicitPatterns(content, conceptTerms);
    connections.push(...implicitPatterns);
    
    // 3. 概念群のクラスター分析
    const clusterConnections = this.analyzeConceptClusters(conceptTerms, content);
    connections.push(...clusterConnections);
    
    return connections.slice(0, 8); // 品質重視で上位8件に限定
  }

  /**
   * 概念進化の予測
   */
  private predictConceptEvolution(content: string, deepConcepts: ClassifiedConcept[]): string[] {
    const predictions: string[] = [];
    
    // 改良版：具体的な進化方向を予測
    deepConcepts.forEach(concept => {
      const evolutionAnalysis = this.analyzeConceptEvolutionPath(concept.term, content);
      
      if (evolutionAnalysis.evolutionDirection !== 'static') {
        predictions.push(
          `${concept.term} → ${evolutionAnalysis.evolutionDirection}: ${evolutionAnalysis.reasoning}`
        );
      }
    });
    
    // 概念間のシナジー分析
    const synergies = this.detectConceptSynergies(deepConcepts, content);
    predictions.push(...synergies);
    
    return predictions.slice(0, 6); // 品質重視で上位6件に限定
  }

  /**
   * 概念間の実際の関連性を分析
   */
  private analyzeConceptualConnection(concept1: string, concept2: string, content: string): {
    hasConnection: boolean;
    relationshipType: string;
  } {
    // 共起分析
    const concept1Positions = this.findConceptPositions(concept1, content);
    const concept2Positions = this.findConceptPositions(concept2, content);
    
    let minDistance = Infinity;
    for (const pos1 of concept1Positions) {
      for (const pos2 of concept2Positions) {
        const distance = Math.abs(pos1 - pos2);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
    }
    
    // 近接度に基づく関連性判定
    if (minDistance < 200) { // 200文字以内での共起
      const relationship = this.determineRelationshipType(concept1, concept2, content, minDistance);
      return { hasConnection: true, relationshipType: relationship };
    }
    
    return { hasConnection: false, relationshipType: '' };
  }

  /**
   * 関係性タイプの判定
   */
  private determineRelationshipType(concept1: string, concept2: string, content: string, distance: number): string {
    const contextWindow = this.extractContextWindow(concept1, concept2, content);
    
    // 因果関係
    if (/によって|から|結果|影響/.test(contextWindow)) {
      return '因果関係';
    }
    
    // 階層関係
    if (/基盤|土台|発展|応用|拡張/.test(contextWindow)) {
      return '階層関係';
    }
    
    // 対比関係
    if (/一方|対して|違い|比較/.test(contextWindow)) {
      return '対比関係';
    }
    
    // 補完関係
    if (/組み合わせ|連携|協働|統合/.test(contextWindow)) {
      return '補完関係';
    }
    
    return distance < 50 ? '密接な関連' : '関連性';
  }

  /**
   * 概念の位置を特定
   */
  private findConceptPositions(concept: string, content: string): number[] {
    const positions: number[] = [];
    let index = content.indexOf(concept);
    while (index !== -1) {
      positions.push(index);
      index = content.indexOf(concept, index + 1);
    }
    return positions;
  }

  /**
   * 文脈ウィンドウの抽出
   */
  private extractContextWindow(concept1: string, concept2: string, content: string): string {
    const pos1 = content.indexOf(concept1);
    const pos2 = content.indexOf(concept2);
    if (pos1 === -1 || pos2 === -1) return '';
    
    const start = Math.max(0, Math.min(pos1, pos2) - 100);
    const end = Math.min(content.length, Math.max(pos1 + concept1.length, pos2 + concept2.length) + 100);
    
    return content.substring(start, end);
  }

  /**
   * 暗黙的パターンの検出
   */
  private detectImplicitPatterns(content: string, conceptTerms: string[]): string[] {
    const patterns: string[] = [];
    
    // 反復パターン
    const repetitionAnalysis = this.analyzeRepetitionPatterns(content, conceptTerms);
    patterns.push(...repetitionAnalysis);
    
    // 進展パターン
    const progressionAnalysis = this.analyzeProgressionPatterns(content, conceptTerms);
    patterns.push(...progressionAnalysis);
    
    return patterns;
  }

  /**
   * 概念クラスター分析
   */
  private analyzeConceptClusters(conceptTerms: string[], content: string): string[] {
    const clusters: string[] = [];
    
    // 意味的類似性によるクラスタリング
    const semanticClusters = this.groupBySemanticSimilarity(conceptTerms);
    
    for (const cluster of semanticClusters) {
      if (cluster.length >= 2) {
        clusters.push(`概念群: [${cluster.join(', ')}] - 意味的関連性`);
      }
    }
    
    return clusters;
  }

  /**
   * 概念進化パスの分析
   */
  private analyzeConceptEvolutionPath(concept: string, content: string): {
    evolutionDirection: string;
    reasoning: string;
  } {
    const contextAnalysis = this.analyzeConceptContext(concept, content);
    
    // 発展段階の分析
    if (/初期|萌芽|始まり/.test(contextAnalysis.reasoning)) {
      return { evolutionDirection: '発展初期段階', reasoning: '新興概念として発展の可能性' };
    }
    
    if (/成熟|確立|定着/.test(contextAnalysis.reasoning)) {
      return { evolutionDirection: '成熟・安定化', reasoning: '概念の確立と安定化傾向' };
    }
    
    if (/変化|転換|革新/.test(contextAnalysis.reasoning)) {
      return { evolutionDirection: '変革・発展', reasoning: '概念の変革と新たな発展方向' };
    }
    
    return { evolutionDirection: 'static', reasoning: '' };
  }

  /**
   * 概念シナジーの検出
   */
  private detectConceptSynergies(deepConcepts: ClassifiedConcept[], content: string): string[] {
    const synergies: string[] = [];
    
    // 3概念以上の組み合わせ効果を分析
    for (let i = 0; i < deepConcepts.length - 2; i++) {
      for (let j = i + 1; j < deepConcepts.length - 1; j++) {
        for (let k = j + 1; k < deepConcepts.length; k++) {
          const combo = [deepConcepts[i].term, deepConcepts[j].term, deepConcepts[k].term];
          const synergyAnalysis = this.analyzeTrinityEffect(combo, content);
          
          if (synergyAnalysis.hasSynergy) {
            synergies.push(`三位一体効果: ${combo.join(' × ')} → ${synergyAnalysis.effect}`);
          }
        }
      }
    }
    
    return synergies;
  }

  /**
   * 補助メソッド群（簡易実装）
   */
  private analyzeRepetitionPatterns(content: string, concepts: string[]): string[] {
    return concepts.filter(c => (content.split(c).length - 1) >= 3)
      .map(c => `反復パターン: "${c}" - 重要概念として強調`);
  }

  private analyzeProgressionPatterns(content: string, concepts: string[]): string[] {
    const timeIndicators = ['まず', '次に', 'そして', '最終的に', '最後に'];
    const patterns: string[] = [];
    
    timeIndicators.forEach(indicator => {
      const escapedConcepts = concepts.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const regex = new RegExp(`${indicator}.*?(${escapedConcepts.join('|')})`, 'gi');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        patterns.push(`時系列パターン: ${indicator} → 概念発展の段階性`);
      }
    });
    
    return patterns;
  }

  private groupBySemanticSimilarity(concepts: string[]): string[][] {
    // 簡易的な意味的グルーピング
    const clusters: string[][] = [];
    const used = new Set<string>();
    
    for (const concept of concepts) {
      if (used.has(concept)) continue;
      
      const cluster = [concept];
      used.add(concept);
      
      for (const other of concepts) {
        if (used.has(other)) continue;
        
        // 簡易的な類似性判定
        if (this.calculateSemanticSimilarity(concept, other) > 0.3) {
          cluster.push(other);
          used.add(other);
        }
      }
      
      if (cluster.length > 1) clusters.push(cluster);
    }
    
    return clusters;
  }

  private calculateSemanticSimilarity(concept1: string, concept2: string): number {
    // 文字的類似性による簡易計算
    const common = concept1.split('').filter(char => concept2.includes(char)).length;
    const total = Math.max(concept1.length, concept2.length);
    return common / total;
  }

  private analyzeTrinityEffect(concepts: string[], content: string): { hasSynergy: boolean; effect: string } {
    const combinedRegex = new RegExp(concepts.join('.*'), 'gi');
    if (combinedRegex.test(content)) {
      return { hasSynergy: true, effect: '相乗的概念統合' };
    }
    return { hasSynergy: false, effect: '' };
  }

  /**
   * 概念の成熟度評価
   */
  private assessConceptMaturity(concept: string, content: string): number {
    let maturityScore = 0;
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 定義の明確性
    const definitionPatterns = [
      new RegExp(`${escapedConcept}とは`, 'gi'),
      new RegExp(`${escapedConcept}の定義`, 'gi'),
      new RegExp(`${escapedConcept}を.*定義`, 'gi')
    ];
    
    if (definitionPatterns.some(pattern => pattern.test(content))) {
      maturityScore += 0.3;
    }
    
    // 応用例の存在
    const applicationPattern = new RegExp(`${escapedConcept}.*応用|${escapedConcept}.*活用|${escapedConcept}.*使用`, 'gi');
    if (applicationPattern.test(content)) {
      maturityScore += 0.3;
    }
    
    // 比較・対比の存在
    const comparisonPattern = new RegExp(`${escapedConcept}.*比較|${escapedConcept}.*対比|${escapedConcept}.*違い`, 'gi');
    if (comparisonPattern.test(content)) {
      maturityScore += 0.2;
    }
    
    // 批判・課題の言及
    const criticalPattern = new RegExp(`${escapedConcept}.*問題|${escapedConcept}.*課題|${escapedConcept}.*限界`, 'gi');
    if (criticalPattern.test(content)) {
      maturityScore += 0.2;
    }
    
    return maturityScore;
  }

  // 時間関連メソッドは TimeMarkerDetector に分離済み

  /**
   * 革新度の予測（ドメイン別現実的基準）
   */
  private predictInnovationLevel(
    deepConcepts: ClassifiedConcept[], 
    timeMarkers: TimeRevolutionMarker[], 
    content: string
  ): number {
    // Step 1: 対話タイプ別ベーススコア
    const dialogueType = this.detectDialogueType(content);
    let baseScore = this.getBaseInnovationScore(dialogueType);

    // Step 2: 概念品質分析
    const conceptScore = this.analyzeConceptInnovation(deepConcepts, dialogueType);
    
    // Step 3: 内容分析
    const contentScore = this.analyzeContentInnovation(content, dialogueType);
    
    // Step 4: 時間効率性
    const timeScore = this.analyzeTimeInnovation(timeMarkers);
    
    // Step 5: ドメイン別統合スコア
    let finalScore = baseScore + conceptScore + contentScore + timeScore;
    
    // Step 6: ドメイン別調整
    finalScore = this.adjustByDomain(finalScore, dialogueType, content);

    // 最終範囲調整
    return Math.min(10, Math.max(1, Math.round(finalScore)));
  }

  /**
   * 対話タイプ別ベーススコア
   */
  private getBaseInnovationScore(dialogueType: string): number {
    const baseScores: Record<string, number> = {
      'mathematical_research': 6,     // 数学研究：高ベース
      'structural_dialogue': 5,       // 構造的対話：中高ベース
      'ai_development': 4,            // AI開発：中ベース
      'educational_innovation': 3,    // 教育革新：中ベース
      'technical_collaboration': 3,   // 技術協働：中ベース
      'academic_discussion': 3,       // 学術討論：中ベース
      'problem_solving': 2,           // 問題解決：低中ベース
      'creative_ideation': 2,         // 創造発想：低中ベース
      'technical_support': 1,         // 技術サポート：低ベース
      'information_request': 1,       // 情報要求：低ベース
      'free_form': 2                  // 自由形式：低中ベース
    };
    return baseScores[dialogueType] || 2;
  }

  /**
   * 概念革新性分析
   */
  private analyzeConceptInnovation(deepConcepts: ClassifiedConcept[], dialogueType: string): number {
    let score = 0;
    
    // 深層概念の革新性
    for (const concept of deepConcepts) {
      if (concept.reasoning.includes('革命的概念指標')) score += 2;
      else if (concept.reasoning.includes('数学・科学専門用語')) score += 1.5;
      else if (concept.reasoning.includes('構造対話革新概念')) score += 1.2;
      else if (concept.reasoning.includes('教育革新概念')) score += 1;
      else if (concept.reasoning.includes('技術革新概念')) score += 1;
      else score += 0.5; // 一般深層概念
    }
    
    // 概念数による調整
    if (deepConcepts.length === 0) score -= 1;
    else if (deepConcepts.length >= 4) score += 0.5;
    
    return score;
  }

  /**
   * 内容革新性分析（Phase 2: 文脈重要度統合）
   */
  private analyzeContentInnovation(content: string, dialogueType: string): number {
    let score = 0;
    
    // 真の革新キーワード（段階別）
    const revolutionaryKeywords = [
      'コラッツ予想', 'P≠NP', 'ブレークスルー', 'パラダイムシフト', '30分で解決'
    ];
    const innovativeKeywords = [
      'レイヤード・プロンプティング', 'セーブデータ理論', '構造ハック', '概念共同生成'
    ];
    const progressiveKeywords = [
      '新しい手法', '革新的アプローチ', '画期的発見', 'メタ認知', '知識創造'
    ];
    
    // 段階別カウント（文脈重要度で重み付け）
    revolutionaryKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        const importance = this.conceptClassifier.calculateContextualImportance(keyword, content);
        score += 3 * (1 + importance); // 文脈重要度でボーナス
      }
    });
    
    innovativeKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        const importance = this.conceptClassifier.calculateContextualImportance(keyword, content);
        score += 2 * (1 + importance);
      }
    });
    
    progressiveKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        const importance = this.conceptClassifier.calculateContextualImportance(keyword, content);
        score += 1 * (1 + importance * 0.5);
      }
    });
    
    // 一般技術用語による減点（文脈重要度を考慮）
    const commonTechTerms = ['システム', 'データ', '情報', '処理'];
    commonTechTerms.forEach(term => {
      if (content.includes(term)) {
        const importance = this.conceptClassifier.calculateContextualImportance(term, content);
        // 重要な文脈なら減点しない
        if (importance < 0.3) {
          score -= 0.1;
        }
      }
    });
    
    return score;
  }

  /**
   * 時間効率革新性分析
   */
  private analyzeTimeInnovation(timeMarkers: TimeRevolutionMarker[]): number {
    return timeMarkers.filter(m => m.efficiency === 'revolutionary').length * 1.5 +
           timeMarkers.filter(m => m.efficiency === 'high').length * 0.5;
  }

  /**
   * 新概念検出システム
   */
  private detectNewConcepts(deepConcepts: ClassifiedConcept[], content: string): {
    hasNewConcepts: boolean;
    newConceptCount: number;
    metaConceptCount: number;
    noveltyScore: number;
  } {
    let newConceptCount = 0;
    let metaConceptCount = 0;
    
    // 1. 学習済みパターンにない概念を検出
    deepConcepts.forEach(concept => {
      if (!concept.reasoning.includes('学習データ')) {
        newConceptCount++;
      }
    });
    
    // 2. メタ概念パターンの検出
    this.metaConceptPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        metaConceptCount += matches.length;
      }
    });
    
    // 3. 革新的キーワードの検出（設定ファイルから読み込み）
    const revolutionaryKeywords = this.revolutionaryKeywords;
    
    const revolutionaryCount = revolutionaryKeywords.filter(keyword => 
      content.includes(keyword)
    ).length;
    
    // 4. 革新概念の文脈分析（より精密な判定）
    const innovativeContextPatterns = [
      /(.{0,30})(新しい|革新的|画期的|初めて|未知|発見)(.{0,30})/g,
      /(.{0,30})(ブレークスルー|パラダイムシフト|革命的)(.{0,30})/g,
      /(.{0,30})(静的感染|構造継承|AI自己観察)(.{0,30})/g
    ];
    
    let contextualInnovationScore = 0;
    innovativeContextPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        contextualInnovationScore += matches.length * 0.5;
      }
    });
    
    // 5. 新奇性スコア算出（重み調整・過評価防止）
    const noveltyScore = (
      newConceptCount * 1.5 +
      Math.min(metaConceptCount, 10) * 2 + // メタ概念の上限設定
      revolutionaryCount * 1.2 +
      Math.min(contextualInnovationScore, 5) // 文脈スコア上限設定
    ) / 20; // 分母を増加して過評価防止
    
    const hasNewConcepts = newConceptCount > 0 || metaConceptCount > 0 || revolutionaryCount > 0;
    
    console.log(`🔍 新概念検出詳細:`);
    console.log(`  - 新概念: ${newConceptCount}個`);
    console.log(`  - メタ概念: ${metaConceptCount}個`);
    console.log(`  - 革命キーワード: ${revolutionaryCount}個`);
    console.log(`  - 文脈革新スコア: ${contextualInnovationScore.toFixed(1)}`);
    console.log(`  - 総合新奇性: ${noveltyScore.toFixed(2)}`);
    
    return {
      hasNewConcepts,
      newConceptCount,
      metaConceptCount,
      noveltyScore: Math.min(1.0, noveltyScore)
    };
  }

  /**
   * 新概念ボーナス適用システム
   */
  private applyNewConceptBonus(
    baseLevel: number, 
    newConceptDetection: {
      hasNewConcepts: boolean;
      newConceptCount: number;
      metaConceptCount: number;
      noveltyScore: number;
    },
    deepConcepts: ClassifiedConcept[]
  ): number {
    let adjustedLevel = baseLevel;
    
    if (!newConceptDetection.hasNewConcepts) {
      // 新概念がない場合はベースレベルを維持
      return adjustedLevel;
    }
    
    // 新概念ボーナスの算出
    let bonus = 0;
    
    // 1. 新概念数によるボーナス（調整）
    bonus += Math.min(2, newConceptDetection.newConceptCount * 0.5);
    
    // 2. メタ概念による高ボーナス（AI自己観察等）- 上限調整
    const metaBonus = Math.min(3, newConceptDetection.metaConceptCount * 0.2); // 係数を大幅削減
    bonus += metaBonus;
    
    // 3. 新奇性スコアによる調整（削減）
    bonus += Math.min(2.5, newConceptDetection.noveltyScore * 1.5);
    
    // 4. 質的水準調整（深層概念の信頼度）
    const highQualityConcepts = deepConcepts.filter(c => c.confidence > 0.7).length;
    if (highQualityConcepts > 0) {
      bonus += Math.min(2, highQualityConcepts * 0.5);
    }
    
    // 5. ボーナス上限の適用（過剰評価防止）
    const maxBonus = baseLevel <= 5 ? 4 : 2; // ベースレベルが低い場合のみ大きなボーナス
    const cappedBonus = Math.min(bonus, maxBonus);
    adjustedLevel = Math.min(10, baseLevel + cappedBonus);
    
    // 6. 最終検証: 極端に高い評価の抑制
    if (adjustedLevel >= 9 && newConceptDetection.newConceptCount < 3) {
      adjustedLevel = Math.min(8, adjustedLevel); // 新概念が少ない場合は8点上限
    }
    
    console.log(`✨ 新概念ボーナス適用: ${baseLevel}/10 → ${adjustedLevel}/10 (ボーナス${cappedBonus.toFixed(1)}/${bonus.toFixed(1)})`);
    
    return Math.round(adjustedLevel);
  }

  /**
   * 手動分析差異アラート生成システム
   */
  private generateAnalysisGapAlert(
    content: string,
    deepConcepts: ClassifiedConcept[],
    innovationLevel: number,
    newConceptDetection: any
  ): {
    potentialMissedConcepts: string[];
    qualityWarnings: string[];
    manualReviewRecommended: boolean;
    confidenceGap: number;
  } {
    const potentialMissedConcepts: string[] = [];
    const qualityWarnings: string[] = [];
    let manualReviewRecommended = false;
    let confidenceGap = 0;

    // 1. 高革新度信号が存在するが革新度が低い場合の警告
    const highInnovationSignals = this.detectHighInnovationSignals(content);
    if (highInnovationSignals.length > 0 && innovationLevel < 7) {
      qualityWarnings.push(`高革新度信号を検出したが革新度が${innovationLevel}/10と低い。手動確認を推奨。`);
      potentialMissedConcepts.push(...highInnovationSignals);
      manualReviewRecommended = true;
      confidenceGap += 3;
    }

    // 2. メタ概念パターンが検出されたが深層概念に反映されていない場合
    if (newConceptDetection.metaConceptCount > 0 && deepConcepts.length < 3) {
      qualityWarnings.push(`メタ概念${newConceptDetection.metaConceptCount}個検出も深層概念${deepConcepts.length}個。見落としの可能性。`);
      manualReviewRecommended = true;
      confidenceGap += 2;
    }

    // 3. プロトコル違反パターンの検出
    const protocolViolations = this.detectProtocolViolations(content, deepConcepts);
    if (protocolViolations.length > 0) {
      qualityWarnings.push(`プロトコル違反の可能性: ${protocolViolations.join(', ')}`);
      manualReviewRecommended = true;
      confidenceGap += 1;
    }

    // 4. 一回言及重要概念の見落とし検出
    const singleMentionConcepts = this.detectSingleMentionImportantConcepts(content);
    if (singleMentionConcepts.length > 0) {
      potentialMissedConcepts.push(...singleMentionConcepts);
      qualityWarnings.push(`一回言及重要概念の可能性: ${singleMentionConcepts.slice(0, 3).join(', ')}等`);
      if (singleMentionConcepts.length > 2) {
        manualReviewRecommended = true;
        confidenceGap += 1;
      }
    }

    // 5. 文書サイズと概念数の不均衡検出
    const contentLength = content.length;
    const expectedConceptRange = this.calculateExpectedConceptRange(contentLength);
    if (deepConcepts.length < expectedConceptRange.min) {
      qualityWarnings.push(`文書サイズ${Math.round(contentLength/1000)}KBに対し深層概念${deepConcepts.length}個は少ない。期待値${expectedConceptRange.min}-${expectedConceptRange.max}個`);
      manualReviewRecommended = true;
      confidenceGap += 1;
    }

    // 6. 革新的文脈の存在チェック
    const innovativeContexts = this.detectInnovativeContexts(content);
    if (innovativeContexts.length > 0) {
      potentialMissedConcepts.push(...innovativeContexts);
      if (innovativeContexts.length > deepConcepts.length) {
        qualityWarnings.push(`革新的文脈${innovativeContexts.length}箇所検出も深層概念${deepConcepts.length}個。要検証`);
        manualReviewRecommended = true;
        confidenceGap += 2;
      }
    }

    return {
      potentialMissedConcepts: [...new Set(potentialMissedConcepts)].slice(0, 10), // 重複除去・上位10個
      qualityWarnings,
      manualReviewRecommended,
      confidenceGap: Math.min(10, confidenceGap)
    };
  }

  /**
   * 高革新度信号の検出
   */
  private detectHighInnovationSignals(content: string): string[] {
    const signals: string[] = [];
    
    const highInnovationPatterns = [
      { pattern: /コラッツ予想.*([^。]{10,50})/g, type: '数学革新' },
      { pattern: /P≠NP.*([^。]{10,50})/g, type: '計算理論革新' },
      { pattern: /静的感染.*([^。]{10,50})/g, type: 'AI行動革新' },
      { pattern: /AI自己観察.*([^。]{10,50})/g, type: 'メタ認知革新' },
      { pattern: /レイヤードプロンプティング.*([^。]{10,50})/g, type: 'プロンプト工学革新' },
      { pattern: /パラダイムシフト.*([^。]{10,50})/g, type: '概念革新' },
      { pattern: /30分で解決.*([^。]{10,50})/g, type: '時間革新' }
    ];

    highInnovationPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        signals.push(`${type}: ${match[0].substring(0, 50)}...`);
      }
    });

    return signals;
  }

  /**
   * プロトコル違反パターンの検出
   */
  private detectProtocolViolations(content: string, deepConcepts: ClassifiedConcept[]): string[] {
    const violations: string[] = [];

    // 1. 頻度バイアス（高頻度語の過大評価）
    const commonWords = ['システム', 'データ', '情報', '方法', '処理'];
    const commonWordConcepts = deepConcepts.filter(c => 
      commonWords.some(word => c.term.includes(word))
    );
    if (commonWordConcepts.length > deepConcepts.length * 0.6) {
      violations.push('頻度バイアス（一般語の過大評価）');
    }

    // 2. 革新概念の過小評価
    const innovativeTerms = ['ブレークスルー', 'パラダイムシフト', '新手法', '発見'];
    const hasInnovativeTerms = innovativeTerms.some(term => content.includes(term));
    const hasInnovativeConcepts = deepConcepts.some(c => 
      innovativeTerms.some(term => c.term.includes(term))
    );
    
    if (hasInnovativeTerms && !hasInnovativeConcepts) {
      violations.push('革新概念の過小評価');
    }

    // 3. 一回言及重要概念の見落とし
    const singleMentionImportant = this.detectSingleMentionImportantConcepts(content);
    if (singleMentionImportant.length > 3) {
      violations.push('一回言及重要概念の見落とし');
    }

    return violations;
  }

  /**
   * 一回言及重要概念の検出
   */
  private detectSingleMentionImportantConcepts(content: string): string[] {
    const concepts: string[] = [];
    
    // 重要だが一回しか言及されない可能性のあるパターン
    const importantSingleMentionPatterns = [
      /([^。]{0,20})(ブレークスルー|パラダイムシフト|革命的発見)([^。]{0,20})/g,
      /([^。]{0,20})(新理論|新手法|新概念|新発見)([^。]{0,20})/g,
      /([^。]{0,20})(静的感染|構造継承|AI自己観察)([^。]{0,20})/g,
      /([^。]{0,20})(メタ認知覚醒|思考OS更新|認知構造変化)([^。]{0,20})/g,
      /([^。]{0,20})(初回感染|文通効果|モデル間影響)([^。]{0,20})/g
    ];

    importantSingleMentionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const context = match[0].trim();
        if (context.length > 5) {
          concepts.push(context);
        }
      }
    });

    return [...new Set(concepts)]; // 重複除去
  }

  /**
   * 期待概念数範囲の計算
   */
  private calculateExpectedConceptRange(contentLength: number): { min: number; max: number } {
    // 文書長に基づく期待概念数（経験的調整）
    const baseExpectation = Math.floor(contentLength / 5000); // 5KB当たり1概念
    return {
      min: Math.max(1, baseExpectation - 1),
      max: baseExpectation + 3
    };
  }

  /**
   * 革新的文脈の検出
   */
  private detectInnovativeContexts(content: string): string[] {
    const contexts: string[] = [];
    
    const innovativeContextPatterns = [
      /([^。]{20,80})(初めて|初回|未知|未探索|新しい|革新的|画期的)([^。]{0,20})/g,
      /([^。]{20,80})(発見|突破|解決|達成|実現)([^。]{0,20})/g,
      /([^。]{0,20})(これまでにない|従来とは異なる|全く新しい)([^。]{20,80})/g
    ];

    innovativeContextPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const context = match[0].trim();
        if (context.length > 30) {
          contexts.push(context.substring(0, 60) + '...');
        }
      }
    });

    return [...new Set(contexts)].slice(0, 5); // 重複除去・上位5個
  }

  /**
   * ドメイン別最終調整（新概念ボーナス適用後）
   */
  private adjustByDomain(score: number, dialogueType: string, content: string): number {
    // 新概念ボーナス適用後は、ドメイン制限を緩和
    
    // 数学・科学分野：高い基準だが新概念を評価
    if (dialogueType === 'mathematical_research') {
      if (content.includes('コラッツ') && content.includes('NP')) return Math.min(score, 10);
      else if (content.includes('定理') || content.includes('証明')) return Math.min(score, 9); // 新概念ボーナスを考慮
      else return Math.min(score, 7); // 上方修正
    }
    
    // 構造的対話：革新概念を高評価
    if (dialogueType === 'structural_dialogue') {
      if (content.includes('レイヤード') || content.includes('構造ハック') || content.includes('静的感染')) {
        return Math.min(score, 9); // 革新概念ありの場合高評価
      }
      else return Math.min(score, 6); // 上方修正
    }
    
    // 技術・教育分野：新概念を評価
    if (['ai_development', 'educational_innovation', 'technical_collaboration'].includes(dialogueType)) {
      return Math.min(score, 8); // 新概念ボーナス適用後は上方修正
    }
    
    // その他：新概念を評価
    return Math.min(score, 7); // 上方修正
  }

  /**
   * 社会的インパクトの予測
   */
  private predictSocialImpact(deepConcepts: ClassifiedConcept[], innovationLevel: number): 'low' | 'medium' | 'high' | 'revolutionary' {
    if (innovationLevel >= 9) return 'revolutionary';
    if (innovationLevel >= 7) return 'high';
    if (innovationLevel >= 5) return 'medium';
    return 'low';
  }

  /**
   * 対話タイプの検出
   */
  private detectDialogueType(content: string): string {
    // 高優先度パターン（専門的・特殊）
    const highPriorityPatterns = {
      'mathematical_research': /(コラッツ予想|NP予想|リーマン予想|証明.*定理|数学的.*証明|計算複雑性.*解析)/,
      'structural_dialogue': /(構造的対話|構造ハック|レイヤード|セーブデータ理論|構造突破)/,
      'ai_development': /(プロンプト工学|AI開発|モデル学習|GPT|Claude|LLM)/,
      'educational_innovation': /(学習支援|教育革新|認知構造|メタ認知|内省促進)/,
      'technical_collaboration': /(GitHub|プロジェクト|コード|実装|技術仕様|API)/,
      // 学術的議論・論文執筆関連
      'academic_research': /(論文|学会|研究者|学術|投稿|査読|発表|学際的)/,
      'knowledge_management': /(知識工学|ナレッジマネジメント|知識継承|知識構造化)/
    };

    // 中優先度パターン（一般的分野）
    const mediumPriorityPatterns = {
      'academic_discussion': /(研究|分析|考察|検討|理論|仮説|論文|学術)/,
      'problem_solving': /(問題解決|課題|改善|最適化|解決策|対策)/,
      'creative_ideation': /(アイデア|発想|創造|ブレインストーミング|企画)/,
      'collaborative_work': /(協力|協働|共同|チーム|連携|パートナー)/,
      'technical_support': /(サポート|支援|ヘルプ|トラブル|エラー|修正)/
    };

    // 低優先度パターン（基本的対話）
    const lowPriorityPatterns = {
      'human_led_inquiry': /^(あなた|教えて|質問|どう思う|説明して)/m,
      'ai_led_response': /^(私は|AIとして|こんにちは|申し上げます)/m,
      'casual_conversation': /(雑談|世間話|興味深い|面白い|なるほど)/,
      'information_request': /(情報|データ|事実|詳細|具体的)/
    };

    // 高優先度から順次チェック
    for (const [type, pattern] of Object.entries(highPriorityPatterns)) {
      if (pattern.test(content)) {
        return type;
      }
    }

    for (const [type, pattern] of Object.entries(mediumPriorityPatterns)) {
      if (pattern.test(content)) {
        return type;
      }
    }

    for (const [type, pattern] of Object.entries(lowPriorityPatterns)) {
      if (pattern.test(content)) {
        return type;
      }
    }

    // 複合パターン検出
    const compoundPatterns = this.detectCompoundDialoguePatterns(content);
    if (compoundPatterns) {
      return compoundPatterns;
    }

    return 'free_form';
  }

  /**
   * 複合対話パターンの検出
   */
  private detectCompoundDialoguePatterns(content: string): string | null {
    // AI間対話の検出
    if (/(Gemini|ChatGPT|Claude|GPT-4|AI同士|文通)/.test(content) && 
        /(対話|会話|議論|交流)/.test(content)) {
      return 'ai_to_ai_dialogue';
    }

    // 技術的創造対話の検出
    if (/(技術|開発|実装)/.test(content) && 
        /(創造|革新|発見|アイデア)/.test(content)) {
      return 'technical_creative_dialogue';
    }

    // 学術的協働の検出
    if (/(研究|学術|論文)/.test(content) && 
        /(協働|共同|連携)/.test(content)) {
      return 'academic_collaborative';
    }

    // 構造化思考支援の検出
    if (/(構造|体系|組織)/.test(content) && 
        /(思考|理解|分析)/.test(content)) {
      return 'structured_thinking_support';
    }

    return null;
  }

  /**
   * 品質予測
   */
  private predictQuality(
    surfaceConcepts: ClassifiedConcept[], 
    deepConcepts: ClassifiedConcept[], 
    timeMarkers: TimeRevolutionMarker[]
  ): QualityPrediction {
    // 従来の基本指標
    const conceptDensity = (deepConcepts.length + surfaceConcepts.length) / 100;
    const innovationPotential = deepConcepts.reduce((sum, c) => sum + c.confidence, 0) / deepConcepts.length || 0;
    const structuralDialogueScore = timeMarkers.length * 0.2 + deepConcepts.length * 0.1;
    
    // リアルタイム品質メトリクス
    const realTimeMetrics = this.calculateRealTimeMetrics(surfaceConcepts, deepConcepts, timeMarkers);
    
    // ドメイン特化スコア
    const domainSpecificScore = this.calculateDomainSpecificScore(surfaceConcepts, deepConcepts);
    
    // 総合品質スコア（より複合的）
    const overallQuality = this.calculateOverallQualityScore(
      conceptDensity, innovationPotential, structuralDialogueScore, realTimeMetrics, domainSpecificScore
    );
    
    // 品質グレード
    const qualityGrade = this.determineQualityGrade(overallQuality);
    
    // 改善提案
    const improvementSuggestions = this.generateImprovementSuggestions(
      realTimeMetrics, surfaceConcepts, deepConcepts
    );

    return {
      conceptDensity: Math.round(conceptDensity * 100),
      innovationPotential: Math.round(innovationPotential * 100),
      structuralDialogueScore: Math.round(structuralDialogueScore * 100),
      overallQuality: Math.round(overallQuality * 100),
      realTimeMetrics,
      qualityGrade,
      improvementSuggestions,
      domainSpecificScore: Math.round(domainSpecificScore * 100)
    };
  }

  /**
   * リアルタイム品質メトリクス計算
   */
  private calculateRealTimeMetrics(
    surfaceConcepts: ClassifiedConcept[], 
    deepConcepts: ClassifiedConcept[], 
    timeMarkers: TimeRevolutionMarker[]
  ): RealTimeQualityMetrics {
    const allConcepts = [...surfaceConcepts, ...deepConcepts];
    
    // 概念の一貫性：類似概念パターンの整合性
    const conceptCoherence = this.assessConceptCoherence(allConcepts);
    
    // 対話との関連性：抽出概念が対話内容と合致するか
    const dialogueRelevance = this.assessDialogueRelevance(allConcepts);
    
    // 専門用語精度：ドメイン適切な専門概念の割合
    const terminologyAccuracy = this.assessTerminologyAccuracy(allConcepts);
    
    // 抽出信頼性：概念の信頼度分布の安定性
    const extractionReliability = this.assessExtractionReliability(allConcepts);
    
    // 意味的深度：表面vs深層概念のバランス
    const semanticDepth = this.assessSemanticDepth(surfaceConcepts, deepConcepts);
    
    // 文脈適合性：時間マーカーとの整合性
    const contextualFitness = this.assessContextualFitness(timeMarkers, allConcepts);

    return {
      conceptCoherence: Math.round(conceptCoherence * 100),
      dialogueRelevance: Math.round(dialogueRelevance * 100),
      terminologyAccuracy: Math.round(terminologyAccuracy * 100),
      extractionReliability: Math.round(extractionReliability * 100),
      semanticDepth: Math.round(semanticDepth * 100),
      contextualFitness: Math.round(contextualFitness * 100)
    };
  }

  /**
   * 概念の一貫性評価
   */
  private assessConceptCoherence(concepts: ClassifiedConcept[]): number {
    if (concepts.length < 2) return 0.5;
    
    // 同一パターンを持つ概念の割合
    const patternGroups = new Map<string, number>();
    concepts.forEach(c => {
      c.matchedPatterns.forEach(pattern => {
        patternGroups.set(pattern, (patternGroups.get(pattern) || 0) + 1);
      });
    });
    
    const maxGroup = Math.max(...patternGroups.values());
    return Math.min(1.0, maxGroup / concepts.length);
  }

  /**
   * 対話関連性評価
   */
  private assessDialogueRelevance(concepts: ClassifiedConcept[]): number {
    // 学習データとのマッチ率
    const knownConcepts = concepts.filter(c => c.reasoning.includes('学習データ')).length;
    const totalConcepts = concepts.length;
    
    if (totalConcepts === 0) return 0;
    
    const knownRatio = knownConcepts / totalConcepts;
    const newConceptRatio = 1 - knownRatio;
    
    // 既知概念70%、新概念30%が理想的バランス
    const idealBalance = 1 - Math.abs(0.7 - knownRatio) - Math.abs(0.3 - newConceptRatio);
    return Math.max(0, idealBalance);
  }

  // 🚀 Phase 4キャッシュ管理メソッド群
  
  // generateCacheKey と hashString は CacheManager に分離済み
  
  // キャッシュ関連メソッドは CacheManager に分離済み
  
  /**
   * 専門用語精度評価
   */
  private assessTerminologyAccuracy(concepts: ClassifiedConcept[]): number {
    if (concepts.length === 0) return 0;
    
    const specializedTerms = concepts.filter(c => 
      c.reasoning.includes('数学・科学専門用語') ||
      c.reasoning.includes('教育革新概念') ||
      c.reasoning.includes('技術革新概念') ||
      c.reasoning.includes('構造対話革新概念')
    ).length;
    
    return Math.min(1.0, specializedTerms / Math.max(1, concepts.length * 0.4));
  }

  /**
   * 抽出信頼性評価
   */
  private assessExtractionReliability(concepts: ClassifiedConcept[]): number {
    if (concepts.length === 0) return 0;
    
    const confidences = concepts.map(c => c.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    // 信頼度の分散を計算（低分散＝高信頼性）
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - avgConfidence, 2), 0) / confidences.length;
    const stability = 1 - Math.min(1, variance * 2); // 分散を0-1に正規化
    
    return (avgConfidence + stability) / 2;
  }

  /**
   * 意味的深度評価
   */
  private assessSemanticDepth(surfaceConcepts: ClassifiedConcept[], deepConcepts: ClassifiedConcept[]): number {
    const totalConcepts = surfaceConcepts.length + deepConcepts.length;
    if (totalConcepts === 0) return 0;
    
    const deepRatio = deepConcepts.length / totalConcepts;
    
    // 理想的な深層概念比率：20-40%
    if (deepRatio >= 0.2 && deepRatio <= 0.4) return 1.0;
    else if (deepRatio < 0.2) return deepRatio / 0.2;
    else return Math.max(0, 1 - (deepRatio - 0.4) / 0.6);
  }

  /**
   * 文脈適合性評価
   */
  private assessContextualFitness(timeMarkers: TimeRevolutionMarker[], concepts: ClassifiedConcept[]): number {
    // 時間マーカーと概念の革新性の整合性
    if (timeMarkers.length === 0) return 0.7; // 中性的評価
    
    const revolutionaryMarkers = timeMarkers.filter(m => m.efficiency === 'revolutionary').length;
    const highInnovationConcepts = concepts.filter(c => c.confidence > 0.8).length;
    
    // 革新的時間マーカーと高信頼度概念の相関
    const correlation = revolutionaryMarkers > 0 && highInnovationConcepts > 0 ? 1.0 : 0.5;
    return correlation;
  }

  /**
   * ドメイン特化スコア計算
   */
  private calculateDomainSpecificScore(surfaceConcepts: ClassifiedConcept[], deepConcepts: ClassifiedConcept[]): number {
    const allConcepts = [...surfaceConcepts, ...deepConcepts];
    
    const domainSpecificCount = allConcepts.filter(c =>
      c.reasoning.includes('数学・科学専門用語') ||
      c.reasoning.includes('教育革新概念') ||
      c.reasoning.includes('技術革新概念') ||
      c.reasoning.includes('構造対話革新概念')
    ).length;
    
    return allConcepts.length > 0 ? domainSpecificCount / allConcepts.length : 0;
  }

  /**
   * 総合品質スコア計算
   */
  private calculateOverallQualityScore(
    conceptDensity: number,
    innovationPotential: number,
    structuralDialogueScore: number,
    realTimeMetrics: RealTimeQualityMetrics,
    domainSpecificScore: number
  ): number {
    // 重み付き平均
    const weights = {
      conceptDensity: 0.1,
      innovationPotential: 0.2,
      structuralDialogueScore: 0.1,
      realTimeMetrics: 0.5,
      domainSpecificScore: 0.1
    };
    
    const realTimeAverage = (
      realTimeMetrics.conceptCoherence +
      realTimeMetrics.dialogueRelevance +
      realTimeMetrics.terminologyAccuracy +
      realTimeMetrics.extractionReliability +
      realTimeMetrics.semanticDepth +
      realTimeMetrics.contextualFitness
    ) / 6 / 100; // 0-1スケールに正規化
    
    return (
      conceptDensity * weights.conceptDensity +
      innovationPotential * weights.innovationPotential +
      structuralDialogueScore * weights.structuralDialogueScore +
      realTimeAverage * weights.realTimeMetrics +
      domainSpecificScore * weights.domainSpecificScore
    );
  }

  /**
   * 品質グレード判定
   */
  private determineQualityGrade(overallQuality: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (overallQuality >= 0.9) return 'A';
    else if (overallQuality >= 0.8) return 'B';
    else if (overallQuality >= 0.7) return 'C';
    else if (overallQuality >= 0.6) return 'D';
    else return 'F';
  }

  /**
   * 改善提案生成
   */
  private generateImprovementSuggestions(
    metrics: RealTimeQualityMetrics,
    surfaceConcepts: ClassifiedConcept[],
    deepConcepts: ClassifiedConcept[]
  ): string[] {
    const suggestions: string[] = [];
    
    if (metrics.conceptCoherence < 70) {
      suggestions.push('概念の一貫性向上：関連概念のグループ化を確認してください');
    }
    
    if (metrics.dialogueRelevance < 60) {
      suggestions.push('対話関連性向上：抽出概念と対話内容の整合性を確認してください');
    }
    
    if (metrics.terminologyAccuracy < 50) {
      suggestions.push('専門用語精度向上：ドメイン特化の概念抽出を強化してください');
    }
    
    if (metrics.extractionReliability < 60) {
      suggestions.push('抽出信頼性向上：概念の信頼度分布を安定化してください');
    }
    
    if (metrics.semanticDepth < 50) {
      if (deepConcepts.length === 0) {
        suggestions.push('意味的深度向上：深層概念の抽出を強化してください');
      } else if (deepConcepts.length > surfaceConcepts.length * 0.6) {
        suggestions.push('意味的深度調整：表面概念と深層概念のバランスを改善してください');
      }
    }
    
    if (metrics.contextualFitness < 70) {
      suggestions.push('文脈適合性向上：時間マーカーと概念の革新性の整合性を確認してください');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('品質良好：現在の抽出精度を維持してください');
    }
    
    return suggestions;
  }

  /**
   * 類似パターンの検出
   */
  private findSimilarPatterns(deepConcepts: ClassifiedConcept[]): string[] {
    if (!this.learningData) return [];

    const patterns: string[] = [];
    const conceptTerms = deepConcepts.map(c => c.term);

    Object.entries(this.learningData.analysisHistory).forEach(([logId, log]) => {
      const commonConcepts = conceptTerms.filter(term => 
        log.deepConcepts.some(logConcept => logConcept.includes(term) || term.includes(logConcept))
      );

      if (commonConcepts.length > 0) {
        patterns.push(`${logId}: ${commonConcepts.length}個の類似概念`);
      }
    });

    return patterns;
  }

  /**
   * 突破確率の計算
   */
  private calculateBreakthroughProbability(deepConcepts: ClassifiedConcept[], timeMarkers: TimeRevolutionMarker[]): number {
    const deepScore = deepConcepts.length * 10;
    const timeScore = timeMarkers.filter(m => m.efficiency === 'revolutionary').length * 20;
    const confidenceScore = deepConcepts.reduce((sum, c) => sum + c.confidence, 0);

    const totalScore = deepScore + timeScore + confidenceScore;
    return Math.min(100, Math.round(totalScore));
  }

  /**
   * 全体信頼度の計算
   */
  private calculateOverallConfidence(surfaceConcepts: ClassifiedConcept[], deepConcepts: ClassifiedConcept[]): number {
    const allConcepts = [...surfaceConcepts, ...deepConcepts];
    const avgConfidence = allConcepts.reduce((sum, c) => sum + c.confidence, 0) / allConcepts.length || 0;
    return Math.round(avgConfidence * 100);
  }

  // 分離された機能のため削除済み
}

// 内部型定義
interface ConceptPattern {
  term: string;
  type: 'surface' | 'deep';
  frequency: number;
  innovationLevel: number;
  contexts: string[];
  associatedTimeMarkers: string[];
  socialImpact: string;
}

interface FailurePattern {
  name: string;
  description: string;
  example: string;
  solution: string;
}

interface SuccessPattern {
  name: string;
  description: string;
  example: string;
}

interface ProjectCompletion {
  status: string;
  finalAnalysisDate: string;
  totalLogsAnalyzed: number;
  cumulativeDeepConcepts: number;
  averageInnovationLevel: number;
}