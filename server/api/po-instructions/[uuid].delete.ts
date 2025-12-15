import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, "uuid");
    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "PO Instruction UUID is required",
      });
    }

    const supabase = supabaseServer;

    // Delete PO instruction
    const { error } = await supabase
      .from("po_instructions")
      .delete()
      .eq("uuid", uuid);

    if (error) {
      console.error("Error deleting PO instruction:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete PO instruction",
      });
    }

    return {
      success: true,
      message: "PO instruction deleted successfully",
    };
  } catch (error: any) {
    console.error("Error in PO instructions DELETE:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
