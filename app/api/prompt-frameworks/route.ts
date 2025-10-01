import { NextResponse } from "next/server"
import { readFile, readdir } from "fs/promises"
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