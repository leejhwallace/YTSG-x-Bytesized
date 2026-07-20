-- Run this file in the Supabase SQL Editor before using Page 5.
-- It provides the tables consumed by GET /api/data and PATCH /api/data/projects/:id.

create extension if not exists pgcrypto;

create table if not exists public.data_projects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text not null default '',
    delay_reason text,
    manual_total_minutes integer check (manual_total_minutes is null or manual_total_minutes >= 0),
    created_at timestamptz not null default now()
);

create table if not exists public.data_project_tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.data_projects(id) on delete cascade,
    task_name text not null,
    duration_minutes integer not null default 0 check (duration_minutes >= 0),
    completed_by text,
    completed_at date
);

create table if not exists public.data_events (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text not null default '',
    event_type text not null default 'Other',
    event_date date not null default current_date,
    volunteer_count integer not null default 0 check (volunteer_count >= 0),
    attendee_count integer not null default 0 check (attendee_count >= 0),
    created_at timestamptz not null default now()
);

create table if not exists public.data_event_feedback (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.data_events(id) on delete cascade,
    rating smallint not null check (rating between 1 and 5)
);

create table if not exists public.data_event_demographics (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.data_events(id) on delete cascade,
    age_group text not null check (age_group in ('children', 'teenagers', 'adults')),
    is_first_timer boolean not null default false,
    attendee_count integer not null default 1 check (attendee_count >= 0),
    unique (event_id, age_group, is_first_timer)
);

create table if not exists public.data_event_reach (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.data_events(id) on delete cascade,
    source text not null check (source in ('Word of Mouth', 'Website', 'Social Media')),
    reach_count integer not null default 0 check (reach_count >= 0),
    unique (event_id, source)
);

create table if not exists public.data_volunteer_hours (
    id uuid primary key default gen_random_uuid(),
    volunteer_name text not null,
    department text,
    hours numeric(8,2) not null default 0 check (hours >= 0),
    event_id uuid references public.data_events(id) on delete set null,
    project_id uuid references public.data_projects(id) on delete set null,
    logged_at date not null default current_date,
    check (event_id is not null or project_id is not null)
);

-- This demo app currently has no user session passed to the server. These policies
-- let its publishable Supabase key read and update Page 5 data. Replace them with
-- organisation/user-scoped policies before deploying the app publicly.
alter table public.data_projects enable row level security;
alter table public.data_project_tasks enable row level security;
alter table public.data_events enable row level security;
alter table public.data_event_feedback enable row level security;
alter table public.data_event_demographics enable row level security;
alter table public.data_event_reach enable row level security;
alter table public.data_volunteer_hours enable row level security;

drop policy if exists "page5 public access" on public.data_projects;
drop policy if exists "page5 public access" on public.data_project_tasks;
drop policy if exists "page5 public access" on public.data_events;
drop policy if exists "page5 public access" on public.data_event_feedback;
drop policy if exists "page5 public access" on public.data_event_demographics;
drop policy if exists "page5 public access" on public.data_event_reach;
drop policy if exists "page5 public access" on public.data_volunteer_hours;

create policy "page5 public access" on public.data_projects for all using (true) with check (true);
create policy "page5 public access" on public.data_project_tasks for all using (true) with check (true);
create policy "page5 public access" on public.data_events for all using (true) with check (true);
create policy "page5 public access" on public.data_event_feedback for all using (true) with check (true);
create policy "page5 public access" on public.data_event_demographics for all using (true) with check (true);
create policy "page5 public access" on public.data_event_reach for all using (true) with check (true);
create policy "page5 public access" on public.data_volunteer_hours for all using (true) with check (true);
