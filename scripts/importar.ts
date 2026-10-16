/**
 * IMPORTAÇÃO REPRODUZÍVEL — planilha de fundadores e aba privada de CS.
 *
 *   npm run importar -- --membros "<arquivo.csv>"            prévia (padrão)
 *   npm run importar -- --membros "<arquivo.csv>" --aplicar  aplica
 *   npm run importar -- --cs "<arquivo.csv>" [--aplicar]
 *   npm run importar -- --compensar <batch_id>               desfaz um lote
 *
 * A prévia grava o lote (mode=dry_run) e as linhas planejadas, sem tocar
 * em membro nenhum. A aplicação refaz o plano contra o estado atual e o
 * aplica numa transação só (ch_importar_*). Rodar de novo é seguro: linha
 * igual vira "unchanged". Nada da planilha vai para log público: o
 * relatório sai no terminal e em ./relatorios (fora do git).
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { comoObjeto, lerCsvComLinhas, separarCabecalho } from '../src/lib/dominio/csv'
import {
  brutoMinimizado,
  cabecalhosDesconhecidos,
  COLUNAS_CS_ESPERADAS,
  decidir,
  decidirCs,
  FONTE_MEMBROS,
  normalizarCs,
  normalizarMembro,
  type Acao,
  type Existente,
} from '../src/lib/dominio/importacao'
import type { Database, Json } from '../src/lib/db/tipos.gerados'

function env(): Record<string, string> {
  const t = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  return Object.fromEntries(
    t
      .split('\n')
      .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]),
  )
}

const args = process.argv.slice(2)
const arg = (n: string) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : undefined
}
const aplicar = args.includes('--aplicar')
const operador = arg('--operador') ?? 'terminal'

const e = env()
const db = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL!, e.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

function falhar(msg: string): never {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

async function existentes(): Promise<Existente[]> {
  // Paginado: o PostgREST corta em 1000 linhas por resposta.
  const todos: Existente[] = []
  for (let de = 0; ; de += 1000) {
    const r = await db.from('members').select('id, user_id, legacy_id, source_system, phone_e164, full_name, source_hash, updated_at').order('id').range(de, de + 999)
    if (r.error) falhar(r.error.message)
    todos.push(...r.data)
    if (r.data.length < 1000) return todos
  }
}

async function abrirLote(kind: 'members' | 'private_cs', arquivo: string, sha: string) {
  const r = await db.from('import_batches').insert({ kind, mode: aplicar ? 'apply' : 'dry_run', source_file: basename(arquivo), source_sha256: sha, operator: operador }).select('id').single()
  if (r.error) falhar(r.error.message)
  return r.data.id
}

function relatorio(batch: string, kind: string, linhas: { linha: number; chave: string; acao: Acao }[], extra: Record<string, unknown> = {}) {
  const contagem = linhas.reduce<Record<string, number>>((a, l) => ((a[l.acao.acao] = (a[l.acao.acao] ?? 0) + 1), a), {})
  console.log(`\n${aplicar ? 'APLICAÇÃO' : 'PRÉVIA (nada foi gravado em membros)'} · lote ${batch} · ${kind}`)
  console.log('─'.repeat(72))
  for (const l of linhas) {
    const motivo = 'motivo' in l.acao ? ` — ${l.acao.motivo}` : ''
    console.log(`  linha ${String(l.linha).padStart(3)}  ${l.chave.padEnd(10)} ${l.acao.acao.padEnd(9)}${motivo}`)
  }
  console.log('─'.repeat(72))
  console.log('  ' + Object.entries(contagem).map(([k, v]) => `${k}: ${v}`).join(' · ') + `  (total ${linhas.length})`)
  mkdirSync(resolve(__dirname, '../relatorios'), { recursive: true })
  const caminho = resolve(__dirname, `../relatorios/importacao-${batch}.json`)
  writeFileSync(caminho, JSON.stringify({ batch, kind, aplicar, contagem, linhas, ...extra }, null, 2))
  console.log(`  relatório: ${caminho}\n`)
  return contagem
}

async function importarMembros(arquivo: string) {
  const bruto = readFileSync(arquivo)
  const sha = createHash('sha256').update(bruto).digest('hex')
  const { cabecalho, dados } = separarCabecalho(lerCsvComLinhas(bruto.toString('utf8')))
  const desconhecidos = cabecalhosDesconhecidos(cabecalho)
  if (desconhecidos.length) falhar(`Cabeçalhos sem mapeamento: ${desconhecidos.join(', ')}. Atualize MAPA_MEMBROS antes de importar.`)

  const base = await existentes()
  const resultados = dados.map((d) => normalizarMembro(d.linha, comoObjeto(cabecalho, d.celulas)))
  // Duplicidade DENTRO do arquivo: mesmo ID ou mesmo telefone em duas linhas.
  const vistos = new Map<string, number>()
  const plano = resultados.map((r) => {
    let acao = decidir(r, base)
    for (const chave of [r.normalizado?.member.legacy_id && `id:${r.normalizado.member.legacy_id}`, r.normalizado?.member.phone_e164 && `tel:${r.normalizado.member.phone_e164}`]) {
      if (!chave) continue
      if (vistos.has(chave)) acao = { acao: 'review', motivo: `Duplicado no arquivo com a linha ${vistos.get(chave)} (${chave.split(':')[0]}).` }
      else vistos.set(chave, r.linha)
    }
    return { r, acao }
  })

  const batch = await abrirLote('members', arquivo, sha)
  const itens = plano.map(({ r, acao }) => ({
    linha: r.linha,
    acao: acao.acao,
    motivo: 'motivo' in acao ? acao.motivo : null,
    membro_id: 'membroId' in acao ? (acao.membroId ?? null) : null,
    esperado: 'esperado' in acao ? acao.esperado : null,
    raw: brutoMinimizado(r.raw),
    normalizado: r.normalizado ? { member: r.normalizado.member, profile: r.normalizado.profile, hash: r.normalizado.hash } : null,
    member: r.normalizado?.member,
    profile: r.normalizado?.profile,
    behavioral: r.normalizado?.behavioral,
    history: r.normalizado?.history,
    hash: r.normalizado?.hash,
  }))
  for (const p of plano) for (const er of p.r.erros) await db.from('import_errors').insert({ batch_id: batch, source_row: p.r.linha, field: er.campo, message: er.mensagem })

  if (!aplicar) {
    const ins = await db.from('import_rows').insert(
      itens.map((i) => ({ batch_id: batch, source_row: i.linha, raw: i.raw as Json, normalized: i.normalizado as Json, action: i.acao as never, member_id: i.membro_id, note: i.motivo })),
    )
    if (ins.error) falhar(ins.error.message)
    await db.from('import_batches').update({ status: 'completed', finished_at: new Date().toISOString(), counts: relatorioContagem(plano.map((p) => p.acao)) as Json }).eq('id', batch)
  } else {
    const r = await db.rpc('ch_importar_membros', { p_batch: batch, p_source_file: basename(arquivo), p_itens: itens as unknown as Json })
    if (r.error) {
      await db.from('import_batches').update({ status: 'failed', finished_at: new Date().toISOString(), report: { erro: r.error.message } }).eq('id', batch)
      falhar(`Transação revertida, nada mudou: ${r.error.message}`)
    }
  }
  relatorio(batch, 'membros', plano.map((p) => ({ linha: p.r.linha, chave: `ID ${p.r.raw['ID'] ?? '?'}`, acao: p.acao })), { arquivo: basename(arquivo), sha256: sha, fonte: FONTE_MEMBROS })
}

function relatorioContagem(acoes: Acao[]) {
  const c = acoes.reduce<Record<string, number>>((a, x) => ((a[x.acao] = (a[x.acao] ?? 0) + 1), a), {})
  return { ...c, processed: acoes.length }
}

async function importarCs(arquivo: string) {
  const bruto = readFileSync(arquivo)
  const sha = createHash('sha256').update(bruto).digest('hex')
  const { cabecalho, dados } = separarCabecalho(lerCsvComLinhas(bruto.toString('utf8')))
  const faltando = COLUNAS_CS_ESPERADAS.filter((c) => !cabecalho.includes(c))
  const sobrando = cabecalho.filter((c) => c && !(COLUNAS_CS_ESPERADAS as readonly string[]).includes(c))
  if (faltando.length) falhar(`A aba de CS não tem as colunas: ${faltando.join(', ')}`)
  if (sobrando.length) console.log(`  aviso: colunas extras preservadas em cs_columns: ${sobrando.join(', ')}`)

  const base = await existentes()
  const atuais = await db.from('member_private_cs').select('member_id, cs_source')
  if (atuais.error) falhar(atuais.error.message)
  const hashAtual = new Map(atuais.data.filter((a) => a.cs_source).map((a) => [a.member_id, ((a.cs_source as Record<string, string>)?.row_hash ?? null) as string | null]))

  const plano = dados.map((d) => {
    const raw = comoObjeto(cabecalho, d.celulas)
    const n = normalizarCs(raw)
    const acao: Acao = n.ok ? decidirCs(n.ok, base, hashAtual) : { acao: 'error', motivo: n.erro! }
    return { linha: d.linha, raw, cs: n.ok, acao }
  })
  const batch = await abrirLote('private_cs', arquivo, sha)
  const itens = plano.map((p) => ({ linha: p.linha, acao: p.acao.acao, motivo: 'motivo' in p.acao ? p.acao.motivo : null, membro_id: 'membroId' in p.acao ? (p.acao.membroId ?? null) : null, raw: p.raw, cs: p.cs }))

  if (!aplicar) {
    const ins = await db.from('import_rows').insert(itens.map((i) => ({ batch_id: batch, source_row: i.linha, raw: i.raw as Json, normalized: i.cs as unknown as Json, action: i.acao as never, member_id: i.membro_id, note: i.motivo })))
    if (ins.error) falhar(ins.error.message)
    await db.from('import_batches').update({ status: 'completed', finished_at: new Date().toISOString(), counts: relatorioContagem(plano.map((p) => p.acao)) as Json }).eq('id', batch)
  } else {
    const r = await db.rpc('ch_importar_cs', { p_batch: batch, p_source_file: basename(arquivo), p_sha: sha, p_itens: itens as unknown as Json })
    if (r.error) {
      await db.from('import_batches').update({ status: 'failed', finished_at: new Date().toISOString(), report: { erro: r.error.message } }).eq('id', batch)
      falhar(`Transação revertida, nada mudou: ${r.error.message}`)
    }
  }
  relatorio(batch, 'cs privado', plano.map((p) => ({ linha: p.linha, chave: `ID ${p.raw['ID'] ?? '?'}`, acao: p.acao })), { arquivo: basename(arquivo), sha256: sha })
}

async function main() {
  const comp = arg('--compensar')
  if (comp) {
    const r = await db.rpc('ch_importar_compensar', { p_batch: comp })
    if (r.error) falhar(r.error.message)
    console.log(`\n✓ lote ${comp} compensado: ${JSON.stringify(r.data)}\n`)
    return
  }
  const m = arg('--membros')
  const c = arg('--cs')
  if (!m && !c) falhar('Informe --membros <csv> e/ou --cs <csv>.')
  if (m) await importarMembros(resolve(m))
  if (c) await importarCs(resolve(c))
}

void main()
