-- Run once in Supabase SQL Editor

create table if not exists orbis_share_state (
  id int primary key default 1 check (id = 1),
  current_price numeric(20, 2) not null default 5000000,
  shares_for_sale int not null default 12000,
  shares_owner int not null default 4000,
  shares_reserve int not null default 3000,
  shares_incentive int not null default 1000,
  total_shares int not null default 20000,
  updated_at timestamptz not null default now()
);

insert into orbis_share_state (id)
values (1)
on conflict (id) do nothing;

-- Optional dividend tracking on users
alter table orbis_users
  add column if not exists last_dividend numeric(20, 2) not null default 0;

alter table orbis_users
  add column if not exists total_dividends numeric(20, 2) not null default 0;
