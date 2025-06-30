#!/usr/bin/env node

/**
 * 軽量版構造的対話サーバー
 * Windows環境でのテスト用
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'public')));

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '5.0.0-simple'
  });
});

// 簡易概念抽出（Phase 2機能なし）
app.post('/api/extract-concepts', (req, res) => {
  const { logContent } = req.body;
  
  if (!logContent) {
    return res.status(400).json({
      success: false,
      error: 'logContentが必要です'
    });
  }

  // 簡易処理（デモ用）
  const words = logContent.split(/\s+/);
  const concepts = words
    .filter(word => word.length > 3)
    .slice(0, 5)
    .map(word => word.replace(/[.,!?]$/, ''));

  res.json({
    success: true,
    extraction: {
      surfaceConcepts: concepts.map(term => ({
        term,
        classification: 'surface',
        confidence: 0.7,
        reasoning: '簡易抽出',
        matchedPatterns: ['simple']
      })),
      deepConcepts: [{
        term: concepts[0] || 'テスト概念',
        classification: 'deep',
        confidence: 0.8,
        reasoning: '簡易深層概念',
        matchedPatterns: ['simple_deep']
      }],
      timeRevolutionMarkers: [],
      predictedInnovationLevel: 6,
      predictedSocialImpact: 'medium',
      breakthroughProbability: 50,
      similarPatterns: [],
      dialogueTypeDetection: 'simple_test',
      qualityPrediction: {
        conceptDensity: concepts.length,
        innovationPotential: 60,
        structuralDialogueScore: 50,
        overallQuality: 55,
        realTimeMetrics: {
          conceptCoherence: 70,
          dialogueRelevance: 60,
          terminologyAccuracy: 65,
          extractionReliability: 75,
          semanticDepth: 60,
          contextualFitness: 70
        },
        qualityGrade: 'B',
        improvementSuggestions: ['簡易版のため制限があります'],
        domainSpecificScore: 50
      },
      confidence: 70,
      processingTime: 10,
      appliedPatterns: ['simple_pattern'],
      newConceptDetection: {
        hasNewConcepts: true,
        newConceptCount: 1,
        metaConceptCount: 0,
        noveltyScore: 0.6
      },
      predictiveExtraction: {
        predictedConcepts: [{
          term: '予測概念例',
          probability: 0.7,
          predictedClassification: 'deep',
          reasoning: '簡易予測',
          contextClues: ['テスト'],
          emergenceIndicators: []
        }],
        emergentPatterns: ['簡易パターン'],
        hiddenConnections: [],
        conceptEvolutionPrediction: ['概念進化例']
      }
    },
    summary: {
      originalLength: logContent.length,
      surfaceConceptsCount: concepts.length,
      deepConceptsCount: 1,
      timeMarkersCount: 0,
      processingTime: 10
    }
  });
});

// 統一処理（簡易版）
app.post('/api/process-unified', (req, res) => {
  const { rawLog, sessionContext } = req.body;
  
  if (!rawLog) {
    return res.status(400).json({
      success: false,
      error: '生ログが必要です'
    });
  }

  // 簡易処理
  const chunks = [rawLog];
  
  res.json({
    success: true,
    type: 'unified',
    unified: {
      header: {
        title: '簡易処理結果',
        sessionId: 'simple-' + Date.now(),
        timestamp: new Date().toISOString()
      },
      chunks: chunks.map((chunk, index) => ({
        index,
        content: chunk,
        metadata: { type: 'simple' }
      })),
      metadata: {
        totalChunks: chunks.length,
        processingMode: 'simple'
      },
      qualityMetrics: {
        overallQuality: 70,
        coherence: 75
      },
      output: '# 簡易処理結果\n\n' + rawLog
    },
    extraction: {
      surfaceConcepts: [{ term: '簡易概念', classification: 'surface', confidence: 0.7 }],
      deepConcepts: [{ term: '簡易深層概念', classification: 'deep', confidence: 0.8 }],
      predictedInnovationLevel: 6
    },
    summary: {
      originalLength: rawLog.length,
      chunkCount: chunks.length,
      processingTime: 5
    }
  });
});

// その他のエンドポイント（簡易版）
app.post('/api/process-log', (req, res) => {
  res.json({
    success: true,
    chunks: [{ index: 0, content: req.body.rawLog || 'テスト', metadata: {} }],
    summary: { originalLength: 100, chunkCount: 1, avgChunkSize: 100, processingTime: 5 }
  });
});

// メインページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// サーバー起動
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 軽量版構造的対話ツール v5.0 起動`);
  console.log(`📱 URL: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api/`);
  console.log(`⚡ 軽量版: Phase 2機能は簡易版です`);
  console.log(`🌐 WSL外部アクセス: http://localhost:${port} (Windowsブラウザから)`);
});

export default app;