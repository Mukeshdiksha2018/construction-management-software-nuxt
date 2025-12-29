import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);

  if (method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  const { purchase_order_uuid, currentInvoiceUuid } = query;

  if (!purchase_order_uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "purchase_order_uuid is required",
    });
  }

  try {
    // Fetch the purchase order to get total amount
    // Total is stored in financial_breakdown JSON column
    const { data: poData, error: poError } = await supabaseServer
      .from("purchase_order_forms")
      .select("uuid, financial_breakdown")
      .eq("uuid", purchase_order_uuid as string)
      .maybeSingle();

    if (poError) {
      console.error("Error fetching PO:", poError);
      throw createError({
        statusCode: 500,
        statusMessage: "Database error: " + poError.message,
      });
    }

    if (!poData) {
      throw createError({
        statusCode: 404,
        statusMessage: "Purchase order not found",
      });
    }

    // Extract total_po_amount from financial_breakdown JSON
    let totalPOValue = 0;
    if (poData.financial_breakdown) {
      try {
        const breakdown = typeof poData.financial_breakdown === 'string' 
          ? JSON.parse(poData.financial_breakdown) 
          : poData.financial_breakdown;
        const totals = breakdown?.totals || {};
        totalPOValue = parseFloat(totals.total_po_amount || totals.totalAmount || totals.total || "0") || 0;
      } catch (parseError) {
        console.error("Error parsing financial_breakdown:", parseError);
        totalPOValue = 0;
      }
    }

    // Calculate advance payment made (sum of invoice amounts where invoice_type is AGAINST_ADVANCE_PAYMENT and status is Paid)
    // Only count advance payments that are in "Paid" status
    // Use financial_breakdown to get amount without taxes (item_total + charges_total, excluding tax_total)
    const { data: advanceInvoices, error: advanceInvoicesError } = await supabaseServer
      .from("vendor_invoices")
      .select("amount, financial_breakdown")
      .eq("purchase_order_uuid", purchase_order_uuid as string)
      .eq("invoice_type", "AGAINST_ADVANCE_PAYMENT")
      .eq("status", "Paid")
      .eq("is_active", true);

    if (advanceInvoicesError) {
      console.error("Error fetching advance payment invoices:", advanceInvoicesError);
    }

    const advancePaid =
      advanceInvoices?.reduce((sum, invoice) => {
        // Calculate amount without taxes: totalAmount - taxTotal
        // This matches the logic in AdvancePaymentBreakdownTable.getAmountWithoutTaxes
        const totalAmount = parseFloat(invoice.amount || "0") || 0;
        
        let taxTotal = 0;
        if (invoice.financial_breakdown) {
          try {
            let breakdown = invoice.financial_breakdown;
            
            // Parse if it's a string
            if (typeof breakdown === 'string') {
              try {
                breakdown = JSON.parse(breakdown);
              } catch (parseError) {
                // If parsing fails, use 0 for tax
              }
            }

            // Handle both nested structure and flattened structure
            const totals = breakdown?.totals || breakdown || {};
            
            // Calculate total tax from sales taxes if available
            if (breakdown?.sales_taxes) {
              const salesTaxes = breakdown.sales_taxes;
              const tax1 = parseFloat(salesTaxes.sales_tax_1?.amount || salesTaxes.salesTax1?.amount || '0') || 0;
              const tax2 = parseFloat(salesTaxes.sales_tax_2?.amount || salesTaxes.salesTax2?.amount || '0') || 0;
              taxTotal = tax1 + tax2;
            } else {
              // Fallback to totals.tax_total
              taxTotal = parseFloat(totals.tax_total || totals.taxTotal || '0') || 0;
            }
          } catch (error) {
            // If there's an error, use 0 for tax
            taxTotal = 0;
          }
        }
        
        // Return amount without taxes
        return sum + (totalAmount - taxTotal);
      }, 0) || 0;

    // Calculate invoiced value (sum of vendor_invoices where purchase_order_uuid matches, invoice_type is AGAINST_PO, and status is Paid)
    const { data: invoices, error: invoicesError } = await supabaseServer
      .from("vendor_invoices")
      .select("amount")
      .eq("purchase_order_uuid", purchase_order_uuid as string)
      .eq("invoice_type", "AGAINST_PO")
      .eq("status", "Paid")
      .eq("is_active", true);

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
    }

    const invoicedValue =
      invoices?.reduce(
        (sum, invoice) => sum + (parseFloat(invoice.amount || "0") || 0),
        0
      ) || 0;

    // Calculate balance to be invoiced (Total PO Value - Advance Paid - Invoiced Value)
    // This shows how much of the PO value is still left to be invoiced
    const balanceToBeInvoiced = Math.max(0, totalPOValue - advancePaid - invoicedValue);

    return {
      data: {
        purchase_order_uuid: purchase_order_uuid as string,
        total_po_value: totalPOValue,
        advance_paid: advancePaid,
        invoiced_value: invoicedValue,
        balance_to_be_invoiced: balanceToBeInvoiced,
      },
    };
  } catch (error: any) {
    console.error("API Error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

