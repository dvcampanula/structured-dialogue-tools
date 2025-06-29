#!/usr/bin/env node

/**
 * IntelligentConceptExtractor - 学習データ活用による革命的概念抽出システム
 * 
 * 75概念、1.2MBの学習データベース（ANALYSIS_RESULTS_DB.json）を活用し、
 * プロトコル v1.0の完全自動適用による高精度概念抽出を実現
 */

import * as fs from 'fs/promises';
import * as path from 'path';

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
}

/**
 * 学習データ活用による知的概念抽出システム
 */
export class IntelligentConceptExtractor {
  private learningData: AnalysisResultsDB | null = null;
  private conceptPatterns: Map<string, ConceptPattern> = new Map();
  private timePatterns: RegExp[] = [];
  private innovationIndicators: string[] = [];

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
      
      // パターン学習の実行
      await this.learnConceptPatterns();
      await this.learnInnovationIndicators();
      
      console.log(`🧠 パターン学習完了: ${this.conceptPatterns.size}概念パターン`);
      
    } catch (error) {
      console.error('❌ 初期化エラー:', error);
      throw error;
    }
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
   * 生の概念抽出
   */
  private extractRawConcepts(content: string): string[] {
    const concepts: Set<string> = new Set();
    
    // 単語抽出（カタカナ、漢字、ひらがなの組み合わせ）
    const wordPattern = /[ァ-ヶー]+[A-Za-z]*|[一-龯]+[ァ-ヶー]*|[ぁ-ん]+[一-龯]*/g;
    const words = content.match(wordPattern) || [];
    
    words.forEach(word => {
      if (word.length >= 2 && word.length <= 20) {
        concepts.add(word);
      }
    });
    
    // 複合概念の抽出
    const compositePatterns = [
      /「([^」]+)」/g,
      /『([^』]+)』/g,
      /([一-龯]+理論|[一-龯]+手法|[一-龯]+システム)/g
    ];
    
    compositePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => concepts.add(match.replace(/[「」『』]/g, '')));
      }
    });
    
    return Array.from(concepts);
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
      surfaceConcepts: surfaceConcepts.slice(0, 10),
      deepConcepts: deepConcepts.slice(0, 10)
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

    // 包括的ストップワード除外
    const stopWords = [
      // 助詞・接続詞
      'から', 'して', 'ため', 'もの', 'こと', 'ところ', 'など', 'による', 'について', 'として', 'という', 'それは', 'これは', 'そして', 'また', 'しかし', 'なので', 'だから', 'でも', 'けれど',
      // 一般動詞・形容詞
      'ある', 'いる', 'する', 'なる', 'できる', 'ない', 'よい', '良い', 'きれい', '美しい', '大きい', '小さい', '新しい', '古い',
      // 代名詞・指示語
      'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ', '私', 'あなた', '彼', '彼女',
      // 数量・時間（基本）
      '一つ', '二つ', '三つ', '今日', '昨日', '明日', '午前', '午後', '夜',
      // 形式語
      'です', 'ます', 'だ', 'である', 'では', 'でしょう', 'かもしれません'
    ];
    
    if (stopWords.includes(concept) || concept.length <= 2) {
      score = -0.9; // 強制的に除外レベル
      patterns.push('stopword_excluded');
      reasoning += 'ストップワード強制除外, ';
    }
    
    // 既知深層概念の大幅優遇
    const knownPattern = this.conceptPatterns.get(concept);
    if (knownPattern && knownPattern.type === 'deep') {
      score += 0.4; // 既知深層概念の優遇強化
      patterns.push('known_deep_concept');
      reasoning += '既知深層概念優遇, ';
    }

    const classification = score > 0.6 ? 'deep' : 'surface';
    const confidence = Math.min(0.8, Math.max(0.3, score));

    return {
      classification,
      confidence,
      reasoning: reasoning.replace(/, $/, ''),
      patterns
    };
  }

  /**
   * 概念の文脈分析
   */
  private analyzeConceptContext(concept: string, content: string): {
    score: number;
    patterns: string[];
    reasoning: string;
  } {
    let score = 0;
    const patterns: string[] = [];
    let reasoning = '';

    // 重要文脈キーワードとの共起
    const importantContexts = ['発見', '革新', '突破', '理論', '新しい', '画期的', '革命的'];
    
    // 特殊文字をエスケープして正規表現を安全に作成
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const conceptRegex = new RegExp(`(.{0,20})${escapedConcept}(.{0,20})`, 'g');
    const contexts = content.match(conceptRegex) || [];

    contexts.forEach(context => {
      importantContexts.forEach(keyword => {
        if (context.includes(keyword)) {
          score += 0.1;
          patterns.push(`context_${keyword}`);
          reasoning += `${keyword}との共起, `;
        }
      });
    });

    return { score, patterns, reasoning };
  }

  /**
   * 時間革命マーカーの検出
   */
  private detectTimeRevolutionMarkers(content: string): TimeRevolutionMarker[] {
    const markers: TimeRevolutionMarker[] = [];

    this.timePatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const timeExpression = match[1];
        const context = match[0];
        const efficiency = this.evaluateTimeEfficiency(timeExpression, context);

        markers.push({
          marker: match[0],
          timeExpression,
          efficiency,
          context: context.substring(0, 100),
          position: match.index || 0
        });
      }
    });

    // 学習データからの時間革命パターン
    if (this.learningData) {
      Object.values(this.learningData.analysisHistory).forEach(log => {
        log.timeRevolutionMarkers.forEach(marker => {
          if (content.includes(marker)) {
            markers.push({
              marker,
              timeExpression: marker,
              efficiency: 'revolutionary',
              context: marker,
              position: content.indexOf(marker)
            });
          }
        });
      });
    }

    return markers.sort((a, b) => a.position - b.position);
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
   * 革新度の予測
   */
  private predictInnovationLevel(
    deepConcepts: ClassifiedConcept[], 
    timeMarkers: TimeRevolutionMarker[], 
    content: string
  ): number {
    let score = 5; // ベーススコア

    // 深層概念の品質と数
    const avgDeepConfidence = deepConcepts.reduce((sum, c) => sum + c.confidence, 0) / deepConcepts.length || 0;
    score += deepConcepts.length * 0.3 + avgDeepConfidence * 2;

    // 時間革命マーカー
    const revolutionaryMarkers = timeMarkers.filter(m => m.efficiency === 'revolutionary').length;
    score += revolutionaryMarkers * 1.5;

    // 革新語の存在
    const innovationWords = ['革命', '突破', '革新', '画期的', '発見', '理論'];
    innovationWords.forEach(word => {
      if (content.includes(word)) {
        score += 0.5;
      }
    });

    return Math.min(10, Math.max(1, Math.round(score)));
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
    const patterns = {
      'human_led': /^(あなた|ユーザー|質問|教えて)/m,
      'ai_led': /^(私は|AI として|こんにちは)/m,
      'collaborative': /(一緒に|協力|共同)/,
      'mathematical': /(数学|証明|定理|予想)/,
      'ai_collaboration': /(AI同士|文通|Gemini|ChatGPT)/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        return type;
      }
    }

    return 'free_form';
  }

  /**
   * 品質予測
   */
  private predictQuality(
    surfaceConcepts: ClassifiedConcept[], 
    deepConcepts: ClassifiedConcept[], 
    timeMarkers: TimeRevolutionMarker[]
  ): QualityPrediction {
    const conceptDensity = (deepConcepts.length + surfaceConcepts.length) / 100;
    const innovationPotential = deepConcepts.reduce((sum, c) => sum + c.confidence, 0) / deepConcepts.length || 0;
    const structuralDialogueScore = timeMarkers.length * 0.2 + deepConcepts.length * 0.1;
    
    const overallQuality = (conceptDensity + innovationPotential + structuralDialogueScore) / 3;

    return {
      conceptDensity: Math.round(conceptDensity * 100),
      innovationPotential: Math.round(innovationPotential * 100),
      structuralDialogueScore: Math.round(structuralDialogueScore * 100),
      overallQuality: Math.round(overallQuality * 100)
    };
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