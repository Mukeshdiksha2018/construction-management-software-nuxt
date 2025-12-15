import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  // Get user information from the request body (passed from frontend)
  const getUserInfo = () => {
    // User info should be passed in the request body from the frontend
    const { user_id, user_name, user_email, user_image_url } = body || {};

    if (!user_id) {
      console.warn("No user_id provided in request body");
      return null;
    }

    return {
      id: user_id,
      name: user_name || "Unknown User",
      email: user_email || "",
      image_url: user_image_url || null,
    };
  };

  try {
    if (method === "GET") {
      // Fetch bill entries for a specific corporation
      const { corporation_uuid, start_date, end_date } = query;

      if (!corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      }

      let query_builder = supabaseServer
        .from("bill_entries")
        .select(
          `
          *,
          bill_entry_lines(
            id,
            account_uuid,
            description,
            amount,
            chart_of_accounts(
              uuid,
              code,
              account_name,
              account_type,
              sub_category
            )
          )
        `
        )
        .eq("corporation_uuid", corporation_uuid);

      // Add date filtering if provided
      if (start_date && end_date) {
        // Dates are now stored as UTC timestamps, so we can query them directly
        query_builder = query_builder
          .gte("bill_date", start_date as string)
          .lte("bill_date", end_date as string);
      }

      const { data, error } = await query_builder.order("created_at", {
        ascending: false,
      });

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
      // Create a new bill entry
      const {
        type,
        books_date,
        bill_date,
        corporation_uuid,
        number,
        payee_name,
        vendor_uuid,
        account_number,
        pay_method,
        memo,
        due_date,
        amount,
        approval_status,
        approved_by,
        address,
        credit_days,
        check_memo,
        ref_number,
        void: isVoid,
        hold_payment,
        line_items = [],
        attachments = [],
      } = body;

      // Validate required fields
      if (
        !type ||
        !books_date ||
        !bill_date ||
        !corporation_uuid ||
        !pay_method ||
        !amount
      ) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Missing required fields: type, books_date, bill_date, corporation_uuid, pay_method, amount are required",
        });
      }

      // Either payee_name or vendor_uuid must be provided
      if (!payee_name && !vendor_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Either payee_name or vendor_uuid must be provided",
        });
      }

      // Convert dates to UTC timestamps before storing
      const booksDateUTC = books_date
        ? new Date(books_date).toISOString()
        : null;
      const billDateUTC = bill_date ? new Date(bill_date).toISOString() : null;
      const dueDateUTC = due_date ? new Date(due_date).toISOString() : null;

      // Create bill entry
      const { data: billEntry, error: billError } = await supabaseServer
        .from("bill_entries")
        .insert([
          {
            type,
            books_date: booksDateUTC,
            bill_date: billDateUTC,
            corporation_uuid,
            number,
            payee_name,
            vendor_uuid,
            account_number,
            pay_method,
            memo,
            due_date: dueDateUTC,
            amount: parseFloat(amount),
            approval_status: approval_status || "Pending",
            approved_by,
            address,
            credit_days,
            check_memo,
            ref_number,
            void: isVoid ?? false,
            hold_payment: hold_payment ?? false,
            attachments: attachments || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (billError) {
        console.error("Error creating bill entry:", billError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating bill entry: " + billError.message,
        });
      }

      // Create bill entry lines if provided
      if (line_items && line_items.length > 0) {
        const lineItemsData = line_items
          .filter(
            (item: any) => item.account_uuid && item.account_uuid.trim() !== ""
          ) // Filter out empty UUIDs
          .map((item: any) => ({
            bill_entry_id: billEntry.id,
            account_uuid: item.account_uuid,
            description: item.description || "",
            amount: parseFloat(item.amount) || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

        const { data: insertedLines, error: linesError } = await supabaseServer
          .from("bill_entry_lines")
          .insert(lineItemsData)
          .select();

        if (linesError) {
          console.error("Error creating bill entry lines:", linesError);
          // Note: We don't throw here as the bill entry was created successfully
          // In production, you might want to implement a transaction or rollback
        }
      }

      // Fetch the complete bill entry with lines
      const { data: completeBillEntry, error: fetchError } =
        await supabaseServer
          .from("bill_entries")
          .select(
            `
          *,
          bill_entry_lines(
            id,
            account_uuid,
            description,
            amount,
            chart_of_accounts(
              uuid,
              code,
              account_name,
              account_type,
              sub_category
            )
          )
        `
          )
          .eq("id", billEntry.id)
          .single();

      if (fetchError) {
        console.error("Error fetching complete bill entry:", fetchError);
        // Return the basic bill entry if fetch fails
        return { data: billEntry };
      }

      // Create audit log for bill creation
      try {
        const userInfo = await getUserInfo();
        if (userInfo) {
          await supabaseServer.from("audit_logs").insert({
            entity_type: "bill_entry",
            entity_id: billEntry.id,
            corporation_uuid: corporation_uuid,
            action: "created",
            new_values: completeBillEntry,
            description: `Bill entry created: ${
              completeBillEntry.number || "N/A"
            } - ${completeBillEntry.payee_name}`,
            user_id: userInfo.id,
            user_name: userInfo.name,
            user_email: userInfo.email,
            user_image_url: userInfo.image_url,
            metadata: {
              amount: completeBillEntry.amount,
              bill_number: completeBillEntry.number,
              payee_name: completeBillEntry.payee_name,
              approval_status: completeBillEntry.approval_status,
              line_items_count: line_items?.length || 0,
              attachments_count: attachments?.length || 0,
            },
          });
          console.log(
            `Audit log created for new bill entry ${billEntry.id} by user ${userInfo.name} (${userInfo.email})`
          );
        } else {
          console.warn(
            `Could not get user info for audit log (New Bill ID: ${billEntry.id})`
          );
        }
      } catch (auditError) {
        console.error("Error creating audit log:", auditError);
        console.error("Audit log error details:", {
          billId: billEntry.id,
          error: auditError.message,
          stack: auditError.stack,
        });
        // Don't fail the main operation if audit logging fails
      }

      return { data: completeBillEntry };
    }

    // PUT operations are handled by /api/bill-entries/[id].ts

    // DELETE operations are handled by /api/bill-entries/[id].ts

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Bill entries API error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
