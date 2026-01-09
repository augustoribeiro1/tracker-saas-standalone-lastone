"use client"

import { useState } from "react"
import { SessionProvider } from "next-auth/react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { MobileSidebar } from "./mobile-sidebar"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
