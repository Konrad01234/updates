-- Kleinstadt, Phase 1
create extension if not exists vector;

create table locations (
  id text primary key,
  name text not null,
  type text not null check (type in ('home','work','cafe','park','shop','square')),
  description text not null default '',
  open_hour int not null default 0,
  close_hour int not null default 24
);

create table residents (
  id text primary key,
  name text not null,
  age int not null,
  job text not null,
  home_id text not null references locations(id),
  work_id text references locations(id),
  personality text not null,
  goals text[] not null default '{}',
  daily_plan jsonb not null default '[]',
  current_location_id text references locations(id),
  current_action text not null default ''
);

create table memories (
  id bigserial primary key,
  resident_id text not null references residents(id) on delete cascade,
  kind text not null check (kind in ('observation','conversation','reflection')),
  content text not null,
  importance int not null check (importance between 1 and 10),
  sim_day int not null,
  sim_hour int not null,
  embedding vector(512),
  last_accessed int not null default 0
);
create index memories_resident_idx on memories(resident_id, sim_day);

create table relationships (
  resident_id text not null references residents(id) on delete cascade,
  other_id text not null references residents(id) on delete cascade,
  score int not null default 0 check (score between -100 and 100),
  label text not null default '',
  updated_day int not null default 0,
  primary key (resident_id, other_id)
);

create table events (
  id bigserial primary key,
  sim_day int not null,
  sim_hour int not null,
  type text not null check (type in ('move','talk','action','reflect')),
  resident_ids text[] not null,
  location_id text references locations(id),
  summary text not null,
  transcript jsonb
);
create index events_day_idx on events(sim_day, sim_hour);

create table sim_state (
  id int primary key default 1 check (id = 1),
  sim_day int not null default 1,
  sim_hour int not null default 6,
  ai_calls_today int not null default 0
);
insert into sim_state (id) values (1);
