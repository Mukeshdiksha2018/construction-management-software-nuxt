/**
 * Sample Chart of Accounts data for CSV download template
 * This data represents a standard hotel industry chart of accounts structure
 */

export const sampleChartOfAccountsData = [
  ['Account Code', 'Account Name', 'Account Type', 'Category', 'Sub-Category', 'Opening Balance', 'Description', 'Bank Account Number', '1099 Box'],
  
  // Bank Accounts - Assets
  ['10010', 'Auction Funds', 'Asset', '', 'Current Asset', '20000.00', 'Auction funds account', '1234567890', 'Not Applicable'],
  ['10020', 'WEBSTER BANK', 'Asset', '', 'Current Asset', '0.00', 'Webster Bank main account', '9876543210', 'Not Applicable'],
  ['10025', 'WB-0235 Wagner Hospitality', 'Asset', 'WEBSTER BANK', 'Current Asset', '0.00', 'Webster Bank sub-account', '', 'Not Applicable'],
  ['10030', 'ROCKLAND BANK', 'Asset', '', 'Current Asset', '0.00', 'Rockland Bank main account', '5551234567', 'Not Applicable'],
  ['10031', 'RT-0655 Cape Cod Hotels', 'Asset', 'ROCKLAND BANK', 'Current Asset', '3715.12', 'Rockland Bank sub-account', '', 'Not Applicable'],
  
  // Other Current Assets
  ['11000', 'Account Receivables', 'Asset', '', 'Current Asset', '0.00', 'Main AR account', '', 'Not Applicable'],
  ['11250', 'Guest Ledger', 'Asset', '', 'Current Asset', '0.00', 'Guest receivables', '', 'Not Applicable'],
  ['11300', 'City Ledger', 'Asset', '', 'Current Asset', '0.00', 'City ledger receivables', '', 'Not Applicable'],
  ['12050', 'Food Inventory', 'Asset', '', 'Current Asset', '0.00', 'Food inventory', '', 'Not Applicable'],
  ['12100', 'Beverage Inventory', 'Asset', '', 'Current Asset', '0.00', 'Beverage inventory', '', 'Not Applicable'],
  
  // Fixed Assets
  ['15050', 'Land', 'Asset', '', 'Fixed Asset', '0.00', 'Land and property', '', 'Not Applicable'],
  ['15100', 'Buildings', 'Asset', '', 'Fixed Asset', '0.00', 'Building structures', '', 'Not Applicable'],
  ['15200', 'Furniture, Fixtures & Equipment', 'Asset', '', 'Fixed Asset', '0.00', 'FF&E', '', 'Not Applicable'],
  ['15750', 'Accumulated Depreciation', 'Asset', '', 'Contra Asset', '-50000.00', 'Total accumulated depreciation', '', 'Not Applicable'],
  ['15751', 'Accumulated Depreciation', 'Asset', 'Buildings', 'Contra Asset', '0.00', 'Building depreciation', '', 'Not Applicable'],
  
  // Liabilities
  ['20000', 'Account Payables', 'Liability', '', 'Current Liability', '0.00', 'Main AP account', '', 'Not Applicable'],
  ['20150', 'American Express', 'Liability', '', 'Current Liability', '0.00', 'Amex card liability', '', 'Not Applicable'],
  ['21000', 'Accrued Sales Tax', 'Liability', 'Accrued Expense', 'Current Liability', '0.00', 'Sales tax payable', '', 'Not Applicable'],
  ['21100', 'Accrued Use Tax', 'Liability', 'Accrued Expense', 'Current Liability', '0.00', 'Use tax payable', '', 'Not Applicable'],
  ['25000', 'Mortgage Payable', 'Liability', '', 'Long-term Liability', '0.00', 'Long-term mortgage', '', 'Not Applicable'],
  
  // Equity
  ['26000', 'Opening Bal Equity', 'Equity', '', '', '0.00', 'Opening balance equity', '', 'Not Applicable'],
  ['30000', 'Capital Contributions', 'Equity', '', '', '0.00', 'Owner capital contributions', '', 'Not Applicable'],
  ['30250', 'Retained Earning', 'Equity', '', '', '0.00', 'Retained earnings', '', 'Not Applicable'],
  
  // Income/Revenue
  ['40000', 'Transient', 'Revenue', '', 'Operating Revenue', '0.00', 'Transient room revenue', '', 'Box 1: Rents (MISC)'],
  ['40005', 'Transient - Retail', 'Revenue', 'Transient', 'Operating Revenue', '0.00', 'Retail transient revenue', '', 'Not Applicable'],
  ['50600', 'Banquet Food Revenue', 'Revenue', '', 'Operating Revenue', '0.00', 'Banquet food sales', '', 'Not Applicable'],
  ['60010', 'Restaurant One Food Revenue', 'Revenue', '', 'Operating Revenue', '0.00', 'Restaurant food sales', '', 'Not Applicable'],
  
  // Expenses
  ['42000', 'Room Payroll Expense', 'Expense', '', 'Operating Expense', '0.00', 'Room department payroll', '', 'Box 1: Nonemployee Compensation (NEC)'],
  ['42191', 'Wages & Salaries', 'Expense', 'Non-Management', 'Operating Expense', '0.00', 'Employee wages', '', 'Box 1: Nonemployee Compensation (NEC)'],
  ['43010', 'Other Expenses Rooms', 'Expense', '', 'Operating Expense', '0.00', 'Other room expenses', '', 'Not Applicable'],
  ['51000', 'Banquet Cost of Sales', 'Expense', '', 'Cost of Goods Sold', '0.00', 'Banquet COGS', '', 'Not Applicable'],
  ['61100', 'Cost of Food Sales', 'Expense', 'Restaurant One Cost of Sales', 'Cost of Goods Sold', '0.00', 'Restaurant food cost', '', 'Not Applicable']
];

