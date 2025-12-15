-- Migration 009: Create bill_entry_lines table
-- This table depends on bill_entries, chart_of_accounts, and profit_centers tables

CREATE TABLE IF NOT EXISTS public.bill_entry_lines (
    id BIGSERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    bill_entry_id uuid NOT NULL REFERENCES public.bill_entries(id) ON DELETE CASCADE,
    account_uuid uuid NOT NULL REFERENCES public.chart_of_accounts(uuid) ON DELETE RESTRICT,
    profit_center_uuid uuid REFERENCES public.profit_centers(id) ON DELETE SET NULL,
    description text,
    amount numeric(12,2) NOT NULL
);

-- Create indexes for bill_entry_lines table
CREATE INDEX IF NOT EXISTS idx_bill_entry_lines_bill_entry_id ON public.bill_entry_lines(bill_entry_id);
CREATE INDEX IF NOT EXISTS idx_bill_entry_lines_account_uuid ON public.bill_entry_lines(account_uuid);
CREATE INDEX IF NOT EXISTS idx_bill_entry_lines_profit_center_uuid ON public.bill_entry_lines(profit_center_uuid);

-- Enable RLS
ALTER TABLE public.bill_entry_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view bill entry lines for their corporations" ON public.bill_entry_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bill_entries be
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE be.id = bill_entry_id 
      AND up.corporation_access @> ARRAY[be.corporation_uuid]
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bill_entry_lines_updated_at ON public.bill_entry_lines;
CREATE TRIGGER update_bill_entry_lines_updated_at 
    BEFORE UPDATE ON public.bill_entry_lines 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
