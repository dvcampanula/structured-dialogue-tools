#!/usr/bin/env node

/**
 * ログからの知識抽出・学習データ化システム
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { UnifiedLogProcessor } from '../src/core/unified-log-processor.js';

interface ExtractedKnowledge {
  filename: string;
  size: number;
  dialogueType: string;
  
  // 概念・キーワード関連
  mainConcepts: string[];
  frequentTerms: { term: string; count: number; context: string }[];
  technicalTerms: string[];
  abstractConcepts: string[];
  
  // 構造・パターン関連
  discussionStructure: string;
  argumentPatterns: string[];
  transitionWords: string[];
  
  // 質問・回答パターン
  questionPatterns: string[];
  explanationPatterns: string[];
  
  // 品質指標
  conceptDensity: number;
  logicalCoherence: number;
  
  // サンプル文
  keyPhrases: string[];
  representativeSentences: string[];
}

interface LearningDataset {
  metadata: {
    totalLogs: number;
    totalConcepts: number;
    extractionDate: string;
    coverageTypes: string[];
  };
  conceptDatabase: {
    coreStructuralConcepts: string[];
    aiCollaborationTerms: string[];
    philosophicalConcepts: string[];
    technicalTerms: string[];
    emergentConcepts: string[];
  };
  dialoguePatterns: {
    questionFormations: string[];
    explanationPatterns: string[];
    transitionPhrases: string[];
    conclusionMarkers: string[];
  };
  qualityIndicators: {
    highQualityPhrases: string[];
    structuralMarkers: string[];
    depthIndicators: string[];
  };
  trainingExamples: Array<{
    input: string;
    expectedConcepts: string[];
    expectedType: string;
    qualityScore: number;
  }>;
}

class KnowledgeExtractor {
  private processor: UnifiedLogProcessor;
  
  constructor() {
    this.processor = new UnifiedLogProcessor();
  }

  /**
   * 全ログからの知識抽出実行
   */
  async extractKnowledge(): Promise<LearningDataset> {
    console.log('🧠 ログ知識抽出・学習データ化開始\n');

    const logFiles = readdirSync('.')
      .filter(file => file.match(/^test-raw-log.*\.txt$/))
      .sort();

    if (logFiles.length === 0) {
      throw new Error('検証対象のログファイルが見つかりません');
    }

    console.log(`📋 分析対象: ${logFiles.length}件のログ`);
    logFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    const knowledgeBase: ExtractedKnowledge[] = [];

    // 各ログファイルから知識抽出
    for (const file of logFiles) {
      console.log(`🔍 分析中: ${file}`);
      
      try {
        const knowledge = await this.extractFromLog(file);
        knowledgeBase.push(knowledge);
        this.printKnowledgeSummary(knowledge);
      } catch (error) {
        console.log(`❌ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
      
      console.log('---\n');
    }

    // 学習データセット生成
    const dataset = this.generateLearningDataset(knowledgeBase);
    
    // 結果をファイルに保存
    this.saveResults(knowledgeBase, dataset);
    
    return dataset;
  }

  /**
   * 個別ログからの知識抽出
   */
  private async extractFromLog(filename: string): Promise<ExtractedKnowledge> {
    const rawLog = readFileSync(filename, 'utf-8');
    const result = await this.processor.processUnifiedLog(rawLog);

    return {
      filename,
      size: rawLog.length,
      dialogueType: result.header.dialogueType,
      
      // 基本概念
      mainConcepts: result.header.mainConcepts,
      
      // 頻出語句分析
      frequentTerms: this.analyzeFrequentTerms(rawLog),
      
      // 分類別キーワード
      technicalTerms: this.extractTechnicalTerms(rawLog),
      abstractConcepts: this.extractAbstractConcepts(rawLog),
      
      // 構造分析
      discussionStructure: result.header.discussionScope,
      argumentPatterns: this.extractArgumentPatterns(rawLog),
      transitionWords: this.extractTransitionWords(rawLog),
      
      // パターン分析
      questionPatterns: this.extractQuestionPatterns(rawLog),
      explanationPatterns: this.extractExplanationPatterns(rawLog),
      
      // 品質指標
      conceptDensity: result.qualityMetrics?.conceptDetection.conceptDensity || 0,
      logicalCoherence: result.qualityMetrics?.structuralQuality.chunkCoherenceScore || 0,
      
      // 代表的なフレーズ
      keyPhrases: this.extractKeyPhrases(rawLog),
      representativeSentences: this.extractRepresentativeSentences(rawLog)
    };
  }

  /**
   * 頻出語句分析
   */
  private analyzeFrequentTerms(rawLog: string): { term: string; count: number; context: string }[] {
    const words = rawLog.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{3,}/g) || [];
    const frequency: Record<string, number> = {};
    
    words.forEach(word => {
      if (word.length >= 3 && word.length <= 15) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    return Object.entries(frequency)
      .filter(([_, count]) => count >= 3)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([term, count]) => ({
        term,
        count,
        context: this.getTermContext(rawLog, term)
      }));
  }

  /**
   * 技術的用語の抽出
   */
  private extractTechnicalTerms(rawLog: string): string[] {
    const technicalPatterns = [
      /API|HTTP|JSON|REST|GraphQL/gi,
      /プログラム|アルゴリズム|データ構造|設計パターン/g,
      /機械学習|深層学習|ニューラルネット|AI|人工知能/g,
      /TypeScript|JavaScript|Python|React|Node\.js/gi,
      /データベース|SQL|NoSQL|MongoDB/gi
    ];

    const terms = new Set<string>();
    technicalPatterns.forEach(pattern => {
      const matches = rawLog.match(pattern) || [];
      matches.forEach(match => terms.add(match));
    });

    return Array.from(terms).slice(0, 15);
  }

  /**
   * 抽象概念の抽出
   */
  private extractAbstractConcepts(rawLog: string): string[] {
    const abstractPatterns = [
      /意識|認知|メタ認知|自己認識|主観的体験/g,
      /構造的対話|構造的協働思考|思考パートナー/g,
      /創発|複雑系|システム思考|全体性/g,
      /概念創発|パラダイムシフト|認知的バイアス/g,
      /実存|存在論|現象学|哲学的探求/g
    ];

    const concepts = new Set<string>();
    abstractPatterns.forEach(pattern => {
      const matches = rawLog.match(pattern) || [];
      matches.forEach(match => concepts.add(match));
    });

    return Array.from(concepts).slice(0, 15);
  }

  /**
   * 論証パターンの抽出
   */
  private extractArgumentPatterns(rawLog: string): string[] {
    const patterns = [
      /なぜなら[^。]*。/g,
      /その理由は[^。]*。/g,
      /具体的には[^。]*。/g,
      /つまり[^。]*。/g,
      /要するに[^。]*。/g,
      /結論として[^。]*。/g
    ];

    const argumentPatterns = new Set<string>();
    patterns.forEach(pattern => {
      const matches = rawLog.match(pattern) || [];
      matches.slice(0, 3).forEach(match => argumentPatterns.add(match.trim()));
    });

    return Array.from(argumentPatterns).slice(0, 10);
  }

  /**
   * 接続語・転換語の抽出
   */
  private extractTransitionWords(rawLog: string): string[] {
    const transitions = [
      'しかし', 'ただし', '一方で', 'むしろ', 'さらに', 'また',
      'そのため', 'したがって', 'ゆえに', 'そこで', 'つまり',
      '例えば', '具体的には', '実際に', '要するに', '結論として'
    ];

    const found = transitions.filter(word => rawLog.includes(word));
    return found.slice(0, 8);
  }

  /**
   * 質問パターンの抽出
   */
  private extractQuestionPatterns(rawLog: string): string[] {
    const questions = rawLog.match(/[^。]*？/g) || [];
    return questions
      .filter(q => q.length > 5 && q.length < 100)
      .slice(0, 8)
      .map(q => q.trim());
  }

  /**
   * 説明パターンの抽出
   */
  private extractExplanationPatterns(rawLog: string): string[] {
    const patterns = [
      /[^。]*とは[^。]*。/g,
      /[^。]*について説明[^。]*。/g,
      /[^。]*の特徴は[^。]*。/g,
      /[^。]*を理解するには[^。]*。/g
    ];

    const explanations = new Set<string>();
    patterns.forEach(pattern => {
      const matches = rawLog.match(pattern) || [];
      matches.slice(0, 2).forEach(match => explanations.add(match.trim()));
    });

    return Array.from(explanations).slice(0, 6);
  }

  /**
   * キーフレーズの抽出
   */
  private extractKeyPhrases(rawLog: string): string[] {
    const phrases = rawLog.match(/「[^」]+」/g) || [];
    return phrases
      .map(phrase => phrase.replace(/[「」]/g, ''))
      .filter(phrase => phrase.length > 3 && phrase.length < 30)
      .slice(0, 10);
  }

  /**
   * 代表的な文の抽出
   */
  private extractRepresentativeSentences(rawLog: string): string[] {
    const sentences = rawLog.split(/[。！？]/).filter(s => s.trim().length > 20);
    const keywords = ['構造的', '対話', '思考', '意識', '認知', 'AI', '創発'];
    
    const scored = sentences
      .map(sentence => ({
        sentence: sentence.trim(),
        score: keywords.reduce((score, keyword) => 
          score + (sentence.includes(keyword) ? 1 : 0), 0)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 8).map(item => item.sentence);
  }

  /**
   * 用語のコンテキスト取得
   */
  private getTermContext(rawLog: string, term: string): string {
    const index = rawLog.indexOf(term);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 20);
    const end = Math.min(rawLog.length, index + term.length + 20);
    return rawLog.substring(start, end).replace(/\n/g, ' ');
  }

  /**
   * 知識抽出結果の要約表示
   */
  private printKnowledgeSummary(knowledge: ExtractedKnowledge): void {
    console.log(`📊 ${knowledge.filename}`);
    console.log(`   📏 サイズ: ${knowledge.size.toLocaleString()}文字`);
    console.log(`   🎭 対話形式: ${knowledge.dialogueType}`);
    console.log(`   🔑 主要概念: ${knowledge.mainConcepts.slice(0, 3).join(', ')}`);
    console.log(`   📈 概念密度: ${knowledge.conceptDensity.toFixed(3)}/万文字`);
    console.log(`   🧠 論理一貫性: ${knowledge.logicalCoherence.toFixed(1)}%`);
    console.log(`   🔤 技術用語: ${knowledge.technicalTerms.length}個`);
    console.log(`   💭 抽象概念: ${knowledge.abstractConcepts.length}個`);
    console.log(`   ❓ 質問パターン: ${knowledge.questionPatterns.length}個`);
    console.log(`   💡 説明パターン: ${knowledge.explanationPatterns.length}個`);
  }

  /**
   * 学習データセットの生成
   */
  private generateLearningDataset(knowledgeBase: ExtractedKnowledge[]): LearningDataset {
    const allConcepts = knowledgeBase.flatMap(k => k.mainConcepts);
    const allTechnicalTerms = knowledgeBase.flatMap(k => k.technicalTerms);
    const allAbstractConcepts = knowledgeBase.flatMap(k => k.abstractConcepts);
    
    return {
      metadata: {
        totalLogs: knowledgeBase.length,
        totalConcepts: new Set(allConcepts).size,
        extractionDate: new Date().toISOString().split('T')[0],
        coverageTypes: [...new Set(knowledgeBase.map(k => k.dialogueType))]
      },
      
      conceptDatabase: {
        coreStructuralConcepts: this.extractUniqueTerms(allConcepts, ['構造的', '対話', '思考']),
        aiCollaborationTerms: this.extractUniqueTerms(allConcepts, ['AI', '協働', 'パートナー']),
        philosophicalConcepts: this.extractUniqueTerms(allAbstractConcepts, ['意識', '存在', '認知']),
        technicalTerms: [...new Set(allTechnicalTerms)].slice(0, 30),
        emergentConcepts: this.extractEmergentConcepts(knowledgeBase)
      },
      
      dialoguePatterns: {
        questionFormations: [...new Set(knowledgeBase.flatMap(k => k.questionPatterns))].slice(0, 15),
        explanationPatterns: [...new Set(knowledgeBase.flatMap(k => k.explanationPatterns))].slice(0, 12),
        transitionPhrases: [...new Set(knowledgeBase.flatMap(k => k.transitionWords))],
        conclusionMarkers: this.extractConclusionMarkers(knowledgeBase)
      },
      
      qualityIndicators: {
        highQualityPhrases: this.extractHighQualityPhrases(knowledgeBase),
        structuralMarkers: this.extractStructuralMarkers(knowledgeBase),
        depthIndicators: this.extractDepthIndicators(knowledgeBase)
      },
      
      trainingExamples: this.generateTrainingExamples(knowledgeBase)
    };
  }

  /**
   * 特定キーワードを含む用語を抽出
   */
  private extractUniqueTerms(terms: string[], keywords: string[]): string[] {
    return [...new Set(terms.filter(term => 
      keywords.some(keyword => term.includes(keyword))
    ))].slice(0, 15);
  }

  /**
   * 創発的概念の抽出
   */
  private extractEmergentConcepts(knowledgeBase: ExtractedKnowledge[]): string[] {
    // 高品質ログからの新しい概念
    const highQualityLogs = knowledgeBase.filter(k => k.logicalCoherence > 85);
    const emergentTerms = highQualityLogs.flatMap(k => k.keyPhrases);
    
    return [...new Set(emergentTerms)]
      .filter(term => term.length > 4)
      .slice(0, 12);
  }

  /**
   * 結論マーカーの抽出
   */
  private extractConclusionMarkers(knowledgeBase: ExtractedKnowledge[]): string[] {
    const markers = ['結論として', '要するに', '総括すると', '最終的に', 'まとめると', 'つまり'];
    return markers.filter(marker => 
      knowledgeBase.some(k => k.representativeSentences.some(s => s.includes(marker)))
    );
  }

  /**
   * 高品質フレーズの抽出
   */
  private extractHighQualityPhrases(knowledgeBase: ExtractedKnowledge[]): string[] {
    const highQualityLogs = knowledgeBase.filter(k => k.logicalCoherence > 85);
    return highQualityLogs
      .flatMap(k => k.keyPhrases)
      .filter(phrase => phrase.length > 5)
      .slice(0, 20);
  }

  /**
   * 構造マーカーの抽出
   */
  private extractStructuralMarkers(knowledgeBase: ExtractedKnowledge[]): string[] {
    return ['まず', '次に', 'さらに', '最後に', '第一に', '第二に', '具体的には', '例えば'];
  }

  /**
   * 深度指標の抽出
   */
  private extractDepthIndicators(knowledgeBase: ExtractedKnowledge[]): string[] {
    return ['深く考えると', '本質的には', '根本的に', '哲学的に', '体系的に', '包括的に'];
  }

  /**
   * 訓練用例の生成
   */
  private generateTrainingExamples(knowledgeBase: ExtractedKnowledge[]): Array<{
    input: string;
    expectedConcepts: string[];
    expectedType: string;
    qualityScore: number;
  }> {
    return knowledgeBase
      .filter(k => k.representativeSentences.length > 0)
      .slice(0, 15)
      .map(k => ({
        input: k.representativeSentences[0],
        expectedConcepts: k.mainConcepts.slice(0, 3),
        expectedType: k.dialogueType,
        qualityScore: k.logicalCoherence
      }));
  }

  /**
   * 結果の保存
   */
  private saveResults(knowledgeBase: ExtractedKnowledge[], dataset: LearningDataset): void {
    // 詳細知識ベース
    writeFileSync(
      'knowledge-extraction-results.json',
      JSON.stringify(knowledgeBase, null, 2),
      'utf-8'
    );

    // 学習データセット
    writeFileSync(
      'learning-dataset.json',
      JSON.stringify(dataset, null, 2),
      'utf-8'
    );

    // 人間が読みやすい要約
    const summary = this.generateSummaryReport(knowledgeBase, dataset);
    writeFileSync(
      'knowledge-summary.md',
      summary,
      'utf-8'
    );

    console.log('💾 結果保存完了:');
    console.log('   - knowledge-extraction-results.json (詳細データ)');
    console.log('   - learning-dataset.json (学習用データセット)');
    console.log('   - knowledge-summary.md (人間向け要約)');
  }

  /**
   * 要約レポートの生成
   */
  private generateSummaryReport(knowledgeBase: ExtractedKnowledge[], dataset: LearningDataset): string {
    return `# 🧠 ログ知識抽出・学習データ化レポート

## 📊 抽出統計
- **分析ログ数**: ${dataset.metadata.totalLogs}件
- **抽出概念数**: ${dataset.metadata.totalConcepts}個
- **対話形式**: ${dataset.metadata.coverageTypes.join(', ')}
- **抽出日**: ${dataset.metadata.extractionDate}

## 🔑 コア構造概念 (${dataset.conceptDatabase.coreStructuralConcepts.length}個)
${dataset.conceptDatabase.coreStructuralConcepts.map(c => `- ${c}`).join('\n')}

## 🤖 AI協働用語 (${dataset.conceptDatabase.aiCollaborationTerms.length}個)
${dataset.conceptDatabase.aiCollaborationTerms.map(c => `- ${c}`).join('\n')}

## 💭 哲学的概念 (${dataset.conceptDatabase.philosophicalConcepts.length}個)
${dataset.conceptDatabase.philosophicalConcepts.map(c => `- ${c}`).join('\n')}

## 🔧 技術用語 (${dataset.conceptDatabase.technicalTerms.length}個)
${dataset.conceptDatabase.technicalTerms.map(c => `- ${c}`).join('\n')}

## 💡 創発的概念 (${dataset.conceptDatabase.emergentConcepts.length}個)
${dataset.conceptDatabase.emergentConcepts.map(c => `- ${c}`).join('\n')}

## ❓ 質問パターン例
${dataset.dialoguePatterns.questionFormations.slice(0, 5).map(q => `- ${q}`).join('\n')}

## 💡 説明パターン例
${dataset.dialoguePatterns.explanationPatterns.slice(0, 5).map(e => `- ${e}`).join('\n')}

## 🏆 高品質フレーズ
${dataset.qualityIndicators.highQualityPhrases.slice(0, 10).map(p => `- "${p}"`).join('\n')}

## 📈 ログ品質分析
${knowledgeBase.map(k => `- **${k.filename}**: 概念密度${k.conceptDensity.toFixed(3)}, 論理性${k.logicalCoherence.toFixed(1)}%`).join('\n')}

## 🎯 学習データ活用提案
1. **概念抽出アルゴリズムの改善**: コア概念データベースを活用
2. **対話パターン認識**: 質問・説明パターンの機械学習
3. **品質評価モデル**: 高品質フレーズによる自動評価
4. **新概念検出**: 創発的概念による未知概念の発見

---

このデータセットを用いて、統一ログ処理システムの精度向上と新機能開発が可能です。
`;
  }

  /**
   * 結果サマリーの表示
   */
  printDatasetSummary(dataset: LearningDataset): void {
    console.log('🧠 学習データセット生成完了');
    console.log('='.repeat(60));
    console.log(`📁 分析ログ数: ${dataset.metadata.totalLogs}件`);
    console.log(`🔑 抽出概念数: ${dataset.metadata.totalConcepts}個`);
    console.log(`🎭 対話形式: ${dataset.metadata.coverageTypes.join(', ')}`);
    
    console.log('\n📊 概念データベース:');
    console.log(`   構造的概念: ${dataset.conceptDatabase.coreStructuralConcepts.length}個`);
    console.log(`   AI協働用語: ${dataset.conceptDatabase.aiCollaborationTerms.length}個`);
    console.log(`   哲学的概念: ${dataset.conceptDatabase.philosophicalConcepts.length}個`);
    console.log(`   技術用語: ${dataset.conceptDatabase.technicalTerms.length}個`);
    console.log(`   創発概念: ${dataset.conceptDatabase.emergentConcepts.length}個`);
    
    console.log('\n🎯 対話パターン:');
    console.log(`   質問形式: ${dataset.dialoguePatterns.questionFormations.length}個`);
    console.log(`   説明形式: ${dataset.dialoguePatterns.explanationPatterns.length}個`);
    console.log(`   転換語: ${dataset.dialoguePatterns.transitionPhrases.length}個`);
    
    console.log('\n📈 学習用例:');
    console.log(`   訓練例数: ${dataset.trainingExamples.length}個`);
    console.log(`   平均品質: ${(dataset.trainingExamples.reduce((sum, ex) => sum + ex.qualityScore, 0) / dataset.trainingExamples.length).toFixed(1)}/100`);
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const extractor = new KnowledgeExtractor();
  
  extractor.extractKnowledge()
    .then(dataset => {
      extractor.printDatasetSummary(dataset);
      console.log('\n🎯 学習データ活用により、システムの精度向上が期待できます！');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 知識抽出エラー:', error);
      process.exit(1);
    });
}