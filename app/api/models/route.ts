import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // 获取所有环境变量
    const allEnvVars = process.env

    // 找到所有API_KEY和MODEL_LIST配置
    const providerConfigs: { [key: string]: any } = {}
    const allModels: any[] = []

    // 颜色数组
    const colors = ['blue', 'green', 'purple', 'orange', 'red', 'cyan', 'yellow', 'pink', 'indigo', 'teal']
    let colorIndex = 0

    // 遍历环境变量，动态查找所有API_KEY配置
    Object.keys(allEnvVars).forEach(key => {
      if (key.endsWith('_API_KEY') && key.startsWith('NEXT_PUBLIC_')) {
        const provider = key.replace('_API_KEY', '').replace('NEXT_PUBLIC_', '').toLowerCase()
        const modelListKey = key.replace('_API_KEY', '_MODEL_LIST')

        const apiKey = allEnvVars[key] || ''
        const modelListStr = allEnvVars[modelListKey] || ''

        if (apiKey && modelListStr) {
          const modelList = modelListStr.split(',').filter(Boolean)
          const displayName = provider.charAt(0).toUpperCase() + provider.slice(1)
          const color = colors[colorIndex % colors.length]

          providerConfigs[provider] = {
            apiKey,
            modelList,
            displayName,
            color
          }

          // 为每个模型创建配置
          modelList.forEach(model => {
            allModels.push({
              name: model,
              provider,
              color
            })
          })

          colorIndex++
        }
      }
    })

    // 获取默认模型配置
    const defaultModels = {
      promptModel: process.env.NEXT_PUBLIC_DEFAULT_PROMPT_MODEL || '',
      workModel: process.env.NEXT_PUBLIC_DEFAULT_WORK_MODEL || '',
      scoreModel: process.env.NEXT_PUBLIC_DEFAULT_SCORE_MODEL || ''
    }

    return NextResponse.json({
      providers: providerConfigs,
      models: allModels,
      defaultModels
    })
  } catch (error) {
    console.error('Error loading model configurations:', error)
    return NextResponse.json({ error: 'Failed to load model configurations' }, { status: 500 })
  }
}