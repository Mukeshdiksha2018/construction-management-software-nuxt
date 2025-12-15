import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body = method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch all purchase orders for a specific corporation
      const { corporation_uuid, uuid } = query;

      if (uuid) {
        // Fetch single purchase order
        const { data, error } = await supabaseServer
          .from("purchase_orders")
          .select(`
            *,
            po_items:po_items(*)
          `)
          .eq("uuid", uuid as string)
          .maybeSingle();

        if (error) {
          console.error("Supabase error:", error);
          throw createError({
            statusCode: 500,
            statusMessage: "Database error: " + error.message,
          });
        }

        if (!data) {
          throw createError({
            statusCode: 404,
            statusMessage: "Purchase order not found",
          });
        }

        return { data };
      }

      if (!corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      }

      const { data, error } = await supabaseServer
        .from("purchase_orders")
        .select(`
          *,
          po_items:po_items(*)
        `)
        .eq("corporation_uuid", corporation_uuid as string)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { data: data || [] };
    }

    if (method === "POST") {
      // Create a new purchase order
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      // Validate required fields
      if (!body.corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      }

      if (!body.entry_date) {
        throw createError({
          statusCode: 400,
          statusMessage: "entry_date is required",
        });
      }

      // Auto-generate PO number if missing
      let poNumber = body.po_number;
      if (!poNumber) {
        const { data: existingPOs } = await supabaseServer
          .from("purchase_orders")
          .select("po_number")
          .eq("corporation_uuid", body.corporation_uuid)
          .order("created_at", { ascending: false })
          .limit(100);

        let maxSeq = 0;
        const re = /^PO-(\d+)$/i;
        existingPOs?.forEach((po: any) => {
          const match = String(po.po_number || "").match(re);
          if (match) {
            const seq = parseInt(match[1]);
            if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq);
          }
        });
        poNumber = `PO-${String(maxSeq + 1).padStart(6, "0")}`;
      }

      const normalizeUTC = (val: any, endOfDay = false) => {
        if (!val && val !== 0) return null;
        const s = String(val);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          return endOfDay ? `${s}T23:59:59.000Z` : `${s}T00:00:00.000Z`;
        }
        return s;
      };

      // Prepare purchase order data
      const poData: any = {
        corporation_uuid: body.corporation_uuid,
        project_uuid: body.project_uuid || null,
        po_number: poNumber,
        entry_date: normalizeUTC(body.entry_date),
        po_type: body.po_type || null,
        credit_days: body.credit_days || null,
        ship_via: body.ship_via || null,
        freight: body.freight || null,
        shipping_instructions: body.shipping_instructions || null,
        estimated_delivery_date: normalizeUTC(body.estimated_delivery_date, true),
        include_items: body.include_items || null,
        terms_and_conditions: body.terms_and_conditions || null,
        item_total: body.item_total ? parseFloat(body.item_total) : 0.0,
        freight_charges_percentage: body.freight_charges_percentage
          ? parseFloat(body.freight_charges_percentage)
          : 0.0,
        freight_charges_amount: body.freight_charges_amount
          ? parseFloat(body.freight_charges_amount)
          : 0.0,
        freight_charges_taxable: body.freight_charges_taxable || false,
        packing_charges_percentage: body.packing_charges_percentage
          ? parseFloat(body.packing_charges_percentage)
          : 0.0,
        packing_charges_amount: body.packing_charges_amount
          ? parseFloat(body.packing_charges_amount)
          : 0.0,
        packing_charges_taxable: body.packing_charges_taxable || false,
        custom_duties_percentage: body.custom_duties_percentage
          ? parseFloat(body.custom_duties_percentage)
          : 0.0,
        custom_duties_amount: body.custom_duties_amount
          ? parseFloat(body.custom_duties_amount)
          : 0.0,
        custom_duties_taxable: body.custom_duties_taxable || false,
        other_charges_percentage: body.other_charges_percentage
          ? parseFloat(body.other_charges_percentage)
          : 0.0,
        other_charges_amount: body.other_charges_amount
          ? parseFloat(body.other_charges_amount)
          : 0.0,
        other_charges_taxable: body.other_charges_taxable || false,
        charges_total: body.charges_total ? parseFloat(body.charges_total) : 0.0,
        sales_tax_1_percentage: body.sales_tax_1_percentage
          ? parseFloat(body.sales_tax_1_percentage)
          : 0.0,
        sales_tax_1_amount: body.sales_tax_1_amount
          ? parseFloat(body.sales_tax_1_amount)
          : 0.0,
        sales_tax_2_percentage: body.sales_tax_2_percentage
          ? parseFloat(body.sales_tax_2_percentage)
          : 0.0,
        sales_tax_2_amount: body.sales_tax_2_amount
          ? parseFloat(body.sales_tax_2_amount)
          : 0.0,
        tax_total: body.tax_total ? parseFloat(body.tax_total) : 0.0,
        total_po_amount: body.total_po_amount ? parseFloat(body.total_po_amount) : 0.0,
        vendor_uuid: body.vendor_uuid || null,
        billing_address_uuid: body.billing_address_uuid || null,
        shipping_address_uuid: body.shipping_address_uuid || null,
        status: body.status || "Draft",
        is_active: true,
      };

      // Insert purchase order
      const { data: newPO, error: poError } = await supabaseServer
        .from("purchase_orders")
        .insert([poData])
        .select()
        .single();

      if (poError) {
        console.error("Error creating purchase order:", poError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating purchase order: " + poError.message,
        });
      }

      // Insert PO items if provided
      if (body.po_items && Array.isArray(body.po_items) && body.po_items.length > 0) {
        const poItems = body.po_items.map((item: any) => {
          const approvalChecksUuids = Array.isArray(item.approval_checks) && item.approval_checks.length > 0
            ? item.approval_checks
            : (item.approval_checks_uuids && Array.isArray(item.approval_checks_uuids) && item.approval_checks_uuids.length > 0
              ? item.approval_checks_uuids
              : []);
          
          console.log('[PO API] Item approval_checks:', {
            approval_checks: item.approval_checks,
            approval_checks_uuids: item.approval_checks_uuids,
            resolved: approvalChecksUuids,
          });

          return {
            purchase_order_uuid: newPO.uuid,
            cost_code_uuid: item.cost_code_uuid || null,
            item_type_uuid: item.item_type_uuid || null,
            sequence_uuid: item.sequence_uuid || null,
            item_uuid: item.item_uuid || null,
            description: item.description || null,
            model_number: item.model_number || null,
            location_uuid: item.location_uuid || null,
            unit_price: item.unit_price ? parseFloat(item.unit_price) : 0.0,
            uom: item.uom || null,
            quantity: item.quantity ? parseFloat(item.quantity) : 0.0,
            total: item.total ? parseFloat(item.total) : 0.0,
            approval_checks_uuids: approvalChecksUuids,
          };
        });

        console.log('[PO API] Inserting PO items with approval_checks_uuids:', 
          poItems.map(item => ({ 
            item_uuid: item.item_uuid, 
            approval_checks_uuids: item.approval_checks_uuids 
          }))
        );

        const { error: itemsError, data: insertedItems } = await supabaseServer
          .from("purchase_order_items_list")
          .insert(poItems)
          .select();

        if (itemsError) {
          console.error("[PO API] Error creating PO items:", itemsError);
          console.error("[PO API] Failed items data:", poItems);
          // Continue even if items fail - we already created the PO
        } else {
          console.log("[PO API] Successfully inserted PO items:", insertedItems?.length);
          if (insertedItems && insertedItems.length > 0) {
            console.log("[PO API] Sample inserted item approval_checks_uuids:", 
              insertedItems[0]?.approval_checks_uuids
            );
          }
          // Fetch the PO with items
          const { data: poWithItems } = await supabaseServer
            .from("purchase_orders")
            .select(`
              *,
              po_items:po_items(*)
            `)
            .eq("uuid", newPO.uuid)
            .single();

          return { data: poWithItems || newPO };
        }
      }

      return { data: newPO };
    }

    if (method === "PUT") {
      // Update purchase order
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      const { uuid, po_items, ...updatedFields } = body;

      if (!uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Purchase order UUID is required for update",
        });
      }

      // Check if purchase order exists
      const { data: existingPO } = await supabaseServer
        .from("purchase_orders")
        .select("id, corporation_uuid")
        .eq("uuid", uuid)
        .single();

      if (!existingPO) {
        throw createError({
          statusCode: 404,
          statusMessage: "Purchase order not found",
        });
      }

      const normalizeUTC = (val: any, endOfDay = false) => {
        if (!val && val !== 0) return null;
        const s = String(val);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          return endOfDay ? `${s}T23:59:59.000Z` : `${s}T00:00:00.000Z`;
        }
        return s;
      };

      // Prepare updated data
      const updateData: any = {};

      const allowedFields = [
        "project_uuid",
        "po_number",
        "entry_date",
        "po_type",
        "credit_days",
        "ship_via",
        "freight",
        "shipping_instructions",
        "estimated_delivery_date",
        "include_items",
        "terms_and_conditions",
        "item_total",
        "freight_charges_percentage",
        "freight_charges_amount",
        "freight_charges_taxable",
        "packing_charges_percentage",
        "packing_charges_amount",
        "packing_charges_taxable",
        "custom_duties_percentage",
        "custom_duties_amount",
        "custom_duties_taxable",
        "other_charges_percentage",
        "other_charges_amount",
        "other_charges_taxable",
        "charges_total",
        "sales_tax_1_percentage",
        "sales_tax_1_amount",
        "sales_tax_2_percentage",
        "sales_tax_2_amount",
        "tax_total",
        "total_po_amount",
        "vendor_uuid",
        "billing_address_uuid",
        "shipping_address_uuid",
        "status",
      ];

      for (const field of allowedFields) {
        if (updatedFields[field] !== undefined) {
          if (
            field.includes("_amount") ||
            field.includes("_percentage") ||
            field === "item_total" ||
            field === "charges_total" ||
            field === "tax_total" ||
            field === "total_po_amount"
          ) {
            updateData[field] = updatedFields[field]
              ? parseFloat(updatedFields[field])
              : 0.0;
          } else if (field === "entry_date") {
            updateData[field] = normalizeUTC(updatedFields[field]);
          } else if (field === "estimated_delivery_date") {
            updateData[field] = normalizeUTC(updatedFields[field], true);
          } else if (field.includes("_taxable")) {
            updateData[field] = updatedFields[field] || false;
          } else {
            updateData[field] = updatedFields[field];
          }
        }
      }

      // Update purchase order
      const { data: updatedPO, error: updateError } = await supabaseServer
        .from("purchase_orders")
        .update(updateData)
        .eq("uuid", uuid)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating purchase order:", updateError);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating purchase order: " + updateError.message,
        });
      }

      // Update PO items if provided
      if (po_items && Array.isArray(po_items)) {
        // Delete existing items
        await supabaseServer.from("purchase_order_items_list").delete().eq("purchase_order_uuid", uuid);

        // Insert new items
        if (po_items.length > 0) {
          const items = po_items.map((item: any) => {
            const approvalChecksUuids = Array.isArray(item.approval_checks) && item.approval_checks.length > 0
              ? item.approval_checks
              : (item.approval_checks_uuids && Array.isArray(item.approval_checks_uuids) && item.approval_checks_uuids.length > 0
                ? item.approval_checks_uuids
                : []);
            
            console.log('[PO API] Update - Item approval_checks:', {
              approval_checks: item.approval_checks,
              approval_checks_uuids: item.approval_checks_uuids,
              resolved: approvalChecksUuids,
            });

            return {
              purchase_order_uuid: uuid,
              cost_code_uuid: item.cost_code_uuid || null,
              item_type_uuid: item.item_type_uuid || null,
              sequence_uuid: item.sequence_uuid || null,
              item_uuid: item.item_uuid || null,
              description: item.description || null,
              model_number: item.model_number || null,
              location_uuid: item.location_uuid || null,
              unit_price: item.unit_price ? parseFloat(item.unit_price) : 0.0,
              uom: item.uom || null,
              quantity: item.quantity ? parseFloat(item.quantity) : 0.0,
              total: item.total ? parseFloat(item.total) : 0.0,
              approval_checks_uuids: approvalChecksUuids,
            };
          });

          console.log('[PO API] Updating PO items with approval_checks_uuids:', 
            items.map(item => ({ 
              item_uuid: item.item_uuid, 
              approval_checks_uuids: item.approval_checks_uuids 
            }))
          );

          const { error: insertError } = await supabaseServer
            .from("purchase_order_items_list")
            .insert(items);
          
          if (insertError) {
            console.error('[PO API] Error inserting items:', insertError);
          }
        }

        // Fetch updated PO with items
        const { data: poWithItems } = await supabaseServer
          .from("purchase_orders")
          .select(`
            *,
            po_items:po_items(*)
          `)
          .eq("uuid", uuid)
          .single();

        return { data: poWithItems || updatedPO };
      }

      return { data: updatedPO };
    }

    if (method === "DELETE") {
      // Soft delete purchase order
      const { uuid } = query;

      if (!uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Purchase order UUID is required for deletion",
        });
      }

      const { data, error } = await supabaseServer
        .from("purchase_orders")
        .update({ is_active: false })
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("Error deleting purchase order:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting purchase order: " + error.message,
        });
      }

      return { data };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("API Error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

