// NOTE: Auth logic lives in middleware.ts (Next.js 16 migration in progress)
// This file exists to satisfy the proxy.ts file convention detection
import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
