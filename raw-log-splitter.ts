#!/usr/bin/env node

/**
 * 生ログ分割ツール
 * 長い対話ログを意味境界で適切に分割し、文脈圧縮を防ぐ
 */

interface SplitOptions {
  targetChunkSize: number;        // 目標分割サイズ（文字数）
  maxChunkSize: number;           // 最大許容サイズ
  minChunkSize: number;           // 最小許容サイズ
  preserveContext: boolean;       // 文脈境界の保持
  addChunkHeaders: boolean;       // チャンクヘッダーの追加
  overlapSize: number;           // チャンク間のオーバーラップサイズ
}

interface LogChunk {
  index: number;
  content: string;
  metadata: ChunkMetadata;
  boundaries: BoundaryInfo[];
}

interface ChunkMetadata {
  startPosition: number;
  endPosition: number;
  characterCount: number;
  estimatedTokens: number;
  containsDialogue: boolean;
  contextSummary: string;
  splitReason: 'size_limit' | 'natural_boundary' | 'dialogue_break' | 'topic_change';
}

interface BoundaryInfo {
  type: 'dialogue_turn' | 'topic_shift' | 'timestamp' | 'user_prompt' | 'ai_response';
  position: number;
  confidence: number;
  marker: string;
}

class RawLogSplitter {
  private options: SplitOptions;
  
  // 境界検出パターン
  private boundaryPatterns = {
    // 対話ターン境界
    dialogueTurn: [
      /^(User|Human|You|ユーザー|人間)[:：]\s*/im,
      /^(Assistant|AI|Bot|Claude|GPT|アシスタント)[:：]\s*/im,
      /^(##?\s*)(User|Human|Assistant|AI)[:：]?\s*/im
    ],
    
    // タイムスタンプ境界
    timestamp: [
      /^\d{4}[-/]\d{2}[-/]\d{2}[\s\t]+\d{2}:\d{2}/m,
      /^\[\d{2}:\d{2}:\d{2}\]/m,
      /^(日時|Time|Timestamp)[:：]\s*\d/im
    ],
    
    // トピック変更境界
    topicShift: [
      /^(次に|では|さて|ところで|次は|Now|Next|However|Meanwhile)[:：,、．。]/im,
      /^(新しい|別の|他の|異なる)(話題|トピック|テーマ|内容)/im,
      /^(## |### |#### )/m,  // マークダウン見出し
      /^---+$/m  // 水平線
    ],
    
    // プロンプト境界
    userPrompt: [
      /^[>#]+\s*.+$/m,
      /^(質問|Question|Q)[:：]\s*/im,
      /^(指示|Instruction|Command)[:：]\s*/im
    ],
    
    // 応答終了境界
    responseEnd: [
      /\n\n(以上|終了|完了|Done|Finished|End)[\.\。]?\s*$/im,
      /\n\n(何か|他に)(質問|ご質問|聞きたい).*ですか[\?\？]?\s*$/im,
      /\n\n(お疲れ|ありがとう).*でした[\.\。]?\s*$/im
    ]
  };

  constructor(options: Partial<SplitOptions> = {}) {
    this.options = {
      targetChunkSize: 10000,
      maxChunkSize: 12000,
      minChunkSize: 5000,
      preserveContext: true,
      addChunkHeaders: true,
      overlapSize: 500,
      ...options
    };
  }

  /**
   * 生ログを適切なチャンクに分割
   */
  splitRawLog(rawLog: string, sessionContext?: string): LogChunk[] {
    console.log(`📄 生ログ分割開始: ${rawLog.length}文字`);
    
    // 1. 境界点の検出
    const boundaries = this.detectBoundaries(rawLog);
    console.log(`🎯 検出境界数: ${boundaries.length}`);
    
    // 2. 最適分割点の選択
    const splitPoints = this.selectOptimalSplitPoints(rawLog, boundaries);
    console.log(`✂️ 分割点: ${splitPoints.length}`);
    
    // 3. チャンク生成
    const chunks = this.generateChunks(rawLog, splitPoints, sessionContext);
    console.log(`📦 生成チャンク数: ${chunks.length}`);
    
    // 4. 品質検証
    this.validateChunks(chunks, rawLog);
    
    return chunks;
  }

  /**
   * 境界点検出
   */
  private detectBoundaries(text: string): BoundaryInfo[] {
    const boundaries: BoundaryInfo[] = [];
    
    // 各パターンタイプで境界検出
    Object.entries(this.boundaryPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(text)) !== null) {
          boundaries.push({
            type: type as any,
            position: match.index,
            confidence: this.calculateBoundaryConfidence(type, match, text),
            marker: match[0].trim()
          });
          
          // グローバル検索でない場合は1回で終了
          if (!pattern.global) break;
        }
      });
    });
    
    // 位置順でソート
    return boundaries.sort((a, b) => a.position - b.position);
  }

  /**
   * 境界の信頼度計算
   */
  private calculateBoundaryConfidence(
    type: string, 
    match: RegExpExecArray, 
    text: string
  ): number {
    let confidence = 0.5; // ベース信頼度
    
    const position = match.index;
    const beforeText = text.substring(Math.max(0, position - 100), position);
    const afterText = text.substring(position, position + 100);
    
    // タイプ別信頼度調整
    switch (type) {
      case 'dialogueTurn':
        // 行の始まりにある場合は高信頼度
        if (position === 0 || text[position - 1] === '\n') confidence += 0.3;
        // 直前に空行がある場合
        if (beforeText.endsWith('\n\n')) confidence += 0.2;
        break;
        
      case 'timestamp':
        // 行の始まりかつ直前に空行
        if (beforeText.endsWith('\n\n') || position === 0) confidence += 0.4;
        break;
        
      case 'topicShift':
        // 前後に適度な文章量がある場合
        if (beforeText.length > 50 && afterText.length > 50) confidence += 0.2;
        break;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * 最適分割点選択
   */
  private selectOptimalSplitPoints(text: string, boundaries: BoundaryInfo[]): number[] {
    const splitPoints: number[] = [0]; // 開始点
    let currentPosition = 0;
    
    while (currentPosition < text.length) {
      const targetEnd = currentPosition + this.options.targetChunkSize;
      const maxEnd = currentPosition + this.options.maxChunkSize;
      
      if (targetEnd >= text.length) {
        // 最後のチャンク
        break;
      }
      
      // 目標範囲内の最適境界を検索
      const candidateBoundaries = boundaries.filter(b => 
        b.position >= targetEnd - 1000 && 
        b.position <= maxEnd &&
        b.position > currentPosition + this.options.minChunkSize
      );
      
      let selectedBoundary: BoundaryInfo | null = null;
      
      if (candidateBoundaries.length > 0) {
        // 信頼度が最も高い境界を選択
        selectedBoundary = candidateBoundaries.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
      }
      
      if (selectedBoundary) {
        splitPoints.push(selectedBoundary.position);
        currentPosition = selectedBoundary.position;
      } else {
        // 強制分割（最大サイズ制限）
        const forcedSplit = Math.min(maxEnd, text.length);
        splitPoints.push(forcedSplit);
        currentPosition = forcedSplit;
      }
    }
    
    return splitPoints;
  }

  /**
   * チャンク生成
   */
  private generateChunks(
    text: string, 
    splitPoints: number[], 
    sessionContext?: string
  ): LogChunk[] {
    const chunks: LogChunk[] = [];
    
    for (let i = 0; i < splitPoints.length; i++) {
      const start = splitPoints[i];
      const end = i < splitPoints.length - 1 ? splitPoints[i + 1] : text.length;
      
      // オーバーラップ処理
      const overlapStart = Math.max(0, start - (i > 0 ? this.options.overlapSize : 0));
      const overlapEnd = Math.min(text.length, end + (i < splitPoints.length - 1 ? this.options.overlapSize : 0));
      
      const chunkContent = text.substring(overlapStart, overlapEnd);
      const coreContent = text.substring(start, end);
      
      // メタデータ生成
      const metadata: ChunkMetadata = {
        startPosition: start,
        endPosition: end,
        characterCount: coreContent.length,
        estimatedTokens: Math.ceil(coreContent.length / 4), // 概算
        containsDialogue: this.containsDialogue(coreContent),
        contextSummary: this.generateContextSummary(coreContent),
        splitReason: this.determineSplitReason(start, splitPoints, text)
      };
      
      // 境界情報抽出
      const chunkBoundaries = this.detectBoundaries(chunkContent);
      
      // ヘッダー追加
      let finalContent = chunkContent;
      if (this.options.addChunkHeaders && chunks.length >= 0) {
        finalContent = this.addChunkHeader(chunkContent, i + 1, splitPoints.length, metadata, sessionContext);
      }
      
      chunks.push({
        index: i + 1,
        content: finalContent,
        metadata,
        boundaries: chunkBoundaries
      });
    }
    
    return chunks;
  }

  /**
   * 対話含有判定
   */
  private containsDialogue(content: string): boolean {
    const dialogueIndicators = [
      /^(User|Human|Assistant|AI)[:：]/im,
      /という質問/,
      /について教えて/,
      /どう思いますか/,
      /以下のような回答/
    ];
    
    return dialogueIndicators.some(pattern => pattern.test(content));
  }

  /**
   * 文脈要約生成
   */
  private generateContextSummary(content: string): string {
    const firstLines = content.split('\n').slice(0, 3).join(' ');
    const summary = firstLines.substring(0, 100);
    
    // キーワード抽出
    const keywords = this.extractKeywords(content);
    
    return keywords.length > 0 
      ? `${summary}... [キーワード: ${keywords.slice(0, 3).join(', ')}]`
      : `${summary}...`;
  }

  /**
   * キーワード抽出
   */
  private extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    
    // 頻出技術用語パターン
    const techPatterns = [
      /構造的対話/g,
      /[A-Z][a-z]+[A-Z][a-z]+/g, // CamelCase
      /[a-zA-Z]{3,}(?:\s+[a-zA-Z]{3,}){1,2}/g // 技術用語
    ];
    
    techPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        keywords.push(...matches.slice(0, 5));
      }
    });
    
    return [...new Set(keywords)];
  }

  /**
   * 分割理由判定
   */
  private determineSplitReason(
    position: number, 
    splitPoints: number[], 
    text: string
  ): ChunkMetadata['splitReason'] {
    // 境界検出による分割かサイズ制限による分割かを判定
    const nearbyBoundaries = this.detectBoundaries(
      text.substring(Math.max(0, position - 50), position + 50)
    );
    
    if (nearbyBoundaries.length > 0) {
      const highConfidenceBoundary = nearbyBoundaries.find(b => b.confidence > 0.7);
      if (highConfidenceBoundary) {
        return 'natural_boundary';
      }
    }
    
    return 'size_limit';
  }

  /**
   * チャンクヘッダー追加
   */
  private addChunkHeader(
    content: string,
    chunkIndex: number,
    totalChunks: number,
    metadata: ChunkMetadata,
    sessionContext?: string
  ): string {
    const header = `# 構造化対話ログ - チャンク ${chunkIndex}/${totalChunks}

## 📋 チャンク情報
- **文字数**: ${metadata.characterCount}
- **推定トークン**: ${metadata.estimatedTokens}
- **分割理由**: ${metadata.splitReason}
- **対話含有**: ${metadata.containsDialogue ? 'あり' : 'なし'}
- **文脈要約**: ${metadata.contextSummary}

${sessionContext ? `## 🔗 セッション文脈\n${sessionContext}\n` : ''}
## 📄 ログ内容

${content}

---
*このチャンクは自動分割されました。構造化時は他のチャンクとの関連性を考慮してください。*`;

    return header;
  }

  /**
   * チャンク品質検証
   */
  private validateChunks(chunks: LogChunk[], originalText: string): void {
    console.log('\n🔍 チャンク品質検証:');
    
    // 全体カバレッジ確認
    let totalCoverage = 0;
    chunks.forEach(chunk => {
      totalCoverage += chunk.metadata.endPosition - chunk.metadata.startPosition;
    });
    
    console.log(`  📊 カバレッジ: ${totalCoverage}/${originalText.length} (${(totalCoverage/originalText.length*100).toFixed(1)}%)`);
    
    // サイズ分布確認
    const sizes = chunks.map(c => c.metadata.characterCount);
    console.log(`  📏 サイズ範囲: ${Math.min(...sizes)} - ${Math.max(...sizes)}文字`);
    console.log(`  📏 平均サイズ: ${Math.round(sizes.reduce((a,b) => a+b, 0) / sizes.length)}文字`);
    
    // 対話含有率確認
    const dialogueChunks = chunks.filter(c => c.metadata.containsDialogue).length;
    console.log(`  💬 対話含有率: ${dialogueChunks}/${chunks.length} (${(dialogueChunks/chunks.length*100).toFixed(1)}%)`);
  }

  /**
   * 構造化プロンプト生成
   */
  generateStructuringPrompts(chunks: LogChunk[], sessionContext?: string): string[] {
    return chunks.map((chunk, index) => {
      const isFirst = index === 0;
      const isLast = index === chunks.length - 1;
      
      let prompt = `以下の生ログチャンク（${chunk.index}/${chunks.length}）を構造化対話ログに変換してください。\n\n`;
      
      if (sessionContext) {
        prompt += `## セッション文脈\n${sessionContext}\n\n`;
      }
      
      prompt += `## チャンク情報\n`;
      prompt += `- 文字数: ${chunk.metadata.characterCount}\n`;
      prompt += `- 分割理由: ${chunk.metadata.splitReason}\n`;
      prompt += `- 文脈要約: ${chunk.metadata.contextSummary}\n\n`;
      
      if (!isFirst) {
        prompt += `## 継続指示\nこれは${chunk.index}番目のチャンクです。前のチャンクからの文脈継承を意識してください。\n\n`;
      }
      
      if (!isLast) {
        prompt += `## 分割注意\nこのチャンクの後に続きがあります。意図的に未完了で終わっている可能性を考慮してください。\n\n`;
      }
      
      prompt += `## 構造化指示\n`;
      prompt += `1. 対話の意図・決定・変更を明確に抽出\n`;
      prompt += `2. 再帰性や継承性の要素を特定\n`;
      prompt += `3. 標準的な構造化ログ形式で出力\n\n`;
      
      prompt += `## 生ログ\n\n${chunk.content}`;
      
      return prompt;
    });
  }
}

// 使用例とテスト
if (require.main === module) {
  const splitter = new RawLogSplitter({
    targetChunkSize: 8000,  // テスト用に小さく設定
    maxChunkSize: 10000,
    preserveContext: true,
    addChunkHeaders: true,
    overlapSize: 300
  });
  
  // サンプル生ログ（長い対話のシミュレーション）
  const sampleRawLog = `
User: 構造的対話について詳しく教えてください。
特に、AIとの対話における構造化の意義について知りたいです。