/**
 * WINSTON — classificação determinística de intenções.
 *
 * Não há modelo de linguagem configurado, então o Winston não finge
 * entender o que não entende: reconhece um conjunto fechado de intenções
 * por palavras-chave e, fora delas, oferece encaminhar à equipe. Quando um
 * provedor de IA for ligado, ele substitui `classificar` mas usa as MESMAS
 * ferramentas restritas (ver lib/aplicacao/winston.ts).
 */

export type Intencao = 'saudacao' | 'saldo' | 'credencial' | 'diretorio' | 'beneficios' | 'eventos' | 'solicitacoes' | 'pedido' | 'ajuda'

const sem = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const REGRAS: [Intencao, RegExp][] = [
  ['saldo', /\b(saldo|gold ?coins?|moedas?|extrato)\b/],
  ['credencial', /\b(credencial|cartao|codigo de membro|carteirinha|qr)\b/],
  ['solicitacoes', /\b(minhas solicitacoes|meus pedidos|andamento|status do (meu )?pedido)\b/],
  ['diretorio', /\b(quem|alguem|conhec\w*|diretorio|trabalha com|especialista|apresent\w*|conectar|contato de)\b/],
  ['beneficios', /\b(beneficio\w*|privilegio\w*|vantage\w*|direito\w*)\b/],
  ['eventos', /\b(evento\w*|agenda|programacao|encontro\w*|jantar\w*)\b/],
  ['pedido', /\b(preciso|quero|gostaria|poderia|pode me|reserv\w*|solicit\w*|ajuda com|problema)\b/],
  ['saudacao', /^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/],
]

export function classificar(texto: string): Intencao {
  const t = sem(texto).trim()
  for (const [i, re] of REGRAS) if (re.test(t)) return i
  return 'ajuda'
}

const VAZIAS = new Set(
  'a o as os um uma de da do das dos e em no na nos nas com por para pra que quem qual quais alguem algum alguma conhece conheco diretorio trabalha trabalham especialista especialistas area me mim eu voce voces tem ha existe sobre isso isto preciso quero gostaria apresentar apresente conectar contato membro membros casa winston'.split(' '),
)

/**
 * Termos de busca para o diretório, sem palavras vazias. Guardam o acento
 * do que o membro escreveu ("imóveis" acha "Imóveis"); `variantes` soma a
 * forma sem acento, para achar também quem escreveu sem.
 */
export function termosDeBusca(texto: string): string[] {
  const palavras = texto
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((p) => p.length >= 3 && !VAZIAS.has(sem(p)))
  return [...new Set(palavras)].slice(0, 4)
}

export const variantes = (termo: string) => [...new Set([termo, sem(termo)])]

/** Categoria sugerida para um pedido que vira solicitação. */
export function categoriaSugerida(texto: string): 'concierge' | 'acesso' | 'beneficios' | 'credencial' | 'suporte' | 'outros' {
  const t = sem(texto)
  if (/acesso|entrar|login|senha|codigo|autenticador/.test(t)) return 'acesso'
  if (/credencial|cartao/.test(t)) return 'credencial'
  if (/beneficio|privilegio|coins|moeda/.test(t)) return 'beneficios'
  if (/erro|problema|nao funciona|bug/.test(t)) return 'suporte'
  if (/reserv|mesa|jantar|evento|apresent|indica/.test(t)) return 'concierge'
  return 'outros'
}
