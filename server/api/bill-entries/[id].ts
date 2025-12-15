import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const id = getRouterParam(event, "id");
  const body = method === "PUT" ? await readBody(event) : null;

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
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "id is required",
      });
    }

    if (method === "GET") {
      // Get a specific bill entry by ID
      const { data, error } = await supabaseServer
        .from("bill_entries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { data: data || null };
    }

    if (method === "PUT") {
      // Update a specific bill entry
      const {
        type,
        books_date,
        bill_date,
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

      // Get the old values BEFORE the update for audit logging
      const { data: oldBillEntry } = await supabaseServer
        .from("bill_entries")
        .select("*")
        .eq("id", id)
        .single();

      // Update bill entry (without line_items as they're handled separately)
      const { data: updatedBillEntry, error: updateError } =
        await supabaseServer
          .from("bill_entries")
          .update({
            type,
            books_date,
            bill_date,
            number,
            payee_name,
            vendor_uuid,
            account_number,
            pay_method,
            memo,
            due_date,
            amount: parseFloat(amount),
            approval_status,
            approved_by,
            address,
            credit_days,
            check_memo,
            ref_number,
            void: isVoid ?? false,
            hold_payment: hold_payment ?? false,
            attachments: attachments || [],
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

      if (updateError) {
        console.error("Error updating bill entry:", updateError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating bill entry: " + updateError.message,
        });
      }

      // Handle line items update
      if (line_items && line_items.length > 0) {
        // First, delete existing line items for this bill
        const { error: deleteError } = await supabaseServer
          .from("bill_entry_lines")
          .delete()
          .eq("bill_entry_id", id);

        if (deleteError) {
          console.error("Error deleting existing line items:", deleteError);
        }

        // Then, insert new line items
        const lineItemsData = line_items
          .filter(
            (item: any) => item.account_uuid && item.account_uuid.trim() !== ""
          ) // Filter out empty UUIDs
          .map((item: any) => ({
            bill_entry_id: id,
            account_uuid: item.account_uuid,
            description: item.description || "",
            amount: parseFloat(item.amount) || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

        const { error: linesError } = await supabaseServer
          .from("bill_entry_lines")
          .insert(lineItemsData);

        if (linesError) {
          console.error("Error creating bill entry lines:", linesError);
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
          .eq("id", id)
          .single();

      if (fetchError) {
        console.error("Error fetching complete bill entry:", fetchError);
        return { data: updatedBillEntry };
      }

      // Create audit log for bill update
      try {
        const userInfo = await getUserInfo();
        if (userInfo && oldBillEntry) {
          // Find changed fields by comparing old values with new values
          const changedFields: string[] = [];
          const oldValues: Record<string, any> = {};
          const newValues: Record<string, any> = {};

          // Compare each field in the updated bill entry
          const fieldsToCompare = [
            "type",
            "books_date",
            "bill_date",
            "number",
            "payee_name",
            "vendor_uuid",
            "account_number",
            "pay_method",
            "memo",
            "due_date",
            "amount",
            "approval_status",
            "approved_by",
          ];

          for (const key of fieldsToCompare) {
            const oldValue = oldBillEntry[key];
            const newValue = completeBillEntry[key];

            // Handle different data types properly
            let hasChanged = false;
            if (key === "amount") {
              hasChanged =
                parseFloat(oldValue || 0) !== parseFloat(newValue || 0);
            } else if (key === "attachments" || key === "line_items") {
              hasChanged =
                JSON.stringify(oldValue || []) !==
                JSON.stringify(newValue || []);
            } else {
              hasChanged = oldValue !== newValue;
            }

            if (hasChanged) {
              changedFields.push(key);
              oldValues[key] = oldValue;
              newValues[key] = newValue;
            }
          }

          // Always create an audit log entry for updates, even if no fields changed
          // This ensures we track that an update attempt was made
          await supabaseServer.from("audit_logs").insert({
            entity_type: "bill_entry",
            entity_id: id,
            corporation_uuid: completeBillEntry.corporation_uuid,
            action: "updated",
            old_values: oldValues,
            new_values: newValues,
            changed_fields: changedFields,
            description: `Bill entry updated: ${
              completeBillEntry.number || "N/A"
            } - ${completeBillEntry.payee_name}${
              changedFields.length > 0
                ? ` (${changedFields.length} fields changed)`
                : " (no changes detected)"
            }`,
            user_id: userInfo.id,
            user_name: userInfo.name,
            user_email: userInfo.email,
            user_image_url: userInfo.image_url,
            metadata: {
              amount: completeBillEntry.amount,
              bill_number: completeBillEntry.number,
              payee_name: completeBillEntry.payee_name,
              approval_status: completeBillEntry.approval_status,
              fields_changed: changedFields,
              fields_changed_count: changedFields.length,
            },
          });
        } else {
          if (!userInfo) {
            console.warn(
              `Could not get user info for audit log (Bill ID: ${id})`
            );
          }
          if (!oldBillEntry) {
            console.warn(
              `Could not find old bill entry data for audit log (ID: ${id})`
            );
          }
        }
      } catch (auditError: any) {
        console.error("Error creating audit log:", auditError);
        // Log the error but don't fail the main operation
        console.error("Audit log error details:", {
          billId: id,
          error: auditError.message,
          stack: auditError.stack,
        });
      }

      return { data: completeBillEntry };
    }

    if (method === "DELETE") {
      // Get the bill entry data before deletion to check for attachments
      const { data: billEntryToDelete, error: fetchError } =
        await supabaseServer
          .from("bill_entries")
          .select("attachments")
          .eq("id", id)
          .single();

      if (fetchError) {
        console.error("Error fetching bill entry for deletion:", fetchError);
        // Continue with deletion even if we can't get the data
      }

      // Delete attachments from storage if they exist
      if (
        billEntryToDelete?.attachments &&
        billEntryToDelete.attachments.length > 0
      ) {
        try {
          // Get runtime config for server-side only
          const config = useRuntimeConfig();

          // Create admin client for storage operations
          const { createClient } = await import("@supabase/supabase-js");
          const supabaseAdmin = createClient(
            config.public.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            }
          );

          // Delete each attachment from storage
          for (const attachment of billEntryToDelete.attachments) {
            if (attachment.file_url) {
              try {
                // The file is stored with the name {billEntryId}.{extension}
                // Extract the file extension from the original filename or URL
                const urlParts = attachment.file_url.split("/");
                const fileNameWithQuery = urlParts[urlParts.length - 1];
                const originalFileName = fileNameWithQuery.split("?")[0]; // Remove query parameters
                const fileExtension = originalFileName.split(".").pop();

                // Construct the actual stored filename
                const storedFileName = `${id}.${fileExtension}`;

                // Delete the attachment from storage using the stored filename
                const { error: deleteError } = await supabaseAdmin.storage
                  .from("bill_entries")
                  .remove([storedFileName]);

                if (deleteError) {
                  console.error(
                    "Error deleting attachment from storage:",
                    deleteError
                  );
                  console.error("Failed to delete file:", storedFileName);
                } else {
                }
              } catch (attachmentError) {
                console.error(
                  "Error processing attachment deletion:",
                  attachmentError
                );
              }
            }
          }
        } catch (storageError) {
          console.error("Error during attachment cleanup:", storageError);
          // Continue with database deletion even if storage cleanup fails
        }
      }

      // Delete bill entry from database
      const { error } = await supabaseServer
        .from("bill_entries")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting bill entry:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting bill entry: " + error.message,
        });
      }

      return { success: true };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Bill entry API error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
