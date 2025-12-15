import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const {
      corporation_uuid,
      po_instruction_name,
      instruction,
      status = "ACTIVE",
    } = body;

    // Validation
    if (!corporation_uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "Corporation UUID is required",
      });
    }

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

    // Create PO instruction
    const { data: poInstruction, error } = await supabase
      .from("po_instructions")
      .insert({
        corporation_uuid,
        po_instruction_name: po_instruction_name.trim(),
        instruction: instruction.trim(),
        status,
      })
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
      console.error("Error creating PO instruction:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create PO instruction",
      });
    }

    return {
      success: true,
      data: poInstruction,
      message: "PO instruction created successfully",
    };
  } catch (error: any) {
    console.error("Error in PO instructions POST:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
