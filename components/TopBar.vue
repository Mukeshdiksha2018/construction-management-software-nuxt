<template>
  <header class="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
    <nav class="flex items-center justify-between px-3 lg:px-4 py-2">
      <!-- Left side: Empty spacer to balance layout -->
      <div class="flex items-center gap-2 flex-shrink-0 w-[200px]">
        <!-- Spacer to balance right side controls (matches approximate width of user profile section) -->
      </div>

      <!-- Center: Corporation Selector -->
      <div class="flex items-center gap-2 flex-1 justify-center max-w-md mx-4">
        <CorporationSelect
          :model-value="value ?? undefined"
          :restrict-to-corporation-access="true"
          size="sm"
          class="w-full"
          @update:model-value="(val) => value = val ?? null"
          @change="handleCorporationSelection"
        />
      </div>

      <!-- Right side: User Controls -->
      <div class="flex items-center gap-2">
        <!-- Tablet: Dark Mode Toggle (hidden on mobile) -->
        <UButton
          :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
          variant="solid"
          size="sm"
          color="neutral"
          @click="toggleDarkMode"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          class="hidden md:flex transition-all duration-200 hover:scale-105 flex-shrink-0 "
        />

        <!-- Mobile/Tablet: Logout Button (hidden on desktop) -->
        <UButton
          icon="i-lucide-log-out"
          variant="soft"
          size="sm"
          color="error"
          @click="authStore.logout()"
          title="Logout"
          class="lg:hidden transition-all duration-200 hover:scale-105 flex-shrink-0"
        />

        <!-- Desktop: User Profile -->
        <div class="hidden lg:flex items-center gap-3">
          <!-- User Profile Section -->
          <UDropdownMenu
            :items="userMenuItems"
            :ui="{
              content: 'w-48'
            }"
          >
            <UButton
              variant="soft"
              color="neutral"
              class="group flex items-center gap-3 px-3 py-1 rounded-lg transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/20"
            >
              <!-- User Avatar -->
              <div class="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center overflow-hidden ring-2 ring-brand-200 dark:ring-brand-800 group-hover:ring-brand-400 dark:group-hover:ring-brand-600 transition-colors">
                <UAvatar
                  v-if="currentUser?.imageUrl && currentUser.imageUrl.trim() !== ''"
                  :src="currentUser.imageUrl"
                  alt="Profile"
                  size="xs"
                />
                <svg
                  v-else
                  class="w-4 h-4 text-brand-600 dark:text-brand-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>

              <!-- User Info -->
              <div class="text-left">
                <div class="font-medium text-default text-sm">
                  {{ userDisplayName }}
                </div>
                <div class="text-xs text-muted">
                  {{ userRole }}
                </div>
              </div>

              <!-- Dropdown Arrow -->
              <UIcon
                name="lucide:chevron-down"
                class="w-4 h-4 text-muted group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
              />
            </UButton>
          </UDropdownMenu>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, shallowRef } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useCorporationStore } from "@/stores/corporations";
import { useUserProfilesStore } from "@/stores/userProfiles";
import { useRoleStore } from "@/stores/roles";
import { useDarkMode } from "@/composables/useDarkMode";
import { useIndexedDB } from "@/composables/useIndexedDB";
import { useShipViaStore } from "@/stores/freight";
import { useFreightStore } from "@/stores/freightGlobal";
import { useLocationsStore } from "@/stores/locations";
import { useApprovalChecksStore } from "@/stores/approvalChecks";
import { useUOMStore } from "@/stores/uom";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";
import { useChangeOrdersStore } from "@/stores/changeOrders";
import { useStockReceiptNotesStore } from "@/stores/stockReceiptNotes";
import { useStockReturnNotesStore } from "@/stores/stockReturnNotes";
import { useVendorInvoicesStore } from "@/stores/vendorInvoices";
import { useEstimatesStore } from "@/stores/estimates";
import { useItemTypesStore } from "@/stores/itemTypes";
import CorporationSelect from "@/components/Shared/CorporationSelect.vue";

const authStore = useAuthStore();
const corpStore = useCorporationStore();
const userProfilesStore = useUserProfilesStore();
const roleStore = useRoleStore();
const { syncGlobalData, clearCorporationData } = useIndexedDB();
const shipViaStore = useShipViaStore();
const freightStore = useFreightStore();
const locationsStore = useLocationsStore();
const approvalChecksStore = useApprovalChecksStore();
const uomStore = useUOMStore();
const purchaseOrdersStore = usePurchaseOrdersStore();
const changeOrdersStore = useChangeOrdersStore();
const stockReceiptNotesStore = useStockReceiptNotesStore();
const stockReturnNotesStore = useStockReturnNotesStore();
const vendorInvoicesStore = useVendorInvoicesStore();
const estimatesStore = useEstimatesStore();
const itemTypesStore = useItemTypesStore();

const lastFetchedContextSignature = ref<string | null>(null);
const lastFetchedPurchaseOrdersSignature = ref<string | null>(null);
const lastFetchedChangeOrdersSignature = ref<string | null>(null);
const lastFetchedStockReceiptNotesSignature = ref<string | null>(null);
const lastFetchedStockReturnNotesSignature = ref<string | null>(null);
const lastFetchedVendorInvoicesSignature = ref<string | null>(null);
const lastFetchedEstimatesSignature = ref<string | null>(null);
let corporationDataPromise: Promise<void> | null = null;
let purchaseOrdersPromise: Promise<void> | null = null;
let changeOrdersPromise: Promise<void> | null = null;
let stockReceiptNotesPromise: Promise<void> | null = null;
let stockReturnNotesPromise: Promise<void> | null = null;
let vendorInvoicesPromise: Promise<void> | null = null;
let estimatesPromise: Promise<void> | null = null;

const buildContextSignature = (corporationId: string) => {
  return corporationId;
};

/**
 * Fetch the first page of purchase orders for a corporation
 * Additional pages will be fetched on-demand when users navigate to them
 */
const fetchFirstPagePurchaseOrders = async (
  corporationId: string,
  force: boolean
): Promise<void> => {
  const pageSize = 100;
  const page = 1;
  
  // Only fetch the first page - components can load more pages on-demand
  await purchaseOrdersStore.fetchPurchaseOrders(
    corporationId,
    force,
    page,
    pageSize
  );
};

/**
 * Fetch the first page of change orders for a corporation
 * Additional pages will be fetched on-demand when users navigate to them
 */
const fetchFirstPageChangeOrders = async (
  corporationId: string,
  force: boolean
): Promise<void> => {
  const pageSize = 100;
  const page = 1;
  
  // Only fetch the first page - components can load more pages on-demand
  await changeOrdersStore.fetchChangeOrders(
    corporationId,
    force,
    page,
    pageSize
  );
};

/**
 * Fetch the first page of estimates for a corporation
 * Additional pages will be fetched on-demand when users navigate to them
 */
const fetchFirstPageEstimates = async (
  corporationId: string,
  force: boolean
): Promise<void> => {
  const pageSize = 100;
  const page = 1;
  
  // Only fetch the first page - components can load more pages on-demand
  await estimatesStore.refreshEstimatesFromAPI(
    corporationId,
    page,
    pageSize
  );
};

const ensurePurchaseOrdersForCorporation = async (
  corporationId?: string | null,
  options: { force?: boolean } = {}
) => {
  const normalizedId =
    typeof corporationId === "string" ? corporationId.trim() : "";

  if (!normalizedId) {
    return;
  }

  const signature = buildContextSignature(normalizedId);
  const force = Boolean(options.force);

  if (!force && signature === lastFetchedPurchaseOrdersSignature.value) {
    return purchaseOrdersPromise;
  }

  if (!force && purchaseOrdersPromise) {
    return purchaseOrdersPromise;
  }

  purchaseOrdersPromise = fetchFirstPagePurchaseOrders(normalizedId, force)
    .then(() => {
      lastFetchedPurchaseOrdersSignature.value = signature;
    })
    .catch((error: unknown) => {
      console.error("[TopBar] Failed to synchronize purchase orders:", error);
    })
    .finally(() => {
      const finished = purchaseOrdersPromise;
      if (finished === purchaseOrdersPromise) {
        purchaseOrdersPromise = null;
      }
    });

  return purchaseOrdersPromise;
};

const ensureCorporationData = async (
  corporationId?: string | null,
  options: { force?: boolean } = {}
) => {
  const normalizedId =
    typeof corporationId === "string" ? corporationId.trim() : "";

  if (!normalizedId) {
    return;
  }

  const signature = buildContextSignature(normalizedId);
  const force = Boolean(options.force);

  if (!force && signature === lastFetchedContextSignature.value) {
    return corporationDataPromise;
  }

  if (!force && corporationDataPromise) {
    return corporationDataPromise;
  }

  corporationDataPromise = corpStore
    .setSelectedCorporationAndFetchData(normalizedId)
    .then(async () => {
      await itemTypesStore.fetchItemTypes(
        normalizedId,
        undefined,
        force
      );
      lastFetchedContextSignature.value = signature;
    })
    .finally(() => {
      const finished = corporationDataPromise;
      if (finished === corporationDataPromise) {
        corporationDataPromise = null;
      }
    });

  return corporationDataPromise;
};

const ensureChangeOrdersForCorporation = async (
  corporationId?: string | null,
  options: { force?: boolean } = {}
) => {
  const normalizedId =
    typeof corporationId === "string" ? corporationId.trim() : "";

  if (!normalizedId) {
    return;
  }

  const signature = buildContextSignature(normalizedId);
  const force = Boolean(options.force);

  if (!force && signature === lastFetchedChangeOrdersSignature.value) {
    return changeOrdersPromise;
  }

  if (!force && changeOrdersPromise) {
    return changeOrdersPromise;
  }

  changeOrdersPromise = fetchFirstPageChangeOrders(normalizedId, force)
    .then(() => {
      lastFetchedChangeOrdersSignature.value = signature;
    })
    .catch((error: unknown) => {
      console.error("[TopBar] Failed to synchronize change orders:", error);
    })
    .finally(() => {
      const finished = changeOrdersPromise;
      if (finished === changeOrdersPromise) {
        changeOrdersPromise = null;
      }
    });

  return changeOrdersPromise;
};

const ensureStockReceiptNotesForCorporation = async (
  corporationId?: string | null,
  options: { force?: boolean } = {}
) => {
  const normalizedId =
    typeof corporationId === "string" ? corporationId.trim() : "";

  if (!normalizedId) {
    return;
  }

  const signature = buildContextSignature(normalizedId);
  const force = Boolean(options.force);

  if (!force && signature === lastFetchedStockReceiptNotesSignature.value) {
    return stockReceiptNotesPromise;
  }

  if (!force && stockReceiptNotesPromise) {
    return stockReceiptNotesPromise;
  }

  stockReceiptNotesPromise = stockReceiptNotesStore
    .fetchStockReceiptNotes(normalizedId, { force })
    .then(() => {
      lastFetchedStockReceiptNotesSignature.value = signature;
    })
    .catch((error: unknown) => {
      console.error("[TopBar] Failed to synchronize stock receipt notes:", error);
    })
    .finally(() => {
      const finished = stockReceiptNotesPromise;
      if (finished === stockReceiptNotesPromise) {
        stockReceiptNotesPromise = null;
      }
    });

  return stockReceiptNotesPromise;
};

const ensureStockReturnNotesForCorporation = async (
  corporationId?: string | null,
  options: { force?: boolean } = {}
) => {
  const normalizedId =
    typeof corporationId === "string" ? corporationId.trim() : "";

  if (!normalizedId) {
    return;
  }

  const signature = buildContextSignature(normalizedId);
  const force = Boolean(options.force);

  if (!force && signature === lastFetchedStockReturnNotesSignature.value) {
    return stockReturnNotesPromise;
  }

  if (!force && stockReturnNotesPromise) {
    return stockReturnNotesPromise;
  }

  stockReturnNotesPromise = stockReturnNotesStore
    .fetchStockReturnNotes(normalizedId, { force })
    .then(() => {
      lastFetchedStockReturnNotesSignature.value = signature;
    })
    .catch((error: unknown) => {
      console.error("[TopBar] Failed to synchronize stock return notes:", error);
    })
    .finally(() => {
      const finished = stockReturnNotesPromise;
      if (finished === stockReturnNotesPromise) {
        stockReturnNotesPromise = null;
      }
    });

  return stockReturnNotesPromise;
};

const ensureVendorInvoicesForCorporation = async (
  corporationId?: string | null,
  options: { force?: boolean } = {}
) => {
  const normalizedId =
    typeof corporationId === "string" ? corporationId.trim() : "";

  if (!normalizedId) {
    return;
  }

  const signature = buildContextSignature(normalizedId);
  const force = Boolean(options.force);

  if (!force && signature === lastFetchedVendorInvoicesSignature.value) {
    return vendorInvoicesPromise;
  }

  if (!force && vendorInvoicesPromise) {
    return vendorInvoicesPromise;
  }

  vendorInvoicesPromise = vendorInvoicesStore
    .fetchVendorInvoices(normalizedId, force)
    .then(() => {
      lastFetchedVendorInvoicesSignature.value = signature;
    })
    .catch((error: unknown) => {
      console.error("[TopBar] Failed to synchronize vendor invoices:", error);
    })
    .finally(() => {
      const finished = vendorInvoicesPromise;
      if (finished === vendorInvoicesPromise) {
        vendorInvoicesPromise = null;
      }
    });

  return vendorInvoicesPromise;
};

const ensureEstimatesForCorporation = async (
  corporationId?: string | null,
  options: { force?: boolean } = {}
) => {
  const normalizedId =
    typeof corporationId === "string" ? corporationId.trim() : "";

  if (!normalizedId) {
    return;
  }

  const signature = buildContextSignature(normalizedId);
  const force = Boolean(options.force);

  if (!force && signature === lastFetchedEstimatesSignature.value) {
    return estimatesPromise;
  }

  if (!force && estimatesPromise) {
    return estimatesPromise;
  }

  // Fetch the first page of estimates from API and update both store and IndexedDB
  // This ensures the store is updated reactively for the Estimates component
  // Additional pages will be fetched on-demand when users navigate to them
  estimatesPromise = fetchFirstPageEstimates(normalizedId, force)
    .then(() => {
      lastFetchedEstimatesSignature.value = signature;
    })
    .catch((error: unknown) => {
      console.error("[TopBar] Failed to synchronize estimates:", error);
      // Fallback to IndexedDB if API fails
      return estimatesStore.fetchEstimates(normalizedId);
    })
    .finally(() => {
      const finished = estimatesPromise;
      if (finished === estimatesPromise) {
        estimatesPromise = null;
      }
    });

  return estimatesPromise;
};

const refreshCorporationContext = async (
  corporationId?: string | null,
  options: { force?: boolean } = {}
) => {
  const normalizedId =
    typeof corporationId === "string" ? corporationId.trim() : "";

  if (!normalizedId) {
    return;
  }

  await ensureCorporationData(normalizedId, options);
  await ensurePurchaseOrdersForCorporation(normalizedId, options);
  await ensureChangeOrdersForCorporation(normalizedId, options);
  await ensureStockReceiptNotesForCorporation(normalizedId, options);
  await ensureStockReturnNotesForCorporation(normalizedId, options);
  await ensureVendorInvoicesForCorporation(normalizedId, options);
  await ensureEstimatesForCorporation(normalizedId, options);
};

// Dark mode composable
const { isDark, toggleDarkMode, initializeTheme, watchSystemTheme } = useDarkMode();

const value = ref<string | null>(null);
const previousCorporationId = ref<string | null>(null);

// Get current user from userProfiles store
const currentUser = computed(() => {
  if (!authStore.user?.email) return null;
  return userProfilesStore.users.find(user => user.email === authStore.user.email);
});

// Computed properties for user display
const userDisplayName = computed(() => {
  if (!currentUser.value) return 'Unknown User';
  
  if (currentUser.value.firstName && currentUser.value.lastName) {
    return `${currentUser.value.firstName} ${currentUser.value.lastName}`;
  } else if (currentUser.value.firstName) {
    return currentUser.value.firstName;
  } else if (currentUser.value.email) {
    return currentUser.value.email.split('@')[0];
  }
  
  return 'Unknown User';
});

const userRole = computed(() => {
  if (!currentUser.value?.roleId) return 'No Role';
  
  const role = roleStore.roles.find(r => r.id === currentUser.value?.roleId);
  return role?.role_name || 'Unknown Role';
});

// User menu items
const userMenuItems = computed(() => [
  [
    {
      label: userDisplayName.value,
      avatar: currentUser.value?.imageUrl ? {
        src: currentUser.value.imageUrl
      } : undefined,
      type: 'label'
    }
  ],
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
      to: '/profile'
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings'
    }
  ],
  [
    {
      label: 'Logout',
      icon: 'i-lucide-log-out',
      color: 'red',
      onSelect() {
        authStore.logout();
      }
    }
  ]
]);

// Flag to prevent circular updates
const isUpdatingUserPreferences = ref(false);

// Function to update user preferences
async function updateUserPreferences() {
  if (!currentUser.value?.id || isUpdatingUserPreferences.value) return;
  
  isUpdatingUserPreferences.value = true;
  
  try {
    const updateData = {
      userId: currentUser.value.id,
      email: currentUser.value.email,
      firstName: currentUser.value.firstName,
      lastName: currentUser.value.lastName,
      phone: currentUser.value.phone,
      address: currentUser.value.address,
      roleId: currentUser.value.roleId,
      status: currentUser.value.status,
      imageUrl: currentUser.value.imageUrl,
      recentProperty: value.value,
      corporationAccess: currentUser.value.corporationAccess || [] // Preserve existing corporation access
    };
    
    // Use the existing update API endpoint
    await userProfilesStore.updateUser(updateData);
  } catch (error) {
    console.error('Error updating user preferences:', error);
  } finally {
    isUpdatingUserPreferences.value = false;
  }
}

// Handle corporation selection from CorporationSelect
const handleCorporationSelection = async (corporation: any) => {
  if (!corporation) {
    // Note: Cleanup is handled by the value watcher automatically
    await refreshCorporationContext(null, { force: true });
    await updateUserPreferences();
    return;
  }

  const corporationUuid = corporation.value ?? corporation.uuid;
  
  if (corporationUuid) {
    // Note: Cleanup is handled by the value watcher automatically
    await refreshCorporationContext(corporationUuid, { force: true });
    await updateUserPreferences();
  }
};

// Handle corporation changes (legacy)
async function onCorporationChange(newId: string | null) {
  // Note: Cleanup is handled by the value watcher automatically
  await refreshCorporationContext(newId, { force: true });
  await updateUserPreferences();
}

// Watch for changes in currentUser to load existing preferences
watch(currentUser, (newUser, oldUser) => {
  // Skip if we're updating user preferences to prevent circular updates
  if (isUpdatingUserPreferences.value) return;
  
  if (newUser && newUser !== oldUser) {
    // Load existing corporation preference
    if (newUser.recentProperty) {
      value.value = newUser.recentProperty;
      // Note: The value watcher will handle cleanup and data fetching automatically
    }
  }
}, { immediate: true });

onMounted(async () => {
  try {
    // Initialize dark mode
    initializeTheme();
    watchSystemTheme();

    // Ensure user profiles are loaded if auth is initialized but user profiles are not
    if (authStore.isAuthenticated && userProfilesStore.users.length === 0) {
      console.log("🔍 TopBar: Fetching user profiles...");
      await userProfilesStore.fetchUsers();
    }

    // Ensure roles are loaded if not already
    if (roleStore.roles.length === 0) {
      console.log("🔍 TopBar: Fetching roles...");
      await roleStore.fetchRoles();
    }

    // Ensure corporations are loaded if not already
    if (corpStore.corporations.length === 0) {
      console.log("🔍 TopBar: Fetching corporations...");
      await corpStore.fetchCorporations();
    }

    // Note: The value watcher will handle corporation data fetching automatically

    // Sync global reference data (ship via, freight, locations, approval checks, uom), then hydrate stores
    try {
      await syncGlobalData({ maxAgeMinutes: 60 });
      await Promise.allSettled([
        shipViaStore.fetchShipVia(false),
        freightStore.fetchFreight(false),
        locationsStore.fetchLocations(false),
        approvalChecksStore.fetchApprovalChecks(false),
        uomStore.fetchUOM(undefined, false)
      ]);
    } catch (e) {
      // Silent failure; downstream components will fall back to API as needed
    }
  } catch (error) {
    console.error('Error fetching data in TopBar:', error);
  }
});

// Watch for changes in value to refresh corporation context
watch(
  () => value.value,
  async (newCorporationId, oldCorporationId) => {
    if (newCorporationId) {
      // Clear old corporation data if switching
      if (oldCorporationId && oldCorporationId !== newCorporationId) {
        try {
          console.log(`🗑️ Clearing IndexedDB data for previous corporation: ${oldCorporationId}`);
          await clearCorporationData(oldCorporationId);
        } catch (error) {
          console.error('Error clearing previous corporation data:', error);
        }
      }
      previousCorporationId.value = newCorporationId;
      await refreshCorporationContext(newCorporationId);
    } else {
      // Clear previous corporation data when deselecting
      if (previousCorporationId.value) {
        try {
          console.log(`🗑️ Clearing IndexedDB data for previous corporation: ${previousCorporationId.value}`);
          await clearCorporationData(previousCorporationId.value);
        } catch (error) {
          console.error('Error clearing previous corporation data:', error);
        }
      }
      previousCorporationId.value = null;
      lastFetchedContextSignature.value = null;
      lastFetchedPurchaseOrdersSignature.value = null;
      lastFetchedChangeOrdersSignature.value = null;
      lastFetchedStockReceiptNotesSignature.value = null;
      lastFetchedVendorInvoicesSignature.value = null;
      lastFetchedEstimatesSignature.value = null;
      corporationDataPromise = null;
      purchaseOrdersPromise = null;
      changeOrdersPromise = null;
      stockReceiptNotesPromise = null;
      vendorInvoicesPromise = null;
      estimatesPromise = null;
    }
  },
  { immediate: true }
);

</script>

<style scoped>
header {
  z-index: 50;
}
</style>
