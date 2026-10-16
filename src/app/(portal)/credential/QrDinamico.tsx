'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Botao } from '@/components/ui/ui'
import { gerarQr } from './acoes'

/** Mostra o QR sob demanda e o renova sozinho antes de vencer, enquanto visível. */
export function QrDinamico() {
  const [qr, setQr] = useState<{ svg: string; expiraEm: number } | null>(null)
  const [restante, setRestante] = useState(0)
  const [pendente, iniciar] = useTransition()

  const buscar = useCallback(() => iniciar(async () => setQr(await gerarQr())), [])

  useEffect(() => {
    if (!qr) return
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((qr.expiraEm - Date.now()) / 1000))
      setRestante(s)
      if (s <= 3 && document.visibilityState === 'visible') buscar()
    }, 1000)
    return () => clearInterval(t)
  }, [qr, buscar])

  if (!qr) {
    return (
      <Botao variante="ouro" onClick={buscar} disabled={pendente} className="justify-self-start">
        {pendente ? 'Gerando…' : 'Mostrar código de entrada'}
      </Botao>
    )
  }
  return (
    <div className="grid justify-items-start gap-3">
      <div className="w-56 rounded-[4px] bg-marfim p-3 shadow-[inset_0_0_0_1px_rgba(11,13,15,.15)] [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="Código de entrada da credencial" dangerouslySetInnerHTML={{ __html: qr.svg }} />
      <p className="rotulo text-apagado" aria-live="polite">
        Renova em <span className="numerico">{restante}</span> s
      </p>
      <button type="button" className="rotulo text-apagado hover:text-tinta" onClick={() => setQr(null)}>
        Ocultar
      </button>
    </div>
  )
}
