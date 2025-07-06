#!/usr/bin/env node
/**
 * SimpleMultiTurnManager - Phase 7H.1簡略版マルチターン対話システム
 * 
 * 🎯 即座動作可能・最小限依存・実動テスト用
 * 🔧 基本セッション管理・応答生成・統計機能
 */

import fs from 'fs';
import crypto from 'crypto';

export class SimpleMultiTurnManager {
    constructor() {
        // セッション管理
        this.activeSessions = new Map();
        this.sessionCounter = 0;
        
        // 統計情報
        this.stats = {
            totalSessions: 0,
            activeSessions: 0,
            totalTurns: 0,
            averageTurns: 0
        };
        
        // データ保存パス
        this.dataPath = './data/learning/simple-multiturn-sessions.json';
        this.ensureDataDirectory();
        
        console.log('✅ SimpleMultiTurnManager初期化完了');
    }
    
    /**
     * データディレクトリ確保
     */
    ensureDataDirectory() {
        const dir = './data/learning';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    
    /**
     * セッション開始
     */
    startSession(userId = 'default', initialInput = null) {
        const sessionId = crypto.randomUUID();
        
        const session = {
            sessionId,
            userId,
            startTime: new Date(),
            turns: [],
            status: 'active',
            totalTurns: 0
        };
        
        this.activeSessions.set(sessionId, session);
        this.stats.totalSessions++;
        this.stats.activeSessions++;
        this.sessionCounter++;
        
        console.log(`🎬 新規セッション開始: ${sessionId} (ユーザー: ${userId})`);
        
        // 初期入力がある場合は最初のターンとして処理
        if (initialInput) {
            this.processMultiTurn(sessionId, initialInput);
        }
        
        return {
            sessionId,
            status: 'started',
            userId,
            totalSessions: this.stats.totalSessions
        };
    }
    
    /**
     * マルチターン対話処理
     */
    processMultiTurn(sessionId, userInput) {
        const session = this.activeSessions.get(sessionId);
        
        if (!session) {
            throw new Error(`セッション ${sessionId} が見つかりません`);
        }
        
        // ターン情報作成
        const turn = {
            turnNumber: session.turns.length + 1,
            userInput,
            timestamp: new Date(),
            intent: this.classifyIntent(userInput),
            responseGenerated: false
        };
        
        // セッション更新
        session.turns.push(turn);
        session.totalTurns++;
        session.lastActivity = new Date();
        
        this.stats.totalTurns++;
        this.updateAverageTurns();
        
        // 応答指示生成
        const responseInstruction = this.generateResponseInstruction(session, turn);
        
        console.log(`💬 ターン${turn.turnNumber}: ${userInput.substring(0, 50)}...`);
        
        return {
            sessionId,
            turn,
            responseInstruction,
            sessionStats: {
                totalTurns: session.totalTurns,
                sessionDuration: new Date() - session.startTime
            }
        };
    }
    
    /**
     * セッション状態取得
     */
    getSessionState(sessionId) {
        const session = this.activeSessions.get(sessionId);
        
        if (!session) {
            return {
                found: false,
                sessionId
            };
        }
        
        return {
            found: true,
            sessionId,
            userId: session.userId,
            status: session.status,
            totalTurns: session.totalTurns,
            startTime: session.startTime,
            lastActivity: session.lastActivity,
            recentTurns: session.turns.slice(-3) // 最新3ターン
        };
    }
    
    /**
     * セッション終了
     */
    endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        
        if (!session) {
            throw new Error(`セッション ${sessionId} が見つかりません`);
        }
        
        session.status = 'ended';
        session.endTime = new Date();
        session.duration = session.endTime - session.startTime;
        
        // セッションデータ保存
        this.saveSessionData(session);
        
        // アクティブセッションから削除
        this.activeSessions.delete(sessionId);
        this.stats.activeSessions--;
        
        console.log(`🏁 セッション終了: ${sessionId} (${session.totalTurns}ターン)`);
        
        return {
            sessionId,
            totalTurns: session.totalTurns,
            duration: session.duration,
            status: 'ended'
        };
    }
    
    /**
     * システム統計取得
     */
    getSystemStats() {
        return {
            ...this.stats,
            activeSessionIds: Array.from(this.activeSessions.keys()),
            systemUptime: process.uptime(),
            timestamp: new Date()
        };
    }
    
    /**
     * 基本意図分類
     */
    classifyIntent(userInput) {
        const lowerInput = userInput.toLowerCase();
        
        if (lowerInput.includes('こんにちは') || lowerInput.includes('hello')) {
            return 'greeting';
        } else if (lowerInput.includes('?') || lowerInput.includes('？') || lowerInput.includes('何') || lowerInput.includes('どう')) {
            return 'question';
        } else if (lowerInput.includes('ありがとう') || lowerInput.includes('thank')) {
            return 'gratitude';
        } else if (lowerInput.includes('テスト') || lowerInput.includes('test')) {
            return 'testing';
        } else if (lowerInput.includes('終了') || lowerInput.includes('end')) {
            return 'end_request';
        } else {
            return 'general_inquiry';
        }
    }
    
    /**
     * 応答指示生成
     */
    generateResponseInstruction(session, turn) {
        const intent = turn.intent;
        const turnNumber = turn.turnNumber;
        const context = this.buildContext(session);
        
        const baseInstructions = {
            'greeting': 'ユーザーに親しみやすく挨拶を返し、マルチターン対話の開始を歓迎してください。',
            'question': 'ユーザーの質問に対して丁寧に回答し、必要に応じて詳細を確認してください。',
            'gratitude': 'ユーザーの感謝に適切に応答し、継続的な支援を提供できることを伝えてください。',
            'testing': 'システムテスト中であることを理解し、テスト進行に協力的に応答してください。',
            'end_request': 'ユーザーの終了要求を理解し、適切にセッションを締めくくってください。',
            'general_inquiry': 'ユーザーの要求を理解し、適切な支援を提供してください。'
        };
        
        let instruction = baseInstructions[intent] || baseInstructions['general_inquiry'];
        
        // マルチターン文脈の追加
        if (turnNumber > 1) {
            instruction += ` これは${turnNumber}番目のターンです。前の会話内容: ${context}`;
        }
        
        return instruction;
    }
    
    /**
     * 会話文脈構築
     */
    buildContext(session) {
        if (session.turns.length <= 1) {
            return '会話開始';
        }
        
        const recentTurns = session.turns.slice(-2); // 最新2ターン
        return recentTurns.map(turn => 
            `ユーザー: ${turn.userInput.substring(0, 30)}...`
        ).join(' | ');
    }
    
    /**
     * 平均ターン数更新
     */
    updateAverageTurns() {
        if (this.stats.totalSessions > 0) {
            this.stats.averageTurns = (this.stats.totalTurns / this.stats.totalSessions).toFixed(1);
        }
    }
    
    /**
     * セッションデータ保存
     */
    saveSessionData(session) {
        try {
            let allSessions = [];
            
            // 既存データ読み込み
            if (fs.existsSync(this.dataPath)) {
                const data = fs.readFileSync(this.dataPath, 'utf8');
                allSessions = JSON.parse(data);
            }
            
            // 新しいセッション追加
            allSessions.push({
                sessionId: session.sessionId,
                userId: session.userId,
                startTime: session.startTime,
                endTime: session.endTime,
                duration: session.duration,
                totalTurns: session.totalTurns,
                turns: session.turns.map(turn => ({
                    turnNumber: turn.turnNumber,
                    userInput: turn.userInput,
                    intent: turn.intent,
                    timestamp: turn.timestamp
                }))
            });
            
            // ファイル保存
            fs.writeFileSync(this.dataPath, JSON.stringify(allSessions, null, 2));
            console.log(`💾 セッションデータ保存: ${session.sessionId}`);
            
        } catch (error) {
            console.error('⚠️ セッションデータ保存エラー:', error.message);
        }
    }
    
    /**
     * 全セッションクリーンアップ
     */
    cleanup() {
        const now = new Date();
        let cleanedCount = 0;
        
        for (const [sessionId, session] of this.activeSessions) {
            const inactiveTime = now - (session.lastActivity || session.startTime);
            
            // 24時間以上非アクティブなセッションを終了
            if (inactiveTime > 24 * 60 * 60 * 1000) {
                this.endSession(sessionId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 非アクティブセッションクリーンアップ: ${cleanedCount}件`);
        }
    }
}