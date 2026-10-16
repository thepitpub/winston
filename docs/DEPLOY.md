# Deploy na Vercel

Nada foi publicado ainda. Este é o roteiro.

## Antes

- [ ] `npm run typecheck && npm run lint && npm test && npm run test:integracao && npm run build` limpos.
- [ ] Revisar `supabase/migrations/`: todas já estão aplicadas no projeto `cfigjxuyjklchsyhdgrg` (aplicadas com `supabase db query --linked -f`, a partir da pasta `labpub`, que é a vinculada). Não aparecem no histórico `supabase migration list` do LABPUB.
- [ ] Apagar as identidades de demonstração se não forem mais usadas: membro "Membro de Demonstração" e equipe "Equipe de Demonstração" (ambas `is_synthetic`).
- [ ] Criar a primeira pessoa real da equipe: `npm run staff:criar -- --email … --nome "…" --papel super_admin --cs`. Ela troca a senha provisória no primeiro acesso.
- [ ] Decidir o provedor de código (`docs/PROVEDORES.md`). Sem provedor, `manual`.

## Projeto na Vercel

- [ ] Importar o repositório, Framework: Next.js, Root Directory: `continental-heritage` (se o repositório for a pasta `Winston`).
- [ ] Node 20.9+.
- [ ] Variáveis (Production e Preview), copiando de `.env.example`:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY` (marcar como Sensitive)
  - `CH_SEGREDO` (novo, `openssl rand -hex 32`; marcar como Sensitive)
  - `CH_URL` = URL pública final
  - `CH_OTP_PROVEDOR` e as do provedor
  - **Não** cadastrar `CH_DEV_ATALHO`.
- [ ] Preview deployments apontam para o MESMO Supabase de produção: restringir o acesso aos previews (Vercel Deployment Protection) ou não criar previews com dados reais.

## Domínio

- [ ] Vercel → Domains → adicionar o domínio (ex.: `membros.<dominio>` para o Portal; o Command fica em `/admin` do mesmo domínio).
- [ ] Criar no DNS o registro que a Vercel indicar (CNAME `cname.vercel-dns.com` para subdomínio, ou A/ALIAS para o raiz).
- [ ] Atualizar `CH_URL` com `https://…` e fazer redeploy (os links de convite usam essa base).
- [ ] Supabase → Authentication → URL Configuration: `Site URL` com o domínio (o fluxo não envia e-mails do Supabase, mas mantém a configuração coerente).

## Depois

- [ ] Abrir `/login` e `/admin/login` no domínio.
- [ ] Conferir que `/dev/entrar` responde 404.
- [ ] Emitir um convite para um fundador de confiança e fazer o fluxo completo num celular real (convite → código → autenticador → Lobby → credencial).
- [ ] Ver a trilha em Audit & Settings.
