/**
 * LearningWorkerPool - 学習処理用ワーカープール
 * ログ学習や分析処理を並列化してパフォーマンス向上
 */

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LearningWorkerPool {
    constructor(poolSize = 4) {
        this.poolSize = Math.min(poolSize, os.cpus().length);
        this.workers = [];
        this.taskQueue = [];
        this.runningTasks = new Map();
        this.workerStats = new Map();
        
        this.createWorkerPool();
        console.log(`🔄 LearningWorkerPool初期化完了 (ワーカー数: ${this.poolSize})`);
    }

    /**
     * ワーカープール作成
     */
    createWorkerPool() {
        for (let i = 0; i < this.poolSize; i++) {
            this.createWorker(i);
        }
    }

    /**
     * 個別ワーカー作成
     */
    createWorker(workerId) {
        const workerPath = path.join(__dirname, 'learning-worker.js');
        const worker = new Worker(workerPath, {
            workerData: { workerId }
        });

        const workerInfo = {
            id: workerId,
            worker: worker,
            busy: false,
            tasksCompleted: 0,
            totalProcessingTime: 0
        };

        worker.on('message', (message) => {
            this.handleWorkerMessage(workerId, message);
        });

        worker.on('error', (error) => {
            console.error(`❌ ワーカー${workerId}エラー:`, error.message);
            this.handleWorkerError(workerId, error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.warn(`⚠️ ワーカー${workerId}異常終了: ${code}`);
                this.restartWorker(workerId);
            }
        });

        this.workers[workerId] = workerInfo;
        this.workerStats.set(workerId, {
            startTime: Date.now(),
            tasksCompleted: 0,
            averageTaskTime: 0,
            errorCount: 0
        });
    }

    /**
     * タスク実行
     * @param {string} taskType - タスク種類
     * @param {Object} taskData - タスクデータ
     * @param {Object} options - オプション
     */
    async executeTask(taskType, taskData, options = {}) {
        return new Promise((resolve, reject) => {
            const task = {
                id: this.generateTaskId(),
                type: taskType,
                data: taskData,
                options: options,
                resolve: resolve,
                reject: reject,
                createdAt: Date.now(),
                priority: options.priority || 'normal'
            };

            // 優先度別キューイング
            if (task.priority === 'high') {
                this.taskQueue.unshift(task);
            } else {
                this.taskQueue.push(task);
            }

            this.processNextTask();
        });
    }

    /**
     * 次のタスク処理
     */
    processNextTask() {
        if (this.taskQueue.length === 0) return;

        const availableWorker = this.findAvailableWorker();
        if (!availableWorker) return;

        const task = this.taskQueue.shift();
        this.assignTaskToWorker(availableWorker.id, task);
    }

    /**
     * 利用可能ワーカー検索
     */
    findAvailableWorker() {
        return this.workers.find(worker => worker && !worker.busy);
    }

    /**
     * ワーカーにタスク割り当て
     */
    assignTaskToWorker(workerId, task) {
        const worker = this.workers[workerId];
        if (!worker) return;

        worker.busy = true;
        task.assignedAt = Date.now();
        task.workerId = workerId;
        
        this.runningTasks.set(task.id, task);

        worker.worker.postMessage({
            taskId: task.id,
            type: task.type,
            data: task.data,
            options: task.options
        });

        console.log(`🔄 タスク${task.id} → ワーカー${workerId} (${task.type})`);
    }

    /**
     * ワーカーメッセージ処理
     */
    handleWorkerMessage(workerId, message) {
        const { taskId, success, result, error, processingTime } = message;
        
        const task = this.runningTasks.get(taskId);
        if (!task) return;

        const worker = this.workers[workerId];
        worker.busy = false;
        worker.tasksCompleted++;
        worker.totalProcessingTime += processingTime || 0;

        // 統計更新
        const stats = this.workerStats.get(workerId);
        stats.tasksCompleted++;
        stats.averageTaskTime = worker.totalProcessingTime / worker.tasksCompleted;

        // タスク完了処理
        this.runningTasks.delete(taskId);

        if (success) {
            task.resolve(result);
            console.log(`✅ タスク${taskId}完了 (${processingTime || 0}ms)`);
        } else {
            task.reject(new Error(error || 'Worker task failed'));
            console.error(`❌ タスク${taskId}失敗: ${error}`);
            stats.errorCount++;
        }

        // 次のタスク処理
        this.processNextTask();
    }

    /**
     * ワーカーエラー処理
     */
    handleWorkerError(workerId, error) {
        const stats = this.workerStats.get(workerId);
        stats.errorCount++;

        // 実行中タスクの失敗処理
        for (const [taskId, task] of this.runningTasks) {
            if (task.workerId === workerId) {
                task.reject(new Error(`Worker ${workerId} error: ${error.message}`));
                this.runningTasks.delete(taskId);
            }
        }

        this.restartWorker(workerId);
    }

    /**
     * ワーカー再起動
     */
    restartWorker(workerId) {
        const worker = this.workers[workerId];
        if (worker) {
            worker.worker.terminate();
        }

        setTimeout(() => {
            this.createWorker(workerId);
            console.log(`🔄 ワーカー${workerId}再起動完了`);
        }, 1000);
    }

    /**
     * バッチ処理実行
     * @param {Array} tasks - タスク配列
     * @param {Object} options - オプション
     */
    async executeBatch(tasks, options = {}) {
        const batchPromises = tasks.map(task => 
            this.executeTask(task.type, task.data, {
                ...options,
                priority: task.priority || options.priority
            })
        );

        try {
            const results = await Promise.allSettled(batchPromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            console.log(`📊 バッチ処理完了: 成功${successful}件, 失敗${failed}件`);
            
            return {
                results: results.map(r => r.status === 'fulfilled' ? r.value : null),
                successful,
                failed,
                errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
            };

        } catch (error) {
            console.error('❌ バッチ処理エラー:', error.message);
            throw error;
        }
    }

    /**
     * ストリーミングバッチ処理
     * @param {Array} tasks - タスク配列
     * @param {Function} onProgress - 進捗コールバック
     * @param {Object} options - オプション
     */
    async executeStreamingBatch(tasks, onProgress, options = {}) {
        const totalTasks = tasks.length;
        let completedTasks = 0;
        const results = [];

        for (let i = 0; i < tasks.length; i += this.poolSize) {
            const batch = tasks.slice(i, i + this.poolSize);
            const batchPromises = batch.map(async (task, index) => {
                try {
                    const result = await this.executeTask(task.type, task.data, {
                        ...options,
                        priority: task.priority || options.priority
                    });
                    
                    completedTasks++;
                    const progress = completedTasks / totalTasks;
                    
                    if (onProgress) {
                        onProgress({
                            completed: completedTasks,
                            total: totalTasks,
                            progress: progress,
                            currentBatch: Math.floor(i / this.poolSize) + 1,
                            result: result
                        });
                    }
                    
                    return result;
                } catch (error) {
                    completedTasks++;
                    if (onProgress) {
                        onProgress({
                            completed: completedTasks,
                            total: totalTasks,
                            progress: completedTasks / totalTasks,
                            error: error.message
                        });
                    }
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * プール統計取得
     */
    getPoolStats() {
        const stats = {
            poolSize: this.poolSize,
            activeWorkers: this.workers.filter(w => w && !w.busy).length,
            busyWorkers: this.workers.filter(w => w && w.busy).length,
            queueLength: this.taskQueue.length,
            runningTasks: this.runningTasks.size,
            totalTasksCompleted: 0,
            averageTaskTime: 0,
            workers: []
        };

        for (const [workerId, workerStats] of this.workerStats) {
            const worker = this.workers[workerId];
            if (worker) {
                stats.totalTasksCompleted += workerStats.tasksCompleted;
                stats.workers.push({
                    id: workerId,
                    busy: worker.busy,
                    tasksCompleted: workerStats.tasksCompleted,
                    averageTaskTime: workerStats.averageTaskTime,
                    errorCount: workerStats.errorCount,
                    uptime: Date.now() - workerStats.startTime
                });
            }
        }

        if (stats.workers.length > 0) {
            stats.averageTaskTime = stats.workers.reduce((sum, w) => sum + w.averageTaskTime, 0) / stats.workers.length;
        }

        return stats;
    }

    /**
     * タスクキュー状況取得
     */
    getQueueStatus() {
        return {
            queueLength: this.taskQueue.length,
            runningTasks: this.runningTasks.size,
            tasksByType: this.getTasksByType(),
            tasksByPriority: this.getTasksByPriority(),
            oldestQueuedTask: this.taskQueue.length > 0 ? Date.now() - this.taskQueue[0].createdAt : 0
        };
    }

    /**
     * タスクタイプ別集計
     */
    getTasksByType() {
        const typeCount = {};
        
        for (const task of this.taskQueue) {
            typeCount[task.type] = (typeCount[task.type] || 0) + 1;
        }
        
        for (const task of this.runningTasks.values()) {
            typeCount[task.type] = (typeCount[task.type] || 0) + 1;
        }
        
        return typeCount;
    }

    /**
     * 優先度別集計
     */
    getTasksByPriority() {
        const priorityCount = {};
        
        for (const task of this.taskQueue) {
            priorityCount[task.priority] = (priorityCount[task.priority] || 0) + 1;
        }
        
        return priorityCount;
    }

    /**
     * タスクID生成
     */
    generateTaskId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * プールシャットダウン
     */
    async shutdown() {
        console.log('🔄 ワーカープールシャットダウン開始...');
        
        // キューをクリア
        for (const task of this.taskQueue) {
            task.reject(new Error('Worker pool shutting down'));
        }
        this.taskQueue = [];
        
        // 実行中タスクの完了を待機
        const runningTaskPromises = Array.from(this.runningTasks.values()).map(task => 
            new Promise(resolve => {
                const originalResolve = task.resolve;
                const originalReject = task.reject;
                task.resolve = (...args) => { originalResolve(...args); resolve(); };
                task.reject = (...args) => { originalReject(...args); resolve(); };
            })
        );
        
        await Promise.allSettled(runningTaskPromises);
        
        // 全ワーカー終了
        const terminationPromises = this.workers.map(worker => {
            if (worker) {
                return worker.worker.terminate();
            }
        });
        
        await Promise.all(terminationPromises);
        console.log('✅ ワーカープールシャットダウン完了');
    }
}

// デフォルトインスタンス
export const learningWorkerPool = new LearningWorkerPool();