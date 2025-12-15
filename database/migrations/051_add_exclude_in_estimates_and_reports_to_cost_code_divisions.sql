-- Migration 051: Add exclude_in_estimates_and_reports column to cost_code_divisions table
-- Description: Adds a boolean column to exclude divisions from estimates and reports

-- Add the new column with default value false
ALTER TABLE public.cost_code_divisions
ADD COLUMN IF NOT EXISTS exclude_in_estimates_and_reports BOOLEAN DEFAULT false NOT NULL;

-- Create index for better query performance when filtering by this field
CREATE INDEX IF NOT EXISTS idx_cost_code_divisions_exclude_in_estimates_and_reports 
ON public.cost_code_divisions(exclude_in_estimates_and_reports);

-- Add comment for documentation
COMMENT ON COLUMN public.cost_code_divisions.exclude_in_estimates_and_reports IS 
'If true, this division will be excluded from estimates and reports';

