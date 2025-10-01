import { NextResponse } from "next/server"
import { readFile, readdir, writeFile, mkdir, access } from "fs/promises"
import { join } from "path"

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

interface FrameworkData {
  name: string
  description: string
  properties: { name: string; description: string }[]
}

function parseMarkdownFramework(content: string, filename: string): PromptFramework | null {
  const lines = content.split('\n')

  // Extract framework name from filename (remove .md extension)
  const id = filename.replace('.md', '').toLowerCase()
  const name = filename.replace('.md', '')

  let description = ""
  let inCoreSection = false
  let inExampleSection = false
  const properties: { name: string; description: string }[] = []
  let scenario = ""
  let promptLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Extract description from lines that start with ** and contain framework description
    if (line.startsWith('**') && line.includes('**是') && !description && !line.includes('**定义**')) {
      description = line.replace(/\*\*/g, '')
      continue
    }

    // Check if we're entering the core section
    if (line.startsWith('## 核心构成') || line === '## 核心组件') {
      inCoreSection = true
      inExampleSection = false
      continue
    }

    // Check if we're entering the example section
    if (line === '## 应用示例') {
      inExampleSection = true
      inCoreSection = false
      continue
    }

    // Exit sections when we encounter a new major section
    if (line.startsWith('## ') && !line.startsWith('## 核心构成') && line !== '## 核心组件' && line !== '## 应用示例') {
      inCoreSection = false
      inExampleSection = false
      continue
    }

    // Parse properties in core section
    if (inCoreSection && line.startsWith('### ')) {
      let propertyName = line.replace('### ', '').trim()

      // Special handling for LangGPT format - clean up backticks and code formatting
      if (propertyName.includes('`')) {
        propertyName = propertyName.replace(/`([^`]+)`/, '$1')
      }

      // Look at the next line for the definition
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim()
        if (nextLine.startsWith('> **定义**：')) {
          const propertyDescription = nextLine.replace('> **定义**：', '').trim()
          properties.push({
            name: propertyName,
            description: propertyDescription
          })
        }
      }
    }

    // Parse examples
    if (inExampleSection) {
      if (line.startsWith('**场景**：')) {
        scenario = line.replace('**场景**：', '').trim()
      } else if (line.startsWith('```')) {
        // Found code block, collect all lines until closing ```
        let j = i + 1
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          promptLines.push(lines[j]) // Preserve original indentation
          j++
        }
        i = j // Skip to after the code block
      }
    }
  }

  // If we couldn't extract description from specific patterns, use the first meaningful paragraph
  if (!description) {
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#') && !line.startsWith('---') && line !== '') {
        description = line.replace(/\*\*/g, '').trim()
        break
      }
    }
  }

  const examples = scenario && promptLines.length > 0 ? {
    scenario,
    prompt: promptLines.join('\n')
  } : undefined

  return {
    id,
    name,
    description,
    properties: properties.length > 0 ? properties : undefined,
    examples
  }
}

function generateMarkdownContent(framework: FrameworkData): string {
  const content = []

  // 框架介绍部分
  content.push(`# 框架介绍：${framework.name} 提示词法`)
  content.push("")
  content.push(`**${framework.name}** ${framework.description}`)
  content.push("")
  content.push("---")
  content.push("")

  // 核心构成部分
  content.push("## 核心构成")
  content.push("")

  framework.properties.forEach((property, index) => {
    content.push(`### ${index + 1}. ${property.name}`)
    content.push(`> **定义**：${property.description}`)
    content.push("")
  })

  content.push("---")
  content.push("")
  content.push("## 应用示例")
  content.push("")
  content.push("**场景**：此处为框架应用场景示例")
  content.push("")
  content.push("按照框架结构，构建提示词：")
  content.push("")
  content.push("```yaml")
  content.push("# 请根据框架属性在此处添加具体示例内容")
  content.push("```")

  return content.join("\n")
}

export async function GET() {
  try {
    const promptDir = join(process.cwd(), "template", "prompt")

    // Read all markdown files in the prompt directory
    const files = await readdir(promptDir)
    const markdownFiles = files.filter(file => file.endsWith('.md') && file !== 'readme.txt')

    const frameworks: PromptFramework[] = []

    for (const file of markdownFiles) {
      try {
        const filePath = join(promptDir, file)
        const content = await readFile(filePath, 'utf-8')
        const framework = parseMarkdownFramework(content, file)

        if (framework) {
          frameworks.push(framework)
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      frameworks
    })

  } catch (error) {
    console.error("Error loading prompt frameworks:", error)
    return NextResponse.json(
      { error: "Failed to load prompt frameworks" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const framework: FrameworkData = await request.json()
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Validate framework data
    if (!framework.name || !framework.description || !framework.properties || framework.properties.length === 0) {
      return NextResponse.json(
        { error: "Framework name, description, and at least one property are required" },
        { status: 400 }
      )
    }

    // Create filename
    const filename = `${framework.name}.md`
    const filePath = join(process.cwd(), "template", "prompt", filename)

    // Check if file exists
    try {
      await access(filePath)
      if (!force) {
        return NextResponse.json({ exists: true, success: false })
      }
    } catch {
      // File doesn't exist, continue with saving
    }

    // Generate markdown content
    const markdownContent = generateMarkdownContent(framework)

    // Ensure directory exists
    const dirPath = join(process.cwd(), "template", "prompt")
    try {
      await mkdir(dirPath, { recursive: true })
    } catch {
      // Directory already exists
    }

    // Write file
    await writeFile(filePath, markdownContent, 'utf-8')

    return NextResponse.json({
      success: true,
      message: "Framework saved successfully",
      filename: filename,
      filePath: filePath
    })

  } catch (error) {
    console.error("Error saving framework:", error)
    return NextResponse.json(
      { error: "Failed to save framework" },
      { status: 500 }
    )
  }
}