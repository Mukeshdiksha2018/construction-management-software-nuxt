import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const supabase = supabaseServer;

    const { data, error } = await supabase
      .from("sales_tax")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch sales tax",
      });
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error: any) {
    console.error("Error in Sales Tax GET API:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});

