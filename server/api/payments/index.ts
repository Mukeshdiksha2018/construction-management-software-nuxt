import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch payments for a specific corporation
      const { corporation_uuid, vendor_uuid, bill_entry_uuid } = query;

      if (!corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      }

      let query_builder = supabaseServer
        .from("payments")
        .select(`
          *,
          vendors!inner(
            uuid,
            vendor_name,
            vendor_type
          ),
          bill_entries(
            id,
            number,
            amount,
            bill_date
          )
        `)
        .eq("corporation_uuid", corporation_uuid);

      if (vendor_uuid) {
        query_builder = query_builder.eq("vendor_uuid", vendor_uuid);
      }

      if (bill_entry_uuid) {
        query_builder = query_builder.eq("bill_entry_uuid", bill_entry_uuid);
      }

      const { data, error } = await query_builder
        .order("payment_date", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { data: data || [] };
    }

    if (method === "POST") {
      // Create a new payment
      const {
        vendor_uuid,
        corporation_uuid,
        bill_entry_uuid,
        payment_date,
        payment_method,
        reference_number,
        amount,
        memo,
      } = body;

      // Validate required fields
      if (!vendor_uuid || !corporation_uuid || !payment_date || !payment_method || !amount) {
        throw createError({
          statusCode: 400,
          statusMessage: "Missing required fields: vendor_uuid, corporation_uuid, payment_date, payment_method, and amount are required",
        });
      }

      // Validate payment method
      const validPaymentMethods = ['CHECK', 'ACH', 'WIRE', 'CASH', 'CARD'];
      if (!validPaymentMethods.includes(payment_method)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid payment method. Must be one of: " + validPaymentMethods.join(', '),
        });
      }

      const { data: payment, error: paymentError } = await supabaseServer
        .from("payments")
        .insert([
          {
            vendor_uuid,
            corporation_uuid,
            bill_entry_uuid,
            payment_date,
            payment_method,
            reference_number,
            amount: parseFloat(amount),
            memo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select(`
          *,
          vendors!inner(
            uuid,
            vendor_name,
            vendor_type
          ),
          bill_entries(
            id,
            number,
            amount,
            bill_date
          )
        `)
        .single();

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating payment: " + paymentError.message,
        });
      }

      return { data: payment };
    }

    if (method === "PUT") {
      // Update payment
      const { id, ...updatedFields } = body;

      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: "Missing required field: id",
        });
      }

      const { data: payment, error: paymentError } = await supabaseServer
        .from("payments")
        .update({
          ...updatedFields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(`
          *,
          vendors!inner(
            uuid,
            vendor_name,
            vendor_type
          ),
          bill_entries(
            id,
            number,
            amount,
            bill_date
          )
        `)
        .single();

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating payment: " + paymentError.message,
        });
      }

      return { data: payment };
    }

    if (method === "DELETE") {
      // Delete payment
      const { id } = query;

      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: "Missing required field: id",
        });
      }

      const { error: paymentError } = await supabaseServer
        .from("payments")
        .delete()
        .eq("id", id);

      if (paymentError) {
        console.error("Error deleting payment:", paymentError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting payment: " + paymentError.message,
        });
      }

      return { success: true };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Payments API error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
