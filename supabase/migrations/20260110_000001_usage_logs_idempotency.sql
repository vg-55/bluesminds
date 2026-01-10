-- Two-phase, idempotent usage logging support
-- Adds idempotency + status fields so streaming requests are always recorded (started) and later finalized.

alter table if exists public.usage_logs
  add column if not exists idempotency_key text,
  add column if not exists status text not null default 'finalized',
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists finalized_at timestamptz,
  add column if not exists estimated_prompt_tokens integer,
  add column if not exists estimated_completion_tokens integer,
  add column if not exists estimated_total_tokens integer;

-- Backfill for existing rows
update public.usage_logs
set
  idempotency_key = coalesce(idempotency_key, request_id),
  status = coalesce(status, 'finalized'),
  started_at = coalesce(started_at, created_at),
  finalized_at = coalesce(finalized_at, created_at),
  estimated_prompt_tokens = coalesce(estimated_prompt_tokens, prompt_tokens),
  estimated_completion_tokens = coalesce(estimated_completion_tokens, completion_tokens),
  estimated_total_tokens = coalesce(estimated_total_tokens, total_tokens)
where idempotency_key is null
   or finalized_at is null
   or estimated_total_tokens is null;

-- Enforce idempotency per API key (must include partition key created_at)
create unique index if not exists usage_logs_api_key_id_idempotency_key_uidx
  on public.usage_logs (api_key_id, idempotency_key, created_at);

create index if not exists usage_logs_user_id_created_at_idx
  on public.usage_logs (user_id, created_at desc);

create index if not exists usage_logs_status_started_at_idx
  on public.usage_logs (status, started_at);