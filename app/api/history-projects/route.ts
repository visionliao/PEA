import { NextResponse } from "next/server"
import { readdir } from "fs/promises"
import { join } from "path"

export async function GET() {
  try {
    const historyPath = join(process.cwd(), "output", "history_project")

    // Read all files in the directory
    const files = await readdir(historyPath)

    // Filter for .md files only
    const mdFiles = files.filter((file) => file.endsWith(".md"))

    return NextResponse.json(mdFiles)
  } catch (error) {
    // If directory doesn't exist or other error, return empty array
    console.error("Error reading history_project directory:", error)
    return NextResponse.json([])
  }
}
