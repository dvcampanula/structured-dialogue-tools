#!/usr/bin/env node

/**
 * 構造的対話ログ書式統一化ツール（実践版）
 * 既存ログの内容を保持しつつ、標準書式に統一する
 */

interface UnificationOptions {
  preserveContent: boolean;
  addMissingEmojis: boolean;
  standardizeMarkdown: boolean;
  addMetadata: boolean;
  generateToc: boolean;
}

interface LogMetadata {
  filename: string;
  phase: string;
  category: string;
  date: string;
  wordCount: number;
  complexity: 'low' | 'medium' | 'high';
}

class LogFormatUnifier {
  private emojiMapping = new Map([
    // 基本セクション
    ['概要', '📋'], ['overview', '📋'],
    ['背景', '✅'], ['background', '✅'],
    ['特徴', '🧠'], ['features', '🧠'], ['発芽', '🧠'],
    ['内容', '📝'], ['content', '📝'], ['トピック', '📝'],
    ['構造', '🧩'], ['structure', '🧩'],
    ['意義', '💡'], ['significance', '💡'],
    ['関連', '🔗'], ['related', '🔗'],
    ['備考', '📌'], ['notes', '📌'],
    
    // 専門セクション
    ['実験', '🧪'], ['experiment', '🧪'],
    ['分析', '📊'], ['analysis', '📊'],
    ['発見', '🔍'], ['discovery', '🔍'],
    ['課題', '⚠️'], ['issues', '⚠️'],
    ['改善', '⬆️'], ['improvement', '⬆️'],
    ['結論', '🎯'], ['conclusion', '🎯'],
    ['次の', '➡️'], ['next', '➡️'],
    
    // フェーズ専用
    ['対話', '💬'], ['dialogue', '💬'],
    ['トリガー', '⚡'], ['trigger', '⚡'],
    ['伝播', '🌊'], ['propagation', '🌊'],
    ['応用', '🔨'], ['application', '🔨'],
    ['拡張', '📈'], ['extension', '📈'],
    ['振り返り', '🪞'], ['reflection', '🪞'],
    ['遷移', '🔄'], ['transition', '🔄']
  ]);

  private sectionOrder = [
    '概要', 'overview',
    '背景', 'background', 
    '特徴', 'features', '発芽',
    '内容', 'content', 'トピック',
    '実験', 'experiment',
    '分析', 'analysis',
    '構造', 'structure',
    '意義', 'significance',
    '課題', 'issues',
    '改善', 'improvement',
    '関連', 'related',
    '備考', 'notes'
  ];

  /**
   * ログファイルの統一化実行
   */
  unifyLogFormat(
    content: string, 
    filename: string, 
    options: UnificationOptions = this.getDefaultOptions()
  ): string {
    console.log(`🔧 統一化処理: ${filename}`);
    
    // 1. 既存構造の解析
    const structure = this.parseExistingStructure(content);
    
    // 2. メタデータ生成
    const metadata = this.generateMetadata(filename, content);
    
    // 3. セクション再構成
    const reorganized = this.reorganizeSections(structure, options);
    
    // 4. 標準書式適用
    const unified = this.applyStandardFormat(reorganized, metadata, options);
    
    return unified;
  }

  /**
   * デフォルトオプション
   */
  private getDefaultOptions(): UnificationOptions {
    return {
      preserveContent: true,
      addMissingEmojis: true,
      standardizeMarkdown: true,
      addMetadata: true,
      generateToc: false
    };
  }

  /**
   * 既存構造の解析
   */
  private parseExistingStructure(content: string): Map<string, string[]> {
    const lines = content.split('\n');
    const structure = new Map<string, string[]>();
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 見出し検出
      const headingMatch = trimmed.match(/^#{1,6}\s*(.+)$/);
      if (headingMatch) {
        // 前のセクションを保存
        if (currentSection && currentContent.length > 0) {
          structure.set(currentSection, [...currentContent]);
        }
        
        // 新しいセクション開始
        currentSection = this.cleanSectionTitle(headingMatch[1]);
        currentContent = [];
      } else if (currentSection && trimmed.length > 0) {
        currentContent.push(line);
      }
    }
    
    // 最後のセクションを保存
    if (currentSection && currentContent.length > 0) {
      structure.set(currentSection, currentContent);
    }

    return structure;
  }

  /**
   * セクションタイトルのクリーニング
   */
  private cleanSectionTitle(title: string): string {
    return title
      .replace(/^[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+\s*/, '') // 絵文字等削除
      .trim()
      .toLowerCase();
  }

  /**
   * メタデータ生成
   */
  private generateMetadata(filename: string, content: string): LogMetadata {
    const phaseMatch = filename.match(/log_([^_]+)_/);
    const categoryMatch = filename.match(/log_[^_]+_([^_]+)_/);
    
    const wordCount = content.replace(/\s+/g, ' ').length;
    const complexity = wordCount > 2000 ? 'high' : wordCount > 800 ? 'medium' : 'low';
    
    return {
      filename,
      phase: phaseMatch ? phaseMatch[1] : 'unknown',
      category: categoryMatch ? categoryMatch[1] : 'unknown',
      date: new Date().toISOString().split('T')[0],
      wordCount,
      complexity
    };
  }

  /**
   * セクション再構成
   */
  private reorganizeSections(
    structure: Map<string, string[]>, 
    options: UnificationOptions
  ): Map<string, string[]> {
    const reorganized = new Map<string, string[]>();
    
    // 定義された順序でセクションを再配置
    for (const orderKey of this.sectionOrder) {
      for (const [sectionKey, content] of structure) {
        if (this.isSectionMatch(sectionKey, orderKey)) {
          reorganized.set(orderKey, content);
          structure.delete(sectionKey);
          break;
        }
      }
    }
    
    // 残りのセクションを最後に追加
    for (const [key, content] of structure) {
      reorganized.set(key, content);
    }

    return reorganized;
  }

  /**
   * セクションマッチング判定
   */
  private isSectionMatch(sectionKey: string, orderKey: string): boolean {
    const section = sectionKey.toLowerCase();
    const order = orderKey.toLowerCase();
    
    return section === order || 
           section.includes(order) || 
           order.includes(section);
  }

  /**
   * 標準書式適用
   */
  private applyStandardFormat(
    sections: Map<string, string[]>,
    metadata: LogMetadata,
    options: UnificationOptions
  ): string {
    let result = `# ${metadata.filename}\n\n`;
    
    // 目次生成（オプション）
    if (options.generateToc) {
      result += this.generateTableOfContents(sections);
    }
    
    // セクション生成
    for (const [sectionKey, content] of sections) {
      const emoji = options.addMissingEmojis ? this.getEmoji(sectionKey) : '';
      const title = this.formatSectionTitle(sectionKey, emoji);
      
      result += `## ${title}\n`;
      
      if (content.length > 0) {
        const formattedContent = options.standardizeMarkdown 
          ? this.standardizeMarkdown(content) 
          : content;
        result += formattedContent.join('\n') + '\n';
      }
      result += '\n';
    }
    
    // メタデータセクション追加
    if (options.addMetadata) {
      result += this.generateMetadataSection(metadata);
    }
    
    return result.trim();
  }

  /**
   * 絵文字取得
   */
  private getEmoji(sectionKey: string): string {
    const key = sectionKey.toLowerCase();
    
    // 完全マッチ
    if (this.emojiMapping.has(key)) {
      return this.emojiMapping.get(key)!;
    }
    
    // 部分マッチ
    for (const [mapKey, emoji] of this.emojiMapping) {
      if (key.includes(mapKey) || mapKey.includes(key)) {
        return emoji;
      }
    }
    
    return '📄'; // デフォルト
  }

  /**
   * セクションタイトル整形
   */
  private formatSectionTitle(sectionKey: string, emoji: string): string {
    // 最初の文字を大文字に
    const formatted = sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
    return emoji ? `${emoji} ${formatted}` : formatted;
  }

  /**
   * マークダウン標準化
   */
  private standardizeMarkdown(content: string[]): string[] {
    return content.map(line => {
      let standardized = line;
      
      // リスト項目統一
      standardized = standardized.replace(/^[\*\+]\s/, '- ');
      
      // 強調統一
      standardized = standardized.replace(/\*([^*]+)\*/g, '**$1**');
      
      // コード統一
      standardized = standardized.replace(/`([^`]+)`/g, '`$1`');
      
      return standardized;
    });
  }

  /**
   * 目次生成
   */
  private generateTableOfContents(sections: Map<string, string[]>): string {
    let toc = '## 📑 目次\n\n';
    
    let index = 1;
    for (const sectionKey of sections.keys()) {
      const emoji = this.getEmoji(sectionKey);
      const title = this.formatSectionTitle(sectionKey, emoji);
      toc += `${index}. [${title}](#${sectionKey.replace(/\s+/g, '-').toLowerCase()})\n`;
      index++;
    }
    
    return toc + '\n';
  }

  /**
   * メタデータセクション生成
   */
  private generateMetadataSection(metadata: LogMetadata): string {
    return `
---

## 📊 メタデータ

- **ファイル名**: ${metadata.filename}
- **フェーズ**: ${metadata.phase}
- **カテゴリ**: ${metadata.category}
- **記録日**: ${metadata.date}
- **文字数**: ${metadata.wordCount}
- **複雑度**: ${metadata.complexity}

`;
  }

  /**
   * バッチ処理
   */
  batchUnify(
    logContents: Map<string, string>,
    options?: UnificationOptions
  ): Map<string, string> {
    const results = new Map<string, string>();
    
    console.log(`📦 バッチ統一化開始: ${logContents.size}ファイル`);
    
    for (const [filename, content] of logContents) {
      try {
        const unified = this.unifyLogFormat(content, filename, options);
        results.set(filename, unified);
        console.log(`✅ 完了: ${filename}`);
      } catch (error) {
        console.error(`❌ エラー: ${filename} - ${error}`);
      }
    }
    
    console.log(`🎉 バッチ処理完了: ${results.size}/${logContents.size}ファイル`);
    return results;
  }
}

// 使用例とテスト
// テスト実行用（直接実行時のみ）
if (import.meta.url === `file://${process.argv[1]}`) {
  const unifier = new LogFormatUnifier();
  
  console.log('🔧 構造的対話ログ書式統一化ツール');
  console.log('='.repeat(50));
  
  // サンプルログの統一化テスト
  const sampleLog = `# log_p02_trigger_01.md

## 概要
構造的対話のトリガー実験について記録します。

## 主なキーワード
* 対話構造の持続性
* AIモデル間比較
* 構造感染の検証

## 実験内容
GitHub Copilotとの比較実験を実施しました。

- 対話構造の再開可能性
- 意図の継承性
- 構造の伝播性

## 結果
ChatGPTによる構造再構築の初期フレームワークが提案されました。

## 備考
次回は他のAIモデルとの比較を予定。`;

  const options: UnificationOptions = {
    preserveContent: true,
    addMissingEmojis: true,
    standardizeMarkdown: true,
    addMetadata: true,
    generateToc: true
  };

  const unified = unifier.unifyLogFormat(sampleLog, 'log_p02_trigger_01.md', options);
  
  console.log('\n🎯 統一化結果:');
  console.log('='.repeat(30));
  console.log(unified);
}

export { LogFormatUnifier, UnificationOptions, LogMetadata };