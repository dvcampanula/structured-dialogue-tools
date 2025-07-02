import fs from 'fs/promises';

// メインファイルからインポートする型定義
export interface PredictiveConcept {
  term: string;
  probability: number;
  predictedClassification: 'surface' | 'deep';
  reasoning: string;
  contextClues: string[];
  emergenceIndicators: string[];
}

export interface PredictiveExtractionResult {
  predictedConcepts: PredictiveConcept[];
  emergentPatterns: string[];
  hiddenConnections: string[];
  conceptEvolutionPrediction: string[];
  
  // 現象検出結果
  detectedPhenomena?: any[];
  dialoguePhases?: any[];
  academicValue?: any;
}

export interface ConceptPattern {
  type: string;
  indicators?: string[];
  frequency: number;
  innovationLevel: number;
  commonContexts?: string[];
  emergencePatterns?: string[];
}

/**
 * 予測的概念抽出システム
 * 潜在概念、創発パターン、概念進化の予測を担当
 */
export class PredictiveExtractor {
  private conceptPatterns: Map<string, ConceptPattern> = new Map();
  private innovationIndicators: string[] = [];
  private revolutionaryKeywords: string[] = [];

  constructor() {
    // 初期化処理
  }

  /**
   * パターンデータの更新
   */
  public updatePatterns(patterns: Map<string, ConceptPattern>): void {
    this.conceptPatterns = patterns;
  }

  /**
   * 革新指標の更新
   */
  public updateInnovationIndicators(indicators: string[]): void {
    this.innovationIndicators = indicators;
  }

  /**
   * 革命的キーワードの更新
   */
  public updateRevolutionaryKeywords(keywords: string[]): void {
    this.revolutionaryKeywords = keywords;
  }

  /**
   * 予測的概念抽出の実行
   */
  public async performPredictiveExtraction(content: string, existingConcepts: string[]): Promise<PredictiveExtractionResult> {
    try {
      // 1. 潜在概念の予測
      const latentConcepts = await this.predictLatentConcepts(content, existingConcepts);
      
      // 2. 創発パターンの検出
      const emergentPatterns = this.detectEmergentPatterns(content, existingConcepts);
      
      // 3. 隠れた接続の発見
      const hiddenConnections = this.discoverHiddenConnections(existingConcepts, content);
      
      // 4. 概念進化の予測
      const evolutionPredictions = this.predictConceptEvolution(existingConcepts, content);
      
      return {
        predictedConcepts: latentConcepts,
        emergentPatterns,
        hiddenConnections,
        conceptEvolutionPrediction: evolutionPredictions
      };
    } catch (error) {
      console.error('予測的抽出エラー:', error);
      return {
        predictedConcepts: [],
        emergentPatterns: [],
        hiddenConnections: [],
        conceptEvolutionPrediction: []
      };
    }
  }

  /**
   * 潜在概念の予測
   */
  private async predictLatentConcepts(content: string, existingConcepts: string[]): Promise<PredictiveConcept[]> {
    const predictedConcepts: PredictiveConcept[] = [];
    
    // 既存概念からのパターン類推
    for (const [conceptName, pattern] of this.conceptPatterns) {
      // 類似パターンの検出
      const similarityScore = this.calculatePatternSimilarity(pattern, content);
      
      if (similarityScore > 0.6) {
        // 概念の変形や拡張を予測
        const variations = this.generateConceptVariations(conceptName, pattern);
        
        for (const variation of variations) {
          if (!existingConcepts.includes(variation.term)) {
            predictedConcepts.push({
              term: variation.term,
              probability: variation.probability * similarityScore,
              predictedClassification: pattern.type as 'surface' | 'deep',
              reasoning: `${conceptName}からの類推による予測`,
              contextClues: pattern.commonContexts?.slice(0, 3) || [],
              emergenceIndicators: pattern.emergencePatterns?.slice(0, 2) || []
            });
          }
        }
      }
    }
    
    // 文脈パターンからの新概念予測
    const contextualPredictions = this.predictFromContextualPatterns(content, existingConcepts);
    predictedConcepts.push(...contextualPredictions);
    
    // 革新指標との組み合わせ予測
    const innovationBasedPredictions = this.predictFromInnovationIndicators(content, existingConcepts);
    predictedConcepts.push(...innovationBasedPredictions);
    
    // 確率順にソートして上位を返す
    return predictedConcepts
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);
  }

  /**
   * 創発パターンの検出
   */
  private detectEmergentPatterns(content: string, existingConcepts: string[]): string[] {
    const patterns: string[] = [];
    
    // 概念間の新しい関係性パターン
    for (let i = 0; i < existingConcepts.length; i++) {
      for (let j = i + 1; j < existingConcepts.length; j++) {
        const concept1 = existingConcepts[i];
        const concept2 = existingConcepts[j];
        
        // 新しい関係性の検出
        const relationshipPattern = this.detectNewRelationship(concept1, concept2, content);
        if (relationshipPattern) {
          patterns.push(`関係性創発: ${concept1} ↔ ${concept2} (${relationshipPattern})`);
        }
      }
    }
    
    // メタレベルでの創発パターン
    const metaPatterns = this.detectMetaEmergence(content, existingConcepts);
    patterns.push(...metaPatterns);
    
    // 時系列での創発
    const temporalPatterns = this.detectTemporalEmergence(content);
    patterns.push(...temporalPatterns);
    
    return patterns.slice(0, 5);
  }

  /**
   * 隠れた概念間接続の発見
   */
  private discoverHiddenConnections(concepts: string[], content: string): string[] {
    const connections: string[] = [];
    
    // 概念間の間接的関連性
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const concept1 = concepts[i];
        const concept2 = concepts[j];
        
        const connectionStrength = this.analyzeConceptualConnection(concept1, concept2, content);
        if (connectionStrength > 0.5) {
          connections.push(`隠れた接続: ${concept1} — ${concept2} (強度: ${connectionStrength.toFixed(2)})`);
        }
      }
    }
    
    // 暗示的パターンの検出
    const implicitPatterns = this.detectImplicitPatterns(content);
    connections.push(...implicitPatterns);
    
    // クラスター分析による接続発見
    const clusterConnections = this.analyzeConceptClusters(concepts, content);
    connections.push(...clusterConnections);
    
    return connections.slice(0, 8);
  }

  /**
   * 概念進化の予測
   */
  private predictConceptEvolution(concepts: string[], content: string): string[] {
    const predictions: string[] = [];
    
    // 各概念の発展方向を予測
    for (const concept of concepts.slice(0, 5)) { // 上位5概念のみ分析
      const evolutionDirection = this.analyzeConceptEvolutionDirection(concept, content);
      if (evolutionDirection) {
        predictions.push(`${concept} → ${evolutionDirection}`);
      }
    }
    
    // 概念間のシナジー予測
    const synergyPredictions = this.predictConceptSynergies(concepts, content);
    predictions.push(...synergyPredictions);
    
    return predictions;
  }

  /**
   * イノベーションレベルの予測
   */
  public predictInnovationLevel(
    dialogueType: string,
    conceptQuality: number,
    contentAnalysis: any
  ): number {
    let innovationScore = 0;
    
    // 対話タイプ基準
    if (dialogueType === 'deep_structural') {
      innovationScore += 0.4;
    } else if (dialogueType === 'exploratory') {
      innovationScore += 0.3;
    }
    
    // 概念品質基準
    innovationScore += conceptQuality * 0.3;
    
    // 内容分析基準
    if (contentAnalysis?.metaCognition > 0.7) {
      innovationScore += 0.2;
    }
    
    if (contentAnalysis?.structuralInnovation > 0.6) {
      innovationScore += 0.1;
    }
    
    return Math.min(1.0, innovationScore);
  }

  /**
   * 社会的インパクトの予測
   */
  public predictSocialImpact(innovationLevel: number): number {
    return Math.min(1.0, innovationLevel * 0.8 + 0.2);
  }

  /**
   * イノベーションレベル予測（アダプター）
   */
  public predictInnovationLevelFromConcepts(
    deepConcepts: any[],
    timeMarkers: any[],
    content: string
  ): number {
    // 概念品質の分析
    const conceptQuality = deepConcepts.length > 0 ? 
      deepConcepts.reduce((sum, c) => sum + (c.confidence || 0.5), 0) / deepConcepts.length : 0.5;
    
    // 対話タイプの簡易判定
    let dialogueType = 'basic';
    if (content.includes('構造') && content.includes('対話')) dialogueType = 'deep_structural';
    else if (content.includes('探索') || content.includes('発見')) dialogueType = 'exploratory';
    
    // 内容分析の簡易版
    const contentAnalysis = {
      metaCognition: /メタ|自己.*観察|振り返り/.test(content) ? 0.8 : 0.3,
      structuralInnovation: /構造.*革新|革新.*構造/.test(content) ? 0.7 : 0.4
    };
    
    return this.predictInnovationLevel(dialogueType, conceptQuality, contentAnalysis);
  }

  /**
   * 社会的インパクト予測（アダプター）
   */
  public predictSocialImpactFromConcepts(
    deepConcepts: any[],
    innovationLevel: number
  ): 'low' | 'medium' | 'high' | 'revolutionary' {
    const impactScore = this.predictSocialImpact(innovationLevel);
    
    if (impactScore >= 0.9) return 'revolutionary';
    if (impactScore >= 0.7) return 'high';
    if (impactScore >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * 品質予測（アダプター）
   */
  public predictQualityFromConcepts(
    surfaceConcepts: any[],
    deepConcepts: any[],
    timeMarkers: any[]
  ): any {
    const conceptDensity = (deepConcepts.length + surfaceConcepts.length * 0.5) / 10;
    const innovationPotential = deepConcepts.length > 0 ? 
      deepConcepts.reduce((sum, c) => sum + (c.confidence || 0.5), 0) / deepConcepts.length : 0.5;
    const structuralDialogueScore = timeMarkers.length > 0 ? 0.8 : 0.6;
    
    return this.predictQuality(conceptDensity, innovationPotential, structuralDialogueScore);
  }

  /**
   * 品質予測
   */
  public predictQuality(
    conceptDensity: number,
    innovationPotential: number,
    structuralDialogueScore: number,
    realTimeMetrics?: any
  ): {
    conceptDensity: number;
    innovationPotential: number;
    structuralDialogueScore: number;
    overallQuality: number;
    realTimeMetrics?: any;
    qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    improvementSuggestions: string[];
    domainSpecificScore: number;
  } {
    const overallQuality = (conceptDensity * 0.3 + innovationPotential * 0.4 + structuralDialogueScore * 0.3);
    
    let qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallQuality >= 0.9) qualityGrade = 'A';
    else if (overallQuality >= 0.8) qualityGrade = 'B';
    else if (overallQuality >= 0.7) qualityGrade = 'C';
    else if (overallQuality >= 0.6) qualityGrade = 'D';
    else qualityGrade = 'F';
    
    const improvementSuggestions: string[] = [];
    if (conceptDensity < 0.7) improvementSuggestions.push('概念密度の向上');
    if (innovationPotential < 0.6) improvementSuggestions.push('革新性の強化');
    if (structuralDialogueScore < 0.8) improvementSuggestions.push('構造的対話の深化');
    
    return {
      conceptDensity,
      innovationPotential,
      structuralDialogueScore,
      overallQuality,
      realTimeMetrics,
      qualityGrade,
      improvementSuggestions,
      domainSpecificScore: overallQuality * 0.9 // ドメイン特化調整
    };
  }

  // ===== 補助メソッド =====

  private calculatePatternSimilarity(pattern: ConceptPattern, content: string): number {
    let similarityScore = 0;
    
    // パターン指標との一致度
    if (pattern.indicators && pattern.indicators.length > 0) {
      const matchedIndicators = pattern.indicators.filter(indicator => 
        content.includes(indicator)
      ).length;
      
      similarityScore += (matchedIndicators / pattern.indicators.length) * 0.5;
    }
    
    // 共通文脈との一致度
    if (pattern.commonContexts && pattern.commonContexts.length > 0) {
      const matchedContexts = pattern.commonContexts.filter(context =>
        content.includes(context)
      ).length;
      
      similarityScore += (matchedContexts / pattern.commonContexts.length) * 0.3;
    }
    
    // 創発パターンとの一致度
    if (pattern.emergencePatterns && pattern.emergencePatterns.length > 0) {
      const matchedEmergence = pattern.emergencePatterns.filter(emergence =>
        content.includes(emergence)
      ).length;
      
      similarityScore += (matchedEmergence / pattern.emergencePatterns.length) * 0.2;
    }
    
    return Math.min(1.0, similarityScore);
  }

  private generateConceptVariations(conceptName: string, pattern: ConceptPattern): Array<{term: string, probability: number}> {
    const variations: Array<{term: string, probability: number}> = [];
    
    // 概念の拡張形
    const extensions = ['理論', 'システム', '手法', 'アプローチ', 'モデル'];
    for (const ext of extensions) {
      if (!conceptName.includes(ext)) {
        variations.push({
          term: `${conceptName}${ext}`,
          probability: 0.7
        });
      }
    }
    
    // 概念の修飾形
    const modifiers = ['高度な', '革新的', '統合的', '動的'];
    for (const mod of modifiers) {
      variations.push({
        term: `${mod}${conceptName}`,
        probability: 0.6
      });
    }
    
    return variations;
  }

  private predictFromContextualPatterns(content: string, existingConcepts: string[]): PredictiveConcept[] {
    const predictions: PredictiveConcept[] = [];
    
    // 文脈キーワードと概念の組み合わせ予測
    const contextKeywords = ['構造的', 'メタ', '動的', '統合', '協働'];
    const conceptBases = ['学習', '思考', '対話', '認知', '創造'];
    
    for (const keyword of contextKeywords) {
      for (const base of conceptBases) {
        const predictedTerm = `${keyword}${base}`;
        if (!existingConcepts.includes(predictedTerm) && content.includes(keyword) && content.includes(base)) {
          predictions.push({
            term: predictedTerm,
            probability: 0.5,
            predictedClassification: 'deep',
            reasoning: '文脈パターンからの組み合わせ予測',
            contextClues: [keyword, base],
            emergenceIndicators: ['組み合わせ創発']
          });
        }
      }
    }
    
    return predictions;
  }

  private predictFromInnovationIndicators(content: string, existingConcepts: string[]): PredictiveConcept[] {
    const predictions: PredictiveConcept[] = [];
    
    // 革新指標と既存概念の組み合わせ
    for (const indicator of this.innovationIndicators.slice(0, 5)) {
      for (const concept of existingConcepts.slice(0, 3)) {
        const predictedTerm = `${indicator}${concept}`;
        if (!existingConcepts.includes(predictedTerm)) {
          predictions.push({
            term: predictedTerm,
            probability: 0.4,
            predictedClassification: 'deep',
            reasoning: '革新指標との組み合わせ予測',
            contextClues: [indicator],
            emergenceIndicators: ['革新的組み合わせ']
          });
        }
      }
    }
    
    return predictions;
  }

  private detectNewRelationship(concept1: string, concept2: string, content: string): string | null {
    // 概念間の新しい関係性パターンを検出
    const relationshipPatterns = [
      { pattern: /(.{0,20})相互作用(.{0,20})/, type: '相互作用' },
      { pattern: /(.{0,20})統合(.{0,20})/, type: '統合関係' },
      { pattern: /(.{0,20})協働(.{0,20})/, type: '協働関係' },
      { pattern: /(.{0,20})創発(.{0,20})/, type: '創発関係' }
    ];
    
    for (const {pattern, type} of relationshipPatterns) {
      const conceptContext = content.match(new RegExp(`(.{0,50})${concept1}(.{0,50})${concept2}(.{0,50})`, 'i'));
      if (conceptContext && pattern.test(conceptContext[0])) {
        return type;
      }
    }
    
    return null;
  }

  private detectMetaEmergence(content: string, existingConcepts: string[]): string[] {
    const metaPatterns: string[] = [];
    
    // メタ認知レベルでの創発パターン
    if (/自己.*観察.*構造/.test(content)) {
      metaPatterns.push('メタ認知構造の創発');
    }
    
    if (/思考.*OS.*変化/.test(content)) {
      metaPatterns.push('思考OSの動的変化パターン');
    }
    
    return metaPatterns;
  }

  private detectTemporalEmergence(content: string): string[] {
    const temporalPatterns: string[] = [];
    
    // 時系列での概念出現パターン
    const timeMarkers = ['最初', '次に', 'その後', '最終的に'];
    let hasTimeSequence = false;
    
    for (const marker of timeMarkers) {
      if (content.includes(marker)) {
        hasTimeSequence = true;
        break;
      }
    }
    
    if (hasTimeSequence) {
      temporalPatterns.push('時系列概念創発パターン');
    }
    
    return temporalPatterns;
  }

  private analyzeConceptualConnection(concept1: string, concept2: string, content: string): number {
    let connectionStrength = 0;
    
    // 共起の強さ
    const concept1Regex = new RegExp(concept1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const concept2Regex = new RegExp(concept2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    const concept1Matches = content.match(concept1Regex)?.length || 0;
    const concept2Matches = content.match(concept2Regex)?.length || 0;
    
    // 近接度分析
    const sentences = content.split(/[。！？\n]/);
    let coOccurrences = 0;
    
    for (const sentence of sentences) {
      if (sentence.includes(concept1) && sentence.includes(concept2)) {
        coOccurrences++;
      }
    }
    
    if (concept1Matches > 0 && concept2Matches > 0) {
      connectionStrength = (coOccurrences * 2) / (concept1Matches + concept2Matches);
    }
    
    return Math.min(1.0, connectionStrength);
  }

  private detectImplicitPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // 反復パターンの検出
    const repetitionPattern = /(.{10,50})\1/g;
    if (repetitionPattern.test(content)) {
      patterns.push('反復構造パターン');
    }
    
    // 進行パターンの検出
    const progressionMarkers = ['段階', 'レベル', 'フェーズ', 'ステップ'];
    for (const marker of progressionMarkers) {
      if (content.includes(marker)) {
        patterns.push(`${marker}進行パターン`);
        break;
      }
    }
    
    return patterns;
  }

  private analyzeConceptClusters(concepts: string[], content: string): string[] {
    const clusterConnections: string[] = [];
    
    // 概念の文脈的クラスタリング
    const contextGroups: {[key: string]: string[]} = {};
    
    for (const concept of concepts) {
      const sentences = content.split(/[。！？\n]/).filter(s => s.includes(concept));
      const contextKey = sentences.length > 0 ? sentences[0].substring(0, 20) : 'unknown';
      
      if (!contextGroups[contextKey]) {
        contextGroups[contextKey] = [];
      }
      contextGroups[contextKey].push(concept);
    }
    
    // クラスター内の関連性を報告
    for (const [context, groupConcepts] of Object.entries(contextGroups)) {
      if (groupConcepts.length >= 2) {
        clusterConnections.push(`概念クラスター: [${groupConcepts.join(', ')}]`);
      }
    }
    
    return clusterConnections;
  }

  private analyzeConceptEvolutionDirection(concept: string, content: string): string | null {
    // 概念の進化方向分析
    const evolutionPatterns = [
      { pattern: /発展|進化|拡張/, direction: '拡張的発展' },
      { pattern: /統合|融合|結合/, direction: '統合的進化' },
      { pattern: /深化|精緻化|詳細化/, direction: '深化的発展' },
      { pattern: /応用|実装|実践/, direction: '実用化進化' }
    ];
    
    const conceptContext = content.match(new RegExp(`(.{0,50})${concept}(.{0,50})`, 'gi'));
    if (!conceptContext) return null;
    
    for (const {pattern, direction} of evolutionPatterns) {
      for (const context of conceptContext) {
        if (pattern.test(context)) {
          return direction;
        }
      }
    }
    
    return null;
  }

  private predictConceptSynergies(concepts: string[], content: string): string[] {
    const synergies: string[] = [];
    
    // 概念間のシナジー可能性分析
    for (let i = 0; i < Math.min(concepts.length, 3); i++) {
      for (let j = i + 1; j < Math.min(concepts.length, 3); j++) {
        const concept1 = concepts[i];
        const concept2 = concepts[j];
        
        // シナジー指標語との共起チェック
        const synergyIndicators = ['相乗効果', '組み合わせ', '統合', '協働'];
        for (const indicator of synergyIndicators) {
          if (content.includes(concept1) && content.includes(concept2) && content.includes(indicator)) {
            synergies.push(`シナジー予測: ${concept1} × ${concept2}`);
            break;
          }
        }
      }
    }
    
    return synergies;
  }
}