/**
 * Composable for handling tab-based routing with URL synchronization
 */

export type UsersTabName = "role-management" | "user-management";
export type CorporationTabName =
  | "manage-corporations"
  | "storage-locations"
  | "chart-of-accounts";
export type PayablesTabName = "vendor-invoices" | "bill-entry-payment" | "print-checks";
export type PurchaseOrdersTabName =
  | "purchase-orders"
  | "stock-receipt-note";
export type ProjectsTabName = "project-details" | "items" | "estimates" | "cost-codes";
export type MastersTabName =
  | "freight"
  | "ship-via"
  | "approval-checks"
  | "po-instruction"
  | "location"
  | "uom"
  | "charges"
  | "sales-tax";
export type ConfigurationsTabName = "custom-pl" | "custom-balance-sheet";

export interface TabConfig {
  name: string;
  label: string;
  icon: string;
  value: string;
}

export const USERS_TABS: TabConfig[] = [
  {
    name: "role-management",
    label: "Role Management",
    icon: "lucide:shield",
    value: "role-management",
  },
  {
    name: "user-management",
    label: "User Management",
    icon: "lucide:users",
    value: "user-management",
  },
];

export const CORPORATION_TABS: TabConfig[] = [
  {
    name: "manage-corporations",
    label: "Manage Corporations",
    icon: "lucide:building-2",
    value: "manage-corporations",
  },
  {
    name: "storage-locations",
    label: "Storage Locations",
    icon: "lucide:warehouse",
    value: "storage-locations",
  },
  {
    name: "chart-of-accounts",
    label: "Chart Of Accounts",
    icon: "basil:document-solid",
    value: "chart-of-accounts",
  },
];

export const PAYABLES_TABS: TabConfig[] = [
  {
    name: "vendor-invoices",
    label: "Vendor Invoices",
    icon: "i-heroicons-document-text",
    value: "vendor-invoices",
  },
  {
    name: "bill-entry-payment",
    label: "Bill Entry & Payment",
    icon: "i-heroicons-document-plus",
    value: "bill-entry-payment",
  },
  {
    name: "print-checks",
    label: "Print Checks",
    icon: "i-heroicons-printer",
    value: "print-checks",
  },
];

export const PURCHASE_ORDERS_TABS: TabConfig[] = [
  {
    name: "purchase-orders",
    label: "Purchase Orders",
    icon: "i-heroicons-shopping-cart-solid",
    value: "purchase-orders",
  },
  {
    name: "stock-receipt-note",
    label: "Stock Receipt Note",
    icon: "i-heroicons-document-text-solid",
    value: "stock-receipt-note",
  },
];

export const PROJECTS_TABS: TabConfig[] = [
  {
    name: "project-details",
    label: "Project Details",
    icon: "i-heroicons-clipboard-document-list",
    value: "project-details",
  },
  {
    name: "cost-codes",
    label: "Cost Codes",
    icon: "i-heroicons-currency-dollar",
    value: "cost-codes",
  },
  {
    name: "items",
    label: "Items",
    icon: "i-heroicons-cube",
    value: "items",
  },
  {
    name: "estimates",
    label: "Estimates",
    icon: "i-heroicons-calculator",
    value: "estimates",
  },
];

export const MASTERS_TABS: TabConfig[] = [
  {
    name: "freight",
    label: "Freight",
    icon: "i-heroicons-truck",
    value: "freight",
  },
  {
    name: "ship-via",
    label: "Ship VIA",
    icon: "i-heroicons-paper-airplane",
    value: "ship-via",
  },
  {
    name: "approval-checks",
    label: "Approval Checks",
    icon: "i-heroicons-check-circle",
    value: "approval-checks",
  },
  {
    name: "po-instruction",
    label: "PO Instruction",
    icon: "i-heroicons-document-text",
    value: "po-instruction",
  },
  {
    name: "location",
    label: "Location",
    icon: "i-heroicons-map-pin",
    value: "location",
  },
  {
    name: "uom",
    label: "UOM",
    icon: "i-heroicons-scale",
    value: "uom",
  },
  {
    name: "charges",
    label: "Charges",
    icon: "i-heroicons-currency-dollar",
    value: "charges",
  },
  {
    name: "sales-tax",
    label: "Sales Tax",
    icon: "i-heroicons-receipt-percent",
    value: "sales-tax",
  },
];

export const CONFIGURATIONS_TABS: TabConfig[] = [
  {
    name: "custom-pl",
    label: "Custom P&L Configuration",
    icon: "i-heroicons-chart-bar-square",
    value: "custom-pl",
  },
  {
    name: "custom-balance-sheet",
    label: "Custom Balance Sheet Configuration",
    icon: "i-heroicons-scale",
    value: "custom-balance-sheet",
  },
];

export function useTabRouting(tabs: TabConfig[], defaultTab: string) {
  const route = useRoute();
  const router = useRouter();

  // Get the current tab from URL, fallback to default
  const currentTab = computed(() => {
    const tabParam = route.query.tab;
    if (tabParam && typeof tabParam === "string") {
      // Validate that the tab exists in our configuration
      const validTab = tabs.find((tab) => tab.name === tabParam);
      return validTab ? validTab.name : defaultTab;
    }
    return defaultTab;
  });

  // Force refresh tab state when tab configuration changes (for HMR)
  const refreshTabState = () => {
    const currentTabParam = route.query.tab;
    if (currentTabParam && typeof currentTabParam === "string") {
      const validTab = tabs.find((tab) => tab.name === currentTabParam);
      if (!validTab) {
        // Invalid tab, redirect to default
        navigateToTab(defaultTab);
      }
    }
  };

  // Navigate to a specific tab
  const navigateToTab = (tab: string) => {
    const currentQuery = { ...route.query };
    currentQuery.tab = tab;

    // Use push for proper browser history handling
    router.push({
      query: currentQuery,
    });
  };

  // Check if a tab is currently active
  const isTabActive = (tab: string): boolean => {
    return currentTab.value === tab;
  };

  // Initialize URL if no tab parameter exists
  const initializeUrl = () => {
    if (!route.query.tab) {
      navigateToTab(defaultTab);
    }
  };

  // Get tab configuration by name
  const getTabConfig = (tabName: string): TabConfig | undefined => {
    return tabs.find((tab) => tab.name === tabName);
  };

  // Get all available tabs
  const getAvailableTabs = (): TabConfig[] => {
    return tabs;
  };

  return {
    currentTab: readonly(currentTab),
    navigateToTab,
    isTabActive,
    initializeUrl,
    getTabConfig,
    getAvailableTabs,
    refreshTabState,
    tabs,
  };
}
