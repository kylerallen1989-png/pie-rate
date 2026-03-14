-- ── Pie-Rate schema additions ──────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text        NOT NULL,
  contact_name text,
  email        text,
  phone        text,
  created_at   timestamptz DEFAULT now()
);

-- 2. New columns on stores
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS company_id uuid    REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS password   text;

-- 3. New columns on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company_id uuid    REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active     boolean DEFAULT true;

-- 4. Widen the role column (drop any existing check constraint first)
--    Only needed if your table has a CHECK on role values.
--    Comment out if not applicable.
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE profiles
--   ADD CONSTRAINT profiles_role_check
--   CHECK (role IN (
--     'super_admin','franchise_owner','director','area_supervisor','gm',
--     'store','manager','worker','admin'
--   ));

-- 5. Helpful indexes
CREATE INDEX IF NOT EXISTS stores_company_id_idx   ON stores(company_id);
CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON profiles(company_id);
