#!/usr/bin/env node
/**
 * PersonalResponseAdapter - Refactored & Integrated
 *
 * 🧠 Phase 6H.2: 個人特化学習エンジン - 応答適応コア実装
 * 🎯 **Refactored**: Focuses solely on providing personal/domain analysis.
 * ✅ **Integrated**: Now uses PersonalDialogueAnalyzer to generate profiles dynamically.
 * 🧹 Removed 20+ unimplemented, stubbed, or deprecated methods.
 */

import { personalDialogueAnalyzer as defaultPersonalDialogueAnalyzer } from '../../analyzers/personal-dialogue-analyzer.js';

export class PersonalResponseAdapter {
    constructor(personalAnalyzer, domainBuilder, personalDialogueAnalyzer = defaultPersonalDialogueAnalyzer) {
        this.personalAnalyzer = personalAnalyzer; // Legacy analyzer (for fallback)
        this.domainBuilder = domainBuilder;
        this.personalDialogueAnalyzer = personalDialogueAnalyzer; // New dynamic analyzer
        
        this.adaptationStats = {
            totalAnalysis: 0,
            successfulAnalysis: 0,
        };
        this.initializeAdaptationEngine();
    }

    initializeAdaptationEngine() {
        this.domainAdaptationRules = {
            technical: { vocabulary: 'technical_terms', examples: 'code_examples', structure: 'step_by_step' },
            business: { vocabulary: 'business_terms', examples: 'case_studies', structure: 'outcome_focused' },
            casual: { vocabulary: 'everyday_language', examples: 'relatable_scenarios', structure: 'conversational' },
            creative: { vocabulary: 'expressive_language', examples: 'creative_analogies', structure: 'inspirational' },
            academic: { vocabulary: 'scholarly_terms', examples: 'research_examples', structure: 'logical_progression' }
        };
        console.log('✅ PersonalResponseAdapter: Refactored engine initialized with Dynamic Analyzer.');
    }

    /**
     * Analyzes the personal context for a given input.
     * This method no longer adapts the response directly. It provides analysis
     * for the EnhancedResponseGenerationEngineV2 to use.
     */
    async analyzePersonalContext(userInput, userProfile, conversationHistory) {
        console.log(`🎯 Personal context analysis started for: "${userInput.substring(0, 50)}..."`);
        this.adaptationStats.totalAnalysis++;

        try {
            const personalProfile = await this.getPersonalProfile(userProfile, conversationHistory);
            const domainContext = await this.analyzeDomainContext(userInput, conversationHistory);

            const adaptationStrength = this.calculateAdaptationStrength(personalProfile, domainContext);

            const analysis = {
                adaptationStrength: adaptationStrength,
                personalFactors: {
                    communicationStyle: personalProfile.communication?.style || 'unknown',
                    learningStyle: personalProfile.learning?.style || 'unknown',
                    verbosity: personalProfile.communication?.verbosity || 'balanced',
                    interactionStyle: personalProfile.communication?.interactionStyle || 'unknown',
                },
                domain: {
                    primary: domainContext.primaryDomain,
                    relevance: domainContext.relevanceScore,
                },
                recommendedAdaptations: this.recommendAdaptations(personalProfile, domainContext),
                profileSource: personalProfile.source,
            };
            
            this.adaptationStats.successfulAnalysis++;
            console.log(`✅ Personal context analysis complete. Source: ${analysis.profileSource}, Strength: ${adaptationStrength.toFixed(2)}`);
            return analysis;

        } catch (error) {
            console.error('❌ Personal context analysis error:', error);
            return {
                adaptationStrength: 0,
                error: error.message,
            };
        }
    }

    /**
     * Fetches or generates a personal profile.
     * Priority Order:
     * 1. Explicitly provided userProfile.
     * 2. Dynamically generated profile from conversationHistory.
     * 3. Fallback to a default, empty profile.
     */
    async getPersonalProfile(userProfile, conversationHistory) {
        // 1. Prioritize explicitly provided userProfile if it's more than a stub.
        if (userProfile && Object.keys(userProfile).length > 1) {
            return { ...userProfile, source: 'explicit' };
        }

        // 2. If analyzer is available and there's history, generate a dynamic profile.
        if (this.personalDialogueAnalyzer && conversationHistory && conversationHistory.length > 0) {
            // The analyzer needs to be robust to different history formats.
            // For now, we assume it can handle the format provided.
            return this.personalDialogueAnalyzer.analyzePersonalDialogues(conversationHistory);
        }

        // 3. Return a default, empty profile as a final fallback.
        return {
            id: 'profile_default',
            source: 'default',
            confidenceScore: 0.0,
            communication: { style: 'balanced', verbosity: 'balanced', interactionStyle: 'unknown' },
            learning: { style: 'adaptive' },
        };
    }

    /**
     * Analyzes the domain context of the input.
     */
    async analyzeDomainContext(input, context) {
        let primaryDomain = 'general';
        let relevanceScore = 0.3; // Start with a lower base score

        if (this.domainBuilder && this.domainBuilder.filterKnowledgeForPersonalization) {
            const filteredKnowledge = this.domainBuilder.filterKnowledgeForPersonalization(input, context);
            for (const [domain, info] of Object.entries(filteredKnowledge)) {
                if (info.relevance > relevanceScore) {
                    primaryDomain = domain;
                    relevanceScore = info.relevance;
                }
            }
        }
        
        return {
            primaryDomain,
            relevanceScore,
            adaptationStrategy: this.domainAdaptationRules[primaryDomain] || this.domainAdaptationRules.casual
        };
    }

    /**
     * Calculates a score representing how much personalization should be applied.
     */
    calculateAdaptationStrength(personalProfile, domainContext) {
        const profileConfidence = personalProfile.confidenceScore || 0.1;
        const domainRelevance = domainContext.relevanceScore || 0.3;
        
        // Weighted average
        return (profileConfidence * 0.6) + (domainRelevance * 0.4); // Give more weight to profile confidence
    }

    /**
     * Recommends adaptation types based on analysis.
     */
    recommendAdaptations(personalProfile, domainContext) {
        const recommendations = [];
        if (domainContext.relevanceScore > 0.6) {
            recommendations.push(`domain:${domainContext.primaryDomain}`);
        }
        if (personalProfile.confidenceScore > 0.5) {
            recommendations.push(`style:${personalProfile.communication?.style || 'balanced'}`);
            recommendations.push(`verbosity:${personalProfile.communication?.verbosity || 'balanced'}`);
        }
        return recommendations;
    }

    /**
     * DialogueAPI互換メソッド (Simplified)
     * This method is now a simple wrapper around analyzePersonalContext.
     */
    async adaptPersonalResponse(baseResponse, userProfile, context = {}) {
        const analysis = await this.analyzePersonalContext(context.userInput || '', userProfile, context.conversationHistory || []);

        return {
            // Return the original response, as this adapter no longer modifies it.
            adaptedResponse: baseResponse, 
            adaptationMetrics: {
                personalityAlignment: analysis.personalFactors ? 1 : 0,
                domainRelevance: analysis.domain?.relevance || 0,
                adaptationStrength: analysis.adaptationStrength || 0,
            },
            appliedAdaptations: analysis.recommendedAdaptations || [],
            confidenceScore: analysis.adaptationStrength, // Use strength as confidence
            error: analysis.error
        };
    }
}

// デフォルトインスタンス
export const personalResponseAdapter = new PersonalResponseAdapter();
