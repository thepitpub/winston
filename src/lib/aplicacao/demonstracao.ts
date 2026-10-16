import 'server-only'
import { clienteSecreto } from '../db/clientes'
import { emailInterno } from '../dominio/regras-acesso'
import { concluirOnboarding } from './onboarding'

/*
 * Identidades de DEMONSTRAÇÃO (is_synthetic). Usadas pelo atalho de
 * desenvolvimento e pelo modo apresentação. A RLS vale como para qualquer
 * membro: a identidade sintética só vê o que é dela e o diretório
 * consentido; nunca lê dados de outro membro nem o CS privado.
 */

export async function garantirMembroDemonstracao(): Promise<string> {
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

export async function garantirEquipeDemonstracao(): Promise<string> {
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
  // privada dos membros reais (o banco também recusa, por gatilho).
  return userId
}
