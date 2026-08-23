import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase-server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=Email and password are required', request.url), {
      status: 303,
    })
  }

  const supabase = await createClient()

  // If dummy Supabase or dev fallback, allow immediate login
  const isDummy = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy') || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (isDummy) {
    const res = NextResponse.redirect(new URL('/', request.url), { status: 303 });
    res.cookies.set('demo-session', 'true', { path: '/', httpOnly: false });
    return res;
  }

  let { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // If email was not confirmed, automatically confirm it via admin and re-attempt login
  if (error && (error.message.toLowerCase().includes('confirm') || error.message.toLowerCase().includes('not confirmed'))) {
    try {
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const targetUser = users?.find(u => u.email?.toLowerCase() === email)
      if (targetUser) {
        await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { email_confirm: true })
        const retry = await supabase.auth.signInWithPassword({ email, password })
        error = retry.error
      }
    } catch (adminErr) {
      console.error('Auto-confirm retry error:', adminErr)
    }
  }

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message || 'Invalid email or password')}`, request.url), {
      status: 303,
    })
  }

  return NextResponse.redirect(new URL('/', request.url), {
    status: 303,
  })
}
