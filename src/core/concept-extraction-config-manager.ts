#!/usr/bin/env node

/**
 * ConceptExtractionConfigManager - 概念抽出設定管理
 * 
 * ストップワード・概念定義・パターンの外部化による
 * 設定管理・動的更新・カスタマイズ機能
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ConceptExtractionConfig {
  version: string;
  lastUpdated: string;
  description: string;
  stopWords: {
    particles: string[];
    basicVerbs: string[];
    pronouns: string[];
    timeNumbers: string[];
    generalTech: string[];
    commonTechTerms: string[];
    dialogueBasic: string[];
  };
  conceptIndicators: {
    revolutionary: string[];
    mathematical: string[];
    philosophical: string[];
    structuralInnovative: string[];
    structuralBasic: string[];
  };
  patterns: {
    badCombinations: string[][];
    quotedPatterns: string[];
    emergencePatterns: Array<{
      pattern: string;
      indicator: string;
    }>;
  };
  thresholds: {
    minConceptLength: number;
    maxConceptLength: number;
    stopWordExclusionScore: number;
    revolutionaryConceptBonus: number;
    innovationSimilarityBonus: number;
    complexityBonus: number;
    commonTechPenalty: number;
    structuralBasicPenalty: number;
  };
  metaConceptPatterns: {
    selfObservation: string[];
    structuralInfection: string[];
    conversationMeta: string[];
  };
}

export class ConceptExtractionConfigManager {
  private config: ConceptExtractionConfig | null = null;
  private configPath: string;
  private flatStopWords: string[] | null = null;
  
  // 🚀 Phase 4キャッシュシステム: 設定データキャッシュ
  private configCache: { data: ConceptExtractionConfig; lastModified: number } | null = null;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10分間有効

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'src/config/concept-extraction-config.json');
  }

  /**
   * 設定ファイルを読み込む
   */
  async loadConfig(): Promise<ConceptExtractionConfig> {
    try {
      // 🚀 Phase 4キャッシュ最適化: ファイル更新時刻チェック
      const stats = await fs.stat(this.configPath);
      const fileModified = stats.mtime.getTime();
      const now = Date.now();
      
      if (this.configCache && 
          this.configCache.lastModified === fileModified && 
          (now - fileModified) < this.CACHE_TTL) {
        console.log('⚡ キャッシュから設定データを取得');
        this.config = this.configCache.data;
        return this.config;
      }
      
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config: ConceptExtractionConfig = JSON.parse(configData);
      this.config = config;
      this.flatStopWords = null; // キャッシュクリア
      
      // キャッシュに保存
      this.configCache = {
        data: config,
        lastModified: fileModified
      };
      
      console.log(`✅ 概念抽出設定読み込み完了: v${config.version} (${this.getTotalStopWordsCount()}個のストップワード)`);
      return config;
    } catch (error) {
      console.warn(`⚠️ 設定ファイル読み込み失敗 (${this.configPath}):`, error);
      throw new Error(`設定ファイルが見つかりません: ${this.configPath}`);
    }
  }

  /**
   * 設定が読み込まれているかチェック
   */
  ensureLoaded(): ConceptExtractionConfig {
    if (!this.config) {
      throw new Error('設定ファイルが読み込まれていません。loadConfig()を呼び出してください。');
    }
    return this.config;
  }

  /**
   * フラット化されたストップワードリストを取得
   */
  getFlatStopWords(): string[] {
    if (this.flatStopWords) {
      return this.flatStopWords;
    }

    const config = this.ensureLoaded();
    this.flatStopWords = [
      ...config.stopWords.particles,
      ...config.stopWords.basicVerbs,
      ...config.stopWords.pronouns,
      ...config.stopWords.timeNumbers,
      ...config.stopWords.generalTech,
      ...config.stopWords.commonTechTerms,
      ...config.stopWords.dialogueBasic
    ];

    return this.flatStopWords;
  }

  /**
   * 特定カテゴリのストップワードを取得
   */
  getStopWordsByCategory(category: keyof ConceptExtractionConfig['stopWords']): string[] {
    const config = this.ensureLoaded();
    return config.stopWords[category] || [];
  }

  /**
   * 革新概念指標を取得
   */
  getRevolutionaryIndicators(): string[] {
    const config = this.ensureLoaded();
    return config.conceptIndicators.revolutionary;
  }

  /**
   * 一般技術用語を取得
   */
  getCommonTechTerms(): string[] {
    const config = this.ensureLoaded();
    return config.conceptIndicators.structuralBasic;
  }

  /**
   * 構造的革新概念を取得
   */
  getStructuralInnovativeTerms(): string[] {
    const config = this.ensureLoaded();
    return config.conceptIndicators.structuralInnovative;
  }

  /**
   * 悪い組み合わせパターンを取得
   */
  getBadCombinations(): string[][] {
    const config = this.ensureLoaded();
    return config.patterns.badCombinations;
  }

  /**
   * 引用符パターンを取得
   */
  getQuotedPatterns(): RegExp[] {
    const config = this.ensureLoaded();
    return config.patterns.quotedPatterns.map(pattern => new RegExp(pattern, 'g'));
  }

  /**
   * 創発パターンを取得
   */
  getEmergencePatterns(): Array<{ pattern: RegExp; indicator: string }> {
    const config = this.ensureLoaded();
    return config.patterns.emergencePatterns.map(p => ({
      pattern: new RegExp(p.pattern),
      indicator: p.indicator
    }));
  }

  /**
   * 閾値を取得
   */
  getThresholds(): ConceptExtractionConfig['thresholds'] {
    const config = this.ensureLoaded();
    return config.thresholds;
  }

  /**
   * メタ概念パターンを取得
   */
  getMetaConceptPatterns(): ConceptExtractionConfig['metaConceptPatterns'] {
    const config = this.ensureLoaded();
    return config.metaConceptPatterns;
  }

  /**
   * 全ストップワード数を取得
   */
  getTotalStopWordsCount(): number {
    if (!this.config) return 0;
    
    return Object.values(this.config.stopWords)
      .reduce((total, words) => total + words.length, 0);
  }

  /**
   * 設定統計情報を取得
   */
  getConfigStats(): {
    version: string;
    totalStopWords: number;
    categories: Record<string, number>;
    patterns: {
      badCombinations: number;
      quotedPatterns: number;
      emergencePatterns: number;
    };
    metaPatterns: Record<string, number>;
  } {
    const config = this.ensureLoaded();
    
    return {
      version: config.version,
      totalStopWords: this.getTotalStopWordsCount(),
      categories: Object.fromEntries(
        Object.entries(config.stopWords).map(([key, words]) => [key, words.length])
      ),
      patterns: {
        badCombinations: config.patterns.badCombinations.length,
        quotedPatterns: config.patterns.quotedPatterns.length,
        emergencePatterns: config.patterns.emergencePatterns.length
      },
      metaPatterns: Object.fromEntries(
        Object.entries(config.metaConceptPatterns).map(([key, words]) => [key, words.length])
      )
    };
  }

  /**
   * カスタム設定でストップワードを追加
   */
  async addCustomStopWords(category: keyof ConceptExtractionConfig['stopWords'], words: string[]): Promise<void> {
    const config = this.ensureLoaded();
    config.stopWords[category].push(...words);
    config.lastUpdated = new Date().toISOString().split('T')[0];
    
    // 🚀 Phase 4軽微最適化: ファイル保存とキャッシュクリアの並列処理
    await Promise.all([
      this.saveConfig(),
      Promise.resolve(this.flatStopWords = null) // キャッシュクリア（同期処理をPromiseでラップ）
    ]);
    
    console.log(`✅ カスタムストップワード追加: ${category} (+${words.length}個)`);
  }

  /**
   * 設定ファイルを保存
   */
  private async saveConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('保存する設定がありません');
    }

    const configData = JSON.stringify(this.config, null, 2);
    await fs.writeFile(this.configPath, configData, 'utf-8');
  }

  /**
   * 設定のバリデーション
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const config = this.ensureLoaded();
    const errors: string[] = [];

    // 必須フィールドのチェック
    if (!config.version) errors.push('version フィールドが必要です');
    if (!config.stopWords) errors.push('stopWords フィールドが必要です');
    if (!config.conceptIndicators) errors.push('conceptIndicators フィールドが必要です');
    if (!config.patterns) errors.push('patterns フィールドが必要です');
    if (!config.thresholds) errors.push('thresholds フィールドが必要です');

    // ストップワードの重複チェック
    const allStopWords = this.getFlatStopWords();
    const duplicates = allStopWords.filter((word, index) => allStopWords.indexOf(word) !== index);
    if (duplicates.length > 0) {
      errors.push(`重複するストップワード: ${duplicates.slice(0, 5).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}