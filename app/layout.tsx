import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/layout/app-shell"
import { AuthProvider } from "@/lib/supabase/auth-context"
import { OfflineProvider } from "@/lib/offline/offline-provider"
import { RBACProvider } from "@/lib/rbac/rbac-context"
import { I18nProvider } from "@/lib/i18n/context"
import { ThemeProvider } from "@/lib/theme/theme-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Retail ERP - Business Management System",
  description: "Professional Enterprise Resource Planning system for business management",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <OfflineProvider>
            <ThemeProvider>
              <RBACProvider>
                <I18nProvider>
                  <AppShell>{children}</AppShell>
                </I18nProvider>
              </RBACProvider>
            </ThemeProvider>
          </OfflineProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
