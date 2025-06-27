#!/usr/bin/env node

// 前半部分は raw-log-splitter.ts と同じなので、実行部分のみを完成

import { RawLogSplitter } from './raw-log-splitter';

// 使用例とテスト
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