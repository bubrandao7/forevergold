-- Storage (buckets e permissões) e Realtime. Só corre onde existem (Supabase).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    -- fotografias das peças: leitura pública (o cliente vê); escrita só da loja dona
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('pecas', 'pecas', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set public = true, file_size_limit = 10485760;
    -- publicidade: privado, só a equipa lê, só a BU escreve. 50 MB = limite do plano gratuito
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('pub', 'pub', false, 52428800)
    on conflict (id) do update set public = false, file_size_limit = 52428800;

    execute $p$create policy pecas_ler on storage.objects for select to anon, authenticated using (bucket_id = 'pecas')$p$;
    execute $p$create policy pecas_escrever on storage.objects for insert to authenticated
      with check (bucket_id = 'pecas' and (storage.foldername(name))[1] = fg.loja())$p$;
    execute $p$create policy pecas_atualizar on storage.objects for update to authenticated
      using (bucket_id = 'pecas' and (storage.foldername(name))[1] = fg.loja())$p$;
    execute $p$create policy pecas_apagar on storage.objects for delete to authenticated
      using (bucket_id = 'pecas' and (storage.foldername(name))[1] = fg.loja())$p$;

    execute $p$create policy pub_ler on storage.objects for select to authenticated
      using (bucket_id = 'pub' and fg.eh_equipa())$p$;
    execute $p$create policy pub_escrever on storage.objects for insert to authenticated
      with check (bucket_id = 'pub' and fg.eh_bu())$p$;
    execute $p$create policy pub_atualizar on storage.objects for update to authenticated
      using (bucket_id = 'pub' and fg.eh_bu())$p$;
    execute $p$create policy pub_apagar on storage.objects for delete to authenticated
      using (bucket_id = 'pub' and fg.eh_bu())$p$;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.lojas, public.pecas, public.peca_fotos, public.chat, public.cotacoes,
      public.lucro, public.pub, public.pub_partilhas, public.vistos;
  end if;
end $$;
