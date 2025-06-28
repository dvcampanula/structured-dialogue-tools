#!/usr/bin/env node

import fs from 'fs';

interface LearnedConcept {
  term: string;
  weight: number;
  category: 'core' | 'emerging' | 'contextual';
  examples: string[];
}

interface ConceptDatabase {
  version: string;
  lastUpdated: string;
  concepts: LearnedConcept[];
  relationPatterns: Array<{
    pattern: RegExp;
    weight: number;
    description: string;
  }>;
}

class AdaptiveKeywordExtractor {
  private conceptDB: ConceptDatabase;
  
  constructor() {
    this.conceptDB = this.loadConceptDatabase();
  }
  
  /**
   * 学習済み概念データベースの読み込み
   */
  loadConceptDatabase(): ConceptDatabase {
    const dbPath = './concept-database.json';
    
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
    
    // 初期データベース（分析結果から生成）
    return this.generateInitialDatabase();
  }
  
  /**
   * 分析結果から初期データベースを生成
   */
  generateInitialDatabase(): ConceptDatabase {
    const analysisResults = JSON.parse(
      fs.readFileSync('./concept-analysis-results.json', 'utf-8')
    );
    
    const concepts: LearnedConcept[] = analysisResults.concepts
      .filter((c: any) => c.noveltyScore >= 1.5) // 高新規性のみ
      .map((c: any) => ({
        term: c.term,
        weight: c.noveltyScore * c.frequency, // 新規性×出現頻度
        category: this.categorizeConceptType(c.term),
        examples: c.contexts.slice(0, 2)
      }));
    
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      concepts,
      relationPatterns: this.generateRelationPatterns()
    };
  }
  
  /**
   * 概念をカテゴリ分類
   */
  categorizeConceptType(term: string): 'core' | 'emerging' | 'contextual' {
    if (term.includes('構造的対話') || term.includes('メタ認知')) {
      return 'core';
    }
    if (term.includes('モード') || term.includes('システム')) {
      return 'emerging';
    }
    return 'contextual';
  }
  
  /**
   * 関係性パターンの生成
   */
  generateRelationPatterns() {
    return [
      {
        pattern: /(.+)モード/g,
        weight: 1.5,
        description: 'システム動作状態'
      },
      {
        pattern: /(.+)的(.+)/g,
        weight: 1.2,
        description: '修飾的関係'
      },
      {
        pattern: /(.+)データ/g,
        weight: 1.3,
        description: '情報・資源系'
      },
      {
        pattern: /(.+)な(.+)/g,
        weight: 1.1,
        description: '属性関係'
      }
    ];
  }
  
  /**
   * 学習型キーワード抽出
   */
  extractAdaptiveKeywords(content: string): Array<{term: string, weight: number, reason: string}> {
    const results: Array<{term: string, weight: number, reason: string}> = [];
    
    // 1. 学習済み概念の検出
    this.conceptDB.concepts.forEach(concept => {
      const regex = new RegExp(concept.term, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        results.push({
          term: concept.term,
          weight: concept.weight * matches.length,
          reason: `学習済み${concept.category}概念 (${matches.length}回出現)`
        });
      }
    });
    
    // 2. パターンベース新概念検出
    this.conceptDB.relationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.pattern.exec(content)) !== null) {
        const newConcept = match[0];
        
        // 既に検出済みでなければ追加
        if (!results.find(r => r.term === newConcept) && newConcept.length >= 4) {
          results.push({
            term: newConcept,
            weight: pattern.weight,
            reason: `新パターン検出: ${pattern.description}`
          });
        }
      }
    });
    
    // 3. 重み付けソート
    return results
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8); // 上位8個
  }
  
  /**
   * データベースの更新学習
   */
  learnFromFeedback(term: string, actualImportance: number, context: string) {
    const existing = this.conceptDB.concepts.find(c => c.term === term);
    
    if (existing) {
      // 重み調整
      existing.weight = (existing.weight + actualImportance) / 2;
      existing.examples.push(context);
    } else {
      // 新概念追加
      this.conceptDB.concepts.push({
        term,
        weight: actualImportance,
        category: 'contextual',
        examples: [context]
      });
    }
    
    this.saveConceptDatabase();
  }
  
  /**
   * データベースの保存
   */
  saveConceptDatabase() {
    this.conceptDB.lastUpdated = new Date().toISOString();
    fs.writeFileSync('./concept-database.json', JSON.stringify(this.conceptDB, null, 2));
  }
  
  /**
   * AIが使いやすい形式で出力
   */
  generateAIPromptKeywords(content: string): string {
    const keywords = this.extractAdaptiveKeywords(content);
    
    const coreKeywords = keywords.filter(k => k.weight >= 2.0);
    const supportKeywords = keywords.filter(k => k.weight < 2.0);
    
    return [
      `重要概念: ${coreKeywords.map(k => k.term).join(', ')}`,
      `関連概念: ${supportKeywords.map(k => k.term).join(', ')}`,
      `新規概念候補: ${keywords.filter(k => k.reason.includes('新パターン')).map(k => k.term).join(', ')}`
    ].join(' | ');
  }
}

// テスト実行
if (fs.existsSync('./concept-analysis-results.json')) {
  console.log('🧠 学習型キーワード抽出ツール');
  console.log('='.repeat(50));
  
  const extractor = new AdaptiveKeywordExtractor();
  
  // テストデータで検証
  const testContent = fs.readFileSync('./test-raw-log.txt', 'utf-8').substring(0, 5000);
  
  console.log('📊 学習型キーワード抽出結果:');
  const keywords = extractor.extractAdaptiveKeywords(testContent);
  
  keywords.forEach((kw, index) => {
    console.log(`${index + 1}. "${kw.term}" (重み:${kw.weight.toFixed(1)}) - ${kw.reason}`);
  });
  
  console.log('\n🤖 AI用プロンプトキーワード:');
  console.log(extractor.generateAIPromptKeywords(testContent));
  
  console.log('\n💾 concept-database.json を生成しました');
}