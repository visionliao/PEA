"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/app-store"
import { useState, useEffect } from "react"

export function RunResults() {
  const [testCasesCount, setTestCasesCount] = useState(0)

  const {
    runResultsConfig: {
      runStatus
    },
    projectConfig,
    promptFrameworkConfig,
    modelSettingsConfig,
    startRun,
    stopRun,
    setRunResults,
    setRunError
  } = useAppStore()

  // 加载测试题集数据
  useEffect(() => {
    const loadTestCases = async () => {
      try {
        const response = await fetch("/api/test-cases")
        if (response.ok) {
          const data = await response.json()
          setTestCasesCount(data.checks.length)
        }
      } catch (error) {
        console.error("Failed to load test cases:", error)
      }
    }

    loadTestCases()
  }, [])

  const handleRun = async () => {
    console.log("=== 开始运行提示词工程任务 ===")

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
      }
    }

    console.log("当前配置：", JSON.stringify(config, null, 2))

    // 开始运行
    startRun()

    try {
      // 模拟异步任务
      await new Promise(resolve => setTimeout(resolve, 3000))

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

      setRunResults(results)
      stopRun()

      console.log("=== 任务运行完成 ===")

    } catch (error) {
      console.error("任务运行失败：", error)
      setRunError(error instanceof Error ? error.message : "未知错误")
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
                状态: {testCasesCount > 0 ? "已配置" : "未配置"}
              </div>
              <div className="text-muted-foreground">
                准备度: {testCasesCount > 0 ? "就绪" : "需添加"}
              </div>
            </div>
          </div>
        </div>

        {/* Run section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium text-foreground">运行配置</Label>
              <p className="text-sm text-muted-foreground mt-1">配置并执行提示词工程任务</p>
            </div>
            <Button
              onClick={handleRun}
              disabled={runStatus?.isRunning}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {runStatus?.isRunning ? "运行中..." : "开始运行"}
            </Button>
          </div>

          {runStatus?.isRunning && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">任务运行中...</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                开始时间: {runStatus?.startTime?.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Results section */}
        <div className="space-y-4 pt-6 border-t border-border">
          <div>
            <Label className="text-base font-medium text-foreground">运行结果</Label>
            <p className="text-sm text-muted-foreground mt-1">查看最近的运行结果和输出</p>
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

          {!runStatus?.results || runStatus.results.length === 0 && (
            <div className="p-8 text-center border border-dashed border-border rounded-lg">
              <div className="text-muted-foreground text-sm">暂无运行结果</div>
              <div className="text-muted-foreground text-xs mt-1">点击“开始运行”执行任务</div>
            </div>
          )}

          <div className="min-h-[300px] p-6 bg-muted/20 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">暂无运行结果</p>
          </div>
        </div>

        {/* History section */}
        <div className="space-y-4 pt-6 border-t border-border">
          <div>
            <Label className="text-base font-medium text-foreground">运行历史</Label>
            <p className="text-sm text-muted-foreground mt-1">查看历史运行记录</p>
          </div>

          <div className="space-y-2">
            <div className="p-4 bg-muted/20 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">运行记录 #1</p>
                  <p className="text-xs text-muted-foreground mt-1">2024-01-15 14:30:25</p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded">成功</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
