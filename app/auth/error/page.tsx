"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Suspense } from "react"

function ErrorContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get("message") || "An authentication error occurred."

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e6f0ed] via-white to-[#cfe6f2] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-5">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 text-sm font-medium text-white bg-[#00483c] rounded-lg hover:bg-[#003d33] transition-colors"
            >
              Back to sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 text-sm font-medium text-[#00483c] border border-[#99c1b6] rounded-lg hover:bg-[#e6f0ed] transition-colors"
            >
              Create a new account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
