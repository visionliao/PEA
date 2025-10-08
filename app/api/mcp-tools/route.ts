import { NextRequest, NextResponse } from 'next/server'

// 定义从OpenAPI schema中解析出的参数类型
interface ApiParameter {
  title?: string;
  type?: string;
  description?: string;
  default?: any;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json(
      { error: 'Missing MCP server URL parameter' },
      { status: 400 }
    )
  }

  try {
    // 标准化 URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl
    }

    // 确保 URL 以 / 结尾
    if (!normalizedUrl.endsWith('/')) {
      normalizedUrl += '/'
    }

    const toolsUrl = `${normalizedUrl}tools`
    console.log(`Fetching tools from custom endpoint: ${toolsUrl}`)

    // 连接到MCP服务器获取工具列表
    const response = await fetch(toolsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 设置10秒超时
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`MCP server responded with ${response.status}:`, errorText)
      throw new Error(`MCP server error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('MCP server response:', data)
    if (!data.success) {
      throw new Error(data.error || 'Server returned an error while fetching tools')
    }

    return NextResponse.json({
      success: true,
      tools: data.tools,
      serverUrl: normalizedUrl,
    })
  } catch (error: any) {
    console.error('MCP server connection error:', error)
    
    let errorMessage = 'Failed to connect to MCP server'
    if (error.name === 'AbortError') {
      errorMessage = 'Connection timeout'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused'
    } else {
      errorMessage = error.message || errorMessage
    }

    return NextResponse.json(
      { error: errorMessage, details: error.toString() },
      { status: 500 }
    )
  }
}