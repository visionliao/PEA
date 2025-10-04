// 大模型接口定义
export interface LLMModel {
  // 基础信息
  id: string
  name: string
  provider: string
  version?: string
  
  // 能力描述
  capabilities: {
    streaming: boolean
    functionCalling: boolean
    vision: boolean
    jsonMode: boolean
    maxTokens: number
    supportedLanguages: string[]
  }
  
  // 参数配置
  defaultParams: LLMParams
  supportedParams: string[]
  
  // 成本信息
  pricing?: {
    input: number // 每1K tokens价格
    output: number // 每1K tokens价格
    currency: string
  }
}

// 大模型调用参数
export interface LLMParams {
  temperature: number
  topP: number
  topK?: number
  maxTokens: number
  stop?: string[]
  presencePenalty?: number
  frequencyPenalty?: number
  systemPrompt?: string
  streaming?: boolean
  // 模型特定参数
  [key: string]: any
}

// 大模型请求
export interface LLMRequest {
  messages: LLMMessage[]
  params?: Partial<LLMParams>
  functions?: LLMFunction[]
  tools?: LLMTool[]
}

// 大模型响应
export interface LLMResponse {
  id: string
  content: string
  role: 'assistant'
  finishReason: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  functionCall?: any
  toolCalls?: any
}

// 消息类型
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool'
  content: string
  name?: string
  functionCall?: any
  toolCalls?: any
}

// 函数调用定义
export interface LLMFunction {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

// 工具定义
export interface LLMTool {
  type: 'function'
  function: LLMFunction
}

// 模型适配器接口
export interface ModelAdapter {
  readonly model: LLMModel
  
  // 基础调用
  chat(request: LLMRequest): Promise<LLMResponse>
  
  // 流式调用
  chatStream(request: LLMRequest): AsyncIterable<LLMResponseChunk>
  
  // 验证参数
  validateParams(params: Partial<LLMParams>): ValidationResult
  
  // 格式化错误
  formatError(error: any): ModelError
}

// 流式响应块
export interface LLMResponseChunk {
  id?: string
  content?: string
  role?: string
  finishReason?: string
  usage?: any
  functionCall?: any
  toolCalls?: any
}

// 验证结果
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
  normalizedParams?: LLMParams
}

// 模型错误
export interface ModelError {
  code: string
  message: string
  details?: any
  retryable: boolean
}

// 模型配置
export interface ModelConfig {
  apiKey: string
  baseUrl?: string
  organization?: string
  timeout?: number
  retries?: number
  headers?: Record<string, string>
  proxy?: string
}

// 模型工厂接口
export interface ModelFactory {
  // 创建模型适配器
  createAdapter(model: LLMModel, config: ModelConfig): Promise<ModelAdapter>
  
  // 获取支持的模型列表
  getSupportedModels(): LLMModel[]
  
  // 验证配置
  validateConfig(config: ModelConfig): boolean
}

// 提供商信息
export interface ModelProvider {
  id: string
  name: string
  description: string
  website?: string
  documentation?: string
  models: LLMModel[]
  factory: ModelFactory
  configSchema?: any
}