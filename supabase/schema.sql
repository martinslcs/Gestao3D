-- =====================================================================
--  Gestão de Impressão 3D — schema do Supabase
--  Cole tudo no SQL Editor do Supabase e clique em "Run".
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Configurações da empresa e custos fixos
-- ---------------------------------------------------------------------
create table if not exists company_settings (
  user_id              uuid primary key default auth.uid() references auth.users on delete cascade,
  company_name         text    default 'Minha Impressão 3D',
  document             text,                      -- CNPJ / CPF
  phone                text,                      -- WhatsApp com DDD
  email                text,
  address              text,
  instagram            text,
  logo_url             text,
  energy_cost_kwh      numeric default 0.95,      -- R$ por kWh
  labor_cost_hour      numeric default 30,        -- R$ por hora de trabalho
  default_margin       numeric default 80,        -- % de lucro sobre o custo
  tax_rate             numeric default 6,         -- % imposto (ex.: Simples)
  card_fee             numeric default 0,         -- % taxa de cartão/gateway
  failure_rate         numeric default 10,        -- % de falhas/reimpressões
  material_waste       numeric default 5,         -- % perda (purga, suporte, brim)
  quote_validity_days  int     default 7,
  payment_terms        text    default '50% na aprovação e 50% na entrega. PIX, cartão ou transferência.',
  quote_footer         text,
  updated_at           timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Impressoras
-- ---------------------------------------------------------------------
create table if not exists printers (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users on delete cascade,
  name                   text not null,
  purchase_price         numeric default 0,       -- R$ pago na máquina
  lifespan_hours         numeric default 5000,    -- vida útil estimada (h)
  power_watts            numeric default 150,     -- consumo médio (W)
  maintenance_cost_hour  numeric default 0.5,     -- bicos, correias, PEI... (R$/h)
  active                 boolean default true,
  created_at             timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Materiais (filamentos / resinas)
-- ---------------------------------------------------------------------
create table if not exists materials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  name          text not null,                    -- ex.: Voolt3D, 3D Lab
  type          text default 'PLA',               -- PLA, PETG, ABS, TPU, Resina...
  color         text,
  price_per_kg  numeric default 120,              -- R$ por kg (ou por litro de resina)
  stock_g       numeric default 0,
  active        boolean default true,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  document    text,
  address     text,
  notes       text,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Orçamentos
-- ---------------------------------------------------------------------
create table if not exists quotes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  number          bigint generated always as identity,
  share_token     text unique not null default encode(gen_random_bytes(12), 'hex'),
  client_id       uuid references clients on delete set null,
  title           text,
  status          text not null default 'rascunho'
                  check (status in ('rascunho','enviado','aprovado','em_producao','concluido','recusado')),
  delivery_days   int  default 5,                 -- dias úteis após aprovação
  valid_until     date,
  shipping_cost   numeric default 0,
  discount        numeric default 0,              -- R$
  margin          numeric default 80,
  tax_rate        numeric default 6,
  card_fee        numeric default 0,
  payment_terms   text,
  notes           text,                           -- aparece para o cliente
  internal_notes  text,                           -- só você vê
  total_cost      numeric default 0,
  total_price     numeric default 0,
  approved_at     timestamptz,
  approved_by     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists quote_items (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references quotes on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  position      int default 0,
  name          text not null default 'Peça',
  description   text,
  photo_url     text,
  printer_id    uuid references printers on delete set null,
  material_id   uuid references materials on delete set null,
  quantity      int default 1,
  weight_g      numeric default 0,                -- por unidade
  print_hours   numeric default 0,                -- por unidade
  setup_hours   numeric default 0,                -- fatiamento / preparo (por unidade)
  post_hours    numeric default 0,                -- acabamento (por unidade)
  extra_cost    numeric default 0,                -- tinta, ímãs, embalagem... (por unidade)
  unit_cost     numeric default 0,
  unit_price    numeric default 0,
  total_price   numeric default 0,
  breakdown     jsonb
);

create index if not exists quote_items_quote_idx on quote_items(quote_id);
create index if not exists quotes_user_idx on quotes(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Segurança: cada usuário só enxerga os próprios dados
-- ---------------------------------------------------------------------
alter table company_settings enable row level security;
alter table printers         enable row level security;
alter table materials        enable row level security;
alter table clients          enable row level security;
alter table quotes           enable row level security;
alter table quote_items      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['company_settings','printers','materials','clients','quotes','quote_items'] loop
    execute format('drop policy if exists "dono" on %I', t);
    execute format(
      'create policy "dono" on %I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Link público do orçamento (o cliente não precisa de login)
-- Só expõe o que o cliente deve ver — nunca custos ou notas internas.
-- ---------------------------------------------------------------------
create or replace function get_public_quote(p_token text)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  q quotes;
  result json;
begin
  select * into q from quotes where share_token = p_token;
  if not found then
    return null;
  end if;

  select json_build_object(
    'quote', json_build_object(
      'number', q.number, 'title', q.title, 'status', q.status,
      'delivery_days', q.delivery_days, 'valid_until', q.valid_until,
      'shipping_cost', q.shipping_cost, 'discount', q.discount,
      'payment_terms', q.payment_terms, 'notes', q.notes,
      'total_price', q.total_price, 'created_at', q.created_at,
      'approved_at', q.approved_at, 'approved_by', q.approved_by
    ),
    'client', (select json_build_object('name', c.name) from clients c where c.id = q.client_id),
    'company', (select json_build_object(
        'company_name', s.company_name, 'document', s.document, 'phone', s.phone,
        'email', s.email, 'address', s.address, 'instagram', s.instagram,
        'logo_url', s.logo_url, 'quote_footer', s.quote_footer)
      from company_settings s where s.user_id = q.user_id),
    'items', coalesce((
      select json_agg(json_build_object(
          'name', i.name, 'description', i.description, 'photo_url', i.photo_url,
          'quantity', i.quantity, 'unit_price', i.unit_price, 'total_price', i.total_price,
          'material', trim(coalesce(m.type, '') || ' ' || coalesce(m.color, ''))
        ) order by i.position)
      from quote_items i
      left join materials m on m.id = i.material_id
      where i.quote_id = q.id), '[]'::json)
  ) into result;

  return result;
end;
$$;

create or replace function approve_public_quote(p_token text, p_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotes
     set status = 'aprovado', approved_at = now(), approved_by = left(p_name, 120), updated_at = now()
   where share_token = p_token
     and status in ('rascunho', 'enviado')
     and (valid_until is null or valid_until >= current_date);
  return found;
end;
$$;

grant execute on function get_public_quote(text)           to anon, authenticated;
grant execute on function approve_public_quote(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Armazenamento de fotos das peças e logo
-- Arquivos ficam em: quote-photos/<user_id>/<arquivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('quote-photos', 'quote-photos', true)
on conflict (id) do nothing;

drop policy if exists "fotos: enviar" on storage.objects;
drop policy if exists "fotos: alterar" on storage.objects;
drop policy if exists "fotos: apagar" on storage.objects;

create policy "fotos: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: alterar" on storage.objects for update to authenticated
  using (bucket_id = 'quote-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'quote-photos' and (storage.foldername(name))[1] = auth.uid()::text);
