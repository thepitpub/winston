-- Contatos do diretório são liberados pelo servidor, só a conexões aceitas.
-- A RLS é por linha; aqui a restrição é por COLUNA: o membro autenticado
-- não lê e-mail, Instagram nem LinkedIn de ninguém pela API, nem os dele.
revoke select on public.directory_preferences from authenticated, anon;
grant select (member_id, visible, display_name, profession, company, city, interests, skills, description,
  contact_whatsapp, consented_at, moderation_status, updated_at) on public.directory_preferences to authenticated;
