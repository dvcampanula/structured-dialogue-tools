#!/usr/bin/env node

/**
 * 構造的対話ログファイルの命名パターン分析ツール
 * 既存のログファイルを分析し、命名規則を抽出する
 */

interface LogFileInfo {
  filename: string;
  phase: string;
  category: string;
  number: number;
  fullPath?: string;
}

interface NamingPattern {
  phase: string;
  categories: string[];
  numberRange: { min: number; max: number };
  count: number;
}

interface PhaseTransition {
  from: string;
  to: string;
  pattern: string;
  frequency: number;
}

class LogPatternAnalyzer {
  private logFiles: LogFileInfo[] = [];
  private patterns: Map<string, NamingPattern> = new Map();
  private transitions: PhaseTransition[] = [];

  /**
   * 既存ログファイルリストを解析
   * GitHub APIまたは手動リストから取得したファイル名を分析
   */
  analyzeExistingLogs(filenames: string[]): void {
    console.log('🔍 ログファイル分析開始...');
    
    // ファイル名パース
    this.logFiles = filenames
      .filter(name => name.startsWith('log_') && name.endsWith('.md'))
      .map(this.parseLogFileName)
      .filter(info => info !== null) as LogFileInfo[];

    console.log(`📊 分析対象ファイル数: ${this.logFiles.length}`);
    
    // パターン抽出
    this.extractNamingPatterns();
    this.analyzePhaseTransitions();
    
    // 結果出力
    this.printAnalysisResults();
  }

  /**
   * ログファイル名を構造化
   * log_p02_trigger_01.md → { phase: "p02", category: "trigger", number: 1 }
   * log_p02_trial_math_01.md → { phase: "p02", category: "trial_math", number: 1 }
   * log_p06_reflection_01_claude.md → { phase: "p06", category: "reflection", number: 1 }
   */
  private parseLogFileName(filename: string): LogFileInfo | null {
    // 複雑なパターンに対応した正規表現
    const patterns = [
      // 標準パターン: log_pXX_category_NN.md
      /^log_([^_]+)_([^_]+)_(\d+)\.md$/,
      // 複合カテゴリ: log_pXX_category_subcategory_NN.md
      /^log_([^_]+)_([^_]+_[^_]+)_(\d+)\.md$/,
      // モデル名付き: log_pXX_category_NN_modelname.md
      /^log_([^_]+)_([^_]+)_(\d+)_([^_]+)\.md$/,
      // 特殊サフィックス: log_pXX_category_NN_suffix.md
      /^log_([^_]+)_([^_]+)_(\d+|[^_]+)_([^_]+)\.md$/,
      // 数字なしパターン: log_pXX_category_suffix.md
      /^log_([^_]+)_([^_]+)_([^_]+)\.md$/
    ];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        const [, phase, category, numberOrSuffix, suffix] = match;
        
        // 数字の抽出
        let number = 0;
        let finalCategory = category;
        
        if (/^\d+$/.test(numberOrSuffix)) {
          number = parseInt(numberOrSuffix);
        } else if (numberOrSuffix === '00') {
          number = 0;
        } else {
          // 数字でない場合は、カテゴリの一部として扱う
          if (suffix) {
            // log_p02_trigger_00_turning.md の場合
            if (/^\d+$/.test(numberOrSuffix)) {
              number = parseInt(numberOrSuffix);
            }
          } else {
            // log_pXX_category_suffix.md の場合
            finalCategory = `${category}_${numberOrSuffix}`;
          }
        }

        return {
          filename,
          phase,
          category: finalCategory,
          number
        };
      }
    }

    console.warn(`⚠️  パース失敗: ${filename}`);
    return null;
  }

  /**
   * フェーズごとの命名パターン抽出
   */
  private extractNamingPatterns(): void {
    const phaseGroups = this.groupByPhase();
    
    for (const [phase, files] of phaseGroups) {
      const categories = [...new Set(files.map(f => f.category))];
      const numbers = files.map(f => f.number).filter(n => n > 0);
      
      const pattern: NamingPattern = {
        phase,
        categories,
        numberRange: {
          min: Math.min(...numbers),
          max: Math.max(...numbers)
        },
        count: files.length
      };
      
      this.patterns.set(phase, pattern);
    }
  }

  /**
   * フェーズ遷移パターンの分析
   */
  private analyzePhaseTransitions(): void {
    const sortedFiles = this.logFiles.sort((a, b) => {
      const phaseA = parseInt(a.phase.replace('p', ''));
      const phaseB = parseInt(b.phase.replace('p', ''));
      return phaseA - phaseB || a.number - b.number;
    });

    const transitions = new Map<string, number>();
    
    for (let i = 1; i < sortedFiles.length; i++) {
      const prev = sortedFiles[i - 1];
      const curr = sortedFiles[i];
      
      if (prev.phase !== curr.phase) {
        const key = `${prev.phase}->${curr.phase}`;
        transitions.set(key, (transitions.get(key) || 0) + 1);
      }
    }

    this.transitions = Array.from(transitions.entries()).map(([pattern, frequency]) => {
      const [from, to] = pattern.split('->');
      return { from, to, pattern, frequency };
    });
  }

  /**
   * フェーズごとにグループ化
   */
  private groupByPhase(): Map<string, LogFileInfo[]> {
    return this.logFiles.reduce((groups, file) => {
      const phase = file.phase;
      if (!groups.has(phase)) {
        groups.set(phase, []);
      }
      groups.get(phase)!.push(file);
      return groups;
    }, new Map<string, LogFileInfo[]>());
  }

  /**
   * 分析結果の出力
   */
  private printAnalysisResults(): void {
    console.log('\n📈 命名パターン分析結果');
    console.log('='.repeat(50));
    
    // フェーズ別パターン
    console.log('\n🎯 フェーズ別パターン:');
    for (const [phase, pattern] of this.patterns) {
      console.log(`\n${phase}:`);
      console.log(`  カテゴリ: ${pattern.categories.join(', ')}`);
      console.log(`  番号範囲: ${pattern.numberRange.min}-${pattern.numberRange.max}`);
      console.log(`  ファイル数: ${pattern.count}`);
    }

    // フェーズ遷移
    console.log('\n🔄 フェーズ遷移パターン:');
    this.transitions.forEach(t => {
      console.log(`  ${t.from} → ${t.to} (${t.frequency}回)`);
    });

    // 統計情報
    console.log('\n📊 統計情報:');
    console.log(`  総ファイル数: ${this.logFiles.length}`);
    console.log(`  フェーズ数: ${this.patterns.size}`);
    console.log(`  カテゴリ数: ${this.getAllCategories().size}`);
  }

  /**
   * 全カテゴリ取得
   */
  private getAllCategories(): Set<string> {
    return new Set(this.logFiles.map(f => f.category));
  }

  /**
   * 新しいログファイル名を提案
   */
  suggestFileName(
    content: string,
    currentPhase?: string,
    hints?: { category?: string; isNewPhase?: boolean }
  ): string[] {
    const suggestions: string[] = [];
    
    // 現在のフェーズから次の番号を推定
    if (currentPhase && this.patterns.has(currentPhase)) {
      const pattern = this.patterns.get(currentPhase)!;
      const nextNumber = pattern.numberRange.max + 1;
      
      // カテゴリ候補
      const categories = hints?.category ? [hints.category] : pattern.categories;
      
      categories.forEach(category => {
        const filename = `log_${currentPhase}_${category}_${nextNumber.toString().padStart(2, '0')}.md`;
        suggestions.push(filename);
      });
    }

    // 新フェーズの場合
    if (hints?.isNewPhase) {
      const nextPhase = this.getNextPhase(currentPhase);
      if (nextPhase) {
        suggestions.push(`log_${nextPhase}_discovery_01.md`);
        suggestions.push(`log_${nextPhase}_init_01.md`);
      }
    }

    return suggestions;
  }

  /**
   * 次のフェーズ番号を推定
   */
  private getNextPhase(currentPhase?: string): string | null {
    if (!currentPhase) return 'p00';
    
    const phaseNum = parseInt(currentPhase.replace('p', ''));
    return `p${(phaseNum + 1).toString().padStart(2, '0')}`;
  }

  /**
   * 分析結果をJSONで出力
   */
  exportAnalysis(): object {
    return {
      patterns: Object.fromEntries(this.patterns),
      transitions: this.transitions,
      statistics: {
        totalFiles: this.logFiles.length,
        phaseCount: this.patterns.size,
        categoryCount: this.getAllCategories().size,
        categories: Array.from(this.getAllCategories())
      }
    };
  }
}

// 実際の既存ログファイルリスト（完全版 - GitHubから取得）
const existingLogFiles = [
  'log_p00_discovery_01.md',
  'log_p00_discovery_02.md', 
  'log_p00_discovery_03.md',
  'log_p01_article_01.md',
  'log_p01_init_01.md',
  'log_p02_propagation_01.md',
  'log_p02_trial_math_01.md',
  'log_p02_trial_math_02.md',
  'log_p02_trigger_00_turning.md',
  'log_p02_trigger_01.md',
  'log_p02_trigger_02.md',
  'log_p02_trigger_03.md',
  'log_p02_trigger_04.md',
  'log_p02_trigger_05.md',
  'log_p02_trigger_06.md',
  'log_p02_trigger_07.md',
  'log_p02_trigger_08.md',
  'log_p02_trigger_09.md',
  'log_p03_applications_01.md',
  'log_p03_finalize_01.md',
  'log_p04_transition_01.md',
  'log_p05_extension_01.md',
  'log_p05_extension_02.md',
  'log_p05_extension_03.md',
  'log_p05_extension_04.md',
  'log_p05_extension_05.md',
  'log_p05_extension_06.md',
  'log_p05_extension_07.md',
  'log_p06_propagation_01.md',
  'log_p06_reflection_01_claude.md'
];

// 実行
if (require.main === module) {
  const analyzer = new LogPatternAnalyzer();
  
  console.log('🚀 構造的対話ログ分析ツール');
  console.log('=' .repeat(50));
  
  analyzer.analyzeExistingLogs(existingLogFiles);
  
  // 提案例
  console.log('\n💡 命名提案例:');
  const suggestions = analyzer.suggestFileName('新しい対話ログ...', 'p02', { category: 'trigger' });
  suggestions.forEach(s => console.log(`  ${s}`));
  
  // 新フェーズ提案
  const newPhaseSuggestions = analyzer.suggestFileName('', 'p05', { isNewPhase: true });
  console.log('\n🆕 新フェーズ提案:');
  newPhaseSuggestions.forEach(s => console.log(`  ${s}`));
}

export { LogPatternAnalyzer, LogFileInfo, NamingPattern };