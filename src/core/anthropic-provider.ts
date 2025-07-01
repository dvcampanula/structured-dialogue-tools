/**
 * Anthropic Provider - Claude API統合実装
 * Phase 5: Anthropic Claude統合システム
 */

import { 
  AIProviderInterface, 
  AIProviderConfig, 
  AIRequest, 
  AIResponse, 
  AICapability 
} from './ai-provider-manager.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  system?: string;
  top_p?: number;
  top_k?: number;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: null | string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider implements AIProviderInterface {
  name = 'anthropic';
  private config?: AIProviderConfig;
  private isInitialized = false;
  private usageStats = {
    totalRequests: 0,
    totalTokens: 0,
    averageResponseTime: 0,
    errorCount: 0,
    lastUsed: null as string | null
  };

  async initialize(config: AIProviderConfig): Promise<boolean> {
    try {
      this.config = config;
      
      if (!config.apiKey) {
        console.error('❌ Anthropic API key not provided');
        return false;
      }

      // テスト接続を実行
      const testResult = await this.testConnection();
      if (testResult) {
        this.isInitialized = true;
        console.log('✅ Anthropic Provider initialized successfully');
        return true;
      } else {
        console.error('❌ Anthropic connection test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Anthropic initialization error:', error);
      return false;
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      // 簡単なAPIエンドポイントチェックのみ
      // 実際のAPI呼び出しは初期化後に遅延実行
      console.log('🔧 Anthropic connection validation: API key format check');
      
      if (!this.config?.apiKey || !this.config.apiKey.startsWith('sk-ant-')) {
        console.error('❌ Invalid Anthropic API key format');
        return false;
      }
      
      console.log('✅ Anthropic API key format valid');
      return true;
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    if (!this.isInitialized || !this.config) {
      throw new Error('Anthropic provider not initialized');
    }

    const startTime = Date.now();
    this.usageStats.totalRequests++;

    try {
      const messages: AnthropicMessage[] = [];
      
      // コンテキストメッセージの追加（user/assistantの交互パターンに調整）
      if (request.context && request.context.length > 0) {
        for (let i = 0; i < request.context.length; i++) {
          messages.push({
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: request.context[i]
          });
        }
      }

      // メインプロンプトを追加
      messages.push({
        role: 'user',
        content: request.prompt
      });

      const anthropicRequest: AnthropicRequest = {
        model: request.model || this.config.model || 'claude-3-sonnet-20240229',
        messages,
        max_tokens: request.maxTokens || this.config.limits?.maxTokens || 1000,
        temperature: request.temperature || 0.7
      };

      // システムプロンプトがある場合は追加
      if (request.systemPrompt) {
        anthropicRequest.system = request.systemPrompt;
      }

      const response = await this.callAnthropic(anthropicRequest);
      const processingTime = Date.now() - startTime;
      
      const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
      this.usageStats.totalTokens += totalTokens;
      this.usageStats.averageResponseTime = 
        (this.usageStats.averageResponseTime + processingTime) / 2;
      this.usageStats.lastUsed = new Date().toISOString();

      return {
        content: response.content[0]?.text || '',
        provider: this.name,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens
        },
        metadata: {
          id: response.id,
          stopReason: response.stop_reason
        },
        processingTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.usageStats.errorCount++;
      throw new Error(`Anthropic API error: ${error}`);
    }
  }

  private async callAnthropic(request: AnthropicRequest): Promise<AnthropicResponse> {
    if (!this.config?.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const endpoint = this.config.apiEndpoint || 'https://api.anthropic.com/v1/messages';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'User-Agent': 'Structured-Dialogue-Tools/1.0'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorData}`);
    }

    return await response.json() as AnthropicResponse;
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.config?.apiKey;
  }

  getCapabilities(): AICapability[] {
    return [
      {
        type: 'text-generation',
        description: 'Generate text with Claude models',
        supported: true
      },
      {
        type: 'conversation',
        description: 'Multi-turn conversation support',
        supported: true
      },
      {
        type: 'analysis',
        description: 'Deep text analysis and reasoning',
        supported: true
      },
      {
        type: 'concept-extraction',
        description: 'Extract and analyze concepts',
        supported: true
      }
    ];
  }

  getUsageStats(): any {
    return { ...this.usageStats };
  }

  // Claude向け最適化プロンプト生成
  generateStructuredDialoguePrompt(logContent: string, analysisType: string): string {
    const prompts = {
      'concept-extraction': `
あなたは構造的対話分析の専門家です。以下の対話ログを詳細に分析し、重要な概念を抽出してください。

<dialogue_log>
${logContent}
</dialogue_log>

以下の観点で分析してください：

1. **革新的概念**: 新しく現れた概念・アイデア
2. **構造感染**: 思考パターンや構造の伝播
3. **転換点**: 対話の方向性が変わった重要な瞬間
4. **創発性**: 対話から生まれた予期せぬ洞察

結果をJSON形式で返してください：
\`\`\`json
{
  "concepts": [
    {
      "name": "概念名",
      "description": "詳細な説明",
      "innovationLevel": 1,
      "category": "カテゴリ",
      "evidence": "根拠となる対話部分"
    }
  ],
  "structuralPatterns": ["パターン1", "パターン2"],
  "turningPoints": ["転換点1", "転換点2"],
  "emergentInsights": ["洞察1", "洞察2"]
}
\`\`\``,
      
      'quality-assessment': `
構造的対話品質評価専門家として、以下の対話ログを多面的に評価してください。

<dialogue_log>
${logContent}
</dialogue_log>

評価項目：
1. **革新度** (1-10): 新しいアイデア・概念の創出
2. **一貫性** (1-10): 論理的整合性・テーマの統一性
3. **深度** (1-10): 思考の深さ・掘り下げの程度
4. **実用性** (1-10): 実際の応用可能性
5. **創発性** (1-10): 予期しない洞察の生成
6. **構造性** (1-10): 対話構造の明確さ・組織化

JSON形式で詳細な評価を返してください。`,

      'continuation-suggestion': `
構造的対話継続の専門家として、以下の対話の最適な発展方向を提案してください。

<dialogue_log>
${logContent}
</dialogue_log>

以下を具体的に提案してください：

1. **次の質問**: 対話を深化させる質問（3-5個）
2. **探求領域**: 新たに探求すべき概念・領域
3. **視点転換**: 異なる角度からのアプローチ
4. **具体化機会**: 抽象的アイデアの具体化方法
5. **拡張可能性**: 他分野への応用・展開

JSON形式で構造化された提案を返してください。`
    };

    return prompts[analysisType as keyof typeof prompts] || prompts['concept-extraction'];
  }
}