#!/usr/bin/env node

/**
 * DialoguePhaseAnalyzer - 対話段階分析システム
 * 
 * 対話の進展段階（分析→自己認識→検証→メタ認知）を
 * 時系列的に検出・追跡するシステム
 */

// 対話段階用の型定義
export interface DialoguePhase {
  phase: 'analysis' | 'self_recognition' | 'validation' | 'meta_reflection';
  indicators: string[];
  transitionMarkers: string[];
  minLength: number; // 最小文字数
}

export interface DialoguePhaseResult {
  phase: string;
  startPosition: number;
  endPosition: number;
  confidence: number;
  keyIndicators: string[];
  transitions: string[];
}

/**
 * 対話段階分析システム
 */
export class DialoguePhaseAnalyzer {
  private dialoguePhases: DialoguePhase[] = [];

  constructor() {
    this.initializeDialoguePhases();
  }

  /**
   * 対話段階の検出
   */
  public detectDialoguePhases(content: string): DialoguePhaseResult[] {
    const phases: DialoguePhaseResult[] = [];
    const contentLength = content.length;

    for (const phase of this.dialoguePhases) {
      let startPosition = -1;
      let endPosition = -1;
      const keyIndicators: string[] = [];
      const transitions: string[] = [];

      // 段階指標の検出
      for (const indicator of phase.indicators) {
        const regex = new RegExp(indicator, 'gi');
        const matches = Array.from(content.matchAll(regex));
        
        if (matches.length > 0) {
          keyIndicators.push(`${indicator}: ${matches.length}回`);
          if (startPosition === -1 || (matches[0].index || 0) < startPosition) {
            startPosition = matches[0].index || 0;
          }
        }
      }

      // 遷移マーカーの検出
      for (const marker of phase.transitionMarkers) {
        const regex = new RegExp(marker, 'gi');
        const matches = Array.from(content.matchAll(regex));
        
        if (matches.length > 0) {
          transitions.push(`${marker}: ${matches.length}回`);
        }
      }

      if (keyIndicators.length > 0) {
        endPosition = Math.min(startPosition + phase.minLength, contentLength);
        
        const confidence = Math.min(
          (keyIndicators.length / phase.indicators.length) * 
          (1 + transitions.length * 0.2), 
          1.0
        );

        phases.push({
          phase: phase.phase,
          startPosition,
          endPosition,
          confidence,
          keyIndicators,
          transitions
        });
      }
    }

    return phases.sort((a, b) => a.startPosition - b.startPosition);
  }

  /**
   * 対話進展の分析
   */
  public analyzeDialogueProgression(phases: DialoguePhaseResult[]): {
    totalPhases: number;
    maxConfidence: number;
    averageConfidence: number;
    phaseTransitions: string[];
    progressionQuality: 'poor' | 'moderate' | 'good' | 'excellent';
  } {
    if (phases.length === 0) {
      return {
        totalPhases: 0,
        maxConfidence: 0,
        averageConfidence: 0,
        phaseTransitions: [],
        progressionQuality: 'poor'
      };
    }

    const confidences = phases.map(p => p.confidence);
    const maxConfidence = Math.max(...confidences);
    const averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    const phaseTransitions = phases.map(p => p.phase).join(' → ');

    let progressionQuality: 'poor' | 'moderate' | 'good' | 'excellent';
    if (phases.length >= 3 && averageConfidence >= 0.7) {
      progressionQuality = 'excellent';
    } else if (phases.length >= 2 && averageConfidence >= 0.5) {
      progressionQuality = 'good';
    } else if (phases.length >= 1 && averageConfidence >= 0.3) {
      progressionQuality = 'moderate';
    } else {
      progressionQuality = 'poor';
    }

    return {
      totalPhases: phases.length,
      maxConfidence,
      averageConfidence,
      phaseTransitions: [phaseTransitions],
      progressionQuality
    };
  }

  /**
   * 対話段階パターンの初期化
   */
  private initializeDialoguePhases(): void {
    this.dialoguePhases = [
      {
        phase: 'analysis',
        indicators: ['分析', '検討', '考察', '調査', '研究', '探求'],
        transitionMarkers: ['まず', '最初に', '第一に', '初期段階'],
        minLength: 500
      },
      {
        phase: 'self_recognition', 
        indicators: ['気づく', '理解する', '認識する', '発見する', '自覚する'],
        transitionMarkers: ['ここで', 'この時', '突然', '次第に'],
        minLength: 300
      },
      {
        phase: 'validation',
        indicators: ['検証', '確認', '実証', '証明', 'テスト', '評価'],
        transitionMarkers: ['実際に', '試すと', '確かに', '実証すると'],
        minLength: 400
      },
      {
        phase: 'meta_reflection',
        indicators: ['メタ', '俯瞰', '振り返り', '総括', '統合', '全体像'],
        transitionMarkers: ['総合的に', '全体として', 'メタ的に', '俯瞰すると'],
        minLength: 300
      }
    ];
  }

  /**
   * 段階設定の取得
   */
  public getDialoguePhases(): DialoguePhase[] {
    return [...this.dialoguePhases];
  }

  /**
   * 分析統計の取得
   */
  public getAnalysisStats(): { 
    phaseCount: number; 
    totalIndicators: number; 
    averageMinLength: number 
  } {
    const totalIndicators = this.dialoguePhases.reduce(
      (sum, phase) => sum + phase.indicators.length, 0
    );
    const averageMinLength = this.dialoguePhases.reduce(
      (sum, phase) => sum + phase.minLength, 0
    ) / this.dialoguePhases.length;
    
    return {
      phaseCount: this.dialoguePhases.length,
      totalIndicators,
      averageMinLength
    };
  }
}