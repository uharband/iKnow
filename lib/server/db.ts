import { Pool } from "pg";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

/** Without a database the app runs in "local" mode and keeps everything in the browser. */
export const hasDb = !!url;

const g = globalThis as unknown as { __iknowPool?: Pool; __iknowReady?: Promise<void> };

const SCHEMA = `
create table if not exists people (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists media (
  id text primary key,
  person_id text not null references people(id) on delete cascade,
  kind text not null check (kind in ('photo', 'voice')),
  mime text not null,
  bytes bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists media_person on media(person_id);
create table if not exists settings (
  key text primary key,
  value jsonb not null
);
create table if not exists links (
  person_id text primary key references people(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists messages (
  id text primary key,
  person_id text not null references people(id) on delete cascade,
  from_player boolean not null,
  kind text not null check (kind in ('text', 'voice')),
  body text,
  mime text,
  bytes bytea,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_person on messages(person_id, created_at);
`;

/** A small shared pool; the tables are created on first use so there is no setup step. */
export async function db(): Promise<Pool> {
  if (!g.__iknowPool) g.__iknowPool = new Pool({ connectionString: url, max: 3 });
  if (!g.__iknowReady) {
    g.__iknowReady = g.__iknowPool
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        g.__iknowReady = undefined;
        throw e;
      });
  }
  await g.__iknowReady;
  return g.__iknowPool;
}
