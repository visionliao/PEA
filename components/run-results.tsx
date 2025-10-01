"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function RunResults() {
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = () => {
    setIsRunning(true)
    console.log("[v0] Running prompt engineering task...")
    // Simulate running task
    setTimeout(() => {
      setIsRunning(false)
      alert("运行完成！")
    }, 2000)
  }

  return (
    <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl font-semibold text-foreground mb-6 md:mb-8">运行/结果</h1>

      <div className="space-y-6">
        {/* Run section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium text-foreground">运行配置</Label>
              <p className="text-sm text-muted-foreground mt-1">配置并执行提示词工程任务</p>
            </div>
            <Button
              onClick={handleRun}
              disabled={isRunning}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {isRunning ? "运行中..." : "开始运行"}
            </Button>
          </div>
        </div>

        {/* Results section */}
        <div className="space-y-4 pt-6 border-t border-border">
          <div>
            <Label className="text-base font-medium text-foreground">运行结果</Label>
            <p className="text-sm text-muted-foreground mt-1">查看最近的运行结果和输出</p>
          </div>

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
