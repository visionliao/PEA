/**
 * 大模型架构使用示例
 * 这个文件展示了如何使用 modelService 进行各种模型调用
 */

import { modelService } from '@/lib/model-service'
import { LLMRequest, LLMResponse } from '@/types/llm'
import { createMessages } from '@/lib/type-utils'
import { useState } from 'react'

// =============================================================================
// 1. 基础使用示例
// =============================================================================

/**
 * 初始化模型服务
 * 在应用启动时调用一次
 */
export async function initializeExample() {
  try {
    await modelService.initialize()
    console.log('✅ 模型服务初始化成功')
  } catch (error) {
    console.error('❌ 模型服务初始化失败:', error)
  }
}

/**
 * 获取可用模型列表
 */
export async function getAvailableModelsExample() {
  const availableModels = modelService.getAvailableModels()
  console.log('📋 可用模型列表:')
  availableModels.forEach(model => {
    console.log(`  - ${model.name} (${model.id}) - ${model.provider}`)
  })
  return availableModels
}

/**
 * 基础模型调用示例
 */
export async function basicCallExample() {
  const request: LLMRequest = {
    messages: createMessages.simple(
      '请用简短的语言介绍一下React的主要特点。',
      '你是一个专业的AI助手。'
    ),
    params: {
      temperature: 0.7,
      maxTokens: 500
    }
  }

  try {
    const result = await modelService.call({
      modelId: 'gpt-4o',
      request,
      onComplete: (response: LLMResponse) => {
        console.log('✅ 调用完成:', response.content)
      }
    })

    if (result.success) {
      console.log('🎉 调用成功!')
      console.log('💬 回复内容:', result.response?.content)
      console.log('📊 使用情况:', result.usage)
      console.log('⏱️ 耗时:', result.duration, 'ms')
    } else {
      console.error('❌ 调用失败:', result.error?.message)
    }
    
    return result
  } catch (error) {
    console.error('❌ 调用异常:', error)
    throw error
  }
}

// =============================================================================
// 2. 高级功能示例
// =============================================================================

/**
 * 流式调用示例 - 实时显示回复内容
 */
export async function streamCallExample() {
  const request: LLMRequest = {
    messages: createMessages.simple('请讲一个简短的科技故事')
  }

  let fullContent = ''
  
  try {
    const result = await modelService.call({
      modelId: 'gpt-4o',
      request,
      stream: true,
      onProgress: (chunk) => {
        if (chunk.content) {
          fullContent += chunk.content
          // 实时输出内容 (在实际应用中可以更新UI)
          process.stdout.write(chunk.content)
        }
      },
      onComplete: (response) => {
        console.log('\n✅ 流式调用完成!')
      }
    })

    console.log('\n📝 完整内容:', fullContent)
    return result
  } catch (error) {
    console.error('❌ 流式调用失败:', error)
    throw error
  }
}

/**
 * 批量调用示例 - 同时调用多个模型或发送多个请求
 */
export async function batchCallExample() {
  const requests = [
    {
      modelId: 'gpt-4o',
      request: { 
        messages: createMessages.simple('用一句话介绍JavaScript') 
      }
    },
    {
      modelId: 'gemini-2.5-flash',
      request: { 
        messages: createMessages.simple('用一句话介绍Python') 
      }
    },
    {
      modelId: 'gpt-4o-mini',
      request: { 
        messages: createMessages.simple('用一句话介绍TypeScript') 
      }
    }
  ]

  try {
    console.log('🚀 开始批量调用...')
    const batchResults = await modelService.batchCall(requests)
    
    console.log('📋 批量调用结果:')
    batchResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      const modelId = requests[index].modelId
      console.log(`${status} ${modelId}:`, 
        result.success ? result.response?.content : result.error?.message
      )
    })
    
    return batchResults
  } catch (error) {
    console.error('❌ 批量调用失败:', error)
    throw error
  }
}

/**
 * 模型比较示例 - 用同一个prompt测试不同模型
 */
export async function modelComparisonExample() {
  const prompt = '请解释什么是人工智能？用通俗易懂的语言。'
  const modelIds = ['gpt-4o', 'gemini-2.5-flash', 'gpt-4o-mini']

  try {
    console.log('🔍 开始模型比较...')
    const comparison = await modelService.compareModels(modelIds, prompt)
    
    console.log('📊 模型比较结果:')
    comparison.forEach(({ modelId, result }) => {
      const status = result.success ? '✅' : '❌'
      const duration = result.duration
      console.log(`\n${status} ${modelId} (${duration}ms):`)
      if (result.success) {
        console.log(`  💬 ${result.response?.content?.substring(0, 100)}...`)
        if (result.usage) {
          console.log(`  📊 Tokens: ${result.usage.totalTokens}`)
        }
      } else {
        console.log(`  ❌ ${result.error?.message}`)
      }
    })
    
    return comparison
  } catch (error) {
    console.error('❌ 模型比较失败:', error)
    throw error
  }
}

// =============================================================================
// 3. 实用功能示例
// =============================================================================

/**
 * 获取任务推荐模型
 */
export function getRecommendedModelsExample() {
  const tasks = ['coding', 'writing', 'analysis', 'chat', 'translation']
  
  tasks.forEach(task => {
    const recommended = modelService.getRecommendedModels(task)
    console.log(`🎯 ${task} 任务推荐模型:`, recommended.join(', '))
  })
}

/**
 * 模型配置验证
 */
export function validateModelConfigExample() {
  const modelIds = ['gpt-4o', 'gemini-2.5-flash', 'invalid-model']
  
  modelIds.forEach(modelId => {
    const validation = modelService.validateModel(modelId)
    const status = validation.isValid ? '✅' : '❌'
    console.log(`${status} ${modelId}:`, 
      validation.isValid ? '配置有效' : validation.errors.join(', ')
    )
  })
}

/**
 * 模型测试 - 快速验证模型是否可用
 */
export async function testModelExample() {
  const modelIds = ['gpt-4o', 'gemini-2.5-flash']
  
  for (const modelId of modelIds) {
    try {
      console.log(`🧪 测试模型: ${modelId}`)
      const result = await modelService.testModel(modelId)
      
      if (result.success) {
        console.log(`✅ ${modelId} 测试成功`)
        console.log(`  💬 ${result.response?.content?.substring(0, 50)}...`)
      } else {
        console.log(`❌ ${modelId} 测试失败:`, result.error?.message)
      }
    } catch (error) {
      console.log(`❌ ${modelId} 测试异常:`, error)
    }
  }
}

// =============================================================================
// 4. React 组件示例
// =============================================================================

/**
 * React Hook 示例 - 在组件中使用模型服务
 */
export function useModelCall() {
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const callModel = async (prompt: string, modelId: string = 'gpt-4o') => {
    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      const result = await modelService.call({
        modelId,
        request: {
          messages: createMessages.simple(prompt)
        }
      })
      
      if (result.success && result.response) {
        setResponse(result.response.content)
      } else {
        setError(result.error?.message || '调用失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  return { response, isLoading, error, callModel }
}

/**
 * React 组件示例
 */
export function ModelExample() {
  const [prompt, setPrompt] = useState('你好，请介绍一下你自己')
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const { response, isLoading, error, callModel } = useModelCall()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    callModel(prompt, selectedModel)
  }

  // 获取可用模型列表
  const availableModels = modelService.getAvailableModels()

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">大模型调用示例</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">选择模型</label>
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">输入提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2 border rounded-md h-24"
            placeholder="请输入您的问题..."
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '调用中...' : '调用模型'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">错误</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {response && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h3 className="text-green-800 font-medium">模型响应</h3>
          <p className="text-green-700 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// 5. 完整示例 - 运行所有演示
// =============================================================================

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('🚀 开始运行大模型架构示例...')
  console.log('=====================================')

  try {
    // 1. 初始化
    await initializeExample()
    
    // 2. 获取模型列表
    await getAvailableModelsExample()
    
    // 3. 基础调用
    await basicCallExample()
    
    // 4. 流式调用
    await streamCallExample()
    
    // 5. 批量调用
    await batchCallExample()
    
    // 6. 模型比较
    await modelComparisonExample()
    
    // 7. 实用功能
    getRecommendedModelsExample()
    validateModelConfigExample()
    await testModelExample()
    
    console.log('=====================================')
    console.log('✅ 所有示例运行完成!')
    
  } catch (error) {
    console.error('❌ 示例运行失败:', error)
  }
}

// 如果直接运行此文件，执行所有示例
if (typeof window === 'undefined') {
  // Node.js 环境
  runAllExamples().catch(console.error)
}