"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function DataAnalysis() {
  return (
    <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border pb-4 md:mb-8">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">数据分析</h1>
      </div>

      <div className="space-y-6">
        {/* Analysis Overview */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium text-foreground">分析概览</Label>
            <p className="text-sm text-muted-foreground mt-1">查看提示词工程的整体数据分析</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-muted/20 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-2">总运行次数</p>
              <p className="text-2xl font-semibold text-foreground">0</p>
            </div>
            <div className="p-6 bg-muted/20 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-2">成功率</p>
              <p className="text-2xl font-semibold text-foreground">0%</p>
            </div>
            <div className="p-6 bg-muted/20 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-2">平均响应时间</p>
              <p className="text-2xl font-semibold text-foreground">0ms</p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-4 pt-6 border-t border-border">
          <div>
            <Label className="text-base font-medium text-foreground">性能指标</Label>
            <p className="text-sm text-muted-foreground mt-1">详细的性能分析数据</p>
          </div>

          <div className="min-h-[300px] p-6 bg-muted/20 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">暂无性能数据</p>
          </div>
        </div>

        {/* Quality Analysis */}
        <div className="space-y-4 pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium text-foreground">质量分析</Label>
              <p className="text-sm text-muted-foreground mt-1">基于测试题集的质量评估</p>
            </div>
            <Button variant="outline" className="border-border bg-transparent">
              生成报告
            </Button>
          </div>

          <div className="space-y-2">
            <div className="p-4 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">准确性</p>
                <span className="text-sm text-muted-foreground">N/A</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full">
                <div className="h-full bg-foreground rounded-full" style={{ width: "0%" }} />
              </div>
            </div>

            <div className="p-4 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">相关性</p>
                <span className="text-sm text-muted-foreground">N/A</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full">
                <div className="h-full bg-foreground rounded-full" style={{ width: "0%" }} />
              </div>
            </div>

            <div className="p-4 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">完整性</p>
                <span className="text-sm text-muted-foreground">N/A</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full">
                <div className="h-full bg-foreground rounded-full" style={{ width: "0%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
