/**
 * Apoio dos testes de integração: identidades SINTÉTICAS (is_synthetic)
 * criadas no Supabase real, com sessão de verdade (AAL1 ou AAL2 via TOTP
 * calculado aqui), e apagadas no fim.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Database } from '@/lib/db/tipos.gerados'

export const env: Record<string, string> = Object.fromEntries(
  readFileSync(resolve(__dirname, '../../.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

export const adm: SupabaseClient<Database> = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

/** TOTP (RFC 6238) a partir do segredo base32 do fator. */
export function totp(segredo: string, t = Date.now()): string {
  const alfa = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of segredo.replace(/=+$/, '').toUpperCase()) bits += alfa.indexOf(c).toString(2).padStart(5, '0')
  const chave = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)))
  const contador = Buffer.alloc(8)
  contador.writeBigUInt64BE(BigInt(Math.floor(t / 30000)))
  const h = createHmac('sha1', chave).update(contador).digest()
  const o = h[h.length - 1]! & 15
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

export interface Pessoa {
  membroId: string
  userId: string
  cliente: SupabaseClient<Database>
}

/** Cria um membro sintético ATIVO com conta Auth e devolve um cliente logado (AAL1, ou AAL2 com mfa). */
export async function membroSintetico(nome: string, opcoes: { mfa?: boolean } = {}): Promise<Pessoa> {
  const m = await adm.from('members').insert({ full_name: `Teste · ${nome}`, status: 'active', category: 'member', is_synthetic: true, source_system: 'teste_integracao' }).select('id').single()
  if (m.error) throw new Error(m.error.message)
  const email = `m-${m.data.id}@membros.continental.invalid`
  const u = await adm.auth.admin.createUser({ email, email_confirm: true, app_metadata: { sintetico: true, teste: true } })
  if (u.error) throw new Error(u.error.message)
  await adm.from('members').update({ user_id: u.data.user.id }).eq('id', m.data.id)
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bloco = () => Array.from({ length: 4 }, () => alfa[Math.floor(Math.random() * alfa.length)]).join('')
  const cred = await adm.from('member_credentials').insert({ member_id: m.data.id, public_code: `CH-${bloco()}-${bloco()}` })
  if (cred.error) throw new Error(cred.error.message)
  // Sintético comum: o teste quer o caminho REAL de membro, então o
  // marcamos como não sintético só para a RLS? Não: a RLS libera AAL1 para
  // sintético. Para testar AAL2 de verdade, usamos is_synthetic=false
  // durante o teste e voltamos a true antes de apagar.
  await adm.from('members').update({ is_synthetic: false }).eq('id', m.data.id)
  const cliente = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const link = await adm.auth.admin.generateLink({ type: 'magiclink', email })
  const v = await cliente.auth.verifyOtp({ token_hash: link.data.properties!.hashed_token, type: 'magiclink' })
  if (v.error) throw new Error(v.error.message)
  if (opcoes.mfa) {
    const e = await cliente.auth.mfa.enroll({ factorType: 'totp', friendlyName: `teste-${randomUUID().slice(0, 6)}` })
    if (e.error) throw new Error(e.error.message)
    const c = await cliente.auth.mfa.challengeAndVerify({ factorId: e.data.id, code: totp(e.data.totp.secret) })
    if (c.error) throw new Error(c.error.message)
  }
  return { membroId: m.data.id, userId: u.data.user.id, cliente }
}

export async function apagar(p: Pessoa) {
  await adm.from('members').update({ is_synthetic: true }).eq('id', p.membroId)
  await adm.from('gold_coin_transactions').delete().in('account_id', ((await adm.from('gold_coin_accounts').select('id').eq('member_id', p.membroId)).data ?? []).map((a) => a.id))
  await adm.from('members').delete().eq('id', p.membroId)
  await adm.auth.admin.deleteUser(p.userId)
}
