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
import { EnhancedHybridLanguageProcessor } from '../processing/enhanced-hybrid-processor.js';

export class DialogueLogLearner {
    constructor(conceptDB, minimalAI) {
        this.conceptDB = conceptDB;
        this.minimalAI = minimalAI;
        this.languageProcessor = null;
        this.learningStats = {
            processedLogs: 0,
            extractedConcepts: 0,
            integratedConcepts: 0,
            qualityFiltered: 0
        };
        this.initializeLanguageProcessor();
    }

    async initializeLanguageProcessor() {
        this.languageProcessor = new EnhancedHybridLanguageProcessor();
        await this.languageProcessor.initialize();
        console.log('📝 EnhancedHybridLanguageProcessor初期化完了');
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
                // 1. N-gram複合語認識による動的フレーズ抽出
                await this.extractCompoundConcepts(text, extractedConcepts, technicalTerms);
                
                // 2. EnhancedHybridLanguageProcessorによる拡張抽出
                const analysisResult = await this.languageProcessor.processText(text, {
                    enableMeCab: true,
                    enableSimilarity: true,
                    enableSemanticSimilarity: true,
                    enableGrouping: true,
                    enableRelationshipOptimization: false
                });

                if (analysisResult && analysisResult.enhancedTerms && Array.isArray(analysisResult.enhancedTerms)) {
                    for (const termInfo of analysisResult.enhancedTerms) {
                        const term = termInfo.term;
                        // 概念候補（名詞・専門用語）
                        if (term.length >= 2) {
                            // 既に完全フレーズとして抽出されていないかチェック
                            const alreadyExtracted = Array.from(extractedConcepts).some(c => c.term === term);
                            if (!alreadyExtracted) {
                                const relevanceScore = this.calculateConceptRelevance(term);
                                const isImportant = this.isImportantTechnicalTerm(term);
                                
                                extractedConcepts.add({
                                    term: term,
                                    category: this.categorizeNewConcept(term),
                                    relevanceScore: Math.max(relevanceScore, isImportant ? 0.5 : 0),
                                    frequency: 1,
                                    context: text.substring(Math.max(0, text.indexOf(term) - 20), text.indexOf(term) + term.length + 20)
                                });
                                if (isImportant) {
                                    technicalTerms.add(term);
                                }
                            }
                        }
                    }
                }
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
        let analysisResult;
        try {
            analysisResult = await this.languageProcessor.processText(text, {
                enableMeCab: true,
                enableSimilarity: true,
                enableSemanticSimilarity: true,
                enableGrouping: true
            });
            console.log(`[extractConceptsFromText] languageProcessor analysisResult:`, analysisResult);
            if (!analysisResult || !analysisResult.tokens || !Array.isArray(analysisResult.tokens)) {
                console.warn('⚠️ languageProcessor結果が無効:', typeof analysisResult);
                return;
            }
        } catch (error) {
            console.warn('⚠️ languageProcessor処理エラー:', error.message);
            return;
        }
        
        const tokens = analysisResult.tokens;
        console.log(`[extractConceptsFromText] Tokens:`, tokens);
        
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
     * N-gram複合語認識による動的概念抽出
     */
    async extractCompoundConcepts(text, extractedConcepts, technicalTerms) {
        // 1. 形態素解析で単語を取得
        const analysisResult = await this.languageProcessor.processText(text, {
            enableMeCab: true,
            enableSimilarity: false,
            enableSemanticSimilarity: false,
            enableGrouping: false
        });
        
        if (!analysisResult || !analysisResult.mecabAnalysis || !analysisResult.mecabAnalysis.tokens) {
            console.warn('⚠️ MeCab解析トークンが見つかりません。複合語抽出をスキップします。');
            return;
        }
        
        const tokens = analysisResult.mecabAnalysis.tokens;
        
        // 2. 連続する名詞の組み合わせを生成（N-gram分析）
        await this.generateNounCompounds(tokens, text, extractedConcepts, technicalTerms);
        
        // 3. 意味的結合パターンの検出
        await this.detectSemanticCompounds(tokens, text, extractedConcepts, technicalTerms);
    }

    /**
     * 連続する名詞の複合語生成（N-gram分析）
     */
    async generateNounCompounds(tokens, originalText, extractedConcepts, technicalTerms) {
        const nounSequences = [];
        let currentSequence = [];
        
        for (const token of tokens) {
            const pos = token.pos || token.part_of_speech || '';
            const surface = token.surface_form || token.surface || '';
            
            // 名詞または名詞に準じるもの
            if (this.isNounLike(pos) && surface.length > 0) {
                currentSequence.push({
                    surface,
                    pos,
                    position: token.word_position || 0
                });
            } else {
                // 名詞の連続が終了
                if (currentSequence.length >= 2) {
                    nounSequences.push([...currentSequence]);
                }
                currentSequence = [];
            }
        }
        
        // 最後の連続も処理
        if (currentSequence.length >= 2) {
            nounSequences.push([...currentSequence]);
        }
        
        // 2-gram, 3-gram, 4-gramの複合語を生成
        for (const sequence of nounSequences) {
            for (let n = 2; n <= Math.min(4, sequence.length); n++) {
                for (let i = 0; i <= sequence.length - n; i++) {
                    const compound = sequence.slice(i, i + n);
                    const compoundTerm = compound.map(t => t.surface).join('');
                    
                    // 複合語の品質チェック
                    if (this.isValidCompound(compoundTerm, compound)) {
                        const alreadyExtracted = Array.from(extractedConcepts).some(c => c.term === compoundTerm);
                        if (!alreadyExtracted) {
                            const relevanceScore = this.calculateCompoundRelevance(compoundTerm, compound.length);
                            
                            extractedConcepts.add({
                                term: compoundTerm,
                                category: this.categorizeNewConcept(compoundTerm),
                                relevanceScore,
                                frequency: 1,
                                context: this.extractContext(originalText, compoundTerm),
                                extractionMethod: `${n}gram_compound`,
                                wordCount: n
                            });
                            
                            console.log(`🔗 ${n}-gram複合語抽出: "${compoundTerm}"`);
                        }
                    }
                }
            }
        }
    }

    /**
     * 名詞的性質の判定
     */
    isNounLike(pos) {
        const features = pos.split(',');
        if (features[0] === '記号') {
            return false;
        }
        return features[0] === '名詞' ||
               features.includes('固有名詞') ||
               features.includes('サ変接続') ||
               pos === '';
    }

    /**
     * 複合語の品質チェック
     */
    isValidCompound(compoundTerm, compound) {
        // 基本的な品質基準
        if (compoundTerm.length < 3 || compoundTerm.length > 20) {
            return false;
        }
        
        // 不適切な文字・記号で開始/終了する語句を除外
        if (/^[、。！？は「」・\s]|[、。！？「」・\s]$/.test(compoundTerm)) {
            return false;
        }
        
        // 助詞・助動詞のみの組み合わせを除外
        if (/^(は|を|に|が|の|で|と|や|から|まで|より|です|である|ます|だ|な|て)+$/.test(compoundTerm)) {
            return false;
        }
        
        // ひらがなのみの複合語は除外
        if (/^[ひらがな]*$/.test(compoundTerm)) {
            return false;
        }
        
        // 単一文字の繰り返しを除外
        if (/^(.)\1+$/.test(compoundTerm)) {
            return false;
        }
        
        // 高品質パターンの検出
        return this.hasHighQualityPattern(compoundTerm);
    }

    /**
     * 高品質パターンの検出
     */
    hasHighQualityPattern(term) {
        const highQualityPatterns = [
            // 技術・学術系キーワード
            /.*革命/, /.*向上/, /.*効率/, /.*最適化/, /.*改善/,
            /.*システム/, /.*アルゴリズム/, /.*手法/, /.*理論/,
            /.*問題/, /.*解決/, /.*分析/, /.*処理/, /.*開発/,
            // 複合技術用語
            /.*時間.*/, /.*生産.*/, /.*計算.*/,
            // カタカナ複合語（技術用語の可能性が高い）
            /.*アプローチ/, /.*フレームワーク/, /.*ライブラリ/
        ];
        
        return highQualityPatterns.some(pattern => pattern.test(term));
    }

    /**
     * 複合語の関連度計算
     */
    calculateCompoundRelevance(compoundTerm, wordCount) {
        let baseScore = 0.6;
        
        // 語数による調整（長いほど概念として価値が高い）
        baseScore += (wordCount - 2) * 0.1;
        
        // 高品質パターンボーナス
        if (this.hasHighQualityPattern(compoundTerm)) {
            baseScore += 0.2;
        }
        
        // 既存概念との関連性
        const existingRelevance = this.calculateConceptRelevance(compoundTerm);
        baseScore = Math.max(baseScore, existingRelevance);
        
        return Math.min(baseScore, 0.95);
    }

    /**
     * 意味的結合パターンの検出
     */
    async detectSemanticCompounds(tokens, originalText, extractedConcepts, technicalTerms) {
        // 形容詞+名詞、動詞+名詞などの意味的結合を検出
        for (let i = 0; i < tokens.length - 1; i++) {
            const current = tokens[i];
            const next = tokens[i + 1];
            
            const currentPos = current.pos || '';
            const nextPos = next.pos || '';
            const currentSurface = current.surface_form || '';
            const nextSurface = next.surface_form || '';
            
            // 形容詞+名詞の組み合わせ
            if (currentPos.includes('形容詞') && this.isNounLike(nextPos)) {
                const compound = currentSurface + nextSurface;
                if (compound.length >= 3 && this.hasHighQualityPattern(compound)) {
                    const alreadyExtracted = Array.from(extractedConcepts).some(c => c.term === compound);
                    if (!alreadyExtracted) {
                        extractedConcepts.add({
                            term: compound,
                            category: this.categorizeNewConcept(compound),
                            relevanceScore: 0.7,
                            frequency: 1,
                            context: this.extractContext(originalText, compound),
                            extractionMethod: 'semantic_compound'
                        });
                        
                        console.log(`🎯 意味的複合語抽出: "${compound}"`);
                    }
                }
            }
        }
    }

    /**
     * コンテキスト抽出
     */
    extractContext(text, term) {
        const index = text.indexOf(term);
        if (index === -1) return '';
        
        return text.substring(
            Math.max(0, index - 30),
            Math.min(text.length, index + term.length + 30)
        );
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
                this.conceptDB.totalConcepts++; // 新しい概念が追加されたときにカウントを増やす
                integrationResults.new.push(newConcept);
                integratedCount++;
            }
        }

        this.learningStats.integratedConcepts += integratedCount;

        // MinimalAICoreのconceptDBを更新
        this.minimalAI.updateConceptDB(this.conceptDB);

        // 学習済み概念の永続化保存
        this.saveConceptDB();

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
                metrics: extractionResult.dialogueMetrics,
                success: true
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
     * 概念DBの永続化保存
     */
    saveConceptDB() {
        try {
            const conceptDBPath = path.join(process.cwd(), 'data', 'learning', 'concept-analysis-db.json');
            
            // 既存のDBを読み込み
            let existingDB = {};
            if (fs.existsSync(conceptDBPath)) {
                existingDB = JSON.parse(fs.readFileSync(conceptDBPath, 'utf-8'));
            }
            
            // 現在の概念DBの内容を統合
            const mergedDB = {
                ...existingDB,
                lastUpdated: new Date().toISOString(),
                totalConcepts: this.conceptDB.totalConcepts,
                concepts: this.conceptDB.concepts,
                patterns: this.conceptDB.patterns || [],
                personalLearning: this.conceptDB.personalLearning || []
            };
            
            fs.writeFileSync(conceptDBPath, JSON.stringify(mergedDB, null, 2));
            console.log(`💾 概念DB保存完了: ${this.conceptDB.totalConcepts}個の概念`);
        } catch (error) {
            console.error('概念DB保存エラー:', error.message);
        }
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