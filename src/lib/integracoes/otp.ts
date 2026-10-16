import 'server-only'
import { ambiente } from '../ambiente'
import { log } from '../auditoria'

export type Finalidade = 'login' | 'invite' | 'phone_change'
export type ResultadoEnvio = { status: 'sent' | 'manual_pending' | 'failed'; detalhe?: string }

/**
 * Entrega do código temporário. Trocar de provedor é mudar CH_OTP_PROVEDOR;
 * nada acima desta camada sabe quem entrega.
 *
 *  - manual: a casa vê o código (cifrado em repouso) na fila "Entregas de
 *    código" do Command e o envia pelo WhatsApp da casa. É o modo enquanto
 *    não há provedor contratado.
 *  - twilio: SMS pela API REST da Twilio.
 *  - whatsapp_cloud: template de autenticação da WhatsApp Cloud API (Meta).
 *
 * Twilio e WhatsApp Cloud seguem as APIs públicas documentadas, mas NÃO
 * foram exercitados contra uma conta real neste projeto: validar no
 * primeiro uso (ver docs/PROVEDORES.md).
 */
export interface ProvedorOtp {
  nome: 'manual' | 'twilio' | 'whatsapp_cloud'
  enviar(telefone: string, codigo: string, finalidade: Finalidade): Promise<ResultadoEnvio>
}

const TEXTO: Record<Finalidade, string> = {
  login: 'Seu código de acesso ao Continental',
  invite: 'Seu código para aceitar o convite do Continental',
  phone_change: 'Seu código para confirmar o novo telefone no Continental',
}

const manual: ProvedorOtp = {
  nome: 'manual',
  async enviar() {
    return { status: 'manual_pending' }
  },
}

const twilio: ProvedorOtp = {
  nome: 'twilio',
  async enviar(telefone, codigo, finalidade) {
    const e = ambiente()
    if (!e.TWILIO_ACCOUNT_SID || !e.TWILIO_AUTH_TOKEN || !e.TWILIO_FROM) return { status: 'failed', detalhe: 'twilio_nao_configurado' }
    const corpo = new URLSearchParams({ To: telefone, From: e.TWILIO_FROM, Body: `${TEXTO[finalidade]}: ${codigo}. Vale por 10 minutos. Não compartilhe.` })
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo,
    }).catch(() => null)
    if (!r?.ok) {
      log('warn', 'otp.twilio.falhou', { status: r?.status })
      return { status: 'failed', detalhe: `http_${r?.status ?? 'rede'}` }
    }
    return { status: 'sent' }
  },
}

const whatsappCloud: ProvedorOtp = {
  nome: 'whatsapp_cloud',
  async enviar(telefone, codigo) {
    const e = ambiente()
    if (!e.WHATSAPP_PHONE_NUMBER_ID || !e.WHATSAPP_TOKEN || !e.WHATSAPP_TEMPLATE) return { status: 'failed', detalhe: 'whatsapp_nao_configurado' }
    const r = await fetch(`https://graph.facebook.com/v21.0/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${e.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefone.replace('+', ''),
        type: 'template',
        template: {
          name: e.WHATSAPP_TEMPLATE,
          language: { code: e.WHATSAPP_TEMPLATE_IDIOMA },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: codigo }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: codigo }] },
          ],
        },
      }),
    }).catch(() => null)
    if (!r?.ok) {
      log('warn', 'otp.whatsapp.falhou', { status: r?.status })
      return { status: 'failed', detalhe: `http_${r?.status ?? 'rede'}` }
    }
    return { status: 'sent' }
  },
}

export function provedorOtp(): ProvedorOtp {
  const n = ambiente().CH_OTP_PROVEDOR
  return n === 'twilio' ? twilio : n === 'whatsapp_cloud' ? whatsappCloud : manual
}
