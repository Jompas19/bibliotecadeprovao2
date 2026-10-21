-- SOMENTE caso você já tenha instalado a versão antiga com imagens.
-- Antes de executar, exporte os dados de que precisar e exclua pelo painel Storage
-- os arquivos do bucket 'oitutigas-images'. Eles NÃO serão removidos por este SQL.
-- Comentários compostos somente por imagem serão excluídos por não terem mais conteúdo.
delete from public.oitutigas_comments where length(btrim(body))=0;
alter table public.oitutigas_comments drop constraint if exists oitutigas_content_required;
alter table public.oitutigas_comments drop column if exists image_key;
alter table public.oitutigas_comments drop column if exists image_mime;
alter table public.oitutigas_comments alter column body set not null;
alter table public.oitutigas_comments add constraint oitutigas_body_required
  check(length(btrim(body)) between 1 and 2000);
-- Após esvaziar o bucket pelo painel Storage, ele poderá ser excluído.
