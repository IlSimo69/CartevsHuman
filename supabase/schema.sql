-- ============================================================
-- CAH Italia - Schema Supabase
-- Da eseguire nella SQL Editor del tuo progetto Supabase
-- ============================================================

-- Abilita l'estensione per UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- TABELLA: rooms
-- ============================================================
create table if not exists rooms (
  id            uuid primary key default gen_random_uuid(),
  code          varchar(8) not null unique,
  host_id       uuid not null,
  status        text not null default 'lobby'
                  check (status in ('lobby','submitting','judging','round_end','game_end')),
  settings      jsonb not null default '{
    "target_score": 8,
    "round_timer": 60,
    "pause_between_rounds": 5,
    "czar_mode": "winner",
    "max_players": 10
  }',
  round_number  int not null default 0,
  current_czar_id       uuid,
  current_black_card_id int,
  timer_end     timestamptz,
  pause_end     timestamptz,
  winner_id     uuid,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABELLA: players
-- ============================================================
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  nickname    varchar(32) not null,
  score       int not null default 0,
  hand        jsonb not null default '[]',
  is_host     boolean not null default false,
  connected   boolean not null default true,
  joined_at   timestamptz not null default now()
);

-- ============================================================
-- TABELLA: rounds
-- ============================================================
create table if not exists rounds (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references rooms(id) on delete cascade,
  round_number      int not null,
  black_card_id     int not null,
  czar_id           uuid not null,
  winner_player_id  uuid,
  status            text not null default 'submitting'
                      check (status in ('submitting','judging','complete')),
  created_at        timestamptz not null default now()
);

-- ============================================================
-- TABELLA: submissions
-- ============================================================
create table if not exists submissions (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  player_id   uuid not null,
  card_ids    jsonb not null default '[]',
  is_winner   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (round_id, player_id)
);

-- ============================================================
-- INDICI
-- ============================================================
create index if not exists idx_players_room_id    on players(room_id);
create index if not exists idx_rounds_room_id     on rounds(room_id);
create index if not exists idx_submissions_round  on submissions(round_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Chiunque può leggere e scrivere nelle stanze (no auth richiesta)
-- Adatto a un gioco tra amici senza registrazione
-- ============================================================
alter table rooms       enable row level security;
alter table players     enable row level security;
alter table rounds      enable row level security;
alter table submissions enable row level security;

create policy "public_all" on rooms       for all using (true) with check (true);
create policy "public_all" on players     for all using (true) with check (true);
create policy "public_all" on rounds      for all using (true) with check (true);
create policy "public_all" on submissions for all using (true) with check (true);

-- ============================================================
-- REALTIME: abilita le pubblicazioni per le tabelle necessarie
-- ============================================================
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table rooms, players, rounds, submissions;
commit;

-- ============================================================
-- FUNZIONE: genera codice stanza unico (6 caratteri)
-- ============================================================
create or replace function generate_room_code()
returns varchar(8) language plpgsql as $$
declare
  chars  text    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result varchar(8) := '';
  i      int;
  attempt int := 0;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where code = result);
    attempt := attempt + 1;
    if attempt > 100 then
      raise exception 'Impossibile generare codice unico';
    end if;
  end loop;
  return result;
end;
$$;

-- ============================================================
-- PULIZIA AUTOMATICA: rimuovi stanze inattive dopo 12 ore
-- (opzionale, richiede pg_cron su Supabase Pro — commentare se non disponibile)
-- ============================================================
-- select cron.schedule(
--   'cleanup_old_rooms',
--   '0 * * * *',
--   $$delete from rooms where created_at < now() - interval '12 hours'$$
-- );
