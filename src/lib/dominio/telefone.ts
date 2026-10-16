/**
 * Telefone em E.164 (+5561999999999). Aceita o que as pessoas digitam e o
 * que a planilha traz ("+55 61 90000-1234"). Número brasileiro sem DDI
 * ganha o 55. Devolve null quando não dá para ter certeza.
 */
export function paraE164(entrada: string | null | undefined): string | null {
  if (!entrada) return null
  const temMais = entrada.trim().startsWith('+')
  let d = entrada.replace(/\D/g, '')
  if (!d) return null
  if (!temMais && (d.length === 10 || d.length === 11)) d = '55' + d
  if (d.length < 10 || d.length > 15 || d.startsWith('0')) return null
  return `+${d}`
}

/** +55 61 90000-1234 */
export function formatarTelefone(e164: string | null | undefined): string {
  if (!e164) return ''
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164)
  return m ? `+55 ${m[1]} ${m[2]}-${m[3]}` : e164
}

/** +55 61 9••••-0909: para confirmar sem revelar. */
export function mascararTelefone(e164: string | null | undefined): string {
  if (!e164) return ''
  const m = /^\+55(\d{2})(\d)(\d{3,4})(\d{4})$/.exec(e164)
  return m ? `+55 ${m[1]} ${m[2]}${'•'.repeat(m[3]!.length)}-${m[4]}` : e164.slice(0, 4) + '•••' + e164.slice(-4)
}
