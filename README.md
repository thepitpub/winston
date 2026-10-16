# Continental Heritage

Plataforma privada de membros em dois ambientes no mesmo app Next.js:

- **Portal do Membro**: `/lobby` (Grand Lobby), `/credential`, `/directory`, `/winston`, `/gold-coins`, `/requests`, `/settings`, com entrada por `/login`, `/invite/[token]` e `/onboarding`.
- **Continental Command**: `/admin` (Overview, Members, Member Intelligence na ficha, Check-in Control, Concierge Desk, Announcements, Gold Coins Ledger, Invitations & Access, Directory Governance, Audit & Settings), com entrada por `/admin/login`.

Nenhuma imagem rasterizada: a identidade é tipografia, tokens CSS, SVG (selo, monograma, guilhoché calculado, o fio pontilhado) e GSAP com `prefers-reduced-motion`.

**Linguagem visual.** Gramática editorial emprestada do site do Wine Garden, com o vocabulário do Continental:

- **Tipografia**: Instrument Serif (voz da casa; a segunda linha do título em itálico dourado) e JetBrains Mono (balcão: interface, rótulos, códigos). Auto-hospedadas em `src/fonts` (SIL OFL).
- **Atmosferas** (`data-atmosfera`): `lobby` (obsidiana e ouro), `registro` (papel marfim do livro de hóspedes), `veludo` (bordô, Winston, menu e Service Bell), `bronze` (cofre das Gold Coins). Os componentes usam papéis (`fundo`, `tinta`, `destaque`…), nunca a cor crua; contraste AA conferido em cada atmosfera.
- **Peças**: título em duas linhas, fio de ouro pontilhado que termina numa moeda, listas numeradas com filetes, livro-razão com pontilhado, relógio de Brasília, botões em pílula. Ver `src/components/editorial` e `src/components/marca`.

## Rodar

```
npm install
cp .env.example .env.local      # preencher
npm run dev                      # http://localhost:3300 (só 127.0.0.1)
```

Com `CH_DEV_ATALHO=1`, `/dev/entrar?como=membro` e `/dev/entrar?como=equipe` abrem o Portal e o Command com identidades sintéticas. Em produção essa rota não existe (404).

## Qualidade

```
npm run typecheck
npm run lint
npm test                 # unidade (regras puras)
npm run test:integracao  # banco real, identidades sintéticas que se apagam
npm run test:e2e         # Chrome, contra o servidor de dev
npm run build
```

## Pastas

| Pasta | O que mora ali |
|---|---|
| `src/app/(acesso)` | Entrada, segundo fator, convite, onboarding |
| `src/app/(portal)` | Portal do Membro |
| `src/app/admin` | Continental Command |
| `src/lib/dominio` | Regras puras, testadas em unidade (cripto, telefone, acesso, CSV, importação, concierge, Winston) |
| `src/lib/aplicacao` | Casos de uso com efeito (acesso, portal, diretório, Winston, coins; `equipe/` para o Command) |
| `src/lib/autorizacao` | Sessão, membro, equipe, permissões |
| `src/lib/integracoes` | Provedores de código temporário |
| `src/lib/db` | Clientes Supabase e tipos gerados do schema real (`npm run db:tipos`) |
| `supabase/migrations` | Migrations versionadas (aditivas) |
| `scripts` | Importação (`npm run importar`) e criação de equipe (`npm run staff:criar`) |

## Documentos

- [docs/ACESSO-E-PERMISSOES.md](docs/ACESSO-E-PERMISSOES.md): fluxos de acesso, papéis, permissões, RLS.
- [docs/PROVEDORES.md](docs/PROVEDORES.md): código temporário (manual, Twilio, WhatsApp) e IA.
- [docs/IMPORTACAO.md](docs/IMPORTACAO.md): pipeline, relatório das importações já feitas, compensação.
- [docs/DEPLOY.md](docs/DEPLOY.md): checklist Vercel e domínio.
- [../RELATORIO-DESCOBERTA-CONTINENTAL-HERITAGE.md](../RELATORIO-DESCOBERTA-CONTINENTAL-HERITAGE.md): auditoria inicial.
