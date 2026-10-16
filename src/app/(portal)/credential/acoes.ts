'use server'

import QRCode from 'qrcode'
import { ambiente } from '@/lib/ambiente'
import { credencialAtiva } from '@/lib/aplicacao/portal'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { QR_VALIDADE_S, tokenDeCredencial } from '@/lib/dominio/cripto'

/**
 * Token de curta duração (60 s) para o QR da credencial. Só ids e uma
 * assinatura: nenhum nome, telefone ou documento. A recepção valida no
 * servidor; um print do QR vence em um minuto.
 */
export async function gerarQr(): Promise<{ svg: string; expiraEm: number } | null> {
  const { membro } = await exigirMembro()
  const c = await credencialAtiva(membro.id)
  if (!c || c.status !== 'active') return null
  const token = tokenDeCredencial(ambiente().CH_SEGREDO, c.id, c.version)
  const svg = await QRCode.toString(token, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0b0d0f', light: '#eae4d9' } })
  return { svg, expiraEm: Date.now() + QR_VALIDADE_S * 1000 }
}
