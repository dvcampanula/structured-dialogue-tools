#!/usr/bin/env node

/**
 * CacheManager - LRUキャッシュ管理システム
 * 
 * 概念抽出結果のキャッシュを効率的に管理し、
 * メモリ使用量を最適化するLRU（Least Recently Used）システム
 */

/**
 * LRUキャッシュ管理システム
 */
export class CacheManager<T> {
  private cache: Map<string, T> = new Map();
  private accessOrder: string[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * キャッシュからアイテムを取得
   */
  public get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (item !== undefined) {
      // アクセス順序を更新（LRU管理）
      this.updateAccessOrder(key);
      return item;
    }
    return undefined;
  }

  /**
   * キャッシュにアイテムを設定
   */
  public set(key: string, value: T): void {
    if (this.cache.has(key)) {
      // 既存キーの場合、値を更新してアクセス順序を更新
      this.cache.set(key, value);
      this.updateAccessOrder(key);
    } else {
      // 新規キーの場合
      if (this.cache.size >= this.maxSize) {
        // サイズ制限に達している場合、最も古いアイテムを削除
        this.evictLeastRecentlyUsed();
      }
      
      this.cache.set(key, value);
      this.accessOrder.push(key);
    }
  }

  /**
   * キャッシュからアイテムを削除
   */
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
    }
    return deleted;
  }

  /**
   * キャッシュの存在確認
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * キャッシュのクリア
   */
  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * キャッシュサイズの取得
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュ統計の取得
   */
  public getStats(): {
    currentSize: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    // 簡易的なメモリ使用量計算
    const memoryUsage = this.calculateApproximateMemoryUsage();
    
    return {
      currentSize: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitRate,
      memoryUsage
    };
  }

  /**
   * キャッシュキーの一覧取得
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * キャッシュ値の一覧取得
   */
  public values(): T[] {
    return Array.from(this.cache.values());
  }

  /**
   * メモリクリーンアップの実行
   */
  public performMemoryCleanup(): {
    beforeSize: number;
    afterSize: number;
    freedItems: number;
  } {
    const beforeSize = this.cache.size;
    
    // 使用頻度の低いアイテムを削除（上位25%を保持）
    const keepCount = Math.ceil(this.cache.size * 0.75);
    const itemsToRemove = this.cache.size - keepCount;
    
    for (let i = 0; i < itemsToRemove; i++) {
      this.evictLeastRecentlyUsed();
    }
    
    const afterSize = this.cache.size;
    
    return {
      beforeSize,
      afterSize,
      freedItems: beforeSize - afterSize
    };
  }

  /**
   * キャッシュ設定の更新
   */
  public updateSettings(newMaxSize: number): void {
    (this as any).maxSize = newMaxSize;
    
    // 新しいサイズ制限に合わせて調整
    while (this.cache.size > this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * キャッシュ内容のエクスポート
   */
  public export(): { key: string; value: T }[] {
    return Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      value
    }));
  }

  /**
   * キャッシュ内容のインポート
   */
  public import(items: { key: string; value: T }[]): void {
    this.clear();
    
    items.forEach(({ key, value }) => {
      this.set(key, value);
    });
  }

  // プライベートメソッド

  private hitCount = 0;
  private missCount = 0;

  private get hitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? this.hitCount / total : 0;
  }

  /**
   * アクセス順序の更新（LRU管理）
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    this.hitCount++;
  }

  /**
   * アクセス順序から削除
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 最も古いアイテムを削除（LRU）
   */
  private evictLeastRecentlyUsed(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * 近似メモリ使用量の計算
   */
  private calculateApproximateMemoryUsage(): number {
    // 簡易的な計算（実際のメモリ使用量は複雑）
    let totalSize = 0;
    
    this.cache.forEach((value, key) => {
      // キーのサイズ
      totalSize += key.length * 2; // 文字列は2バイト/文字で近似
      
      // 値のサイズ（オブジェクトの場合は簡易計算）
      if (typeof value === 'string') {
        totalSize += value.length * 2;
      } else if (typeof value === 'object' && value !== null) {
        totalSize += JSON.stringify(value).length * 2;
      } else {
        totalSize += 8; // プリミティブ値は8バイトで近似
      }
    });
    
    return totalSize / (1024 * 1024); // MBに変換
  }
}

/**
 * 概念抽出結果専用のキャッシュマネージャー
 */
export class ConceptExtractionCacheManager extends CacheManager<any> {
  constructor() {
    super(100); // デフォルト100エントリ
  }

  /**
   * コンテンツハッシュの生成
   */
  public generateCacheKey(content: string, options?: any): string {
    // コンテンツとオプションからユニークなキーを生成
    const optionsString = options ? JSON.stringify(options) : '';
    const combinedString = content + optionsString;
    
    // 簡易ハッシュ関数
    let hash = 0;
    for (let i = 0; i < combinedString.length; i++) {
      const char = combinedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    
    return `extract_${Math.abs(hash)}_${content.length}`;
  }

  /**
   * 概念抽出結果の取得
   */
  public getCachedResult(content: string, options?: any): any | undefined {
    const key = this.generateCacheKey(content, options);
    return this.get(key);
  }

  /**
   * 概念抽出結果のキャッシュ
   */
  public cacheResult(content: string, result: any, options?: any): void {
    const key = this.generateCacheKey(content, options);
    this.set(key, result);
  }

  /**
   * キャッシュ効率の分析
   */
  public analyzeCacheEfficiency(): {
    stats: ReturnType<CacheManager<any>['getStats']>;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const recommendations: string[] = [];

    if (stats.hitRate < 0.3) {
      recommendations.push('キャッシュヒット率が低いです。キャッシュサイズの増加を検討してください');
    }

    if (stats.memoryUsage > 50) {
      recommendations.push('メモリ使用量が高いです。キャッシュサイズの削減またはクリーンアップを実行してください');
    }

    if (stats.currentSize === stats.maxSize) {
      recommendations.push('キャッシュが満杯です。サイズ増加またはより頻繁なクリーンアップを検討してください');
    }

    return {
      stats,
      recommendations
    };
  }
}