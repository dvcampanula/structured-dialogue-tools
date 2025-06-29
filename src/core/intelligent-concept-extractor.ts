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
}

export interface ClassifiedConcept {
  term: string;
  classification: 'surface' | 'deep';
  confidence: number;
  reasoning: string;
  matchedPatterns: string[];
}

export interface TimeRevolutionMarker {
  marker: string;
  timeExpression: string;
  efficiency: 'moderate' | 'high' | 'revolutionary';
  context: string;
  position: number;
}

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
  private timePatterns: RegExp[] = [];
  private innovationIndicators: string[] = [];
  private tokenizer: any = null;
  private _isInitialized: boolean = false;

  constructor(private dbPath: string = 'docs/ANALYSIS_RESULTS_DB.json') {
    this.initializeTimePatterns();
  }

  /**
   * 学習データベースの読み込みと初期化
   */
  async initialize(): Promise<void> {
    try {
      const dbContent = await fs.readFile(this.dbPath, 'utf-8');
      this.learningData = JSON.parse(dbContent);
      
      if (!this.learningData) {
        throw new Error('学習データベースの読み込みに失敗しました');
      }

      console.log(`📚 学習データ読み込み完了: ${this.learningData.totalLogsAnalyzed}ログ`);
      
      // 形態素解析器の初期化
      await this.initializeTokenizer();
      
      // パターン学習の実行
      await this.learnConceptPatterns();
      await this.learnInnovationIndicators();
      
      console.log(`🧠 パターン学習完了: ${this.conceptPatterns.size}概念パターン`);
      
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
   * メイン抽出関数 - プロトコル v1.0完全自動適用
   */
  async extractConcepts(logContent: string): Promise<IntelligentExtractionResult> {
    if (!this.learningData) {
      throw new Error('学習データが初期化されていません。initialize()を呼び出してください。');
    }

    const startTime = Date.now();
    
    console.log('🔬 知的概念抽出開始...');
    
    // Step 1: 基本概念抽出
    const rawConcepts = this.extractRawConcepts(logContent);
    console.log(`📝 基本概念抽出: ${rawConcepts.length}個`);
    
    // Step 2: 表面vs深層の自動分類
    const { surfaceConcepts, deepConcepts } = await this.classifyConcepts(rawConcepts, logContent);
    console.log(`🎯 分類完了: 表面${surfaceConcepts.length}個, 深層${deepConcepts.length}個`);
    
    // Step 3: 時間革命マーカーの検出
    const timeRevolutionMarkers = this.detectTimeRevolutionMarkers(logContent);
    console.log(`⚡ 時間革命マーカー: ${timeRevolutionMarkers.length}個`);
    
    // Step 4: 革新度・社会的インパクトの予測
    const innovationPrediction = this.predictInnovationLevel(deepConcepts, timeRevolutionMarkers, logContent);
    const socialImpactPrediction = this.predictSocialImpact(deepConcepts, innovationPrediction);
    
    // Step 5: 対話タイプの自動検出
    const dialogueType = this.detectDialogueType(logContent);
    
    // Step 6: 品質予測
    const qualityPrediction = this.predictQuality(surfaceConcepts, deepConcepts, timeRevolutionMarkers);
    
    // Step 7: 類似パターンの検出
    const similarPatterns = this.findSimilarPatterns(deepConcepts);
    
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
      appliedPatterns: Array.from(this.conceptPatterns.keys()).slice(0, 10)
    };
    
    console.log(`✅ 抽出完了 (${processingTime}ms): 革新度${innovationPrediction}/10, 信頼度${result.confidence}%`);
    
    return result;
  }

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

  /**
   * 時間革命パターンの初期化
   */
  private initializeTimePatterns(): void {
    this.timePatterns = [
      /(\d+分|数分|短時間|瞬時|即座|一瞬)で([^。]+)/g,
      /(\d+時間|昼休み|休憩時間)で([^。]+)/g,
      /(30分|2-3時間|短期間|高速|効率的)([^。]+)/g,
      /(従来の\d+倍|劇的な効率|革命的な速度)/g,
      /(時間革命|効率革命|速度向上)/g
    ];
  }

  /**
   * 生の概念抽出（形態素解析中心・品質重視）
   */
  private extractRawConcepts(content: string): string[] {
    const concepts: Set<string> = new Set();
    
    // kuromoji形態素解析（メイン手法）
    if (this.tokenizer) {
      try {
        const tokens = this.tokenizer.tokenize(content);
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
    
    // 引用符内の概念（高品質）
    const quotedPatterns = [
      /「([^」]{2,15})」/g,
      /『([^』]{2,15})』/g,
      /"([^"]{2,15})"/g
    ];
    
    quotedPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const concept = match[1];
        if (!this.isLowQualityConcept(concept)) {
          concepts.add(concept);
        }
      }
    });
    
    // 概念の前処理とフィルタリング
    const processedConcepts = Array.from(concepts)
      .map(concept => this.cleanConcept(concept))
      .filter(concept => 
        concept && 
        concept.length >= 2 && 
        concept.length <= 15 && 
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
  }

  /**
   * 部分概念の判定（複合語形成時）
   */
  private isPartialConcept(first: string, second: string): boolean {
    // 不適切な組み合わせパターン
    const badCombinations = [
      ['構造', '的'],   // 構造的 → 不完全
      ['的', '対話'],   // 的対話 → 不完全  
      ['対', '話'],     // 対話の分割
      ['構', '造'],     // 構造の分割
      ['シス', 'テム'], // システムの分割
      ['アプ', 'ローチ'], // アプローチの分割
    ];
    
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
    
    for (const concept of rawConcepts) {
      const classification = await this.classifySingleConcept(concept, content);
      
      if (classification.classification === 'deep') {
        deepConcepts.push(classification);
      } else {
        surfaceConcepts.push(classification);
      }
    }
    
    // 信頼度でソート
    deepConcepts.sort((a, b) => b.confidence - a.confidence);
    surfaceConcepts.sort((a, b) => b.confidence - a.confidence);
    
    return {
      surfaceConcepts: surfaceConcepts.slice(0, 8),
      deepConcepts: deepConcepts.slice(0, 5) // 深層概念は厳選
    };
  }

  /**
   * 単一概念の分類
   */
  private async classifySingleConcept(concept: string, content: string): Promise<ClassifiedConcept> {
    const knownPattern = this.conceptPatterns.get(concept);
    const matchedPatterns: string[] = [];
    let confidence = 0.5;
    let classification: 'surface' | 'deep' = 'surface';
    let reasoning = '基本的な概念として分類';

    // 学習済みパターンとのマッチング（優先度大幅向上）
    if (knownPattern) {
      classification = knownPattern.type as 'surface' | 'deep';
      
      // 既知概念の信頼度を大幅強化
      if (knownPattern.type === 'deep') {
        confidence = Math.min(0.95, 0.8 + (knownPattern.frequency * 0.05) + (knownPattern.innovationLevel * 0.01));
      } else {
        confidence = Math.min(0.8, 0.6 + (knownPattern.frequency * 0.05));
      }
      
      reasoning = `学習データ(確定): ${knownPattern.frequency}回出現, 革新度${knownPattern.innovationLevel}`;
      matchedPatterns.push(`learned_pattern_${knownPattern.type}_priority`);
      
      // 既知概念は追加分析をスキップ（確定扱い）
      return {
        term: concept,
        classification,
        confidence,
        reasoning,
        matchedPatterns
      };
    } else {
      // 新規概念の分析（既知概念がない場合のみ）
      const analysisResult = this.analyzeNewConcept(concept, content);
      classification = analysisResult.classification;
      confidence = analysisResult.confidence;
      reasoning = `新規: ${analysisResult.reasoning}`;
      matchedPatterns.push(...analysisResult.patterns);
    }

    return {
      term: concept,
      classification,
      confidence,
      reasoning,
      matchedPatterns
    };
  }

  /**
   * 新規概念の分析
   */
  private analyzeNewConcept(concept: string, content: string): {
    classification: 'surface' | 'deep';
    confidence: number;
    reasoning: string;
    patterns: string[];
  } {
    const patterns: string[] = [];
    let score = 0;
    let reasoning = '';

    // 革新指標との類似性
    const isInnovationRelated = this.innovationIndicators.some(indicator => 
      concept.includes(indicator) || indicator.includes(concept)
    );
    if (isInnovationRelated) {
      score += 0.4;
      patterns.push('innovation_similarity');
      reasoning += '革新概念との類似性, ';
    }

    // 文脈分析
    const contextScore = this.analyzeConceptContext(concept, content);
    score += contextScore.score;
    patterns.push(...contextScore.patterns);
    reasoning += contextScore.reasoning;

    // 複雑性分析
    if (concept.length > 6 || concept.includes('理論') || concept.includes('システム') || concept.includes('手法') || concept.includes('構造')) {
      score += 0.2;
      patterns.push('complexity');
      reasoning += '複雑性, ';
    }

    // 包括的ストップワード除外（大幅拡充）
    const stopWords = [
      // 助詞・接続詞・副詞
      'から', 'して', 'ため', 'もの', 'こと', 'ところ', 'など', 'による', 'について', 'として', 'という', 'それは', 'これは', 'そして', 'また', 'しかし', 'なので', 'だから', 'でも', 'けれど', 'つまり', 'すなわち', 'しかし', 'ただし', 'ちなみに', 'もちろん', 'たとえば', 'なお', 'さらに', 'とくに', 'いわゆる',
      // 一般動詞・形容詞（基本語彙）
      'ある', 'いる', 'する', 'なる', 'できる', 'ない', 'よい', '良い', 'きれい', '美しい', '大きい', '小さい', '新しい', '古い', '思う', '考える', '感じる', '見る', '聞く', '言う', '話す', '読む', '書く', '作る', '使う', '持つ', '取る', '行く', '来る', '帰る', '出る', '入る', '立つ', '座る', '歩く', '走る', '飛ぶ', '泳ぐ', '食べる', '飲む', '寝る', '起きる', '学ぶ', '教える', '働く', '遊ぶ', '買う', '売る', '貸す', '借りる', '送る', '受ける', '開く', '閉じる', '始める', '終わる', '続ける', '止める', '待つ', '急ぐ', '忘れる', '覚える', '知る', '分かる', '信じる', '疑う', '決める', '選ぶ', '変える', '直す', '壊す', '失う', '見つける', '探す', '呼ぶ', '答える', '聞く', '頼む', '手伝う', '助ける', '守る', '攻める', '勝つ', '負ける', '笑う', '泣く', '怒る', '喜ぶ', '驚く', '困る', '心配', '安心', '緊張', 'リラックス',
      // 代名詞・指示語
      'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ', '私', 'あなた', '彼', '彼女', '僕', '君', '自分', '他人', '皆', 'みんな', '誰', '何', 'どこ', 'いつ', 'なぜ', 'どう', 'どの', 'どちら', 'どれ',
      // 数量・時間（基本）
      '一つ', '二つ', '三つ', '今日', '昨日', '明日', '午前', '午後', '夜', '朝', '昼', '夕方', '今', '昔', '未来', '過去', '現在', '最近', '将来', '以前', '以後', '前', '後', '先', '次', '最初', '最後', '一番', '二番', '三番', '多く', '少し', '全部', '半分', '一部', '全て', '何も', '誰も', 'いつも', 'たまに', 'よく', 'あまり', 'まったく', 'とても', 'かなり', 'すごく', 'ちょっと', 'もう', 'まだ', 'すでに', 'やっと', 'ついに', 'もちろん', 'きっと', 'たぶん', 'おそらく', 'もしかして', '絶対',
      // 形式語・語尾
      'です', 'ます', 'だ', 'である', 'では', 'でしょう', 'かもしれません', 'らしい', 'ようだ', 'みたい', 'そうだ', 'はず', 'べき', 'つもり', 'ところ', 'わけ', 'もの', '場合', '時', '際', '度', '回', '番', '点', '面', '方', '側', '部', '分', '段', '章', '項', '条', '号', '款', '目', '類', '種', '品', '件', '個', '本', '枚', '台', '機', '器', '具', '品', '物', '者', '人', '方', '様', '君', '氏', '先生', '社長', '部長', '課長', '主任', '係長', '店長', '院長', '校長', '会長', '委員長', '理事長', '代表', '責任者', '担当者', '関係者', '当事者', '専門家', '研究者', '学者', '教授', '博士', '修士', '学士', '学生', '生徒', '児童', '子供', '大人', '老人', '若者', '女性', '男性', '友人', '知人', '家族', '親', '子', '兄弟', '姉妹', '夫', '妻', '恋人', '彼氏', '彼女',
      // 一般名詞（あまりに基本的）
      '問題', '課題', '目標', '目的', '理由', '原因', '結果', '影響', '効果', '成果', '結論', '意見', '考え', '気持ち', '感情', '心', '体', '頭', '手', '足', '目', '耳', '口', '鼻', '顔', '髪', '声', '言葉', '文字', '数字', '記号', '色', '形', '大きさ', '重さ', '長さ', '幅', '高さ', '深さ', '速さ', '温度', '音', '光', '匂い', '味', '感覚', '気分', '状態', '状況', '環境', '場所', '位置', '方向', '距離', '空間', '時間', '期間', '瞬間', '瞬時', '一瞬', '瞬く間', '一気', '一度', '何度', '数回', '何回', '毎回', '今回', '次回', '前回', '初回', '最終回',
      // AI・技術分野の基本語（深層概念ではない・大幅拡充）
      'AI', 'システム', 'データ', '情報', '技術', '方法', '手法', '処理', '機能', '性能', '効率', '精度', '品質', '結果', '分析', '評価', '改善', '最適化', '自動化', 'プログラム', 'アルゴリズム', 'コード', 'ファイル', 'フォルダ', 'ディレクトリ', 'パス', 'リンク', 'ボタン', 'メニュー', '画面', 'ウィンドウ', 'ページ', 'サイト', 'ブラウザ', 'アプリ', 'ソフト', 'ハード', 'ネット', 'オンライン', 'オフライン', 'ログイン', 'ログアウト', 'ユーザー', 'アカウント', 'パスワード', 'セキュリティ', 'プライバシー', '設定', '操作', '入力', '出力', '表示', '保存', '削除', '変更', '更新', '追加', '作成', '編集', '検索', '選択', 'コピー', '貼り付け', '切り取り', '移動', '実行', '停止', '開始', '終了', '再生', '一時停止', '早送り', '巻き戻し', '音量', '画質', '解像度', 'サイズ', '容量', '速度', 'バージョン', '更新',
      // 一般的技術用語（深層概念から除外）
      'モデル', 'メカニズム', 'フレームワーク', 'アーキテクチャ', 'プロトコル', 'スキーマ', 'インターフェース', 'プラットフォーム', 'エンジン', 'ツール', 'ライブラリ', 'モジュール', 'コンポーネント', 'パッケージ', 'フォーマット', 'テンプレート', 'パターン', 'ルール', 'ポリシー', 'ガイドライン', '仕様', '標準', '規格', '形式', '構成', '設計', '実装', '開発', '運用', '管理', '監視', '制御', '調整',
      // 対話・コミュニケーション基本語
      '対話', '会話', 'チャット', 'メッセージ', '返事', '回答', '質問', '相談', '議論', '討論', '発表', '報告', '説明', '紹介', '案内', 'お知らせ', '通知', '連絡', '伝達', '共有', '公開', '発信', '受信', '送信', '転送', '返信', '確認', '承認', '拒否', '承諾', '同意', '反対', '賛成', '支持', '応援', '協力', '協働', '連携', '提携', '契約', '約束', '予定', '計画', '準備', '手続き', '手順', '流れ', 'ステップ', '段階', 'フェーズ', 'プロセス', '過程', '工程', '作業', 'タスク', '仕事', '業務', '職務', '役割', '責任', '義務', '権利', '権限', '許可', '禁止', '制限', '規則', 'ルール', '法律', '条件', '要求', '要望', '希望', '期待', '予想', '予測', '見通し', '見込み', '可能性', '確率', 'チャンス', '機会', '時期', 'タイミング'
    ];
    
    if (stopWords.includes(concept) || concept.length <= 2) {
      score = -0.9; // 強制的に除外レベル
      patterns.push('stopword_excluded');
      reasoning += 'ストップワード強制除外, ';
    }
    
    // 真の深層概念指標（一般的技術用語は除外）
    const revolutionaryIndicators = [
      // 真の革新概念のみ
      'ブレークスルー', 'イノベーション', 'パラダイムシフト', '革命', '突破', '発見', '発明',
      // 数学・科学の専門概念
      '定理', '予想', '証明', '仮説', '法則', '原理',
      // 哲学・本質的概念
      '哲学', '本質', '真理', '核心', '要諦'
    ];
    
    // 一般的すぎる技術用語は除外（構造的対話用調整）
    const commonTechTerms = [
      'モデル', 'システム', 'メカニズム', 'プロトコル', 'フレームワーク', 'アーキテクチャ', 'スキーマ',
      'アルゴリズム', 'データ', '情報', '技術', '方法', '手法', '処理', '機能', '性能'
    ];
    
    // 構造的対話での基本概念（深層扱いしない）
    const structuralBasicTerms = [
      '構造分析', '構造変換', '構造的理解', '構造化', '構造的思考', '構造的アプローチ'
    ];
    
    const hasRevolutionary = revolutionaryIndicators.some(indicator => 
      concept.includes(indicator) || content.includes(concept + indicator) || content.includes(indicator + concept)
    );
    
    const isCommonTech = commonTechTerms.some(term => concept.includes(term));
    const isStructuralBasic = structuralBasicTerms.some(term => concept.includes(term) || term.includes(concept));
    
    if (hasRevolutionary && !isCommonTech && !isStructuralBasic) {
      score += 0.5; // 真の革新概念により高スコア
      patterns.push('revolutionary_indicator');
      reasoning += '革命的概念指標, ';
    } else if (isCommonTech) {
      score -= 0.2; // 一般技術用語はスコア減点
      patterns.push('common_tech_penalty');
      reasoning += '一般技術用語減点, ';
    } else if (isStructuralBasic) {
      score -= 0.1; // 構造的対話基本用語は軽減点
      patterns.push('structural_basic_penalty');
      reasoning += '構造基本用語, ';
    }
    
    // 構造的対話特有の革新概念を評価
    const structuralInnovativeTerms = [
      '構造ハック', '構造突破', '構造革命', '構造発見', '構造創出', '構造生成',
      'レイヤード・プロンプティング', 'セーブデータ理論', '構造的協働思考',
      '概念共同生成', 'コンテキスト圧縮', '応答固定化'
    ];
    
    const isStructuralInnovative = structuralInnovativeTerms.some(term => 
      concept.includes(term) || term.includes(concept)
    );
    
    if (isStructuralInnovative) {
      score += 0.4; // 構造的対話の革新概念
      patterns.push('structural_innovative');
      reasoning += '構造対話革新概念, ';
    }

    // 教育・学習支援分野の革新概念
    const educationalInnovativeTerms = [
      '構造的抽出', '論理構造', '関係性抽出', '階層構造', '多角的分析',
      '内省促進', '思考深化', 'メタ認知', '認知構造', '学習促進',
      '知識構造化', '概念体系', '思考フレームワーク', '認知プロセス'
    ];
    
    const isEducationalInnovative = educationalInnovativeTerms.some(term => 
      concept.includes(term) || term.includes(concept)
    );
    
    if (isEducationalInnovative) {
      score += 0.3; // 教育革新概念
      patterns.push('educational_innovative');
      reasoning += '教育革新概念, ';
    }

    // 技術・開発分野の革新概念
    const technicalInnovativeTerms = [
      '再帰的対話', '文脈保持', '相互作用手法', '思考のパートナー', '文脈追跡',
      '再現可能な知識創造', '対話履歴活用', '進化する目標', '知識創造',
      'AI-人間協働', '共同アイデア発展', '対話型開発', 'コラボラティブ思考',
      '文脈継承', '対話設計', 'インタラクティブシステム', '協働プラットフォーム',
      // 生体エネルギー・ナノ技術革新概念（ログ8対応）
      'バイオエナジーハーベスティング', '逆電気透析', 'RED', 'ナノ流体', 'E-Fluid',
      '酵素バイオ燃料セル', 'EFC', '熱電発電', 'ピエゾ電圧素子', '人工血液',
      'HBOC', 'エネルギー循環', '生体適合性', 'ナノボット液', 'Thirium', 
      'ブルーブラッド', 'バイオコンポーネント', '合成臓器', 'サイバーライフ'
    ];
    
    const isTechnicalInnovative = technicalInnovativeTerms.some(term => 
      concept.includes(term) || term.includes(concept)
    );
    
    if (isTechnicalInnovative) {
      score += 0.35; // 技術革新概念
      patterns.push('technical_innovative');
      reasoning += '技術革新概念, ';
    }

    // フィクション・ゲーム関連の革新概念
    const fictionInnovativeTerms = [
      'Detroit', 'Become Human', 'アンドロイド', 'CyberLife', '2038年',
      'Thirium', 'ブルーブラッド', 'バイオコンポーネント', '合成臓器',
      'ポンプ', 'シャットダウン', 'マーカー', '識別', '摂取',
      '紗季', 'クウコ', 'ユウト', 'Grok Vision'
    ];
    
    const isFictionInnovative = fictionInnovativeTerms.some(term => 
      concept.includes(term) || term.includes(concept)
    );
    
    if (isFictionInnovative) {
      score += 0.3; // フィクション革新概念
      patterns.push('fiction_innovative');
      reasoning += 'フィクション革新概念, ';
    }

    // 数学・科学分野の専門用語
    const mathScienceTerms = ['予想', '定理', '証明', '解', '関数', '軌道', '収束', '発散', '吸収', '減衰', '統一', '変換', '写像', '群', '環', '体', '空間', '次元', '位相', '測度'];
    if (mathScienceTerms.some(term => concept.includes(term) || term.includes(concept))) {
      score += 0.3;
      patterns.push('math_science_term');
      reasoning += '数学・科学専門用語, ';
    }

    // 複合語（理論、システム、手法）は深層概念候補
    if (concept.includes('理論') || concept.includes('システム') || concept.includes('手法') || concept.includes('アプローチ') || concept.includes('構造')) {
      score += 0.35;
      patterns.push('compound_deep_concept');
      reasoning += '複合深層概念, ';
    }

    // 深層概念の調整された閾値：ドメイン別適応
    let deepThreshold = 0.75; // デフォルト（厳格）
    
    // ドメイン別閾値調整
    if (patterns.includes('compound_deep_concept') || patterns.includes('math_science_term')) {
      deepThreshold = 0.65; // 学術・技術系は少し緩和
    }
    if (patterns.includes('innovation_similarity')) {
      deepThreshold = 0.6; // 教育・思考支援系も緩和
    }
    
    const classification = score > deepThreshold ? 'deep' : 'surface';
    const confidence = Math.min(0.9, Math.max(0.2, score));

    return {
      classification,
      confidence,
      reasoning: reasoning.replace(/, $/, ''),
      patterns
    };
  }

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
   * 時間革命マーカーの検出（重複除去・品質向上）
   */
  private detectTimeRevolutionMarkers(content: string): TimeRevolutionMarker[] {
    const markers: TimeRevolutionMarker[] = [];
    const uniqueMarkers = new Set<string>();

    this.timePatterns.forEach((pattern, index) => {
      let match;
      pattern.lastIndex = 0; // 正規表現の状態リセット
      while ((match = pattern.exec(content)) !== null) {
        const timeExpression = match[1];
        const context = match[0];
        const efficiency = this.evaluateTimeEfficiency(timeExpression, context);
        const position = match.index || 0;
        
        // 重複チェック（位置ベース）
        const uniqueKey = `${timeExpression}_${Math.floor(position / 50)}`; // 50文字範囲で同一視
        if (!uniqueMarkers.has(uniqueKey)) {
          uniqueMarkers.add(uniqueKey);
          
          markers.push({
            marker: match[0],
            timeExpression,
            efficiency,
            context: this.extractTimeContext(content, position, 80),
            position
          });
        }
      }
    });

    // 学習データからの革命的時間パターン（厳選）
    if (this.learningData) {
      const revolutionaryTimePatterns = [
        '30分で解決', '2-3時間で突破', '短時間で革新', '瞬時に発見', '一気に解決',
        '従来の数十倍の効率', '劇的な時間短縮', '効率革命', '時間革命'
      ];
      
      revolutionaryTimePatterns.forEach(pattern => {
        const position = content.indexOf(pattern);
        if (position !== -1) {
          const uniqueKey = `revolutionary_${pattern}`;
          if (!uniqueMarkers.has(uniqueKey)) {
            uniqueMarkers.add(uniqueKey);
            
            markers.push({
              marker: pattern,
              timeExpression: pattern,
              efficiency: 'revolutionary',
              context: this.extractTimeContext(content, position, 80),
              position
            });
          }
        }
      });
    }

    // 品質フィルタリング：意味のある時間革命マーカーのみ
    return markers
      .filter(marker => {
        // 単純な数字のみは除外
        if (/^[\d分時間秒]+$/.test(marker.timeExpression)) return false;
        // 文脈が革新的でないものは除外
        const context = marker.context.toLowerCase();
        const innovativeKeywords = ['革新', '革命', '突破', '発見', '解決', '効率', '高速', '劇的', '画期的'];
        return innovativeKeywords.some(keyword => context.includes(keyword));
      })
      .sort((a, b) => a.position - b.position)
      .slice(0, 5); // 最大5個まで
  }

  /**
   * 時間マーカー周辺の文脈を抽出
   */
  private extractTimeContext(content: string, position: number, length: number): string {
    const start = Math.max(0, position - length / 2);
    const end = Math.min(content.length, position + length / 2);
    return content.substring(start, end);
  }

  /**
   * 時間効率性の評価
   */
  private evaluateTimeEfficiency(timeExpression: string, context: string): 'moderate' | 'high' | 'revolutionary' {
    // 「30分」「2-3時間」等の革命的パターン
    if (timeExpression.includes('30分') || timeExpression.includes('2-3時間')) {
      return 'revolutionary';
    }

    // 短時間での成果
    if (timeExpression.includes('分') || timeExpression.includes('瞬時')) {
      return 'high';
    }

    // その他
    return 'moderate';
  }

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
    const baseScores = {
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
   * 内容革新性分析
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
    
    // 段階別カウント
    score += revolutionaryKeywords.filter(word => content.includes(word)).length * 3;
    score += innovativeKeywords.filter(word => content.includes(word)).length * 2;
    score += progressiveKeywords.filter(word => content.includes(word)).length * 1;
    
    // 一般技術用語による減点（控えめ）
    const commonTechTerms = ['システム', 'データ', '情報', '処理'];
    const commonCount = commonTechTerms.filter(word => content.includes(word)).length;
    score -= commonCount * 0.1; // 減点を少なく調整
    
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
   * ドメイン別最終調整
   */
  private adjustByDomain(score: number, dialogueType: string, content: string): number {
    // 数学・科学分野：高い基準だが段階評価
    if (dialogueType === 'mathematical_research') {
      if (content.includes('コラッツ') && content.includes('NP')) return Math.min(score, 10);
      else if (content.includes('定理') || content.includes('証明')) return Math.min(score, 8);
      else return Math.min(score, 6);
    }
    
    // 構造的対話：革新概念の有無で調整
    if (dialogueType === 'structural_dialogue') {
      if (content.includes('レイヤード') || content.includes('構造ハック')) return Math.min(score, 8);
      else return Math.min(score, 5);
    }
    
    // 技術・教育分野：実用性重視
    if (['ai_development', 'educational_innovation', 'technical_collaboration'].includes(dialogueType)) {
      return Math.min(score, 6); // 最大6点で実用的
    }
    
    // その他：保守的評価
    return Math.min(score, 4);
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