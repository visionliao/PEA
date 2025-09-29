"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ModelSettings } from "@/components/model-settings"

export function SettingsLayout() {
  const [activeSection, setActiveSection] = useState("model-settings")
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
        {activeSection === "model-settings" && <ModelSettings />}
        {/* Other sections can be added here */}
      </main>
    </div>
  )
}
