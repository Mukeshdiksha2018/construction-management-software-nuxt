import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, "uuid");
    const body = await readBody(event);
    const { po_instruction_name, instruction, status } = body;

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "PO Instruction UUID is required",
      });
    }

    // Validation
    if (!po_instruction_name || !po_instruction_name.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: "PO Instruction Name is required",
      });
    }

    if (!instruction || !instruction.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: "Instruction is required",
      });
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Status must be either ACTIVE or INACTIVE",
      });
    }

    const supabase = supabaseServer;

    // Update PO instruction
    const { data: poInstruction, error } = await supabase
      .from("po_instructions")
      .update({
        po_instruction_name: po_instruction_name.trim(),
        instruction: instruction.trim(),
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("uuid", uuid)
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
      .single();

    if (error) {
      console.error("Error updating PO instruction:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update PO instruction",
      });
    }

    return {
      success: true,
      data: poInstruction,
      message: "PO instruction updated successfully",
    };
  } catch (error: any) {
    console.error("Error in PO instructions PUT:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
