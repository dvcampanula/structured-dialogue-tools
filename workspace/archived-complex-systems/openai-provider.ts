/**
 * OpenAI Provider - OpenAI API統合実装
 * Phase 5: OpenAI GPT-4/3.5統合システム
 */

import { 
  AIProviderInterface, 
  AIProviderConfig, 
  AIRequest, 
  AIResponse, 
  AICapability 
} from './ai-provider-manager.js';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements AIProviderInterface {
  name = 'openai';
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
        console.error('❌ OpenAI API key not provided');
        return false;
      }

      // テスト接続を実行
      const testResult = await this.testConnection();
      if (testResult) {
        this.isInitialized = true;
        console.log('✅ OpenAI Provider initialized successfully');
        return true;
      } else {
        console.error('❌ OpenAI connection test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ OpenAI initialization error:', error);
      return false;
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      const testRequest: AIRequest = {
        prompt: 'Hello, this is a connection test.',
        maxTokens: 10,
        temperature: 0
      };
      
      await this.generateResponse(testRequest);
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    if (!this.isInitialized || !this.config) {
      throw new Error('OpenAI provider not initialized');
    }

    const startTime = Date.now();
    this.usageStats.totalRequests++;

    try {
      const messages: OpenAIMessage[] = [];
      
      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt
        });
      }

      if (request.context && request.context.length > 0) {
        for (const contextMsg of request.context) {
          messages.push({
            role: 'user',
            content: contextMsg
          });
        }
      }

      messages.push({
        role: 'user',
        content: request.prompt
      });

      const openaiRequest: OpenAIRequest = {
        model: request.model || this.config.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: request.maxTokens || this.config.limits?.maxTokens || 1000,
        temperature: request.temperature || 0.7
      };

      const response = await this.callOpenAI(openaiRequest);
      const processingTime = Date.now() - startTime;
      
      this.usageStats.totalTokens += response.usage.total_tokens;
      this.usageStats.averageResponseTime = 
        (this.usageStats.averageResponseTime + processingTime) / 2;
      this.usageStats.lastUsed = new Date().toISOString();

      return {
        content: response.choices[0]?.message?.content || '',
        provider: this.name,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        },
        metadata: {
          id: response.id,
          finishReason: response.choices[0]?.finish_reason
        },
        processingTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.usageStats.errorCount++;
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  private async callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
    if (!this.config?.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const endpoint = this.config.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': 'Structured-Dialogue-Tools/1.0'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorData}`);
    }

    return await response.json() as OpenAIResponse;
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.config?.apiKey;
  }

  getCapabilities(): AICapability[] {
    return [
      {
        type: 'text-generation',
        description: 'Generate text based on prompts',
        supported: true
      },
      {
        type: 'conversation',
        description: 'Multi-turn conversation support',
        supported: true
      },
      {
        type: 'analysis',
        description: 'Text analysis and understanding',
        supported: true
      },
      {
        type: 'concept-extraction',
        description: 'Extract concepts from text',
        supported: true
      }
    ];
  }

  getUsageStats(): any {
    return { ...this.usageStats };
  }

  // 構造的対話向け最適化プロンプト生成
  generateStructuredDialoguePrompt(logContent: string, analysisType: string): string {
    const prompts = {
      'concept-extraction': `
あなたは構造的対話の専門家です。以下の対話ログから重要な概念を抽出してください。

対話ログ:
${logContent}

以下の観点で分析してください：
1. 革新的な概念・アイデア
2. 構造感染パターン
3. 対話の転換点
4. 未来への示唆

JSON形式で結果を返してください：
{
  "concepts": [
    {
      "name": "概念名",
      "description": "説明",
      "innovationLevel": 1-10,
      "category": "カテゴリ"
    }
  ],
  "patterns": ["パターン1", "パターン2"],
  "insights": ["洞察1", "洞察2"]
}`,
      
      'quality-assessment': `
以下の構造的対話ログの品質を評価してください。

対話ログ:
${logContent}

評価基準：
1. 革新度 (1-10)
2. 一貫性 (1-10)
3. 深度 (1-10)
4. 実用性 (1-10)

JSON形式で評価結果を返してください。`,

      'continuation-suggestion': `
以下の構造的対話の続きを提案してください。

対話ログ:
${logContent}

以下を提案してください：
1. 次に探求すべき質問
2. 深掘りできる概念
3. 新しい視点・角度
4. 具体化できるアイデア

JSON形式で提案を返してください。`
    };

    return prompts[analysisType as keyof typeof prompts] || prompts['concept-extraction'];
  }
}