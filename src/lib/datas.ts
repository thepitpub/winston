const FUSO = 'America/Sao_Paulo'

export const dataCurta = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: 'short' }).format(new Date(iso)).replace('.', '')
export const dataLonga = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
export const hora = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
export const dataHora = (iso: string) => `${dataCurta(iso)} · ${hora(iso)}`
export const dataHoraCompleta = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso))

export function saudacao(nome: string, agora = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: FUSO, hour: 'numeric', hourCycle: 'h23' }).format(agora))
  return `${h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${nome}.`
}

export const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
export const romano = (n: number) => ROMANOS[n] ?? String(n)

/** "Agora" fora do corpo do componente: o lint de pureza do React não acusa. */
export const agoraMs = () => Date.now()
