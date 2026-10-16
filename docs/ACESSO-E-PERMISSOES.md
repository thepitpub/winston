# Acesso, papéis e permissões

## Identidade

Supabase Auth é a identidade de todos. Membros não têm e-mail na base, então cada conta Auth de membro usa um **identificador interno** (`m-<uuid>@membros.continental.invalid`) que nunca é exibido nem usado para contato. O telefone de acesso vive em `members.phone_e164` (único), não no Auth, porque o Auth do projeto é compartilhado com o LABPUB.

## Membro: do cadastro ao Lobby

| Estado | Significado |
|---|---|
| `pending` | Importado ou cadastrado, sem convite. Sem conta Auth. |
| `invited` | Convite emitido. A conta Auth nasce quando o convite é aceito. |
| `active` | Onboarding concluído: autenticador cadastrado, credencial emitida. |
| `suspended` | Sem acesso; sessões derrubadas. Reversível. |
| `revoked` | Final. Credencial e convites revogados. |

1. **Convite** (Command → ficha → Credencial e acesso → Emitir convite): token de 32 bytes, só o hash no banco, uso único, validade configurável (padrão 7 dias), revogável. Um convite vivo por membro. O link aparece uma vez. Só a emissão leva o membro a `invited`; tirá-lo de `invited` revoga os convites vivos (no app e por gatilho no banco).
2. **Aceite** (`/invite/[token]`): o membro confirma o telefone do convite e recebe um código temporário. Só então a conta Auth é criada e ligada ao membro.
3. **Onboarding**: cadastro do Google Authenticator (TOTP nativo do Supabase), escolha de privacidade do diretório (padrão: privado). Ao concluir: `active`, credencial `CH-XXXX-XXXX`, carteira de Gold Coins.
4. **Entradas seguintes** (`/login`): telefone → código temporário → código do autenticador.

A sessão é emitida pelo servidor: depois de conferir o código temporário, o servidor gera um link mágico (sem enviar nada) e o troca pela sessão do usuário. Isso dá ao login por telefone uma identidade Supabase sem depender do SMS do próprio Supabase.

**Código temporário**: 6 dígitos, hash HMAC amarrado ao desafio, validade de 10 minutos, 5 tentativas, 3 pedidos por número a cada 10 minutos e 12 por dia, 20 por rede por hora. Telefones que não são de membro ativo recebem a **mesma resposta**, passam pelos mesmos limites e geram um desafio inerte: o login não revela quem é membro.

**Segundo fator**: obrigatório para membros e sempre para a equipe. Limite próprio de 5 erros em 15 minutos por usuário. Com o provedor `manual`, a equipe vê o código temporário, então o autenticador do membro **não pode** ser desligado em Audit & Settings: é ele que impede alguém da casa de entrar no lugar do membro.

**Código temporário superado**: pedir um código novo vence os anteriores do mesmo telefone e finalidade. A fila de entrega manual só mostra o que ainda vale.

**Recuperação** (celular perdido): na ficha do membro, "Recuperar acesso" exige justificativa de como a identidade foi confirmada e telefone cadastrado. O início fica na trilha antes de qualquer passo; depois remove o autenticador, derruba as sessões e emite um convite novo.

**Troca de telefone**: em Configurações, com sessão AAL2, por código enviado ao número novo. A equipe também pode trocar na ficha: o membro recebe aviso no Portal, a trilha guarda os 4 últimos dígitos de antes e depois, e o telefone de quem tem acesso não pode ser apagado.

**Sessões**: cada sessão Auth é registrada (`member_sessions`). O membro encerra as outras em Configurações; a equipe encerra todas na ficha. A revogação apaga a sessão no Auth (refresh token) e marca a nossa tabela; um token emitido antes de uma revogação geral também é recusado.

## Equipe

Criada pelo terminal: `npm run staff:criar -- --email <e-mail> --nome "<nome>" --papel super_admin|admin|staff [--cs]`. A senha provisória aparece uma vez. No primeiro acesso a pessoa cadastra o autenticador e é obrigada a trocar a senha (`/admin/senha`); até lá nenhuma página ou ação do Command abre. Toda página e ação exige AAL2. A trilha registra o usuário e a máquina que rodou o script.

**Entrada da equipe**: 5 senhas erradas em 15 minutos bloqueiam aquele e-mail (contado pela trilha, com o e-mail em hash). O limite do Supabase não serve aqui porque vê só o IP do servidor.

## Papéis e permissões

| Permissão | super_admin | admin | staff |
|---|:-:|:-:|:-:|
| members.read | ✓ | ✓ | ✓ |
| members.write | ✓ | ✓ | |
| invitations.manage | ✓ | ✓ | |
| sessions.revoke | ✓ | ✓ | |
| checkins.validate | ✓ | ✓ | ✓ |
| checkins.manage | ✓ | ✓ | |
| announcements.manage | ✓ | ✓ | |
| concierge.read / respond | ✓ | ✓ | ✓ |
| concierge.assign | ✓ | ✓ | |
| coins.read | ✓ | ✓ | ✓ |
| coins.adjust | ✓ | ✓ | |
| coins.rules | ✓ | | |
| directory.moderate | ✓ | ✓ | |
| audit.read | ✓ | ✓ | |
| imports.run | ✓ | ✓ | |
| otp.deliver | ✓ | ✓ | ✓ |
| settings.manage, roles.manage | ✓ | | |
| **cs.read, cs.write** | concessão explícita | concessão explícita | concessão explícita |

`cs.read` e `cs.write` (Member Intelligence) **nunca** vêm de papel: só de `user_permissions`, concedidas em Audit & Settings por quem tem `roles.manage`, nunca a si mesmo. Um gatilho no banco recusa a concessão a quem não é pessoa da equipe real e ativa. Gravar a nota interna exige as duas. Cada leitura da seção é auditada.

A ficha do membro só mostra o ledger com `coins.read` e as solicitações com `concierge.read`. O módulo Invitations & Access aparece para quem tem `invitations.manage` ou `otp.deliver` (a recepção entrega códigos).

## Check-in

A recepção busca por QR dinâmico, código CH-XXXX-XXXX ou nome. O banco só valida membro ativo com credencial **ativa**: um código CH suspenso ou revogado é recusado já na busca, mesmo que o membro tenha outra credencial. O evento aceita entradas de 3 horas antes do início até o fim (se houver). A origem gravada (QR, código, manual) é a que o servidor confirma na hora, não a que o navegador informa. A justificativa de exceção vale só para o membro que acabou de dar "já validado".

## Defesa em camadas

1. **Servidor**: toda página do Command chama `exigirEquipe()` e checa a permissão; toda Server Action chama `exigirPermissao()`. Portal: `exigirMembro()`.
2. **RLS**: o membro lê o que é dele pelo próprio JWT; a identidade de membro na RLS exige AAL2. Diretório só mostra quem consentiu, e as colunas de contato não são legíveis pela API (privilégio por coluna).
3. **Privilégios**: tabelas sigilosas (`member_private_cs`, `import_rows`, `member_invitations`, `auth_otp_challenges`, `audit_logs`, `portal_announcements`, `user_permissions`, `app_settings`…) não têm privilégio para `anon` nem `authenticated`.
4. **Funções transacionais** (`ch_coin_lancar`, `ch_validar_checkin`, `ch_importar_*`, revogação de sessões) só executáveis pela chave secreta.
5. **Imutabilidade**: `audit_logs` e `gold_coin_transactions` são somente inserção (gatilho), inclusive para a chave secreta. A única exceção é apagar movimentações de contas sintéticas, para a limpeza dos testes.

Os testes de integração (`tests/integracao`) exercitam essas camadas contra o banco real.
