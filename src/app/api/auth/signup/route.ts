import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase-server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const company = String(formData.get('company') || 'My Workspace').trim()

  if (!email || !password) {
    return NextResponse.redirect(new URL('/signup?error=Email and password are required', request.url), {
      status: 303,
    })
  }

  const supabase = await createClient()

  let userId: string | null = null

  // Try creating confirmed user directly with supabaseAdmin
  try {
    const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { company }
    })

    if (adminData?.user) {
      userId = adminData.user.id
    } else {
      // Fallback to standard signUp
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(error.message)}`, request.url), {
          status: 303,
        })
      }
      userId = data.user?.id || null
    }
  } catch (err: any) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(error.message)}`, request.url), {
        status: 303,
      })
    }
    userId = data.user?.id || null
  }

  // Create organization and link member
  if (userId) {
    try {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .insert({ name: company })
        .select('id')
        .single()

      if (org) {
        await supabaseAdmin.from('organization_members').insert({
          organization_id: org.id,
          user_id: userId,
          role: 'owner'
        })
      }
    } catch (orgErr) {
      console.error('Error auto-creating organization:', orgErr)
    }
  }

  // Auto-login user immediately
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (!signInErr) {
    return NextResponse.redirect(new URL('/', request.url), {
      status: 303,
    })
  }

  return NextResponse.redirect(new URL('/login?message=Account created! Please sign in with your password.', request.url), {
    status: 303,
  })
}
