/**
 * HybridProcessingAPI - EnhancedHybridLanguageProcessor Web API
 * 
 * 🌐 REST API でハイブリッド処理を提供
 * 🔧 概念抽出、品質評価、統計情報のエンドポイント
 * 📊 リアルタイム処理状況とパフォーマンス監視
 */

import express from 'express';
import cors from 'cors';
import { EnhancedHybridLanguageProcessor } from '../core/enhanced-hybrid-processor.js';
import { DialogueLogLearnerAdapter } from '../core/dialogue-log-learner-adapter.js';

export class HybridProcessingAPI {
    constructor() {
        this.app = express();
        this.hybridProcessor = new EnhancedHybridLanguageProcessor();
        this.dialogueAdapter = null;
        this.isInitialized = false;
        this.processingStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0
        };
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Express ミドルウェア設定
     */
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // リクエストログ
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * API ルート設定
     */
    setupRoutes() {
        // 1. システム情報・初期化
        this.app.get('/api/system/info', this.handleSystemInfo.bind(this));
        this.app.post('/api/system/initialize', this.handleInitialize.bind(this));
        
        // 2. ハイブリッド処理
        this.app.post('/api/hybrid/process', this.handleHybridProcess.bind(this));
        this.app.post('/api/hybrid/process-batch', this.handleBatchProcess.bind(this));
        
        // 3. 概念抽出・学習
        this.app.post('/api/concept/extract', this.handleConceptExtraction.bind(this));
        this.app.post('/api/concept/learn', this.handleConceptLearning.bind(this));
        
        // 4. 品質評価・統計
        this.app.post('/api/quality/evaluate', this.handleQualityEvaluation.bind(this));
        this.app.get('/api/stats/processing', this.handleProcessingStats.bind(this));
        this.app.get('/api/stats/system', this.handleSystemStats.bind(this));
        
        // 5. 設定・管理
        this.app.post('/api/config/update', this.handleConfigUpdate.bind(this));
        this.app.get('/api/health', this.handleHealthCheck.bind(this));
        
        // エラーハンドリング
        this.app.use(this.handleError.bind(this));
    }

    /**
     * システム情報取得
     */
    async handleSystemInfo(req, res) {
        try {
            const systemInfo = {
                version: '7.1.0',
                status: this.isInitialized ? 'ready' : 'not_initialized',
                capabilities: [
                    'kuromoji形態素解析',
                    'MeCab詳細品詞解析',
                    '拡張技術用語抽出',
                    '品質評価・フィルタリング',
                    '概念グループ化',
                    '関係性分析'
                ],
                engines: ['kuromoji', 'MeCab'],
                processingStats: this.processingStats
            };
            
            res.json({ success: true, data: systemInfo });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * システム初期化
     */
    async handleInitialize(req, res) {
        try {
            if (!this.isInitialized) {
                await this.hybridProcessor.initialize();
                this.isInitialized = true;
            }
            
            res.json({ 
                success: true, 
                message: 'システム初期化完了',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * ハイブリッド処理
     */
    async handleHybridProcess(req, res) {
        const startTime = Date.now();
        this.processingStats.totalRequests++;
        
        try {
            const { text, options = {} } = req.body;
            
            if (!text) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'テキストが必要です' 
                });
            }
            
            if (!this.isInitialized) {
                await this.hybridProcessor.initialize();
                this.isInitialized = true;
            }
            
            const result = await this.hybridProcessor.processText(text, options);
            
            const processingTime = Date.now() - startTime;
            this.updateProcessingStats(processingTime, true);
            
            res.json({
                success: true,
                data: result,
                processingTime,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.updateProcessingStats(processingTime, false);
            
            res.status(500).json({ 
                success: false, 
                error: error.message,
                processingTime 
            });
        }
    }

    /**
     * バッチ処理
     */
    async handleBatchProcess(req, res) {
        const startTime = Date.now();
        this.processingStats.totalRequests++;
        
        try {
            const { texts, options = {} } = req.body;
            
            if (!Array.isArray(texts) || texts.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'テキスト配列が必要です' 
                });
            }
            
            if (!this.isInitialized) {
                await this.hybridProcessor.initialize();
                this.isInitialized = true;
            }
            
            const results = [];
            for (const text of texts) {
                const result = await this.hybridProcessor.processText(text, options);
                results.push(result);
            }
            
            const processingTime = Date.now() - startTime;
            this.updateProcessingStats(processingTime, true);
            
            res.json({
                success: true,
                data: results,
                batchSize: texts.length,
                processingTime,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.updateProcessingStats(processingTime, false);
            
            res.status(500).json({ 
                success: false, 
                error: error.message,
                processingTime 
            });
        }
    }

    /**
     * 概念抽出
     */
    async handleConceptExtraction(req, res) {
        const startTime = Date.now();
        
        try {
            const { text, options = {} } = req.body;
            
            if (!text) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'テキストが必要です' 
                });
            }
            
            if (!this.isInitialized) {
                await this.hybridProcessor.initialize();
                this.isInitialized = true;
            }
            
            const result = await this.hybridProcessor.processText(text, options);
            
            // 概念抽出に特化した結果を返す
            const conceptData = {
                concepts: result.enhancedTerms,
                conceptGroups: result.conceptGroups,
                relationships: result.relationships,
                statistics: {
                    conceptCount: result.enhancedTerms.length,
                    groupCount: Object.keys(result.conceptGroups).length,
                    relationshipCount: result.relationships.length,
                    qualityScore: result.statistics.qualityScore
                }
            };
            
            res.json({
                success: true,
                data: conceptData,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                processingTime: Date.now() - startTime 
            });
        }
    }

    /**
     * 概念学習 (DialogueLogLearnerAdapter使用)
     */
    async handleConceptLearning(req, res) {
        const startTime = Date.now();
        
        try {
            const { text, conceptDB, options = {} } = req.body;
            
            if (!text) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'テキストが必要です' 
                });
            }
            
            // DialogueLogLearnerAdapter の初期化（初回のみ）
            if (!this.dialogueAdapter) {
                this.dialogueAdapter = new DialogueLogLearnerAdapter(conceptDB, null);
                await this.dialogueAdapter.initialize();
            }
            
            const conceptSet = new Set();
            const termSet = new Set();
            
            await this.dialogueAdapter.extractConceptsFromText(text, conceptSet, termSet);
            
            const learningData = {
                concepts: Array.from(conceptSet),
                terms: Array.from(termSet),
                stats: this.dialogueAdapter.getIntegrationStats()
            };
            
            res.json({
                success: true,
                data: learningData,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                processingTime: Date.now() - startTime 
            });
        }
    }

    /**
     * 品質評価
     */
    async handleQualityEvaluation(req, res) {
        const startTime = Date.now();
        
        try {
            const { text, options = {} } = req.body;
            
            if (!text) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'テキストが必要です' 
                });
            }
            
            if (!this.isInitialized) {
                await this.hybridProcessor.initialize();
                this.isInitialized = true;
            }
            
            // MeCab有効・無効での比較評価
            const [withMeCab, withoutMeCab] = await Promise.all([
                this.hybridProcessor.processText(text, { ...options, enableMeCab: true }),
                this.hybridProcessor.processText(text, { ...options, enableMeCab: false })
            ]);
            
            const qualityData = {
                withMeCab: {
                    conceptCount: withMeCab.statistics.enhancedTermCount,
                    qualityScore: withMeCab.statistics.qualityScore,
                    processingTime: withMeCab.statistics.processingTime
                },
                withoutMeCab: {
                    conceptCount: withoutMeCab.statistics.enhancedTermCount,
                    qualityScore: withoutMeCab.statistics.qualityScore,
                    processingTime: withoutMeCab.statistics.processingTime
                },
                improvement: {
                    conceptCountImprovement: ((withMeCab.statistics.enhancedTermCount - withoutMeCab.statistics.enhancedTermCount) / Math.max(withoutMeCab.statistics.enhancedTermCount, 1) * 100).toFixed(1),
                    qualityScoreImprovement: ((withMeCab.statistics.qualityScore - withoutMeCab.statistics.qualityScore) / Math.max(withoutMeCab.statistics.qualityScore, 0.1) * 100).toFixed(1)
                }
            };
            
            res.json({
                success: true,
                data: qualityData,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                processingTime: Date.now() - startTime 
            });
        }
    }

    /**
     * 処理統計取得
     */
    async handleProcessingStats(req, res) {
        try {
            res.json({
                success: true,
                data: this.processingStats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * システム統計取得
     */
    async handleSystemStats(req, res) {
        try {
            const systemStats = {
                hybridProcessor: this.hybridProcessor.getStatistics(),
                dialogueAdapter: this.dialogueAdapter ? this.dialogueAdapter.getIntegrationStats() : null,
                api: this.processingStats
            };
            
            res.json({
                success: true,
                data: systemStats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * 設定更新
     */
    async handleConfigUpdate(req, res) {
        try {
            const { config } = req.body;
            
            // 設定更新処理（今後実装）
            console.log('設定更新:', config);
            
            res.json({
                success: true,
                message: '設定更新完了',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * ヘルスチェック
     */
    async handleHealthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                memory: process.memoryUsage(),
                initialized: this.isInitialized
            };
            
            res.json({ success: true, data: health });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * エラーハンドリング
     */
    handleError(error, req, res, next) {
        console.error('API エラー:', error);
        
        if (res.headersSent) {
            return next(error);
        }
        
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 処理統計更新
     */
    updateProcessingStats(processingTime, success) {
        this.processingStats.totalProcessingTime += processingTime;
        
        if (success) {
            this.processingStats.successfulRequests++;
        } else {
            this.processingStats.failedRequests++;
        }
        
        this.processingStats.averageProcessingTime = 
            this.processingStats.totalProcessingTime / this.processingStats.totalRequests;
    }

    /**
     * サーバー起動
     */
    async start(port = 3000) {
        try {
            await this.hybridProcessor.initialize();
            this.isInitialized = true;
            
            this.app.listen(port, () => {
                console.log('🚀 HybridProcessingAPI サーバー起動');
                console.log(`📡 http://localhost:${port}`);
                console.log('🔧 利用可能なエンドポイント:');
                console.log('  GET  /api/system/info - システム情報');
                console.log('  POST /api/hybrid/process - ハイブリッド処理');
                console.log('  POST /api/concept/extract - 概念抽出');
                console.log('  POST /api/quality/evaluate - 品質評価');
                console.log('  GET  /api/stats/processing - 処理統計');
                console.log('  GET  /api/health - ヘルスチェック');
            });
            
        } catch (error) {
            console.error('❌ サーバー起動エラー:', error.message);
            throw error;
        }
    }
}

// 直接実行時の処理
if (import.meta.url === `file://${process.argv[1]}`) {
    const api = new HybridProcessingAPI();
    api.start(3000).catch(console.error);
}