-- Migration 005: Create chart_of_accounts table
-- This table depends on properties table

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id BIGSERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
    parent_account VARCHAR(255),
    sub_category VARCHAR(100),
    notes TEXT,
    opening_balance DECIMAL(15,2) DEFAULT 0.00,
    is_active boolean DEFAULT true,
    is_header boolean DEFAULT false,
    bank_account_number VARCHAR(50),
    box_1099 VARCHAR(100) CHECK (
        box_1099 IS NULL OR box_1099 IN (
            'Not Applicable',
            'Box 1: Rents (MISC)',
            'Box 1: Nonemployee Compensation (NEC)',
            'Box 2: Royalties (MISC)',
            'Box 2: Direct Sales (NEC)',
            'Box 3: Other Income (MISC)',
            'Box 4: Federal income tax withheld (NEC)',
            'Box 4: Federal income tax withheld (MISC)',
            'Box 5: State tax withheld (NEC)',
            'Box 5: Fishing Boat Proceeds (MISC)',
            'Box 6: Medical and health care payments (MISC)',
            'Box 7: Direct Sales (MISC)',
            'Box 8: Substitute Payments (MISC)',
            'Box 9: Crop Insurance Proceeds (MISC) Clone to other Properties ?',
            'Box 9: Crop Insurance Proceeds (MISC)',
            'Box 10: Gross proceeds paid to an attorney (MISC)',
            'Box 13: Excess golden parachute payments (MISC)',
            'Box 15: State tax withheld (MISC)'
        )
    ),
    UNIQUE(corporation_uuid, code)
);

-- Create indexes for chart_of_accounts table
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_corporation_uuid ON public.chart_of_accounts(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_account_type ON public.chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_account ON public.chart_of_accounts(parent_account);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON public.chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_is_active ON public.chart_of_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_is_header ON public.chart_of_accounts(is_header);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_opening_balance ON public.chart_of_accounts(opening_balance);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_bank_account_number ON public.chart_of_accounts(bank_account_number) WHERE bank_account_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_box_1099 ON public.chart_of_accounts(box_1099) WHERE box_1099 IS NOT NULL;

-- Enable RLS
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view chart of accounts for their corporations" ON public.chart_of_accounts
  FOR SELECT USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_chart_of_accounts_updated_at ON public.chart_of_accounts;
CREATE TRIGGER update_chart_of_accounts_updated_at 
    BEFORE UPDATE ON public.chart_of_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the columns
COMMENT ON COLUMN public.chart_of_accounts.bank_account_number IS 'Bank account number associated with this chart of account (optional)';
COMMENT ON COLUMN public.chart_of_accounts.box_1099 IS '1099 tax form box classification for this account (optional)';
