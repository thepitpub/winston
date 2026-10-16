import 'server-only'
import { auditar } from '../../auditoria'
import type { ContextoEquipe } from '../../autorizacao/equipe'
import { clienteSecreto, feito, ou } from '../../db/clientes'
import type { Json } from '../../db/tipos.gerados'

export interface DadosComunicado {
  title: string
  body: string
  cta_label: string | null
  cta_target: string | null
  kind: 'modal' | 'banner' | 'lobby'
  frequency: 'once' | 'session' | 'always' | 'until_ack'
  priority: number
  audience: { all?: true; statuses?: string[]; categories?: string[]; member_ids?: string[] }
  pages: string[]
  starts_at: string
  ends_at: string | null
  active: boolean
}

export async function listar() {
  const adm = clienteSecreto()
  const lista = ou(await adm.from('portal_announcements').select('*').order('created_at', { ascending: false }))
  const ids = lista.map((a) => a.id)
  if (!ids.length) return []
  // Agregado no banco: trazer as linhas para cá esbarra no limite de 1000 do PostgREST.
  const m = ou(await adm.rpc('ch_metricas_comunicados', { p_ids: ids }))
  const porId = new Map(m.map((x) => [x.announcement_id, x]))
  return lista.map((a) => {
    const x = porId.get(a.id)
    const alcance = Number(x?.alcance ?? 0)
    return {
      ...a,
      metricas: {
        impressoes: Number(x?.impressoes ?? 0),
        alcance,
        cliques: Number(x?.cliques ?? 0),
        ctr: alcance ? Math.round((Number(x?.clicantes ?? 0) / alcance) * 1000) / 10 : 0,
        fechamentos: Number(x?.fechamentos ?? 0),
        reconhecimentos: Number(x?.reconhecimentos ?? 0),
      },
    }
  })
}

/** Tamanho do público hoje, para o editor: mesma regra da função do banco. */
export async function tamanhoDoPublico(a: DadosComunicado['audience']): Promise<number> {
  let q = clienteSecreto().from('members').select('id', { count: 'exact', head: true }).eq('is_synthetic', false)
  if (!a.all) {
    if (a.statuses?.length) q = q.in('status', a.statuses as 'active'[])
    if (a.categories?.length) q = q.in('category', a.categories as 'founder'[])
    if (a.member_ids?.length) q = q.in('id', a.member_ids)
  }
  return (await q).count ?? 0
}

export async function salvar(eq: ContextoEquipe, id: string | null, d: DadosComunicado) {
  const adm = clienteSecreto()
  const linha = { ...d, audience: d.audience as Json }
  if (id) feito(await adm.from('portal_announcements').update(linha).eq('id', id))
  else id = ou(await adm.from('portal_announcements').insert({ ...linha, created_by: eq.id.userId }).select('id').single()).id
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'comunicado.salvo', recurso: { tipo: 'portal_announcement', id }, detalhes: { tipo: d.kind, ativo: d.active, frequencia: d.frequency } })
  return id
}

/** Membros específicos do público atual (o editor não edita esse critério, mas não pode perdê-lo). */
export async function idsDoPublico(id: string): Promise<string[]> {
  const r = await clienteSecreto().from('portal_announcements').select('audience').eq('id', id).maybeSingle()
  const a = (r.data?.audience ?? {}) as DadosComunicado['audience']
  return Array.isArray(a.member_ids) ? a.member_ids.filter((x) => typeof x === 'string') : []
}

export async function alternar(eq: ContextoEquipe, id: string, ativo: boolean) {
  feito(await clienteSecreto().from('portal_announcements').update({ active: ativo }).eq('id', id))
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: ativo ? 'comunicado.ativado' : 'comunicado.desativado', recurso: { tipo: 'portal_announcement', id } })
}
