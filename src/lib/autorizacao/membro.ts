import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { atalhoDevLigado } from '../ambiente'
import { clienteDoUsuario, clienteSecreto } from '../db/clientes'
import { identidade, type Identidade } from './sessao'

export interface MembroDaSessao {
  id: string
  status: 'pending' | 'invited' | 'active' | 'suspended' | 'revoked'
  category: 'founder' | 'member' | 'honorary'
  full_name: string
  display_name: string | null
  founder_number: number | null
  joined_at: string | null
  is_synthetic: boolean
}

const COLUNAS = 'id, status, category, full_name, display_name, founder_number, joined_at, is_synthetic'

/** O membro da sessão, lido com o JWT dele (RLS: só a própria linha). */
export const membroDaSessao = cache(async (): Promise<{ id: Identidade; membro: MembroDaSessao } | null> => {
  const id = await identidade()
  if (!id) return null
  const sb = await clienteDoUsuario()
  const r = await sb.from('members').select(COLUNAS).eq('user_id', id.userId).maybeSingle()
  if (r.error || !r.data) return null
  return { id, membro: r.data as MembroDaSessao }
})

async function mfaObrigatorio(): Promise<boolean> {
  const r = await clienteSecreto().from('app_settings').select('value').eq('key', 'mfa_obrigatorio_membro').maybeSingle()
  return r.data?.value !== false
}

export async function temFatorVerificado(): Promise<boolean> {
  const sb = await clienteDoUsuario()
  const f = await sb.auth.mfa.listFactors()
  return (f.data?.totp ?? []).some((x) => x.status === 'verified')
}

/**
 * Porteiro do Portal. Sem sessão: /login. Convite aceito e onboarding
 * pendente: /onboarding. Suspenso ou revogado: fora. MFA obrigatório e
 * sessão ainda em AAL1: segundo fator.
 */
export async function exigirMembro(opcoes: { onboarding?: boolean } = {}): Promise<{ id: Identidade; membro: MembroDaSessao }> {
  const s = await membroDaSessao()
  if (!s) redirect('/login')
  const { membro, id } = s
  if (membro.status === 'suspended' || membro.status === 'revoked') redirect('/login?e=acesso_suspenso')
  if (opcoes.onboarding) return s
  if (membro.status !== 'active') redirect('/onboarding')
  if (id.aal !== 'aal2' && !(membro.is_synthetic && atalhoDevLigado()) && (await mfaObrigatorio())) {
    redirect((await temFatorVerificado()) ? '/login/mfa' : '/onboarding')
  }
  return s
}
