import { createHash } from 'node:crypto'
import { paraE164 } from './telefone'

/*
 * O MAPA da planilha "Membros Fundadores" para o modelo do Continental.
 * Cada cabeçalho verificado no arquivo real (15/10/2026) tem destino
 * explícito. Cabeçalho que não está aqui é tratado como desconhecido, e
 * uma coluna sensível sem destino definido (documentos, endereço, contatos
 * extras) manda a linha para revisão humana em vez de ser descartada ou
 * gravada num lugar inventado.
 */

export const FONTE_MEMBROS = 'planilha_fundadores'

type Destino =
  | { em: 'member'; campo: 'legacy_id' | 'full_name' | 'phone_e164' | 'display_name' }
  | { em: 'profile'; campo: string; tipo: 'texto' | 'lista' | 'nota' | 'data_hora' | 'nascimento' }
  | { em: 'family'; campo: string }
  | { em: 'child'; n: 1 | 2 | 3 | 4; campo: 'nome' | 'nascimento' }
  | { em: 'history' }
  | { em: 'behavioral' }
  | { em: 'sensivel_sem_destino' }

export const MAPA_MEMBROS: Record<string, Destino> = {
  ID: { em: 'member', campo: 'legacy_id' },
  Nome: { em: 'member', campo: 'full_name' },
  'Data da resposta': { em: 'profile', campo: 'declared_at', tipo: 'data_hora' },
  Nascimento: { em: 'profile', campo: 'birth_date', tipo: 'nascimento' },
  'Estado civil': { em: 'profile', campo: 'marital_status', tipo: 'texto' },
  'Naturalidade / Origem': { em: 'profile', campo: 'hometown', tipo: 'texto' },
  'Cidade-base': { em: 'profile', campo: 'base_city', tipo: 'texto' },
  'Outras praças (Brasil)': { em: 'profile', campo: 'other_cities', tipo: 'lista' },
  'Praças internacionais': { em: 'profile', campo: 'international_cities', tipo: 'lista' },
  'Contexto das praças': { em: 'profile', campo: 'cities_context', tipo: 'texto' },
  CPF: { em: 'sensivel_sem_destino' },
  'RG (número)': { em: 'sensivel_sem_destino' },
  'RG - órgão emissor/UF': { em: 'sensivel_sem_destino' },
  'Passaporte (número)': { em: 'sensivel_sem_destino' },
  'Passaporte - validade': { em: 'sensivel_sem_destino' },
  'E-mail principal': { em: 'sensivel_sem_destino' },
  'Telefone / WhatsApp': { em: 'member', campo: 'phone_e164' },
  'Telefone alternativo': { em: 'sensivel_sem_destino' },
  'Instagram (@)': { em: 'sensivel_sem_destino' },
  'LinkedIn (URL)': { em: 'sensivel_sem_destino' },
  'Como prefere ser chamado': { em: 'member', campo: 'display_name' },
  'Contato de apoio - nome': { em: 'sensivel_sem_destino' },
  'Endereço (logradouro e nº)': { em: 'sensivel_sem_destino' },
  Complemento: { em: 'sensivel_sem_destino' },
  Bairro: { em: 'sensivel_sem_destino' },
  'Cidade / UF': { em: 'sensivel_sem_destino' },
  CEP: { em: 'sensivel_sem_destino' },
  País: { em: 'sensivel_sem_destino' },
  Cônjuge: { em: 'family', campo: 'conjuge' },
  'Aniversário do cônjuge': { em: 'family', campo: 'aniversario_conjuge' },
  'Data de casamento': { em: 'family', campo: 'data_casamento' },
  'Nº de filhos': { em: 'family', campo: 'numero_filhos' },
  'Filho 1 - Nome': { em: 'child', n: 1, campo: 'nome' },
  'Filho 1 - Nascimento': { em: 'child', n: 1, campo: 'nascimento' },
  'Filho 2 - Nome': { em: 'child', n: 2, campo: 'nome' },
  'Filho 2 - Nascimento': { em: 'child', n: 2, campo: 'nascimento' },
  'Filho 3 - Nome': { em: 'child', n: 3, campo: 'nome' },
  'Filho 3 - Nascimento': { em: 'child', n: 3, campo: 'nascimento' },
  'Filho 4 - Nome': { em: 'child', n: 4, campo: 'nome' },
  'Filho 4 - Nascimento': { em: 'child', n: 4, campo: 'nascimento' },
  'Obs. sobre filhos': { em: 'family', campo: 'obs_filhos' },
  'Notas de família': { em: 'family', campo: 'notas' },
  'Time de futebol': { em: 'profile', campo: 'sports_team', tipo: 'texto' },
  'Religião / espiritualidade': { em: 'profile', campo: 'spirituality', tipo: 'texto' },
  'Debate time/religião?': { em: 'profile', campo: 'open_to_debate', tipo: 'texto' },
  'Atuação / empresas': { em: 'profile', campo: 'business', tipo: 'texto' },
  Setores: { em: 'profile', campo: 'sectors', tipo: 'lista' },
  'Tema de maior curiosidade': { em: 'profile', campo: 'curiosity', tipo: 'texto' },
  'Melhores horários': { em: 'profile', campo: 'best_times', tipo: 'lista' },
  'Melhores dias': { em: 'profile', campo: 'best_days', tipo: 'lista' },
  'Frequência ideal de eventos': { em: 'profile', campo: 'event_frequency', tipo: 'texto' },
  'Temas de interesse': { em: 'profile', campo: 'interests', tipo: 'lista' },
  'Formato de encontro preferido': { em: 'profile', campo: 'formats', tipo: 'lista' },
  'Obs. de formato': { em: 'profile', campo: 'format_notes', tipo: 'texto' },
  'Experiências sociais preferidas': { em: 'profile', campo: 'experiences', tipo: 'lista' },
  Bebidas: { em: 'profile', campo: 'drinks', tipo: 'lista' },
  'Obs. de bebidas': { em: 'profile', campo: 'drink_notes', tipo: 'texto' },
  'Restrições alimentares': { em: 'profile', campo: 'dietary_restrictions', tipo: 'texto' },
  'Preferências gastronômicas': { em: 'profile', campo: 'food_preferences', tipo: 'texto' },
  'Interesse eventos c/ família (1-5)': { em: 'profile', campo: 'family_events_interest', tipo: 'nota' },
  'Frequência all family': { em: 'profile', campo: 'family_frequency', tipo: 'texto' },
  'Exposição pública (1-5)': { em: 'profile', campo: 'public_exposure', tipo: 'nota' },
  'Perfil de contribuição': { em: 'profile', campo: 'contribution_profile', tipo: 'lista' },
  'Canal preferido (concierge)': { em: 'profile', campo: 'concierge_channels', tipo: 'lista' },
  'Proatividade esperada (1-5)': { em: 'profile', campo: 'proactivity', tipo: 'nota' },
  'Como pode contribuir': { em: 'profile', campo: 'how_to_contribute', tipo: 'texto' },
  'Marcas indicadas': { em: 'profile', campo: 'brand_referrals', tipo: 'texto' },
  'Ciente dos benefícios': { em: 'sensivel_sem_destino' },
  'Histórico / Bio (original)': { em: 'history' },
  'Potencial no Clube': { em: 'behavioral' },
  'Risco de Desengajamento': { em: 'behavioral' },
  'Perfil Comportamental (Resumo)': { em: 'behavioral' },
  'Eneagrama - Tipo Provável': { em: 'behavioral' },
  'Eneagrama - Justificativa (base para dossiê)': { em: 'behavioral' },
}

/** Colunas de perfil com valor padrão não nulo no banco. */
const LISTAS = ['other_cities', 'international_cities', 'sectors', 'best_times', 'best_days', 'interests', 'formats', 'experiences', 'drinks', 'contribution_profile', 'concierge_channels'] as const
const TEXTOS_PERFIL = [
  'birthday_text', 'marital_status', 'hometown', 'base_city', 'cities_context', 'sports_team', 'spirituality', 'open_to_debate', 'business', 'curiosity',
  'event_frequency', 'format_notes', 'drink_notes', 'dietary_restrictions', 'food_preferences', 'family_frequency', 'how_to_contribute', 'brand_referrals',
] as const

export const normalizarNome = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim()
/** Comparação de nomes sem acento nem caixa, só para casar registros. */
export const chaveDeNome = (s: string) => normalizarNome(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const lista = (v: string) => (v ? v.split(';').map((x) => x.trim()).filter(Boolean) : [])

function dataBr(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v)
  if (!m) return null
  const iso = `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(`${iso}T00:00:00Z`)
  return d.getUTCDate() === Number(m[1]) && d.getUTCMonth() + 1 === Number(m[2]) ? iso : null
}

function dataHoraBr(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(v)
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00-03:00` : null
}

export interface MembroNormalizado {
  member: { legacy_id: string; founder_number: number; full_name: string; display_name: string | null; phone_e164: string | null; category: 'founder' }
  profile: Record<string, unknown>
  behavioral: Record<string, string>
  history: string | null
  hash: string
}

export interface ResultadoLinha {
  linha: number
  raw: Record<string, string>
  normalizado: MembroNormalizado | null
  erros: { campo: string; mensagem: string }[]
  revisao: string[]
}

/**
 * O bruto que vai para `import_rows`: colunas sensíveis sem destino definido
 * (documentos, endereço, contatos extras) são guardadas só como "[presente]",
 * nunca o valor. O valor fica apenas no arquivo de origem.
 */
export function brutoMinimizado(raw: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) o[k] = MAPA_MEMBROS[k]?.em === 'sensivel_sem_destino' && v ? '[presente]' : v
  return o
}

export function cabecalhosDesconhecidos(cabecalho: string[]): string[] {
  return cabecalho.filter((h) => h && !(h in MAPA_MEMBROS))
}

export function normalizarMembro(linha: number, raw: Record<string, string>): ResultadoLinha {
  const erros: ResultadoLinha['erros'] = []
  const revisao: string[] = []
  const profile: Record<string, unknown> = {}
  const family: Record<string, unknown> = {}
  const filhos: Record<number, { nome?: string; nascimento?: string }> = {}
  const behavioral: Record<string, string> = {}
  let history: string | null = null
  const member: Partial<MembroNormalizado['member']> = { category: 'founder', display_name: null, phone_e164: null }

  for (const k of LISTAS) profile[k] = []
  for (const k of TEXTOS_PERFIL) profile[k] = null
  profile.birth_date = null
  profile.declared_at = null
  profile.family_events_interest = null
  profile.public_exposure = null
  profile.proactivity = null

  for (const [col, valor] of Object.entries(raw)) {
    const d = MAPA_MEMBROS[col]
    if (!d || !valor) continue
    switch (d.em) {
      case 'member':
        if (d.campo === 'legacy_id') {
          if (!/^\d+$/.test(valor)) erros.push({ campo: col, mensagem: 'ID não numérico' })
          member.legacy_id = valor
          member.founder_number = Number(valor)
        } else if (d.campo === 'full_name') member.full_name = normalizarNome(valor)
        else if (d.campo === 'display_name') member.display_name = normalizarNome(valor)
        else if (d.campo === 'phone_e164') {
          const t = paraE164(valor)
          if (!t) erros.push({ campo: col, mensagem: `Telefone ilegível: "${valor}"` })
          member.phone_e164 = t
        }
        break
      case 'profile':
        if (d.tipo === 'lista') profile[d.campo] = lista(valor)
        else if (d.tipo === 'texto') profile[d.campo] = valor
        else if (d.tipo === 'nota') {
          const n = Number(valor)
          if (!Number.isInteger(n) || n < 1 || n > 5) erros.push({ campo: col, mensagem: `Nota fora de 1-5: "${valor}"` })
          else profile[d.campo] = n
        } else if (d.tipo === 'data_hora') {
          profile[d.campo] = dataHoraBr(valor)
          if (!profile[d.campo]) erros.push({ campo: col, mensagem: `Data/hora ilegível: "${valor}"` })
        } else if (d.tipo === 'nascimento') {
          // Data completa vira data; "25/05" sem ano vira texto, sem inventar o ano.
          const iso = dataBr(valor)
          if (iso) profile.birth_date = iso
          else if (/^\d{2}\/\d{2}$/.test(valor)) profile.birthday_text = valor
          else erros.push({ campo: col, mensagem: `Nascimento ilegível: "${valor}"` })
        }
        break
      case 'family':
        family[d.campo] = d.campo === 'numero_filhos' && /^\d+$/.test(valor) ? Number(valor) : valor
        break
      case 'child':
        filhos[d.n] = { ...filhos[d.n], [d.campo]: valor }
        break
      case 'history':
        history = valor
        break
      case 'behavioral':
        behavioral[col] = valor
        break
      case 'sensivel_sem_destino':
        revisao.push(`"${col}" tem valor, e o modelo ainda não define onde guardar esse dado.`)
        break
    }
  }

  const listaFilhos = Object.keys(filhos)
    .map(Number)
    .sort()
    .map((n) => filhos[n]!)
    .filter((f) => f.nome || f.nascimento)
  if (listaFilhos.length) family.filhos = listaFilhos
  profile.family = family

  if (!member.legacy_id) erros.push({ campo: 'ID', mensagem: 'Sem ID' })
  if (!member.full_name) erros.push({ campo: 'Nome', mensagem: 'Sem nome' })

  const normalizado: MembroNormalizado | null =
    erros.length === 0
      ? {
          member: member as MembroNormalizado['member'],
          profile,
          behavioral,
          history,
          hash: createHash('sha256').update(JSON.stringify({ member, profile, behavioral, history })).digest('hex'),
        }
      : null
  return { linha, raw, normalizado, erros, revisao }
}

/* ------------------------------------------------------------- casamento */

export interface Existente {
  id: string
  user_id?: string | null
  legacy_id: string | null
  source_system: string | null
  phone_e164: string | null
  full_name: string
  source_hash: string | null
  updated_at: string
}

export type Acao =
  | { acao: 'insert'; membroId?: string }
  | { acao: 'update'; membroId: string; esperado: string }
  | { acao: 'unchanged'; membroId: string }
  | { acao: 'review'; motivo: string; membroId?: string }
  | { acao: 'error'; motivo: string }

/**
 * Casamento determinístico, em ordem de força:
 *  1. mesma origem + mesmo ID legado;
 *  2. mesmo telefone E.164 (com nome igual; nome diferente vai a revisão);
 *  3. só o nome igual: nunca casa sozinho, vai a revisão.
 * Mais de um candidato em qualquer etapa: revisão.
 */
export function decidir(r: ResultadoLinha, existentes: Existente[]): Acao {
  if (!r.normalizado) return { acao: 'error', motivo: r.erros.map((e) => `${e.campo}: ${e.mensagem}`).join('; ') }
  const n = r.normalizado
  const porId = existentes.filter((e) => e.source_system === FONTE_MEMBROS && e.legacy_id === n.member.legacy_id)
  if (porId.length > 1) return { acao: 'review', motivo: 'Mais de um membro com o mesmo ID de origem.' }
  let alvo = porId[0]
  if (!alvo && n.member.phone_e164) {
    const porTel = existentes.filter((e) => e.phone_e164 === n.member.phone_e164)
    if (porTel.length > 1) return { acao: 'review', motivo: 'Telefone presente em mais de um membro.' }
    if (porTel[0]) {
      if (chaveDeNome(porTel[0].full_name) !== chaveDeNome(n.member.full_name)) {
        return { acao: 'review', motivo: `Telefone já pertence a "${porTel[0].full_name}", com outro nome.`, membroId: porTel[0].id }
      }
      alvo = porTel[0]
    }
  }
  if (!alvo) {
    const porNome = existentes.filter((e) => chaveDeNome(e.full_name) === chaveDeNome(n.member.full_name))
    if (porNome.length) return { acao: 'review', motivo: 'Já existe membro com o mesmo nome, sem ID nem telefone que confirmem.', membroId: porNome[0]!.id }
  }
  if (r.revisao.length) return { acao: 'review', motivo: r.revisao.join(' '), membroId: alvo?.id }
  if (!alvo) {
    const telEmUso = n.member.phone_e164 && existentes.some((e) => e.phone_e164 === n.member.phone_e164)
    return telEmUso ? { acao: 'review', motivo: 'Telefone já em uso.' } : { acao: 'insert' }
  }
  if (alvo.source_hash === n.hash) return { acao: 'unchanged', membroId: alvo.id }
  // O telefone é a chave de acesso: a planilha não o apaga, não o troca de
  // quem já tem conta, e não o toma de outro membro.
  if (n.member.phone_e164 !== alvo.phone_e164) {
    if (!n.member.phone_e164) return { acao: 'review', motivo: 'A planilha está sem telefone para um membro que tem telefone cadastrado.', membroId: alvo.id }
    if (alvo.user_id) return { acao: 'review', motivo: 'Telefone diferente para um membro que já tem conta: troca de telefone é feita pelo próprio membro ou pela equipe.', membroId: alvo.id }
    if (existentes.some((e) => e.id !== alvo.id && e.phone_e164 === n.member.phone_e164)) return { acao: 'review', motivo: 'O novo telefone já pertence a outro membro.', membroId: alvo.id }
  }
  return { acao: 'update', membroId: alvo.id, esperado: alvo.updated_at }
}

/* ---------------------------------------------------- aba de CS privada */

export const COLUNAS_CS_ESPERADAS = [
  'ID', 'Nome na planilha', 'Nome completo pesquisado', 'Status de identificação', 'Uso recomendado em CS', 'Cargo / empresa atual', 'Empresas vinculadas',
  'Redes profissionais', 'Matérias, notícias e aparições', 'Expertise pública', 'Ganchos de CS', 'Riscos / homônimos', 'Fontes consultadas', 'Confiança',
] as const

export interface CsNormalizado {
  legacyId: string
  nomeNaPlanilha: string
  colunas: Record<string, string>
  status: string | null
  confianca: string | null
  uso: string | null
  busca: string
  hash: string
}

export function normalizarCs(raw: Record<string, string>): { ok: CsNormalizado | null; erro?: string } {
  const id = raw['ID'] ?? ''
  if (!/^\d+$/.test(id)) return { ok: null, erro: 'ID ausente ou não numérico' }
  const colunas: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) colunas[k] = v
  return {
    ok: {
      legacyId: id,
      nomeNaPlanilha: normalizarNome(raw['Nome na planilha'] ?? ''),
      colunas,
      status: raw['Status de identificação'] || null,
      confianca: raw['Confiança'] || null,
      uso: raw['Uso recomendado em CS'] || null,
      busca: chaveDeNome([raw['Nome completo pesquisado'], raw['Cargo / empresa atual'], raw['Empresas vinculadas'], raw['Expertise pública']].filter(Boolean).join(' ')),
      hash: createHash('sha256').update(JSON.stringify(colunas)).digest('hex'),
    },
  }
}

/** A aba de CS só casa com membro da MESMA origem e mesmo ID, e com o nome conferindo. */
export function decidirCs(c: CsNormalizado, existentes: Existente[], hashAtual: Map<string, string | null>): Acao {
  const alvo = existentes.filter((e) => e.source_system === FONTE_MEMBROS && e.legacy_id === c.legacyId)
  if (alvo.length !== 1) return { acao: 'review', motivo: alvo.length ? 'ID de origem duplicado.' : `Nenhum membro importado com ID ${c.legacyId}.` }
  const m = alvo[0]!
  if (chaveDeNome(m.full_name) !== chaveDeNome(c.nomeNaPlanilha)) return { acao: 'review', motivo: `Nome na aba ("${c.nomeNaPlanilha}") difere do cadastro ("${m.full_name}").`, membroId: m.id }
  if (hashAtual.get(m.id) === c.hash) return { acao: 'unchanged', membroId: m.id }
  return hashAtual.has(m.id) ? { acao: 'update', membroId: m.id, esperado: m.updated_at } : { acao: 'insert', membroId: m.id }
}
