#!/usr/bin/env node
/**
 * DynamicResponseTemplateEngine - 動的応答テンプレートエンジン
 * 
 * 🎯 ハードコード応答→動的テンプレート変換
 * 📊 外部設定ファイルベース・構造化応答生成
 * 🔄 パターンマッチング・テンプレート選択・動的生成
 */

import fs from 'fs';
import path from 'path';
import { configLoader } from './config-loader.js';

export class DynamicResponseTemplateEngine {
    constructor() {
        this.templates = new Map();
        this.templateCache = new Map();
        this.templatePath = './src/config/response-templates.json';
        this.initialized = false;
        
        // 非同期初期化を開始
        this.initializeTemplates().then(() => {
            this.initialized = true;
            console.log(`✅ DynamicResponseTemplateEngine初期化完了`);
        }).catch(error => {
            console.error('❌ ResponseTemplateEngine初期化失敗:', error);
            this.initializeDefaultTemplates();
            this.initialized = true;
        });
    }

    /**
     * テンプレート初期化
     */
    async initializeTemplates() {
        try {
            // 外部設定ファイルからテンプレート読み込み
            const config = await this.loadTemplateConfig();
            if (config) {
                this.loadTemplatesFromConfig(config);
            }
            
            console.log(`📚 応答テンプレート読み込み完了: ${this.templates.size}種類`);
            
        } catch (error) {
            console.warn('⚠️ テンプレート初期化エラー:', error.message);
            this.initializeDefaultTemplates();
        }
    }

    /**
     * テンプレート設定ファイル読み込み
     */
    async loadTemplateConfig() {
        try {
            if (fs.existsSync(this.templatePath)) {
                const content = fs.readFileSync(this.templatePath, 'utf8');
                return JSON.parse(content);
            }
            return null;
        } catch (error) {
            console.error('❌ テンプレート設定読み込みエラー:', error.message);
            return null;
        }
    }

    /**
     * 設定からテンプレート読み込み
     */
    loadTemplatesFromConfig(config) {
        for (const [templateType, templateData] of Object.entries(config)) {
            if (templateType === 'version' || templateType === 'description') continue;
            
            this.templates.set(templateType, {
                structure: templateData.structure,
                patterns: templateData.patterns || [],
                lastUsed: Date.now(),
                usageCount: 0
            });
        }
    }

    /**
     * デフォルトテンプレート初期化
     */
    initializeDefaultTemplates() {
        const defaultTemplates = {
            comparison: {
                structure: {
                    intro: "{topic}について{item1}と{item2}を比較いたします。\\n\\n",
                    item1_section: "**{item1}の特徴**\\n{item1_features}\\n\\n",
                    item2_section: "**{item2}の特徴**\\n{item2_features}\\n\\n",
                    conclusion: "**選択指針**\\n{selection_guidance}\\n\\n"
                },
                patterns: []
            },
            explanation: {
                structure: {
                    intro: "{topic}について説明いたします。\\n\\n",
                    overview: "{overview_content}\\n\\n",
                    usage: "{usage_examples}\\n\\n",
                    conclusion: "他にご質問がありましたらお聞かせください。"
                },
                patterns: []
            }
        };

        for (const [type, template] of Object.entries(defaultTemplates)) {
            this.templates.set(type, template);
        }
    }

    /**
     * メッセージに最適なテンプレート検出
     */
    detectTemplateType(message, technicalCategory = null) {
        // 初期化チェック
        if (!this.initialized) {
            console.warn('⚠️ DynamicResponseTemplateEngine未初期化 - デフォルトで継続');
            return { type: 'explanation', confidence: 0.5 };
        }

        let bestMatch = null;
        let maxConfidence = 0;

        // 各テンプレートタイプのパターンマッチング
        for (const [templateType, templateData] of this.templates) {
            for (const pattern of templateData.patterns) {
                const regex = new RegExp(pattern.pattern, 'i');
                if (regex.test(message)) {
                    const confidence = this.calculateTemplateConfidence(message, pattern, technicalCategory);
                    
                    if (confidence > maxConfidence) {
                        maxConfidence = confidence;
                        bestMatch = {
                            type: templateType,
                            pattern: pattern,
                            confidence: confidence
                        };
                    }
                }
            }
        }

        // デフォルトテンプレート選択ロジック
        if (!bestMatch || maxConfidence < 0.6) {
            const defaultType = this.selectDefaultTemplate(message, technicalCategory);
            return {
                type: defaultType,
                confidence: 0.4,
                isDefault: true
            };
        }

        return bestMatch;
    }

    /**
     * テンプレート信頼度計算
     */
    calculateTemplateConfidence(message, pattern, technicalCategory) {
        let confidence = 0.7;

        // パターンマッチの精度
        const patternRegex = new RegExp(pattern.pattern, 'i');
        const matches = message.match(patternRegex);
        if (matches && matches.length > 1) {
            confidence += 0.2;
        }

        // 技術カテゴリとの整合性
        if (technicalCategory && pattern.topic) {
            const categoryMap = {
                'data_science': ['データサイエンス', 'Python', 'R'],
                'database_sql': ['SQL', 'データベース'],
                'deep_learning_ai': ['ディープラーニング', 'TensorFlow', 'PyTorch'],
                'react_javascript': ['React', 'useState']
            };

            const keywords = categoryMap[technicalCategory] || [];
            const hasKeywords = keywords.some(keyword => 
                pattern.topic.includes(keyword)
            );

            if (hasKeywords) {
                confidence += 0.1;
            }
        }

        // メッセージ長による調整
        const lengthFactor = Math.min(message.length / 30, 1.0);
        confidence *= (0.8 + lengthFactor * 0.2);

        return Math.min(confidence, 1.0);
    }

    /**
     * デフォルトテンプレート選択
     */
    selectDefaultTemplate(message, technicalCategory) {
        console.log(`🔍 デフォルトテンプレート選択: メッセージ="${message}", カテゴリ=${technicalCategory}`);
        
        // 比較を示すキーワード
        const comparisonKeywords = ['比較', '違い', 'vs', '対', 'どちら'];
        if (comparisonKeywords.some(keyword => message.includes(keyword))) {
            console.log(`📊 比較テンプレート選択: キーワード検出`);
            return 'comparison';
        }

        // 最適化を示すキーワード  
        const optimizationKeywords = ['最適化', 'パフォーマンス', '高速化', 'チューニング'];
        if (optimizationKeywords.some(keyword => message.includes(keyword))) {
            console.log(`⚡ 最適化テンプレート選択: キーワード検出`);
            return 'optimization';
        }

        // 学習パスを示すキーワード
        const learningKeywords = ['学習', '勉強', '体系的', 'ロードマップ', 'パス'];
        if (learningKeywords.some(keyword => message.includes(keyword))) {
            console.log(`🛤️ 学習パステンプレート選択: キーワード検出`);
            return 'learning_path';
        }

        // トラブルシューティングを示すキーワード
        const troubleKeywords = ['動かない', 'エラー', '問題', '助けて', '困って'];
        if (troubleKeywords.some(keyword => message.includes(keyword))) {
            console.log(`🔧 トラブルシューティングテンプレート選択: キーワード検出`);
            return 'troubleshooting';
        }

        // デフォルトは explanation
        console.log(`📝 説明テンプレート選択: デフォルト`);
        return 'explanation';
    }

    /**
     * 動的応答生成
     */
    async generateResponse(message, templateDetection, technicalCategory = null, userSession = null) {
        const templateType = templateDetection.type;
        const pattern = templateDetection.pattern;

        console.log(`🎨 テンプレート応答生成: タイプ=${templateType}, パターン=${pattern?.pattern || 'デフォルト'}`);

        // テンプレート取得
        const template = this.templates.get(templateType);
        if (!template) {
            console.warn(`⚠️ テンプレートが見つかりません: ${templateType}`);
            return this.generateFallbackResponse(message);
        }

        // パターンデータから応答生成
        if (pattern) {
            return this.generateFromPattern(template, pattern);
        }

        // デフォルトテンプレートから応答生成
        return this.generateFromTemplate(template, message, technicalCategory);
    }

    /**
     * パターンから応答生成
     */
    generateFromPattern(template, pattern) {
        const structure = template.structure;
        let response = "";

        // 構造に従って応答を組み立て
        for (const [key, templatePart] of Object.entries(structure)) {
            let part = templatePart;

            // プレースホルダーを実際の値で置換
            for (const [dataKey, dataValue] of Object.entries(pattern)) {
                if (dataKey === 'pattern') continue;

                const placeholder = `{${dataKey}}`;
                console.log(`🔧 プレースホルダー置換: ${placeholder} = ${typeof dataValue === 'string' ? dataValue : `[配列:${dataValue?.length}要素]`}`);
                
                if (typeof dataValue === 'string') {
                    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
                    part = part.replace(regex, dataValue);
                } else if (Array.isArray(dataValue)) {
                    // 配列の場合は改行で結合
                    const formattedContent = this.formatArrayContent(dataValue, dataKey);
                    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
                    part = part.replace(regex, formattedContent);
                }
            }

            response += part;
        }

        // 使用統計更新
        template.usageCount++;
        template.lastUsed = Date.now();

        // エスケープシーケンスを実際の改行に変換
        response = response.replace(/\\n/g, '\n');

        console.log(`✅ 動的テンプレート応答生成完了: ${response.length}文字`);
        console.log(`📝 応答プレビュー: ${response.substring(0, 100)}...`);

        return response;
    }

    /**
     * 配列コンテンツのフォーマット
     */
    formatArrayContent(content, contextKey) {
        if (!Array.isArray(content) || content.length === 0) {
            return '';
        }

        // オブジェクト配列の場合（技術手順など）
        if (typeof content[0] === 'object') {
            return content.map((item, index) => {
                if (item.title && item.content) {
                    return `${index + 1}. **${item.title}**\n${item.content}\n`;
                } else if (item.title && item.solutions) {
                    return `${index + 1}. **${item.title}**\n${item.solutions.join('\n')}\n`;
                } else if (item.phase && item.content) {
                    return `**${item.phase}**\n${item.content.join('\n')}\n`;
                } else if (item.title && item.code) {
                    return `**${item.title}**\n${item.code}\n`;
                }
                return '';
            }).join('\n');
        } else {
            // 単純な配列の場合（文字列配列）
            return content.join('\n');
        }
    }

    /**
     * テンプレートから応答生成（パターンなし）
     */
    generateFromTemplate(template, message, technicalCategory) {
        // 比較テンプレートの場合、固定データで応答生成
        if (template.structure.item1_section && message.includes('比較')) {
            console.log(`🎨 比較テンプレート（パターンなし）で応答生成開始`);
            
            // データサイエンス Python vs R の場合
            if (message.includes('データサイエンス') && (message.includes('Python') || message.includes('R'))) {
                const data = {
                    topic: 'データサイエンス',
                    item1: 'Python',
                    item2: 'R',
                    item1_features: [
                        '• 汎用性が高く、Web開発からAIまで幅広く使用',
                        '• ライブラリが豊富（pandas, numpy, scikit-learn, TensorFlow）',
                        '• 可読性の高いシンプルな構文',
                        '• 機械学習・深層学習のエコシステムが充実'
                    ],
                    item2_features: [
                        '• 統計解析に特化した言語設計',
                        '• 統計パッケージが非常に豊富（CRAN）',
                        '• データ可視化に優れている（ggplot2）',
                        '• 学術研究での利用が多い'
                    ],
                    selection_guidance: [
                        '• **Python**: 機械学習・AI・大規模システム開発',
                        '• **R**: 統計解析・学術研究・高度な可視化'
                    ]
                };
                
                return this.generateFromPattern(template, data);
            }
        }
        
        // シンプルなテンプレート応答
        const topic = this.extractTopicFromMessage(message, technicalCategory);
        
        let response = template.structure.intro || "ご質問について説明いたします。\\n\\n";
        response = response.replace('{topic}', topic);
        
        response += `${topic}に関する詳細情報をお探しですね。\\n\\n`;
        response += "具体的にどの部分について詳しく知りたいかお聞かせいただければ、より詳細な回答をご提供できます。";

        return response;
    }

    /**
     * メッセージからトピック抽出
     */
    extractTopicFromMessage(message, technicalCategory) {
        // 技術カテゴリからトピック推定
        const categoryTopics = {
            'data_science': 'データサイエンス',
            'database_sql': 'SQL・データベース',
            'deep_learning_ai': 'ディープラーニング・AI',
            'react_javascript': 'React・JavaScript',
            'web_development': 'Web開発',
            'general_programming': 'プログラミング'
        };

        if (technicalCategory && categoryTopics[technicalCategory]) {
            return categoryTopics[technicalCategory];
        }

        // メッセージから技術用語抽出
        const techTerms = ['React', 'JavaScript', 'Python', 'SQL', 'TensorFlow', 'PyTorch', 'データサイエンス'];
        for (const term of techTerms) {
            if (message.includes(term)) {
                return term;
            }
        }

        return '技術的な内容';
    }

    /**
     * フォールバック応答生成
     */
    generateFallbackResponse(message) {
        return "ご質問の内容について詳しく説明いたします。\\n\\n" +
               "具体的にどの部分について知りたいかお聞かせいただければ、" +
               "より詳細で有用な情報をご提供できます。";
    }

    /**
     * テンプレート統計取得
     */
    getTemplateStats() {
        const stats = {
            totalTemplates: this.templates.size,
            mostUsedTemplate: null,
            averageUsage: 0,
            templateTypes: []
        };

        let totalUsage = 0;
        let maxUsage = 0;

        for (const [type, template] of this.templates) {
            const usage = template.usageCount || 0;
            totalUsage += usage;

            if (usage > maxUsage) {
                maxUsage = usage;
                stats.mostUsedTemplate = type;
            }

            stats.templateTypes.push({
                type: type,
                usageCount: usage,
                patterns: template.patterns.length,
                lastUsed: template.lastUsed
            });
        }

        stats.averageUsage = totalUsage / this.templates.size;

        return stats;
    }

    /**
     * 新しいテンプレートパターン学習
     */
    async learnNewPattern(message, templateType, response, isSuccessful) {
        if (!isSuccessful) return;

        console.log(`📚 新テンプレートパターン学習: [${templateType}] "${message}"`);

        // テンプレート設定に新パターンを追加する実装
        // 実際の運用では、管理者承認を経てから追加する仕組みが必要
    }
}

// デフォルトインスタンス
export const dynamicResponseTemplateEngine = new DynamicResponseTemplateEngine();