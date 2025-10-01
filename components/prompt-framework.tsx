"use client"

import type React from "react"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

interface PromptFramework {
  id: string
  name: string
  description: string
  properties?: { name: string; description: string }[]
}

const frameworks: PromptFramework[] = [
  {
    id: "ape",
    name: "APE",
    description:
      "APE是一个用于构建清晰、有效提示词的结构化框架，它由三个核心部分组成：**行动 (Action)**、**目的 (Purpose)** 和 **期望 (Expectation)**",
    properties: [
      { name: "行动 (Action)", description: "明确指定AI需要执行的具体任务或操作" },
      { name: "目的 (Purpose)", description: "说明为什么需要执行这个任务，提供背景信息" },
      { name: "期望 (Expectation)", description: "描述期望的输出格式、风格或质量标准" },
    ],
  },
  {
    id: "care",
    name: "CARE",
    description:
      "CARE框架通过四个维度帮助构建高质量提示词：**上下文 (Context)**、**行动 (Action)**、**结果 (Result)** 和 **示例 (Example)**",
    properties: [
      { name: "上下文 (Context)", description: "提供相关背景信息和场景设定" },
      { name: "行动 (Action)", description: "明确需要AI执行的任务" },
      { name: "结果 (Result)", description: "描述期望的输出结果" },
      { name: "示例 (Example)", description: "提供具体示例帮助AI理解需求" },
    ],
  },
  {
    id: "rise",
    name: "RISE",
    description:
      "RISE框架专注于提升AI响应质量：**角色 (Role)**、**输入 (Input)**、**步骤 (Steps)** 和 **期望 (Expectation)**",
    properties: [
      { name: "角色 (Role)", description: "为AI分配特定的角色或专业身份" },
      { name: "输入 (Input)", description: "提供必要的输入信息和数据" },
      { name: "步骤 (Steps)", description: "说明任务执行的具体步骤" },
      { name: "期望 (Expectation)", description: "明确期望的输出标准" },
    ],
  },
]

export function PromptFramework() {
  const [selectedFrameworks, setSelectedFrameworks] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null)
  const [editingFramework, setEditingFramework] = useState<{
    name: string
    description: string
    properties: { name: string; description: string }[]
  } | null>(null)
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedFrameworks(new Set(frameworks.map((f) => f.id)))
    } else {
      setSelectedFrameworks(new Set())
    }
  }

  const handleFrameworkToggle = (id: string, checked: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedFrameworks)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedFrameworks(newSelected)
    setSelectAll(newSelected.size === frameworks.length)
  }

  const handleRowClick = (framework: PromptFramework) => {
    setIsCreatingCustom(false)

    if (selectedFramework === framework.id) {
      setSelectedFramework(null)
      setEditingFramework(null)
    } else {
      setSelectedFramework(framework.id)
      setEditingFramework({
        name: framework.name,
        description: framework.description,
        properties: framework.properties ? [...framework.properties] : [],
      })
    }
  }

  const handleAddProperty = () => {
    if (editingFramework) {
      setEditingFramework({
        ...editingFramework,
        properties: [...editingFramework.properties, { name: "", description: "" }],
      })
    }
  }

  const handlePropertyChange = (index: number, field: "name" | "description", value: string) => {
    if (editingFramework) {
      const newProperties = [...editingFramework.properties]
      newProperties[index][field] = value
      setEditingFramework({
        ...editingFramework,
        properties: newProperties,
      })
    }
  }

  const handleRemoveProperty = (index: number) => {
    if (editingFramework) {
      const newProperties = editingFramework.properties.filter((_, i) => i !== index)
      setEditingFramework({
        ...editingFramework,
        properties: newProperties,
      })
    }
  }

  const handleSave = () => {
    console.log("[v0] Saving framework:", editingFramework)
    alert("保存成功！")
    setIsCreatingCustom(false)
    setSelectedFramework(null)
    setEditingFramework(null)
  }

  const handleCreateCustomFramework = () => {
    setIsCreatingCustom(true)
    setSelectedFramework(null)
    setEditingFramework({
      name: "",
      description: "",
      properties: [],
    })
  }

  const handleCancel = () => {
    setIsCreatingCustom(false)
    setSelectedFramework(null)
    setEditingFramework(null)
  }

  return (
    <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border pb-4 md:mb-8">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">提示词框架</h1>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-[auto_1fr_auto] gap-6 pb-3 border-b border-border">
          <Label className="text-sm font-medium text-foreground">提示词框架</Label>
          <Label className="text-sm font-medium text-foreground">简介</Label>
          <div className="flex items-center gap-2">
            <Checkbox id="select-all" checked={selectAll} onCheckedChange={handleSelectAll} />
            <Label htmlFor="select-all" className="text-sm font-medium text-foreground cursor-pointer">
              全选
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          {frameworks.map((framework) => (
            <div key={framework.id}>
              <div
                className={`grid grid-cols-[auto_1fr_auto] gap-6 items-start py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${
                  selectedFramework === framework.id ? "bg-muted/50" : ""
                }`}
                onClick={() => handleRowClick(framework)}
              >
                <div className="text-sm font-medium text-foreground min-w-[80px]">{framework.name}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{framework.description}</div>
                <div className="flex items-center justify-center pt-1">
                  <Checkbox
                    id={framework.id}
                    checked={selectedFrameworks.has(framework.id)}
                    onCheckedChange={(checked) => handleFrameworkToggle(framework.id, checked as boolean, event as any)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {selectedFramework === framework.id && editingFramework && (
                <div className="mt-6 p-6 bg-muted/20 rounded-lg border border-border space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">提示词框架</Label>
                    <textarea
                      value={editingFramework.name}
                      onChange={(e) => {
                        setEditingFramework({ ...editingFramework, name: e.target.value })
                        e.target.style.height = "auto"
                        e.target.style.height = e.target.scrollHeight + "px"
                      }}
                      placeholder="请输入框架名称..."
                      className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = "auto"
                        target.style.height = target.scrollHeight + "px"
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">框架功能简介</Label>
                    <textarea
                      value={editingFramework.description}
                      onChange={(e) => {
                        setEditingFramework({ ...editingFramework, description: e.target.value })
                        e.target.style.height = "auto"
                        e.target.style.height = e.target.scrollHeight + "px"
                      }}
                      placeholder="请输入框架的功能简介..."
                      className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = "auto"
                        target.style.height = target.scrollHeight + "px"
                      }}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">框架属性</Label>
                      <Button
                        onClick={handleAddProperty}
                        variant="outline"
                        size="sm"
                        className="text-sm bg-transparent"
                      >
                        新增属性
                      </Button>
                    </div>

                    {editingFramework.properties.map((property, index) => (
                      <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-4 items-start">
                        <input
                          type="text"
                          value={property.name}
                          onChange={(e) => handlePropertyChange(index, "name", e.target.value)}
                          placeholder="属性名称"
                          className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-foreground focus:outline-none transition-colors"
                        />
                        <input
                          type="text"
                          value={property.description}
                          onChange={(e) => handlePropertyChange(index, "description", e.target.value)}
                          placeholder="功能介绍"
                          className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-foreground focus:outline-none transition-colors"
                        />
                        <Button
                          onClick={() => handleRemoveProperty(index)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button onClick={handleSave} className="bg-foreground text-background hover:bg-foreground/90">
                      保存
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {isCreatingCustom && editingFramework && (
          <div className="mt-6 p-6 bg-muted/20 rounded-lg border border-border space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">提示词框架</Label>
              <textarea
                value={editingFramework.name}
                onChange={(e) => {
                  setEditingFramework({ ...editingFramework, name: e.target.value })
                  e.target.style.height = "auto"
                  e.target.style.height = e.target.scrollHeight + "px"
                }}
                placeholder="请输入框架名称..."
                className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = target.scrollHeight + "px"
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">框架功能简介</Label>
              <textarea
                value={editingFramework.description}
                onChange={(e) => {
                  setEditingFramework({ ...editingFramework, description: e.target.value })
                  e.target.style.height = "auto"
                  e.target.style.height = e.target.scrollHeight + "px"
                }}
                placeholder="请输入框架的功能简介..."
                className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = target.scrollHeight + "px"
                }}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">框架属性</Label>
                <Button onClick={handleAddProperty} variant="outline" size="sm" className="text-sm bg-transparent">
                  新增属性
                </Button>
              </div>

              {editingFramework.properties.map((property, index) => (
                <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-4 items-start">
                  <input
                    type="text"
                    value={property.name}
                    onChange={(e) => handlePropertyChange(index, "name", e.target.value)}
                    placeholder="属性名称"
                    className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-foreground focus:outline-none transition-colors"
                  />
                  <input
                    type="text"
                    value={property.description}
                    onChange={(e) => handlePropertyChange(index, "description", e.target.value)}
                    placeholder="功能介绍"
                    className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-foreground focus:outline-none transition-colors"
                  />
                  <Button
                    onClick={() => handleRemoveProperty(index)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button onClick={handleCancel} variant="outline" className="bg-transparent">
                取消
              </Button>
              <Button onClick={handleSave} className="bg-foreground text-background hover:bg-foreground/90">
                保存
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" className="text-sm bg-transparent" onClick={handleCreateCustomFramework}>
            自定义框架
          </Button>
        </div>
      </div>
    </div>
  )
}
