"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FolderOpen, FileText, Upload, Plus, Trash2, Loader2, Save, Edit, AlertTriangle } from "lucide-react"

// 自动调整textarea高度的组件
const AutoResizeTextarea = ({
  value,
  onChange,
  placeholder,
  className = "",
  maxRows = 20,
  disabled = false
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder: string
  className?: string
  maxRows?: number
  disabled?: boolean
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 重置高度到初始状态以便正确计算
    textarea.style.height = 'auto'

    // 计算滚动高度
    const scrollHeight = textarea.scrollHeight

    // 计算行高
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight)

    // 计算需要的行数
    const neededRows = Math.ceil(scrollHeight / lineHeight)

    // 限制最大行数
    const maxAllowedRows = Math.min(neededRows, maxRows)

    // 设置新高度
    const newHeight = maxAllowedRows * lineHeight
    textarea.style.height = `${newHeight}px`
  }, [maxRows])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e)
        adjustHeight()
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-transparent border-0 border-b border-border px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none min-h-[2rem] max-h-[40rem] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      rows={1}
    />
  )
}

export function ProjectOverview() {
  const [selectedProject, setSelectedProject] = useState("自定义")
  const [projectFiles, setProjectFiles] = useState<string[]>([])
  const [projectName, setProjectName] = useState("")
  const [projectBackground, setProjectBackground] = useState("")
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [mcpTools, setMcpTools] = useState<Array<{
    id: string
    methodName: string
    methodParams: string
    description: string
    returnValue: string
  }>>([])
  const [mcpToolsCode, setMcpToolsCode] = useState("")
  const [parseError, setParseError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showProjectExistsDialog, setShowProjectExistsDialog] = useState(false)
  const [existingProjectName, setExistingProjectName] = useState("")

  useEffect(() => {
    // Fetch the list of project folders
    async function fetchProjectFiles() {
      try {
        const response = await fetch("/api/history-projects")
        if (response.ok) {
          const projects = await response.json()
          setProjectFiles(projects)
        }
      } catch (error) {
        console.error("Failed to fetch project files:", error)
      }
    }

    fetchProjectFiles()
  }, [])

  // 处理项目选择变化
  const handleProjectChange = async (projectName: string) => {
    setSelectedProject(projectName)

    if (projectName === "自定义") {
      // 清空表单，让用户自定义
      setProjectName("")
      setProjectBackground("")
      setKnowledgeBaseFiles([])
      setMcpTools([])
      setMcpToolsCode("")
      setIsEditMode(true)
      return
    }

    // 加载选中项目的数据
    setIsLoading(true)
    try {
      const response = await fetch(`/api/history-projects?projectName=${encodeURIComponent(projectName)}`)
      if (response.ok) {
        const projectData = await response.json()

        // 填充表单数据
        setProjectName(projectData.projectName || projectName)
        setProjectBackground(projectData.projectBackground || "")
        setKnowledgeBaseFiles(projectData.knowledgeBaseFiles || [])

        // 处理 MCP Tools
        if (projectData.mcpTools && projectData.mcpTools.length > 0) {
          const toolsWithIds = projectData.mcpTools.map((tool: any, index: number) => ({
            id: `loaded-${Date.now()}-${index}`,
            methodName: tool.methodName || "",
            methodParams: tool.methodParams || "",
            description: tool.description || "",
            returnValue: tool.returnValue || ""
          }))
          setMcpTools(toolsWithIds)
        } else {
          setMcpTools([])
        }

        setIsEditMode(false) // 选择已存在的项目时，默认为查看模式
      } else {
        console.error("Failed to load project data")
      }
    } catch (error) {
      console.error("Error loading project data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    const validationErrors = []

    if (!projectName.trim()) {
      validationErrors.push("项目名称")
    }

    if (!projectBackground.trim()) {
      validationErrors.push("项目背景")
    }

    if (validationErrors.length > 0) {
      const errorMessage = `请填写以下必填项目：\n• ${validationErrors.join("\n• ")}`

      // 创建自定义模态框而不是使用alert，使用项目主题色
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 flex items-center justify-center z-50'
      modal.innerHTML = `
        <div class="bg-card border border-border rounded-lg p-6 max-w-md mx-4 shadow-lg">
          <h3 class="text-lg font-semibold mb-4 text-foreground">提示</h3>
          <p class="text-muted-foreground mb-6 whitespace-pre-line">${errorMessage}</p>
          <div class="flex justify-end">
            <button id="modal-ok" class="px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary transition-colors">
              确定
            </button>
          </div>
        </div>
      `
      document.body.appendChild(modal)

      // 点击确定按钮关闭模态框
      const okButton = modal.querySelector('#modal-ok') as HTMLElement
      const closeModal = () => {
        document.body.removeChild(modal)
      }
      okButton.addEventListener('click', closeModal)

      // 点击背景也可以关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal()
        }
      })

      // ESC键关闭
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeModal()
          document.removeEventListener('keydown', handleEscape)
        }
      }
      document.addEventListener('keydown', handleEscape)

      return
    }

    setIsLoading(true)
    setShowSuccess(false)

    try {
      const response = await fetch("/api/save-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: projectName.trim(),
          projectBackground: projectBackground.trim(),
          knowledgeBaseFiles: knowledgeBaseFiles,
          mcpTools: mcpTools
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409 && result.exists) {
          // 项目已存在，显示确认对话框
          setExistingProjectName(result.projectName)
          setShowProjectExistsDialog(true)
          return
        }
        throw new Error(result.error || "保存失败")
      }

      // 保存成功，切换到编辑模式
      setIsEditMode(false)
      setShowSuccess(true)

      // 刷新项目列表
      try {
        const response = await fetch("/api/history-projects")
        if (response.ok) {
          const projects = await response.json()
          setProjectFiles(projects)
          // 选中新创建的项目
          setSelectedProject(projectName.trim())
        }
      } catch (error) {
        console.error("Failed to refresh project list:", error)
      }

      // 3秒后隐藏成功提示
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)

      console.log("Project saved successfully:", result)
    } catch (error) {
      console.error("Error saving project:", error)
      alert(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    // 清空所有表单数据
    setSelectedProject("自定义")
    setProjectName("")
    setProjectBackground("")
    setKnowledgeBaseFiles([])
    setMcpTools([])
    setMcpToolsCode("")
    setParseError("")
    setIsEditMode(true)
    setShowSuccess(false)
  }

  const handleEdit = () => {
    setIsEditMode(true)
  }

  const handleProjectExistsCancel = () => {
    setShowProjectExistsDialog(false)
    setExistingProjectName("")
  }

  const handleProjectExistsReplace = async () => {
    if (!existingProjectName) return

    setIsLoading(true)
    setShowProjectExistsDialog(false)

    try {
      // 使用强制覆盖参数重新保存项目
      const response = await fetch("/api/save-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: projectName.trim(),
          projectBackground: projectBackground.trim(),
          knowledgeBaseFiles: knowledgeBaseFiles,
          mcpTools: mcpTools,
          force: true
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "保存失败")
      }

      // 保存成功，切换到编辑模式
      setIsEditMode(false)
      setShowSuccess(true)

      // 刷新项目列表
      try {
        const response = await fetch("/api/history-projects")
        if (response.ok) {
          const projects = await response.json()
          setProjectFiles(projects)
          // 选中新创建的项目
          setSelectedProject(projectName.trim())
        }
      } catch (error) {
        console.error("Failed to refresh project list:", error)
      }

      // 3秒后隐藏成功提示
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)

      console.log("Project replaced successfully:", result)
    } catch (error) {
      console.error("Error replacing project:", error)
      alert(`替换项目失败: ${error instanceof Error ? error.message : "未知错误"}`)
    } finally {
      setIsLoading(false)
      setExistingProjectName("")
    }
  }

  const handleKnowledgeBaseFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFilePaths: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const path = file.webkitRelativePath || file.name

      if (file.webkitRelativePath) {
        // 如果是文件夹中的文件，webkitRelativePath 会包含相对路径
        const parts = path.split('/')
        const folderName = parts[0]
        const fileName = parts.slice(1).join('/')
        newFilePaths.push(`${folderName}/${fileName}`)
      } else {
        // 单个文件
        newFilePaths.push(file.name)
      }
    }

    // 追加新文件到现有列表，避免重复
    const existingFilesSet = new Set(knowledgeBaseFiles)
    const uniqueNewFiles = newFilePaths.filter(file => !existingFilesSet.has(file))
    setKnowledgeBaseFiles([...knowledgeBaseFiles, ...uniqueNewFiles])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const items = e.dataTransfer.items
    if (!items) return

    const newFilePaths: string[] = []
    const processedEntries = new Set<string>()

    // 递归处理文件系统中的条目
    const processEntry = (entry: FileSystemEntry, relativePath = '') => {
      if (processedEntries.has(entry.fullPath)) return
      processedEntries.add(entry.fullPath)

      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry
        fileEntry.file((file) => {
          const filePath = relativePath ? `${relativePath}/${file.name}` : file.name
          newFilePaths.push(filePath)
        })
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry
        const dirReader = dirEntry.createReader()

        dirReader.readEntries((entries) => {
          entries.forEach((entry) => {
            const newRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name
            processEntry(entry, newRelativePath)
          })
        })
      }
    }

    // 处理拖拽的项目
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const entry = item.webkitGetAsEntry()

      if (entry) {
        if (entry.isFile) {
          // 处理单个文件
          const fileEntry = entry as FileSystemFileEntry
          fileEntry.file((file) => {
            newFilePaths.push(file.name)
          })
        } else if (entry.isDirectory) {
          // 处理文件夹 - 递归获取所有文件
          processEntry(entry, entry.name)
        }
      }
    }

    // 延迟更新状态，确保所有异步操作完成
    setTimeout(() => {
      // 追加新文件到现有列表，避免重复
      const existingFilesSet = new Set(knowledgeBaseFiles)
      const uniqueNewFiles = newFilePaths.filter(file => !existingFilesSet.has(file))
      setKnowledgeBaseFiles([...knowledgeBaseFiles, ...uniqueNewFiles])
    }, 100)
  }

  const clearKnowledgeBaseFiles = () => {
    setKnowledgeBaseFiles([])
  }

  const addMcpTool = () => {
    const newTool = {
      id: Date.now().toString(),
      methodName: "",
      methodParams: "",
      description: "",
      returnValue: ""
    }
    setMcpTools([...mcpTools, newTool])
  }

  const removeMcpTool = (id: string) => {
    setMcpTools(mcpTools.filter(tool => tool.id !== id))
  }

  const updateMcpTool = (id: string, field: 'methodName' | 'methodParams' | 'description' | 'returnValue', value: string) => {
    setMcpTools(mcpTools.map(tool => 
      tool.id === id ? { ...tool, [field]: value } : tool
    ))
  }

  const parseMcpToolsCode = () => {
    setParseError("")

    try {
      let parsedTools: Array<{
        methodName: string
        methodParams: string
        description: string
        returnValue: string
      }> = []

      // 预处理JSON：移除注释行、尾随逗号和多余空格
      const cleanJsonString = mcpToolsCode
        .split('\n')
        .filter(line => !line.trim().startsWith('#')) // 移除以#开头的注释行
        .join('\n')
        .replace(/,\s*([\]}])/g, '$1') // 移除尾随逗号
        .trim()

      // 尝试解析JSON
      const jsonData = JSON.parse(cleanJsonString)

      let toolsToProcess: any[] = []

      if (Array.isArray(jsonData)) {
        // 处理数组格式
        toolsToProcess = jsonData
      } else if (jsonData.tools && Array.isArray(jsonData.tools)) {
        // 处理包含tools字段的对象
        toolsToProcess = jsonData.tools
      } else {
        throw new Error("JSON格式不正确，应该是数组或包含tools字段的对象")
      }

      parsedTools = toolsToProcess.map(item => {
        let methodParams = ""

        // 处理OpenAI函数格式的参数结构
        if (item.parameters && item.parameters.properties) {
          const params = item.parameters.properties
          const paramNames = Object.keys(params)

          // 构建参数字符串，格式：name:type:description;name2:type2:description2
          methodParams = paramNames.map(name => {
            const param = params[name]
            const type = param.type || "string"
            const description = param.description || ""
            return `${name}:${type}:${description}`
          }).join(";")
        } else if (item.parameters) {
          // 处理简单格式的参数
          if (typeof item.parameters === "string") {
            methodParams = item.parameters
          } else if (typeof item.parameters === "object") {
            // 如果是对象，尝试提取参数信息
            const paramNames = Object.keys(item.parameters)
            methodParams = paramNames.map(name => {
              const param = item.parameters[name]
              const type = typeof param === "object" && param.type ? param.type : typeof param
              return `${name}:${type}`
            }).join(";")
          }
        } else if (item.methodParams) {
          // 兼容原有的methodParams字段
          methodParams = item.methodParams
        }

        return {
          methodName: item.name || item.methodName || "",
          methodParams: methodParams,
          description: item.description || "",
          returnValue: item.returnValue || item.returns || ""
        }
      })

      if (parsedTools.length === 0) {
        throw new Error("未解析到任何工具信息")
      }

      // 生成工具列表，追加到现有列表中
      const newTools = parsedTools.map((tool, index) => ({
        id: `parsed-${Date.now()}-${index}`,
        methodName: tool.methodName,
        methodParams: tool.methodParams,
        description: tool.description,
        returnValue: tool.returnValue
      }))

      // 追加到现有工具列表
      setMcpTools([...mcpTools, ...newTools])
    } catch (error) {
      setParseError(`解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border pb-4 md:mb-8">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">项目概况</h1>
      </div>

      <div className="space-y-6 md:space-y-8">
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground">历史项目</Label>
              <div className="text-xs text-muted-foreground mt-1">{selectedProject}</div>
            </div>
            <Select
              value={selectedProject}
              onValueChange={handleProjectChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full md:w-80 disabled:opacity-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="自定义">自定义</SelectItem>
                {projectFiles.map((projectName) => (
                  <SelectItem key={projectName} value={projectName}>
                    {projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">项目名称</Label>
          <AutoResizeTextarea
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="请输入项目名称..."
            disabled={!isEditMode || isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">项目背景</Label>
          <AutoResizeTextarea
            value={projectBackground}
            onChange={(e) => setProjectBackground(e.target.value)}
            placeholder="请输入项目的描述信息、功能简介等，让大模型能够更好的理解你的项目..."
            disabled={!isEditMode || isLoading}
          />
        </div>

        {/* 知识库区域 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <h2 className="text-lg font-medium text-foreground">知识库</h2>
                <p className="text-sm text-muted-foreground">选择文件或文件夹作为知识库</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={handleKnowledgeBaseFileSelect}
                className="hidden"
                id="knowledge-base-file-select"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('knowledge-base-file-select')?.click()}
                className="flex items-center gap-2 disabled:opacity-50"
                disabled={!isEditMode || isLoading}
              >
                <Upload className="h-4 w-4" />
                选择文件
              </Button>
            </div>
          </div>

          {/* 拖拽区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : !isEditMode || isLoading
                ? 'border-muted bg-muted/20 cursor-not-allowed'
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }`}
            onDragOver={!isEditMode || isLoading ? undefined : handleDragOver}
            onDragLeave={!isEditMode || isLoading ? undefined : handleDragLeave}
            onDrop={!isEditMode || isLoading ? undefined : handleDrop}
          >
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              拖拽文件或文件夹到此处，或点击上方按钮
            </p>
            <p className="text-xs text-muted-foreground">
              选择单个文件
            </p>
          </div>

          {/* 选择的文件路径显示 */}
          {knowledgeBaseFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  已选择的文件 ({knowledgeBaseFiles.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearKnowledgeBaseFiles}
                  className="text-xs disabled:opacity-50"
                  disabled={!isEditMode || isLoading}
                >
                  清除
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                {knowledgeBaseFiles.map((filePath, index) => (
                  <div key={index} className="flex items-center gap-2 py-1">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground font-mono break-all">
                      {filePath}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MCP Tools 区域 */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">MCP Tools</h2>

            {/* MCP Tools 代码输入区域 */}
            <div className="space-y-3">
              <textarea
                value={mcpToolsCode}
                onChange={(e) => setMcpToolsCode(e.target.value)}
                placeholder={`将mcp tools的json文本复制到这里，实现自动转换功能，也可以通过下方的增加方案按钮手动新增一个工具方法的声明。

// 支持JSON格式：
[
  {
    "name": "get_weather",
    "parameters": "city: string",
    "description": "获取指定城市的天气信息",
    "returnValue": "temperature: number, condition: string"
  }
]`}
                disabled={!isEditMode || isLoading}
                className="w-full h-[15rem] p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* 解析按钮和错误提示 */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={parseMcpToolsCode}
                  className="flex items-center gap-2 disabled:opacity-50"
                  disabled={!isEditMode || isLoading}
                >
                  自动解析
                </Button>

                {parseError && (
                  <div className="text-sm text-destructive bg-destructive/10 px-3 py-1.5 rounded-md">
                    {parseError}
                  </div>
                )}
              </div>
            </div>

            {mcpTools.map((tool, index) => (
              <div key={tool.id} className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Tool call {index + 1}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMcpTool(tool.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    disabled={!isEditMode || isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* 方法名 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">方法名(name)</Label>
                  <AutoResizeTextarea
                    value={tool.methodName}
                    onChange={(e) => updateMcpTool(tool.id, 'methodName', e.target.value)}
                    placeholder="工具的方法名称，mcp工具函数名都是英文名称..."
                    disabled={!isEditMode || isLoading}
                  />
                </div>

                {/* 方法参数 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">方法参数(parameters)</Label>
                  <AutoResizeTextarea
                    value={tool.methodParams}
                    onChange={(e) => updateMcpTool(tool.id, 'methodParams', e.target.value)}
                    placeholder="方法支持的参数名称、类型和描述，多个参数用;分隔，例如：get_current_time:string:获取当前时间;get_current_date:string:获取当前日期"
                    disabled={!isEditMode || isLoading}
                  />
                </div>

                {/* 功能描述 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">功能描述(description)</Label>
                  <AutoResizeTextarea
                    value={tool.description}
                    onChange={(e) => updateMcpTool(tool.id, 'description', e.target.value)}
                    placeholder="工具功能描述"
                    disabled={!isEditMode || isLoading}
                  />
                </div>

                {/* 返回值 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">返回值(returnValue)</Label>
                  <AutoResizeTextarea
                    value={tool.returnValue}
                    onChange={(e) => updateMcpTool(tool.id, 'returnValue', e.target.value)}
                    placeholder="工具返回值"
                    disabled={!isEditMode || isLoading}
                  />
                </div>
              </div>
            ))}

            {/* 添加方法按钮 */}
            <Button
              variant="outline"
              onClick={addMcpTool}
              className="flex items-center gap-2 disabled:opacity-50"
              disabled={!isEditMode || isLoading}
            >
              <Plus className="h-4 w-4" />
              增加方法
            </Button>
          </div>
        </div>


        <div className="flex justify-end gap-4 pt-4">
          {showSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-md">
              <Save className="h-4 w-4" />
              <span className="text-sm">应用成功</span>
            </div>
          )}

          {isEditMode && (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-border hover:bg-muted"
            >
              取消
            </Button>
          )}

          <Button
            onClick={isEditMode ? handleSave : handleEdit}
            className="bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : isEditMode ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                应用
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 项目已存在确认对话框 */}
      <Dialog open={showProjectExistsDialog} onOpenChange={setShowProjectExistsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              项目已存在
            </DialogTitle>
            <DialogDescription>
              项目 "{existingProjectName}" 已存在。是否要替换现有项目？替换操作将删除现有项目的所有文件。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleProjectExistsCancel}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleProjectExistsReplace} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  替换中...
                </>
              ) : (
                "替换"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
