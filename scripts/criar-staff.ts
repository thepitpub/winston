/**
 * Cria uma pessoa da equipe do Continental Command.
 *
 *   npm run staff:criar -- --email pessoa@casa.com --nome "Nome Completo" --papel admin [--cs]
 *
 * Papéis: super_admin | admin | staff. --cs concede a leitura e edição da
 * inteligência privada (cs.read, cs.write), que nunca vem de papel.
 * Imprime UMA vez uma senha provisória aleatória; no primeiro acesso a
 * pessoa cadastra o autenticador (obrigatório) e troca a senha. Rodar de novo para o mesmo
 * e-mail não cria duplicata: só ajusta papel e concessões.
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { hostname, userInfo } from 'node:os'
import { resolve } from 'node:path'
import type { Database } from '../src/lib/db/tipos.gerados'

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const args = process.argv.slice(2)
const arg = (n: string) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : undefined
}
const email = arg('--email')?.toLowerCase()
const nome = arg('--nome')
const papel = arg('--papel') ?? 'staff'
if (!email || !nome || !['super_admin', 'admin', 'staff'].includes(papel)) {
  console.error('Uso: --email <e-mail> --nome "<nome>" --papel super_admin|admin|staff [--cs]')
  process.exit(1)
}

const db = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

async function main() {
  const existente = (await db.from('staff_members').select('user_id').eq('email', email!).maybeSingle()).data
  let userId = existente?.user_id
  let senha: string | null = null
  if (!userId) {
    senha = randomBytes(12).toString('base64url')
    const u = await db.auth.admin.createUser({ email: email!, password: senha, email_confirm: true, app_metadata: { tipo: 'equipe' } })
    if (u.error || !u.data.user) throw new Error(u.error?.message)
    userId = u.data.user.id
    // A senha provisória vale só para o primeiro acesso: o Command exige a troca.
    const s = await db.from('staff_members').insert({ user_id: userId, full_name: nome!, email: email!, must_change_password: true })
    if (s.error) throw new Error(s.error.message)
  }
  const r = await db.rpc('ch_definir_papel', { p_user: userId, p_role: papel, p_by: null as unknown as string })
  if (r.error) throw new Error(r.error.message)
  if (args.includes('--cs')) {
    // O gatilho do banco recusa cs.* para identidade sintética ou inativa.
    const c = await db.from('user_permissions').upsert([
      { user_id: userId, permission: 'cs.read' },
      { user_id: userId, permission: 'cs.write' },
    ])
    if (c.error) throw new Error(c.error.message)
  }
  const quem = `${userInfo().username}@${hostname()}`
  await db.from('audit_logs').insert({ actor_kind: 'system', action: existente ? 'equipe.ajustada_terminal' : 'equipe.criada_terminal', resource_type: 'staff', resource_id: userId, details: { papel, cs: args.includes('--cs'), executado_por: quem } })
  console.log(`\n✓ ${nome} <${email}> · ${papel}${args.includes('--cs') ? ' · com acesso ao CS privado' : ''}`)
  if (senha) console.log(`  Senha provisória (aparece só agora): ${senha}\n  Entre em /admin/login, cadastre o autenticador e troque a senha.\n`)
  else console.log('  Pessoa já existia: papel e concessões ajustados.\n')
}

main().catch((e) => {
  console.error(`✗ ${e.message}`)
  process.exit(1)
})
