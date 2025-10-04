"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAppStore } from "@/store/app-store"
import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"

export function RunResults() {
  const [testCasesCount, setTestCasesCount] = useState(0)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [validationMessage, setValidationMessage] = useState("")
  const [currentTask, setCurrentTask] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const cancelledRef = useRef(false)

  const {
    runResultsConfig: {
      runStatus,
      testLoopEnabled,
      testLoopCount,
      scoreThresholdEnabled,
      scoreThreshold,
      totalTestScore
    },
    projectConfig,
    promptFrameworkConfig,
    modelSettingsConfig,
    startRun,
    stopRun,
    setRunResults,
    setRunError,
    setTestLoopEnabled,
    setTestLoopCount,
    setScoreThresholdEnabled,
    setScoreThreshold,
    setTotalTestScore
  } = useAppStore()

  // 加载测试题集数据
  useEffect(() => {
    const loadTestCases = async () => {
      try {
        const response = await fetch("/api/test-cases")
        if (response.ok) {
          const data = await response.json()
          setTestCasesCount(data.checks.length)

          // 计算总分
          const totalScore = data.checks.reduce((sum: number, question: any) => sum + (question.score || 0), 0)
          setTotalTestScore(totalScore)

          // 如果启用了评分阈值且当前阈值大于总分，则调整阈值
          if (scoreThresholdEnabled && scoreThreshold > totalScore) {
            setScoreThreshold(totalScore)
          }
        }
      } catch (error) {
        console.error("Failed to load test cases:", error)
      }
    }

    loadTestCases()
  }, [scoreThresholdEnabled, scoreThreshold, setScoreThreshold, setTotalTestScore])

  // 处理测试循环开关
  const handleTestLoopToggle = (enabled: boolean) => {
    setTestLoopEnabled(enabled)
    if (enabled && scoreThresholdEnabled) {
      setScoreThresholdEnabled(false)
    }
  }

  // 处理评分阈值开关
  const handleScoreThresholdToggle = (enabled: boolean) => {
    setScoreThresholdEnabled(enabled)
    if (enabled && testLoopEnabled) {
      setTestLoopEnabled(false)
    }
    // 启用评分阈值时，默认设置为最大值
    if (enabled && totalTestScore > 0) {
      setScoreThreshold(totalTestScore)
    }
  }

  // 计算总任务数
  const calculateTotalTasks = () => {
    const selectedFrameworksCount = promptFrameworkConfig.selectedFrameworks instanceof Set ? promptFrameworkConfig.selectedFrameworks.size : 0

    // 基础任务：(框架数 + (框架数×问题数) + (框架数×问题数))
    const baseTasks = selectedFrameworksCount + (selectedFrameworksCount * testCasesCount) + (selectedFrameworksCount * testCasesCount)

    if (testLoopEnabled) {
      // 循环测试模式：基础任务 × 循环次数
      return baseTasks * testLoopCount
    } else {
      // 评分阈值模式：基础任务 × 10(固定循环次数)
      return baseTasks * 10
    }
  }

  // 更新任务进度
  const updateTaskProgress = (taskIncrement: number = 1) => {
    setCurrentTask(prev => {
      const newTask = prev + taskIncrement
      let currentTotalTasks = totalTasks

      // 如果totalTasks为0，重新计算正确的总数
      if (currentTotalTasks === 0) {
        currentTotalTasks = calculateTotalTasks()
        setTotalTasks(currentTotalTasks)
      }

      // 评分阈值模式下动态扩展总任务数
      if (!testLoopEnabled && newTask >= currentTotalTasks) {
        currentTotalTasks = newTask + 100
        setTotalTasks(currentTotalTasks)
      }

      // 计算进度百分比
      const newProgress = (newTask / currentTotalTasks) * 100
      setProgress(Math.min(newProgress, 100))

      // 调试信息
      // console.log(`进度更新: ${newTask}/${currentTotalTasks} = ${newProgress}% (模式: ${testLoopEnabled ? '循环' : '评分阈值'})`)

      return newTask
    })
  }

  // 验证运行条件
  const validateRunConditions = () => {
    const errors = []

    // 检查提示词框架
    const selectedFrameworksCount = promptFrameworkConfig.selectedFrameworks instanceof Set ? promptFrameworkConfig.selectedFrameworks.size : 0
    if (selectedFrameworksCount === 0) {
      errors.push("请至少选择一个提示词框架")
    }

    // 检查模型配置
    if (!modelSettingsConfig.promptModel) {
      errors.push("请选择提示词模型")
    }
    if (!modelSettingsConfig.workModel) {
      errors.push("请选择工作模型")
    }
    if (!modelSettingsConfig.scoreModel) {
      errors.push("请选择评分模型")
    }

    // 检查测试题集
    if (testCasesCount === 0) {
      errors.push("请配置测试题集")
    }

    // 检查测试依据
    if (!testLoopEnabled && !scoreThresholdEnabled) {
      errors.push("请至少开启一个测试依据（启用循环测试或启用评分阈值）")
    }

    return errors
  }

  // 处理运行按钮点击
  const handleRunClick = () => {
    const errors = validateRunConditions()
    if (errors.length > 0) {
      setValidationMessage(errors.join("\n"))
      setShowValidationDialog(true)
      return
    }
    handleRun()
  }

  // 处理停止运行
  const handleStopClick = () => {
    setIsCancelled(true)
    cancelledRef.current = true
    stopRun()
    setIsExecuting(false)
    setCurrentTask(0)
    setProgress(0)
  }

  const handleRun = async () => {
    console.log("=== 开始运行提示词工程任务 ===")

    // 防止重复执行
    if (isExecuting) {
      console.log("任务正在执行中，忽略重复请求")
      return
    }

    // 获取当前配置
    const config = {
      project: {
        name: projectConfig.projectName,
        background: projectConfig.projectBackground,
        knowledgeBaseFiles: projectConfig.knowledgeBaseFiles,
        mcpTools: projectConfig.mcpTools
      },
      promptFrameworks: Array.from(promptFrameworkConfig.selectedFrameworks instanceof Set ? promptFrameworkConfig.selectedFrameworks : new Set()),
      models: {
        prompt: modelSettingsConfig.promptModel,
        work: modelSettingsConfig.workModel,
        score: modelSettingsConfig.scoreModel
      },
      modelParams: {
        prompt: modelSettingsConfig.promptModelParams,
        work: modelSettingsConfig.workModelParams,
        score: modelSettingsConfig.scoreModelParams
      },
      testConfig: {
        mode: testLoopEnabled ? 'loop' : 'threshold',
        loopCount: testLoopCount,
        scoreThreshold: scoreThreshold,
        totalTestScore: totalTestScore
      }
    }

    console.log("当前配置：", JSON.stringify(config, null, 2))

    // 重置进度状态
    const calculatedTotalTasks = calculateTotalTasks()
    console.log(`计算的总任务数: ${calculatedTotalTasks}`)

    // 重置取消标志
    setIsCancelled(false)
    cancelledRef.current = false

    // 使用 Promise 确保 states 按顺序更新
    await new Promise(resolve => {
      setTotalTasks(calculatedTotalTasks)
      setCurrentTask(0)
      setProgress(0)
      setIsExecuting(true)
      resolve(null)
    })

    // 再次验证 totalTasks 是否正确设置
    console.log(`任务开始 - totalTasks 应该是 ${calculatedTotalTasks}`)

    // 开始运行
    startRun()

    try {
      // 模拟任务执行流程
      const selectedFrameworksCount = promptFrameworkConfig.selectedFrameworks instanceof Set ? promptFrameworkConfig.selectedFrameworks.size : 0
      const actualLoopCount = testLoopEnabled ? testLoopCount : 10

      // 按 (框架数 + (框架数×问题数) + (框架数×问题数)) × 循环次数 的顺序执行
      // 1. 生成提示词框架任务 (每个框架在每个循环中执行一次)
      for (let k = 0; k < actualLoopCount; k++) {
        // 检查是否取消
        if (cancelledRef.current) {
          console.log("任务被取消，停止执行")
          break
        }

        for (let i = 0; i < selectedFrameworksCount; i++) {
          if (cancelledRef.current) break
          await new Promise(resolve => setTimeout(resolve, 50))
          updateTaskProgress(1)
        }
      }

      // 2. 工作模型运行任务 (每个框架的每个问题在每个循环中执行一次)
      for (let k = 0; k < actualLoopCount; k++) {
        if (cancelledRef.current) {
          console.log("任务被取消，停止执行")
          break
        }

        for (let i = 0; i < selectedFrameworksCount; i++) {
          if (cancelledRef.current) break

          for (let j = 0; j < testCasesCount; j++) {
            if (cancelledRef.current) break

            await new Promise(resolve => setTimeout(resolve, 30))
            updateTaskProgress(1)

            // 模拟评分阈值提前停止
            if (!testLoopEnabled && Math.random() > 0.95) {
              console.log("达到评分阈值，提前停止测试")
              break
            }
          }
        }
      }

      // 3. 评分模型任务 (每个框架的每个问题在每个循环中执行一次)
      for (let k = 0; k < actualLoopCount; k++) {
        if (cancelledRef.current) {
          console.log("任务被取消，停止执行")
          break
        }

        for (let i = 0; i < selectedFrameworksCount; i++) {
          if (cancelledRef.current) break

          for (let j = 0; j < testCasesCount; j++) {
            if (cancelledRef.current) break

            await new Promise(resolve => setTimeout(resolve, 20))
            updateTaskProgress(1)
          }
        }
      }

      // 模拟结果
      const results = [
        {
          id: 1,
          type: "project_analysis",
          message: "项目分析完成",
          data: {
            projectName: config.project.name,
            frameworkCount: config.promptFrameworks.length,
            modelCount: Object.keys(config.models).length
          }
        },
        {
          id: 2,
          type: "framework_processing",
          message: "提示词框架处理完成",
          data: {
            frameworks: config.promptFrameworks
          }
        },
        {
          id: 3,
          type: "model_validation",
          message: "模型配置验证完成",
          data: {
            models: config.models
          }
        }
      ]

      // 只有在没有被取消的情况下才设置结果
      if (!cancelledRef.current) {
        setRunResults(results)
      }
      stopRun()
      setIsExecuting(false)

      console.log(`=== 任务${cancelledRef.current ? '被取消' : '运行完成'} ===`)

    } catch (error) {
      console.error("任务运行失败：", error)
      setRunError(error instanceof Error ? error.message : "未知错误")
      setIsExecuting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border pb-4 md:mb-8">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">运行/结果</h1>
      </div>

      <div className="space-y-6">
        {/* Config Summary */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-base font-medium text-foreground">当前配置概览</Label>
            <p className="text-sm text-muted-foreground mt-1">各面板的配置信息</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-foreground mb-1">项目概况</div>
              <div className="text-muted-foreground">
                项目名: {projectConfig.projectName || "未设置"}
              </div>
              <div className="text-muted-foreground">
                知识库文件: {(projectConfig.knowledgeBaseFiles || []).length} 个
              </div>
              <div className="text-muted-foreground">
                MCP工具: {(projectConfig.mcpTools || []).length} 个
              </div>
            </div>

            <div>
              <div className="font-medium text-foreground mb-1">提示词框架</div>
              <div className="text-muted-foreground">
                已选择: {promptFrameworkConfig.selectedFrameworks instanceof Set ? promptFrameworkConfig.selectedFrameworks.size : 0} 个框架
              </div>
              <div className="text-muted-foreground">
                {Array.from(promptFrameworkConfig.selectedFrameworks instanceof Set ? promptFrameworkConfig.selectedFrameworks : new Set()).join(", ") || "未选择"}
              </div>
            </div>

            <div>
              <div className="font-medium text-foreground mb-1">模型配置</div>
              <div className="text-muted-foreground">
                提示词: {modelSettingsConfig.promptModel || "未选择"}
              </div>
              <div className="text-muted-foreground">
                工作: {modelSettingsConfig.workModel || "未选择"}
              </div>
              <div className="text-muted-foreground">
                评分: {modelSettingsConfig.scoreModel || "未选择"}
              </div>
            </div>

            <div>
              <div className="font-medium text-foreground mb-1">测试题集</div>
              <div className="text-muted-foreground">
                测试题: {testCasesCount} 个
              </div>
              <div className="text-muted-foreground">
                总分: {totalTestScore} 分
              </div>
              <div className="text-muted-foreground">
                状态: {testCasesCount > 0 ? "已配置" : "未配置"}
              </div>
            </div>
          </div>
        </div>

        {/* Test Configuration */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <Label className="text-sm font-medium text-foreground">启用循环测试</Label>
                <Switch
                  checked={testLoopEnabled}
                  onCheckedChange={handleTestLoopToggle}
                />
              </div>

              {testLoopEnabled && (
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-foreground">测试循环次数</Label>
                        <span className="text-xs text-muted-foreground">loop_count</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        设置测试循环的次数，范围1-100次
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[testLoopCount]}
                        onValueChange={(value) => setTestLoopCount(value[0])}
                        max={100}
                        min={1}
                        step={1}
                        className="w-48 md:w-64"
                      />
                      <Input
                        type="number"
                        value={testLoopCount}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (value >= 1 && value <= 100) {
                            setTestLoopCount(value)
                          }
                        }}
                        className="w-20 h-8 text-center text-sm"
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <Label className="text-sm font-medium text-foreground">启用评分阈值</Label>
                <Switch
                  checked={scoreThresholdEnabled}
                  onCheckedChange={handleScoreThresholdToggle}
                />
              </div>

              {scoreThresholdEnabled && (
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-foreground">评分阈值</Label>
                        <span className="text-xs text-muted-foreground">score_threshold</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        设置停止测试的总得分阈值，范围10-{totalTestScore}分
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[scoreThreshold]}
                        onValueChange={(value) => setScoreThreshold(value[0])}
                        max={totalTestScore}
                        min={10}
                        step={1}
                        className="w-48 md:w-64"
                      />
                      <Input
                        type="number"
                        value={scoreThreshold}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (value >= 10 && value <= totalTestScore) {
                            setScoreThreshold(value)
                          }
                        }}
                        className="w-20 h-8 text-center text-sm"
                        min={10}
                        max={totalTestScore}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Run section */}
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-4">
            {runStatus?.isRunning && (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-between text-sm text-muted-foreground w-40">
                  <span>任务进度</span>
                  <span className="font-mono">{currentTask}/{totalTasks}</span>
                </div>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
            <Button
              onClick={runStatus?.isRunning ? handleStopClick : handleRunClick}
              className={runStatus?.isRunning
                ? "bg-red-500 hover:bg-red-600 text-white flex-shrink-0"
                : "bg-foreground text-background hover:bg-foreground/90 flex-shrink-0"}
            >
              {runStatus?.isRunning ? "停止运行" : "开始运行"}
            </Button>
          </div>
        </div>

        {/* Results section */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium text-foreground">运行结果</Label>
            <p className="text-sm text-muted-foreground mt-1">当前正在运行的详细情况</p>
          </div>

          {runStatus?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium text-sm">运行错误</div>
              <div className="text-red-600 text-xs mt-1">{runStatus?.error}</div>
            </div>
          )}

          {runStatus?.results && runStatus.results.length > 0 && (
            <div className="space-y-2">
              {(runStatus?.results || []).map((result, index) => (
                <div key={result.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-green-800 font-medium text-sm">{result.message}</div>
                    <div className="text-green-600 text-xs">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="text-xs text-green-700 cursor-pointer hover:text-green-800">查看详情</summary>
                    <pre className="mt-2 text-xs text-green-700 bg-white p-2 rounded border border-green-200 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}

          <div className="p-8 text-center border border-dashed border-border rounded-lg">
              <div className="text-muted-foreground text-sm">暂无运行结果</div>
              <div className="text-muted-foreground text-xs mt-1">点击“开始运行”执行任务</div>
            </div>
        </div>
      </div>

      {/* 验证对话框 */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              无法运行
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground whitespace-pre-line">
              {validationMessage}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowValidationDialog(false)}>
                我知道了
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
