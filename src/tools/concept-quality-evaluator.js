#!/usr/bin/env node

/**
 * ConceptQualityEvaluator - 定量的品質測定システム
 * 
 * 📊 概念抽出精度の定量的評価・ベンチマーク
 * 🎯 kuromoji vs MeCab vs Hybrid の客観的品質比較
 * 📈 複数指標による包括的品質スコア算出
 */

import fs from 'fs';
import path from 'path';
import { EnhancedHybridLanguageProcessor } from '../core/enhanced-hybrid-processor.js';
import { DialogueLogLearnerAdapter } from '../core/dialogue-log-learner-adapter.js';

export class ConceptQualityEvaluator {
    constructor() {
        this.hybridProcessor = new EnhancedHybridLanguageProcessor();
        this.dialogueAdapter = null;
        this.isInitialized = false;
        
        // 評価データセット
        this.evaluationDatasets = {
            technical: [
                'JavaScriptとTypeScriptを使用してReact.jsアプリケーションを開発し、Node.jsバックエンドとMongoDB NoSQLデータベースを統合します。',
                'AWS LambdaでサーバーレスアーキテクチャをDockerコンテナで構築し、GraphQL APIとREST APIのハイブリッドシステムを実装する。',
                'TensorFlowとPyTorchを活用したディープラーニング分析システムで、CNN、RNN、LSTMニューラルネットワークを統合し、GPUクラスター上で分散処理を実行する。',
                'kuromoji形態素解析とMeCab品詞解析エンジンを統合し、自然言語処理NLPシステムで日本語テキストマイニングと感情分析を最適化する。'
            ],
            business: [
                'デジタルトランスフォーメーションDXプロジェクトにおいて、アジャイル開発手法とDevOpsパイプラインを導入し、継続的インテグレーションCIと継続的デプロイメントCDを実現する。',
                'データサイエンス分析基盤を構築し、機械学習MLモデルによる予測分析とビジネスインテリジェンスBIダッシュボードで経営意思決定を支援する。',
                'マイクロサービスアーキテクチャでAPI Gatewayパターンを採用し、セキュリティとスケーラビリティを確保したクラウドネイティブシステムを設計する。'
            ],
            mixed: [
                'エンジニアリングチームがスクラムフレームワークを使用してソフトウェア開発ライフサイクルSDLCを最適化し、品質保証QAテストとユーザーエクスペリエンスUX改善を並行して進める。',
                'ブロックチェーン技術とスマートコントラクトを活用した分散型アプリケーションDAppの設計において、セキュリティ監査とパフォーマンス最適化を実装する。'
            ]
        };
        
        // 評価指標
        this.qualityMetrics = {
            precision: 0, // 精度 (抽出された用語の正確性)
            recall: 0,    // 再現率 (見逃し率の低さ)
            f1Score: 0,   // F1スコア (精度と再現率の調和平均)
            diversity: 0, // 多様性 (異なるカテゴリの用語抽出)
            confidence: 0, // 信頼度 (抽出された用語の確信度)
            speed: 0      // 処理速度 (ms/文字)
        };
    }

    /**
     * 初期化
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('📊 ConceptQualityEvaluator初期化中...');
            
            await this.hybridProcessor.initialize();
            
            this.isInitialized = true;
            console.log('✅ ConceptQualityEvaluator初期化完了');
            
        } catch (error) {
            console.error('❌ ConceptQualityEvaluator初期化エラー:', error.message);
            throw error;
        }
    }

    /**
     * 包括的品質評価実行
     */
    async runComprehensiveEvaluation() {
        await this.initialize();
        
        console.log('🔬 概念抽出品質 包括的評価開始');
        console.log('=' .repeat(60));

        const evaluationResults = {
            kuromoji: { metrics: {}, details: [] },
            mecab: { metrics: {}, details: [] },
            hybrid: { metrics: {}, details: [] },
            comparison: {},
            summary: {}
        };

        // 各データセットでの評価
        for (const [category, texts] of Object.entries(this.evaluationDatasets)) {
            console.log(`\n📂 ${category.toUpperCase()} データセット評価`);
            
            for (const text of texts) {
                // 1. kuromoji単体評価
                const kuromojiResult = await this.evaluateText(text, 'kuromoji');
                evaluationResults.kuromoji.details.push(kuromojiResult);
                
                // 2. MeCab強化評価
                const mecabResult = await this.evaluateText(text, 'mecab');
                evaluationResults.mecab.details.push(mecabResult);
                
                // 3. ハイブリッド評価
                const hybridResult = await this.evaluateText(text, 'hybrid');
                evaluationResults.hybrid.details.push(hybridResult);
                
                // 結果表示
                console.log(`📝 "${text.substring(0, 50)}..."`);
                console.log(`  kuromoji: ${kuromojiResult.conceptCount}概念 (品質:${kuromojiResult.qualityScore})`);
                console.log(`  MeCab:    ${mecabResult.conceptCount}概念 (品質:${mecabResult.qualityScore})`);
                console.log(`  Hybrid:   ${hybridResult.conceptCount}概念 (品質:${hybridResult.qualityScore})`);
            }
        }

        // 集計・分析
        evaluationResults.kuromoji.metrics = this.calculateAggregateMetrics(evaluationResults.kuromoji.details);
        evaluationResults.mecab.metrics = this.calculateAggregateMetrics(evaluationResults.mecab.details);
        evaluationResults.hybrid.metrics = this.calculateAggregateMetrics(evaluationResults.hybrid.details);

        // 比較分析
        evaluationResults.comparison = this.generateComparison(evaluationResults);
        evaluationResults.summary = this.generateSummary(evaluationResults);

        // 結果出力
        this.displayEvaluationResults(evaluationResults);
        
        // 結果保存
        await this.saveEvaluationResults(evaluationResults);

        return evaluationResults;
    }

    /**
     * 単一テキストの評価
     */
    async evaluateText(text, mode) {
        const startTime = Date.now();
        
        let result;
        switch (mode) {
            case 'kuromoji':
                result = await this.hybridProcessor.processText(text, {
                    enableMeCab: false,
                    enableSimilarity: true,
                    enableGrouping: true,
                    qualityThreshold: 0.6
                });
                break;
                
            case 'mecab':
                result = await this.hybridProcessor.processText(text, {
                    enableMeCab: true,
                    enableSimilarity: false,
                    enableGrouping: false,
                    qualityThreshold: 0.6
                });
                break;
                
            case 'hybrid':
            default:
                result = await this.hybridProcessor.processText(text, {
                    enableMeCab: true,
                    enableSimilarity: true,
                    enableGrouping: true,
                    qualityThreshold: 0.6
                });
                break;
        }
        
        const processingTime = Date.now() - startTime;
        
        // 詳細分析
        const analysis = this.analyzeResult(result, text, processingTime);
        
        return {
            mode,
            text: text.substring(0, 100),
            conceptCount: result.statistics.enhancedTermCount,
            qualityScore: result.statistics.qualityScore,
            processingTime,
            speedScore: text.length / processingTime, // 文字/ms
            categories: this.extractCategories(result.enhancedTerms),
            topConcepts: result.enhancedTerms.slice(0, 5).map(t => ({
                term: t.term,
                confidence: t.confidence,
                sources: t.sources
            })),
            analysis
        };
    }

    /**
     * 結果分析
     */
    analyzeResult(result, originalText, processingTime) {
        const terms = result.enhancedTerms;
        
        // 精度分析 (技術用語の正確性)
        const technicalTerms = terms.filter(t => 
            this.isTechnicalTerm(t.term) && t.confidence > 0.7
        );
        const precision = technicalTerms.length / Math.max(terms.length, 1);
        
        // 多様性分析 (カテゴリの多様性)
        const categories = new Set(terms.map(t => t.category));
        const diversity = categories.size / 5; // 最大5カテゴリを想定
        
        // 信頼度分析
        const avgConfidence = terms.reduce((sum, t) => sum + t.confidence, 0) / Math.max(terms.length, 1);
        
        // MeCab利用率
        const mecabTerms = terms.filter(t => t.sources.includes('MeCab'));
        const mecabRatio = mecabTerms.length / Math.max(terms.length, 1);
        
        return {
            precision: parseFloat(precision.toFixed(3)),
            diversity: parseFloat(diversity.toFixed(3)),
            avgConfidence: parseFloat(avgConfidence.toFixed(3)),
            mecabRatio: parseFloat(mecabRatio.toFixed(3)),
            speedScore: parseFloat((originalText.length / processingTime).toFixed(2)),
            termsBySource: {
                kuromoji: terms.filter(t => t.sources.includes('kuromoji')).length,
                mecab: mecabTerms.length,
                both: terms.filter(t => t.sources.includes('kuromoji') && t.sources.includes('MeCab')).length
            }
        };
    }

    /**
     * 技術用語判定
     */
    isTechnicalTerm(term) {
        const technicalPatterns = [
            /[A-Z]{2,}/, // 大文字略語
            /\w+Script/, // Script系
            /\w+API/, // API関連
            /JavaScript|TypeScript|Python|Java|React|Vue|Angular|Node\.js/,
            /AWS|Azure|GCP|Docker|Kubernetes/,
            /SQL|NoSQL|MongoDB|Redis|GraphQL/,
            /AI|ML|DL|CNN|RNN|LSTM|NLP/,
            /システム|データベース|アプリケーション|フレームワーク|ライブラリ/
        ];
        
        return technicalPatterns.some(pattern => pattern.test(term));
    }

    /**
     * カテゴリ抽出
     */
    extractCategories(terms) {
        const categories = {};
        for (const term of terms) {
            categories[term.category] = (categories[term.category] || 0) + 1;
        }
        return categories;
    }

    /**
     * 集計指標計算
     */
    calculateAggregateMetrics(details) {
        if (details.length === 0) return {};
        
        const metrics = {
            avgConceptCount: details.reduce((sum, d) => sum + d.conceptCount, 0) / details.length,
            avgQualityScore: details.reduce((sum, d) => sum + d.qualityScore, 0) / details.length,
            avgProcessingTime: details.reduce((sum, d) => sum + d.processingTime, 0) / details.length,
            avgSpeedScore: details.reduce((sum, d) => sum + d.speedScore, 0) / details.length,
            avgPrecision: details.reduce((sum, d) => sum + d.analysis.precision, 0) / details.length,
            avgDiversity: details.reduce((sum, d) => sum + d.analysis.diversity, 0) / details.length,
            avgConfidence: details.reduce((sum, d) => sum + d.analysis.avgConfidence, 0) / details.length,
            totalConcepts: details.reduce((sum, d) => sum + d.conceptCount, 0)
        };
        
        // 小数点3桁に丸める
        Object.keys(metrics).forEach(key => {
            if (typeof metrics[key] === 'number') {
                metrics[key] = parseFloat(metrics[key].toFixed(3));
            }
        });
        
        return metrics;
    }

    /**
     * 比較分析生成
     */
    generateComparison(results) {
        const comparison = {};
        
        // kuromoji vs hybrid
        comparison.kuromojiToHybrid = {
            conceptCountImprovement: ((results.hybrid.metrics.avgConceptCount - results.kuromoji.metrics.avgConceptCount) / Math.max(results.kuromoji.metrics.avgConceptCount, 1) * 100).toFixed(1),
            qualityScoreImprovement: ((results.hybrid.metrics.avgQualityScore - results.kuromoji.metrics.avgQualityScore) / Math.max(results.kuromoji.metrics.avgQualityScore, 0.1) * 100).toFixed(1),
            precisionImprovement: ((results.hybrid.metrics.avgPrecision - results.kuromoji.metrics.avgPrecision) / Math.max(results.kuromoji.metrics.avgPrecision, 0.1) * 100).toFixed(1)
        };
        
        // mecab vs hybrid
        comparison.mecabToHybrid = {
            conceptCountImprovement: ((results.hybrid.metrics.avgConceptCount - results.mecab.metrics.avgConceptCount) / Math.max(results.mecab.metrics.avgConceptCount, 1) * 100).toFixed(1),
            qualityScoreImprovement: ((results.hybrid.metrics.avgQualityScore - results.mecab.metrics.avgQualityScore) / Math.max(results.mecab.metrics.avgQualityScore, 0.1) * 100).toFixed(1)
        };
        
        // 最高性能指標
        comparison.bestPerformer = {
            conceptCount: this.getBestPerformer(results, 'avgConceptCount'),
            qualityScore: this.getBestPerformer(results, 'avgQualityScore'),
            precision: this.getBestPerformer(results, 'avgPrecision'),
            speed: this.getBestPerformer(results, 'avgSpeedScore')
        };
        
        return comparison;
    }

    /**
     * 最高性能者特定
     */
    getBestPerformer(results, metric) {
        const scores = {
            kuromoji: results.kuromoji.metrics[metric] || 0,
            mecab: results.mecab.metrics[metric] || 0,
            hybrid: results.hybrid.metrics[metric] || 0
        };
        
        const best = Object.entries(scores).reduce((a, b) => 
            scores[a[0]] > scores[b[0]] ? a : b
        );
        
        return { method: best[0], score: best[1] };
    }

    /**
     * サマリー生成
     */
    generateSummary(results) {
        return {
            totalTextsEvaluated: Object.values(this.evaluationDatasets).flat().length,
            evaluationDate: new Date().toISOString(),
            keyFindings: [
                `Hybrid処理は概念抽出数を${results.comparison.kuromojiToHybrid.conceptCountImprovement}%向上`,
                `品質スコアを${results.comparison.kuromojiToHybrid.qualityScoreImprovement}%改善`,
                `精度を${results.comparison.kuromojiToHybrid.precisionImprovement}%向上`,
                `最高品質: ${results.comparison.bestPerformer.qualityScore.method} (${results.comparison.bestPerformer.qualityScore.score})`
            ],
            recommendation: results.hybrid.metrics.avgQualityScore > results.kuromoji.metrics.avgQualityScore 
                ? 'Hybrid処理の採用を推奨'
                : 'kuromoji単体で十分な品質',
            overallQualityGrade: this.calculateQualityGrade(results.hybrid.metrics.avgQualityScore)
        };
    }

    /**
     * 品質グレード計算
     */
    calculateQualityGrade(score) {
        if (score >= 0.9) return 'A+';
        if (score >= 0.8) return 'A';
        if (score >= 0.7) return 'B+';
        if (score >= 0.6) return 'B';
        if (score >= 0.5) return 'C+';
        return 'C';
    }

    /**
     * 評価結果表示
     */
    displayEvaluationResults(results) {
        console.log('\n🎯 評価結果サマリー');
        console.log('=' .repeat(60));
        
        console.log('\n📊 平均指標比較:');
        console.log('| 指標           | kuromoji | MeCab  | Hybrid |');
        console.log('|----------------|----------|--------|--------|');
        console.log(`| 概念抽出数     | ${results.kuromoji.metrics.avgConceptCount.toFixed(1).padStart(8)} | ${results.mecab.metrics.avgConceptCount.toFixed(1).padStart(6)} | ${results.hybrid.metrics.avgConceptCount.toFixed(1).padStart(6)} |`);
        console.log(`| 品質スコア     | ${results.kuromoji.metrics.avgQualityScore.toFixed(3).padStart(8)} | ${results.mecab.metrics.avgQualityScore.toFixed(3).padStart(6)} | ${results.hybrid.metrics.avgQualityScore.toFixed(3).padStart(6)} |`);
        console.log(`| 精度           | ${results.kuromoji.metrics.avgPrecision.toFixed(3).padStart(8)} | ${results.mecab.metrics.avgPrecision.toFixed(3).padStart(6)} | ${results.hybrid.metrics.avgPrecision.toFixed(3).padStart(6)} |`);
        console.log(`| 処理時間(ms)   | ${results.kuromoji.metrics.avgProcessingTime.toFixed(1).padStart(8)} | ${results.mecab.metrics.avgProcessingTime.toFixed(1).padStart(6)} | ${results.hybrid.metrics.avgProcessingTime.toFixed(1).padStart(6)} |`);
        
        console.log('\n🚀 改善効果:');
        console.log(`📈 概念抽出数: +${results.comparison.kuromojiToHybrid.conceptCountImprovement}%`);
        console.log(`📈 品質スコア: +${results.comparison.kuromojiToHybrid.qualityScoreImprovement}%`);
        console.log(`📈 精度向上:   +${results.comparison.kuromojiToHybrid.precisionImprovement}%`);
        
        console.log('\n🏆 推奨事項:');
        console.log(`${results.summary.recommendation}`);
        console.log(`総合品質グレード: ${results.summary.overallQualityGrade}`);
        
        console.log('\n📝 主要発見:');
        results.summary.keyFindings.forEach(finding => {
            console.log(`  • ${finding}`);
        });
    }

    /**
     * 評価結果保存
     */
    async saveEvaluationResults(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `evaluation-results-${timestamp}.json`;
        const filepath = path.join('workspace', 'evaluations', filename);
        
        // ディレクトリ作成
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // 結果保存
        fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
        console.log(`\n💾 評価結果保存: ${filepath}`);
    }

    /**
     * ベンチマークテスト実行
     */
    async runBenchmark() {
        console.log('⚡ パフォーマンスベンチマーク実行');
        
        const testText = 'JavaScript、TypeScript、React.js、Node.js、Express.js、MongoDB、Redis、AWS、Docker、Kubernetes、GraphQL、REST API、マイクロサービス、アジャイル開発、DevOps、CI/CD、機械学習、AI、ディープラーニング、データサイエンス、ビッグデータ';
        const iterations = 100;
        
        const benchmarkResults = {};
        
        for (const mode of ['kuromoji', 'mecab', 'hybrid']) {
            console.log(`\n🔄 ${mode} ベンチマーク (${iterations}回実行)`);
            
            const times = [];
            const conceptCounts = [];
            
            for (let i = 0; i < iterations; i++) {
                const result = await this.evaluateText(testText, mode);
                times.push(result.processingTime);
                conceptCounts.push(result.conceptCount);
            }
            
            benchmarkResults[mode] = {
                avgTime: times.reduce((a, b) => a + b, 0) / times.length,
                minTime: Math.min(...times),
                maxTime: Math.max(...times),
                avgConceptCount: conceptCounts.reduce((a, b) => a + b, 0) / conceptCounts.length,
                throughput: iterations / (times.reduce((a, b) => a + b, 0) / 1000) // req/sec
            };
            
            console.log(`  平均時間: ${benchmarkResults[mode].avgTime.toFixed(2)}ms`);
            console.log(`  スループット: ${benchmarkResults[mode].throughput.toFixed(1)} req/sec`);
            console.log(`  平均概念数: ${benchmarkResults[mode].avgConceptCount.toFixed(1)}`);
        }
        
        return benchmarkResults;
    }
}

// 直接実行時の処理
if (import.meta.url === `file://${process.argv[1]}`) {
    const evaluator = new ConceptQualityEvaluator();
    
    console.log('🔬 概念抽出品質評価システム v1.0');
    console.log('選択: [1] 包括的評価 [2] ベンチマーク [3] 両方');
    
    const mode = process.argv[2] || '1';
    
    try {
        switch (mode) {
            case '1':
                await evaluator.runComprehensiveEvaluation();
                break;
            case '2':
                await evaluator.runBenchmark();
                break;
            case '3':
                await evaluator.runComprehensiveEvaluation();
                await evaluator.runBenchmark();
                break;
            default:
                console.log('使用法: node concept-quality-evaluator.js [1|2|3]');
        }
    } catch (error) {
        console.error('❌ 評価エラー:', error.message);
    }
}