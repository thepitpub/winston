import { describe, expect, it } from 'vitest'
import { cabecalhosDuplicados, comoObjeto, lerCsvComLinhas, separarCabecalho } from '@/lib/dominio/csv'
import { brutoMinimizado, cabecalhosDesconhecidos, decidir, decidirCs, FONTE_MEMBROS, normalizarCs, normalizarMembro, type Existente } from '@/lib/dominio/importacao'

describe('leitor CSV', () => {
  it('lida com aspas, vírgula e quebra de linha dentro de aspas, e guarda a linha física', () => {
    const t = '﻿a,b\n1,"x, y"\n2,"linha1\nlinha2"\n\n3,"aspas ""duplas"""\n'
    const r = lerCsvComLinhas(t)
    expect(r.map((x) => x.linha)).toEqual([1, 2, 3, 6])
    expect(r[1]!.celulas).toEqual(['1', 'x, y'])
    expect(r[2]!.celulas[1]).toBe('linha1\nlinha2')
    expect(r[3]!.celulas[1]).toBe('aspas "duplas"')
  })
  it('detecta cabeçalho de duas linhas (grupo + campo)', () => {
    const r = separarCabecalho(lerCsvComLinhas('GRUPO,,,\nID,Nome,Tel,X\n1,Ana,+55 61 99999-0000,\n'))
    expect(r.grupos).not.toBeNull()
    expect(r.cabecalho).toEqual(['ID', 'Nome', 'Tel', 'X'])
    expect(r.dados[0]!.linha).toBe(3)
  })
  it('falha com aspas sem fechamento', () => {
    expect(() => lerCsvComLinhas('a\n"x')).toThrow()
  })
})

const linha = (o: Record<string, string>) => normalizarMembro(3, { ID: '1', Nome: 'Ana Souza', 'Telefone / WhatsApp': '+55 61 99999-0000', ...o })
const ex = (o: Partial<Existente>): Existente => ({ id: 'm1', user_id: null, legacy_id: '1', source_system: FONTE_MEMBROS, phone_e164: '+5561999990000', full_name: 'Ana Souza', source_hash: 'outro', updated_at: '2026-10-16T00:00:00Z', ...o })

describe('normalização de membros', () => {
  it('mapeia listas, notas, nascimento sem ano e família, sem inventar dados', () => {
    const r = linha({ Setores: 'A; B ; ', 'Exposição pública (1-5)': '4', Nascimento: '25/05', 'Filho 1 - Nome': 'Paco', 'Filho 1 - Nascimento': '22/01' })
    expect(r.erros).toEqual([])
    expect(r.normalizado!.profile.sectors).toEqual(['A', 'B'])
    expect(r.normalizado!.profile.public_exposure).toBe(4)
    expect(r.normalizado!.profile.birth_date).toBeNull()
    expect(r.normalizado!.profile.birthday_text).toBe('25/05')
    expect((r.normalizado!.profile.family as { filhos: unknown[] }).filhos).toEqual([{ nome: 'Paco', nascimento: '22/01' }])
  })
  it('recusa nota fora de 1-5 e telefone ilegível', () => {
    expect(linha({ 'Exposição pública (1-5)': '9' }).erros).toHaveLength(1)
    expect(linha({ 'Telefone / WhatsApp': '12' }).erros).toHaveLength(1)
  })
  it('coluna sensível sem destino com valor manda a linha para revisão e não guarda o valor', () => {
    const r = linha({ CPF: '123.456.789-00' })
    expect(r.revisao.length).toBe(1)
    expect(decidir(r, []).acao).toBe('review')
    expect(brutoMinimizado(r.raw).CPF).toBe('[presente]')
  })
  it('acusa cabeçalho desconhecido', () => {
    expect(cabecalhosDesconhecidos(['ID', 'Nome', 'Coluna Nova'])).toEqual(['Coluna Nova'])
  })
  it('separa a análise comportamental dos dados declarados', () => {
    const r = linha({ 'Eneagrama - Tipo Provável': '7w8', 'Histórico / Bio (original)': 'texto' })
    expect(r.normalizado!.behavioral).toEqual({ 'Eneagrama - Tipo Provável': '7w8' })
    expect(r.normalizado!.history).toBe('texto')
    expect(JSON.stringify(r.normalizado!.profile)).not.toContain('7w8')
  })
})

describe('casamento determinístico', () => {
  it('insere quando não há ninguém', () => expect(decidir(linha({}), []).acao).toBe('insert'))
  it('não muda nada quando o hash é igual (idempotência)', () => {
    const r = linha({})
    expect(decidir(r, [ex({ source_hash: r.normalizado!.hash })]).acao).toBe('unchanged')
  })
  it('atualiza pelo ID de origem', () => expect(decidir(linha({ 'Estado civil': 'Casado' }), [ex({})]).acao).toBe('update'))
  it('nome igual sem ID nem telefone vai para revisão', () => {
    expect(decidir(linha({ 'Telefone / WhatsApp': '+55 61 98888-0000' }), [ex({ legacy_id: '99', phone_e164: '+5561977770000' })]).acao).toBe('review')
  })
  it('telefone de outro nome vai para revisão', () => {
    expect(decidir(linha({ ID: '7' }), [ex({ legacy_id: '8', full_name: 'Outra Pessoa' })]).acao).toBe('review')
  })
  it('não troca o telefone de quem já tem conta nem apaga telefone', () => {
    expect(decidir(linha({ 'Telefone / WhatsApp': '+55 61 98888-0000' }), [ex({ user_id: 'u1' })]).acao).toBe('review')
    expect(decidir(linha({ 'Telefone / WhatsApp': '' }), [ex({})]).acao).toBe('review')
  })
  it('não toma o telefone de outro membro na atualização', () => {
    expect(decidir(linha({ 'Telefone / WhatsApp': '+55 61 98888-0000' }), [ex({}), ex({ id: 'm2', legacy_id: '2', full_name: 'B', phone_e164: '+5561988880000' })]).acao).toBe('review')
  })
})

describe('aba privada de CS', () => {
  const cab = ['ID', 'Nome na planilha', 'Confiança']
  it('casa pelo ID de origem e confere o nome', () => {
    const c = normalizarCs(comoObjeto(cab, ['1', 'Ana Souza', 'Alta'])).ok!
    expect(decidirCs(c, [ex({})], new Map()).acao).toBe('insert')
    const outro = normalizarCs(comoObjeto(cab, ['1', 'Outra', 'Alta'])).ok!
    expect(decidirCs(outro, [ex({})], new Map()).acao).toBe('review')
  })
  it('idempotente pelo hash da linha', () => {
    const c = normalizarCs(comoObjeto(cab, ['1', 'Ana Souza', 'Alta'])).ok!
    expect(decidirCs(c, [ex({})], new Map([['m1', c.hash]])).acao).toBe('unchanged')
  })
})

describe('cabeçalho repetido', () => {
  it('é detectado e recusado (um valor apagaria o outro)', () => {
    expect(cabecalhosDuplicados(['ID', 'Nome', 'Nome', ''])).toEqual(['Nome'])
    expect(() => comoObjeto(['ID', 'Nome', 'Nome'], ['1', 'a', 'b'])).toThrow(/repetido/)
  })
})
