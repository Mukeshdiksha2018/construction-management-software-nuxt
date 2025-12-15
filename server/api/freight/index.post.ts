import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { ship_via, description, active = true } = body;

    if (!ship_via || ship_via.trim() === "") {
      throw createError({ statusCode: 400, statusMessage: "Ship Via is required" });
    }
    if (typeof active !== "boolean") {
      throw createError({ statusCode: 400, statusMessage: "Active must be a boolean value" });
    }

    const supabase = supabaseServer;
    const { data, error } = await supabase
      .from("freight")
      .insert({ ship_via: ship_via.trim(), description: description?.trim() || null, active })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      if (error.code === "23505") {
        throw createError({ statusCode: 400, statusMessage: "Freight entry with this Ship Via already exists" });
      }
      throw createError({ statusCode: 500, statusMessage: "Failed to create freight" });
    }

    return { success: true, data, message: "Freight created successfully" };
  } catch (error: any) {
    console.error("Error in Freight POST API:", error);
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || "Internal server error" });
  }
});
