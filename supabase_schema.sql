-- =========================================================
-- JAYSAN RESOURCE PVT LTD - FINAL SUPABASE DATABASE SCHEMA
-- =========================================================

-- IMPORTANT: This script will WIPE EXISTING DATA to rebuild the schema perfectly.
-- Since you are restoring a backup anyway, this is exactly what you want!
drop table if exists bill_items cascade;
drop table if exists bills cascade;
drop table if exists repairs cascade;
drop table if exists products cascade;
drop table if exists expenditures cascade;
drop table if exists customer_queries cascade;
drop table if exists system_logs cascade;

create extension if not exists "uuid-ossp";

-- 1. PRODUCTS (Inventory)
create table if not exists products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text,
  price numeric not null default 0,
  cost_price numeric not null default 0,
  quantity integer not null default 0,
  vendor_name text,
  serial_number text,
  image_url text,
  courier_charges numeric default 0,
  location_from text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. BILLS (Invoice Metadata)
create table if not exists bills (
  id uuid default uuid_generate_v4() primary key,
  invoice_number text unique,
  seq_id integer,
  customer_name text,
  customer_phone text,
  total_amount numeric not null,
  gst_applied boolean default false,
  gst_type text,
  payment_status text,
  payment_method text,
  cash_receiver text,
  online_platform text,
  transaction_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. BILL ITEMS (Invoice Line Items)
create table if not exists bill_items (
  id uuid default uuid_generate_v4() primary key,
  bill_id uuid,
  product_id uuid references products(id) on delete set null, 
  product_name text not null,
  quantity integer not null default 1,
  price_at_sale numeric not null,
  cost_at_sale numeric default 0,
  serial_number text,
  problem text,
  part_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. REPAIRS (Kanban Tickets)
create table if not exists repairs (
  id uuid default uuid_generate_v4() primary key,
  customer_name text not null,
  contact_number text,
  device_details text not null,
  model_number text,
  serial_number text,
  issue_description text,
  problem_found text,
  technician_name text,
  status text default 'Received',
  custom_message text,
  estimated_cost numeric default 0,
  part_replaced_name text,
  is_part_change boolean default false,
  is_service_only boolean default false,
  invoice_number text,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. EXPENDITURES (Company Expenses)
create table if not exists expenditures (
  id uuid default uuid_generate_v4() primary key,
  item_name text,
  amount numeric not null,
  type text,
  category text,
  location text,
  remarks text,
  product_id uuid references products(id) on delete set null,
  quantity integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. CUSTOMER QUERIES
create table if not exists customer_queries (
  id uuid default uuid_generate_v4() primary key,
  customer_name text not null,
  phone_number text,
  requirement text,
  status text default 'Open',
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. SYSTEM LOGS (Security Tracker)
create table if not exists system_logs (
  id uuid default uuid_generate_v4() primary key,
  user_email text not null,
  action_type text not null,
  location text,
  device_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
alter table products enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;
alter table repairs enable row level security;
alter table expenditures enable row level security;
alter table customer_queries enable row level security;
alter table system_logs enable row level security;

-- Highly Permissive Configuration (For immediate ease-of-use)
create policy "Allow All Products"       on products         for all using (true) with check (true);
create policy "Allow All Bills"          on bills            for all using (true) with check (true);
create policy "Allow All Bill Items"     on bill_items       for all using (true) with check (true);
create policy "Allow All Repairs"        on repairs          for all using (true) with check (true);
create policy "Allow All Expenditures"   on expenditures     for all using (true) with check (true);
create policy "Allow All Queries"        on customer_queries for all using (true) with check (true);
create policy "Allow All System Logs"    on system_logs      for all using (true) with check (true);

-- CRITICAL FIX: Reload Schema Cache for Supabase REST API
NOTIFY pgrst, 'reload schema';
