import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  const query = getQuery(event);
  const projectUuid = String(query.project_uuid || "").trim();
  const estimateUuid = String(query.estimate_uuid || "").trim();
  const corporationUuid = String(query.corporation_uuid || "").trim();

  if (!projectUuid || !estimateUuid || !corporationUuid) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "project_uuid, estimate_uuid, and corporation_uuid are required",
    });
  }

  try {
    const { data, error } = await supabaseServer
      .from("estimate_line_items")
      .select(
        "id, cost_code_uuid, cost_code_number, cost_code_name, division_name, material_items, labor_amount, material_amount, total_amount, description"
      )
      .eq("project_uuid", projectUuid)
      .eq("estimate_uuid", estimateUuid)
      .eq("corporation_uuid", corporationUuid)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching estimate line items:", error);
      throw createError({
        statusCode: 500,
        statusMessage: error.message || "Failed to fetch estimate line items",
      });
    }

    const normalized = (data || []).map((row) => ({
      id: row.id,
      cost_code_uuid: row.cost_code_uuid,
      cost_code_number: row.cost_code_number,
      cost_code_name: row.cost_code_name,
      division_name: row.division_name,
      description: row.description || '',
      labor_amount: row.labor_amount || 0,
      material_amount: row.material_amount || 0,
      total_amount: row.total_amount || 0,
      material_items: Array.isArray(row.material_items)
        ? row.material_items
        : [],
    }));

    return { data: normalized };
  } catch (error: any) {
    console.error("estimate-line-items API failure", error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Unexpected error",
    });
  }
});

