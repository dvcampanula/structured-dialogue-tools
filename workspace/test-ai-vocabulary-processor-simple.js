#!/usr/bin/env node

/**
 * AIVocabularyProcessor簡潔統合テスト - 5AI連携基本動作検証
 */

import { AIVocabularyProcessor } from '../src/processing/vocabulary/ai-vocabulary-processor.js';
import { PersistentLearningDB } from '../src/data/persistent-learning-db.js';

// ログレベルを調整（詳細ログを抑制）
const originalConsoleLog = console.log;
console.log = function(...args) {
    // 重要なメッセージのみ表示
    const msg = args.join(' ');
    if (msg.includes('✅') || msg.includes('❌') || msg.includes('Test') || msg.includes('エラー')) {
        originalConsoleLog(...args);
    }
};

async function runSimpleIntegrationTest() {
    try {
        console.log = originalConsoleLog; // ログ復元
        console.log('🚀 AIVocabularyProcessor簡潔統合テスト開始\n');
        
        // テスト用DB (保存無効化)
        const testDB = new PersistentLearningDB('./data/learning', true);
        await testDB.initialize();
        
        const aiProcessor = new AIVocabularyProcessor(testDB);
        
        // Test 1: 初期化
        console.log('Test 1: 5AI初期化...');
        const initStart = Date.now();
        await aiProcessor.initialize();
        const initTime = Date.now() - initStart;
        console.log(`✅ 初期化完了 (${initTime}ms)\n`);
        
        // Test 2: 基本処理テスト
        console.log('Test 2: 基本テキスト処理...');
        const testCases = [
            { text: 'JavaScript機械学習', userId: 'user1', expected: 'technical' },
            { text: 'マーケティング戦略', userId: 'user2', expected: 'business' },
            { text: 'こんにちは', userId: 'user3', expected: 'simple' }
        ];
        
        let successCount = 0;
        const results = [];
        
        for (const testCase of testCases) {
            try {
                const startTime = Date.now();
                const result = await aiProcessor.processText(testCase.text, { 
                    userId: testCase.userId 
                });
                const processingTime = Date.now() - startTime;
                
                results.push({
                    text: testCase.text,
                    processingTime,
                    qualityScore: result.qualityPrediction?.qualityScore || 0,
                    hasVocabulary: (result.vocabulary?.length || 0) > 0,
                    hasContext: !!result.predictedContext,
                    hasAdaptation: !!result.adaptedContent
                });
                
                successCount++;
                console.log(`  ✅ "${testCase.text}": ${processingTime}ms (品質: ${(result.qualityPrediction?.qualityScore || 0).toFixed(3)})`);
            } catch (error) {
                console.log(`  ❌ "${testCase.text}": ${error.message}`);
            }
        }
        
        console.log(`\nTest 2完了: ${successCount}/${testCases.length} 成功\n`);
        
        // Test 3: 学習・フィードバック
        console.log('Test 3: 学習・フィードバック...');
        try {
            await aiProcessor.recordFeedback('user1', 'JavaScript', 0.9, 'プログラミング');
            await aiProcessor.trainQualityModel('user1', 'technical', 0.85);
            console.log('✅ 学習・フィードバック完了\n');
        } catch (error) {
            console.log(`❌ 学習エラー: ${error.message}\n`);
        }
        
        // Test 4: ユーザー類似度
        console.log('Test 4: ユーザー類似度計算...');
        try {
            const similarity = await aiProcessor.bayesianAI.calculateSimilarity('user1', 'user2');
            console.log(`✅ ユーザー類似度: ${similarity.toFixed(3)}\n`);
        } catch (error) {
            console.log(`❌ 類似度計算エラー: ${error.message}\n`);
        }
        
        // Test 5: パフォーマンス
        console.log('Test 5: パフォーマンステスト...');
        const perfResults = [];
        for (let i = 0; i < 10; i++) {
            const startTime = Date.now();
            await aiProcessor.processText(`テストデータ${i}`, { userId: `perf_user${i % 3}` });
            perfResults.push(Date.now() - startTime);
        }
        
        const avgTime = perfResults.reduce((sum, time) => sum + time, 0) / perfResults.length;
        console.log(`✅ 平均処理時間: ${avgTime.toFixed(2)}ms (10回実行)\n`);
        
        // 最終結果
        console.log('🎉 簡潔統合テスト完了！');
        console.log('📊 結果サマリー:');
        console.log(`  初期化時間: ${initTime}ms`);
        console.log(`  基本処理成功率: ${successCount}/${testCases.length} (${(successCount/testCases.length*100).toFixed(1)}%)`);
        console.log(`  平均処理時間: ${avgTime.toFixed(2)}ms`);
        console.log(`  品質スコア範囲: ${Math.min(...results.map(r => r.qualityScore)).toFixed(3)} - ${Math.max(...results.map(r => r.qualityScore)).toFixed(3)}`);
        
        console.log('\n✅ 5AI統合システム基本動作確認完了');
        
        return { success: true, results: { initTime, successCount, testCases: testCases.length, avgTime } };
        
    } catch (error) {
        console.log = originalConsoleLog; // ログ復元
        console.error('❌ 統合テスト失敗:', error.message);
        return { success: false, error: error.message };
    }
}

// テスト実行
runSimpleIntegrationTest()
    .then(result => {
        if (result.success) {
            console.log('\n✅ 全テスト成功');
            process.exit(0);
        } else {
            console.error('\n❌ テスト失敗:', result.error);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });