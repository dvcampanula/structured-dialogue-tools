#!/usr/bin/env node
/**
 * PersonalDialogueAnalyzer - 個人対話パターン抽出・学習システム
 * 
 * 🧠 Phase 6H.2: 個人特化学習エンジンのコア実装
 * 🎯 話し方パターン・語彙選択・応答スタイル学習
 * 🔄 既存DialogueLogLearnerを拡張した個人特化分析
 */

import fs from 'fs';
import path from 'path';
import kuromoji from 'kuromoji';

export class PersonalDialogueAnalyzer {
    constructor(conceptDB, minimalAI) {
        this.conceptDB = conceptDB;
        this.minimalAI = minimalAI;
        this.tokenizer = null;
        this.personalProfile = {
            speechPatterns: {},
            vocabularyPreferences: {},
            responseStyles: {},
            domainKnowledge: {},
            emotionalTendencies: {},
            conversationFlows: {}
        };
        this.analysisStats = {
            processedDialogues: 0,
            extractedPatterns: 0,
            personalityTraits: 0,
            domainMappings: 0
        };
        this.initializeTokenizer();
    }

    async initializeTokenizer() {
        return new Promise((resolve) => {
            kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
                if (err) {
                    console.error('PersonalDialogueAnalyzer: Tokenizer initialization failed:', err);
                    resolve();
                    return;
                }
                this.tokenizer = tokenizer;
                console.log('✅ PersonalDialogueAnalyzer: Kuromoji tokenizer initialized');
                resolve();
            });
        });
    }

    /**
     * 個人対話ログを分析して話し方パターンを抽出
     */
    async analyzePersonalSpeechPatterns(dialogueLogs) {
        console.log(`🧠 個人話し方パターン分析開始: ${dialogueLogs.length}ログ`);
        
        const patterns = {
            sentenceStructures: {},    // 文構造傾向
            vocabularyChoices: {},     // 語彙選択パターン
            formalityLevel: {},        // 敬語・カジュアル度
            emotionalExpression: {},   // 感情表現パターン
            topicTransitions: {}       // 話題転換パターン
        };

        let totalSentences = 0;

        for (const log of dialogueLogs) {
            const userMessages = this.extractUserMessages(log);
            
            for (const message of userMessages) {
                const sentences = this.splitIntoSentences(message);
                totalSentences += sentences.length;

                for (const sentence of sentences) {
                    await this.analyzeSentencePattern(sentence, patterns);
                }
            }
        }

        // パターン正規化・スコア計算
        this.normalizePatterns(patterns, totalSentences);
        this.personalProfile.speechPatterns = patterns;
        this.analysisStats.extractedPatterns = Object.keys(patterns).length;

        console.log(`✅ 話し方パターン分析完了: ${this.analysisStats.extractedPatterns}パターン抽出`);
        return patterns;
    }

    /**
     * 応答好み・スタイル分析
     */
    async extractResponsePreferences(interactions) {
        console.log(`🎯 応答スタイル分析開始: ${interactions.length}インタラクション`);
        
        const preferences = {
            responseLength: { short: 0, medium: 0, long: 0 },
            detailLevel: { minimal: 0, moderate: 0, detailed: 0 },
            tone: { formal: 0, neutral: 0, casual: 0 },
            questioningStyle: { direct: 0, suggestive: 0, exploratory: 0 },
            supportStyle: { analytical: 0, empathetic: 0, practical: 0 }
        };

        for (const interaction of interactions) {
            const response = interaction.response || interaction.aiResponse;
            if (!response) continue;

            // 応答長分析
            this.analyzeResponseLength(response, preferences.responseLength);
            
            // 詳細度分析
            this.analyzeDetailLevel(response, preferences.detailLevel);
            
            // トーン分析
            this.analyzeTone(response, preferences.tone);
            
            // 質問スタイル分析
            this.analyzeQuestioningStyle(response, preferences.questioningStyle);
            
            // サポートスタイル分析
            this.analyzeSupportStyle(response, preferences.supportStyle);
        }

        // 好み正規化
        this.normalizePreferences(preferences);
        this.personalProfile.responseStyles = preferences;

        console.log(`✅ 応答スタイル分析完了`);
        return preferences;
    }

    /**
     * 感情・パーソナリティ傾向分析
     */
    async analyzeEmotionalTendencies(dialogues) {
        console.log(`💭 感情・パーソナリティ分析開始`);
        
        const emotions = {
            positive: 0, negative: 0, neutral: 0,
            excitement: 0, curiosity: 0, caution: 0,
            confidence: 0, uncertainty: 0, politeness: 0
        };

        const personalityTraits = {
            analytical: 0, creative: 0, practical: 0,
            detail_oriented: 0, big_picture: 0,
            technical: 0, non_technical: 0
        };

        for (const dialogue of dialogues) {
            const userText = this.extractUserText(dialogue);
            
            // 感情指標分析
            this.analyzeEmotionalMarkers(userText, emotions);
            
            // パーソナリティ特性分析
            this.analyzePersonalityMarkers(userText, personalityTraits);
        }

        // 傾向正規化
        this.normalizeEmotions(emotions);
        this.normalizePersonality(personalityTraits);

        this.personalProfile.emotionalTendencies = { emotions, personalityTraits };
        this.analysisStats.personalityTraits = Object.keys(personalityTraits).length;

        console.log(`✅ 感情・パーソナリティ分析完了`);
        return this.personalProfile.emotionalTendencies;
    }

    /**
     * 会話フロー・コンテキスト管理パターン分析
     */
    async analyzeConversationFlows(dialogueSequences) {
        console.log(`🔄 会話フローパターン分析開始`);
        
        const flows = {
            topicInitiation: {},      // 話題開始パターン
            topicMaintenance: {},     // 話題継続パターン
            topicTransition: {},      // 話題転換パターン
            contextReferences: {},    // 文脈参照パターン
            questionPatterns: {},     // 質問パターン
            followUpStyles: {}        // フォローアップスタイル
        };

        for (const sequence of dialogueSequences) {
            await this.analyzeDialogueSequence(sequence, flows);
        }

        this.personalProfile.conversationFlows = flows;
        console.log(`✅ 会話フローパターン分析完了`);
        return flows;
    }

    /**
     * 包括的個人プロファイル生成
     */
    generatePersonalProfile() {
        const profile = {
            id: `personal_profile_${Date.now()}`,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            
            // 話し方特性
            communication: {
                speechPatterns: this.personalProfile.speechPatterns,
                responseStyles: this.personalProfile.responseStyles,
                conversationFlows: this.personalProfile.conversationFlows
            },
            
            // 感情・パーソナリティ
            personality: {
                emotionalTendencies: this.personalProfile.emotionalTendencies,
                traits: this.extractDominantTraits(),
                preferences: this.extractCommunicationPreferences()
            },
            
            // ドメイン知識・興味
            knowledge: {
                domainExpertise: this.personalProfile.domainKnowledge,
                interestAreas: this.extractInterestAreas(),
                technicalLevel: this.assessTechnicalLevel()
            },
            
            // 学習統計
            learningStats: this.analysisStats,
            
            // 信頼度スコア
            confidenceScore: this.calculateConfidenceScore()
        };

        return profile;
    }

    // ユーティリティメソッド群
    extractUserMessages(log) {
        // ログからユーザーメッセージを抽出
        if (typeof log === 'string') {
            return [log];
        }
        
        if (log.messages) {
            return log.messages.filter(m => m.role === 'user').map(m => m.content);
        }
        
        if (log.user_message || log.userMessage) {
            return [log.user_message || log.userMessage];
        }
        
        return [log.toString()];
    }

    splitIntoSentences(text) {
        return text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    }

    async analyzeSentencePattern(sentence, patterns) {
        if (!this.tokenizer || sentence.trim().length === 0) return;

        const tokens = this.tokenizer.tokenize(sentence);
        
        // 文構造分析
        this.analyzeSentenceStructure(tokens, patterns.sentenceStructures);
        
        // 語彙選択分析
        this.analyzeVocabularyChoice(tokens, patterns.vocabularyChoices);
        
        // 敬語・形式度分析
        this.analyzeFormalityLevel(tokens, patterns.formalityLevel);
        
        // 感情表現分析
        this.analyzeEmotionalExpression(sentence, patterns.emotionalExpression);
    }

    analyzeSentenceStructure(tokens, structures) {
        const structure = tokens.map(t => t.part_of_speech.split(',')[0]).join('-');
        structures[structure] = (structures[structure] || 0) + 1;
    }

    analyzeVocabularyChoice(tokens, vocabulary) {
        for (const token of tokens) {
            const pos = token.part_of_speech.split(',')[0];
            if (['名詞', '動詞', '形容詞', '副詞'].includes(pos)) {
                vocabulary[token.surface_form] = (vocabulary[token.surface_form] || 0) + 1;
            }
        }
    }

    analyzeFormalityLevel(tokens, formality) {
        let formalCount = 0;
        let casualCount = 0;
        
        for (const token of tokens) {
            const features = token.part_of_speech;
            if (features.includes('敬語') || features.includes('丁寧')) {
                formalCount++;
            } else if (features.includes('口語') || token.surface_form.match(/だ|である|ちゃう|じゃん/)) {
                casualCount++;
            }
        }
        
        if (formalCount > casualCount) {
            formality.formal = (formality.formal || 0) + 1;
        } else if (casualCount > formalCount) {
            formality.casual = (formality.casual || 0) + 1;
        } else {
            formality.neutral = (formality.neutral || 0) + 1;
        }
    }

    analyzeEmotionalExpression(sentence, emotions) {
        // 感情表現パターンマッチング
        const positivePatterns = /嬉しい|楽しい|良い|素晴らしい|最高|ありがとう|感謝/;
        const negativePatterns = /悲しい|つらい|困った|問題|エラー|失敗|ダメ/;
        const excitementPatterns = /！|!|すごい|やった|わー|おー/;
        
        if (positivePatterns.test(sentence)) {
            emotions.positive = (emotions.positive || 0) + 1;
        }
        if (negativePatterns.test(sentence)) {
            emotions.negative = (emotions.negative || 0) + 1;
        }
        if (excitementPatterns.test(sentence)) {
            emotions.excitement = (emotions.excitement || 0) + 1;
        }
    }

    // 正規化・計算メソッド群
    normalizePatterns(patterns, totalSentences) {
        for (const category in patterns) {
            const categoryData = patterns[category];
            for (const pattern in categoryData) {
                categoryData[pattern] = categoryData[pattern] / totalSentences;
            }
        }
    }

    normalizePreferences(preferences) {
        for (const category in preferences) {
            const total = Object.values(preferences[category]).reduce((sum, val) => sum + val, 0);
            if (total > 0) {
                for (const key in preferences[category]) {
                    preferences[category][key] = preferences[category][key] / total;
                }
            }
        }
    }

    calculateConfidenceScore() {
        const stats = this.analysisStats;
        const minSamples = { dialogues: 10, patterns: 5, traits: 3 };
        
        let confidence = 0;
        confidence += Math.min(stats.processedDialogues / minSamples.dialogues, 1) * 0.4;
        confidence += Math.min(stats.extractedPatterns / minSamples.patterns, 1) * 0.3;
        confidence += Math.min(stats.personalityTraits / minSamples.traits, 1) * 0.3;
        
        return Math.round(confidence * 100) / 100;
    }

    // その他の分析メソッド（簡略実装）
    analyzeResponseLength(response, lengthPrefs) {
        const length = response.length;
        if (length < 50) lengthPrefs.short++;
        else if (length < 200) lengthPrefs.medium++;
        else lengthPrefs.long++;
    }

    analyzeDetailLevel(response, detailPrefs) {
        const detailIndicators = response.match(/具体的|詳細|例えば|つまり|詳しく/g);
        if (!detailIndicators) detailPrefs.minimal++;
        else if (detailIndicators.length < 3) detailPrefs.moderate++;
        else detailPrefs.detailed++;
    }

    analyzeTone(response, tonePrefs) {
        if (response.includes('です') || response.includes('ます')) {
            tonePrefs.formal++;
        } else if (response.match(/だ|である|ちゃう|じゃん/)) {
            tonePrefs.casual++;
        } else {
            tonePrefs.neutral++;
        }
    }

    analyzeQuestioningStyle(response, questionPrefs) {
        const questions = response.match(/\?|？/g);
        if (!questions) return;
        
        if (response.includes('どうですか') || response.includes('いかがですか')) {
            questionPrefs.suggestive++;
        } else if (response.includes('なぜ') || response.includes('どのように')) {
            questionPrefs.exploratory++;
        } else {
            questionPrefs.direct++;
        }
    }

    analyzeSupportStyle(response, supportPrefs) {
        if (response.match(/分析|解析|データ|統計|ロジック/)) {
            supportPrefs.analytical++;
        } else if (response.match(/理解|共感|感じ|気持ち|心/)) {
            supportPrefs.empathetic++;
        } else {
            supportPrefs.practical++;
        }
    }

    extractUserText(dialogue) {
        return this.extractUserMessages(dialogue).join(' ');
    }

    analyzeEmotionalMarkers(text, emotions) {
        // 簡略実装 - 実際はより詳細な感情分析
        const positiveWords = ['良い', '嬉しい', '楽しい', 'ありがとう', '素晴らしい'];
        const negativeWords = ['悪い', '困る', '問題', 'エラー', '失敗'];
        
        positiveWords.forEach(word => {
            if (text.includes(word)) emotions.positive++;
        });
        
        negativeWords.forEach(word => {
            if (text.includes(word)) emotions.negative++;
        });
    }

    analyzePersonalityMarkers(text, traits) {
        // 簡略実装 - 実際はより詳細な性格分析
        if (text.match(/分析|データ|統計|詳細/)) traits.analytical++;
        if (text.match(/アイデア|創造|新しい|革新/)) traits.creative++;
        if (text.match(/実用|実際|実装|実行/)) traits.practical++;
        if (text.match(/技術|プログラム|コード|システム/)) traits.technical++;
    }

    normalizeEmotions(emotions) {
        const total = Object.values(emotions).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            for (const key in emotions) {
                emotions[key] = emotions[key] / total;
            }
        }
    }

    normalizePersonality(traits) {
        const total = Object.values(traits).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            for (const key in traits) {
                traits[key] = traits[key] / total;
            }
        }
    }

    extractDominantTraits() {
        const traits = this.personalProfile.emotionalTendencies?.personalityTraits || {};
        return Object.entries(traits)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([trait, score]) => ({ trait, score }));
    }

    extractCommunicationPreferences() {
        const styles = this.personalProfile.responseStyles || {};
        const prefs = {};
        
        for (const category in styles) {
            const categoryData = styles[category];
            const dominant = Object.entries(categoryData)
                .sort(([,a], [,b]) => b - a)[0];
            if (dominant) {
                prefs[category] = dominant[0];
            }
        }
        
        return prefs;
    }

    extractInterestAreas() {
        const vocabulary = this.personalProfile.speechPatterns?.vocabularyChoices || {};
        const techTerms = {};
        const generalTerms = {};
        
        for (const [term, freq] of Object.entries(vocabulary)) {
            if (this.isTechnicalTerm(term)) {
                techTerms[term] = freq;
            } else {
                generalTerms[term] = freq;
            }
        }
        
        return {
            technical: Object.keys(techTerms).slice(0, 10),
            general: Object.keys(generalTerms).slice(0, 10)
        };
    }

    assessTechnicalLevel() {
        const vocabulary = this.personalProfile.speechPatterns?.vocabularyChoices || {};
        let techTermCount = 0;
        let totalTerms = Object.keys(vocabulary).length;
        
        for (const term in vocabulary) {
            if (this.isTechnicalTerm(term)) {
                techTermCount++;
            }
        }
        
        const techRatio = totalTerms > 0 ? techTermCount / totalTerms : 0;
        
        if (techRatio > 0.3) return 'expert';
        if (techRatio > 0.15) return 'intermediate';
        if (techRatio > 0.05) return 'beginner';
        return 'non-technical';
    }

    isTechnicalTerm(term) {
        const techKeywords = [
            'API', 'データベース', 'アルゴリズム', 'フレームワーク', 'ライブラリ',
            'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript',
            'プログラム', 'コード', 'システム', 'サーバー', 'クライアント',
            '実装', '開発', 'デバッグ', 'テスト', 'デプロイ'
        ];
        
        return techKeywords.some(keyword => 
            term.includes(keyword) || keyword.includes(term)
        );
    }

    async analyzeDialogueSequence(sequence, flows) {
        // 簡略実装 - 実際の会話フロー分析
        // 話題転換、文脈参照、質問パターンなどを分析
        for (let i = 0; i < sequence.length - 1; i++) {
            const current = sequence[i];
            const next = sequence[i + 1];
            
            // 話題転換検出
            if (this.detectTopicTransition(current, next)) {
                flows.topicTransition.detected = (flows.topicTransition.detected || 0) + 1;
            }
            
            // 文脈参照検出  
            if (this.detectContextReference(current, next)) {
                flows.contextReferences.used = (flows.contextReferences.used || 0) + 1;
            }
        }
    }

    detectTopicTransition(current, next) {
        // 簡略実装 - 実際の話題転換検出ロジック
        return false;
    }

    detectContextReference(current, next) {
        // 簡略実装 - 実際の文脈参照検出ロジック
        return false;
    }
}