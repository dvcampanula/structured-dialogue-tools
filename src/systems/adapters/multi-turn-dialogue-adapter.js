#!/usr/bin/env node
/**
 * MultiTurnDialogueAdapter - Phase 7H.1統合アダプター
 * 
 * 🔧 既存システムとMultiTurnDialogueManagerの統合層
 * 🎯 互換性保証・段階的統合・エラー処理
 */

import { MultiTurnDialogueManager } from './multi-turn-dialogue-manager.js';

export class MultiTurnDialogueAdapter {
    constructor(existingComponents = {}) {
        // 既存コンポーネントの保存
        this.dialogueFlowController = existingComponents.dialogueFlowController;
        this.personalAnalyzer = existingComponents.personalAnalyzer;
        this.contextTracker = existingComponents.contextTracker;
        
        // マルチターン対話マネージャー初期化
        this.manager = new MultiTurnDialogueManager(
            this.dialogueFlowController,
            this.personalAnalyzer,
            this.contextTracker
        );
        
        // アダプター統計
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            errors: 0,
            fallbackUsed: 0
        };
        
        console.log('✅ MultiTurnDialogueAdapter初期化完了');
    }
    
    /**
     * セッション開始（アダプター経由）
     */
    async startSession(userId, initialInput) {
        this.stats.totalRequests++;
        
        try {
            const result = await this.manager.startSession(userId, initialInput);
            this.stats.successfulRequests++;
            return {
                success: true,
                sessionId: result.sessionId,
                data: result,
                adapterStats: this.getStats()
            };
        } catch (error) {
            this.stats.errors++;
            console.error('🚨 MultiTurnDialogueAdapter セッション開始エラー:', error.message);
            
            // フォールバック処理
            return this.createFallbackSession(userId, initialInput);
        }
    }
    
    /**
     * マルチターン対話処理（アダプター経由）
     */
    async processMultiTurn(sessionId, userInput) {
        this.stats.totalRequests++;
        
        try {
            const result = await this.manager.processMultiTurn(sessionId, userInput);
            this.stats.successfulRequests++;
            return {
                success: true,
                data: result,
                adapterStats: this.getStats()
            };
        } catch (error) {
            this.stats.errors++;
            console.error('🚨 MultiTurnDialogueAdapter 対話処理エラー:', error.message);
            
            // フォールバック処理
            return this.createFallbackResponse(sessionId, userInput);
        }
    }
    
    /**
     * セッション状態取得（アダプター経由）
     */
    async getSessionState(sessionId) {
        try {
            const state = this.manager.getSessionState(sessionId);
            this.stats.successfulRequests++;
            return {
                success: true,
                data: state,
                adapterStats: this.getStats()
            };
        } catch (error) {
            this.stats.errors++;
            console.error('🚨 MultiTurnDialogueAdapter セッション状態取得エラー:', error.message);
            
            return {
                success: false,
                error: 'セッション状態取得失敗',
                fallback: true,
                adapterStats: this.getStats()
            };
        }
    }
    
    /**
     * セッション終了（アダプター経由）
     */
    async endSession(sessionId) {
        try {
            const result = this.manager.endSession(sessionId);
            this.stats.successfulRequests++;
            return {
                success: true,
                data: result,
                adapterStats: this.getStats()
            };
        } catch (error) {
            this.stats.errors++;
            console.error('🚨 MultiTurnDialogueAdapter セッション終了エラー:', error.message);
            
            return {
                success: false,
                error: 'セッション終了失敗',
                sessionId,
                adapterStats: this.getStats()
            };
        }
    }
    
    /**
     * システム統計取得（アダプター経由）
     */
    getSystemStats() {
        try {
            const managerStats = this.manager.getStats();
            return {
                success: true,
                data: {
                    ...managerStats,
                    adapter: this.getStats()
                }
            };
        } catch (error) {
            console.error('🚨 MultiTurnDialogueAdapter システム統計取得エラー:', error.message);
            return {
                success: false,
                error: 'システム統計取得失敗',
                adapter: this.getStats()
            };
        }
    }
    
    /**
     * フォールバックセッション作成
     */
    createFallbackSession(userId, initialInput) {
        this.stats.fallbackUsed++;
        
        const fallbackSessionId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            success: true,
            fallback: true,
            sessionId: fallbackSessionId,
            data: {
                sessionId: fallbackSessionId,
                userId,
                turns: [],
                startTime: new Date(),
                status: 'fallback_active',
                initialInput,
                responseInstruction: this.createFallbackResponseInstruction(initialInput)
            },
            adapterStats: this.getStats()
        };
    }
    
    /**
     * フォールバック応答作成
     */
    createFallbackResponse(sessionId, userInput) {
        this.stats.fallbackUsed++;
        
        return {
            success: true,
            fallback: true,
            data: {
                sessionId,
                responseInstruction: this.createFallbackResponseInstruction(userInput),
                turn: {
                    userInput,
                    timestamp: new Date(),
                    intent: this.classifyBasicIntent(userInput),
                    strategy: 'fallback_assistance'
                }
            },
            adapterStats: this.getStats()
        };
    }
    
    /**
     * フォールバック応答指示作成
     */
    createFallbackResponseInstruction(userInput) {
        const intent = this.classifyBasicIntent(userInput);
        
        const instructionMap = {
            'greeting': 'ユーザーに親しみやすく挨拶を返し、システムが利用可能であることを伝えてください。',
            'question': 'ユーザーの質問に対して、可能な範囲で情報を提供し、必要に応じて詳細を確認してください。',
            'gratitude': 'ユーザーの感謝に対して適切に応答し、今後も支援できることを伝えてください。',
            'testing': 'システムテスト中であることを理解し、協力的にテスト進行を支援してください。',
            'general_inquiry': 'ユーザーの要求を理解し、適切な支援を提供してください。'
        };
        
        return instructionMap[intent] || 'ユーザーに対して親切で丁寧な対応を行い、可能な限り支援を提供してください。';
    }
    
    /**
     * 基本意図分類
     */
    classifyBasicIntent(userInput) {
        const lowerInput = userInput.toLowerCase();
        
        if (lowerInput.includes('こんにちは') || lowerInput.includes('hello')) {
            return 'greeting';
        } else if (lowerInput.includes('?') || lowerInput.includes('？') || lowerInput.includes('何') || lowerInput.includes('どう')) {
            return 'question';
        } else if (lowerInput.includes('ありがとう') || lowerInput.includes('thank')) {
            return 'gratitude';
        } else if (lowerInput.includes('テスト') || lowerInput.includes('test')) {
            return 'testing';
        } else {
            return 'general_inquiry';
        }
    }
    
    /**
     * アダプター統計取得
     */
    getStats() {
        return {
            totalRequests: this.stats.totalRequests,
            successfulRequests: this.stats.successfulRequests,
            errors: this.stats.errors,
            fallbackUsed: this.stats.fallbackUsed,
            successRate: this.stats.totalRequests > 0 ? 
                (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(1) + '%' : '0%',
            fallbackRate: this.stats.totalRequests > 0 ? 
                (this.stats.fallbackUsed / this.stats.totalRequests * 100).toFixed(1) + '%' : '0%'
        };
    }
    
    /**
     * アダプター状態リセット
     */
    reset() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            errors: 0,
            fallbackUsed: 0
        };
        console.log('✅ MultiTurnDialogueAdapter統計リセット完了');
    }
}