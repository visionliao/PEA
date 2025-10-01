"use client"

import { useState, useEffect, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PromptFramework {
  id: string
  name: string
  description: string
  properties?: { name: string; description: string }[]
  examples?: {
    scenario: string
    prompt: string
  }
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
    examples?: {
      scenario: string
      prompt: string
    }
  } | null>(null)
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  // 输入框根据文本内容自动调整高度
  const editNameRef = useRef<HTMLTextAreaElement>(null)
  const editDescriptionRef = useRef<HTMLTextAreaElement>(null)
  const createNameRef = useRef<HTMLTextAreaElement>(null)
  const createDescriptionRef = useRef<HTMLTextAreaElement>(null)
  // 用于属性输入框的refs
  const propertyRefs = useRef<{[key: string]: HTMLTextAreaElement | null}>({})
  // 输入框根据文本内容自动调整高度监听器
  useEffect(() => {
    const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement>) => {
      if (ref.current) {
        ref.current.style.height = "auto"
        ref.current.style.height = `${ref.current.scrollHeight}px`
      }
    }

    const resizeAllPropertyInputs = () => {
      Object.values(propertyRefs.current).forEach(ref => {
        if (ref) {
          ref.style.height = "auto"
          ref.style.height = `${ref.scrollHeight}px`
        }
      })
    }

    if (editingFramework) {
      if (isCreatingCustom) {
        resizeTextarea(createNameRef)
        resizeTextarea(createDescriptionRef)
      } else {
        resizeTextarea(editNameRef)
        resizeTextarea(editDescriptionRef)
      }
      resizeAllPropertyInputs()
    }
  }, [editingFramework, isCreatingCustom]) // Rerun when the editing data changes

  // 当属性内容变化时调整高度
  useEffect(() => {
    const resizeAllPropertyInputs = () => {
      Object.values(propertyRefs.current).forEach(ref => {
        if (ref) {
          ref.style.height = "auto"
          ref.style.height = `${ref.scrollHeight}px`
        }
      })
    }

    if (editingFramework) {
      resizeAllPropertyInputs()
    }
  }, [editingFramework?.properties]) // 当属性变化时重新调整高度

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
        examples: framework.examples
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
      // 清理已删除属性的ref
      delete propertyRefs.current[`${isCreatingCustom ? 'create' : 'edit'}-name-${index}`]
      delete propertyRefs.current[`${isCreatingCustom ? 'create' : 'edit'}-desc-${index}`]
    }
  }

  const setPropertyRef = (type: 'name' | 'desc', index: number, element: HTMLTextAreaElement | null) => {
    const key = `${isCreatingCustom ? 'create' : 'edit'}-${type}-${index}`
    propertyRefs.current[key] = element
  }

  const validateFramework = () => {
    const errors: {[key: string]: string} = {}

    if (!editingFramework?.name.trim()) {
      errors.name = "框架名称不能为空"
    }

    if (!editingFramework?.description.trim()) {
      errors.description = "框架介绍不能为空"
    }

    if (!editingFramework?.properties || editingFramework.properties.length === 0) {
      errors.properties = "至少需要一个框架属性"
    } else {
      const emptyProperty = editingFramework.properties.findIndex(
        prop => !prop.name.trim() || !prop.description.trim()
      )
      if (emptyProperty !== -1) {
        errors.properties = `第${emptyProperty + 1}个属性的名称或定义不能为空`
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateFramework()) {
      return
    }

    setIsSaving(true)

    try {
      // 保存框架（包含存在性检查）
      const url = showReplaceConfirm ? '/api/prompt-frameworks?force=true' : '/api/prompt-frameworks'
      const saveResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingFramework),
      })

      const saveData = await saveResponse.json()

      if (saveData.success) {
        // 动态更新框架列表
        const newFramework: PromptFramework = {
          id: editingFramework!.name.toLowerCase().replace(/\s+/g, '-'),
          name: editingFramework!.name,
          description: editingFramework!.description,
          properties: editingFramework!.properties,
        }

        setFrameworks(prev => [...prev, newFramework])

        alert("保存成功！")
        setIsCreatingCustom(false)
        setSelectedFramework(null)
        setEditingFramework(null)
        setValidationErrors({})
        setShowReplaceConfirm(false)
      } else if (saveData.exists) {
        if (!showReplaceConfirm) {
          setShowReplaceConfirm(true)
          setIsSaving(false)
          return
        }
      } else {
        alert(saveData.error || "保存失败")
      }
    } catch (error) {
      console.error("Save error:", error)
      alert("保存失败，请重试")
    } finally {
      setIsSaving(false)
    }
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
    setValidationErrors({})
    setShowReplaceConfirm(false)
    setIsSaving(false)
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
                      {validationErrors.name && (
                        <Alert className="border-destructive/50">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-destructive">
                            {validationErrors.name}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">框架介绍</Label>
                      <textarea
                        ref={editDescriptionRef}
                        value={editingFramework.description}
                        onChange={(e) =>
                        setEditingFramework({ ...editingFramework, description: e.target.value })
                        }
                        placeholder="请输入框架的功能简介..."
                        className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                        rows={1}
                        onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = "auto"
                        target.style.height = `${target.scrollHeight}px`
                        }}
                      />
                      {validationErrors.description && (
                        <Alert className="border-destructive/50">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-destructive">
                            {validationErrors.description}
                          </AlertDescription>
                        </Alert>
                      )}
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
                          <textarea
                            ref={(el) => setPropertyRef('name', index, el)}
                            value={property.name}
                            onChange={(e) => handlePropertyChange(index, "name", e.target.value)}
                            placeholder="属性名称"
                            className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                            rows={1}
                          />
                          <textarea
                            ref={(el) => setPropertyRef('desc', index, el)}
                            value={property.description}
                            onChange={(e) => handlePropertyChange(index, "description", e.target.value)}
                            placeholder="属性定义"
                            className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                            rows={1}
                          />
                          <Button
                            onClick={() => handleRemoveProperty(index)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
                          >
                            删除
                          </Button>
                        </div>
                      ))}

                      {validationErrors.properties && (
                        <Alert className="border-destructive/50">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-destructive">
                            {validationErrors.properties}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Example Section */}
                    {editingFramework.examples && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-foreground">应用示例</Label>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">使用场景</Label>
                            <div className="px-3 py-2 text-sm bg-muted/30 border border-border rounded-md">
                              {editingFramework.examples.scenario}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">示例提示词</Label>
                            <div className="px-3 py-2 text-sm bg-muted/30 border border-border rounded-md font-mono whitespace-pre-wrap">
                              {editingFramework.examples.prompt}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Replacement Confirmation */}
                    {showReplaceConfirm && (
                      <Alert className="border-orange-500/50">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <AlertDescription className="text-orange-700">
                          框架文件已存在，是否替换？点击"确认替换"继续，或点击"取消"重新命名。
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="bg-transparent"
                      >
                        取消
                      </Button>
                      {showReplaceConfirm && (
                        <Button
                          onClick={() => setShowReplaceConfirm(false)}
                          variant="outline"
                          className="bg-transparent"
                        >
                          取消
                        </Button>
                      )}
                      <Button
                        onClick={handleSave}
                        className="bg-foreground text-background hover:bg-foreground/90"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                          </>
                        ) : showReplaceConfirm ? (
                          "确认替换"
                        ) : (
                          "保存"
                        )}
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
              {validationErrors.name && (
                <Alert className="border-destructive/50">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    {validationErrors.name}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">框架介绍</Label>
              <textarea
                ref={createDescriptionRef}
                value={editingFramework.description}
                onChange={(e) =>
                setEditingFramework({ ...editingFramework, description: e.target.value })
                }
                placeholder="请输入框架的功能简介..."
                className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                rows={1}
                onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = "auto"
                target.style.height = `${target.scrollHeight}px`
                }}
              />
              {validationErrors.description && (
                <Alert className="border-destructive/50">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    {validationErrors.description}
                  </AlertDescription>
                </Alert>
              )}
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
                  <textarea
                    ref={(el) => setPropertyRef('name', index, el)}
                    value={property.name}
                    onChange={(e) => handlePropertyChange(index, "name", e.target.value)}
                    placeholder="属性名称"
                    className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                    rows={1}
                  />
                  <textarea
                    ref={(el) => setPropertyRef('desc', index, el)}
                    value={property.description}
                    onChange={(e) => handlePropertyChange(index, "description", e.target.value)}
                    placeholder="属性定义"
                    className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-border focus:border-foreground focus:outline-none resize-none transition-colors overflow-hidden"
                    rows={1}
                  />
                  <Button
                    onClick={() => handleRemoveProperty(index)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
                  >
                    删除
                  </Button>
                </div>
              ))}

              {validationErrors.properties && (
                <Alert className="border-destructive/50">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    {validationErrors.properties}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Replacement Confirmation */}
            {showReplaceConfirm && (
              <Alert className="border-orange-500/50">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-700">
                  框架文件已存在，是否替换？点击"确认替换"继续，或点击"取消"重新命名。
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="bg-transparent"
              >
                取消
              </Button>
              {showReplaceConfirm && (
                <Button
                  onClick={() => setShowReplaceConfirm(false)}
                  variant="outline"
                  className="bg-transparent"
                >
                  取消
                </Button>
              )}
              <Button
                onClick={handleSave}
                className="bg-foreground text-background hover:bg-foreground/90"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : showReplaceConfirm ? (
                  "确认替换"
                ) : (
                  "保存"
                )}
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