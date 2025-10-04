# 大模型架构示例

本目录包含了大模型架构的使用示例，帮助开发者快速理解和使用这个灵活的AI模型集成系统。

## 📁 文件说明

### `examples/model-usage.tsx`
完整的调用示例文件，包含：

1. **基础使用示例**
   - 初始化模型服务
   - 获取可用模型列表
   - 基础模型调用

2. **高级功能示例**
   - 流式调用（实时显示回复）
   - 批量调用（并行处理）
   - 模型比较（同一prompt测试不同模型）

3. **实用功能示例**
   - 获取任务推荐模型
   - 模型配置验证
   - 模型连接测试

4. **React集成示例**
   - 自定义 Hook `useModelCall`
   - 完整的React组件示例
   - 错误处理和加载状态

5. **完整演示**
   - `runAllExamples()` - 运行所有示例函数

## 🚀 快速开始

### 1. 在组件中使用

```tsx
import { useModelCall } from '@/examples/model-usage'

function MyComponent() {
  const { response, isLoading, error, callModel } = useModelCall()
  
  return (
    <div>
      <button onClick={() => callModel('你好', 'gpt-4o')}>
        调用模型
      </button>
      {isLoading && <p>加载中...</p>}
      {response && <p>{response}</p>}
    </div>
  )
}
```

### 2. 使用类型工具函数

```tsx
import { createMessages } from '@/lib/type-utils'

// 创建简单消息（用户 + 可选系统）
const messages = createMessages.simple(
  '用户输入内容',
  '可选的系统提示'
)

// 创建对话消息
const conversation = createMessages.conversation([
  { role: 'system', content: '你是助手' },
  { role: 'user', content: '问题' },
  { role: 'assistant', content: '回答' },
  { role: 'user', content: '追问' }
])

// 避免类型错误的方法
const request = {
  messages: createMessages.simple('Hello') // 自动处理类型
}
```

### 3. 直接调用示例函数

```tsx
import { basicCallExample, streamCallExample } from '@/examples/model-usage'

// 基础调用
await basicCallExample()

// 流式调用
await streamCallExample()
```

### 4. 运行完整演示

```tsx
import { runAllExamples } from '@/examples/model-usage'

// 运行所有示例（适合在开发环境中测试）
await runAllExamples()
```

## 🎯 主要功能演示

### 基础调用
```tsx
const result = await modelService.call({
  modelId: 'gpt-4o',
  request: {
    messages: [{ role: 'user', content: 'Hello' }]
  }
})
```

### 流式调用
```tsx
await modelService.call({
  modelId: 'gpt-4o',
  request: { messages: [{ role: 'user', content: '讲故事' }] },
  stream: true,
  onProgress: (chunk) => {
    console.log(chunk.content) // 实时输出
  }
})
```

### 批量调用
```tsx
const results = await modelService.batchCall([
  { modelId: 'gpt-4o', request: {...} },
  { modelId: 'gemini-2.5-flash', request: {...} }
])
```

### 模型比较
```tsx
const comparison = await modelService.compareModels(
  ['gpt-4o', 'gemini-2.5-flash'],
  '解释什么是AI？'
)
```

## 🔧 配置要求

确保 `.env` 文件中配置了相应的API密钥：

```bash
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
```

## 📚 学习路径

1. **先看基础示例** - 理解基本的调用方式
2. **尝试高级功能** - 学习流式和批量调用
3. **集成到项目** - 使用提供的Hook和组件
4. **自定义扩展** - 基于架构添加新功能

## 💡 最佳实践

1. **初始化** - 在应用启动时调用 `modelService.initialize()`
2. **错误处理** - 始终处理调用失败的情况
3. **加载状态** - 在UI中显示加载状态
4. **模型选择** - 根据任务类型选择合适的模型
5. **成本控制** - 注意token使用量，避免超支

## 🔍 故障排除

### 常见问题

1. **API密钥错误**
   - 检查 `.env` 文件配置
   - 确认密钥格式正确

2. **模型未找到**
   - 确认模型ID正确
   - 检查提供商是否启用

3. **网络连接问题**
   - 检查代理设置
   - 确认网络可以访问API

4. **类型错误**
   - 使用 `createMessages` 工具函数避免类型问题
   - 确保消息的 `role` 字段是联合类型而不是普通字符串
   - 参考 [类型工具函数](#2-使用类型工具函数) 部分

### 调试方法

```tsx
// 1. 检查可用模型
const models = modelService.getAvailableModels()
console.log(models)

// 2. 验证配置
const validation = modelService.validateModel('gpt-4o')
console.log(validation)

// 3. 测试连接
const test = await modelService.testModel('gpt-4o')
console.log(test)
```

## 📝 注意事项

- 示例代码中的模型ID需要替换为实际可用的模型
- 流式调用需要在支持的环境中运行
- 生产环境中应该添加更多的错误处理和日志记录
- 注意API调用的成本控制

## 🤝 贡献

欢迎根据实际项目需求修改和扩展这些示例！