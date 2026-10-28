-- homepage_example_questions.sql
-- Manual setup for the JC homepage's example-question chips (website-redesign-brief.md).
-- This repo has no migrations directory / CLI-managed schema, so run this by hand in the
-- Supabase SQL editor for the project supabaseClient.js points at.
--
-- The weekly DigitalOcean generator job that keeps this table fresh is explicit
-- out-of-scope follow-up work (see the jc-homepage redesign plan) — this file only
-- creates the table the frontend reads from and seeds it with a starter pool by hand.

create table if not exists homepage_example_questions (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  category   text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table homepage_example_questions enable row level security;

-- Public, read-only: the homepage is anonymous-friendly, so anyone can select active rows.
-- No insert/update/delete policy is created — only the generator job (service role) or a
-- human in the Supabase dashboard should be able to write to this table.
drop policy if exists "Public can read active example questions" on homepage_example_questions;
create policy "Public can read active example questions"
  on homepage_example_questions for select
  using (active = true);

-- Starter seed — hand-written, not AI-generated. Replace/expand once the weekly
-- generator job (out of scope for this branch) is built.
insert into homepage_example_questions (question, category) values
  ('What''s the safest upgrade path for a 9.3(x) ACI fabric?', 'aci'),
  ('How do I check if a CVE affects my fabric?', 'advisory'),
  ('What should I do before a major APIC upgrade?', 'aci'),
  ('Border leaf BGP best practices for ACI', 'aci'),
  ('What''s new in the latest NX-OS release?', 'nx-os'),
  ('How do I plan a vPC-safe leaf upgrade?', 'nx-os'),
  ('What are the end-of-life dates for Nexus 9300 switches?', 'eol'),
  ('How do spine and leaf version mismatches cause problems?', 'general'),
  ('What should I check before a maintenance window?', 'general'),
  ('Paste your device inventory and JC will analyse it right here', 'general');
