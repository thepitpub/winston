'use client'

import { FormCodigo } from '@/components/acesso/FormCodigo'
import { verificarMfa } from '../../acoes'

export function FormMfa() {
  return <FormCodigo acao={verificarMfa} />
}
