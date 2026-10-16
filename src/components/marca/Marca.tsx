import { cx } from '@/components/ui/ui'

/**
 * O letreiro da casa. Como o WINE GARDEN do Wine Garden, mas com o sotaque
 * do Continental: CONTINENTAL em versal espaçada (placa de hotel), e a
 * inflexão "Heritage" no itálico da Instrument Serif.
 *
 *  - `linha`: para cabeçalhos (uma linha, pequeno).
 *  - `pilha`: para portas e herói (duas linhas, grande, com a legenda
 *    "Private members ——— Brasília" em mono).
 */
export function Marca({ variante = 'linha', className, legenda = true }: { variante?: 'linha' | 'pilha'; className?: string; legenda?: boolean }) {
  if (variante === 'linha') {
    return (
      <span className={cx('inline-flex items-baseline gap-2 leading-none', className)}>
        <span className="font-display text-[1.32rem] tracking-[0.2em] text-tinta">CONTINENTAL</span>
        <span className="font-display text-[1.05rem] text-destaque italic">Heritage</span>
      </span>
    )
  }
  return (
    <span className={cx('grid justify-items-start gap-[0.12em] leading-none', className)}>
      <span className="font-display text-[length:inherit] tracking-[0.12em] text-tinta">CONTINENTAL</span>
      <span className="-mt-[0.08em] pl-[0.04em] font-display text-[0.82em] tracking-[-0.02em] text-destaque italic">Heritage</span>
      {legenda ? (
        <span className="rotulo mt-[0.9rem] flex items-center gap-3 text-apagado [font-size:0.6875rem]">
          Private members
          <span aria-hidden="true" className="h-px w-14 bg-[var(--fio-forte)]" />
          Brasília
        </span>
      ) : null}
    </span>
  )
}
