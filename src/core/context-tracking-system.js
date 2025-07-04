#!/usr/bin/env node
/**
 * ContextTrackingSystem - 文脈追跡専用システム
 * 
 * 📊 多段階文脈追跡・管理機能分離
 * 🔗 話題変遷・参照チェーン・エンティティ追跡
 * 🧠 時間的フロー・文脈断絶検出
 */

export class ContextTrackingSystem {
    constructor() {
        this.contextMemory = new Map();
        this.conversationContext = {
            currentTopic: null,
            topicHistory: [],
            entities: {},
            references: [],
            temporalMarkers: [],
            contextBreaks: []
        };
        
        // 文脈追跡パラメータ
        this.trackingConfig = {
            maxTopicHistory: 20,
            maxEntityTracking: 50,
            maxReferenceChain: 15,
            contextWindowSize: 5,
            topicChangeThreshold: 0.3,
            entityDecayRate: 0.1,
            temporalWindow: 3600000 // 1時間
        };
        
        // エンティティタイプ
        this.entityTypes = {
            technical: ['プログラミング', '開発', 'react', 'javascript', 'ai'],
            conceptual: ['学習', '理解', '実装', '設計', '方法'],
            temporal: ['今', '前回', '次回', '最近', '将来'],
            referential: ['これ', 'それ', 'あれ', '前述', '先程']
        };
        
        console.log('✅ ContextTrackingSystem初期化完了');
    }

    /**
     * メイン文脈追跡処理
     */
    async trackContext(currentInput, conversationHistory = []) {
        console.log(`📊 文脈追跡開始: ${conversationHistory.length}ターン履歴分析`);
        
        const contextAnalysis = {
            contextDepth: 0,
            topicEvolution: [],
            referenceChain: [],
            contextualEntities: {},
            temporalFlow: {},
            semanticContinuity: 0,
            contextBreaks: [],
            contextualState: {},
            trackingMetrics: {}
        };

        try {
            // Step 1: 文脈深度計算
            contextAnalysis.contextDepth = this.calculateContextDepth(conversationHistory);
            
            // Step 2: 話題変遷追跡
            contextAnalysis.topicEvolution = await this.analyzeTopicEvolution(currentInput, conversationHistory);
            
            // Step 3: 参照チェーン構築
            contextAnalysis.referenceChain = this.buildReferenceChain(currentInput, conversationHistory);
            
            // Step 4: 文脈的エンティティ抽出
            contextAnalysis.contextualEntities = await this.extractContextualEntities(currentInput, conversationHistory);
            
            // Step 5: 時間的フロー分析
            contextAnalysis.temporalFlow = this.analyzeTemporalFlow(currentInput, conversationHistory);
            
            // Step 6: 文脈断絶検出
            contextAnalysis.contextBreaks = this.detectContextBreaks(currentInput, conversationHistory);
            
            // Step 7: 文脈状態更新
            contextAnalysis.contextualState = this.updateContextualState(currentInput, contextAnalysis);
            
            // Step 8: 追跡メトリクス計算
            contextAnalysis.trackingMetrics = this.calculateTrackingMetrics(contextAnalysis);
            
            // 文脈メモリ更新
            this.updateContextMemory(currentInput, contextAnalysis);
            
            console.log(`✅ 文脈追跡完了: 深度${contextAnalysis.contextDepth}, 話題変遷${contextAnalysis.topicEvolution.length}件`);
            
            return contextAnalysis;
            
        } catch (error) {
            console.error('❌ 文脈追跡エラー:', error.message);
            return this.generateFallbackContext(currentInput, conversationHistory);
        }
    }

    /**
     * 文脈深度計算
     */
    calculateContextDepth(conversationHistory) {
        // 基本深度: 履歴長
        let depth = Math.min(conversationHistory.length, 10);
        
        // 連続性による深度調整
        if (conversationHistory.length > 3) {
            const recentTurns = conversationHistory.slice(-3);
            let continuityBonus = 0;
            
            for (let i = 1; i < recentTurns.length; i++) {
                const prev = recentTurns[i-1];
                const curr = recentTurns[i];
                
                if (this.hasTopicalContinuity(prev, curr)) {
                    continuityBonus += 0.5;
                }
            }
            
            depth += continuityBonus;
        }
        
        return Math.min(depth, 15); // 最大15
    }

    /**
     * 話題変遷分析
     */
    async analyzeTopicEvolution(currentInput, conversationHistory) {
        const topics = [];
        const windowSize = this.trackingConfig.contextWindowSize;
        
        // 現在入力の話題抽出
        const currentTopics = this.extractTopics(currentInput);
        
        // 履歴窓での話題分析
        for (let i = Math.max(0, conversationHistory.length - windowSize); i < conversationHistory.length; i++) {
            const turn = conversationHistory[i];
            const turnText = turn.content || turn.message || turn;
            
            if (turnText && typeof turnText === 'string') {
                const turnTopics = this.extractTopics(turnText);
                topics.push({
                    turnIndex: i,
                    topics: turnTopics,
                    timestamp: turn.timestamp || Date.now() - (conversationHistory.length - i) * 60000
                });
            }
        }
        
        // 現在の話題を追加
        topics.push({
            turnIndex: conversationHistory.length,
            topics: currentTopics,
            timestamp: Date.now()
        });
        
        // 話題変遷パターン分析
        const evolution = this.analyzeTopicPatterns(topics);
        
        // 会話文脈の話題履歴更新
        this.updateTopicHistory(currentTopics);
        
        return evolution;
    }

    /**
     * 参照チェーン構築
     */
    buildReferenceChain(currentInput, conversationHistory) {
        const references = [];
        const referentialTerms = this.extractReferentialTerms(currentInput);
        
        if (referentialTerms.length === 0) {
            return references;
        }
        
        // 逆順で履歴を検索
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const turn = conversationHistory[i];
            const turnText = turn.content || turn.message || turn;
            
            if (turnText && typeof turnText === 'string') {
                for (const refTerm of referentialTerms) {
                    const referent = this.findReferent(refTerm, turnText, i);
                    if (referent) {
                        references.push({
                            referentialTerm: refTerm,
                            referent: referent,
                            turnIndex: i,
                            confidence: referent.confidence
                        });
                        
                        // チェーン長制限
                        if (references.length >= this.trackingConfig.maxReferenceChain) {
                            break;
                        }
                    }
                }
                
                if (references.length >= this.trackingConfig.maxReferenceChain) {
                    break;
                }
            }
        }
        
        return references.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * 文脈的エンティティ抽出
     */
    async extractContextualEntities(currentInput, conversationHistory) {
        const entities = {
            technical: {},
            conceptual: {},
            temporal: {},
            referential: {},
            custom: {}
        };
        
        // 現在入力からエンティティ抽出
        this.extractEntitiesFromText(currentInput, entities, 1.0);
        
        // 履歴からエンティティ抽出（重み減衰）
        const windowSize = this.trackingConfig.contextWindowSize;
        for (let i = Math.max(0, conversationHistory.length - windowSize); i < conversationHistory.length; i++) {
            const turn = conversationHistory[i];
            const turnText = turn.content || turn.message || turn;
            
            if (turnText && typeof turnText === 'string') {
                const weight = 1.0 - (conversationHistory.length - i) * this.trackingConfig.entityDecayRate;
                this.extractEntitiesFromText(turnText, entities, Math.max(weight, 0.1));
            }
        }
        
        // エンティティ共起関係分析
        this.analyzeEntityCooccurrence(entities);
        
        // 文脈エンティティ更新
        this.updateContextualEntities(entities);
        
        return entities;
    }

    /**
     * 時間的フロー分析
     */
    analyzeTemporalFlow(currentInput, conversationHistory) {
        const temporalFlow = {
            sequenceMarkers: [],
            timeReferences: [],
            progressionIndicators: [],
            continuitySignals: []
        };
        
        // 現在入力の時間的マーカー
        temporalFlow.sequenceMarkers = this.extractSequenceMarkers(currentInput);
        temporalFlow.timeReferences = this.extractTimeReferences(currentInput);
        
        // 履歴からの進行指標
        if (conversationHistory.length > 0) {
            temporalFlow.progressionIndicators = this.analyzeProgression(conversationHistory);
            temporalFlow.continuitySignals = this.detectContinuitySignals(currentInput, conversationHistory);
        }
        
        // 時間的一貫性チェック
        temporalFlow.consistency = this.checkTemporalConsistency(temporalFlow);
        
        return temporalFlow;
    }

    /**
     * 文脈断絶検出
     */
    detectContextBreaks(currentInput, conversationHistory) {
        const breaks = [];
        
        if (conversationHistory.length < 2) {
            return breaks;
        }
        
        // 急激な話題変更検出
        const recentTurns = conversationHistory.slice(-3);
        for (let i = 1; i < recentTurns.length; i++) {
            const prevTopics = this.extractTopics(recentTurns[i-1].content || recentTurns[i-1]);
            const currTopics = this.extractTopics(recentTurns[i].content || recentTurns[i]);
            
            const topicSimilarity = this.calculateTopicSimilarity(prevTopics, currTopics);
            
            if (topicSimilarity < this.trackingConfig.topicChangeThreshold) {
                breaks.push({
                    type: 'topic_shift',
                    turnIndex: conversationHistory.length - (recentTurns.length - i),
                    severity: 1 - topicSimilarity,
                    description: '急激な話題変更'
                });
            }
        }
        
        // 現在入力と直前の断絶チェック
        if (conversationHistory.length > 0) {
            const lastTurn = conversationHistory[conversationHistory.length - 1];
            const lastText = lastTurn.content || lastTurn.message || lastTurn;
            
            const currentTopics = this.extractTopics(currentInput);
            const lastTopics = this.extractTopics(lastText);
            
            const similarity = this.calculateTopicSimilarity(currentTopics, lastTopics);
            
            if (similarity < this.trackingConfig.topicChangeThreshold) {
                breaks.push({
                    type: 'immediate_break',
                    turnIndex: conversationHistory.length,
                    severity: 1 - similarity,
                    description: '直前ターンとの文脈断絶'
                });
            }
        }
        
        return breaks;
    }

    /**
     * 文脈状態更新
     */
    updateContextualState(currentInput, contextAnalysis) {
        const state = {
            dominantTopic: null,
            activeEntities: [],
            referenceComplexity: 0,
            temporalCoherence: 0,
            overallCoherence: 0
        };
        
        // 主要話題決定
        if (contextAnalysis.topicEvolution.length > 0) {
            const latestTopics = contextAnalysis.topicEvolution[contextAnalysis.topicEvolution.length - 1];
            state.dominantTopic = latestTopics.dominantTopic;
        }
        
        // アクティブエンティティ
        for (const [category, entities] of Object.entries(contextAnalysis.contextualEntities)) {
            for (const [entity, data] of Object.entries(entities)) {
                if (data.weight > 0.5) {
                    state.activeEntities.push({ entity, category, weight: data.weight });
                }
            }
        }
        
        // 参照複雑度
        state.referenceComplexity = contextAnalysis.referenceChain.length / this.trackingConfig.maxReferenceChain;
        
        // 時間的一貫性
        state.temporalCoherence = contextAnalysis.temporalFlow.consistency || 0.5;
        
        // 全体一貫性
        state.overallCoherence = this.calculateOverallCoherence(contextAnalysis);
        
        return state;
    }

    /**
     * 追跡メトリクス計算
     */
    calculateTrackingMetrics(contextAnalysis) {
        return {
            topicStability: this.calculateTopicStability(contextAnalysis.topicEvolution),
            entityDiversity: this.calculateEntityDiversity(contextAnalysis.contextualEntities),
            referenceClarity: this.calculateReferenceClarity(contextAnalysis.referenceChain),
            temporalConsistency: contextAnalysis.temporalFlow.consistency || 0,
            contextBreakFrequency: contextAnalysis.contextBreaks.length,
            overallContextQuality: this.calculateContextQuality(contextAnalysis)
        };
    }

    // ヘルパーメソッド群
    extractTopics(text) {
        if (!text || typeof text !== 'string') return [];
        
        const topics = [];
        const textLower = text.toLowerCase();
        
        // 技術トピック
        for (const tech of this.entityTypes.technical) {
            if (textLower.includes(tech)) {
                topics.push({ type: 'technical', term: tech, weight: 1.0 });
            }
        }
        
        // 概念トピック
        for (const concept of this.entityTypes.conceptual) {
            if (textLower.includes(concept)) {
                topics.push({ type: 'conceptual', term: concept, weight: 0.8 });
            }
        }
        
        return topics;
    }

    extractReferentialTerms(text) {
        const referentialTerms = [];
        const textLower = text.toLowerCase();
        
        for (const refTerm of this.entityTypes.referential) {
            if (textLower.includes(refTerm)) {
                referentialTerms.push(refTerm);
            }
        }
        
        return referentialTerms;
    }

    findReferent(refTerm, turnText, turnIndex) {
        // 簡単な参照解決
        const textLower = turnText.toLowerCase();
        
        // 技術用語との照合
        for (const tech of this.entityTypes.technical) {
            if (textLower.includes(tech)) {
                return {
                    term: tech,
                    type: 'technical',
                    confidence: 0.8,
                    context: turnText.substring(Math.max(0, textLower.indexOf(tech) - 20), 
                                             Math.min(turnText.length, textLower.indexOf(tech) + tech.length + 20))
                };
            }
        }
        
        return null;
    }

    extractEntitiesFromText(text, entities, weight) {
        const textLower = text.toLowerCase();
        
        // 各エンティティタイプを検索
        for (const [type, terms] of Object.entries(this.entityTypes)) {
            for (const term of terms) {
                if (textLower.includes(term)) {
                    if (!entities[type][term]) {
                        entities[type][term] = { weight: 0, occurrences: 0 };
                    }
                    entities[type][term].weight = Math.min(entities[type][term].weight + weight, 1.0);
                    entities[type][term].occurrences++;
                }
            }
        }
    }

    analyzeEntityCooccurrence(entities) {
        // エンティティ間の共起関係を分析
        const cooccurrence = {};
        
        for (const [type1, terms1] of Object.entries(entities)) {
            for (const [term1, data1] of Object.entries(terms1)) {
                if (data1.weight > 0.3) {
                    for (const [type2, terms2] of Object.entries(entities)) {
                        for (const [term2, data2] of Object.entries(terms2)) {
                            if (term1 !== term2 && data2.weight > 0.3) {
                                const pairKey = `${term1}-${term2}`;
                                cooccurrence[pairKey] = Math.min(data1.weight * data2.weight, 1.0);
                            }
                        }
                    }
                }
            }
        }
        
        return cooccurrence;
    }

    extractSequenceMarkers(text) {
        const sequenceMarkers = ['まず', '次に', 'それから', '最後に', 'そして'];
        const found = [];
        
        for (const marker of sequenceMarkers) {
            if (text.includes(marker)) {
                found.push(marker);
            }
        }
        
        return found;
    }

    extractTimeReferences(text) {
        const timeReferences = ['今', '前回', '今回', '次回', '以前', '現在', '将来'];
        const found = [];
        
        for (const timeRef of timeReferences) {
            if (text.includes(timeRef)) {
                found.push(timeRef);
            }
        }
        
        return found;
    }

    analyzeProgression(conversationHistory) {
        const progressionIndicators = [];
        
        for (let i = 1; i < conversationHistory.length; i++) {
            const prev = conversationHistory[i-1];
            const curr = conversationHistory[i];
            
            if (this.hasProgression(prev, curr)) {
                progressionIndicators.push({
                    fromIndex: i-1,
                    toIndex: i,
                    type: 'topic_development'
                });
            }
        }
        
        return progressionIndicators;
    }

    detectContinuitySignals(currentInput, conversationHistory) {
        const signals = [];
        const continuityMarkers = ['それで', 'そこで', 'だから', 'なので', 'ところで'];
        
        for (const marker of continuityMarkers) {
            if (currentInput.includes(marker)) {
                signals.push({
                    marker: marker,
                    type: 'explicit_continuation'
                });
            }
        }
        
        return signals;
    }

    checkTemporalConsistency(temporalFlow) {
        let consistency = 0.5; // ベース値
        
        // シーケンスマーカーの存在
        if (temporalFlow.sequenceMarkers.length > 0) {
            consistency += 0.2;
        }
        
        // 継続シグナルの存在
        if (temporalFlow.continuitySignals.length > 0) {
            consistency += 0.3;
        }
        
        return Math.min(consistency, 1.0);
    }

    calculateTopicSimilarity(topics1, topics2) {
        if (topics1.length === 0 && topics2.length === 0) return 1.0;
        if (topics1.length === 0 || topics2.length === 0) return 0.0;
        
        let similarity = 0;
        let maxPossible = 0;
        
        for (const topic1 of topics1) {
            let bestMatch = 0;
            for (const topic2 of topics2) {
                if (topic1.term === topic2.term && topic1.type === topic2.type) {
                    bestMatch = 1.0;
                    break;
                } else if (topic1.type === topic2.type) {
                    bestMatch = Math.max(bestMatch, 0.3);
                }
            }
            similarity += bestMatch;
            maxPossible += 1.0;
        }
        
        return similarity / maxPossible;
    }

    hasTopicalContinuity(turn1, turn2) {
        const text1 = turn1.content || turn1.message || turn1;
        const text2 = turn2.content || turn2.message || turn2;
        
        const topics1 = this.extractTopics(text1);
        const topics2 = this.extractTopics(text2);
        
        return this.calculateTopicSimilarity(topics1, topics2) > 0.3;
    }

    hasProgression(turn1, turn2) {
        const text1 = turn1.content || turn1.message || turn1;
        const text2 = turn2.content || turn2.message || turn2;
        
        // 簡単な進行判定（技術用語の増加など）
        const tech1 = this.entityTypes.technical.filter(term => text1.toLowerCase().includes(term)).length;
        const tech2 = this.entityTypes.technical.filter(term => text2.toLowerCase().includes(term)).length;
        
        return tech2 > tech1;
    }

    analyzeTopicPatterns(topics) {
        const patterns = [];
        
        for (let i = 1; i < topics.length; i++) {
            const prev = topics[i-1];
            const curr = topics[i];
            
            const similarity = this.calculateTopicSimilarity(prev.topics, curr.topics);
            
            let patternType = 'continuation';
            if (similarity < 0.3) {
                patternType = 'shift';
            } else if (similarity > 0.8) {
                patternType = 'stable';
            }
            
            patterns.push({
                fromTurn: prev.turnIndex,
                toTurn: curr.turnIndex,
                patternType: patternType,
                similarity: similarity,
                dominantTopic: this.findDominantTopic(curr.topics)
            });
        }
        
        return patterns;
    }

    findDominantTopic(topics) {
        if (topics.length === 0) return null;
        
        return topics.reduce((a, b) => a.weight > b.weight ? a : b).term;
    }

    calculateOverallCoherence(contextAnalysis) {
        let coherence = 0;
        let factors = 0;
        
        // 話題安定性
        if (contextAnalysis.topicEvolution.length > 0) {
            const topicStability = this.calculateTopicStability(contextAnalysis.topicEvolution);
            coherence += topicStability * 0.3;
            factors += 0.3;
        }
        
        // 参照明確性
        if (contextAnalysis.referenceChain.length > 0) {
            const refClarity = this.calculateReferenceClarity(contextAnalysis.referenceChain);
            coherence += refClarity * 0.2;
            factors += 0.2;
        }
        
        // 時間的一貫性
        coherence += contextAnalysis.temporalFlow.consistency * 0.3;
        factors += 0.3;
        
        // 文脈断絶ペナルティ
        const breakPenalty = Math.min(contextAnalysis.contextBreaks.length * 0.1, 0.2);
        coherence -= breakPenalty;
        factors += 0.2;
        
        return factors > 0 ? Math.max(coherence / factors, 0) : 0.5;
    }

    calculateTopicStability(topicEvolution) {
        if (topicEvolution.length < 2) return 1.0;
        
        let stabilitySum = 0;
        let comparisons = 0;
        
        for (let i = 1; i < topicEvolution.length; i++) {
            stabilitySum += topicEvolution[i].similarity || 0.5;
            comparisons++;
        }
        
        return comparisons > 0 ? stabilitySum / comparisons : 0.5;
    }

    calculateEntityDiversity(entities) {
        let totalEntities = 0;
        let activeCategories = 0;
        
        for (const [category, entityList] of Object.entries(entities)) {
            const activeInCategory = Object.values(entityList).filter(e => e.weight > 0.3).length;
            if (activeInCategory > 0) {
                activeCategories++;
                totalEntities += activeInCategory;
            }
        }
        
        return activeCategories > 0 ? Math.min(totalEntities / (activeCategories * 3), 1.0) : 0;
    }

    calculateReferenceClarity(referenceChain) {
        if (referenceChain.length === 0) return 1.0;
        
        const avgConfidence = referenceChain.reduce((sum, ref) => sum + ref.confidence, 0) / referenceChain.length;
        return avgConfidence;
    }

    calculateContextQuality(contextAnalysis) {
        const metrics = contextAnalysis.trackingMetrics || {};
        
        const weights = {
            topicStability: 0.25,
            entityDiversity: 0.2,
            referenceClarity: 0.2,
            temporalConsistency: 0.2,
            coherence: 0.15
        };
        
        let quality = 0;
        quality += (metrics.topicStability || 0.5) * weights.topicStability;
        quality += (metrics.entityDiversity || 0.5) * weights.entityDiversity;
        quality += (metrics.referenceClarity || 0.5) * weights.referenceClarity;
        quality += (metrics.temporalConsistency || 0.5) * weights.temporalConsistency;
        quality += (contextAnalysis.contextualState?.overallCoherence || 0.5) * weights.coherence;
        
        return quality;
    }

    updateTopicHistory(currentTopics) {
        this.conversationContext.topicHistory.push({
            topics: currentTopics,
            timestamp: Date.now()
        });
        
        if (this.conversationContext.topicHistory.length > this.trackingConfig.maxTopicHistory) {
            this.conversationContext.topicHistory.shift();
        }
    }

    updateContextualEntities(entities) {
        // 現在の文脈エンティティを更新
        for (const [category, entityList] of Object.entries(entities)) {
            for (const [entity, data] of Object.entries(entityList)) {
                if (data.weight > 0.3) {
                    this.conversationContext.entities[entity] = {
                        category: category,
                        weight: data.weight,
                        lastSeen: Date.now()
                    };
                }
            }
        }
        
        // 古いエンティティの削除
        const now = Date.now();
        for (const [entity, data] of Object.entries(this.conversationContext.entities)) {
            if (now - data.lastSeen > this.trackingConfig.temporalWindow) {
                delete this.conversationContext.entities[entity];
            }
        }
    }

    updateContextMemory(currentInput, contextAnalysis) {
        const memoryKey = `context_${Date.now()}`;
        this.contextMemory.set(memoryKey, {
            input: currentInput.substring(0, 100),
            analysis: {
                contextDepth: contextAnalysis.contextDepth,
                dominantTopic: contextAnalysis.contextualState?.dominantTopic,
                qualityScore: contextAnalysis.trackingMetrics?.overallContextQuality
            },
            timestamp: Date.now()
        });
        
        // メモリサイズ制限
        if (this.contextMemory.size > 100) {
            const oldestKey = this.contextMemory.keys().next().value;
            this.contextMemory.delete(oldestKey);
        }
    }

    generateFallbackContext(currentInput, conversationHistory) {
        return {
            contextDepth: Math.min(conversationHistory.length, 5),
            topicEvolution: [],
            referenceChain: [],
            contextualEntities: {},
            temporalFlow: { consistency: 0.5 },
            contextBreaks: [],
            contextualState: { overallCoherence: 0.5 },
            trackingMetrics: { overallContextQuality: 0.5 }
        };
    }

    /**
     * システム統計情報
     */
    getSystemStats() {
        return {
            memorySize: this.contextMemory.size,
            topicHistoryLength: this.conversationContext.topicHistory.length,
            activeEntities: Object.keys(this.conversationContext.entities).length,
            avgContextQuality: this.calculateAverageContextQuality()
        };
    }

    calculateAverageContextQuality() {
        if (this.contextMemory.size === 0) return 0.5;
        
        let totalQuality = 0;
        let count = 0;
        
        for (const memory of this.contextMemory.values()) {
            if (memory.analysis && memory.analysis.qualityScore !== undefined) {
                totalQuality += memory.analysis.qualityScore;
                count++;
            }
        }
        
        return count > 0 ? totalQuality / count : 0.5;
    }

    /**
     * メモリクリア
     */
    clearMemory() {
        this.contextMemory.clear();
        this.conversationContext = {
            currentTopic: null,
            topicHistory: [],
            entities: {},
            references: [],
            temporalMarkers: [],
            contextBreaks: []
        };
        console.log('🧹 文脈追跡メモリクリア完了');
    }
}

// デフォルトインスタンス
export const contextTrackingSystem = new ContextTrackingSystem();