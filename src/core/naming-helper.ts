#!/usr/bin/env node

/**
 * 構造的対話ログ命名支援ツール
 * 分析結果を基に、より精密な命名提案を行う
 */

import { LogPatternAnalyzer } from './log-pattern-analyzer.js';

interface NamingContext {
  currentPhase?: string;
  previousLogs?: string[];
  contentHints?: {
    isDiscovery?: boolean;
    isTrigger?: boolean;
    isExtension?: boolean;
    isApplication?: boolean;
    isArticle?: boolean;
    isTransition?: boolean;
    isMath?: boolean;
    isExperimental?: boolean;
  };
  dialogueMetrics?: {
    length: number;
    complexity: number;
    newConcepts: number;
  };
}

interface NamingSuggestion {
  filename: string;
  confidence: number;
  reasoning: string;
  category: string;
  phase: string;
  alternatives: string[];
}

class NamingHelper {
  private analyzer: LogPatternAnalyzer;
  private categoryRules: Map<string, RegExp[]>;

  constructor() {
    this.analyzer = new LogPatternAnalyzer();
    this.initializeCategoryRules();
  }

  /**
   * カテゴリ判定ルールの初期化
   */
  private initializeCategoryRules(): void {
    this.categoryRules = new Map([
      ['discovery', [
        /発見|発明|探索|見つけ|気づき|insight|discover/i,
        /初期|開始|最初|begin|start|initial/i,
        /概念|アイデア|考え|思考|concept|idea/i
      ]],
      ['trigger', [
        /トリガー|引き金|きっかけ|trigger|catalyst/i,
        /構造|感染|伝播|structure|propagate|spread/i,
        /実験|テスト|試行|experiment|test|trial/i
      ]],
      ['extension', [
        /拡張|展開|発展|extend|expand|develop/i,
        /応用|活用|実装|apply|implement|use/i,
        /進化|改良|改善|evolve|improve|enhance/i
      ]],
      ['applications', [
        /応用|適用|活用|application|apply|use/i,
        /実用|実践|実際|practical|real|actual/i,
        /事例|ケース|例|case|example|instance/i
      ]],
      ['article', [
        /記事|文章|文書|article|document|paper/i,
        /執筆|作成|書く|write|create|compose/i,
        /公開|発表|publish|release|announce/i
      ]]
    ]);
  }

  /**
   * 既存ログで初期化
   */
  initialize(existingLogs: string[]): void {
    this.analyzer.analyzeExistingLogs(existingLogs);
  }

  /**
   * コンテキストを基にした命名提案
   */
  suggest(content: string, context: NamingContext = {}): NamingSuggestion[] {
    const suggestions: NamingSuggestion[] = [];

    // 1. カテゴリ判定
    const detectedCategory = this.detectCategory(content, context);
    
    // 2. フェーズ判定
    const phase = this.determinePhase(content, context, detectedCategory);
    
    // 3. 基本的な命名提案
    const baseNames = this.generateBaseNames(phase, detectedCategory, context);
    
    // 4. 信頼度計算と代替案生成
    baseNames.forEach(baseName => {
      const confidence = this.calculateConfidence(baseName, content, context);
      const alternatives = this.generateAlternatives(baseName, detectedCategory);
      
      suggestions.push({
        filename: baseName,
        confidence,
        reasoning: this.generateReasoning(baseName, detectedCategory, phase, context),
        category: detectedCategory,
        phase,
        alternatives
      });
    });

    // 信頼度順でソート
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * コンテンツからカテゴリを検出
   */
  private detectCategory(content: string, context: NamingContext): string {
    const scores = new Map<string, number>();

    // ヒントからの判定
    if (context.contentHints) {
      const hints = context.contentHints;
      if (hints.isDiscovery) scores.set('discovery', 0.8);
      if (hints.isTrigger) scores.set('trigger', 0.8);
      if (hints.isExtension) scores.set('extension', 0.8);
      if (hints.isApplication) scores.set('applications', 0.8);
      if (hints.isArticle) scores.set('article', 0.8);
    }

    // テキスト分析による判定
    for (const [category, patterns] of this.categoryRules) {
      let score = 0;
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          score += matches.length * 0.1;
        }
      });
      scores.set(category, (scores.get(category) || 0) + score);
    }

    // 最高スコアのカテゴリを返す
    const bestCategory = Array.from(scores.entries())
      .sort(([,a], [,b]) => b - a)[0];
    
    return bestCategory ? bestCategory[0] : 'discovery';
  }

  /**
   * フェーズ判定
   */
  private determinePhase(content: string, context: NamingContext, category: string): string {
    // 明示的なフェーズ指定があれば使用
    if (context.currentPhase) {
      return context.currentPhase;
    }

    // カテゴリとコンテンツから推定
    const contentLower = content.toLowerCase();
    
    if (category === 'discovery' || contentLower.includes('最初') || contentLower.includes('開始')) {
      return 'p00';
    }
    
    if (category === 'article' || contentLower.includes('記事') || contentLower.includes('文書')) {
      return 'p01';
    }
    
    if (category === 'trigger' || contentLower.includes('実験') || contentLower.includes('テスト')) {
      return 'p02';
    }
    
    if (category === 'applications' || contentLower.includes('応用') || contentLower.includes('活用')) {
      return 'p03';
    }
    
    if (category === 'extension' || contentLower.includes('拡張') || contentLower.includes('発展')) {
      return 'p05';
    }

    // デフォルトは最新フェーズの継続
    return 'p02'; // 最も活発なフェーズ
  }

  /**
   * 基本的な命名候補生成
   */
  private generateBaseNames(phase: string, category: string, context: NamingContext): string[] {
    const names: string[] = [];
    
    // 既存パターンから次の番号を推定
    const nextNumber = this.getNextNumber(phase, category);
    
    // 標準命名
    names.push(`log_${phase}_${category}_${nextNumber.toString().padStart(2, '0')}.md`);
    
    // 特殊ケース
    if (context.contentHints?.isMath) {
      names.push(`log_${phase}_trial_math_${nextNumber.toString().padStart(2, '0')}.md`);
    }
    
    if (context.contentHints?.isTransition) {
      names.push(`log_${phase}_${category}_${nextNumber.toString().padStart(2, '0')}_turning.md`);
    }

    return names;
  }

  /**
   * 次の番号を取得
   */
  private getNextNumber(phase: string, category: string): number {
    // 実際の実装では analyzer の結果を使用
    const phaseMap = new Map([
      ['p00', new Map([['discovery', 4]])],
      ['p01', new Map([['article', 2]])],
      ['p02', new Map([['trigger', 10], ['trial', 2]])],
      ['p03', new Map([['applications', 2]])],
      ['p05', new Map([['extension', 8]])]
    ]);

    const categoryMap = phaseMap.get(phase);
    return categoryMap ? (categoryMap.get(category) || 1) : 1;
  }

  /**
   * 信頼度計算
   */
  private calculateConfidence(filename: string, content: string, context: NamingContext): number {
    let confidence = 0.5; // ベース信頼度

    // コンテキストヒントがある場合
    if (context.contentHints) {
      confidence += 0.2;
    }

    // 現在のフェーズが明示されている場合
    if (context.currentPhase) {
      confidence += 0.2;
    }

    // コンテンツの長さ・複雑さ
    if (context.dialogueMetrics) {
      const metrics = context.dialogueMetrics;
      if (metrics.length > 1000) confidence += 0.1;
      if (metrics.newConcepts > 3) confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 代替案生成
   */
  private generateAlternatives(baseName: string, category: string): string[] {
    const alternatives: string[] = [];
    const parts = baseName.split('_');
    
    if (parts.length >= 4) {
      const [log, phase, , number] = parts;
      
      // 他カテゴリ案
      const otherCategories = ['discovery', 'trigger', 'extension', 'applications', 'article']
        .filter(cat => cat !== category);
      
      otherCategories.slice(0, 2).forEach(altCategory => {
        alternatives.push(`${log}_${phase}_${altCategory}_${number}`);
      });
    }
    
    return alternatives;
  }

  /**
   * 命名理由生成
   */
  private generateReasoning(
    filename: string, 
    category: string, 
    phase: string, 
    context: NamingContext
  ): string {
    const reasons: string[] = [];
    
    reasons.push(`カテゴリ「${category}」として判定`);
    reasons.push(`フェーズ「${phase}」での継続`);
    
    if (context.currentPhase) {
      reasons.push(`現在フェーズ（${context.currentPhase}）を考慮`);
    }
    
    if (context.contentHints) {
      const hints = Object.entries(context.contentHints)
        .filter(([, value]) => value)
        .map(([key]) => key);
      if (hints.length > 0) {
        reasons.push(`コンテンツヒント: ${hints.join(', ')}`);
      }
    }
    
    return reasons.join(', ');
  }
}

// 使用例
// テスト実行用（直接実行時のみ）
if (import.meta.url === `file://${process.argv[1]}`) {
  const helper = new NamingHelper();
  
  // 既存ログで初期化
  const existingLogs = [
    'log_p00_discovery_01.md',
    'log_p00_discovery_02.md', 
    'log_p00_discovery_03.md',
    'log_p01_article_01.md',
    'log_p02_trigger_01.md',
    'log_p02_trigger_02.md',
    'log_p02_trigger_03.md',
    'log_p02_trigger_04.md',
    'log_p02_trigger_05.md',
    'log_p02_trigger_06.md',
    'log_p02_trigger_07.md',
    'log_p02_trigger_08.md',
    'log_p02_trigger_09.md',
    'log_p05_extension_01.md',
    'log_p05_extension_02.md',
    'log_p05_extension_03.md',
    'log_p05_extension_04.md',
    'log_p05_extension_05.md',
    'log_p05_extension_06.md',
    'log_p05_extension_07.md'
  ];
  
  helper.initialize(existingLogs);
  
  // テスト用のコンテンツ
  const testContent = `
    新しい構造的対話の実験を開始します。
    今回は異なるAIモデル間での対話構造の転送について検証します。
    特にトリガー機能の改良を試みます。
  `;
  
  const context: NamingContext = {
    currentPhase: 'p02',
    contentHints: {
      isTrigger: true,
      isExperimental: true
    },
    dialogueMetrics: {
      length: 1500,
      complexity: 3,
      newConcepts: 2
    }
  };
  
  console.log('🎯 命名支援ツール - テスト実行');
  console.log('='.repeat(40));
  
  const suggestions = helper.suggest(testContent, context);
  
  console.log('\n💡 命名提案:');
  suggestions.forEach((suggestion, index) => {
    console.log(`\n${index + 1}. ${suggestion.filename}`);
    console.log(`   信頼度: ${(suggestion.confidence * 100).toFixed(1)}%`);
    console.log(`   理由: ${suggestion.reasoning}`);
    console.log(`   代替案: ${suggestion.alternatives.join(', ')}`);
  });
}

export { NamingHelper, NamingContext, NamingSuggestion };