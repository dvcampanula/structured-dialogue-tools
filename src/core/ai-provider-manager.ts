/**
 * AI Provider Manager - 外部AI連携システム
 * Phase 5: 外部AI統合・マルチプロバイダー対応システム
 */

export interface AIProviderConfig {
  name: 'openai' | 'anthropic' | 'google' | 'custom';
  displayName: string;
  apiEndpoint: string;
  apiKey?: string;
  model?: string;
  capabilities: AICapability[];
  limits?: {
    maxTokens?: number;
    maxRequests?: number;
    rateLimitRpm?: number;
  };
  authentication?: {
    type: 'bearer' | 'apikey' | 'oauth';
    headerName?: string;
  };
}

export interface AICapability {
  type: 'text-generation' | 'conversation' | 'analysis' | 'concept-extraction';
  description: string;
  supported: boolean;
}

export interface AIRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  context?: string[];
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
  processingTime: number;
  timestamp: string;
}

export interface AIProviderInterface {
  name: string;
  initialize(config: AIProviderConfig): Promise<boolean>;
  generateResponse(request: AIRequest): Promise<AIResponse>;
  isAvailable(): boolean;
  getCapabilities(): AICapability[];
  getUsageStats(): any;
}

export class AIProviderManager {
  private providers: Map<string, AIProviderInterface> = new Map();
  private defaultProvider: string = 'openai';

  constructor() {
    console.log('🤖 AI Provider Manager initializing...');
  }

  async registerProvider(provider: AIProviderInterface, config: AIProviderConfig): Promise<boolean> {
    try {
      const initialized = await provider.initialize(config);
      if (initialized) {
        this.providers.set(config.name, provider);
        console.log(`✅ AI Provider registered: ${config.displayName}`);
        return true;
      } else {
        console.error(`❌ Failed to initialize provider: ${config.displayName}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error registering provider ${config.displayName}:`, error);
      return false;
    }
  }

  async generateResponse(
    request: AIRequest, 
    providerName?: string
  ): Promise<AIResponse> {
    const targetProvider = providerName || this.defaultProvider;
    const provider = this.providers.get(targetProvider);

    if (!provider) {
      throw new Error(`Provider not found: ${targetProvider}`);
    }

    if (!provider.isAvailable()) {
      throw new Error(`Provider not available: ${targetProvider}`);
    }

    const startTime = Date.now();
    try {
      const response = await provider.generateResponse(request);
      response.processingTime = Date.now() - startTime;
      response.timestamp = new Date().toISOString();
      return response;
    } catch (error) {
      throw new Error(`Provider error (${targetProvider}): ${error}`);
    }
  }

  async compareProviders(
    request: AIRequest, 
    providerNames: string[]
  ): Promise<AIResponse[]> {
    const results: AIResponse[] = [];
    
    for (const providerName of providerNames) {
      try {
        const response = await this.generateResponse(request, providerName);
        results.push(response);
      } catch (error) {
        console.error(`Provider ${providerName} failed:`, error);
        results.push({
          content: `Error: ${error}`,
          provider: providerName,
          model: 'unknown',
          processingTime: 0,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).filter(name => 
      this.providers.get(name)?.isAvailable()
    );
  }

  setDefaultProvider(providerName: string): boolean {
    if (this.providers.has(providerName)) {
      this.defaultProvider = providerName;
      return true;
    }
    return false;
  }

  getProviderStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [name, provider] of this.providers) {
      stats[name] = {
        available: provider.isAvailable(),
        capabilities: provider.getCapabilities(),
        usage: provider.getUsageStats()
      };
    }
    return stats;
  }
}