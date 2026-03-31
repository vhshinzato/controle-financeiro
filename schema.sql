-- ─── SCHEMA - Controle Financeiro ──────────────────────────────────────────

-- Transactions
create table public.transactions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tipo text not null,
  categoria text not null,
  valor numeric(12,2) not null default 0,
  data date not null,
  pagamento text default '',
  obs text default '',
  mes text not null,
  banco_id text,
  conta_id text,
  cartao_id text,
  created_at timestamptz default now()
);

-- Cartões
create table public.cartoes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null,
  limite numeric(12,2) not null default 0,
  usado numeric(12,2) not null default 0,
  data_fechamento int default 1,
  data_vencimento int default 10,
  created_at timestamptz default now()
);

-- Bancos
create table public.bancos (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null,
  cor text default '#6366f1',
  cartoes_vinculados jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Contas (vinculadas aos bancos)
create table public.contas (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  banco_id text references public.bancos(id) on delete cascade not null,
  tipo text not null,
  nome text not null,
  saldo_inicial numeric(12,2) default 0,
  criada_em date default current_date,
  created_at timestamptz default now()
);

-- Despesas Futuras
create table public.despesas_futuras (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  categoria text not null,
  valor numeric(12,2) not null default 0,
  tipo text default 'Despesa Fixa',
  mes text not null,
  created_at timestamptz default now()
);

-- Metas (uma por usuário)
create table public.metas (
  user_id uuid references auth.users(id) on delete cascade primary key,
  gasto_mensal numeric(12,2) default 0,
  limite_cartao numeric(12,2) default 0,
  updated_at timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

alter table public.transactions enable row level security;
alter table public.cartoes enable row level security;
alter table public.bancos enable row level security;
alter table public.contas enable row level security;
alter table public.despesas_futuras enable row level security;
alter table public.metas enable row level security;

create policy "owner" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on public.cartoes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on public.bancos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on public.contas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on public.despesas_futuras for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on public.metas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
