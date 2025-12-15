import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  if (method === "GET") {
    // Fetch all corporations
    const { data, error } = await supabaseServer.from("properties").select("*");
    if (error) return { error: error.message };
    return { data };
  }

  if (method === "POST") {
    // Add a new corporation
    const { data, error } = await supabaseServer
      .from("properties")
      .insert([body])
      .select()
      .single();
    if (error) return { error: error.message };
    return { data };
  }

  if (method === "PUT") {
    // Update corporation
    const { uuid, ...updatedData } = body;
    const { data, error } = await supabaseServer
      .from("properties")
      .update(updatedData)
      .eq("uuid", uuid)
      .select()
      .single();
    if (error) return { error: error.message };
    return { data };
  }

  if (method === "DELETE") {
    // Delete corporation
    const { uuid } = query;
    const { error } = await supabaseServer
      .from("properties")
      .delete()
      .eq("uuid", uuid);
    if (error) return { error: error.message };
    return { success: true };
  }

  return { error: "Method not allowed" };
});
