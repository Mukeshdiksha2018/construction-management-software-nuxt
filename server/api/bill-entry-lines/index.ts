import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch bill entry lines for a specific bill entry
      const { bill_entry_uuid } = query;

      if (!bill_entry_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "bill_entry_uuid is required",
        });
      }

      const { data, error } = await supabaseServer
        .from("bill_entry_lines")
        .select(
          `
          *,
          chart_of_accounts!inner(
            uuid,
            code,
            account_name,
            account_type,
            sub_category
          ),
        `
        )
        .eq("bill_entry_uuid", bill_entry_uuid)
        .order("created_at", { ascending: true });

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
      // Create a new bill entry line
      const { bill_entry_uuid, account_uuid, description, amount } = body;

      // Validate required fields
      if (!bill_entry_uuid || !account_uuid || !amount) {
        throw createError({
          statusCode: 400,
          statusMessage: "Missing required fields: bill_entry_uuid, account_uuid, and amount are required",
        });
      }

      const { data: billEntryLine, error: billEntryLineError } =
        await supabaseServer
          .from("bill_entry_lines")
          .insert([
            {
              bill_entry_uuid,
              account_uuid,
              description,
              amount: parseFloat(amount),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select(
            `
          *,
          chart_of_accounts!inner(
            uuid,
            code,
            account_name,
            account_type,
            sub_category
          ),
        `
          )
          .single();

      if (billEntryLineError) {
        console.error("Error creating bill entry line:", billEntryLineError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating bill entry line: " + billEntryLineError.message,
        });
      }

      return { data: billEntryLine };
    }

    if (method === "PUT") {
      // Update bill entry line
      const { id, ...updatedFields } = body;

      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: "Missing required field: id",
        });
      }

      const { data: billEntryLine, error: billEntryLineError } =
        await supabaseServer
          .from("bill_entry_lines")
          .update({
            ...updatedFields,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select(
            `
          *,
          chart_of_accounts!inner(
            uuid,
            code,
            account_name,
            account_type,
            sub_category
          ),
        `
          )
          .single();

      if (billEntryLineError) {
        console.error("Error updating bill entry line:", billEntryLineError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating bill entry line: " + billEntryLineError.message,
        });
      }

      return { data: billEntryLine };
    }

    if (method === "DELETE") {
      // Delete bill entry line
      const { id } = query;

      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: "Missing required field: id",
        });
      }

      const { error: billEntryLineError } = await supabaseServer
        .from("bill_entry_lines")
        .delete()
        .eq("id", id);

      if (billEntryLineError) {
        console.error("Error deleting bill entry line:", billEntryLineError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting bill entry line: " + billEntryLineError.message,
        });
      }

      return { success: true };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Bill entry lines API error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
