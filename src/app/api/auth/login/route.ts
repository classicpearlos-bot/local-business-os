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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message || 'Invalid email or password')}`, request.url), {
      status: 303,
    })
  }

  return NextResponse.redirect(new URL('/', request.url), {
    status: 303,
  })
}
