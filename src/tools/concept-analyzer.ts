#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { IntelligentConceptExtractor } from '../core/intelligent-concept-extractor.js';

interface ConceptCandidate {
  term: string;
  frequency: number;
  contexts: string[];
  logSources: string[];
  noveltyScore: number;
}

class LogConceptAnalyzer {
  
  /**
   * 引用符で囲まれた概念を抽出
   */
  extractQuotedConcepts(content: string): string[] {
    const patterns = [
      /「([^」]{3,20})」/g,
      /"([^"]{3,20})"/g,
      /'([^']{3,20})'/g
    ];
    
    const concepts: string[] = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        concepts.push(match[1]);
      }
    });
    
    return concepts;
  }
  
  /**
   * 複合概念を検出（複数単語の組み合わせ）
   */
  extractCompoundConcepts(content: string): string[] {
    // カタカナ + 漢字/ひらがなの組み合わせ
    const patterns = [
      /[ア-ヴ]{2,}[的的な]{0,2}[一-龯ひ-ゆ]{1,8}/g,
      /[一-龯]{2,}[ア-ヴ]{2,}/g,
      /[一-龯]{2,}的[一-龯ひ-ゆ]{2,}/g
    ];
    
    const compounds: string[] = [];
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        compounds.push(...matches.filter(m => m.length >= 4 && m.length <= 15));
      }
    });
    
    return compounds;
  }
  
  /**
   * 定義的表現の抽出
   */
  extractDefinitions(content: string): Array<{term: string, definition: string}> {
    const patterns = [
      /(.{2,15})とは(.{10,50})/g,
      /(.{2,15})は(.{10,50})である/g,
      /(.{2,15})を(.{5,30})と呼[ぶんで]/g
    ];
    
    const definitions: Array<{term: string, definition: string}> = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        definitions.push({
          term: match[1].trim(),
          definition: match[2].trim()
        });
      }
    });
    
    return definitions;
  }
  
  /**
   * 1つのログファイルを解析
   */
  analyzeLogFile(filePath: string): ConceptCandidate[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const candidates: ConceptCandidate[] = [];
    
    // 引用概念
    const quoted = this.extractQuotedConcepts(content);
    quoted.forEach(term => {
      candidates.push({
        term,
        frequency: (content.match(new RegExp(term, 'g')) || []).length,
        contexts: this.extractContexts(content, term),
        logSources: [path.basename(filePath)],
        noveltyScore: this.calculateNoveltyScore(term)
      });
    });
    
    // 複合概念
    const compounds = this.extractCompoundConcepts(content);
    compounds.forEach(term => {
      if (!candidates.find(c => c.term === term)) {
        candidates.push({
          term,
          frequency: (content.match(new RegExp(term, 'g')) || []).length,
          contexts: this.extractContexts(content, term),
          logSources: [path.basename(filePath)],
          noveltyScore: this.calculateNoveltyScore(term)
        });
      }
    });
    
    return candidates.filter(c => c.frequency >= 2); // 2回以上出現
  }
  
  /**
   * 概念の文脈を抽出
   */
  extractContexts(content: string, term: string): string[] {
    const regex = new RegExp(`.{0,30}${term}.{0,30}`, 'g');
    const matches = content.match(regex);
    return matches ? matches.slice(0, 3) : []; // 最大3つの文脈
  }
  
  /**
   * 新規性スコア計算
   */
  calculateNoveltyScore(term: string): number {
    let score = 1;
    
    // 長さによる調整
    if (term.length >= 6) score += 0.5;
    
    // カタカナ+漢字の組み合わせ
    if (/[ア-ヴ]/.test(term) && /[一-龯]/.test(term)) score += 0.3;
    
    // 「的」を含む概念
    if (term.includes('的')) score += 0.2;
    
    return Math.min(score, 2.0);
  }
}

// 実行部分
console.log('📊 ログ概念分析ツール');
console.log('='.repeat(50));

const analyzer = new LogConceptAnalyzer();

// テストファイルで動作確認
if (fs.existsSync('./test-raw-log.txt')) {
  console.log('🔍 test-raw-log.txt を解析中...');
  
  const candidates = analyzer.analyzeLogFile('./test-raw-log.txt');
  
  console.log(`\n📈 発見された概念候補: ${candidates.length}個`);
  
  // 新規性スコア順でソート
  candidates.sort((a, b) => b.noveltyScore - a.noveltyScore);
  
  console.log('\n🎯 高新規性概念 TOP 10:');
  candidates.slice(0, 10).forEach((concept, index) => {
    console.log(`${index + 1}. "${concept.term}" (出現:${concept.frequency}回, 新規性:${concept.noveltyScore.toFixed(1)})`);
    console.log(`   文脈例: ${concept.contexts[0]?.substring(0, 50)}...`);
  });
  
  // 結果をJSONで保存
  const results = {
    analyzedFile: 'test-raw-log.txt',
    totalConcepts: candidates.length,
    concepts: candidates,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('./concept-analysis-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 結果を concept-analysis-results.json に保存しました');
}