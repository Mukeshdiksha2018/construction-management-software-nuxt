import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const body = await readBody(event);
    const { accounts } = body;

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid accounts data",
      });
    }

    // Validate each account
    const validAccounts = accounts.map((account: any, index: number) => {
      if (
        !account.corporation_uuid ||
        !account.code ||
        !account.account_name ||
        !account.account_type
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: `Missing required fields in account ${index + 1}`,
        });
      }

      // Validate account_type
      const validAccountTypes = [
        "Asset",
        "Liability",
        "Equity",
        "Revenue",
        "Expense",
      ];
      if (!validAccountTypes.includes(account.account_type)) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid account_type: ${account.account_type}`,
        });
      }

      const validAccount = {
        corporation_uuid: account.corporation_uuid,
        code: account.code.toString().trim(),
        account_name: account.account_name.toString().trim(),
        account_type: account.account_type.toString().trim(),
        parent_account: account.parent_account
          ? account.parent_account.toString().trim()
          : "",
        sub_category: account.sub_category
          ? account.sub_category.toString().trim()
          : "",
        notes: account.notes ? account.notes.toString().trim() : "",
        opening_balance: account.opening_balance
          ? parseFloat(account.opening_balance)
          : 0,
        is_header: account.is_header || false,
        bank_account_number: account.bank_account_number
          ? account.bank_account_number.toString().trim()
          : "",
        box_1099: account.box_1099
          ? account.box_1099.toString().trim()
          : "Not Applicable",
      };

      return validAccount;
    });

    // Check for existing accounts to avoid duplicates
    const existingAccounts = await supabaseServer
            .from("chart_of_accounts")
            .select("code, corporation_uuid")
            .eq("corporation_uuid", validAccounts[0].corporation_uuid)
            .in(
              "code",
              validAccounts.map((acc) => acc.code)
            );

    if (existingAccounts.error) {
      throw createError({
        statusCode: 500,
        statusMessage:
          "Error checking existing accounts: " + existingAccounts.error.message,
      });
    }

    const existingCodes = new Set(
      existingAccounts.data?.map((acc) => acc.code) || []
    );

    // Filter out accounts that already exist
    const newAccounts = validAccounts.filter(
      (account) => !existingCodes.has(account.code)
    );
    const duplicateAccounts = validAccounts.filter((account) =>
      existingCodes.has(account.code)
    );

    // If all accounts are duplicates, return early with appropriate message
    if (newAccounts.length === 0) {
      return {
        data: [],
        duplicates: duplicateAccounts.length,
        new: 0,
        total: validAccounts.length,
        message: `All ${validAccounts.length} accounts already exist in the database. No new accounts were added.`,
        existingAccounts: [],
      };
    }

    let insertedData: any[] = [];

    // Insert new accounts if any
    if (newAccounts.length > 0) {
      try {
        const { data: insertData, error: insertError } = await supabaseServer
          .from("chart_of_accounts")
          .insert(newAccounts)
          .select();

        if (insertError) {
          // Provide more specific error messages
          if (insertError.code === "23505") {
            // Unique constraint violation
            throw createError({
              statusCode: 400,
              statusMessage: `Duplicate account codes detected. Some accounts with these codes already exist: ${newAccounts
                .map((acc) => acc.code)
                .join(", ")}`,
            });
          } else if (insertError.code === "23502") {
            // Not null constraint violation
            throw createError({
              statusCode: 400,
              statusMessage: `Missing required fields: ${insertError.message}`,
            });
          } else {
            throw createError({
              statusCode: 500,
              statusMessage: `Database error: ${insertError.message}`,
            });
          }
        }

        insertedData = insertData || [];
      } catch (error: any) {
        // Re-throw createError instances
        if (error.statusCode) {
          throw error;
        }
        // Handle unexpected errors
        throw createError({
          statusCode: 500,
          statusMessage: `Unexpected error during insert: ${error.message}`,
        });
      }
    }

    const result = {
      data: insertedData,
      duplicates: duplicateAccounts.length,
      new: newAccounts.length,
      total: validAccounts.length,
    };

    return result;
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, create a generic error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
