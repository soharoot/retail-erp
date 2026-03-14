import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"
  const errorParam = searchParams.get("error_description")

  // Handle Supabase error redirects (e.g. expired/invalid link)
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorParam)}`
    )
  }

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
    )
  }

  // No code and no error — invalid access
  return NextResponse.redirect(`${origin}/login`)
}
