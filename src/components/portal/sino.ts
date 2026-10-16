/** O Service Bell abre por evento: qualquer botão da casa pode tocá-lo. */
export const EVENTO_SINO = 'ch:sino'
export const abrirSino = () => window.dispatchEvent(new Event(EVENTO_SINO))
