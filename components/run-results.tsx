"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAppStore } from "@/store/app-store"
import { useState, useEffect, useRef } from "react"
import { AlertTriangle, Cog } from "lucide-react"

export function RunResults() {
  const [testCasesCount, setTestCasesCount] = useState(0)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [validationMessage, setValidationMessage] = useState("")
  const cancelledRef = useRef(false)

  const {
    runResultsConfig: {
      runStatus,
      testLoopEnabled,
      testLoopCount,
      scoreThresholdEnabled,
      scoreThreshold,
      totalTestScore,
      // 解构出新的进度状态
      currentTask,
      totalTasks,
      progress,
      isExecuting,
      isCancelled,
      activeTaskMessage
    },
    projectConfig,
    promptFrameworkConfig,
    modelSettingsConfig,
    startRun,
    stopRun,
    setRunError,
    setActiveTaskMessage,
    setTestLoopEnabled,
    setTestLoopCount,
    setScoreThresholdEnabled,
    setScoreThreshold,
    setTotalTestScore,
    // 解构出新的 actions
    setCurrentTask,
    setTotalTasks,
    setProgress,
    setIsExecuting,
    setIsCancelled
  } = useAppStore()

  // 这个 useEffect 确保 ref 与 Zustand 状态同步
  useEffect(() => {
    cancelledRef.current = isCancelled
  }, [isCancelled])

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
    // 使用函数式更新来避免闭包问题
    const storeState = useAppStore.getState()
    const prevTask = storeState.runResultsConfig.currentTask
    const newTask = prevTask + taskIncrement
    let currentTotalTasks = storeState.runResultsConfig.totalTasks

    if (currentTotalTasks === 0) {
      currentTotalTasks = calculateTotalTasks()
      setTotalTasks(currentTotalTasks)
    }

    if (!testLoopEnabled && newTask >= currentTotalTasks) {
      currentTotalTasks = newTask + 100
      setTotalTasks(currentTotalTasks)
    }

    const newProgress = (newTask / currentTotalTasks) * 100
    setProgress(Math.min(newProgress, 100))
    setCurrentTask(newTask)
    console.log(`进度更新: ${newTask}/${currentTotalTasks} = ${newProgress}% (模式: ${testLoopEnabled ? '循环' : '评分阈值'})`)
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
  }

  const handleRun = async () => {
    console.log("=== 开始运行提示词工程任务 ===")

    // 防止重复执行
    if (isExecuting) {
      console.log("任务正在执行中，忽略重复请求")
      return
    }

    // --- 1. 状态初始化 ---
    const calculatedTotalTasks = calculateTotalTasks();
    console.log(`计算的总任务数: ${calculatedTotalTasks}`);

    setIsCancelled(false);
    setTotalTasks(calculatedTotalTasks);
    setCurrentTask(0);
    setProgress(0);
    setIsExecuting(true);
    startRun();
    setActiveTaskMessage("任务初始化...");

    try {
      // --- 2. 获取配置 ---
      const config = {
        project: {
          name: projectConfig.projectName,
          background: projectConfig.projectBackground,
          knowledgeBaseFiles: projectConfig.knowledgeBaseFiles,
          // 修正: 使用 projectConfig.mcpTools
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
      };
      console.log("当前配置：", JSON.stringify(config, null, 2));

      // --- 3. 模拟执行异步任务 ---
      const selectedFrameworksCount = promptFrameworkConfig.selectedFrameworks instanceof Set ? promptFrameworkConfig.selectedFrameworks.size : 0;
      const actualLoopCount = testLoopEnabled ? testLoopCount : 10;

      const taskStages = [
        { name: "生成提示词框架任务", loops: actualLoopCount, innerLoops: selectedFrameworksCount, subLoops: 1, delay: 50 },
        { name: "工作模型运行任务", loops: actualLoopCount, innerLoops: selectedFrameworksCount, subLoops: testCasesCount, delay: 30 },
        { name: "评分模型任务", loops: actualLoopCount, innerLoops: selectedFrameworksCount, subLoops: testCasesCount, delay: 20 }
      ];

      for (const stage of taskStages) {
        for (let k = 0; k < stage.loops; k++) {
          for (let i = 0; i < stage.innerLoops; i++) {
            for (let j = 0; j < stage.subLoops; j++) {
              if (useAppStore.getState().runResultsConfig.isCancelled) {
                console.log(`任务在阶段 "${stage.name}" 中被取消`);
                throw new Error("CancelledByUser");
              }

              const currentTaskNumber = useAppStore.getState().runResultsConfig.currentTask + 1;
              setActiveTaskMessage(`正在执行 (${currentTaskNumber}/${calculatedTotalTasks}): ${stage.name}`);
              await new Promise(resolve => setTimeout(resolve, stage.delay));

              // 更新进度条
              updateTaskProgress(1);

              if (stage.name === "工作模型运行任务" && !testLoopEnabled && Math.random() > 0.95) {
                console.log("达到评分阈值，提前停止测试");
                throw new Error("ThresholdReached");
              }
            }
          }
        }
      }

      // --- 4. 任务正常完成后的处理 ---
      console.log("所有任务阶段正常完成，设置最终结果。");
      setActiveTaskMessage("所有测试任务已成功完成。");

    } catch (error: any) {
      // --- 5. 错误处理 ---
      if (error.message === "CancelledByUser") {
        setActiveTaskMessage("任务已被用户手动取消。");
        console.log("任务被用户手动取消。");
      } else if (error.message === "ThresholdReached") {
        setActiveTaskMessage("任务因达到评分阈值而停止。");
        console.log("任务因达到评分阈值而停止。");
      } else {
        setActiveTaskMessage("任务因发生错误而停止。");
        console.error("任务运行失败：", error);
        setRunError(error.message || "未知错误");
      }
    } finally {
      // --- 6. 清理工作 (无论成功、失败还是取消，这里都会执行) ---
      const finalState = useAppStore.getState().runResultsConfig;
      console.log(`=== 任务${finalState.isCancelled ? '被取消' : '运行结束'} ===`);

      stopRun();
      setIsExecuting(false);

      if (finalState.isCancelled) {
        setCurrentTask(0);
        setProgress(0);
      }
    }
  };

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
            {(runStatus?.isRunning || isExecuting) && (
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
              onClick={runStatus?.isRunning || isExecuting ? handleStopClick : handleRunClick}
              className={runStatus?.isRunning || isExecuting
                ? "bg-red-500 hover:bg-red-600 text-white flex-shrink-0"
                : "bg-foreground text-background hover:bg-foreground/90 flex-shrink-0"}
            >
              {runStatus?.isRunning || isExecuting ? "停止运行" : "开始运行"}
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

          <div className="p-4 border border-border rounded-lg min-h-[150px] flex items-center justify-center">
            {isExecuting ? (
              // 正在运行时，显示带动画的状态消息
              <div className="flex items-center gap-3 text-blue-600">
                <Cog className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">{activeTaskMessage}</span>
              </div>
            ) : runStatus?.error ? (
              // 运行出错时
              <div className="text-sm font-medium text-red-600">{activeTaskMessage}</div>
            ) : activeTaskMessage ? (
              // 正常结束或取消时
              <div className="text-sm font-medium text-green-600">{activeTaskMessage}</div>
            ) : (
              // 初始状态时
              <div className="text-center">
                <div className="text-muted-foreground text-sm">暂无运行结果</div>
                <div className="text-muted-foreground text-xs mt-1">点击“开始运行”执行任务</div>
              </div>
            )}
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
