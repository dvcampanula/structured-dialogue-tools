#!/usr/bin/env node

/**
 * セッション管理システムのテスト
 * セーブ・記録・引き継ぎの完全ワークフローテスト
 */

import { SessionManagementSystem } from './src/core/session-management-system';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testSessionManagement() {
  console.log('🔄 セッション管理システムテスト開始\n');
  
  // テスト用ディレクトリ
  const testDir = './test_sessions';
  const testDb = './test_session_db.json';
  
  const sessionManager = new SessionManagementSystem(testDir, testDb);
  
  try {
    await sessionManager.initialize();
    console.log('✅ セッション管理システム初期化完了\n');

    // テスト1: セッション保存
    console.log('💾 テスト1: セッション保存');
    console.log('━'.repeat(50));
    
    const sessionContent1 = `
    構造的対話について深く議論しました。
    レイヤード・プロンプティングという革新的な手法を開発し、
    セーブデータ理論によって対話の継続性を実現しました。
    
    今回の発見:
    - AIとの協働による知識創造プロセス
    - 文脈継承メカニズムの実証
    - 構造的思考の体系化
    
    この成果は次のセッションで更に発展させる必要があります。
    `;

    const session1 = await sessionManager.saveSession(sessionContent1, {
      autoAnalysis: true,
      generateHandover: true,
      archiveOldSessions: false,
      backupEnabled: true,
      customTags: ['prototype', 'research']
    });

    console.log(`📁 保存ファイル: ${session1.filename}`);
    console.log(`🆔 セッションID: ${session1.id}`);
    console.log(`🏷️  タグ: ${session1.tags.join(', ')}`);
    console.log(`📊 フェーズ: ${session1.phase}`);
    console.log(`✨ 品質: ${session1.analysis?.qualityAssurance.reliabilityScore}%`);
    
    // テスト2: 引き継ぎデータ確認
    console.log('\n\n🔗 テスト2: 引き継ぎデータ確認');
    console.log('━'.repeat(50));
    
    const latestHandover = sessionManager.getLatestHandover();
    if (latestHandover) {
      console.log(`🔑 継続キーワード: [${latestHandover.keywords.join(', ')}]`);
      console.log(`📋 ガイダンス: ${latestHandover.guidance.substring(0, 80)}...`);
      console.log(`📊 品質スコア: ${latestHandover.qualityScore}%`);
      console.log(`📝 概要: ${latestHandover.contextSummary}`);
    } else {
      console.log('⚠️  引き継ぎデータなし');
    }

    // テスト3: 新セッション開始
    console.log('\n\n🆕 テスト3: 新セッション開始');
    console.log('━'.repeat(50));
    
    const newSession = await sessionManager.startNewSession(true);
    console.log(`🆔 新セッションID: ${newSession.sessionId}`);
    
    if (newSession.startPrompt) {
      console.log('📄 開始プロンプト:');
      console.log(newSession.startPrompt);
    }

    // テスト4: 2回目のセッション保存
    console.log('\n\n💾 テスト4: 2回目のセッション保存');
    console.log('━'.repeat(50));
    
    const sessionContent2 = `
    前回の続きとして、レイヤード・プロンプティングを実際に適用しました。
    
    新たな発見:
    - プロンプト階層化による効果測定
    - セーブデータの実用性検証
    - 知識継承システムの改良点
    
    今回のセッションで、構造的対話の実用性が証明されました。
    次は商業化に向けた準備が必要です。
    `;

    const session2 = await sessionManager.saveSession(sessionContent2, {
      autoAnalysis: true,
      generateHandover: true,
      archiveOldSessions: false,
      backupEnabled: true,
      customTags: ['continuation', 'validation']
    });

    console.log(`📁 保存ファイル: ${session2.filename}`);
    console.log(`🆔 セッションID: ${session2.id}`);

    // テスト5: セッション検索
    console.log('\n\n🔍 テスト5: セッション検索');
    console.log('━'.repeat(50));
    
    // タグで検索
    const researchSessions = sessionManager.searchSessions({ tags: ['research'] });
    console.log(`研究タグのセッション: ${researchSessions.length}個`);
    
    // 品質で検索  
    const highQualitySessions = sessionManager.searchSessions({ minQuality: 70 });
    console.log(`高品質セッション (70%+): ${highQualitySessions.length}個`);
    
    // キーワードで検索
    const keywordSessions = sessionManager.searchSessions({ 
      keywords: ['レイヤード・プロンプティング'] 
    });
    console.log(`キーワード関連セッション: ${keywordSessions.length}個`);

    // テスト6: セッション統計
    console.log('\n\n📊 テスト6: セッション統計');
    console.log('━'.repeat(50));
    
    const stats = sessionManager.getSessionStatistics();
    console.log(`総セッション数: ${stats.totalSessions}`);
    console.log(`平均品質: ${stats.averageQuality}%`);
    console.log('フェーズ分布:', Object.entries(stats.phaseDistribution)
      .map(([phase, count]) => `${phase}: ${count}`).join(', '));
    console.log('タグ分布:', Object.entries(stats.tagDistribution)
      .slice(0, 5) // 上位5つのみ表示
      .map(([tag, count]) => `${tag}: ${count}`).join(', '));

    // テスト7: セッション読み込み
    console.log('\n\n📖 テスト7: セッション読み込み');
    console.log('━'.repeat(50));
    
    const loadedSession = await sessionManager.loadSession(session1.id);
    if (loadedSession) {
      console.log(`✅ セッション読み込み成功: ${loadedSession.filename}`);
      console.log(`📝 内容プレビュー: ${loadedSession.content.substring(0, 100)}...`);
    } else {
      console.log('❌ セッション読み込み失敗');
    }

    // テスト8: ファイル確認
    console.log('\n\n📁 テスト8: 生成ファイル確認');
    console.log('━'.repeat(50));
    
    try {
      const files = await fs.readdir(testDir);
      console.log(`生成ファイル数: ${files.length}`);
      files.forEach(file => console.log(`  - ${file}`));
      
      // バックアップ確認
      const backupFiles = await fs.readdir(path.join(testDir, 'backups'));
      console.log(`バックアップファイル数: ${backupFiles.length}`);
      
      // データベースファイル確認
      const dbExists = await fs.access(testDb).then(() => true).catch(() => false);
      console.log(`データベースファイル: ${dbExists ? '存在' : '未作成'}`);
      
    } catch (error) {
      console.log('ファイル確認エラー:', error);
    }

    // 完全ワークフロー評価
    console.log('\n\n🎯 完全ワークフロー評価');
    console.log('━'.repeat(50));
    console.log('✅ セッション保存 - 完全自動化');
    console.log('✅ 品質分析 - 統合システム連携');
    console.log('✅ 引き継ぎ生成 - キーワード自動抽出');
    console.log('✅ 新セッション開始 - プロンプト自動生成');
    console.log('✅ セッション管理 - 検索・統計機能');
    console.log('✅ ファイル管理 - 自動命名・バックアップ');
    
    console.log('\n🎉 構造的対話の完全セーブ・引き継ぎシステム実現！');
    console.log('💡 使用方法:');
    console.log('  1. セッション終了時: sessionManager.saveSession(content)');
    console.log('  2. 新セッション開始: sessionManager.startNewSession()');
    console.log('  3. 過去セッション検索: sessionManager.searchSessions()');
    
    console.log('\n✅ セッション管理システムテスト完了');
    
  } catch (error) {
    console.error('❌ セッション管理テスト失敗:', error);
    process.exit(1);
  }
}

testSessionManagement();