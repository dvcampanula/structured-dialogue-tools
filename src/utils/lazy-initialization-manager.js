/**
 * LazyInitializationManager - 遅延初期化管理システム
 * サーバー起動時間最適化のための重要なコンポーネント遅延読み込み
 */

export class LazyInitializationManager {
    constructor() {
        this.components = new Map();
        this.loadingPromises = new Map();
        this.initOrder = [];
        this.initialized = new Set();
        
        console.log('🚀 LazyInitializationManager初期化完了');
    }

    /**
     * コンポーネント登録
     * @param {string} name - コンポーネント名
     * @param {Function} initFunction - 初期化関数
     * @param {string[]} dependencies - 依存関係
     * @param {number} priority - 優先度 (1: 即座, 2: 要求時, 3: バックグラウンド)
     */
    register(name, initFunction, dependencies = [], priority = 2) {
        this.components.set(name, {
            name,
            initFunction,
            dependencies,
            priority,
            instance: null,
            loadTime: null
        });

        // 優先度1は即座に初期化開始
        if (priority === 1) {
            setTimeout(() => this.initialize(name), 0);
        }
    }

    /**
     * コンポーネント初期化
     * @param {string} name - コンポーネント名
     */
    async initialize(name) {
        if (this.initialized.has(name)) {
            return this.components.get(name).instance;
        }

        if (this.loadingPromises.has(name)) {
            return await this.loadingPromises.get(name);
        }

        const component = this.components.get(name);
        if (!component) {
            throw new Error(`コンポーネント '${name}' が登録されていません`);
        }

        const startTime = Date.now();
        
        const loadPromise = this.loadComponent(component, startTime);
        this.loadingPromises.set(name, loadPromise);

        try {
            const instance = await loadPromise;
            this.loadingPromises.delete(name);
            return instance;
        } catch (error) {
            this.loadingPromises.delete(name);
            throw error;
        }
    }

    /**
     * コンポーネント読み込み実行
     */
    async loadComponent(component, startTime) {
        const { name, initFunction, dependencies } = component;

        // 依存関係の解決
        for (const dep of dependencies) {
            await this.initialize(dep);
        }

        console.log(`⏳ ${name} 初期化開始...`);

        try {
            const instance = await initFunction();
            const loadTime = Date.now() - startTime;
            
            component.instance = instance;
            component.loadTime = loadTime;
            this.initialized.add(name);
            
            console.log(`✅ ${name} 初期化完了 (${loadTime}ms)`);
            return instance;
            
        } catch (error) {
            console.error(`❌ ${name} 初期化失敗:`, error.message);
            throw error;
        }
    }

    /**
     * コンポーネント取得
     */
    async get(name) {
        return await this.initialize(name);
    }

    /**
     * 同期的取得（初期化済みのみ）
     */
    getSync(name) {
        const component = this.components.get(name);
        if (!component || !this.initialized.has(name)) {
            return null;
        }
        return component.instance;
    }

    /**
     * バックグラウンド初期化実行
     */
    async initializeBackground() {
        const backgroundComponents = Array.from(this.components.values())
            .filter(comp => comp.priority === 3 && !this.initialized.has(comp.name));

        console.log(`🔄 バックグラウンド初期化開始: ${backgroundComponents.length}件`);

        const initPromises = backgroundComponents.map(comp => 
            this.initialize(comp.name).catch(err => 
                console.warn(`⚠️ バックグラウンド初期化失敗 ${comp.name}:`, err.message)
            )
        );

        await Promise.allSettled(initPromises);
        console.log('✅ バックグラウンド初期化完了');
    }

    /**
     * 初期化統計取得
     */
    getStats() {
        const stats = {
            totalComponents: this.components.size,
            initializedComponents: this.initialized.size,
            pendingComponents: this.loadingPromises.size,
            totalLoadTime: 0,
            componentDetails: []
        };

        for (const [name, component] of this.components) {
            if (component.loadTime) {
                stats.totalLoadTime += component.loadTime;
            }
            
            stats.componentDetails.push({
                name,
                initialized: this.initialized.has(name),
                loadTime: component.loadTime,
                priority: component.priority
            });
        }

        return stats;
    }

    /**
     * コンポーネント状態表示
     */
    logStatus() {
        const stats = this.getStats();
        console.log(`📊 遅延初期化状況: ${stats.initializedComponents}/${stats.totalComponents}件初期化済み`);
        console.log(`⚡ 総読み込み時間: ${stats.totalLoadTime}ms`);
        
        for (const detail of stats.componentDetails) {
            const status = detail.initialized ? '✅' : '⏳';
            const time = detail.loadTime ? `${detail.loadTime}ms` : 'N/A';
            console.log(`  ${status} ${detail.name} (優先度${detail.priority}) - ${time}`);
        }
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        for (const [name, component] of this.components) {
            if (component.instance && typeof component.instance.cleanup === 'function') {
                try {
                    component.instance.cleanup();
                    console.log(`🧹 ${name} クリーンアップ完了`);
                } catch (error) {
                    console.warn(`⚠️ ${name} クリーンアップエラー:`, error.message);
                }
            }
        }
        
        this.components.clear();
        this.loadingPromises.clear();
        this.initialized.clear();
    }
}

// デフォルトインスタンス
export const lazyInitManager = new LazyInitializationManager();