"use client"

import type React from "react"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function ModelSettings() {
  const [model, setModel] = useState("gemini-2.5-flash")
  const [streamingEnabled, setStreamingEnabled] = useState(true)
  const [temperature, setTemperature] = useState([1.0])
  const [topP, setTopP] = useState([1.0])
  const [presencePenalty, setPresencePenalty] = useState([0.0])
  const [frequencyPenalty, setFrequencyPenalty] = useState([0.0])
  const [singleResponseLimit, setSingleResponseLimit] = useState(false)
  const [intelligentAdjustment, setIntelligentAdjustment] = useState(false)
  const [maxTokens, setMaxTokens] = useState([0])
  const [maxTokensInput, setMaxTokensInput] = useState("0") // Added separate state for input field
  const [reasoningEffort, setReasoningEffort] = useState("中")

  const handleMaxTokensSliderChange = (value: number[]) => {
    setMaxTokens(value)
    setMaxTokensInput(value[0].toString())
  }

  const handleMaxTokensInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMaxTokensInput(value)
    const numValue = Number.parseInt(value) || 0
    if (numValue >= 0 && numValue <= 32000) {
      setMaxTokens([numValue])
    }
  }

  const incrementTokens = () => {
    const newValue = Math.min(maxTokens[0] + 100, 32000)
    setMaxTokens([newValue])
    setMaxTokensInput(newValue.toString())
  }

  const decrementTokens = () => {
    const newValue = Math.max(maxTokens[0] - 100, 0)
    setMaxTokens([newValue])
    setMaxTokensInput(newValue.toString())
  }

  return (
    <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border pb-4 md:mb-8">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">模型设置</h1>
      </div>

      <div className="space-y-6 md:space-y-8">
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-foreground">模型</Label>
                <span className="text-xs text-muted-foreground">model</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Google 模型</div>
            </div>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Gemini 2.5 Flash
                  </div>
                </SelectItem>
                <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                <SelectItem value="gemini-ultra">Gemini Ultra</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Streaming Output */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-foreground">启用流式输出</Label>
            <p className="text-xs text-muted-foreground">启用流式输出时实时显示响应，禁用后仅显示完整响应。</p>
          </div>
          <Switch checked={streamingEnabled} onCheckedChange={setStreamingEnabled} />
        </div>

        {/* Temperature */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-foreground">创意活跃度</Label>
              <span className="text-xs text-muted-foreground">temperature</span>
            </div>
            <p className="text-xs text-muted-foreground">数值越大，回答越有创意和想象力；数值越小，回答越严谨</p>
          </div>
          <div className="flex items-center gap-4">
            <Slider value={temperature} onValueChange={setTemperature} max={2} min={0} step={0.1} className="flex-1" />
            <span className="text-sm font-medium text-foreground w-12 text-right">{temperature[0].toFixed(1)}</span>
          </div>
        </div>

        {/* Top P */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-foreground">思维开放度</Label>
              <span className="text-xs text-muted-foreground">top_p</span>
            </div>
            <p className="text-xs text-muted-foreground">
              考虑多少种可能性，值越大，接受更多可能的回答；值越小，倾向选择最可能的回答，不推荐和创意活跃度一起更改
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Slider value={topP} onValueChange={setTopP} max={1} min={0} step={0.1} className="flex-1" />
            <span className="text-sm font-medium text-foreground w-12 text-right">{topP[0].toFixed(1)}</span>
          </div>
        </div>

        {/* Presence Penalty */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-foreground">表达发散度</Label>
              <span className="text-xs text-muted-foreground">presence_penalty</span>
            </div>
            <p className="text-xs text-muted-foreground">
              值越大，越倾向不同的表达方式，避免概念重复；值越小，越倾向使用重复的概念或表达，表达更具一致性
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={presencePenalty}
              onValueChange={setPresencePenalty}
              max={2}
              min={-2}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm font-medium text-foreground w-12 text-right">{presencePenalty[0].toFixed(1)}</span>
          </div>
        </div>

        {/* Frequency Penalty */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-foreground">词汇丰富度</Label>
              <span className="text-xs text-muted-foreground">frequency_penalty</span>
            </div>
            <p className="text-xs text-muted-foreground">值越大，再词频率越多样化；值越低，用词更有实际性</p>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={frequencyPenalty}
              onValueChange={setFrequencyPenalty}
              max={2}
              min={-2}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm font-medium text-foreground w-12 text-right">
              {frequencyPenalty[0].toFixed(1)}
            </span>
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <Label className="text-sm font-medium text-foreground">开启单次回复限制</Label>
              <Switch checked={singleResponseLimit} onCheckedChange={setSingleResponseLimit} />
            </div>

            {singleResponseLimit && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-foreground">单次回复限制</Label>
                    <span className="text-xs text-muted-foreground">max_tokens</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={maxTokens}
                      onValueChange={handleMaxTokensSliderChange}
                      max={32000}
                      min={0}
                      step={100}
                      className="w-48 md:w-64"
                    />
                    <div className="relative group">
                      <Input
                        type="text" // 保持 text 类型，避免浏览器默认箭头
                        value={maxTokensInput}
                        onChange={handleMaxTokensInputChange}
                        className="w-20 h-8 text-center text-sm pr-5" // 调整了 padding-right 以适应自定义箭头
                      />
                      {/* 自定义箭头，使用 group-hover 控制悬停时显示 */}
                      <div className="absolute right-0 top-0 h-full flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={incrementTokens}
                          className="h-1/2 px-1 text-muted-foreground hover:text-foreground flex items-center"
                          aria-label="增加"
                        >
                          {/* 这是一个简单的上箭头 SVG，你可以替换成你项目中的图标库图标 */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                        </button>
                        <button
                          onClick={decrementTokens}
                          className="h-1/2 px-1 text-muted-foreground hover:text-foreground flex items-center"
                          aria-label="减少"
                        >
                          {/* 这是一个简单的下箭头 SVG */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">单次交互所用的最大 Token 数</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <Label className="text-sm font-medium text-foreground">开启推理强度调整</Label>
              <Switch checked={intelligentAdjustment} onCheckedChange={setIntelligentAdjustment} />
            </div>

            {intelligentAdjustment && (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-foreground">推理强度</Label>
                      <span className="text-xs text-muted-foreground">reasoning_effort</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      值越大，推理能力越强，但可能会增加响应时间和 Token 消耗
                    </p>
                  </div>
                  <Select value={reasoningEffort} onValueChange={setReasoningEffort}>
                    <SelectTrigger className="w-full md:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="低">低</SelectItem>
                      <SelectItem value="中">中</SelectItem>
                      <SelectItem value="高">高</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
