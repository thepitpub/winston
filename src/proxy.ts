import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Renova a sessão do Supabase (cookies) a cada navegação e faz a checagem
 * OTIMISTA de rota. A autorização de verdade (membro ativo, AAL2,
 * permissões, sessão revogada) é feita nos layouts e nas ações, no
 * servidor, contra o banco.
 */
const ABERTAS = ['/login', '/invite', '/admin/login', '/dev', '/_next', '/favicon', '/icone', '/manifest']

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req })
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) req.cookies.set(name, value)
        res = NextResponse.next({ request: req })
        for (const { name, value, options } of lista) res.cookies.set(name, value, options)
      },
    },
  })
  // getClaims valida o JWT; também dispara o refresh quando ele venceu.
  const { data } = await sb.auth.getClaims()
  const logado = Boolean(data?.claims?.sub)
  const { pathname } = req.nextUrl

  const redirecionar = (destino: string) => {
    const r = NextResponse.redirect(new URL(destino, req.url))
    for (const c of res.cookies.getAll()) r.cookies.set(c)
    return r
  }
  if (pathname === '/') return redirecionar(logado ? '/lobby' : '/login')
  if (ABERTAS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return res
  if (!logado) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ erro: 'Sessão necessária.' }, { status: 401 })
    return redirecionar(pathname.startsWith('/admin') ? '/admin/login' : '/login')
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|robots.txt).*)'],
}
