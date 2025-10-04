import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// MCP Tool 接口
interface McpTool {
  id: string
  methodName: string
  methodParams: string
  description: string
  returnValue: string
}

// 提示词框架接口
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

// 模型参数接口
interface ModelParams {
  streamingEnabled: boolean
  temperature: number[]
  topP: number[]
  presencePenalty: number[]
  frequencyPenalty: number[]
  singleResponseLimit: boolean
  maxTokens: number[]
  maxTokensInput: string
  intelligentAdjustment: boolean
  reasoningEffort: string
}

// 模型配置接口
interface ModelConfig {
  name: string
  provider: string
  color: string
}

interface ProviderConfig {
  apiKey: string
  modelList: string[]
  displayName: string
  color: string
}

// 运行状态接口
interface RunStatus {
  isRunning: boolean
  startTime?: Date
  endTime?: Date
  results?: any[]
  error?: string
}

// 全局状态接口
interface AppState {
  // UI 状态
  activeSection: string
  sidebarCollapsed: boolean
  isMobile: boolean
  
  // 项目概况状态
  projectConfig: {
    selectedProject: string
    projectFiles: string[]
    projectName: string
    projectBackground: string
    knowledgeBaseFiles: string[]
    knowledgeBaseFileData: any[]
    isDragging: boolean
    mcpTools: McpTool[]
    mcpToolsCode: string
    parseError: string
    isLoading: boolean
    isEditMode: boolean
    showSuccess: boolean
    showProjectExistsDialog: boolean
    existingProjectName: string
  }
  
  // 提示词框架状态
  promptFrameworkConfig: {
    frameworks: PromptFramework[]
    loading: boolean
    selectedFrameworks: Set<string>
    selectAll: boolean
    selectedFramework: string | null
    editingFramework: {
      name: string
      description: string
      properties: { name: string; description: string }[]
      examples?: {
        scenario: string
        prompt: string
      }
    } | null
    isCreatingCustom: boolean
    validationErrors: { [key: string]: string }
    isSaving: boolean
    showReplaceConfirm: boolean
  }
  
  // 模型设置状态
  modelSettingsConfig: {
    models: ModelConfig[]
    providers: { [key: string]: ProviderConfig }
    promptModel: string
    workModel: string
    scoreModel: string
    promptModelParams: ModelParams
    workModelParams: ModelParams
    scoreModelParams: ModelParams
  }
  
  // 运行结果状态
  runResultsConfig: {
    runStatus: RunStatus
    testLoopEnabled: boolean
    testLoopCount: number
    scoreThresholdEnabled: boolean
    scoreThreshold: number
    totalTestScore: number
  }
  
  // Actions
  // UI Actions
  setActiveSection: (section: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setIsMobile: (mobile: boolean) => void
  
  // Project Actions
  updateProjectConfig: (config: Partial<AppState['projectConfig']>) => void
  setSelectedProject: (project: string) => void
  setProjectFiles: (files: string[]) => void
  setProjectName: (name: string) => void
  setProjectBackground: (background: string) => void
  setKnowledgeBaseFiles: (files: string[]) => void
  setKnowledgeBaseFileData: (fileData: any[]) => void
  setIsDragging: (dragging: boolean) => void
  setMcpTools: (tools: McpTool[]) => void
  setMcpToolsCode: (code: string) => void
  setParseError: (error: string) => void
  setProjectLoading: (loading: boolean) => void
  setIsEditMode: (edit: boolean) => void
  setShowSuccess: (show: boolean) => void
  setShowProjectExistsDialog: (show: boolean) => void
  setExistingProjectName: (name: string) => void
  
  // Prompt Framework Actions
  updatePromptFrameworkConfig: (config: Partial<AppState['promptFrameworkConfig']>) => void
  setFrameworks: (frameworks: PromptFramework[] | ((prev: PromptFramework[]) => PromptFramework[])) => void
  setPromptFrameworkLoading: (loading: boolean) => void
  setSelectedFrameworks: (frameworks: Set<string>) => void
  setSelectAll: (selectAll: boolean) => void
  setSelectedFramework: (framework: string | null) => void
  setEditingFramework: (framework: any) => void
  setIsCreatingCustom: (creating: boolean) => void
  setValidationErrors: (errors: { [key: string]: string }) => void
  setIsSaving: (saving: boolean) => void
  setShowReplaceConfirm: (show: boolean) => void
  
  // Model Settings Actions
  updateModelSettingsConfig: (config: Partial<AppState['modelSettingsConfig']>) => void
  setModels: (models: ModelConfig[]) => void
  setProviders: (providers: { [key: string]: ProviderConfig }) => void
  setPromptModel: (model: string) => void
  setWorkModel: (model: string) => void
  setScoreModel: (model: string) => void
  setPromptModelParams: (params: ModelParams) => void
  setWorkModelParams: (params: ModelParams) => void
  setScoreModelParams: (params: ModelParams) => void
  
  // Run Results Actions
  updateRunResultsConfig: (config: Partial<AppState['runResultsConfig']>) => void
  setRunStatus: (status: RunStatus) => void
  startRun: () => void
  stopRun: () => void
  setRunResults: (results: any[]) => void
  setRunError: (error: string) => void
  setTestLoopEnabled: (enabled: boolean) => void
  setTestLoopCount: (count: number) => void
  setScoreThresholdEnabled: (enabled: boolean) => void
  setScoreThreshold: (threshold: number) => void
  setTotalTestScore: (score: number) => void
}

// 默认模型参数
const defaultModelParams: ModelParams = {
  streamingEnabled: true,
  temperature: [1.0],
  topP: [1.0],
  presencePenalty: [0.0],
  frequencyPenalty: [0.0],
  singleResponseLimit: false,
  maxTokens: [0],
  maxTokensInput: "0",
  intelligentAdjustment: false,
  reasoningEffort: "中"
}

// 创建 Zustand store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // UI 状态默认值
      activeSection: "project-overview",
      sidebarCollapsed: false,
      isMobile: false,
      
      // 项目概况默认值
      projectConfig: {
        selectedProject: "自定义",
        projectFiles: [],
        projectName: "",
        projectBackground: "",
        knowledgeBaseFiles: [],
        knowledgeBaseFileData: [],
        isDragging: false,
        mcpTools: [],
        mcpToolsCode: "",
        parseError: "",
        isLoading: false,
        isEditMode: true,
        showSuccess: false,
        showProjectExistsDialog: false,
        existingProjectName: ""
      },
      
      // 提示词框架默认值
      promptFrameworkConfig: {
        frameworks: [],
        loading: true,
        selectedFrameworks: new Set(),
        selectAll: false,
        selectedFramework: null,
        editingFramework: null,
        isCreatingCustom: false,
        validationErrors: {},
        isSaving: false,
        showReplaceConfirm: false
      },
      
      // 模型设置默认值
      modelSettingsConfig: {
        models: [],
        providers: {},
        promptModel: "",
        workModel: "",
        scoreModel: "",
        promptModelParams: { ...defaultModelParams },
        workModelParams: { ...defaultModelParams },
        scoreModelParams: { ...defaultModelParams }
      },
      
      // 运行结果默认值
      runResultsConfig: {
        runStatus: {
          isRunning: false
        },
        testLoopEnabled: true,
        testLoopCount: 10,
        scoreThresholdEnabled: false,
        scoreThreshold: 50,
        totalTestScore: 0
      },
      
      // UI Actions
      setActiveSection: (section) => set({ activeSection: section }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setIsMobile: (mobile) => set({ isMobile: mobile }),
      
      // Project Actions
      updateProjectConfig: (config) => 
        set((state) => ({ 
          projectConfig: { ...state.projectConfig, ...config } 
        })),
      
      setSelectedProject: (project) => 
        get().updateProjectConfig({ selectedProject: project }),
      
      setProjectFiles: (files) => 
        get().updateProjectConfig({ projectFiles: files }),
      
      setProjectName: (name) => 
        get().updateProjectConfig({ projectName: name }),
      
      setProjectBackground: (background) => 
        get().updateProjectConfig({ projectBackground: background }),
      
      setKnowledgeBaseFiles: (files) => 
        get().updateProjectConfig({ knowledgeBaseFiles: files }),
      
      setKnowledgeBaseFileData: (fileData) =>
        get().updateProjectConfig({ knowledgeBaseFileData: fileData }),

      setIsDragging: (dragging) => 
        get().updateProjectConfig({ isDragging: dragging }),
      
      setMcpTools: (tools) => 
        get().updateProjectConfig({ mcpTools: tools }),
      
      setMcpToolsCode: (code) => 
        get().updateProjectConfig({ mcpToolsCode: code }),
      
      setParseError: (error) => 
        get().updateProjectConfig({ parseError: error }),
      
      setProjectLoading: (loading) => 
        get().updateProjectConfig({ isLoading: loading }),
      
      setIsEditMode: (edit) => 
        get().updateProjectConfig({ isEditMode: edit }),
      
      setShowSuccess: (show) => 
        get().updateProjectConfig({ showSuccess: show }),
      
      setShowProjectExistsDialog: (show) => 
        get().updateProjectConfig({ showProjectExistsDialog: show }),
      
      setExistingProjectName: (name) => 
        get().updateProjectConfig({ existingProjectName: name }),
      
      // Prompt Framework Actions
      updatePromptFrameworkConfig: (config) => 
        set((state) => ({ 
          promptFrameworkConfig: { ...state.promptFrameworkConfig, ...config } 
        })),
      
      setFrameworks: (frameworks) => 
        typeof frameworks === 'function' 
          ? get().updatePromptFrameworkConfig({ frameworks: frameworks(get().promptFrameworkConfig.frameworks) })
          : get().updatePromptFrameworkConfig({ frameworks }),
      
      setPromptFrameworkLoading: (loading) => 
        get().updatePromptFrameworkConfig({ loading }),
      
      setSelectedFrameworks: (frameworks) => 
        get().updatePromptFrameworkConfig({ selectedFrameworks: frameworks }),
      
      setSelectAll: (selectAll) => 
        get().updatePromptFrameworkConfig({ selectAll }),
      
      setSelectedFramework: (framework) => 
        get().updatePromptFrameworkConfig({ selectedFramework: framework }),
      
      setEditingFramework: (framework) => 
        get().updatePromptFrameworkConfig({ editingFramework: framework }),
      
      setIsCreatingCustom: (creating) => 
        get().updatePromptFrameworkConfig({ isCreatingCustom: creating }),
      
      setValidationErrors: (errors) => 
        get().updatePromptFrameworkConfig({ validationErrors: errors }),
      
      setIsSaving: (saving) => 
        get().updatePromptFrameworkConfig({ isSaving: saving }),
      
      setShowReplaceConfirm: (show) => 
        get().updatePromptFrameworkConfig({ showReplaceConfirm: show }),
      
      // Model Settings Actions
      updateModelSettingsConfig: (config) => 
        set((state) => ({ 
          modelSettingsConfig: { ...state.modelSettingsConfig, ...config } 
        })),
      
      setModels: (models) => 
        get().updateModelSettingsConfig({ models }),
      
      setProviders: (providers) => 
        get().updateModelSettingsConfig({ providers }),
      
      setPromptModel: (model) => 
        get().updateModelSettingsConfig({ promptModel: model }),
      
      setWorkModel: (model) => 
        get().updateModelSettingsConfig({ workModel: model }),
      
      setScoreModel: (model) => 
        get().updateModelSettingsConfig({ scoreModel: model }),
      
      setPromptModelParams: (params) => 
        get().updateModelSettingsConfig({ promptModelParams: params }),
      
      setWorkModelParams: (params) => 
        get().updateModelSettingsConfig({ workModelParams: params }),
      
      setScoreModelParams: (params) => 
        get().updateModelSettingsConfig({ scoreModelParams: params }),
      
      // Run Results Actions
      updateRunResultsConfig: (config) => 
        set((state) => ({ 
          runResultsConfig: { ...state.runResultsConfig, ...config } 
        })),
      
      setRunStatus: (status) => 
        get().updateRunResultsConfig({ runStatus: status }),
      
      startRun: () => 
        get().setRunStatus({ 
          isRunning: true, 
          startTime: new Date(), 
          endTime: undefined, 
          results: [], 
          error: undefined 
        }),
      
      stopRun: () => 
        get().setRunStatus({ 
          isRunning: false, 
          endTime: new Date() 
        }),
      
      setRunResults: (results) => 
        get().updateRunResultsConfig({ 
          runStatus: { ...get().runResultsConfig.runStatus, results } 
        }),
      
      setRunError: (error) => 
        get().updateRunResultsConfig({ 
          runStatus: { ...get().runResultsConfig.runStatus, error, isRunning: false } 
        }),

      setTestLoopEnabled: (enabled) =>
        get().updateRunResultsConfig({ testLoopEnabled: enabled }),

      setTestLoopCount: (count) =>
        get().updateRunResultsConfig({ testLoopCount: count }),

      setScoreThresholdEnabled: (enabled) =>
        get().updateRunResultsConfig({ scoreThresholdEnabled: enabled }),

      setScoreThreshold: (threshold) =>
        get().updateRunResultsConfig({ scoreThreshold: threshold }),

      setTotalTestScore: (score) =>
        get().updateRunResultsConfig({ totalTestScore: score })
    }),
    {
      name: 'pea-app-storage',
      // 只持久化必要的配置数据，不包含临时状态
      partialize: (state) => ({
        projectConfig: {
          selectedProject: state.projectConfig.selectedProject,
          projectName: state.projectConfig.projectName,
          projectBackground: state.projectConfig.projectBackground,
          knowledgeBaseFiles: state.projectConfig.knowledgeBaseFiles,
          mcpTools: state.projectConfig.mcpTools,
          mcpToolsCode: state.projectConfig.mcpToolsCode,
        },
        promptFrameworkConfig: {
          selectedFrameworks: state.promptFrameworkConfig.selectedFrameworks,
        },
        modelSettingsConfig: {
          promptModel: state.modelSettingsConfig.promptModel,
          workModel: state.modelSettingsConfig.workModel,
          scoreModel: state.modelSettingsConfig.scoreModel,
          promptModelParams: state.modelSettingsConfig.promptModelParams,
          workModelParams: state.modelSettingsConfig.workModelParams,
          scoreModelParams: state.modelSettingsConfig.scoreModelParams,
        },
      }),
    }
  )
)