'use client'


import { entradaCompacta } from '@/components/command/kit'
import { useAcao } from '@/components/ui/useAcao'
import { Aviso, Botao } from '@/components/ui/ui'
import { salvar } from './acoes'

type Evento = { id: string; name: string; kind: string; location: string | null; starts_at: string; ends_at: string | null; duplicate_policy: string; status: string; visible_to_members: boolean }

/** ISO → valor de <input type="datetime-local"> no horário de Brasília. */
function local(iso: string | null | undefined): string {
  if (!iso) return ''
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

const r = 'grid gap-1 text-xs text-apagado'

export function FormEvento({ atual }: { atual?: Evento }) {
  const [estado, enviar, p] = useAcao(salvar)
  return (
    <form onSubmit={enviar} className="grid gap-3 rounded-xs bg-fundo-2 p-3">
      <input type="hidden" name="id" value={atual?.id ?? ''} />
      <label className={r}>
        Nome
        <input name="name" defaultValue={atual?.name} required maxLength={140} className={entradaCompacta} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={r}>
          Tipo
          <select name="kind" defaultValue={atual?.kind ?? 'event'} className={entradaCompacta}>
            <option value="event">Evento</option>
            <option value="house">Casa (entrada diária)</option>
          </select>
        </label>
        <label className={r}>
          Duplicidade
          <select name="duplicate_policy" defaultValue={atual?.duplicate_policy ?? 'once_per_event'} className={entradaCompacta}>
            <option value="once_per_event">Uma vez por evento</option>
            <option value="once_per_day">Uma vez por dia</option>
            <option value="unlimited">Sem limite</option>
          </select>
        </label>
        <label className={r}>
          Início
          <input name="starts_at" type="datetime-local" defaultValue={local(atual?.starts_at)} required className={entradaCompacta} />
        </label>
        <label className={r}>
          Fim
          <input name="ends_at" type="datetime-local" defaultValue={local(atual?.ends_at)} className={entradaCompacta} />
        </label>
        <label className={r}>
          Local
          <input name="location" defaultValue={atual?.location ?? ''} maxLength={140} className={entradaCompacta} />
        </label>
        <label className={r}>
          Situação
          <select name="status" defaultValue={atual?.status ?? 'draft'} className={entradaCompacta}>
            <option value="draft">Rascunho</option>
            <option value="open">Aberto</option>
            <option value="closed">Fechado</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-tinta-2">
        <input type="checkbox" name="visible_to_members" defaultChecked={atual?.visible_to_members} className="accent-[var(--color-destaque)]" /> Visível para os membros (Winston e Portal)
      </label>
      {estado && !estado.ok ? <Aviso tom="perigo">{estado.erro}</Aviso> : estado?.ok ? <Aviso tom="ok">{estado.mensagem}</Aviso> : null}
      <Botao type="submit" variante="linha" disabled={p} className="justify-self-start !min-h-9">
        Salvar evento
      </Botao>
    </form>
  )
}
