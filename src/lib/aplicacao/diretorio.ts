import 'server-only'
import { ErroDeRegra } from '../acao'
import { auditar } from '../auditoria'
import { clienteDoUsuario, clienteSecreto, feito, ou, talvez } from '../db/clientes'

export interface PerfilPublico {
  member_id: string
  display_name: string | null
  profession: string | null
  company: string | null
  city: string | null
  interests: string[]
  skills: string[]
  description: string | null
  contact_whatsapp: boolean
}

const COLUNAS = 'member_id, display_name, profession, company, city, interests, skills, description, contact_whatsapp'

/** Quem bloqueou ou foi bloqueado por mim: some do diretório nos dois sentidos. */
async function bloqueios(eu: string): Promise<string[]> {
  const sb = await clienteDoUsuario()
  const r = await sb.from('member_connections').select('requester_id, addressee_id').eq('status', 'blocked')
  return (r.data ?? []).map((c) => (c.requester_id === eu ? c.addressee_id : c.requester_id))
}

const limpar = (s: string) => s.replace(/[%,()*\\]/g, ' ').trim().slice(0, 60)

/**
 * Busca no diretório. A RLS só devolve quem escolheu aparecer, não foi
 * ocultado pela moderação e está ativo; as colunas de contato nem são
 * legíveis pela API (privilégio por coluna).
 */
export async function buscar(eu: string, f: { q?: string; setor?: string; interesse?: string; cidade?: string; pagina: number }, porPagina = 12) {
  const sb = await clienteDoUsuario()
  const fora = [eu, ...(await bloqueios(eu))]
  let q = sb.from('directory_preferences').select(COLUNAS, { count: 'exact' }).eq('visible', true).not('member_id', 'in', `(${fora.join(',')})`)
  const termo = f.q ? limpar(f.q) : ''
  if (termo) q = q.or(`display_name.ilike.%${termo}%,profession.ilike.%${termo}%,company.ilike.%${termo}%,description.ilike.%${termo}%`)
  if (f.setor) q = q.ilike('profession', `%${limpar(f.setor)}%`)
  if (f.interesse) q = q.contains('interests', [f.interesse.replace(/[{}",\\]/g, ' ').trim().slice(0, 60)])
  if (f.cidade) q = q.ilike('city', `%${limpar(f.cidade)}%`)
  const de = (f.pagina - 1) * porPagina
  const r = await q.order('display_name').range(de, de + porPagina - 1)
  if (termo || f.setor || f.interesse || f.cidade) {
    await clienteSecreto().from('directory_events').insert({ member_id: eu, kind: 'search', query: { q: termo || null, setor: f.setor ?? null, interesse: f.interesse ?? null, cidade: f.cidade ?? null } })
  }
  return { perfis: (r.data ?? []) as PerfilPublico[], total: r.count ?? 0 }
}

/** Valores únicos de interesses e cidades entre os perfis visíveis, para os filtros. */
export async function facetas() {
  const sb = await clienteDoUsuario()
  const r = await sb.from('directory_preferences').select('interests, city').eq('visible', true).limit(500)
  const interesses = new Set<string>()
  const cidades = new Set<string>()
  for (const p of r.data ?? []) {
    for (const i of p.interests ?? []) interesses.add(i)
    if (p.city) cidades.add(p.city)
  }
  return { interesses: [...interesses].sort(), cidades: [...cidades].sort() }
}

export type EstadoConexao = 'nenhuma' | 'enviada' | 'recebida' | 'conectados' | 'recusada' | 'bloqueada'

export async function perfil(eu: string, alvo: string) {
  if (eu === alvo) return null
  const sb = await clienteDoUsuario()
  const p = talvez(await sb.from('directory_preferences').select(COLUNAS).eq('member_id', alvo).eq('visible', true).maybeSingle()) as PerfilPublico | null
  if (!p) return null
  const c = talvez(
    await sb
      .from('member_connections')
      .select('id, requester_id, status, blocked_by')
      .or(`and(requester_id.eq.${eu},addressee_id.eq.${alvo}),and(requester_id.eq.${alvo},addressee_id.eq.${eu})`)
      .maybeSingle(),
  )
  if (c?.status === 'blocked') return null
  const estado: EstadoConexao = !c
    ? 'nenhuma'
    : c.status === 'accepted'
      ? 'conectados'
      : c.status === 'pending'
        ? c.requester_id === eu
          ? 'enviada'
          : 'recebida'
        : c.status === 'declined'
          ? 'recusada'
          : 'nenhuma'
  // Contatos: só entre conexões aceitas, e só os que o dono escolheu mostrar.
  let contatos: { whatsapp?: string; email?: string; instagram?: string; linkedin?: string } | null = null
  if (estado === 'conectados') {
    const adm = clienteSecreto()
    const [dp, m] = await Promise.all([
      adm.from('directory_preferences').select('contact_whatsapp, contact_email, contact_instagram, contact_linkedin').eq('member_id', alvo).single(),
      adm.from('members').select('phone_e164').eq('id', alvo).single(),
    ])
    contatos = {
      whatsapp: dp.data?.contact_whatsapp ? (m.data?.phone_e164 ?? undefined) : undefined,
      email: dp.data?.contact_email ?? undefined,
      instagram: dp.data?.contact_instagram ?? undefined,
      linkedin: dp.data?.contact_linkedin ?? undefined,
    }
  }
  await clienteSecreto().from('directory_events').insert({ member_id: eu, kind: 'view', target_member_id: alvo })
  return { perfil: p, estado, conexaoId: c?.id ?? null, contatos }
}

async function alvoVisivel(alvo: string): Promise<boolean> {
  const sb = await clienteDoUsuario()
  const r = await sb.from('directory_preferences').select('member_id').eq('member_id', alvo).eq('visible', true).maybeSingle()
  return Boolean(r.data)
}

async function notificar(membroId: string, titulo: string, link: string) {
  await clienteSecreto().from('member_notifications').insert({ member_id: membroId, kind: 'conexao', title: titulo, link })
}

export async function pedirConexao(eu: { id: string; userId: string; nome: string }, alvo: string, mensagem: string | null) {
  if (eu.id === alvo || !(await alvoVisivel(alvo))) throw new ErroDeRegra('Este membro não está disponível no diretório.')
  const adm = clienteSecreto()
  // Simetria: só pede conexão quem também aparece no diretório (o outro
  // precisa poder ver quem pede). E o nome mostrado é o de exibição.
  const meu = talvez(await adm.from('directory_preferences').select('visible, display_name').eq('member_id', eu.id).maybeSingle())
  if (!meu?.visible) throw new ErroDeRegra('Para pedir conexões, ative o seu perfil no diretório em Configurações.')
  const nomePublico = meu.display_name || 'Um membro'
  const atual = talvez(
    await adm.from('member_connections').select('id, requester_id, status').or(`and(requester_id.eq.${eu.id},addressee_id.eq.${alvo}),and(requester_id.eq.${alvo},addressee_id.eq.${eu.id})`).maybeSingle(),
  )
  if (atual) {
    if (atual.status === 'blocked') throw new ErroDeRegra('Este membro não está disponível no diretório.')
    if (atual.status === 'pending' || atual.status === 'accepted') return
    const r = talvez(await adm.from('member_connections').select('responded_at').eq('id', atual.id).maybeSingle())
    // A pausa de 30 dias vale para quem FOI recusado; quem recusou pode pedir quando quiser.
    if (atual.status === 'declined' && atual.requester_id === eu.id && r?.responded_at && Date.now() - new Date(r.responded_at).getTime() < 30 * 86_400_000) {
      throw new ErroDeRegra('Este membro recusou um pedido recente. Tente de novo mais adiante ou peça uma apresentação ao Winston.')
    }
    // Recusada ou cancelada: um novo pedido, sempre partindo de quem pede agora.
    feito(await adm.from('member_connections').update({ requester_id: eu.id, addressee_id: alvo, status: 'pending', message: mensagem, responded_at: null, created_at: new Date().toISOString() }).eq('id', atual.id))
  } else {
    const r = await adm.from('member_connections').insert({ requester_id: eu.id, addressee_id: alvo, message: mensagem })
    if (r.error && r.error.code !== '23505') throw new Error(r.error.message)
  }
  await adm.from('directory_events').insert({ member_id: eu.id, kind: 'connect_request', target_member_id: alvo })
  await notificar(alvo, `${nomePublico} quer se conectar com você.`, `/directory/${eu.id}`)
  await auditar({ ator: { userId: eu.userId, tipo: 'member' }, acao: 'conexao.pedida', membroId: eu.id, recurso: { tipo: 'member', id: alvo } })
}

export async function responderConexao(eu: { id: string; userId: string; nome: string }, conexaoId: string, acao: 'aceitar' | 'recusar' | 'bloquear' | 'cancelar') {
  const adm = clienteSecreto()
  const c = talvez(await adm.from('member_connections').select('id, requester_id, addressee_id, status').eq('id', conexaoId).maybeSingle())
  if (!c || (c.requester_id !== eu.id && c.addressee_id !== eu.id)) throw new ErroDeRegra('Conexão não encontrada.')
  const outro = c.requester_id === eu.id ? c.addressee_id : c.requester_id
  const agora = new Date().toISOString()
  if (acao === 'bloquear') {
    feito(await adm.from('member_connections').update({ status: 'blocked', blocked_by: eu.id, responded_at: agora }).eq('id', c.id))
  } else if (acao === 'cancelar') {
    if (c.requester_id !== eu.id || c.status !== 'pending') throw new ErroDeRegra('Só quem pediu pode cancelar um pedido pendente.')
    feito(await adm.from('member_connections').update({ status: 'cancelled', responded_at: agora }).eq('id', c.id))
  } else {
    if (c.addressee_id !== eu.id || c.status !== 'pending') throw new ErroDeRegra('Este pedido não está aguardando a sua resposta.')
    const status = acao === 'aceitar' ? 'accepted' : 'declined'
    const r = await adm.from('member_connections').update({ status, responded_at: agora }).eq('id', c.id).eq('status', 'pending').select('id')
    if (!r.data?.length) throw new ErroDeRegra('Este pedido já foi respondido.')
    if (acao === 'aceitar') {
      const meu = talvez(await adm.from('directory_preferences').select('display_name').eq('member_id', eu.id).maybeSingle())
      await notificar(outro, `${meu?.display_name || 'Um membro'} aceitou a sua conexão.`, `/directory/${eu.id}`)
    }
  }
  await auditar({ ator: { userId: eu.userId, tipo: 'member' }, acao: `conexao.${acao}`, membroId: eu.id, recurso: { tipo: 'member_connection', id: c.id } })
}

export async function minhasConexoes(eu: string) {
  const sb = await clienteDoUsuario()
  const c = ou(await sb.from('member_connections').select('id, requester_id, addressee_id, status, message, created_at').in('status', ['pending', 'accepted']).order('created_at', { ascending: false }))
  const ids = [...new Set(c.map((x) => (x.requester_id === eu ? x.addressee_id : x.requester_id)))]
  const nomes = ids.length ? ((await sb.from('directory_preferences').select('member_id, display_name, profession').in('member_id', ids)).data ?? []) : []
  const porId = new Map(nomes.map((n) => [n.member_id, n]))
  return c.map((x) => {
    const outro = x.requester_id === eu ? x.addressee_id : x.requester_id
    return { ...x, outro, nome: porId.get(outro)?.display_name ?? 'Membro', profissao: porId.get(outro)?.profession ?? null, recebida: x.addressee_id === eu }
  })
}
