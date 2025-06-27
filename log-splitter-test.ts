#!/usr/bin/env node

/**
 * 生ログ分割ツールのテスト実行
 */

// 簡易版の分割テスト
function testLogSplitter() {
  console.log('📄 生ログ分割ツール - テスト実行');
  console.log('='.repeat(40));

  // サンプル生ログ（長い対話のシミュレーション）
  const sampleRawLog = `
User: 構造的対話について詳しく教えてください。
特に、AIとの対話における構造化の意義について知りたいです。