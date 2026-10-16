import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adm, apagar, membroSintetico, type Pessoa } from './apoio'

/*
 * Acesso indevido entre membros, AAL2 e o CS privado, testados contra o
 * banco real pela API pública (o mesmo caminho de um atacante com o
 * próprio token na mão).
 */
let a: Pessoa
let b: Pessoa
let semMfa: Pessoa
let conversaB: string
let pedidoB: string

beforeAll(async () => {
  ;[a, b, semMfa] = await Promise.all([membroSintetico('A', { mfa: true }), membroSintetico('B', { mfa: true }), membroSintetico('Sem MFA')])
  await adm.from('member_profiles').insert([{ member_id: a.membroId, base_city: 'Cidade A' }, { member_id: b.membroId, base_city: 'Cidade B' }])
  await adm.from('member_private_cs').insert([{ member_id: a.membroId, internal_notes: 'nota A' }, { member_id: b.membroId, internal_notes: 'nota B' }])
  await adm.from('directory_preferences').insert([
    { member_id: a.membroId, visible: true, display_name: 'A pública', contact_email: 'a@x.com' },
    { member_id: b.membroId, visible: false, display_name: 'B privada' },
  ])
  conversaB = (await adm.from('concierge_conversations').insert({ member_id: b.membroId }).select('id').single()).data!.id
  pedidoB = (await adm.from('concierge_requests').insert({ member_id: b.membroId, category: 'outros', subject: 'Pedido de B', idempotency_key: crypto.randomUUID() }).select('id').single()).data!.id
  await adm.from('concierge_messages').insert([
    { request_id: pedidoB, author_kind: 'member', body: 'pergunta', internal: false },
    { request_id: pedidoB, author_kind: 'staff', body: 'nota interna', internal: true },
    { request_id: pedidoB, author_kind: 'staff', body: 'resposta', internal: false },
  ])
  void conversaB
}, 120_000)

afterAll(async () => {
  await adm.from('concierge_requests').delete().eq('id', pedidoB)
  await Promise.all([a, b, semMfa].filter(Boolean).map(apagar))
}, 120_000)

describe('isolamento entre membros', () => {
  it('membro lê o próprio cadastro e nunca o de outro', async () => {
    const r = await a.cliente.from('members').select('id')
    expect(r.data?.map((x) => x.id)).toEqual([a.membroId])
    const p = await a.cliente.from('member_profiles').select('member_id')
    expect(p.data?.map((x) => x.member_id)).toEqual([a.membroId])
  })
  it('ninguém lê o CS privado pela API, nem o próprio', async () => {
    const r = await a.cliente.from('member_private_cs').select('*')
    expect(r.error?.code).toBe('42501')
    expect(r.data).toBeNull()
  })
  it('solicitação de outro membro é invisível; nota interna nunca aparece nem ao dono', async () => {
    expect((await a.cliente.from('concierge_requests').select('id').eq('id', pedidoB)).data).toEqual([])
    const doDono = await b.cliente.from('concierge_messages').select('body').eq('request_id', pedidoB)
    expect(doDono.data?.map((m) => m.body).sort()).toEqual(['pergunta', 'resposta'])
  })
  it('diretório: só perfis que consentiram, e sem colunas de contato', async () => {
    const r = await b.cliente.from('directory_preferences').select('member_id, display_name').eq('visible', true)
    expect(r.data?.some((x) => x.member_id === a.membroId)).toBe(true)
    const deB = await a.cliente.from('directory_preferences').select('member_id').eq('member_id', b.membroId)
    expect(deB.data).toEqual([])
    const contato = await b.cliente.from('directory_preferences').select('contact_email')
    expect(contato.error?.code).toBe('42501')
  })
  it('a função do diretório só responde a membro identificado (AAL2), não serve de oráculo', async () => {
    expect((await a.cliente.rpc('ch_membro_listavel', { p_member: b.membroId })).data).toBe(true)
    expect((await semMfa.cliente.rpc('ch_membro_listavel', { p_member: b.membroId })).data).toBe(false)
  })
  it('tabelas sigilosas negam acesso: convites, OTP, auditoria, comunicados', async () => {
    for (const t of ['member_invitations', 'auth_otp_challenges', 'audit_logs', 'portal_announcements', 'import_rows', 'user_permissions'] as const) {
      const r = await a.cliente.from(t).select('*').limit(1)
      expect(r.error?.code, t).toBe('42501')
    }
  })
  it('membro não executa funções transacionais (ledger, check-in, revogação)', async () => {
    const r = await a.cliente.rpc('ch_coin_lancar', { p_member: a.membroId, p_amount: 1000, p_kind: 'credit', p_reason: 'tentativa', p_idempotency_key: crypto.randomUUID() })
    expect(r.error).not.toBeNull()
    const s = await a.cliente.rpc('ch_revogar_sessoes_auth', { p_user: b.userId })
    expect(s.error).not.toBeNull()
  })
  it('membro não se dá papel nem permissão (sem política de escrita)', async () => {
    const r = await a.cliente.from('member_roles').insert({ user_id: a.userId, role: 'super_admin' })
    expect(r.error).not.toBeNull()
    const e = await a.cliente.from('staff_members').insert({ user_id: a.userId, full_name: 'x', email: 'x@x.com' })
    expect(e.error).not.toBeNull()
  })
})

describe('segundo fator na RLS', () => {
  it('membro ativo só com o código do telefone (AAL1) não lê os próprios dados', async () => {
    await adm.from('member_profiles').insert({ member_id: semMfa.membroId, base_city: 'X' })
    const r = await semMfa.cliente.from('member_profiles').select('member_id')
    expect(r.data).toEqual([])
    // O próprio registro de membro (para a tela saber pedir o 2º fator) continua legível.
    expect((await semMfa.cliente.from('members').select('id')).data?.length).toBe(1)
  })
})

describe('auditoria', () => {
  it('a trilha não aceita alteração nem exclusão, nem com a chave secreta', async () => {
    const ins = await adm.from('audit_logs').insert({ actor_kind: 'system', action: 'teste.imutavel' }).select('id').single()
    const up = await adm.from('audit_logs').update({ action: 'adulterado' }).eq('id', ins.data!.id)
    expect(up.error?.message).toMatch(/somente inserção/)
    const del = await adm.from('audit_logs').delete().eq('id', ins.data!.id)
    expect(del.error?.message).toMatch(/somente inserção/)
  })
})
