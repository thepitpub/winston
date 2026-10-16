'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { entradaCompacta } from '@/components/command/kit'
import { Botao, Etiqueta } from '@/components/ui/ui'
import { buscar, validarCheckin, type Candidato } from './acoes'

const RESULTADO: Record<string, [string, 'ok' | 'atencao' | 'perigo' | 'neutro' | 'info']> = {
  validated: ['Validado', 'ok'],
  exception_granted: ['Exceção autorizada', 'info'],
  already_validated: ['Já validado neste evento', 'atencao'],
  not_found: ['Não encontrado', 'perigo'],
  suspended: ['Entrada não permitida', 'perigo'],
  credencial_inativa: ['Credencial suspensa ou revogada', 'perigo'],
  no_permission: ['Sem permissão', 'perigo'],
  event_closed: ['Evento fechado', 'neutro'],
}

type BarcodeDetectorCtor = new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

/**
 * Console da recepção. Busca por nome, código CH-XXXX-XXXX ou QR da
 * credencial (colado por leitor, digitado, ou lido pela câmera quando o
 * navegador tem BarcodeDetector). A decisão é sempre do servidor.
 */
export function Console({ eventos, podeExcecao }: { eventos: { id: string; nome: string; politica: string }[]; podeExcecao: boolean }) {
  const [evento, setEvento] = useState(eventos[0]?.id ?? '')
  const [consulta, setConsulta] = useState('')
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null)
  const [resultado, setResultado] = useState<{ id?: string; nome: string; r: string; motivo?: string } | null>(null)
  const [excecao, setExcecao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  const [camera, setCamera] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const parar = useRef<() => void>(() => {})
  // Saiu da página com a câmera ligada: desliga o stream e o laço de leitura.
  useEffect(() => () => parar.current(), [])

  const procurar = (q: string) =>
    iniciar(async () => {
      setErro(null)
      setResultado(null)
      // A justificativa de exceção é de UMA tentativa: nunca passa para o próximo membro.
      setExcecao('')
      const r = await buscar(q)
      if (!r.ok) return setErro(r.erro)
      setCandidatos(r.dados.candidatos)
      if (r.dados.candidatos.length === 0) setResultado({ nome: q.startsWith('CH1.') ? 'QR' : q, r: r.dados.aviso ? 'credencial_inativa' : 'not_found', motivo: r.dados.aviso })
    })

  const confirmar = (c: Candidato) =>
    iniciar(async () => {
      if (!evento) return setErro('Escolha um evento aberto.')
      const r = await validarCheckin({ membroId: c.id, eventoId: evento, consulta, excecao: resultado?.r === 'already_validated' && resultado.id === c.id ? excecao : '' })
      if (!r.ok) return setErro(r.erro)
      setResultado({ id: c.id, nome: c.full_name, r: r.dados.result, motivo: r.dados.motivo })
      if (r.dados.result !== 'already_validated') setExcecao('')
      if (r.dados.result === 'validated' || r.dados.result === 'exception_granted') {
        setCandidatos(null)
        setConsulta('')
        setExcecao('')
      }
    })

  const ligarCamera = async () => {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!Detector) return setErro('Este navegador não lê QR pela câmera. Use um leitor ou digite o código CH.')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setCamera(true)
      const v = video.current!
      v.srcObject = s
      await v.play()
      const det = new Detector({ formats: ['qr_code'] })
      let vivo = true
      parar.current = () => {
        vivo = false
        s.getTracks().forEach((t) => t.stop())
        setCamera(false)
      }
      while (vivo) {
        const lidos = await det.detect(v).catch(() => [])
        const qr = lidos.find((x) => x.rawValue.startsWith('CH1.'))
        if (qr) {
          parar.current()
          setConsulta(qr.rawValue)
          procurar(qr.rawValue)
          return
        }
        await new Promise((r) => setTimeout(r, 250))
      }
    } catch {
      setErro('Sem acesso à câmera.')
    }
  }

  if (!eventos.length) return <p className="text-sm text-apagado">Nenhum evento aberto. Abra ou crie um ao lado.</p>

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs text-apagado">
        Evento
        <select
          value={evento}
          onChange={(e) => {
            setEvento(e.target.value)
            setResultado(null)
            setExcecao('')
          }}
          className={entradaCompacta}
        >
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome} · {e.politica}
            </option>
          ))}
        </select>
      </label>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (consulta.trim()) procurar(consulta.trim())
        }}
      >
        <label htmlFor="consulta" className="sr-only">
          Nome, código ou QR
        </label>
        <input id="consulta" value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Nome, CH-XXXX-XXXX ou QR" autoComplete="off" className={`${entradaCompacta} min-w-0 flex-1`} />
        <Botao type="submit" variante="linha" disabled={pendente} className="!min-h-9">
          Buscar
        </Botao>
        <Botao type="button" variante="fantasma" onClick={() => (camera ? parar.current() : void ligarCamera())} className="!min-h-9">
          {camera ? 'Parar' : 'Câmera'}
        </Botao>
      </form>
      <video ref={video} playsInline muted className={camera ? 'aspect-video w-full rounded-xs bg-fundo object-cover' : 'hidden'} />
      {erro ? (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      ) : null}
      {resultado ? (
        <div role="status" className={`rounded-xs p-4 ${resultado.r === 'validated' || resultado.r === 'exception_granted' ? 'bg-ok/10' : 'bg-burgundy/30'}`}>
          <p className="font-display text-xl">{resultado.nome}</p>
          <Etiqueta tom={RESULTADO[resultado.r]?.[1] ?? 'neutro'}>{RESULTADO[resultado.r]?.[0] ?? resultado.r}</Etiqueta>
          {resultado.motivo ? <p className="mt-1 text-xs text-tinta-2">{resultado.motivo}</p> : null}
        </div>
      ) : null}
      {candidatos?.length ? (
        <ul className="grid gap-px bg-[var(--fio)]">
          {candidatos.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 bg-elevado-2 px-3 py-2.5">
              <span>
                <span className="block">
                  {c.full_name}
                  {c.is_synthetic ? <span className="ml-2 text-[0.65rem] text-attention uppercase">sintético</span> : null}
                </span>
                <span className="numerico font-mono text-xs text-discreto">
                  {c.public_code ?? 'sem credencial'} · {c.status}
                </span>
              </span>
              <Botao variante="ouro" disabled={pendente} onClick={() => confirmar(c)} className="!min-h-9">
                Validar entrada
              </Botao>
            </li>
          ))}
        </ul>
      ) : null}
      {podeExcecao && resultado?.r === 'already_validated' ? (
        <label className="grid gap-1 text-xs text-apagado">
          Exceção autorizada: justificativa (depois clique em Validar de novo)
          <input value={excecao} onChange={(e) => setExcecao(e.target.value)} maxLength={300} className={entradaCompacta} />
        </label>
      ) : null}
    </div>
  )
}
