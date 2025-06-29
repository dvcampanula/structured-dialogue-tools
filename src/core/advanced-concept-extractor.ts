#!/usr/bin/env node

/**
 * 革命的概念抽出システム - Phase 1: 多段階全文解析
 * 
 * 従来の冒頭偏重・表層的パターンマッチングを脱却し、
 * 文書全体の真の価値と新概念創造を捉える高度な解析システム
 */

export interface ConceptAnalysisResult {
  // 基本情報
  documentLength: number;
  analysisPhases: AnalysisPhase[];
  
  // 革命的抽出結果
  emergentConcepts: EmergentConcept[];
  semanticConcepts: SemanticConcept[];
  dialogueFlow: DialogueFlowAnalysis;
  
  // 品質指標
  conceptDensityMap: ConceptDensityPoint[];
  noveltyScore: number;
  breakthroughMoments: BreakthroughMoment[];
}

export interface AnalysisPhase {
  phase: 'structural_scan' | 'concept_density' | 'emergent_detection' | 'dialogue_flow';
  startTime: number;
  endTime: number;
  findings: PhaseFindings;
}

export interface EmergentConcept {
  term: string;
  type: 'new_term' | 'composite_concept' | 'metaphor' | 'definition';
  confidence: number;
  context: string;
  firstMention: number;
  evolutionTrace: ConceptEvolution[];
}

export interface SemanticConcept {
  concept: string;
  semanticWeight: number;
  positionalWeight: number;
  noveltyScore: number;
  contextualImpact: number;
  occurrences: ConceptOccurrence[];
}

export interface DialogueFlowAnalysis {
  phases: ConversationPhase[];
  conceptEvolution: ConceptEvolutionFlow[];
  keyInsights: KeyInsight[];
  breakthroughSequence: string[];
}

export interface ConceptDensityPoint {
  position: number;
  conceptDensity: number;
  noveltyScore: number;
  technicalDepth: number;
  isBreakthroughZone: boolean;
}

export interface BreakthroughMoment {
  position: number;
  type: 'concept_creation' | 'major_insight' | 'paradigm_shift' | 'conclusion';
  confidence: number;
  description: string;
  relatedConcepts: string[];
}

class AdvancedConceptExtractor {
  
  /**
   * メイン解析エントリーポイント
   */
  async performFullDocumentAnalysis(text: string): Promise<ConceptAnalysisResult> {
    console.log(`🔬 革命的概念抽出開始: ${text.length}文字`);
    
    const result: ConceptAnalysisResult = {
      documentLength: text.length,
      analysisPhases: [],
      emergentConcepts: [],
      semanticConcepts: [],
      dialogueFlow: {} as DialogueFlowAnalysis,
      conceptDensityMap: [],
      noveltyScore: 0,
      breakthroughMoments: []
    };

    // Phase 1: 構造スキャン
    const phase1 = await this.phase1_StructuralScan(text);
    result.analysisPhases.push(phase1);
    
    // Phase 2: 概念密度マッピング
    const phase2 = await this.phase2_ConceptDensityMapping(text);
    result.analysisPhases.push(phase2);
    result.conceptDensityMap = phase2.findings.densityMap;
    
    // Phase 3: 新概念検出
    const phase3 = await this.phase3_EmergentConceptDetection(text);
    result.analysisPhases.push(phase3);
    result.emergentConcepts = phase3.findings.emergentConcepts;
    
    // Phase 4: 対話フロー解析
    const phase4 = await this.phase4_DialogueFlowAnalysis(text);
    result.analysisPhases.push(phase4);
    result.dialogueFlow = phase4.findings.dialogueFlow;
    
    // 最終統合・スコア計算
    result.semanticConcepts = this.calculateSemanticConcepts(text, result);
    result.noveltyScore = this.calculateOverallNoveltyScore(result);
    result.breakthroughMoments = this.identifyBreakthroughMoments(text, result);
    
    console.log(`✨ 解析完了: ${result.emergentConcepts.length}新概念, ${result.semanticConcepts.length}セマンティック概念検出`);
    
    return result;
  }

  /**
   * Phase 1: 構造スキャン - 文書の全体構造を把握
   */
  private async phase1_StructuralScan(text: string): Promise<AnalysisPhase> {
    const startTime = Date.now();
    console.log('📋 Phase 1: 構造スキャン開始');
    
    const findings: PhaseFindings = {
      dialogueSections: this.extractDialogueSections(text),
      explanatorySections: this.extractExplanatorySections(text),
      conclusionSections: this.extractConclusionSections(text),
      definitionSections: this.extractDefinitionSections(text)
    };
    
    console.log(`   📊 対話セクション: ${findings.dialogueSections.length}個`);
    console.log(`   📝 説明セクション: ${findings.explanatorySections.length}個`);
    console.log(`   🎯 結論セクション: ${findings.conclusionSections.length}個`);
    console.log(`   🔍 定義セクション: ${findings.definitionSections.length}個`);
    
    return {
      phase: 'structural_scan',
      startTime,
      endTime: Date.now(),
      findings
    };
  }

  /**
   * Phase 2: 概念密度マッピング - 文書全体の概念分布を分析
   */
  private async phase2_ConceptDensityMapping(text: string): Promise<AnalysisPhase> {
    const startTime = Date.now();
    console.log('🗺️ Phase 2: 概念密度マッピング開始');
    
    const chunkSize = 1000;
    const chunks = this.splitIntoAnalysisChunks(text, chunkSize);
    const densityMap: ConceptDensityPoint[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const point: ConceptDensityPoint = {
        position: chunk.startIndex,
        conceptDensity: this.calculateConceptDensity(chunk.text),
        noveltyScore: this.calculateNoveltyScore(chunk.text),
        technicalDepth: this.calculateTechnicalDepth(chunk.text),
        isBreakthroughZone: false // 後で判定
      };
      densityMap.push(point);
    }
    
    // ブレークスルーゾーンの特定
    this.identifyBreakthroughZones(densityMap);
    
    const avgDensity = densityMap.reduce((sum, p) => sum + p.conceptDensity, 0) / densityMap.length;
    const maxDensity = Math.max(...densityMap.map(p => p.conceptDensity));
    
    console.log(`   📈 平均概念密度: ${avgDensity.toFixed(2)}`);
    console.log(`   📈 最大概念密度: ${maxDensity.toFixed(2)}`);
    console.log(`   🔥 ブレークスルーゾーン: ${densityMap.filter(p => p.isBreakthroughZone).length}個`);
    
    return {
      phase: 'concept_density',
      startTime,
      endTime: Date.now(),
      findings: { densityMap }
    };
  }

  /**
   * Phase 3: 新概念検出 - 新しく生まれた概念・造語・定義を検出
   */
  private async phase3_EmergentConceptDetection(text: string): Promise<AnalysisPhase> {
    const startTime = Date.now();
    console.log('🆕 Phase 3: 新概念検出開始');
    
    const emergentConcepts: EmergentConcept[] = [];
    
    // 新しい造語の検出
    const newTerms = this.detectNewTerms(text);
    newTerms.forEach(term => {
      emergentConcepts.push({
        term: term.term,
        type: 'new_term',
        confidence: term.confidence,
        context: term.context,
        firstMention: term.position,
        evolutionTrace: []
      });
    });
    
    // 複合概念の検出（例：「レイヤード・プロンプティング」）
    const compositeConcepts = this.detectCompositeConcepts(text);
    compositeConcepts.forEach(concept => {
      emergentConcepts.push({
        term: concept.term,
        type: 'composite_concept',
        confidence: concept.confidence,
        context: concept.context,
        firstMention: concept.position,
        evolutionTrace: concept.buildingProcess
      });
    });
    
    // 比喩・象徴の検出（例：「金銀財宝」）
    const metaphors = this.detectMetaphors(text);
    metaphors.forEach(metaphor => {
      emergentConcepts.push({
        term: metaphor.term,
        type: 'metaphor',
        confidence: metaphor.confidence,
        context: metaphor.context,
        firstMention: metaphor.position,
        evolutionTrace: []
      });
    });
    
    // 明確な定義の検出
    const definitions = this.detectDefinitions(text);
    definitions.forEach(def => {
      emergentConcepts.push({
        term: def.term,
        type: 'definition',
        confidence: def.confidence,
        context: def.context,
        firstMention: def.position,
        evolutionTrace: []
      });
    });
    
    console.log(`   🆕 新語: ${newTerms.length}個`);
    console.log(`   🧩 複合概念: ${compositeConcepts.length}個`);
    console.log(`   🎭 比喩: ${metaphors.length}個`);
    console.log(`   📖 定義: ${definitions.length}個`);
    
    return {
      phase: 'emergent_detection',
      startTime,
      endTime: Date.now(),
      findings: { emergentConcepts }
    };
  }

  /**
   * Phase 4: 対話フロー解析 - 対話の発展・発見の流れを分析
   */
  private async phase4_DialogueFlowAnalysis(text: string): Promise<AnalysisPhase> {
    const startTime = Date.now();
    console.log('💬 Phase 4: 対話フロー解析開始');
    
    const phases = this.identifyConversationPhases(text);
    const conceptEvolution = this.traceConceptEvolution(text, phases);
    const keyInsights = this.identifyKeyInsights(phases);
    const breakthroughSequence = this.identifyBreakthroughSequence(phases);
    
    const dialogueFlow: DialogueFlowAnalysis = {
      phases,
      conceptEvolution,
      keyInsights,
      breakthroughSequence
    };
    
    console.log(`   📊 対話フェーズ: ${phases.length}個`);
    console.log(`   🔄 概念進化: ${conceptEvolution.length}個`);
    console.log(`   💡 重要洞察: ${keyInsights.length}個`);
    console.log(`   🚀 ブレークスルー: ${breakthroughSequence.length}個`);
    
    return {
      phase: 'dialogue_flow',
      startTime,
      endTime: Date.now(),
      findings: { dialogueFlow }
    };
  }

  // ヘルパーメソッド群（基本実装）
  
  private extractDialogueSections(text: string): TextSection[] {
    // 対話パターンの検出（「あなた:」「ChatGPT:」「Gemini:」等）
    const dialogueMarkers = /^(あなた|ChatGPT|Gemini|Claude|AI|Human)[:：]/gm;
    const sections: TextSection[] = [];
    
    let match;
    while ((match = dialogueMarkers.exec(text)) !== null) {
      const start = match.index;
      const nextMatch = dialogueMarkers.exec(text);
      const end = nextMatch ? nextMatch.index : text.length;
      
      sections.push({
        start,
        end,
        text: text.substring(start, end),
        type: 'dialogue'
      });
      
      // Reset regex for next iteration
      if (nextMatch) {
        dialogueMarkers.lastIndex = nextMatch.index;
      }
    }
    
    return sections;
  }

  private extractExplanatorySections(text: string): TextSection[] {
    // 説明・解説パターンの検出
    const explanatoryPatterns = [
      /つまり[、,].{20,}/g,
      /言い換えれば.{20,}/g,
      /具体的には.{20,}/g,
      /例えば.{20,}/g
    ];
    
    const sections: TextSection[] = [];
    explanatoryPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        sections.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          type: 'explanatory'
        });
      }
    });
    
    return sections;
  }

  private extractConclusionSections(text: string): TextSection[] {
    // 結論・まとめパターンの検出
    const conclusionPatterns = [
      /結論として.{20,}/g,
      /まとめると.{20,}/g,
      /最終的に.{20,}/g,
      /要するに.{20,}/g,
      /以上のことから.{20,}/g
    ];
    
    const sections: TextSection[] = [];
    conclusionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        sections.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          type: 'conclusion'
        });
      }
    });
    
    return sections;
  }

  private extractDefinitionSections(text: string): TextSection[] {
    // 定義パターンの検出
    const definitionPatterns = [
      /(.+)とは[、,].{20,}/g,
      /(.+)は.{20,}である/g,
      /(.+)を定義する.{20,}/g,
      /(.+)という概念.{20,}/g
    ];
    
    const sections: TextSection[] = [];
    definitionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        sections.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          type: 'definition'
        });
      }
    });
    
    return sections;
  }

  private splitIntoAnalysisChunks(text: string, chunkSize: number): AnalysisChunk[] {
    const chunks: AnalysisChunk[] = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push({
        startIndex: i,
        endIndex: Math.min(i + chunkSize, text.length),
        text: text.substring(i, Math.min(i + chunkSize, text.length))
      });
    }
    
    return chunks;
  }

  private calculateConceptDensity(text: string): number {
    // 技術用語、専門概念の密度を計算
    const technicalTerms = [
      'AI', 'プロンプト', '構造', '対話', '概念', '分析', '検証', '実装',
      'アルゴリズム', 'システム', '処理', '機能', '設計', '開発'
    ];
    
    let count = 0;
    technicalTerms.forEach(term => {
      const matches = text.match(new RegExp(term, 'g'));
      if (matches) count += matches.length;
    });
    
    return count / (text.length / 1000); // 1000文字あたりの概念数
  }

  private calculateNoveltyScore(text: string): number {
    // 新しさのスコア計算（簡易版）
    const noveltyIndicators = [
      '新しい', '革新的', '画期的', '初めて', '未知', '発見',
      'これまでにない', '従来とは異なる', '新概念', '創造'
    ];
    
    let score = 0;
    noveltyIndicators.forEach(indicator => {
      const matches = text.match(new RegExp(indicator, 'g'));
      if (matches) score += matches.length;
    });
    
    return score;
  }

  private calculateTechnicalDepth(text: string): number {
    // 技術的深度の計算
    const technicalIndicators = [
      'アーキテクチャ', 'フレームワーク', 'メソッド', 'クラス', 'インターフェース',
      '実装', '設計', '最適化', 'パフォーマンス', 'スケーラビリティ'
    ];
    
    let score = 0;
    technicalIndicators.forEach(indicator => {
      const matches = text.match(new RegExp(indicator, 'g'));
      if (matches) score += matches.length;
    });
    
    return score;
  }

  private identifyBreakthroughZones(densityMap: ConceptDensityPoint[]): void {
    // 概念密度と新規性スコアの組み合わせでブレークスルーゾーンを特定
    const avgDensity = densityMap.reduce((sum, p) => sum + p.conceptDensity, 0) / densityMap.length;
    const avgNovelty = densityMap.reduce((sum, p) => sum + p.noveltyScore, 0) / densityMap.length;
    
    densityMap.forEach(point => {
      if (point.conceptDensity > avgDensity * 1.5 && point.noveltyScore > avgNovelty * 1.2) {
        point.isBreakthroughZone = true;
      }
    });
  }

  // 新語検出の実装
  private detectNewTerms(text: string): any[] {
    const newTerms: any[] = [];
    
    // ハイフン・カタカナ結合の新語パターン
    const hyphenatedTerms = text.match(/[ァ-ヶー]+[-・][ァ-ヶー]+/g) || [];
    hyphenatedTerms.forEach(term => {
      if (term.length > 4) { // 短すぎるものは除外
        newTerms.push({
          term,
          confidence: 0.8,
          context: this.getContext(text, term),
          position: text.indexOf(term)
        });
      }
    });
    
    // カタカナ英語組み合わせ（例：「プロンプティング」）
    const katakanaEngTerms = text.match(/[ァ-ヶー]{4,}[グクニンプトス]/g) || [];
    katakanaEngTerms.forEach(term => {
      if (!this.isCommonWord(term)) {
        newTerms.push({
          term,
          confidence: 0.7,
          context: this.getContext(text, term),
          position: text.indexOf(term)
        });
      }
    });
    
    return newTerms;
  }

  private detectCompositeConcepts(text: string): any[] {
    const compositeConcepts: any[] = [];
    
    // 「レイヤード・プロンプティング」のような複合概念
    const compositePatterns = [
      /([ァ-ヶー]+)[-・]([ァ-ヶー]+)/g,
      /構造的[^\s]+/g,
      /([a-zA-Z]+)([ァ-ヶー]+)/g
    ];
    
    compositePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const term = match[0];
        if (term.length > 3 && !this.isCommonWord(term)) {
          // この概念が徐々に構築される過程を追跡
          const buildingProcess = this.traceBuildingProcess(text, term);
          
          compositeConcepts.push({
            term,
            confidence: 0.9,
            context: this.getContext(text, term),
            position: match.index,
            buildingProcess
          });
        }
      }
    });
    
    return compositeConcepts;
  }

  private detectMetaphors(text: string): any[] {
    const metaphors: any[] = [];
    
    // 「金銀財宝」のような価値比喩
    const metaphorPatterns = [
      /金銀財宝/g,
      /宝物/g,
      /セーブデータ/g,
      /開発者モード/g,
      /設計図/g,
      /建築/g,
      /橋をかける/g,
      /探検家/g
    ];
    
    metaphorPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const term = match[0];
        metaphors.push({
          term,
          confidence: 0.8,
          context: this.getContext(text, term),
          position: match.index
        });
      }
    });
    
    return metaphors;
  }

  private detectDefinitions(text: string): any[] {
    const definitions: any[] = [];
    
    // 明確な定義パターン
    const definitionPatterns = [
      /(.{2,20})とは[、,](.{20,100})/g,
      /(.{2,20})は(.{20,100})である/g,
      /(.{2,20})を定義する[なると](.{20,100})/g,
      /「(.{2,30})」(.{20,100})/g
    ];
    
    definitionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const term = match[1];
        const definition = match[2];
        
        definitions.push({
          term: term.trim(),
          confidence: 0.9,
          context: match[0],
          position: match.index,
          definition: definition.trim()
        });
      }
    });
    
    return definitions;
  }

  // ヘルパーメソッド
  private getContext(text: string, term: string): string {
    const index = text.indexOf(term);
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + term.length + 100);
    return text.substring(start, end);
  }

  private isCommonWord(term: string): boolean {
    const commonWords = [
      'システム', 'プログラム', 'データ', 'ファイル', 'コード',
      'メッセージ', 'アプリ', 'ユーザー', 'サービス', 'ツール'
    ];
    return commonWords.includes(term);
  }

  private traceBuildingProcess(text: string, term: string): ConceptEvolution[] {
    // 概念が徐々に構築される過程を追跡
    const evolution: ConceptEvolution[] = [];
    
    // 概念の各部分が最初に現れる箇所を特定
    const parts = term.split(/[-・]/);
    parts.forEach(part => {
      const firstMention = text.indexOf(part);
      if (firstMention !== -1) {
        evolution.push({
          stage: `部分概念「${part}」の導入`,
          description: `概念の構成要素として${part}が言及される`,
          position: firstMention
        });
      }
    });
    
    return evolution;
  }
  private identifyConversationPhases(text: string): any[] { return []; }
  private traceConceptEvolution(text: string, phases: any[]): any[] { return []; }
  private identifyKeyInsights(phases: any[]): any[] { return []; }
  private identifyBreakthroughSequence(phases: any[]): string[] { return []; }
  private calculateSemanticConcepts(text: string, result: ConceptAnalysisResult): SemanticConcept[] { return []; }
  private calculateOverallNoveltyScore(result: ConceptAnalysisResult): number { return 0; }
  private identifyBreakthroughMoments(text: string, result: ConceptAnalysisResult): BreakthroughMoment[] { return []; }
}

// 型定義
interface PhaseFindings {
  [key: string]: any;
}

interface TextSection {
  start: number;
  end: number;
  text: string;
  type: string;
}

interface AnalysisChunk {
  startIndex: number;
  endIndex: number;
  text: string;
}

interface ConceptEvolution {
  stage: string;
  description: string;
  position: number;
}

interface ConceptOccurrence {
  position: number;
  context: string;
  weight: number;
}

interface ConversationPhase {
  type: string;
  start: number;
  end: number;
  keyConcepts: string[];
}

interface ConceptEvolutionFlow {
  concept: string;
  evolutionStages: ConceptEvolution[];
}

interface KeyInsight {
  position: number;
  insight: string;
  confidence: number;
}

export { AdvancedConceptExtractor };