import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { atalhoDevLigado } from '../ambiente'
import { auditar } from '../auditoria'
import { clienteSecreto } from '../db/clientes'
import type { Papel, Permissao } from './permissoes'
import { identidade, type Identidade } from './sessao'

export interface ContextoEquipe {
  id: Identidade
  nome: string
  email: string
  papeis: Papel[]
  permissoes: Set<Permissao>
  sintetico: boolean
  /** Senha provisória ainda não trocada: só a tela de troca abre. */
  trocarSenha: boolean
}

export class ErroDeAcesso extends Error {
  constructor(
    mensagem: string,
    readonly motivo: 'sem_sessao' | 'sem_mfa' | 'sem_permissao' | 'nao_equipe' | 'trocar_senha',
  ) {
    super(mensagem)
  }
}

/**
 * A equipe, conferida no banco a cada requisição: pessoa ativa, papéis e
 * concessões explícitas. Exige AAL2 (MFA) sempre; a única exceção é o
 * atalho de desenvolvimento para a equipe SINTÉTICA, fora de produção.
 */
export const contextoDaEquipe = cache(async (): Promise<ContextoEquipe | ErroDeAcesso> => {
  const id = await identidade()
  if (!id) return new ErroDeAcesso('Entre para continuar.', 'sem_sessao')
  const adm = clienteSecreto()
  const [pessoa, papeis, explicitas] = await Promise.all([
    adm.from('staff_members').select('full_name, email, status, is_synthetic, must_change_password').eq('user_id', id.userId).maybeSingle(),
    adm.from('member_roles').select('role').eq('user_id', id.userId),
    adm.from('user_permissions').select('permission').eq('user_id', id.userId),
  ])
  if (!pessoa.data || pessoa.data.status !== 'active') return new ErroDeAcesso('Esta conta não faz parte da equipe.', 'nao_equipe')
  const sintetico = pessoa.data.is_synthetic
  if (id.aal !== 'aal2' && !(sintetico && atalhoDevLigado())) return new ErroDeAcesso('Confirme o segundo fator.', 'sem_mfa')

  const lista = (papeis.data ?? []).map((r) => r.role as Papel).filter((r) => r !== 'member')
  const doPapel = lista.length
    ? await adm.from('role_permissions').select('permission').in('role', lista)
    : { data: [] as { permission: string }[] }
  const permissoes = new Set<Permissao>([...(doPapel.data ?? []), ...(explicitas.data ?? [])].map((p) => p.permission as Permissao))
  return { id, nome: pessoa.data.full_name, email: pessoa.data.email, papeis: lista, permissoes, sintetico, trocarSenha: pessoa.data.must_change_password }
})

/** Para páginas do Command: redireciona quando não há equipe ou MFA. */
export async function exigirEquipe(): Promise<ContextoEquipe> {
  const c = await contextoDaEquipe()
  if (c instanceof ErroDeAcesso) {
    if (c.motivo === 'sem_mfa') redirect('/admin/mfa')
    redirect(`/admin/login${c.motivo === 'nao_equipe' ? '?e=sem_acesso' : ''}`)
  }
  if (c.trocarSenha) redirect('/admin/senha')
  return c
}

/** Para ações e leituras sensíveis: exige a permissão e audita a negativa. */
export async function exigirPermissao(p: Permissao): Promise<ContextoEquipe> {
  const c = await contextoDaEquipe()
  if (c instanceof ErroDeAcesso) throw c
  if (c.trocarSenha) throw new ErroDeAcesso('Troque a senha provisória antes de continuar.', 'trocar_senha')
  if (!c.permissoes.has(p)) {
    await auditar({ ator: { userId: c.id.userId, tipo: 'staff' }, acao: 'acesso.negado', resultado: 'denied', detalhes: { permissao: p } })
    throw new ErroDeAcesso('Sem permissão para esta ação.', 'sem_permissao')
  }
  return c
}

export const pode = (c: ContextoEquipe, p: Permissao) => c.permissoes.has(p)
