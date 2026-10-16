import { NextResponse, type NextRequest } from 'next/server'
import { atalhoDevLigado } from '@/lib/ambiente'
import { emitirSessao } from '@/lib/aplicacao/acesso'
import { garantirEquipeDemonstracao, garantirMembroDemonstracao } from '@/lib/aplicacao/demonstracao'
import { auditar } from '@/lib/auditoria'

/**
 * ATALHO DE DESENVOLVIMENTO. Abre o Portal ou o Command sem telefone e sem
 * autenticador, como uma identidade SINTÉTICA marcada (is_synthetic):
 * "Membro de Demonstração" ou "Equipe de Demonstração". Só responde com
 * NODE_ENV diferente de production E CH_DEV_ATALHO=1; caso contrário, 404.
 * A sessão é real (Supabase Auth), então a RLS vale como para qualquer um.
 */
export async function GET(req: NextRequest) {
  if (!atalhoDevLigado()) return new NextResponse('Not found', { status: 404 })
  // Só da própria máquina: o servidor de dev escuta só em 127.0.0.1
  // (npm run dev) e o Host precisa ser de loopback.
  const host = (req.headers.get('host') ?? '').split(':')[0] ?? ''
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return new NextResponse('Not found', { status: 404 })
  const como = req.nextUrl.searchParams.get('como') === 'equipe' ? 'equipe' : 'membro'
  const userId = como === 'equipe' ? await garantirEquipeDemonstracao() : await garantirMembroDemonstracao()
  await emitirSessao(userId)
  await auditar({ ator: { userId, tipo: como === 'equipe' ? 'staff' : 'member' }, acao: 'dev.atalho', detalhes: { como } })
  return NextResponse.redirect(new URL(como === 'equipe' ? '/admin' : '/lobby', req.url))
}
