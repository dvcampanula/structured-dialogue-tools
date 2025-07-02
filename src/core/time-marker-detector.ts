#!/usr/bin/env node

/**
 * TimeMarkerDetector - 時間革命マーカー検出システム
 * 
 * 時間効率の革新的変化や効率向上を示すマーカーを
 * 検出・分析・評価するシステム
 */

// 時間革命マーカー用の型定義
export interface TimeRevolutionMarker {
  marker: string;
  timeExpression: string;
  efficiency: 'moderate' | 'high' | 'revolutionary';
  context: string;
  position: number;
}

/**
 * 時間革命マーカー検出システム
 */
export class TimeMarkerDetector {
  private timePatterns: RegExp[] = [];

  constructor() {
    this.initializeTimePatterns();
  }

  /**
   * 時間革命マーカーの検出（重複除去・品質向上）
   */
  public detectTimeRevolutionMarkers(content: string): TimeRevolutionMarker[] {
    const markers: TimeRevolutionMarker[] = [];
    const uniqueMarkers = new Set<string>();

    this.timePatterns.forEach((pattern, index) => {
      let match;
      pattern.lastIndex = 0; // 正規表現の状態リセット
      while ((match = pattern.exec(content)) !== null) {
        const timeExpression = match[1];
        const context = match[0];
        const efficiency = this.evaluateTimeEfficiency(timeExpression, context);
        const position = match.index || 0;
        
        // 重複チェック（位置ベース）
        const uniqueKey = `${timeExpression}_${Math.floor(position / 50)}`; // 50文字範囲で同一視
        if (!uniqueMarkers.has(uniqueKey)) {
          uniqueMarkers.add(uniqueKey);
          
          markers.push({
            marker: match[0],
            timeExpression,
            efficiency,
            context: this.extractTimeContext(content, position, 80),
            position
          });
        }
      }
    });

    // 学習データからの革命的時間パターン（厳選）
    const revolutionaryTimePatterns = [
      '30分で解決', '2-3時間で突破', '短時間で革新', '瞬時に発見', '一気に解決',
      '従来の数十倍の効率', '劇的な時間短縮', '効率革命', '時間革命'
    ];
    
    revolutionaryTimePatterns.forEach(pattern => {
      const position = content.indexOf(pattern);
      if (position !== -1) {
        const uniqueKey = `revolutionary_${pattern}`;
        if (!uniqueMarkers.has(uniqueKey)) {
          uniqueMarkers.add(uniqueKey);
          
          markers.push({
            marker: pattern,
            timeExpression: pattern,
            efficiency: 'revolutionary',
            context: this.extractTimeContext(content, position, 80),
            position
          });
        }
      }
    });

    return this.optimizeTimeMarkers(markers);
  }

  /**
   * 時間革命マーカーの統計分析
   */
  public analyzeTimeEfficiencyStats(markers: TimeRevolutionMarker[]): {
    totalMarkers: number;
    revolutionaryCount: number;
    highEfficiencyCount: number;
    moderateEfficiencyCount: number;
    averagePosition: number;
    efficiencyRatio: number;
  } {
    const revolutionary = markers.filter(m => m.efficiency === 'revolutionary');
    const high = markers.filter(m => m.efficiency === 'high');
    const moderate = markers.filter(m => m.efficiency === 'moderate');
    
    const averagePosition = markers.length > 0 
      ? markers.reduce((sum, m) => sum + m.position, 0) / markers.length 
      : 0;
    
    const efficiencyRatio = markers.length > 0 
      ? (revolutionary.length * 3 + high.length * 2 + moderate.length) / markers.length 
      : 0;

    return {
      totalMarkers: markers.length,
      revolutionaryCount: revolutionary.length,
      highEfficiencyCount: high.length,
      moderateEfficiencyCount: moderate.length,
      averagePosition,
      efficiencyRatio
    };
  }

  /**
   * 時間コンテキストの抽出
   */
  private extractTimeContext(content: string, position: number, length: number): string {
    const start = Math.max(0, position - length / 2);
    const end = Math.min(content.length, position + length / 2);
    const context = content.substring(start, end);
    
    // 日本語の文境界で調整
    const sentences = context.split(/[。！？]/);
    if (sentences.length > 2) {
      return sentences.slice(-2, -1)[0] + '。';
    }
    
    return context;
  }

  /**
   * 時間効率の評価
   */
  private evaluateTimeEfficiency(timeExpression: string, context: string): 'moderate' | 'high' | 'revolutionary' {
    // 革命的効率パターン
    if (/瞬時|一気|劇的|革命|数十倍|爆速|超高速/.test(timeExpression + context)) {
      return 'revolutionary';
    }
    
    // 高効率パターン
    if (/短時間|高速|効率|迅速|素早|急速/.test(timeExpression + context)) {
      return 'high';
    }
    
    // 数値ベースの評価
    const numberMatch = timeExpression.match(/(\d+)\s*(分|時間|日|秒)/);
    if (numberMatch) {
      const value = parseInt(numberMatch[1]);
      const unit = numberMatch[2];
      
      switch (unit) {
        case '秒':
          return value <= 30 ? 'revolutionary' : 'high';
        case '分':
          return value <= 5 ? 'revolutionary' : value <= 30 ? 'high' : 'moderate';
        case '時間':
          return value <= 1 ? 'high' : value <= 8 ? 'moderate' : 'moderate';
        case '日':
          return value <= 1 ? 'moderate' : 'moderate';
      }
    }
    
    return 'moderate';
  }

  /**
   * 時間マーカーの最適化（重複除去・品質フィルタ）
   */
  private optimizeTimeMarkers(allTimeMarkers: TimeRevolutionMarker[]): TimeRevolutionMarker[] {
    // 信頼度ベースでソート
    const sortedMarkers = allTimeMarkers.sort((a, b) => {
      const efficiencyScore = { 'revolutionary': 3, 'high': 2, 'moderate': 1 };
      return efficiencyScore[b.efficiency] - efficiencyScore[a.efficiency];
    });
    
    // 位置近接による重複除去（100文字以内は同一とみなす）
    const optimizedMarkers: TimeRevolutionMarker[] = [];
    const usedPositions = new Set<number>();
    
    for (const marker of sortedMarkers) {
      const nearbyUsed = Array.from(usedPositions).some(pos => 
        Math.abs(pos - marker.position) < 100
      );
      
      if (!nearbyUsed) {
        optimizedMarkers.push(marker);
        usedPositions.add(marker.position);
        
        // 最大20個に制限
        if (optimizedMarkers.length >= 20) break;
      }
    }
    
    return optimizedMarkers;
  }

  /**
   * 時間パターンの初期化
   */
  private initializeTimePatterns(): void {
    // 基本的な時間パターン
    this.timePatterns = [
      // 数値 + 時間単位パターン
      /(\d+\s*[分時間日秒]+)(?:で|に|以内に).*?(?:完了|解決|達成|実現|成功)/g,
      
      // 効率表現パターン  
      /(短時間|瞬時|一気|高速|迅速|素早く|急速に)/g,
      
      // 比較効率パターン
      /(従来の?\s*\d*\s*倍|数十倍|爆発的|劇的に).*?(効率|速度|スピード)/g,
      
      // 革命的変化パターン
      /(時間革命|効率革命|処理革命|スピード革命)/g,
      
      // 具体的改善パターン
      /(\d+%?\s*(?:向上|改善|短縮|高速化))/g
    ];
  }

  /**
   * パターン統計の取得
   */
  public getPatternStats(): {
    patternCount: number;
    patternTypes: string[];
  } {
    return {
      patternCount: this.timePatterns.length,
      patternTypes: [
        '数値時間パターン',
        '効率表現パターン', 
        '比較効率パターン',
        '革命的変化パターン',
        '具体的改善パターン'
      ]
    };
  }

  /**
   * 時間パターンの追加
   */
  public addTimePattern(pattern: RegExp): void {
    this.timePatterns.push(pattern);
  }

  /**
   * 効率評価のカスタマイズ
   */
  public setCustomEfficiencyThresholds(thresholds: {
    revolutionary: { seconds?: number; minutes?: number; hours?: number };
    high: { seconds?: number; minutes?: number; hours?: number };
  }): void {
    // カスタム閾値の設定（将来の拡張用）
    console.log('効率評価閾値を設定:', thresholds);
  }
}