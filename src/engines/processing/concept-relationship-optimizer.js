/**
 * ConceptRelationshipOptimizer - 概念関係性分析・グループ化最適化システム
 * 
 * 🎯 Phase 3実装: v2.0グループ化結果の高度な関係性分析
 * 🧠 階層構造分析 + 依存関係マッピング + グループ間関係性
 * 📊 概念ネットワーク構築 + 重要度スコアリング + 最適化推奨
 */

export class ConceptRelationshipOptimizer {
    constructor() {
        // 概念関係性の種類定義
        this.relationshipTypes = {
            HIERARCHICAL: 'hierarchical',     // 階層関係 (親子関係)
            DEPENDENCY: 'dependency',         // 依存関係 (AがBに依存)
            ASSOCIATION: 'association',       // 関連関係 (AとBが関連)
            COMPOSITION: 'composition',       // 構成関係 (AがBを含む)
            SIMILARITY: 'similarity',         // 類似関係 (AとBが類似)
            SEQUENCE: 'sequence',             // 順序関係 (AからBへの流れ)
            CONFLICT: 'conflict'              // 競合関係 (AとBが競合)
        };

        // 技術ドメインの階層構造定義
        this.domainHierarchies = {
            'AI・機械学習': {
                levels: {
                    'framework': ['TensorFlow', 'PyTorch', 'Keras', 'scikit-learn'],
                    'architecture': ['CNN', 'RNN', 'LSTM', 'GAN', 'Transformer'],
                    'concept': ['機械学習', 'ディープラーニング', '教師あり学習', '教師なし学習'],
                    'application': ['自然言語処理', 'コンピュータビジョン', '音声認識']
                },
                dependencies: {
                    'TensorFlow': ['Python', 'NumPy'],
                    'PyTorch': ['Python', 'CUDA'],
                    'CNN': ['TensorFlow', 'PyTorch'],
                    'ディープラーニング': ['機械学習', 'ニューラルネットワーク']
                }
            },
            'Web開発': {
                levels: {
                    'language': ['JavaScript', 'TypeScript', 'HTML', 'CSS'],
                    'framework': ['React', 'Vue', 'Angular', 'Express', 'Next.js'],
                    'concept': ['SPA', 'PWA', 'SSR', 'CSR', 'コンポーネント'],
                    'tool': ['Webpack', 'Vite', 'npm', 'yarn']
                },
                dependencies: {
                    'React': ['JavaScript', 'npm'],
                    'TypeScript': ['JavaScript', 'Node.js'],
                    'Next.js': ['React', 'Node.js'],
                    'SPA': ['JavaScript', 'フレームワーク']
                }
            },
            'クラウド・インフラ': {
                levels: {
                    'provider': ['AWS', 'Azure', 'GCP'],
                    'service': ['Lambda', 'EC2', 'S3', 'RDS'],
                    'concept': ['サーバーレス', 'マイクロサービス', 'オートスケール'],
                    'tool': ['Docker', 'Kubernetes', 'Terraform']
                },
                dependencies: {
                    'Lambda': ['AWS', 'サーバーレス'],
                    'Kubernetes': ['Docker', 'コンテナ'],
                    'マイクロサービス': ['API', 'サービス分離']
                }
            }
        };

        // 関係性重み設定
        this.relationshipWeights = {
            [this.relationshipTypes.HIERARCHICAL]: 0.9,
            [this.relationshipTypes.DEPENDENCY]: 0.85,
            [this.relationshipTypes.COMPOSITION]: 0.8,
            [this.relationshipTypes.SEQUENCE]: 0.7,
            [this.relationshipTypes.ASSOCIATION]: 0.6,
            [this.relationshipTypes.SIMILARITY]: 0.5,
            [this.relationshipTypes.CONFLICT]: -0.3
        };

        // 統計情報
        this.stats = {
            relationshipsAnalyzed: 0,
            hierarchiesDetected: 0,
            dependenciesFound: 0,
            optimizationsSuggested: 0,
            networkNodes: 0,
            networkEdges: 0
        };
    }

    /**
     * メイン最適化処理
     */
    optimizeConceptRelationships(terms, conceptGroups, existingRelationships = []) {
        console.log('🔄 概念関係性分析・最適化開始...');
        this.stats.relationshipsAnalyzed = 0;
        
        // 1. 階層構造分析
        const hierarchicalStructure = this.analyzeHierarchicalStructure(terms, conceptGroups);
        
        // 2. 依存関係分析
        const dependencyMap = this.analyzeDependencies(terms, conceptGroups);
        
        // 3. グループ間関係性分析
        const groupRelationships = this.analyzeGroupRelationships(conceptGroups);
        
        // 4. 概念ネットワーク構築
        const conceptNetwork = this.buildConceptNetwork(terms, conceptGroups, hierarchicalStructure, dependencyMap);
        
        // 5. 最適化推奨生成
        const optimizations = this.generateOptimizations(conceptGroups, hierarchicalStructure, dependencyMap);
        
        // 6. 品質スコア計算
        const qualityMetrics = this.calculateRelationshipQuality(conceptNetwork, optimizations);
        
        console.log(`✅ 関係性分析完了: ${this.stats.relationshipsAnalyzed}個の関係を分析`);
        
        return {
            hierarchicalStructure,
            dependencyMap,
            groupRelationships,
            conceptNetwork,
            optimizations,
            qualityMetrics,
            statistics: { ...this.stats }
        };
    }

    /**
     * 階層構造分析
     */
    analyzeHierarchicalStructure(terms, conceptGroups) {
        const hierarchies = {};
        
        for (const [groupKey, groupMembers] of Object.entries(conceptGroups)) {
            if (groupMembers.length < 2) continue;
            
            const domainHierarchy = this.identifyDomainHierarchy(groupMembers);
            if (domainHierarchy) {
                hierarchies[groupKey] = this.buildGroupHierarchy(groupMembers, domainHierarchy);
                this.stats.hierarchiesDetected++;
            }
        }
        
        return hierarchies;
    }

    /**
     * ドメイン階層の特定
     */
    identifyDomainHierarchy(groupMembers) {
        for (const [domain, config] of Object.entries(this.domainHierarchies)) {
            const matchingLevels = {};
            let totalMatches = 0;
            
            for (const [level, levelTerms] of Object.entries(config.levels)) {
                const matches = groupMembers.filter(term => 
                    levelTerms.some(levelTerm => this.isTermMatch(term, levelTerm))
                );
                
                if (matches.length > 0) {
                    matchingLevels[level] = matches;
                    totalMatches += matches.length;
                }
            }
            
            // グループメンバーの50%以上がこのドメインにマッチする場合
            if (totalMatches / groupMembers.length >= 0.5) {
                return { domain, levels: matchingLevels, config };
            }
        }
        
        return null;
    }

    /**
     * グループ階層構築
     */
    buildGroupHierarchy(groupMembers, domainHierarchy) {
        const hierarchy = {
            domain: domainHierarchy.domain,
            levels: [],
            relationships: []
        };
        
        // レベル順序定義
        const levelOrder = ['language', 'framework', 'service', 'tool', 'architecture', 'concept', 'application'];
        
        for (const level of levelOrder) {
            if (domainHierarchy.levels[level]) {
                hierarchy.levels.push({
                    level,
                    terms: domainHierarchy.levels[level],
                    priority: this.calculateLevelPriority(level)
                });
            }
        }
        
        // 階層内関係性生成
        for (let i = 0; i < hierarchy.levels.length - 1; i++) {
            const upperLevel = hierarchy.levels[i];
            const lowerLevel = hierarchy.levels[i + 1];
            
            for (const upperTerm of upperLevel.terms) {
                for (const lowerTerm of lowerLevel.terms) {
                    if (this.hasHierarchicalRelation(upperTerm, lowerTerm, domainHierarchy.config)) {
                        hierarchy.relationships.push({
                            parent: upperTerm,
                            child: lowerTerm,
                            type: this.relationshipTypes.HIERARCHICAL,
                            strength: this.relationshipWeights[this.relationshipTypes.HIERARCHICAL]
                        });
                    }
                }
            }
        }
        
        return hierarchy;
    }

    /**
     * 依存関係分析
     */
    analyzeDependencies(terms, conceptGroups) {
        const dependencyMap = {
            dependencies: [],
            clusters: [],
            criticalPath: []
        };
        
        for (const term of terms) {
            const dependencies = this.findTermDependencies(term);
            
            for (const dependency of dependencies) {
                if (terms.includes(dependency)) {
                    dependencyMap.dependencies.push({
                        dependent: term,
                        dependency,
                        type: this.relationshipTypes.DEPENDENCY,
                        strength: this.relationshipWeights[this.relationshipTypes.DEPENDENCY],
                        critical: this.isCriticalDependency(term, dependency)
                    });
                    this.stats.dependenciesFound++;
                }
            }
        }
        
        // 依存クラスター検出
        dependencyMap.clusters = this.detectDependencyClusters(dependencyMap.dependencies);
        
        // クリティカルパス計算
        dependencyMap.criticalPath = this.calculateCriticalPath(dependencyMap.dependencies);
        
        return dependencyMap;
    }

    /**
     * 用語の依存関係検索
     */
    findTermDependencies(term) {
        const dependencies = [];
        
        for (const [domain, config] of Object.entries(this.domainHierarchies)) {
            if (config.dependencies[term]) {
                dependencies.push(...config.dependencies[term]);
            }
        }
        
        // 暗黙的依存関係の推定
        const implicitDeps = this.inferImplicitDependencies(term);
        dependencies.push(...implicitDeps);
        
        return [...new Set(dependencies)]; // 重複除去
    }

    /**
     * 暗黙的依存関係の推定
     */
    inferImplicitDependencies(term) {
        const implicit = [];
        
        // フレームワーク -> 言語
        if (/React|Vue|Angular/.test(term)) {
            implicit.push('JavaScript');
        }
        if (/Django|Flask/.test(term)) {
            implicit.push('Python');
        }
        
        // クラウドサービス -> プロバイダー
        if (/Lambda|EC2|S3/.test(term)) {
            implicit.push('AWS');
        }
        
        // AI/MLフレームワーク -> 基盤技術
        if (/TensorFlow|PyTorch/.test(term)) {
            implicit.push('Python', 'NumPy');
        }
        
        return implicit;
    }

    /**
     * グループ間関係性分析
     */
    analyzeGroupRelationships(conceptGroups) {
        const groupRelations = [];
        const groupKeys = Object.keys(conceptGroups);
        
        for (let i = 0; i < groupKeys.length; i++) {
            for (let j = i + 1; j < groupKeys.length; j++) {
                const group1 = conceptGroups[groupKeys[i]];
                const group2 = conceptGroups[groupKeys[j]];
                
                const relation = this.calculateGroupRelation(group1, group2, groupKeys[i], groupKeys[j]);
                if (relation.strength > 0.3) {
                    groupRelations.push(relation);
                }
            }
        }
        
        return groupRelations.sort((a, b) => b.strength - a.strength);
    }

    /**
     * グループ間関係計算
     */
    calculateGroupRelation(group1, group2, key1, key2) {
        let maxStrength = 0;
        let relationType = this.relationshipTypes.ASSOCIATION;
        let evidence = [];
        
        // 直接的な関係性チェック
        for (const term1 of group1) {
            for (const term2 of group2) {
                const directRelation = this.getDirectRelation(term1, term2);
                if (directRelation.strength > maxStrength) {
                    maxStrength = directRelation.strength;
                    relationType = directRelation.type;
                    evidence.push(`${term1} → ${term2}: ${directRelation.type}`);
                }
            }
        }
        
        // ドメイン関連性チェック
        const domainRelation = this.getDomainRelation(group1, group2);
        if (domainRelation.strength > maxStrength) {
            maxStrength = domainRelation.strength;
            relationType = domainRelation.type;
            evidence.push(`Domain relation: ${domainRelation.type}`);
        }
        
        return {
            group1: key1,
            group2: key2,
            type: relationType,
            strength: maxStrength,
            evidence,
            members1: group1,
            members2: group2
        };
    }

    /**
     * 概念ネットワーク構築
     */
    buildConceptNetwork(terms, conceptGroups, hierarchicalStructure, dependencyMap) {
        const network = {
            nodes: [],
            edges: [],
            clusters: [],
            centrality: {},
            importance: {}
        };
        
        // ノード生成
        for (const term of terms) {
            const node = {
                id: term,
                label: term,
                group: this.findTermGroup(term, conceptGroups),
                level: this.getTermLevel(term, hierarchicalStructure),
                dependencies: dependencyMap.dependencies.filter(d => d.dependent === term).length,
                dependents: dependencyMap.dependencies.filter(d => d.dependency === term).length
            };
            network.nodes.push(node);
        }
        
        // エッジ生成
        for (const dep of dependencyMap.dependencies) {
            network.edges.push({
                source: dep.dependency,
                target: dep.dependent,
                type: dep.type,
                weight: dep.strength,
                critical: dep.critical
            });
        }
        
        // 中心性計算
        network.centrality = this.calculateCentrality(network);
        
        // 重要度計算
        network.importance = this.calculateImportance(network, hierarchicalStructure);
        
        this.stats.networkNodes = network.nodes.length;
        this.stats.networkEdges = network.edges.length;
        
        return network;
    }

    /**
     * 最適化推奨生成
     */
    generateOptimizations(conceptGroups, hierarchicalStructure, dependencyMap) {
        const optimizations = [];
        
        // 1. グループ統合推奨
        const mergeRecommendations = this.recommendGroupMerges(conceptGroups);
        optimizations.push(...mergeRecommendations);
        
        // 2. 階層最適化推奨
        const hierarchyOptimizations = this.recommendHierarchyOptimizations(hierarchicalStructure);
        optimizations.push(...hierarchyOptimizations);
        
        // 3. 依存関係最適化推奨
        const dependencyOptimizations = this.recommendDependencyOptimizations(dependencyMap);
        optimizations.push(...dependencyOptimizations);
        
        this.stats.optimizationsSuggested = optimizations.length;
        
        return optimizations.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 関係性品質計算
     */
    calculateRelationshipQuality(conceptNetwork, optimizations) {
        const metrics = {
            networkDensity: this.calculateNetworkDensity(conceptNetwork),
            hierarchyCompleteness: this.calculateHierarchyCompleteness(conceptNetwork),
            dependencyConsistency: this.calculateDependencyConsistency(conceptNetwork),
            optimizationPotential: this.calculateOptimizationPotential(optimizations),
            overallQuality: 0
        };
        
        // 総合品質スコア
        metrics.overallQuality = (
            metrics.networkDensity * 0.3 +
            metrics.hierarchyCompleteness * 0.3 +
            metrics.dependencyConsistency * 0.25 +
            metrics.optimizationPotential * 0.15
        );
        
        return metrics;
    }

    /**
     * ユーティリティメソッド
     */
    isTermMatch(term1, term2) {
        return term1 === term2 || 
               term1.includes(term2) || 
               term2.includes(term1) ||
               this.calculateStringsimilarity(term1, term2) > 0.8;
    }

    calculateStringsimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }
        
        return 1 - matrix[len2][len1] / Math.max(len1, len2);
    }

    calculateLevelPriority(level) {
        const priorities = {
            'language': 1.0,
            'framework': 0.9,
            'service': 0.8,
            'tool': 0.7,
            'architecture': 0.6,
            'concept': 0.5,
            'application': 0.4
        };
        return priorities[level] || 0.3;
    }

    hasHierarchicalRelation(upperTerm, lowerTerm, domainConfig) {
        if (domainConfig.dependencies[lowerTerm]) {
            return domainConfig.dependencies[lowerTerm].includes(upperTerm);
        }
        return false;
    }

    isCriticalDependency(dependent, dependency) {
        // フレームワークの言語依存は常にクリティカル
        const criticalPairs = [
            ['React', 'JavaScript'],
            ['Vue', 'JavaScript'],
            ['Django', 'Python'],
            ['TensorFlow', 'Python']
        ];
        
        return criticalPairs.some(([dep, req]) => 
            this.isTermMatch(dependent, dep) && this.isTermMatch(dependency, req)
        );
    }

    detectDependencyClusters(dependencies) {
        // 依存関係に基づくクラスター検出（簡易実装）
        const clusters = [];
        const processed = new Set();
        
        for (const dep of dependencies) {
            if (processed.has(dep.dependent)) continue;
            
            const cluster = [dep.dependent];
            const related = dependencies.filter(d => 
                d.dependency === dep.dependent || d.dependent === dep.dependency
            );
            
            for (const rel of related) {
                if (!cluster.includes(rel.dependent)) cluster.push(rel.dependent);
                if (!cluster.includes(rel.dependency)) cluster.push(rel.dependency);
            }
            
            if (cluster.length > 2) {
                clusters.push(cluster);
                cluster.forEach(term => processed.add(term));
            }
        }
        
        return clusters;
    }

    calculateCriticalPath(dependencies) {
        // クリティカルパス計算（簡易実装）
        return dependencies
            .filter(dep => dep.critical)
            .map(dep => `${dep.dependency} → ${dep.dependent}`)
            .slice(0, 5); // 上位5つ
    }

    findTermGroup(term, conceptGroups) {
        for (const [groupKey, members] of Object.entries(conceptGroups)) {
            if (members.includes(term)) return groupKey;
        }
        return null;
    }

    getTermLevel(term, hierarchicalStructure) {
        for (const [groupKey, hierarchy] of Object.entries(hierarchicalStructure)) {
            for (const level of hierarchy.levels) {
                if (level.terms.includes(term)) return level.level;
            }
        }
        return 'unknown';
    }

    getDirectRelation(term1, term2) {
        // 直接的な関係性判定（簡易実装）
        if (this.isCriticalDependency(term1, term2) || this.isCriticalDependency(term2, term1)) {
            return { type: this.relationshipTypes.DEPENDENCY, strength: 0.9 };
        }
        
        const similarity = this.calculateStringsimilarity(term1, term2);
        if (similarity > 0.7) {
            return { type: this.relationshipTypes.SIMILARITY, strength: similarity * 0.6 };
        }
        
        return { type: this.relationshipTypes.ASSOCIATION, strength: 0.1 };
    }

    getDomainRelation(group1, group2) {
        // ドメイン間関係性判定（簡易実装）
        return { type: this.relationshipTypes.ASSOCIATION, strength: 0.2 };
    }

    recommendGroupMerges(conceptGroups) {
        // グループ統合推奨（簡易実装）
        return [{
            type: 'group_merge',
            description: '類似度の高いグループの統合を推奨',
            priority: 0.6,
            action: 'merge_similar_groups'
        }];
    }

    recommendHierarchyOptimizations(hierarchicalStructure) {
        // 階層最適化推奨（簡易実装）
        return [{
            type: 'hierarchy_optimization',
            description: '階層構造の明確化を推奨',
            priority: 0.7,
            action: 'clarify_hierarchy'
        }];
    }

    recommendDependencyOptimizations(dependencyMap) {
        // 依存関係最適化推奨（簡易実装）
        return [{
            type: 'dependency_optimization',
            description: '循環依存の解決を推奨',
            priority: 0.8,
            action: 'resolve_circular_dependencies'
        }];
    }

    calculateNetworkDensity(network) {
        const maxEdges = (network.nodes.length * (network.nodes.length - 1)) / 2;
        return maxEdges > 0 ? network.edges.length / maxEdges : 0;
    }

    calculateHierarchyCompleteness(network) {
        // 階層完全性計算（簡易実装）
        return 0.7;
    }

    calculateDependencyConsistency(network) {
        // 依存関係一貫性計算（簡易実装）
        return 0.8;
    }

    calculateOptimizationPotential(optimizations) {
        return optimizations.length > 0 ? 
            optimizations.reduce((sum, opt) => sum + opt.priority, 0) / optimizations.length : 0;
    }

    calculateCentrality(network) {
        // 中心性計算（簡易実装）
        const centrality = {};
        for (const node of network.nodes) {
            const degree = network.edges.filter(e => 
                e.source === node.id || e.target === node.id
            ).length;
            centrality[node.id] = degree / (network.nodes.length - 1);
        }
        return centrality;
    }

    calculateImportance(network, hierarchicalStructure) {
        // 重要度計算（簡易実装）
        const importance = {};
        for (const node of network.nodes) {
            importance[node.id] = (node.dependencies + node.dependents) / 10;
        }
        return importance;
    }

    /**
     * 統計情報取得
     */
    getStatistics() {
        return { ...this.stats };
    }
}