// stores/payments.ts
// defineStore is auto-imported by Nuxt
import { ref } from "vue";

type Payment = {
  id: string;
  vendor_uuid: string;
  corporation_uuid: string;
  bill_entry_uuid?: string;
  payment_date: string;
  payment_method: 'CHECK' | 'ACH' | 'WIRE' | 'CASH' | 'CARD';
  reference_number?: string;
  amount: number;
  memo?: string;
  created_at: string;
  updated_at: string;
  vendors?: {
    uuid: string;
    vendor_name: string;
    vendor_type: string;
  };
  bill_entries?: {
    id: string;
    number: string;
    amount: number;
    bill_date: string;
  };
};

type CreatePaymentPayload = {
  vendor_uuid: string;
  corporation_uuid: string;
  bill_entry_uuid?: string;
  payment_date: string;
  payment_method: 'CHECK' | 'ACH' | 'WIRE' | 'CASH' | 'CARD';
  reference_number?: string;
  amount: number;
  memo?: string;
};

type UpdatePaymentPayload = {
  id: string;
  vendor_uuid?: string;
  bill_entry_uuid?: string;
  payment_date?: string;
  payment_method?: 'CHECK' | 'ACH' | 'WIRE' | 'CASH' | 'CARD';
  reference_number?: string;
  amount?: number;
  memo?: string;
};

type ApiResponse<T> = {
  data: T;
  error?: string;
  message?: string;
};

export const usePaymentsStore = defineStore("payments", () => {
  const payments = ref<Payment[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch payments for a corporation
  const fetchPayments = async (corporationUuid: string, vendorUuid?: string, billEntryUuid?: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      let url = `/api/payments?corporation_uuid=${corporationUuid}`;
      if (vendorUuid) url += `&vendor_uuid=${vendorUuid}`;
      if (billEntryUuid) url += `&bill_entry_uuid=${billEntryUuid}`;
      
      const { data } = await $fetch<ApiResponse<Payment[]>>(url);
      payments.value = data;
    } catch (err: any) {
      error.value = err.data?.message || "Failed to fetch payments";
      console.error("Error fetching payments:", err);
    } finally {
      loading.value = false;
    }
  };

  // Create a new payment
  const createPayment = async (payload: CreatePaymentPayload) => {
    loading.value = true;
    error.value = null;
    
    try {
      const { data } = await $fetch<ApiResponse<Payment>>(
        "/api/payments",
        {
          method: "POST",
          body: payload,
        }
      );
      payments.value.unshift(data);
      return data;
    } catch (err: any) {
      error.value = err.data?.message || "Failed to create payment";
      console.error("Error creating payment:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update a payment
  const updatePayment = async (payload: UpdatePaymentPayload) => {
    loading.value = true;
    error.value = null;
    
    try {
      const { data } = await $fetch<ApiResponse<Payment>>(
        "/api/payments",
        {
          method: "PUT",
          body: payload,
        }
      );
      
      const index = payments.value.findIndex(p => p.id === payload.id);
      if (index !== -1) {
        payments.value[index] = data;
      }
      
      return data;
    } catch (err: any) {
      error.value = err.data?.message || "Failed to update payment";
      console.error("Error updating payment:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Delete a payment
  const deletePayment = async (id: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const { apiFetch } = useApiClient();
      await apiFetch(`/api/payments?id=${id}`, {
        method: "DELETE",
      });
      
      payments.value = payments.value.filter(p => p.id !== id);
    } catch (err: any) {
      error.value = err.data?.message || "Failed to delete payment";
      console.error("Error deleting payment:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get payment by ID
  const getPaymentById = (id: string) => {
    return payments.value.find(p => p.id === id);
  };

  // Get payments by vendor
  const getPaymentsByVendor = (vendorUuid: string) => {
    return payments.value.filter(p => p.vendor_uuid === vendorUuid);
  };

  // Get payments by bill entry
  const getPaymentsByBillEntry = (billEntryUuid: string) => {
    return payments.value.filter(p => p.bill_entry_uuid === billEntryUuid);
  };

  // Calculate total payments for a vendor
  const getTotalPaymentsByVendor = (vendorUuid: string) => {
    return payments.value
      .filter(p => p.vendor_uuid === vendorUuid)
      .reduce((total, payment) => total + payment.amount, 0);
  };

  // Clear error
  const clearError = () => {
    error.value = null;
  };

  return {
    payments: readonly(payments),
    loading: readonly(loading),
    error: readonly(error),
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentById,
    getPaymentsByVendor,
    getPaymentsByBillEntry,
    getTotalPaymentsByVendor,
    clearError,
  };
});
