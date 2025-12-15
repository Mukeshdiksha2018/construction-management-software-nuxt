import { computed, type Ref } from "vue";
import { useBillEntriesStore } from "@/stores/billEntries";
import { useCurrencyFormat } from "@/composables/useCurrencyFormat";

export function useBillEntriesData(corporationUuid: Ref<string | null>) {
  const billEntriesStore = useBillEntriesStore();
  const { formatCurrency } = useCurrencyFormat();

  const loading = computed(() => billEntriesStore.loading);

  // All bills (type = 'Bill')
  const bills = computed(() => billEntriesStore.bills);
  const billsTotalAmount = computed(() => billEntriesStore.billsTotalAmount);

  // Pending bills
  const pendingBills = computed(() => billEntriesStore.pendingBills);
  const pendingBillsCount = computed(() => pendingBills.value.length);
  const pendingBillsTotal = computed(() => billEntriesStore.pendingAmount);

  // Approved bills
  const approvedBills = computed(() => billEntriesStore.approvedBills);
  const approvedBillsCount = computed(() => approvedBills.value.length);
  const approvedBillsTotal = computed(() => billEntriesStore.approvedAmount);

  // formatCurrency is now provided by useCurrencyFormat composable

  // No need to fetch data - it's already loaded when corporation is selected
  // Data is automatically available from the store

  return {
    loading,
    bills,
    billsTotalAmount,
    pendingBills,
    pendingBillsCount,
    pendingBillsTotal,
    approvedBills,
    approvedBillsCount,
    approvedBillsTotal,
    formatCurrency,
  };
}
