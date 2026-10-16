'use client'

import { useSyncExternalStore } from 'react'
import { cx } from '@/components/ui/ui'

/*
 * O relógio da recepção, sempre na hora de Brasília (é a hora da CASA que
 * importa). Um único intervalo para a página toda, por store externo: sem
 * setState em efeito e sem divergência de hidratação (o servidor renderiza
 * vazio e o navegador preenche no primeiro quadro).
 */
const FMT = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
let atual = ''
const ouvintes = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null
const ler = () => FMT.format(new Date())
function inscrever(f: () => void) {
  ouvintes.add(f)
  if (!timer) {
    atual = ler()
    timer = setInterval(() => {
      const agora = ler()
      if (agora !== atual) {
        atual = agora
        ouvintes.forEach((o) => o())
      }
    }, 5000)
  }
  return () => {
    ouvintes.delete(f)
    if (!ouvintes.size && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

export function Relogio({ className, rotulo = 'Brasília' }: { className?: string; rotulo?: string }) {
  const hora = useSyncExternalStore(inscrever, () => atual || ler(), () => '')
  return (
    <span className={cx('rotulo numerico inline-flex items-center gap-2', className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-destaque shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-destaque)_22%,transparent)]" />
      <span>{rotulo}</span>
      <time className="min-w-[5ch] text-tinta" suppressHydrationWarning>
        {hora || '--:--'}
      </time>
    </span>
  )
}
