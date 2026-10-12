-- Kleinstadt, Phase 2: positions, minute ticks, snapshots
alter table sim_state add column sim_minute int not null default 0;

create table positions (
  resident_id text primary key references residents(id) on delete cascade,
  x int not null,
  y int not null,
  path jsonb not null default '[]',
  target_location_id text references locations(id),
  paused_ticks int not null default 0,
  street_talks_this_trip int not null default 0
);

create table snapshots (
  sim_day int primary key,
  created_at timestamptz not null default now(),
  data jsonb not null
);
