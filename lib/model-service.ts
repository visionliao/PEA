import { 
  LLMRequest, 
  LLMResponse, 
  LLMResponseChunk, 
  ModelAdapter, 
  ModelConfig 
} from '@/types/llm'
import { ModelManager } from './model-factory'
import { ModelConfigManager } from './model-config'

// 模型调用选项
export interface ModelCallOptions {
  modelId: string
  request: LLMRequest
  stream?: boolean
  onProgress?: (chunk: LLMResponseChunk) => void
  onError?: (error: Error) => void
  onComplete?: (response: LLMResponse) => void
  timeout?: number
  retries?: number
}

// 模型调用结果
export interface ModelCallResult {
  success: boolean
  response?: LLMResponse
  error?: Error
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost?: number
  }
  duration: number
}

// 统一模型服务
export class ModelService {
  private modelManager: ModelManager
  private configManager: ModelConfigManager
  private activeCalls = new Map<string, AbortController>()

  constructor() {
    this.modelManager = new ModelManager()
    this.configManager = ModelConfigManager.getInstance()
  }

  // 初始化
  async initialize(): Promise<void> {
    // 从环境变量加载配置
    this.configManager.loadFromEnvironment()
    
    console.log('ModelService initialized with providers:', 
      this.configManager.getAvailableProviders().map(p => p.id).join(', '))
  }

  // 获取可用模型列表
  getAvailableModels() {
    return this.configManager.getAvailableModels()
  }

  // 按提供商获取模型
  getModelsByProvider(providerId: string) {
    return this.configManager.getAvailableModels(providerId)
  }

  // 获取模型信息
  getModelInfo(modelId: string) {
    return this.configManager.getAvailableProviders()
      .flatMap(p => p.models)
      .find(m => m.id === modelId)
  }

  // 验证模型配置
  validateModel(modelId: string): { isValid: boolean; errors: string[] } {
    return this.configManager.validateModelConfig(modelId)
  }

  // 调用模型
  async call(options: ModelCallOptions): Promise<ModelCallResult> {
    const startTime = Date.now()
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // 验证模型配置
      const validation = this.validateModel(options.modelId)
      if (!validation.isValid) {
        throw new Error(`Model validation failed: ${validation.errors.join(', ')}`)
      }

      // 获取模型适配器
      const config = this.configManager.getModelConfig(options.modelId)
      if (!config) {
        throw new Error(`No configuration found for model ${options.modelId}`)
      }

      const adapter = await this.modelManager.getModelAdapter(options.modelId, {
        ...config,
        timeout: options.timeout || config.timeout,
        retries: options.retries || config.retries
      })

      // 创建取消控制器
      const abortController = new AbortController()
      this.activeCalls.set(callId, abortController)

      let response: LLMResponse

      if (options.stream) {
        // 流式调用
        response = await this.handleStreamCall(adapter, options, abortController)
      } else {
        // 普通调用
        response = await this.handleNormalCall(adapter, options, abortController)
      }

      const duration = Date.now() - startTime
      const cost = this.calculateCost(options.modelId, response.usage)

      const result: ModelCallResult = {
        success: true,
        response,
        usage: response.usage ? {
          ...response.usage,
          cost
        } : undefined,
        duration
      }

      options.onComplete?.(response)
      return result

    } catch (error) {
      const duration = Date.now() - startTime
      const result: ModelCallResult = {
        success: false,
        error: error as Error,
        duration
      }

      options.onError?.(error as Error)
      return result

    } finally {
      this.activeCalls.delete(callId)
    }
  }

  // 处理普通调用
  private async handleNormalCall(
    adapter: ModelAdapter, 
    options: ModelCallOptions, 
    abortController: AbortController
  ): Promise<LLMResponse> {
    return await adapter.chat(options.request)
  }

  // 处理流式调用
  private async handleStreamCall(
    adapter: ModelAdapter, 
    options: ModelCallOptions, 
    abortController: AbortController
  ): Promise<LLMResponse> {
    const chunks: LLMResponseChunk[] = []
    let finalContent = ''
    let finishReason = ''
    let usage: any

    try {
      for await (const chunk of adapter.chatStream(options.request)) {
        if (abortController.signal.aborted) {
          throw new Error('Call aborted')
        }

        chunks.push(chunk)
        
        if (chunk.content) {
          finalContent += chunk.content
        }
        
        if (chunk.finishReason) {
          finishReason = chunk.finishReason
        }
        
        if (chunk.usage) {
          usage = chunk.usage
        }

        options.onProgress?.(chunk)
      }

      // 构建完整响应
      const response: LLMResponse = {
        id: chunks[0]?.id || Date.now().toString(),
        content: finalContent,
        role: 'assistant',
        finishReason,
        usage
      }

      return response

    } catch (error) {
      if (abortController.signal.aborted) {
        throw new Error('Stream call aborted')
      }
      throw error
    }
  }

  // 取消调用
  abortCall(callId: string): boolean {
    const controller = this.activeCalls.get(callId)
    if (controller) {
      controller.abort()
      this.activeCalls.delete(callId)
      return true
    }
    return false
  }

  // 取消所有调用
  abortAllCalls(): void {
    this.activeCalls.forEach(controller => controller.abort())
    this.activeCalls.clear()
  }

  // 计算成本
  private calculateCost(modelId: string, usage?: any): number | undefined {
    if (!usage) return undefined

    const modelInfo = this.getModelInfo(modelId)
    if (!modelInfo?.pricing) return undefined

    const { promptTokens, completionTokens } = usage
    const { input: inputPrice, output: outputPrice } = modelInfo.pricing

    return (promptTokens * inputPrice / 1000) + (completionTokens * outputPrice / 1000)
  }

  // 获取调用统计
  getCallStats(): {
    activeCalls: number
    totalCalls: number
    // 可以添加更多统计信息
  } {
    return {
      activeCalls: this.activeCalls.size,
      totalCalls: this.activeCalls.size // 简化统计
    }
  }

  // 批量调用
  async batchCall(calls: ModelCallOptions[]): Promise<ModelCallResult[]> {
    const results: ModelCallResult[] = []
    
    // 并行执行，但限制并发数
    const batchSize = 3 // 同时最多3个调用
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(call => this.call(call))
      )
      results.push(...batchResults)
    }

    return results
  }

  // 模型测试
  async testModel(modelId: string, testPrompt: string = 'Hello, respond with "OK"'): Promise<ModelCallResult> {
    return this.call({
      modelId,
      request: {
        messages: [
          { role: 'user', content: testPrompt }
        ]
      },
      timeout: 10000, // 10秒超时
      retries: 1 // 只重试1次
    })
  }

  // 模型比较
  async compareModels(
    modelIds: string[], 
    prompt: string
  ): Promise<{ modelId: string; result: ModelCallResult }[]> {
    const results = await Promise.all(
      modelIds.map(async (modelId) => {
        try {
          const result = await this.call({
            modelId,
            request: {
              messages: [
                { role: 'user', content: prompt }
              ]
            },
            timeout: 30000
          })
          return { modelId, result }
        } catch (error) {
          return { 
            modelId, 
            result: {
              success: false,
              error: error as Error,
              duration: 0
            }
          }
        }
      })
    )

    return results
  }

  // 获取推荐模型
  getRecommendedModels(task: string): string[] {
    // 根据任务类型推荐模型
    const recommendations: Record<string, string[]> = {
      'coding': ['gpt-4o', 'gemini-2.5-pro', 'gpt-4o-mini'],
      'writing': ['gpt-4o', 'gemini-2.5-pro', 'claude-3-opus'],
      'analysis': ['gemini-2.5-pro', 'gpt-4o', 'claude-3-sonnet'],
      'chat': ['gpt-4o-mini', 'gemini-1.5-flash', 'claude-3-haiku'],
      'default': ['gpt-4o', 'gemini-2.5-flash', 'gpt-4o-mini']
    }

    const taskKey = task.toLowerCase()
    for (const [key, models] of Object.entries(recommendations)) {
      if (taskKey.includes(key)) {
        return models.filter(modelId => this.validateModel(modelId).isValid)
      }
    }

    return recommendations.default.filter(modelId => this.validateModel(modelId).isValid)
  }
}

// 全局实例
export const modelService = new ModelService()