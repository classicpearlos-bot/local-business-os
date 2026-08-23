import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase-server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const company = String(formData.get('company'))

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${new URL(request.url).origin}/api/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.redirect(new URL('/signup?error=true', request.url), {
      status: 301,
    })
  }

  // Create the organization and add the user as owner
  if (data.user) {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: company })
      .select('id')
      .single()

    if (org && !orgError) {
      await supabaseAdmin.from('organization_members').insert({
        organization_id: org.id,
        user_id: data.user.id,
        role: 'owner'
      })
    }
  }

  return NextResponse.redirect(new URL('/login?message=Check your email to continue sign in process', request.url), {
    status: 301,
  })
}
