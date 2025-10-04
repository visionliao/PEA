import { BaseModelAdapter } from '../model-adapter'
import { 
  LLMModel, 
  LLMRequest, 
  LLMResponse, 
  LLMResponseChunk, 
  LLMParams, 
  ModelConfig,
  ModelAdapter
} from '@/types/llm'

// Gemini 模型定义
export const GEMINI_MODELS: LLMModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      maxTokens: 1048576, // 1M tokens
      supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es']
    },
    defaultParams: {
      temperature: 1.0,
      topP: 1.0,
      maxTokens: 8192
    },
    supportedParams: ['temperature', 'topP', 'topK', 'maxTokens', 'stopSequences']
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      maxTokens: 2097152, // 2M tokens
      supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es']
    },
    defaultParams: {
      temperature: 1.0,
      topP: 1.0,
      maxTokens: 8192
    },
    supportedParams: ['temperature', 'topP', 'topK', 'maxTokens', 'stopSequences']
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      maxTokens: 1048576, // 1M tokens
      supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es']
    },
    defaultParams: {
      temperature: 1.0,
      topP: 1.0,
      maxTokens: 8192
    },
    supportedParams: ['temperature', 'topP', 'topK', 'maxTokens', 'stopSequences']
  }
]

// Gemini 适配器
export class GeminiAdapter extends BaseModelAdapter {
  private baseUrl: string

  constructor(model: LLMModel, config: ModelConfig) {
    super(model, config)
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const params = this.mergeParams(request.params || {})
    const validation = this.validateParams(params)
    
    if (!validation.isValid) {
      throw new Error(`参数验证失败: ${validation.errors.join(', ')}`)
    }

    const geminiRequest = {
      contents: this.transformMessages(request.messages),
      generationConfig: this.transformParams(validation.normalizedParams || params),
      ...(request.functions && { tools: this.transformFunctions(request.functions) }),
      ...(request.tools && { tools: this.transformTools(request.tools) })
    }

    const response = await this.withRetry(async () => {
      return await this.makeRequest(
        `${this.baseUrl}/models/${this.model.id}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          body: JSON.stringify(geminiRequest)
        }
      )
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

    const geminiRequest = {
      contents: this.transformMessages(request.messages),
      generationConfig: this.transformParams(validation.normalizedParams || params),
      ...(request.functions && { tools: this.transformFunctions(request.functions) }),
      ...(request.tools && { tools: this.transformTools(request.tools) })
    }

    const response = await this.withRetry(async () => {
      return await this.makeRequest(
        `${this.baseUrl}/models/${this.model.id}:streamGenerateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          body: JSON.stringify(geminiRequest)
        }
      )
    })

    // Gemini 流式响应处理
    if (!response.body) {
      throw new Error('Stream response is empty')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine === '') continue

          try {
            // 移除 "data: " 前缀
            const jsonStr = trimmedLine.startsWith('data: ') ? trimmedLine.slice(6) : trimmedLine
            if (jsonStr === '[DONE]') continue

            const data = JSON.parse(jsonStr)
            const chunk = this.transformStreamChunk(data)
            if (chunk) {
              yield chunk
            }
          } catch (error) {
            // 忽略解析错误
            continue
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  protected validateModelSpecificParams(params: Partial<LLMParams>, errors: string[]): void {
    if (params.topK !== undefined && (params.topK < 1 || params.topK > 40)) {
      errors.push('topK 必须在 1-40 之间')
    }
  }

  protected normalizeParams(params: Partial<LLMParams>): LLMParams {
    const normalized: any = {}
    
    if (params.temperature !== undefined) normalized.temperature = params.temperature
    if (params.topP !== undefined) normalized.topP = params.topP
    if (params.topK !== undefined) normalized.topK = params.topK
    if (params.maxTokens !== undefined) normalized.maxOutputTokens = params.maxTokens
    if (params.stop !== undefined) normalized.stopSequences = Array.isArray(params.stop) ? params.stop : [params.stop]
    
    return normalized
  }

  // 转换消息格式
  private transformMessages(messages: any[]): any[] {
    const contents: any[] = []
    let currentRole: string | null = null
    let currentParts: any[] = []

    for (const message of messages) {
      if (message.role === 'system') {
        // 系统消息转换为用户消息的一部分
        currentRole = 'user'
        currentParts.push({ text: `System: ${message.content}` })
      } else if (message.role === 'user') {
        if (currentRole === 'user' && currentParts.length > 0) {
          contents.push({ role: currentRole, parts: currentParts })
        }
        currentRole = 'user'
        currentParts = [{ text: message.content }]
      } else if (message.role === 'assistant') {
        if (currentRole && currentParts.length > 0) {
          contents.push({ role: currentRole, parts: currentParts })
        }
        currentRole = 'model'
        currentParts = [{ text: message.content }]
      }
    }

    // 添加最后一个消息
    if (currentRole && currentParts.length > 0) {
      contents.push({ role: currentRole, parts: currentParts })
    }

    return contents
  }

  // 转换参数格式
  private transformParams(params: LLMParams): any {
    const transformed: any = {}
    
    if (params.temperature !== undefined) transformed.temperature = params.temperature
    if (params.topP !== undefined) transformed.topP = params.topP
    if (params.topK !== undefined) transformed.topK = params.topK
    if (params.maxOutputTokens !== undefined) transformed.maxOutputTokens = params.maxOutputTokens
    if (params.stopSequences !== undefined) transformed.stopSequences = params.stopSequences
    
    // Gemini 特定参数
    transformed.responseMimeType = 'text/plain'
    transformed.responseSchema = undefined // 可以在未来支持 JSON Schema
    
    return transformed
  }

  // 转换函数调用
  private transformFunctions(functions: any[]): any {
    return {
      functionDeclarations: functions.map(func => ({
        name: func.name,
        description: func.description,
        parameters: func.parameters
      }))
    }
  }

  // 转换工具
  private transformTools(tools: any[]): any {
    return {
      functionDeclarations: tools.flatMap(tool => 
        tool.function ? [tool.function] : []
      )
    }
  }

  // 转换响应格式
  private transformResponse(data: any): LLMResponse {
    const candidate = data.candidates?.[0]
    const content = candidate?.content?.parts?.[0]
    const functionCall = content?.functionCall

    return {
      id: Date.now().toString(), // Gemini 不提供响应 ID
      content: content?.text || '',
      role: 'assistant',
      finishReason: candidate?.finishReason || 'STOP',
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      } : undefined,
      functionCall: functionCall ? {
        name: functionCall.name,
        arguments: JSON.stringify(functionCall.args)
      } : undefined
    }
  }

  // 转换流式响应块
  private transformStreamChunk(data: any): LLMResponseChunk | null {
    const candidate = data.candidates?.[0]
    if (!candidate) return null

    const content = candidate.content?.parts?.[0]
    const functionCall = content?.functionCall

    return {
      content: content?.text || '',
      role: 'assistant',
      finishReason: candidate.finishReason,
      functionCall: functionCall ? {
        name: functionCall.name,
        arguments: JSON.stringify(functionCall.args)
      } : undefined
    }
  }
}

// Gemini 工厂
export class GeminiFactory {
  async createAdapter(model: LLMModel, config: ModelConfig): Promise<ModelAdapter> {
    return new GeminiAdapter(model, config)
  }

  getSupportedModels(): LLMModel[] {
    return GEMINI_MODELS
  }

  validateConfig(config: ModelConfig): boolean {
    return !!config.apiKey
  }
}