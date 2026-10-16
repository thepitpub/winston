import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adm, apagar, membroSintetico, type Pessoa } from './apoio'

/* Ledger de Gold Coins e validação de check-in, pelas funções transacionais. */
let m: Pessoa
let outro: Pessoa
let evento: string
let eventoDia: string

beforeAll(async () => {
  ;[m, outro] = await Promise.all([membroSintetico('Coins'), membroSintetico('Outro')])
  const ev = await adm
    .from('checkin_events')
    .insert([
      { name: 'Teste · uma vez', starts_at: new Date().toISOString(), duplicate_policy: 'once_per_event', status: 'open' },
      { name: 'Teste · por dia', starts_at: new Date().toISOString(), duplicate_policy: 'once_per_day', status: 'open' },
    ])
    .select('id, duplicate_policy')
  evento = ev.data!.find((e) => e.duplicate_policy === 'once_per_event')!.id
  eventoDia = ev.data!.find((e) => e.duplicate_policy === 'once_per_day')!.id
}, 120_000)

afterAll(async () => {
  await adm.from('member_checkins').delete().in('event_id', [evento, eventoDia])
  await adm.from('checkin_validation_logs').delete().in('event_id', [evento, eventoDia])
  await adm.from('checkin_events').delete().in('id', [evento, eventoDia])
  await Promise.all([m, outro].filter(Boolean).map(apagar))
}, 120_000)

const lancar = (amount: number, kind: string, chave = crypto.randomUUID(), reverses?: string, membro = m.membroId) =>
  adm.rpc('ch_coin_lancar', { p_member: membro, p_amount: amount, p_kind: kind, p_reason: 'teste de integração', p_idempotency_key: chave, p_reverses: reverses })

describe('Gold Coins', () => {
  it('crédito, débito e saldo derivado', async () => {
    expect((await lancar(100, 'credit')).data).toMatchObject({ ok: true, balance: 100 })
    expect((await lancar(-30, 'debit')).data).toMatchObject({ ok: true, balance: 70 })
    const s = await adm.from('gold_coin_balances').select('balance').eq('member_id', m.membroId).single()
    expect(s.data?.balance).toBe(70)
  })
  it('débito acima do saldo é recusado', async () => {
    expect((await lancar(-1000, 'debit')).data).toMatchObject({ ok: false, error: 'insufficient_balance' })
  })
  it('a mesma chave de idempotência não lança duas vezes, nem em paralelo', async () => {
    const chave = crypto.randomUUID()
    const [x, y] = await Promise.all([lancar(5, 'credit', chave), lancar(5, 'credit', chave)])
    const duplicados = [x.data, y.data].filter((d) => (d as { duplicate?: boolean }).duplicate).length
    expect(duplicados).toBe(1)
    expect([x.error, y.error]).toEqual([null, null])
  })
  it('estorno: só pelo valor oposto, da mesma conta, uma vez, e nunca de um estorno', async () => {
    const t = (await lancar(20, 'credit')).data as { transaction_id: string }
    expect((await lancar(-19, 'reversal', undefined, t.transaction_id)).data).toMatchObject({ ok: false, error: 'invalid_reversal' })
    expect((await lancar(-20, 'reversal', undefined, t.transaction_id, outro.membroId)).data).toMatchObject({ ok: false, error: 'invalid_reversal' })
    const est = (await lancar(-20, 'reversal', undefined, t.transaction_id)).data as { ok: boolean; transaction_id: string }
    expect(est.ok).toBe(true)
    expect((await lancar(-20, 'reversal', undefined, t.transaction_id)).data).toMatchObject({ ok: false })
    expect((await lancar(20, 'reversal', undefined, est.transaction_id)).data).toMatchObject({ ok: false, error: 'invalid_reversal' })
  })
  it('a mesma chave com outro conteúdo é conflito, não "duplicado"', async () => {
    const chave = crypto.randomUUID()
    expect((await lancar(7, 'credit', chave)).data).toMatchObject({ ok: true })
    expect((await lancar(8, 'credit', chave)).data).toMatchObject({ ok: false, error: 'idempotency_conflict' })
    expect((await lancar(7, 'credit', chave, undefined, outro.membroId)).data).toMatchObject({ ok: false, error: 'idempotency_conflict' })
  })
  it('membro pendente ou revogado não recebe lançamento', async () => {
    await adm.from('members').update({ status: 'pending' }).eq('id', outro.membroId)
    expect((await lancar(5, 'credit', undefined, undefined, outro.membroId)).data).toMatchObject({ ok: false, error: 'member_not_eligible' })
    await adm.from('members').update({ status: 'active' }).eq('id', outro.membroId)
  })
  it('movimentação de membro real não se edita nem se apaga', async () => {
    const real = await adm.from('gold_coin_transactions').select('id').limit(1).maybeSingle()
    const qualquer = (await adm.from('gold_coin_accounts').select('id').eq('member_id', m.membroId).single()).data!.id
    const up = await adm.from('gold_coin_transactions').update({ reason: 'adulterado' }).eq('account_id', qualquer)
    expect(up.error?.message).toMatch(/somente inserção/)
    void real
  })
})

const validar = (membro: string, ev: string, excecao?: string) => adm.rpc('ch_validar_checkin', { p_member: membro, p_event: ev, p_operator: null as unknown as string, p_source: 'manual', p_exception_reason: excecao })

describe('check-in', () => {
  it('uma vez por evento: segunda tentativa é "já validado"; exceção justificada passa', async () => {
    expect((await validar(m.membroId, evento)).data).toMatchObject({ result: 'validated' })
    expect((await validar(m.membroId, evento)).data).toMatchObject({ result: 'already_validated' })
    expect((await validar(m.membroId, evento, 'Saiu e voltou com a família')).data).toMatchObject({ result: 'exception_granted' })
  })
  it('validações simultâneas do mesmo membro não duplicam', async () => {
    const r = await Promise.all([validar(outro.membroId, evento), validar(outro.membroId, evento), validar(outro.membroId, evento)])
    expect(r.filter((x) => (x.data as { result: string }).result === 'validated')).toHaveLength(1)
  })
  it('membro suspenso não entra; inexistente é "não encontrado"', async () => {
    await adm.from('members').update({ status: 'suspended' }).eq('id', m.membroId)
    expect((await validar(m.membroId, eventoDia)).data).toMatchObject({ result: 'suspended' })
    await adm.from('members').update({ status: 'active' }).eq('id', m.membroId)
    expect((await validar(crypto.randomUUID(), eventoDia)).data).toMatchObject({ result: 'not_found' })
  })
  it('credencial suspensa barra a entrada, mesmo com o membro ativo', async () => {
    await adm.from('member_credentials').update({ status: 'suspended' }).eq('member_id', m.membroId)
    expect((await validar(m.membroId, eventoDia)).data).toMatchObject({ result: 'suspended', motivo: 'credencial suspensa ou inexistente' })
    await adm.from('member_credentials').update({ status: 'active' }).eq('member_id', m.membroId)
  })
  it('fora da janela do evento é "evento fechado"', async () => {
    const ev = await adm.from('checkin_events').insert({ name: 'Teste · encerrado', starts_at: new Date(Date.now() - 4 * 3_600_000).toISOString(), ends_at: new Date(Date.now() - 3_600_000).toISOString(), duplicate_policy: 'once_per_event', status: 'open' }).select('id').single()
    try {
      expect((await validar(m.membroId, ev.data!.id)).data).toMatchObject({ result: 'event_closed', motivo: 'fora do horário do evento' })
    } finally {
      await adm.from('checkin_validation_logs').delete().eq('event_id', ev.data!.id)
      await adm.from('checkin_events').delete().eq('id', ev.data!.id)
    }
  })
  it('toda tentativa fica no registro de validação', async () => {
    const r = await adm.from('checkin_validation_logs').select('result').eq('event_id', evento)
    expect(r.data!.length).toBeGreaterThanOrEqual(6)
  })
})

describe('convites e concessões', () => {
  it('sair de "invited" revoga os convites vivos no próprio banco', async () => {
    const x = await adm.from('members').insert({ full_name: 'Teste · Convite', status: 'invited', category: 'member', is_synthetic: true, source_system: 'teste_integracao' }).select('id').single()
    const id = x.data!.id
    try {
      await adm.from('member_invitations').insert({ member_id: id, token_hash: crypto.randomUUID(), expires_at: new Date(Date.now() + 86_400_000).toISOString() })
      await adm.from('members').update({ status: 'pending' }).eq('id', id)
      const c = await adm.from('member_invitations').select('revoked_at').eq('member_id', id).single()
      expect(c.data?.revoked_at).not.toBeNull()
    } finally {
      await adm.from('members').delete().eq('id', id)
    }
  })
  it('cs.* não é concedido a quem não é da equipe real', async () => {
    const r = await adm.from('user_permissions').insert({ user_id: m.userId, permission: 'cs.read' })
    expect(r.error?.message).toMatch(/equipe real/)
  })
})
