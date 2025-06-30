#!/usr/bin/env node

/**
 * 高速ログ整理スクリプト（簡易版）
 * ファイル名とサイズベースで分類
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface QuickAnalysisResult {
  originalPath: string;
  suggestedPath: string;
  suggestedName: string;
  category: string;
  domain: string;
  reasoning: string;
}

class QuickLogOrganizer {
  private testLogsDir: string;

  constructor() {
    this.testLogsDir = path.resolve('./test-logs');
  }

  /**
   * test-logs/直下のファイルを高速分析・整理
   */
  async organizeFiles(): Promise<QuickAnalysisResult[]> {
    console.log('🔍 test-logs/ディレクトリをスキャン中...');
    
    const files = await fs.readdir(this.testLogsDir);
    const logFiles = files.filter(file => 
      (file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.log')) &&
      !file.toLowerCase().includes('readme') &&
      !file.startsWith('.') &&
      !file.includes('_backup')
    );

    if (logFiles.length === 0) {
      console.log('📂 整理対象のログファイルが見つかりませんでした');
      return [];
    }

    console.log(`📊 ${logFiles.length}個のログファイルを高速分析します`);
    
    const results: QuickAnalysisResult[] = [];
    
    for (let i = 0; i < logFiles.length; i++) {
      const file = logFiles[i];
      console.log(`⚡ [${i+1}/${logFiles.length}] ${file}`);
      
      try {
        const result = await this.quickAnalyze(file);
        results.push(result);
        console.log(`  → ${result.category}/${result.domain}`);
      } catch (error) {
        console.error(`❌ ${file} の分析に失敗:`, error);
      }
    }

    return results;
  }

  /**
   * ファイル名・サイズベースの高速分析
   */
  private async quickAnalyze(filename: string): Promise<QuickAnalysisResult> {
    const filePath = path.join(this.testLogsDir, filename);
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const contentPreview = content.substring(0, 1000).toLowerCase();
    
    // ドメイン判定（ファイル名＋内容プレビュー）
    const domain = this.quickDetermineDomain(filename, contentPreview);
    
    // カテゴリ判定（サイズ＋ファイル名）
    const category = this.quickDetermineCategory(filename, stats.size, contentPreview);
    
    // 新しいファイル名生成
    const newName = this.generateQuickFileName(filename, domain, stats.size);
    
    // 移動先パス
    const targetDir = path.join(this.testLogsDir, category, domain);
    const targetPath = path.join(targetDir, newName);
    
    const reasoning = `ファイル名: ${filename}, サイズ: ${Math.round(stats.size/1024)}KB, ドメイン指標: ${domain}`;

    return {
      originalPath: filePath,
      suggestedPath: targetPath,
      suggestedName: newName,
      category,
      domain,
      reasoning
    };
  }

  /**
   * 高速ドメイン判定
   */
  private quickDetermineDomain(filename: string, contentPreview: string): string {
    const lowerName = filename.toLowerCase();
    
    // ファイル名からAI判定
    if (lowerName.includes('くろーど') || lowerName.includes('claude')) return 'technical';
    if (lowerName.includes('じーぴーてぃー') || lowerName.includes('gpt')) return 'technical';
    if (lowerName.includes('じぇみに') || lowerName.includes('gemini')) return 'technical';
    if (lowerName.includes('ぐろっく') || lowerName.includes('grok')) return 'technical';
    if (lowerName.includes('こぱいろっと') || lowerName.includes('copilot')) return 'technical';
    if (lowerName.includes('こらっつ') || lowerName.includes('claude')) return 'technical';
    if (lowerName.includes('つくよみ') || lowerName.includes('かなで')) return 'creative';
    
    // 内容プレビューから判定
    if (this.hasKeywords(contentPreview, ['プログラム', 'コード', 'api', 'エラー', 'システム', 'データベース'])) {
      return 'technical';
    }
    if (this.hasKeywords(contentPreview, ['研究', '論文', '数学', '理論', '分析', '学術'])) {
      return 'academic';
    }
    if (this.hasKeywords(contentPreview, ['創作', 'アイデア', 'デザイン', '企画', 'ブレインストーミング'])) {
      return 'creative';
    }
    
    return 'general';
  }

  /**
   * 高速カテゴリ判定
   */
  private quickDetermineCategory(filename: string, size: number, contentPreview: string): string {
    // 大きなファイル = 高品質ログの可能性
    if (size > 50000) return 'benchmarks/quality';  // 50KB以上
    if (size > 20000) return 'benchmarks/speed';    // 20KB以上
    
    // ファイル名から実験判定
    if (filename.includes('test') || filename.includes('実験') || filename.includes('trial')) {
      return 'experiments/new-features';
    }
    
    // 革新的キーワードがあれば品質ベンチマーク
    if (this.hasKeywords(contentPreview, ['革新', '新しい', '発見', '画期的', 'breakthrough', 'innovation'])) {
      return 'benchmarks/quality';
    }
    
    return 'domains';
  }

  /**
   * 高速ファイル名生成
   */
  private generateQuickFileName(originalName: string, domain: string, size: number): string {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // 元のファイル名から特徴抽出
    const baseName = path.parse(originalName).name;
    const cleanName = baseName
      .replace(/[^a-zA-Z0-9\-ひらがなカタカナ漢字]/g, '')
      .substring(0, 20);
    
    // サイズでサフィックス
    let suffix = '';
    if (size > 50000) suffix = '-large';
    else if (size > 20000) suffix = '-medium';
    else suffix = '-small';
    
    const extension = path.extname(originalName) || '.raw.txt';
    
    return `${domain}_${today}_${cleanName}${suffix}${extension}`;
  }

  /**
   * キーワード存在チェック
   */
  private hasKeywords(content: string, keywords: string[]): boolean {
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * 実際にファイル移動実行
   */
  async executeOrganization(results: QuickAnalysisResult[], dryRun: boolean = true): Promise<void> {
    console.log(`\n📋 整理計画 (${dryRun ? 'ドライラン' : '実行'}):`);
    console.log('='.repeat(80));

    for (const result of results) {
      console.log(`\n📄 ${path.basename(result.originalPath)}`);
      console.log(`   → ${path.relative('.', result.suggestedPath)}`);
      console.log(`   📊 ${result.reasoning}`);
      
      if (!dryRun) {
        // ディレクトリ作成
        await fs.mkdir(path.dirname(result.suggestedPath), { recursive: true });
        
        // ファイル移動
        await fs.rename(result.originalPath, result.suggestedPath);
        console.log(`   ✅ 移動完了`);
      }
    }

    if (dryRun) {
      console.log(`\n💡 実際に移動するには --execute オプションを使用してください`);
    } else {
      console.log(`\n🎉 ${results.length}個のファイル整理完了！`);
    }
  }
}

// メイン実行
async function main() {
  const organizer = new QuickLogOrganizer();
  const executeMode = process.argv.includes('--execute');
  
  try {
    const results = await organizer.organizeFiles();
    
    if (results.length > 0) {
      await organizer.executeOrganization(results, !executeMode);
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { QuickLogOrganizer };