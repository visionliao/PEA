import { ModelProvider, LLMModel, ModelConfig, ValidationResult } from '@/types/llm'
import { ModelRegistry } from './model-factory'
import { OpenAIFactory, OPENAI_MODELS } from './adapters/openai-adapter'
import { GeminiFactory, GEMINI_MODELS } from './adapters/gemini-adapter'

// 环境变量模型配置接口
interface EnvModelConfig {
  apiKey: string
  baseUrl?: string
  organization?: string
  timeout?: number
  retries?: number
  headers?: Record<string, string>
  proxy?: string
  enabled?: boolean
}

// 环境变量配置接口
interface EnvProviderConfig {
  [key: string]: {
    name: string
    description?: string
    models: string[]
    config: EnvModelConfig
  }
}

// 配置管理器
export class ModelConfigManager {
  private static instance: ModelConfigManager
  private registry: ModelRegistry
  private configCache = new Map<string, ModelConfig>()

  constructor() {
    this.registry = ModelRegistry.getInstance()
    this.initializeProviders()
  }

  static getInstance(): ModelConfigManager {
    if (!ModelConfigManager.instance) {
      ModelConfigManager.instance = new ModelConfigManager()
    }
    return ModelConfigManager.instance
  }

  // 初始化默认提供商
  private initializeProviders(): void {
    // 注册 OpenAI 提供商
    this.registry.registerProvider({
      id: 'openai',
      name: 'OpenAI',
      description: 'OpenAI GPT models',
      website: 'https://openai.com',
      documentation: 'https://platform.openai.com/docs/api-reference',
      models: OPENAI_MODELS,
      factory: new OpenAIFactory()
    })

    // 注册 Google (Gemini) 提供商
    this.registry.registerProvider({
      id: 'google',
      name: 'Google',
      description: 'Google Gemini models',
      website: 'https://ai.google.dev',
      documentation: 'https://ai.google.dev/docs',
      models: GEMINI_MODELS,
      factory: new GeminiFactory()
    })
  }

  // 从环境变量加载配置
  loadFromEnvironment(): void {
    const providerConfigs = this.parseEnvironmentConfig()
    
    Object.entries(providerConfigs).forEach(([providerId, config]) => {
      if (config.config.enabled !== false) {
        this.setProviderConfig(providerId, config.config)
      }
    })
  }

  // 解析环境变量
  private parseEnvironmentConfig(): EnvProviderConfig {
    const configs: EnvProviderConfig = {}
    
    // OpenAI 配置
    if (process.env.OPENAI_API_KEY) {
      configs.openai = {
        name: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          baseUrl: process.env.OPENAI_BASE_URL,
          organization: process.env.OPENAI_ORGANIZATION,
          timeout: process.env.OPENAI_TIMEOUT ? parseInt(process.env.OPENAI_TIMEOUT) : undefined,
          retries: process.env.OPENAI_RETRIES ? parseInt(process.env.OPENAI_RETRIES) : undefined,
          enabled: process.env.OPENAI_ENABLED !== 'false'
        }
      }
    }

    // Google Gemini 配置
    if (process.env.GOOGLE_API_KEY) {
      configs.google = {
        name: 'Google',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'],
        config: {
          apiKey: process.env.GOOGLE_API_KEY,
          baseUrl: process.env.GOOGLE_BASE_URL,
          timeout: process.env.GOOGLE_TIMEOUT ? parseInt(process.env.GOOGLE_TIMEOUT) : undefined,
          retries: process.env.GOOGLE_RETRIES ? parseInt(process.env.GOOGLE_RETRIES) : undefined,
          enabled: process.env.GOOGLE_ENABLED !== 'false'
        }
      }
    }

    // Anthropic 配置（预留）
    if (process.env.ANTHROPIC_API_KEY) {
      configs.anthropic = {
        name: 'Anthropic',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        config: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseUrl: process.env.ANTHROPIC_BASE_URL,
          timeout: process.env.ANTHROPIC_TIMEOUT ? parseInt(process.env.ANTHROPIC_TIMEOUT) : undefined,
          retries: process.env.ANTHROPIC_RETRIES ? parseInt(process.env.ANTHROPIC_RETRIES) : undefined,
          enabled: process.env.ANTHROPIC_ENABLED !== 'false'
        }
      }
    }

    // 动态加载其他提供商配置
    const customProviders = process.env.CUSTOM_PROVIDERS
    if (customProviders) {
      try {
        const providers = JSON.parse(customProviders)
        Object.assign(configs, providers)
      } catch (error) {
        console.error('Failed to parse CUSTOM_PROVIDERS:', error)
      }
    }

    return configs
  }

  // 设置提供商配置
  setProviderConfig(providerId: string, config: EnvModelConfig): void {
    const modelConfig: ModelConfig = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      organization: config.organization,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      headers: config.headers,
      proxy: config.proxy
    }

    this.configCache.set(providerId, modelConfig)
  }

  // 获取提供商配置
  getProviderConfig(providerId: string): ModelConfig | undefined {
    return this.configCache.get(providerId)
  }

  // 获取所有可用提供商
  getAvailableProviders(): ModelProvider[] {
    const allProviders = this.registry.getProviders()
    return allProviders.filter(provider => this.configCache.has(provider.id))
  }

  // 获取提供商的可用模型
  getAvailableModels(providerId?: string): LLMModel[] {
    if (providerId) {
      const provider = this.registry.getProvider(providerId)
      return provider?.models || []
    }
    
    return this.registry.getAllModels().filter(model => 
      this.configCache.has(model.provider)
    )
  }

  // 检查模型是否可用
  isModelAvailable(modelId: string): boolean {
    const model = this.registry.getModel(modelId)
    return model ? this.configCache.has(model.provider) : false
  }

  // 获取模型配置
  getModelConfig(modelId: string): ModelConfig | undefined {
    const model = this.registry.getModel(modelId)
    if (!model) return undefined
    
    return this.configCache.get(model.provider)
  }

  // 验证模型配置
  validateModelConfig(modelId: string): ValidationResult {
    const model = this.registry.getModel(modelId)
    if (!model) {
      return { isValid: false, errors: ['Model not found'] }
    }

    const config = this.configCache.get(model.provider)
    if (!config) {
      return { isValid: false, errors: ['Provider configuration not found'] }
    }

    const factory = this.registry.getProvider(model.provider)?.factory
    if (!factory) {
      return { isValid: false, errors: ['Provider factory not found'] }
    }

    const isValid = factory.validateConfig(config)
    return { isValid, errors: isValid ? [] : ['Invalid configuration'] }
  }

  // 添加自定义提供商
  addCustomProvider(provider: ModelProvider, config: ModelConfig): void {
    this.registry.registerProvider(provider)
    this.configCache.set(provider.id, config)
  }

  // 更新配置
  updateConfig(providerId: string, updates: Partial<ModelConfig>): void {
    const existing = this.configCache.get(providerId)
    if (existing) {
      this.configCache.set(providerId, { ...existing, ...updates })
    }
  }

  // 移除提供商
  removeProvider(providerId: string): void {
    this.configCache.delete(providerId)
  }

  // 获取配置统计
  getConfigStats(): {
    totalProviders: number
    availableProviders: number
    totalModels: number
    availableModels: number
  } {
    const allProviders = this.registry.getProviders()
    const availableProviders = this.getAvailableProviders()
    const allModels = this.registry.getAllModels()
    const availableModels = this.getAvailableModels()

    return {
      totalProviders: allProviders.length,
      availableProviders: availableProviders.length,
      totalModels: allModels.length,
      availableModels: availableModels.length
    }
  }

  // 导出配置
  exportConfig(): Record<string, ModelConfig> {
    const exported: Record<string, ModelConfig> = {}
    this.configCache.forEach((config, providerId) => {
      exported[providerId] = { ...config }
    })
    return exported
  }

  // 导入配置
  importConfig(configs: Record<string, ModelConfig>): void {
    Object.entries(configs).forEach(([providerId, config]) => {
      this.configCache.set(providerId, config)
    })
  }

  // 清理配置
  clearConfig(): void {
    this.configCache.clear()
  }
}