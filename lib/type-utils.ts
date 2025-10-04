/**
 * 类型工具函数
 * 帮助简化类型断言和类型转换
 */

import { LLMMessage } from '@/types/llm'

// 创建消息的工具函数
export const createMessage = {
  system: (content: string): LLMMessage => ({ role: 'system', content }),
  user: (content: string): LLMMessage => ({ role: 'user', content }),
  assistant: (content: string): LLMMessage => ({ role: 'assistant', content }),
  function: (content: string, name?: string): LLMMessage => ({ 
    role: 'function', 
    content, 
    name 
  }),
  tool: (content: string, toolCalls?: any[]): LLMMessage => ({ 
    role: 'tool', 
    content, 
    toolCalls 
  })
}

// 创建快捷消息数组
export const createMessages = {
  conversation: (messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): LLMMessage[] => {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  },
  
  simple: (userContent: string, systemContent?: string): LLMMessage[] => {
    const messages: LLMMessage[] = []
    
    if (systemContent) {
      messages.push(createMessage.system(systemContent))
    }
    
    messages.push(createMessage.user(userContent))
    return messages
  }
}

// 类型守卫函数
export const isLLMMessage = (message: any): message is LLMMessage => {
  return typeof message === 'object' && 
         typeof message.role === 'string' && 
         typeof message.content === 'string' &&
         ['system', 'user', 'assistant', 'function', 'tool'].includes(message.role)
}

// 安全的消息转换
export const toLLMMessage = (message: any): LLMMessage => {
  if (isLLMMessage(message)) {
    return message
  }
  
  // 尝试转换简单的消息格式
  if (typeof message.role === 'string' && typeof message.content === 'string') {
    return {
      role: message.role as LLMMessage['role'],
      content: message.content
    }
  }
  
  throw new Error('Invalid message format')
}

// 批量转换消息
export const toLLMMessages = (messages: any[]): LLMMessage[] => {
  return messages.map(toLLMMessage)
}