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
   */
  const fetchLocalPurchaseOrders = async (corporationUuid: string) => {
    if (!corporationUuid) return;
    
    try {
      const response: any = await $fetch("/api/purchase-order-forms", {
        method: "GET",
        query: {
          corporation_uuid: corporationUuid,
        },
      });
      
      // Handle different response formats
      const orders = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];
      
      localPurchaseOrders.value = orders;
    } catch (error: any) {
      console.error("[useLocalPOCOData] Failed to fetch purchase orders:", error);
      localPurchaseOrders.value = [];
    }
  };

  /**
   * Fetch change orders directly via API (independent from global store)
   * @param corporationUuid - The corporation UUID to fetch change orders for
   */
  const fetchLocalChangeOrders = async (corporationUuid: string) => {
    if (!corporationUuid) return;
    
    try {
      const response: any = await $fetch("/api/change-orders", {
        method: "GET",
        query: {
          corporation_uuid: corporationUuid,
        },
      });
      
      // Handle different response formats
      const orders = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];
      
      localChangeOrders.value = orders;
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

