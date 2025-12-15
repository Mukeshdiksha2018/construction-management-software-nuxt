-- Normalize existing statuses prior to tightening constraint
UPDATE public.estimates
SET status = CASE
  WHEN status IN ('Pending', 'Rejected', 'Expired') THEN 'Draft'
  WHEN status = 'Approved' THEN 'Approved'
  ELSE status
END;

-- Drop existing status constraint if it exists
ALTER TABLE public.estimates
DROP CONSTRAINT IF EXISTS estimates_status_check;

-- Add new constraint allowing only Draft, Ready, Approved
ALTER TABLE public.estimates
ADD CONSTRAINT estimates_status_check
CHECK (status IN ('Draft', 'Ready', 'Approved'));

