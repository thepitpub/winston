import 'server-only'
import { ErroDeRegra } from '../acao'
import { auditar } from '../auditoria'
import { clienteDoUsuario, clienteSecreto, feito, ou, talvez } from '../db/clientes'
import { categoriaSugerida, classificar, termosDeBusca, variantes, type Intencao } from '../dominio/winston'
import { STATUS_ROTULO, type StatusSolicitacao } from '../dominio/concierge'
import { abrirSolicitacao } from './solicitacoes'

/*
 * O Winston responde com FERRAMENTAS DE LEITURA restritas à identidade do
 * membro: todas usam o cliente do usuário (RLS). Ele não tem acesso ao CS
 * privado, a dados de outros membros além do que o diretório consentido
 * mostra, nem a nada administrativo. Ações que mudam dados (abrir uma
 * solicitação) só acontecem depois de confirmação explícita do membro.
 */

export interface Resposta {
  texto: string
  intencao: Intencao
  cartoes?: { titulo: string; subtitulo?: string; link?: string }[]
  proposta?: { categoria: string; assunto: string }
}

type Membro = { id: string; nome: string }

const ferramentas = {
  async saldo(eu: Membro): Promise<Resposta> {
    const sb = await clienteDoUsuario()
    const b = talvez(await sb.from('gold_coin_balances').select('balance').eq('member_id', eu.id).maybeSingle())
    const n = b?.balance ?? 0
    return { intencao: 'saldo', texto: n === 0 ? 'Seu saldo de Gold Coins é zero no momento.' : `Seu saldo é de ${n.toLocaleString('pt-BR')} Gold Coins.`, cartoes: [{ titulo: 'Ver o extrato completo', link: '/gold-coins' }] }
  },
  async credencial(eu: Membro): Promise<Resposta> {
    const sb = await clienteDoUsuario()
    const c = talvez(await sb.from('member_credentials').select('public_code, status').eq('member_id', eu.id).eq('status', 'active').maybeSingle())
    return c
      ? { intencao: 'credencial', texto: `Sua credencial ${c.public_code} está ativa. Na recepção, abra a credencial e mostre o código de entrada.`, cartoes: [{ titulo: 'Abrir The Credential', link: '/credential' }] }
      : { intencao: 'credencial', texto: 'Não encontrei uma credencial ativa para você. Posso encaminhar à equipe.', proposta: { categoria: 'credencial', assunto: 'Credencial não encontrada' } }
  },
  async diretorio(eu: Membro, texto: string): Promise<Resposta> {
    const termos = termosDeBusca(texto)
    if (!termos.length) return { intencao: 'diretorio', texto: 'Diga a área ou o assunto, por exemplo: "quem trabalha com imóveis?".', cartoes: [{ titulo: 'Abrir The Directory', link: '/directory' }] }
    const sb = await clienteDoUsuario()
    const filtro = termos.flatMap(variantes).flatMap((t) => [`display_name.ilike.%${t}%`, `profession.ilike.%${t}%`, `company.ilike.%${t}%`, `description.ilike.%${t}%`]).join(',')
    const r = await sb.from('directory_preferences').select('member_id, display_name, profession, company').eq('visible', true).neq('member_id', eu.id).or(filtro).limit(5)
    const lista = r.data ?? []
    if (!lista.length) {
      return { intencao: 'diretorio', texto: `Entre os membros que escolheram aparecer no diretório, não encontrei ninguém para "${termos.join(', ')}". Posso pedir à equipe uma apresentação.`, proposta: { categoria: 'concierge', assunto: `Apresentação: ${termos.join(', ')}`.slice(0, 140) } }
    }
    return {
      intencao: 'diretorio',
      texto: `Encontrei ${lista.length === 1 ? 'um membro' : `${lista.length} membros`} no diretório consentido que podem ajudar:`,
      cartoes: lista.map((p) => ({ titulo: p.display_name ?? 'Membro', subtitulo: [p.profession, p.company].filter(Boolean).join(' · '), link: `/directory/${p.member_id}` })),
    }
  },
  async beneficios(): Promise<Resposta> {
    const sb = await clienteDoUsuario()
    const r = await sb.from('gold_coin_rules').select('name, amount, description').eq('active', true).order('amount', { ascending: false }).limit(6)
    if (!r.data?.length) return { intencao: 'beneficios', texto: 'A casa ainda não publicou benefícios no Portal. Posso perguntar à equipe por você.', proposta: { categoria: 'beneficios', assunto: 'Benefícios disponíveis' } }
    return { intencao: 'beneficios', texto: 'Estes são os benefícios publicados, em Gold Coins:', cartoes: r.data.map((x) => ({ titulo: x.name, subtitulo: `${x.amount > 0 ? '+' : ''}${x.amount} · ${x.description ?? ''}`.replace(/ · $/, '') })) }
  },
  async eventos(): Promise<Resposta> {
    const sb = await clienteDoUsuario()
    const r = await sb.from('checkin_events').select('name, starts_at, location').eq('status', 'open').eq('kind', 'event').gte('starts_at', new Date(Date.now() - 6 * 3_600_000).toISOString()).order('starts_at').limit(5)
    if (!r.data?.length) return { intencao: 'eventos', texto: 'Não há eventos publicados para membros no momento.' }
    return {
      intencao: 'eventos',
      texto: 'Próximos eventos publicados:',
      cartoes: r.data.map((e) => ({ titulo: e.name, subtitulo: `${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(e.starts_at))}${e.location ? ` · ${e.location}` : ''}` })),
    }
  },
  async solicitacoes(eu: Membro): Promise<Resposta> {
    const sb = await clienteDoUsuario()
    const r = await sb.from('concierge_requests').select('id, subject, status').eq('member_id', eu.id).not('status', 'eq', 'encerrada').order('updated_at', { ascending: false }).limit(5)
    if (!r.data?.length) return { intencao: 'solicitacoes', texto: 'Você não tem solicitações em aberto.' }
    return { intencao: 'solicitacoes', texto: 'Suas solicitações em andamento:', cartoes: r.data.map((s) => ({ titulo: s.subject, subtitulo: STATUS_ROTULO[s.status as StatusSolicitacao], link: `/requests/${s.id}` })) }
  },
}

async function responder(eu: Membro, texto: string): Promise<Resposta> {
  const intencao = classificar(texto)
  switch (intencao) {
    case 'saudacao':
      return { intencao, texto: `Olá, ${eu.nome.split(' ')[0]}. Posso consultar seu saldo, sua credencial, encontrar membros no diretório, listar eventos ou levar um pedido à equipe.` }
    case 'saldo':
      return ferramentas.saldo(eu)
    case 'credencial':
      return ferramentas.credencial(eu)
    case 'diretorio':
      return ferramentas.diretorio(eu, texto)
    case 'beneficios':
      return ferramentas.beneficios()
    case 'eventos':
      return ferramentas.eventos()
    case 'solicitacoes':
      return ferramentas.solicitacoes(eu)
    case 'pedido':
      return { intencao, texto: 'Posso levar isso à equipe como uma solicitação. Confirma o envio?', proposta: { categoria: categoriaSugerida(texto), assunto: texto.slice(0, 140) } }
    default:
      return {
        intencao,
        texto: 'Ainda não sei responder isso sozinho. Posso encaminhar à equipe, que responde em Solicitações.',
        proposta: { categoria: categoriaSugerida(texto), assunto: texto.slice(0, 140) },
      }
  }
}

async function limiteHora(): Promise<number> {
  const r = await clienteSecreto().from('app_settings').select('value').eq('key', 'winston_limite_hora').maybeSingle()
  return Number(r.data?.value ?? 30)
}

/** Recebe uma mensagem, persiste a pergunta e a resposta. Idempotente pela chave do envio. */
export async function perguntar(eu: Membro & { userId: string }, conversaId: string | null, texto: string, chave: string) {
  const adm = clienteSecreto()
  let conversa = conversaId
  if (conversa) {
    const c = talvez(await adm.from('concierge_conversations').select('id, member_id').eq('id', conversa).maybeSingle())
    if (!c || c.member_id !== eu.id) throw new ErroDeRegra('Conversa não encontrada.')
  }
  const repetida = talvez(await adm.from('concierge_messages').select('id, conversation_id, concierge_conversations!inner(member_id)').eq('author_kind', 'member').contains('metadata', { chave }).eq('concierge_conversations.member_id', eu.id).maybeSingle())
  if (repetida) return { conversaId: repetida.conversation_id! }

  const umaHora = new Date(Date.now() - 3_600_000).toISOString()
  const minhas = ou(await adm.from('concierge_conversations').select('id').eq('member_id', eu.id))
  if (minhas.length) {
    const n = await adm.from('concierge_messages').select('id', { count: 'exact', head: true }).eq('author_kind', 'member').gte('created_at', umaHora).in('conversation_id', minhas.map((m) => m.id))
    if ((n.count ?? 0) >= (await limiteHora())) throw new ErroDeRegra('Muitas mensagens na última hora. Tente mais tarde ou use o Service Bell.')
  }

  if (!conversa) {
    conversa = ou(await adm.from('concierge_conversations').insert({ member_id: eu.id, title: texto.slice(0, 80) }).select('id').single()).id
  }
  feito(await adm.from('concierge_messages').insert({ conversation_id: conversa, author_kind: 'member', author_user_id: eu.userId, author_name: eu.nome, body: texto, metadata: { chave } }))
  const r = await responder(eu, texto)
  feito(
    await adm.from('concierge_messages').insert({
      conversation_id: conversa,
      author_kind: 'winston',
      author_name: 'Winston',
      body: r.texto,
      intent: r.intencao,
      metadata: { cartoes: r.cartoes ?? [], proposta: r.proposta ?? null, motor: 'deterministico' },
    }),
  )
  feito(await adm.from('concierge_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversa))
  await auditar({ ator: { userId: eu.userId, tipo: 'member' }, acao: 'winston.mensagem', membroId: eu.id, recurso: { tipo: 'concierge_conversation', id: conversa }, detalhes: { intencao: r.intencao } })
  return { conversaId: conversa }
}

/** Confirmação explícita: transforma a proposta de uma resposta em solicitação. */
export async function confirmarProposta(eu: Membro & { userId: string }, mensagemId: string) {
  const adm = clienteSecreto()
  const m = talvez(await adm.from('concierge_messages').select('id, conversation_id, metadata, author_kind, created_at').eq('id', mensagemId).maybeSingle())
  if (!m || m.author_kind !== 'winston' || !m.conversation_id) throw new ErroDeRegra('Proposta não encontrada.')
  const c = talvez(await adm.from('concierge_conversations').select('member_id').eq('id', m.conversation_id).maybeSingle())
  if (c?.member_id !== eu.id) throw new ErroDeRegra('Proposta não encontrada.')
  const prop = (m.metadata as { proposta?: { categoria: string; assunto: string } }).proposta
  if (!prop) throw new ErroDeRegra('Esta resposta não tem pedido a confirmar.')
  const pergunta = talvez(await adm.from('concierge_messages').select('body').eq('conversation_id', m.conversation_id).eq('author_kind', 'member').lt('created_at', m.created_at).order('created_at', { ascending: false }).limit(1).maybeSingle())
  const s = await abrirSolicitacao({
    membroId: eu.id,
    userId: eu.userId,
    nome: eu.nome,
    categoria: prop.categoria as 'outros',
    assunto: prop.assunto.length >= 3 ? prop.assunto : 'Pedido pelo Winston',
    mensagem: pergunta?.body ?? prop.assunto,
    chave: `winston:${m.id}`,
    origem: 'winston',
    conversaId: m.conversation_id,
  })
  if (!s.duplicada) {
    feito(await adm.from('concierge_messages').insert({ conversation_id: m.conversation_id, author_kind: 'winston', author_name: 'Winston', body: 'Pronto. Sua solicitação está com a equipe; acompanhe em Solicitações.', intent: 'pedido', metadata: { cartoes: [{ titulo: 'Acompanhar a solicitação', link: `/requests/${s.id}` }] } }))
  }
  return s
}

export async function avaliar(eu: Membro, mensagemId: string, nota: 1 | -1) {
  const adm = clienteSecreto()
  const m = talvez(await adm.from('concierge_messages').select('id, conversation_id, author_kind').eq('id', mensagemId).maybeSingle())
  if (!m?.conversation_id || m.author_kind !== 'winston') throw new ErroDeRegra('Mensagem não encontrada.')
  const c = talvez(await adm.from('concierge_conversations').select('member_id').eq('id', m.conversation_id).maybeSingle())
  if (c?.member_id !== eu.id) throw new ErroDeRegra('Mensagem não encontrada.')
  feito(await adm.from('concierge_messages').update({ feedback: nota }).eq('id', m.id))
}
