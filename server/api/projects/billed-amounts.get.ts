import { supabaseServer } from '@/utils/supabaseServer';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const corporationUuid = query.corporation_uuid as string;

  if (!corporationUuid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'corporation_uuid is required',
    });
  }

  const supabase = supabaseServer;

  try {
    // Aggregate paid invoice amounts by project using a single efficient query
    // This query sums the amount for all paid, active invoices grouped by project
    // Note: is_active !== false means we include true, null, and undefined (anything not explicitly false)
    // We select amount and financial_breakdown to get the total_invoice_amount if available
    const { data, error } = await supabase
      .from('vendor_invoices')
      .select('project_uuid, amount, financial_breakdown')
      .eq('corporation_uuid', corporationUuid)
      .eq('status', 'Paid')
      .neq('is_active', false)
      .not('project_uuid', 'is', null);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message || 'Failed to fetch billed amounts',
      });
    }

    // Aggregate amounts by project_uuid
    const billedAmounts: Record<string, number> = {};
    
    if (data && Array.isArray(data)) {
      data.forEach((invoice: any) => {
        if (invoice.project_uuid) {
          // Use total_invoice_amount from financial_breakdown if available, otherwise use amount
          let amount = parseFloat(invoice.amount || '0') || 0;
          
          // Check if financial_breakdown has total_invoice_amount
          if (invoice.financial_breakdown && typeof invoice.financial_breakdown === 'object') {
            const breakdown = invoice.financial_breakdown;
            if (breakdown.totals && breakdown.totals.total_invoice_amount !== undefined) {
              amount = parseFloat(breakdown.totals.total_invoice_amount || '0') || 0;
            } else if (breakdown.total_invoice_amount !== undefined) {
              amount = parseFloat(breakdown.total_invoice_amount || '0') || 0;
            }
          }
          
          billedAmounts[invoice.project_uuid] = (billedAmounts[invoice.project_uuid] || 0) + amount;
        }
      });
    }

    return {
      data: billedAmounts,
      error: null,
    };
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to fetch billed amounts',
    });
  }
});

