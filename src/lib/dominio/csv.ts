/**
 * Leitor CSV (RFC 4180): aspas, vírgula e quebra de linha dentro de aspas,
 * aspas escapadas por duplicação, CRLF. Remove o BOM e normaliza para NFC
 * sem alterar mais nada: o valor original é preservado. Cada registro traz
 * a linha FÍSICA onde começa no arquivo (1-based), para a proveniência.
 */
export function lerCsvComLinhas(texto: string, delimitador = ','): { linha: number; celulas: string[] }[] {
  const t = texto.replace(/^﻿/, '').normalize('NFC')
  const registros: { linha: number; celulas: string[] }[] = []
  let celulas: string[] = []
  let campo = ''
  let aspas = false
  let fisica = 1
  let inicio = 1
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!
    const quebra = c === '\n' || c === '\r'
    if (quebra) {
      if (c === '\r' && t[i + 1] === '\n') {
        if (aspas) campo += '\r\n'
        i++
      } else if (aspas) campo += c
      fisica++
      if (aspas) continue
      celulas.push(campo)
      registros.push({ linha: inicio, celulas })
      celulas = []
      campo = ''
      inicio = fisica
      continue
    }
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"'
          i++
        } else aspas = false
      } else campo += c
      continue
    }
    if (c === '"') aspas = true
    else if (c === delimitador) {
      celulas.push(campo)
      campo = ''
    } else campo += c
  }
  if (aspas) throw new Error('CSV com aspas sem fechamento')
  if (campo !== '' || celulas.length) {
    celulas.push(campo)
    registros.push({ linha: inicio, celulas })
  }
  return registros.filter((r) => r.celulas.some((x) => x.trim() !== ''))
}

export function lerCsv(texto: string, delimitador = ','): string[][] {
  return lerCsvComLinhas(texto, delimitador).map((r) => r.celulas)
}

/**
 * Detecta cabeçalho de duas linhas (grupo + campo): a primeira tem muitas
 * células vazias e a segunda nenhuma nas primeiras colunas.
 */
export function separarCabecalho(entrada: { linha: number; celulas: string[] }[]): { grupos: string[] | null; cabecalho: string[]; dados: { linha: number; celulas: string[] }[] } {
  if (entrada.length === 0) throw new Error('CSV vazio')
  const a = entrada[0]!.celulas
  const b = entrada[1]?.celulas
  const duasLinhas = b !== undefined && a.filter((c) => c.trim() === '').length > a.length / 3 && b.slice(0, 3).every((c) => c.trim() !== '')
  return {
    grupos: duasLinhas ? a : null,
    cabecalho: (duasLinhas ? b! : a).map((c) => c.trim()),
    dados: entrada.slice(duasLinhas ? 2 : 1),
  }
}

/** Cabeçalhos repetidos: o importador recusa o arquivo (um valor apagaria o outro). */
export function cabecalhosDuplicados(cabecalho: string[]): string[] {
  const vistos = new Set<string>()
  const repetidos = new Set<string>()
  for (const h of cabecalho) if (h) (vistos.has(h) ? repetidos : vistos).add(h)
  return [...repetidos]
}

/**
 * Linha como objeto. Só o espaço nas pontas sai (é ruído de planilha); o
 * texto original inteiro continua na linha bruta guardada pelo importador.
 */
export function comoObjeto(cabecalho: string[], celulas: string[]): Record<string, string> {
  const repetidos = cabecalhosDuplicados(cabecalho)
  if (repetidos.length) throw new Error(`cabeçalho repetido: ${repetidos.join(', ')}`)
  const o: Record<string, string> = {}
  cabecalho.forEach((h, i) => {
    if (h) o[h] = (celulas[i] ?? '').trim()
  })
  return o
}
