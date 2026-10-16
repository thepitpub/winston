import { NextResponse, type NextRequest } from 'next/server'
import { atalhoDevLigado } from '@/lib/ambiente'
import { emitirSessao } from '@/lib/aplicacao/acesso'
import { concluirOnboarding } from '@/lib/aplicacao/onboarding'
import { auditar } from '@/lib/auditoria'
import { clienteSecreto } from '@/lib/db/clientes'
import { emailInterno } from '@/lib/dominio/regras-acesso'

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
  const userId = como === 'equipe' ? await garantirEquipeSintetica() : await garantirMembroSintetico()
  await emitirSessao(userId)
  await auditar({ ator: { userId, tipo: como === 'equipe' ? 'staff' : 'member' }, acao: 'dev.atalho', detalhes: { como } })
  return NextResponse.redirect(new URL(como === 'equipe' ? '/admin' : '/lobby', req.url))
}

async function garantirMembroSintetico(): Promise<string> {
  const adm = clienteSecreto()
  let m = (await adm.from('members').select('id, user_id').eq('is_synthetic', true).eq('full_name', 'Membro de Demonstração').maybeSingle()).data
  if (!m) {
    const r = await adm.from('members').insert({ full_name: 'Membro de Demonstração', display_name: 'Demonstração', status: 'invited', category: 'member', is_synthetic: true, source_system: 'sintetico_dev' }).select('id, user_id').single()
    if (r.error) throw new Error(r.error.message)
    m = r.data
  }
  let userId = m.user_id
  if (!userId) {
    const u = await adm.auth.admin.createUser({ email: emailInterno(m.id), email_confirm: true, app_metadata: { member_id: m.id, tipo: 'membro', sintetico: true } })
    if (u.error || !u.data.user) throw new Error(u.error?.message)
    userId = u.data.user.id
    await adm.from('members').update({ user_id: userId }).eq('id', m.id)
    await adm.from('member_roles').insert({ user_id: userId, role: 'member' })
  }
  await concluirOnboarding(m.id, userId)
  return userId
}

async function garantirEquipeSintetica(): Promise<string> {
  const adm = clienteSecreto()
  const email = 'equipe-demonstracao@continental.invalid'
  const s = (await adm.from('staff_members').select('user_id').eq('email', email).maybeSingle()).data
  if (s) return s.user_id
  const u = await adm.auth.admin.createUser({ email, email_confirm: true, app_metadata: { tipo: 'equipe', sintetico: true } })
  if (u.error || !u.data.user) throw new Error(u.error?.message)
  const userId = u.data.user.id
  await adm.from('staff_members').insert({ user_id: userId, full_name: 'Equipe de Demonstração', email, is_synthetic: true })
  await adm.from('member_roles').insert({ user_id: userId, role: 'super_admin' })
  // Sem cs.read/cs.write: a identidade sintética nunca lê a inteligência
  // privada dos membros reais. Para ver essa seção, use uma conta real da
  // equipe com a concessão explícita (npm run staff:criar -- --cs).
  return userId
}
