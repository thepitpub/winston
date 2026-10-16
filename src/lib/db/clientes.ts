import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { ambiente } from '../ambiente'
import type { Database } from './tipos.gerados'

export type Banco = SupabaseClient<Database>

/**
 * Cliente com a identidade do USUÁRIO (JWT no cookie). Toda leitura do
 * Portal passa por ele: quem decide o que o membro vê é a RLS do banco.
 * Em Server Component o cookie não pode ser escrito; a renovação da sessão
 * acontece no proxy, e aqui o setAll só falha em silêncio nesse caso.
 */
export async function clienteDoUsuario(): Promise<Banco> {
  const e = ambiente()
  const loja = await cookies()
  return createServerClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) loja.set(name, value, options)
        } catch {
          /* Server Component: o proxy renova */
        }
      },
    },
  })
}

let secreto: Banco | null = null

/**
 * Cliente com a chave SECRETA: ignora RLS. Só pode ser usado DEPOIS de uma
 * checagem de autorização no servidor (exigirPermissao / exigirMembro), e
 * nunca em código que chega ao navegador (`server-only` garante).
 */
export function clienteSecreto(): Banco {
  if (secreto) return secreto
  const e = ambiente()
  secreto = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return secreto
}

export class ErroDeDados extends Error {
  constructor(
    mensagem: string,
    readonly codigo?: string,
  ) {
    super(mensagem)
  }
}

type Resposta<D> = { data: D; error: { message: string; code?: string } | null }

/** Desembrulha { data, error } (lista, single, insert): lança com o código do Postgres. */
export function ou<D>(r: Resposta<D>): NonNullable<D> {
  if (r.error) throw new ErroDeDados(r.error.message, r.error.code)
  if (r.data === null || r.data === undefined) throw new ErroDeDados('resposta vazia')
  return r.data as NonNullable<D>
}

/** Para maybeSingle(): devolve null quando não há linha. */
export function talvez<D>(r: Resposta<D>): D {
  if (r.error) throw new ErroDeDados(r.error.message, r.error.code)
  return r.data
}

/** Para escrita sem retorno (insert/update/delete sem select): só confere o erro. */
export function feito(r: { error: { message: string; code?: string } | null }): void {
  if (r.error) throw new ErroDeDados(r.error.message, r.error.code)
}
