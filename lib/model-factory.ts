import { ModelFactory, ModelProvider, LLMModel, ModelConfig, ModelAdapter, ValidationResult } from '@/types/llm'

// 模型注册中心
export class ModelRegistry {
  private static instance: ModelRegistry
  private providers = new Map<string, ModelProvider>()
  private factories = new Map<string, ModelFactory>()

  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry()
    }
    return ModelRegistry.instance
  }

  // 注册提供商
  registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.id, provider)
    this.factories.set(provider.id, provider.factory)
  }

  // 获取所有提供商
  getProviders(): ModelProvider[] {
    return Array.from(this.providers.values())
  }

  // 获取特定提供商
  getProvider(providerId: string): ModelProvider | undefined {
    return this.providers.get(providerId)
  }

  // 获取所有模型
  getAllModels(): LLMModel[] {
    return Array.from(this.providers.values()).flatMap(provider => provider.models)
  }

  // 获取特定模型
  getModel(modelId: string): LLMModel | undefined {
    for (const provider of this.providers.values()) {
      const model = provider.models.find(m => m.id === modelId)
      if (model) return model
    }
    return undefined
  }

  // 获取提供商的模型
  getModelsByProvider(providerId: string): LLMModel[] {
    const provider = this.providers.get(providerId)
    return provider?.models || []
  }

  // 创建适配器
  async createAdapter(modelId: string, config: ModelConfig): Promise<ModelAdapter> {
    const model = this.getModel(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const factory = this.factories.get(model.provider)
    if (!factory) {
      throw new Error(`Factory for provider ${model.provider} not found`)
    }

    return await factory.createAdapter(model, config)
  }

  // 验证配置
  validateConfig(providerId: string, config: ModelConfig): boolean {
    const factory = this.factories.get(providerId)
    return factory ? factory.validateConfig(config) : false
  }
}

// 动态模型工厂
export class DynamicModelFactory implements ModelFactory {
  private loader: (modelId: string) => Promise<ModelFactory>

  constructor(loader: (modelId: string) => Promise<ModelFactory>) {
    this.loader = loader
  }

  async createAdapter(model: LLMModel, config: ModelConfig): Promise<ModelAdapter> {
    // 动态加载对应的工厂
    const factory = await this.loader(model.id)
    return factory.createAdapter(model, config)
  }

  getSupportedModels(): LLMModel[] {
    // 动态工厂通常不直接返回模型列表
    return []
  }

  validateConfig(config: ModelConfig): boolean {
    // 基础验证
    return !!config.apiKey
  }
}

// 配置驱动的模型工厂
export class ConfigDrivenFactory implements ModelFactory {
  private config: any

  constructor(config: any) {
    this.config = config
  }

  async createAdapter(model: LLMModel, config: ModelConfig): Promise<ModelAdapter> {
    // 根据配置动态创建适配器
    const adapterPath = this.config.adapters[model.provider]?.path
    if (!adapterPath) {
      throw new Error(`No adapter found for provider ${model.provider}`)
    }

    // 动态导入适配器
    const AdapterClass = await import(adapterPath)
    return new AdapterClass.default(model, config)
  }

  getSupportedModels(): LLMModel[] {
    return this.config.models || []
  }

  validateConfig(config: ModelConfig): boolean {
    const requiredFields = this.config.validation?.requiredFields || ['apiKey']
    return requiredFields.every((field: string) => (config as any)[field])
  }
}

// 模型管理器
export class ModelManager {
  private registry: ModelRegistry
  private activeAdapters = new Map<string, ModelAdapter>()

  constructor(registry?: ModelRegistry) {
    this.registry = registry || ModelRegistry.getInstance()
  }

  // 获取可用模型列表
  getAvailableModels(): LLMModel[] {
    return this.registry.getAllModels()
  }

  // 按提供商获取模型
  getModelsByProvider(providerId: string): LLMModel[] {
    return this.registry.getModelsByProvider(providerId)
  }

  // 获取模型详情
  getModelInfo(modelId: string): LLMModel | undefined {
    return this.registry.getModel(modelId)
  }

  // 创建或获取模型适配器
  async getModelAdapter(modelId: string, config: ModelConfig): Promise<ModelAdapter> {
    const cacheKey = `${modelId}_${JSON.stringify(config)}`
    
    if (this.activeAdapters.has(cacheKey)) {
      return this.activeAdapters.get(cacheKey)!
    }

    const adapter = await this.registry.createAdapter(modelId, config)
    this.activeAdapters.set(cacheKey, adapter)
    
    return adapter
  }

  // 清理适配器缓存
  clearAdapterCache(modelId?: string): void {
    if (modelId) {
      // 清理特定模型的缓存
      const keysToDelete: string[] = []
      for (const [key] of this.activeAdapters) {
        if (key.startsWith(modelId)) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => this.activeAdapters.delete(key))
    } else {
      // 清理所有缓存
      this.activeAdapters.clear()
    }
  }

  // 释放资源
  dispose(): void {
    this.activeAdapters.clear()
  }
}

// 模型配置验证器
export class ModelConfigValidator {
  static validateModelConfig(config: ModelConfig, providerId: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 基础验证
    if (!config.apiKey) {
      errors.push('API Key is required')
    }

    // 提供商特定验证
    switch (providerId) {
      case 'openai':
        if (!config.baseUrl && !config.apiKey.startsWith('sk-')) {
          errors.push('OpenAI API key must start with "sk-"')
        }
        break
      
      case 'anthropic':
        if (!config.apiKey.startsWith('sk-ant-')) {
          errors.push('Anthropic API key must start with "sk-ant-"')
        }
        break
      
      case 'google':
        if (!config.apiKey.includes('google')) {
          warnings.push('Google API key format seems invalid')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }
}

