import { 
  ModelAdapter, 
  LLMModel, 
  LLMRequest, 
  LLMResponse, 
  LLMResponseChunk, 
  LLMParams, 
  ValidationResult, 
  ModelError, 
  ModelConfig 
} from '@/types/llm'

// 基础适配器抽象类
export abstract class BaseModelAdapter implements ModelAdapter {
  readonly model: LLMModel
  protected config: ModelConfig

  constructor(model: LLMModel, config: ModelConfig) {
    this.model = model
    this.config = config
  }

  abstract chat(request: LLMRequest): Promise<LLMResponse>
  abstract chatStream(request: LLMRequest): AsyncIterable<LLMResponseChunk>

  // 验证参数
  validateParams(params: Partial<LLMParams>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // 验证必填参数
    if (params.temperature !== undefined && (params.temperature < 0 || params.temperature > 2)) {
      errors.push('temperature 必须在 0-2 之间')
    }
    
    if (params.topP !== undefined && (params.topP < 0 || params.topP > 1)) {
      errors.push('topP 必须在 0-1 之间')
    }
    
    if (params.maxTokens !== undefined && params.maxTokens < 0) {
      errors.push('maxTokens 不能为负数')
    }

    // 验证模型特定参数
    this.validateModelSpecificParams(params, errors)

    // 生成标准化参数
    const normalizedParams = this.normalizeParams(params)
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedParams
    }
  }

  // 格式化错误
  formatError(error: any): ModelError {
    if (error.response) {
      // HTTP 错误
      return {
        code: `HTTP_${error.response.status}`,
        message: error.response.data?.error?.message || error.message,
        details: error.response.data,
        retryable: error.response.status >= 500 || error.response.status === 429
      }
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        code: 'NETWORK_ERROR',
        message: '网络连接失败',
        details: error,
        retryable: true
      }
    }
    
    if (error.code === 'ENOTFOUND') {
      return {
        code: 'DNS_ERROR',
        message: 'DNS 解析失败',
        details: error,
        retryable: true
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || '未知错误',
      details: error,
      retryable: false
    }
  }

  // 合并默认参数
  protected mergeParams(params: Partial<LLMParams>): LLMParams {
    return {
      ...this.model.defaultParams,
      ...params
    }
  }

  // 验证模型特定参数（子类实现）
  protected abstract validateModelSpecificParams(params: Partial<LLMParams>, errors: string[]): void

  // 标准化参数（子类实现）
  protected abstract normalizeParams(params: Partial<LLMParams>): LLMParams

  // HTTP 请求工具
  protected async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const timeout = this.config.timeout || 30000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // 全局代理会自动应用到这个 fetch 调用
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...options.headers
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        let errorBody: any = {};
        try {
          errorBody = await response.json();
        } catch (e) {
          errorBody = { message: await response.text().catch(() => 'Failed to read response text') };
        }
        console.error("API Error Response:", errorBody);
        const errorMessage = errorBody.error?.message || errorBody.message || response.statusText;
        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      }
      
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.message.includes('fetch failed')) {
        console.error(`Fetch failed for URL: ${url}. This is often a network/proxy issue.`);
      }
      throw error
    }
  }

  // 重试机制
  protected async withRetry<T>(
    fn: () => Promise<T>, 
    maxRetries: number = this.config.retries || 3
  ): Promise<T> {
    let lastError: Error
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        const modelError = this.formatError(error)
        
        if (!modelError.retryable || i === maxRetries - 1) {
          throw error
        }
        
        // 指数退避
        const delay = Math.pow(2, i) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }
}

// 流式响应工具
export async function* createStreamResponse(
  response: Response,
  parser: (line: string) => LLMResponseChunk | null
): AsyncIterable<LLMResponseChunk> {
  if (!response.body) {
    throw new Error('Response body is empty')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留最后一个不完整的行

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine === '') continue
        
        const chunk = parser(trimmedLine)
        if (chunk) {
          yield chunk
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// 解析 SSE 格式的流式响应
export function parseSSELine(line: string): LLMResponseChunk | null {
  if (line.startsWith('data: ')) {
    const data = line.slice(6)
    if (data === '[DONE]') {
      return { finishReason: 'stop' }
    }
    
    try {
      const parsed = JSON.parse(data)
      return {
        id: parsed.id,
        content: parsed.choices?.[0]?.delta?.content || '',
        role: parsed.choices?.[0]?.delta?.role,
        finishReason: parsed.choices?.[0]?.finish_reason,
        usage: parsed.usage
      }
    } catch {
      return null
    }
  }
  
  return null
}