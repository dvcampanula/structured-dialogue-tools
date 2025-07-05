#!/usr/bin/env node
/**
 * 統合学習エンジン v1.0.0
 * 
 * 目的: 4つの分散学習エンジンを統合した高性能学習システム
 * - DialogueLogLearner: 概念抽出・対話ログ学習
 * - DynamicRelationshipLearner: 動的関係性学習 (最高優先)
 * - SessionLearningSystem: セッション分析・予測
 * - DynamicPatternLearner: パターン検知・異常検知
 */

import { persistentLearningDB } from './persistent-learning-db.js';
import { DynamicRelationshipLearner } from './dynamic-relationship-learner.js';
import fs from 'fs';
import path from 'path';

export class UnifiedLearningEngine {
  constructor() {
    this.persistentDB = persistentLearningDB;
    this.relationshipLearner = new DynamicRelationshipLearner();
    this.config = this.loadUnifiedConfig();
    this.processingStats = {
      totalProcessed: 0,
      totalConcepts: 0,
      totalRelationships: 0,
      averageProcessingTime: 0
    };
    
    this.initializeEngine();
  }

  async initializeEngine() {
    try {
      console.log('🚀 統合学習エンジン初期化開始');
      await this.relationshipLearner.initializeLearner();
      console.log('✅ 統合学習エンジン初期化完了');
    } catch (error) {
      console.error('❌ 統合学習エンジン初期化エラー:', error);
    }
  }

  loadUnifiedConfig() {
    try {
      const configPath = path.join(process.cwd(), 'src', 'config', 'learning-config.json');
      
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
          // 関係性学習設定 (DynamicRelationshipLearner基準)
          minCoOccurrence: configData.minCoOccurrence || 2,
          strengthThreshold: configData.strengthThreshold || 0.3,
          maxRelationsPerTerm: configData.maxRelationsPerTerm || 10,
          decayFactor: configData.decayFactor || 0.95,
          learningRate: configData.learningRate || 0.1,
          forgettingThreshold: configData.forgettingThreshold || 0.1,
          
          // 概念学習設定 (DialogueLogLearner基準)
          conceptMinLength: configData.conceptMinLength || 2,
          conceptMaxLength: configData.conceptMaxLength || 20,
          qualityThreshold: configData.qualityThreshold || 0.6,
          
          // セッション分析設定 (SessionLearningSystem基準)
          sessionCacheTTL: configData.sessionCacheTTL || 300000, // 5分
          maxSessionHistory: configData.maxSessionHistory || 100,
          
          // パターン検知設定 (DynamicPatternLearner基準)
          anomalyThreshold: configData.anomalyThreshold || 0.7,
          clusteringThreshold: configData.clusteringThreshold || 0.5,
          
          // 統合処理設定
          maxMemorySize: configData.maxMemorySize || 1000,
          batchSaveInterval: configData.batchSaveInterval || 5,
          enableAdvancedAnalysis: configData.enableAdvancedAnalysis || true
        };
      }
    } catch (error) {
      console.error('設定読み込みエラー、デフォルト設定を使用:', error);
    }
    
    return this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      minCoOccurrence: 2,
      strengthThreshold: 0.3,
      maxRelationsPerTerm: 10,
      decayFactor: 0.95,
      learningRate: 0.1,
      forgettingThreshold: 0.1,
      conceptMinLength: 2,
      conceptMaxLength: 20,
      qualityThreshold: 0.6,
      sessionCacheTTL: 300000,
      maxSessionHistory: 100,
      anomalyThreshold: 0.7,
      clusteringThreshold: 0.5,
      maxMemorySize: 1000,
      batchSaveInterval: 5,
      enableAdvancedAnalysis: true
    };
  }

  /**
   * 統合学習処理のメインエントリーポイント
   * Phase 1: DynamicRelationshipLearner統合 (最高優先)
   */
  async processInput(input) {
    const startTime = Date.now();
    
    try {
      // Phase 1: 動的関係性学習 (最高優先・実績あり)
      const relationships = await this.processDynamicRelationships(input);
      
      // Phase 2: 概念抽出 (後続フェーズで実装)
      const concepts = await this.extractConcepts(input);
      
      // Phase 3: セッション分析 (後続フェーズで実装)
      const predictions = await this.analyzeSession(input);
      
      // Phase 4: パターン検知 (後続フェーズで実装)
      const patterns = await this.detectPatterns(input);
      
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime, concepts.length, relationships.length);
      
      const result = {
        concepts,
        relationships,
        predictions,
        patterns,
        metadata: {
          processingTime,
          confidence: this.calculateConfidence(concepts, relationships),
          source: 'UnifiedLearningEngine'
        }
      };
      
      // 永続化処理
      await this.persistLearningResult(result, input);
      
      return result;
      
    } catch (error) {
      console.error('統合学習処理エラー:', error);
      throw error;
    }
  }

  /**
   * Phase 1: 動的関係性学習処理
   * DynamicRelationshipLearnerを統合
   */
  async processDynamicRelationships(input) {
    try {
      // DynamicRelationshipLearnerによる関係性学習
      await this.relationshipLearner.learnFromConversation(
        input.message,
        input.history || [],
        input.response || ""
      );
      
      // 関係性データの取得
      const relationships = [];
      const inputKeywords = this.extractKeywords(input.message);
      
      for (const keyword of inputKeywords) {
        const relatedTerms = this.relationshipLearner.getUserRelations(keyword);
        for (const term of relatedTerms) {
          const strength = this.relationshipLearner.getRelationshipStrength ? 
            this.relationshipLearner.getRelationshipStrength(keyword, term) : 0.5;
          if (strength >= this.config.strengthThreshold) {
            relationships.push({
              source: keyword,
              target: term,
              strength: strength,
              type: 'learned_relation'
            });
          }
        }
      }
      
      return relationships;
      
    } catch (error) {
      console.error('動的関係性学習エラー:', error);
      return [];
    }
  }

  /**
   * Phase 2: 概念抽出処理 (後続実装)
   * DialogueLogLearnerを統合予定
   */
  async extractConcepts(input) {
    try {
      // 現在は簡易的な概念抽出
      const concepts = input.message
        .split(/\s+/)
        .filter(word => word.length >= this.config.conceptMinLength)
        .filter(word => word.length <= this.config.conceptMaxLength)
        .filter(word => !this.isNoiseWord(word))
        .slice(0, 10); // 最大10概念
      
      return concepts;
      
    } catch (error) {
      console.error('概念抽出エラー:', error);
      return [];
    }
  }

  /**
   * ノイズ語の判定
   */
  isNoiseWord(word) {
    const noiseWords = ['は', 'が', 'を', 'に', 'で', 'と', 'の', 'から', 'まで', 'について', 'という', 'です', 'ます', 'である', 'だ', 'する', 'された', 'している', 'されている'];
    return noiseWords.includes(word.toLowerCase());
  }

  /**
   * Phase 3: セッション分析処理 (後続実装)
   * SessionLearningSystemを統合予定
   */
  async analyzeSession(input) {
    try {
      // 現在は基本的なセッション情報のみ
      return [{
        sessionId: input.sessionId || 'default',
        timestamp: new Date().toISOString(),
        inputType: input.type,
        messageLength: input.message.length,
        wordCount: input.message.split(/\s+/).length
      }];
      
    } catch (error) {
      console.error('セッション分析エラー:', error);
      return [];
    }
  }

  /**
   * Phase 4: パターン検知処理 (後続実装)
   * DynamicPatternLearnerを統合予定
   */
  async detectPatterns(input) {
    try {
      // 現在は基本的なパターン情報のみ
      const patterns = [{
        type: 'basic',
        pattern: input.type,
        confidence: 0.5,
        timestamp: new Date().toISOString()
      }];
      
      // 技術用語のパターン検知
      const techKeywords = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Vue.js', 'Angular', 'Python', 'Java', 'CSS', 'HTML'];
      const foundTechKeywords = techKeywords.filter(keyword => 
        input.message.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (foundTechKeywords.length > 0) {
        patterns.push({
          type: 'technical',
          pattern: foundTechKeywords,
          confidence: 0.8,
          timestamp: new Date().toISOString()
        });
      }
      
      return patterns;
      
    } catch (error) {
      console.error('パターン検知エラー:', error);
      return [];
    }
  }

  /**
   * 学習結果の永続化
   */
  async persistLearningResult(result, input) {
    try {
      // 関係性データの永続化
      if (result.relationships && result.relationships.length > 0) {
        await this.persistentDB.recordLearningEvent('unified_learning_relationships', {
          userId: input.userId || 'default',
          relationships: result.relationships
        });
      }
      
      // 統計情報の更新
      await this.updateLearningStats(result);
      
    } catch (error) {
      console.error('学習結果永続化エラー:', error);
    }
  }

  /**
   * 処理統計の更新
   */
  updateProcessingStats(processingTime, conceptCount, relationshipCount) {
    this.processingStats.totalProcessed++;
    this.processingStats.totalConcepts += conceptCount;
    this.processingStats.totalRelationships += relationshipCount;
    
    // 平均処理時間の更新
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1) + processingTime) / 
      this.processingStats.totalProcessed;
  }

  /**
   * 信頼度の計算
   */
  calculateConfidence(concepts, relationships) {
    // 概念数と関係性数に基づく信頼度計算
    const conceptScore = Math.min(concepts.length / 5, 1.0); // 最大5概念で1.0
    const relationshipScore = Math.min(relationships.length / 3, 1.0); // 最大3関係で1.0
    
    return (conceptScore + relationshipScore) / 2;
  }

  /**
   * 学習統計の更新
   */
  async updateLearningStats(result) {
    try {
      const stats = {
        totalProcessed: this.processingStats.totalProcessed,
        totalConcepts: this.processingStats.totalConcepts,
        totalRelationships: this.processingStats.totalRelationships,
        averageProcessingTime: this.processingStats.averageProcessingTime,
        lastUpdated: new Date().toISOString(),
        confidence: result.metadata.confidence
      };
      
      // 正しいメソッド呼び出し
      await this.persistentDB.recordLearningEvent('unified_learning_stats', {
        learningStats: stats
      });
      
    } catch (error) {
      console.error('学習統計更新エラー:', error);
    }
  }

  /**
   * 統合学習エンジンの状態取得
   */
  getEngineStatus() {
    return {
      isInitialized: true,
      config: this.config,
      stats: this.processingStats,
      version: '1.0.0',
      activeModules: {
        relationshipLearner: true,
        conceptExtractor: true,
        sessionAnalyzer: true,
        patternDetector: true
      }
    };
  }

  /**
   * 設定の動的更新
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ 統合学習エンジン設定を更新しました');
  }

  /**
   * 統合学習エンジンの状態リセット
   */
  resetStats() {
    this.processingStats = {
      totalProcessed: 0,
      totalConcepts: 0,
      totalRelationships: 0,
      averageProcessingTime: 0
    };
    console.log('📊 統計情報をリセットしました');
  }

  /**
   * キーワード抽出メソッド
   */
  extractKeywords(message) {
    try {
      // 基本的なキーワード抽出
      const keywords = message
        .split(/\s+/)
        .filter(word => word.length >= this.config.conceptMinLength)
        .filter(word => word.length <= this.config.conceptMaxLength)
        .filter(word => !this.isNoiseWord(word))
        .slice(0, 5); // 最大5キーワード
      
      return keywords;
      
    } catch (error) {
      console.error('キーワード抽出エラー:', error);
      return [];
    }
  }

  /**
   * 学習データのエクスポート
   */
  async exportLearningData(userId = 'default') {
    try {
      const data = {
        userId,
        timestamp: new Date().toISOString(),
        config: this.config,
        stats: this.processingStats,
        relationships: this.persistentDB.getUserSpecificRelations ? 
          this.persistentDB.getUserSpecificRelations(userId) : []
      };
      
      return data;
      
    } catch (error) {
      console.error('学習データエクスポートエラー:', error);
      return null;
    }
  }

  /**
   * 全学習データの強制保存
   */
  async saveAllLearningData() {
    try {
      let savedCount = 0;
      
      // DynamicRelationshipLearnerのデータ保存
      if (this.dynamicLearner) {
        await this.dynamicLearner.saveUserData();
        savedCount++;
      }
      
      // DialogueLogLearnerのデータ保存
      if (this.dialogueLearner && this.dialogueLearner.saveLearningData) {
        await this.dialogueLearner.saveLearningData();
        savedCount++;
      }
      
      // PersonalDialogueAnalyzerのデータ保存
      if (this.personalAnalyzer && this.personalAnalyzer.saveAnalysisData) {
        await this.personalAnalyzer.saveAnalysisData();
        savedCount++;
      }
      
      console.log(`💾 統合学習エンジン: ${savedCount}件の学習データを保存完了`);
      
      return savedCount;
      
    } catch (error) {
      console.error('❌ 統合学習データ保存エラー:', error);
      return 0;
    }
  }
}