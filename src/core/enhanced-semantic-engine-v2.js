/**
 * EnhancedSemanticEngine v2.0 - 高性能意味類似度エンジン
 * 
 * 🎯 Phase 2実装: 意味類似度統合の品質効果を最大化
 * 🧠 Word2Vec風軽量ベクトル + 専門ドメイン知識統合
 * 📊 動的閾値調整 + カテゴリ特化型類似度計算
 */

export class EnhancedSemanticEngineV2 {
    constructor() {
        // 技術ドメイン特化の意味マップ（拡張版）
        this.domainSemanticMaps = {
            'AI・機械学習': {
                coreTerms: ['AI', '人工知能', 'ML', '機械学習', 'ディープラーニング', 'ニューラルネットワーク'],
                frameworks: ['TensorFlow', 'PyTorch', 'Keras', 'scikit-learn'],
                architectures: ['CNN', 'RNN', 'LSTM', 'GAN', 'Transformer', 'BERT'],
                concepts: ['教師あり学習', '教師なし学習', '強化学習', '畳み込み', '自然言語処理'],
                weight: 0.95,
                threshold: 0.6
            },
            'Web開発': {
                coreTerms: ['Web', 'フロントエンド', 'バックエンド', 'SPA', 'PWA'],
                frameworks: ['React', 'Vue', 'Angular', 'Express', 'Django', 'Flask'],
                languages: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Node.js'],
                concepts: ['コンポーネント', 'ルーティング', 'レスポンシブ', 'API', 'REST', 'GraphQL'],
                weight: 0.9,
                threshold: 0.65
            },
            'クラウド・インフラ': {
                coreTerms: ['クラウド', 'インフラ', 'AWS', 'Azure', 'GCP'],
                services: ['Lambda', 'EC2', 'S3', 'RDS', 'CloudFormation'],
                concepts: ['サーバーレス', 'コンテナ', 'マイクロサービス', 'オートスケール'],
                tools: ['Docker', 'Kubernetes', 'Terraform', 'Ansible'],
                weight: 0.9,
                threshold: 0.7
            },
            'データベース・データ処理': {
                coreTerms: ['データベース', 'DB', 'データ', '分析', 'ETL'],
                sql: ['PostgreSQL', 'MySQL', 'Oracle', 'SQL Server'],
                nosql: ['MongoDB', 'Redis', 'Elasticsearch', 'Cassandra'],
                bigdata: ['Hadoop', 'Spark', 'Kafka', 'Airflow'],
                weight: 0.85,
                threshold: 0.6
            },
            'モバイル開発': {
                coreTerms: ['モバイル', 'アプリ', 'iOS', 'Android'],
                frameworks: ['React Native', 'Flutter', 'Xamarin', 'Ionic'],
                languages: ['Swift', 'Kotlin', 'Java', 'Dart'],
                concepts: ['ネイティブ', 'ハイブリッド', 'クロスプラットフォーム'],
                weight: 0.8,
                threshold: 0.65
            }
        };

        // 概念階層（上位・下位関係）
        this.conceptHierarchy = {
            'プログラミング言語': ['JavaScript', 'Python', 'Java', 'TypeScript', 'Go', 'Rust'],
            'フレームワーク': ['React', 'Vue', 'Angular', 'Django', 'Flask', 'Express'],
            'データベース': ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL'],
            'クラウドサービス': ['AWS', 'Azure', 'GCP', 'Lambda', 'EC2'],
            'AI技術': ['機械学習', 'ディープラーニング', 'CNN', 'RNN', 'LSTM']
        };

        // 関連語ペア（強い関連性）
        this.strongRelations = [
            ['React', 'JSX'], ['Vue', 'Vuex'], ['Angular', 'TypeScript'],
            ['Docker', 'コンテナ'], ['Kubernetes', 'オーケストレーション'],
            ['TensorFlow', 'ニューラルネットワーク'], ['PyTorch', 'ディープラーニング'],
            ['AWS', 'Lambda'], ['MongoDB', 'NoSQL'], ['PostgreSQL', 'SQL']
        ];

        // キャッシュとパフォーマンス
        this.similarityCache = new Map();
        this.vectorCache = new Map();
        this.groupingCache = new Map();
        
        // 統計
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            groupingOperations: 0,
            vectorComputations: 0
        };
    }

    /**
     * メイン類似度計算（v2.0強化版）
     */
    calculateSimilarity(term1, term2) {
        if (term1 === term2) return 1.0;
        
        // キャッシュ確認
        const cacheKey = this.getCacheKey(term1, term2);
        if (this.similarityCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.similarityCache.get(cacheKey);
        }
        
        this.stats.cacheMisses++;
        this.stats.vectorComputations++;
        
        // マルチレベル類似度計算
        const domainSimilarity = this.calculateDomainSimilarity(term1, term2);
        const hierarchySimilarity = this.calculateHierarchySimilarity(term1, term2);
        const relationSimilarity = this.calculateRelationSimilarity(term1, term2);
        const vectorSimilarity = this.calculateVectorSimilarity(term1, term2);
        
        // 重み付き統合スコア
        const totalSimilarity = 
            domainSimilarity * 0.4 +
            hierarchySimilarity * 0.25 +
            relationSimilarity * 0.2 +
            vectorSimilarity * 0.15;
        
        const finalScore = Math.min(1.0, totalSimilarity);
        this.similarityCache.set(cacheKey, finalScore);
        
        return finalScore;
    }

    /**
     * ドメイン特化類似度計算
     */
    calculateDomainSimilarity(term1, term2) {
        let maxSimilarity = 0;
        
        for (const [domain, config] of Object.entries(this.domainSemanticMaps)) {
            const inDomain1 = this.isTermInDomain(term1, config);
            const inDomain2 = this.isTermInDomain(term2, config);
            
            if (inDomain1 && inDomain2) {
                // 同一ドメイン内での詳細類似度
                const subSimilarity = this.calculateSubDomainSimilarity(term1, term2, config);
                maxSimilarity = Math.max(maxSimilarity, config.weight * subSimilarity);
            }
        }
        
        return maxSimilarity;
    }

    /**
     * ドメイン内用語判定
     */
    isTermInDomain(term, domainConfig) {
        const allTerms = [
            ...(domainConfig.coreTerms || []),
            ...(domainConfig.frameworks || []),
            ...(domainConfig.languages || []),
            ...(domainConfig.services || []),
            ...(domainConfig.concepts || []),
            ...(domainConfig.tools || []),
            ...(domainConfig.sql || []),
            ...(domainConfig.nosql || []),
            ...(domainConfig.bigdata || []),
            ...(domainConfig.architectures || [])
        ];
        
        return allTerms.some(domainTerm => 
            term === domainTerm || 
            term.includes(domainTerm) || 
            domainTerm.includes(term) ||
            this.isPartialMatch(term, domainTerm)
        );
    }

    /**
     * サブドメイン類似度計算
     */
    calculateSubDomainSimilarity(term1, term2, domainConfig) {
        const categories = ['coreTerms', 'frameworks', 'languages', 'services', 'concepts', 'tools', 'sql', 'nosql', 'bigdata', 'architectures'];
        
        for (const category of categories) {
            if (!domainConfig[category]) continue;
            
            const inCategory1 = domainConfig[category].some(t => this.isMatch(term1, t));
            const inCategory2 = domainConfig[category].some(t => this.isMatch(term2, t));
            
            if (inCategory1 && inCategory2) {
                return 0.9; // 同一カテゴリ内の高い類似度
            }
        }
        
        return 0.6; // 同一ドメイン内の基本類似度
    }

    /**
     * 階層類似度計算
     */
    calculateHierarchySimilarity(term1, term2) {
        for (const [category, terms] of Object.entries(this.conceptHierarchy)) {
            const inHierarchy1 = terms.some(t => this.isMatch(term1, t));
            const inHierarchy2 = terms.some(t => this.isMatch(term2, t));
            
            if (inHierarchy1 && inHierarchy2) {
                return 0.8; // 同一階層での高い類似度
            }
        }
        
        return 0;
    }

    /**
     * 関連語類似度計算
     */
    calculateRelationSimilarity(term1, term2) {
        for (const [relTerm1, relTerm2] of this.strongRelations) {
            const match1 = (this.isMatch(term1, relTerm1) && this.isMatch(term2, relTerm2)) ||
                          (this.isMatch(term1, relTerm2) && this.isMatch(term2, relTerm1));
            
            if (match1) {
                return 0.85; // 強い関連性
            }
        }
        
        return 0;
    }

    /**
     * ベクトル類似度計算（軽量版）
     */
    calculateVectorSimilarity(term1, term2) {
        const vector1 = this.getTermVector(term1);
        const vector2 = this.getTermVector(term2);
        
        return this.cosineSimilarity(vector1, vector2);
    }

    /**
     * 用語ベクトル生成（特徴ベクトル）
     */
    getTermVector(term) {
        if (this.vectorCache.has(term)) {
            return this.vectorCache.get(term);
        }
        
        const vector = new Array(50).fill(0); // 50次元ベクトル
        
        // 文字特徴
        vector[0] = term.length / 20; // 正規化された長さ
        vector[1] = (term.match(/[A-Z]/g) || []).length / term.length; // 大文字比率
        vector[2] = (term.match(/[a-z]/g) || []).length / term.length; // 小文字比率
        vector[3] = (term.match(/[\u3040-\u309F]/g) || []).length / term.length; // ひらがな比率
        vector[4] = (term.match(/[\u30A0-\u30FF]/g) || []).length / term.length; // カタカナ比率
        vector[5] = (term.match(/[\u4E00-\u9FAF]/g) || []).length / term.length; // 漢字比率
        
        // ドメイン特徴
        let domainIndex = 6;
        for (const [domain, config] of Object.entries(this.domainSemanticMaps)) {
            vector[domainIndex] = this.isTermInDomain(term, config) ? 1 : 0;
            domainIndex++;
        }
        
        // n-gram特徴（文字レベル）
        const ngramIndex = 15;
        const bigrams = this.getBigrams(term);
        for (let i = 0; i < Math.min(bigrams.length, 20); i++) {
            vector[ngramIndex + i] = 1;
        }
        
        // 意味特徴
        vector[35] = this.isFramework(term) ? 1 : 0;
        vector[36] = this.isLanguage(term) ? 1 : 0;
        vector[37] = this.isDatabase(term) ? 1 : 0;
        vector[38] = this.isCloud(term) ? 1 : 0;
        vector[39] = this.isAI(term) ? 1 : 0;
        
        this.vectorCache.set(term, vector);
        return vector;
    }

    /**
     * コサイン類似度計算
     */
    cosineSimilarity(vec1, vec2) {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        
        if (norm1 === 0 || norm2 === 0) return 0;
        
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    /**
     * 強化されたグループ化（v2.0）
     */
    enhancedGroupSimilarConcepts(terms, baseThreshold = 0.3, semanticThreshold = 0.7) {
        this.stats.groupingOperations++;
        
        const cacheKey = `${terms.join('|')}|${baseThreshold}|${semanticThreshold}`;
        if (this.groupingCache.has(cacheKey)) {
            return this.groupingCache.get(cacheKey);
        }
        
        const groups = {};
        const processed = new Set();
        
        for (const term of terms) {
            if (processed.has(term)) continue;
            
            const group = [term];
            processed.add(term);
            
            for (const otherTerm of terms) {
                if (processed.has(otherTerm)) continue;
                
                const similarity = this.calculateSimilarity(term, otherTerm);
                
                // 動的閾値調整
                const effectiveThreshold = this.adjustThresholdForTerms(term, otherTerm, baseThreshold);
                
                if (similarity >= effectiveThreshold) {
                    group.push(otherTerm);
                    processed.add(otherTerm);
                }
            }
            
            groups[term] = group;
        }
        
        this.groupingCache.set(cacheKey, groups);
        return groups;
    }

    /**
     * 動的閾値調整
     */
    adjustThresholdForTerms(term1, term2, baseThreshold) {
        // ドメイン特化調整
        for (const [domain, config] of Object.entries(this.domainSemanticMaps)) {
            const inDomain1 = this.isTermInDomain(term1, config);
            const inDomain2 = this.isTermInDomain(term2, config);
            
            if (inDomain1 && inDomain2) {
                return Math.min(baseThreshold, config.threshold);
            }
        }
        
        return baseThreshold;
    }

    /**
     * ユーティリティメソッド
     */
    isMatch(term1, term2) {
        return term1 === term2 || term1.includes(term2) || term2.includes(term1);
    }

    isPartialMatch(term1, term2) {
        if (term1.length < 3 || term2.length < 3) return false;
        
        const longer = term1.length > term2.length ? term1 : term2;
        const shorter = term1.length <= term2.length ? term1 : term2;
        
        return longer.includes(shorter) && (shorter.length / longer.length) > 0.6;
    }

    getBigrams(text) {
        const bigrams = [];
        for (let i = 0; i < text.length - 1; i++) {
            bigrams.push(text.slice(i, i + 2));
        }
        return bigrams;
    }

    isFramework(term) {
        const frameworks = ['React', 'Vue', 'Angular', 'Django', 'Flask', 'Express', 'TensorFlow', 'PyTorch'];
        return frameworks.some(fw => this.isMatch(term, fw));
    }

    isLanguage(term) {
        const languages = ['JavaScript', 'Python', 'Java', 'TypeScript', 'Swift', 'Kotlin', 'Go', 'Rust'];
        return languages.some(lang => this.isMatch(term, lang));
    }

    isDatabase(term) {
        const databases = ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'SQLite'];
        return databases.some(db => this.isMatch(term, db));
    }

    isCloud(term) {
        const cloud = ['AWS', 'Azure', 'GCP', 'Lambda', 'EC2', 'S3'];
        return cloud.some(c => this.isMatch(term, c));
    }

    isAI(term) {
        const ai = ['AI', 'ML', '機械学習', 'ディープラーニング', 'CNN', 'RNN', 'LSTM'];
        return ai.some(a => this.isMatch(term, a));
    }

    getCacheKey(term1, term2) {
        return term1 < term2 ? `${term1}|${term2}` : `${term2}|${term1}`;
    }

    /**
     * 統計情報とパフォーマンス
     */
    getStats() {
        const totalOperations = this.stats.cacheHits + this.stats.cacheMisses;
        return {
            ...this.stats,
            hitRate: totalOperations > 0 ? (this.stats.cacheHits / totalOperations * 100).toFixed(1) : 0,
            cacheSize: {
                similarity: this.similarityCache.size,
                vector: this.vectorCache.size,
                grouping: this.groupingCache.size
            }
        };
    }

    /**
     * キャッシュクリア
     */
    clearCache() {
        this.similarityCache.clear();
        this.vectorCache.clear();
        this.groupingCache.clear();
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            groupingOperations: 0,
            vectorComputations: 0
        };
    }
}