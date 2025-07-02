import fs from 'fs/promises';

// ProcessingOptionsの型定義
export interface ProcessingOptions {
  useParallelProcessing?: boolean;
  maxConcurrency?: number;
  chunkSize?: number;
  enableDetailedLogging?: boolean;
  preserveOriginalOrder?: boolean;
}

// Semaphoreクラスの実装
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        this.permits--;
        next();
      }
    }
  }
}

/**
 * チャンク処理システム
 * 大容量コンテンツの分割処理と並列処理を管理
 */
export class ChunkProcessor {
  private tokenizer: any = null;

  constructor() {
    // 初期化処理
  }

  /**
   * トークナイザーの設定
   */
  public setTokenizer(tokenizer: any): void {
    this.tokenizer = tokenizer;
  }

  /**
   * 大きなコンテンツを文境界でチャンクに分割してトークナイズ
   */
  public async tokenizeInChunks(content: string): Promise<any[]> {
    if (!this.tokenizer) {
      console.warn('⚠️ トークナイザーが初期化されていません。空の結果を返します。');
      return [];
    }

    const maxChunkSize = 50000; // 50KB per chunk
    const chunks = this.splitIntoChunks(content, maxChunkSize);
    
    console.log(`🔗 トークナイズ処理: ${chunks.length}チャンクに分割`);
    
    try {
      // 並列処理でトークナイズ
      const tokenizePromises = chunks.map(async (chunk, index) => {
        try {
          console.log(`🔍 チャンク${index + 1}/${chunks.length} トークナイズ中...`);
          const tokens = await this.tokenizer.tokenize(chunk);
          return tokens || [];
        } catch (error) {
          console.warn(`⚠️ チャンク${index + 1}のトークナイズでエラー:`, error);
          return [];
        }
      });
      
      const chunkTokens = await Promise.all(tokenizePromises);
      
      // 結果を統合
      const allTokens = chunkTokens.flat();
      console.log(`✅ トークナイズ完了: ${allTokens.length}トークン`);
      
      return allTokens;
    } catch (error) {
      console.error('❌ チャンクトークナイズでエラー:', error);
      return [];
    }
  }

  /**
   * コンテンツを指定サイズでチャンクに分割（文境界考慮）
   */
  public splitIntoChunks(content: string, chunkSize: number = 10000): string[] {
    if (content.length <= chunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    let currentPos = 0;

    while (currentPos < content.length) {
      let endPos = Math.min(currentPos + chunkSize, content.length);
      
      // 文境界で分割するため、最後の句点を探す
      if (endPos < content.length) {
        const lastSentenceEnd = content.lastIndexOf('。', endPos);
        const lastNewline = content.lastIndexOf('\n', endPos);
        const adjustedEndPos = Math.max(lastSentenceEnd, lastNewline);
        
        if (adjustedEndPos > currentPos + chunkSize * 0.5) {
          endPos = adjustedEndPos + 1; // 句点または改行の次の文字から
        }
      }
      
      chunks.push(content.substring(currentPos, endPos));
      currentPos = endPos;
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * チャンクを並列処理で概念抽出
   */
  public async processChunksInParallel<T>(
    chunks: string[],
    processor: (chunk: string, index: number) => Promise<T>,
    options: ProcessingOptions = {}
  ): Promise<T[]> {
    const maxConcurrency = options.maxConcurrency || Math.min(4, chunks.length);
    const semaphore = new Semaphore(maxConcurrency);
    const results: T[] = new Array(chunks.length);

    // 並列処理用のチャンク処理関数
    const processChunk = async (chunk: string, index: number): Promise<void> => {
      await semaphore.acquire();
      try {
        if (options.enableDetailedLogging) {
          console.log(`🔄 チャンク${index + 1}/${chunks.length} 処理開始`);
        }
        const result = await processor(chunk, index);
        results[index] = result;
        if (options.enableDetailedLogging) {
          console.log(`✅ チャンク${index + 1}/${chunks.length} 処理完了`);
        }
      } catch (error) {
        console.error(`❌ チャンク${index + 1}でエラー:`, error);
        throw error;
      } finally {
        semaphore.release();
      }
    };

    // 全チャンクを並列処理
    const processingPromises = chunks.map((chunk, index) => processChunk(chunk, index));
    await Promise.all(processingPromises);

    return results;
  }

  /**
   * チャンクを逐次処理で概念抽出（メモリ使用量を抑制）
   */
  public async processChunksSequentially<T>(
    chunks: string[],
    processor: (chunk: string, index: number) => Promise<T>,
    options: ProcessingOptions = {}
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (options.enableDetailedLogging) {
        console.log(`🔄 チャンク${i + 1}/${chunks.length} 逐次処理中...`);
      }
      
      try {
        const result = await processor(chunks[i], i);
        results.push(result);
        
        if (options.enableDetailedLogging) {
          console.log(`✅ チャンク${i + 1}/${chunks.length} 処理完了`);
        }
      } catch (error) {
        console.error(`❌ チャンク${i + 1}でエラー:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * 最適並列度の動的計算（チャンク vs バッチ処理の競合解決）
   */
  public calculateOptimalParallelChunks(content: string, chunkCount: number, options?: ProcessingOptions): number {
    const contentSize = Buffer.byteLength(content, 'utf8');
    const availableMemory = 1024 * 1024 * 1024; // 1GB想定
    const maxConcurrency = options?.maxConcurrency || 4;
    
    // メモリベースの並列度制限
    const memoryBasedLimit = Math.floor(availableMemory / (contentSize / chunkCount));
    
    // CPU効率ベースの並列度制限  
    const cpuBasedLimit = Math.min(chunkCount, maxConcurrency);
    
    // 動的最適化：小さなチャンクは並列度を上げ、大きなチャンクは制限
    const chunkSizeCategory = this.categorizeChunkSize(contentSize / chunkCount);
    let dynamicMultiplier = 1;
    
    switch (chunkSizeCategory) {
      case 'small':
        dynamicMultiplier = 1.5;
        break;
      case 'medium':
        dynamicMultiplier = 1.0;
        break;
      case 'large':
        dynamicMultiplier = 0.7;
        break;
    }
    
    const optimalParallelism = Math.min(
      Math.floor(Math.min(memoryBasedLimit, cpuBasedLimit) * dynamicMultiplier),
      chunkCount
    );
    
    console.log(`⚡ 最適並列度算出: ${optimalParallelism} (チャンク数: ${chunkCount}, カテゴリ: ${chunkSizeCategory})`);
    
    return Math.max(1, optimalParallelism);
  }

  /**
   * チャンクサイズのカテゴリ分類
   */
  private categorizeChunkSize(chunkSize: number): 'small' | 'medium' | 'large' {
    if (chunkSize < 5000) return 'small';
    if (chunkSize < 20000) return 'medium';
    return 'large';
  }

  /**
   * チャンク処理結果の統合
   */
  public combineChunkResults<T>(results: T[], combiner: (accumulator: T, current: T) => T): T | null {
    if (results.length === 0) return null;
    if (results.length === 1) return results[0];
    
    return results.reduce(combiner);
  }

  /**
   * チャンク処理結果のマージ（配列型結果用）
   */
  public mergeArrayResults<T>(results: T[][]): T[] {
    return results.flat();
  }

  /**
   * チャンク処理結果のマージ（オブジェクト型結果用）
   */
  public mergeObjectResults<T extends Record<string, any>>(results: T[]): T {
    return results.reduce((merged, current) => {
      return { ...merged, ...current };
    }, {} as T);
  }

  /**
   * チャンク処理統計の生成
   */
  public generateChunkStats(
    originalContentSize: number,
    chunkCount: number,
    processingTime: number,
    options: ProcessingOptions
  ): {
    originalSize: number;
    chunkCount: number;
    averageChunkSize: number;
    processingTime: number;
    throughput: number;
    processingMode: string;
  } {
    return {
      originalSize: originalContentSize,
      chunkCount,
      averageChunkSize: Math.round(originalContentSize / chunkCount),
      processingTime,
      throughput: Math.round(originalContentSize / processingTime),
      processingMode: options.useParallelProcessing ? 'parallel' : 'sequential'
    };
  }

  /**
   * チャンク処理性能の最適化提案
   */
  public suggestOptimizations(stats: {
    originalSize: number;
    chunkCount: number;
    averageChunkSize: number;
    processingTime: number;
    throughput: number;
    processingMode: string;
  }): string[] {
    const suggestions: string[] = [];
    
    // チャンクサイズの最適化提案
    if (stats.averageChunkSize < 1000) {
      suggestions.push('チャンクサイズが小さすぎます。より大きなチャンクで処理効率を向上させることを検討してください。');
    } else if (stats.averageChunkSize > 50000) {
      suggestions.push('チャンクサイズが大きすぎます。より小さなチャンクでメモリ使用量を削減することを検討してください。');
    }
    
    // 並列処理モードの提案
    if (stats.processingMode === 'sequential' && stats.chunkCount >= 4) {
      suggestions.push('並列処理を有効にすることで処理時間を短縮できる可能性があります。');
    } else if (stats.processingMode === 'parallel' && stats.chunkCount < 2) {
      suggestions.push('チャンク数が少ないため、逐次処理の方が効率的な可能性があります。');
    }
    
    // スループットベースの提案
    if (stats.throughput < 1000) {
      suggestions.push('処理スループットが低いです。チャンクサイズまたは並列度の調整を検討してください。');
    }
    
    return suggestions;
  }

  /**
   * エラー処理とリトライ機能付きチャンク処理
   */
  public async processChunksWithRetry<T>(
    chunks: string[],
    processor: (chunk: string, index: number) => Promise<T>,
    options: ProcessingOptions & { maxRetries?: number } = {}
  ): Promise<(T | null)[]> {
    const maxRetries = options.maxRetries || 3;
    const results: (T | null)[] = new Array(chunks.length).fill(null);
    
    const processChunkWithRetry = async (chunk: string, index: number): Promise<T | null> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await processor(chunk, index);
        } catch (error) {
          console.warn(`⚠️ チャンク${index + 1} 試行${attempt}/${maxRetries}でエラー:`, error);
          
          if (attempt === maxRetries) {
            console.error(`❌ チャンク${index + 1} 最大試行回数に達しました。スキップします。`);
            return null;
          }
          
          // 指数バックオフで待機
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      return null;
    };
    
    if (options.useParallelProcessing !== false) {
      // 並列処理
      const promises = chunks.map((chunk, index) => processChunkWithRetry(chunk, index));
      return await Promise.all(promises);
    } else {
      // 逐次処理
      for (let i = 0; i < chunks.length; i++) {
        results[i] = await processChunkWithRetry(chunks[i], i);
      }
      return results;
    }
  }

  /**
   * メモリ効率的なストリーミングチャンク処理
   */
  public async *processChunksStreaming<T>(
    chunks: string[],
    processor: (chunk: string, index: number) => Promise<T>,
    options: ProcessingOptions = {}
  ): AsyncGenerator<{ index: number; result: T | null; error?: Error }, void, unknown> {
    for (let i = 0; i < chunks.length; i++) {
      try {
        if (options.enableDetailedLogging) {
          console.log(`🔄 ストリーミング処理: チャンク${i + 1}/${chunks.length}`);
        }
        
        const result = await processor(chunks[i], i);
        yield { index: i, result };
        
      } catch (error) {
        console.error(`❌ ストリーミング処理でエラー: チャンク${i + 1}`, error);
        yield { index: i, result: null, error: error as Error };
      }
    }
  }
}