-- Migration 004: Create default_chart_of_accounts table
-- This table has no dependencies

CREATE TABLE IF NOT EXISTS public.default_chart_of_accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
    sub_category VARCHAR(100),
    description TEXT,
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
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for default_chart_of_accounts table
CREATE INDEX IF NOT EXISTS idx_default_chart_of_accounts_code ON public.default_chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_default_chart_of_accounts_account_type ON public.default_chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_default_chart_of_accounts_bank_account_number ON public.default_chart_of_accounts(bank_account_number) WHERE bank_account_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_default_chart_of_accounts_box_1099 ON public.default_chart_of_accounts(box_1099) WHERE box_1099 IS NOT NULL;

-- Enable RLS
ALTER TABLE public.default_chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all users to read default chart of accounts" ON public.default_chart_of_accounts
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (true);

CREATE POLICY "Allow service role to modify default chart of accounts" ON public.default_chart_of_accounts
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_default_chart_of_accounts_updated_at ON public.default_chart_of_accounts;
CREATE TRIGGER update_default_chart_of_accounts_updated_at 
    BEFORE UPDATE ON public.default_chart_of_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the columns
COMMENT ON COLUMN public.default_chart_of_accounts.bank_account_number IS 'Bank account number associated with this default chart of account (optional)';
COMMENT ON COLUMN public.default_chart_of_accounts.box_1099 IS '1099 tax form box classification for this default account (optional)';

-- Seed: default chart of accounts (idempotent)
INSERT INTO public.default_chart_of_accounts (code, account_name, account_type, sub_category, description, bank_account_number, box_1099) VALUES

-- ASSETS
('1000', 'CASH AND CASH EQUIVALENTS', 'Asset', 'Current Asset', 'All cash accounts including petty cash and bank accounts', NULL, 'Not Applicable'),
('1100', 'Cash & Bank', 'Asset', 'Current Asset', 'Main operating cash account', NULL, 'Not Applicable'),
('1110', 'Petty Cash', 'Asset', 'Current Asset', 'Small cash fund for minor expenses', NULL, 'Not Applicable'),
('1120', 'Cash - Front Desk', 'Asset', 'Current Asset', 'Cash drawer at front desk', NULL, 'Not Applicable'),
('1200', 'ACCOUNTS RECEIVABLE', 'Asset', 'Current Asset', 'Amounts owed by customers and guests', NULL, 'Not Applicable'),
('1210', 'A/R - Corporate Clients', 'Asset', 'Sub-AR', 'Outstanding invoices from corporate accounts', NULL, 'Not Applicable'),
('1220', 'A/R - Travel Agencies', 'Asset', 'Sub-AR', 'Commissions and agency settlements', NULL, 'Not Applicable'),
('1230', 'A/R - Individual Guests', 'Asset', 'Sub-AR', 'Outstanding guest charges', NULL, 'Not Applicable'),
('1300', 'INVENTORY', 'Asset', 'Current Asset', 'Total inventory across all departments', NULL, 'Not Applicable'),
('1310', 'Inventory - F&B', 'Asset', 'Sub-Inventory', 'Food, beverages, and restaurant supplies', NULL, 'Not Applicable'),
('1320', 'Inventory - Housekeeping', 'Asset', 'Sub-Inventory', 'Toiletries, linens, and cleaning supplies', NULL, 'Not Applicable'),
('1330', 'Inventory - Maintenance', 'Asset', 'Sub-Inventory', 'Maintenance supplies and tools', NULL, 'Not Applicable'),
('1400', 'PREPAID EXPENSES', 'Asset', 'Current Asset', 'Expenses paid in advance', NULL, 'Not Applicable'),
('1410', 'Prepaid Insurance', 'Asset', 'Sub-Prepaid', 'Insurance premiums paid in advance', NULL, 'Not Applicable'),
('1420', 'Prepaid Rent', 'Asset', 'Sub-Prepaid', 'Rent paid in advance', NULL, 'Not Applicable'),
('1500', 'FIXED ASSETS', 'Asset', 'Fixed Asset', 'Property, plant, and equipment', NULL, 'Not Applicable'),
('1510', 'Land', 'Asset', 'Fixed Asset', 'Land and land improvements', NULL, 'Not Applicable'),
('1520', 'Buildings', 'Asset', 'Fixed Asset', 'Hotel buildings and structures', NULL, 'Not Applicable'),
('1530', 'Furniture & Fixtures', 'Asset', 'Fixed Asset', 'Guest room and public area furniture', NULL, 'Not Applicable'),
('1540', 'Equipment', 'Asset', 'Fixed Asset', 'Kitchen, maintenance, and office equipment', NULL, 'Not Applicable'),
('1550', 'Vehicles', 'Asset', 'Fixed Asset', 'Hotel vehicles and transportation', NULL, 'Not Applicable'),
('1600', 'ACCUMULATED DEPRECIATION', 'Asset', 'Contra Asset', 'Accumulated depreciation on fixed assets', NULL, 'Not Applicable'),
('1610', 'Accumulated Depreciation - Buildings', 'Asset', 'Contra Asset', 'Depreciation on buildings', NULL, 'Not Applicable'),
('1620', 'Accumulated Depreciation - Equipment', 'Asset', 'Contra Asset', 'Depreciation on equipment', NULL, 'Not Applicable'),

-- LIABILITIES
('2000', 'CURRENT LIABILITIES', 'Liability', 'Current', 'Obligations due within one year', NULL, 'Not Applicable'),
('2100', 'Accounts Payable', 'Liability', 'Current', 'Amounts owed to vendors and suppliers', NULL, 'Not Applicable'),
('2110', 'AP - Food Vendors', 'Liability', 'Sub-AP', 'Suppliers for food and beverage', NULL, 'Not Applicable'),
('2120', 'AP - Maintenance Contractors', 'Liability', 'Sub-AP', 'Vendors for repairs and maintenance', NULL, 'Not Applicable'),
('2130', 'AP - Utilities', 'Liability', 'Sub-AP', 'Utility companies', NULL, 'Not Applicable'),
('2200', 'Accrued Liabilities', 'Liability', 'Current', 'Expenses incurred but not yet paid', NULL, 'Not Applicable'),
('2210', 'Accrued Payroll', 'Liability', 'Sub-Accrued', 'Salaries and wages payable', NULL, 'Not Applicable'),
('2220', 'Accrued Vacation', 'Liability', 'Sub-Accrued', 'Accrued vacation pay', NULL, 'Not Applicable'),
('2230', 'Accrued Interest', 'Liability', 'Sub-Accrued', 'Interest payable on loans', NULL, 'Not Applicable'),
('2300', 'GUEST DEPOSITS', 'Liability', 'Current', 'Advance payments from guests', NULL, 'Not Applicable'),
('2400', 'CURRENT PORTION OF LONG-TERM DEBT', 'Liability', 'Current', 'Principal payments due within one year', NULL, 'Not Applicable'),
('2500', 'LONG-TERM LIABILITIES', 'Liability', 'Long-term', 'Obligations due beyond one year', NULL, 'Not Applicable'),
('2510', 'Mortgage Payable', 'Liability', 'Long-term', 'Long-term mortgage debt', NULL, 'Not Applicable'),
('2520', 'Equipment Loans', 'Liability', 'Long-term', 'Loans for equipment purchases', NULL, 'Not Applicable'),

-- EQUITY
('3000', 'OWNER EQUITY', 'Equity', 'Equity', 'Owner investment and retained earnings', NULL, 'Not Applicable'),
('3100', 'Owner Capital', 'Equity', 'Equity', 'Owner contributions to the business', NULL, 'Not Applicable'),
('3200', 'Retained Earnings', 'Equity', 'Equity', 'Accumulated profits retained in the business', NULL, 'Not Applicable'),
('3300', 'Current Year Earnings', 'Equity', 'Equity', 'Current year profit or loss', NULL, 'Not Applicable'),

-- REVENUE
('4000', 'ROOM REVENUE', 'Revenue', 'Operating', 'Revenue from room sales', NULL, 'Box 1: Rents (MISC)'),
('4100', 'Room Revenue', 'Revenue', 'Operating', 'Total room revenue', NULL, 'Box 1: Rents (MISC)'),
('4110', 'Room Revenue - Corporate', 'Revenue', 'Sub-Rooms', 'Billed to corporate accounts', NULL, 'Box 1: Rents (MISC)'),
('4120', 'Room Revenue - Leisure/OTA', 'Revenue', 'Sub-Rooms', 'Bookings via online travel agencies', NULL, 'Box 1: Rents (MISC)'),
('4130', 'Room Revenue - Direct', 'Revenue', 'Sub-Rooms', 'Direct bookings and walk-ins', NULL, 'Box 1: Rents (MISC)'),
('4200', 'FOOD & BEVERAGE REVENUE', 'Revenue', 'Operating', 'Restaurant and bar sales', NULL, 'Not Applicable'),
('4210', 'Restaurant Revenue', 'Revenue', 'Sub-F&B', 'Dining room sales', NULL, 'Not Applicable'),
('4220', 'Banquet & Catering Revenue', 'Revenue', 'Sub-F&B', 'Events and conference catering', NULL, 'Not Applicable'),
('4230', 'Bar Revenue', 'Revenue', 'Sub-F&B', 'Beverage sales', NULL, 'Not Applicable'),
('4300', 'OTHER REVENUE', 'Revenue', 'Operating', 'Miscellaneous revenue sources', NULL, 'Box 3: Other Income (MISC)'),
('4310', 'Spa Revenue', 'Revenue', 'Sub-Other', 'Spa and wellness services', NULL, 'Box 3: Other Income (MISC)'),
('4320', 'Gift Shop Revenue', 'Revenue', 'Sub-Other', 'Retail sales', NULL, 'Not Applicable'),
('4330', 'Parking Revenue', 'Revenue', 'Sub-Other', 'Valet and self-parking fees', NULL, 'Box 3: Other Income (MISC)'),
('4340', 'Internet Revenue', 'Revenue', 'Sub-Other', 'WiFi and internet services', NULL, 'Box 3: Other Income (MISC)'),

-- EXPENSES
('5000', 'DIRECT OPERATING EXPENSES', 'Expense', 'Direct Cost', 'Expenses directly related to operations', NULL, 'Not Applicable'),
('5100', 'Payroll & Related Expenses', 'Expense', 'Direct Cost', 'All employee compensation', NULL, 'Not Applicable'),
('5110', 'Payroll - Housekeeping', 'Expense', 'Sub-Payroll', 'Housekeeping department wages', NULL, 'Not Applicable'),
('5120', 'Payroll - Front Desk', 'Expense', 'Sub-Payroll', 'Front desk and reception wages', NULL, 'Not Applicable'),
('5130', 'Payroll - F&B', 'Expense', 'Sub-Payroll', 'Food and beverage staff wages', NULL, 'Not Applicable'),
('5140', 'Payroll - Maintenance', 'Expense', 'Sub-Payroll', 'Maintenance department wages', NULL, 'Not Applicable'),
('5150', 'Payroll - Management', 'Expense', 'Sub-Payroll', 'Management salaries', NULL, 'Not Applicable'),
('5160', 'Payroll Taxes', 'Expense', 'Sub-Payroll', 'Employer payroll taxes', NULL, 'Not Applicable'),
('5170', 'Employee Benefits', 'Expense', 'Sub-Payroll', 'Health insurance and benefits', NULL, 'Not Applicable'),
('5200', 'Cost of Sales - F&B', 'Expense', 'Direct Cost', 'Food and beverage cost of goods sold', NULL, 'Not Applicable'),
('5210', 'Food Cost', 'Expense', 'Sub-COGS', 'Raw food costs', NULL, 'Not Applicable'),
('5220', 'Beverage Cost', 'Expense', 'Sub-COGS', 'Alcohol and beverage costs', NULL, 'Not Applicable'),
('5300', 'UTILITIES', 'Expense', 'Overhead', 'Utility expenses', NULL, 'Not Applicable'),
('5310', 'Electricity', 'Expense', 'Sub-Utility', 'Electric power costs', NULL, 'Not Applicable'),
('5320', 'Water & Sewage', 'Expense', 'Sub-Utility', 'Water and sewer costs', NULL, 'Not Applicable'),
('5330', 'Gas', 'Expense', 'Sub-Utility', 'Natural gas costs', NULL, 'Not Applicable'),
('5340', 'Internet & Phone', 'Expense', 'Sub-Utility', 'Telecommunications', NULL, 'Not Applicable'),
('5400', 'MAINTENANCE & REPAIRS', 'Expense', 'Overhead', 'Property maintenance costs', NULL, 'Box 1: Nonemployee Compensation (NEC)'),
('5410', 'Building Maintenance', 'Expense', 'Sub-Maintenance', 'Structural maintenance', NULL, 'Box 1: Nonemployee Compensation (NEC)'),
('5420', 'Equipment Maintenance', 'Expense', 'Sub-Maintenance', 'Equipment repairs', NULL, 'Box 1: Nonemployee Compensation (NEC)'),
('5430', 'Landscaping', 'Expense', 'Sub-Maintenance', 'Grounds keeping', NULL, 'Box 1: Nonemployee Compensation (NEC)'),
('5500', 'MARKETING & ADVERTISING', 'Expense', 'Overhead', 'Promotional activities', NULL, 'Not Applicable'),
('5510', 'Online Advertising', 'Expense', 'Sub-Marketing', 'Digital marketing costs', NULL, 'Not Applicable'),
('5520', 'Print Advertising', 'Expense', 'Sub-Marketing', 'Traditional advertising', NULL, 'Not Applicable'),
('5530', 'Website & SEO', 'Expense', 'Sub-Marketing', 'Website maintenance and SEO', NULL, 'Not Applicable'),
('5600', 'INSURANCE', 'Expense', 'Overhead', 'Insurance premiums', NULL, 'Not Applicable'),
('5610', 'Property Insurance', 'Expense', 'Sub-Insurance', 'Building and contents insurance', NULL, 'Not Applicable'),
('5620', 'Liability Insurance', 'Expense', 'Sub-Insurance', 'General liability coverage', NULL, 'Not Applicable'),
('5630', 'Workers Compensation', 'Expense', 'Sub-Insurance', 'Employee injury insurance', NULL, 'Not Applicable'),
('5700', 'PROFESSIONAL SERVICES', 'Expense', 'Overhead', 'Legal, accounting, and consulting', NULL, 'Box 1: Nonemployee Compensation (NEC)'),
('5710', 'Legal Fees', 'Expense', 'Sub-Professional', 'Attorney and legal costs', NULL, 'Box 10: Gross proceeds paid to an attorney (MISC)'),
('5720', 'Accounting Fees', 'Expense', 'Sub-Professional', 'Bookkeeping and tax preparation', NULL, 'Box 1: Nonemployee Compensation (NEC)'),
('5730', 'Consulting Fees', 'Expense', 'Sub-Professional', 'Business consulting', NULL, 'Box 1: Nonemployee Compensation (NEC)'),
('5800', 'ADMINISTRATIVE EXPENSES', 'Expense', 'Overhead', 'General administrative costs', NULL, 'Not Applicable'),
('5810', 'Office Supplies', 'Expense', 'Sub-Admin', 'Office materials and supplies', NULL, 'Not Applicable'),
('5820', 'Software & Technology', 'Expense', 'Sub-Admin', 'Software licenses and IT costs', NULL, 'Not Applicable'),
('5830', 'Bank Fees', 'Expense', 'Sub-Admin', 'Banking and credit card fees', NULL, 'Not Applicable'),
('5900', 'DEPRECIATION', 'Expense', 'Overhead', 'Depreciation on fixed assets', NULL, 'Not Applicable'),
('5910', 'Depreciation - Buildings', 'Expense', 'Sub-Depreciation', 'Building depreciation', NULL, 'Not Applicable'),
('5920', 'Depreciation - Equipment', 'Expense', 'Sub-Depreciation', 'Equipment depreciation', NULL, 'Not Applicable')
ON CONFLICT (code) DO NOTHING;
