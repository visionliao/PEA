import { NextResponse } from "next/server"
import { readdir, stat, readFile } from "fs/promises"
import { join } from "path"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectName = searchParams.get('projectName')

    // 如果指定了项目名称，返回该项目的详细数据
    if (projectName) {
      return await getProjectData(projectName)
    }

    // 否则返回项目列表
    return await getProjectList()
  } catch (error) {
    console.error("Error in history-projects API:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

async function getProjectList() {
  try {
    const projectPath = join(process.cwd(), "output", "project")

    // Read all items in the directory
    const items = await readdir(projectPath)

    // Filter for directories only (project folders)
    const projectFolders = []

    for (const item of items) {
      const itemPath = join(projectPath, item)
      const stats = await stat(itemPath)

      if (stats.isDirectory()) {
        projectFolders.push(item)
      }
    }

    return NextResponse.json(projectFolders)
  } catch (error) {
    console.error("Error reading project directory:", error)
    return NextResponse.json([])
  }
}

async function getProjectData(projectName: string) {
  try {
    const projectDir = join(process.cwd(), "output", "project", projectName)
    const projectFilePath = join(projectDir, "project.md")
    const knowledgeDir = join(projectDir, "knowledge")

    // 读取项目基本信息
    let projectData = {
      projectName: "",
      projectBackground: "",
      knowledgeBaseFiles: [] as string[],
      mcpTools: [] as Array<{
        methodName: string
        methodParams: string
        description: string
        returnValue: string
      }>
    }

    try {
      // 读取项目文件
      const projectContent = await readFile(projectFilePath, 'utf-8')

      // 提取项目名称
      const titleMatch = projectContent.match(/^#\s+(.+)$/m)
      if (titleMatch) {
        projectData.projectName = titleMatch[1].trim()
      }

      // 提取项目背景
      const backgroundMatch = projectContent.match(/## 项目背景\s*\n([\s\S]*?)(?=\n## |$)/)
      if (backgroundMatch) {
        projectData.projectBackground = backgroundMatch[1].trim()
      }

      // 提取知识库文件
      const filesMatch = projectContent.match(/## 知识库文件\s*\n([\s\S]*?)(?=\n## |$)/)
      if (filesMatch) {
        const filesText = filesMatch[1]
        const fileLines = filesText.split('\n')
        for (const line of fileLines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('- ')) {
            const fileName = trimmedLine.substring(2).trim()
            if (fileName && fileName !== '无') {
              projectData.knowledgeBaseFiles.push(fileName)
            }
          }
        }
      }

      // 提取MCP Tools JSON
      const toolsMatch = projectContent.match(/## MCP Tools\s*\n```json\s*\n([\s\S]*?)\n```/)
      if (toolsMatch) {
        try {
          const jsonString = toolsMatch[1].trim()
          const toolsData = JSON.parse(jsonString)

          if (Array.isArray(toolsData)) {
            projectData.mcpTools = toolsData.map(tool => ({
              methodName: tool.name || tool.methodName || "",
              methodParams: tool.parameters || tool.methodParams || "",
              description: tool.description || "",
              returnValue: tool.returnValue || tool.returns || ""
            }))
          }
        } catch (error) {
          console.error("Error parsing MCP Tools JSON:", error)
        }
      }
    } catch (error) {
      console.error("Error reading project file:", error)
    }

    // 如果没有从项目文件中读取到知识库文件，尝试从knowledge目录读取
    if (projectData.knowledgeBaseFiles.length === 0) {
      try {
        const knowledgeFiles = await readdir(knowledgeDir)
        projectData.knowledgeBaseFiles = knowledgeFiles.map(file => `${projectName}/knowledge/${file}`)
      } catch (error) {
        console.log("No knowledge directory found for project:", projectName)
      }
    }

    return NextResponse.json(projectData)

  } catch (error) {
    console.error("Error loading project data:", error)
    return NextResponse.json(
      { error: "加载项目数据失败" },
      { status: 500 }
    )
  }
}
