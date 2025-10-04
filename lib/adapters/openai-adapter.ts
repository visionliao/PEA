import { BaseModelAdapter, createStreamResponse, parseSSELine } from '../model-adapter'
import { 
  LLMModel, 
  LLMRequest, 
  LLMResponse, 
  LLMResponseChunk, 
  LLMParams, 
  ModelConfig, 
  ModelAdapter 
} from '@/types/llm'

// OpenAI 模型定义
export const OPENAI_MODELS: LLMModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      maxTokens: 128000,
      supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es']
    },
    defaultParams: {
      temperature: 1.0,
      topP: 1.0,
      maxTokens: 4096
    },
    supportedParams: ['temperature', 'topP', 'maxTokens', 'stop', 'presencePenalty', 'frequencyPenalty', 'logitBias', 'seed']
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      maxTokens: 128000,
      supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es']
    },
    defaultParams: {
      temperature: 1.0,
      topP: 1.0,
      maxTokens: 4096
    },
    supportedParams: ['temperature', 'topP', 'maxTokens', 'stop', 'presencePenalty', 'frequencyPenalty', 'logitBias', 'seed']
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      maxTokens: 16385,
      supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es']
    },
    defaultParams: {
      temperature: 1.0,
      topP: 1.0,
      maxTokens: 4096
    },
    supportedParams: ['temperature', 'topP', 'maxTokens', 'stop', 'presencePenalty', 'frequencyPenalty', 'logitBias', 'seed']
  }
]

// OpenAI 适配器
export class OpenAIAdapter extends BaseModelAdapter {
  private baseUrl: string

  constructor(model: LLMModel, config: ModelConfig) {
    super(model, config)
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1'
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const params = this.mergeParams(request.params || {})
    const validation = this.validateParams(params)
    
    if (!validation.isValid) {
      throw new Error(`参数验证失败: ${validation.errors.join(', ')}`)
    }

    const openaiRequest = {
      model: this.model.id,
      messages: this.transformMessages(request.messages),
      ...this.transformParams(validation.normalizedParams || params),
      stream: false,
      ...(request.functions && { functions: request.functions }),
      ...(request.tools && { tools: request.tools })
    }

    const response = await this.withRetry(async () => {
      return await this.makeRequest(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(openaiRequest)
      })
    })

    const data = await response.json()
    return this.transformResponse(data)
  }

  async *chatStream(request: LLMRequest): AsyncIterable<LLMResponseChunk> {
    const params = this.mergeParams(request.params || {})
    const validation = this.validateParams(params)
    
    if (!validation.isValid) {
      throw new Error(`参数验证失败: ${validation.errors.join(', ')}`)
    }

    const openaiRequest = {
      model: this.model.id,
      messages: this.transformMessages(request.messages),
      ...this.transformParams(validation.normalizedParams || params),
      stream: true,
      ...(request.functions && { functions: request.functions }),
      ...(request.tools && { tools: request.tools })
    }

    const response = await this.withRetry(async () => {
      return await this.makeRequest(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(openaiRequest)
      })
    })

    for await (const chunk of createStreamResponse(response, parseSSELine)) {
      yield chunk
    }
  }

  protected validateModelSpecificParams(params: Partial<LLMParams>, errors: string[]): void {
    if (params.presencePenalty !== undefined && (params.presencePenalty < -2 || params.presencePenalty > 2)) {
      errors.push('presencePenalty 必须在 -2 到 2 之间')
    }
    
    if (params.frequencyPenalty !== undefined && (params.frequencyPenalty < -2 || params.frequencyPenalty > 2)) {
      errors.push('frequencyPenalty 必须在 -2 到 2 之间')
    }
  }

  protected normalizeParams(params: Partial<LLMParams>): LLMParams {
    const normalized: any = {}
    
    // 重命名参数
    if (params.temperature !== undefined) normalized.temperature = params.temperature
    if (params.topP !== undefined) normalized.top_p = params.topP
    if (params.maxTokens !== undefined) normalized.max_tokens = params.maxTokens
    if (params.stop !== undefined) normalized.stop = params.stop
    if (params.presencePenalty !== undefined) normalized.presence_penalty = params.presencePenalty
    if (params.frequencyPenalty !== undefined) normalized.frequency_penalty = params.frequencyPenalty
    
    // OpenAI 特定参数
    if (params.logitBias !== undefined) normalized.logit_bias = params.logitBias
    if (params.seed !== undefined) normalized.seed = params.seed
    
    return normalized
  }

  // 转换消息格式
  private transformMessages(messages: any[]): any[] {
    return messages.map(msg => {
      if (msg.role === 'function') {
        return {
          role: 'function',
          name: msg.name,
          content: msg.content
        }
      }
      
      if (msg.toolCalls) {
        return {
          role: msg.role,
          content: msg.content,
          tool_calls: msg.toolCalls
        }
      }
      
      return {
        role: msg.role,
        content: msg.content
      }
    })
  }

  // 转换参数格式
  private transformParams(params: LLMParams): any {
    const transformed: any = {}
    
    Object.keys(params).forEach(key => {
      if (key === 'temperature') transformed.temperature = params.temperature
      else if (key === 'top_p') transformed.top_p = params.top_p
      else if (key === 'max_tokens') transformed.max_tokens = params.max_tokens
      else if (key === 'stop') transformed.stop = params.stop
      else if (key === 'presence_penalty') transformed.presence_penalty = params.presencePenalty
      else if (key === 'frequency_penalty') transformed.frequency_penalty = params.frequencyPenalty
      else if (key === 'logit_bias') transformed.logit_bias = params.logitBias
      else if (key === 'seed') transformed.seed = params.seed
      else transformed[key] = (params as any)[key] // 保留其他参数
    })
    
    return transformed
  }

  // 转换响应格式
  private transformResponse(data: any): LLMResponse {
    const choice = data.choices[0]
    
    return {
      id: data.id,
      content: choice.message.content || '',
      role: choice.message.role,
      finishReason: choice.finish_reason,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      functionCall: choice.message.function_call,
      toolCalls: choice.message.tool_calls
    }
  }
}

// OpenAI 工厂
export class OpenAIFactory {
  async createAdapter(model: LLMModel, config: ModelConfig): Promise<ModelAdapter> {
    return new OpenAIAdapter(model, config)
  }

  getSupportedModels(): LLMModel[] {
    return OPENAI_MODELS
  }

  validateConfig(config: ModelConfig): boolean {
    return !!config.apiKey && (
      config.apiKey.startsWith('sk-') || 
      !!config.baseUrl // 自定义端点
    )
  }
}