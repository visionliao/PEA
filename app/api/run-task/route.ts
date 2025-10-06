import { NextRequest } from 'next/server'
import { readFile, mkdir, writeFile, readdir } from 'fs/promises'
import { join } from 'path'
import { modelService } from '@/lib/model-service'
import { createMessage, createMessages } from '@/lib/type-utils'
import { LLMMessage } from '@/types/llm'

// Helper to format date for directory name (YYMMDD_HHMMSS)
function getTimestamp() {
  const now = new Date()
  const pad = (num: number) => num.toString().padStart(2, '0')
  const year = now.getFullYear().toString().slice(-2)
  const month = pad(now.getMonth() + 1)
  const day = pad(now.getDate())
  const hours = pad(now.getHours())
  const minutes = pad(now.getMinutes())
  const seconds = pad(now.getSeconds())
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

// Helper to send SSE messages in the correct format
function sendEvent(controller: ReadableStreamDefaultController, data: object) {
  try {
    controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
  } catch (e) {
    console.error("Failed to enqueue data, stream might be closed:", e);
  }
}

// 确保此路由在每次请求时都动态执行，而不是在构建时静态生成
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("--- New Request Received ---");
  console.log("HTTPS_PROXY Environment Variable:", process.env.HTTPS_PROXY || "NOT SET!");

  let config;
  try {
    config = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  // 在服务器端初始化 modelService
  await modelService.initialize()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const runTimestamp = getTimestamp()
        const baseResultDir = join(process.cwd(), "output", "result", runTimestamp)
        await mkdir(baseResultDir, { recursive: true })

        sendEvent(controller, { type: 'log', message: `结果目录已创建: ${runTimestamp}` })

        // 调用主任务执行器
        await runTask(config, baseResultDir, (data) => sendEvent(controller, data))

        sendEvent(controller, { type: 'done', message: '所有任务已成功完成。' })
      } catch (error: any) {
        console.error("Task execution error:", error)
        sendEvent(controller, { type: 'error', message: error.message || "发生未知错误" })
      } finally {
        controller.close()
      }
    },
    cancel() {
      console.log("Stream cancelled by client.");
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// 主任务执行器
async function runTask(config: any, baseResultDir: string, onProgress: (data: object) => void) {
  // 总任务数计算公式
  const totalTasks = (config.promptFrameworks.length + config.promptFrameworks.length * config.testCases.length * 2) * config.testConfig.loopCount;
  let currentTask = 0;

  // 步骤 1: 整合项目背景信息
  onProgress({ type: 'log', message: `正在加载项目 '${config.project.projectName}' 的背景资料...` })
  let projectContext = `# 项目: ${config.project.projectName}\n\n## 项目背景\n${config.project.projectBackground}\n\n`
  const knowledgeDir = join(process.cwd(), "output", "project", config.project.projectName, "knowledge")
  try {
    const knowledgeFiles = await readdir(knowledgeDir)
    for (const fileName of knowledgeFiles) {
      const content = await readFile(join(knowledgeDir, fileName), 'utf-8')
      projectContext += `## 知识库文件: ${fileName}\n${content}\n\n`
    }
  } catch (e) {
      onProgress({ type: 'log', message: `警告: 未找到或无法读取知识库目录: ${knowledgeDir}` })
  }
  projectContext += `## 可用工具 (MCP Tools)\n\`\`\`json\n${JSON.stringify(config.project.mcpTools, null, 2)}\n\`\`\``

  // 步骤 7: 外层循环
  for (let loop = 1; loop <= config.testConfig.loopCount; loop++) {
    const loopDir = join(baseResultDir, loop.toString())
    await mkdir(loopDir, { recursive: true })

    // 步骤 6: 遍历框架
    for (const frameworkId of config.promptFrameworks) {
      const framework = config.allFrameworks.find((f: any) => f.id === frameworkId)
      if (!framework) continue

      const frameworkDir = join(loopDir, framework.name)
      await mkdir(frameworkDir, { recursive: true })

      onProgress({ type: 'update', payload: { activeTaskMessage: `[${loop}/${config.testConfig.loopCount}] 为框架 [${framework.name}] 生成系统提示词...` } })

      // 步骤 2: 生成系统提示词
      const promptGenMessages = createMessages.simple(
        `请根据以下项目背景资料和提示词框架定义，为我生成一个高质量的系统提示词 (System Prompt)。

        **项目背景和资料:**
        ${projectContext}

        ---

        **提示词框架定义:**
        名称: ${framework.name}
        描述: ${framework.description}
        核心构成:
        ${framework.properties.map((p: any) => `- ${p.name}: ${p.description}`).join('\n')}

        ---

        你的任务是结合项目背景和框架定义，输出一个可以直接用于指导工作模型的系统提示词。只输出提示词内容，不要包含任何额外的解释或标题。`
      );

      const promptResult = await modelService.call({ modelId: config.models.prompt, request: { messages: promptGenMessages } });
      currentTask++;

      if (!promptResult.success || !promptResult.response) throw new Error(`为框架 [${framework.name}] 生成提示词失败: ${promptResult.error?.message}`)
      const systemPrompt = promptResult.response.content
      await writeFile(join(frameworkDir, `${framework.name}.md`), systemPrompt, 'utf-8')

      onProgress({ 
        type: 'state_update', 
        payload: {
          frameworkName: framework.name, loop: loop, totalLoops: config.testConfig.loopCount,
          systemPrompt: systemPrompt, questionId: undefined, questionText: undefined,
          modelAnswer: undefined, score: undefined, maxScore: undefined,
        }
      });

      let qaResults: any[] = [];

      // 步骤 5: 循环处理所有问题
      for (const testCase of config.testCases) {
        // 步骤 3: 工作模型回答问题
        currentTask++;
        onProgress({ type: 'update', payload: { activeTaskMessage: `[${framework.name}] 正在回答问题 ${testCase.id}...`, progress: (currentTask / totalTasks) * 100, currentTask: currentTask } })

        const workMessages: LLMMessage[] = [createMessage.system(systemPrompt), createMessage.user(testCase.question)];
        const workResult = await modelService.call({ modelId: config.models.work, request: { messages: workMessages } });
        if (!workResult.success || !workResult.response) throw new Error(`工作模型回答问题 ${testCase.id} 失败: ${workResult.error?.message}`);
        const modelAnswer = workResult.response.content;

        onProgress({ type: 'state_update', payload: { questionId: testCase.id, questionText: testCase.question, modelAnswer: modelAnswer, score: undefined, maxScore: undefined } });

        // 步骤 4: 评分模型进行评分
        currentTask++;
        onProgress({ type: 'update', payload: { activeTaskMessage: `[${framework.name}] 正在评估问题 ${testCase.id}...`, progress: (currentTask / totalTasks) * 100, currentTask: currentTask } });

        const scoreMessages = createMessages.simple(
          `你是一个严格的评分专家。请根据以下问题、标准答案和模型的回答，进行评分。
          评分标准：满分 ${testCase.score} 分。请只返回一个阿拉伯数字作为分数，不要包含任何其他文字、符号或解释。

          ---
          **问题:**
          ${testCase.question}

          ---
          **标准答案:**
          ${testCase.answer}

          ---
          **模型的回答:**
          ${modelAnswer}`
        );

        const scoreResult = await modelService.call({ modelId: config.models.score, request: { messages: scoreMessages } });
        if (!scoreResult.success || !scoreResult.response) throw new Error(`评分模型评估问题 ${testCase.id} 失败: ${scoreResult.error?.message}`);
        const score = parseInt(scoreResult.response.content.trim().match(/\d+/)?.[0] || '0', 10);

        onProgress({ type: 'state_update', payload: { score: score, maxScore: testCase.score } });

        const resultEntry = { id: testCase.id, question: testCase.question, standardAnswer: testCase.answer, modelAnswer: modelAnswer, maxScore: testCase.score, score: score };
        qaResults.push(resultEntry);
        await writeFile(join(frameworkDir, 'results.json'), JSON.stringify(qaResults, null, 2), 'utf-8');

        await new Promise(resolve => setTimeout(resolve, 1500)); 
      }
    }
  }
}