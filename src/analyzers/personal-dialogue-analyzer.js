#!/usr/bin/env node
/**
 * PersonalDialogueAnalyzer - NEW
 *
 * 🧠 Phase 6H.2: 個人特化学習エンジン - 実装
 * 🎯 Analyzes user dialogue logs to generate a dynamic personal profile.
 * 🚀 Fulfills the requirements of the UNIFIED_ROADMAP for Phase 6H.2.
 */

export class PersonalDialogueAnalyzer {
    constructor(options = {}) {
        this.config = {
            minWordFrequency: 2,
            topNWords: 20,
            ...options,
        };
        console.log('✅ PersonalDialogueAnalyzer: Initialized.');
    }

    /**
     * Main method to analyze dialogue logs and generate a personal profile.
     * @param {Array<Object>} dialogueLogs - Array of dialogue objects.
     *   e.g., [{ user: "message1", assistant: "response1" }, ...]
     * @returns {Object} A structured personal profile.
     */
    async analyzePersonalDialogues(dialogueLogs) {
        if (!dialogueLogs || dialogueLogs.length === 0) {
            return this.createDefaultProfile();
        }

        console.log(`🧠 Analyzing ${dialogueLogs.length} dialogue logs...`);

        const stats = this.calculateBasicStats(dialogueLogs);
        const vocabulary = this.extractVocabulary(dialogueLogs);
        const communicationStyle = this.analyzeCommunicationStyle(dialogueLogs, stats);

        const profile = {
            id: `profile_${Date.now()}`,
            version: '1.0.0',
            source: 'dynamic_analysis',
            confidenceScore: this.calculateConfidence(stats),
            statistics: stats,
            vocabulary: vocabulary,
            communication: communicationStyle,
            // Placeholder for future expansion
            emotionalProfile: {},
            domainExpertise: {},
        };

        console.log(`✅ Personal profile generated. Confidence: ${profile.confidenceScore.toFixed(2)}`);
        return profile;
    }

    /**
     * Calculates basic statistics from the logs.
     */
    calculateBasicStats(logs) {
        const stats = {
            totalDialogues: logs.length,
            totalTurns: 0,
            userTurns: 0,
            assistantTurns: 0,
            totalUserChars: 0,
            totalAssistantChars: 0,
            questionCount: 0,
        };

        for (const log of logs) {
            if (log.user) {
                stats.userTurns++;
                stats.totalUserChars += log.user.length;
                if (log.user.includes('?') || log.user.includes('？')) {
                    stats.questionCount++;
                }
            }
            if (log.assistant) {
                stats.assistantTurns++;
                stats.totalAssistantChars += log.assistant.length;
            }
        }
        stats.totalTurns = stats.userTurns + stats.assistantTurns;

        return stats;
    }

    /**
     * Extracts common vocabulary from user messages.
     */
    extractVocabulary(logs) {
        const wordFrequency = new Map();
        const stopWords = new Set(['です', 'ます', 'こと', 'もの', 'それ', 'あれ', 'これ', '私', 'あなた', 'の', 'は', 'が', 'を', 'に', 'で', 'て', 'と', 'も']);

        for (const log of logs) {
            if (!log.user) continue;
            // A simple tokenizer, can be replaced with kuromoji later.
            const words = log.user.split(/[\s,.!?？。、]+/).filter(Boolean);
            for (const word of words) {
                const lowerWord = word.toLowerCase();
                if (lowerWord.length > 1 && !stopWords.has(lowerWord)) {
                    wordFrequency.set(lowerWord, (wordFrequency.get(lowerWord) || 0) + 1);
                }
            }
        }

        const sortedWords = [...wordFrequency.entries()]
            .filter(([, count]) => count >= this.config.minWordFrequency)
            .sort((a, b) => b[1] - a[1]);

        return {
            topWords: sortedWords.slice(0, this.config.topNWords).map(([word, count]) => ({ word, count })),
            uniqueWords: wordFrequency.size,
        };
    }

    /**
     * Analyzes communication style based on metrics.
     */
    analyzeCommunicationStyle(logs, stats) {
        const avgUserLength = stats.userTurns > 0 ? stats.totalUserChars / stats.userTurns : 0;
        const avgAssistantLength = stats.assistantTurns > 0 ? stats.totalAssistantChars / stats.assistantTurns : 0;
        const questionRatio = stats.userTurns > 0 ? stats.questionCount / stats.userTurns : 0;

        let verbosity = 'balanced';
        if (avgUserLength > 150) verbosity = 'verbose';
        if (avgUserLength < 50) verbosity = 'concise';

        let interactionStyle = 'statement_driven';
        if (questionRatio > 0.4) interactionStyle = 'inquisitive';

        return {
            style: 'adaptive', // Default, can be refined
            verbosity: verbosity,
            interactionStyle: interactionStyle,
            metrics: {
                avgUserLength: parseFloat(avgUserLength.toFixed(1)),
                avgAssistantLength: parseFloat(avgAssistantLength.toFixed(1)),
                questionRatio: parseFloat(questionRatio.toFixed(2)),
            },
        };
    }

    /**
     * Calculates a confidence score for the generated profile.
     */
    calculateConfidence(stats) {
        // Confidence increases with more data
        const turnsScore = Math.min(stats.totalTurns / 100, 1.0); // Max score at 100 turns
        const dialoguesScore = Math.min(stats.totalDialogues / 20, 1.0); // Max score at 20 dialogues
        return (turnsScore * 0.7) + (dialoguesScore * 0.3);
    }

    /**
     * Creates a default profile when no logs are available.
     */
    createDefaultProfile() {
        return {
            id: `profile_default_${Date.now()}`,
            version: '1.0.0',
            source: 'default',
            confidenceScore: 0.0,
            statistics: { totalDialogues: 0, totalTurns: 0 },
            vocabulary: { topWords: [], uniqueWords: 0 },
            communication: { style: 'balanced', verbosity: 'balanced', interactionStyle: 'unknown', metrics: {} },
        };
    }
}

// Default instance
export const personalDialogueAnalyzer = new PersonalDialogueAnalyzer();
