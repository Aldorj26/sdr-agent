import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { senha } = (await req.json()) as { senha?: string }
  const expected = process.env.DASHBOARD_PASSWORD

  if (!expected || senha !== expected) {
    return NextResponse.json({ error: 'senha_invalida' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('dash_auth', expected, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })
  return res
}
