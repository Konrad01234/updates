-- Kleinstadt, Phase 4: relationship history, newspaper, divine events
alter table events drop constraint events_type_check;
alter table events add constraint events_type_check check (type in ('move','talk','action','reflect','economy','weather','divine','news'));

create table relationship_history (
  sim_day int not null,
  resident_id text not null,
  other_id text not null,
  score int not null,
  primary key (sim_day, resident_id, other_id)
);

create table newspaper (
  sim_day int primary key,
  articles jsonb not null
);
