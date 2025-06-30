#!/usr/bin/env node

/**
 * テストログ自動整理スクリプト
 * test-logs/直下のファイルを分析して適切なディレクトリに仕分け・リネーム
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { IntelligentConceptExtractor } from '../src/core/intelligent-concept-extractor.js';

interface LogAnalysisResult {
  originalPath: string;
  suggestedPath: string;
  suggestedName: string;
  category: string;
  domain: string;
  confidence: number;
  reasoning: string;
}

class TestLogOrganizer {
  private extractor: IntelligentConceptExtractor;
  private testLogsDir: string;

  constructor() {
    this.extractor = new IntelligentConceptExtractor();
    this.testLogsDir = path.resolve('./test-logs');
  }

  async initialize(): Promise<void> {
    await this.extractor.initialize();
    console.log('✅ IntelligentConceptExtractor初期化完了');
  }

  /**
   * test-logs/直下のファイルを分析・整理
   */
  async organizeFiles(): Promise<LogAnalysisResult[]> {
    console.log('🔍 test-logs/ディレクトリをスキャン中...');
    
    const files = await fs.readdir(this.testLogsDir);
    const logFiles = files.filter(file => 
      file.endsWith('.txt') || 
      file.endsWith('.md') || 
      file.endsWith('.log')
    );

    if (logFiles.length === 0) {
      console.log('📂 整理対象のログファイルが見つかりませんでした');
      return [];
    }

    console.log(`📊 ${logFiles.length}個のログファイルを分析します`);
    
    const results: LogAnalysisResult[] = [];
    
    for (let i = 0; i < logFiles.length; i++) {
      const file = logFiles[i];
      console.log(`\n🔬 [${i+1}/${logFiles.length}] ${file} を分析中...`);
      
      try {
        const result = await this.analyzeAndCategorize(file);
        results.push(result);
        console.log(`✅ 分類: ${result.category}/${result.domain} (信頼度: ${result.confidence}%)`);
      } catch (error) {
        console.error(`❌ ${file} の分析に失敗:`, error);
      }
    }

    return results;
  }

  /**
   * ファイルを分析して分類・命名提案
   */
  private async analyzeAndCategorize(filename: string): Promise<LogAnalysisResult> {
    const filePath = path.join(this.testLogsDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // IntelligentConceptExtractorで分析
    const analysis = await this.extractor.extractConcepts(content);
    
    // ドメイン判定
    const domain = this.determineDomain(analysis, content);
    
    // カテゴリ判定
    const category = this.determineCategory(analysis, content, filename);
    
    // 新しいファイル名生成
    const newName = this.generateFileName(domain, analysis, filename);
    
    // 移動先パス
    const targetDir = path.join(this.testLogsDir, category, domain);
    const targetPath = path.join(targetDir, newName);
    
    // 信頼度とreasoning
    const confidence = Math.min(analysis.confidence, 95);
    const reasoning = this.generateReasoning(analysis, domain, category);

    return {
      originalPath: filePath,
      suggestedPath: targetPath,
      suggestedName: newName,
      category,
      domain,
      confidence,
      reasoning
    };
  }

  /**
   * ドメイン判定
   */
  private determineDomain(analysis: any, content: string): string {
    const { dialogueTypeDetection, deepConcepts } = analysis;
    
    // 技術・開発分野
    if (dialogueTypeDetection === 'technical_collaboration' || 
        dialogueTypeDetection === 'code_development' ||
        this.hasKeywords(content, ['API', 'エラー', 'デバッグ', 'コード', 'プログラム', 'システム', 'Detroit', 'アンドロイド'])) {
      return 'technical';
    }
    
    // 学術・研究分野
    if (dialogueTypeDetection === 'academic_research' ||
        dialogueTypeDetection === 'mathematical_research' ||
        this.hasKeywords(content, ['論文', '研究', '数学', '理論', '分析', '学術', '構造的対話'])) {
      return 'academic';
    }
    
    // 創作・アイデア
    if (dialogueTypeDetection === 'creative_brainstorming' ||
        this.hasKeywords(content, ['アイデア', '創作', 'ブレインストーミング', '企画', 'デザイン'])) {
      return 'creative';
    }
    
    return 'general';
  }

  /**
   * カテゴリ判定
   */
  private determineCategory(analysis: any, content: string, filename: string): string {
    // ベンチマーク判定
    if (filename.includes('benchmark') || filename.includes('test') || 
        analysis.predictedInnovationLevel >= 8) {
      if (analysis.predictedInnovationLevel >= 8) return 'benchmarks/quality';
      if (content.length > 10000) return 'benchmarks/speed';
      return 'benchmarks/edge';
    }
    
    // 実験ファイル
    if (filename.includes('experiment') || filename.includes('trial')) {
      return 'experiments/new-features';
    }
    
    return 'domains';
  }

  /**
   * ファイル名生成
   */
  private generateFileName(domain: string, analysis: any, originalName: string): string {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // 主要概念から説明部分を抽出
    const concepts = analysis.deepConcepts.slice(0, 2).map((c: any) => c.term);
    const description = concepts.join('-').toLowerCase()
      .replace(/[^a-zA-Z0-9\-ひらがなカタカナ漢字]/g, '')
      .substring(0, 30);
    
    // 革新レベルでサフィックス追加
    let suffix = '';
    if (analysis.predictedInnovationLevel >= 8) suffix = '-high';
    else if (analysis.predictedInnovationLevel >= 6) suffix = '-med';
    
    const extension = path.extname(originalName) || '.raw.txt';
    
    return `${domain}_${today}_${description}${suffix}${extension}`;
  }

  /**
   * 分類理由生成
   */
  private generateReasoning(analysis: any, domain: string, category: string): string {
    const reasons = [];
    
    reasons.push(`対話タイプ: ${analysis.dialogueTypeDetection}`);
    reasons.push(`革新度: ${analysis.predictedInnovationLevel}/10`);
    reasons.push(`主要概念: ${analysis.deepConcepts.slice(0, 3).map((c: any) => c.term).join(', ')}`);
    
    if (category.includes('benchmarks')) {
      reasons.push(`高品質ログとして判定 (革新度${analysis.predictedInnovationLevel})`);
    }
    
    return reasons.join(' / ');
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
  async executeOrganization(results: LogAnalysisResult[], dryRun: boolean = true): Promise<void> {
    console.log(`\n📋 整理計画 (${dryRun ? 'ドライラン' : '実行'}):`);
    console.log('='.repeat(80));

    for (const result of results) {
      console.log(`\n📄 ${path.basename(result.originalPath)}`);
      console.log(`   → ${result.suggestedPath}`);
      console.log(`   📊 ${result.reasoning}`);
      console.log(`   🎯 信頼度: ${result.confidence}%`);
      
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
  const organizer = new TestLogOrganizer();
  const executeMode = process.argv.includes('--execute');
  
  try {
    await organizer.initialize();
    const results = await organizer.organizeFiles();
    
    if (results.length > 0) {
      await organizer.executeOrganization(results, !executeMode);
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// モジュールとして実行された場合のみmain実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TestLogOrganizer };