-- Wood Depot — Supabase schema (v1 runs on mock data; set VITE_DATA_SOURCE=supabase to switch).
-- Column names match services/catalogRepository.ts.

create table if not exists categories (
  id text primary key,                -- construction | agriculture | greenhouse | seasonal
  name_fr text not null,
  name_ar text,
  zone_id text not null,
  sort_order int default 0
);

create table if not exists products (
  id text primary key,
  slug text unique not null,
  category text references categories(id),
  name_fr text not null,
  name_ar text,
  description_fr text,
  description_ar text,
  dimensions jsonb default '{}'::jsonb,  -- { lengthM, widthCm, thicknessCm, diameterCm, weightKg }
  unit text default 'piece',             -- piece | bag | kg
  price numeric,                          -- null = "Sur devis"
  stock int,
  availability text default 'in_stock',  -- in_stock | limited | on_order | seasonal
  image_url text,
  model3d_url text,                       -- optional GLB; procedural model used when null
  usage text[] default '{}',
  featured boolean default false,
  seasonal boolean default false,
  shape text default 'board',            -- board | round | bag | bulk (3D + illustration)
  wood_tone text default 'pine',         -- pine | fir | eucalyptus | charcoal
  active boolean default true,
  sort_order int default 0,
  updated_at timestamptz default now()
);

create table if not exists business_settings (
  id int primary key default 1,
  business_name text not null,
  phone text,
  whatsapp text,                          -- digits only, international format
  address_fr text,
  address_ar text,
  latitude double precision,              -- real coordinates only
  longitude double precision,
  opening_hours jsonb,
  logo_url text,
  cover_image_url text,
  seasonal_mode boolean default false,
  constraint single_row check (id = 1)
);

create table if not exists quote_requests (
  id text primary key,
  customer_name text not null,
  phone text not null,
  city text not null,
  delivery_required boolean default false,
  project_type text,
  items jsonb not null,                   -- [{ productId, name, quantity, unit }]
  message text,
  language text default 'fr',
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  quote_id text references quote_requests(id),
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists site_content (
  key text primary key,                   -- e.g. about.body, gallery
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Public read for the catalogue; quote requests are insert-only from the site.
alter table products enable row level security;
alter table categories enable row level security;
alter table business_settings enable row level security;
alter table quote_requests enable row level security;
create policy "public read products" on products for select using (active);
create policy "public read categories" on categories for select using (true);
create policy "public read settings" on business_settings for select using (true);
create policy "public insert quotes" on quote_requests for insert with check (true);
