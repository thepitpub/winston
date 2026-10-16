# Provedores

## Código temporário de acesso (`CH_OTP_PROVEDOR`)

A camada `src/lib/integracoes/otp.ts` tem três provedores. Trocar é mudar a variável e reiniciar.

### `manual` (padrão, funcionando)

Nenhuma mensagem sai do sistema. O código fica cifrado (AES-256-GCM, chave derivada de `CH_SEGREDO`) e aparece em **Command → Invitations & Access → Entrega de códigos**. A pessoa da equipe clica em "Revelar e entregar" (uma vez só; a cifra é apagada e a revelação vai para a auditoria) e envia pelo WhatsApp oficial da casa, com o link pronto. Serve enquanto não há provedor contratado, mas depende de alguém da equipe disponível.

### `twilio` (SMS)

Variáveis: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (número Twilio em E.164). Usa a API REST `Messages.json`.

**Não foi exercitado contra uma conta real.** No primeiro uso: enviar para um número de teste, conferir o texto e a entrega, e olhar os logs `otp.twilio.falhou`.

### `whatsapp_cloud` (WhatsApp Business Platform, Meta)

Variáveis: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` (token permanente de usuário do sistema), `WHATSAPP_TEMPLATE` (nome do template de categoria **Authentication** aprovado, com botão "copiar código"), `WHATSAPP_TEMPLATE_IDIOMA` (padrão `pt_BR`).

Pré-requisitos: conta Business verificada, número registrado, template de autenticação aprovado pela Meta (pode levar dias).

**Não foi exercitado contra uma conta real.** O formato do envio (corpo e botão com o código) segue a documentação de templates de autenticação; confirmar no primeiro envio.

Em qualquer provedor, falha de envio não muda a resposta da tela (para não revelar quem é membro); ela vai para o log (`otp.envio_falhou`) e para a trilha.

## IA do Winston (`CH_IA_PROVEDOR`)

Hoje só `nenhum`. O Winston classifica intenções por regras fixas (`src/lib/dominio/winston.ts`) e responde com **ferramentas de leitura** restritas ao membro (`src/lib/aplicacao/winston.ts`): saldo, credencial, diretório consentido, regras de benefícios, eventos publicados, solicitações. A tela diz que nenhum modelo de IA está conectado. Pedidos que exigem ação da casa viram proposta e só se tornam solicitação com confirmação explícita.

Para ligar um modelo depois:

1. Implementar um provedor que receba a conversa e as **mesmas ferramentas** como tool calling, cada uma executada no servidor com o cliente do usuário (RLS).
2. Nunca colocar no contexto do modelo dados do CS privado, de outros membros além do diretório consentido, nem dados administrativos.
3. Manter a confirmação humana para qualquer ação que crie ou altere dados.
4. Manter o limite por hora (`winston_limite_hora`) e a auditoria por mensagem.
