-- Kleinstadt, Phase 3: weather, economy
alter table events drop constraint events_type_check;
alter table events add constraint events_type_check check (type in ('move','talk','action','reflect','economy','weather'));

alter table residents add column balance numeric not null default 0;
alter table residents add column daily_wage numeric not null default 0;
alter table residents add column employer_id text references locations(id);

alter table locations add column owner_id text references residents(id);
alter table locations add column balance numeric not null default 0;
alter table locations add column price numeric not null default 0;
alter table locations add column daily_cost numeric not null default 0;
alter table locations add column days_in_loss int not null default 0;
alter table locations add column status text not null default 'open' check (status in ('open','closed'));

create table world (
  sim_day int primary key,
  weather text not null check (weather in ('sonnig','bewölkt','Regen')),
  temperature int not null
);

create table transactions (
  id bigserial primary key,
  sim_day int not null,
  from_id text not null,
  to_id text not null,
  amount numeric not null,
  reason text not null
);
create index transactions_day_idx on transactions(sim_day);
