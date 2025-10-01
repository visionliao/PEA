"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ModelSettings } from "@/components/model-settings"
import { ProjectOverview } from "@/components/project-overview"
import { PromptFramework } from "@/components/prompt-framework"
import { RunResults } from "@/components/run-results"

export function SettingsLayout() {
  const [activeSection, setActiveSection] = useState("project-overview")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobile={isMobile}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {activeSection === "project-overview" && <ProjectOverview />}
        {activeSection === "prompt-framework" && <PromptFramework />}
        {activeSection === "model-settings" && <ModelSettings />}
        {activeSection === "run-results" && <RunResults />}
        {/* Other sections can be added here */}
      </main>
    </div>
  )
}
