#!/usr/bin/env node

/**
 * 構造的対話ログの書式分析・統一化ツール
 * 既存ログの書式パターンを分析し、標準書式を提案・適用する
 */

interface LogStructure {
  filename: string;
  title: string;
  sections: Section[];
  markdownElements: string[];
  language: 'ja' | 'en' | 'mixed';
  complexity: number;
}

interface Section {
  level: number;
  title: string;
  emoji?: string;
  content: string[];
  subsections: Section[];
}

interface FormatPattern {
  name: string;
  frequency: number;
  examples: string[];
  characteristics: string[];
}

interface StandardFormat {
  template: string;
  requiredSections: string[];
  optionalSections: string[];
  markdownRules: string[];
  emojiConvention: Map<string, string>;
}

class LogFormatAnalyzer {
  private structures: LogStructure[] = [];
  private patterns: Map<string, FormatPattern> = new Map();
  private standardFormat: StandardFormat | null = null;

  /**
   * 既存ログファイルの書式を分析
   */
  analyzeLogFormats(logContents: Map<string, string>): void {
    console.log('📋 ログ書式分析開始...');
    
    // 各ログファイルの構造解析
    for (const [filename, content] of logContents) {
      const structure = this.parseLogStructure(filename, content);
      if (structure) {
        this.structures.push(structure);
      }
    }

    // パターン抽出
    this.extractFormatPatterns();
    
    // 標準書式生成
    this.generateStandardFormat();
    
    // 結果出力
    this.printAnalysisResults();
  }

  /**
   * ログファイルの構造解析
   */
  private parseLogStructure(filename: string, content: string): LogStructure | null {
    const lines = content.split('\n');
    const sections: Section[] = [];
    const markdownElements: string[] = [];
    
    let currentSection: Section | null = null;
    let title = filename;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // タイトル抽出
      if (line.startsWith('# ') && i < 5) {
        title = line.substring(2).trim();
      }
      
      // セクション見出し検出
      const headingMatch = line.match(/^(#{1,6})\s*(.+)$/);
      if (headingMatch) {
        const [, hashes, headingText] = headingMatch;
        const level = hashes.length;
        
        // 絵文字検出
        const emojiMatch = headingText.match(/^([^\w\s]+)\s*(.+)$/);
        const emoji = emojiMatch ? emojiMatch[1] : undefined;
        const cleanTitle = emojiMatch ? emojiMatch[2] : headingText;
        
        // 新しいセクション作成
        currentSection = {
          level,
          title: cleanTitle,
          emoji,
          content: [],
          subsections: []
        };
        
        sections.push(currentSection);
      }
      
      // コンテンツ収集
      if (currentSection && !line.startsWith('#')) {
        if (line.length > 0) {
          currentSection.content.push(line);
        }
      }
      
      // マークダウン要素検出
      this.detectMarkdownElements(line, markdownElements);
    }

    return {
      filename,
      title,
      sections,
      markdownElements: [...new Set(markdownElements)],
      language: this.detectLanguage(content),
      complexity: this.calculateComplexity(sections)
    };
  }

  /**
   * マークダウン要素検出
   */
  private detectMarkdownElements(line: string, elements: string[]): void {
    const patterns = [
      { pattern: /^-\s/, element: 'unordered_list' },
      { pattern: /^\d+\.\s/, element: 'ordered_list' },
      { pattern: /^>\s/, element: 'blockquote' },
      { pattern: /^```/, element: 'code_block' },
      { pattern: /`[^`]+`/, element: 'inline_code' },
      { pattern: /\*\*[^*]+\*\*/, element: 'bold' },
      { pattern: /\*[^*]+\*/, element: 'italic' },
      { pattern: /\[[^\]]+\]\([^)]+\)/, element: 'link' },
      { pattern: /^---+$/, element: 'horizontal_rule' },
      { pattern: /^#{1,6}\s/, element: 'heading' },
      { pattern: /^\|/, element: 'table' }
    ];

    patterns.forEach(({ pattern, element }) => {
      if (pattern.test(line)) {
        elements.push(element);
      }
    });
  }

  /**
   * 言語検出
   */
  private detectLanguage(content: string): 'ja' | 'en' | 'mixed' {
    const japaneseChars = content.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g);
    const englishWords = content.match(/[a-zA-Z]{2,}/g);
    
    const japaneseRatio = japaneseChars ? japaneseChars.length / content.length : 0;
    const englishRatio = englishWords ? englishWords.join('').length / content.length : 0;
    
    if (japaneseRatio > 0.3) return 'ja';
    if (englishRatio > 0.5) return 'en';
    return 'mixed';
  }

  /**
   * 複雑さ計算
   */
  private calculateComplexity(sections: Section[]): number {
    let complexity = 0;
    sections.forEach(section => {
      complexity += section.level; // 見出しレベル
      complexity += section.content.length * 0.1; // コンテンツ量
      complexity += section.subsections.length * 2; // サブセクション
    });
    return Math.round(complexity);
  }

  /**
   * 書式パターン抽出
   */
  private extractFormatPatterns(): void {
    const sectionTitles = new Map<string, number>();
    const emojiUsage = new Map<string, number>();
    const markdownUsage = new Map<string, number>();

    this.structures.forEach(structure => {
      // セクションタイトル集計
      structure.sections.forEach(section => {
        const title = section.title.toLowerCase();
        sectionTitles.set(title, (sectionTitles.get(title) || 0) + 1);
        
        if (section.emoji) {
          emojiUsage.set(section.emoji, (emojiUsage.get(section.emoji) || 0) + 1);
        }
      });

      // マークダウン要素集計
      structure.markdownElements.forEach(element => {
        markdownUsage.set(element, (markdownUsage.get(element) || 0) + 1);
      });
    });

    // 頻出パターンを格納
    this.patterns.set('section_titles', {
      name: 'よく使われるセクションタイトル',
      frequency: sectionTitles.size,
      examples: Array.from(sectionTitles.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([title, count]) => `${title} (${count}回)`),
      characteristics: ['日本語が主流', '概要・背景・特徴が頻出']
    });

    this.patterns.set('emoji_usage', {
      name: '絵文字使用パターン',
      frequency: emojiUsage.size,
      examples: Array.from(emojiUsage.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([emoji, count]) => `${emoji} (${count}回)`),
      characteristics: ['セクション見出しに使用', '意味的なカテゴリ分け']
    });

    this.patterns.set('markdown_elements', {
      name: 'マークダウン要素',
      frequency: markdownUsage.size,
      examples: Array.from(markdownUsage.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([element, count]) => `${element} (${count}ファイル)`),
      characteristics: ['リストが最頻出', 'コードブロックは少ない']
    });
  }

  /**
   * 標準書式生成
   */
  private generateStandardFormat(): void {
    const commonSections = [
      '概要', 'タイトル', '背景', '主な特徴', '内容', 'トピック',
      '構造', '意義', '関連', '備考'
    ];

    const emojiMap = new Map([
      ['概要', '📋'],
      ['背景', '✅'],
      ['特徴', '🧠'],
      ['内容', '📝'],
      ['構造', '🧩'],
      ['意義', '💡'],
      ['関連', '🔗'],
      ['備考', '📌']
    ]);

    this.standardFormat = {
      template: this.createStandardTemplate(),
      requiredSections: ['概要', '内容'],
      optionalSections: ['背景', '特徴', '構造', '意義', '関連', '備考'],
      markdownRules: [
        'セクション見出しには絵文字を使用',
        'リスト項目は "-" を使用',
        '強調は **太字** を使用',
        'ファイル名は `コード` 形式',
        '区切りは --- を使用'
      ],
      emojiConvention: emojiMap
    };
  }

  /**
   * 標準テンプレート作成
   */
  private createStandardTemplate(): string {
    return `# {filename}

## 📋 概要
{overview}

## ✅ 背景
{background}

## 🧠 主な特徴
{features}

## 📝 内容
{content}

## 🧩 構造
{structure}

## 💡 意義
{significance}

## 🔗 関連ログ・ドキュメント
{related}

## 📌 備考
{notes}

---
記録日: {date}
フェーズ: {phase}
カテゴリ: {category}`;
  }

  /**
   * 分析結果出力
   */
  private printAnalysisResults(): void {
    console.log('\n📊 書式分析結果');
    console.log('='.repeat(50));
    
    console.log(`\n📈 統計情報:`);
    console.log(`  分析ファイル数: ${this.structures.length}`);
    console.log(`  検出パターン数: ${this.patterns.size}`);
    
    console.log(`\n🗂️ 言語分布:`);
    const langCounts = new Map<string, number>();
    this.structures.forEach(s => {
      langCounts.set(s.language, (langCounts.get(s.language) || 0) + 1);
    });
    langCounts.forEach((count, lang) => {
      console.log(`    ${lang}: ${count}ファイル`);
    });

    console.log(`\n📋 発見されたパターン:`);
    for (const [key, pattern] of this.patterns) {
      console.log(`\n  ${pattern.name}:`);
      pattern.examples.forEach(example => {
        console.log(`    - ${example}`);
      });
    }

    if (this.standardFormat) {
      console.log(`\n✨ 推奨標準書式:`);
      console.log(`  必須セクション: ${this.standardFormat.requiredSections.join(', ')}`);
      console.log(`  推奨セクション: ${this.standardFormat.optionalSections.join(', ')}`);
      console.log(`  マークダウンルール:`);
      this.standardFormat.markdownRules.forEach(rule => {
        console.log(`    - ${rule}`);
      });
    }
  }

  /**
   * 書式統一化の提案
   */
  suggestFormatUnification(logContent: string, filename: string): string {
    if (!this.standardFormat) {
      throw new Error('標準書式が生成されていません');
    }

    const structure = this.parseLogStructure(filename, logContent);
    if (!structure) {
      return logContent;
    }

    // 既存セクションのマッピング
    const sectionMap = new Map<string, string>();
    structure.sections.forEach(section => {
      const normalized = this.normalizeTitle(section.title);
      sectionMap.set(normalized, section.content.join('\n'));
    });

    // 標準書式での再構成
    let standardized = this.standardFormat.template;
    
    // プレースホルダーの置換
    const replacements = new Map([
      ['filename', structure.title],
      ['overview', sectionMap.get('概要') || ''],
      ['background', sectionMap.get('背景') || ''],
      ['features', sectionMap.get('特徴') || ''],
      ['content', sectionMap.get('内容') || ''],
      ['structure', sectionMap.get('構造') || ''],
      ['significance', sectionMap.get('意義') || ''],
      ['related', sectionMap.get('関連') || ''],
      ['notes', sectionMap.get('備考') || ''],
      ['date', new Date().toISOString().split('T')[0]],
      ['phase', this.extractPhase(filename)],
      ['category', this.extractCategory(filename)]
    ]);

    replacements.forEach((value, key) => {
      standardized = standardized.replace(`{${key}}`, value);
    });

    return standardized;
  }

  /**
   * タイトル正規化
   */
  private normalizeTitle(title: string): string {
    return title
      .replace(/^[^\w\s]+\s*/, '') // 絵文字削除
      .toLowerCase()
      .trim();
  }

  /**
   * ファイル名からフェーズ抽出
   */
  private extractPhase(filename: string): string {
    const match = filename.match(/log_([^_]+)_/);
    return match ? match[1] : '';
  }

  /**
   * ファイル名からカテゴリ抽出
   */
  private extractCategory(filename: string): string {
    const match = filename.match(/log_[^_]+_([^_]+)_/);
    return match ? match[1] : '';
  }

  /**
   * 分析結果のエクスポート
   */
  exportAnalysis(): object {
    return {
      structures: this.structures,
      patterns: Object.fromEntries(this.patterns),
      standardFormat: this.standardFormat,
      statistics: {
        totalFiles: this.structures.length,
        averageComplexity: this.structures.reduce((sum, s) => sum + s.complexity, 0) / this.structures.length,
        commonElements: Array.from(this.patterns.keys())
      }
    };
  }
}

// テストデータ（実際の使用時はGitHubから取得）
const sampleLogContents = new Map([
  ['log_p00_discovery_01.md', `# log_p00_discovery_01.md

## ✅ 背景
構造的対話の発見フェーズ

## 🧠 発芽の特徴（抜粋）
- 初期的な概念形成
- AIとの対話実験

## 📝 内容
対話構造の初期探索について記録

## 🔗 関連ログ・ドキュメント
- log_p00_discovery_02.md`],
  
  ['log_p02_trigger_01.md', `# log_p02_trigger_01.md

## 概要
トリガーフェーズの実験記録

## 主なキーワード
- 構造的対話の持続性
- AIモデル間比較`]
]);

// 実行
// テスト実行用（直接実行時のみ）
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new LogFormatAnalyzer();
  
  console.log('📋 構造的対話ログ書式分析ツール');
  console.log('='.repeat(50));
  
  analyzer.analyzeLogFormats(sampleLogContents);
  
  // 統一化提案のテスト
  console.log('\n🔧 書式統一化テスト:');
  try {
    const unified = analyzer.suggestFormatUnification(
      sampleLogContents.get('log_p02_trigger_01.md') || '',
      'log_p02_trigger_01.md'
    );
    console.log('\n統一化後:');
    console.log('---');
    console.log(unified.substring(0, 500) + '...');
  } catch (error) {
    console.log(`エラー: ${error}`);
  }
}

export { LogFormatAnalyzer, LogStructure, StandardFormat };