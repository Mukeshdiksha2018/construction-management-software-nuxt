import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const corporationUuid = query.corporation_uuid as string;

    if (!corporationUuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "Corporation UUID is required",
      });
    }

    const supabase = supabaseServer;

    // Fetch PO instructions for the corporation
    const { data: poInstructions, error } = await supabase
      .from("po_instructions")
      .select(
        `
        id,
        uuid,
        corporation_uuid,
        po_instruction_name,
        instruction,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by
      `
      )
      .eq("corporation_uuid", corporationUuid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching PO instructions:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch PO instructions",
      });
    }

    return {
      success: true,
      data: poInstructions || [],
    };
  } catch (error: any) {
    console.error("Error in PO instructions GET:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
