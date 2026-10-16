import { describe, expect, it } from 'vitest'
import { cifrar, decifrar, hashDoCodigo, lerTokenDeCredencial, novoCodigo, novoCodigoPublico, novoToken, QR_VALIDADE_S, tokenDeCredencial } from '@/lib/dominio/cripto'
import { podeTransitar, statusAposMensagemDoMembro } from '@/lib/dominio/concierge'
import { estadoDoConvite, estadoDoDesafio, podeEnviar, TRANSICOES } from '@/lib/dominio/regras-acesso'
import { formatarTelefone, mascararTelefone, paraE164 } from '@/lib/dominio/telefone'
import { categoriaSugerida, classificar, termosDeBusca, variantes } from '@/lib/dominio/winston'

const S = 'x'.repeat(48)
const agora = Date.parse('2026-10-16T12:00:00Z')

describe('cripto', () => {
  it('gera token de convite de 43 caracteres base64url, sempre diferente', () => {
    const a = novoToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(novoToken()).not.toBe(a)
  })
  it('gera código de 6 dígitos e código público no formato CH-XXXX-XXXX', () => {
    for (let i = 0; i < 50; i++) expect(novoCodigo()).toMatch(/^\d{6}$/)
    expect(novoCodigoPublico()).toMatch(/^CH-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  })
  it('amarra o hash do código ao desafio', () => {
    expect(hashDoCodigo(S, 'd1', '123456')).not.toBe(hashDoCodigo(S, 'd2', '123456'))
  })
  it('cifra e decifra o código da entrega manual; adulteração falha', () => {
    const p = cifrar(S, '654321')
    expect(p).not.toContain('654321')
    expect(decifrar(S, p)).toBe('654321')
    const [iv, tag, corpo] = p.split('.')
    expect(() => decifrar(S, [iv, tag, corpo!.slice(0, -2) + 'AA'].join('.'))).toThrow()
    expect(() => decifrar('y'.repeat(48), p)).toThrow()
  })
  it('QR da credencial: válido por 60 s, sem dado pessoal, recusa adulteração', () => {
    const id = '11111111-2222-3333-4444-555555555555'
    const t = tokenDeCredencial(S, id, 2, agora)
    expect(t.split('.')).toHaveLength(5)
    expect(lerTokenDeCredencial(S, t, agora + 30_000)).toEqual({ credencialId: id, versao: 2 })
    expect(lerTokenDeCredencial(S, t, agora + (QR_VALIDADE_S + 1) * 1000)).toBeNull()
    expect(lerTokenDeCredencial(S, t.replace('.2.', '.3.'), agora)).toBeNull()
    expect(lerTokenDeCredencial('y'.repeat(48), t, agora)).toBeNull()
  })
})

describe('telefone', () => {
  it('normaliza formatos da planilha e do usuário para E.164', () => {
    expect(paraE164('+55 61 90000-1234')).toBe('+5561900001234')
    expect(paraE164('(61) 90000-5678')).toBe('+5561900005678')
    expect(paraE164('+55 77 90000-4321')).toBe('+5577900004321')
    expect(paraE164('123')).toBeNull()
    expect(paraE164('')).toBeNull()
  })
  it('formata e mascara sem revelar o número inteiro', () => {
    expect(formatarTelefone('+5561900001234')).toBe('+55 61 90000-1234')
    expect(mascararTelefone('+5561900001234')).toBe('+55 61 9••••-1234')
  })
})

describe('regras de acesso', () => {
  const base = { attempts: 0, max_attempts: 5, expires_at: new Date(agora + 60_000).toISOString(), consumed_at: null }
  it('desafio: válido, expirado, consumido e bloqueado por tentativas', () => {
    expect(estadoDoDesafio(base, agora)).toBe('valido')
    expect(estadoDoDesafio({ ...base, expires_at: new Date(agora - 1).toISOString() }, agora)).toBe('expirado')
    expect(estadoDoDesafio({ ...base, consumed_at: new Date(agora).toISOString() }, agora)).toBe('consumido')
    expect(estadoDoDesafio({ ...base, attempts: 5 }, agora)).toBe('bloqueado')
    // Desafio inerte (telefone sem membro): nunca aceita código.
    expect(estadoDoDesafio({ ...base, max_attempts: 0 }, agora)).toBe('bloqueado')
  })
  it('limita envios por janela', () => {
    const e = (min: number) => ({ created_at: new Date(agora - min * 60_000).toISOString() })
    expect(podeEnviar([e(1), e(2)], 3, 600_000, agora)).toBe(true)
    expect(podeEnviar([e(1), e(2), e(3)], 3, 600_000, agora)).toBe(false)
    expect(podeEnviar([e(11), e(12), e(13)], 3, 600_000, agora)).toBe(true)
  })
  it('convite: revogado vence aceito, que vence expirado', () => {
    const c = { expires_at: new Date(agora + 1000).toISOString(), accepted_at: null, revoked_at: null }
    expect(estadoDoConvite(c, agora)).toBe('valido')
    expect(estadoDoConvite({ ...c, expires_at: new Date(agora - 1).toISOString() }, agora)).toBe('expirado')
    expect(estadoDoConvite({ ...c, accepted_at: 'x' }, agora)).toBe('aceito')
    expect(estadoDoConvite({ ...c, accepted_at: 'x', revoked_at: 'y' }, agora)).toBe('revogado')
  })
  it('status: revogado é final; ativo não volta a convidado', () => {
    expect(TRANSICOES.revoked).toEqual([])
    expect(TRANSICOES.active).not.toContain('invited')
    // Só a emissão de convite leva a "invited" (com link novo).
    expect(Object.values(TRANSICOES).flat()).not.toContain('invited')
  })
})

describe('concierge', () => {
  it('encerrada é final; resposta do membro reabre o atendimento', () => {
    expect(podeTransitar('encerrada', 'aberta')).toBe(false)
    expect(podeTransitar('aberta', 'em_atendimento')).toBe(true)
    expect(statusAposMensagemDoMembro('aguardando_membro')).toBe('em_atendimento')
    expect(statusAposMensagemDoMembro('aberta')).toBe('aberta')
  })
})

describe('winston (determinístico)', () => {
  it('classifica intenções conhecidas e cai em ajuda no resto', () => {
    expect(classificar('Qual é o meu saldo de Gold Coins?')).toBe('saldo')
    expect(classificar('Quem no diretório trabalha com investimentos?')).toBe('diretorio')
    expect(classificar('preciso reservar uma mesa')).toBe('pedido')
    expect(classificar('bom dia')).toBe('saudacao')
    expect(classificar('xyzzy')).toBe('ajuda')
  })
  it('extrai termos de busca sem palavras vazias nem caracteres de filtro', () => {
    expect(termosDeBusca('Quem trabalha com imóveis, %ilike% e (construção)?')).toEqual(['imóveis', 'ilike', 'construção'])
    expect(variantes('imóveis')).toEqual(['imóveis', 'imoveis'])
    expect(termosDeBusca('Alguém do diretório?')).toEqual([])
  })
  it('sugere categoria', () => {
    expect(categoriaSugerida('não consigo entrar, código não chega')).toBe('acesso')
    expect(categoriaSugerida('quero uma mesa para o jantar')).toBe('concierge')
  })
})
