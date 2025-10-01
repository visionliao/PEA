import { NextResponse } from "next/server"
import { writeFile, mkdir, copyFile, readdir, rm, access } from "fs/promises"
import { join } from "path"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectName, projectBackground, knowledgeBaseFiles, mcpTools, force } = body

    if (!projectName) {
      return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 })
    }

    // 创建项目输出目录
    const projectDir = join(process.cwd(), "output", "project", projectName)
    const knowledgeDir = join(projectDir, "knowledge")

    // 检查项目目录是否已存在
    try {
      await access(projectDir)
      // 如果能访问到目录，说明已存在
      if (!force) {
        return NextResponse.json({
          exists: true,
          message: `项目 "${projectName}" 已存在`,
          projectName: projectName
        }, { status: 409 })
      }
      // 如果强制覆盖，先删除现有目录
      await rm(projectDir, { recursive: true, force: true })
    } catch (error) {
      // 目录不存在，可以继续创建
    }

    // 创建项目目录
    await mkdir(projectDir, { recursive: true })
    await mkdir(knowledgeDir, { recursive: true })

    // 复制知识库文件
    const copiedFiles = []
    for (const filePath of knowledgeBaseFiles) {
      try {
        // 假设知识库文件在项目根目录下
        const sourcePath = join(process.cwd(), filePath)
        const destPath = join(knowledgeDir, filePath.split('/').pop() || filePath)
        
        await copyFile(sourcePath, destPath)
        copiedFiles.push({
          original: filePath,
          copied: `${projectName}/knowledge/${filePath.split('/').pop() || filePath}`
        })
      } catch (error) {
        console.error(`Error copying file ${filePath}:`, error)
      }
    }

    // 生成MCP Tools的JSON格式数据
    const mcpToolsJson = mcpTools.map((tool: any) => ({
      name: tool.methodName,
      parameters: tool.methodParams,
      description: tool.description,
      returnValue: tool.returnValue
    }))

    // 生成项目文件内容
    const projectContent = `# ${projectName}

## 项目背景
${projectBackground}

## 知识库文件
${knowledgeBaseFiles.length > 0 ? knowledgeBaseFiles.map((file: string) => `- ${file}`).join('\n') : '无'}

## MCP Tools
${mcpTools.length > 0 ? '```json\n' + JSON.stringify(mcpToolsJson, null, 2) + '\n```' : '无'}

## 文件生成时间
${new Date().toLocaleString('zh-CN')}
`

    // 写入项目文件
    const projectFilePath = join(projectDir, "project.md")
    await writeFile(projectFilePath, projectContent, 'utf-8')

    return NextResponse.json({
      success: true,
      message: "项目保存成功",
      projectFile: `${projectName}/project.md`,
      copiedFiles: copiedFiles,
      mcpToolsCount: mcpTools.length
    })

  } catch (error) {
    console.error("Error saving project:", error)
    return NextResponse.json(
      { error: "保存项目时发生错误" },
      { status: 500 }
    )
  }
}