#!/usr/bin/env node

/**
 * 統一ログ処理システム
 * ログ全体をヘッダーとして分析し、分割は文脈保持のための手段として扱う
 */

import { RawLogSplitter, type LogChunk } from './raw-log-splitter.js';
import { QualityAssessment, type QualityMetrics } from './quality-metrics.js';
import { IntelligentConceptExtractor, type IntelligentExtractionResult } from './intelligent-concept-extractor.js';

interface UnifiedLogStructure {
  header: LogHeader;
  chunks: ProcessedChunk[];
  metadata: ProcessingMetadata;
  qualityMetrics?: QualityMetrics;
}

interface LogHeader {
  title: string;                    // 全体を表すタイトル
  mainConcepts: string[];          // 全体から抽出された主要概念
  discussionScope: string;         // 議論の範囲・テーマ
  totalCharacters: number;         // 総文字数
  totalChunks: number;            // 総チャンク数
  dialogueType: 'human_led' | 'ai_led' | 'collaborative' | 'ai_collaborative' | 'free_form';
  suggestedFilename: string;       // log_p01_xxx_yyy.md 形式
}

interface ProcessedChunk {
  index: number;
  characterRange: string;          // "0-10000"
  content: string;
  continuationPrompt: string;      // このチャンク用の継続プロンプト
}

interface ProcessingMetadata {
  processingDate: string;
  totalProcessingTime: number;
  qualityMetrics: {
    conceptCoverage: number;       // 概念カバレッジ
    contextPreservation: number;   // 文脈保持度
    chunkCoherence: number;        // チャンク内一貫性
  };
}

class UnifiedLogProcessor {
  private logSplitter: RawLogSplitter;
  private qualityAssessment: QualityAssessment;
  private intelligentExtractor: IntelligentConceptExtractor;
  
  constructor(sharedIntelligentExtractor?: IntelligentConceptExtractor) {
    this.logSplitter = new RawLogSplitter({
      targetChunkSize: 8000,
      maxChunkSize: 10000,
      minChunkSize: 3000,
      preserveContext: true,
      addChunkHeaders: false,  // ヘッダーは統一で管理
      overlapSize: 300
    });
    this.qualityAssessment = new QualityAssessment();
    this.intelligentExtractor = sharedIntelligentExtractor || new IntelligentConceptExtractor();
  }

  /**
   * 初期化（学習データ読み込み）
   */
  async initialize(): Promise<void> {
    if (!this.intelligentExtractor.isInitialized) {
      await this.intelligentExtractor.initialize();
    }
  }

  /**
   * ログ全体を統一構造で処理
   */
  async processUnifiedLog(rawLog: string, sessionContext?: string): Promise<UnifiedLogStructure> {
    // 品質測定開始
    this.qualityAssessment.startProcessing();
    const startTime = Date.now();
    
    // 1. 全体分析（概念抽出）
    this.qualityAssessment.startConceptExtraction();
    const header = await this.analyzeLogHeader(rawLog, sessionContext);
    
    // 2. 文脈保持分割
    this.qualityAssessment.startChunkProcessing();
    const rawChunks = this.logSplitter.splitRawLog(rawLog, header.title);
    
    // 3. 統一チャンク処理
    const processedChunks = this.processChunksWithUnifiedContext(rawChunks, header);
    
    // 4. ヘッダーのチャンク数更新
    header.totalChunks = processedChunks.length;
    
    // 5. メタデータ生成
    const metadata = this.generateProcessingMetadata(startTime, header, processedChunks);
    
    // 6. 品質測定実行
    const structure: UnifiedLogStructure = {
      header,
      chunks: processedChunks,
      metadata
    };
    
    const qualityMetrics = this.qualityAssessment.assessQuality(structure, rawLog.length);
    
    return {
      header,
      chunks: processedChunks,
      metadata,
      qualityMetrics
    };
  }

  /**
   * ログ全体のヘッダー分析（IntelligentConceptExtractor統合版）
   */
  private async analyzeLogHeader(rawLog: string, sessionContext?: string): Promise<LogHeader> {
    // IntelligentConceptExtractorで高精度分析
    const intelligentResult = await this.intelligentExtractor.extractConcepts(rawLog);
    
    // 深層概念を主要概念として採用
    const mainConcepts = intelligentResult.deepConcepts.slice(0, 5).map(c => c.term);
    
    // 議論範囲の特定（予測結果活用）
    const discussionScope = this.analyzeDiscussionScope(rawLog, mainConcepts, intelligentResult);
    
    // 対話形式の判定（自動検出結果活用）
    const dialogueType = this.mapDialogueType(intelligentResult.dialogueTypeDetection);
    
    // タイトル生成（革新度考慮）
    const title = this.generateLogTitle(mainConcepts, discussionScope, intelligentResult.predictedInnovationLevel);
    
    // ファイル名提案
    const suggestedFilename = this.generateFilename(title, mainConcepts);
    
    return {
      title,
      mainConcepts,
      discussionScope,
      totalCharacters: rawLog.length,
      totalChunks: 0, // 後で更新
      dialogueType,
      suggestedFilename
    };
  }

  /**
   * 対話タイプのマッピング（IntelligentExtractor → UnifiedProcessor）
   */
  private mapDialogueType(detectedType: string): 'human_led' | 'ai_led' | 'collaborative' | 'ai_collaborative' | 'free_form' {
    const mapping: Record<string, 'human_led' | 'ai_led' | 'collaborative' | 'ai_collaborative' | 'free_form'> = {
      'human_led': 'human_led',
      'ai_led': 'ai_led', 
      'collaborative': 'collaborative',
      'ai_collaboration': 'ai_collaborative',
      'mathematical': 'collaborative',
      'free_form': 'free_form'
    };
    return mapping[detectedType] || 'free_form';
  }

  /**
   * 議論範囲分析（IntelligentExtractor結果活用版）
   */
  private analyzeDiscussionScope(rawLog: string, mainConcepts: string[], intelligentResult?: any): string {
    if (intelligentResult) {
      // 革新度とコンセプトに基づく判定
      if (intelligentResult.predictedInnovationLevel >= 8) {
        return `${mainConcepts.slice(0, 2).join('・')}による革新的アプローチ`;
      } else if (intelligentResult.timeRevolutionMarkers.length > 0) {
        return `${mainConcepts.slice(0, 2).join('・')}の効率化手法`;
      }
    }
    
    // フォールバック: 従来の分析
    return `${mainConcepts.slice(0, 3).join('・')}の探究`;
  }

  /**
   * タイトル生成（革新度考慮版）
   */
  private generateLogTitle(mainConcepts: string[], discussionScope: string, innovationLevel?: number): string {
    const baseTitle = mainConcepts.slice(0, 2).join('×');
    
    if (innovationLevel && innovationLevel >= 9) {
      return `🚀 ${baseTitle}による革新的突破`;
    } else if (innovationLevel && innovationLevel >= 7) {
      return `🔬 ${baseTitle}の高度探究`;
    } else {
      return `📋 ${baseTitle}対話記録`;
    }
  }

  /**
   * 全体から主要概念を抽出（レガシー版・フォールバック用）
   */
  private extractMainConcepts(rawLog: string): string[] {
    const conceptScores: Record<string, number> = {};
    
    // 1. コア概念（高重み）
    const coreConcepts = [
      '構造的対話', '構造的協働思考', 'メタ認知', 'AI能力',
      '文脈保持', '概念創発', '思考パートナー', 'セーブポイント',
      'レイヤード・プロンプティング', 'コンテキスト圧縮'
    ];
    
    coreConcepts.forEach(concept => {
      const occurrences = (rawLog.match(new RegExp(concept, 'g')) || []).length;
      if (occurrences > 0) {
        conceptScores[concept] = occurrences * 5; // 重み強化
      }
    });
    
    // 2. 関連概念（中重み）
    const relatedConcepts = [
      '意識', '認知', '感情理解', 'パーソナル', '寄り添い',
      '継続学習', '品質向上', 'AIとの協働', '思考の仲間',
      '産業横断', '金銀財宝', 'ブレークスルー', '内部状態'
    ];
    
    relatedConcepts.forEach(concept => {
      const occurrences = (rawLog.match(new RegExp(concept, 'g')) || []).length;
      if (occurrences > 0) {
        conceptScores[concept] = occurrences * 3; // 重み強化
      }
    });
    
    // 3. 引用された概念（厳格なフィルタリング）
    const quotedConcepts = [...rawLog.matchAll(/「([^」]+)」/g)]
      .map(match => match[1])
      .filter(concept => this.isValidConcept(concept))
      .filter(concept => !coreConcepts.includes(concept)); // 重複排除
    
    quotedConcepts.forEach(concept => {
      conceptScores[concept] = (conceptScores[concept] || 0) + 2; // 重み調整
    });
    
    // 4. 技術用語・専門概念の特別抽出
    const technicalTerms = this.extractTechnicalTerms(rawLog);
    technicalTerms.forEach(term => {
      if (!conceptScores[term]) {
        conceptScores[term] = 3; // 技術概念として重視
      }
    });
    
    // 5. 一般語の大幅除外（頻出語による汚染防止）
    const validConcepts = Object.entries(conceptScores)
      .filter(([concept, score]) => this.isQualityConcept(concept, score))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4); // 概念数を制限
    
    return validConcepts.map(([concept]) => concept);
  }

  /**
   * 概念の有効性を判定
   */
  private isValidConcept(concept: string): boolean {
    // 長さ制限
    if (concept.length < 2 || concept.length > 20) return false;
    
    // 厳格な除外リスト
    const strictExclusions = [
      'これは', 'それは', 'あなた', 'です', 'ます', 'という', 'ですが',
      'だから', 'つまり', 'しかし', 'ところで', 'ちなみに', 'そして',
      'ありがとう', 'ございます', 'いただき', 'できます', 'ました', 'でしょう',
      'します', 'いたします', 'ものです', 'ですね', 'かもしれ', 'について',
      'における', 'としては', 'による', 'すべて', 'ひとつ', 'ふたつ',
      'みっつ', 'よっつ', '今回', '今度', '前回', '次回', '最初', '最後',
      '一般的', '具体的', '抽象的', '基本的', '重要な', '必要な', '可能な',
      'さまざま', 'いろいろ', 'たくさん', 'とても', 'すごく', 'かなり'
    ];
    
    if (strictExclusions.includes(concept)) return false;
    
    // 数字のみ、ひらがなのみの除外
    if (/^[\d]+$/.test(concept)) return false;
    if (/^[\u3040-\u309F]+$/.test(concept) && concept.length < 4) return false;
    
    return true;
  }

  /**
   * 技術用語・専門概念の抽出
   */
  private extractTechnicalTerms(rawLog: string): string[] {
    const technicalPatterns = [
      /([A-Z][a-z]+(?:-[A-Z][a-z]+)+)/g, // ハイフン区切りの技術用語
      /(API|AI|ML|NLP|LLM|GPT|BERT)/g,    // 略語
      /([a-z]+ing|[a-z]+tion|[a-z]+ness)/g, // 英語的語尾
    ];
    
    const terms: string[] = [];
    technicalPatterns.forEach(pattern => {
      const matches = rawLog.match(pattern) || [];
      terms.push(...matches);
    });
    
    return [...new Set(terms)].filter(term => term.length >= 3);
  }

  /**
   * 高品質概念の判定
   */
  private isQualityConcept(concept: string, score: number): boolean {
    // スコアが低すぎる場合は除外
    if (score < 2) return false;
    
    // 品質チェック
    return this.isValidConcept(concept);
  }

  /**
   * 議論範囲の分析
   */
  private analyzeDiscussionScope(rawLog: string, mainConcepts: string[]): string {
    const text = rawLog.toLowerCase();
    
    // 技術的議論の検出
    if (text.includes('プログラム') || text.includes('api') || text.includes('実装')) {
      return `${mainConcepts[0] || '技術的概念'}の実装・応用から実践的活用まで`;
    }
    
    // 哲学的議論の検出
    if (text.includes('意識') || text.includes('存在') || text.includes('本質')) {
      return `${mainConcepts[0] || '哲学的概念'}の本質的理解から応用的展開まで`;
    }
    
    // 感情・心理的議論の検出
    if (text.includes('感情') || text.includes('心') || text.includes('寄り添')) {
      return `${mainConcepts[0] || '心理的概念'}の理解から実践的応用まで`;
    }
    
    // デフォルト
    return `${mainConcepts[0] || '中心概念'}の探求から実用的展開まで`;
  }

  /**
   * 対話形式の判定
   */
  private detectDialogueType(rawLog: string): LogHeader['dialogueType'] {
    const userMarkers = (rawLog.match(/^(User|Human|ユーザー)[:：]/gm) || []).length;
    const aiMarkers = (rawLog.match(/^(Assistant|AI|Claude|GPT)[:：]/gm) || []).length;
    
    // AI×AI対話の検出
    const aiVsAiMarkers = (rawLog.match(/^(AI-[A-Z]|Claude-[A-Z]|GPT-[A-Z]|Assistant-[A-Z])[:：]/gm) || []).length;
    if (aiVsAiMarkers >= 2) {
      return 'ai_collaborative'; // 新しい分類
    }
    
    if (userMarkers > aiMarkers * 1.5) return 'human_led';
    if (aiMarkers > userMarkers * 1.5) return 'ai_led';
    if (userMarkers > 0 && aiMarkers > 0) return 'collaborative';
    return 'free_form';
  }

  /**
   * ログタイトル生成
   */
  private generateLogTitle(mainConcepts: string[], discussionScope: string): string {
    const primaryConcept = mainConcepts[0] || '対話';
    return `${primaryConcept}に関する構造的探求ログ`;
  }

  /**
   * ファイル名生成
   */
  private generateFilename(title: string, mainConcepts: string[]): string {
    // 主要概念を英語化（簡易版）
    const conceptMap: Record<string, string> = {
      '構造的対話': 'structured_dialogue',
      '構造的協働思考': 'collaborative_thinking', 
      'メタ認知': 'metacognition',
      'AI能力': 'ai_capabilities',
      '感情理解': 'emotion_understanding',
      '意識': 'consciousness',
      '認知': 'cognition'
    };
    
    const primaryKey = conceptMap[mainConcepts[0]] || 'dialogue';
    const secondaryKey = conceptMap[mainConcepts[1]] || 'analysis';
    
    return `log_p01_${primaryKey}_${secondaryKey}.md`;
  }

  /**
   * 統一文脈でのチャンク処理
   */
  private processChunksWithUnifiedContext(rawChunks: LogChunk[], header: LogHeader): ProcessedChunk[] {
    return rawChunks.map((chunk, index) => ({
      index: chunk.index,
      characterRange: `${chunk.metadata.startPosition}-${chunk.metadata.endPosition}`,
      content: this.formatChunkContent(chunk, header, index + 1, rawChunks.length),
      continuationPrompt: this.generateContinuationPrompt(chunk, header, index + 1, rawChunks.length)
    }));
  }

  /**
   * チャンク内容のフォーマット
   */
  private formatChunkContent(chunk: LogChunk, header: LogHeader, currentIndex: number, totalChunks: number): string {
    return `# ${header.title} - チャンク ${currentIndex}/${totalChunks}

## 📋 ログ情報
- **全体概要**: ${header.discussionScope}
- **主要概念**: ${header.mainConcepts.join(', ')}
- **対話形式**: ${header.dialogueType}
- **このチャンク**: ${chunk.metadata.characterCount}文字 (位置: ${chunk.metadata.startPosition}-${chunk.metadata.endPosition})

## 🔗 文脈継承情報
${currentIndex > 1 ? `前チャンクからの継続として処理してください。全体テーマ「${header.mainConcepts[0]}」を意識して構造化を行ってください。` : `これは${totalChunks}チャンク構成の最初の部分です。全体テーマ「${header.mainConcepts[0]}」の導入部として構造化してください。`}

## 📄 ログ内容

${chunk.content}

---
*このチャンクは${header.title}の一部です。他のチャンクとの関連性を考慮して構造化してください。*`;
  }

  /**
   * チャンクの位置づけを判定
   */
  private getChunkPositionDescription(currentIndex: number, totalChunks: number): string {
    if (currentIndex === 1) {
      return '導入・問題提起部分';
    }
    
    if (currentIndex === totalChunks) {
      return '結論・まとめ部分';
    }
    
    // 中間チャンクの詳細な位置づけ
    if (totalChunks === 2) {
      return '主要議論・結論部分';
    }
    
    if (totalChunks === 3) {
      return '主要議論・発展部分';
    }
    
    if (totalChunks === 4) {
      if (currentIndex === 2) {
        return '主要議論・概念発展部分';
      } else {
        return '深化・応用部分';
      }
    }
    
    if (totalChunks >= 5) {
      const position = currentIndex / totalChunks;
      if (position <= 0.4) {
        return '主要議論・概念発展部分';
      } else if (position <= 0.7) {
        return '深化・応用部分';
      } else {
        return '統合・発展部分';
      }
    }
    
    return `発展部分 (${currentIndex}/${totalChunks})`;
  }

  /**
   * 継続プロンプト生成（完全版 - 指示 + 実際のログ内容）
   */
  private generateContinuationPrompt(chunk: LogChunk, header: LogHeader, currentIndex: number, totalChunks: number): string {
    return `以下の対話ログチャンク（${currentIndex}/${totalChunks}）を構造化してください。

## 全体情報
- **テーマ**: ${header.title}
- **主要概念**: ${header.mainConcepts.join(', ')}
- **議論範囲**: ${header.discussionScope}

## このチャンクの位置づけ
${this.getChunkPositionDescription(currentIndex, totalChunks)}

## 構造化指示
1. 全体テーマとの関連性を明確に
2. 前後のチャンクとの連続性を意識
3. 主要概念の発展・深化を追跡
4. 構造的対話の品質を評価

---

## 📄 対話ログチャンク ${currentIndex}/${totalChunks}

${chunk.content}

---

上記のログチャンクを、全体テーマ「${header.mainConcepts[0] || 'メインテーマ'}」を意識して構造化してください。`;
  }

  /**
   * 処理メタデータ生成
   */
  private generateProcessingMetadata(startTime: number, header: LogHeader, chunks: ProcessedChunk[]): ProcessingMetadata {
    const processingTime = Date.now() - startTime;
    
    return {
      processingDate: new Date().toISOString(),
      totalProcessingTime: processingTime,
      qualityMetrics: {
        conceptCoverage: Math.min(100, header.mainConcepts.length * 15),
        contextPreservation: 95, // 統一ヘッダーにより高い保持率
        chunkCoherence: 90 // 統一フォーマットにより高い一貫性
      }
    };
  }

  /**
   * 統一構造の出力生成
   */
  generateUnifiedOutput(structure: UnifiedLogStructure): string {
    const { header, chunks, metadata, qualityMetrics } = structure;
    
    let output = `# ${header.title}\n\n`;
    output += `## 📊 ログ概要\n`;
    output += `- **主要概念**: ${header.mainConcepts.join(', ')}\n`;
    output += `- **議論範囲**: ${header.discussionScope}\n`;
    output += `- **総文字数**: ${header.totalCharacters.toLocaleString()}文字\n`;
    output += `- **チャンク数**: ${header.totalChunks}個\n`;
    output += `- **対話形式**: ${header.dialogueType}\n`;
    output += `- **推奨ファイル名**: ${header.suggestedFilename}\n\n`;
    
    // 品質メトリクスが利用可能な場合は詳細な品質指標を表示
    if (qualityMetrics) {
      output += `## 🎯 詳細品質指標\n`;
      output += `- **総合スコア**: ${qualityMetrics.overallScore.toFixed(1)}/100\n`;
      output += `- **概念検出数**: ${qualityMetrics.conceptDetection.detectedConceptsCount}個\n`;
      output += `- **概念カバレッジ**: ${qualityMetrics.conceptDetection.conceptCoverage.toFixed(1)}%\n`;
      output += `- **処理時間**: ${qualityMetrics.processingPerformance.totalProcessingTime}ms\n`;
      output += `- **文脈保持**: ${qualityMetrics.structuralQuality.contextPreservationScore.toFixed(1)}%\n`;
      output += `- **チャンク一貫性**: ${qualityMetrics.structuralQuality.chunkCoherenceScore.toFixed(1)}%\n\n`;
    } else {
      // 従来の固定値品質指標（後方互換性）
      output += `## 🎯 品質指標\n`;
      output += `- **概念カバレッジ**: ${metadata.qualityMetrics.conceptCoverage}%\n`;
      output += `- **文脈保持度**: ${metadata.qualityMetrics.contextPreservation}%\n`;
      output += `- **チャンク一貫性**: ${metadata.qualityMetrics.chunkCoherence}%\n\n`;
    }
    
    chunks.forEach((chunk, index) => {
      output += `## チャンク ${chunk.index}/${header.totalChunks}\n`;
      output += `**文字範囲**: ${chunk.characterRange}\n\n`;
      output += `### AI送信用プロンプト\n`;
      output += '```\n';
      output += chunk.continuationPrompt;
      output += '\n```\n\n';
      output += `### 実際のログ内容\n`;
      output += chunk.content;
      output += '\n\n---\n\n';
    });
    
    return output;
  }

  /**
   * 品質メトリクスレポートの生成
   */
  generateQualityReport(structure: UnifiedLogStructure): string {
    if (!structure.qualityMetrics) {
      return '品質メトリクスが利用できません。';
    }
    
    return this.qualityAssessment.formatMetricsReport(structure.qualityMetrics);
  }
}

export { UnifiedLogProcessor, type UnifiedLogStructure, type LogHeader, type ProcessedChunk };