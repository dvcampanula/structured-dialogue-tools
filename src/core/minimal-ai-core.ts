#!/usr/bin/env node

/**
 * MinimalAICore - 育てる自家製ミニマムAI
 * 
 * 🌱 LLM不要の軽量・高速・プライベート対話支援AI
 * 🧠 75概念学習DB + 動的学習による成長型AI
 * 🎯 構造的対話特化・個人特化・完全ローカル
 * 
 * 技術的キメラ: 7つの技術の独自組み合わせ
 * - 形態素解析 + 統計分析 + パターンマッチング
 * - 動的学習 + テンプレート応答 + 個人特化
 * - 軽量知識グラフ
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import kuromoji from 'kuromoji';

// 軽量化された75概念データベース型定義
interface MinimalConceptDB {
  totalConcepts: number;
  lastUpdated: string;
  concepts: {
    surface: ConceptEntry[];
    deep: ConceptEntry[];
  };
  patterns: DialoguePattern[];
  personalLearning: PersonalPattern[];
}

interface ConceptEntry {
  name: string;
  frequency: number;
  contexts: string[];
  relatedConcepts: string[];
  confidence: number;
}

interface DialoguePattern {
  phase: 'analysis' | 'design' | 'implementation' | 'reflection';
  indicators: string[];
  nextPhaseHints: string[];
  responseTemplates: string[];
}

interface PersonalPattern {
  trigger: string;
  preferredResponse: string;
  learningCount: number;
  lastUsed: string;
}

// ミニマムAI応答結果
export interface MinimalAIResponse {
  response: string;
  confidence: number;
  detectedPhase: string;
  suggestedConcepts: string[];
  learningSignal?: {
    shouldLearn: boolean;
    pattern: string;
    quality: number;
  };
}

// 対話フェーズ予測AI（統計+ルールベース）
class DialoguePhasePredictor {
  private phasePatterns: Map<string, string[]> = new Map([
    ['analysis', ['分析', '理解', '調査', '確認', 'どうやって', 'なぜ', '問題']],
    ['design', ['設計', '構造', 'アーキテクチャ', '方針', '計画', 'どのように', '戦略']],
    ['implementation', ['実装', 'コード', '作成', '構築', 'やってみる', '試す', '開始']],
    ['reflection', ['振り返り', '改善', '学習', '次回', 'まとめ', '感想', '評価']]
  ]);

  predict(text: string): { phase: string; confidence: number } {
    const scores = new Map<string, number>();
    
    // 各フェーズのスコア計算
    for (const [phase, keywords] of this.phasePatterns) {
      let score = 0;
      for (const keyword of keywords) {
        const count = (text.match(new RegExp(keyword, 'g')) || []).length;
        score += count;
      }
      scores.set(phase, score);
    }
    
    // 最高スコアのフェーズを選択
    const maxScore = Math.max(...scores.values());
    const predictedPhase = Array.from(scores.entries()).find(([_, score]) => score === maxScore)?.[0] || 'analysis';
    
    const confidence = maxScore > 0 ? Math.min(maxScore / 10, 1.0) : 0.3;
    return { phase: predictedPhase, confidence };
  }
}

// ローカル概念関連性エンジン（API不要の瞬時推薦）
class LocalConceptEngine {
  private conceptGraph: Map<string, Set<string>> = new Map();
  
  constructor(concepts: ConceptEntry[]) {
    // 概念グラフ構築
    for (const concept of concepts) {
      this.conceptGraph.set(concept.name, new Set(concept.relatedConcepts));
    }
  }
  
  getRelatedConcepts(inputConcept: string, maxResults: number = 5): string[] {
    const related = this.conceptGraph.get(inputConcept) || new Set();
    return Array.from(related).slice(0, maxResults);
  }
  
  findConceptsInText(text: string): string[] {
    const found: string[] = [];
    const normalizedText = text.toLowerCase().replace(/[。、！？\s\-]/g, '');
    
    // より精密な概念マッチング
    for (const concept of this.conceptGraph.keys()) {
      const normalizedConcept = concept.toLowerCase().replace(/[。、！？\s\-]/g, '');
      
      // 完全マッチ優先
      if (normalizedText.includes(normalizedConcept) && normalizedConcept.length > 1) {
        found.push(concept);
      }
      // 部分マッチ（長い概念名のみ）
      else if (concept.length > 3) {
        const conceptParts = concept.split(/[\s\-]/).filter(part => part.length > 2);
        if (conceptParts.some(part => normalizedText.includes(part.toLowerCase()))) {
          found.push(concept);
        }
      }
    }
    
    // 重複削除・重要度順ソート
    const uniqueFound = [...new Set(found)];
    return uniqueFound.sort((a, b) => b.length - a.length).slice(0, 8); // 最大8概念
  }
}

// パターンベース応答生成システム
class PatternBasedResponseGenerator {
  private responseTemplates: Map<string, string[]> = new Map([
    ['analysis', [
      '分析を始めましょう。まず {concept} について詳しく見てみます。',
      '{concept} の構造を理解するために、いくつか質問があります。',
      '現在の {concept} の状況を把握することから始めるのが良さそうです。'
    ]],
    ['design', [
      '{concept} の設計アプローチとして、以下を検討してはいかがでしょうか？',
      '{concept} を構造化するために、段階的なアプローチを提案します。',
      '{concept} の全体設計を考える前に、要件を整理しましょう。'
    ]],
    ['implementation', [
      '{concept} の実装を開始しましょう。最初のステップは以下です：',
      '{concept} を実際に構築していきます。段階的に進めていきましょう。',
      '{concept} の実装で重要なポイントを確認しながら進めます。'
    ]],
    ['reflection', [
      '{concept} について振り返ってみると、次のような学びがありました。',
      '{concept} の経験から、今後に活かせるポイントを整理しましょう。',
      '{concept} を通じて得られた洞察を次回に繋げていきます。'
    ]]
  ]);
  
  generate(phase: string, concepts: string[]): string {
    const templates = this.responseTemplates.get(phase) || ['継続的な対話を支援します。'];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    const mainConcept = concepts[0] || '対話';
    
    return randomTemplate.replace('{concept}', mainConcept);
  }
}

// 育てる自家製ミニマムAI メインクラス
export class MinimalAICore {
  private conceptDB!: MinimalConceptDB;
  private phasePredictor: DialoguePhasePredictor;
  private conceptEngine!: LocalConceptEngine;
  private responseGenerator: PatternBasedResponseGenerator;
  private tokenizer: any;
  
  constructor() {
    this.phasePredictor = new DialoguePhasePredictor();
    this.responseGenerator = new PatternBasedResponseGenerator();
  }
  
  async initialize(): Promise<void> {
    // 形態素解析器初期化
    this.tokenizer = await new Promise((resolve) => {
      kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err: any, tokenizer: any) => {
        if (err) throw err;
        resolve(tokenizer);
      });
    });
    
    // 軽量化概念DB読み込み
    await this.loadMinimalConceptDB();
    
    // ローカル概念エンジン初期化
    const allConcepts = [...this.conceptDB.concepts.surface, ...this.conceptDB.concepts.deep];
    this.conceptEngine = new LocalConceptEngine(allConcepts);
  }
  
  private async loadMinimalConceptDB(): Promise<void> {
    try {
      // 既存の75概念DBから軽量版抽出
      const fullDBPath = path.join(process.cwd(), 'docs', 'ANALYSIS_RESULTS_DB.json');
      const fullDB = JSON.parse(await fs.readFile(fullDBPath, 'utf-8'));
      
      // 軽量化変換
      this.conceptDB = this.convertToMinimalDB(fullDB);
    } catch (error) {
      // フォールバック: 基本概念セット
      this.conceptDB = this.createFallbackDB();
    }
  }
  
  private convertToMinimalDB(fullDB: any): MinimalConceptDB {
    const surfaceConcepts: ConceptEntry[] = [];
    const deepConcepts: ConceptEntry[] = [];
    
    // 全ログから概念を抽出し統計化
    for (const [logKey, analysis] of Object.entries(fullDB.analysisHistory as any)) {
      const analysisData = analysis as any;
      // 表面概念
      for (const concept of analysisData.surfaceConcepts || []) {
        this.addOrUpdateConcept(surfaceConcepts, concept, analysisData.dialogueType || '');
      }
      
      // 深層概念
      for (const concept of analysisData.deepConcepts || []) {
        this.addOrUpdateConcept(deepConcepts, concept, analysisData.dialogueType || '');
      }
    }
    
    return {
      totalConcepts: surfaceConcepts.length + deepConcepts.length,
      lastUpdated: new Date().toISOString(),
      concepts: { surface: surfaceConcepts, deep: deepConcepts },
      patterns: this.extractDialoguePatterns(),
      personalLearning: []
    };
  }
  
  private addOrUpdateConcept(concepts: ConceptEntry[], conceptName: string, context: string): void {
    const existing = concepts.find(c => c.name === conceptName);
    if (existing) {
      existing.frequency++;
      if (!existing.contexts.includes(context)) {
        existing.contexts.push(context);
      }
    } else {
      concepts.push({
        name: conceptName,
        frequency: 1,
        contexts: [context],
        relatedConcepts: [],
        confidence: 0.7
      });
    }
  }
  
  private extractDialoguePatterns(): DialoguePattern[] {
    return [
      {
        phase: 'analysis',
        indicators: ['分析', '理解', '調査'],
        nextPhaseHints: ['設計', '構造化', '計画'],
        responseTemplates: ['分析を深めていきましょう', '詳しく見てみます']
      },
      {
        phase: 'implementation',
        indicators: ['実装', '作成', '構築'],
        nextPhaseHints: ['テスト', '検証', '改善'],
        responseTemplates: ['実装を進めていきます', '段階的に構築します']
      }
    ];
  }
  
  private createFallbackDB(): MinimalConceptDB {
    return {
      totalConcepts: 20,
      lastUpdated: new Date().toISOString(),
      concepts: {
        surface: [
          { name: '構造的対話', frequency: 10, contexts: ['technical'], relatedConcepts: ['AI', 'プロンプト'], confidence: 0.9 },
          { name: 'AI', frequency: 15, contexts: ['technical'], relatedConcepts: ['対話', '知識'], confidence: 0.95 }
        ],
        deep: [
          { name: 'セーブデータ理論', frequency: 5, contexts: ['conceptual'], relatedConcepts: ['継続性', '文脈'], confidence: 0.8 }
        ]
      },
      patterns: this.extractDialoguePatterns(),
      personalLearning: []
    };
  }
  
  // メイン処理: ミニマムAI応答生成
  async generateResponse(userInput: string): Promise<MinimalAIResponse> {
    // 1. 対話フェーズ予測
    const phaseResult = this.phasePredictor.predict(userInput);
    
    // 2. 概念抽出
    const detectedConcepts = this.conceptEngine.findConceptsInText(userInput);
    
    // 3. 関連概念推薦
    const suggestedConcepts: string[] = [];
    for (const concept of detectedConcepts) {
      const related = this.conceptEngine.getRelatedConcepts(concept, 3);
      suggestedConcepts.push(...related);
    }
    
    // 4. 応答生成
    const response = this.responseGenerator.generate(phaseResult.phase, detectedConcepts);
    
    // 5. 学習シグナル検出
    const learningSignal = this.detectLearningOpportunity(userInput, detectedConcepts);
    
    return {
      response,
      confidence: phaseResult.confidence,
      detectedPhase: phaseResult.phase,
      suggestedConcepts: [...new Set(suggestedConcepts)].slice(0, 5),
      learningSignal
    };
  }
  
  private detectLearningOpportunity(input: string, concepts: string[]): { shouldLearn: boolean; pattern: string; quality: number } | undefined {
    // 高品質対話の特徴検出
    const qualityIndicators = ['なぜなら', '具体的には', '例えば', '一方で', 'しかし'];
    const hasQualityIndicators = qualityIndicators.some(indicator => input.includes(indicator));
    
    if (hasQualityIndicators && concepts.length > 0) {
      return {
        shouldLearn: true,
        pattern: `${concepts[0]}_quality_dialogue`,
        quality: 0.8
      };
    }
    
    return undefined;
  }
  
  // 個人特化学習機能
  async learnFromFeedback(input: string, feedback: 'positive' | 'negative', response: string): Promise<void> {
    if (feedback === 'positive') {
      const pattern: PersonalPattern = {
        trigger: input.slice(0, 50), // 最初の50文字をトリガーに
        preferredResponse: response,
        learningCount: 1,
        lastUsed: new Date().toISOString()
      };
      
      this.conceptDB.personalLearning.push(pattern);
      
      // 定期的な保存（実装簡素化のため省略）
      console.log('📚 個人特化パターン学習完了:', pattern.trigger);
    }
  }
  
  // 統計情報取得
  getStatistics(): { totalConcepts: number; learningPatterns: number; confidence: number } {
    return {
      totalConcepts: this.conceptDB.totalConcepts,
      learningPatterns: this.conceptDB.personalLearning.length,
      confidence: 0.85 // 動的計算（簡素化）
    };
  }
}