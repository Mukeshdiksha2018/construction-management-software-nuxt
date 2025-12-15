import { ref, readonly } from 'vue'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'

export interface StockReportItem {
  itemCode: string;
  itemName: string;
  description: string;
  vendorSource: string;
  costCode: string;
  currentStock: number;
  unitCost: number;
  uom: string;
  totalValue: number;
  reorderLevel: number;
  inShipment: number;
  returnedQty: number;
  lastPurchaseDate: string | null;
  lastStockUpdateDate: string | null;
}

export interface StockReportData {
  items: StockReportItem[];
  totals: {
    currentStock: number;
    totalValue: number;
    reorderLevel: number;
    inShipment: number;
    returnedQty: number;
  };
}

export const useStockReport = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const costCodeConfigurationsStore = useCostCodeConfigurationsStore();

  const generateStockReport = async (
    corporationUuid: string,
    projectUuid: string
  ): Promise<StockReportData | null> => {
    if (!corporationUuid || !projectUuid) {
      error.value = "Corporation and project are required";
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      // Step 1: Fetch all required base data in parallel
      const [
        receiptNoteItemsResponse,
        returnNoteItemsResponse,
        vendorsResponse,
        costCodesResponse,
      ] = await Promise.all([
        // Fetch receipt note items for the project
        $fetch("/api/receipt-note-items", {
          method: "GET",
          params: {
            corporation_uuid: corporationUuid,
            project_uuid: projectUuid,
          },
        }).catch((err) => {
          console.error("Error fetching receipt note items:", err);
          return { data: [] };
        }),
        // Fetch return note items for the project
        $fetch("/api/return-note-items", {
          method: "GET",
          params: {
            corporation_uuid: corporationUuid,
            project_uuid: projectUuid,
          },
        }).catch((err) => {
          console.error("Error fetching return note items:", err);
          return { data: [] };
        }),

        // Fetch vendors for vendor name lookup
        $fetch("/api/purchase-orders/vendors", {
          method: "GET",
          params: {
            corporation_uuid: corporationUuid,
          },
        }).catch((err) => {
          console.error("Error fetching vendors:", err);
          return { data: [] };
        }),

        // Fetch cost codes for cost code lookup
        $fetch("/api/cost-code-configurations", {
          method: "GET",
          params: {
            corporation_uuid: corporationUuid,
          },
        }).catch((err) => {
          console.error("Error fetching cost codes:", err);
          return { data: [] };
        }),
      ]);

      // Receipt note items are already filtered by the API to only include active receipt notes
      // Add a safety check to filter out any inactive receipt notes (in case API filter didn't work)
      const allReceiptNoteItems: any[] = receiptNoteItemsResponse?.data || [];
      const receiptNoteItems = allReceiptNoteItems.filter((item: any) => {
        // Filter out items from inactive receipt notes
        // receipt_note_is_active is added by the API during flattening
        return item.receipt_note_is_active !== false;
      });

      // Return note items - filter out inactive items
      const allReturnNoteItems: any[] = returnNoteItemsResponse?.data || [];
      const returnNoteItems = allReturnNoteItems.filter((item: any) => {
        // Filter out inactive return note items
        return item.is_active !== false;
      });

      const vendors: any[] = (vendorsResponse as any)?.data || [];
      const costCodes: any[] = (costCodesResponse as any)?.data || [];

      // Create lookup maps
      const vendorMap = new Map(
        vendors.map((v: any) => [v.uuid, v.vendor_name])
      );
      const costCodeMap = new Map(
        costCodes.map((cc: any) => [
          cc.uuid,
          `${cc.cost_code_number || ""} ${cc.cost_code_name || ""}`.trim(),
        ])
      );

      // Step 2: Fetch cost code configurations for project items (UOM lookup)
      await costCodeConfigurationsStore.fetchConfigurations(
        corporationUuid,
        false,
        true
      );

      // Step 3: Collect unique PO and CO UUIDs to batch fetch (from both receipt and return note items)
      const uniquePOUuids = new Set<string>();
      const uniqueCOUuids = new Set<string>();

      receiptNoteItems.forEach((rni) => {
        if (rni.item_type === "purchase_order" && rni.purchase_order_uuid) {
          uniquePOUuids.add(rni.purchase_order_uuid);
        } else if (rni.item_type === "change_order" && rni.change_order_uuid) {
          uniqueCOUuids.add(rni.change_order_uuid);
        }
      });

      // Also collect PO/CO UUIDs from return note items
      returnNoteItems.forEach((rni) => {
        if (rni.item_type === "purchase_order" && rni.purchase_order_uuid) {
          uniquePOUuids.add(rni.purchase_order_uuid);
        } else if (rni.item_type === "change_order" && rni.change_order_uuid) {
          uniqueCOUuids.add(rni.change_order_uuid);
        }
      });

      // Step 4: Batch fetch all purchase order items and change order items in parallel
      const poItemsPromises = Array.from(uniquePOUuids).map(async (poUuid) => {
        try {
          const response = await $fetch("/api/purchase-order-items", {
            method: "GET",
            params: { purchase_order_uuid: poUuid },
          });
          const items = Array.isArray((response as any)?.data)
            ? (response as any).data
            : [];
          return { poUuid, items };
        } catch (err) {
          console.error(`Error fetching PO items for ${poUuid}:`, err);
          return { poUuid, items: [] };
        }
      });

      const coItemsPromises = Array.from(uniqueCOUuids).map(async (coUuid) => {
        try {
          const response = await $fetch("/api/change-order-items", {
            method: "GET",
            params: { change_order_uuid: coUuid },
          });
          const items = Array.isArray((response as any)?.data)
            ? (response as any).data
            : [];
          return { coUuid, items };
        } catch (err) {
          console.error(`Error fetching CO items for ${coUuid}:`, err);
          return { coUuid, items: [] };
        }
      });

      // Step 5: Batch fetch all PO forms and CO forms for vendor info in parallel
      const poFormsPromises = Array.from(uniquePOUuids).map(async (poUuid) => {
        try {
          const response = await $fetch(`/api/purchase-order-forms/${poUuid}`, {
            method: "GET",
          });
          return { poUuid, po: (response as any)?.data };
        } catch (err) {
          console.error(`Error fetching PO form for ${poUuid}:`, err);
          return { poUuid, po: null };
        }
      });

      const coFormsPromises = Array.from(uniqueCOUuids).map(async (coUuid) => {
        try {
          const response = await $fetch("/api/change-orders", {
            method: "GET",
            params: { uuid: coUuid },
          });
          const responseData = (response as any)?.data;
          const co = Array.isArray(responseData)
            ? responseData[0]
            : responseData;
          return { coUuid, co };
        } catch (err) {
          console.error(`Error fetching CO form for ${coUuid}:`, err);
          return { coUuid, co: null };
        }
      });

      // Wait for all batch fetches to complete
      const [poItemsResults, coItemsResults, poFormsResults, coFormsResults] =
        await Promise.all([
          Promise.all(poItemsPromises),
          Promise.all(coItemsPromises),
          Promise.all(poFormsPromises),
          Promise.all(coFormsPromises),
        ]);

      // Step 6: Create lookup maps for efficient access
      // Map: poUuid -> items array
      const poItemsMap = new Map<string, any[]>();
      poItemsResults.forEach(({ poUuid, items }) => {
        poItemsMap.set(poUuid, items);
      });

      // Map: coUuid -> items array
      const coItemsMap = new Map<string, any[]>();
      coItemsResults.forEach(({ coUuid, items }) => {
        coItemsMap.set(coUuid, items);
      });

      // Map: poUuid -> vendor_uuid
      const poVendorMap = new Map<string, string | null>();
      poFormsResults.forEach(({ poUuid, po }) => {
        poVendorMap.set(poUuid, po?.vendor_uuid || null);
      });

      // Map: coUuid -> vendor_uuid
      const coVendorMap = new Map<string, string | null>();
      coFormsResults.forEach(({ coUuid, co }) => {
        coVendorMap.set(coUuid, co?.vendor_uuid || null);
      });

      // Step 7: Create a map to aggregate returned quantities by project item UUID
      // This will be used later when processing receipt note items
      const returnedQuantitiesMap = new Map<string, number>();

      // Process return note items to aggregate returned quantities
      for (const rni of returnNoteItems) {
        // Get item details from lookup maps to find project item UUID
        let itemDetails: any = null;
        if (rni.item_type === "purchase_order" && rni.purchase_order_uuid) {
          const poItems = poItemsMap.get(rni.purchase_order_uuid) || [];
          itemDetails =
            poItems.find((item: any) => item.uuid === rni.item_uuid) || null;
        } else if (rni.item_type === "change_order" && rni.change_order_uuid) {
          const coItems = coItemsMap.get(rni.change_order_uuid) || [];
          itemDetails =
            coItems.find((item: any) => item.uuid === rni.item_uuid) || null;
        }

        if (!itemDetails) {
          continue;
        }

        // Use project item UUID as the key for aggregation
        const projectItemUuid = itemDetails.item_uuid || rni.item_uuid;
        if (!projectItemUuid) {
          continue;
        }

        const itemKey = projectItemUuid.toString().trim().toLowerCase();
        const returnedQty = Number(rni.return_quantity) || 0;
        const existingReturnedQty = returnedQuantitiesMap.get(itemKey) || 0;
        returnedQuantitiesMap.set(itemKey, existingReturnedQty + returnedQty);
      }

      // Step 8: Process receipt note items and aggregate by project item UUID
      // In the new architecture, receipt_note_items table stores each receipt with item_uuid
      // that references purchase_order_items_list.uuid or change_order_items_list.uuid
      // However, we need to aggregate by the project item UUID (itemDetails.item_uuid) which
      // references cost_code_preferred_items.uuid, so that the same project item appearing
      // in multiple POs/COs gets aggregated into a single row in the report
      const itemsMap = new Map<string, StockReportItem>();

      for (const rni of receiptNoteItems) {
        // Get receipt note info from the API response
        const receiptNote = {
          uuid: rni.receipt_note_uuid,
          status: rni.receipt_note_status || "Received",
          entry_date: rni.receipt_note_entry_date,
          updated_at: rni.receipt_note_updated_at,
          receipt_type: rni.receipt_type,
        };

        // Get item details from lookup maps
        let itemDetails: any = null;
        if (rni.item_type === "purchase_order" && rni.purchase_order_uuid) {
          const poItems = poItemsMap.get(rni.purchase_order_uuid) || [];
          itemDetails =
            poItems.find((item: any) => item.uuid === rni.item_uuid) || null;
        } else if (rni.item_type === "change_order" && rni.change_order_uuid) {
          const coItems = coItemsMap.get(rni.change_order_uuid) || [];
          itemDetails =
            coItems.find((item: any) => item.uuid === rni.item_uuid) || null;
        }

        if (!itemDetails) {
          console.warn(
            `Item details not found for item_uuid: ${rni.item_uuid}, item_type: ${rni.item_type}`
          );
          continue;
        }

        // Create item key for aggregation - use itemDetails.item_uuid (project item UUID) as the primary key
        // rni.item_uuid references the PO/CO item UUID, but itemDetails.item_uuid references the project item
        // This ensures all receipt notes for the same project item are aggregated together,
        // even if they come from different purchase orders or change orders
        const projectItemUuid = itemDetails.item_uuid || rni.item_uuid;
        if (!projectItemUuid) {
          console.warn(`Item missing project item_uuid, skipping:`, rni);
          continue;
        }

        const itemKey = projectItemUuid.toString().trim().toLowerCase();
        const existingItem = itemsMap.get(itemKey);

        // Get quantities from receipt_note_item
        const receivedQty = Number(rni.received_quantity) || 0;
        const unitPrice =
          Number(
            itemDetails.unit_price ||
              itemDetails.po_unit_price ||
              itemDetails.co_unit_price
          ) || 0;
        const totalValue =
          Number(rni.received_total) || receivedQty * unitPrice;

        // Get UOM and item sequence from project item using project item UUID
        // projectItemUuid references the item in cost_code_preferred_items (project items)
        let uom =
          itemDetails.uom || itemDetails.unit || itemDetails.unit_label || "";
        let itemSequence = itemDetails.item_sequence || null;
        if (projectItemUuid) {
          try {
            const projectItem =
              costCodeConfigurationsStore.getItemById(projectItemUuid);
            if (projectItem) {
              if (!uom && projectItem.unit) {
                uom = projectItem.unit;
              }
              if (!itemSequence && projectItem.item_sequence) {
                itemSequence = projectItem.item_sequence;
              }
            }
          } catch (itemError) {
            // Silently handle error
          }
        }

        // Determine if item is in shipment or received based on receipt note status
        const normalizedStatus = String(receiptNote.status || "")
          .trim()
          .toLowerCase();
        const isShipment = normalizedStatus === "shipment";
        const isReceived = normalizedStatus === "received";

        const inShipment = isShipment ? receivedQty : 0;
        const currentStock = isReceived ? receivedQty : 0;

        // Get returned quantity for this project item
        const returnedQty = returnedQuantitiesMap.get(itemKey) || 0;

        // Get vendor name from lookup maps
        let vendorName = "Multiple";
        if (rni.item_type === "purchase_order" && rni.purchase_order_uuid) {
          const vendorUuid = poVendorMap.get(rni.purchase_order_uuid);
          if (vendorUuid) {
            vendorName = vendorMap.get(vendorUuid) || "N/A";
          }
        } else if (rni.item_type === "change_order" && rni.change_order_uuid) {
          const vendorUuid = coVendorMap.get(rni.change_order_uuid);
          if (vendorUuid) {
            vendorName = vendorMap.get(vendorUuid) || "N/A";
          }
        }

        if (existingItem) {
          // Aggregate quantities
          const previousCurrentStock = Number(existingItem.currentStock) || 0;
          const previousInShipment = Number(existingItem.inShipment) || 0;

          existingItem.currentStock = previousCurrentStock + currentStock;
          existingItem.inShipment = previousInShipment + inShipment;
          existingItem.returnedQty = returnedQty; // Set returned quantity (already aggregated by project item UUID)
          existingItem.totalValue =
            (Number(existingItem.totalValue) || 0) + totalValue;

          // Update unit cost to weighted average
          const totalQty = existingItem.currentStock + existingItem.inShipment;
          if (totalQty > 0) {
            existingItem.unitCost = existingItem.totalValue / totalQty;
          }

          // Handle vendor - if different from existing, mark as "Multiple"
          if (
            existingItem.vendorSource &&
            existingItem.vendorSource !== "Multiple" &&
            existingItem.vendorSource !== vendorName &&
            vendorName !== "Multiple" &&
            vendorName !== "N/A"
          ) {
            existingItem.vendorSource = "Multiple";
          } else if (
            !existingItem.vendorSource ||
            existingItem.vendorSource === "N/A"
          ) {
            existingItem.vendorSource = vendorName;
          }

          // Handle cost code - if different from existing, keep the first one (or could mark as "Multiple" if needed)
          const currentCostCode = rni.cost_code_uuid
            ? costCodeMap.get(rni.cost_code_uuid) || ""
            : "";
          if (
            existingItem.costCode &&
            currentCostCode &&
            existingItem.costCode !== currentCostCode
          ) {
            // Keep the existing cost code (first occurrence)
            // Could change to 'Multiple' if you want to indicate multiple cost codes
          } else if (!existingItem.costCode && currentCostCode) {
            existingItem.costCode = currentCostCode;
          }

          // Update UOM if we found it and existing item doesn't have one
          if (uom && !existingItem.uom) {
            existingItem.uom = uom;
          }

          // Update item code (item sequence) if we found it and existing item has a fallback code
          if (itemSequence) {
            const isFallbackCode =
              existingItem.itemCode && /^ITM\d+$/.test(existingItem.itemCode);
            if (!existingItem.itemCode || isFallbackCode) {
              existingItem.itemCode = itemSequence;
            }
          }

          // Update dates if this receipt is more recent
          if (receiptNote.entry_date) {
            const receiptDate = new Date(receiptNote.entry_date);
            if (
              !existingItem.lastPurchaseDate ||
              receiptDate > new Date(existingItem.lastPurchaseDate)
            ) {
              existingItem.lastPurchaseDate = receiptNote.entry_date;
            }
            if (
              !existingItem.lastStockUpdateDate ||
              receiptDate > new Date(existingItem.lastStockUpdateDate)
            ) {
              existingItem.lastStockUpdateDate = receiptNote.entry_date;
            }
          }
        } else {
          // Create new item entry
          itemsMap.set(itemKey, {
            itemCode:
              itemSequence ||
              itemDetails.model_number ||
              `ITM${String(itemsMap.size + 1).padStart(3, "0")}`,
            itemName:
              itemDetails.item_name || itemDetails.model_number || "N/A",
            description: itemDetails.description || "",
            vendorSource: vendorName,
            costCode: rni.cost_code_uuid
              ? costCodeMap.get(rni.cost_code_uuid) || ""
              : "",
            currentStock: Number(currentStock) || 0,
            unitCost: Number(unitPrice) || 0,
            uom: uom,
            totalValue: Number(totalValue) || 0,
            reorderLevel: 0,
            inShipment: Number(inShipment) || 0,
            returnedQty: returnedQty,
            lastPurchaseDate: receiptNote.entry_date || null,
            lastStockUpdateDate:
              receiptNote.entry_date || receiptNote.updated_at || null,
          });
        }
      }

      // Convert map to array and sort
      const items = Array.from(itemsMap.values()).sort((a, b) =>
        (a.itemCode || "").localeCompare(b.itemCode || "")
      );

      // Calculate totals
      const totals = items.reduce(
        (acc, item) => {
          acc.currentStock += item.currentStock || 0;
          acc.totalValue += item.totalValue || 0;
          acc.reorderLevel += item.reorderLevel || 0;
          acc.inShipment += item.inShipment || 0;
          acc.returnedQty += item.returnedQty || 0;
          return acc;
        },
        {
          currentStock: 0,
          totalValue: 0,
          reorderLevel: 0,
          inShipment: 0,
          returnedQty: 0,
        }
      );

      return {
        items,
        totals,
      };
    } catch (err: any) {
      error.value = err.message || "Failed to generate stock report";
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading: readonly(loading),
    error: readonly(error),
    generateStockReport,
  };
};
