import { ref } from "vue";

/**
 * Composable for managing local purchase order and change order data
 * independent from global Pinia stores.
 * 
 * This composable provides local state and fetch methods for purchase orders
 * and change orders, allowing components to work with data scoped to a specific
 * corporation without affecting global store state.
 */
export function useLocalPOCOData() {
  // Local purchase orders and change orders (independent from global store)
  const localPurchaseOrders = ref<any[]>([]);
  const localChangeOrders = ref<any[]>([]);

  /**
   * Fetch purchase orders directly via API (independent from global store)
   * @param corporationUuid - The corporation UUID to fetch purchase orders for
   * @param vendorUuid - Optional vendor UUID to filter by
   * @param projectUuid - Optional project UUID to filter by
   */
  const fetchLocalPurchaseOrders = async (
    corporationUuid: string,
    vendorUuid?: string | null,
    projectUuid?: string | null
  ) => {
    console.log("[useLocalPOCOData] fetchLocalPurchaseOrders called:", {
      corporationUuid,
      vendorUuid,
      projectUuid,
    });

    if (!corporationUuid) {
      console.log("[useLocalPOCOData] No corporation UUID, clearing POs");
      localPurchaseOrders.value = [];
      return;
    }

    try {
      console.log(
        "[useLocalPOCOData] Making API call to /api/purchase-order-forms"
      );
      const response: any = await $fetch("/api/purchase-order-forms", {
        method: "GET",
        query: {
          corporation_uuid: corporationUuid,
          // Note: API doesn't currently support vendor_uuid and project_uuid filters
          // We'll filter client-side for now
        },
      });

      console.log("[useLocalPOCOData] API response received:", {
        isArray: Array.isArray(response),
        hasData: !!response?.data,
        dataIsArray: Array.isArray(response?.data),
      });

      // Handle different response formats
      let orders = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      console.log("[useLocalPOCOData] Orders before filtering:", {
        count: orders.length,
        vendorUuid,
        projectUuid,
      });

      // Filter by vendor and project client-side if provided
      if (vendorUuid || projectUuid) {
        const beforeFilter = orders.length;
        orders = orders.filter((order: any) => {
          if (vendorUuid && order.vendor_uuid !== vendorUuid) return false;
          if (projectUuid && order.project_uuid !== projectUuid) return false;
          return true;
        });
        console.log("[useLocalPOCOData] Orders after filtering:", {
          before: beforeFilter,
          after: orders.length,
        });
      }

      localPurchaseOrders.value = orders;
      console.log("[useLocalPOCOData] fetchLocalPurchaseOrders completed:", {
        finalCount: localPurchaseOrders.value.length,
      });
    } catch (error: any) {
      console.error(
        "[useLocalPOCOData] Failed to fetch purchase orders:",
        error
      );
      localPurchaseOrders.value = [];
    }
  };

  /**
   * Fetch change orders directly via API (independent from global store)
   * @param corporationUuid - The corporation UUID to fetch change orders for
   * @param vendorUuid - Optional vendor UUID to filter by
   * @param projectUuid - Optional project UUID to filter by
   */
  const fetchLocalChangeOrders = async (
    corporationUuid: string,
    vendorUuid?: string | null,
    projectUuid?: string | null
  ) => {
    console.log("[useLocalPOCOData] fetchLocalChangeOrders called:", {
      corporationUuid,
      vendorUuid,
      projectUuid,
    });

    if (!corporationUuid) {
      console.log("[useLocalPOCOData] No corporation UUID, clearing COs");
      localChangeOrders.value = [];
      return;
    }

    try {
      console.log("[useLocalPOCOData] Making API call to /api/change-orders");
      const response: any = await $fetch("/api/change-orders", {
        method: "GET",
        query: {
          corporation_uuid: corporationUuid,
          // Note: API doesn't currently support vendor_uuid and project_uuid filters
          // We'll filter client-side for now
        },
      });

      console.log("[useLocalPOCOData] API response received:", {
        isArray: Array.isArray(response),
        hasData: !!response?.data,
        dataIsArray: Array.isArray(response?.data),
      });

      // Handle different response formats
      let orders = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      console.log("[useLocalPOCOData] Orders before filtering:", {
        count: orders.length,
        vendorUuid,
        projectUuid,
      });

      // Filter by vendor and project client-side if provided
      if (vendorUuid || projectUuid) {
        const beforeFilter = orders.length;
        orders = orders.filter((order: any) => {
          if (vendorUuid && order.vendor_uuid !== vendorUuid) return false;
          if (projectUuid && order.project_uuid !== projectUuid) return false;
          return true;
        });
        console.log("[useLocalPOCOData] Orders after filtering:", {
          before: beforeFilter,
          after: orders.length,
        });
      }

      localChangeOrders.value = orders;
      console.log("[useLocalPOCOData] fetchLocalChangeOrders completed:", {
        finalCount: localChangeOrders.value.length,
      });
    } catch (error: any) {
      console.error("[useLocalPOCOData] Failed to fetch change orders:", error);
      localChangeOrders.value = [];
    }
  };

  return {
    localPurchaseOrders,
    localChangeOrders,
    fetchLocalPurchaseOrders,
    fetchLocalChangeOrders,
  };
}

