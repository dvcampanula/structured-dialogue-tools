#!/usr/bin/env node
/**
 * ConceptQualityManager - 概念品質管理・重複除去システム
 *
 * 🔍 高度な重複検出・品質フィルタリング・自動統合
 * 📊 品質スコア計算・カテゴリ最適化・ノイズ除去
 * 🧹 定期的なクリーンアップ・統計ベース品質改善
 */

export class ConceptQualityManager {
    constructor() {
        this.qualityThresholds = {
            excellent: 0.8,
            good: 0.6,
            acceptable: 0.4,
            poor: 0.2
        };
        
        this.duplicateThresholds = {
            identical: 0.95,
            similar: 0.85,
            related: 0.7
        };
        
        this.noisePatterns = [
            // 一般的すぎる語
            /^(こと|もの|これ|それ|あれ|ここ|そこ|あそこ|ため|場合|時|際|様々|数々|人々)$/,
            // 助詞・敬語
            /^(です|である|ます|ません|でしょう|いたします)$/,
            // 短すぎる・記号過多
            /^.{1}$|^[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/,
            // 数字のみ
            /^\d+$/
        ];
        
        this.technicalKeywords = [
            // AI/ML
            'AI', 'ML', 'ディープラーニング', '機械学習', '人工知能', 'CNN', 'RNN', 'LSTM', 'GAN', 'Transformer',
            // プログラミング
            'JavaScript', 'Python', 'Java', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
            // システム・アーキテクチャ
            'API', 'REST', 'GraphQL', 'マイクロサービス', 'アーキテクチャ', 'フレームワーク', 'ライブラリ',
            // データ・DB
            'データベース', 'SQL', 'NoSQL', 'MongoDB', 'Redis', 'PostgreSQL', 'MySQL',
            // クラウド・インフラ
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'DevOps', 'CI/CD'
        ];
    }

    /**
     * 概念の品質スコア計算
     */
    calculateQualityScore(concept) {
        let score = 0.5; // 基本スコア
        const name = concept.name || concept.term || '';
        
        // 1. 長さ評価 (最適: 3-20文字)
        const lengthScore = this.calculateLengthScore(name);
        score += lengthScore * 0.2;
        
        // 2. 技術用語度評価
        const technicalScore = this.calculateTechnicalScore(name);
        score += technicalScore * 0.3;
        
        // 3. 既存関連性評価
        const relevanceScore = concept.relevanceScore || concept.confidence || 0;
        score += relevanceScore * 0.2;
        
        // 4. 頻度評価 (適度な頻度が良い)
        const frequencyScore = this.calculateFrequencyScore(concept.frequency || 1);
        score += frequencyScore * 0.15;
        
        // 5. ノイズ減点
        const noiseScore = this.calculateNoiseScore(name);
        score -= noiseScore * 0.3;
        
        // 6. 構造性評価 (複合語・専門用語)
        const structureScore = this.calculateStructureScore(name);
        score += structureScore * 0.15;
        
        return Math.max(0, Math.min(1, score));
    }

    calculateLengthScore(name) {
        const length = name.length;
        if (length >= 3 && length <= 20) return 1.0;
        if (length === 2 || (length > 20 && length <= 30)) return 0.7;
        if (length === 1 || length > 30) return 0.2;
        return 0.5;
    }

    calculateTechnicalScore(name) {
        // 技術キーワードとの完全/部分一致
        for (const keyword of this.technicalKeywords) {
            if (name === keyword) return 1.0;
            if (name.includes(keyword) || keyword.includes(name)) return 0.8;
        }
        
        // 技術的パターン検出
        const technicalPatterns = [
            /API$|Framework$|Library$/i,
            /^[A-Z]{2,}$/, // 略語
            /-based$|-driven$|-oriented$/i,
            /システム$|アルゴリズム$|プロトコル$/
        ];
        
        for (const pattern of technicalPatterns) {
            if (pattern.test(name)) return 0.6;
        }
        
        return 0.0;
    }

    calculateFrequencyScore(frequency) {
        // 適度な頻度（3-50回）が理想的
        if (frequency >= 3 && frequency <= 50) return 1.0;
        if (frequency >= 2 && frequency <= 100) return 0.8;
        if (frequency === 1) return 0.5;
        return 0.3; // 過度に高頻度は一般的すぎる可能性
    }

    calculateNoiseScore(name) {
        let noiseScore = 0;
        
        for (const pattern of this.noisePatterns) {
            if (pattern.test(name)) {
                noiseScore += 0.5;
            }
        }
        
        // 記号・数字の割合
        const symbolRatio = (name.match(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length / name.length;
        if (symbolRatio > 0.3) noiseScore += 0.3;
        
        // ひらがなのみ（助詞の可能性）
        if (/^[\u3040-\u309F]+$/.test(name) && name.length <= 3) {
            noiseScore += 0.4;
        }
        
        return Math.min(1, noiseScore);
    }

    calculateStructureScore(name) {
        let structureScore = 0;
        
        // 複合語（漢字+カタカナ、英語+日本語等）
        if (/[\u4E00-\u9FAF]/.test(name) && /[\u30A0-\u30FF]/.test(name)) {
            structureScore += 0.4;
        }
        
        // キャメルケース・技術用語パターン
        if (/[a-z][A-Z]/.test(name) || /[A-Z]{2,}/.test(name)) {
            structureScore += 0.3;
        }
        
        // 専門用語的な構造
        if (/-/.test(name) || /\./.test(name)) {
            structureScore += 0.2;
        }
        
        // 適度な複雑さ
        const complexityScore = Math.min(0.1, name.length / 50);
        structureScore += complexityScore;
        
        return Math.min(1, structureScore);
    }

    /**
     * 重複検出・統合
     */
    findDuplicateGroups(concepts) {
        const groups = new Map();
        const processed = new Set();
        
        for (let i = 0; i < concepts.length; i++) {
            if (processed.has(i)) continue;
            
            const concept1 = concepts[i];
            const group = [concept1];
            processed.add(i);
            
            for (let j = i + 1; j < concepts.length; j++) {
                if (processed.has(j)) continue;
                
                const concept2 = concepts[j];
                const similarity = this.calculateConceptSimilarity(concept1, concept2);
                
                if (similarity >= this.duplicateThresholds.similar) {
                    group.push(concept2);
                    processed.add(j);
                }
            }
            
            if (group.length > 1) {
                groups.set(concept1.name || concept1.term, group);
            }
        }
        
        return Array.from(groups.values());
    }

    calculateConceptSimilarity(concept1, concept2) {
        const name1 = (concept1.name || concept1.term || '').toLowerCase().trim();
        const name2 = (concept2.name || concept2.term || '').toLowerCase().trim();
        
        // 完全一致
        if (name1 === name2) return 1.0;
        
        // 正規化して比較（記号・空白除去）
        const normalized1 = name1.replace(/[\s\-_]/g, '');
        const normalized2 = name2.replace(/[\s\-_]/g, '');
        if (normalized1 === normalized2) return 0.95;
        
        // 単複数形・語尾変化
        if (this.arePluralsOrVariants(normalized1, normalized2)) {
            return 0.9;
        }
        
        // レーベンシュタイン距離
        const editDistance = this.levenshteinDistance(name1, name2);
        const maxLength = Math.max(name1.length, name2.length);
        const similarity = 1 - (editDistance / maxLength);
        
        return similarity;
    }

    arePluralsOrVariants(str1, str2) {
        const variants = [
            [/s$/, ''], // 英語複数形
            [/ing$/, ''], // 現在分詞
            [/ed$/, ''], // 過去形
            [/er$/, ''], // 比較級
            [/ly$/, ''], // 副詞
        ];
        
        for (const [pattern, replacement] of variants) {
            const base1 = str1.replace(pattern, replacement);
            const base2 = str2.replace(pattern, replacement);
            if (base1 === base2 && base1.length > 2) return true;
        }
        
        return false;
    }

    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + substitutionCost
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * 重複グループの統合
     */
    mergeDuplicateGroup(duplicateGroup) {
        if (duplicateGroup.length <= 1) return duplicateGroup[0];
        
        // 最高品質の概念をベースとする
        const sortedByQuality = duplicateGroup
            .map(concept => ({
                ...concept,
                qualityScore: this.calculateQualityScore(concept)
            }))
            .sort((a, b) => b.qualityScore - a.qualityScore);
        
        const baseConcept = sortedByQuality[0];
        
        // 頻度・関連概念を統合
        let totalFrequency = 0;
        const allRelatedConcepts = new Set();
        
        for (const concept of duplicateGroup) {
            totalFrequency += concept.frequency || 1;
            
            const related = concept.relatedConcepts || [];
            related.forEach(rel => allRelatedConcepts.add(rel));
        }
        
        return {
            ...baseConcept,
            frequency: totalFrequency,
            relatedConcepts: Array.from(allRelatedConcepts).slice(0, 10),
            mergedFrom: duplicateGroup.map(c => c.name || c.term),
            qualityScore: baseConcept.qualityScore,
            lastMerged: new Date().toISOString()
        };
    }

    /**
     * 概念DBの品質改善
     */
    improveConceptDB(conceptDB) {
        console.log('🧹 概念DB品質改善開始...');
        
        const allConcepts = [
            ...(conceptDB.concepts?.surface || []),
            ...(conceptDB.concepts?.deep || [])
        ];
        
        console.log(`📊 処理対象: ${allConcepts.length}個の概念`);
        
        // 1. 品質スコア計算
        const conceptsWithQuality = allConcepts.map(concept => ({
            ...concept,
            qualityScore: this.calculateQualityScore(concept)
        }));
        
        // 2. 重複検出・統合
        console.log('🔄 重複検出中...');
        const duplicateGroups = this.findDuplicateGroups(conceptsWithQuality);
        console.log(`発見: ${duplicateGroups.length}個の重複グループ`);
        
        const mergedConcepts = [];
        const processedIds = new Set();
        
        // 重複グループを統合
        for (const group of duplicateGroups) {
            const merged = this.mergeDuplicateGroup(group);
            mergedConcepts.push(merged);
            
            // 統合済みIDを記録
            group.forEach(concept => {
                const id = concept.name || concept.term;
                processedIds.add(id);
            });
        }
        
        // 重複していない概念を追加
        for (const concept of conceptsWithQuality) {
            const id = concept.name || concept.term;
            if (!processedIds.has(id)) {
                mergedConcepts.push(concept);
            }
        }
        
        // 3. 品質フィルタリング
        console.log('📈 品質フィルタリング中...');
        const qualityFiltered = mergedConcepts.filter(concept => 
            concept.qualityScore >= this.qualityThresholds.acceptable
        );
        
        const removedCount = mergedConcepts.length - qualityFiltered.length;
        console.log(`🗑️ 低品質概念除去: ${removedCount}個`);
        
        // 4. カテゴリ再分類
        console.log('🏷️ カテゴリ再分類中...');
        const recategorized = this.recategorizeConcepts(qualityFiltered);
        
        // 5. 結果の構築
        const improvedDB = {
            ...conceptDB,
            concepts: {
                surface: recategorized.filter(c => 
                    c.category === 'technology' || 
                    c.category === 'programming' ||
                    c.qualityScore >= this.qualityThresholds.good
                ),
                deep: recategorized.filter(c => 
                    c.category !== 'technology' && 
                    c.category !== 'programming' &&
                    c.qualityScore < this.qualityThresholds.good
                )
            },
            qualityStats: {
                originalCount: allConcepts.length,
                mergedGroups: duplicateGroups.length,
                removedConcepts: removedCount,
                finalCount: qualityFiltered.length,
                improvementRatio: ((removedCount + duplicateGroups.length) / allConcepts.length * 100).toFixed(1)
            }
        };
        
        console.log(`✅ 品質改善完了: ${allConcepts.length} → ${qualityFiltered.length}個 (${improvedDB.qualityStats.improvementRatio}%改善)`);
        
        return improvedDB;
    }

    recategorizeConcepts(concepts) {
        return concepts.map(concept => {
            const name = concept.name || concept.term || '';
            const originalCategory = concept.category || 'general';
            
            // 技術用語の再分類
            let newCategory = originalCategory;
            
            // AI/ML関連
            if (/AI|ML|機械学習|ディープラーニング|人工知能|neural|learning|intelligence/i.test(name)) {
                newCategory = 'artificial_intelligence';
            }
            // プログラミング関連
            else if (/JavaScript|Python|Java|React|Vue|Angular|Framework|Library|API/i.test(name)) {
                newCategory = 'programming';
            }
            // システム・アーキテクチャ
            else if (/システム|アーキテクチャ|database|server|cloud|docker|kubernetes/i.test(name)) {
                newCategory = 'system_architecture';
            }
            // データ関連
            else if (/データ|database|SQL|analytics|analysis/i.test(name)) {
                newCategory = 'data_science';
            }
            // 方法論・概念
            else if (/手法|アプローチ|概念|理論|method|approach|concept/i.test(name)) {
                newCategory = 'methodology';
            }
            // ビジネス・プロジェクト
            else if (/ビジネス|プロジェクト|管理|business|management|project/i.test(name)) {
                newCategory = 'business';
            }
            
            return {
                ...concept,
                category: newCategory
            };
        });
    }

    /**
     * 品質レポート生成
     */
    generateQualityReport(originalDB, improvedDB) {
        const report = {
            timestamp: new Date().toISOString(),
            original: {
                totalConcepts: (originalDB.concepts?.surface?.length || 0) + (originalDB.concepts?.deep?.length || 0),
                surfaceConcepts: originalDB.concepts?.surface?.length || 0,
                deepConcepts: originalDB.concepts?.deep?.length || 0
            },
            improved: {
                totalConcepts: (improvedDB.concepts?.surface?.length || 0) + (improvedDB.concepts?.deep?.length || 0),
                surfaceConcepts: improvedDB.concepts?.surface?.length || 0,
                deepConcepts: improvedDB.concepts?.deep?.length || 0
            },
            improvements: improvedDB.qualityStats,
            recommendations: this.generateRecommendations(improvedDB)
        };
        
        return report;
    }

    generateRecommendations(improvedDB) {
        const recommendations = [];
        const stats = improvedDB.qualityStats;
        
        if (stats.mergedGroups > 0) {
            recommendations.push(`✅ ${stats.mergedGroups}個の重複グループを統合し、データの一貫性を向上`);
        }
        
        if (stats.removedConcepts > 0) {
            recommendations.push(`🗑️ ${stats.removedConcepts}個の低品質概念を除去し、ノイズを削減`);
        }
        
        if (stats.improvementRatio > 5) {
            recommendations.push(`📈 ${stats.improvementRatio}%の改善により、概念DBの品質が大幅向上`);
        }
        
        recommendations.push('🔄 定期的な品質改善により、継続的な精度向上を推奨');
        recommendations.push('📊 新規学習時の品質フィルタ強化を推奨');
        
        return recommendations;
    }
}

export default ConceptQualityManager;