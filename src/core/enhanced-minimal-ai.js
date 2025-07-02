#!/usr/bin/env node
/**
 * EnhancedMinimalAI - 分析機能統合版ミニマムAI
 *
 * 🧬 基本ミニマムAI + アーカイブ分析機能の統合
 * 🔍 ローカル異常検知 + グラフ分析 + パターン学習
 * 🌱 外部API不要・完全プライベート・高度分析
 */
import { MinimalAICore } from './minimal-ai-core.js';
// ローカル異常検知エンジン（API依存なし）
class LocalAnomalyDetector {
    baselineData = new Map();
    conceptFrequencies = new Map();
    totalObservations = 0;
    anomalyThreshold = 0.05; // 低い閾値で異常検知強化
    constructor(conceptDB) {
        this.initializeFromConceptDB(conceptDB);
    }
    initializeFromConceptDB(conceptDB) {
        // 75概念DBから統計ベースライン構築
        const allConcepts = [...conceptDB.concepts.surface, ...conceptDB.concepts.deep];
        for (const concept of allConcepts) {
            this.conceptFrequencies.set(concept.name, concept.frequency);
            this.totalObservations += concept.frequency;
            // 関連概念ペアのベースライン
            for (const related of concept.relatedConcepts) {
                const pairKey = this.createPairKey(concept.name, related);
                this.baselineData.set(pairKey, (this.baselineData.get(pairKey) || 0) + 1);
            }
        }
    }
    createPairKey(concept1, concept2) {
        return [concept1, concept2].sort().join('|');
    }
    detectAnomalies(concepts, content) {
        const anomalies = [];
        const contentWords = content.toLowerCase().split(/\s+/);
        // 概念ペア生成
        const conceptPairs = this.generateConceptPairs(concepts);
        for (const [concept1, concept2] of conceptPairs) {
            const pairKey = this.createPairKey(concept1, concept2);
            // 実際の共起計算
            const actualFreq = this.calculateCooccurrence(concept1, concept2, contentWords);
            // 期待頻度（独立性仮定）
            const freq1 = this.conceptFrequencies.get(concept1) || 1;
            const freq2 = this.conceptFrequencies.get(concept2) || 1;
            const expectedFreq = (freq1 * freq2) / Math.max(this.totalObservations, 100); // 最小値保証
            // 異常スコア（改良版）
            let anomalyScore = 0;
            if (actualFreq > 0) {
                // 実際の共起が期待より多い場合（新しい関係性）
                if (actualFreq > expectedFreq) {
                    anomalyScore = (actualFreq - expectedFreq) / (expectedFreq + 1);
                }
                // 実際の共起が期待より少ない場合も考慮
                else if (expectedFreq > 0) {
                    anomalyScore = Math.abs(actualFreq - expectedFreq) / expectedFreq * 0.5;
                }
            }
            if (anomalyScore > this.anomalyThreshold) {
                anomalies.push({
                    conceptPair: [concept1, concept2],
                    frequency: actualFreq,
                    expectedFrequency: expectedFreq,
                    anomalyScore,
                    context: this.extractContext(concept1, concept2, contentWords),
                    discoveredAt: new Date()
                });
            }
        }
        return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
    }
    generateConceptPairs(concepts) {
        const pairs = [];
        for (let i = 0; i < concepts.length; i++) {
            for (let j = i + 1; j < concepts.length; j++) {
                pairs.push([concepts[i], concepts[j]]);
            }
        }
        return pairs;
    }
    calculateCooccurrence(concept1, concept2, words) {
        const window = 5; // 5単語ウィンドウに短縮
        let cooccurrences = 0;
        // より厳密なマッチング
        const concept1Normalized = concept1.toLowerCase().replace(/[\s\-]/g, '');
        const concept2Normalized = concept2.toLowerCase().replace(/[\s\-]/g, '');
        for (let i = 0; i < words.length; i++) {
            const wordNormalized = words[i].toLowerCase().replace(/[\s\-]/g, '');
            if (wordNormalized.includes(concept1Normalized) && concept1Normalized.length > 2) {
                // ウィンドウ内でconcept2を検索
                for (let j = Math.max(0, i - window); j < Math.min(words.length, i + window); j++) {
                    const contextWordNormalized = words[j].toLowerCase().replace(/[\s\-]/g, '');
                    if (j !== i && contextWordNormalized.includes(concept2Normalized) && concept2Normalized.length > 2) {
                        cooccurrences++;
                        break;
                    }
                }
            }
        }
        // 最低限の共起を保証
        if (cooccurrences === 0 && concept1 !== concept2) {
            // 同じ文内での出現をチェック
            const sentences = words.join(' ').split(/[。！？.!?]/);
            for (const sentence of sentences) {
                if (sentence.includes(concept1) && sentence.includes(concept2)) {
                    cooccurrences = 1;
                    break;
                }
            }
        }
        return cooccurrences;
    }
    extractContext(concept1, concept2, words) {
        const context = [];
        const contextWindow = 3;
        for (let i = 0; i < words.length; i++) {
            if (words[i].includes(concept1.toLowerCase()) || words[i].includes(concept2.toLowerCase())) {
                const start = Math.max(0, i - contextWindow);
                const end = Math.min(words.length, i + contextWindow + 1);
                context.push(words.slice(start, end).join(' '));
            }
        }
        return context.slice(0, 3); // 上位3つの文脈
    }
}
// ローカル概念グラフアナライザー（API依存なし）
class LocalConceptGraphAnalyzer {
    clusteringThreshold = 0.5;
    buildConceptGraph(concepts, conceptDB) {
        // ノード構築
        const nodes = concepts.map(concept => {
            const conceptData = this.findConceptData(concept, conceptDB);
            return {
                id: concept,
                label: concept,
                weight: conceptData?.frequency || 1,
                properties: {
                    contexts: conceptData?.contexts || [],
                    confidence: conceptData?.confidence || 0.5
                }
            };
        });
        // エッジ構築（既知関係 + 動的関係）
        const edges = [];
        const edgeSet = new Set(); // 重複回避
        // 1. 既知の関連概念
        for (const concept of concepts) {
            const conceptData = this.findConceptData(concept, conceptDB);
            if (conceptData?.relatedConcepts) {
                for (const related of conceptData.relatedConcepts) {
                    if (concepts.includes(related)) {
                        const edgeId = [concept, related].sort().join('|');
                        if (!edgeSet.has(edgeId)) {
                            edges.push({
                                source: concept,
                                target: related,
                                weight: 0.8, // 既知関係
                                type: 'known_relation'
                            });
                            edgeSet.add(edgeId);
                        }
                    }
                }
            }
        }
        // 2. 動的関係生成（コンテキスト共有ベース）
        for (let i = 0; i < concepts.length; i++) {
            for (let j = i + 1; j < concepts.length; j++) {
                const concept1 = concepts[i];
                const concept2 = concepts[j];
                const edgeId = [concept1, concept2].sort().join('|');
                if (!edgeSet.has(edgeId)) {
                    const similarity = this.calculateConceptSimilarity(concept1, concept2, conceptDB);
                    if (similarity > 0.3) {
                        edges.push({
                            source: concept1,
                            target: concept2,
                            weight: similarity,
                            type: 'dynamic_relation'
                        });
                        edgeSet.add(edgeId);
                    }
                }
            }
        }
        // 中心性スコア計算（簡易版）
        const centralityScores = this.calculateSimpleCentrality(nodes, edges);
        // クラスター検出（簡易版）
        const clusters = this.detectSimpleClusters(nodes, edges);
        return {
            nodes,
            edges,
            clusters,
            centralityScores
        };
    }
    findConceptData(concept, conceptDB) {
        const allConcepts = [...conceptDB.concepts.surface, ...conceptDB.concepts.deep];
        return allConcepts.find(c => c.name === concept);
    }
    calculateConceptSimilarity(concept1, concept2, conceptDB) {
        const data1 = this.findConceptData(concept1, conceptDB);
        const data2 = this.findConceptData(concept2, conceptDB);
        if (!data1 || !data2)
            return 0;
        let similarity = 0;
        // コンテキスト共有度
        const contexts1 = new Set(data1.contexts || []);
        const contexts2 = new Set(data2.contexts || []);
        const commonContexts = new Set([...contexts1].filter(x => contexts2.has(x)));
        if (contexts1.size > 0 && contexts2.size > 0) {
            similarity += (commonContexts.size / Math.max(contexts1.size, contexts2.size)) * 0.6;
        }
        // 頻度類似度
        const freq1 = data1.frequency || 1;
        const freq2 = data2.frequency || 1;
        const freqSimilarity = 1 - Math.abs(freq1 - freq2) / Math.max(freq1, freq2);
        similarity += freqSimilarity * 0.2;
        // 概念名類似度（簡易版）
        const name1 = concept1.toLowerCase();
        const name2 = concept2.toLowerCase();
        if (name1.includes(name2.split('')[0]) || name2.includes(name1.split('')[0])) {
            similarity += 0.2;
        }
        return Math.min(similarity, 1.0);
    }
    calculateSimpleCentrality(nodes, edges) {
        const centrality = new Map();
        // ゼロ除算回避
        const denominator = Math.max(nodes.length - 1, 1);
        // 次数中心性（接続数ベース）
        for (const node of nodes) {
            const degree = edges.filter(e => e.source === node.id || e.target === node.id).length;
            centrality.set(node.id, degree / denominator);
        }
        return centrality;
    }
    detectSimpleClusters(nodes, edges) {
        // 簡易クラスタリング：接続密度ベース
        const clusters = [];
        const visited = new Set();
        for (const node of nodes) {
            if (visited.has(node.id))
                continue;
            const cluster = this.expandCluster(node.id, nodes, edges, visited);
            if (cluster.length > 1) {
                clusters.push({
                    id: `cluster_${clusters.length}`,
                    concepts: cluster,
                    centroid: cluster[0], // 最初の概念を中心に
                    coherenceScore: cluster.length / nodes.length
                });
            }
        }
        return clusters;
    }
    expandCluster(startNode, nodes, edges, visited) {
        const cluster = [startNode];
        visited.add(startNode);
        const neighbors = edges
            .filter(e => e.source === startNode || e.target === startNode)
            .map(e => e.source === startNode ? e.target : e.source)
            .filter(n => !visited.has(n));
        for (const neighbor of neighbors) {
            if (edges.filter(e => (e.source === startNode && e.target === neighbor) ||
                (e.source === neighbor && e.target === startNode)).length > 0) {
                cluster.push(neighbor);
                visited.add(neighbor);
            }
        }
        return cluster;
    }
    generateGraphInsights(graph) {
        const insights = [];
        // 中心性洞察
        const centralNodes = Array.from(graph.centralityScores.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);
        if (centralNodes.length > 0) {
            insights.push(`最も中心的な概念: ${centralNodes.map(([name, score]) => `${name}(${(score * 100).toFixed(1)}%)`).join(', ')}`);
        }
        // クラスター洞察
        if (graph.clusters.length > 0) {
            insights.push(`概念クラスター: ${graph.clusters.length}個のグループを発見`);
            const largestCluster = graph.clusters.sort((a, b) => b.concepts.length - a.concepts.length)[0];
            insights.push(`最大クラスター: ${largestCluster.concepts.join(', ')}`);
        }
        // エッジ密度
        const nodePairs = (graph.nodes.length * (graph.nodes.length - 1)) / 2;
        const density = nodePairs > 0 ? graph.edges.length / nodePairs : 0;
        insights.push(`概念間結合密度: ${(density * 100).toFixed(1)}%`);
        return insights;
    }
}
// 統合ミニマムAI
export class EnhancedMinimalAI extends MinimalAICore {
    anomalyDetector;
    graphAnalyzer;
    constructor() {
        super();
        this.graphAnalyzer = new LocalConceptGraphAnalyzer();
    }
    async initialize() {
        await super.initialize();
        // 分析機能初期化
        this.anomalyDetector = new LocalAnomalyDetector(this.conceptDB);
        console.log('🧬 統合分析機能初期化完了');
    }
    // 分析強化版応答生成
    async generateEnhancedResponse(userInput) {
        // 基本応答生成
        const baseResponse = await this.generateResponse(userInput);
        // 概念抽出
        const concepts = this.conceptEngine.findConceptsInText(userInput);
        // 異常検知実行
        const anomalies = concepts.length > 1 ?
            this.anomalyDetector.detectAnomalies(concepts, userInput) : [];
        // グラフ分析実行
        const conceptGraph = concepts.length > 0 ?
            this.graphAnalyzer.buildConceptGraph(concepts, this.conceptDB) :
            { nodes: [], edges: [], clusters: [], centralityScores: new Map() };
        // パターン発見
        const discoveredPatterns = this.discoverPatterns(anomalies, conceptGraph);
        // グラフ洞察生成
        const graphInsights = concepts.length > 0 ?
            this.graphAnalyzer.generateGraphInsights(conceptGraph) : [];
        return {
            ...baseResponse,
            analysis: {
                anomalies,
                conceptGraph,
                discoveredPatterns,
                graphInsights
            }
        };
    }
    discoverPatterns(anomalies, graph) {
        const patterns = [];
        // 異常パターンから発見
        if (anomalies.length > 0) {
            patterns.push(`異常な概念組み合わせを${anomalies.length}個発見`);
            const topAnomaly = anomalies[0];
            patterns.push(`注目: "${topAnomaly.conceptPair[0]}" と "${topAnomaly.conceptPair[1]}" の新しい関係性`);
        }
        // グラフ構造から発見
        if (graph.clusters.length > 1) {
            patterns.push(`概念が${graph.clusters.length}つのグループに分離: 異なる思考領域の可能性`);
        }
        return patterns;
    }
    // 学習強化: 分析結果から自動学習
    async learnFromAnalysis(analysis, userFeedback) {
        if (userFeedback === 'positive' && analysis.anomalies.length > 0) {
            // 有用な異常パターンを学習
            const topAnomaly = analysis.anomalies[0];
            console.log(`📚 異常パターン学習: ${topAnomaly.conceptPair.join(' + ')} (スコア: ${topAnomaly.anomalyScore.toFixed(2)})`);
            // 基本学習システムに統合
            await this.learnFromFeedback(`${topAnomaly.conceptPair.join(' ')}の新しい関係性`, 'positive', '興味深い概念組み合わせを発見しました');
        }
    }
}
