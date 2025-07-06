#!/usr/bin/env node
/**
 * DialogueLogLearner - 構造的対話ログから概念を学習するシステム
 *
 * 🧠 既存test-logs/から自動学習・概念DB拡張
 * 🎯 複数ログ形式対応・品質フィルタリング・統合管理
 * 🔄 既存117概念DBへの動的統合・重複検出・関連性強化
 */

import fs from 'fs';
import path from 'path';
import kuromoji from 'kuromoji';

export class DialogueLogLearner {
    constructor(conceptDB, minimalAI) {
        this.conceptDB = conceptDB;
        this.minimalAI = minimalAI;
        this.tokenizer = null;
        this.learningStats = {
            processedLogs: 0,
            extractedConcepts: 0,
            integratedConcepts: 0,
            qualityFiltered: 0
        };
        this.initializeTokenizer();
    }

    async initializeTokenizer() {
        return new Promise((resolve) => {
            kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
                if (err) {
                    console.error('kuromoji初期化エラー:', err);
                    resolve(null);
                } else {
                    this.tokenizer = tokenizer;
                    console.log('📝 kuromoji tokenizer初期化完了');
                    resolve(tokenizer);
                }
            });
        });
    }

    /**
     * ログ形式の自動検出
     */
    detectLogFormat(content) {
        const patterns = {
            chatgpt: /^ChatGPT:|^あなた:/m,
            claude: /^Human:|^Assistant:/m,
            gemini: /^ユーザー:|^Gemini:|Gemini との会話|このログは.*ChatGPT/m,
            custom: /^User:|^AI:/m,
            markdown: /^#|^\*\*|^-/m
        };

        for (const [format, pattern] of Object.entries(patterns)) {
            if (pattern.test(content)) {
                return format;
            }
        }
        return 'unknown';
    }

    /**
     * 対話ログの解析・構造化
     */
    parseDialogueLog(content, format) {
        const dialogueStructure = {
            format,
            exchanges: [],
            totalLength: content.length,
            concepts: new Set(),
            technicalTerms: new Set(),
            metadata: {}
        };

        let exchanges = [];
        
        switch (format) {
            case 'chatgpt':
                exchanges = this.parseChatGPTFormat(content);
                break;
            case 'claude':
                exchanges = this.parseClaudeFormat(content);
                break;
            case 'gemini':
                exchanges = this.parseGeminiFormat(content);
                break;
            default:
                exchanges = this.parseGenericFormat(content);
        }

        dialogueStructure.exchanges = exchanges;
        return dialogueStructure;
    }

    parseChatGPTFormat(content) {
        const exchanges = [];
        const lines = content.split('\n');
        let currentExchange = null;
        let currentRole = null;
        let currentContent = [];

        for (const line of lines) {
            if (line.startsWith('あなた:') || line.startsWith('ChatGPT:')) {
                // 前の発言を保存
                if (currentExchange && currentRole) {
                    currentExchange[currentRole] = currentContent.join('\n').trim();
                }

                // 新しい発言の開始
                if (line.startsWith('あなた:')) {
                    if (currentExchange) exchanges.push(currentExchange);
                    currentExchange = {};
                    currentRole = 'human';
                    currentContent = [line.replace('あなた:', '').trim()];
                } else {
                    currentRole = 'assistant';
                    currentContent = [line.replace('ChatGPT:', '').trim()];
                }
            } else if (currentRole && line.trim()) {
                currentContent.push(line);
            }
        }

        // 最後の発言を保存
        if (currentExchange && currentRole) {
            currentExchange[currentRole] = currentContent.join('\n').trim();
            exchanges.push(currentExchange);
        }

        return exchanges;
    }

    parseClaudeFormat(content) {
        // Claude形式の解析実装
        const exchanges = [];
        const sections = content.split(/^(Human:|Assistant:)/m);
        
        for (let i = 1; i < sections.length; i += 2) {
            const role = sections[i].replace(':', '').toLowerCase();
            const content = sections[i + 1] ? sections[i + 1].trim() : '';
            
            if (content) {
                exchanges.push({
                    [role]: content
                });
            }
        }
        
        return exchanges;
    }

    parseGeminiFormat(content) {
        // Gemini形式の解析実装
        return this.parseChatGPTFormat(content.replace(/ユーザー:/g, 'あなた:').replace(/Gemini:/g, 'ChatGPT:'));
    }

    parseGenericFormat(content) {
        // 汎用形式の解析 - 段落ベースで区切る
        const exchanges = [];
        const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
        
        for (const paragraph of paragraphs) {
            const cleanParagraph = paragraph.trim();
            if (cleanParagraph.length > 20) { // 意味のある長さの段落のみ
                exchanges.push({
                    content: cleanParagraph,
                    type: 'mixed' // 発言者不明だが内容は有効
                });
            }
        }
        
        return exchanges;
    }

    /**
     * 構造的対話から概念抽出
     */
    async extractConceptsFromDialogue(dialogueStructure) {
        const extractedConcepts = new Set();
        const technicalTerms = new Set();
        
        for (const exchange of dialogueStructure.exchanges) {
            const texts = [];
            if (exchange.human) texts.push(exchange.human);
            if (exchange.assistant) texts.push(exchange.assistant);
            if (exchange.content) texts.push(exchange.content);
            
            for (const text of texts) {
                await this.extractConceptsFromText(text, extractedConcepts, technicalTerms);
            }
        }
        
        return {
            concepts: Array.from(extractedConcepts),
            technicalTerms: Array.from(technicalTerms),
            dialogueMetrics: {
                exchangeCount: dialogueStructure.exchanges.length,
                totalLength: dialogueStructure.totalLength,
                avgExchangeLength: dialogueStructure.totalLength / Math.max(dialogueStructure.exchanges.length, 1)
            }
        };
    }

    async extractConceptsFromText(text, conceptSet, termSet) {
        if (!this.tokenizer) {
            await this.initializeTokenizer();
            if (!this.tokenizer) return;
        }

        let tokens;
        try {
            tokens = this.tokenizer.tokenize(text);
            if (!tokens || !Array.isArray(tokens)) {
                console.warn('⚠️ tokenizer結果が無効:', typeof tokens);
                return;
            }
        } catch (error) {
            console.warn('⚠️ tokenizer処理エラー:', error.message);
            return;
        }
        
        // 技術用語パターン
        const technicalPatterns = [
            /[A-Z]{2,}/, // 大文字略語
            /\w+API/, // API関連
            /\w+Framework/, // フレームワーク
            /\w+Library/, // ライブラリ
            /-like$/, // ~like技術
            /^AI|ML|DL|CNN|RNN|LSTM|GAN/, // AI/ML用語
            /Database|SQL|NoSQL/, // DB関連
            /JavaScript|Python|Java|C\+\+/, // プログラミング言語
        ];

        // 概念候補抽出
        for (const token of tokens) {
            if (!token || !token.surface_form) {
                continue;
            }
            
            const surface = token.surface_form;
            const partOfSpeech = token.part_of_speech || token.pos || '';
            const features = partOfSpeech ? partOfSpeech.split(',') : ['名詞']; // デフォルトで名詞として扱う
            
            // 技術用語検出
            for (const pattern of technicalPatterns) {
                if (pattern.test(surface)) {
                    termSet.add(surface);
                }
            }
            
            // 概念候補（名詞・専門用語）
            if ((features[0] === '名詞' || features[0] === '') && surface.length >= 2) {
                // 既存概念DBとの関連性チェック
                const relevanceScore = this.calculateConceptRelevance(surface);
                // 技術用語は関連性スコアが低くても採用
                const isImportantTerm = this.isImportantTechnicalTerm(surface);
                
                if (relevanceScore > 0.2 || isImportantTerm) {
                    conceptSet.add({
                        term: surface,
                        category: this.categorizeNewConcept(surface),
                        relevanceScore: Math.max(relevanceScore, isImportantTerm ? 0.5 : 0),
                        frequency: 1,
                        context: text.substring(Math.max(0, text.indexOf(surface) - 20), text.indexOf(surface) + surface.length + 20)
                    });
                }
            }
        }
    }

    /**
     * 重要な技術用語の判定
     */
    isImportantTechnicalTerm(term) {
        const importantTerms = [
            // AI/ML関連
            'AI', 'ML', 'ディープラーニング', '機械学習', '人工知能', 'CNN', 'RNN', 'LSTM', 'GAN',
            // プログラミング関連
            'JavaScript', 'Python', 'Java', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js',
            // システム関連
            'API', 'REST', 'GraphQL', 'データベース', 'SQL', 'NoSQL', 'MongoDB', 'Redis',
            // クラウド関連
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'マイクロサービス',
            // フレームワーク・ライブラリ
            'Express', 'Flask', 'Django', 'Spring', 'TensorFlow', 'PyTorch', 'Scikit-learn',
            // その他技術用語
            'アルゴリズム', 'データ構造', 'オブジェクト指向', '関数型プログラミング', 'DevOps'
        ];
        
        return importantTerms.some(important => 
            term === important || 
            term.includes(important) || 
            important.includes(term)
        );
    }

    /**
     * 新概念の既存DBとの関連性計算
     */
    calculateConceptRelevance(newTerm) {
        let maxRelevance = 0;
        
        // 既存概念との類似性チェック
        const allExistingConcepts = [
            ...(this.conceptDB.concepts?.surface || []),
            ...(this.conceptDB.concepts?.deep || [])
        ];
        
        for (const concept of allExistingConcepts) {
            const conceptName = concept.name || concept;
            const similarity = this.calculateTermSimilarity(newTerm, conceptName);
            maxRelevance = Math.max(maxRelevance, similarity);
        }
        
        return maxRelevance;
    }

    calculateTermSimilarity(term1, term2) {
        // 簡単な類似性計算（部分文字列・共通文字）
        const t1 = term1.toLowerCase();
        const t2 = term2.toLowerCase();
        
        if (t1 === t2) return 1.0;
        if (t1.includes(t2) || t2.includes(t1)) return 0.8;
        
        // 共通文字数ベース
        const common = [...t1].filter(char => t2.includes(char)).length;
        const maxLength = Math.max(t1.length, t2.length);
        
        return common / maxLength;
    }

    categorizeNewConcept(term) {
        const categories = {
            'technology': ['API', 'Framework', 'Library', 'Database', 'AI', 'ML'],
            'programming': ['JavaScript', 'Python', 'Java', 'Function', 'Class'],
            'methodology': ['Method', 'Approach', 'Pattern', 'Design', 'Architecture'],
            'analysis': ['Analysis', 'Detection', 'Recognition', 'Processing']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => term.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    /**
     * 品質フィルタリング
     */
    filterConceptsByQuality(concepts) {
        return concepts.filter(concept => {
            // 品質基準
            const minRelevance = 0.4;
            const minLength = 2;
            const maxLength = 50;
            
            return (
                concept.relevanceScore >= minRelevance &&
                concept.term.length >= minLength &&
                concept.term.length <= maxLength &&
                !this.isNoiseWord(concept.term)
            );
        });
    }

    isNoiseWord(term) {
        const noiseWords = [
            'これ', 'それ', 'あれ', 'ここ', 'そこ', 'あそこ',
            'です', 'である', 'います', 'ありません',
            'the', 'and', 'or', 'but', 'in', 'on', 'at',
            'です。', 'ます。', 'でしょう'
        ];
        
        return noiseWords.includes(term.toLowerCase());
    }

    /**
     * 既存概念DBへの統合
     */
    integrateToConceptDB(validatedConcepts) {
        let integratedCount = 0;
        const integrationResults = {
            new: [],
            updated: [],
            skipped: []
        };

        for (const concept of validatedConcepts) {
            const existingConcept = this.findExistingConcept(concept.term);
            
            if (existingConcept) {
                // 既存概念の更新
                existingConcept.frequency = (existingConcept.frequency || 0) + 1;
                existingConcept.lastSeen = new Date().toISOString();
                integrationResults.updated.push(existingConcept);
            } else {
                // 新概念の追加
                const newConcept = {
                    name: concept.term,
                    category: concept.category,
                    frequency: 1,
                    confidence: concept.relevanceScore,
                    source: 'dialogue-log-learning',
                    createdAt: new Date().toISOString(),
                    relatedConcepts: this.findRelatedConcepts(concept.term)
                };
                
                // 適切なカテゴリに追加
                if (concept.category === 'technology' || concept.relevanceScore > 0.7) {
                    this.conceptDB.concepts.surface.push(newConcept);
                } else {
                    this.conceptDB.concepts.deep.push(newConcept);
                }
                
                integrationResults.new.push(newConcept);
                integratedCount++;
            }
        }

        this.learningStats.integratedConcepts += integratedCount;
        return integrationResults;
    }

    findExistingConcept(term) {
        const allConcepts = [
            ...(this.conceptDB.concepts?.surface || []),
            ...(this.conceptDB.concepts?.deep || [])
        ];
        
        return allConcepts.find(concept => 
            (concept.name || concept) === term ||
            this.calculateTermSimilarity(term, concept.name || concept) > 0.9
        );
    }

    findRelatedConcepts(term) {
        const related = [];
        const allConcepts = [
            ...(this.conceptDB.concepts?.surface || []),
            ...(this.conceptDB.concepts?.deep || [])
        ];
        
        for (const concept of allConcepts) {
            const conceptName = concept.name || concept;
            const similarity = this.calculateTermSimilarity(term, conceptName);
            
            if (similarity > 0.3 && similarity < 0.9) {
                related.push(conceptName);
            }
        }
        
        return related.slice(0, 5); // 最大5個の関連概念
    }

    /**
     * ディレクトリ内の全ログを処理
     */
    async processLogDirectory(directoryPath) {
        console.log(`📁 ログディレクトリ処理開始: ${directoryPath}`);
        
        const results = {
            processedFiles: 0,
            totalConcepts: 0,
            integrationResults: {
                new: [],
                updated: [],
                skipped: []
            }
        };

        try {
            const files = fs.readdirSync(directoryPath);
            const logFiles = files.filter(file => file.endsWith('.txt'));
            
            for (const file of logFiles) {
                const filePath = path.join(directoryPath, file);
                console.log(`📄 処理中: ${file}`);
                
                const result = await this.processLogFile(filePath);
                results.processedFiles++;
                results.totalConcepts += result.concepts.length;
                
                // 統合結果をマージ
                results.integrationResults.new.push(...result.integrationResults.new);
                results.integrationResults.updated.push(...result.integrationResults.updated);
                results.integrationResults.skipped.push(...result.integrationResults.skipped);
            }
            
        } catch (error) {
            console.error('ディレクトリ処理エラー:', error);
        }

        return results;
    }

    /**
     * 単一ログファイルの処理
     */
    async processLogFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const format = this.detectLogFormat(content);
            
            console.log(`📝 フォーマット検出: ${format}`);
            
            const dialogueStructure = this.parseDialogueLog(content, format);
            const extractionResult = await this.extractConceptsFromDialogue(dialogueStructure);
            
            const validatedConcepts = this.filterConceptsByQuality(extractionResult.concepts);
            this.learningStats.qualityFiltered += extractionResult.concepts.length - validatedConcepts.length;
            
            const integrationResults = this.integrateToConceptDB(validatedConcepts);
            
            this.learningStats.processedLogs++;
            this.learningStats.extractedConcepts += extractionResult.concepts.length;
            
            console.log(`✅ ${path.basename(filePath)}: ${validatedConcepts.length}概念抽出, ${integrationResults.new.length}新規統合`);
            
            return {
                file: path.basename(filePath),
                format,
                concepts: validatedConcepts,
                integrationResults,
                metrics: extractionResult.dialogueMetrics
            };
            
        } catch (error) {
            console.error(`ファイル処理エラー (${filePath}):`, error);
            return { error: error.message };
        }
    }

    /**
     * 学習統計の取得
     */
    getLearningStats() {
        return {
            ...this.learningStats,
            conceptDBSize: {
                surface: this.conceptDB.concepts?.surface?.length || 0,
                deep: this.conceptDB.concepts?.deep?.length || 0,
                total: (this.conceptDB.concepts?.surface?.length || 0) + (this.conceptDB.concepts?.deep?.length || 0)
            }
        };
    }

    /**
     * 学習結果の保存
     */
    saveLearningResults(results, outputPath) {
        const learningReport = {
            timestamp: new Date().toISOString(),
            stats: this.getLearningStats(),
            results,
            conceptDB: this.conceptDB
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(learningReport, null, 2));
        console.log(`💾 学習結果保存: ${outputPath}`);
    }
}

export default DialogueLogLearner;