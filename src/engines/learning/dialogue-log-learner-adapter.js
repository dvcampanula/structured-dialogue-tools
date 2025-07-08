/**
 * DialogueLogLearnerAdapter - EnhancedHybridLanguageProcessorとの統合アダプタ
 * 
 * 🔗 既存DialogueLogLearnerの概念抽出をEnhancedHybridLanguageProcessorで強化
 * 🎯 kuromoji単体からkuromoji+MeCabハイブリッドへの品質向上
 * 📊 互換性を保ちながら段階的な品質向上を実現
 */

import { EnhancedHybridLanguageProcessor } from '../processing/enhanced-hybrid-processor.js';
import { DialogueLogLearner } from './dialogue-log-learner.js';

export class DialogueLogLearnerAdapter {
    constructor(conceptDB, minimalAI) {
        this.conceptDB = conceptDB;
        this.minimalAI = minimalAI;
        this.hybridProcessor = new EnhancedHybridLanguageProcessor();
        this.originalLearner = new DialogueLogLearner(conceptDB, minimalAI);
        this.isInitialized = false;
        
        // 統合統計
        this.integrationStats = {
            processedTexts: 0,
            originalConceptCount: 0,
            enhancedConceptCount: 0,
            qualityImprovement: 0,
            processingTime: 0
        };
    }

    /**
     * 統合システム初期化
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🔄 DialogueLogLearnerAdapter初期化中...');
            
            // ハイブリッドプロセッサ初期化
            await this.hybridProcessor.initialize();
            
            // 元のLearnerの初期化（tokenizer等）
            await this.originalLearner.initializeTokenizer();
            
            this.isInitialized = true;
            console.log('✅ DialogueLogLearnerAdapter初期化完了');
            console.log('🧬 Enhanced処理 + 既存互換性 統合システム ready');
            
        } catch (error) {
            console.error('❌ DialogueLogLearnerAdapter初期化エラー:', error.message);
            throw error;
        }
    }

    /**
     * 強化された概念抽出（メイン統合処理）
     */
    async extractConceptsFromText(text, conceptSet, termSet) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const startTime = Date.now();
        
        try {
            // 1. 既存システムでの概念抽出（互換性保持）
            const originalConceptCount = conceptSet.size;
            const originalTermCount = termSet.size;
            
            await this.originalLearner.extractConceptsFromText(text, conceptSet, termSet);
            
            const afterOriginalConceptCount = conceptSet.size;
            const afterOriginalTermCount = termSet.size;
            
            // 2. Enhanced処理による品質向上
            const enhancedResult = await this.hybridProcessor.processText(text, {
                enableMeCab: true,
                enableSimilarity: true,
                enableGrouping: true,
                qualityThreshold: 0.6
            });

            // 3. Enhanced結果の統合
            await this.integrateEnhancedResults(enhancedResult, conceptSet, termSet);
            
            // 4. 統計更新
            this.updateIntegrationStats(
                originalConceptCount,
                afterOriginalConceptCount,
                conceptSet.size,
                originalTermCount,
                afterOriginalTermCount,
                termSet.size,
                Date.now() - startTime
            );
            
            console.log(`📊 概念抽出完了: ${afterOriginalConceptCount - originalConceptCount}→${conceptSet.size - originalConceptCount} 概念, ${afterOriginalTermCount - originalTermCount}→${termSet.size - originalTermCount} 用語`);
            
        } catch (error) {
            console.error('❌ 強化概念抽出エラー:', error.message);
            // エラー時は既存処理のみ実行（フォールバック）
            await this.originalLearner.extractConceptsFromText(text, conceptSet, termSet);
        }
    }

    /**
     * Enhanced結果の統合処理
     */
    async integrateEnhancedResults(enhancedResult, conceptSet, termSet) {
        // 1. 高品質技術用語の統合
        for (const term of enhancedResult.enhancedTerms) {
            termSet.add(term.term);
            
            // 概念セットにも追加（既存形式に合わせる）
            const existingConcept = Array.from(conceptSet).find(c => 
                typeof c === 'object' && c.term === term.term
            );
            
            if (!existingConcept) {
                conceptSet.add({
                    term: term.term,
                    category: this.mapEnhancedCategoryToOriginal(term.category),
                    relevanceScore: term.confidence,
                    frequency: 1,
                    context: enhancedResult.originalText.substring(0, 100),
                    source: 'enhanced_hybrid',
                    confidence: term.confidence,
                    engines: term.sources
                });
            } else if (typeof existingConcept === 'object') {
                // 既存概念の品質向上
                existingConcept.relevanceScore = Math.max(existingConcept.relevanceScore, term.confidence);
                existingConcept.confidence = term.confidence;
                existingConcept.engines = term.sources;
                existingConcept.source = 'enhanced_hybrid';
            }
        }
        
        // 2. 概念グループの統合
        for (const [groupKey, groupMembers] of Object.entries(enhancedResult.conceptGroups)) {
            if (groupMembers.length > 1) {
                // グループ化情報を概念に追加
                for (const member of groupMembers) {
                    const concept = Array.from(conceptSet).find(c => 
                        typeof c === 'object' && c.term === member
                    );
                    if (concept) {
                        concept.conceptGroup = groupKey;
                        concept.groupMembers = groupMembers;
                    }
                }
            }
        }
        
        // 3. 関係性情報の統合（安全性チェック付き）
        if (enhancedResult.relationships && Array.isArray(enhancedResult.relationships)) {
            for (const relationship of enhancedResult.relationships) {
                // 関係性データの有効性チェック
                if (!relationship || !relationship.term1 || !relationship.term2) {
                    console.warn('⚠️ 無効な関係性データをスキップ:', relationship);
                    continue;
                }
                
                const concept1 = Array.from(conceptSet).find(c => 
                    typeof c === 'object' && c.term === relationship.term1
                );
                const concept2 = Array.from(conceptSet).find(c => 
                    typeof c === 'object' && c.term === relationship.term2
                );
                
                if (concept1 && concept2) {
                    concept1.relationships = concept1.relationships || [];
                    concept1.relationships.push({
                        relatedTerm: relationship.term2,
                        strength: relationship.strength || 0.5,
                        type: relationship.type || 'unknown'
                    });
                    
                    concept2.relationships = concept2.relationships || [];
                    concept2.relationships.push({
                        relatedTerm: relationship.term1,
                        strength: relationship.strength || 0.5,
                        type: relationship.type || 'unknown'
                    });
                }
            }
        } else {
            console.warn('⚠️ enhancedResult.relationships が配列ではないか未定義です:', typeof enhancedResult.relationships);
        }
    }

    /**
     * Enhanced カテゴリを既存システムのカテゴリにマッピング
     */
    mapEnhancedCategoryToOriginal(enhancedCategory) {
        const categoryMap = {
            'proper_noun': 'technology',
            'technical_action': 'programming',
            'general_technical': 'system',
            'pattern_match': 'technology',
            'compound_term': 'technology'
        };
        
        return categoryMap[enhancedCategory] || 'general';
    }

    /**
     * 統計更新
     */
    updateIntegrationStats(originalConceptCount, afterOriginalConceptCount, finalConceptCount, 
                          originalTermCount, afterOriginalTermCount, finalTermCount, processingTime) {
        this.integrationStats.processedTexts++;
        this.integrationStats.originalConceptCount += (afterOriginalConceptCount - originalConceptCount);
        this.integrationStats.enhancedConceptCount += (finalConceptCount - afterOriginalConceptCount);
        this.integrationStats.qualityImprovement = this.integrationStats.enhancedConceptCount > 0 
            ? (this.integrationStats.enhancedConceptCount / Math.max(this.integrationStats.originalConceptCount, 1)) * 100 
            : 0;
        this.integrationStats.processingTime += processingTime;
    }

    /**
     * 統計取得
     */
    getIntegrationStats() {
        return {
            ...this.integrationStats,
            averageProcessingTime: this.integrationStats.processedTexts > 0 
                ? this.integrationStats.processingTime / this.integrationStats.processedTexts 
                : 0,
            hybridProcessorStats: this.hybridProcessor.getStatistics()
        };
    }

    /**
     * 既存DialogueLogLearnerの他のメソッドへの委譲
     */
    detectLogFormat(content) {
        return this.originalLearner.detectLogFormat(content);
    }

    parseDialogueLog(content, format) {
        return this.originalLearner.parseDialogueLog(content, format);
    }

    parseChatGPTFormat(content) {
        return this.originalLearner.parseChatGPTFormat(content);
    }

    parseClaudeFormat(content) {
        return this.originalLearner.parseClaudeFormat(content);
    }

    parseGeminiFormat(content) {
        return this.originalLearner.parseGeminiFormat(content);
    }

    parseGenericFormat(content) {
        return this.originalLearner.parseGenericFormat(content);
    }

    async processDialogueLog(filePath, options = {}) {
        return await this.originalLearner.processDialogueLog(filePath, options);
    }

    async processMultipleLogs(logDirectory, options = {}) {
        return await this.originalLearner.processMultipleLogs(logDirectory, options);
    }

    calculateConceptRelevance(term) {
        return this.originalLearner.calculateConceptRelevance(term);
    }

    categorizeNewConcept(term) {
        return this.originalLearner.categorizeNewConcept(term);
    }

    isImportantTechnicalTerm(term) {
        return this.originalLearner.isImportantTechnicalTerm(term);
    }

    integrateConceptsIntoDatabase(concepts) {
        return this.originalLearner.integrateConceptsIntoDatabase(concepts);
    }

    calculateConceptSimilarity(concept1, concept2) {
        return this.originalLearner.calculateConceptSimilarity(concept1, concept2);
    }

    generateLearningReport(logStats) {
        return this.originalLearner.generateLearningReport(logStats);
    }

    getLearningStats() {
        return {
            ...this.originalLearner.getLearningStats(),
            integration: this.getIntegrationStats()
        };
    }
}