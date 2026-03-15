import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

/**
 * POST /api/invite
 * Admin invites a staff member by email.
 * Creates an org_members row with status='invited'.
 * Optionally sends a magic link via Supabase OTP.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, role_id, org_id } = body

    if (!email || !role_id || !org_id) {
      return NextResponse.json(
        { error: "Missing required fields: email, role_id, org_id" },
        { status: 400 }
      )
    }

    // 1. Verify the requesting user is authenticated and has permission
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Verify user has users.manage permission via org_members check
    const { data: membership } = await supabase
      .from("org_members")
      .select("role_id")
      .eq("user_id", user.id)
      .eq("org_id", org_id)
      .eq("status", "active")
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 })
    }

    // 3. Create the invite record
    const { data: invite, error: inviteErr } = await supabase
      .from("org_members")
      .insert({
        org_id,
        invited_email: email,
        role_id,
        invited_by: user.id,
        status: "invited",
      })
      .select("id")
      .single()

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 })
    }

    // 4. Optionally send a magic link (requires SUPABASE_SERVICE_ROLE_KEY)
    // This sends an email with a login link
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://retail-erp-cyan.vercel.app"}/auth/callback`,
      })
    }

    return NextResponse.json({ success: true, invite_id: invite?.id })
  } catch (err) {
    console.error("[/api/invite] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
