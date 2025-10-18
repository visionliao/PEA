import { NextRequest, NextResponse } from 'next/server'
import { readFile, mkdir, writeFile, readdir } from 'fs/promises'
import { join } from 'path'
import { handleChat } from '@/lib/llm/model-service';
import { ChatMessage, LlmGenerationOptions, NonStreamingResult } from '@/lib/llm/types';

// 安全调用大模型包装器，可以重试
interface SafeCallResult {
  success: boolean;
  content?: string;
  error?: string;
}

async function safeModelCall(
  selectedModel: string,
  messages: ChatMessage[],
  options: LlmGenerationOptions,
  retries = 2 // 默认重试2次
): Promise<SafeCallResult> {
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) {
        console.log(`[safeModelCall] Retrying... (Attempt ${i + 1})`);
        // 在重试前可以增加一个短暂的延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const result = await handleChat(selectedModel, messages, options) as NonStreamingResult;

      if (result && typeof result.content === 'string') {
        return { success: true, content: result.content };
      } else {
        // 记录非致命错误，但继续循环以重试
        const errorMessage = "Model call succeeded but returned unexpected format.";
        console.error(`[safeModelCall] Attempt ${i + 1} failed:`, errorMessage, result);
        if (i === retries) { // 如果这是最后一次重试
          return { success: false, error: errorMessage };
        }
      }
    } catch (error: any) {
      console.error(`[safeModelCall] Attempt ${i + 1} for ${selectedModel} caught a critical error:`, error);
      if (i === retries) { // 如果这是最后一次重试
        return { success: false, error: error.message || "A critical error occurred during model call" };
      }
    }
  }
  // 理论上不会执行到这里，但在 TS 中为了类型安全返回一个默认失败结果
  return { success: false, error: "Exited retry loop unexpectedly" };
}

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

  let config;
  try {
    config = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

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

  // 创建基础项目上下文（不包含MCP工具）
  let baseProjectContext = `# 项目: ${config.project.projectName}\n\n## 项目背景\n${config.project.projectBackground}\n\n`
  const knowledgeDir = join(process.cwd(), "output", "project", config.project.projectName, "knowledge")
  try {
    const knowledgeFiles = await readdir(knowledgeDir)
    for (const fileName of knowledgeFiles) {
      const content = await readFile(join(knowledgeDir, fileName), 'utf-8')
      baseProjectContext += `## 知识库文件: ${fileName}\n${content}\n\n`
      console.error(`读取知识库文件 ${fileName} 成功， 上下文长度: ${baseProjectContext.length}`);
    }
  } catch (e) {
      onProgress({ type: 'log', message: `警告: 未找到或无法读取知识库目录: ${knowledgeDir}` })
  }

  // 创建用于提示词生成的上下文（包含MCP工具JSON）
  const promptGenContext = baseProjectContext + `## 可用工具 (MCP Tools)\n\`\`\`json\n${JSON.stringify(config.project.mcpTools, null, 2)}\n\`\`\``
  console.error(`提示词生成上下文创建完成，包含MCP工具，长度: ${promptGenContext.length}`);

  // 创建用于工作模型的上下文（不包含MCP工具JSON）
  const workContext = baseProjectContext
  console.error(`工作模型上下文创建完成，不包含MCP工具，长度: ${workContext.length}`);

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
      const promptString = `以下项目背景资料和提示词框架定义。

        **项目背景和资料:**
        ${promptGenContext}

        ---

        **提示词框架定义:**
        名称: ${framework.name}
        描述: ${framework.description}
        核心构成:
        ${framework.properties.map((p: any) => `- ${p.name}: ${p.description}`).join('\n')}

        ---`;
      const promptMessage = '你的任务是结合项目背景和框架定义，为我生成一个高质量的系统提示词 (System Prompt)。严格根据提示词框架定义输出提示词内容，不要包含任何额外的解释或标题。';
      const promptGenMessages: ChatMessage[] = [
        {
          role: 'user',
          content: promptMessage,
        }
      ];
      const promptModelConfig = config.models.promptParams || {};
      const promptOptions: LlmGenerationOptions = {
        stream: false,
        timeoutMs: 90000,
        maxOutputTokens: promptModelConfig.maxTokens?.[0] || 8192,
        temperature: promptModelConfig.temperature?.[0] || 1.0,
        topP: promptModelConfig.topP?.[0] || 1.0,
        presencePenalty: promptModelConfig.presencePenalty?.[0] || 0.0,
        frequencyPenalty: promptModelConfig.frequencyPenalty?.[0] || 0.0, // 词汇丰富度,默认0，范围-2.0-2.0,值越大，用词越丰富多样；值越低，用词更朴实简单
        systemPrompt: promptString, // 系统提示词
        maxToolCalls: 10 // 最大工具调用次数
      };

      // console.log(`提示词模型: ${config.models.prompt}`);
      const promptResult = await safeModelCall(config.models.prompt, promptGenMessages, promptOptions);
      currentTask++;

      // 如果生成系统提示词失败，跳过这个框架
      if (!promptResult.success) {
        console.error(`FATAL: Failed to generate system prompt for framework [${framework.name}]. Skipping this framework. Error: ${promptResult.error}`);
        onProgress({ type: 'log', message: `错误: 无法为框架 [${framework.name}] 生成系统提示词，已跳过。` });
        // 将这个框架下剩余的任务数从总数中扣除，以保证进度条准确性
        const tasksToSkip = 1 + config.testCases.length * 2;
        currentTask += (tasksToSkip - 1); // 已经加过1了，所以-1
        continue; // 直接进入下一个 for 循环（下一个框架）
      }
      const systemPromptFramework = promptResult.content!
      await writeFile(join(frameworkDir, `${framework.name}.md`), systemPromptFramework, 'utf-8')

      onProgress({ 
        type: 'state_update', 
        payload: {
          frameworkName: framework.name, loop: loop, totalLoops: config.testConfig.loopCount,
          systemPrompt: systemPromptFramework, questionId: undefined, questionText: undefined,
          modelAnswer: undefined, score: undefined, maxScore: undefined,
        }
      });

      // 为工作模型创建一个包含所有背景知识的系统提示词（不包含MCP工具JSON）
      const finalSystemPrompt = `
        # 指令与规则
        你必须严格遵守以下指令和规则来回答问题。
        ${systemPromptFramework}

        ---

        # 背景资料与知识库
        在回答问题时，你必须参考和利用以下信息。
        ${workContext}
      `;
      let qaResults: any[] = [];

      // 步骤 5: 循环处理所有问题
      for (const testCase of config.testCases) {
        // 步骤 3: 工作模型回答问题
        let score = 0;
        let modelAnswer = "N/A (调用失败)";
        currentTask++;
        onProgress({ type: 'update', payload: { activeTaskMessage: `[${framework.name}] 正在回答问题 ${testCase.id}...`, progress: (currentTask / totalTasks) * 100, currentTask: currentTask } })

        const workModelConfig = config.models.workParams || {};
        // 从项目配置中获取MCP服务器地址
        const mcpServerUrl = config.project.mcpToolsCode && config.project.mcpToolsCode.trim()
          ? config.project.mcpToolsCode.trim() : '';
        
        const workOptions: LlmGenerationOptions = {
          stream: false,
          timeoutMs: 90000,
          maxOutputTokens: workModelConfig.maxTokens?.[0] || 8192,
          temperature: workModelConfig.temperature?.[0] || 1.0,
          topP: workModelConfig.topP?.[0] || 1.0,
          presencePenalty: workModelConfig.presencePenalty?.[0] || 0.0,
          frequencyPenalty: workModelConfig.frequencyPenalty?.[0] || 0.0, // 词汇丰富度,默认0，范围-2.0-2.0,值越大，用词越丰富多样；值越低，用词更朴实简单
          mcpServerUrl: mcpServerUrl, // 从项目配置获取mcp服务器地址
          systemPrompt: finalSystemPrompt, // 系统提示词
          maxToolCalls: 10 // 最大工具调用次数
        };
        const workMessages: ChatMessage[] = [
          {
            role: 'user',
            content: testCase.question,
          }
        ];
        // console.log(`工作模型: ${config.models.work}`);
        const workResult = await safeModelCall(config.models.work, workMessages, workOptions);
        if (workResult.success) {
          modelAnswer = workResult.content!;
        } else {
          onProgress({ type: 'log', message: `警告: 回答问题 #${testCase.id} 失败，已跳过评分。` });
        }

        onProgress({ type: 'state_update', payload: { questionId: testCase.id, questionText: testCase.question, modelAnswer, score: undefined, maxScore: undefined } });

        // 步骤 4: 评分模型进行评分（如果回答成功，才进行评分）
        currentTask++;
        if (workResult.success) {
          onProgress({ type: 'update', payload: { activeTaskMessage: `[${framework.name}] 正在评估问题 ${testCase.id}...`, progress: (currentTask / totalTasks) * 100, currentTask: currentTask } });
          const scoreSystemPrompt = `你是一位极其严谨、注重事实的评估专家。你的任务是基于“标准答案”，评估“模型的回答”是否准确、完整地解决了用户的“问题”。

            请严格遵循以下【思考与评估步骤】：

            **第一步：核心事实核对**
            1.  仔细阅读“标准答案”，提取出其中所有关键的事实信息点（Key Facts），特别是数字、价格、地点、专有名词等。
            2.  逐一核对“模型的回答”中是否包含了这些关键事实点。
            3.  判断“模型的回答”中出现的数字、价格等信息，是否与“标准答案”中的信息完全一致。如果不一致，这是一个严重的错误。

            **第二步：语义与意图评估**
            1.  评估“模型的回答”的整体含义是否与“标准答案”的核心意图一致。它是否正确回答了用户的原始“问题”？
            2.  “标准答案”只是一个参考，可能并不完整。“模型的回答”可以包含比“标准答案”更多、更详细的正确信息。只要这些额外信息是与问题相关的、有帮助的，就不应该扣分，甚至可以认为是加分项。
            3.  忽略无关紧要的措辞差异。例如，“我们提供接送服务”和“是的，公寓有接送服务”是等价的。

            **第三步：最终评分**
            1.  综合以上分析，给出一个最终分数。满分为 ${testCase.score} 分。
            2.  评分标准：
                *   **满分 (${testCase.score}分)**: “模型的回答”包含了“标准答案”中所有的关键事实点，所有数字都准确无误，并且可能还提供了一些有用的补充信息。
                *   **高分 (7-${testCase.score - 1}分)**: 基本覆盖了所有关键事实，但可能遗漏了某个次要信息点，或者措辞上有些许不完美。
                *   **中等分数 (4-6分)**: 遗漏了重要的事实信息，或者出现了不影响核心意图的数字错误。
                *   **低分 (1-3分)**: 出现了严重的事实错误（例如价格、地址完全错误），或者回答基本没有解决用户的问题。
                *   **0分**: 完全错误的回答，或者产生了有害的幻觉。

            **输出要求：**
            在完成上述所有思考步骤后，最终只输出一个阿拉伯数字作为你的最终分数。不要包含任何解释、理由、标题或任何其他文字。`;

          const scoreMessage = `
          ---
          **问题:**
          ${testCase.question}

          ---
          **标准答案 (参考事实来源):**
          ${testCase.answer}

          ---
          **模型的回答 (待评估对象):**
          ${modelAnswer}
          `;
          const scoreModelConfig = config.models.scoreParams || {};
          const scoreOptions: LlmGenerationOptions = {
            stream: false,
            timeoutMs: 90000,
            maxOutputTokens: scoreModelConfig.maxTokens?.[0] || 8192,
            temperature: scoreModelConfig.temperature?.[0] || 1.0,
            topP: scoreModelConfig.topP?.[0] || 1.0,
            presencePenalty: scoreModelConfig.presencePenalty?.[0] || 0.0,
            frequencyPenalty: scoreModelConfig.frequencyPenalty?.[0] || 0.0, // 词汇丰富度,默认0，范围-2.0-2.0,值越大，用词越丰富多样；值越低，用词更朴实简单
            systemPrompt: scoreSystemPrompt, // 系统提示词
            maxToolCalls: 10 // 最大工具调用次数
          };
          const scoreGenMessages: ChatMessage[] = [
            {
              role: 'user',
              content: scoreMessage,
            }
          ];
          // console.log(`评分模型: ${config.models.score}`);
          const scoreResult = await safeModelCall(config.models.score, scoreGenMessages, scoreOptions);

          if (scoreResult.success) {
            score = parseInt(scoreResult.content!.trim().match(/\d+/)?.[0] || '0', 10);
          } else {
             onProgress({ type: 'log', message: `警告: 评估问题 #${testCase.id} 失败。` });
          }
        }
        onProgress({ type: 'state_update', payload: { score: score, maxScore: testCase.score } });

        const resultEntry = { id: testCase.id, question: testCase.question, standardAnswer: testCase.answer, modelAnswer, maxScore: testCase.score, score: score, error: workResult.error };
        qaResults.push(resultEntry);
        await writeFile(join(frameworkDir, 'results.json'), JSON.stringify(qaResults, null, 2), 'utf-8');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
}