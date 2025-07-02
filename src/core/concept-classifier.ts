#!/usr/bin/env node

/**
 * ConceptClassifier - 概念分類システム
 * 
 * 概念の意味的深度、文脈的重要度、構造的重要度、革新性を分析し、
 * surface/deep分類を高精度で実行するシステム
 */

// 概念分類用の型定義
export interface ClassifiedConcept {
  term: string;
  classification: 'surface' | 'deep';
  confidence: number;
  reasoning: string;
  matchedPatterns: string[];
}

export interface ConceptAnalysisResult {
  complexity: number;
  uniqueness: number;
  contextualFit: number;
  innovationPotential: number;
  reasoning: string;
}

export interface SemanticAnalysis {
  depth: number;
  contextualImportance: number;
  structuralImportance: number;
  semanticImportance: number;
  innovationImportance: number;
}

/**
 * 概念分類システム
 */
export class ConceptClassifier {
  private conceptPatterns: Map<string, any> = new Map();
  private revolutionaryKeywords: string[] = [];

  constructor(
    conceptPatterns?: Map<string, any>,
    revolutionaryKeywords?: string[]
  ) {
    if (conceptPatterns) this.conceptPatterns = conceptPatterns;
    if (revolutionaryKeywords) this.revolutionaryKeywords = revolutionaryKeywords;
  }

  /**
   * 概念の分類（surface/deep）
   */
  public async classifySingleConcept(concept: string, content: string): Promise<ClassifiedConcept> {
    // Step 1: 基本的な分類判定
    const isDeep = this.isDeepConcept(concept, content);
    
    // Step 2: 詳細分析
    const semanticAnalysis = this.performSemanticAnalysis(concept, content);
    const analysisResult = this.analyzeNewConcept(concept, content);
    
    // Step 3: 信頼度計算
    const confidence = this.calculateClassificationConfidence(
      isDeep, 
      semanticAnalysis, 
      analysisResult
    );
    
    // Step 4: 推論生成
    const reasoning = this.generateClassificationReasoning(
      concept, 
      isDeep, 
      semanticAnalysis, 
      analysisResult
    );
    
    // Step 5: マッチしたパターンの収集
    const matchedPatterns = this.findMatchedPatterns(concept);

    return {
      term: concept,
      classification: isDeep ? 'deep' : 'surface',
      confidence,
      reasoning,
      matchedPatterns
    };
  }

  /**
   * 複数概念の一括分類
   */
  public async classifyConceptsBatch(
    concepts: string[], 
    content: string,
    batchSize: number = 50
  ): Promise<{ surfaceConcepts: ClassifiedConcept[]; deepConcepts: ClassifiedConcept[] }> {
    const surfaceConcepts: ClassifiedConcept[] = [];
    const deepConcepts: ClassifiedConcept[] = [];

    // バッチ処理で効率化
    for (let i = 0; i < concepts.length; i += batchSize) {
      const batch = concepts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(concept => this.classifySingleConcept(concept, content))
      );

      batchResults.forEach(result => {
        if (result.classification === 'deep') {
          deepConcepts.push(result);
        } else {
          surfaceConcepts.push(result);
        }
      });
    }

    return { surfaceConcepts, deepConcepts };
  }

  /**
   * 意味的分析の実行
   */
  public performSemanticAnalysis(concept: string, content: string): SemanticAnalysis {
    const baseAnalysis = {
      depth: this.analyzeSemanticDepth(concept, content),
      contextualImportance: this.calculateContextualImportance(concept, content),
      structuralImportance: this.calculateStructuralImportance(concept, content),
      semanticImportance: this.calculateSemanticImportance(concept, content),
      innovationImportance: this.calculateInnovationImportance(concept, content)
    };
    
    // 専門概念ボーナス
    const specialtyBonus = this.calculateSpecialtyBonus(concept);
    
    return {
      depth: Math.min(baseAnalysis.depth + specialtyBonus, 1.0),
      contextualImportance: Math.min(baseAnalysis.contextualImportance + specialtyBonus, 1.0),
      structuralImportance: Math.min(baseAnalysis.structuralImportance + specialtyBonus, 1.0),
      semanticImportance: Math.min(baseAnalysis.semanticImportance + specialtyBonus, 1.0),
      innovationImportance: Math.min(baseAnalysis.innovationImportance + specialtyBonus, 1.0)
    };
  }

  /**
   * 専門性ボーナス計算
   */
  private calculateSpecialtyBonus(concept: string): number {
    // 数学・技術分野の専門概念
    const mathTechConcepts = [
      '素数', '証明', '公式', '定理', '関数', '方程式', '変数', '係数',
      'アルゴリズム', 'データ', 'プログラム', 'コード', 'API', 'JSON',
      '論文', '直感', '数学'
    ];
    
    // 高専門性概念
    const highSpecialtyConcepts = [
      'レイヤード', 'プロンプティング', 'セーブポイント', '形態素解析',
      'トークン', 'バッチ処理', 'チャンク', 'キャッシュ'
    ];

    // 創作・芸術専門概念
    const creativeSpecialtyConcepts = [
      '物語構造', 'プロット', 'キャラクター設定', '世界観', '文体', 
      '修辞技法', '象徴', 'メタファー', '暗示', '寓意', '起承転結',
      '創作技法', '表現手法', '美的感覚', '芸術性'
    ];

    // 感情・体験専門概念  
    const emotionalSpecialtyConcepts = [
      '共感性', '感情移入', '内面描写', '心理描写', '情感表現',
      '感動体験', '美的体験', '審美眼', '感受性', '情緒'
    ];
    
    if (highSpecialtyConcepts.includes(concept)) return 0.3;
    if (creativeSpecialtyConcepts.includes(concept)) return 0.25;
    if (emotionalSpecialtyConcepts.includes(concept)) return 0.2;
    if (mathTechConcepts.includes(concept)) return 0.2;
    
    // パターンベースの専門性判定
    const specialtyPatterns = [
      /.*理論$/, /.*手法$/, /.*アルゴリズム$/, /.*システム$/,
      /.*構造$/, /.*プロセス$/, /.*フレームワーク$/
    ];

    // 創作系パターンの専門性判定
    const creativePatterns = [
      /.*表現$/, /.*技法$/, /.*描写$/, /.*構成$/,
      /.*設定$/, /.*世界観$/, /.*文体$/, /.*手法$/
    ];
    
    if (specialtyPatterns.some(pattern => pattern.test(concept))) return 0.15;
    if (creativePatterns.some(pattern => pattern.test(concept))) return 0.15;
    
    return 0.0;
  }

  /**
   * 新概念の分析
   */
  public analyzeNewConcept(concept: string, content: string): ConceptAnalysisResult {
    // 複雑性分析
    const complexity = this.analyzeComplexity(concept, content);
    
    // 独自性分析
    const uniqueness = this.analyzeUniqueness(concept);
    
    // 文脈適合性分析
    const contextualFit = this.analyzeContextualFit(concept, content);
    
    // 革新性ポテンシャル
    const innovationPotential = this.analyzeInnovationPotential(concept, content);
    
    // 推論生成
    const reasoning = this.generateAnalysisReasoning(
      concept, 
      complexity, 
      uniqueness, 
      contextualFit, 
      innovationPotential
    );

    return {
      complexity,
      uniqueness,
      contextualFit,
      innovationPotential,
      reasoning
    };
  }

  /**
   * 概念タイプの分類
   */
  public categorizeConceptType(concept: string, content: string): string {
    const lowerConcept = concept.toLowerCase();
    const lowerContent = content.toLowerCase();

    // 技術・システム概念
    if (/システム|技術|プロセス|メソッド|アルゴリズム/.test(lowerConcept)) {
      return '技術革新概念';
    }

    // 数学・科学概念
    if (/数学|科学|理論|公式|法則|定理/.test(lowerConcept) || 
        /数学|科学|理論/.test(lowerContent)) {
      return '数学・科学専門用語';
    }

    // 教育・学習概念
    if (/学習|教育|理解|知識|スキル|能力/.test(lowerConcept)) {
      return '教育革新概念';
    }

    // 対話・コミュニケーション概念
    if (/対話|会話|コミュニケーション|相互作用|インタラクション/.test(lowerConcept)) {
      return '構造対話革新概念';
    }

    // 抽象・哲学概念
    if (/概念|思考|認知|意識|存在|本質/.test(lowerConcept)) {
      return '抽象哲学概念';
    }

    // 創作・芸術概念
    if (/創作|芸術|表現|美|物語|ストーリー|文学|詩|小説|作品/.test(lowerConcept) ||
        /創作|芸術|表現|美|物語|文学/.test(lowerContent)) {
      return '創作芸術概念';  
    }

    // 感情・共感概念
    if (/感情|共感|感動|心|気持ち|体験|印象|感覚/.test(lowerConcept)) {
      return '感情体験概念';
    }

    // 物語・構造概念
    if (/構造|展開|プロット|設定|キャラクター|登場人物|世界観/.test(lowerConcept)) {
      return '物語構造概念';
    }

    return '一般概念';
  }

  /**
   * 新規組み合わせの検出
   */
  public detectNovelCombination(concept: string): boolean {
    const words = concept.split(/\s+|[・、]/);
    if (words.length < 2) return false;

    // 既知パターンとの比較
    const novelCombinations = [
      ['構造', '対話'], ['メタ', '認知'], ['AI', '協働'],
      ['革新', 'システム'], ['学習', 'プロセス'], ['効率', '革命']
    ];

    return novelCombinations.some(pattern => 
      pattern.every(word => 
        words.some(w => w.includes(word))
      )
    );
  }

  // プライベートメソッド群

  /**
   * Deep概念の判定
   */
  private isDeepConcept(concept: string, content: string): boolean {
    // 一般的すぎる概念は長くても深層扱いしない
    const commonConcepts = [
      '編集', '検証', '結果', '可能', '必要', '作成', '確認', '実行', '処理', '対応', '設定', '修正',
      '作業', '状況', '場合', '方法', '時間', '内容', '問題', '情報', '機能', 'システム'
    ];
    
    if (commonConcepts.includes(concept)) return false;
    
    // 専門性の高い概念パターンをチェック
    const specializedPatterns = [
      /.*理論$/, /.*手法$/, /.*アプローチ$/, /.*システム$/, /.*構造$/,
      /.*アルゴリズム$/, /.*プロセス$/, /.*フレームワーク$/,
      /.*パターン$/, /.*モデル$/, /.*メソッド$/
    ];
    
    if (specializedPatterns.some(pattern => pattern.test(concept))) return true;
    
    // 数学・技術分野の専門概念
    const mathTechConcepts = [
      '素数', '証明', '公式', '定理', '関数', '方程式', '変数', '係数',
      'アルゴリズム', 'データ', 'プログラム', 'コード', 'API', 'JSON'
    ];
    
    if (mathTechConcepts.includes(concept)) return true;
    
    // 長さベースの判定（より厳しく）
    if (concept.length >= 6) return true;
    
    // パターンマッチング
    if (this.conceptPatterns.has(concept.toLowerCase())) {
      const pattern = this.conceptPatterns.get(concept.toLowerCase());
      return pattern.isDeep || pattern.frequency > 3;
    }
    
    // 革新キーワードとの一致
    if (this.revolutionaryKeywords.some(keyword => 
      concept.includes(keyword) || content.includes(concept + keyword)
    )) {
      return true;
    }
    
    // 複合語判定
    if (this.detectNovelCombination(concept)) {
      return true;
    }

    return false;
  }

  /**
   * 意味的深度の分析
   */
  public analyzeSemanticDepth(concept: string, content: string): number {
    let depth = 0;
    
    // 抽象度評価
    const abstractWords = ['概念', '理論', '原理', '本質', '構造', 'システム'];
    if (abstractWords.some(word => concept.includes(word))) {
      depth += 0.3;
    }
    
    // 専門性評価
    const technicalWords = ['アルゴリズム', 'プロセス', 'メソッド', '技術', '手法'];
    if (technicalWords.some(word => concept.includes(word))) {
      depth += 0.25;
    }
    
    // 革新性評価
    const innovationWords = ['革新', '革命', '新', '画期的', '独創'];
    if (innovationWords.some(word => concept.includes(word) || content.includes(concept + word))) {
      depth += 0.3;
    }
    
    // 文脈での重要性
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const contextOccurrences = (content.match(new RegExp(escapedConcept, 'g')) || []).length;
    if (contextOccurrences >= 3) {
      depth += 0.15;
    }

    return Math.min(depth, 1.0);
  }

  /**
   * 文脈的重要度の計算
   */
  public calculateContextualImportance(concept: string, content: string): number {
    let importance = 0;
    
    // 出現頻度
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const occurrences = (content.match(new RegExp(escapedConcept, 'gi')) || []).length;
    importance += Math.min(occurrences * 0.1, 0.3);
    
    // 位置的重要性（文頭・文末での出現）
    const sentences = content.split(/[。！？]/);
    const importantPositions = sentences.filter(sentence => {
      const trimmed = sentence.trim();
      return trimmed.startsWith(concept) || trimmed.endsWith(concept);
    }).length;
    importance += importantPositions * 0.1;
    
    // 強調表現との共起
    const emphasisPatterns = ['重要', '核心', '本質', '中心', 'キー'];
    const emphasisCount = emphasisPatterns.filter(pattern => 
      new RegExp(`${pattern}.*${escapedConcept}|${escapedConcept}.*${pattern}`).test(content)
    ).length;
    importance += emphasisCount * 0.15;

    return Math.min(importance, 1.0);
  }

  /**
   * 構造的重要度の計算
   */
  private calculateStructuralImportance(concept: string, content: string): number {
    let importance = 0;
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 階層的表現での使用
    const hierarchicalPatterns = [
      /^\s*[1-9]\.\s.*${concept}/gm,
      /^\s*[・▪▫]\s.*${concept}/gm,
      /^\s*[-−]\s.*${concept}/gm
    ];
    
    hierarchicalPatterns.forEach(pattern => {
      const matches = content.match(new RegExp(pattern.source.replace('${concept}', escapedConcept), 'gm'));
      if (matches) importance += matches.length * 0.1;
    });
    
    // タイトル・見出しでの使用
    const headingPatterns = [
      new RegExp(`^#{1,6}\\s.*${escapedConcept}`, 'gm'),
      new RegExp(`^.*${escapedConcept}.*:$`, 'gm')
    ];
    
    headingPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) importance += matches.length * 0.2;
    });

    return Math.min(importance, 1.0);
  }

  /**
   * 意味的重要度の計算
   */
  private calculateSemanticImportance(concept: string, content: string): number {
    let importance = 0;
    
    // 関連概念との共起
    const relatedTerms = this.findRelatedTerms(concept);
    relatedTerms.forEach(term => {
      if (content.includes(term)) importance += 0.1;
    });
    
    // 因果関係での使用
    const causalPatterns = [
      `${concept}により`, `${concept}によって`, `${concept}の結果`,
      `${concept}が原因`, `${concept}から生じる`
    ];
    
    causalPatterns.forEach(pattern => {
      if (content.includes(pattern)) importance += 0.15;
    });

    return Math.min(importance, 1.0);
  }

  /**
   * 革新性重要度の計算
   */
  private calculateInnovationImportance(concept: string, content: string): number {
    let importance = 0;
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 革新的文脈での使用
    const innovationContext = [
      '新しい', '革新的', '画期的', '独創的', '先進的',
      '革命的', 'ブレークスルー', '突破'
    ];
    
    innovationContext.forEach(context => {
      if (new RegExp(`${context}.*${escapedConcept}|${escapedConcept}.*${context}`).test(content)) {
        importance += 0.2;
      }
    });
    
    // 比較表現での使用
    const comparisonPatterns = [
      `従来の.*${escapedConcept}`, `新たな${escapedConcept}`, `改良された${escapedConcept}`
    ];
    
    comparisonPatterns.forEach(pattern => {
      if (new RegExp(pattern).test(content)) importance += 0.15;
    });

    return Math.min(importance, 1.0);
  }

  // 補助メソッド群

  private analyzeComplexity(concept: string, content: string): number {
    let complexity = concept.length * 0.1;
    const words = concept.split(/\s+|[・、]/);
    complexity += words.length * 0.2;
    
    return Math.min(complexity, 1.0);
  }

  private analyzeUniqueness(concept: string): number {
    const commonWords = ['こと', 'もの', 'ため', 'よう', '時', '場合', '方法'];
    const isCommon = commonWords.some(word => concept.includes(word));
    
    return isCommon ? 0.2 : 0.8;
  }

  private analyzeContextualFit(concept: string, content: string): number {
    const sentencesWithConcept = content.split(/[。！？]/).filter(s => s.includes(concept));
    const averageSentenceLength = sentencesWithConcept.reduce((sum, s) => sum + s.length, 0) / sentencesWithConcept.length || 0;
    
    return Math.min(averageSentenceLength / 100, 1.0);
  }

  private analyzeInnovationPotential(concept: string, content: string): number {
    const innovationWords = ['革新', '新', '改良', '発展', '進歩', '向上'];
    const innovationScore = innovationWords.filter(word => 
      content.includes(concept + word) || content.includes(word + concept)
    ).length;
    
    return Math.min(innovationScore * 0.25, 1.0);
  }

  private calculateClassificationConfidence(
    isDeep: boolean,
    semanticAnalysis: SemanticAnalysis,
    analysisResult: ConceptAnalysisResult
  ): number {
    const semanticScore = (
      semanticAnalysis.depth +
      semanticAnalysis.contextualImportance +
      semanticAnalysis.semanticImportance
    ) / 3;
    
    const analysisScore = (
      analysisResult.complexity +
      analysisResult.uniqueness +
      analysisResult.innovationPotential
    ) / 3;
    
    let confidence = (semanticScore + analysisScore) / 2;
    
    // Deep分類の場合の調整
    if (isDeep) {
      confidence = Math.max(confidence, 0.7); // 最低信頼度保証
    } else {
      confidence = Math.min(confidence, 0.8); // 上限設定
    }
    
    return Math.min(confidence, 1.0);
  }

  private generateClassificationReasoning(
    concept: string,
    isDeep: boolean,
    semanticAnalysis: SemanticAnalysis,
    analysisResult: ConceptAnalysisResult
  ): string {
    const reasons: string[] = [];
    
    if (isDeep) {
      reasons.push('深層概念として分類');
      
      if (semanticAnalysis.depth > 0.5) {
        reasons.push('高い意味的深度');
      }
      
      if (analysisResult.innovationPotential > 0.5) {
        reasons.push('高い革新性ポテンシャル');
      }
    } else {
      reasons.push('表面概念として分類');
      
      if (semanticAnalysis.contextualImportance > 0.5) {
        reasons.push('文脈的重要性あり');
      }
    }
    
    return reasons.join(', ');
  }

  private generateAnalysisReasoning(
    concept: string,
    complexity: number,
    uniqueness: number,
    contextualFit: number,
    innovationPotential: number
  ): string {
    const features: string[] = [];
    
    if (complexity > 0.6) features.push('複雑性');
    if (uniqueness > 0.6) features.push('独自性');
    if (contextualFit > 0.6) features.push('文脈適合性');
    if (innovationPotential > 0.6) features.push('革新性');
    
    return features.length > 0 ? features.join(', ') : '基本的概念';
  }

  private findMatchedPatterns(concept: string): string[] {
    const patterns: string[] = [];
    
    if (this.conceptPatterns.has(concept.toLowerCase())) {
      patterns.push('既知パターン');
    }
    
    if (this.detectNovelCombination(concept)) {
      patterns.push('新規組み合わせ');
    }
    
    return patterns;
  }

  private findRelatedTerms(concept: string): string[] {
    // 簡易的な関連語検索
    const relatedTermsMap: Record<string, string[]> = {
      'システム': ['構造', 'プロセス', '仕組み'],
      '技術': ['手法', 'メソッド', 'スキル'],
      '学習': ['教育', '理解', '習得'],
      '対話': ['会話', 'コミュニケーション', '相互作用']
    };
    
    for (const [key, terms] of Object.entries(relatedTermsMap)) {
      if (concept.includes(key)) {
        return terms;
      }
    }
    
    return [];
  }

  /**
   * パターン設定の更新
   */
  public updatePatterns(conceptPatterns: Map<string, any>): void {
    this.conceptPatterns = conceptPatterns;
  }

  /**
   * 革新キーワードの更新
   */
  public updateRevolutionaryKeywords(keywords: string[]): void {
    this.revolutionaryKeywords = keywords;
  }

  /**
   * 分類統計の取得
   */
  public getClassificationStats(): {
    totalPatterns: number;
    revolutionaryKeywords: number;
  } {
    return {
      totalPatterns: this.conceptPatterns.size,
      revolutionaryKeywords: this.revolutionaryKeywords.length
    };
  }
}