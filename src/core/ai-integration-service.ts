/**
 * AI Integration Service - 統合AI分析サービス
 * Phase 5: プロンプト最適化・マルチAI比較・自動分析システム
 */

import { AIProviderManager, AIRequest, AIResponse } from './ai-provider-manager.js';
import { OpenAIProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { IntelligentConceptExtractor } from './intelligent-concept-extractor.js';

export interface AIAnalysisRequest {
  logContent: string;
  analysisType: 'concept-extraction' | 'quality-assessment' | 'continuation-suggestion' | 'comparative-analysis';
  providers?: string[];
  options?: {
    temperature?: number;
    maxTokens?: number;
    includeMetadata?: boolean;
    compareResults?: boolean;
  };
}

export interface AIAnalysisResult {
  analysisType: string;
  results: AIResponse[];
  comparison?: {
    bestResult: string;
    similarities: string[];
    differences: string[];
    consensusPoints: string[];
  };
  processingTime: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[];
  optimizedFor: string[];
}

export class AIIntegrationService {
  private providerManager: AIProviderManager;
  private conceptExtractor: IntelligentConceptExtractor;
  private promptTemplates: Map<string, PromptTemplate> = new Map();
  private analysisHistory: AIAnalysisResult[] = [];

  constructor(conceptExtractor: IntelligentConceptExtractor) {
    this.providerManager = new AIProviderManager();
    this.conceptExtractor = conceptExtractor;
    this.initializePromptTemplates();
    console.log('🧠 AI Integration Service initializing...');
  }

  async initialize(): Promise<boolean> {
    try {
      // OpenAI プロバイダーの初期化
      if (process.env.OPENAI_API_KEY) {
        const openaiProvider = new OpenAIProvider();
        const openaiConfig = {
          name: 'openai' as const,
          displayName: 'OpenAI GPT',
          apiEndpoint: 'https://api.openai.com/v1/chat/completions',
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4',
          capabilities: [
            { type: 'text-generation' as const, description: 'Text generation', supported: true },
            { type: 'conversation' as const, description: 'Conversation', supported: true },
            { type: 'analysis' as const, description: 'Analysis', supported: true },
            { type: 'concept-extraction' as const, description: 'Concept extraction', supported: true }
          ],
          limits: { maxTokens: 4000, rateLimitRpm: 60 }
        };

        await this.providerManager.registerProvider(openaiProvider, openaiConfig);
      }

      // Anthropic プロバイダーの初期化
      if (process.env.ANTHROPIC_API_KEY) {
        const anthropicProvider = new AnthropicProvider();
        const anthropicConfig = {
          name: 'anthropic' as const,
          displayName: 'Anthropic Claude',
          apiEndpoint: 'https://api.anthropic.com/v1/messages',
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-3-sonnet-20240229',
          capabilities: [
            { type: 'text-generation' as const, description: 'Text generation', supported: true },
            { type: 'conversation' as const, description: 'Conversation', supported: true },
            { type: 'analysis' as const, description: 'Analysis', supported: true },
            { type: 'concept-extraction' as const, description: 'Concept extraction', supported: true }
          ],
          limits: { maxTokens: 4000, rateLimitRpm: 50 }
        };

        await this.providerManager.registerProvider(anthropicProvider, anthropicConfig);
      }

      const availableProviders = this.providerManager.getAvailableProviders();
      console.log(`✅ AI Integration Service initialized with providers: ${availableProviders.join(', ')}`);
      
      return availableProviders.length > 0;
    } catch (error) {
      console.error('❌ AI Integration Service initialization failed:', error);
      return false;
    }
  }

  private initializePromptTemplates(): void {
    const templates: PromptTemplate[] = [
      {
        name: 'structured-dialogue-analysis',
        description: '構造的対話の包括的分析',
        template: `
構造的対話分析専門家として、以下の対話ログを多角的に分析してください。

対話ログ:
{{logContent}}

分析観点:
1. **革新的概念**: 新しく出現した概念・アイデアの特定
2. **構造感染**: 思考パターンや構造の伝播・影響
3. **転換点**: 対話の方向性や深度が変化した重要な瞬間
4. **創発性**: 対話プロセスから生まれた予期しない洞察
5. **継続可能性**: さらなる発展・深化の可能性

JSON形式で構造化された分析結果を返してください。
`,
        variables: ['logContent'],
        optimizedFor: ['anthropic', 'openai']
      },
      {
        name: 'concept-extraction-focused',
        description: '概念抽出に特化した分析',
        template: `
以下の対話ログから重要な概念を体系的に抽出してください。

対話内容:
{{logContent}}

抽出基準:
- 革新度: 新規性・独創性の高い概念
- 重要度: 対話全体への影響・波及効果
- 具体性: 実装・応用可能な概念
- 抽象性: 汎用性・応用範囲が広い概念

結果をJSON形式で返し、各概念に1-10の革新度スコアを付けてください。
`,
        variables: ['logContent'],
        optimizedFor: ['openai', 'anthropic']
      },
      {
        name: 'quality-assessment-detailed',
        description: '詳細な品質評価',
        template: `
構造的対話品質評価専門家として、以下の対話を多面的に評価してください。

対話内容:
{{logContent}}

評価項目 (各1-10点):
1. 革新度: 新しいアイデア・概念の創出
2. 一貫性: 論理的整合性・テーマの統一性
3. 深度: 思考の深さ・掘り下げの程度
4. 実用性: 実際の応用・実装可能性
5. 創発性: 予期しない洞察・発見の生成
6. 構造性: 対話構造の明確さ・組織化

各項目について具体的な根拠と改善提案を含めて評価してください。
`,
        variables: ['logContent'],
        optimizedFor: ['anthropic', 'openai']
      }
    ];

    templates.forEach(template => {
      this.promptTemplates.set(template.name, template);
    });
  }

  async analyzeDialogue(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const providers = request.providers || this.providerManager.getAvailableProviders();
      
      if (providers.length === 0) {
        throw new Error('No AI providers available');
      }

      // プロンプト最適化
      const optimizedPrompts = this.optimizePromptsForProviders(
        request.logContent, 
        request.analysisType, 
        providers
      );

      // 各プロバイダーで分析実行
      const results: AIResponse[] = [];
      
      for (const provider of providers) {
        try {
          const prompt = optimizedPrompts[provider] || optimizedPrompts['default'];
          const aiRequest: AIRequest = {
            prompt,
            systemPrompt: this.getSystemPrompt(request.analysisType),
            maxTokens: request.options?.maxTokens || 2000,
            temperature: request.options?.temperature || 0.3
          };

          const response = await this.providerManager.generateResponse(aiRequest, provider);
          results.push(response);
        } catch (error) {
          console.error(`Provider ${provider} failed:`, error);
          results.push({
            content: `Error: ${error}`,
            provider,
            model: 'unknown',
            processingTime: 0,
            timestamp: new Date().toISOString()
          });
        }
      }

      // 結果比較・統合
      const comparison = request.options?.compareResults && results.length > 1 
        ? this.compareResults(results) 
        : undefined;

      const analysisResult: AIAnalysisResult = {
        analysisType: request.analysisType,
        results,
        comparison,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          providersUsed: providers,
          promptsOptimized: Object.keys(optimizedPrompts),
          logLength: request.logContent.length
        }
      };

      // 履歴に保存
      this.analysisHistory.push(analysisResult);
      if (this.analysisHistory.length > 100) {
        this.analysisHistory = this.analysisHistory.slice(-50);
      }

      return analysisResult;

    } catch (error) {
      throw new Error(`AI analysis failed: ${error}`);
    }
  }

  private optimizePromptsForProviders(
    logContent: string, 
    analysisType: string, 
    providers: string[]
  ): Record<string, string> {
    const prompts: Record<string, string> = {};

    for (const provider of providers) {
      if (provider === 'openai') {
        const openaiProvider = new OpenAIProvider();
        prompts[provider] = openaiProvider.generateStructuredDialoguePrompt(logContent, analysisType);
      } else if (provider === 'anthropic') {
        const anthropicProvider = new AnthropicProvider();
        prompts[provider] = anthropicProvider.generateStructuredDialoguePrompt(logContent, analysisType);
      } else {
        // デフォルトプロンプト
        prompts[provider] = this.generateDefaultPrompt(logContent, analysisType);
      }
    }

    prompts['default'] = this.generateDefaultPrompt(logContent, analysisType);
    return prompts;
  }

  private generateDefaultPrompt(logContent: string, analysisType: string): string {
    const template = this.promptTemplates.get(`${analysisType}-focused`) || 
                    this.promptTemplates.get('structured-dialogue-analysis');
    
    if (template) {
      return template.template.replace('{{logContent}}', logContent);
    }

    return `Analyze the following dialogue log for ${analysisType}:\n\n${logContent}`;
  }

  private getSystemPrompt(analysisType: string): string {
    const systemPrompts = {
      'concept-extraction': 'あなたは構造的対話の概念抽出専門家です。重要な概念を体系的に特定し、革新度を評価してください。',
      'quality-assessment': 'あなたは対話品質評価の専門家です。多面的な観点から対話の価値と改善点を評価してください。',
      'continuation-suggestion': 'あなたは構造的対話継続の専門家です。対話をさらに深化・発展させる具体的な方向性を提案してください。',
      'comparative-analysis': 'あなたは比較分析の専門家です。複数の対話や概念を比較し、共通点・相違点・関連性を明確にしてください。'
    };

    return systemPrompts[analysisType as keyof typeof systemPrompts] || 
           'あなたは構造的対話分析の専門家です。提供された内容を詳細に分析してください。';
  }

  private compareResults(results: AIResponse[]): any {
    if (results.length < 2) return null;

    // 結果の内容を分析して比較
    const contents = results.map(r => r.content);
    
    return {
      bestResult: this.selectBestResult(results),
      similarities: this.findSimilarities(contents),
      differences: this.findDifferences(contents),
      consensusPoints: this.findConsensus(contents)
    };
  }

  private selectBestResult(results: AIResponse[]): string {
    // 最も長い応答を選択（より詳細と仮定）
    return results.reduce((best, current) => 
      current.content.length > best.content.length ? current : best
    ).provider;
  }

  private findSimilarities(contents: string[]): string[] {
    // 簡単な類似性検出（実際の実装ではより高度な分析が必要）
    return ['共通のキーワードや概念が確認されました'];
  }

  private findDifferences(contents: string[]): string[] {
    return ['各AIプロバイダーによる異なる視点や解釈が見られます'];
  }

  private findConsensus(contents: string[]): string[] {
    return ['複数のAIが共通して指摘した要点があります'];
  }

  getAnalysisHistory(): AIAnalysisResult[] {
    return [...this.analysisHistory];
  }

  getProviderStats(): Record<string, any> {
    return this.providerManager.getProviderStats();
  }

  getAvailableProviders(): string[] {
    return this.providerManager.getAvailableProviders();
  }
}