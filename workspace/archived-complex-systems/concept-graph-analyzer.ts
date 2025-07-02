#!/usr/bin/env node

/**
 * ConceptGraphAnalyzer - 概念グラフ分析機能実装
 * 
 * 概念間関係をグラフ構造で分析し、
 * 新しいパターンや関係性の発見を行うシステム
 */

import { 
  ConceptGraphAnalyzer, 
  ConceptGraph, 
  ConceptNode, 
  ConceptEdge, 
  ConceptCluster, 
  NewPatternDiscovery, 
  PatternEvolution,
  ConceptRelationship 
} from './evolutionary-pattern-discovery.js';

export class GraphBasedConceptAnalyzer implements ConceptGraphAnalyzer {
  private graphHistory: ConceptGraph[] = [];
  private clusteringThreshold: number = 0.6;
  private centralityCache: Map<string, Map<string, number>> = new Map();

  /**
   * 概念グラフの構築
   */
  public buildConceptGraph(concepts: string[], relationships: ConceptRelationship[]): ConceptGraph {
    console.log(`🔗 概念グラフ構築開始: ${concepts.length}概念, ${relationships.length}関係`);
    
    // ノードの構築
    const nodes = this.buildNodes(concepts, relationships);
    
    // エッジの構築
    const edges = this.buildEdges(relationships);
    
    // 中心性スコアの計算
    const centralityScores = this.calculateCentralityScores(nodes, edges);
    
    // クラスターの検出
    const clusters = this.detectClusters(nodes, edges);
    
    const graph: ConceptGraph = {
      nodes,
      edges,
      clusters,
      centralityScores
    };
    
    this.graphHistory.push(graph);
    console.log(`✅ グラフ構築完了: ${nodes.length}ノード, ${edges.length}エッジ, ${clusters.length}クラスター`);
    
    return graph;
  }

  /**
   * 新パターンの発見
   */
  public findNewPatterns(graph: ConceptGraph): NewPatternDiscovery[] {
    const patterns: NewPatternDiscovery[] = [];
    
    // 1. 新しいクラスターの検出
    const emergingClusters = this.detectEmergingClusters(graph);
    patterns.push(...emergingClusters);
    
    // 2. 新しい概念間関係の発見
    const novelRelationships = this.discoverNovelRelationships(graph);
    patterns.push(...novelRelationships);
    
    // 3. 概念ブリッジの検出
    const conceptBridges = this.detectConceptBridges(graph);
    patterns.push(...conceptBridges);
    
    // 4. セマンティックドリフトの検出
    const semanticDrifts = this.detectSemanticDrifts(graph);
    patterns.push(...semanticDrifts);
    
    // 重要度でソート
    patterns.sort((a, b) => b.significance - a.significance);
    
    console.log(`🔍 新パターン発見: ${patterns.length}パターン`);
    
    return patterns;
  }

  /**
   * パターン進化の分析
   */
  public analyzePatternEvolution(historical: ConceptGraph[], current: ConceptGraph): PatternEvolution[] {
    const evolutions: PatternEvolution[] = [];
    
    if (historical.length === 0) {
      console.log('📈 履歴データなし - 進化分析スキップ');
      return evolutions;
    }
    
    const previous = historical[historical.length - 1];
    
    // 1. 関係性の強化/弱化
    const relationshipEvolution = this.analyzeRelationshipEvolution(previous, current);
    evolutions.push(...relationshipEvolution);
    
    // 2. クラスターの出現/消失
    const clusterEvolution = this.analyzeClusterEvolution(previous, current);
    evolutions.push(...clusterEvolution);
    
    // 3. 中心性の変化
    const centralityEvolution = this.analyzeCentralityEvolution(previous, current);
    evolutions.push(...centralityEvolution);
    
    console.log(`📊 パターン進化分析: ${evolutions.length}進化パターン検出`);
    
    return evolutions;
  }

  /**
   * ノードの構築
   */
  private buildNodes(concepts: string[], relationships: ConceptRelationship[]): ConceptNode[] {
    const nodeMap = new Map<string, ConceptNode>();
    
    // 基本ノード作成
    for (const concept of concepts) {
      nodeMap.set(concept, {
        id: concept,
        concept,
        frequency: this.calculateConceptFrequency(concept, relationships),
        importance: 0, // 後で計算
        semanticCategory: this.inferSemanticCategory(concept)
      });
    }
    
    // 重要度の計算
    for (const node of nodeMap.values()) {
      node.importance = this.calculateNodeImportance(node, relationships);
    }
    
    return Array.from(nodeMap.values());
  }

  /**
   * エッジの構築
   */
  private buildEdges(relationships: ConceptRelationship[]): ConceptEdge[] {
    return relationships.map(rel => ({
      source: rel.source,
      target: rel.target,
      weight: rel.strength,
      relationshipType: rel.type,
      strength: rel.strength
    }));
  }

  /**
   * 中心性スコアの計算
   */
  private calculateCentralityScores(nodes: ConceptNode[], edges: ConceptEdge[]): Map<string, number> {
    const centrality = new Map<string, number>();
    
    // 次数中心性の計算
    for (const node of nodes) {
      const degree = edges.filter(edge => 
        edge.source === node.id || edge.target === node.id
      ).length;
      
      centrality.set(node.id, degree / Math.max(nodes.length - 1, 1));
    }
    
    return centrality;
  }

  /**
   * クラスターの検出
   */
  private detectClusters(nodes: ConceptNode[], edges: ConceptEdge[]): ConceptCluster[] {
    const clusters: ConceptCluster[] = [];
    const visited = new Set<string>();
    
    // 単純なクラスタリング（閾値ベース）
    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      
      const cluster = this.expandCluster(node, nodes, edges, visited);
      if (cluster.concepts.length > 1) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  /**
   * クラスターの拡張
   */
  private expandCluster(
    startNode: ConceptNode, 
    nodes: ConceptNode[], 
    edges: ConceptEdge[], 
    visited: Set<string>
  ): ConceptCluster {
    const clusterConcepts: string[] = [startNode.id];
    visited.add(startNode.id);
    
    const queue = [startNode.id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      // 強い関係を持つ隣接ノードを探す
      const strongNeighbors = edges.filter(edge => 
        (edge.source === currentId || edge.target === currentId) && 
        edge.strength > this.clusteringThreshold
      );
      
      for (const edge of strongNeighbors) {
        const neighborId = edge.source === currentId ? edge.target : edge.source;
        
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          clusterConcepts.push(neighborId);
          queue.push(neighborId);
        }
      }
    }
    
    return {
      id: `cluster_${startNode.id}`,
      concepts: clusterConcepts,
      cohesion: this.calculateClusterCohesion(clusterConcepts, edges),
      theme: this.inferClusterTheme(clusterConcepts)
    };
  }

  /**
   * 新しいクラスターの検出
   */
  private detectEmergingClusters(graph: ConceptGraph): NewPatternDiscovery[] {
    const patterns: NewPatternDiscovery[] = [];
    
    for (const cluster of graph.clusters) {
      // 高い結束度と新規性を持つクラスター
      if (cluster.cohesion > 0.7 && cluster.concepts.length >= 3) {
        patterns.push({
          patternType: 'emerging_cluster',
          confidence: cluster.cohesion,
          description: `新興クラスター "${cluster.theme}" - ${cluster.concepts.length}概念`,
          involvedConcepts: cluster.concepts,
          significance: cluster.cohesion * cluster.concepts.length * 0.1
        });
      }
    }
    
    return patterns;
  }

  /**
   * 新しい関係性の発見
   */
  private discoverNovelRelationships(graph: ConceptGraph): NewPatternDiscovery[] {
    const patterns: NewPatternDiscovery[] = [];
    
    // 高い強度を持つ珍しい関係性を特定
    const strongEdges = graph.edges.filter(edge => edge.strength > 0.8);
    
    for (const edge of strongEdges) {
      // セマンティックカテゴリーが異なる概念間の強い関係
      const sourceNode = graph.nodes.find(n => n.id === edge.source);
      const targetNode = graph.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode && 
          sourceNode.semanticCategory !== targetNode.semanticCategory) {
        patterns.push({
          patternType: 'novel_relationship',
          confidence: edge.strength,
          description: `新関係性: ${edge.source} ⟷ ${edge.target} (${edge.relationshipType})`,
          involvedConcepts: [edge.source, edge.target],
          significance: edge.strength * 0.8
        });
      }
    }
    
    return patterns;
  }

  /**
   * 概念ブリッジの検出
   */
  private detectConceptBridges(graph: ConceptGraph): NewPatternDiscovery[] {
    const patterns: NewPatternDiscovery[] = [];
    
    // 高い中心性を持つ概念（複数クラスターを繋ぐブリッジ）
    for (const [conceptId, centrality] of graph.centralityScores) {
      if (centrality > 0.6) {
        const connectedClusters = graph.clusters.filter(cluster => 
          cluster.concepts.includes(conceptId)
        );
        
        if (connectedClusters.length > 1) {
          patterns.push({
            patternType: 'concept_bridge',
            confidence: centrality,
            description: `概念ブリッジ: "${conceptId}" が${connectedClusters.length}クラスターを接続`,
            involvedConcepts: [conceptId],
            significance: centrality * connectedClusters.length * 0.2
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * セマンティックドリフトの検出
   */
  private detectSemanticDrifts(graph: ConceptGraph): NewPatternDiscovery[] {
    const patterns: NewPatternDiscovery[] = [];
    
    // 前回のグラフと比較してセマンティック位置が大きく変化した概念
    if (this.graphHistory.length > 1) {
      const previousGraph = this.graphHistory[this.graphHistory.length - 2];
      
      for (const node of graph.nodes) {
        const previousNode = previousGraph.nodes.find(n => n.id === node.id);
        
        if (previousNode && 
            previousNode.semanticCategory !== node.semanticCategory) {
          patterns.push({
            patternType: 'semantic_drift',
            confidence: 0.7,
            description: `セマンティックドリフト: "${node.id}" ${previousNode.semanticCategory} → ${node.semanticCategory}`,
            involvedConcepts: [node.id],
            significance: 0.6
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * 関係性進化の分析
   */
  private analyzeRelationshipEvolution(previous: ConceptGraph, current: ConceptGraph): PatternEvolution[] {
    const evolutions: PatternEvolution[] = [];
    
    // エッジ強度の変化を分析
    for (const currentEdge of current.edges) {
      const previousEdge = previous.edges.find(e => 
        (e.source === currentEdge.source && e.target === currentEdge.target) ||
        (e.source === currentEdge.target && e.target === currentEdge.source)
      );
      
      if (previousEdge) {
        const strengthChange = currentEdge.strength - previousEdge.strength;
        
        if (Math.abs(strengthChange) > 0.3) {
          evolutions.push({
            evolutionType: strengthChange > 0 ? 'strengthening' : 'weakening',
            timespan: { start: new Date(Date.now() - 86400000), end: new Date() },
            affectedConcepts: [currentEdge.source, currentEdge.target],
            magnitude: Math.abs(strengthChange)
          });
        }
      }
    }
    
    return evolutions;
  }

  /**
   * クラスター進化の分析
   */
  private analyzeClusterEvolution(previous: ConceptGraph, current: ConceptGraph): PatternEvolution[] {
    const evolutions: PatternEvolution[] = [];
    
    // 新しいクラスターの出現
    for (const currentCluster of current.clusters) {
      const similarPreviousCluster = previous.clusters.find(pc => 
        this.calculateClusterSimilarity(currentCluster, pc) > 0.7
      );
      
      if (!similarPreviousCluster) {
        evolutions.push({
          evolutionType: 'emergence',
          timespan: { start: new Date(Date.now() - 86400000), end: new Date() },
          affectedConcepts: currentCluster.concepts,
          magnitude: currentCluster.cohesion
        });
      }
    }
    
    return evolutions;
  }

  /**
   * 中心性進化の分析
   */
  private analyzeCentralityEvolution(previous: ConceptGraph, current: ConceptGraph): PatternEvolution[] {
    const evolutions: PatternEvolution[] = [];
    
    for (const [conceptId, currentCentrality] of current.centralityScores) {
      const previousCentrality = previous.centralityScores.get(conceptId) || 0;
      const centralityChange = currentCentrality - previousCentrality;
      
      if (Math.abs(centralityChange) > 0.2) {
        evolutions.push({
          evolutionType: centralityChange > 0 ? 'strengthening' : 'weakening',
          timespan: { start: new Date(Date.now() - 86400000), end: new Date() },
          affectedConcepts: [conceptId],
          magnitude: Math.abs(centralityChange)
        });
      }
    }
    
    return evolutions;
  }

  // ユーティリティメソッド
  private calculateConceptFrequency(concept: string, relationships: ConceptRelationship[]): number {
    return relationships.filter(rel => 
      rel.source === concept || rel.target === concept
    ).length;
  }

  private calculateNodeImportance(node: ConceptNode, relationships: ConceptRelationship[]): number {
    const connectionStrength = relationships
      .filter(rel => rel.source === node.id || rel.target === node.id)
      .reduce((sum, rel) => sum + rel.strength, 0);
    
    return connectionStrength / Math.max(node.frequency, 1);
  }

  private inferSemanticCategory(concept: string): string {
    // 簡単なルールベース分類
    if (/システム|機能|実装|技術/.test(concept)) return 'technical';
    if (/分析|データ|情報/.test(concept)) return 'analytical';
    if (/概念|理論|知識/.test(concept)) return 'conceptual';
    if (/プロセス|方法|手法/.test(concept)) return 'methodological';
    return 'general';
  }

  private calculateClusterCohesion(concepts: string[], edges: ConceptEdge[]): number {
    const internalEdges = edges.filter(edge => 
      concepts.includes(edge.source) && concepts.includes(edge.target)
    );
    
    const maxPossibleEdges = concepts.length * (concepts.length - 1) / 2;
    return maxPossibleEdges > 0 ? internalEdges.length / maxPossibleEdges : 0;
  }

  private inferClusterTheme(concepts: string[]): string {
    // 最も頻繁なセマンティックカテゴリーをテーマとする
    const categories = concepts.map(c => this.inferSemanticCategory(c));
    const categoryCount = new Map<string, number>();
    
    for (const category of categories) {
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    }
    
    const mostCommon = Array.from(categoryCount.entries())
      .sort(([, a], [, b]) => b - a)[0];
    
    return mostCommon ? mostCommon[0] : 'mixed';
  }

  private calculateClusterSimilarity(cluster1: ConceptCluster, cluster2: ConceptCluster): number {
    const intersection = cluster1.concepts.filter(c => cluster2.concepts.includes(c));
    const union = [...new Set([...cluster1.concepts, ...cluster2.concepts])];
    
    return intersection.length / union.length;
  }

  /**
   * グラフ分析統計の取得
   */
  public getAnalysisStatistics(): {
    totalGraphs: number;
    averageNodes: number;
    averageEdges: number;
    averageClusters: number;
    topCentralConcepts: string[];
  } {
    if (this.graphHistory.length === 0) {
      return {
        totalGraphs: 0,
        averageNodes: 0,
        averageEdges: 0,
        averageClusters: 0,
        topCentralConcepts: []
      };
    }

    const avgNodes = this.graphHistory.reduce((sum, g) => sum + g.nodes.length, 0) / this.graphHistory.length;
    const avgEdges = this.graphHistory.reduce((sum, g) => sum + g.edges.length, 0) / this.graphHistory.length;
    const avgClusters = this.graphHistory.reduce((sum, g) => sum + g.clusters.length, 0) / this.graphHistory.length;
    
    const latestGraph = this.graphHistory[this.graphHistory.length - 1];
    const topCentral = Array.from(latestGraph.centralityScores.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([concept]) => concept);

    return {
      totalGraphs: this.graphHistory.length,
      averageNodes: avgNodes,
      averageEdges: avgEdges,
      averageClusters: avgClusters,
      topCentralConcepts: topCentral
    };
  }
}