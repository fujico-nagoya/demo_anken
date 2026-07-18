create type app_role as enum ('admin', 'project_manager', 'field_staff', 'accounting');
create type project_status as enum ('planning', 'estimating', 'contracted', 'in_progress', 'inspection', 'completed', 'on_hold');
create type estimate_status as enum ('draft', 'sent', 'accepted', 'lost');
create type invoice_status as enum ('draft', 'issued', 'partial', 'paid', 'overdue');
create type file_kind as enum ('photo', 'drawing', 'document', 'invoice', 'other');
create type cost_category as enum ('material', 'labor', 'subcontract', 'equipment', 'expense');
create type catalog_kind as enum ('material', 'fixed_cost', 'labor', 'subcontract', 'other');

create table company_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  phone text not null,
  email text not null,
  invoice_registration_number text not null,
  bank text not null,
  branch text not null,
  account_type text not null,
  account_number text not null,
  account_name text not null,
  tax_rate numeric(5, 4) not null default 0.1,
  seal_label text not null,
  updated_at timestamptz not null default now()
);

create table app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  role app_role not null default 'field_staff',
  email text not null unique,
  team text not null,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  phone text not null,
  email text not null,
  address text not null,
  payment_term text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  address text not null,
  manager text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid not null references customers(id),
  site_id uuid not null references sites(id),
  name text not null,
  type text not null,
  estimate_request_date date,
  prime_contractor_name text,
  client_contact_name text,
  site_name text,
  site_address text,
  reception_staff text,
  survey_staff text,
  estimate_staff text,
  inquiry_type text,
  orderer_category text,
  completion_date date,
  memo text,
  status project_status not null default 'planning',
  priority text not null default 'normal',
  manager_id uuid not null references app_users(id),
  start_date date not null,
  end_date date not null,
  contract_amount integer not null default 0,
  estimated_cost integer not null default 0,
  billed_amount integer not null default 0,
  paid_amount integer not null default 0,
  progress integer not null default 0 check (progress between 0 and 100),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table schedule_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  assignee_ids uuid[] not null default '{}',
  equipment text not null default '',
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table daily_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  report_date date not null,
  author_id uuid not null references app_users(id),
  weather text not null,
  workers integer not null default 0,
  work_hours numeric(6, 2) not null default 0,
  summary text not null,
  safety_notes text not null default '',
  photos_count integer not null default 0,
  submitted_at timestamptz not null default now()
);

create table media_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  kind file_kind not null,
  category text not null,
  uploader_id uuid not null references app_users(id),
  uploaded_at timestamptz not null default now(),
  size integer not null default 0,
  storage_path text not null
);

create table estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number text not null unique,
  status estimate_status not null default 'draft',
  issue_date date not null,
  valid_until date not null,
  subtotal integer not null default 0,
  tax integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now()
);

create table catalog_items (
  id uuid primary key default gen_random_uuid(),
  kind catalog_kind not null,
  category text not null,
  name text not null,
  unit text not null,
  unit_price integer not null,
  cost_price integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  name text not null,
  quantity numeric(12, 2) not null,
  unit text not null,
  unit_price integer not null,
  sort_order integer not null default 0
);

create table cost_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  cost_date date not null,
  category cost_category not null,
  vendor text not null,
  description text not null,
  amount integer not null,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number text not null unique,
  status invoice_status not null default 'draft',
  issue_date date not null,
  due_date date not null,
  subtotal integer not null default 0,
  tax integer not null default 0,
  total integer not null default 0,
  paid_amount integer not null default 0,
  paid_date date,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  payment_date date not null,
  amount integer not null,
  method text not null,
  memo text not null default '',
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target text not null,
  user_id uuid references app_users(id),
  summary text not null,
  created_at timestamptz not null default now()
);

alter table app_users enable row level security;
alter table customers enable row level security;
alter table sites enable row level security;
alter table projects enable row level security;
alter table schedule_events enable row level security;
alter table daily_reports enable row level security;
alter table media_files enable row level security;
alter table estimates enable row level security;
alter table catalog_items enable row level security;
alter table cost_entries enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;
alter table company_settings enable row level security;

create policy "signed in users can read operations" on projects for select using (auth.role() = 'authenticated');
create policy "signed in users can read customers" on customers for select using (auth.role() = 'authenticated');
create policy "signed in users can read sites" on sites for select using (auth.role() = 'authenticated');
create policy "signed in users can read schedules" on schedule_events for select using (auth.role() = 'authenticated');
create policy "signed in users can read reports" on daily_reports for select using (auth.role() = 'authenticated');
create policy "signed in users can read files" on media_files for select using (auth.role() = 'authenticated');
create policy "signed in users can read estimates" on estimates for select using (auth.role() = 'authenticated');
create policy "signed in users can read catalog items" on catalog_items for select using (auth.role() = 'authenticated');
create policy "signed in users can read costs" on cost_entries for select using (auth.role() = 'authenticated');
create policy "signed in users can read invoices" on invoices for select using (auth.role() = 'authenticated');
create policy "signed in users can read payments" on payments for select using (auth.role() = 'authenticated');
create policy "signed in users can read company settings" on company_settings for select using (auth.role() = 'authenticated');
