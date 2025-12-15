-- Migration: Make UOM global (not corporation-specific)
-- Strategy:
-- 1) Relax corporation_uuid: drop NOT NULL and FK; keep column for backward compatibility
-- 2) Keep existing unique indexes (corporation-scoped) for legacy rows where corporation_uuid IS NOT NULL
-- 3) Add new partial unique indexes for global records where corporation_uuid IS NULL
-- 4) Simplify RLS: allow authenticated users to SELECT/INSERT/UPDATE/DELETE (consistent with ship_via)

BEGIN;

-- 1) Drop foreign key and NOT NULL on corporation_uuid (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'uom'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'corporation_uuid'
  ) THEN
    ALTER TABLE public.uom DROP CONSTRAINT IF EXISTS uom_corporation_uuid_fkey;
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- ignore
END $$;

-- Ensure column is nullable
ALTER TABLE public.uom ALTER COLUMN corporation_uuid DROP NOT NULL;

-- 2) Existing unique indexes (by corporation) are kept as-is
-- 3) Add partial unique indexes for global (corporation_uuid IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_uom_global_unique_name
  ON public.uom ((lower(uom_name)))
  WHERE corporation_uuid IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_uom_global_unique_short_name
  ON public.uom ((lower(short_name)))
  WHERE corporation_uuid IS NULL;

-- 4) Update RLS policies: drop old, add simple authenticated policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view UOM for their corporations" ON public.uom;
  DROP POLICY IF EXISTS "Users can insert UOM for their corporations" ON public.uom;
  DROP POLICY IF EXISTS "Users can update UOM for their corporations" ON public.uom;
  DROP POLICY IF EXISTS "Users can delete UOM for their corporations" ON public.uom;
EXCEPTION WHEN undefined_object THEN
  -- ignore
END $$;

ALTER TABLE public.uom ENABLE ROW LEVEL SECURITY;

-- Recreate simplified policies (drop-if-exists to be idempotent)
DROP POLICY IF EXISTS "Allow authenticated users to read UOM (global)" ON public.uom;
DROP POLICY IF EXISTS "Allow authenticated users to insert UOM (global)" ON public.uom;
DROP POLICY IF EXISTS "Allow authenticated users to update UOM (global)" ON public.uom;
DROP POLICY IF EXISTS "Allow authenticated users to delete UOM (global)" ON public.uom;

CREATE POLICY "Allow authenticated users to read UOM (global)"
  ON public.uom FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert UOM (global)"
  ON public.uom FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update UOM (global)"
  ON public.uom FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete UOM (global)"
  ON public.uom FOR DELETE TO authenticated USING (true);

COMMIT;


