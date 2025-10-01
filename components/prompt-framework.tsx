"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface PromptFramework {
  id: string
  name: string
  description: string
  properties?: { name: string; description: string }[]
}

export function PromptFramework() {
  const [frameworks, setFrameworks] = useState<PromptFramework[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFrameworks, setSelectedFrameworks] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null)
  const [editingFramework, setEditingFramework] = useState<{
    name: string
    description: string
    properties: { name: string; description: string }[]
  } | null>(null)
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)

  // Load frameworks from API
  useEffect(() => {
    const loadFrameworks = async () => {
      try {
        const response = await fetch("/api/prompt-frameworks")
        if (response.ok) {
          const data = await response.json()
          setFrameworks(data.frameworks || [])
        }
      } catch (error) {
        console.error("Failed to load frameworks:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFrameworks()
  }, [])

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

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <div className="mb-6 border-b border-border pb-4 md:mb-8">
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">提示词框架</h1>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">加载提示词框架...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border pb-4 md:mb-8">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">提示词框架</h1>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-[auto_1fr_auto] gap-6 pb-3 border-b border-border">
          <Label className="text-sm font-medium text-foreground min-w-[80px]">框架名称</Label>
          <Label className="text-sm font-medium text-foreground">框架简介</Label>
          <div className="flex items-center gap-2">
            <Checkbox id="select-all" checked={selectAll} onCheckedChange={handleSelectAll} />
            <Label htmlFor="select-all" className="text-sm font-medium text-foreground cursor-pointer">
              全选
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          {frameworks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无提示词框架
            </div>
          ) : (
            frameworks.map((framework) => (
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
                      <Label className="text-sm font-medium text-foreground">框架名称</Label>
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
                      <Label className="text-sm font-medium text-foreground">框架介绍</Label>
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
                            placeholder="属性定义"
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
            ))
          )}
        </div>

        {isCreatingCustom && editingFramework && (
          <div className="mt-6 p-6 bg-muted/20 rounded-lg border border-border space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">框架名称</Label>
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
              <Label className="text-sm font-medium text-foreground">框架介绍</Label>
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
                    placeholder="属性定义"
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