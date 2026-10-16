import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/*
 * Primitivas puras (sem banco, sem env): recebem o segredo como argumento,
 * o que as torna testáveis em unidade.
 */

export const sha256 = (t: string | Buffer) => createHash('sha256').update(t).digest('hex')
export const hmac = (chave: string, texto: string) => createHmac('sha256', chave).update(texto).digest('hex')

export function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Token de convite: 32 bytes aleatórios em base64url. Só o hash vai ao banco. */
export const novoToken = () => randomBytes(32).toString('base64url')

/** Código temporário de 6 dígitos, distribuição uniforme. */
export const novoCodigo = () => randomInt(0, 1_000_000).toString().padStart(6, '0')

/** Hash do código amarrado ao desafio: o mesmo código em outro desafio não vale. */
export const hashDoCodigo = (segredo: string, desafioId: string, codigo: string) => hmac(segredo, `otp:${desafioId}:${codigo}`)

/** Código público da credencial: CH-XXXX-XXXX, sem 0/O/1/I. */
export function novoCodigoPublico(): string {
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const b = randomBytes(8)
  const s = Array.from(b, (n) => alfa[n % alfa.length]).join('')
  return `CH-${s.slice(0, 4)}-${s.slice(4)}`
}

/* --------------------------- cifra do código para entrega manual (AES-GCM) */

function chaveDeCifra(segredo: string): Buffer {
  return Buffer.from(hkdfSync('sha256', segredo, 'continental-heritage', 'otp-entrega-manual', 32))
}

export function cifrar(segredo: string, texto: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chaveDeCifra(segredo), iv)
  const corpo = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return [iv.toString('base64url'), c.getAuthTag().toString('base64url'), corpo.toString('base64url')].join('.')
}

export function decifrar(segredo: string, pacote: string): string {
  const [iv, tag, corpo] = pacote.split('.')
  if (!iv || !tag || !corpo) throw new Error('pacote inválido')
  const d = createDecipheriv('aes-256-gcm', chaveDeCifra(segredo), Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(corpo, 'base64url')), d.final()]).toString('utf8')
}

/* -------------------------------------- QR dinâmico da credencial (60 s) */

export const QR_VALIDADE_S = 60

/** `CH1.<credencial>.<versao>.<expira>.<assinatura>`: nenhum dado pessoal. */
export function tokenDeCredencial(segredo: string, credencialId: string, versao: number, agoraMs = Date.now()): string {
  const exp = Math.floor(agoraMs / 1000) + QR_VALIDADE_S
  const base = `CH1.${credencialId}.${versao}.${exp}`
  return `${base}.${hmac(segredo, base).slice(0, 32)}`
}

export function lerTokenDeCredencial(segredo: string, token: string, agoraMs = Date.now()): { credencialId: string; versao: number } | null {
  const m = /^CH1\.([0-9a-f-]{36})\.(\d+)\.(\d+)\.([0-9a-f]{32})$/.exec(token.trim())
  if (!m) return null
  const [, id, versao, exp, ass] = m
  if (Number(exp) < Math.floor(agoraMs / 1000)) return null
  if (!iguais(ass!, hmac(segredo, `CH1.${id}.${versao}.${exp}`).slice(0, 32))) return null
  return { credencialId: id!, versao: Number(versao) }
}

/** Hash de IP para auditoria e limite de abuso, sem guardar o IP. */
export const hashDeIp = (segredo: string, ip: string | null) => (ip ? hmac(segredo, `ip:${ip}`).slice(0, 24) : null)
