import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const corporationUuid = getRouterParam(event, 'corporationUuid')

  if (!corporationUuid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Corporation UUID is required'
    })
  }

  const supabase = supabaseServer

  try {
    if (method === 'GET') {
      // Get AP aging report for accounts with code '2100' (Accounts Payable)
      const { data: agingData, error } = await supabase
        .from("bill_entry_lines")
        .select(
          `
          id,
          amount,
          description,
          created_at,
          bill_entries!inner (
            id,
            bill_date,
            due_date,
            approval_status,
            vendors (
              vendor_name,
              contact_name,
              email,
              phone
            )
          ),
          chart_of_accounts!inner (
            id,
            code,
            account_name,
            account_type
          )
        `
        )
        .eq("bill_entries.corporation_uuid", corporationUuid)
        .eq("chart_of_accounts.code", "2100") // Accounts Payable
        .order("bill_entries.bill_date", { ascending: false });

      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: `Error fetching AP aging data: ${error.message}`,
        });
      }

      // Process the data to create aging buckets
      const today = new Date();
      const agingBuckets = {
        current: 0, // 0-30 days
        days31_60: 0, // 31-60 days
        days61_90: 0, // 61-90 days
        over90: 0, // Over 90 days
      };

      const vendorSummary: Record<
        string,
        {
          vendor_name: string;
          contact_name: string;
          email: string;
          phone: string;
          total_amount: number;
          current: number;
          days31_60: number;
          days61_90: number;
          over90: number;
          bills: any[];
        }
      > = {};

      agingData?.forEach((line) => {
        const bill = line.bill_entries;
        const vendor = bill.vendors;
        const dueDate = new Date(bill.due_date);
        const daysPastDue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const amount = parseFloat(line.amount) || 0;

        // Categorize by age
        if (daysPastDue <= 30) {
          agingBuckets.current += amount;
        } else if (daysPastDue <= 60) {
          agingBuckets.days31_60 += amount;
        } else if (daysPastDue <= 90) {
          agingBuckets.days61_90 += amount;
        } else {
          agingBuckets.over90 += amount;
        }

        // Group by vendor
        const vendorKey = vendor?.vendor_name || "Unknown Vendor";
        if (!vendorSummary[vendorKey]) {
          vendorSummary[vendorKey] = {
            vendor_name: vendor?.vendor_name || "Unknown Vendor",
            contact_name: vendor?.contact_name || "",
            email: vendor?.email || "",
            phone: vendor?.phone || "",
            total_amount: 0,
            current: 0,
            days31_60: 0,
            days61_90: 0,
            over90: 0,
            bills: [],
          };
        }

        vendorSummary[vendorKey].total_amount += amount;
        vendorSummary[vendorKey].bills.push({
          bill_id: bill.id,
          bill_date: bill.bill_date,
          due_date: bill.due_date,
          amount: amount,
          description: line.description,
          status: bill.approval_status,
        });

        if (daysPastDue <= 30) {
          vendorSummary[vendorKey].current += amount;
        } else if (daysPastDue <= 60) {
          vendorSummary[vendorKey].days31_60 += amount;
        } else if (daysPastDue <= 90) {
          vendorSummary[vendorKey].days61_90 += amount;
        } else {
          vendorSummary[vendorKey].over90 += amount;
        }
      });

      const totalAging =
        agingBuckets.current +
        agingBuckets.days31_60 +
        agingBuckets.days61_90 +
        agingBuckets.over90;

      return {
        success: true,
        data: {
          summary: {
            total_amount: totalAging,
            current: agingBuckets.current,
            days31_60: agingBuckets.days31_60,
            days61_90: agingBuckets.days61_90,
            over90: agingBuckets.over90,
          },
          vendors: Object.values(vendorSummary).sort(
            (a, b) => b.total_amount - a.total_amount
          ),
          generated_at: new Date().toISOString(),
        },
      };
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Server error: ${error.message}`
    })
  }
})
