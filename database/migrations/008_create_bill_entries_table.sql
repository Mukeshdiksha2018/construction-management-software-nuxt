-- Migration 008: Create bill_entries table
-- This table depends on properties and vendors tables

CREATE TABLE IF NOT EXISTS public.bill_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  books_date timestamp with time zone NOT NULL,
  bill_date timestamp with time zone NOT NULL,
  corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
  number text,
  vendor_uuid uuid REFERENCES public.vendors(uuid),
  payee_name text,
  account_number text,
  pay_method text NOT NULL,
  memo text,
  due_date timestamp with time zone,
  amount numeric(12,2) NOT NULL,
  approval_status text DEFAULT 'Pending',
  approved_by text,
  address text,
  credit_days text DEFAULT 'Net 10',
  check_memo text,
  ref_number text,
  void boolean DEFAULT false,
  hold_payment boolean DEFAULT false,
  line_items jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT check_vendor_reference CHECK (vendor_uuid IS NOT NULL OR payee_name IS NOT NULL)
);

-- Create indexes for bill_entries table
CREATE INDEX IF NOT EXISTS idx_bill_entries_corporation_uuid ON public.bill_entries(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_bill_entries_vendor_uuid ON public.bill_entries(vendor_uuid);
CREATE INDEX IF NOT EXISTS idx_bill_entries_books_date ON public.bill_entries(books_date);
CREATE INDEX IF NOT EXISTS idx_bill_entries_bill_date ON public.bill_entries(bill_date);
CREATE INDEX IF NOT EXISTS idx_bill_entries_due_date ON public.bill_entries(due_date);
CREATE INDEX IF NOT EXISTS idx_bill_entries_payee_name ON public.bill_entries(payee_name);
CREATE INDEX IF NOT EXISTS idx_bill_entries_approval_status ON public.bill_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_bill_entries_pay_method ON public.bill_entries(pay_method);
CREATE INDEX IF NOT EXISTS idx_bill_entries_void ON public.bill_entries(void);
CREATE INDEX IF NOT EXISTS idx_bill_entries_hold_payment ON public.bill_entries(hold_payment);
CREATE INDEX IF NOT EXISTS idx_bill_entries_ref_number ON public.bill_entries(ref_number);

-- Add comments to clarify UTC storage and new fields
COMMENT ON COLUMN public.bill_entries.books_date IS 'Books date stored in UTC timestamp with time zone';
COMMENT ON COLUMN public.bill_entries.bill_date IS 'Bill date stored in UTC timestamp with time zone';
COMMENT ON COLUMN public.bill_entries.due_date IS 'Due date stored in UTC timestamp with time zone';
COMMENT ON COLUMN public.bill_entries.address IS 'Vendor address for the bill';
COMMENT ON COLUMN public.bill_entries.credit_days IS 'Credit terms (e.g., Net 10, Net 30)';
COMMENT ON COLUMN public.bill_entries.check_memo IS 'Memo for check payments';
COMMENT ON COLUMN public.bill_entries.ref_number IS 'Reference number for the bill';
COMMENT ON COLUMN public.bill_entries.void IS 'Whether the bill is voided';
COMMENT ON COLUMN public.bill_entries.hold_payment IS 'Whether payment is on hold';

-- Enable RLS
ALTER TABLE public.bill_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view bill_entries for their corporations" ON public.bill_entries
    FOR SELECT USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bill_entries_updated_at ON public.bill_entries;
CREATE TRIGGER update_bill_entries_updated_at 
    BEFORE UPDATE ON public.bill_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
